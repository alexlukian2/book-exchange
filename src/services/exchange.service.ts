import { prisma } from '../utils/prisma';
import { sendExchangeRequestEmail, sendExchangeStatusEmail } from '../utils/email';

/**
 * Create an exchange request for a book.
 * Validates: book exists, not own book, no duplicate pending request.
 */
export async function requestExchange(senderId: string, targetBookId: string) {
  const targetBook = await prisma.book.findUnique({
    where: { id: targetBookId },
    include: { owner: true },
  });

  if (!targetBook) return { status: 'NOT_FOUND' as const };
  if (!targetBook.isAvailable) return { status: 'UNAVAILABLE' as const };
  if (targetBook.ownerId === senderId) return { status: 'OWN_BOOK' as const };

  // Check for existing pending request
  const existingRequest = await prisma.exchangeRequest.findFirst({
    where: {
      senderId,
      targetBookId,
      status: 'PENDING',
    },
  });

  if (existingRequest) return { status: 'DUPLICATE' as const };

  const exchangeRequest = await prisma.exchangeRequest.create({
    data: {
      senderId,
      receiverId: targetBook.ownerId,
      targetBookId,
    },
  });

  // Send email notification (best-effort, don't fail the request)
  try {
    const requestor = await prisma.user.findUnique({
      where: { id: senderId },
      include: { books: { where: { isAvailable: true } } },
    });

    if (requestor) {
      await sendExchangeRequestEmail(
        targetBook.owner.email,
        targetBook.owner.name,
        requestor.name,
        requestor.email,
        targetBook.title,
        requestor.books
      );
    }
  } catch (_error) {
    // Log error but don't fail the exchange request itself
    console.error('Failed to send exchange request email');
  }

  return { status: 'OK' as const, exchangeRequest };
}

/**
 * Accept or reject an exchange request.
 * Only the receiver (book owner) can accept/reject.
 */
export async function updateExchangeStatus(
  exchangeId: string,
  receiverId: string,
  action: 'ACCEPTED' | 'REJECTED'
) {
  const request = await prisma.exchangeRequest.findUnique({
    where: { id: exchangeId },
    include: {
      sender: true,
      receiver: true,
      targetBook: true,
    },
  });

  if (!request) return { status: 'NOT_FOUND' as const };
  if (request.receiverId !== receiverId) return { status: 'FORBIDDEN' as const };
  if (request.status !== 'PENDING') return { status: 'ALREADY_PROCESSED' as const };

  const updated = await prisma.exchangeRequest.update({
    where: { id: exchangeId },
    data: { status: action },
  });

  // If accepted, mark the book as unavailable
  if (action === 'ACCEPTED') {
    await prisma.book.update({
      where: { id: request.targetBookId },
      data: { isAvailable: false },
    });

    // Reject all other pending requests for this book
    await prisma.exchangeRequest.updateMany({
      where: {
        targetBookId: request.targetBookId,
        status: 'PENDING',
        id: { not: exchangeId },
      },
      data: { status: 'REJECTED' },
    });
  }

  // Send email notification (best-effort)
  try {
    await sendExchangeStatusEmail(
      request.sender.email,
      request.sender.name,
      request.targetBook.title,
      action,
      request.receiver.name
    );
  } catch (_error) {
    console.error('Failed to send exchange status email');
  }

  return { status: 'OK' as const, exchangeRequest: updated };
}

/**
 * Get exchange requests for a user (both sent and received).
 */
export async function getMyExchanges(userId: string) {
  const [sent, received] = await Promise.all([
    prisma.exchangeRequest.findMany({
      where: { senderId: userId },
      include: {
        targetBook: { include: { owner: { select: { id: true, name: true } } } },
        receiver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.exchangeRequest.findMany({
      where: { receiverId: userId },
      include: {
        targetBook: true,
        sender: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { sent, received };
}

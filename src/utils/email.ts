import nodemailer from 'nodemailer';
import { config } from '../config/env';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

/**
 * Send an email notification about a new exchange request.
 * Throws on failure so the caller can decide how to handle it.
 * Does NOT log PII (email addresses) — logs only success/failure status.
 */
export const sendExchangeRequestEmail = async (
  ownerEmail: string,
  ownerName: string,
  requestorName: string,
  requestorEmail: string,
  targetBookTitle: string,
  requestorBooks: { title: string; author: string }[]
): Promise<void> => {
  const booksList = requestorBooks.map((book) => `- ${book.title} (${book.author})`).join('\n');

  const mailOptions = {
    from: `"Book Exchange" <${config.smtp.user}>`,
    to: ownerEmail,
    subject: `Новий запит на обмін книги: ${targetBookTitle}!`,
    text: `Привіт, ${ownerName}!\n\nКористувач ${requestorName} (${requestorEmail}) хоче обміняти вашу книгу "${targetBookTitle}".\n\nОсь книги, які ${requestorName} пропонує натомість:\n${booksList}\n\nЗв'яжіться з ${requestorName} за адресою ${requestorEmail}, щоб домовитись про обмін!`,
  };

  // Throw on failure — the controller decides whether to swallow or propagate
  await transporter.sendMail(mailOptions);
  console.log('Exchange request email sent successfully');
};

/**
 * Send a notification that an exchange request has been accepted/rejected.
 */
export const sendExchangeStatusEmail = async (
  recipientEmail: string,
  recipientName: string,
  bookTitle: string,
  status: 'ACCEPTED' | 'REJECTED',
  ownerName: string
): Promise<void> => {
  const statusText = status === 'ACCEPTED' ? 'прийнято' : 'відхилено';

  const mailOptions = {
    from: `"Book Exchange" <${config.smtp.user}>`,
    to: recipientEmail,
    subject: `Ваш запит на обмін ${statusText}: ${bookTitle}`,
    text: `Привіт, ${recipientName}!\n\nВаш запит на обмін книги "${bookTitle}" був ${statusText} користувачем ${ownerName}.\n\n${status === 'ACCEPTED' ? `Зв'яжіться з ${ownerName} для подальших деталей обміну!` : 'Ви можете спробувати знайти інші книги для обміну.'}`,
  };

  await transporter.sendMail(mailOptions);
  console.log('Exchange status email sent successfully');
};

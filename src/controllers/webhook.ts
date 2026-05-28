import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../utils/prisma';

export const clerkWebhookHandler = async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // Get the headers and body
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    res.status(400).json({ error: 'Error occurred -- no svix headers' });
    return;
  }

  // Get the body
  // Since we use bodyParser.raw, req.body is a Buffer
  const payload = (req.body as Buffer).toString('utf8');
  const body = payload;

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    res.status(400).json({ error: 'Error occurred' });
    return;
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { email_addresses, first_name, last_name, image_url } = evt.data;
    
    const email = email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : '';
    const name = `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User';

    try {
      await prisma.user.create({
        data: {
          id: id,
          email: email,
          name: name,
          avatarUrl: image_url || null,
        }
      });
      console.log(`User ${id} created in database.`);
    } catch (error) {
      console.error('Error creating user in DB:', error);
      res.status(500).json({ error: 'Failed to sync user' });
      return;
    }
  }

  res.status(200).json({ success: true });
};

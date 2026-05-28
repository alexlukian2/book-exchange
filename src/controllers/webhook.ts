import { Request, Response } from 'express';
import { Webhook } from 'svix';
import * as userService from '../services/user.service';
import { config } from '../config/env';

/** Clerk webhook event data types */
interface ClerkUserEventData {
  id: string;
  email_addresses: { email_address: string }[];
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserEventData;
}

export const clerkWebhookHandler = async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = config.clerkWebhookSecret;

  // Validate svix headers
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    res.status(400).json({ error: 'Missing svix headers' });
    return;
  }

  // Verify webhook signature
  const payload = (req.body as Buffer).toString('utf8');
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error('Webhook signature verification failed');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  const { id, email_addresses, first_name, last_name, image_url } = evt.data;
  const email =
    email_addresses && email_addresses.length > 0
      ? email_addresses[0].email_address
      : '';
  const name = `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User';

  try {
    switch (evt.type) {
      case 'user.created': {
        await userService.createUser({
          id,
          email,
          name,
          avatarUrl: image_url || null,
        });
        console.log(`User ${id} created in database`);
        break;
      }

      case 'user.updated': {
        await userService.updateUser(id, {
          email,
          name,
          avatarUrl: image_url || null,
        });
        console.log(`User ${id} updated in database`);
        break;
      }

      case 'user.deleted': {
        await userService.deleteUser(id);
        console.log(`User ${id} deleted from database`);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${evt.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event ${evt.type}:`, error);
    res.status(500).json({ error: 'Failed to process webhook event' });
    return;
  }

  res.status(200).json({ success: true });
};

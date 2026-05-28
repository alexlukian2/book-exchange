import { Router } from 'express';
import express from 'express';
import { clerkWebhookHandler } from '../controllers/webhook';
import { webhookLimiter } from '../middlewares/rateLimit';

const router = Router();

// Clerk webhook requires raw body for svix signature verification
router.post(
  '/clerk',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  clerkWebhookHandler as express.RequestHandler
);

export default router;

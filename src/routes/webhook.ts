import { Router } from 'express';
import express from 'express';
import { clerkWebhookHandler } from '../controllers/webhook';

const router = Router();

// Clerk webhook requires raw body for svix signature verification
router.post('/clerk', express.raw({ type: 'application/json' }), clerkWebhookHandler as any);

export default router;

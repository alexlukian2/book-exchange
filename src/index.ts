// Config must be imported first — loads dotenv and validates env vars
import { config } from './config/env';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';
import webhookRoutes from './routes/webhook';
import bookRoutes from './routes/books';
import adminRoutes from './routes/admin';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { globalLimiter } from './middlewares/rateLimit';
import { disconnectPrisma } from './utils/prisma';

const app = express();

// ── Security Middlewares ─────────────────────────────────────────────────────

// Strict Helmet configuration with CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // swagger-ui needs inline styles
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // allow swagger-ui to load
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// CORS — strict origin allow-list, NOT wildcard
app.use(
  cors({
    origin: config.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Global rate limiter
app.use(globalLimiter);

// Clerk middleware adds auth object to req
app.use(clerkMiddleware());

// ── Webhook routes BEFORE express.json() — svix needs raw body ──────────────
app.use('/api/webhooks', webhookRoutes);

// ── Body Parser ─────────────────────────────────────────────────────────────
app.use(express.json());

// ── Swagger API Documentation ───────────────────────────────────────────────
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', bookRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Global Error Handler ────────────────────────────────────────────────────
// Must be registered AFTER all routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log full error for debugging but send generic message to client
  console.error('Unhandled error:', err.message);

  // Handle Multer file size errors
  if (err.message === 'File too large') {
    res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
    return;
  }

  // Handle Multer file type errors
  if (err.message.includes('Invalid file type')) {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal Server Error' });
});

// ── Server Start ────────────────────────────────────────────────────────────
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${config.port}`);
  console.log(`API Docs: http://0.0.0.0:${config.port}/api-docs`);
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
async function gracefulShutdown(signal: string) {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await disconnectPrisma();
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

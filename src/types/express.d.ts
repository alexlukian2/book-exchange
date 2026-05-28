/**
 * Extend Express Request with Clerk's auth object.
 * This eliminates all `(req as any).auth` casts.
 */
declare namespace Express {
  interface Request {
    auth?: {
      userId: string;
      sessionId?: string;
      orgId?: string;
    };
  }
}

import dotenv from 'dotenv';

// Load environment variables once — this is the ONLY place dotenv.config() should be called
dotenv.config();

/**
 * Validates that all required environment variables are set.
 * Fails fast at startup if any are missing.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),

  // Database
  databaseUrl: requireEnv('DATABASE_URL'),

  // Clerk Auth
  clerkSecretKey: requireEnv('CLERK_SECRET_KEY'),
  clerkWebhookSecret: requireEnv('CLERK_WEBHOOK_SECRET'),
  clerkPublishableKey: process.env['CLERK_PUBLISHABLE_KEY'] || '',

  // CORS
  corsOrigin: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),

  // S3-compatible Storage (Supabase)
  s3: {
    endpoint: requireEnv('SUPABASE_S3_ENDPOINT'),
    region: requireEnv('SUPABASE_S3_REGION'),
    accessKeyId: requireEnv('SUPABASE_S3_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('SUPABASE_S3_SECRET_ACCESS_KEY'),
    bucketName: requireEnv('SUPABASE_S3_BUCKET_NAME'),
  },

  // SMTP Email
  smtp: {
    host: optionalEnv('SMTP_HOST', ''),
    port: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
    user: optionalEnv('SMTP_USER', ''),
    pass: optionalEnv('SMTP_PASS', ''),
  },
} as const;

// Validate at import time
if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error(`Invalid PORT: ${process.env['PORT']}`);
}

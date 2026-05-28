import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const s3Client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: true, // Required for Supabase S3 compatibility
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

/**
 * Upload a file buffer to S3.
 * Uses validated MIME type for file extension (not the user-provided originalname)
 * to prevent stored XSS via malicious file extensions (e.g., .html, .svg).
 */
export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  validatedMimeType: string
): Promise<string> => {
  const bucketName = config.s3.bucketName;

  if (!bucketName) {
    throw new Error('SUPABASE_S3_BUCKET_NAME is not set');
  }

  // Derive extension from validated MIME type only — never from user input
  const extension = MIME_TO_EXTENSION[validatedMimeType];
  if (!extension) {
    throw new Error(`Unsupported MIME type: ${validatedMimeType}`);
  }

  const fileName = `books/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: validatedMimeType,
    ContentDisposition: 'inline',
  });

  await s3Client.send(command);

  // Construct the public URL for Supabase Storage
  // S3 Endpoint: https://[PROJECT_REF].supabase.co/storage/v1/s3
  // Public URL: https://[PROJECT_REF].supabase.co/storage/v1/object/public/[BUCKET]/[FILE]
  const baseUrl = config.s3.endpoint.replace('/s3', '');
  return `${baseUrl}/object/public/${bucketName}/${fileName}`;
};

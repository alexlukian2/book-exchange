import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const bucketName = process.env.AWS_S3_BUCKET_NAME || '';

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const uploadFileToS3 = async (fileBuffer: Buffer, originalname: string, mimetype: string): Promise<string> => {
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME is not set');
  }

  // Створюємо унікальне ім'я файлу, щоб уникнути конфліктів
  const extension = originalname.split('.').pop() || 'jpg';
  const fileName = `books/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype,
    // Можна зробити файл публічно доступним, якщо бакет налаштовано відповідно
    // ACL: 'public-read', 
  });

  await s3Client.send(command);

  // Формуємо URL для доступу до файлу
  return `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
};

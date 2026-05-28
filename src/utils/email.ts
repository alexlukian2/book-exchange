import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendExchangeRequestEmail = async (
  ownerEmail: string,
  ownerName: string,
  requestorName: string,
  requestorEmail: string,
  targetBookName: string,
  requestorBooks: any[]
) => {
  const booksList = requestorBooks.map(book => `- ${book.name} (${book.author})`).join('\n');
  
  const mailOptions = {
    from: `"Book Exchange" <${process.env.SMTP_USER}>`,
    to: ownerEmail,
    subject: `Новий запит на обмін книги: ${targetBookName}!`,
    text: `Привіт, ${ownerName}!\n\nКористувач ${requestorName} (${requestorEmail}) хоче обміняти вашу книгу "${targetBookName}".\n\nОсь книги, які ${requestorName} пропонує натомість:\n${booksList}\n\nЗв'яжіться з ${requestorName} за адресою ${requestorEmail}, щоб домовитись про обмін!`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${ownerEmail}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import webhookRoutes from './routes/webhook';
import bookRoutes from './routes/books';
import adminRoutes from './routes/admin';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet());
app.use(cors());

// clerkMiddleware will add the auth object to req
app.use(clerkMiddleware());

// Mount webhook routes BEFORE express.json() because Svix needs the raw body
app.use('/api/webhooks', webhookRoutes);

// Body Parser Middleware for all other routes
app.use(express.json());

// Swagger API Documentation
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api', bookRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Server start
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

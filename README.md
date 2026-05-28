# Book Exchange Service

A professional RESTful API for a Book Exchange Platform. Built with modern Node.js practices, robust security, and typed configurations.

## 🚀 Tech Stack

- **Runtime:** Node.js + Express 5
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** Clerk
- **Validation:** Zod
- **Storage:** AWS S3 / Supabase Storage
- **Code Quality:** ESLint 9, Prettier, Jest

## 🏗 Architecture

The project follows a classic **Controller-Service-Route** (Layered Architecture):
- **Routes (`src/routes`)**: API endpoints definitions and middleware mapping.
- **Controllers (`src/controllers`)**: HTTP request handling, input validation (Zod), and response formatting.
- **Services (`src/services`)**: Core business logic and database interactions (Prisma).

## 🔒 Security & Best Practices

- **Helmet & CSP:** Configured for strict security headers.
- **CORS:** Origin allowlist via Environment Variables.
- **Rate Limiting:** Global rate limit against brute-force/DDoS attacks.
- **Fail-Fast Config:** Application fails to boot if critical ENV vars are missing.
- **Graceful Shutdown:** Safely handles `SIGTERM`/`SIGINT` and disconnects Prisma properly.
- **Global Error Handling:** Traps unhandled exceptions, Multer limits, and avoids stack trace leaks.

## 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd project-book
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Copy the example config and fill in your values.
   ```bash
   cp .env.example .env
   ```
   *Note: Ensure `DATABASE_URL` and `CLERK_SECRET_KEY` are provided.*

4. **Database Migration:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## 🛠 Available Scripts

- `npm run dev`: Starts the development server using nodemon.
- `npm run build`: Compiles TypeScript and generates Prisma client.
- `npm start`: Runs the compiled production code.
- `npm run lint`: Analyzes code for ESLint errors.
- `npm run lint:fix`: Automatically fixes fixable lint errors.
- `npm run format`: Formats code using Prettier.
- `npm run test`: Runs unit tests using Jest.
- `npm run test:watch`: Runs tests in watch mode.

## 📚 API Documentation

Swagger API documentation is available. Once the server is running, navigate to:
```
http://localhost:3000/api-docs
```

## 🧪 Testing

We use **Jest** and **jest-mock-extended** for testing. 
Prisma is mocked to ensure tests run fast and isolated from the actual database.
```bash
npm run test
```

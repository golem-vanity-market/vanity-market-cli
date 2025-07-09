# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack web application for a Golem vanity address marketplace with three main components:

- **backend/**: Fastify server with JWT authentication and SQLite database
- **frontend/**: Next.js 15 app with RainbowKit for Ethereum wallet integration
- **shared/**: TypeScript contracts using ts-rest for type-safe API communication

## Development Commands

### Backend (Node.js 23+ required)

```bash
cd backend
node --watch src/index.ts         # Start development server
npx drizzle-kit push              # Push database schema
npx drizzle-kit studio            # Open database viewer
```

### Frontend (Next.js)

```bash
cd frontend
npm run dev                       # Start development server (with Turbopack)
npm run build                     # Build for production
npm run start                     # Start production server
npm run lint                      # Run ESLint
```

### Shared

```bash
cd shared
# No specific commands - shared contracts between frontend/backend
```

## Environment Setup

Copy `.env.template` to `.env` in both backend and frontend directories:

**Backend .env variables:**

- `YAGNA_APPKEY`: Golem network app key
- `DB_FILE_NAME`: SQLite database path
- `JWT_SECRET`: JWT signing secret
- `CORS_ORIGIN`: Frontend URL for CORS
- `BIND_ADDRESS` & `BIND_PORT`: Server binding configuration

**Frontend .env variables:**

- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect project ID

## Authentication Architecture

The app uses Sign-in with Ethereum (SIWE) authentication:

1. **Frontend**: RainbowKit + Wagmi for wallet connection
2. **Backend**: SIWE message verification with nonce-based security
3. **Tokens**: JWT access tokens (15min) + refresh tokens (30d) stored in HTTP-only cookies
4. **Database**: SQLite with Drizzle ORM for users, nonces, refresh tokens, and jobs

## Key Files

- `shared/contracts/`: API contracts defining endpoints and validation schemas
- `backend/src/modules/auth/`: Authentication logic and JWT handling
- `backend/src/lib/db/schema.ts`: Database schema definitions
- `frontend/features/auth/`: Authentication UI components and hooks
- `backend/src/plugins/authenticate.ts`: JWT authentication middleware

## Database Schema

- `user`: Ethereum addresses with timestamps
- `nonce`: Temporary nonces for SIWE authentication
- `refresh_tokens`: Long-lived refresh tokens
- `job`: Vanity address generation jobs
- `job_result`: Results from completed jobs

## API Communication

Uses ts-rest for end-to-end type safety between frontend and backend. All API contracts are defined in `shared/contracts/` and imported by both sides.

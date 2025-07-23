# CLAUDE.md - Backend

This file provides guidance for working with the Golem vanity address marketplace backend.

## Development

### Start Development Server

```bash
node --watch src/index.ts
```

### Database Operations

```bash
npx drizzle-kit push      # Push schema changes
npx drizzle-kit studio    # Open database viewer
```

### Code Quality

```bash
npm run lint              # Run ESLint linting
npx prettier . --write    # Format code with Prettier
```

## Architecture

- **Framework**: Fastify with TypeScript
- **Database**: SQLite with Drizzle ORM
- **Authentication**: JWT with SIWE (Sign-in with Ethereum)
- **API Contracts**: ts-rest for type safety with frontend

## Key Modules

- `src/modules/auth/`: SIWE authentication and JWT handling
- `src/modules/job/`: Vanity address job management
- `src/modules/user/`: User profile management
- `src/lib/db/`: Database schema and connection
- `src/plugins/`: Fastify plugins (auth, cors, etc.)

## Environment Variables

Required in `.env`:

- `YAGNA_APPKEY`: Golem network app key
- `DB_FILE_NAME`: SQLite database path
- `JWT_SECRET`: JWT signing secret
- `CORS_ORIGIN`: Frontend URL for CORS
- `BIND_ADDRESS` & `BIND_PORT`: Server configuration

## Database Schema

- `user`: Ethereum addresses with timestamps
- `nonce`: Temporary nonces for SIWE authentication
- `refresh_tokens`: Long-lived refresh tokens
- `job`: Vanity address generation jobs
- `job_result`: Results from completed jobs

## Authentication Flow

1. Frontend requests nonce
2. User signs SIWE message with wallet
3. Backend verifies signature and issues JWT tokens
4. Access tokens (15min) + refresh tokens (30d) in HTTP-only cookies

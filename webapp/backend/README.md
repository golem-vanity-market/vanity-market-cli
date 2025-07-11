# Web App Backend

## Development

Make sure you have at least Node.js 23 installed. Run the dev server with:

```bash
node --watch src/server.ts
```

### Log Readability

Fastify uses pino under the hood, so you can use any pino-compatible tool to filter or prettify the logs, for example:

```bash
node --watch src/server.ts | npx pino-pretty
```

## Environment Variables

Copy the `.env.template` file to `.env` and fill in the required values. 

## Database

Database is saved to a file `db.sqlite` in the root of the project. You can use `drizzle-kit` to push the schema to the database:

```bash
npx drizzle-kit push
```

It also includes a database viewer:

```bash
npx drizzle-kit studio
```
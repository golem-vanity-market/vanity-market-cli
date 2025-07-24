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

The application uses postgres to persist data. You can configure the connection string with the `DB_URL` env variable.

For convenience you may use the attached `docker-compose` file to start a local postgres instance:

```bash
docker compose up -d --build
```

To push the project's schema to a newly created database you can run: 

```bash
npx drizzle-kit push
```

`drizzle-kit` also includes a database viewer:

```bash
npx drizzle-kit studio
```

## Testing

To run integration tests use the following command:

```bash
npm test
```

The test environment uses an in-memory implementation of postgres, so there is no need to set up a "real" database.
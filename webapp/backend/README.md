# Web App Backend

## Development

Make sure you have at least Node.js 23 installed. Run the dev server with:

```bash
node --watch src/index.ts
```

## Database

Database is saved to a file `db.sqlite` in the root of the project. You can use `drizzle-kit` to push the schema to the database:

```bash
npx drizzle-kit push
```

It also includes a database viewer:

```bash
npx drizzle-kit studio
```
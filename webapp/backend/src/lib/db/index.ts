import { drizzle } from "drizzle-orm/node-postgres";
import config from "../../config.ts";

async function getDbConnection() {
  if (process.env.NODE_ENV === "test") {
    // use an in-memory postgres instance in test
    const { drizzle: pgLiteDrizzleClient } = await import("drizzle-orm/pglite");
    return pgLiteDrizzleClient("memory://");
  }
  // in dev and production connect to a "real" postgres server
  return drizzle(config.DB_URL);
}

export const db = await getDbConnection();

import { drizzle } from "drizzle-orm/libsql";
import config from "../../config.ts";
import { createClient } from "@libsql/client";

function getDbConnection() {
  if (process.env.NODE_ENV === "test") {
    // use an in-memory sqlite instance in test
    const client = createClient({ url: ":memory:" });
    return drizzle(client);
  }
  return drizzle(config.DB_FILE_NAME);
}

export const db = getDbConnection();

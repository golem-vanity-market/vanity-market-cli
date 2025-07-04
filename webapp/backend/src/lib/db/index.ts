import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";

const fileName = process.env.DB_FILE_NAME;
if (!fileName) {
  throw new Error("DB_FILE_NAME environment variable is not set.");
}

export const db = drizzle(fileName);

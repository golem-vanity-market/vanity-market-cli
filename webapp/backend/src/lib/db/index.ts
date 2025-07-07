import { drizzle } from "drizzle-orm/libsql";
import config from "../../config.ts";

export const db = drizzle(config.DB_FILE_NAME);

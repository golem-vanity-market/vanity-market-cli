import "dotenv/config";
import * as z from "zod/v4";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const envSchema = z.object({
  DB_FILE_NAME: z.string().default("db.sqlite"),
  YAGNA_APPKEY: z.string(),
  JWT_SECRET: z.string(),
  PORT: z.coerce.number().default(3001),
  COOKIE_NAME: z.string().default("refresh_token"),
  IS_PRODUCTION: z.coerce.boolean().default(IS_PRODUCTION),
  CORS_ORIGIN: z.string(),
  BIND_ADDRESS: z.string().default("0.0.0.0"),
  BIND_PORT: z.coerce.number().default(3001),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error("Invalid environment variables:", env.error.format());
  process.exit(1);
}

export default env.data;

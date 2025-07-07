import "dotenv/config";
import z from "zod";

const envSchema = z.object({
  DB_FILE_NAME: z.string().default("db.sqlite"),
  YAGNA_APPKEY: z.string(),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error("Invalid environment variables:", env.error.format());
  process.exit(1);
}

export default env.data;

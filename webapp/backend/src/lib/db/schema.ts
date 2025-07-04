import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("user", {
  id: int("id").primaryKey({ autoIncrement: true }),
  address: text("address").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const jobsTable = sqliteTable("job", {
  id: text("id").primaryKey(), // Using text for UUIDs
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  publicKey: text("public_key").notNull(),
  vanityAddressPrefix: text("vanity_address_prefix").notNull(),
  numWorkers: int("num_workers").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const jobResultsTable = sqliteTable("job_result", {
  id: int("id").primaryKey({ autoIncrement: true }),
  jobId: text("job_id")
    .notNull()
    .references(() => jobsTable.id, { onDelete: "cascade" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  addr: text("addr").notNull(),
  salt: text("salt").notNull(),
  pubKey: text("pub_key").notNull(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  providerWalletAddress: text("provider_wallet_address").notNull(),
});

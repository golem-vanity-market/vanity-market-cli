import { sql } from "drizzle-orm";
import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("user", {
  address: text("address", { length: 42 }).primaryKey(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const noncesTable = sqliteTable("nonce", {
  nonce: text("nonce").notNull().primaryKey(),
  expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
});

export const refreshTokensTable = sqliteTable("refresh_tokens", {
  token: text("token").primaryKey(),
  userAddress: text("user_address", { length: 42 })
    .notNull()
    .references(() => usersTable.address, { onDelete: "cascade" }),
  expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
});

export const jobsTable = sqliteTable("job", {
  id: text("id").primaryKey(), // Using text for UUIDs
  userAddress: text("user_address")
    .notNull()
    .references(() => usersTable.address, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["pending", "processing", "completed", "failed", "cancelled"],
  }).notNull(),
  publicKey: text("public_key").notNull(),
  vanityAddressPrefix: text("vanity_address_prefix").notNull(),
  numWorkers: int("num_workers").notNull(),
  budgetGlm: real("budget_glm").notNull(),
  processingUnit: text("processing_unit", { enum: ["cpu", "gpu"] }).notNull(),
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

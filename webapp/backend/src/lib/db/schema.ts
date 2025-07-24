import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  real,
  pgEnum,
  serial,
  check,
  uuid,
} from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];

export const processingUnitEnum = pgEnum("processing_unit", ["cpu", "gpu"]);
export type ProcessingUnit = (typeof processingUnitEnum.enumValues)[number];

export const usersTable = pgTable("user", {
  address: varchar("address", { length: 42 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const noncesTable = pgTable("nonce", {
  nonce: text("nonce").notNull().primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const refreshTokensTable = pgTable("refresh_tokens", {
  token: text("token").primaryKey(),
  userAddress: varchar("user_address", { length: 42 })
    .notNull()
    .references(() => usersTable.address, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const jobsTable = pgTable(
  "job",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userAddress: varchar("user_address", { length: 42 }).references(
      () => usersTable.address,
      {
        onDelete: "cascade",
      }
    ),
    anonymousSessionId: text("anonymous_session_id"),
    status: jobStatusEnum("status").notNull(),
    publicKey: text("public_key").notNull(),
    vanityAddressPrefix: text("vanity_address_prefix").notNull(),
    numWorkers: integer("num_workers").notNull(),
    budgetGlm: real("budget_glm").notNull(),
    processingUnit: processingUnitEnum("processing_unit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Either session id or user address have to be defined
    check(
      "one_owner",
      sql`((${table.userAddress} IS NOT NULL AND ${table.anonymousSessionId} IS NULL) OR (${table.userAddress} IS NULL AND ${table.anonymousSessionId} IS NOT NULL))`
    ),
  ]
);

export const jobResultsTable = pgTable("job_result", {
  id: serial("id").primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  addr: text("addr").notNull(),
  salt: text("salt").notNull(),
  pubKey: text("pub_key").notNull(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  providerWalletAddress: text("provider_wallet_address").notNull(),
});

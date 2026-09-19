import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const farms = pgTable('farms', {
  id: uuid('id').primaryKey().defaultRandom(),
  producerId: uuid('producer_id'),
  name: varchar('name', { length: 255 }).notNull(),
  state: varchar('state', { length: 2 }),
  city: varchar('city', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Farm = typeof farms.$inferSelect;
export type NewFarm = typeof farms.$inferInsert;

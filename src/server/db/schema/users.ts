import { pgTable, uuid, varchar, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['PRODUCER', 'RESELLER', 'ADMIN']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  role: userRoleEnum('role').notNull().default('PRODUCER'),
  state: varchar('state', { length: 2 }).notNull(), // 'ES', 'MG', 'BA'
  city: varchar('city', { length: 100 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  cnpj: varchar('cnpj', { length: 14 }),
  deliveryRadiusKm: integer('delivery_radius_km').default(100),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

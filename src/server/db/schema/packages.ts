import { pgTable, uuid, varchar, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const technologicalPackages = pgTable('technological_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  producerId: uuid('producer_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  cropType: varchar('crop_type', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const packageItems = pgTable('package_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id')
    .references(() => technologicalPackages.id, { onDelete: 'cascade' })
    .notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  acceptsGeneric: boolean('accepts_generic').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TechnologicalPackage = typeof technologicalPackages.$inferSelect;
export type NewTechnologicalPackage = typeof technologicalPackages.$inferInsert;
export type PackageItem = typeof packageItems.$inferSelect;
export type NewPackageItem = typeof packageItems.$inferInsert;

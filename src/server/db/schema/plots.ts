import { pgTable, uuid, numeric, integer, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { farms } from './farms';

export const cropTypeEnum = pgEnum('crop_type', [
  'cafe_conilon',
  'cafe_arabica',
  'cacau',
  'pimenta_reino',
  'mamao',
]);

export const plots = pgTable('plots', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id')
    .references(() => farms.id, { onDelete: 'cascade' })
    .notNull(),
  cropType: cropTypeEnum('crop_type').notNull(),
  areaHectares: numeric('area_hectares', { precision: 8, scale: 2 }).notNull(),
  plantCount: integer('plant_count'),
  spacing: varchar('spacing', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Plot = typeof plots.$inferSelect;
export type NewPlot = typeof plots.$inferInsert;

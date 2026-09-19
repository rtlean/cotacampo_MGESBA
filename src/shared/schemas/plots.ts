import { z } from 'zod';

export const cropTypeEnumSchema = z.enum([
  'cafe_conilon',
  'cafe_arabica',
  'cacau',
  'pimenta_reino',
  'mamao',
], {
  message: 'Tipo de cultura inválido. Escolha: cafe_conilon, cafe_arabica, cacau, pimenta_reino ou mamao',
});

export const createPlotSchema = z.object({
  farmId: z.string().uuid('ID da fazenda deve ser um UUID válido'),
  cropType: cropTypeEnumSchema,
  areaHectares: z.number({
    message: 'A área do talhão é obrigatória e deve ser um valor numérico',
  }).positive('A área deve ser maior que zero'),
  plantCount: z.number().int('A quantidade de plantas deve ser um inteiro').positive('A contagem de plantas deve ser positiva').optional(),
  spacing: z.string().max(50, 'O espaçamento deve conter até 50 caracteres').optional(),
});

export type CreatePlotInput = z.infer<typeof createPlotSchema>;

export const plotSchema = createPlotSchema.extend({
  id: z.string().uuid(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export type PlotOutput = z.infer<typeof plotSchema>;

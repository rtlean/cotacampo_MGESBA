import { z } from 'zod';

export const quotationStatusSchema = z.enum(['OPEN', 'IN_REVIEW', 'AWARDED', 'CANCELLED']);

export const quotationItemSchema = z.object({
  id: z.string().optional(),
  quotationId: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  productName: z.string().min(2, 'Nome do produto é obrigatório'),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unit: z.string().min(1, 'Unidade de medida é obrigatória'),
});

export const quotationRequestSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  producerId: z.string().min(1, 'Identificador do produtor é obrigatório'),
  title: z.string().min(3, 'Título deve conter no mínimo 3 caracteres'),
  status: quotationStatusSchema,
  targetState: z.enum(['MG', 'ES', 'BA']),
  targetCity: z.string().min(2, 'Cidade é obrigatória'),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data limite deve ser válida',
  }),
  notes: z.string().optional(),
  items: z.array(quotationItemSchema).optional(),
  itemsCount: z.number().int().nonnegative().optional(),
  bidsCount: z.number().int().nonnegative().optional(),
  bestBidAmount: z.number().positive().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type QuotationRequestSchema = z.infer<typeof quotationRequestSchema>;

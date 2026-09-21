import { z } from 'zod';

export const publishQuotationInputSchema = z.object({
  id: z.string().min(1, 'ID da cotação é obrigatório'),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  cropName: z.string().min(2, 'Nome da cultura é obrigatório'),
  targetCity: z.string().min(2, 'Município é obrigatório'),
  targetState: z.enum(['ES', 'MG', 'BA'], {
    message: 'Estado deve ser ES, MG ou BA',
  }),
  itemsCount: z.number().int().positive('Quantidade de itens deve ser maior que zero'),
  freightType: z.enum(['CIF', 'FOB']).default('CIF'),
  proposalLimitHours: z.number().int().positive().optional().default(48),
  deadline: z.string().optional(),
  appLink: z.string().url().optional(),
});

export type PublishQuotationInput = z.infer<typeof publishQuotationInputSchema>;

export const publishQuotationOutputSchema = z.object({
  id: z.string(),
  displayCode: z.string(),
  status: z.literal('OPEN'),
  publishedAt: z.string(),
  notifiedResellersCount: z.number().int().nonnegative(),
  message: z.string(),
});

export type PublishQuotationOutput = z.infer<typeof publishQuotationOutputSchema>;

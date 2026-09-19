import { z } from 'zod';

export const cropCopilotInputSchema = z.object({
  cropType: z.enum(['cafe_conilon', 'cafe_arabica', 'cacau', 'pimenta_reino', 'mamao'], {
    message: 'Cultura não suportada para análise agronômica regional',
  }),
  areaHectares: z.number({
    message: 'A área do talhão é obrigatória e deve ser um número',
  }).positive('A área em hectares deve ser maior que zero'),
  plantCount: z.number().int('A contagem de plantas deve ser um número inteiro').positive('A contagem de plantas deve ser positiva').optional(),
  productOrActiveIngredient: z.string({
    message: 'Informe o produto ou princípio ativo',
  }).min(2, 'Informe o produto ou princípio ativo com no mínimo 2 caracteres'),
  state: z.enum(['MG', 'ES', 'BA'], {
    message: 'Estado inválido. O copiloto atende apenas MG, ES e BA',
  }),
});

export type CropCopilotInput = z.infer<typeof cropCopilotInputSchema>;

export const cropCopilotOutputSchema = z.object({
  recommendedQuantity: z.number().positive('A quantidade recomendada deve ser positiva'),
  unit: z.enum(['Litros', 'Kg', 'Sacas', 'Toneladas']),
  dosagePerHectare: z.string(),
  justification: z.string(),
  isLmrRestricted: z.boolean(),
  warningMessage: z.string().optional(),
  suggestedAlternatives: z.array(z.string()).optional(),
});

export type CropCopilotOutput = z.infer<typeof cropCopilotOutputSchema>;

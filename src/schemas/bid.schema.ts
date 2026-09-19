import { z } from 'zod';

export const bidItemSchema = z.object({
  quotationItemId: z.string().min(1, 'ID do item é obrigatório'),
  productName: z.string().min(1, 'Nome do produto é obrigatório'),
  brandName: z.string().trim().min(1, 'Informe o nome da marca ou produto alternativo'),
  unitPrice: z.number({ message: 'Preço unitário deve ser um número válido' }).positive('Preço unitário deve ser maior que zero'),
  quantity: z.number().positive('Quantidade deve ser positiva').optional(),
  isEquivalent: z.boolean().default(false),
  activeIngredientConcentration: z.string().optional(),
  notes: z.string().optional(),
});

export const bidSubmissionSchema = z.object({
  quotationId: z.string().min(1, 'ID da cotação é obrigatório'),
  items: z.array(bidItemSchema).min(1, 'Ao menos um item deve ser cotado'),
  freightCost: z.number({ message: 'Custo do frete deve ser informado' }).min(0, 'O frete não pode ser negativo'),
  deliveryDays: z.number({ message: 'Prazo de entrega deve ser informado' }).int('O prazo de entrega deve ser em dias inteiros').min(1, 'O prazo de entrega deve ser de pelo menos 1 dia'),
  validityHours: z.number({ message: 'Validade da proposta deve ser informada' }).int('A validade deve ser em horas inteiras').min(1, 'A validade deve ser de pelo menos 1 hora'),
  paymentMethod: z.enum(['CASH', 'TERM_HARVEST', 'BARTER', 'STANDARD', 'AVISTA', 'PRAZO_30', 'PRAZO_60'], {
    message: 'Selecione uma modalidade de pagamento válida',
  }),
  paymentTerms: z.string().optional(),
  barterBagsCount: z.number({ message: 'Informe a quantidade de sacas' }).int('A quantidade de sacas deve ser um inteiro').positive('A quantidade de sacas deve ser maior que zero').optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'BARTER') {
    if (!data.barterBagsCount || data.barterBagsCount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['barterBagsCount'],
        message: 'Para a modalidade Barter, informe quantas sacas (60kg) pelo lote completo',
      });
    }
  }
});

export type BidSubmissionInput = z.infer<typeof bidSubmissionSchema>;
export type BidItemInput = z.infer<typeof bidItemSchema>;

import { z } from 'zod';

export const TARGET_CROP_OPTIONS = [
  'cafe_conilon',
  'cafe_arabica',
  'cacau',
  'pimenta_reino',
  'mamao',
] as const;

export const targetCropEnum = z
  .string({ message: 'Selecione a cultura atendida' })
  .min(1, 'Selecione a cultura atendida')
  .refine(
    (val) => TARGET_CROP_OPTIONS.includes(val as (typeof TARGET_CROP_OPTIONS)[number]),
    { message: 'Selecione a cultura atendida' }
  );

export const step1DestinationSchema = z.object({
  farmId: z
    .string({ message: 'Selecione a propriedade de destino' })
    .min(1, 'Selecione a propriedade de destino'),
  targetCrop: targetCropEnum,
});

export type Step1DestinationSchema = z.infer<typeof step1DestinationSchema>;

export const MAX_PRESCRIPTION_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_PRESCRIPTION_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

export const step2ItemSchema = z.object({
  productName: z
    .string({ message: 'Informe o nome do produto ou princípio ativo' })
    .trim()
    .min(2, 'Informe o nome do produto ou princípio ativo'),
  activeIngredient: z.string().optional(),
  quantity: z
    .number({ message: 'Informe uma quantidade válida' })
    .gt(0, 'A quantidade deve ser maior que zero (0)'),
  unit: z
    .string({ message: 'Selecione a unidade de medida' })
    .trim()
    .min(1, 'Selecione a unidade de medida'),
  acceptsGeneric: z.boolean().default(true),
});

export type Step2ItemSchema = z.infer<typeof step2ItemSchema>;

export const recipeAttachmentSchema = z.object({
  name: z.string().min(1, 'Nome do arquivo é obrigatório'),
  size: z.number().max(MAX_PRESCRIPTION_SIZE_BYTES, 'O arquivo excede o limite máximo permitido de 5MB.'),
  type: z.string().refine(
    (val) => ALLOWED_PRESCRIPTION_TYPES.includes(val.toLowerCase()),
    'Formato inválido. Apenas arquivos PDF ou imagens (PNG, JPG) são permitidos.'
  ),
  uploadedAt: z.string(),
  dataUrl: z.string().optional(),
});

export const step2QuotationSchema = z.object({
  items: z
    .array(step2ItemSchema)
    .min(1, 'Adicione ao menos um item com volume válido para continuar.'),
  prescription: recipeAttachmentSchema.optional(),
});

export type Step2QuotationSchema = z.infer<typeof step2QuotationSchema>;


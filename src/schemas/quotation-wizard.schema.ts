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

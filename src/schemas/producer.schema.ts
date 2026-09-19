import { z } from 'zod';
import { FarmScale, CropId } from '../types/user';
import { getCropName } from '../data/crops';

export const SUPPORTED_STATES = ['MG', 'ES', 'BA'] as const;
export const SUPPORTED_CROPS = [
  'cafe',
  'cafe_conilon',
  'cafe_arabica',
  'cacau',
  'pimenta',
  'pimenta_reino',
  'mamao',
] as const;

export function normalizeAreaInput(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).trim().replace(',', '.');
  if (!cleaned) return 0;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function calculateCropScale(area: number, plantsCount?: number | null): FarmScale {
  const pCount = plantsCount ?? 0;
  if (area > 50 || pCount > 20000) {
    return 'GRANDE';
  }
  if (area > 10 || pCount > 4000) {
    return 'MEDIA';
  }
  return 'PEQUENA';
}

export const cropDimensionItemSchema = z.object({
  area: z.string().optional().default(''),
  plantsCount: z.string().optional().default(''),
});

export const producerRegistrationSchema = z
  .object({
    role: z.literal('PRODUCER', {
      message: 'O perfil de cadastro deve ser PRODUCER',
    }),

    fullName: z
      .string()
      .trim()
      .min(1, 'Informe seu nome completo')
      .min(3, 'O nome deve ter no mínimo 3 caracteres')
      .max(100, 'O nome deve ter no máximo 100 caracteres')
      .refine(
        (val) => val.trim().split(/\s+/).filter(Boolean).length >= 2,
        'Informe nome e sobrenome'
      ),

    email: z
      .string()
      .trim()
      .min(1, 'Informe seu e-mail')
      .email('Formato de e-mail inválido (ex: produtor@fazenda.com.br)'),

    whatsapp: z
      .string()
      .trim()
      .min(1, 'Informe seu número de WhatsApp')
      .refine((val) => {
        const digits = val.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 11) return false;
        const ddd = parseInt(digits.slice(0, 2), 10);
        return ddd >= 11 && ddd <= 99;
      }, 'Número de WhatsApp inválido. Utilize DDD + 9 dígitos: (XX) 9XXXX-XXXX'),

    password: z
      .string()
      .min(1, 'Crie uma senha de acesso')
      .min(6, 'A senha deve ter no mínimo 6 caracteres'),

    farmName: z
      .string()
      .trim()
      .min(1, 'Informe o nome da sua fazenda ou propriedade')
      .min(2, 'O nome da fazenda deve ter no mínimo 2 caracteres')
      .max(100, 'O nome da fazenda deve ter no máximo 100 caracteres'),

    state: z
      .string()
      .min(1, 'Selecione o estado da propriedade (MG, ES ou BA)')
      .refine((val): val is (typeof SUPPORTED_STATES)[number] => {
        return (SUPPORTED_STATES as readonly string[]).includes(val);
      }, 'Selecione o estado da propriedade (MG, ES ou BA)'),

    city: z
      .string()
      .trim()
      .min(1, 'Informe o município da propriedade')
      .min(2, 'O município deve ter no mínimo 2 caracteres')
      .max(100, 'O município deve ter no máximo 100 caracteres'),

    crops: z
      .array(
        z.enum(SUPPORTED_CROPS, {
          message: 'Cultura agrícola não suportada',
        })
      )
      .min(
        1,
        'Selecione ao menos uma cultura atendida (Café, Cacau, Pimenta-do-reino ou Mamão)'
      ),

    cropDimensions: z
      .record(z.string(), cropDimensionItemSchema)
      .optional(),
  })
  .superRefine((data, ctx) => {
    // US01.1 - Validação das dimensões de cada cultura selecionada
    if (data.crops && data.crops.length > 0) {
      for (const cropId of data.crops) {
        const dim = data.cropDimensions?.[cropId];
        const areaVal = dim?.area ?? '';
        const plantsVal = dim?.plantsCount ?? '';

        const normalizedArea = normalizeAreaInput(areaVal);
        const normalizedPlants =
          plantsVal && String(plantsVal).trim()
            ? parseInt(String(plantsVal).replace(/\D/g, ''), 10)
            : 0;

        const hasValidArea = normalizedArea >= 0.1;
        const hasValidPlants = !isNaN(normalizedPlants) && normalizedPlants >= 100;

        if (!hasValidArea && !hasValidPlants) {
          const cropName = getCropName(cropId as CropId);
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Informe a área plantada válida para o cultivo de ${cropName} (mínimo de 0,1 ha ou 100 plantas)`,
            path: ['cropDimensions', cropId, 'area'],
          });
        }
      }
    }
  });

export type ProducerRegistrationInput = z.infer<typeof producerRegistrationSchema>;

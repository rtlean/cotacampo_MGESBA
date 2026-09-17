import { z } from 'zod';
import { validateCNPJ } from '../utils/cnpj';

export const SUPPORTED_STATES = ['MG', 'ES', 'BA'] as const;

export const SUPPORTED_CATEGORIES = [
  'defensivos',
  'fertilizantes',
  'foliares',
  'biologicos',
  'corretivos',
] as const;

export const resellerRegistrationSchema = z.object({
  role: z.literal('RESELLER', {
    message: 'O perfil de cadastro deve ser RESELLER',
  }),

  razaoSocial: z
    .string()
    .trim()
    .min(1, 'Informe a Razão Social da empresa')
    .min(3, 'Razão Social deve ter no mínimo 3 caracteres')
    .max(150, 'Razão Social deve ter no máximo 150 caracteres'),

  nomeFantasia: z
    .string()
    .trim()
    .min(1, 'Informe o Nome Fantasia da loja')
    .min(2, 'Nome Fantasia deve ter no mínimo 2 caracteres')
    .max(100, 'Nome Fantasia deve ter no máximo 100 caracteres'),

  cnpj: z
    .string()
    .trim()
    .min(1, 'Informe o CNPJ da empresa')
    .refine((val) => validateCNPJ(val), 'CNPJ inválido ou incompleto'),

  corporateEmail: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail corporativo da empresa')
    .email('Formato de e-mail inválido (ex: contato@revenda.com.br)'),

  whatsapp: z
    .string()
    .trim()
    .min(1, 'Informe o número de WhatsApp')
    .refine((val) => {
      const digits = val.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) return false;
      const ddd = parseInt(digits.slice(0, 2), 10);
      return ddd >= 11 && ddd <= 99;
    }, 'WhatsApp inválido. Utilize DDD + 9 dígitos: (XX) 9XXXX-XXXX'),

  password: z
    .string()
    .min(1, 'Crie uma senha de acesso')
    .min(6, 'A senha deve ter no mínimo 6 caracteres'),

  state: z
    .string()
    .min(1, 'Selecione o estado da loja física (MG, ES ou BA)')
    .refine((val): val is (typeof SUPPORTED_STATES)[number] => {
      return (SUPPORTED_STATES as readonly string[]).includes(val);
    }, 'Selecione o estado da loja física (MG, ES ou BA)'),

  city: z
    .string()
    .trim()
    .min(1, 'Informe o município base da loja física')
    .min(2, 'O município deve ter no mínimo 2 caracteres')
    .max(100, 'O município deve ter no máximo 100 caracteres'),

  deliveryRadiusKm: z.coerce
    .number({
      message: 'Informe o raio de entrega em km',
    })
    .min(10, 'O raio de entrega deve ser de no mínimo 10 km')
    .max(500, 'O raio de entrega deve ser de no máximo 500 km'),

  categories: z
    .array(
      z.enum(SUPPORTED_CATEGORIES, {
        message: 'Categoria de insumo não suportada',
      })
    )
    .min(1, 'Selecione ao menos uma categoria de insumos comercializada'),
});

export type ResellerRegistrationInput = z.infer<typeof resellerRegistrationSchema>;

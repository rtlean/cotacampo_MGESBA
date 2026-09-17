import { z } from 'zod';

export const SUPPORTED_STATES = ['MG', 'ES', 'BA'] as const;
export const SUPPORTED_CROPS = ['cafe', 'cacau', 'pimenta', 'mamao'] as const;

export const producerRegistrationSchema = z.object({
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
    .array(z.enum(SUPPORTED_CROPS, {
      message: 'Cultura agrícola não suportada',
    }))
    .min(1, 'Selecione ao menos uma cultura atendida (Café, Cacau, Pimenta-do-reino ou Mamão)'),
});

export type ProducerRegistrationInput = z.infer<typeof producerRegistrationSchema>;

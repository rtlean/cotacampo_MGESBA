import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const forgotPasswordSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Informe um e-mail válido ou número de WhatsApp com DDD.')
    .refine(
      (val) => {
        const trimmed = val.trim();
        if (!trimmed) return false;

        // Se contiver @, valida como e-mail
        if (trimmed.includes('@')) {
          return emailRegex.test(trimmed);
        }

        // Caso contrário, valida como telefone / WhatsApp (10 ou 11 dígitos numéricos com DDD)
        const digits = trimmed.replace(/\D/g, '');
        return digits.length === 10 || digits.length === 11;
      },
      {
        message: 'Informe um e-mail válido ou número de WhatsApp com DDD.',
      }
    ),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

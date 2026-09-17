import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    codeOrToken: z
      .string()
      .trim()
      .min(1, 'Informe o código de verificação ou token recebido')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(1, 'Informe a nova senha')
      .min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

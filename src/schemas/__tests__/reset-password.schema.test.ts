import { describe, it, expect } from 'vitest';
import { resetPasswordSchema } from '../reset-password.schema';

describe('resetPasswordSchema', () => {
  it('deve validar com sucesso quando nova senha e confirmação forem idênticas e atenderem ao mínimo de caracteres', () => {
    const validData = {
      password: 'NovaSenha@2026',
      confirmPassword: 'NovaSenha@2026',
    };
    const result = resetPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar senha com menos de 6 caracteres', () => {
    const invalidData = {
      password: '123',
      confirmPassword: '123',
    };
    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/mínimo 6 caracteres/i);
    }
  });

  it('deve rejeitar quando confirmação de senha for diferente da nova senha', () => {
    const invalidData = {
      password: 'NovaSenha@2026',
      confirmPassword: 'OutraSenha@9999',
    };
    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/as senhas não coincidem/i);
    }
  });

  it('deve rejeitar campos vazios', () => {
    const invalidData = {
      password: '',
      confirmPassword: '',
    };
    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { forgotPasswordSchema } from '../forgot-password.schema';

describe('forgotPasswordSchema', () => {
  it('deve validar com sucesso quando fornecido um e-mail válido', () => {
    const validData = { identifier: 'produtor@fazenda.com.br' };
    const result = forgotPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.identifier).toBe('produtor@fazenda.com.br');
    }
  });

  it('deve validar com sucesso quando fornecido um número de WhatsApp formatado', () => {
    const validData = { identifier: '(27) 99876-5432' };
    const result = forgotPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('deve validar com sucesso quando fornecido um número com apenas dígitos (10 ou 11 dígitos com DDD)', () => {
    const validData = { identifier: '27998765432' };
    const result = forgotPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar identificador vazio', () => {
    const invalidData = { identifier: '' };
    const result = forgotPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/informe um e-mail válido ou número de whatsapp/i);
    }
  });

  it('deve rejeitar identificador que contenha apenas espaços', () => {
    const invalidData = { identifier: '   ' };
    const result = forgotPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/informe um e-mail válido ou número de whatsapp/i);
    }
  });

  it('deve rejeitar valor que não seja nem e-mail nem telefone válido', () => {
    const invalidData = { identifier: 'palavra_aleatoria_invalida' };
    const result = forgotPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/informe um e-mail válido ou número de whatsapp/i);
    }
  });

  it('deve rejeitar telefone com número insuficiente de dígitos (ex: 5 dígitos)', () => {
    const invalidData = { identifier: '12345' };
    const result = forgotPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

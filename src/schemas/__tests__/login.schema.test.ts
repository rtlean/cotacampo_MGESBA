import { describe, it, expect } from 'vitest';
import { loginSchema } from '../login.schema';

describe('loginSchema (Zod Schema Validation)', () => {
  describe('Caminho Feliz (Sucesso)', () => {
    it('deve validar com sucesso credenciais com e-mail e senha', () => {
      const result = loginSchema.safeParse({
        identifier: 'produtor@fazenda.com.br',
        password: 'SenhaForte@2026',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.identifier).toBe('produtor@fazenda.com.br');
        expect(result.data.password).toBe('SenhaForte@2026');
      }
    });

    it('deve aceitar telefone/whatsapp como identificador', () => {
      const result = loginSchema.safeParse({
        identifier: '(27) 99888-7766',
        password: 'SenhaForte@2026',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.identifier).toBe('(27) 99888-7766');
      }
    });

    it('deve aceitar CNPJ como identificador', () => {
      const result = loginSchema.safeParse({
        identifier: '11.222.333/0001-81',
        password: 'SenhaRevenda@2026',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.identifier).toBe('11.222.333/0001-81');
      }
    });

    it('deve aplicar trim no identificador removendo espaços laterais', () => {
      const result = loginSchema.safeParse({
        identifier: '   usuario@email.com   ',
        password: 'senha123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.identifier).toBe('usuario@email.com');
      }
    });
  });

  describe('Casos de Borda e Erros de Validação', () => {
    it('deve rejeitar identificador vazio ou apenas espaços', () => {
      const result = loginSchema.safeParse({
        identifier: '   ',
        password: 'senha123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.identifier?.[0]).toMatch(
          /Informe seu e-mail ou telefone/i
        );
      }
    });

    it('deve rejeitar senha vazia', () => {
      const result = loginSchema.safeParse({
        identifier: 'usuario@email.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password?.[0]).toMatch(
          /Informe sua senha de acesso/i
        );
      }
    });
  });
});

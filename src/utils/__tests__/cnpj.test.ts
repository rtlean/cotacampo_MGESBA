import { describe, it, expect } from 'vitest';
import { validateCNPJ, formatCNPJ, cleanCNPJ } from '../cnpj';

describe('CNPJ Utilities (Validação e Formatação de CNPJ)', () => {
  describe('validateCNPJ', () => {
    it('deve validar com sucesso CNPJs reais e válidos com formatação', () => {
      // CNPJs válidos matematicamente segundo o algoritmo oficial da Receita Federal
      const validCnpjs = [
        '11.222.333/0001-81',
        '04.252.011/0001-10',
        '33.000.167/0001-01',
      ];
      for (const cnpj of validCnpjs) {
        expect(validateCNPJ(cnpj)).toBe(true);
      }
    });

    it('deve validar com sucesso CNPJs válidos sem formatação (apenas dígitos)', () => {
      expect(validateCNPJ('11222333000181')).toBe(true);
      expect(validateCNPJ('04252011000110')).toBe(true);
    });

    it('deve rejeitar CNPJ com dígitos verificadores incorretos', () => {
      expect(validateCNPJ('11.222.333/0001-99')).toBe(false);
      expect(validateCNPJ('04.252.011/0001-11')).toBe(false);
    });

    it('deve rejeitar sequências de dígitos repetidos conhecidas', () => {
      const repeated = [
        '00.000.000/0000-00',
        '11.111.111/1111-11',
        '22.222.222/2222-22',
        '99.999.999/9999-99',
      ];
      for (const cnpj of repeated) {
        expect(validateCNPJ(cnpj)).toBe(false);
      }
    });

    it('deve rejeitar CNPJs com menos ou mais de 14 dígitos', () => {
      expect(validateCNPJ('112223330001')).toBe(false);
      expect(validateCNPJ('1122233300018199')).toBe(false);
      expect(validateCNPJ('')).toBe(false);
    });
  });

  describe('formatCNPJ', () => {
    it('deve formatar gradualmente o CNPJ conforme o usuário digita', () => {
      expect(formatCNPJ('11')).toBe('11');
      expect(formatCNPJ('11222')).toBe('11.222');
      expect(formatCNPJ('11222333')).toBe('11.222.333');
      expect(formatCNPJ('112223330001')).toBe('11.222.333/0001');
      expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
    });

    it('deve limitar a formatação ao máximo de 14 dígitos numéricos', () => {
      expect(formatCNPJ('112223330001819999')).toBe('11.222.333/0001-81');
    });
  });

  describe('cleanCNPJ', () => {
    it('deve extrair apenas os dígitos numéricos da string', () => {
      expect(cleanCNPJ('11.222.333/0001-81')).toBe('11222333000181');
      expect(cleanCNPJ('ABC 11-222/333')).toBe('11222333');
    });
  });
});

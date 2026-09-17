import { describe, it, expect } from 'vitest';
import { resellerRegistrationSchema } from '../reseller.schema';

describe('resellerRegistrationSchema (Zod Schema Validation)', () => {
  const validResellerPayload = {
    role: 'RESELLER',
    razaoSocial: 'AgroVila Insumos Agrícolas Ltda',
    nomeFantasia: 'AgroVila Linhares',
    cnpj: '11.222.333/0001-81',
    corporateEmail: 'contato@agrovilainsumos.com.br',
    whatsapp: '(27) 99888-7766',
    password: 'SenhaRevenda@2026',
    state: 'ES',
    city: 'Linhares',
    deliveryRadiusKm: 100,
    categories: ['defensivos', 'fertilizantes', 'foliares'],
  };

  describe('Caminho Feliz (Sucesso)', () => {
    it('deve validar com sucesso um payload completo e válido de Revenda PJ', () => {
      const result = resellerRegistrationSchema.safeParse(validResellerPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('RESELLER');
        expect(result.data.razaoSocial).toBe('AgroVila Insumos Agrícolas Ltda');
        expect(result.data.deliveryRadiusKm).toBe(100);
        expect(result.data.categories).toContain('defensivos');
      }
    });

    it('deve aceitar estados de cobertura permitidos (MG, ES, BA)', () => {
      for (const st of ['MG', 'ES', 'BA'] as const) {
        const result = resellerRegistrationSchema.safeParse({
          ...validResellerPayload,
          state: st,
        });
        expect(result.success).toBe(true);
      }
    });

    it('deve aceitar raio de entrega numérico entre 10 e 500 km', () => {
      for (const radius of [10, 50, 100, 250, 500]) {
        const result = resellerRegistrationSchema.safeParse({
          ...validResellerPayload,
          deliveryRadiusKm: radius,
        });
        expect(result.success).toBe(true);
      }
    });

    it('deve aceitar qualquer combinação válida das 5 categorias de insumos', () => {
      const result = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        categories: [
          'defensivos',
          'fertilizantes',
          'foliares',
          'biologicos',
          'corretivos',
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Casos de Borda e Erros de Validação', () => {
    it('deve rejeitar Razão Social vazia ou curta', () => {
      const result = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        razaoSocial: 'A',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.razaoSocial?.[0]).toBeDefined();
      }
    });

    it('deve rejeitar Nome Fantasia vazio', () => {
      const result = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        nomeFantasia: '   ',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.nomeFantasia?.[0]).toBeDefined();
      }
    });

    it('deve rejeitar CNPJ inválido ou com dígitos verificadores incorretos', () => {
      const invalidCnpjs = ['11.222.333/0001-99', '11111111111111', '12345'];
      for (const cnpj of invalidCnpjs) {
        const result = resellerRegistrationSchema.safeParse({
          ...validResellerPayload,
          cnpj,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.cnpj?.[0]).toMatch(/CNPJ inválido/i);
        }
      }
    });

    it('deve rejeitar e-mail corporativo inválido', () => {
      const result = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        corporateEmail: 'invalid-email',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.corporateEmail?.[0]).toMatch(/e-mail inválido/i);
      }
    });

    it('deve rejeitar WhatsApp incompleto ou com DDD inválido', () => {
      const result = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        whatsapp: '27999',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.whatsapp?.[0]).toMatch(/WhatsApp inválido/i);
      }
    });

    it('deve rejeitar senha com menos de 6 caracteres', () => {
      const result = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        password: '123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password?.[0]).toMatch(/mínimo 6 caracteres/i);
      }
    });

    it('deve rejeitar estados fora de MG, ES e BA', () => {
      const result = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        state: 'SP',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.state?.[0]).toMatch(/MG, ES ou BA/i);
      }
    });

    it('deve rejeitar raio de entrega menor que 10 km ou maior que 500 km', () => {
      const resultShort = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        deliveryRadiusKm: 5,
      });
      expect(resultShort.success).toBe(false);

      const resultLong = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        deliveryRadiusKm: 600,
      });
      expect(resultLong.success).toBe(false);
    });

    it('deve rejeitar quando nenhuma categoria for selecionada (array vazio)', () => {
      const result = resellerRegistrationSchema.safeParse({
        ...validResellerPayload,
        categories: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.categories?.[0]).toMatch(/Selecione ao menos uma categoria/i);
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import { producerRegistrationSchema } from '../producer.schema';
import { SupportedState, CropId } from '../../types/user';

describe('producerRegistrationSchema (Zod Schema Validation)', () => {
  const validProducerPayload = {
    role: 'PRODUCER',
    fullName: 'Roberto da Silva Santos',
    email: 'roberto@fazenda.com.br',
    whatsapp: '(27) 99876-5432',
    password: 'SenhaSegura@2026',
    farmName: 'Fazenda Santa Rita',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe', 'pimenta'],
  };

  describe('Caminho Feliz (Sucesso)', () => {
    it('deve validar com sucesso um payload completo e válido', () => {
      const result = producerRegistrationSchema.safeParse(validProducerPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe('Roberto da Silva Santos');
        expect(result.data.state).toBe('ES');
        expect(result.data.crops).toEqual(['cafe', 'pimenta']);
      }
    });

    it('deve aceitar WhatsApp sem máscara se possuir 10 ou 11 dígitos válidos', () => {
      const payload = { ...validProducerPayload, whatsapp: '27998765432' };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve aceitar estados de cobertura permitidos (MG, ES, BA)', () => {
      for (const st of ['MG', 'ES', 'BA'] as const) {
        const payload = { ...validProducerPayload, state: st };
        const result = producerRegistrationSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it('deve aceitar qualquer combinação válida das 4 culturas atendidas', () => {
      const payload = {
        ...validProducerPayload,
        crops: ['cafe', 'cacau', 'pimenta', 'mamao'],
      };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Casos de Borda e Erros de Validação', () => {
    it('deve rejeitar nome completo vazio ou com apenas espaços', () => {
      const payload = { ...validProducerPayload, fullName: '   ' };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.fullName?.[0]).toMatch(/Informe seu nome completo/i);
      }
    });

    it('deve rejeitar nome sem sobrenome (apenas um token)', () => {
      const payload = { ...validProducerPayload, fullName: 'Roberto' };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.fullName?.[0]).toMatch(/Informe nome e sobrenome/i);
      }
    });

    it('deve rejeitar e-mail inválido', () => {
      const invalidEmails = ['invalid', 'roberto@', '@domain.com', 'roberto@domain'];
      for (const email of invalidEmails) {
        const payload = { ...validProducerPayload, email };
        const result = producerRegistrationSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.email?.[0]).toMatch(/e-mail inválido/i);
        }
      }
    });

    it('deve rejeitar WhatsApp com menos de 10 dígitos', () => {
      const payload = { ...validProducerPayload, whatsapp: '2799876' };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.whatsapp?.[0]).toMatch(/WhatsApp inválido/i);
      }
    });

    it('deve rejeitar WhatsApp com DDD inválido (ex: 00 ou 01)', () => {
      const payload = { ...validProducerPayload, whatsapp: '(00) 99876-5432' };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.whatsapp?.[0]).toMatch(/WhatsApp inválido/i);
      }
    });

    it('deve rejeitar senha com menos de 6 caracteres', () => {
      const payload = { ...validProducerPayload, password: '123' };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password?.[0]).toMatch(/mínimo 6 caracteres/i);
      }
    });

    it('deve rejeitar nome da fazenda vazio ou muito curto', () => {
      const payload = { ...validProducerPayload, farmName: 'F' };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.farmName?.[0]).toBeDefined();
      }
    });

    it('deve rejeitar estados fora da cobertura de MG, ES e BA', () => {
      const payload = { ...validProducerPayload, state: 'SP' as unknown as SupportedState };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.state?.[0]).toMatch(/MG, ES ou BA/i);
      }
    });

    it('deve rejeitar município vazio', () => {
      const payload = { ...validProducerPayload, city: '   ' };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.city?.[0]).toMatch(/Informe o município/i);
      }
    });

    it('deve rejeitar quando nenhuma cultura for selecionada (array vazio)', () => {
      const payload = { ...validProducerPayload, crops: [] };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.crops?.[0]).toMatch(/Selecione ao menos uma cultura/i);
      }
    });

    it('deve rejeitar culturas não suportadas', () => {
      const payload = { ...validProducerPayload, crops: ['soja'] as unknown as [CropId, ...CropId[]] };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});

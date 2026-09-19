import { describe, it, expect } from 'vitest';
import {
  producerRegistrationSchema,
  normalizeAreaInput,
  calculateCropScale,
} from '../producer.schema';
import { SupportedState, CropId } from '../../types/user';

describe('producerRegistrationSchema (Zod Schema Validation & US01.1)', () => {
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
    cropDimensions: {
      cafe: { area: '12' },
      pimenta: { area: '0.5', plantsCount: '800' },
    },
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

    it('deve aceitar qualquer combinação válida das culturas atendidas com dimensões', () => {
      const payload = {
        ...validProducerPayload,
        crops: ['cafe', 'cacau', 'pimenta', 'mamao'],
        cropDimensions: {
          cafe: { area: '12' },
          cacau: { area: '20' },
          pimenta: { area: '0.5' },
          mamao: { area: '15' },
        },
      };
      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Funções Auxiliares: normalizeAreaInput e calculateCropScale (US01.1)', () => {
    it('normalizeAreaInput deve converter vírgula para ponto e normalizar decimais', () => {
      expect(normalizeAreaInput('0,75')).toBe(0.75);
      expect(normalizeAreaInput('0.5')).toBe(0.5);
      expect(normalizeAreaInput('120')).toBe(120);
      expect(normalizeAreaInput(' 25,5 ')).toBe(25.5);
      expect(normalizeAreaInput(10.5)).toBe(10.5);
      expect(normalizeAreaInput(NaN)).toBe(0);
      expect(normalizeAreaInput('')).toBe(0);
      expect(normalizeAreaInput('   ')).toBe(0);
      expect(normalizeAreaInput(undefined)).toBe(0);
      expect(normalizeAreaInput(null)).toBe(0);
      expect(normalizeAreaInput('invalido')).toBe(0);
    });

    it('calculateCropScale deve categorizar a escala corretamente por área e plantas', () => {
      // Pequena escala (minifúndio / agricultura familiar <= 10 ha)
      expect(calculateCropScale(0.5)).toBe('PEQUENA');
      expect(calculateCropScale(0.75, 800)).toBe('PEQUENA');
      expect(calculateCropScale(10)).toBe('PEQUENA');
      expect(calculateCropScale(0, 800)).toBe('PEQUENA');

      // Média escala (> 10 ha e <= 50 ha)
      expect(calculateCropScale(25)).toBe('MEDIA');
      expect(calculateCropScale(50)).toBe('MEDIA');
      expect(calculateCropScale(5, 5000)).toBe('MEDIA');

      // Grande escala (> 50 ha ou > 20.000 plantas)
      expect(calculateCropScale(120)).toBe('GRANDE');
      expect(calculateCropScale(51)).toBe('GRANDE');
      expect(calculateCropScale(5, 25000)).toBe('GRANDE');
    });
  });

  describe('US01.1 - Cenários de Negócio de Dimensionamento por Cultura', () => {
    it('Cenário 1: Cadastro de área por grande ou médio produtor (Hectares inteiros ou múltiplos cultivos)', () => {
      const payload = {
        ...validProducerPayload,
        crops: ['cafe_conilon', 'mamao'],
        cropDimensions: {
          cafe_conilon: { area: '120' },
          mamao: { area: '25' },
        },
      };

      const result = producerRegistrationSchema.safeParse(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        const conilonArea = normalizeAreaInput(result.data.cropDimensions?.['cafe_conilon']?.area);
        const mamaoArea = normalizeAreaInput(result.data.cropDimensions?.['mamao']?.area);

        expect(conilonArea).toBe(120);
        expect(mamaoArea).toBe(25);
        expect(calculateCropScale(conilonArea)).toBe('GRANDE');
        expect(calculateCropScale(mamaoArea)).toBe('MEDIA');
      }
    });

    it('Cenário 2: Cadastro de pequeno produtor com área fracionada (0,75 ou 0.5 ha e 800 pés)', () => {
      // Teste com vírgula '0,75' e pés opcionais '800'
      const payload1 = {
        ...validProducerPayload,
        crops: ['pimenta'],
        cropDimensions: {
          pimenta: { area: '0,75', plantsCount: '800' },
        },
      };

      const result1 = producerRegistrationSchema.safeParse(payload1);
      expect(result1.success).toBe(true);
      if (result1.success) {
        const area = normalizeAreaInput(result1.data.cropDimensions?.['pimenta']?.area);
        expect(area).toBe(0.75);
        expect(calculateCropScale(area, 800)).toBe('PEQUENA');
      }

      // Teste com ponto '0.5'
      const payload2 = {
        ...validProducerPayload,
        crops: ['pimenta'],
        cropDimensions: {
          pimenta: { area: '0.5' },
        },
      };
      const result2 = producerRegistrationSchema.safeParse(payload2);
      expect(result2.success).toBe(true);
      if (result2.success) {
        const area = normalizeAreaInput(result2.data.cropDimensions?.['pimenta']?.area);
        expect(area).toBe(0.5);
        expect(calculateCropScale(area)).toBe('PEQUENA');
      }
    });

    it('Cenário 3: Validação de dados incompletos ou valores negativos/nulos em Cacau', () => {
      // Área vazia
      const emptyPayload = {
        ...validProducerPayload,
        crops: ['cacau'],
        cropDimensions: {
          cacau: { area: '', plantsCount: '' },
        },
      };

      const resEmpty = producerRegistrationSchema.safeParse(emptyPayload);
      expect(resEmpty.success).toBe(false);
      if (!resEmpty.success) {
        const issue = resEmpty.error.issues.find(
          (i) => i.path.includes('cacau') || i.path.includes('area')
        );
        expect(issue?.message).toBe(
          'Informe a área plantada válida para o cultivo de Cacau (mínimo de 0,1 ha ou 100 plantas)'
        );
      }

      // Valor zero ou negativo
      const zeroPayload = {
        ...validProducerPayload,
        crops: ['cacau'],
        cropDimensions: {
          cacau: { area: '0' },
        },
      };
      const resZero = producerRegistrationSchema.safeParse(zeroPayload);
      expect(resZero.success).toBe(false);
      if (!resZero.success) {
        expect(resZero.error.issues[0].message).toBe(
          'Informe a área plantada válida para o cultivo de Cacau (mínimo de 0,1 ha ou 100 plantas)'
        );
      }

      const negativePayload = {
        ...validProducerPayload,
        crops: ['cacau'],
        cropDimensions: {
          cacau: { area: '-2.5' },
        },
      };
      const resNeg = producerRegistrationSchema.safeParse(negativePayload);
      expect(resNeg.success).toBe(false);

      // Validação complementar: área 0 mas plantas >= 100 deve ser aceito
      const validPlantsPayload = {
        ...validProducerPayload,
        crops: ['cacau'],
        cropDimensions: {
          cacau: { area: '0', plantsCount: '150' },
        },
      };
      const resPlants = producerRegistrationSchema.safeParse(validPlantsPayload);
      expect(resPlants.success).toBe(true);
    });

    it('Cenário 4: Remoção dinâmica de cultura e expurgo de estado', () => {
      // Estado inicial com Cafe Arabica
      const initialPayload = {
        ...validProducerPayload,
        crops: ['cafe_arabica'],
        cropDimensions: {
          cafe_arabica: { area: '15' },
        },
      };
      expect(producerRegistrationSchema.safeParse(initialPayload).success).toBe(true);

      // Ao desmarcar Cafe Arabica e selecionar apenas Mamao
      const purgedPayload = {
        ...validProducerPayload,
        crops: ['mamao'],
        cropDimensions: {
          mamao: { area: '20' },
        },
      };
      // Note que 'cafe_arabica' foi purgado e não está nem em crops nem em cropDimensions
      const resultPurged = producerRegistrationSchema.safeParse(purgedPayload);
      expect(resultPurged.success).toBe(true);
      if (resultPurged.success) {
        expect(resultPurged.data.crops).toEqual(['mamao']);
        expect(resultPurged.data.cropDimensions?.['cafe_arabica']).toBeUndefined();
      }
    });

    it('deve rejeitar e exigir área quando cropDimensions for omitido (undefined)', () => {
      const payloadWithoutDim = {
        ...validProducerPayload,
        crops: ['cafe'],
        cropDimensions: undefined,
      };
      const res = producerRegistrationSchema.safeParse(payloadWithoutDim);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toMatch(/Informe a área plantada válida para o cultivo de Café/i);
      }
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

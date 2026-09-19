import { describe, it, expect, vi } from 'vitest';
import { copilotService } from '../copilot.service';

describe('CopilotService - Serviço Agronômico Especialista (US11.1)', () => {
  describe('Cenário 2: Cálculo de dosagem e justification regional (MG, ES, BA)', () => {
    it('deve calcular volume para defensivo líquido em 15 ha de café conilon no ES (45 Litros)', async () => {
      const result = await copilotService.calculateDosage({
        cropType: 'cafe_conilon',
        areaHectares: 15,
        plantCount: 3000,
        productOrActiveIngredient: 'Azoxistrobina 250 SC',
        state: 'ES',
      });

      expect(result.recommendedQuantity).toBe(45);
      expect(result.unit).toBe('Litros');
      expect(result.dosagePerHectare).toBe('3.0 L/ha');
      expect(result.justification).toContain('3.0 L/ha para 15 ha');
      expect(result.isLmrRestricted).toBe(false);
    });

    it('deve calcular volume para adubação NPK em 15 ha no MG (90 Sacas)', async () => {
      const result = await copilotService.calculateDosage({
        cropType: 'cafe_arabica',
        areaHectares: 15,
        productOrActiveIngredient: 'Adubo NPK 20-05-20',
        state: 'MG',
      });

      expect(result.recommendedQuantity).toBe(90);
      expect(result.unit).toBe('Sacas');
      expect(result.dosagePerHectare).toBe('6 Sc/ha');
      expect(result.isLmrRestricted).toBe(false);
    });

    it('deve calcular volume para defensivo em pó (Kg) em 10 ha de cacau na BA (25 Kg)', async () => {
      const result = await copilotService.calculateDosage({
        cropType: 'cacau',
        areaHectares: 10,
        productOrActiveIngredient: 'Oxicloreto de Cobre WP',
        state: 'BA',
      });

      expect(result.recommendedQuantity).toBe(25);
      expect(result.unit).toBe('Kg');
      expect(result.dosagePerHectare).toBe('2.5 Kg/ha');
      expect(result.isLmrRestricted).toBe(false);
    });

    it('deve calcular volume para calcário / corretivo em 20 ha (40 Toneladas)', async () => {
      const result = await copilotService.calculateDosage({
        cropType: 'cafe_conilon',
        areaHectares: 20,
        productOrActiveIngredient: 'Calcário Dolomítico',
        state: 'ES',
      });

      expect(result.recommendedQuantity).toBe(40);
      expect(result.unit).toBe('Toneladas');
      expect(result.dosagePerHectare).toBe('2 Ton/ha');
      expect(result.isLmrRestricted).toBe(false);
    });
  });

  describe('Cenário 3: Detecção de restrição fitossanitária para Mamão ou Pimenta', () => {
    it('deve ativar isLmrRestricted e gerar aviso e alternativas para Clorpirifós em Mamão', async () => {
      const result = await copilotService.calculateDosage({
        cropType: 'mamao',
        areaHectares: 5,
        productOrActiveIngredient: 'Clorpirifós 480 EC',
        state: 'ES',
      });

      expect(result.isLmrRestricted).toBe(true);
      expect(result.warningMessage).toContain('restrições severas de exportação para a cultura do Mamão');
      expect(result.warningMessage).toContain('Limite Máximo de Resíduo (LMR)');
      expect(result.suggestedAlternatives).toBeDefined();
      expect(result.suggestedAlternatives?.length).toBeGreaterThan(0);
      expect(result.suggestedAlternatives).toContain('Azoxistrobina 250 SC');
    });

    it('deve ativar isLmrRestricted para Mancozeb em Pimenta-do-reino', async () => {
      const result = await copilotService.calculateDosage({
        cropType: 'pimenta_reino',
        areaHectares: 3,
        productOrActiveIngredient: 'Mancozeb 750 WG',
        state: 'ES',
      });

      expect(result.isLmrRestricted).toBe(true);
      expect(result.warningMessage).toContain('restrições severas de exportação para a cultura do Pimenta-do-reino');
      expect(result.suggestedAlternatives).toBeDefined();
    });

    it('não deve marcar restrição de LMR para produto biológico registrado em Mamão', async () => {
      const result = await copilotService.calculateDosage({
        cropType: 'mamao',
        areaHectares: 5,
        productOrActiveIngredient: 'Bacillus subtilis',
        state: 'BA',
      });

      expect(result.isLmrRestricted).toBe(false);
      expect(result.warningMessage).toBeUndefined();
    });
  });

  describe('Injeção de System Prompt Regional (MG, ES, BA)', () => {
    it('deve gerar prompts específicos para cada estado foco', () => {
      const promptMG = copilotService.getRegionalSystemPrompt('MG', 'cafe_arabica');
      expect(promptMG).toContain('Minas Gerais');
      expect(promptMG).toContain('cafe_arabica');

      const promptES = copilotService.getRegionalSystemPrompt('ES', 'mamao');
      expect(promptES).toContain('Espírito Santo');
      expect(promptES).toContain('LMR para exportação');

      const promptBA = copilotService.getRegionalSystemPrompt('BA', 'cacau');
      expect(promptBA).toContain('Bahia');
      expect(promptBA).toContain('Cacau em cabruca');
    });
  });

  describe('Integração OpenAI (quando disponível)', () => {
    it('deve instanciar OpenAI no construtor se OPENAI_API_KEY válida for fornecida', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-proj-test1234567890';
      const CopilotConstructor = copilotService.constructor as new () => Record<string, unknown>;
      const svc = new CopilotConstructor();
      expect(svc.openai).toBeDefined();
      process.env.OPENAI_API_KEY = originalKey;
    });

    it('deve chamar chat.completions.create quando openai estiver instanciada fora do ambiente de teste', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendedQuantity: 30,
                unit: 'Litros',
                dosagePerHectare: '2.0 L/ha',
                justification: 'Gerado pela OpenAI',
                isLmrRestricted: false,
              }),
            },
          },
        ],
      });

      const CopilotConstructor = copilotService.constructor as new () => typeof copilotService & {
        openai: unknown;
      };
      const serviceWithMock = new CopilotConstructor();
      serviceWithMock.openai = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = await serviceWithMock.calculateDosage({
        cropType: 'cafe_conilon',
        areaHectares: 15,
        productOrActiveIngredient: 'Azoxistrobina 250 SC',
        state: 'ES',
      });

      expect(mockCreate).toHaveBeenCalled();
      expect(result.recommendedQuantity).toBe(30);
      expect(result.justification).toBe('Gerado pela OpenAI');

      // Teste com restrição fitossanitária passando pela OpenAI
      const resultRestricted = await serviceWithMock.calculateDosage({
        cropType: 'mamao',
        areaHectares: 10,
        productOrActiveIngredient: 'Clorpirifós 480 EC',
        state: 'ES',
      });
      expect(resultRestricted.isLmrRestricted).toBe(true);
      expect(resultRestricted.warningMessage).toContain('restrições severas');

      process.env.NODE_ENV = originalEnv;
    });

    it('deve recuperar com fallback determinístico caso a OpenAI lance erro', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('OpenAI API Error'));

      const CopilotConstructor = copilotService.constructor as new () => typeof copilotService & {
        openai: unknown;
      };
      const serviceWithMock = new CopilotConstructor();
      serviceWithMock.openai = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = await serviceWithMock.calculateDosage({
        cropType: 'cafe_conilon',
        areaHectares: 15,
        productOrActiveIngredient: 'Azoxistrobina 250 SC',
        state: 'ES',
      });

      expect(result.recommendedQuantity).toBe(45); // Retorno determinístico
      expect(result.unit).toBe('Litros');

      process.env.NODE_ENV = originalEnv;
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  cropCopilotInputSchema,
  cropCopilotOutputSchema,
  CropCopilotInput,
  CropCopilotOutput,
} from '../copilot';

describe('cropCopilotSchemas - Contratos Zod Compartilhados (US11.1)', () => {
  describe('cropCopilotInputSchema', () => {
    it('deve validar com sucesso um payload completo válido para MG, ES ou BA', () => {
      const validInput: CropCopilotInput = {
        cropType: 'cafe_conilon',
        areaHectares: 15,
        plantCount: 3000,
        productOrActiveIngredient: 'Azoxistrobina 250 SC',
        state: 'ES',
      };

      const parsed = cropCopilotInputSchema.safeParse(validInput);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.cropType).toBe('cafe_conilon');
        expect(parsed.data.areaHectares).toBe(15);
        expect(parsed.data.state).toBe('ES');
      }
    });

    it('deve permitir plantCount opcional', () => {
      const inputWithoutPlantCount = {
        cropType: 'cacau',
        areaHectares: 10.5,
        productOrActiveIngredient: 'Oxicloreto de Cobre',
        state: 'BA',
      };

      const parsed = cropCopilotInputSchema.safeParse(inputWithoutPlantCount);
      expect(parsed.success).toBe(true);
    });

    it('Cenário 4: deve rejeitar com erro de validação se areaHectares for menor ou igual a zero', () => {
      const zeroArea = {
        cropType: 'cafe_arabica',
        areaHectares: 0,
        productOrActiveIngredient: 'Adubo NPK 20-05-20',
        state: 'MG',
      };

      const parsedZero = cropCopilotInputSchema.safeParse(zeroArea);
      expect(parsedZero.success).toBe(false);
      if (!parsedZero.success) {
        const msg = parsedZero.error.issues[0]?.message;
        expect(msg).toBe('A área em hectares deve ser maior que zero');
      }

      const negativeArea = {
        ...zeroArea,
        areaHectares: -5,
      };
      const parsedNegative = cropCopilotInputSchema.safeParse(negativeArea);
      expect(parsedNegative.success).toBe(false);
    });

    it('Cenário 4: deve rejeitar cultura não suportada', () => {
      const invalidCrop = {
        cropType: 'soja',
        areaHectares: 20,
        productOrActiveIngredient: 'Fungicida',
        state: 'MG',
      };

      const parsed = cropCopilotInputSchema.safeParse(invalidCrop);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toContain('Cultura não suportada');
      }
    });

    it('deve rejeitar estados fora de MG, ES e BA', () => {
      const invalidState = {
        cropType: 'mamao',
        areaHectares: 5,
        productOrActiveIngredient: 'Biológico',
        state: 'SP',
      };

      const parsed = cropCopilotInputSchema.safeParse(invalidState);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toContain('Estado inválido');
      }
    });

    it('deve rejeitar produto ou princípio ativo com menos de 2 caracteres', () => {
      const shortProduct = {
        cropType: 'pimenta_reino',
        areaHectares: 2,
        productOrActiveIngredient: 'X',
        state: 'ES',
      };

      const parsed = cropCopilotInputSchema.safeParse(shortProduct);
      expect(parsed.success).toBe(false);
    });

    it('deve rejeitar plantCount negativo ou não inteiro', () => {
      const invalidPlant = {
        cropType: 'cafe_conilon',
        areaHectares: 10,
        plantCount: -100,
        productOrActiveIngredient: 'Adubo NPK',
        state: 'ES',
      };
      expect(cropCopilotInputSchema.safeParse(invalidPlant).success).toBe(false);

      const floatPlant = {
        ...invalidPlant,
        plantCount: 15.5,
      };
      expect(cropCopilotInputSchema.safeParse(floatPlant).success).toBe(false);
    });
  });

  describe('cropCopilotOutputSchema', () => {
    it('deve validar com sucesso a saída estruturada completa', () => {
      const validOutput: CropCopilotOutput = {
        recommendedQuantity: 45,
        unit: 'Litros',
        dosagePerHectare: '3.0 L/ha',
        justification: 'Dose recomendada de 3.0 L/ha para 15 ha com aplicação tratorada/fertirrigação',
        isLmrRestricted: false,
        warningMessage: undefined,
        suggestedAlternatives: undefined,
      };

      const parsed = cropCopilotOutputSchema.safeParse(validOutput);
      expect(parsed.success).toBe(true);
    });

    it('deve validar saída com restrição de LMR e alternativas fitossanitárias (Cenário 3)', () => {
      const restrictedOutput: CropCopilotOutput = {
        recommendedQuantity: 15,
        unit: 'Litros',
        dosagePerHectare: '1.5 L/ha',
        justification: 'Aplicação padrão MAPA, porém com restrição de exportação',
        isLmrRestricted: true,
        warningMessage: 'Atenção: Este princípio ativo possui restrições severas de exportação para a cultura do Mamão.',
        suggestedAlternatives: ['Azoxistrobina 250 SC', 'Bacillus subtilis'],
      };

      const parsed = cropCopilotOutputSchema.safeParse(restrictedOutput);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.isLmrRestricted).toBe(true);
        expect(parsed.data.warningMessage).toContain('restrições severas de exportação');
        expect(parsed.data.suggestedAlternatives?.length).toBe(2);
      }
    });

    it('deve rejeitar quantidade recomendada menor ou igual a zero', () => {
      const invalidQuantity = {
        recommendedQuantity: -10,
        unit: 'Litros',
        dosagePerHectare: '1 L/ha',
        justification: 'Inválido',
        isLmrRestricted: false,
      };

      expect(cropCopilotOutputSchema.safeParse(invalidQuantity).success).toBe(false);
    });

    it('deve rejeitar unidade não permitida', () => {
      const invalidUnit = {
        recommendedQuantity: 10,
        unit: 'Metros',
        dosagePerHectare: '1 m/ha',
        justification: 'Inválido',
        isLmrRestricted: false,
      };

      expect(cropCopilotOutputSchema.safeParse(invalidUnit).success).toBe(false);
    });
  });
});

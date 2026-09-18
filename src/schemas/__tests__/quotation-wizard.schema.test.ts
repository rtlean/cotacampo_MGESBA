import { describe, it, expect } from 'vitest';
import { step1DestinationSchema, targetCropEnum } from '../quotation-wizard.schema';

describe('quotation-wizard.schema (US06 Passo 1)', () => {
  it('deve validar com sucesso quando a propriedade e a cultura forem válidas', () => {
    const validCrops = ['cafe_conilon', 'cafe_arabica', 'cacau', 'pimenta_reino', 'mamao'] as const;

    validCrops.forEach((crop) => {
      const result = step1DestinationSchema.safeParse({
        farmId: 'farm-123',
        targetCrop: crop,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.farmId).toBe('farm-123');
        expect(result.data.targetCrop).toBe(crop);
      }
    });
  });

  it('deve reprovar quando a propriedade não for informada ou for vazia', () => {
    const missingFarm = step1DestinationSchema.safeParse({
      farmId: '',
      targetCrop: 'cafe_conilon',
    });

    expect(missingFarm.success).toBe(false);
    if (!missingFarm.success) {
      expect(missingFarm.error.flatten().fieldErrors.farmId).toContain(
        'Selecione a propriedade de destino'
      );
    }

    const undefinedFarm = step1DestinationSchema.safeParse({
      targetCrop: 'cafe_conilon',
    });

    expect(undefinedFarm.success).toBe(false);
    if (!undefinedFarm.success) {
      expect(undefinedFarm.error.flatten().fieldErrors.farmId).toContain(
        'Selecione a propriedade de destino'
      );
    }
  });

  it('deve reprovar quando a cultura atendida não for informada ou for inválida', () => {
    const missingCrop = step1DestinationSchema.safeParse({
      farmId: 'farm-123',
      targetCrop: '',
    });

    expect(missingCrop.success).toBe(false);
    if (!missingCrop.success) {
      expect(missingCrop.error.flatten().fieldErrors.targetCrop).toContain(
        'Selecione a cultura atendida'
      );
    }

    const invalidCrop = step1DestinationSchema.safeParse({
      farmId: 'farm-123',
      targetCrop: 'soja',
    });

    expect(invalidCrop.success).toBe(false);
    if (!invalidCrop.success) {
      expect(invalidCrop.error.flatten().fieldErrors.targetCrop).toContain(
        'Selecione a cultura atendida'
      );
    }
  });

  it('deve validar targetCropEnum isoladamente', () => {
    expect(targetCropEnum.safeParse('cafe_conilon').success).toBe(true);
    expect(targetCropEnum.safeParse('cacau').success).toBe(true);
    const fail = targetCropEnum.safeParse('milho');
    expect(fail.success).toBe(false);
    if (!fail.success) {
      expect(fail.error.issues[0].message).toBe('Selecione a cultura atendida');
    }
  });
});

import { describe, it, expect } from 'vitest';
import { createPlotSchema, plotSchema, CreatePlotInput } from '../plots';

describe('plotsSchemas - Contratos Zod de Talhões (US11.1)', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  it('deve validar criação de talhão com todos os campos válidos', () => {
    const input: CreatePlotInput = {
      farmId: validUuid,
      cropType: 'cafe_conilon',
      areaHectares: 25.5,
      plantCount: 5000,
      spacing: '3m x 1m',
    };

    const parsed = createPlotSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cropType).toBe('cafe_conilon');
      expect(parsed.data.areaHectares).toBe(25.5);
    }
  });

  it('deve validar talhão sem campos opcionais (plantCount e spacing)', () => {
    const input = {
      farmId: validUuid,
      cropType: 'cacau',
      areaHectares: 10,
    };

    const parsed = createPlotSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('deve rejeitar se farmId não for um UUID válido', () => {
    const input = {
      farmId: 'invalid-id',
      cropType: 'mamao',
      areaHectares: 5,
    };

    const parsed = createPlotSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('deve rejeitar se areaHectares for menor ou igual a zero', () => {
    const input = {
      farmId: validUuid,
      cropType: 'pimenta_reino',
      areaHectares: 0,
    };

    expect(createPlotSchema.safeParse(input).success).toBe(false);

    const negativeInput = {
      ...input,
      areaHectares: -12,
    };
    expect(createPlotSchema.safeParse(negativeInput).success).toBe(false);
  });

  it('deve rejeitar tipo de cultura desconhecido', () => {
    const input = {
      farmId: validUuid,
      cropType: 'milho',
      areaHectares: 10,
    };

    const parsed = createPlotSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('deve validar plotSchema estendido com id, createdAt e updatedAt', () => {
    const fullPlot = {
      id: validUuid,
      farmId: validUuid,
      cropType: 'cafe_arabica',
      areaHectares: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = plotSchema.safeParse(fullPlot);
    expect(parsed.success).toBe(true);
  });
});

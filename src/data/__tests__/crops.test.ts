import { describe, it, expect } from 'vitest';
import { CROPS, getCropName } from '../crops';

describe('crops.ts (US01.1 Domínio e Nomes das Culturas)', () => {
  it('deve exportar a lista de culturas suportadas com propriedades completas', () => {
    expect(CROPS.length).toBe(5);
    const ids = CROPS.map((c) => c.id);
    expect(ids).toContain('cafe_conilon');
    expect(ids).toContain('cafe_arabica');
    expect(ids).toContain('cacau');
    expect(ids).toContain('pimenta');
    expect(ids).toContain('mamao');

    for (const crop of CROPS) {
      expect(crop.name).toBeTruthy();
      expect(crop.subtitle).toBeTruthy();
      expect(crop.icon).toBeTruthy();
      expect(crop.color).toBeTruthy();
      expect(crop.badgeBg).toBeTruthy();
      expect(crop.borderColor).toBeTruthy();
    }
  });

  it('getCropName deve retornar os nomes amigáveis em português para cada CropId', () => {
    expect(getCropName('cafe_conilon')).toBe('Café Conilon');
    expect(getCropName('cafe_arabica')).toBe('Café Arábica');
    expect(getCropName('cafe')).toBe('Café');
    expect(getCropName('cacau')).toBe('Cacau');
    expect(getCropName('pimenta')).toBe('Pimenta-do-reino');
    expect(getCropName('pimenta_reino')).toBe('Pimenta-do-reino');
    expect(getCropName('mamao')).toBe('Mamão');
    expect(getCropName('outra_cultura')).toBe('outra_cultura');
  });
});

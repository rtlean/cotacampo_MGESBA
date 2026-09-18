import { describe, it, expect } from 'vitest';
import { CATALOG_PRODUCTS, searchCatalogProducts } from '../products';

describe('products.ts (US07 Catálogo e Busca Preditiva)', () => {
  it('deve listar catálogo de produtos com campos obrigatórios', () => {
    expect(CATALOG_PRODUCTS.length).toBeGreaterThan(5);
    const mancozeb = CATALOG_PRODUCTS.find((p) => p.name === 'Mancozeb 750 WG');
    expect(mancozeb).toBeDefined();
    expect(mancozeb?.activeIngredient).toBe('Mancozebe');
    expect(mancozeb?.defaultUnit).toBe('Kg');
  });

  it('deve realizar busca preditiva por nome comercial ou princípio ativo', () => {
    const resultsName = searchCatalogProducts('Mancozeb');
    expect(resultsName.length).toBeGreaterThanOrEqual(1);
    expect(resultsName[0].name).toContain('Mancozeb');

    const resultsActive = searchCatalogProducts('glifosato');
    expect(resultsActive.length).toBeGreaterThanOrEqual(1);
    expect(resultsActive[0].name).toContain('Glifosato');

    const emptySearch = searchCatalogProducts('');
    expect(emptySearch).toEqual([]);

    const whitespaceSearch = searchCatalogProducts('   ');
    expect(whitespaceSearch).toEqual([]);

    const notFound = searchCatalogProducts('produto-inexistente-xyz');
    expect(notFound).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import {
  packageItemInputSchema,
  createPackageFromQuoteInputSchema,
  listMyPackagesInputSchema,
  getPackageItemsInputSchema,
} from '../packages';

describe('US17 - Schemas de Pacotes Tecnológicos', () => {
  describe('packageItemInputSchema', () => {
    it('deve validar um item de pacote válido', () => {
      const validItem = {
        productName: 'Mancozeb 750 WG',
        quantity: 50,
        unit: 'kg',
        acceptsGeneric: true,
      };
      const parsed = packageItemInputSchema.safeParse(validItem);
      expect(parsed.success).toBe(true);
    });

    it('deve rejeitar item com quantidade menor ou igual a zero', () => {
      const invalidItem = {
        productName: 'Glifosato',
        quantity: 0,
        unit: 'L',
      };
      const parsed = packageItemInputSchema.safeParse(invalidItem);
      expect(parsed.success).toBe(false);
    });

    it('deve aplicar acceptsGeneric como true por padrão', () => {
      const itemWithoutGeneric = {
        productName: 'NPK 04-14-08',
        quantity: 100,
        unit: 'saco 50kg',
      };
      const parsed = packageItemInputSchema.safeParse(itemWithoutGeneric);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.acceptsGeneric).toBe(true);
      }
    });
  });

  describe('createPackageFromQuoteInputSchema', () => {
    it('deve validar criação de pacote válida', () => {
      const payload = {
        producerId: 'prod_123',
        name: 'Adubação de Florada - Café',
        cropType: 'Café Conilon',
        quoteId: 'quote_abc',
        items: [
          { productName: 'NPK 20-00-20', quantity: 200, unit: 'saco 50kg', acceptsGeneric: true },
          { productName: 'Boro Líquido', quantity: 20, unit: 'L', acceptsGeneric: false },
        ],
      };
      const parsed = createPackageFromQuoteInputSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('deve rejeitar pacote com nome com menos de 3 caracteres', () => {
      const payload = {
        producerId: 'prod_123',
        name: 'Ab',
        cropType: 'Café',
        items: [{ productName: 'NPK', quantity: 10, unit: 'kg' }],
      };
      const parsed = createPackageFromQuoteInputSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });

    it('deve rejeitar pacote sem itens', () => {
      const payload = {
        producerId: 'prod_123',
        name: 'Pacote Vazio',
        cropType: 'Café',
        items: [],
      };
      const parsed = createPackageFromQuoteInputSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe('listMyPackagesInputSchema & getPackageItemsInputSchema', () => {
    it('deve validar listagem por producerId', () => {
      const parsed = listMyPackagesInputSchema.safeParse({ producerId: 'prod_123' });
      expect(parsed.success).toBe(true);
    });

    it('deve rejeitar listagem com producerId vazio', () => {
      const parsed = listMyPackagesInputSchema.safeParse({ producerId: '' });
      expect(parsed.success).toBe(false);
    });

    it('deve validar busca de itens por packageId', () => {
      const parsed = getPackageItemsInputSchema.safeParse({ packageId: 'pkg_999' });
      expect(parsed.success).toBe(true);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { appRouter } from '../_app';
import { packageService } from '../../../services/package.service';

describe('packagesRouter - Procedures tRPC de Pacotes Tecnológicos (US17)', () => {
  const caller = appRouter.createCaller({});

  beforeEach(() => {
    localStorage.clear();
  });

  describe('createFromQuote', () => {
    it('deve criar um pacote com itens a partir de uma cotação com sucesso', async () => {
      const result = await caller.packages.createFromQuote({
        producerId: 'prod_100',
        name: 'Tratamento de Inverno - Café',
        cropType: 'Café Conilon',
        quoteId: 'quote_win_1',
        items: [
          { productName: 'Fungicida Cúprico', quantity: 60, unit: 'Kg', acceptsGeneric: true },
          { productName: 'Adjuvante Siliconado', quantity: 15, unit: 'Litros', acceptsGeneric: false },
        ],
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Tratamento de Inverno - Café');
      expect(result.cropType).toBe('Café Conilon');
      expect(result.itemsCount).toBe(2);
      expect(result.items?.[0].productName).toBe('Fungicida Cúprico');
      expect(result.items?.[1].acceptsGeneric).toBe(false);
    });

    it('deve rejeitar payload inválido via validação Zod', async () => {
      await expect(
        caller.packages.createFromQuote({
          producerId: 'prod_100',
          name: 'Oi', // menor que 3 caracteres
          cropType: 'Café',
          items: [],
        })
      ).rejects.toThrow();
    });
  });

  describe('listMyPackages', () => {
    it('deve listar os pacotes pertencentes ao produtor informado', async () => {
      await caller.packages.createFromQuote({
        producerId: 'prod_list_test',
        name: 'Pacote Especial de Verão',
        cropType: 'Café Conilon',
        items: [{ productName: 'NPK', quantity: 10, unit: 'Saco 50kg', acceptsGeneric: true }],
      });

      const list = await caller.packages.listMyPackages({
        producerId: 'prod_list_test',
      });

      expect(list.length).toBeGreaterThanOrEqual(1);
      const created = list.find((p) => p.name === 'Pacote Especial de Verão');
      expect(created).toBeDefined();
      expect(created?.cropType).toBe('Café Conilon');
    });
  });

  describe('getPackageItems', () => {
    it('deve retornar os itens e metadados de um pacote existente', async () => {
      const created = await packageService.createPackageFromQuote({
        producerId: 'prod_items_test',
        name: 'Pacote para Busca de Itens',
        cropType: 'Pimenta-do-reino',
        items: [
          { productName: 'Adubo Foliar', quantity: 30, unit: 'Litros', acceptsGeneric: true },
          { productName: 'Inseticida Sistêmico', quantity: 12, unit: 'Litros', acceptsGeneric: true },
        ],
      });

      const result = await caller.packages.getPackageItems({
        packageId: created.id,
      });

      expect(result.package.id).toBe(created.id);
      expect(result.package.name).toBe('Pacote para Busca de Itens');
      expect(result.items.length).toBe(2);
      expect(result.items[0].productName).toBe('Adubo Foliar');
    });

    it('deve lançar TRPCError NOT_FOUND para ID inexistente', async () => {
      await expect(
        caller.packages.getPackageItems({
          packageId: 'pacote_fantasma_404',
        })
      ).rejects.toThrow(/não encontrado/);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { packageService, DEFAULT_MOCK_PACKAGES } from '../package.service';

describe('US17 - packageService (Serviço de Pacotes Tecnológicos)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve listar pacotes padrão na inicialização vazia', async () => {
    const list = await packageService.listMyPackages('produtor_demo_1');
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].name).toBe(DEFAULT_MOCK_PACKAGES[0].name);
  });

  it('deve criar um pacote a partir de uma cotação e persistir corretamente', async () => {
    const newPkg = await packageService.createPackageFromQuote({
      producerId: 'prod_custom_99',
      name: 'Adubação de Cobertura - Café Conilon',
      cropType: 'Café Conilon',
      quoteId: 'quote_123',
      items: [
        { productName: 'Ureia Agrícola', quantity: 150, unit: 'Saco 50kg', acceptsGeneric: true },
        { productName: 'Cloreto de Potássio', quantity: 100, unit: 'Saco 50kg', acceptsGeneric: false },
      ],
    });

    expect(newPkg.id).toBeDefined();
    expect(newPkg.name).toBe('Adubação de Cobertura - Café Conilon');
    expect(newPkg.itemsCount).toBe(2);
    expect(newPkg.items?.[0].productName).toBe('Ureia Agrícola');

    // Recupera pelo ID
    const retrieved = await packageService.getPackageById(newPkg.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Adubação de Cobertura - Café Conilon');
  });

  it('deve retornar null ao buscar pacote com ID inexistente', async () => {
    const notFound = await packageService.getPackageById('pkg_inexistente_999');
    expect(notFound).toBeNull();
  });

  it('deve permitir excluir um pacote pelo ID', async () => {
    const pkg = await packageService.createPackageFromQuote({
      producerId: 'prod_test',
      name: 'Pacote Temporário',
      cropType: 'Cacau',
      items: [{ productName: 'Fungicida Cúprico', quantity: 10, unit: 'Kg', acceptsGeneric: true }],
    });

    const deleted = await packageService.deletePackage(pkg.id);
    expect(deleted).toBe(true);

    const check = await packageService.getPackageById(pkg.id);
    expect(check).toBeNull();
  });
});

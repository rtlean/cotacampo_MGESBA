import {
  CreatePackageFromQuoteInput,
  TechnologicalPackageDTO,
} from '../shared/schemas/packages';
import { supabase, isSupabaseConfigured } from './supabase';

const PACKAGES_STORAGE_KEY = 'cotacampo_technological_packages';

export const DEFAULT_MOCK_PACKAGES: TechnologicalPackageDTO[] = [
  {
    id: 'pkg_florada_cafe',
    producerId: 'produtor_demo_1',
    name: 'Adubação de Florada - Café Conilon',
    cropType: 'Café Conilon',
    quoteId: 'quote_demo_1',
    itemsCount: 3,
    items: [
      { productName: 'NPK 20-00-20', quantity: 200, unit: 'Saco 50kg', acceptsGeneric: true },
      { productName: 'Boro Líquido 10%', quantity: 25, unit: 'Litros', acceptsGeneric: true },
      { productName: 'Sulfato de Zinco', quantity: 50, unit: 'Kg', acceptsGeneric: false },
    ],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'pkg_preventiva_pimenta',
    producerId: 'produtor_demo_1',
    name: 'Pulverização Preventiva - Pimenta-do-reino',
    cropType: 'Pimenta-do-reino',
    quoteId: 'quote_demo_2',
    itemsCount: 3,
    items: [
      { productName: 'Mancozeb 750 WG', quantity: 40, unit: 'Kg', acceptsGeneric: true },
      { productName: 'Cobre Oxicloreto', quantity: 30, unit: 'Kg', acceptsGeneric: true },
      { productName: 'Óleo Mineral Adjuvante', quantity: 20, unit: 'Litros', acceptsGeneric: true },
    ],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export const packageService = {
  /**
   * Obtém a lista local de pacotes armazenados
   */
  getLocalPackages(): TechnologicalPackageDTO[] {
    if (typeof window === 'undefined') return [...DEFAULT_MOCK_PACKAGES];
    try {
      const stored = localStorage.getItem(PACKAGES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Se não houver nada salvo, inicializa com os mocks padrão
      localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_PACKAGES));
      return [...DEFAULT_MOCK_PACKAGES];
    } catch (e) {
      console.error('Erro ao ler pacotes do localStorage:', e);
      return [...DEFAULT_MOCK_PACKAGES];
    }
  },

  /**
   * Salva a lista de pacotes no localStorage
   */
  saveLocalPackages(packages: TechnologicalPackageDTO[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(packages));
    } catch (e) {
      console.error('Erro ao salvar pacotes no localStorage:', e);
    }
  },

  /**
   * Salva uma cotação/lista como Pacote Tecnológico (US17)
   */
  async createPackageFromQuote(
    params: CreatePackageFromQuoteInput
  ): Promise<TechnologicalPackageDTO> {
    const list = this.getLocalPackages();
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `pkg_${Date.now()}`;

    const newPackage: TechnologicalPackageDTO = {
      id,
      producerId: params.producerId,
      name: params.name.trim(),
      cropType: params.cropType.trim(),
      quoteId: params.quoteId,
      itemsCount: params.items.length,
      items: params.items.map((item) => ({
        productName: item.productName.trim(),
        quantity: item.quantity,
        unit: item.unit.trim(),
        acceptsGeneric: item.acceptsGeneric ?? true,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newPackage);
    this.saveLocalPackages(list);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('technological_packages').insert({
          id: newPackage.id,
          producer_id: newPackage.producerId,
          name: newPackage.name,
          crop_type: newPackage.cropType,
        });

        if (newPackage.items && newPackage.items.length > 0) {
          const itemsPayload = newPackage.items.map((it) => ({
            package_id: newPackage.id,
            product_name: it.productName,
            quantity: it.quantity,
            unit: it.unit,
            accepts_generic: it.acceptsGeneric,
          }));
          await supabase.from('package_items').insert(itemsPayload);
        }
      } catch (err) {
        console.warn('[packageService] Erro ao sincronizar com Supabase:', err);
      }
    }

    return newPackage;
  },

  /**
   * Lista todos os pacotes do produtor
   */
  async listMyPackages(producerId: string): Promise<TechnologicalPackageDTO[]> {
    const local = this.getLocalPackages();
    // Filtra pelo produtor ou inclui os mocks para demonstração caso o ID coincida
    const filtered = local.filter(
      (pkg) => pkg.producerId === producerId || pkg.producerId === 'produtor_demo_1'
    );
    return filtered;
  },

  /**
   * Obtém os detalhes e itens de um pacote por ID
   */
  async getPackageById(packageId: string): Promise<TechnologicalPackageDTO | null> {
    const list = this.getLocalPackages();
    const found = list.find((p) => p.id === packageId);
    return found || null;
  },

  /**
   * Exclui um pacote por ID
   */
  async deletePackage(packageId: string): Promise<boolean> {
    const list = this.getLocalPackages();
    const filtered = list.filter((p) => p.id !== packageId);
    this.saveLocalPackages(filtered);
    return true;
  },
};

export interface CatalogProduct {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  defaultUnit: string;
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'prod-mancozeb',
    name: 'Mancozeb 750 WG',
    activeIngredient: 'Mancozebe',
    category: 'Defensivos',
    defaultUnit: 'Kg',
  },
  {
    id: 'prod-glifosato',
    name: 'Glifosato 480 SL',
    activeIngredient: 'Glifosato',
    category: 'Defensivos',
    defaultUnit: 'L',
  },
  {
    id: 'prod-clorpirifos',
    name: 'Clorpirifós 480 EC',
    activeIngredient: 'Clorpirifós',
    category: 'Defensivos',
    defaultUnit: 'L',
  },
  {
    id: 'prod-npk-20-05-20',
    name: 'Adubo NPK 20-05-20',
    activeIngredient: 'Nitrogênio, Fósforo e Potássio',
    category: 'Fertilizantes',
    defaultUnit: 'Sc',
  },
  {
    id: 'prod-ureia',
    name: 'Ureia Agrícola 46% N',
    activeIngredient: 'Nitrogênio Amídico',
    category: 'Fertilizantes',
    defaultUnit: 'Sc',
  },
  {
    id: 'prod-sulfato-cobre',
    name: 'Sulfato de Cobre Penta-hidratado',
    activeIngredient: 'Sulfato de Cobre',
    category: 'Defensivos',
    defaultUnit: 'Kg',
  },
  {
    id: 'prod-oxicloreto',
    name: 'Oxicloreto de Cobre 500 WP',
    activeIngredient: 'Oxicloreto de Cobre',
    category: 'Defensivos',
    defaultUnit: 'Kg',
  },
  {
    id: 'prod-azoxistrobina',
    name: 'Azoxistrobina 250 SC',
    activeIngredient: 'Azoxistrobina',
    category: 'Defensivos',
    defaultUnit: 'L',
  },
  {
    id: 'prod-kcl',
    name: 'Cloreto de Potássio (KCl 60%)',
    activeIngredient: 'Cloreto de Potássio',
    category: 'Fertilizantes',
    defaultUnit: 'Sc',
  },
  {
    id: 'prod-calcario',
    name: 'Calcário Dolomítico PRNT 85%',
    activeIngredient: 'Carbonato de Cálcio e Magnésio',
    category: 'Corretivos',
    defaultUnit: 'Ton',
  },
  {
    id: 'prod-oleo-mineral',
    name: 'Óleo Mineral Emulsionável',
    activeIngredient: 'Hidrocarbonetos Alifáticos',
    category: 'Defensivos',
    defaultUnit: 'L',
  },
];

/**
 * Busca preditiva de produtos por nome comercial ou princípio ativo
 */
export function searchCatalogProducts(query: string): CatalogProduct[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];
  return CATALOG_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(clean) ||
      p.activeIngredient.toLowerCase().includes(clean)
  );
}

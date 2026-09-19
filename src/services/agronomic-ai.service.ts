import { TargetCropId } from '../types/quotation';
import { CatalogProduct, CATALOG_PRODUCTS } from '../data/products';

export interface DosageCalculationParams {
  cropId: TargetCropId | string;
  productNameOrActive: string;
  areaHectares: number;
  plantsPerHectare?: number;
  applicationMethod?: string;
}

export interface DosageCalculationResult {
  recommendedQuantity: number;
  recommendedUnit: string;
  dosePerHectare: number;
  doseUnit: string;
  applicationMethod: string;
  explanation: string;
  productMatched?: CatalogProduct;
  matchedCategory: string;
}

export interface PhytosanitaryRestriction {
  hasRestriction: boolean;
  cropId?: TargetCropId | string;
  activeIngredient?: string;
  warningMessage?: string;
  recommendedAlternative?: CatalogProduct;
  reason?: string;
}

/**
 * Base de conhecimento agronômico com dosagens registradas no MAPA e restrições fitossanitárias
 */
const RESTRICTED_ACTIVES_BY_CROP: Record<
  string,
  Array<{
    activePattern: RegExp;
    reason: string;
    warningMessage: string;
    alternativeId: string;
  }>
> = {
  mamao: [
    {
      activePattern: /clorpirif[oó]s/i,
      reason: 'LMR zerado e restrição severa de exportação para União Europeia e EUA',
      warningMessage:
        'Atenção: Este princípio ativo possui restrições severas de exportação para a cultura do Mamão. Deseja ver opções biológicas ou alternativas registradas de menor carência?',
      alternativeId: 'prod-azoxistrobina',
    },
    {
      activePattern: /mancozeb[e]?/i,
      reason: 'Restrição de resíduos e carência incompatível com exportação contínua de mamão',
      warningMessage:
        'Atenção: Este princípio ativo possui restrições severas de exportação para a cultura do Mamão. Deseja ver opções biológicas ou alternativas registradas de menor carência?',
      alternativeId: 'prod-azoxistrobina',
    },
    {
      activePattern: /glifosato/i,
      reason: 'Risco de deriva foliar e resíduo pós-colheita na casca do mamão',
      warningMessage:
        'Atenção: Este princípio ativo possui restrições severas de exportação para a cultura do Mamão. Deseja ver opções biológicas ou alternativas registradas de menor carência?',
      alternativeId: 'prod-oleo-mineral',
    },
  ],
  pimenta_reino: [
    {
      activePattern: /clorpirif[oó]s/i,
      reason: 'Proibição de resíduos em pimenta preta e branca exportada para a UE',
      warningMessage:
        'Atenção: Este princípio ativo possui restrições severas de exportação para a cultura da Pimenta-do-reino. Deseja ver opções biológicas ou alternativas registradas de menor carência?',
      alternativeId: 'prod-azoxistrobina',
    },
  ],
};

class AgronomicAiService {
  /**
   * Identifica o produto ou categoria no catálogo
   */
  public matchProduct(query: string): CatalogProduct | undefined {
    const clean = query.trim().toLowerCase();
    if (!clean) return undefined;
    return CATALOG_PRODUCTS.find(
      (p) =>
        p.name.toLowerCase().includes(clean) ||
        clean.includes(p.name.toLowerCase()) ||
        p.activeIngredient.toLowerCase().includes(clean) ||
        clean.includes(p.activeIngredient.toLowerCase())
    );
  }

  /**
   * Cenário 1: Calcula automaticamente o volume e a dosagem recomendada por área e cultura
   */
  public calculateDosage(params: DosageCalculationParams): DosageCalculationResult {
    const {
      cropId: _cropId,
      productNameOrActive,
      areaHectares,
      applicationMethod = 'aplicação tratorada/fertirrigação',
    } = params;

    const numArea = typeof areaHectares === 'number' ? areaHectares : parseFloat(String(areaHectares));
    const safeArea = !isNaN(numArea) && numArea > 0 ? numArea : 1;
    const product = this.matchProduct(productNameOrActive);

    const isFertilizer =
      product?.category === 'Fertilizantes' ||
      /adubo|npk|ureia|fertilizante|kcl|fosfato/i.test(productNameOrActive);

    const isLiquid =
      product?.defaultUnit === 'L' ||
      /azoxistrobina|glifosato|clorpirif[oó]s|[oó]leo|litro|liquido|\bsl\b|\bec\b|\bsc\b/i.test(
        productNameOrActive
      );

    const isCorrective =
      product?.category === 'Corretivos' ||
      /calc[aá]rio|gesso/i.test(productNameOrActive);

    let dosePerHa: number;
    let unit: string;
    let doseUnit: string;

    if (isFertilizer) {
      // Ex: Adubo NPK para Café Conilon: 6 Sacas/ha (para 15 ha = 90 Sacas)
      dosePerHa = 6;
      unit = 'Sc';
      doseUnit = 'Sc/ha';
    } else if (isCorrective) {
      dosePerHa = 2;
      unit = 'Ton';
      doseUnit = 'Ton/ha';
    } else if (isLiquid) {
      // Ex: Azoxistrobina ou defensivo líquido para Café Conilon: 3.0 L/ha (para 15 ha = 45 Litros)
      dosePerHa = 3.0;
      unit = 'L';
      doseUnit = 'L/ha';
    } else {
      // Defensivo em pó ou padrão Kg: 2.5 Kg/ha
      dosePerHa = 2.5;
      unit = 'Kg';
      doseUnit = 'Kg/ha';
    }

    const totalQuantity = Math.round(safeArea * dosePerHa * 100) / 100;
    const formattedDose =
      doseUnit === 'L/ha'
        ? dosePerHa.toFixed(1)
        : dosePerHa % 1 === 0
        ? dosePerHa.toFixed(0)
        : dosePerHa.toFixed(1);
    const formattedArea = safeArea % 1 === 0 ? safeArea.toFixed(0) : safeArea.toString();

    // Resumo explicativo oficial da US11:
    // "Dose recomendada de X L/ha para 15 ha com aplicação tratorada/fertirrigação"
    const explanation = `Dose recomendada de ${formattedDose} ${doseUnit} para ${formattedArea} ha com ${applicationMethod}`;

    return {
      recommendedQuantity: totalQuantity,
      recommendedUnit: unit,
      dosePerHectare: dosePerHa,
      doseUnit,
      applicationMethod,
      explanation,
      productMatched: product,
      matchedCategory: isFertilizer
        ? 'Fertilizantes'
        : isCorrective
        ? 'Corretivos'
        : 'Defensivos',
    };
  }

  /**
   * Cenário 2: Alerta preventivo de restrição fitossanitária (Mamão / Pimenta)
   */
  public checkPhytosanitaryRestrictions(
    cropId: TargetCropId | string,
    productNameOrActive: string
  ): PhytosanitaryRestriction {
    if (!cropId || !productNameOrActive.trim()) {
      return { hasRestriction: false };
    }

    const restrictionsForCrop = RESTRICTED_ACTIVES_BY_CROP[cropId];
    if (!restrictionsForCrop || restrictionsForCrop.length === 0) {
      return { hasRestriction: false };
    }

    for (const rule of restrictionsForCrop) {
      if (rule.activePattern.test(productNameOrActive)) {
        const alternative = CATALOG_PRODUCTS.find((p) => p.id === rule.alternativeId);
        return {
          hasRestriction: true,
          cropId,
          activeIngredient: productNameOrActive,
          warningMessage: rule.warningMessage,
          reason: rule.reason,
          recommendedAlternative: alternative,
        };
      }
    }

    return { hasRestriction: false };
  }
}

export const agronomicAiService = new AgronomicAiService();

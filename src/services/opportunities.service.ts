import { QuotationRequest } from '../types/quotation';
import { ResellerProfile } from '../types/user';
import { getCityDistanceKm, formatDistance } from '../utils/geo';
import { TARGET_CROPS } from '../data/target-crops';

export interface TimeRemainingInfo {
  hours: number;
  formatted: string;
  isExpiringSoon: boolean; // Menos de 24 horas
  isExpired: boolean;
}

export interface OpportunityItem {
  quotation: QuotationRequest;
  distanceKm: number;
  formattedDistance: string;
  isWithinRadius: boolean;
  cropId?: string;
  cropName: string;
  itemsCount: number;
  timeRemaining: TimeRemainingInfo;
}

export interface OpportunityFilters {
  municipality?: string;
  crop?: string;
  expiringSoonOnly?: boolean;
}

/**
 * Calcula o tempo restante para encerramento do recebimento de propostas
 */
export const calculateTimeRemaining = (deadlineIso: string, referenceDate?: Date): TimeRemainingInfo => {
  const now = referenceDate ? referenceDate.getTime() : Date.now();
  const deadline = new Date(deadlineIso).getTime();
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return {
      hours: 0,
      formatted: 'Prazo expirado',
      isExpiringSoon: false,
      isExpired: true,
    };
  }

  const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  const isExpiringSoon = diffHours <= 24;

  let formatted: string;
  if (diffHours < 1) {
    const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    formatted = `Expira em ${minutes} min`;
  } else if (diffHours < 24) {
    const wholeHours = Math.floor(diffHours);
    formatted = `Expira em ${wholeHours}h`;
  } else {
    const days = Math.floor(diffHours / 24);
    const remHours = Math.floor(diffHours % 24);
    formatted = remHours > 0 ? `Expira em ${days}d ${remHours}h` : `Expira em ${days} dias`;
  }

  return {
    hours: diffHours,
    formatted,
    isExpiringSoon,
    isExpired: false,
  };
};

/**
 * Infere o nome amigável da cultura a partir da cotação
 */
export const extractCropInfo = (quote: QuotationRequest): { id?: string; name: string } => {
  const customCrop = (quote as unknown as { targetCrop?: string; targetCropName?: string });
  if (customCrop.targetCropName) {
    return { id: customCrop.targetCrop, name: customCrop.targetCropName };
  }

  if (customCrop.targetCrop) {
    const found = TARGET_CROPS.find((c) => c.id === customCrop.targetCrop);
    if (found) {
      return { id: found.id, name: found.name };
    }
  }

  // Tentar inferir pelo título da cotação
  const lowerTitle = (quote.title || '').toLowerCase();
  for (const crop of TARGET_CROPS) {
    if (lowerTitle.includes(crop.name.toLowerCase())) {
      return { id: crop.id, name: crop.name };
    }
  }

  if (lowerTitle.includes('conilon')) return { id: 'cafe_conilon', name: 'Café Conilon' };
  if (lowerTitle.includes('arabica') || lowerTitle.includes('arábica')) return { id: 'cafe_arabica', name: 'Café Arábica' };
  if (lowerTitle.includes('cacau')) return { id: 'cacau', name: 'Cacau' };
  if (lowerTitle.includes('pimenta')) return { id: 'pimenta_reino', name: 'Pimenta-do-reino' };
  if (lowerTitle.includes('mamao') || lowerTitle.includes('mamão')) return { id: 'mamao', name: 'Mamão' };

  return { name: 'Culturas Gerais' };
};

export const opportunitiesService = {
  /**
   * Converte uma cotação em um item de oportunidade contextualizado para a revenda
   */
  mapQuotationToOpportunity(
    quote: QuotationRequest,
    reseller: ResellerProfile,
    referenceDate?: Date
  ): OpportunityItem {
    const distanceKm = getCityDistanceKm(
      reseller.city || 'Linhares',
      reseller.state || 'ES',
      quote.targetCity || 'Linhares',
      quote.targetState || 'ES'
    );

    const radius = reseller.deliveryRadiusKm ?? 100;
    const isWithinRadius = distanceKm <= radius;
    const formattedDistance = formatDistance(distanceKm);
    const crop = extractCropInfo(quote);
    const itemsCount = quote.itemsCount ?? quote.items?.length ?? 1;
    const timeRemaining = calculateTimeRemaining(quote.deadline, referenceDate);

    return {
      quotation: quote,
      distanceKm,
      formattedDistance,
      isWithinRadius,
      cropId: crop.id,
      cropName: crop.name,
      itemsCount,
      timeRemaining,
    };
  },

  /**
   * Obtém todas as cotações abertas no raio da revenda
   */
  async getOpportunitiesForReseller(
    reseller: ResellerProfile,
    customQuotations?: QuotationRequest[],
    referenceDate?: Date
  ): Promise<OpportunityItem[]> {
    let quotes: QuotationRequest[] = [];

    if (customQuotations) {
      quotes = customQuotations;
    } else {
      // Ler do localStorage e/ou banco de dados
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('cotacampo_quotations');
          if (stored) {
            quotes = JSON.parse(stored);
          }
        } catch (e) {
          console.error('Erro ao ler cotações locais:', e);
        }
      }
    }

    // Apenas cotações abertas (OPEN)
    const openQuotes = quotes.filter((q) => q.status === 'OPEN');

    // Mapear com distância e dados de oportunidade
    const items = openQuotes.map((q) => this.mapQuotationToOpportunity(q, reseller, referenceDate));

    // Filtrar apenas as cotações que estão estritamente dentro do raio logístico
    const withinRadiusItems = items.filter((item) => item.isWithinRadius && !item.timeRemaining.isExpired);

    // Ordenar: primeiro as mais urgentes (expirando em breve), depois por menor distância
    withinRadiusItems.sort((a, b) => {
      if (a.timeRemaining.isExpiringSoon && !b.timeRemaining.isExpiringSoon) return -1;
      if (!a.timeRemaining.isExpiringSoon && b.timeRemaining.isExpiringSoon) return 1;
      return a.distanceKm - b.distanceKm;
    });

    return withinRadiusItems;
  },

  /**
   * Aplica filtros de funil de vendas sobre o feed de oportunidades
   */
  filterOpportunities(
    items: OpportunityItem[],
    filters: OpportunityFilters
  ): OpportunityItem[] {
    return items.filter((item) => {
      // Filtro de município
      if (filters.municipality && filters.municipality !== 'ALL') {
        const itemCity = (item.quotation.targetCity || '').trim().toLowerCase();
        const filterCity = filters.municipality.trim().toLowerCase();
        if (itemCity !== filterCity) {
          return false;
        }
      }

      // Filtro de cultura
      if (filters.crop && filters.crop !== 'ALL') {
        const itemCropId = item.cropId || '';
        const itemCropName = item.cropName.toLowerCase();
        const filterCrop = filters.crop.toLowerCase();
        if (itemCropId !== filterCrop && !itemCropName.includes(filterCrop)) {
          return false;
        }
      }

      // Filtro de prazo expirando (< 24 horas)
      if (filters.expiringSoonOnly) {
        if (!item.timeRemaining.isExpiringSoon) {
          return false;
        }
      }

      return true;
    });
  },

  /**
   * Gera URL do WhatsApp com convite para produtores parceiros
   */
  generateProducerInviteWhatsAppUrl(reseller: ResellerProfile): string {
    const storeName = reseller.nomeFantasia || reseller.razaoSocial || 'Nossa Revenda';
    const city = reseller.city || 'região';
    const text = `Olá amigo produtor! Sou da revenda ${storeName} em ${city}. Venha cotar seus defensivos e fertilizantes no CotaCampo! Você recebe propostas competitivas direto no WhatsApp e economiza na safra. Cadastre sua fazenda gratuitamente: https://cotacampo.com.br`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  },
};

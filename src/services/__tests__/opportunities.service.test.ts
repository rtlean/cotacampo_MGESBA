import { describe, it, expect } from 'vitest';
import {
  opportunitiesService,
  calculateTimeRemaining,
  extractCropInfo,
} from '../opportunities.service';
import { QuotationRequest } from '../../types/quotation';
import { ResellerProfile } from '../../types/user';

describe('opportunitiesService - Mural de Oportunidades (US13)', () => {
  const mockReseller: ResellerProfile = {
    id: 'reseller-123',
    role: 'RESELLER',
    razaoSocial: 'Agro Insumos Linhares LTDA',
    nomeFantasia: 'AgroLinhares',
    cnpj: '12.345.678/0001-90',
    corporateEmail: 'contato@agrolinhares.com.br',
    whatsapp: '(27) 99888-1111',
    state: 'ES',
    city: 'Linhares',
    deliveryRadiusKm: 100, // Raio de 100 km
    coordinates: { lat: -19.3958, lng: -40.0644 },
    categories: ['defensivos', 'fertilizantes'],
    createdAt: new Date().toISOString(),
  };

  const baseDate = new Date('2026-09-19T12:00:00.000Z');

  describe('calculateTimeRemaining', () => {
    it('deve calcular corretamente prazo com menos de 1 hora em minutos', () => {
      const deadline = new Date(baseDate.getTime() + 45 * 60 * 1000).toISOString();
      const res = calculateTimeRemaining(deadline, baseDate);
      expect(res.isExpiringSoon).toBe(true);
      expect(res.isExpired).toBe(false);
      expect(res.formatted).toBe('Expira em 45 min');
    });

    it('deve calcular prazo com menos de 24 horas marcando isExpiringSoon = true', () => {
      const deadline = new Date(baseDate.getTime() + 18 * 3600 * 1000).toISOString();
      const res = calculateTimeRemaining(deadline, baseDate);
      expect(res.isExpiringSoon).toBe(true);
      expect(res.isExpired).toBe(false);
      expect(res.formatted).toBe('Expira em 18h');
    });

    it('deve calcular prazo com múltiplos dias marcando isExpiringSoon = false', () => {
      const deadline = new Date(baseDate.getTime() + 48 * 3600 * 1000).toISOString();
      const res = calculateTimeRemaining(deadline, baseDate);
      expect(res.isExpiringSoon).toBe(false);
      expect(res.isExpired).toBe(false);
      expect(res.formatted).toBe('Expira em 2 dias');
    });

    it('deve detectar prazo vencido', () => {
      const deadline = new Date(baseDate.getTime() - 3600 * 1000).toISOString();
      const res = calculateTimeRemaining(deadline, baseDate);
      expect(res.isExpired).toBe(true);
      expect(res.isExpiringSoon).toBe(false);
      expect(res.formatted).toBe('Prazo expirado');
    });
  });

  describe('extractCropInfo', () => {
    it('deve extrair cultura a partir de targetCropName', () => {
      const q = {
        title: 'Cotação Geral',
        targetCrop: 'cafe_conilon',
        targetCropName: 'Café Conilon',
      } as unknown as QuotationRequest;
      expect(extractCropInfo(q).name).toBe('Café Conilon');
    });

    it('deve extrair cultura mapeada por id', () => {
      const q = {
        title: 'Pedido de Insumos',
        targetCrop: 'cacau',
      } as unknown as QuotationRequest;
      expect(extractCropInfo(q).name).toBe('Cacau');
    });

    it('deve inferir cultura pelo título da cotação', () => {
      const q1 = { title: 'Fungicida para Pimenta do Reino' } as QuotationRequest;
      expect(extractCropInfo(q1).name).toBe('Pimenta-do-reino');

      const q2 = { title: 'Adubo Foliar para Mamão Golden' } as QuotationRequest;
      expect(extractCropInfo(q2).name).toBe('Mamão');

      const q3 = { title: 'Insumos para Café Arábica' } as QuotationRequest;
      expect(extractCropInfo(q3).name).toBe('Café Arábica');

      const q4 = { title: 'Adubo variado' } as QuotationRequest;
      expect(extractCropInfo(q4).name).toBe('Culturas Gerais');
    });
  });

  describe('Cenário 1: Listagem de cotações dentro do raio logístico (100 km a partir de Linhares/ES)', () => {
    const mockQuotes: QuotationRequest[] = [
      {
        id: 'q-linhares',
        producerId: 'prod-1',
        title: 'Defensivos para Café Conilon - Fazenda Santa Clara',
        status: 'OPEN',
        targetCity: 'Linhares',
        targetState: 'ES',
        deadline: new Date(baseDate.getTime() + 36 * 3600 * 1000).toISOString(),
        itemsCount: 3,
        createdAt: baseDate.toISOString(),
        updatedAt: baseDate.toISOString(),
      },
      {
        id: 'q-saomateus',
        producerId: 'prod-2',
        title: 'Foliar para Mamão - Sítio São Mateus',
        status: 'OPEN',
        targetCity: 'São Mateus',
        targetState: 'ES',
        deadline: new Date(baseDate.getTime() + 18 * 3600 * 1000).toISOString(),
        itemsCount: 2,
        createdAt: baseDate.toISOString(),
        updatedAt: baseDate.toISOString(),
      },
      {
        id: 'q-colatina',
        producerId: 'prod-3',
        title: 'Adubação para Café Conilon - Fazenda Rio Doce',
        status: 'OPEN',
        targetCity: 'Colatina',
        targetState: 'ES',
        deadline: new Date(baseDate.getTime() + 48 * 3600 * 1000).toISOString(),
        itemsCount: 4,
        createdAt: baseDate.toISOString(),
        updatedAt: baseDate.toISOString(),
      },
      {
        id: 'q-manhuacu',
        producerId: 'prod-4',
        title: 'Nutrição de Café Arábica - Fazenda Manhuaçu',
        status: 'OPEN',
        targetCity: 'Manhuaçu',
        targetState: 'MG', // Distância > 200 km (fora do raio de 100 km)
        deadline: new Date(baseDate.getTime() + 24 * 3600 * 1000).toISOString(),
        itemsCount: 5,
        createdAt: baseDate.toISOString(),
        updatedAt: baseDate.toISOString(),
      },
      {
        id: 'q-ilheus',
        producerId: 'prod-5',
        title: 'Insumos para Cacau Cabruca - Fazenda Sul Baiano',
        status: 'OPEN',
        targetCity: 'Ilhéus',
        targetState: 'BA', // Distância > 500 km (fora do raio de 100 km)
        deadline: new Date(baseDate.getTime() + 30 * 3600 * 1000).toISOString(),
        itemsCount: 1,
        createdAt: baseDate.toISOString(),
        updatedAt: baseDate.toISOString(),
      },
      {
        id: 'q-closed',
        producerId: 'prod-6',
        title: 'Cotação Encerrada',
        status: 'IN_REVIEW', // Status não é OPEN
        targetCity: 'Linhares',
        targetState: 'ES',
        deadline: new Date(baseDate.getTime() + 10 * 3600 * 1000).toISOString(),
        itemsCount: 2,
        createdAt: baseDate.toISOString(),
        updatedAt: baseDate.toISOString(),
      },
    ];

    it('deve filtrar estritamente cotações abertas dentro do raio de 100 km a partir de Linhares', async () => {
      const opportunities = await opportunitiesService.getOpportunitiesForReseller(
        mockReseller,
        mockQuotes,
        baseDate
      );

      // Apenas Linhares, São Mateus e Colatina estão dentro de 100 km
      expect(opportunities).toHaveLength(3);

      const cities = opportunities.map((o) => o.quotation.targetCity);
      expect(cities).toContain('Linhares');
      expect(cities).toContain('São Mateus');
      expect(cities).toContain('Colatina');
      expect(cities).not.toContain('Manhuaçu');
      expect(cities).not.toContain('Ilhéus');

      // Verifica propriedades obrigatórias do card
      const linharesCard = opportunities.find((o) => o.quotation.targetCity === 'Linhares')!;
      expect(linharesCard.cropName).toBe('Café Conilon');
      expect(linharesCard.distanceKm).toBe(0);
      expect(linharesCard.formattedDistance).toBe('0 km (Mesmo município)');
      expect(linharesCard.itemsCount).toBe(3);
      expect(linharesCard.timeRemaining.formatted).toBe('Expira em 1d 12h');

      const saoMateusCard = opportunities.find((o) => o.quotation.targetCity === 'São Mateus')!;
      expect(saoMateusCard.cropName).toBe('Mamão');
      expect(saoMateusCard.distanceKm).toBeGreaterThan(70);
      expect(saoMateusCard.distanceKm).toBeLessThan(85);
      expect(saoMateusCard.itemsCount).toBe(2);
      expect(saoMateusCard.timeRemaining.formatted).toBe('Expira em 18h');
      expect(saoMateusCard.timeRemaining.isExpiringSoon).toBe(true);
    });

    it('deve priorizar na ordenação cotações expirando em breve (< 24h)', async () => {
      const opportunities = await opportunitiesService.getOpportunitiesForReseller(
        mockReseller,
        mockQuotes,
        baseDate
      );

      // São Mateus expira em 18h (< 24h), portanto deve ser o primeiro da lista
      expect(opportunities[0].quotation.id).toBe('q-saomateus');
    });
  });

  describe('Cenário 2: Filtros de funil de vendas e busca', () => {
    let baseOpportunities: Awaited<ReturnType<typeof opportunitiesService.getOpportunitiesForReseller>>;

    const mockQuotesForFilters: QuotationRequest[] = [
      {
        id: 'q-1',
        producerId: 'p-1',
        title: 'Fungicida para Café Conilon',
        status: 'OPEN',
        targetCity: 'Linhares',
        targetState: 'ES',
        deadline: new Date(baseDate.getTime() + 12 * 3600 * 1000).toISOString(), // 12h (urgente)
        itemsCount: 3,
        createdAt: baseDate.toISOString(),
        updatedAt: baseDate.toISOString(),
      },
      {
        id: 'q-2',
        producerId: 'p-2',
        title: 'Adubação para Mamão',
        status: 'OPEN',
        targetCity: 'Linhares',
        targetState: 'ES',
        deadline: new Date(baseDate.getTime() + 48 * 3600 * 1000).toISOString(), // 48h
        itemsCount: 1,
        createdAt: baseDate.toISOString(),
        updatedAt: baseDate.toISOString(),
      },
      {
        id: 'q-3',
        producerId: 'p-3',
        title: 'Nutrição para Café Conilon',
        status: 'OPEN',
        targetCity: 'São Mateus',
        targetState: 'ES',
        deadline: new Date(baseDate.getTime() + 20 * 3600 * 1000).toISOString(), // 20h (urgente)
        itemsCount: 4,
        createdAt: baseDate.toISOString(),
        updatedAt: baseDate.toISOString(),
      },
    ];

    it('deve filtrar por Município Específico', async () => {
      baseOpportunities = await opportunitiesService.getOpportunitiesForReseller(
        mockReseller,
        mockQuotesForFilters,
        baseDate
      );

      const filtered = opportunitiesService.filterOpportunities(baseOpportunities, {
        municipality: 'São Mateus',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].quotation.targetCity).toBe('São Mateus');
    });

    it('deve filtrar por Cultura e descartar cotações não correspondentes', async () => {
      baseOpportunities = await opportunitiesService.getOpportunitiesForReseller(
        mockReseller,
        mockQuotesForFilters,
        baseDate
      );

      const filteredMamao = opportunitiesService.filterOpportunities(baseOpportunities, {
        crop: 'mamao',
      });
      expect(filteredMamao).toHaveLength(1);
      expect(filteredMamao[0].cropName).toBe('Mamão');

      const filteredCafe = opportunitiesService.filterOpportunities(baseOpportunities, {
        crop: 'cafe_conilon',
      });
      expect(filteredCafe).toHaveLength(2);

      const filteredNenhum = opportunitiesService.filterOpportunities(baseOpportunities, {
        crop: 'cacau',
      });
      expect(filteredNenhum).toHaveLength(0);
    });

    it('deve ler cotações do localStorage quando customQuotations não for fornecido', async () => {
      localStorage.setItem('cotacampo_quotations', JSON.stringify(mockQuotesForFilters));
      const res = await opportunitiesService.getOpportunitiesForReseller(mockReseller, undefined, baseDate);
      expect(res.length).toBeGreaterThan(0);
    });

    it('deve lidar com erro ao fazer parse do localStorage', async () => {
      localStorage.setItem('cotacampo_quotations', 'invalid-json');
      const res = await opportunitiesService.getOpportunitiesForReseller(mockReseller, undefined, baseDate);
      expect(res).toEqual([]);
    });

    it('deve filtrar por Prazo Expirando (menos de 24h)', async () => {
      baseOpportunities = await opportunitiesService.getOpportunitiesForReseller(
        mockReseller,
        mockQuotesForFilters,
        baseDate
      );

      const filteredExpiring = opportunitiesService.filterOpportunities(baseOpportunities, {
        expiringSoonOnly: true,
      });

      expect(filteredExpiring).toHaveLength(2);
      expect(filteredExpiring.every((item) => item.timeRemaining.isExpiringSoon)).toBe(true);
    });
  });

  describe('Cenário 3: Gerador de convite WhatsApp para Estado Vazio', () => {
    it('deve gerar URL do WhatsApp codificada com convite profissional ao produtor', () => {
      const url = opportunitiesService.generateProducerInviteWhatsAppUrl(mockReseller);
      expect(url).toContain('https://wa.me/?text=');
      expect(decodeURIComponent(url)).toContain('AgroLinhares');
      expect(decodeURIComponent(url)).toContain('Linhares');
      expect(decodeURIComponent(url)).toContain('CotaCampo');
    });
  });
});

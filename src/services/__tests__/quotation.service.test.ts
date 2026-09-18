import { describe, it, expect, beforeEach } from 'vitest';
import { quotationService } from '../quotation.service';
import { QuotationRequest } from '../../types/quotation';

describe('Quotation Service', () => {
  const producerId = 'prod-test-uuid-123';

  beforeEach(() => {
    localStorage.clear();
  });

  it('deve retornar métricas zeradas e lista vazia para produtor recém-cadastrado', async () => {
    const metrics = await quotationService.getProducerMetrics(producerId);
    const quotations = await quotationService.getProducerQuotations(producerId);

    expect(metrics).toEqual({
      openCount: 0,
      inReviewCount: 0,
      awardedCount: 0,
      totalCount: 0,
    });
    expect(quotations).toEqual([]);
  });

  it('deve calcular corretamente a contagem por status (OPEN, IN_REVIEW, AWARDED)', async () => {
    const mockList: QuotationRequest[] = [
      {
        id: 'q1',
        producerId,
        title: 'Adubo Foliar para Café',
        status: 'OPEN',
        targetState: 'ES',
        targetCity: 'Linhares',
        deadline: new Date().toISOString(),
        itemsCount: 2,
        bidsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'q2',
        producerId,
        title: 'Defensivo Pimenta-do-reino',
        status: 'OPEN',
        targetState: 'ES',
        targetCity: 'Linhares',
        deadline: new Date().toISOString(),
        itemsCount: 1,
        bidsCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'q3',
        producerId,
        title: 'Fertilizante Cacau',
        status: 'IN_REVIEW',
        targetState: 'ES',
        targetCity: 'Linhares',
        deadline: new Date().toISOString(),
        itemsCount: 4,
        bidsCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'q4',
        producerId,
        title: 'Calcário Agrícola',
        status: 'AWARDED',
        targetState: 'ES',
        targetCity: 'Linhares',
        deadline: new Date().toISOString(),
        itemsCount: 1,
        bidsCount: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'q5',
        producerId: 'other-producer-id',
        title: 'Cotação de outro produtor',
        status: 'OPEN',
        targetState: 'MG',
        targetCity: 'Manhuaçu',
        deadline: new Date().toISOString(),
        itemsCount: 1,
        bidsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    localStorage.setItem('cotacampo_quotations', JSON.stringify(mockList));

    const metrics = await quotationService.getProducerMetrics(producerId);
    const quotations = await quotationService.getProducerQuotations(producerId);

    expect(metrics.openCount).toBe(2);
    expect(metrics.inReviewCount).toBe(1);
    expect(metrics.awardedCount).toBe(1);
    expect(metrics.totalCount).toBe(4);
    expect(quotations.length).toBe(4);
  });
});

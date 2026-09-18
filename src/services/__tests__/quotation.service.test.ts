import { describe, it, expect, beforeEach, vi } from 'vitest';
import { quotationService } from '../quotation.service';
import { QuotationRequest } from '../../types/quotation';
import { supabase } from '../supabase';

describe('Quotation Service', () => {
  const producerId = 'prod-test-uuid-123';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve retornar métricas zeradas e lista vazia para produtor recém-cadastrado', async () => {
    const metrics = await quotationService.getProducerMetrics(producerId, { skipRemote: true });
    const quotations = await quotationService.getProducerQuotations(producerId, { skipRemote: true });

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
    ];

    localStorage.setItem('cotacampo_quotations', JSON.stringify(mockList));

    const metrics = await quotationService.getProducerMetrics(producerId, { skipRemote: true });
    const quotations = await quotationService.getProducerQuotations(producerId, { skipRemote: true });

    expect(metrics.openCount).toBe(2);
    expect(metrics.inReviewCount).toBe(1);
    expect(metrics.awardedCount).toBe(1);
    expect(metrics.totalCount).toBe(4);
    expect(quotations.length).toBe(4);
  });

  it('deve lidar com producerId vazio e erro de parsing no localStorage', () => {
    expect(quotationService.getLocalQuotations('')).toEqual([]);
    
    // Simula JSON inválido
    localStorage.setItem('cotacampo_quotations', 'invalid-json-string{');
    expect(quotationService.getLocalQuotations('prod-1')).toEqual([]);
    expect(quotationService.getLocalMetrics('prod-1')).toEqual({
      openCount: 0,
      inReviewCount: 0,
      awardedCount: 0,
      totalCount: 0,
    });
  });

  it('deve integrar com Supabase e mesclar registros remotos com locais', async () => {
    const localQuote: QuotationRequest = {
      id: 'local-q-1',
      producerId,
      title: 'Cotação Local',
      status: 'OPEN',
      targetState: 'ES',
      targetCity: 'Linhares',
      deadline: new Date().toISOString(),
      itemsCount: 1,
      bidsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('cotacampo_quotations', JSON.stringify([localQuote]));

    const remoteRecords = [
      {
        id: 'remote-q-2',
        producer_id: producerId,
        title: 'Cotação Remota Supabase',
        status: 'IN_REVIEW',
        target_state: 'ES',
        target_city: 'Linhares',
        deadline: new Date().toISOString(),
        notes: 'Urgente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        quotation_items: [{ id: 'item-1', product_name: 'Ureia', quantity: 10, unit: 'sc' }],
        quotation_bids: [{ id: 'bid-1', total_amount: 5000, status: 'SUBMITTED', delivery_days: 3 }],
      },
    ];

    const orderMock = vi.fn().mockResolvedValue({ data: remoteRecords, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: selectMock,
    } as unknown as ReturnType<typeof supabase.from>);

    const quotes = await quotationService.getProducerQuotations(producerId);
    expect(quotes.length).toBe(2);
    expect(quotes.some((q) => q.id === 'remote-q-2')).toBe(true);
    expect(quotes.some((q) => q.id === 'local-q-1')).toBe(true);
  });

  it('deve retornar cotações locais se Supabase responder com erro', async () => {
    const localQuote: QuotationRequest = {
      id: 'local-q-only',
      producerId,
      title: 'Cotação Local Only',
      status: 'AWARDED',
      targetState: 'ES',
      targetCity: 'Linhares',
      deadline: new Date().toISOString(),
      itemsCount: 1,
      bidsCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('cotacampo_quotations', JSON.stringify([localQuote]));

    const orderMock = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: selectMock,
    } as unknown as ReturnType<typeof supabase.from>);

    const quotes = await quotationService.getProducerQuotations(producerId);
    expect(quotes.length).toBe(1);
    expect(quotes[0].id).toBe('local-q-only');
  });

  it('deve salvar nova cotação e atualizar cotação existente via saveQuotation', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({
      upsert: upsertMock,
    } as unknown as ReturnType<typeof supabase.from>);

    const newQuote: QuotationRequest = {
      id: 'q-new-1',
      producerId,
      title: 'Nova Cotação',
      status: 'OPEN',
      targetState: 'ES',
      targetCity: 'Linhares',
      deadline: new Date().toISOString(),
      itemsCount: 2,
      bidsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Inserção
    await quotationService.saveQuotation(newQuote);
    let stored = quotationService.getLocalQuotations(producerId);
    expect(stored.length).toBe(1);
    expect(stored[0].title).toBe('Nova Cotação');

    // 2. Atualização
    const updatedQuote = { ...newQuote, title: 'Cotação Atualizada' };
    await quotationService.saveQuotation(updatedQuote);
    stored = quotationService.getLocalQuotations(producerId);
    expect(stored.length).toBe(1);
    expect(stored[0].title).toBe('Cotação Atualizada');
  });

  it('deve capturar erro se o Supabase falhar em saveQuotation', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(supabase, 'from').mockReturnValue({
      upsert: vi.fn().mockRejectedValue(new Error('Network error on upsert')),
    } as unknown as ReturnType<typeof supabase.from>);

    const quote: QuotationRequest = {
      id: 'q-err-1',
      producerId,
      title: 'Cotação com Erro',
      status: 'OPEN',
      targetState: 'MG',
      targetCity: 'Manhuaçu',
      deadline: new Date().toISOString(),
      itemsCount: 1,
      bidsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await quotationService.saveQuotation(quote);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('deve retornar apenas cotações locais se consulta remota no Supabase falhar', async () => {
    const localQuote: QuotationRequest = {
      id: 'local-fallback-1',
      producerId,
      title: 'Cotação Local Fallback',
      status: 'OPEN',
      targetState: 'ES',
      targetCity: 'Linhares',
      deadline: new Date().toISOString(),
      itemsCount: 1,
      bidsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('cotacampo_quotations', JSON.stringify([localQuote]));

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockRejectedValue(new Error('Supabase select timeout')),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const quotes = await quotationService.getProducerQuotations(producerId);
    expect(quotes.length).toBe(1);
    expect(quotes[0].title).toBe('Cotação Local Fallback');
  });

  it('deve capturar erro se localStorage.setItem lançar exceção em saveQuotation', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('Quota exceeded on storage');
    });

    const quote: QuotationRequest = {
      id: 'q-storage-err',
      producerId,
      title: 'Cotação Erro Storage',
      status: 'OPEN',
      targetState: 'ES',
      targetCity: 'Linhares',
      deadline: new Date().toISOString(),
      itemsCount: 1,
      bidsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await quotationService.saveQuotation(quote);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao salvar cotação no localStorage:'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});

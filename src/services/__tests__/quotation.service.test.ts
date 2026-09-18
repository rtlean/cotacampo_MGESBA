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

  describe('Rascunho de Cotação e Propriedades (US06)', () => {
    it('deve salvar e recuperar rascunho de cotação com sucesso', () => {
      expect(quotationService.getDraft()).toBeNull();

      quotationService.saveDraft({
        farmId: 'farm-1',
        farmName: 'Fazenda Sol Nascente',
        targetCity: 'Linhares',
        targetState: 'ES',
        targetCrop: 'cafe_conilon',
        targetCropName: 'Café Conilon',
      });

      const draft = quotationService.getDraft();
      expect(draft).not.toBeNull();
      expect(draft?.farmId).toBe('farm-1');
      expect(draft?.farmName).toBe('Fazenda Sol Nascente');
      expect(draft?.targetCrop).toBe('cafe_conilon');
      expect(draft?.updatedAt).toBeDefined();
    });

    it('deve limpar o rascunho com clearDraft', () => {
      quotationService.saveDraft({
        farmId: 'farm-1',
        targetCrop: 'cacau',
      });
      expect(quotationService.getDraft()).not.toBeNull();

      quotationService.clearDraft();
      expect(quotationService.getDraft()).toBeNull();
    });

    it('deve tratar erros de JSON corrompido no rascunho e exceções no localStorage', () => {
      localStorage.setItem('cotacampo_quotation_draft', 'invalid-draft-json{');
      expect(quotationService.getDraft()).toBeNull();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Disk full');
      });

      quotationService.saveDraft({ farmId: 'farm-err' });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao salvar rascunho:'), expect.any(Error));

      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
        throw new Error('Remove error');
      });
      quotationService.clearDraft();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao limpar rascunho:'), expect.any(Error));

      consoleSpy.mockRestore();
      setItemSpy.mockRestore();
      removeItemSpy.mockRestore();
    });

    it('deve retornar propriedades do produtor autenticado ou fallback padrão', () => {
      const farmsDefault = quotationService.getProducerFarms(null);
      expect(farmsDefault.length).toBe(1);
      expect(farmsDefault[0].name).toBe('Fazenda Santa Clara');

      const mockProducer = {
        id: 'prod-1',
        name: 'Maria Produtora',
        email: 'maria@agro.com',
        whatsapp: '27999999999',
        role: 'PRODUCER' as const,
        farmName: 'Fazenda Bela Vista',
        state: 'ES' as const,
        city: 'Colatina',
        crops: ['cafe' as const],
        createdAt: new Date().toISOString(),
      };

      const farms = quotationService.getProducerFarms(mockProducer);
      expect(farms.length).toBe(1);
      expect(farms[0].name).toBe('Fazenda Bela Vista');
      expect(farms[0].city).toBe('Colatina');
      expect(farms[0].state).toBe('ES');
    });
  });

  describe('US08 – Publicação, Notificações e Flash Messages', () => {
    it('deve gerenciar mensagens flash de redirecionamento', () => {
      expect(quotationService.getFlashMessage()).toBeNull();

      quotationService.setFlashMessage('Cotação #COT-001 publicada com sucesso!');
      expect(quotationService.getFlashMessage()).toBe('Cotação #COT-001 publicada com sucesso!');

      quotationService.clearFlashMessage();
      expect(quotationService.getFlashMessage()).toBeNull();
    });

    it('deve publicar uma cotação no status OPEN, disparar notificação às revendas e limpar o rascunho', async () => {
      const mockProducer = {
        id: producerId,
        name: 'Carlos Produtor',
        email: 'carlos@fazenda.com',
        whatsapp: '27999887766',
        role: 'PRODUCER' as const,
        farmName: 'Fazenda Santa Clara',
        state: 'ES' as const,
        city: 'Linhares',
        crops: ['cafe' as const],
        createdAt: new Date().toISOString(),
      };

      const mockDraft = {
        farmId: 'farm-1',
        farmName: 'Fazenda Santa Clara',
        targetCity: 'Linhares',
        targetState: 'ES' as const,
        targetCrop: 'cafe_conilon' as const,
        targetCropName: 'Café Conilon',
        items: [
          {
            productName: 'Mancozeb 750 WG',
            quantity: 50,
            unit: 'Kg',
            acceptsGeneric: true,
          },
        ],
      };

      // Salva rascunho inicial
      quotationService.saveDraft(mockDraft);
      expect(quotationService.getDraft()).not.toBeNull();

      const commercial = {
        freightType: 'CIF' as const,
        paymentTerms: '30/60 dias',
        proposalLimitHours: 48,
        notes: 'Entregar no galpão 1',
      };

      const published = await quotationService.publishQuotation({
        draft: mockDraft,
        user: mockProducer,
        commercial,
      });

      // Validações do resultado
      expect(published.status).toBe('OPEN');
      expect(published.producerId).toBe(producerId);
      expect(published.freightType).toBe('CIF');
      expect(published.paymentTerms).toBe('30/60 dias');
      expect(published.proposalLimitHours).toBe(48);
      expect(published.items?.length).toBe(1);
      expect(published.displayCode).toBe('COT-001');

      // O rascunho deve ter sido limpo
      expect(quotationService.getDraft()).toBeNull();

      // A mensagem flash deve estar disponível
      expect(quotationService.getFlashMessage()).toBe('Cotação #COT-001 publicada com sucesso!');

      // A lista de notificações deve conter o aviso para as revendas parceiras
      const notifications = quotationService.getNotifications();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].quotationId).toBe(published.id);
      expect(notifications[0].targetCity).toBe('Linhares');
      expect(notifications[0].message).toContain('Nova cotação #COT-001 aberta');
    });

    it('deve usar valores padrão quando campos opcionais do rascunho não forem definidos', async () => {
      const mockProducer = {
        id: 'prod-fallback',
        name: 'Joaquim',
        email: 'joaquim@fazenda.com',
        whatsapp: '27999881122',
        role: 'PRODUCER' as const,
        farmName: 'Sítio Recanto',
        state: 'ES' as const,
        city: 'São Mateus',
        crops: ['cacau' as const],
        createdAt: new Date().toISOString(),
      };

      const emptyDraft = {};
      const commercial = {
        freightType: 'FOB' as const,
        paymentTerms: 'À vista',
        proposalLimitHours: 24,
      };

      const published = await quotationService.publishQuotation({
        draft: emptyDraft,
        user: mockProducer,
        commercial,
      });

      expect(published.status).toBe('OPEN');
      expect(published.freightType).toBe('FOB');
      expect(published.paymentTerms).toBe('À vista');
      expect(published.proposalLimitHours).toBe(24);
      expect(published.targetCity).toBe('São Mateus');
      expect(published.targetState).toBe('ES');
      expect(published.title).toContain('Insumos para Lavoura');
    });

    it('deve tratar exceções de armazenamento e falhas no Supabase em notificações e flash messages', async () => {
      // Falha no sessionStorage
      const sessionSetSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Session storage blocked');
      });
      quotationService.setFlashMessage('Teste');
      sessionSetSpy.mockRestore();

      const sessionGetSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('Session storage error');
      });
      expect(quotationService.getFlashMessage()).toBeNull();
      sessionGetSpy.mockRestore();

      // Corrupção em notificações
      localStorage.setItem('cotacampo_quotation_notifications', 'invalid-json{');
      expect(quotationService.getNotifications()).toEqual([]);

      // Falha ao salvar notificação localmente
      const localSetSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Falha no insert do Supabase
      vi.spyOn(supabase, 'from').mockReturnValueOnce({
        insert: vi.fn().mockRejectedValueOnce(new Error('Supabase insert failed')),
      } as unknown as ReturnType<typeof supabase.from>);

      const fakeQuote: QuotationRequest = {
        id: 'q-notif-err',
        producerId: 'p-1',
        title: 'Cotação',
        status: 'OPEN',
        targetState: 'ES',
        targetCity: 'Linhares',
        deadline: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await quotationService.notifyResellers(fakeQuote);
      expect(result.length).toBe(1);

      localSetSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});



import { describe, it, expect, beforeEach, vi } from 'vitest';
import { quotationService } from '../quotation.service';
import { QuotationRequest, BidStatus, BidAwardType } from '../../types/quotation';
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

  describe('US09 - Análise Comparativa Equalizada (Bids & Comparative Analysis)', () => {
    const mockQuote: QuotationRequest = {
      id: 'quote-comp-100',
      producerId: 'prod-test-uuid-123',
      title: 'Insumos Café Conilon Linhares',
      status: 'OPEN',
      targetState: 'ES',
      targetCity: 'Linhares',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      displayCode: 'COT-001',
      items: [
        {
          id: 'item-1',
          productName: 'Fungicida Dithane NT',
          activeIngredient: 'Mancozebe',
          quantity: 50,
          unit: 'Kg',
          acceptsGeneric: true,
        },
        {
          id: 'item-2',
          productName: 'Adubo NPK 20-05-20',
          activeIngredient: 'NPK',
          quantity: 1000,
          unit: 'Kg',
          acceptsGeneric: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('getQuotationById: deve retornar cotação pelo ID a partir do localStorage', async () => {
      localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuote]));

      const found = await quotationService.getQuotationById('quote-comp-100');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('quote-comp-100');
      expect(found?.title).toBe('Insumos Café Conilon Linhares');

      // ID inexistente
      const notFound = await quotationService.getQuotationById('non-existent');
      expect(notFound).toBeNull();

      // ID vazio
      const empty = await quotationService.getQuotationById('');
      expect(empty).toBeNull();
    });

    it('getQuotationById: deve tratar erro ao ler localStorage ou falha no parsing', async () => {
      localStorage.setItem('cotacampo_quotations', 'invalid-json{');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await quotationService.getQuotationById('any-id');
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('getQuotationById: deve buscar do Supabase se não encontrar no cache local', async () => {
      localStorage.removeItem('cotacampo_quotations');

      vi.spyOn(supabase, 'from').mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'quote-remote-99',
            producer_id: 'prod-99',
            title: 'Cotação Remota',
            status: 'OPEN',
            target_state: 'ES',
            target_city: 'Linhares',
            deadline: new Date().toISOString(),
            freight_type: 'CIF',
            payment_terms: '30 dias',
            proposal_limit_hours: 48,
            notes: 'Observações remotas',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            quotation_items: [
              {
                id: 'it-rem-1',
                product_name: 'Ureia Agrícola',
                active_ingredient: 'Nitrogênio',
                quantity: 500,
                unit: 'Kg',
                accepts_generic: true,
              },
            ],
            quotation_bids: [
              {
                id: 'bid-rem-1',
                total_amount: 1500,
                freight_cost: 100,
                delivery_days: 3,
                status: 'SUBMITTED',
              },
            ],
          },
          error: null,
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const remoteQuote = await quotationService.getQuotationById('quote-remote-99');
      expect(remoteQuote).not.toBeNull();
      expect(remoteQuote?.id).toBe('quote-remote-99');
      expect(remoteQuote?.items?.length).toBe(1);
      expect(remoteQuote?.items?.[0].productName).toBe('Ureia Agrícola');
      expect(remoteQuote?.items?.[0].acceptsGeneric).toBe(true);
    });

    it('getQuotationById: deve capturar exceção de rede do Supabase e retornar null', async () => {
      localStorage.removeItem('cotacampo_quotations');

      vi.spyOn(supabase, 'from').mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValueOnce(new Error('Supabase network crash')),
      } as unknown as ReturnType<typeof supabase.from>);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await quotationService.getQuotationById('quote-crash');
      expect(result).toBeNull();
      warnSpy.mockRestore();
    });

    it('seedDemoBidsForQuotation: deve gerar propostas com Melhor Preço, Entrega Mais Rápida e Equivalente Ofertado', () => {
      const demoBids = quotationService.seedDemoBidsForQuotation(mockQuote);

      expect(demoBids.length).toBe(2);

      const [reseller1, reseller2] = demoBids;
      expect(reseller1.resellerTradeName).toBe('AgroCenter Linhares');
      expect(reseller1.deliveryDays).toBe(2); // Entrega Mais Rápida
      expect(reseller1.freightCost).toBe(150.00);

      expect(reseller2.resellerTradeName).toBe('Café & Campo Insumos');
      expect(reseller2.deliveryDays).toBe(5);
      expect(reseller2.freightCost).toBe(0.00); // Frete Grátis
      expect(reseller2.totalAmount).toBeLessThan(reseller1.totalAmount); // Melhor Preço Global

      // Item 1 aceita genérico: reseller2 deve ofertar equivalente com concentração
      const equivalentItem = reseller2.items[0];
      expect(equivalentItem.isEquivalent).toBe(true);
      expect(equivalentItem.brandName).toBe('Manzate 750 WG (UPL)');
      expect(equivalentItem.activeIngredientConcentration).toBe('Mancozebe 750 g/kg (75% m/m)');

      // Item 2 não aceita genérico: ambos devem ofertar o produto solicitado
      expect(reseller1.items[1].isEquivalent).toBe(false);
      expect(reseller2.items[1].isEquivalent).toBe(false);
    });

    it('seedDemoBidsForQuotation: deve usar itens padrão caso a cotação não tenha items definidos', () => {
      const emptyQuote: QuotationRequest = {
        ...mockQuote,
        items: undefined,
      };

      const demoBids = quotationService.seedDemoBidsForQuotation(emptyQuote);
      expect(demoBids.length).toBe(2);
      expect(demoBids[0].items.length).toBe(2);
    });

    it('getQuotationBids: deve retornar propostas do localStorage se já existirem', async () => {
      const testBids = quotationService.seedDemoBidsForQuotation(mockQuote);
      localStorage.setItem('cotacampo_quotation_bids', JSON.stringify(testBids));

      const retrieved = await quotationService.getQuotationBids(mockQuote.id);
      expect(retrieved.length).toBe(2);
      expect(retrieved[0].id).toBe(testBids[0].id);

      // quotationId vazio
      expect(await quotationService.getQuotationBids('')).toEqual([]);
    });

    it('getQuotationBids: deve gerar e salvar seed demo se não houver bids para a cotação', async () => {
      localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuote]));
      localStorage.removeItem('cotacampo_quotation_bids');

      const bids = await quotationService.getQuotationBids(mockQuote.id);
      expect(bids.length).toBe(2);

      // Deve ter persistido no localStorage
      const stored = JSON.parse(localStorage.getItem('cotacampo_quotation_bids') || '[]');
      expect(stored.length).toBe(2);
    });

    it('getQuotationBids: deve tratar erro ao ler localStorage', async () => {
      localStorage.setItem('cotacampo_quotation_bids', 'corrupted-json{');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const bids = await quotationService.getQuotationBids('some-id');
      expect(bids).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('saveBid: deve salvar e atualizar propostas no cache local e no Supabase', async () => {
      const [bid1] = quotationService.seedDemoBidsForQuotation(mockQuote);

      // Inserção
      await quotationService.saveBid(bid1);
      let list = JSON.parse(localStorage.getItem('cotacampo_quotation_bids') || '[]');
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(bid1.id);

      // Atualização
      const updatedBid = { ...bid1, totalAmount: 999.50 };
      await quotationService.saveBid(updatedBid);
      list = JSON.parse(localStorage.getItem('cotacampo_quotation_bids') || '[]');
      expect(list.length).toBe(1);
      expect(list[0].totalAmount).toBe(999.50);

      // Tratamento de erro no localStorage
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await quotationService.saveBid(bid1);
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao salvar bid no localStorage:', expect.any(Error));
      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('saveBid: deve sincronizar com Supabase se configurado', async () => {
      const [bid1] = quotationService.seedDemoBidsForQuotation(mockQuote);

      const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: upsertMock,
      } as unknown as ReturnType<typeof supabase.from>);

      await quotationService.saveBid(bid1);
      expect(upsertMock).toHaveBeenCalled();

      // Tratamento de falha no Supabase
      vi.spyOn(supabase, 'from').mockReturnValueOnce({
        upsert: vi.fn().mockRejectedValueOnce(new Error('DB upsert error')),
      } as unknown as ReturnType<typeof supabase.from>);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await quotationService.saveBid(bid1);
      expect(warnSpy).toHaveBeenCalledWith('Erro ao sincronizar bid com Supabase:', expect.any(Error));
      warnSpy.mockRestore();
    });

    it('calculateComparativeAnalysis: deve identificar corretamente Melhor Preço Global e Entrega Mais Rápida', () => {
      const bids = quotationService.seedDemoBidsForQuotation(mockQuote);
      const analysis = quotationService.calculateComparativeAnalysis(mockQuote, bids);

      // Menor totalAmount deve ser Café & Campo (reseller 2)
      expect(analysis.bestPriceBidId).toBe(bids[1].id);

      // Menor deliveryDays deve ser AgroCenter (reseller 1)
      expect(analysis.fastestDeliveryBidId).toBe(bids[0].id);

      // Caso com lista vazia
      const emptyAnalysis = quotationService.calculateComparativeAnalysis(mockQuote, []);
      expect(emptyAnalysis.bestPriceBidId).toBeNull();
      expect(emptyAnalysis.fastestDeliveryBidId).toBeNull();
    });

    it('calculateComparativeAnalysis: revenda com menor preço e menor prazo deve receber ambos os destaques', () => {
      const singleSuperBid = {
        ...quotationService.seedDemoBidsForQuotation(mockQuote)[0],
        id: 'super-bid-1',
        totalAmount: 500,
        deliveryDays: 1,
      };
      const regularBid = {
        ...quotationService.seedDemoBidsForQuotation(mockQuote)[1],
        id: 'regular-bid-2',
        totalAmount: 1200,
        deliveryDays: 7,
      };

      const analysis = quotationService.calculateComparativeAnalysis(mockQuote, [singleSuperBid, regularBid]);
      expect(analysis.bestPriceBidId).toBe('super-bid-1');
      expect(analysis.fastestDeliveryBidId).toBe('super-bid-1');
    });

    it('acceptBid: deve marcar a proposta como ACCEPTED, as outras como REJECTED e cotação como AWARDED', async () => {
      localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuote]));
      const bids = quotationService.seedDemoBidsForQuotation(mockQuote);
      localStorage.setItem('cotacampo_quotation_bids', JSON.stringify(bids));

      await quotationService.acceptBid(mockQuote.id, bids[0].id);

      const updatedBids: typeof bids = JSON.parse(localStorage.getItem('cotacampo_quotation_bids') || '[]');
      expect(updatedBids.find((b) => b.id === bids[0].id)?.status).toBe('ACCEPTED');
      expect(updatedBids.find((b) => b.id === bids[1].id)?.status).toBe('REJECTED');

      const updatedQuote = await quotationService.getQuotationById(mockQuote.id);
      expect(updatedQuote?.status).toBe('AWARDED');
    });

    describe('US10 – WhatsApp URL & Proposal Awarding', () => {
      it('generateWhatsAppUrl: deve formatar mensagem exata e sanitizar telefone com DDI 55', () => {
        const url = quotationService.generateWhatsAppUrl({
          rtvName: 'Carlos Eduardo Mendes',
          rtvPhone: '(27) 99888-7711',
          quotationCode: 'COT-009',
          totalAmount: 8400.0,
        });

        const expectedText =
          'Olá Carlos Eduardo Mendes, aceitei sua proposta para a Cotação #COT-009 no CotaCampo no valor total de R$ 8.400,00. Vamos finalizar o pedido e o faturamento?';
        const expectedUrl = `https://wa.me/5527998887711?text=${encodeURIComponent(expectedText)}`;

        expect(url).toBe(expectedUrl);
      });

      it('generateWhatsAppUrl: não deve duplicar o prefixo 55 se o telefone já o contiver', () => {
        const url = quotationService.generateWhatsAppUrl({
          rtvName: 'Renata Viana',
          rtvPhone: '+55 27 99777-6622',
          quotationCode: 'COT-010',
          totalAmount: 1520.5,
        });

        expect(url).toContain('https://wa.me/5527997776622?text=');
        expect(url).toContain(encodeURIComponent('R$ 1.520,50'));
      });

      it('acceptFullLot: deve marcar proposta vencedora como ACCEPTED e FULL, as demais REJECTED e cotação AWARDED', async () => {
        localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuote]));
        const bids = quotationService.seedDemoBidsForQuotation(mockQuote);
        localStorage.setItem('cotacampo_quotation_bids', JSON.stringify(bids));

        const result = await quotationService.acceptFullLot(mockQuote.id, bids[0].id);

        expect(result.id).toBe(bids[0].id);

        const updatedQuote = await quotationService.getQuotationById(mockQuote.id);
        expect(updatedQuote?.status).toBe('AWARDED');

        const updatedBids = await quotationService.getQuotationBids(mockQuote.id);
        const winningBid = updatedBids.find((b) => b.id === bids[0].id);
        const losingBid = updatedBids.find((b) => b.id === bids[1].id);

        expect(winningBid?.status).toBe('ACCEPTED');
        expect(winningBid?.awardType).toBe('FULL');
        expect(winningBid?.items.every((it) => it.isAwarded)).toBe(true);

        expect(losingBid?.status).toBe('REJECTED');
        expect(losingBid?.awardType).toBe('NONE');
        expect(losingBid?.items.every((it) => !it.isAwarded)).toBe(true);
      });

      it('acceptFullLot: deve lidar com cotação inexistente', async () => {
        localStorage.setItem('cotacampo_quotations', JSON.stringify([]));
        await expect(quotationService.acceptFullLot('inexistent-quote', 'bid-1')).rejects.toThrow();
      });

      it('acceptFullLot: deve sincronizar com Supabase e tratar falha graciosamente', async () => {
        localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuote]));
        const bids = quotationService.seedDemoBidsForQuotation(mockQuote);
        localStorage.setItem('cotacampo_quotation_bids', JSON.stringify(bids));

        // Mock do Supabase com sucesso
        const upsertMock = vi.fn().mockResolvedValue({ error: null });
        vi.spyOn(supabase, 'from').mockReturnValue({
          upsert: upsertMock,
        } as unknown as ReturnType<typeof supabase.from>);

        await quotationService.acceptFullLot(mockQuote.id, bids[0].id);
        expect(upsertMock).toHaveBeenCalled();

        // Mock com falha no Supabase
        vi.spyOn(supabase, 'from').mockReturnValue({
          upsert: vi.fn().mockRejectedValueOnce(new Error('Remote DB error')),
        } as unknown as ReturnType<typeof supabase.from>);

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await quotationService.acceptFullLot(mockQuote.id, bids[0].id);
        expect(warnSpy).toHaveBeenCalledWith(
          'Erro ao sincronizar bid com Supabase:',
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });

      it('acceptPartialItems: deve associar itens a propostas vencedoras distintas e definir cotação como AWARDED', async () => {
        localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuote]));
        const bids = quotationService.seedDemoBidsForQuotation(mockQuote);
        localStorage.setItem('cotacampo_quotation_bids', JSON.stringify(bids));

        // Seleciona item-1 da revenda 1 e item-2 da revenda 2
        const selections = {
          'item-1': bids[0].id,
          'item-2': bids[1].id,
        };

        const result = await quotationService.acceptPartialItems(mockQuote.id, selections);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);

        const updatedQuote = await quotationService.getQuotationById(mockQuote.id);
        expect(updatedQuote?.status).toBe('AWARDED');

        const updatedBids = await quotationService.getQuotationBids(mockQuote.id);
        const bid1 = updatedBids.find((b) => b.id === bids[0].id);
        const bid2 = updatedBids.find((b) => b.id === bids[1].id);

        expect(bid1?.status).toBe('PARTIALLY_ACCEPTED');
        expect(bid1?.awardType).toBe('PARTIAL');
        expect(bid1?.items.find((it) => it.quotationItemId === 'item-1')?.isAwarded).toBe(true);
        expect(bid1?.items.find((it) => it.quotationItemId === 'item-2')?.isAwarded).toBe(false);

        expect(bid2?.status).toBe('PARTIALLY_ACCEPTED');
        expect(bid2?.awardType).toBe('PARTIAL');
        expect(bid2?.items.find((it) => it.quotationItemId === 'item-2')?.isAwarded).toBe(true);
        expect(bid2?.items.find((it) => it.quotationItemId === 'item-1')?.isAwarded).toBe(false);
      });

      it('acceptPartialItems: revenda com nenhum item selecionado deve ser REJECTED', async () => {
        localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuote]));
        const bids = quotationService.seedDemoBidsForQuotation(mockQuote);
        localStorage.setItem('cotacampo_quotation_bids', JSON.stringify(bids));

        // Seleciona apenas itens da revenda 1
        const selections = {
          'item-1': bids[0].id,
        };

        const result = await quotationService.acceptPartialItems(mockQuote.id, selections);
        expect(result.length).toBe(1);

        const updatedBids = await quotationService.getQuotationBids(mockQuote.id);
        const bid2 = updatedBids.find((b) => b.id === bids[1].id);
        expect(bid2?.status).toBe('REJECTED');
        expect(bid2?.awardType).toBe('NONE');
      });

      it('acceptPartialItems: revenda com todos os itens contemplados deve ser marcada como FULL e ACCEPTED', async () => {
        localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuote]));
        const bids = quotationService.seedDemoBidsForQuotation(mockQuote);
        localStorage.setItem('cotacampo_quotation_bids', JSON.stringify(bids));

        // Seleciona todos os itens da revenda 1
        const selections = {
          'item-1': bids[0].id,
          'item-2': bids[0].id,
        };

        await quotationService.acceptPartialItems(mockQuote.id, selections);
        const updatedBids = await quotationService.getQuotationBids(mockQuote.id);
        const bid1 = updatedBids.find((b) => b.id === bids[0].id);
        expect(bid1?.status).toBe('ACCEPTED');
        expect(bid1?.awardType).toBe('FULL');
      });

      it('acceptPartialItems: deve lançar erro para cotação inexistente', async () => {
        localStorage.setItem('cotacampo_quotations', JSON.stringify([]));
        await expect(quotationService.acceptPartialItems('inexistent-quote', {})).rejects.toThrow();
      });

      it('acceptPartialItems: deve sincronizar com Supabase e tratar erro com console.warn', async () => {
        localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuote]));
        const bids = quotationService.seedDemoBidsForQuotation(mockQuote);
        localStorage.setItem('cotacampo_quotation_bids', JSON.stringify(bids));

        vi.spyOn(supabase, 'from').mockReturnValue({
          upsert: vi.fn().mockRejectedValue(new Error('Partial Supabase sync failed')),
        } as unknown as ReturnType<typeof supabase.from>);

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await quotationService.acceptPartialItems(mockQuote.id, { 'item-1': bids[0].id });
        expect(warnSpy).toHaveBeenCalledWith(
          'Erro ao sincronizar bid com Supabase:',
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });

      it('getAwardedResellersSummary: deve retornar resumo com URL de WhatsApp para propostas completas e parciais', () => {
        const bids = quotationService.seedDemoBidsForQuotation(mockQuote);

        // Caso 1: Nenhuma proposta premiada
        expect(quotationService.getAwardedResellersSummary(mockQuote, bids)).toEqual([]);

        // Caso 2: Aceite do Lote Completo
        const fullLotBids = bids.map((b, idx) => ({
          ...b,
          status: (idx === 0 ? 'ACCEPTED' : 'REJECTED') as BidStatus,
          awardType: (idx === 0 ? 'FULL' : 'NONE') as BidAwardType,
          items: b.items.map((it) => ({ ...it, isAwarded: idx === 0 })),
        }));

        const summaries = quotationService.getAwardedResellersSummary(mockQuote, fullLotBids);
        expect(summaries.length).toBe(1);
        expect(summaries[0].bidId).toBe(bids[0].id);
        expect(summaries[0].rtvName).toBe(bids[0].rtvName);
        expect(summaries[0].whatsAppUrl).toContain('https://wa.me/');
        expect(summaries[0].awardedItems.length).toBe(2);

        // Caso 3: Aceite Parcial com ambas as revendas
        const partialBids = bids.map((b, idx) => ({
          ...b,
          status: 'PARTIALLY_ACCEPTED' as const,
          awardType: 'PARTIAL' as const,
          items: b.items.map((it, itIdx) => ({ ...it, isAwarded: itIdx === idx })),
        }));

        const partialSummaries = quotationService.getAwardedResellersSummary(mockQuote, partialBids);
        expect(partialSummaries.length).toBe(2);
        expect(partialSummaries[0].awardedItems.length).toBe(1);
        expect(partialSummaries[1].awardedItems.length).toBe(1);
      });
    });
  });
});



import {
  ProducerFarm,
  QuotationDraft,
  QuotationMetrics,
  QuotationNotification,
  QuotationRequest,
  QuotationBid,
  QuotationBidItem,
  ComparativeAnalysis,
  AwardedResellerSummary,
} from '../types/quotation';
import { ProducerProfile, SupportedState } from '../types/user';
import { Step3CommercialSchema } from '../schemas/quotation-wizard.schema';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'cotacampo_quotations';
const DRAFT_STORAGE_KEY = 'cotacampo_quotation_draft';
const FLASH_MESSAGE_KEY = 'cotacampo_flash_message';
const NOTIFICATIONS_STORAGE_KEY = 'cotacampo_quotation_notifications';
const BIDS_STORAGE_KEY = 'cotacampo_quotation_bids';

export const quotationService = {
  /**
   * Salva o rascunho temporário do wizard de cotação
   */
  saveDraft(draft: QuotationDraft): void {
    if (typeof window === 'undefined') return;
    try {
      const updated = {
        ...draft,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar rascunho:', e);
    }
  },

  /**
   * Recupera o rascunho atual da cotação
   */
  getDraft(): QuotationDraft | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as QuotationDraft;
      }
    } catch {
      return null;
    }
    return null;
  },

  /**
   * Limpa o rascunho temporário
   */
  clearDraft(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.error('Erro ao limpar rascunho:', e);
    }
  },

  /**
   * Retorna a lista de fazendas/propriedades cadastradas do produtor
   */
  getProducerFarms(user?: ProducerProfile | null): ProducerFarm[] {
    if (!user) {
      return [
        {
          id: 'farm_primary',
          name: 'Fazenda Santa Clara',
          city: 'Linhares',
          state: 'ES',
        },
      ];
    }

    const farms: ProducerFarm[] = [
      {
        id: 'farm_primary',
        name: user.farmName || 'Fazenda Principal',
        city: user.city || 'Linhares',
        state: user.state || 'ES',
      },
    ];

    return farms;
  },

  /**
   * Recupera de forma síncrona as cotações salvas no cache local
   */

  getLocalQuotations(producerId: string): QuotationRequest[] {
    if (typeof window === 'undefined' || !producerId) return [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QuotationRequest[];
        return parsed.filter((q) => q.producerId === producerId);
      }
    } catch {
      return [];
    }
    return [];
  },

  /**
   * Calcula de forma síncrona as métricas do produtor baseado no cache local
   */
  getLocalMetrics(producerId: string): QuotationMetrics {
    const quotes = this.getLocalQuotations(producerId);
    return {
      openCount: quotes.filter((q) => q.status === 'OPEN').length,
      inReviewCount: quotes.filter((q) => q.status === 'IN_REVIEW').length,
      awardedCount: quotes.filter((q) => q.status === 'AWARDED').length,
      totalCount: quotes.length,
    };
  },

  /**
   * Recupera todas as cotações associadas a um produtor (local + Supabase)
   */
  async getProducerQuotations(producerId: string, options?: { skipRemote?: boolean }): Promise<QuotationRequest[]> {
    const localQuotes = this.getLocalQuotations(producerId);

    if (options?.skipRemote || !isSupabaseConfigured || typeof window === 'undefined') {
      return localQuotes;
    }

    try {
      // Timeout seguro para evitar travamento em caso de latência de rede
      const fetchPromise = supabase
        .from('quotation_requests')
        .select(`
          id,
          producer_id,
          title,
          status,
          target_state,
          target_city,
          deadline,
          notes,
          created_at,
          updated_at,
          quotation_items (id, category_id, product_name, quantity, unit),
          quotation_bids (id, total_amount, status, delivery_days)
        `)
        .eq('producer_id', producerId)
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 1500)
      );

      const response = (await Promise.race([fetchPromise, timeoutPromise])) as {
        data: Record<string, unknown>[] | null;
        error: Error | null;
      };

      if (response.error || !response.data) {
        return localQuotes;
      }

      const remoteQuotes: QuotationRequest[] = response.data.map((item: Record<string, unknown>) => {
        const rawItems = (item.quotation_items as Array<Record<string, unknown>>) || [];
        const rawBids = (item.quotation_bids as Array<Record<string, unknown>>) || [];

        return {
          id: String(item.id),
          producerId: String(item.producer_id),
          title: String(item.title),
          status: item.status as QuotationRequest['status'],
          targetState: item.target_state as QuotationRequest['targetState'],
          targetCity: String(item.target_city),
          deadline: String(item.deadline),
          notes: item.notes ? String(item.notes) : undefined,
          itemsCount: rawItems.length,
          bidsCount: rawBids.length,
          createdAt: String(item.created_at),
          updatedAt: String(item.updated_at),
        };
      });

      // Mesclar remotas com locais sem duplicidades por ID
      const merged = [...remoteQuotes];
      for (const lq of localQuotes) {
        if (!merged.some((rq) => rq.id === lq.id)) {
          merged.push(lq);
        }
      }

      return merged;
    } catch {
      return localQuotes;
    }
  },

  /**
   * Calcula as métricas consolidadas do produtor por status
   */
  async getProducerMetrics(producerId: string, options?: { skipRemote?: boolean }): Promise<QuotationMetrics> {
    const quotations = await this.getProducerQuotations(producerId, options);

    const openCount = quotations.filter((q) => q.status === 'OPEN').length;
    const inReviewCount = quotations.filter((q) => q.status === 'IN_REVIEW').length;
    const awardedCount = quotations.filter((q) => q.status === 'AWARDED').length;

    return {
      openCount,
      inReviewCount,
      awardedCount,
      totalCount: quotations.length,
    };
  },

  /**
   * Salva ou atualiza uma cotação no cache local e dispara sincronização com Supabase
   */
  async saveQuotation(quote: QuotationRequest): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        let list: QuotationRequest[] = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((q) => q.id === quote.id);
        if (index >= 0) {
          list[index] = quote;
        } else {
          list.push(quote);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Erro ao salvar cotação no localStorage:', e);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('quotation_requests').upsert({
          id: quote.id,
          producer_id: quote.producerId,
          title: quote.title,
          status: quote.status,
          target_state: quote.targetState,
          target_city: quote.targetCity,
          deadline: quote.deadline,
          notes: quote.notes,
        });
      } catch (err) {
        console.warn('Aviso ao sincronizar cotação com Supabase:', err);
      }
    }
  },

  /**
   * Salva mensagem flash para exibição imediata após redirecionamento
   */
  setFlashMessage(message: string): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(FLASH_MESSAGE_KEY, message);
    } catch {
      // Ignorar se não suportado
    }
  },

  /**
   * Recupera a mensagem flash pendente
   */
  getFlashMessage(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(FLASH_MESSAGE_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Remove a mensagem flash
   */
  clearFlashMessage(): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(FLASH_MESSAGE_KEY);
    } catch {
      // Ignorar
    }
  },

  /**
   * Recupera a lista de notificações enviadas às revendas
   */
  getNotifications(): QuotationNotification[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Dispara notificação para as revendas que atendem o raio de entrega do município
   */
  async notifyResellers(quote: QuotationRequest): Promise<QuotationNotification[]> {
    const notification: QuotationNotification = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`,
      quotationId: quote.id,
      quotationCode: quote.displayCode,
      targetCity: quote.targetCity,
      targetState: quote.targetState,
      message: `Nova cotação #${quote.displayCode || quote.id} aberta para entrega em ${quote.targetCity}/${quote.targetState} (${quote.freightType === 'CIF' ? 'CIF - Entregue na propriedade' : 'FOB - Retirada na revenda'}). Prazo para lances: ${quote.proposalLimitHours || 48}h.`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        const list: QuotationNotification[] = stored ? JSON.parse(stored) : [];
        list.unshift(notification);
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Erro ao salvar notificação localmente:', e);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('quotation_notifications').insert({
          id: notification.id,
          quotation_id: notification.quotationId,
          target_city: notification.targetCity,
          target_state: notification.targetState,
          message: notification.message,
        });
      } catch {
        // Tabela opcional ou em migração
      }
    }

    return [notification];
  },

  /**
   * Publica uma cotação no status OPEN, calculando prazos, disparando notificações e limpando rascunho
   */
  async publishQuotation(params: {
    draft: QuotationDraft;
    user: ProducerProfile;
    commercial: Step3CommercialSchema;
  }): Promise<QuotationRequest> {
    const { draft, user, commercial } = params;

    const existingQuotes = this.getLocalQuotations(user.id);
    const codeNumber = existingQuotes.length + 1;
    const displayCode = `COT-${codeNumber.toString().padStart(3, '0')}`;

    const limitHours = commercial.proposalLimitHours || 48;
    const deadlineDate = new Date(Date.now() + limitHours * 3600 * 1000).toISOString();

    const title =
      draft.title ||
      `Insumos para ${draft.targetCropName || 'Lavoura'} - ${draft.farmName || user.farmName || 'Fazenda'}`;

    const quoteId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `quote_${Date.now()}`;

    const newQuotation: QuotationRequest = {
      id: quoteId,
      producerId: user.id,
      title,
      status: 'OPEN',
      targetState: draft.targetState || user.state || 'ES',
      targetCity: draft.targetCity || user.city || 'Linhares',
      deadline: deadlineDate,
      freightType: commercial.freightType,
      paymentTerms: commercial.paymentTerms,
      proposalLimitHours: limitHours,
      displayCode,
      notes: commercial.notes || draft.notes,
      items: draft.items || [],
      itemsCount: draft.items?.length || 0,
      bidsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Salva a cotação no cache e no banco com status OPEN
    await this.saveQuotation(newQuotation);

    // 2. Dispara a notificação para as revendas parceiras do raio do município
    await this.notifyResellers(newQuotation);

    // 3. Limpa o rascunho temporário do wizard
    this.clearDraft();

    // 4. Grava a mensagem flash para o dashboard
    this.setFlashMessage(`Cotação #${displayCode} publicada com sucesso!`);

    return newQuotation;
  },

  /**
   * Busca uma cotação pelo ID (local + Supabase)
   */
  async getQuotationById(id: string): Promise<QuotationRequest | null> {
    if (!id) return null;

    // 1. Verificar cache local
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const list: QuotationRequest[] = JSON.parse(stored);
          const found = list.find((q) => q.id === id);
          if (found) return found;
        }
      } catch (e) {
        console.error('Erro ao ler cotação do localStorage:', e);
      }
    }

    // 2. Verificar Supabase se configurado
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('quotation_requests')
          .select(`
            id,
            producer_id,
            title,
            status,
            target_state,
            target_city,
            deadline,
            freight_type,
            payment_terms,
            proposal_limit_hours,
            notes,
            created_at,
            updated_at,
            quotation_items (id, category_id, product_name, active_ingredient, quantity, unit, accepts_generic),
            quotation_bids (id, total_amount, freight_cost, status, delivery_days)
          `)
          .eq('id', id)
          .single();

        if (data && !error) {
          const rawItems = (data.quotation_items as Array<Record<string, unknown>>) || [];
          const rawBids = (data.quotation_bids as Array<Record<string, unknown>>) || [];

          return {
            id: String(data.id),
            producerId: String(data.producer_id),
            title: String(data.title),
            status: data.status as QuotationRequest['status'],
            targetState: data.target_state as QuotationRequest['targetState'],
            targetCity: String(data.target_city),
            deadline: String(data.deadline),
            freightType: data.freight_type as QuotationRequest['freightType'],
            paymentTerms: data.payment_terms ? String(data.payment_terms) : undefined,
            proposalLimitHours: typeof data.proposal_limit_hours === 'number' ? data.proposal_limit_hours : undefined,
            notes: data.notes ? String(data.notes) : undefined,
            items: rawItems.map((it) => ({
              id: String(it.id),
              quotationId: String(data.id),
              categoryId: it.category_id ? String(it.category_id) : undefined,
              productName: String(it.product_name),
              activeIngredient: it.active_ingredient ? String(it.active_ingredient) : undefined,
              quantity: Number(it.quantity) || 1,
              unit: String(it.unit),
              acceptsGeneric: Boolean(it.accepts_generic),
            })),
            itemsCount: rawItems.length,
            bidsCount: rawBids.length,
            createdAt: String(data.created_at),
            updatedAt: String(data.updated_at),
          };
        }
      } catch (err) {
        console.warn('Erro ao buscar cotação remota:', err);
      }
    }

    return null;
  },

  /**
   * Recupera todas as propostas/bids de uma cotação (localStorage + Supabase)
   */
  async getQuotationBids(quotationId: string): Promise<QuotationBid[]> {
    if (!quotationId) return [];

    let bids: QuotationBid[] = [];

    // 1. Tentar ler do localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(BIDS_STORAGE_KEY);
        if (stored) {
          const allBids: QuotationBid[] = JSON.parse(stored);
          bids = allBids.filter((b) => b.quotationId === quotationId);
        }
      } catch (e) {
        console.error('Erro ao ler bids do localStorage:', e);
      }
    }

    // Se já existem propostas cadastradas para esta cotação, retorna elas
    if (bids.length > 0) {
      return bids;
    }

    // 2. Se não há propostas no localStorage, tenta buscar a cotação para verificar se podemos gerar seed demo
    const quotation = await this.getQuotationById(quotationId);
    if (quotation) {
      const demoBids = this.seedDemoBidsForQuotation(quotation);
      if (demoBids.length > 0) {
        for (const db of demoBids) {
          await this.saveBid(db);
        }
        return demoBids;
      }
    }

    return [];
  },

  /**
   * Gera propostas de demonstração para a cotação com revendas locais (Linhares, Colatina)
   * Cenário 1: 2+ revendas com preços, frete discriminado e prazos distintos
   * Cenário 2: Oferta de produto equivalente para itens com "acceptsGeneric: true"
   */
  seedDemoBidsForQuotation(quotation: QuotationRequest): QuotationBid[] {
    const items = quotation.items && quotation.items.length > 0
      ? quotation.items
      : [
          {
            id: 'item_default_1',
            productName: 'Fungicida Dithane NT',
            activeIngredient: 'Mancozebe',
            quantity: 50,
            unit: 'Kg',
            acceptsGeneric: true,
          },
          {
            id: 'item_default_2',
            productName: 'Adubo NPK 20-05-20',
            activeIngredient: 'Nitrogênio, Fósforo, Potássio',
            quantity: 2000,
            unit: 'Kg',
            acceptsGeneric: false,
          },
        ];

    // Revenda 1: AgroCenter Linhares (Entrega mais rápida: 2 dias, mas frete e preços unitários padrão)
    const bid1Items: QuotationBidItem[] = items.map((it, idx) => {
      const basePrice = idx === 0 ? 82.50 : 3.80;
      const unitPrice = basePrice;
      return {
        id: `bid_item_1_${idx + 1}`,
        quotationItemId: it.id,
        productName: it.productName,
        brandName: it.productName,
        unitPrice,
        totalPrice: Number((unitPrice * it.quantity).toFixed(2)),
        isEquivalent: false,
        activeIngredientConcentration: it.activeIngredient ? `${it.activeIngredient} Concentrado Padrão` : undefined,
      };
    });
    const subtotal1 = bid1Items.reduce((acc, it) => acc + it.totalPrice, 0);
    const freight1 = 150.00;
    const total1 = Number((subtotal1 + freight1).toFixed(2));

    const bid1: QuotationBid = {
      id: `bid_${quotation.id}_reseller_1`,
      quotationId: quotation.id,
      resellerId: 'reseller_agrocenter_linhares',
      resellerName: 'AgroCenter Comércio de Insumos Agrícolas Ltda',
      resellerTradeName: 'AgroCenter Linhares',
      resellerCity: 'Linhares',
      resellerState: 'ES',
      rtvName: 'Carlos Eduardo Mendes',
      rtvPhone: '27998887711',
      items: bid1Items,
      freightCost: freight1,
      deliveryDays: 2, // Entrega Mais Rápida
      totalAmount: total1,
      status: 'SUBMITTED',
      awardType: 'NONE',
      notes: 'Entrega imediata em Linhares e região com frota própria.',
      createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    };

    // Revenda 2: Café & Campo Insumos (Melhor Preço Global: preços mais baixos, frete grátis, 5 dias, e oferece produto equivalente se aceitar genérico)
    const bid2Items: QuotationBidItem[] = items.map((it, idx) => {
      if (it.acceptsGeneric) {
        // Cenário 2: Produto equivalente ofertado com auditoria do princípio ativo
        const unitPrice = idx === 0 ? 69.90 : 3.40;
        return {
          id: `bid_item_2_${idx + 1}`,
          quotationItemId: it.id,
          productName: it.productName,
          brandName: 'Manzate 750 WG (UPL)',
          unitPrice,
          totalPrice: Number((unitPrice * it.quantity).toFixed(2)),
          isEquivalent: true,
          activeIngredientConcentration: 'Mancozebe 750 g/kg (75% m/m)',
          notes: 'Produto equivalente registrado no MAPA com idêntica eficácia agronômica.',
        };
      }
      const unitPrice = idx === 0 ? 76.00 : 3.50;
      return {
        id: `bid_item_2_${idx + 1}`,
        quotationItemId: it.id,
        productName: it.productName,
        brandName: it.productName,
        unitPrice,
        totalPrice: Number((unitPrice * it.quantity).toFixed(2)),
        isEquivalent: false,
      };
    });
    const subtotal2 = bid2Items.reduce((acc, it) => acc + it.totalPrice, 0);
    const freight2 = 0.00; // Frete Grátis
    const total2 = Number((subtotal2 + freight2).toFixed(2));

    const bid2: QuotationBid = {
      id: `bid_${quotation.id}_reseller_2`,
      quotationId: quotation.id,
      resellerId: 'reseller_cafe_campo',
      resellerName: 'Café & Campo Distribuidora Agropecuária Ltda',
      resellerTradeName: 'Café & Campo Insumos',
      resellerCity: 'Colatina',
      resellerState: 'ES',
      rtvName: 'Renata Viana',
      rtvPhone: '27997776622',
      items: bid2Items,
      freightCost: freight2,
      deliveryDays: 5,
      totalAmount: total2, // Menor Preço Global
      status: 'SUBMITTED',
      awardType: 'NONE',
      notes: 'Frete cortesia para pedidos de lote completo. Pagamento 30/60 dias.',
      createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    };

    return [bid1, bid2];
  },

  /**
   * Salva ou atualiza uma proposta (bid) no cache local e no Supabase
   */
  async saveBid(bid: QuotationBid): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(BIDS_STORAGE_KEY);
        let list: QuotationBid[] = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((b) => b.id === bid.id);
        if (index >= 0) {
          list[index] = bid;
        } else {
          list.push(bid);
        }
        localStorage.setItem(BIDS_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Erro ao salvar bid no localStorage:', e);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('quotation_bids').upsert({
          id: bid.id,
          quotation_id: bid.quotationId,
          reseller_id: bid.resellerId,
          total_amount: bid.totalAmount,
          freight_cost: bid.freightCost,
          delivery_days: bid.deliveryDays,
          status: bid.status,
          award_type: bid.awardType || 'NONE',
          rtv_name: bid.rtvName,
          rtv_phone: bid.rtvPhone,
          notes: bid.notes,
          payment_method: bid.paymentMethod,
          validity_hours: bid.validityHours,
          barter_bags_count: bid.barterBagsCount,
        });

        if (bid.items && bid.items.length > 0) {
          for (const item of bid.items) {
            await supabase.from('quotation_bid_items').upsert({
              id: item.id,
              bid_id: bid.id,
              quotation_item_id: item.quotationItemId,
              product_name: item.productName,
              brand_name: item.brandName,
              unit_price: item.unitPrice,
              total_price: item.totalPrice,
              is_equivalent: item.isEquivalent,
              active_ingredient_concentration: item.activeIngredientConcentration,
              is_awarded: item.isAwarded || false,
              notes: item.notes,
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar bid com Supabase:', err);
      }
    }
  },

  /**
   * Calcula a análise equalizada identificando os badges de inteligência:
   * - Menor Preço Global (menor totalAmount)
   * - Entrega Mais Rápida (menor deliveryDays)
   */
  calculateComparativeAnalysis(quotation: QuotationRequest, bids: QuotationBid[]): ComparativeAnalysis {
    if (!bids || bids.length === 0) {
      return {
        quotation,
        bids: [],
        bestPriceBidId: null,
        fastestDeliveryBidId: null,
      };
    }

    // Menor total somado
    const minAmount = Math.min(...bids.map((b) => b.totalAmount));
    const bestPriceBid = bids.find((b) => b.totalAmount === minAmount);

    // Menor prazo de entrega em dias
    const minDays = Math.min(...bids.map((b) => b.deliveryDays));
    const fastestDeliveryBid = bids.find((b) => b.deliveryDays === minDays);

    return {
      quotation,
      bids,
      bestPriceBidId: bestPriceBid ? bestPriceBid.id : null,
      fastestDeliveryBidId: fastestDeliveryBid ? fastestDeliveryBid.id : null,
    };
  },

  /**
   * Gera a URL do WhatsApp para abertura de conversa direta com o RTV
   * Mensagem pré-preenchida exata:
   * "Olá [Nome RTV], aceitei sua proposta para a Cotação #[ID] no CotaCampo no valor total de R$ [Valor]. Vamos finalizar o pedido e o faturamento?"
   */
  generateWhatsAppUrl(params: {
    rtvName: string;
    rtvPhone: string;
    quotationCode: string;
    totalAmount: number;
  }): string {
    const { rtvName, rtvPhone, quotationCode, totalAmount } = params;

    const cleanPhone = rtvPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const formattedAmount = totalAmount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const message = `Olá ${rtvName}, aceitei sua proposta para a Cotação #${quotationCode} no CotaCampo no valor total de R$ ${formattedAmount}. Vamos finalizar o pedido e o faturamento?`;

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
  },

  /**
   * Consolida as revendas e RTVs premiados (lote completo ou parcial)
   */
  getAwardedResellersSummary(
    quotation: QuotationRequest,
    bids: QuotationBid[]
  ): AwardedResellerSummary[] {
    const awardedBids = bids.filter(
      (b) =>
        b.status === 'ACCEPTED' ||
        b.status === 'PARTIALLY_ACCEPTED' ||
        b.items.some((it) => it.isAwarded)
    );

    return awardedBids.map((b) => {
      const isFull = b.awardType === 'FULL' || b.status === 'ACCEPTED';
      const awardedItems = isFull
        ? b.items
        : b.items.filter((it) => it.isAwarded);

      const subtotal = awardedItems.reduce((acc, it) => acc + it.totalPrice, 0);
      const freight = isFull ? b.freightCost : 0;
      const total = Number((subtotal + freight).toFixed(2));

      const rtvName = b.rtvName || 'Representante Comercial';
      const rtvPhone = b.rtvPhone || '27998887711';
      const quotationCode = quotation.displayCode || quotation.id.slice(0, 8);

      const whatsAppUrl = this.generateWhatsAppUrl({
        rtvName,
        rtvPhone,
        quotationCode,
        totalAmount: total,
      });

      return {
        bidId: b.id,
        resellerId: b.resellerId,
        resellerName: b.resellerName,
        resellerTradeName: b.resellerTradeName,
        rtvName,
        rtvPhone,
        awardedItems,
        subtotal,
        freightCost: freight,
        totalAmount: total,
        whatsAppUrl,
      };
    });
  },

  /**
   * US10 Cenário 1: Aceite do Lote Completo de uma revenda
   */
  async acceptFullLot(quotationId: string, bidId: string): Promise<QuotationBid> {
    const bids = await this.getQuotationBids(quotationId);
    let winningBid: QuotationBid | null = null;

    for (const b of bids) {
      if (b.id === bidId) {
        b.status = 'ACCEPTED';
        b.awardType = 'FULL';
        b.items = b.items.map((it) => ({ ...it, isAwarded: true }));
        winningBid = b;
      } else {
        b.status = 'REJECTED';
        b.awardType = 'NONE';
        b.items = b.items.map((it) => ({ ...it, isAwarded: false }));
      }
      await this.saveBid(b);
    }

    const quotation = await this.getQuotationById(quotationId);
    if (quotation) {
      quotation.status = 'AWARDED';
      quotation.updatedAt = new Date().toISOString();
      await this.saveQuotation(quotation);
    }

    if (!winningBid) {
      throw new Error(`Proposta com ID ${bidId} não encontrada.`);
    }

    return winningBid;
  },

  /**
   * US10 Cenário 2: Aceite Parcial (Item a Item)
   * itemSelections: mapa de quotationItemId (ou id do item) para o bidId escolhido
   */
  async acceptPartialItems(
    quotationId: string,
    itemSelections: Record<string, string>
  ): Promise<AwardedResellerSummary[]> {
    const bids = await this.getQuotationBids(quotationId);
    const quotation = await this.getQuotationById(quotationId);
    if (!quotation) throw new Error(`Cotação ${quotationId} não encontrada.`);

    for (const b of bids) {
      let awardedCount = 0;
      b.items = b.items.map((it) => {
        const isChosenForThisBid =
          (it.quotationItemId && itemSelections[it.quotationItemId] === b.id) ||
          itemSelections[it.id] === b.id;

        if (isChosenForThisBid) {
          awardedCount++;
          return { ...it, isAwarded: true };
        }
        return { ...it, isAwarded: false };
      });

      if (awardedCount === b.items.length && b.items.length > 0) {
        b.status = 'ACCEPTED';
        b.awardType = 'FULL';
      } else if (awardedCount > 0) {
        b.status = 'PARTIALLY_ACCEPTED';
        b.awardType = 'PARTIAL';
      } else {
        b.status = 'REJECTED';
        b.awardType = 'NONE';
      }

      await this.saveBid(b);
    }

    quotation.status = 'AWARDED';
    quotation.updatedAt = new Date().toISOString();
    await this.saveQuotation(quotation);

    return this.getAwardedResellersSummary(quotation, bids);
  },

  /**
   * Aceita uma proposta vencedora (compatibilidade com US09 delegando para acceptFullLot)
   */
  async acceptBid(quotationId: string, acceptedBidId: string): Promise<void> {
    await this.acceptFullLot(quotationId, acceptedBidId);
  },

  /**
   * US14: Emite notificação para o produtor quando uma proposta é recebida
   */
  async notifyProducerOnBidReceived(
    quotation: QuotationRequest,
    bid: QuotationBid
  ): Promise<QuotationNotification> {
    const notification: QuotationNotification = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`,
      quotationId: quotation.id,
      quotationCode: quotation.displayCode,
      targetCity: quotation.targetCity,
      targetState: quotation.targetState,
      message: `Proposta recebida da revenda ${bid.resellerTradeName || bid.resellerName} para a cotação #${quotation.displayCode || quotation.id.slice(0, 8)}. Total: R$ ${bid.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        const list: QuotationNotification[] = stored ? JSON.parse(stored) : [];
        list.unshift(notification);
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Erro ao salvar notificação localmente:', e);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('quotation_notifications').insert({
          id: notification.id,
          quotation_id: notification.quotationId,
          target_city: notification.targetCity,
          target_state: notification.targetState,
          message: notification.message,
        });
      } catch {
        // Fallback resiliente
      }
    }

    return notification;
  },

  /**
   * US14: Envio de Proposta pelo Revendedor (RTV)
   * Registra a oferta com status 'SUBMITTED', atualiza contador de propostas da cotação,
   * salva no storage local e Supabase, e emite notificação para o produtor.
   */
  async submitBid(params: {
    quotationId: string;
    resellerId: string;
    resellerName: string;
    resellerTradeName?: string;
    resellerCity?: string;
    resellerState?: string;
    rtvName?: string;
    rtvPhone?: string;
    items: QuotationBidItem[];
    freightCost: number;
    deliveryDays: number;
    validityHours: number;
    paymentMethod: 'AVISTA' | 'PRAZO_30' | 'PRAZO_60' | 'BARTER';
    barterBagsCount?: number;
    notes?: string;
  }): Promise<QuotationBid> {
    const subtotal = params.items.reduce((acc, it) => acc + it.totalPrice, 0);
    const totalAmount = Number((subtotal + params.freightCost).toFixed(2));
    const bidId = `bid_${params.quotationId}_${params.resellerId}_${Date.now()}`;

    const newBid: QuotationBid = {
      id: bidId,
      quotationId: params.quotationId,
      resellerId: params.resellerId,
      resellerName: params.resellerName,
      resellerTradeName: params.resellerTradeName,
      resellerCity: params.resellerCity || 'Linhares',
      resellerState: (params.resellerState as SupportedState) || 'ES',
      rtvName: params.rtvName,
      rtvPhone: params.rtvPhone,
      items: params.items,
      freightCost: params.freightCost,
      deliveryDays: params.deliveryDays,
      validityHours: params.validityHours,
      paymentMethod: params.paymentMethod,
      barterBagsCount: params.barterBagsCount,
      totalAmount,
      status: 'SUBMITTED',
      awardType: 'NONE',
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    await this.saveBid(newBid);

    const quotation = await this.getQuotationById(params.quotationId);
    if (quotation) {
      quotation.bidsCount = (quotation.bidsCount || 0) + 1;
      quotation.updatedAt = new Date().toISOString();
      await this.saveQuotation(quotation);
      await this.notifyProducerOnBidReceived(quotation, newBid);
    }

    return newBid;
  },
};

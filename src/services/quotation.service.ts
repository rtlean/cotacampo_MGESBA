import { ProducerFarm, QuotationDraft, QuotationMetrics, QuotationNotification, QuotationRequest } from '../types/quotation';
import { ProducerProfile } from '../types/user';
import { Step3CommercialSchema } from '../schemas/quotation-wizard.schema';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'cotacampo_quotations';
const DRAFT_STORAGE_KEY = 'cotacampo_quotation_draft';
const FLASH_MESSAGE_KEY = 'cotacampo_flash_message';
const NOTIFICATIONS_STORAGE_KEY = 'cotacampo_quotation_notifications';

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
};

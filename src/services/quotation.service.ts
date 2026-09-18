import { QuotationMetrics, QuotationRequest } from '../types/quotation';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'cotacampo_quotations';

export const quotationService = {
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
};

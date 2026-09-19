import React, { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import {
  ArrowLeft,
  Award,
  Zap,
  Truck,
  Info,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';
import { quotationService } from '../services/quotation.service';
import {
  QuotationRequest,
  QuotationBid,
  ComparativeAnalysis,
  QuotationBidItem,
} from '../types/quotation';

export const QuotationComparativePage: React.FC = () => {
  const [, params] = useRoute('/produtor/cotacoes/:id/comparativo');
  const quotationId = params?.id || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [quotation, setQuotation] = useState<QuotationRequest | null>(null);
  const [bids, setBids] = useState<QuotationBid[]>([]);
  const [, setAnalysis] = useState<ComparativeAnalysis | null>(null);
  const [activeTooltipItem, setActiveTooltipItem] = useState<string | null>(null);
  const [acceptedBidId, setAcceptedBidId] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<boolean>(false);
  const [accepting, setAccepting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!quotationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 1. Carrega a cotação
        const quote = await quotationService.getQuotationById(quotationId);
        if (!quote && isMounted) {
          setLoading(false);
          return;
        }

        if (quote && isMounted) {
          setQuotation(quote);

          // 2. Carrega as propostas (bids) das revendas
          const fetchedBids = await quotationService.getQuotationBids(quotationId);
          setBids(fetchedBids);

          // 3. Calcula a análise equalizada
          const comparative = quotationService.calculateComparativeAnalysis(quote, fetchedBids);
          setAnalysis(comparative);

          // Verifica se já há uma proposta aceita
          const alreadyAccepted = fetchedBids.find((b) => b.status === 'ACCEPTED');
          if (alreadyAccepted) {
            setAcceptedBidId(alreadyAccepted.id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do comparativo:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [quotationId]);

  const handleAcceptBid = async (bidId: string) => {
    if (!quotation) return;
    try {
      setAccepting(true);
      await quotationService.acceptBid(quotation.id, bidId);
      setAcceptedBidId(bidId);
      setAcceptSuccess(true);
      // Atualiza status local
      setBids((prev) =>
        prev.map((b) => ({
          ...b,
          status: b.id === bidId ? 'ACCEPTED' : 'REJECTED',
        }))
      );
      setQuotation((prev) => (prev ? { ...prev, status: 'AWARDED' } : null));
    } catch (e) {
      console.error('Erro ao aceitar proposta:', e);
    } finally {
      setAccepting(false);
    }
  };

  const formatCurrency = (val: number): string => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 bg-sand-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-agro-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium text-sm">
            Equalizando propostas e calculando melhor preço e prazo...
          </p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 bg-sand-50">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-slate-200 shadow-soft text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Cotação Não Encontrada</h2>
          <p className="text-slate-600 text-sm">
            Não localizamos a cotação com o identificador informado. Verifique se o link está correto.
          </p>
          <div className="pt-4">
            <Link
              href="/produtor/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Painel</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const minAmount = bids.length > 0 ? Math.min(...bids.map((b) => b.totalAmount)) : 0;
  const minDays = bids.length > 0 ? Math.min(...bids.map((b) => b.deliveryDays)) : 0;

  // Se houver menos de 2 propostas (Cenário 1 requer 2 ou mais revendas distintas)
  if (bids.length < 2) {
    return (
      <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link
              href="/produtor/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Painel</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-amber-200 shadow-soft text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Layers className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Aguardando Lances Concorrentes</h2>
            <p className="text-slate-600 text-sm max-w-lg mx-auto">
              A matriz comparativa equalizada requer no mínimo <strong>2 propostas de revendas distintas</strong> para
              gerar a análise lado a lado com os badges de inteligência.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
              <span>Propostas recebidas até o momento: <strong>{bids.length}</strong></span>
            </div>
            <div className="pt-6">
              <Link
                href="/produtor/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <span>Acompanhar no Painel</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/produtor/dashboard"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
              title="Voltar ao Painel"
              aria-label="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-agro-100 text-agro-800 border border-agro-200">
                  {quotation.displayCode || `#COT-${quotation.id.slice(0, 6)}`}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(quotation.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Análise Comparativa Equalizada
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs text-xs text-slate-600 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-agro-600" />
              <span>
                Entrega: <strong>{quotation.targetCity}/{quotation.targetState}</strong>
              </span>
            </div>
            {quotation.status === 'AWARDED' && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Cotação Concluída
              </span>
            )}
          </div>
        </div>

        {/* Success Alert if Bid was Just Accepted */}
        {acceptSuccess && (
          <div
            role="status"
            className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-2xl p-4 shadow-soft flex items-center justify-between gap-4 animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Proposta Vencedora Confirmada!</h4>
                <p className="text-xs text-emerald-700">
                  A revenda selecionada foi notificada para emissão do pedido e faturamento.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAcceptSuccess(false)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 p-1.5 rounded-lg hover:bg-emerald-100"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Informative Guidance Banner */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-amber-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Inteligência de Equalização de Custos e Prazos
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                As propostas recebidas foram equalizadas na mesma base de lote (custo dos produtos + frete discriminado).
                Marcas comerciais equivalentes foram auditadas com base na concentração do princípio ativo para sua segurança.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs font-medium">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              Melhor Preço Global
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-300 text-blue-800 font-bold">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Entrega Mais Rápida
            </span>
          </div>
        </div>

        {/* COMPARATIVE MATRIX TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left" role="table" aria-label="Tabela Comparativa Equalizada de Propostas">
              {/* Reseller Headers */}
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="p-4 sm:p-5 w-72 min-w-[260px] sticky left-0 bg-slate-50/95 z-10 backdrop-blur-xs border-r border-slate-200">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Itens Solicitados
                    </div>
                    <div className="text-xs text-slate-400 font-normal mt-0.5">
                      {quotation.items?.length || 0} {(quotation.items?.length || 0) === 1 ? 'insumo cotado' : 'insumos cotados'}
                    </div>
                  </th>

                  {bids.map((bid) => {
                    const isBestPrice = bid.totalAmount === minAmount;
                    const isFastest = bid.deliveryDays === minDays;
                    const isWinner = acceptedBidId ? acceptedBidId === bid.id : isBestPrice;

                    return (
                      <th
                        key={bid.id}
                        className={`p-4 sm:p-5 min-w-[280px] align-top border-r border-slate-200 last:border-r-0 transition-colors ${
                          isWinner ? 'bg-agro-50/40' : 'bg-slate-50/50'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Reseller Name & City */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                                <span>{bid.resellerTradeName || bid.resellerName}</span>
                              </h3>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{bid.resellerCity}/{bid.resellerState}</span>
                              </p>
                            </div>
                          </div>

                          {/* AUTOMATED INTELLIGENCE BADGES */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {isBestPrice && (
                              <span
                                data-testid={`badge-best-price-${bid.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-600 text-white shadow-xs tracking-tight"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>[ Melhor Preço Global ]</span>
                              </span>
                            )}

                            {isFastest && (
                              <span
                                data-testid={`badge-fastest-delivery-${bid.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold bg-blue-600 text-white shadow-xs tracking-tight"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>[ Entrega Mais Rápida ]</span>
                              </span>
                            )}

                            {acceptedBidId === bid.id && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold bg-agro-800 text-white shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-harvest-400" />
                                <span>Proposta Aceita</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Items Rows */}
              <tbody className="divide-y divide-slate-100 text-slate-800 text-sm">
                {(quotation.items || []).map((reqItem, itemIdx) => (
                  <tr key={reqItem.id || `item_${itemIdx}`} className="hover:bg-slate-50/50 transition-colors">
                    {/* Requested Item Specification */}
                    <td className="p-4 sm:p-5 sticky left-0 bg-white z-10 border-r border-slate-200">
                      <div className="font-bold text-slate-900 text-sm">{reqItem.productName}</div>
                      {reqItem.activeIngredient && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Princípio Ativo: <span className="font-medium text-slate-700">{reqItem.activeIngredient}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                          Qtd: {reqItem.quantity} {reqItem.unit}
                        </span>
                        {reqItem.acceptsGeneric !== false ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                            Aceita Genérico: Sim
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            Aceita Genérico: Não
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reseller Item Offer Cells */}
                    {bids.map((bid) => {
                      // Procura o item correspondente nesta proposta
                      const bidItem: QuotationBidItem | undefined =
                        bid.items.find(
                          (bi) =>
                            bi.quotationItemId === reqItem.id ||
                            bi.productName.toLowerCase() === reqItem.productName.toLowerCase()
                        ) || bid.items[itemIdx];

                      if (!bidItem) {
                        return (
                          <td key={bid.id} className="p-4 sm:p-5 border-r border-slate-200 last:border-r-0 text-slate-400 italic text-xs">
                            Item não cotado
                          </td>
                        );
                      }

                      const tooltipKey = `${bid.id}_${bidItem.id}`;
                      const isTooltipOpen = activeTooltipItem === tooltipKey;

                      return (
                        <td
                          key={bid.id}
                          className="p-4 sm:p-5 border-r border-slate-200 last:border-r-0 align-top space-y-2"
                        >
                          {/* Commercial Brand Offered */}
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-400 font-medium">Marca Comercial:</span>
                            <div className="font-bold text-slate-900 text-sm flex items-center justify-between gap-1.5">
                              <span>{bidItem.brandName}</span>
                            </div>
                          </div>

                          {/* CENÁRIO 2: BADGE [ Equivalente Ofertado ] E TOOLTIP COM CONCENTRAÇÃO */}
                          {bidItem.isEquivalent && (
                            <div className="relative inline-block mt-1">
                              <button
                                type="button"
                                data-testid={`badge-equivalent-${bid.id}-${itemIdx}`}
                                aria-label="Informações do Produto Equivalente"
                                aria-expanded={isTooltipOpen}
                                onClick={() => setActiveTooltipItem(isTooltipOpen ? null : tooltipKey)}
                                onMouseEnter={() => setActiveTooltipItem(tooltipKey)}
                                onMouseLeave={() => setActiveTooltipItem(null)}
                                onFocus={() => setActiveTooltipItem(tooltipKey)}
                                onBlur={() => setActiveTooltipItem(null)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer group"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                                <span>[ Equivalente Ofertado ]</span>
                                <Info className="w-3.5 h-3.5 text-amber-700 opacity-70 group-hover:opacity-100" />
                              </button>

                              {/* Tooltip informativo com concentração do princípio ativo */}
                              {isTooltipOpen && (
                                <div
                                  role="tooltip"
                                  data-testid={`tooltip-equivalent-${bid.id}-${itemIdx}`}
                                  className="absolute left-0 top-full mt-2 z-30 w-64 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 animate-fade-in"
                                >
                                  <div className="font-bold text-amber-300 flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5" />
                                    <span>Auditoria de Princípio Ativo</span>
                                  </div>
                                  <p className="text-slate-200 leading-snug">
                                    Concentração auditada:{' '}
                                    <strong className="text-white font-semibold">
                                      {bidItem.activeIngredientConcentration ||
                                        'Concentração ativa equivalente atestada pelo MAPA'}
                                    </strong>
                                  </p>
                                  {bidItem.notes && (
                                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-700">
                                      {bidItem.notes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Unit Price & Subtotal */}
                          <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between text-xs">
                            <span className="text-slate-500">Unitário:</span>
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(bidItem.unitPrice)} / {reqItem.unit}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between text-xs font-bold text-slate-900">
                            <span className="text-slate-500 font-normal">Subtotal:</span>
                            <span>{formatCurrency(bidItem.totalPrice)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Discriminative Freight Cost Row */}
                <tr className="bg-slate-50/70 border-t-2 border-slate-200 font-medium">
                  <td className="p-4 sm:p-5 sticky left-0 bg-slate-50/95 z-10 border-r border-slate-200 text-slate-700">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-slate-500" />
                      <span>Custo de Frete Discriminado</span>
                    </div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                      Condição: {quotation.freightType === 'CIF' ? 'CIF (Entrega na Fazenda)' : 'FOB (Retirada)'}
                    </div>
                  </td>

                  {bids.map((bid) => (
                    <td key={bid.id} className="p-4 sm:p-5 border-r border-slate-200 last:border-r-0">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Valor do Frete:</span>
                        <span
                          data-testid={`freight-cost-${bid.id}`}
                          className={`font-bold text-sm ${
                            bid.freightCost === 0 ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {bid.freightCost === 0 ? 'Grátis (R$ 0,00)' : formatCurrency(bid.freightCost)}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Delivery Deadline (Days) Row */}
                <tr className="bg-slate-50/70 border-t border-slate-200 font-medium">
                  <td className="p-4 sm:p-5 sticky left-0 bg-slate-50/95 z-10 border-r border-slate-200 text-slate-700">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span>Prazo de Entrega (dias)</span>
                    </div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                      Dias corridos para chegada na propriedade
                    </div>
                  </td>

                  {bids.map((bid) => {
                    const isFastest = bid.deliveryDays === minDays;
                    return (
                      <td key={bid.id} className="p-4 sm:p-5 border-r border-slate-200 last:border-r-0">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500">Prazo:</span>
                          <span
                            data-testid={`delivery-days-${bid.id}`}
                            className={`font-extrabold text-sm flex items-center gap-1 ${
                              isFastest ? 'text-blue-700 font-black' : 'text-slate-900'
                            }`}
                          >
                            <span>{bid.deliveryDays} {bid.deliveryDays === 1 ? 'dia' : 'dias'}</span>
                            {isFastest && <Zap className="w-3.5 h-3.5 text-blue-600 inline" />}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Valor Total do Lote Row */}
                <tr className="bg-agro-50/50 border-t-2 border-agro-200 font-bold">
                  <td className="p-4 sm:p-5 sticky left-0 bg-agro-50/90 z-10 border-r border-slate-200 text-agro-950">
                    <div className="text-base font-extrabold">Valor Total do Lote</div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                      Soma equalizada: Produtos + Frete
                    </div>
                  </td>

                  {bids.map((bid) => {
                    const isBestPrice = bid.totalAmount === minAmount;
                    return (
                      <td
                        key={bid.id}
                        className={`p-4 sm:p-5 border-r border-slate-200 last:border-r-0 ${
                          isBestPrice ? 'bg-emerald-100/50' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-500 font-medium">Total Somado:</span>
                          <div
                            data-testid={`total-amount-${bid.id}`}
                            className={`text-xl sm:text-2xl font-black ${
                              isBestPrice ? 'text-emerald-800' : 'text-slate-900'
                            }`}
                          >
                            {formatCurrency(bid.totalAmount)}
                          </div>
                          {isBestPrice && (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                              <Award className="w-3 h-3" />
                              Menor Custo Consolidado
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Action Buttons Row (Aceitar Proposta) */}
                <tr className="bg-white border-t border-slate-200">
                  <td className="p-4 sm:p-5 sticky left-0 bg-white z-10 border-r border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Decisão do Produtor
                  </td>

                  {bids.map((bid) => {
                    const isAccepted = acceptedBidId === bid.id;
                    const isBestPrice = bid.totalAmount === minAmount;

                    return (
                      <td key={bid.id} className="p-4 sm:p-5 border-r border-slate-200 last:border-r-0">
                        {isAccepted ? (
                          <div className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs text-center flex items-center justify-center gap-2 shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>Proposta Escolhida</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={accepting}
                            onClick={() => handleAcceptBid(bid.id)}
                            data-testid={`btn-accept-${bid.id}`}
                            className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                              isBestPrice
                                ? 'bg-agro-700 hover:bg-agro-800 text-white shadow-md shadow-agro-900/10'
                                : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>Aceitar Proposta</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Reseller Notes & Conditions Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {bids.map((bid) => (
            <div key={bid.id} className="bg-white rounded-xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>{bid.resellerTradeName || bid.resellerName}</span>
                <span className="text-slate-500 font-normal">Prazo: {bid.deliveryDays} dias</span>
              </div>
              {bid.notes && (
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  &ldquo;{bid.notes}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

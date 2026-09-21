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
  AlertTriangle,
  Building2,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Check,
  MessageCircle,
  Phone,
  UserCheck,
  X,
  ShoppingCart,
  ExternalLink,
  CreditCard,
  Package,
} from 'lucide-react';
import { SavePackageModal } from '../components/SavePackageModal';
import { quotationService } from '../services/quotation.service';
import {
  predictiveAnalysisService,
  FinancialOpinionResult,
  LogisticalRiskResult,
} from '../services/predictive-analysis.service';
import {
  QuotationRequest,
  QuotationBid,
  ComparativeAnalysis,
  QuotationBidItem,
  AwardedResellerSummary,
} from '../types/quotation';

export const QuotationComparativePage: React.FC = () => {
  const [, params] = useRoute('/produtor/cotacoes/:id/comparativo');
  const quotationId = params?.id || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [quotation, setQuotation] = useState<QuotationRequest | null>(null);
  const [bids, setBids] = useState<QuotationBid[]>([]);
  const [, setAnalysis] = useState<ComparativeAnalysis | null>(null);
  const [activeTooltipItem, setActiveTooltipItem] = useState<string | null>(null);

  // Estados de Aceite e RTV WhatsApp
  const [acceptedBidId, setAcceptedBidId] = useState<string | null>(null);
  const [awardedSummaries, setAwardedSummaries] = useState<AwardedResellerSummary[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({}); // quotationItemId -> bidId
  const [confirmFullLotBid, setConfirmFullLotBid] = useState<QuotationBid | null>(null);
  const [isConfirmPartialModalOpen, setIsConfirmPartialModalOpen] = useState<boolean>(false);
  const [acceptSuccess, setAcceptSuccess] = useState<boolean>(false);
  const [accepting, setAccepting] = useState<boolean>(false);

  // US12: Estados de Análise Preditiva da IA
  const [financialOpinion, setFinancialOpinion] = useState<FinancialOpinionResult | null>(null);
  const [logisticalRisk, setLogisticalRisk] = useState<LogisticalRiskResult | null>(null);
  const [showFinancialOpinion, setShowFinancialOpinion] = useState<boolean>(false);

  // US17: Estados do Pacote Tecnológico
  const [isSavePackageModalOpen, setIsSavePackageModalOpen] = useState<boolean>(false);
  const [savePackageSuccessMessage, setSavePackageSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!quotationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const quote = await quotationService.getQuotationById(quotationId);
        if (!quote && isMounted) {
          setLoading(false);
          return;
        }

        if (quote && isMounted) {
          setQuotation(quote);

          const fetchedBids = await quotationService.getQuotationBids(quotationId);
          setBids(fetchedBids);

          const comparative = quotationService.calculateComparativeAnalysis(quote, fetchedBids);
          setAnalysis(comparative);

          // US12: Execução das análises preditivas (Risco Logístico e Modalidades Financeiras)
          const risk = predictiveAnalysisService.analyzeLogisticalRisk(quote, fetchedBids);
          setLogisticalRisk(risk);

          const finOpinion = predictiveAnalysisService.analyzeFinancialModalities(quote, fetchedBids);
          setFinancialOpinion(finOpinion);

          // Verifica se a cotação já foi finalizada/premiada
          const summaries = quotationService.getAwardedResellersSummary(quote, fetchedBids);
          setAwardedSummaries(summaries);

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

  // US12 CENÁRIO 1: Consulta do Parecer da IA
  const handleConsultAiOpinion = () => {
    if (!financialOpinion && quotation && bids.length >= 2) {
      const res = predictiveAnalysisService.analyzeFinancialModalities(quotation, bids);
      setFinancialOpinion(res);
    }
    setShowFinancialOpinion(true);
  };

  // Formatação de moeda BRL
  const formatCurrency = (val: number): string => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // CENÁRIO 1: Iniciar fluxo de Aceite do Lote Completo abrindo modal de segurança
  const handleOpenFullLotModal = (bid: QuotationBid) => {
    setConfirmFullLotBid(bid);
  };

  // CENÁRIO 1: Confirmar Aceite do Lote Completo
  const handleConfirmFullLot = async () => {
    if (!quotation || !confirmFullLotBid) return;

    try {
      setAccepting(true);
      const wonBid = await quotationService.acceptFullLot(quotation.id, confirmFullLotBid.id);
      setAcceptedBidId(wonBid.id);
      setAcceptSuccess(true);

      // Atualiza estado local
      const updatedBids = bids.map((b) => ({
        ...b,
        status: (b.id === wonBid.id ? 'ACCEPTED' : 'REJECTED') as QuotationBid['status'],
        awardType: (b.id === wonBid.id ? 'FULL' : 'NONE') as QuotationBid['awardType'],
        items: b.items.map((it) => ({ ...it, isAwarded: b.id === wonBid.id })),
      }));
      setBids(updatedBids);

      const updatedQuote = { ...quotation, status: 'AWARDED' as const };
      setQuotation(updatedQuote);

      const summaries = quotationService.getAwardedResellersSummary(updatedQuote, updatedBids);
      setAwardedSummaries(summaries);

      setConfirmFullLotBid(null);
    } catch (e) {
      console.error('Erro ao aceitar proposta:', e);
    } finally {
      setAccepting(false);
    }
  };

  // CENÁRIO 2: Selecionar item individualmente (Item a Item)
  const handleToggleItemSelection = (itemId: string, bidId: string) => {
    setSelectedItems((prev) => {
      const updated = { ...prev };
      if (updated[itemId] === bidId) {
        delete updated[itemId];
      } else {
        updated[itemId] = bidId;
      }
      return updated;
    });
  };

  // CENÁRIO 2: Confirmar Escolhas Selecionadas (Item a Item)
  const handleConfirmPartialAward = async () => {
    if (!quotation) return;

    try {
      setAccepting(true);
      const summaries = await quotationService.acceptPartialItems(quotation.id, selectedItems);
      setAwardedSummaries(summaries);
      setAcceptSuccess(true);

      const updatedQuote = { ...quotation, status: 'AWARDED' as const };
      setQuotation(updatedQuote);

      const updatedBids = await quotationService.getQuotationBids(quotation.id);
      setBids(updatedBids);

      setIsConfirmPartialModalOpen(false);
      setSelectedItems({});
    } catch (e) {
      console.error('Erro ao confirmar seleção parcial:', e);
    } finally {
      setAccepting(false);
    }
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
  const totalRequestedItems = quotation.items?.length || 0;
  const selectedCount = Object.keys(selectedItems).length;

  // Se houver menos de 2 propostas e a cotação não estiver concluída
  if (bids.length < 2 && quotation.status !== 'AWARDED') {
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
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50 pb-28">
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleConsultAiOpinion}
              data-testid="btn-consult-ai-opinion"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-harvest-400" />
              <span>[ Consultar Parecer da IA ]</span>
            </button>

            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs text-xs text-slate-600 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-agro-600" />
              <span>
                Entrega: <strong>{quotation.targetCity}/{quotation.targetState}</strong>
              </span>
            </div>
            {quotation.status === 'AWARDED' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsSavePackageModalOpen(true)}
                  data-testid="btn-save-as-package"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs transition-all cursor-pointer"
                >
                  <Package className="w-4 h-4 text-amber-700" />
                  <span>[ Salvar como Pacote Tecnológico ]</span>
                </button>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Cotação Concluída
                </span>
              </>
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
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Proposta Vencedora Confirmada!</h4>
                <p className="text-xs text-emerald-700">
                  A cotação foi finalizada com sucesso. Utilize os botões abaixo para disparar a conversa de faturamento via WhatsApp com o RTV.
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

        {/* US17: Alerta de Sucesso ao Salvar Pacote Tecnológico */}
        {savePackageSuccessMessage && (
          <div
            role="status"
            data-testid="save-package-success-alert"
            className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-2xl p-4 shadow-soft flex items-center justify-between gap-4 animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Pacote Tecnológico Salvo!</h4>
                <p className="text-xs text-emerald-700">{savePackageSuccessMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSavePackageSuccessMessage(null)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 p-1.5 rounded-lg hover:bg-emerald-100"
            >
              Fechar
            </button>
          </div>
        )}

        {/* US12 CENÁRIO 2: Bandeira de Risco Logístico vs Janela Agronômica */}
        {logisticalRisk?.hasLogisticalRisk && (
          <div
            data-testid="ai-logistical-risk-card"
            className="bg-amber-50 border-2 border-amber-500 text-amber-950 rounded-2xl p-5 shadow-soft flex items-start gap-4 animate-fade-in"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[11px] font-black uppercase tracking-wide">
                  Alerta Agronômico & Logístico
                </span>
                <h4 className="text-sm font-black text-amber-950">
                  Bandeira de Risco: Prazo de Entrega vs. Janela de Aplicação
                </h4>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-amber-900 leading-relaxed max-w-4xl">
                {logisticalRisk.warningMessage}
              </p>
            </div>
          </div>
        )}

        {/* US12 CENÁRIO 1: Card Parecer da IA (Modalidade Financeira: À Vista vs. Prazo Safra) */}
        {showFinancialOpinion && financialOpinion?.hasAnalysis && (
          <div
            data-testid="ai-financial-opinion-card"
            className="bg-gradient-to-r from-agro-900 via-slate-900 to-agro-950 text-white rounded-2xl p-6 shadow-xl border border-agro-700 space-y-4 animate-fade-in"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-harvest-400 to-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-6 h-6 fill-slate-950" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-harvest-400 bg-harvest-400/10 px-2 py-0.5 rounded border border-harvest-400/20">
                    Inteligência Financeira CotaCampo
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    Parecer da IA – Modalidade Financeira & Custo de Oportunidade
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFinancialOpinion(false)}
                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors self-end sm:self-auto cursor-pointer"
                aria-label="Fechar parecer da IA"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parecer oficial formatado */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
              <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed">
                "{financialOpinion.opinionText}"
              </p>
            </div>

            {/* Métricas e Detalhes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-slate-400 block">Juros Implícitos a Prazo:</span>
                <span className="text-base font-extrabold text-amber-400">
                  {financialOpinion.implicitMonthlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% a.m.
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-slate-400 block">Crédito de Custeio / CDI:</span>
                <span className="text-base font-extrabold text-slate-200">
                  {financialOpinion.marketMonthlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% a.m.
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-slate-400 block">Economia à Vista:</span>
                <span className="text-base font-extrabold text-emerald-400">
                  R$ {financialOpinion.savingsCashAmount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* US10: RESUMO DE FECHAMENTO E BOTÕES DO WHATSAPP (Exibido quando cotação está AWARDED) */}
        {awardedSummaries.length > 0 && (
          <div className="bg-emerald-900 text-white rounded-2xl p-6 shadow-md space-y-4 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Negócio Concluído – Fechamento via WhatsApp
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Clique no botão abaixo para abrir o WhatsApp Web ou App com a mensagem oficial pré-preenchida para o RTV responsável.
                  </p>
                </div>
              </div>
              <div className="text-xs px-3 py-1.5 rounded-full bg-emerald-800/80 border border-emerald-700 text-emerald-100 font-semibold self-start md:self-auto">
                Status: AWARDED
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {awardedSummaries.map((summary) => (
                <div
                  key={summary.bidId}
                  className="bg-white text-slate-900 rounded-xl p-5 shadow-xs border border-emerald-100 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                          Revenda Selecionada
                        </span>
                        <h4 className="text-base font-extrabold text-slate-900">
                          {summary.resellerTradeName || summary.resellerName}
                        </h4>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-100 text-emerald-800">
                        {formatCurrency(summary.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <UserCheck className="w-3.5 h-3.5 text-agro-600" />
                      <span>RTV: <strong>{summary.rtvName}</strong></span>
                      <span className="text-slate-300">•</span>
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{summary.rtvPhone}</span>
                    </div>

                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <span>Itens Contemplados: </span>
                      <strong className="text-slate-700">
                        {summary.awardedItems.map((it) => it.brandName || it.productName).join(', ')}
                      </strong>
                    </div>
                  </div>

                  {/* US10: Botão Oficial de WhatsApp com link em nova aba */}
                  <div>
                    <a
                      href={summary.whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`btn-whatsapp-${summary.bidId}`}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-900/10 hover:shadow-md transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                      <span>[ Chamar no WhatsApp ]</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
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
                Inteligência de Equalização de Custos e Fechamento Ágil
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                Você pode optar pelo <strong>Aceite do Lote Completo</strong> de uma única revenda ou realizar um <strong>Aceite Parcial (Item a Item)</strong> selecionando os melhores insumos individualmente.
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
            <button
              type="button"
              onClick={handleConsultAiOpinion}
              data-testid="btn-consult-ai-opinion-banner"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-agro-700 hover:bg-agro-800 text-white font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-harvest-400" />
              <span>[ Consultar Parecer da IA ]</span>
            </button>
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
                          {/* Reseller Name, City & RTV */}
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
                              {bid.rtvName && (
                                <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-1">
                                  <UserCheck className="w-3 h-3 text-agro-600" />
                                  <span>RTV: {bid.rtvName}</span>
                                </p>
                              )}
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
                      const itemIdKey = reqItem.id || `item_${itemIdx}`;
                      const isItemSelectedForThisBid = selectedItems[itemIdKey] === bid.id;

                      return (
                        <td
                          key={bid.id}
                          className={`p-4 sm:p-5 border-r border-slate-200 last:border-r-0 align-top space-y-2 transition-colors ${
                            isItemSelectedForThisBid ? 'bg-emerald-50/50' : ''
                          }`}
                        >
                          {/* Commercial Brand Offered */}
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-400 font-medium">Marca Comercial:</span>
                            <div className="font-bold text-slate-900 text-sm flex items-center justify-between gap-1.5">
                              <span>{bidItem.brandName}</span>
                            </div>
                          </div>

                          {/* CENÁRIO 2 DA US09: BADGE [ Equivalente Ofertado ] E TOOLTIP COM CONCENTRAÇÃO */}
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

                          {/* US10 CENÁRIO 2: BOTÃO "Aceitar Item" (Aceite Parcial Fracionado) */}
                          <div className="pt-2">
                            <button
                              type="button"
                              data-testid={`btn-select-item-${bid.id}-${itemIdx}`}
                              onClick={() => handleToggleItemSelection(itemIdKey, bid.id)}
                              className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                                isItemSelectedForThisBid
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                              }`}
                            >
                              {isItemSelectedForThisBid ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Item Selecionado</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Aceitar Item</span>
                                </>
                              )}
                            </button>
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

                {/* Condições Comerciais, Pagamento & Barter Row */}
                <tr className="bg-white border-t border-slate-200 font-medium">
                  <td className="p-4 sm:p-5 sticky left-0 bg-white/95 z-10 border-r border-slate-200 text-slate-700">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      <span>Condições Comerciais</span>
                    </div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                      Pagamento e validade da proposta
                    </div>
                  </td>

                  {bids.map((bid) => {
                    const isBarter = bid.paymentMethod === 'BARTER';
                    const paymentLabel =
                      bid.paymentMethod === 'AVISTA'
                        ? 'À Vista'
                        : bid.paymentMethod === 'PRAZO_30'
                        ? 'A Prazo (30 dias)'
                        : bid.paymentMethod === 'PRAZO_60'
                        ? 'A Prazo (60 dias)'
                        : bid.paymentMethod === 'BARTER'
                        ? 'Barter / Permuta em Sacas'
                        : 'Condições Padrão';

                    return (
                      <td key={bid.id} className="p-4 sm:p-5 border-r border-slate-200 last:border-r-0">
                        <div className="space-y-1.5">
                          <div
                            data-testid={`payment-method-${bid.id}`}
                            className="font-bold text-xs text-slate-900 flex items-center gap-1.5"
                          >
                            <span>{paymentLabel}</span>
                          </div>

                          {isBarter && bid.barterBagsCount && (
                            <div
                              data-testid={`barter-badge-${bid.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold"
                            >
                              <span>[ Negociação Direta: {bid.barterBagsCount} sacas (60kg) ]</span>
                            </div>
                          )}

                          {bid.validityHours && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              Validade: {bid.validityHours}h
                            </div>
                          )}
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

                {/* US10 CENÁRIO 1: Action Buttons Row (Aceitar Lote Completo & Chamar no WhatsApp) */}
                <tr className="bg-white border-t border-slate-200">
                  <td className="p-4 sm:p-5 sticky left-0 bg-white z-10 border-r border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Decisão por Lote Global
                  </td>

                  {bids.map((bid) => {
                    const isAccepted = acceptedBidId === bid.id;
                    const isBestPrice = bid.totalAmount === minAmount;
                    const matchingSummary = awardedSummaries.find((s) => s.bidId === bid.id);

                    return (
                      <td key={bid.id} className="p-4 sm:p-5 border-r border-slate-200 last:border-r-0">
                        {isAccepted ? (
                          <div className="space-y-2">
                            <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                              <span>Proposta Escolhida</span>
                            </div>
                            {/* Botão Chamar no WhatsApp */}
                            {matchingSummary && (
                              <a
                                href={matchingSummary.whatsAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`btn-whatsapp-col-${bid.id}`}
                                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              >
                                <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                                <span>[ Chamar no WhatsApp ]</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={accepting}
                            onClick={() => handleOpenFullLotModal(bid)}
                            data-testid={`btn-accept-full-lot-${bid.id}`}
                            className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                              isBestPrice
                                ? 'bg-agro-700 hover:bg-agro-800 text-white shadow-md shadow-agro-900/10'
                                : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>Aceitar Lote Completo</span>
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
              {bid.rtvName && (
                <div className="text-slate-600 flex items-center gap-2">
                  <span>RTV Responsável: <strong>{bid.rtvName}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>WhatsApp: <strong>{bid.rtvPhone}</strong></span>
                </div>
              )}
              {bid.notes && (
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  &ldquo;{bid.notes}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* US10 CENÁRIO 2: FLOATING ACTION BAR PARA ACEITE PARCIAL (Item a Item) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-fade-in">
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-agro-600 text-white flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5 text-harvest-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {selectedCount} de {totalRequestedItems} {totalRequestedItems === 1 ? 'item selecionado' : 'itens selecionados'}
                </h4>
                <p className="text-xs text-slate-300">
                  Fechamento fracionado item a item entre revendas distintas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedItems({})}
                className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Limpar
              </button>
              <button
                type="button"
                data-testid="btn-confirm-partial-selection"
                onClick={() => setIsConfirmPartialModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-agro-600 hover:bg-agro-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-harvest-400" />
                <span>Confirmar Escolhas Selecionadas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* US10 CENÁRIO 1: MODAL DE SEGURANÇA PARA ACEITE DO LOTE COMPLETO */}
      {confirmFullLotBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-agro-100 text-agro-800 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-agro-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Confirmar Aceite do Lote Completo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cotação {quotation.displayCode || `#${quotation.id.slice(0, 6)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-cancel-modal"
                onClick={() => setConfirmFullLotBid(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-sand-50 rounded-xl p-4 space-y-3 text-xs text-slate-700">
              <div className="flex justify-between pb-2 border-b border-sand-200">
                <span className="text-slate-500">Revenda Vencedora:</span>
                <span className="font-bold text-slate-900">
                  {confirmFullLotBid.resellerTradeName || confirmFullLotBid.resellerName}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-sand-200">
                <span className="text-slate-500">RTV Responsável:</span>
                <span className="font-semibold text-slate-900">
                  {confirmFullLotBid.rtvName || 'Representante Comercial'}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-sand-200">
                <span className="text-slate-500">Telefone WhatsApp:</span>
                <span className="font-semibold text-slate-900">
                  {confirmFullLotBid.rtvPhone || 'Não informado'}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-sand-200">
                <span className="text-slate-500">Prazo de Entrega:</span>
                <span className="font-semibold text-slate-900">
                  {confirmFullLotBid.deliveryDays} dias
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-agro-900 pt-1">
                <span>Valor Total do Lote:</span>
                <span className="text-base text-emerald-700">
                  {formatCurrency(confirmFullLotBid.totalAmount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Ao confirmar, a cotação mudará para <strong>AWARDED (Concluída)</strong> e o sistema liberará a conversa direta no WhatsApp com o RTV para emissão de pedido e faturamento.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                data-testid="btn-cancel-full-lot-modal"
                disabled={accepting}
                onClick={() => setConfirmFullLotBid(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={accepting}
                data-testid="btn-confirm-full-lot-modal"
                onClick={handleConfirmFullLot}
                className="px-5 py-2.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs font-bold shadow-md shadow-agro-900/10 flex items-center gap-1.5 cursor-pointer"
              >
                {accepting ? (
                  <span>Registrando...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-harvest-400" />
                    <span>Confirmar e Fechar Negócio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* US10 CENÁRIO 2: MODAL DE SEGURANÇA PARA ACEITE PARCIAL (Item a Item) */}
      {isConfirmPartialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-agro-100 text-agro-800 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-agro-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Confirmar Aceite Parcial (Item a Item)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Divisão de fornecimento por revenda selecionada
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-partial-modal"
                onClick={() => setIsConfirmPartialModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
              {(quotation.items || []).map((reqItem, idx) => {
                const itemIdKey = reqItem.id || `item_${idx}`;
                const chosenBidId = selectedItems[itemIdKey];
                const chosenBid = bids.find((b) => b.id === chosenBidId);
                const chosenBidItem = chosenBid?.items.find(
                  (bi) => bi.quotationItemId === reqItem.id || bi.productName === reqItem.productName
                );

                if (!chosenBid || !chosenBidItem) return null;

                return (
                  <div key={itemIdKey} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{reqItem.productName}</div>
                      <div className="text-[11px] text-slate-500">
                        Fornecedor: <span className="font-semibold text-agro-800">{chosenBid.resellerTradeName || chosenBid.resellerName}</span> (RTV: {chosenBid.rtvName})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900">{formatCurrency(chosenBidItem.totalPrice)}</div>
                      <div className="text-[10px] text-slate-500">Qtd: {reqItem.quantity} {reqItem.unit}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Ao confirmar, cada revenda vencedora receberá a confirmação de seus respectivos itens e botões individuais do WhatsApp serão gerados para cada RTV.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={accepting}
                onClick={() => setIsConfirmPartialModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={accepting}
                data-testid="btn-confirm-partial-modal"
                onClick={handleConfirmPartialAward}
                className="px-5 py-2.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs font-bold shadow-md shadow-agro-900/10 flex items-center gap-1.5 cursor-pointer"
              >
                {accepting ? (
                  <span>Registrando...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-harvest-400" />
                    <span>Confirmar Escolhas Selecionadas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* US17: Modal para Salvar Cotação como Pacote Tecnológico */}
      {quotation && (
        <SavePackageModal
          isOpen={isSavePackageModalOpen}
          onClose={() => setIsSavePackageModalOpen(false)}
          cropType={
            quotation.cropType ||
            (quotation.title?.includes('-')
              ? quotation.title.split('-')[1]?.trim() || quotation.title.split('-')[0].trim()
              : 'Café Conilon')
          }
          quoteId={quotation.id}
          producerId={quotation.producerId}
          items={(quotation.items || []).map((it) => ({
            productName: it.productName,
            quantity: it.quantity,
            unit: it.unit,
            acceptsGeneric: it.acceptsGeneric ?? true,
          }))}
          onSuccess={() => {
            setSavePackageSuccessMessage('Pacote Tecnológico salvo nas suas predefinições!');
            setTimeout(() => setSavePackageSuccessMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
};

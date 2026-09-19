import React, { useState, useEffect, useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import {
  ArrowLeft,
  Store,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Sparkles,
  Send,
  Wheat,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { quotationService } from '../services/quotation.service';
import { QuotationRequest, QuotationBid } from '../types/quotation';
import { ResellerProfile, SupportedState } from '../types/user';
import { bidSubmissionSchema } from '../schemas/bid.schema';

interface ItemFormState {
  unitPrice: string;
  isEquivalent: boolean;
  brandName: string;
  activeIngredientConcentration?: string;
  notes?: string;
}

export const SubmitBidPage: React.FC = () => {
  const [, params] = useRoute('/revenda/cotacoes/:id/proposta');
  const { user } = useAuth();
  const quotationId = params?.id || '';

  const [quotation, setQuotation] = useState<QuotationRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [itemForms, setItemForms] = useState<Record<string, ItemFormState>>({});
  const [freightCost, setFreightCost] = useState<string>('0');
  const [deliveryDays, setDeliveryDays] = useState<string>('5');
  const [validityHours, setValidityHours] = useState<string>('48');
  const [paymentMethod, setPaymentMethod] = useState<'AVISTA' | 'PRAZO_30' | 'PRAZO_60' | 'BARTER'>('PRAZO_30');
  const [barterBagsCount, setBarterBagsCount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedBid, setSubmittedBid] = useState<QuotationBid | null>(null);

  // Carregar dados da cotação
  useEffect(() => {
    if (!quotationId) {
      setLoading(false);
      setErrorMessage('Identificador da cotação não informado.');
      return;
    }

    setLoading(true);
    quotationService
      .getQuotationById(quotationId)
      .then((data) => {
        if (!data) {
          setErrorMessage('Cotação não encontrada ou encerrada.');
        } else {
          setQuotation(data);
          // Inicializa estado dos itens
          const initialForms: Record<string, ItemFormState> = {};
          (data.items || []).forEach((item, idx) => {
            const itemId = item.id || `item_${idx}`;
            initialForms[itemId] = {
              unitPrice: '',
              isEquivalent: false,
              brandName: item.productName,
              activeIngredientConcentration: '',
              notes: '',
            };
          });
          setItemForms(initialForms);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar cotação:', err);
        setErrorMessage('Erro ao carregar detalhes da cotação.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [quotationId]);

  const resellerUser = user?.role === 'RESELLER' ? (user as ResellerProfile) : null;

  // Cálculo dos totais
  const subtotalProducts = useMemo(() => {
    if (!quotation?.items) return 0;
    return quotation.items.reduce((acc, item, idx) => {
      const itemId = item.id || `item_${idx}`;
      const form = itemForms[itemId];
      const price = form ? parseFloat(form.unitPrice) || 0 : 0;
      return acc + price * item.quantity;
    }, 0);
  }, [quotation, itemForms]);

  const parsedFreight = parseFloat(freightCost) || 0;
  const totalAmount = subtotalProducts + parsedFreight;

  // Alterar preço de um item
  const handleUnitPriceChange = (itemId: string, val: string) => {
    setItemForms((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        unitPrice: val,
      },
    }));
    setValidationErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.includes(itemId)) {
          delete next[key];
        }
      });
      return next;
    });
  };

  // Alternar oferta de marca equivalente
  const handleToggleEquivalent = (itemId: string) => {
    setItemForms((prev) => {
      const current = prev[itemId] || {
        unitPrice: '',
        isEquivalent: false,
        brandName: '',
      };
      const nextIsEquivalent = !current.isEquivalent;
      const originalProduct =
        quotation?.items?.find((i, idx) => (i.id || `item_${idx}`) === itemId)?.productName || '';
      return {
        ...prev,
        [itemId]: {
          ...current,
          isEquivalent: nextIsEquivalent,
          brandName: nextIsEquivalent ? '' : originalProduct,
        },
      };
    });
  };

  const handleBrandNameChange = (itemId: string, brandName: string) => {
    setItemForms((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        brandName,
      },
    }));
  };

  const handleBrandConcentrationChange = (itemId: string, concentration: string) => {
    setItemForms((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        activeIngredientConcentration: concentration,
      },
    }));
  };

  // Submissão da proposta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    setValidationErrors({});

    // Montar itens formatados para validação com Zod
    const quotationItems = quotation.items || [];
    const itemsPayload = quotationItems.map((item, idx) => {
      const itemId = item.id || `item_${idx}`;
      const form = itemForms[itemId] || {
        unitPrice: '0',
        isEquivalent: false,
        brandName: item.productName,
      };
      const price = parseFloat(form.unitPrice) || 0;
      return {
        quotationItemId: itemId,
        productName: item.productName,
        brandName: form.isEquivalent ? form.brandName.trim() : item.productName,
        unitPrice: price,
        quantity: item.quantity,
        totalPrice: Number((price * item.quantity).toFixed(2)),
        isEquivalent: form.isEquivalent,
        activeIngredientConcentration: form.activeIngredientConcentration?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };
    });

    const parsedFreight = isNaN(parseFloat(freightCost)) ? -1 : parseFloat(freightCost);
    const parsedDays = parseInt(deliveryDays, 10);
    const parsedValidity = parseInt(validityHours, 10);
    const parsedBarter =
      paymentMethod === 'BARTER' && barterBagsCount.trim() !== ''
        ? parseInt(barterBagsCount, 10)
        : undefined;

    // Validar via Zod Schema
    const validationResult = bidSubmissionSchema.safeParse({
      quotationId: quotation.id,
      items: itemsPayload,
      freightCost: isNaN(parsedFreight) ? -1 : parsedFreight,
      deliveryDays: isNaN(parsedDays) ? 0 : parsedDays,
      validityHours: isNaN(parsedValidity) ? 0 : parsedValidity,
      paymentMethod,
      barterBagsCount: parsedBarter,
      notes: notes.trim() || undefined,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      const issues = validationResult.error.issues || [];
      issues.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      setValidationErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const resellerId = resellerUser?.id || 'reseller-demo-1';
      const resellerName = resellerUser?.razaoSocial || resellerUser?.nomeFantasia || 'Revenda Parceira';
      const resellerTradeName = resellerUser?.nomeFantasia || 'Revenda Parceira';
      const resellerCity = resellerUser?.city || quotation.targetCity || 'Linhares';
      const resellerState = (resellerUser?.state || quotation.targetState || 'ES') as SupportedState;
      const rtvName = resellerUser?.nomeFantasia || 'RTV CotaCampo';
      const rtvPhone = resellerUser?.whatsapp || '27999887766';

      const bid = await quotationService.submitBid({
        quotationId: quotation.id,
        resellerId,
        resellerName,
        resellerTradeName,
        resellerCity,
        resellerState,
        rtvName,
        rtvPhone,
        items: itemsPayload.map((it, idx) => ({
          ...it,
          id: `bid_item_${quotation.id}_${idx + 1}_${Date.now()}`,
        })),
        freightCost: parsedFreight,
        deliveryDays: parsedDays,
        validityHours: parsedValidity,
        paymentMethod,
        barterBagsCount: parsedBarter,
        notes: notes.trim() || undefined,
      });

      setSubmittedBid(bid);
    } catch (err) {
      console.error('Erro ao enviar proposta:', err);
      setValidationErrors({ general: 'Não foi possível registrar a proposta. Tente novamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Auth Guard
  if (!user || user.role !== 'RESELLER') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-soft border border-slate-200 max-w-md">
          <Store className="w-12 h-12 text-agro-600 mx-auto mb-4" />
          <h2 className="font-serif text-xl font-bold text-slate-900 mb-2">
            Acesso Restrito à Revenda
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Você precisa estar autenticado como Revendedor (RTV) para preencher e enviar propostas.
          </p>
          <Link
            href="/cadastro"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-agro-700 text-white font-semibold text-sm hover:bg-agro-800 transition-colors"
          >
            Cadastrar Minha Revenda
          </Link>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-agro-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-600 font-medium">Carregando detalhes da cotação...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (errorMessage || !quotation) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-soft border border-slate-200 max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="font-serif text-xl font-bold text-slate-900 mb-2">
            Cotação Não Disponível
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            {errorMessage || 'A cotação solicitada não foi encontrada ou não está disponível para lances.'}
          </p>
          <Link
            href="/revenda/oportunidades"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-agro-700 text-white font-semibold text-sm hover:bg-agro-800 transition-colors"
          >
            Voltar para Oportunidades
          </Link>
        </div>
      </div>
    );
  }

  // Confirmation / Success Screen (Cenário 1)
  if (submittedBid) {
    return (
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/20 to-sand-50">
        <div
          data-testid="bid-submitted-success"
          className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-soft p-8 sm:p-12 text-center space-y-6 animate-fade-in"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <span
              data-testid="bid-status-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800"
            >
              Status: SUBMITTED
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Proposta enviada! O produtor será notificado.
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Sua oferta para a cotação <strong>#{quotation.displayCode || quotation.id}</strong> foi
              registrada com sucesso. O produtor já pode visualizar sua proposta no comparativo equalizado.
            </p>
          </div>

          {/* Resumo da Oferta */}
          <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-200/70 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Resumo da Proposta Enviada
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Valor Total Equalizado:</span>
                <span data-testid="summary-total-amount" className="font-extrabold text-base text-slate-900">
                  R$ {submittedBid.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Custo do Frete:</span>
                <span className="font-bold text-slate-900">
                  {submittedBid.freightCost === 0
                    ? 'Grátis (R$ 0,00)'
                    : `R$ ${submittedBid.freightCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Prazo Estimado:</span>
                <span className="font-bold text-slate-900">{submittedBid.deliveryDays} dias</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Validade:</span>
                <span className="font-bold text-slate-900">{submittedBid.validityHours} horas</span>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-2">
                <span className="text-xs text-slate-500 block">Condição de Pagamento:</span>
                <span className="font-bold text-slate-900">
                  {submittedBid.paymentMethod === 'BARTER'
                    ? `Barter / Permuta em Sacas (${submittedBid.barterBagsCount} sacas de 60kg)`
                    : submittedBid.paymentMethod === 'AVISTA'
                    ? 'À Vista'
                    : submittedBid.paymentMethod === 'PRAZO_30'
                    ? 'A Prazo (30 dias)'
                    : 'A Prazo (60 dias)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/revenda/oportunidades"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ver Outras Oportunidades</span>
            </Link>
            <Link
              href="/revenda/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
            >
              <span>Voltar ao Painel</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/revenda/oportunidades"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-agro-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Oportunidades</span>
          </Link>
          <span className="text-xs font-medium text-slate-500">
            Cotação #{quotation.displayCode || quotation.id}
          </span>
        </div>

        {/* Header da Cotação */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-agro-700 block">
                Responder Cotação
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                {quotation.title}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <span
                data-testid="badge-freight-type"
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  quotation.freightType === 'CIF'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>
                  {quotation.freightType === 'CIF'
                    ? 'CIF (Entregue na fazenda)'
                    : 'FOB (Retirada na revenda)'}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-500 block">Destino de Entrega:</span>
              <strong className="text-slate-800">
                {quotation.targetCity} - {quotation.targetState}
              </strong>
              {quotation.deliveryAddress && (
                <span className="text-slate-600 text-[11px] block mt-0.5 truncate">
                  {quotation.deliveryAddress}
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-500 block">Produtor Solicitante:</span>
              <strong className="text-slate-800">{quotation.producerName || 'Produtor Rural'}</strong>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Total de itens: {(quotation.items || []).length}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-500 block">Prazo de Resposta:</span>
              <strong className="text-slate-800 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Até {new Date(quotation.deadline).toLocaleDateString('pt-BR')}</span>
              </strong>
            </div>
          </div>
        </div>

        {/* Formulário de Proposta */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção 1: Itens da Cotação & Preços (Cenário 1 e Cenário 2) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-agro-700" />
                  <span>Itens Solicitados & Preços Unitários</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preencha o valor unitário de cada insumo. Caso o produtor aceite genérico, você pode ofertar marcas alternativas.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {(quotation.items || []).map((item, index) => {
                const itemId = item.id || `item_${index}`;
                const form = itemForms[itemId] || {
                  unitPrice: '',
                  isEquivalent: false,
                  brandName: item.productName,
                };
                const itemTotal = (parseFloat(form.unitPrice) || 0) * item.quantity;
                const hasItemError = !!validationErrors[`items.${index}.unitPrice`];

                return (
                  <div
                    key={itemId}
                    data-testid={`bid-item-card-${itemId}`}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50/90 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                          <h3 className="text-sm font-bold text-slate-900">{item.productName}</h3>
                          {item.acceptsGeneric ? (
                            <span
                              data-testid={`badge-accepts-generic-${itemId}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              Aceita Genérico / Equivalente: Sim
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Apenas Marca Solicitada
                            </span>
                          )}
                        </div>
                        {item.activeIngredient && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Princípio Ativo: <span className="text-slate-700 font-medium">{item.activeIngredient}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right sm:self-center">
                        <span className="text-xs text-slate-500 block">Quantidade solicitada:</span>
                        <strong className="text-sm text-slate-800">
                          {item.quantity} {item.unit}
                        </strong>
                      </div>
                    </div>

                    {/* Cenário 2: Oferta de Produto Equivalente / Alternativo */}
                    {item.acceptsGeneric && (
                      <div className="border-t border-slate-200/80 pt-3">
                        {!form.isEquivalent ? (
                          <button
                            type="button"
                            onClick={() => handleToggleEquivalent(itemId)}
                            data-testid={`btn-offer-alternative-${itemId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-agro-300 bg-agro-50/80 hover:bg-agro-100 text-agro-900 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-agro-700" />
                            <span>[ Ofertarei Marca Alternativa ]</span>
                          </button>
                        ) : (
                          <div
                            data-testid={`alternative-brand-container-${itemId}`}
                            className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 animate-fade-in"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span>Marca Alternativa / Produto Equivalente</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleEquivalent(itemId)}
                                data-testid={`btn-cancel-alternative-${itemId}`}
                                className="text-[11px] text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                              >
                                [ Manter Marca Solicitada ]
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label
                                  htmlFor={`brand-name-${itemId}`}
                                  className="block text-[11px] font-bold text-slate-700 mb-1"
                                >
                                  Nome Comercial da Marca Alternativa *
                                </label>
                                <input
                                  id={`brand-name-${itemId}`}
                                  type="text"
                                  data-testid={`input-brand-name-${itemId}`}
                                  placeholder="Ex: Mancozeb 750 WG da Marca Y"
                                  value={form.brandName}
                                  onChange={(e) => handleBrandNameChange(itemId, e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none"
                                />
                                {validationErrors[`items.${index}.brandName`] && (
                                  <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">
                                    {validationErrors[`items.${index}.brandName`]}
                                  </span>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor={`brand-concentration-${itemId}`}
                                  className="block text-[11px] font-bold text-slate-700 mb-1"
                                >
                                  Concentração / Registro (opcional)
                                </label>
                                <input
                                  id={`brand-concentration-${itemId}`}
                                  type="text"
                                  data-testid={`input-brand-concentration-${itemId}`}
                                  placeholder="Ex: Mancozebe 750 g/kg (75% m/m)"
                                  value={form.activeIngredientConcentration || ''}
                                  onChange={(e) => handleBrandConcentrationChange(itemId, e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none"
                                />
                              </div>
                            </div>

                            <div className="text-[11px] text-amber-900/80 font-medium">
                              Sua proposta exibirá a tag visual <strong>[ Equivalente Ofertado ]</strong> no
                              comparativo do produtor.
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preço Unitário & Subtotal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end pt-2 border-t border-slate-200">
                      <div>
                        <label
                          htmlFor={`unit-price-${itemId}`}
                          className="block text-xs font-bold text-slate-700 mb-1"
                        >
                          Preço Unitário (R$ por {item.unit}) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                            R$
                          </span>
                          <input
                            id={`unit-price-${itemId}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            data-testid={`input-unit-price-${itemId}`}
                            value={form.unitPrice}
                            onChange={(e) => handleUnitPriceChange(itemId, e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm font-semibold outline-none transition-colors ${
                              hasItemError
                                ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-rose-500'
                                : 'border-slate-300 bg-white text-slate-900 focus:border-agro-600 focus:ring-1 focus:ring-agro-500'
                            }`}
                          />
                        </div>
                        {hasItemError && (
                          <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">
                            {validationErrors[`items.${index}.unitPrice`]}
                          </span>
                        )}
                      </div>

                      <div className="text-right sm:text-right bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[11px] text-slate-500 block">Subtotal deste Insumo:</span>
                        <span
                          data-testid={`item-subtotal-${item.id}`}
                          className="text-base font-extrabold text-slate-900"
                        >
                          R$ {itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Frete & Logística (Cenário 1) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-agro-700" />
                <span>Custos de Frete & Logística (CIF)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Para cotações com entrega na fazenda (CIF), informe o frete total e a estimativa de dias para entrega.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Custo Total do Frete */}
              <div>
                <label htmlFor="freight-cost" className="block text-xs font-bold text-slate-700 mb-1">
                  Custo Total do Frete (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    id="freight-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    data-testid="input-freight-cost"
                    value={freightCost}
                    onChange={(e) => setFreightCost(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Digite 0 para Frete Grátis / Cortesia.
                </span>
                {validationErrors['freightCost'] && (
                  <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">
                    {validationErrors['freightCost']}
                  </span>
                )}
              </div>

              {/* Prazo Estimado de Entrega */}
              <div>
                <label htmlFor="delivery-days" className="block text-xs font-bold text-slate-700 mb-1">
                  Prazo Estimado de Entrega (dias) *
                </label>
                <div className="relative">
                  <input
                    id="delivery-days"
                    type="number"
                    min="1"
                    max="90"
                    data-testid="input-delivery-days"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Dias corridos até a fazenda.
                </span>
                {validationErrors['deliveryDays'] && (
                  <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">
                    {validationErrors['deliveryDays']}
                  </span>
                )}
              </div>

              {/* Validade da Proposta */}
              <div>
                <label htmlFor="validity-hours" className="block text-xs font-bold text-slate-700 mb-1">
                  Validade da Proposta *
                </label>
                <select
                  id="validity-hours"
                  data-testid="input-validity-hours"
                  value={validityHours}
                  onChange={(e) => setValidityHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none"
                >
                  <option value="24">24 horas (1 dia)</option>
                  <option value="48">48 horas (2 dias)</option>
                  <option value="72">72 horas (3 dias)</option>
                  <option value="120">120 horas (5 dias)</option>
                </select>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Garantia dos preços informados.
                </span>
                {validationErrors['validityHours'] && (
                  <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">
                    {validationErrors['validityHours']}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Seção 3: Condições Comerciais & Pagamento (Cenário 3: Barter) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wheat className="w-5 h-5 text-agro-700" />
                <span>Condições Comerciais & Pagamento</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha a forma de recebimento. Opcionalmente, selecione Barter (troca por sacas) para negociação direta.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Opção À Vista */}
              <label
                data-testid="radio-payment-avista"
                onClick={() => setPaymentMethod('AVISTA')}
                className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'AVISTA'
                    ? 'border-agro-600 bg-agro-50/50 ring-1 ring-agro-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="AVISTA"
                    checked={paymentMethod === 'AVISTA'}
                    onChange={() => setPaymentMethod('AVISTA')}
                    className="text-agro-700 focus:ring-agro-500"
                  />
                  <span className="text-xs font-bold text-slate-900">À Vista</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 pl-5">
                  Pix ou TED na entrega
                </span>
              </label>

              {/* Opção 30 dias */}
              <label
                data-testid="radio-payment-prazo30"
                onClick={() => setPaymentMethod('PRAZO_30')}
                className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'PRAZO_30'
                    ? 'border-agro-600 bg-agro-50/50 ring-1 ring-agro-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="PRAZO_30"
                    checked={paymentMethod === 'PRAZO_30'}
                    onChange={() => setPaymentMethod('PRAZO_30')}
                    className="text-agro-700 focus:ring-agro-500"
                  />
                  <span className="text-xs font-bold text-slate-900">A Prazo (30 dias)</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 pl-5">
                  Boleto bancário faturado
                </span>
              </label>

              {/* Opção 60 dias */}
              <label
                data-testid="radio-payment-prazo60"
                onClick={() => setPaymentMethod('PRAZO_60')}
                className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'PRAZO_60'
                    ? 'border-agro-600 bg-agro-50/50 ring-1 ring-agro-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="PRAZO_60"
                    checked={paymentMethod === 'PRAZO_60'}
                    onChange={() => setPaymentMethod('PRAZO_60')}
                    className="text-agro-700 focus:ring-agro-500"
                  />
                  <span className="text-xs font-bold text-slate-900">A Prazo (60 dias)</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 pl-5">
                  Boleto safra/entressafra
                </span>
              </label>

              {/* Cenário 3: Barter / Permuta em Sacas */}
              <label
                htmlFor="radio-barter"
                data-testid="radio-payment-barter"
                onClick={() => setPaymentMethod('BARTER')}
                className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'BARTER'
                    ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    id="radio-barter"
                    data-testid="input-radio-barter"
                    type="radio"
                    name="paymentMethod"
                    value="BARTER"
                    checked={paymentMethod === 'BARTER'}
                    onChange={() => setPaymentMethod('BARTER')}
                    className="text-amber-700 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-900">Barter / Permuta em Sacas</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 pl-5">
                  Troca direta por café/grãos
                </span>
              </label>
            </div>

            {/* Campo Condicional do Barter */}
            {paymentMethod === 'BARTER' && (
              <div
                data-testid="barter-input-container"
                className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3 animate-fade-in"
              >
                <div className="flex items-center gap-2 text-amber-900">
                  <Wheat className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold">
                    Negociação Direta via Troca por Sacas (Barter)
                  </span>
                </div>

                <div className="max-w-md">
                  <label htmlFor="barter-bags" className="block text-xs font-bold text-slate-800 mb-1">
                    Quantas sacas (60kg) pelo lote completo? *
                  </label>
                  <div className="relative">
                    <input
                      id="barter-bags"
                      type="number"
                      min="1"
                      placeholder="Ex: 120"
                      data-testid="input-barter-bags"
                      value={barterBagsCount}
                      onChange={(e) => setBarterBagsCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-amber-300 bg-white text-sm font-bold text-slate-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                      sacas (60kg)
                    </span>
                  </div>
                  {validationErrors['barterBagsCount'] && (
                    <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                      {validationErrors['barterBagsCount']}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  O produtor verá esta oferta sinalizada no comparativo com a tag visual de{' '}
                  <strong>Negociação Direta por Barter</strong>.
                </p>
              </div>
            )}

            {/* Observações Gerais */}
            <div className="pt-2">
              <label htmlFor="bid-notes" className="block text-xs font-bold text-slate-700 mb-1">
                Observações Comerciais Adicionais (opcional)
              </label>
              <textarea
                id="bid-notes"
                data-testid="input-bid-notes"
                rows={2}
                placeholder="Ex: Lote com validade longa, descarga por conta da revenda, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none"
              />
            </div>
          </div>

          {/* Erro Geral se houver */}
          {validationErrors['general'] && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationErrors['general']}</span>
            </div>
          )}

          {/* Card de Resumo & Envio (Cenário 1) */}
          <div className="bg-agro-900 text-white rounded-2xl p-6 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-agro-200 font-semibold block">
                  Valor Total Consolidado da Proposta
                </span>
                <div
                  data-testid="total-proposal-amount"
                  className="text-2xl sm:text-3xl font-black text-harvest-400 mt-0.5"
                >
                  R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-agro-200">
                  Subtotal dos Insumos: R$ {subtotalProducts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + Frete: R$ {parsedFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="text-left sm:text-right text-xs text-agro-200 space-y-1">
                <div>Prazo: <strong>{deliveryDays || '0'} dias corridos</strong></div>
                <div>Validade: <strong>{validityHours || '48'} horas</strong></div>
                <div>Condição: <strong>{paymentMethod === 'BARTER' ? `Barter (${barterBagsCount || '0'} sacas)` : paymentMethod}</strong></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
              <Link
                href="/revenda/oportunidades"
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-semibold transition-colors text-center cursor-pointer"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={submitting}
                data-testid="btn-submit-bid"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-harvest-500 hover:bg-harvest-600 text-agro-950 font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-agro-950 border-t-transparent rounded-full animate-spin" />
                    <span>Enviando Proposta...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>[ Enviar Proposta ]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

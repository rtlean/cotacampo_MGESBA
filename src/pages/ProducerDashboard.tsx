import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CROPS } from '../data/crops';
import { WelcomeModal } from '../components/WelcomeModal';
import { Link } from 'wouter';
import {
  Sprout,
  MapPin,
  Building,
  Phone,
  PlusCircle,
  FileSpreadsheet,
  Clock,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Layers,
  ArrowRight,
  X,
  Package,
  Trash2,
  Zap,
} from 'lucide-react';
import { quotationService } from '../services/quotation.service';
import { packageService } from '../services/package.service';
import { TechnologicalPackageDTO } from '../shared/schemas/packages';
import { QuotationMetrics, QuotationRequest, QuotationStatus } from '../types/quotation';

export const ProducerDashboard: React.FC = () => {
  const { user, showWelcomeNotice, dismissWelcomeNotice } = useAuth();
  const [publishedMessage, setPublishedMessage] = useState<string | null>(() =>
    quotationService.getFlashMessage()
  );
  const [metrics, setMetrics] = useState<QuotationMetrics>(() =>
    user && user.role === 'PRODUCER'
      ? quotationService.getLocalMetrics(user.id)
      : { openCount: 0, inReviewCount: 0, awardedCount: 0, totalCount: 0 }
  );
  const [quotations, setQuotations] = useState<QuotationRequest[]>(() =>
    user && user.role === 'PRODUCER' ? quotationService.getLocalQuotations(user.id) : []
  );
  const [activeTab, setActiveTab] = useState<'ALL' | QuotationStatus>('ALL');

  // US17: Navegação entre Cotações e Pacotes Tecnológicos
  const [mainTab, setMainTab] = useState<'QUOTATIONS' | 'PACKAGES'>('QUOTATIONS');
  const [packages, setPackages] = useState<TechnologicalPackageDTO[]>(() =>
    packageService.getLocalPackages()
  );

  const handleDismissPublishedMessage = () => {
    quotationService.clearFlashMessage();
    setPublishedMessage(null);
  };

  const handleDeletePackage = async (packageId: string) => {
    await packageService.deletePackage(packageId);
    const updated = await packageService.listMyPackages(user?.id || 'produtor_demo_1');
    setPackages(updated);
  };

  useEffect(() => {
    let isMounted = true;

    if (user && user.role === 'PRODUCER') {
      setMetrics(quotationService.getLocalMetrics(user.id));
      setQuotations(quotationService.getLocalQuotations(user.id));
    }

    async function loadData() {
      if (!user || user.role !== 'PRODUCER') return;
      try {
        const [userMetrics, userQuotes, userPackages] = await Promise.all([
          quotationService.getProducerMetrics(user.id),
          quotationService.getProducerQuotations(user.id),
          packageService.listMyPackages(user.id),
        ]);

        if (isMounted) {
          setMetrics(userMetrics);
          setQuotations(userQuotes);
          setPackages(userPackages);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard do produtor:', err);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // If accessed directly without user, fallback display or redirect
  if (!user || user.role !== 'PRODUCER') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-soft border border-slate-200 max-w-md">
          <Sprout className="w-12 h-12 text-agro-600 mx-auto mb-4" />
          <h2 className="font-serif text-xl font-bold text-slate-900 mb-2">
            Acesso Restrito ao Produtor
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Você precisa estar cadastrado como Produtor Rural para visualizar este painel.
          </p>
          <Link
            href="/cadastro"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-agro-700 text-white font-semibold text-sm hover:bg-agro-800 transition-colors"
          >
            Realizar Cadastro
          </Link>
        </div>
      </div>
    );
  }

  const userCropDetails = CROPS.filter((c) => user.crops.includes(c.id));

  const filteredQuotations =
    activeTab === 'ALL'
      ? quotations
      : quotations.filter((q) => q.status === activeTab);

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Aberta
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Aguardando Decisão
          </span>
        );
      case 'AWARDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Concluída
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Cancelada
          </span>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50 relative pb-24">
      {/* Welcome Guidance Modal triggered right after registration */}
      <WelcomeModal
        isOpen={showWelcomeNotice}
        onClose={dismissWelcomeNotice}
        user={user}
        onCreateQuote={() => {}}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Published Quotation Success Flash Message */}
        {publishedMessage && (
          <div
            role="status"
            className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-2xl p-5 shadow-soft flex items-center justify-between gap-4 animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-emerald-950">Sucesso!</h3>
                <p className="text-sm font-medium text-emerald-800">{publishedMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissPublishedMessage}
              aria-label="Fechar aviso de cotação publicada"
              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Welcome Notification Banner */}
        {showWelcomeNotice && (
          <div className="bg-gradient-to-r from-agro-800 to-agro-900 text-white rounded-2xl p-5 sm:p-6 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-agro-200 shrink-0">
                <Sparkles className="w-5 h-5 text-harvest-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg sm:text-xl font-bold">
                    Bem-vindo ao CotaCampo, {user.name.split(' ')[0]}!
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-agro-700/80 border border-agro-600 text-agro-200">
                    Conta Ativa • PRODUCER
                  </span>
                </div>
                <p className="text-sm text-agro-200 mt-1 max-w-2xl">
                  Sua fazenda está registrada. Crie seu primeiro pedido de cotação para receber propostas das revendas e cooperativas que atendem {user.city}/{user.state}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <Link
                href="/produtor/cotacoes/nova"
                className="w-full md:w-auto px-4 py-2 rounded-lg bg-agro-500 hover:bg-agro-400 text-agro-950 font-semibold text-xs transition-colors shadow-sm text-center inline-block"
              >
                Criar 1ª Cotação
              </Link>
              <button
                type="button"
                onClick={dismissWelcomeNotice}
                className="text-xs text-agro-300 hover:text-white underline px-2 py-1"
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {/* Top Farm Identity Card with Prominent Quick Action Button */}
        <div className="bg-white rounded-2xl shadow-soft border border-agro-100 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-agro-700 to-agro-900 text-white flex items-center justify-center shadow-md shadow-agro-900/15 shrink-0">
                <Building className="w-7 h-7 text-agro-200" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                    {user.farmName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-agro-100 text-agro-800 border border-agro-200">
                    Produtor Rural
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-800">
                    <MapPin className="w-4 h-4 text-agro-700" />
                    {user.city} — {user.state}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{user.name}</span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {user.whatsapp}
                  </span>
                </div>
              </div>
            </div>

            {/* Banner Quick Action Button */}
            <div className="flex items-center gap-3">
              <Link
                href="/produtor/cotacoes/nova"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-sm font-semibold shadow-md shadow-agro-900/15 hover:shadow-lg transition-all"
              >
                <PlusCircle className="w-4 h-4 text-agro-200" />
                <span>+ Nova Cotação</span>
              </Link>
            </div>
          </div>

          {/* Culturas Atendidas Badges */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-2">
                Culturas Registradas:
              </span>
              {userCropDetails.map((crop) => (
                <div
                  key={crop.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium ${crop.badgeBg}`}
                >
                  <span role="img" aria-label={crop.name}>{crop.icon}</span>
                  <span className="font-semibold">{crop.name}</span>
                  <span className="text-[10px] opacity-75">({crop.subtitle})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3 Metric Cards: Cotações Abertas, Aguardando Decisão, Concluídas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Cotações Abertas (OPEN) */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-100/80 shadow-soft hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between text-slate-600 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Cotações Abertas
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </div>
              <div
                data-testid="card-open-count"
                className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight"
              >
                {metrics.openCount}
              </div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span>Recebendo lances de revendas</span>
              </div>
            </div>
          </div>

          {/* Card 2: Aguardando Decisão (IN_REVIEW) */}
          <div className="bg-white p-6 rounded-2xl border border-amber-100/80 shadow-soft hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between text-slate-600 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Aguardando Decisão
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div
                data-testid="card-in-review-count"
                className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight"
              >
                {metrics.inReviewCount}
              </div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                <span>Prazo encerrado, escolha o vencedor</span>
              </div>
            </div>
          </div>

          {/* Card 3: Concluídas (AWARDED) */}
          <div className="bg-white p-6 rounded-2xl border border-blue-100/80 shadow-soft hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between text-slate-600 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Concluídas
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div
                data-testid="card-awarded-count"
                className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight"
              >
                {metrics.awardedCount}
              </div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                <span>Negociações finalizadas com sucesso</span>
              </div>
            </div>
          </div>
        </div>

        {/* US17: Navegação Superior - Minhas Cotações vs Meus Pacotes Tecnológicos */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setMainTab('QUOTATIONS')}
            data-testid="tab-my-quotations"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mainTab === 'QUOTATIONS'
                ? 'bg-agro-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Minhas Cotações ({quotations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('PACKAGES')}
            data-testid="tab-my-packages"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mainTab === 'PACKAGES'
                ? 'bg-agro-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4 text-harvest-400" />
            <span>Meus Pacotes Tecnológicos ({packages.length})</span>
          </button>
        </div>

        {/* Content Area: Meus Pacotes Tecnológicos OU Minhas Cotações */}
        {mainTab === 'PACKAGES' ? (
          /* US17: Seção Meus Pacotes Tecnológicos (Recompra em 1-Clique) */
          <div
            className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden animate-fade-in"
            data-testid="packages-section"
          >
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-agro-700" />
                  <span>Meus Pacotes Tecnológicos</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Predefinições de insumos salvas para recompra rápida em 1-clique
                </p>
              </div>

              <Link
                href="/produtor/cotacoes/nova"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs font-bold transition-all self-start sm:self-auto shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nova Cotação</span>
              </Link>
            </div>

            <div className="p-6">
              {packages.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Nenhum Pacote Tecnológico salvo ainda</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Você pode salvar pacotes de manejo padronizados (ex: "Adubação de Florada", "Pulverização Preventiva")
                    ao criar uma cotação com 3 ou mais itens no Wizard ou ao visualizar uma cotação concluída.
                  </p>
                  <Link
                    href="/produtor/cotacoes/nova"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <span>Criar Cotação e Salvar Pacote</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      data-testid={`package-card-${pkg.id}`}
                      className="p-5 rounded-2xl border border-slate-200/90 hover:border-agro-300 hover:shadow-md transition-all bg-slate-50/50 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-agro-100 text-agro-800 border border-agro-200">
                              {pkg.cropType}
                            </span>
                            <h3 className="font-serif text-base font-bold text-slate-900 mt-1.5">
                              {pkg.name}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(pkg.id)}
                            title="Excluir pacote"
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {pkg.itemsCount || pkg.items?.length || 0} produto(s) inclusos:
                          </span>
                          <div className="mt-1.5 space-y-1 max-h-24 overflow-y-auto pr-1">
                            {pkg.items?.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-200/60"
                              >
                                <span className="font-medium text-slate-800 truncate max-w-[200px]">
                                  {it.productName}
                                </span>
                                <span className="text-slate-500">
                                  {it.quantity} {it.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400">
                          Criado em {new Date(pkg.createdAt).toLocaleDateString('pt-BR')}
                        </span>

                        <Link
                          href={`/produtor/cotacoes/nova?packageId=${pkg.id}`}
                          data-testid={`btn-reorder-package-${pkg.id}`}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs font-bold shadow-xs hover:shadow transition-all"
                        >
                          <Zap className="w-3.5 h-3.5 text-harvest-400" />
                          <span>Nova Cotação com este Pacote</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : quotations.length === 0 ? (
          /* Cenário 2: Estado Vazio */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-agro-50 border border-agro-200 text-agro-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Você ainda não possui cotações ativas
              </h3>
              <p className="text-sm text-slate-600 mb-8 leading-relaxed">
                Publique os insumos necessários para sua lavoura de{' '}
                <span className="font-semibold text-slate-800">
                  {userCropDetails.map((c) => c.name).join(', ')}
                </span>{' '}
                e receba propostas competitivas das revendas homologadas de {user.state}.
              </p>
              <Link
                href="/produtor/cotacoes/nova"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-semibold text-sm shadow-md shadow-agro-900/15 hover:shadow-lg transition-all"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Iniciar Minha Primeira Cotação</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Cenário 1: Lista e Gestão de Cotações */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
            {/* Header & Tabs */}
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-slate-900">
                  Minhas Demandas de Cotação
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acompanhe os lances e prazos das suas solicitações
                </p>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === 'ALL'
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Todas ({quotations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('OPEN')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === 'OPEN'
                      ? 'bg-white text-emerald-800 font-semibold shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Abertas ({metrics.openCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('IN_REVIEW')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === 'IN_REVIEW'
                      ? 'bg-white text-amber-800 font-semibold shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Em Decisão ({metrics.inReviewCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('AWARDED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === 'AWARDED'
                      ? 'bg-white text-blue-800 font-semibold shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Concluídas ({metrics.awardedCount})
                </button>
              </div>
            </div>

            {/* List / Table */}
            <div className="divide-y divide-slate-100">
              {filteredQuotations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Nenhuma cotação encontrada com o status selecionado.
                </div>
              ) : (
                filteredQuotations.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(quote.status)}
                        <span className="text-xs text-slate-400">
                          ID: #{quote.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {quote.targetCity}/{quote.targetState}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 hover:text-agro-800 transition-colors">
                        {quote.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {quote.itemsCount || 1} {quote.itemsCount === 1 ? 'item' : 'itens'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 font-medium text-agro-800">
                          <TrendingUp className="w-3.5 h-3.5 text-agro-600" />
                          {quote.bidsCount || 0} {quote.bidsCount === 1 ? 'lance recebido' : 'lances recebidos'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Prazo: {new Date(quote.deadline).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/produtor/cotacoes/${quote.id}/comparativo`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-agro-700 hover:bg-agro-800 text-white text-xs font-bold shadow-xs hover:shadow transition-all"
                      >
                        <Layers className="w-3.5 h-3.5 text-harvest-400" />
                        <span>Comparar Propostas</span>
                      </Link>
                      <Link
                        href={`/produtor/cotacoes/${quote.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <span>Ver Detalhes</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB): [+ Nova Cotação] (Mobile & Desktop accessibility) */}
      <div className="fixed bottom-6 right-6 z-30">
        <Link
          href="/produtor/cotacoes/nova"
          className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-agro-700 hover:bg-agro-800 text-white font-semibold text-sm shadow-xl shadow-agro-900/30 hover:scale-105 transition-all border border-agro-600 cursor-pointer"
        >
          <PlusCircle className="w-5 h-5 text-harvest-400" />
          <span>+ Nova Cotação</span>
        </Link>
      </div>
    </div>
  );
};

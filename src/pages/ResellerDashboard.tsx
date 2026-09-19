import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SUPPLY_CATEGORIES } from '../data/categories';
import { ResellerProfile } from '../types/user';
import { ResellerProposalView, ResellerFunnelColumn } from '../types/quotation';
import { quotationService } from '../services/quotation.service';
import { Link } from 'wouter';
import {
  Store,
  MapPin,
  Phone,
  Radio,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Package,
  Clock,
  Lock,
  UserCheck,
  MessageCircle,
  AlertCircle,
  Trophy,
  XCircle,
} from 'lucide-react';

export const ResellerDashboard: React.FC = () => {
  const { user, showWelcomeNotice, dismissWelcomeNotice } = useAuth();
  const [proposals, setProposals] = useState<ResellerProposalView[]>([]);
  const [loadingProposals, setLoadingProposals] = useState<boolean>(true);
  const [activeMobileTab, setActiveMobileTab] = useState<ResellerFunnelColumn>('ENVIADAS');
  const [dealNoticeDismissed, setDealNoticeDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (user && user.role === 'RESELLER') {
      setLoadingProposals(true);
      quotationService
        .getResellerProposals(user.id)
        .then((views) => {
          setProposals(views);
        })
        .catch((err) => {
          console.error('Erro ao carregar propostas do revendedor:', err);
        })
        .finally(() => {
          setLoadingProposals(false);
        });
    }
  }, [user]);

  // Se não estiver logado ou não for revenda, exibe aviso de redirecionamento
  if (!user || user.role !== 'RESELLER') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-soft border border-slate-200 max-w-md">
          <Store className="w-12 h-12 text-agro-600 mx-auto mb-4" />
          <h2 className="font-serif text-xl font-bold text-slate-900 mb-2">
            Acesso Restrito à Revenda
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Você precisa estar cadastrado como Revenda de Insumos para acessar este painel e o mural de oportunidades.
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

  const reseller = user as ResellerProfile;
  const userCategories = SUPPLY_CATEGORIES.filter((c) =>
    reseller.categories.includes(c.id)
  );

  const enviadasProposals = proposals.filter((p) => p.column === 'ENVIADAS');
  const ganhasProposals = proposals.filter((p) => p.column === 'GANHAS');
  const perdidasProposals = proposals.filter((p) => p.column === 'PERDIDAS');

  const totalProposalsCount = proposals.length;
  const winRate =
    totalProposalsCount > 0
      ? Math.round((ganhasProposals.length / totalProposalsCount) * 100)
      : 68;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50">
      <div className="max-w-7xl mx-auto space-y-8">
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
                    Bem-vindo ao CotaCampo, {reseller.nomeFantasia}!
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-agro-700/80 border border-agro-600 text-agro-200">
                    Conta Ativa • RESELLER
                  </span>
                </div>
                <p className="text-sm text-agro-200 mt-1 max-w-2xl">
                  Sua loja física em {reseller.city}/{reseller.state} foi mapeada com sucesso na rede CotaCampo. Os pedidos de cotação dos produtores da região já estão disponíveis no mural abaixo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <button
                type="button"
                data-testid="btn-dismiss-welcome-notice"
                onClick={dismissWelcomeNotice}
                className="text-xs text-agro-300 hover:text-white underline px-2 py-1 cursor-pointer"
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {/* Cenário 2: Banner de Notificação de Negócio Fechado */}
        {ganhasProposals.length > 0 && !dealNoticeDismissed && (
          <div
            data-testid="deal-closed-banner"
            className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-5 sm:p-6 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-600/30 animate-fade-in"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0 border border-emerald-400/30">
                <Trophy className="w-5 h-5 text-harvest-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg sm:text-xl font-bold">
                    🎉 Parabéns! Negócio Fechado no CotaCampo!
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-700/80 border border-emerald-600 text-emerald-100">
                    {ganhasProposals.length} Proposta(s) Ganha(s)
                  </span>
                </div>
                <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
                  O produtor aceitou sua proposta comercial. Os dados de contato completo e WhatsApp foram liberados na coluna &quot;Ganhas&quot; para alinhamento logístico e faturamento.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <button
                type="button"
                data-testid="btn-dismiss-deal-notice"
                onClick={() => setDealNoticeDismissed(true)}
                className="text-xs text-emerald-200 hover:text-white underline px-2 py-1 cursor-pointer"
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {/* Top Store Identity Card */}
        <div className="bg-white rounded-2xl shadow-soft border border-agro-100 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-agro-900 text-white flex items-center justify-center shadow-md shadow-agro-900/15 shrink-0">
                <Store className="w-7 h-7 text-agro-200" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                    {reseller.nomeFantasia}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    Revenda Homologada
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mb-2">
                  Razão Social: {reseller.razaoSocial} • CNPJ: {reseller.cnpj}
                </p>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-800">
                    <MapPin className="w-4 h-4 text-agro-700" />
                    {reseller.city} — {reseller.state}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 font-medium text-agro-800 bg-agro-50 px-2 py-0.5 rounded-md border border-agro-200">
                    <Radio className="w-3.5 h-3.5 text-agro-600" />
                    Raio de Entrega: {reseller.deliveryRadiusKm} km
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {reseller.whatsapp}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Geolocalização Ativa</span>
              </div>
            </div>
          </div>

          {/* Categorias Fornecidas */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-2">
                Categorias Fornecidas:
              </span>
              {userCategories.map((cat) => (
                <div
                  key={cat.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium ${cat.badgeBg}`}
                >
                  <span role="img" aria-label={cat.name}>
                    {cat.icon}
                  </span>
                  <span className="font-semibold">{cat.name}</span>
                  <span className="text-[10px] opacity-75">({cat.subtitle})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Cotações no Raio</span>
              <Radio className="w-4 h-4 text-agro-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">12</div>
            <div className="text-xs text-slate-500 mt-1">No raio logístico configurado</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Propostas Enviadas</span>
              <FileSpreadsheet className="w-4 h-4 text-harvest-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {enviadasProposals.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Aguardando decisão do produtor</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Propostas Ganhas</span>
              <Trophy className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {ganhasProposals.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Negócios fechados na plataforma</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Fechamento</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{winRate}%</div>
            <div className="text-xs text-slate-500 mt-1">Conversão de lances enviados</div>
          </div>
        </div>

        {/* US15: Funil de Gestão de Propostas (Kanban do RTV) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-agro-700" />
                <span>Funil de Propostas & Gestão de Fechamento</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Acompanhe o ciclo das suas ofertas, contatos revelados de cotações ganhas e calibragem de preços perdidos
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Total de propostas ativas: <strong>{totalProposalsCount}</strong>
              </span>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="flex lg:hidden rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMobileTab('ENVIADAS')}
              className={`flex-1 py-2 rounded-lg transition-colors text-center cursor-pointer ${
                activeMobileTab === 'ENVIADAS'
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Enviadas ({enviadasProposals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab('GANHAS')}
              className={`flex-1 py-2 rounded-lg transition-colors text-center cursor-pointer ${
                activeMobileTab === 'GANHAS'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ganhas ({ganhasProposals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab('PERDIDAS')}
              className={`flex-1 py-2 rounded-lg transition-colors text-center cursor-pointer ${
                activeMobileTab === 'PERDIDAS'
                  ? 'bg-white text-rose-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Perdidas ({perdidasProposals.length})
            </button>
          </div>

          {/* Kanban Columns Grid */}
          {loadingProposals ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto animate-spin mb-2" />
              <p className="text-sm">Carregando funil de propostas...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna 1: Enviadas (Aguardando produtor) */}
              <div
                data-testid="kanban-column-enviadas"
                className={`space-y-4 ${
                  activeMobileTab !== 'ENVIADAS' ? 'hidden lg:block' : 'block'
                }`}
              >
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Enviadas (Aguardando produtor)
                    </span>
                  </div>
                  <span
                    data-testid="badge-count-enviadas"
                    className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-200 text-blue-900"
                  >
                    {enviadasProposals.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {enviadasProposals.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Nenhuma proposta aguardando produtor no momento.
                    </div>
                  ) : (
                    enviadasProposals.map((item) => (
                      <div
                        key={item.bid.id}
                        data-testid={`proposal-card-${item.bid.id}`}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-bold text-slate-400">
                              #{item.quotation.displayCode || item.quotation.id.slice(-6).toUpperCase()}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                              {item.quotation.title}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                            Aguardando Produtor
                          </span>
                        </div>

                        {/* Valor Total da Proposta & Município */}
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Valor Total Ofertado:
                            </span>
                            <strong
                              data-testid={`proposal-total-${item.bid.id}`}
                              className="text-sm font-bold text-slate-900"
                            >
                              R$ {item.bid.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Município:
                            </span>
                            <span
                              data-testid={`proposal-city-${item.bid.id}`}
                              className="text-xs font-semibold text-slate-700 flex items-center justify-end gap-1"
                            >
                              <MapPin className="w-3 h-3 text-agro-600" />
                              <span>
                                {item.quotation.targetCity}/{item.quotation.targetState}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Cenário 1 & 2: Dados do Produtor Ofuscados */}
                        <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-[11px] flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Produtor:</span>
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              [ Contato Protegido ]
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium text-xs truncate">
                            {item.producerDisplayName}
                          </p>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Telefone: {item.producerDisplayPhone}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Coluna 2: Ganhas (AWARDED) */}
              <div
                data-testid="kanban-column-ganhas"
                className={`space-y-4 ${
                  activeMobileTab !== 'GANHAS' ? 'hidden lg:block' : 'block'
                }`}
              >
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Ganhas (AWARDED)
                    </span>
                  </div>
                  <span
                    data-testid="badge-count-ganhas"
                    className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900"
                  >
                    {ganhasProposals.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {ganhasProposals.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Nenhuma proposta ganha ainda. Continue respondendo cotações!
                    </div>
                  ) : (
                    ganhasProposals.map((item) => (
                      <div
                        key={item.bid.id}
                        data-testid={`proposal-card-${item.bid.id}`}
                        className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs hover:shadow-md transition-shadow space-y-3 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                          <div className="absolute transform rotate-45 bg-emerald-600 text-[9px] font-bold text-white text-center py-0.5 right-[-35px] top-[18px] w-[120px] shadow-xs">
                            GANHA
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-2 pr-6">
                          <div>
                            <span className="text-[11px] font-bold text-emerald-700">
                              #{item.quotation.displayCode || item.quotation.id.slice(-6).toUpperCase()}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                              {item.quotation.title}
                            </h3>
                          </div>
                        </div>

                        {/* Valor Total da Proposta & Município */}
                        <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                              Valor Total Vencedor:
                            </span>
                            <strong
                              data-testid={`proposal-total-${item.bid.id}`}
                              className="text-sm font-bold text-emerald-900"
                            >
                              R$ {item.bid.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                              Município:
                            </span>
                            <span
                              data-testid={`proposal-city-${item.bid.id}`}
                              className="text-xs font-semibold text-slate-700 flex items-center justify-end gap-1"
                            >
                              <MapPin className="w-3 h-3 text-agro-600" />
                              <span>
                                {item.quotation.targetCity}/{item.quotation.targetState}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Cenário 2: Dados Revelados do Produtor & Botão WhatsApp */}
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 space-y-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                            <UserCheck className="w-4 h-4 text-emerald-700" />
                            <span>Dados do Produtor (Revelados):</span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="font-bold text-slate-900">
                              {item.producerDisplayName}
                            </div>
                            <div className="text-slate-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{item.producerDisplayPhone}</span>
                            </div>
                          </div>

                          {item.whatsAppUrl && (
                            <a
                              href={item.whatsAppUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`btn-whatsapp-producer-${item.bid.id}`}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>[ Falar no WhatsApp ]</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Coluna 3: Perdidas (Com Inteligência de Mercado) */}
              <div
                data-testid="kanban-column-perdidas"
                className={`space-y-4 ${
                  activeMobileTab !== 'PERDIDAS' ? 'hidden lg:block' : 'block'
                }`}
              >
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Perdidas
                    </span>
                  </div>
                  <span
                    data-testid="badge-count-perdidas"
                    className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800"
                  >
                    {perdidasProposals.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {perdidasProposals.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Nenhuma proposta perdida registrada.
                    </div>
                  ) : (
                    perdidasProposals.map((item) => (
                      <div
                        key={item.bid.id}
                        data-testid={`proposal-card-${item.bid.id}`}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-bold text-slate-400">
                              #{item.quotation.displayCode || item.quotation.id.slice(-6).toUpperCase()}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                              {item.quotation.title}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            Finalizada
                          </span>
                        </div>

                        {/* Valor Total da Proposta & Município */}
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Sua Oferta Total:
                            </span>
                            <strong
                              data-testid={`proposal-total-${item.bid.id}`}
                              className="text-sm font-bold text-slate-700"
                            >
                              R$ {item.bid.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Município:
                            </span>
                            <span
                              data-testid={`proposal-city-${item.bid.id}`}
                              className="text-xs font-semibold text-slate-700 flex items-center justify-end gap-1"
                            >
                              <MapPin className="w-3 h-3 text-agro-600" />
                              <span>
                                {item.quotation.targetCity}/{item.quotation.targetState}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Cenário 3: Aviso de Cotação Finalizada & Inteligência de Mercado */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-start gap-1.5 text-xs text-rose-700 bg-rose-50/70 p-2.5 rounded-lg border border-rose-200">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <span className="font-semibold">
                              Cotação finalizada. Sua proposta não foi selecionada.
                            </span>
                          </div>

                          {item.marketIntelligence && (
                            <div
                              data-testid={`market-feedback-${item.bid.id}`}
                              className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs space-y-1"
                            >
                              <div className="font-bold text-amber-950 flex items-center gap-1 text-[11px]">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span>Inteligência de Mercado Anônima:</span>
                              </div>
                              <p className="text-amber-900 font-medium">
                                {item.marketIntelligence.feedbackMessage}
                              </p>
                              <span className="text-[10px] text-slate-500 block">
                                Dica: Utilize esse balizador para calibrar custos de frete e marcas equivalentes.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mural de Oportunidades / Cotações Disponíveis */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-agro-700" />
                <span>Mural de Cotações Disponíveis</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Pedidos de produtores rurais dentro da sua área de cobertura logística
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-agro-50 text-agro-800 text-xs font-semibold border border-agro-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mural atualizado em tempo real
              </span>
              <Link
                href="/revenda/oportunidades"
                data-testid="link-full-opportunities"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-agro-700 hover:bg-agro-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <span>Acessar Mural Completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Oportunidades List */}
          <div className="divide-y divide-slate-100 mt-4">
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 p-3 rounded-xl transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      Adubo NPK 20-05-20 (Big Bag 1.000 kg) — 20 toneladas
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800 border border-green-200">
                      Nutrição e Adubação
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Fazenda Vale Verde • Polo Regional</span>
                    <span>•</span>
                    <span className="text-agro-700 font-medium">Distância: 18 km</span>
                    <span>•</span>
                    <span>Expira em 3 dias</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert('Envio de lances comerciais será habilitado na próxima etapa do MVP.')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-agro-700 hover:bg-agro-800 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <span>Enviar Proposta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 p-3 rounded-xl transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      Fungicida Sistêmico e Protetor para Café Conilon — 400 Litros
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                      Proteção Fitossanitária
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Sítio Três Barras • Polo Regional</span>
                    <span>•</span>
                    <span className="text-agro-700 font-medium">Distância: 54 km</span>
                    <span>•</span>
                    <span>Expira em 5 dias</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert('Envio de lances comerciais será habilitado na próxima etapa do MVP.')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-agro-700 hover:bg-agro-800 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <span>Enviar Proposta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 p-3 rounded-xl transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      Calcário Dolomítico PRNT 85% a Granel — 60 toneladas
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      Condicionador de Solo
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Fazenda Morro Alto • Polo Regional</span>
                    <span>•</span>
                    <span className="text-agro-700 font-medium">Distância: 62 km</span>
                    <span>•</span>
                    <span>Expira em 2 dias</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert('Envio de lances comerciais será habilitado na próxima etapa do MVP.')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-agro-700 hover:bg-agro-800 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <span>Enviar Proposta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

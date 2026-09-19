import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import {
  Compass,
  MapPin,
  Clock,
  Package,
  Filter,
  Sparkles,
  Share2,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Building,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ResellerProfile } from '../types/user';
import {
  opportunitiesService,
  OpportunityItem,
  OpportunityFilters,
} from '../services/opportunities.service';
import { TARGET_CROPS } from '../data/target-crops';

export const OpportunitiesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const resellerUser = user?.role === 'RESELLER' ? (user as ResellerProfile) : null;

  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Filtros de Funil de Vendas (Cenário 2)
  const [filters, setFilters] = useState<OpportunityFilters>({
    municipality: 'ALL',
    crop: 'ALL',
    expiringSoonOnly: false,
  });

  // Carregar oportunidades no raio logístico (Cenário 1)
  useEffect(() => {
    if (!resellerUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    opportunitiesService
      .getOpportunitiesForReseller(resellerUser)
      .then((items) => {
        setOpportunities(items);
      })
      .catch((err) => {
        console.error('Erro ao carregar oportunidades:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [resellerUser]);

  // Lista única de municípios para o dropdown de filtro
  const availableMunicipalities = useMemo(() => {
    const cities = new Set<string>();
    opportunities.forEach((op) => {
      if (op.quotation.targetCity) {
        cities.add(op.quotation.targetCity);
      }
    });
    return Array.from(cities).sort();
  }, [opportunities]);

  // Filtragem instantânea das oportunidades (Cenário 2)
  const filteredOpportunities = useMemo(() => {
    return opportunitiesService.filterOpportunities(opportunities, filters);
  }, [opportunities, filters]);

  // Resetar filtros
  const handleResetFilters = () => {
    setFilters({
      municipality: 'ALL',
      crop: 'ALL',
      expiringSoonOnly: false,
    });
  };

  // Gerar e copiar convite WhatsApp (Cenário 3)
  const handleCopyInviteLink = () => {
    if (!resellerUser) return;
    const storeName = resellerUser.nomeFantasia || resellerUser.razaoSocial || 'Nossa Loja Agro';
    const city = resellerUser.city || 'região';
    const inviteText = `Olá amigo produtor! Venha cotar defensivos e fertilizantes no CotaCampo com a ${storeName} em ${city}. Acesse gratuitamente: https://cotacampo.com.br`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      });
    }
  };

  // Verificação de Acesso / Permissão
  if (!isAuthenticated || !resellerUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-sand-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Acesso Restrito a Revendas</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            O Mural de Oportunidades é exclusivo para revendas e distribuidores de insumos agrícolas
            homologados na plataforma CotaCampo.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full py-2.5 px-4 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-sm font-semibold transition-colors"
            >
              Entrar como Revenda
            </Link>
            <Link
              href="/cadastro"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Criar Conta de Revenda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const deliveryRadius = resellerUser.deliveryRadiusKm ?? 100;
  const resellerCity = resellerUser.city || 'Linhares';
  const resellerState = resellerUser.state || 'ES';
  const whatsAppInviteUrl = opportunitiesService.generateProducerInviteWhatsAppUrl(resellerUser);

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb e Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Link href="/revenda/dashboard" className="hover:text-agro-700 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-agro-800">Mural de Oportunidades</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
              <Compass className="w-7 h-7 text-agro-700" />
              <span>Mural de Oportunidades (Feed de Cotações)</span>
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Demandas ativas de produtores rurais compatíveis com sua área de atendimento e portfólio.
            </p>
          </div>

          {/* Badge de Raio Logístico Configurado */}
          <div
            data-testid="logistics-radius-badge"
            className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-agro-200/80 shadow-soft"
          >
            <div className="w-10 h-10 rounded-xl bg-agro-50 text-agro-700 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Raio Logístico Ativo
              </span>
              <span className="text-sm font-bold text-agro-900">
                {deliveryRadius} km a partir de {resellerCity}/{resellerState}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros Superiores (Cenário 2) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-agro-700" />
              <span>Filtros de Funil de Vendas</span>
            </h2>
            {(filters.municipality !== 'ALL' || filters.crop !== 'ALL' || filters.expiringSoonOnly) && (
              <button
                type="button"
                onClick={handleResetFilters}
                data-testid="btn-reset-filters"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-agro-700 font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtro 1: Município Específico */}
            <div>
              <label htmlFor="filter-municipality" className="block text-xs font-bold text-slate-700 mb-1.5">
                Município Específico
              </label>
              <select
                id="filter-municipality"
                data-testid="filter-municipality"
                value={filters.municipality}
                onChange={(e) => setFilters((prev) => ({ ...prev, municipality: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none transition-all"
              >
                <option value="ALL">Todos os Municípios da Região</option>
                {availableMunicipalities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro 2: Cultura */}
            <div>
              <label htmlFor="filter-crop" className="block text-xs font-bold text-slate-700 mb-1.5">
                Cultura Agrícola
              </label>
              <select
                id="filter-crop"
                data-testid="filter-crop"
                value={filters.crop}
                onChange={(e) => setFilters((prev) => ({ ...prev, crop: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none transition-all"
              >
                <option value="ALL">Todas as Culturas</option>
                {TARGET_CROPS.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro 3: Prazo Expirando (menos de 24h) */}
            <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-end">
              <label
                htmlFor="filter-expiring"
                className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 cursor-pointer transition-all select-none"
              >
                <input
                  id="filter-expiring"
                  data-testid="filter-expiring"
                  type="checkbox"
                  checked={filters.expiringSoonOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, expiringSoonOnly: e.target.checked }))}
                  className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Prazo Expirando (menos de 24h)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight">
                    Priorizar demandas com fechamento iminente
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Mural de Cards de Oportunidades ou Estado Vazio */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-agro-200 border-t-agro-700 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Buscando cotações no seu raio logístico...</p>
          </div>
        ) : filteredOpportunities.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {filteredOpportunities.length}{' '}
                {filteredOpportunities.length === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas'}
              </span>
              <span className="text-xs text-agro-700 font-medium">
                Ordenado por urgência de prazo e proximidade
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredOpportunities.map((op) => {
                const quote = op.quotation;
                const isUrgent = op.timeRemaining.isExpiringSoon;

                return (
                  <div
                    key={quote.id}
                    data-testid={`opportunity-card-${quote.id}`}
                    className="bg-white rounded-2xl border border-slate-200/80 hover:border-agro-400 shadow-soft hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      {/* Top Badges: Cultura & Urgência */}
                      <div className="flex items-start justify-between gap-2">
                        <span
                          data-testid="badge-crop"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-agro-50 text-agro-900 border border-agro-200"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-agro-700" />
                          <span>{op.cropName}</span>
                        </span>

                        <span
                          data-testid="badge-time-remaining"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            isUrgent
                              ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{op.timeRemaining.formatted}</span>
                        </span>
                      </div>

                      {/* Título da Cotação */}
                      <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-agro-800 transition-colors">
                        {quote.title}
                      </h3>

                      {/* Dados Centrais Obrigatórios: Município, Distância e Itens */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <MapPin className="w-4 h-4 text-rose-500" />
                            <span>Município:</span>
                          </span>
                          <span data-testid="field-municipality" className="font-bold text-slate-900">
                            {quote.targetCity}/{quote.targetState}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <Compass className="w-4 h-4 text-agro-700" />
                            <span>Distância Estimada:</span>
                          </span>
                          <span
                            data-testid="field-distance"
                            className="font-bold text-agro-800 bg-agro-50 px-2 py-0.5 rounded"
                          >
                            {op.formattedDistance}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <Package className="w-4 h-4 text-sky-600" />
                            <span>Quantidade de Itens:</span>
                          </span>
                          <span data-testid="field-items-count" className="font-bold text-slate-900">
                            {op.itemsCount} {op.itemsCount === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Envio de Proposta */}
                    <div className="pt-3 border-t border-slate-100">
                      <Link
                        href={`/revenda/cotacoes/${quote.id}/proposta`}
                        data-testid={`btn-propose-${quote.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <span>Responder Cotação</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Cenário 3: Ausência de Oportunidades Locais (Estado Vazio) */
          <div
            data-testid="empty-opportunities-container"
            className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-8 sm:p-12 text-center space-y-6 animate-fade-in"
          >
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
              <Compass className="w-8 h-8 text-amber-600" />
            </div>

            <div className="max-w-lg mx-auto space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Nenhuma cotação nova na sua região. Que tal convidar produtores parceiros para o CotaCampo?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ao indicar produtores rurais da sua região de <strong>{resellerCity} e entorno</strong>,
                você recebe notificações em primeira mão assim que eles abrirem cotações de defensivos e adubos.
              </p>
            </div>

            {/* Ações de Convite via WhatsApp */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href={whatsAppInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="btn-whatsapp-invite"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Convidar Produtores via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleCopyInviteLink}
                data-testid="btn-copy-invite"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Link copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copiar Link de Convite</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

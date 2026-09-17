import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SUPPLY_CATEGORIES } from '../data/categories';
import { ResellerProfile } from '../types/user';
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
} from 'lucide-react';

export const ResellerDashboard: React.FC = () => {
  const { user, showWelcomeNotice, dismissWelcomeNotice } = useAuth();

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
                onClick={dismissWelcomeNotice}
                className="text-xs text-agro-300 hover:text-white underline px-2 py-1 cursor-pointer"
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
            <div className="text-2xl font-bold text-slate-900">0</div>
            <div className="text-xs text-slate-500 mt-1">Lances comerciais ativos</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Produtores Ativos</span>
              <Store className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">48</div>
            <div className="text-xs text-slate-500 mt-1">Na região de {reseller.city}</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Fechamento</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">68%</div>
            <div className="text-xs text-slate-500 mt-1">Média de revendas na plataforma</div>
          </div>
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-agro-50 text-agro-800 text-xs font-semibold border border-agro-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Mural atualizado em tempo real
            </span>
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

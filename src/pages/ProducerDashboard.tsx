import React from 'react';
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
  Store,
  TrendingDown,
  Clock,
  Sparkles,
} from 'lucide-react';

export const ProducerDashboard: React.FC = () => {
  const { user, showWelcomeNotice, dismissWelcomeNotice } = useAuth();

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

  const handleCreateQuote = () => {
    alert(
      'A funcionalidade de criação e publicação de cotações de insumos será entregue na User Story 02 (US02).'
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50">
      {/* Welcome Guidance Modal triggered right after registration */}
      <WelcomeModal
        isOpen={showWelcomeNotice}
        onClose={dismissWelcomeNotice}
        user={user}
        onCreateQuote={handleCreateQuote}
      />

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
              <button
                type="button"
                onClick={handleCreateQuote}
                className="w-full md:w-auto px-4 py-2 rounded-lg bg-agro-500 hover:bg-agro-400 text-agro-950 font-semibold text-xs transition-colors shadow-sm"
              >
                Criar 1ª Cotação
              </button>
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

        {/* Top Farm Identity Card */}
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

            {/* Quick Action Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCreateQuote}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-sm font-semibold shadow-md shadow-agro-900/10 hover:shadow-lg transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-agro-300" />
                <span>Nova Cotação de Insumos</span>
              </button>
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

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Cotações Abertas</span>
              <FileSpreadsheet className="w-4 h-4 text-agro-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">0</div>
            <div className="text-xs text-slate-500 mt-1">Aguardando seu primeiro pedido</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Propostas Recebidas</span>
              <Clock className="w-4 h-4 text-harvest-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">0</div>
            <div className="text-xs text-slate-500 mt-1">Orçamentos enviados por revendas</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Revendas na Região</span>
              <Store className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {user.state === 'ES' ? '34' : user.state === 'MG' ? '52' : '41'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Atendendo {user.city} e região</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Economia Média</span>
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">14% a 22%</div>
            <div className="text-xs text-slate-500 mt-1">Estimada via leilão reverso</div>
          </div>
        </div>

        {/* Empty State / Next Steps */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-agro-50 border border-agro-200 text-agro-700 flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl font-bold text-slate-900 mb-2">
              Você ainda não possui pedidos de cotação ativos
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Publique os insumos necessários para sua lavoura de {userCropDetails.map((c) => c.name).join(', ')} e deixe que as revendas parceiras de {user.state} disputem o melhor preço e prazo para você.
            </p>
            <button
              type="button"
              onClick={handleCreateQuote}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-semibold text-sm shadow-md shadow-agro-900/10 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publicar Minha Primeira Cotação</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

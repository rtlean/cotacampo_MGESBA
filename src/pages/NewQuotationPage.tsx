import React from 'react';
import { Link } from 'wouter';
import { FilePlus, ArrowLeft, Building, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const NewQuotationPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link
            href="/produtor/dashboard"
            className="inline-flex items-center gap-1.5 text-agro-700 hover:text-agro-800 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Dashboard</span>
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-soft border border-agro-100 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-agro-700 to-agro-900 text-white flex items-center justify-center shadow-md shrink-0">
              <FilePlus className="w-6 h-6 text-harvest-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-slate-900">
                Nova Cotação de Insumos
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Cadastre os produtos e quantidades desejadas para receber propostas das revendas parceiras de{' '}
                {user?.state || 'MG, ES e BA'}.
              </p>
            </div>
          </div>

          {user && (
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium text-slate-800">
                <Building className="w-3.5 h-3.5 text-agro-700" />
                {user.role === 'PRODUCER' ? user.farmName : user.nomeFantasia}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {user.city} — {user.state}
              </span>
            </div>
          )}
        </div>

        {/* Content notice */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-harvest-50 border border-harvest-200 text-harvest-700 flex items-center justify-center mx-auto mb-4">
              <FilePlus className="w-7 h-7" />
            </div>
            <h2 className="font-serif text-xl font-bold text-slate-900 mb-2">
              Formulário de Demanda de Insumos
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              O fluxo interativo de especificação de itens por cultura e publicação no leilão reverso faz parte do ciclo de cotações (US06).
            </p>
            <Link
              href="/produtor/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-semibold text-sm transition-colors"
            >
              Retornar ao Dashboard do Produtor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { useLocation } from 'wouter';
import { resetService } from '../services/reset.service';
import { useAuth } from '../context/AuthContext';

export const ResetDataPage: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetService.clearAllData();
      logout();
      setIsDone(true);
    } catch (err) {
      console.error('Erro ao resetar dados:', err);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('auto') === 'true' || params.get('confirm') === 'true') {
        void handleReset();
      }
    }
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {!isDone ? (
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold text-slate-900">
                Limpar Todos os Dados Cadastrados
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta ação apagará todos os dados salvos no aplicativo, deixando o sistema 100% zerado para novos cadastros e testes.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">O que será apagado:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Sessão do usuário conectado</li>
                <li>Todos os cadastros de Produtores</li>
                <li>Todos os cadastros de Revendedores</li>
                <li>Todas as Cotações e Rascunhos</li>
                <li>Todas as Propostas (Bids) e Notificações</li>
                <li>Todos os Pacotes Tecnológicos salvos</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              data-testid="btn-confirm-reset"
              className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isResetting ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Limpando dados...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Zerar Tudo e Começar de Novo</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Base de Dados Zerada!
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Todos os dados foram apagados com sucesso. O sistema está completamente limpo e pronto para novos cadastros.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLocation('/cadastro')}
              data-testid="btn-go-register"
              className="w-full py-3 px-4 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <span>Ir para Novo Cadastro</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

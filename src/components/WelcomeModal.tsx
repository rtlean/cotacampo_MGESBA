import React, { useEffect, useRef } from 'react';
import { ProducerProfile } from '../types/user';
import { CROPS } from '../data/crops';
import { CheckCircle2, FileText, Store, TrendingDown, ArrowRight, X } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ProducerProfile;
  onCreateQuote?: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  user,
  onCreateQuote,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const userCropNames = user.crops
    .map((cId) => CROPS.find((c) => c.id === cId)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-agro-100 overflow-hidden">
        {/* Header Header Pattern */}
        <div className="bg-gradient-to-r from-agro-800 to-agro-950 p-6 text-white relative">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de boas-vindas"
            className="absolute top-4 right-4 p-1.5 rounded-full text-agro-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-agro-500/30 text-agro-200 border border-agro-400/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-agro-400" />
              Conta de Produtor Ativada
            </span>
          </div>

          <h2 id="welcome-modal-title" className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
            Bem-vindo ao CotaCampo, {user.name.split(' ')[0]}!
          </h2>
          <p className="mt-1 text-sm text-agro-200">
            Sua propriedade <span className="text-white font-medium">{user.farmName}</span> em{' '}
            <span className="text-white font-medium">{user.city}/{user.state}</span> está pronta para cotar.
          </p>
        </div>

        {/* Steps Guide Content */}
        <div className="p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Como criar sua 1ª cotação e economizar em {userCropNames}:
          </h3>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-agro-100 text-agro-800 flex items-center justify-center shrink-0 font-bold text-sm">
                1
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-agro-700" />
                  <span className="font-semibold text-sm text-slate-900">
                    Publique sua Lista de Insumos
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Adicione fertilizantes, defensivos, adjuvantes ou insumos biológicos com quantidade e prazo de entrega desejado.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-agro-100 text-agro-800 flex items-center justify-center shrink-0 font-bold text-sm">
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-agro-700" />
                  <span className="font-semibold text-sm text-slate-900">
                    Revendas da sua Região Disputam o Pedido
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Distribuidores e revendas autorizadas de {user.state} enviam orçamentos diretamente para o seu painel.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-agro-100 text-agro-800 flex items-center justify-center shrink-0 font-bold text-sm">
                3
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-agro-700" />
                  <span className="font-semibold text-sm text-slate-900">
                    Compare Preços e Feche pelo WhatsApp
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Analise frete, prazo e desconto por volume. Aprove a melhor proposta com 1 clique.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              Explorar Meu Painel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onCreateQuote) onCreateQuote();
                else alert('O módulo de criação de cotações estará disponível na próxima história (US02).');
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-agro-700 hover:bg-agro-800 text-white text-sm font-semibold shadow-md shadow-agro-900/10 transition-all hover:shadow-lg"
            >
              <span>Criar Minha Primeira Cotação</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

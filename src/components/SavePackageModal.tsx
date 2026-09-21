import React, { useState } from 'react';
import { Package, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { packageService } from '../services/package.service';
import { TechnologicalPackageDTO } from '../shared/schemas/packages';

export interface SavePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  cropType: string;
  quoteId?: string;
  producerId?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    acceptsGeneric?: boolean;
  }>;
  onSuccess?: (pkg: TechnologicalPackageDTO) => void;
}

export const SavePackageModal: React.FC<SavePackageModalProps> = ({
  isOpen,
  onClose,
  cropType,
  quoteId,
  producerId = 'produtor_demo_1',
  items,
  onSuccess,
}) => {
  const [packageName, setPackageName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim() || packageName.trim().length < 3) {
      setError('O nome do pacote deve conter pelo menos 3 caracteres.');
      return;
    }

    if (!items || items.length === 0) {
      setError('Não há itens válidos para salvar no pacote tecnológico.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const created = await packageService.createPackageFromQuote({
        producerId,
        name: packageName.trim(),
        cropType: cropType || 'Cultura Geral',
        quoteId,
        items: items.map((it) => ({
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unit,
          acceptsGeneric: it.acceptsGeneric ?? true,
        })),
      });

      setSuccessMessage('Pacote Tecnológico salvo nas suas predefinições!');
      if (onSuccess) {
        onSuccess(created);
      }

      setTimeout(() => {
        setSuccessMessage(null);
        setPackageName('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Erro ao salvar pacote tecnológico:', err);
      setError('Ocorreu um erro ao salvar o pacote tecnológico. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-package-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-agro-800 to-agro-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-harvest-300" />
            </div>
            <div>
              <h3 id="save-package-modal-title" className="font-bold text-base">
                Salvar como Pacote Tecnológico
              </h3>
              <p className="text-xs text-emerald-100">
                Padronize sua receita de manejo para recompra em 1-clique
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {successMessage ? (
            <div
              role="status"
              className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm font-semibold animate-fade-in"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="package-name-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Nome do Pacote Tecnológico *
                </label>
                <input
                  id="package-name-input"
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="Ex: Pulverização Preventiva - Pimenta ou Adubação de Florada"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-agro-500/20 focus:border-agro-600 transition-all placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              {/* Informações da cultura e lista de itens */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Cultura:</span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-agro-100 text-agro-800">
                    {cropType || 'Geral'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                  <span>Itens incluídos:</span>
                  <span className="font-bold text-slate-700">{items.length} produto(s)</span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 pr-1 border-t border-slate-200/60 divide-y divide-slate-100 text-xs">
                  {items.map((it, idx) => (
                    <div key={idx} className="pt-1.5 flex items-center justify-between">
                      <span className="font-semibold text-slate-800 truncate max-w-[240px]">
                        {it.productName}
                      </span>
                      <span className="text-slate-500 shrink-0 font-medium">
                        {it.quantity} {it.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dica */}
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-harvest-600 shrink-0" />
                <span>
                  Este pacote ficará salvo no seu Dashboard em <strong>"Meus Pacotes"</strong> para recompra em 1-clique.
                </span>
              </p>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-save-package"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Package className="w-3.5 h-3.5 text-harvest-300" />
                      <span>Salvar Pacote Tecnológico</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

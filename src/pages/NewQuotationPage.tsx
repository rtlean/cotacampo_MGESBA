import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Building,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Sprout,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TARGET_CROPS } from '../data/target-crops';
import { quotationService } from '../services/quotation.service';
import { step1DestinationSchema } from '../schemas/quotation-wizard.schema';
import { ProducerFarm, TargetCropId } from '../types/quotation';
import { ProducerProfile } from '../types/user';

export const NewQuotationPage: React.FC = () => {
  const { user } = useAuth();
  const producerUser = user?.role === 'PRODUCER' ? (user as ProducerProfile) : null;

  // Wizard Step State (1: Destino e Cultura, 2: Itens, 3: Prazos e Envio)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1 Form State
  const [farms, setFarms] = useState<ProducerFarm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedCrop, setSelectedCrop] = useState<TargetCropId | ''>('');
  const [errors, setErrors] = useState<{ farmId?: string; targetCrop?: string }>({});

  // Inicialização de fazendas e recuperação de rascunho
  useEffect(() => {
    const loadedFarms = quotationService.getProducerFarms(producerUser);
    setFarms(loadedFarms);

    const draft = quotationService.getDraft();
    if (draft) {
      if (draft.farmId) setSelectedFarmId(draft.farmId);
      if (draft.targetCrop) setSelectedCrop(draft.targetCrop);
    } else if (loadedFarms.length === 1 && !selectedFarmId) {
      // Pré-seleciona a fazenda principal caso haja apenas uma cadastrada
      setSelectedFarmId(loadedFarms[0].id);
    }
  }, [producerUser]);

  // Se o usuário não for produtor rural
  if (user && user.role !== 'PRODUCER') {
    return (
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 bg-sand-50">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-soft border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Exclusivo para Produtores</h2>
          <p className="text-sm text-slate-600 mb-6">
            Apenas produtores rurais cadastrados podem solicitar e gerenciar cotações de insumos agrícolas.
          </p>
          <Link
            href="/revenda/dashboard"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-semibold text-sm transition-colors"
          >
            Ir para Painel da Revenda
          </Link>
        </div>
      </div>
    );
  }

  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const farmId = e.target.value;
    setSelectedFarmId(farmId);
    if (errors.farmId) {
      setErrors((prev) => ({ ...prev, farmId: undefined }));
    }
  };

  const handleCropSelect = (cropId: TargetCropId) => {
    setSelectedCrop(cropId);
    if (errors.targetCrop) {
      setErrors((prev) => ({ ...prev, targetCrop: undefined }));
    }
  };

  const handleNextToItems = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = step1DestinationSchema.safeParse({
      farmId: selectedFarmId,
      targetCrop: selectedCrop,
    });

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setErrors({
        farmId: fieldErrors.farmId?.[0],
        targetCrop: fieldErrors.targetCrop?.[0],
      });
      return;
    }

    setErrors({});

    const selectedFarmObj = farms.find((f) => f.id === selectedFarmId);
    const selectedCropObj = TARGET_CROPS.find((c) => c.id === selectedCrop);

    // Salva estado no rascunho temporário
    quotationService.saveDraft({
      farmId: selectedFarmId,
      farmName: selectedFarmObj?.name,
      targetCity: selectedFarmObj?.city,
      targetState: selectedFarmObj?.state,
      targetCrop: selectedCrop as TargetCropId,
      targetCropName: selectedCropObj?.name,
    });

    // Avança para o Passo 2 sem recarregar a página
    setCurrentStep(2);
  };

  const selectedFarmObj = farms.find((f) => f.id === selectedFarmId);
  const selectedCropObj = TARGET_CROPS.find((c) => c.id === selectedCrop);

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/10 to-sand-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navegação e Retorno */}
        <div className="flex items-center justify-between">
          <Link
            href="/produtor/dashboard"
            className="inline-flex items-center gap-1.5 text-agro-700 hover:text-agro-800 font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Dashboard</span>
          </Link>

          <span className="text-xs font-semibold uppercase tracking-wider text-agro-800 bg-agro-100/80 px-3 py-1 rounded-full">
            Ciclo de Cotações • US06
          </span>
        </div>

        {/* Stepper Visual do Wizard */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-soft border border-slate-200/80">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Passo 1 */}
            <div
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all ${
                currentStep === 1
                  ? 'bg-agro-50 border border-agro-300 text-agro-900 font-semibold'
                  : currentStep > 1
                  ? 'bg-emerald-50/60 text-emerald-800 font-medium'
                  : 'text-slate-400 font-normal'
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
                  currentStep === 1
                    ? 'bg-agro-700 text-white'
                    : currentStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold leading-none">Passo 1</p>
                <p className="text-xs sm:text-sm truncate">Destino e Cultura</p>
              </div>
            </div>

            {/* Passo 2 */}
            <div
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all ${
                currentStep === 2
                  ? 'bg-agro-50 border border-agro-300 text-agro-900 font-semibold'
                  : currentStep > 2
                  ? 'bg-emerald-50/60 text-emerald-800 font-medium'
                  : 'text-slate-400 font-normal'
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
                  currentStep === 2
                    ? 'bg-agro-700 text-white'
                    : currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold leading-none">Passo 2</p>
                <p className="text-xs sm:text-sm truncate">Itens da Cotação</p>
              </div>
            </div>

            {/* Passo 3 */}
            <div
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all ${
                currentStep === 3
                  ? 'bg-agro-50 border border-agro-300 text-agro-900 font-semibold'
                  : 'text-slate-400 font-normal'
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
                  currentStep === 3 ? 'bg-agro-700 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                3
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold leading-none">Passo 3</p>
                <p className="text-xs sm:text-sm truncate">Prazos e Envio</p>
              </div>
            </div>
          </div>
        </div>

        {/* PASSO 1: DESTINO E CULTURA */}
        {currentStep === 1 && (
          <form onSubmit={handleNextToItems} className="space-y-6">
            {/* Header da Etapa */}
            <div className="bg-white rounded-2xl shadow-soft border border-agro-100 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-agro-700 to-agro-900 text-white flex items-center justify-center shadow-md shrink-0">
                  <Sprout className="w-6 h-6 text-harvest-400" />
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-bold text-slate-900">
                    Nova Cotação de Insumos: Passo 1 – Destino e Cultura
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Selecione a propriedade rural de entrega e a cultura agrícola atendida para garantir que apenas
                    revendas que atendam logisticamente sua região recebam a demanda.
                  </p>
                </div>
              </div>

              {producerUser && (
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-800">
                    <Building className="w-3.5 h-3.5 text-agro-700" />
                    {producerUser.farmName}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {producerUser.city} — {producerUser.state}
                  </span>
                </div>
              )}
            </div>

            {/* Seção 1: Seleção da Propriedade */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="farmId" className="block text-sm font-bold text-slate-900">
                  Propriedade Rural de Destino <span className="text-red-600 font-semibold">*</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">Local de entrega dos insumos</span>
              </div>

              <p className="text-xs text-slate-500">
                Selecione a fazenda cadastrada que receberá os defensivos, fertilizantes ou corretivos solicitados.
              </p>

              <div className="relative">
                <select
                  id="farmId"
                  name="farmId"
                  value={selectedFarmId}
                  onChange={handleFarmChange}
                  className={`w-full appearance-none px-4 py-3.5 rounded-xl border bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                    errors.farmId
                      ? 'border-red-500 focus:ring-red-200 bg-red-50/20'
                      : 'border-slate-200 focus:border-agro-600 focus:ring-agro-100'
                  }`}
                >
                  <option value="">Selecione uma fazenda cadastrada...</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} — {farm.city}/{farm.state}
                    </option>
                  ))}
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <Building className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Mensagem de Erro Inline da Propriedade */}
              {errors.farmId && (
                <p
                  id="farmId-error"
                  role="alert"
                  className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errors.farmId}</span>
                </p>
              )}
            </div>

            {/* Seção 2: Seleção da Cultura-Alvo */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <label id="targetCrop-label" className="block text-sm font-bold text-slate-900">
                  Cultura Agrícola Atendida <span className="text-red-600 font-semibold">*</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">Selecione a cultura desta cotação</span>
              </div>

              <p className="text-xs text-slate-500">
                A cultura define os grupos de defensivos, nutrientes e especificações técnicas compatíveis.
              </p>

              {/* Grid das 5 Culturas Válidas */}
              <div
                role="radiogroup"
                aria-labelledby="targetCrop-label"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1"
              >
                {TARGET_CROPS.map((crop) => {
                  const isSelected = selectedCrop === crop.id;
                  return (
                    <button
                      key={crop.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleCropSelect(crop.id)}
                      className={`relative flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-agro-500 ${
                        isSelected
                          ? 'bg-agro-50/90 border-agro-600 shadow-sm ring-1 ring-agro-600'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="text-2xl p-2 rounded-xl bg-slate-100 shrink-0" role="img" aria-label={crop.name}>
                        {crop.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-sm text-slate-900 leading-tight">{crop.name}</span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                              isSelected ? 'border-agro-600 bg-agro-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 leading-snug">{crop.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mensagem de Erro Inline da Cultura */}
              {errors.targetCrop && (
                <p
                  id="targetCrop-error"
                  role="alert"
                  className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errors.targetCrop}</span>
                </p>
              )}
            </div>

            {/* Barra de Ações do Passo 1 */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
              <Link
                href="/produtor/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm text-center transition-colors"
              >
                Cancelar Cotação
              </Link>

              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                <span>Avançar para Itens</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* PASSO 2: ITENS DA COTAÇÃO (Após Avançar com Sucesso) */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Banner com os Dados Salvos no Passo 1 */}
            <div className="bg-emerald-900/90 text-white rounded-2xl p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Passo 1 Concluído • Rascunho Salvo</span>
                </div>
                <h2 className="text-xl font-bold text-white font-serif">
                  {selectedFarmObj?.name || 'Fazenda'} • {selectedCropObj?.name || 'Cultura'}
                </h2>
                <p className="text-xs text-emerald-100/90 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                  Destino: {selectedFarmObj?.city}/{selectedFarmObj?.state}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors self-start md:self-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Alterar Destino ou Cultura</span>
              </button>
            </div>

            {/* Conteúdo do Passo 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-agro-50 border border-agro-200 text-agro-700 flex items-center justify-center mx-auto">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl font-bold text-slate-900">
                Passo 2: Inclusão de Insumos para {selectedCropObj?.name}
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Agora que o destino ({selectedFarmObj?.city}/{selectedFarmObj?.state}) e a cultura ({selectedCropObj?.name})
                estão definidos, adicione os produtos desejados especificando categoria, quantidade e unidade.
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para Destino e Cultura</span>
                </button>

                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-agro-100/60 text-agro-800 font-semibold text-sm">
                  <Sparkles className="w-4 h-4 text-harvest-600" />
                  <span>Pronto para adicionar itens da demanda</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Building,
  MapPin,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Sprout,
  Layers,
  Search,
  Plus,
  Trash2,
  Upload,
  FileText,
  FileCheck,
  DollarSign,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TARGET_CROPS } from '../data/target-crops';
import { searchCatalogProducts, CatalogProduct } from '../data/products';
import { quotationService } from '../services/quotation.service';
import {
  step1DestinationSchema,
  MAX_PRESCRIPTION_SIZE_BYTES,
  ALLOWED_PRESCRIPTION_TYPES,
} from '../schemas/quotation-wizard.schema';
import { ProducerFarm, TargetCropId, QuotationItem, RecipeAttachment } from '../types/quotation';
import { ProducerProfile } from '../types/user';

export const NewQuotationPage: React.FC = () => {
  const { user } = useAuth();
  const producerUser = user?.role === 'PRODUCER' ? (user as ProducerProfile) : null;

  // Wizard Step State (1: Destino e Cultura, 2: Itens, 3: Condições Comerciais)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1 Form State
  const [farms, setFarms] = useState<ProducerFarm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedCrop, setSelectedCrop] = useState<TargetCropId | ''>('');
  const [step1Errors, setStep1Errors] = useState<{ farmId?: string; targetCrop?: string }>({});

  // Step 2 Form State
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [productQuery, setProductQuery] = useState<string>('');
  const [productSuggestions, setProductSuggestions] = useState<CatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [unitInput, setUnitInput] = useState<string>('Kg');
  const [acceptsGeneric, setAcceptsGeneric] = useState<boolean>(true);
  const [itemError, setItemError] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Receituário Agronômico
  const [prescription, setPrescription] = useState<RecipeAttachment | null>(null);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  // Inicialização de fazendas e recuperação de rascunho
  useEffect(() => {
    const loadedFarms = quotationService.getProducerFarms(producerUser);
    setFarms(loadedFarms);

    const draft = quotationService.getDraft();
    if (draft) {
      if (draft.farmId) setSelectedFarmId(draft.farmId);
      if (draft.targetCrop) setSelectedCrop(draft.targetCrop);
      if (draft.items && draft.items.length > 0) setItems(draft.items);
      if (draft.prescription) setPrescription(draft.prescription);
    } else if (loadedFarms.length === 1 && !selectedFarmId) {
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

  // Handlers do Passo 1
  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const farmId = e.target.value;
    setSelectedFarmId(farmId);
    if (step1Errors.farmId) {
      setStep1Errors((prev) => ({ ...prev, farmId: undefined }));
    }
  };

  const handleCropSelect = (cropId: TargetCropId) => {
    setSelectedCrop(cropId);
    if (step1Errors.targetCrop) {
      setStep1Errors((prev) => ({ ...prev, targetCrop: undefined }));
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
      setStep1Errors({
        farmId: fieldErrors.farmId?.[0],
        targetCrop: fieldErrors.targetCrop?.[0],
      });
      return;
    }

    setStep1Errors({});

    const selectedFarmObj = farms.find((f) => f.id === selectedFarmId);
    const selectedCropObj = TARGET_CROPS.find((c) => c.id === selectedCrop);

    quotationService.saveDraft({
      farmId: selectedFarmId,
      farmName: selectedFarmObj?.name,
      targetCity: selectedFarmObj?.city,
      targetState: selectedFarmObj?.state,
      targetCrop: selectedCrop as TargetCropId,
      targetCropName: selectedCropObj?.name,
      items,
      prescription: prescription || undefined,
    });

    setCurrentStep(2);
  };

  // Handlers do Passo 2 (Busca preditiva e inclusão de itens)
  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setProductQuery(query);
    setItemError(null);

    if (query.trim().length >= 2) {
      const matches = searchCatalogProducts(query);
      setProductSuggestions(matches);
    } else {
      setProductSuggestions([]);
    }
  };

  const handleSelectProductSuggestion = (prod: CatalogProduct) => {
    setSelectedProduct(prod);
    setProductQuery(prod.name);
    setUnitInput(prod.defaultUnit || 'Kg');
    setProductSuggestions([]);
    setItemError(null);
  };

  const handleAddItem = (e: React.MouseEvent) => {
    e.preventDefault();
    setItemError(null);

    const trimmedName = productQuery.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setItemError('Informe o nome do produto ou princípio ativo');
      return;
    }

    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      setItemError('A quantidade deve ser maior que zero (0)');
      return;
    }

    if (!unitInput.trim()) {
      setItemError('Selecione a unidade de medida');
      return;
    }

    const newItem: QuotationItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      productName: trimmedName,
      activeIngredient: selectedProduct?.activeIngredient || trimmedName,
      quantity: qty,
      unit: unitInput.trim(),
      acceptsGeneric,
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setStep2Error(null);

    // Reseta campos de inclusão
    setProductQuery('');
    setSelectedProduct(null);
    setQuantityInput('');
    setProductSuggestions([]);
    setAcceptsGeneric(true);

    // Salva no rascunho
    const draft = quotationService.getDraft() || {};
    quotationService.saveDraft({
      ...draft,
      items: updatedItems,
      prescription: prescription || undefined,
    });
  };

  const handleRemoveItem = (id?: string) => {
    if (!id) return;
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);

    const draft = quotationService.getDraft() || {};
    quotationService.saveDraft({
      ...draft,
      items: updated,
    });
  };

  // Upload do Receituário Agronômico
  const handlePrescriptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrescriptionError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PRESCRIPTION_SIZE_BYTES) {
      setPrescriptionError('O arquivo excede o limite máximo permitido de 5MB.');
      return;
    }

    const fileType = file.type.toLowerCase();
    const isAllowed = ALLOWED_PRESCRIPTION_TYPES.includes(fileType) || file.name.endsWith('.pdf');
    if (!isAllowed) {
      setPrescriptionError('Formato inválido. Apenas arquivos PDF ou imagens (PNG, JPG) são permitidos.');
      return;
    }

    const attachment: RecipeAttachment = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf',
      uploadedAt: new Date().toISOString(),
    };

    setPrescription(attachment);

    const draft = quotationService.getDraft() || {};
    quotationService.saveDraft({
      ...draft,
      prescription: attachment,
    });
  };

  const handleRemovePrescription = () => {
    setPrescription(null);
    setPrescriptionError(null);
    const draft = quotationService.getDraft() || {};
    quotationService.saveDraft({
      ...draft,
      prescription: undefined,
    });
  };

  // Avançar do Passo 2 para o Passo 3
  const handleNextToCommercial = (e: React.MouseEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      setStep2Error('Exigido ao menos um item com volume válido para continuar.');
      return;
    }

    setStep2Error(null);

    const draft = quotationService.getDraft() || {};
    quotationService.saveDraft({
      ...draft,
      items,
      prescription: prescription || undefined,
    });

    setCurrentStep(3);
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
            Ciclo de Cotações • US06 / US07
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
                <p className="text-xs sm:text-sm truncate">Itens e Receituário</p>
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
                <p className="text-xs sm:text-sm truncate">Condições Comerciais</p>
              </div>
            </div>
          </div>
        </div>

        {/* PASSO 1: DESTINO E CULTURA (US06) */}
        {currentStep === 1 && (
          <form onSubmit={handleNextToItems} className="space-y-6">
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
                    step1Errors.farmId
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

              {step1Errors.farmId && (
                <p
                  id="farmId-error"
                  role="alert"
                  className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{step1Errors.farmId}</span>
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

              {step1Errors.targetCrop && (
                <p
                  id="targetCrop-error"
                  role="alert"
                  className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{step1Errors.targetCrop}</span>
                </p>
              )}
            </div>

            {/* Ações Passo 1 */}
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

        {/* PASSO 2: ITENS, GENÉRICOS E RECEITUÁRIO (US07) */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Banner de Contexto da Etapa 1 */}
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
                  Entrega: {selectedFarmObj?.city}/{selectedFarmObj?.state}
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

            {/* Cabeçalho do Passo 2 */}
            <div className="bg-white rounded-2xl shadow-soft border border-agro-100 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-agro-700 to-agro-900 text-white flex items-center justify-center shadow-md shrink-0">
                  <Layers className="w-6 h-6 text-harvest-400" />
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-bold text-slate-900">
                    Passo 2: Itens, Genéricos e Receituário
                  </h1>
                  <h2 className="text-sm font-semibold text-agro-800 mt-1">
                    Passo 2: Inclusão de Insumos para {selectedCropObj?.name || 'sua Cultura'}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Adicione insumos por busca preditiva, defina quantidades, autorize produtos equivalentes/genéricos
                    e anexe o receituário agronômico correspondente.
                  </p>
                </div>
              </div>
            </div>

            {/* Formulário de Adição de Item */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-agro-700" />
                  <span>Especificar Insumo Agrícola</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Busque por marca comercial ou princípio ativo (ex: Mancozeb 750 WG, Glifosato, NPK).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Busca Preditiva de Produto */}
                <div className="md:col-span-6 relative">
                  <label htmlFor="product-search" className="block text-xs font-bold text-slate-700 mb-1">
                    Produto ou Princípio Ativo <span className="text-red-600 font-semibold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="product-search"
                      type="text"
                      value={productQuery}
                      onChange={handleProductSearchChange}
                      placeholder="Ex: Mancozeb 750 WG..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:border-agro-600 focus:ring-2 focus:ring-agro-100 outline-none transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>

                  {/* Dropdown de Sugestões Preditivas */}
                  {productSuggestions.length > 0 && (
                    <ul
                      role="listbox"
                      className="absolute z-20 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-fade-in"
                    >
                      {productSuggestions.map((prod) => (
                        <li
                          key={prod.id}
                          role="option"
                          aria-selected={selectedProduct?.id === prod.id}
                          onClick={() => handleSelectProductSuggestion(prod)}
                          className="p-3 hover:bg-agro-50/80 cursor-pointer transition-colors"
                        >
                          <p className="text-sm font-bold text-slate-900">{prod.name}</p>
                          <p className="text-xs text-slate-500">
                            Ativo: <span className="font-medium text-agro-700">{prod.activeIngredient}</span> • {prod.category}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Quantidade */}
                <div className="md:col-span-3">
                  <label htmlFor="item-quantity" className="block text-xs font-bold text-slate-700 mb-1">
                    Quantidade <span className="text-red-600 font-semibold">*</span>
                  </label>
                  <input
                    id="item-quantity"
                    type="number"
                    min="0"
                    step="any"
                    value={quantityInput}
                    onChange={(e) => {
                      setQuantityInput(e.target.value);
                      setItemError(null);
                    }}
                    placeholder="Ex: 50"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:border-agro-600 focus:ring-2 focus:ring-agro-100 outline-none transition-all"
                  />
                </div>

                {/* Unidade de Medida */}
                <div className="md:col-span-3">
                  <label htmlFor="item-unit" className="block text-xs font-bold text-slate-700 mb-1">
                    Unidade <span className="text-red-600 font-semibold">*</span>
                  </label>
                  <select
                    id="item-unit"
                    value={unitInput}
                    onChange={(e) => setUnitInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:border-agro-600 focus:ring-2 focus:ring-agro-100 outline-none transition-all"
                  >
                    <option value="Kg">Kg (Quilogramas)</option>
                    <option value="L">L (Litros)</option>
                    <option value="Sc">Sc (Sacas)</option>
                    <option value="Ton">Ton (Toneladas)</option>
                    <option value="Galão">Galão</option>
                  </select>
                </div>
              </div>

              {/* Opção Genérico e Botão de Adicionar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <label
                  htmlFor="accepts-generic"
                  className="inline-flex items-center gap-2.5 cursor-pointer select-none text-sm text-slate-800 font-medium"
                >
                  <input
                    id="accepts-generic"
                    type="checkbox"
                    checked={acceptsGeneric}
                    onChange={(e) => setAcceptsGeneric(e.target.checked)}
                    className="w-4 h-4 rounded text-agro-700 focus:ring-agro-500 border-slate-300"
                  />
                  <span>
                    Aceita produto genérico/equivalente?:{' '}
                    <strong className={acceptsGeneric ? 'text-agro-800' : 'text-slate-500'}>
                      {acceptsGeneric ? 'Sim' : 'Não'}
                    </strong>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-bold text-sm shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Item</span>
                </button>
              </div>

              {/* Mensagem de Erro Inline para o Item */}
              {itemError && (
                <p role="alert" className="text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{itemError}</span>
                </p>
              )}
            </div>

            {/* Tabela Dinâmica de Itens da Cotação */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg font-bold text-slate-900">
                    Tabela de Itens da Demanda ({items.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Relação de insumos que serão cotados pelas revendas agrícolas parceiras.
                  </p>
                </div>

                {items.length > 0 && (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {items.length} {items.length === 1 ? 'item adicionado' : 'itens adicionados'}
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Nenhum item adicionado à cotação ainda</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Preencha o formulário acima e clique em "Adicionar Item" para incluir defensivos, adubos ou corretivos.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <th className="py-3 px-4">Item / Princípio Ativo</th>
                        <th className="py-3 px-4">Volume</th>
                        <th className="py-3 px-4">Genérico?</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{item.productName}</p>
                            {item.activeIngredient && (
                              <p className="text-xs text-slate-500">Ativo: {item.activeIngredient}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-3 px-4">
                            {item.acceptsGeneric ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Sim</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                <span>Não</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label={`Excluir ${item.productName}`}
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Erro de tabela vazia ao tentar avançar */}
              {step2Error && (
                <p role="alert" className="text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{step2Error}</span>
                </p>
              )}
            </div>

            {/* Anexo do Receituário Agronômico (Máx 5MB) */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-agro-700" />
                    <span>Receituário Agronômico</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Obrigatório para defensivos agrícolas de acordo com as normas fitossanitárias.
                  </p>
                </div>

                {prescription && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Upload Concluído</span>
                  </span>
                )}
              </div>

              {!prescription ? (
                <div className="relative border-2 border-dashed border-slate-200 hover:border-agro-400 rounded-2xl p-6 text-center transition-colors">
                  <input
                    id="prescription-upload"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={handlePrescriptionUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-xl bg-agro-50 text-agro-700 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Clique ou arraste o arquivo do Receituário Agronômico
                    </p>
                    <p className="text-xs text-slate-500">
                      Formatos aceitos: PDF, PNG, JPG ou JPEG (tamanho máximo de 5MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{prescription.name}</p>
                      <p className="text-xs text-slate-500">
                        {(prescription.size / (1024 * 1024)).toFixed(2)} MB • Anexado com sucesso
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemovePrescription}
                    aria-label="Remover receituário"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {prescriptionError && (
                <p role="alert" className="text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{prescriptionError}</span>
                </p>
              )}
            </div>

            {/* Ações do Passo 2 */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Destino e Cultura</span>
              </button>

              <button
                type="button"
                onClick={handleNextToCommercial}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                <span>Avançar para Condições Comerciais</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: CONDIÇÕES COMERCIAIS E ENVIO (Prévia) */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-emerald-900/90 text-white rounded-2xl p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Passo 2 Concluído • Itens da Demanda Registrados</span>
                </div>
                <h2 className="text-xl font-bold text-white font-serif">
                  {items.length} {items.length === 1 ? 'Insumo Cadastrado' : 'Insumos Cadastrados'}
                </h2>
                <p className="text-xs text-emerald-100/90 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                  {selectedFarmObj?.name} ({selectedFarmObj?.city}/{selectedFarmObj?.state}) • {selectedCropObj?.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors self-start md:self-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para Itens da Cotação</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-harvest-50 border border-harvest-200 text-harvest-700 flex items-center justify-center mx-auto">
                <DollarSign className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl font-bold text-slate-900">
                Passo 3: Prazos e Condições Comerciais
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Seus {items.length} insumos e receituário foram validados. Na próxima etapa você definirá a data limite para
                envio de propostas pelas revendas parceiras de {selectedFarmObj?.state}.
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para Itens da Cotação</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

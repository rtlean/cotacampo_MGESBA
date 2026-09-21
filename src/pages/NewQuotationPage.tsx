import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
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
  Truck,
  Clock,
  X,
  Sparkles,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TARGET_CROPS } from '../data/target-crops';
import { searchCatalogProducts, CatalogProduct } from '../data/products';
import { quotationService } from '../services/quotation.service';
import { packageService } from '../services/package.service';
import { SavePackageModal } from '../components/SavePackageModal';
import { agronomicAiService, PhytosanitaryRestriction } from '../services/agronomic-ai.service';
import { copilotService } from '../server/services/copilot.service';
import { CropCopilotOutput } from '../shared/schemas/copilot';
import {
  step1DestinationSchema,
  step3CommercialSchema,
  MAX_PRESCRIPTION_SIZE_BYTES,
  ALLOWED_PRESCRIPTION_TYPES,
} from '../schemas/quotation-wizard.schema';
import { ProducerFarm, TargetCropId, QuotationItem, RecipeAttachment, FreightType, QuotationDraft } from '../types/quotation';
import { ProducerProfile } from '../types/user';

export const NewQuotationPage: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
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

  // US11 / US11.1: Assistente IA de Dimensionamento e Recomendação (Copiloto IA tRPC)
  const [talhaoArea, setTalhaoArea] = useState<string>('15');
  const [talhaoSpacing, setTalhaoSpacing] = useState<string>('3000');
  const [aiDoseExplanation, setAiDoseExplanation] = useState<string | null>(null);
  const [aiRestriction, setAiRestriction] = useState<PhytosanitaryRestriction | null>(null);
  const [isCalculatingAi, setIsCalculatingAi] = useState<boolean>(false);
  const [aiDosageResult, setAiDosageResult] = useState<CropCopilotOutput | null>(null);

  // Receituário Agronômico
  const [prescription, setPrescription] = useState<RecipeAttachment | null>(null);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  // Step 3 Form State (Condições Comerciais e Publicação)
  const [freightType, setFreightType] = useState<FreightType | ''>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [proposalLimitHours, setProposalLimitHours] = useState<number>(48);
  const [commercialNotes, setCommercialNotes] = useState<string>('');
  const [step3Errors, setStep3Errors] = useState<{
    freightType?: string;
    paymentTerms?: string;
    proposalLimitHours?: string;
  }>({});
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // US17: Estados de Pacotes Tecnológicos (Salvar Lista & Recompra 1-Clique)
  const [isSavePackageModalOpen, setIsSavePackageModalOpen] = useState<boolean>(false);
  const [packageSuccessToast, setPackageSuccessToast] = useState<string | null>(null);
  const [loadedPackageName, setLoadedPackageName] = useState<string | null>(null);
  // US18: Recálculo de dosagem de item pré-carregado com IA
  const [recalculatingItemId, setRecalculatingItemId] = useState<string | null>(null);
  const [itemAiToast, setItemAiToast] = useState<string | null>(null);

  // Inicialização de fazendas e recuperação de rascunho / pacote
  useEffect(() => {
    const loadedFarms = quotationService.getProducerFarms(producerUser);
    setFarms(loadedFarms);

    // US17: Recompra em 1-Clique a partir de ?packageId=...
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const packageId = urlParams?.get('packageId');

    if (packageId) {
      void packageService.getPackageById(packageId).then((pkg) => {
        if (pkg && pkg.items && pkg.items.length > 0) {
          const mappedItems: QuotationItem[] = pkg.items.map((it, idx) => ({
            id: `item_pkg_${idx}_${Date.now()}`,
            productName: it.productName,
            quantity: it.quantity,
            unit: it.unit,
            acceptsGeneric: it.acceptsGeneric ?? true,
          }));
          setItems(mappedItems);
          setLoadedPackageName(pkg.name);

          // Identifica cultura correspondente
          const matchingCrop = TARGET_CROPS.find(
            (c) =>
              c.name.toLowerCase().includes(pkg.cropType.toLowerCase()) ||
              pkg.cropType.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchingCrop) {
            setSelectedCrop(matchingCrop.id as TargetCropId);
          }
          if (loadedFarms.length > 0) {
            setSelectedFarmId(loadedFarms[0].id);
          }
          const targetStep = urlParams?.get('step') === '2' ? 2 : 1;
          setCurrentStep(targetStep);
        }
      });
      return;
    }

    const draft = quotationService.getDraft();
    if (draft) {
      if (draft.farmId) setSelectedFarmId(draft.farmId);
      if (draft.targetCrop) setSelectedCrop(draft.targetCrop);
      if (draft.talhaoArea !== undefined) setTalhaoArea(String(draft.talhaoArea));
      if (draft.talhaoSpacing !== undefined) setTalhaoSpacing(String(draft.talhaoSpacing));
      if (draft.items && draft.items.length > 0) setItems(draft.items);
      if (draft.prescription) setPrescription(draft.prescription);
      if (draft.freightType) setFreightType(draft.freightType);
      if (draft.paymentTerms) setPaymentTerms(draft.paymentTerms);
      if (draft.proposalLimitHours) setProposalLimitHours(draft.proposalLimitHours);
      if (draft.notes) setCommercialNotes(draft.notes);
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

    // Se o produtor possuir área previamente cadastrada para a cultura (US01.1), sincroniza
    const cropDim = producerUser?.cropDimensions?.[cropId];
    if (cropDim?.area) {
      setTalhaoArea(String(cropDim.area));
    }
    if (cropDim?.plantsCount) {
      setTalhaoSpacing(String(cropDim.plantsCount));
    }
    setAiDoseExplanation(null);
    setAiRestriction(null);
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
      talhaoArea: parseFloat(talhaoArea.replace(',', '.')) || 15,
      talhaoSpacing: parseInt(talhaoSpacing.replace(/\D/g, ''), 10) || 3000,
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
    setAiDoseExplanation(null);

    // US11: Verificação preventiva de restrição fitossanitária (Cenário 2)
    const check = agronomicAiService.checkPhytosanitaryRestrictions(selectedCrop, query);
    setAiRestriction(check.hasRestriction ? check : null);

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
    setAiDoseExplanation(null);

    // US11: Verificação preventiva de restrição fitossanitária (Cenário 2)
    const check = agronomicAiService.checkPhytosanitaryRestrictions(selectedCrop, prod.name);
    setAiRestriction(check.hasRestriction ? check : null);
  };

  // US11 / US11.1 - Cálculo automático de volume por área e cultura (Copiloto IA tRPC)
  const handleCalculateDoseWithAi = async () => {
    const query = productQuery.trim() || selectedProduct?.name || '';
    if (!query) {
      setItemError('Informe o produto ou princípio ativo para calcular a dosagem com IA.');
      return;
    }

    const area = parseFloat(talhaoArea.replace(',', '.')) || 15;
    const spacing = parseInt(talhaoSpacing.replace(/\D/g, ''), 10) || 3000;
    const state = (producerUser?.state as 'MG' | 'ES' | 'BA') || 'ES';

    const normalizedCrop = (selectedCrop || 'cafe_conilon').replace(/-/g, '_') as
      | 'cafe_conilon'
      | 'cafe_arabica'
      | 'cacau'
      | 'pimenta_reino'
      | 'mamao';

    try {
      setIsCalculatingAi(true);
      const result = await copilotService.calculateDosage({
        cropType: normalizedCrop,
        areaHectares: area,
        plantCount: spacing,
        productOrActiveIngredient: query,
        state,
      });

      setAiDosageResult(result);
      setQuantityInput(String(result.recommendedQuantity));
      const mappedUnit =
        result.unit === 'Litros'
          ? 'L'
          : result.unit === 'Sacas'
          ? 'Sc'
          : result.unit === 'Toneladas'
          ? 'Ton'
          : result.unit;
      setUnitInput(mappedUnit);
      setAiDoseExplanation(`Dose recomendada de ${result.dosagePerHectare} para ${area} ha com aplicação tratorada/fertirrigação`);

      if (result.isLmrRestricted) {
        setAiRestriction({
          hasRestriction: true,
          cropId: selectedCrop,
          activeIngredient: query,
          warningMessage: result.warningMessage || 'Restrição severa de LMR e exportação.',
          recommendedAlternative: result.suggestedAlternatives?.[0]
            ? {
                id: 'alt-1',
                name: result.suggestedAlternatives[0],
                category: 'Defensivos',
                activeIngredient: 'Princípio Ativo Registrado',
                defaultUnit: 'L',
              }
            : undefined,
        });
      } else {
        setAiRestriction(null);
      }
      setItemError(null);
    } catch (err) {
      console.warn('Erro na chamada do Copiloto IA, utilizando fallback local:', err);
      const calculation = agronomicAiService.calculateDosage({
        cropId: selectedCrop,
        productNameOrActive: query,
        areaHectares: area,
        plantsPerHectare: spacing,
      });
      setQuantityInput(String(calculation.recommendedQuantity));
      setUnitInput(calculation.recommendedUnit);
      setAiDoseExplanation(calculation.explanation);
    } finally {
      setIsCalculatingAi(false);
    }
  };

  // US11.1 - Seleção de alternativa fitossanitária sugerida em chips
  const handleSelectAlternativeName = (altName: string) => {
    setProductQuery(altName);
    setSelectedProduct({
      id: `alt-${altName.toLowerCase().replace(/\s+/g, '-')}`,
      name: altName,
      category: 'Defensivos',
      activeIngredient: altName,
      defaultUnit: 'L',
    });
    setAiRestriction(null);
    setItemError(null);

    const area = parseFloat(talhaoArea.replace(',', '.')) || 15;
    const spacing = parseInt(talhaoSpacing.replace(/\D/g, ''), 10) || 3000;
    const state = (producerUser?.state as 'MG' | 'ES' | 'BA') || 'ES';
    const normalizedCrop = (selectedCrop || 'cafe_conilon').replace(/-/g, '_') as
      | 'cafe_conilon'
      | 'cafe_arabica'
      | 'cacau'
      | 'pimenta_reino'
      | 'mamao';

    copilotService
      .calculateDosage({
        cropType: normalizedCrop,
        areaHectares: area,
        plantCount: spacing,
        productOrActiveIngredient: altName,
        state,
      })
      .then((res) => {
        setAiDosageResult(res);
        setQuantityInput(String(res.recommendedQuantity));
        const mappedUnit =
          res.unit === 'Litros'
            ? 'L'
            : res.unit === 'Sacas'
            ? 'Sc'
            : res.unit === 'Toneladas'
            ? 'Ton'
            : res.unit;
        setUnitInput(mappedUnit);
        setAiDoseExplanation(`Dose recomendada de ${res.dosagePerHectare} para ${area} ha com aplicação tratorada/fertirrigação`);
      })
      .catch((err) => {
        console.warn('Erro ao recalcular dose da alternativa:', err);
      });
  };

  // US11 - Cenário 2: Substituição com 1 clique por alternativa segura recomendada
  const handleReplaceWithAlternative = () => {
    if (!aiRestriction?.recommendedAlternative) return;

    const alternative = aiRestriction.recommendedAlternative;
    setSelectedProduct(alternative);
    setProductQuery(alternative.name);
    setUnitInput(alternative.defaultUnit || 'L');
    setAiRestriction(null);
    setItemError(null);

    // Recalcula a dosagem automaticamente para o novo produto seguro
    const area = parseFloat(talhaoArea.replace(',', '.')) || 15;
    const spacing = parseInt(talhaoSpacing.replace(/\D/g, ''), 10) || 3000;

    const calculation = agronomicAiService.calculateDosage({
      cropId: selectedCrop,
      productNameOrActive: alternative.name,
      areaHectares: area,
      plantsPerHectare: spacing,
    });

    setQuantityInput(String(calculation.recommendedQuantity));
    setUnitInput(calculation.recommendedUnit);
    setAiDoseExplanation(calculation.explanation);
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
    setAiDoseExplanation(null);
    setAiRestriction(null);

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

  // US18 - Cenário 2: Recalcular dosagem com IA em item individual da tabela baseado na nova área
  const handleRecalculateItemDoseWithAi = async (itemId?: string) => {
    if (!itemId) return;
    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem) return;

    const area = parseFloat(talhaoArea.replace(',', '.')) || 15;
    const spacing = parseInt(talhaoSpacing.replace(/\D/g, ''), 10) || 3000;
    const state = (producerUser?.state as 'MG' | 'ES' | 'BA') || 'ES';

    const normalizedCrop = (selectedCrop || 'cafe_conilon').replace(/-/g, '_') as
      | 'cafe_conilon'
      | 'cafe_arabica'
      | 'cacau'
      | 'pimenta_reino'
      | 'mamao';

    try {
      setRecalculatingItemId(itemId);
      const result = await copilotService.calculateDosage({
        cropType: normalizedCrop,
        areaHectares: area,
        plantCount: spacing,
        productOrActiveIngredient: targetItem.productName,
        state,
      });

      const mappedUnit =
        result.unit === 'Litros'
          ? 'L'
          : result.unit === 'Sacas'
          ? 'Sc'
          : result.unit === 'Toneladas'
          ? 'Ton'
          : result.unit;

      const updated = items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              quantity: result.recommendedQuantity,
              unit: mappedUnit,
            }
          : it
      );
      setItems(updated);

      const draft = quotationService.getDraft() || {};
      quotationService.saveDraft({
        ...draft,
        items: updated,
      });

      setItemAiToast(
        `Dose recalculada com IA para "${targetItem.productName}": ${result.recommendedQuantity} ${mappedUnit} (${area} ha)`
      );
      setTimeout(() => setItemAiToast(null), 5000);
    } catch (err) {
      console.warn('Erro ao recalcular dose do item com Copiloto IA, usando fallback local:', err);
      const fallbackCalc = agronomicAiService.calculateDosage({
        cropId: selectedCrop,
        productNameOrActive: targetItem.productName,
        areaHectares: area,
        plantsPerHectare: spacing,
      });

      const updated = items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              quantity: fallbackCalc.recommendedQuantity,
              unit: fallbackCalc.recommendedUnit,
            }
          : it
      );
      setItems(updated);

      const draft = quotationService.getDraft() || {};
      quotationService.saveDraft({
        ...draft,
        items: updated,
      });

      setItemAiToast(
        `Dose recalculada com IA para "${targetItem.productName}": ${fallbackCalc.recommendedQuantity} ${fallbackCalc.recommendedUnit} (${area} ha)`
      );
      setTimeout(() => setItemAiToast(null), 5000);
    } finally {
      setRecalculatingItemId(null);
    }
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

  // Handler para publicação da cotação (Passo 3 - US08)
  const handlePublishQuotation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!producerUser) {
      setPublishError('Usuário produtor não autenticado.');
      return;
    }

    const validation = step3CommercialSchema.safeParse({
      freightType: freightType || undefined,
      paymentTerms: paymentTerms || undefined,
      proposalLimitHours,
      notes: commercialNotes,
    });

    if (!validation.success) {
      const fieldErrors: {
        freightType?: string;
        paymentTerms?: string;
        proposalLimitHours?: string;
      } = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as 'freightType' | 'paymentTerms' | 'proposalLimitHours';
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setStep3Errors(fieldErrors);
      setPublishError('Por favor, preencha todos os campos obrigatórios em destaque.');
      return;
    }

    setStep3Errors({});
    setPublishError(null);
    setIsPublishing(true);

    try {
      const currentDraft = quotationService.getDraft() || {};
      const consolidatedDraft: QuotationDraft = {
        ...currentDraft,
        farmId: selectedFarmId,
        farmName: selectedFarmObj?.name,
        targetCity: selectedFarmObj?.city,
        targetState: selectedFarmObj?.state,
        targetCrop: selectedCrop as TargetCropId,
        targetCropName: selectedCropObj?.name,
        items,
        prescription: prescription || undefined,
        freightType: validation.data.freightType,
        paymentTerms: validation.data.paymentTerms,
        proposalLimitHours: validation.data.proposalLimitHours,
        notes: commercialNotes || undefined,
      };

      await quotationService.publishQuotation({
        draft: consolidatedDraft,
        user: producerUser,
        commercial: validation.data,
      });

      // Redireciona para o dashboard com a mensagem de sucesso
      setLocation('/produtor/dashboard');
    } catch (err) {
      console.error('Erro ao publicar cotação:', err);
      setPublishError('Ocorreu um erro ao publicar a cotação. Tente novamente.');
      setIsPublishing(false);
    }
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

            {/* US18: Banner informativo de Pacote Tecnológico selecionado no Passo 1 */}
            {loadedPackageName && (
              <div
                role="status"
                data-testid="loaded-package-banner-step1"
                className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs text-emerald-800 flex items-center justify-between gap-3 animate-fade-in"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950 text-sm block sm:inline">
                      Pacote Tecnológico selecionado: "{loadedPackageName}"
                    </span>{' '}
                    <span className="text-slate-600 block sm:inline mt-0.5 sm:mt-0">
                      — Confirme a fazenda de destino e avance para conferir a lista de insumos pré-carregada.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLoadedPackageName(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold shrink-0 p-1"
                  title="Descartar pacote"
                >
                  ✕
                </button>
              </div>
            )}

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

            {/* US18: Seção 3: Dimensões da Área Plantada (Usado pelo Copiloto IA para Ajustes de Volume) */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="step1-talhao-area" className="block text-sm font-bold text-slate-900">
                  Área Plantada / Manejo (hectares)
                </label>
                <span className="text-xs text-agro-700 font-semibold bg-agro-50 px-2.5 py-1 rounded-full border border-agro-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-harvest-500" />
                  <span>Usado pelo Copiloto IA</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Informe a área atual do talhão para que a IA recalcule automaticamente dosagens e volumes dos insumos.
              </p>
              <div className="max-w-xs">
                <input
                  id="step1-talhao-area"
                  data-testid="input-step1-area"
                  type="text"
                  value={talhaoArea}
                  onChange={(e) => setTalhaoArea(e.target.value)}
                  placeholder="Ex: 15"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold focus:border-agro-600 focus:ring-2 focus:ring-agro-100 outline-none transition-all"
                />
              </div>
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

              {/* US11 - Cenário 2: Alerta preventivo de restrição fitossanitária (Mamão / Pimenta) */}
              {aiRestriction && aiRestriction.hasRestriction && (
                <div
                  data-testid="ai-restriction-card"
                  className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 text-amber-900 shadow-sm animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/70 text-amber-900 uppercase tracking-wider mb-1">
                        Alerta Fitossanitário • Copiloto IA
                      </span>
                      <p className="text-sm font-semibold text-amber-950 leading-relaxed">
                        {aiRestriction.warningMessage}
                      </p>
                      {aiRestriction.recommendedAlternative && (
                        <p className="text-xs text-amber-800 mt-1.5">
                          Alternativa em conformidade:{' '}
                          <strong className="text-amber-950 underline decoration-amber-400">
                            {aiRestriction.recommendedAlternative.name}
                          </strong>{' '}
                          (Princípio Ativo: {aiRestriction.recommendedAlternative.activeIngredient})
                        </p>
                      )}
                    </div>
                  </div>

                  {aiRestriction.recommendedAlternative && (
                    <button
                      type="button"
                      onClick={handleReplaceWithAlternative}
                      data-testid="btn-ai-replace-item"
                      className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer self-start md:self-auto"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Substituir por Alternativa Recomendada</span>
                    </button>
                  )}

                  {aiDosageResult?.suggestedAlternatives && aiDosageResult.suggestedAlternatives.length > 0 && (
                    <div className="w-full flex flex-wrap items-center gap-1.5 pt-2 border-t border-amber-200/60 mt-1">
                      <span className="text-xs text-amber-900 font-bold">Alternativas de baixo resíduo:</span>
                      {aiDosageResult.suggestedAlternatives.map((alt) => (
                        <button
                          key={alt}
                          type="button"
                          data-testid={`chip-alt-${alt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                          onClick={() => handleSelectAlternativeName(alt)}
                          className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs border border-amber-300 transition-colors cursor-pointer"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* US11 - Cenário 1: Assistente IA de Dimensionamento e Recomendação no Wizard */}
              <div
                data-testid="ai-copilot-container"
                className="bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-amber-50/40 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-700 text-white shadow-xs shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                        <span>Copiloto IA: Dimensionamento & Recomendação</span>
                        <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-semibold">
                          MAPA Bula Oficial
                        </span>
                      </h3>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Cálculo automático de volume exato com base na área e plantas para{' '}
                        <strong>{selectedCropObj?.name || 'sua Cultura'}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isCalculatingAi}
                    onClick={handleCalculateDoseWithAi}
                    data-testid="btn-ai-calculate-dose"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-agro-700 to-emerald-700 hover:from-agro-800 hover:to-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-60"
                  >
                    <Sparkles className={`w-4 h-4 ${isCalculatingAi ? 'animate-spin' : ''}`} />
                    <span>{isCalculatingAi ? 'Calculando com IA...' : 'Calcular Dosagem com IA'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-100">
                  <div>
                    <label htmlFor="ai-talhao-area" className="block text-xs font-bold text-emerald-950 mb-1">
                      Área do Talhão (hectares)
                    </label>
                    <input
                      id="ai-talhao-area"
                      data-testid="input-ai-area"
                      type="text"
                      value={talhaoArea}
                      onChange={(e) => setTalhaoArea(e.target.value)}
                      placeholder="Ex: 15"
                      className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-slate-900 text-xs font-semibold focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="ai-talhao-spacing" className="block text-xs font-bold text-emerald-950 mb-1">
                      Espaçamento / Densidade (plantas/ha)
                    </label>
                    <input
                      id="ai-talhao-spacing"
                      data-testid="input-ai-spacing"
                      type="text"
                      value={talhaoSpacing}
                      onChange={(e) => setTalhaoSpacing(e.target.value)}
                      placeholder="Ex: 3000"
                      className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-slate-900 text-xs font-semibold focus:border-agro-600 focus:ring-1 focus:ring-agro-500 outline-none"
                    />
                  </div>
                </div>

                {aiDoseExplanation && (
                  <div
                    data-testid="ai-dose-explanation"
                    className="p-3 bg-emerald-100/90 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{aiDoseExplanation}</span>
                  </div>
                )}

                {aiDosageResult && (
                  <div
                    data-testid="ai-copilot-result-card"
                    className="p-3 bg-emerald-100/90 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-semibold space-y-1 animate-fade-in"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-bold">Dosagem Recomendada: {aiDosageResult.dosagePerHectare}</span>
                      <span className="text-emerald-800">({aiDosageResult.recommendedQuantity} {aiDosageResult.unit})</span>
                    </div>
                    <p className="text-emerald-800 font-normal">{aiDosageResult.justification}</p>
                  </div>
                )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="item-quantity" className="block text-xs font-bold text-slate-700">
                      Quantidade <span className="text-red-600 font-semibold">*</span>
                    </label>
                    <button
                      type="button"
                      disabled={isCalculatingAi}
                      onClick={handleCalculateDoseWithAi}
                      data-testid="btn-ai-calc-inline"
                      className="text-[11px] text-agro-700 hover:text-agro-800 font-bold flex items-center gap-1 cursor-pointer"
                      title="Calcular com IA"
                    >
                      <Sparkles className="w-3 h-3 text-harvest-500" />
                      <span>Calcular com IA</span>
                    </button>
                  </div>
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

            {/* US17: Banner de Pacote Tecnológico Carregado via 1-Clique */}
            {loadedPackageName && (
              <div
                role="status"
                data-testid="loaded-package-banner"
                className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-800 flex items-center justify-between gap-3 animate-fade-in"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950">
                      Recompra em 1-Clique ativada!
                    </span>{' '}
                    Insumos do pacote <strong>"{loadedPackageName}"</strong> foram carregados na sua cotação.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLoadedPackageName(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* US17: Toast de Sucesso ao Salvar Lista como Pacote */}
            {packageSuccessToast && (
              <div
                role="status"
                data-testid="package-success-toast"
                className="bg-emerald-50 border border-emerald-400 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center justify-between gap-2 animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{packageSuccessToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPackageSuccessToast(null)}
                  className="text-emerald-700 hover:text-emerald-950 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* US18: Toast de Recálculo de Dosagem com IA por Item */}
            {itemAiToast && (
              <div
                role="status"
                data-testid="item-ai-toast"
                className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-center justify-between gap-2 animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold">{itemAiToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setItemAiToast(null)}
                  className="text-amber-700 hover:text-amber-950 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Tabela Dinâmica de Itens da Cotação */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-lg font-bold text-slate-900">
                    Tabela de Itens da Demanda ({items.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Relação de insumos que serão cotados pelas revendas agrícolas parceiras.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* US17: Cenário 2 - Salvar pacote durante criação (habilitado com 3 ou mais itens) */}
                  {items.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => setIsSavePackageModalOpen(true)}
                      data-testid="btn-save-list-as-package"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs transition-all cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-amber-700" />
                      <span>Salvar Lista</span>
                    </button>
                  )}

                  {items.length > 0 && (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {items.length} {items.length === 1 ? 'item adicionado' : 'itens adicionados'}
                    </span>
                  )}
                </div>
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
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleRecalculateItemDoseWithAi(item.id)}
                                disabled={recalculatingItemId === item.id}
                                data-testid={`btn-recalculate-item-ai-${item.id}`}
                                title="Calcular Dosagem com IA"
                                aria-label={`Calcular Dosagem com IA para ${item.productName}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-agro-700 hover:text-agro-900 bg-agro-50 hover:bg-agro-100 border border-agro-200 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-harvest-500 shrink-0" />
                                <span className="hidden sm:inline">Calcular com IA</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                aria-label={`Excluir ${item.productName}`}
                                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

        {/* PASSO 3: CONDIÇÕES COMERCIAIS E PUBLICAÇÃO (US08) */}
        {currentStep === 3 && (
          <form onSubmit={handlePublishQuotation} className="space-y-6 animate-fade-in">
            {/* Header / Resumo */}
            <div className="bg-white rounded-2xl p-6 shadow-soft border border-agro-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-agro-700 to-agro-900 text-white flex items-center justify-center shadow-md shrink-0">
                  <DollarSign className="w-6 h-6 text-harvest-400" />
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-bold text-slate-900">
                    Passo 3: Condições Comerciais e Publicação
                  </h1>
                  <h3 className="font-serif text-lg font-bold text-slate-800 mt-0.5">
                    Passo 3: Prazos e Condições Comerciais
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Estipule o frete, condições de pagamento e prazo limite para receber propostas das revendas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors self-start md:self-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para Itens da Cotação</span>
              </button>
            </div>

            {/* Resumo Consolidado do Pedido */}
            <div className="bg-agro-50/60 rounded-2xl border border-agro-200/80 p-5">
              <div className="flex items-center gap-2 text-agro-800 text-xs font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Resumo da Demanda</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-agro-100">
                  <p className="text-slate-500 font-medium">Destino de Entrega</p>
                  <p className="font-bold text-slate-900 truncate">
                    {selectedFarmObj?.name} ({selectedFarmObj?.city}/{selectedFarmObj?.state})
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-agro-100">
                  <p className="text-slate-500 font-medium">Cultura Atendida</p>
                  <p className="font-bold text-slate-900">{selectedCropObj?.name || 'Lavoura'}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-agro-100">
                  <p className="text-slate-500 font-medium">Itens e Receituário</p>
                  <p className="font-bold text-slate-900">
                    {items.length} {items.length === 1 ? 'Insumo Cadastrado' : 'Insumos Cadastrados'} • {prescription ? 'Receituário Anexado' : 'Sem receituário'}
                  </p>
                </div>
              </div>
            </div>

            {/* Formulário Comercial */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 space-y-8">
              {/* 1. Modalidade de Frete */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-900">
                    Modalidade de Frete <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-500">Selecione uma modalidade</span>
                </div>

                <div
                  data-testid="freight-type-selector"
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl transition-all ${
                    step3Errors.freightType ? 'p-2 border-2 border-red-500 bg-red-50/20' : ''
                  }`}
                >
                  {/* Opção CIF */}
                  <label
                    className={`relative flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      freightType === 'CIF'
                        ? 'border-agro-700 bg-agro-50/70 shadow-sm'
                        : step3Errors.freightType
                        ? 'border-red-400 bg-white'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="freightType"
                      value="CIF"
                      checked={freightType === 'CIF'}
                      onChange={() => {
                        setFreightType('CIF');
                        if (step3Errors.freightType) setStep3Errors((prev) => ({ ...prev, freightType: undefined }));
                      }}
                      className="mt-1 w-4 h-4 text-agro-700 border-slate-300 focus:ring-agro-600 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-agro-700" />
                        <span className="text-sm font-bold text-slate-900">CIF (Entregue na propriedade)</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        O fornecedor se responsabiliza pelo frete, descarga e seguro até a sede da fazenda em {selectedFarmObj?.city || 'sua propriedade'}.
                      </p>
                    </div>
                  </label>

                  {/* Opção FOB */}
                  <label
                    className={`relative flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      freightType === 'FOB'
                        ? 'border-agro-700 bg-agro-50/70 shadow-sm'
                        : step3Errors.freightType
                        ? 'border-red-400 bg-white'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="freightType"
                      value="FOB"
                      checked={freightType === 'FOB'}
                      onChange={() => {
                        setFreightType('FOB');
                        if (step3Errors.freightType) setStep3Errors((prev) => ({ ...prev, freightType: undefined }));
                      }}
                      className="mt-1 w-4 h-4 text-agro-700 border-slate-300 focus:ring-agro-600 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-agro-700" />
                        <span className="text-sm font-bold text-slate-900">FOB (Retirada na revenda)</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        O produtor realiza a retirada diretamente no armazém ou loja física da revenda fornecedora.
                      </p>
                    </div>
                  </label>
                </div>

                {step3Errors.freightType && (
                  <p role="alert" className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1.5 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{step3Errors.freightType}</span>
                  </p>
                )}
              </div>

              {/* 2. Condição de Pagamento */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="payment-terms-select" className="block text-sm font-bold text-slate-900">
                    Condição de Pagamento <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-500">Prazos e modalidades aceitos</span>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <select
                      id="payment-terms-select"
                      name="paymentTerms"
                      aria-label="Condição de Pagamento"
                      value={paymentTerms}
                      onChange={(e) => {
                        setPaymentTerms(e.target.value);
                        if (step3Errors.paymentTerms) setStep3Errors((prev) => ({ ...prev, paymentTerms: undefined }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                        step3Errors.paymentTerms
                          ? 'border-red-500 ring-2 ring-red-200 bg-red-50/30'
                          : 'border-slate-300 focus:border-agro-600 focus:ring-agro-600/20'
                      }`}
                    >
                      <option value="">Selecione a condição de pagamento...</option>
                      <option value="30/60 dias">30/60 dias</option>
                      <option value="30 dias">30 dias direto</option>
                      <option value="À vista">À vista (PIX / Boleto na entrega)</option>
                      <option value="Safra / Barter">Safra / Barter</option>
                    </select>
                  </div>

                  {/* Atalhos de Botão */}
                  <div className="flex flex-wrap gap-2">
                    {['30/60 dias', '30 dias', 'À vista', 'Safra / Barter'].map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setPaymentTerms(term);
                          if (step3Errors.paymentTerms) setStep3Errors((prev) => ({ ...prev, paymentTerms: undefined }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          paymentTerms === term
                            ? 'bg-agro-700 text-white border-agro-700 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {step3Errors.paymentTerms && (
                  <p role="alert" className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1.5 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{step3Errors.paymentTerms}</span>
                  </p>
                )}
              </div>

              {/* 3. Prazo Limite para Recebimento de Propostas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-900">
                    Prazo Limite para Propostas <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-500">Tempo aberto para lances das revendas</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: '24 horas', hours: 24 },
                    { label: '48 horas', hours: 48 },
                    { label: '72 horas', hours: 72 },
                    { label: '5 dias', hours: 120 },
                  ].map((option) => (
                    <label
                      key={option.hours}
                      className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 cursor-pointer text-xs sm:text-sm font-bold transition-all text-center ${
                        proposalLimitHours === option.hours
                          ? 'border-agro-700 bg-agro-50 text-agro-900 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="proposalLimitHours"
                        value={option.hours}
                        checked={proposalLimitHours === option.hours}
                        onChange={() => setProposalLimitHours(option.hours)}
                        className="sr-only"
                      />
                      <Clock className={`w-4 h-4 ${proposalLimitHours === option.hours ? 'text-agro-700' : 'text-slate-400'}`} />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Instruções Adicionais (Opcional) */}
              <div>
                <label htmlFor="commercial-notes" className="block text-sm font-bold text-slate-900 mb-1">
                  Instruções Adicionais e Observações <span className="text-xs font-normal text-slate-500">(Opcional)</span>
                </label>
                <textarea
                  id="commercial-notes"
                  rows={3}
                  value={commercialNotes}
                  onChange={(e) => setCommercialNotes(e.target.value)}
                  placeholder="Ex: Entregar preferencialmente pela manhã. Galpão com acesso fácil para caminhão truck."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-agro-600 focus:ring-agro-600/20 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-none transition-all"
                />
              </div>

              {/* Mensagem Geral de Erro */}
              {publishError && (
                <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-sm font-semibold animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para Itens da Cotação</span>
                </button>

                <button
                  type="submit"
                  disabled={isPublishing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publicando Cotação...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-harvest-300" />
                      <span>Publicar Cotação</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* US17: Modal para Salvar Lista como Pacote Tecnológico */}
      <SavePackageModal
        isOpen={isSavePackageModalOpen}
        onClose={() => setIsSavePackageModalOpen(false)}
        cropType={selectedCropObj?.name || 'Cultura Geral'}
        producerId={producerUser?.id || 'produtor_demo_1'}
        items={items.map((it) => ({
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unit,
          acceptsGeneric: it.acceptsGeneric ?? true,
        }))}
        onSuccess={() => {
          setPackageSuccessToast('Pacote Tecnológico salvo nas suas predefinições!');
          setTimeout(() => setPackageSuccessToast(null), 4000);
        }}
      />
    </div>
  );
};

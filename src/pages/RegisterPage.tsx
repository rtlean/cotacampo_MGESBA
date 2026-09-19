import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'wouter';
import { FormInput } from '../components/FormInput';
import { CropSelector } from '../components/CropSelector';
import { CategorySelector } from '../components/CategorySelector';
import { SUPPORTED_STATES, TOP_MUNICIPALITIES } from '../data/locations';
import { producerRegistrationSchema } from '../schemas/producer.schema';
import { resellerRegistrationSchema } from '../schemas/reseller.schema';
import { formatCNPJ } from '../utils/cnpj';
import {
  FormErrors,
  RegisterFormData,
  ResellerFormData,
  ResellerFormErrors,
  SupportedState,
  SupplyCategoryId,
  UserRole,
  CropId,
  CropDimensionInput,
} from '../types/user';
import { CROPS, getCropName } from '../data/crops';
import { calculateCropScale, normalizeAreaInput } from '../schemas/producer.schema';
import {
  User,
  Mail,
  Phone,
  Lock,
  Building,
  CheckCircle2,
  ShieldCheck,
  Sprout,
  Store,
  Radio,
  AlertCircle,
  Layers,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerProducer, registerReseller } = useAuth();
  const [, setLocation] = useLocation();

  const [activeRole, setActiveRole] = useState<UserRole>('PRODUCER');

  // Producer Form State
  const [producerData, setProducerData] = useState<RegisterFormData>({
    role: 'PRODUCER',
    fullName: '',
    email: '',
    whatsapp: '',
    password: '',
    farmName: '',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe_conilon'],
    cropDimensions: {
      cafe_conilon: { area: '', plantsCount: '' },
    },
  });
  const [producerErrors, setProducerErrors] = useState<FormErrors>({});

  // Reseller Form State
  const [resellerData, setResellerData] = useState<ResellerFormData>({
    role: 'RESELLER',
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    corporateEmail: '',
    whatsapp: '',
    password: '',
    state: 'ES',
    city: 'Linhares',
    deliveryRadiusKm: 50,
    categories: [],
  });
  const [resellerErrors, setResellerErrors] = useState<ResellerFormErrors>({});
  const [duplicateCnpjError, setDuplicateCnpjError] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Producer Field Refs
  const fullNameRef = useRef<HTMLInputElement>(null);
  const prodEmailRef = useRef<HTMLInputElement>(null);
  const prodWhatsappRef = useRef<HTMLInputElement>(null);
  const prodPasswordRef = useRef<HTMLInputElement>(null);
  const farmNameRef = useRef<HTMLInputElement>(null);
  const prodStateRef = useRef<HTMLSelectElement>(null);
  const prodCityRef = useRef<HTMLSelectElement>(null);
  const cropsRef = useRef<HTMLButtonElement>(null);
  const cropAreaRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Reseller Field Refs
  const razaoSocialRef = useRef<HTMLInputElement>(null);
  const nomeFantasiaRef = useRef<HTMLInputElement>(null);
  const cnpjRef = useRef<HTMLInputElement>(null);
  const resellerEmailRef = useRef<HTMLInputElement>(null);
  const resellerWhatsappRef = useRef<HTMLInputElement>(null);
  const resellerPasswordRef = useRef<HTMLInputElement>(null);
  const resellerStateRef = useRef<HTMLSelectElement>(null);
  const resellerCityRef = useRef<HTMLSelectElement>(null);
  const deliveryRadiusRef = useRef<HTMLInputElement>(null);
  const categoriesRef = useRef<HTMLButtonElement>(null);

  // Helper mask for Brazilian WhatsApp
  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleProducerWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setProducerData((prev) => ({ ...prev, whatsapp: formatted }));
    if (producerErrors.whatsapp) {
      setProducerErrors((prev) => ({ ...prev, whatsapp: undefined }));
    }
  };

  const handleResellerWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setResellerData((prev) => ({ ...prev, whatsapp: formatted }));
    if (resellerErrors.whatsapp) {
      setResellerErrors((prev) => ({ ...prev, whatsapp: undefined }));
    }
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setResellerData((prev) => ({ ...prev, cnpj: formatted }));
    setDuplicateCnpjError(false);
    if (resellerErrors.cnpj) {
      setResellerErrors((prev) => ({ ...prev, cnpj: undefined }));
    }
  };

  const handleProducerStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value as SupportedState;
    const defaultCity = TOP_MUNICIPALITIES[newState]?.[0] || '';
    setProducerData((prev) => ({
      ...prev,
      state: newState,
      city: defaultCity,
    }));
  };

  const handleResellerStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value as SupportedState;
    const defaultCity = TOP_MUNICIPALITIES[newState]?.[0] || '';
    setResellerData((prev) => ({
      ...prev,
      state: newState,
      city: defaultCity,
    }));
  };

  // US01.1 - Gerenciamento dinâmico de culturas e expurgo de estado
  const handleCropsChange = (newCrops: CropId[]) => {
    setProducerData((prev) => {
      const nextDimensions: Record<string, CropDimensionInput> = {};
      for (const crop of newCrops) {
        if (prev.cropDimensions?.[crop]) {
          nextDimensions[crop] = prev.cropDimensions[crop];
        } else {
          nextDimensions[crop] = { area: '', plantsCount: '' };
        }
      }
      return {
        ...prev,
        crops: newCrops,
        cropDimensions: nextDimensions,
      };
    });

    setProducerErrors((prev) => {
      const nextErrors = { ...prev };
      if (nextErrors.crops) delete nextErrors.crops;
      for (const key of Object.keys(nextErrors)) {
        if (key.startsWith('cropDimension_')) {
          const cropId = key.replace('cropDimension_', '') as CropId;
          if (!newCrops.includes(cropId)) {
            delete nextErrors[key];
          }
        }
      }
      return nextErrors;
    });
  };

  const handleCropDimensionChange = (
    cropId: CropId,
    field: 'area' | 'plantsCount',
    value: string
  ) => {
    setProducerData((prev) => ({
      ...prev,
      cropDimensions: {
        ...(prev.cropDimensions || {}),
        [cropId]: {
          ...(prev.cropDimensions?.[cropId] || { area: '', plantsCount: '' }),
          [field]: value,
        },
      },
    }));

    const errorKey = `cropDimension_${cropId}`;
    if (producerErrors[errorKey]) {
      setProducerErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const validateProducerForm = (): {
    isValid: boolean;
    firstErrorRef: { current: HTMLElement | null } | null;
  } => {
    // Purge prévio para validação no Zod schema (Cenário 4)
    const cleanedDimensions: Record<string, CropDimensionInput> = {};
    for (const c of producerData.crops) {
      if (producerData.cropDimensions?.[c]) {
        cleanedDimensions[c] = producerData.cropDimensions[c];
      }
    }
    const dataToValidate = {
      ...producerData,
      cropDimensions: cleanedDimensions,
    };

    const parseResult = producerRegistrationSchema.safeParse(dataToValidate);

    if (parseResult.success) {
      setProducerErrors({});
      return { isValid: true, firstErrorRef: null };
    }

    const newErrors: FormErrors = {};
    let firstCropErrorId: string | null = null;

    for (const issue of parseResult.error.issues) {
      if (issue.path[0] === 'cropDimensions') {
        const cropId = issue.path[1] as string;
        const key = `cropDimension_${cropId}`;
        if (!newErrors[key]) {
          newErrors[key] = issue.message;
          if (!firstCropErrorId) {
            firstCropErrorId = cropId;
          }
        }
      } else {
        const field = issue.path[0] as keyof FormErrors;
        if (!newErrors[field]) {
          newErrors[field] = issue.message;
        }
      }
    }

    const fieldOrder: Array<{ field: keyof FormErrors; getRef: () => HTMLElement | null }> = [
      { field: 'fullName', getRef: () => fullNameRef.current },
      { field: 'email', getRef: () => prodEmailRef.current },
      { field: 'whatsapp', getRef: () => prodWhatsappRef.current },
      { field: 'password', getRef: () => prodPasswordRef.current },
      { field: 'farmName', getRef: () => farmNameRef.current },
      { field: 'state', getRef: () => prodStateRef.current },
      { field: 'city', getRef: () => prodCityRef.current },
      { field: 'crops', getRef: () => cropsRef.current },
    ];

    const firstMatch = fieldOrder.find((item) => Boolean(newErrors[item.field]));
    let firstRef: { current: HTMLElement | null } | null = firstMatch
      ? { current: firstMatch.getRef() }
      : null;

    // Se os campos gerais estão válidos, focar no campo de área da cultura com pendência (Cenário 3)
    if (!firstRef && firstCropErrorId && cropAreaRefs.current[firstCropErrorId]) {
      firstRef = { current: cropAreaRefs.current[firstCropErrorId] };
    }

    setProducerErrors(newErrors);
    return { isValid: false, firstErrorRef: firstRef };
  };

  const validateResellerForm = (): {
    isValid: boolean;
    firstErrorRef: { current: HTMLElement | null } | null;
  } => {
    const parseResult = resellerRegistrationSchema.safeParse(resellerData);

    if (parseResult.success) {
      setResellerErrors({});
      return { isValid: true, firstErrorRef: null };
    }

    const newErrors: ResellerFormErrors = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] as keyof ResellerFormErrors;
      if (!newErrors[field]) {
        newErrors[field] = issue.message;
      }
    }

    const fieldOrder: Array<{ field: keyof ResellerFormErrors; getRef: () => HTMLElement | null }> = [
      { field: 'razaoSocial', getRef: () => razaoSocialRef.current },
      { field: 'nomeFantasia', getRef: () => nomeFantasiaRef.current },
      { field: 'cnpj', getRef: () => cnpjRef.current },
      { field: 'corporateEmail', getRef: () => resellerEmailRef.current },
      { field: 'whatsapp', getRef: () => resellerWhatsappRef.current },
      { field: 'password', getRef: () => resellerPasswordRef.current },
      { field: 'state', getRef: () => resellerStateRef.current },
      { field: 'city', getRef: () => resellerCityRef.current },
      { field: 'deliveryRadiusKm', getRef: () => deliveryRadiusRef.current },
      { field: 'categories', getRef: () => categoriesRef.current },
    ];

    const firstResellerMatch = fieldOrder.find((item) => Boolean(newErrors[item.field]));
    const firstRef = firstResellerMatch ? { current: firstResellerMatch.getRef() } : null;

    setResellerErrors(newErrors);
    return { isValid: false, firstErrorRef: firstRef };
  };

  const handleProducerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, firstErrorRef } = validateProducerForm();

    if (!isValid) {
      if (firstErrorRef && firstErrorRef.current) {
        firstErrorRef.current.focus();
        if (firstErrorRef.current.scrollIntoView) {
          firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    // Purge de culturas removidas antes de persistir
    const cleanedDimensions: Record<string, CropDimensionInput> = {};
    for (const c of producerData.crops) {
      if (producerData.cropDimensions?.[c]) {
        cleanedDimensions[c] = producerData.cropDimensions[c];
      }
    }
    const finalData = {
      ...producerData,
      cropDimensions: cleanedDimensions,
    };

    setIsSubmitting(true);
    try {
      const res = await registerProducer(finalData);
      if (res.success) {
        setLocation('/produtor/dashboard');
      } else {
        alert(res.error || 'Erro ao processar cadastro');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateCnpjError(false);

    const { isValid, firstErrorRef } = validateResellerForm();

    if (!isValid) {
      if (firstErrorRef && firstErrorRef.current) {
        firstErrorRef.current.focus();
        if (firstErrorRef.current.scrollIntoView) {
          firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerReseller(resellerData);
      if (res.success) {
        setLocation('/revenda/dashboard');
      } else {
        if (res.error?.includes('já está cadastrado')) {
          setDuplicateCnpjError(true);
        } else {
          setResellerErrors((prev) => ({ ...prev, general: res.error }));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { text: '', score: 0, color: 'bg-slate-200' };
    if (pass.length < 6) return { text: 'Muito curta', score: 1, color: 'bg-red-500' };
    if (pass.length < 8) return { text: 'Média', score: 2, color: 'bg-amber-500' };
    return { text: 'Forte e segura', score: 3, color: 'bg-emerald-600' };
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/20 to-sand-50">
      <div className="max-w-2xl mx-auto">
        {/* Header Title & Value Proposition */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agro-100 text-agro-800 text-xs font-semibold mb-3 border border-agro-200">
            {activeRole === 'PRODUCER' ? (
              <>
                <Sprout className="w-3.5 h-3.5 text-agro-600" />
                <span>Cadastro de Produtor Rural • MG, ES e BA</span>
              </>
            ) : (
              <>
                <Store className="w-3.5 h-3.5 text-agro-600" />
                <span>Cadastro de Revenda de Insumos • MG, ES e BA</span>
              </>
            )}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-agro-950 tracking-tight">
            {activeRole === 'PRODUCER'
              ? 'Compre insumos com o melhor preço da sua região'
              : 'Receba cotações e expanda as vendas da sua revenda'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
            {activeRole === 'PRODUCER'
              ? 'Conecte sua fazenda às principais revendas e cooperativas de café, cacau, pimenta e mamão de MG, ES e BA.'
              : 'Conecte sua loja física a produtores de café, cacau, pimenta e mamão dentro do seu raio logístico de atendimento.'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-soft border border-agro-100 p-6 sm:p-8">
          {/* Profile Switcher */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Tipo de Cadastro
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setActiveRole('PRODUCER');
                  setDuplicateCnpjError(false);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeRole === 'PRODUCER'
                    ? 'bg-agro-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sprout className="w-4 h-4" />
                <span>Sou Produtor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRole('RESELLER');
                  setDuplicateCnpjError(false);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeRole === 'RESELLER'
                    ? 'bg-agro-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Sou Revenda / Loja</span>
              </button>
            </div>
          </div>

          {/* Duplicate CNPJ Error Banner */}
          {duplicateCnpjError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 animate-fade-in"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium leading-relaxed">
                  Este CNPJ já está cadastrado. Faça login ou recupere o acesso.
                </p>
                <div className="mt-1">
                  <Link
                    href="/login"
                    className="font-bold underline text-red-900 hover:text-red-950 inline-block"
                  >
                    Faça login
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ======================= PRODUCER FORM ======================= */}
          {activeRole === 'PRODUCER' ? (
            <form onSubmit={handleProducerSubmit} noValidate className="space-y-6">
              {/* Seção 1: Dados do Produtor */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-agro-900 border-b border-agro-100 pb-2 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-agro-600" />
                  <span>1. Dados Pessoais e Acesso</span>
                </h2>

                <div className="space-y-4">
                  <FormInput
                    ref={fullNameRef}
                    id="fullName"
                    label="Nome Completo"
                    required
                    placeholder="Ex: Roberto da Silva Santos"
                    value={producerData.fullName}
                    onChange={(e) => {
                      setProducerData({ ...producerData, fullName: e.target.value });
                      if (producerErrors.fullName) setProducerErrors({ ...producerErrors, fullName: undefined });
                    }}
                    error={producerErrors.fullName}
                    icon={<User className="w-4 h-4" />}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput
                      ref={prodEmailRef}
                      id="email"
                      type="email"
                      label="E-mail"
                      required
                      placeholder="seu.email@fazenda.com.br"
                      value={producerData.email}
                      onChange={(e) => {
                        setProducerData({ ...producerData, email: e.target.value });
                        if (producerErrors.email) setProducerErrors({ ...producerErrors, email: undefined });
                      }}
                      error={producerErrors.email}
                      icon={<Mail className="w-4 h-4" />}
                    />

                    <FormInput
                      ref={prodWhatsappRef}
                      id="whatsapp"
                      type="tel"
                      label="Telefone / WhatsApp"
                      required
                      placeholder="(27) 99999-9999"
                      value={producerData.whatsapp}
                      onChange={handleProducerWhatsAppChange}
                      error={producerErrors.whatsapp}
                      hint="Receba cotações e propostas direto no WhatsApp"
                      icon={<Phone className="w-4 h-4" />}
                    />
                  </div>

                  <div>
                    <FormInput
                      ref={prodPasswordRef}
                      id="password"
                      type="password"
                      label="Senha de Acesso"
                      required
                      placeholder="Crie uma senha segura (mínimo 6 caracteres)"
                      value={producerData.password}
                      onChange={(e) => {
                        setProducerData({ ...producerData, password: e.target.value });
                        if (producerErrors.password) setProducerErrors({ ...producerErrors, password: undefined });
                      }}
                      error={producerErrors.password}
                      icon={<Lock className="w-4 h-4" />}
                    />
                    {producerData.password && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getPasswordStrength(producerData.password).color} transition-all duration-300`}
                            style={{ width: `${(getPasswordStrength(producerData.password).score / 3) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          {getPasswordStrength(producerData.password).text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados da Propriedade */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-agro-900 border-b border-agro-100 pb-2 mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4 text-agro-600" />
                  <span>2. Localização da Propriedade</span>
                </h2>

                <div className="space-y-4">
                  <FormInput
                    ref={farmNameRef}
                    id="farmName"
                    label="Nome da Fazenda / Sítio"
                    required
                    placeholder="Ex: Fazenda Bela Vista ou Sítio Primavera"
                    value={producerData.farmName}
                    onChange={(e) => {
                      setProducerData({ ...producerData, farmName: e.target.value });
                      if (producerErrors.farmName) setProducerErrors({ ...producerErrors, farmName: undefined });
                    }}
                    error={producerErrors.farmName}
                    icon={<Building className="w-4 h-4" />}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Estado */}
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Estado (UF) <span className="text-red-600 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <select
                          ref={prodStateRef}
                          id="state"
                          value={producerData.state}
                          onChange={handleProducerStateChange}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 text-sm shadow-sm transition-colors focus:border-agro-600 focus:outline-none focus:ring-2 focus:ring-agro-100"
                        >
                          {SUPPORTED_STATES.map((st) => (
                            <option key={st.code} value={st.code}>
                              {st.code} — {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Município */}
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Município <span className="text-red-600 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <select
                          ref={prodCityRef}
                          id="city"
                          value={producerData.city}
                          onChange={(e) => {
                            setProducerData({ ...producerData, city: e.target.value });
                            if (producerErrors.city) setProducerErrors({ ...producerErrors, city: undefined });
                          }}
                          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-slate-900 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 ${
                            producerErrors.city
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                              : 'border-slate-300 focus:border-agro-600 focus:ring-agro-100'
                          }`}
                        >
                          {producerData.state &&
                            TOP_MUNICIPALITIES[producerData.state as SupportedState]?.map((muni) => (
                              <option key={muni} value={muni}>
                                {muni}
                              </option>
                            ))}
                          <option value="Outro Município">Outro Município...</option>
                        </select>
                      </div>
                      {producerErrors.city && (
                        <p role="alert" className="mt-1.5 text-xs text-red-600 font-medium animate-fade-in">
                          {producerErrors.city}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 3: Culturas Cultivadas */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-agro-900 border-b border-agro-100 pb-2 mb-4 flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-agro-600" />
                  <span>3. Culturas da Sua Propriedade</span>
                </h2>

                <CropSelector
                  ref={cropsRef}
                  selectedCrops={producerData.crops}
                  onChange={handleCropsChange}
                  error={producerErrors.crops}
                />

                {/* Bloco Dinâmico de Dimensionamento por Cultura (US01.1) */}
                {producerData.crops.length > 0 && (
                  <div
                    data-testid="crop-dimensions-section"
                    className="mt-5 space-y-4 pt-4 border-t border-slate-200/80 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-agro-600" />
                        <span>Dimensionamento e Escala por Cultura</span>
                      </h3>
                      <span className="text-xs text-slate-500 hidden sm:inline">
                        Base para cotações e recomendações do Copiloto IA
                      </span>
                    </div>

                    <div className="space-y-3">
                      {producerData.crops.map((cropId) => {
                        const cropObj = CROPS.find((c) => c.id === cropId);
                        const cropName = cropObj?.name || getCropName(cropId);
                        const dim = producerData.cropDimensions?.[cropId] || { area: '', plantsCount: '' };
                        const errorMsg = producerErrors[`cropDimension_${cropId}`];

                        // Escala calculada em tempo real para feedback instantâneo
                        const areaNum = normalizeAreaInput(dim.area);
                        const plantsNum = dim.plantsCount
                          ? parseInt(String(dim.plantsCount).replace(/\D/g, ''), 10)
                          : 0;
                        const currentScale =
                          areaNum > 0 || plantsNum > 0 ? calculateCropScale(areaNum, plantsNum) : null;

                        return (
                          <div
                            key={cropId}
                            data-testid={`crop-dimension-card-${cropId}`}
                            className={`p-4 rounded-xl border transition-all duration-200 ${
                              errorMsg
                                ? 'border-red-300 bg-red-50/40 ring-1 ring-red-400'
                                : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-agro-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xl" role="img" aria-label={cropName}>
                                  {cropObj?.icon || '🌱'}
                                </span>
                                <span className="font-semibold text-sm text-slate-900">{cropName}</span>
                              </div>

                              {/* Badge de Porte / Escala */}
                              {currentScale && (
                                <span
                                  data-testid={`badge-scale-${cropId}`}
                                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                    currentScale === 'PEQUENA'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : currentScale === 'MEDIA'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {currentScale === 'PEQUENA' && 'Pequena Escala'}
                                  {currentScale === 'MEDIA' && 'Média Escala'}
                                  {currentScale === 'GRANDE' && 'Grande Escala'}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Campo de Área Plantada (Hectares) */}
                              <div>
                                <label
                                  htmlFor={`input-crop-area-${cropId}`}
                                  className="block text-xs font-medium text-slate-700 mb-1"
                                >
                                  Área Plantada (Hectares) <span className="text-red-600 font-semibold">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    ref={(el) => {
                                      cropAreaRefs.current[cropId] = el;
                                    }}
                                    id={`input-crop-area-${cropId}`}
                                    data-testid={`input-crop-area-${cropId}`}
                                    aria-label={`Área plantada em hectares para ${cropName}`}
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Ex: 120 ou 0,75"
                                    value={dim.area}
                                    onChange={(e) =>
                                      handleCropDimensionChange(cropId, 'area', e.target.value)
                                    }
                                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                                      errorMsg
                                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                        : 'border-slate-300 focus:border-agro-600 focus:ring-agro-100'
                                    }`}
                                  />
                                  <span className="absolute right-3 top-2 text-xs font-medium text-slate-400 pointer-events-none">
                                    ha
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 mt-1 block">
                                  Suporta decimais (ex: 0.5 ou 0,75)
                                </span>
                              </div>

                              {/* Campo Opcional: Número Estimado de Plantas / Pés */}
                              <div>
                                <label
                                  htmlFor={`input-crop-plants-${cropId}`}
                                  className="block text-xs font-medium text-slate-700 mb-1"
                                >
                                  Nº de Plantas / Pés <span className="text-slate-400 text-[10px] font-normal">(Opcional)</span>
                                </label>
                                <div className="relative">
                                  <input
                                    id={`input-crop-plants-${cropId}`}
                                    data-testid={`input-crop-plants-${cropId}`}
                                    aria-label={`Número de pés ou estacas para ${cropName}`}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Ex: 800 pés ou estacas"
                                    value={dim.plantsCount || ''}
                                    onChange={(e) =>
                                      handleCropDimensionChange(cropId, 'plantsCount', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-agro-600 focus:outline-none focus:ring-2 focus:ring-agro-100"
                                  />
                                  <span className="absolute right-3 top-2 text-xs font-medium text-slate-400 pointer-events-none">
                                    un
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 mt-1 block">
                                  Auxilia na dosagem precisa pelo Copiloto IA
                                </span>
                              </div>
                            </div>

                            {/* Mensagem de Erro Inline da Cultura */}
                            {errorMsg && (
                              <p
                                role="alert"
                                data-testid={`error-crop-${cropId}`}
                                className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1 animate-fade-in"
                              >
                                <svg
                                  className="w-3.5 h-3.5 shrink-0 text-red-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {errorMsg}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submissão */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="btn-submit-producer"
                  className="w-full py-3.5 px-6 rounded-xl bg-agro-700 hover:bg-agro-800 active:bg-agro-900 text-white font-semibold text-base shadow-md shadow-agro-900/15 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-agro-300" />
                      <span>Criar Conta de Produtor</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-agro-700" />
                  <span>Cadastro 100% gratuito para produtores rurais de MG, ES e BA</span>
                </div>
              </div>
            </form>
          ) : (
            /* ======================= RESELLER FORM ======================= */
            <form onSubmit={handleResellerSubmit} noValidate className="space-y-6">
              {/* Seção 1: Dados da Empresa PJ */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-agro-900 border-b border-agro-100 pb-2 mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4 text-agro-600" />
                  <span>1. Dados da Empresa e Loja Física</span>
                </h2>

                <div className="space-y-4">
                  <FormInput
                    ref={razaoSocialRef}
                    id="razaoSocial"
                    label="Razão Social"
                    required
                    placeholder="Ex: AgroVila Insumos Agrícolas Ltda"
                    value={resellerData.razaoSocial}
                    onChange={(e) => {
                      setResellerData({ ...resellerData, razaoSocial: e.target.value });
                      if (resellerErrors.razaoSocial) {
                        setResellerErrors({ ...resellerErrors, razaoSocial: undefined });
                      }
                    }}
                    error={resellerErrors.razaoSocial}
                    icon={<Building className="w-4 h-4" />}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput
                      ref={nomeFantasiaRef}
                      id="nomeFantasia"
                      label="Nome Fantasia"
                      required
                      placeholder="Ex: AgroVila Linhares"
                      value={resellerData.nomeFantasia}
                      onChange={(e) => {
                        setResellerData({ ...resellerData, nomeFantasia: e.target.value });
                        if (resellerErrors.nomeFantasia) {
                          setResellerErrors({ ...resellerErrors, nomeFantasia: undefined });
                        }
                      }}
                      error={resellerErrors.nomeFantasia}
                      icon={<Store className="w-4 h-4" />}
                    />

                    <FormInput
                      ref={cnpjRef}
                      id="cnpj"
                      label="CNPJ"
                      required
                      placeholder="00.000.000/0000-00"
                      value={resellerData.cnpj}
                      onChange={handleCNPJChange}
                      error={resellerErrors.cnpj}
                      hint="Validação oficial com dígitos verificadores"
                      icon={<ShieldCheck className="w-4 h-4" />}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput
                      ref={resellerEmailRef}
                      id="corporateEmail"
                      type="email"
                      label="E-mail Corporativo"
                      required
                      placeholder="contato@agrovila.com.br"
                      value={resellerData.corporateEmail}
                      onChange={(e) => {
                        setResellerData({ ...resellerData, corporateEmail: e.target.value });
                        if (resellerErrors.corporateEmail) {
                          setResellerErrors({ ...resellerErrors, corporateEmail: undefined });
                        }
                      }}
                      error={resellerErrors.corporateEmail}
                      icon={<Mail className="w-4 h-4" />}
                    />

                    <FormInput
                      ref={resellerWhatsappRef}
                      id="resellerWhatsapp"
                      type="tel"
                      label="Telefone / WhatsApp"
                      required
                      placeholder="(27) 99888-7766"
                      value={resellerData.whatsapp}
                      onChange={handleResellerWhatsAppChange}
                      error={resellerErrors.whatsapp}
                      hint="Canal direto para envio de lances comerciais"
                      icon={<Phone className="w-4 h-4" />}
                    />
                  </div>

                  <div>
                    <FormInput
                      ref={resellerPasswordRef}
                      id="resellerPassword"
                      type="password"
                      label="Senha de Acesso"
                      required
                      placeholder="Crie uma senha de acesso (mínimo 6 caracteres)"
                      value={resellerData.password}
                      onChange={(e) => {
                        setResellerData({ ...resellerData, password: e.target.value });
                        if (resellerErrors.password) {
                          setResellerErrors({ ...resellerErrors, password: undefined });
                        }
                      }}
                      error={resellerErrors.password}
                      icon={<Lock className="w-4 h-4" />}
                    />
                    {resellerData.password && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getPasswordStrength(resellerData.password).color} transition-all duration-300`}
                            style={{ width: `${(getPasswordStrength(resellerData.password).score / 3) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          {getPasswordStrength(resellerData.password).text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 2: Localização e Logística */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-agro-900 border-b border-agro-100 pb-2 mb-4 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-agro-600" />
                  <span>2. Localização e Área de Cobertura Logística</span>
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Estado */}
                    <div>
                      <label htmlFor="resellerState" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Estado (UF) <span className="text-red-600 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <select
                          ref={resellerStateRef}
                          id="resellerState"
                          value={resellerData.state}
                          onChange={handleResellerStateChange}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 text-sm shadow-sm transition-colors focus:border-agro-600 focus:outline-none focus:ring-2 focus:ring-agro-100"
                        >
                          {SUPPORTED_STATES.map((st) => (
                            <option key={st.code} value={st.code}>
                              {st.code} — {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Município da Loja Física */}
                    <div>
                      <label htmlFor="resellerCity" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Município da Loja Física <span className="text-red-600 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <select
                          ref={resellerCityRef}
                          id="resellerCity"
                          value={resellerData.city}
                          onChange={(e) => {
                            setResellerData({ ...resellerData, city: e.target.value });
                            if (resellerErrors.city) setResellerErrors({ ...resellerErrors, city: undefined });
                          }}
                          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-slate-900 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 ${
                            resellerErrors.city
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                              : 'border-slate-300 focus:border-agro-600 focus:ring-agro-100'
                          }`}
                        >
                          {resellerData.state &&
                            TOP_MUNICIPALITIES[resellerData.state as SupportedState]?.map((muni) => (
                              <option key={muni} value={muni}>
                                {muni}
                              </option>
                            ))}
                          <option value="Outro Município">Outro Município...</option>
                        </select>
                      </div>
                      {resellerErrors.city && (
                        <p role="alert" className="mt-1.5 text-xs text-red-600 font-medium animate-fade-in">
                          {resellerErrors.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Raio de Entrega */}
                  <FormInput
                    ref={deliveryRadiusRef}
                    id="deliveryRadiusKm"
                    type="number"
                    label="Raio de Entrega (km)"
                    required
                    min={10}
                    max={500}
                    placeholder="Ex: 50, 100, 150"
                    value={resellerData.deliveryRadiusKm.toString()}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setResellerData({
                        ...resellerData,
                        deliveryRadiusKm: isNaN(val) ? 0 : val,
                      });
                      if (resellerErrors.deliveryRadiusKm) {
                        setResellerErrors({ ...resellerErrors, deliveryRadiusKm: undefined });
                      }
                    }}
                    error={resellerErrors.deliveryRadiusKm}
                    hint="Distância máxima em km a partir da sua loja que sua logística atende"
                    icon={<Radio className="w-4 h-4" />}
                  />
                </div>
              </div>

              {/* Seção 3: Categorias Fornecidas */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-agro-900 border-b border-agro-100 pb-2 mb-4 flex items-center gap-2">
                  <Store className="w-4 h-4 text-agro-600" />
                  <span>3. Categorias de Insumos Fornecidas</span>
                </h2>

                <CategorySelector
                  ref={categoriesRef}
                  selectedCategories={resellerData.categories}
                  onChange={(categories: SupplyCategoryId[]) => {
                    setResellerData({ ...resellerData, categories });
                    if (resellerErrors.categories) {
                      setResellerErrors({ ...resellerErrors, categories: undefined });
                    }
                  }}
                  error={resellerErrors.categories}
                />
              </div>

              {/* Submissão */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                {resellerErrors.general && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2 animate-fade-in"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{resellerErrors.general}</span>
                  </div>
                )}

                <button
                  type="submit"
                  onClick={handleResellerSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-agro-700 hover:bg-agro-800 active:bg-agro-900 text-white font-semibold text-base shadow-md shadow-agro-900/15 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-agro-300" />
                      <span>Criar Conta de Revenda</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-agro-700" />
                  <span>Receba notificações imediatas de cotações abertas na sua área</span>
                </div>
              </div>
            </form>
          )}

          {/* Já tem conta */}
          <div className="mt-6 text-center text-sm text-slate-600">
            Já possui cadastro?{' '}
            <Link href="/login" className="font-semibold text-agro-700 hover:text-agro-800 hover:underline">
              Acessar minha conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

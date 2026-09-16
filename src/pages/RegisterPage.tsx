import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'wouter';
import { FormInput } from '../components/FormInput';
import { CropSelector } from '../components/CropSelector';
import { SUPPORTED_STATES, TOP_MUNICIPALITIES } from '../data/locations';
import { FormErrors, RegisterFormData, SupportedState } from '../types/user';
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
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerProducer } = useAuth();
  const [, setLocation] = useLocation();

  // Form State
  const [formData, setFormData] = useState<RegisterFormData>({
    role: 'PRODUCER',
    fullName: '',
    email: '',
    whatsapp: '',
    password: '',
    farmName: '',
    state: 'ES', // Default high-activity state
    city: 'Linhares',
    crops: ['cafe'], // Default initial crop
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field Refs for moving focus to first error (US01 Scenario 2)
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const farmNameRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLSelectElement>(null);
  const cityRef = useRef<HTMLSelectElement>(null);
  const cropsRef = useRef<HTMLButtonElement>(null);

  // Helper mask for Brazilian WhatsApp: (XX) 9XXXX-XXXX
  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setFormData((prev) => ({ ...prev, whatsapp: formatted }));
    if (errors.whatsapp) {
      setErrors((prev) => ({ ...prev, whatsapp: undefined }));
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value as SupportedState;
    const defaultCity = TOP_MUNICIPALITIES[newState]?.[0] || '';
    setFormData((prev) => ({
      ...prev,
      state: newState,
      city: defaultCity,
    }));
  };

  const validateForm = (): { isValid: boolean; firstErrorRef: React.RefObject<any> | null } => {
    const newErrors: FormErrors = {};
    let firstRef: React.RefObject<any> | null = null;

    // Full Name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Informe seu nome completo';
      firstRef = firstRef || fullNameRef;
    } else if (formData.fullName.trim().split(' ').length < 2) {
      newErrors.fullName = 'Informe nome e sobrenome';
      firstRef = firstRef || fullNameRef;
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Informe um endereço de e-mail';
      firstRef = firstRef || emailRef;
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Formato de e-mail inválido (ex: produtor@fazenda.com.br)';
      firstRef = firstRef || emailRef;
    }

    // WhatsApp
    const rawPhoneDigits = formData.whatsapp.replace(/\D/g, '');
    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'Informe seu número de WhatsApp';
      firstRef = firstRef || whatsappRef;
    } else if (rawPhoneDigits.length < 10 || rawPhoneDigits.length > 11) {
      newErrors.whatsapp = 'Número de WhatsApp inválido. Utilize DDD + 9 dígitos: (XX) 9XXXX-XXXX';
      firstRef = firstRef || whatsappRef;
    }

    // Password
    if (!formData.password) {
      newErrors.password = 'Crie uma senha de acesso';
      firstRef = firstRef || passwordRef;
    } else if (formData.password.length < 6) {
      newErrors.password = 'A senha deve ter no mínimo 6 caracteres';
      firstRef = firstRef || passwordRef;
    }

    // Farm Name
    if (!formData.farmName.trim()) {
      newErrors.farmName = 'Informe o nome da sua fazenda ou propriedade';
      firstRef = firstRef || farmNameRef;
    }

    // State
    if (!formData.state) {
      newErrors.state = 'Selecione o estado da propriedade (MG, ES ou BA)';
      firstRef = firstRef || stateRef;
    }

    // City
    if (!formData.city.trim()) {
      newErrors.city = 'Informe o município da propriedade';
      firstRef = firstRef || cityRef;
    }

    // Cultivated Crops
    if (!formData.crops || formData.crops.length === 0) {
      newErrors.crops = 'Selecione ao menos uma cultura atendida (Café, Cacau, Pimenta-do-reino ou Mamão)';
      firstRef = firstRef || cropsRef;
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      firstErrorRef: firstRef,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, firstErrorRef } = validateForm();

    if (!isValid) {
      // US01 Cenário 2: O sistema não deve submeter a requisição e o foco deve ser movido para o primeiro campo com erro
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
      const res = await registerProducer(formData);
      if (res.success) {
        // Redireciona para o dashboard com o perfil PRODUCER autenticado
        setLocation('/produtor/dashboard');
      } else {
        alert(res.error || 'Erro ao processar cadastro');
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

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 via-agro-50/20 to-sand-50">
      <div className="max-w-2xl mx-auto">
        {/* Header Title & Value Proposition */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agro-100 text-agro-800 text-xs font-semibold mb-3 border border-agro-200">
            <Sprout className="w-3.5 h-3.5 text-agro-600" />
            <span>Cadastro de Produtor Rural • MG, ES e BA</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-agro-950 tracking-tight">
            Compre insumos com o melhor preço da sua região
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
            Conecte sua fazenda às principais revendas e cooperativas de café, cacau, pimenta e mamão de MG, ES e BA.
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
                onClick={() => setFormData((prev) => ({ ...prev, role: 'PRODUCER' }))}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                  formData.role === 'PRODUCER'
                    ? 'bg-agro-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sprout className="w-4 h-4" />
                <span>Sou Produtor</span>
              </button>

              <button
                type="button"
                onClick={() => alert('O cadastro para Revendas e Distribuidores estará disponível em breve.')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                  formData.role === 'RESELLER'
                    ? 'bg-agro-700 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Sou Revenda / Loja</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                  }}
                  error={errors.fullName}
                  icon={<User className="w-4 h-4" />}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    ref={emailRef}
                    id="email"
                    type="email"
                    label="E-mail"
                    required
                    placeholder="seu.email@fazenda.com.br"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    error={errors.email}
                    icon={<Mail className="w-4 h-4" />}
                  />

                  <FormInput
                    ref={whatsappRef}
                    id="whatsapp"
                    type="tel"
                    label="Telefone / WhatsApp"
                    required
                    placeholder="(27) 99999-9999"
                    value={formData.whatsapp}
                    onChange={handleWhatsAppChange}
                    error={errors.whatsapp}
                    hint="Receba cotações e propostas direto no WhatsApp"
                    icon={<Phone className="w-4 h-4" />}
                  />
                </div>

                <div>
                  <FormInput
                    ref={passwordRef}
                    id="password"
                    type="password"
                    label="Senha de Acesso"
                    required
                    placeholder="Crie uma senha segura (mínimo 6 caracteres)"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    error={errors.password}
                    icon={<Lock className="w-4 h-4" />}
                  />
                  {formData.password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {passwordStrength.text}
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
                  value={formData.farmName}
                  onChange={(e) => {
                    setFormData({ ...formData, farmName: e.target.value });
                    if (errors.farmName) setErrors({ ...errors, farmName: undefined });
                  }}
                  error={errors.farmName}
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
                        ref={stateRef}
                        id="state"
                        value={formData.state}
                        onChange={handleStateChange}
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
                        ref={cityRef}
                        id="city"
                        value={formData.city}
                        onChange={(e) => {
                          setFormData({ ...formData, city: e.target.value });
                          if (errors.city) setErrors({ ...errors, city: undefined });
                        }}
                        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-slate-900 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 ${
                          errors.city
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-300 focus:border-agro-600 focus:ring-agro-100'
                        }`}
                      >
                        {formData.state &&
                          TOP_MUNICIPALITIES[formData.state as SupportedState]?.map((muni) => (
                            <option key={muni} value={muni}>
                              {muni}
                            </option>
                          ))}
                        <option value="Outro Município">Outro Município...</option>
                      </select>
                    </div>
                    {errors.city && (
                      <p role="alert" className="mt-1.5 text-xs text-red-600 font-medium animate-fade-in">
                        {errors.city}
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
                selectedCrops={formData.crops}
                onChange={(crops) => {
                  setFormData({ ...formData, crops });
                  if (errors.crops) setErrors({ ...errors, crops: undefined });
                }}
                error={errors.crops}
              />
            </div>

            {/* Submissão */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <button
                type="submit"
                disabled={isSubmitting}
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

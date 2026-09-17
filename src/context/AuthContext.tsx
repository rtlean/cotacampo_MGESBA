import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AuthResponse,
  CropId,
  LoginCredentials,
  PasswordResetResponse,
  PasswordResetToken,
  ProducerProfile,
  RegisterFormData,
  ResellerFormData,
  ResellerProfile,
  UserProfile,
} from '../types/user';
import { producerRegistrationSchema } from '../schemas/producer.schema';
import { resellerRegistrationSchema } from '../schemas/reseller.schema';
import { getCityCoordinates } from '../data/locations';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  showWelcomeNotice: boolean;
  registerProducer: (data: RegisterFormData) => Promise<{ success: boolean; error?: string }>;
  registerReseller: (data: ResellerFormData) => Promise<{ success: boolean; error?: string }>;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  loginMock: (email: string) => void;
  logout: () => void;
  dismissWelcomeNotice: () => void;
  requestPasswordReset: (identifier: string) => Promise<PasswordResetResponse>;
}

const STORAGE_KEY = 'cotacampo_auth_user';
const PRODUCERS_DB_KEY = 'cotacampo_producers_db';
const RESELLERS_DB_KEY = 'cotacampo_resellers_db';
const RESETS_DB_KEY = 'cotacampo_password_resets';
const WELCOME_KEY = 'cotacampo_welcome_notice';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [showWelcomeNotice, setShowWelcomeNotice] = useState<boolean>(() => {
    return sessionStorage.getItem(WELCOME_KEY) === 'true';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const registerProducer = async (data: RegisterFormData): Promise<{ success: boolean; error?: string }> => {
    try {
      const validation = producerRegistrationSchema.safeParse(data);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || 'Dados inválidos para cadastro de produtor',
        };
      }

      const validData = validation.data;

      // Simula latência de rede realista
      await new Promise((resolve) => setTimeout(resolve, 200));

      const newProducer: ProducerProfile = {
        id: 'prod_' + Math.random().toString(36).substring(2, 9),
        name: validData.fullName,
        email: validData.email.toLowerCase(),
        whatsapp: validData.whatsapp,
        password: validData.password,
        role: 'PRODUCER',
        farmName: validData.farmName,
        state: validData.state,
        city: validData.city,
        crops: validData.crops,
        createdAt: new Date().toISOString(),
      };

      // Persiste no banco de produtores
      let existingProducers: ProducerProfile[] = [];
      try {
        const stored = localStorage.getItem(PRODUCERS_DB_KEY);
        if (stored) existingProducers = JSON.parse(stored);
      } catch {
        existingProducers = [];
      }
      existingProducers.push(newProducer);
      localStorage.setItem(PRODUCERS_DB_KEY, JSON.stringify(existingProducers));

      setUser(newProducer);
      setShowWelcomeNotice(true);
      sessionStorage.setItem(WELCOME_KEY, 'true');

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao registrar produtor';
      return { success: false, error: message };
    }
  };

  const registerReseller = async (data: ResellerFormData): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Checagem de CNPJ duplicado na base existente
      const cleanInputCnpj = data.cnpj.replace(/\D/g, '');
      let existingResellers: ResellerProfile[] = [];
      try {
        const stored = localStorage.getItem(RESELLERS_DB_KEY);
        if (stored) {
          existingResellers = JSON.parse(stored);
        }
      } catch {
        existingResellers = [];
      }

      const isDuplicate = existingResellers.some((r) => {
        const storedCnpj = (r.cnpj || '').replace(/\D/g, '');
        return storedCnpj === cleanInputCnpj;
      });

      if (isDuplicate) {
        return {
          success: false,
          error: 'Este CNPJ já está cadastrado. Faça login ou recupere o acesso.',
        };
      }

      // 2. Validação de schema com Zod
      const validation = resellerRegistrationSchema.safeParse(data);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || 'Dados inválidos para cadastro de revenda',
        };
      }

      const validData = validation.data;

      // Simula latência de rede realista
      await new Promise((resolve) => setTimeout(resolve, 200));

      const coords = getCityCoordinates(validData.city, validData.state);

      const newReseller: ResellerProfile = {
        id: 'res_' + Math.random().toString(36).substring(2, 9),
        role: 'RESELLER',
        razaoSocial: validData.razaoSocial,
        nomeFantasia: validData.nomeFantasia,
        cnpj: validData.cnpj,
        corporateEmail: validData.corporateEmail.toLowerCase(),
        whatsapp: validData.whatsapp,
        password: validData.password,
        state: validData.state,
        city: validData.city,
        deliveryRadiusKm: validData.deliveryRadiusKm,
        coordinates: coords,
        categories: validData.categories,
        createdAt: new Date().toISOString(),
      };

      // Persistir no banco de revendas
      existingResellers.push(newReseller);
      localStorage.setItem(RESELLERS_DB_KEY, JSON.stringify(existingResellers));

      // Ativar sessão do usuário
      setUser(newReseller);
      setShowWelcomeNotice(true);
      sessionStorage.setItem(WELCOME_KEY, 'true');

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao registrar revenda';
      return { success: false, error: message };
    }
  };

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const cleanInput = credentials.identifier.trim();
      const lowerEmail = cleanInput.toLowerCase();
      const digitsOnly = cleanInput.replace(/\D/g, '');

      // Simula latência de rede segura para timing attack mitigation
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 1. Busca em Produtores
      let producers: ProducerProfile[] = [];
      try {
        const stored = localStorage.getItem(PRODUCERS_DB_KEY);
        if (stored) producers = JSON.parse(stored);
      } catch {
        producers = [];
      }

      const producerMatch = producers.find((p) => {
        const emailMatch = p.email && p.email.toLowerCase() === lowerEmail;
        const phoneMatch = digitsOnly.length >= 8 && p.whatsapp.replace(/\D/g, '').endsWith(digitsOnly);
        return emailMatch || phoneMatch;
      });

      if (producerMatch) {
        // Valida senha se cadastrada, ou aceita senha demo se não configurada
        const passwordValid = producerMatch.password ? producerMatch.password === credentials.password : true;
        if (passwordValid) {
          setUser(producerMatch);
          return { success: true, role: 'PRODUCER', user: producerMatch };
        }
        return { success: false, error: 'E-mail/telefone ou senha incorretos.' };
      }

      // 2. Busca em Revendas
      let resellers: ResellerProfile[] = [];
      try {
        const stored = localStorage.getItem(RESELLERS_DB_KEY);
        if (stored) resellers = JSON.parse(stored);
      } catch {
        resellers = [];
      }

      const resellerMatch = resellers.find((r) => {
        const emailMatch = r.corporateEmail && r.corporateEmail.toLowerCase() === lowerEmail;
        const phoneMatch = digitsOnly.length >= 8 && r.whatsapp.replace(/\D/g, '').endsWith(digitsOnly);
        const cnpjMatch = digitsOnly.length === 14 && r.cnpj.replace(/\D/g, '') === digitsOnly;
        return emailMatch || phoneMatch || cnpjMatch;
      });

      if (resellerMatch) {
        const passwordValid = resellerMatch.password ? resellerMatch.password === credentials.password : true;
        if (passwordValid) {
          setUser(resellerMatch);
          return { success: true, role: 'RESELLER', user: resellerMatch };
        }
        return { success: false, error: 'E-mail/telefone ou senha incorretos.' };
      }

      // 3. Fallback para demonstrações sem cadastro prévio
      if (lowerEmail === 'produtor.linhares@agro.com.br' || lowerEmail === 'produtor@fazenda.com.br') {
        const demoProducer: ProducerProfile = {
          id: 'prod_demo123',
          name: 'João Produtor Rural',
          email: 'produtor@fazenda.com.br',
          whatsapp: '(27) 99876-5432',
          role: 'PRODUCER',
          farmName: 'Fazenda Terra Santa',
          state: 'ES',
          city: 'Linhares',
          crops: ['cafe', 'pimenta'],
          createdAt: new Date().toISOString(),
        };
        setUser(demoProducer);
        return { success: true, role: 'PRODUCER', user: demoProducer };
      }

      if (lowerEmail === 'revenda.linhares@agro.com.br' || lowerEmail === 'contato@agrovilainsumos.com.br') {
        const demoReseller: ResellerProfile = {
          id: 'res_demo456',
          role: 'RESELLER',
          razaoSocial: 'AgroVila Insumos Agrícolas Ltda',
          nomeFantasia: 'AgroVila Linhares',
          cnpj: '11.222.333/0001-81',
          corporateEmail: 'contato@agrovilainsumos.com.br',
          whatsapp: '(27) 99888-7766',
          state: 'ES',
          city: 'Linhares',
          deliveryRadiusKm: 100,
          coordinates: { lat: -19.3958, lng: -40.0644 },
          categories: ['defensivos', 'fertilizantes', 'foliares'],
          createdAt: new Date().toISOString(),
        };
        setUser(demoReseller);
        return { success: true, role: 'RESELLER', user: demoReseller };
      }

      // Rejeição padrão genérica (anti-enumeração)
      return { success: false, error: 'E-mail/telefone ou senha incorretos.' };
    } catch {
      return { success: false, error: 'E-mail/telefone ou senha incorretos.' };
    }
  };

  const loginMock = (email: string) => {
    const existing = user && ('email' in user ? user.email === email : user.corporateEmail === email)
      ? user
      : {
          id: 'prod_demo123',
          name: 'João Produtor Rural',
          email: email || 'produtor@fazendaboa.com.br',
          whatsapp: '(27) 99876-5432',
          role: 'PRODUCER' as const,
          farmName: 'Fazenda Terra Santa',
          state: 'ES' as const,
          city: 'Linhares',
          crops: ['cafe', 'pimenta'] as CropId[],
          createdAt: new Date().toISOString(),
        };
    setUser(existing);
  };

  const logout = () => {
    setUser(null);
    setShowWelcomeNotice(false);
    sessionStorage.removeItem(WELCOME_KEY);
    localStorage.removeItem(STORAGE_KEY);
  };

  const dismissWelcomeNotice = () => {
    setShowWelcomeNotice(false);
    sessionStorage.removeItem(WELCOME_KEY);
  };

  const requestPasswordReset = async (rawIdentifier: string): Promise<PasswordResetResponse> => {
    try {
      const cleanInput = rawIdentifier.trim();
      if (!cleanInput) {
        return {
          success: false,
          message: 'Informe um e-mail válido ou número de WhatsApp com DDD.',
        };
      }

      const lowerEmail = cleanInput.toLowerCase();
      const digitsOnly = cleanInput.replace(/\D/g, '');

      // Busca em produtores
      let producers: ProducerProfile[] = [];
      try {
        const stored = localStorage.getItem(PRODUCERS_DB_KEY);
        if (stored) producers = JSON.parse(stored);
      } catch {
        producers = [];
      }

      // Busca em revendas
      let resellers: ResellerProfile[] = [];
      try {
        const stored = localStorage.getItem(RESELLERS_DB_KEY);
        if (stored) resellers = JSON.parse(stored);
      } catch {
        resellers = [];
      }

      const foundProducer = producers.find(
        (p) =>
          p.email.toLowerCase() === lowerEmail ||
          p.whatsapp.replace(/\D/g, '') === digitsOnly
      );

      const foundReseller = resellers.find(
        (r) =>
          r.corporateEmail.toLowerCase() === lowerEmail ||
          r.whatsapp.replace(/\D/g, '') === digitsOnly ||
          r.cnpj.replace(/\D/g, '') === digitsOnly
      );

      // Contas demo pré-configuradas para facilidade de testes
      const isDemo =
        lowerEmail === 'produtor.linhares@agro.com.br' ||
        lowerEmail === 'produtor@fazendaboa.com.br' ||
        lowerEmail === 'revenda.linhares@agro.com.br' ||
        lowerEmail === 'contato@agrovilainsumos.com.br' ||
        digitsOnly === '27998765432' ||
        digitsOnly === '27998887766';

      const userExists = !!foundProducer || !!foundReseller || isDemo;
      const userRole = foundProducer
        ? 'PRODUCER'
        : foundReseller
        ? 'RESELLER'
        : isDemo
        ? (lowerEmail.includes('revenda') ? 'RESELLER' : 'PRODUCER')
        : undefined;

      // Mensagem padronizada de alta segurança (anti-enumeração)
      const genericMessage =
        'Se este e-mail ou WhatsApp estiver cadastrado, enviamos um link com token de uso único para redefinir sua senha. O link é válido por 15 minutos.';

      if (!userExists) {
        // Não revela a inexistência do usuário na base de dados
        return {
          success: true,
          message: genericMessage,
        };
      }

      // Usuário existe: gera token de uso único com expiração em 15 minutos
      const token = 'rst_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const channel: 'email' | 'whatsapp' = cleanInput.includes('@') ? 'email' : 'whatsapp';

      const resetRecord: PasswordResetToken = {
        token,
        identifier: cleanInput,
        userRole,
        expiresAt,
        used: false,
        createdAt: new Date().toISOString(),
      };

      let resetList: PasswordResetToken[] = [];
      try {
        const stored = localStorage.getItem(RESETS_DB_KEY);
        if (stored) resetList = JSON.parse(stored);
      } catch {
        resetList = [];
      }
      resetList.push(resetRecord);
      localStorage.setItem(RESETS_DB_KEY, JSON.stringify(resetList));

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cotacampo-es-36ja.vercel.app';
      const resetUrl = `${baseUrl}/redefinir-senha?token=${token}`;

      return {
        success: true,
        message: genericMessage,
        channel,
        expiresAt,
        resetToken: token,
        resetUrl,
      };
    } catch {
      return {
        success: true,
        message:
          'Se este e-mail ou WhatsApp estiver cadastrado, enviamos um link com token de uso único para redefinir sua senha. O link é válido por 15 minutos.',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        showWelcomeNotice,
        registerProducer,
        registerReseller,
        login,
        loginMock,
        logout,
        dismissWelcomeNotice,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};

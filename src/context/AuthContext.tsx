import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProducerProfile, RegisterFormData } from '../types/user';

interface AuthContextType {
  user: ProducerProfile | null;
  isAuthenticated: boolean;
  showWelcomeNotice: boolean;
  registerProducer: (data: RegisterFormData) => Promise<{ success: boolean; error?: string }>;
  loginMock: (email: string) => void;
  logout: () => void;
  dismissWelcomeNotice: () => void;
}

const STORAGE_KEY = 'cotacampo_auth_user';
const WELCOME_KEY = 'cotacampo_welcome_notice';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ProducerProfile | null>(() => {
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
      // Simula validação e latência de rede realista
      await new Promise((resolve) => setTimeout(resolve, 300));

      const newProducer: ProducerProfile = {
        id: 'prod_' + Math.random().toString(36).substring(2, 9),
        name: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        whatsapp: data.whatsapp.trim(),
        role: 'PRODUCER',
        farmName: data.farmName.trim(),
        state: data.state as any,
        city: data.city.trim(),
        crops: data.crops,
        createdAt: new Date().toISOString(),
      };

      setUser(newProducer);
      setShowWelcomeNotice(true);
      sessionStorage.setItem(WELCOME_KEY, 'true');

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao registrar produtor' };
    }
  };

  const loginMock = (email: string) => {
    const existing = user && user.email === email ? user : {
      id: 'prod_demo123',
      name: 'João Produtor Rural',
      email: email || 'produtor@fazendaboa.com.br',
      whatsapp: '(27) 99876-5432',
      role: 'PRODUCER' as const,
      farmName: 'Fazenda Terra Santa',
      state: 'ES' as const,
      city: 'Linhares',
      crops: ['cafe', 'pimenta'] as any,
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        showWelcomeNotice,
        registerProducer,
        loginMock,
        logout,
        dismissWelcomeNotice,
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

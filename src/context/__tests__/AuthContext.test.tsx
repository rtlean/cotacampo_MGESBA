import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext - login unificado', () => {
  const mockProducer = {
    id: 'prod_123',
    role: 'PRODUCER' as const,
    name: 'José Produtor',
    email: 'jose.produtor@fazenda.com.br',
    whatsapp: '(27) 99888-1122',
    password: 'SenhaProdutor@2026',
    farmName: 'Fazenda Terra Fértil',
    state: 'ES' as const,
    city: 'Linhares',
    crops: ['cafe' as const],
    createdAt: new Date().toISOString(),
  };

  const mockReseller = {
    id: 'res_456',
    role: 'RESELLER' as const,
    razaoSocial: 'AgroSul Insumos Ltda',
    nomeFantasia: 'AgroSul Linhares',
    cnpj: '11.222.333/0001-81',
    corporateEmail: 'comercial@agrosul.com.br',
    whatsapp: '(27) 99777-3344',
    password: 'SenhaRevenda@2026',
    state: 'ES' as const,
    city: 'Linhares',
    deliveryRadiusKm: 80,
    coordinates: { lat: -19.3958, lng: -40.0644 },
    categories: ['defensivos' as const, 'fertilizantes' as const],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cotacampo_producers_db', JSON.stringify([mockProducer]));
    localStorage.setItem('cotacampo_resellers_db', JSON.stringify([mockReseller]));
  });

  it('deve autenticar Produtor por e-mail com sucesso', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let response: { success: boolean; error?: string; role?: string } | undefined;
    await act(async () => {
      response = await result.current.login({
        identifier: 'jose.produtor@fazenda.com.br',
        password: 'SenhaProdutor@2026',
      });
    });

    expect(response?.success).toBe(true);
    expect(response?.role).toBe('PRODUCER');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.role).toBe('PRODUCER');
  });

  it('deve autenticar Produtor por telefone/WhatsApp formatado ou apenas dígitos', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let response: { success: boolean; error?: string; role?: string } | undefined;
    await act(async () => {
      response = await result.current.login({
        identifier: '27998881122',
        password: 'SenhaProdutor@2026',
      });
    });

    expect(response?.success).toBe(true);
    expect(response?.role).toBe('PRODUCER');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('deve autenticar Revenda por e-mail corporativo ou CNPJ', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let response: { success: boolean; error?: string; role?: string } | undefined;
    await act(async () => {
      response = await result.current.login({
        identifier: '11.222.333/0001-81',
        password: 'SenhaRevenda@2026',
      });
    });

    expect(response?.success).toBe(true);
    expect(response?.role).toBe('RESELLER');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.role).toBe('RESELLER');
  });

  it('deve rejeitar acesso e retornar mensagem genérica segura quando identificador não existe', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let response: { success: boolean; error?: string } | undefined;
    await act(async () => {
      response = await result.current.login({
        identifier: 'inexistente@email.com',
        password: 'qualquerSenha',
      });
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBe('E-mail/telefone ou senha incorretos.');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('deve rejeitar acesso e retornar mensagem genérica segura quando senha está incorreta', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let response: { success: boolean; error?: string } | undefined;
    await act(async () => {
      response = await result.current.login({
        identifier: 'jose.produtor@fazenda.com.br',
        password: 'SenhaIncorreta@999',
      });
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBe('E-mail/telefone ou senha incorretos.');
    expect(result.current.isAuthenticated).toBe(false);
  });
});

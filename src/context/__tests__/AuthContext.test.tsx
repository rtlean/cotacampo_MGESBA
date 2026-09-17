import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { AuthResponse, PasswordResetResponse, ResetPasswordResponse } from '../../types/user';

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

  describe('recuperação de senha (US04)', () => {
    it('deve gerar token com expiração de 15 minutos ao solicitar recuperação para produtor existente', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      let response: { success: boolean; message: string; expiresAt?: string; resetToken?: string } | undefined;
      await act(async () => {
        response = await result.current.requestPasswordReset('jose.produtor@fazenda.com.br');
      });

      expect(response?.success).toBe(true);
      expect(response?.message).toMatch(/se este e-mail ou whatsapp estiver cadastrado/i);
      expect(response?.resetToken).toBeDefined();
      expect(response?.expiresAt).toBeDefined();

      if (response?.expiresAt) {
        const expiresTime = new Date(response.expiresAt).getTime();
        const now = Date.now();
        const diffMinutes = Math.round((expiresTime - now) / (60 * 1000));
        expect(diffMinutes).toBe(15);
      }
    });

    it('deve gerar token com expiração de 15 minutos ao solicitar recuperação para revenda por WhatsApp', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      let response: { success: boolean; message: string; expiresAt?: string; resetToken?: string } | undefined;
      await act(async () => {
        response = await result.current.requestPasswordReset('27997773344');
      });

      expect(response?.success).toBe(true);
      expect(response?.message).toMatch(/se este e-mail ou whatsapp estiver cadastrado/i);
      expect(response?.resetToken).toBeDefined();
    });

    it('deve retornar resposta de sucesso genérica com mesma mensagem sem revelar inexistência de usuário', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      let response: { success: boolean; message: string; resetToken?: string } | undefined;
      await act(async () => {
        response = await result.current.requestPasswordReset('nao.existe@agro.com');
      });

      expect(response?.success).toBe(true);
      expect(response?.message).toMatch(/se este e-mail ou whatsapp estiver cadastrado/i);
      // Não vaza token real para usuário inexistente
      expect(response?.resetToken).toBeUndefined();
    });

    it('deve redefinir a senha com sucesso e permitir login com a nova senha, bloqueando a senha antiga', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      // 1. Solicita recuperação para produtor
      let reqResponse: PasswordResetResponse | undefined;
      await act(async () => {
        reqResponse = await result.current.requestPasswordReset('jose.produtor@fazenda.com.br');
      });

      expect(reqResponse?.success).toBe(true);
      expect(reqResponse?.resetToken).toBeDefined();

      // 2. Redefine a senha utilizando o token gerado
      let resetResponse: ResetPasswordResponse | undefined;
      await act(async () => {
        resetResponse = await result.current.resetPassword(
          reqResponse?.resetToken || '',
          'NovaSenhaDefinitiva@2026'
        );
      });

      expect(resetResponse?.success).toBe(true);

      // 3. Tenta login com a senha antiga -> Deve ser rejeitado!
      let oldLoginResponse: AuthResponse | undefined;
      await act(async () => {
        oldLoginResponse = await result.current.login({
          identifier: 'jose.produtor@fazenda.com.br',
          password: 'SenhaProdutor@2026',
        });
      });

      expect(oldLoginResponse?.success).toBe(false);

      // 4. Tenta login com a NOVA senha -> Deve autenticar com sucesso!
      let newLoginResponse: AuthResponse | undefined;
      await act(async () => {
        newLoginResponse = await result.current.login({
          identifier: 'jose.produtor@fazenda.com.br',
          password: 'NovaSenhaDefinitiva@2026',
        });
      });

      expect(newLoginResponse?.success).toBe(true);
      expect(newLoginResponse?.role).toBe('PRODUCER');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});

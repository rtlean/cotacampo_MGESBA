import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { AuthResponse, PasswordResetResponse, ResetPasswordResponse } from '../../types/user';
import { supabase } from '../../services/supabase';

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

    it('deve rejeitar redefinição com token vazio ou senha curta', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      let res1: ResetPasswordResponse | undefined;
      await act(async () => {
        res1 = await result.current.resetPassword('', '123456');
      });
      expect(res1?.success).toBe(false);

      let res2: ResetPasswordResponse | undefined;
      await act(async () => {
        res2 = await result.current.resetPassword('tok-1', '123');
      });
      expect(res2?.success).toBe(false);
    });

    it('deve rejeitar token de redefinição inexistente, expirado ou já utilizado', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      // Inexistente
      let res: ResetPasswordResponse | undefined;
      await act(async () => {
        res = await result.current.resetPassword('token_inexistente', 'NovaSenha123');
      });
      expect(res?.success).toBe(false);
      expect(res?.error).toContain('inválido');

      // Expirado
      const expiredToken = {
        token: 'tok_expired',
        code: '999999',
        identifier: 'jose.produtor@fazenda.com.br',
        expiresAt: new Date(Date.now() - 10000).toISOString(),
        used: false,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('cotacampo_password_resets', JSON.stringify([expiredToken]));

      await act(async () => {
        res = await result.current.resetPassword('tok_expired', 'NovaSenha123');
      });
      expect(res?.success).toBe(false);
      expect(res?.error).toContain('expirado');

      // Já utilizado
      const usedToken = { ...expiredToken, token: 'tok_used', expiresAt: new Date(Date.now() + 100000).toISOString(), used: true };
      localStorage.setItem('cotacampo_password_resets', JSON.stringify([usedToken]));

      await act(async () => {
        res = await result.current.resetPassword('tok_used', 'NovaSenha123');
      });
      expect(res?.success).toBe(false);
      expect(res?.error).toContain('já foi utilizado');
    });

    it('deve suportar recuperação via token direto de sessão de e-mail', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      let res: ResetPasswordResponse | undefined;
      await act(async () => {
        res = await result.current.resetPassword('email_recovery_token', 'NovaSenhaSessao123');
      });
      expect(res?.success).toBe(true);
    });
  });

  describe('Outras operações do AuthContext', () => {
    it('deve lançar erro se useAuth for invocado fora do AuthProvider', () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth deve ser utilizado dentro de um AuthProvider'
      );
    });

    it('deve realizar loginMock e logout corretamente', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      act(() => {
        result.current.loginMock('custom.mock@agro.com.br');
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.name).toBe('João Produtor Rural');

      act(() => {
        result.current.logout();
      });
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('deve autenticar contas de demonstração padrão para Produtor e Revenda', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      let prodDemoRes: AuthResponse | undefined;
      await act(async () => {
        prodDemoRes = await result.current.login({
          identifier: 'produtor.linhares@agro.com.br',
          password: 'demo',
        });
      });
      expect(prodDemoRes?.success).toBe(true);
      expect(prodDemoRes?.role).toBe('PRODUCER');

      let resDemoRes: AuthResponse | undefined;
      await act(async () => {
        resDemoRes = await result.current.login({
          identifier: 'revenda.linhares@agro.com.br',
          password: 'demo',
        });
      });
      expect(resDemoRes?.success).toBe(true);
      expect(resDemoRes?.role).toBe('RESELLER');
    });

    it('deve falhar registro com dados inválidos em registerProducer e registerReseller', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      let prodReg: { success: boolean; error?: string } | undefined;
      await act(async () => {
        prodReg = await result.current.registerProducer({} as unknown as Parameters<typeof result.current.registerProducer>[0]);
      });
      expect(prodReg?.success).toBe(false);

      let resReg: { success: boolean; error?: string } | undefined;
      await act(async () => {
        resReg = await result.current.registerReseller({} as unknown as Parameters<typeof result.current.registerReseller>[0]);
      });
      expect(resReg?.success).toBe(false);
    });

    it('deve redefinir senha para revenda e atualizar usuário autenticado se estiver na sessão', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      // Configura revenda no banco
      const reseller = {
        id: 'res_test_99',
        role: 'RESELLER' as const,
        razaoSocial: 'Agro Teste Ltda',
        nomeFantasia: 'Agro Teste',
        cnpj: '11.222.333/0001-81',
        corporateEmail: 'contato@agroteste.com.br',
        whatsapp: '(27) 99888-7766',
        password: 'SenhaAntiga@123',
        state: 'ES' as const,
        city: 'Linhares',
        deliveryRadiusKm: 100,
        coordinates: { lat: -19.3958, lng: -40.0644 },
        categories: ['defensivos' as const],
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('cotacampo_resellers_db', JSON.stringify([reseller]));

      // Loga revenda
      await act(async () => {
        await result.current.login({
          identifier: 'contato@agroteste.com.br',
          password: 'SenhaAntiga@123',
        });
      });
      expect(result.current.isAuthenticated).toBe(true);

      // Gera reset para ela
      const token = {
        token: 'tok_reseller_1',
        code: '123456',
        identifier: 'contato@agroteste.com.br',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        used: false,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('cotacampo_password_resets', JSON.stringify([token]));

      // Redefine
      let resetRes: ResetPasswordResponse | undefined;
      await act(async () => {
        resetRes = await result.current.resetPassword('tok_reseller_1', 'NovaSenhaRevenda@123');
      });
      expect(resetRes?.success).toBe(true);
      expect((result.current.user as typeof reseller).password).toBe('NovaSenhaRevenda@123');
    });

    it('deve rejeitar senha incorreta para revenda', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
      const reseller = {
        id: 'res_wrong_pw',
        role: 'RESELLER' as const,
        razaoSocial: 'Loja Ltda',
        nomeFantasia: 'Loja',
        cnpj: '22.333.444/0001-55',
        corporateEmail: 'loja@insumos.com.br',
        whatsapp: '(27) 99777-8899',
        password: 'SenhaCerta@2026',
        state: 'ES' as const,
        city: 'Linhares',
        deliveryRadiusKm: 100,
        coordinates: { lat: -19.3958, lng: -40.0644 },
        categories: ['defensivos' as const],
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('cotacampo_resellers_db', JSON.stringify([reseller]));

      let loginRes: AuthResponse | undefined;
      await act(async () => {
        loginRes = await result.current.login({
          identifier: 'loja@insumos.com.br',
          password: 'SenhaTotalmenteErrada',
        });
      });
      expect(loginRes?.success).toBe(false);
      expect(loginRes?.error).toBe('E-mail/telefone ou senha incorretos.');
    });

    it('deve lidar com identificador vazio e erros de rede no requestPasswordReset', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      // Vazio
      let emptyRes: PasswordResetResponse | undefined;
      await act(async () => {
        emptyRes = await result.current.requestPasswordReset('');
      });
      expect(emptyRes?.success).toBe(false);
      expect(emptyRes?.message).toContain('Informe um e-mail válido');

      // Rate limit no Supabase
      vi.spyOn(supabase.auth, 'resetPasswordForEmail').mockResolvedValueOnce({
        data: null as unknown as { user: null; session: null },
        error: { message: 'rate limit 429' } as unknown as import('@supabase/supabase-js').AuthError,
      });

      let rateLimitRes: PasswordResetResponse | undefined;
      await act(async () => {
        rateLimitRes = await result.current.requestPasswordReset('produtor.linhares@agro.com.br');
      });
      expect(rateLimitRes?.deliveryStatus).toBe('rate_limited');

      // Exceção de storage em resetPassword
      const token = {
        token: 'tok_disco_err',
        code: '555555',
        identifier: 'jose.produtor@fazenda.com.br',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        used: false,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('cotacampo_password_resets', JSON.stringify([token]));

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Falha no disco');
      });
      let excRes: ResetPasswordResponse | undefined;
      await act(async () => {
        excRes = await result.current.resetPassword('tok_disco_err', 'SenhaNova@123');
      });
      expect(excRes?.success).toBe(false);
      expect(excRes?.error).toBe('Falha no disco');
      setItemSpy.mockRestore();
    });

    it('deve usar endpoint REST de fallback quando resetPasswordForEmail falhar com erro genérico', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      vi.spyOn(supabase.auth, 'resetPasswordForEmail').mockResolvedValueOnce({
        data: null as unknown as { user: null; session: null },
        error: { message: 'Auth server error' } as unknown as import('@supabase/supabase-js').AuthError,
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
      );

      let res: PasswordResetResponse | undefined;
      await act(async () => {
        res = await result.current.requestPasswordReset('produtor.linhares@agro.com.br');
      });
      expect(res?.deliveryStatus).toBe('rate_limited');

      // Teste com fetch ok
      vi.spyOn(supabase.auth, 'resetPasswordForEmail').mockResolvedValueOnce({
        data: null as unknown as { user: null; session: null },
        error: { message: 'Auth server error' } as unknown as import('@supabase/supabase-js').AuthError,
      });
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
      await act(async () => {
        res = await result.current.requestPasswordReset('produtor.linhares@agro.com.br');
      });
      expect(res?.deliveryStatus).toBe('sent');

      fetchSpy.mockRestore();
    });

    it('deve lidar com corrupção de JSON em tabelas locais no resetPassword', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      localStorage.setItem('cotacampo_password_resets', 'invalid_json{');
      let res: ResetPasswordResponse | undefined;
      await act(async () => {
        res = await result.current.resetPassword('tok_x', 'NovaSenha@123');
      });
      expect(res?.success).toBe(false);

      // Agora com token válido mas produtores e revendas corrompidos
      const token = {
        token: 'tok_corrupt_db',
        code: '112233',
        identifier: 'jose.produtor@fazenda.com.br',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        used: false,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('cotacampo_password_resets', JSON.stringify([token]));
      localStorage.setItem('cotacampo_producers_db', 'corrupt_json{');
      localStorage.setItem('cotacampo_resellers_db', 'corrupt_json{');

      await act(async () => {
        res = await result.current.resetPassword('tok_corrupt_db', 'NovaSenha@123');
      });
      expect(res?.success).toBe(true);
    });

    it('deve atualizar bases locais ao redefinir senha via sessão Supabase (token longo)', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      const prod = {
        id: 'prod_jwt',
        role: 'PRODUCER' as const,
        name: 'José JWT',
        email: 'jwt.user@agro.com.br',
        whatsapp: '(27) 99888-1122',
        password: 'OldPassword123',
        farmName: 'Fazenda JWT',
        state: 'ES' as const,
        city: 'Linhares',
        crops: ['cafe' as const],
        createdAt: new Date().toISOString(),
      };
      const resel = {
        id: 'res_jwt',
        role: 'RESELLER' as const,
        razaoSocial: 'JWT Insumos Ltda',
        nomeFantasia: 'JWT Insumos',
        cnpj: '11.222.333/0001-81',
        corporateEmail: 'jwt.user@agro.com.br',
        whatsapp: '(27) 99888-7766',
        password: 'OldPassword123',
        state: 'ES' as const,
        city: 'Linhares',
        deliveryRadiusKm: 100,
        coordinates: { lat: -19.3958, lng: -40.0644 },
        categories: ['defensivos' as const],
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem('cotacampo_producers_db', JSON.stringify([prod]));
      localStorage.setItem('cotacampo_resellers_db', JSON.stringify([resel]));

      // Mock updateUser
      vi.spyOn(supabase.auth, 'updateUser').mockResolvedValueOnce({
        data: { user: { email: 'jwt.user@agro.com.br' } } as unknown as { user: import('@supabase/supabase-js').User },
        error: null,
      });

      // Simula usuário logado para cobrir linha 574
      act(() => {
        result.current.loginMock('jwt.user@agro.com.br');
      });

      const longJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      let resetRes: ResetPasswordResponse | undefined;
      await act(async () => {
        resetRes = await result.current.resetPassword(longJwtToken, 'NewSecurePassword123');
      });
      expect(resetRes?.success).toBe(true);
      expect((result.current.user as typeof prod).password).toBe('NewSecurePassword123');

      // Com exceção no updateUser
      vi.spyOn(supabase.auth, 'updateUser').mockRejectedValueOnce(new Error('Update failed'));
      await act(async () => {
        resetRes = await result.current.resetPassword(longJwtToken, 'AnotherPassword123');
      });
      expect(resetRes?.success).toBe(true);
    });

    it('deve lidar com falha de conexão na API de envio de e-mails', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

      vi.spyOn(supabase.auth, 'resetPasswordForEmail').mockRejectedValueOnce(
        new Error('Network down')
      );

      let res: PasswordResetResponse | undefined;
      await act(async () => {
        res = await result.current.requestPasswordReset('produtor.linhares@agro.com.br');
      });
      expect(res?.deliveryStatus).toBe('error');
      expect(res?.errorMessage).toContain('Não foi possível conectar ao servidor de e-mails');
    });
  });
});

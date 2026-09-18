import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import { AuthProvider } from '../context/AuthContext';

const renderApp = () => {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

describe('App - Roteamento Global e Redirecionamento de Recuperação por E-mail', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve redirecionar para /redefinir-senha quando a URL da raiz (/) contiver hash de recuperação do Supabase (#type=recovery)', async () => {
    window.history.pushState(
      {},
      '',
      '/#access_token=mock_token_jwt&expires_in=3600&refresh_token=mock_refresh&token_type=bearer&type=recovery'
    );

    renderApp();

    await waitFor(() => {
      expect(window.location.pathname).toBe('/redefinir-senha');
      expect(screen.getByRole('heading', { name: /criar nova senha/i })).toBeInTheDocument();
    });
  });

  it('deve redirecionar para /redefinir-senha quando a URL contiver parâmetros de recovery em search (?type=recovery)', async () => {
    window.history.pushState(
      {},
      '',
      '/cadastro?type=recovery&token=rst_test123'
    );

    renderApp();

    await waitFor(() => {
      expect(window.location.pathname).toBe('/redefinir-senha');
      expect(screen.getByRole('heading', { name: /criar nova senha/i })).toBeInTheDocument();
    });
  });

  it('deve redirecionar para /redefinir-senha se o link do Supabase trouxer erro de token (#error_code=otp_expired)', async () => {
    window.history.pushState(
      {},
      '',
      '/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );

    renderApp();

    await waitFor(() => {
      expect(window.location.pathname).toBe('/redefinir-senha');
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/expirado ou inválido/i);
    });
  });
});

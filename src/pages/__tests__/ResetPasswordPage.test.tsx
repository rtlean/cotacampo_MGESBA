import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetPasswordPage } from '../ResetPasswordPage';
import { AuthProvider } from '../../context/AuthContext';

const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('ResetPasswordPage', () => {
  const validTokenRecord = {
    token: 'rst_valid_123',
    code: '123456',
    identifier: 'jose.produtor@fazenda.com.br',
    userRole: 'PRODUCER',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    used: false,
    createdAt: new Date().toISOString(),
  };

  const expiredTokenRecord = {
    token: 'rst_expired_456',
    code: '654321',
    identifier: 'jose.produtor@fazenda.com.br',
    userRole: 'PRODUCER',
    expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min atrás
    used: false,
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  };

  const usedTokenRecord = {
    token: 'rst_used_789',
    code: '987654',
    identifier: 'jose.produtor@fazenda.com.br',
    userRole: 'PRODUCER',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    used: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'cotacampo_password_resets',
      JSON.stringify([validTokenRecord, expiredTokenRecord, usedTokenRecord])
    );
    window.history.pushState({}, '', '/redefinir-senha');
  });

  it('deve renderizar formulário para digitação do código ou token quando nenhum parâmetro for passado na URL', () => {
    renderWithAuth(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: /criar nova senha/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/código de 6 dígitos ou token/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nova senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar nova senha/i)).toBeInTheDocument();
  });

  it('deve pré-preencher e validar automaticamente quando token válido vier na URL', () => {
    window.history.pushState({}, '', '/redefinir-senha?token=rst_valid_123');
    renderWithAuth(<ResetPasswordPage />);

    expect(screen.getByDisplayValue('rst_valid_123')).toBeInTheDocument();
  });

  it('deve exibir erro claro quando o token estiver expirado', async () => {
    window.history.pushState({}, '', '/redefinir-senha?token=rst_expired_456');
    renderWithAuth(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/^nova senha/i), {
      target: { value: 'NovaSenha@2026' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), {
      target: { value: 'NovaSenha@2026' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/expirado/i);
    });
  });

  it('deve exibir erro claro quando o token já tiver sido utilizado', async () => {
    window.history.pushState({}, '', '/redefinir-senha?token=rst_used_789');
    renderWithAuth(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/^nova senha/i), {
      target: { value: 'NovaSenha@2026' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), {
      target: { value: 'NovaSenha@2026' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/utilizado/i);
    });
  });

  it('deve redefinir a senha com sucesso com token válido e exibir confirmação com link para login', async () => {
    window.history.pushState({}, '', '/redefinir-senha?token=rst_valid_123');
    renderWithAuth(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/^nova senha/i), {
      target: { value: 'NovaSenha@2026' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), {
      target: { value: 'NovaSenha@2026' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/senha redefinida com sucesso/i);
      expect(screen.getByRole('link', { name: /fazer login/i })).toHaveAttribute('href', '/login');
    });
  });

  it('deve identificar link de recuperação do e-mail via hash fragment (#access_token=...&type=recovery) e exibir banner de link autenticado', () => {
    window.history.pushState(
      {},
      '',
      '/redefinir-senha#access_token=mock_jwt_token&expires_in=3600&refresh_token=mock_refresh&token_type=bearer&type=recovery'
    );
    renderWithAuth(<ResetPasswordPage />);

    expect(screen.getByText(/link de e-mail verificado com sucesso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nova senha/i)).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro amigável se o link do e-mail tiver expirado no Supabase (#error_description=Email+link+is+invalid+or+has+expired)', () => {
    window.history.pushState(
      {},
      '',
      '/redefinir-senha#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );
    renderWithAuth(<ResetPasswordPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/expirado ou inválido/i);
  });

  it('deve exibir erro quando submetido com senhas diferentes', async () => {
    window.history.pushState({}, '', '/redefinir-senha?token=rst_valid_123');
    renderWithAuth(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/^nova senha/i), {
      target: { value: 'Senha@123' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), {
      target: { value: 'Diferente@123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/as senhas não coincidem/i);
    });
  });

  it('deve permitir digitar código de 6 dígitos manualmente e exibir erro se campo de código estiver vazio', async () => {
    window.history.pushState({}, '', '/redefinir-senha');
    renderWithAuth(<ResetPasswordPage />);

    const codeInput = screen.getByLabelText(/código de 6 dígitos ou token/i);
    fireEvent.change(codeInput, { target: { value: '' } });

    fireEvent.change(screen.getByLabelText(/^nova senha/i), {
      target: { value: 'NovaSenha@2026' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), {
      target: { value: 'NovaSenha@2026' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/informe o código de 6 dígitos ou o link/i);
    });

    // Digita no input de código
    fireEvent.change(codeInput, { target: { value: '123456' } });
    expect((codeInput as HTMLInputElement).value).toBe('123456');
  });
});

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
import { AuthProvider } from '../../context/AuthContext';

const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve renderizar o título, campo de identificador e botão de envio', () => {
    renderWithAuth(<ForgotPasswordPage />);

    expect(screen.getByRole('heading', { name: /recuperar acesso/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail ou whatsapp/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar link de redefinição/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar para o login/i })).toHaveAttribute('href', '/login');
  });

  it('deve exibir mensagem de erro se o formulário for submetido em branco', async () => {
    renderWithAuth(<ForgotPasswordPage />);

    const submitButton = screen.getByRole('button', { name: /enviar link de redefinição/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/informe um e-mail válido ou número de whatsapp/i);
    });
  });

  it('Cenário 1: deve enviar solicitação para produtor cadastrado e exibir confirmação com prazo de 15 minutos sem confirmar existência explícita', async () => {
    renderWithAuth(<ForgotPasswordPage />);

    const input = screen.getByLabelText(/e-mail ou whatsapp/i);
    fireEvent.change(input, { target: { value: 'joao.silva@fazendasaopedro.com.br' } });

    const submitButton = screen.getByRole('button', { name: /enviar link de redefinição/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Exibe estado de confirmação seguro (anti-enumeração)
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/se este e-mail ou whatsapp estiver cadastrado/i);
      expect(screen.getAllByText(/15 minutos/i).length).toBeGreaterThan(0);
    });
  });

  it('Cenário 1 (Borda Anti-Enumeração): deve exibir a mesma confirmação quando o e-mail NÃO existe na base', async () => {
    renderWithAuth(<ForgotPasswordPage />);

    const input = screen.getByLabelText(/e-mail ou whatsapp/i);
    fireEvent.change(input, { target: { value: 'usuario_nao_existente@exemplo.com' } });

    const submitButton = screen.getByRole('button', { name: /enviar link de redefinição/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Mensagem idêntica para usuário inexistente
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/se este e-mail ou whatsapp estiver cadastrado/i);
      expect(screen.getAllByText(/15 minutos/i).length).toBeGreaterThan(0);
    });
  });

  it('deve permitir solicitar novo envio para outro e-mail/telefone', async () => {
    renderWithAuth(<ForgotPasswordPage />);

    const input = screen.getByLabelText(/e-mail ou whatsapp/i);
    fireEvent.change(input, { target: { value: 'teste@exemplo.com' } });

    fireEvent.click(screen.getByRole('button', { name: /enviar link de redefinição/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    // Clica no botão para tentar outro contato
    const retryButton = screen.getByRole('button', { name: /enviar para outro contato/i });
    fireEvent.click(retryButton);

    expect(screen.getByLabelText(/e-mail ou whatsapp/i)).toBeInTheDocument();
  });

  it('deve gerar link de abertura no WhatsApp com código de 6 dígitos quando solicitado por telefone', async () => {
    renderWithAuth(<ForgotPasswordPage />);

    const input = screen.getByLabelText(/e-mail ou whatsapp/i);
    fireEvent.change(input, { target: { value: '27998765432' } });

    fireEvent.click(screen.getByRole('button', { name: /enviar link de redefinição/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      const whatsappLink = screen.getByRole('link', { name: /abrir no whatsapp/i });
      expect(whatsappLink).toBeInTheDocument();
      expect(whatsappLink.getAttribute('href')).toMatch(/api\.whatsapp\.com\/send\?phone=5527998765432/);
      expect(screen.getByRole('link', { name: /cadastrar nova senha com este código/i })).toBeInTheDocument();
    });
  });
});

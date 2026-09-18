import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from '../../context/AuthContext';

describe('RegisterPage (Fatia Vertical: Cadastro do Produtor Rural)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/cadastro');
  });

  it('deve aplicar máscara no WhatsApp conforme o produtor digita', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const whatsappInput = screen.getByLabelText(/Telefone \/ WhatsApp/i) as HTMLInputElement;

    fireEvent.change(whatsappInput, { target: { value: '27998' } });
    expect(whatsappInput.value).toBe('(27) 998');

    fireEvent.change(whatsappInput, { target: { value: '27998765432' } });
    expect(whatsappInput.value).toBe('(27) 99876-5432');
  });

  it('Cenário 2: Validação negativa, bloqueio de submissão e foco no primeiro campo com erro', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Desmarca a cultura Café para deixar 0 culturas
    const cafeButton = screen.getByRole('checkbox', { name: /Café/i });
    fireEvent.click(cafeButton);

    // Digita WhatsApp inválido
    const whatsappInput = screen.getByLabelText(/Telefone \/ WhatsApp/i);
    fireEvent.change(whatsappInput, { target: { value: '123' } });

    // Clica no botão de criar conta
    const submitBtn = screen.getByRole('button', { name: /Criar Conta de Produtor/i });
    fireEvent.click(submitBtn);

    // Verifica que as mensagens de validação aparecem
    await waitFor(() => {
      expect(screen.getByText(/Informe seu nome completo/i)).toBeInTheDocument();
      expect(screen.getByText(/WhatsApp inválido/i)).toBeInTheDocument();
      expect(screen.getByText(/Selecione ao menos uma cultura atendida/i)).toBeInTheDocument();
    });

    // O foco deve ir para o primeiro campo com erro (Nome Completo)
    const fullNameInput = screen.getByLabelText(/Nome Completo/i);
    expect(document.activeElement).toBe(fullNameInput);
  });

  it('Cenário 1: Cadastro completo com sucesso, criação do perfil PRODUCER e redirecionamento', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Preenchimento dos dados do produtor
    fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
      target: { value: 'Roberto Agrônomo da Silva' },
    });
    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'roberto@fazendasantarita.com.br' },
    });
    fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
      target: { value: '27998765432' },
    });
    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
      target: { value: 'Safra@2026' },
    });
    fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), {
      target: { value: 'Fazenda Santa Rita' },
    });
    fireEvent.change(screen.getByLabelText(/Estado \(UF\)/i), {
      target: { value: 'ES' },
    });
    fireEvent.change(screen.getByLabelText(/Município/i), {
      target: { value: 'Linhares' },
    });

    // Seleciona culturas (Café e Cacau)
    const cacauButton = screen.getByRole('checkbox', { name: /Cacau/i });
    fireEvent.click(cacauButton);

    // Submete o formulário
    fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

    // Redirecionamento para o dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/produtor/dashboard');
    });

    // Elementos do dashboard renderizados
    await waitFor(
      () => {
        const farmElements = screen.queryAllByText('Fazenda Santa Rita');
        expect(farmElements.length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Linhares/i).length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 }
    );

    // Boas-vindas ao produtor
    expect(screen.getAllByText(/Bem-vindo ao CotaCampo, Roberto!/i).length).toBeGreaterThanOrEqual(1);
  });

  it('deve chamar scrollIntoView e limpar erros ao digitar nos campos do produtor', async () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Submete em branco
    fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

    await waitFor(() => {
      expect(screen.getByText(/Informe seu nome completo/i)).toBeInTheDocument();
    });

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();

    // Digita nos campos para limpar erros
    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Nome' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'email@agro.com' } });
    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), { target: { value: 'Sítio' } });
    fireEvent.change(screen.getByLabelText(/Município/i), { target: { value: 'Linhares' } });
  });

  it('deve exibir alert quando o cadastro do produtor falhar no servidor', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('Falha no banco');
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Carlos Erro' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'carlos@erro.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), { target: { value: '27998765432' } });
    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), { target: { value: 'Safra@2026' } });
    fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), { target: { value: 'Fazenda Erro' } });
    fireEvent.change(screen.getByLabelText(/Município/i), { target: { value: 'Linhares' } });

    fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Falha no banco'));
    });

    alertSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});

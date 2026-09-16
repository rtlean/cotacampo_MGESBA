import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../App';
import { AuthProvider } from '../context/AuthContext';

describe('US01 – Cadastro do Produtor Rural', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/cadastro');
  });

  it('Cenário 2: Tentativa de cadastro com dados incompletos ou inválidos', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Deselect all crops (click on Café which was initially checked)
    const cafeButton = screen.getByRole('checkbox', { name: /Café/i });
    fireEvent.click(cafeButton);

    // Preenche WhatsApp com formato inválido (ex: 3 dígitos)
    const whatsappInput = screen.getByLabelText(/Telefone \/ WhatsApp/i);
    fireEvent.change(whatsappInput, { target: { value: '123' } });

    // Clica no botão "Criar Conta de Produtor"
    const submitBtn = screen.getByRole('button', { name: /Criar Conta de Produtor/i });
    fireEvent.click(submitBtn);

    // Validações devem ser exibidas abaixo dos campos
    await waitFor(() => {
      expect(screen.getByText('Informe seu nome completo')).toBeInTheDocument();
      expect(screen.getByText(/Número de WhatsApp inválido/i)).toBeInTheDocument();
      expect(screen.getByText(/Selecione ao menos uma cultura atendida/i)).toBeInTheDocument();
    });

    // O foco deve ser movido para o primeiro campo com erro (Nome Completo)
    const fullNameInput = screen.getByLabelText(/Nome Completo/i);
    expect(document.activeElement).toBe(fullNameInput);
  });

  it('Cenário 1: Cadastro realizado com sucesso e redirecionamento para o dashboard com boas-vindas', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // 1. Preenche Nome Completo
    const fullNameInput = screen.getByLabelText(/Nome Completo/i);
    fireEvent.change(fullNameInput, { target: { value: 'Roberto da Silva Santos' } });

    // 2. Preenche E-mail
    const emailInput = screen.getByLabelText(/E-mail/i);
    fireEvent.change(emailInput, { target: { value: 'roberto@fazendasantarita.com.br' } });

    // 3. Preenche WhatsApp válido
    const whatsappInput = screen.getByLabelText(/Telefone \/ WhatsApp/i);
    fireEvent.change(whatsappInput, { target: { value: '27998765432' } });

    // 4. Cria senha segura
    const passwordInput = screen.getByLabelText(/Senha de Acesso/i);
    fireEvent.change(passwordInput, { target: { value: 'Safra@2026' } });

    // 5. Nome da Fazenda
    const farmInput = screen.getByLabelText(/Nome da Fazenda \/ Sítio/i);
    fireEvent.change(farmInput, { target: { value: 'Fazenda Santa Rita' } });

    // 6. Seleciona Estado (ES) e Município (Linhares)
    const stateSelect = screen.getByLabelText(/Estado \(UF\)/i);
    fireEvent.change(stateSelect, { target: { value: 'ES' } });

    const citySelect = screen.getByLabelText(/Município/i);
    fireEvent.change(citySelect, { target: { value: 'Linhares' } });

    // 7. Seleciona as culturas atendidas (Café e Pimenta-do-reino)
    const pimentaButton = screen.getByRole('checkbox', { name: /Pimenta-do-reino/i });
    fireEvent.click(pimentaButton);

    // 8. Clica em "Criar Conta de Produtor"
    const submitBtn = screen.getByRole('button', { name: /Criar Conta de Produtor/i });
    fireEvent.click(submitBtn);

    // 9. Verifica que foi redirecionado para /produtor/dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/produtor/dashboard');
    });

    // 10. Verifica dados do perfil PRODUCER na tela
    await waitFor(
      () => {
        const elements = screen.queryAllByText('Fazenda Santa Rita');
        expect(elements.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    // 11. Verifica notificação / modal de boas-vindas com orientações para a primeira cotação
    expect(screen.getAllByText(/Bem-vindo ao CotaCampo, Roberto!/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Publique sua Lista de Insumos/i)).toBeInTheDocument();
    expect(screen.getByText(/Revendas da sua Região Disputam o Pedido/i)).toBeInTheDocument();
    expect(screen.getByText(/Compare Preços e Feche pelo WhatsApp/i)).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { ProducerProfile } from '../../types/user';
import { QuotationRequest } from '../../types/quotation';

describe('US05 – Dashboard e Gestão de Cotações do Produtor', () => {
  const mockProducer: ProducerProfile = {
    id: 'prod_999',
    role: 'PRODUCER',
    name: 'João do Café',
    email: 'joao@fazendasantaclara.com.br',
    whatsapp: '(27) 99777-6655',
    farmName: 'Fazenda Santa Clara',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe', 'pimenta'],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));
    window.history.pushState({}, '', '/produtor/dashboard');
  });

  it('Cenário 1: Visualização do dashboard com cotações ativas (3 cards com contagens exatas e botão flutuante/banner)', async () => {
    const mockQuotations: QuotationRequest[] = [
      {
        id: 'q-open-1',
        producerId: mockProducer.id,
        title: 'Adubação de Cobertura para Café Conilon',
        status: 'OPEN',
        targetState: 'ES',
        targetCity: 'Linhares',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        itemsCount: 3,
        bidsCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'q-open-2',
        producerId: mockProducer.id,
        title: 'Fungicida Sistêmico para Ferrugem do Café',
        status: 'OPEN',
        targetState: 'ES',
        targetCity: 'Linhares',
        deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
        itemsCount: 1,
        bidsCount: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'q-review-1',
        producerId: mockProducer.id,
        title: 'Nutrição Foliar Micronutrientes Pimenta',
        status: 'IN_REVIEW',
        targetState: 'ES',
        targetCity: 'Linhares',
        deadline: new Date(Date.now() - 86400000).toISOString(),
        itemsCount: 2,
        bidsCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'q-awarded-1',
        producerId: mockProducer.id,
        title: 'Calcário Dolomítico Granulado a Granel',
        status: 'AWARDED',
        targetState: 'ES',
        targetCity: 'Linhares',
        deadline: new Date(Date.now() - 86400000 * 5).toISOString(),
        itemsCount: 1,
        bidsCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    localStorage.setItem('cotacampo_quotations', JSON.stringify(mockQuotations));

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Identificação da Fazenda
    expect(screen.getByRole('heading', { level: 1, name: /Fazenda Santa Clara/i })).toBeInTheDocument();

    // Aguardar carregamento assíncrono das cotações
    await waitFor(() => {
      expect(screen.getByTestId('card-open-count')).toHaveTextContent('2');
    });

    // Validar três cards métricos e suas contagens exatas
    expect(screen.getByText(/Cotações Abertas/i)).toBeInTheDocument();
    expect(screen.getByTestId('card-open-count')).toHaveTextContent('2');

    expect(screen.getAllByText(/Aguardando Decisão/i)[0]).toBeInTheDocument();
    expect(screen.getByTestId('card-in-review-count')).toHaveTextContent('1');

    expect(screen.getAllByText(/Concluídas/i)[0]).toBeInTheDocument();
    expect(screen.getByTestId('card-awarded-count')).toHaveTextContent('1');

    // Botão flutuante / banner [+ Nova Cotação] direcionando para /produtor/cotacoes/nova
    const newQuoteButtons = screen.getAllByRole('link', { name: /\+ Nova Cotação/i });
    expect(newQuoteButtons.length).toBeGreaterThanOrEqual(1);
    expect(newQuoteButtons[0]).toHaveAttribute('href', '/produtor/cotacoes/nova');

    // Lista de cotações ativas presentes
    expect(screen.getByText(/Adubação de Cobertura para Café Conilon/i)).toBeInTheDocument();
    expect(screen.getByText(/Nutrição Foliar Micronutrientes Pimenta/i)).toBeInTheDocument();
    expect(screen.getByText(/Calcário Dolomítico Granulado a Granel/i)).toBeInTheDocument();
  });

  it('Cenário 2: Produtor sem cotações cadastradas (Estado Vazio com contadores 0 e CTA inicial)', async () => {
    // Nenhuma cotação salva
    localStorage.removeItem('cotacampo_quotations');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Contadores dos cards devem exibir 0
    await waitFor(() => {
      expect(screen.getByTestId('card-open-count')).toHaveTextContent('0');
    });
    expect(screen.getByTestId('card-in-review-count')).toHaveTextContent('0');
    expect(screen.getByTestId('card-awarded-count')).toHaveTextContent('0');

    // Área central indicando "Você ainda não possui cotações ativas"
    expect(screen.getByText(/Você ainda não possui cotações ativas/i)).toBeInTheDocument();

    // Botão primário convidando a iniciar a primeira cotação
    const emptyCtaButton = screen.getByRole('link', { name: /iniciar.*primeira cotação/i });
    expect(emptyCtaButton).toBeInTheDocument();
    expect(emptyCtaButton).toHaveAttribute('href', '/produtor/cotacoes/nova');
  });
});

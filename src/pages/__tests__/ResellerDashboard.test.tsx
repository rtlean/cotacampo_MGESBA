import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { ResellerProfile } from '../../types/user';
import { quotationService } from '../../services/quotation.service';
import { ResellerProposalView } from '../../types/quotation';

describe('ResellerDashboard Component - US15 (Dashboard do RTV e Funil de Fechamento)', () => {
  const mockReseller: ResellerProfile = {
    id: 'res_123',
    role: 'RESELLER',
    razaoSocial: 'AgroVila Insumos Agrícolas Ltda',
    nomeFantasia: 'AgroVila Linhares',
    cnpj: '11.222.333/0001-81',
    corporateEmail: 'contato@agrovilainsumos.com.br',
    whatsapp: '(27) 99888-7766',
    state: 'ES',
    city: 'Linhares',
    deliveryRadiusKm: 100,
    coordinates: { lat: -19.3958, lng: -40.0644 },
    categories: ['defensivos', 'fertilizantes', 'foliares'],
    createdAt: new Date().toISOString(),
  };

  const mockProposals: ResellerProposalView[] = [
    {
      bid: {
        id: 'bid-enviada-1',
        quotationId: 'quote-1',
        resellerId: mockReseller.id,
        resellerName: 'AgroVila Linhares',
        resellerCity: 'Linhares',
        resellerState: 'ES',
        items: [],
        freightCost: 250,
        deliveryDays: 3,
        totalAmount: 8750,
        status: 'SUBMITTED',
        createdAt: new Date().toISOString(),
      },
      quotation: {
        id: 'quote-1',
        displayCode: 'COT-7701',
        producerId: 'prod_1',
        producerName: 'Marcos Vinícius',
        producerPhone: '(27) 99876-1122',
        title: 'Nutrição Foliar para Café',
        status: 'OPEN',
        targetCity: 'Linhares',
        targetState: 'ES',
        deadline: new Date(Date.now() + 48 * 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      column: 'ENVIADAS',
      producerDisplayName: 'Produtor Rural (Contato protegido até o aceite)',
      producerDisplayPhone: '(27) •••••-••••',
      isContactRevealed: false,
    },
    {
      bid: {
        id: 'bid-ganha-2',
        quotationId: 'quote-2',
        resellerId: mockReseller.id,
        resellerName: 'AgroVila Linhares',
        resellerCity: 'Linhares',
        resellerState: 'ES',
        items: [],
        freightCost: 400,
        deliveryDays: 2,
        totalAmount: 13400,
        status: 'ACCEPTED',
        awardType: 'FULL',
        createdAt: new Date().toISOString(),
      },
      quotation: {
        id: 'quote-2',
        displayCode: 'COT-7702',
        producerId: 'prod_2',
        producerName: 'João Batista da Silva (Fazenda Vale do Sol)',
        producerPhone: '(27) 99811-2233',
        title: 'Adubação de Cobertura NPK',
        status: 'AWARDED',
        targetCity: 'São Mateus',
        targetState: 'ES',
        deadline: new Date(Date.now() - 24 * 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      column: 'GANHAS',
      producerDisplayName: 'João Batista da Silva (Fazenda Vale do Sol)',
      producerDisplayPhone: '(27) 99811-2233',
      isContactRevealed: true,
      whatsAppUrl: 'https://wa.me/5527998112233?text=Ol%C3%A1%20Jo%C3%A3o%20Batista',
    },
    {
      bid: {
        id: 'bid-perdida-3',
        quotationId: 'quote-3',
        resellerId: mockReseller.id,
        resellerName: 'AgroVila Linhares',
        resellerCity: 'Linhares',
        resellerState: 'ES',
        items: [],
        freightCost: 350,
        deliveryDays: 4,
        totalAmount: 9850,
        status: 'REJECTED',
        awardType: 'NONE',
        createdAt: new Date().toISOString(),
      },
      quotation: {
        id: 'quote-3',
        displayCode: 'COT-7703',
        producerId: 'prod_3',
        producerName: 'Carlos Eduardo',
        producerPhone: '(27) 99955-4433',
        title: 'Herbicidas e Adjuvantes',
        status: 'AWARDED',
        targetCity: 'Colatina',
        targetState: 'ES',
        deadline: new Date(Date.now() - 48 * 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      column: 'PERDIDAS',
      producerDisplayName: 'Produtor Rural (Contato protegido até o aceite)',
      producerDisplayPhone: '(27) •••••-••••',
      isContactRevealed: false,
      marketIntelligence: {
        winningAmount: 9357.5,
        differencePercent: 5,
        feedbackMessage: 'A proposta vencedora foi 5% mais barata que a sua.',
      },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockReseller));
    window.history.pushState({}, '', '/revenda/dashboard');
  });

  it('deve renderizar os dados da revenda: nome fantasia, CNPJ, localização e raio de entrega', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'AgroVila Linhares' })).toBeInTheDocument();
    });
    expect(screen.getByText(/11\.222\.333\/0001-81/)).toBeInTheDocument();
    expect(screen.getByText(/Linhares — ES/i)).toBeInTheDocument();
    expect(screen.getByText(/100 km/i)).toBeInTheDocument();
  });

  it('deve exibir as categorias comercializadas e mural de oportunidades na área de cobertura', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Defensivos/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Fertilizantes e Nutrição/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Nutrição Foliar/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/Mural de Cotações Disponíveis/i)).toBeInTheDocument();
  });

  it('deve exibir tela de acesso restrito se o usuário não for RESELLER', () => {
    localStorage.removeItem('cotacampo_auth_user');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByText(/Acesso Restrito à Revenda/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cadastrar Minha Revenda/i })).toHaveAttribute('href', '/cadastro');
  });

  it('deve permitir dispensar o banner de boas-vindas da revenda', async () => {
    sessionStorage.setItem('cotacampo_welcome_notice', 'true');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bem-vindo ao CotaCampo/i)).toBeInTheDocument();
    });
    const dismissBtn = screen.getByTestId('btn-dismiss-welcome-notice');
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/Bem-vindo ao CotaCampo/i)).not.toBeInTheDocument();
  });

  it('deve exibir alerta informativo ao clicar em Enviar Proposta no mural', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Enviar Proposta/i }).length).toBeGreaterThan(0);
    });

    const submitButtons = screen.getAllByRole('button', { name: /Enviar Proposta/i });
    submitButtons.forEach((btn) => fireEvent.click(btn));

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Envio de lances comerciais'));
    alertSpy.mockRestore();
  });

  // ==========================================
  // CENÁRIO 1: Visão Geral de Propostas e Status
  // ==========================================
  it('Cenário 1: deve exibir o funil estilo Kanban com as 3 colunas (Enviadas, Ganhas, Perdidas), valor total e município', async () => {
    vi.spyOn(quotationService, 'getResellerProposals').mockResolvedValue(mockProposals);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kanban-column-enviadas')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-ganhas')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-perdidas')).toBeInTheDocument();
    });

    // Coluna 1 - Enviada
    const totalEnviada = screen.getByTestId('proposal-total-bid-enviada-1');
    expect(totalEnviada).toHaveTextContent('R$ 8.750,00');
    const cityEnviada = screen.getByTestId('proposal-city-bid-enviada-1');
    expect(cityEnviada).toHaveTextContent('Linhares/ES');

    // Contato protegido na coluna Enviadas
    expect(screen.getByText('[ Contato Protegido ]')).toBeInTheDocument();
    expect(screen.getByText(/•••••-••••/)).toBeInTheDocument();

    // Coluna 2 - Ganha
    const totalGanha = screen.getByTestId('proposal-total-bid-ganha-2');
    expect(totalGanha).toHaveTextContent('R$ 13.400,00');
    const cityGanha = screen.getByTestId('proposal-city-bid-ganha-2');
    expect(cityGanha).toHaveTextContent('São Mateus/ES');

    // Coluna 3 - Perdida
    const totalPerdida = screen.getByTestId('proposal-total-bid-perdida-3');
    expect(totalPerdida).toHaveTextContent('R$ 9.850,00');
    const cityPerdida = screen.getByTestId('proposal-city-bid-perdida-3');
    expect(cityPerdida).toHaveTextContent('Colatina/ES');
  });

  // ==========================================
  // CENÁRIO 2: Proposta aceita pelo Produtor (Ganha)
  // ==========================================
  it('Cenário 2: deve revelar dados completos do produtor e botão [ Falar no WhatsApp ] quando a proposta for ganha', async () => {
    vi.spyOn(quotationService, 'getResellerProposals').mockResolvedValue(mockProposals);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('proposal-card-bid-ganha-2')).toBeInTheDocument();
    });

    // Verifica revelação do nome e telefone do produtor
    expect(screen.getByText(/João Batista da Silva \(Fazenda Vale do Sol\)/i)).toBeInTheDocument();
    expect(screen.getByText('(27) 99811-2233')).toBeInTheDocument();

    // Verifica botão Falar no WhatsApp com link correto
    const whatsappBtn = screen.getByTestId('btn-whatsapp-producer-bid-ganha-2');
    expect(whatsappBtn).toBeInTheDocument();
    expect(whatsappBtn).toHaveAttribute('href', expect.stringContaining('https://wa.me/5527998112233'));
    expect(whatsappBtn).toHaveTextContent('[ Falar no WhatsApp ]');

    // Verifica banner de notificação de negócio fechado
    expect(screen.getByTestId('deal-closed-banner')).toBeInTheDocument();
    expect(screen.getByText(/Parabéns! Negócio Fechado no CotaCampo!/i)).toBeInTheDocument();

    // Pode dispensar o banner de negócio fechado
    const dismissDealBtn = screen.getByTestId('btn-dismiss-deal-notice');
    fireEvent.click(dismissDealBtn);
    expect(screen.queryByTestId('deal-closed-banner')).not.toBeInTheDocument();
  });

  // ==========================================
  // CENÁRIO 3: Proposta perdida e inteligência de mercado
  // ==========================================
  it('Cenário 3: deve exibir aviso de proposta não selecionada e feedback anônimo de calibragem de preço', async () => {
    vi.spyOn(quotationService, 'getResellerProposals').mockResolvedValue(mockProposals);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('proposal-card-bid-perdida-3')).toBeInTheDocument();
    });

    // Aviso obrigatório do Cenário 3
    expect(screen.getByText('Cotação finalizada. Sua proposta não foi selecionada.')).toBeInTheDocument();

    // Feedback anônimo de inteligência de mercado
    const feedbackBox = screen.getByTestId('market-feedback-bid-perdida-3');
    expect(feedbackBox).toBeInTheDocument();
    expect(feedbackBox).toHaveTextContent('A proposta vencedora foi 5% mais barata que a sua.');
  });

  // ==========================================
  // Testes de Responsividade e Casos Extremos
  // ==========================================
  it('deve permitir alternar entre as abas em telas mobile', async () => {
    vi.spyOn(quotationService, 'getResellerProposals').mockResolvedValue(mockProposals);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enviadas \(1\)/i })).toBeInTheDocument();
    });

    const btnGanhasTab = screen.getByRole('button', { name: /Ganhas \(1\)/i });
    const btnPerdidasTab = screen.getByRole('button', { name: /Perdidas \(1\)/i });

    fireEvent.click(btnGanhasTab);
    expect(screen.getByTestId('kanban-column-ganhas')).not.toHaveClass('hidden');

    fireEvent.click(btnPerdidasTab);
    expect(screen.getByTestId('kanban-column-perdidas')).not.toHaveClass('hidden');

    const btnEnviadasTab = screen.getByRole('button', { name: /Enviadas \(1\)/i });
    fireEvent.click(btnEnviadasTab);
    expect(screen.getByTestId('kanban-column-enviadas')).not.toHaveClass('hidden');
  });

  it('deve exibir mensagem de estado vazio amigável quando não houver propostas em uma coluna', async () => {
    const onlyEnviadaProposals: ResellerProposalView[] = [mockProposals[0]];
    vi.spyOn(quotationService, 'getResellerProposals').mockResolvedValue(onlyEnviadaProposals);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma proposta ganha ainda/i)).toBeInTheDocument();
      expect(screen.getByText(/Nenhuma proposta perdida registrada/i)).toBeInTheDocument();
    });
  });

  it('deve lidar graciosamente com erro de carregamento no serviço de propostas', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(quotationService, 'getResellerProposals').mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao carregar propostas'), expect.any(Error));
    });
    errorSpy.mockRestore();
  });
});

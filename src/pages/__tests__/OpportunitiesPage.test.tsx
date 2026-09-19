import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpportunitiesPage } from '../OpportunitiesPage';
import { AuthProvider } from '../../context/AuthContext';
import { ResellerProfile, ProducerProfile } from '../../types/user';
import { QuotationRequest } from '../../types/quotation';
import { opportunitiesService } from '../../services/opportunities.service';

describe('US13 – Mural de Oportunidades (Feed de Cotações)', () => {
  const mockResellerLinhares: ResellerProfile = {
    id: 'reseller-linhares-1',
    role: 'RESELLER',
    razaoSocial: 'Comercial Agrícola Rio Doce LTDA',
    nomeFantasia: 'Agro Rio Doce',
    cnpj: '01.234.567/0001-89',
    corporateEmail: 'vendas@agroriodoce.com.br',
    whatsapp: '(27) 99777-2222',
    state: 'ES',
    city: 'Linhares',
    deliveryRadiusKm: 100, // Raio de entrega de 100 km a partir de Linhares/ES
    coordinates: { lat: -19.3958, lng: -40.0644 },
    categories: ['defensivos', 'fertilizantes', 'foliares'],
    createdAt: new Date().toISOString(),
  };

  const mockProducer: ProducerProfile = {
    id: 'prod-123',
    role: 'PRODUCER',
    name: 'Carlos Fazendeiro',
    email: 'carlos@fazenda.com.br',
    whatsapp: '(27) 99888-3333',
    farmName: 'Fazenda Esperança',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe_conilon'],
    createdAt: new Date().toISOString(),
  };

  const getFutureDateIso = (hoursFromNow: number) =>
    new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString();

  // Cotações de teste
  const mockQuotationLinhares: QuotationRequest = {
    id: 'q-linhares-1',
    producerId: 'prod-1',
    title: 'Adubos e Nutrição para Café Conilon',
    status: 'OPEN',
    targetCity: 'Linhares',
    targetState: 'ES',
    deadline: getFutureDateIso(48), // 48h
    itemsCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockQuotationSaoMateus: QuotationRequest = {
    id: 'q-saomateus-1',
    producerId: 'prod-2',
    title: 'Defensivos para Mamão Tropical',
    status: 'OPEN',
    targetCity: 'São Mateus', // ~78 km de Linhares (dentro de 100 km)
    targetState: 'ES',
    deadline: getFutureDateIso(16), // 16h (urgente < 24h)
    itemsCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockQuotationColatina: QuotationRequest = {
    id: 'q-colatina-1',
    producerId: 'prod-3',
    title: 'Foliar para Pimenta-do-reino',
    status: 'OPEN',
    targetCity: 'Colatina', // ~62 km de Linhares (dentro de 100 km)
    targetState: 'ES',
    deadline: getFutureDateIso(36), // 36h
    itemsCount: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockQuotationManhuacu: QuotationRequest = {
    id: 'q-manhuacu-1',
    producerId: 'prod-4',
    title: 'Adubo NPK para Café Arábica',
    status: 'OPEN',
    targetCity: 'Manhuaçu', // > 200 km (fora de 100 km)
    targetState: 'MG',
    deadline: getFutureDateIso(20),
    itemsCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockQuotationClosed: QuotationRequest = {
    id: 'q-closed-1',
    producerId: 'prod-5',
    title: 'Cotação em Análise',
    status: 'IN_REVIEW', // Não é OPEN
    targetCity: 'Linhares',
    targetState: 'ES',
    deadline: getFutureDateIso(24),
    itemsCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cenário 1: Listagem de cotações dentro do raio logístico', () => {
    it('deve carregar a tela e exibir apenas cards de produtores dentro do raio de 100 km a partir de Linhares/ES com dados obrigatórios', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockResellerLinhares));
      localStorage.setItem(
        'cotacampo_quotations',
        JSON.stringify([
          mockQuotationLinhares,
          mockQuotationSaoMateus,
          mockQuotationColatina,
          mockQuotationManhuacu,
          mockQuotationClosed,
        ])
      );

      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      // Verifica cabeçalho e badge de raio logístico
      await waitFor(() => {
        expect(screen.getByTestId('logistics-radius-badge')).toBeInTheDocument();
      });
      expect(screen.getByText(/100 km a partir de Linhares\/ES/i)).toBeInTheDocument();

      // Cotações dentro do raio: Linhares, São Mateus e Colatina
      await waitFor(() => {
        expect(screen.getByTestId(`opportunity-card-${mockQuotationLinhares.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`opportunity-card-${mockQuotationSaoMateus.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`opportunity-card-${mockQuotationColatina.id}`)).toBeInTheDocument();
      });

      // Cotação fora do raio (> 200 km) ou com status diferente de OPEN não devem aparecer
      expect(screen.queryByTestId(`opportunity-card-${mockQuotationManhuacu.id}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`opportunity-card-${mockQuotationClosed.id}`)).not.toBeInTheDocument();

      // Verifica exibição de cada campo obrigatório no card de Linhares
      const cardLinhares = screen.getByTestId(`opportunity-card-${mockQuotationLinhares.id}`);
      expect(cardLinhares).toHaveTextContent('Linhares/ES'); // Município
      expect(cardLinhares).toHaveTextContent('Café Conilon'); // Cultura
      expect(cardLinhares).toHaveTextContent('0 km (Mesmo município)'); // Distância Estimada
      expect(cardLinhares).toHaveTextContent('3 itens'); // Quantidade de Itens
      expect(cardLinhares).toHaveTextContent(/Expira em/i); // Tempo Restante

      // Verifica campos obrigatórios no card de São Mateus (~78 km de Linhares)
      const cardSaoMateus = screen.getByTestId(`opportunity-card-${mockQuotationSaoMateus.id}`);
      expect(cardSaoMateus).toHaveTextContent('São Mateus/ES');
      expect(cardSaoMateus).toHaveTextContent('Mamão');
      expect(cardSaoMateus).toHaveTextContent(/7\d km|8\d km/); // Distância Estimada
      expect(cardSaoMateus).toHaveTextContent('2 itens');
      expect(cardSaoMateus).toHaveTextContent(/Expira em 1[56]h/);

      // Clica em enviar proposta
      const proposeBtn = screen.getByTestId(`btn-propose-${mockQuotationLinhares.id}`);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      fireEvent.click(proposeBtn);
      expect(alertSpy).toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('deve lidar com erro de serviço sem quebrar a tela', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockResellerLinhares));
      const spy = vi.spyOn(opportunitiesService, 'getOpportunitiesForReseller').mockRejectedValue(
        new Error('Erro de conexão com a API')
      );

      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('empty-opportunities-container')).toBeInTheDocument();
      });

      spy.mockRestore();
    });
  });

  describe('Cenário 2: Filtros de funil de vendas e busca', () => {
    beforeEach(() => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockResellerLinhares));
      localStorage.setItem(
        'cotacampo_quotations',
        JSON.stringify([
          mockQuotationLinhares, // Linhares, Café Conilon, 48h
          mockQuotationSaoMateus, // São Mateus, Mamão, 16h (urgente)
          mockQuotationColatina, // Colatina, Pimenta-do-reino, 36h
        ])
      );
    });

    it('deve filtrar instantaneamente por Município Específico', async () => {
      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('filter-municipality')).toBeInTheDocument();
      });

      // Seleciona "São Mateus"
      fireEvent.change(screen.getByTestId('filter-municipality'), {
        target: { value: 'São Mateus' },
      });

      // Deve exibir apenas São Mateus
      expect(screen.getByTestId(`opportunity-card-${mockQuotationSaoMateus.id}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`opportunity-card-${mockQuotationLinhares.id}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`opportunity-card-${mockQuotationColatina.id}`)).not.toBeInTheDocument();

      // Limpa os filtros
      fireEvent.click(screen.getByTestId('btn-reset-filters'));
      expect(screen.getByTestId(`opportunity-card-${mockQuotationLinhares.id}`)).toBeInTheDocument();
    });

    it('deve filtrar instantaneamente por Cultura Agrícola', async () => {
      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('filter-crop')).toBeInTheDocument();
      });

      // Filtra por cultura "Mamão"
      fireEvent.change(screen.getByTestId('filter-crop'), {
        target: { value: 'mamao' },
      });

      expect(screen.getByTestId(`opportunity-card-${mockQuotationSaoMateus.id}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`opportunity-card-${mockQuotationLinhares.id}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`opportunity-card-${mockQuotationColatina.id}`)).not.toBeInTheDocument();
    });

    it('deve filtrar instantaneamente por Prazo Expirando (menos de 24h)', async () => {
      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('filter-expiring')).toBeInTheDocument();
      });

      // Marca o checkbox de menos de 24h
      fireEvent.click(screen.getByTestId('filter-expiring'));

      // Apenas São Mateus tem deadline em 16h (< 24h)
      expect(screen.getByTestId(`opportunity-card-${mockQuotationSaoMateus.id}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`opportunity-card-${mockQuotationLinhares.id}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`opportunity-card-${mockQuotationColatina.id}`)).not.toBeInTheDocument();
    });
  });

  describe('Cenário 3: Ausência de oportunidades locais (Estado Vazio)', () => {
    it('deve exibir mensagem oficial de estado vazio e botão para gerar convite via WhatsApp', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockResellerLinhares));
      // Nenhuma cotação no raio (apenas cotação distante em Manhuaçu)
      localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuotationManhuacu]));

      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      // Deve exibir o container do estado vazio
      await waitFor(() => {
        expect(screen.getByTestId('empty-opportunities-container')).toBeInTheDocument();
      });

      // Mensagem oficial exigida no critério de aceitação
      expect(
        screen.getByText(
          'Nenhuma cotação nova na sua região. Que tal convidar produtores parceiros para o CotaCampo?'
        )
      ).toBeInTheDocument();

      // Botão com link do WhatsApp
      const whatsappBtn = screen.getByTestId('btn-whatsapp-invite');
      expect(whatsappBtn).toBeInTheDocument();
      expect(whatsappBtn).toHaveAttribute('href');
      expect(whatsappBtn.getAttribute('href')).toContain('https://wa.me/?text=');
      expect(whatsappBtn.getAttribute('href')).toContain('Agro%20Rio%20Doce');

      // Botão de copiar link de convite
      const copyBtn = screen.getByTestId('btn-copy-invite');
      expect(copyBtn).toBeInTheDocument();

      // Mock de clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      fireEvent.click(copyBtn);
      await waitFor(() => {
        expect(screen.getByText('Link copiado!')).toBeInTheDocument();
      });
    });
  });

  describe('Permissões, Autenticação e Segurança', () => {
    it('deve bloquear acesso para usuário não autenticado', () => {
      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      expect(screen.getByText('Acesso Restrito a Revendas')).toBeInTheDocument();
      expect(screen.queryByTestId('logistics-radius-badge')).not.toBeInTheDocument();
    });

    it('deve bloquear acesso para usuário do perfil PRODUTOR', () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      expect(screen.getByText('Acesso Restrito a Revendas')).toBeInTheDocument();
      expect(screen.queryByTestId('logistics-radius-badge')).not.toBeInTheDocument();
    });
  });

  describe('Responsividade e Layout (Mobile, Tablet, Desktop)', () => {
    beforeEach(() => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockResellerLinhares));
      localStorage.setItem('cotacampo_quotations', JSON.stringify([mockQuotationLinhares]));
    });

    it('deve renderizar perfeitamente no Mobile (375x667)', async () => {
      window.innerWidth = 375;
      window.innerHeight = 667;
      window.dispatchEvent(new Event('resize'));

      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId(`opportunity-card-${mockQuotationLinhares.id}`)).toBeInTheDocument();
      });
      expect(screen.getByTestId('logistics-radius-badge')).toBeInTheDocument();
    });

    it('deve renderizar perfeitamente no Tablet (768x1024)', async () => {
      window.innerWidth = 768;
      window.innerHeight = 1024;
      window.dispatchEvent(new Event('resize'));

      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId(`opportunity-card-${mockQuotationLinhares.id}`)).toBeInTheDocument();
      });
    });

    it('deve renderizar perfeitamente no Desktop (1280x800)', async () => {
      window.innerWidth = 1280;
      window.innerHeight = 800;
      window.dispatchEvent(new Event('resize'));

      render(
        <AuthProvider>
          <OpportunitiesPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId(`opportunity-card-${mockQuotationLinhares.id}`)).toBeInTheDocument();
      });
    });
  });
});

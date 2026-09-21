import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NewQuotationPage } from '../NewQuotationPage';
import { AuthProvider } from '../../context/AuthContext';
import { ProducerProfile } from '../../types/user';
import { packageService } from '../../services/package.service';
import { copilotService } from '../../server/services/copilot.service';
import { supabase } from '../../services/supabase';

describe('US18 – Recompra em 1-Clique usando Pacote Tecnológico (NewQuotationPage)', () => {
  const mockProducer: ProducerProfile = {
    id: 'prod-777',
    role: 'PRODUCER',
    name: 'Carlos Fazendeiro',
    email: 'carlos@fazenda.com.br',
    whatsapp: '(27) 99999-7777',
    farmName: 'Fazenda Rio Doce',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe'],
    createdAt: new Date().toISOString(),
  };

  const mockPackage = {
    id: 'pkg-pos-colheita',
    producerId: 'prod-777',
    name: 'Adubação Pós-Colheita - Conilon',
    cropType: 'Café Conilon',
    itemsCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: 'item-npk-1',
        packageId: 'pkg-pos-colheita',
        productName: 'Adubo NPK 20-05-20',
        quantity: 90,
        unit: 'Sc',
        acceptsGeneric: true,
      },
      {
        id: 'item-foliar-2',
        packageId: 'pkg-pos-colheita',
        productName: 'Foliar Zinco + Boro',
        quantity: 30,
        unit: 'L',
        acceptsGeneric: false,
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as ReturnType<typeof supabase.from>);

    vi.spyOn(packageService, 'getPackageById').mockResolvedValue(mockPackage);
  });

  afterEach(() => {
    window.history.pushState({}, '', '/produtor/cotacoes/nova');
  });

  it('Cenário 1: Ao iniciar cotação com packageId, inicia no Passo 1 com cultura pré-selecionada, pré-carrega itens no Passo 2 e permite edição livre', async () => {
    window.history.pushState({}, '', '/produtor/cotacoes/nova?packageId=pkg-pos-colheita');
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    // Deve iniciar diretamente no Passo 1
    expect(screen.getByRole('heading', { level: 1, name: /Passo 1 – Destino e Cultura/i })).toBeInTheDocument();

    // Banner informativo no Passo 1
    await waitFor(() => {
      expect(screen.getByTestId('loaded-package-banner-step1')).toBeInTheDocument();
      expect(screen.getByText(/Adubação Pós-Colheita - Conilon/i)).toBeInTheDocument();
    });

    // Cultura Café Conilon deve estar pré-selecionada
    const conilonRadio = screen.getByRole('radio', { name: /Café Conilon/i });
    expect(conilonRadio).toHaveAttribute('aria-checked', 'true');

    // Preenche fazenda e avança para o Passo 2
    const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
    fireEvent.change(farmSelect, { target: { value: 'farm_primary' } });

    const nextButton = screen.getByRole('button', { name: /Avançar para Itens/i });
    fireEvent.click(nextButton);

    // No Passo 2, a tabela deve vir 100% preenchida com os 2 itens do pacote
    expect(screen.getByRole('heading', { level: 1, name: /Passo 2: Itens, Genéricos e Receituário/i })).toBeInTheDocument();
    expect(screen.getByText('Adubo NPK 20-05-20')).toBeInTheDocument();
    expect(screen.getByText('90 Sc')).toBeInTheDocument();
    expect(screen.getByText('Foliar Zinco + Boro')).toBeInTheDocument();
    expect(screen.getByText('30 L')).toBeInTheDocument();
    expect(screen.getByText('Tabela de Itens da Demanda (2)')).toBeInTheDocument();

    // Permite remover item livremente
    const removeBtn = screen.getByLabelText(/Excluir Foliar Zinco \+ Boro/i);
    fireEvent.click(removeBtn);

    expect(screen.queryByText('Foliar Zinco + Boro')).not.toBeInTheDocument();
    expect(screen.getByText('Tabela de Itens da Demanda (1)')).toBeInTheDocument();

    // Permite adicionar novo item livremente
    const searchInput = screen.getByPlaceholderText(/Ex: Mancozeb 750 WG.../i);
    fireEvent.change(searchInput, { target: { value: 'Mancozeb 750 WG' } });

    const qtyInput = screen.getByPlaceholderText(/Ex: 50/i);
    fireEvent.change(qtyInput, { target: { value: '10' } });

    const unitSelect = screen.getByLabelText(/Unidade \*/i);
    fireEvent.change(unitSelect, { target: { value: 'Kg' } });

    const addItemButton = screen.getByRole('button', { name: /Adicionar Item/i });
    fireEvent.click(addItemButton);

    // Tabela agora possui 2 itens novamente (NPK original + Mancozeb adicionado)
    expect(screen.getByText('Mancozeb 750 WG')).toBeInTheDocument();
    expect(screen.getByText('10 Kg')).toBeInTheDocument();
    expect(screen.getByText('Tabela de Itens da Demanda (2)')).toBeInTheDocument();
  });

  it('Cenário 2: Ajuste de volume de pacote com IA ao aumentar a área plantada no Passo 1', async () => {
    // Espia cálculo do copiloto IA
    vi.spyOn(copilotService, 'calculateDosage').mockResolvedValue({
      recommendedQuantity: 150,
      unit: 'Sacas',
      dosagePerHectare: '6 Sc/ha',
      justification: 'Dose recomendada de 6 Sc/ha para 25 ha na adubação de cobertura (ES).',
      isLmrRestricted: false,
    });

    window.history.pushState({}, '', '/produtor/cotacoes/nova?packageId=pkg-pos-colheita');
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    // Passo 1: Aguarda carregar o pacote
    await waitFor(() => {
      expect(screen.getByTestId('loaded-package-banner-step1')).toBeInTheDocument();
    });

    // Informa fazenda e ajusta a área plantada de 15 para 25 hectares
    const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
    fireEvent.change(farmSelect, { target: { value: 'farm_primary' } });

    const areaInput = screen.getByTestId('input-step1-area');
    expect(areaInput).toBeInTheDocument();
    fireEvent.change(areaInput, { target: { value: '25' } });

    // Avança para o Passo 2
    const nextButton = screen.getByRole('button', { name: /Avançar para Itens/i });
    fireEvent.click(nextButton);

    expect(screen.getByRole('heading', { level: 1, name: /Passo 2: Itens, Genéricos e Receituário/i })).toBeInTheDocument();
    expect(screen.getByText('Adubo NPK 20-05-20')).toBeInTheDocument();
    expect(screen.getByText('90 Sc')).toBeInTheDocument();
    expect(screen.getByText('30 L')).toBeInTheDocument();

    // Clica no botão de recálculo com IA para o Adubo NPK
    const recalculateBtn = screen.getByLabelText(/Calcular Dosagem com IA para Adubo NPK 20-05-20/i);
    expect(recalculateBtn).toBeInTheDocument();
    fireEvent.click(recalculateBtn);

    // A IA deve ser chamada com a nova área (25 ha)
    await waitFor(() => {
      expect(copilotService.calculateDosage).toHaveBeenCalledWith(
        expect.objectContaining({
          areaHectares: 25,
          productOrActiveIngredient: 'Adubo NPK 20-05-20',
        })
      );
    });

    // A quantidade do Adubo NPK deve ser atualizada para 150 Sc
    await waitFor(() => {
      expect(screen.getByText('150 Sc')).toBeInTheDocument();
    });

    // O outro item da lista permanece inalterado com seus 30 L
    expect(screen.getByText('Foliar Zinco + Boro')).toBeInTheDocument();
    expect(screen.getByText('30 L')).toBeInTheDocument();

    // Toast de sucesso do cálculo com IA deve estar presente
    expect(screen.getByTestId('item-ai-toast')).toBeInTheDocument();
    expect(screen.getByText(/Dose recalculada com IA para "Adubo NPK 20-05-20": 150 Sc \(25 ha\)/i)).toBeInTheDocument();
  });
});

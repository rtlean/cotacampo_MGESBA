import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NewQuotationPage } from '../NewQuotationPage';
import { AuthProvider } from '../../context/AuthContext';
import { ProducerProfile } from '../../types/user';
import { packageService } from '../../services/package.service';
import { supabase } from '../../services/supabase';

describe('US17 – Salvar Cotação como Pacote Tecnológico no Wizard e Recompra 1-Clique', () => {
  const mockProducer: ProducerProfile = {
    id: 'prod-123',
    role: 'PRODUCER',
    name: 'Marcos Silva',
    email: 'marcos@fazenda.com.br',
    whatsapp: '(27) 99999-8888',
    farmName: 'Fazenda Boa Esperança',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe'],
    createdAt: new Date().toISOString(),
  };

  const advanceToStep2 = () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));
    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );
    const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
    fireEvent.change(farmSelect, { target: { value: 'farm_primary' } });
    const conilonButton = screen.getByRole('radio', { name: /Café Conilon/i });
    fireEvent.click(conilonButton);
    const nextButton = screen.getByRole('button', { name: /Avançar para Itens/i });
    fireEvent.click(nextButton);
  };

  const addItem = (name: string, qty: string, unit: string = 'Kg') => {
    const searchInput = screen.getByPlaceholderText(/Ex: Mancozeb 750 WG.../i);
    fireEvent.change(searchInput, { target: { value: name } });

    const qtyInput = screen.getByPlaceholderText(/Ex: 50/i);
    fireEvent.change(qtyInput, { target: { value: qty } });

    const unitSelect = screen.getByLabelText(/Unidade \*/i);
    fireEvent.change(unitSelect, { target: { value: unit } });

    const addItemButton = screen.getByRole('button', { name: /Adicionar Item/i });
    fireEvent.click(addItemButton);
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
  });

  afterEach(() => {
    window.history.pushState({}, '', '/produtor/cotacoes/nova');
  });

  it('Cenário 2: No Passo 2 com 3 ou mais itens, exibe botão [ Salvar Lista ] e permite salvar pacote sem interromper cotação', async () => {
    vi.spyOn(packageService, 'createPackageFromQuote').mockResolvedValue({
      id: 'pkg-wizard-1',
      producerId: 'prod-123',
      name: 'Manejo Nutricional Florada',
      cropType: 'cafe_conilon',
      itemsCount: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        { id: '1', packageId: 'pkg-wizard-1', productName: 'Mancozeb 750 WG', quantity: 10, unit: 'Kg', acceptsGeneric: true },
        { id: '2', packageId: 'pkg-wizard-1', productName: 'Adubo NPK 20-05-20', quantity: 20, unit: 'Sc', acceptsGeneric: false },
        { id: '3', packageId: 'pkg-wizard-1', productName: 'Fungicida Cobrex', quantity: 30, unit: 'L', acceptsGeneric: true },
      ],
    });

    advanceToStep2();

    expect(screen.getByRole('heading', { level: 1, name: /Passo 2: Itens, Genéricos e Receituário/i })).toBeInTheDocument();

    // Adiciona 3 itens
    addItem('Mancozeb 750 WG', '10', 'Kg');
    addItem('Adubo NPK 20-05-20', '20', 'Sc');
    addItem('Fungicida Cobrex', '30', 'L');

    expect(screen.getByText('Tabela de Itens da Demanda (3)')).toBeInTheDocument();

    // O botão Salvar Lista deve estar visível e habilitado
    const saveListBtn = screen.getByTestId('btn-save-list-as-package');
    expect(saveListBtn).toBeInTheDocument();
    expect(saveListBtn).not.toBeDisabled();

    // Clica no botão para abrir o modal
    fireEvent.click(saveListBtn);

    // Modal deve abrir
    expect(screen.getByRole('heading', { name: /Salvar como Pacote Tecnológico/i })).toBeInTheDocument();

    // Digita nome do pacote
    const inputName = screen.getByLabelText(/Nome do Pacote/i);
    fireEvent.change(inputName, { target: { value: 'Manejo Nutricional Florada' } });

    // Salva o pacote
    const submitBtn = screen.getByTestId('btn-submit-save-package');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(packageService.createPackageFromQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          producerId: 'prod-123',
          name: 'Manejo Nutricional Florada',
        })
      );
    });

    // O fluxo do Wizard NÃO é interrompido: continuamos no Passo 2 e os itens continuam na lista
    expect(screen.getByRole('heading', { level: 1, name: /Passo 2: Itens, Genéricos e Receituário/i })).toBeInTheDocument();
    expect(screen.getByText('Mancozeb 750 WG')).toBeInTheDocument();
    expect(screen.getByText('Adubo NPK 20-05-20')).toBeInTheDocument();
    expect(screen.getByText('Fungicida Cobrex')).toBeInTheDocument();
  });

  it('Cenário 2: Se houver menos de 3 itens, o botão [ Salvar Lista ] não é exibido', async () => {
    advanceToStep2();

    addItem('Mancozeb 750 WG', '10', 'Kg');
    addItem('Fungicida Cobrex', '20', 'L');

    expect(screen.getByText('Tabela de Itens da Demanda (2)')).toBeInTheDocument();

    // Com menos de 3 itens, o botão não deve existir na tela
    expect(screen.queryByTestId('btn-save-list-as-package')).not.toBeInTheDocument();
  });

  it('Recompra 1-Clique: Ao carregar com ?packageId=pkg_cafe_florada, injeta itens e abre o Passo 2 diretamente', async () => {
    const mockPackage = {
      id: 'pkg_cafe_florada',
      producerId: 'prod-123',
      name: 'Adubação de Florada Café Conilon',
      cropType: 'Café Conilon',
      itemsCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: 'it-1',
          packageId: 'pkg_cafe_florada',
          productName: 'Adubo Foliar Boro + Zinco',
          quantity: 40,
          unit: 'L',
          acceptsGeneric: true,
        },
        {
          id: 'it-2',
          packageId: 'pkg_cafe_florada',
          productName: 'Nitrato de Cálcio',
          quantity: 500,
          unit: 'Kg',
          acceptsGeneric: false,
        },
      ],
    };

    vi.spyOn(packageService, 'getPackageById').mockResolvedValue(mockPackage);

    window.history.pushState({}, '', '/produtor/cotacoes/nova?packageId=pkg_cafe_florada&step=2');
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    // Banner informativo de recompra em 1-clique deve aparecer
    await waitFor(() => {
      expect(screen.getByTestId('loaded-package-banner')).toBeInTheDocument();
      expect(screen.getByText(/Adubação de Florada Café Conilon/i)).toBeInTheDocument();
    });

    // O Passo 2 deve estar ativo diretamente com os itens carregados
    expect(screen.getByRole('heading', { level: 1, name: /Passo 2: Itens, Genéricos e Receituário/i })).toBeInTheDocument();
    expect(screen.getByText('Adubo Foliar Boro + Zinco')).toBeInTheDocument();
    expect(screen.getByText('Nitrato de Cálcio')).toBeInTheDocument();
    expect(screen.getByText('Tabela de Itens da Demanda (2)')).toBeInTheDocument();
  });
});

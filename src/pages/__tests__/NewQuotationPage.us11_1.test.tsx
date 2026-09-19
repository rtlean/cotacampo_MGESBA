import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NewQuotationPage } from '../NewQuotationPage';
import { AuthProvider } from '../../context/AuthContext';
import { ProducerProfile } from '../../types/user';
import { copilotService } from '../../server/services/copilot.service';
import { supabase } from '../../services/supabase';

describe('US11.1 – Testes de Componente do Copiloto IA e Restrições Fitossanitárias', () => {
  const mockProducerWithDimensions: ProducerProfile = {
    id: 'prod-conilon-123',
    role: 'PRODUCER',
    name: 'José Ribeiro',
    email: 'jose@fazenda.com.br',
    whatsapp: '(27) 99999-7777',
    farmName: 'Fazenda Conilon Dourado',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe_conilon', 'mamao', 'pimenta_reino'],
    cropDimensions: {
      cafe_conilon: { area: '15', plantsCount: '3000' },
      mamao: { area: '5', plantsCount: '1500' },
      pimenta_reino: { area: '8', plantsCount: '2000' },
    },
    createdAt: new Date().toISOString(),
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

  it('deve exibir o botão de calcular com IA no container e o botão inline na linha da quantidade', async () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    // Passo 1 -> Passo 2
    fireEvent.change(screen.getByLabelText(/Propriedade Rural de Destino/i), {
      target: { value: 'farm_primary' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Café Conilon/i }));
    fireEvent.click(screen.getByRole('button', { name: /Avançar para Itens/i }));

    await waitFor(() => {
      expect(screen.getByTestId('ai-copilot-container')).toBeInTheDocument();
    });

    expect(screen.getByTestId('btn-ai-calculate-dose')).toBeInTheDocument();
    expect(screen.getByTestId('btn-ai-calc-inline')).toBeInTheDocument();
  });

  it('deve disparar copilotService.calculateDosage com sucesso e renderizar ai-copilot-result-card', async () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

    const spyCalculate = vi.spyOn(copilotService, 'calculateDosage').mockResolvedValue({
      recommendedQuantity: 45,
      unit: 'Litros',
      dosagePerHectare: '3.0 L/ha',
      justification: 'Dose calculada pelo Copiloto IA para ferrugem do cafeeiro em clima de Linhares/ES.',
      isLmrRestricted: false,
    });

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Propriedade Rural de Destino/i), {
      target: { value: 'farm_primary' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Café Conilon/i }));
    fireEvent.click(screen.getByRole('button', { name: /Avançar para Itens/i }));

    await waitFor(() => {
      expect(screen.getByTestId('ai-copilot-container')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Produto ou Princípio Ativo/i), {
      target: { value: 'Azoxistrobina 250 SC' },
    });

    // Clica no botão inline
    fireEvent.click(screen.getByTestId('btn-ai-calc-inline'));

    await waitFor(() => {
      expect(spyCalculate).toHaveBeenCalledWith({
        cropType: 'cafe_conilon',
        areaHectares: 15,
        plantCount: 3000,
        productOrActiveIngredient: 'Azoxistrobina 250 SC',
        state: 'ES',
      });
    });

    // Verifica card de resultado
    await waitFor(() => {
      const resultCard = screen.getByTestId('ai-copilot-result-card');
      expect(resultCard).toBeInTheDocument();
      expect(resultCard).toHaveTextContent('Dosagem Recomendada: 3.0 L/ha');
      expect(resultCard).toHaveTextContent('45 Litros');
      expect(resultCard).toHaveTextContent('Dose calculada pelo Copiloto IA para ferrugem do cafeeiro');
    });

    // Verifica que preencheu os campos do formulário
    expect(screen.getByLabelText(/Quantidade/i)).toHaveValue(45);
    expect(screen.getByLabelText(/Unidade/i)).toHaveValue('L');
  });

  it('deve exibir restrição fitossanitária de LMR para Mamão com chips de alternativas e recalcular ao clicar em chip', async () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

    const spyCalculate = vi.spyOn(copilotService, 'calculateDosage').mockResolvedValue({
      recommendedQuantity: 10,
      unit: 'Litros',
      dosagePerHectare: '2.0 L/ha',
      justification: 'Atenção: produto restrito para exportação.',
      isLmrRestricted: true,
      warningMessage: 'Atenção: Clorpirifós possui LMR restrito para exportação de Mamão (UE/EUA).',
      suggestedAlternatives: ['Óleo de Neem 1%', 'Bacillus thuringiensis', 'Azadiractina'],
    });

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Propriedade Rural de Destino/i), {
      target: { value: 'farm_primary' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Mamão/i }));
    fireEvent.click(screen.getByRole('button', { name: /Avançar para Itens/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passo 2: Inclusão de Insumos para Mamão/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Produto ou Princípio Ativo/i), {
      target: { value: 'Clorpirifós 480 EC' },
    });

    fireEvent.click(screen.getByTestId('btn-ai-calculate-dose'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-restriction-card')).toBeInTheDocument();
      expect(screen.getByTestId('chip-alt-oleo-de-neem-1')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Atenção: Clorpirifós possui LMR restrito para exportação de Mamão/i)
    ).toBeInTheDocument();

    const chipNeem = screen.getByTestId('chip-alt-oleo-de-neem-1');
    const chipBacillus = screen.getByTestId('chip-alt-bacillus-thuringiensis');
    expect(chipNeem).toBeInTheDocument();
    expect(chipBacillus).toBeInTheDocument();

    // Prepara resposta do recalculo com a alternativa segura
    spyCalculate.mockResolvedValueOnce({
      recommendedQuantity: 15,
      unit: 'Litros',
      dosagePerHectare: '3.0 L/ha',
      justification: 'Alternativa biológica aprovada para Mamão com carência zero.',
      isLmrRestricted: false,
    });

    // Clica no chip da alternativa biológica
    fireEvent.click(chipNeem);

    await waitFor(() => {
      expect(screen.getByLabelText(/Produto ou Princípio Ativo/i)).toHaveValue('Óleo de Neem 1%');
    });

    // Card de restrição deve fechar
    expect(screen.queryByTestId('ai-restriction-card')).not.toBeInTheDocument();
  });

  it('deve usar fallback determinístico sem quebrar a UI quando copilotService rejeitar chamada', async () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

    vi.spyOn(copilotService, 'calculateDosage').mockRejectedValue(
      new Error('Erro de conexão com o servidor tRPC')
    );

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Propriedade Rural de Destino/i), {
      target: { value: 'farm_primary' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Café Conilon/i }));
    fireEvent.click(screen.getByRole('button', { name: /Avançar para Itens/i }));

    await waitFor(() => {
      expect(screen.getByTestId('ai-copilot-container')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Produto ou Princípio Ativo/i), {
      target: { value: 'Azoxistrobina 250 SC' },
    });

    fireEvent.click(screen.getByTestId('btn-ai-calculate-dose'));

    // Deve preencher com o cálculo do fallback
    await waitFor(() => {
      expect(screen.getByLabelText(/Quantidade/i)).toHaveValue(45);
      expect(screen.getByLabelText(/Unidade/i)).toHaveValue('L');
      expect(screen.getByTestId('ai-dose-explanation')).toBeInTheDocument();
    });
  });
});

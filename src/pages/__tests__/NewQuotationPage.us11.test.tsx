import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NewQuotationPage } from '../NewQuotationPage';
import { AuthProvider } from '../../context/AuthContext';
import { ProducerProfile } from '../../types/user';
import { quotationService } from '../../services/quotation.service';
import { supabase } from '../../services/supabase';

describe('US11 – Assistente IA de Dimensionamento e Recomendação no Wizard', () => {
  const mockProducerWithDimensions: ProducerProfile = {
    id: 'prod-conilon-123',
    role: 'PRODUCER',
    name: 'José Ribeiro',
    email: 'jose@fazenda.com.br',
    whatsapp: '(27) 99999-7777',
    farmName: 'Fazenda Conilon Dourado',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe_conilon', 'mamao'],
    cropDimensions: {
      cafe_conilon: { area: '15', plantsCount: '3000' },
      mamao: { area: '5', plantsCount: '1500' },
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

  describe('Cenário 1: Cálculo automático de volume por área e cultura', () => {
    it('deve calcular dosagem automática para defensivo líquido em Café Conilon (15 ha -> 45 Litros) com resumo explicativo', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

      render(
        <AuthProvider>
          <NewQuotationPage />
        </AuthProvider>
      );

      // Passo 1: Seleciona fazenda e cultura Café Conilon
      const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
      fireEvent.change(farmSelect, { target: { value: 'farm_primary' } });

      const conilonBtn = screen.getByRole('radio', { name: /Café Conilon/i });
      fireEvent.click(conilonBtn);

      const nextBtn = screen.getByRole('button', { name: /Avançar para Itens/i });
      fireEvent.click(nextBtn);

      // Checa transição para o Passo 2
      await waitFor(() => {
        expect(screen.getByText(/Passo 2: Inclusão de Insumos para Café Conilon/i)).toBeInTheDocument();
      });

      // Verifica presença do Copiloto IA
      expect(screen.getByTestId('ai-copilot-container')).toBeInTheDocument();
      const areaInput = screen.getByTestId('input-ai-area');
      const spacingInput = screen.getByTestId('input-ai-spacing');

      // Verifica que a área herdada ou padrão de 15 ha e 3000 plantas/ha está preenchida
      expect(areaInput).toHaveValue('15');
      expect(spacingInput).toHaveValue('3000');

      // Produtor digita o princípio ativo ou produto comercial
      const productInput = screen.getByLabelText(/Produto ou Princípio Ativo/i);
      fireEvent.change(productInput, { target: { value: 'Azoxistrobina 250 SC' } });

      // Clica em [ Calcular Dosagem com IA ]
      const calcAiBtn = screen.getByTestId('btn-ai-calculate-dose');
      fireEvent.click(calcAiBtn);

      // Verifica que a IA preencheu automaticamente a quantidade e a unidade recomendada (45 Litros)
      const qtyInput = screen.getByLabelText(/Quantidade/i);
      const unitSelect = screen.getByLabelText(/Unidade/i);

      await waitFor(() => {
        expect(qtyInput).toHaveValue(45);
        expect(unitSelect).toHaveValue('L');
      });

      // Verifica o resumo explicativo oficial
      const explanation = screen.getByTestId('ai-dose-explanation');
      expect(explanation).toBeInTheDocument();
      expect(explanation).toHaveTextContent(
        'Dose recomendada de 3.0 L/ha para 15 ha com aplicação tratorada/fertirrigação'
      );
    });

    it('deve calcular dosagem para fertilizante NPK em 15 ha preenchendo automaticamente 90 Sacas', async () => {
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

      // Digita o fertilizante
      const productInput = screen.getByLabelText(/Produto ou Princípio Ativo/i);
      fireEvent.change(productInput, { target: { value: 'Adubo NPK 20-05-20' } });

      // Clica em [ Calcular Dosagem com IA ]
      fireEvent.click(screen.getByTestId('btn-ai-calculate-dose'));

      // Verifica 90 Sacas e explicação
      await waitFor(() => {
        expect(screen.getByLabelText(/Quantidade/i)).toHaveValue(90);
        expect(screen.getByLabelText(/Unidade/i)).toHaveValue('Sc');
      });
      expect(screen.getByTestId('ai-dose-explanation')).toHaveTextContent(
        'Dose recomendada de 6 Sc/ha para 15 ha com aplicação tratorada/fertirrigação'
      );
    });

    it('deve validar e calcular com área alterada manualmente no Copiloto IA (ex: 10 ha)', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

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

      // Altera área do talhão para 10 hectares
      fireEvent.change(screen.getByTestId('input-ai-area'), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/Produto ou Princípio Ativo/i), {
        target: { value: 'Azoxistrobina 250 SC' },
      });

      fireEvent.click(screen.getByTestId('btn-ai-calculate-dose'));

      // 10 ha * 3.0 L/ha = 30 L
      await waitFor(() => {
        expect(screen.getByLabelText(/Quantidade/i)).toHaveValue(30);
      });
      expect(screen.getByTestId('ai-dose-explanation')).toHaveTextContent(
        'Dose recomendada de 3.0 L/ha para 10 ha com aplicação tratorada/fertirrigação'
      );
    });

    it('deve exibir mensagem de erro inline se o produtor clicar em calcular dosagem sem informar o produto', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

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
        expect(screen.getByTestId('btn-ai-calculate-dose')).toBeInTheDocument();
      });

      // Clica em calcular sem produto preenchido
      fireEvent.click(screen.getByTestId('btn-ai-calculate-dose'));

      expect(
        screen.getByText('Informe o produto ou princípio ativo para calcular a dosagem com IA.')
      ).toBeInTheDocument();
    });
  });

  describe('Cenário 2: Alerta preventivo de restrição fitossanitária (Mamão / Pimenta)', () => {
    it('deve disparar card de atenção em tom âmbar e permitir substituição com 1 clique ao digitar defensivo com restrição (Mamão + Clorpirifós)', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

      render(
        <AuthProvider>
          <NewQuotationPage />
        </AuthProvider>
      );

      // Passo 1: Seleciona cultura "Mamão"
      fireEvent.change(screen.getByLabelText(/Propriedade Rural de Destino/i), {
        target: { value: 'farm_primary' },
      });
      fireEvent.click(screen.getByRole('radio', { name: /Mamão/i }));
      fireEvent.click(screen.getByRole('button', { name: /Avançar para Itens/i }));

      await waitFor(() => {
        expect(screen.getByText(/Passo 2: Inclusão de Insumos para Mamão/i)).toBeInTheDocument();
      });

      // Produtor busca ou digita defensivo restrito (Clorpirifós)
      const productInput = screen.getByLabelText(/Produto ou Princípio Ativo/i);
      fireEvent.change(productInput, { target: { value: 'Clorpirifós 480 EC' } });

      // IA deve disparar card de atenção em tom âmbar
      const alertCard = screen.getByTestId('ai-restriction-card');
      expect(alertCard).toBeInTheDocument();
      expect(alertCard).toHaveClass('bg-amber-50');

      // Deve exibir o aviso verbatim obrigatório
      expect(
        screen.getByText(
          'Atenção: Este princípio ativo possui restrições severas de exportação para a cultura do Mamão. Deseja ver opções biológicas ou alternativas registradas de menor carência?'
        )
      ).toBeInTheDocument();

      // Deve disponibilizar botão para substituir o item com 1 clique
      const replaceBtn = screen.getByTestId('btn-ai-replace-item');
      expect(replaceBtn).toBeInTheDocument();

      // Clica para substituir com 1 clique
      fireEvent.click(replaceBtn);

      // O produto deve ter sido substituído pela alternativa segura recomendada (Azoxistrobina 250 SC)
      expect(productInput).toHaveValue('Azoxistrobina 250 SC');

      // O alerta deve desaparecer após a substituição por opção em conformidade
      expect(screen.queryByTestId('ai-restriction-card')).not.toBeInTheDocument();

      // E a dosagem segura deve ser calculada automaticamente
      expect(screen.getByTestId('ai-dose-explanation')).toBeInTheDocument();
    });

    it('deve disparar alerta para Mamão com Mancozeb e limpar alerta se o produtor apagar ou digitar produto seguro', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

      render(
        <AuthProvider>
          <NewQuotationPage />
        </AuthProvider>
      );

      // Passo 1 -> Mamão
      fireEvent.change(screen.getByLabelText(/Propriedade Rural de Destino/i), {
        target: { value: 'farm_primary' },
      });
      fireEvent.click(screen.getByRole('radio', { name: /Mamão/i }));
      fireEvent.click(screen.getByRole('button', { name: /Avançar para Itens/i }));

      await waitFor(() => {
        expect(screen.getByText(/Passo 2: Inclusão de Insumos para Mamão/i)).toBeInTheDocument();
      });

      const productInput = screen.getByLabelText(/Produto ou Princípio Ativo/i);
      fireEvent.change(productInput, { target: { value: 'Mancozeb 750 WG' } });

      expect(screen.getByTestId('ai-restriction-card')).toBeInTheDocument();

      // Altera para produto seguro
      fireEvent.change(productInput, { target: { value: 'Azoxistrobina' } });
      expect(screen.queryByTestId('ai-restriction-card')).not.toBeInTheDocument();
    });

    it('deve disparar alerta preventivo para Pimenta-do-reino com Clorpirifós', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

      render(
        <AuthProvider>
          <NewQuotationPage />
        </AuthProvider>
      );

      // Passo 1 -> Pimenta-do-reino
      fireEvent.change(screen.getByLabelText(/Propriedade Rural de Destino/i), {
        target: { value: 'farm_primary' },
      });
      fireEvent.click(screen.getByRole('radio', { name: /Pimenta-do-reino/i }));
      fireEvent.click(screen.getByRole('button', { name: /Avançar para Itens/i }));

      await waitFor(() => {
        expect(screen.getByText(/Passo 2: Inclusão de Insumos para Pimenta-do-reino/i)).toBeInTheDocument();
      });

      const productInput = screen.getByLabelText(/Produto ou Princípio Ativo/i);
      fireEvent.change(productInput, { target: { value: 'Clorpirifós 480 EC' } });

      const alertCard = screen.getByTestId('ai-restriction-card');
      expect(alertCard).toBeInTheDocument();
      expect(alertCard).toHaveTextContent(/Pimenta-do-reino/i);
    });
  });

  describe('Integração de Estado, Rascunho e Adição de Item', () => {
    it('deve adicionar item calculado com IA à lista de cotação e limpar o resumo explicativo para o próximo item', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

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

      // Calcula com IA
      const productInput = screen.getByLabelText(/Produto ou Princípio Ativo/i);
      fireEvent.change(productInput, { target: { value: 'Azoxistrobina 250 SC' } });
      fireEvent.click(screen.getByTestId('btn-ai-calculate-dose'));

      await waitFor(() => {
        expect(screen.getByLabelText(/Quantidade/i)).toHaveValue(45);
      });

      // Clica em [ Adicionar Item ]
      const addItemBtn = screen.getByRole('button', { name: /Adicionar Item/i });
      fireEvent.click(addItemBtn);

      // Item deve aparecer na lista
      await waitFor(() => {
        expect(screen.getByText('Azoxistrobina 250 SC')).toBeInTheDocument();
        expect(screen.getByText('45 L')).toBeInTheDocument();
      });

      // O resumo explicativo e inputs de produto devem ter sido limpos
      expect(screen.queryByTestId('ai-dose-explanation')).not.toBeInTheDocument();
      expect(productInput).toHaveValue('');

      // Verifica salvamento no rascunho
      const draft = quotationService.getDraft();
      expect(draft?.items).toHaveLength(1);
      expect(draft?.items?.[0].productName).toBe('Azoxistrobina 250 SC');
      expect(draft?.items?.[0].quantity).toBe(45);
    });

    it('deve restaurar a área e o espaçamento do rascunho salvo', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));
      localStorage.setItem(
        'cotacampo_quotation_draft',
        JSON.stringify({
          farmId: 'farm_primary',
          targetCrop: 'cafe_conilon',
          talhaoArea: 25,
          talhaoSpacing: 4000,
        })
      );

      render(
        <AuthProvider>
          <NewQuotationPage />
        </AuthProvider>
      );

      // Avança para Passo 2
      fireEvent.click(screen.getByRole('button', { name: /Avançar para Itens/i }));

      await waitFor(() => {
        expect(screen.getByTestId('ai-copilot-container')).toBeInTheDocument();
      });

      expect(screen.getByTestId('input-ai-area')).toHaveValue('25');
      expect(screen.getByTestId('input-ai-spacing')).toHaveValue('4000');
    });
  });

  describe('Responsividade e Layout em Mobile, Tablet e Desktop', () => {
    const viewports = [
      { name: 'Mobile (375x667)', width: 375, height: 667 },
      { name: 'Tablet (768x1024)', width: 768, height: 1024 },
      { name: 'Desktop (1280x800)', width: 1280, height: 800 },
    ];

    viewports.forEach(({ name, width, height }) => {
      it(`deve renderizar o Copiloto IA e cards de alerta perfeitamente em ${name}`, async () => {
        window.innerWidth = width;
        window.innerHeight = height;
        window.dispatchEvent(new Event('resize'));

        localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducerWithDimensions));

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

        // Botão de calcular e inputs de área/espaçamento visíveis
        expect(screen.getByTestId('btn-ai-calculate-dose')).toBeVisible();
        expect(screen.getByTestId('input-ai-area')).toBeVisible();
        expect(screen.getByTestId('input-ai-spacing')).toBeVisible();
      });
    });
  });
});

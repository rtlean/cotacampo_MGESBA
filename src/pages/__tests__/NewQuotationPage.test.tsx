import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { NewQuotationPage } from '../NewQuotationPage';
import { AuthProvider } from '../../context/AuthContext';
import { ProducerProfile, ResellerProfile } from '../../types/user';
import { quotationService } from '../../services/quotation.service';

describe('US06 – Wizard de Cotação: Passo 1 – Destino e Cultura', () => {
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

  const mockReseller: ResellerProfile = {
    id: 'res-456',
    role: 'RESELLER',
    razaoSocial: 'Agro Comércio Ltda',
    nomeFantasia: 'AgroCenter Linhares',
    cnpj: '11.222.333/0001-81',
    corporateEmail: 'vendas@agrocenter.com',
    whatsapp: '(27) 98888-7777',
    state: 'ES',
    city: 'Linhares',
    deliveryRadiusKm: 50,
    coordinates: { lat: -19.3958, lng: -40.0644 },
    categories: ['fertilizantes'],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('Cenário 1: Preenchimento e avanço válido no Passo 1 (Café Conilon)', async () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    // Verifica que está no Passo 1
    expect(
      screen.getByRole('heading', { level: 1, name: /Nova Cotação de Insumos/i })
    ).toBeInTheDocument();

    // Seleciona a fazenda
    const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
    fireEvent.change(farmSelect, { target: { value: 'farm_primary' } });

    // Seleciona a cultura válida: Café Conilon
    const conilonButton = screen.getByRole('radio', { name: /Café Conilon/i });
    fireEvent.click(conilonButton);
    expect(conilonButton).toHaveAttribute('aria-checked', 'true');

    // Clica em "Avançar para Itens"
    const nextButton = screen.getByRole('button', { name: /Avançar para Itens/i });
    fireEvent.click(nextButton);

    // Verifica que os dados foram salvos no rascunho
    await waitFor(() => {
      const draft = quotationService.getDraft();
      expect(draft).not.toBeNull();
      expect(draft?.farmId).toBe('farm_primary');
      expect(draft?.targetCrop).toBe('cafe_conilon');
      expect(draft?.targetCropName).toBe('Café Conilon');
    });

    // Verifica transição para o Passo 2 sem recarregar a página
    expect(screen.getByText(/Passo 1 Concluído • Rascunho Salvo/i)).toBeInTheDocument();
    expect(screen.getByText(/Passo 2: Inclusão de Insumos para Café Conilon/i)).toBeInTheDocument();
    expect(screen.getByText(/Fazenda Boa Esperança • Café Conilon/i)).toBeInTheDocument();
  });

  it('Cenário 1 (Variações): Deve salvar e avançar com outras culturas válidas (Cacau, Pimenta, Mamão, Café Arábica)', async () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    const testCases = [
      { name: /Café Arábica/i, cropId: 'cafe_arabica', label: 'Café Arábica' },
      { name: /Cacau/i, cropId: 'cacau', label: 'Cacau' },
      { name: /Pimenta-do-reino/i, cropId: 'pimenta_reino', label: 'Pimenta-do-reino' },
      { name: /Mamão/i, cropId: 'mamao', label: 'Mamão' },
    ];

    for (const testCase of testCases) {
      localStorage.clear();
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

      const { unmount } = render(
        <AuthProvider>
          <NewQuotationPage />
        </AuthProvider>
      );

      const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
      fireEvent.change(farmSelect, { target: { value: 'farm_primary' } });

      const cropBtn = screen.getByRole('radio', { name: testCase.name });
      fireEvent.click(cropBtn);

      const nextButton = screen.getByRole('button', { name: /Avançar para Itens/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const draft = quotationService.getDraft();
        expect(draft?.targetCrop).toBe(testCase.cropId);
      });

      expect(screen.getByText(new RegExp(`Passo 2: Inclusão de Insumos para ${testCase.label}`, 'i'))).toBeInTheDocument();

      unmount();
    }
  });

  it('Cenário 2: Bloqueio por ausência de seleção obrigatória (sem fazenda e sem cultura)', async () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    // Reseta a fazenda para vazia
    const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
    fireEvent.change(farmSelect, { target: { value: '' } });

    // Não seleciona nenhuma cultura
    const nextButton = screen.getByRole('button', { name: /Avançar para Itens/i });
    fireEvent.click(nextButton);

    // A navegação deve ser impedida (continua no Passo 1)
    expect(
      screen.getByRole('heading', { level: 1, name: /Nova Cotação de Insumos/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Passo 2: Inclusão de Insumos/i)).not.toBeInTheDocument();

    // Mensagens de validação inline obrigatórias
    expect(screen.getByText('Selecione a propriedade de destino')).toBeInTheDocument();
    expect(screen.getByText('Selecione a cultura atendida')).toBeInTheDocument();
  });

  it('deve bloquear quando a fazenda estiver selecionada mas a cultura não', async () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
    fireEvent.change(farmSelect, { target: { value: 'farm_primary' } });

    const nextButton = screen.getByRole('button', { name: /Avançar para Itens/i });
    fireEvent.click(nextButton);

    expect(screen.queryByText('Selecione a propriedade de destino')).not.toBeInTheDocument();
    expect(screen.getByText('Selecione a cultura atendida')).toBeInTheDocument();

    // Ao clicar em uma cultura, o erro inline deve sumir
    const conilonButton = screen.getByRole('radio', { name: /Café Conilon/i });
    fireEvent.click(conilonButton);
    expect(screen.queryByText('Selecione a cultura atendida')).not.toBeInTheDocument();
  });

  it('deve bloquear quando a cultura estiver selecionada mas a fazenda estiver desmarcada', async () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    const conilonButton = screen.getByRole('radio', { name: /Café Conilon/i });
    fireEvent.click(conilonButton);

    const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
    fireEvent.change(farmSelect, { target: { value: '' } });

    const nextButton = screen.getByRole('button', { name: /Avançar para Itens/i });
    fireEvent.click(nextButton);

    expect(screen.getByText('Selecione a propriedade de destino')).toBeInTheDocument();
    expect(screen.queryByText('Selecione a cultura atendida')).not.toBeInTheDocument();

    // Ao selecionar a fazenda novamente, o erro inline deve sumir
    fireEvent.change(farmSelect, { target: { value: 'farm_primary' } });
    expect(screen.queryByText('Selecione a propriedade de destino')).not.toBeInTheDocument();
  });

  it('deve permitir retornar do Passo 2 para o Passo 1 mantendo as seleções', async () => {
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

    expect(screen.getByText(/Passo 2: Inclusão de Insumos/i)).toBeInTheDocument();

    // Clica em voltar para o Passo 1 via botão de cabeçalho
    const backButton = screen.getByRole('button', { name: /Alterar Destino ou Cultura/i });
    fireEvent.click(backButton);

    // Retorna ao Passo 1 com valores preservados
    expect(
      screen.getByRole('heading', { level: 1, name: /Nova Cotação de Insumos/i })
    ).toBeInTheDocument();
    expect(conilonButton).toHaveAttribute('aria-checked', 'true');
    expect(farmSelect).toHaveValue('farm_primary');

    // Avança novamente para o Passo 2
    fireEvent.click(screen.getByRole('button', { name: /Avançar para Itens/i }));
    expect(screen.getByText(/Passo 2: Inclusão de Insumos/i)).toBeInTheDocument();

    // Clica no segundo botão de voltar dentro do corpo do card
    const bottomBackButton = screen.getByRole('button', { name: /Voltar para Destino e Cultura/i });
    fireEvent.click(bottomBackButton);
    expect(
      screen.getByRole('heading', { level: 1, name: /Nova Cotação de Insumos/i })
    ).toBeInTheDocument();
  });

  it('deve restaurar rascunho salvo do localStorage ao montar o componente', () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));
    quotationService.saveDraft({
      farmId: 'farm_primary',
      targetCrop: 'cacau',
    });

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    const cacauButton = screen.getByRole('radio', { name: /Cacau/i });
    expect(cacauButton).toHaveAttribute('aria-checked', 'true');
    const farmSelect = screen.getByLabelText(/Propriedade Rural de Destino/i);
    expect(farmSelect).toHaveValue('farm_primary');
  });

  it('deve exibir aviso e bloquear criação para perfil que não seja PRODUCER', () => {
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockReseller));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { level: 2, name: /Acesso Exclusivo para Produtores/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir para Painel da Revenda/i })).toHaveAttribute('href', '/revenda/dashboard');
  });
});

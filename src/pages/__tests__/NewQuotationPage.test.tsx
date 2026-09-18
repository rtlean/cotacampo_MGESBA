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

  describe('US07 – Wizard de Cotação: Passo 2 – Itens, Genéricos e Receituário', () => {
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

    it('Cenário 1: Adição de múltiplos itens e upload de receituário com avanço para Condições Comerciais', async () => {
      advanceToStep2();

      expect(screen.getByRole('heading', { level: 1, name: /Passo 2: Itens, Genéricos e Receituário/i })).toBeInTheDocument();

      // 1. Busca preditiva do produto
      const searchInput = screen.getByPlaceholderText(/Ex: Mancozeb 750 WG.../i);
      fireEvent.change(searchInput, { target: { value: 'Manc' } });

      // Clica na opção sugerida do dropdown
      const suggestion = await screen.findByText('Mancozeb 750 WG');
      expect(suggestion).toBeInTheDocument();
      fireEvent.click(suggestion);

      expect(searchInput).toHaveValue('Mancozeb 750 WG');

      // 2. Informa a quantidade e unidade
      const qtyInput = screen.getByPlaceholderText(/Ex: 50/i);
      fireEvent.change(qtyInput, { target: { value: '50' } });

      const unitSelect = screen.getByLabelText(/Unidade \*/i);
      fireEvent.change(unitSelect, { target: { value: 'Kg' } });

      // 3. Marca a opção "Aceita produto genérico/equivalente?: Sim"
      const genericCheckbox = screen.getByLabelText(/Aceita produto genérico\/equivalente\?: Sim/i);
      expect(genericCheckbox).toBeChecked();

      // 4. Clica em "Adicionar Item"
      const addItemButton = screen.getByRole('button', { name: /Adicionar Item/i });
      fireEvent.click(addItemButton);

      // Verifica que o item foi incluído na tabela dinâmica
      expect(screen.getByText('Mancozeb 750 WG')).toBeInTheDocument();
      expect(screen.getByText('50 Kg')).toBeInTheDocument();
      expect(screen.getByText('Tabela de Itens da Demanda (1)')).toBeInTheDocument();

      // 5. Anexa um arquivo de imagem ou PDF do Receituário Agronômico (máximo 5MB)
      const fileInput = document.getElementById('prescription-upload') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const validPdfFile = new File(['dummy-pdf-content'], 'receituario_conilon.pdf', {
        type: 'application/pdf',
      });
      fireEvent.change(fileInput, { target: { files: [validPdfFile] } });

      // Verifica badge de upload com status concluído
      expect(screen.getByText('Upload Concluído')).toBeInTheDocument();
      expect(screen.getByText(/receituario_conilon\.pdf/i)).toBeInTheDocument();

      // 6. Botão "Avançar para Condições Comerciais" deve avançar para o Passo 3
      const nextCommercialBtn = screen.getByRole('button', { name: /Avançar para Condições Comerciais/i });
      fireEvent.click(nextCommercialBtn);

      expect(screen.getByRole('heading', { level: 3, name: /Passo 3: Prazos e Condições Comerciais/i })).toBeInTheDocument();
      expect(screen.getByText(/1 Insumo Cadastrado/i)).toBeInTheDocument();
    });

    it('Cenário 2: Validação de lista vazia ou dados inválidos de item', () => {
      advanceToStep2();

      // Tenta avançar com a lista vazia
      const nextCommercialBtn = screen.getByRole('button', { name: /Avançar para Condições Comerciais/i });
      fireEvent.click(nextCommercialBtn);

      // Deve barrar a ação e exibir aviso exigindo ao menos um item com volume válido
      expect(screen.getByText('Exigido ao menos um item com volume válido para continuar.')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 3, name: /Passo 3: Prazos/i })).not.toBeInTheDocument();

      // Tenta inserir item com quantidade menor ou igual a zero (0)
      const searchInput = screen.getByPlaceholderText(/Ex: Mancozeb 750 WG.../i);
      fireEvent.change(searchInput, { target: { value: 'Glifosato' } });

      const qtyInput = screen.getByPlaceholderText(/Ex: 50/i);
      fireEvent.change(qtyInput, { target: { value: '0' } });

      const addItemBtn = screen.getByRole('button', { name: /Adicionar Item/i });
      fireEvent.click(addItemBtn);

      expect(screen.getByText('A quantidade deve ser maior que zero (0)')).toBeInTheDocument();

      // Com quantidade negativa
      fireEvent.change(qtyInput, { target: { value: '-10' } });
      fireEvent.click(addItemBtn);
      expect(screen.getByText('A quantidade deve ser maior que zero (0)')).toBeInTheDocument();
    });

    it('deve validar nome de produto vazio ou unidade vazia ao adicionar item', () => {
      advanceToStep2();

      const addItemBtn = screen.getByRole('button', { name: /Adicionar Item/i });
      fireEvent.click(addItemBtn);
      expect(screen.getByText('Informe o nome do produto ou princípio ativo')).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(/Ex: Mancozeb 750 WG.../i);
      fireEvent.change(searchInput, { target: { value: 'Adubo NPK' } });
      const qtyInput = screen.getByPlaceholderText(/Ex: 50/i);
      fireEvent.change(qtyInput, { target: { value: '100' } });

      const unitSelect = screen.getByLabelText(/Unidade \*/i);
      fireEvent.change(unitSelect, { target: { value: '' } });

      fireEvent.click(addItemBtn);
      expect(screen.getByText('Selecione a unidade de medida')).toBeInTheDocument();
    });

    it('deve permitir excluir um item da tabela dinâmica', () => {
      advanceToStep2();

      const searchInput = screen.getByPlaceholderText(/Ex: Mancozeb 750 WG.../i);
      fireEvent.change(searchInput, { target: { value: 'Mancozeb 750 WG' } });
      const qtyInput = screen.getByPlaceholderText(/Ex: 50/i);
      fireEvent.change(qtyInput, { target: { value: '25' } });

      fireEvent.click(screen.getByRole('button', { name: /Adicionar Item/i }));
      expect(screen.getByText('Mancozeb 750 WG')).toBeInTheDocument();

      // Clica em excluir item
      const deleteBtn = screen.getByRole('button', { name: /Excluir Mancozeb 750 WG/i });
      fireEvent.click(deleteBtn);

      expect(screen.queryByText('Mancozeb 750 WG')).not.toBeInTheDocument();
      expect(screen.getByText('Nenhum item adicionado à cotação ainda')).toBeInTheDocument();
    });

    it('deve validar limites de arquivo do receituário (tamanho > 5MB e formato inválido)', () => {
      advanceToStep2();

      const fileInput = document.getElementById('prescription-upload') as HTMLInputElement;

      // Arquivo maior que 5MB
      const bigFile = new File(['x'.repeat(100)], 'pesado.pdf', { type: 'application/pdf' });
      Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [bigFile] } });
      expect(screen.getByText('O arquivo excede o limite máximo permitido de 5MB.')).toBeInTheDocument();

      // Formato não permitido
      const invalidFile = new File(['text'], 'documento.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      expect(screen.getByText('Formato inválido. Apenas arquivos PDF ou imagens (PNG, JPG) são permitidos.')).toBeInTheDocument();
    });

    it('deve permitir remover o receituário anexado', () => {
      advanceToStep2();

      const fileInput = document.getElementById('prescription-upload') as HTMLInputElement;
      const validPng = new File(['png-content'], 'receita.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [validPng] } });

      expect(screen.getByText('Upload Concluído')).toBeInTheDocument();

      const removeBtn = screen.getByRole('button', { name: /Remover receituário/i });
      fireEvent.click(removeBtn);

      expect(screen.queryByText('Upload Concluído')).not.toBeInTheDocument();
      expect(screen.getByText(/Clique ou arraste o arquivo do Receituário Agronômico/i)).toBeInTheDocument();
    });

    it('deve permitir navegar de volta do Passo 3 para o Passo 2 por ambos os botões e alternar genérico', () => {
      advanceToStep2();

      // Testa busca com menos de 2 caracteres
      const searchInput = screen.getByPlaceholderText(/Ex: Mancozeb 750 WG.../i);
      fireEvent.change(searchInput, { target: { value: 'M' } });

      // Desmarca o genérico (deve virar Não)
      const genericCheckbox = screen.getByLabelText(/Aceita produto genérico\/equivalente\?: Sim/i);
      fireEvent.click(genericCheckbox);
      expect(screen.getByText('Não')).toBeInTheDocument();

      // Marca de volta
      fireEvent.click(genericCheckbox);
      expect(screen.getByText('Sim')).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: 'Mancozeb 750 WG' } });
      const qtyInput = screen.getByPlaceholderText(/Ex: 50/i);
      fireEvent.change(qtyInput, { target: { value: '50' } });

      fireEvent.click(screen.getByRole('button', { name: /Adicionar Item/i }));
      fireEvent.click(screen.getByRole('button', { name: /Avançar para Condições Comerciais/i }));

      expect(screen.getByText(/Passo 3: Prazos e Condições Comerciais/i)).toBeInTheDocument();

      // Clica no primeiro botão de voltar
      const backButtons = screen.getAllByRole('button', { name: /Voltar para Itens da Cotação/i });
      fireEvent.click(backButtons[0]);
      expect(screen.getByRole('heading', { level: 1, name: /Passo 2: Itens, Genéricos e Receituário/i })).toBeInTheDocument();

      // Avança novamente para testar o segundo botão de voltar
      fireEvent.click(screen.getByRole('button', { name: /Avançar para Condições Comerciais/i }));
      const backButtonsAgain = screen.getAllByRole('button', { name: /Voltar para Itens da Cotação/i });
      fireEvent.click(backButtonsAgain[1]);
      expect(screen.getByRole('heading', { level: 1, name: /Passo 2: Itens, Genéricos e Receituário/i })).toBeInTheDocument();
    });
  });
});

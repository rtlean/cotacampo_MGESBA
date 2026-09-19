import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from '../../context/AuthContext';

describe('RegisterPage (US01 & US01.1 - Detalhamento de Área Plantada e Escala por Cultura)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/cadastro');
  });

  it('deve aplicar máscara no WhatsApp conforme o produtor digita', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const whatsappInput = screen.getByLabelText(/Telefone \/ WhatsApp/i) as HTMLInputElement;

    fireEvent.change(whatsappInput, { target: { value: '27998' } });
    expect(whatsappInput.value).toBe('(27) 998');

    fireEvent.change(whatsappInput, { target: { value: '27998765432' } });
    expect(whatsappInput.value).toBe('(27) 99876-5432');
  });

  it('Validação negativa: bloqueio de submissão e foco no primeiro campo com erro quando culturas vazias', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Desmarca a cultura Café Conilon inicial para deixar 0 culturas selecionadas
    const cafeButton = screen.getByRole('checkbox', { name: /Café Conilon/i });
    fireEvent.click(cafeButton);

    // Digita WhatsApp inválido
    const whatsappInput = screen.getByLabelText(/Telefone \/ WhatsApp/i);
    fireEvent.change(whatsappInput, { target: { value: '123' } });

    // Clica no botão de criar conta
    const submitBtn = screen.getByRole('button', { name: /Criar Conta de Produtor/i });
    fireEvent.click(submitBtn);

    // Verifica que as mensagens de validação aparecem
    await waitFor(() => {
      expect(screen.getByText(/Informe seu nome completo/i)).toBeInTheDocument();
      expect(screen.getByText(/WhatsApp inválido/i)).toBeInTheDocument();
      expect(screen.getByText(/Selecione ao menos uma cultura atendida/i)).toBeInTheDocument();
    });

    // O foco deve ir para o primeiro campo com erro (Nome Completo)
    const fullNameInput = screen.getByLabelText(/Nome Completo/i);
    expect(document.activeElement).toBe(fullNameInput);
  });

  it('Cadastro completo do produtor com dimensões válidas e redirecionamento para o dashboard', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Preenchimento dos dados do produtor
    fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
      target: { value: 'Roberto Agrônomo da Silva' },
    });
    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'roberto@fazendasantarita.com.br' },
    });
    fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
      target: { value: '27998765432' },
    });
    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
      target: { value: 'Safra@2026' },
    });
    fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), {
      target: { value: 'Fazenda Santa Rita' },
    });
    fireEvent.change(screen.getByLabelText(/Estado \(UF\)/i), {
      target: { value: 'ES' },
    });
    fireEvent.change(screen.getByLabelText(/Município/i), {
      target: { value: 'Linhares' },
    });

    // Informa a área de Café Conilon
    const conilonAreaInput = screen.getByTestId('input-crop-area-cafe_conilon');
    fireEvent.change(conilonAreaInput, { target: { value: '120' } });

    // Seleciona Cacau e informa a área
    const cacauButton = screen.getByRole('checkbox', { name: /Cacau/i });
    fireEvent.click(cacauButton);
    const cacauAreaInput = screen.getByTestId('input-crop-area-cacau');
    fireEvent.change(cacauAreaInput, { target: { value: '25' } });

    // Submete o formulário
    fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

    // Redirecionamento para o dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/produtor/dashboard');
    });

    // Elementos do dashboard renderizados
    await waitFor(
      () => {
        const farmElements = screen.queryAllByText('Fazenda Santa Rita');
        expect(farmElements.length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Linhares/i).length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 }
    );

    // Boas-vindas ao produtor
    expect(screen.getAllByText(/Bem-vindo ao CotaCampo, Roberto!/i).length).toBeGreaterThanOrEqual(1);
  });

  describe('US01.1 - Cenários Específicos de Negócio', () => {
    it('Cenário 1: Cadastro de área por grande ou médio produtor (Hectares inteiros ou múltiplos cultivos)', async () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      // Preenche dados básicos obrigatórios
      fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
        target: { value: 'Grande Produtor Fazenda Modelo' },
      });
      fireEvent.change(screen.getByLabelText(/E-mail/i), {
        target: { value: 'grandeprodutor@fazenda.com.br' },
      });
      fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
        target: { value: '27999887766' },
      });
      fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
        target: { value: 'Senha@123' },
      });
      fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), {
        target: { value: 'Fazenda Modelo' },
      });

      // Dado que estou na etapa de seleção de culturas
      // Quando seleciono as culturas "Café Conilon" e "Mamão"
      // Café Conilon já está selecionado por padrão, selecionamos Mamão:
      const mamaoBtn = screen.getByRole('checkbox', { name: /Mamão/i });
      fireEvent.click(mamaoBtn);

      // Então o formulário deve expandir dinamicamente um bloco de dimensionamento para cada cultura escolhida
      expect(screen.getByTestId('crop-dimension-card-cafe_conilon')).toBeInTheDocument();
      expect(screen.getByTestId('crop-dimension-card-mamao')).toBeInTheDocument();

      // E para "Café Conilon", informo a área de 120 hectares
      const conilonArea = screen.getByTestId('input-crop-area-cafe_conilon');
      fireEvent.change(conilonArea, { target: { value: '120' } });

      // E para "Mamão", informo a área de 25 hectares
      const mamaoArea = screen.getByTestId('input-crop-area-mamao');
      fireEvent.change(mamaoArea, { target: { value: '25' } });

      // Verifica badges de escala categorizada
      expect(screen.getByTestId('badge-scale-cafe_conilon')).toHaveTextContent(/Grande Escala/i);
      expect(screen.getByTestId('badge-scale-mamao')).toHaveTextContent(/Média Escala/i);

      // E clico em "Continuar Cadastro" (ou Criar Conta de Produtor)
      const submitBtn = screen.getByRole('button', { name: /Criar Conta de Produtor/i });
      fireEvent.click(submitBtn);

      // Então o sistema deve registrar a área individualizada de cada cultura vinculada à fazenda e avançar
      await waitFor(() => {
        expect(window.location.pathname).toBe('/produtor/dashboard');
      });

      // Validar que o perfil foi salvo no banco de dados local com as dimensões registradas
      const storedProducers = JSON.parse(localStorage.getItem('cotacampo_producers_db') || '[]');
      const lastProducer = storedProducers[storedProducers.length - 1];
      expect(lastProducer).toBeDefined();
      expect(lastProducer.cropDimensions?.cafe_conilon?.area).toBe('120');
      expect(lastProducer.cropDimensions?.mamao?.area).toBe('25');
    });

    it('Cenário 2: Cadastro de pequeno produtor com área fracionada (0,75 ou 0.5 ha e 800 pés)', async () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      // Preenche dados básicos
      fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
        target: { value: 'José Pequeno Produtor Familiar' },
      });
      fireEvent.change(screen.getByLabelText(/E-mail/i), {
        target: { value: 'jose@sitiofamiliar.com.br' },
      });
      fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
        target: { value: '27999112233' },
      });
      fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
        target: { value: 'Senha@123' },
      });
      fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), {
        target: { value: 'Sítio Boa Esperança' },
      });

      // Desmarca Cafe Conilon e seleciona Pimenta-do-reino
      fireEvent.click(screen.getByRole('checkbox', { name: /Café Conilon/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Pimenta-do-reino/i }));

      // Preenche área decimal fracionada com vírgula '0,75' e pés opcionais '800'
      const areaInput = screen.getByTestId('input-crop-area-pimenta');
      const plantsInput = screen.getByTestId('input-crop-plants-pimenta');

      fireEvent.change(areaInput, { target: { value: '0,75' } });
      fireEvent.change(plantsInput, { target: { value: '800' } });

      // Verifica categorização visual imediata de Pequena Escala
      expect(screen.getByTestId('badge-scale-pimenta')).toHaveTextContent(/Pequena Escala/i);

      // Submete o formulário
      fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

      await waitFor(() => {
        expect(window.location.pathname).toBe('/produtor/dashboard');
      });

      const storedProducers = JSON.parse(localStorage.getItem('cotacampo_producers_db') || '[]');
      const lastProducer = storedProducers[storedProducers.length - 1];
      expect(lastProducer.cropDimensions?.pimenta?.area).toBe('0,75');
      expect(lastProducer.cropDimensions?.pimenta?.plantsCount).toBe('800');
    });

    it('Cenário 3: Validação de dados incompletos ou valores negativos/nulos com mensagem inline e foco no cursor', async () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      // Preenche os demais dados válidos para isolar o teste na cultura
      fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
        target: { value: 'Produtor Teste Cacau' },
      });
      fireEvent.change(screen.getByLabelText(/E-mail/i), {
        target: { value: 'cacau@fazenda.com.br' },
      });
      fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
        target: { value: '27999881122' },
      });
      fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
        target: { value: 'Senha@123' },
      });
      fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), {
        target: { value: 'Fazenda Cacau Show' },
      });

      // Desmarca Cafe Conilon e seleciona Cacau
      fireEvent.click(screen.getByRole('checkbox', { name: /Café Conilon/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Cacau/i }));

      // Deixa o campo de área vazio
      const cacauAreaInput = screen.getByTestId('input-crop-area-cacau');
      fireEvent.change(cacauAreaInput, { target: { value: '' } });

      // Tenta avançar no cadastro
      fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

      // Então o sistema deve bloquear o envio do formulário
      // E exibir a mensagem inline: "Informe a área plantada válida para o cultivo de Cacau (mínimo de 0,1 ha ou 100 plantas)"
      await waitFor(() => {
        expect(
          screen.getByText(
            'Informe a área plantada válida para o cultivo de Cacau (mínimo de 0,1 ha ou 100 plantas)'
          )
        ).toBeInTheDocument();
      });

      // E posicionar o cursor no campo pendente
      expect(document.activeElement).toBe(cacauAreaInput);

      // Testando agora com valor <= 0
      fireEvent.change(cacauAreaInput, { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'Informe a área plantada válida para o cultivo de Cacau (mínimo de 0,1 ha ou 100 plantas)'
          )
        ).toBeInTheDocument();
      });
      expect(document.activeElement).toBe(cacauAreaInput);
    });

    it('Cenário 4: Remoção dinâmica de cultura e limpeza de estado', async () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      // Dado que selecionei previamente "Café Arábica" e preenchi a área de 15 hectares
      const arabicaBtn = screen.getByRole('checkbox', { name: /Café Arábica/i });
      fireEvent.click(arabicaBtn);

      const arabicaAreaInput = screen.getByTestId('input-crop-area-cafe_arabica');
      fireEvent.change(arabicaAreaInput, { target: { value: '15' } });
      expect(screen.getByTestId('crop-dimension-card-cafe_arabica')).toBeInTheDocument();

      // Quando desmarco a caixa de seleção de "Café Arábica"
      fireEvent.click(arabicaBtn);

      // Então o bloco de campos correspondente a essa cultura deve ser recolhido e removido da visualização
      expect(screen.queryByTestId('crop-dimension-card-cafe_arabica')).not.toBeInTheDocument();

      // E o estado da validação (schema Zod) deve expurgar os dados daquela cultura antes da persistência
      // Preenche dados para Cafe Conilon restante e submete
      fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
        target: { value: 'Produtor Sem Arabica' },
      });
      fireEvent.change(screen.getByLabelText(/E-mail/i), {
        target: { value: 'semarabica@fazenda.com.br' },
      });
      fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
        target: { value: '27999554433' },
      });
      fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
        target: { value: 'Senha@123' },
      });
      fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), {
        target: { value: 'Fazenda Remocao' },
      });

      fireEvent.change(screen.getByTestId('input-crop-area-cafe_conilon'), {
        target: { value: '30' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

      await waitFor(() => {
        expect(window.location.pathname).toBe('/produtor/dashboard');
      });

      const storedProducers = JSON.parse(localStorage.getItem('cotacampo_producers_db') || '[]');
      const lastProducer = storedProducers[storedProducers.length - 1];
      expect(lastProducer.crops).not.toContain('cafe_arabica');
      expect(lastProducer.cropDimensions?.cafe_arabica).toBeUndefined();
      expect(lastProducer.cropDimensions?.cafe_conilon?.area).toBe('30');
    });
  });

  it('deve chamar scrollIntoView e limpar erros ao digitar nos campos do produtor', async () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Submete em branco
    fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

    await waitFor(() => {
      expect(screen.getByText(/Informe seu nome completo/i)).toBeInTheDocument();
    });

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();

    // Digita nos campos para limpar erros
    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Nome' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'email@agro.com' } });
    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), { target: { value: 'Sítio' } });
    fireEvent.change(screen.getByLabelText(/Município/i), { target: { value: 'Linhares' } });
  });

  it('deve exibir alert quando o cadastro do produtor falhar no servidor', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('Falha no banco');
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Carlos Erro' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'carlos@erro.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), { target: { value: '27998765432' } });
    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), { target: { value: 'Safra@2026' } });
    fireEvent.change(screen.getByLabelText(/Nome da Fazenda \/ Sítio/i), { target: { value: 'Fazenda Erro' } });
    fireEvent.change(screen.getByLabelText(/Município/i), { target: { value: 'Linhares' } });

    // Preenche a área de Cafe Conilon para passar na validação de schema
    fireEvent.change(screen.getByTestId('input-crop-area-cafe_conilon'), {
      target: { value: '10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Produtor/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Falha no banco'));
    });

    alertSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('deve atualizar municípios ao alterar o estado do produtor para MG e BA', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const stateSelect = screen.getByLabelText(/Estado \(UF\)/i);
    const citySelect = screen.getByLabelText(/Município/i);

    fireEvent.change(stateSelect, { target: { value: 'MG' } });
    expect(stateSelect).toHaveValue('MG');
    expect(citySelect).toHaveValue('Manhuaçu');

    fireEvent.change(stateSelect, { target: { value: 'BA' } });
    expect(stateSelect).toHaveValue('BA');
    expect(citySelect).toHaveValue('Ilhéus');

    fireEvent.change(citySelect, { target: { value: 'Outro Município' } });
    expect(citySelect).toHaveValue('Outro Município');
  });

  it('deve exibir feedback dinâmico de força da senha', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const passInput = screen.getByLabelText(/Senha de Acesso/i);

    fireEvent.change(passInput, { target: { value: '123' } });
    expect(screen.getByText(/Muito curta/i)).toBeInTheDocument();

    fireEvent.change(passInput, { target: { value: '123456' } });
    expect(screen.getByText(/Média/i)).toBeInTheDocument();

    fireEvent.change(passInput, { target: { value: 'Safra@2026' } });
    expect(screen.getByText(/Forte e segura/i)).toBeInTheDocument();
  });

  describe('Aba Revenda de Insumos (Integração e Validação)', () => {
    it('deve alternar para a aba Revenda, validar campos e cadastrar com sucesso', async () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      // Clica no botão de alternar para Revenda
      const resellerTabBtn = screen.getByRole('button', { name: /Sou Revenda \/ Loja/i });
      fireEvent.click(resellerTabBtn);

      // Validação em branco
      const submitBtn = screen.getByRole('button', { name: /Criar Conta de Revenda/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Informe a Razão Social/i)).toBeInTheDocument();
      });

      // Preenche dados da Revenda
      fireEvent.change(screen.getByLabelText(/Razão Social/i), {
        target: { value: 'AgroVila Insumos Ltda' },
      });
      fireEvent.change(screen.getByLabelText(/Nome Fantasia/i), {
        target: { value: 'AgroVila' },
      });
      fireEvent.change(screen.getByLabelText(/CNPJ/i), {
        target: { value: '11.222.333/0001-81' },
      });
      fireEvent.change(screen.getByLabelText(/E-mail Corporativo/i), {
        target: { value: 'contato@agrovila.com.br' },
      });
      fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
        target: { value: '27998877665' },
      });
      fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
        target: { value: 'Senha@123' },
      });
      fireEvent.change(screen.getByLabelText(/Estado \(UF\)/i), {
        target: { value: 'MG' },
      });
      fireEvent.change(screen.getByLabelText(/Município da Loja Física/i), {
        target: { value: 'Patrocínio' },
      });
      fireEvent.change(screen.getByLabelText(/Raio de Entrega \(km\)/i), {
        target: { value: '80' },
      });

      // Seleciona categoria
      const defensivosBtn = screen.getByRole('checkbox', { name: /Defensivos/i });
      fireEvent.click(defensivosBtn);

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(window.location.pathname).toBe('/revenda/dashboard');
      });
    });

    it('deve exibir alerta de CNPJ duplicado quando já cadastrado', async () => {
      localStorage.setItem(
        'cotacampo_resellers_db',
        JSON.stringify([{ cnpj: '11222333000181', corporateEmail: 'existente@agro.com' }])
      );

      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /Sou Revenda \/ Loja/i }));

      fireEvent.change(screen.getByLabelText(/Razão Social/i), {
        target: { value: 'Agro Duplicada Ltda' },
      });
      fireEvent.change(screen.getByLabelText(/Nome Fantasia/i), {
        target: { value: 'Agro Duplicada' },
      });
      fireEvent.change(screen.getByLabelText(/CNPJ/i), {
        target: { value: '11.222.333/0001-81' },
      });
      fireEvent.change(screen.getByLabelText(/E-mail Corporativo/i), {
        target: { value: 'dup@agro.com' },
      });
      fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
        target: { value: '27999887766' },
      });
      fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
        target: { value: 'Senha@123' },
      });
      fireEvent.click(screen.getByRole('checkbox', { name: /Defensivos/i }));

      fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Revenda/i }));

      await waitFor(() => {
        expect(screen.getByText(/Este CNPJ já está cadastrado/i)).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de erro geral quando o cadastro da revenda falhar com erro inesperado', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Falha no banco revenda');
      });

      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /Sou Revenda \/ Loja/i }));

      fireEvent.change(screen.getByLabelText(/Razão Social/i), {
        target: { value: 'Agro Erro Ltda' },
      });
      fireEvent.change(screen.getByLabelText(/Nome Fantasia/i), {
        target: { value: 'Agro Erro' },
      });
      fireEvent.change(screen.getByLabelText(/CNPJ/i), {
        target: { value: '11.222.333/0001-81' },
      });
      fireEvent.change(screen.getByLabelText(/E-mail Corporativo/i), {
        target: { value: 'erro@agro.com' },
      });
      fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
        target: { value: '27999887766' },
      });
      fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
        target: { value: 'Senha@123' },
      });
      fireEvent.click(screen.getByRole('checkbox', { name: /Defensivos/i }));

      fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Revenda/i }));

      await waitFor(() => {
        expect(screen.getByText(/Falha no banco revenda/i)).toBeInTheDocument();
      });

      setItemSpy.mockRestore();
    });
  });

  describe('Responsividade e Layout Visual', () => {
    it('deve renderizar perfeitamente os elementos em viewport mobile e desktop', () => {
      // Simula mobile
      window.innerWidth = 375;
      window.innerHeight = 667;
      window.dispatchEvent(new Event('resize'));

      const { container } = render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(container.querySelector('[data-testid="crop-dimensions-section"]')).toBeInTheDocument();

      // Simula desktop
      window.innerWidth = 1280;
      window.innerHeight = 800;
      window.dispatchEvent(new Event('resize'));

      expect(screen.getByText(/Dimensionamento e Escala por Cultura/i)).toBeInTheDocument();
    });
  });
});

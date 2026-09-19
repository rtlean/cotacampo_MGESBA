import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubmitBidPage } from '../SubmitBidPage';
import { AuthProvider } from '../../context/AuthContext';
import { quotationService } from '../../services/quotation.service';
import { QuotationRequest } from '../../types/quotation';
import { ResellerProfile, ProducerProfile } from '../../types/user';

// Mock de useRoute de wouter
let mockRouteParams: { id?: string } = { id: 'quote-us14-mock-1' };
let mockRouteMatch = true;

vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useRoute: () => [mockRouteMatch, mockRouteParams],
    useLocation: () => ['/revenda/cotacoes/quote-us14-mock-1/proposta', vi.fn()],
    Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
});

const mockReseller: ResellerProfile = {
  id: 'reseller-linhares-1',
  role: 'RESELLER',
  cnpj: '12.345.678/0001-90',
  razaoSocial: 'Linhares Agro Insumos Ltda',
  nomeFantasia: 'Linhares Agro',
  city: 'Linhares',
  state: 'ES',
  telefone: '27999887766',
  responsavelNome: 'Carlos RTV',
  responsavelCargo: 'Representante Comercial',
  categories: ['DEFENSIVOS', 'FERTILIZANTES'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockProducer: ProducerProfile = {
  id: 'producer-1',
  role: 'PRODUCER',
  cpf: '123.456.789-00',
  nomeCompleto: 'João da Silva',
  city: 'Linhares',
  state: 'ES',
  farmName: 'Fazenda Santa Clara',
  totalAreaHectares: 120,
  mainCrops: ['Café Conilon'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockQuotationCIF: QuotationRequest = {
  id: 'quote-us14-mock-1',
  displayCode: 'COT-2026-014',
  producerId: 'producer-1',
  producerName: 'João da Silva (Fazenda Santa Clara)',
  title: 'Cotação Safra Café - Defensivos e Fertilizantes',
  status: 'OPEN',
  targetState: 'ES',
  targetCity: 'Linhares',
  deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
  freightType: 'CIF',
  deliveryAddress: 'Rodovia Linhares-Colatina, Km 15 - Zona Rural',
  itemsCount: 2,
  bidsCount: 0,
  items: [
    {
      id: 'item-generic-1',
      productName: 'Mancozeb 750 WG da Marca X',
      activeIngredient: 'Mancozebe',
      quantity: 100,
      unit: 'Kg',
      acceptsGeneric: true,
    },
    {
      id: 'item-strict-2',
      productName: 'Adubo Foliar Potássio K50',
      quantity: 20,
      unit: 'Litros',
      acceptsGeneric: false,
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const renderWithAuth = (ui: React.ReactElement = <SubmitBidPage />) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('US14 – Envio de Proposta e Oferta de Genéricos/Equivalentes (SubmitBidPage)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockRouteParams = { id: 'quote-us14-mock-1' };
    mockRouteMatch = true;
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockReseller));
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuotationCIF);
  });

  describe('Cenário 1: Preenchimento de proposta integral com frete CIF', () => {
    it('deve preencher valores unitários, frete CIF, prazo, validade e submeter com status SUBMITTED e confirmação', async () => {
      const submitBidSpy = vi.spyOn(quotationService, 'submitBid');

      renderWithAuth();

      // Aguarda carregamento
      await waitFor(() => {
        expect(screen.getByText('Cotação Safra Café - Defensivos e Fertilizantes')).toBeInTheDocument();
      });

      // Valida sinalização de frete CIF
      expect(screen.getByTestId('badge-freight-type')).toHaveTextContent('CIF (Entregue na fazenda)');

      // Preenche preço unitário do item 1 (100 Kg x R$ 55.00 = R$ 5.500,00)
      const inputPrice1 = screen.getByTestId('input-unit-price-item-generic-1');
      fireEvent.change(inputPrice1, { target: { value: '55.00' } });

      // Preenche preço unitário do item 2 (20 L x R$ 80.00 = R$ 1.600,00)
      const inputPrice2 = screen.getByTestId('input-unit-price-item-strict-2');
      fireEvent.change(inputPrice2, { target: { value: '80.00' } });

      // Preenche frete CIF (R$ 150.00)
      const inputFreight = screen.getByTestId('input-freight-cost');
      fireEvent.change(inputFreight, { target: { value: '150.00' } });

      // Preenche prazo estimado de entrega (3 dias)
      const inputDelivery = screen.getByTestId('input-delivery-days');
      fireEvent.change(inputDelivery, { target: { value: '3' } });

      // Preenche validade da proposta (48 horas)
      const selectValidity = screen.getByTestId('input-validity-hours');
      fireEvent.change(selectValidity, { target: { value: '48' } });

      // Verifica subtotais calculados em tela
      expect(screen.getByTestId('item-subtotal-item-generic-1')).toHaveTextContent('R$ 5.500,00');
      expect(screen.getByTestId('item-subtotal-item-strict-2')).toHaveTextContent('R$ 1.600,00');

      // Total somado esperado: 5500 + 1600 + 150 = 7250
      expect(screen.getByTestId('total-proposal-amount')).toHaveTextContent('R$ 7.250,00');

      // Clica em [ Enviar Proposta ]
      const submitBtn = screen.getByTestId('btn-submit-bid');
      fireEvent.click(submitBtn);

      // Espera tela de confirmação
      await waitFor(() => {
        expect(screen.getByTestId('bid-submitted-success')).toBeInTheDocument();
      }, { timeout: 3500 });

      // Validações da mensagem e status
      expect(screen.getByText('Proposta enviada! O produtor será notificado.')).toBeInTheDocument();
      expect(screen.getByTestId('bid-status-badge')).toHaveTextContent('SUBMITTED');
      expect(screen.getByTestId('summary-total-amount')).toHaveTextContent('R$ 7.250,00');

      // Valida que o serviço foi chamado com os dados exatos
      expect(submitBidSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          quotationId: 'quote-us14-mock-1',
          freightCost: 150,
          deliveryDays: 3,
          validityHours: 48,
          paymentMethod: 'PRAZO_30',
        })
      );
    });
  });

  describe('Cenário 2: Oferta de produto equivalente (Quando o produtor aceita genérico)', () => {
    it('deve exibir botão [ Ofertarei Marca Alternativa ], permitir digitar marca alternativa e enviar proposta com isEquivalent: true', async () => {
      const submitBidSpy = vi.spyOn(quotationService, 'submitBid');

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('badge-accepts-generic-item-generic-1')).toBeInTheDocument();
      });

      // Item 1 aceita genérico: exibe botão [ Ofertarei Marca Alternativa ]
      const btnAlternative = screen.getByTestId('btn-offer-alternative-item-generic-1');
      expect(btnAlternative).toHaveTextContent('[ Ofertarei Marca Alternativa ]');

      // Item 2 exige marca específica: não deve ter botão de alternativa
      expect(screen.queryByTestId('btn-offer-alternative-item-strict-2')).not.toBeInTheDocument();

      // Clica em [ Ofertarei Marca Alternativa ]
      fireEvent.click(btnAlternative);

      // Verifica aparecimento dos campos de marca alternativa
      expect(screen.getByTestId('alternative-brand-container-item-generic-1')).toBeInTheDocument();

      // Digita o nome da marca alternativa
      const inputBrand = screen.getByTestId('input-brand-name-item-generic-1');
      fireEvent.change(inputBrand, { target: { value: 'Mancozeb 750 WG da Marca Y' } });

      // Digita a concentração
      const inputConcentration = screen.getByTestId('input-brand-concentration-item-generic-1');
      fireEvent.change(inputConcentration, { target: { value: 'Mancozebe 750 g/kg (75% m/m)' } });

      // Preenche os preços unitários
      fireEvent.change(screen.getByTestId('input-unit-price-item-generic-1'), { target: { value: '49.90' } });
      fireEvent.change(screen.getByTestId('input-unit-price-item-strict-2'), { target: { value: '75.00' } });
      fireEvent.change(screen.getByTestId('input-freight-cost'), { target: { value: '0' } }); // Frete grátis

      // Submete proposta
      fireEvent.click(screen.getByTestId('btn-submit-bid'));

      await waitFor(() => {
        expect(screen.getByTestId('bid-submitted-success')).toBeInTheDocument();
      }, { timeout: 3500 });

      // Verifica chamada ao serviço
      expect(submitBidSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              quotationItemId: 'item-generic-1',
              brandName: 'Mancozeb 750 WG da Marca Y',
              isEquivalent: true,
              activeIngredientConcentration: 'Mancozebe 750 g/kg (75% m/m)',
              unitPrice: 49.9,
            }),
          ]),
        })
      );
    });

    it('deve permitir cancelar a marca alternativa e retornar à marca original', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('btn-offer-alternative-item-generic-1')).toBeInTheDocument();
      });

      // Abre alternativa
      fireEvent.click(screen.getByTestId('btn-offer-alternative-item-generic-1'));
      expect(screen.getByTestId('input-brand-name-item-generic-1')).toBeInTheDocument();

      // Clica em cancelar alternativa
      const btnCancel = screen.getByTestId('btn-cancel-alternative-item-generic-1');
      fireEvent.click(btnCancel);

      // Container fecha e botão reaparece
      expect(screen.queryByTestId('alternative-brand-container-item-generic-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('btn-offer-alternative-item-generic-1')).toBeInTheDocument();
    });
  });

  describe('Cenário 3: Oferta de modalidade de pagamento "Barter" (Troca por Sacas)', () => {
    it('deve permitir selecionar Barter, preencher quantidade de sacas e enviar proposta como negociação direta', async () => {
      const submitBidSpy = vi.spyOn(quotationService, 'submitBid');

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Cotação Safra Café - Defensivos e Fertilizantes')).toBeInTheDocument();
      });

      // Seleciona modalidade Barter
      const radioBarter = screen.getByTestId('radio-payment-barter');
      fireEvent.click(radioBarter);

      // Campo de sacas deve aparecer
      expect(screen.getByTestId('barter-input-container')).toBeInTheDocument();
      expect(screen.getByText('Quantas sacas (60kg) pelo lote completo? *')).toBeInTheDocument();

      // Preenche quantidade de sacas (ex: 85 sacas)
      const inputBarterBags = screen.getByTestId('input-barter-bags');
      fireEvent.change(inputBarterBags, { target: { value: '85' } });

      // Preenche preços
      fireEvent.change(screen.getByTestId('input-unit-price-item-generic-1'), { target: { value: '60.00' } });
      fireEvent.change(screen.getByTestId('input-unit-price-item-strict-2'), { target: { value: '90.00' } });
      fireEvent.change(screen.getByTestId('input-freight-cost'), { target: { value: '100.00' } });

      // Envia proposta
      fireEvent.click(screen.getByTestId('btn-submit-bid'));

      await waitFor(() => {
        expect(screen.getByTestId('bid-submitted-success')).toBeInTheDocument();
      }, { timeout: 3500 });

      // Valida resumo de barter
      expect(screen.getByText(/Barter \/ Permuta em Sacas \(85 sacas de 60kg\)/)).toBeInTheDocument();

      // Verifica dados no serviço
      expect(submitBidSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'BARTER',
          barterBagsCount: 85,
        })
      );
    });
  });

  describe('Validações e Casos Extremos', () => {
    it('deve exibir erros de validação ao tentar submeter com preços vazios ou zerados', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('btn-submit-bid')).toBeInTheDocument();
      });

      // Clica em enviar sem preencher nada
      fireEvent.click(screen.getByTestId('btn-submit-bid'));

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Preço unitário deve ser maior que zero');
        expect(errorMessages.length).toBeGreaterThan(0);
      });

      // Digita preço para limpar erro de validação
      fireEvent.change(screen.getByTestId('input-unit-price-item-generic-1'), { target: { value: '45.00' } });
    });

    it('deve exibir erro de validação caso selecione Barter e deixe a quantidade de sacas em branco', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('radio-payment-barter')).toBeInTheDocument();
      });

      // Preenche preços
      fireEvent.change(screen.getByTestId('input-unit-price-item-generic-1'), { target: { value: '50.00' } });
      fireEvent.change(screen.getByTestId('input-unit-price-item-strict-2'), { target: { value: '70.00' } });

      // Seleciona Barter sem preencher quantidade de sacas
      fireEvent.click(screen.getByTestId('radio-payment-barter'));

      // Tenta enviar
      fireEvent.click(screen.getByTestId('btn-submit-bid'));

      await waitFor(() => {
        expect(
          screen.getByText('Para a modalidade Barter, informe quantas sacas (60kg) pelo lote completo')
        ).toBeInTheDocument();
      });
    });

    it('deve exibir erro de validação se marcar marca alternativa mas não informar o nome da marca', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('btn-offer-alternative-item-generic-1')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-unit-price-item-generic-1'), { target: { value: '50.00' } });
      fireEvent.change(screen.getByTestId('input-unit-price-item-strict-2'), { target: { value: '70.00' } });

      // Abre alternativa e limpa o nome
      fireEvent.click(screen.getByTestId('btn-offer-alternative-item-generic-1'));
      fireEvent.change(screen.getByTestId('input-brand-name-item-generic-1'), { target: { value: '   ' } });

      fireEvent.click(screen.getByTestId('btn-submit-bid'));

      await waitFor(() => {
        expect(
          screen.getByText('Informe o nome da marca ou produto alternativo')
        ).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem amigável quando a cotação não for encontrada', async () => {
      vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(null);

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Cotação Não Disponível')).toBeInTheDocument();
      });
      expect(screen.getByText('Cotação não encontrada ou encerrada.')).toBeInTheDocument();
      expect(screen.getByText('Voltar para Oportunidades')).toBeInTheDocument();
    });

    it('deve tratar erro do serviço ao buscar cotação', async () => {
      vi.spyOn(quotationService, 'getQuotationById').mockRejectedValue(new Error('Falha de rede'));

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Cotação Não Disponível')).toBeInTheDocument();
      });
      expect(screen.getByText('Erro ao carregar detalhes da cotação.')).toBeInTheDocument();
    });

    it('deve tratar erro ao submeter proposta com falha na API ou serviço', async () => {
      vi.spyOn(quotationService, 'submitBid').mockRejectedValue(new Error('Erro interno'));

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Cotação Safra Café - Defensivos e Fertilizantes')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-unit-price-item-generic-1'), { target: { value: '50.00' } });
      fireEvent.change(screen.getByTestId('input-unit-price-item-strict-2'), { target: { value: '70.00' } });

      fireEvent.click(screen.getByTestId('btn-submit-bid'));

      await waitFor(() => {
        expect(
          screen.getByText('Não foi possível registrar a proposta. Tente novamente.')
        ).toBeInTheDocument();
      });
    });

    it('deve lidar com ausência de ID de cotação na rota', async () => {
      mockRouteParams = {};

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Cotação Não Disponível')).toBeInTheDocument();
      });
      expect(screen.getByText('Identificador da cotação não informado.')).toBeInTheDocument();
    });
  });

  describe('Permissões e Segurança de Acesso', () => {
    it('deve bloquear acesso para usuário não autenticado', async () => {
      localStorage.removeItem('cotacampo_auth_user');

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Acesso Restrito à Revenda')).toBeInTheDocument();
      });
      expect(screen.getByText('Cadastrar Minha Revenda')).toBeInTheDocument();
    });

    it('deve bloquear acesso para usuário autenticado com perfil PRODUTOR', async () => {
      localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Acesso Restrito à Revenda')).toBeInTheDocument();
      });
      expect(screen.getByText(/Você precisa estar autenticado como Revendedor \(RTV\)/)).toBeInTheDocument();
    });

    it('deve permitir selecionar modalidades de pagamento À Vista, 60 dias e preencher observações', async () => {
      const submitBidSpy = vi.spyOn(quotationService, 'submitBid');
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Cotação Safra Café - Defensivos e Fertilizantes')).toBeInTheDocument();
      });

      // Testa seleção de À Vista
      fireEvent.click(screen.getByTestId('radio-payment-avista'));

      // Testa seleção de 60 dias
      fireEvent.click(screen.getByTestId('radio-payment-prazo60'));

      // Testa seleção de 30 dias
      fireEvent.click(screen.getByTestId('radio-payment-prazo30'));

      // Preenche observações adicionais
      const inputNotes = screen.getByTestId('input-bid-notes');
      fireEvent.change(inputNotes, { target: { value: 'Pagamento flexível safra 2026.' } });

      // Preenche valores unitários
      fireEvent.change(screen.getByTestId('input-unit-price-item-generic-1'), { target: { value: '52.00' } });
      fireEvent.change(screen.getByTestId('input-unit-price-item-strict-2'), { target: { value: '78.00' } });

      fireEvent.click(screen.getByTestId('btn-submit-bid'));

      await waitFor(() => {
        expect(screen.getByTestId('bid-submitted-success')).toBeInTheDocument();
      });

      expect(submitBidSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'PRAZO_30',
          notes: 'Pagamento flexível safra 2026.',
        })
      );
    });

    it('deve exibir badge FOB quando a cotação for do tipo FOB', async () => {
      vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue({
        ...mockQuotationCIF,
        freightType: 'FOB',
      });

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('badge-freight-type')).toHaveTextContent('FOB (Retirada na revenda)');
      });
    });
  });

  describe('Responsividade e Layout', () => {
    it('deve renderizar perfeitamente no Mobile (375x667)', async () => {
      window.innerWidth = 375;
      window.innerHeight = 667;
      window.dispatchEvent(new Event('resize'));

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Responder Cotação')).toBeInTheDocument();
      });
      expect(screen.getByTestId('btn-submit-bid')).toBeInTheDocument();
    });

    it('deve renderizar perfeitamente no Tablet (768x1024)', async () => {
      window.innerWidth = 768;
      window.innerHeight = 1024;
      window.dispatchEvent(new Event('resize'));

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Responder Cotação')).toBeInTheDocument();
      });
      expect(screen.getByTestId('btn-submit-bid')).toBeInTheDocument();
    });

    it('deve renderizar perfeitamente no Desktop (1280x800)', async () => {
      window.innerWidth = 1280;
      window.innerHeight = 800;
      window.dispatchEvent(new Event('resize'));

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Responder Cotação')).toBeInTheDocument();
      });
      expect(screen.getByTestId('btn-submit-bid')).toBeInTheDocument();
    });
  });
});

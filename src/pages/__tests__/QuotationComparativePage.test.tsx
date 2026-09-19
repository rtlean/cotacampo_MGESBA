import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotationComparativePage } from '../QuotationComparativePage';
import { quotationService } from '../../services/quotation.service';
import { QuotationRequest, QuotationBid } from '../../types/quotation';

// Mock do wouter: useRoute retornando params: { id: 'quote-test-123' }
const mockUseRoute = vi.fn();
vi.mock('wouter', () => ({
  useRoute: (pattern: string) => mockUseRoute(pattern),
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock do AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'prod-user-1',
      name: 'João Produtor',
      role: 'PRODUCER',
      crops: ['cafe_conilon'],
    },
  }),
}));

describe('US09 – Análise Comparativa Equalizada de Propostas (QuotationComparativePage)', () => {
  const mockQuote: QuotationRequest = {
    id: 'quote-test-123',
    producerId: 'prod-user-1',
    title: 'Defensivos e Fertilizantes para Café Conilon',
    status: 'OPEN',
    targetState: 'ES',
    targetCity: 'Linhares',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    displayCode: 'COT-009',
    freightType: 'CIF',
    paymentTerms: '30/60 dias',
    items: [
      {
        id: 'item-1',
        productName: 'Fungicida Dithane NT',
        activeIngredient: 'Mancozebe',
        quantity: 50,
        unit: 'Kg',
        acceptsGeneric: true,
      },
      {
        id: 'item-2',
        productName: 'Adubo NPK 20-05-20',
        activeIngredient: 'Nitrogênio, Fósforo, Potássio',
        quantity: 1000,
        unit: 'Kg',
        acceptsGeneric: false,
      },
    ],
    itemsCount: 2,
    bidsCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockBids: QuotationBid[] = [
    {
      id: 'bid-1',
      quotationId: 'quote-test-123',
      resellerId: 'reseller-1',
      resellerName: 'AgroCenter Linhares Ltda',
      resellerTradeName: 'AgroCenter Linhares',
      resellerCity: 'Linhares',
      resellerState: 'ES',
      items: [
        {
          id: 'b-it-1',
          quotationItemId: 'item-1',
          productName: 'Fungicida Dithane NT',
          brandName: 'Dithane NT Original',
          unitPrice: 85.00,
          totalPrice: 4250.00,
          isEquivalent: false,
        },
        {
          id: 'b-it-2',
          quotationItemId: 'item-2',
          productName: 'Adubo NPK 20-05-20',
          brandName: 'Adubo NPK 20-05-20',
          unitPrice: 4.00,
          totalPrice: 4000.00,
          isEquivalent: false,
        },
      ],
      freightCost: 150.00,
      deliveryDays: 2, // Entrega Mais Rápida
      totalAmount: 8400.00,
      rtvName: 'Carlos Eduardo Mendes',
      rtvPhone: '(27) 99888-7711',
      status: 'SUBMITTED',
      notes: 'Entrega rápida com frota própria em Linhares.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'bid-2',
      quotationId: 'quote-test-123',
      resellerId: 'reseller-2',
      resellerName: 'Café & Campo Distribuidora Ltda',
      resellerTradeName: 'Café & Campo Insumos',
      resellerCity: 'Colatina',
      resellerState: 'ES',
      items: [
        {
          id: 'b-it-3',
          quotationItemId: 'item-1',
          productName: 'Fungicida Dithane NT',
          brandName: 'Manzate 750 WG (UPL)',
          unitPrice: 70.00,
          totalPrice: 3500.00,
          isEquivalent: true, // Equivalente ofertado
          activeIngredientConcentration: 'Mancozebe 750 g/kg (75% m/m)',
          notes: 'Produto equivalente homologado no MAPA.',
        },
        {
          id: 'b-it-4',
          quotationItemId: 'item-2',
          productName: 'Adubo NPK 20-05-20',
          brandName: 'Adubo NPK 20-05-20',
          unitPrice: 3.50,
          totalPrice: 3500.00,
          isEquivalent: false,
        },
      ],
      freightCost: 0.00, // Frete Grátis
      deliveryDays: 5,
      totalAmount: 7000.00, // Menor Preço Global
      rtvName: 'Renata Viana',
      rtvPhone: '(27) 99777-6622',
      status: 'SUBMITTED',
      notes: 'Frete cortesia para entrega de lote fechado.',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoute.mockReturnValue([true, { id: 'quote-test-123' }]);
  });

  it('Cenário 1: deve exibir matriz comparativa com colunas lado a lado, discriminando Preço Unitário, Frete, Prazo e Total do Lote', async () => {
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);

    render(<QuotationComparativePage />);

    // Verifica tela de carregamento inicial
    expect(screen.getByText(/Equalizando propostas/i)).toBeInTheDocument();

    // Aguarda renderização da tabela
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // 1. Deve visualizar as revendas dispostas em colunas lado a lado
    expect(screen.getAllByText('AgroCenter Linhares').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Café & Campo Insumos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Linhares/ES').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Colatina/ES')).toBeInTheDocument();

    // 2. Detalhes: Preço Unitário de cada item
    expect(screen.getByText(/R\$\s*85,00/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*70,00/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*4,00/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*3,50/i)).toBeInTheDocument();

    // 3. Custo de Frete discriminado
    expect(screen.getByTestId('freight-cost-bid-1')).toHaveTextContent(/R\$\s*150,00/i);
    expect(screen.getByTestId('freight-cost-bid-2')).toHaveTextContent(/Grátis \(R\$\s*0,00\)/i);

    // 4. Prazo de Entrega (dias)
    expect(screen.getByTestId('delivery-days-bid-1')).toHaveTextContent(/2 dias/i);
    expect(screen.getByTestId('delivery-days-bid-2')).toHaveTextContent(/5 dias/i);

    // 5. Valor Total do Lote somado equalizado
    expect(screen.getByTestId('total-amount-bid-1')).toHaveTextContent(/R\$\s*8\.400,00/i);
    expect(screen.getByTestId('total-amount-bid-2')).toHaveTextContent(/R\$\s*7\.000,00/i);
  });

  it('Cenário 1: revenda com menor custo total somado deve receber automaticamente a tag [ Melhor Preço Global ]', async () => {
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByTestId('badge-best-price-bid-2')).toBeInTheDocument();
    });

    const bestPriceBadge = screen.getByTestId('badge-best-price-bid-2');
    expect(bestPriceBadge).toHaveTextContent('[ Melhor Preço Global ]');
    // Revenda 1 não deve ter tag de melhor preço
    expect(screen.queryByTestId('badge-best-price-bid-1')).not.toBeInTheDocument();
  });

  it('Cenário 1: revenda com menor número de dias para entrega deve receber a tag [ Entrega Mais Rápida ]', async () => {
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByTestId('badge-fastest-delivery-bid-1')).toBeInTheDocument();
    });

    const fastestBadge = screen.getByTestId('badge-fastest-delivery-bid-1');
    expect(fastestBadge).toHaveTextContent('[ Entrega Mais Rápida ]');
    // Revenda 2 não deve ter tag de entrega mais rápida
    expect(screen.queryByTestId('badge-fastest-delivery-bid-2')).not.toBeInTheDocument();
  });

  it('Cenário 1: caso uma revenda tenha tanto o menor preço quanto a entrega mais rápida, deve receber ambos os badges', async () => {
    const superBids: QuotationBid[] = [
      {
        ...mockBids[0],
        id: 'super-reseller',
        totalAmount: 5000.00, // Menor valor
        deliveryDays: 1, // Menor prazo
      },
      {
        ...mockBids[1],
        id: 'other-reseller',
        totalAmount: 9000.00,
        deliveryDays: 7,
      },
    ];

    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(superBids);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByTestId('badge-best-price-super-reseller')).toBeInTheDocument();
      expect(screen.getByTestId('badge-fastest-delivery-super-reseller')).toBeInTheDocument();
    });

    expect(screen.getByTestId('badge-best-price-super-reseller')).toHaveTextContent('[ Melhor Preço Global ]');
    expect(screen.getByTestId('badge-fastest-delivery-super-reseller')).toHaveTextContent('[ Entrega Mais Rápida ]');
  });

  it('Cenário 2: revenda que ofertou produto alternativo com "Aceita Genérico: Sim" deve exibir o nome da marca com o badge [ Equivalente Ofertado ] e tooltip com concentração do princípio ativo', async () => {
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByText('Manzate 750 WG (UPL)')).toBeInTheDocument();
    });

    // Badge [ Equivalente Ofertado ]
    const equivalentBadge = screen.getByTestId('badge-equivalent-bid-2-0');
    expect(equivalentBadge).toBeInTheDocument();
    expect(equivalentBadge).toHaveTextContent('[ Equivalente Ofertado ]');

    // Tooltip inicialmente fechado
    expect(screen.queryByTestId('tooltip-equivalent-bid-2-0')).not.toBeInTheDocument();

    // Hover sobre o badge abre o tooltip
    fireEvent.mouseEnter(equivalentBadge);
    expect(screen.getByTestId('tooltip-equivalent-bid-2-0')).toBeInTheDocument();
    expect(screen.getByText(/Mancozebe 750 g\/kg \(75% m\/m\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Auditoria de Princípio Ativo/i)).toBeInTheDocument();

    // Mouse leave fecha o tooltip
    fireEvent.mouseLeave(equivalentBadge);
    expect(screen.queryByTestId('tooltip-equivalent-bid-2-0')).not.toBeInTheDocument();

    // Click/Focus também abre o tooltip (acessibilidade / mobile)
    fireEvent.click(equivalentBadge);
    expect(screen.getByTestId('tooltip-equivalent-bid-2-0')).toBeInTheDocument();

    // Segundo clique fecha o tooltip
    fireEvent.click(equivalentBadge);
    expect(screen.queryByTestId('tooltip-equivalent-bid-2-0')).not.toBeInTheDocument();

    // Focus abre e Blur fecha
    fireEvent.focus(equivalentBadge);
    expect(screen.getByTestId('tooltip-equivalent-bid-2-0')).toBeInTheDocument();
    fireEvent.blur(equivalentBadge);
    expect(screen.queryByTestId('tooltip-equivalent-bid-2-0')).not.toBeInTheDocument();
  });

  it('deve exibir mensagem amigável quando a cotação não for encontrada', async () => {
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(null);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByText('Cotação Não Encontrada')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Voltar ao Painel/i })).toBeInTheDocument();
  });

  it('deve exibir estado de aviso amigável quando houver menos de 2 propostas recebidas', async () => {
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue([mockBids[0]]); // Apenas 1 proposta

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByText('Aguardando Lances Concorrentes')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/A matriz comparativa equalizada requer no mínimo/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 propostas de revendas distintas/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Propostas recebidas até o momento:/i)).toBeInTheDocument();
  });

  it('deve permitir que o produtor abra o modal de segurança e confirme o Aceite do Lote Completo', async () => {
    const acceptFullLotSpy = vi.spyOn(quotationService, 'acceptFullLot').mockResolvedValue(mockBids[1]);
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-accept-full-lot-bid-2')).toBeInTheDocument();
    });

    // 1. Clica em "Aceitar Lote Completo" da revenda 2 (Melhor Preço)
    fireEvent.click(screen.getByTestId('btn-accept-full-lot-bid-2'));

    // Modal de segurança deve abrir
    await waitFor(() => {
      expect(screen.getByText('Confirmar Aceite do Lote Completo')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Café & Campo Insumos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Renata Viana').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('(27) 99777-6622').length).toBeGreaterThanOrEqual(1);

    // Testa fechar/cancelar modal com botão X
    fireEvent.click(screen.getByTestId('btn-cancel-modal'));
    expect(screen.queryByText('Confirmar Aceite do Lote Completo')).not.toBeInTheDocument();
    expect(acceptFullLotSpy).not.toHaveBeenCalled();

    // Reabre e testa fechar com botão Cancelar
    fireEvent.click(screen.getByTestId('btn-accept-full-lot-bid-2'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-cancel-full-lot-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-cancel-full-lot-modal'));
    expect(screen.queryByText('Confirmar Aceite do Lote Completo')).not.toBeInTheDocument();

    // Reabre e confirma
    fireEvent.click(screen.getByTestId('btn-accept-full-lot-bid-2'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-confirm-full-lot-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-confirm-full-lot-modal'));

    await waitFor(() => {
      expect(acceptFullLotSpy).toHaveBeenCalledWith('quote-test-123', 'bid-2');
      expect(screen.getByText('Proposta Vencedora Confirmada!')).toBeInTheDocument();
    });

    // O botão da revenda aceita muda para "Proposta Escolhida"
    expect(screen.getByText('Proposta Escolhida')).toBeInTheDocument();

    // Fecha o alerta de confirmação
    fireEvent.click(screen.getByRole('button', { name: /Fechar/i }));
    expect(screen.queryByText('Proposta Vencedora Confirmada!')).not.toBeInTheDocument();
  });

  describe('US10 – Aceite de Proposta e Fechamento via WhatsApp', () => {
    it('Cenário 1: Aceite do Lote Completo e abertura de conversa no WhatsApp com mensagem pré-preenchida', async () => {
      const quoteInReview: QuotationRequest = {
        ...mockQuote,
        status: 'IN_REVIEW',
      };

      const winningBid = {
        ...mockBids[0],
        status: 'ACCEPTED' as const,
        awardType: 'FULL' as const,
      };

      vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(quoteInReview);
      vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);
      const acceptFullLotSpy = vi.spyOn(quotationService, 'acceptFullLot').mockResolvedValue(winningBid);

      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByTestId('btn-accept-full-lot-bid-1')).toBeInTheDocument();
      });

      // Produtor clica em "Aceitar Lote Completo" na coluna da AgroCenter Linhares
      fireEvent.click(screen.getByTestId('btn-accept-full-lot-bid-1'));

      // Modal de segurança exibido
      await waitFor(() => {
        expect(screen.getByText('Confirmar Aceite do Lote Completo')).toBeInTheDocument();
      });
      expect(screen.getAllByText('AgroCenter Linhares').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Carlos Eduardo Mendes').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('(27) 99888-7711').length).toBeGreaterThanOrEqual(1);

      // Confirma a decisão no modal de segurança
      fireEvent.click(screen.getByTestId('btn-confirm-full-lot-modal'));

      await waitFor(() => {
        expect(acceptFullLotSpy).toHaveBeenCalledWith('quote-test-123', 'bid-1');
      });

      // Sistema deve renderizar o botão [ Chamar no WhatsApp ]
      await waitFor(() => {
        const whatsAppBtns = screen.getAllByTestId(/btn-whatsapp-/);
        expect(whatsAppBtns.length).toBeGreaterThan(0);
      });

      const whatsAppBtn = screen.getByTestId('btn-whatsapp-bid-1');
      expect(whatsAppBtn).toBeInTheDocument();
      expect(whatsAppBtn).toHaveAttribute('target', '_blank');
      expect(whatsAppBtn).toHaveAttribute('rel', 'noopener noreferrer');

      // Verifica texto e URL do WhatsApp
      const href = whatsAppBtn.getAttribute('href') || '';
      expect(href).toContain('https://wa.me/5527998887711?text=');

      // Mensagem esperada:
      // "Olá Carlos Eduardo Mendes, aceitei sua proposta para a Cotação #COT-009 no CotaCampo no valor total de R$ 8.400,00. Vamos finalizar o pedido e o faturamento?"
      const expectedMessage =
        'Olá Carlos Eduardo Mendes, aceitei sua proposta para a Cotação #COT-009 no CotaCampo no valor total de R$ 8.400,00. Vamos finalizar o pedido e o faturamento?';
      expect(href).toContain(encodeURIComponent(expectedMessage));
    });

    it('Cenário 2: Aceite Parcial (Item a Item) com múltiplos fornecedores e botões individuais de WhatsApp', async () => {
      vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
      vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);

      const partialSummaryResult = [
        {
          bidId: 'bid-1',
          resellerId: 'reseller-1',
          resellerName: 'AgroCenter Linhares Ltda',
          resellerTradeName: 'AgroCenter Linhares',
          rtvName: 'Carlos Eduardo Mendes',
          rtvPhone: '(27) 99888-7711',
          awardedItems: [mockBids[0].items[0]],
          subtotal: 4250.0,
          freightCost: 0,
          totalAmount: 4250.0,
          whatsAppUrl: quotationService.generateWhatsAppUrl({
            rtvName: 'Carlos Eduardo Mendes',
            rtvPhone: '(27) 99888-7711',
            quotationCode: 'COT-009',
            totalAmount: 4250.0,
          }),
        },
        {
          bidId: 'bid-2',
          resellerId: 'reseller-2',
          resellerName: 'Café & Campo Distribuidora Ltda',
          resellerTradeName: 'Café & Campo Insumos',
          rtvName: 'Renata Viana',
          rtvPhone: '(27) 99777-6622',
          awardedItems: [mockBids[1].items[1]],
          subtotal: 3500.0,
          freightCost: 0,
          totalAmount: 3500.0,
          whatsAppUrl: quotationService.generateWhatsAppUrl({
            rtvName: 'Renata Viana',
            rtvPhone: '(27) 99777-6622',
            quotationCode: 'COT-009',
            totalAmount: 3500.0,
          }),
        },
      ];

      const acceptPartialSpy = vi
        .spyOn(quotationService, 'acceptPartialItems')
        .mockResolvedValue(partialSummaryResult);

      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByTestId('btn-select-item-bid-1-0')).toBeInTheDocument();
        expect(screen.getByTestId('btn-select-item-bid-2-1')).toBeInTheDocument();
      });

      // Seleciona Item 1 da Revenda 1
      fireEvent.click(screen.getByTestId('btn-select-item-bid-1-0'));
      expect(screen.getByText('1 de 2 itens selecionados')).toBeInTheDocument();

      // Seleciona Item 2 da Revenda 2
      fireEvent.click(screen.getByTestId('btn-select-item-bid-2-1'));
      expect(screen.getByText('2 de 2 itens selecionados')).toBeInTheDocument();

      // Testa desmarcar e remarcar item
      fireEvent.click(screen.getByTestId('btn-select-item-bid-2-1'));
      expect(screen.getByText('1 de 2 itens selecionados')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('btn-select-item-bid-2-1'));
      expect(screen.getByText('2 de 2 itens selecionados')).toBeInTheDocument();

      // Testa botão "Limpar"
      fireEvent.click(screen.getByRole('button', { name: /Limpar/i }));
      expect(screen.queryByText('itens selecionados')).not.toBeInTheDocument();

      // Seleciona ambos novamente
      fireEvent.click(screen.getByTestId('btn-select-item-bid-1-0'));
      fireEvent.click(screen.getByTestId('btn-select-item-bid-2-1'));

      // Clica no botão geral "Confirmar Escolhas Selecionadas" da barra flutuante
      fireEvent.click(screen.getByTestId('btn-confirm-partial-selection'));

      // Modal de segurança para aceite fracionado deve abrir
      expect(screen.getByText('Confirmar Aceite Parcial (Item a Item)')).toBeInTheDocument();
      expect(screen.getByText(/Divisão de fornecimento por revenda selecionada/i)).toBeInTheDocument();

      // Testa fechar o modal
      fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
      expect(screen.queryByText('Confirmar Aceite Parcial (Item a Item)')).not.toBeInTheDocument();

      // Reabre e testa fechar com botão X
      fireEvent.click(screen.getByTestId('btn-confirm-partial-selection'));
      fireEvent.click(screen.getByTestId('btn-close-partial-modal'));
      expect(screen.queryByText('Confirmar Aceite Parcial (Item a Item)')).not.toBeInTheDocument();

      // Reabre e confirma
      fireEvent.click(screen.getByTestId('btn-confirm-partial-selection'));
      fireEvent.click(screen.getByTestId('btn-confirm-partial-modal'));

      await waitFor(() => {
        expect(acceptPartialSpy).toHaveBeenCalledWith('quote-test-123', {
          'item-1': 'bid-1',
          'item-2': 'bid-2',
        });
      });

      // Tela de resumo deve disponibilizar botões individuais de WhatsApp para cada um dos RTVs premiados
      await waitFor(() => {
        expect(screen.getByTestId('btn-whatsapp-bid-1')).toBeInTheDocument();
        expect(screen.getByTestId('btn-whatsapp-bid-2')).toBeInTheDocument();
      });

      const btnRtv1 = screen.getByTestId('btn-whatsapp-bid-1');
      const btnRtv2 = screen.getByTestId('btn-whatsapp-bid-2');

      expect(btnRtv1.getAttribute('href')).toContain('https://wa.me/5527998887711');
      expect(btnRtv2.getAttribute('href')).toContain('https://wa.me/5527997776622');
    });

    it('deve tratar erro no aceite parcial com registro em console.error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
      vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);
      vi.spyOn(quotationService, 'acceptPartialItems').mockRejectedValue(new Error('Partial fail'));

      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByTestId('btn-select-item-bid-1-0')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-select-item-bid-1-0'));
      fireEvent.click(screen.getByTestId('btn-confirm-partial-selection'));
      fireEvent.click(screen.getByTestId('btn-confirm-partial-modal'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao confirmar seleção parcial:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  it('deve exibir badge Proposta Aceita se uma proposta já vier com status ACCEPTED do banco', async () => {
    const bidsWithAccepted: QuotationBid[] = [
      { ...mockBids[0], status: 'REJECTED' },
      { ...mockBids[1], status: 'ACCEPTED', awardType: 'FULL' },
    ];
    const awardedQuote = { ...mockQuote, status: 'AWARDED' as const };

    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(awardedQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(bidsWithAccepted);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByText('Proposta Aceita')).toBeInTheDocument();
      expect(screen.getByText('Cotação Concluída')).toBeInTheDocument();
    });
  });

  it('deve lidar com caso onde um item não foi cotado por uma revenda específica', async () => {
    const incompleteBids: QuotationBid[] = [
      mockBids[0],
      {
        ...mockBids[1],
        items: [mockBids[1].items[0]], // Não cotou o item 2
      },
    ];

    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(incompleteBids);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByText('Item não cotado')).toBeInTheDocument();
    });
  });

  it('deve tratar erro ao carregar dados ou aceitar proposta graciosamente', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(quotationService, 'getQuotationById').mockRejectedValue(new Error('Network error'));

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao carregar dados do comparativo:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('deve tratar erro ao aceitar lote completo com falha no serviço', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);
    vi.spyOn(quotationService, 'acceptFullLot').mockRejectedValue(new Error('Accept full lot failed'));

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-accept-full-lot-bid-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-accept-full-lot-bid-1'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-confirm-full-lot-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-confirm-full-lot-modal'));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao aceitar proposta:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('deve lidar com quotationId vazio na rota', async () => {
    mockUseRoute.mockReturnValue([true, { id: '' }]);
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(null);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByText('Cotação Não Encontrada')).toBeInTheDocument();
    });
  });
});

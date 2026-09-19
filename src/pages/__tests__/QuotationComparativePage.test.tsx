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

  it('deve permitir que o produtor aceite uma proposta e atualize o estado para Proposta Escolhida', async () => {
    const acceptBidSpy = vi.spyOn(quotationService, 'acceptBid').mockResolvedValue();
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-accept-bid-2')).toBeInTheDocument();
    });

    // Clica no botão Aceitar Proposta da revenda 2 (Melhor Preço)
    fireEvent.click(screen.getByTestId('btn-accept-bid-2'));

    await waitFor(() => {
      expect(acceptBidSpy).toHaveBeenCalledWith('quote-test-123', 'bid-2');
      expect(screen.getByText('Proposta Vencedora Confirmada!')).toBeInTheDocument();
    });

    // O botão da revenda aceita muda para "Proposta Escolhida"
    expect(screen.getByText('Proposta Escolhida')).toBeInTheDocument();

    // Fecha o alerta de confirmação
    fireEvent.click(screen.getByRole('button', { name: /Fechar/i }));
    expect(screen.queryByText('Proposta Vencedora Confirmada!')).not.toBeInTheDocument();
  });

  it('deve exibir badge Proposta Aceita se uma proposta já vier com status ACCEPTED do banco', async () => {
    const bidsWithAccepted: QuotationBid[] = [
      { ...mockBids[0], status: 'REJECTED' },
      { ...mockBids[1], status: 'ACCEPTED' },
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

  it('deve tratar erro ao aceitar proposta com falha no serviço', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);
    vi.spyOn(quotationService, 'acceptBid').mockRejectedValue(new Error('Accept bid failed'));

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-accept-bid-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-accept-bid-1'));

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

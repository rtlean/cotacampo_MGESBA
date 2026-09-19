import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotationComparativePage } from '../QuotationComparativePage';
import { quotationService } from '../../services/quotation.service';
import {
  predictiveAnalysisService,
  FinancialOpinionResult,
} from '../../services/predictive-analysis.service';
import { QuotationRequest, QuotationBid } from '../../types/quotation';

// Mock do wouter
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

describe('US12 – Análise Preditiva de Janela de Compra e Modalidade Financeira (QuotationComparativePage)', () => {
  const mockBaseQuotation: QuotationRequest = {
    id: 'quote-us12-123',
    producerId: 'prod-user-1',
    title: 'Adubação de Cobertura Safra Café',
    status: 'OPEN',
    targetState: 'ES',
    targetCity: 'Linhares',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    displayCode: 'COT-US12',
    freightType: 'CIF',
    paymentTerms: 'Safra ou À Vista',
    agronomicWindow: 'adubação de cobertura de novembro',
    notes: 'Aplicação pós-chuva na primeira quinzena de novembro',
    items: [
      {
        id: 'item-1',
        productName: 'Adubo NPK 20-05-20',
        activeIngredient: 'NPK',
        quantity: 500,
        unit: 'Sc',
        acceptsGeneric: false,
      },
    ],
    itemsCount: 1,
    bidsCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockUS12Bids: QuotationBid[] = [
    {
      id: 'bid-term-x',
      quotationId: 'quote-us12-123',
      resellerId: 'reseller-x',
      resellerName: 'Revenda X',
      resellerTradeName: 'Revenda X',
      resellerCity: 'Linhares',
      resellerState: 'ES',
      rtvName: 'Carlos X',
      rtvPhone: '(27) 99999-1111',
      status: 'PENDING',
      freightCost: 0,
      deliveryDays: 25, // Prazo de 25 dias (menor preço, mas prazo longo)
      totalAmount: 50000,
      termPriceTotal: 58400,
      interestRateMonthly: 1.8,
      paymentMethod: 'TERM_HARVEST',
      paymentTerms: 'Pagamento Safra',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'b-it-1',
          quotationItemId: 'item-1',
          productName: 'Adubo NPK 20-05-20',
          brandName: 'NPK 20-05-20 Fertilizantes',
          unitPrice: 100.0,
          totalPrice: 50000.0,
          isEquivalent: false,
        },
      ],
    },
    {
      id: 'bid-cash-y',
      quotationId: 'quote-us12-123',
      resellerId: 'reseller-y',
      resellerName: 'Revenda Y',
      resellerTradeName: 'Proposta B',
      resellerCity: 'Colatina',
      resellerState: 'ES',
      rtvName: 'Fernando Y',
      rtvPhone: '(27) 99888-2222',
      status: 'PENDING',
      freightCost: 0,
      deliveryDays: 4, // Entrega em 4 dias (garante entrega segura)
      totalAmount: 50000,
      cashPriceTotal: 50000,
      paymentMethod: 'CASH',
      paymentTerms: 'Pagamento À Vista',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'b-it-2',
          quotationItemId: 'item-1',
          productName: 'Adubo NPK 20-05-20',
          brandName: 'NPK 20-05-20 Premium',
          unitPrice: 100.0,
          totalPrice: 50000.0,
          isEquivalent: false,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoute.mockReturnValue([true, { id: 'quote-us12-123' }]);

    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(mockBaseQuotation);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockUS12Bids);
    vi.spyOn(quotationService, 'calculateComparativeAnalysis').mockReturnValue({
      cheapestTotalBidId: 'bid-term-x',
      fastestDeliveryBidId: 'bid-cash-y',
      itemBestPrices: {},
      itemFastestDelivery: {},
      savingsVsAverage: 8400,
      totalDifferencePercent: 14.3,
    });
    vi.spyOn(quotationService, 'getAwardedResellersSummary').mockReturnValue([]);
  });

  describe('Cenário 1: Avaliação de Custo Financeiro (À Vista vs. Prazo Safra)', () => {
    it('deve exibir o botão [ Consultar Parecer da IA ] e ao clicar calcular taxa implícita e emitir parecer objetivo', async () => {
      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByText('Análise Comparativa Equalizada')).toBeInTheDocument();
      });

      const btnConsult = screen.getByTestId('btn-consult-ai-opinion');
      expect(btnConsult).toBeInTheDocument();
      expect(btnConsult).toHaveTextContent('[ Consultar Parecer da IA ]');

      // O card do parecer financeiro ainda não deve estar visível
      expect(screen.queryByTestId('ai-financial-opinion-card')).not.toBeInTheDocument();

      // Clica em [ Consultar Parecer da IA ]
      fireEvent.click(btnConsult);

      // Card da IA deve aparecer imediatamente com o parecer formatado
      const financialCard = screen.getByTestId('ai-financial-opinion-card');
      expect(financialCard).toBeInTheDocument();

      // Parecer objetivo da US12:
      // "A proposta a prazo da Revenda X cobra juros de 1,8% a.m., superior ao crédito de custeio padrão. Se você tiver limite no banco, pagar à vista com a Revenda Y economiza R$ 8.400 no lote."
      expect(financialCard).toHaveTextContent(
        'A proposta a prazo da Revenda X cobra juros de 1,8% a.m., superior ao crédito de custeio padrão. Se você tiver limite no banco, pagar à vista com a Proposta B economiza R$ 8.400 no lote.'
      );

      // Deve destacar as métricas financeiras
      expect(financialCard).toHaveTextContent('1,8% a.m.');
      expect(financialCard).toHaveTextContent('R$ 8.400');

      // Deve permitir fechar o card
      const closeBtn = screen.getByLabelText('Fechar parecer da IA');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('ai-financial-opinion-card')).not.toBeInTheDocument();
    });

    it('deve permitir abrir o parecer financeiro através do botão secundário no banner de inteligência', async () => {
      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByTestId('btn-consult-ai-opinion-banner')).toBeInTheDocument();
      });

      const bannerBtn = screen.getByTestId('btn-consult-ai-opinion-banner');
      fireEvent.click(bannerBtn);

      expect(screen.getByTestId('ai-financial-opinion-card')).toBeInTheDocument();
    });

    it('deve emitir parecer indicando juros competitivos caso a taxa implícita seja menor que o crédito de custeio', async () => {
      const competitiveBids: QuotationBid[] = [
        {
          ...mockUS12Bids[0],
          interestRateMonthly: 0.9,
          termPriceTotal: 50900,
        },
        {
          ...mockUS12Bids[1],
          cashPriceTotal: 50000,
        },
      ];

      vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(competitiveBids);

      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByTestId('btn-consult-ai-opinion')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-consult-ai-opinion'));

      const card = screen.getByTestId('ai-financial-opinion-card');
      expect(card).toHaveTextContent('competitiva frente ao crédito de custeio padrão');
      expect(card).toHaveTextContent('0,9% a.m.');
    });

    it('deve calcular parecer financeiro sob demanda caso financialOpinion inicial seja nulo', async () => {
      const spy = vi
        .spyOn(predictiveAnalysisService, 'analyzeFinancialModalities')
        .mockReturnValueOnce(null as unknown as FinancialOpinionResult)
        .mockReturnValueOnce({
          hasAnalysis: true,
          termResellerName: 'Revenda X',
          cashResellerName: 'Revenda Y',
          implicitMonthlyRate: 1.8,
          marketMonthlyRate: 1.05,
          savingsCashAmount: 8400,
          opinionText: 'Parecer recalculado com sucesso.',
          termTotal: 58400,
          cashTotal: 50000,
        });

      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByTestId('btn-consult-ai-opinion')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-consult-ai-opinion'));

      expect(spy).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('ai-financial-opinion-card')).toHaveTextContent(
        'Parecer recalculado com sucesso.'
      );
    });
  });

  describe('Cenário 2: Análise de Risco de Prazo de Entrega vs. Janela Agronômica', () => {
    it('deve carregar a tela e destacar a bandeira de risco logístico quando prazo for 25 dias vs 4 dias na adubação de novembro', async () => {
      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByTestId('ai-logistical-risk-card')).toBeInTheDocument();
      });

      const riskCard = screen.getByTestId('ai-logistical-risk-card');

      // Texto exato do Cenário 2 da US12:
      // "Risco de perda da janela de aplicação: A proposta de menor preço pode não chegar a tempo para a adubação pós-chuva. A proposta B garante entrega segura."
      expect(riskCard).toHaveTextContent(
        'Risco de perda da janela de aplicação: A proposta de menor preço pode não chegar a tempo para a adubação pós-chuva. A proposta B garante entrega segura.'
      );
    });

    it('não deve exibir bandeira de risco logístico caso todas as propostas tenham prazos ágeis', async () => {
      const safeBids: QuotationBid[] = [
        {
          ...mockUS12Bids[0],
          deliveryDays: 5,
        },
        {
          ...mockUS12Bids[1],
          deliveryDays: 4,
        },
      ];

      vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(safeBids);

      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByText('Análise Comparativa Equalizada')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('ai-logistical-risk-card')).not.toBeInTheDocument();
    });
  });

  describe('Casos Extremos e Responsividade', () => {
    it('não deve quebrar quando houver menos de 2 propostas e exibir estado aguardando', async () => {
      vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue([mockUS12Bids[0]]);

      render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByText('Aguardando Lances Concorrentes')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('ai-logistical-risk-card')).not.toBeInTheDocument();
    });

    it('deve renderizar responsivamente em telas mobile e tablet sem erros', async () => {
      // Simula viewport mobile (375px)
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));

      const { rerender } = render(<QuotationComparativePage />);

      await waitFor(() => {
        expect(screen.getByTestId('ai-logistical-risk-card')).toBeInTheDocument();
        expect(screen.getByTestId('btn-consult-ai-opinion')).toBeInTheDocument();
      });

      // Simula viewport tablet (768px)
      window.innerWidth = 768;
      window.dispatchEvent(new Event('resize'));
      rerender(<QuotationComparativePage />);

      expect(screen.getByTestId('ai-logistical-risk-card')).toBeInTheDocument();

      // Restaura desktop
      window.innerWidth = 1280;
      window.dispatchEvent(new Event('resize'));
    });
  });
});

import { describe, it, expect } from 'vitest';
import { predictiveAnalysisService } from '../predictive-analysis.service';
import { QuotationRequest, QuotationBid } from '../../types/quotation';

describe('PredictiveAnalysisService - Análise Preditiva e Modalidades Financeiras (US12)', () => {
  const baseQuotation: QuotationRequest = {
    id: 'quote-123',
    displayCode: '#COT-00123',
    producerId: 'prod-1',
    producerName: 'Fazenda Santa Maria',
    farmName: 'Fazenda Santa Maria',
    targetCity: 'Linhares',
    targetState: 'ES',
    cropType: 'Café Conilon',
    freightType: 'CIF',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    items: [
      {
        id: 'item-1',
        productName: 'Adubo NPK 20-05-20',
        quantity: 100,
        unit: 'Sc',
        category: 'Fertilizantes',
      },
    ],
  };

  describe('Cenário 1: Avaliação de Custo Financeiro (À Vista vs. Prazo Safra)', () => {
    it('deve retornar hasAnalysis: false quando houver menos de 2 propostas', () => {
      const result = predictiveAnalysisService.analyzeFinancialModalities(baseQuotation, []);
      expect(result.hasAnalysis).toBe(false);
      expect(result.opinionText).toBe('');

      const resultSingle = predictiveAnalysisService.analyzeFinancialModalities(baseQuotation, [
        {
          id: 'bid-1',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda X',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 50000,
          createdAt: new Date().toISOString(),
          items: [],
        },
      ]);
      expect(resultSingle.hasAnalysis).toBe(false);
    });

    it('deve calcular taxa de juros e gerar parecer exato do Cenário 1 com juros de 1,8% a.m. e economia de R$ 8.400', () => {
      const bids: QuotationBid[] = [
        {
          id: 'bid-term',
          quotationId: 'quote-123',
          resellerId: 'res-x',
          resellerName: 'Revenda X',
          resellerTradeName: 'Revenda X',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 10,
          totalAmount: 58400,
          termPriceTotal: 58400,
          interestRateMonthly: 1.8,
          paymentMethod: 'TERM_HARVEST',
          paymentTerms: 'Pagamento Safra',
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-cash',
          quotationId: 'quote-123',
          resellerId: 'res-y',
          resellerName: 'Revenda Y',
          resellerTradeName: 'Revenda Y',
          resellerCity: 'Colatina',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 50000,
          cashPriceTotal: 50000,
          paymentMethod: 'CASH',
          paymentTerms: 'Pagamento À Vista',
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeFinancialModalities(baseQuotation, bids, 1.05);

      expect(result.hasAnalysis).toBe(true);
      expect(result.termResellerName).toBe('Revenda X');
      expect(result.cashResellerName).toBe('Revenda Y');
      expect(result.implicitMonthlyRate).toBe(1.8);
      expect(result.savingsCashAmount).toBe(8400);
      expect(result.opinionText).toBe(
        'A proposta a prazo da Revenda X cobra juros de 1,8% a.m., superior ao crédito de custeio padrão. Se você tiver limite no banco, pagar à vista com a Revenda Y economiza R$ 8.400 no lote.'
      );
    });

    it('deve calcular taxa mensal implícita a partir da diferença de valores caso interestRateMonthly não seja fornecido', () => {
      const bids: QuotationBid[] = [
        {
          id: 'bid-1',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Agro Safra S/A',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 10,
          totalAmount: 112000,
          paymentMethod: 'TERM_HARVEST',
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-2',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'Agro Vista S/A',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 100000,
          cashDiscountPercent: 0,
          paymentMethod: 'CASH',
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeFinancialModalities(baseQuotation, bids, 1.05);

      expect(result.hasAnalysis).toBe(true);
      // Economia = 12.000. Taxa para 6 meses: 12.000 / 100.000 / 6 * 100 = 2.0% a.m.
      expect(result.savingsCashAmount).toBe(12000);
      expect(result.implicitMonthlyRate).toBe(2.0);
      expect(result.opinionText).toContain('cobra juros de 2,0% a.m., superior ao crédito de custeio padrão');
      expect(result.opinionText).toContain('economiza R$ 12.000 no lote');
    });

    it('deve indicar taxa competitiva se a taxa calculada for menor ou igual à taxa de mercado', () => {
      const bids: QuotationBid[] = [
        {
          id: 'bid-1',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda Alpha',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 10,
          totalAmount: 104000,
          interestRateMonthly: 0.8,
          paymentTerms: 'Pagamento Safra',
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-2',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'Revenda Beta',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 100000,
          paymentTerms: 'Pagamento À Vista',
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeFinancialModalities(baseQuotation, bids, 1.05);

      expect(result.opinionText).toContain('competitiva frente ao crédito de custeio padrão');
    });

    it('deve calcular valor com desconto à vista a partir de cashDiscountPercent se cashPriceTotal não estiver definido', () => {
      const bids: QuotationBid[] = [
        {
          id: 'bid-1',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda X',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 10,
          totalAmount: 100000,
          paymentMethod: 'TERM_HARVEST',
          notes: 'Pagamento Safra com juros',
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-2',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'Revenda Y',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 100000,
          cashDiscountPercent: 10, // 100.000 - 10% = 90.000
          notes: 'Pagamento À Vista',
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeFinancialModalities(baseQuotation, bids);
      expect(result.cashTotal).toBe(90000);
      expect(result.savingsCashAmount).toBe(10000);
    });

    it('deve utilizar ordenação por maior/menor totalAmount quando as propostas não tiverem identificadores textuais explícitos', () => {
      const bids: QuotationBid[] = [
        {
          id: 'bid-high',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda Alta',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 10,
          totalAmount: 120000,
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-low',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'Revenda Baixa',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 100000,
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeFinancialModalities(baseQuotation, bids);
      expect(result.termResellerName).toBe('Revenda Alta');
      expect(result.cashResellerName).toBe('Revenda Baixa');
      expect(result.savingsCashAmount).toBe(20000);
    });

    it('deve usar taxa padrão de 1.8 caso savings seja 0 ou não haja diferença calculável', () => {
      const bids: QuotationBid[] = [
        {
          id: 'bid-1',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda 1',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 10000,
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-2',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'Revenda 2',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 10000,
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeFinancialModalities(baseQuotation, bids);
      expect(result.implicitMonthlyRate).toBe(1.8);
    });
  });

  describe('Cenário 2: Análise de Risco de Prazo de Entrega vs. Janela Agronômica', () => {
    it('deve retornar hasLogisticalRisk: false quando houver menos de 2 propostas', () => {
      const result = predictiveAnalysisService.analyzeLogisticalRisk(baseQuotation, []);
      expect(result.hasLogisticalRisk).toBe(false);

      const resultSingle = predictiveAnalysisService.analyzeLogisticalRisk(baseQuotation, [
        {
          id: 'bid-1',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda A',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 25,
          totalAmount: 10000,
          createdAt: new Date().toISOString(),
          items: [],
        },
      ]);
      expect(resultSingle.hasLogisticalRisk).toBe(false);
    });

    it('deve disparar a bandeira de risco logístico exata do Cenário 2 quando prazo for 25 dias vs 4 dias na adubação de novembro', () => {
      const sensitiveQuotation: QuotationRequest = {
        ...baseQuotation,
        agronomicWindow: 'adubação de cobertura de novembro pós-chuva',
        notes: 'Aplicação urgente para adubação pós-chuva',
      };

      const bids: QuotationBid[] = [
        {
          id: 'bid-cheap-slow',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda Barata e Lenta',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 25,
          totalAmount: 30000, // Menor preço
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-fast-safe',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'Revenda B',
          resellerTradeName: 'Proposta B',
          resellerCity: 'Colatina',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 4, // Segunda mais barata, entrega em 4 dias
          totalAmount: 32000,
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeLogisticalRisk(sensitiveQuotation, bids);

      expect(result.hasLogisticalRisk).toBe(true);
      expect(result.cheapestDays).toBe(25);
      expect(result.safeDays).toBe(4);
      expect(result.warningMessage).toBe(
        'Risco de perda da janela de aplicação: A proposta de menor preço pode não chegar a tempo para a adubação pós-chuva. A proposta B garante entrega segura.'
      );
    });

    it('deve disparar risco quando hasLongDelivery (>=15) e hasFastDelivery (<=7) mesmo sem palavras-chave na cotação', () => {
      const neutralQuote: QuotationRequest = {
        ...baseQuotation,
        agronomicWindow: undefined,
        notes: undefined,
      };

      const bids: QuotationBid[] = [
        {
          id: 'bid-1',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda Barata',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 18,
          totalAmount: 20000,
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-2',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'B',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 21000,
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeLogisticalRisk(neutralQuote, bids);
      expect(result.hasLogisticalRisk).toBe(true);
      expect(result.warningMessage).toContain('A proposta B garante entrega segura.');
    });

    it('deve disparar risco quando a cotação possuir applicationDeadlineDays definido e houver discrepância de prazos', () => {
      const deadlineQuote: QuotationRequest = {
        ...baseQuotation,
        applicationDeadlineDays: 10,
      };

      const bids: QuotationBid[] = [
        {
          id: 'bid-1',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda Mais Barata',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 20,
          totalAmount: 20000,
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-2',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'Revenda Agro Rápida',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 21000,
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeLogisticalRisk(deadlineQuote, bids);
      expect(result.hasLogisticalRisk).toBe(true);
      expect(result.warningMessage).toContain('Risco de perda da janela de aplicação');
      expect(result.warningMessage).toContain('A proposta Revenda Agro Rápida garante entrega segura');
    });

    it('não deve disparar risco logístico quando todos os prazos forem ágeis e similares', () => {
      const bids: QuotationBid[] = [
        {
          id: 'bid-1',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda A',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 3,
          totalAmount: 10000,
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-2',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'Revenda B',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 11000,
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'bid-3',
          quotationId: 'quote-123',
          resellerId: 'res-3',
          resellerName: 'Revenda C',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 6,
          totalAmount: 12000,
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeLogisticalRisk(baseQuotation, bids);
      expect(result.hasLogisticalRisk).toBe(false);
      expect(result.warningMessage).toBeUndefined();
    });

    it('deve retornar hasLogisticalRisk: false caso todas as propostas possuam o mesmo ID gerando safeBid indefinido', () => {
      const bidsWithSameId: QuotationBid[] = [
        {
          id: 'same-id',
          quotationId: 'quote-123',
          resellerId: 'res-1',
          resellerName: 'Revenda 1',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 20,
          totalAmount: 10000,
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'same-id',
          quotationId: 'quote-123',
          resellerId: 'res-2',
          resellerName: 'Revenda 2',
          resellerCity: 'Linhares',
          resellerState: 'ES',
          status: 'PENDING',
          freightCost: 0,
          deliveryDays: 5,
          totalAmount: 20000,
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      const result = predictiveAnalysisService.analyzeLogisticalRisk(baseQuotation, bidsWithSameId);
      expect(result.hasLogisticalRisk).toBe(false);
    });
  });
});

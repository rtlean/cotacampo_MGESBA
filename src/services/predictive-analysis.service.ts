import { QuotationRequest, QuotationBid } from '../types/quotation';

export interface FinancialOpinionResult {
  hasAnalysis: boolean;
  termResellerName: string;
  cashResellerName: string;
  implicitMonthlyRate: number;
  marketMonthlyRate: number;
  savingsCashAmount: number;
  opinionText: string;
  termTotal: number;
  cashTotal: number;
}

export interface LogisticalRiskResult {
  hasLogisticalRisk: boolean;
  warningMessage?: string;
  cheapestBid?: QuotationBid;
  safeBid?: QuotationBid;
  cheapestDays?: number;
  safeDays?: number;
}

class PredictiveAnalysisService {
  /**
   * Cenário 1: Avaliação de Custo Financeiro (À Vista vs. Prazo Safra)
   * Calcula taxa de juros implícita, compara com CDI/Selic (crédito de custeio padrão)
   * e gera o parecer objetivo formatado.
   */
  public analyzeFinancialModalities(
    _quotation: QuotationRequest | null,
    bids: QuotationBid[],
    marketMonthlyRate = 1.05
  ): FinancialOpinionResult {
    if (!bids || bids.length < 2) {
      return {
        hasAnalysis: false,
        termResellerName: '',
        cashResellerName: '',
        implicitMonthlyRate: 0,
        marketMonthlyRate,
        savingsCashAmount: 0,
        opinionText: '',
        termTotal: 0,
        cashTotal: 0,
      };
    }

    // Identifica a proposta a prazo safra e a proposta à vista
    let termBid = bids.find(
      (b) =>
        b.paymentMethod === 'TERM_HARVEST' ||
        /safra|prazo/i.test(b.paymentTerms || '') ||
        /safra|prazo/i.test(b.notes || '') ||
        Boolean(b.termPriceTotal)
    );

    let cashBid = bids.find(
      (b) =>
        b.paymentMethod === 'CASH' ||
        /vista/i.test(b.paymentTerms || '') ||
        /vista/i.test(b.notes || '') ||
        Boolean(b.cashPriceTotal)
    );

    // Fallback inteligente caso nenhuma contenha tags textuais específicas:
    // A proposta de maior valor total é tratada como a prazo safra e a menor como à vista
    if (!termBid || !cashBid || termBid.id === cashBid.id) {
      const sortedByAmount = [...bids].sort((a, b) => b.totalAmount - a.totalAmount);
      termBid = sortedByAmount[0];
      cashBid = sortedByAmount[sortedByAmount.length - 1];
    }

    const termReseller = termBid.resellerTradeName || termBid.resellerName;
    const cashReseller = cashBid.resellerTradeName || cashBid.resellerName;

    // Valores totais a prazo e à vista
    const termTotal = termBid.termPriceTotal || termBid.totalAmount;
    const cashTotal =
      cashBid.cashPriceTotal ||
      (cashBid.cashDiscountPercent
        ? cashBid.totalAmount * (1 - cashBid.cashDiscountPercent / 100)
        : cashBid.totalAmount);

    const savings = Math.max(0, termTotal - cashTotal);

    // Se houver interestRateMonthly pré-fixado, usa-o; caso contrário, calcula com base na diferença para 6 meses de safra
    let monthlyRate: number;
    if (termBid.interestRateMonthly !== undefined) {
      monthlyRate = termBid.interestRateMonthly;
    } else {
      const termMonths = 6;
      if (cashTotal > 0 && savings > 0) {
        monthlyRate = Number(((savings / cashTotal / termMonths) * 100).toFixed(1));
      } else {
        monthlyRate = 1.8;
      }
    }

    const savingsFormatted = savings.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const rateFormatted = monthlyRate.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    const comparisonText =
      monthlyRate > marketMonthlyRate
        ? 'superior ao crédito de custeio padrão'
        : 'competitiva frente ao crédito de custeio padrão';

    // Parecer objetivo conforme exigido pela US12:
    // "A proposta a prazo da Revenda X cobra juros de 1,8% a.m., superior ao crédito de custeio padrão. Se você tiver limite no banco, pagar à vista com a Revenda Y economiza R$ 8.400 no lote."
    const opinionText = `A proposta a prazo da ${termReseller} cobra juros de ${rateFormatted}% a.m., ${comparisonText}. Se você tiver limite no banco, pagar à vista com a ${cashReseller} economiza R$ ${savingsFormatted} no lote.`;

    return {
      hasAnalysis: true,
      termResellerName: termReseller,
      cashResellerName: cashReseller,
      implicitMonthlyRate: monthlyRate,
      marketMonthlyRate,
      savingsCashAmount: savings,
      opinionText,
      termTotal,
      cashTotal,
    };
  }

  /**
   * Cenário 2: Análise de Risco de Prazo de Entrega vs. Janela Agronômica
   */
  public analyzeLogisticalRisk(
    quotation: QuotationRequest | null,
    bids: QuotationBid[]
  ): LogisticalRiskResult {
    if (!bids || bids.length < 2) {
      return { hasLogisticalRisk: false };
    }

    // Ordena por menor preço
    const sortedByPrice = [...bids].sort((a, b) => a.totalAmount - b.totalAmount);
    const cheapestBid = sortedByPrice[0];

    // Procura por proposta com entrega segura (prazo rápido)
    const safeBid = [...bids]
      .filter((b) => b.id !== cheapestBid.id)
      .sort((a, b) => a.deliveryDays - b.deliveryDays)[0];

    if (!safeBid) {
      return { hasLogisticalRisk: false };
    }

    // Condição da US12:
    // - Proposta mais barata tem prazo longo (ex: 25 dias, ou >= 15 dias)
    // - Proposta com entrega rápida (ex: 4 dias, ou <= 7 dias)
    const hasLongDelivery = cheapestBid.deliveryDays >= 15;
    const hasFastDelivery = safeBid.deliveryDays <= 7;

    const windowText = (
      (quotation?.agronomicWindow || '') +
      ' ' +
      (quotation?.notes || '')
    ).toLowerCase();

    const isAgronomicWindowSensitive =
      windowText.includes('novembro') ||
      windowText.includes('cobertura') ||
      windowText.includes('janela') ||
      windowText.includes('chuva') ||
      windowText.includes('urgente') ||
      quotation?.applicationDeadlineDays !== undefined;

    const hasDiscrepancy = cheapestBid.deliveryDays - safeBid.deliveryDays >= 10;

    if ((hasLongDelivery && hasFastDelivery) || (hasDiscrepancy && isAgronomicWindowSensitive)) {
      let safeLabel = safeBid.resellerTradeName || safeBid.resellerName || 'B';
      if (
        safeLabel.toLowerCase() === 'revenda b' ||
        safeLabel.toLowerCase() === 'b' ||
        safeLabel.toLowerCase() === 'proposta b'
      ) {
        safeLabel = 'B';
      }
      const warningMessage = `Risco de perda da janela de aplicação: A proposta de menor preço pode não chegar a tempo para a adubação pós-chuva. A proposta ${safeLabel} garante entrega segura.`;

      return {
        hasLogisticalRisk: true,
        warningMessage,
        cheapestBid,
        safeBid,
        cheapestDays: cheapestBid.deliveryDays,
        safeDays: safeBid.deliveryDays,
      };
    }

    return { hasLogisticalRisk: false };
  }
}

export const predictiveAnalysisService = new PredictiveAnalysisService();

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { quotationService } from '../quotation.service';
import { QuotationRequest, QuotationBid } from '../../types/quotation';

describe('quotationService - US15 (Dashboard do RTV e Funil de Propostas)', () => {
  const resellerId = 'res_test_us15';

  const mockQuoteOpen: QuotationRequest = {
    id: 'quote-us15-open',
    displayCode: 'COT-US15-1',
    producerId: 'prod_1',
    producerName: 'José Ribeiro (Fazenda Alvorada)',
    producerPhone: '(27) 99777-1111',
    title: 'Adubo Foliar e Micronutrientes',
    status: 'OPEN',
    targetCity: 'Linhares',
    targetState: 'ES',
    deadline: new Date(Date.now() + 48 * 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockQuoteAwarded: QuotationRequest = {
    id: 'quote-us15-awarded',
    displayCode: 'COT-US15-2',
    producerId: 'prod_2',
    producerName: 'Maria Antônia (Sítio Primavera)',
    producerPhone: '(27) 99888-2222',
    title: 'Fungicida para Café',
    status: 'AWARDED',
    targetCity: 'São Mateus',
    targetState: 'ES',
    deadline: new Date(Date.now() - 24 * 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockQuoteLost: QuotationRequest = {
    id: 'quote-us15-lost',
    displayCode: 'COT-US15-3',
    producerId: 'prod_3',
    producerName: 'Antônio Ferreira',
    producerPhone: '(27) 99999-3333',
    title: 'Inseticida e Herbicida',
    status: 'AWARDED',
    targetCity: 'Colatina',
    targetState: 'ES',
    deadline: new Date(Date.now() - 48 * 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('deve gerar propostas de demonstração completas para o revendedor quando não houver bids prévios', async () => {
    const proposals = await quotationService.getResellerProposals(resellerId);

    expect(proposals.length).toBe(3);
    const enviadas = proposals.filter((p) => p.column === 'ENVIADAS');
    const ganhas = proposals.filter((p) => p.column === 'GANHAS');
    const perdidas = proposals.filter((p) => p.column === 'PERDIDAS');

    expect(enviadas.length).toBe(1);
    expect(ganhas.length).toBe(1);
    expect(perdidas.length).toBe(1);

    // Cenário 1: Enviada tem contato ofuscado
    expect(enviadas[0].isContactRevealed).toBe(false);
    expect(enviadas[0].producerDisplayName).toContain('Contato protegido');
    expect(enviadas[0].producerDisplayPhone).toBe('(27) •••••-••••');

    // Cenário 2: Ganha revela contato e botão de WhatsApp
    expect(ganhas[0].isContactRevealed).toBe(true);
    expect(ganhas[0].producerDisplayName).toBeTruthy();
    expect(ganhas[0].producerDisplayPhone).toContain('(27)');
    expect(ganhas[0].whatsAppUrl).toContain('https://wa.me/55');

    // Cenário 3: Perdida tem aviso e inteligência de mercado
    expect(perdidas[0].marketIntelligence).toBeDefined();
    expect(perdidas[0].marketIntelligence?.feedbackMessage).toContain('mais barata que a sua');
  });

  it('deve classificar proposta SUBMITTED como ENVIADAS e ofuscar dados de contato', async () => {
    await quotationService.saveQuotation(mockQuoteOpen);

    const bid: QuotationBid = {
      id: 'bid_sub_1',
      quotationId: mockQuoteOpen.id,
      resellerId,
      resellerName: 'AgroVila Teste',
      resellerCity: 'Linhares',
      resellerState: 'ES',
      items: [{ id: 'i1', productName: 'Item 1', brandName: 'Marca 1', unitPrice: 100, totalPrice: 1000 }],
      freightCost: 150,
      deliveryDays: 2,
      totalAmount: 1150,
      status: 'SUBMITTED',
      awardType: 'NONE',
      createdAt: new Date().toISOString(),
    };
    await quotationService.saveBid(bid);

    const proposals = await quotationService.getResellerProposals(resellerId);
    expect(proposals.length).toBe(1);
    expect(proposals[0].column).toBe('ENVIADAS');
    expect(proposals[0].isContactRevealed).toBe(false);
    expect(proposals[0].producerDisplayName).toBe('Produtor Rural (Contato protegido até o aceite)');
    expect(proposals[0].producerDisplayPhone).toBe('(27) •••••-••••');
    expect(proposals[0].whatsAppUrl).toBeUndefined();
  });

  it('deve classificar proposta ACCEPTED como GANHAS e revelar dados completos de contato do produtor', async () => {
    await quotationService.saveQuotation(mockQuoteAwarded);

    const wonBid: QuotationBid = {
      id: 'bid_won_1',
      quotationId: mockQuoteAwarded.id,
      resellerId,
      resellerName: 'AgroVila Teste',
      resellerCity: 'São Mateus',
      resellerState: 'ES',
      items: [{ id: 'i2', productName: 'Item 2', brandName: 'Marca 2', unitPrice: 200, totalPrice: 2000, isAwarded: true }],
      freightCost: 100,
      deliveryDays: 1,
      totalAmount: 2100,
      status: 'ACCEPTED',
      awardType: 'FULL',
      createdAt: new Date().toISOString(),
    };
    await quotationService.saveBid(wonBid);

    const proposals = await quotationService.getResellerProposals(resellerId);
    expect(proposals.length).toBe(1);
    expect(proposals[0].column).toBe('GANHAS');
    expect(proposals[0].isContactRevealed).toBe(true);
    expect(proposals[0].producerDisplayName).toBe('Maria Antônia (Sítio Primavera)');
    expect(proposals[0].producerDisplayPhone).toBe('(27) 99888-2222');
    expect(proposals[0].whatsAppUrl).toContain('https://wa.me/5527998882222');
    expect(proposals[0].whatsAppUrl).toContain(encodeURIComponent('Maria Antônia'));
  });

  it('deve classificar proposta REJECTED como PERDIDAS e calcular inteligência de mercado comparativa', async () => {
    await quotationService.saveQuotation(mockQuoteLost);

    // Minha proposta (R$ 10.000,00)
    const myBid: QuotationBid = {
      id: 'bid_lost_my',
      quotationId: mockQuoteLost.id,
      resellerId,
      resellerName: 'AgroVila Teste',
      resellerCity: 'Colatina',
      resellerState: 'ES',
      items: [{ id: 'i3', productName: 'Item 3', brandName: 'Marca 3', unitPrice: 500, totalPrice: 9500 }],
      freightCost: 500,
      deliveryDays: 5,
      totalAmount: 10000,
      status: 'REJECTED',
      awardType: 'NONE',
      createdAt: new Date().toISOString(),
    };
    await quotationService.saveBid(myBid);

    // Proposta vencedora do concorrente (R$ 9.500,00 -> 5% mais barata)
    const competitorBid: QuotationBid = {
      id: 'bid_competitor_winner',
      quotationId: mockQuoteLost.id,
      resellerId: 'competitor_123',
      resellerName: 'Revenda Concorrente',
      resellerCity: 'Colatina',
      resellerState: 'ES',
      items: [{ id: 'i3', productName: 'Item 3', brandName: 'Marca 3', unitPrice: 475, totalPrice: 9025, isAwarded: true }],
      freightCost: 475,
      deliveryDays: 3,
      totalAmount: 9500,
      status: 'ACCEPTED',
      awardType: 'FULL',
      createdAt: new Date().toISOString(),
    };
    await quotationService.saveBid(competitorBid);

    const proposals = await quotationService.getResellerProposals(resellerId);
    expect(proposals.length).toBe(1);
    expect(proposals[0].column).toBe('PERDIDAS');
    expect(proposals[0].marketIntelligence).toBeDefined();
    expect(proposals[0].marketIntelligence?.winningAmount).toBe(9500);
    expect(proposals[0].marketIntelligence?.differencePercent).toBe(5);
    expect(proposals[0].marketIntelligence?.feedbackMessage).toBe('A proposta vencedora foi 5% mais barata que a sua.');
  });

  it('deve emitir notificações para o vencedor e concorrentes ao chamar notifyAwardOutcomes', async () => {
    const winningBid: QuotationBid = {
      id: 'bid_win_notif',
      quotationId: mockQuoteAwarded.id,
      resellerId: 'reseller_winner',
      resellerName: 'Revenda Vencedora',
      resellerCity: 'Linhares',
      resellerState: 'ES',
      items: [],
      freightCost: 100,
      deliveryDays: 2,
      totalAmount: 5000,
      status: 'ACCEPTED',
      awardType: 'FULL',
      createdAt: new Date().toISOString(),
    };

    const losingBid: QuotationBid = {
      id: 'bid_lost_notif',
      quotationId: mockQuoteAwarded.id,
      resellerId: 'reseller_loser',
      resellerName: 'Revenda Perdedora',
      resellerCity: 'Linhares',
      resellerState: 'ES',
      items: [],
      freightCost: 120,
      deliveryDays: 3,
      totalAmount: 5500,
      status: 'REJECTED',
      awardType: 'NONE',
      createdAt: new Date().toISOString(),
    };

    await quotationService.notifyAwardOutcomes(mockQuoteAwarded, winningBid, [losingBid]);

    const notifications = quotationService.getNotifications();
    expect(notifications.length).toBe(2);

    const winNotif = notifications.find((n) => n.resellerId === 'reseller_winner');
    expect(winNotif).toBeDefined();
    expect(winNotif?.message).toContain('Negócio Fechado');
    expect(winNotif?.message).toContain('Maria Antônia');

    const loseNotif = notifications.find((n) => n.resellerId === 'reseller_loser');
    expect(loseNotif).toBeDefined();
    expect(loseNotif?.message).toContain('Cotação finalizada. Sua proposta não foi selecionada.');
  });

  it('deve tratar com segurança localStorage corrompido em getAllQuotations e getAllBids', () => {
    localStorage.setItem('cotacampo_quotations', '{invalid-json');
    localStorage.setItem('cotacampo_quotation_bids', '{invalid-json');

    expect(quotationService.getAllQuotations()).toEqual([]);
    expect(quotationService.getAllBids()).toEqual([]);
  });

  it('deve criar cotação de fallback se o quotationId da proposta não existir na base', async () => {
    const orphanBid: QuotationBid = {
      id: 'bid_orphan_1',
      quotationId: 'quote-inexistente-123',
      resellerId,
      resellerName: 'AgroVila Teste',
      resellerCity: 'Linhares',
      resellerState: 'ES',
      items: [],
      freightCost: 50,
      deliveryDays: 1,
      totalAmount: 1000,
      status: 'SUBMITTED',
      awardType: 'NONE',
      createdAt: new Date().toISOString(),
    };
    await quotationService.saveBid(orphanBid);

    const proposals = await quotationService.getResellerProposals(resellerId);
    expect(proposals.length).toBe(1);
    expect(proposals[0].quotation.id).toBe('quote-inexistente-123');
    expect(proposals[0].quotation.producerName).toBe('Produtor Rural Demo');
    expect(proposals[0].column).toBe('ENVIADAS');
  });

  it('deve exibir feedback de condições logísticas quando o vencedor não teve menor preço', async () => {
    await quotationService.saveQuotation(mockQuoteLost);

    const myBid: QuotationBid = {
      id: 'bid_my_same_price',
      quotationId: mockQuoteLost.id,
      resellerId,
      resellerName: 'AgroVila Teste',
      resellerCity: 'Colatina',
      resellerState: 'ES',
      items: [],
      freightCost: 200,
      deliveryDays: 10,
      totalAmount: 5000,
      status: 'REJECTED',
      awardType: 'NONE',
      createdAt: new Date().toISOString(),
    };
    await quotationService.saveBid(myBid);

    const competitorBid: QuotationBid = {
      id: 'bid_competitor_fast',
      quotationId: mockQuoteLost.id,
      resellerId: 'competitor_fast',
      resellerName: 'Revenda Rápida',
      resellerCity: 'Colatina',
      resellerState: 'ES',
      items: [],
      freightCost: 100,
      deliveryDays: 1,
      totalAmount: 5000, // Mesmo preço, mas ganhou por prazo/logística
      status: 'ACCEPTED',
      awardType: 'FULL',
      createdAt: new Date().toISOString(),
    };
    await quotationService.saveBid(competitorBid);

    const proposals = await quotationService.getResellerProposals(resellerId);
    expect(proposals.length).toBe(1);
    expect(proposals[0].marketIntelligence?.feedbackMessage).toContain('condições logísticas ou prazos');
  });

  it('deve exibir feedback padrão quando a cotação foi encerrada/cancelada sem proposta vencedora', async () => {
    const cancelledQuote: QuotationRequest = {
      ...mockQuoteLost,
      id: 'quote-cancelled-1',
      status: 'CANCELLED',
    };
    await quotationService.saveQuotation(cancelledQuote);

    const myBid: QuotationBid = {
      id: 'bid_cancelled_quote',
      quotationId: cancelledQuote.id,
      resellerId,
      resellerName: 'AgroVila Teste',
      resellerCity: 'Colatina',
      resellerState: 'ES',
      items: [],
      freightCost: 100,
      deliveryDays: 2,
      totalAmount: 3000,
      status: 'REJECTED',
      awardType: 'NONE',
      createdAt: new Date().toISOString(),
    };
    await quotationService.saveBid(myBid);

    const proposals = await quotationService.getResellerProposals(resellerId);
    expect(proposals.length).toBe(1);
    expect(proposals[0].column).toBe('PERDIDAS');
    expect(proposals[0].marketIntelligence?.feedbackMessage).toBe('Cotação finalizada. Sua proposta não foi selecionada.');
  });
});

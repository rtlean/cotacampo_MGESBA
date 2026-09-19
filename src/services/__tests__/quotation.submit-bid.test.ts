import { describe, it, expect, beforeEach, vi } from 'vitest';
import { quotationService } from '../quotation.service';
import { QuotationRequest, QuotationBidItem } from '../../types/quotation';

describe('Quotation Service - submitBid (US14)', () => {
  const mockQuotation: QuotationRequest = {
    id: 'quote-us14-test-1',
    displayCode: 'COT-US14-001',
    producerId: 'prod-uuid-1',
    producerName: 'Fazenda Santa Clara (João)',
    title: 'Cotação de Defensivos para Café Conilon',
    status: 'OPEN',
    targetState: 'ES',
    targetCity: 'Linhares',
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    freightType: 'CIF',
    deliveryAddress: 'Córrego Farias, Linhares - ES',
    itemsCount: 2,
    bidsCount: 0,
    items: [
      {
        id: 'item-1',
        productName: 'Mancozeb 750 WG da Marca X',
        activeIngredient: 'Mancozebe',
        quantity: 100,
        unit: 'Kg',
        acceptsGeneric: true,
      },
      {
        id: 'item-2',
        productName: 'Adubo Foliar Potássio',
        quantity: 10,
        unit: 'Litros',
        acceptsGeneric: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('Cenário 1: deve registrar proposta integral com frete CIF, prazo de entrega e validade', async () => {
    await quotationService.saveQuotation(mockQuotation);

    const items: QuotationBidItem[] = [
      {
        id: 'bid-item-1',
        quotationItemId: 'item-1',
        productName: 'Mancozeb 750 WG da Marca X',
        brandName: 'Mancozeb 750 WG da Marca X',
        unitPrice: 65.0,
        totalPrice: 6500.0,
        isEquivalent: false,
      },
      {
        id: 'bid-item-2',
        quotationItemId: 'item-2',
        productName: 'Adubo Foliar Potássio',
        brandName: 'Adubo Foliar Potássio',
        unitPrice: 120.0,
        totalPrice: 1200.0,
        isEquivalent: false,
      },
    ];

    const submittedBid = await quotationService.submitBid({
      quotationId: mockQuotation.id,
      resellerId: 'reseller-linhares-1',
      resellerName: 'Agro Campo Linhares Ltda',
      resellerTradeName: 'Agro Campo',
      resellerCity: 'Linhares',
      resellerState: 'ES',
      rtvName: 'Carlos Silveira',
      rtvPhone: '27999887766',
      items,
      freightCost: 250.0,
      deliveryDays: 3,
      validityHours: 48,
      paymentMethod: 'PRAZO_30',
      notes: 'Entrega rápida na fazenda.',
    });

    // Validar proposta registrada
    expect(submittedBid.id).toBeDefined();
    expect(submittedBid.status).toBe('SUBMITTED');
    expect(submittedBid.awardType).toBe('NONE');
    expect(submittedBid.freightCost).toBe(250.0);
    expect(submittedBid.deliveryDays).toBe(3);
    expect(submittedBid.validityHours).toBe(48);
    expect(submittedBid.totalAmount).toBe(7950.0); // 6500 + 1200 + 250
    expect(submittedBid.paymentMethod).toBe('PRAZO_30');

    // Validar cotação atualizada com incremento de propostas
    const updatedQuotation = await quotationService.getQuotationById(mockQuotation.id);
    expect(updatedQuotation).not.toBeNull();
    expect(updatedQuotation?.bidsCount).toBe(1);

    // Validar notificação emitida para o produtor
    const notifications = quotationService.getNotifications();
    expect(notifications.length).toBe(1);
    expect(notifications[0].message).toContain('Proposta recebida da revenda Agro Campo');
    expect(notifications[0].message).toContain('COT-US14-001');
    expect(notifications[0].message).toContain('7.950,00');
  });

  it('Cenário 2: deve registrar proposta com marca equivalente/genérica quando aceita', async () => {
    await quotationService.saveQuotation(mockQuotation);

    const items: QuotationBidItem[] = [
      {
        id: 'bid-item-alt-1',
        quotationItemId: 'item-1',
        productName: 'Mancozeb 750 WG da Marca X',
        brandName: 'Mancozeb 750 WG da Marca Y',
        unitPrice: 58.0,
        totalPrice: 5800.0,
        isEquivalent: true,
        activeIngredientConcentration: 'Mancozebe 750 g/kg (75% m/m)',
        notes: 'Marca equivalente com mesmo registro e eficácia agronômica.',
      },
    ];

    const submittedBid = await quotationService.submitBid({
      quotationId: mockQuotation.id,
      resellerId: 'reseller-colatina-1',
      resellerName: 'Colatina Agro Insumos Ltda',
      items,
      freightCost: 0,
      deliveryDays: 5,
      validityHours: 72,
      paymentMethod: 'AVISTA',
    });

    expect(submittedBid.status).toBe('SUBMITTED');
    expect(submittedBid.items[0].isEquivalent).toBe(true);
    expect(submittedBid.items[0].brandName).toBe('Mancozeb 750 WG da Marca Y');
    expect(submittedBid.totalAmount).toBe(5800.0);
  });

  it('Cenário 3: deve registrar proposta com modalidade Barter / Troca em Sacas', async () => {
    await quotationService.saveQuotation(mockQuotation);

    const items: QuotationBidItem[] = [
      {
        id: 'bid-item-barter-1',
        quotationItemId: 'item-1',
        productName: 'Mancozeb 750 WG da Marca X',
        brandName: 'Mancozeb 750 WG da Marca X',
        unitPrice: 70.0,
        totalPrice: 7000.0,
        isEquivalent: false,
      },
    ];

    const submittedBid = await quotationService.submitBid({
      quotationId: mockQuotation.id,
      resellerId: 'reseller-barter-1',
      resellerName: 'Café & Grãos Insumos',
      items,
      freightCost: 100,
      deliveryDays: 4,
      validityHours: 24,
      paymentMethod: 'BARTER',
      barterBagsCount: 85,
      notes: 'Permuta em café arábica tipo 6.',
    });

    expect(submittedBid.paymentMethod).toBe('BARTER');
    expect(submittedBid.barterBagsCount).toBe(85);
    expect(submittedBid.totalAmount).toBe(7100.0);
  });

  it('deve registrar proposta mesmo que a cotação não seja encontrada no cache local', async () => {
    const items: QuotationBidItem[] = [
      {
        id: 'bid-item-orphan',
        quotationItemId: 'item-orphan',
        productName: 'Insumo Avulso',
        unitPrice: 50.0,
        totalPrice: 50.0,
        isEquivalent: false,
      },
    ];

    const submittedBid = await quotationService.submitBid({
      quotationId: 'non-existent-quote',
      resellerId: 'reseller-orphan',
      resellerName: 'Revenda Solitária',
      items,
      freightCost: 20,
      deliveryDays: 2,
      validityHours: 48,
      paymentMethod: 'AVISTA',
    });

    expect(submittedBid.status).toBe('SUBMITTED');
    expect(submittedBid.totalAmount).toBe(70.0);
  });
});

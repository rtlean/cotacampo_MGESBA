import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotationComparativePage } from '../QuotationComparativePage';
import { quotationService } from '../../services/quotation.service';
import { packageService } from '../../services/package.service';
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
      crops: ['pimenta'],
    },
  }),
}));

describe('US17 – Salvar Cotação como Pacote Tecnológico (QuotationComparativePage)', () => {
  const awardedQuote: QuotationRequest = {
    id: 'quote-awarded-123',
    producerId: 'prod-user-1',
    title: 'Pulverização Preventiva - Pimenta',
    status: 'AWARDED',
    cropType: 'pimenta',
    targetState: 'ES',
    targetCity: 'Linhares',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    displayCode: 'COT-777',
    freightType: 'CIF',
    paymentTerms: '30 dias',
    items: [
      {
        id: 'item-1',
        productName: 'Fungicida Cobrex',
        activeIngredient: 'Oxicloreto de Cobre',
        quantity: 25,
        unit: 'Kg',
        acceptsGeneric: true,
      },
      {
        id: 'item-2',
        productName: 'Adubo Foliar Micronutrientes',
        activeIngredient: 'Boro + Zinco',
        quantity: 10,
        unit: 'L',
        acceptsGeneric: false,
      },
    ],
    itemsCount: 2,
    bidsCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const openQuote: QuotationRequest = {
    ...awardedQuote,
    id: 'quote-open-123',
    status: 'OPEN',
  };

  const mockBids: QuotationBid[] = [
    {
      id: 'bid-1',
      quotationId: 'quote-awarded-123',
      resellerId: 'reseller-1',
      resellerName: 'AgroCenter Linhares Ltda',
      resellerCity: 'Linhares',
      resellerState: 'ES',
      freightCost: 100,
      deliveryDays: 3,
      totalAmount: 1500,
      status: 'ACCEPTED',
      paymentTerms: '30 dias',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'b-it-1',
          quotationItemId: 'item-1',
          productName: 'Fungicida Cobrex',
          brandName: 'Cobrex Original',
          unitPrice: 40,
          totalPrice: 1000,
          isEquivalent: false,
        },
        {
          id: 'b-it-2',
          quotationItemId: 'item-2',
          productName: 'Adubo Foliar Micronutrientes',
          brandName: 'Foliar Zinco Plus',
          unitPrice: 50,
          totalPrice: 500,
          isEquivalent: false,
        },
      ],
    },
    {
      id: 'bid-2',
      quotationId: 'quote-awarded-123',
      resellerId: 'reseller-2',
      resellerName: 'Café & Campo Ltda',
      resellerCity: 'Colatina',
      resellerState: 'ES',
      freightCost: 120,
      deliveryDays: 4,
      totalAmount: 1600,
      status: 'SUBMITTED',
      paymentTerms: '30 dias',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'b-it-3',
          quotationItemId: 'item-1',
          productName: 'Fungicida Cobrex',
          brandName: 'Cobrex Genérico',
          unitPrice: 42,
          totalPrice: 1050,
          isEquivalent: true,
        },
        {
          id: 'b-it-4',
          quotationItemId: 'item-2',
          productName: 'Adubo Foliar Micronutrientes',
          brandName: 'Foliar Zinco Plus',
          unitPrice: 55,
          totalPrice: 550,
          isEquivalent: false,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoute.mockReturnValue([true, { id: 'quote-awarded-123' }]);
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(awardedQuote);
    vi.spyOn(quotationService, 'getQuotationBids').mockResolvedValue(mockBids);
    vi.spyOn(packageService, 'createPackageFromQuote').mockResolvedValue({
      id: 'pkg-new-1',
      producerId: 'prod-user-1',
      name: 'Pulverização Preventiva - Pimenta',
      cropType: 'pimenta',
      itemsCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          packageId: 'pkg-new-1',
          productName: 'Fungicida Cobrex',
          quantity: 25,
          unit: 'Kg',
          acceptsGeneric: true,
        },
        {
          id: 'item-2',
          packageId: 'pkg-new-1',
          productName: 'Adubo Foliar Micronutrientes',
          quantity: 10,
          unit: 'L',
          acceptsGeneric: false,
        },
      ],
    });
  });

  it('Cenário 1: Deve exibir o botão [ Salvar como Pacote Tecnológico ] quando a cotação estiver AWARDED', async () => {
    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByText(/Salvar como Pacote Tecnológico/i)).toBeInTheDocument();
    });
  });

  it('Cenário 1: Não deve exibir o botão quando o status for OPEN', async () => {
    mockUseRoute.mockReturnValue([true, { id: 'quote-open-123' }]);
    vi.spyOn(quotationService, 'getQuotationById').mockResolvedValue(openQuote);

    render(<QuotationComparativePage />);

    await waitFor(() => {
      expect(screen.getByText('COT-777')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Salvar como Pacote Tecnológico/i)).not.toBeInTheDocument();
  });

  it('Cenário 1: Ao clicar no botão, preencher o nome no modal e confirmar, salva o pacote e exibe feedback de sucesso', async () => {
    render(<QuotationComparativePage />);

    const saveBtn = await screen.findByRole('button', { name: /Salvar como Pacote Tecnológico/i });
    fireEvent.click(saveBtn);

    // Modal deve estar visível
    expect(screen.getByRole('heading', { name: /Salvar como Pacote Tecnológico/i })).toBeInTheDocument();
    const inputName = screen.getByLabelText(/Nome do Pacote/i);
    expect(inputName).toBeInTheDocument();

    // Preenche nome
    fireEvent.change(inputName, { target: { value: 'Pulverização Preventiva - Pimenta' } });

    // Clica em confirmar no modal
    const confirmBtn = screen.getByTestId('btn-submit-save-package');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(packageService.createPackageFromQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          producerId: 'prod-user-1',
          name: 'Pulverização Preventiva - Pimenta',
          cropType: 'pimenta',
        })
      );
    });

    // Deve exibir mensagem de sucesso
    await waitFor(() => {
      expect(screen.getAllByText(/Pacote Tecnológico salvo nas suas predefinições!/i).length).toBeGreaterThan(0);
    });
  });
});

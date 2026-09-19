import { describe, it, expect } from 'vitest';
import { bidSubmissionSchema, bidItemSchema } from '../bid.schema';

describe('bid.schema - Validação de Submissão de Proposta Comercial (US14)', () => {
  const validItem = {
    quotationItemId: 'item-1',
    productName: 'Adubo NPK 20-05-20',
    brandName: 'YaraMila',
    unitPrice: 150.5,
    quantity: 10,
    isEquivalent: false,
  };

  const validBid = {
    quotationId: 'quote-123',
    items: [validItem],
    freightCost: 250,
    deliveryDays: 3,
    validityHours: 48,
    paymentMethod: 'CASH' as const,
    paymentTerms: 'À vista via PIX',
  };

  describe('bidItemSchema', () => {
    it('deve validar um item cotado válido', () => {
      const parsed = bidItemSchema.safeParse(validItem);
      expect(parsed.success).toBe(true);
    });

    it('deve aceitar item marcado como equivalente/genérico ofertado', () => {
      const parsed = bidItemSchema.safeParse({
        ...validItem,
        isEquivalent: true,
        brandName: 'Marca Alternativa Genérica',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.isEquivalent).toBe(true);
        expect(parsed.data.brandName).toBe('Marca Alternativa Genérica');
      }
    });

    it('deve rejeitar item com preço unitário zero ou negativo', () => {
      expect(bidItemSchema.safeParse({ ...validItem, unitPrice: 0 }).success).toBe(false);
      expect(bidItemSchema.safeParse({ ...validItem, unitPrice: -50 }).success).toBe(false);
    });

    it('deve rejeitar item sem marca informada', () => {
      expect(bidItemSchema.safeParse({ ...validItem, brandName: '' }).success).toBe(false);
    });
  });

  describe('bidSubmissionSchema - Cenário 1: Proposta integral com frete CIF', () => {
    it('deve aprovar proposta preenchida corretamente com frete CIF e validade em horas', () => {
      const parsed = bidSubmissionSchema.safeParse(validBid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.freightCost).toBe(250);
        expect(parsed.data.deliveryDays).toBe(3);
        expect(parsed.data.validityHours).toBe(48);
      }
    });

    it('deve aceitar frete grátis (freightCost = 0)', () => {
      const parsed = bidSubmissionSchema.safeParse({
        ...validBid,
        freightCost: 0,
      });
      expect(parsed.success).toBe(true);
    });

    it('deve rejeitar frete com valor negativo', () => {
      const parsed = bidSubmissionSchema.safeParse({
        ...validBid,
        freightCost: -10,
      });
      expect(parsed.success).toBe(false);
    });

    it('deve rejeitar prazo de entrega menor que 1 dia', () => {
      const parsed = bidSubmissionSchema.safeParse({
        ...validBid,
        deliveryDays: 0,
      });
      expect(parsed.success).toBe(false);
    });

    it('deve rejeitar validade da proposta menor que 1 hora', () => {
      const parsed = bidSubmissionSchema.safeParse({
        ...validBid,
        validityHours: 0,
      });
      expect(parsed.success).toBe(false);
    });

    it('deve rejeitar proposta sem itens', () => {
      const parsed = bidSubmissionSchema.safeParse({
        ...validBid,
        items: [],
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('bidSubmissionSchema - Cenário 3: Modalidade de Pagamento Barter (Permuta em Sacas)', () => {
    it('deve aprovar proposta com modalidade BARTER quando informado número de sacas positivo', () => {
      const parsed = bidSubmissionSchema.safeParse({
        ...validBid,
        paymentMethod: 'BARTER',
        paymentTerms: 'Barter / Permuta em Sacas',
        barterBagsCount: 85,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.paymentMethod).toBe('BARTER');
        expect(parsed.data.barterBagsCount).toBe(85);
      }
    });

    it('deve rejeitar proposta BARTER quando a quantidade de sacas não for informada', () => {
      const parsed = bidSubmissionSchema.safeParse({
        ...validBid,
        paymentMethod: 'BARTER',
        barterBagsCount: undefined,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        expect(errors.barterBagsCount).toContain(
          'Para a modalidade Barter, informe quantas sacas (60kg) pelo lote completo'
        );
      }
    });

    it('deve rejeitar proposta BARTER quando a quantidade de sacas for menor ou igual a zero', () => {
      const parsed = bidSubmissionSchema.safeParse({
        ...validBid,
        paymentMethod: 'BARTER',
        barterBagsCount: 0,
      });
      expect(parsed.success).toBe(false);
    });
  });
});

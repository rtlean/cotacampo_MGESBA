import { describe, it, expect } from 'vitest';
import { quotationRequestSchema, quotationStatusSchema } from '../quotation.schema';

describe('Quotation Schema Validation', () => {
  it('deve validar os status permitidos da cotação', () => {
    expect(quotationStatusSchema.safeParse('OPEN').success).toBe(true);
    expect(quotationStatusSchema.safeParse('IN_REVIEW').success).toBe(true);
    expect(quotationStatusSchema.safeParse('AWARDED').success).toBe(true);
    expect(quotationStatusSchema.safeParse('CANCELLED').success).toBe(true);
    expect(quotationStatusSchema.safeParse('INVALID_STATUS').success).toBe(false);
  });

  it('deve validar uma cotação completa válida', () => {
    const validData = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      producerId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      title: 'Cotação de Fertilizantes NPK e Ureia',
      status: 'OPEN',
      targetState: 'ES',
      targetCity: 'Linhares',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      notes: 'Entrega na Fazenda Santa Clara',
      itemsCount: 3,
      bidsCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = quotationRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar cotação com título em branco ou status inválido', () => {
    const invalidData = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      producerId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      title: '',
      status: 'PENDING_PAYMENT',
      targetState: 'ES',
      targetCity: 'Linhares',
      deadline: 'invalid-date',
    };

    const result = quotationRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ./supabase with isSupabaseConfigured: false
vi.mock('../supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: vi.fn(),
  },
}));

import { dbSyncService } from '../db-sync.service';

describe('dbSyncService - Supabase desconfigurado (fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar success: true imediatamente em syncProducer quando Supabase não estiver configurado', async () => {
    const result = await dbSyncService.syncProducer({
      role: 'PRODUCER',
      fullName: 'Produtor Sem Supabase',
      email: 'prod@sem.com',
      whatsapp: '(27) 99888-1122',
      password: 'PassWord123',
      confirmPassword: 'PassWord123',
      farmName: 'Fazenda Offline',
      state: 'ES',
      city: 'Linhares',
      crops: ['cafe'],
    });

    expect(result.success).toBe(true);
  });

  it('deve retornar success: true imediatamente em syncReseller quando Supabase não estiver configurado', async () => {
    const result = await dbSyncService.syncReseller({
      role: 'RESELLER',
      razaoSocial: 'Revenda Offline Ltda',
      nomeFantasia: 'Revenda Offline',
      cnpj: '11.222.333/0001-81',
      corporateEmail: 'revenda@offline.com',
      whatsapp: '(27) 99888-7766',
      password: 'PassWord123',
      confirmPassword: 'PassWord123',
      state: 'ES',
      city: 'Linhares',
      deliveryRadiusKm: 100,
      categories: ['defensivos'],
    });

    expect(result.success).toBe(true);
  });

  it('deve retornar success: true imediatamente em syncPasswordReset quando Supabase não estiver configurado', async () => {
    const result = await dbSyncService.syncPasswordReset({
      identifier: 'teste@offline.com',
      token: 'rst_offline',
      code: '123456',
      channel: 'EMAIL',
      expiresAt: Date.now() + 10000,
    });

    expect(result.success).toBe(true);
  });

  it('deve retornar success: true imediatamente em markPasswordResetUsed quando Supabase não estiver configurado', async () => {
    const result = await dbSyncService.markPasswordResetUsed('123456');
    expect(result.success).toBe(true);
  });
});

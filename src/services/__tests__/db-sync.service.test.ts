import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbSyncService } from '../db-sync.service';
import { supabase } from '../supabase';

describe('dbSyncService - Sincronização de Tabelas no Supabase (3NF)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncProducer', () => {
    it('deve sincronizar com sucesso profiles, producers e producer_crops', async () => {
      // Mock do supabase.from
      const selectMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'mock-profile-uuid' }, error: null }),
      });
      const upsertProfileMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const selectProducerMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'mock-producer-uuid' }, error: null }),
      });
      const upsertProducerMock = vi.fn().mockReturnValue({
        select: selectProducerMock,
      });

      const cropsSelectMock = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'crop-1', name: 'Café' }],
          error: null,
        }),
      });

      const upsertProducerCropsMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { upsert: upsertProfileMock } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === 'producers') {
          return { upsert: upsertProducerMock } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === 'crops') {
          return { select: cropsSelectMock } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === 'producer_crops') {
          return { upsert: upsertProducerCropsMock } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const result = await dbSyncService.syncProducer({
        role: 'PRODUCER',
        fullName: 'João da Silva',
        email: 'joao@cotacampo.com.br',
        whatsapp: '(31) 99876-5432',
        password: 'Password123',
        confirmPassword: 'Password123',
        farmName: 'Fazenda Sol Nascente',
        state: 'MG',
        city: 'Manhuaçu',
        crops: ['cafe'],
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('mock-producer-uuid');
    });

    it('deve capturar erro se o Supabase falhar na inserção de profiles', async () => {
      const selectMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB connection error' } }),
      });
      const upsertProfileMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { upsert: upsertProfileMock } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const result = await dbSyncService.syncProducer({
        role: 'PRODUCER',
        fullName: 'João Falha',
        email: 'falha@cotacampo.com.br',
        whatsapp: '(31) 99876-5432',
        password: 'Password123',
        confirmPassword: 'Password123',
        farmName: 'Fazenda Falha',
        state: 'MG',
        city: 'Manhuaçu',
        crops: ['cafe'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('DB connection error');
    });
  });

  describe('syncReseller', () => {
    it('deve sincronizar com sucesso profiles, resellers e reseller_categories', async () => {
      const selectMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'mock-reseller-profile-uuid' }, error: null }),
      });
      const upsertProfileMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const selectResellerMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'mock-reseller-uuid' }, error: null }),
      });
      const upsertResellerMock = vi.fn().mockReturnValue({
        select: selectResellerMock,
      });

      const catSelectMock = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'cat-1', name: 'Defensivos' }],
          error: null,
        }),
      });

      const upsertResellerCatMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { upsert: upsertProfileMock } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === 'resellers') {
          return { upsert: upsertResellerMock } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === 'categories') {
          return { select: catSelectMock } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === 'reseller_categories') {
          return { upsert: upsertResellerCatMock } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const result = await dbSyncService.syncReseller({
        role: 'RESELLER',
        razaoSocial: 'Agroinsumos Ltda',
        nomeFantasia: 'Agroinsumos Express',
        cnpj: '12.345.678/0001-95',
        corporateEmail: 'contato@agroinsumos.com.br',
        whatsapp: '(31) 98765-4321',
        password: 'Password123',
        confirmPassword: 'Password123',
        state: 'MG',
        city: 'Manhuaçu',
        deliveryRadiusKm: 50,
        categories: ['defensivos'],
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('mock-reseller-uuid');
    });
  });

  describe('syncPasswordReset e markPasswordResetUsed', () => {
    it('deve sincronizar token de redefinição no Supabase', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'password_resets') {
          return { insert: insertMock } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const result = await dbSyncService.syncPasswordReset({
        identifier: 'teste@cotacampo.com.br',
        token: 'rst_test123',
        code: '123456',
        channel: 'EMAIL',
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      expect(result.success).toBe(true);
      expect(insertMock).toHaveBeenCalled();
    });

    it('deve marcar código de 6 dígitos como utilizado', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'password_resets') {
          return { update: updateMock } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const result = await dbSyncService.markPasswordResetUsed('654321');

      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ used: true });
      expect(eqMock).toHaveBeenCalledWith('code', '654321');
    });
  });
});

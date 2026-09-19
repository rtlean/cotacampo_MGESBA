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
        cropDimensions: {
          cafe: { area: '12.5', plantsCount: '5000' },
        },
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('mock-producer-uuid');
      expect(upsertProducerCropsMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            producer_id: 'mock-producer-uuid',
            crop_id: 'crop-1',
            planted_area_hectares: 12.5,
            plants_count: 5000,
            scale: 'MEDIA',
          }),
        ]),
        { onConflict: 'producer_id,crop_id' }
      );
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

    it('deve lidar com profile sem ID em syncProducer', async () => {
      const selectMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: null }, error: null }),
      });
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockReturnValue({ select: selectMock }),
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await dbSyncService.syncProducer({
        role: 'PRODUCER',
        fullName: 'João Sem ID',
        email: 'semid@cotacampo.com.br',
        whatsapp: '(31) 99876-5432',
        password: 'Password123',
        confirmPassword: 'Password123',
        farmName: 'Fazenda Sem ID',
        state: 'MG',
        city: 'Manhuaçu',
        crops: ['cafe'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Perfil não gerado no Supabase');
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

    it('deve lidar com profileError e perfil sem ID em syncReseller', async () => {
      // 1. profileError
      const selectErrMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Profile insertion failure' } }),
      });
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockReturnValue({ select: selectErrMock }),
      } as unknown as ReturnType<typeof supabase.from>);

      const resErr = await dbSyncService.syncReseller({
        role: 'RESELLER',
        razaoSocial: 'Falha Ltda',
        nomeFantasia: 'Falha',
        cnpj: '12.345.678/0001-95',
        corporateEmail: 'falha@revenda.com.br',
        whatsapp: '(31) 98765-4321',
        password: 'Password123',
        confirmPassword: 'Password123',
        state: 'MG',
        city: 'Manhuaçu',
        deliveryRadiusKm: 50,
        categories: ['defensivos'],
      });
      expect(resErr.success).toBe(false);
      expect(resErr.error).toBe('Profile insertion failure');

      // 2. profile sem ID
      const selectNoIdMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: null }, error: null }),
      });
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockReturnValue({ select: selectNoIdMock }),
      } as unknown as ReturnType<typeof supabase.from>);

      const resNoId = await dbSyncService.syncReseller({
        role: 'RESELLER',
        razaoSocial: 'SemId Ltda',
        nomeFantasia: 'SemId',
        cnpj: '12.345.678/0001-95',
        corporateEmail: 'semid@revenda.com.br',
        whatsapp: '(31) 98765-4321',
        password: 'Password123',
        confirmPassword: 'Password123',
        state: 'MG',
        city: 'Manhuaçu',
        deliveryRadiusKm: 50,
        categories: ['defensivos'],
      });
      expect(resNoId.success).toBe(false);
      expect(resNoId.error).toBe('Perfil não gerado no Supabase');
    });

    it('deve lidar com erro na tabela resellers e exceção geral em syncReseller', async () => {
      const selectProfileMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'mock-profile-id' }, error: null }),
      });
      const selectResellerMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Resellers table error' } }),
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { upsert: vi.fn().mockReturnValue({ select: selectProfileMock }) } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === 'resellers') {
          return { upsert: vi.fn().mockReturnValue({ select: selectResellerMock }) } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const resErr = await dbSyncService.syncReseller({
        role: 'RESELLER',
        razaoSocial: 'Erro Ltda',
        nomeFantasia: 'Erro Fantasia',
        cnpj: '12.345.678/0001-95',
        corporateEmail: 'erro@revenda.com.br',
        whatsapp: '(31) 98765-4321',
        password: 'Password123',
        confirmPassword: 'Password123',
        state: 'MG',
        city: 'Manhuaçu',
        deliveryRadiusKm: 50,
        categories: ['defensivos'],
      });
      expect(resErr.success).toBe(false);
      expect(resErr.error).toBe('Resellers table error');

      // Exceção
      vi.spyOn(supabase, 'from').mockImplementationOnce(() => {
        throw new Error('Supabase completely crashed');
      });

      const resExc = await dbSyncService.syncReseller({
        role: 'RESELLER',
        razaoSocial: 'Crash Ltda',
        nomeFantasia: 'Crash Fantasia',
        cnpj: '12.345.678/0001-95',
        corporateEmail: 'crash@revenda.com.br',
        whatsapp: '(31) 98765-4321',
        password: 'Password123',
        confirmPassword: 'Password123',
        state: 'MG',
        city: 'Manhuaçu',
        deliveryRadiusKm: 50,
        categories: ['defensivos'],
      });
      expect(resExc.success).toBe(false);
      expect(resExc.error).toContain('Supabase completely crashed');
    });

    it('deve lidar com erro na tabela producers e exceção em syncProducer', async () => {
      const selectProfileMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'mock-profile-id' }, error: null }),
      });
      const selectProducerMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Producers table error' } }),
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { upsert: vi.fn().mockReturnValue({ select: selectProfileMock }) } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === 'producers') {
          return { upsert: vi.fn().mockReturnValue({ select: selectProducerMock }) } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const resErr = await dbSyncService.syncProducer({
        role: 'PRODUCER',
        fullName: 'Produtor Erro',
        email: 'erro@fazenda.com.br',
        whatsapp: '(31) 99876-5432',
        password: 'Password123',
        confirmPassword: 'Password123',
        farmName: 'Fazenda Erro',
        state: 'MG',
        city: 'Manhuaçu',
        crops: ['cafe'],
      });
      expect(resErr.success).toBe(false);
      expect(resErr.error).toBe('Producers table error');

      // Exceção
      vi.spyOn(supabase, 'from').mockImplementationOnce(() => {
        throw new Error('Producers crash');
      });

      const resExc = await dbSyncService.syncProducer({
        role: 'PRODUCER',
        fullName: 'Produtor Crash',
        email: 'crash@fazenda.com.br',
        whatsapp: '(31) 99876-5432',
        password: 'Password123',
        confirmPassword: 'Password123',
        farmName: 'Fazenda Crash',
        state: 'MG',
        city: 'Manhuaçu',
        crops: ['cafe'],
      });
      expect(resExc.success).toBe(false);
      expect(resExc.error).toContain('Producers crash');
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

    it('deve marcar token alfanumérico longo como utilizado e lidar com erros', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'password_resets') {
          return { update: updateMock } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const result = await dbSyncService.markPasswordResetUsed('rst_token_alphanumeric_123');
      expect(result.success).toBe(true);
      expect(eqMock).toHaveBeenCalledWith('token', 'rst_token_alphanumeric_123');

      // Erro retornado pelo Supabase
      eqMock.mockResolvedValueOnce({ error: { message: 'DB Error on update' } });
      const errResult = await dbSyncService.markPasswordResetUsed('123456');
      expect(errResult.success).toBe(false);
      expect(errResult.error).toBe('DB Error on update');

      // Exceção lançada
      eqMock.mockRejectedValueOnce(new Error('Network failure'));
      const excResult = await dbSyncService.markPasswordResetUsed('123456');
      expect(excResult.success).toBe(false);
      expect(excResult.error).toContain('Network failure');
    });

    it('deve capturar erro e exceção em syncPasswordReset', async () => {
      vi.spyOn(supabase, 'from').mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
      } as unknown as ReturnType<typeof supabase.from>);

      const errResult = await dbSyncService.syncPasswordReset({
        identifier: 'teste@cotacampo.com.br',
        token: 'rst_1',
        code: '111111',
        channel: 'EMAIL',
        expiresAt: Date.now(),
      });
      expect(errResult.success).toBe(false);
      expect(errResult.error).toBe('Insert failed');

      vi.spyOn(supabase, 'from').mockReturnValue({
        insert: vi.fn().mockRejectedValue(new Error('Crash in insert')),
      } as unknown as ReturnType<typeof supabase.from>);

      const excResult = await dbSyncService.syncPasswordReset({
        identifier: 'teste@cotacampo.com.br',
        token: 'rst_1',
        code: '111111',
        channel: 'EMAIL',
        expiresAt: Date.now(),
      });
      expect(excResult.success).toBe(false);
      expect(excResult.error).toContain('Crash in insert');
    });
  });
});

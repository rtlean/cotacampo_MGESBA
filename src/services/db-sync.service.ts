import { supabase, isSupabaseConfigured } from './supabase';
import { RegisterFormData, ResellerFormData } from '../types/user';
import { normalizeAreaInput, calculateCropScale } from '../schemas/producer.schema';
import { getCropName } from '../data/crops';

export interface SyncResult {
  success: boolean;
  error?: string;
  id?: string;
}

export const dbSyncService = {
  /**
   * Sincroniza o cadastro do Produtor Rural nas tabelas normalizadas do Supabase (3NF):
   * 1. profiles
   * 2. producers
   * 3. producer_crops (N:N com crops)
   */
  async syncProducer(data: RegisterFormData): Promise<SyncResult> {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      // 1. Inserir ou atualizar perfil unificado
      const phone = (data.whatsapp || (data as unknown as { phone?: string }).phone || '').replace(/\D/g, '');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            role: 'PRODUCER',
            full_name: data.fullName,
            email: data.email.toLowerCase().trim(),
            phone,
            state: data.state,
            city: data.city,
          },
          { onConflict: 'email' }
        )
        .select('id')
        .single();

      if (profileError) {
        console.warn('[Supabase] Aviso ao sincronizar profile do produtor:', profileError.message);
        return { success: false, error: profileError.message };
      }

      const profileId = profile?.id;
      if (!profileId) {
        return { success: false, error: 'Perfil não gerado no Supabase' };
      }

      // 2. Inserir ou atualizar registro de produtor
      const { data: producer, error: producerError } = await supabase
        .from('producers')
        .upsert(
          {
            profile_id: profileId,
            farm_name: data.farmName,
          },
          { onConflict: 'profile_id' }
        )
        .select('id')
        .single();

      if (producerError) {
        console.warn('[Supabase] Aviso ao sincronizar produtor:', producerError.message);
        return { success: false, error: producerError.message };
      }

      const producerId = producer?.id;

      // 3. Vincular culturas (N:N - US01.1 com detalhamento dimensional)
      if (producerId && data.crops && data.crops.length > 0) {
        // Mapear identificadores e nomes das culturas
        const cropDisplayNames = data.crops.map((c) => getCropName(c));
        const allKeys = Array.from(new Set([...data.crops, ...cropDisplayNames]));

        // Buscar IDs das culturas pelo nome
        const { data: cropsList } = await supabase
          .from('crops')
          .select('id, name, slug')
          .in('name', allKeys);

        if (cropsList && cropsList.length > 0) {
          const links = cropsList.map((c) => {
            const normalizeStr = (s?: string) =>
              (s || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '');

            const cNameNorm = normalizeStr(c.name);
            const cSlugNorm = normalizeStr(c.slug);

            const dim =
              data.cropDimensions?.[c.slug] ||
              data.cropDimensions?.[c.name] ||
              (data.cropDimensions
                ? Object.entries(data.cropDimensions).find(([k]) => {
                    const kNorm = normalizeStr(k);
                    return (
                      kNorm === cNameNorm ||
                      kNorm === cSlugNorm ||
                      cNameNorm.includes(kNorm) ||
                      kNorm.includes(cNameNorm)
                    );
                  })?.[1]
                : undefined);

            const area = dim ? normalizeAreaInput(dim.area) : 0;
            const plants = dim?.plantsCount
              ? parseInt(String(dim.plantsCount).replace(/\D/g, ''), 10)
              : null;
            const scale = calculateCropScale(area, plants);

            return {
              producer_id: producerId,
              crop_id: c.id,
              planted_area_hectares: area,
              plants_count: plants || null,
              scale,
            };
          });

          await supabase
            .from('producer_crops')
            .upsert(links, { onConflict: 'producer_id,crop_id' });
        }
      }

      return { success: true, id: producerId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Supabase] Exceção ao sincronizar produtor:', msg);
      return { success: false, error: msg };
    }
  },

  /**
   * Sincroniza o cadastro da Revenda de Insumos nas tabelas normalizadas do Supabase (3NF):
   * 1. profiles
   * 2. resellers
   * 3. reseller_categories (N:N com categories)
   */
  async syncReseller(data: ResellerFormData): Promise<SyncResult> {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      // 1. Inserir ou atualizar perfil unificado
      const companyName = data.razaoSocial || (data as unknown as { companyName?: string }).companyName || '';
      const email = (data.corporateEmail || (data as unknown as { email?: string }).email || '').toLowerCase().trim();
      const phone = (data.whatsapp || (data as unknown as { phone?: string }).phone || '').replace(/\D/g, '');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            role: 'RESELLER',
            full_name: companyName,
            email,
            phone,
            state: data.state,
            city: data.city,
          },
          { onConflict: 'email' }
        )
        .select('id')
        .single();

      if (profileError) {
        console.warn('[Supabase] Aviso ao sincronizar profile da revenda:', profileError.message);
        return { success: false, error: profileError.message };
      }

      const profileId = profile?.id;
      if (!profileId) {
        return { success: false, error: 'Perfil não gerado no Supabase' };
      }

      // 2. Inserir ou atualizar revenda
      const cleanCnpj = data.cnpj.replace(/\D/g, '');
      const tradeName = data.nomeFantasia || (data as unknown as { tradeName?: string }).tradeName || companyName;

      const { data: reseller, error: resellerError } = await supabase
        .from('resellers')
        .upsert(
          {
            profile_id: profileId,
            company_name: companyName,
            trade_name: tradeName,
            cnpj: cleanCnpj,
            delivery_radius_km: data.deliveryRadiusKm,
          },
          { onConflict: 'cnpj' }
        )
        .select('id')
        .single();

      if (resellerError) {
        console.warn('[Supabase] Aviso ao sincronizar revenda:', resellerError.message);
        return { success: false, error: resellerError.message };
      }

      const resellerId = reseller?.id;

      // 3. Vincular categorias (N:N)
      if (resellerId && data.categories && data.categories.length > 0) {
        const { data: catList } = await supabase
          .from('categories')
          .select('id, name')
          .in('name', data.categories);

        if (catList && catList.length > 0) {
          const links = catList.map((cat) => ({
            reseller_id: resellerId,
            category_id: cat.id,
          }));

          await supabase
            .from('reseller_categories')
            .upsert(links, { onConflict: 'reseller_id,category_id' });
        }
      }

      return { success: true, id: resellerId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Supabase] Exceção ao sincronizar revenda:', msg);
      return { success: false, error: msg };
    }
  },

  /**
   * Sincroniza tokens de recuperação de senha no Supabase
   */
  async syncPasswordReset(params: {
    identifier: string;
    token: string;
    code: string;
    channel: 'WHATSAPP' | 'EMAIL';
    expiresAt: number | string;
  }): Promise<SyncResult> {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const { error } = await supabase.from('password_resets').insert({
        identifier: params.identifier,
        token: params.token,
        code: params.code,
        channel: params.channel,
        expires_at: new Date(params.expiresAt).toISOString(),
        used: false,
      });

      if (error) {
        console.warn('[Supabase] Aviso ao registrar password_reset:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Supabase] Exceção ao registrar password_reset:', msg);
      return { success: false, error: msg };
    }
  },

  /**
   * Marca o token ou código como utilizado no Supabase
   */
  async markPasswordResetUsed(tokenOrCode: string): Promise<SyncResult> {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const cleanInput = tokenOrCode.trim();
      const isSixDigit = /^\d{6}$/.test(cleanInput);

      let query = supabase.from('password_resets').update({ used: true });

      if (isSixDigit) {
        query = query.eq('code', cleanInput);
      } else {
        query = query.eq('token', cleanInput);
      }

      const { error } = await query;
      if (error) {
        console.warn('[Supabase] Aviso ao marcar reset como usado:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Supabase] Exceção ao marcar reset como usado:', msg);
      return { success: false, error: msg };
    }
  },
};

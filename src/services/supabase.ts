/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://uwrvxmlgvgvvqmtucidk.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_y5aPNNUO7xqZj8-m6lPsuQ_4trcol-t';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface DatabaseProfile {
  id?: string;
  user_id?: string | null;
  role: 'PRODUCER' | 'RESELLER' | 'ADMIN';
  full_name: string;
  email: string;
  phone: string;
  state: 'MG' | 'ES' | 'BA';
  city: string;
}

export interface DatabaseProducer {
  id?: string;
  profile_id: string;
  farm_name: string;
}

export interface DatabaseReseller {
  id?: string;
  profile_id: string;
  company_name: string;
  trade_name: string;
  cnpj: string;
  delivery_radius_km: number;
}

export interface DatabasePasswordReset {
  id?: string;
  identifier: string;
  token: string;
  code: string;
  channel: 'WHATSAPP' | 'EMAIL';
  expires_at: string;
  used: boolean;
}

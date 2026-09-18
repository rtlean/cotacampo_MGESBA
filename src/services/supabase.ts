/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://uwrvxmlgvgvvqmtucidk.supabase.co';
export const supabaseAnonKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3cnZ4bWxndmd2dnFtdHVjaWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NjM1MzAsImV4cCI6MjEwNDAzOTUzMH0.mNtliQC1Xqiv9WHa3jzopGkKs4Z_VKnuLzkL7DNCspo';

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

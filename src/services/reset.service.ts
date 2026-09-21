import { supabase } from './supabase';

export const RESETTABLE_STORAGE_KEYS = [
  'cotacampo_auth_user',
  'cotacampo_producers_db',
  'cotacampo_resellers_db',
  'cotacampo_quotations',
  'cotacampo_quotation_draft',
  'cotacampo_flash_message',
  'cotacampo_technological_packages',
  'cotacampo_quotation_notifications',
  'cotacampo_quotation_bids',
  'cotacampo_password_resets',
  'cotacampo_welcome_notice',
] as const;

export const resetService = {
  /**
   * Limpa completamente todos os dados cadastrados localmente no app:
   * - Usuário autenticado
   * - Produtores cadastrados
   * - Revendas cadastradas
   * - Cotações e rascunhos
   * - Propostas (bids)
   * - Notificações
   * - Pacotes tecnológicos
   * - Tokens de redefinição de senha
   */
  async clearAllData(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // 1. Desconecta sessão do Supabase se houver
      await supabase.auth.signOut().catch(() => {});
    } catch {
      // ignora se offline
    }

    try {
      // 2. Remove todas as chaves específicas do CotaCampo
      RESETTABLE_STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
      });

      // 3. Define arrays vazios explicitamente para evitar auto-seed de mocks
      localStorage.setItem('cotacampo_producers_db', '[]');
      localStorage.setItem('cotacampo_resellers_db', '[]');
      localStorage.setItem('cotacampo_quotations', '[]');
      localStorage.setItem('cotacampo_technological_packages', '[]');
      localStorage.setItem('cotacampo_quotation_notifications', '[]');
      localStorage.setItem('cotacampo_quotation_bids', '[]');
      localStorage.setItem('cotacampo_password_resets', '[]');

      // 4. Limpa quaisquer chaves remanescentes de autenticação ou sessão
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.startsWith('cotacampo_')) {
          if (!['cotacampo_producers_db', 'cotacampo_resellers_db', 'cotacampo_quotations', 'cotacampo_technological_packages', 'cotacampo_quotation_notifications', 'cotacampo_quotation_bids', 'cotacampo_password_resets'].includes(key)) {
            localStorage.removeItem(key);
          }
        }
      });

      sessionStorage.clear();
    } catch (err) {
      console.error('Erro ao limpar dados do CotaCampo:', err);
    }
  },
};

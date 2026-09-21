-- ==============================================================================
-- LIMPAR TODOS OS DADOS CADASTRADOS NO COTACAMPO (SUPABASE)
-- ==============================================================================
-- Instruções:
-- 1. Abra o Supabase Dashboard: https://supabase.com/dashboard/project/uwrvxmlgvgvvqmtucidk
-- 2. Vá em "SQL Editor"
-- 3. Cole o script abaixo e clique em "Run"
--
-- Este script apaga com segurança todos os dados cadastrados (cotações, propostas,
-- revendas, produtores, perfis e resets), preservando intacta a estrutura do
-- banco e as tabelas de domínio obrigatórias ('crops' e 'categories').
-- ==============================================================================

TRUNCATE TABLE 
  quotation_notifications,
  quotation_bid_items,
  quotation_bids,
  quotation_items,
  quotation_requests,
  reseller_categories,
  producer_crops,
  password_resets,
  resellers,
  producers,
  profiles
CASCADE;

-- Confirmação
SELECT 'Base de dados do CotaCampo limpa com sucesso!' AS status;

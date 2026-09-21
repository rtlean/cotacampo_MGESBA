import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uwrvxmlgvgvvqmtucidk.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3cnZ4bWxndmd2dnFtdHVjaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ2MzUzMCwiZXhwIjoyMTA0MDM5NTMwfQ.qotCgYkhJAiw21IZ3iWFPPLul0ZPFEQIH1AqpDtLeQw';

async function cleanDatabase() {
  console.log('🌱 Conectando ao Supabase para limpeza total...');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Cotações, Itens, Notificações e Lances
  await supabase.from('quotation_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('quotation_bid_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('quotation_bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('quotation_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('quotation_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Relacionamentos
  await supabase.from('reseller_categories').delete().neq('reseller_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('producer_crops').delete().neq('producer_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('password_resets').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 3. Revendas, Produtores e Perfis
  const delResellers = await supabase.from('resellers').delete().neq('id', '00000000-0000-0000-0000-000000000000').select();
  const delProducers = await supabase.from('producers').delete().neq('id', '00000000-0000-0000-0000-000000000000').select();
  const delProfiles = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000').select();

  // 4. Usuários de autenticação
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  if (authUsers?.users?.length) {
    for (const u of authUsers.users) {
      await supabase.auth.admin.deleteUser(u.id);
    }
  }

  console.log('✅ Banco de dados zerado com sucesso!');
  console.log(`- Revendas removidas: ${delResellers.data?.length || 0}`);
  console.log(`- Produtores removidos: ${delProducers.data?.length || 0}`);
  console.log(`- Perfis removidos: ${delProfiles.data?.length || 0}`);
  console.log(`- Usuários de Auth removidos: ${authUsers?.users?.length || 0}`);
}

cleanDatabase().catch((err) => {
  console.error('Erro na limpeza do banco:', err);
  process.exit(1);
});

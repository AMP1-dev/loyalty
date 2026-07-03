const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function verify() {
  console.log('--- Verificando transações recentes ---');
  const { data: txs, error: err1 } = await s.from('transacoes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (err1) {
    console.error('Erro txs:', err1);
  } else {
    console.log('Transações recentes:', txs);
  }

  console.log('\n--- Verificando checkins recentes ---');
  const { data: checkins, error: err2 } = await s.from('checkins')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (err2) {
    console.error('Erro checkins:', err2);
  } else {
    console.log('Checkins recentes:', checkins);
  }
}

verify();

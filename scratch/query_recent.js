const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function checkRecent() {
  console.log('--- Last 10 roleta_mesa_participacoes ---');
  const { data: participacoes, error: err1 } = await s.from('roleta_mesa_participacoes').select('*').order('created_at', { ascending: false }).limit(10);
  if (err1) console.error(err1);
  else console.log(participacoes);

  console.log('\n--- Last 10 bonus_pendentes ---');
  const { data: bonus, error: err2 } = await s.from('bonus_pendentes').select('*').order('created_at', { ascending: false }).limit(10);
  if (err2) console.error(err2);
  else console.log(bonus);
}

checkRecent();

const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function run() {
  const { data: d1 } = await s.from('roleta_mesa_premios').select('*').eq('loja_id', 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265');
  console.log('roleta_mesa_premios:', d1);

  const { data: d2 } = await s.from('roleta_premios_mesa').select('*').eq('loja_id', 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265');
  console.log('roleta_premios_mesa:', d2);
}

run();

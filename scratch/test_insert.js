const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function test() {
  console.log('--- Testing insert to roleta_mesa_participacoes ---');
  const res1 = await s.from('roleta_mesa_participacoes').insert({
    loja_id: 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265',
    cliente_cpf: '12345678901',
    premio_nome: 'Teste',
    premio_valor: 10,
    nota_nps: 5,
    oferta_google_dobro: false,
    premio_resgatado: false
  });
  console.log('roleta_mesa_participacoes error:', res1.error);
  console.log('roleta_mesa_participacoes data:', res1.data);

  console.log('\n--- Testing insert to bonus_pendentes ---');
  const res2 = await s.from('bonus_pendentes').insert({
    cliente_cpf: '12345678901',
    loja_id: 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265',
    pontos: 10,
    usado: false,
    data_expiracao: new Date(Date.now() + 24*3600*1000).toISOString()
  });
  console.log('bonus_pendentes error:', res2.error);
  console.log('bonus_pendentes data:', res2.data);
}

test();

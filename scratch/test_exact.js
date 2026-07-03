const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function testExact() {
  console.log('--- Testing exact insert ---');
  const res = await s.from('roleta_mesa_participacoes').insert({
    loja_id: 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265',
    cliente_cpf: '19991311994',
    premio_id: '0892b707-1d34-407a-bab0-616742244eab',
    premio_nome: '10%',
    premio_valor: 10,
    nota_nps: 5,
    oferta_google_dobro: true,
    premio_resgatado: false
  });
  console.log('Error:', res.error);
  console.log('Data:', res.data);
}

testExact();

const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function testFallback() {
  const storeId = 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265';
  const testPhone = '19991311994';
  const invalidPrizeId = '0892b707-1d34-407a-bab0-616742244eab'; // Valid UUID syntax, not in roleta_premios_mesa

  console.log('--- Teste de Fallback de Insercao na Mesa ---');
  console.log(`Tentando inserir com premio_id: ${invalidPrizeId}...`);

  const res1 = await s.from('roleta_mesa_participacoes').insert({
    loja_id: storeId,
    cliente_cpf: testPhone,
    premio_id: invalidPrizeId,
    premio_nome: 'Teste Fallback 10%',
    premio_valor: 10,
    nota_nps: 5,
    oferta_google_dobro: true,
    premio_resgatado: false
  }).select();

  let insertedId = null;

  if (res1.error) {
    console.log('Insercao inicial falhou (esperado devido à FK constraint):', res1.error.message);
    console.log('Iniciando fallback com premio_id: null...');

    const res2 = await s.from('roleta_mesa_participacoes').insert({
      loja_id: storeId,
      cliente_cpf: testPhone,
      premio_id: null,
      premio_nome: 'Teste Fallback 10% (Recuperado)',
      premio_valor: 10,
      nota_nps: 5,
      oferta_google_dobro: true,
      premio_resgatado: false
    }).select();

    if (res2.error) {
      console.error('Falha no fallback:', res2.error.message);
    } else {
      console.log('Fallback inserido com sucesso! Dados:', res2.data);
      insertedId = res2.data[0].id;
    }
  } else {
    console.log('Insercao inicial funcionou sem erro (inesperado se a FK estiver ativa):', res1.data);
    insertedId = res1.data[0].id;
  }

  // Limpeza
  if (insertedId) {
    console.log(`Limpando linha de teste criada com ID: ${insertedId}...`);
    const cleanup = await s.from('roleta_mesa_participacoes').delete().eq('id', insertedId);
    if (cleanup.error) {
      console.error('Erro ao limpar linha de teste:', cleanup.error.message);
    } else {
      console.log('Limpeza concluida com sucesso.');
    }
  }
}

testFallback();

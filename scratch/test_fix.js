const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function testFix() {
  const cpfTest = '98765432100';
  
  console.log('--- Testando pagamento de R$ 100,00 ---');
  const res1 = await s.rpc('realizar_pagamento', {
    p_cliente_cpf: cpfTest,
    p_loja_id: 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265',
    p_valor: 100,
    p_usar_cashback: false,
    p_aplicar_bonus: false
  });
  console.log('Data 100:', res1.data);
  console.log('Error 100:', res1.error);
}

testFix();

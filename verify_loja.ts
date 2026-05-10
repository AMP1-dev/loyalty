import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://orzuawmiuvthpczhbouj.supabase.co';
const supabaseAnonKey = 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyStore() {
  const lojaId = 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265';
  console.log(`Verificando loja: ${lojaId}`);
  
  const { data, error } = await supabase.from('lojas').select('*').eq('id', lojaId).single();
  
  if (error) {
    console.error('Erro ao buscar loja:', error);
  } else {
    console.log('Loja encontrada:', data.nome);
  }

  // Verifica se a tabela checkins aceita insert
  const { error: checkError } = await supabase.from('checkins').insert([{ cliente_cpf: '00000000000', loja_id: lojaId, status: 'teste' }]);
  if (checkError) {
    console.log('Erro de inserção na checkins:', checkError.code, checkError.message);
  } else {
    console.log('Inserção na checkins funcionou!');
    await supabase.from('checkins').delete().eq('cliente_cpf', '00000000000');
  }
}

verifyStore();

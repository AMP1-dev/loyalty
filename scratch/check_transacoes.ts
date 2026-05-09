
import { supabase } from '../lib/supabase';

async function checkSchema() {
  const { data, error } = await supabase.from('transacoes').select('*').limit(1);
  if (error) {
    console.error('Erro ao ler transacoes:', error);
  } else {
    console.log('Colunas encontradas:', Object.keys(data[0] || {}));
    console.log('Exemplo de dado:', data[0]);
  }
}

checkSchema();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://orzuawmiuvthpczhbouj.supabase.co';
const supabaseAnonKey = 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkClientesTable() {
  console.log('Verificando estrutura da tabela clientes...');
  
  // Tenta buscar um registro para ver as colunas
  const { data, error } = await supabase.from('clientes').select('*').limit(1);
  
  if (error) {
    console.error('Erro ao acessar tabela clientes:', error.code, error.message);
  } else {
    console.log('Colunas encontradas na tabela clientes:', Object.keys(data[0] || {}));
  }
}

checkClientesTable();


const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://orzuawmiuvthpczhbouj.supabase.co';
const supabaseKey = 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getLoja() {
  const { data, error } = await supabase.from('lojas').select('id, nome');
  if (error) {
    console.error('Erro:', error);
    return;
  }
  console.log('Lojas:', JSON.stringify(data, null, 2));
}

getLoja();

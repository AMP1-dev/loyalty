const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function inspectTable() {
  const { data, error } = await s.from('clientes').select('*').limit(1);
  if (error) {
    console.error('Error inspecting:', error);
  } else {
    console.log('Columns in clientes:', data.length > 0 ? Object.keys(data[0]) : 'No data in table');
  }
}

inspectTable();

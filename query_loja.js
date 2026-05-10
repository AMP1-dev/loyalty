
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://orzuawmiuvthpczhbouj.supabase.co';
const supabaseAnonKey = 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
supabase.from('lojas').select('id, nome').limit(20).then(({ data, error }) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result:', JSON.stringify(data));
  }
  process.exit(0);
});

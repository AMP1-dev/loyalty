const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function run() {
  // Let's check if we can query pg_proc. Note: usually not exposed, but let's try.
  const { data, error } = await s.from('pg_proc').select('proname').limit(10);
  console.log('pg_proc:', data, error?.message);
}

run();

const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function check() {
  const cpfs = ['19991311994', '5519991311994', '1991311994', '5519991311994'];
  console.log('Querying info for CPFs:', cpfs);

  for (const table of ['clientes', 'roleta_mesa_participacoes', 'bonus_pendentes', 'transacoes', 'checkins', 'contatos_mesa_remarketing']) {
    console.log(`\n--- Table: ${table} ---`);
    try {
      const { data, error } = await s.from(table).select('*').in('cliente_cpf', cpfs);
      if (error) {
        // Some tables might have different CPF column name (e.g. clientes.cpf)
        const { data: data2, error: error2 } = await s.from(table).select('*').in('cpf', cpfs);
        if (error2) {
          console.error(`Error in table ${table}:`, error.message, error2.message);
        } else {
          console.log(data2);
        }
      } else {
        console.log(data);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

check();

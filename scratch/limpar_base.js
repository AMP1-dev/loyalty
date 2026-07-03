const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://orzuawmiuvthpczhbouj.supabase.co';
const supabaseAnonKey = 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const lojasManteigas = ['01dbd0e3-6dba-42c9-8896-c1f00854a87e', 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265'];

async function limparTabela(tabela) {
  const { data, error } = await supabase.from(tabela).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
     const { data: d2, error: e2 } = await supabase.from(tabela).delete().neq('created_at', '1970-01-01T00:00:00.000Z');
     if (e2) {
         console.log(`Erro ao limpar ${tabela}:`, e2.message);
     } else {
         console.log(`Sucesso ao limpar ${tabela}`);
     }
  } else {
     console.log(`Sucesso ao limpar ${tabela}`);
  }
}

async function limparTabelaClientes() {
  const { data, error } = await supabase.from('clientes').delete().neq('cpf', '00000000000');
  if (error) console.log(`Erro ao limpar clientes:`, error.message);
  else console.log(`Sucesso ao limpar clientes`);
}

async function limparRecompensas(tabela) {
  const { data, error } = await supabase.from(tabela).select('id, loja_id');
  if (error) {
      console.log(`Erro ao listar ${tabela}:`, error.message);
      return;
  }
  let removidos = 0;
  for (const row of data || []) {
      if (!lojasManteigas.includes(row.loja_id)) {
          const { error: delErr } = await supabase.from(tabela).delete().eq('id', row.id);
          if (delErr) console.log(`Erro ao deletar item ${row.id} de ${tabela}:`, delErr.message);
          else removidos++;
      }
  }
  console.log(`Foram removidos ${removidos} itens de ${tabela} (Lojas de Teste).`);
}

async function run() {
  console.log('Iniciando limpeza da base de testes...');

  const tabelasParaZerar = [
    'checkins', 'transacoes', 'resgates', 'cashbacks',
    'bonus_pendentes', 'bonus_historico', 'brindes_pendentes',
    'roleta_mesa_participacoes', 'contatos_mesa_remarketing', 'respostas_nps',
    'intercambio_historico_detalhado', 'intercambio_caixa', 'intercambio_itens', 'intercambio_tokens'
  ];

  for (const tabela of tabelasParaZerar) {
    await limparTabela(tabela);
  }

  await limparTabelaClientes();

  await limparRecompensas('recompensas');
  await limparRecompensas('roleta_mesa_premios');
  await limparRecompensas('roleta_premios');

  console.log('Limpeza finalizada.');
}

run();

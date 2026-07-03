const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://orzuawmiuvthpczhbouj.supabase.co', 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09');

async function testDeviceLock() {
  const storeId = 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265';
  const testPhone = '19991311994';

  console.log('--- Teste da Logica de Bloqueio de 4 horas ---');
  
  // 1. Simular checagem do Local Storage para dispositivo
  const agora = new Date();
  console.log('Data/Hora Local Atual:', agora.toString());
  console.log('Data/Hora UTC correspondente (ISO):', agora.toISOString());
  
  // Simular um registro de jogo feito agora e um feito a 4h10m atras
  const jogoRecente = new Date().toISOString();
  const jogoAntigo = new Date(Date.now() - 4.2 * 60 * 60 * 1000).toISOString();
  
  console.log('\n--- Simulando checagem local ---');
  const validarTempo = (ultimoJogoIso) => {
    const dataLocal = new Date(ultimoJogoIso);
    const ag = new Date();
    const diffMs = ag.getTime() - dataLocal.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);
    console.log(`Último jogo em: ${ultimoJogoIso}`);
    console.log(`Diferença: ${diffHoras.toFixed(2)} horas.`);
    if (diffHoras < 4) {
      console.log('Bloqueado! Menos de 4 horas.');
      return false;
    }
    console.log('Permitido! Mais de 4 horas.');
    return true;
  };
  
  console.log('Testando jogo feito AGORA:');
  validarTempo(jogoRecente);
  console.log('Testando jogo feito a 4h12m atrás:');
  validarTempo(jogoAntigo);

  // 2. Simular checagem remota no Supabase (UTC)
  console.log('\n--- Simulando checagem remota no Supabase (em UTC) ---');
  const agoraUTC = new Date();
  const quatroHorasAtras = new Date(agoraUTC.getTime() - 4 * 60 * 60 * 1000).toISOString();
  console.log('Buscando registros no Supabase criados após (UTC ISO):', quatroHorasAtras);

  const { data, error } = await s
    .from('roleta_mesa_participacoes')
    .select('id, created_at')
    .eq('loja_id', storeId)
    .eq('cliente_cpf', testPhone)
    .gte('created_at', quatroHorasAtras)
    .limit(5);

  if (error) {
    console.error('Erro na consulta:', error.message);
  } else {
    console.log(`Consulta executada com sucesso. Encontrados ${data.length} registros nos ultimos 4 horas:`, data);
  }
}

testDeviceLock();

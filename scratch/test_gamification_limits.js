// Simulacao dos testes de limite de jogabilidade (Mesa e Roleta da Carteira)
const stores = {
  AMP: 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265',
};

const storage = {};
const buscarStorage = async (chave) => storage[chave] || null;
const salvarStorage = async (chave, valor) => { storage[chave] = valor; };

// Banco de dados simulado para participações da Mesa (roleta_mesa_participacoes)
const dbMesaParticipacoes = [];

async function queryDbMesaParticipacoes(lojaId, cleanTel, tempoAtras) {
  return dbMesaParticipacoes.filter(p => 
    p.loja_id === lojaId && 
    p.cliente_cpf === cleanTel && 
    new Date(p.created_at) >= new Date(tempoAtras)
  );
}

// ---------------------------------------------------------
// 1. SIMULAÇÃO DO FLUXO DO JOGO DA MESA (CAMPO MINADO)
// ---------------------------------------------------------
async function simulateValidarMesaJogue(telefone, lojaId) {
  try {
    const cleanTel = telefone.replace(/\D/g, '');
    const horasBloqueio = 4; // Mesa física é fixa em 4 horas

    // A. Checagem do dispositivo (Antifraude 4h)
    const ultimoJogoDevice = await buscarStorage(`device_mesa_ultimo_jogo_${lojaId}`);
    if (ultimoJogoDevice) {
      const dataLocal = new Date(ultimoJogoDevice);
      const agora = new Date();
      const diffMs = agora.getTime() - dataLocal.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      if (diffHoras < 4) {
        console.log(`[Mesa] -> Bloqueado pelo Device Storage! (Último jogo há ${diffHoras.toFixed(2)}h, limite 4h)`);
        return false;
      }
    }

    // B. Checagem do telefone (4h)
    const jaJogouLocal = await buscarStorage(`ja_jogou_${lojaId}_${cleanTel}`);
    if (jaJogouLocal) {
      const dataLocal = new Date(jaJogouLocal);
      const agora = new Date();
      const diffMs = agora.getTime() - dataLocal.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      if (diffHoras < 4) {
        console.log(`[Mesa] -> Bloqueado pelo Telefone Storage! (Último jogo há ${diffHoras.toFixed(2)}h, limite 4h)`);
        return false;
      }
    }

    // C. Checagem no Banco de Dados (4h)
    const agoraUTC = new Date();
    const tempoAtras = new Date(agoraUTC.getTime() - horasBloqueio * 60 * 60 * 1000).toISOString();
    const matches = await queryDbMesaParticipacoes(lojaId, cleanTel, tempoAtras);
    if (matches.length > 0) {
      console.log(`[Mesa] -> Bloqueado pelo Banco de Dados!`);
      return false;
    }

    console.log('[Mesa] -> Permitido jogar! ✅');
    return true;
  } catch (error) {
    return true;
  }
}

// ---------------------------------------------------------
// 2. SIMULAÇÃO DO FLUXO DA ROLETA DO CTA (INTERNA DO APLICATIVO)
// ---------------------------------------------------------
async function simulateAbrirRoletaWallet(telefone, lojaId, config) {
  try {
    const clean = telefone.replace(/\D/g, '');

    // A. Ativação
    if (config && config.roleta_ativa === false) {
      console.log('[Carteira] Resultado: A roleta da sorte está desativada para esta loja. 🎡');
      return false;
    }

    // B. Intervalo Customizado
    const jaJogouKey = `ja_jogou_roleta_carteira_${lojaId}_${clean}`;
    const jaJogouLocal = await buscarStorage(jaJogouKey);
    
    const diasIntervalo = (config && config.roleta_intervalo_dias !== undefined && config.roleta_intervalo_dias !== null) 
      ? Number(config.roleta_intervalo_dias) 
      : 1;

    if (jaJogouLocal) {
      const dataLocal = new Date(jaJogouLocal);
      const agora = new Date();
      const diffMs = agora.getTime() - dataLocal.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      const horasBloqueio = diasIntervalo * 24;
      
      if (diffHoras < horasBloqueio) {
        if (diasIntervalo === 1) {
          console.log('[Carteira] Resultado: "Aguardamos você novamente amanhã para jogar com a gente ;)" ⏳');
        } else {
          console.log(`[Carteira] Resultado: "Você já jogou recentemente! A roleta estará disponível após ${diasIntervalo} dias." ⏳`);
        }
        return false;
      }
    }

    console.log('[Carteira] -> Permitido abrir e jogar! 🎡✅');
    return true;
  } catch (error) {
    return true;
  }
}

// Rodar Testes
async function runTests() {
  const tel = '11999999999';
  const configLoja = { roleta_ativa: true, roleta_intervalo_dias: 1 };

  console.log('--- TESTE 1: FLUXO DE MESA (CAMP MINADO) - FIXO 4H ---');
  // Jogada 1 (Ok)
  await simulateValidarMesaJogue(tel, stores.AMP);
  // Simular conclusão
  const agora = new Date();
  await salvarStorage(`device_mesa_ultimo_jogo_${stores.AMP}`, agora.toISOString());
  await salvarStorage(`ja_jogou_${stores.AMP}_${tel}`, agora.toISOString());
  dbMesaParticipacoes.push({ loja_id: stores.AMP, cliente_cpf: tel, created_at: agora.toISOString() });

  // Jogada 2 imediata (Bloqueia)
  await simulateValidarMesaJogue(tel, stores.AMP);

  // Jogada 3 após 5 horas (Permite)
  const cincoHorasAtras = new Date(agora.getTime() - 5 * 60 * 60 * 1000);
  await salvarStorage(`device_mesa_ultimo_jogo_${stores.AMP}`, cincoHorasAtras.toISOString());
  await salvarStorage(`ja_jogou_${stores.AMP}_${tel}`, cincoHorasAtras.toISOString());
  dbMesaParticipacoes[0].created_at = cincoHorasAtras.toISOString();
  await simulateValidarMesaJogue(tel, stores.AMP);

  console.log('\n--- TESTE 2: FLUXO DE ROLETA INTERNA DA CARTEIRA ---');
  // Jogada 1 (Ok)
  await simulateAbrirRoletaWallet(tel, stores.AMP, configLoja);
  // Simular conclusão
  const jaJogouKey = `ja_jogou_roleta_carteira_${stores.AMP}_${tel}`;
  await salvarStorage(jaJogouKey, agora.toISOString());

  // Jogada 2 imediata (Bloqueia - Mensagem "Aguardamos você amanhã...")
  await simulateAbrirRoletaWallet(tel, stores.AMP, configLoja);

  // Jogada 3 após 5 horas com config de 1 dia (Ainda bloqueia - limite é 24h)
  const jaJogouKeyOntem = `ja_jogou_roleta_carteira_${stores.AMP}_${tel}`;
  await salvarStorage(jaJogouKeyOntem, cincoHorasAtras.toISOString());
  await simulateAbrirRoletaWallet(tel, stores.AMP, configLoja);

  // Jogada 4 após 25 horas com config de 1 dia (Permite)
  const vinteCincoHorasAtras = new Date(agora.getTime() - 25 * 60 * 60 * 1000);
  await salvarStorage(jaJogouKeyOntem, vinteCincoHorasAtras.toISOString());
  await simulateAbrirRoletaWallet(tel, stores.AMP, configLoja);

  // Jogada 5: Roleta Desativada
  const configDesativada = { roleta_ativa: false, roleta_intervalo_dias: 1 };
  await simulateAbrirRoletaWallet(tel, stores.AMP, configDesativada);
}

runTests();

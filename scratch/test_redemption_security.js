// Simulacao de seguranca de saldos por loja e resgate local no Springs Loyalty
const stores = {
  AMP: 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265',
  CirurgicaViver: 'c9f20184-d9e6-47d5-bc7f-3e484d3fe299'
};

// Dados simulados do banco
const mockTransacoes = [
  { cliente_cpf: '12345678901', loja_id: stores.AMP, pontos_gerados: 100 },
  { cliente_cpf: '12345678901', loja_id: stores.AMP, pontos_gerados: 50 }
];
const mockResgates = [
  { cliente_cpf: '12345678901', loja_id: stores.AMP, pontos_usados: 30 }
];
const mockBonus = [
  { cliente_cpf: '12345678901', loja_id: stores.AMP, pontos: 20, usado: false }
];

// Simulacao da funcao carregarDados e calculo de saldos
function simulateCarregarDados(lojaId) {
  console.log(`\n--- Carregando dados para a loja: ${lojaId} ---`);
  
  // Saldo global (Rede)
  const totalGlobal = mockTransacoes.reduce((a, t) => a + t.pontos_gerados, 0) + mockBonus.reduce((a, b) => a + b.pontos, 0);
  const usadosGlobal = mockResgates.reduce((a, r) => a + r.pontos_usados, 0);
  const saldoGlobal = totalGlobal - usadosGlobal;
  
  // Saldo local da loja selecionada
  const pTransLocal = mockTransacoes.filter(t => t.loja_id === lojaId).reduce((a, t) => a + t.pontos_gerados, 0);
  const pBonusLocal = mockBonus.filter(b => b.loja_id === lojaId).reduce((a, b) => a + b.pontos, 0);
  const pUsadosLocal = mockResgates.filter(r => r.loja_id === lojaId).reduce((a, r) => a + r.pontos_usados, 0);
  const saldoLocal = (pTransLocal + pBonusLocal) - pUsadosLocal;

  console.log(`Saldo Global (Rede): ${saldoGlobal} SPG`);
  console.log(`Saldo Local (Desta Loja): ${saldoLocal} SPG`);

  return { saldoGlobal, saldoLocal };
}

// Simulacao de resgatarBrinde
function simulateResgatarBrinde(item, saldos) {
  console.log(`\nTentando resgatar: "${item.nome}" (Custo: ${item.custo_pontos} SPG)`);
  console.log(`Verificação: saldoLocal (${saldos.saldoLocal} SPG) >= custo (${item.custo_pontos} SPG)`);

  if (saldos.saldoLocal < item.custo_pontos) {
    console.log('Resultado: Saldo insuficiente nesta loja! Resgate Bloqueado. ❌');
    return { success: false, error: 'Saldo insuficiente nesta loja' };
  }

  console.log('Resultado: Sucesso! Resgate autorizado na loja. ✅');
  return { success: true };
}

// Rodar testes
function runTests() {
  const brinde = { nome: 'Brinde Especial', custo_pontos: 50 };

  // Caso 1: Cliente esta na loja AMP (onde tem saldo)
  const saldosAMP = simulateCarregarDados(stores.AMP);
  simulateResgatarBrinde(brinde, saldosAMP);

  // Caso 2: Cliente muda de loja para Cirurgica Viver (onde nao tem saldo)
  // Sem reautenticar/sair, mas com a correcao de seguranca local de saldo
  const saldosViver = simulateCarregarDados(stores.CirurgicaViver);
  simulateResgatarBrinde(brinde, saldosViver);
}

runTests();

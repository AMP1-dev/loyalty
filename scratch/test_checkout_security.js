const bcrypt = require('bcryptjs');

// Simulacao das regras de validacao do cliente
async function simulateValidarPin(pinDigitado, pinHashDoBanco, isCheckoutVal) {
  console.log(`\n--- Simulando validarPin (Digitado: "${pinDigitado}", Checkout: ${isCheckoutVal}) ---`);
  
  // 1. Verificar se bate com o hash do banco
  const matches = await bcrypt.compare(pinDigitado, pinHashDoBanco);
  if (!matches) {
    console.log('Resultado: PIN Incorreto ❌');
    return { success: false, mode: 'retry' };
  }
  
  // 2. Se bateu, verificar se e o PIN temporario "0000"
  if (pinDigitado === '0000') {
    console.log('Resultado: PIN Temporário detectado! Entrando no modo de cadastro/criação 🔑');
    return { success: true, mode: 'create_new' };
  }
  
  if (isCheckoutVal) {
    console.log('Resultado: PIN Correto! Checkout liberado (status: finalizado) 🎉');
    return { success: true, mode: 'finalizado' };
  } else {
    console.log('Resultado: PIN Correto! Login normal concluído.');
    return { success: true, mode: 'normal' };
  }
}

function simulateCriarNovoPin(pinDigitado) {
  console.log(`\n--- Simulando criarNovoPin (Digitado: "${pinDigitado}") ---`);
  
  // Validacao de senhas fracas
  if (pinDigitado === '0000' || pinDigitado === '1234') {
    console.log('Resultado: Bloqueado! Senha fraca detectada (0000 ou 1234) 🔒');
    return { success: false, error: 'Senha fraca' };
  }
  
  console.log('Resultado: Sucesso! Nova senha permitida e gravada com sucesso. ✅');
  return { success: true };
}

async function runTests() {
  const hashOriginal = await bcrypt.hash('5566', 10);
  const hashReset = await bcrypt.hash('0000', 10);
  
  // Teste 1: Cliente digita a senha correta dele no checkout
  await simulateValidarPin('5566', hashOriginal, true);
  
  // Teste 2: Cliente digita senha incorreta no checkout
  await simulateValidarPin('1111', hashOriginal, true);
  
  // Teste 3: Lojista reseta para 0000, cliente digita 0000
  const step1 = await simulateValidarPin('0000', hashReset, true);
  
  // Teste 4: Cliente tenta criar senha nova usando a senha fraca '1234'
  if (step1.mode === 'create_new') {
    simulateCriarNovoPin('1234');
  }
  
  // Teste 5: Cliente tenta criar senha nova usando '0000'
  if (step1.mode === 'create_new') {
    simulateCriarNovoPin('0000');
  }
  
  // Teste 6: Cliente cria senha nova segura '9988'
  if (step1.mode === 'create_new') {
    simulateCriarNovoPin('9988');
  }
}

runTests();

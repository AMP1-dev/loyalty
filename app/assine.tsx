import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function AssineScreen() {
  const[nome, setNome] = useState('');
  const[cnpj, setCnpj] = useState('');
  const[senha, setSenha] = useState('');
  
  const[loading, setLoading] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const[sucessoMsg, setSucessoMsg] = useState('');

  const formatarCnpj = (texto: string) => {
    const limpo = texto.replace(/\D/g, '');
    let formatado = limpo;
    if (limpo.length > 2) formatado = `${limpo.slice(0, 2)}.${limpo.slice(2)}`;
    if (limpo.length > 5) formatado = `${formatado.slice(0, 6)}.${limpo.slice(5)}`;
    if (limpo.length > 8) formatado = `${formatado.slice(0, 10)}/${limpo.slice(8)}`;
    if (limpo.length > 12) formatado = `${formatado.slice(0, 15)}-${limpo.slice(12, 14)}`;
    setCnpj(formatado);
  };

  // 🔥 FÓRMULA OFICIAL DA RECEITA FEDERAL PARA VALIDAR CNPJ
  const validarCNPJ = (cnpjRaw: string) => {
    const cnpjLimpo = cnpjRaw.replace(/[^\d]+/g, '');
    if (cnpjLimpo === '' || cnpjLimpo.length !== 14) return false;
    
    // Elimina CNPJs repetidos (11111111111111, etc)
    if (/^(\d)\1+$/.test(cnpjLimpo)) return false;

    let tamanho = cnpjLimpo.length - 2;
    let numeros = cnpjLimpo.substring(0, tamanho);
    let digitos = cnpjLimpo.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpjLimpo.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true; // CNPJ Válido!
  };

  const handleAssinar = async () => {
    setErroMsg('');
    setSucessoMsg('');

    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (!nome.trim() || cnpjLimpo.length < 14 || !senha.trim()) {
      setErroMsg('Preencha o Nome, o CNPJ completo e a Senha.');
      return;
    }

    // 🔥 BLOQUEIO DO CNPJ FALSO
    if (!validarCNPJ(cnpjLimpo)) {
      setErroMsg('O CNPJ digitado é inválido. Verifique os números.');
      return;
    }

    setLoading(true);

    try {
      const { data: existente } = await supabase.from('lojas').select('id').eq('cnpj', cnpjLimpo).maybeSingle();
      if (existente) {
        setErroMsg('Este CNPJ já está cadastrado em nossa rede.');
        setLoading(false);
        return;
      }

      const { data: novaLoja, error: erroLoja } = await supabase
        .from('lojas')
        .insert([{ nome: nome.trim(), cnpj: cnpjLimpo, senha: senha, ativo: false }])
        .select('id')
        .single();

      if (erroLoja || !novaLoja) {
        setErroMsg(`Erro ao criar loja: ${erroLoja?.message}`);
        setLoading(false);
        return;
      }

      await supabase.from('configuracoes_loja').insert([{
        loja_id: novaLoja.id, nome_loja: nome.trim(), reais_por_ponto: 1,
        cashback_percent: 0, pontos_sobre_valor_bruto: true, usar_cashback_total: false
      }]);

      setSucessoMsg('Cadastro recebido com sucesso! Nossa equipe fará a validação em breve.');
      setLoading(false);

      setTimeout(() => { router.replace('/login'); }, 3500);

    } catch (err: any) {
      setErroMsg(`Erro crítico: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>PALM SPRINGS</Text>
      <Text style={styles.subtitle}>Faça parte do maior clube de vantagens</Text>

      {erroMsg !== '' && <View style={styles.errorBox}><Text style={styles.errorText}>{erroMsg}</Text></View>}
      {sucessoMsg !== '' && <View style={styles.successBox}><Text style={styles.successText}>{sucessoMsg}</Text></View>}

      <TextInput style={styles.input} placeholder="Nome Fantasia da Loja" placeholderTextColor="#64748b" value={nome} onChangeText={setNome} autoCapitalize="words" />
      <TextInput style={styles.input} placeholder="CNPJ" placeholderTextColor="#64748b" value={cnpj} onChangeText={formatarCnpj} keyboardType="numeric" maxLength={18} />
      <TextInput style={styles.input} placeholder="Crie uma Senha de Acesso" placeholderTextColor="#64748b" value={senha} onChangeText={setSenha} secureTextEntry={true} />

      <TouchableOpacity style={[styles.button, { opacity: loading ? 0.7 : 1 }]} onPress={handleAssinar} disabled={loading || sucessoMsg !== ''}>
        <Text style={styles.buttonText}>{loading ? 'ENVIANDO DADOS...' : 'SOLICITAR ACESSO'}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.replace('/login')} style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ color: '#64748b', fontSize: 13, fontWeight: 'bold' }}>Já tem uma conta? <Text style={{ color: '#10b981' }}>Faça Login</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 30 },
  logo: { color: '#10b981', fontSize: 36, textAlign: 'center', fontWeight: '900' },
  subtitle: { color: '#94a3b8', textAlign: 'center', marginBottom: 30, fontSize: 16 },
  errorBox: { backgroundColor: '#ef444420', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#ef4444' },
  errorText: { color: '#ef4444', textAlign: 'center', fontWeight: 'bold' },
  successBox: { backgroundColor: '#10b98120', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#10b981' },
  successText: { color: '#10b981', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#334155', textAlign: 'center' },
  button: { backgroundColor: '#10b981', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
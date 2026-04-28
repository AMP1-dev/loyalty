import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

export default function Sandbox() {
  const params = useLocalSearchParams();
  const paramLojaId = params?.loja_id as string;

  const [cpf, setCpf] = useState('');
  const [lojaId, setLojaId] = useState(paramLojaId || '');
  const [loading, setLoading] = useState(false);

  // Saldos Globais
  const [saldo, setSaldo] = useState(0);
  const [cashback, setCashback] = useState(0);

  // Saldos Locais (Exclusivos da Loja Atual)
  const [saldoLocal, setSaldoLocal] = useState(0);
  const [cashbackLocal, setCashbackLocal] = useState(0);

  // Logs para debug
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  useEffect(() => {
    const init = async () => {
      let savedCpf = '';
      if (Platform.OS === 'web') {
        savedCpf = localStorage.getItem('cliente_cpf') || '';
      } else {
        savedCpf = await AsyncStorage.getItem('cliente_cpf') || '';
      }
      if (savedCpf) {
        setCpf(savedCpf);
      }
    };
    init();
  }, []);

  const buscarDados = async () => {
    if (!cpf) {
      addLog("Erro: CPF não informado.");
      return;
    }
    
    setLoading(true);
    setLogs([]);
    const cleanCpf = cpf.replace(/\D/g, '');
    addLog(`Buscando dados para CPF: ${cleanCpf}`);
    
    if (lojaId) {
       addLog(`Filtrando loja local: ${lojaId}`);
    } else {
       addLog(`Aviso: Loja ID não informado. Valores locais serão 0.`);
    }

    try {
      // Buscas
      addLog("Fazendo queries no Supabase...");
      const { data: trans, error: errTrans } = await supabase.from('transacoes').select('*').eq('cliente_cpf', cleanCpf);
      const { data: res, error: errRes } = await supabase.from('resgates').select('*').eq('cliente_cpf', cleanCpf);
      const { data: cash, error: errCash } = await supabase.from('cashbacks').select('*').eq('cliente_cpf', cleanCpf);

      if (errTrans) addLog(`Erro Transações: ${errTrans.message}`);
      if (errRes) addLog(`Erro Resgates: ${errRes.message}`);
      if (errCash) addLog(`Erro Cashbacks: ${errCash.message}`);

      addLog(`Encontradas: ${trans?.length || 0} transações, ${res?.length || 0} resgates, ${cash?.length || 0} cashbacks.`);

      // Cálculo Global
      const totalGlobal = (trans || []).reduce((a, t) => a + (t.pontos_gerados || 0), 0);
      const usadosGlobal = (res || []).reduce((a, r) => a + (r.pontos_usados || 0), 0);
      const sGlobal = totalGlobal - usadosGlobal;
      setSaldo(sGlobal);

      const cGlobal = (cash || []).filter(c => c.usado === false).reduce((s, c) => s + Number(c.valor), 0);
      setCashback(cGlobal);
      
      addLog(`Global Calculado -> Pontos Totais: ${totalGlobal}, Usados: ${usadosGlobal} | Saldo: ${sGlobal} | Cash: ${cGlobal}`);

      // Cálculo Local
      if (lojaId) {
        const tLocal = (trans || []).filter(t => String(t.loja_id) === String(lojaId)).reduce((a, t) => a + (t.pontos_gerados || 0), 0);
        const uLocal = (res || []).filter(r => String(r.loja_id) === String(lojaId)).reduce((a, r) => a + (r.pontos_usados || 0), 0);
        const sLocal = tLocal - uLocal;
        setSaldoLocal(sLocal);

        const cLocal = (cash || []).filter(c => String(c.loja_id) === String(lojaId) && c.usado === false).reduce((s, c) => s + Number(c.valor), 0);
        setCashbackLocal(cLocal);
        
        addLog(`Local Calculado -> Pontos Totais Loja: ${tLocal}, Usados: ${uLocal} | Saldo: ${sLocal} | Cash: ${cLocal}`);
      } else {
        setSaldoLocal(0);
        setCashbackLocal(0);
      }
      
      addLog("Busca finalizada com sucesso.");

    } catch (error: any) {
      addLog(`Exceção: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Diagnóstico de Saldos</Text>
      
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Digite o CPF" 
          placeholderTextColor="#64748B"
          value={cpf} 
          onChangeText={setCpf} 
          keyboardType="numeric"
        />
        <TextInput 
          style={styles.input} 
          placeholder="ID da Loja (Opcional)" 
          placeholderTextColor="#64748B"
          value={lojaId} 
          onChangeText={setLojaId} 
        />
        <TouchableOpacity style={styles.button} onPress={buscarDados} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Buscando...' : 'Buscar Dados Supabase'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saldos Globais (Rede)</Text>
        <Text style={styles.desc}>Cálculo de todas as lojas somadas.</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Springs:</Text>
          <Text style={styles.valor}>{saldo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cashback:</Text>
          <Text style={[styles.valor, { color: '#facc15' }]}>R$ {cashback.toFixed(2)}</Text>
        </View>
      </View>

      <View style={[styles.card, { borderColor: '#10b981', borderWidth: 2 }]}>
        <Text style={[styles.cardTitle, { color: '#10b981' }]}>Saldos Locais (Loja {lojaId || 'N/A'})</Text>
        <Text style={styles.desc}>Cálculo restrito à loja informada acima.</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Springs:</Text>
          <Text style={styles.valor}>{saldoLocal}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cashback:</Text>
          <Text style={[styles.valor, { color: '#facc15' }]}>R$ {cashbackLocal.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.logBox}>
        <Text style={styles.logTitle}>Logs da Execução:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </View>
      
      <View style={{height: 50}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0F172A' },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginVertical: 20, textAlign: 'center' },
  inputContainer: { marginBottom: 20 },
  input: { backgroundColor: '#1E293B', color: '#FFF', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  button: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#1E293B', padding: 20, borderRadius: 16, marginBottom: 20 },
  cardTitle: { color: '#94A3B8', fontSize: 16, marginBottom: 5, textTransform: 'uppercase', fontWeight: '900' },
  desc: { color: '#64748B', fontSize: 12, marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { color: '#CBD5E1', fontSize: 18 },
  valor: { color: '#10B981', fontSize: 24, fontWeight: 'bold' },
  logBox: { backgroundColor: '#020617', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#334155', minHeight: 150 },
  logTitle: { color: '#94A3B8', fontWeight: 'bold', marginBottom: 10 },
  logText: { color: '#10B981', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 4 }
});

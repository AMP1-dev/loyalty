import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function JoinSmart() {
  const router = useRouter();
  const { store } = useLocalSearchParams(); 
  const [nomeLoja, setNomeLoja] = useState('Rede Palm');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{msg: string, tipo: 'info' | 'sucesso'} | null>(null);

  useEffect(() => {
    if (store) {
      const buscarLoja = async () => {
        const { data } = await supabase
          .from('lojas')
          .select('nome')
          .eq('id', store)
          .single();

        if (data) setNomeLoja(data.nome);
      };
      buscarLoja();
    }
  }, [store]);

  const realizarAdesao = async () => {
    const telLimpo = telefone.replace(/\D/g, '');

    if (telLimpo.length < 10) {
      Alert.alert("Atenção", "Informe seu WhatsApp com DDD.");
      return;
    }

    setLoading(true);

    try {
      // 🔥 1. VERIFICA CLIENTE GLOBAL (SEM QUEBRAR)
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('cpf')
        .eq('cpf', telLimpo)
        .maybeSingle();

      if (!clienteExistente) {
        await supabase.from('clientes').insert([{ cpf: telLimpo }]);
      }

      // 🎁 2. VERIFICA BÔNUS NA LOJA
      const { data: jaTemBonus } = await supabase
        .from('transacoes')
        .select('id')
        .eq('cliente_cpf', telLimpo)
        .eq('loja_id', store)
        .eq('valor_venda', 0)
        .maybeSingle();

      if (!jaTemBonus && store) {
        await supabase.from('transacoes').insert([
          {
            cliente_cpf: telLimpo,
            loja_id: store,
            valor_venda: 0,
            pontos_gerados: 10
          }
        ]);

        setStatus({
          msg: 'Bem-vindo! Você ganhou 10 pontos de presente! 🎁',
          tipo: 'sucesso'
        });
      } else {
        setStatus({
          msg: 'Bom te ver de novo! Entrando na sua carteira...',
          tipo: 'info'
        });
      }

      // 🔥 3. INSERE NA FILA (CHECK-IN)
      if (store) {
        const { error: checkinError } = await supabase
          .from('checkins')
          .insert([
            {
              cliente_cpf: telLimpo,
              loja_id: store,
              status: 'aguardando'
            }
          ]);

        // ignora erro de duplicidade
        if (checkinError && !checkinError.message.includes('duplicate')) {
          console.log('Erro check-in:', checkinError.message);
        }
      }

      // 💾 4. SALVA SESSÃO
      localStorage.setItem('@palm_phone', telLimpo);

      // 🔄 5. REDIRECIONA
      setTimeout(() => {
        router.replace('/customer');
      }, 2000);

    } catch (e) {
      console.error(e);
      setLoading(false);
      Alert.alert("Erro", "Ocorreu um erro ao processar sua entrada.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>PALM</Text>
        
        {status ? (
          <View style={[styles.statusBanner, status.tipo === 'sucesso' ? styles.bgSucesso : styles.bgInfo]}>
            <Text style={styles.statusText}>{status.msg}</Text>
            <ActivityIndicator color="#fff" style={{marginTop: 10}} />
          </View>
        ) : (
          <>
            <Text style={styles.welcome}>Clube de Fidelidade</Text>
            <Text style={styles.storeName}>{nomeLoja.toUpperCase()}</Text>
            
            <View style={styles.bonusBadge}>
               <Text style={styles.bonusTxt}>🎁 BÔNUS DE ADESÃO: 10 PONTOS</Text>
            </View>

            <TextInput 
              style={styles.input} 
              placeholder="(19) 99999-9999" 
              placeholderTextColor="#444"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
            />

            <TouchableOpacity style={styles.btn} onPress={realizarAdesao} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>QUERO MEUS PONTOS</Text>}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.footer}>Santa Cruz das Palmeiras • Ecossistema AMP</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 25 },
  card: { backgroundColor: '#111', padding: 30, borderRadius: 35, borderWidth: 1, borderColor: '#222', alignItems: 'center', minHeight: 400, justifyContent: 'center' },
  logo: { color: '#10b981', fontSize: 32, fontWeight: '900', marginBottom: 20 },
  welcome: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  storeName: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginVertical: 10 },
  bonusBadge: { backgroundColor: '#d1fae5', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, marginVertical: 20 },
  bonusTxt: { color: '#065f46', fontSize: 10, fontWeight: 'bold' },
  input: { backgroundColor: '#000', color: '#fff', width: '100%', padding: 20, borderRadius: 15, textAlign: 'center', fontSize: 20, fontWeight: 'bold', borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  btn: { backgroundColor: '#10b981', width: '100%', padding: 20, borderRadius: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  statusBanner: { padding: 20, borderRadius: 20, width: '100%', alignItems: 'center' },
  bgSucesso: { backgroundColor: '#10b981' },
  bgInfo: { backgroundColor: '#3b82f6' },
  statusText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  footer: { color: '#333', fontSize: 9, marginTop: 40, fontWeight: 'bold' }
});
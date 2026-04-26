import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [cnpj, setCnpj] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 MOTOR DO TOAST DE ERRO/SUCESSO
  const [toast, setToast] = useState({ visible: false, message: '', tipo: 'erro' });
  const toastAnim = useRef(new Animated.Value(-150)).current;

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'erro') => {
    setToast({ visible: true, message: mensagem, tipo });
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: Platform.OS === 'web' ? 20 : 50, useNativeDriver: true, speed: 12 }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: -150, duration: 400, useNativeDriver: true })
    ]).start(() => setToast({ visible: false, message: '', tipo: 'sucesso' }));
  };

  const handleLogin = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (!cnpjLimpo || !senha.trim()) {
      mostrarToast('Preencha o CNPJ e a senha.', 'erro');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('id, senha, nome, ativo')
        .eq('cnpj', cnpjLimpo)
        .limit(1);

      if (error) {
        mostrarToast(`Erro no banco: ${error.message}`, 'erro');
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        mostrarToast('Loja não encontrada. Verifique o CNPJ.', 'erro');
        setLoading(false);
        return;
      }

      const lojaEncontrada = data[0];

      if (lojaEncontrada.ativo === false) {
        mostrarToast('Acesso bloqueado. Contate o administrador.', 'erro');
        setLoading(false);
        return;
      }

      const senhaReal = lojaEncontrada.senha ? lojaEncontrada.senha : '1234';

      if (senhaReal !== senha) {
        mostrarToast('Senha incorreta! Tente novamente.', 'erro');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('@loja_id_merchant', lojaEncontrada.id);
      }

      router.replace('/merchant');

    } catch (err: any) {
      mostrarToast(`Erro crítico: ${err.message}`, 'erro');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* TOAST FLUTUANTE */}
      <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444' }]}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text>
        <Text style={styles.toastText}>{toast.message}</Text>
      </Animated.View>

      <Text style={styles.logo}>PALM SPRINGS</Text>
      <Text style={styles.subtitle}>Acesso Restrito do Lojista</Text>

      <TextInput
        style={styles.input}
        placeholder="CNPJ da Loja"
        placeholderTextColor="#64748b"
        value={cnpj}
        onChangeText={setCnpj}
        keyboardType="numeric"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Senha de Acesso"
        placeholderTextColor="#64748b"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry={true}
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        onKeyPress={(e) => {
          if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') handleLogin();
        }}
      />

      <TouchableOpacity
        style={[styles.button, { opacity: loading ? 0.7 : 1 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'VERIFICANDO DADOS...' : 'ENTRAR NO PAINEL'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/')} style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: 'bold' }}>⬅ VOLTAR AO INÍCIO</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: { position: 'absolute', top: Platform.OS === 'web' ? 20 : 50, left: 20, right: 20, zIndex: 9999, padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 15, flex: 1, lineHeight: 22 },

  container: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 30 },
  logo: { color: '#10b981', fontSize: 36, textAlign: 'center', fontWeight: '900' },
  subtitle: { color: '#94a3b8', textAlign: 'center', marginBottom: 30, fontSize: 16 },

  input: { backgroundColor: '#1e293b', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#334155', textAlign: 'center', letterSpacing: 2 },
  button: { backgroundColor: '#10b981', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
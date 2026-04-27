import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [cnpj, setCnpj] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'cnpj' | 'senha' | null>(null);

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
    if (!cnpjLimpo || !senha.trim()) { mostrarToast('Preencha o CNPJ e a senha.', 'erro'); return; }
    setLoading(true);

    try {
      const { data, error } = await supabase.from('lojas').select('id, senha, nome, ativo').eq('cnpj', cnpjLimpo).limit(1);
      if (error) { mostrarToast(`Erro no banco: ${error.message}`, 'erro'); setLoading(false); return; }
      if (!data || data.length === 0) { mostrarToast('Loja não encontrada.', 'erro'); setLoading(false); return; }

      const lojaEncontrada = data[0];
      if (lojaEncontrada.ativo === false) { mostrarToast('Acesso bloqueado.', 'erro'); setLoading(false); return; }
      
      const senhaReal = lojaEncontrada.senha || '1234';
      if (senhaReal !== senha) { mostrarToast('Senha incorreta!', 'erro'); setLoading(false); return; }

      if (typeof window !== 'undefined') localStorage.setItem('@loja_id_merchant', lojaEncontrada.id);
      router.replace('/merchant');
    } catch (err: any) {
      mostrarToast(`Erro: ${err.message}`, 'erro');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔮 EFEITOS DE FUNDO (CIRCULOS NEON) */}
      <View style={[styles.blurCircle, { top: -100, right: -100, backgroundColor: '#10b98120' }]} />
      <View style={[styles.blurCircle, { bottom: -150, left: -100, backgroundColor: '#38bdf815' }]} />

      <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444' }]}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text>
        <Text style={styles.toastText}>{toast.message}</Text>
      </Animated.View>

      <View style={styles.loginCard}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={styles.logo}>PALM SPRINGS</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>MERCHANT PORTAL</Text></View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>IDENTIFICAÇÃO DA LOJA (CNPJ)</Text>
          <TextInput
            style={[styles.input, focused === 'cnpj' && styles.inputFocused]}
            placeholder="00.000.000/0000-00"
            placeholderTextColor="#475569"
            value={cnpj}
            onChangeText={setCnpj}
            onFocus={() => setFocused('cnpj')}
            onBlur={() => setFocused(null)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>SENHA DE ACESSO</Text>
          <TextInput
            style={[styles.input, focused === 'senha' && styles.inputFocused]}
            placeholder="••••••••"
            placeholderTextColor="#475569"
            value={senha}
            onChangeText={setSenha}
            onFocus={() => setFocused('senha')}
            onBlur={() => setFocused(null)}
            secureTextEntry={true}
            onSubmitEditing={handleLogin}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { opacity: loading ? 0.7 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{loading ? 'AUTENTICANDO...' : 'ENTRAR NO DASHBOARD'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← VOLTAR AO INÍCIO</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Powered by AMP Tecnologia © 2026</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 20 },
  blurCircle: { position: 'absolute', width: 400, height: 400, borderRadius: 200, zIndex: 0 },
  
  loginCard: { 
    width: Platform.OS === 'web' ? 450 : '100%', 
    backgroundColor: '#0f172a80', 
    padding: 40, 
    borderRadius: 30, 
    borderWidth: 1, 
    borderColor: '#334155'
  } as any,

  logo: { color: '#10b981', fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  badge: { backgroundColor: '#10b98120', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 5 },
  badgeText: { color: '#10b981', fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  inputWrapper: { marginBottom: 25 },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', marginBottom: 10, marginLeft: 5, letterSpacing: 1 },
  input: { 
    backgroundColor: '#020617', 
    color: '#fff', 
    padding: 18, 
    borderRadius: 15, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: '#1e293b'
  } as any,
  inputFocused: { borderColor: '#10b981', backgroundColor: '#020617' },

  button: { 
    backgroundColor: '#10b981', 
    padding: 20, 
    borderRadius: 15, 
    alignItems: 'center', 
    marginTop: 10,
    shadowColor: '#10b981',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10
  },
  buttonText: { color: '#020617', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  backButton: { marginTop: 30, alignItems: 'center' },
  backButtonText: { color: '#475569', fontSize: 12, fontWeight: 'bold' },

  footer: { position: 'absolute', bottom: 30, color: '#1e293b', fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },

  toastContainer: { position: 'absolute', top: 50, left: 20, right: 20, zIndex: 9999, padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, elevation: 20 },
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 15, flex: 1 },
});
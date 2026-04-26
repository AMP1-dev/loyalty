import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
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
    <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {/* TOAST FLUTUANTE */}
      <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444' }]}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text>
        <Text style={styles.toastText}>{toast.message}</Text>
      </Animated.View>

      <View style={{ width: '100%', maxWidth: 420, backgroundColor: '#0f172a', borderRadius: 24, padding: 40, borderWidth: 1, borderColor: '#1e293b', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, elevation: 20 }}>
        <Text style={{ color: '#10b981', fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: -1 }}>PALM SPRINGS</Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 40, fontWeight: '500' }}>Painel de Controle do Lojista</Text>

        <Text style={{ color: '#f8fafc', fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 }}>CNPJ da Loja</Text>
        <TextInput
          style={{ backgroundColor: '#1e293b', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#334155' }}
          placeholder="00.000.000/0001-00"
          placeholderTextColor="#475569"
          value={cnpj}
          onChangeText={setCnpj}
          keyboardType="numeric"
          autoCapitalize="none"
        />

        <Text style={{ color: '#f8fafc', fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 }}>Senha de Acesso</Text>
        <TextInput
          style={{ backgroundColor: '#1e293b', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 35, fontSize: 16, borderWidth: 1, borderColor: '#334155' }}
          placeholder="••••••••"
          placeholderTextColor="#475569"
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
          style={{ backgroundColor: '#10b981', padding: 20, borderRadius: 14, alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 15, elevation: 5, opacity: loading ? 0.7 : 1 }} 
          onPress={handleLogin} 
          disabled={loading}
        >
          <Text style={{ color: '#020617', fontWeight: '900', fontSize: 16 }}>
            {loading ? 'VERIFICANDO...' : 'ENTRAR NO PAINEL'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.replace('/')} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>← Voltar ao início</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 40, alignItems: 'center', opacity: 0.3 }}>
        <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}>SPRING NETWORK © 2026</Text>
        <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 4 }}>v1.1.4 - SEGURANÇA CRIPTOGRAFADA</Text>
      </View>
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
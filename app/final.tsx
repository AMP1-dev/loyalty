import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Final() {
  const router = useRouter();
  const [tema, setTema] = useState<'dark' | 'light'>('dark');

  const phone = localStorage.getItem('@palm_phone');
  const isDark = tema === 'dark';

  const handleVerSaldo = () => {
    if (!phone) return;
    router.replace(`/cliente?phone=${phone}`);
  };

  const handleFechar = () => {
    localStorage.clear();

    try {
      window.open('', '_self');
      window.close();
    } catch (e) {}

    setTimeout(() => {
      document.body.innerHTML = '';
      document.body.style.background = '#000';
      window.location.replace('about:blank');
    }, 300);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>

      <TouchableOpacity
        onPress={() => setTema(isDark ? 'light' : 'dark')}
        style={[styles.toggle, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
      >
        <Text style={{ fontSize: 16 }}>
          {isDark ? '☀️' : '🌙'}
        </Text>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}>
        
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>✓</Text>
        </View>

        <Text style={[styles.title, { color: isDark ? '#22C55E' : '#16A34A' }]}>
          Pontuação registrada
        </Text>

        <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          Sua compra foi processada com sucesso.
          Você já pode acompanhar seus pontos.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleVerSaldo}>
          <Text style={styles.primaryText}>Ver meu saldo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleFechar}>
          <Text style={styles.secondaryText}>Encerrar</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  toggle: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    borderRadius: 20,
  },

  card: {
    width: '100%',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#22C55E20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  icon: {
    fontSize: 32,
    color: '#22C55E',
    fontWeight: 'bold',
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: '#22C55E',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },

  primaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  secondaryButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  secondaryText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});
import { View, Text, StyleSheet } from 'react-native';

export default function Sandbox() {
  // Valores estáticos apenas para visualização e alinhamento do design
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alinhamento de Informações</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saldos Globais (Rede)</Text>
        <Text style={styles.desc}>Disponível em qualquer loja parceira.</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Springs:</Text>
          <Text style={styles.valor}>1.500</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cashback:</Text>
          <Text style={[styles.valor, { color: '#facc15' }]}>R$ 45,00</Text>
        </View>
      </View>

      <View style={[styles.card, { borderColor: '#10b981', borderWidth: 2 }]}>
        <Text style={[styles.cardTitle, { color: '#10b981' }]}>Saldos Locais (Loja Atual)</Text>
        <Text style={styles.desc}>Disponível apenas nesta loja específica.</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Springs:</Text>
          <Text style={styles.valor}>300</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cashback:</Text>
          <Text style={[styles.valor, { color: '#facc15' }]}>R$ 12,50</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0F172A', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  card: { backgroundColor: '#1E293B', padding: 20, borderRadius: 16, marginBottom: 20 },
  cardTitle: { color: '#94A3B8', fontSize: 16, marginBottom: 5, textTransform: 'uppercase', fontWeight: '900' },
  desc: { color: '#64748B', fontSize: 12, marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { color: '#CBD5E1', fontSize: 18 },
  valor: { color: '#10B981', fontSize: 24, fontWeight: 'bold' }
});

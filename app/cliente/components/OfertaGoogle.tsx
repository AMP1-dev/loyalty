import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Linking, Platform, ScrollView, StyleSheet, Text,
  TouchableOpacity, useColorScheme, View
} from 'react-native';
import { supabase } from '../../../lib/supabase';

// ─── Componente OfertaGoogle ──────────────────────────────────────────────────
interface OfertaGoogleProps {
  premio: any;
  lojaId: string;
  clienteCpf: string;
  linkGoogle?: string;
  multiplicador: number;
  onClose: () => void;
}

export default function OfertaGoogle({
  premio,
  lojaId,
  clienteCpf,
  linkGoogle,
  multiplicador = 2.0,
  onClose,
}: OfertaGoogleProps) {
  const [foiAberto, setFoiAberto] = useState(false);
  const [countdownAbrir, setCountdownAbrir] = useState(5);

  const temaSistema = useColorScheme();
  const [isDark, setIsDark] = useState(temaSistema === 'dark');
  useEffect(() => { setIsDark(temaSistema === 'dark'); }, [temaSistema]);

  const c = {
    bg: isDark ? '#0f1622' : '#F8FAFC',
    card: isDark ? '#1a2942' : '#FFFFFF',
    borda: isDark ? '#334155' : '#E2E8F0',
    texto: isDark ? '#F1F5F9' : '#0F172A',
    subtexto: isDark ? '#cbd5e1' : '#64748B',
    neonOuro: '#d97706',
    neonAmarelo: '#facc15',
  };

  // ─── Animação de entrada ──────────────────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(300)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  // ─── Countdown para abrir Google automaticamente ────────────────────────────────
  useEffect(() => {
    if (foiAberto) return;

    const timer = setInterval(() => {
      setCountdownAbrir((prev) => {
        if (prev <= 1) {
          abrirGoogle();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [foiAberto]);

  const abrirGoogle = async () => {
    if (!linkGoogle || linkGoogle.trim() === '') {
      alert('Link do Google não configurado. Contate o estabelecimento.');
      return;
    }

    setFoiAberto(true);

    try {
      // Salva record de oferta
      await supabase.from('avaliacoes_google').insert({
        loja_id: lojaId,
        cliente_cpf: clienteCpf,
        status: 'pendente',
        url_criada_em: new Date().toISOString(),
      });

      // Abre link do Google
      const url = linkGoogle.includes('?')
        ? `${linkGoogle}&utm_source=mesa_${clienteCpf}`
        : `${linkGoogle}?utm_source=mesa_${clienteCpf}`;

      await Linking.openURL(url);
    } catch (error) {
      console.error('Erro ao abrir Google:', error);
    }
  };

  const pularOferta = async () => {
    try {
      // Marca como não aceitou a oferta
      await supabase
        .from('roleta_mesa_participacoes')
        .update({ oferta_google_dobro: false })
        .eq('cliente_cpf', clienteCpf)
        .eq('loja_id', lojaId)
        .order('created_at', { ascending: false })
        .limit(1);

      onClose();
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const premioComDobro = {
    ...premio,
    valor: (premio.valor || 1) * multiplicador,
    nome: `${premio.nome} x${multiplicador}`,
  };

  return (
    <View style={{ flex: 1, backgroundColor: `${c.bg}dd`, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
      <Animated.View
        style={[
          {
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            width: '100%',
            maxWidth: 380,
          },
        ]}
      >
        <LinearGradient
          colors={['#fff9e6', '#ffe8cc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 24,
            borderWidth: 2,
            borderColor: c.neonOuro,
            overflow: 'hidden',
          }}
        >
          {/* Background pattern */}
          <View
            style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: c.neonAmarelo,
              opacity: 0.1,
            }}
          />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: c.neonOuro, textAlign: 'center' }}>
                GANHE O DOBRO!
              </Text>
              <Text style={{ fontSize: 12, color: c.subtexto, textAlign: 'center', marginTop: 6 }}>
                Ajude-nos a melhorar avaliando no Google
              </Text>
            </View>

            {/* Original vs Dobro */}
            <View style={{ marginBottom: 20 }}>
              {/* Original */}
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                  opacity: 0.6,
                  borderWidth: 1,
                  borderColor: c.borda,
                }}
              >
                <Text style={{ fontSize: 11, color: c.subtexto, fontWeight: '600', marginBottom: 4 }}>
                  SEM AVALIAÇÃO
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: c.texto }}>
                  {premio.nome}
                </Text>
              </View>

              {/* Arrow */}
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 24 }}>⬇️</Text>
              </View>

              {/* Com Dobro */}
              <View
                style={{
                  backgroundColor: c.neonAmarelo,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 2,
                  borderColor: c.neonOuro,
                }}
              >
                <Text style={{ fontSize: 11, color: '#000', fontWeight: '700', marginBottom: 4 }}>
                  AVALIANDO NO GOOGLE 🌟
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: c.neonOuro }}>
                  {premioComDobro.nome}
                </Text>
              </View>
            </View>

            {/* Como funciona */}
            <View style={{ marginBottom: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.borda }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.texto, marginBottom: 12 }}>
                📋 Como funciona:
              </Text>
              <View style={{ gap: 8 }}>
                {[
                  '1️⃣ Clique em "AVALIAR NO GOOGLE"',
                  '2️⃣ Deixe sua opinião (4-5 estrelas)',
                  '3️⃣ Volte aqui quando terminar',
                  '4️⃣ Seu prêmio em dobro está pronto!',
                ].map((step, i) => (
                  <Text key={i} style={{ fontSize: 11, color: c.subtexto }}>
                    {step}
                  </Text>
                ))}
              </View>
            </View>

            {/* Botões */}
            <View style={{ gap: 10 }}>
              {/* Botão principal - Google */}
              <TouchableOpacity
                onPress={abrirGoogle}
                disabled={foiAberto}
                style={{
                  backgroundColor: foiAberto ? '#ccc' : c.neonOuro,
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: foiAberto ? '#999' : c.neonOuro,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '900', color: foiAberto ? '#666' : '#000' }}>
                  {foiAberto ? '✅ ABRINDO GOOGLE...' : `🌟 AVALIAR NO GOOGLE (${countdownAbrir}s)`}
                </Text>
              </TouchableOpacity>

              {/* Botão secundário - Pular */}
              <TouchableOpacity
                onPress={pularOferta}
                style={{
                  backgroundColor: c.card,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: c.borda,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.subtexto }}>
                  Agora não, obrigado
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nota */}
            <Text style={{ fontSize: 10, color: c.subtexto, textAlign: 'center', marginTop: 14 }}>
              Sua avaliação nos ajuda a melhorar! 💙
            </Text>
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({});

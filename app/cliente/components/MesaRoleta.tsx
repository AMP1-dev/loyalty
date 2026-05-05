import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, useColorScheme, View, Linking
} from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, LinearGradient as SvgLinearGradient, Stop, Text as SvgText, Filter, FeGaussianBlur, FeOffset, FeComponentTransfer, FeFuncA, FeMerge, FeMergeNode } from 'react-native-svg';
import { supabase } from '../../../lib/supabase';
import OfertaGoogle from './OfertaGoogle';

// ─── Storage helpers ──────────────────────────────────────────────────────────
const salvarStorage = async (key: string, value: string) => {
  if (typeof window !== 'undefined') localStorage.setItem(key, value);
  else await AsyncStorage.setItem(key, value);
};

// ─── Componente WheelSVG (reutilizado do cliente) ──────────────────────────────
function WheelSVG({ prizes, size, isDark }: { prizes: any[]; size: number; isDark: boolean }) {
  const CENTER = size / 2;
  const RADIUS = CENTER - 6;
  const numSlices = prizes.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  const COLORS_LIGHT = ['#fdf8ec', '#d1fae5'];
  const COLORS_DARK = ['#1e293b', '#134e4a'];
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;

  const buildSlicePath = (index: number) => {
    const startAngle = index * sliceAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;
    const x1 = CENTER + RADIUS * Math.cos(startAngle);
    const y1 = CENTER + RADIUS * Math.sin(startAngle);
    const x2 = CENTER + RADIUS * Math.cos(endAngle);
    const y2 = CENTER + RADIUS * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    return `M${CENTER},${CENTER} L${x1},${y1} A${RADIUS},${RADIUS} 0 ${largeArc} 1 ${x2},${y2} Z`;
  };

  const getTextPos = (index: number) => {
    const midAngle = index * sliceAngle - Math.PI / 2 + sliceAngle / 2;
    const r = RADIUS * 0.65;
    return {
      x: CENTER + r * Math.cos(midAngle),
      y: CENTER + r * Math.sin(midAngle),
      rotation: (midAngle * 180) / Math.PI + 90,
    };
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <SvgLinearGradient id="gradMesa1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#fdf8ec" />
          <Stop offset="100%" stopColor="#f0e5d8" />
        </SvgLinearGradient>
        <SvgLinearGradient id="gradMesa2" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#d1fae5" />
          <Stop offset="100%" stopColor="#a7f3d0" />
        </SvgLinearGradient>
        <RadialGradient id="gCenterMesa" cx="50%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <Stop offset="50%" stopColor="#d1d5db" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#6b7280" stopOpacity="1" />
        </RadialGradient>
        <Filter id="dropShadowMesa" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <FeOffset dx="0" dy="8" result="offsetblur" />
          <FeComponentTransfer>
            <FeFuncA type="linear" slope="0.4" />
          </FeComponentTransfer>
          <FeMerge>
            <FeMergeNode />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>

      <G filter="url(#dropShadowMesa)">
        {prizes.map((prize: any, i: number) => {
          const { x, y, rotation } = getTextPos(i);
          const lines = (prize.nome || '').split('\n');

          return (
            <G key={i}>
              <Path
                d={buildSlicePath(i)}
                fill={i % 2 === 0 ? 'url(#gradMesa1)' : 'url(#gradMesa2)'}
                stroke="#ffffff"
                strokeWidth="2"
              />
              {lines.map((line: string, lineIdx: number) => {
                const offsetY = (lineIdx - (lines.length - 1) / 2) * 6;
                const fontSize = size === 240 ? 5.5 : 8.5;
                return (
                  <SvgText
                    key={`${i}-${lineIdx}`}
                    x={x}
                    y={y + offsetY}
                    fontSize={fontSize}
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#1e293b"
                    rotation={rotation}
                  >
                    {line}
                  </SvgText>
                );
              })}
            </G>
          );
        })}
      </G>

      {/* Centro metálico */}
      <Circle cx={CENTER} cy={CENTER} r={20} fill="url(#gCenterMesa)" />
    </Svg>
  );
}

// ─── Componente Principal MesaRoleta ──────────────────────────────────────────
export default function MesaRoleta() {
  const params = useLocalSearchParams();
  const loja_id = params?.loja_id as string;

  const [etapa, setEtapa] = useState<'telefone' | 'nps' | 'roleta' | 'resultado' | 'google'>('telefone');
  const [telefone, setTelefone] = useState('');
  const [notaNps, setNotaNps] = useState(0);
  const [perguntaCustom, setPerguntaCustom] = useState('Como foi sua experiência?');
  const [premiosRoletaMesa, setPremiosRoletaMesa] = useState<any[]>([]);
  const [premioGanho, setPremioGanho] = useState<any>(null);
  const [rodando, setRodando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [configLoja, setConfigLoja] = useState<any>(null);
  const [nomeLojaAtual, setNomeLojaAtual] = useState('');

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  const temaSistema = useColorScheme();
  const [isDark, setIsDark] = useState(temaSistema === 'dark');
  useEffect(() => { setIsDark(temaSistema === 'dark'); }, [temaSistema]);

  const c = {
    bg: isDark ? '#0f1622' : '#F8FAFC',
    card: isDark ? '#1a2942' : '#FFFFFF',
    borda: isDark ? '#334155' : '#E2E8F0',
    texto: isDark ? '#F1F5F9' : '#0F172A',
    subtexto: isDark ? '#cbd5e1' : '#64748B',
    roxo: '#a855f7',
    neonAmarelo: '#facc15',
  };

  // ─── Init: Carrega configurações da loja e prêmios da mesa ───────────────────
  useEffect(() => {
    if (!loja_id || loja_id === 'undefined') return;
    carregarDadosMesa();
  }, [loja_id]);

  const carregarDadosMesa = async () => {
    try {
      setCarregando(true);

      // 1. Carrega configuração da loja
      const { data: config } = await supabase
        .from('configuracoes_loja')
        .select('*')
        .eq('loja_id', loja_id)
        .single();

      if (config) {
        setConfigLoja(config);
        if (config.pergunta_nps_mesa) {
          setPerguntaCustom(config.pergunta_nps_mesa);
        }
      }

      // 2. Carrega dados da loja
      const { data: loja } = await supabase
        .from('lojas')
        .select('nome')
        .eq('id', loja_id)
        .single();

      if (loja) setNomeLojaAtual(loja.nome);

      // 3. Carrega prêmios da roleta MESA
      const { data: premios } = await supabase
        .from('roleta_premios_mesa')
        .select('*')
        .eq('loja_id', loja_id)
        .eq('ativo', true);

      if (premios && premios.length > 0) {
        setPremiosRoletaMesa(premios);
      }

      setCarregando(false);
    } catch (error) {
      console.error('Erro ao carregar dados da mesa:', error);
      setCarregando(false);
    }
  };

  // ─── Validar telefone ─────────────────────────────────────────────────────────
  const validarTelefone = (tel: string): boolean => {
    const clean = tel.replace(/\D/g, '');
    return clean.length === 11;
  };

  const avancarParaNPS = async () => {
    if (!validarTelefone(telefone)) {
      alert('Por favor, digite um telefone válido (11 dígitos)');
      return;
    }
    setEtapa('nps');
  };

  // ─── NPS: Selecionar nota e avançar ───────────────────────────────────────────
  const avancarParaRoleta = () => {
    if (notaNps === 0) {
      alert('Por favor, selecione uma nota');
      return;
    }
    setEtapa('roleta');
  };

  // ─── Girar roleta ─────────────────────────────────────────────────────────────
  const girarRoleta = async () => {
    if (rodando || premiosRoletaMesa.length === 0) return;

    setRodando(true);
    setEtapa('roleta');

    try {
      // Sorteia prêmio baseado em probabilidade
      const premio = sortearPremio(premiosRoletaMesa);
      const targetIndex = premiosRoletaMesa.findIndex((p) => p.id === premio.id);
      const rotations = 5;
      const targetDeg = rotations * 360 + (targetIndex / premiosRoletaMesa.length) * 360;

      // Anima roleta
      Animated.timing(rotateAnim, {
        toValue: targetDeg,
        duration: 3000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(async () => {
        // Salva participação
        const cleanTel = telefone.replace(/\D/g, '');
        await salvarParticipacaoMesa(cleanTel, premio);
        setPremioGanho(premio);
        setEtapa('resultado');
        setRodando(false);
      });
    } catch (error) {
      console.error('Erro ao girar roleta:', error);
      setRodando(false);
    }
  };

  const sortearPremio = (premios: any[]) => {
    const totalProb = premios.reduce((sum, p) => sum + (p.probabilidade || 1), 0);
    let random = Math.random() * totalProb;

    for (const premio of premios) {
      random -= premio.probabilidade || 1;
      if (random <= 0) return premio;
    }

    return premios[0];
  };

  const salvarParticipacaoMesa = async (telefone: string, premio: any) => {
    try {
      await supabase.from('roleta_mesa_participacoes').insert({
        loja_id: loja_id,
        cliente_cpf: telefone,
        premio_id: premio.id,
        premio_nome: premio.nome,
        premio_valor: premio.valor,
        nota_nps: notaNps,
        oferta_google_dobro: notaNps === 5,
        premio_resgatado: false,
      });

      // Salva telefone no storage para não pedir de novo
      await salvarStorage(`mesa_telefone_${loja_id}`, telefone);
    } catch (error) {
      console.error('Erro ao salvar participação da mesa:', error);
    }
  };

  // ─── Se nota = 5, oferece dobro ────────────────────────────────────────────────
  if (etapa === 'resultado' && notaNps === 5 && premioGanho) {
    return (
      <OfertaGoogle
        premio={premioGanho}
        lojaId={loja_id}
        clienteCpf={telefone.replace(/\D/g, '')}
        linkGoogle={configLoja?.link_google_meu_negocio}
        multiplicador={configLoja?.bonus_5_estrelas_multiplicador || 2.0}
        onClose={() => setEtapa('telefone')}
      />
    );
  }

  // ─── TELA 1: Captura Telefone ─────────────────────────────────────────────────
  if (etapa === 'telefone') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 400 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: c.roxo, textAlign: 'center', marginBottom: 10 }}>
              🎮 JOGUE NA MESA!
            </Text>
            <Text style={{ fontSize: 14, color: c.subtexto, textAlign: 'center', marginBottom: 30 }}>
              Diversão garantida enquanto você aguarda seu pedido
            </Text>

            <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: c.borda, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: c.subtexto, fontWeight: '700', marginBottom: 8 }}>
                📱 QUAL SEU TELEFONE?
              </Text>
              <TextInput
                placeholder="(11) 99999-9999"
                placeholderTextColor={c.subtexto}
                value={telefone}
                onChangeText={(text) => {
                  const clean = text.replace(/\D/g, '').slice(0, 11);
                  if (clean.length <= 11) {
                    const formatted =
                      clean.length <= 2 ? `(${clean}` :
                      clean.length <= 7 ? `(${clean.slice(0, 2)}) ${clean.slice(2)}` :
                      `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
                    setTelefone(formatted);
                  }
                }}
                style={{
                  borderWidth: 1,
                  borderColor: c.borda,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: c.texto,
                  fontWeight: '600',
                }}
                keyboardType="phone-pad"
              />
              <Text style={{ fontSize: 11, color: c.subtexto, marginTop: 8, marginLeft: 4 }}>
                Usaremos para contato com as boas notícias!
              </Text>
            </View>

            <TouchableOpacity
              onPress={avancarParaNPS}
              style={{
                backgroundColor: c.roxo,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>
                CONTINUAR →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── TELA 2: Pesquisa NPS ─────────────────────────────────────────────────────
  if (etapa === 'nps') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 400 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: c.texto, textAlign: 'center', marginBottom: 8 }}>
              {perguntaCustom}
            </Text>
            <Text style={{ fontSize: 12, color: c.subtexto, textAlign: 'center', marginBottom: 30 }}>
              Sua opinião é muito importante! ⭐
            </Text>

            <View style={{ marginBottom: 30 }}>
              {[1, 2, 3, 4, 5].map((nota) => (
                <TouchableOpacity
                  key={nota}
                  onPress={() => setNotaNps(nota)}
                  style={{
                    backgroundColor: notaNps === nota ? c.roxo : c.card,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: notaNps === nota ? c.roxo : c.borda,
                  }}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>
                    {nota === 1 ? '😢' : nota === 2 ? '😞' : nota === 3 ? '😐' : nota === 4 ? '😊' : '😍'}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: '700',
                      color: notaNps === nota ? '#fff' : c.texto,
                    }}
                  >
                    {nota === 1 ? 'Muito ruim' : nota === 2 ? 'Ruim' : nota === 3 ? 'Regular' : nota === 4 ? 'Bom' : 'Excelente'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={avancarParaRoleta}
              style={{
                backgroundColor: notaNps > 0 ? c.roxo : '#ccc',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
              disabled={notaNps === 0}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>
                GIRAR A ROLETA →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── TELA 3: Roleta Girando ───────────────────────────────────────────────────
  if (etapa === 'roleta' && premiosRoletaMesa.length > 0) {
    const spinStyle = {
      transform: [{ rotate: rotateAnim.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg'],
      })}],
    };

    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: c.roxo, marginBottom: 20 }}>
          {rodando ? '🎡 GIRANDO...' : 'BOA SORTE!'}
        </Text>

        <Animated.View style={[spinStyle, { marginBottom: 30 }]}>
          <WheelSVG prizes={premiosRoletaMesa} size={280} isDark={isDark} />
        </Animated.View>

        <TouchableOpacity
          onPress={girarRoleta}
          disabled={rodando}
          style={{
            backgroundColor: rodando ? '#ccc' : c.roxo,
            borderRadius: 16,
            paddingVertical: 18,
            paddingHorizontal: 40,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>
            {rodando ? 'GIRANDO...' : '🎰 GIRAR AGORA!'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── TELA 4: Resultado ───────────────────────────────────────────────────────
  if (etapa === 'resultado' && premioGanho) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 20 }}>🎉</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: c.roxo, textAlign: 'center', marginBottom: 12 }}>
              PARABÉNS!
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.texto, textAlign: 'center', marginBottom: 20 }}>
              {premioGanho.nome}
            </Text>

            <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: c.borda, minWidth: 300 }}>
              <Text style={{ fontSize: 12, color: c.subtexto, marginBottom: 8 }}>VOCÊ GANHOU</Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: c.roxo }}>
                {premioGanho.tipo === 'desconto' ? `${premioGanho.valor}%` : `${premioGanho.nome}`}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setEtapa('telefone')}
              style={{
                backgroundColor: c.roxo,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                minWidth: 300,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>
                JOGAR NOVAMENTE? 🎮
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                // Volta para app principal
                // router.push('/cliente');
              }}
              style={{ marginTop: 15 }}
            >
              <Text style={{ color: c.subtexto, fontSize: 14, fontWeight: '600' }}>
                Voltar ao App
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: c.texto, fontSize: 16 }}>Carregando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({});

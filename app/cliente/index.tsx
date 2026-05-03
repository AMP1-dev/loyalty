import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, Vibration, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { supabase } from '../../lib/supabase';

const AnimaTouch = Animated.createAnimatedComponent(TouchableOpacity);

const salvarStorage = async (key: string, value: string) => {
  if (typeof window !== 'undefined') localStorage.setItem(key, value);
  else await AsyncStorage.setItem(key, value);
};
const carregarStorage = async (key: string) => {
  if (typeof window !== 'undefined') return localStorage.getItem(key);
  else return await AsyncStorage.getItem(key);
};

const DDD_VALIDOS = [
  '11','12','13','14','15','16','17','18','19',
  '21','22','24','27','28','27','28',
  '31','32','33','34','35','37','38',
  '41','42','43','44','45','46','47','48','49',
  '51','53','54','55',
  '61','62','63','64','65','66','67','68','69',
  '71','73','74','75','77','79',
  '81','82','83','84','85','86','87','88','89',
  '91','92','93','94','95','96','97','98','99'
];

// ─── Componente CTA da Roleta ────────────────────────────────────────────────
function RoletaCTA({ onPress, premiosRoleta, isDark, c }: any) {
  const idleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const WHEEL_SIZE = 240;
  const CENTER = WHEEL_SIZE / 2;
  const RADIUS = CENTER - 8;

  // Prêmios padrão para exibição no CTA (decorativo)
  const prizesDisplay = premiosRoleta && premiosRoleta.length >= 2 ? premiosRoleta : [
    { nome: '10 SPG', tipo: 'pontos' },
    { nome: 'R$ 2,00\nCashback', tipo: 'cashback' },
    { nome: 'Café\nGrátis', tipo: 'brinde' },
    { nome: 'R$ 5,00\nCashback', tipo: 'cashback' },
    { nome: '5 SPG', tipo: 'pontos' },
    { nome: 'Kit de\nFerramentas', tipo: 'brinde' },
    { nome: '15 SPG', tipo: 'pontos' },
    { nome: 'Brinde\nSurpresa', tipo: 'brinde' },
    { nome: 'R$ 1,00\nCashback', tipo: 'cashback' },
    { nome: '20 SPG', tipo: 'pontos' },
    { nome: 'Cappuccino\nPremium', tipo: 'brinde' },
    { nome: 'R$ 3,00\nCashback', tipo: 'cashback' },
  ];

  const numSlices = prizesDisplay.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  // Cores alternadas como na imagem: creme e verde-água
  const COLORS_LIGHT = ['#fdf8ec', '#d1fae5'];
  const COLORS_DARK = ['#1e293b', '#134e4a'];
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;
  const textColor = isDark ? '#e2e8f0' : '#334155';
  const accentColors = ['#d97706', '#10b981', '#d97706', '#10b981'];

  useEffect(() => {
    // Rotação idle lenta e contínua
    const rodar = () => {
      idleAnim.setValue(0);
      Animated.timing(idleAnim, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished) rodar(); });
    };
    rodar();

    // Pulso do glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  const wheelRotate = idleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const glowRadius = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 24] });

  // Gera os caminhos SVG das fatias
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

  // Posição do texto no meio da fatia
  const getTextPos = (index: number) => {
    const midAngle = index * sliceAngle - Math.PI / 2 + sliceAngle / 2;
    const r = RADIUS * 0.65;
    return {
      x: CENTER + r * Math.cos(midAngle),
      y: CENTER + r * Math.sin(midAngle),
      rotation: (midAngle * 180) / Math.PI + 90,
    };
  };

  const getIcon = (tipo: string) => {
    if (tipo === 'cashback') return 'R$';
    if (tipo === 'pontos') return '✦';
    return '🎁';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
        {/* Título */}
        <Text style={{
          fontSize: 20,
          fontWeight: '900',
          color: isDark ? '#f8fafc' : '#0f172a',
          marginBottom: 6,
          letterSpacing: 1,
        }}>
          ✨ Roleta da Sorte ✨
        </Text>
        <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, marginBottom: 18, fontWeight: '600' }}>
          Toque para girar e ganhar prêmios!
        </Text>

        {/* Efeito de brilho ao redor */}
        <Animated.View style={{
          position: 'absolute',
          top: 44,
          width: WHEEL_SIZE + 20,
          height: WHEEL_SIZE + 20,
          borderRadius: (WHEEL_SIZE + 20) / 2,
          backgroundColor: 'transparent',
          shadowColor: '#10b981',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: glowOpacity as any,
          shadowRadius: glowRadius as any,
          elevation: 20,
          borderWidth: 2,
          borderColor: 'transparent',
        }} />

        {/* Seta ponteiro no topo */}
        <View style={{ zIndex: 10, marginBottom: -12 }}>
          <Svg width={32} height={32} viewBox="0 0 32 32">
            <Path d="M16 28 L4 6 L28 6 Z" fill="#10b981" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <Circle cx="16" cy="6" r="4" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
          </Svg>
        </View>

        {/* Aro externo metálico */}
        <View style={{
          width: WHEEL_SIZE + 16,
          height: WHEEL_SIZE + 16,
          borderRadius: (WHEEL_SIZE + 16) / 2,
          backgroundColor: isDark ? '#334155' : '#94a3b8',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 15,
        }}>
          {/* Roda girando */}
          <Animated.View style={{
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            borderRadius: WHEEL_SIZE / 2,
            overflow: 'hidden',
            transform: [{ rotate: wheelRotate }],
          }}>
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
              <Defs>
                <RadialGradient id="gCenter" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor="#ffffff" />
                  <Stop offset="100%" stopColor="#94a3b8" />
                </RadialGradient>
              </Defs>

              {/* Fatias */}
              {prizesDisplay.map((prize: any, i: number) => {
                const { x, y, rotation } = getTextPos(i);
                const lines = prize.nome.split('\n');
                const icon = getIcon(prize.tipo);
                return (
                  <G key={i}>
                    <Path
                      d={buildSlicePath(i)}
                      fill={colors[i % colors.length]}
                      stroke={isDark ? '#475569' : '#94a3b8'}
                      strokeWidth="1"
                    />
                    <G transform={`rotate(${rotation} ${x} ${y})`}>
                      {/* Ícone/Tipo */}
                      <SvgText
                        x={x}
                        y={y - (lines.length > 1 ? 9 : 5)}
                        fill={prize.tipo === 'cashback' ? '#d97706' : prize.tipo === 'pontos' ? '#10b981' : '#7c3aed'}
                        fontSize="7"
                        fontWeight="900"
                        textAnchor="middle"
                      >
                        {icon}
                      </SvgText>
                      {/* Texto linha 1 */}
                      <SvgText
                        x={x}
                        y={y + (lines.length > 1 ? 0 : 4)}
                        fill={textColor}
                        fontSize="5.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {lines[0]}
                      </SvgText>
                      {/* Texto linha 2 (se houver) */}
                      {lines[1] && (
                        <SvgText
                          x={x}
                          y={y + 8}
                          fill={textColor}
                          fontSize="5.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {lines[1]}
                        </SvgText>
                      )}
                    </G>
                    {/* Estrelinhas nas bordas das fatias pares */}
                    {i % 2 === 0 && (() => {
                      const starAngle = i * sliceAngle - Math.PI / 2 + sliceAngle / 2;
                      const sr = RADIUS * 0.92;
                      const sx = CENTER + sr * Math.cos(starAngle);
                      const sy = CENTER + sr * Math.sin(starAngle);
                      return (
                        <SvgText x={sx} y={sy + 3} fill="#10b981" fontSize="8" textAnchor="middle">★</SvgText>
                      );
                    })()}
                  </G>
                );
              })}

              {/* Divisórias radiais */}
              {prizesDisplay.map((_: any, i: number) => {
                const angle = i * sliceAngle - Math.PI / 2;
                const x2 = CENTER + RADIUS * Math.cos(angle);
                const y2 = CENTER + RADIUS * Math.sin(angle);
                return (
                  <Path
                    key={`div-${i}`}
                    d={`M${CENTER},${CENTER} L${x2},${y2}`}
                    stroke={isDark ? '#475569' : '#94a3b8'}
                    strokeWidth="0.8"
                  />
                );
              })}

              {/* Centro metálico */}
              <Circle cx={CENTER} cy={CENTER} r="18" fill="url(#gCenter)" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="2" />
              <Circle cx={CENTER} cy={CENTER} r="10" fill={isDark ? '#0f172a' : '#fff'} stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="1.5" />
              <SvgText x={CENTER} y={CENTER + 4} fill="#10b981" fontSize="9" fontWeight="900" textAnchor="middle">✦</SvgText>
            </Svg>
          </Animated.View>
        </View>

        {/* Bolinhas decorativas ao redor */}
        {[45, 135, 225, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const r = WHEEL_SIZE / 2 + 30;
          return (
            <View key={deg} style={{
              position: 'absolute',
              top: 44 + WHEEL_SIZE / 2 + r * Math.sin(rad) - 5,
              left: WHEEL_SIZE / 2 + 8 + r * Math.cos(rad) - 5,
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: deg % 2 === 0 ? '#10b981' : '#facc15',
              opacity: 0.7,
            }} />
          );
        })}

        {/* Botão CTA */}
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={{
            marginTop: 22,
            paddingHorizontal: 40,
            paddingVertical: 14,
            borderRadius: 50,
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1.5 }}>
            JOGAR ROLETA 🎡
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Cliente() {
  const params = useLocalSearchParams();
  const loja_id = params?.loja_id;

  const [cpf, setCpf] = useState('');
  const [status, setStatus] = useState<'idle' | 'aguardando' | 'finalizado'>('idle');

  const [saldo, setSaldo] = useState(0);
  const [cashback, setCashback] = useState(0);
  const [saldoLocal, setSaldoLocal] = useState(0);
  const [cashbackLocal, setCashbackLocal] = useState(0);

  const [displayCash, setDisplayCash] = useState(0);
  const [displaySaldo, setDisplaySaldo] = useState(0);
  const [displayCashLocal, setDisplayCashLocal] = useState(0);
  const [displaySaldoLocal, setDisplaySaldoLocal] = useState(0);

  const [nomeLojaAtual, setNomeLojaAtual] = useState('');
  const [recompensas, setRecompensas] = useState<any[]>([]);
  const [recompensasRede, setRecompensasRede] = useState<any[]>([]);
  const [resgatados, setResgatados] = useState<string[]>([]);
  const [banners, setBanners] = useState<any[]>([]);

  const [mostrarExtrato, setMostrarExtrato] = useState(false);
  const [extrato, setExtrato] = useState<any[]>([]);

  const [brindesPendentes, setBrindesPendentes] = useState<any[]>([]);
  const [configLoja, setConfigLoja] = useState<any>(null);

  const [mostrarRoletaModal, setMostrarRoletaModal] = useState(false);
  const [etapaRoleta, setEtapaRoleta] = useState<'nps' | 'girando' | 'resultado'>('nps');
  const [perguntasNps, setPerguntasNps] = useState<any[]>([]);
  const [premiosRoleta, setPremiosRoleta] = useState<any[]>([]);
  const [respostasNps, setRespostasNps] = useState<any>({});
  const [premioGanho, setPremioGanho] = useState<any>(null);
  const [rodando, setRodando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [rotation, setRotation] = useState(0);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const animatedCash = useRef(new Animated.Value(0)).current;
  const animatedSaldo = useRef(new Animated.Value(0)).current;
  const animatedCashLocal = useRef(new Animated.Value(0)).current;
  const animatedSaldoLocal = useRef(new Animated.Value(0)).current;
  const pulseWin = useRef(new Animated.Value(1)).current;

  const [toast, setToast] = useState({ visible: false, message: '', tipo: 'sucesso' });
  const toastAnim = useRef(new Animated.Value(-150)).current;

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ visible: true, message: mensagem, tipo });
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: Platform.OS === 'web' ? 20 : 50, useNativeDriver: true, speed: 12 }),
      Animated.delay(4000),
      Animated.timing(toastAnim, { toValue: -150, duration: 400, useNativeDriver: true })
    ]).start(() => setToast({ visible: false, message: '', tipo: 'sucesso' }));
  };

  const temaSistema = useColorScheme();
  const [isDark, setIsDark] = useState(temaSistema === 'dark');
  useEffect(() => { setIsDark(temaSistema === 'dark'); }, [temaSistema]);

  const c = {
    bg: isDark ? '#020617' : '#F8FAFC',
    card: isDark ? '#0f172a' : '#FFFFFF',
    borda: isDark ? '#1e293b' : '#E2E8F0',
    texto: isDark ? '#F8FAFC' : '#0F172A',
    subtexto: isDark ? '#94a3b8' : '#64748B',
    neonVerde: '#10b981',
    neonAmarelo: '#facc15',
  };

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const wheelSpin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rotation}deg`] });

  useEffect(() => {
    const initApp = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const APP_VERSION = '4.6.2-pro-platinum';
        const savedVersion = localStorage.getItem('@app_version');
        if (savedVersion !== APP_VERSION) {
          localStorage.clear();
          localStorage.setItem('@app_version', APP_VERSION);
          window.location.reload();
          return;
        }
      }
      const saved = await carregarStorage('cliente_cpf');
      const lastLoja = await carregarStorage('@last_loja_id');
      if (saved) {
        setCpf(saved);
        const finalLojaId = loja_id || lastLoja;
        await carregarDados(saved, finalLojaId && finalLojaId !== 'undefined' ? String(finalLojaId) : undefined);
        setStatus('finalizado');
      }
    };
    initApp();
  }, [loja_id]);

  useEffect(() => {
    if (status !== 'aguardando') return;

    rotateAnim.setValue(0); pulse.setValue(1);
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true })
    ])).start();
    const girarInfinitamente = () => {
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
        .start(({ finished }) => { if (finished) girarInfinitamente(); });
    };
    girarInfinitamente();

    const cleanCpf = cpf.replace(/\D/g, '');

    const interval = setInterval(async () => {
      const { data } = await supabase.from('checkins').select('status').eq('cliente_cpf', cleanCpf).single();
      if (!data || data.status === 'atendido') {
        clearInterval(interval);
        Vibration.vibrate(500);
        carregarDados(cleanCpf, String(loja_id));
        setStatus('finalizado');
      }
    }, 5000);

    const subscription = supabase.channel(`wait_${cleanCpf}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'checkins', filter: `cliente_cpf=eq.${cleanCpf}` }, (payload) => {
        if (payload.new.status === 'atendido') {
          clearInterval(interval);
          Vibration.vibrate(500);
          carregarDados(cleanCpf, String(loja_id));
          setStatus('finalizado');
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(subscription);
    };
  }, [status]);

  useEffect(() => {
    Animated.timing(animatedCash, { toValue: cashback, duration: 1200, useNativeDriver: false }).start();
    const listener = animatedCash.addListener(({ value }) => setDisplayCash(value));
    return () => animatedCash.removeListener(listener);
  }, [cashback]);

  useEffect(() => {
    Animated.timing(animatedSaldo, { toValue: saldo, duration: 1200, useNativeDriver: false }).start();
    const listener = animatedSaldo.addListener(({ value }) => setDisplaySaldo(value));
    return () => animatedSaldo.removeListener(listener);
  }, [saldo]);

  useEffect(() => {
    Animated.timing(animatedCashLocal, { toValue: cashbackLocal, duration: 1200, useNativeDriver: false }).start();
    const listener = animatedCashLocal.addListener(({ value }) => setDisplayCashLocal(value));
    return () => animatedCashLocal.removeListener(listener);
  }, [cashbackLocal]);

  useEffect(() => {
    Animated.timing(animatedSaldoLocal, { toValue: saldoLocal, duration: 1200, useNativeDriver: false }).start();
    const listener = animatedSaldoLocal.addListener(({ value }) => setDisplaySaldoLocal(value));
    return () => animatedSaldoLocal.removeListener(listener);
  }, [saldoLocal]);

  const carregarDados = async (cpfBusca: string, lojaIdEfetivo?: string) => {
    const { data: lojas } = await supabase.from('lojas').select('id, nome');
    const { data: premiosRaw } = await supabase.from('recompensas').select('id, nome');
    const { data: configs } = await supabase.from('configuracoes_loja').select('loja_id, cidade, roleta_ativa, roleta_intervalo_dias');
    const mapLojas: any = {}; (lojas || []).forEach(l => mapLojas[l.id] = l.nome);
    const mapPremios: any = {}; (premiosRaw || []).forEach(p => mapPremios[p.id] = p.nome);
    const lidEfetivo = lojaIdEfetivo || String(loja_id);

    if (lidEfetivo && lidEfetivo !== 'undefined' && lidEfetivo !== 'null') {
      setNomeLojaAtual(mapLojas[lidEfetivo] || 'Loja Parceira');
      await salvarStorage('@last_loja_id', lidEfetivo);
    } else {
      setNomeLojaAtual('Minha Carteira PALM');
    }

    const configAtual = (configs || []).find(c => String(c.loja_id) === lidEfetivo);
    setConfigLoja(configAtual || null);

    const { data: ban } = await supabase.from('banners').select('*').eq('ativo', true).order('ordem', { ascending: true });
    setBanners(ban || []);

    const { data: trans } = await supabase.from('transacoes').select('*').eq('cliente_cpf', cpfBusca);
    const { data: res } = await supabase.from('resgates').select('*').eq('cliente_cpf', cpfBusca);
    const { data: cash } = await supabase.from('cashbacks').select('*').eq('cliente_cpf', cpfBusca);

    const totalGlobal = (trans || []).reduce((a, t) => a + (t.pontos_gerados || 0), 0);
    const usadosGlobal = (res || []).reduce((a, r) => a + (r.pontos_usados || 0), 0);
    setSaldo(totalGlobal - usadosGlobal);
    setResgatados((res || []).map((r) => String(r.recompensa_id)));
    setCashback((cash || []).filter(c => c.usado === false).reduce((s, c) => s + Number(c.valor), 0));

    if (lidEfetivo && lidEfetivo !== 'undefined') {
      const tLocal = (trans || []).filter(t => String(t.loja_id) === String(lidEfetivo)).reduce((a, t) => a + (t.pontos_gerados || 0), 0);
      const uLocal = (res || []).filter(r => String(r.loja_id) === String(lidEfetivo)).reduce((a, r) => a + (r.pontos_usados || 0), 0);
      setSaldoLocal(tLocal - uLocal);
      const cLocal = (cash || []).filter(c => String(c.loja_id) === String(lidEfetivo) && c.usado === false).reduce((s, c) => s + Number(c.valor), 0);
      setCashbackLocal(cLocal);
      const { data: rec } = await supabase.from('recompensas').select('*').eq('loja_id', String(lidEfetivo)).eq('ativo', true).order('custo_pontos', { ascending: true });
      setRecompensas(rec || []);
    }

    const historicoMap: any = {};
    (trans || []).forEach(t => {
      const dataChave = t.created_at.substring(0, 16);
      const chaveId = `${t.loja_id}_${dataChave}`;
      historicoMap[chaveId] = { id: Math.random().toString(), tipo: 'compra', loja: mapLojas[t.loja_id] || 'Rede PALM', valor: t.valor, pontos: t.pontos_gerados, valor_cashback: 0, data: t.created_at };
    });
    const historicoTemporario = Object.values(historicoMap);
    historicoTemporario.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setExtrato(historicoTemporario);

    const { data: recRede } = await supabase.from('recompensas').select('*').eq('ativo', true).order('custo_pontos', { ascending: true }).limit(10);
    setRecompensasRede((recRede || []).map(r => ({ ...r, nomeLoja: mapLojas[r.loja_id] || 'Loja Parceira' })));
  };

  const getEstado = (r: any) => {
    if (saldoLocal < r.custo_pontos) return { t: 'SEM SALDO', d: true, c: c.borda };
    return { t: 'RESGATAR', d: false, c: '#10b981' };
  };

  const resgatar = async (r: any) => {
    const clean = cpf.replace(/\D/g, '');
    const { error } = await supabase.rpc('realizar_resgate', { p_cliente_cpf: clean, p_loja_id: String(loja_id || configLoja?.loja_id), p_recompensa_id: r.id });
    if (error) { mostrarToast(error.message, 'erro'); return; }
    mostrarToast('🎁 Resgate realizado!', 'sucesso'); await carregarDados(clean);
  };

  const sairDaCarteira = async () => {
    if (typeof window !== 'undefined') { localStorage.removeItem('cliente_cpf'); localStorage.removeItem('@last_loja_id'); }
    setCpf(''); setStatus('idle'); setSaldo(0); setCashback(0); setExtrato([]); router.replace('/cliente');
  };

  const formatarTelefone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    
    // Validação de DDD
    if (cleaned.length >= 2) {
      const ddd = cleaned.slice(0, 2);
      if (!DDD_VALIDOS.includes(ddd)) {
        setCpf('');
        mostrarToast('⚠️ Insira um DDD válido (Ex: 11, 19, 21...)', 'erro');
        return;
      }
    }

    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 7) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    else if (cleaned.length > 7) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    setCpf(formatted);
  };

  const entrarFila = async () => {
    const clean = cpf.replace(/\D/g, '');
    if (!clean || clean.length < 10) return;
    if (!loja_id) { await salvarStorage('cliente_cpf', clean); await carregarDados(clean); setStatus('finalizado'); return; }
    await salvarStorage('cliente_cpf', clean);
    await supabase.from('clientes').upsert({ cpf: clean });
    await supabase.from('checkins').insert([{ cliente_cpf: clean, loja_id: String(loja_id), status: 'aguardando' }]);
    setStatus('aguardando');
  };

  const abrirRoleta = async () => {
    const clean = cpf.replace(/\D/g, '');
    if (!clean) return;
    setCarregando(true);
    try {
      const lid = loja_id || configLoja?.loja_id || '1';
      const [{ data: pNps }, { data: pRoleta }] = await Promise.all([
        supabase.from('perguntas_nps').select('*').eq('loja_id', String(lid)).order('created_at', { ascending: true }),
        supabase.from('roleta_premios').select('*').eq('loja_id', String(lid)).order('probabilidade', { ascending: false })
      ]);
      setPerguntasNps(pNps && pNps.length > 0 ? pNps : [{ id: 'default', pergunta: 'O quanto você nos indicaria?', tipo: 'estrelas' }]);
      setPremiosRoleta(pRoleta && pRoleta.length >= 2 ? pRoleta : [
        { id: 'm1', nome: '10 Springs', tipo: 'pontos', valor: 10, probabilidade: 50 },
        { id: 'm2', nome: 'Café Grátis', tipo: 'brinde', valor: 0, probabilidade: 30 },
        { id: 'm3', nome: 'R$ 5 Cashback', tipo: 'cashback', valor: 5, probabilidade: 15 },
        { id: 'm4', nome: 'Brinde Surpresa', tipo: 'brinde', valor: 0, probabilidade: 5 }
      ]);
      setRespostasNps({}); setEtapaRoleta('nps'); setMostrarRoletaModal(true);
    } finally { setCarregando(false); }
  };

  const girarRoleta = async () => {
    if (rodando) return;
    setRodando(true);
    const clean = cpf.replace(/\D/g, '');

    let somaProbs = 0; premiosRoleta.forEach(p => somaProbs += Number(p.probabilidade));
    let random = Math.random() * somaProbs;
    let premioSorteado = premiosRoleta[premiosRoleta.length - 1];
    for (const p of premiosRoleta) { if (random < Number(p.probabilidade)) { premioSorteado = p; break; } random -= Number(p.probabilidade); }

    const sliceAngle = 360 / premiosRoleta.length;
    const indexPremio = premiosRoleta.findIndex(p => p.id === premioSorteado.id);
    const midSlice = (indexPremio * sliceAngle) + (sliceAngle / 2);
    const targetRotate = (12 * 360) + ((270 - midSlice + 360) % 360);

    setRotation(targetRotate);
    rotateAnim.setValue(0);

    let lastSlice = -1;
    const listener = rotateAnim.addListener(({ value }) => {
      const currentRotation = value * targetRotate;
      const currentSlice = Math.floor((currentRotation % 360) / sliceAngle);
      if (currentSlice !== lastSlice) {
        lastSlice = currentSlice;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });

    Animated.timing(rotateAnim, { toValue: 1, duration: 6000, easing: Easing.out(Easing.bezier(0.2, 0, 0, 1)), useNativeDriver: true }).start(async () => {
      rotateAnim.removeListener(listener);
      setPremioGanho(premioSorteado); setRodando(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEtapaRoleta('resultado'); await carregarDados(clean);
    });
  };

  // Banners por posição
  const banner1 = banners.find(b => b.ordem === 1);
  const banner2 = banners.find(b => b.ordem === 2);
  const bannerGrande = banners.find(b => b.ordem === 3);

  // ─── TELA DE LOGIN ─────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={styles.scroll}>
        
        {/* CABEÇALHO FESTIVO PREMIUM */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
           <View style={{ position: 'relative', padding: 20 }}>
              {/* Estrelas flutuantes decorativas */}
              <Text style={{ position: 'absolute', top: 0, left: 0, fontSize: 24 }}>✨</Text>
              <Text style={{ position: 'absolute', top: -10, right: 10, fontSize: 18 }}>✨</Text>
              <Text style={{ position: 'absolute', bottom: 10, left: -10, fontSize: 14 }}>✨</Text>
              <Text style={{ position: 'absolute', bottom: 0, right: -5, fontSize: 22 }}>✨</Text>
              
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 48, fontWeight: '900', color: c.neonVerde, letterSpacing: 8, lineHeight: 48 }}>PALM</Text>
                <Text style={{ fontSize: 48, fontWeight: '900', color: c.neonVerde, letterSpacing: 8, lineHeight: 48 }}>SPRINGS</Text>
              </View>
           </View>
           
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <View style={{ height: 1, width: 30, backgroundColor: c.borda }} />
              <Text style={{ color: c.subtexto, fontSize: 14, fontWeight: '600', letterSpacing: 1 }}>Sua carteira de benefícios premium</Text>
              <View style={{ height: 1, width: 30, backgroundColor: c.borda }} />
           </View>
        </View>

        <TextInput placeholder="(19) 99999-9999" placeholderTextColor={c.subtexto} value={cpf} onChangeText={formatarTelefone} keyboardType="phone-pad" maxLength={15} style={[styles.inputGigante, { backgroundColor: c.card, borderColor: c.borda, color: c.texto }]} />
        <TouchableOpacity style={styles.buttonBig} onPress={entrarFila} activeOpacity={0.8}><Text style={styles.buttonTextBig}>ACESSAR MINHA CARTEIRA</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── TELA DE AGUARDANDO ─────────────────────────────────────────────────────
  if (status === 'aguardando') {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Animated.View style={[styles.aiCircle, { transform: [{ scale: pulse }, { rotate: spin }], borderColor: '#14b8a6', backgroundColor: c.card }]} />
        <Text style={{ marginTop: 20, color: c.texto, fontWeight: 'bold' }}>Aguardando liberação do lojista...</Text>
        <Text style={{ color: c.subtexto, fontSize: 12, marginTop: 5 }}>Você será redirecionado automaticamente</Text>
      </View>
    );
  }

  // ─── TELA PRINCIPAL ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── 1. HEADER ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[styles.logoMini, { color: c.neonVerde }]}>PALM SPRINGS</Text>
              <Text style={{ color: c.subtexto, fontSize: 10, fontWeight: 'bold' }}>CLUBE DE VANTAGENS</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setIsDark(!isDark)} style={{ padding: 10, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.borda }}>
                <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMostrarExtrato(!mostrarExtrato)} style={{ padding: 10, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.borda }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: c.neonAmarelo }}>🧾 EXTRATO</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cards de saldo global */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 25 }}>
            <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, shadowColor: c.neonVerde, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 }]}>
              <Text style={{ color: c.subtexto, fontSize: 10, fontWeight: 'bold' }}>SPRINGS (REDE)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <Text style={{ color: c.neonVerde, fontSize: 28, fontWeight: '900' }}>✨ {Math.floor(displaySaldo)}</Text>
              </View>
            </View>
            <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda }]}>
              <Text style={{ color: c.subtexto, fontSize: 10, fontWeight: 'bold' }}>CASHBACK (REDE)</Text>
              <Text style={{ color: c.neonAmarelo, fontSize: 24, fontWeight: '900', marginTop: 5 }}>💰 R$ {displayCash.toFixed(2)}</Text>
            </View>
          </View>

          {/* Cards de saldo local */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, padding: 12, borderRadius: 16 }]}>
              <Text style={{ color: c.subtexto, fontSize: 9, fontWeight: 'bold' }}>DISPONÍVEL NESTA LOJA</Text>
              <Text style={{ color: c.neonVerde, fontSize: 18, fontWeight: '900', marginTop: 3 }}>{Math.floor(displaySaldoLocal)} Springs</Text>
            </View>
            <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, padding: 12, borderRadius: 16 }]}>
              <Text style={{ color: c.subtexto, fontSize: 9, fontWeight: 'bold' }}>DISPONÍVEL NESTA LOJA</Text>
              <Text style={{ color: c.neonAmarelo, fontSize: 16, fontWeight: '900', marginTop: 3 }}>R$ {displayCashLocal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* ── 2. BRINDES DA LOJA ATUAL ── */}
        {recompensas.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <Text style={[styles.sectionTitle, { color: c.texto, paddingHorizontal: 20 }]}>✨ Veja nossos brindes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
              {recompensas.map(r => (
                <View key={r.id} style={[styles.cardRecompensa, { backgroundColor: c.card, borderColor: c.borda }]}>
                  {r.imagem
                    ? <Image source={{ uri: r.imagem }} style={styles.imageRec} />
                    : <View style={styles.imagePlaceholder}><Text style={{ fontSize: 40 }}>🎁</Text></View>
                  }
                  <View style={styles.overlayRec}>
                    <Text style={styles.nomeRec} numberOfLines={2}>{r.nome}</Text>
                    <Text style={{ color: c.neonVerde, fontWeight: '900' }}>{r.custo_pontos} SPG</Text>
                    <TouchableOpacity
                      style={[styles.botaoRec, { backgroundColor: getEstado(r).c }]}
                      onPress={() => resgatar(r)}
                      disabled={getEstado(r).d}
                    >
                      <Text style={styles.botaoTexto}>{getEstado(r).t}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── 3. 2 CARDS DE PROPAGANDA ── */}
        {(banner1 || banner2) && (
          <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
            <Text style={[styles.sectionTitle, { color: c.texto }]}>📣 Novidades</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {banner1 && (
                <TouchableOpacity style={[styles.cardPropaganda, { flex: 1, borderColor: c.borda }]} activeOpacity={0.9}>
                  <Image source={{ uri: banner1.imagem }} style={styles.cardPropImagem} />
                  <View style={styles.cardPropOverlay}>
                    <Text style={styles.cardPropTitulo} numberOfLines={2}>{banner1.titulo}</Text>
                    {banner1.subtitulo ? <Text style={styles.cardPropSub} numberOfLines={1}>{banner1.subtitulo}</Text> : null}
                  </View>
                </TouchableOpacity>
              )}
              {banner2 && (
                <TouchableOpacity style={[styles.cardPropaganda, { flex: 1, borderColor: c.borda }]} activeOpacity={0.9}>
                  <Image source={{ uri: banner2.imagem }} style={styles.cardPropImagem} />
                  <View style={styles.cardPropOverlay}>
                    <Text style={styles.cardPropTitulo} numberOfLines={2}>{banner2.titulo}</Text>
                    {banner2.subtitulo ? <Text style={styles.cardPropSub} numberOfLines={1}>{banner2.subtitulo}</Text> : null}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── 4. CTA DA ROLETA (visual bonito) ── */}
        <View style={{ alignItems: 'center', marginVertical: 36, paddingHorizontal: 20 }}>
          <RoletaCTA
            onPress={abrirRoleta}
            premiosRoleta={premiosRoleta}
            isDark={isDark}
            c={c}
          />
        </View>

        {/* ── 5. BRINDES DA REDE CREDENCIADA ── */}
        {recompensasRede.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.sectionTitle, { color: c.texto, paddingHorizontal: 20 }]}>🌐 Brindes da Rede</Text>
            <Text style={{ color: c.subtexto, fontSize: 12, paddingHorizontal: 20, marginBottom: 14 }}>Troque seus Springs em qualquer loja parceira</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
              {recompensasRede.map(r => (
                <View key={r.id} style={[styles.cardRede, { backgroundColor: c.card, borderColor: c.borda }]}>
                  {r.imagem
                    ? <Image source={{ uri: r.imagem }} style={styles.imageRec} />
                    : <View style={[styles.imagePlaceholder, { height: 100 }]}><Text style={{ fontSize: 32 }}>🎁</Text></View>
                  }
                  <View style={{ padding: 12 }}>
                    <Text style={{ color: c.texto, fontWeight: 'bold', fontSize: 13 }} numberOfLines={1}>{r.nome}</Text>
                    <Text style={{ color: c.subtexto, fontSize: 10, marginTop: 2 }} numberOfLines={1}>📍 {r.nomeLoja}</Text>
                    <Text style={{ color: c.neonVerde, fontWeight: '900', marginTop: 4 }}>{r.custo_pontos} SPG</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── 6. BANNER MAIOR ── */}
        {bannerGrande && (
          <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
            <TouchableOpacity style={[styles.bannerCard, { borderColor: c.borda }]} activeOpacity={0.9}>
              <Image source={{ uri: bannerGrande.imagem }} style={styles.bannerImage} />
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle}>{bannerGrande.titulo}</Text>
                <Text style={styles.bannerSub}>{bannerGrande.subtitulo}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
        {/* Fallback banner se não houver bannerGrande */}
        {!bannerGrande && (
          <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
            <LinearGradient colors={['#0ea5e9', '#10b981', '#7c3aed']} style={[styles.bannerCard, { borderColor: 'transparent' }]}>
              <View style={{ flex: 1, padding: 24, justifyContent: 'flex-end' }}>
                <Text style={styles.bannerTitle}>A Magia Continua ✨</Text>
                <Text style={styles.bannerSub}>Acumule Springs hoje e troque por vantagens.</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── 7. DOIS CARDS FINAIS ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 28, flexDirection: 'row', gap: 12 }}>
          {/* Saiba como funciona */}
          <TouchableOpacity style={[styles.cardInfo, { backgroundColor: c.card, borderColor: c.borda, flex: 1 }]} activeOpacity={0.85}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>📘</Text>
            <Text style={{ color: c.texto, fontWeight: '900', fontSize: 14, textAlign: 'center' }}>Saiba como funciona</Text>
            <Text style={{ color: c.subtexto, fontSize: 11, textAlign: 'center', marginTop: 6 }}>Entenda o programa de benefícios</Text>
          </TouchableOpacity>

          {/* Indique e Ganhe */}
          <TouchableOpacity style={[styles.cardInfo, { backgroundColor: c.card, borderColor: '#10b981', flex: 1 }]} activeOpacity={0.85}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🎁</Text>
            <Text style={{ color: c.neonVerde, fontWeight: '900', fontSize: 14, textAlign: 'center' }}>Indique e Ganhe</Text>
            <Text style={{ color: c.subtexto, fontSize: 11, textAlign: 'center', marginTop: 6 }}>Convide amigos e ganhe Springs</Text>
          </TouchableOpacity>
        </View>

        {/* ── 8. BOTÃO SAIR DA CONTA ── */}
        <TouchableOpacity style={styles.botaoSair} onPress={sairDaCarteira}>
          <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>🚪 SAIR DA CONTA</Text>
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', color: c.subtexto, fontSize: 10, marginTop: 16, marginBottom: 10 }}>Versão 4.6.2-pro-platinum</Text>

      </ScrollView>

      {/* ── MODAL DA ROLETA (NPS + Roleta + Resultado) ── */}
      {mostrarRoletaModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {etapaRoleta === 'nps' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Antes de girar...</Text>
                {perguntasNps.map(p => (
                  <View key={p.id} style={{ marginTop: 25, backgroundColor: isDark ? '#0f172a' : '#f1f5f9', padding: 20, borderRadius: 20 }}>
                    <Text style={{ color: isDark ? '#f8fafc' : '#0f172a', textAlign: 'center', fontWeight: 'bold', marginBottom: 15 }}>{p.pergunta}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <TouchableOpacity key={s} onPress={() => setRespostasNps({ ...respostasNps, [p.id]: s })}>
                          <Text style={{ fontSize: 32, opacity: respostasNps[p.id] >= s ? 1 : 0.2 }}>⭐</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={[styles.buttonBig, { marginTop: 30 }]} onPress={() => setEtapaRoleta('girando')}>
                  <Text style={styles.buttonTextBig}>LIBERAR ROLETA 🎡</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {etapaRoleta === 'girando' && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 30 }}>BOA SORTE! 🍀</Text>
                <View style={{ position: 'relative', width: 320, height: 320, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', top: -10, zIndex: 100 }}>
                    <Svg width="40" height="40" viewBox="0 0 40 40">
                      <Path d="M20 35 L5 5 L35 5 Z" fill="#14b8a6" stroke="#fff" strokeWidth="2" />
                    </Svg>
                  </View>
                  <Animated.View style={{ width: 300, height: 300, borderRadius: 150, transform: [{ rotate: wheelSpin }], borderWidth: 10, borderColor: '#94a3b8', backgroundColor: '#020617' }}>
                    <Svg width="100%" height="100%" viewBox="0 0 100 100">
                      <Defs>
                        <RadialGradient id="gradCentral" cx="50%" cy="50%" rx="50%" ry="50%">
                          <Stop offset="0%" stopColor="#fff" />
                          <Stop offset="100%" stopColor="#94a3b8" />
                        </RadialGradient>
                      </Defs>
                      {premiosRoleta.map((p, i) => {
                        const angle = 360 / premiosRoleta.length;
                        const start = i * angle; const end = (i + 1) * angle;
                        const x1 = 50 + 45 * Math.cos(Math.PI * start / 180);
                        const y1 = 50 + 45 * Math.sin(Math.PI * start / 180);
                        const x2 = 50 + 45 * Math.cos(Math.PI * end / 180);
                        const y2 = 50 + 45 * Math.sin(Math.PI * end / 180);
                        return (
                          <G key={i}>
                            <Path d={`M50 50 L${x1} ${y1} A45 45 0 0 1 ${x2} ${y2} Z`} fill={i % 2 === 0 ? '#fdf8ec' : '#dcfce7'} stroke="#94a3b8" strokeWidth="0.5" />
                            <G transform={`rotate(${i * angle + angle / 2} 50 50)`}>
                              <SvgText x="75" y="52" fill="#475569" fontSize="3.5" fontWeight="900" textAnchor="middle" transform="rotate(90 75 52)">{p.nome.substring(0, 12).toUpperCase()}</SvgText>
                            </G>
                          </G>
                        );
                      })}
                      <Circle cx="50" cy="50" r="10" fill="url(#gradCentral)" stroke="#475569" strokeWidth="1" />
                    </Svg>
                  </Animated.View>
                </View>
                <TouchableOpacity style={[styles.buttonBig, { marginTop: 40, width: '100%' }]} onPress={girarRoleta} disabled={rodando}>
                  <Text style={styles.buttonTextBig}>{rodando ? 'SORTEANDO...' : 'GIRAR AGORA!'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {etapaRoleta === 'resultado' && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 60 }}>{premioGanho?.tipo === 'nada' ? '😢' : '🎉'}</Text>
                <Text style={styles.modalTitle}>{premioGanho?.nome}</Text>
                <TouchableOpacity style={[styles.buttonBig, { marginTop: 30, width: '100%' }]} onPress={() => setMostrarRoletaModal(false)}>
                  <Text style={styles.buttonTextBig}>FECHAR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* TOAST */}
      {toast.visible && (
        <Animated.View style={[styles.toast, { backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444', transform: [{ translateY: toastAnim }] }]}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{toast.message}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  logo: { fontSize: 36, fontWeight: '900', textAlign: 'center' },
  logoMini: { fontSize: 24, fontWeight: '900' },
  inputGigante: { padding: 22, borderRadius: 20, fontSize: 32, fontWeight: '900', textAlign: 'center', borderWidth: 2, marginBottom: 20 },
  buttonBig: { padding: 22, borderRadius: 20, alignItems: 'center', backgroundColor: '#10b981' },
  buttonTextBig: { color: '#fff', fontWeight: '900', fontSize: 16 },
  headerCard: { padding: 18, borderRadius: 22, borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15 },
  // Cards de recompensa da loja
  cardRecompensa: { width: 220, height: 300, borderRadius: 24, marginRight: 15, overflow: 'hidden', borderWidth: 1 },
  imageRec: { width: '100%', height: '100%', position: 'absolute' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  overlayRec: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, backgroundColor: 'rgba(0,0,0,0.85)' },
  nomeRec: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botaoRec: { padding: 12, borderRadius: 12, marginTop: 10, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  // Cards de propaganda (2 pequenos)
  cardPropaganda: { height: 140, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  cardPropImagem: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover' },
  cardPropOverlay: { flex: 1, padding: 14, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  cardPropTitulo: { color: '#fff', fontSize: 13, fontWeight: '900' },
  cardPropSub: { color: '#e2e8f0', fontSize: 10, marginTop: 3 },
  // Cards da rede
  cardRede: { width: 170, borderRadius: 20, marginRight: 14, overflow: 'hidden', borderWidth: 1 },
  // Banner grande
  bannerCard: { height: 200, borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  bannerImage: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover', opacity: 0.6 },
  bannerOverlay: { flex: 1, padding: 24, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  bannerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  bannerSub: { color: '#fff', fontSize: 14, marginTop: 4 },
  // Cards finais (Saiba + Indique)
  cardInfo: { padding: 22, borderRadius: 22, borderWidth: 1.5, alignItems: 'center' },
  // Botão sair
  botaoSair: { marginTop: 28, padding: 18, alignItems: 'center', marginHorizontal: 20, borderWidth: 1, borderRadius: 16, borderColor: '#ef4444' },
  // Modal
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 9999 },
  modalCard: { backgroundColor: '#1e293b', width: '100%', maxWidth: 450, padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  // Toast
  toast: { position: 'absolute', top: 0, left: 20, right: 20, padding: 16, borderRadius: 16, alignItems: 'center', zIndex: 99999 },
  // Aguardando
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aiCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, borderTopColor: 'transparent' },
});

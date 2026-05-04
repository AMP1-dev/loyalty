import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, useColorScheme,
  Vibration,
  View
} from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { supabase } from '../../lib/supabase';

// ─── Storage helpers ──────────────────────────────────────────────────────────
const salvarStorage = async (key: string, value: string) => {
  if (typeof window !== 'undefined') localStorage.setItem(key, value);
  else await AsyncStorage.setItem(key, value);
};
const carregarStorage = async (key: string) => {
  if (typeof window !== 'undefined') return localStorage.getItem(key);
  else return await AsyncStorage.getItem(key);
};

// ─── DDDs válidos brasileiros ──────────────────────────────────────────────────
const DDD_VALIDOS = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99'
];

// ─── Helpers da roleta ────────────────────────────────────────────────────────
const isPremioPositivo = (premio: any): boolean => {
  if (!premio) return false;
  if (premio.tipo === 'nada') return false;
  const nomeMin = (premio.nome || '').toLowerCase();
  if (nomeMin.includes('tente') || nomeMin.includes('não ganhou') || nomeMin.includes('nao ganhou')) return false;
  return true;
};

const getIconePremio = (tipo: string) => {
  if (tipo === 'cashback') return 'R$';
  if (tipo === 'pontos') return '✦';
  if (tipo === 'nada') return '✗';
  return '🎁';
};

// ─── Componente WheelSVG (compartilhado entre CTA e Modal) ───────────────────
function WheelSVG({ prizes, size, isDark }: { prizes: any[]; size: number; isDark: boolean }) {
  const CENTER = size / 2;
  const RADIUS = CENTER - 6;
  const numSlices = prizes.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  const COLORS_LIGHT = ['#fdf8ec', '#d1fae5'];
  const COLORS_DARK = ['#1e293b', '#134e4a'];
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;
  const textColor = isDark ? '#e2e8f0' : '#334155';

  // Fatias começam no TOPO (-PI/2) e vão no sentido horário
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
        <RadialGradient id="gCenter" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="100%" stopColor="#94a3b8" />
        </RadialGradient>
      </Defs>

      {prizes.map((prize: any, i: number) => {
        const { x, y, rotation } = getTextPos(i);
        const lines = (prize.nome || '').split('\n');
        const icon = getIconePremio(prize.tipo);
        const iconColor = prize.tipo === 'cashback' ? '#d97706'
          : prize.tipo === 'pontos' ? '#10b981'
            : prize.tipo === 'nada' ? '#ef4444'
              : '#7c3aed';

        return (
          <G key={i}>
            {/* Fatia */}
            <Path
              d={buildSlicePath(i)}
              fill={colors[i % colors.length]}
              stroke={isDark ? '#475569' : '#94a3b8'}
              strokeWidth="0.8"
            />
            {/* Conteúdo da fatia */}
            <G transform={`rotate(${rotation} ${x} ${y})`}>
              <SvgText x={x} y={y - (lines.length > 1 ? 11 : 6)}
                fill={iconColor} fontSize={size < 250 ? "8" : "10"}
                fontWeight="900" textAnchor="middle">
                {icon}
              </SvgText>
              <SvgText x={x} y={y + (lines.length > 1 ? 0 : 5)}
                fill={textColor} fontSize={size < 250 ? "7" : "8.5"}
                fontWeight="bold" textAnchor="middle">
                {lines[0]}
              </SvgText>
              {lines[1] && (
                <SvgText x={x} y={y + 10}
                  fill={textColor} fontSize={size < 250 ? "7" : "8.5"}
                  fontWeight="bold" textAnchor="middle">
                  {lines[1]}
                </SvgText>
              )}
            </G>
            {/* Estrelinhas nas fatias pares */}
            {i % 2 === 0 && (() => {
              const starAngle = i * sliceAngle - Math.PI / 2 + sliceAngle / 2;
              const sr = RADIUS * 0.92;
              return (
                <SvgText
                  x={CENTER + sr * Math.cos(starAngle)}
                  y={CENTER + sr * Math.sin(starAngle) + 3}
                  fill="#10b981" fontSize="7" textAnchor="middle">
                  ★
                </SvgText>
              );
            })()}
          </G>
        );
      })}

      {/* Divisórias */}
      {prizes.map((_: any, i: number) => {
        const angle = i * sliceAngle - Math.PI / 2;
        return (
          <Path key={`d${i}`}
            d={`M${CENTER},${CENTER} L${CENTER + RADIUS * Math.cos(angle)},${CENTER + RADIUS * Math.sin(angle)}`}
            stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="0.6" />
        );
      })}

      {/* Centro metálico */}
      <Circle cx={CENTER} cy={CENTER} r={size * 0.075} fill="url(#gCenter)" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1.5" />
      <Circle cx={CENTER} cy={CENTER} r={size * 0.042} fill={isDark ? '#0f172a' : '#fff'} stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="1" />
      <SvgText x={CENTER} y={CENTER + size * 0.016} fill="#10b981" fontSize={size * 0.038} fontWeight="900" textAnchor="middle">✦</SvgText>

      {/* Rebites/Parafusos no aro metálico */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const rivetRadius = RADIUS + size * 0.04;
        const rivetX = CENTER + rivetRadius * Math.cos(rad);
        const rivetY = CENTER + rivetRadius * Math.sin(rad);
        const rivetSize = size * 0.04;
        return (
          <G key={`rivet-${angle}`}>
            <Circle cx={rivetX} cy={rivetY} r={rivetSize} fill={isDark ? '#64748b' : '#cbd5e1'} stroke={isDark ? '#334155' : '#94a3b8'} strokeWidth="0.5" />
            <Circle cx={rivetX} cy={rivetY} r={rivetSize * 0.5} fill={isDark ? '#334155' : '#e2e8f0'} opacity="0.7" />
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Componente CTA da Roleta ─────────────────────────────────────────────────
function RoletaCTA({ onPress, premiosRoleta, isDark, c }: any) {
  const idleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const WHEEL_SIZE = 240;

  // Prêmios SEMPRE decorativos - nunca usa os reais!
  const prizesDisplay = [
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

  useEffect(() => {
    const rodar = () => {
      idleAnim.setValue(0);
      Animated.timing(idleAnim, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true })
        .start(({ finished }) => { if (finished) rodar(); });
    };
    rodar();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const wheelRotate = idleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>

      {/* Título */}
      <Text style={{ fontSize: 20, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 6, letterSpacing: 1 }}>
        ✨ Roleta da Sorte ✨
      </Text>
      <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, marginBottom: 18, fontWeight: '600' }}>
        Toque para girar e ganhar prêmios!
      </Text>

      {/* Glow */}
      <Animated.View style={{
        position: 'absolute', top: 44,
        width: WHEEL_SIZE + 20, height: WHEEL_SIZE + 20,
        borderRadius: (WHEEL_SIZE + 20) / 2,
        shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: glowOpacity as any, shadowRadius: 20, elevation: 20,
      }} />

      {/* Ponteiro */}
      <View style={{ zIndex: 10, marginBottom: -12 }}>
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <Path d="M16 28 L4 6 L28 6 Z" fill="#10b981" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <Circle cx="16" cy="6" r="4" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
        </Svg>
      </View>

      {/* Aro metálico */}
      <View style={{
        width: WHEEL_SIZE + 16, height: WHEEL_SIZE + 16,
        borderRadius: (WHEEL_SIZE + 16) / 2,
        backgroundColor: isDark ? '#334155' : '#94a3b8',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4, shadowRadius: 12, elevation: 15,
      }}>
        <Animated.View style={{
          width: WHEEL_SIZE, height: WHEEL_SIZE,
          borderRadius: WHEEL_SIZE / 2, overflow: 'hidden',
          transform: [{ rotate: wheelRotate }],
        }}>
          <WheelSVG prizes={prizesDisplay} size={WHEEL_SIZE} isDark={isDark} />
        </Animated.View>
      </View>

      {/* Bolinhas decorativas */}
      {[45, 135, 225, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const r = WHEEL_SIZE / 2 + 30;
        return (
          <View key={deg} style={{
            position: 'absolute',
            top: 44 + WHEEL_SIZE / 2 + r * Math.sin(rad) - 5,
            left: WHEEL_SIZE / 2 + 8 + r * Math.cos(rad) - 5,
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: deg % 90 === 45 ? '#10b981' : '#facc15',
            opacity: 0.7,
          }} />
        );
      })}

      {/* Botão */}
      <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.8}>
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={{
            marginTop: 22, paddingHorizontal: 40, paddingVertical: 14,
            borderRadius: 50, shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5,
            shadowRadius: 12, elevation: 10,
          }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1.5 }}>
            JOGAR ROLETA 🎡
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
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

  // ─── PIN States ───────────────────────────────────────────────────────────
  const [mostrarPinModal, setMostrarPinModal] = useState(false);
  const [pinDigitado, setPinDigitado] = useState(['', '', '', '']);
  const [ehPrimeiroCadastro, setEhPrimeiroCadastro] = useState(false);
  const [tentativasPinFalhadas, setTentativasPinFalhadas] = useState(0);
  const [pinModoValidar, setPinModoValidar] = useState(true); // true = validar, false = criar novo
  const pinInputRefs = useRef<any[]>([]);

  const [configLoja, setConfigLoja] = useState<any>(null);

  const [mostrarRoletaModal, setMostrarRoletaModal] = useState(false);
  const [etapaRoleta, setEtapaRoleta] = useState<'nps' | 'girando' | 'resultado'>('nps');
  const [perguntasNps, setPerguntasNps] = useState<any[]>([]);
  const [premiosRoleta, setPremiosRoleta] = useState<any[]>([]);
  const [respostasNps, setRespostasNps] = useState<any>({});
  const [premioGanho, setPremioGanho] = useState<any>(null);
  const [rodando, setRodando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [roletaTargetDeg, setRoletaTargetDeg] = useState(0);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const animatedCash = useRef(new Animated.Value(0)).current;
  const animatedSaldo = useRef(new Animated.Value(0)).current;
  const animatedCashLocal = useRef(new Animated.Value(0)).current;
  const animatedSaldoLocal = useRef(new Animated.Value(0)).current;
  // Animação de resultado
  const resultAnim = useRef(new Animated.Value(0)).current;

  const [toast, setToast] = useState({ visible: false, message: '', tipo: 'sucesso' });
  const toastAnim = useRef(new Animated.Value(-150)).current;

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

  // Spin da roleta real (de 0→1 mapeado para 0→targetDeg)
  const wheelSpin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${roletaTargetDeg}deg`],
  });
  // Spin do círculo de aguardando
  const spinAguard = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ visible: true, message: mensagem, tipo });
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: Platform.OS === 'web' ? 20 : 50, useNativeDriver: true, speed: 12 }),
      Animated.delay(4000),
      Animated.timing(toastAnim, { toValue: -150, duration: 400, useNativeDriver: true }),
    ]).start(() => setToast({ visible: false, message: '', tipo: 'sucesso' }));
  };

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const initApp = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const APP_VERSION = '4.8.5-platinum-secure-v2';
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

  // ─── Aguardando ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'aguardando') return;
    rotateAnim.setValue(0); pulse.setValue(1);
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
    const girarInf = () => {
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
        .start(({ finished }) => { if (finished) girarInf(); });
    };
    girarInf();
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
      }).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(subscription); };
  }, [status]);

  // ─── Resetar roleta ao fechar modal ───────────────────────────────────────
  useEffect(() => {
    if (!mostrarRoletaModal) {
      // Ao fechar, reseta para estado idle (girando lentamente)
      rotateAnim.setValue(0);
      setRoletaTargetDeg(0);
      setPremioGanho(null);
      setEtapaRoleta('nps');
      setRespostasNps({});

      // Reinicia a animação idle do CTA
      const rodarCTA = () => {
        rotateAnim.setValue(0);
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 18000,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) rodarCTA();
        });
      };
      rodarCTA();
    }
  }, [mostrarRoletaModal]);

  // ─── Animações de saldo ────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(animatedCash, { toValue: cashback, duration: 1200, useNativeDriver: false }).start();
    const l = animatedCash.addListener(({ value }) => setDisplayCash(value));
    return () => animatedCash.removeListener(l);
  }, [cashback]);
  useEffect(() => {
    Animated.timing(animatedSaldo, { toValue: saldo, duration: 1200, useNativeDriver: false }).start();
    const l = animatedSaldo.addListener(({ value }) => setDisplaySaldo(value));
    return () => animatedSaldo.removeListener(l);
  }, [saldo]);
  useEffect(() => {
    Animated.timing(animatedCashLocal, { toValue: cashbackLocal, duration: 1200, useNativeDriver: false }).start();
    const l = animatedCashLocal.addListener(({ value }) => setDisplayCashLocal(value));
    return () => animatedCashLocal.removeListener(l);
  }, [cashbackLocal]);
  useEffect(() => {
    Animated.timing(animatedSaldoLocal, { toValue: saldoLocal, duration: 1200, useNativeDriver: false }).start();
    const l = animatedSaldoLocal.addListener(({ value }) => setDisplaySaldoLocal(value));
    return () => animatedSaldoLocal.removeListener(l);
  }, [saldoLocal]);

  // ─── Carregar dados ────────────────────────────────────────────────────────
  const carregarDados = async (cpfBusca: string, lojaIdEfetivo?: string) => {
    const { data: lojas } = await supabase.from('lojas').select('id, nome');
    const { data: configs } = await supabase.from('configuracoes_loja').select('loja_id, cidade, roleta_ativa, roleta_intervalo_dias');
    const mapLojas: any = {};
    (lojas || []).forEach(l => (mapLojas[l.id] = l.nome));
    const lidEfetivo = lojaIdEfetivo || String(loja_id);

    if (lidEfetivo && lidEfetivo !== 'undefined' && lidEfetivo !== 'null') {
      setNomeLojaAtual(mapLojas[lidEfetivo] || 'Loja Parceira');
      await salvarStorage('@last_loja_id', lidEfetivo);

      // Verificar se tem brindes pendentes
      const { data: brindePendente } = await supabase
        .from('brindes_pendentes')
        .select('*')
        .eq('cliente_cpf', cpfBusca)
        .eq('resgatado', false)
        .eq('loja_id', lidEfetivo);

      if (brindePendente && brindePendente.length > 0) {
        mostrarToast(`🎁 Cliente tem ${brindePendente.length} brinde(s) pendente(s)!`, 'sucesso');
      }
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
    setResgatados((res || []).map(r => String(r.recompensa_id)));
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
      const chave = `${t.loja_id}_${t.created_at.substring(0, 16)}`;
      historicoMap[chave] = { id: Math.random().toString(), tipo: 'compra', loja: mapLojas[t.loja_id] || 'Rede PALM', valor: t.valor, pontos: t.pontos_gerados, data: t.created_at };
    });
    const hist = Object.values(historicoMap);
    hist.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setExtrato(hist);

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
    mostrarToast('🎁 Resgate realizado!', 'sucesso');
    await carregarDados(clean);
  };

  const sairDaCarteira = async () => {
    if (typeof window !== 'undefined') { localStorage.removeItem('cliente_cpf'); localStorage.removeItem('@last_loja_id'); }
    setCpf(''); setStatus('idle'); setSaldo(0); setCashback(0); setExtrato([]);
    router.replace('/cliente');
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

    setCarregando(true);
    try {
      // Se tem loja_id (leu QR) - vai direto sem PIN
      if (loja_id) {
        await continuarAposPin();
        return;
      }

      // Se não tem loja_id (digitou número) - pede PIN
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('pin_hash')
        .eq('cpf', clean)
        .single();

      const ehPrimeiro = !clienteExistente || !clienteExistente.pin_hash;

      if (ehPrimeiro) {
        // Primeiro cadastro - solicitar PIN
        setEhPrimeiroCadastro(true);
        setPinModoValidar(false);
        setMostrarPinModal(true);
      } else {
        // Cliente já tem PIN - validar PIN
        setPinModoValidar(true);
        setMostrarPinModal(true);
      }
      setCarregando(false);
    } catch (err) {
      console.error('Erro ao verificar cliente:', err);
      mostrarToast('❌ Erro ao processar', 'erro');
      setCarregando(false);
    }
  };

  // ─── Abrir Roleta (NPS primeiro) ───────────────────────────────────────────
  const abrirRoleta = async () => {
    const clean = cpf.replace(/\D/g, '');
    if (!clean) return;
    setCarregando(true);
    try {
      const lid = loja_id || configLoja?.loja_id || '1';
      const [{ data: pNps }, { data: pRoleta }] = await Promise.all([
        supabase.from('perguntas_nps').select('*').eq('loja_id', String(lid)).order('created_at', { ascending: true }),
        supabase.from('roleta_premios').select('*').eq('loja_id', String(lid)).order('probabilidade', { ascending: false }),
      ]);
      setPerguntasNps(pNps && pNps.length > 0 ? pNps : [{ id: 'default', pergunta: 'O quanto você nos indicaria?', tipo: 'estrelas' }]);
      setPremiosRoleta(pRoleta && pRoleta.length >= 2 ? pRoleta : [
        { id: 'm1', nome: '10 Springs', tipo: 'pontos', valor: 10, probabilidade: 50 },
        { id: 'm2', nome: 'Café Grátis', tipo: 'brinde', valor: 0, probabilidade: 30 },
        { id: 'm3', nome: 'R$ 5 Cashback', tipo: 'cashback', valor: 5, probabilidade: 15 },
        { id: 'm4', nome: 'Brinde Surpresa', tipo: 'brinde', valor: 0, probabilidade: 5 },
      ]);
      setRespostasNps({});
      setEtapaRoleta('nps');
      setMostrarRoletaModal(true);
    } finally { setCarregando(false); }
  };

  // ─── Função para salvar prêmio ganho ───────────────────────────────────────
  const salvarPremioGanho = async (premio: any, cpfCliente: string, lojaIdEfetiva: string | null) => {
    try {
      const lid = lojaIdEfetiva || configLoja?.loja_id || '1';

      if (premio.tipo === 'cashback') {
        // INSERT em cashbacks
        const { error } = await supabase.from('cashbacks').insert([{
          cliente_cpf: cpfCliente,
          loja_id: lid,
          valor: Number(premio.valor),
          usado: false,
        }]);
        if (error) console.error('Erro ao salvar cashback:', error);
        else {
          // Atualizar saldo imediatamente
          setCashback(prev => prev + Number(premio.valor));
          if (lid === loja_id || lid === configLoja?.loja_id) {
            setCashbackLocal(prev => prev + Number(premio.valor));
          }
        }
      } else if (premio.tipo === 'pontos') {
        // INSERT em bonus_pendentes com expiração
        const { data: config } = await supabase.from('configuracoes_loja').select('pontos_expiracao_dias').eq('loja_id', lid).single();
        const diasExpiracao = config?.pontos_expiracao_dias || 365;
        const dataExpiracao = new Date();
        dataExpiracao.setDate(dataExpiracao.getDate() + diasExpiracao);

        const { error } = await supabase.from('bonus_pendentes').insert([{
          cliente_cpf: cpfCliente,
          loja_id: lid,
          pontos: Number(premio.valor),
          data_expiracao: dataExpiracao.toISOString(),
          usado: false,
        }]);
        if (error) console.error('Erro ao salvar bonus:', error);
        else {
          // Atualizar saldo imediatamente
          setSaldo(prev => prev + Number(premio.valor));
          if (lid === loja_id || lid === configLoja?.loja_id) {
            setSaldoLocal(prev => prev + Number(premio.valor));
          }
        }
      } else if (premio.tipo === 'brinde') {
        // INSERT em brindes_pendentes
        const { error } = await supabase.from('brindes_pendentes').insert([{
          cliente_cpf: cpfCliente,
          loja_id: lid,
          nome_brinde: premio.nome,
          resgatado: false,
        }]);
        if (error) console.error('Erro ao salvar brinde:', error);
        else {
          mostrarToast('🎁 Brinde reservado! Avise o lojista', 'sucesso');
        }
      }
    } catch (err) {
      console.error('Erro ao salvar prêmio:', err);
    }
  };

  // ─── Funções de PIN ────────────────────────────────────────────────────────
  const hashPin = async (pin: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(pin, salt);
  };

  const verificarPin = async (pinDigitadoStr: string, pinHashArmazenado: string): Promise<boolean> => {
    return await bcrypt.compare(pinDigitadoStr, pinHashArmazenado);
  };

  const handlePinInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // apenas números
    const newPin = [...pinDigitado];
    newPin[index] = value.slice(-1); // apenas último dígito
    setPinDigitado(newPin);

    if (value && index < 3) {
      setTimeout(() => pinInputRefs.current[index + 1]?.focus(), 50);
    }
  };

  const handlePinBackspace = (index: number) => {
    if (!pinDigitado[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const criarNovoPin = async () => {
    const pinStr = pinDigitado.join('');
    if (pinStr.length !== 4) {
      mostrarToast('⚠️ PIN deve ter 4 dígitos', 'erro');
      return;
    }

    setCarregando(true);
    try {
      const pinHash = await hashPin(pinStr);
      const clean = cpf.replace(/\D/g, '');

      const { error } = await supabase
        .from('clientes')
        .update({ pin_hash: pinHash, tentativas_pin: 0, bloqueado_ate: null })
        .eq('cpf', clean);

      if (error) throw error;

      mostrarToast('✅ PIN configurado com sucesso!', 'sucesso');
      setMostrarPinModal(false);
      setPinDigitado(['', '', '', '']);
      setEhPrimeiroCadastro(false);

      // Prosseguir com entrada na fila
      await continuarAposPin();
    } catch (err) {
      console.error('Erro ao salvar PIN:', err);
      mostrarToast('❌ Erro ao configurar PIN', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const validarPin = async () => {
    const pinStr = pinDigitado.join('');
    if (pinStr.length !== 4) {
      mostrarToast('⚠️ Digite o PIN de 4 dígitos', 'erro');
      return;
    }

    setCarregando(true);
    try {
      const clean = cpf.replace(/\D/g, '');
      const { data: cliente } = await supabase
        .from('clientes')
        .select('pin_hash, bloqueado_ate, tentativas_pin')
        .eq('cpf', clean)
        .single();

      if (!cliente) {
        mostrarToast('❌ Cliente não encontrado', 'erro');
        return;
      }

      // Verificar bloqueio
      if (cliente.bloqueado_ate) {
        const agora = new Date();
        const bloqueioAte = new Date(cliente.bloqueado_ate);
        if (agora < bloqueioAte) {
          const minRestantes = Math.ceil((bloqueioAte.getTime() - agora.getTime()) / 60000);
          mostrarToast(`⏱️ Acesso bloqueado por ${minRestantes} minuto(s)`, 'erro');
          setCarregando(false);
          return;
        }
      }

      // Verificar PIN
      const pinValido = await verificarPin(pinStr, cliente.pin_hash);

      if (pinValido) {
        // Reset tentativas
        await supabase
          .from('clientes')
          .update({ tentativas_pin: 0, bloqueado_ate: null })
          .eq('cpf', clean);

        mostrarToast('✅ Acesso liberado!', 'sucesso');
        setMostrarPinModal(false);
        setPinDigitado(['', '', '', '']);
        await continuarAposPin();
      } else {
        // Incrementar tentativas
        const novasTentativas = (cliente.tentativas_pin || 0) + 1;

        if (novasTentativas >= 3) {
          const bloqueioAte = new Date();
          bloqueioAte.setMinutes(bloqueioAte.getMinutes() + 15);

          await supabase
            .from('clientes')
            .update({ tentativas_pin: novasTentativas, bloqueado_ate: bloqueioAte.toISOString() })
            .eq('cpf', clean);

          mostrarToast('🔒 Acesso bloqueado por 15 minutos', 'erro');
          setMostrarPinModal(false);
          setPinDigitado(['', '', '', '']);
        } else {
          await supabase
            .from('clientes')
            .update({ tentativas_pin: novasTentativas })
            .eq('cpf', clean);

          const tentativasRestantes = 3 - novasTentativas;
          mostrarToast(`❌ PIN incorreto (${tentativasRestantes} tentativa${tentativasRestantes > 1 ? 's' : ''} restante${tentativasRestantes > 1 ? 's' : ''})`, 'erro');
          setPinDigitado(['', '', '', '']);
          pinInputRefs.current[0]?.focus();
        }
      }
    } catch (err) {
      console.error('Erro ao validar PIN:', err);
      mostrarToast('❌ Erro ao validar PIN', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const continuarAposPin = async () => {
    const clean = cpf.replace(/\D/g, '');
    await salvarStorage('cliente_cpf', clean);

    if (!loja_id) {
      await carregarDados(clean);
      setStatus('finalizado');
      return;
    }

    // Cliente leu QR code
    await supabase.from('clientes').upsert({ cpf: clean });
    await supabase.from('checkins').insert([{ cliente_cpf: clean, loja_id: String(loja_id), status: 'aguardando' }]);
    setStatus('aguardando');
  };

  // ─── Girar Roleta ──────────────────────────────────────────────────────────
  const girarRoleta = async () => {
    if (rodando) return;
    setRodando(true);
    const clean = cpf.replace(/\D/g, '');

    // Sortear prêmio
    let somaProbs = premiosRoleta.reduce((s, p) => s + Number(p.probabilidade), 0);
    let random = Math.random() * somaProbs;
    let premioSorteado = premiosRoleta[premiosRoleta.length - 1];
    for (const p of premiosRoleta) {
      if (random < Number(p.probabilidade)) { premioSorteado = p; break; }
      random -= Number(p.probabilidade);
    }

    // ── Cálculo CORRETO da parada ──────────────────────────────────────────
    // As fatias são desenhadas começando do TOPO (-PI/2), no sentido horário.
    // Fatia i: ocupa de (i * sliceDeg) a ((i+1) * sliceDeg) a partir do topo.
    // Meio da fatia i: i * sliceDeg + sliceDeg/2 a partir do topo.
    // Quando a roda gira R graus no sentido horário, o ponto que estava
    // a θ do topo vai para θ+R. Queremos θ+R ≡ 0 (mod 360), ou seja:
    // R = (360 - (i*sliceDeg + sliceDeg/2) % 360) % 360
    const sliceDeg = 360 / premiosRoleta.length;
    const indexPremio = premiosRoleta.findIndex(p => p.id === premioSorteado.id);
    const midSliceDeg = indexPremio * sliceDeg + sliceDeg / 2;
    const finalOffset = (360 - (midSliceDeg % 360)) % 360;
    const targetRotate = 12 * 360 + finalOffset; // 12 voltas + posição exata

    setRoletaTargetDeg(targetRotate);
    rotateAnim.setValue(0);

    // Haptics durante o giro
    let lastSlice = -1;
    const listener = rotateAnim.addListener(({ value }) => {
      const current = value * targetRotate;
      const slice = Math.floor((current % 360) / sliceDeg);
      if (slice !== lastSlice) {
        lastSlice = slice;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });

    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 6000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      rotateAnim.removeListener(listener);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ── 2 segundos parado no prêmio ──
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Anima a entrada do resultado
      resultAnim.setValue(0);
      setPremioGanho(premioSorteado);
      setRodando(false);
      setEtapaRoleta('resultado');

      // Salvar prêmio ganho no banco
      const lojaIdPremio = loja_id ? String(loja_id) : null;
      await salvarPremioGanho(premioSorteado, clean, lojaIdPremio);

      Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 12 }).start();

      await carregarDados(clean);
    });
  };

  // ─── Banners por posição ───────────────────────────────────────────────────
  const banner1 = banners.find(b => b.ordem === 1);
  const banner2 = banners.find(b => b.ordem === 2);
  const bannerGrande = banners.find(b => b.ordem === 3);

  // ─── TELA DE LOGIN ─────────────────────────────────────────────────────────
  const renderIdle = () => (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[styles.scroll, { justifyContent: 'flex-start', paddingTop: 60 }]}>
      {/* CABEÇALHO FESTIVO PREMIUM */}
      <View style={{ alignItems: 'center', marginBottom: 25 }}>
        <View style={{ position: 'relative', padding: 20 }}>
          <Text style={{ position: 'absolute', top: 0, left: 0, fontSize: 24 }}>✨</Text>
          <Text style={{ position: 'absolute', top: -10, right: 10, fontSize: 18 }}>✨</Text>
          <Text style={{ position: 'absolute', bottom: 10, left: -10, fontSize: 14 }}>✨</Text>
          <Text style={{ position: 'absolute', bottom: 0, right: -5, fontSize: 22 }}>✨</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 48, fontWeight: '900', color: c.neonVerde, letterSpacing: 2, lineHeight: 46 }}>PALM</Text>
            <Text style={{ fontSize: 48, fontWeight: '900', color: c.neonVerde, letterSpacing: 2, lineHeight: 46 }}>SPRINGS</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 }}>
          <View style={{ height: 1, width: 25, backgroundColor: c.borda }} />
          <Text style={{ color: c.subtexto, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }}>seu clube de benefícios premium</Text>
          <View style={{ height: 1, width: 25, backgroundColor: c.borda }} />
        </View>
      </View>
      <TextInput
        placeholder="(19) 99999-9999" placeholderTextColor={c.subtexto}
        value={cpf} onChangeText={formatarTelefone}
        keyboardType="phone-pad" maxLength={15}
        style={[styles.inputGigante, { backgroundColor: c.card, borderColor: c.borda, color: c.texto }]}
      />
      <TouchableOpacity style={styles.buttonBig} onPress={entrarFila} activeOpacity={0.8} disabled={carregando}>
        <Text style={styles.buttonTextBig}>{carregando ? 'CARREGANDO...' : 'ACESSAR MINHA CARTEIRA'}</Text>
      </TouchableOpacity>
      <Text style={{ textAlign: 'center', color: c.subtexto, fontSize: 8, marginTop: 50, opacity: 0.5 }}>v4.8.5-platinum-secure-v2</Text>
    </ScrollView>
  );

  // ─── TELA DE AGUARDANDO ────────────────────────────────────────────────────
  const renderAguardando = () => (
    <View style={[styles.center, { backgroundColor: c.bg }]}>
      <Animated.View style={[styles.aiCircle, { transform: [{ scale: pulse }, { rotate: spinAguard }], borderColor: '#14b8a6', backgroundColor: c.card }]} />
      <Text style={{ marginTop: 20, color: c.texto, fontWeight: 'bold' }}>Aguardando liberação do lojista...</Text>
      <Text style={{ color: c.subtexto, fontSize: 12, marginTop: 5 }}>Você será redirecionado automaticamente</Text>
    </View>
  );

  // ─── TELA PRINCIPAL (DASHBOARD) ────────────────────────────────────────────
  const renderFinalizado = () => (
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

          {/* CARD ENVOLVENTE CINZA CLARO - SALDOS + EXTRATO */}
          <View style={{ paddingHorizontal: 0, marginTop: 25, marginHorizontal: 20, borderRadius: 24, backgroundColor: '#f3f4f6', padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>

            {/* Saldos globais */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: loja_id ? 12 : 0 }}>
              <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, shadowColor: c.neonVerde, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5, borderRadius: 16, padding: 14, position: 'relative' }]}>
                <Text style={{ color: c.subtexto, fontSize: 9, fontWeight: 'bold', marginBottom: 8 }}>SPRINGS (REDE)</Text>
                <Text style={{ color: c.neonVerde, fontSize: 26, fontWeight: '900' }}>✨ {Math.floor(displaySaldo)}</Text>
                <TouchableOpacity onPress={() => setMostrarExtrato(!mostrarExtrato)} style={{ position: 'absolute', top: 12, right: 12, padding: 6 }}>
                  <Text style={{ fontSize: 18 }}>👁️</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, borderRadius: 16, padding: 14, justifyContent: 'center' }]}>
                <Text style={{ color: c.subtexto, fontSize: 9, fontWeight: 'bold', marginBottom: 8 }}>CASHBACK (REDE)</Text>
                <Text style={{ color: c.neonAmarelo, fontSize: 24, fontWeight: '900' }}>💰 R$ {displayCash.toFixed(2)}</Text>
              </View>
            </View>

            {/* Saldos locais - APENAS SE LOJA_ID */}
            {loja_id && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: mostrarExtrato ? 12 : 0 }}>
                <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, padding: 12, borderRadius: 16 }]}>
                  <Text style={{ color: c.subtexto, fontSize: 9, fontWeight: 'bold' }}>DISPONÍVEL NESTA LOJA</Text>
                  <Text style={{ color: c.neonVerde, fontSize: 18, fontWeight: '900', marginTop: 3 }}>{Math.floor(displaySaldoLocal)} Springs</Text>
                </View>
                <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, padding: 12, borderRadius: 16 }]}>
                  <Text style={{ color: c.subtexto, fontSize: 9, fontWeight: 'bold' }}>DISPONÍVEL NESTA LOJA</Text>
                  <Text style={{ color: c.neonAmarelo, fontSize: 16, fontWeight: '900', marginTop: 3 }}>R$ {displayCashLocal.toFixed(2)}</Text>
                </View>
              </View>
            )}

            {/* EXTRATO */}
            {mostrarExtrato && (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: c.borda, paddingTop: 12 }}>
                <Text style={{ color: c.texto, fontWeight: '900', fontSize: 14, marginBottom: 12 }}>Histórico de Transações</Text>
                <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
                  {extrato.length > 0 ? (
                    extrato.map((item: any) => (
                      <View key={item.id} style={{ paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.borda, marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: c.texto, fontWeight: '700', fontSize: 12 }}>{item.loja}</Text>
                            <Text style={{ color: c.subtexto, fontSize: 10, marginTop: 2 }}>
                              {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} {new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: c.neonVerde, fontWeight: '900', fontSize: 12 }}>+{item.pontos} SPG</Text>
                            <Text style={{ color: c.neonAmarelo, fontSize: 10, marginTop: 2 }}>R$ {Number(item.valor).toFixed(2)}</Text>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: c.subtexto, textAlign: 'center', fontSize: 12 }}>Nenhuma transação ainda</Text>
                  )}
                </ScrollView>
              </View>
            )}
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
                    : <View style={styles.imagePlaceholder}><Text style={{ fontSize: 40 }}>🎁</Text></View>}
                  <View style={styles.overlayRec}>
                    <Text style={styles.nomeRec} numberOfLines={2}>{r.nome}</Text>
                    <Text style={{ color: c.neonVerde, fontWeight: '900' }}>{r.custo_pontos} SPG</Text>
                    <TouchableOpacity style={[styles.botaoRec, { backgroundColor: getEstado(r).c }]} onPress={() => resgatar(r)} disabled={getEstado(r).d}>
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

        {/* ── 4. CTA DA ROLETA ── */}
        <View style={{ alignItems: 'center', marginVertical: 36, paddingHorizontal: 20 }}>
          <RoletaCTA onPress={abrirRoleta} premiosRoleta={premiosRoleta} isDark={isDark} c={c} />
        </View>

        {/* ── 5. BRINDES DA REDE ── */}
        {recompensasRede.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.sectionTitle, { color: c.texto, paddingHorizontal: 20 }]}>🌐 Brindes da Rede</Text>
            <Text style={{ color: c.subtexto, fontSize: 12, paddingHorizontal: 20, marginBottom: 14 }}>
              Troque seus Springs em qualquer loja parceira
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
              {recompensasRede.map(r => (
                // ── Mesmo formato do carrossel primário ──
                <View key={r.id} style={[styles.cardRecompensa, { backgroundColor: c.card, borderColor: c.borda }]}>
                  {r.imagem
                    ? <Image source={{ uri: r.imagem }} style={styles.imageRec} />
                    : <View style={styles.imagePlaceholder}><Text style={{ fontSize: 40 }}>🎁</Text></View>}
                  <View style={styles.overlayRec}>
                    <Text style={styles.nomeRec} numberOfLines={2}>{r.nome}</Text>
                    <Text style={{ color: c.subtexto, fontSize: 10, marginTop: 2 }}>📍 {r.nomeLoja}</Text>
                    <Text style={{ color: c.neonVerde, fontWeight: '900', marginTop: 4 }}>{r.custo_pontos} SPG</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── 6. BANNER GRANDE ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          {bannerGrande ? (
            <TouchableOpacity style={[styles.bannerCard, { borderColor: c.borda }]} activeOpacity={0.9}>
              <Image source={{ uri: bannerGrande.imagem }} style={styles.bannerImage} />
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle}>{bannerGrande.titulo}</Text>
                <Text style={styles.bannerSub}>{bannerGrande.subtitulo}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <LinearGradient colors={['#0ea5e9', '#10b981', '#7c3aed']} style={[styles.bannerCard, { borderColor: 'transparent' }]}>
              <View style={{ flex: 1, padding: 24, justifyContent: 'flex-end' }}>
                <Text style={styles.bannerTitle}>A Magia Continua ✨</Text>
                <Text style={styles.bannerSub}>Acumule Springs hoje e troque por vantagens.</Text>
              </View>
            </LinearGradient>
          )}
        </View>

        {/* ── 7. DOIS CARDS FINAIS ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 28, flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[styles.cardInfo, { backgroundColor: c.card, borderColor: c.borda, flex: 1 }]} activeOpacity={0.85}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>📘</Text>
            <Text style={{ color: c.texto, fontWeight: '900', fontSize: 14, textAlign: 'center' }}>Saiba como{'\n'}funciona</Text>
            <Text style={{ color: c.subtexto, fontSize: 11, textAlign: 'center', marginTop: 6 }}>Entenda o programa de benefícios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cardInfo, { backgroundColor: c.card, borderColor: c.neonVerde, flex: 1 }]} activeOpacity={0.85}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🎁</Text>
            <Text style={{ color: c.neonVerde, fontWeight: '900', fontSize: 14, textAlign: 'center' }}>Indique e{'\n'}Ganhe</Text>
            <Text style={{ color: c.subtexto, fontSize: 11, textAlign: 'center', marginTop: 6 }}>Convide amigos e ganhe Springs</Text>
          </TouchableOpacity>
        </View>

        {/* ── 8. SAIR DA CONTA ── */}
        <TouchableOpacity style={styles.botaoSair} onPress={sairDaCarteira}>
          <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>🚪 SAIR DA CONTA</Text>
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', color: c.subtexto, fontSize: 10, marginTop: 16 }}>v4.8.5-platinum-secure-v2</Text>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* ── Conteúdo Dinâmico ── */}
      {status === 'idle' && renderIdle()}
      {status === 'aguardando' && renderAguardando()}
      {status === 'finalizado' && renderFinalizado()}

      {/* ── Modais Globais (Sempre acessíveis) ── */}

      {/* ── MODAL DA ROLETA ── */}
      {mostrarRoletaModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>

            {/* NPS */}
            {etapaRoleta === 'nps' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Antes de girar... 🎡</Text>
                <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 6, marginBottom: 10 }}>
                  Sua opinião vale muito pra gente!
                </Text>
                {perguntasNps.map(p => (
                  <View key={p.id} style={{ marginTop: 20, backgroundColor: '#0f172a', padding: 20, borderRadius: 20 }}>
                    <Text style={{ color: '#f8fafc', textAlign: 'center', fontWeight: 'bold', marginBottom: 15 }}>{p.pergunta}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <TouchableOpacity key={s} onPress={() => setRespostasNps({ ...respostasNps, [p.id]: s })}>
                          <Text style={{ fontSize: 32, opacity: respostasNps[p.id] >= s ? 1 : 0.2 }}>⭐</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.buttonBig, { marginTop: 30, opacity: Object.keys(respostasNps).length === perguntasNps.length ? 1 : 0.5 }]}
                  onPress={() => {
                    // Validar se respondeu todas as perguntas
                    if (Object.keys(respostasNps).length !== perguntasNps.length) {
                      mostrarToast('⚠️ Responda todas as perguntas!', 'erro');
                      return;
                    }
                    setEtapaRoleta('girando');
                  }}
                  disabled={Object.keys(respostasNps).length !== perguntasNps.length}
                >
                  <Text style={styles.buttonTextBig}>LIBERAR ROLETA 🎡</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* GIRANDO — visual igual ao CTA mas com prêmios reais */}
            {etapaRoleta === 'girando' && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 24 }}>BOA SORTE! 🍀</Text>

                {/* Ponteiro */}
                <View style={{ zIndex: 10, marginBottom: -12 }}>
                  <Svg width={36} height={36} viewBox="0 0 32 32">
                    <Path d="M16 28 L4 6 L28 6 Z" fill="#10b981" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                    <Circle cx="16" cy="6" r="4" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                  </Svg>
                </View>

                {/* Aro metálico + roda animada */}
                <View style={{
                  width: 308, height: 308, borderRadius: 154,
                  backgroundColor: '#334155',
                  justifyContent: 'center', alignItems: 'center',
                  shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
                }}>
                  <Animated.View style={{
                    width: 288, height: 288, borderRadius: 144,
                    overflow: 'hidden',
                    transform: [{ rotate: wheelSpin }],
                  }}>
                    <WheelSVG prizes={premiosRoleta} size={288} isDark={isDark} />
                  </Animated.View>
                </View>

                <TouchableOpacity
                  style={[styles.buttonBig, { marginTop: 32, width: '100%', opacity: rodando ? 0.6 : 1 }]}
                  onPress={girarRoleta}
                  disabled={rodando}>
                  <Text style={styles.buttonTextBig}>{rodando ? '🎡 Girando...' : 'GIRAR AGORA!'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* RESULTADO TEMÁTICO */}
            {etapaRoleta === 'resultado' && premioGanho && (() => {
              const positivo = isPremioPositivo(premioGanho);
              return (
                <Animated.View style={{
                  alignItems: 'center',
                  transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                  opacity: resultAnim,
                }}>
                  {positivo ? (
                    // ── FESTIVO ──
                    <LinearGradient colors={['#064e3b', '#065f46', '#0f172a']} style={styles.resultGradient}>
                      <Text style={{ fontSize: 70, marginBottom: 10 }}>🎉</Text>
                      <Text style={{ color: '#6ee7b7', fontSize: 14, fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
                        PARABÉNS!
                      </Text>
                      <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 6 }}>
                        {premioGanho.nome}
                      </Text>
                      <Text style={{ color: '#6ee7b7', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
                        {premioGanho.tipo === 'cashback' ? '💰 Cashback creditado na sua carteira!'
                          : premioGanho.tipo === 'pontos' ? '✨ Springs adicionados ao seu saldo!'
                            : '🎁 Retire seu brinde com o atendente!'}
                      </Text>
                      {/* Estrelinhas decorativas */}
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                        {['🌟', '⭐', '🌟', '⭐', '🌟'].map((e, i) => (
                          <Text key={i} style={{ fontSize: 20 }}>{e}</Text>
                        ))}
                      </View>
                    </LinearGradient>
                  ) : (
                    // ── TRISTE ──
                    <LinearGradient colors={['#1e1b4b', '#312e81', '#0f172a']} style={styles.resultGradient}>
                      <Text style={{ fontSize: 70, marginBottom: 10 }}>😢</Text>
                      <Text style={{ color: '#a5b4fc', fontSize: 14, fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
                        OPS...
                      </Text>
                      <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 6 }}>
                        {premioGanho.nome}
                      </Text>
                      <Text style={{ color: '#a5b4fc', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
                        Não foi dessa vez... Tente novamente na sua próxima visita!
                      </Text>
                    </LinearGradient>
                  )}
                  <TouchableOpacity style={[styles.buttonBig, { width: '100%', marginTop: 8 }]} onPress={() => setMostrarRoletaModal(false)}>
                    <Text style={styles.buttonTextBig}>FECHAR</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })()}
          </View>
        </View>
      )}

      {/* TOAST */}
      {mostrarPinModal && (
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: c.card, borderRadius: 24, padding: 28, width: '100%', maxWidth: 350 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: c.texto, textAlign: 'center', marginBottom: 8 }}>
              {pinModoValidar ? '🔐 Acesso Seguro' : '📱 Criar PIN'}
            </Text>
            <Text style={{ color: c.subtexto, textAlign: 'center', marginBottom: 24, fontSize: 13 }}>
              {pinModoValidar ? 'Digite seu PIN de 4 dígitos' : 'Crie um PIN de 4 dígitos para sua carteira'}
            </Text>

            {/* 4 Input Boxes para PIN */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              {[0, 1, 2, 3].map(i => (
                <TextInput
                  key={i}
                  ref={input => {
                    if (input) pinInputRefs.current[i] = input;
                  }}
                  value={pinDigitado[i]}
                  onChangeText={v => handlePinInput(i, v)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace') handlePinBackspace(i);
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  secureTextEntry={true}
                  style={{
                    width: 60, height: 60,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: pinDigitado[i] ? c.neonVerde : c.borda,
                    backgroundColor: c.bg,
                    color: c.texto,
                    fontSize: 28,
                    fontWeight: '900',
                    textAlign: 'center',
                  }}
                  placeholder="•"
                  placeholderTextColor={c.subtexto}
                />
              ))}
            </View>

            {/* Botões */}
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={{ backgroundColor: c.neonVerde, padding: 16, borderRadius: 12, alignItems: 'center' }}
                onPress={pinModoValidar ? validarPin : criarNovoPin}
                disabled={carregando}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>
                  {carregando ? '⏳ Processando...' : (pinModoValidar ? 'CONFIRMAR' : 'CRIAR PIN')}
                </Text>
              </TouchableOpacity>

              {!pinModoValidar && (
                <TouchableOpacity
                  style={{ backgroundColor: c.borda, padding: 14, borderRadius: 12, alignItems: 'center' }}
                  onPress={() => {
                    setMostrarPinModal(false);
                    setPinDigitado(['', '', '', '']);
                  }}
                >
                  <Text style={{ color: c.subtexto, fontWeight: '700', fontSize: 12 }}>CANCELAR</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* WhatsApp Recovery para PIN - quando estiver sem QR code */}
            {!loja_id && pinModoValidar && (
              <TouchableOpacity
                style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.borda }}
                onPress={() => {
                  const numero = cpf.replace(/\D/g, '');
                  const url = `https://wa.me/+55${numero}?text=Olá, esqueci meu PIN de acesso ao PALM SPRINGS`;
                  // Abrir WhatsApp (em produção, usar Linking)
                }}
              >
                <Text style={{ fontSize: 18 }}>💬</Text>
                <Text style={{ color: c.neonVerde, fontWeight: '700', fontSize: 12 }}>Perdeu o PIN? Solicite via WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {toast.visible && (
        <Animated.View style={[styles.toast, {
          backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444',
          transform: [{ translateY: toastAnim }],
        }]}>
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
  // Carrossel (loja + rede — mesmo formato)
  cardRecompensa: { width: 220, height: 300, borderRadius: 24, marginRight: 15, overflow: 'hidden', borderWidth: 1 },
  imageRec: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  overlayRec: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, backgroundColor: 'rgba(0,0,0,0.85)' },
  nomeRec: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  botaoRec: { padding: 12, borderRadius: 12, marginTop: 10, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  // Cards de propaganda
  cardPropaganda: { height: 140, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  cardPropImagem: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover' },
  cardPropOverlay: { flex: 1, padding: 14, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  cardPropTitulo: { color: '#fff', fontSize: 13, fontWeight: '900' },
  cardPropSub: { color: '#e2e8f0', fontSize: 10, marginTop: 3 },
  // Banner grande
  bannerCard: { height: 200, borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  bannerImage: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover', opacity: 0.6 },
  bannerOverlay: { flex: 1, padding: 24, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  bannerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  bannerSub: { color: '#fff', fontSize: 14, marginTop: 4 },
  // Cards finais
  cardInfo: { padding: 22, borderRadius: 22, borderWidth: 1.5, alignItems: 'center' },
  // Sair
  botaoSair: { marginTop: 28, padding: 18, alignItems: 'center', marginHorizontal: 20, borderWidth: 1, borderRadius: 16, borderColor: '#ef4444' },
  // Modal
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 9999 },
  modalCard: { backgroundColor: '#1e293b', width: '100%', maxWidth: 450, padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  // Resultado
  resultGradient: { width: '100%', borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  // Toast
  toast: { position: 'absolute', top: 0, left: 20, right: 20, padding: 16, borderRadius: 16, alignItems: 'center', zIndex: 99999 },
  // Aguardando
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aiCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, borderTopColor: 'transparent' },
});

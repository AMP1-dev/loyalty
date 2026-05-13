import {
  buscarCaixaAtivaCliente,
  calcularSaldoCliente,
  gerarToken,
  tokenJaExiste
} from '@/lib/exchange';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated, Easing,
  Image,
  Modal,
  Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, useColorScheme,
  View
} from 'react-native';
import Svg, { Circle, Defs, FeComponentTransfer, FeFuncA, FeGaussianBlur, FeMerge, FeMergeNode, FeOffset, Filter, G, Path, RadialGradient, Stop, LinearGradient as SvgLinearGradient, Text as SvgText } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import MesaRoleta from './components/MesaRoleta';

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
  '31', '32', '33', '34', '35', '36', '37', '38', '39',
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
  if (tipo === 'cashback') return '✨';
  if (tipo === 'pontos') return '✨';
  if (tipo === 'nada') return '✨';
  if (tipo === 'bonus') return '✨';
  return '✨';
};

// ─── Validação de Telefone Brasileira ──────────────────────────────────────────
const validarTelefone = (tel: string) => {
  const clean = tel.replace(/\D/g, '');
  if (/^(\d)\1+$/.test(clean)) return false; // Bloqueia repetidos
  if (clean.length !== 10 && clean.length !== 11) return false;
  const ddd = clean.substring(0, 2);
  if (!DDD_VALIDOS.includes(ddd)) return false;
  if (clean.length === 11) {
    if (clean[2] !== '9') return false; // Celular deve começar com 9
  } else {
    if (!['2', '3', '4', '5'].includes(clean[2])) return false; // Fixo 2 a 5
  }
  return true;
};

// ─── Componente de Animação Pulsante (Estilo I.A) ──────────────────────────
const PulsingAI = ({ color }: { color: string }) => {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = (val: Animated.Value, to: number, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: to, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(val, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
    };
    pulse(scale1, 1.8, 0).start();
    pulse(scale2, 2.4, 400).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: color, opacity, transform: [{ scale: scale2 }] }} />
      <Animated.View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: color, opacity: 0.3, transform: [{ scale: scale1 }] }} />
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10, borderWidth: 2, borderColor: '#fff' }} />
    </View>
  );
};

// ─── Componente WheelSVG (compartilhado entre CTA e Modal) ───────────────────
function WheelSVG({ prizes, size, isDark }: { prizes: any[]; size: number; isDark: boolean }) {
  const CENTER = size / 2;
  const RADIUS = CENTER - 10;
  const numSlices = prizes.length;
  const ANGLE = 360 / numSlices;

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="metallicGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={isDark ? "#475569" : "#ffffff"} />
          <Stop offset="80%" stopColor={isDark ? "#1e293b" : "#e2e8f0"} />
          <Stop offset="100%" stopColor={isDark ? "#0f172a" : "#cbd5e1"} />
        </RadialGradient>
        <SvgLinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#fbbf24" />
          <Stop offset="50%" stopColor="#f59e0b" />
          <Stop offset="100%" stopColor="#d97706" />
        </SvgLinearGradient>
      </Defs>

      {/* Borda Metálica Externa */}
      <Circle cx={CENTER} cy={CENTER} r={CENTER - 2} fill="url(#metallicGrad)" stroke={isDark ? "#334155" : "#94a3b8"} strokeWidth="4" />
      
      <G>
        {prizes.map((p, i) => {
          const startAngle = i * ANGLE;
          const endAngle = startAngle + ANGLE;
          const midAngle = startAngle + ANGLE / 2;

          const start = polarToCartesian(CENTER, CENTER, RADIUS, endAngle);
          const end = polarToCartesian(CENTER, CENTER, RADIUS, startAngle);
          const textPos = polarToCartesian(CENTER, CENTER, RADIUS * 0.65, midAngle);
          const iconPos = polarToCartesian(CENTER, CENTER, RADIUS * 0.82, midAngle);

          const colors = isDark 
            ? ['#1e293b', '#334155', '#1e293b', '#475569']
            : ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0'];
          const sliceColor = colors[i % colors.length];

          const d = `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 0 ${end.x} ${end.y} Z`;

          return (
            <G key={i}>
              <Path d={d} fill={sliceColor} stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="1" />
              
              {/* Ícone na borda */}
              <SvgText x={iconPos.x} y={iconPos.y + 4} fontSize="12" textAnchor="middle" transform={`rotate(${midAngle} ${iconPos.x} ${iconPos.y})`}>
                {getIconePremio(p.tipo)}
              </SvgText>

              {/* Texto Radial (Perpendicular ao centro) */}
              <SvgText 
                x={textPos.x} 
                y={textPos.y + 4} 
                fontSize="10" 
                fontWeight="900" 
                textAnchor="middle" 
                fill={isDark ? "#f8fafc" : "#1e293b"}
                transform={`rotate(${midAngle + 90} ${textPos.x} ${textPos.y})`}
              >
                {p.nome.length > 12 ? p.nome.substring(0, 10) + '..' : p.nome.toUpperCase()}
              </SvgText>
            </G>
          );
        })}
      </G>

      {/* Pino Central Premium */}
      <Circle cx={CENTER} cy={CENTER} r={RADIUS * 0.15} fill="url(#metallicGrad)" stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="2" />
      <Circle cx={CENTER} cy={CENTER} r={RADIUS * 0.05} fill={isDark ? "#10b981" : "#f59e0b"} />
    </Svg>
  );
}

// ─── Componente CTA da Roleta ─────────────────────────────────────────────────
function RoletaCTA({ onPress, isDark, c, premiosRoleta }: any) {
  const idleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const WHEEL_SIZE = 310;
  const prizesDisplay = [
    { nome: '10 SPRINGS', tipo: 'pontos' },
    { nome: 'R$ 2,00 CB', tipo: 'cashback' },
    { nome: 'CAFÉ GRÁTIS', tipo: 'brinde' },
    { nome: 'R$ 5,00 CB', tipo: 'cashback' },
    { nome: '5 SPRINGS', tipo: 'pontos' },
    { nome: 'BRINDE SURPRESA', tipo: 'brinde' },
    { nome: '15 SPRINGS', tipo: 'pontos' },
    { nome: 'R$ 1,00 CB', tipo: 'cashback' },
  ];

  useEffect(() => {
    const rodar = () => {
      idleAnim.setValue(0);
      Animated.timing(idleAnim, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" })
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

  const wheelRotate = idleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 6, letterSpacing: 1 }}>
        ✨ Roleta da Sorte ✨
      </Text>
      <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, marginBottom: 18, fontWeight: '600' }}>
        Toque para girar e ganhar prêmios!
      </Text>
      <Animated.View style={{
        position: 'absolute', top: 44, width: WHEEL_SIZE + 20, height: WHEEL_SIZE + 20,
        borderRadius: (WHEEL_SIZE + 20) / 2, shadowColor: '#10b981', shadowOpacity: glowOpacity as any, shadowRadius: 20, elevation: 20,
      }} />
      <View style={{ zIndex: 10, marginBottom: -15 }}>
        <Svg width={44} height={44} viewBox="0 0 32 32">
          <Defs>
            <SvgLinearGradient id="gradPino" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#facc15" />
              <Stop offset="100%" stopColor="#854d0e" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M16 30 L4 4 L28 4 Z" fill="url(#gradPino)" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={{
        width: WHEEL_SIZE + 24, height: WHEEL_SIZE + 24, borderRadius: (WHEEL_SIZE + 24) / 2,
        backgroundColor: isDark ? '#1e293b' : '#ffffff', justifyContent: 'center', alignItems: 'center',
        elevation: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15,
        borderWidth: 4, borderColor: isDark ? '#334155' : '#f1f5f9'
      }}>
        <Animated.View style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, transform: [{ rotate: wheelRotate }] }}>
          <WheelSVG prizes={prizesDisplay} size={WHEEL_SIZE} isDark={isDark} />
        </Animated.View>
      </View>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <LinearGradient colors={['#10b981', '#059669']} style={{ marginTop: 22, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 50, elevation: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1.5 }}>JOGAR ROLETA 🎡</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Cliente() {
  const params = useLocalSearchParams();
  const loja_id = Array.isArray(params?.loja_id) ? params?.loja_id[0] : params?.loja_id;
  const mesa_param = params?.mesa === 'true';

  const [modoMesaAtivo, setModoMesaAtivo] = useState(mesa_param);
  
  // 🔴 SINCRONIZA PARAMETRO MESA
  useEffect(() => {
    if (mesa_param) setModoMesaAtivo(true);
  }, [mesa_param]);

  const [cpf, setCpf] = useState('');
  const [status, setStatus] = useState<'idle' | 'aguardando' | 'atendido' | 'finalizado'>('idle');
  const [saldo, setSaldo] = useState(0);
  const [cashback, setCashback] = useState(0);
  const [saldoLocal, setSaldoLocal] = useState(0);
  const [cashbackLocal, setCashbackLocal] = useState(0);
  const [displayCash, setDisplayCash] = useState(0);
  const [displaySaldo, setDisplaySaldo] = useState(0);
  const [displayCashLocal, setDisplayCashLocal] = useState(0);
  const [displaySaldoLocal, setDisplaySaldoLocal] = useState(0);

  const [mostraIntercambio, setMostraIntercambio] = useState(false);
  const [tokenAtivo, setTokenAtivo] = useState<any>(null);
  const [saldoPorLoja, setSaldoPorLoja] = useState<any[]>([]);
  const [recompensas, setRecompensas] = useState<any[]>([]);
  const [recompensasRede, setRecompensasRede] = useState<any[]>([]);
  const [uuidLojaReal, setUuidLojaReal] = useState<string | null>(null);
  const [extrato, setExtrato] = useState<any[]>([]);
  const [mostrarExtrato, setMostrarExtrato] = useState(false);
  const [configLoja, setConfigLoja] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [nomeLojaAtual, setNomeLojaAtual] = useState('');

  const [mostrarPinModal, setMostrarPinModal] = useState(false);
  const [pinDigitado, setPinDigitado] = useState(['', '', '', '']);
  const [pinModoValidar, setPinModoValidar] = useState(true);
  const [ehPrimeiroCadastro, setEhPrimeiroCadastro] = useState(false);
  const pinInputRefs = useRef<(TextInput | null)[]>([]);
  const [mostrarRoletaModal, setMostrarRoletaModal] = useState(false);
  const [etapaRoleta, setEtapaRoleta] = useState<'nps' | 'girando' | 'resultado'>('nps');
  const [perguntasNps, setPerguntasNps] = useState<any[]>([]);
  const [premiosRoleta, setPremiosRoleta] = useState<any[]>([]);
  const [premioGanho, setPremioGanho] = useState<any>(null);
  const [respostasNps, setRespostasNps] = useState<any>({});
  const [rodando, setRodando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [roletaTargetDeg, setRoletaTargetDeg] = useState(0);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const idleAnim = useRef(new Animated.Value(0)).current;
  const lidRef = useRef<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-150)).current;
  const [toast, setToast] = useState({ visible: false, message: '', tipo: 'sucesso' });

  // ════════════════════════════════════════════════════════════════════
  // STATES DO EXCHANGE
  // ════════════════════════════════════════════════════════════════════
  const [mostrarExchange, setMostrarExchange] = useState(false);
  const [saldosPorLoja, setSaldosPorLoja] = useState<any[]>([]);
  const [selecaoPontos, setSelecaoPontos] = useState<any>({}); // { loja_id: pontos_selecionados }
  const [totalSelecionado, setTotalSelecionado] = useState(0);
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([]);
  const [accordionAberto, setAccordionAberto] = useState<string | null>(null);
  const [carregandoSaldos, setCarregandoSaldos] = useState(false);
  const [caixaAtiva, setCaixaAtiva] = useState<any>(null); // Pontos temporários no balcão

  const temaSistema = useColorScheme();
  const [isDark, setIsDark] = useState(temaSistema === 'dark');


  useEffect(() => {
    const rodarIdle = () => {
      idleAnim.setValue(0);
      Animated.timing(idleAnim, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })
        .start(({ finished }) => { if (finished) rodarIdle(); });
    };
    rodarIdle();
  }, []);

  useEffect(() => {
    const carregarTema = async () => {
      const temaSalvo = await carregarStorage('@tema_pref');
      setIsDark(temaSalvo ? temaSalvo === 'dark' : temaSistema === 'dark');
    };
    carregarTema();
  }, [temaSistema]);

  const toggleTheme = async () => {
    const novoTema = !isDark;
    setIsDark(novoTema);
    await salvarStorage('@tema_pref', novoTema ? 'dark' : 'light');
  };

  const c = {
    bg: isDark ? '#0B1120' : '#F1F5F9',
    card: isDark ? '#162032' : '#FFFFFF',
    borda: isDark ? '#26334A' : '#CBD5E1',
    texto: isDark ? '#F8FAFC' : '#1E293B',
    subtexto: isDark ? '#94A3B8' : '#64748B',
    neonVerde: '#10b981',
    neonAmarelo: '#F59E0B',
    verde: '#10b981',
    roxo: '#8B5CF6',
  };

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ visible: true, message: mensagem, tipo });
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: Platform.OS === 'web' ? 20 : 50, useNativeDriver: false, speed: 12 }),
      Animated.delay(4000),
      Animated.timing(toastAnim, { toValue: -150, duration: 400, useNativeDriver: false }),
    ]).start(() => setToast({ ...toast, visible: false }));
  };

  useEffect(() => {
    const initApp = async () => {
      // 1. LIMPEZA DE CACHE MANUAL (Via URL ?clear=true)
      if (params?.clear === 'true') {
        if (Platform.OS === 'web') {
          localStorage.clear();
        } else {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.clear();
        }
        router.replace('/cliente');
        return;
      }

      const APP_VERSION = "v5.8.4-exchange";
      const savedVersion = await carregarStorage('@app_version');
      if (savedVersion !== APP_VERSION) {
        if (typeof window !== 'undefined') localStorage.clear();
        await salvarStorage('@app_version', APP_VERSION);
      }
      const saved = await carregarStorage('cliente_cpf');

      // RESOLVER UUID DA LOJA SE FOR SLUG
      let lid_final = String(loja_id);
      const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

      // Atalho fixo para a loja principal para evitar falhas de busca por nome
      if (loja_id === 'amp') {
        lid_final = 'b3f20184-d9e6-47d5-bc7f-3e484d3fe265';
        setUuidLojaReal(lid_final);
        lidRef.current = lid_final;
      } else if (loja_id && !isUUID(String(loja_id))) {
        const { data: lData } = await supabase.from('lojas').select('id').ilike('nome', `%${loja_id}%`).maybeSingle();
        if (lData) {
          lid_final = lData.id;
          setUuidLojaReal(lData.id);
          lidRef.current = lData.id;
        }
      } else if (loja_id) {
        setUuidLojaReal(String(loja_id));
        lidRef.current = String(loja_id);
      }

      if (saved) {
        setCpf(saved);
        if (loja_id) {
          // Pre-fetch prêmios para a roleta do CTA ficar com dados REAIS
          const { data: pRol } = await supabase.from('roleta_premios').select('*').eq('loja_id', lid_final);
          if (pRol && pRol.length > 0) setPremiosRoleta(pRol);

          await supabase.from('checkins').upsert(
            { cliente_cpf: saved, loja_id: lid_final, status: 'aguardando' },
            { onConflict: 'cliente_cpf,loja_id' }
          );
          setStatus('aguardando');
        } else {
          await carregarDados(saved, lid_final);
          setStatus('finalizado');
        }
      } else {
        // Carrega o catálogo da loja mesmo se não estiver logado
        await carregarDados(null, lid_final);
      }
    };
    initApp();
  }, [loja_id]);

  useEffect(() => {
    if (status !== 'aguardando') return;
    const girar = () => { rotateAnim.setValue(0); Animated.timing(rotateAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => { if (finished) girar(); }); };
    girar();
    const clean = cpf.replace(/\D/g, '');
    const interval = setInterval(async () => {
      const { data, error } = await supabase.from('checkins').select('status').eq('cliente_cpf', clean).eq('loja_id', lidRef.current || String(loja_id)).maybeSingle();

      // Se o registro sumiu (foi atendido/removido) ou o status mudou, libera o cliente
      if (!data || data.status !== 'aguardando') {
        clearInterval(interval);
        await carregarDados(clean, lidRef.current || String(loja_id));
        setStatus('finalizado');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [status]);

  const carregarDados = async (cpfBusca: string | null, lojaIdEfetivo?: string) => {
    const { data: lojas } = await supabase.from('lojas').select('id, nome');
    const { data: configs } = await supabase.from('configuracoes_loja').select('*');
    const mapLojas: any = {}; lojas?.forEach(l => mapLojas[l.id] = l.nome);
    const lid = lojaIdEfetivo || String(loja_id);

    if (lid && lid !== 'undefined') { setNomeLojaAtual(mapLojas[lid] || 'Loja Parceira'); setConfigLoja(configs?.find(cf => cf.loja_id === lid)); }
    else setNomeLojaAtual('Minha Carteira PALM');

    const [{ data: trans }, { data: res }, { data: cash }, { data: bonus }] = await Promise.all([
      supabase.from('transacoes').select('*').eq('cliente_cpf', cpfBusca).order('created_at', { ascending: false }),
      supabase.from('resgates').select('*').eq('cliente_cpf', cpfBusca).order('created_at', { ascending: false }),
      supabase.from('cashbacks').select('*').eq('cliente_cpf', cpfBusca),
      supabase.from('bonus_pendentes').select('*').eq('cliente_cpf', cpfBusca).eq('usado', false)
    ]);

    // Combinar para o Extrato
    const comb = [
      ...(trans || []).map(t => ({ ...t, tipo: 'ganho', loja_nome: mapLojas[t.loja_id] || 'Loja Parceira' })),
      ...(res || []).map(r => ({ ...r, tipo: 'resgate', pontos_usados: r.pontos_usados, loja_nome: mapLojas[r.loja_id] || 'Loja Parceira' })),
      ...(cash || []).map(c => ({ ...c, tipo: 'cashback_ganho', loja_nome: mapLojas[c.loja_id] || 'Loja Parceira' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Agrupar cashbacks ganhos com as transações de mesma data/loja para não poluir o extrato
    const extratoFinal: any[] = [];
    comb.forEach(item => {
      if (item.tipo === 'ganho') {
        const cb = (cash || []).find(c =>
          c.loja_id === item.loja_id &&
          Math.abs(new Date(c.created_at).getTime() - new Date(item.created_at).getTime()) < 5000
        );
        extratoFinal.push({ ...item, cashback_valor: cb?.valor });
      } else if (item.tipo === 'resgate') {
        extratoFinal.push(item);
      }
    });

    setExtrato(extratoFinal);

    const total = (trans || []).reduce((a, t) => a + (t.pontos_gerados || 0), 0) + (bonus || []).reduce((a, b) => a + (b.pontos || 0), 0);
    const usados = (res || []).reduce((a, r) => a + (r.pontos_usados || 0), 0);
    setSaldo(total - usados);

    const cashbackDisponivel = (cash || []).filter(c => !c.usado).reduce((a, c) => a + Number(c.valor), 0);
    setCashback(cashbackDisponivel);

    const saldos: any[] = [];
    Object.keys(mapLojas).forEach(k => {
      const pTrans = (trans || []).filter(t => t.loja_id === k).reduce((a, t) => a + (t.pontos_gerados || 0), 0);
      const pBonus = (bonus || []).filter(b => b.loja_id === k).reduce((a, b) => a + (b.pontos || 0), 0);
      const pUsados = (res || []).filter(r => r.loja_id === k).reduce((a, r) => a + (r.pontos_usados || 0), 0);

      const s = (pTrans + pBonus) - pUsados;
      const c = (cash || []).filter(item => item.loja_id === k && !item.usado).reduce((a, item) => a + Number(item.valor), 0);

      if (s > 0 || c > 0) {
        saldos.push({ id: k, nome: mapLojas[k], pontos: s, cashback: c, saldo_total: s });
      }
    });
    setSaldoPorLoja(saldos);

    const { data: tk } = await supabase.from('intercambio_tokens').select('*').eq('cliente_cpf', cpfBusca).eq('status', 'pendente').maybeSingle();
    setTokenAtivo(tk);

    const { data: rec } = await supabase.from('recompensas').select('*').eq('ativo', true).order('custo_pontos');
    setRecompensas((rec || []).filter(r => r.loja_id === lid));
    setRecompensasRede((rec || []).map(r => ({ ...r, nomeLoja: mapLojas[r.loja_id] })));

    if (lid && tk && tk.status === 'pendente') {
      setMostraIntercambio(true);
      mostrarToast('🔄 Você tem pontos em outras lojas! Clique em REDE para importar.', 'sucesso');
    }
  };

  // 1. CARREGAR SALDOS POR LOJA
  const carregarSaldosPorLoja = async () => {
    try {
      setCarregandoSaldos(true);
      const clean = cpf.replace(/\D/g, '');
      const { data: lojas } = await supabase.from('lojas').select('id, nome');
      if (!lojas) return;
      const saldos = [];
      for (const loja of lojas) {
        const saldo = await calcularSaldoCliente(clean, loja.id);
        if (saldo > 0) {
          saldos.push({
            id: loja.id,
            nome: loja.nome,
            saldo_total: saldo,
            saldo_selecionado: selecaoPontos[loja.id] || 0
          });
        }
      }
      setSaldosPorLoja(saldos);
    } catch (error) {
      console.error('Erro ao carregar saldos:', error);
      mostrarToast('Erro ao carregar saldos.', 'erro');
    } finally {
      setCarregandoSaldos(false);
    }
  };

  // 2. ATUALIZAR SELEÇÃO DE PONTOS
  const atualizarSelecao = (lojaId: string, novoValor: number) => {
    const saldoLoja = saldoPorLoja.find(s => s.id === lojaId)?.saldo_total || 0;
    const valorLimitado = Math.min(Math.max(0, novoValor), saldoLoja);
    setSelecaoPontos((prev: any) => ({ ...prev, [lojaId]: valorLimitado }));
    const novasSelecoes = { ...selecaoPontos, [lojaId]: valorLimitado };
    const novasLojas = Object.keys(novasSelecoes).filter(id => novasSelecoes[id] > 0);
    setLojasSelecionadas(novasLojas);
    const total = Object.values(novasSelecoes).reduce((sum: number, val: any) => sum + Number(val), 0);
    setTotalSelecionado(total);
  };

  // 3. GERAR TOKEN COM SELEÇÃO
  const gerarTokenExchange = async () => {
    if (totalSelecionado === 0) {
      mostrarToast('Selecione pelo menos 1 ponto para importar.', 'erro');
      return;
    }
    const clean = cpf.replace(/\D/g, '');
    let token = gerarToken();
    let tentativas = 0;
    while (await tokenJaExiste(token) && tentativas < 10) { token = gerarToken(); tentativas++; }
    if (tentativas >= 10) { mostrarToast('Erro ao gerar token. Tente novamente.', 'erro'); return; }

    try {
      const { data: tk, error: tokenError } = await supabase.from('intercambio_tokens').insert([{
        token, cliente_cpf: clean, total_pontos_original: totalSelecionado, total_pontos_a_transferir: totalSelecionado, status: 'pendente',
        criado_em: new Date().toISOString(), expira_em: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      }]).select().single();
      if (tokenError) throw tokenError;

      const itens = lojasSelecionadas.map(lojaId => ({
        token_id: tk.id, cliente_cpf: clean, loja_origem_id: lojaId,
        pontos_selecionados: selecaoPontos[lojaId], saldo_disponivel_origem: saldosPorLoja.find(s => s.id === lojaId)?.saldo_total || 0, status: 'pendente'
      }));
      const { error: itensError } = await supabase.from('intercambio_itens').insert(itens);
      if (itensError) throw itensError;

      setMostrarExchange(false);
      setSelecaoPontos({});
      setLojasSelecionadas([]);
      setTotalSelecionado(0);
      setAccordionAberto(null);
      await carregarDados(clean);
      mostrarToast(`✅ Código gerado: ${token}`, 'sucesso');
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      mostrarToast('Erro ao gerar token.', 'erro');
    }
  };

  const resgatarBrinde = async (item: any) => {
    if (!loja_id || !cpf) return;
    const clean = cpf.replace(/\D/g, '');

    if (saldo < item.custo_pontos) {
      mostrarToast('Saldo insuficiente de Springs.', 'erro');
      return;
    }

    // Verificar limites da configuração
    if (configLoja?.limite_resgates_diario_cliente) {
      // Ajuste de Fuso: Pegar o início do dia no horário LOCAL (Brasil)
      const agora = new Date();
      const inicioDiaLocal = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const hoje = inicioDiaLocal.toISOString();

      const { count } = await supabase
        .from('resgates')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_cpf', clean)
        .eq('loja_id', uuidLojaReal || String(loja_id))
        .gte('created_at', hoje);

      if (count && count >= configLoja.limite_resgates_diario_cliente) {
        mostrarToast('Limite diário de resgates atingido nesta loja.', 'erro');
        return;
      }
    }

    setCarregando(true);
    try {
      const lid = uuidLojaReal || String(loja_id);

      // 1. Registrar o resgate (Consome os pontos)
      const { error: resError } = await supabase.from('resgates').insert([{
        cliente_cpf: clean,
        loja_id: lid,
        recompensa_id: item.id,
        pontos_usados: item.custo_pontos
      }]);
      if (resError) throw resError;

      // 2. Adicionar aos brindes pendentes para o lojista ver e "entregar"
      await supabase.from('brindes_pendentes').insert([{
        cliente_cpf: clean,
        loja_id: lid,
        nome_brinde: item.nome,
        resgatado: false
      }]);

      mostrarToast(`✅ Resgate de ${item.nome} solicitado!`, 'sucesso');
      Alert.alert('🎉 Resgate Confirmado!', `Você usou ${item.custo_pontos} SPG para resgatar ${item.nome}. Mostre esta tela ao atendente para receber seu prêmio.`);

      await carregarDados(clean, lid);
    } catch (error) {
      console.error('Erro ao resgatar:', error);
      mostrarToast('Erro ao processar resgate.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const carregarCaixaAtiva = async () => {
    try {
      const clean = cpf.replace(/\D/g, '');
      const caixa = await buscarCaixaAtivaCliente(clean);
      setCaixaAtiva(caixa);
    } catch (error) { console.error('Erro ao carregar caixa:', error); }
  };

  useEffect(() => { if (cpf) carregarCaixaAtiva(); }, [cpf]);


  const entrarFila = async () => {
    const clean = cpf.replace(/\D/g, '');
    if (!validarTelefone(clean)) {
      mostrarToast('Número inválido ou não aceito como telefone. 📱', 'erro');
      return;
    }

    setCarregando(true);
    try {
      if (loja_id) {
        // Fluxo Balcão: Check-in DIRETO (sem PIN) para aparecer no lojista

        // 1. Garantir que o cliente existe na tabela 'clientes' (Manual para evitar erro 42P10)
        const { data: exCli } = await supabase.from('clientes').select('cpf').eq('cpf', clean).maybeSingle();
        if (!exCli) {
          const { error: insCliErr } = await supabase.from('clientes').insert([{ cpf: clean }]);
          if (insCliErr && insCliErr.code !== '23505') { // 23505 = já existe (ignorar se outro processo criou)
            console.error('Erro ao criar cliente:', insCliErr);
            mostrarToast(`Erro ${insCliErr.code}: Falha ao registrar.`, 'erro');
            setCarregando(false);
            return;
          }
        }

        // 2. Garantir entrada na fila
        const lid_final = uuidLojaReal || String(loja_id);
        await supabase.from('checkins').delete().eq('cliente_cpf', clean).eq('loja_id', lid_final);
        const { error: insError } = await supabase.from('checkins').insert([{
          cliente_cpf: clean,
          loja_id: lid_final,
          status: 'aguardando'
        }]);

        if (insError) {
          console.error('Erro ao inserir checkin:', insError);
          // Mostramos o código do erro para depuração precisa
          const msg = `Erro ${insError.code}: Tente novamente. ❌`;
          mostrarToast(msg, 'erro');
          setCarregando(false);
          return;
        }
        await salvarStorage('cliente_cpf', clean);
        setStatus('aguardando');
      } else {
        // Fluxo Home: Pede PIN para segurança
        const { data } = await supabase.from('clientes').select('pin_hash').eq('cpf', clean).maybeSingle();
        if (!data?.pin_hash) {
          setEhPrimeiroCadastro(true);
          setPinModoValidar(false);
          setMostrarPinModal(true);
        } else {
          setPinModoValidar(true);
          setMostrarPinModal(true);
        }
      }
    } catch (err) {
      mostrarToast('Ocorreu um erro inesperado. ❌', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const validarPin = async () => {
    const pin = pinDigitado.join(''); if (pin.length < 4) return;
    setCarregando(true);
    const clean = cpf.replace(/\D/g, '');
    const { data } = await supabase.from('clientes').select('pin_hash').eq('cpf', clean).single();
    if (data && await bcrypt.compare(pin, data.pin_hash)) {
      setMostrarPinModal(false);
      setPinDigitado(['', '', '', '']);
      await salvarStorage('cliente_cpf', clean);
      if (loja_id) {
        await supabase.from('checkins').insert([{ cliente_cpf: clean, loja_id: String(loja_id), status: 'aguardando' }]);
        setStatus('aguardando');
      }
      else {
        await carregarDados(clean);
        setStatus('finalizado');
      }
    } else {
      mostrarToast('PIN incorreto', 'erro');
      setPinDigitado(['', '', '', '']);
    }
    setCarregando(false);
  };

  const criarNovoPin = async () => {
    const pin = pinDigitado.join(''); if (pin.length < 4) return;
    setCarregando(true);
    const hash = await bcrypt.hash(pin, 10);
    const clean = cpf.replace(/\D/g, '');
    await supabase.from('clientes').upsert({ cpf: clean, pin_hash: hash });
    setMostrarPinModal(false);
    setPinDigitado(['', '', '', '']);
    await salvarStorage('cliente_cpf', clean);
    if (loja_id) {
      await supabase.from('checkins').insert([{ cliente_cpf: clean, loja_id: String(loja_id), status: 'aguardando' }]);
      setStatus('aguardando');
    }
    else {
      await carregarDados(clean);
      setStatus('finalizado');
    }
    setCarregando(false);
  };

  const abrirRoleta = async () => {
    const lid = loja_id || configLoja?.loja_id;
    const [{ data: pNps }, { data: pRol }] = await Promise.all([
      supabase.from('perguntas_nps').select('*').eq('loja_id', lid),
      supabase.from('roleta_premios').select('*').eq('loja_id', lid)
    ]);
    setPerguntasNps(pNps || [{ id: 'd', pergunta: 'Nota para a loja?', tipo: 'estrelas' }]);
    setPremiosRoleta(pRol || []);
    setEtapaRoleta('nps'); setMostrarRoletaModal(true);
  };

  const girarRoleta = () => {
    if (rodando) return; setRodando(true);
    const premiosAtuais = premiosRoleta.length > 0 ? premiosRoleta : [{ nome: 'Tente Novamente', tipo: 'nada', probabilidade: 100 }];
    const total = premiosAtuais.reduce((a, p) => a + (p.probabilidade || 1), 0);
    let rand = Math.random() * total;
    let win = premiosAtuais[0];
    for (const p of premiosAtuais) { if (rand < (p.probabilidade || 1)) { win = p; break; } rand -= (p.probabilidade || 1); }
    if (!win) win = premiosAtuais[0];
    const sliceAngle = 360 / premiosAtuais.length;
    const target = 3600 + (360 - (premiosAtuais.indexOf(win) * sliceAngle + (sliceAngle / 2)));
    setRoletaTargetDeg(target);
    Animated.timing(rotateAnim, {
      toValue: target,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start(async () => {
      setPremioGanho(win); setRodando(false); setEtapaRoleta('resultado');
      const clean = cpf.replace(/\D/g, '');
      if (win?.tipo === 'pontos') await supabase.from('bonus_pendentes').insert([{ cliente_cpf: clean, loja_id: String(loja_id), pontos: win.valor }]);
      else if (win?.tipo === 'cashback') await supabase.from('cashbacks').insert([{ cliente_cpf: clean, loja_id: String(loja_id), valor: win.valor }]);
      else if (win?.tipo === 'brinde') await supabase.from('brindes_pendentes').insert([{ cliente_cpf: clean, loja_id: String(loja_id), nome_brinde: win.nome }]);
      carregarDados(clean);
    });
  };

  const formatarTelefone = (t: string) => {
    const c = t.replace(/\D/g, '');
    let f = c;
    if (c.length > 2 && c.length <= 7) f = `(${c.slice(0, 2)}) ${c.slice(2)}`;
    else if (c.length > 7) f = `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7, 11)}`;
    setCpf(f);
  };

  let content;
  if (status === 'idle') {
    content = (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 25, paddingTop: 60 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>✨ ✨ ✨</Text>
        </View>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 48, fontWeight: '900', color: c.neonVerde }}>PALM</Text>
          <Text style={{ fontSize: 48, fontWeight: '900', color: c.neonVerde }}>SPRINGS</Text>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 36 }}>✨ ✨ ✨</Text>
        </View>
        <TextInput 
          placeholder="(19) 99999-9999" 
          placeholderTextColor={c.subtexto} 
          value={cpf} 
          onChangeText={formatarTelefone} 
          keyboardType="phone-pad" 
          maxLength={15} 
          style={[styles.inputGigante, { backgroundColor: c.card, borderColor: c.borda, color: c.texto }]} 
        />

        <TouchableOpacity
          style={styles.buttonBig}
          onPress={entrarFila}
          activeOpacity={0.8}
          disabled={carregando}
        >
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonTextBig}>ACESSAR MINHA CARTEIRA</Text>}
        </TouchableOpacity>

        {!loja_id && (
          <Text style={{ color: c.subtexto, fontSize: 10, marginTop: 15, textAlign: 'center', fontWeight: 'bold', opacity: 0.7 }}>
            Acesso à carteira pessoal. Para entrar na fila de uma loja, escaneie o QR Code no balcão.
          </Text>
        )}
        
        <Text style={{ textAlign: 'center', color: c.subtexto, fontSize: 10, marginTop: 40 }}>v5.8.3-exchange</Text>
      </ScrollView>
    );
  } else if (status === 'aguardando') {
    content = (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <View style={{ height: 150, justifyContent: 'center', alignItems: 'center' }}>
          <PulsingAI color={c.neonVerde} />
        </View>
        <Text style={{ marginTop: 20, color: c.texto, fontWeight: '900', fontSize: 18 }}>Aguardando liberação...</Text>
        <Text style={{ marginTop: 10, color: c.subtexto, fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 }}>Acessando ⏳</Text>

        <TouchableOpacity
          onPress={() => { setStatus('idle'); salvarStorage('cliente_cpf', ''); }}
          style={{ marginTop: 60, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#ef444430' }}
        >
          <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 }}>CANCELAR CHECK-IN</Text>
        </TouchableOpacity>

        {tokenAtivo && (
          <View style={{ marginHorizontal: 20, marginTop: 40, width: '100%', paddingHorizontal: 20 }}>
            <View style={{ padding: 25, backgroundColor: '#8B5CF615', borderRadius: 28, borderWidth: 2, borderColor: '#8B5CF640', borderStyle: 'dashed' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <View>
                  <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>TOKEN DE IMPORTAÇÃO ATIVO:</Text>
                  <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: 2, marginTop: 4 }}>{tokenAtivo.token}</Text>
                </View>
                <View style={{ backgroundColor: '#8B5CF620', padding: 12, borderRadius: 15 }}>
                  <Text style={{ fontSize: 24 }}>📱</Text>
                </View>
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', lineHeight: 16 }}>
                Mostre este código ao lojista para importar seus <Text style={{ color: '#8B5CF6' }}>{tokenAtivo.total_pontos_a_transferir} SPG</Text> da rede.
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  } else {
    content = (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {/* HEADER PREMIUM */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: c.neonVerde, letterSpacing: -0.5 }}>PALM SPRINGS</Text>
            <Text style={{ fontSize: 10, fontWeight: '800', color: c.subtexto, letterSpacing: 1 }}>CLUBE DE VANTAGENS</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={toggleTheme} style={[styles.miniBtn, { backgroundColor: c.card, marginRight: 10 }]}>
              <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMostrarExtrato(true)} style={[styles.miniBtn, { backgroundColor: c.card, flexDirection: 'row', paddingHorizontal: 12, borderColor: '#F59E0B', borderWidth: 1.5 }]}>
              <Text style={{ fontSize: 14, marginRight: 5 }}>👁️</Text>
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#F59E0B' }}>EXTRATO</Text>
            </TouchableOpacity>
          </View>
        </View>

        {status === 'atendido' && (
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ marginHorizontal: 20, marginTop: 15, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <Text style={{ fontSize: 18 }}>🔔</Text>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>EM ATENDIMENTO NO BALCÃO</Text>
          </LinearGradient>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* CARDS DE SALDO 2x2 */}
          <View style={{ padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {/* Card Springs Rede */}
            <View style={[styles.cardPremium, { width: '48%', backgroundColor: c.card, borderColor: c.borda }]}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: c.subtexto, marginBottom: 8 }}>SPRINGS (REDE)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>✨</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: c.neonVerde }}>{saldo}</Text>
              </View>
            </View>

            {/* Card Cashback Rede */}
            <View style={[styles.cardPremium, { width: '48%', backgroundColor: c.card, borderColor: c.borda }]}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: c.subtexto, marginBottom: 8 }}>CASHBACK (REDE)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 5 }}>💰</Text>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: c.neonAmarelo }}>R$</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: c.neonAmarelo }}>{cashback.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Sub-cards Local */}
            <View style={[styles.cardLocal, { width: '48%', backgroundColor: c.card, borderColor: c.borda, marginTop: 8, padding: 18, height: 110, justifyContent: 'center' }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: c.subtexto, textAlign: 'left' }}>DISPONÍVEL NESTA LOJA</Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: c.neonVerde, marginTop: 8, textAlign: 'left' }}>
                {saldoPorLoja.find(s => s.id === loja_id)?.pontos || 0} spg
              </Text>
            </View>

            <View style={[styles.cardLocal, { width: '48%', backgroundColor: c.card, borderColor: c.borda, marginTop: 8, padding: 18, height: 110, justifyContent: 'center' }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: c.subtexto, textAlign: 'left' }}>DISPONÍVEL NESTA LOJA</Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: c.neonAmarelo, marginTop: 8, textAlign: 'left' }}>
                R$ {(saldoPorLoja.find(s => s.id === loja_id)?.cashback || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* CARD DE PIN ATIVO (BALCÃO) */}
          {tokenAtivo && (
            <View style={{ marginHorizontal: 20, marginTop: 10, padding: 25, backgroundColor: '#8B5CF615', borderRadius: 28, borderWidth: 2, borderColor: '#8B5CF640', borderStyle: 'dashed' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <View>
                  <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>TOKEN DE IMPORTAÇÃO ATIVO:</Text>
                  <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: 2, marginTop: 4 }}>{tokenAtivo.token}</Text>
                </View>
                <View style={{ backgroundColor: '#8B5CF620', padding: 12, borderRadius: 15 }}>
                  <Text style={{ fontSize: 24 }}>📱</Text>
                </View>
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', lineHeight: 16 }}>
                Mostre este código ao lojista para importar seus <Text style={{ color: '#8B5CF6' }}>{tokenAtivo.total_pontos_a_transferir} SPG</Text> da rede.
              </Text>
            </View>
          )}

          {/* BOTÃO EXCHANGE (NOVO) */}
          <TouchableOpacity
            onPress={() => { carregarSaldosPorLoja(); setMostrarExchange(true); }}
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              marginHorizontal: 20,
              paddingVertical: 18,
              borderRadius: 20,
              marginVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: c.borda,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 4
            }}
          >
            <Text style={{ fontSize: 24, marginRight: 12 }}>🤝</Text>
            <Text style={{ color: c.texto, fontWeight: '900', fontSize: 18, letterSpacing: 1 }}>EXCHANGE</Text>
          </TouchableOpacity>

          {/* SEÇÃO DE BRINDES DA LOJA */}
          {loja_id && recompensas.length > 0 && (
            <View style={{ paddingLeft: 20, marginVertical: 30 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                <Text style={{ fontSize: 22, marginRight: 8 }}>✨</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: c.texto }}>Brindes de {nomeLojaAtual || 'esta loja'}</Text>
              </View>
              <Text style={{ color: c.subtexto, fontSize: 13, marginBottom: 20, fontWeight: '600' }}>Exclusivos para você aproveitar agora</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recompensas.map((item, idx) => {
                  const rawImg = item.imagem || item.foto || item.imagem_url;
                  const hasImg = rawImg && String(rawImg).startsWith('http');
                  return (
                    <View key={idx} style={[styles.brindeCardGrande, { backgroundColor: c.card, borderColor: c.borda }]}>
                      <View style={{ width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', backgroundColor: '#000' }}>
                        {hasImg ? (
                          <Image
                            source={{ uri: rawImg }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontSize: 60 }}>🎁</Text>
                          </View>
                        )}
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFill} />

                        <View style={{ position: 'absolute', bottom: 85, left: 20, right: 20 }}>
                          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22, marginBottom: 4 }}>{item.nome}</Text>
                          <Text style={{ color: c.neonVerde, fontWeight: '800', fontSize: 16 }}>{item.custo_pontos} SPG</Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => resgatarBrinde(item)}
                          style={[styles.btnResgateOverlay, { backgroundColor: saldo >= item.custo_pontos ? c.neonVerde : '#ffffff30' }]}
                        >
                          <Text style={{ color: saldo >= item.custo_pontos ? '#fff' : '#ccc', fontWeight: '900', fontSize: 13 }}>
                            {saldo >= item.custo_pontos ? 'RESGATAR AGORA' : 'SEM SALDO'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ROLETA (AGORA ABAIXO DOS BRINDES DA LOJA) */}
          {loja_id && (
            <View style={{ marginVertical: 40 }}>
              <RoletaCTA 
          onPress={abrirRoleta} 
          isDark={isDark} 
          c={c} 
          premiosRoleta={premiosRoleta} 
        />
            </View>
          )}

          {/* CARROSSEL DE BANNERS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, marginVertical: 25 }}>
            <LinearGradient colors={['#0EA5E9', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 25, width: 310, height: 190, justifyContent: 'flex-end', marginRight: 15 }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>A Magia Continua ✨</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>Acumule Springs hoje e troque por vantagens.</Text>
            </LinearGradient>

            <LinearGradient colors={['#475569', '#1E293B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 25, width: 310, height: 190, justifyContent: 'flex-end' }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>Novidades da Rede</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>Ofertas exclusivas para você.</Text>
            </LinearGradient>
          </ScrollView>

          {/* SEÇÃO DE BRINDES DA REDE */}
          <View style={{ paddingLeft: 20, marginVertical: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Text style={{ fontSize: 22, marginRight: 8 }}>🌐</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: c.texto }}>Brindes da Rede</Text>
            </View>
            <Text style={{ color: c.subtexto, fontSize: 13, marginBottom: 20, fontWeight: '600' }}>Troque seus Springs em qualquer loja parceira</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recompensasRede.map((item, idx) => {
                const rawImg = item.imagem || item.foto || item.imagem_url;
                const hasImg = rawImg && String(rawImg).startsWith('http');
                return (
                  <View key={idx} style={[styles.brindeCardGrande, { backgroundColor: c.card, borderColor: c.borda }]}>
                    <View style={{ width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', backgroundColor: '#000' }}>
                      {hasImg ? (
                        <Image
                          source={{ uri: rawImg }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 60 }}>🎁</Text>
                        </View>
                      )}
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFill} />

                      <View style={{ position: 'absolute', bottom: 85, left: 20, right: 20 }}>
                        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22, marginBottom: 4 }}>{item.nome}</Text>
                        <Text style={{ color: c.neonVerde, fontWeight: '800', fontSize: 16 }}>{item.custo_pontos} SPG</Text>
                        {item.nomeLoja && <Text style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>📍 {item.nomeLoja}</Text>}
                      </View>

                      <View style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff30' }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>REDE</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>



          {/* GRID DE AÇÕES */}
          <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <TouchableOpacity style={[styles.actionBox, { backgroundColor: c.card, borderColor: c.borda }]}>
              <View style={{ width: 40, height: 40, backgroundColor: '#0284C720', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 20 }}>📘</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '900', color: c.texto, textAlign: 'center' }}>Saiba como funciona</Text>
              <Text style={{ fontSize: 9, color: c.subtexto, textAlign: 'center', marginTop: 4 }}>Entenda o programa de benefícios</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBox, { backgroundColor: c.card, borderColor: c.borda }]}>
              <View style={{ width: 40, height: 40, backgroundColor: '#10B98120', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 20 }}>🎁</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#10B981', textAlign: 'center' }}>Indique e Ganhe</Text>
              <Text style={{ fontSize: 9, color: c.subtexto, textAlign: 'center', marginTop: 4 }}>Convide amigos e ganhe Springs</Text>
            </TouchableOpacity>
          </View>

          {/* BOTÃO SAIR */}
          <TouchableOpacity
            onPress={() => { setStatus('idle'); salvarStorage('cliente_cpf', ''); }}
            style={{ marginHorizontal: 20, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ef444450', alignItems: 'center' }}
          >
            <Text style={{ color: '#ef4444', fontWeight: '900', fontSize: 12, letterSpacing: 1 }}>🚪 SAIR DA CONTA</Text>
          </TouchableOpacity>

          <Text style={{ textAlign: 'center', color: c.subtexto, fontSize: 10, marginTop: 20 }}>Versão 5.8.4-exchange</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {content}

      <Modal visible={mostrarExchange} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%', borderWidth: 1, borderColor: c.borda }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: c.neonVerde }}>🔄 IMPORTAR PONTOS</Text>
              <TouchableOpacity onPress={() => setMostrarExchange(false)}><Text style={{ fontSize: 24, color: '#ef4444' }}>✕</Text></TouchableOpacity>
            </View>
            <Text style={{ color: c.subtexto, fontSize: 12, marginBottom: 15 }}>Selecione quanto você quer trazer de cada loja:</Text>
            <ScrollView nestedScrollEnabled style={{ marginBottom: 20, maxHeight: 400 }}>
              {saldoPorLoja.filter(s => s.id !== loja_id).length === 0 ? <Text style={{ color: c.subtexto, textAlign: 'center', marginVertical: 20 }}>Você não tem pontos em outras lojas.</Text> : (
                saldoPorLoja.filter(s => s.id !== loja_id).map((loja) => (
                  <View key={loja.id} style={{ marginBottom: 12 }}>
                    <TouchableOpacity onPress={() => setAccordionAberto(accordionAberto === loja.id ? null : loja.id)} style={{ backgroundColor: c.bg, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: lojasSelecionadas.includes(loja.id) ? c.neonVerde : c.borda }}>
                      <View><Text style={{ color: c.texto, fontWeight: '700', fontSize: 14 }}>{loja.nome}</Text><Text style={{ color: c.neonVerde, fontWeight: '900', fontSize: 16, marginTop: 4 }}>{loja.saldo_total} SPG</Text></View>
                      <Text style={{ fontSize: 24, color: c.subtexto }}>{accordionAberto === loja.id ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    {accordionAberto === loja.id && (
                      <View style={{ backgroundColor: c.bg, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 14, borderWidth: 1, borderTopWidth: 0, borderColor: c.neonVerde, marginBottom: 10 }}>
                        <Text style={{ color: c.subtexto, fontSize: 11, fontWeight: '600', marginBottom: 8 }}>Quanto você quer trazer?</Text>
                        <TextInput value={selecaoPontos[loja.id]?.toString() || ''} onChangeText={(text) => atualizarSelecao(loja.id, parseInt(text) || 0)} placeholder="0" placeholderTextColor={c.subtexto} keyboardType="numeric" style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.borda, borderRadius: 8, padding: 12, color: c.texto, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }} />
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          {[0.25, 0.5, 0.75, 1.0].map((percentual) => {
                            const valor = Math.floor(loja.saldo_total * percentual);
                            const isSelected = selecaoPontos[loja.id] === valor;
                            return (
                              <TouchableOpacity key={percentual} onPress={() => atualizarSelecao(loja.id, valor)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: isSelected ? c.neonVerde : c.card, borderWidth: 1, borderColor: isSelected ? c.neonVerde : c.borda }}>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? '#0f172a' : c.texto }}>{Math.round(percentual * 100)}% ({valor})</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        {selecaoPontos[loja.id] > 0 && <View style={{ backgroundColor: `${c.neonVerde}20`, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: c.neonVerde }}><Text style={{ color: c.neonVerde, fontWeight: '700', fontSize: 12 }}>✓ Selecionado: {selecaoPontos[loja.id]} SPG</Text></View>}
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <View style={{ backgroundColor: `${c.neonVerde}20`, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: c.neonVerde }}>
              <Text style={{ color: c.subtexto, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>TOTAL A IMPORTAR</Text>
              <Text style={{ color: c.neonVerde, fontSize: 32, fontWeight: '900' }}>{totalSelecionado} SPG</Text>
            </View>
            <TouchableOpacity onPress={gerarTokenExchange} disabled={totalSelecionado === 0} style={{ backgroundColor: totalSelecionado > 0 ? c.neonVerde : c.borda, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: totalSelecionado > 0 ? '#0f172a' : c.subtexto, fontWeight: '900', fontSize: 16 }}>📱 GERAR CÓDIGO {totalSelecionado > 0 ? '✓' : '(SELECIONE)'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={mostrarRoletaModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: c.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 }}>
            {etapaRoleta === 'nps' && (
              <View>
                <Text style={{ color: c.texto, fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>O que achou de nós?</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 30 }}>
                  {[1, 2, 3, 4, 5].map(i => <TouchableOpacity key={i} onPress={() => setEtapaRoleta('girando')}><Text style={{ fontSize: 40 }}>⭐</Text></TouchableOpacity>)}
                </View>
              </View>
            )}
            {etapaRoleta === 'girando' && (
              <View style={{ alignItems: 'center' }}>
                <View style={{ zIndex: 10, marginBottom: -10 }}>
                  <Svg width={40} height={40} viewBox="0 0 40 40">
                    <Path d="M20 40 L40 5 L0 5 Z" fill="#1f8f7a" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                  </Svg>
                </View>
                <Animated.View style={{
                  transform: [{
                    rotate: rodando
                      ? rotateAnim.interpolate({ inputRange: [0, 36000], outputRange: ['0deg', '36000deg'] })
                      : idleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
                  }]
                }}>
                  <WheelSVG prizes={premiosRoleta.length > 0 ? premiosRoleta : [{ nome: 'Carregando...', tipo: 'nada' }]} size={320} isDark={isDark} />
                </Animated.View>
                <TouchableOpacity 
                  onPress={girarRoleta} 
                  disabled={rodando} 
                  style={{ 
                    backgroundColor: rodando ? '#9ca3af' : c.neonVerde, 
                    paddingHorizontal: 50, 
                    paddingVertical: 18, 
                    borderRadius: 50, 
                    marginTop: 35, 
                    elevation: 8, 
                    shadowColor: c.neonVerde, 
                    shadowOpacity: 0.4, 
                    shadowRadius: 10 
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 1 }}>
                    {rodando ? 'SORTEANDO...' : 'GIRAR AGORA 🔄'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {etapaRoleta === 'resultado' && (
              <View style={{ alignItems: 'center', padding: 20 }}>
                {(() => {
                  const nome = (premioGanho?.nome || '').toLowerCase();
                  const isNada = premioGanho?.tipo === 'nada' || nome.includes('tente') || nome.includes('não ganhou') || nome.includes('nao ganhou');
                  
                  return (
                    <>
                      <LinearGradient 
                        colors={isNada ? ['#475569', '#1e293b'] : ['#f59e0b', '#d97706']} 
                        style={{ width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 10 }}
                      >
                        <Text style={{ fontSize: 50 }}>{isNada ? '🎡' : '🎁'}</Text>
                      </LinearGradient>
                      
                      <Text style={{ color: c.subtexto, fontSize: 14, fontWeight: '800', letterSpacing: 1 }}>{isNada ? 'QUASE LÁ!' : 'PARABÉNS!'}</Text>
                      <Text style={{ color: c.texto, fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 10, lineHeight: 32 }}>
                        {isNada ? 'Não foi dessa vez...' : `Você ganhou:\n${premioGanho?.nome}`}
                      </Text>
                      
                      <Text style={{ color: c.subtexto, fontSize: 12, textAlign: 'center', marginTop: 15, opacity: 0.8 }}>
                        {isNada ? 'Mas não desista! Tente novamente na sua próxima compra. ✨' : 'O prêmio já foi adicionado à sua conta e pode ser resgatado no balcão.'}
                      </Text>
                    </>
                  );
                })()}

                <TouchableOpacity 
                  onPress={() => setMostrarRoletaModal(false)} 
                  style={{ marginTop: 40, backgroundColor: c.neonVerde, paddingHorizontal: 60, paddingVertical: 15, borderRadius: 20, elevation: 5 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>FECHAR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>


      {/* 🎡 MESA ROLETA MODAL (QUANDO SCANNEIA QR MESA) */}
      <Modal visible={modoMesaAtivo} animationType="slide">
        <View style={{ flex: 1, backgroundColor: c.bg }}>
           <MesaRoleta />
           <TouchableOpacity 
             onPress={() => setModoMesaAtivo(false)} 
             style={{ position: 'absolute', top: 50, right: 20, zIndex: 1000000, backgroundColor: 'rgba(0,0,0,0.5)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }}
           >
             <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>✕</Text>
           </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={mostrarPinModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: c.card, padding: 30, borderRadius: 24, width: 300 }}>
            <Text style={{ color: c.texto, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>{pinModoValidar ? 'Digite seu PIN' : 'Crie seu PIN'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 30 }}>
              {[0, 1, 2, 3].map(i => (
                <TextInput
                  key={i}
                  ref={r => {
                    pinInputRefs.current[i] = r;
                  }}
                  value={pinDigitado[i]}
                  onChangeText={v => {
                    const n = [...pinDigitado];
                    const cleanV = v.replace(/\D/g, '');
                    n[i] = cleanV;
                    setPinDigitado(n);
                    if (cleanV && i < 3) {
                      pinInputRefs.current[i + 1]?.focus();
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !pinDigitado[i] && i > 0) {
                      pinInputRefs.current[i - 1]?.focus();
                    }
                  }}
                  style={{
                    width: 50,
                    height: 60,
                    backgroundColor: c.bg,
                    color: c.texto,
                    textAlign: 'center',
                    fontSize: 24,
                    borderRadius: 10,
                    borderWidth: pinDigitado[i] ? 2 : 1,
                    borderColor: pinDigitado[i] ? c.neonVerde : c.borda
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  secureTextEntry
                />
              ))}
            </View>
            <TouchableOpacity onPress={pinModoValidar ? validarPin : criarNovoPin} style={{ backgroundColor: c.neonVerde, padding: 15, borderRadius: 15 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>CONFIRMAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={mostrarExtrato} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '85%', borderWidth: 1, borderColor: c.borda }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
              <View>
                <Text style={{ fontSize: 24, fontWeight: '900', color: c.texto }}>Histórico de Atividade</Text>
                <Text style={{ fontSize: 12, color: c.subtexto }}>Seu rastro de vantagens</Text>
              </View>
              <TouchableOpacity onPress={() => setMostrarExtrato(false)} style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, color: c.texto }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(extrato || []).length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 100 }}>
                  <Text style={{ fontSize: 50 }}>📦</Text>
                  <Text style={{ color: c.subtexto, marginTop: 10 }}>Nenhuma atividade ainda.</Text>
                </View>
              ) : (
                (extrato || []).map((t, idx) => {
                  const isResgate = t.tipo === 'resgate';
                  const icon = isResgate ? '🎁' : (t.tipo_origem === 'roleta' || t.premio_nome ? '🎡' : '🛍️');
                  const iconBg = isResgate ? '#fee2e2' : (isDark ? '#0f172a' : '#ecfdf5');

                  return (
                    <View key={idx} style={{ backgroundColor: isDark ? '#1e293b' : '#fff', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: c.borda, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: iconBg, justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                        <Text style={{ fontSize: 24 }}>{icon}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.texto, fontWeight: '900', fontSize: 15 }}>{isResgate ? (t.premio_nome || 'Resgate Efetuado') : t.loja_nome}</Text>

                        <Text style={{ color: c.subtexto, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                          {new Date(t.created_at).toLocaleDateString('pt-BR')} {new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {!isResgate && t.valor ? ` • R$ ${Number(t.valor).toFixed(2)}` : ''}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                          <Text style={{ color: isResgate ? '#ef4444' : c.neonVerde, fontWeight: '900', fontSize: 12 }}>
                            {isResgate ? `-${t.pontos_usados}` : `+${t.pontos_gerados}`} SPRINGS
                          </Text>
                          {t.cashback_valor ? (
                            <Text style={{ color: c.neonAmarelo, fontWeight: '900', fontSize: 12 }}>
                              • + R$ {Number(t.cashback_valor).toFixed(2)} CB
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {
        toast.visible && (
          <Animated.View style={{
            position: 'absolute', top: toastAnim, left: 20, right: 20,
            backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444',
            padding: 16, borderRadius: 12, elevation: 10, zIndex: 9999,
            flexDirection: 'row', alignItems: 'center'
          }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, flex: 1 }}>{toast.message}</Text>
          </Animated.View>
        )
      }
    </View >

  );
}

const styles = StyleSheet.create({
  inputGigante: { padding: 22, borderRadius: 20, fontSize: 32, fontWeight: '900', textAlign: 'center', borderWidth: 2, marginBottom: 20 },
  buttonBig: { padding: 22, borderRadius: 20, alignItems: 'center', backgroundColor: '#10b981' },
  buttonTextBig: { color: '#fff', fontWeight: '900', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  miniBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPremium: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 10,
  },
  cardLocal: { padding: 12, borderRadius: 16, borderWidth: 1 },
  brindeCardGrande: { width: 280, height: 480, marginRight: 20, borderRadius: 28, borderWidth: 1, padding: 0, elevation: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, overflow: 'hidden' },
  btnResgateOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, padding: 18, borderRadius: 20, alignItems: 'center' },
  actionBox: { width: '48%', padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center' }
});
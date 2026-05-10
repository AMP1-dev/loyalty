import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated, Easing,
  Modal,
  Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, useColorScheme,
  View
} from 'react-native';
import Svg, { Circle, Defs, FeComponentTransfer, FeFuncA, FeGaussianBlur, FeMerge, FeMergeNode, FeOffset, Filter, G, Path, RadialGradient, Stop, LinearGradient as SvgLinearGradient, Text as SvgText } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import {
  calcularSaldoCliente,
  gerarToken,
  tokenJaExiste,
  tokenExpirou,
  aplicarTaxa,
  buscarCaixaAtivaCliente,
  carregarHistoricoExchange
} from '@/lib/exchange';
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

  const textColor = isDark ? '#e2e8f0' : '#334155';

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
        <SvgLinearGradient id="gradBege" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={isDark ? "#1e293b" : "#fdf8ec"} />
          <Stop offset="100%" stopColor={isDark ? "#0f172a" : "#f0e5d8"} />
        </SvgLinearGradient>
        <SvgLinearGradient id="gradVerde" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={isDark ? "#134e4a" : "#d1fae5"} />
          <Stop offset="100%" stopColor={isDark ? "#042f2e" : "#a7f3d0"} />
        </SvgLinearGradient>
        <RadialGradient id="gCenter" cx="50%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <Stop offset="50%" stopColor="#d1d5db" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#6b7280" stopOpacity="1" />
        </RadialGradient>
        <Filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
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

      <G filter="url(#dropShadow)">
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
              <Path
                d={buildSlicePath(i)}
                fill={i % 2 === 0 ? 'url(#gradBege)' : 'url(#gradVerde)'}
                stroke={isDark ? '#475569' : '#94a3b8'}
                strokeWidth="1.2"
              />
              <G transform={`rotate(${rotation} ${x} ${y})`}>
                <SvgText x={x} y={y - 12}
                  fill={iconColor} fontSize={size === 240 ? "8" : "11"}
                  fontWeight="900" textAnchor="middle" letterSpacing="0">
                  {icon}
                </SvgText>
                <SvgText x={x} y={y - 1}
                  fill={textColor} fontSize={size === 240 ? "5" : "7.5"}
                  fontWeight="700" textAnchor="middle" letterSpacing="0">
                  {lines[0]}
                </SvgText>
                {lines[1] && (
                  <SvgText x={x} y={y + 9}
                    fill={textColor} fontSize={size === 240 ? "5.5" : "8.5"}
                    fontWeight="bold" textAnchor="middle" letterSpacing="0">
                    {lines[1]}
                  </SvgText>
                )}
              </G>
            </G>
          );
        })}
        <Circle cx={CENTER} cy={CENTER} r={size * 0.075} fill="url(#gCenter)" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1.5" />
      </G>
    </Svg>
  );
}

// ─── Componente CTA da Roleta ─────────────────────────────────────────────────
function RoletaCTA({ onPress, isDark, c }: any) {
  const idleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const WHEEL_SIZE = 240;
  const prizesDisplay = [
    { nome: '10 SPG', tipo: 'pontos' },
    { nome: 'R$ 2,00\nCashback', tipo: 'cashback' },
    { nome: 'Café\nGrátis', tipo: 'brinde' },
    { nome: 'R$ 5,00\nCashback', tipo: 'cashback' },
    { nome: '5 SPG', tipo: 'pontos' },
    { nome: 'Brinde\nSurpresa', tipo: 'brinde' },
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
      <View style={{ zIndex: 10, marginBottom: -12 }}>
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <Path d="M16 28 L4 6 L28 6 Z" fill="#10b981" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={{
        width: WHEEL_SIZE + 16, height: WHEEL_SIZE + 16, borderRadius: (WHEEL_SIZE + 16) / 2,
        backgroundColor: isDark ? '#334155' : '#94a3b8', justifyContent: 'center', alignItems: 'center', elevation: 15,
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
  const loja_id = params?.loja_id;

  // 🔴 CORRIGIDO: Só mostra MesaRoleta quando EXPLICITAMENTE é mesa
  if (params?.mesa === 'true' || (typeof window !== 'undefined' && window.location.pathname.includes('/mesa'))) {
    return <MesaRoleta />;
  }

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

  const [mostraIntercambio, setMostraIntercambio] = useState(false);
  const [tokenAtivo, setTokenAtivo] = useState<any>(null);
  const [saldoPorLoja, setSaldoPorLoja] = useState<any[]>([]);
  const [recompensas, setRecompensas] = useState<any[]>([]);
  const [recompensasRede, setRecompensasRede] = useState<any[]>([]);
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
      const APP_VERSION = 'v5.8.0-exchange';
      const savedVersion = await carregarStorage('@app_version');
      if (savedVersion !== APP_VERSION) {
        if (typeof window !== 'undefined') localStorage.clear();
        await salvarStorage('@app_version', APP_VERSION);
      }
      const saved = await carregarStorage('cliente_cpf');
      if (saved) {
        setCpf(saved);
        if (loja_id) {
          // Garante que o check-in existe no banco ao ler o QR
          await supabase.from('checkins').upsert(
            { cliente_cpf: saved, loja_id: String(loja_id), status: 'aguardando' },
            { onConflict: 'cliente_cpf,loja_id' }
          );
          setStatus('aguardando');
        } else {
          await carregarDados(saved);
          setStatus('finalizado');
        }
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
      const { data } = await supabase.from('checkins').select('status').eq('cliente_cpf', clean).single();
      if (data?.status === 'atendido') { clearInterval(interval); await carregarDados(clean, String(loja_id)); setStatus('finalizado'); }
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  const carregarDados = async (cpfBusca: string, lojaIdEfetivo?: string) => {
    const { data: lojas } = await supabase.from('lojas').select('id, nome');
    const { data: configs } = await supabase.from('configuracoes_loja').select('*');
    const mapLojas: any = {}; lojas?.forEach(l => mapLojas[l.id] = l.nome);
    const lid = lojaIdEfetivo || String(loja_id);

    if (lid && lid !== 'undefined') { setNomeLojaAtual(mapLojas[lid] || 'Loja Parceira'); setConfigLoja(configs?.find(cf => cf.loja_id === lid)); }
    else setNomeLojaAtual('Minha Carteira PALM');

    const [{ data: trans }, { data: res }, { data: cash }, { data: bonus }] = await Promise.all([
      supabase.from('transacoes').select('*').eq('cliente_cpf', cpfBusca),
      supabase.from('resgates').select('*').eq('cliente_cpf', cpfBusca),
      supabase.from('cashbacks').select('*').eq('cliente_cpf', cpfBusca),
      supabase.from('bonus_pendentes').select('*').eq('cliente_cpf', cpfBusca).eq('usado', false)
    ]);

    const total = (trans || []).reduce((a, t) => a + (t.pontos_gerados || 0), 0) + (bonus || []).reduce((a, b) => a + b.pontos, 0);
    const usados = (res || []).reduce((a, r) => a + r.pontos_usados, 0);
    setSaldo(total - usados);
    setCashback((cash || []).filter(c => !c.usado).reduce((a, c) => a + Number(c.valor), 0));

    const saldos: any[] = [];
    Object.keys(mapLojas).forEach(k => {
      const s = (trans || []).filter(t => t.loja_id === k).reduce((a, t) => a + (t.pontos_gerados || 0), 0) - (res || []).filter(r => r.loja_id === k).reduce((a, r) => a + r.pontos_usados, 0);
      if (s > 0) saldos.push({ id: k, nome: mapLojas[k], pontos: s });
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
    const saldoLoja = saldosPorLoja.find(s => s.id === lojaId)?.saldo_total || 0;
    const valorLimitado = Math.min(Math.max(0, novoValor), saldoLoja);
    setSelecaoPontos((prev: any) => ({ ...prev, [lojaId]: valorLimitado }));
    const novasSelecoes = { ...selecaoPontos, [lojaId]: valorLimitado };
    const novasLojas = Object.keys(novasSelecoes).filter(id => novasSelecoes[id] > 0);
    setLojasSelecionadas(novasLojas);
    const total = Object.values(novasSelecoes).reduce((sum: number, val: any) => sum + val, 0);
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

      mostrarToast(`✅ Código gerado: ${token}`, 'sucesso');
      Alert.alert('🎉 Código de Importação Gerado!', `Código: ${token}\n\nLeve este código ao caixa da loja para importar ${totalSelecionado} SPG`,
        [{ text: 'OK', onPress: () => { setMostrarExchange(false); setSelecaoPontos({}); setLojasSelecionadas([]); setTotalSelecionado(0); setAccordionAberto(null); } }]
      );
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      mostrarToast('Erro ao gerar token.', 'erro');
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
    if (clean.length < 10 || clean.length > 11) {
      mostrarToast('Número inválido. Use (DD) 99999-9999 📱', 'erro');
      return;
    }

    const ddd = clean.substring(0, 2);
    if (!DDD_VALIDOS.includes(ddd)) {
      mostrarToast(`O DDD ${ddd} não é reconhecido. Verifique o número. ⚠️`, 'erro');
      return;
    }

    setCarregando(true);
    try {
      const { data, error } = await supabase.from('clientes').select('pin_hash').eq('cpf', clean).maybeSingle();

      if (error) {
        mostrarToast('Erro de conexão. Tente novamente. 🌐', 'erro');
        setCarregando(false);
        return;
      }

      if (!data?.pin_hash) {
        setEhPrimeiroCadastro(true);
        setPinModoValidar(false);
        setMostrarPinModal(true);
      } else {
        setPinModoValidar(true);
        setMostrarPinModal(true);
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
    const total = premiosRoleta.reduce((a, p) => a + p.probabilidade, 0);
    let rand = Math.random() * total;
    let win = premiosRoleta[0];
    for (const p of premiosRoleta) { if (rand < p.probabilidade) { win = p; break; } rand -= p.probabilidade; }
    const target = 3600 + (360 - (premiosRoleta.indexOf(win) * (360 / premiosRoleta.length)));
    setRoletaTargetDeg(target);
    Animated.timing(rotateAnim, { toValue: 1, duration: 5000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(async () => {
      setPremioGanho(win); setRodando(false); setEtapaRoleta('resultado');
      const clean = cpf.replace(/\D/g, '');
      if (win.tipo === 'pontos') await supabase.from('bonus_pendentes').insert([{ cliente_cpf: clean, loja_id: String(loja_id), pontos: win.valor }]);
      else if (win.tipo === 'cashback') await supabase.from('cashbacks').insert([{ cliente_cpf: clean, loja_id: String(loja_id), valor: win.valor }]);
      else if (win.tipo === 'brinde') await supabase.from('brindes_pendentes').insert([{ cliente_cpf: clean, loja_id: String(loja_id), nome_brinde: win.nome }]);
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
        <TextInput placeholder="(19) 99999-9999" placeholderTextColor={c.subtexto} value={cpf} onChangeText={formatarTelefone} keyboardType="phone-pad" maxLength={15} style={[styles.inputGigante, { backgroundColor: c.card, borderColor: c.borda, color: c.texto }]} />
        <TouchableOpacity style={styles.buttonBig} onPress={entrarFila} activeOpacity={0.8} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonTextBig}>ACESSAR MINHA CARTEIRA</Text>}
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', color: c.subtexto, fontSize: 10, marginTop: 40 }}>v5.8.0-exchange</Text>
      </ScrollView>
    );
  } else if (status === 'aguardando') {
    content = (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.neonVerde} />
        <Text style={{ marginTop: 20, color: c.texto, fontWeight: 'bold' }}>Aguardando liberação...</Text>
        <Text style={{ marginTop: 10, color: c.subtexto, fontSize: 12, textAlign: 'center', paddingHorizontal: 40 }}>O atendente já foi notificado e logo irá liberar seu acesso. ⏳</Text>

        <TouchableOpacity
          onPress={() => { setStatus('idle'); salvarStorage('cliente_cpf', ''); }}
          style={{ marginTop: 40, padding: 10 }}
        >
          <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>CANCELAR CHECK-IN</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    content = (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: c.neonVerde }}>PALM SPRINGS</Text>
            <TouchableOpacity onPress={() => setStatus('idle')}><Text style={{ color: '#ef4444' }}>SAIR</Text></TouchableOpacity>
          </View>

          <View style={{ backgroundColor: c.card, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: c.borda, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: c.subtexto, fontSize: 10 }}>SALDO TOTAL</Text>
                <Text style={{ color: c.neonVerde, fontSize: 32, fontWeight: '900' }}>{saldo} SPG</Text>
              </View>
              <TouchableOpacity onPress={() => setMostraIntercambio(true)} style={{ padding: 10, backgroundColor: c.roxo, borderRadius: 12 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>REDE 🔄</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: c.neonAmarelo, fontSize: 18, fontWeight: 'bold', marginTop: 10 }}>💰 R$ {cashback.toFixed(2)}</Text>
          </View>

          {caixaAtiva && (
            <View style={{ backgroundColor: `${c.neonVerde}20`, borderRadius: 12, padding: 16, marginVertical: 15, borderWidth: 2, borderColor: c.neonVerde }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: c.neonVerde, fontWeight: '900', fontSize: 16 }}>💰 PONTOS EM IMPORTAÇÃO</Text>
                <Text style={{ color: c.neonVerde, fontSize: 12, fontWeight: '600' }}>{Math.round((new Date(caixaAtiva.expira_em).getTime() - new Date().getTime()) / 60000)}min</Text>
              </View>
              <Text style={{ color: c.texto, fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>{caixaAtiva.pontos_disponiveis} SPG disponíveis</Text>
              <Text style={{ color: c.subtexto, fontSize: 11, marginBottom: 12 }}>Taxa aplicada: {caixaAtiva.taxa_em_pontos} SPG</Text>
              <View style={{ height: 1, backgroundColor: c.borda, marginBottom: 12 }} />
              <Text style={{ color: c.subtexto, fontSize: 10 }}>ℹ️ Use estes pontos para resgatar brindes. Válido por 24h após validação do caixa.</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => { carregarSaldosPorLoja(); setMostrarExchange(true); }}
            style={{ backgroundColor: c.roxo, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, marginVertical: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>🔄 IMPORTAR PONTOS DE OUTRAS LOJAS</Text>
          </TouchableOpacity>

          {loja_id && <RoletaCTA onPress={abrirRoleta} isDark={isDark} c={c} />}

          <Text style={{ color: c.texto, fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 15 }}>🎁 Brindes Disponíveis</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recompensas.map(r => (
              <View key={r.id} style={{ width: 200, backgroundColor: c.card, borderRadius: 20, marginRight: 15, padding: 15, borderWidth: 1, borderColor: c.borda }}>
                <Text style={{ color: c.texto, fontWeight: 'bold' }}>{r.nome}</Text>
                <Text style={{ color: c.neonVerde }}>{r.custo_pontos} SPG</Text>
                <TouchableOpacity style={{ backgroundColor: saldo >= r.custo_pontos ? c.neonVerde : c.borda, padding: 10, borderRadius: 10, marginTop: 10 }}>
                  <Text style={{ color: '#fff', textAlign: 'center' }}>RESGATAR</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {content}
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%', borderWidth: 1, borderColor: c.borda }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: c.neonVerde }}>🔄 IMPORTAR PONTOS</Text>
              <TouchableOpacity onPress={() => setMostrarExchange(false)}><Text style={{ fontSize: 24, color: '#ef4444' }}>✕</Text></TouchableOpacity>
            </View>
            <Text style={{ color: c.subtexto, fontSize: 12, marginBottom: 15 }}>Selecione quanto você quer trazer de cada loja:</Text>
            <ScrollView nestedScrollEnabled style={{ marginBottom: 20, maxHeight: 400 }}>
              {carregandoSaldos ? <ActivityIndicator color={c.neonVerde} size="large" style={{ marginVertical: 20 }} /> : saldosPorLoja.length === 0 ? <Text style={{ color: c.subtexto, textAlign: 'center', marginVertical: 20 }}>Você não tem pontos em outras lojas.</Text> : (
                saldosPorLoja.map((loja) => (
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
                <Animated.View style={{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${roletaTargetDeg}deg`] }) }] }}>
                  <WheelSVG prizes={premiosRoleta} size={250} isDark={isDark} />
                </Animated.View>
                <TouchableOpacity onPress={girarRoleta} disabled={rodando} style={{ backgroundColor: c.neonVerde, padding: 20, borderRadius: 50, marginTop: 30 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{rodando ? 'GIRANDO...' : 'GIRAR!'}</Text>
                </TouchableOpacity>
              </View>
            )}
            {etapaRoleta === 'resultado' && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 60 }}>🎉</Text>
                <Text style={{ color: c.texto, fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>Você ganhou: {premioGanho?.nome}</Text>
                <TouchableOpacity onPress={() => setMostrarRoletaModal(false)} style={{ marginTop: 30, backgroundColor: c.neonVerde, padding: 15, borderRadius: 15 }}><Text style={{ color: '#fff' }}>FECHAR</Text></TouchableOpacity>
              </View>
            )}
          </View>
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

      {toast.visible && (
        <Animated.View style={{
          position: 'absolute', top: toastAnim, left: 20, right: 20,
          backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444',
          padding: 16, borderRadius: 12, elevation: 10, zIndex: 9999,
          flexDirection: 'row', alignItems: 'center'
        }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, flex: 1 }}>{toast.message}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputGigante: { padding: 22, borderRadius: 20, fontSize: 32, fontWeight: '900', textAlign: 'center', borderWidth: 2, marginBottom: 20 },
  buttonBig: { padding: 22, borderRadius: 20, alignItems: 'center', backgroundColor: '#10b981' },
  buttonTextBig: { color: '#fff', fontWeight: '900', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

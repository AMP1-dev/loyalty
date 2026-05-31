import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated, Dimensions, Easing, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, useColorScheme, View
} from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop, Text as SvgText, TSpan } from 'react-native-svg';
import { supabase } from '../../../lib/supabase';
import OfertaGoogle from './OfertaGoogle';

const APP_VERSION = "v5.8.9-exchange";

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

/* ====================================================================
// CÓDIGO DA ROLETA ANTIGA COMENTADO A PEDIDO DO LOGISTA
function WheelSVG({ prizes, size, isDark }: { prizes: any[]; size: number; isDark: boolean }) {
  const CENTER = size / 2;
  const RADIUS = CENTER - 10; 
  const numSlices = prizes.length;
  const ANGLE = 360 / numSlices;

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const getIconePremio = (p: any) => {
    const nome = (p.nome || '').toLowerCase();
    if (nome.includes('chocolate') || nome.includes('bombom')) return '🍫';
    if (nome.includes('refrigerante') || nome.includes('refri') || nome.includes('coca')) return '🥤';
    if (nome.includes('chá') || nome.includes('cha') || nome.includes('café') || nome.includes('cafe')) return '☕';
    if (nome.includes('desconto') || nome.includes('%')) return '🏷️';
    if (nome.includes('brinde') || nome.includes('presente')) return '🎁';
    if (p.tipo === 'cashback') return '💰';
    if (p.tipo === 'pontos') return '✨';
    if (p.tipo === 'nada') return '😢';
    if (p.tipo === 'bonus') return '🎉';
    return '✨';
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="metallicGradMesa" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={isDark ? "#475569" : "#ffffff"} />
          <Stop offset="80%" stopColor={isDark ? "#1e293b" : "#e2e8f0"} />
          <Stop offset="100%" stopColor={isDark ? "#0f172a" : "#cbd5e1"} />
        </RadialGradient>
      </Defs>

      <Circle cx={CENTER} cy={CENTER} r={CENTER - 2} fill="url(#metallicGradMesa)" stroke={isDark ? "#334155" : "#94a3b8"} strokeWidth="4" />
      
      <G>
        {prizes.map((p, i) => {
          const startAngle = i * ANGLE;
          const endAngle = startAngle + ANGLE;
          const midAngle = startAngle + ANGLE / 2;

          const start = polarToCartesian(CENTER, CENTER, RADIUS, endAngle);
          const end = polarToCartesian(CENTER, CENTER, RADIUS, startAngle);
          const textPos = polarToCartesian(CENTER, CENTER, RADIUS * 0.55, midAngle);
          const iconPos = polarToCartesian(CENTER, CENTER, RADIUS * 0.88, midAngle);

          const colors = isDark 
            ? ['#1e293b', '#334155', '#1e293b', '#475569']
            : ['#fff7ed', '#f8fafc', '#d1fae5'];
          const sliceColor = colors[i % colors.length];

          const d = `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 0 ${end.x} ${end.y} Z`;

          const iconType = getIconePremio(p);
          
          return (
            <G key={i}>
              <Path d={d} fill={sliceColor} stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="1" />
              <SvgText x={iconPos.x} y={iconPos.y + 4} fontSize="16" textAnchor="middle" transform={`rotate(${midAngle} ${iconPos.x} ${iconPos.y})`}>
                {iconType}
              </SvgText>
              <SvgText 
                x={textPos.x} 
                y={textPos.y} 
                fontSize={p.nome.length > 10 ? "10" : "12"} 
                fontFamily="sans-serif"
                fontWeight="900" 
                textAnchor="middle" 
                fill={isDark ? "#f8fafc" : "#1e293b"}
                transform={`rotate(${midAngle + 90} ${textPos.x} ${textPos.y})`}
              >
                {(() => {
                  let linhas = p.nome.split('\n');
                  if (linhas.length === 1 && p.nome.length > 9 && p.nome.includes(' ')) {
                    const palavras = p.nome.split(' ');
                    const meio = Math.ceil(palavras.length / 2);
                    linhas = [palavras.slice(0, meio).join(' '), palavras.slice(meio).join(' ')];
                  }
                  return linhas.map((linha: string, index: number) => (
                    <TSpan key={index} x={textPos.x} dy={index === 0 ? 0 : 12}>
                      {linha.substring(0, 15).toUpperCase()}
                    </TSpan>
                  ));
                })()}
              </SvgText>
            </G>
          );
        })}
      </G>

      <Circle cx={CENTER} cy={CENTER} r={RADIUS * 0.15} fill="url(#metallicGradMesa)" stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="2" />
      <Circle cx={CENTER} cy={CENTER} r={RADIUS * 0.05} fill={isDark ? "#10b981" : "#7c3aed"} />
    </Svg>
  );
}
==================================================================== */

const getIconePremio = (p: any) => {
  if (!p) return '✨';
  const nome = (p.nome || '').toLowerCase();
  if (nome.includes('chocolate') || nome.includes('bombom')) return '🍫';
  if (nome.includes('refrigerante') || nome.includes('refri') || nome.includes('coca')) return '🥤';
  if (nome.includes('chá') || nome.includes('cha') || nome.includes('café') || nome.includes('cafe')) return '☕';
  if (nome.includes('desconto') || nome.includes('%')) return '🏷️';
  if (nome.includes('brinde') || nome.includes('presente')) return '🎁';
  if (p.tipo === 'cashback') return '💰';
  if (p.tipo === 'pontos') return '✨';
  if (p.tipo === 'nada') return '💣'; 
  if (p.tipo === 'bonus') return '🎉';
  return '✨';
};

const isPremioPerda = (p: any) => {
  if (!p) return false;
  const nome = (p.nome || '').toLowerCase();
  return p.tipo === 'nada' || nome.includes('tente') || nome.includes('quase') || nome.includes('perdeu') || nome.includes('não foi') || nome.includes('nao foi') || nome.includes('nada');
};

const { width } = Dimensions.get('window');

const salvarStorage = async (chave: string, valor: any) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(chave, JSON.stringify(valor));
    } else {
      await AsyncStorage.setItem(chave, JSON.stringify(valor));
    }
  } catch (e) {
    console.error('Erro ao salvar storage:', e);
  }
};

const buscarStorage = async (chave: string) => {
  try {
    if (Platform.OS === 'web') {
      const v = localStorage.getItem(chave);
      return v ? JSON.parse(v) : null;
    } else {
      const v = await AsyncStorage.getItem(chave);
      return v ? JSON.parse(v) : null;
    }
  } catch (e) {
    console.error('Erro ao buscar storage:', e);
    return null;
  }
};

export default function MesaRoleta({ lojaId: loja_id_prop, onClose }: { lojaId?: string; onClose?: () => void }) {
  const params = useLocalSearchParams();
  const loja_id = loja_id_prop || (params?.loja_id as string);

  const [etapa, setEtapa] = useState<'telefone' | 'nps' | 'roleta' | 'resultado' | 'google'>('telefone');
  const [telefone, setTelefone] = useState('');
  const [notaNps, setNotaNps] = useState(0);
  const [perguntaCustom, setPerguntaCustom] = useState('Como foi sua experiência?');
  const [perguntaIdCustom, setPerguntaIdCustom] = useState<string | null>(null);
  const [tipoPerguntaCustom, setTipoPerguntaCustom] = useState('estrelas');
  const [premiosRoletaMesa, setPremiosRoletaMesa] = useState<any[]>([]);
  const [premioGanho, setPremioGanho] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [uuidLojaReal, setUuidLojaReal] = useState<string | null>(null);

  // Estados do Campo Minado
  type TipoQuadrado = { id: number; status: 'fechado' | 'revelado'; conteudo: 'vazio' | 'premio' | 'bomba'; premioReal?: any; iconTemp?: string };
  const [quadrados, setQuadrados] = useState<TipoQuadrado[]>([]);
  const [chances, setChances] = useState(3);
  const [scriptJogo, setScriptJogo] = useState<('vazio' | 'premio' | 'bomba')[]>([]);
  const [cliqueAtual, setCliqueAtual] = useState(0);
  const [jogoFinalizado, setJogoFinalizado] = useState(false);
  const [premioFinalSorteado, setPremioFinalSorteado] = useState<any>(null);

  const [configLoja, setConfigLoja] = useState<any>(null);
  const [nomeLojaAtual, setNomeLojaAtual] = useState('');

  // Animações removidas pois não usamos mais a roleta
  /*
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const idleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [roletaTargetDeg, setRoletaTargetDeg] = useState(0);
  */

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'erro' as 'sucesso' | 'erro' });
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'erro') => {
    setToast({ visivel: true, mensagem, tipo });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 20, duration: 400, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: -100, duration: 400, useNativeDriver: true }),
    ]).start(() => setToast({ visivel: false, mensagem: '', tipo }));
  };

  const temaSistema = useColorScheme();
  const [isDark, setIsDark] = useState(temaSistema === 'dark');

  const c = {
    bg: isDark ? '#020617' : '#f8fafc',
    card: isDark ? '#1e293b' : '#ffffff',
    borda: isDark ? '#334155' : '#e2e8f0',
    texto: isDark ? '#ffffff' : '#1e293b',
    subtexto: isDark ? '#94a3b8' : '#64748b',
    roxo: '#8B5CF6',
    neonAmarelo: '#facc15',
  };

  useEffect(() => {
    if (!loja_id || loja_id === 'undefined') return;
    carregarDadosMesa();
  }, [loja_id]);

  const carregarDadosMesa = async () => {
    try {
      setCarregando(true);
      let lid_final = String(loja_id);
      const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

      if (loja_id && !isUUID(String(loja_id))) {
        const { data: lData } = await supabase.from('lojas').select('id, nome').ilike('nome', `%${loja_id}%`).maybeSingle();
        if (lData) {
          lid_final = lData.id;
          setUuidLojaReal(lData.id);
          setNomeLojaAtual(lData.nome);
        }
      } else if (loja_id) {
        setUuidLojaReal(String(loja_id));
        const { data: loja } = await supabase.from('lojas').select('nome').eq('id', String(loja_id)).single();
        if (loja) setNomeLojaAtual(loja.nome);
      }

      const { data: config } = await supabase.from('configuracoes_loja').select('*').eq('loja_id', lid_final).single();
      if (config) setConfigLoja(config);

      const { data: premios } = await supabase.from('roleta_mesa_premios').select('*').eq('loja_id', lid_final).eq('ativo', true);

      if (premios && premios.length > 0) {
        setPremiosRoletaMesa(premios);
      } else {
        setPremiosRoletaMesa([
          { id: 'd1', nome: 'GANHOU 10\nSPRINGS', tipo: 'pontos', probabilidade: 50 },
          { id: 'd2', nome: 'TENTE\nOUTRA VEZ', tipo: 'nada', probabilidade: 50 },
          { id: 'd3', nome: 'R$\nCASHBACK', tipo: 'cashback', probabilidade: 50 },
          { id: 'd4', nome: 'GANHE EM\nDOBRO', tipo: 'bonus', probabilidade: 50 }
        ]);
      }

      const { data: perguntas } = await supabase.from('perguntas_nps').select('*').eq('loja_id', lid_final).eq('ativo', true).order('created_at', { ascending: true });
      if (perguntas && perguntas.length > 0) {
        const perguntaSorteada = perguntas[Math.floor(Math.random() * perguntas.length)];
        setPerguntaCustom(perguntaSorteada.pergunta);
        setPerguntaIdCustom(perguntaSorteada.id);
        setTipoPerguntaCustom(perguntaSorteada.tipo || 'estrelas');
      }
      setCarregando(false);
    } catch (error) {
      console.error('Erro ao carregar dados da mesa:', error);
      setCarregando(false);
    }
  };

  useEffect(() => {
    // Efeitos passados removidos
    /*
    const rodarIdle = () => {
      idleAnim.setValue(0);
      Animated.timing(idleAnim, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })
        .start(({ finished }) => { if (finished) rodarIdle(); });
    };
    rodarIdle();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.02, duration: 2000, useNativeDriver: false }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 2000, useNativeDriver: false })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false })
      ])
    ).start();
    */
  }, []);

  const validarJogueDiario = async (telefone: string, lojaId: string): Promise<boolean> => {
    try {
      const cleanTel = telefone.replace(/\D/g, '');
      const horasBloqueio = 4; // Limite fixo de 4 horas para a mesa física
      
      // 1. Checagem do dispositivo (Local Storage) - ANTIFRAUDE FIXO EM 4 HORAS!
      const ultimoJogoDevice = await buscarStorage(`device_mesa_ultimo_jogo_${lojaId}`);
      if (ultimoJogoDevice) {
        const dataLocal = new Date(ultimoJogoDevice);
        const agora = new Date();
        const diffMs = agora.getTime() - dataLocal.getTime();
        const diffHoras = diffMs / (1000 * 60 * 60);
        if (diffHoras < 4) return false;
      }

      // 2. Checagem do telefone (Local Storage) - Fixo 4 horas
      const jaJogouLocal = await buscarStorage(`ja_jogou_${lojaId}_${cleanTel}`);
      if (jaJogouLocal) {
        const dataLocal = new Date(jaJogouLocal);
        const agora = new Date();
        const diffMs = agora.getTime() - dataLocal.getTime();
        const diffHoras = diffMs / (1000 * 60 * 60);
        if (diffHoras < 4) return false;
      }

      // 3. Checagem no Banco de Dados (Supabase em UTC) - Fixo 4 horas
      const agoraUTC = new Date();
      const tempoAtras = new Date(agoraUTC.getTime() - horasBloqueio * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('roleta_mesa_participacoes')
        .select('id')
        .eq('loja_id', lojaId)
        .eq('cliente_cpf', cleanTel)
        .gte('created_at', tempoAtras)
        .limit(1);

      if (error) return true; // Falha na rede/banco: assume que pode jogar para evitar travamento do lead
      if (data && data.length > 0) {
        // Atualiza os storages locais para sincronizar o bloqueio
        const dataAtualIso = new Date().toISOString();
        await salvarStorage(`device_mesa_ultimo_jogo_${lojaId}`, dataAtualIso);
        await salvarStorage(`ja_jogou_${lojaId}_${cleanTel}`, dataAtualIso);
        return false;
      }

      return true;
    } catch (error) {
      return true;
    }
  };

  const validarTelefone = (tel: string): boolean => {
    const clean = tel.replace(/\D/g, '');
    if (/^(\d)\1+$/.test(clean)) return false;
    if (clean.length !== 10 && clean.length !== 11) return false;
    const ddd = clean.substring(0, 2);
    if (!DDD_VALIDOS.includes(ddd)) return false;
    if (clean.length === 11 && clean[2] !== '9') return false;
    if (clean.length === 10 && !['2', '3', '4', '5'].includes(clean[2])) return false;
    return true;
  };

  const avancarParaNPS = async () => {
    if (!validarTelefone(telefone)) {
      mostrarToast('Digite o telefone com DDD (11 dígitos) 📱', 'erro');
      return;
    }
    setCarregando(true);
    try {
      const lid_final = uuidLojaReal || String(loja_id);

      const podeJogar = await validarJogueDiario(telefone, lid_final);
      if (!podeJogar) {
        mostrarToast('Aguardamos você novamente amanhã para jogar com a gente ;)', 'erro');
        setTelefone('');
        setCarregando(false);
        return;
      }
      
      setCarregando(false);
      setEtapa('nps');
    } catch (e) {
      console.error(e);
      setCarregando(false);
      mostrarToast('Erro ao validar jogo. Tente novamente. ❌', 'erro');
    }
  };

  const avancarParaRoleta = () => {
    if (notaNps === 0) {
      mostrarToast('Por favor, selecione uma nota ⭐', 'erro');
      return;
    }
    
    // Preparar Jogo Campo Minado (Ilusão de Escolha)
    const premioSorteado = sortearPremio(premiosRoletaMesa);
    setPremioFinalSorteado(premioSorteado);
    
    const isWin = !isPremioPerda(premioSorteado);
    
    let script: ('vazio' | 'premio' | 'bomba')[] = [];
    if (isWin) {
      const trys = Math.floor(Math.random() * 3) + 1; 
      script = Array(trys - 1).fill('vazio');
      script.push('premio');
    } else {
      const hitBomb = Math.random() > 0.2; 
      if (hitBomb) {
        const clickBomba = Math.floor(Math.random() * 3) + 1; 
        script = Array(clickBomba - 1).fill('vazio');
        script.push('bomba');
      } else {
        script = ['vazio', 'vazio', 'vazio']; 
      }
    }
    setScriptJogo(script);
    setChances(3);
    setCliqueAtual(0);
    setJogoFinalizado(false);
    setQuadrados(Array(12).fill(null).map((_, i) => ({ id: i, status: 'fechado', conteudo: 'vazio' })));

    setEtapa('roleta');
  };

  const clicarQuadrado = async (index: number) => {
    if (jogoFinalizado || quadrados[index].status !== 'fechado') return;

    const acao = scriptJogo[cliqueAtual];
    const novoCliqueAtual = cliqueAtual + 1;
    setCliqueAtual(novoCliqueAtual);

    let novosQuadrados = [...quadrados];
    
    if (acao === 'vazio') {
      novosQuadrados[index] = { ...novosQuadrados[index], status: 'revelado', conteudo: 'vazio', iconTemp: '✨' };
      setQuadrados(novosQuadrados);
      setChances(c => c - 1);
      
      if (novoCliqueAtual >= scriptJogo.length && !scriptJogo.includes('premio') && !scriptJogo.includes('bomba')) {
        finalizarJogo(novosQuadrados, false);
      }
    } else if (acao === 'bomba') {
      novosQuadrados[index] = { ...novosQuadrados[index], status: 'revelado', conteudo: 'bomba', iconTemp: '💣' };
      setQuadrados(novosQuadrados);
      setChances(0);
      finalizarJogo(novosQuadrados, false);
    } else if (acao === 'premio') {
      novosQuadrados[index] = { ...novosQuadrados[index], status: 'revelado', conteudo: 'premio', premioReal: premioFinalSorteado };
      setQuadrados(novosQuadrados);
      finalizarJogo(novosQuadrados, true);
    }
  };

  const finalizarJogo = (quadradosAtuais: TipoQuadrado[], isWin: boolean) => {
    setJogoFinalizado(true);
    
    let quadradosFinais = [...quadradosAtuais];
    
    if (isWin) {
      quadradosFinais = quadradosFinais.map(q => q.status === 'fechado' ? { ...q, status: 'revelado', conteudo: 'bomba', iconTemp: '💣' } : q);
    } else {
      let premioFalsoIndex = quadradosFinais.findIndex(q => q.status === 'fechado');
      let outroPremio = premiosRoletaMesa.find(p => !isPremioPerda(p));
      
      quadradosFinais = quadradosFinais.map((q, i) => {
        if (q.status === 'fechado') {
          if (i === premioFalsoIndex && outroPremio) {
            return { ...q, status: 'revelado', conteudo: 'premio', premioReal: outroPremio };
          }
          return { ...q, status: 'revelado', conteudo: 'bomba', iconTemp: '💣' };
        }
        return q;
      });
    }
    
    setQuadrados(quadradosFinais);
    
    setTimeout(() => {
      const cleanTel = telefone.replace(/\D/g, '');
      salvarParticipacaoMesa(cleanTel, premioFinalSorteado).catch(e => console.error(e));
      setPremioGanho(premioFinalSorteado);
      setEtapa('resultado');
    }, 4000);
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

  const salvarParticipacaoMesa = async (telefoneOriginal: string, premio: any) => {
    try {
      const telLimpo = telefoneOriginal.replace(/\D/g, '');
      const dataAtualIso = new Date().toISOString();
      const lid_final = uuidLojaReal || String(loja_id);
      await salvarStorage(`ja_jogou_${lid_final}_${telLimpo}`, dataAtualIso);
      await salvarStorage(`device_mesa_ultimo_jogo_${lid_final}`, dataAtualIso);

      const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const pId = premio?.id && isUUID(String(premio.id)) ? premio.id : null;

      let valor = Number(premio?.valor);
      if (isNaN(valor) || !valor) {
        const match = String(premio?.nome || '').match(/\d+/);
        valor = match ? Number(match[0]) : 10;
      }

      const resMesa = await supabase.from('roleta_mesa_participacoes').insert({
        loja_id: lid_final,
        cliente_cpf: telLimpo,
        premio_id: pId,
        premio_nome: premio?.nome || 'Prêmio',
        premio_valor: valor,
        nota_nps: notaNps,
        oferta_google_dobro: notaNps === 5,
        premio_resgatado: (premio?.tipo === 'pontos' || premio?.tipo === 'bonus' || premio?.tipo === 'cashback'),
      });

      if (resMesa.error) {
        console.warn('Erro ao inserir participacao com premio_id. Tentando fallback sem chave estrangeira (premio_id: null):', resMesa.error);
        // Tenta novamente sem o premio_id para contornar a constraint da tabela obsoleta roleta_premios_mesa
        const retryRes = await supabase.from('roleta_mesa_participacoes').insert({
          loja_id: lid_final,
          cliente_cpf: telLimpo,
          premio_id: null,
          premio_nome: premio?.nome || 'Prêmio',
          premio_valor: valor,
          nota_nps: notaNps,
          oferta_google_dobro: notaNps === 5,
          premio_resgatado: (premio?.tipo === 'pontos' || premio?.tipo === 'bonus' || premio?.tipo === 'cashback'),
        });
        if (retryRes.error) {
          console.error('Erro critico ao salvar participacao da mesa apos fallback:', retryRes.error);
        }
      }

      // --- CRÉDITO AUTOMÁTICO NA CARTEIRA ---
      if (premio?.tipo === 'pontos' || premio?.tipo === 'bonus') {
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + 1);
        const { error: insErr } = await supabase.from('bonus_pendentes').insert([{
          cliente_cpf: telLimpo,
          loja_id: lid_final,
          pontos: valor,
          usado: false,
          data_expiracao: expDate.toISOString()
        }]);
        if (insErr) console.error('Erro ao creditar pontos/bonus na carteira:', insErr);
      } else if (premio?.tipo === 'cashback') {
        const { error: insErr } = await supabase.from('cashbacks').insert([{
          cliente_cpf: telLimpo,
          loja_id: lid_final,
          valor: valor,
          usado: false
        }]);
        if (insErr) console.error('Erro ao creditar cashback na carteira:', insErr);
      } else if (premio?.tipo === 'brinde') {
        const { error: insErr } = await supabase.from('brindes_pendentes').insert([{
          cliente_cpf: telLimpo,
          loja_id: lid_final,
          nome_brinde: premio.nome,
          resgatado: false
        }]);
        if (insErr) console.error('Erro ao registrar brinde pendente na carteira:', insErr);
      }

      await sincronizarComRemarketig(telLimpo, premio);
    } catch (error) {
      console.error('Erro no fluxo salvarParticipacaoMesa:', error);
    }
  };

  const sincronizarComRemarketig = async (telefone: string, premio: any) => {
    try {
      const lid_final = uuidLojaReal || String(loja_id);
      const { data: existente } = await supabase.from('contatos_mesa_remarketing').select('id').eq('loja_id', lid_final).eq('cliente_cpf', telefone).limit(1);
      if (existente && existente.length > 0) {
        await supabase.from('contatos_mesa_remarketing').update({ premio_ganho: premio.nome, nota_nps: notaNps, status: 'nao_contatado', data_participacao: new Date().toISOString(), data_ultimo_contato: null }).eq('id', existente[0].id);
      } else {
        const tags = [];
        if (notaNps === 5) tags.push('5_estrelas');
        if (premio.tipo === 'desconto') tags.push('desconto');
        if (premio.tipo === 'brinde') tags.push('brinde');
        await supabase.from('contatos_mesa_remarketing').insert({ loja_id: lid_final, cliente_cpf: telefone, premio_ganho: premio.nome, nota_nps: notaNps, status: 'nao_contatado', data_participacao: new Date().toISOString(), tags: tags, marketing_consentido: true });
      }

      // Salvar na tabela de NPS para o Dashboard
      await supabase.from('respostas_nps').insert({ loja_id: lid_final, cliente_cpf: telefone, resposta: String(notaNps), pergunta_id: perguntaIdCustom });
    } catch (error) {
      console.error(error);
    }
  };

  if (etapa === 'resultado' && notaNps === 5 && premioGanho && !isPremioPerda(premioGanho) && premioGanho.tipo !== 'outro') {
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

  return (
    <LinearGradient colors={isDark ? ['#020617', '#1e293b'] : ['#f8fafc', '#e2e8f0']} style={{ flex: 1 }}>
      <Animated.View style={{ position: 'absolute', top: 20, left: 20, right: 20, zIndex: 100000, transform: [{ translateY: toastAnim as any }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 5 }}>
        <Text style={{ fontSize: 20, marginRight: 10 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, flex: 1 }}>{toast.mensagem}</Text>
      </Animated.View>

      {(!loja_id || loja_id === 'undefined') ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <Text style={{ fontSize: 80, marginBottom: 20 }}>🔒</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: c.texto, textAlign: 'center' }}>ACESSO RESTRITO</Text>
          <Text style={{ fontSize: 14, color: c.subtexto, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            Esta funcionalidade é exclusiva para uso na mesa através do QR Code da loja.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/')} style={{ marginTop: 40, backgroundColor: c.roxo, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 15 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>VOLTAR AO INÍCIO</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {etapa === 'telefone' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 25, paddingTop: 60 }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}><Text style={{ fontSize: 36, marginBottom: 10 }}>✨ ✨ ✨</Text></View>
              <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <Text style={{ fontSize: 48, fontWeight: '900', color: c.roxo }}>PALM</Text>
                <Text style={{ fontSize: 48, fontWeight: '900', color: c.roxo }}>SPRINGS</Text>
              </View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}><Text style={{ fontSize: 36 }}>✨ ✨ ✨</Text></View>
              <TextInput placeholder="(00) 00000-0000" placeholderTextColor={c.subtexto} keyboardType="phone-pad" value={telefone} maxLength={15} onChangeText={(text) => {
                const clean = text.replace(/\D/g, '').slice(0, 11);
                const formatted = clean.length <= 2 ? `(${clean}` : clean.length <= 7 ? `(${clean.slice(0, 2)}) ${clean.slice(2)}` : `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
                setTelefone(formatted);
              }} style={[styles.inputGigante, { backgroundColor: c.card, borderColor: c.borda, color: c.texto }]} />
              <TouchableOpacity style={styles.buttonBig} onPress={avancarParaNPS} activeOpacity={0.8} disabled={carregando}>
                {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonTextBig}>JOGUE NA MESA 🕹️</Text>}
              </TouchableOpacity>
              <Text style={{ textAlign: 'center', color: c.subtexto, fontSize: 10, marginTop: 40 }}>{APP_VERSION}</Text>
            </ScrollView>
          )}

          {etapa === 'nps' && (
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              <View style={{ width: '90%', maxWidth: 400 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: c.texto, textAlign: 'center', marginBottom: 8 }}>{perguntaCustom}</Text>
                <View style={{ marginBottom: 30, marginTop: 20 }}>
                  {tipoPerguntaCustom === 'joia' ? (
                    <View style={{ flexDirection: 'row', gap: 15, justifyContent: 'center' }}>
                      {[
                        { v: 5, e: '👍', t: 'Positivo', c: '#10b981' },
                        { v: 1, e: '👎', t: 'Negativo', c: '#ef4444' }
                      ].map((item) => (
                        <TouchableOpacity key={item.v} onPress={() => setNotaNps(item.v)} style={{ flex: 1, backgroundColor: notaNps === item.v ? item.c : c.card, borderRadius: 15, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: notaNps === item.v ? item.c : c.borda }}>
                          <Text style={{ fontSize: 40, marginBottom: 8 }}>{item.e}</Text>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: notaNps === item.v ? '#fff' : c.texto }}>{item.t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    [1, 2, 3, 4, 5].map((nota) => (
                      <TouchableOpacity key={nota} onPress={() => setNotaNps(nota)} style={{ backgroundColor: notaNps === nota ? c.roxo : c.card, borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: notaNps === nota ? c.roxo : c.borda }}>
                        <Text style={{ fontSize: 24, marginRight: 12 }}>{nota === 1 ? '😢' : nota === 2 ? '😞' : nota === 3 ? '😐' : nota === 4 ? '😊' : '😍'}</Text>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: notaNps === nota ? '#fff' : c.texto }}>{nota === 1 ? 'Muito ruim' : nota === 2 ? 'Ruim' : nota === 3 ? 'Regular' : nota === 4 ? 'Bom' : 'Excelente'}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
                <TouchableOpacity onPress={avancarParaRoleta} style={{ backgroundColor: notaNps > 0 ? c.roxo : '#ccc', borderRadius: 12, padding: 16, alignItems: 'center' }} disabled={notaNps === 0}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>JOGAR AGORA →</Text></TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {etapa === 'roleta' && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', padding: 20 }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: isDark ? '#fff' : c.roxo, marginBottom: 10, textAlign: 'center' }}>
                {jogoFinalizado ? (isPremioPerda(premioFinalSorteado) ? 'KABOOM! 💣' : 'AÍ SIM! 🎉') : 'CAMPO MINADO 💣'}
              </Text>
              {!jogoFinalizado && <Text style={{ fontSize: 16, color: c.subtexto, marginBottom: 30, fontWeight: '700' }}>Chances restantes: <Text style={{ color: c.roxo, fontSize: 20 }}>{chances}</Text></Text>}
              {jogoFinalizado && <Text style={{ fontSize: 16, color: c.subtexto, marginBottom: 30, fontWeight: '700', textAlign: 'center' }}>{isPremioPerda(premioFinalSorteado) ? 'Você encontrou uma bomba!' : `Você achou: ${premioFinalSorteado?.nome}`}</Text>}
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 350 }}>
                {quadrados.map((q, index) => (
                  <TouchableOpacity
                    key={q.id}
                    disabled={jogoFinalizado || q.status === 'revelado'}
                    onPress={() => clicarQuadrado(index)}
                    activeOpacity={0.8}
                    style={{
                      width: '30%',
                      aspectRatio: 1,
                      backgroundColor: q.status === 'fechado' ? '#9333ea' : (q.conteudo === 'bomba' ? '#ef4444' : q.conteudo === 'premio' ? '#10b981' : c.card),
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                      elevation: q.status === 'fechado' ? 8 : 0,
                      shadowColor: '#9333ea',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: q.status === 'fechado' ? 0.6 : 0,
                      shadowRadius: q.status === 'fechado' ? 10 : 0,
                      borderWidth: q.status === 'fechado' ? 0 : 2,
                      borderColor: q.conteudo === 'bomba' ? '#7f1d1d' : q.conteudo === 'premio' ? '#047857' : c.borda,
                    }}
                  >
                    {q.status === 'revelado' ? (
                      <Text style={{ fontSize: 36 }}>
                        {q.conteudo === 'premio' ? getIconePremio(q.premioReal) : q.iconTemp}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 44, fontWeight: '900', color: '#ff9100', textShadowColor: '#ff9100', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }}>?</Text>
                    )}
                    {q.status === 'revelado' && q.conteudo === 'premio' && (
                      <Text style={{ fontSize: 10, color: '#fff', fontWeight: '900', textAlign: 'center', marginTop: 4, position: 'absolute', bottom: 5, paddingHorizontal: 4 }} numberOfLines={1}>
                        {q.premioReal?.nome?.substring(0,10) || 'PRÊMIO'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {etapa === 'resultado' && premioGanho && (
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              <View style={{ alignItems: 'center', width: '90%', padding: 20 }}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={{ width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 25, elevation: 12 }}>
                  <Text style={{ fontSize: 60 }}>{isPremioPerda(premioGanho) ? '🎡' : '🎁'}</Text>
                </LinearGradient>
                <Text style={{ fontSize: 16, fontWeight: '800', color: c.subtexto, letterSpacing: 2 }}>{isPremioPerda(premioGanho) ? 'QUASE LÁ!' : 'PARABÉNS!'}</Text>
                <Text style={{ fontSize: 32, fontWeight: '900', color: c.texto, textAlign: 'center', marginTop: 15, lineHeight: 40 }}>
                  {isPremioPerda(premioGanho) ? 'Não foi dessa vez...' : `Você ganhou:\n${premioGanho.nome}`}
                </Text>
                <View style={{ backgroundColor: c.card, borderRadius: 24, padding: 30, marginTop: 30, borderWidth: 1, borderColor: c.borda, width: '100%', alignItems: 'center', elevation: 5 }}>
                  <Text style={{ fontSize: 14, color: c.subtexto, textAlign: 'center', lineHeight: 20 }}>
                    {!isPremioPerda(premioGanho) ? 'Mostre esta tela para o atendente e retire seu prêmio agora mesmo! 🍀' : 'Não foi dessa vez, mas não desista! Amanhã tem mais sorte pra você. ✨'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setEtapa('telefone'); setTelefone(''); setNotaNps(0); setPremioGanho(null); setQuadrados([]); }} style={{ backgroundColor: c.roxo, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 60, alignItems: 'center', marginTop: 40, width: '100%', elevation: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>VOLTAR AO INÍCIO 🏠</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </>
      )}
      <Text style={{ position: 'absolute', bottom: 10, right: 10, color: c.subtexto, fontSize: 10, fontWeight: 'bold' }}>{APP_VERSION}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  inputGigante: { padding: 22, borderRadius: 20, fontSize: 32, fontWeight: '900', textAlign: 'center', borderWidth: 2, marginBottom: 20 },
  buttonBig: { padding: 22, borderRadius: 20, alignItems: 'center', backgroundColor: '#10b981' },
  buttonTextBig: { color: '#fff', fontWeight: '900', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

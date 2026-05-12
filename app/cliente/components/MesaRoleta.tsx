import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated, Dimensions, Easing, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, useColorScheme, View
} from 'react-native';
import Svg, { Circle, Defs, FeComponentTransfer, FeFuncA, FeGaussianBlur, FeMerge, FeMergeNode, FeOffset, Filter, G, Path, RadialGradient, Stop, LinearGradient as SvgLinearGradient, Text as SvgText } from 'react-native-svg';
import { supabase } from '../../../lib/supabase';
import OfertaGoogle from './OfertaGoogle';

const APP_VERSION = "v5.8.3-exchange";

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



// ─── Componente WheelSVG ──────────────────────────────────────────────────────
function WheelSVG({ prizes, size, isDark }: { prizes: any[]; size: number; isDark: boolean }) {
  const CENTER = size / 2;
  const RADIUS = CENTER - 10; 
  const numSlices = prizes.length;
  const ANGLE = 360 / numSlices;

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const getIconePremio = (tipo: string) => {
    if (tipo === 'cashback') return '✨';
    if (tipo === 'pontos') return '✨';
    if (tipo === 'nada') return '✨';
    if (tipo === 'bonus') return '✨';
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

      {/* Borda Metálica Externa */}
      <Circle cx={CENTER} cy={CENTER} r={CENTER - 2} fill="url(#metallicGradMesa)" stroke={isDark ? "#334155" : "#94a3b8"} strokeWidth="4" />
      
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
      <Circle cx={CENTER} cy={CENTER} r={RADIUS * 0.15} fill="url(#metallicGradMesa)" stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="2" />
      <Circle cx={CENTER} cy={CENTER} r={RADIUS * 0.05} fill={isDark ? "#10b981" : "#7c3aed"} />
    </Svg>
  );
}

// ─── Componente Principal MesaRoleta ──────────────────────────────────────────
const { width } = Dimensions.get('window');

// Funções Auxiliares de Storage
const salvarStorage = async (chave: string, valor: any) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(chave, JSON.stringify(valor));
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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
  const [premiosRoletaMesa, setPremiosRoletaMesa] = useState<any[]>([]);
  const [premioGanho, setPremioGanho] = useState<any>(null);
  const [rodando, setRodando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [uuidLojaReal, setUuidLojaReal] = useState<string | null>(null);

  const [configLoja, setConfigLoja] = useState<any>(null);
  const [nomeLojaAtual, setNomeLojaAtual] = useState('');

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const idleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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
        let listaBonita = [...premios];
        if (listaBonita.length > 0 && listaBonita.length < 6) {
          while (listaBonita.length < 6) {
            listaBonita = [...listaBonita, ...premios];
          }
        }
        setPremiosRoletaMesa(listaBonita);
      } else {
        setPremiosRoletaMesa([
          { id: 'd1', nome: 'GANHOU 10\nSPRINGS', tipo: 'pontos', probabilidade: 50 },
          { id: 'd2', nome: 'TENTE\nOUTRA VEZ', tipo: 'nada', probabilidade: 50 },
          { id: 'd3', nome: 'R$\nCASHBACK', tipo: 'cashback', probabilidade: 50 },
          { id: 'd4', nome: 'GANHE EM\nDOBRO', tipo: 'bonus', probabilidade: 50 }
        ]);
      }

      const { data: perguntas } = await supabase.from('perguntas_nps').select('*').eq('loja_id', loja_id).eq('ativa', true).order('ordem', { ascending: true });

      if (perguntas && perguntas.length > 0) {
        const perguntaSorteada = perguntas[Math.floor(Math.random() * perguntas.length)];
        setPerguntaCustom(perguntaSorteada.pergunta);
      }

      setCarregando(false);
    } catch (error) {
      console.error('Erro ao carregar dados da mesa:', error);
      setCarregando(false);
    }
  };

  useEffect(() => {
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
  }, []);

  const validarJogueDiario = async (telefone: string, lojaId: string): Promise<boolean> => {
    try {
      const cleanTel = telefone.replace(/\D/g, '');
      
      // 1. Trava Local (Instantânea e Prioritária)
      const jaJogouLocal = await buscarStorage(`ja_jogou_${lojaId}_${cleanTel}`);
      if (jaJogouLocal) {
        const dataLocal = new Date(jaJogouLocal);
        const hoje = new Date();
        // Compara Dia, Mês e Ano
        if (dataLocal.getDate() === hoje.getDate() && 
            dataLocal.getMonth() === hoje.getMonth() && 
            dataLocal.getFullYear() === hoje.getFullYear()) {
          console.log("Bloqueio local ativado para:", cleanTel);
          return false;
        }
      }

      // 2. Trava de Banco (Segurança de Nuvem)
      const agora = new Date();
      const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();

      const { data, error } = await supabase
        .from('roleta_mesa_participacoes')
        .select('id')
        .eq('loja_id', lojaId)
        .eq('cliente_cpf', cleanTel)
        .gte('created_at', inicioHoje)
        .limit(1);

      if (error) {
        console.error("Erro ao verificar participações no banco:", error);
        return true; // Em caso de erro de rede, permitimos para não travar o cliente legítimo
      }
      
      if (data && data.length > 0) {
        // Se achou no banco mas não tinha no local, sincroniza o local agora
        await salvarStorage(`ja_jogou_${lojaId}_${cleanTel}`, new Date().toISOString());
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro na validação de jogue diário:", error);
      return true;
    }
  };

  const validarTelefone = (tel: string): boolean => {
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

  const avancarParaNPS = async () => {
    if (!validarTelefone(telefone)) {
      mostrarToast('Digite o telefone com DDD (11 dígitos) 📱', 'erro');
      return;
    }
    const podeJogar = await validarJogueDiario(telefone, loja_id);
    if (!podeJogar) {
      mostrarToast('🎮 Você já jogou hoje! Volte amanhã. 🍀', 'erro');
      setTelefone('');
      return;
    }
    setEtapa('nps');
  };

  const avancarParaRoleta = () => {
    if (notaNps === 0) {
      mostrarToast('Por favor, selecione uma nota ⭐', 'erro');
      return;
    }
    setEtapa('roleta');
  };

  const girarRoleta = async () => {
    if (rodando || premiosRoletaMesa.length === 0) return;
    setRodando(true);
    setEtapa('roleta');

    try {
      const premio = sortearPremio(premiosRoletaMesa);
      const targetIndex = premiosRoletaMesa.findIndex((p) => p.id === premio.id);
      const sliceDeg = 360 / premiosRoletaMesa.length;
      const midSliceDeg = targetIndex * sliceDeg + sliceDeg / 2;
      const finalOffset = (360 - (midSliceDeg % 360)) % 360;
      const rotations = 8;
      const targetDeg = rotations * 360 + finalOffset;

      Animated.timing(rotateAnim, {
        toValue: targetDeg,
        duration: 3000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(async () => {
        const cleanTel = telefone.replace(/\D/g, '');
        salvarParticipacaoMesa(cleanTel, premio).catch(e => console.error("Erro background save:", e));
        setPremioGanho(premio);
        setEtapa('resultado');
        setRodando(false);
      });
    } catch (error) {
      setRodando(false);
      mostrarToast("Erro ao girar a roleta.", 'erro');
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
      // 1. TRAVA LOCAL IMEDIATA (Se o banco falhar, o celular já está bloqueado)
      await salvarStorage(`ja_jogou_${loja_id}_${telefone}`, new Date().toISOString());
      await salvarStorage(`mesa_telefone_${loja_id}`, telefone);

      // 2. SALVAR PARTICIPAÇÃO
      const lid_final = uuidLojaReal || String(loja_id);
      const { error: errPart } = await supabase.from('roleta_mesa_participacoes').insert({
        loja_id: lid_final,
        cliente_cpf: telefone,
        premio_id: premio.id,
        premio_nome: premio.nome,
        premio_valor: premio.valor,
        nota_nps: notaNps,
        oferta_google_dobro: notaNps === 5,
        premio_resgatado: false,
      });
      if (errPart) console.error('Erro ao salvar participação no banco:', errPart);

      // 3. REGISTRAR NO REMARKETING
      await sincronizarComRemarketig(telefone, premio);
      
    } catch (error) {
      console.error('Erro crítico no fluxo de salvamento:', error);
    }
  };

  const sincronizarComRemarketig = async (telefone: string, premio: any) => {
    try {
      const lid_final = uuidLojaReal || String(loja_id);
      const { data: existente } = await supabase.from('contatos_mesa_remarketing').select('id').eq('loja_id', lid_final).eq('cliente_cpf', telefone).limit(1);
      if (existente && existente.length > 0) {
        // Resetar status para nao_contatado para que reapareça no painel como novo lead de remarketing
        await supabase.from('contatos_mesa_remarketing')
          .update({ 
            premio_ganho: premio.nome, 
            nota_nps: notaNps, 
            status: 'nao_contatado',
            data_participacao: new Date().toISOString(),
            data_ultimo_contato: null 
          })
          .eq('id', existente[0].id);
      } else {
        const tags = [];
        if (notaNps === 5) tags.push('5_estrelas');
        if (premio.tipo === 'desconto') tags.push('desconto');
        if (premio.tipo === 'brinde') tags.push('brinde');
        await supabase.from('contatos_mesa_remarketing').insert({ 
          loja_id: lid_final, 
          cliente_cpf: telefone, 
          premio_ganho: premio.nome, 
          nota_nps: notaNps, 
          status: 'nao_contatado', 
          data_participacao: new Date().toISOString(), 
          tags: tags, 
          marketing_consentido: true 
        });
      }
    } catch (error) {
      console.error('Erro ao sincronizar remarketing:', error);
    }
  };

  if (etapa === 'resultado' && notaNps === 5 && premioGanho && !premioGanho.nome.toLowerCase().includes('tente') && premioGanho.tipo !== 'outro') {
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
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.View style={{ position: 'absolute', top: 20, left: 20, right: 20, zIndex: 100000, transform: [{ translateY: toastAnim as any }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 }}>
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
          <TouchableOpacity 
            onPress={() => router.replace('/')} 
            style={{ marginTop: 40, backgroundColor: c.roxo, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 15 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>VOLTAR AO INÍCIO</Text>
          </TouchableOpacity>
        </View>
      ) : etapa === 'telefone' ? (
        <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 25, paddingTop: 60 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>✨ ✨ ✨</Text>
          </View>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ fontSize: 48, fontWeight: '900', color: c.roxo }}>PALM</Text>
            <Text style={{ fontSize: 48, fontWeight: '900', color: c.roxo }}>SPRINGS</Text>
          </View>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 36 }}>✨ ✨ ✨</Text>
          </View>
          <TextInput placeholder="(00) 00000-0000" placeholderTextColor={c.subtexto} keyboardType="phone-pad" value={telefone} maxLength={15} onChangeText={(text) => {
            const clean = text.replace(/\D/g, '').slice(0, 11);
            const formatted = clean.length <= 2 ? `(${clean}` : clean.length <= 7 ? `(${clean.slice(0, 2)}) ${clean.slice(2)}` : `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
            setTelefone(formatted);
          }} style={[styles.inputGigante, { backgroundColor: c.card, borderColor: c.borda, color: c.texto }]} />
          <TouchableOpacity style={styles.buttonBig} onPress={avancarParaNPS} activeOpacity={0.8} disabled={carregando}>
            {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonTextBig}>JOGUE NA MESA 🕹️</Text>}
          </TouchableOpacity>
          <Text style={{ textAlign: 'center', color: c.subtexto, fontSize: 10, marginTop: 40 }}>v5.8.0-exchange</Text>
        </ScrollView>
      )}

      {etapa === 'nps' && (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <View style={{ width: '90%', maxWidth: 400 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: c.texto, textAlign: 'center', marginBottom: 8 }}>{perguntaCustom}</Text>
            <View style={{ marginBottom: 30, marginTop: 20 }}>
              {[1, 2, 3, 4, 5].map((nota) => (
                <TouchableOpacity key={nota} onPress={() => setNotaNps(nota)} style={{ backgroundColor: notaNps === nota ? c.roxo : c.card, borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: notaNps === nota ? c.roxo : c.borda }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{nota === 1 ? '😢' : nota === 2 ? '😞' : nota === 3 ? '😐' : nota === 4 ? '😊' : '😍'}</Text>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: notaNps === nota ? '#fff' : c.texto }}>{nota === 1 ? 'Muito ruim' : nota === 2 ? 'Ruim' : nota === 3 ? 'Regular' : nota === 4 ? 'Bom' : 'Excelente'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={avancarParaRoleta} style={{ backgroundColor: notaNps > 0 ? c.roxo : '#ccc', borderRadius: 12, padding: 16, alignItems: 'center' }} disabled={notaNps === 0}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>GIRAR A ROLETA →</Text></TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {etapa === 'roleta' && premiosRoletaMesa.length > 0 && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: c.roxo, marginBottom: 20 }}>{rodando ? '🎡 GIRANDO...' : 'BOA SORTE!'}</Text>
          <View style={{ zIndex: 10, marginBottom: -10 }}>
            <Svg width={50} height={50} viewBox="0 0 50 50">
               <Path d="M25 50 L50 5 L0 5 Z" fill="#1f8f7a" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            </Svg>
          </View>
          <Animated.View style={{ 
             padding: 12, 
             borderRadius: (Math.min(width * 0.85, 400) + 24) / 2, 
             backgroundColor: 'transparent',
             shadowColor: isDark ? c.roxo : '#000',
             shadowOffset: { width: 0, height: 0 },
             shadowOpacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.9] }),
             shadowRadius: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 35] }),
             elevation: 25,
             transform: [{ scale: scaleAnim }]
          }}>
            <Animated.View style={{ 
              width: Math.min(width * 0.85, 400), 
              height: Math.min(width * 0.85, 400), 
              transform: [{ 
                rotate: rotateAnim.interpolate({ inputRange: [0, 36000], outputRange: ['0deg', '36000deg'] })
              }] 
            }}>
              <Animated.View style={{ 
                width: '100%', height: '100%', 
                transform: [{ 
                  rotate: idleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) 
                }] 
              }}>
                <WheelSVG prizes={premiosRoletaMesa} size={Math.min(width * 0.85, 400)} isDark={isDark} />
              </Animated.View>
            </Animated.View>
          </Animated.View>
          <TouchableOpacity onPress={girarRoleta} disabled={rodando} style={{ backgroundColor: rodando ? '#ccc' : c.roxo, borderRadius: 16, paddingVertical: 22, paddingHorizontal: 50, alignItems: 'center', marginTop: 40, elevation: 10 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>{rodando ? 'GIRANDO...' : '🎰 GIRAR AGORA!'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {etapa === 'resultado' && premioGanho && (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <View style={{ alignItems: 'center', width: '90%', padding: 20 }}>
            <LinearGradient 
              colors={['#f59e0b', '#d97706']} 
              style={{ width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 25, elevation: 12 }}
            >
              <Text style={{ fontSize: 60 }}>{(premioGanho.nome.toLowerCase().includes('tente') || premioGanho.tipo === 'outro') ? '😕' : '🎁'}</Text>
            </LinearGradient>
            
            <Text style={{ fontSize: 16, fontWeight: '800', color: c.subtexto, letterSpacing: 2 }}>{(premioGanho.nome.toLowerCase().includes('tente') || premioGanho.tipo === 'outro') ? 'QUASE LÁ!' : 'PARABÉNS!'}</Text>
            
            <Text style={{ fontSize: 32, fontWeight: '900', color: c.texto, textAlign: 'center', marginTop: 15, lineHeight: 40 }}>
              {premioGanho.nome}
            </Text>

            <View style={{ backgroundColor: c.card, borderRadius: 24, padding: 30, marginTop: 30, borderWidth: 1, borderColor: c.borda, width: '100%', alignItems: 'center', elevation: 5 }}>
              <Text style={{ fontSize: 14, color: c.subtexto, textAlign: 'center', lineHeight: 20 }}>
                {(!premioGanho.nome.toLowerCase().includes('tente') && premioGanho.tipo !== 'outro') 
                  ? 'Mostre esta tela para o atendente e retire seu prêmio agora mesmo! 🍀' 
                  : 'Não foi dessa vez, mas não desista! Amanhã tem mais sorte pra você. ✨'}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => { setEtapa('telefone'); setTelefone(''); setNotaNps(0); setPremioGanho(null); rotateAnim.setValue(0); }} 
              style={{ backgroundColor: c.roxo, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 60, alignItems: 'center', marginTop: 40, width: '100%', elevation: 10 }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>VOLTAR AO INÍCIO 🏠</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
      <Text style={{ position: 'absolute', bottom: 10, color: c.subtexto, fontSize: 10, fontWeight: 'bold' }}>{APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGigante: { padding: 22, borderRadius: 20, fontSize: 32, fontWeight: '900', textAlign: 'center', borderWidth: 2, marginBottom: 20 },
  buttonBig: { padding: 22, borderRadius: 20, alignItems: 'center', backgroundColor: '#10b981' },
  buttonTextBig: { color: '#fff', fontWeight: '900', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

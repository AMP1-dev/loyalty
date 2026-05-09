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

// ─── Componente WheelSVG ──────────────────────────────────────────────────────
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
    const r = RADIUS * 0.7; 
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
          <Stop offset="0%" stopColor={isDark ? "#1e293b" : "#fdf8ec"} />
          <Stop offset="100%" stopColor={isDark ? "#0f172a" : "#f0e5d8"} />
        </SvgLinearGradient>
        <SvgLinearGradient id="gradMesa2" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={isDark ? "#134e4a" : "#d1fae5"} />
          <Stop offset="100%" stopColor={isDark ? "#042f2e" : "#a7f3d0"} />
        </SvgLinearGradient>
        <RadialGradient id="gCenterMesa" cx="50%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <Stop offset="50%" stopColor="#d1d5db" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#6b7280" stopOpacity="1" />
        </RadialGradient>
        <Filter id="dropShadowMesa" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <FeOffset dx="0" dy="8" result="offsetblur" />
          <FeComponentTransfer><FeFuncA type="linear" slope="0.4" /></FeComponentTransfer>
          <FeMerge><FeMergeNode /><FeMergeNode in="SourceGraphic" /></FeMerge>
        </Filter>
      </Defs>

      <G filter="url(#dropShadowMesa)">
        {prizes.map((prize: any, i: number) => {
          const { x, y, rotation } = getTextPos(i);
          const words = (prize.nome || '').split(' ');
          const displayLines = words.length > 2 ? [words.slice(0,2).join(' '), words.slice(2).join(' ')] : [prize.nome || ''];

          return (
            <G key={i}>
              <Path
                d={buildSlicePath(i)}
                fill={i % 2 === 0 ? 'url(#gradMesa1)' : 'url(#gradMesa2)'}
                stroke={isDark ? '#334155' : '#ffffff'}
                strokeWidth="2"
              />
              <G transform={`rotate(${rotation} ${x} ${y})`}>
                {displayLines.map((line, lineIdx) => {
                  const fontSize = numSlices > 8 ? 8 : 10;
                  const offsetY = (lineIdx - (displayLines.length - 1) / 2) * (fontSize + 2);
                  return (
                    <SvgText
                      key={lineIdx}
                      x={x}
                      y={y + offsetY}
                      fontSize={fontSize}
                      fontWeight="900"
                      textAnchor="middle"
                      fill={isDark ? "#e2e8f0" : "#1e293b"}
                    >
                      {line.toUpperCase()}
                    </SvgText>
                  );
                })}
              </G>
            </G>
          );
        })}
      </G>
      <Circle cx={CENTER} cy={CENTER} r={18} fill="url(#gCenterMesa)" stroke="#fff" strokeWidth="2" />
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

  const toggleTheme = () => setIsDark(!isDark);

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
      const { data: config } = await supabase.from('configuracoes_loja').select('*').eq('loja_id', loja_id).single();
      if (config) setConfigLoja(config);

      const { data: loja } = await supabase.from('lojas').select('nome').eq('id', loja_id).single();
      if (loja) setNomeLojaAtual(loja.nome);

      const { data: premios } = await supabase.from('roleta_mesa_premios').select('*').eq('loja_id', loja_id).eq('ativo', true);

      if (premios && premios.length > 0) {
        let listaBonita = [...premios];
        if (listaBonita.length > 0 && listaBonita.length < 6) {
           while(listaBonita.length < 6) {
             listaBonita = [...listaBonita, ...premios];
           }
        }
        setPremiosRoletaMesa(listaBonita);
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

  const validarJogueDiario = async (telefone: string, lojaId: string): Promise<boolean> => {
    try {
      const cleanTel = telefone.replace(/\D/g, '');
      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);

      const { data, error } = await supabase
        .from('roleta_mesa_participacoes')
        .select('id')
        .eq('loja_id', lojaId)
        .eq('cliente_cpf', cleanTel)
        .gte('created_at', inicioHoje.toISOString())
        .lt('created_at', fimHoje.toISOString())
        .limit(1);

      if (error) return true;
      if (data && data.length > 0) return false;
      return true;
    } catch (error) {
      return true;
    }
  };

  const validarTelefone = (tel: string): boolean => {
    const clean = tel.replace(/\D/g, '');
    if (clean.length !== 11) return false;
    const ddd = parseInt(clean.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;
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
      await sincronizarComRemarketig(telefone, premio);
      await salvarStorage(`mesa_telefone_${loja_id}`, telefone);
    } catch (error) {
      console.error('Erro ao salvar participação:', error);
    }
  };

  const sincronizarComRemarketig = async (telefone: string, premio: any) => {
    try {
      const { data: existente } = await supabase.from('contatos_mesa_remarketing').select('id').eq('loja_id', loja_id).eq('cliente_cpf', telefone).limit(1);
      if (existente && existente.length > 0) {
        await supabase.from('contatos_mesa_remarketing').update({ premio_ganho: premio.nome, nota_nps: notaNps, data_ultimo_contato: new Date().toISOString() }).eq('id', existente[0].id);
      } else {
        const tags = [];
        if (notaNps === 5) tags.push('5_estrelas');
        if (premio.tipo === 'desconto') tags.push('desconto');
        if (premio.tipo === 'brinde') tags.push('brinde');
        await supabase.from('contatos_mesa_remarketing').insert({ loja_id: loja_id, cliente_cpf: telefone, premio_ganho: premio.nome, nota_nps: notaNps, status: 'nao_contatado', data_participacao: new Date().toISOString(), tags: tags, marketing_consentido: true });
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
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={{ position: 'absolute', top: 20, left: 20, right: 20, zIndex: 100000, transform: [{ translateY: toastAnim as any }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 }}>
        <Text style={{ fontSize: 20, marginRight: 10 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, flex: 1 }}>{toast.mensagem}</Text>
      </Animated.View>

      {etapa === 'telefone' && (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 25, width: '100%', backgroundColor: c.bg }}>
          <TouchableOpacity onPress={toggleTheme} style={{ position: 'absolute', top: 20, right: 20, zIndex: 100, backgroundColor: c.card, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: c.borda }}><Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text></TouchableOpacity>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ color: c.roxo, fontSize: 48, fontWeight: '900', letterSpacing: 2, textAlign: 'center' }}>PALM SPRINGS</Text>
            <Text style={{ color: c.subtexto, fontSize: 13, fontWeight: '600', marginTop: 5 }}>seu clube de benefícios premium</Text>
          </View>
          <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
            <TextInput placeholder="(00) 00000-0000" placeholderTextColor={c.subtexto} keyboardType="phone-pad" value={telefone} maxLength={15} onChangeText={(text) => {
              const clean = text.replace(/\D/g, '').slice(0, 11);
              const formatted = clean.length <= 2 ? `(${clean}` : clean.length <= 7 ? `(${clean.slice(0, 2)}) ${clean.slice(2)}` : `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
              setTelefone(formatted);
            }} style={{ backgroundColor: c.card, borderColor: c.borda, color: c.texto, padding: 22, borderRadius: 20, fontSize: 32, fontWeight: '900', textAlign: 'center', borderWidth: 2, marginBottom: 20 }} />
            <TouchableOpacity onPress={avancarParaNPS} style={{ backgroundColor: c.roxo, padding: 22, borderRadius: 22, alignItems: 'center', shadowColor: c.roxo, shadowOpacity: 0.5, shadowRadius: 15, elevation: 8 }}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>JOGUE NA MESA 🕹️</Text></TouchableOpacity>
          </View>
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
          <View style={{ zIndex: 10, marginBottom: -15 }}><Svg width={40} height={40} viewBox="0 0 32 32"><Path d="M16 28 L6 6 L26 6 Z" fill={c.roxo} stroke="#fff" strokeWidth="2" strokeLinejoin="round" /></Svg></View>
          <Animated.View style={[{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }, { marginBottom: 30 }]}><WheelSVG prizes={premiosRoletaMesa} size={320} isDark={isDark} /></Animated.View>
          <TouchableOpacity onPress={girarRoleta} disabled={rodando} style={{ backgroundColor: rodando ? '#ccc' : c.roxo, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 40, alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{rodando ? 'GIRANDO...' : '🎰 GIRAR AGORA!'}</Text></TouchableOpacity>
        </View>
      )}

      {etapa === 'resultado' && premioGanho && (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <View style={{ alignItems: 'center', width: '90%' }}>
            <Text style={{ fontSize: 48, marginBottom: 20 }}>{(premioGanho.nome.toLowerCase().includes('tente') || premioGanho.tipo === 'outro') ? '😕' : '🎉'}</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: (premioGanho.nome.toLowerCase().includes('tente') || premioGanho.tipo === 'outro') ? '#64748B' : c.roxo, textAlign: 'center', marginBottom: 12 }}>{(premioGanho.nome.toLowerCase().includes('tente') || premioGanho.tipo === 'outro') ? 'QUASE LÁ!' : 'PARABÉNS!'}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.texto, textAlign: 'center', marginBottom: 20 }}>{premioGanho.nome}</Text>
            <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 25, marginBottom: 20, borderWidth: 1, borderColor: c.borda, minWidth: 300, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: c.subtexto, marginBottom: 12, fontWeight: '700' }}>VOCÊ GANHOU</Text>
              <Text style={{ fontSize: 36, fontWeight: '900', color: (premioGanho.nome.toLowerCase().includes('tente') || premioGanho.tipo === 'outro') ? '#64748B' : c.roxo, textAlign: 'center' }}>{premioGanho.tipo === 'desconto' ? `${premioGanho.valor}%` : `${premioGanho.nome}`}</Text>
              {(!premioGanho.nome.toLowerCase().includes('tente') && premioGanho.tipo !== 'outro') && <Text style={{ fontSize: 14, color: c.subtexto, marginTop: 10, textAlign: 'center' }}>{premioGanho.tipo === 'desconto' ? 'de desconto para sua próxima visita!' : 'Retire seu brinde com o atendente'}</Text>}
            </View>
            <TouchableOpacity onPress={() => { setEtapa('telefone'); setTelefone(''); setNotaNps(0); setPremioGanho(null); rotateAnim.setValue(0); }} style={{ backgroundColor: c.roxo, borderRadius: 12, padding: 16, alignItems: 'center', minWidth: 300 }}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>JOGAR NOVAMENTE? 🎮</Text></TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({});

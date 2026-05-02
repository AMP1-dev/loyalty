import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View, Vibration } from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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

export default function Cliente() {
  const params = useLocalSearchParams();
  const loja_id = params?.loja_id;

  const[cpf, setCpf] = useState('');
  const [status, setStatus] = useState<'idle' | 'aguardando' | 'finalizado'>('idle');
  
  const [saldo, setSaldo] = useState(0);
  const[cashback, setCashback] = useState(0);
  const[saldoLocal, setSaldoLocal] = useState(0);
  const [cashbackLocal, setCashbackLocal] = useState(0);
  
  const[displayCash, setDisplayCash] = useState(0);
  const[displaySaldo, setDisplaySaldo] = useState(0); 

  const[nomeLojaAtual, setNomeLojaAtual] = useState(''); 
  const[recompensas, setRecompensas] = useState<any[]>([]);
  const [recompensasRede, setRecompensasRede] = useState<any[]>([]); 
  const [resgatados, setResgatados] = useState<string[]>([]);
  const[banners, setBanners] = useState<any[]>([]); 

  const[mostrarExtrato, setMostrarExtrato] = useState(false);
  const[extrato, setExtrato] = useState<any[]>([]);

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
  const pulseWin = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(-200)).current;

  const[toast, setToast] = useState({ visible: false, message: '', tipo: 'sucesso' });
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
  const[isDark, setIsDark] = useState(temaSistema === 'dark');
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

  const spin = rotateAnim.interpolate({ inputRange:[0, 1], outputRange:['0deg', '360deg'] });
  const wheelSpin = rotateAnim.interpolate({ inputRange:[0, 1], outputRange:['0deg', `${rotation}deg`] });
  const neonColor = colorAnim.interpolate({ inputRange:[0, 0.33, 0.66, 1], outputRange:['#10b981', '#0ea5e9', '#ec4899', '#10b981'] });

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

    // Loop do brilho metálico
    const animarBrilho = () => {
      shineAnim.setValue(-200);
      Animated.sequence([
        Animated.delay(3000),
        Animated.timing(shineAnim, { toValue: 400, duration: 1500, useNativeDriver: true })
      ]).start(() => animarBrilho());
    };
    animarBrilho();
  }, [loja_id]);

  useEffect(() => {
    if (status !== 'aguardando') return;
    
    rotateAnim.setValue(0); pulse.setValue(1);
    Animated.loop(Animated.sequence([ Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }) ])).start();
    const girarInfinitamente = () => { rotateAnim.setValue(0); Animated.timing(rotateAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => { if (finished) girarInfinitamente(); }); };
    girarInfinitamente();

    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Fallback: Polling de segurança caso o Realtime falhe
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

  const carregarDados = async (cpfBusca: string, lojaIdEfetivo?: string) => {
    const { data: lojas } = await supabase.from('lojas').select('id, nome');
    const { data: premiosRaw } = await supabase.from('recompensas').select('id, nome');
    const { data: configs } = await supabase.from('configuracoes_loja').select('loja_id, cidade, roleta_ativa, roleta_intervalo_dias');
    const mapLojas: any = {}; (lojas ||[]).forEach(l => mapLojas[l.id] = l.nome);
    const mapPremios: any = {}; (premiosRaw ||[]).forEach(p => mapPremios[p.id] = p.nome);
    const lidEfetivo = lojaIdEfetivo || String(loja_id);

    if (lidEfetivo && lidEfetivo !== 'undefined' && lidEfetivo !== 'null') {
      setNomeLojaAtual(mapLojas[lidEfetivo] || 'Loja Parceira');
      await salvarStorage('@last_loja_id', lidEfetivo);
    } else {
      setNomeLojaAtual('Minha Carteira PALM');
    }

    const configAtual = (configs ||[]).find(c => String(c.loja_id) === lidEfetivo);
    setConfigLoja(configAtual || null);

    const { data: ban } = await supabase.from('banners').select('*').eq('ativo', true).order('ordem', { ascending: true });
    setBanners(ban ||[]);

    const { data: trans } = await supabase.from('transacoes').select('*').eq('cliente_cpf', cpfBusca);
    const { data: res } = await supabase.from('resgates').select('*').eq('cliente_cpf', cpfBusca);
    const { data: cash } = await supabase.from('cashbacks').select('*').eq('cliente_cpf', cpfBusca);

    const totalGlobal = (trans ||[]).reduce((a, t) => a + (t.pontos_gerados || 0), 0);
    const usadosGlobal = (res ||[]).reduce((a, r) => a + (r.pontos_usados || 0), 0);
    setSaldo(totalGlobal - usadosGlobal);
    setResgatados((res ||[]).map((r) => String(r.recompensa_id)));
    setCashback((cash ||[]).filter(c => c.usado === false).reduce((s, c) => s + Number(c.valor), 0));

    if (lidEfetivo && lidEfetivo !== 'undefined') {
      const tLocal = (trans ||[]).filter(t => String(t.loja_id) === String(lidEfetivo)).reduce((a, t) => a + (t.pontos_gerados || 0), 0);
      const uLocal = (res ||[]).filter(r => String(r.loja_id) === String(lidEfetivo)).reduce((a, r) => a + (r.pontos_usados || 0), 0);
      setSaldoLocal(tLocal - uLocal);
      const cLocal = (cash ||[]).filter(c => String(c.loja_id) === String(lidEfetivo) && c.usado === false).reduce((s, c) => s + Number(c.valor), 0);
      setCashbackLocal(cLocal);
      const { data: rec } = await supabase.from('recompensas').select('*').eq('loja_id', String(lidEfetivo)).eq('ativo', true).order('custo_pontos', { ascending: true });
      setRecompensas(rec ||[]);
    }

    const historicoMap: any = {};
    (trans ||[]).forEach(t => {
      const dataChave = t.created_at.substring(0, 16); 
      const chaveId = `${t.loja_id}_${dataChave}`; 
      historicoMap[chaveId] = { id: Math.random().toString(), tipo: 'compra', loja: mapLojas[t.loja_id] || 'Rede PALM', valor: t.valor, pontos: t.pontos_gerados, valor_cashback: 0, data: t.created_at };
    });
    const historicoTemporario = Object.values(historicoMap);
    historicoTemporario.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setExtrato(historicoTemporario);

    const { data: recRede } = await supabase.from('recompensas').select('*').eq('ativo', true).order('custo_pontos', { ascending: true }).limit(10);
    setRecompensasRede((recRede ||[]).map(r => ({ ...r, nomeLoja: mapLojas[r.loja_id] || 'Loja Parceira' })));
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
    const cleaned = text.replace(/\D/g, ''); let formatted = cleaned;
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
    const lid = loja_id || configLoja?.loja_id || '1';
    let somaProbs = 0; premiosRoleta.forEach(p => somaProbs += Number(p.probabilidade));
    let random = Math.random() * somaProbs;
    let premioSorteado = premiosRoleta[premiosRoleta.length - 1]; 
    for (const p of premiosRoleta) { if (random < Number(p.probabilidade)) { premioSorteado = p; break; } random -= Number(p.probabilidade); }
    
    const sliceAngle = 360 / premiosRoleta.length;
    const indexPremio = premiosRoleta.findIndex(p => p.id === premioSorteado.id);
    const midSlice = (indexPremio * sliceAngle) + (sliceAngle / 2);
    
    // Calcula a rotação para alinhar o centro da fatia com o topo (270 graus)
    // Adicionamos 360 para garantir que o valor seja positivo antes do modulo
    const targetRotate = (12 * 360) + ((270 - midSlice + 360) % 360); 

    setRotation(targetRotate);
    rotateAnim.setValue(0);

    // Haptics during spin
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

  const banner1 = banners.find(b => b.ordem === 1); const banner2 = banners.find(b => b.ordem === 2);

  if (status === 'idle') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={styles.scroll}>
        <Text style={[styles.logo, { color: c.neonVerde }]}>PALM SPRINGS</Text>
        <Text style={{ textAlign: 'center', color: c.subtexto, marginBottom: 40, fontSize: 16 }}>Sua carteira de benefícios premium</Text>
        <TextInput placeholder="(19) 99999-9999" placeholderTextColor={c.subtexto} value={cpf} onChangeText={formatarTelefone} keyboardType="phone-pad" maxLength={15} style={[styles.inputGigante, { backgroundColor: c.card, borderColor: c.borda, color: c.texto }]} />
        <TouchableOpacity style={styles.buttonBig} onPress={entrarFila} activeOpacity={0.8}><Text style={styles.buttonTextBig}>ACESSAR MINHA CARTEIRA</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  if (status === 'aguardando') {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Animated.View style={[styles.aiCircle, { transform:[{ scale: pulse }, { rotate: spin }], borderColor: '#14b8a6', backgroundColor: c.card }]} />
        <Text style={{ marginTop: 20, color: c.texto, fontWeight: 'bold' }}>Aguardando liberação do lojista...</Text>
        <Text style={{ color: c.subtexto, fontSize: 12, marginTop: 5 }}>Você será redirecionado automaticamente</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* HEADER */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.logoMini, { color: c.neonVerde }]}>PALM SPRINGS</Text>
                <Text style={{ color: c.subtexto, fontSize: 10, fontWeight: 'bold' }}>CLUBE DE VANTAGENS</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDark(!isDark)} style={{ padding: 10, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.borda }}>
                <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
           </View>
           
           <View style={{ flexDirection: 'row', gap: 12, marginTop: 25 }}>
              <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, shadowColor: c.neonVerde, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 }]}>
                <Text style={{ color: c.subtexto, fontSize: 10, fontWeight: 'bold' }}>SPRINGS (REDE)</Text>
                <Text style={{ color: c.neonVerde, fontSize: 32, fontWeight: '900', marginTop: 5 }}>✨ {Math.floor(displaySaldo)}</Text>
              </View>
              <View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda }]}>
                <Text style={{ color: c.subtexto, fontSize: 10, fontWeight: 'bold' }}>CASHBACK (REDE)</Text>
                <Text style={{ color: c.neonAmarelo, fontSize: 24, fontWeight: '900', marginTop: 5 }}>💰 R$ {displayCash.toFixed(2)}</Text>
              </View>
           </View>
        </View>

        {/* METALLIC TRIGGER BUTTON */}
        <View style={{ alignItems: 'center', marginVertical: 35 }}>
          <TouchableOpacity onPress={abrirRoleta} activeOpacity={0.8}>
             <LinearGradient colors={['#f8fafc', '#94a3b8', '#475569']} style={styles.metallicButton}>
                <View style={styles.metallicInner}>
                   <Svg width="50" height="50" viewBox="0 0 100 100">
                     <Circle cx="50" cy="50" r="45" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4,4" />
                     <Path d="M50 20 L55 35 L70 40 L55 45 L50 60 L45 45 L30 40 L45 35 Z" fill="#fff" />
                     <Path d="M75 15 L78 22 L85 25 L78 28 L75 35 L72 28 L65 25 L72 22 Z" fill="#fff" opacity={0.6} />
                   </Svg>
                   <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12, marginTop: 5 }}>JOGAR AGORA</Text>
                </View>
                {/* SHINE EFFECT */}
                <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 80 }}>
                   <Animated.View style={{ width: '40%', height: '200%', backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ translateX: shineAnim }, { rotate: '25deg' }] }} />
                </Animated.View>
                {/* RIVETS */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                   <View key={a} style={[styles.rivet, { transform: [{ rotate: `${a}deg` }, { translateY: -73 }] }]}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1', borderWidth: 1, borderColor: '#475569' }} />
                   </View>
                ))}
             </LinearGradient>
          </TouchableOpacity>
          <Text style={{ color: c.subtexto, fontSize: 10, marginTop: 15, fontWeight: '900', letterSpacing: 2 }}>ROLETA DA SORTE</Text>
        </View>

        {/* BANNERS */}
        {banner1 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 25 }}>
             <TouchableOpacity style={[styles.bannerCard, { borderColor: c.borda }]}>
                <Image source={{ uri: banner1.imagem }} style={styles.bannerImage} />
                <View style={styles.bannerOverlay}>
                  <Text style={styles.bannerTitle}>{banner1.titulo}</Text>
                  <Text style={styles.bannerSub}>{banner1.subtitulo}</Text>
                </View>
             </TouchableOpacity>
          </View>
        )}

        {/* RECOMPENSAS */}
        <View>
          <Text style={[styles.sectionTitle, { color: c.texto, paddingHorizontal: 20 }]}>🎁 Brindes e Vantagens</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
            {recompensas.map(r => (
              <View key={r.id} style={[styles.cardRecompensa, { backgroundColor: c.card, borderColor: c.borda }]}>
                {r.imagem ? <Image source={{ uri: r.imagem }} style={styles.imageRec} /> : <View style={styles.imagePlaceholder}><Text style={{ fontSize: 40 }}>🎁</Text></View>}
                <View style={styles.overlayRec}>
                  <Text style={styles.nomeRec} numberOfLines={2}>{r.nome}</Text>
                  <Text style={{ color: c.neonVerde, fontWeight: '900' }}>{r.custo_pontos} SPG</Text>
                  <TouchableOpacity style={[styles.botaoRec, { backgroundColor: getEstado(r).c }]} onPress={() => resgatar(r)} disabled={getEstado(r).d}><Text style={styles.botaoTexto}>{getEstado(r).t}</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.botaoSair} onPress={sairDaCarteira}><Text style={{ color: '#ef4444', fontWeight: 'bold' }}>🚪 SAIR DA CONTA</Text></TouchableOpacity>
        <Text style={{ textAlign: 'center', color: c.subtexto, fontSize: 10, marginTop: 30 }}>Versão 4.6.2-pro-platinum</Text>

      </ScrollView>

      {/* NEW METALLIC ROLETA MODAL */}
      {mostrarRoletaModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {etapaRoleta === 'nps' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Antes de girar...</Text>
                {perguntasNps.map(p => (
                  <View key={p.id} style={{ marginTop: 25, backgroundColor: isDark ? '#0f172a' : '#f1f5f9', padding: 20, borderRadius: 20 }}>
                    <Text style={{ color: c.texto, textAlign: 'center', fontWeight: 'bold', marginBottom: 15 }}>{p.pergunta}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                      {[1,2,3,4,5].map(s => <TouchableOpacity key={s} onPress={() => setRespostasNps({...respostasNps, [p.id]: s})}><Text style={{ fontSize: 32, opacity: respostasNps[p.id] >= s ? 1 : 0.2 }}>⭐</Text></TouchableOpacity>)}
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={[styles.buttonBig, { marginTop: 30 }]} onPress={() => setEtapaRoleta('girando')}><Text style={styles.buttonTextBig}>LIBERAR ROLETA 🎡</Text></TouchableOpacity>
              </ScrollView>
            )}
            {etapaRoleta === 'girando' && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 30 }}>BOA SORTE! 🍀</Text>
                
                {/* METALLIC WHEEL DESIGN */}
                <View style={{ position: 'relative', width: 320, height: 320, alignItems: 'center', justifyContent: 'center' }}>
                  {/* METALLIC ARROW */}
                  <View style={{ position: 'absolute', top: -10, zIndex: 100 }}><Svg width="40" height="40" viewBox="0 0 40 40"><Path d="M20 35 L5 5 L35 5 Z" fill="#14b8a6" stroke="#fff" strokeWidth="2" /></Svg></View>
                  
                  <Animated.View style={{ width: 300, height: 300, borderRadius: 150, transform: [{ rotate: wheelSpin }], borderWidth: 10, borderColor: '#94a3b8', backgroundColor: '#020617' }}>
                    <Svg width="100%" height="100%" viewBox="0 0 100 100">
                      <Defs>
                         <RadialGradient id="gradCentral" cx="50%" cy="50%" rx="50%" ry="50%"><Stop offset="0%" stopColor="#fff" /><Stop offset="100%" stopColor="#94a3b8" /></RadialGradient>
                      </Defs>
                      {premiosRoleta.map((p, i) => {
                        const angle = 360 / premiosRoleta.length;
                        const start = i * angle; const end = (i + 1) * angle;
                        const x1 = 50 + 45 * Math.cos(Math.PI * start / 180); const y1 = 50 + 45 * Math.sin(Math.PI * start / 180);
                        const x2 = 50 + 45 * Math.cos(Math.PI * end / 180); const y2 = 50 + 45 * Math.sin(Math.PI * end / 180);
                        return (
                          <G key={i}>
                            <Path d={`M50 50 L${x1} ${y1} A45 45 0 0 1 ${x2} ${y2} Z`} fill={i % 2 === 0 ? '#fdf8ec' : '#dcfce7'} stroke="#94a3b8" strokeWidth="0.5" />
                            <G transform={`rotate(${i * angle + angle / 2} 50 50)`}>
                              <SvgText x="75" y="52" fill="#475569" fontSize="3.5" fontWeight="900" textAnchor="middle" transform="rotate(90 75 52)">{p.nome.substring(0,12).toUpperCase()}</SvgText>
                            </G>
                          </G>
                        );
                      })}
                      <Circle cx="50" cy="50" r="10" fill="url(#gradCentral)" stroke="#475569" strokeWidth="1" />
                    </Svg>
                  </Animated.View>
                </View>

                <TouchableOpacity style={[styles.buttonBig, { marginTop: 40, width: '100%' }]} onPress={girarRoleta} disabled={rodando}><Text style={styles.buttonTextBig}>{rodando ? 'SORTEANDO...' : 'GIRAR AGORA!'}</Text></TouchableOpacity>
              </View>
            )}
            {etapaRoleta === 'resultado' && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 60 }}>{premioGanho?.tipo === 'nada' ? '😢' : '🎉'}</Text>
                <Text style={styles.modalTitle}>{premioGanho?.nome}</Text>
                <TouchableOpacity style={[styles.buttonBig, { marginTop: 30, width: '100%' }]} onPress={() => setMostrarRoletaModal(false)}><Text style={styles.buttonTextBig}>FECHAR</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
  metallicButton: { width: 160, height: 160, borderRadius: 80, justifyContent: 'center', alignItems: 'center', padding: 5, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  metallicInner: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(15, 23, 42, 0.9)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', zIndex: 5 },
  rivet: { position: 'absolute', width: 10, height: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15 },
  bannerCard: { height: 180, borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  bannerImage: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover', opacity: 0.6 },
  bannerOverlay: { flex: 1, padding: 20, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  bannerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  bannerSub: { color: '#fff', fontSize: 14, marginTop: 4 },
  cardRecompensa: { width: 220, height: 300, borderRadius: 24, marginRight: 15, overflow: 'hidden', borderWidth: 1 },
  imageRec: { width: '100%', height: '100%', position: 'absolute' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  overlayRec: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, backgroundColor: 'rgba(0,0,0,0.85)' },
  nomeRec: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botaoRec: { padding: 12, borderRadius: 12, marginTop: 10, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 9999 },
  modalCard: { backgroundColor: '#1e293b', width: '100%', maxWidth: 450, padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  botaoSair: { marginTop: 30, padding: 18, alignItems: 'center', marginHorizontal: 20, borderWidth: 1, borderRadius: 16, borderColor: '#ef4444' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aiCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, borderTopColor: 'transparent' }
});
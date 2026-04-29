import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
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

const WHEEL_COLORS = ['#f8f5e9', '#e1f3f0']; // Creme e Verde Água Premium
const getIconForPrize = (nome: string) => {
  const n = nome.toLowerCase();
  if (n.includes('pontos') || n.includes('spg')) return '⭐';
  if (n.includes('cashback') || n.includes('reais')) return '💰';
  if (n.includes('café') || n.includes('cappuccino')) return '☕';
  if (n.includes('brinde') || n.includes('surpresa')) return '🎁';
  if (n.includes('ferramenta') || n.includes('kit')) return '🛠️';
  return '✨';
};

export default function Cliente() {
  const params = useLocalSearchParams();
  const loja_id = params?.loja_id;

  const[cpf, setCpf] = useState('');
  const [status, setStatus] = useState<'idle' | 'aguardando' | 'finalizado'>('idle');
  
  // Saldos Globais
  const [saldo, setSaldo] = useState(0);
  const[cashback, setCashback] = useState(0);
  
  // 🔥 NOVO: Saldos Locais (Exclusivos da Loja Atual)
  const[saldoLocal, setSaldoLocal] = useState(0);
  const [cashbackLocal, setCashbackLocal] = useState(0);
  
  const[displayCash, setDisplayCash] = useState(0);
  const[displaySaldo, setDisplaySaldo] = useState(0); 

  const[nomeLojaAtual, setNomeLojaAtual] = useState(''); 
  const[recompensas, setRecompensas] = useState<any[]>([]);
  const [recompensasRede, setRecompensasRede] = useState<any[]>([]); 
  const [resgatados, setResgatados] = useState<string[]>([]);
  const [resgatesHoje, setResgatesHoje] = useState(0);
  const[banners, setBanners] = useState<any[]>([]); 

  const[mostrarExtrato, setMostrarExtrato] = useState(false);
  const[extrato, setExtrato] = useState<any[]>([]);

  // 🔥 NOVO: Estados da Roleta e NPS
  const [brindesPendentes, setBrindesPendentes] = useState<any[]>([]);
  const [configLoja, setConfigLoja] = useState<any>(null);
  
  const [mostrarRoletaModal, setMostrarRoletaModal] = useState(false);
  const [etapaRoleta, setEtapaRoleta] = useState<'nps' | 'girando' | 'resultado'>('nps');
  const [perguntasNps, setPerguntasNps] = useState<any[]>([]);
  const [premiosRoleta, setPremiosRoleta] = useState<any[]>([]);
  const [respostasNps, setRespostasNps] = useState<any>({});
  const [premioGanho, setPremioGanho] = useState<any>(null);

  const [slotItems, setSlotItems] = useState<any[]>([]);
  const slotAnim = useRef(new Animated.Value(0)).current;
  const pulseWin = useRef(new Animated.Value(1)).current; // 🔥 ANIMAÇÃO DE PULSAR SALDO

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
    bg: isDark ? '#0F172A' : '#F8FAFC', card: isDark ? '#020617' : '#FFFFFF',
    borda: isDark ? '#1e293b' : '#E2E8F0', texto: isDark ? '#F8FAFC' : '#0F172A',
    subtexto: isDark ? '#94a3b8' : '#64748B', neonVerde: isDark ? '#10b981' : '#059669',
    neonAmarelo: isDark ? '#facc15' : '#D97706',
  };

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current; 
  const animatedCash = useRef(new Animated.Value(0)).current;
  const animatedSaldo = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    const initApp = async () => { 
      const saved = await carregarStorage('cliente_cpf'); 
      if (saved) {
        setCpf(saved); 
        if (!loja_id) { await carregarDados(saved); setStatus('finalizado'); }
      }
    };
    initApp();
  }, [loja_id]);

  useEffect(() => {
    Animated.timing(animatedCash, { toValue: cashback, duration: 1200, useNativeDriver: false }).start();
    const listener = animatedCash.addListener(({ value }) => setDisplayCash(value));
    return () => animatedCash.removeListener(listener);
  }, [cashback]);

  useEffect(() => {
    Animated.timing(animatedSaldo, { toValue: saldo, duration: 1200, useNativeDriver: false }).start();
    const listener = animatedSaldo.addListener(({ value }) => setDisplaySaldo(value));
    
    // 🔥 Efeito de pulsar se o saldo aumentar
    if (saldo > 0) {
      Animated.sequence([
        Animated.timing(pulseWin, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.spring(pulseWin, { toValue: 1, friction: 3, useNativeDriver: true })
      ]).start();
    }
    
    return () => animatedSaldo.removeListener(listener);
  }, [saldo]);

  useEffect(() => {
    if (status !== 'aguardando') return;
    rotateAnim.setValue(0); pulse.setValue(1); colorAnim.setValue(0);

    Animated.loop(Animated.sequence([ Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }) ])).start();
    const girarInfinitamente = () => { rotateAnim.setValue(0); Animated.timing(rotateAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => { if (finished) girarInfinitamente(); }); };
    girarInfinitamente();
    Animated.loop(Animated.timing(colorAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: false })).start();
  }, [status]);

  const innerPulse = pulse.interpolate({ inputRange:[1, 1.15], outputRange:[1, 0.4] });
  const spin = rotateAnim.interpolate({ inputRange:[0, 1], outputRange:['0deg', '360deg'] });
  const wheelSpin = rotateAnim.interpolate({ inputRange:[0, 1], outputRange:['0deg', '1440deg'] }); // 4 voltas para o jogo
  const neonColor = colorAnim.interpolate({ inputRange:[0, 0.33, 0.66, 1], outputRange:['#10b981', '#0ea5e9', '#ec4899', '#10b981'] });

  useEffect(() => {
    if (status !== 'aguardando' || !cpf) return;
    const interval = setInterval(async () => {
      const clean = cpf.replace(/\D/g, '');
      const { data } = await supabase.from('checkins').select('*').eq('cliente_cpf', clean).eq('loja_id', String(loja_id));

      if (!data || data.length === 0) {
        setTimeout(async () => {
          await carregarDados(clean);
          setStatus('finalizado');
          if (Platform.OS === 'web') window.history.replaceState({}, '', '/cliente'); else router.setParams({ loja_id: '' });
        }, 500); 
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [status, cpf, loja_id]);

  const carregarDados = async (cpfBusca: string) => {
    const { data: lojas } = await supabase.from('lojas').select('id, nome');
    const { data: premiosRaw } = await supabase.from('recompensas').select('id, nome');
    const { data: configs } = await supabase.from('configuracoes_loja').select('loja_id, cidade, roleta_ativa, roleta_intervalo_dias'); // Busca Cidades da Rede e configs


    const mapLojas: any = {}; (lojas ||[]).forEach(l => mapLojas[l.id] = l.nome);
    const mapPremios: any = {}; (premiosRaw ||[]).forEach(p => mapPremios[p.id] = p.nome);

    if (loja_id) setNomeLojaAtual(mapLojas[String(loja_id)] || 'Loja Parceira');
    else setNomeLojaAtual('Minha Carteira PALM');

    const configAtual = (configs ||[]).find(c => String(c.loja_id) === String(loja_id));
    setConfigLoja(configAtual || null);

    const { data: ban } = await supabase.from('banners').select('*').eq('ativo', true).order('ordem', { ascending: true });
    setBanners(ban ||[]);

    const { data: brindesData } = await supabase.from('brindes_pendentes').select('*').eq('cliente_cpf', cpfBusca).eq('resgatado', false);
    setBrindesPendentes((brindesData || []).map(b => ({ ...b, nomeLoja: mapLojas[b.loja_id] || 'Loja Parceira' })));

    const { data: trans } = await supabase.from('transacoes').select('*').eq('cliente_cpf', cpfBusca);
    const { data: res } = await supabase.from('resgates').select('*').eq('cliente_cpf', cpfBusca);
    const { data: cash } = await supabase.from('cashbacks').select('*').eq('cliente_cpf', cpfBusca);

    // 🔥 SALDO GLOBAL
    const totalGlobal = (trans ||[]).reduce((a, t) => a + (t.pontos_gerados || 0), 0);
    const usadosGlobal = (res ||[]).reduce((a, r) => a + (r.pontos_usados || 0), 0);
    setSaldo(totalGlobal - usadosGlobal);
    setResgatados((res ||[]).map((r) => String(r.recompensa_id)));
    
    // Contagem de resgates diários para limite
    const hojeStr = new Date().toDateString();
    const qtdHoje = (res ||[]).filter(r => new Date(r.created_at).toDateString() === hojeStr).length;
    setResgatesHoje(qtdHoje);

    setCashback((cash ||[]).filter(c => c.usado === false).reduce((s, c) => s + Number(c.valor), 0));

    // 🔥 SALDO LOCAL (Apenas da Loja Logada)
    if (loja_id) {
      const tLocal = (trans ||[]).filter(t => String(t.loja_id) === String(loja_id)).reduce((a, t) => a + (t.pontos_gerados || 0), 0);
      const uLocal = (res ||[]).filter(r => String(r.loja_id) === String(loja_id)).reduce((a, r) => a + (r.pontos_usados || 0), 0);
      setSaldoLocal(tLocal - uLocal);
      const cLocal = (cash ||[]).filter(c => String(c.loja_id) === String(loja_id) && c.usado === false).reduce((s, c) => s + Number(c.valor), 0);
      setCashbackLocal(cLocal);
    }

    const historicoMap: any = {};
    (trans ||[]).forEach(t => {
      const dataChave = t.created_at.substring(0, 16); 
      const chaveId = `${t.loja_id}_${dataChave}`; 
      historicoMap[chaveId] = { id: Math.random().toString(), tipo: 'compra', loja: mapLojas[t.loja_id] || 'Rede PALM', valor: t.valor, pontos: t.pontos_gerados, valor_cashback: 0, data: t.created_at };
    });
    (cash ||[]).forEach(c => {
      const dataChave = c.created_at.substring(0, 16);
      const chaveId = `${c.loja_id}_${dataChave}`;
      if (historicoMap[chaveId]) historicoMap[chaveId].valor_cashback += Number(c.valor);
      else historicoMap[`cash_${Math.random()}`] = { id: Math.random().toString(), tipo: 'cashback', loja: mapLojas[c.loja_id] || 'Rede PALM', valor_cashback: c.valor, data: c.created_at };
    });
    (res ||[]).forEach(r => {
      historicoMap[`resgate_${Math.random()}`] = { id: Math.random().toString(), tipo: 'resgate', loja: mapLojas[r.loja_id] || 'Rede PALM', premio: mapPremios[r.recompensa_id] || 'Prêmio', pontos: r.pontos_usados, data: r.created_at };
    });

    const historicoTemporario = Object.values(historicoMap);
    historicoTemporario.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setExtrato(historicoTemporario);

    if (loja_id) {
      const { data: rec } = await supabase.from('recompensas').select('*').eq('loja_id', String(loja_id)).eq('ativo', true).order('custo_pontos', { ascending: true });
      setRecompensas(rec ||[]);

      // 🔥 FILTRO DE PROXIMIDADE GEOGRÁFICA
      const cidadeAtual = (configs ||[]).find(c => String(c.loja_id) === String(loja_id))?.cidade || '';
      
      const lojasVizinhas = (configs ||[])
        .filter(c => c.cidade && c.cidade.toLowerCase() === cidadeAtual.toLowerCase() && String(c.loja_id) !== String(loja_id))
        .map(c => String(c.loja_id));

      if (lojasVizinhas.length > 0) {
        const { data: recRede } = await supabase.from('recompensas').select('*').in('loja_id', lojasVizinhas).eq('ativo', true).order('custo_pontos', { ascending: true });
        
        // Limita a 3 prêmios por loja vizinha para não travar a tela
        const limitadorLoja: any = {};
        const redeFiltrada: any[] = [];
        (recRede ||[]).forEach(r => {
          const lid = String(r.loja_id);
          if (!limitadorLoja[lid]) limitadorLoja[lid] = 0;
          if (limitadorLoja[lid] < 3) {
            limitadorLoja[lid]++;
            redeFiltrada.push({ ...r, nomeLoja: mapLojas[lid] || 'Loja Parceira' });
          }
        });
        setRecompensasRede(redeFiltrada);
      } else {
        setRecompensasRede([]); // Nenhuma loja parceira na mesma cidade
      }

    } else {
      setRecompensas([]);
      const { data: recRede } = await supabase.from('recompensas').select('*').eq('ativo', true).order('custo_pontos', { ascending: true }).limit(15);
      setRecompensasRede((recRede ||[]).map(r => ({ ...r, nomeLoja: mapLojas[r.loja_id] || 'Loja Parceira' })));
    }
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
    
    if (!loja_id) {
      await salvarStorage('cliente_cpf', clean); await carregarDados(clean); setStatus('finalizado'); return;
    }

    const { data: configLoja } = await supabase.from('configuracoes_loja').select('tempo_bloqueio_minutos').eq('loja_id', String(loja_id)).maybeSingle();
    const tempoBloqueio = configLoja?.tempo_bloqueio_minutos || 0;

    if (tempoBloqueio > 0) {
      const { data: ultimaTransacao } = await supabase.from('transacoes').select('created_at').eq('cliente_cpf', clean).eq('loja_id', String(loja_id)).order('created_at', { ascending: false }).limit(1);

      if (ultimaTransacao && ultimaTransacao.length > 0) {
        const dataUltima = new Date(ultimaTransacao[0].created_at);
        const diffMinutos = Math.floor((new Date().getTime() - dataUltima.getTime()) / 60000);

        if (diffMinutos < tempoBloqueio) {
          mostrarToast(`⏳ Aguarde ${tempoBloqueio - diffMinutos} minuto(s) para pontuar novamente.`, 'erro'); return; 
        }
      }
    }

    await salvarStorage('cliente_cpf', clean);
    await supabase.from('clientes').upsert({ cpf: clean });
    await supabase.from('checkins').insert([{ cliente_cpf: clean, loja_id: String(loja_id), status: 'aguardando' }]);
    setStatus('aguardando');
  };

  const resgatar = async (r: any) => {
    const clean = cpf.replace(/\D/g, '');
    const { error } = await supabase.rpc('realizar_resgate', { p_cliente_cpf: clean, p_loja_id: String(loja_id), p_recompensa_id: r.id });
    if (error) { mostrarToast(error.message, 'erro'); return; }
    mostrarToast('🎁 Resgate realizado! O Lojista já foi avisado.', 'sucesso'); 
    await carregarDados(clean);
  };

  const getEstado = (r: any) => {
    // Validação de Limite por Cliente (Se existir limite e o cliente já atingiu)
    if (r.limite_por_cliente > 0) {
      const qtdResgatada = resgatados.filter(id => id === String(r.id)).length;
      if (qtdResgatada >= r.limite_por_cliente) return { t: 'LIMITE ATINGIDO', d: true, c: c.borda };
    }
    
    // Validação de Limite Diário Geral da Loja
    if (configLoja?.limite_resgates_diario_cliente > 0 && resgatesHoje >= configLoja.limite_resgates_diario_cliente) {
      return { t: 'LIMITE DIÁRIO', d: true, c: c.borda };
    }

    // 🔥 VALIDAÇÃO PELO SALDO LOCAL DA LOJA (Regra atual da rede)
    if (saldoLocal < r.custo_pontos) return { t: 'SEM SALDO', d: true, c: c.borda }; 
    return { t: 'RESGATAR', d: false, c: '#10b981' }; 
  };

  const sairDaCarteira = async () => {
    await salvarStorage('cliente_cpf', ''); setCpf(''); setStatus('idle'); setSaldo(0); setCashback(0); setExtrato([]);
    router.replace('/cliente');
  };

  const abrirLink = (url: string) => { if (url) Linking.openURL(url).catch(() => mostrarToast('Erro ao abrir o link.', 'erro')); };

  // 🔥 FUNÇÕES DA ROLETA E NPS
  const abrirRoleta = async () => {
    const clean = cpf.replace(/\D/g, '');
    const intervaloDias = configLoja?.roleta_intervalo_dias !== undefined && configLoja?.roleta_intervalo_dias !== null ? Number(configLoja.roleta_intervalo_dias) : 1;
    
    const { data: lastRespostas } = await supabase.from('respostas_nps').select('created_at').eq('loja_id', String(loja_id)).eq('cliente_cpf', clean).order('created_at', { ascending: false }).limit(1);
    if (lastRespostas && lastRespostas.length > 0) {
      const dataUltima = new Date(lastRespostas[0].created_at);
      const diffDias = (new Date().getTime() - dataUltima.getTime()) / (1000 * 3600 * 24);
      if (diffDias < intervaloDias) {
        mostrarToast(`Você já jogou recentemente. O intervalo mínimo é de ${intervaloDias} dia(s).`, 'erro');
        return;
      }
    }

    const { data: pNps } = await supabase.from('perguntas_nps').select('*').eq('loja_id', String(loja_id)).order('created_at', { ascending: true });
    const { data: pRoleta } = await supabase.from('roleta_premios').select('*').eq('loja_id', String(loja_id)).order('probabilidade', { ascending: false });

    setPerguntasNps(pNps || []);
    setPremiosRoleta(pRoleta || []);
    setRespostasNps({});
    setEtapaRoleta('nps');
    setMostrarRoletaModal(true);
  };

  const enviarNpsEGirar = async () => {
    const clean = cpf.replace(/\D/g, '');
    const insercoes = Object.keys(respostasNps).map(pergunta_id => ({
      loja_id: String(loja_id),
      cliente_cpf: clean,
      pergunta_id: pergunta_id,
      resposta: String(respostasNps[pergunta_id])
    }));

    if (insercoes.length > 0) {
      await supabase.from('respostas_nps').insert(insercoes);
    } else {
      await supabase.from('respostas_nps').insert([{ loja_id: String(loja_id), cliente_cpf: clean, resposta: 'JOGADA_ROLETA' }]);
    }

    setEtapaRoleta('girando');
    
    let somaProbs = 0;
    premiosRoleta.forEach(p => somaProbs += Number(p.probabilidade));
    
    let random = Math.random() * somaProbs;
    let premioSorteado = premiosRoleta[premiosRoleta.length - 1]; 
    
    for (const p of premiosRoleta) {
      if (random < Number(p.probabilidade)) {
        premioSorteado = p;
        break;
      }
      random -= Number(p.probabilidade);
    }

    if (!premioSorteado || !premioSorteado.id) {
       premioSorteado = { nome: 'Nada desta vez! 😢', tipo: 'nada' };
    }

    // 🔥 PREPARA O CAÇA-NÍQUEIS
    const itensSlot = [];
    const fallback = [{nome:'🎁'}, {nome:'⭐'}, {nome:'💰'}, {nome:'😢'}];
    const source = premiosRoleta.length > 0 ? premiosRoleta : fallback;
    for(let i=0; i<30; i++) {
        itensSlot.push(source[Math.floor(Math.random() * source.length)]);
    }
    itensSlot.push(premioSorteado);
    setSlotItems(itensSlot);
    slotAnim.setValue(0);
    
    rotateAnim.setValue(0);
    // Animação Roleta Circular (Gira 4 voltas + offset do prêmio)
    const totalSlices = source.length || 8;
    const sliceAngle = 360 / totalSlices;
    const indexPremio = source.findIndex(p => p.id === premioSorteado.id);
    const targetRotate = 1440 + (360 - (indexPremio * sliceAngle)) - (sliceAngle / 2); // Para no meio da fatia

    Animated.timing(rotateAnim, {
      toValue: 1, 
      duration: 5000,
      easing: Easing.out(Easing.cubic), 
      useNativeDriver: true
    }).start(async () => {
       setPremioGanho(premioSorteado);
       
       const isNada = premioSorteado.tipo === 'nada' || (premioSorteado.tipo !== 'brinde' && (!premioSorteado.valor || premioSorteado.valor <= 0));
       
        if (!isNada) {
          if (premioSorteado.tipo === 'pontos') {
             await supabase.from('transacoes').insert({ loja_id: String(loja_id), cliente_cpf: clean, valor: 0, pontos_gerados: premioSorteado.valor });
             mostrarToast(`✨ +${premioSorteado.valor} Springs adicionados!`, 'sucesso');
          } else if (premioSorteado.tipo === 'cashback') {
             await supabase.from('cashbacks').insert({ loja_id: String(loja_id), cliente_cpf: clean, valor: premioSorteado.valor, usado: false });
             mostrarToast(`💰 R$ ${premioSorteado.valor} de Cashback ganho!`, 'sucesso');
          } else {
             await supabase.from('brindes_pendentes').insert({ loja_id: String(loja_id), cliente_cpf: clean, nome_brinde: premioSorteado.nome });
             mostrarToast(`🎁 Brinde: ${premioSorteado.nome} salvo!`, 'sucesso');
          }
        }
       setEtapaRoleta('resultado');
       await carregarDados(clean); 
    });
  };

  const banner1 = banners.find(b => b.ordem === 1); const banner2 = banners.find(b => b.ordem === 2);
  const banner3 = banners.find(b => b.ordem === 3); const banner4 = banners.find(b => b.ordem === 4);

  if (status === 'idle') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={styles.scroll}>
        <Text style={[styles.logo, { color: c.neonVerde }]}>PALM SPRINGS</Text>
        <Text style={[styles.subtitle, { color: c.subtexto }]}>Sua carteira de benefícios</Text>
        <TextInput placeholder="(19) 99999-9999" placeholderTextColor={c.subtexto} value={cpf} onChangeText={formatarTelefone} keyboardType="phone-pad" maxLength={15} style={[styles.inputGigante, { backgroundColor: c.card, borderColor: c.borda, color: c.texto }]} />
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444' }]}>
          <Text style={{ fontSize: 24, marginRight: 12 }}>{toast.tipo === 'sucesso' ? '✅' : '⏳'}</Text><Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
        <TouchableOpacity style={styles.buttonBig} onPress={entrarFila} activeOpacity={0.8}>
          <Text style={styles.buttonTextBig}>{loja_id ? 'ENTRAR NA FILA DO CAIXA' : 'ACESSAR MINHA CARTEIRA'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (status === 'aguardando') {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Animated.View style={[styles.aiCircle, { transform:[{ scale: pulse }, { rotate: spin }], borderColor: neonColor, shadowColor: neonColor, backgroundColor: c.card }]}><Animated.View style={[styles.aiCircleInner, { backgroundColor: neonColor, transform:[{ scale: innerPulse }] }]} /></Animated.View>
        <Animated.Text style={[styles.aiText, { color: neonColor }]}>Processando seus springs...</Animated.Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444' }]}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text><Text style={styles.toastText}>{toast.message}</Text>
      </Animated.View>

      <View style={{ alignItems: 'center', zIndex: 10, paddingTop: Platform.OS === 'web' ? 0 : 35 }}>
        <View style={[styles.lojaBadge, { backgroundColor: c.card, borderColor: c.borda }]}><Text style={[styles.lojaBadgeText, { color: c.neonVerde }]}>{nomeLojaAtual}</Text></View>
      </View>

      <View style={[styles.headerModerno, { backgroundColor: c.bg }]}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
          <View>
             {/* 🔥 NOME CORRIGIDO PARA PALM SPRINGS */}
             <Text style={[styles.logoMini, { color: c.neonVerde, fontSize: 20 }]}>PALM SPRINGS</Text>
             <Text style={{color: c.subtexto, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginTop: 2}}>CLUBE DE VANTAGENS</Text>
          </View>
          <View style={{flexDirection: 'row', gap: 8}}>
             <TouchableOpacity onPress={() => setIsDark(!isDark)} style={[styles.badgeBtn, { backgroundColor: c.card, borderColor: c.borda }]}><Text style={{fontSize: 14}}>{isDark ? '☀️' : '🌙'}</Text></TouchableOpacity>
             <TouchableOpacity onPress={() => setMostrarExtrato(!mostrarExtrato)} style={[styles.badgeBtn, { backgroundColor: c.card, borderColor: c.borda }]}><Text style={{color: '#0ea5e9', fontSize: 11, fontWeight: 'bold'}}>📜 {mostrarExtrato ? 'FECHAR' : 'EXTRATO'}</Text></TouchableOpacity>
          </View>
        </View>

        {/* CARDS GLOBAIS (TODA A REDE) */}
        <View style={{flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <AnimaTouch onPress={() => setMostrarExtrato(true)} activeOpacity={0.8} style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, shadowColor: '#10b981', shadowOpacity: 0.2, shadowRadius: 15, elevation: 5, transform: [{ scale: pulseWin }] }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{color: c.subtexto, fontSize: 11, fontWeight: 'bold', letterSpacing: 1}}>SPRINGS (REDE)</Text><Text style={{fontSize: 16}}>👁️</Text>
            </View>
            <Text adjustsFontSizeToFit numberOfLines={1} style={{color: c.neonVerde, fontWeight: '900', fontSize: 26}}>✨ {Math.floor(displaySaldo)}</Text>
          </AnimaTouch>

          <Animated.View style={[styles.headerCard, { flex: 1, backgroundColor: c.card, borderColor: c.borda, transform: [{ scale: pulseWin }] }]}>
            <Text style={{color: c.subtexto, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 6}}>CASHBACK (REDE)</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={{color: c.neonAmarelo, fontWeight: '900', fontSize: 20}}>💰 R$ {displayCash.toFixed(2)}</Text>
          </Animated.View>
        </View>

        {/* 🔥 NOVOS MINI-CARDS LOCAIS (SÓ APARECE SE TIVER NA LOJA) */}
        {loja_id && (
          <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
            <View style={{ flex: 1, backgroundColor: c.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.neonVerde }}>
              <Text style={{ color: c.subtexto, fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' }}>Disponível nesta loja</Text>
              <Text style={{ color: c.neonVerde, fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>{saldoLocal} Springs</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: c.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.neonAmarelo }}>
               <Text style={{ color: c.subtexto, fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' }}>Disponível nesta loja</Text>
               <Text style={{ color: c.neonAmarelo, fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>R$ {cashbackLocal.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* 🔥 ALERTA DE BRINDES PENDENTES */}
      {brindesPendentes.length > 0 && (
         <View style={{paddingHorizontal: 20, paddingTop: 15, paddingBottom: 5}}>
            <View style={{backgroundColor: '#ec489915', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#ec489950'}}>
               <Text style={{color: '#ec4899', fontWeight: '900', fontSize: 14, marginBottom: 8}}>🎁 VOCÊ TEM PRÊMIOS PARA RETIRAR!</Text>
               {brindesPendentes.map((b: any) => (
                  <Text key={b.id} style={{color: c.texto, fontSize: 13, marginBottom: 4, fontWeight: 'bold'}}>• {b.nome_brinde} <Text style={{color: c.subtexto, fontWeight: 'normal'}}>({b.nomeLoja})</Text></Text>
               ))}
               <Text style={{color: '#ec4899', fontSize: 11, fontStyle: 'italic', marginTop: 5}}>Apresente esta tela no caixa para resgatar.</Text>
            </View>
         </View>
      )}

      <View style={[styles.divisorSutil, { backgroundColor: c.borda }]} />

      {mostrarExtrato ? (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 }}>
             <Text style={[styles.sectionTitle, { color: c.texto, marginBottom: 0 }]}>📜 Seu Extrato</Text>
             <TouchableOpacity onPress={() => setMostrarExtrato(false)} style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.borda, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 }}><Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>✕ FECHAR</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 40 }}>
             {extrato.length === 0 && <Text style={{ color: c.subtexto, textAlign: 'center', marginTop: 20 }}>Nenhuma movimentação ainda.</Text>}
             {extrato.map((item) => (
                <View key={item.id} style={[styles.extratoCard, { backgroundColor: c.card, borderColor: c.borda }]}>
                   <View style={{ borderBottomWidth: 1, borderBottomColor: c.borda, paddingBottom: 10, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: c.texto, fontWeight: '900', fontSize: 15 }}>{item.loja}</Text>
                      <Text style={{ color: c.subtexto, fontSize: 11, fontWeight: 'bold' }}>{new Date(item.data).toLocaleDateString('pt-BR')} às {new Date(item.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</Text>
                   </View>
                   {item.tipo === 'compra' && (
                     <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.subtexto, fontSize: 14 }}>Valor da compra</Text><Text style={{ color: c.texto, fontWeight: 'bold', fontSize: 14 }}>R$ {Number(item.valor).toFixed(2)}</Text></View>
                        {item.valor_cashback > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.subtexto, fontSize: 14 }}>Cashback ganho</Text><Text style={{ color: c.neonAmarelo, fontWeight: '900', fontSize: 14 }}>+ R$ {Number(item.valor_cashback).toFixed(2)}</Text></View>}
                        {item.pontos > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.subtexto, fontSize: 14 }}>Springs ganhos</Text><Text style={{ color: c.neonVerde, fontWeight: '900', fontSize: 14 }}>+ {item.pontos} SPG</Text></View>}
                     </View>
                   )}
                   {item.tipo === 'resgate' && (
                     <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.subtexto, fontSize: 14 }}>Item resgatado</Text><Text style={{ color: c.texto, fontWeight: 'bold', fontSize: 14 }}>{item.premio}</Text></View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.subtexto, fontSize: 14 }}>Springs usados</Text><Text style={{ color: '#ef4444', fontWeight: '900', fontSize: 14 }}>- {item.pontos} SPG</Text></View>
                     </View>
                   )}
                   {item.tipo === 'cashback' && (
                     <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.subtexto, fontSize: 14 }}>Cashback recebido</Text><Text style={{ color: c.neonAmarelo, fontWeight: '900', fontSize: 14 }}>+ R$ {Number(item.valor_cashback).toFixed(2)}</Text></View>
                     </View>
                   )}
                </View>
             ))}
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}>
          
          {loja_id && (
            <View>
              <Text style={[styles.sectionTitle, { color: c.texto, marginBottom: 5 }]}>✨ Veja nossos brindes</Text>
              
              {/* 🔥 SALDO LOCAL EXPLICADO PARA O CLIENTE */}
              
              {recompensas.length === 0 && <Text style={{color: c.subtexto}}>Nenhum prêmio nesta loja.</Text>}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginLeft: -20, paddingLeft: 20, marginBottom: 10}}>
                {recompensas.map((r) => {
                  const e = getEstado(r);
                  return (
                    <View key={r.id} style={[styles.cardCarrossel, { backgroundColor: c.card, borderColor: c.borda }, e.d && { opacity: 0.6 }]}>
                      {r.imagem ? <Image source={{ uri: r.imagem }} style={styles.imageCarrossel} /> : <View style={styles.imagePlaceholderCarrossel}><Text style={{color: '#334155', fontSize: 40}}>🎁</Text></View>}
                      <View style={styles.overlayCarrossel}>
                        <Text style={styles.nomeCarrossel} numberOfLines={2}>{r.nome}</Text>
                        <Text style={[styles.pontosCarrossel, { color: c.neonVerde }]}>{r.custo_pontos} SPG</Text>
                        <TouchableOpacity style={[styles.botaoCarrossel, { backgroundColor: e.c }]} disabled={e.d} onPress={() => resgatar(r)}><Text style={styles.botaoTexto}>{e.t}</Text></TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={[styles.divisor, { backgroundColor: c.borda }]} />
            </View>
          )}

          {/* 🔥 BOTAO DA ROLETA (REDONDO) */}
          {loja_id && configLoja?.roleta_ativa && (
            <TouchableOpacity onPress={abrirRoleta} style={{ alignItems: 'center', marginTop: 10, marginBottom: 25 }}>
               <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: '#020617', borderWidth: 1, borderColor: '#facc1530', justifyContent: 'center', alignItems: 'center', shadowColor: '#facc15', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 }}>
                  {/* DESIGN PREMIUM DA ROLETA NO BOTAO */}
                  <View style={{ position: 'absolute', width: '90%', height: '90%', borderRadius: 100, borderWidth: 4, borderColor: '#facc15', borderStyle: 'dashed', opacity: 0.5 }} />
                  <Svg width="80" height="80" viewBox="0 0 100 100">
                    <Circle cx="50" cy="50" r="48" fill="#0f172a" stroke="#facc15" strokeWidth="2" />
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                      <Path key={i} d="M50 50 L50 2 A48 48 0 0 1 84 16 Z" fill={i % 2 === 0 ? '#facc15' : '#1e293b'} transform={`rotate(${angle} 50 50)`} opacity={0.8} />
                    ))}
                    <Circle cx="50" cy="50" r="10" fill="#020617" stroke="#facc15" strokeWidth="2" />
                  </Svg>
                  <View style={{ position: 'absolute', bottom: 15, alignItems: 'center', backgroundColor: '#facc15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                    <Text style={{ color: '#020617', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>JOGAR AGORA</Text>
                  </View>
               </View>
            </TouchableOpacity>
          )}

          {(banner1 || banner2 || banner3) && (
            <View style={{ marginTop: 15, marginBottom: 20 }}>
              {(banner1 || banner2) && (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: banner3 ? 10 : 0 }}>
                  {banner1 && (
                    <TouchableOpacity onPress={() => abrirLink(banner1.link)} style={[styles.bannerImageContainer, { flex: 1, height: 150, borderColor: c.borda }]} activeOpacity={0.8}>
                       <Image source={{ uri: banner1.imagem }} style={styles.bannerImageBg} />
                       <View style={[styles.bannerOverlay, { borderLeftWidth: 4, borderLeftColor: banner1.cor_borda || c.neonVerde }]}>
                         {banner1.titulo && <Text style={styles.bannerTitulo}>{banner1.titulo}</Text>}
                         {banner1.subtitulo && <Text style={styles.bannerSub}>{banner1.subtitulo}</Text>}
                       </View>
                    </TouchableOpacity>
                  )}
                  {banner2 && (
                    <TouchableOpacity onPress={() => abrirLink(banner2.link)} style={[styles.bannerImageContainer, { flex: 1, height: 150, borderColor: c.borda }]} activeOpacity={0.8}>
                       <Image source={{ uri: banner2.imagem }} style={styles.bannerImageBg} />
                       <View style={[styles.bannerOverlay, { borderLeftWidth: 4, borderLeftColor: banner2.cor_borda || '#0ea5e9' }]}>
                         {banner2.titulo && <Text style={styles.bannerTitulo}>{banner2.titulo}</Text>}
                         {banner2.subtitulo && <Text style={styles.bannerSub}>{banner2.subtitulo}</Text>}
                       </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {banner3 && (
                <TouchableOpacity onPress={() => abrirLink(banner3.link)} style={[styles.bannerImageContainer, { height: 180, borderColor: c.borda }]} activeOpacity={0.9}>
                   <Image source={{ uri: banner3.imagem }} style={styles.bannerImageBg} />
                   <View style={[styles.bannerOverlay, { borderTopWidth: 4, borderTopColor: banner3.cor_borda || '#8b5cf6', justifyContent: 'center' }]}>
                     {banner3.titulo && <Text style={[styles.bannerTitulo, { fontSize: 22 }]}>{banner3.titulo}</Text>}
                     {banner3.subtitulo && <Text style={[styles.bannerSub, { fontSize: 13, marginTop: 4 }]}>{banner3.subtitulo}</Text>}
                   </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={[styles.divisor, { backgroundColor: c.borda }]} />

          {/* 🔥 CARROSSEL DE PROXIMIDADE (HYPERLOCAL) */}
          {recompensasRede.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View>
                  <Text style={[styles.sectionTitle, { color: c.texto, marginBottom: 2 }]}>🌐 Brindes perto de você</Text>
                  <Text style={{color: c.subtexto, fontSize: 11}}>Lojas e parceiros na sua região.</Text>
                </View>
                {!loja_id && (
                  <TouchableOpacity 
                    onPress={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          mostrarToast("📍 Localização capturada! Buscando lojas próximas...", "sucesso");
                          // Aqui poderíamos fazer um cálculo de distância se tivéssemos as coordenadas das lojas
                        }, () => {
                          mostrarToast("Não foi possível obter sua localização.", "erro");
                        });
                      }
                    }}
                    style={{ backgroundColor: c.card, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: c.borda }}
                  >
                    <Text style={{ fontSize: 18 }}>📍</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginLeft: -20, paddingLeft: 20}}>
                {recompensasRede.map((r) => (
                  <View key={r.id} style={[styles.cardCarrosselRede, { borderColor: c.borda }]}>
                     {r.imagem ? <Image source={{ uri: r.imagem }} style={styles.imageCarrossel} /> : <View style={styles.imagePlaceholderCarrossel}><Text style={{color: '#334155'}}>🎁</Text></View>}
                    <View style={styles.overlayCarrossel}>
                      <Text style={{color: '#cbd5e1', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase'}}>{r.nomeLoja}</Text>
                      <Text style={[styles.nomeCarrossel, {fontSize: 16, marginTop: 2}]} numberOfLines={1}>{r.nome}</Text>
                      <Text style={[styles.pontosCarrossel, {marginBottom: 0, color: c.neonVerde}]}>{r.custo_pontos} SPG</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {banner4 && (
            <TouchableOpacity onPress={() => abrirLink(banner4.link)} style={[styles.bannerImageContainer, { height: 160, marginTop: 10, borderColor: c.borda }]} activeOpacity={0.9}>
               <Image source={{ uri: banner4.imagem }} style={styles.bannerImageBg} />
               <View style={[styles.bannerOverlay, { borderTopWidth: 4, borderTopColor: banner4.cor_borda || '#ec4899', alignItems: 'center', justifyContent: 'center' }]}>
                 {banner4.titulo && <Text style={[styles.bannerTitulo, { textAlign: 'center', fontSize: 20 }]}>{banner4.titulo}</Text>}
                 {banner4.subtitulo && <Text style={[styles.bannerSub, { textAlign: 'center', marginTop: 5 }]}>{banner4.subtitulo}</Text>}
               </View>
            </TouchableOpacity>
          )}

          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 25}}>
             <TouchableOpacity style={[styles.cardRodape, { backgroundColor: c.card, borderColor: c.borda }]}><Text style={{fontSize: 24, marginBottom: 5}}>📚</Text><Text style={{color: c.texto, fontWeight: 'bold', fontSize: 13}}>Como Funciona</Text></TouchableOpacity>
             <TouchableOpacity style={[styles.cardRodape, { backgroundColor: c.card, borderColor: c.borda }]}><Text style={{fontSize: 24, marginBottom: 5}}>🤝</Text><Text style={{color: c.texto, fontWeight: 'bold', fontSize: 13}}>Indique a Rede</Text></TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.botaoSair, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]} onPress={sairDaCarteira} activeOpacity={0.8}>
            <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase' }}>🚪 Sair da Minha Conta</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 40, alignItems: 'center', opacity: 0.3, paddingBottom: 20 }}>
            <Text style={{ color: c.texto, fontSize: 10 }}>Versão 1.1.0 - Roleta Premium</Text>
            <Text style={{ color: c.texto, fontSize: 9, marginTop: 2 }}>PALM SPRINGS © 2026</Text>
          </View>

        </ScrollView>
      )}

      {/* 🔥 MODAL DA ROLETA E NPS */}
      {mostrarRoletaModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {etapaRoleta === 'nps' && (
              <ScrollView style={{maxHeight: 500}} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Antes de girar...</Text>
                <Text style={styles.modalSub}>Responda rapidinho para ajudar a loja!</Text>
                
                {perguntasNps.length === 0 && <Text style={{color: '#94a3b8', marginVertical: 20, textAlign: 'center'}}>Nenhuma pergunta configurada. Pode girar direto!</Text>}
                
                {perguntasNps.map(p => (
                  <View key={p.id} style={{marginTop: 20, backgroundColor: '#0f172a', padding: 15, borderRadius: 16}}>
                    <Text style={{color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 12, textAlign: 'center'}}>{p.pergunta}</Text>
                    {p.tipo === 'estrelas' ? (
                      <View style={{flexDirection: 'row', gap: 10, justifyContent: 'center'}}>
                        {[1,2,3,4,5].map(star => (
                          <TouchableOpacity key={star} onPress={() => setRespostasNps({...respostasNps, [p.id]: star})}>
                            <Text style={{fontSize: 32, opacity: respostasNps[p.id] >= star ? 1 : 0.3}}>⭐</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View style={{flexDirection: 'row', gap: 15, justifyContent: 'center'}}>
                        <TouchableOpacity style={{paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: respostasNps[p.id] === 'sim' ? '#10b981' : '#334155'}} onPress={() => setRespostasNps({...respostasNps, [p.id]: 'sim'})}>
                          <Text style={{fontSize: 20}}>👍 SIM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: respostasNps[p.id] === 'nao' ? '#ef4444' : '#334155'}} onPress={() => setRespostasNps({...respostasNps, [p.id]: 'nao'})}>
                          <Text style={{fontSize: 20}}>👎 NÃO</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}

                <TouchableOpacity style={[styles.buttonBig, {marginTop: 25, backgroundColor: '#ec4899', shadowColor: '#ec4899'}]} onPress={enviarNpsEGirar}>
                  <Text style={styles.buttonTextBig}>ENVIAR E GIRAR 🎡</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems: 'center', marginTop: 15, paddingBottom: 10}} onPress={() => setMostrarRoletaModal(false)}>
                  <Text style={{color: '#ef4444', fontWeight: 'bold'}}>CANCELAR E SAIR</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {etapaRoleta === 'girando' && (
              <View style={{alignItems: 'center', paddingVertical: 20}}>
                <View style={{ marginBottom: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#020617' }}>✨ Roleta da Sorte ✨</Text>
                </View>
                
                {/* DECORAÇÕES DE BRILHO (Sparkles) */}
                <View style={{ position: 'relative', width: 340, height: 340, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ position: 'absolute', top: 20, left: 20, fontSize: 24, opacity: 0.6 }}>✨</Text>
                  <Text style={{ position: 'absolute', top: 40, right: 30, fontSize: 20, opacity: 0.6 }}>✦</Text>
                  <Text style={{ position: 'absolute', bottom: 60, left: 40, fontSize: 18, opacity: 0.6 }}>✦</Text>
                  <Text style={{ position: 'absolute', bottom: 30, right: 20, fontSize: 22, opacity: 0.6 }}>✨</Text>

                  {/* SETA INDICADORA PREMIUM (Triângulo Teal) */}
                  <View style={{ position: 'absolute', top: -10, zIndex: 100, alignItems: 'center' }}>
                    <Svg width="40" height="40" viewBox="0 0 40 40">
                      <Path d="M20 35 L5 5 L35 5 Z" fill="#0d9488" stroke="#fff" strokeWidth="2" />
                      <Path d="M20 30 L10 10 L30 10 Z" fill="#14b8a6" />
                    </Svg>
                  </View>
                  
                  <Animated.View style={{ width: 320, height: 320, borderRadius: 160, transform: [{ rotate: wheelSpin }], shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 }}>
                      <Svg width="100%" height="100%" viewBox="0 0 100 100">
                         <Defs>
                           <LinearGradient id="rimGradient" x1="0" y1="0" x2="1" y2="1">
                             <Stop offset="0" stopColor="#cbd5e1" />
                             <Stop offset="0.5" stopColor="#f8fafc" />
                             <Stop offset="1" stopColor="#94a3b8" />
                           </LinearGradient>
                           <RadialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
                             <Stop offset="0" stopColor="#f8fafc" />
                             <Stop offset="0.7" stopColor="#cbd5e1" />
                             <Stop offset="1" stopColor="#64748b" />
                           </RadialGradient>
                         </Defs>

                         {/* ARO METÁLICO EXTERNO */}
                         <Circle cx="50" cy="50" r="49" fill="url(#rimGradient)" />
                         <Circle cx="50" cy="50" r="46" fill="#fff" />
                         
                         {/* REBITES (Parafusos do aro) */}
                         {[...Array(12)].map((_, i) => {
                           const ang = (i * 30) * Math.PI / 180;
                           return <Circle key={i} cx={50 + 47.5 * Math.cos(ang)} cy={50 + 47.5 * Math.sin(ang)} r="0.8" fill="#64748b" />
                         })}

                         {/* SEGMENTOS */}
                         {(() => {
                           const items = premiosRoleta.length > 0 ? premiosRoleta : [
                             { nome: '10 SPG' }, { nome: 'R$ 2 Cashback' }, { nome: 'Café Grátis' }, { nome: 'R$ 5 Cashback' },
                             { nome: '5 SPG' }, { nome: 'Ferramenta' }, { nome: '15 SPG' }, { nome: 'Brinde' }
                           ];
                           const total = items.length;
                           const angle = 360 / total;

                           return items.map((p, i) => {
                             const startAngle = i * angle;
                             const endAngle = (i + 1) * angle;
                             const x1 = 50 + 46 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                             const y1 = 50 + 46 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                             const x2 = 50 + 46 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                             const y2 = 50 + 46 * Math.sin((Math.PI * (endAngle - 90)) / 180);
                             const d = `M 50 50 L ${x1} ${y1} A 46 46 0 0 1 ${x2} ${y2} Z`;
                             
                             return (
                               <G key={i}>
                                 <Path d={d} fill={WHEEL_COLORS[i % 2]} stroke="#cbd5e1" strokeWidth="0.2" />
                                 <G transform={`rotate(${startAngle + angle / 2} 50 50)`}>
                                   {/* ÍCONE */}
                                   <SvgText x="50" y="15" fontSize="6" textAnchor="middle" alignmentBaseline="middle">{getIconForPrize(p.nome)}</SvgText>
                                   {/* TEXTO */}
                                   <SvgText x="50" y="24" fill="#1e293b" fontSize="3" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" transform="rotate(0 50 24)">
                                     {p.nome.length > 15 ? p.nome.substring(0, 12) + '...' : p.nome.toUpperCase()}
                                   </SvgText>
                                 </G>
                               </G>
                             );
                           });
                         })()}

                         {/* PIVÔ CENTRAL METÁLICO */}
                         <Circle cx="50" cy="50" r="10" fill="url(#rimGradient)" />
                         <Circle cx="50" cy="50" r="8" fill="url(#centerGradient)" stroke="#fff" strokeWidth="0.5" />
                         <SvgText x="50" y="52" fill="#0d9488" fontSize="6" textAnchor="middle" fontWeight="bold">✦</SvgText>
                      </Svg>
                  </Animated.View>
                </View>

                {/* BOTÃO GIRAR AGORA (Abaixo da roleta) */}
                <TouchableOpacity 
                   onPress={girarRoleta} 
                   disabled={rodando} 
                   style={{ 
                     marginTop: 30, 
                     backgroundColor: '#14b8a6', 
                     paddingVertical: 18, 
                     paddingHorizontal: 60, 
                     borderRadius: 40, 
                     flexDirection: 'row', 
                     alignItems: 'center', 
                     gap: 10,
                     shadowColor: '#14b8a6',
                     shadowOffset: { width: 0, height: 10 },
                     shadowOpacity: 0.3,
                     shadowRadius: 15,
                     elevation: 8
                   }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>GIRAR AGORA</Text>
                  <Text style={{ fontSize: 20 }}>🔄</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setMostrarRoletaModal(false)} style={{ marginTop: 20 }}>
                   <Text style={{ color: '#94a3b8', fontWeight: 'bold' }}>Sair da Roleta</Text>
                </TouchableOpacity>
              </View>
            )}

            {etapaRoleta === 'resultado' && (
              <View style={{alignItems: 'center', paddingVertical: 20}}>
                <Text style={{fontSize: 60}}>
                  {premioGanho?.tipo === 'nada' || (!premioGanho?.valor && premioGanho?.tipo !== 'brinde') ? '😢' : '🎉'}
                </Text>
                <Text style={[styles.modalTitle, {marginTop: 20, color: premioGanho?.tipo === 'nada' || (!premioGanho?.valor && premioGanho?.tipo !== 'brinde') ? '#94a3b8' : '#10b981'}]}>
                  {premioGanho?.tipo === 'nada' || (!premioGanho?.valor && premioGanho?.tipo !== 'brinde') ? 'Que pena!' : premioGanho?.nome}
                </Text>
                <Text style={{color: '#e2e8f0', textAlign: 'center', marginTop: 10, lineHeight: 22}}>
                  {premioGanho?.tipo === 'nada' || (!premioGanho?.valor && premioGanho?.tipo !== 'brinde')
                    ? `Você tirou: ${premioGanho?.nome}. Tente novamente na próxima visita!`
                    : premioGanho?.tipo === 'pontos' ? 'Os Springs já foram adicionados ao seu saldo!' : 
                      premioGanho?.tipo === 'cashback' ? 'O Cashback já está na sua carteira!' :
                      'O seu brinde está salvo! Mostre o seu aplicativo para o lojista para retirar.'}
                </Text>
                <TouchableOpacity style={[styles.buttonBig, {marginTop: 30, width: '100%', backgroundColor: '#334155', shadowOpacity: 0}]} onPress={() => setMostrarRoletaModal(false)}>
                  <Text style={styles.buttonTextBig}>FECHAR E VOLTAR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: { position: 'absolute', top: Platform.OS === 'web' ? 20 : 50, left: 20, right: 20, zIndex: 9999, padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 15, flex: 1, lineHeight: 22 },
  container: { flex: 1, paddingHorizontal: 20 },
  logo: { fontSize: 36, textAlign: 'center', fontWeight: '900', letterSpacing: -1 },
  logoMini: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { textAlign: 'center', marginTop: 5, marginBottom: 30, fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15, letterSpacing: 0.5 },
  aiCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 4, borderTopColor: 'transparent', justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.9, shadowRadius: 25, elevation: 30 },
  aiCircleInner: { width: 70, height: 70, borderRadius: 35, opacity: 0.9 },
  aiText: { marginTop: 40, fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  lojaBadge: { paddingVertical: 10, paddingHorizontal: 30, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderWidth: 1, borderTopWidth: 0 },
  lojaBadgeText: { fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  headerModerno: { paddingTop: 15, paddingBottom: 10, paddingHorizontal: 20 },
  headerCard: { borderRadius: 16, padding: 18, borderWidth: 1, justifyContent: 'center' },
  badgeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  divisorSutil: { height: 1, marginHorizontal: 20, marginTop: 5, marginBottom: 15 },
  divisor: { height: 1, marginVertical: 25, width: '100%' },
  extratoCard: { padding: 18, borderRadius: 18, marginBottom: 12, borderWidth: 1, flexDirection: 'column', alignItems: 'stretch' },
  cardCarrossel: { width: 240, height: 320, borderRadius: 24, marginRight: 15, overflow: 'hidden', borderWidth: 1 },
  cardCarrosselRede: { width: 200, height: 260, borderRadius: 20, marginRight: 15, overflow: 'hidden', borderWidth: 1, opacity: 0.9 },
  imageCarrossel: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover' },
  imagePlaceholderCarrossel: { width: '100%', height: '100%', backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', position: 'absolute' },
  overlayCarrossel: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(2, 6, 23, 0.90)', borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  nomeCarrossel: { color: '#f8fafc', fontWeight: 'bold', fontSize: 18, marginBottom: 5 },
  pontosCarrossel: { fontWeight: '900', fontSize: 16, marginBottom: 15 },
  botaoCarrossel: { padding: 14, borderRadius: 12, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  bannerImageContainer: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  bannerImageBg: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover', opacity: 0.5 },
  bannerOverlay: { flex: 1, padding: 20, backgroundColor: 'rgba(2, 6, 23, 0.3)' },
  bannerTitulo: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  bannerSub: { color: '#e2e8f0', fontSize: 12, lineHeight: 18 },
  cardRodape: { width: '48%', padding: 20, borderRadius: 18, alignItems: 'center', borderWidth: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  inputGigante: { padding: 22, borderRadius: 20, fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: 2, borderWidth: 2, marginBottom: 20 },
  buttonBig: { backgroundColor: '#10b981', padding: 22, borderRadius: 20, alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  buttonTextBig: { color: '#fff', textAlign: 'center', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  botaoSair: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 30, borderWidth: 1 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2, 6, 23, 0.92)', zIndex: 9999, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', width: '100%', maxWidth: 450, padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#334155', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  modalTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 5, textAlign: 'center', letterSpacing: -0.5 },
  modalSub: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 15 }
});
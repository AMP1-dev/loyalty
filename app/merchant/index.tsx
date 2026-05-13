import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Dimensions, ActivityIndicator, Alert, Switch, Vibration, Animated, Platform, Linking, Modal } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Polyline } from 'react-native-svg';
import {
  calcularSaldoCliente,
  buscarTokenCompleto,
  aplicarTaxa,
  tokenExpirou,
  buscarCaixaAtivaCliente
} from '@/lib/exchange';

const APP_VERSION = "v5.8.5-exchange";
const { width } = Dimensions.get('window');
const itemWidth = width > 600 ? (600 - 60) / 3 : (width - 60) / 2;

const QR_SIZES = {
  '10x10': { size: 1181, label: '10x10cm (300 DPI)' },
  '15x15': { size: 1772, label: '15x15cm (300 DPI)' },
  '20x20': { size: 2362, label: '20x20cm (300 DPI)' }
};

export default function MerchantPanel() {
  const router = useRouter();
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [operadorLogado, setOperadorLogado] = useState('Master');
  const [lojaLimiteUsers, setLojaLimiteUsers] = useState(1);
  const [fila, setFila] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalMes: 0, totalDia: 0, vendasCount: 0, ticketMedio: 0, totalClientesDia: 0, resgatesHojeLista: [], resgatesMesLista: [], resgatesAgrupados: [], pontosResgatadosHoje: 0, ultimosResgates: [] });
  const [valorVenda, setValorVenda] = useState<any>({});
  const [usarBonus, setUsarBonus] = useState<any>({});
  const [bonusPendentes, setBonusPendentes] = useState<any>({});
  const [brindesPendentes, setBrindesPendentes] = useState<any>({});
  const [premiosMesaPendentes, setPremiosMesaPendentes] = useState<any>({});
  const [cashbacks, setCashbacks] = useState<any>({});
  const [mostrarManual, setMostrarManual] = useState(false);
  const [telefoneManual, setTelefoneManual] = useState('');
  const [valorManual, setValorManual] = useState('');
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [mostrarRoleta, setMostrarRoleta] = useState(false);
  const [editandoRewardId, setEditandoRewardId] = useState<string | null>(null);
  const [editandoRoletaId, setEditandoRoletaId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [formRoleta, setFormRoleta] = useState<any>({});
  const [formError, setFormError] = useState('');
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [config, setConfig] = useState<any>({ nome_loja: '', cor_primaria: '#10b981', cashback_percent: '10', cashback_expiracao_dias: '30', reais_por_ponto: '1', pontos_expiracao_dias: '365', pontos_sobre_valor_bruto: true, usar_cashback_total: false, limite_resgates_diario_cliente: '', tempo_bloqueio_minutos: '', bonus_retorno_pontos: '50', bonus_retorno_validade_dias: '3', senha: '', link_google_meu_negocio: '', intercambio_taxa: '0.1' });
  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [toast, setToast] = useState({ message: '', tipo: 'sucesso', visible: false });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const qrRef = useRef<any>(null);
  const qrDownloadRef = useRef<any>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const manualInputRef = useRef<View>(null);
  const [modalCRM, setModalCRM] = useState<{ visivel: boolean; cpf: string; pontos: number; dias: number } | null>(null);
  const [historicoCRM, setHistoricoCRM] = useState<any[]>([]);
  const [clientesAtrasados, setClientesAtrasados] = useState(0);
  const [mostrarCRM, setMostrarCRM] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [mediaEstrelas, setMediaEstrelas] = useState(0);
  const [npsChart, setNpsChart] = useState<any>({ dias: [], max: 1 });
  const [premiosRoleta, setPremiosRoleta] = useState<any[]>([]);
  const [mostrarAvaliacoesModal, setMostrarAvaliacoesModal] = useState(false);
  const [clienteFocadoId, setClienteFocadoId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const channelResgateRef = useRef<any>(null);

  const [operadores, setOperadores] = useState<any[]>([]);
  const [mostrarEquipeModal, setMostrarEquipeModal] = useState(false);
  const [formOperador, setFormOperador] = useState({ username: '', senha: '', nome: '' });

  // --- ESTADOS MESA ---
  const [mostrarMesa, setMostrarMesa] = useState(false);
  const [participacoesMesa, setParticipacoesMesa] = useState<any[]>([]);
  const [premiosMesa, setPremiosMesa] = useState<any[]>([]);
  const [novoPremiomesa, setNovoPremiomesa] = useState({ nome: '', tipo: 'desconto', valor: 0, probabilidade: 0 });
  const [statsMesa, setStatsMesa] = useState({ total: 0, notas5: 0, googleValidadas: 0 });
  const [qrMesaAtivo, setQrMesaAtivo] = useState(false);
  const [perguntasNpsMesa, setPerguntasNpsMesa] = useState<any[]>([]);
  const [novaPergunta, setNovaPergunta] = useState('');
  const [novaPeruntaTipo, setNovaPerguntaTipo] = useState('geral');
  const [editandoPergunta, setEditandoPergunta] = useState<string | null>(null);
  const [linkGoogleMeuNegocio, setLinkGoogleMeuNegocio] = useState('');
  const [bonusMultiplicador, setBonusMultiplicador] = useState(2.0);
  const [tamanhoQrMesa, setTamanhoQrMesa] = useState<'10x10' | '15x15' | '20x20'>('10x10');

  // --- ESTADOS REMARKETING ---
  const [mostrarRemarketing, setMostrarRemarketing] = useState(false);
  const [contatosMesa, setContatosMesa] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroNps, setFiltroNps] = useState(0);
  const [filtroData, setFiltroData] = useState('');
  const [buscarTelefone, setBuscarTelefone] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [selecionarTodos, setSelecionarTodos] = useState(false);
  const [templateSelecionado, setTemplateSelecionado] = useState<string | null>(null);
  const [mensagemCustomizada, setMensagemCustomizada] = useState('');
  const [statsRemarketig, setStatsRemarketig] = useState({ total: 0, naoContatados: 0, contatados: 0, notas5: 0 });

  const templatesWA = [
    { id: 'agradecimento', nome: 'Agradecimento + Convite', emoji: '🙏', mensagem: "Olá! Tudo bem? Aqui é da [LOJA]. Vimos que você nos avaliou com 5 estrelas! Muito obrigado pelo carinho. 😍\n\nComo forma de agradecimento, na sua próxima visita você tem um [PREMIO] esperando por você! Basta mostrar essa mensagem ao atendente. Esperamos você em breve! 🚀" },
    { id: 'feedback', nome: 'Pedir Feedback Detalhado', emoji: '📝', mensagem: "Olá! Notamos que você participou da nossa roleta recentemente. Gostaríamos de saber mais sobre sua experiência! O que podemos fazer para que sua próxima visita seja nota 10? 🌟" },
    { id: 'promocao', nome: 'Promoção Exclusiva', emoji: '🔥', mensagem: "Opa! Temos uma novidade exclusiva para você que já é nosso cliente VIP! Somente esta semana, apresentando este cupom, você ganha 2x Springs em qualquer compra! Não perca! 🏃💨" }
  ];

  const [mostrarIntercambio, setMostrarIntercambio] = useState(false);
  const [tokenIntercambio, setTokenIntercambio] = useState('');
  const [carregandoIntercambio, setCarregandoIntercambio] = useState(false);

  // ════════════════════════════════════════════════════════════════════
  // STATES DO EXCHANGE (MERCHANT)
  // ════════════════════════════════════════════════════════════════════
  const [mostrarValidarToken, setMostrarValidarToken] = useState(false);
  const [tokenParaValidar, setTokenParaValidar] = useState('');
  const [carregandoValidacao, setCarregandoValidacao] = useState(false);
  const [caixaAtiva, setCaixaAtiva] = useState<any>(null);
  const [caixasAnteriores, setCaixasAnteriores] = useState<any[]>([]);


  // ════════════════════════════════════════════════════════════════════
  // INATIVIDADE E AUTO-LOGOUT (4 HORAS)
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let checkInactivity: NodeJS.Timeout;
    let lastActivity = Date.now();

    const resetTimer = () => { lastActivity = Date.now(); };

    if (Platform.OS === 'web') {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('touchstart', resetTimer);
      window.addEventListener('click', resetTimer);

      const INACTIVITY_LIMIT = 4 * 60 * 60 * 1000; // 4 horas
      checkInactivity = setInterval(() => {
        if (Date.now() - lastActivity > INACTIVITY_LIMIT) {
          localStorage.clear();
          router.replace('/login');
        }
      }, 60000); // Checa a cada 1 minuto
    }

    return () => {
      if (checkInactivity) clearInterval(checkInactivity);
      if (Platform.OS === 'web') {
        window.removeEventListener('mousemove', resetTimer);
        window.removeEventListener('keydown', resetTimer);
        window.removeEventListener('touchstart', resetTimer);
        window.removeEventListener('click', resetTimer);
      }
    };
  }, [router]);

  // --- FUNÇÕES MESA & REMARKETING ---
  const buscarParticipacoesMesa = async () => {
    if (!lojaId) return;
    const { data, error } = await supabase.from('roleta_mesa_participacoes').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false });
    if (!error && data) {
      setParticipacoesMesa(data);
      const n5 = data.filter(p => p.nota_nps === 5).length;
      const gv = data.filter(p => p.google_valido).length;
      setStatsMesa({ total: data.length, notas5: n5, googleValidadas: gv });
    }
  };

  const buscarPremiosMesa = async () => {
    if (!lojaId) return;
    const { data, error } = await supabase.from('roleta_mesa_premios').select('*').eq('loja_id', lojaId).order('probabilidade', { ascending: false });
    if (!error && data) setPremiosMesa(data);
  };

  const adicionarPremiomesa = async (id: string) => {
    if (!novoPremiomesa.nome || novoPremiomesa.probabilidade <= 0) { mostrarToast('Preencha os dados do prêmio.', 'erro'); return; }
    const { error } = await supabase.from('roleta_mesa_premios').insert([{ ...novoPremiomesa, loja_id: id }]);
    if (error) { console.error('Erro ao add prêmio:', error); mostrarToast(`Erro: ${error.message}`, 'erro'); return; }
    mostrarToast('Prêmio adicionado!', 'sucesso'); 
    setNovoPremiomesa({ nome: '', tipo: 'desconto', valor: 0, probabilidade: 0 }); 
    buscarPremiosMesa();
  };

  const deletarPremiomesa = async (id: string, loja: string) => {
    const { error } = await supabase.from('roleta_mesa_premios').delete().eq('id', id);
    if (!error) { mostrarToast('Prêmio removido.', 'sucesso'); buscarPremiosMesa(); }
  };

  const buscarContatosRemarketing = async () => {
    if (!lojaId) return;
    const { data, error } = await supabase.from('contatos_mesa_remarketing').select('*').eq('loja_id', lojaId).order('data_participacao', { ascending: false });
    if (!error && data) {
      setContatosMesa(data);
      const nc = data.filter(c => c.status === 'nao_contatado').length;
      const c = data.filter(c => c.status !== 'nao_contatado').length;
      const n5 = data.filter(c => c.nota_nps === 5).length;
      setStatsRemarketig({ total: data.length, naoContatados: nc, contatados: c, notas5: n5 });
    }
  };

  const buscarPerguntasNpsMesa = async () => {
    if (!lojaId) return;
    const { data, error } = await supabase.from('perguntas_nps').select('*').eq('loja_id', lojaId).order('ordem', { ascending: true });
    if (!error && data) setPerguntasNpsMesa(data);
  };

  const adicionarPerguntaNps = async (id: string) => {
    if (!novaPergunta) return;
    const { error } = await supabase.from('perguntas_nps').insert([{ loja_id: id, pergunta: novaPergunta, tipo: novaPeruntaTipo, ordem: perguntasNpsMesa.length + 1, ativa: true }]);
    if (!error) { mostrarToast('Pergunta adicionada!', 'sucesso'); setNovaPergunta(''); buscarPerguntasNpsMesa(); }
  };

  const togglePerguntaNps = async (id: string, status: boolean, loja: string) => {
    await supabase.from('perguntas_nps').update({ ativa: !status }).eq('id', id);
    buscarPerguntasNpsMesa();
  };

  const editarPerguntaNps = async (id: string, texto: string, loja: string) => {
    await supabase.from('perguntas_nps').update({ pergunta: texto }).eq('id', id);
    buscarPerguntasNpsMesa();
  };

  const deletarPerguntaNps = async (id: string, loja: string) => {
    await supabase.from('perguntas_nps').delete().eq('id', id);
    buscarPerguntasNpsMesa();
  };

  const reordenarPerguntas = async (id: string, novaOrdem: number, loja: string) => {
    await supabase.from('perguntas_nps').update({ ordem: novaOrdem }).eq('id', id);
    buscarPerguntasNpsMesa();
  };

  const carregarConfigQrMesa = async () => {
    if (!lojaId) return;
    const { data } = await supabase.from('config_mesa').select('*').eq('loja_id', lojaId).maybeSingle();
    if (data) {
      setQrMesaAtivo(data.ativo);
      setLinkGoogleMeuNegocio(data.link_google || '');
      setBonusMultiplicador(data.bonus_multiplicador || 2.0);
    }
  };

  const salvarConfigQrMesa = async (id: string) => {
    const { error } = await supabase.from('config_mesa').upsert({ loja_id: id, ativo: qrMesaAtivo, link_google: linkGoogleMeuNegocio, bonus_multiplicador: bonusMultiplicador }, { onConflict: 'loja_id' });
    if (!error) mostrarToast('Configurações da Mesa salvas!', 'sucesso');
  };

  const fazerDownloadQrMesa = (loja: string, nome: string) => {
    const url = `https://springs.amp.ia.br/mesa-roleta?loja_id=${loja}`;
    if (Platform.OS === 'web') window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(url)}`, '_blank');
  };

  const exportarTelefonesCSV = (id: any) => {
    const rows = contatosMesa.map(c => `${c.cliente_cpf};${c.nota_nps};${c.status};${c.data_participacao}`);
    const csv = "Telefone;Nota;Status;Data\n" + rows.join("\n");
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.setAttribute('hidden', ''); a.setAttribute('href', url); a.setAttribute('download', 'contatos_springs.csv');
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  };

  const toggleSelecionado = (id: string) => {
    if (selecionados.includes(id)) setSelecionados(selecionados.filter(s => s !== id));
    else setSelecionados([...selecionados, id]);
  };

  const toggleSelecionarTodos = () => {
    if (selecionarTodos) { setSelecionados([]); setSelecionarTodos(false); }
    else { setSelecionados(contatosFiltrados.map(c => c.id)); setSelecionarTodos(true); }
  };

  const enviarWhatsApp = async (contato: any, template: any, loja: string) => {
    let msg = template.mensagem.replace('[LOJA]', config.nome_loja || 'Nossa Loja').replace('[PREMIO]', contato.premio_ganho || 'brinde especial');
    const url = `https://wa.me/55${contato.cliente_cpf}?text=${encodeURIComponent(msg)}`;
    await supabase.from('contatos_mesa_remarketing').update({ status: 'contatado', data_ultimo_contato: new Date().toISOString() }).eq('id', contato.id);
    if (Platform.OS === 'web') window.open(url, '_blank'); else Linking.openURL(url);
    buscarContatosRemarketing();
  };

  const marcarComoRespondeu = async (id: string, loja: string) => {
    await supabase.from('contatos_mesa_remarketing').update({ status: 'respondeu' }).eq('id', id);
    buscarContatosRemarketing();
  };

  const marcarComoConverteu = async (id: string, loja: string) => {
    await supabase.from('contatos_mesa_remarketing').update({ status: 'converteu' }).eq('id', id);
    buscarContatosRemarketing();
  };

  const deletarContato = async (id: string, loja: string) => {
    if (!confirm('Excluir este contato?')) return;
    await supabase.from('contatos_mesa_remarketing').delete().eq('id', id);
    buscarContatosRemarketing();
  };

  const enviarParaSelecionados = async (loja: string) => {
    if (!templateSelecionado) return;
    const template = templatesWA.find(t => t.id === templateSelecionado);
    if (!template) return;
    for (const id of selecionados) {
      const contato = contatosMesa.find(c => c.id === id);
      if (contato) await enviarWhatsApp(contato, template, loja);
    }
    setSelecionados([]); setSelecionarTodos(false);
  };

  const contatosFiltrados = contatosMesa.filter(c => {
    const matchTelefone = c.cliente_cpf.includes(buscarTelefone.replace(/\D/g, ''));
    // Se nenhum filtro de status estiver selecionado, não mostra quem já converteu (venda realizada)
    const matchStatus = filtroStatus === '' ? c.status !== 'converteu' : c.status === filtroStatus;
    const matchNps = filtroNps === 0 || c.nota_nps === filtroNps;
    let matchData = true;
    if (filtroData === 'ultimos-7d') {
      const seteDias = new Date(); seteDias.setDate(seteDias.getDate() - 7);
      matchData = new Date(c.data_participacao) >= seteDias;
    } else if (filtroData === 'ultimos-30d') {
      const trintaDias = new Date(); trintaDias.setDate(trintaDias.getDate() - 30);
      matchData = new Date(c.data_participacao) >= trintaDias;
    }
    return matchTelefone && matchStatus && matchNps && matchData;
  });

  // --- CORE FUNCTIONS ---
  const parseDataSupabase = (dataStr: string) => {
    if (!dataStr) return new Date();
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) {
      const t = dataStr.split(/[- : T Z .]/);
      return new Date(Number(t[0]), Number(t[1]) - 1, Number(t[2]), Number(t[3] || 0), Number(t[4] || 0), Number(t[5] || 0));
    }
    return d;
  };

  const normalizarCPF = (t: string) => {
    let clean = t.replace(/\D/g, '');
    if (clean.length === 13 && clean.startsWith('55')) return clean.substring(2);
    return clean;
  };

  const formatarTelefone = (t: string) => {
    const clean = t.replace(/\D/g, '');
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    return clean;
  };

  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const mostrarToast = (msg: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ message: msg, tipo, visible: true });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 20, duration: 400, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: -100, duration: 400, useNativeDriver: true })
    ]).start(() => setToast(prev => ({ ...prev, visible: false })));
  };

  useEffect(() => {
    const load = async () => {
      const savedVersion = localStorage.getItem('@app_version_merchant');
      if (savedVersion !== APP_VERSION) {
        // Para o lojista, limpamos apenas caches técnicos, sem deslogar (mantendo @loja_id_merchant)
        localStorage.setItem('@app_version_merchant', APP_VERSION);
      }
      
      const id = localStorage.getItem('@loja_id_merchant');
      if (!id) { router.replace('/login'); return; }
      setLojaId(id);
      const op = localStorage.getItem('@operador_nome') || 'Master';
      setOperadorLogado(op);
      await carregarEquipe();
    };
    load();
  }, []);

  const buscarFila = async () => {
    if (!lojaId) return;
    const { data: ckData } = await supabase.from('checkins').select('*').eq('loja_id', lojaId).eq('status', 'aguardando').order('created_at', { ascending: true });
    
    // Buscar se clientes na fila possuem tokens de intercâmbio
    if (ckData && ckData.length > 0) {
      const cpfs = ckData.map(c => c.cliente_cpf);
      const { data: tkData } = await supabase.from('intercambio_tokens').select('cliente_cpf, token, total_pontos_a_transferir').in('cliente_cpf', cpfs).eq('status', 'pendente');
      
      const filaComTokens = ckData.map(c => {
        const tokenInfo = tkData?.find(t => t.cliente_cpf === c.cliente_cpf);
        return {
          ...c,
          temToken: !!tokenInfo,
          tokenPontos: tokenInfo?.total_pontos_a_transferir || 0
        };
      });
      setFila(filaComTokens);
    } else {
      setFila([]);
    }
  };

  const buscarFinanceiroDetalhado = async (cpf: string, idCheckin?: string) => {
    if (!lojaId) return;

    // Busca direta e correta baseada na estrutura real das tabelas
    const cpfsParaBusca = [cpf, cpf.startsWith('55') ? cpf.substring(2) : '55' + cpf];
    const [{ data: trans }, { data: resg }, { data: cash }, { data: bonus }] = await Promise.all([
      supabase.from('transacoes').select('pontos_gerados').in('cliente_cpf', cpfsParaBusca).eq('loja_id', lojaId),
      supabase.from('resgates').select('pontos_usados').in('cliente_cpf', cpfsParaBusca).eq('loja_id', lojaId),
      supabase.from('cashbacks').select('valor').in('cliente_cpf', cpfsParaBusca).eq('loja_id', lojaId).eq('usado', false),
      supabase.from('bonus_pendentes').select('pontos').in('cliente_cpf', cpfsParaBusca).eq('loja_id', lojaId).gt('data_expiracao', new Date().toISOString()).eq('usado', false)
    ]);

    // Cálculo de Springs: Ganhos em transações - Usados em resgates
    const totalGerado = (trans || []).reduce((s, t) => s + (Number(t.pontos_gerados) || 0), 0);
    const totalUsado = (resg || []).reduce((s, r) => s + (Number(r.pontos_usados) || 0), 0);
    const saldoFinal = Math.max(0, totalGerado - totalUsado);

    // Cálculo de Cashback: Apenas os que não foram usados ainda
    const cashbackFinal = (cash || []).reduce((s, c) => s + (Number(c.valor) || 0), 0);

    setCashbacks((prev: any) => ({ 
      ...prev, 
      [cpf]: { 
        total: cashbackFinal, 
        proximo: cashbackFinal, 
        pontos: saldoFinal 
      } 
    }));

    const totalBonus = (bonus || []).reduce((s, b) => s + (b.pontos || 0), 0);
    setBonusPendentes((prev: any) => ({ ...prev, [cpf]: totalBonus }));

    if (idCheckin && totalBonus > 0) setUsarBonus((prev: any) => ({ ...prev, [idCheckin]: true }));

    const { data: br } = await supabase.from('brindes_pendentes').select('*').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('resgatado', false);
    setBrindesPendentes((prev: any) => ({ ...prev, [cpf]: br || [] }));

    const { data: pm } = await supabase.from('roleta_mesa_participacoes').select('*').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('premio_resgatado', false).order('created_at', { ascending: false });
    setPremiosMesaPendentes((prev: any) => ({ ...prev, [cpf]: pm || [] }));
  };

  const resgatarPremioMesa = async (idPremio: string, cpf: string) => {
    const { error } = await supabase.from('roleta_mesa_participacoes').update({ premio_resgatado: true }).eq('id', idPremio);
    if (error) { mostrarToast('Erro ao resgatar prêmio.', 'erro'); return; }
    mostrarToast('✅ Prêmio da Mesa Resgatado!', 'sucesso');
    
    buscarFila();
    buscarAvaliacoesERoleta();
  };

  const buscarStats = async () => {
    if (!lojaId) return;

    try {
      const agora = new Date();
      const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0, 0).toISOString();
      const fimHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999).toISOString();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0).toISOString();
      const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const { data: recompensasData } = await supabase.from('recompensas').select('id,nome').eq('loja_id', lojaId);
      const recompensasMap: any = {};
      (recompensasData || []).forEach((r: any) => { recompensasMap[r.id] = r.nome; });

      const { data: vendasData, error: vendasError } = await supabase.from('transacoes').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false });
      if (vendasError) { console.log(vendasError); return; }

      const vendas = vendasData || [];

      const vendasHoje = vendas.filter((v: any) => {
        const dataVenda = parseDataSupabase(v.created_at).getTime();
        return dataVenda >= new Date(inicioHoje).getTime() && dataVenda <= new Date(fimHoje).getTime();
      });

      const vendasMes = vendas.filter((v: any) => {
        const dataVenda = parseDataSupabase(v.created_at).getTime();
        return dataVenda >= new Date(inicioMes).getTime() && dataVenda <= new Date(fimMes).getTime();
      });

      const totalDia = vendasHoje.reduce((s: number, v: any) => s + Number(v.valor || 0), 0);
      const totalMes = vendasMes.reduce((s: number, v: any) => s + Number(v.valor || 0), 0);
      const ticketMedio = vendasHoje.length > 0 ? totalDia / vendasHoje.length : 0;
      const clientesUnicosHoje = new Set(vendasHoje.map((v: any) => v.cliente_cpf)).size;

      const vendasDiaFormatada = [...vendasHoje].sort((a: any, b: any) => Number(b.valor || 0) - Number(a.valor || 0)).slice(0, 10).map((v: any) => ({
        cpf: v.cliente_cpf, valor: Number(v.valor || 0), dataHora: parseDataSupabase(v.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      }));

      const { data: resgatesData } = await supabase.from('resgates').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false });
      const resgates = resgatesData || [];

      const resgatesMesLista = resgates.filter((r: any) => {
        const dataR = parseDataSupabase(r.created_at).getTime();
        return dataR >= new Date(inicioMes).getTime() && dataR <= new Date(fimMes).getTime();
      });

      const resgatesHojeLista = resgates.filter((r: any) => {
        const dataR = parseDataSupabase(r.created_at).getTime();
        return dataR >= new Date(inicioHoje).getTime() && dataR <= new Date(fimHoje).getTime();
      });

      const agrupados: any = {};
      let pontosResgatadosHoje = 0;

      resgatesMesLista.forEach((r: any) => {
        const nome = recompensasMap[r.recompensa_id] || 'Prêmio';
        if (!agrupados[nome]) agrupados[nome] = { nome, qtde: 0, pontos: 0 };
        agrupados[nome].qtde += 1;
        agrupados[nome].pontos += Number(r.pontos_usados || 0);
      });

      resgatesHojeLista.forEach((r: any) => { pontosResgatadosHoje += Number(r.pontos_usados || 0); });

      const resgatesSumarizados = Object.values(agrupados).sort((a: any, b: any) => b.qtde - a.qtde);
      const resgatesListados = resgatesHojeLista.slice(0, 50).map((r: any) => ({
        nome: recompensasMap[r.recompensa_id] || 'Prêmio', telefone: r.cliente_cpf, dataHora: parseDataSupabase(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }));

      const ultimosResgates = resgates.slice(0, 5).map((r: any) => ({
        cliente_cpf: r.cliente_cpf, nome_premio: recompensasMap[r.recompensa_id] || 'Prêmio'
      }));

      const ultimoPorCliente = new Map();
      vendas.forEach((v: any) => {
        const cpfNorm = normalizarCPF(v.cliente_cpf);
        if (!ultimoPorCliente.has(cpfNorm)) ultimoPorCliente.set(cpfNorm, v);
      });

      const crmLista = Array.from(ultimoPorCliente.values()).map((v: any) => {
        const ultimaCompra = parseDataSupabase(v.created_at);
        const retorno = new Date(ultimaCompra);
        retorno.setDate(retorno.getDate() + 15);
        return { ...v, atrasado: retorno.getTime() < Date.now(), dataRetorno: retorno };
      });

      const atrasados = crmLista.filter((c: any) => c.atrasado);
      setHistoricoCRM(atrasados);
      setClientesAtrasados(atrasados.length);

      const cashbackUsadoMes = resgatesMesLista.reduce((a: any, r: any) => a + (Number(r.valor_cashback) || 0), 0);
      const pontosResgatadosMesTotal = resgatesMesLista.reduce((a: any, r: any) => a + (Number(r.pontos_usados) || 0), 0);
      const custoEstimadoPontos = pontosResgatadosMesTotal * (1 / (Number(config.reais_por_ponto) || 1));
      const investimentoTotal = (cashbackUsadoMes + custoEstimadoPontos) || 1; // evita divisão por zero
      const roi = totalMes / investimentoTotal;

      setStats({
        totalMes, totalDia, vendasCount: vendasHoje.length, vendasCountTotal: vendas.length,
        ticketMedio, totalClientesDia: clientesUnicosHoje, resgatesHojeLista, resgatesMesLista,
        resgatesAgrupados: resgatesSumarizados, pontosResgatadosHoje, ultimosResgates, vendasDiaFormatada,
        resgatesSumarizados, resgatesListados, roi
      });

    } catch (error) {
      console.log('ERRO buscarStats:', error);
    }
  };

  const buscarAvaliacoesERoleta = async () => {
    if (!lojaId) return;
    
    const { data: avData } = await supabase.from('respostas_nps').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false });
    const { data: pData } = await supabase.from('perguntas_nps').select('id, pergunta').eq('loja_id', lojaId);
    
    const pMap: any = {};
    (pData || []).forEach(p => pMap[p.id] = p.pergunta);

    const avs = avData || [];
    
    setAvaliacoes(avs.filter(a => a.resposta !== 'JOGADA_ROLETA').slice(0, 50).map(a => {
      let nota = a.nota;
      if (!nota && a.resposta) {
        if (!isNaN(Number(a.resposta))) nota = Number(a.resposta);
        else {
          const rLow = a.resposta.toLowerCase();
          if (rLow === 'sim' || rLow === 'positivo') nota = 5;
          else if (rLow === 'neutro') nota = 3;
          else if (rLow === 'nao' || rLow === 'negativo') nota = 1;
        }
      }
      return {
        nota: nota || 0,
        respostaStr: a.resposta,
        comentario: a.comentario,
        data: a.created_at,
        cliente: a.cliente_cpf,
        perguntaTexto: pMap[a.pergunta_id] || 'Pergunta Geral'
      };
    }).sort((a, b) => a.nota - b.nota));

    const agrupadosPorDia: any = {};
    const chartDataArray = [];
    
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const diaStr = d.toLocaleDateString('pt-BR', { day: '2-digit' });
      agrupadosPorDia[diaStr] = { verde: 0, amarelo: 0, vermelho: 0, label: diaStr };
      chartDataArray.push(agrupadosPorDia[diaStr]);
    }

    avs.forEach(av => {
      const d = parseDataSupabase(av.created_at);
      const diaStr = d.toLocaleDateString('pt-BR', { day: '2-digit' });
      
      let nota = av.nota;
      if (!nota && av.resposta) {
        if (!isNaN(Number(av.resposta))) {
          nota = Number(av.resposta);
        } else {
          const rLow = av.resposta.toLowerCase();
          if (rLow === 'sim' || rLow === 'positivo') nota = 5;
          else if (rLow === 'neutro') nota = 3;
          else if (rLow === 'nao' || rLow === 'negativo') nota = 1;
        }
      }

      if (agrupadosPorDia[diaStr] && nota) {
        if (nota >= 4) agrupadosPorDia[diaStr].verde += 1;
        else if (nota === 3) agrupadosPorDia[diaStr].amarelo += 1;
        else agrupadosPorDia[diaStr].vermelho += 1;
      }
    });

    let maxVal = 1;
    chartDataArray.forEach(d => {
      if (d.verde > maxVal) maxVal = d.verde;
      if (d.amarelo > maxVal) maxVal = d.amarelo;
      if (d.vermelho > maxVal) maxVal = d.vermelho;
    });

    setNpsChart({ dias: chartDataArray, max: maxVal });

    let sumNotas = 0;
    let countNotas = 0;
    avs.forEach(av => {
      let nota = av.nota;
      if (!nota && av.resposta) {
        if (!isNaN(Number(av.resposta))) {
          nota = Number(av.resposta);
        } else {
          const rLow = av.resposta.toLowerCase();
          if (rLow === 'sim' || rLow === 'positivo') nota = 5;
          else if (rLow === 'neutro') nota = 3;
          else if (rLow === 'nao' || rLow === 'negativo') nota = 1;
        }
      }
      if (nota) { sumNotas += nota; countNotas++; }
    });
    setMediaEstrelas(countNotas > 0 ? sumNotas / countNotas : 0);

    const { data: rolData } = await supabase.from('roleta_premios').select('*').eq('loja_id', lojaId).order('probabilidade', { ascending: false });
    setPremiosRoleta(rolData || []);
  };

  const carregarConfig = async () => {
    if (!lojaId) return;
    const { data } = await supabase.from('configuracoes_loja').select('*').eq('loja_id', lojaId).maybeSingle();
    const { data: lojaData } = await supabase.from('lojas').select('senha, limite_usuarios').eq('id', lojaId).single();

    if (lojaData) setLojaLimiteUsers(lojaData.limite_usuarios || 1);

    if (data) {
      setConfig((prev: any) => ({
        ...prev,
        ...data,
        senha: lojaData?.senha || '',
        cashback_percent: String(data.cashback_percent || 0),
        reais_por_ponto: String(data.reais_por_ponto || 1),
        limite_resgates_diario_cliente: data.limite_resgates_diario_cliente !== null && data.limite_resgates_diario_cliente !== undefined ? String(data.limite_resgates_diario_cliente) : '',
        tempo_bloqueio_minutos: data.tempo_bloqueio_minutos !== null && data.tempo_bloqueio_minutos !== undefined ? String(data.tempo_bloqueio_minutos) : '',
        bonus_retorno_pontos: String(data.bonus_retorno_pontos || 50),
        bonus_retorno_validade_dias: String(data.bonus_retorno_validade_dias || 3),
        roleta_ativa: data.roleta_ativa || false,
        roleta_intervalo_dias: data.roleta_intervalo_dias !== null && data.roleta_intervalo_dias !== undefined ? String(data.roleta_intervalo_dias) : '1',
        intercambio_taxa: data.intercambio_taxa !== null && data.intercambio_taxa !== undefined ? String(data.intercambio_taxa) : '0.1'
      }));
    } else {
      setConfig((prev: any) => ({ ...prev, senha: lojaData?.senha || '' }));
    }

    if (typeof window !== 'undefined') {
      const op = localStorage.getItem('@operador_nome');
      if (op) setOperadorLogado(op);
    }
  };

  const carregarEquipe = async () => {
    if (!lojaId) return;
    const { data } = await supabase.from('usuarios_loja').select('*').eq('loja_id', lojaId).order('created_at', { ascending: true });
    setOperadores(data || []);
  };

  const salvarOperador = async () => {
    if (!lojaId) return;
    if (!formOperador.username || !formOperador.senha || !formOperador.nome) { mostrarToast('Preencha todos os campos do operador.', 'erro'); return; }

    if (operadores.length >= lojaLimiteUsers) { mostrarToast(`Limite de ${lojaLimiteUsers} sub-conta(s) atingido.`, 'erro'); return; }

    const { error } = await supabase.from('usuarios_loja').insert([{
      loja_id: lojaId,
      username: formOperador.username.toLowerCase().trim(),
      senha: formOperador.senha,
      nome: formOperador.nome
    }]);

    if (error) {
      if (error.code === '23505') mostrarToast('Este nome de usuário já existe.', 'erro');
      else mostrarToast(error.message, 'erro');
    } else {
      mostrarToast('Operador adicionado!', 'sucesso');
      setFormOperador({ username: '', senha: '', nome: '' });
      setMostrarEquipeModal(false);
      carregarEquipe();
    }
  };

  const excluirOperador = async (id: string) => {
    const { error } = await supabase.from('usuarios_loja').delete().eq('id', id);
    if (!error) { mostrarToast('Operador removido.', 'sucesso'); carregarEquipe(); }
  };

  const iniciarRealtime = () => {
    if (!lojaId) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (channelResgateRef.current) supabase.removeChannel(channelResgateRef.current);

    const channelCheckin = supabase.channel(`fila_aberta_${lojaId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, (p) => { buscarFila(); buscarStats(); if (p.eventType === 'INSERT') Vibration.vibrate([0, 500, 200, 500]); }).subscribe();
    
    const pollTimer = setInterval(() => {
      buscarFila();
    }, 10000);

    const channelResgate = supabase.channel(`resgates_geral_escuta`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resgates' }, async (p) => {
      if (p.new.loja_id !== lojaId) return;
      setTimeout(() => { buscarStats(); }, 1500); Vibration.vibrate([0, 1000, 500, 1000]);
      const { data: premio } = await supabase.from('recompensas').select('nome').eq('id', p.new.recompensa_id).single();
      mostrarToast(`🎁 NOVO RESGATE: ${formatarTelefone(p.new.cliente_cpf)}\n1x ${premio?.nome || 'Produto'}`, 'sucesso');
    }).subscribe();

    const channelRemarketing = supabase.channel(`remarketing_escuta_${lojaId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contatos_mesa_remarketing' }, (p) => {
      if (p.new.loja_id === lojaId) {
        buscarContatosRemarketing();
        Vibration.vibrate(200);
        mostrarToast('📞 NOVO CONTATO PARA REMARKETING!', 'sucesso');
      }
    }).subscribe();

    const channelMesa = supabase.channel(`mesa_participacoes_${lojaId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'roleta_mesa_participacoes' }, (p) => {
      if (p.new.loja_id === lojaId) {
        buscarParticipacoesMesa();
        mostrarToast('🎡 NOVO GIRO NA MESA!', 'sucesso');
      }
    }).subscribe();

    channelRef.current = channelCheckin; 
    channelResgateRef.current = channelResgate;
  };

  useEffect(() => {
    if (!lojaId) return;
    const loadAll = async () => {
      await carregarConfig();
      await buscarFila();
      await buscarStats();
      await buscarAvaliacoesERoleta();
      await buscarRewards();
      await buscarParticipacoesMesa();
      await buscarPremiosMesa();
      await buscarContatosRemarketing();
      await buscarPerguntasNpsMesa();
      await carregarConfigQrMesa();
      iniciarRealtime();
    };
    loadAll();

    const interval = setInterval(() => {
      buscarFila();
      buscarStats();
      buscarAvaliacoesERoleta();
      buscarContatosRemarketing();
      buscarParticipacoesMesa();
    }, 30000);

    return () => { 
      clearInterval(interval);
      if (channelRef.current) supabase.removeChannel(channelRef.current); 
      if (channelResgateRef.current) supabase.removeChannel(channelResgateRef.current); 
    };
  }, [lojaId]);

  useEffect(() => {
    if (fila.length) fila.forEach((c) => buscarFinanceiroDetalhado(c.cliente_cpf, c.id));
  }, [fila]);

  const processarPagamento = async (cpfTarget: string, valorFloat: number, usaBonusBool: boolean = false) => {
    const { error } = await supabase.rpc('realizar_pagamento', { p_cliente_cpf: cpfTarget, p_loja_id: lojaId, p_valor: valorFloat, p_usar_cashback: true, p_aplicar_bonus: usaBonusBool });
    if (error) { mostrarToast(error.message, 'erro'); return false; }
    return true;
  };

  const atender = async (id: string) => {
    const item = fila.find((f) => f.id === id);
    if (!item) return;
    const valorReal = parseInt(valorVenda[id] || '0', 10) / 100;

    if ((!valorReal || valorReal <= 0) && !usarBonus[item.id]) { mostrarToast('Digite o valor da venda ou ative um Bônus.', 'erro'); return; }

    const sucesso = await processarPagamento(item.cliente_cpf, valorReal, usarBonus[item.id] !== false);
    if (sucesso) {
      await supabase.from('checkins').update({ status: 'atendido' }).eq('id', id);
      
      // Atualizar status no Remarketing se existir (considerando variações de prefixo 55)
      const cpfsParaUpdate = [item.cliente_cpf, item.cliente_cpf.startsWith('55') ? item.cliente_cpf.substring(2) : '55' + item.cliente_cpf];
      const { data: remarketUpdate } = await supabase.from('contatos_mesa_remarketing')
        .update({ status: 'converteu' })
        .in('cliente_cpf', cpfsParaUpdate)
        .eq('loja_id', lojaId)
        .select();

      if (remarketUpdate && remarketUpdate.length > 0) {
        setContatosMesa(prev => prev.map(c => 
          cpfsParaUpdate.includes(c.cliente_cpf) ? { ...c, status: 'converteu' } : c
        ));
      }

      setTimeout(async () => { await supabase.from('checkins').delete().eq('id', id); }, 5000); 
      Vibration.vibrate(200);
      setFila(prev => prev.filter(f => f.id !== id));
      setValorVenda((prev: any) => { const n = { ...prev }; delete n[id]; return n; });
      setUsarBonus((prev: any) => { const n = { ...prev }; delete n[id]; return n; });
      mostrarToast('✅ Venda registrada com sucesso!', 'sucesso');
      setTimeout(() => { buscarStats(); buscarContatosRemarketing(); }, 1500);
    }
  };

  const removerDaFila = async (id: string) => {
    if (!window.confirm('Deseja realmente remover este cliente da fila?')) return;
    await supabase.from('checkins').delete().eq('id', id);
    setFila(prev => prev.filter(f => f.id !== id));
    if (clienteFocadoId === id) setClienteFocadoId(null);
    mostrarToast('❌ Cliente removido.', 'sucesso');
  };

  const entregarBrinde = async (idBrinde: string, cpf: string) => {
    const { error } = await supabase.from('brindes_pendentes').update({ resgatado: true }).eq('id', idBrinde);
    if (error) { mostrarToast('Erro ao entregar brinde.', 'erro'); return; }
    mostrarToast('🎁 Brinde entregue!', 'sucesso');
    
    buscarFinanceiroDetalhado(cpf);
    buscarStats();
  };

  const atenderManual = async () => {
    const cpfTarget = telefoneManual.replace(/\D/g, '');
    const valorReal = parseInt(valorManual || '0', 10) / 100;

    if (cpfTarget.length < 10) { mostrarToast('Telefone inválido.', 'erro'); return; }
    if ((!valorReal || valorReal <= 0) && !usarBonus['manual']) { mostrarToast('Digite o valor da venda ou ative um Bônus.', 'erro'); return; }

    const sucesso = await processarPagamento(cpfTarget, valorReal, usarBonus['manual'] !== false);
    if (sucesso) {
      await supabase.from('checkins').delete().eq('cliente_cpf', cpfTarget).eq('loja_id', lojaId);
      
      // Atualizar status no Remarketing se existir
      const cpfsParaManual = [cpfTarget, cpfTarget.startsWith('55') ? cpfTarget.substring(2) : '55' + cpfTarget];
      const { data: remUpdate } = await supabase.from('contatos_mesa_remarketing')
        .update({ status: 'converteu' })
        .in('cliente_cpf', cpfsParaManual)
        .eq('loja_id', lojaId)
        .select();

      if (remUpdate && remUpdate.length > 0) {
        setContatosMesa(prev => prev.map(c => 
          cpfsParaManual.includes(c.cliente_cpf) ? { ...c, status: 'converteu' } : c
        ));
      }

      Vibration.vibrate(200); setTelefoneManual(''); setValorManual(''); setUsarBonus((prev: any) => ({ ...prev, ['manual']: false })); buscarFila(); setMostrarManual(false);
      mostrarToast('✅ Venda Manual registrada!', 'sucesso'); 
      setTimeout(() => { buscarStats(); buscarContatosRemarketing(); }, 1500);
    }
  };

  const iniciarCRM = (cpf: string) => {
    const pontos = Number(config.bonus_retorno_pontos) || 50;
    const dias = Number(config.bonus_retorno_validade_dias) || 3;
    setModalCRM({ visivel: true, cpf, pontos, dias });
  };

  const confirmarCRM = async (comBonus: boolean) => {
    if (!modalCRM) return;
    const { cpf, pontos, dias } = modalCRM;
    setModalCRM(null);

    if (comBonus) {
      const { error } = await supabase.from('bonus_pendentes').insert({ loja_id: lojaId, cliente_cpf: cpf, pontos: pontos, data_expiracao: new Date(new Date().setDate(new Date().getDate() + dias)).toISOString() });
      if (error) { mostrarToast(`Erro ao agendar bônus: ${error.message}`, 'erro'); return; }
      mostrarToast(`🎁 Promessa de ${pontos} SPG agendada!`, 'sucesso');
    }

    const textoBonus = comBonus ? ` Ganhe ${pontos} Springs de presente na sua próxima compra em nossa loja! Válido por ${dias} dias.` : '';
    const texto = encodeURIComponent(`Olá! Sentimos sua falta.${textoBonus}`);

    setTimeout(() => {
      if (Platform.OS === 'web') window.open(`https://wa.me/55${cpf}?text=${texto}`, '_blank');
      else Linking.openURL(`https://wa.me/55${cpf}?text=${texto}`);
    }, 500);
  };

  const salvarRoleta = async () => {
    if (!editandoRoletaId) return;
    if (!formRoleta.nome || !formRoleta.tipo || !formRoleta.probabilidade) { mostrarToast("Preencha Nome, Tipo e Probabilidade.", 'erro'); return; }

    const payload = {
      loja_id: lojaId, nome: formRoleta.nome,
      tipo: formRoleta.tipo.toLowerCase().trim(),
      valor: Number(formRoleta.valor) || 0,
      probabilidade: Number(formRoleta.probabilidade) || 10,
      ativo: true
    };

    if (editandoRoletaId === 'novo') await supabase.from('roleta_premios').insert([payload]);
    else await supabase.from('roleta_premios').update(payload).eq('id', editandoRoletaId);

    mostrarToast('🎡 Roleta atualizada!', 'sucesso');
    setEditandoRoletaId(null); setFormRoleta({}); buscarAvaliacoesERoleta();
  };

  const apagarRoleta = async (id: string) => {
    await supabase.from('roleta_premios').delete().eq('id', id);
    mostrarToast('Item apagado.', 'sucesso');
    buscarAvaliacoesERoleta();
  };

  const baixarQRCode = () => {
    if (qrDownloadRef.current) {
      qrDownloadRef.current.toDataURL((dataURL: string) => {
        if (Platform.OS === 'web') {
          const link = document.createElement('a'); 
          link.href = `data:image/png;base64,${dataURL}`; 
          link.download = `QRCode_Springs_10x10cm_${config.nome_loja ? config.nome_loja.replace(/\s+/g, '_') : 'Loja'}.png`; 
          link.click();
          mostrarToast('📥 QR Code pronto para impressão (10x10cm)!', 'sucesso');
        } else Alert.alert('Baixar Imagem', 'Por favor, acesse o painel pelo computador para baixar a imagem em alta qualidade.');
      });
    }
  };

  const salvarConfig = async () => {
    setLoadingSalvar(true);
    const { error } = await supabase.from('configuracoes_loja').upsert({
      loja_id: lojaId, nome_loja: config.nome_loja, cor_primaria: config.cor_primaria,
      cashback_percent: Number(config.cashback_percent) || 0, cashback_expiracao_dias: Number(config.cashback_expiracao_dias) || 30,
      cashback_limite_uso_percent: Number(config.cashback_limite_uso_percent) || 100, reais_por_ponto: Number(config.reais_por_ponto) || 1,
      pontos_expiracao_dias: Number(config.pontos_expiracao_dias) || 365, pontos_sobre_valor_bruto: config.pontos_sobre_valor_bruto,
      limite_resgates_diario_cliente: config.limite_resgates_diario_cliente ? Number(config.limite_resgates_diario_cliente) : null,
      tempo_bloqueio_minutos: config.tempo_bloqueio_minutos ? Number(config.tempo_bloqueio_minutos) : null,
      bonus_retorno_pontos: Number(config.bonus_retorno_pontos) || 50, bonus_retorno_validade_dias: Number(config.bonus_retorno_validade_dias) || 3,
      usar_cashback_total: config.usar_cashback_total, telefone: config.telefone, endereco: config.endereco, numero: config.numero,
      bairro: config.bairro, cidade: config.cidade, estado: config.estado, cep: config.cep,
      roleta_ativa: config.roleta_ativa, 
      roleta_intervalo_dias: config.roleta_intervalo_dias !== "" ? Number(config.roleta_intervalo_dias) : 1,
      link_google_meu_negocio: config.link_google_meu_negocio || null,
      intercambio_taxa: Number(config.intercambio_taxa) || 0.1
    }, { onConflict: 'loja_id' });

    if (config.senha && config.senha.trim() !== '') await supabase.from('lojas').update({ senha: config.senha }).eq('id', lojaId);
    setLoadingSalvar(false);
    if (error) { mostrarToast(`Erro ao salvar: ${error.message}`, 'erro'); return; }
    mostrarToast('⚙️ Configurações salvas com sucesso!', 'sucesso');
    setTimeout(() => { setMostrarConfig(false); }, 1000);
  };

  const validarTokenExchange = async () => {
    if (tokenParaValidar.length !== 6) { mostrarToast('Token deve ter 6 dígitos.', 'erro'); return; }
    setCarregandoValidacao(true);
    try {
      const tokenData = await buscarTokenCompleto(tokenParaValidar);
      if (!tokenData || tokenData.status !== 'pendente') { mostrarToast('Token inválido ou já utilizado.', 'erro'); setCarregandoValidacao(false); return; }
      if (tokenExpirou(tokenData.expira_em)) { mostrarToast('⏰ Token expirou (máximo 48h).', 'erro'); setCarregandoValidacao(false); return; }
      for (const item of tokenData.intercambio_itens) {
        const saldo = await calcularSaldoCliente(tokenData.cliente_cpf, item.loja_origem_id);
        if (saldo < item.pontos_selecionados) { mostrarToast(`⚠️ Saldo insuficiente nesta loja. Disponível: ${saldo}, Necessário: ${item.pontos_selecionados}`, 'erro'); setCarregandoValidacao(false); return; }
      }
      const taxaDesagio = 0.1; 
      const { pontos_liquido, taxa_pontos } = aplicarTaxa(tokenData.total_pontos_a_transferir, taxaDesagio);
      const { data: caixa, error: caixaError } = await supabase.from('intercambio_caixa').insert([{
        token_id: tokenData.id, cliente_cpf: tokenData.cliente_cpf, loja_destino_id: lojaId, pontos_disponiveis: pontos_liquido, pontos_original: tokenData.total_pontos_a_transferir,
        taxa_aplicada_percentual: taxaDesagio, taxa_em_pontos: taxa_pontos, status: 'ativo', criado_em: new Date().toISOString(),
        expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), merchant_validou_em: new Date().toISOString(), merchant_validou_usuario: operadorLogado
      }]).select().single();
      if (caixaError) throw caixaError;
      for (const item of tokenData.intercambio_itens) { await supabase.from('transacoes').insert([{ cliente_cpf: tokenData.cliente_cpf, loja_id: item.loja_origem_id, pontos_usados: item.pontos_selecionados, pontos_gerados: 0, descricao: `[RESERVA EXCHANGE] Token: ${tokenParaValidar}` }]); }
      setCaixaAtiva(caixa); mostrarToast(`✅ Token validado!\n${pontos_liquido} SPG na caixa\nTaxa: ${taxa_pontos} SPG`, 'sucesso');
      setTokenParaValidar(''); setMostrarValidarToken(false);
    } catch (error) { console.error('Erro ao validar token:', error); mostrarToast('Erro ao validar token.', 'erro'); } finally { setCarregandoValidacao(false); }
  };

  const resgatarBrinde = async (brinde: any, clienteCpf: string) => {
    try {
      const clean = clienteCpf.replace(/\D/g, '');
      const activeCaixa = await buscarCaixaAtivaCliente(clean);
      let usouCaixa = false;
      if (activeCaixa && activeCaixa.pontos_disponiveis >= brinde.custo_pontos) {
        await supabase.from('resgates').insert([{ cliente_cpf: clean, loja_id: lojaId, recompensa_id: brinde.id, pontos_usados: brinde.custo_pontos, valor_cashback: 0, descricao: `Resgate via EXCHANGE` }]);
        const novoSaldo = activeCaixa.pontos_disponiveis - brinde.custo_pontos;
        await supabase.from('intercambio_caixa').update({ pontos_disponiveis: novoSaldo, status: novoSaldo > 0 ? 'parcialmente_usado' : 'vazio', updated_at: new Date().toISOString() }).eq('id', activeCaixa.id);
        const { data: itens } = await supabase.from('intercambio_itens').select('*').eq('token_id', activeCaixa.token_id);
        for (const item of itens || []) {
          await supabase.from('intercambio_historico_detalhado').insert([{
            cliente_cpf: clean, token_id: activeCaixa.token_id, caixa_id: activeCaixa.id, loja_origem_id: item.loja_origem_id, loja_destino_id: activeCaixa.loja_destino_id,
            pontos_saida_bruto: item.pontos_selecionados, taxa_desagio_percentual: activeCaixa.taxa_aplicada_percentual, taxa_em_pontos: activeCaixa.taxa_em_pontos,
            pontos_chegada_liquido: activeCaixa.pontos_disponiveis, premio_resgatado_id: brinde.id, premio_resgatado_nome: brinde.nome, motivo: 'resgate_brinde', status_transacao: 'sucesso'
          }]);
        }
        usouCaixa = true;
      } else {
        await supabase.from('resgates').insert([{ cliente_cpf: clean, loja_id: lojaId, recompensa_id: brinde.id, pontos_usados: brinde.custo_pontos }]);
      }
      mostrarToast(`✅ Brinde ${brinde.nome} resgatado!`, 'sucesso');
      if (usouCaixa && activeCaixa) {
        const novoSaldo = activeCaixa.pontos_disponiveis - brinde.custo_pontos;
        if (novoSaldo <= 0) setCaixaAtiva(null);
      }
      buscarFila(); buscarStats();
    } catch (error) { console.error('Erro ao resgatar:', error); mostrarToast('Erro ao resgatar brinde.', 'erro'); }
  };


  const buscarRewards = async () => {
    if (!lojaId) return;
    const { data } = await supabase.from('recompensas').select('*').eq('loja_id', lojaId);
    setRewards(data || []);
  };

  const editarReward = (r: any) => {
    setEditandoRewardId((prev) => (prev === r.id ? null : r.id)); setFormError('');
    setForm({ nome: r.nome || '', pontos: r.custo_pontos !== null ? String(r.custo_pontos) : '', imagem: r.imagem || '', limiteCliente: r.limite_por_cliente !== null ? String(r.limite_por_cliente) : '', limiteDia: r.limite_quantidade !== null ? String(r.limite_quantidade) : '', limiteTotal: r.limite_total !== null ? String(r.limite_total) : '' });
  };

  const salvarEdicao = async () => {
    if (!editandoRewardId) return; setFormError('');
    if (!form.nome || form.nome.trim() === '') { setFormError("O Nome do prêmio é obrigatório."); return; }
    const pontos = parseInt(form.pontos);
    if (!pontos || isNaN(pontos) || pontos <= 0) { setFormError("O custo em Springs deve ser maior que zero."); return; }

    const payload = { loja_id: lojaId, nome: form.nome, custo_pontos: pontos, imagem: form.imagem || null, limite_por_cliente: form.limiteCliente ? Number(form.limiteCliente) : null, limite_quantidade: form.limiteDia ? Number(form.limiteDia) : null, limite_total: form.limiteTotal ? Number(form.limiteTotal) : null, ativo: true };
    if (editandoRewardId === 'novo') await supabase.from('recompensas').insert([payload]);
    else await supabase.from('recompensas').update(payload).eq('id', editandoRewardId);
    
    mostrarToast('🎁 Catálogo atualizado!', 'sucesso');
    setEditandoRewardId(null); setForm({}); buscarRewards();
  };

  const linkQR = `https://springs.amp.ia.br/cliente?loja_id=${lojaId}`;
  const clienteAtual = clienteFocadoId ? fila.find(c => c.id === clienteFocadoId) || fila[0] : fila[0];

  if (!lojaId) return <View style={styles.center}><Text style={{ color: '#fff' }}>Carregando Loja...</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      {mostrarConfig && (
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ paddingVertical: 50, width: '100%', alignItems: 'center' }}>
            <View style={[styles.modalCard, { maxWidth: 600 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.modalTitle}>⚙️ Configurações da Loja</Text>
                <TouchableOpacity onPress={() => setMostrarConfig(false)} style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
              </View>
              
              <Text style={styles.label}>NOME DA LOJA:</Text>
              <TextInput value={config.nome_loja} onChangeText={(t) => setConfig({ ...config, nome_loja: t })} style={styles.input} />
              <Text style={[styles.label, { color: '#facc15', marginTop: 10 }]}>📍 LOCALIZAÇÃO E CONTATO:</Text>
              <TextInput value={config.telefone} onChangeText={(t) => setConfig({ ...config, telefone: t })} placeholder="WhatsApp da Loja" placeholderTextColor="#475569" style={styles.input} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 3 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>RUA / AV</Text>
                  <TextInput value={config.endereco} onChangeText={(t) => setConfig({ ...config, endereco: t })} placeholder="Endereço" placeholderTextColor="#475569" style={styles.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>Nº</Text>
                  <TextInput value={config.numero} onChangeText={(t) => setConfig({ ...config, numero: t })} placeholder="Nº" placeholderTextColor="#475569" style={styles.input} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>BAIRRO</Text>
                  <TextInput value={config.bairro} onChangeText={(t) => setConfig({ ...config, bairro: t })} placeholder="Bairro" placeholderTextColor="#475569" style={styles.input} />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>CIDADE</Text>
                  <TextInput value={config.cidade} onChangeText={(t) => setConfig({ ...config, cidade: t })} placeholder="Cidade" placeholderTextColor="#475569" style={styles.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>UF</Text>
                  <TextInput value={config.estado} onChangeText={(t) => setConfig({ ...config, estado: t })} placeholder="UF" placeholderTextColor="#475569" style={styles.input} />
                </View>
              </View>
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>CEP</Text>
                <TextInput value={config.cep} onChangeText={(t) => setConfig({ ...config, cep: t })} placeholder="CEP" placeholderTextColor="#475569" style={styles.input} />
              </View>

              <Text style={[styles.label, { color: '#facc15', marginTop: 20 }]}>💰 REGRAS DE CASHBACK E PONTOS:</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>CASHBACK (%)</Text>
                  <TextInput value={config.cashback_percent} onChangeText={(t) => setConfig({ ...config, cashback_percent: t })} style={styles.input} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>REAIS POR PONTO</Text>
                  <TextInput value={config.reais_por_ponto} onChangeText={(t) => setConfig({ ...config, reais_por_ponto: t })} style={styles.input} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={{ color: '#94a3b8', fontSize: 10 }}>COR (HEX)</Text>
                   <TextInput value={config.cor_primaria} onChangeText={(t) => setConfig({ ...config, cor_primaria: t })} style={styles.input} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>LIMITE USO CB (%)</Text>
                  <TextInput value={config.cashback_limite_uso_percent} onChangeText={(t) => setConfig({ ...config, cashback_limite_uso_percent: t })} style={styles.input} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>EXPIRAÇÃO CB (DIAS)</Text>
                  <TextInput value={config.cashback_expiracao_dias} onChangeText={(t) => setConfig({ ...config, cashback_expiracao_dias: t })} style={styles.input} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>EXPIRAÇÃO PONTOS</Text>
                  <TextInput value={config.pontos_expiracao_dias} onChangeText={(t) => setConfig({ ...config, pontos_expiracao_dias: t })} style={styles.input} keyboardType="numeric" />
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 10 }}>
                <Switch value={config.pontos_sobre_valor_bruto} onValueChange={(v) => setConfig({ ...config, pontos_sobre_valor_bruto: v })} />
                <Text style={{ color: '#fff', fontSize: 12 }}>Pontos sobre Valor Bruto (Sem desconto de cashback)</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
                <Switch value={config.usar_cashback_total} onValueChange={(v) => setConfig({ ...config, usar_cashback_total: v })} />
                <Text style={{ color: '#fff', fontSize: 12 }}>Usar Saldo Total de Cashback (Acumulativo)</Text>
              </View>

              <Text style={[styles.label, { color: '#facc15', marginTop: 20 }]}>🎡 FIDELIDADE E ROLETA:</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                 <View style={{ flex: 2 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 10 }}>PONTOS BÔNUS (RETORNO)</Text>
                    <TextInput value={config.bonus_retorno_pontos} onChangeText={(t) => setConfig({ ...config, bonus_retorno_pontos: t })} style={styles.input} keyboardType="numeric" />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 10 }}>VALIDADE BÔNUS</Text>
                    <TextInput value={config.bonus_retorno_validade_dias} onChangeText={(t) => setConfig({ ...config, bonus_retorno_validade_dias: t })} style={styles.input} keyboardType="numeric" />
                 </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>INTERVALO ROLETA (DIAS)</Text>
                  <TextInput value={config.roleta_intervalo_dias} onChangeText={(t) => setConfig({ ...config, roleta_intervalo_dias: t })} style={styles.input} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>TAXA INTERCÂMBIO (%)</Text>
                  <TextInput value={config.intercambio_taxa} onChangeText={(t) => setConfig({ ...config, intercambio_taxa: t })} style={styles.input} keyboardType="numeric" placeholder="0.10" />
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 15 }}>
                  <Switch value={config.roleta_ativa} onValueChange={(v) => setConfig({ ...config, roleta_ativa: v })} />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>🎡 ATIVA</Text>
                </View>
              </View>

              <Text style={[styles.label, { color: '#facc15', marginTop: 20 }]}>🚫 LIMITES DE SEGURANÇA:</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>LIMITE RESGATES / DIA / CLIENTE</Text>
                  <TextInput value={config.limite_resgates_diario_cliente} onChangeText={(t) => setConfig({ ...config, limite_resgates_diario_cliente: t })} style={styles.input} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>BLOQUEIO NPS (MINUTOS)</Text>
                  <TextInput value={config.tempo_bloqueio_minutos} onChangeText={(t) => setConfig({ ...config, tempo_bloqueio_minutos: t })} style={styles.input} keyboardType="numeric" />
                </View>
              </View>

              <View style={{ marginBottom: 30, marginTop: 20 }}>
                <View style={{ borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#8B5CF6', marginBottom: 16 }}>🎡 MÓDULO QR MESAS</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ color: '#F8FAFC', fontWeight: '600' }}>Ativar QR Mesa</Text>
                    <TouchableOpacity onPress={() => setQrMesaAtivo(!qrMesaAtivo)} style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: qrMesaAtivo ? '#10b981' : '#cbd5e1', justifyContent: 'center', alignItems: qrMesaAtivo ? 'flex-end' : 'flex-start', paddingHorizontal: 2 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' }} />
                    </TouchableOpacity>
                  </View>

                  {qrMesaAtivo && (
                    <>
                      <View style={{ marginBottom: 30 }}>
                        <View style={{ borderRadius: 16, padding: 20, marginBottom: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#8B5CF6', marginBottom: 16 }}>❓ Gerenciar Perguntas NPS da Mesa</Text>
                          <View style={{ backgroundColor: '#1e293b', padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#0284c7' }}>
                            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>💡 Dica: Mantenha pelo menos 3 perguntas ativas. O sistema sorteia uma aleatória a cada jogo!</Text>
                          </View>
                          <View style={{ backgroundColor: '#0f172a', padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
                            <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>➕ Adicionar Nova Pergunta</Text>
                            <TextInput placeholder="Ex: Como foi o atendimento?" placeholderTextColor="#94A3B8" value={novaPergunta} onChangeText={setNovaPergunta} multiline style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 10, color: '#F8FAFC', minHeight: 50, marginBottom: 10, fontSize: 12 }} />
                            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>Tipo:</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                              {['geral', 'atendimento', 'comida', 'ambiente', 'experiencia'].map((tipo) => (
                                <TouchableOpacity key={tipo} onPress={() => setNovaPerguntaTipo(tipo)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: novaPeruntaTipo === tipo ? '#8B5CF6' : '#334155', backgroundColor: novaPeruntaTipo === tipo ? '#8B5CF620' : 'transparent' }}>
                                  <Text style={{ fontSize: 10, color: novaPeruntaTipo === tipo ? '#8B5CF6' : '#94A3B8', fontWeight: '600' }}>{tipo}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <TouchableOpacity onPress={() => adicionarPerguntaNps(lojaId || '')} style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>➕ ADICIONAR</Text>
                            </TouchableOpacity>
                          </View>

                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC', marginBottom: 10 }}>📋 Perguntas Criadas ({perguntasNpsMesa.length})</Text>
                          {perguntasNpsMesa.map((pergunta, idx) => (
                            <View key={pergunta.id} style={{ backgroundColor: pergunta.ativa ? '#1e293b' : '#0f172a', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: pergunta.ativa ? '#334155' : '#1e293b', opacity: pergunta.ativa ? 1 : 0.6 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: pergunta.ativa ? '#F8FAFC' : '#94A3B8', flex: 1 }}>#{idx + 1} {pergunta.pergunta}</Text>
                                <TouchableOpacity onPress={() => togglePerguntaNps(pergunta.id, pergunta.ativa, lojaId || '')} style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: pergunta.ativa ? '#10b981' : '#cbd5e1', justifyContent: 'center', alignItems: pergunta.ativa ? 'flex-end' : 'flex-start', paddingHorizontal: 2 }}>
                                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
                                </TouchableOpacity>
                              </View>
                              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                                <View style={{ backgroundColor: '#8B5CF630', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }}><Text style={{ fontSize: 10, color: '#8B5CF6', fontWeight: '600' }}>{pergunta.tipo}</Text></View>
                                <Text style={{ fontSize: 10, color: '#94A3B8' }}>Ordem: {pergunta.ordem}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity onPress={() => setEditandoPergunta(pergunta.id)} style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#3b82f6', alignItems: 'center' }}><Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>✏️ Editar</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => reordenarPerguntas(pergunta.id, pergunta.ordem - 1, lojaId || '')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#334155', alignItems: 'center' }}><Text style={{ fontSize: 12, color: '#F8FAFC' }}>⬆️</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => reordenarPerguntas(pergunta.id, pergunta.ordem + 1, lojaId || '')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#334155', alignItems: 'center' }}><Text style={{ fontSize: 12, color: '#F8FAFC' }}>⬇️</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => deletarPerguntaNps(pergunta.id, lojaId || '')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#ef4444', alignItems: 'center' }}><Text style={{ fontSize: 12 }}>🗑️</Text></TouchableOpacity>
                              </View>
                              {editandoPergunta === pergunta.id && (
                                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' }}>
                                  <TextInput placeholder="Edite a pergunta..." placeholderTextColor="#94A3B8" defaultValue={pergunta.pergunta} onChangeText={(text) => editarPerguntaNps(pergunta.id, text, lojaId || '')} style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 6, padding: 8, color: '#F8FAFC', marginBottom: 8, fontSize: 11 }} />
                                  <TouchableOpacity onPress={() => setEditandoPergunta(null)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4, backgroundColor: '#10b981', alignItems: 'center' }}><Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>✅ Pronto</Text></TouchableOpacity>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>Link Google Meu Negócio (4-5 Estrelas):</Text>
                      <TextInput placeholder="https://g.page/..." placeholderTextColor="#94A3B8" value={linkGoogleMeuNegocio} onChangeText={setLinkGoogleMeuNegocio} style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#F8FAFC', marginBottom: 16, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }} />
                      <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>Multiplicador Dobro (ex: 2.0 = 2x):</Text>
                      <TextInput placeholder="2.0" placeholderTextColor="#94A3B8" value={bonusMultiplicador.toString()} onChangeText={(text) => setBonusMultiplicador(parseFloat(text) || 1.0)} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#F8FAFC', marginBottom: 20 }} />
                      <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>Tamanho do QR:</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                        {Object.entries(QR_SIZES).map(([key, value]: any) => (
                          <TouchableOpacity key={key} onPress={() => setTamanhoQrMesa(key as any)} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, borderColor: tamanhoQrMesa === key ? '#8B5CF6' : '#334155', backgroundColor: tamanhoQrMesa === key ? '#8B5CF620' : 'transparent', alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: tamanhoQrMesa === key ? '#8B5CF6' : '#94A3B8', fontWeight: '600' }}>{value.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ gap: 10 }}>
                        <TouchableOpacity onPress={() => fazerDownloadQrMesa(lojaId || '', config?.nome_loja || 'loja')} style={{ backgroundColor: '#8B5CF6', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>📥 BAIXAR QR MESA</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => salvarConfigQrMesa(lojaId || '')} style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>💾 SALVAR CONFIGURAÇÕES</Text></TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </View>

              <Text style={[styles.label, { color: '#facc15', marginTop: 20 }]}>🔗 INTEGRAÇÕES E ACESSO:</Text>
              <View style={{ marginBottom: 10, width: '100%' }}>
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>LINK DO GOOGLE MEU NEGÓCIO</Text>
                <TextInput value={config.link_google_meu_negocio} onChangeText={(t) => setConfig({ ...config, link_google_meu_negocio: t })} placeholder="https://g.page/r/..." placeholderTextColor="#475569" style={styles.input} />
              </View>
              <View style={{ marginBottom: 10, width: '100%' }}>
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>NOVA SENHA DO PAINEL</Text>
                <TextInput value={config.senha} onChangeText={(t) => setConfig({ ...config, senha: t })} placeholder="Digite a nova senha..." placeholderTextColor="#475569" secureTextEntry style={styles.input} />
              </View>

              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#10b981', marginTop: 30 }]} onPress={() => { salvarConfig(); setMostrarConfig(false); }}>
                <Text style={styles.buttonText}>{loadingSalvar ? 'SALVANDO...' : '✅ SALVAR ALTERAÇÕES'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {mostrarMesa && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 800, width: '90%', maxHeight: '90%', padding: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' }}>
              <Text style={styles.modalTitle}>📱 MESA - Participações e Prêmios</Text>
              <TouchableOpacity onPress={() => setMostrarMesa(false)} style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#F8FAFC', marginBottom: 16 }}>📊 Dashboard Mesa</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  <View style={{ flex: 1, backgroundColor: '#162032', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 4 }}>Total</Text>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#8B5CF6' }}>{statsMesa.total}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#162032', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 4 }}>5⭐</Text>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#d97706' }}>{statsMesa.notas5}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#162032', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 4 }}>Google ✅</Text>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#10b981' }}>{statsMesa.googleValidadas}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => exportarTelefonesCSV(lojaId || '')} style={{ backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 20 }}><Text style={{ color: '#fff', fontWeight: '700' }}>📥 EXPORTAR TELEFONES (CSV)</Text></TouchableOpacity>

                <Text style={{ fontSize: 16, fontWeight: '900', color: '#F8FAFC', marginBottom: 12 }}>📱 Participações Capturadas</Text>
                {participacoesMesa.map((p) => (
                  <View key={p.id} style={{ backgroundColor: '#162032', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#334155' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#F8FAFC' }}>{formatarTelefone(p.cliente_cpf)}</Text>
                      <Text style={{ fontSize: 12, color: p.premio_resgatado ? '#10b981' : '#f59e0b', fontWeight: '600' }}>{p.premio_resgatado ? '✅ Resgatado' : '⏳ Pendente'}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>🎁 {p.premio_nome}</Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>⭐ Nota: {p.nota_nps}/5 • {new Date(p.created_at).toLocaleDateString('pt-BR')}</Text>
                  </View>
                ))}

                <Text style={{ fontSize: 16, fontWeight: '900', color: '#F8FAFC', marginTop: 20, marginBottom: 12 }}>🎁 Gerenciar Prêmios da Mesa</Text>
                <View style={{ backgroundColor: '#162032', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>Nome do Prêmio:</Text>
                  <TextInput placeholder="Ex: +30% Desconto" placeholderTextColor="#94A3B8" value={novoPremiomesa.nome} onChangeText={(text) => setNovoPremiomesa({ ...novoPremiomesa, nome: text })} style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 10, color: '#F8FAFC', marginBottom: 10 }} />
                  <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>Tipo:</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {['desconto', 'brinde', 'pontos'].map((tipo) => (
                      <TouchableOpacity key={tipo} onPress={() => setNovoPremiomesa({ ...novoPremiomesa, tipo })} style={{ flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: novoPremiomesa.tipo === tipo ? '#8B5CF6' : '#334155', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: novoPremiomesa.tipo === tipo ? '#8B5CF6' : '#94A3B8', fontWeight: '600' }}>{tipo === 'desconto' ? '💰' : tipo === 'brinde' ? '🎁' : '✨'} {tipo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 4 }}>Valor/Qtde:</Text>
                      <TextInput placeholder="30" placeholderTextColor="#94A3B8" value={novoPremiomesa.valor === 0 ? '' : novoPremiomesa.valor.toString()} onChangeText={(text) => setNovoPremiomesa({ ...novoPremiomesa, valor: parseFloat(text.replace(',', '.')) || 0 })} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 6, padding: 12, color: '#F8FAFC', fontSize: 16 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 4 }}>Probabilidade (%):</Text>
                      <TextInput placeholder="10" placeholderTextColor="#94A3B8" value={novoPremiomesa.probabilidade === 0 ? '' : novoPremiomesa.probabilidade.toString()} onChangeText={(text) => setNovoPremiomesa({ ...novoPremiomesa, probabilidade: parseFloat(text.replace(',', '.')) || 0 })} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 6, padding: 12, color: '#F8FAFC', fontSize: 16 }} />
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => adicionarPremiomesa(lojaId || '')} style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 12 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>➕ ADICIONAR PRÊMIO</Text></TouchableOpacity>
                </View>

                <Text style={{ fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 10 }}>Prêmios Criados:</Text>
                {premiosMesa.map((premio) => (
                  <View key={premio.id} style={{ backgroundColor: '#162032', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}>
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC' }}>{premio.nome}</Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8' }}>{premio.tipo === 'desconto' ? '💰' : premio.tipo === 'brinde' ? '🎁' : '✨'} {premio.valor} • Prob: {premio.probabilidade}%</Text>
                    </View>
                    <TouchableOpacity onPress={() => deletarPremiomesa(premio.id, lojaId || '')}><Text style={{ fontSize: 18 }}>🗑️</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {mostrarRemarketing && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '90%', maxWidth: 800, padding: 20, maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#8B5CF6' }}>📞 REMARKETING WHATSAPP</Text>
              <TouchableOpacity onPress={() => setMostrarRemarketing(false)} style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>
              <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 }}>📊 Estatísticas</Text>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 100, backgroundColor: '#0f172a', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Total</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#8B5CF6' }}>{statsRemarketig.total}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 100, backgroundColor: '#0f172a', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>🔴 Não Contatados</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#f59e0b' }}>{statsRemarketig.naoContatados}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 100, backgroundColor: '#0f172a', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>✅ Contatados</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#10b981' }}>{statsRemarketig.contatados}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 100, backgroundColor: '#0f172a', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>⭐ 5 Estrelas</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#d97706' }}>{statsRemarketig.notas5}</Text>
                  </View>
                </View>
              </View>

              <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 }}>📱 Envio em Massa e Templates</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>Template:</Text>
                <View style={{ marginBottom: 12 }}>
                  {templatesWA.map((t) => (
                    <TouchableOpacity key={t.id} onPress={() => { setTemplateSelecionado(t.id); setMensagemCustomizada(t.mensagem); }} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: templateSelecionado === t.id ? '#8B5CF6' : '#334155', backgroundColor: templateSelecionado === t.id ? '#8B5CF620' : 'transparent' }}>
                      <Text style={{ fontSize: 11, color: templateSelecionado === t.id ? '#8B5CF6' : '#F8FAFC', fontWeight: '600' }}>{t.emoji} {t.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {templateSelecionado && (
                  <View style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }}>
                    <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>Preview:</Text>
                    <Text style={{ fontSize: 10, color: '#F8FAFC', lineHeight: 16 }}>{mensagemCustomizada}</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <TouchableOpacity onPress={toggleSelecionarTodos} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: selecionarTodos ? '#3b82f6' : '#334155', alignItems: 'center' }}><Text style={{ fontSize: 11, color: selecionarTodos ? '#fff' : '#F8FAFC', fontWeight: '700' }}>{selecionarTodos ? '✅ Todos Selecionados' : '☐ Selecionar Todos'}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => { if (selecionados.length > 0 && templateSelecionado) enviarParaSelecionados(lojaId || ''); else alert('Selecione contatos e um template'); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#8B5CF6', alignItems: 'center' }}><Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📱 Enviar ({selecionados.length})</Text></TouchableOpacity>
                </View>
              </View>

              <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 }}>🔍 Filtros</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>Telefone:</Text>
                <TextInput placeholder="Digite telefone..." placeholderTextColor="#94A3B8" value={buscarTelefone} onChangeText={setBuscarTelefone} style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 10, color: '#F8FAFC', marginBottom: 12, fontSize: 12 }} keyboardType="phone-pad" />
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>Status:</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {['', 'nao_contatado', 'contatado', 'respondeu', 'converteu'].map((status) => (
                    <TouchableOpacity key={status} onPress={() => setFiltroStatus(status)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: filtroStatus === status ? '#8B5CF6' : '#334155', borderWidth: 1, borderColor: filtroStatus === status ? '#8B5CF6' : '#334155' }}><Text style={{ fontSize: 10, color: filtroStatus === status ? '#fff' : '#F8FAFC', fontWeight: '600' }}>{status === '' ? 'Todos' : status === 'nao_contatado' ? '🔴 Não Contatado' : status === 'contatado' ? '✅ Contatado' : status === 'respondeu' ? '💬 Respondeu' : '🎉 Converteu'}</Text></TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>Nota NPS:</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3, 4, 5].map((nota) => (
                    <TouchableOpacity key={nota} onPress={() => setFiltroNps(nota)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: filtroNps === nota ? '#8B5CF6' : '#334155' }}><Text style={{ fontSize: 10, color: filtroNps === nota ? '#fff' : '#F8FAFC', fontWeight: '600' }}>{nota === 0 ? 'Todos' : `${nota}⭐`}</Text></TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>Data:</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {['', 'ultimos-7d', 'ultimos-30d'].map((data) => (
                    <TouchableOpacity key={data} onPress={() => setFiltroData(data)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: filtroData === data ? '#8B5CF6' : '#334155' }}><Text style={{ fontSize: 10, color: filtroData === data ? '#fff' : '#F8FAFC', fontWeight: '600' }}>{data === '' ? 'Todos' : data === 'ultimos-7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}</Text></TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity onPress={() => exportarTelefonesCSV(lojaId)} style={{ backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 20 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>📥 EXPORTAR CONTATOS (CSV)</Text></TouchableOpacity>

              <Text style={{ fontSize: 14, fontWeight: '900', color: '#F8FAFC', marginBottom: 12 }}>👥 Contatos ({contatosFiltrados.length})</Text>
              {contatosFiltrados.length === 0 ? (
                <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}><Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '600' }}>Nenhum contato encontrado</Text></View>
              ) : (
                contatosFiltrados.map((contato) => (
                  <View key={contato.id} style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: selecionados.includes(contato.id) ? '#8B5CF6' : '#334155', borderLeftWidth: 3, borderLeftColor: contato.status === 'nao_contatado' ? '#f59e0b' : contato.status === 'contatado' ? '#10b981' : contato.status === 'respondeu' ? '#3b82f6' : '#8b5cf6' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <TouchableOpacity onPress={() => toggleSelecionado(contato.id)} style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: selecionados.includes(contato.id) ? '#8B5CF6' : '#334155', backgroundColor: selecionados.includes(contato.id) ? '#8B5CF6' : 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>{selecionados.includes(contato.id) && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}</TouchableOpacity>
                      <View style={{ flex: 1 }}><Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC' }}>{formatarTelefone(contato.cliente_cpf)}</Text><Text style={{ fontSize: 10, color: '#94A3B8' }}>{contato.premio_ganho || 'Sem prêmio'}</Text></View>
                      <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#d97706' }}>{contato.nota_nps}⭐</Text><Text style={{ fontSize: 9, color: '#94A3B8' }}>{contato.status === 'nao_contatado' ? '🔴' : contato.status === 'contatado' ? '✅' : contato.status === 'respondeu' ? '💬' : '🎉'}</Text></View>
                    </View>
                    <View style={{ marginBottom: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' }}>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>📅 {new Date(contato.data_participacao).toLocaleDateString('pt-BR')}</Text>
                      {contato.tags && contato.tags.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{contato.tags.map((tag: string, idx: number) => (
                          <View key={idx} style={{ backgroundColor: '#8B5CF620', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }}><Text style={{ fontSize: 9, color: '#8B5CF6', fontWeight: '600' }}>{tag}</Text></View>
                        ))}</View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => { const template = templatesWA[0]; template && enviarWhatsApp(contato, template, lojaId || ''); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#8B5CF6', alignItems: 'center' }}><Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>📱 WhatsApp</Text></TouchableOpacity>
                      {contato.status === 'contatado' && (<TouchableOpacity onPress={() => marcarComoRespondeu(contato.id, lojaId || '')} style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#3b82f6', alignItems: 'center' }}><Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>💬 Respondeu</Text></TouchableOpacity>)}
                      {contato.status === 'respondeu' && (<TouchableOpacity onPress={() => marcarComoConverteu(contato.id, lojaId || '')} style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#10b981', alignItems: 'center' }}><Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>🎉 Converteu</Text></TouchableOpacity>)}
                      <TouchableOpacity onPress={() => deletarContato(contato.id, lojaId || '')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#ef4444', alignItems: 'center' }}><Text style={{ fontSize: 11 }}>🗑️</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {modalCRM && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enviar Mensagem</Text>
            <Text style={styles.modalSub}>Deseja enviar {modalCRM.pontos} Springs de presente para atrair o cliente {formatarTelefone(modalCRM.cpf)} de volta?</Text>
            <View style={{ gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#facc15' }]} onPress={() => confirmarCRM(true)}><Text style={[styles.buttonText, { color: '#0f172a' }]}>🎁 SIM, ENVIAR BÔNUS</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#334155', height: 50 }]} onPress={() => { setMostrarManual(!mostrarManual); if (!mostrarManual) setTimeout(() => mainScrollRef.current?.scrollTo({ y: 800, animated: true }), 100); }}><Text style={styles.buttonText}>⌨️ LANÇAMENTO MANUAL</Text></TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', marginTop: 15 }} onPress={() => setModalCRM(null)}><Text style={{ color: '#ef4444', fontWeight: 'bold' }}>CANCELAR</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {mostrarAvaliacoesModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 800, width: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <Text style={[styles.title, { marginBottom: 0, color: '#facc15' }]}>⭐ Lista de Avaliações</Text>
               <TouchableOpacity onPress={() => setMostrarAvaliacoesModal(false)} style={{ padding: 5 }}><Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold' }}>✕</Text></TouchableOpacity>
            </View>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 15 }}>Ordenadas das piores para as melhores.</Text>
            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={true}>
               {avaliacoes.length === 0 ? (<Text style={{ color: '#64748b', textAlign: 'center', marginTop: 20 }}>Nenhuma avaliação encontrada.</Text>) : (
                 avaliacoes.map((av, idx) => {
                   let cor = '#10b981'; let icone = '😍';
                   if (av.nota <= 2) { cor = '#ef4444'; icone = '😡'; } else if (av.nota === 3) { cor = '#facc15'; icone = '😐'; }
                   let labelResposta = av.respostaStr || av.nota.toString();
                   if (!isNaN(Number(labelResposta))) labelResposta = `${labelResposta} Estrelas`; else labelResposta = labelResposta.toUpperCase();
                   return (
                     <View key={idx} style={{ backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#334155' }}>
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                         <View style={{ flex: 1 }}><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Pergunta:</Text><Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{av.perguntaTexto}</Text></View>
                         <View style={{ alignItems: 'flex-end' }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{formatarTelefone(av.cliente)}</Text><Text style={{ color: '#94a3b8', fontSize: 10 }}>{new Date(av.data).toLocaleDateString('pt-BR')} {new Date(av.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text></View>
                       </View>
                       <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 8, opacity: 0.5 }} />
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ fontSize: 24 }}>{icone}</Text><View><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Resposta do Cliente:</Text><Text style={{ color: cor, fontWeight: '900', fontSize: 16 }}>{labelResposta}</Text></View></View>
                       {av.comentario && (<View style={{ marginTop: 10, backgroundColor: '#0f172a', padding: 10, borderRadius: 8 }}><Text style={{ color: '#cbd5e1', fontSize: 13, fontStyle: 'italic' }}>"{av.comentario}"</Text></View>)}
                     </View>
                   );
                 })
               )}
            </ScrollView>
          </View>
        </View>
      )}

      <ScrollView ref={mainScrollRef} style={styles.container}>
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim as any }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444' }]}>
          <Text style={{ fontSize: 24, marginRight: 12 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text><Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>

        <View style={styles.wrapper}>
          <View style={[styles.header, { alignItems: 'center' }]}>
            <Text style={[styles.logo, { textAlign: 'left', marginBottom: 0, fontSize: 24 }]}>PALM SPRINGS</Text>
            <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>{config.nome_loja?.toUpperCase() || 'LOJA PARCEIRA'}</Text></View>
            <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
               <TouchableOpacity onPress={() => { buscarFila(); buscarStats(); buscarAvaliacoesERoleta(); mostrarToast('Dados Sincronizados!', 'sucesso'); }} style={{ backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155' }}><Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}>🔄 SINCRONIZAR</Text></TouchableOpacity>
               <TouchableOpacity onPress={() => { setMostrarMesa(true); setMostrarConfig(false); setMostrarRemarketing(false); }}><Text style={[styles.headerButton, { color: mostrarMesa ? '#8B5CF6' : '#94A3B8' }]}>📱 Mesa</Text></TouchableOpacity>
               <TouchableOpacity onPress={() => setMostrarValidarToken(true)} style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>🌐 IMPORTAR REDE</Text></TouchableOpacity>
               <TouchableOpacity onPress={() => { setMostrarRemarketing(true); setMostrarMesa(false); setMostrarConfig(false); }}><Text style={[styles.headerButton, { color: mostrarRemarketing ? '#8B5CF6' : '#94A3B8' }]}>📞 Remarketing</Text></TouchableOpacity>

               <TouchableOpacity onPress={() => { setMostrarConfig(!mostrarConfig); setMostrarMesa(false); setMostrarRemarketing(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={styles.headerButton}>⚙️ Config</Text><Text style={{ color: '#64748b', fontSize: 9, fontWeight: 'bold', backgroundColor: '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>{APP_VERSION}</Text></TouchableOpacity>
               <TouchableOpacity onPress={() => { localStorage.clear(); router.replace('/login'); }}><Text style={styles.closeText}>✕ SAIR</Text></TouchableOpacity>
            </View>
          </View>

           <View style={{ gap: 15, marginBottom: 25 }}>
             <View style={{ flexDirection: 'row', gap: 15, alignItems: 'stretch', flexWrap: 'wrap' }}>
                <View style={{ flex: 2, minWidth: 320, gap: 15 }}>
                  <View style={[styles.card, { flex: 1, backgroundColor: '#020617', padding: 20, minHeight: 130, justifyContent: 'center', borderColor: '#10b981', borderWidth: 2 }]}>
                     {clienteAtual ? (
                       <>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View>
                               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                 <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>ATENDENDO AGORA:</Text>
                                 {clienteAtual.temToken && (
                                   <View style={{ backgroundColor: '#8B5CF620', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#8B5CF640', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                     <Text style={{ fontSize: 10 }}>🔄</Text>
                                     <Text style={{ color: '#8B5CF6', fontSize: 9, fontWeight: '900' }}>EXCHANGE: +{clienteAtual.tokenPontos} SPG</Text>
                                   </View>
                                 )}
                               </View>
                               <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: -1.5, marginTop: -5 }}>{formatarTelefone(clienteAtual.cliente_cpf)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                              {clienteAtual.temToken && (
                                <TouchableOpacity 
                                  onPress={() => setMostrarValidarToken(true)}
                                  style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: '#A78BFA' }}
                                >
                                  <View>
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', opacity: 0.8 }}>AÇÃO REQUERIDA:</Text>
                                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>VALIDAR TOKEN 🔑</Text>
                                  </View>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity onPress={() => removerDaFila(clienteAtual.id)} style={{ backgroundColor: '#ef444420', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ef444440' }}>
                                <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '900' }}>REMOVER</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          
                          {clienteAtual.temToken && (
                            <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: 'bold', marginBottom: 10, backgroundColor: '#8B5CF610', padding: 6, borderRadius: 6, alignSelf: 'flex-start' }}>
                              💡 Dica: Valide os pontos de outras lojas antes de finalizar a venda.
                            </Text>
                          )}

                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1, backgroundColor: '#10b98115', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#10b98130', flexDirection: 'row', alignItems: 'center' }}>
                              <View style={{ backgroundColor: '#10b98120', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                                <Text style={{ fontSize: 16 }}>✨</Text>
                              </View>
                              <View>
                                <Text style={{ color: '#10b981', fontSize: 18, fontWeight: '900' }}>{Math.floor(cashbacks[clienteAtual.cliente_cpf]?.pontos || 0)}</Text>
                                <Text style={{ color: '#10b98180', fontSize: 9, fontWeight: 'bold', marginTop: -2 }}>SALDO NESTA LOJA (SPG)</Text>
                              </View>
                            </View>

                            <View style={{ flex: 1, backgroundColor: '#facc1515', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#facc1530', flexDirection: 'row', alignItems: 'center' }}>
                              <View style={{ backgroundColor: '#facc1520', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                                <Text style={{ fontSize: 16 }}>💰</Text>
                              </View>
                              <View>
                                <Text style={{ color: '#facc15', fontSize: 18, fontWeight: '900' }}>R$ {(cashbacks[clienteAtual.cliente_cpf]?.total || 0).toFixed(2)}</Text>
                                <Text style={{ color: '#facc1580', fontSize: 9, fontWeight: 'bold', marginTop: -2 }}>CASHBACK DISPONÍVEL</Text>
                              </View>
                            </View>
                          </View>
                       </>
                     ) : (<Text style={{ color: '#64748b', fontSize: 24, textAlign: 'center', fontWeight: 'bold' }}>AGUARDANDO FILA...</Text>)}
                  </View>
                  <View style={[styles.card, { flex: 1, padding: 20, backgroundColor: '#0f172a', minHeight: 150, borderColor: '#334155', borderWidth: 1 }]}>
                    <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>👥 PRÓXIMOS DA FILA</Text>
                    <ScrollView nestedScrollEnabled={true}>
                      {fila.filter(c => c.id !== (clienteAtual?.id)).length === 0 ? (<Text style={{ color: '#334155', fontSize: 12, fontStyle: 'italic', marginTop: 10 }}>Ninguém aguardando...</Text>) : (
                         fila.filter(c => c.id !== (clienteAtual?.id)).map((c, i) => (
                            <View key={c.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                 <Text style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 'bold' }}>{i + 2}º • {formatarTelefone(c.cliente_cpf)}</Text>
                                 {c.temToken && (
                                   <View style={{ backgroundColor: '#8B5CF620', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#8B5CF640', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                     <Text style={{ fontSize: 9 }}>🔄</Text>
                                     <Text style={{ color: '#8B5CF6', fontSize: 8, fontWeight: '900' }}>+{c.tokenPontos}</Text>
                                   </View>
                                 )}
                               </View>
                               <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><TouchableOpacity onPress={() => removerDaFila(c.id)} style={{ paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>✕</Text></TouchableOpacity><TouchableOpacity onPress={() => setClienteFocadoId(c.id)} style={{ backgroundColor: '#38bdf820', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}><Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}>PUXAR ⬆️</Text></TouchableOpacity></View>
                            </View>
                          ))
                       )}
                    </ScrollView>
                  </View>
                </View>

                <View style={{ flex: 2, minWidth: 320, gap: 15 }}>
                  <View style={[styles.card, { backgroundColor: '#020617', padding: 15, minHeight: 130, justifyContent: 'center', borderColor: '#10b981', borderWidth: 1 }]}>
                     <Text style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold', position: 'absolute', top: 15, left: 15, zIndex: 10 }}>VALOR DA VENDA (R$):</Text>
                     <TextInput placeholder="R$ 0,00" placeholderTextColor="#1e293b" keyboardType="numeric" value={clienteAtual ? (valorVenda[clienteAtual.id] ? (parseInt(valorVenda[clienteAtual.id], 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '') : ''} onChangeText={(t) => { if (clienteAtual) setValorVenda({ ...valorVenda, [clienteAtual.id]: t.replace(/\D/g, '') }); }} onSubmitEditing={() => { if (clienteAtual) atender(clienteAtual.id); }} style={{ color: '#10b981', fontSize: 64, fontWeight: '900', textAlign: 'right', width: '100%', height: '100%', outlineStyle: 'none', borderWidth: 0, marginTop: 10 } as any} />
                  </View>
                  <View style={[styles.card, { flex: 1, padding: 25, backgroundColor: '#1e293b', minHeight: 150, justifyContent: 'space-between' }]}>
                    <View><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: '#10b981', fontSize: 32, fontWeight: '900' }}>{formatarMoeda(stats.totalMes)}</Text><View style={{ alignItems: 'flex-end' }}><Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{new Date().toLocaleDateString('pt-BR')}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>TOTAL DO MÊS</Text></View></View></View>
                    <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 15 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15 }}>
                        <View style={{ flex: 1, minWidth: 80 }}><Text style={{ color: '#38bdf8', fontSize: 24, fontWeight: '900' }}>{stats.vendasCount}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>VENDAS HOJE</Text></View>
                        <View style={{ flex: 1.5, alignItems: 'center' }}><Text style={{ color: '#10b981', fontSize: 24, fontWeight: '900' }}>{formatarMoeda(stats.totalDia)}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>TOTAL DO DIA</Text></View>
                        <View style={{ flex: 1.5, alignItems: 'flex-end' }}><Text style={{ color: '#38bdf8', fontSize: 24, fontWeight: '900' }}>{formatarMoeda(stats.ticketMedio)}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>TICKET MÉDIO</Text></View>
                    </View>
                  </View>
                </View>

                <View style={{ flex: 1.5, minWidth: 250, gap: 15 }}>
                  <TouchableOpacity onPress={() => clienteAtual && atender(clienteAtual.id)} style={[styles.card, { backgroundColor: clienteAtual ? '#10b981' : '#334155', minHeight: 130, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#0f172a', fontWeight: 'bold', fontSize: 20 }}>ATENDER</Text></TouchableOpacity>
                   <View style={[styles.card, { flex: 1, padding: 25, backgroundColor: '#1e293b', minHeight: 150, justifyContent: 'space-between' }]}>
                      {clienteAtual && valorVenda[clienteAtual.id] ? (
                        <View style={{ height: '100%', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#facc15', fontSize: 12, fontWeight: 'bold', marginBottom: 15 }}>💡 RESUMO DA COMPRA:</Text>
                            <View style={{ gap: 12 }}>
                               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: '#94a3b8', fontSize: 14 }}>Venda:</Text><Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{formatarMoeda(parseInt(valorVenda[clienteAtual.id], 10) / 100)}</Text></View>
                               {(() => {
                                  const cpf = clienteAtual.cliente_cpf; const valorReal = parseInt(valorVenda[clienteAtual.id], 10) / 100;
                                  const saldoAtual = Math.floor(cashbacks[cpf]?.pontos || 0);
                                  const cb_total = cashbacks[cpf]?.total || 0; const cb_proximo = cashbacks[cpf]?.proximo || 0;
                                  const usarCb = config.usar_cashback_total ? cb_total : cb_proximo;
                                  const limiteCb = valorReal * (Number(config.cashback_limite_uso_percent) / 100);
                                  const cashbackUsado = Math.min(Math.min(valorReal, limiteCb), usarCb);
                                  const aPagar = valorReal - cashbackUsado;
                                  const base = config.pontos_sobre_valor_bruto ? valorReal : aPagar;
                                  const pts = Math.floor(base / (Number(config.reais_por_ponto) || 1));
                                  const saldoFinal = saldoAtual + pts;
                                  return (
                                    <>
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: '#facc15', fontSize: 14 }}>Cashback:</Text><Text style={{ color: '#facc15', fontSize: 18, fontWeight: 'bold' }}>- {formatarMoeda(cashbackUsado)}</Text></View>
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#38bdf815', padding: 10, borderRadius: 10 }}>
                                        <View>
                                          <Text style={{ color: '#38bdf8', fontSize: 12 }}>Ganha agora:</Text>
                                          <Text style={{ color: '#38bdf8', fontSize: 16, fontWeight: '900' }}>+ {pts} SPG</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                          <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 'bold' }}>SALDO FINAL:</Text>
                                          <Text style={{ color: '#10b981', fontSize: 18, fontWeight: '900' }}>{saldoFinal} SPG</Text>
                                        </View>
                                      </View>
                                      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: 10 }}><Text style={{ color: '#10b981', fontSize: 42, fontWeight: '900' }}>{formatarMoeda(aPagar)}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>A PAGAR</Text></View>
                                    </>
                                  );
                               })()}
                            </View>
                          </View>
                        </View>
                      ) : (<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#64748b', fontSize: 16, textAlign: 'center' }}>Digite o valor da venda...</Text></View>)}
                   </View>
                </View>
             </View>

             {clienteAtual && [clienteAtual].map((c) => {
                const temBonus = bonusPendentes[c.cliente_cpf]; const brindes = brindesPendentes[c.cliente_cpf] || [];
                if (temBonus > 0 || brindes.length > 0 || premiosMesaPendentes[c.cliente_cpf]?.length > 0) {
                  return (
                    <View key={c.id} style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                      {temBonus > 0 && (<View style={{ flex: 1, minWidth: 250, flexDirection: 'row', alignItems: 'center', backgroundColor: '#facc1515', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#facc1530' }}><Switch value={usarBonus[c.id] !== false} onValueChange={(v) => setUsarBonus((prev: any) => ({ ...prev, [c.id]: v }))} /><Text style={{ color: '#facc15', marginLeft: 12, fontWeight: 'bold', fontSize: 16 }}>🎁 BÔNUS: +{temBonus} SPG</Text></View>)}
                      {brindes.map((b: any) => (<View key={b.id} style={{ flex: 1, minWidth: 250, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ec489915', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#ec489930' }}><Text style={{ color: '#ec4899', fontWeight: 'bold', fontSize: 15 }}>🏆 Brinde: {b.nome_brinde}</Text><TouchableOpacity onPress={() => entregarBrinde(b.id, c.cliente_cpf)} style={{ backgroundColor: '#ec4899', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>ENTREGAR</Text></TouchableOpacity></View>))}
                      {(premiosMesaPendentes[c.cliente_cpf] || []).map((p: any) => (<View key={p.id} style={{ flex: 1, minWidth: 250, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#8b5cf615', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#8b5cf630' }}><Text style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: 15 }}>🎡 MESA: {p.premio_nome}</Text><TouchableOpacity onPress={() => resgatarPremioMesa(p.id, c.cliente_cpf)} style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>RESGATAR</Text></TouchableOpacity></View>))}
                      
                      {/* CATÁLOGO DE PONTOS */}
                      {rewards.map((r: any) => {
                        const saldoTotal = (cashbacks[c.cliente_cpf]?.pontos || 0) + (caixaAtiva?.cliente_cpf === c.cliente_cpf ? (caixaAtiva?.pontos_disponiveis || 0) : 0);
                        return (
                          <View key={r.id} style={{ flex: 1, minWidth: 250, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#10b98110', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#10b98130' }}>
                            <View>
                              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{r.nome}</Text>
                              <Text style={{ color: '#10b981', fontSize: 12 }}>{r.custo_pontos} SPG</Text>
                            </View>
                            <TouchableOpacity 
                              disabled={saldoTotal < r.custo_pontos}
                              onPress={() => resgatarBrinde(r, c.cliente_cpf)} 
                              style={{ backgroundColor: saldoTotal >= r.custo_pontos ? '#10b981' : '#334155', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 }}
                            >
                              <Text style={{ color: saldoTotal >= r.custo_pontos ? '#0f172a' : '#94a3b8', fontWeight: 'bold', fontSize: 12 }}>RESGATAR</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>

                  );
                }
                return null;
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 25, flexWrap: 'wrap' }}>
             <TouchableOpacity onPress={baixarQRCode} style={[styles.card, { flex: 1, minWidth: 250, height: 260, alignItems: 'center', justifyContent: 'center' }]}><QRCode value={linkQR} size={250} getRef={(c) => (qrRef.current = c)} /><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginTop: 15 }}>📥 QR DO BALCÃO (DOWNLOAD)</Text></TouchableOpacity>
             <View style={{ position: 'absolute', opacity: 0, left: -9999 }}><QRCode value={linkQR} size={1181} getRef={(c) => (qrDownloadRef.current = c)} /></View>
             <View style={[styles.card, { flex: 1, minWidth: 250, height: 260 }]}><Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>{stats.totalClientesDia || 0}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 6 }}>CLIENTES HOJE</Text><ScrollView nestedScrollEnabled={true}>{(stats as any).vendasDiaFormatada?.map((v: any, i: number) => (<View key={i} style={{ borderBottomWidth: 1, borderBottomColor: '#334155', paddingVertical: 8 }}><Text style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>{formatarTelefone(v.cpf)} • {formatarMoeda(Number(v.valor))}</Text></View>))}</ScrollView></View>
             <View style={[styles.card, { flex: 1, minWidth: 250, height: 260 }]}><Text style={{ color: '#38bdf8', fontSize: 24, fontWeight: '900' }}>{stats.resgatesMesLista?.length || 0}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 6 }}>SAÍDAS (MÊS)</Text><ScrollView nestedScrollEnabled={true}>{(stats as any).resgatesSumarizados?.map((s: any, i: number) => (<View key={i} style={{ borderBottomWidth: 1, borderBottomColor: '#334155', paddingVertical: 8 }}><Text style={{ color: '#fff', fontSize: 12 }}><Text style={{ fontWeight: 'bold', color: '#38bdf8' }}>{s.qtde}x</Text> {s.nome}</Text></View>))}</ScrollView></View>
             <View style={[styles.card, { flex: 1, minWidth: 250, height: 260 }]}><Text style={{ color: '#ec4899', fontSize: 24, fontWeight: '900' }}>{stats.resgatesHojeLista?.length || 0}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 6 }}>RESGATES (HOJE)</Text><ScrollView nestedScrollEnabled={true}>{(stats as any).resgatesListados?.map((r: any, i: number) => (<View key={i} style={{ borderBottomWidth: 1, borderBottomColor: '#334155', paddingVertical: 8 }}><Text style={{ color: '#fff', fontSize: 12 }}>1x {r.nome} • {formatarTelefone(r.telefone)}</Text></View>))}</ScrollView></View>
          </View>

          <View style={{ flexDirection: 'row', gap: 15, marginBottom: 25, flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={() => setMostrarAvaliacoesModal(true)} style={[styles.card, { flex: 2, minWidth: 300, borderColor: '#facc15' }]}>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={[styles.title, { color: '#facc15' }]}>⭐ NPS & Avaliações ({isNaN(mediaEstrelas) ? '0.0' : mediaEstrelas.toFixed(1)})</Text><Text style={{ color: '#facc15', fontSize: 10, fontWeight: 'bold' }}>VER LISTA ➔</Text></View>
                 <View style={{ flexDirection: 'row', gap: 4, marginBottom: 15 }}>{[1,2,3,4,5].map(star => (<View key={star} style={{ flex: 1, height: 6, backgroundColor: (!isNaN(mediaEstrelas) && mediaEstrelas >= star) ? '#facc15' : '#334155', borderRadius: 3 }} />))}</View>
                 {npsChart.dias.length > 0 && (
                   <View style={{ height: 150, width: '100%' }}>
                      <View style={{ flex: 1 }}><Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                           {(() => {
                             const max = npsChart.max || 1;
                             const ptsVerde = npsChart.dias.map((d: any, i: number) => `${(i / (npsChart.dias.length - 1)) * 100},${100 - ((d.verde / max) * 100)}`).join(' ');
                             const ptsAmarelo = npsChart.dias.map((d: any, i: number) => `${(i / (npsChart.dias.length - 1)) * 100},${100 - ((d.amarelo / max) * 100)}`).join(' ');
                             const ptsVermelho = npsChart.dias.map((d: any, i: number) => `${(i / (npsChart.dias.length - 1)) * 100},${100 - ((d.vermelho / max) * 100)}`).join(' ');
                             return (<><Polyline points={ptsVermelho} fill="none" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" /><Polyline points={ptsAmarelo} fill="none" stroke="#facc15" strokeWidth="2" vectorEffect="non-scaling-stroke" /><Polyline points={ptsVerde} fill="none" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" /></>);
                           })()}
                      </Svg></View>
                   </View>
                 )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMostrarCRM(!mostrarCRM)} style={[styles.card, { flex: 1, minWidth: 200, borderColor: '#8b5cf6' }]}><Text style={{ color: '#8b5cf6', fontSize: 32, fontWeight: '900' }}>{clientesAtrasados}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>REMARKETING</Text><Text style={{ color: '#fff', fontSize: 11, marginTop: 10 }}>Clientes ausentes que precisam de atenção.</Text></TouchableOpacity>
              <View style={[styles.card, { flex: 1, minWidth: 200, borderColor: '#10b981' }]}><Text style={{ color: '#10b981', fontSize: 32, fontWeight: '900' }}>{stats.roi ? stats.roi.toFixed(1) : '0.0'}x</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>ROI ESTIMADO</Text><Text style={{ color: '#fff', fontSize: 11, marginTop: 10 }}>Retorno sobre cada R$ 1,00 investido em pontos.</Text></View>
              <View style={[styles.card, { flex: 1, minWidth: 200, borderColor: '#334155', backgroundColor: '#020617' }]}><Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' }}>⚡ {operadorLogado}</Text><Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}>OPERADOR ATIVO</Text><TouchableOpacity onPress={() => { localStorage.clear(); router.replace('/login'); }} style={{ marginTop: 15, backgroundColor: '#ef444420', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ef4444' }}><Text style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center', fontSize: 10 }}>SAIR</Text></TouchableOpacity></View>
          </View>

          <View style={{ flexDirection: 'row', gap: 15, marginBottom: 40, flexWrap: 'wrap' }}>
             <TouchableOpacity onPress={() => setMostrarManual(!mostrarManual)} style={[styles.card, { flex: 1, minWidth: 250, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', height: 80 }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>⌨️ LANÇAMENTO MANUAL</Text></TouchableOpacity>
             <TouchableOpacity onPress={() => setMostrarCatalogo(!mostrarCatalogo)} style={[styles.card, { flex: 1, minWidth: 250, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', height: 80 }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>🎁 GERENCIAR CATÁLOGO</Text></TouchableOpacity>
             <TouchableOpacity onPress={() => setMostrarRoleta(!mostrarRoleta)} style={[styles.card, { flex: 1, minWidth: 250, backgroundColor: '#db2777', alignItems: 'center', justifyContent: 'center', height: 80 }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>🎡 CONFIGURAR ROLETA</Text></TouchableOpacity>
          </View>

          {mostrarManual && (
            <View style={styles.card} ref={manualInputRef}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.title}>✍️ Lançamento Manual</Text>
                <TouchableOpacity onPress={() => setMostrarValidarToken(true)} style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>🔑 VALIDAR IMPORTAÇÃO</Text></TouchableOpacity>
              </View>

              <TextInput placeholder="WhatsApp do Cliente" placeholderTextColor="#94A3B8" keyboardType="numeric" value={formatarTelefone(telefoneManual)} onChangeText={(t) => { setTelefoneManual(t); const clean = t.replace(/\D/g, ''); if (clean.length >= 10) buscarFinanceiroDetalhado(clean, 'manual'); }} style={styles.input} />
              <TextInput placeholder="Valor: R$ 0,00" placeholderTextColor="#94A3B8" keyboardType="numeric" value={valorManual ? (parseInt(valorManual, 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''} onChangeText={(t) => setValorManual(t.replace(/\D/g, ''))} style={styles.inputValor} onSubmitEditing={atenderManual} />
              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#10b981' }]} onPress={atenderManual}><Text style={styles.buttonText}>LANÇAR VENDA MANUAL</Text></TouchableOpacity>
            </View>
          )}

          {mostrarCRM && (
            <View style={styles.card}>
              <Text style={styles.title}>📲 Clientes para Contato</Text>
              {historicoCRM.map(venda => (
                <View key={venda.id} style={styles.crmItem}>
                  <View style={{ flex: 1 }}><Text style={styles.crmTelefone}>{formatarTelefone(venda.cliente_cpf)}</Text><Text style={styles.crmDetalhe}>Última Compra: {formatarMoeda(Number(venda.valor))} em {parseDataSupabase(venda.created_at).toLocaleDateString('pt-BR')}</Text></View>
                  <TouchableOpacity onPress={() => iniciarCRM(venda.cliente_cpf)}><Text style={{ fontSize: 28 }}>💬</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {mostrarCatalogo && (
            <View>
              <TouchableOpacity style={[styles.buttonCenter, { marginBottom: 20 }]} onPress={() => { setEditandoRewardId('novo'); setForm({ nome: '', pontos: '', imagem: '', limiteCliente: '', limiteDia: '', limiteTotal: '' }); }}><Text style={styles.buttonText}>+ NOVO PRÊMIO</Text></TouchableOpacity>
              {editandoRewardId === 'novo' && (
                <View style={[styles.editBox, { marginBottom: 20 }]}>
                  {[{ key: 'nome', label: 'Nome do Prêmio' }, { key: 'pontos', label: 'Custo em Springs' }, { key: 'imagem', label: 'Link da foto (Opcional)' }].map(({ key, label }) => (
                    <TextInput key={key} value={form[key] || ''} onChangeText={(t) => setForm({ ...form, [key]: t })} placeholder={label} placeholderTextColor="#94A3B8" style={styles.input} keyboardType={key === 'pontos' ? 'numeric' : 'default'} />
                  ))}
                  <TouchableOpacity style={styles.button} onPress={salvarEdicao}><Text style={styles.buttonText}>SALVAR</Text></TouchableOpacity>
                </View>
              )}
              <View style={styles.grid}>
                {rewards.map((r) => (
                  <View key={r.id} style={[styles.cardGrid, { width: itemWidth as any }]}>
                    {r.imagem && <Image source={{ uri: r.imagem }} style={styles.img} />}
                    <Text style={styles.phone}>{r.nome}</Text><Text style={styles.points}>{r.custo_pontos} Springs</Text>
                    <TouchableOpacity style={styles.editBtn} onPress={() => editarReward(r)}><Text style={styles.buttonText}>EDITAR</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {mostrarRoleta && (
            <View>
              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#ec4899', marginBottom: 20 }]} onPress={() => { setEditandoRoletaId('novo'); setFormRoleta({ nome: '', tipo: 'pontos', valor: '', probabilidade: '10' }); }}><Text style={styles.buttonText}>+ NOVA FATIA</Text></TouchableOpacity>
              {editandoRoletaId === 'novo' && (
                <View style={styles.editBox}>
                  <TextInput placeholder="Nome da Fatia" value={formRoleta.nome || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, nome: t })} style={styles.input} />
                  <TextInput placeholder="Tipo (pontos, brinde)" value={formRoleta.tipo || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, tipo: t })} style={styles.input} />
                  <View style={{ flexDirection: 'row', gap: 10 }}><TextInput placeholder="Valor" value={formRoleta.valor || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, valor: t })} style={[styles.input, { flex: 1 }]} keyboardType="numeric" /><TextInput placeholder="Probabilidade (%)" value={formRoleta.probabilidade || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, probabilidade: t })} style={[styles.input, { flex: 1 }]} keyboardType="numeric" /></View>
                  <TouchableOpacity style={[styles.button, { backgroundColor: '#ec4899' }]} onPress={salvarRoleta}><Text style={styles.buttonText}>SALVAR</Text></TouchableOpacity>
                </View>
              )}
              {premiosRoleta.map((p) => (
                <View key={p.id} style={[styles.cardGrid, { width: '100%', flexDirection: 'row', justifyContent: 'space-between' }]}><View><Text style={{ color: '#fff' }}>{p.nome}</Text><Text style={{ color: '#ec4899' }}>{p.probabilidade}% de chance</Text></View><TouchableOpacity onPress={() => apagarRoleta(p.id)}><Text style={{ color: '#ef4444' }}>APAGAR</Text></TouchableOpacity></View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {mostrarValidarToken && (
        <Modal visible={mostrarValidarToken} transparent animationType="fade">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.9)' }}>
            <View style={{ backgroundColor: '#1e293b', borderRadius: 20, padding: 24, width: '85%', maxWidth: 400, borderWidth: 1, borderColor: '#334155' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#10b981', marginBottom: 20, textAlign: 'center' }}>🔑 VALIDAR TOKEN</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16, textAlign: 'center' }}>Digite os 6 dígitos que o cliente passou:</Text>
              <TextInput 
                placeholder="000000" 
                placeholderTextColor="#94a3b8" 
                value={tokenParaValidar.toUpperCase()} 
                onChangeText={(t) => setTokenParaValidar(t.replace(/[^A-Z0-9]/g, '').slice(0, 6))} 
                maxLength={6} 
                keyboardType="default"
                autoCapitalize="characters"
                style={{ backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#10b981', color: '#fff', padding: 16, fontSize: 28, fontWeight: 'bold', textAlign: 'center', borderRadius: 12, marginBottom: 20, letterSpacing: 4 }} 
              />
              <TouchableOpacity onPress={validarTokenExchange} disabled={tokenParaValidar.length !== 6 || carregandoValidacao} style={{ backgroundColor: tokenParaValidar.length === 6 ? '#10b981' : '#334155', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 }}>{carregandoValidacao ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#0f172a', fontWeight: '900', fontSize: 14 }}>✓ VALIDAR</Text>}</TouchableOpacity>
              <TouchableOpacity onPress={() => { setMostrarValidarToken(false); setTokenParaValidar(''); }} disabled={carregandoValidacao}><Text style={{ color: '#ef4444', textAlign: 'center', fontWeight: 'bold' }}>CANCELAR</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {caixaAtiva && (
        <View style={{ position: 'absolute', bottom: 20, right: 20, width: 300, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#10b981', elevation: 10, zIndex: 10000 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 16 }}>💰 CAIXA ATIVA (IMPORTAÇÃO)</Text>
            <TouchableOpacity onPress={() => setCaixaAtiva(null)} style={{ padding: 4 }}><Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold' }}>✕</Text></TouchableOpacity>
          </View>
          <View style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>CLIENTE: {caixaAtiva.cliente_cpf}</Text>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Pontos: {caixaAtiva.pontos_disponiveis}</Text>
            <Text style={{ color: '#94a3b8', fontSize: 10 }}>Taxa: -{caixaAtiva.taxa_em_pontos} SPG</Text>
          </View>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#1e293b', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#334155', elevation: 15 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalSub: { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
  toastContainer: { position: 'absolute', top: 20, left: 20, right: 20, zIndex: 100000, padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 15, flex: 1 },
  container: { flex: 1, backgroundColor: '#0F172A' },
  wrapper: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  headerButton: { color: '#94A3B8', fontWeight: '600' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#ef4444', fontWeight: 'bold' },
  logo: { color: '#10b981', fontSize: 28, fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  title: { color: '#fff', fontWeight: 'bold', marginBottom: 10, fontSize: 18 },
  label: { color: '#94A3B8', fontSize: 12, marginTop: 15 },
  inputValor: { backgroundColor: '#111827', color: '#10b981', fontSize: 32, fontWeight: '900', padding: 20, borderRadius: 12, marginTop: 15, textAlign: 'center', borderWidth: 1, borderColor: '#10b981' },
  input: { backgroundColor: '#111827', color: '#fff', padding: 12, borderRadius: 10, marginTop: 6 },
  buttonCenter: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  button: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  editBtn: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 10, marginTop: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardGrid: { backgroundColor: '#1e293b', padding: 10, marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  img: { width: '100%', height: 120, borderRadius: 10, resizeMode: 'contain', backgroundColor: '#fff' },
  editBox: { marginTop: 10, backgroundColor: '#020617', padding: 10, borderRadius: 10 },
  phone: { color: '#fff', fontWeight: 'bold' },
  points: { color: '#10b981', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  crmItem: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  crmTelefone: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  crmDetalhe: { color: '#94a3b8', fontSize: 12 },
});
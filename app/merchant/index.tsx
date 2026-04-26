import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, Vibration, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../lib/supabase';

export default function Merchant() {
  const { width } = useWindowDimensions();
  const getColumns = () => { if (width > 1200) return 4; if (width > 900) return 3; if (width > 600) return 2; return 1; };
  const formatarTelefone = (t: string) => {
    if (!t) return '---'; const num = t.replace(/\D/g, ''); if (num.length < 11) return t;
    return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7, 11)}`;
  };
  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const parseDataSupabase = (dateStr: string) => {
    if (!dateStr) return new Date();
    const strUTC = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
    return new Date(strUTC);
  };

  const columns = getColumns();
  const itemWidth = `${100 / columns - 2}%`;
  const params = useLocalSearchParams();
  const channelRef = useRef<any>(null);
  const channelResgateRef = useRef<any>(null);
  const qrRef = useRef<any>(null); 
  
  const [lojaId, setLojaId] = useState<string>('');
  const [fila, setFila] = useState<any[]>([]);

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

  useEffect(() => {
    let id = typeof params.loja_id === 'string' ? params.loja_id : Array.isArray(params.loja_id) ? params.loja_id[0] : '';
    if (!id) id = localStorage.getItem('@loja_id_merchant') || '';
    if (id) { setLojaId(id); localStorage.setItem('@loja_id_merchant', id); } else router.replace('/login');
  }, [params]);

  const[valorVenda, setValorVenda] = useState<any>({});
  const [telefoneManual, setTelefoneManual] = useState('');
  const[valorManual, setValorManual] = useState('');

  const[mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false); 
  const[mostrarCRM, setMostrarCRM] = useState(false);       
  const[mostrarRoleta, setMostrarRoleta] = useState(false); 

  const[editandoRewardId, setEditandoRewardId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const[formError, setFormError] = useState<string>(''); 
  const [rewards, setRewards] = useState<any[]>([]);
  const [cashbacks, setCashbacks] = useState<any>({});
  
  const[bonusPendentes, setBonusPendentes] = useState<any>({}); 
  const[usarBonus, setUsarBonus] = useState<any>({}); 

  const[modalCRM, setModalCRM] = useState<{ visivel: boolean, cpf: string, pontos: number, dias: number } | null>(null);
  const[loadingSalvar, setLoadingSalvar] = useState(false);

  // 🔥 ESTADOS DA ROLETA E NPS
  const[premiosRoleta, setPremiosRoleta] = useState<any[]>([]);
  const[editandoRoletaId, setEditandoRoletaId] = useState<string | null>(null);
  const[formRoleta, setFormRoleta] = useState<any>({});
  const[avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [mediaEstrelas, setMediaEstrelas] = useState(0);

  const [perguntasNps, setPerguntasNps] = useState<any[]>([]);
  const [mostrarNps, setMostrarNps] = useState(false);
  const [editandoNpsId, setEditandoNpsId] = useState<string | null>(null);
  const [formNps, setFormNps] = useState<any>({});
  
  const [brindesPendentes, setBrindesPendentes] = useState<any>({});

  const [config, setConfig] = useState({
    nome_loja: '', cor_primaria: '#10b981', cashback_percent: '0', cashback_expiracao_dias: '30',
    cashback_limite_uso_percent: '100', reais_por_ponto: '1', pontos_expiracao_dias: '365',
    limite_resgates_diario_cliente: '', tempo_bloqueio_minutos: '', 
    telefone: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', cep: '', 
    pontos_sobre_valor_bruto: true, usar_cashback_total: false, senha: '', bonus_retorno_pontos: '50', bonus_retorno_validade_dias: '3',
    roleta_ativa: false, roleta_intervalo_dias: '1' // 🔥 ROLETA CONFIG
  });
  
  const [cnpjBusca, setCnpjBusca] = useState('');
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  
  const [stats, setStats] = useState<any>({
    totalMes: 0, totalDia: 0, ticketMedio: 0, top5:[], resgatesHojeLista:[], resgatesAgrupados:[], pontosResgatadosHoje: 0, ultimosResgates:[],
    npsMedia: 0, npsTotal: 0, npsHistory: []
  });

  const[historicoCRM, setHistoricoCRM] = useState<any[]>([]); 
  const [clientesAtrasados, setClientesAtrasados] = useState(0); 

  const buscarFila = async () => {
    if (!lojaId) return;
    const { data } = await supabase.from('checkins').select('*').eq('loja_id', lojaId).order('created_at', { ascending: true });
    setFila((data ||[]).filter(c => c.status === 'ativo' || c.status === 'aguardando'));
  };

  const formatarCnpj = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + '.' + cleaned.slice(2);
    if (cleaned.length > 5) formatted = formatted.slice(0, 6) + '.' + formatted.slice(6);
    if (cleaned.length > 8) formatted = formatted.slice(0, 10) + '/' + formatted.slice(10);
    if (cleaned.length > 12) formatted = formatted.slice(0, 15) + '-' + formatted.slice(15);
    setCnpjBusca(formatted.slice(0, 18));
  };

  const buscarFinanceiroDetalhado = async (cpf: string, idFila?: string) => {
    if (!lojaId || !cpf) return;
    const { data: cb } = await supabase.from('cashbacks').select('valor, created_at').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('usado', false).order('created_at', { ascending: true });
    const lista = cb ||[];
    
    // 🔥 BUSCAR PONTOS DO CLIENTE NESTA LOJA
    const { data: pt } = await supabase.from('transacoes').select('pontos_gerados').eq('cliente_cpf', cpf).eq('loja_id', lojaId);
    const { data: ptUsados } = await supabase.from('resgates').select('pontos_usados').eq('cliente_cpf', cpf).eq('loja_id', lojaId);
    const totalGanhos = (pt || []).reduce((s, t) => s + (t.pontos_gerados || 0), 0);
    const totalUsados = (ptUsados || []).reduce((s, t) => s + (t.pontos_usados || 0), 0);

    setCashbacks((prev: any) => ({ 
      ...prev,
      [cpf]: { 
        total: lista.reduce((s, c) => s + Number(c.valor), 0), 
        proximo: lista.length ? Number(lista[0].valor) : 0,
        pontos: Math.max(0, totalGanhos - totalUsados)
      } 
    }));

    const hojeIso = new Date().toISOString();
    const { data: bn } = await supabase.from('bonus_pendentes').select('*').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('usado', false).gte('data_expiracao', hojeIso).order('created_at', { ascending: true }).limit(1);
    
    if (bn && bn.length > 0) {
      setBonusPendentes((prev: any) => ({ ...prev,[cpf]: bn[0].pontos }));
      if (idFila) setUsarBonus((prev: any) => ({ ...prev, [idFila]: true }));
    } else {
      setBonusPendentes((prev: any) => { const novo = {...prev}; delete novo[cpf]; return novo; });
      if (idFila) setUsarBonus((prev: any) => ({ ...prev,[idFila]: false })); 
    }

    const { data: brindes } = await supabase.from('brindes_pendentes').select('*').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('resgatado', false).order('created_at', { ascending: true });
    if (brindes && brindes.length > 0) {
      setBrindesPendentes((prev: any) => ({ ...prev,[cpf]: brindes }));
    } else {
      setBrindesPendentes((prev: any) => { const novo = {...prev}; delete novo[cpf]; return novo; });
    }
  };

  const eHoje = (dataString: string) => {
    const d = parseDataSupabase(dataString);
    const hoje = new Date();
    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  };

  const buscarStats = async () => {
    if (!lojaId) return;
    const { data: vendasData } = await supabase.from('transacoes').select('id, cliente_cpf, valor, pontos_gerados, created_at').eq('loja_id', lojaId).order('created_at', { ascending: false }).limit(1000);
    const { data: resgatesRaw } = await supabase.from('resgates').select('id, cliente_cpf, pontos_usados, recompensa_id, created_at').eq('loja_id', lojaId).order('created_at', { ascending: false }).limit(1000);
    const { data: recompensasData } = await supabase.from('recompensas').select('id, nome').eq('loja_id', lojaId);

    const recompensasMap: any = {}; (recompensasData ||[]).forEach(r => recompensasMap[r.id] = r.nome);
    const mesAtual = new Date().getMonth(); const anoAtual = new Date().getFullYear();

    const vendasDiaHoje = (vendasData ||[]).filter(t => eHoje(t.created_at));
    const vendasMes = (vendasData ||[]).filter(t => { const d = parseDataSupabase(t.created_at); return d.getMonth() === mesAtual && d.getFullYear() === anoAtual; });
    const resgatesHojeLista = (resgatesRaw ||[]).filter(r => eHoje(r.created_at));

    const agrupadosMap: any = {}; let pontosResgatados = 0;
    resgatesHojeLista.forEach((r: any) => {
      const nome = recompensasMap[r.recompensa_id] || 'Prêmio Excluído';
      if (!agrupadosMap[nome]) agrupadosMap[nome] = 0;
      agrupadosMap[nome]++; pontosResgatados += Number(r.pontos_usados);
    });
    
    const resgatesAgrupados = Object.keys(agrupadosMap).map(k => ({ nome: k, qtde: agrupadosMap[k] }));
    const totalDia = vendasDiaHoje.reduce((s, v) => s + Number(v.valor), 0);
    
    const crmMap = new Map();
    (vendasData ||[]).forEach(v => { if (!crmMap.has(v.cliente_cpf)) crmMap.set(v.cliente_cpf, v); });
    
    const crmListaFormatada = Array.from(crmMap.values()).map((v: any) => {
      const dataVenda = parseDataSupabase(v.created_at);
      const dataRetorno = new Date(dataVenda.getTime() + 15 * 24 * 60 * 60 * 1000); 
      const hojeObj = new Date(); hojeObj.setHours(0,0,0,0);
      const retornoObj = new Date(dataRetorno); retornoObj.setHours(0,0,0,0);
      const atrasado = hojeObj >= retornoObj;
      return { ...v, dataVenda, dataRetorno, atrasado, timeRetorno: dataRetorno.getTime() };
    });

    crmListaFormatada.sort((a, b) => a.timeRetorno - b.timeRetorno);
    const apenasAtrasados = crmListaFormatada.filter(c => c.atrasado);
    setHistoricoCRM(apenasAtrasados);
    setClientesAtrasados(apenasAtrasados.length); 

    const { data: npsRespostas } = await supabase.from('respostas_nps').select('resposta, created_at, pergunta_id').eq('loja_id', lojaId);
    const { data: perguntas } = await supabase.from('perguntas_nps').select('id, pergunta').eq('loja_id', lojaId);
    
    const npsNotas = (npsRespostas || []).map(r => {
      let nota = Number(r.resposta);
      if (isNaN(nota)) {
        if (r.resposta?.toLowerCase() === 'sim') nota = 5;
        else if (r.resposta?.toLowerCase() === 'nao') nota = 1;
        else return null;
      }
      return { 
        nota, 
        data: new Date(r.created_at).toLocaleDateString(),
        pergunta_id: r.pergunta_id 
      };
    }).filter(n => n !== null) as any[];

    const mediaNps = npsNotas.length ? npsNotas.reduce((s, v) => s + v.nota, 0) / npsNotas.length : 0;

    // Agrupar por pergunta e data para o gráfico multi-linhas
    const cores = ['#facc15', '#10b981', '#38bdf8', '#ec4899', '#a855f7'];
    const historyData: any = {};
    
    (perguntas || []).forEach((p, idx) => {
      const notasDaPergunta = npsNotas.filter(n => n.pergunta_id === p.id);
      const mapPorData: any = {};
      notasDaPergunta.forEach(n => {
        mapPorData[n.data] = mapPorData[n.data] ? { s: mapPorData[n.data].s + n.nota, c: mapPorData[n.data].c + 1 } : { s: n.nota, c: 1 };
      });
      
      const pontos = Object.keys(mapPorData).sort((a,b) => new Date(a).getTime() - new Date(b).getTime()).map(d => ({
        data: d,
        media: mapPorData[d].s / mapPorData[d].c
      }));

      if (pontos.length > 0) {
        historyData[p.id] = { nome: p.pergunta, cor: cores[idx % cores.length], pontos: pontos.slice(-7) };
      }
    });

    setStats({ 
      totalMes: vendasMes.reduce((s, v) => s + Number(v.valor), 0), totalDia, ticketMedio: vendasDiaHoje.length ? totalDia / vendasDiaHoje.length : 0, 
      top5: vendasDiaHoje.sort((a: any, b: any) => b.valor - a.valor).slice(0, 5) as any, resgatesHojeLista: resgatesHojeLista as any, resgatesAgrupados: resgatesAgrupados as any,
      pontosResgatadosHoje: pontosResgatados, npsMedia: mediaNps, npsTotal: npsNotas.length, npsHistory: Object.values(historyData),
      ultimosResgates: resgatesHojeLista.slice(0, 5).map(r => ({ cliente_cpf: r.cliente_cpf, nome_premio: recompensasMap[r.recompensa_id] || 'Prêmio' })) as any
    });
  };

  // 🔥 BUSCA AVALIAÇÕES E PREMIOS DA ROLETA E NPS
  const buscarAvaliacoesERoleta = async () => {
    if (!lojaId) return;
    const { data: avData } = await supabase.from('avaliacoes').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false }).limit(20);
    const avs = avData ||[];
    setAvaliacoes(avs);
    if (avs.length > 0) setMediaEstrelas(avs.reduce((a, b) => a + b.nota, 0) / avs.length);

    const { data: rolData } = await supabase.from('roleta_premios').select('*').eq('loja_id', lojaId).order('probabilidade', { ascending: false });
    setPremiosRoleta(rolData ||[]);

    const { data: npsData } = await supabase.from('perguntas_nps').select('*').eq('loja_id', lojaId).order('created_at', { ascending: true });
    setPerguntasNps(npsData || []);
  };

  const carregarConfig = async () => {
    if (!lojaId) return;
    const { data } = await supabase.from('configuracoes_loja').select('*').eq('loja_id', lojaId).maybeSingle();
    const { data: lojaData } = await supabase.from('lojas').select('senha').eq('id', lojaId).single();

    if (data) {
      setConfig({ ...config, ...data, senha: lojaData?.senha || '', cashback_percent: String(data.cashback_percent||0), reais_por_ponto: String(data.reais_por_ponto||1),
        limite_resgates_diario_cliente: data.limite_resgates_diario_cliente !== null && data.limite_resgates_diario_cliente !== undefined ? String(data.limite_resgates_diario_cliente) : '',
        tempo_bloqueio_minutos: data.tempo_bloqueio_minutos !== null && data.tempo_bloqueio_minutos !== undefined ? String(data.tempo_bloqueio_minutos) : '',
        bonus_retorno_pontos: String(data.bonus_retorno_pontos || 50), bonus_retorno_validade_dias: String(data.bonus_retorno_validade_dias || 3),
        roleta_ativa: data.roleta_ativa || false, roleta_intervalo_dias: data.roleta_intervalo_dias !== undefined && data.roleta_intervalo_dias !== null ? String(data.roleta_intervalo_dias) : '1' // 🔥 ATUALIZA CONFIG DA ROLETA
      });
    } else { setConfig(prev => ({ ...prev, senha: lojaData?.senha || '' })); }
  };

  const iniciarRealtime = () => {
    if (!lojaId) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (channelResgateRef.current) supabase.removeChannel(channelResgateRef.current);

    const channelCheckin = supabase.channel(`fila_aberta_${lojaId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, (p) => { buscarFila(); buscarStats(); if (p.eventType === 'INSERT') Vibration.vibrate([0, 500, 200, 500]); }).subscribe();
    const channelResgate = supabase.channel(`resgates_geral_escuta`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resgates' }, async (p) => {
        if (p.new.loja_id !== lojaId) return; 
        setTimeout(() => { buscarStats(); }, 1500); Vibration.vibrate([0, 1000, 500, 1000]); 
        const { data: premio } = await supabase.from('recompensas').select('nome').eq('id', p.new.recompensa_id).single();
        mostrarToast(`🎁 NOVO RESGATE: ${formatarTelefone(p.new.cliente_cpf)}\n1x ${premio?.nome || 'Produto'}`, 'sucesso');
      }).subscribe();

    channelRef.current = channelCheckin; channelResgateRef.current = channelResgate;
  };

  useEffect(() => {
    if (!lojaId) return;
    carregarConfig(); buscarFila(); buscarStats(); buscarAvaliacoesERoleta(); iniciarRealtime();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); if (channelResgateRef.current) supabase.removeChannel(channelResgateRef.current); };
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
      await supabase.from('checkins').delete().eq('id', id);
      Vibration.vibrate(200);
      setFila(prev => prev.filter(f => f.id !== id)); 
      setValorVenda((prev: any) => ({ ...prev,[id]: '' }));
      setUsarBonus((prev: any) => ({...prev, [id]: false})); 
      mostrarToast('✅ Venda registrada com sucesso!', 'sucesso');
      setTimeout(() => { buscarStats(); }, 1000);
    }
  };

  const atenderManual = async () => {
    const cpfTarget = telefoneManual.replace(/\D/g, '');
    const valorReal = parseInt(valorManual || '0', 10) / 100;

    if (cpfTarget.length < 10) { mostrarToast('Telefone inválido.', 'erro'); return; }
    if ((!valorReal || valorReal <= 0) && !usarBonus['manual']) { mostrarToast('Digite o valor da venda ou ative um Bônus.', 'erro'); return; }

    const sucesso = await processarPagamento(cpfTarget, valorReal, usarBonus['manual'] !== false);
    if (sucesso) {
      await supabase.from('checkins').delete().eq('cliente_cpf', cpfTarget).eq('loja_id', lojaId);
      Vibration.vibrate(200); setTelefoneManual(''); setValorManual(''); setUsarBonus((prev: any) => ({...prev,['manual']: false})); buscarFila(); setMostrarManual(false); 
      mostrarToast('✅ Venda Manual registrada!', 'sucesso'); setTimeout(() => { buscarStats(); }, 1000);
    }
  };

  const removerFila = async (id: string) => { await supabase.from('checkins').delete().eq('id', id); buscarFila(); };

  const iniciarCRM = (cpf: string) => {
    const pontos = Number(config.bonus_retorno_pontos) || 50;
    const dias = Number(config.bonus_retorno_validade_dias) || 3;
    setModalCRM({ visivel: true, cpf, pontos, dias });
  };

  const confirmarCRM = async (comBonus: boolean) => {
    if(!modalCRM) return;
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

  // 🔥 FUNÇÕES NPS E BRINDES
  const salvarPerguntaNps = async () => {
    if (!editandoNpsId) return;
    if (!formNps.pergunta || !formNps.tipo) { mostrarToast("Preencha a pergunta e escolha o tipo.", 'erro'); return; }
    
    const payload = { loja_id: lojaId, pergunta: formNps.pergunta, tipo: formNps.tipo, ativo: true };
    
    const { error } = editandoNpsId === 'novo' 
       ? await supabase.from('perguntas_nps').insert([payload]) 
       : await supabase.from('perguntas_nps').update(payload).eq('id', editandoNpsId);
    
    if (error) { mostrarToast(`Erro DB: ${error.message}`, 'erro'); return; }
    
    mostrarToast('📝 Pergunta NPS salva!', 'sucesso');
    setEditandoNpsId(null); setFormNps({}); buscarAvaliacoesERoleta();
  };

  const apagarPerguntaNps = async (id: string) => {
    await supabase.from('perguntas_nps').delete().eq('id', id);
    mostrarToast('Pergunta apagada.', 'sucesso');
    buscarAvaliacoesERoleta();
  };

  const entregarBrinde = async (idBrinde: string, cpf: string) => {
    await supabase.from('brindes_pendentes').update({ resgatado: true }).eq('id', idBrinde);
    mostrarToast('🎁 Brinde entregue com sucesso!', 'sucesso');
    buscarFinanceiroDetalhado(cpf);
  };

  // 🔥 FUNÇÕES DA ROLETA
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

  const buscarCnpj = async () => {
    const clean = cnpjBusca.replace(/\D/g, '');
    if (clean.length !== 14) { mostrarToast('CNPJ deve ter 14 números.', 'erro'); return; }
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      const data = await res.json();
      if (data.nome_fantasia || data.razao_social) {
        setConfig({
          ...config,
          nome_loja: data.nome_fantasia || data.razao_social,
          telefone: data.ddd_telefone_1 || '',
          cep: data.cep || '',
          endereco: data.logradouro || '',
          numero: data.numero || '',
          bairro: data.bairro || '',
          cidade: data.municipio || '',
          estado: data.uf || ''
        });
        mostrarToast('✅ Dados da loja importados!', 'sucesso');
      } else { mostrarToast('CNPJ não encontrado.', 'erro'); }
    } catch (e) { mostrarToast('Erro ao buscar CNPJ.', 'erro'); }
    setLoadingCnpj(false);
  };

  const baixarQRCode = () => {
    if (qrRef.current) {
      qrRef.current.toDataURL((dataURL: string) => {
        if (Platform.OS === 'web') {
          const link = document.createElement('a'); link.href = `data:image/png;base64,${dataURL}`; link.download = `QRCode_PalmSprings_${config.nome_loja ? config.nome_loja.replace(/\s+/g, '_') : 'Loja'}.png`; link.click();
          mostrarToast('📥 QR Code baixado com sucesso!', 'sucesso');
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
      roleta_ativa: config.roleta_ativa, roleta_intervalo_dias: config.roleta_intervalo_dias !== undefined && config.roleta_intervalo_dias !== '' ? Number(config.roleta_intervalo_dias) : 1 // 🔥 SALVA ROLETA
    }, { onConflict: 'loja_id' });

    if (config.senha && config.senha.trim() !== '') await supabase.from('lojas').update({ senha: config.senha }).eq('id', lojaId);
    setLoadingSalvar(false);
    if (error) { mostrarToast('Erro ao salvar configurações.', 'erro'); return; }
    mostrarToast('⚙️ Configurações salvas com sucesso!', 'sucesso');
    setTimeout(() => { setMostrarConfig(false); }, 1000);
  };

  const buscarRewards = async () => {
    const { data } = await supabase.from('recompensas').select('*').eq('loja_id', lojaId);
    setRewards(data ||[]);
  };

  const editarReward = (r: any) => {
    setEditandoRewardId((prev) => (prev === r.id ? null : r.id)); setFormError('');
    setForm({ nome: r.nome || '', pontos: r.custo_pontos !== null ? String(r.custo_pontos) : '', imagem: r.imagem || '', limiteCliente: r.limite_por_cliente !== null ? String(r.limite_por_cliente) : '', limiteDia: r.limite_quantidade !== null ? String(r.limite_quantidade) : '', limiteTotal: r.limite_total !== null ? String(r.limite_total) : '' });
  };

  const salvarEdicao = async () => {
    if (!editandoRewardId) return; setFormError('');
    if (!form.nome || form.nome.trim() === '') { setFormError("O Nome do prêmio é obrigatório."); return; }
    const pontos = parseInt(form.pontos);
    if (!pontos || isNaN(pontos) || pontos <= 0) { setFormError("O custo em Springs deve ser um número maior que zero."); return; }

    const payload = { loja_id: lojaId, nome: form.nome, custo_pontos: pontos, imagem: form.imagem || null, limite_por_cliente: form.limiteCliente ? Number(form.limiteCliente) : null, limite_quantidade: form.limiteDia ? Number(form.limiteDia) : null, limite_total: form.limiteTotal ? Number(form.limiteTotal) : null, ativo: true };
    if (editandoRewardId === 'novo') {
      const { error } = await supabase.from('recompensas').insert([payload]);
      if (error) { setFormError("Erro no banco: " + error.message); return; }
    } else {
      const { error } = await supabase.from('recompensas').update(payload).eq('id', editandoRewardId);
      if (error) { setFormError("Erro no banco: " + error.message); return; }
    }
    mostrarToast('🎁 Catálogo atualizado!', 'sucesso');
    setEditandoRewardId(null); setForm({}); setFormError(''); await buscarRewards(); 
  };

  // Adicionamos um timestamp no final da URL do QR Code (ex: &v=123456)
  // Isso força o navegador do celular do cliente a ignorar o cache antigo e sempre baixar a versão mais atualizada do código!
  const timestamp = new Date().getTime();
  const linkQR = `https://springs.amp.ia.br/cliente?loja_id=${lojaId}&v=${timestamp}`;

  if (!lojaId) return <View style={styles.center}><Text style={{color:'#fff'}}>Carregando Loja...</Text></View>;
  const roiEmReais = stats.pontosResgatadosHoje * (Number(config.reais_por_ponto) || 1);

  return (
    <View style={{flex: 1}}>
      {modalCRM && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enviar Mensagem</Text>
            <Text style={styles.modalSub}>Deseja enviar {modalCRM.pontos} Springs de presente para atrair o cliente {formatarTelefone(modalCRM.cpf)} de volta?</Text>
            <View style={{gap: 10, marginTop: 20}}>
              <TouchableOpacity style={[styles.buttonCenter, {backgroundColor: '#facc15'}]} onPress={() => confirmarCRM(true)}>
                <Text style={[styles.buttonText, {color: '#0f172a'}]}>🎁 SIM, ENVIAR BÔNUS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buttonCenter, {backgroundColor: '#334155'}]} onPress={() => confirmarCRM(false)}>
                <Text style={styles.buttonText}>NÃO, APENAS MENSAGEM</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{alignItems: 'center', marginTop: 15}} onPress={() => setModalCRM(null)}>
                <Text style={{color: '#ef4444', fontWeight: 'bold'}}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.container}>
        <Animated.View style={[styles.toastContainer, { transform:[{ translateY: toastAnim as any }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444' }]}>
          <Text style={{ fontSize: 24, marginRight: 12 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text><Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>

        <View style={styles.wrapper}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setMostrarConfig(!mostrarConfig)}><Text style={styles.headerButton}>⚙️ Configurações</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { localStorage.removeItem('@loja_id_merchant'); router.re          {/* 🚀 LINHA 1: OPERAÇÃO PRIORITÁRIA (Mecanismo Original Reestilizado) */}
          <View style={{ marginBottom: 20 }}>
            {fila.length === 0 ? (
              <View style={[styles.card, { padding: 30, alignItems: 'center', backgroundColor: '#020617', borderColor: '#334155' }]}>
                 <Text style={{ color: '#64748b', fontSize: 18, textAlign: 'center' }}>Nenhum cliente na fila no momento.</Text>
                 <TouchableOpacity onPress={buscarFila} style={{ marginTop: 15, backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔄 ATUALIZAR FILA</Text>
                 </TouchableOpacity>
              </View>
            ) : (
              fila.slice(0, 1).map((c) => {
                const valorRaw = valorVenda[c.id] || '';
                const valorFormatado = valorRaw ? (parseInt(valorRaw, 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
                const temBonus = bonusPendentes[c.cliente_cpf];
                
                return (
                  <View key={c.id} style={[styles.card, { backgroundColor: '#0f172a', padding: 20, borderColor: '#10b981', borderWidth: 2 }]}>
                    {/* PARTE SUPERIOR: TELEFONE | VALOR | BOTÃO */}
                    <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
                       {/* TELEFONE GIGANTE (ESQUERDA) */}
                       <View style={{ flex: 3, minWidth: 280, backgroundColor: '#020617', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#334155' }}>
                          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>ATENDENDO AGORA:</Text>
                          <Text style={{ color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -1 }}>{formatarTelefone(c.cliente_cpf)}</Text>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                            <Text style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>✨ {Math.floor(cashbacks[c.cliente_cpf]?.pontos || 0)} SPG</Text>
                            <Text style={{ color: '#facc15', fontSize: 12, fontWeight: 'bold' }}>💰 R$ {(cashbacks[c.cliente_cpf]?.total || 0).toFixed(2)} CB</Text>
                          </View>
                       </View>

                       {/* INPUT VALOR GIGANTE (CENTRO) */}
                       <View style={{ flex: 2, minWidth: 200 }}>
                          <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>VALOR DA VENDA (R$):</Text>
                          <TextInput 
                            placeholder="R$ 0,00" 
                            placeholderTextColor="#475569" 
                            keyboardType="numeric" 
                            value={valorFormatado} 
                            onChangeText={(t) => setValorVenda((p: any) => ({ ...p, [c.id]: t.replace(/\D/g, '') }))} 
                            style={{ backgroundColor: '#020617', color: '#10b981', fontSize: 48, fontWeight: '900', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#10b981', textAlign: 'right' }} 
                            onSubmitEditing={() => atender(c.id)} 
                          />
                       </View>

                       {/* BOTÃO ATENDER (DIREITA) */}
                       <TouchableOpacity 
                         onPress={() => atender(c.id)}
                         style={{ flex: 1, minWidth: 150, height: 95, backgroundColor: '#10b981', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 }}
                       >
                          <Text style={{ color: '#020617', fontWeight: '900', fontSize: 20 }}>ATENDER</Text>
                       </TouchableOpacity>
                    </View>

                    {/* MECANISMO ORIGINAL (RESUMO E BÔNUS) - ABAIXO DOS INPUTS */}
                    <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#334155' }}>
                       <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
                          
                          {/* SIMULAÇÃO / RESUMO */}
                          <View style={{ flex: 1, minWidth: 300 }}>
                             {valorRaw ? (
                               <View style={{ backgroundColor: '#1e293b', padding: 15, borderRadius: 12 }}>
                                  <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>💡 Resumo da venda:</Text>
                                  {(() => {
                                    const valorReal = parseInt(valorRaw, 10) / 100;
                                    const cb_total = cashbacks[c.cliente_cpf]?.total || 0;
                                    const cb_proximo = cashbacks[c.cliente_cpf]?.proximo || 0;
                                    const usarCb = config.usar_cashback_total ? cb_total : cb_proximo;
                                    const limiteCb = valorReal * (Number(config.cashback_limite_uso_percent) / 100);
                                    const cashbackUsado = Math.min(Math.min(valorReal, limiteCb), usarCb);
                                    const base = config.pontos_sobre_valor_bruto ? valorReal : (valorReal - cashbackUsado);
                                    const pontosCompra = Math.floor(base / (Number(config.reais_por_ponto) || 1));
                                    const aPagar = valorReal - cashbackUsado;

                                    return (
                                      <>
                                        <Text style={{ color: '#fff', fontSize: 14 }}>Venda: {formatarMoeda(valorReal)}</Text>
                                        {cashbackUsado > 0 && <Text style={{ color: '#facc15', fontSize: 13 }}>- Cashback Usado: {formatarMoeda(cashbackUsado)}</Text>}
                                        <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '900', marginTop: 5 }}>💳 A PAGAR: {formatarMoeda(aPagar)}</Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>✨ +{pontosCompra} Springs acumulados</Text>
                                      </>
                                    );
                                  })()}
                               </View>
                             ) : <Text style={{ color: '#64748b', fontStyle: 'italic' }}>Aguardando valor para simular pontos...</Text>}
                          </View>

                          {/* BÔNUS E BRINDES */}
                          <View style={{ flex: 1, minWidth: 300, gap: 10 }}>
                             {temBonus > 0 && (
                               <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#facc1515', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#facc1530' }}>
                                  <Switch value={usarBonus[c.id] !== false} onValueChange={(v) => setUsarBonus((prev: any) => ({...prev, [c.id]: v}))} />
                                  <Text style={{ color: '#facc15', marginLeft: 10, fontWeight: 'bold' }}>🎁 USAR BÔNUS: +{temBonus} SPG</Text>
                               </View>
                             )}

                             {brindesPendentes[c.cliente_cpf]?.map((b: any) => (
                               <View key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ec489915', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ec489930' }}>
                                  <Text style={{ color: '#ec4899', fontWeight: 'bold', fontSize: 13 }}>🏆 Brinde: {b.nome_brinde}</Text>
                                  <TouchableOpacity style={{ backgroundColor: '#ec4899', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }} onPress={() => entregarBrinde(b.id, c.cliente_cpf)}>
                                     <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>ENTREGAR</Text>
                                  </TouchableOpacity>
                               </View>
                             ))}
                          </View>
                       </View>
                    </View>
                  </View>
                );
              })
            )}
            
            {/* LISTA SECUNDÁRIA (Se houver mais de 1 na fila) */}
            {fila.length > 1 && (
               <View style={{ marginTop: 10, padding: 10, backgroundColor: '#1e293b50', borderRadius: 12 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>PRÓXIMOS NA FILA:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                     {fila.slice(1).map((f) => (
                       <View key={f.id} style={{ backgroundColor: '#334155', padding: 8, borderRadius: 8, marginRight: 8, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{formatarTelefone(f.cliente_cpf)}</Text>
                          <TouchableOpacity onPress={() => removerFila(f.id)}><Text style={{ color: '#ef4444', fontWeight: 'bold' }}>✕</Text></TouchableOpacity>
                       </View>
                     ))}
                  </ScrollView>
               </View>
            )}
          </View>

          {/* 📊 LINHA 2: INDICADORES (Cards MAIORES e PROPORCIONAIS) */}
          <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
             {/* QR */}
             <TouchableOpacity onPress={baixarQRCode} style={[styles.card, { flex: 1, minWidth: 160, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }]}>
                <QRCode value={linkQR} size={80} />
                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold', marginTop: 10 }}>QR BALCÃO</Text>
             </TouchableOpacity>

             {/* CAIXA HOJE */}
             <View style={[styles.card, { flex: 1.5, minWidth: 180, paddingVertical: 20 }]}>
                <Text style={{ color: '#10b981', fontSize: 32, fontWeight: '900' }}>{formatarMoeda(stats.totalDia)}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginTop: 5 }}>CAIXA HOJE</Text>
                <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>Mês: {formatarMoeda(stats.totalMes)}</Text>
             </View>

             {/* TOP CLIENTES */}
             <View style={[styles.card, { flex: 1.5, minWidth: 180, paddingVertical: 20 }]}>
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>{stats.top5.length}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginTop: 5 }}>TOP CLIENTES</Text>
                <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>Ativos hoje</Text>
             </View>

             {/* ESTOQUE */}
             <TouchableOpacity onPress={() => setMostrarCatalogo(true)} style={[styles.card, { flex: 1.2, minWidth: 160, paddingVertical: 20 }]}>
                <Text style={{ color: '#38bdf8', fontSize: 32, fontWeight: '900' }}>{rewards.length}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginTop: 5 }}>ESTOQUE</Text>
                <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>Prêmios</Text>
             </TouchableOpacity>

             {/* RESGATES */}
             <View style={[styles.card, { flex: 1.2, minWidth: 160, paddingVertical: 20 }]}>
                <Text style={{ color: '#ec4899', fontSize: 32, fontWeight: '900' }}>{stats.ultimosResgates.length}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginTop: 5 }}>RESGATES</Text>
                <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>Brindes hoje</Text>
             </View>
          </View>

          {/* 📈 LINHA 3: GRÁFICO (Largura Total) */}
          <View style={[styles.card, { width: '100%', marginBottom: 20, borderColor: '#facc15' }]}>
              <Text style={[styles.title, {color: '#facc15'}]}>⭐ Evolução de Satisfação (NPS)</Text>
              
              {stats.npsHistory.length > 0 ? (
                <View style={{ height: 150, marginVertical: 20 }}>
                   <View style={{ height: 100, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: '#334155', position: 'relative' }}>
                      {stats.npsHistory.map((line: any, idx: number) => (
                        <View key={idx} style={{ position: 'absolute', width: '100%', height: '100%' }}>
                          <svg width="100%" height="100" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute' }}>
                            <polyline
                              fill="none"
                              stroke={line.cor}
                              strokeWidth="2"
                              points={line.pontos.map((p: any, i: number) => {
                                const x = line.pontos.length > 1 ? (i / (line.pontos.length - 1)) * 100 : 50;
                                const y = 100 - (p.media / 5) * 100;
                                return `${x},${y}`;
                              }).join(' ')}
                              strokeLinejoin="round"
                            />
                          </svg>
                        </View>
                      ))}
                   </View>
                   <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginTop: 15 }}>
                      {stats.npsHistory.map((line: any, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                           <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: line.cor }} />
                           <Text style={{ fontSize: 12, color: '#cbd5e1' }}>{line.nome}</Text>
                        </View>
                      ))}
                   </View>
                </View>
              ) : <Text style={{color: '#64748b', fontSize: 14, padding: 30, textAlign: 'center'}}>Aguardando respostas para gerar o gráfico panorâmico...</Text>}
          </View>

          {/* 🛠️ LINHA 4: FERRAMENTAS E ROI */}
          <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
             <View style={[styles.card, { flex: 3, minWidth: 300, backgroundColor: '#020617', borderColor: '#10b981', padding: 20 }]}>
                <Text style={[styles.title, { color: '#10b981', fontSize: 16 }]}>📈 Lucratividade (ROI)</Text>
                <Text style={{ color: '#e2e8f0', fontSize: 15 }}>Retorno em faturamento hoje: <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 18 }}>{formatarMoeda(roiEmReais || 0)}</Text></Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 5 }}>Calculado sobre os {stats.pontosResgatadosHoje || 0} Springs resgatados.</Text>
             </View>

             <TouchableOpacity onPress={() => setMostrarManual(!mostrarManual)} style={[styles.card, { flex: 1, minWidth: 200, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>⌨️ LANÇAMENTO MANUAL</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 5 }}>Cliente fora da fila</Text>
             </TouchableOpacity>
          </View>

          {/* 📣 LINHA 5: CRM (Engajamento) */}
          <View style={[styles.card, { width: '100%', marginBottom: 40 }]}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.title}>📣 Engajamento de Clientes (Remarketing)</Text>
                <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                   <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{clientesAtrasados} ALERTAS</Text>
                </View>
             </View>
             
             <ScrollView style={{ maxHeight: 250 }}>
                {historicoCRM.length > 0 ? historicoCRM.map((c, i) => (
                  <TouchableOpacity key={i} onPress={() => setModalCRM(c)} style={styles.crmItem}>
                    <View>
                      <Text style={styles.crmTelefone}>{formatarTelefone(c.cpf)}</Text>
                      <Text style={styles.crmDetalhe}>Última compra: {c.ultimaCompraFormatada}</Text>
                    </View>
                    <Text style={[styles.crmRetorno, { color: '#facc15' }]}>Estratégia: {c.sugestao}</Text>
                  </TouchableOpacity>
                )) : <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 30 }}>Todos os seus clientes estão ativos! Parabéns! 🎉</Text>}
             </ScrollView>
          </View>
4748b', fontSize: 12, textAlign: 'center', padding: 20 }}>Todos os seus clientes estão em dia! 🎉</Text>}
             </ScrollView>
          </View>

          {mostrarConfig && (
            <View style={styles.card}>
              <Text style={styles.title}>⚙️ Configurações da Loja</Text>
              
              <View style={{ backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 8 }}>Importar dados via CNPJ</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput placeholder="00.000.000/0000-00" placeholderTextColor="#475569" value={cnpjBusca} onChangeText={formatarCnpj} style={[styles.input, { flex: 1, marginBottom: 0 }]} keyboardType="numeric" />
                  <TouchableOpacity style={[styles.button, { width: 100, height: 45, marginTop: 0, justifyContent: 'center' }]} onPress={buscarCnpj} disabled={loadingCnpj}>
                    <Text style={[styles.buttonText, { fontSize: 12 }]}>{loadingCnpj ? '...' : 'BUSCAR'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput placeholder="Nome da loja" value={config.nome_loja} onChangeText={(t) => setConfig({ ...config, nome_loja: t })} style={styles.input} />
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput placeholder="CEP" value={config.cep} onChangeText={(t) => setConfig({ ...config, cep: t })} style={[styles.input, { flex: 1 }]} keyboardType="numeric" />
                <TextInput placeholder="Telefone" value={config.telefone} onChangeText={(t) => setConfig({ ...config, telefone: t })} style={[styles.input, { flex: 1 }]} keyboardType="phone-pad" />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput placeholder="Endereço" value={config.endereco} onChangeText={(t) => setConfig({ ...config, endereco: t })} style={[styles.input, { flex: 3 }]} />
                <TextInput placeholder="Nº" value={config.numero} onChangeText={(t) => setConfig({ ...config, numero: t })} style={[styles.input, { flex: 1 }]} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput placeholder="Bairro" value={config.bairro} onChangeText={(t) => setConfig({ ...config, bairro: t })} style={[styles.input, { flex: 1 }]} />
                <TextInput placeholder="Cidade" value={config.cidade} onChangeText={(t) => setConfig({ ...config, cidade: t })} style={[styles.input, { flex: 1 }]} />
                <TextInput placeholder="UF" value={config.estado} onChangeText={(t) => setConfig({ ...config, estado: t })} style={[styles.input, { width: 50 }]} maxLength={2} autoCapitalize="characters" />
              </View>
              <Text style={[styles.title, { marginTop: 20 }]}>🔐 Segurança e Bloqueios</Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4 }}>Senha de Acesso ao Painel</Text>
              <TextInput placeholder="Sua senha de login" placeholderTextColor="#475569" value={config.senha} onChangeText={(t) => setConfig({ ...config, senha: t })} style={styles.input} />
              <Text style={{ color: '#facc15', fontSize: 12, marginLeft: 4, marginTop: 10, fontWeight: 'bold' }}>Tempo de bloqueio entre compras (minutos)</Text>
              <TextInput placeholder="Vazio = O cliente pode pontuar sem parar" placeholderTextColor="#475569" value={config.tempo_bloqueio_minutos} onChangeText={(t) => setConfig({ ...config, tempo_bloqueio_minutos: t })} style={[styles.input, { borderColor: '#facc15' }]} keyboardType="numeric" />
              
              <Text style={[styles.title, { marginTop: 20, color: '#ec4899' }]}>🎡 Roleta e Avaliações</Text>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>Roleta Ativada?</Text>
                <Switch value={config.roleta_ativa} onValueChange={(v) => setConfig({...config, roleta_ativa: v})} />
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginTop: 15 }}>Intervalo para o cliente jogar de novo (dias)</Text>
              <TextInput placeholder="Ex: 1 (Joga 1 vez por dia)" placeholderTextColor="#475569" value={config.roleta_intervalo_dias} onChangeText={(t) => setConfig({ ...config, roleta_intervalo_dias: t })} style={[styles.input, { borderColor: '#ec4899' }]} keyboardType="numeric" />

              <Text style={[styles.title, { marginTop: 20, color: '#facc15' }]}>🎁 Bônus de CRM (Remarketing)</Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4 }}>Quantos Springs de Bônus dar aos clientes sumidos?</Text>
              <TextInput placeholder="Ex: 50" placeholderTextColor="#475569" value={config.bonus_retorno_pontos} onChangeText={(t) => setConfig({ ...config, bonus_retorno_pontos: t })} style={[styles.input, { borderColor: '#facc15' }]} keyboardType="numeric" />
              <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginTop: 10 }}>Quantos dias o cliente tem para usar o Bônus?</Text>
              <TextInput placeholder="Ex: 3" placeholderTextColor="#475569" value={config.bonus_retorno_validade_dias} onChangeText={(t) => setConfig({ ...config, bonus_retorno_validade_dias: t })} style={[styles.input, { borderColor: '#facc15' }]} keyboardType="numeric" />
              <Text style={[styles.title, { marginTop: 20 }]}>⚙️ Regras do Clube</Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4 }}>A cada quantos Reais (R$) o cliente ganha 1 Spring?</Text>
              <TextInput placeholder="Ex: 50" placeholderTextColor="#475569" value={config.reais_por_ponto} onChangeText={(t) => setConfig({ ...config, reais_por_ponto: t })} style={styles.input} keyboardType="numeric" />
              <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginTop: 10 }}>Validade dos Pontos (em dias)</Text>
              <TextInput placeholder="Ex: 365" placeholderTextColor="#475569" value={config.pontos_expiracao_dias} onChangeText={(t) => setConfig({ ...config, pontos_expiracao_dias: t })} style={styles.input} keyboardType="numeric" />
              <Text style={{ color: '#facc15', fontSize: 12, marginLeft: 4, marginTop: 10, fontWeight: 'bold' }}>Máximo de resgates globais por cliente (por dia)</Text>
              <TextInput placeholder="Vazio = Sem Limite" placeholderTextColor="#475569" value={config.limite_resgates_diario_cliente} onChangeText={(t) => setConfig({ ...config, limite_resgates_diario_cliente: t })} style={[styles.input, { borderColor: '#facc15' }]} keyboardType="numeric" />
              <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginTop: 10 }}>% de Cashback gerado na venda</Text>
              <TextInput placeholder="Ex: 5" placeholderTextColor="#475569" value={config.cashback_percent} onChangeText={(t) => setConfig({ ...config, cashback_percent: t })} style={styles.input} keyboardType="numeric" />
              <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginTop: 10 }}>Validade do Cashback (em dias)</Text>
              <TextInput placeholder="Ex: 30" placeholderTextColor="#475569" value={config.cashback_expiracao_dias} onChangeText={(t) => setConfig({ ...config, cashback_expiracao_dias: t })} style={styles.input} keyboardType="numeric" />
              <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginTop: 10 }}>Limite de uso do Cashback (%) na próxima compra</Text>
              <TextInput placeholder="Ex: 100" placeholderTextColor="#475569" value={config.cashback_limite_uso_percent} onChangeText={(t) => setConfig({ ...config, cashback_limite_uso_percent: t })} style={styles.input} keyboardType="numeric" />
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 20}}>
                <View style={{flex: 1, paddingRight: 10}}><Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>Pontos sobre valor bruto?</Text><Switch value={config.pontos_sobre_valor_bruto} onValueChange={(v) => setConfig({...config, pontos_sobre_valor_bruto: v})} style={{marginTop: 5, alignSelf: 'flex-start'}} /></View>
                <View style={{flex: 1, paddingLeft: 10}}><Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>Usar cashback total?</Text><Switch value={config.usar_cashback_total} onValueChange={(v) => setConfig({...config, usar_cashback_total: v})} style={{marginTop: 5, alignSelf: 'flex-start'}} /></View>
              </View>
              <TouchableOpacity style={[styles.button, { opacity: loadingSalvar ? 0.6 : 1, marginTop: 30 }]} onPress={salvarConfig} disabled={loadingSalvar}><Text style={styles.buttonText}>{loadingSalvar ? 'SALVANDO...' : 'SALVAR E FECHAR'}</Text></TouchableOpacity>
            </View>
          )}

          {/* BLOCO DE CONFIGURAÇÕES (Removido o card duplicado da fila daqui) */}
          {mostrarConfig && (
                            {cb_total > 0 && <Text style={{ color: '#22c55e', marginTop: 10, fontSize: 18, fontWeight: 'bold' }}>💳 A PAGAR: {formatarMoeda(aPagar)}</Text>}
                          </>
                        );
                      })()}
                    </View>
                  )}
                  <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#10b981' }]} onPress={() => atender(c.id)}><Text style={styles.buttonText}>ATENDER E FINALIZAR</Text></TouchableOpacity>
                </View>
              );
            })} 
          </View>

          <TouchableOpacity style={[styles.button, { backgroundColor: '#334155', marginBottom: 15 }]} onPress={() => setMostrarManual(!mostrarManual)}>
            <Text style={styles.buttonText}>{mostrarManual ? 'FECHAR LANÇAMENTO MANUAL' : '➕ LANÇAMENTO MANUAL'}</Text>
          </TouchableOpacity>

          {mostrarManual && (
            <View style={styles.card}>
              <Text style={styles.title}>✍️ Lançamento Manual</Text>
              <TextInput placeholder="WhatsApp do Cliente" placeholderTextColor="#94A3B8" keyboardType="numeric" value={formatarTelefone(telefoneManual)} 
                onChangeText={(t) => { 
                  setTelefoneManual(t); const clean = t.replace(/\D/g, ''); if (clean.length >= 10) buscarFinanceiroDetalhado(clean, 'manual'); 
                  else { setBonusPendentes((prev: any) => { const novo = {...prev}; delete novo[clean]; return novo; }); setUsarBonus((prev: any) => ({...prev, ['manual']: false})); }
                }} style={styles.input} 
              />
              <TextInput placeholder="Valor: R$ 0,00" placeholderTextColor="#94A3B8" keyboardType="numeric" 
                value={valorManual ? (parseInt(valorManual, 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''} 
                onChangeText={(t) => setValorManual(t.replace(/\D/g, ''))} style={styles.inputValor} returnKeyType="done" onSubmitEditing={atenderManual}
                onKeyPress={(e) => { if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') atenderManual(); }} />
              
              {telefoneManual.replace(/\D/g, '').length >= 10 && bonusPendentes[telefoneManual.replace(/\D/g, '')] > 0 && (
                <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#facc1520', padding: 15, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#facc1550'}}>
                  <Switch value={usarBonus['manual'] !== false} onValueChange={(v) => setUsarBonus((prev: any) => ({...prev,['manual']: v}))} />
                  <Text style={{color: '#facc15', marginLeft: 12, fontWeight: 'bold', fontSize: 16}}>🎁 BÔNUS DE RETORNO: +{bonusPendentes[telefoneManual.replace(/\D/g, '')]} SPG</Text>
                </View>
              )}

              {valorManual !== '' && telefoneManual.replace(/\D/g, '').length >= 10 && (
                <View style={styles.simulacaoCard}>
                  <View style={{ marginTop: 12 }}><Text style={styles.simulacaoTitulo}>💡 Resumo da venda</Text></View>
                  {(() => {
                    const cpfLimpo = telefoneManual.replace(/\D/g, '');
                    const valorReal = parseInt(valorManual, 10) / 100;
                    if (valorReal <= 0 && (!usarBonus['manual'] && usarBonus['manual'] !== undefined)) return <Text style={{color: '#ef4444'}}>Digite o valor da venda.</Text>;

                    const temBonusManual = bonusPendentes[cpfLimpo];
                    const cb_total = cashbacks[cpfLimpo]?.total || 0;
                    const cb_proximo = cashbacks[cpfLimpo]?.proximo || 0;
                    const usarCb = config.usar_cashback_total ? cb_total : cb_proximo;
                    const limiteCb = valorReal * (Number(config.cashback_limite_uso_percent) / 100);
                    const cashbackUsado = Math.min(Math.min(valorReal, limiteCb), usarCb);
                    const base = config.pontos_sobre_valor_bruto ? valorReal : (valorReal - cashbackUsado);
                    const reaisPorPonto = Number(config.reais_por_ponto) || 1;
                    const pontosCompra = Math.floor(base / reaisPorPonto);
                    const pontosExtra = (usarBonus['manual'] !== false && temBonusManual) ? temBonusManual : 0;
                    const pontosTotais = pontosCompra + pontosExtra;
                    const aPagar = valorReal - cashbackUsado;

                    return (
                      <>
                        <Text style={styles.simulacaoValorBruto}>💵 Venda: {formatarMoeda(valorReal)}</Text>
                        {cb_total > 0 && <Text style={styles.simulacaoCashback}>💰 Saldo total: {formatarMoeda(cb_total)} {'\n'}⚡ Usado na compra: {formatarMoeda(cashbackUsado)}</Text>}
                        <Text style={styles.simulacaoPontos}>🎯 +{pontosCompra} Springs (da compra)</Text>
                        {pontosExtra > 0 && <Text style={{color: '#facc15', fontSize: 16, fontWeight: 'bold', marginTop: 4}}>🎁 +{pontosExtra} Springs (Bônus de Retorno)</Text>}
                        {pontosExtra > 0 && <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 8}}>✨ TOTAL A INJETAR: {pontosTotais} Springs</Text>}
                        {cb_total > 0 && <Text style={{ color: '#22c55e', marginTop: 10, fontSize: 18, fontWeight: 'bold' }}>💳 A PAGAR: {formatarMoeda(aPagar)}</Text>}
                      </>
                    );
                  })()}
                </View>
              )}
              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#10b981' }]} onPress={atenderManual}><Text style={styles.buttonText}>LANÇAR VENDA MANUAL</Text></TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.button, { backgroundColor: '#8b5cf6', marginTop: 15, marginBottom: 15 }]} onPress={() => { setMostrarCRM(!mostrarCRM); if (!mostrarCRM) buscarStats(); }}>
            <Text style={styles.buttonText}>{mostrarCRM ? 'FECHAR LISTA DE CLIENTES' : '📲 VER CLIENTES PARA REMARKETING'}</Text>
          </TouchableOpacity>

          {mostrarCRM && (
            <View style={styles.card}>
              <Text style={styles.title}>📲 Clientes para Contato</Text>
              <Text style={{color: '#94a3b8', fontSize: 12, marginBottom: 15}}>Envie uma mensagem com um bônus especial para quem não visita a loja há dias.</Text>
              {historicoCRM.length === 0 && <Text style={{color: '#64748b', fontStyle: 'italic'}}>Nenhum cliente aguardando contato.</Text>}
              {historicoCRM.map(venda => (
                <View key={venda.id} style={styles.crmItem}>
                   <View style={{ flex: 1 }}>
                      <Text style={styles.crmTelefone}>{formatarTelefone(venda.cliente_cpf)}</Text>
                      <Text style={styles.crmDetalhe}>Última Compra: {formatarMoeda(Number(venda.valor))} em {venda.dataVenda.toLocaleDateString('pt-BR')}</Text>
                      <Text style={[styles.crmRetorno, venda.atrasado ? {color: '#ef4444'} : {color: '#10b981'}]}>Retorno Esperado: {venda.dataRetorno.toLocaleDateString('pt-BR')}</Text>
                   </View>
                   <TouchableOpacity style={{ paddingLeft: 15 }} onPress={() => iniciarCRM(venda.cliente_cpf)}>
                      <Text style={{fontSize: 28}}>💬</Text>
                   </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* 🔥 PAINEL DE ENGAJAMENTO (Botões Lado a Lado) */}
          <View style={[styles.card, { marginTop: 10, borderColor: '#38bdf8', borderWidth: 1 }]}>
            <Text style={[styles.title, { color: '#38bdf8', textAlign: 'center', marginBottom: 20 }]}>🕹️ PAINEL DE ENGAJAMENTO</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: (mostrarCatalogo || mostrarNps || mostrarRoleta) ? 20 : 0 }}>
              <TouchableOpacity style={[styles.button, { flex: 1, minWidth: 100, backgroundColor: mostrarCatalogo ? '#1e293b' : '#334155', borderColor: mostrarCatalogo ? '#10b981' : 'transparent', borderWidth: 1 }]} onPress={async () => { const novo = !mostrarCatalogo; setMostrarCatalogo(novo); setMostrarNps(false); setMostrarRoleta(false); if (novo) { await buscarRewards(); } }}>
                <Text style={[styles.buttonText, { fontSize: 12, color: mostrarCatalogo ? '#10b981' : '#fff' }]}>{mostrarCatalogo ? 'FECHAR CATÁLOGO' : '🎁 CATÁLOGO'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1, minWidth: 100, backgroundColor: mostrarNps ? '#1e293b' : '#334155', borderColor: mostrarNps ? '#3b82f6' : 'transparent', borderWidth: 1 }]} onPress={() => { setMostrarNps(!mostrarNps); setMostrarCatalogo(false); setMostrarRoleta(false); }}>
                <Text style={[styles.buttonText, { fontSize: 12, color: mostrarNps ? '#3b82f6' : '#fff' }]}>{mostrarNps ? 'FECHAR PESQUISA' : '📋 PESQUISA NPS'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1, minWidth: 100, backgroundColor: mostrarRoleta ? '#1e293b' : '#334155', borderColor: mostrarRoleta ? '#ec4899' : 'transparent', borderWidth: 1 }]} onPress={() => { setMostrarRoleta(!mostrarRoleta); setMostrarCatalogo(false); setMostrarNps(false); }}>
                <Text style={[styles.buttonText, { fontSize: 12, color: mostrarRoleta ? '#ec4899' : '#fff' }]}>{mostrarRoleta ? 'FECHAR ROLETA' : '🎡 ROLETA'}</Text>
              </TouchableOpacity>
            </View>

          {mostrarCatalogo && (
            <View style={{ paddingTop: 15, borderTopWidth: 1, borderTopColor: '#334155' }}>
              <TouchableOpacity style={[styles.buttonCenter, { marginBottom: 20 }]} onPress={() => { setEditandoRewardId('novo'); setFormError(''); setForm({ nome: '', pontos: '', imagem: '', limiteCliente: '', limiteDia: '', limiteTotal: '' }); }}>
                <Text style={styles.buttonText}>+ ADICIONAR NOVO PRÊMIO</Text>
              </TouchableOpacity>

              {editandoRewardId === 'novo' && (
                <View style={[styles.editBox, { marginBottom: 20 }]}>
                  <Text style={{ color: '#10b981', fontWeight: 'bold', marginBottom: 10, fontSize: 16 }}>✨ Cadastrar Novo Prêmio</Text>
                  {formError !== '' && <Text style={{color: '#ef4444', fontWeight: 'bold', marginBottom: 10}}>{formError}</Text>}
                  {[ { key: 'nome', label: 'O que o cliente ganha? (Ex: Café)' }, { key: 'pontos', label: 'Quantos Springs custa? (Ex: 50)' }, { key: 'imagem', label: 'Link da foto (Opcional - URL da imagem)' }, { key: 'limiteCliente', label: 'Máximo por cliente na vida (Vazio = Infinito)' }, { key: 'limiteDia', label: 'Máximo que a loja dá por dia (Vazio = Infinito)' }, { key: 'limiteTotal', label: 'Estoque Total (Vazio = Infinito)' } ].map(({ key, label }) => (
                    <TextInput key={key} value={form[key] || ''} onChangeText={(t) => setForm({ ...form, [key]: t })} placeholder={label} placeholderTextColor="#94A3B8" style={styles.input} keyboardType={key === 'nome' || key === 'imagem' ? 'default' : 'numeric'} />
                  ))}
                  <TouchableOpacity style={styles.button} onPress={salvarEdicao}><Text style={styles.buttonText}>SALVAR PRÊMIO</Text></TouchableOpacity>
                </View>
              )}

              <View style={styles.grid}>
                {(rewards ||[]).map((r) => (
                  <View key={r.id} style={[styles.cardGrid, { width: itemWidth as any }]}>
                    {r.imagem && <Image source={{ uri: r.imagem }} style={styles.img} />}
                    <Text style={styles.phone}>{r.nome}</Text>
                    <Text style={styles.points}>{r.custo_pontos} Springs</Text>
                    <TouchableOpacity style={styles.editBtn} onPress={() => editarReward(r)}><Text style={styles.buttonText}>EDITAR</Text></TouchableOpacity>
                    {editandoRewardId === r.id && (
                      <View style={styles.editBox}>
                        {formError !== '' && <Text style={{color: '#ef4444', fontWeight: 'bold', marginBottom: 10}}>{formError}</Text>}
                        {[ { key: 'nome', label: 'O que o cliente ganha? (Ex: Café)' }, { key: 'pontos', label: 'Quantos Springs custa? (Ex: 50)' }, { key: 'imagem', label: 'Link da foto (Opcional - URL da imagem)' }, { key: 'limiteCliente', label: 'Máximo por cliente na vida (Vazio = Infinito)' }, { key: 'limiteDia', label: 'Máximo que a loja dá por dia (Vazio = Infinito)' }, { key: 'limiteTotal', label: 'Estoque Total (Vazio = Infinito)' } ].map(({ key, label }) => (
                          <TextInput key={key} value={form[key] || ''} onChangeText={(t) => setForm({ ...form, [key]: t })} placeholder={label} placeholderTextColor="#94A3B8" style={styles.input} keyboardType={key === 'nome' || key === 'imagem' ? 'default' : 'numeric'} />
                        ))}
                        <TouchableOpacity style={styles.button} onPress={salvarEdicao}><Text style={styles.buttonText}>SALVAR</Text></TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {mostrarNps && (
            <View style={{ paddingTop: 15, borderTopWidth: 1, borderTopColor: '#334155' }}>
              <Text style={{color: '#94a3b8', fontSize: 12, marginBottom: 15}}>Cadastre as perguntas que o cliente deve responder antes de girar a Roleta. As respostas te ajudarão a medir a satisfação.</Text>
              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#3b82f6', marginBottom: 20 }]} onPress={() => { setEditandoNpsId('novo'); setFormNps({ pergunta: '', tipo: 'estrelas' }); }}>
                <Text style={styles.buttonText}>+ CADASTRAR NOVA PERGUNTA</Text>
              </TouchableOpacity>

              {editandoNpsId === 'novo' && (
                <View style={[styles.editBox, { marginBottom: 20, borderColor: '#3b82f6', borderWidth: 1, backgroundColor: '#020617' }]}>
                  <Text style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>✨ Nova Pergunta</Text>
                  
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginBottom: 4 }}>Qual é a pergunta?</Text>
                  <TextInput placeholder="Ex: Como você avalia a limpeza da loja?" placeholderTextColor="#475569" value={formNps.pergunta || ''} onChangeText={(t) => setFormNps({ ...formNps, pergunta: t })} style={[styles.input, { marginBottom: 15 }]} />
                  
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginBottom: 4 }}>Tipo de Resposta</Text>
                  <View style={{flexDirection: 'row', gap: 10, marginBottom: 15}}>
                     <TouchableOpacity style={{flex: 1, padding: 10, borderWidth: 1, borderColor: formNps.tipo === 'estrelas' ? '#facc15' : '#334155', borderRadius: 8, alignItems: 'center'}} onPress={() => setFormNps({...formNps, tipo: 'estrelas'})}>
                        <Text style={{color: '#fff'}}>⭐ Estrelas (1 a 5)</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={{flex: 1, padding: 10, borderWidth: 1, borderColor: formNps.tipo === 'joia' ? '#10b981' : '#334155', borderRadius: 8, alignItems: 'center'}} onPress={() => setFormNps({...formNps, tipo: 'joia'})}>
                        <Text style={{color: '#fff'}}>👍 Joia (Sim/Não)</Text>
                     </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                    <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#3b82f6' }]} onPress={salvarPerguntaNps}>
                      <Text style={styles.buttonText}>SALVAR PERGUNTA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' }]} onPress={() => { setEditandoNpsId(null); setFormNps({}); }}>
                      <Text style={[styles.buttonText, { color: '#ef4444' }]}>CANCELAR</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {perguntasNps.map((p) => (
                <View key={p.id} style={[styles.cardGrid, { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View style={{flex: 1}}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>{p.pergunta}</Text>
                    <Text style={{color: '#3b82f6', fontSize: 12}}>Tipo: {p.tipo === 'estrelas' ? '⭐ Estrelas (1 a 5)' : '👍 Joia (Sim/Não)'}</Text>
                  </View>
                  <TouchableOpacity style={{padding: 10}} onPress={() => apagarPerguntaNps(p.id)}><Text style={{color: '#ef4444', fontWeight: 'bold'}}>APAGAR</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {mostrarRoleta && (
            <View style={{ paddingTop: 15, borderTopWidth: 1, borderTopColor: '#334155' }}>
              <Text style={{color: '#94a3b8', fontSize: 12, marginBottom: 15}}>Cadastre os prêmios (fatias) que o cliente pode ganhar ao avaliar a loja. A soma das probabilidades não precisa ser 100%.</Text>
              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#ec4899', marginBottom: 20 }]} onPress={() => { setEditandoRoletaId('novo'); setFormRoleta({ nome: '', tipo: 'pontos', valor: '', probabilidade: '10' }); }}>
                <Text style={styles.buttonText}>+ CADASTRAR FATIA NA ROLETA</Text>
              </TouchableOpacity>

              {editandoRoletaId === 'novo' && (
                <View style={[styles.editBox, { marginBottom: 20, borderColor: '#ec4899', borderWidth: 1, backgroundColor: '#020617' }]}>
                  <Text style={{ color: '#ec4899', fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>✨ Nova Fatia da Roleta</Text>
                  
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginBottom: 4 }}>O que vai aparecer escrito na roleta?</Text>
                  <TextInput placeholder="Ex: Ganhou 10 Springs" placeholderTextColor="#475569" value={formRoleta.nome || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, nome: t })} style={[styles.input, { marginBottom: 15 }]} />
                  
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginBottom: 4 }}>Tipo de Prêmio (pontos, cashback, brinde, nada)</Text>
                  <TextInput placeholder="Digite o tipo" placeholderTextColor="#475569" value={formRoleta.tipo || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, tipo: t })} style={[styles.input, { marginBottom: 15 }]} />
                  
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 5 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginBottom: 4 }}>Quantidade</Text>
                      <TextInput placeholder="Ex: 10 ou 5.00" placeholderTextColor="#475569" value={formRoleta.valor || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, valor: t })} style={styles.input} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 12, marginLeft: 4, marginBottom: 4 }}>Chance / Pesos</Text>
                      <TextInput placeholder="Ex: 40" placeholderTextColor="#475569" value={formRoleta.probabilidade || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, probabilidade: t })} style={styles.input} keyboardType="numeric" />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                    <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#ec4899' }]} onPress={salvarRoleta}>
                      <Text style={styles.buttonText}>SALVAR FATIA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' }]} onPress={() => { setEditandoRoletaId(null); setFormRoleta({}); }}>
                      <Text style={[styles.buttonText, { color: '#ef4444' }]}>CANCELAR</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {premiosRoleta.map((p) => (
                <View key={p.id} style={[styles.cardGrid, { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View style={{flex: 1}}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>{p.nome}</Text>
                    <Text style={{color: '#ec4899', fontSize: 12}}>Tipo: {p.tipo} | Valor: {p.valor} | Chance: {p.probabilidade}%</Text>
                  </View>
                  <TouchableOpacity style={{padding: 10}} onPress={() => apagarRoleta(p.id)}>
                     <Text style={{color: '#ef4444', fontWeight: 'bold'}}>APAGAR</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', zIndex: 9999, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', width: '100%', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#334155', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalSub: { color: '#94a3b8', fontSize: 16, textAlign: 'center', lineHeight: 22 },
  toastContainer: { position: 'absolute', top: Platform.OS === 'web' ? 20 : 50, left: 20, right: 20, zIndex: 9999, padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 15, flex: 1, lineHeight: 22 },
  topItem: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  topTelefone: { color: '#e2e8f0', fontSize: 14, marginRight: 10, flex: 1 },
  topValor: { color: '#22c55e', fontSize: 14, fontWeight: 'bold' },
  simulacaoCard: { padding: 10, backgroundColor: '#0f172a', borderRadius: 10, marginTop: 10 },
  simulacaoTitulo: { color: '#38bdf8', fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  simulacaoValorBruto: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold' },
  simulacaoCashback: { color: '#facc15', fontSize: 14, fontWeight: 'bold', marginTop: 6 },
  simulacaoPontos: { color: '#a78bfa', fontSize: 18, fontWeight: 'bold', marginTop: 6 },
  container: { flex: 1, backgroundColor: '#0F172A' },
  wrapper: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  headerButton: { color: '#94A3B8', fontWeight: '600' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#ef4444', fontWeight: 'bold' },
  logo: { color: '#10b981', fontSize: 28, textAlign: 'center', fontWeight: 'bold', marginBottom: 20 },
  cardSmall: { backgroundColor: '#1e293b', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#334155', justifyContent: 'center' },
  cardSmallTitle: { color: '#94a3b8', fontSize: 9, fontWeight: 'bold', marginTop: 4, textAlign: 'center' },
  cardCenter: { backgroundColor: '#1e293b', padding: 16, borderRadius: 20, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  title: { color: '#fff', fontWeight: 'bold', marginBottom: 10, fontSize: 18 },
  label: { color: '#94A3B8', fontSize: 12, marginLeft: 4, marginTop: 15 },
  filaItem: { marginTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  filaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  removeBtnTop: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  removeText: { color: '#fff', fontWeight: 'bold' },
  filaTelefone: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  inputValor: { backgroundColor: '#111827', color: '#10b981', fontSize: 32, fontWeight: '900', padding: 20, borderRadius: 12, marginTop: 15, textAlign: 'center', borderWidth: 1, borderColor: '#10b981' },
  input: { backgroundColor: '#111827', color: '#fff', fontWeight: 'bold', padding: 12, borderRadius: 10, marginTop: 6 },
  buttonCenter: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15, elevation: 5, shadowColor: '#2563eb', shadowOpacity: 0.5, shadowRadius: 10 },
  button: { backgroundColor: '#a6c4fc', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  editBtn: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 10, marginTop: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardGrid: { backgroundColor: '#1e293b', padding: 10, marginBottom: 10, borderRadius: 12 },
  img: { width: '100%', height: 120, borderRadius: 10, resizeMode: 'contain', backgroundColor: '#ffffff' },
  editBox: { marginTop: 10, backgroundColor: '#020617', padding: 10, borderRadius: 10 },
  phone: { color: '#fff', fontWeight: 'bold' },
  points: { color: '#10b981', fontWeight: 'bold' },
  stat: { color: '#e2e8f0', fontSize: 14, marginTop: 4, fontWeight: 'bold', lineHeight: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  crmItem: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  crmTelefone: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  crmDetalhe: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  crmRetorno: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  btnAlertaCrm: { marginTop: 15, backgroundColor: '#ef444420', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444' },
  txtAlertaCrm: { color: '#ef4444', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  topItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
});
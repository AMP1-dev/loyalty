import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, Vibration, View } from 'react-native';
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
  const scrollRef = useRef<ScrollView>(null);

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

  const [valorVenda, setValorVenda] = useState<any>({});
  const [telefoneManual, setTelefoneManual] = useState('');
  const [valorManual, setValorManual] = useState('');
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false);
  const [mostrarCRM, setMostrarCRM] = useState(false);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [mostrarRoleta, setMostrarRoleta] = useState(false);
  const [loadingSalvar, setLoadingSalvar] = useState(false);

  const [config, setConfig] = useState<any>({
    nome_loja: '', cor_primaria: '#10b981', cashback_percent: '0', cashback_expiracao_dias: '30',
    cashback_limite_uso_percent: '100', reais_por_ponto: '1', pontos_expiracao_dias: '365',
    telefone: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
    pontos_sobre_valor_bruto: true, usar_cashback_total: false, bonus_retorno_pontos: '50', bonus_retorno_validade_dias: '3',
    roleta_ativa: false, roleta_intervalo_dias: '1', limite_resgates_diario_cliente: '', tempo_bloqueio_minutos: ''
  });

  const [stats, setStats] = useState({
    totalMes: 0, totalDia: 0, vendasCount: 0, ticketMedio: 0, top5: [], resgatesHojeLista: [], resgatesAgrupados: [], pontosResgatadosHoje: 0, ultimosResgates: []
  });

  const [rewards, setRewards] = useState<any[]>([]);
  const [cashbacks, setCashbacks] = useState<any>({});
  const [bonusPendentes, setBonusPendentes] = useState<any>({});
  const [usarBonus, setUsarBonus] = useState<any>({});
  const [brindesPendentes, setBrindesPendentes] = useState<any>({});
  const [historicoCRM, setHistoricoCRM] = useState<any[]>([]);
  const [modalCRM, setModalCRM] = useState<any>(null);

  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [mediaEstrelas, setMediaEstrelas] = useState(0);
  const [premiosRoleta, setPremiosRoleta] = useState<any[]>([]);
  const [editandoRoletaId, setEditandoRoletaId] = useState<string | null>(null);
  const [formRoleta, setFormRoleta] = useState<any>({});
  const [editandoRewardId, setEditandoRewardId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [formError, setFormError] = useState('');

  const buscarFila = async () => {
    if (!lojaId) return;
    const { data } = await supabase.from('checkins').select('*').eq('loja_id', lojaId).order('created_at', { ascending: true });
    setFila((data || []).filter(c => c.status === 'ativo' || c.status === 'aguardando'));
  };

  const buscarFinanceiroDetalhado = async (cpf: string, idFila?: string) => {
    if (!lojaId || !cpf) return;
    const { data: cb } = await supabase.from('cashbacks').select('valor, created_at').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('usado', false).order('created_at', { ascending: true });
    const { data: trans } = await supabase.from('transacoes').select('pontos_gerados').eq('cliente_cpf', cpf).eq('loja_id', lojaId);
    const { data: resg } = await supabase.from('resgates').select('pontos_usados').eq('cliente_cpf', cpf).eq('loja_id', lojaId);
    
    const saldoFinal = ((trans || []).reduce((s, t) => s + (t.pontos_gerados || 0), 0)) - ((resg || []).reduce((s, r) => s + (r.pontos_usados || 0), 0));

    setCashbacks((prev: any) => ({ 
      ...prev, [cpf]: { total: (cb || []).reduce((s, c) => s + Number(c.valor), 0), proximo: (cb || []).length ? Number(cb?.[0].valor) : 0, pontos: saldoFinal } 
    }));

    const { data: bn } = await supabase.from('bonus_pendentes').select('*').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('usado', false).gte('data_expiracao', new Date().toISOString()).limit(1);
    if (bn?.length) {
      setBonusPendentes((prev: any) => ({ ...prev, [cpf]: bn[0].pontos }));
      if (idFila) setUsarBonus((prev: any) => ({ ...prev, [idFila]: true }));
    }

    const { data: br } = await supabase.from('roleta_brindes_pendentes').select('*').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('entregue', false);
    setBrindesPendentes((prev: any) => ({ ...prev, [cpf]: br || [] }));
  };

  const buscarStats = async () => {
    if (!lojaId) return;
    const { data: vds } = await supabase.from('transacoes').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false }).limit(1000);
    const { data: resRaw } = await supabase.from('resgates').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false }).limit(1000);
    const { data: rew } = await supabase.from('recompensas').select('id, nome').eq('loja_id', lojaId);

    const rewMap: any = {}; (rew || []).forEach(r => rewMap[r.id] = r.nome);
    const hoje = new Date(); 
    const vdsHoje = (vds || []).filter(v => { const d = parseDataSupabase(v.created_at); return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth(); });
    const totalDia = vdsHoje.reduce((s, v) => s + Number(v.valor), 0);
    const resHoje = (resRaw || []).filter(r => { const d = parseDataSupabase(r.created_at); return d.getDate() === hoje.getDate(); });

    let ptsRes = 0; resHoje.forEach(r => ptsRes += Number(r.pontos_usados));

    setStats({
      totalMes: (vds || []).filter(v => parseDataSupabase(v.created_at).getMonth() === hoje.getMonth()).reduce((s, v) => s + Number(v.valor), 0),
      totalDia, vendasCount: vdsHoje.length, ticketMedio: vdsHoje.length ? totalDia / vdsHoje.length : 0,
      top5: vdsHoje.slice(0, 5) as any, resgatesHojeLista: resHoje as any, resgatesAgrupados: [] as any,
      pontosResgatadosHoje: ptsRes, ultimosResgates: resHoje.slice(0, 5).map(r => ({ cliente_cpf: r.cliente_cpf, nome_premio: rewMap[r.recompensa_id] })) as any
    });

    const crmMap = new Map();
    (vds || []).forEach(v => { if (!crmMap.has(v.cliente_cpf)) crmMap.set(v.cliente_cpf, v); });
    const crmLista = Array.from(crmMap.values()).map((v: any) => {
      const dRetorno = new Date(parseDataSupabase(v.created_at).getTime() + 15 * 24 * 60 * 60 * 1000);
      return { ...v, atrasado: new Date() >= dRetorno, dataVenda: parseDataSupabase(v.created_at), dataRetorno: dRetorno };
    }).filter(c => c.atrasado);
    setHistoricoCRM(crmLista);
  };

  const carregarConfig = async () => {
    if (!lojaId) return;
    const { data } = await supabase.from('configuracoes_loja').select('*').eq('loja_id', lojaId).maybeSingle();
    const { data: lj } = await supabase.from('lojas').select('senha').eq('id', lojaId).single();
    if (data) setConfig({ ...data, senha: lj?.senha || '', cashback_percent: String(data.cashback_percent), reais_por_ponto: String(data.reais_por_ponto) });
    const { data: rew } = await supabase.from('recompensas').select('*').eq('loja_id', lojaId);
    setRewards(rew || []);
    const { data: avs } = await supabase.from('avaliacoes').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false }).limit(20);
    setAvaliacoes(avs || []);
    if (avs?.length) setMediaEstrelas(avs.reduce((s, a) => s + a.nota, 0) / avs.length);
    const { data: rol } = await supabase.from('roleta_premios').select('*').eq('loja_id', lojaId);
    setPremiosRoleta(rol || []);
  };

  useEffect(() => {
    if (lojaId) { carregarConfig(); buscarFila(); buscarStats(); }
  }, [lojaId]);

  useEffect(() => {
    fila.forEach(c => buscarFinanceiroDetalhado(c.cliente_cpf, c.id));
  }, [fila]);

  const atender = async (id: string, manualCpf?: string) => {
    const item = manualCpf ? { cliente_cpf: manualCpf } : fila.find(f => f.id === id);
    if (!item) return;
    const vRaw = manualCpf ? valorManual : valorVenda[id];
    const vFloat = parseInt(vRaw || '0', 10) / 100;
    const { error } = await supabase.rpc('realizar_pagamento', { p_cliente_cpf: item.cliente_cpf, p_loja_id: lojaId, p_valor: vFloat, p_usar_cashback: true, p_aplicar_bonus: usarBonus[id || 'manual'] === true });
    
    if (error) { mostrarToast(error.message, 'erro'); return; }
    if (id) await supabase.from('checkins').delete().eq('id', id);
    else await supabase.from('checkins').delete().eq('cliente_cpf', manualCpf).eq('loja_id', lojaId);

    mostrarToast('✅ Atendimento finalizado!', 'sucesso');
    if (manualCpf) { setTelefoneManual(''); setValorManual(''); setMostrarManual(false); }
    buscarFila(); buscarStats();
  };

  const salvarConfig = async () => {
    setLoadingSalvar(true);
    await supabase.from('configuracoes_loja').upsert({ ...config, loja_id: lojaId, cashback_percent: Number(config.cashback_percent), reais_por_ponto: Number(config.reais_por_ponto) });
    if (config.senha) await supabase.from('lojas').update({ senha: config.senha }).eq('id', lojaId);
    setLoadingSalvar(false); mostrarToast('⚙️ Configurações salvas!', 'sucesso'); setMostrarConfig(false);
  };

  const baixarQRCode = () => {
    qrRef.current.toDataURL((data: string) => {
      const link = document.createElement('a'); link.href = `data:image/png;base64,${data}`; link.download = 'QRCode.png'; link.click();
    });
  };

  const linkQR = `https://springs.amp.ia.br/cliente?loja_id=${lojaId}`;

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.header}>
          <Text style={styles.logo}>PALM SPRINGS</Text>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{config.nome_loja?.toUpperCase() || 'LOJA'}</Text>
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity onPress={() => setMostrarConfig(true)}><Text style={{ color: '#94a3b8' }}>⚙️ Config</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/login')}><Text style={{ color: '#ef4444' }}>✕ Sair</Text></TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 25 }}>
          <View style={[styles.card, { flex: 1, height: 150, justifyContent: 'center' }]}>
            {fila.length > 0 ? (
              <View>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>ATENDENDO:</Text>
                <Text style={{ color: '#fff', fontSize: 42, fontWeight: 'bold' }}>{formatarTelefone(fila[0].cliente_cpf)}</Text>
              </View>
            ) : <Text style={{ color: '#475569', fontSize: 20 }}>FILA VAZIA</Text>}
          </View>
          <View style={[styles.card, { flex: 1, height: 150, padding: 0 }]}>
            <TextInput
              placeholder="R$ 0,00" placeholderTextColor="#1e293b" keyboardType="numeric"
              style={{ color: '#10b981', fontSize: 60, fontWeight: 'bold', textAlign: 'center', height: '100%' }}
              value={fila.length > 0 ? (valorVenda[fila[0].id] ? (parseInt(valorVenda[fila[0].id], 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '') : ''}
              onChangeText={(t) => fila.length > 0 && setValorVenda({ ...valorVenda, [fila[0].id]: t.replace(/\D/g, '') })}
              onSubmitEditing={() => atender(fila[0].id)}
            />
          </View>
          <TouchableOpacity onPress={() => atender(fila[0].id)} style={[styles.card, { flex: 0.5, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#020617', fontWeight: 'bold', fontSize: 18 }}>ATENDER</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 25 }}>
          <View style={[styles.card, { flex: 1, minHeight: 200 }]}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#10b981', fontSize: 36, fontWeight: 'bold' }}>{formatarMoeda(stats.totalMes)}</Text>
                <Text style={{ color: '#fff' }}>{hoje.toLocaleDateString()} {hoje.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
             </View>
             <Text style={{ color: '#94a3b8' }}>FATURAMENTO MÊS</Text>
             <View style={{ height: 1, backgroundColor: '#1e293b', my: 15 }} />
             <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View><Text style={{ color: '#38bdf8', fontSize: 28, fontWeight: 'bold' }}>{stats.vendasCount}</Text><Text style={{ color: '#94a3b8' }}>ATENDIDOS HOJE</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={{ color: '#38bdf8', fontSize: 28, fontWeight: 'bold' }}>{formatarMoeda(stats.ticketMedio)}</Text><Text style={{ color: '#94a3b8' }}>TICKET MÉDIO</Text></View>
             </View>
          </View>
          <View style={[styles.card, { flex: 1, minHeight: 200 }]}>
             <Text style={{ color: '#facc15', fontWeight: 'bold' }}>💡 RESUMO DA VENDA</Text>
             {fila.length > 0 && valorVenda[fila[0].id] ? (
               <View style={{ marginTop: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 60, textAlign: 'right', fontWeight: 'bold' }}>{formatarMoeda(parseInt(valorVenda[fila[0].id], 10) / 100)}</Text>
                  <Text style={{ color: '#94a3b8', textAlign: 'right' }}>VALOR TOTAL</Text>
               </View>
             ) : <Text style={{ color: '#475569', marginTop: 20 }}>Aguardando valor...</Text>}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 20 }}>
          <TouchableOpacity onPress={() => setMostrarManual(true)} style={[styles.card, { flex: 1, backgroundColor: '#1e293b', alignItems: 'center' }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>⌨️ LANÇAMENTO MANUAL</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setMostrarCRM(true)} style={[styles.card, { flex: 1, backgroundColor: '#8b5cf6', alignItems: 'center' }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>📲 REMARKETING</Text></TouchableOpacity>
        </View>

        {mostrarManual && (
          <View style={[styles.card, { marginTop: 20, borderColor: '#10b981', borderWidth: 1 }]}>
            <Text style={styles.title}>✍️ Lançamento Manual</Text>
            <TextInput placeholder="WhatsApp" placeholderTextColor="#475569" style={styles.input} value={telefoneManual} onChangeText={setTelefoneManual} keyboardType="numeric" />
            <TextInput placeholder="Valor R$ 0,00" placeholderTextColor="#475569" style={[styles.input, { fontSize: 32, color: '#10b981' }]} value={valorManual} onChangeText={t => setValorManual(t.replace(/\D/g, ''))} keyboardType="numeric" />
            <TouchableOpacity onPress={() => atender('', telefoneManual)} style={{ backgroundColor: '#10b981', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' }}><Text style={{ fontWeight: 'bold' }}>FINALIZAR VENDA</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setMostrarManual(false)} style={{ marginTop: 10, alignItems: 'center' }}><Text style={{ color: '#ef4444' }}>CANCELAR</Text></TouchableOpacity>
          </View>
        )}

        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <QRCode value={linkQR} size={200} getRef={c => qrRef.current = c} />
          <TouchableOpacity onPress={baixarQRCode} style={{ marginTop: 15 }}><Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>Baixar QR Code Balcão</Text></TouchableOpacity>
        </View>
      </ScrollView>

      {mostrarConfig && (
        <View style={styles.modal}>
          <ScrollView style={{ width: '100%', maxWidth: 500, backgroundColor: '#1e293b', padding: 25, borderRadius: 20 }}>
            <Text style={styles.title}>Configurações</Text>
            <TextInput placeholder="Nome da Loja" value={config.nome_loja} onChangeText={t => setConfig({ ...config, nome_loja: t })} style={styles.input} />
            <TextInput placeholder="Senha" value={config.senha} onChangeText={t => setConfig({ ...config, senha: t })} style={styles.input} secureTextEntry />
            <TouchableOpacity onPress={salvarConfig} style={{ backgroundColor: '#10b981', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' }}><Text style={{ fontWeight: 'bold' }}>SALVAR</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setMostrarConfig(false)} style={{ marginTop: 15, alignItems: 'center' }}><Text style={{ color: '#94a3b8' }}>FECHAR</Text></TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  logo: { color: '#10b981', fontSize: 24, fontWeight: '900' },
  card: { backgroundColor: '#111827', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b' },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#020617', color: '#fff', padding: 15, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#1e293b' },
  modal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
});
import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { supabase } from '../../lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SuperAdmin() {
  const[senhaMestra, setSenhaMestra] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [lojas, setLojas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const[lojaExpandida, setLojaExpandida] = useState<string | null>(null);

  // 🔥 ESTADOS DO MODAL DE EDIÇÃO / CRIAÇÃO DE LOJA
  const [modalLoja, setModalLoja] = useState<{ visivel: boolean, id: string | null, nome: string, cnpj: string, telefone: string, limite_usuarios: string } | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const[toast, setToast] = useState({ visible: false, message: '', tipo: 'sucesso' });
  const toastAnim = useRef(new Animated.Value(-150)).current; 

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ visible: true, message: mensagem, tipo });
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: Platform.OS === 'web' ? 20 : 50, useNativeDriver: true, speed: 12 }), 
      Animated.delay(3000), 
      Animated.timing(toastAnim, { toValue: -150, duration: 400, useNativeDriver: true }) 
    ]).start(() => setToast({ visible: false, message: '', tipo: 'sucesso' }));
  };

  const dataPadrao = new Date();
  dataPadrao.setMonth(dataPadrao.getMonth() - 1); 

  const [mesFiltro, setMesFiltro] = useState(dataPadrao.getMonth() + 1); 
  const[anoFiltro, setAnoFiltro] = useState(dataPadrao.getFullYear());
  const[faturamentos, setFaturamentos] = useState<any>({});
  const[taxasEditaveis, setTaxasEditaveis] = useState<any>({});

  const nomesMeses =['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const SENHA_DO_DONO = 'amp2026';
  const channelRef = useRef<any>(null);

  const logarAdmin = () => {
    if (senhaMestra === SENHA_DO_DONO) { setAutenticado(true); carregarDadosGerais(); } 
    else { mostrarToast('Senha Mestra Incorreta.', 'erro'); }
  };

  const mudarMes = (delta: number) => {
    let novoMes = mesFiltro + delta; let novoAno = anoFiltro;
    if (novoMes > 12) { novoMes = 1; novoAno++; }
    if (novoMes < 1) { novoMes = 12; novoAno--; }
    setMesFiltro(novoMes); setAnoFiltro(novoAno);
  };

  useEffect(() => {
    if (autenticado) { carregarDadosGerais(); iniciarRealtime(); }
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [mesFiltro, anoFiltro, autenticado]);

  const iniciarRealtime = () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase.channel('admin_lojas_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lojas' }, (payload) => {
        carregarDadosGerais(); 
        if (payload.eventType === 'INSERT') mostrarToast('🏢 Nova loja cadastrada na plataforma!', 'sucesso');
      }).subscribe();
    channelRef.current = channel;
  };

  const carregarDadosGerais = async () => {
    setLoading(true);
    
    // Busca Lojas e Telefones
    const { data: lojasData } = await supabase.from('lojas').select('*').order('created_at', { ascending: false });
    const { data: configsData } = await supabase.from('configuracoes_loja').select('loja_id, telefone');

    const telefonesMap: any = {};
    (configsData ||[]).forEach(c => telefonesMap[c.loja_id] = c.telefone);
    
    if (lojasData) {
      const lojasComTelefone = lojasData.map(l => ({ ...l, telefone: telefonesMap[l.id] || '' }));
      setLojas(lojasComTelefone);
      const taxasTemp: any = {};
      lojasComTelefone.forEach(l => taxasTemp[l.id] = String(l.taxa_comissao || 0));
      setTaxasEditaveis(taxasTemp);
    }

    const dataInicio = new Date(anoFiltro, mesFiltro - 1, 1).toISOString();
    const dataFim = new Date(anoFiltro, mesFiltro, 0, 23, 59, 59, 999).toISOString();
    const { data: transacoes } = await supabase.from('transacoes').select('loja_id, valor').gte('created_at', dataInicio).lte('created_at', dataFim);
    
    const faturamentoMap: any = {};
    (transacoes ||[]).forEach(t => {
      if (!faturamentoMap[t.loja_id]) faturamentoMap[t.loja_id] = 0;
      faturamentoMap[t.loja_id] += Number(t.valor);
    });

    setFaturamentos(faturamentoMap);
    setLoading(false);
  };

  // 🔥 CONSULTA NA RECEITA FEDERAL (BRASIL API)
  const consultarCNPJ = async () => {
    if (!modalLoja || !modalLoja.cnpj) return;
    const cnpjLimpo = modalLoja.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) { mostrarToast('CNPJ deve ter 14 números', 'erro'); return; }

    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await res.json();
      
      if (data.message) {
        mostrarToast('CNPJ não encontrado na Receita', 'erro');
      } else {
        setModalLoja(prev => ({
          ...prev!,
          nome: data.nome_fantasia || data.razao_social || prev!.nome,
          telefone: data.ddd_telefone_1 || prev!.telefone
        }));
        mostrarToast('✅ Dados importados da Receita!', 'sucesso');
      }
    } catch (e) {
      mostrarToast('Erro ao consultar a internet', 'erro');
    }
    setLoadingCnpj(false);
  };

  // 🔥 SALVAR LOJA (CRIAR OU EDITAR)
  const salvarLojaAdmin = async () => {
    if (!modalLoja) return;
    const cnpjLimpo = modalLoja.cnpj.replace(/\D/g, '');
    if (!modalLoja.nome || cnpjLimpo.length < 14) {
      mostrarToast('Preencha o Nome e um CNPJ válido.', 'erro'); return;
    }

    if (modalLoja.id) {
      // ATUALIZAR LOJA EXISTENTE
      await supabase.from('lojas').update({ 
        nome: modalLoja.nome, 
        cnpj: cnpjLimpo,
        limite_usuarios: Number(modalLoja.limite_usuarios) || 1
      }).eq('id', modalLoja.id);
      await supabase.from('configuracoes_loja').update({ telefone: modalLoja.telefone }).eq('loja_id', modalLoja.id);
      mostrarToast('Loja atualizada com sucesso!', 'sucesso');
    } else {
      // CRIAR NOVA LOJA
      const { data: novaLoja, error } = await supabase.from('lojas').insert([{ 
        nome: modalLoja.nome, 
        cnpj: cnpjLimpo, 
        senha: '1234', 
        ativo: true,
        limite_usuarios: Number(modalLoja.limite_usuarios) || 1
      }]).select('id').single();

      if (error) { mostrarToast(error.message, 'erro'); return; }
      
      await supabase.from('configuracoes_loja').insert([{ 
        loja_id: novaLoja.id, nome_loja: modalLoja.nome, telefone: modalLoja.telefone, reais_por_ponto: 1 
      }]);
      mostrarToast('Loja criada com sucesso! A senha padrão é 1234.', 'sucesso');
    }

    setModalLoja(null);
    carregarDadosGerais();
  };

  const abrirEdicao = (loja: any) => {
    setModalLoja({ 
      visivel: true, 
      id: loja.id, 
      nome: loja.nome, 
      cnpj: loja.cnpj || '', 
      telefone: loja.telefone || '',
      limite_usuarios: String(loja.limite_usuarios || 1)
    });
  };

  const salvarTaxa = async (id: string) => {
    const novaTaxa = Number(taxasEditaveis[id].replace(',', '.')) || 0;
    const { error } = await supabase.from('lojas').update({ taxa_comissao: novaTaxa }).eq('id', id);
    if (!error) mostrarToast('Índice de cobrança atualizado!', 'sucesso');
  };

  const toggleStatusLoja = async (id: string, statusAtual: boolean) => {
    const novoStatus = !statusAtual;
    await supabase.from('lojas').update({ ativo: novoStatus }).eq('id', id);
    carregarDadosGerais(); 
  };

  const resetarSenha = async (id: string) => {
    const { error } = await supabase.from('lojas').update({ senha: '1234' }).eq('id', id);
    if (!error) { mostrarToast(`Senha resetada para 1234 com sucesso!`, 'sucesso'); carregarDadosGerais(); }
  };

  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const toggleExpandir = (id: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setLojaExpandida(lojaExpandida === id ? null : id); };
  const lojasFiltradas = lojas.filter(l => (l.nome || '').toLowerCase().includes(busca.toLowerCase()) || (l.cnpj || '').includes(busca));

  const receitaTotalMes = lojas.reduce((acc, loja) => {
    const fatTotal = faturamentos[loja.id] || 0;
    const taxa = Number(taxasEditaveis[loja.id]?.replace(',', '.') || 0);
    return acc + (fatTotal * (taxa / 100));
  }, 0);

  if (!autenticado) {
    return (
      <View style={styles.containerCenter}>
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444' }]}>
          <Text style={{ fontSize: 24, marginRight: 12 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text><Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
        <Text style={styles.logo}>⚡ AMP ADMIN</Text>
        <Text style={styles.subtitle}>Controle Geral do Ecossistema</Text>
        <TextInput style={styles.input} placeholder="Senha Mestra" placeholderTextColor="#64748b" secureTextEntry value={senhaMestra} onChangeText={setSenhaMestra} onSubmitEditing={logarAdmin} onKeyPress={(e) => { if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') logarAdmin(); }} />
        <TouchableOpacity style={styles.button} onPress={logarAdmin}><Text style={styles.buttonText}>ACESSAR CENTRAL</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      {/* 🔥 MODAL DE CRIAR / EDITAR LOJA SOBREPOSTO */}
      {modalLoja && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalLoja.id ? '✏️ Editar Loja' : '✨ Criar Nova Loja'}</Text>
            
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="CNPJ (Somente números)" placeholderTextColor="#64748b" value={modalLoja.cnpj} onChangeText={(t) => setModalLoja({...modalLoja, cnpj: t})} keyboardType="numeric" maxLength={18} />
              <TouchableOpacity style={{ backgroundColor: '#1e293b', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#334155' }} onPress={consultarCNPJ} disabled={loadingCnpj}>
                <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{loadingCnpj ? '...' : '🔍 BUSCAR'}</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="Nome Fantasia / Razão Social" placeholderTextColor="#64748b" value={modalLoja.nome} onChangeText={(t) => setModalLoja({...modalLoja, nome: t})} />
            
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              <View style={{ flex: 2 }}>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>TELEFONE</Text>
                <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="Telefone Comercial" placeholderTextColor="#64748b" value={modalLoja.telefone} onChangeText={(t) => setModalLoja({...modalLoja, telefone: t})} keyboardType="phone-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#facc15', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>LIMITE USERS</Text>
                <TextInput style={[styles.input, { marginBottom: 0, borderColor: '#facc15' }]} placeholder="Ex: 2" placeholderTextColor="#64748b" value={modalLoja.limite_usuarios} onChangeText={(t) => setModalLoja({...modalLoja, limite_usuarios: t})} keyboardType="numeric" />
              </View>
            </View>

            <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#10b981' }]} onPress={salvarLojaAdmin}>
                <Text style={[styles.buttonText, { color: '#fff' }]}>SALVAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' }]} onPress={() => setModalLoja(null)}>
                <Text style={[styles.buttonText, { color: '#ef4444' }]}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }], backgroundColor: toast.tipo === 'sucesso' ? '#10b981' : '#ef4444' }]}>
          <Text style={{ fontSize: 24, marginRight: 12 }}>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</Text><Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>

        <View style={styles.header}>
          <Text style={styles.logo}>⚡ AMP ADMIN</Text>
          <TouchableOpacity onPress={() => setAutenticado(false)}><Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Sair</Text></TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Lojas na Base</Text>
            <Text style={styles.statValue}>{lojas.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Lojas Ativas</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{lojas.filter(l => l.ativo !== false).length}</Text>
          </View>
        </View>

        <View style={[styles.statCard, { marginBottom: 20, backgroundColor: '#020617', borderColor: '#facc15' }]}>
          <Text style={[styles.statLabel, { color: '#facc15' }]}>💰 Total a Receber em {nomesMeses[mesFiltro - 1]}</Text>
          <Text style={[styles.statValue, { color: '#facc15', fontSize: 40 }]}>{formatarMoeda(receitaTotalMes)}</Text>
        </View>

        <View style={styles.filtroMesContainer}>
          <TouchableOpacity style={styles.btnMes} onPress={() => mudarMes(-1)}><Text style={styles.btnMesText}>◀ Anterior</Text></TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Faturamento de</Text>
            <Text style={{ color: '#38bdf8', fontSize: 18, fontWeight: '900' }}>{nomesMeses[mesFiltro - 1]} / {anoFiltro}</Text>
          </View>
          <TouchableOpacity style={styles.btnMes} onPress={() => mudarMes(1)}><Text style={styles.btnMesText}>Próximo ▶</Text></TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TextInput style={[styles.inputBusca, { flex: 1, marginBottom: 0 }]} placeholder="🔍 Buscar loja..." placeholderTextColor="#64748b" value={busca} onChangeText={setBusca} />
          {/* 🔥 BOTÃO DE NOVA LOJA */}
          <TouchableOpacity style={[styles.button, { paddingHorizontal: 20 }]} onPress={() => setModalLoja({ visivel: true, id: null, nome: '', cnpj: '', telefone: '', limite_usuarios: '1' })}>
            <Text style={styles.buttonText}>+ LOJA</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>🏢 Gerenciamento de Lojas</Text>

        {loading && <Text style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 20 }}>Calculando faturamentos...</Text>}

        {lojasFiltradas.map(loja => {
          const fatTotal = faturamentos[loja.id] || 0;
          const taxa = Number(taxasEditaveis[loja.id]?.replace(',', '.') || 0);
          const valorACobrar = fatTotal * (taxa / 100);
          const isExpanded = lojaExpandida === loja.id;

          return (
            <View key={loja.id} style={[styles.cardLoja, loja.ativo === false && { opacity: 0.7, borderColor: '#ef4444' }]}>
              <TouchableOpacity onPress={() => toggleExpandir(loja.id)} style={styles.cardTop} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lojaNome}>{loja.nome || 'Sem Nome'}</Text>
                  <Text style={styles.lojaCnpj}>CNPJ: {loja.cnpj || 'Não informado'} {loja.telefone ? `• 📞 ${loja.telefone}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: loja.ativo === false ? '#ef4444' : '#10b981' }} />
                    <Text style={{ color: loja.ativo === false ? '#ef4444' : '#10b981', fontWeight: 'bold', fontSize: 10 }}>{loja.ativo === false ? 'BLOQUEADA' : 'ATIVA'}</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 10 }}>•</Text>
                    <Text style={{ color: '#facc15', fontWeight: 'bold', fontSize: 10 }}>{loja.limite_usuarios || 1} USERS</Text>
                  </View>
                  <Text style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: 12 }}>{isExpanded ? 'FECHAR 🔼' : 'GERENCIAR 🔽'}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={{ paddingTop: 15, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 'bold' }}>Acesso à Plataforma:</Text>
                    <Switch value={loja.ativo !== false} onValueChange={() => toggleStatusLoja(loja.id, loja.ativo !== false)} />
                  </View>

                  <View style={styles.blocoFinanceiro}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.finLabel}>Total Transacionado</Text>
                      <Text style={styles.finValue}>{formatarMoeda(fatTotal)}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={styles.finLabel}>Seu Índice (%)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <TextInput style={styles.inputTaxa} value={taxasEditaveis[loja.id]} onChangeText={(t) => setTaxasEditaveis({ ...taxasEditaveis, [loja.id]: t })} keyboardType="numeric" />
                        <TouchableOpacity style={styles.btnSalvarTaxa} onPress={() => salvarTaxa(loja.id)}><Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>SALVAR</Text></TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={[styles.finLabel, { color: '#facc15' }]}>Valor a Cobrar</Text>
                      <Text style={[styles.finValue, { color: '#facc15' }]}>{formatarMoeda(valorACobrar)}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity style={styles.btnReset} onPress={() => resetarSenha(loja.id)}>
                      <Text style={styles.btnResetText}>🔑 Resetar Senha (1234)</Text>
                    </TouchableOpacity>
                    
                    {/* 🔥 BOTÃO PARA ABRIR A EDIÇÃO DA LOJA (CNPJ E TELEFONE) */}
                    <TouchableOpacity onPress={() => abrirEdicao(loja)}>
                      <Text style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: 12 }}>✏️ EDITAR DADOS</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', zIndex: 9999, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#0f172a', width: '100%', maxWidth: 500, padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  toastContainer: { position: 'absolute', top: Platform.OS === 'web' ? 20 : 50, left: 20, right: 20, zIndex: 9999, padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 15, flex: 1, lineHeight: 22 },
  containerCenter: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', padding: 30 },
  container: { flex: 1, backgroundColor: '#020617', padding: 20 },
  logo: { color: '#38bdf8', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#94a3b8', marginBottom: 30, fontSize: 14 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#1e293b' },
  inputBusca: { backgroundColor: '#0f172a', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 15 },
  button: { backgroundColor: '#38bdf8', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#0f172a', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' },
  statLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  statValue: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 5 },
  filtroMesContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 },
  btnMes: { padding: 10, backgroundColor: '#1e293b', borderRadius: 8 },
  btnMesText: { color: '#cbd5e1', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  cardLoja: { backgroundColor: '#0f172a', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 15 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lojaNome: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  lojaCnpj: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  blocoFinanceiro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#020617', padding: 15, borderRadius: 12, marginBottom: 15 },
  finLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  finValue: { color: '#10b981', fontSize: 18, fontWeight: '900', marginTop: 2 },
  inputTaxa: { backgroundColor: '#1e293b', color: '#fff', width: 50, height: 30, borderRadius: 6, textAlign: 'center', fontSize: 14, fontWeight: 'bold', borderWidth: 1, borderColor: '#334155' },
  btnSalvarTaxa: { backgroundColor: '#38bdf8', paddingHorizontal: 8, height: 30, justifyContent: 'center', borderRadius: 6, marginLeft: 5 },
  btnReset: { backgroundColor: 'transparent', alignSelf: 'flex-start', paddingVertical: 5 },
  btnResetText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
});
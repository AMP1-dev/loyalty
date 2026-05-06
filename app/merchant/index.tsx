import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, Vibration, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Polyline } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { downloadQRMesa, generateQRMesa } from '../utils/generateQRMesa';
import { QR_SIZES } from '../utils/qrConfig';

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
    let strUTC = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
    strUTC = strUTC.replace(' ', 'T');
    return new Date(strUTC);
  };

  const columns = getColumns();
  const itemWidth = `${100 / columns - 2}%`;
  const params = useLocalSearchParams();
  const channelRef = useRef<any>(null);
  const channelResgateRef = useRef<any>(null);
  const qrRef = useRef<any>(null);
  const qrDownloadRef = useRef<any>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const manualInputRef = useRef<View>(null);

  const [lojaId, setLojaId] = useState<string>('');
  const APP_VERSION = '5.5.0-qr-mesa';
  const [fila, setFila] = useState<any[]>([]);
  const [clienteFocadoId, setClienteFocadoId] = useState<string | null>(null);

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
    const getStoredId = () => {
      try { return localStorage.getItem('@loja_id_merchant'); } catch (e) { return null; }
    };

    const urlId = typeof params.loja_id === 'string' ? params.loja_id : Array.isArray(params.loja_id) ? params.loja_id[0] : '';
    const storedId = getStoredId() || '';
    const id = urlId || storedId;
    
    if (id && id.trim().length > 5) {
      const cleanId = id.trim();
      setLojaId(cleanId);
      try { localStorage.setItem('@loja_id_merchant', cleanId); } catch (e) {}
    } else {
      router.replace('/login');
    }
  }, [params]);

  const [valorVenda, setValorVenda] = useState<any>({});
  const [telefoneManual, setTelefoneManual] = useState('');
  const [valorManual, setValorManual] = useState('');

  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false);
  const [mostrarCRM, setMostrarCRM] = useState(false);
  const [mostrarRoleta, setMostrarRoleta] = useState(false);

  const [editandoRewardId, setEditandoRewardId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [formError, setFormError] = useState<string>('');
  const [rewards, setRewards] = useState<any[]>([]);
  const [cashbacks, setCashbacks] = useState<any>({});

  const [bonusPendentes, setBonusPendentes] = useState<any>({});
  const [usarBonus, setUsarBonus] = useState<any>({});
  const [brindesPendentes, setBrindesPendentes] = useState<any>({});

  const [modalCRM, setModalCRM] = useState<any>(null);
  const [loadingSalvar, setLoadingSalvar] = useState(false);

  // 🔥 ESTADOS DA ROLETA
  const [premiosRoleta, setPremiosRoleta] = useState<any[]>([]);
  const [editandoRoletaId, setEditandoRoletaId] = useState<string | null>(null);
  const [formRoleta, setFormRoleta] = useState<any>({});
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [mostrarAvaliacoesModal, setMostrarAvaliacoesModal] = useState(false);
  const [mediaEstrelas, setMediaEstrelas] = useState(0);

  const [config, setConfig] = useState<any>({
    nome_loja: '', cor_primaria: '#10b981', cashback_percent: '0', cashback_expiracao_dias: '30',
    cashback_limite_uso_percent: '100', reais_por_ponto: '1', pontos_expiracao_dias: '365',
    limite_resgates_diario_cliente: '', tempo_bloqueio_minutos: '',
    telefone: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
    pontos_sobre_valor_bruto: true, usar_cashback_total: false, senha: '', bonus_retorno_pontos: '50', bonus_retorno_validade_dias: '3',
    roleta_ativa: false, roleta_intervalo_dias: '1', link_google_review: '', qr_mesa_ativo: false, brinde_mesa: ''
  });

  interface DashboardStats {
    totalMes: number;
    totalDia: number;
    vendasCount: number;
    vendasCountTotal: number;
    ticketMedio: number;
    totalClientesDia: number;
    resgatesHojeLista: any[];
    resgatesMesLista: any[];
    resgatesAgrupados: any[];
    pontosResgatadosHoje: number;
    ultimosResgates: any[];
    vendasDiaFormatada: any[];
    resgatesSumarizados: any[];
    resgatesListados: any[];
  }

  const [stats, setStats] = useState<DashboardStats>({
    totalMes: 0, totalDia: 0, vendasCount: 0, ticketMedio: 0, resgatesHojeLista: [], resgatesMesLista: [], resgatesAgrupados: [], pontosResgatadosHoje: 0, ultimosResgates: [], vendasDiaFormatada: [], resgatesSumarizados: [], resgatesListados: [], totalClientesDia: 0, vendasCountTotal: 0
  });

  const [historicoCRM, setHistoricoCRM] = useState<any[]>([]);
  const [clientesAtrasados, setClientesAtrasados] = useState(0);
  const [npsChart, setNpsChart] = useState<{ dias: any[], max: number }>({ dias: [], max: 1 });
  
  // 🔥 ESTADOS DE EQUIPE / OPERADORES
  const [operadorLogado, setOperadorLogado] = useState('Master');
  const [lojaLimiteUsers, setLojaLimiteUsers] = useState(1);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [mostrarEquipeModal, setMostrarEquipeModal] = useState(false);
  const [formOperador, setFormOperador] = useState({ username: '', senha: '', nome: '' });

  const buscarFila = async () => {
    if (!lojaId) return;

    // Carrega dados da Mesa
    carregarConfigQrMesa(lojaId);
    carregarPremiosMesa(lojaId);
    carregarParticipacoesMesa(lojaId);

    const { data } = await supabase.from('checkins').select('*').eq('loja_id', lojaId).order('created_at', { ascending: true });
    setFila((data || []).filter(c => c.status === 'ativo' || c.status === 'aguardando'));
  };

  // --- QR MESA STATES ---
  const [mostrarMesa, setMostrarMesa] = useState(false);
  const [qrMesaAtivo, setQrMesaAtivo] = useState(false);
  const [perguntaNpsMesa, setPerguntaNpsMesa] = useState('Como foi sua experiência?');
  const [linkGoogleMeuNegocio, setLinkGoogleMeuNegocio] = useState('');
  const [bonusMultiplicador, setBonusMultiplicador] = useState(2.0);
  const [tamanhoQrMesa, setTamanhoQrMesa] = useState<keyof typeof QR_SIZES>('MEDIO');

  // --- GERENCIAMENTO PRÊMIOS MESA ---
  const [premiosMesa, setPremiosMesa] = useState<any[]>([]);
  const [novoPremiomesa, setNovoPremiomesa] = useState({ nome: '', tipo: 'desconto', valor: 0, probabilidade: 10 });
  const [editandoPremiomesa, setEditandoPremiomesa] = useState<string | null>(null);

  // --- DASHBOARD MESA ---
  const [participacoesMesa, setParticipacoesMesa] = useState<any[]>([]);
  const [statsMesa, setStatsMesa] = useState({ total: 0, notas5: 0, googleValidadas: 0 });

  // --- CONTATOS MESA ---
  const [contatosMesa, setContatosMesa] = useState<any[]>([]);
  const [contatosFiltrados, setContatosFiltrados] = useState<any[]>([]);

  // --- TEMPLATES WHATSAPP ---
  const [templatesWA, setTemplatesWA] = useState<any[]>([]);
  const [templateSelecionado, setTemplateSelecionado] = useState<string>('');
  const [mensagemCustomizada, setMensagemCustomizada] = useState('');

  // --- FILTROS ---
  const [filtroStatus, setFiltroStatus] = useState(''); // nao_contatado, contatado, respondeu, converteu
  const [filtroNps, setFiltroNps] = useState(0); // 0 = todos, 1-5 = específica
  const [filtroData, setFiltroData] = useState(''); // ultimos-7d, ultimos-30d, todos
  const [buscarTelefone, setBuscarTelefone] = useState('');

  // --- SELEÇÃO EM MASSA ---
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [selecionarTodos, setSelecionarTodos] = useState(false);

  // --- STATS ---
  const [statsRemarketig, setStatsRemarketig] = useState({
    total: 0,
    naoContatados: 0,
    contatados: 0,
    responderam: 0,
    converteram: 0,
    notas5: 0,
  });

  const [mostrarRemarketing, setMostrarRemarketing] = useState(false);

  // Carrega configuração QR Mesa
  const carregarConfigQrMesa = async (lojaId: string) => {
    try {
      const { data } = await supabase
        .from('configuracoes_loja')
        .select('qr_mesa_ativo, pergunta_nps_mesa, link_google_meu_negocio, bonus_5_estrelas_multiplicador')
        .eq('loja_id', lojaId)
        .single();

      if (data) {
        setQrMesaAtivo(data.qr_mesa_ativo || false);
        setPerguntaNpsMesa(data.pergunta_nps_mesa || 'Como foi sua experiência?');
        setLinkGoogleMeuNegocio(data.link_google_meu_negocio || '');
        setBonusMultiplicador(data.bonus_5_estrelas_multiplicador || 2.0);
      }
    } catch (error) {
      console.error('Erro ao carregar config QR Mesa:', error);
    }
  };

  // Salva configuração QR Mesa
  const salvarConfigQrMesa = async (lojaId: string) => {
    try {
      await supabase
        .from('configuracoes_loja')
        .update({
          qr_mesa_ativo: qrMesaAtivo,
          pergunta_nps_mesa: perguntaNpsMesa,
          link_google_meu_negocio: linkGoogleMeuNegocio,
          bonus_5_estrelas_multiplicador: bonusMultiplicador,
        })
        .eq('loja_id', lojaId);

      mostrarToast('✅ Configurações da Mesa salvas!', 'sucesso');
    } catch (error) {
      console.error('Erro ao salvar config:', error);
      mostrarToast('❌ Erro ao salvar', 'erro');
    }
  };

  // Carrega prêmios da mesa
  const carregarPremiosMesa = async (lojaId: string) => {
    try {
      const { data } = await supabase
        .from('roleta_premios_mesa')
        .select('*')
        .eq('loja_id', lojaId)
        .order('created_at', { ascending: false });

      setPremiosMesa(data || []);
    } catch (error) {
      console.error('Erro ao carregar prêmios mesa:', error);
    }
  };

  // Adiciona prêmio mesa
  const adicionarPremiomesa = async (lojaId: string) => {
    if (!novoPremiomesa.nome || novoPremiomesa.valor <= 0) {
      alert('Preencha todos os campos corretamente');
      return;
    }

    try {
      await supabase.from('roleta_premios_mesa').insert({
        loja_id: lojaId,
        nome: novoPremiomesa.nome,
        tipo: novoPremiomesa.tipo,
        valor: novoPremiomesa.valor,
        probabilidade: novoPremiomesa.probabilidade,
        ativo: true,
      });

      setNovoPremiomesa({ nome: '', tipo: 'desconto', valor: 0, probabilidade: 10 });
      carregarPremiosMesa(lojaId);
      mostrarToast('✅ Prêmio adicionado!', 'sucesso');
    } catch (error) {
      console.error('Erro ao adicionar prêmio:', error);
      mostrarToast('❌ Erro ao adicionar', 'erro');
    }
  };

  // Deleta prêmio mesa
  const deletarPremiomesa = async (premioId: string, lojaId: string) => {
    if (!window.confirm('Tem certeza? Isso não pode ser desfeito.')) return;

    try {
      await supabase.from('roleta_premios_mesa').delete().eq('id', premioId);
      carregarPremiosMesa(lojaId);
      mostrarToast('✅ Prêmio removido!', 'sucesso');
    } catch (error) {
      console.error('Erro:', error);
      mostrarToast('❌ Erro', 'erro');
    }
  };

  // Carrega participacoes da mesa
  const carregarParticipacoesMesa = async (lojaId: string) => {
    try {
      const { data } = await supabase
        .from('roleta_mesa_participacoes')
        .select('*')
        .eq('loja_id', lojaId)
        .order('created_at', { ascending: false })
        .limit(100);

      setParticipacoesMesa(data || []);

      if (data) {
        const total = data.length;
        const notas5 = data.filter((p: any) => p.nota_nps === 5).length;
        const googleValidadas = data.filter((p: any) => p.google_avaliacao_feita).length;
        setStatsMesa({ total, notas5, googleValidadas });
      }
    } catch (error) {
      console.error('Erro ao carregar participações:', error);
    }
  };

  useEffect(() => {
    if (mostrarRemarketing && lojaId) {
      carregarContatosMesa(lojaId);
      carregarTemplatesWA(lojaId);
    }
  }, [mostrarRemarketing, lojaId]);

  // Carrega contatos da mesa
  const carregarContatosMesa = async (lojaId: string) => {
    try {
      const { data } = await supabase
        .from('contatos_mesa_remarketing')
        .select('*')
        .eq('loja_id', lojaId)
        .order('data_participacao', { ascending: false });

      setContatosMesa(data || []);
      aplicarFiltros(data || []);

      // Calcula stats
      if (data) {
        const total = data.length;
        const naoContatados = data.filter((c) => c.status === 'nao_contatado').length;
        const contatados = data.filter((c) => c.status === 'contatado').length;
        const responderam = data.filter((c) => c.status === 'respondeu').length;
        const converteram = data.filter((c) => c.status === 'converteu').length;
        const notas5 = data.filter((c) => c.nota_nps === 5).length;

        setStatsRemarketig({
          total,
          naoContatados,
          contatados,
          responderam,
          converteram,
          notas5,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar contatos mesa:', error);
    }
  };

  // Carrega templates WhatsApp
  const carregarTemplatesWA = async (lojaId: string) => {
    try {
      const { data } = await supabase
        .from('templates_whatsapp')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      setTemplatesWA(data || []);

      // Seleciona primeiro template por padrão
      if (data && data.length > 0) {
        setTemplateSelecionado(data[0].id);
        setMensagemCustomizada(data[0].mensagem);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  // Aplica filtros aos contatos
  const aplicarFiltros = (contatos: any[]) => {
    let filtrados = contatos;

    // Filtro por status
    if (filtroStatus) {
      filtrados = filtrados.filter((c) => c.status === filtroStatus);
    }

    // Filtro por NPS
    if (filtroNps > 0) {
      filtrados = filtrados.filter((c) => c.nota_nps === filtroNps);
    }

    // Filtro por data
    if (filtroData) {
      const hoje = new Date();
      let dataLimite = new Date();

      if (filtroData === 'ultimos-7d') {
        dataLimite.setDate(hoje.getDate() - 7);
      } else if (filtroData === 'ultimos-30d') {
        dataLimite.setDate(hoje.getDate() - 30);
      }

      filtrados = filtrados.filter((c) => {
        const dataParticipacao = new Date(c.data_participacao);
        return dataParticipacao >= dataLimite;
      });
    }

    // Busca por telefone
    if (buscarTelefone) {
      const search = buscarTelefone.replace(/\D/g, '');
      filtrados = filtrados.filter((c) =>
        c.cliente_cpf.replace(/\D/g, '').includes(search)
      );
    }

    setContatosFiltrados(filtrados);
  };

  // Atualiza filtros e reaplica
  useEffect(() => {
    aplicarFiltros(contatosMesa);
  }, [filtroStatus, filtroNps, filtroData, buscarTelefone]);

  // Seleciona/deseleciona contato
  const toggleSelecionado = (contatoId: string) => {
    setSelecionados((prev) =>
      prev.includes(contatoId)
        ? prev.filter((id) => id !== contatoId)
        : [...prev, contatoId]
    );
  };

  // Seleciona todos os filtrados
  const toggleSelecionarTodos = () => {
    if (selecionarTodos) {
      setSelecionados([]);
      setSelecionarTodos(false);
    } else {
      setSelecionados(contatosFiltrados.map((c) => c.id));
      setSelecionarTodos(true);
    }
  };

  // Formata telefone para WhatsApp
  const formatarParaWhatsApp = (telefone: string): string => {
    const clean = telefone.replace(/\D/g, '');
    return `55${clean}`;
  };

  // Envia mensagem via WhatsApp
  const enviarWhatsApp = async (contato: any, template: any, lojaId: string) => {
    try {
      // Substitui variáveis no template
      let mensagem = template.mensagem;
      mensagem = mensagem.replace('{{PREMIO}}', contato.premio_ganho || 'prêmio');
      mensagem = mensagem.replace('{{LINK_GOOGLE}}', linkGoogleMeuNegocio || 'https://g.page/seu-negocio');
      mensagem = mensagem.replace('{{DATA_EXPIRACAO}}', '15 dias');
      mensagem = mensagem.replace('{{DIAS_RESTANTES}}', '10 dias');
      mensagem = mensagem.replace('{{PERCENTUAL}}', '30');
      mensagem = mensagem.replace('{{ENDERECO}}', config?.endereco || 'Rua Principal, 123');
      mensagem = mensagem.replace('{{HORARIO}}', '11h às 22h');
      mensagem = mensagem.replace('{{NOME_BRINDE}}', contato.premio_ganho || 'brinde');

      const telefoneWA = formatarParaWhatsApp(contato.cliente_cpf);
      const url = `https://wa.me/${telefoneWA}?text=${encodeURIComponent(mensagem)}`;

      // Abre WhatsApp Web em nova aba
      window.open(url, '_blank', 'width=800,height=600');

      // Registra no histórico
      await supabase.from('historico_whatsapp').insert({
        contato_id: contato.id,
        loja_id: lojaId,
        telefone: contato.cliente_cpf,
        mensagem: mensagem,
        template_id: template.id,
        tipo_envio: 'manual',
        status: 'pendente',
        enviado_em: new Date().toISOString(),
        criado_por: operadorLogado || 'desconhecido',
      });

      // Marca contato como contatado
      await supabase
        .from('contatos_mesa_remarketing')
        .update({
          status: 'contatado',
          data_primeiro_contato: contato.data_primeiro_contato || new Date().toISOString(),
          data_ultimo_contato: new Date().toISOString(),
          total_mensagens: (contato.total_mensagens || 0) + 1,
        })
        .eq('id', contato.id);

      // Recarrega contatos
      carregarContatosMesa(lojaId);

      mostrarToast('✅ Mensagem enviada! Confirme no WhatsApp.', 'sucesso');
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      mostrarToast('❌ Erro ao abrir WhatsApp', 'erro');
    }
  };

  // Envia para múltiplos selecionados
  const enviarParaSelecionados = async (lojaId: string) => {
    if (selecionados.length === 0) {
      alert('Selecione pelo menos um contato');
      return;
    }

    if (!templateSelecionado) {
      alert('Selecione um template');
      return;
    }

    const template = templatesWA.find((t) => t.id === templateSelecionado);
    if (!template) return;

    // Abre cada contato em uma aba do WhatsApp
    for (const contatoId of selecionados) {
      const contato = contatosMesa.find((c) => c.id === contatoId);
      if (contato) {
        setTimeout(() => {
          enviarWhatsApp(contato, template, lojaId);
        }, 500);
      }
    }

    setSelecionados([]);
    setSelecionarTodos(false);
  };

  // Marca contato como respondeu
  const marcarComoRespondeu = async (contatoId: string, lojaId: string) => {
    try {
      await supabase
        .from('contatos_mesa_remarketing')
        .update({ status: 'respondeu' })
        .eq('id', contatoId);

      carregarContatosMesa(lojaId);
      mostrarToast('✅ Marcado como respondeu!', 'sucesso');
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  // Marca contato como converteu
  const marcarComoConverteu = async (contatoId: string, lojaId: string) => {
    try {
      await supabase
        .from('contatos_mesa_remarketing')
        .update({ status: 'converteu' })
        .eq('id', contatoId);

      carregarContatosMesa(lojaId);
      mostrarToast('✅ Marcado como converteu! 🎉', 'sucesso');
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  // Adiciona tag a contato
  const adicionarTag = async (contatoId: string, novaTag: string, lojaId: string) => {
    try {
      const contato = contatosMesa.find((c) => c.id === contatoId);
      if (!contato) return;

      const tags = contato.tags || [];
      if (!tags.includes(novaTag)) {
        tags.push(novaTag);
      }

      await supabase
        .from('contatos_mesa_remarketing')
        .update({ tags })
        .eq('id', contatoId);

      carregarContatosMesa(lojaId);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  // Deleta contato
  const deletarContato = async (contatoId: string, lojaId: string) => {
    if (!window.confirm('Tem certeza? Isso não pode ser desfeito.')) return;

    try {
      await supabase.from('contatos_mesa_remarketing').delete().eq('id', contatoId);
      carregarContatosMesa(lojaId);
      mostrarToast('✅ Contato removido!', 'sucesso');
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const exportarTelefonesCSV = (lojaId: string) => {
    if (participacoesMesa.length === 0) {
      alert('Nenhuma participação para exportar');
      return;
    }

    const csv = [
      ['Telefone', 'Data', 'Prêmio', 'Nota NPS', 'Status'].join(','),
      ...participacoesMesa.map((p) =>
        [
          p.cliente_cpf,
          new Date(p.created_at).toLocaleDateString('pt-BR'),
          p.premio_nome,
          p.nota_nps,
          p.premio_resgatado ? 'Resgatado' : 'Pendente',
        ].join(',')
      ),
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mesa-Participacoes-${lojaId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const fazerDownloadQrMesa = async (lojaId: string, nomeLoja: string) => {
    try {
      await downloadQRMesa(lojaId, tamanhoQrMesa, nomeLoja);
      mostrarToast('✅ QR Code baixado!', 'sucesso');
    } catch (error) {
      console.error('Erro:', error);
      mostrarToast('❌ Erro ao baixar', 'erro');
    }
  };

  const buscarFinanceiroDetalhado = async (cpf: string, idFila?: string) => {
    if (!lojaId || !cpf) return;
    const { data: cb } = await supabase.from('cashbacks').select('valor, created_at').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('usado', false).order('created_at', { ascending: true });
    const lista = cb || [];
    const { data: trans } = await supabase.from('transacoes').select('pontos_gerados').eq('cliente_cpf', cpf).eq('loja_id', lojaId);
    const { data: resg } = await supabase.from('resgates').select('pontos_usados').eq('cliente_cpf', cpf).eq('loja_id', lojaId);
    
    const totalLocal = (trans || []).reduce((s, t) => s + (t.pontos_gerados || 0), 0);
    const usadosLocal = (resg || []).reduce((s, r) => s + (r.pontos_usados || 0), 0);
    const saldoFinal = totalLocal - usadosLocal;

    setCashbacks((prev: any) => ({ 
      ...prev, 
      [cpf]: { 
        total: lista.reduce((s, c) => s + Number(c.valor), 0), 
        proximo: lista.length ? Number(lista[0].valor) : 0,
        pontos: saldoFinal
      } 
    }));

    const hojeIso = new Date().toISOString();
    const { data: bn } = await supabase.from('bonus_pendentes').select('*').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('usado', false).gte('data_expiracao', hojeIso).order('created_at', { ascending: true }).limit(1);

    if (bn && bn.length > 0) {
      setBonusPendentes((prev: any) => ({ ...prev, [cpf]: bn[0].pontos }));
      if (idFila) setUsarBonus((prev: any) => ({ ...prev, [idFila]: true }));
    } else {
      setBonusPendentes((prev: any) => { const novo = { ...prev }; delete novo[cpf]; return novo; });
      if (idFila) setUsarBonus((prev: any) => ({ ...prev, [idFila]: false }));
    }

    const { data: br } = await supabase.from('brindes_pendentes').select('*').eq('cliente_cpf', cpf).eq('loja_id', lojaId).eq('resgatado', false);
    setBrindesPendentes((prev: any) => ({ ...prev, [cpf]: br || [] }));
  };

  const eHoje = (dataString: string) => {
    if (!dataString) return false;
    const d = parseDataSupabase(dataString);
    const hoje = new Date();
    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
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

      // 🔥 CORREÇÃO: Usar parseDataSupabase para garantir que as datas sejam lidas corretamente
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
        if (!ultimoPorCliente.has(v.cliente_cpf)) ultimoPorCliente.set(v.cliente_cpf, v);
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

      setStats({
        totalMes, totalDia, vendasCount: vendasHoje.length, vendasCountTotal: vendas.length,
        ticketMedio, totalClientesDia: clientesUnicosHoje, resgatesHojeLista, resgatesMesLista,
        resgatesAgrupados: resgatesSumarizados, pontosResgatadosHoje, ultimosResgates, vendasDiaFormatada,
        resgatesSumarizados, resgatesListados
      });

    } catch (error) {
      console.log('ERRO buscarStats:', error);
    }
  };
  const buscarAvaliacoesERoleta = async () => {
    if (!lojaId) return;
    
    // Buscar da tabela 'respostas_nps'
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
    
    // Iniciar últimos 14 dias
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

    if (lojaData) {
      setLojaLimiteUsers(lojaData.limite_usuarios || 1);
    }

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
        roleta_intervalo_dias: data.roleta_intervalo_dias !== null && data.roleta_intervalo_dias !== undefined ? String(data.roleta_intervalo_dias) : '1'
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
    if (!formOperador.username || !formOperador.senha || !formOperador.nome) {
      mostrarToast('Preencha todos os campos do operador.', 'erro');
      return;
    }

    if (operadores.length >= lojaLimiteUsers) {
      mostrarToast(`Limite de ${lojaLimiteUsers} sub-conta(s) atingido.`, 'erro');
      return;
    }

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
    if (!error) {
      mostrarToast('Operador removido.', 'sucesso');
      carregarEquipe();
    }
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
    const loadAll = async () => {
      await carregarConfig();
      await buscarFila();
      await buscarStats();
      await buscarAvaliacoesERoleta();
      await buscarRewards();
      iniciarRealtime();
    };
    loadAll();

    // 🚀 SAFETY FALLBACK: Atualiza tudo a cada 30 segundos automaticamente
    const interval = setInterval(() => {
      buscarFila();
      buscarStats();
      buscarAvaliacoesERoleta();
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
      setTimeout(async () => { await supabase.from('checkins').delete().eq('id', id); }, 5000); 
      Vibration.vibrate(200);
      setFila(prev => prev.filter(f => f.id !== id));
      setValorVenda((prev: any) => { const n = { ...prev }; delete n[id]; return n; });
      setUsarBonus((prev: any) => { const n = { ...prev }; delete n[id]; return n; });
      mostrarToast('✅ Venda registrada com sucesso!', 'sucesso');
      setTimeout(() => { buscarStats(); }, 1000);
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
      Vibration.vibrate(200); setTelefoneManual(''); setValorManual(''); setUsarBonus((prev: any) => ({ ...prev, ['manual']: false })); buscarFila(); setMostrarManual(false);
      mostrarToast('✅ Venda Manual registrada!', 'sucesso'); setTimeout(() => { buscarStats(); }, 1000);
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
      // Usando o ref do QR Code oculto em alta resolução (1181px = 10x10cm a 300dpi)
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
      link_google_review: config.link_google_review || null
    }, { onConflict: 'loja_id' });

    if (config.senha && config.senha.trim() !== '') await supabase.from('lojas').update({ senha: config.senha }).eq('id', lojaId);
    setLoadingSalvar(false);
    if (error) { 
      console.error("Erro ao salvar config:", error);
      mostrarToast(`Erro ao salvar: ${error.message || 'Verifique os campos'}`, 'erro'); 
      return; 
    }
    mostrarToast('⚙️ Configurações salvas com sucesso!', 'sucesso');
    setTimeout(() => { setMostrarConfig(false); }, 1000);
  };

  const buscarRewards = async () => {
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

              {/* QR MESAS */}
              <View style={{ marginBottom: 30, marginTop: 20 }}>
                <View style={{
                  borderRadius: 16, padding: 20, borderWidth: 1,
                  borderColor: '#334155', backgroundColor: '#1e293b'
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#8B5CF6', marginBottom: 16 }}>
                    🎡 MÓDULO QR MESAS
                  </Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ color: '#F8FAFC', fontWeight: '600' }}>Ativar QR Mesa</Text>
                    <TouchableOpacity
                      onPress={() => setQrMesaAtivo(!qrMesaAtivo)}
                      style={{
                        width: 50, height: 28, borderRadius: 14,
                        backgroundColor: qrMesaAtivo ? '#10b981' : '#cbd5e1',
                        justifyContent: 'center',
                        alignItems: qrMesaAtivo ? 'flex-end' : 'flex-start',
                        paddingHorizontal: 2,
                      }}
                    >
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' }} />
                    </TouchableOpacity>
                  </View>

                  {qrMesaAtivo && (
                    <>
                      <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>
                        Pergunta da Pesquisa NPS:
                      </Text>
                      <TextInput
                        placeholder="Digite a pergunta..."
                        placeholderTextColor="#94A3B8"
                        value={perguntaNpsMesa}
                        onChangeText={setPerguntaNpsMesa}
                        multiline
                        style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#F8FAFC', marginBottom: 16, minHeight: 50 }}
                      />

                      <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>
                        Link Google Meu Negócio (4-5 Estrelas):
                      </Text>
                      <TextInput
                        placeholder="https://g.page/..."
                        placeholderTextColor="#94A3B8"
                        value={linkGoogleMeuNegocio}
                        onChangeText={setLinkGoogleMeuNegocio}
                        style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#F8FAFC', marginBottom: 16, fontFamily: 'monospace' }}
                      />

                      <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>
                        Multiplicador Dobro (ex: 2.0 = 2x):
                      </Text>
                      <TextInput
                        placeholder="2.0"
                        placeholderTextColor="#94A3B8"
                        value={bonusMultiplicador.toString()}
                        onChangeText={(text) => setBonusMultiplicador(parseFloat(text) || 1.0)}
                        keyboardType="decimal-pad"
                        style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#F8FAFC', marginBottom: 20 }}
                      />

                      <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>
                        Tamanho do QR:
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                        {Object.entries(QR_SIZES).map(([key, value]: any) => (
                          <TouchableOpacity
                            key={key}
                            onPress={() => setTamanhoQrMesa(key as any)}
                            style={{
                              flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2,
                              borderColor: tamanhoQrMesa === key ? '#8B5CF6' : '#334155',
                              backgroundColor: tamanhoQrMesa === key ? '#8B5CF620' : 'transparent',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 11, color: tamanhoQrMesa === key ? '#8B5CF6' : '#94A3B8', fontWeight: '600' }}>
                              {value.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={{ gap: 10 }}>
                        <TouchableOpacity
                          onPress={() => fazerDownloadQrMesa(lojaId || '', config?.nome_loja || 'loja')}
                          style={{ backgroundColor: '#8B5CF6', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700' }}>📥 BAIXAR QR MESA</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => salvarConfigQrMesa(lojaId || '')}
                          style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700' }}>💾 SALVAR CONFIGURAÇÕES</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </View>

              <Text style={[styles.label, { color: '#facc15', marginTop: 20 }]}>🔗 INTEGRAÇÕES E ACESSO:</Text>
              <View style={{ marginBottom: 10, width: '100%' }}>
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>LINK DO GOOGLE MEU NEGÓCIO (Para Avaliações 4 e 5 Estrelas)</Text>
                <TextInput value={config.link_google_review} onChangeText={(t) => setConfig({ ...config, link_google_review: t })} placeholder="https://g.page/r/..." placeholderTextColor="#475569" style={styles.input} />
              </View>
              <View style={{ marginBottom: 10, width: '100%' }}>
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>NOVA SENHA DO PAINEL (Deixe em branco para manter a atual)</Text>
                <TextInput value={config.senha} onChangeText={(t) => setConfig({ ...config, senha: t })} placeholder="Digite a nova senha..." placeholderTextColor="#475569" secureTextEntry style={styles.input} />
              </View>

              <TouchableOpacity 
                style={[styles.buttonCenter, { backgroundColor: '#10b981', marginTop: 30 }]} 
                onPress={() => { salvarConfig(); setMostrarConfig(false); }}>
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
              
              {/* Dashboard Stats */}
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#F8FAFC', marginBottom: 16 }}>
                  📊 Dashboard Mesa
                </Text>

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

                {/* Exportar CSV */}
                <TouchableOpacity
                  onPress={() => exportarTelefonesCSV(lojaId || '')}
                  style={{ backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 20 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>📥 EXPORTAR TELEFONES (CSV)</Text>
                </TouchableOpacity>

                {/* Lista de Participações */}
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#F8FAFC', marginBottom: 12 }}>
                  📱 Participações Capturadas
                </Text>

                {participacoesMesa.map((p) => (
                  <View key={p.id} style={{ backgroundColor: '#162032', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#334155' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#F8FAFC' }}>{formatarTelefone(p.cliente_cpf)}</Text>
                      <Text style={{ fontSize: 12, color: p.premio_resgatado ? '#10b981' : '#f59e0b', fontWeight: '600' }}>
                        {p.premio_resgatado ? '✅ Resgatado' : '⏳ Pendente'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>🎁 {p.premio_nome}</Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>⭐ Nota: {p.nota_nps}/5 • {new Date(p.created_at).toLocaleDateString('pt-BR')}</Text>
                  </View>
                ))}

                {/* CRUD Prêmios Mesa */}
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#F8FAFC', marginTop: 20, marginBottom: 12 }}>
                  🎁 Gerenciar Prêmios da Mesa
                </Text>

                <View style={{ backgroundColor: '#162032', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>Nome do Prêmio:</Text>
                  <TextInput
                    placeholder="Ex: +30% Desconto"
                    placeholderTextColor="#94A3B8"
                    value={novoPremiomesa.nome}
                    onChangeText={(text) => setNovoPremiomesa({ ...novoPremiomesa, nome: text })}
                    style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 10, color: '#F8FAFC', marginBottom: 10 }}
                  />

                  <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>Tipo:</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {['desconto', 'brinde', 'pontos'].map((tipo) => (
                      <TouchableOpacity
                        key={tipo}
                        onPress={() => setNovoPremiomesa({ ...novoPremiomesa, tipo })}
                        style={{
                          flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1,
                          borderColor: novoPremiomesa.tipo === tipo ? '#8B5CF6' : '#334155',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, color: novoPremiomesa.tipo === tipo ? '#8B5CF6' : '#94A3B8', fontWeight: '600' }}>
                          {tipo === 'desconto' ? '💰' : tipo === 'brinde' ? '🎁' : '✨'} {tipo}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 4 }}>Valor/Qtde:</Text>
                      <TextInput
                        placeholder="30"
                        placeholderTextColor="#94A3B8"
                        value={novoPremiomesa.valor.toString()}
                        onChangeText={(text) => setNovoPremiomesa({ ...novoPremiomesa, valor: parseFloat(text) || 0 })}
                        keyboardType="decimal-pad"
                        style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 6, padding: 8, color: '#F8FAFC' }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 4 }}>Probabilidade (%):</Text>
                      <TextInput
                        placeholder="10"
                        placeholderTextColor="#94A3B8"
                        value={novoPremiomesa.probabilidade.toString()}
                        onChangeText={(text) => setNovoPremiomesa({ ...novoPremiomesa, probabilidade: parseFloat(text) || 1 })}
                        keyboardType="number-pad"
                        style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 6, padding: 8, color: '#F8FAFC' }}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => adicionarPremiomesa(lojaId || '')}
                    style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 12 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>➕ ADICIONAR PRÊMIO</Text>
                  </TouchableOpacity>
                </View>

                {/* Lista de Prêmios Criados */}
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 10 }}>Prêmios Criados:</Text>
                {premiosMesa.map((premio) => (
                  <View key={premio.id} style={{ backgroundColor: '#162032', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}>
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC' }}>{premio.nome}</Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                        {premio.tipo === 'desconto' ? '💰' : premio.tipo === 'brinde' ? '🎁' : '✨'} {premio.valor} • Prob: {premio.probabilidade}%
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deletarPremiomesa(premio.id, lojaId || '')}>
                      <Text style={{ fontSize: 18 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
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
              
              {/* DASHBOARD STATS */}
              <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 }}>
                  📊 Estatísticas
                </Text>
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

              {/* AÇÕES EM MASSA */}
              {contatosFiltrados.length > 0 && (
                <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 }}>
                    📱 Envio em Massa
                  </Text>

                  {/* Selecionar template */}
                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>
                    Template:
                  </Text>
                  <View style={{ marginBottom: 12 }}>
                    {templatesWA.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => {
                          setTemplateSelecionado(t.id);
                          setMensagemCustomizada(t.mensagem);
                        }}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          marginBottom: 8,
                          borderWidth: 2,
                          borderColor: templateSelecionado === t.id ? '#8B5CF6' : '#334155',
                          backgroundColor: templateSelecionado === t.id ? '#8B5CF620' : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 11, color: templateSelecionado === t.id ? '#8B5CF6' : '#F8FAFC', fontWeight: '600' }}>
                          {t.emoji} {t.nome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Preview da mensagem */}
                  {templateSelecionado && (
                    <View style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }}>
                      <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>
                        Preview:
                      </Text>
                      <Text style={{ fontSize: 10, color: '#F8FAFC', lineHeight: 16 }}>
                        {mensagemCustomizada}
                      </Text>
                    </View>
                  )}

                  {/* Seleção de contatos */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={toggleSelecionarTodos}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: selecionarTodos ? '#3b82f6' : '#334155',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: selecionarTodos ? '#fff' : '#F8FAFC', fontWeight: '700' }}>
                        {selecionarTodos ? '✅ Todos Selecionados' : '☐ Selecionar Todos'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (selecionados.length > 0 && templateSelecionado) {
                          enviarParaSelecionados(lojaId || '');
                        } else {
                          alert('Selecione contatos e um template');
                        }
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: '#8B5CF6',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>
                        📱 Enviar ({selecionados.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* FILTROS */}
              <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 }}>
                  🔍 Filtros
                </Text>

                {/* Buscar por telefone */}
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>
                  Telefone:
                </Text>
                <TextInput
                  placeholder="Digite telefone..."
                  placeholderTextColor="#94A3B8"
                  value={buscarTelefone}
                  onChangeText={setBuscarTelefone}
                  style={{
                    borderWidth: 1,
                    borderColor: '#334155',
                    borderRadius: 8,
                    padding: 10,
                    color: '#F8FAFC',
                    marginBottom: 12,
                    fontSize: 12,
                  }}
                  keyboardType="phone-pad"
                />

                {/* Status */}
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>
                  Status:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {['', 'nao_contatado', 'contatado', 'respondeu', 'converteu'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setFiltroStatus(status)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor: filtroStatus === status ? '#8B5CF6' : '#334155',
                        borderWidth: 1,
                        borderColor: filtroStatus === status ? '#8B5CF6' : '#334155',
                      }}
                    >
                      <Text style={{ fontSize: 10, color: filtroStatus === status ? '#fff' : '#F8FAFC', fontWeight: '600' }}>
                        {status === '' ? 'Todos' : status === 'nao_contatado' ? '🔴 Não Contatado' : status === 'contatado' ? '✅ Contatado' : status === 'respondeu' ? '💬 Respondeu' : '🎉 Converteu'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* NPS */}
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>
                  Nota NPS:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3, 4, 5].map((nota) => (
                    <TouchableOpacity
                      key={nota}
                      onPress={() => setFiltroNps(nota)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor: filtroNps === nota ? '#8B5CF6' : '#334155',
                      }}
                    >
                      <Text style={{ fontSize: 10, color: filtroNps === nota ? '#fff' : '#F8FAFC', fontWeight: '600' }}>
                        {nota === 0 ? 'Todos' : `${nota}⭐`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Data */}
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6 }}>
                  Data:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {['', 'ultimos-7d', 'ultimos-30d'].map((data) => (
                    <TouchableOpacity
                      key={data}
                      onPress={() => setFiltroData(data)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor: filtroData === data ? '#8B5CF6' : '#334155',
                      }}
                    >
                      <Text style={{ fontSize: 10, color: filtroData === data ? '#fff' : '#F8FAFC', fontWeight: '600' }}>
                        {data === '' ? 'Todos' : data === 'ultimos-7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* BOTÃO EXPORTAR */}
              <TouchableOpacity
                onPress={() => exportarTelefonesCSV(lojaId)}
                style={{
                  backgroundColor: '#3b82f6',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                  📥 EXPORTAR CONTATOS (CSV)
                </Text>
              </TouchableOpacity>

              {/* LISTA DE CONTATOS */}
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#F8FAFC', marginBottom: 12 }}>
                👥 Contatos ({contatosFiltrados.length})
              </Text>

              {contatosFiltrados.length === 0 ? (
                <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '600' }}>
                    Nenhum contato encontrado
                  </Text>
                </View>
              ) : (
                contatosFiltrados.map((contato) => (
                  <View
                    key={contato.id}
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: selecionados.includes(contato.id) ? '#8B5CF6' : '#334155',
                      borderLeftWidth: 3,
                      borderLeftColor: contato.status === 'nao_contatado' ? '#f59e0b' : contato.status === 'contatado' ? '#10b981' : contato.status === 'respondeu' ? '#3b82f6' : '#8b5cf6',
                    }}
                  >
                    {/* Checkbox + Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <TouchableOpacity
                        onPress={() => toggleSelecionado(contato.id)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: selecionados.includes(contato.id) ? '#8B5CF6' : '#334155',
                          backgroundColor: selecionados.includes(contato.id) ? '#8B5CF6' : 'transparent',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 10,
                        }}
                      >
                        {selecionados.includes(contato.id) && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}
                      </TouchableOpacity>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC' }}>
                          {formatarTelefone(contato.cliente_cpf)}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                          {contato.premio_ganho || 'Sem prêmio'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#d97706' }}>
                          {contato.nota_nps}⭐
                        </Text>
                        <Text style={{ fontSize: 9, color: '#94A3B8' }}>
                          {contato.status === 'nao_contatado' ? '🔴' : contato.status === 'contatado' ? '✅' : contato.status === 'respondeu' ? '💬' : '🎉'}
                        </Text>
                      </View>
                    </View>

                    {/* Detalhes */}
                    <View style={{ marginBottom: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' }}>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>
                        📅 {new Date(contato.data_participacao).toLocaleDateString('pt-BR')}
                      </Text>
                      {contato.tags && contato.tags.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                          {contato.tags.map((tag: string, idx: number) => (
                            <View
                              key={idx}
                              style={{
                                backgroundColor: '#8B5CF620',
                                paddingVertical: 4,
                                paddingHorizontal: 8,
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{ fontSize: 9, color: '#8B5CF6', fontWeight: '600' }}>
                                {tag}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Ações */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          const template = templatesWA[0];
                          if (template) {
                            enviarWhatsApp(contato, template, lojaId || '');
                          } else {
                            alert('Nenhum template selecionado');
                          }
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 6,
                          backgroundColor: '#8B5CF6',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                          📱 WhatsApp
                        </Text>
                      </TouchableOpacity>

                      {contato.status === 'contatado' && (
                        <TouchableOpacity
                          onPress={() => marcarComoRespondeu(contato.id, lojaId || '')}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 6,
                            backgroundColor: '#3b82f6',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                            💬 Respondeu
                          </Text>
                        </TouchableOpacity>
                      )}

                      {contato.status === 'respondeu' && (
                        <TouchableOpacity
                          onPress={() => marcarComoConverteu(contato.id, lojaId || '')}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 6,
                            backgroundColor: '#10b981',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                            🎉 Converteu
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => deletarContato(contato.id, lojaId || '')}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 6,
                          backgroundColor: '#ef4444',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11 }}>🗑️</Text>
                      </TouchableOpacity>
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
              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#facc15' }]} onPress={() => confirmarCRM(true)}>
                <Text style={[styles.buttonText, { color: '#0f172a' }]}>🎁 SIM, ENVIAR BÔNUS</Text>
              </TouchableOpacity>
              <TouchableOpacity 
               style={[styles.button, { backgroundColor: '#334155', height: 50 }]} 
               onPress={() => {
                 setMostrarManual(!mostrarManual);
                 if (!mostrarManual) {
                   setTimeout(() => {
                     mainScrollRef.current?.scrollTo({ y: 800, animated: true });
                   }, 100);
                 }
               }}>
               <Text style={styles.buttonText}>⌨️ LANÇAMENTO MANUAL</Text>
             </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', marginTop: 15 }} onPress={() => setModalCRM(null)}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* MODAL DE AVALIAÇÕES (NPS) */}
      {mostrarAvaliacoesModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 800, width: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <Text style={[styles.title, { marginBottom: 0, color: '#facc15' }]}>⭐ Lista de Avaliações</Text>
               <TouchableOpacity onPress={() => setMostrarAvaliacoesModal(false)} style={{ padding: 5 }}>
                 <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
               </TouchableOpacity>
            </View>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 15 }}>As avaliações estão ordenadas das piores para as melhores.</Text>
            
            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={true}>
               {avaliacoes.length === 0 ? (
                 <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 20 }}>Nenhuma avaliação encontrada.</Text>
               ) : (
                 avaliacoes.map((av, idx) => {
                   let cor = '#10b981';
                   let icone = '😍';
                   if (av.nota <= 2) { cor = '#ef4444'; icone = '😡'; }
                   else if (av.nota === 3) { cor = '#facc15'; icone = '😐'; }

                   let labelResposta = av.respostaStr || av.nota.toString();
                   if (!isNaN(Number(labelResposta))) labelResposta = `${labelResposta} Estrelas`;
                   else labelResposta = labelResposta.toUpperCase();

                   return (
                     <View key={idx} style={{ backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#334155' }}>
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                         <View style={{ flex: 1 }}>
                            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Pergunta:</Text>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{av.perguntaTexto}</Text>
                         </View>
                         <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{formatarTelefone(av.cliente)}</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 10 }}>{new Date(av.data).toLocaleDateString('pt-BR')} {new Date(av.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                         </View>
                       </View>

                       <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 8, opacity: 0.5 }} />

                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                         <Text style={{ fontSize: 24 }}>{icone}</Text>
                         <View>
                           <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Resposta do Cliente:</Text>
                           <Text style={{ color: cor, fontWeight: '900', fontSize: 16 }}>{labelResposta}</Text>
                         </View>
                       </View>

                       {av.comentario && (
                         <View style={{ marginTop: 10, backgroundColor: '#0f172a', padding: 10, borderRadius: 8 }}>
                           <Text style={{ color: '#cbd5e1', fontSize: 13, fontStyle: 'italic' }}>"{av.comentario}"</Text>
                         </View>
                       )}
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
            
            <View style={{ flex: 1, alignItems: 'center' }}>
               <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>{config.nome_loja?.toUpperCase() || 'LOJA PARCEIRA'}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
               <TouchableOpacity onPress={() => { buscarFila(); buscarStats(); buscarAvaliacoesERoleta(); mostrarToast('Dados Atualizados!', 'sucesso'); }} style={{ backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155' }}>
                 <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}>🔄 SINCRONIZAR</Text>
               </TouchableOpacity>
                <TouchableOpacity onPress={() => { setMostrarMesa(true); setMostrarConfig(false); setMostrarRemarketing(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.headerButton, { color: mostrarMesa ? '#8B5CF6' : '#94A3B8' }]}>📱 Mesa</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setMostrarRemarketing(true); setMostrarMesa(false); setMostrarConfig(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.headerButton, { color: mostrarRemarketing ? '#8B5CF6' : '#94A3B8' }]}>📞 Remarketing WA</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setMostrarConfig(!mostrarConfig); setMostrarMesa(false); setMostrarRemarketing(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerButton}>⚙️ Configurações</Text>
                  <Text style={{ color: '#64748b', fontSize: 9, fontWeight: 'bold', backgroundColor: '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>v{APP_VERSION.split('-')[0]}</Text>
                </TouchableOpacity>
               <TouchableOpacity onPress={() => { localStorage.removeItem('@loja_id_merchant'); router.replace('/login'); }}><Text style={styles.closeText}>✕ SAIR</Text></TouchableOpacity>
            </View>
          </View>

           <View style={{ gap: 15, marginBottom: 25 }}>
             <View style={{ flexDirection: 'row', gap: 15, alignItems: 'stretch', flexWrap: 'wrap' }}>
                
                {/* COLUNA 1: Atendimento e Fila */}
                <View style={{ flex: 2, minWidth: 320, gap: 15 }}>
                  <View style={[styles.card, { flex: 1, backgroundColor: '#020617', padding: 20, minHeight: 130, justifyContent: 'center', borderColor: '#10b981', borderWidth: 2 }]}>
                     {clienteAtual ? (
                       <>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                           <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>ATENDENDO AGORA:</Text>
                           <TouchableOpacity onPress={() => removerDaFila(clienteAtual.id)} style={{ backgroundColor: '#ef444430', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#ef4444' }}>
                             <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: 'bold' }}>✕ REMOVER DA FILA</Text>
                           </TouchableOpacity>
                         </View>
                         <Text style={{ color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -1 }}>{formatarTelefone(clienteAtual.cliente_cpf)}</Text>
                         <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                           <Text style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>✨ {Math.floor(cashbacks[clienteAtual.cliente_cpf]?.pontos || 0)} SPG</Text>
                           <Text style={{ color: '#facc15', fontSize: 12, fontWeight: 'bold' }}>💰 R$ {(cashbacks[clienteAtual.cliente_cpf]?.total || 0).toFixed(2)} CB</Text>
                         </View>
                       </>
                     ) : (
                       <Text style={{ color: '#64748b', fontSize: 24, textAlign: 'center', fontWeight: 'bold' }}>AGUARDANDO FILA...</Text>
                     )}
                  </View>
                  <View style={[styles.card, { flex: 1, padding: 20, backgroundColor: '#0f172a', minHeight: 150, borderColor: '#334155', borderWidth: 1 }]}>
                    <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>👥 PRÓXIMOS DA FILA</Text>
                    <ScrollView nestedScrollEnabled={true}>
                      {fila.filter(c => c.id !== (clienteAtual?.id)).length === 0 ? (
                         <Text style={{ color: '#334155', fontSize: 12, fontStyle: 'italic', marginTop: 10 }}>Ninguém aguardando...</Text>
                      ) : (
                         fila.filter(c => c.id !== (clienteAtual?.id)).map((c, i) => (
                           <View key={c.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 'bold' }}>{i + 2}º • {formatarTelefone(c.cliente_cpf)}</Text>
                              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => removerDaFila(c.id)} style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
                                  <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>✕</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setClienteFocadoId(c.id)} style={{ backgroundColor: '#38bdf820', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                                  <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}>PUXAR ⬆️</Text>
                                </TouchableOpacity>
                              </View>
                           </View>
                         ))
                      )}
                    </ScrollView>
                  </View>
                </View>

                {/* COLUNA 2: Valor e Estatísticas */}
                <View style={{ flex: 2, minWidth: 320, gap: 15 }}>
                  <View style={[styles.card, { backgroundColor: '#020617', padding: 15, minHeight: 130, justifyContent: 'center', borderColor: '#10b981', borderWidth: 1 }]}>
                     <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 'bold', position: 'absolute', top: 15, left: 15 }}>VALOR DA VENDA (R$):</Text>
                     <TextInput
                       placeholder="R$ 0,00"
                       placeholderTextColor="#1e293b"
                       keyboardType="numeric"
                       value={clienteAtual ? (valorVenda[clienteAtual.id] ? (parseInt(valorVenda[clienteAtual.id], 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '') : ''}
                       onChangeText={(t) => {
                         if (clienteAtual) setValorVenda({ ...valorVenda, [clienteAtual.id]: t.replace(/\D/g, '') });
                       }}
                       onSubmitEditing={() => { if (clienteAtual) atender(clienteAtual.id); }}
                       style={{ color: '#10b981', fontSize: 64, fontWeight: '900', textAlign: 'right', width: '100%', height: '100%', outlineStyle: 'none', borderWidth: 0 } as any}
                     />
                  </View>
                  <View style={[styles.card, { flex: 1, padding: 25, backgroundColor: '#1e293b', minHeight: 150, justifyContent: 'space-between' }]}>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#10b981', fontSize: 32, fontWeight: '900' }}>{formatarMoeda(stats.totalMes)}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                           <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                           <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>ATUALIZAÇÃO</Text>
                        </View>
                      </View>
                      <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>TOTAL DO MÊS</Text>
                    </View>
                    
                    <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 15 }} />
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15 }}>
                        <View style={{ flex: 1, minWidth: 80 }}>
                          <Text style={{ color: '#38bdf8', fontSize: 24, fontWeight: '900' }}>{stats.vendasCount}</Text>
                          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>HOJE</Text>
                        </View>
                        <View style={{ flex: 1.5, alignItems: 'center' }}>
                          <Text style={{ color: '#10b981', fontSize: 24, fontWeight: '900' }}>{formatarMoeda(stats.totalDia)}</Text>
                          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>TOTAL DO DIA</Text>
                        </View>
                        <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                          <Text style={{ color: '#38bdf8', fontSize: 24, fontWeight: '900' }}>{formatarMoeda(stats.ticketMedio)}</Text>
                          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>TICKET MÉDIO</Text>
                        </View>
                    </View>
                  </View>
                </View>

                {/* COLUNA 3: Botão Atender e Detalhes da Compra */}
                <View style={{ flex: 1.5, minWidth: 250, gap: 15 }}>
                  <TouchableOpacity 
                    onPress={() => clienteAtual && atender(clienteAtual.id)}
                    style={[styles.card, { backgroundColor: clienteAtual ? '#10b981' : '#334155', minHeight: 130, alignItems: 'center', justifyContent: 'center' }]}>
                     <Text style={{ color: '#0f172a', fontWeight: 'bold', fontSize: 20 }}>ATENDER</Text>
                  </TouchableOpacity>
                  <View style={[styles.card, { flex: 1, padding: 25, backgroundColor: '#1e293b', minHeight: 150 }]}>
                     {clienteAtual && valorVenda[clienteAtual.id] ? (
                       <View style={{ height: '100%', justifyContent: 'space-between' }}>
                         <View style={{ flex: 1 }}>
                           <Text style={{ color: '#facc15', fontSize: 12, fontWeight: 'bold', marginBottom: 15 }}>💡 DETALHES DA COMPRA:</Text>
                           
                           <View style={{ gap: 12 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <Text style={{ color: '#94a3b8', fontSize: 14 }}>Valor da Venda:</Text>
                                 <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{formatarMoeda(parseInt(valorVenda[clienteAtual.id], 10) / 100)}</Text>
                              </View>
   
                              {(() => {
                                 const cpf = clienteAtual.cliente_cpf;
                                 const valorReal = parseInt(valorVenda[clienteAtual.id], 10) / 100;
                                 const cb_total = cashbacks[cpf]?.total || 0;
                                 const cb_proximo = cashbacks[cpf]?.proximo || 0;
                                 const usarCb = config.usar_cashback_total ? cb_total : cb_proximo;
                                 const limiteCb = valorReal * (Number(config.cashback_limite_uso_percent) / 100);
                                 const cashbackUsado = Math.min(Math.min(valorReal, limiteCb), usarCb);
                                 const aPagar = valorReal - cashbackUsado;
                                 const base = config.pontos_sobre_valor_bruto ? valorReal : aPagar;
                                 const pts = Math.floor(base / (Number(config.reais_por_ponto) || 1));
   
                                 return (
                                   <>
                                     <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#facc15', fontSize: 14 }}>Cashback:</Text>
                                        <Text style={{ color: '#facc15', fontSize: 18, fontWeight: 'bold' }}>- {formatarMoeda(cashbackUsado)}</Text>
                                     </View>
   
                                     <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#38bdf815', padding: 10, borderRadius: 10 }}>
                                        <Text style={{ color: '#38bdf8', fontSize: 12 }}>Ganha agora:</Text>
                                        <Text style={{ color: '#38bdf8', fontSize: 16, fontWeight: '900' }}>+ {pts} SPG</Text>
                                     </View>
                                     
                                     <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: 10 }}>
                                       <Text style={{ color: '#10b981', fontSize: 42, fontWeight: '900', lineHeight: 42 }}>{formatarMoeda(aPagar)}</Text>
                                       <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}>VALOR FINAL A PAGAR</Text>
                                     </View>
                                   </>
                                 );
                              })()}
                           </View>
                         </View>
                       </View>
                     ) : (
                       <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                         <Text style={{ color: '#64748b', fontSize: 16, textAlign: 'center' }}>Digite um valor para ver o resumo...</Text>
                       </View>
                     )}
                  </View>
                </View>

             </View>

             {clienteAtual && [clienteAtual].map((c) => {
                const temBonus = bonusPendentes[c.cliente_cpf];
                const brindes = brindesPendentes[c.cliente_cpf] || [];
                if (temBonus > 0 || brindes.length > 0) {
                  return (
                    <View key={c.id} style={{ flexDirection: 'row', gap: 10 }}>
                      {temBonus > 0 && (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#facc1515', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#facc1530' }}>
                          <Switch value={usarBonus[c.id] !== false} onValueChange={(v) => setUsarBonus((prev: any) => ({ ...prev, [c.id]: v }))} />
                          <Text style={{ color: '#facc15', marginLeft: 12, fontWeight: 'bold', fontSize: 16 }}>🎁 APLICAR BÔNUS: +{temBonus} SPG</Text>
                        </View>
                      )}
                      {brindes.map((b: any) => (
                        <View key={b.id} style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ec489915', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#ec489930' }}>
                          <Text style={{ color: '#ec4899', fontWeight: 'bold', fontSize: 15 }}>🏆 Brinde: {b.nome_brinde}</Text>
                          <TouchableOpacity 
                            onPress={() => entregarBrinde(b.id, c.cliente_cpf)}
                            style={{ backgroundColor: '#ec4899', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>ENTREGAR</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  );
                }
                return null;
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 25, flexWrap: 'wrap' }}>
             <TouchableOpacity onPress={baixarQRCode} style={[styles.card, { flex: 1, minWidth: 250, height: 260, alignItems: 'center', justifyContent: 'center' }]}>
                <QRCode value={linkQR} size={250} getRef={(c) => (qrRef.current = c)} />
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginTop: 15 }}>📥 BAIXAR QR DO BALCÃO (10x10cm)</Text>
             </TouchableOpacity>

             <View style={{ position: 'absolute', opacity: 0, left: -9999 }}>
                <QRCode value={linkQR} size={1181} getRef={(c) => (qrDownloadRef.current = c)} />
             </View>

             <View style={[styles.card, { flex: 1, minWidth: 250, height: 260 }]}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>{stats.totalClientesDia || 0}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 6 }}>TOP CLIENTES HOJE</Text>
                <ScrollView nestedScrollEnabled={true}>
                   {(stats as any).vendasDiaFormatada?.map((v: any, i: number) => (
                     <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: '#334155', paddingVertical: 8 }}>
                        <Text style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>
                          {formatarTelefone(v.cpf)} • {formatarMoeda(Number(v.valor))} <Text style={{ color: '#64748b', fontWeight: 'normal', fontSize: 11 }}>• {v.dataHora}</Text>
                        </Text>
                     </View>
                   ))}
                </ScrollView>
             </View>

             <View style={[styles.card, { flex: 1, minWidth: 250, height: 260 }]}>
                <Text style={{ color: '#38bdf8', fontSize: 24, fontWeight: '900' }}>{stats.resgatesMesLista?.length || 0}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 6 }}>SAÍDAS ESTOQUE (MÊS)</Text>
                <ScrollView nestedScrollEnabled={true}>
                   {(stats as any).resgatesSumarizados?.map((s: any, i: number) => (
                     <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: '#334155', paddingVertical: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>
                          <Text style={{ fontWeight: 'bold', color: '#38bdf8' }}>{s.qtde}x</Text> {s.nome} • <Text style={{ color: '#94a3b8' }}>{s.pontos} SPG</Text>
                        </Text>
                     </View>
                   ))}
                </ScrollView>
             </View>

             <View style={[styles.card, { flex: 1, minWidth: 250, height: 260 }]}>
                <Text style={{ color: '#ec4899', fontSize: 24, fontWeight: '900' }}>{stats.resgatesHojeLista?.length || 0}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 6 }}>RESGATES (HOJE)</Text>
                <ScrollView nestedScrollEnabled={true}>
                   {(stats as any).resgatesListados?.map((r: any, i: number) => (
                     <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: '#334155', paddingVertical: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>
                          1x {r.nome} <Text style={{ color: '#64748b', fontSize: 11 }}>• {formatarTelefone(r.telefone)} • {r.dataHora}</Text>
                        </Text>
                     </View>
                   ))}
                </ScrollView>
             </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 15, marginBottom: 25, flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={() => setMostrarAvaliacoesModal(true)} style={[styles.card, { flex: 2, minWidth: 300, borderColor: '#facc15' }]}>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <Text style={[styles.title, { color: '#facc15' }]}>⭐ NPS & Avaliações ({isNaN(mediaEstrelas) ? '0.0' : mediaEstrelas.toFixed(1)})</Text>
                   <Text style={{ color: '#facc15', fontSize: 10, fontWeight: 'bold' }}>VER LISTA ➔</Text>
                 </View>
                 <View style={{ flexDirection: 'row', gap: 4, marginBottom: 15 }}>
                   {[1,2,3,4,5].map(star => (
                     <View key={star} style={{ flex: 1, height: 6, backgroundColor: (!isNaN(mediaEstrelas) && mediaEstrelas >= star) ? '#facc15' : '#334155', borderRadius: 3 }} />
                   ))}
                 </View>

                 {npsChart.dias.length > 0 && (
                   <View style={{ height: 150, width: '100%', marginBottom: 10 }}>
                      <View style={{ flex: 1, position: 'relative' }}>
                        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                           {(() => {
                             const max = npsChart.max || 1;
                             const ptsVerde = npsChart.dias.map((d: any, i: number) => `${(i / (npsChart.dias.length - 1)) * 100},${100 - ((d.verde / max) * 100)}`).join(' ');
                             const ptsAmarelo = npsChart.dias.map((d: any, i: number) => `${(i / (npsChart.dias.length - 1)) * 100},${100 - ((d.amarelo / max) * 100)}`).join(' ');
                             const ptsVermelho = npsChart.dias.map((d: any, i: number) => `${(i / (npsChart.dias.length - 1)) * 100},${100 - ((d.vermelho / max) * 100)}`).join(' ');
                             return (
                               <>
                                 <Polyline points={ptsVermelho} fill="none" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                 <Polyline points={ptsAmarelo} fill="none" stroke="#facc15" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                 <Polyline points={ptsVerde} fill="none" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                               </>
                             );
                           })()}
                        </Svg>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                         {npsChart.dias.map((d: any, idx: number) => (
                            <Text key={idx} style={{ color: '#64748b', fontSize: 10 }}>{d.label}</Text>
                         ))}
                      </View>
                   </View>
                 )}
              </TouchableOpacity>

             <TouchableOpacity onPress={() => setMostrarCRM(prev => !prev)} style={[styles.card, { flex: 1, minWidth: 200, borderColor: '#8b5cf6', borderWidth: 1 }]}>
                <Text style={{ color: '#8b5cf6', fontSize: 32, fontWeight: '900' }}>{clientesAtrasados}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>REMARKETING</Text>
                <Text style={{ color: '#fff', fontSize: 11, marginTop: 10, lineHeight: 16 }}>
                   Temos <Text style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{clientesAtrasados}</Text> clientes sumidos.
                </Text>
                <View style={{ flex: 1, justifyContent: 'flex-end', marginTop: 6 }}>
                    <Text style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: 10 }}>VER LISTA ➔</Text>
                </View>
              </TouchableOpacity>

               <View style={[styles.card, { flex: 1, minWidth: 200, borderColor: '#334155', backgroundColor: '#020617' }]}>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 5 }}>⚡ {operadorLogado}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}>OPERADOR ATIVO</Text>
                  <TouchableOpacity onPress={() => { localStorage.clear(); router.replace('/login'); }} style={{ marginTop: 15, backgroundColor: '#ef444420', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ef4444' }}>
                    <Text style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center', fontSize: 10 }}>SAIR DO SISTEMA</Text>
                  </TouchableOpacity>
               </View>

               <TouchableOpacity onPress={() => setMostrarEquipeModal(true)} style={[styles.card, { flex: 1, minWidth: 200, borderColor: '#facc15', borderStyle: 'dashed' }]}>
                  <Text style={{ color: '#facc15', fontSize: 28, fontWeight: '900' }}>{operadores.length + 1}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>EQUIPE ATIVA</Text>
                  <Text style={{ color: '#facc15', fontSize: 9, fontWeight: 'bold', marginTop: 5 }}>LIMITE: {lojaLimiteUsers} USERS</Text>
                  <View style={{ marginTop: 10, backgroundColor: '#facc1520', padding: 8, borderRadius: 10, alignItems: 'center' }}>
                     <Text style={{ color: '#facc15', fontWeight: 'bold', fontSize: 10 }}>GERENCIAR TIME ➔</Text>
                  </View>
               </TouchableOpacity>

              <View style={[styles.card, { flex: 1, minWidth: 200, borderColor: '#10b981' }]}>
                 <Text style={[styles.title, { color: '#10b981' }]}>📈 Lucratividade (ROI)</Text>
                 <Text style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 22 }}>
                   Hoje os prêmios entregues geraram um retorno de 
                   <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 18 }}> {formatarMoeda(stats.pontosResgatadosHoje * (Number(config.reais_por_ponto) || 1))}</Text> 
                    em faturamento fiel.
                 </Text>
              </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 15, marginBottom: 40, flexWrap: 'wrap' }}>
             <TouchableOpacity onPress={() => setMostrarManual(!mostrarManual)} style={[styles.card, { flex: 1, minWidth: 250, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', height: 80 }]}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>⌨️ LANÇAMENTO MANUAL</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setMostrarCatalogo(!mostrarCatalogo)} style={[styles.card, { flex: 1, minWidth: 250, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', height: 80 }]}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>🎁 GERENCIAR CATÁLOGO</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setMostrarRoleta(!mostrarRoleta)} style={[styles.card, { flex: 1, minWidth: 250, backgroundColor: '#db2777', alignItems: 'center', justifyContent: 'center', height: 80 }]}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>🎡 CONFIGURAR ROLETA</Text>
             </TouchableOpacity>
          </View>

          {mostrarManual && (
            <View style={styles.card} ref={manualInputRef}>
              <Text style={styles.title}>✍️ Lançamento Manual</Text>
              <TextInput placeholder="WhatsApp do Cliente" placeholderTextColor="#94A3B8" keyboardType="numeric" value={formatarTelefone(telefoneManual)}
                onChangeText={(t) => {
                  setTelefoneManual(t); const clean = t.replace(/\D/g, ''); if (clean.length >= 10) buscarFinanceiroDetalhado(clean, 'manual');
                  else { setBonusPendentes((prev: any) => { const novo = { ...prev }; delete novo[clean]; return novo; }); setUsarBonus((prev: any) => ({ ...prev, ['manual']: false })); }
                }} style={styles.input}
              />
              <TextInput placeholder="Valor: R$ 0,00" placeholderTextColor="#94A3B8" keyboardType="numeric"
                value={valorManual ? (parseInt(valorManual, 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                onChangeText={(t) => setValorManual(t.replace(/\D/g, ''))} style={styles.inputValor} returnKeyType="done" onSubmitEditing={atenderManual}
                onKeyPress={(e) => { if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') atenderManual(); }} />

              {telefoneManual.replace(/\D/g, '').length >= 10 && bonusPendentes[telefoneManual.replace(/\D/g, '')] > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#facc1520', padding: 15, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#facc1550' }}>
                  <Switch value={usarBonus['manual'] !== false} onValueChange={(v) => setUsarBonus((prev: any) => ({ ...prev, ['manual']: v }))} />
                  <Text style={{ color: '#facc15', marginLeft: 12, fontWeight: 'bold', fontSize: 16 }}>🎁 BÔNUS DE RETORNO: +{bonusPendentes[telefoneManual.replace(/\D/g, '')]} SPG</Text>
                </View>
              )}

              {valorManual !== '' && telefoneManual.replace(/\D/g, '').length >= 10 && (
                <View style={styles.simulacaoCard}>
                  <View style={{ marginTop: 12 }}><Text style={styles.simulacaoTitulo}>💡 Resumo da venda</Text></View>
                  {(() => {
                    const cpfLimpo = telefoneManual.replace(/\D/g, '');
                    const valorReal = parseInt(valorManual, 10) / 100;
                    if (valorReal <= 0 && (!usarBonus['manual'] && usarBonus['manual'] !== undefined)) return <Text style={{ color: '#ef4444' }}>Digite o valor da venda.</Text>;

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
                        {pontosExtra > 0 && <Text style={{ color: '#facc15', fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>🎁 +{pontosExtra} Springs (Bônus de Retorno)</Text>}
                        {pontosExtra > 0 && <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 8 }}>✨ TOTAL A INJETAR: {pontosTotais} Springs</Text>}
                        {cb_total > 0 && <Text style={{ color: '#22c55e', marginTop: 10, fontSize: 18, fontWeight: 'bold' }}>💳 A PAGAR: {formatarMoeda(aPagar)}</Text>}
                      </>
                    );
                  })()}
                </View>
              )}
              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#10b981' }]} onPress={atenderManual}><Text style={styles.buttonText}>LANÇAR VENDA MANUAL</Text></TouchableOpacity>
            </View>
          )}

          {mostrarCRM && (
            <View style={styles.card}>
              <Text style={styles.title}>📲 Clientes para Contato</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 15 }}>Envie uma mensagem com um bônus especial para quem não visita a loja há dias.</Text>
              {historicoCRM.length === 0 && <Text style={{ color: '#64748b', fontStyle: 'italic' }}>Nenhum cliente aguardando contato.</Text>}
              {historicoCRM.map(venda => (
                <View key={venda.id} style={styles.crmItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.crmTelefone}>{formatarTelefone(venda.cliente_cpf)}</Text>
                    <Text style={styles.crmDetalhe}>Última Compra: {formatarMoeda(Number(venda.valor))} em {parseDataSupabase(venda.created_at).toLocaleDateString('pt-BR')}</Text>
                    <Text style={[styles.crmRetorno, venda.atrasado ? { color: '#ef4444' } : { color: '#10b981' }]}>Retorno Esperado: {venda.dataRetorno.toLocaleDateString('pt-BR')}</Text>
                  </View>
                  <TouchableOpacity style={{ paddingLeft: 15 }} onPress={() => iniciarCRM(venda.cliente_cpf)}>
                    <Text style={{ fontSize: 28 }}>💬</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {mostrarCatalogo && (
            <View>
              <TouchableOpacity style={[styles.buttonCenter, { marginBottom: 20 }]} onPress={() => { setEditandoRewardId('novo'); setFormError(''); setForm({ nome: '', pontos: '', imagem: '', limiteCliente: '', limiteDia: '', limiteTotal: '' }); }}>
                <Text style={styles.buttonText}>+ ADICIONAR NOVO PRÊMIO</Text>
              </TouchableOpacity>

              {editandoRewardId === 'novo' && (
                <View style={[styles.editBox, { marginBottom: 20 }]}>
                  <Text style={{ color: '#10b981', fontWeight: 'bold', marginBottom: 10, fontSize: 16 }}>✨ Cadastrar Novo Prêmio</Text>
                  {formError !== '' && <Text style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: 10 }}>{formError}</Text>}
                  {[{ key: 'nome', label: 'O que o cliente ganha? (Ex: Café)' }, { key: 'pontos', label: 'Quantos Springs custa? (Ex: 50)' }, { key: 'imagem', label: 'Link da foto (Opcional - URL da imagem)' }, { key: 'limiteCliente', label: 'Máximo por cliente na vida (Vazio = Infinito)' }, { key: 'limiteDia', label: 'Máximo que a loja dá por dia (Vazio = Infinito)' }, { key: 'limiteTotal', label: 'Estoque Total (Vazio = Infinito)' }].map(({ key, label }) => (
                    <TextInput key={key} value={form[key] || ''} onChangeText={(t) => setForm({ ...form, [key]: t })} placeholder={label} placeholderTextColor="#94A3B8" style={styles.input} keyboardType={key === 'nome' || key === 'imagem' ? 'default' : 'numeric'} />
                  ))}
                  <TouchableOpacity style={styles.button} onPress={salvarEdicao}><Text style={styles.buttonText}>SALVAR PRÊMIO</Text></TouchableOpacity>
                </View>
              )}

              <View style={styles.grid}>
                {(rewards || []).map((r) => (
                  <View key={r.id} style={[styles.cardGrid, { width: itemWidth as any }]}>
                    {r.imagem && <Image source={{ uri: r.imagem }} style={styles.img} />}
                    <Text style={styles.phone}>{r.nome}</Text>
                    <Text style={styles.points}>{r.custo_pontos} Springs</Text>
                    <TouchableOpacity style={styles.editBtn} onPress={() => editarReward(r)}><Text style={styles.buttonText}>EDITAR</Text></TouchableOpacity>
                    {editandoRewardId === r.id && (
                      <View style={styles.editBox}>
                        {formError !== '' && <Text style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: 10 }}>{formError}</Text>}
                        {[{ key: 'nome', label: 'O que o cliente ganha? (Ex: Café)' }, { key: 'pontos', label: 'Quantos Springs custa? (Ex: 50)' }, { key: 'imagem', label: 'Link da foto (Opcional - URL da imagem)' }, { key: 'limiteCliente', label: 'Máximo por cliente na vida (Vazio = Infinito)' }, { key: 'limiteDia', label: 'Máximo que a loja dá por dia (Vazio = Infinito)' }, { key: 'limiteTotal', label: 'Estoque Total (Vazio = Infinito)' }].map(({ key, label }) => (
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

          {mostrarRoleta && (
            <View>
              <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 15 }}>Cadastre os prêmios (fatias) que o cliente pode ganhar ao avaliar a loja. A soma das probabilidades não precisa ser 100%.</Text>
              <TouchableOpacity style={[styles.buttonCenter, { backgroundColor: '#ec4899', marginBottom: 20 }]} onPress={() => { setEditandoRoletaId('novo'); setFormRoleta({ nome: '', tipo: 'pontos', valor: '', probabilidade: '10' }); }}>
                <Text style={styles.buttonText}>+ CADASTRAR FATIA NA ROLETA</Text>
              </TouchableOpacity>

              {editandoRoletaId === 'novo' && (
                <View style={[styles.editBox, { marginBottom: 20, borderColor: '#ec4899', borderWidth: 1, backgroundColor: '#020617' }]}>
                  <Text style={{ color: '#ec4899', fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>✨ Nova Fatia da Roleta</Text>
                  <TextInput placeholder="Ex: Ganhou 10 Springs" placeholderTextColor="#475569" value={formRoleta.nome || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, nome: t })} style={[styles.input, { marginBottom: 15 }]} />
                  <TextInput placeholder="Tipo: pontos, cashback, brinde" placeholderTextColor="#475569" value={formRoleta.tipo || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, tipo: t })} style={[styles.input, { marginBottom: 15 }]} />
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 5 }}>
                    <View style={{ flex: 1 }}>
                      <TextInput placeholder="Qtd" placeholderTextColor="#475569" value={formRoleta.valor || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, valor: t })} style={styles.input} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput placeholder="Chance" placeholderTextColor="#475569" value={formRoleta.probabilidade || ''} onChangeText={(t) => setFormRoleta({ ...formRoleta, probabilidade: t })} style={styles.input} keyboardType="numeric" />
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
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{p.nome}</Text>
                    <Text style={{ color: '#ec4899', fontSize: 12 }}>Tipo: {p.tipo} | Valor: {p.valor} | Chance: {p.probabilidade}%</Text>
                  </View>
                  <TouchableOpacity style={{ padding: 10 }} onPress={() => apagarRoleta(p.id)}><Text style={{ color: '#ef4444', fontWeight: 'bold' }}>APAGAR</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>
      {/* MODAL DE GERENCIAMENTO DE EQUIPE */}
      {mostrarEquipeModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 500 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <Text style={[styles.title, { marginBottom: 0, color: '#facc15' }]}>👥 Minha Equipe</Text>
               <TouchableOpacity onPress={() => setMostrarEquipeModal(false)} style={{ padding: 5 }}>
                 <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
               </TouchableOpacity>
            </View>

            {operadorLogado === 'Master' ? (
              <>
                <View style={{ backgroundColor: '#020617', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ color: '#facc15', fontWeight: 'bold', fontSize: 12, marginBottom: 10 }}>ADICIONAR OPERADOR ({operadores.length}/{lojaLimiteUsers})</Text>
                  <TextInput style={styles.input} placeholder="Nome do Funcionário" placeholderTextColor="#64748b" value={formOperador.nome} onChangeText={(t) => setFormOperador({...formOperador, nome: t})} />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Usuário (login)" placeholderTextColor="#64748b" value={formOperador.username} onChangeText={(t) => setFormOperador({...formOperador, username: t})} autoCapitalize="none" />
                    <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Senha" placeholderTextColor="#64748b" value={formOperador.senha} onChangeText={(t) => setFormOperador({...formOperador, senha: t})} secureTextEntry />
                  </View>
                  <TouchableOpacity onPress={salvarOperador} style={{ backgroundColor: '#facc15', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 }}>
                    <Text style={{ color: '#020617', fontWeight: 'bold' }}>CADASTRAR OPERADOR</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 300 }}>
                   <View style={{ padding: 12, backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#10b98130' }}>
                      <Text style={{ color: '#10b981', fontWeight: 'bold' }}>👑 Master (Você)</Text>
                      <Text style={{ color: '#64748b', fontSize: 10 }}>ADMINISTRADOR</Text>
                   </View>
                   {operadores.map((op) => (
                     <View key={op.id} style={{ padding: 12, backgroundColor: '#0f172a', borderRadius: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}>
                        <View>
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>👤 {op.nome}</Text>
                          <Text style={{ color: '#94a3b8', fontSize: 11 }}>Login: {op.username}</Text>
                        </View>
                        <TouchableOpacity onPress={() => excluirOperador(op.id)} style={{ padding: 8 }}>
                          <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>REMOVER</Text>
                        </TouchableOpacity>
                     </View>
                   ))}
                </ScrollView>
              </>
            ) : (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 40, marginBottom: 15 }}>🔒</Text>
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Acesso Restrito</Text>
                <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>Apenas o usuário Master pode gerenciar a equipe.</Text>
              </View>
            )}
          </View>
        </View>
      )}
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
  wrapper: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  headerButton: { color: '#94A3B8', fontWeight: '600' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#ef4444', fontWeight: 'bold' },
  logo: { color: '#10b981', fontSize: 28, textAlign: 'center', fontWeight: 'bold', marginBottom: 20 },
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
});
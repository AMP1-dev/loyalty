import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS - COMPARTILHADAS ENTRE CLIENTE E MERCHANT
// ═════════════════════════════════════════════════════════════════════════════════

/**
 * Calcula saldo de um cliente em uma loja específica
 * = Pontos gerados - Pontos usados
 */
export const calcularSaldoCliente = async (
  cpf: string,
  lojaId: string
): Promise<number> => {
  const cpfsParaBusca = [cpf, cpf.startsWith('55') ? cpf.substring(2) : '55' + cpf];
  
  const { data: transacoes, error } = await supabase
    .from('transacoes')
    .select('pontos_gerados, pontos_usados')
    .in('cliente_cpf', cpfsParaBusca)
    .eq('loja_id', lojaId);

  if (error) {
    console.error('Erro ao calcular saldo:', error);
    return 0;
  }

  const gerados = transacoes?.reduce((sum, t) => sum + (t.pontos_gerados || 0), 0) || 0;
  const usados = transacoes?.reduce((sum, t) => sum + (t.pontos_usados || 0), 0) || 0;

  return Math.max(0, gerados - usados);
};

/**
 * Gera token único de 6 dígitos ALFANUMÉRICOS
 */
export const gerarToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Valida se token já existe
 */
export const tokenJaExiste = async (token: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('intercambio_tokens')
    .select('id')
    .eq('token', token.toUpperCase())
    .limit(1);

  if (error) return false;
  return data && data.length > 0;
};

/**
 * Valida se token expirou (48h)
 */
export const tokenExpirou = (expirationDate: string): boolean => {
  return new Date() > new Date(expirationDate);
};

/**
 * Calcula pontos após aplicar taxa de desagio
 * Retorna: { pontos_liquido, taxa_pontos }
 */
export const aplicarTaxa = (
  pontos: number,
  percentualTaxa: number = 0.1 // 10% padrão
): { pontos_liquido: number; taxa_pontos: number } => {
  const taxa_pontos = Math.floor(pontos * percentualTaxa);
  const pontos_liquido = pontos - taxa_pontos;
  return { pontos_liquido, taxa_pontos };
};

/**
 * Busca token com todos os detalhes
 */
export const buscarTokenCompleto = async (token: string) => {
  const { data, error } = await supabase
    .from('intercambio_tokens')
    .select('*, intercambio_itens(*)')
    .eq('token', token.toUpperCase())
    .single();

  if (error) {
    console.error('Erro ao buscar token:', error);
    return null;
  }

  return data;
};

/**
 * Busca caixa ativa (pontos temporários) de um cliente
 */
export const buscarCaixaAtivaCliente = async (cpf: string) => {
  const { data, error } = await supabase
    .from('intercambio_caixa')
    .select('*')
    .eq('cliente_cpf', cpf)
    .eq('status', 'ativo')
    .order('criado_em', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao buscar caixa:', error);
    return null;
  }

  return data?.[0] || null;
};

/**
 * Carrega histórico de exchanges de um cliente
 */
export const carregarHistoricoExchange = async (cpf: string) => {
  const { data, error } = await supabase
    .from('intercambio_historico_detalhado')
    .select('*')
    .eq('cliente_cpf', cpf)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao carregar histórico:', error);
    return [];
  }

  return data || [];
};

// ─── Configuração de URLs para QR Codes ───────────────────────────────────────

/**
 * URL Base da aplicação (ajustar conforme ambiente)
 * Produção: https://springs.amp.ia.br
 * Desenvolvimento: http://localhost:8081
 */
const BASE_URL = 'https://springs.amp.ia.br';

/**
 * Gera URL para QR Code do BALCÃO (checkout/pagamento)
 * Uso: Mostrador de caixa, tablet no balcão
 * Fluxo: Lê QR → Digite CPF → Pague → Roleta principal
 */
export const getQRBalcaoURL = (lojaId: string): string => {
  return `${BASE_URL}/cliente?loja_id=${lojaId}`;
};

/**
 * Gera URL para QR Code da MESA (entretenimento)
 * Uso: Fixado na mesa do cliente
 * Fluxo: Lê QR → Digite Telefone → Pesquisa NPS → Roleta mesa
 */
export const getQRMesaURL = (lojaId: string): string => {
  return `${BASE_URL}/cliente/mesa?loja_id=${lojaId}`;
};

/**
 * Configurações de tamanho para download
 */
export const QR_SIZES = {
  PEQUENO: { width: 200, height: 200, label: '5x5 cm' },
  MEDIO: { width: 600, height: 600, label: '10x10 cm' },
  GRANDE: { width: 1181, height: 1181, label: '20x20 cm' },
} as const;

/**
 * Cores para diferenciação visual
 */
export const QR_COLORS = {
  BALCAO: {
    dark: '#1e293b',      // Cinza escuro
    light: '#f8fafc',     // Branco frio
    accent: '#10b981',    // Verde neon (marca)
    label: 'QR Balcão',
  },
  MESA: {
    dark: '#1e293b',
    light: '#fdf8ec',     // Bege claro (mais caloroso)
    accent: '#a855f7',    // Roxo (diferencia da principal)
    label: 'QR Mesa - Diversão & Pesquisa',
  },
} as const;

export default {
  BASE_URL,
  getQRBalcaoURL,
  getQRMesaURL,
  QR_SIZES,
  QR_COLORS,
};

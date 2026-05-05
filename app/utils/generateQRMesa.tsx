// ─── Gerador de QR Code para Mesa ─────────────────────────────────────────────

import QRCode from 'qrcode';
import { QR_COLORS, QR_SIZES, getQRMesaURL } from './qrConfig';

/**
 * Gera imagem QR Code da mesa em alta resolução
 * @param lojaId - ID da loja
 * @param tamanho - 'PEQUENO' | 'MEDIO' | 'GRANDE'
 * @returns Promise<string> - Data URL da imagem
 */
export const generateQRMesa = async (
  lojaId: string,
  tamanho: keyof typeof QR_SIZES = 'MEDIO'
): Promise<string> => {
  try {
    const url = getQRMesaURL(lojaId);
    const size = QR_SIZES[tamanho];
    const colors = QR_COLORS.MESA;

    // Gera QR Code simples
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: size.width,
      margin: 2,
      color: {
        dark: colors.dark,
        light: colors.light,
      },
    });

    return qrDataUrl;
  } catch (error) {
    console.error('Erro ao gerar QR Code da mesa:', error);
    throw error;
  }
};

/**
 * Gera QR Code com moldura e informações (para exibição/impressão)
 * @param lojaId - ID da loja
 * @param nomeLoja - Nome da loja (opcional)
 * @returns Promise<string> - SVG com QR + frame
 */
export const generateQRMesaComFrame = async (
  lojaId: string,
  nomeLoja?: string
): Promise<string> => {
  try {
    const qrBase64 = await generateQRMesa(lojaId, 'GRANDE');
    const colors = QR_COLORS.MESA;

    // SVG com moldura bonita
    const svg = `
      <svg width="1181" height="1400" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="1181" height="1400" fill="${colors.light}"/>
        
        <!-- Moldura superior -->
        <rect x="50" y="50" width="1081" height="100" fill="${colors.accent}" opacity="0.1" rx="10"/>
        <text x="590" y="110" font-size="48" font-weight="900" text-anchor="middle" fill="${colors.dark}">
          🎮 JOGUE NA MESA!
        </text>
        
        <!-- QR Code -->
        <image x="150" y="200" width="881" height="881" href="${qrBase64}"/>
        
        <!-- Moldura do QR -->
        <rect x="130" y="180" width="921" height="921" fill="none" stroke="${colors.accent}" stroke-width="8" rx="20"/>
        
        <!-- Texto inferior -->
        <text x="590" y="1150" font-size="32" font-weight="700" text-anchor="middle" fill="${colors.dark}">
          Divirta-se, ganhe prêmios!
        </text>
        <text x="590" y="1200" font-size="24" text-anchor="middle" fill="${colors.accent}">
          ⭐ Ganhe o DOBRO avaliando no Google
        </text>
        
        <!-- Rodapé -->
        ${nomeLoja ? `<text x="590" y="1300" font-size="18" text-anchor="middle" fill="#666">${nomeLoja}</text>` : ''}
        <text x="590" y="1350" font-size="14" text-anchor="middle" fill="#999">
          PALM SPRINGS - Clube de Vantagens
        </text>
      </svg>
    `;

    return svg;
  } catch (error) {
    console.error('Erro ao gerar QR Code com frame:', error);
    throw error;
  }
};

/**
 * Download do QR Code como imagem PNG
 * @param lojaId - ID da loja
 * @param tamanho - Tamanho do QR
 * @param nomeLoja - Nome da loja (para nome do arquivo)
 */
export const downloadQRMesa = async (
  lojaId: string,
  tamanho: keyof typeof QR_SIZES = 'MEDIO',
  nomeLoja: string = 'loja'
) => {
  try {
    const qrDataUrl = await generateQRMesa(lojaId, tamanho);
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-Mesa-${nomeLoja}-${tamanho}.png`;
    link.click();
  } catch (error) {
    console.error('Erro ao fazer download:', error);
  }
};

/**
 * Copia QR Code para clipboard (para compartilhamento digital)
 */
export const copyQRMesaToClipboard = async (lojaId: string) => {
  try {
    const qrDataUrl = await generateQRMesa(lojaId, 'MEDIO');
    const blob = await fetch(qrDataUrl).then((r) => r.blob());
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch (error) {
    console.error('Erro ao copiar para clipboard:', error);
    return false;
  }
};

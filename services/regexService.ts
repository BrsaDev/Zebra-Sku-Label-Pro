
import { LabelData } from "../types";

/**
 * Processador Local de Alta Precisão.
 * Focado em agrupar por SKU conforme solicitação do usuário.
 */
export async function extractWithRegex(pdfTextContext: string): Promise<LabelData[]> {
  // Normaliza o texto: remove quebras de linha e espaços duplos
  const text = pdfTextContext.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ');
  
  // Regex específicos para os campos identificados na imagem
  // Captura o valor até o próximo espaço ou fim de linha
  const skuRegex = /seller\s*sku\s*:\s*([^\s]+)/gi;
  const barcodeRegex = /barcode\s*:\s*([^\s]+)/gi;

  const foundSkus: { val: string, index: number }[] = [];
  const foundBarcodes: { val: string, index: number }[] = [];

  let match;
  // Extrai todas as ocorrências de SKUs
  while ((match = skuRegex.exec(text)) !== null) {
    foundSkus.push({ val: match[1].trim(), index: match.index });
  }

  // Extrai todas as ocorrências de Barcodes
  while ((match = barcodeRegex.exec(text)) !== null) {
    foundBarcodes.push({ val: match[1].trim(), index: match.index });
  }

  if (foundSkus.length === 0) {
    console.warn("Nenhum 'seller sku' encontrado.");
    return [];
  }

  // Dicionário para consolidar por SKU
  const consolidated: Record<string, LabelData> = {};

  foundSkus.forEach((skuObj) => {
    // Normaliza o SKU para evitar duplicidade por letras minúsculas ou espaços
    const skuKey = skuObj.val.toUpperCase();

    // Encontra o barcode mais próximo deste SKU (raio de busca)
    // PDFs podem extrair o texto em ordens variadas, então olhamos para frente e para trás
    let bestBarcode = skuObj.val; // Fallback: usa o próprio SKU como conteúdo do QR
    let minDistance = Infinity;

    foundBarcodes.forEach((bcObj) => {
      const distance = Math.abs(skuObj.index - bcObj.index);
      if (distance < minDistance) {
        minDistance = distance;
        bestBarcode = bcObj.val;
      }
    });

    if (consolidated[skuKey]) {
      consolidated[skuKey].count++;
    } else {
      consolidated[skuKey] = {
        sku: skuKey,
        barcode: bestBarcode,
        count: 1
      };
    }
  });

  // Retorna os resultados ordenados por quantidade (maior para menor)
  return Object.values(consolidated).sort((a, b) => b.count - a.count);
}

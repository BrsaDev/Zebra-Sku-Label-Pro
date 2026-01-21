
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ZEBRA_LABEL_CONFIG } from '../types';

declare const pdfjsLib: any;

if (typeof window !== 'undefined' && 'pdfjsLib' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item: any) => item.str)
      .filter((s: string) => s.trim().length > 0);
    fullText += strings.join(" ") + "\n";
  }
  return fullText;
}

export async function generateSKULabels(sku: string, barcode: string, count: number): Promise<void> {
  // Configuração Zebra: 2 etiquetas lado a lado (40mm cada = 80mm total)
  const pageWidth = ZEBRA_LABEL_CONFIG.width * ZEBRA_LABEL_CONFIG.columns;
  const pageHeight = ZEBRA_LABEL_CONFIG.height;
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [pageWidth, pageHeight]
  });

  // Gerar o QR Code com alta densidade e sem margens
  const qrDataUrl = await QRCode.toDataURL(barcode, { 
    errorCorrectionLevel: 'H', // Alta correção para etiquetas térmicas
    margin: 0,
    width: 400
  });

  for (let i = 0; i < count; i++) {
    const col = i % 2;
    const xOffset = col * ZEBRA_LABEL_CONFIG.width;
    
    // QR Code maior e bem centralizado
    const qrSize = 18.5; 
    const qrX = xOffset + (ZEBRA_LABEL_CONFIG.width - qrSize) / 2;
    const qrY = 1.0; 
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Texto: Apenas o SKU centralizado na base
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const cleanSku = sku.trim().toUpperCase();
    const textWidth = doc.getTextWidth(cleanSku);
    const textX = xOffset + (ZEBRA_LABEL_CONFIG.width - textWidth) / 2;
    
    // Posição vertical próxima ao rodapé (25mm total, texto em 23mm)
    doc.text(cleanSku, textX, 23.5);

    // Lógica de paginação para 2-UP
    if (col === 1 && i < count - 1) {
      doc.addPage();
    }
  }

  doc.save(`ZEBRA_SKU_${sku}_${count}un.pdf`);
}

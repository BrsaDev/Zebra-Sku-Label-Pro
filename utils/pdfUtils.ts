
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ZEBRA_LABEL_CONFIG } from '../types';

declare const pdfjsLib: any;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return fullText;
}

export async function generateSKULabels(sku: string, barcode: string, count: number): Promise<void> {
  // Tamanho da página para 2 etiquetas lado a lado (80x25mm)
  const pageWidth = ZEBRA_LABEL_CONFIG.width * ZEBRA_LABEL_CONFIG.columns;
  const pageHeight = ZEBRA_LABEL_CONFIG.height;
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [pageWidth, pageHeight]
  });

  // QR Code com o Barcode original (não o SKU)
  const qrDataUrl = await QRCode.toDataURL(barcode, { 
    errorCorrectionLevel: 'M', 
    margin: 1,
    width: 200
  });

  for (let i = 0; i < count; i++) {
    const col = i % 2;
    const xOffset = col * ZEBRA_LABEL_CONFIG.width;
    
    // QR Code centralizado e maior (18mm em uma etiqueta de 25mm de altura)
    const qrSize = 18;
    const qrX = xOffset + (ZEBRA_LABEL_CONFIG.width - qrSize) / 2;
    const qrY = 1.5; 
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // SKU Texto centralizado na base
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const text = sku;
    const textWidth = doc.getTextWidth(text);
    const textX = xOffset + (ZEBRA_LABEL_CONFIG.width - textWidth) / 2;
    doc.text(text, textX, 22.5);

    // Lógica de página para 2 etiquetas por folha
    if ((col === 1 || i === count - 1) && i < count - 1) {
      doc.addPage();
    }
  }

  doc.save(`${sku}_${count}_etiquetas.pdf`);
}

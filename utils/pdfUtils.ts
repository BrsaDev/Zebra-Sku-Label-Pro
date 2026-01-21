
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
  // Page size for 2-up layout (80x25mm)
  const pageWidth = ZEBRA_LABEL_CONFIG.width * ZEBRA_LABEL_CONFIG.columns;
  const pageHeight = ZEBRA_LABEL_CONFIG.height;
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [pageWidth, pageHeight]
  });

  // CRITICAL CHANGE: The QR Code now contains the BARCODE data, not the SKU.
  const qrDataUrl = await QRCode.toDataURL(barcode, { errorCorrectionLevel: 'M', margin: 1 });

  for (let i = 0; i < count; i++) {
    const col = i % 2;
    
    // Position within the 80mm wide page
    const xOffset = col * ZEBRA_LABEL_CONFIG.width;
    
    // Draw QR Code centered in its 40x25 block
    const qrSize = 16;
    const qrX = xOffset + (ZEBRA_LABEL_CONFIG.width - qrSize) / 2;
    const qrY = 2; 
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Draw SKU Text centered below QR (As per "Texto somente o SKU")
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const text = sku;
    const textWidth = doc.getTextWidth(text);
    const textX = xOffset + (ZEBRA_LABEL_CONFIG.width - textWidth) / 2;
    doc.text(text, textX, 22);

    // Page logic for 2-up
    if ((col === 1 || i === count - 1) && i < count - 1) {
      doc.addPage();
    }
  }

  doc.save(`etiquetas_${sku.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}


import { GoogleGenAI, Type } from "@google/genai";
import { LabelData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractLabelData(pdfTextContext: string): Promise<LabelData[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analise o texto extraído de um PDF de etiquetas de logística.
    Você deve identificar os produtos e extrair:
    1. O SKU (geralmente 'seller sku:XXXX' ou código alfanumérico curto).
    2. O Barcode (EAN, UPC ou o código numérico/alfanumérico longo que ficaria no código de barras original).
    3. Conte a frequência de cada par único de SKU e Barcode.

    Ignore informações irrelevantes como descrições de produtos ou endereços de armazém.
    
    Texto extraído:
    ${pdfTextContext}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sku: { type: Type.STRING, description: "O código SKU identificado (identificador humano)" },
            barcode: { type: Type.STRING, description: "O código de barras identificado (identificador para leitura do QR Code)" },
            count: { type: Type.INTEGER, description: "A quantidade de ocorrências detectada" }
          },
          required: ["sku", "barcode", "count"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Erro ao parsear resposta do Gemini:", e);
    return [];
  }
}

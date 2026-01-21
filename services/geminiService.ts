
import { GoogleGenAI, Type } from "@google/genai";
import { LabelData } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(pdfTextContext: string, retries = 3, initialDelay = 2000): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analise o texto extraído de um PDF de etiquetas de logística.
        Você deve identificar os produtos e extrair:
        1. O SKU (identificador curto).
        2. O Barcode (código numérico longo para o QR Code).
        3. Conte a frequência de cada par único de SKU e Barcode.

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
                sku: { type: Type.STRING, description: "O código SKU" },
                barcode: { type: Type.STRING, description: "O código de barras/EAN" },
                count: { type: Type.INTEGER, description: "Quantidade total" }
              },
              required: ["sku", "barcode", "count"]
            }
          }
        }
      });
      return response;
    } catch (error: any) {
      const isOverloaded = error?.message?.includes("503") || error?.message?.includes("overloaded") || error?.status === "UNAVAILABLE";
      
      if (isOverloaded && i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini sobrecarregado. Tentando novamente em ${delay}ms... (Tentativa ${i + 1}/${retries})`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}

export async function extractLabelData(pdfTextContext: string): Promise<LabelData[]> {
  try {
    const response = await callGeminiWithRetry(pdfTextContext);
    return JSON.parse(response.text);
  } catch (e: any) {
    console.error("Erro final na extração Gemini:", e);
    throw new Error(e?.message?.includes("503") ? "O servidor do Gemini está muito ocupado agora. Por favor, aguarde 1 minuto e tente novamente." : "Erro ao processar dados com IA.");
  }
}

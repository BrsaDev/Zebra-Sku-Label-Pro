
import { LabelData } from "../types";

export async function extractWithOpenAI(pdfTextContext: string): Promise<LabelData[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em logística. Extraia SKUs e Barcodes (EAN/UPC) de textos de etiquetas. Retorne um array JSON de objetos com as propriedades: sku (string), barcode (string), count (number)."
        },
        {
          role: "user",
          content: `Extraia e conte as ocorrências únicas de SKU e Barcode do seguinte texto:\n\n${pdfTextContext}`
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Erro na API da OpenAI");
  }

  const result = await response.json();
  const content = JSON.parse(result.choices[0].message.content);
  
  // Normalize the response to find the array regardless of the key the AI chose
  const data = Array.isArray(content) ? content : (content.items || content.labels || content.data || Object.values(content)[0]);
  
  if (!Array.isArray(data)) return [];
  return data;
}

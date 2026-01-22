import { LabelData } from "../types";

function extractWithRegex(text: string): LabelData[] {
  const lines = text.split('\n');
  const items: LabelData[] = [];
  
  console.log('📄 Processing lines:', lines.length);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Try multiple patterns for SKU
    let skuMatch = line.match(/seller\s+sku:\s*([A-Z0-9]{3,15})/i);
    
    // If no match, try looser pattern
    if (!skuMatch) {
      skuMatch = line.match(/sku:\s*([A-Z0-9]{3,15})/i);
    }
    
    // If still no match, try just numbers after seller
    if (!skuMatch) {
      skuMatch = line.match(/seller.*?([0-9]{8,15})/);
    }
    
    // Find barcode - more flexible
    const barcodeMatch = line.match(/(\d{12,13})/);
    
    if (skuMatch && barcodeMatch) {
      console.log(`✅ Line ${i + 1}: SKU=${skuMatch[1]}, Barcode=${barcodeMatch[1]}`);
      items.push({
        sku: skuMatch[1],
        barcode: barcodeMatch[1],
        count: 1
      });
    } else {
      if (line.toLowerCase().includes('seller') || line.toLowerCase().includes('sku')) {
        console.log(`⚠️ Line ${i + 1}: ${line} (no match)`);
      }
    }
  }
  
  console.log('🔍 Raw regex matches:', items);
  
  // Aggregate by SKU only
  const aggregated = items.reduce((acc: Record<string, LabelData>, item) => {
    const key = item.sku;
    
    if (!acc[key]) {
      acc[key] = {
        sku: item.sku,
        barcode: item.barcode,
        count: 0
      };
    }
    
    acc[key].count++;
    return acc;
  }, {});
  
  const result = Object.values(aggregated);
  console.log('📊 Aggregated result:', result);
  
  return result;
}

async function callOpenAI(pdfTextContext: string): Promise<LabelData[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  const MAX_RETRIES = 5;
  const INITIAL_DELAY_MS = 20000;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 OpenAI attempt ${attempt}/${MAX_RETRIES}...`);
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          seed: 12345,
          messages: [
              {
                  role: "system",
                  content: `Você é um contador preciso. Extraia e conte SKUs e Barcodes.

FORMATO EXATO:
{"items": [{"sku": "VALOR", "barcode": "VALOR", "count": NÚMERO, "confidence": 95}]}

DEFINIÇÕES:
- SKU: Código após "seller sku:"
- Barcode: Número de 12-13 dígitos

Retorne APENAS JSON.`
              },
              {
                  role: "user",
                  content: `Extraia e conte os SKUs/Barcodes:

${pdfTextContext}`
              }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 429) {
          const delay = INITIAL_DELAY_MS * attempt;
          console.warn(`⏱️ Rate limit hit. Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(error.error?.message || "Erro na API da OpenAI");
      }

      const result = await response.json();
      const content = JSON.parse(result.choices[0].message.content);
      
      const data = content.items || [];
      if (!Array.isArray(data)) return [];
      
      const isValid = data.every(item => 
        typeof item.sku === 'string' && 
        typeof item.barcode === 'string' && 
        typeof item.count === 'number' &&
        typeof item.confidence === 'number' &&
        item.count > 0 &&
        item.confidence >= 95
      );
      
      if (!isValid) {
        console.warn('⚠️ Invalid AI response format');
        return [];
      }
      
      return data.map(item => ({
        sku: item.sku,
        barcode: item.barcode,
        count: item.count
      }));
      
    } catch (error: any) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === MAX_RETRIES) {
        console.error('❌ All retry attempts exhausted');
        return [];
      }
      
      const delay = INITIAL_DELAY_MS * attempt;
      console.log(`⏱️ Waiting ${delay/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return [];
}

export async function extractWithOpenAI(pdfTextContext: string): Promise<LabelData[]> {
  const regexResult = extractWithRegex(pdfTextContext);
  if (regexResult.length > 0) {
    console.log('✅ Regex extraction successful:', regexResult);
    return regexResult;
  }
  
  console.log('⚠️ Regex failed, using AI...');
  
  try {
    const [attempt1, attempt2, attempt3] = await Promise.all([
      callOpenAI(pdfTextContext),
      callOpenAI(pdfTextContext),
      callOpenAI(pdfTextContext)
    ]);
    
    console.log('🔄 Attempt 1:', attempt1);
    console.log('🔄 Attempt 2:', attempt2);
    console.log('🔄 Attempt 3:', attempt3);
    
    const allAttempts = [attempt1, attempt2, attempt3];
    const validAttempts = allAttempts.filter(attempt => attempt.length > 0);
    
    if (validAttempts.length === 0) {
      console.log('❌ All attempts failed');
      return [];
    }
    
    const voteCounts = new Map<string, number>();
    
    validAttempts.forEach(attempt => {
      const signature = JSON.stringify(attempt.map(item => 
        `${item.sku}-${item.barcode}-${item.count}`
      ).sort());
      voteCounts.set(signature, (voteCounts.get(signature) || 0) + 1);
    });
    
    let bestResult = validAttempts[0];
    let maxVotes = 0;
    
    voteCounts.forEach((votes, signature) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        bestResult = validAttempts.find(attempt => 
          JSON.stringify(attempt.map(item => 
            `${item.sku}-${item.barcode}-${item.count}`
          ).sort()) === signature
        ) || validAttempts[0];
      }
    });
    
    const totalItems = bestResult.reduce((sum, item) => sum + item.count, 0);
    console.log(`📊 AI total: ${totalItems} items`);
    
    if (maxVotes >= 2) {
      console.log(`✅ Majority consensus (${maxVotes}/3 votes)`);
    } else {
      console.log('⚠️ No consensus, picking most complete');
    }
    
    return bestResult;
    
  } catch (error) {
    console.error('❌ All AI attempts failed:', error);
    return [];
  }
}

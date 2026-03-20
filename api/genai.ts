import { GoogleGenAI } from "@google/genai";

// === MANUAL REST CLENT UNTUK VERTEX AI EXPRESS MODE ===
// Menjamin pemetaan 1:1 sempurna untuk Curl yang diinstruksikan dokumentasi Cloud
async function callVertexExpress(model: string, contents: any, config: any, apiKey: string) {
  // Vertex AI Express menggunakan aiplatform.googleapis.com (Tanpa format Region atau Project ID)
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;

  const payload: any = { contents };
  
  // Format config jika tersedia
  if (config) {
    if (config.temperature !== undefined || config.responseMimeType || config.responseSchema) {
      payload.generationConfig = {};
      if (config.temperature !== undefined) payload.generationConfig.temperature = config.temperature;
      if (config.responseMimeType) payload.generationConfig.responseMimeType = config.responseMimeType;
      if (config.responseSchema) payload.generationConfig.responseSchema = config.responseSchema;
      if (config.maxOutputTokens) payload.generationConfig.maxOutputTokens = config.maxOutputTokens;
    }
    if (config.systemInstruction) {
       payload.systemInstruction = { parts: [{ text: config.systemInstruction }] };
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex Express Error: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const textResponse = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) throw new Error("Empty response from Vertex Express");
  
  return textResponse;
}

// === VERCEL SERVERLESS FUNCTION ===
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { action, payload } = req.body;
  if (!action || !payload) return res.status(400).json({ error: 'Missing action or payload' });

  try {
    const env = process.env as any;
    const useVertexExpress = env.VITE_USE_VERTEX_EXPRESS === 'true';
    const vertexApiKey = env.VITE_VERTEX_API_KEY;
    const aiStudioKey = payload.apiKey || process.env.GEMINI_API_KEY;

    let { modelName, contents, parts, responseSchema, temperature, systemInstruction, maxOutputTokens } = payload;
    let model = modelName || 'gemini-1.5-flash';

    // Standarisasi form content (Menangani masalah INVALID_ARGUMENT role user/model)
    const requestContents = contents || [{ role: 'user', parts }];

    // Siapkan parameter GenerationConfig yang spesifik dari sistem kita
    let config: any = {};
    if (action === 'generateQuizBatch') {
       config = { responseMimeType: "application/json", responseSchema, temperature: temperature || 0.5, maxOutputTokens: maxOutputTokens || 8192 };
    } else if (action === 'chat') {
       config = { systemInstruction, temperature: temperature || 0.3 };
    }

    let result;

    // STRATEGI ROUTING 1: VERTEX AI EXPRESS
    if (useVertexExpress && vertexApiKey) {
      console.log(`[Backend API] Routing via Vertex AI Express Mode -> ${model}`);
      // Model khusus preview seringkali membutuhkan pemanggilan eksplisit pada REST manual
      if (model.includes('gemini-3')) model = 'gemini-3-flash-preview';
      
      result = await callVertexExpress(model, requestContents, Object.keys(config).length > 0 ? config : null, vertexApiKey);
    } 
    // STRATEGI ROUTING 2: GOOGLE AI STUDIO (FALLBACK/STANDARD)
    else if (aiStudioKey) {
      console.log(`[Backend API] Routing via standard Google AI Studio -> ${model}`);
      const ai = new GoogleGenAI({ apiKey: aiStudioKey });
      const response = await ai.models.generateContent({
        model,
        contents: requestContents,
        config: Object.keys(config).length > 0 ? config : undefined
      });
      result = response.text;
    } 
    else {
      return res.status(401).json({ error: 'Belum ada API Key (Vertex maupun AI Studio) yang dikonfigurasi di Server.' });
    }

    // Response Sukses
    return res.status(200).json({ result });

  } catch (error: any) {
    console.error("Vercel API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}

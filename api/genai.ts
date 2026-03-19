import { GoogleGenAI } from "@google/genai";

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // Hanya menerima metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, payload } = req.body;

  if (!action || !payload) {
    return res.status(400).json({ error: 'Missing action or payload' });
  }

  try {
    // 1. Inisialisasi GoogleGenAI (Berjalan aman di Server Vercel)
    const isVertexAIEnabled = process.env.VITE_USE_VERTEX_AI === 'true';
    let ai: GoogleGenAI;

    if (isVertexAIEnabled && process.env.VITE_GCP_PROJECT_ID) {
      const project = process.env.VITE_GCP_PROJECT_ID;
      const location = process.env.VITE_GCP_LOCATION || 'us-central1';
      
      console.log("[Backend] Initializing Vertex AI client...");

      ai = new GoogleGenAI({
        vertexai: true,
        project,
        location
      });
    } else {
      // Fallback Google AI Studio
      const apiKey = payload.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: 'API Key Gemini belum diatur' });
      }
      ai = new GoogleGenAI({ apiKey });
    }

    // 2. Routing berdasarkan Action
    let result;

    if (action === 'summarize') {
      const { modelName, parts } = payload;
      const response = await ai.models.generateContent({
        model: modelName || 'gemini-3-flash-preview',
        contents: { parts }
      });
      result = response.text;

    } else if (action === 'generateQuizBatch') {
      const { modelName, parts, responseSchema, temperature } = payload;
      const response = await ai.models.generateContent({
        model: modelName || 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: temperature || 0.5,
        }
      });
      result = response.text;

    } else if (action === 'chat') {
      const { modelName, parts, systemInstruction, temperature } = payload;
      const response = await ai.models.generateContent({
        model: modelName || 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          systemInstruction,
          temperature: temperature || 0.3,
        }
      });
      result = response.text;

    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    // 3. Kembalikan hasil ke Client
    return res.status(200).json({ result });

  } catch (error: any) {
    console.error("Vercel API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}

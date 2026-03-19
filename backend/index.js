import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
// Enable CORS for frontend requests
app.use(cors());
// Increase payload limit to 50MB (though Cloud Run's proxy limit is typically 32MB)
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 8080;

app.post('/genai', async (req, res) => {
  const { action, payload } = req.body;

  if (!action || !payload) {
    return res.status(400).json({ error: 'Missing action or payload' });
  }

  try {
    const isVertexAIEnabled = process.env.VITE_USE_VERTEX_AI === 'true';
    let ai;

    if (isVertexAIEnabled) {
      if (process.env.VITE_VERTEX_API_KEY) {
        console.log("[Backend] Initializing Vertex AI client (Express Mode)...");
        ai = new GoogleGenAI({
          vertexai: true,
          apiKey: process.env.VITE_VERTEX_API_KEY
        });
      } else if (process.env.VITE_GCP_PROJECT_ID) {
        const project = process.env.VITE_GCP_PROJECT_ID;
        
        // Force 'global' location for Gemini 3 Preview model
        const isGemini3 = payload.modelName === 'gemini-3-flash-preview';
        const location = isGemini3 ? 'global' : (process.env.VITE_GCP_LOCATION || 'us-central1');
  
        console.log(`[Backend] Initializing Vertex AI client in Standard Mode (${location})...`);
        ai = new GoogleGenAI({
          vertexai: true,
          project,
          location
        });
      } else {
        return res.status(401).json({ error: 'Proyek ID atau API Key Vertex AI belum diatur' });
      }
    } else {
      const apiKey = payload.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: 'API Key Gemini belum diatur' });
      }
      ai = new GoogleGenAI({ apiKey });
    }

    let result;

    if (action === 'summarize') {
      const { modelName, parts } = payload;
      const model = modelName === 'gemini-3-flash-preview' ? modelName : ((modelName && modelName.includes('gemini-3')) ? 'gemini-2.0-flash' : (modelName || 'gemini-1.5-flash'));
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts }
      });
      result = response.text;

    } else if (action === 'generateQuizBatch') {
      const { modelName, parts, responseSchema, temperature } = payload;
      const model = modelName === 'gemini-3-flash-preview' ? modelName : ((modelName && modelName.includes('gemini-3')) ? 'gemini-2.0-flash' : (modelName || 'gemini-1.5-flash'));
      const response = await ai.models.generateContent({
        model: model,
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
      const model = modelName === 'gemini-3-flash-preview' ? modelName : ((modelName && modelName.includes('gemini-3')) ? 'gemini-2.0-flash' : (modelName || 'gemini-1.5-flash'));
      const response = await ai.models.generateContent({
        model: model,
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

    return res.status(200).json({ result });

  } catch (error) {
    console.error("Cloud Run API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

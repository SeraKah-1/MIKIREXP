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

    if (isVertexAIEnabled && process.env.VITE_GCP_PROJECT_ID) {
      const project = process.env.VITE_GCP_PROJECT_ID;
      const location = process.env.VITE_GCP_LOCATION || 'us-central1';
      const vertexKey = process.env.VITE_VERTEX_API_KEY || payload.apiKey;

      ai = new GoogleGenAI({
        vertexai: true,
        project,
        location,
        ...(vertexKey && { apiKey: vertexKey })
      });
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

    return res.status(200).json({ result });

  } catch (error) {
    console.error("Cloud Run API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

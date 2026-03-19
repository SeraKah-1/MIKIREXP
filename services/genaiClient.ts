
/**
 * ==========================================
 * GENAI CLIENT FACTORY
 * ==========================================
 * Centralized factory for GoogleGenAI initialization.
 * 
 * PRIORITY:
 *   1. Vertex AI (jika VITE_USE_VERTEX_AI=true + GCP config lengkap)
 *   2. Google AI Studio (fallback, jika ada API Key)
 * 
 * Environment Variables:
 *   VITE_USE_VERTEX_AI=true/false
 *   VITE_GCP_PROJECT_ID=your-project-id
 *   VITE_GCP_LOCATION=us-central1
 */

import { GoogleGenAI } from "@google/genai";

// --- Provider Status ---

export type GenAIProvider = 'vertex-ai' | 'google-ai-studio';

interface ProviderStatus {
  provider: GenAIProvider;
  label: string;
  emoji: string;
  detail: string;
}

let _activeProvider: ProviderStatus | null = null;

/**
 * Returns info about which provider is currently active.
 * Call this after createGenAIClient() has been invoked at least once.
 */
export function getActiveProvider(): ProviderStatus | null {
  return _activeProvider;
}

/**
 * Returns true if Vertex AI is configured and enabled.
 */
export function isVertexAIEnabled(): boolean {
  return import.meta.env.VITE_USE_VERTEX_AI === 'true';
}

/**
 * Checks if Vertex AI is fully configured (flag + project ID).
 */
function isVertexAIReady(): boolean {
  return isVertexAIEnabled() && !!import.meta.env.VITE_GCP_PROJECT_ID;
}

/**
 * Creates a GoogleGenAI client with automatic provider selection.
 * 
 * Priority:
 *   1. Vertex AI — jika VITE_USE_VERTEX_AI=true dan GCP config lengkap
 *   2. Google AI Studio — fallback menggunakan API Key biasa
 */
export function createGenAIClient(apiKey?: string): GoogleGenAI {
  
  // --- PRIORITY 1: Vertex AI ---
  if (isVertexAIReady()) {
    const project = process.env.VITE_GCP_PROJECT_ID;
    const location = process.env.VITE_GCP_LOCATION || 'us-central1';
    
    // Gunakan VITE_VERTEX_API_KEY dari .env (sesuai request: process.env), atau fallback ke apiKey dari argumen/UI
    const vertexKey = process.env.VITE_VERTEX_API_KEY || apiKey;

    if (vertexKey) {
      _activeProvider = {
        provider: 'vertex-ai',
        label: '☁️ Vertex AI',
        emoji: '☁️',
        detail: `Project: ${project} | Region: ${location}`,
      };

      console.log(
        `%c[GenAI] ☁️ Vertex AI Active %c(project: ${project}, region: ${location})`,
        'color: #4285F4; font-weight: bold;',
        'color: #888;'
      );

      // Match user snippet exactly
      return new GoogleGenAI({ 
        vertexai: true, 
        project: process.env.VITE_GCP_PROJECT_ID, 
        location: process.env.VITE_GCP_LOCATION || 'us-central1', 
        apiKey: process.env.VITE_VERTEX_API_KEY || apiKey
      });
    } else {
      console.warn(
        `%c[GenAI] ⚠️ Vertex AI dikonfigurasi tapi API Key kosong. Fallback ke Google AI Studio...`,
        'color: #FBBC04; font-weight: bold;'
      );
    }
  }

  // --- PRIORITY 2: Google AI Studio (Fallback) ---
  if (!apiKey) {
    throw new Error("API Key Gemini belum diatur. Masukkan di Settings atau Environment Variables.");
  }

  _activeProvider = {
    provider: 'google-ai-studio',
    label: '🔑 Google AI Studio',
    emoji: '🔑',
    detail: 'Direct API Key',
  };

  console.log(
    `%c[GenAI] 🔑 Google AI Studio Active %c(API Key)`,
    'color: #34A853; font-weight: bold;',
    'color: #888;'
  );

  return new GoogleGenAI({ apiKey });
}

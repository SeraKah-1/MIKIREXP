/// <reference types="vite/client" />

declare var process: {
  env: {
    API_KEY?: string;
    GEMINI_API_KEY?: string;
    VITE_USE_VERTEX_AI?: string;
    VITE_GCP_PROJECT_ID?: string;
    VITE_GCP_LOCATION?: string;
    VITE_VERTEX_API_KEY?: string;
  }
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ExperimentalSettingsProvider } from './contexts/ExperimentalSettingsContext';
import { CameraProvider } from './contexts/CameraContext';
import { isVertexAIEnabled } from './services/genaiClient';

// --- Startup Provider Banner ---
console.log(
  `%c🧠 MIKIR APP %c${isVertexAIEnabled() ? '☁️ Vertex AI (Primary)' : '🔑 Google AI Studio'}`,
  'background: #1a1a2e; color: #e94560; padding: 8px 12px; font-size: 14px; font-weight: bold; border-radius: 6px 0 0 6px;',
  `background: ${isVertexAIEnabled() ? '#4285F4' : '#34A853'}; color: white; padding: 8px 12px; font-size: 14px; font-weight: bold; border-radius: 0 6px 6px 0;`
);
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ExperimentalSettingsProvider>
      <CameraProvider>
        <App />
      </CameraProvider>
    </ExperimentalSettingsProvider>
  </React.StrictMode>
);
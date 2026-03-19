import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ExperimentalSettingsProvider } from './contexts/ExperimentalSettingsContext';
import { CameraProvider } from './contexts/CameraContext';

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
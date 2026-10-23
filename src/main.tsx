import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/main.css';
import { App } from '@/app/app';
import { registerPwaServiceWorker } from '@/pwa';
import { setupChunkErrorListener } from '@/app/errors/chunk-error-listener';

setupChunkErrorListener();
registerPwaServiceWorker();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '[main] No se encontró el elemento #root en el DOM. ' +
      'Verifica que index.html contiene <div id="root"></div>.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

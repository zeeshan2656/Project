import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { SiteProvider } from './context/SiteContext';
import { SocketProvider } from './context/SocketContext';
import { registerSW } from './registerServiceWorker';

import { ErrorBoundary } from './components/ErrorBoundary';

// Initialize PWA Service Worker
registerSW();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <SiteProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </SiteProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

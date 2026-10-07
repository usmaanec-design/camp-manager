import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { dataResetService } from './services/dataResetService';

// Ensure legacy mock data is purged for real data testing
dataResetService.ensureCleanRealDataState();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

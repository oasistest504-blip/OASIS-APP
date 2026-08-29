import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ProveedorAuth } from './context/AuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProveedorAuth>
      <App />
    </ProveedorAuth>
  </React.StrictMode>,
);

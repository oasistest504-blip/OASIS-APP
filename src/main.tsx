import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ProveedorAuth } from './context/AuthContext';
import { ProveedorDatos } from './context/DatosContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProveedorAuth>
      <ProveedorDatos>
        <App />
      </ProveedorDatos>
    </ProveedorAuth>
  </React.StrictMode>,
);

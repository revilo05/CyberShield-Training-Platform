import React from 'react';
import ReactDOM from 'react-dom/client';
import { CyberShieldApp } from './CyberShieldApp';
import './styles-v2.css';
import { EnterpriseIdentity } from './auth/EnterpriseIdentity';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EnterpriseIdentity><CyberShieldApp /></EnterpriseIdentity>
  </React.StrictMode>
);

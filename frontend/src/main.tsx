import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/base.css';
import './styles/components.css';
import './styles/admin.css';
import './styles/member.css';

// Pick the panel theme before the first paint (layouts keep it updated afterwards).
document.body.dataset.theme = window.location.pathname.startsWith('/admin') ? 'admin' : 'member';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

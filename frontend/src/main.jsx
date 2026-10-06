import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
/* New teal design system — must load before legacy index.css */
import './styles/index.css';
/* Legacy CSS — kept until Phase 5 cleanup */
import './index.css';
import AppRouter from './router.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/styles/global.css';
import { App } from './App';
import { useThemeStore } from '@/stores/themeStore';

// Apply persisted theme before first paint to prevent FOUC
useThemeStore.getState().set(useThemeStore.getState().theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

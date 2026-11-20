import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import i18n, { loadLanguage } from './i18n/index';

// Load the visitor's language chunk before the first paint so a /de/... page
// never flashes Albanian text. If the chunk fails, render anyway — every key
// falls back to Albanian.
loadLanguage(i18n.language)
  .catch(() => {})
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('app')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });

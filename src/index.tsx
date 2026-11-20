import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import i18n, { loadLanguage } from './i18n/index';
import { APP_READY_EVENT } from './lib/appReady';

/**
 * Prerendered pages (scripts/prerender.mjs) arrive with the finished HTML in
 * #app. Rendering React straight into it would flash the lazy-route spinner,
 * so React renders into an invisible sibling and takes over once the page
 * content has mounted (or after a safety timeout).
 */
function mount() {
  const staticRoot = document.getElementById('app')!;
  if (!staticRoot.hasChildNodes()) {
    ReactDOM.createRoot(staticRoot).render(<React.StrictMode><App /></React.StrictMode>);
    return;
  }

  const live = document.createElement('div');
  live.setAttribute('aria-hidden', 'true');
  live.style.cssText = 'position:absolute;top:0;left:0;right:0;visibility:hidden;pointer-events:none;';
  staticRoot.after(live);

  let swapped = false;
  const swap = () => {
    if (swapped) return;
    swapped = true;
    window.removeEventListener(APP_READY_EVENT, swap);
    const y = window.scrollY;
    staticRoot.remove();
    live.removeAttribute('aria-hidden');
    live.style.cssText = '';
    live.id = 'app';
    window.scrollTo(0, y);
  };
  window.addEventListener(APP_READY_EVENT, swap);
  window.setTimeout(swap, 6000);

  ReactDOM.createRoot(live).render(<React.StrictMode><App /></React.StrictMode>);
}

// Load the visitor's language chunk before the first paint so a /de/... page
// never flashes Albanian text. If the chunk fails, render anyway — every key
// falls back to Albanian.
loadLanguage(i18n.language)
  .catch(() => {})
  .finally(mount);

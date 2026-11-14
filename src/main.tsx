import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function waitForAppStylesheet(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const link = document.querySelector<HTMLLinkElement>('link[data-app-css]');
  if (!link || link.media === 'all' || link.sheet) {
    if (link && link.media !== 'all') link.media = 'all';
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const done = () => {
      if (link.media !== 'all') link.media = 'all';
      resolve();
    };
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    window.setTimeout(done, 1500);
  });
}

function scheduleServiceWorkerRegistration(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const register = () => {
    import('virtual:pwa-register')
      .then(({ registerSW }) => registerSW({ immediate: false }))
      .catch(() => {
        // Ignore registration errors in restricted preview environments
      });
  };

  const triggerIdle = () => {
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(register, { timeout: 2500 });
    } else {
      window.setTimeout(register, 1200);
    }
  };

  if (document.readyState === 'complete') {
    triggerIdle();
  } else {
    window.addEventListener('load', triggerIdle, { once: true });
  }
}

waitForAppStylesheet().then(() => {
  createRoot(document.getElementById('root')!).render(<App />);
  scheduleServiceWorkerRegistration();
});

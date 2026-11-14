import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const DEV_HMR_SHIM_SCRIPT = `<script data-dev-hmr-shim>
      (function () {
        if (typeof window !== 'undefined' && window.WebSocket) {
          var OrigWebSocket = window.WebSocket;
          var DummyWebSocket = function (url, protocols) {
            var isHmr =
              protocols === 'vite-hmr' ||
              (Array.isArray(protocols) && protocols.indexOf('vite-hmr') !== -1) ||
              (typeof url === 'string' && (url.indexOf('vite') !== -1 || url.indexOf('hmr') !== -1));

            if (isHmr) {
              var target = new EventTarget();
              target.binaryType = 'blob';
              target.readyState = 1;
              target.url = url;
              target.protocol = 'vite-hmr';
              target.extensions = '';
              target.bufferedAmount = 0;
              target.send = function () {};
              target.close = function () {};
              target.onopen = null;
              target.onclose = null;
              target.onerror = null;
              target.onmessage = null;
              target.CONNECTING = 0;
              target.OPEN = 1;
              target.CLOSING = 2;
              target.CLOSED = 3;

              setTimeout(function () {
                var openEvt = new Event('open');
                if (typeof target.onopen === 'function') target.onopen(openEvt);
                target.dispatchEvent(openEvt);
              }, 10);

              return target;
            }

            return new OrigWebSocket(url, protocols);
          };

          DummyWebSocket.CONNECTING = 0;
          DummyWebSocket.OPEN = 1;
          DummyWebSocket.CLOSING = 2;
          DummyWebSocket.CLOSED = 3;
          DummyWebSocket.prototype = OrigWebSocket.prototype;
          window.WebSocket = DummyWebSocket;
        }

        function isViteWsError(str) {
          if (!str || typeof str !== 'string') return false;
          return (
            str.indexOf('WebSocket') !== -1 ||
            str.indexOf('websocket') !== -1 ||
            str.indexOf('[vite]') !== -1 ||
            str.indexOf('vite') !== -1
          );
        }

        window.onerror = function (msg, source, lineno, colno, error) {
          var text = (msg || '') + ' ' + (source || '') + ' ' + (error && error.message ? error.message : '');
          if (isViteWsError(text)) return true;
        };

        window.addEventListener('error', function (e) {
          var msg = (e && (e.message || (e.error && e.error.message))) || '';
          if (isViteWsError(msg)) {
            if (e.preventDefault) e.preventDefault();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            return true;
          }
        }, true);

        window.addEventListener('unhandledrejection', function (e) {
          var reason = e && e.reason;
          var msg = typeof reason === 'string' ? reason : (reason && (reason.message || String(reason))) || '';
          if (isViteWsError(msg)) {
            if (e.preventDefault) e.preventDefault();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          }
        }, true);

        var origError = console.error;
        console.error = function () {
          for (var i = 0; i < arguments.length; i++) {
            var arg = arguments[i];
            var str = typeof arg === 'string' ? arg : (arg && (arg.message || String(arg))) || '';
            if (isViteWsError(str)) return;
          }
          return origError.apply(console, arguments);
        };
      })();
    </script>`;

export default defineConfig(({ mode }) => {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-dev-hmr-shim',
        apply: 'serve',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            if (mode !== 'development') return html;
            return html.replace(
              '<meta name="theme-color"',
              `${DEV_HMR_SHIM_SCRIPT}\n    <meta name="theme-color"`
            );
          },
        },
      },
      {
        name: 'optimize-html-build',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler(html) {
            return html.replace(
              /<link rel="stylesheet"([^>]*href="\/assets\/[^"]+\.css"[^>]*)>/gi,
              '<link rel="preload" as="style"$1><link rel="stylesheet"$1 media="print" onload="this.media=\'all\'" data-app-css><noscript><link rel="stylesheet"$1></noscript>'
            );
          },
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: '이룸 (eerum) - 디지털 명함 스튜디오',
          short_name: '이룸 (eerum)',
          description: '서버에 남지 않는 온디바이스 암호화 프라이빗 디지털 명함 스튜디오',
          theme_color: '#0A0A0B',
          background_color: '#0A0A0B',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          lang: 'ko',
          categories: ['business', 'productivity', 'utilities'],
          prefer_related_applications: false,
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('/node_modules/react/') ||
                id.includes('/node_modules/react-dom/') ||
                id.includes('/node_modules/scheduler/')
              ) {
                return 'vendor-react';
              }
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

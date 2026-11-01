import React, { useMemo, useEffect, useState } from 'react';
import { sanitizeHtml } from '../utils/sanitizeHtml';

interface SandboxedCardRendererProps {
  html: string;
  isPortrait?: boolean;
  isPrintPreview?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function extractParentStyles(): string {
  if (typeof document === 'undefined') return '';
  try {
    return Array.from(document.querySelectorAll('style'))
      .map((node) => node.textContent || '')
      .filter(Boolean)
      .join('\n')
      .replace(/<\/style/gi, '<\\/style');
  } catch {
    return '';
  }
}

/**
 * SandboxedCardRenderer
 *
 * Dual-layer XSS & mXSS defense for user-provided custom HTML / Tailwind cards
 * across both interactive screen rendering and print/PDF rendering (`isPrintPreview`):
 * 1. Layer 1: Unified strict DOMPurify allowlist sanitization (`sanitizeHtml`) blocking
 *    scripts, iframes, objects, event handlers, and unsafe inline CSS/URI payloads.
 * 2. Layer 2: Mandatory opaque-origin sandboxed `<iframe>` (`sandbox=""`) + strict
 *    Content-Security-Policy meta tag in ALL modes (including print preview), ensuring
 *    sanitized markup is never injected into the host document via `dangerouslySetInnerHTML`.
 */
export const SandboxedCardRenderer: React.FC<SandboxedCardRendererProps> = ({
  html,
  isPortrait = false,
  isPrintPreview = false,
  className = '',
  style = {},
}) => {
  const [parentCss, setParentCss] = useState<string>(() => extractParentStyles());

  useEffect(() => {
    setParentCss(extractParentStyles());
  }, [html, isPrintPreview]);

  const sanitized = useMemo(() => {
    return sanitizeHtml(html);
  }, [html]);

  const srcDocContent = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; style-src 'unsafe-inline'; img-src https: http: data:; font-src https: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      html, body, * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    ${parentCss}
  </style>
</head>
<body class="w-full h-full select-none flex items-center justify-center bg-transparent">
  ${sanitized}
</body>
</html>`;
  }, [sanitized, parentCss]);

  // Safe React structural fallback when custom HTML is empty (zero raw HTML injection)
  if (!sanitized.trim()) {
    return (
      <div
        aria-hidden="true"
        data-orientation={isPortrait ? 'portrait' : 'landscape'}
        className={`w-full h-full overflow-hidden bg-[#121214] ${className}`}
        style={style}
      />
    );
  }

  return (
    <iframe
      title="Secure Business Card Renderer"
      sandbox=""
      srcDoc={srcDocContent}
      data-orientation={isPortrait ? 'portrait' : 'landscape'}
      className={`w-full h-full border-0 pointer-events-none select-none block bg-transparent ${className}`}
      style={style}
      loading={isPrintPreview ? 'eager' : 'lazy'}
    />
  );
};

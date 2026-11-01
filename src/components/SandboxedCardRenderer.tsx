import React, { useMemo, useEffect, useState } from 'react';
import { sanitizeHtml } from '../utils/sanitizeHtml';

interface SandboxedCardRendererProps {
  html: string;
  isPortrait?: boolean;
  isPrintPreview?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SandboxedCardRenderer
 * 
 * Dual-layer XSS defense for user-provided custom HTML / Tailwind cards:
 * 1. Layer 1: Unified strict DOMPurify allowlist sanitization (`sanitizeHtml`) blocking
 *    scripts, iframes, objects, event handlers, and unsafe inline CSS/URI payloads.
 * 2. Layer 2: Sandboxed <iframe> with `sandbox=""` + strict Content-Security-Policy meta tag
 *    restricting script execution, same-origin access, forms, objects, and network exfiltration.
 */
export const SandboxedCardRenderer: React.FC<SandboxedCardRendererProps> = ({
  html,
  isPortrait = false,
  isPrintPreview = false,
  className = '',
  style = {}
}) => {
  const [parentCss, setParentCss] = useState<string>('');

  // Extract Tailwind stylesheet rules from parent DOM to render inside sandbox without external requests
  useEffect(() => {
    if (typeof document === 'undefined') return;
    try {
      const styles = Array.from(document.querySelectorAll('style'))
        .map((node) => node.textContent || '')
        .filter(Boolean)
        .join('\n')
        .replace(/<\/style/gi, '<\\/style');
      setParentCss(styles);
    } catch {
      // Quiet fail-safe: minimal baseline fallback styles
    }
  }, []);

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
    }
    ${parentCss}
  </style>
</head>
<body class="w-full h-full select-none flex items-center justify-center bg-transparent">
  ${sanitized}
</body>
</html>`;
  }, [sanitized, parentCss]);

  // For print preview, also support direct sanitized markup with zero scripts
  if (isPrintPreview) {
    return (
      <div
        className={`w-full h-full overflow-hidden ${className}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  return (
    <iframe
      title="Secure Business Card Renderer"
      sandbox=""
      srcDoc={srcDocContent}
      className={`w-full h-full border-0 pointer-events-none select-none block ${className}`}
      style={{
        ...style,
        backgroundColor: 'transparent',
      }}
      loading="lazy"
    />
  );
};

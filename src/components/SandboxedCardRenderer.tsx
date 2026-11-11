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
  const chunks: string[] = [];
  try {
    // 1. From all <style> elements
    document.querySelectorAll('style').forEach((node) => {
      const text = node.textContent?.trim();
      if (text) chunks.push(text);
    });

    // 2. From all document.styleSheets (including <link rel="stylesheet">)
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            chunks.push(rules[j].cssText);
          }
        }
      } catch {
        // Cross-origin stylesheet access may throw security error; ignore safely
      }
    }
  } catch {
    // ignore
  }
  return chunks.join('\n').replace(/<\/style/gi, '<\\/style');
}

/**
 * Built-in baseline Tailwind utility CSS for custom business card rendering.
 * Guarantees that card padding (.p-7, .p-6, .p-5, etc.), margins, typography,
 * aspect ratios, and flexbox structures render with 100% fidelity inside the sandbox.
 */
const BUILTIN_CARD_UTILITIES_CSS = `
*, ::before, ::after { box-sizing: border-box; }
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

/* Padding utilities */
.p-0 { padding: 0 !important; }
.p-1 { padding: 0.25rem !important; }
.p-1\\.5 { padding: 0.375rem !important; }
.p-2 { padding: 0.5rem !important; }
.p-2\\.5 { padding: 0.625rem !important; }
.p-3 { padding: 0.75rem !important; }
.p-3\\.5 { padding: 0.875rem !important; }
.p-4 { padding: 1rem !important; }
.p-5 { padding: 1.25rem !important; }
.p-6 { padding: 1.5rem !important; }
.p-7 { padding: 1.75rem !important; }
.p-8 { padding: 2rem !important; }
.p-9 { padding: 2.25rem !important; }
.p-10 { padding: 2.5rem !important; }
.p-12 { padding: 3rem !important; }

.px-0 { padding-left: 0 !important; padding-right: 0 !important; }
.px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
.px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
.px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
.px-3\\.5 { padding-left: 0.875rem !important; padding-right: 0.875rem !important; }
.px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
.px-5 { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
.px-6 { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
.px-7 { padding-left: 1.75rem !important; padding-right: 1.75rem !important; }
.px-8 { padding-left: 2rem !important; padding-right: 2rem !important; }

.py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
.py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
.py-1\\.5 { padding-top: 0.375rem !important; padding-bottom: 0.375rem !important; }
.py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
.py-2\\.5 { padding-top: 0.625rem !important; padding-bottom: 0.625rem !important; }
.py-3 { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
.py-3\\.5 { padding-top: 0.875rem !important; padding-bottom: 0.875rem !important; }
.py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
.py-5 { padding-top: 1.25rem !important; padding-bottom: 1.25rem !important; }
.py-6 { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }
.py-7 { padding-top: 1.75rem !important; padding-bottom: 1.75rem !important; }
.py-8 { padding-top: 2rem !important; padding-bottom: 2rem !important; }

.pt-0 { padding-top: 0 !important; }
.pt-1 { padding-top: 0.25rem !important; }
.pt-1\\.5 { padding-top: 0.375rem !important; }
.pt-2 { padding-top: 0.5rem !important; }
.pt-2\\.5 { padding-top: 0.625rem !important; }
.pt-3 { padding-top: 0.75rem !important; }
.pt-3\\.5 { padding-top: 0.875rem !important; }
.pt-4 { padding-top: 1rem !important; }
.pt-5 { padding-top: 1.25rem !important; }
.pt-6 { padding-top: 1.5rem !important; }
.pt-7 { padding-top: 1.75rem !important; }
.pt-8 { padding-top: 2rem !important; }

.pb-0 { padding-bottom: 0 !important; }
.pb-1 { padding-bottom: 0.25rem !important; }
.pb-2 { padding-bottom: 0.5rem !important; }
.pb-3 { padding-bottom: 0.75rem !important; }
.pb-4 { padding-bottom: 1rem !important; }
.pb-5 { padding-bottom: 1.25rem !important; }
.pb-6 { padding-bottom: 1.5rem !important; }

/* Margin scale */
.m-0 { margin: 0 !important; }
.mt-0\\.5 { margin-top: 0.125rem !important; }
.mt-1 { margin-top: 0.25rem !important; }
.mt-1\\.5 { margin-top: 0.375rem !important; }
.mt-2 { margin-top: 0.5rem !important; }
.mt-3 { margin-top: 0.75rem !important; }
.mt-4 { margin-top: 1rem !important; }
.mb-0\\.5 { margin-bottom: 0.125rem !important; }
.mb-1 { margin-bottom: 0.25rem !important; }
.mb-1\\.5 { margin-bottom: 0.375rem !important; }
.mb-2 { margin-bottom: 0.5rem !important; }
.mb-3 { margin-bottom: 0.75rem !important; }
.mb-4 { margin-bottom: 1rem !important; }

/* Sizing & Aspect Ratio */
.w-full { width: 100% !important; }
.h-full { height: 100% !important; }
.w-auto { width: auto !important; }
.h-auto { height: auto !important; }
.w-8 { width: 2rem !important; }
.h-8 { height: 2rem !important; }
.w-9 { width: 2.25rem !important; }
.h-9 { height: 2.25rem !important; }
.w-10 { width: 2.5rem !important; }
.h-10 { height: 2.5rem !important; }
.aspect-\\[1\\.586\\/1\\], .aspect-\\[1\\.586\\] { aspect-ratio: 1.586 / 1 !important; }
.aspect-\\[9\\/5\\] { aspect-ratio: 9 / 5 !important; }
.aspect-\\[5\\/8\\] { aspect-ratio: 5 / 8 !important; }

/* Flexbox & Layout */
.block { display: block !important; }
.inline-block { display: inline-block !important; }
.flex { display: flex !important; }
.inline-flex { display: inline-flex !important; }
.flex-col { flex-direction: column !important; }
.flex-row { flex-direction: row !important; }
.justify-between { justify-content: space-between !important; }
.justify-center { justify-content: center !important; }
.justify-start { justify-content: flex-start !important; }
.justify-end { justify-content: flex-end !important; }
.items-start { align-items: flex-start !important; }
.items-center { align-items: center !important; }
.items-end { align-items: flex-end !important; }
.items-stretch { align-items: stretch !important; }

.space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem !important; }
.space-y-1\\.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.375rem !important; }
.space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem !important; }
.space-y-2\\.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.625rem !important; }
.space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem !important; }
.space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem !important; }

.gap-1 { gap: 0.25rem !important; }
.gap-1\\.5 { gap: 0.375rem !important; }
.gap-2 { gap: 0.5rem !important; }
.gap-2\\.5 { gap: 0.625rem !important; }
.gap-3 { gap: 0.75rem !important; }
.gap-4 { gap: 1rem !important; }

/* Positioning & Overflow */
.relative { position: relative !important; }
.absolute { position: absolute !important; }
.inset-0 { inset: 0 !important; }
.overflow-hidden { overflow: hidden !important; }
.select-none { user-select: none !important; }

/* Borders & Rounded */
.border { border-width: 1px !important; border-style: solid !important; }
.border-0 { border-width: 0 !important; }
.border-t { border-top-width: 1px !important; border-top-style: solid !important; }
.border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; }
.border-l { border-left-width: 1px !important; border-left-style: solid !important; }
.border-r { border-right-width: 1px !important; border-right-style: solid !important; }
.border-white\\/10 { border-color: rgba(255, 255, 255, 0.1) !important; }
.border-white\\/\\[0\\.08\\] { border-color: rgba(255, 255, 255, 0.08) !important; }
.border-white\\/\\[0\\.06\\] { border-color: rgba(255, 255, 255, 0.06) !important; }
.border-white\\/20 { border-color: rgba(255, 255, 255, 0.2) !important; }
.border-white\\/30 { border-color: rgba(255, 255, 255, 0.3) !important; }

.rounded-lg { border-radius: 0.5rem !important; }
.rounded-xl { border-radius: 0.75rem !important; }
.rounded-2xl { border-radius: 1rem !important; }
.rounded-3xl { border-radius: 1.5rem !important; }
.rounded-full { border-radius: 9999px !important; }

/* Colors */
.bg-\\[\\#121214\\] { background-color: #121214 !important; }
.bg-\\[\\#161618\\] { background-color: #161618 !important; }
.bg-\\[\\#0A0A0B\\] { background-color: #0A0A0B !important; }
.bg-\\[\\#F5F2EC\\] { background-color: #F5F2EC !important; }
.bg-\\[\\#F5F5F4\\] { background-color: #F5F5F4 !important; }
.bg-white\\/\\[0\\.02\\] { background-color: rgba(255, 255, 255, 0.02) !important; }
.bg-white\\/\\[0\\.04\\] { background-color: rgba(255, 255, 255, 0.04) !important; }
.bg-white\\/\\[0\\.05\\] { background-color: rgba(255, 255, 255, 0.05) !important; }
.bg-white\\/10 { background-color: rgba(255, 255, 255, 0.1) !important; }

.text-\\[\\#F2F2F5\\] { color: #F2F2F5 !important; }
.text-\\[\\#F4F4F6\\] { color: #F4F4F6 !important; }
.text-\\[\\#EAEAE6\\] { color: #EAEAE6 !important; }
.text-\\[\\#121214\\] { color: #121214 !important; }
.text-white { color: #ffffff !important; }
.text-zinc-300 { color: #d4d4d8 !important; }
.text-zinc-400 { color: #a1a1aa !important; }
.text-zinc-500 { color: #71717a !important; }

/* Typography */
.text-\\[9px\\] { font-size: 9px !important; }
.text-\\[10px\\] { font-size: 10px !important; }
.text-\\[11px\\] { font-size: 11px !important; }
.text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
.text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
.text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
.text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
.text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
.text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; }

.font-sans { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important; }
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
.font-serif { font-family: 'Cinzel', Georgia, serif !important; }

.font-normal { font-weight: 400 !important; }
.font-medium { font-weight: 500 !important; }
.font-semibold { font-weight: 600 !important; }
.font-bold { font-weight: 700 !important; }

.tracking-tight { letter-spacing: -0.025em !important; }
.tracking-normal { letter-spacing: 0 !important; }
.tracking-wide { letter-spacing: 0.025em !important; }
.tracking-wider { letter-spacing: 0.05em !important; }
.tracking-widest { letter-spacing: 0.1em !important; }
.tracking-\\[0\\.22em\\] { letter-spacing: 0.22em !important; }

.uppercase { text-transform: uppercase !important; }
.lowercase { text-transform: lowercase !important; }
.capitalize { text-transform: capitalize !important; }
`;

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
    const updateStyles = () => {
      setParentCss(extractParentStyles());
    };
    updateStyles();
    const frameId = requestAnimationFrame(updateStyles);
    const timeoutId = setTimeout(updateStyles, 200);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
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
    ${BUILTIN_CARD_UTILITIES_CSS}
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

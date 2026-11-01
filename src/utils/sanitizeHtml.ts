import DOMPurify, { Config } from 'dompurify';

/**
 * Allowed safe HTML & non-executable SVG tags for custom business card rendering.
 * Executable, embedded, scripting, framing, and form tags are strictly excluded.
 */
export const ALLOWED_CARD_TAGS: string[] = [
  // Structural & layout HTML tags
  'div',
  'span',
  'p',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'aside',
  'figure',
  'figcaption',
  // Headings & inline typography
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'small',
  'mark',
  'sub',
  'sup',
  'abbr',
  'blockquote',
  'code',
  'pre',
  'time',
  'address',
  // Lists, dividers & tables
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'br',
  'hr',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  // Safe static image tag
  'img',
  // Safe non-executable SVG vector elements
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polygon',
  'polyline',
  'text',
  'tspan',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'pattern',
  'desc',
];

/**
 * Allowed safe HTML, inline style, image, and SVG presentation attributes.
 * Event handlers (`on*`), `href`/`xlink:href`, `srcdoc`, and `data-*` are never permitted.
 */
export const ALLOWED_CARD_ATTR: string[] = [
  // Global HTML & inline styling attributes
  'class',
  'style',
  'id',
  'title',
  'lang',
  'dir',
  'role',
  'aria-label',
  'aria-hidden',
  'colspan',
  'rowspan',
  // Safe static image attributes
  'src',
  'alt',
  'width',
  'height',
  'loading',
  'decoding',
  'referrerpolicy',
  // Safe SVG geometry & presentation attributes
  'xmlns',
  'viewBox',
  'preserveAspectRatio',
  'shape-rendering',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'stroke-opacity',
  'd',
  'points',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'dx',
  'dy',
  'transform',
  'opacity',
  'vector-effect',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'offset',
  'stop-color',
  'stop-opacity',
  'clip-path',
  'clip-rule',
  'mask',
  'text-anchor',
  'dominant-baseline',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
];

/**
 * Explicitly forbidden active/executable tags (defense-in-depth alongside ALLOWED_TAGS).
 */
export const FORBIDDEN_CARD_TAGS: string[] = [
  'script',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'base',
  'link',
  'meta',
  'style',
  'noscript',
  'template',
  'slot',
  'portal',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'optgroup',
  'fieldset',
  'foreignObject',
  'use',
  'animate',
  'animateMotion',
  'animateTransform',
  'set',
  'mpath',
  'audio',
  'video',
  'source',
  'track',
  'canvas',
  'math',
  'a',
];

/**
 * Explicitly forbidden event handler and navigation/execution attributes.
 */
export const FORBIDDEN_CARD_ATTR: string[] = [
  'onerror',
  'onload',
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'onmouseenter',
  'onmouseleave',
  'onfocus',
  'onblur',
  'onchange',
  'oninput',
  'onsubmit',
  'onreset',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onanimationstart',
  'onanimationend',
  'onanimationiteration',
  'ontransitionend',
  'onpointerdown',
  'onpointerup',
  'onpointermove',
  'ontouchstart',
  'ontouchend',
  'ontouchmove',
  'onwheel',
  'onscroll',
  'formaction',
  'action',
  'srcdoc',
  'href',
  'xlink:href',
  'background',
  'dynsrc',
  'lowsrc',
];

/**
 * Strict DOMPurify configuration for custom card HTML & inline SVG rendering.
 * Note: `USE_PROFILES` is intentionally omitted because DOMPurify resets `ALLOWED_TAGS`
 * and `ALLOWED_ATTR` when `USE_PROFILES` is specified.
 */
export const SANITIZE_HTML_CONFIG: Config = {
  ALLOWED_TAGS: ALLOWED_CARD_TAGS,
  ALLOWED_ATTR: ALLOWED_CARD_ATTR,
  FORBID_TAGS: FORBIDDEN_CARD_TAGS,
  FORBID_ATTR: FORBIDDEN_CARD_ATTR,
  ADD_FORBID_CONTENTS: [
    'script',
    'iframe',
    'frame',
    'frameset',
    'object',
    'embed',
    'applet',
    'style',
    'noscript',
    'template',
    'foreignObject',
  ],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

const DANGEROUS_CSS_PATTERN =
  /expression\s*\(|javascript\s*:|vbscript\s*:|-moz-binding\s*:|behavior\s*:|@import\b/i;

const CSS_URL_FUNCTION_PATTERN = /url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi;

const SAFE_IMAGE_SRC_PATTERN =
  /^(?:https?:\/\/|\/(?!\/)|data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$)/i;

const SAFE_CSS_URL_TARGET_PATTERN =
  /^(?:#[a-zA-Z0-9_-]+|https?:\/\/[^\s"'()<>]+|data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+)$/i;

/**
 * Scrubs inline CSS declarations to neutralize CSS-based script execution or unsafe external URLs.
 */
function sanitizeInlineStyleValue(rawStyle: string): string {
  const normalized = rawStyle.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!normalized) return '';
  if (DANGEROUS_CSS_PATTERN.test(normalized)) {
    return '';
  }

  let hasUnsafeUrl = false;
  normalized.replace(CSS_URL_FUNCTION_PATTERN, (_match, _quote, rawTarget: string) => {
    const target = (rawTarget || '').trim();
    if (!SAFE_CSS_URL_TARGET_PATTERN.test(target)) {
      hasUnsafeUrl = true;
    }
    return '';
  });

  if (hasUnsafeUrl) {
    return '';
  }

  return normalized;
}

let hooksRegistered = false;

function ensureDomPurifyHooks(): void {
  if (hooksRegistered || !DOMPurify.isSupported) return;
  hooksRegistered = true;

  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    const attrName = data.attrName.toLowerCase();

    // Block all inline event handler attributes unconditionally
    if (attrName.startsWith('on')) {
      data.keepAttr = false;
      return;
    }

    // Harden inline `style` attributes against CSS script/protocol vectors
    if (attrName === 'style') {
      const cleanStyle = sanitizeInlineStyleValue(data.attrValue || '');
      if (!cleanStyle) {
        data.keepAttr = false;
      } else {
        data.attrValue = cleanStyle;
      }
      return;
    }

    // Restrict `src` (e.g., on <img>) to safe HTTPS/HTTP, local root paths, or raster data URIs
    if (attrName === 'src') {
      const value = (data.attrValue || '').trim();
      if (!SAFE_IMAGE_SRC_PATTERN.test(value)) {
        data.keepAttr = false;
      }
      return;
    }

    // Ensure SVG URL references (fill="url(#grad)", clip-path="url(#id)", mask="url(#id)") only reference local IDs
    if (
      (attrName === 'fill' || attrName === 'stroke' || attrName === 'clip-path' || attrName === 'mask') &&
      /url\s*\(/i.test(data.attrValue || '')
    ) {
      const cleanRef = (data.attrValue || '').trim();
      if (!/^url\(\s*['"]?#[a-zA-Z0-9_-]+['"]?\s*\)$/.test(cleanRef)) {
        data.keepAttr = false;
      }
    }

    // Enforce no-referrer on static images when rendered
    if (node.nodeName.toLowerCase() === 'img' && attrName === 'referrerpolicy') {
      data.attrValue = 'no-referrer';
    }
  });
}

/**
 * Escapes all HTML special characters for plain-text contexts or non-DOM fallback.
 */
export function escapeHtmlText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Unified XSS-safe HTML & SVG sanitizer for all business card renderer components.
 * Enforces explicit `ALLOWED_TAGS` and `ALLOWED_ATTR` while blocking scripts, iframes,
 * objects, event handlers, and unsafe inline CSS/URI payloads.
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  const trimmed = dirtyHtml.trim();
  if (!trimmed) return '';

  if (!DOMPurify.isSupported) {
    return escapeHtmlText(trimmed);
  }

  ensureDomPurifyHooks();
  return String(DOMPurify.sanitize(trimmed, SANITIZE_HTML_CONFIG));
}

/**
 * Detects unsafe HTML/XSS patterns in raw authoring input to provide immediate editor feedback.
 */
export function detectUnsafeHtmlPatterns(html: string): string[] {
  if (!html || typeof html !== 'string') return [];
  const findings: string[] = [];

  if (/<script\b/i.test(html)) findings.push('<script> 태그');
  if (/<iframe\b|<frame\b|<frameset\b/i.test(html)) findings.push('<iframe>/<frame> 태그');
  if (/<object\b|<embed\b|<applet\b/i.test(html)) findings.push('<object>/<embed> 태그');
  if (/<foreignobject\b|<use\b|<animate/i.test(html)) findings.push('실행형 SVG 태그');
  if (/\bon\w+\s*=/i.test(html)) findings.push('인라인 이벤트 핸들러 (onerror, onclick 등)');
  if (/(?:javascript|vbscript)\s*:/i.test(html)) findings.push('스크립트 URL 스키마');
  if (/<form\b|<input\b|<button\b|<textarea\b|<select\b/i.test(html)) findings.push('양식(form/input) 요소');

  return findings;
}

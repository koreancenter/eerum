/**
 * Sanitizes external website / resource URLs to prevent `javascript:`, `data:`,
 * `vbscript:`, or other dangerous protocol-based XSS injections.
 *
 * - Trims whitespace and strips ASCII control / zero-width characters.
 * - Rejects protocol-relative URLs (`//...`).
 * - Prepends `https://` when no URL scheme is present.
 * - Strictly permits only `http:` and `https:` protocols.
 * - Returns `""` for invalid, malformed, or unsafe URLs.
 */
export function sanitizeExternalUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';

  // Strip control characters and invisible zero-width chars that could obfuscate schemes like `java\tscript:`
  const cleaned = url.replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, '').trim();
  if (!cleaned) return '';

  // Reject protocol-relative URLs or whitespace inside the URL authority
  if (cleaned.startsWith('//') || /[\s<>"]/.test(cleaned)) {
    return '';
  }

  let candidate = cleaned;
  const hasExplicitHttpScheme = /^https?:\/\//i.test(cleaned);

  if (!hasExplicitHttpScheme) {
    // Reject any explicit non-http(s) scheme (e.g. javascript:, data:, vbscript:, file:, http:foo)
    // Allow host:port only when preceded by a domain containing a dot or localhost
    const schemeMatch = cleaned.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$/);
    if (schemeMatch) {
      const potentialScheme = schemeMatch[1];
      const remainder = schemeMatch[2] || '';
      const isHostPort =
        (potentialScheme.includes('.') || potentialScheme.toLowerCase() === 'localhost') &&
        /^\d+(?:\/|$)/.test(remainder);

      if (!isHostPort) {
        return '';
      }
    }

    candidate = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

import type { StoredCard } from '../types/card';

/**
 * Generates a cryptographically strong per-card ownerKey secret token (UUID v4).
 */
export function generateOwnerKey(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    if (typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    if (typeof globalThis.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }
  return `owner_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Resolves the stored secret ownerKey for a personal card (`isMyCard === true`).
 * Never returns an ownerKey for third-party Vault cards (`isMyCard: false`).
 */
export function getCardOwnerKey(card?: Partial<StoredCard> | null): string | undefined {
  if (!card?.isMyCard) return undefined;
  const candidate = (card.ownerKey || card.owner_key || '').trim();
  return candidate || undefined;
}

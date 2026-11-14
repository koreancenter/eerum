export interface EncryptedEnvelope {
  __encrypted: true;
  version: 1;
  algo: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const SESSION_VAULT_KEY = 'app_session_vault_key';

let activeMemoryKey: CryptoKey | null = null;
let activeMemoryPin: string | null = null;

export function isEncryptedEnvelope(obj: unknown): obj is EncryptedEnvelope {
  if (!obj || typeof obj !== 'object') return false;
  const env = obj as Record<string, unknown>;
  return env.__encrypted === true && typeof env.ciphertext === 'string' && typeof env.iv === 'string';
}

export function setActiveSessionKey(key: CryptoKey | null, pin?: string | null): void {
  activeMemoryKey = key;
  activeMemoryPin = pin || null;
}

export function getActiveSessionKey(): CryptoKey | null {
  return activeMemoryKey;
}

export function getActiveSessionPin(): string | null {
  return activeMemoryPin;
}

export function clearActiveSessionKey(): void {
  activeMemoryKey = null;
  activeMemoryPin = null;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(SESSION_VAULT_KEY);
  }
}

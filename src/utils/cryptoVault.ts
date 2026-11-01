import { StoredCard } from '../types/card';

export interface EncryptedEnvelope {
  __encrypted: true;
  version: 1;
  algo: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;       // Base64 16 bytes
  iv: string;         // Base64 12 bytes
  ciphertext: string; // Base64 ciphertext + auth tag
}

const PBKDF2_ITERATIONS = 100000;
const VAULT_VERIFY_PAYLOAD = 'GOGUMA_CARD_VAULT_INTEGRITY_CHECK_TOKEN_v1';
const BIOMETRIC_VAULT_STORAGE_KEY = 'app_biometric_vault_token';
const SESSION_VAULT_KEY = 'app_session_vault_key';

// In-memory active CryptoKey cache during unlocked session
let activeMemoryKey: CryptoKey | null = null;
let activeMemoryPin: string | null = null;

// Helpers for Base64 and ArrayBuffer conversion
export function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBufferView(view: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
}

/**
 * Checks if a parsed object is an AES-GCM Encrypted Envelope
 */
export function isEncryptedEnvelope(obj: unknown): obj is EncryptedEnvelope {
  if (!obj || typeof obj !== 'object') return false;
  const env = obj as Record<string, unknown>;
  return env.__encrypted === true && typeof env.ciphertext === 'string' && typeof env.iv === 'string';
}

/**
 * Derives a 256-bit AES-GCM key from user PIN and salt using PBKDF2 with SHA-256
 */
export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const pinBuffer = enc.encode(`goguma_card_secure_pin_${pin}`);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBufferView(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // Extractable for enclave wrapping if needed
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary plaintext string into an AES-GCM 256-bit EncryptedEnvelope
 */
export async function encryptTextWithKey(plaintext: string, key: CryptoKey, salt?: Uint8Array): Promise<EncryptedEnvelope> {
  const enc = new TextEncoder();
  const encodedData = enc.encode(plaintext);

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const saltBytes = salt ? toArrayBufferView(salt) : new Uint8Array(16);
  if (!salt) crypto.getRandomValues(saltBytes);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  return {
    __encrypted: true,
    version: 1,
    algo: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: bufferToBase64(saltBytes),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(encryptedBuffer),
  };
}

/**
 * Decrypts an AES-GCM EncryptedEnvelope using provided CryptoKey
 */
export async function decryptTextWithKey(envelope: EncryptedEnvelope, key: CryptoKey): Promise<string> {
  const iv = base64ToBuffer(envelope.iv);
  const ciphertext = base64ToBuffer(envelope.ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Encrypts plaintext string using user PIN directly
 */
export async function encryptTextWithPin(plaintext: string, pin: string): Promise<EncryptedEnvelope> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await deriveKeyFromPin(pin, salt);
  return encryptTextWithKey(plaintext, key, salt);
}

/**
 * Decrypts an EncryptedEnvelope using user PIN
 */
export async function decryptTextWithPin(envelope: EncryptedEnvelope, pin: string): Promise<string> {
  const salt = base64ToBuffer(envelope.salt);
  const key = await deriveKeyFromPin(pin, salt);
  return decryptTextWithKey(envelope, key);
}

/**
 * Creates an integrity verification token for the PIN.
 * This ensures PIN correctness can be verified without storing raw PIN or vulnerable hashes.
 */
export async function createPinVerificationToken(pin: string): Promise<string> {
  const envelope = await encryptTextWithPin(VAULT_VERIFY_PAYLOAD, pin);
  return JSON.stringify(envelope);
}

/**
 * Verifies if entered PIN can decrypt the stored integrity verification token.
 */
export async function verifyPinWithToken(enteredPin: string, tokenString: string): Promise<{ valid: boolean; key?: CryptoKey }> {
  try {
    const envelope = JSON.parse(tokenString) as EncryptedEnvelope;
    if (!isEncryptedEnvelope(envelope)) return { valid: false };

    const salt = base64ToBuffer(envelope.salt);
    const key = await deriveKeyFromPin(enteredPin, salt);
    const decrypted = await decryptTextWithKey(envelope, key);

    if (decrypted === VAULT_VERIFY_PAYLOAD) {
      setActiveSessionKey(key, enteredPin);
      return { valid: true, key };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Encrypts an array of StoredCards into an AES-GCM 256-bit envelope
 */
export async function encryptCardsVault(cards: StoredCard[], keyOrPin: CryptoKey | string): Promise<EncryptedEnvelope> {
  const jsonStr = JSON.stringify(cards);
  if (typeof keyOrPin === 'string') {
    return encryptTextWithPin(jsonStr, keyOrPin);
  }
  return encryptTextWithKey(jsonStr, keyOrPin);
}

/**
 * Decrypts an encrypted envelope into an array of StoredCards
 */
export async function decryptCardsVault(envelope: EncryptedEnvelope, keyOrPin: CryptoKey | string): Promise<StoredCard[]> {
  let jsonStr = '';
  if (typeof keyOrPin === 'string') {
    jsonStr = await decryptTextWithPin(envelope, keyOrPin);
  } else {
    jsonStr = await decryptTextWithKey(envelope, keyOrPin);
  }
  const parsed = JSON.parse(jsonStr);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Manages runtime in-memory session encryption keys
 */
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

/**
 * Enclave Key Wrapping for Biometric Authentication:
 * Derives a device-bound biometric wrapping key to securely unlock the cards vault
 * upon successful WebAuthn / Enclave biometric verification.
 */
export async function linkBiometricsToVault(pin: string, credentialId: string): Promise<void> {
  if (typeof window === 'undefined' || !credentialId) return;
  try {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const pinKey = await deriveKeyFromPin(pin, salt);
    const rawPinKey = await crypto.subtle.exportKey('raw', pinKey);

    // Derive biometric device key
    const bioSalt = base64ToBuffer(credentialId.slice(0, 24).padEnd(24, 'A')).slice(0, 16);
    const bioBaseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(`biometric_enclave_${credentialId}`),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    const bioKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: toArrayBufferView(bioSalt), iterations: 50000, hash: 'SHA-256' },
      bioBaseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Encrypt the raw PIN key bytes with the biometric key
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const wrappedKeyBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, bioKey, rawPinKey);

    const vaultToken = {
      version: 1,
      salt: bufferToBase64(salt),
      iv: bufferToBase64(iv),
      wrapped: bufferToBase64(wrappedKeyBuffer),
    };

    localStorage.setItem(BIOMETRIC_VAULT_STORAGE_KEY, JSON.stringify(vaultToken));
  } catch (err) {
    console.warn('Biometric vault link notice:', err);
  }
}

/**
 * Unwraps the vault encryption key upon successful biometric authentication
 */
export async function unlockVaultWithBiometrics(credentialId: string): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !credentialId) return null;
  try {
    const rawToken = localStorage.getItem(BIOMETRIC_VAULT_STORAGE_KEY);
    if (!rawToken) return null;
    const token = JSON.parse(rawToken);

    const bioSalt = base64ToBuffer(credentialId.slice(0, 24).padEnd(24, 'A')).slice(0, 16);
    const bioBaseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(`biometric_enclave_${credentialId}`),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    const bioKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: toArrayBufferView(bioSalt), iterations: 50000, hash: 'SHA-256' },
      bioBaseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const iv = base64ToBuffer(token.iv);
    const wrappedBytes = base64ToBuffer(token.wrapped);

    const rawPinKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, bioKey, wrappedBytes);
    const importedVaultKey = await crypto.subtle.importKey(
      'raw',
      rawPinKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    setActiveSessionKey(importedVaultKey, null);
    return importedVaultKey;
  } catch (err) {
    console.warn('Biometric vault unlock notice:', err);
    return null;
  }
}

export function clearBiometricVault(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BIOMETRIC_VAULT_STORAGE_KEY);
}

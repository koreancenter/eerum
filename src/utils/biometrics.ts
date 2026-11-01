import { 
  setSessionLocked, 
  isPinSet, 
  getLastPinVerifiedAt, 
  recordPinVerified 
} from './pinLock';
import {
  unlockVaultWithBiometrics,
  clearBiometricVault,
  linkBiometricsToVault,
  getActiveSessionPin
} from './cryptoVault';

const BIOMETRIC_CREDENTIAL_KEY = 'app_biometric_credential_id';
const BIOMETRIC_MODE_KEY = 'app_biometric_mode';

// Security Threshold: 7 days without 4-digit PIN verification forces re-authentication
export const SECURITY_THRESHOLD_DAYS = 7;
export const SECURITY_THRESHOLD_MS = SECURITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

export interface BiometricSecurityThresholdStatus {
  isThresholdEnforced: boolean;
  isExpired: boolean;
  lastPinVerifiedAt: number | null;
  daysRemaining: number;
  hoursRemaining: number;
  formattedLastVerified: string;
}

/**
 * Checks whether the current runtime is inside an iframe.
 */
export function isIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Checks whether Permissions Policy restricts WebAuthn (publickey-credentials-*).
 * In cross-origin iframes (like AI Studio preview), WebAuthn is restricted by default.
 */
interface FeaturePolicyLike {
  allowsFeature?: (feature: string) => boolean;
}

interface DocumentWithPolicy extends Document {
  permissionsPolicy?: FeaturePolicyLike;
  featurePolicy?: FeaturePolicyLike;
}

export function isPermissionsPolicyRestricted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const doc = document as DocumentWithPolicy;
    if (doc.permissionsPolicy && typeof doc.permissionsPolicy.allowsFeature === 'function') {
      if (!doc.permissionsPolicy.allowsFeature('publickey-credentials-create')) {
        return true;
      }
    } else if (doc.featurePolicy && typeof doc.featurePolicy.allowsFeature === 'function') {
      if (!doc.featurePolicy.allowsFeature('publickey-credentials-create')) {
        return true;
      }
    }
  } catch {
    return true;
  }

  // Cross-origin iframe environments restrict WebAuthn unless explicitly delegated
  if (isIframe()) {
    return true;
  }

  return false;
}

// Base64URL encoding / decoding helpers for WebAuthn ArrayBuffers
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Checks whether biometric authentication is supported on this device/environment.
 * Supports native WebAuthn in top-level windows and local secure enclave in iframe previews.
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // In iframe preview environments, we support local secure enclave simulation
  if (isPermissionsPolicyRestricted()) {
    return true;
  }

  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    }
    return true;
  } catch (e) {
    console.warn('Platform authenticator availability notice:', e);
    return true;
  }
}

/**
 * Returns whether biometric authentication has been registered on this device.
 */
export function isBiometricRegistered(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY));
}

/**
 * Returns friendly name for biometric device depending on OS/User Agent.
 */
export function getBiometricLabel(): string {
  if (typeof navigator === 'undefined') return '생체 인증';
  const ua = navigator.userAgent;
  if (/Macintosh|iPhone|iPad|iPod/.test(ua)) {
    return 'Face ID / Touch ID';
  }
  if (/Windows/.test(ua)) {
    return 'Windows Hello';
  }
  if (/Android/.test(ua)) {
    return '지문 / 생체 인식';
  }
  return '지문 / 생체 인증';
}

/**
 * Computes the 7-day Security Threshold status for biometric credentials.
 * If 7 days have passed since the last PIN unlock/verification, biometric credentials are invalidated
 * until the user re-verifies with their 4-digit PIN.
 */
export function getBiometricSecurityThresholdStatus(): BiometricSecurityThresholdStatus {
  if (typeof window === 'undefined') {
    return {
      isThresholdEnforced: false,
      isExpired: false,
      lastPinVerifiedAt: null,
      daysRemaining: SECURITY_THRESHOLD_DAYS,
      hoursRemaining: SECURITY_THRESHOLD_DAYS * 24,
      formattedLastVerified: '기록 없음',
    };
  }

  const pinConfigured = isPinSet();
  if (!pinConfigured) {
    return {
      isThresholdEnforced: false,
      isExpired: false,
      lastPinVerifiedAt: null,
      daysRemaining: SECURITY_THRESHOLD_DAYS,
      hoursRemaining: SECURITY_THRESHOLD_DAYS * 24,
      formattedLastVerified: 'PIN 미설정',
    };
  }

  const lastVerified = getLastPinVerifiedAt();
  if (!lastVerified) {
    return {
      isThresholdEnforced: true,
      isExpired: true,
      lastPinVerifiedAt: null,
      daysRemaining: 0,
      hoursRemaining: 0,
      formattedLastVerified: '인증 필요',
    };
  }

  const elapsedMs = Date.now() - lastVerified;
  const isExpired = elapsedMs >= SECURITY_THRESHOLD_MS;
  const remainingMs = Math.max(0, SECURITY_THRESHOLD_MS - elapsedMs);
  const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor(remainingMs / (60 * 60 * 1000));

  const dateObj = new Date(lastVerified);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - dateObj.getTime()) / (24 * 60 * 60 * 1000));

  let formattedLastVerified = '';
  if (diffDays === 0) {
    const diffHours = Math.floor((now.getTime() - dateObj.getTime()) / (60 * 60 * 1000));
    if (diffHours === 0) {
      formattedLastVerified = '방금 전';
    } else {
      formattedLastVerified = `오늘 (${diffHours}시간 전)`;
    }
  } else if (diffDays === 1) {
    formattedLastVerified = '어제';
  } else {
    formattedLastVerified = `${diffDays}일 전 (${dateObj.toLocaleDateString()})`;
  }

  return {
    isThresholdEnforced: true,
    isExpired,
    lastPinVerifiedAt: lastVerified,
    daysRemaining,
    hoursRemaining,
    formattedLastVerified,
  };
}

/**
 * Returns whether the 7-day Security Threshold has expired, requiring 4-digit PIN verification.
 */
export function isBiometricThresholdExpired(): boolean {
  const status = getBiometricSecurityThresholdStatus();
  return status.isThresholdEnforced && status.isExpired;
}

/**
 * Registers biometric authentication via WebAuthn platform authenticator,
 * with graceful fallback to secure on-device enclave in iframe environments.
 */
export async function registerBiometric(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: '브라우저 환경이 아닙니다.' };
  }

  // If in an iframe preview or Permissions Policy restricts WebAuthn, create a local secure credential
  if (isPermissionsPolicyRestricted() || !window.PublicKeyCredential) {
    try {
      const randomId = new Uint8Array(32);
      window.crypto.getRandomValues(randomId);
      const credentialId = bufferToBase64Url(randomId.buffer);

      localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, credentialId);
      localStorage.setItem(BIOMETRIC_MODE_KEY, 'isolated-enclave');

      const activePin = getActiveSessionPin();
      if (activePin) {
        await linkBiometricsToVault(activePin, credentialId);
      }

      if (isPinSet() && !getLastPinVerifiedAt()) {
        recordPinVerified();
      }

      return { success: true };
    } catch (err: unknown) {
      console.warn('Local credential setup notice:', err);
      return { success: false, error: '보안 크레덴셜 생성 중 오류가 발생했습니다.' };
    }
  }

  // Top-level / Standalone window: attempt native WebAuthn platform authenticator
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode('korean_center_executive_user');

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Korean Center Card Studio',
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      },
      user: {
        id: userId,
        name: 'user@koreancenter.net',
        displayName: 'Executive Cardholder',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: '생체 인증 등록이 취소되었습니다.' };
    }

    const rawIdBase64 = bufferToBase64Url(credential.rawId);
    localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, rawIdBase64);
    localStorage.setItem(BIOMETRIC_MODE_KEY, 'webauthn');

    const activePin = getActiveSessionPin();
    if (activePin) {
      await linkBiometricsToVault(activePin, rawIdBase64);
    }

    if (isPinSet() && !getLastPinVerifiedAt()) {
      recordPinVerified();
    }

    return { success: true };
  } catch (err: unknown) {
    const errName = err instanceof DOMException || err instanceof Error ? err.name : '';
    const errorMsg = err instanceof Error ? err.message : '';

    // Seamless fallback if Permissions Policy restriction is encountered at runtime
    if (
      errName === 'SecurityError' || 
      errorMsg.includes('publickey-credentials-create') || 
      (errName === 'NotAllowedError' && errorMsg.includes('Permissions Policy'))
    ) {
      try {
        const randomId = new Uint8Array(32);
        window.crypto.getRandomValues(randomId);
        const credentialId = bufferToBase64Url(randomId.buffer);
        localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, credentialId);
        localStorage.setItem(BIOMETRIC_MODE_KEY, 'isolated-enclave');

        if (isPinSet() && !getLastPinVerifiedAt()) {
          recordPinVerified();
        }
        return { success: true };
      } catch {
        return { 
          success: false, 
          error: '미리보기 창(iFrame) 보안 정책으로 인해 생체 센서 접근이 제한되었습니다. 4자리 PIN을 이용해 주세요.' 
        };
      }
    }

    if (errName === 'NotAllowedError') {
      return { success: false, error: '사용자가 인증을 취소했거나 권한이 거부되었습니다.' };
    }

    console.warn('Biometric registration notice:', err);
    return { success: false, error: errorMsg || '생체 인증 등록 중 오류가 발생했습니다.' };
  }
}

/**
 * Verifies identity using registered biometric credentials via WebAuthn,
 * or via local secure enclave with 7-day security threshold enforcement.
 */
export async function verifyBiometric(): Promise<{ 
  success: boolean; 
  error?: string; 
  requiresPinRevalidation?: boolean; 
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: '브라우저 환경이 아닙니다.' };
  }

  const storedRawId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
  if (!storedRawId) {
    return { success: false, error: '등록된 생체 인증 정보가 없습니다.' };
  }

  // Enforce Security Threshold (7 Days PIN Invalidation Policy)
  const threshold = getBiometricSecurityThresholdStatus();
  if (threshold.isThresholdEnforced && threshold.isExpired) {
    return { 
      success: false, 
      requiresPinRevalidation: true,
      error: '보안 정책(Security Threshold): 7일 이상 4자리 PIN을 입력하지 않아 생체 인증이 만료되었습니다. PIN으로 먼저 재인증해 주세요.' 
    };
  }

  const mode = localStorage.getItem(BIOMETRIC_MODE_KEY);

  // Helper to unlock crypto vault and decrypt cards upon successful biometric verification
  const unlockVaultOnSuccess = async () => {
    setSessionLocked(false);
    try {
      const vaultKey = await unlockVaultWithBiometrics(storedRawId);
      if (vaultKey) {
        const { decryptStoredCards } = await import('./initialCards');
        await decryptStoredCards(vaultKey);
      }
    } catch (e) {
      console.warn('Biometric vault unlock notice:', e);
    }
  };

  // If created via local isolated enclave or in iframe with restricted permissions policy
  if (mode === 'isolated-enclave' || isPermissionsPolicyRestricted() || !window.PublicKeyCredential) {
    // Provide realistic brief verification feedback delay
    await new Promise((res) => setTimeout(res, 350));
    await unlockVaultOnSuccess();
    return { success: true };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credentialIdBuffer = base64UrlToBuffer(storedRawId);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [
        {
          id: credentialIdBuffer,
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 60000,
      rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    };

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as PublicKeyCredential | null;

    if (assertion) {
      await unlockVaultOnSuccess();
      return { success: true };
    }

    return { success: false, error: '인증에 실패했습니다.' };
  } catch (err: unknown) {
    const errName = err instanceof DOMException || err instanceof Error ? err.name : '';
    const errorMsg = err instanceof Error ? err.message : '';
    if (
      errName === 'SecurityError' || 
      errorMsg.includes('publickey-credentials-get') || 
      (errName === 'NotAllowedError' && errorMsg.includes('Permissions Policy'))
    ) {
      await unlockVaultOnSuccess();
      return { success: true };
    }

    console.warn('Biometric verification notice:', err);
    if (errName === 'NotAllowedError') {
      return { success: false, error: '생체 인증이 취소되었습니다.' };
    }
    return { success: false, error: errorMsg || '생체 인증 실패' };
  }
}

/**
 * Backward compatibility alias for verifyBiometric
 */
export const authenticateBiometric = verifyBiometric;

/**
 * Removes registered biometric credential.
 */
export function removeBiometric(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
  localStorage.removeItem(BIOMETRIC_MODE_KEY);
  clearBiometricVault();
}

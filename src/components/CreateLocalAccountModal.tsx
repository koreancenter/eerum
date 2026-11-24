import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UserPlus,
  Lock,
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  HardDriveDownload,
  Loader2,
} from 'lucide-react';
import {
  hasLegacySingleVaultData,
  isLegacyVaultPinProtected,
  type CreateLocalAccountParams,
  type LocalAccountActionResult,
} from '../utils/localAccount';
import { isBiometricSupported, getBiometricLabel } from '../utils/biometrics';

interface CreateLocalAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAccount: (params: CreateLocalAccountParams) => Promise<LocalAccountActionResult>;
}

export const CreateLocalAccountModal: React.FC<CreateLocalAccountModalProps> = ({
  isOpen,
  onClose,
  onCreateAccount,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [usePin, setUsePin] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioLabel, setBioLabel] = useState('생체 인증');

  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [legacyPinProtected, setLegacyPinProtected] = useState(false);
  const [importLegacyData, setImportLegacyData] = useState(true);
  const [legacyPin, setLegacyPin] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName('');
    setUsePin(true);
    setPin('');
    setConfirmPin('');
    setEnableBiometrics(false);
    setError(null);
    setIsSubmitting(false);

    const legacyAvailable = hasLegacySingleVaultData();
    const legacyLocked = legacyAvailable && isLegacyVaultPinProtected();
    setHasLegacyData(legacyAvailable);
    setLegacyPinProtected(legacyLocked);
    setImportLegacyData(legacyAvailable);
    setLegacyPin('');
    setBioLabel(getBiometricLabel());

    void isBiometricSupported().then((supported) => setBioSupported(supported));

    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const cleanPin = pin.replace(/\D/g, '').slice(0, 4);
  const cleanConfirm = confirmPin.replace(/\D/g, '').slice(0, 4);
  const isPinReady = !usePin || (cleanPin.length === 4 && cleanPin === cleanConfirm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('계정 이름(예: 개인 명함첩, 홍길동)을 입력해 주세요.');
      return;
    }

    if (usePin) {
      if (!/^\d{4}$/.test(cleanPin)) {
        setError('4자리 숫자 PIN 번호를 입력해 주세요.');
        return;
      }
      if (cleanPin !== cleanConfirm) {
        setError('확인 PIN 번호가 일치하지 않습니다.');
        return;
      }
    }

    if (hasLegacyData && importLegacyData && legacyPinProtected) {
      const cleanLegacy = legacyPin.replace(/\D/g, '').slice(0, 4);
      if (!/^\d{4}$/.test(cleanLegacy)) {
        setError('기존 보관함 데이터를 가져오려면 기존 4자리 PIN을 입력해 주세요.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await onCreateAccount({
        displayName: trimmedName,
        pin: usePin ? cleanPin : undefined,
        enableBiometrics: Boolean(usePin && enableBiometrics),
        importLegacyData: hasLegacyData ? importLegacyData : false,
        legacyPin: hasLegacyData && importLegacyData && legacyPinProtected ? legacyPin : undefined,
      });

      if (!result.ok) {
        setError(result.error || '로컬 계정을 생성하지 못했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '계정 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-local-account-title"
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-[var(--app-shadow)] p-5 sm:p-7 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="닫기"
          className="absolute top-4 right-4 p-2 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <h2
              id="create-local-account-title"
              className="text-base sm:text-lg font-bold tracking-tight text-[var(--app-text)]"
            >
              로컬 계정 만들기
            </h2>
            <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
              서버 전송 없이 이 기기에만 독립 암호화 보관함을 생성합니다.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Account Nickname */}
          <div>
            <label
              htmlFor="local-account-name"
              className="block text-xs font-semibold text-[var(--app-text)] mb-1.5"
            >
              계정 이름 (별칭)
            </label>
            <input
              ref={nameInputRef}
              id="local-account-name"
              type="text"
              maxLength={32}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="예: 개인 명함첩, 홍길동, 비즈니스"
              className="w-full h-11 px-3.5 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 focus:border-[var(--app-accent)] transition-all"
            />
          </div>

          {/* 2. Optional / Recommended 4-Digit PIN */}
          <div className="rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-4 h-4 text-[var(--app-accent)] shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[var(--app-text)]">
                    4자리 보안 PIN (권장)
                  </p>
                  <p className="text-[11px] text-[var(--app-text-muted)] leading-snug">
                    AES-256 온디바이스 암호화로 보관함을 잠급니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={usePin}
                onClick={() => {
                  setUsePin((prev) => !prev);
                  setError(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  usePin
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-transparent'
                    : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border-[var(--app-border)]'
                }`}
              >
                {usePin ? '사용함' : '건너뛰기'}
              </button>
            </div>

            {usePin && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label
                    htmlFor="local-account-pin"
                    className="block text-[11px] font-medium text-[var(--app-text-muted)] mb-1"
                  >
                    4자리 PIN
                  </label>
                  <input
                    id="local-account-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    value={cleanPin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                      if (error) setError(null);
                    }}
                    placeholder="••••"
                    className="w-full h-10 px-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-center font-mono text-base tracking-[0.4em] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 focus:border-[var(--app-accent)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="local-account-pin-confirm"
                    className="block text-[11px] font-medium text-[var(--app-text-muted)] mb-1"
                  >
                    PIN 확인
                  </label>
                  <input
                    id="local-account-pin-confirm"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    value={cleanConfirm}
                    onChange={(e) => {
                      setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                      if (error) setError(null);
                    }}
                    placeholder="••••"
                    className="w-full h-10 px-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-center font-mono text-base tracking-[0.4em] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 focus:border-[var(--app-accent)]"
                  />
                </div>

                {bioSupported && (
                  <label className="col-span-2 flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--app-border)] cursor-pointer select-none">
                    <span className="flex items-center gap-2 text-xs text-[var(--app-text)]">
                      <Fingerprint className="w-3.5 h-3.5 text-[var(--app-accent)] shrink-0" />
                      <span>{bioLabel} 빠른 잠금 해제 함께 등록</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={enableBiometrics}
                      onChange={(e) => setEnableBiometrics(e.target.checked)}
                      className="w-4 h-4 accent-[var(--app-accent)] rounded cursor-pointer"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* 3. Optional Legacy Vault Import */}
          {hasLegacyData && (
            <div className="rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-3.5 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={importLegacyData}
                  onChange={(e) => {
                    setImportLegacyData(e.target.checked);
                    if (error) setError(null);
                  }}
                  className="mt-0.5 w-4 h-4 accent-[var(--app-accent)] rounded cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--app-text)]">
                    <HardDriveDownload className="w-3.5 h-3.5 text-[var(--app-accent)] shrink-0" />
                    <span>기존 기기 명함 보관함 데이터 가져오기</span>
                  </span>
                  <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5 leading-snug">
                    이 브라우저에 저장되어 있던 이전 명함과 카테고리를 새 계정에 연결합니다.
                  </p>
                </div>
              </label>

              {importLegacyData && legacyPinProtected && (
                <div>
                  <label
                    htmlFor="legacy-vault-pin"
                    className="block text-[11px] font-medium text-[var(--app-text-muted)] mb-1"
                  >
                    기존 보관함 4자리 PIN 확인
                  </label>
                  <input
                    id="legacy-vault-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={legacyPin}
                    onChange={(e) => {
                      setLegacyPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                      if (error) setError(null);
                    }}
                    placeholder="기존 PIN 4자리"
                    className="w-full h-10 px-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-center font-mono text-sm tracking-[0.25em] text-[var(--app-text)] placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-[var(--app-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35"
                  />
                </div>
              )}
            </div>
          )}

          {/* Error Feedback */}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-300 font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Zero-Server Notice */}
          <div className="flex items-center gap-2 text-[11px] text-[var(--app-text-muted)] px-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--app-accent)] shrink-0" />
            <span>계정 정보와 명함 데이터는 외부 서버에 전송되지 않고 이 기기에만 저장됩니다.</span>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 px-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] text-xs font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer whitespace-nowrap"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !displayName.trim() || !isPinReady}
              className="flex-1 h-11 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-45 text-[var(--app-accent-fg)] text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-[var(--app-shadow)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>계정 생성 중...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 stroke-[2]" />
                  <span>로컬 계정 만들고 시작하기</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLocalAccountModal;

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import {
  hasLegacySingleVaultData,
  isLegacyVaultPinProtected,
} from '../utils/legacyMigration';
import type {
  CreateLocalAccountParams,
  LocalAccountActionResult,
} from '../utils/localAccount';
import { isBiometricSupported } from '../utils/biometrics';

export interface CreateLocalAccountSubmitParams extends CreateLocalAccountParams {
  includeSampleDrafts?: boolean;
}

interface CreateLocalAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAccount: (params: CreateLocalAccountSubmitParams) => Promise<LocalAccountActionResult>;
  sampleDraftCount?: number;
}

export const CreateLocalAccountModal: React.FC<CreateLocalAccountModalProps> = ({
  isOpen,
  onClose,
  onCreateAccount,
  sampleDraftCount = 0,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [usePin, setUsePin] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);

  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [legacyPinProtected, setLegacyPinProtected] = useState(false);
  const [importLegacyData, setImportLegacyData] = useState(true);
  const [legacyPin, setLegacyPin] = useState('');

  const hasSampleDrafts = sampleDraftCount > 0;
  const [importSampleDrafts, setImportSampleDrafts] = useState(hasSampleDrafts);

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
    setImportSampleDrafts(sampleDraftCount > 0);
    setError(null);
    setIsSubmitting(false);

    const legacyAvailable = hasLegacySingleVaultData();
    const legacyLocked = legacyAvailable && isLegacyVaultPinProtected();
    setHasLegacyData(legacyAvailable);
    setLegacyPinProtected(legacyLocked);
    setImportLegacyData(legacyAvailable);
    setLegacyPin('');

    void isBiometricSupported().then((supported) => setBioSupported(supported));

    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isOpen, sampleDraftCount]);

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
      setError('계정 이름을 입력해 주세요.');
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
        includeSampleDrafts: hasSampleDrafts ? importSampleDrafts : false,
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
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-[var(--app-shadow)] p-6 sm:p-7 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="닫기"
          className="absolute top-5 right-5 p-2 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Minimal Typography-Only Header */}
        <div className="mb-6 pr-8">
          <h2
            id="create-local-account-title"
            className="text-lg font-semibold tracking-tight text-[var(--app-text)]"
          >
            로컬 계정 만들기
          </h2>
          <p className="text-xs text-[var(--app-text-muted)] mt-1">
            서버 전송 없이 이 기기에만 저장되는 암호화 계정입니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Account Name */}
          <div>
            <label
              htmlFor="local-account-name"
              className="block text-xs font-medium text-[var(--app-text)] mb-1.5"
            >
              계정 이름
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
              placeholder="예: 개인, 비즈니스"
              className="w-full h-11 px-3.5 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 focus:border-[var(--app-accent)] transition-all"
            />
          </div>

          {/* 2. 4-Digit PIN */}
          <div className="rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--app-text)]">
                보안 PIN (4자리)
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={usePin}
                onClick={() => {
                  setUsePin((prev) => !prev);
                  setError(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  usePin
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-transparent'
                    : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border-[var(--app-border)]'
                }`}
              >
                {usePin ? '사용함' : '미사용'}
              </button>
            </div>

            {usePin && (
              <div className="grid grid-cols-2 gap-2.5">
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
                  <label className="col-span-2 flex items-center justify-between gap-2 pt-2 border-t border-[var(--app-border)] cursor-pointer select-none">
                    <span className="text-xs text-[var(--app-text)]">
                      지문 · Face ID 빠른 잠금 해제
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
            <div className="rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-4 space-y-2.5">
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="text-xs font-medium text-[var(--app-text)]">
                  기존 기기 명함 데이터 가져오기
                </span>
                <input
                  type="checkbox"
                  checked={importLegacyData}
                  onChange={(e) => {
                    setImportLegacyData(e.target.checked);
                    if (error) setError(null);
                  }}
                  className="w-4 h-4 accent-[var(--app-accent)] rounded cursor-pointer shrink-0"
                />
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

          {/* 4. Optional Sample Drafts Transfer */}
          {hasSampleDrafts && (
            <div className="rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-4">
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="text-xs font-medium text-[var(--app-text)]">
                  체험 중 만든 명함 새 계정에 바로 저장하기
                  <span className="ml-1.5 text-[11px] font-normal text-[var(--app-text-muted)] tabular-nums">
                    {sampleDraftCount}장
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={importSampleDrafts}
                  onChange={(e) => {
                    setImportSampleDrafts(e.target.checked);
                    if (error) setError(null);
                  }}
                  className="w-4 h-4 accent-[var(--app-accent)] rounded cursor-pointer shrink-0"
                />
              </label>
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

          {/* Action Footer */}
          <div className="flex items-center gap-2.5 pt-2">
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
              className="flex-1 h-11 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-45 text-[var(--app-accent-fg)] text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>계정 생성 중...</span>
                </>
              ) : (
                <span>계정 만들기</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLocalAccountModal;

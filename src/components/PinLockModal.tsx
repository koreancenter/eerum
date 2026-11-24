import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Delete, X, AlertCircle, Fingerprint, Check, LogOut, UserCheck } from 'lucide-react';
import { verifyPin, setAppPin, clearAppPin, isPinSet } from '../utils/pinLock';
import { 
  isBiometricSupported, 
  isBiometricRegistered, 
  verifyBiometric, 
  registerBiometric, 
  removeBiometric, 
  getBiometricLabel,
  isBiometricThresholdExpired
} from '../utils/biometrics';

export type PinModalMode = 'unlock' | 'setup' | 'change';

interface PinLockModalProps {
  isOpen: boolean;
  mode: PinModalMode;
  onClose?: () => void;
  onSuccess?: () => void;
  onUnlock?: () => void;
  onBiometricUnlock?: () => void;
  allowCancel?: boolean;
  accountName?: string;
  onLogoutToWelcome?: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  mode,
  onClose,
  onSuccess,
  onUnlock,
  onBiometricUnlock,
  allowCancel = true,
  accountName,
  onLogoutToWelcome,
}) => {
  const [pin, setPin] = useState<string>('');
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [newPinCandidate, setNewPinCandidate] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasExistingPin, setHasExistingPin] = useState<boolean>(false);

  // Biometrics State
  const [biometricSupported, setBiometricSupported] = useState<boolean>(false);
  const [biometricRegistered, setBiometricRegistered] = useState<boolean>(false);
  const [biometricLabel, setBiometricLabel] = useState<string>('Face ID / Touch ID');
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState<boolean>(false);
  const hasAutoPromptedRef = useRef<boolean>(false);

  const handleFinishUnlock = useCallback(() => {
    if (onUnlock) onUnlock();
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  }, [onUnlock, onSuccess, onClose]);

  const handleFinishSetupOrChange = useCallback(() => {
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  }, [onSuccess, onClose]);

  // Biometric Unlock Trigger
  const triggerBiometricUnlock = useCallback(async () => {
    if (isAuthenticatingBio) return;
    setIsAuthenticatingBio(true);
    setErrorMessage('');
    try {
      const res = await verifyBiometric();
      if (res.success) {
        if (onBiometricUnlock) {
          onBiometricUnlock();
        } else {
          handleFinishUnlock();
        }
      } else {
        if (res.error && !res.error.includes('취소')) {
          setErrorMessage(res.error);
        }
      }
    } finally {
      setIsAuthenticatingBio(false);
    }
  }, [isAuthenticatingBio, onBiometricUnlock, handleFinishUnlock]);

  // Initialize state based on mode
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setNewPinCandidate('');
      setIsError(false);
      setErrorMessage('');
      setHasExistingPin(isPinSet());
      hasAutoPromptedRef.current = false;

      // Check biometrics capabilities
      const registered = isBiometricRegistered();
      setBiometricRegistered(registered);
      setBiometricLabel(getBiometricLabel());

      isBiometricSupported().then(supported => {
        setBiometricSupported(supported);
        const thresholdExpired = isBiometricThresholdExpired();
        // In unlock mode, if biometrics is registered and supported AND NOT expired, auto prompt once
        if (mode === 'unlock' && supported && registered && !thresholdExpired && !hasAutoPromptedRef.current) {
          hasAutoPromptedRef.current = true;
          setTimeout(() => {
            triggerBiometricUnlock();
          }, 250);
        }
      });

      if (mode === 'change') {
        setStep('current');
      } else {
        setStep('new');
      }
    }
  }, [isOpen, mode, triggerBiometricUnlock]);

  const triggerError = (msg: string) => {
    setIsError(true);
    setErrorMessage(msg);
    setTimeout(() => {
      setPin('');
      setIsError(false);
    }, 650);
  };

  const handleComplete = useCallback(async (finalPin: string) => {
    if (mode === 'unlock') {
      const ok = await verifyPin(finalPin);
      if (ok) {
        handleFinishUnlock();
      } else {
        triggerError('PIN 번호가 일치하지 않습니다.');
      }
      return;
    }

    if (mode === 'setup') {
      if (step === 'new') {
        setNewPinCandidate(finalPin);
        setPin('');
        setStep('confirm');
      } else if (step === 'confirm') {
        if (finalPin === newPinCandidate) {
          await setAppPin(finalPin);
          handleFinishSetupOrChange();
        } else {
          triggerError('확인 PIN이 일치하지 않습니다. 다시 입력해 주세요.');
          setStep('new');
          setNewPinCandidate('');
        }
      }
      return;
    }

    if (mode === 'change') {
      if (step === 'current') {
        const ok = await verifyPin(finalPin);
        if (ok) {
          setPin('');
          setStep('new');
          setErrorMessage('');
        } else {
          triggerError('현재 PIN 번호가 일치하지 않습니다.');
        }
      } else if (step === 'new') {
        setNewPinCandidate(finalPin);
        setPin('');
        setStep('confirm');
      } else if (step === 'confirm') {
        if (finalPin === newPinCandidate) {
          await setAppPin(finalPin);
          handleFinishSetupOrChange();
        } else {
          triggerError('새 PIN이 일치하지 않습니다. 다시 입력해 주세요.');
          setStep('new');
          setNewPinCandidate('');
        }
      }
    }
  }, [mode, step, newPinCandidate, handleFinishUnlock, handleFinishSetupOrChange]);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    if (nextPin.length === 4) {
      setTimeout(() => {
        handleComplete(nextPin);
      }, 60);
    }
  }, [pin, handleComplete]);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setIsError(false);
    setErrorMessage('');
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setIsError(false);
    setErrorMessage('');
  }, []);

  // Physical keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' && allowCancel && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleDigit, handleBackspace, allowCancel, onClose]);

  const handleDisableAllSecurity = async () => {
    await clearAppPin();
    removeBiometric();
    setBiometricRegistered(false);
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  };

  const handleRegisterBiometric = async () => {
    setIsAuthenticatingBio(true);
    setErrorMessage('');
    try {
      const res = await registerBiometric();
      if (res.success) {
        setBiometricRegistered(true);
      } else {
        if (res.error) setErrorMessage(res.error);
      }
    } finally {
      setIsAuthenticatingBio(false);
    }
  };

  const handleRemoveBiometric = () => {
    removeBiometric();
    setBiometricRegistered(false);
  };

  if (!isOpen) return null;

  let title = '보안 잠금 해제';
  let subtitle = '비공개 보관함 및 명함 편집을 위해 PIN 또는 생체 인증을 입력하세요.';

  if (mode === 'setup') {
    title = step === 'new' ? '4자리 PIN 번호 설정' : 'PIN 번호 재입력 (확인)';
    subtitle = step === 'new' ? '공용 기기 및 화면 전환 시 보관함을 안전하게 보호합니다.' : '설정을 완료하기 위해 동일한 4자리를 다시 입력해 주세요.';
  } else if (mode === 'change') {
    if (step === 'current') {
      title = '현재 PIN 번호 입력';
      subtitle = '보안 인증을 위해 기존에 설정된 PIN을 입력해 주세요.';
    } else if (step === 'new') {
      title = '새로운 4자리 PIN 입력';
      subtitle = '앞으로 사용할 새로운 PIN 번호 4자리를 입력해 주세요.';
    } else {
      title = '새 PIN 번호 재입력 (확인)';
      subtitle = '새 PIN이 맞는지 다시 한 번 입력해 주세요.';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xs sm:max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-[var(--app-shadow)] p-5 sm:p-7 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cancel button if allowed */}
        {allowCancel && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[var(--app-text-muted)] hover:text-[var(--app-text)] rounded-full hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Account Badge in Unlock Mode */}
        {mode === 'unlock' && accountName && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[11px] font-semibold text-[var(--app-text)]">
            <UserCheck className="w-3.5 h-3.5 text-[var(--app-accent)] shrink-0" />
            <span className="truncate max-w-[180px]">{accountName}</span>
          </div>
        )}

        {/* Header Text */}
        <h3 className="text-lg font-bold text-[var(--app-text)] mb-1 tracking-tight text-center mt-1">
          {title}
        </h3>
        <p className="text-xs text-[var(--app-text-muted)] mb-5 text-center max-w-[240px] leading-relaxed">
          {subtitle}
        </p>

        {/* Biometric Quick Unlock Button (In Unlock Mode) */}
        {mode === 'unlock' && biometricSupported && biometricRegistered && (
          isBiometricThresholdExpired() ? (
            <div 
              onClick={() => triggerError('보안 임계치 초과: 7일간 PIN 미입력으로 생체 인증이 만료되었습니다. 4자리 PIN을 입력하세요.')}
              className="w-full mb-5 py-2 px-3 rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] text-xs flex items-center justify-between cursor-pointer hover:opacity-90 transition-all shadow-sm"
              title="7일 이상 PIN을 입력하지 않아 생체 인증이 무효화되었습니다. 4자리 PIN을 입력해 주세요."
            >
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-[var(--app-text-muted)] shrink-0" />
                <span className="text-[11px] font-medium leading-tight">7일 만료: PIN으로 재인증 필요</span>
              </div>
              <span className="text-[10px] font-bold text-[var(--app-text)] underline underline-offset-2 shrink-0">
                PIN 입력
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={triggerBiometricUnlock}
              disabled={isAuthenticatingBio}
              className="w-full mb-5 py-2.5 px-4 rounded-2xl bg-[var(--app-highlight)] hover:opacity-90 border border-[var(--app-border)] text-[var(--app-highlight-fg)] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            >
              <Fingerprint className="w-4 h-4 shrink-0" />
              <span>생체 인증으로 잠금 해제 ({biometricLabel})</span>
            </button>
          )
        )}

        {/* 4 Digit Indicators */}
        <div className={`flex items-center justify-center gap-4 mb-5 transition-transform duration-150 ${isError ? 'animate-bounce scale-105' : ''}`}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isError
                    ? 'bg-rose-500 ring-4 ring-rose-500/20'
                    : isFilled
                      ? 'bg-[var(--app-accent)] ring-4 ring-[var(--app-accent)]/20 scale-110 shadow-sm'
                      : 'bg-[var(--app-surface-subtle)] border border-[var(--app-border)]'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMessage ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-300 mb-4 bg-rose-500/10 border border-rose-500/25 px-3 py-1.5 rounded-xl font-medium text-center">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <div className="h-6 mb-2" />
        )}

        {/* Numeric Keypad (3x4 Layout: 1-9, Backspace, 0, Clear) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[260px] mb-2 sm:mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 sm:h-14 rounded-2xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] active:scale-95 border border-[var(--app-border)] text-[var(--app-text)] font-semibold text-lg sm:text-xl tabular-nums transition-all duration-150 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 sm:h-14 rounded-2xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] active:scale-95 border border-[var(--app-border)] text-[var(--app-text-muted)] flex items-center justify-center transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="지우기"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 sm:h-14 rounded-2xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] active:scale-95 border border-[var(--app-border)] text-[var(--app-text)] font-semibold text-lg sm:text-xl tabular-nums transition-all duration-150 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="h-12 sm:h-14 rounded-2xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] active:scale-95 border border-[var(--app-border)] text-[var(--app-text-muted)] text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="전체 지우기"
          >
            Clear
          </button>
        </div>

        {/* Biometrics Setup / Management Section (In Setup / Change mode) */}
        {(mode === 'setup' || mode === 'change') && biometricSupported && (
          <div className="w-full mt-2 pt-3 border-t border-[var(--app-border)] flex flex-col items-center">
            <div className="flex items-center justify-between w-full text-xs mb-2 px-1">
              <span className="text-[var(--app-text-muted)] flex items-center gap-1.5 font-medium">
                <Fingerprint className="w-3.5 h-3.5 text-[var(--app-text)]" />
                <span>{biometricLabel} 연동</span>
              </span>
              {biometricRegistered ? (
                <span className="text-[11px] font-semibold text-[var(--app-accent)] flex items-center gap-1">
                  <Check className="w-3 h-3" /> 활성화됨
                </span>
              ) : (
                <span className="text-[11px] text-[var(--app-text-muted)]">미등록</span>
              )}
            </div>

            {biometricRegistered ? (
              <button
                type="button"
                onClick={handleRemoveBiometric}
                className="w-full py-1.5 px-3 rounded-xl bg-[var(--app-surface-subtle)] hover:opacity-80 border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] text-[11px] transition-all cursor-pointer"
              >
                {biometricLabel} 연동 해제
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegisterBiometric}
                disabled={isAuthenticatingBio}
                className="w-full py-2 px-3 rounded-xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-semibold transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>생체 인증 등록 ({biometricLabel})</span>
              </button>
            )}
          </div>
        )}

        {/* Bottom Options (Disable All Security if in Setup or Change mode and PIN exists) */}
        {(mode === 'setup' || mode === 'change') && hasExistingPin && (
          <button
            type="button"
            onClick={handleDisableAllSecurity}
            className="mt-3 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] underline underline-offset-4 cursor-pointer transition-colors"
          >
            PIN 및 생체 인증 잠금 해제 (보안 기능 끄기)
          </button>
        )}

        {/* Account Switch / Logout escape hatch when locked */}
        {mode === 'unlock' && onLogoutToWelcome && (
          <button
            type="button"
            onClick={onLogoutToWelcome}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>다른 계정으로 전환 / 로그아웃</span>
          </button>
        )}
      </div>
    </div>
  );
};

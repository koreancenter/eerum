import { useState, useEffect, useCallback, useRef } from 'react';
import { isPinSet, getSessionLocked, setSessionLocked } from '../utils/pinLock';
import { clearMemoryDecryptedCards } from '../utils/initialCards';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const BIOMETRIC_CREDENTIAL_KEY = 'app_biometric_credential_id';

export function useAutoLock() {
  const isSecurityActive = () =>
    isPinSet() ||
    (typeof window !== 'undefined' && Boolean(localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY)));

  const [isLocked, setIsLockedState] = useState<boolean>(() => {
    return isSecurityActive() && getSessionLocked();
  });

  const [isPinConfigured, setIsPinConfigured] = useState<boolean>(() => isSecurityActive());
  const idleTimerRef = useRef<number | null>(null);

  // Synchronize state with sessionStorage and wipe plaintext memory cache on lock
  const setIsLocked = useCallback((locked: boolean) => {
    if (locked) {
      clearMemoryDecryptedCards();
    }
    setIsLockedState(locked);
    setSessionLocked(locked);
  }, []);

  // Manual instant lock
  const lockApp = useCallback(() => {
    if (isSecurityActive()) {
      setIsLocked(true);
    }
  }, [setIsLocked]);

  // Unlock helper
  const unlockApp = useCallback(() => {
    setIsLocked(false);
  }, [setIsLocked]);

  // Refresh PIN / Biometric configured status
  const refreshPinStatus = useCallback(() => {
    const configured = isSecurityActive();
    setIsPinConfigured(configured);
    if (!configured) {
      setIsLocked(false);
    }
  }, [setIsLocked]);

  // 1. Page Visibility Lock (`visibilitychange`)
  // When switching tabs, minimizing browser, or locking phone
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (isSecurityActive()) {
          setIsLocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setIsLocked]);

  // 2. Idle Timeout Lock (5 minutes)
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    if (isSecurityActive() && !isLocked) {
      idleTimerRef.current = window.setTimeout(() => {
        if (isSecurityActive()) {
          setIsLocked(true);
        }
      }, IDLE_TIMEOUT_MS);
    }
  }, [isLocked, setIsLocked]);

  useEffect(() => {
    if (!isPinConfigured || isLocked) {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    // Set initial timer
    resetIdleTimer();

    // Listen to user interaction events to reset the timer
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      resetIdleTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isPinConfigured, isLocked, resetIdleTimer]);

  return {
    isLocked,
    setIsLocked,
    lockApp,
    unlockApp,
    isPinConfigured,
    refreshPinStatus
  };
}

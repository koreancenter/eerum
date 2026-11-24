import { useState, useEffect, useCallback, useRef } from 'react';
import { isPinSet, getSessionLocked, setSessionLocked } from '../utils/pinLock';
import { isBiometricRegistered } from '../utils/biometrics';
import { clearMemoryDecryptedCards } from '../utils/initialCards';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function useAutoLock(activeAccountId: string | null) {
  const isSecurityActive = useCallback(
    (targetAccountId: string | null = activeAccountId) => {
      if (!targetAccountId) return false;
      return isPinSet(targetAccountId) || isBiometricRegistered(targetAccountId);
    },
    [activeAccountId]
  );

  const [isLocked, setIsLockedState] = useState<boolean>(() => {
    if (!activeAccountId) return false;
    return isSecurityActive(activeAccountId) && getSessionLocked(activeAccountId);
  });

  const [isPinConfigured, setIsPinConfigured] = useState<boolean>(() =>
    isSecurityActive(activeAccountId)
  );
  const idleTimerRef = useRef<number | null>(null);

  // Synchronize state with sessionStorage and wipe plaintext memory cache on lock
  const setIsLocked = useCallback(
    (locked: boolean, targetAccountId: string | null = activeAccountId) => {
      if (!targetAccountId) {
        setIsLockedState(false);
        return;
      }
      if (locked) {
        clearMemoryDecryptedCards();
      }
      setIsLockedState(locked);
      setSessionLocked(locked, targetAccountId);
    },
    [activeAccountId]
  );

  // Re-evaluate lock & PIN configuration immediately whenever the active account changes
  useEffect(() => {
    if (!activeAccountId) {
      setIsPinConfigured(false);
      setIsLockedState(false);
      return;
    }
    const configured = isSecurityActive(activeAccountId);
    setIsPinConfigured(configured);
    setIsLockedState(configured && getSessionLocked(activeAccountId));
  }, [activeAccountId, isSecurityActive]);

  // Manual instant lock
  const lockApp = useCallback(() => {
    if (activeAccountId && isSecurityActive(activeAccountId)) {
      setIsLocked(true, activeAccountId);
    }
  }, [activeAccountId, isSecurityActive, setIsLocked]);

  // Unlock helper
  const unlockApp = useCallback(
    (targetAccountId?: string | null) => {
      const id = targetAccountId ?? activeAccountId;
      if (!id) {
        setIsLockedState(false);
        return;
      }
      setIsLocked(false, id);
    },
    [activeAccountId, setIsLocked]
  );

  // Refresh PIN / Biometric configured status
  const refreshPinStatus = useCallback(
    (targetAccountId?: string | null) => {
      const id = targetAccountId ?? activeAccountId;
      if (!id) {
        setIsPinConfigured(false);
        setIsLockedState(false);
        return;
      }
      const configured = isSecurityActive(id);
      setIsPinConfigured(configured);
      if (!configured) {
        setIsLocked(false, id);
      }
    },
    [activeAccountId, isSecurityActive, setIsLocked]
  );

  // 1. Page Visibility Lock (`visibilitychange`)
  // When switching tabs, minimizing browser, or locking phone
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (activeAccountId && isSecurityActive(activeAccountId)) {
          setIsLocked(true, activeAccountId);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeAccountId, isSecurityActive, setIsLocked]);

  // 2. Idle Timeout Lock (5 minutes)
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    if (activeAccountId && isSecurityActive(activeAccountId) && !isLocked) {
      idleTimerRef.current = window.setTimeout(() => {
        if (activeAccountId && isSecurityActive(activeAccountId)) {
          setIsLocked(true, activeAccountId);
        }
      }, IDLE_TIMEOUT_MS);
    }
  }, [activeAccountId, isSecurityActive, isLocked, setIsLocked]);

  useEffect(() => {
    if (!activeAccountId || !isPinConfigured || isLocked) {
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
  }, [activeAccountId, isPinConfigured, isLocked, resetIdleTimer]);

  return {
    isLocked,
    setIsLocked,
    lockApp,
    unlockApp,
    isPinConfigured,
    refreshPinStatus
  };
}

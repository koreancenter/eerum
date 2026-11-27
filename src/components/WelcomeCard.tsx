import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Eye,
  Lock,
  Fingerprint,
  ArrowRight,
  Trash2,
  UserCheck,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { LocalAccountActionResult, LocalAccountMeta } from '../utils/localAccount';
import {
  getBiometricLabel,
  isBiometricSupported,
  isBiometricThresholdExpired,
} from '../utils/biometrics';
import { useLocale, type TranslationDictionary } from '../hooks/useLocale';

export interface WelcomeCardProps {
  accounts: LocalAccountMeta[];
  onOpenCreateAccount: () => void;
  onExploreSample: () => void;
  onLoginAccount: (accountId: string, pin?: string) => Promise<LocalAccountActionResult>;
  onBiometricLoginAccount: (accountId: string) => Promise<LocalAccountActionResult>;
  onDeleteAccount?: (accountId: string) => void;
}

function formatAccountLastLogin(iso: string, w: TranslationDictionary['welcome']): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return w.recentlyUsed;
  const diffHours = Math.floor((Date.now() - ms) / (60 * 60 * 1000));
  if (diffHours < 1) return w.justNow;
  if (diffHours < 24) return w.hoursAgo(diffHours);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return w.yesterday;
  if (diffDays < 30) return w.daysAgo(diffDays);
  return new Date(ms).toLocaleDateString();
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  accounts,
  onOpenCreateAccount,
  onExploreSample,
  onLoginAccount,
  onBiometricLoginAccount,
  onDeleteAccount,
}) => {
  const { locale, t } = useLocale();
  const hasAccounts = accounts.length > 0;
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => accounts[0]?.id || '');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioLabel, setBioLabel] = useState(() => getBiometricLabel());

  useEffect(() => {
    setBioLabel(getBiometricLabel());
    void isBiometricSupported().then(setBioSupported);
  }, [locale]);

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountId('');
      setPinInput('');
      setLoginError(null);
      setConfirmDeleteId(null);
      return;
    }
    if (!accounts.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0].id);
      setPinInput('');
      setLoginError(null);
      setConfirmDeleteId(null);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;
  const isBioExpired = selectedAccount ? isBiometricThresholdExpired(selectedAccount.id) : false;
  const canUseBioForSelected = Boolean(
    selectedAccount &&
      selectedAccount.hasPin &&
      selectedAccount.biometricsEnabled &&
      bioSupported &&
      !isBioExpired
  );

  const submitPinLogin = async (accountId: string, enteredPin?: string) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await onLoginAccount(accountId, enteredPin);
      if (!res.ok) {
        setLoginError(res.error || t.welcome.loginFailed);
        setPinInput('');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePinChange = (rawValue: string) => {
    const clean = rawValue.replace(/\D/g, '').slice(0, 4);
    setPinInput(clean);
    if (loginError) setLoginError(null);
    if (clean.length === 4 && selectedAccount) {
      void submitPinLogin(selectedAccount.id, clean);
    }
  };

  const handleBioLogin = async () => {
    if (!selectedAccount || isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await onBiometricLoginAccount(selectedAccount.id);
      if (!res.ok) {
        setLoginError(res.error || t.welcome.bioLoginFailed);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <section
      aria-label={t.welcome.sectionAria}
      className="relative w-full max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-6 select-none flex flex-col items-center justify-center text-center"
    >
      {/* Subtle Ambient Accent Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[480px] h-[180px] sm:h-[240px] rounded-full opacity-15 blur-3xl"
        style={{
          background: 'radial-gradient(ellipse at center, var(--app-accent), transparent 72%)',
        }}
      />

      {/* 1. Minimalist Card Emblem & Editorial Typography */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          aria-hidden="true"
          className="w-11 h-6 sm:w-12 sm:h-7 mb-3 sm:mb-4 rounded-md bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] flex items-end justify-start p-1.5"
        >
          <span className="w-3 h-[2px] rounded-full bg-[var(--app-accent)]" />
        </div>

        <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.28em] text-[var(--app-text-muted)] uppercase">
          {t.welcome.eyebrow}
        </p>

        <h1 className="mt-2 text-3xl sm:text-[42px] font-medium tracking-wide text-[var(--app-text)] leading-tight text-balance">
          eerum
          {t.welcome.titleKr && (
            <span className="ml-2.5 font-light text-[var(--app-text-muted)] text-xl sm:text-3xl tracking-widest">
              {t.welcome.titleKr}
            </span>
          )}
        </h1>

        <p className="mt-2.5 text-xs sm:text-sm text-[var(--app-text-muted)] font-normal tracking-wide leading-relaxed max-w-md mx-auto text-balance">
          {t.welcome.heroSubLine1}
          <br className="hidden sm:inline" /> {t.welcome.heroSubLine2}
        </p>
      </div>

      {/* 2. Existing Local Accounts Quick Login OR Primary Conversion CTAs */}
      {hasAccounts ? (
        <div className="relative z-10 w-full max-w-md mt-6 space-y-3 text-left">
          <div className="rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-4 h-4 text-[var(--app-accent)] shrink-0" />
                <h2 className="text-sm font-bold text-[var(--app-text)] tracking-tight">
                  {t.welcome.existingAccountTitle}
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[var(--app-text-muted)] tabular-nums shrink-0">
                {t.welcome.accountCount(accounts.length)}
              </span>
            </div>

            {/* Account Picker List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {accounts.map((acct) => {
                const isSelected = selectedAccount?.id === acct.id;
                const isConfirmingDelete = confirmDeleteId === acct.id;

                return (
                  <div
                    key={acct.id}
                    className={`rounded-xl border transition-all flex items-center justify-between gap-2 px-3 py-2.5 ${
                      isSelected
                        ? 'bg-[var(--app-surface-subtle)] border-[var(--app-accent)] shadow-xs'
                        : 'bg-[var(--app-surface)] border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAccountId(acct.id);
                        setPinInput('');
                        setLoginError(null);
                        setConfirmDeleteId(null);
                      }}
                      className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
                    >
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)]'
                            : 'bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] border border-[var(--app-border)]'
                        }`}
                      >
                        {acct.displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-[13px] font-semibold text-[var(--app-text)] truncate">
                            {acct.displayName}
                          </span>
                          {acct.hasPin && (
                            <Lock className="w-3 h-3 text-[var(--app-text-muted)] shrink-0" />
                          )}
                          {acct.hasPin && acct.biometricsEnabled && (
                            <Fingerprint className="w-3 h-3 text-[var(--app-accent)] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--app-text-muted)] truncate">
                          {acct.hasPin ? t.welcome.pinProtected : t.welcome.noPin} ·{' '}
                          {formatAccountLastLogin(acct.lastLoginAt || acct.createdAt, t.welcome)}
                        </p>
                      </div>
                    </button>

                    {onDeleteAccount && (
                      <div className="flex items-center gap-1 shrink-0">
                        {isConfirmingDelete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                onDeleteAccount(acct.id);
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                            >
                              {t.common.confirmDelete}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] text-[10px] cursor-pointer whitespace-nowrap"
                            >
                              {t.common.cancel}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(acct.id)}
                            aria-label={t.welcome.deleteAccountAria(acct.displayName)}
                            title={t.welcome.deleteAccountTitle}
                            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Account Auth Controls */}
            {selectedAccount && (
              <div className="pt-2 border-t border-[var(--app-border)] space-y-2.5">
                {selectedAccount.hasPin ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submitPinLogin(selectedAccount.id, pinInput);
                    }}
                    className="space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={pinInput}
                        onChange={(e) => handlePinChange(e.target.value)}
                        disabled={isLoggingIn}
                        placeholder={t.welcome.pinPlaceholder}
                        aria-label={t.welcome.pinAria(selectedAccount.displayName)}
                        className="flex-1 h-10 px-3.5 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-center font-mono text-base tracking-[0.35em] text-[var(--app-text)] placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-[var(--app-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 focus:border-[var(--app-accent)]"
                      />
                      <button
                        type="submit"
                        disabled={isLoggingIn || pinInput.length !== 4}
                        className="h-10 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-45 text-[var(--app-accent-fg)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0"
                      >
                        {isLoggingIn ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>{t.welcome.login}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {canUseBioForSelected && (
                      <button
                        type="button"
                        onClick={handleBioLogin}
                        disabled={isLoggingIn}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--app-highlight)] hover:opacity-90 border border-[var(--app-border)] text-[var(--app-highlight-fg)] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all"
                      >
                        <Fingerprint className="w-4 h-4 shrink-0" />
                        <span>{t.welcome.bioQuickLogin(bioLabel)}</span>
                      </button>
                    )}

                    {selectedAccount.biometricsEnabled && isBioExpired && (
                      <p className="text-[11px] text-[var(--app-text-muted)] flex items-center gap-1.5 px-1">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.welcome.bioPolicyExpired}</span>
                      </p>
                    )}
                  </form>
                ) : (
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => void submitPinLogin(selectedAccount.id)}
                    className="w-full h-10 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs sm:text-[13px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-sm"
                  >
                    {isLoggingIn ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>{t.welcome.openVaultFor(selectedAccount.displayName)}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}

                {loginError && (
                  <div
                    role="alert"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-300 font-medium"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Secondary Actions when Accounts Already Exist */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={onOpenCreateAccount}
              className="h-10 px-4 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2] shrink-0" />
              <span>{t.welcome.createNewLocalAccount}</span>
            </button>

            <button
              type="button"
              onClick={onExploreSample}
              className="h-10 px-4 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 stroke-[1.75] shrink-0" />
              <span>{t.welcome.exploreSample}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Focused Hero CTAs when No Local Account Exists Yet */
        <div className="relative z-10 w-full max-w-lg mt-6 flex flex-row items-center justify-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={onOpenCreateAccount}
            className="h-11 px-5 sm:px-6 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] font-semibold text-xs sm:text-[13px] tracking-wide shadow-[var(--app-shadow)] inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
            <span>{t.welcome.createLocalAccount}</span>
          </button>

          <button
            type="button"
            onClick={onExploreSample}
            className="h-11 px-4 sm:px-5 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text)] font-medium text-xs sm:text-[13px] tracking-wide inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <Eye className="w-3.5 h-3.5 stroke-[1.6] text-[var(--app-text-muted)] shrink-0" />
            <span>{t.welcome.exploreSample}</span>
          </button>
        </div>
      )}

      {/* 3. Sleek Horizontal 3-Column Feature Bar */}
      <div className="relative z-10 w-full max-w-2xl mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        {t.welcome.features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] px-2 py-2.5 sm:px-4 sm:py-3 flex flex-col items-center justify-center text-center gap-1 shadow-[var(--app-shadow)] transition-colors duration-200"
          >
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-[var(--app-text)] leading-snug">
              {feature.title}
            </span>
            <span className="text-[9.5px] sm:text-[11px] font-normal tracking-wide text-[var(--app-text-muted)] leading-snug">
              {feature.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WelcomeCard;

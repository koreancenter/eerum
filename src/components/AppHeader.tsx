import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Compass,
  CreditCard,
  Download,
  Fingerprint,
  FolderArchive,
  HardDriveDownload,
  KeyRound,
  Lock,
  LogOut,
  RotateCcw,
  Settings,
  Smartphone,
  Upload,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { AppThemeSelector } from './AppThemeSelector';
import type { ActiveTab } from '../hooks/useCardVault';
import type { LocalAccountMeta } from '../utils/localAccount';

export interface AppHeaderProps {
  isUnauthenticatedExternalVisitor: boolean;
  isLoggedOutLanding: boolean;
  isSamplePreview: boolean;
  isMyCardTabActive: boolean;
  isVaultTabActive: boolean;
  headerVaultCount: number;
  activeAccount: LocalAccountMeta | null;
  accountsList: LocalAccountMeta[];
  myCardsCount: number;
  vaultCardsCount: number;
  isPinConfigured: boolean;
  isLocked: boolean;
  isSettingsOpen: boolean;
  settingsMenuRef: React.RefObject<HTMLDivElement | null>;
  isPwaInstalled: boolean;
  onTabChange: (nextTab: ActiveTab, targetMyCardId?: string) => void;
  onExitSampleToCreateAccount: () => void;
  onExitSample: () => void;
  onLoginAccount: (accountId: string) => Promise<unknown>;
  onLogoutAccount: () => void;
  onLockApp: () => void;
  onOpenCreateAccount: () => void;
  onOpenPinConfig: (mode: 'setup' | 'change') => void;
  onOpenBackup: (tab: 'export' | 'restore') => void;
  onToggleSettings: () => void;
  onCloseSettings: () => void;
  onOpenBiometrics: () => void;
  onOpenSync: () => void;
  onClickPwaInstall: () => void;
  onOpenAbout: () => void;
  onOpenReset: () => void;
  onShowToast: (msg: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isUnauthenticatedExternalVisitor,
  isLoggedOutLanding,
  isSamplePreview,
  isMyCardTabActive,
  isVaultTabActive,
  headerVaultCount,
  activeAccount,
  accountsList,
  myCardsCount,
  vaultCardsCount,
  isPinConfigured,
  isLocked,
  isSettingsOpen,
  settingsMenuRef,
  isPwaInstalled,
  onTabChange,
  onExitSampleToCreateAccount,
  onExitSample,
  onLoginAccount,
  onLogoutAccount,
  onLockApp,
  onOpenCreateAccount,
  onOpenPinConfig,
  onOpenBackup,
  onToggleSettings,
  onCloseSettings,
  onOpenBiometrics,
  onOpenSync,
  onClickPwaInstall,
  onOpenAbout,
  onOpenReset,
  onShowToast,
}) => {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [activeAccount?.id, isSamplePreview]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAccountMenuOpen]);

  const handleSelectTab = (tab: ActiveTab) => {
    setIsAccountMenuOpen(false);
    onTabChange(tab);
  };

  return (
    <header className="shrink-0 sticky top-0 z-40 w-full border-b border-[var(--app-border)] bg-[var(--app-header-bg)] backdrop-blur-xl px-3 sm:px-8 py-2 sm:py-2.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(0.625rem+env(safe-area-inset-top,0px))] pl-[calc(0.75rem+env(safe-area-inset-left,0px))] pr-[calc(0.75rem+env(safe-area-inset-right,0px))] sm:pl-[calc(2rem+env(safe-area-inset-left,0px))] sm:pr-[calc(2rem+env(safe-area-inset-right,0px))] flex items-center justify-between gap-1.5 sm:gap-2 main-app-header">
      {isUnauthenticatedExternalVisitor ? (
        /* Public Unauthenticated Visitor Header: Muted Brand Watermark Only */
        <>
          <div className="w-full flex items-center justify-center py-0.5 header-brand-mark">
            <span className="text-xs text-[var(--app-text-muted)] tracking-widest uppercase font-medium select-none font-sans">
              GOGUMA CARD STUDIO
            </span>
          </div>
          <div className="hidden header-landscape-mini items-center bg-[var(--app-surface)] border border-[var(--app-border)] rounded-full px-3 py-1 shadow-[var(--app-shadow)]">
            <span className="text-[10px] font-semibold text-[var(--app-text)] tracking-widest uppercase">
              GOGUMA
            </span>
          </div>
        </>
      ) : isLoggedOutLanding ? (
        /* Minimal Unauthenticated Welcome Header: Theme Selector + About Only */
        <>
          <div className="flex items-center gap-2 header-full-nav">
            <span className="text-sm font-black tracking-tight text-[var(--app-text)] select-none">
              eerum
            </span>
            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--app-text-muted)]">
              Local-First Vault
            </span>
          </div>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2 min-h-[32px] header-full-nav">
            <AppThemeSelector />
            <button
              type="button"
              onClick={onOpenAbout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-xs font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              title="앱 소개 · Net to Dot 철학"
              aria-label="앱 소개"
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">앱 소개</span>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Left Spacer / Brand Indicator for Header Balance on sm+ */}
          <div className="hidden sm:flex sm:flex-1 items-center justify-start header-full-nav">
            <span className="text-xs font-black tracking-tight text-[var(--app-text-muted)] select-none">
              eerum
            </span>
          </div>

          {/* Compressed Mini Icon in Landscape Mode */}
          <div className="hidden header-landscape-mini items-center gap-1 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-full p-1 shadow-[var(--app-shadow)]">
            <button
              onClick={() => {
                if (isMyCardTabActive) {
                  handleSelectTab('vault');
                } else {
                  handleSelectTab('my-card');
                }
              }}
              className="p-1.5 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
              title={isMyCardTabActive ? '보관함으로 전환' : '내 명함으로 전환'}
              aria-label="화면 전환"
            >
              {isMyCardTabActive ? (
                <FolderArchive className="w-3.5 h-3.5" />
              ) : (
                <CreditCard className="w-3.5 h-3.5" />
              )}
            </button>
            {!isSamplePreview && isPinConfigured && (
              <button
                onClick={() => {
                  onLockApp();
                  onShowToast('화면이 보안 잠금되었습니다.');
                }}
                className="p-1.5 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
                title="즉시 화면 잠금"
                aria-label="화면 잠금"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
            {!isSamplePreview && (
              <button
                onClick={onToggleSettings}
                className="p-1.5 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
                title="설정"
                aria-label="설정"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Center Navigation: Switcher (내 명함 vs 명함 보관함) */}
          <nav aria-label="주요 메뉴" className="flex items-center gap-1 sm:gap-1.5 min-w-0 header-full-nav">
            <button
              onClick={() => handleSelectTab('my-card')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                isMyCardTabActive
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span>내 명함</span>
            </button>

            <button
              onClick={() => handleSelectTab('vault')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                isVaultTabActive
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5 shrink-0" />
              <span>명함 보관함</span>
              {!isSamplePreview && isPinConfigured && isLocked && (
                <Lock className="w-3 h-3 shrink-0" />
              )}
              <span
                className={`text-[10px] font-mono tabular-nums ${
                  isVaultTabActive ? 'opacity-85' : 'text-[var(--app-text-muted)]'
                }`}
              >
                {headerVaultCount}
              </span>
            </button>
          </nav>

          {/* Right Header: Sample CTA OR Logged-In Account Pill, Lock & Settings */}
          <div className="sm:flex-1 flex items-center justify-end gap-1 sm:gap-2 min-h-[32px] relative shrink-0 header-full-nav">
            <AppThemeSelector />

            {isSamplePreview ? (
              <div className="inline-flex items-center rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm shrink-0">
                <button
                  type="button"
                  onClick={onExitSampleToCreateAccount}
                  className="pl-2.5 sm:pl-3 pr-1.5 sm:pr-2 py-1.5 text-[11px] sm:text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] rounded-l-full transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  계정 만들기
                </button>
                <span className="h-3.5 w-px bg-[var(--app-border)] shrink-0" aria-hidden="true" />
                <button
                  type="button"
                  onClick={onExitSample}
                  title="샘플 종료"
                  aria-label="샘플 종료"
                  className="pl-1.5 pr-2 sm:pr-2.5 py-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] rounded-r-full transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                {/* Active Local Account Profile Pill & Dropdown */}
                {activeAccount && (
                  <div className="relative" ref={accountMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        onCloseSettings();
                        setIsAccountMenuOpen((prev) => !prev);
                      }}
                      aria-expanded={isAccountMenuOpen}
                      aria-haspopup="menu"
                      className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                      title={`로컬 계정: ${activeAccount.displayName}`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[var(--app-accent)] shrink-0" />
                      <span className="truncate max-w-[72px] sm:max-w-[110px]">
                        {activeAccount.displayName}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-[var(--app-text-muted)] transition-transform duration-150 shrink-0 ${
                          isAccountMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isAccountMenuOpen && (
                      <div
                        role="menu"
                        aria-label="로컬 계정 메뉴"
                        className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--app-text)]"
                      >
                        <div className="px-2.5 py-2 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] mb-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[var(--app-text)] truncate">
                              {activeAccount.displayName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)] shrink-0">
                              {isPinConfigured ? 'PIN 잠금' : '잠금 없음'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--app-text-muted)] mt-1 tabular-nums">
                            내 명함 {myCardsCount} · 보관함 {vaultCardsCount}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onLogoutAccount();
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                          <span>계정 잠금 / 로그아웃</span>
                        </button>

                        {accountsList.filter((a) => a.id !== activeAccount?.id).length > 0 && (
                          <>
                            <div className="my-1.5 border-t border-[var(--app-border)]" />
                            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
                              로컬 계정 전환
                            </p>
                            <div className="max-h-36 overflow-y-auto space-y-0.5">
                              {accountsList
                                .filter((a) => a.id !== activeAccount?.id)
                                .map((acct) => (
                                  <button
                                    key={acct.id}
                                    type="button"
                                    onClick={async () => {
                                      setIsAccountMenuOpen(false);
                                      if (!acct.hasPin) {
                                        await onLoginAccount(acct.id);
                                      } else {
                                        onLogoutAccount();
                                        onShowToast(`'${acct.displayName}' 계정의 PIN을 입력해 주세요.`);
                                      }
                                    }}
                                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                                  >
                                    <span className="truncate">{acct.displayName}</span>
                                    {acct.hasPin && (
                                      <Lock className="w-3 h-3 text-[var(--app-text-muted)] shrink-0" />
                                    )}
                                  </button>
                                ))}
                            </div>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenCreateAccount();
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 mt-0.5 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                          <span>새 로컬 계정 추가</span>
                        </button>

                        <div className="my-1.5 border-t border-[var(--app-border)]" />
                        <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
                          계정 보안 및 백업
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenPinConfig(isPinConfigured ? 'change' : 'setup');
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                          <span>{isPinConfigured ? 'PIN 번호 변경' : '4자리 PIN 설정'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenBackup('export');
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                        >
                          <HardDriveDownload className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                          <span>암호화 백업 (.eerum)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isPinConfigured && (
                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onLockApp();
                      onShowToast('화면이 보안 잠금되었습니다.');
                    }}
                    className="p-2 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                    title="즉시 화면 잠금 (Lock Screen)"
                    aria-label="화면 잠금"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                )}

                <div className="relative" ref={settingsMenuRef}>
                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onToggleSettings();
                    }}
                    aria-expanded={isSettingsOpen}
                    aria-haspopup="menu"
                    className="p-2 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                    title="보안 및 기기 설정"
                    aria-label="설정 메뉴"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {isSettingsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--app-text)]">
                      <button
                        onClick={() => {
                          onCloseSettings();
                          onOpenPinConfig(isPinConfigured ? 'change' : 'setup');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                      >
                        <Lock className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                        <span>{isPinConfigured ? 'PIN 번호 변경 / 관리' : '4자리 PIN 보안 설정'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onCloseSettings();
                          onOpenBiometrics();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                      >
                        <Fingerprint className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                        <span>생체 인증 (Face ID / 지문)</span>
                      </button>

                      <div className="my-1 border-t border-[var(--app-border)]" />

                      <button
                        onClick={() => {
                          onCloseSettings();
                          onOpenBackup('export');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                      >
                        <HardDriveDownload className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                        <span>보관함 백업 내보내기 (.eerum)</span>
                      </button>

                      <button
                        onClick={() => {
                          onCloseSettings();
                          onOpenBackup('restore');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                      >
                        <Upload className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                        <span>백업 파일에서 복원</span>
                      </button>

                      <button
                        onClick={() => {
                          onCloseSettings();
                          onOpenSync();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                        <span>기기 연결 및 동기화</span>
                      </button>

                      <button
                        onClick={() => {
                          onCloseSettings();
                          onClickPwaInstall();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <Download className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                          <span>홈 화면에 앱 설치 (PWA)</span>
                        </div>
                        {isPwaInstalled && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-500/15 px-1.5 py-0.5 rounded font-medium border border-emerald-500/25">
                            설치됨
                          </span>
                        )}
                      </button>

                      <div className="my-1 border-t border-[var(--app-border)]" />

                      <button
                        onClick={() => {
                          onCloseSettings();
                          onOpenAbout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                      >
                        <Compass className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                        <span>앱 소개 · Net to Dot 철학</span>
                      </button>

                      <button
                        onClick={() => {
                          onCloseSettings();
                          onLogoutAccount();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                        <span>로그아웃 / 계정 전환</span>
                      </button>

                      <button
                        onClick={() => {
                          onCloseSettings();
                          onOpenReset();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left"
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span>로컬 데이터 초기화</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </header>
  );
};

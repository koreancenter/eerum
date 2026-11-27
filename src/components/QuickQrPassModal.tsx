import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  UserPlus,
  Share2,
  Wallpaper,
  Sun,
  Moon,
  Check,
  Sparkles,
} from 'lucide-react';
import { StoredCard } from '@/types/card';
import { getCardShareUrl, getCardDisplayUrl } from '@/utils/cardSerializer';
import { downloadVCard, generateVCard } from '@/utils/cardExporter';
import { shareOrCopyLink } from '@/utils/share';
import {
  downloadLockscreenWallpaper,
  type LockscreenWallpaperTheme,
} from '@/utils/lockscreenWallpaper';
import { useLocale } from '@/hooks/useLocale';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
  removeEventListener?: (type: 'release', listener: () => void) => void;
}

export interface QuickQrPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: StoredCard;
  onShowToast?: (msg: string) => void;
}

export const QuickQrPassModal: React.FC<QuickQrPassModalProps> = ({
  isOpen,
  onClose,
  card,
  onShowToast,
}) => {
  const { isEn, t } = useLocale();
  const [qrType, setQrType] = useState<'url' | 'vcard'>('url');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [wallpaperTheme, setWallpaperTheme] = useState<LockscreenWallpaperTheme>('dark');
  const [isGeneratingWallpaper, setIsGeneratingWallpaper] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [copied, setCopied] = useState(false);

  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const cardUrl = getCardShareUrl(card);
  const displayUrl = getCardDisplayUrl(card) || cardUrl.replace(/^https?:\/\//i, '');
  const data = card.data;
  const primaryName = (data.name || data.nameKr || t.common.cardFallback).trim();
  const primaryTitle = (data.titleKr || data.title || '').trim();
  const primaryOrg = (data.organizationKr || data.organization || '').trim();

  // Generate high-contrast QR code
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const payload = qrType === 'url' ? cardUrl : generateVCard(data);
    QRCode.toDataURL(payload, {
      width: 640,
      margin: 2.5,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0A0A0B',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Quick QR generation error:', err);
      });

    return () => {
      active = false;
    };
  }, [isOpen, qrType, cardUrl, data]);

  // Screen Wake Lock API: prevent screen dimming during in-person networking
  useEffect(() => {
    if (!isOpen) return;
    let isDisposed = false;

    const requestWakeLock = async () => {
      if (typeof navigator === 'undefined') return;
      const navWithWakeLock = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      };
      if (!navWithWakeLock.wakeLock || typeof navWithWakeLock.wakeLock.request !== 'function') {
        return;
      }

      try {
        if (wakeLockRef.current && !wakeLockRef.current.released) {
          return;
        }
        const sentinel = await navWithWakeLock.wakeLock.request('screen');
        if (isDisposed) {
          sentinel.release().catch(() => {});
          return;
        }
        wakeLockRef.current = sentinel;
        setIsWakeLockActive(true);
        sentinel.addEventListener?.('release', () => {
          if (!isDisposed) {
            setIsWakeLockActive(false);
          }
        });
      } catch {
        // Unsupported iframe policy, battery saver mode, or browser restriction
        if (!isDisposed) {
          setIsWakeLockActive(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isDisposed) {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        wakeLockRef.current.release().catch(() => {});
      }
      wakeLockRef.current = null;
      setIsWakeLockActive(false);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveVCard = () => {
    downloadVCard(data);
    onShowToast?.(t.cardActions.vcardDownloadedToast(primaryName));
  };

  const handleWebShare = async () => {
    const summary = [primaryOrg, primaryTitle, primaryName].filter(Boolean).join(' ');
    await shareOrCopyLink({
      title: primaryOrg ? `${primaryName} — ${primaryOrg}` : primaryName,
      text: t.modals.shareCardIntroText(summary),
      url: cardUrl,
      onCopied: () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onShowToast?.(t.cardActions.linkCopiedToast);
      },
      onCopyError: () => onShowToast?.(t.cardActions.linkCopyFailedToast),
    });
  };

  const handleDownloadWallpaper = async () => {
    if (isGeneratingWallpaper) return;
    setIsGeneratingWallpaper(true);
    try {
      await downloadLockscreenWallpaper({
        data,
        cardUrl,
        theme: wallpaperTheme,
        qrMode: qrType,
      });
      onShowToast?.(t.modals.wallpaperSavedToast(wallpaperTheme));
    } catch {
      onShowToast?.(t.modals.wallpaperFailedToast);
    } finally {
      setIsGeneratingWallpaper(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.modals.quickQrAria}
      className="fixed inset-0 z-50 bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col justify-between overflow-y-auto pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] animate-in fade-in duration-150"
    >
      {/* Top Pass Header */}
      <div className="w-full max-w-md mx-auto px-5 pt-3 pb-1 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isWakeLockActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-700 dark:text-emerald-300 font-medium whitespace-nowrap">
              <Sparkles className="w-2.5 h-2.5 shrink-0" />
              <span>{t.modals.quickQrWakeLock}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] -mr-2 rounded-xl flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          title={t.common.close}
          aria-label={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main High-Contrast Pass Body */}
      <div className="w-full max-w-md mx-auto px-5 py-2 pb-6 flex-1 flex flex-col items-center justify-center gap-3.5 sm:gap-4">

        {/* Minimal Border-Bottom QR Type Switcher (Zero Box-in-Box) */}
        <div
          role="tablist"
          aria-label={t.modals.qrTypeAria}
          className="w-full max-w-[290px] flex items-center justify-center gap-6 border-b border-[var(--app-border)]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={qrType === 'url'}
            onClick={() => setQrType('url')}
            className={`relative pb-2.5 text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none ${
              qrType === 'url'
                ? 'text-[var(--app-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
            }`}
          >
            {t.modals.webLinkQr}
            {qrType === 'url' && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={qrType === 'vcard'}
            onClick={() => setQrType('vcard')}
            className={`relative pb-2.5 text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none ${
              qrType === 'vcard'
                ? 'text-[var(--app-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
            }`}
          >
            {t.modals.vcardQr}
            {qrType === 'vcard' && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
            )}
          </button>
        </div>

        {/* High-Contrast Scannable QR Plate */}
        <div className="w-full max-w-[290px] aspect-square bg-white rounded-xl p-4 shadow-[var(--app-shadow)] ring-1 ring-black/5 flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`${primaryName} Quick QR`}
              className="w-full h-full object-contain select-none"
            />
          ) : (
            <div className="text-xs font-medium text-neutral-500">{t.modals.qrGenerating}</div>
          )}
        </div>

        <p className="text-xs text-[var(--app-text-muted)] font-mono truncate max-w-full px-2">
          {qrType === 'url' ? displayUrl : data.phone || data.email || displayUrl}
        </p>

        {/* Centered 5-Icon Toolbar with Tooltips (Matches Main Card View Icons) */}
        <div
          role="toolbar"
          aria-label={isEn ? 'Quick QR Actions' : 'Quick QR 빠른 작업'}
          className="w-full flex items-center justify-center gap-1.5 sm:gap-2.5 pt-1"
        >
          <button
            type="button"
            onClick={handleSaveVCard}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title={t.vault.kebabSaveVcf}
            aria-label={t.vault.kebabSaveVcf}
          >
            <UserPlus className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={handleWebShare}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title={copied ? t.common.copied : t.modals.shareShort}
            aria-label={copied ? t.common.copied : t.modals.shareShort}
          >
            {copied ? (
              <Check className="w-4 h-4 stroke-[2] text-emerald-500" />
            ) : (
              <Share2 className="w-4 h-4 stroke-[1.75]" />
            )}
          </button>

          <span className="border-r border-[var(--app-border)] h-3.5 mx-0.5 self-center" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setWallpaperTheme('dark')}
            aria-pressed={wallpaperTheme === 'dark'}
            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
              wallpaperTheme === 'dark'
                ? 'bg-[var(--app-surface-subtle)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
            }`}
            title={t.modals.darkWallpaper}
            aria-label={t.modals.darkWallpaper}
          >
            <Moon className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={() => setWallpaperTheme('light')}
            aria-pressed={wallpaperTheme === 'light'}
            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
              wallpaperTheme === 'light'
                ? 'bg-[var(--app-surface-subtle)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
            }`}
            title={t.modals.lightWallpaper}
            aria-label={t.modals.lightWallpaper}
          >
            <Sun className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={handleDownloadWallpaper}
            disabled={isGeneratingWallpaper}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title={isGeneratingWallpaper ? t.modals.generatingWallpaper : t.modals.saveWallpaperFull}
            aria-label={t.modals.saveWallpaperFull}
          >
            <Wallpaper className={`w-4 h-4 stroke-[1.75] ${isGeneratingWallpaper ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

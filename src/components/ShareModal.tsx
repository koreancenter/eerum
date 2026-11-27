import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { CardData } from '../types/card';
import { downloadVCard, generateVCard } from '@/utils/cardExporter';
import { shareOrCopyLink } from '@/utils/share';
import {
  downloadLockscreenWallpaper,
  type LockscreenWallpaperTheme,
} from '@/utils/lockscreenWallpaper';
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  UserPlus,
  Printer,
  FileCode2,
  Wallpaper,
  Sun,
  Moon,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CardData;
  cardUrl?: string;
  isMyCard?: boolean;
  onOpenPrint?: () => void;
  onOpenExport?: () => void;
  onOpenEmailSignature?: () => void;
  onShowToast?: (msg: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  data,
  cardUrl,
  isMyCard = false,
  onOpenPrint,
  onOpenExport,
  onOpenEmailSignature,
  onShowToast,
}) => {
  const { isEn, t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [qrType, setQrType] = useState<'url' | 'vcard'>('url');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [wallpaperTheme, setWallpaperTheme] = useState<LockscreenWallpaperTheme>('dark');
  const [isSavingWallpaper, setIsSavingWallpaper] = useState(false);

  const resolvedUrl = cardUrl || data.website || 'https://eerum.goguma.app/master';

  useEffect(() => {
    if (!isOpen) return;

    const qrTarget = qrType === 'url' ? resolvedUrl : generateVCard(data);
    QRCode.toDataURL(qrTarget, {
      width: 520,
      margin: 1,
      color: {
        dark: '#0A0A0B',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [isOpen, qrType, resolvedUrl, data]);

  if (!isOpen) return null;

  const displayHost = (data.websiteDisplay || resolvedUrl).replace(/^https?:\/\//, '');
  const subtitleParts = [
    data.titleKr || data.title,
    data.organizationKr || data.organization,
  ].filter(Boolean);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      onShowToast?.(t.cardActions.linkCopiedToast);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast?.(t.cardActions.linkCopyFailedToast);
    }
  };

  const handleDownloadVCard = () => {
    downloadVCard(data);
    onShowToast?.(t.cardActions.vcardDownloadedToast(data.name || data.nameKr || t.common.cardFallback));
  };

  const handleNativeShare = async () => {
    const summary = [data.organizationKr || data.organization, data.titleKr || data.title, data.name]
      .filter(Boolean)
      .join(' ');
    await shareOrCopyLink({
      title: `${data.name} — ${data.organization}`,
      text: t.modals.shareCardIntroText(summary),
      url: resolvedUrl,
      onCopied: () => {
        setCopied(true);
        onShowToast?.(t.cardActions.linkCopiedToast);
        setTimeout(() => setCopied(false), 2000);
      },
    });
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${data.name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveWallpaper = async () => {
    if (isSavingWallpaper) return;
    setIsSavingWallpaper(true);
    try {
      await downloadLockscreenWallpaper({
        data,
        cardUrl: resolvedUrl,
        theme: wallpaperTheme,
        qrMode: qrType,
      });
      onShowToast?.(t.modals.wallpaperSavedToast(wallpaperTheme));
    } catch {
      onShowToast?.(t.modals.wallpaperFailedToast);
    } finally {
      setIsSavingWallpaper(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--app-overlay)] backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Single Minimalist Modal Surface */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.modals.shareAria}
        className="relative w-full max-w-[380px] sm:max-w-[400px] max-h-[92dvh] overflow-y-auto bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] rounded-3xl px-5 py-6 sm:px-7 sm:py-7 shadow-[var(--app-shadow)] flex flex-col items-center my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button with >= 40px touch hitbox */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] rounded-full hover:bg-[var(--app-surface-subtle)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          title={t.common.close}
          aria-label={t.common.close}
        >
          <X className="w-4 h-4 stroke-[1.75]" />
        </button>

        {/* 1. Clean Header */}
        <div className="w-full text-center px-8 mb-5">
          <h3 className="text-base sm:text-lg font-semibold text-[var(--app-text)] tracking-tight truncate">
            {data.name}
          </h3>
          {subtitleParts.length > 0 && (
            <p className="text-xs text-[var(--app-text-muted)] mt-0.5 truncate">
              {subtitleParts.join(' · ')}
            </p>
          )}
        </div>

        {/* 2. Sleek 2-Tab Segmented Switcher */}
        <div
          role="tablist"
          aria-label={t.modals.qrTypeAria}
          className="w-full grid grid-cols-2 p-1 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] mb-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={qrType === 'url'}
            onClick={() => setQrType('url')}
            className={`py-2 px-3 rounded-lg text-xs cursor-pointer whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
              qrType === 'url'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
            }`}
          >
            {t.modals.webLinkQr}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={qrType === 'vcard'}
            onClick={() => setQrType('vcard')}
            className={`py-2 px-3 rounded-lg text-xs cursor-pointer whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
              qrType === 'vcard'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
            }`}
          >
            {t.modals.vcardQr}
          </button>
        </div>

        {/* 3. Unnested Single QR Code Section (No Box-in-Box) */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-black/5 flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={qrType === 'url' ? t.modals.webLinkQr : t.modals.vcardQr}
                className="w-40 h-40 sm:w-44 sm:h-44 object-contain select-none shrink-0"
              />
            ) : (
              <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center text-xs text-neutral-500 shrink-0">
                {t.modals.qrGenerating}
              </div>
            )}
          </div>

          <p className="text-xs text-[var(--app-text-muted)] mt-3.5 text-center">
            {qrType === 'url'
              ? t.modals.scanToViewCard
              : t.modals.scanToSaveContact}
          </p>

          {qrType === 'url' ? (
            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-1.5 min-h-[36px] px-3 py-1 text-xs font-medium text-[var(--app-text)] hover:opacity-80 inline-flex items-center gap-1.5 cursor-pointer transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] rounded-lg"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.common.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
                  <span>{t.cardActions.copyLink}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadVCard}
              className="mt-1.5 min-h-[36px] px-3 py-1 text-xs font-medium text-[var(--app-text)] hover:opacity-80 inline-flex items-center gap-1.5 cursor-pointer transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] rounded-lg"
            >
              <Download className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
              <span>{t.modals.downloadVcf}</span>
            </button>
          )}
        </div>

        {/* 4. Preserved !isMyCard tools vs Restrained borderless tools for isMyCard */}
        {isMyCard ? (
          <div className="w-full pt-4 mt-5 border-t border-[var(--app-border)] flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {onOpenPrint && (
              <button
                type="button"
                onClick={onOpenPrint}
                className="min-h-[36px] px-2 py-1 text-[11px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>{t.modals.printPdf}</span>
              </button>
            )}

            {onOpenEmailSignature && (
              <button
                type="button"
                onClick={onOpenEmailSignature}
                className="min-h-[36px] px-2 py-1 text-[11px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Mail className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>{t.modals.emailSignature}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveWallpaper}
              disabled={isSavingWallpaper}
              className="min-h-[36px] px-2 py-1 text-[11px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Wallpaper className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>{isSavingWallpaper ? t.modals.generatingWallpaper : t.modals.saveWallpaper}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenExport) {
                  onOpenExport();
                } else {
                  handleDownloadQr();
                }
              }}
              className="min-h-[36px] px-2 py-1 text-[11px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileCode2 className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>{t.modals.htmlExport}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Preserved !isMyCard URL Copy Bar */}
            <div className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 mt-4 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)]">
              <span className="font-mono text-xs text-[var(--app-text)] truncate select-all min-w-0">
                {displayHost}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 min-h-[34px] px-3 py-1.5 rounded-lg bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] font-medium text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                title={t.cardActions.copyLink}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.common.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.common.copy}</span>
                  </>
                )}
              </button>
            </div>

            {/* Preserved Lockscreen QR Wallpaper Action for !isMyCard */}
            <div className="w-full mt-3 p-2.5 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSaveWallpaper}
                disabled={isSavingWallpaper}
                className="flex-1 min-h-[38px] px-3 py-2 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors"
              >
                <Wallpaper className="w-3.5 h-3.5 stroke-[1.75] shrink-0" />
                <span>{isSavingWallpaper ? t.modals.generatingWallpaper : t.modals.saveWallpaperFull}</span>
              </button>

              <div
                role="group"
                aria-label={t.modals.wallpaperThemeAria}
                className="flex items-center p-0.5 rounded-lg bg-[var(--app-bg)] border border-[var(--app-border)] shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setWallpaperTheme('dark')}
                  title={t.modals.darkWallpaper}
                  aria-label={t.modals.darkWallpaper}
                  aria-pressed={wallpaperTheme === 'dark'}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                    wallpaperTheme === 'dark'
                      ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)]'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setWallpaperTheme('light')}
                  title={t.modals.lightWallpaper}
                  aria-label={t.modals.lightWallpaper}
                  aria-pressed={wallpaperTheme === 'light'}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                    wallpaperTheme === 'light'
                      ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)]'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {onOpenEmailSignature && (
              <button
                type="button"
                onClick={onOpenEmailSignature}
                className="w-full mt-2 px-3.5 py-2.5 rounded-xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-medium flex items-center justify-between gap-2 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.modals.emailSigBanner}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </button>
            )}

            {/* Preserved Bottom Toolbar for !isMyCard */}
            <div
              role="toolbar"
              aria-label={t.modals.shareToolbarAria}
              className="w-full pt-4 mt-4 border-t border-[var(--app-border)] grid grid-cols-4 gap-1"
            >
              <button
                type="button"
                onClick={handleDownloadVCard}
                className="min-h-[54px] py-2 px-1 rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                aria-label={t.modals.saveContactShort}
              >
                <UserPlus className="w-4 h-4 stroke-[1.75] shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">{t.modals.saveContactShort}</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="min-h-[54px] py-2 px-1 rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                aria-label={t.modals.shareShort}
              >
                <Share2 className="w-4 h-4 stroke-[1.75] shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">{t.modals.shareShort}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenPrint?.()}
                className="min-h-[54px] py-2 px-1 rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                aria-label={t.modals.printTitle}
              >
                <Printer className="w-4 h-4 stroke-[1.75] shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">{t.modals.printPdf}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenExport) {
                    onOpenExport();
                  } else {
                    handleDownloadQr();
                  }
                }}
                className="min-h-[54px] py-2 px-1 rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                aria-label={isEn ? 'Open standalone HTML export' : '독립 HTML 파일 배포 설정 열기'}
              >
                <FileCode2 className="w-4 h-4 stroke-[1.75] shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">{t.modals.htmlExport}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

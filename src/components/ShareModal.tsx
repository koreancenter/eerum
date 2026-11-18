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
      onShowToast?.('명함 웹 링크가 복사되었습니다.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast?.('링크 복사에 실패했습니다.');
    }
  };

  const handleDownloadVCard = () => {
    downloadVCard(data);
    onShowToast?.(`${data.name || data.nameKr}님의 연락처(.vcf)가 저장되었습니다.`);
  };

  const handleNativeShare = async () => {
    await shareOrCopyLink({
      title: `${data.name} — ${data.organization}`,
      text: `${data.organizationKr || data.organization} ${data.titleKr || data.title} ${data.name}의 디지털 명함입니다.`,
      url: resolvedUrl,
      onCopied: () => {
        setCopied(true);
        onShowToast?.('명함 링크가 복사되었습니다.');
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
      onShowToast?.(
        `잠금화면 QR 배경화면(${wallpaperTheme === 'dark' ? '다크' : '라이트'})이 저장되었습니다.`
      );
    } catch {
      onShowToast?.('잠금화면 배경화면 저장에 실패했습니다.');
    } finally {
      setIsSavingWallpaper(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Single Minimalist Modal Surface */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="디지털 명함 공유"
        className="relative w-full max-w-[380px] sm:max-w-[400px] max-h-[92dvh] overflow-y-auto bg-[#111113] border border-white/10 rounded-3xl px-5 py-6 sm:px-7 sm:py-7 shadow-2xl flex flex-col items-center my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button with >= 40px touch hitbox */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          title="닫기"
          aria-label="닫기"
        >
          <X className="w-4 h-4 stroke-[1.75]" />
        </button>

        {/* 1. Clean Header */}
        <div className="w-full text-center px-8 mb-5">
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
            {data.name}
          </h3>
          {subtitleParts.length > 0 && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">
              {subtitleParts.join(' · ')}
            </p>
          )}
        </div>

        {/* 2. Sleek 2-Tab Segmented Switcher */}
        <div
          role="tablist"
          aria-label="QR 코드 유형"
          className="w-full grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] mb-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={qrType === 'url'}
            onClick={() => setQrType('url')}
            className={`py-2 px-3 rounded-lg text-xs cursor-pointer whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
              qrType === 'url'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white font-medium'
            }`}
          >
            웹 링크 QR
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={qrType === 'vcard'}
            onClick={() => setQrType('vcard')}
            className={`py-2 px-3 rounded-lg text-xs cursor-pointer whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
              qrType === 'vcard'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white font-medium'
            }`}
          >
            연락처 (.vcf) QR
          </button>
        </div>

        {/* 3. Unnested Single QR Code Section (No Box-in-Box) */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={qrType === 'url' ? '웹 링크 QR 코드' : '연락처 (.vcf) QR 코드'}
                className="w-40 h-40 sm:w-44 sm:h-44 object-contain select-none shrink-0"
              />
            ) : (
              <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center text-xs text-neutral-500 shrink-0">
                QR 생성 중...
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-400 mt-3.5 text-center">
            {qrType === 'url'
              ? '스캔하여 디지털 명함 보기'
              : '스캔하여 연락처 바로 저장'}
          </p>

          {qrType === 'url' ? (
            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-1.5 min-h-[36px] px-3 py-1 text-xs font-medium text-white hover:text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 rounded-lg"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  <span>링크 복사</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadVCard}
              className="mt-1.5 min-h-[36px] px-3 py-1 text-xs font-medium text-white hover:text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 rounded-lg"
            >
              <Download className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              <span>.vcf 다운로드</span>
            </button>
          )}
        </div>

        {/* 4. Preserved !isMyCard tools vs Restrained borderless tools for isMyCard */}
        {isMyCard ? (
          <div className="w-full pt-4 mt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {onOpenPrint && (
              <button
                type="button"
                onClick={onOpenPrint}
                className="min-h-[36px] px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>인쇄 · PDF</span>
              </button>
            )}

            {onOpenEmailSignature && (
              <button
                type="button"
                onClick={onOpenEmailSignature}
                className="min-h-[36px] px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Mail className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>이메일 서명</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveWallpaper}
              disabled={isSavingWallpaper}
              className="min-h-[36px] px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Wallpaper className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>{isSavingWallpaper ? '생성 중...' : '배경화면 저장'}</span>
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
              className="min-h-[36px] px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileCode2 className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>HTML 배포</span>
            </button>
          </div>
        ) : (
          <>
            {/* Preserved !isMyCard URL Copy Bar */}
            <div className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 mt-4 rounded-xl bg-white/[0.04]">
              <span className="font-mono text-xs text-zinc-300 truncate select-all min-w-0">
                {displayHost}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 min-h-[34px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                title="링크 복사"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>복사</span>
                  </>
                )}
              </button>
            </div>

            {/* Preserved Lockscreen QR Wallpaper Action for !isMyCard */}
            <div className="w-full mt-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSaveWallpaper}
                disabled={isSavingWallpaper}
                className="flex-1 min-h-[38px] px-3 py-2 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Wallpaper className="w-3.5 h-3.5 stroke-[1.75] shrink-0" />
                <span>{isSavingWallpaper ? '생성 중...' : '잠금화면 배경화면 저장'}</span>
              </button>

              <div
                role="group"
                aria-label="잠금화면 배경화면 테마"
                className="flex items-center p-0.5 rounded-lg bg-black/40 border border-white/10 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setWallpaperTheme('dark')}
                  title="다크 배경화면"
                  aria-label="다크 배경화면"
                  aria-pressed={wallpaperTheme === 'dark'}
                  className={`p-1.5 rounded-md cursor-pointer ${
                    wallpaperTheme === 'dark'
                      ? 'bg-white text-neutral-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setWallpaperTheme('light')}
                  title="라이트 배경화면"
                  aria-label="라이트 배경화면"
                  aria-pressed={wallpaperTheme === 'light'}
                  className={`p-1.5 rounded-md cursor-pointer ${
                    wallpaperTheme === 'light'
                      ? 'bg-white text-neutral-950'
                      : 'text-zinc-400 hover:text-white'
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
                className="w-full mt-2 px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-zinc-200 hover:text-white text-xs font-medium flex items-center justify-between gap-2 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  <span className="truncate">HTML 이메일 서명 만들기 (Gmail · Mail · Outlook)</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>
            )}

            {/* Preserved Bottom Toolbar for !isMyCard */}
            <div
              role="toolbar"
              aria-label="명함 공유 및 배포 도구"
              className="w-full pt-4 mt-4 border-t border-white/10 grid grid-cols-4 gap-1"
            >
              <button
                type="button"
                onClick={handleDownloadVCard}
                className="min-h-[54px] py-2 px-1 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                aria-label="연락처 파일 저장"
              >
                <UserPlus className="w-4 h-4 stroke-[1.75] shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">연락처 저장</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="min-h-[54px] py-2 px-1 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                aria-label="명함 링크 공유하기"
              >
                <Share2 className="w-4 h-4 stroke-[1.75] shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">공유하기</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenPrint?.()}
                className="min-h-[54px] py-2 px-1 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                aria-label="인쇄 및 PDF 설정 열기"
              >
                <Printer className="w-4 h-4 stroke-[1.75] shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">인쇄 · PDF</span>
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
                className="min-h-[54px] py-2 px-1 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                aria-label="독립 HTML 파일 배포 설정 열기"
              >
                <FileCode2 className="w-4 h-4 stroke-[1.75] shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">HTML 배포</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

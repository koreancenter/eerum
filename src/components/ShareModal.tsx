import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { CardData } from '../types/card';
import { downloadVCard, generateVCard } from '../utils/vcard';
import {
  X,
  Copy,
  Check,
  Share2,
  UserPlus,
  Printer,
  FileCode2,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CardData;
  cardUrl?: string;
  onOpenPrint?: () => void;
  onOpenExport?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  data,
  cardUrl,
  onOpenPrint,
  onOpenExport,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrType, setQrType] = useState<'url' | 'vcard'>('url');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const resolvedUrl = cardUrl || data.website || 'https://card.goguma.app/master';

  useEffect(() => {
    if (!isOpen) return;

    const qrTarget = qrType === 'url' ? resolvedUrl : generateVCard(data);
    QRCode.toDataURL(qrTarget, {
      width: 520,
      margin: 2.5,
      color: {
        dark: '#0A0A0B',
        light: '#FAFAFA',
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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data.name} — ${data.organization}`,
          text: `${data.organizationKr || data.organization} ${data.titleKr || data.title} ${data.name}의 디지털 명함입니다.`,
          url: resolvedUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      void handleCopyLink();
    }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Single Minimalist Card Surface */}
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

        {/* 2. Unified Segmented Tab Bar */}
        <div
          role="tablist"
          aria-label="QR 코드 유형"
          className="w-full grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] mb-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={qrType === 'url'}
            onClick={() => setQrType('url')}
            className={`py-2 px-3 rounded-lg text-xs cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
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
            className={`py-2 px-3 rounded-lg text-xs cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
              qrType === 'vcard'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white font-medium'
            }`}
          >
            연락처 저장 QR
          </button>
        </div>

        {/* 3. Unnested QR Code Image (Built-in quiet zone, zero wrapper box) */}
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={qrType === 'url' ? '웹 링크 QR 코드' : '연락처 저장 QR 코드'}
            className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl object-contain select-none shrink-0"
          />
        ) : (
          <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl bg-[#FAFAFA] flex items-center justify-center text-xs text-neutral-600 shrink-0">
            QR 생성 중...
          </div>
        )}

        <p className="text-[11px] text-zinc-400 mt-2.5 text-center">
          {qrType === 'url'
            ? '카메라로 스캔하면 디지털 명함 페이지로 연결됩니다'
            : '카메라로 스캔하면 휴대폰 연락처에 바로 저장됩니다'}
        </p>

        {/* 4. Cohesive URL Copy Bar */}
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

        {/* 5. Accessible Labeled Bottom Action Toolbar */}
        <div
          role="toolbar"
          aria-label="명함 공유 및 배포 도구"
          className="w-full pt-4 mt-5 border-t border-white/10 grid grid-cols-4 gap-1"
        >
          <button
            type="button"
            onClick={() => downloadVCard(data)}
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
            onClick={() => {
              onOpenPrint?.();
            }}
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
      </div>
    </div>
  );
};

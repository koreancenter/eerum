import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CardData } from '../types/card';
import { generateVCard } from '../utils/vcard';
import { X, Copy, Check, Download, ExternalLink } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CardData;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, data }) => {
  const [qrType, setQrType] = useState<'url' | 'vcard'>('url');
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const targetUrl = data.website || 'https://card.goguma.app/master';

  useEffect(() => {
    if (!isOpen) return;

    const contentToEncode = qrType === 'url' ? targetUrl : generateVCard(data);

    QRCode.toDataURL(contentToEncode, {
      width: 520,
      margin: 2.5,
      color: {
        dark: '#0A0A0B',
        light: '#FAFAFA',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to create QR code', err);
      });
  }, [isOpen, qrType, data, targetUrl]);

  if (!isOpen) return null;

  const displayHost = (data.websiteDisplay || targetUrl).replace(/^https?:\/\//, '');

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (!dataUrl) return;
    const safeDomain = displayHost.replace(/[^a-zA-Z0-9]/g, '_');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR_${safeDomain}_${qrType.toUpperCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="디지털 명함 QR 코드"
        className="relative w-full max-w-[380px] sm:max-w-[400px] max-h-[92dvh] overflow-y-auto rounded-3xl bg-[#111113] border border-white/10 px-5 py-6 sm:px-7 sm:py-7 text-neutral-100 shadow-2xl flex flex-col items-center my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 cursor-pointer"
          title="닫기"
          aria-label="닫기"
        >
          <X className="w-4 h-4 stroke-[1.75]" />
        </button>

        {/* Modal Header */}
        <div className="w-full text-center px-8 mb-5">
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
            디지털 명함 QR 코드
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 truncate">
            스마트폰 카메라로 스캔하면 바로 연결됩니다
          </p>
        </div>

        {/* Mode Segmented Tab */}
        <div
          role="tablist"
          aria-label="QR 코드 유형"
          className="w-full grid grid-cols-2 p-1 bg-white/[0.04] rounded-xl mb-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={qrType === 'url'}
            onClick={() => setQrType('url')}
            className={`py-2 px-3 text-xs rounded-lg cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
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
            className={`py-2 px-3 text-xs rounded-lg cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
              qrType === 'vcard'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white font-medium'
            }`}
          >
            연락처 저장 QR
          </button>
        </div>

        {/* Unnested QR Code Image */}
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`${displayHost} QR 코드`}
            className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl object-contain select-none shrink-0"
          />
        ) : (
          <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl bg-[#FAFAFA] flex items-center justify-center text-xs text-neutral-600 shrink-0">
            QR 생성 중...
          </div>
        )}

        <p className="mt-2.5 text-center text-[11px] text-zinc-400">
          {qrType === 'url'
            ? '카메라로 스캔하면 디지털 명함 페이지로 연결됩니다'
            : `스캔 즉시 연락처에 ${data.nameKr || data.name} 정보가 저장됩니다`}
        </p>

        {/* Cohesive URL Copy Bar */}
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

        {/* Bottom Labeled Toolbar */}
        <div
          role="toolbar"
          aria-label="QR 코드 도구"
          className="w-full pt-4 mt-5 border-t border-white/10 grid grid-cols-2 gap-2"
        >
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>웹페이지 열기</span>
          </a>

          <button
            type="button"
            onClick={handleDownloadQr}
            className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>QR 이미지 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};

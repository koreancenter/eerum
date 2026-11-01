import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, X } from "lucide-react";
import { getOrCreateSyncId } from "../utils/syncWallet";

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({ isOpen, onClose }) => {
  const [qrSrc, setQrSrc] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const syncId = getOrCreateSyncId();
  const syncUrl = typeof window !== 'undefined' ? `${window.location.origin}?sync=${syncId}` : '';

  useEffect(() => {
    if (isOpen && syncUrl) {
      QRCode.toDataURL(syncUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: "#0A0A0B",
          light: "#FAFAFA",
        },
      }).then(setQrSrc);
    }
  }, [isOpen, syncUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#121214] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 block mb-1">
          LOCAL DEVICE SYNC
        </span>
        <h3 className="text-lg font-bold text-white mb-1">기기 연결 (보관함 동기화)</h3>
        <p className="text-xs text-zinc-400 mb-5">
          스마트폰 기본 카메라로 QR 코드를 스캔하면<br />가입 없이 현재 보관함이 그대로 연결됩니다.
        </p>

        {qrSrc && (
          <div className="bg-[#FAFAFA] border border-black/5 p-3 rounded-xl inline-block mx-auto mb-5 shadow-md">
            <img src={qrSrc} alt="Sync QR" className="w-48 h-48 block" />
          </div>
        )}

        <div className="flex items-center gap-2 bg-[#0A0A0B] border border-zinc-800/80 rounded-xl p-2 px-3 text-xs text-left mb-1">
          <span className="truncate text-zinc-400 font-mono flex-1">{syncUrl}</span>
          <button
            onClick={handleCopy}
            className="text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition flex items-center gap-1 cursor-pointer"
            title="동기화 링크 복사"
          >
            {copied ? <Check size={14} className="text-white" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
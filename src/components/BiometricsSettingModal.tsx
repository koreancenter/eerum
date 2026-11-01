import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  Trash2, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { 
  isBiometricSupported, 
  isBiometricRegistered, 
  registerBiometric, 
  verifyBiometric, 
  removeBiometric, 
  getBiometricLabel,
  getBiometricSecurityThresholdStatus,
  SECURITY_THRESHOLD_DAYS,
  BiometricSecurityThresholdStatus,
  isIframe
} from '../utils/biometrics';
import { isPinSet } from '../utils/pinLock';

interface BiometricsSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPinSetup?: () => void;
  onStatusChange?: () => void;
}

export const BiometricsSettingModal: React.FC<BiometricsSettingModalProps> = ({
  isOpen,
  onClose,
  onOpenPinSetup,
  onStatusChange,
}) => {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [biometricLabel, setBiometricLabel] = useState<string>('Face ID / Touch ID');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [thresholdStatus, setThresholdStatus] = useState<BiometricSecurityThresholdStatus | null>(null);

  const refreshAllStatus = () => {
    setHasPin(isPinSet());
    setBiometricLabel(getBiometricLabel());
    setIsRegistered(isBiometricRegistered());
    setThresholdStatus(getBiometricSecurityThresholdStatus());

    isBiometricSupported().then((supported) => {
      setIsSupported(supported);
    });
  };

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setIsLoading(false);
      refreshAllStatus();
    }
  }, [isOpen]);

  const handleRegister = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await registerBiometric();
      if (res.success) {
        setIsRegistered(true);
        refreshAllStatus();
        setStatusMessage({
          type: 'success',
          text: `${biometricLabel} 등록이 완료되었습니다. 공개 키 크레덴셜이 로컬에 안전하게 저장되었습니다.`
        });
        if (onStatusChange) onStatusChange();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || '생체 인증 등록 중 문제가 발생했습니다.'
        });
      }
    } catch (e: unknown) {
      setStatusMessage({
        type: 'error',
        text: e instanceof Error ? e.message : '등록 실패'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestVerify = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await verifyBiometric();
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `인증 성공: ${biometricLabel} 및 보안 임계치가 정상적으로 작동합니다.`
        });
      } else {
        if (!res.error?.includes('취소')) {
          setStatusMessage({
            type: 'error',
            text: res.error || '인증에 실패했습니다.'
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    removeBiometric();
    setIsRegistered(false);
    refreshAllStatus();
    setStatusMessage({
      type: 'info',
      text: '생체 인증 크레덴셜이 기기에서 삭제되었습니다.'
    });
    if (onStatusChange) onStatusChange();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-3xl bg-[#121214] border border-white/10 text-neutral-100 shadow-2xl p-6 sm:p-7 flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="mb-5 pr-8">
          <h3 className="text-lg font-bold text-white tracking-tight">
            생체 인증 설정
          </h3>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#0A0A0B] border border-zinc-800/80 text-zinc-200 text-xs flex items-start gap-2.5">
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-white mt-0.5" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-white mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 shrink-0 text-zinc-300 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* Security Threshold Section */}
        <div className="space-y-2 mb-5">
          <span className="text-xs font-semibold text-white">
            보안 임계치
          </span>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            기기 보안을 위해 <strong className="text-zinc-200">7일 이상 4자리 PIN을 입력하지 않으면</strong> 생체 크레덴셜이 자동 무효화되며, PIN으로 재인증해야 다시 생체 인증이 활성화됩니다.
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs pt-1">
            <div>
              <span className="text-[11px] text-zinc-400 block mb-0.5">마지막 PIN 인증</span>
              <span className="text-xs font-medium text-zinc-200 tabular-nums">
                {thresholdStatus?.formattedLastVerified || '기록 없음'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block mb-0.5">PIN 재인증 유효 기간</span>
              <span className="text-xs font-semibold text-white tabular-nums">
                {thresholdStatus?.isExpired 
                  ? '만료됨 (PIN 인증 필요)' 
                  : `${thresholdStatus?.daysRemaining ?? SECURITY_THRESHOLD_DAYS}일 남음`}
              </span>
            </div>
          </div>

          {thresholdStatus?.isExpired && onOpenPinSetup && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPinSetup();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-2 transition-colors"
            >
              <span>지금 PIN 입력하여 생체 인증 재활성화</span>
            </button>
          )}
        </div>

        {/* Support Check / Platform Authenticator Section */}
        <div className="pt-4 border-t border-white/10 space-y-1 mb-5">
          <span className="text-xs text-zinc-400 font-medium">인식 플랫폼 하드웨어</span>
          <div className="text-sm font-semibold text-white">
            <span>{biometricLabel}</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed pt-0.5">
            {isSupported
              ? isIframe()
                ? '보안 격리 가상 크레덴셜 지원 (미리보기 최적화 · 독립 창에서는 기기 하드웨어 생체 센서와 직접 연동)'
                : '브라우저 및 기기의 보안 엔클레이브를 활용할 수 있습니다.'
              : '현재 브라우저 또는 환경에서 플랫폼 생체 인증 센서가 감지되지 않았습니다. HTTPS 및 지원 브라우저를 확인하세요.'}
          </p>
        </div>

        {/* Registration Section & Action */}
        <div className="pt-4 border-t border-white/10 space-y-3 mb-5">
          <span className="text-xs text-zinc-400 font-medium block">등록 상태</span>

          {isRegistered ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                공개 키 크레덴셜이 이 기기 브라우저에 안전하게 저장되어 있습니다. 잠금 화면에서 언제든 <strong className="text-white font-semibold">생체 인증</strong>으로 잠금을 해제할 수 있습니다.
              </p>
              
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestVerify}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>인증 테스트</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isLoading}
                  className="py-2.5 px-3 rounded-xl bg-[#0A0A0B] hover:bg-white/10 border border-zinc-800/80 text-zinc-400 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="생체 인증 크레덴셜 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>해제</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed">
                아래 버튼을 눌러 기기의 지문 센서나 안면 인식을 등록하세요. 서버 전송 없이 로컬에서만 암호화 인증됩니다.
              </p>
              <button
                type="button"
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 active:bg-zinc-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-white/10 active:scale-98 transition-colors"
              >
                <span>{isLoading ? '인증 진행 중...' : '생체 인증 등록'}</span>
              </button>
            </div>
          )}
        </div>

        {/* PIN Master Key Backup Status */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">4자리 PIN 마스터 백업</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {hasPin ? 'PIN 번호가 설정되어 있습니다.' : '생체 인식 실패 시 사용할 PIN을 먼저 설정하세요.'}
            </div>
          </div>
          {onOpenPinSetup && (
            <button
              onClick={() => {
                onClose();
                onOpenPinSetup();
              }}
              className="text-xs text-white hover:underline font-medium flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
            >
              <span>{hasPin ? 'PIN 변경' : 'PIN 설정'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

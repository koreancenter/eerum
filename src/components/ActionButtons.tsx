import React from 'react';
import { CardData, CardOrientation } from '../types/card';
import { downloadVCard } from '../utils/vcard';
import { 
  Phone,
  MessageSquare,
  Mail,
  Globe,
  Edit3,
  Share2,
  UserPlus,
  RectangleHorizontal,
  RectangleVertical
} from 'lucide-react';

interface ActionButtonsProps {
  data: CardData;
  isOwner?: boolean;
  onOpenEdit?: () => void;
  onOpenShare: () => void;
  isPhotoCard?: boolean;
  orientation?: CardOrientation;
  onToggleOrientation?: () => void;
  cardUrl?: string;
  onShowToast?: (msg: string) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  data,
  isOwner = true,
  onOpenEdit,
  onOpenShare,
  orientation = 'landscape',
  onToggleOrientation,
  cardUrl,
  onShowToast,
}) => {
  const phoneTarget = data.phoneRaw || data.phone?.replace(/[^0-9+]/g, '');
  const iconButtonClass = "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200 cursor-pointer";

  // Direct recipient action: download .vcf contact directly without modal
  const handleDownloadContact = () => {
    downloadVCard(data);
    if (onShowToast) {
      onShowToast(`${data.name}님의 연락처(vCard)가 다운로드되었습니다.`);
    }
  };

  // Direct recipient action: share card link via Web Share API or copy URL
  const handleShareCardLink = async () => {
    const targetUrl = cardUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const title = `${data.name} — ${data.organization}`;
    const text = `${data.organization} ${data.title} ${data.name} 디지털 명함`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: targetUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(targetUrl);
        if (onShowToast) {
          onShowToast('명함 링크가 복사되었습니다.');
        }
      } catch {
        if (onShowToast) {
          onShowToast('명함 링크 복사에 실패했습니다.');
        }
      }
    }
  };

  // ================= 1. PUBLIC VISITOR VIEW MODE (isOwner === false) =================
  if (!isOwner) {
    const hasContactChannel = Boolean(phoneTarget || data.email || data.website);

    return (
      <div 
        className="flex items-center justify-center gap-1.5 sm:gap-2.5 py-1"
        role="toolbar" 
        aria-label="명함 빠른 작업"
      >
        {/* 1. Call */}
        {phoneTarget && (
          <a
            href={`tel:${phoneTarget}`}
            className={iconButtonClass}
            title={`전화 걸기 (${data.phone})`}
            aria-label="전화 걸기"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}

        {/* 2. SMS */}
        {phoneTarget && (
          <a
            href={`sms:${phoneTarget}`}
            className={iconButtonClass}
            title={`문자 보내기 (${data.phone})`}
            aria-label="문자 보내기"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
        )}

        {/* 3. Mail */}
        {data.email && (
          <a
            href={`mailto:${data.email}`}
            className={iconButtonClass}
            title={`이메일 작성 (${data.email})`}
            aria-label="이메일 작성"
          >
            <Mail className="w-4 h-4" />
          </a>
        )}

        {/* 4. Website */}
        {data.website && (
          <a
            href={data.website}
            target="_blank"
            rel="noopener noreferrer"
            className={iconButtonClass}
            title="웹사이트 방문"
            aria-label="웹사이트"
          >
            <Globe className="w-4 h-4" />
          </a>
        )}

        {/* 1px Vertical Divider */}
        {hasContactChannel && (
          <span className="border-r border-white/10 h-3.5 mx-1 self-center" />
        )}

        {/* 5. Add to Contacts (vCard) */}
        <button
          onClick={handleDownloadContact}
          className={iconButtonClass}
          title="연락처에 저장 (vCard 다운로드)"
          aria-label="연락처 저장"
        >
          <UserPlus className="w-4 h-4" />
        </button>

        {/* 6. Share Card Link */}
        <button
          onClick={handleShareCardLink}
          className={iconButtonClass}
          title="명함 링크 공유"
          aria-label="명함 링크 공유"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ================= 2. OWNER VIEW MODE (isOwner === true) =================
  return (
    <div 
      className="flex items-center justify-center gap-1.5 sm:gap-2.5 py-1"
      role="toolbar" 
      aria-label="명함 빠른 작업"
    >
      {/* 1. Phone */}
      {phoneTarget && (
        <a
          href={`tel:${phoneTarget}`}
          className={iconButtonClass}
          title={`전화 걸기 (${data.phone})`}
          aria-label="전화 걸기"
        >
          <Phone className="w-4 h-4" />
        </a>
      )}

      {/* 2. Message / SMS */}
      {phoneTarget && (
        <a
          href={`sms:${phoneTarget}`}
          className={iconButtonClass}
          title={`문자 보내기 (${data.phone})`}
          aria-label="문자 보내기"
        >
          <MessageSquare className="w-4 h-4" />
        </a>
      )}

      {/* 3. Mail */}
      {data.email && (
        <a
          href={`mailto:${data.email}`}
          className={iconButtonClass}
          title={`이메일 작성 (${data.email})`}
          aria-label="이메일 작성"
        >
          <Mail className="w-4 h-4" />
        </a>
      )}

      {/* 4. Globe Website */}
      {data.website && (
        <a
          href={data.website}
          target="_blank"
          rel="noopener noreferrer"
          className={iconButtonClass}
          title="온라인 웹사이트 보기"
          aria-label="온라인 웹사이트"
        >
          <Globe className="w-4 h-4" />
        </a>
      )}

      {/* 1px Vertical Divider */}
      <span className="border-r border-white/10 h-3.5 mx-1 self-center" />

      {/* 5. Orientation Toggle (명함 가로/세로 보기) */}
      {onToggleOrientation && (
        <button
          onClick={onToggleOrientation}
          className={iconButtonClass}
          title={orientation === 'portrait' ? '명함 가로 보기' : '명함 세로 보기'}
          aria-label={orientation === 'portrait' ? '명함 가로 보기' : '명함 세로 보기'}
        >
          {orientation === 'portrait' ? (
            <RectangleHorizontal className="w-4 h-4" />
          ) : (
            <RectangleVertical className="w-4 h-4" />
          )}
        </button>
      )}

      {/* 6. Edit */}
      {onOpenEdit && (
        <button
          onClick={onOpenEdit}
          className={iconButtonClass}
          title="명함 편집"
          aria-label="명함 편집"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )}

      {/* 7. Share */}
      <button
        onClick={onOpenShare}
        className={iconButtonClass}
        title="명함 공유 (QR, 링크, 인쇄, HTML 내보내기)"
        aria-label="명함 공유"
      >
        <Share2 className="w-4 h-4" />
      </button>
    </div>
  );
};

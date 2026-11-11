import React from 'react';
import { CardData, CardOrientation } from '../types/card';
import { downloadVCard } from '@/utils/cardExporter';
import {
  Phone,
  MessageSquare,
  Mail,
  Globe,
  Edit3,
  Share2,
  UserPlus,
  RectangleHorizontal,
  RectangleVertical,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

interface ActionButtonsProps {
  data: CardData;
  isOwner?: boolean;
  onOpenEdit?: () => void;
  onOpenShare: () => void;
  onDelete?: () => void;
  isPhotoCard?: boolean;
  orientation?: CardOrientation;
  onToggleOrientation?: () => void;
  cardUrl?: string;
  onShowToast?: (msg: string) => void;
}

interface ContactChannelItem {
  key: 'call' | 'sms' | 'email' | 'website';
  href: string;
  Icon: LucideIcon;
  title: string;
  ariaLabel: string;
  external?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  data,
  isOwner = true,
  onOpenEdit,
  onOpenShare,
  onDelete,
  orientation = 'landscape',
  onToggleOrientation,
  cardUrl,
  onShowToast,
}) => {
  const phoneTarget = data.phoneRaw || data.phone?.replace(/[^0-9+]/g, '');
  const iconButtonClass =
    'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200 cursor-pointer';

  const contactChannels = (
    [
      phoneTarget && {
        key: 'call',
        href: `tel:${phoneTarget}`,
        Icon: Phone,
        title: `전화 걸기 (${data.phone})`,
        ariaLabel: '전화 걸기',
      },
      phoneTarget && {
        key: 'sms',
        href: `sms:${phoneTarget}`,
        Icon: MessageSquare,
        title: `문자 보내기 (${data.phone})`,
        ariaLabel: '문자 보내기',
      },
      data.email && {
        key: 'email',
        href: `mailto:${data.email}`,
        Icon: Mail,
        title: `이메일 작성 (${data.email})`,
        ariaLabel: '이메일 작성',
      },
      data.website && {
        key: 'website',
        href: data.website,
        Icon: Globe,
        title: isOwner ? '온라인 웹사이트 보기' : '웹사이트 방문',
        ariaLabel: isOwner ? '온라인 웹사이트' : '웹사이트',
        external: true,
      },
    ] as Array<ContactChannelItem | '' | undefined>
  ).filter((item): item is ContactChannelItem => Boolean(item));

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

  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-2.5 py-1"
      role="toolbar"
      aria-label="명함 빠른 작업"
    >
      {/* Shared Contact Channels (Call, SMS, Email, Website) */}
      {contactChannels.map(({ key, href, Icon, title, ariaLabel, external }) => (
        <a
          key={key}
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className={iconButtonClass}
          title={title}
          aria-label={ariaLabel}
        >
          <Icon className="w-4 h-4" />
        </a>
      ))}

      {/* 1px Vertical Divider */}
      {contactChannels.length > 0 && (
        <span className="border-r border-white/10 h-3.5 mx-1 self-center" />
      )}

      {!isOwner ? (
        <>
          {/* Add to Contacts (vCard) */}
          <button
            onClick={handleDownloadContact}
            className={iconButtonClass}
            title="연락처에 저장 (vCard 다운로드)"
            aria-label="연락처 저장"
          >
            <UserPlus className="w-4 h-4" />
          </button>

          {/* Share Card Link */}
          <button
            onClick={handleShareCardLink}
            className={iconButtonClass}
            title="명함 링크 공유"
            aria-label="명함 링크 공유"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          {/* Orientation Toggle (명함 가로/세로 보기) */}
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

          {/* Edit */}
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

          {/* Share */}
          <button
            onClick={onOpenShare}
            className={iconButtonClass}
            title="명함 공유 (QR, 링크, 인쇄, HTML 내보내기)"
            aria-label="명함 공유"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Delete My Card */}
          {onDelete && (
            <button
              onClick={onDelete}
              className={`${iconButtonClass} hover:text-rose-400 hover:bg-rose-500/10 text-white/50`}
              title="내 명함 삭제"
              aria-label="내 명함 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

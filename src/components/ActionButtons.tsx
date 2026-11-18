import React from 'react';
import { CardData, CardOrientation } from '../types/card';
import { downloadVCard } from '@/utils/cardExporter';
import { sanitizeExternalUrl } from '@/utils/sanitizeUrl';
import { shareOrCopyLink } from '@/utils/share';
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
  StickyNote,
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
  onToggleMemo?: () => void;
  isMemoOpen?: boolean;
  hasMemo?: boolean;
  cardUrl?: string;
  onShowToast?: (msg: string) => void;
  onInteraction?: () => void;
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
  onToggleMemo,
  isMemoOpen = false,
  hasMemo = false,
  cardUrl,
  onShowToast,
  onInteraction,
}) => {
  const phoneTarget = data.phoneRaw || data.phone?.replace(/[^0-9+]/g, '');
  const iconButtonClass =
    'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]';

  const safeWebsiteUrl = sanitizeExternalUrl(data.website);

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
      safeWebsiteUrl && {
        key: 'website',
        href: safeWebsiteUrl,
        Icon: Globe,
        title: isOwner ? '온라인 웹사이트 보기' : '웹사이트 방문',
        ariaLabel: isOwner ? '온라인 웹사이트' : '웹사이트',
        external: true,
      },
    ] as Array<ContactChannelItem | '' | undefined>
  ).filter((item): item is ContactChannelItem => Boolean(item));

  // Direct recipient action: download .vcf contact directly without modal
  const handleDownloadContact = () => {
    onInteraction?.();
    downloadVCard(data);
    if (onShowToast) {
      onShowToast(`${data.name}님의 연락처(vCard)가 다운로드되었습니다.`);
    }
  };

  // Direct recipient action: share card link via Web Share API or copy URL
  const handleShareCardLink = async () => {
    onInteraction?.();
    const targetUrl = cardUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const title = `${data.name} — ${data.organization}`;
    const text = `${data.organization} ${data.title} ${data.name} 디지털 명함`;

    await shareOrCopyLink({
      title,
      text,
      url: targetUrl,
      onCopied: () => onShowToast?.('명함 링크가 복사되었습니다.'),
      onCopyError: () => onShowToast?.('명함 링크 복사에 실패했습니다.'),
    });
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
          onClick={() => onInteraction?.()}
          className={iconButtonClass}
          title={title}
          aria-label={ariaLabel}
        >
          <Icon className="w-4 h-4" />
        </a>
      ))}

      {/* 1px Vertical Divider */}
      {contactChannels.length > 0 && (
        <span className="border-r border-[var(--app-border)] h-3.5 mx-1 self-center" />
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

          {/* Personal Memo Toggle */}
          {onToggleMemo && (
            <button
              type="button"
              onClick={() => {
                onInteraction?.();
                onToggleMemo();
              }}
              aria-pressed={isMemoOpen}
              className={`relative ${
                isMemoOpen
                  ? 'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] ring-1 ring-[var(--app-border)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]'
                  : iconButtonClass
              }`}
              title={isMemoOpen ? '개인 메모 닫기' : '개인 메모 열기'}
              aria-label={isMemoOpen ? '개인 메모 닫기' : '개인 메모 열기'}
            >
              <StickyNote className="w-4 h-4" />
              {!isMemoOpen && hasMemo && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500"
                />
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
            onClick={() => {
              onInteraction?.();
              onOpenShare();
            }}
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
              className={`${iconButtonClass} hover:text-rose-500 hover:bg-rose-500/10`}
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

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
import { useLocale } from '../hooks/useLocale';

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
  const { t } = useLocale();
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
        title: `${t.cardActions.call} (${data.phone})`,
        ariaLabel: t.cardActions.call,
      },
      phoneTarget && {
        key: 'sms',
        href: `sms:${phoneTarget}`,
        Icon: MessageSquare,
        title: `${t.cardActions.sms} (${data.phone})`,
        ariaLabel: t.cardActions.sms,
      },
      data.email && {
        key: 'email',
        href: `mailto:${data.email}`,
        Icon: Mail,
        title: `${t.cardActions.email} (${data.email})`,
        ariaLabel: t.cardActions.email,
      },
      safeWebsiteUrl && {
        key: 'website',
        href: safeWebsiteUrl,
        Icon: Globe,
        title: isOwner ? t.cardActions.websiteOwner : t.cardActions.websiteVisitor,
        ariaLabel: isOwner ? t.cardActions.websiteOwner : t.cardActions.websiteVisitor,
        external: true,
      },
    ] as Array<ContactChannelItem | '' | undefined>
  ).filter((item): item is ContactChannelItem => Boolean(item));

  // Direct recipient action: download .vcf contact directly without modal
  const handleDownloadContact = () => {
    onInteraction?.();
    downloadVCard(data);
    if (onShowToast) {
      onShowToast(t.cardActions.vcardDownloadedToast(data.name || t.common.cardFallback));
    }
  };

  // Direct recipient action: share card link via Web Share API or copy URL
  const handleShareCardLink = async () => {
    onInteraction?.();
    const targetUrl = cardUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const title = `${data.name} — ${data.organization}`;
    const text = `${data.organization} ${data.title} ${data.name}`;

    await shareOrCopyLink({
      title,
      text,
      url: targetUrl,
      onCopied: () => onShowToast?.(t.cardActions.linkCopiedToast),
      onCopyError: () => onShowToast?.(t.cardActions.linkCopyFailedToast),
    });
  };

  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-2.5 py-1"
      role="toolbar"
      aria-label={t.cardActions.toolbarAria}
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
            title={t.cardActions.saveContactTitle}
            aria-label={t.cardActions.saveContact}
          >
            <UserPlus className="w-4 h-4" />
          </button>

          {/* Share Card Link */}
          <button
            onClick={handleShareCardLink}
            className={iconButtonClass}
            title={t.cardActions.shareLink}
            aria-label={t.cardActions.shareLink}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          {/* Orientation Toggle */}
          {onToggleOrientation && (
            <button
              onClick={onToggleOrientation}
              className={iconButtonClass}
              title={
                orientation === 'portrait'
                  ? t.cardActions.orientationLandscape
                  : t.cardActions.orientationPortrait
              }
              aria-label={
                orientation === 'portrait'
                  ? t.cardActions.orientationLandscape
                  : t.cardActions.orientationPortrait
              }
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
              title={isMemoOpen ? t.cardActions.memoClose : t.cardActions.memoOpen}
              aria-label={isMemoOpen ? t.cardActions.memoClose : t.cardActions.memoOpen}
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
              title={t.cardActions.editCard}
              aria-label={t.cardActions.editCard}
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
            title={t.cardActions.shareCardTitle}
            aria-label={t.cardActions.shareCard}
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Delete My Card */}
          {onDelete && (
            <button
              onClick={onDelete}
              className={`${iconButtonClass} hover:text-rose-500 hover:bg-rose-500/10`}
              title={t.cardActions.deleteMyCard}
              aria-label={t.cardActions.deleteMyCard}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

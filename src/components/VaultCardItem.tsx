import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { StoredCard } from '../types/card';
import {
  Phone,
  Mail,
  Globe,
  UserPlus,
  Edit3,
  Trash2,
  Download,
  Camera,
  MessageSquare,
  MoreVertical,
} from 'lucide-react';
import { resolveThemeStyles } from '../constants/templates';
import { downloadVCard } from '@/utils/cardSerializer';

export const extractCleanPhoneNumber = (phoneRaw?: string, phone?: string): string => {
  const raw = (phoneRaw || phone || '').trim();
  return raw.replace(/[^0-9+]/g, '');
};

interface VaultCardKebabMenuProps {
  card: StoredCard;
  hasPhoto: boolean;
  onEditCard: (card: StoredCard) => void;
  onExportCard: (card: StoredCard) => void;
  onDeleteCard: (cardId: string) => void;
  onOpenPhotoArchive: (card: StoredCard) => void;
  buttonClassName?: string;
  menuDirection?: 'up' | 'down';
}

/**
 * Sleek Dark Luxury Kebab Context Menu (`⋮`) for secondary administrative card tools:
 * - Edit Card (명함 수정)
 * - Save Contact vCard (.vcf) (주소록 저장)
 * - Export HTML Code (독립형 HTML 내보내기)
 * - View Original Photo Archive (실물 명함 사진 원본)
 * - Delete Card (명함 삭제)
 */
const VaultCardKebabMenu: React.FC<VaultCardKebabMenuProps> = ({
  card,
  hasPhoto,
  onEditCard,
  onExportCard,
  onDeleteCard,
  onOpenPhotoArchive,
  buttonClassName,
  menuDirection = 'up',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onEditCard(card);
  };

  const handleVCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    downloadVCard(card.data);
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onExportCard(card);
  };

  const handlePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onOpenPhotoArchive(card);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDeleteCard(card.id);
  };

  const displayName = card.data.name || card.data.nameKr || '명함';

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${displayName} 관리 더보기 메뉴`}
        title="명함 관리 메뉴 (수정, 삭제, 주소록, HTML)"
        className={
          buttonClassName ||
          'p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20'
        }
      >
        <MoreVertical className="w-3.5 h-3.5 stroke-[1.75]" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 ${
            menuDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-44 rounded-xl bg-[#161618]/95 backdrop-blur-xl border border-white/12 shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-white/5 text-xs text-neutral-200 select-none`}
        >
          <div className="py-0.5 space-y-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleEdit}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>명함 수정</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleVCard}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>연락처 저장 (.vcf)</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleExport}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>HTML 내보내기</span>
            </button>

            {hasPhoto && (
              <button
                type="button"
                role="menuitem"
                onClick={handlePhoto}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>실물 사진 원본</span>
              </button>
            )}
          </div>

          {!card.isMyCard && (
            <div className="pt-0.5">
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>명함 삭제</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface VaultCardItemProps {
  card: StoredCard;
  onSelectCard: (card: StoredCard) => void;
  onEditCard: (card: StoredCard) => void;
  onDeleteCard: (cardId: string) => void;
  onExportCard: (card: StoredCard) => void;
  onOpenPhotoArchive: (card: StoredCard) => void;
}

const VaultCardItemComponent: React.FC<VaultCardItemProps> = ({
  card,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onExportCard,
  onOpenPhotoArchive,
}) => {
  const hasPhoto = Boolean(card.scannedImage);
  const photoPreviewUrl = card.scannedImage || card.front_image_url;

  const effectiveTheme =
    card.creation_mode === 'custom_html' && !card.theme ? 'obsidian' : card.theme;
  const themeStyles = useMemo(() => resolveThemeStyles(effectiveTheme), [effectiveTheme]);

  // Normalized & deduplicated identity fields
  const {
    displayName,
    subName,
    orgDisplay,
    titleDisplay,
    contactPrimary,
    contactSecondary,
    customLogo,
  } = useMemo(() => {
    const d = card.data;
    const primaryName = (d.name || d.nameKr || '').trim();
    const showEnName =
      card.card_features?.show_en_name ?? d.details?.show_en_name ?? true;
    const resolvedSubName = showEnName
      ? [d.nameEn, d.details?.en_name, d.name ? d.nameKr : '']
          .map((s) => (s || '').trim())
          .find((s) => s.length > 0 && s.toLowerCase() !== primaryName.toLowerCase()) || ''
      : '';

    const primaryOrg = (d.organizationKr || d.organization || '').trim();
    const showSubOrg = card.card_features?.show_sub_org ?? true;
    const rawExtraSubOrg = showSubOrg ? (d.subOrg || d.details?.sub_org || '').trim() : '';
    const extraSubOrg =
      rawExtraSubOrg && rawExtraSubOrg.toLowerCase() !== primaryOrg.toLowerCase()
        ? rawExtraSubOrg
        : '';
    const resolvedOrg = [primaryOrg, extraSubOrg].filter(Boolean).join(' · ');

    const primaryTitle = (d.titleKr || d.title || '').trim();
    const altTitle = (d.titleKr && d.title ? d.title : '').trim();
    const resolvedTitle =
      altTitle && altTitle.toLowerCase() !== primaryTitle.toLowerCase()
        ? `${primaryTitle} · ${altTitle}`
        : primaryTitle;

    const cPrimary = (d.phone || '').trim();
    const cSecondary = (d.email || d.websiteDisplay || '').trim();

    return {
      displayName: primaryName || '이름 없음',
      subName: resolvedSubName,
      orgDisplay: resolvedOrg,
      titleDisplay: resolvedTitle,
      contactPrimary: cPrimary,
      contactSecondary: cSecondary,
      customLogo: (card.card_features?.custom_logo || '').trim(),
    };
  }, [card.data, card.card_features]);

  const rawPhone = card.data.phoneRaw || card.data.phone || '';
  const cleanPhoneNumber = useMemo(() => extractCleanPhoneNumber(card.data.phoneRaw, card.data.phone), [card.data.phoneRaw, card.data.phone]);

  const handleCallClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (cleanPhoneNumber) {
        window.location.href = `tel:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber]
  );

  const handleSmsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (cleanPhoneNumber) {
        window.location.href = `sms:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber]
  );

  const handleSelectClick = useCallback(() => {
    onSelectCard(card);
  }, [card, onSelectCard]);

  const handleBodyKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectCard(card);
      }
    },
    [card, onSelectCard]
  );

  const stopLinkPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const surfaceBorderClass = themeStyles.isLight
    ? 'border-[#1C1B1A]/12 hover:border-[#1C1B1A]/30'
    : 'border-white/10 hover:border-white/25';

  const baseFooterBtnLayout =
    'w-[26px] h-[26px] sm:w-7 sm:h-7 rounded-lg items-center justify-center shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1';

  const actionBtnTone = themeStyles.isLight
    ? 'text-[#5C5955] hover:text-[#121214] hover:bg-black/[0.06] focus-visible:ring-black/25'
    : 'text-zinc-400 hover:text-white hover:bg-white/10 focus-visible:ring-white/25';

  const actionBtnClass = `inline-flex ${baseFooterBtnLayout} ${actionBtnTone}`;
  const desktopOnlyActionBtnClass = `hidden sm:inline-flex ${baseFooterBtnLayout} ${actionBtnTone}`;

  return (
    <article
      className={`group relative rounded-xl border ${surfaceBorderClass} ${themeStyles.cardBg} p-2.5 sm:p-3.5 shadow-sm transition-colors duration-150 flex flex-col justify-between gap-2 min-w-0`}
    >
      {/* Self-Contained Clickable Card Body (No outer or top category/date header) */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelectClick}
        onKeyDown={handleBodyKeyDown}
        aria-label={`${displayName} 명함 상세 보기`}
        title="명함 크게 보기"
        className={`w-full flex flex-col gap-1 min-w-0 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 ${
          themeStyles.isLight ? 'focus-visible:ring-black/30' : 'focus-visible:ring-white/35'
        }`}
      >
        {/* Top Row: Organization + Name on Left, Optional Thumbnail/Logo on Right */}
        <div className="flex items-start justify-between gap-1.5 sm:gap-2.5 min-w-0">
          <div className="min-w-0 flex-1 space-y-0.5 leading-tight">
            {orgDisplay && (
              <p
                className={`text-[10.5px] sm:text-[11px] font-medium leading-tight truncate ${themeStyles.textSecondary}`}
              >
                {orgDisplay}
              </p>
            )}

            <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
              <h3
                className={`text-[13.5px] sm:text-[15px] font-semibold tracking-tight leading-snug truncate group-hover:underline underline-offset-2 ${themeStyles.textPrimary}`}
              >
                {displayName}
              </h3>
              {subName && (
                <span
                  className={`hidden sm:inline text-[11px] font-normal leading-tight truncate ${themeStyles.textSecondary}`}
                >
                  {subName}
                </span>
              )}
              {card.isMyCard && (
                <span
                  className={`text-[10px] font-medium leading-none shrink-0 ${themeStyles.textSecondary}`}
                >
                  · 내 명함
                </span>
              )}
            </div>
          </div>

          {(photoPreviewUrl || customLogo) && (
            <div className="shrink-0 flex items-center">
              {photoPreviewUrl ? (
                <div
                  className={`w-9 sm:w-16 aspect-[9/5] rounded sm:rounded-md overflow-hidden border ${themeStyles.accentHairline} bg-black/10 shrink-0`}
                >
                  <img
                    src={photoPreviewUrl}
                    alt={`${displayName} 실물 명함`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : customLogo ? (
                <img
                  src={customLogo}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="h-4 sm:h-5 w-auto max-w-[36px] sm:max-w-[48px] object-contain opacity-90 shrink-0"
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Full-Width Role & Tabular Contact Details */}
        {(titleDisplay || contactPrimary || contactSecondary) && (
          <div className="min-w-0 space-y-0.5">
            {titleDisplay && (
              <p
                className={`text-[11px] sm:text-[11.5px] leading-tight truncate ${themeStyles.textSecondary}`}
              >
                {titleDisplay}
              </p>
            )}

            {(contactPrimary || contactSecondary) && (
              <div
                className={`pt-0.5 flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-mono tabular-nums leading-tight min-w-0 ${themeStyles.textMuted}`}
              >
                {contactPrimary && (
                  <span className="truncate sm:shrink-0">{contactPrimary}</span>
                )}
                {contactPrimary && contactSecondary && (
                  <span aria-hidden="true" className="hidden sm:inline">
                    ·
                  </span>
                )}
                {contactSecondary && (
                  <span className={`truncate ${contactPrimary ? 'hidden sm:inline' : ''}`}>
                    {contactSecondary}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Integrated Card Footer: Direct Contact & Grouped Kebab Management Actions */}
      <footer
        className={`mt-auto pt-2 border-t ${themeStyles.accentHairline} flex items-center justify-between gap-1 min-w-0`}
      >
        {/* Left: Primary Quick Actions (Call, SMS, optional Mail & Website) */}
        <div className="flex items-center gap-1 min-w-0">
          {cleanPhoneNumber ? (
            <>
              <button
                type="button"
                onClick={handleCallClick}
                className={actionBtnClass}
                title={`전화 걸기 (${cleanPhoneNumber})`}
                aria-label={`${displayName}에게 즉시 전화 걸기`}
              >
                <Phone className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
              <button
                type="button"
                onClick={handleSmsClick}
                className={actionBtnClass}
                title={`문자 보내기 (${cleanPhoneNumber})`}
                aria-label={`${displayName}에게 즉시 문자 보내기`}
              >
                <MessageSquare className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
            </>
          ) : null}

          {card.data.email && (
            <a
              href={`mailto:${card.data.email}`}
              onClick={stopLinkPropagation}
              className={card.data.phoneRaw ? desktopOnlyActionBtnClass : actionBtnClass}
              title={`이메일 작성 (${card.data.email})`}
              aria-label={`${displayName}에게 이메일 보내기`}
            >
              <Mail className="w-3.5 h-3.5 stroke-[1.5]" />
            </a>
          )}

          {card.data.website && (
            <a
              href={card.data.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopLinkPropagation}
              className={desktopOnlyActionBtnClass}
              title="웹사이트 열기"
              aria-label={`${displayName} 웹사이트 열기`}
            >
              <Globe className="w-3.5 h-3.5 stroke-[1.5]" />
            </a>
          )}
        </div>

        {/* Right: Secondary Administrative Tools (Edit, Delete, Export vCard, HTML, Photo) in Sleek Kebab */}
        <VaultCardKebabMenu
          card={card}
          hasPhoto={hasPhoto}
          onEditCard={onEditCard}
          onExportCard={onExportCard}
          onDeleteCard={onDeleteCard}
          onOpenPhotoArchive={onOpenPhotoArchive}
          buttonClassName={actionBtnClass}
          menuDirection="up"
        />
      </footer>
    </article>
  );
};

export const VaultCardItem = React.memo(VaultCardItemComponent);
VaultCardItem.displayName = 'VaultCardItem';

export interface VaultCardListRowProps {
  card: StoredCard;
  onSelectCard: (card: StoredCard) => void;
  onEditCard: (card: StoredCard) => void;
  onDeleteCard: (cardId: string) => void;
  onExportCard: (card: StoredCard) => void;
  onOpenPhotoArchive: (card: StoredCard) => void;
}

const VaultCardMobileListItemComponent: React.FC<VaultCardListRowProps> = ({
  card,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onExportCard,
  onOpenPhotoArchive,
}) => {
  const displayName = (card.data.name || card.data.nameKr || '명함').trim();
  const displayTitle = (card.data.titleKr || card.data.title || '').trim();
  const displayOrg = (card.data.organizationKr || card.data.organization || '').trim();
  const displayContact = (card.data.phone || card.data.email || '').trim();
  const cleanPhoneNumber = useMemo(
    () => extractCleanPhoneNumber(card.data.phoneRaw, card.data.phone),
    [card.data.phoneRaw, card.data.phone]
  );

  const handleCallClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (cleanPhoneNumber) {
        window.location.href = `tel:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber]
  );

  const handleSmsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (cleanPhoneNumber) {
        window.location.href = `sms:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber]
  );

  return (
    <div className="px-3 py-2.5 flex justify-between items-center gap-3 hover:bg-white/[0.03] transition-colors relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectCard(card)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectCard(card);
          }
        }}
        className="min-w-0 flex-1 cursor-pointer leading-tight space-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded"
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[13.5px] font-semibold text-white truncate">{displayName}</span>
          {displayTitle && (
            <span className="text-[11px] text-zinc-400 truncate">{displayTitle}</span>
          )}
          {card.isMyCard && (
            <span className="text-[10px] text-zinc-300 font-medium shrink-0">· 내 명함</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 leading-tight min-w-0">
          {displayOrg && <span className="truncate">{displayOrg}</span>}
          {displayOrg && displayContact && <span aria-hidden="true">·</span>}
          {displayContact && (
            <span className="font-mono tabular-nums text-zinc-500 truncate">
              {displayContact}
            </span>
          )}
        </div>
      </div>

      {/* Quick Communication Actions + Kebab Dropdown Menu */}
      <div className="flex items-center gap-1 shrink-0 text-zinc-400">
        {cleanPhoneNumber ? (
          <>
            <button
              type="button"
              onClick={handleCallClick}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={`전화 걸기 (${cleanPhoneNumber})`}
              aria-label={`${displayName}에게 즉시 전화 걸기`}
            >
              <Phone className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
            <button
              type="button"
              onClick={handleSmsClick}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={`문자 보내기 (${cleanPhoneNumber})`}
              aria-label={`${displayName}에게 즉시 문자 보내기`}
            >
              <MessageSquare className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </>
        ) : null}

        <VaultCardKebabMenu
          card={card}
          hasPhoto={Boolean(card.scannedImage)}
          onEditCard={onEditCard}
          onExportCard={onExportCard}
          onDeleteCard={onDeleteCard}
          onOpenPhotoArchive={onOpenPhotoArchive}
          buttonClassName="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          menuDirection="down"
        />
      </div>
    </div>
  );
};

export const VaultCardMobileListItem = React.memo(VaultCardMobileListItemComponent);
VaultCardMobileListItem.displayName = 'VaultCardMobileListItem';

const VaultCardListRowComponent: React.FC<VaultCardListRowProps> = ({
  card,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onExportCard,
  onOpenPhotoArchive,
}) => {
  const displayName = (card.data.name || card.data.nameKr || '명함').trim();
  const cleanPhoneNumber = useMemo(
    () => extractCleanPhoneNumber(card.data.phoneRaw, card.data.phone),
    [card.data.phoneRaw, card.data.phone]
  );

  const handleCallClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (cleanPhoneNumber) {
        window.location.href = `tel:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber]
  );

  const handleSmsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (cleanPhoneNumber) {
        window.location.href = `sms:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber]
  );

  return (
    <tr
      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
      onClick={() => onSelectCard(card)}
    >
      <td className="py-2.5 px-3.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white group-hover:underline underline-offset-2">
            {displayName}
          </span>
          {card.isMyCard && (
            <span className="text-[10px] text-zinc-400 font-medium">· 내 명함</span>
          )}
        </div>
      </td>
      <td className="py-2.5 px-3.5 text-zinc-400">{card.data.titleKr || card.data.title || '-'}</td>
      <td className="py-2.5 px-3.5 text-zinc-300">
        {card.data.organizationKr || card.data.organization || '-'}
      </td>
      <td className="py-2.5 px-3.5 text-zinc-400 text-[11px]">{card.category}</td>
      <td className="py-2.5 px-3.5">
        {card.scannedImage ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPhotoArchive(card);
            }}
            className="flex items-center gap-1 text-[10px] text-zinc-200 hover:text-white hover:underline cursor-pointer"
          >
            <Camera className="w-3 h-3 stroke-[1.5]" />
            <span>사진 보기</span>
          </button>
        ) : (
          <span className="text-[10px] text-zinc-400">-</span>
        )}
      </td>
      <td className="py-2.5 px-3.5 text-zinc-400 font-mono tabular-nums text-[11px]">
        {card.data.phone || card.data.email || '-'}
      </td>
      <td className="py-2.5 px-3.5 text-right relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 text-zinc-400">
          {cleanPhoneNumber ? (
            <>
              <button
                type="button"
                onClick={handleCallClick}
                className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={`전화 걸기 (${cleanPhoneNumber})`}
                aria-label={`${displayName}에게 즉시 전화 걸기`}
              >
                <Phone className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
              <button
                type="button"
                onClick={handleSmsClick}
                className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={`문자 보내기 (${cleanPhoneNumber})`}
                aria-label={`${displayName}에게 즉시 문자 보내기`}
              >
                <MessageSquare className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
            </>
          ) : null}

          <VaultCardKebabMenu
            card={card}
            hasPhoto={Boolean(card.scannedImage)}
            onEditCard={onEditCard}
            onExportCard={onExportCard}
            onDeleteCard={onDeleteCard}
            onOpenPhotoArchive={onOpenPhotoArchive}
            buttonClassName="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            menuDirection="down"
          />
        </div>
      </td>
    </tr>
  );
};

export const VaultCardListRow = React.memo(VaultCardListRowComponent);
VaultCardListRow.displayName = 'VaultCardListRow';

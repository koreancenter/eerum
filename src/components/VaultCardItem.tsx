import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StoredCard } from '../types/card';
import {
  Phone,
  Mail,
  UserPlus,
  Edit3,
  Trash2,
  Download,
  Camera,
  MessageSquare,
  MoreVertical,
  Calendar,
  MapPin,
} from 'lucide-react';
import { resolveThemeStyles, normalizeHexColor } from '../constants/templates';
import { deriveCardThemeHarmony } from '../utils/cardThemeHarmony';
import { downloadVCard, downloadBatchVCard } from '@/utils/cardExporter';
import { matchesKoreanQuery } from '../utils/koreanSearch';

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
  onRecordInteraction?: (cardId: string) => void;
  buttonClassName?: string;
  menuDirection?: 'up' | 'down' | 'auto';
}

interface PositionStyle {
  top?: number;
  bottom?: number;
  right: number;
}

/**
 * Sleek Dark Luxury Kebab Context Menu (`⋮`) for secondary administrative card tools:
 * - Edit Card (명함 수정)
 * - Save Contact vCard (.vcf) (주소록 저장)
 * - Export HTML Code (독립형 HTML 내보내기)
 * - View Original Photo Archive (실물 명함 사진 원본)
 * - Delete Card (명함 삭제)
 *
 * Uses React Portal attached to document.body and smart boundary auto-flip
 * to prevent clipping by any parent overflow-hidden or overflow-x-auto container.
 */
const VaultCardKebabMenu: React.FC<VaultCardKebabMenuProps> = ({
  card,
  hasPhoto,
  onEditCard,
  onExportCard,
  onDeleteCard,
  onOpenPhotoArchive,
  onRecordInteraction,
  buttonClassName,
  menuDirection = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<PositionStyle | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const estimatedMenuHeight = 220; // 5 menu items + margins
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Smart Boundary Detection / Direction Auto-Flip:
    // If the trigger button is near bottom of viewport (spaceBelow < 220 or rect.bottom > window.innerHeight - 200),
    // or if explicitly set to 'up' and space above is sufficient, open upward.
    const shouldOpenUp =
      (menuDirection === 'up' && spaceAbove >= estimatedMenuHeight) ||
      spaceBelow < estimatedMenuHeight;

    const right = Math.max(8, window.innerWidth - rect.right);

    if (shouldOpenUp) {
      setMenuCoords({
        bottom: window.innerHeight - rect.top + 6,
        right,
      });
    } else {
      setMenuCoords({
        top: rect.bottom + 6,
        right,
      });
    }
  }, [menuDirection]);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
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
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateMenuPosition]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updateMenuPosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onEditCard(card);
  };

  const handleVCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onRecordInteraction?.(card.id);
    const hasContext = Boolean(card.metAt || card.metLocation || card.memo || card.notes);
    if (hasContext && !card.isMyCard) {
      const safeName = (card.data.name || card.data.nameKr || 'contact')
        .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
        .toLowerCase();
      downloadBatchVCard([card], `${safeName}.vcf`);
    } else {
      downloadVCard(card.data);
    }
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

  const menuPortal =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: menuCoords?.top !== undefined ? `${menuCoords.top}px` : undefined,
              bottom: menuCoords?.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
              right: menuCoords ? `${menuCoords.right}px` : '8px',
            }}
            className="w-44 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] p-1 z-[9999] animate-in fade-in zoom-in-95 duration-150 divide-y divide-[var(--app-border)] text-xs text-[var(--app-text)] select-none"
          >
            <div className="py-0.5 space-y-0.5">
              <button
                type="button"
                role="menuitem"
                onClick={handleEdit}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
                <span>명함 수정</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleVCard}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
                <span>연락처 저장 (.vcf)</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleExport}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
                <span>HTML 내보내기</span>
              </button>

              {hasPhoto && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handlePhoto}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
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
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>명함 삭제</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${displayName} 관리 더보기 메뉴`}
        title="명함 관리 메뉴 (수정, 삭제, 주소록, HTML)"
        className={
          buttonClassName ||
          'p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]'
        }
      >
        <MoreVertical className="w-3.5 h-3.5 stroke-[1.75]" />
      </button>

      {menuPortal}
    </div>
  );
};

export interface VaultCardItemProps {
  card: StoredCard;
  searchQuery?: string;
  onSelectCard: (card: StoredCard) => void;
  onEditCard: (card: StoredCard) => void;
  onDeleteCard: (cardId: string) => void;
  onExportCard: (card: StoredCard) => void;
  onOpenPhotoArchive: (card: StoredCard) => void;
  onRecordInteraction?: (cardId: string) => void;
}

const VaultCardItemComponent: React.FC<VaultCardItemProps> = ({
  card,
  searchQuery = '',
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onExportCard,
  onOpenPhotoArchive,
  onRecordInteraction,
}) => {
  const hasPhoto = Boolean(card.scannedImage);

  const effectiveTheme =
    card.creation_mode === 'custom_html' && !card.theme ? 'obsidian' : card.theme;
  const customBgHex = normalizeHexColor(card.card_features?.custom_bg_color) || undefined;
  const customBgImage = (card.card_features?.custom_bg_image || '').trim();
  const themeStyles = useMemo(
    () => resolveThemeStyles(effectiveTheme, customBgHex),
    [effectiveTheme, customBgHex]
  );
  const themeHarmony = useMemo(
    () => deriveCardThemeHarmony(themeStyles.accent, themeStyles.isLight, themeStyles.canvasHex),
    [themeStyles]
  );

  // Clean 3-line single-language identity fields (Company, Name, Title)
  const { displayName, orgDisplay, titleDisplay } = useMemo(() => {
    const d = card.data;
    const primaryName = (d.name || d.nameKr || '').trim();
    const primaryOrg = (d.organizationKr || d.organization || '').trim();
    const primaryTitle = (d.titleKr || d.title || '').trim();

    return {
      displayName: primaryName || '이름 없음',
      orgDisplay: primaryOrg,
      titleDisplay: primaryTitle,
    };
  }, [card.data]);

  // Exception: Show compact meeting/memo chip ONLY when an active search query matches meeting/memo fields
  const matchedContextSnippet = useMemo(() => {
    const q = searchQuery.trim();
    if (!q || card.isMyCard) return null;

    const metAt = (card.metAt || '').trim();
    const metLocation = (card.metLocation || '').trim();
    const memoText = (card.memo || card.notes || '').trim();

    const matchesMetAt = Boolean(metAt && matchesKoreanQuery(metAt, q));
    const matchesMetLocation = Boolean(metLocation && matchesKoreanQuery(metLocation, q));
    const matchesMemo = Boolean(memoText && matchesKoreanQuery(memoText, q));

    if (matchesMetAt || matchesMetLocation) {
      return {
        type: 'meeting' as const,
        label: [metAt, metLocation].filter(Boolean).join(' · '),
        hasDate: Boolean(metAt),
      };
    }

    if (matchesMemo) {
      return {
        type: 'memo' as const,
        label: memoText,
        hasDate: false,
      };
    }

    return null;
  }, [searchQuery, card.isMyCard, card.metAt, card.metLocation, card.memo, card.notes]);

  const rawPhone = card.data.phoneRaw || card.data.phone || '';
  const cleanPhoneNumber = useMemo(() => extractCleanPhoneNumber(card.data.phoneRaw, card.data.phone), [card.data.phoneRaw, card.data.phone]);

  const handleCallClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRecordInteraction?.(card.id);
      if (cleanPhoneNumber) {
        window.location.href = `tel:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber, card.id, onRecordInteraction]
  );

  const handleSmsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRecordInteraction?.(card.id);
      if (cleanPhoneNumber) {
        window.location.href = `sms:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber, card.id, onRecordInteraction]
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

  const stopLinkPropagation = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRecordInteraction?.(card.id);
    },
    [card.id, onRecordInteraction]
  );

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
      style={{
        ...themeHarmony.fallbackCssVars,
        backgroundColor: customBgHex,
      }}
      className={`group relative overflow-hidden rounded-xl border ${surfaceBorderClass} ${themeStyles.cardBg} p-4 sm:p-5 shadow-[var(--app-shadow)] transition-colors duration-150 flex flex-col justify-between gap-3.5 sm:gap-4 min-w-0`}
    >
      {customBgImage && (
        <>
          <img
            src={customBgImage}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
          <div
            aria-hidden="true"
            className={`absolute inset-0 pointer-events-none ${
              themeStyles.isLight ? 'bg-white/55' : 'bg-black/55'
            }`}
          />
        </>
      )}

      {/* Self-Contained Clickable Card Body: Clean 3-Line Hierarchy */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelectClick}
        onKeyDown={handleBodyKeyDown}
        aria-label={`${displayName} 명함 상세 보기`}
        title="명함 크게 보기"
        className={`relative z-10 w-full flex flex-col gap-1 min-w-0 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 ${
          themeStyles.isLight ? 'focus-visible:ring-black/30' : 'focus-visible:ring-white/35'
        }`}
      >
        {orgDisplay && (
          <p
            className={`text-[11px] font-medium leading-tight truncate ${themeStyles.textSecondary}`}
          >
            {orgDisplay}
          </p>
        )}

        <div className="flex items-baseline gap-1.5 min-w-0">
          <h3
            className={`text-[15px] sm:text-base font-semibold tracking-tight leading-snug truncate group-hover:underline underline-offset-2 ${themeStyles.textPrimary}`}
          >
            {displayName}
          </h3>
          {card.isMyCard && (
            <span
              className={`text-[10px] font-medium leading-none shrink-0 ${themeStyles.textSecondary}`}
            >
              · 내 명함
            </span>
          )}
        </div>

        {titleDisplay && (
          <p
            className={`text-[11.5px] sm:text-xs leading-tight truncate ${themeStyles.textSecondary}`}
          >
            {titleDisplay}
          </p>
        )}

        {matchedContextSnippet && (
          <div className="pt-1.5 min-w-0">
            <span
              title={matchedContextSnippet.label}
              className={`inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md border ${themeStyles.accentHairline} text-[10.5px] leading-tight ${themeStyles.textMuted}`}
            >
              {matchedContextSnippet.type === 'meeting' ? (
                matchedContextSnippet.hasDate ? (
                  <Calendar className="w-2.5 h-2.5 shrink-0 opacity-80" />
                ) : (
                  <MapPin className="w-2.5 h-2.5 shrink-0 opacity-80" />
                )
              ) : null}
              <span className="truncate">{matchedContextSnippet.label}</span>
            </span>
          </div>
        )}
      </div>

      {/* Unified Card Footer: Essential Quick Actions + Kebab Menu (No Divider Line) */}
      <footer className="relative z-10 mt-auto flex items-center justify-between gap-1 min-w-0">
        {/* Left: Phone, Message, and Mail (Desktop) */}
        <div className="flex items-center gap-1 min-w-0 -ml-1">
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
              className={cleanPhoneNumber ? desktopOnlyActionBtnClass : actionBtnClass}
              title={`이메일 작성 (${card.data.email})`}
              aria-label={`${displayName}에게 이메일 보내기`}
            >
              <Mail className="w-3.5 h-3.5 stroke-[1.5]" />
            </a>
          )}
        </div>

        {/* Right: Kebab Menu */}
        <div className="-mr-1">
          <VaultCardKebabMenu
            card={card}
            hasPhoto={hasPhoto}
            onEditCard={onEditCard}
            onExportCard={onExportCard}
            onDeleteCard={onDeleteCard}
            onOpenPhotoArchive={onOpenPhotoArchive}
            onRecordInteraction={onRecordInteraction}
            buttonClassName={actionBtnClass}
            menuDirection="up"
          />
        </div>
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
  onRecordInteraction?: (cardId: string) => void;
}

const VaultCardMobileListItemComponent: React.FC<VaultCardListRowProps> = ({
  card,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onExportCard,
  onOpenPhotoArchive,
  onRecordInteraction,
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
      onRecordInteraction?.(card.id);
      if (cleanPhoneNumber) {
        window.location.href = `tel:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber, card.id, onRecordInteraction]
  );

  const handleSmsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRecordInteraction?.(card.id);
      if (cleanPhoneNumber) {
        window.location.href = `sms:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber, card.id, onRecordInteraction]
  );

  return (
    <div className="px-3 py-2.5 flex justify-between items-center gap-3 hover:bg-[var(--app-surface-subtle)] transition-colors relative">
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
        className="min-w-0 flex-1 cursor-pointer leading-tight space-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] rounded"
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[13.5px] font-semibold text-[var(--app-text)] truncate">{displayName}</span>
          {displayTitle && (
            <span className="text-[11px] text-[var(--app-text-muted)] truncate">{displayTitle}</span>
          )}
          {card.isMyCard && (
            <span className="text-[10px] text-[var(--app-text-muted)] font-medium shrink-0">· 내 명함</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--app-text-muted)] leading-tight min-w-0">
          {displayOrg && <span className="truncate">{displayOrg}</span>}
          {displayOrg && displayContact && <span aria-hidden="true">·</span>}
          {displayContact && (
            <span className="font-mono tabular-nums text-[var(--app-text-muted)] truncate">
              {displayContact}
            </span>
          )}
        </div>
        {!card.isMyCard && (card.metAt || card.metLocation) && (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--app-text-muted)] leading-tight min-w-0">
            <Calendar className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate font-mono tabular-nums">
              {[card.metAt, card.metLocation].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </div>

      {/* Quick Communication Actions + Kebab Dropdown Menu */}
      <div className="flex items-center gap-1 shrink-0 text-[var(--app-text-muted)]">
        {cleanPhoneNumber ? (
          <>
            <button
              type="button"
              onClick={handleCallClick}
              className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
              title={`전화 걸기 (${cleanPhoneNumber})`}
              aria-label={`${displayName}에게 즉시 전화 걸기`}
            >
              <Phone className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
            <button
              type="button"
              onClick={handleSmsClick}
              className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
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
          onRecordInteraction={onRecordInteraction}
          buttonClassName="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
          menuDirection="auto"
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
  onRecordInteraction,
}) => {
  const displayName = (card.data.name || card.data.nameKr || '명함').trim();
  const cleanPhoneNumber = useMemo(
    () => extractCleanPhoneNumber(card.data.phoneRaw, card.data.phone),
    [card.data.phoneRaw, card.data.phone]
  );

  const handleCallClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRecordInteraction?.(card.id);
      if (cleanPhoneNumber) {
        window.location.href = `tel:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber, card.id, onRecordInteraction]
  );

  const handleSmsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRecordInteraction?.(card.id);
      if (cleanPhoneNumber) {
        window.location.href = `sms:${cleanPhoneNumber}`;
      }
    },
    [cleanPhoneNumber, card.id, onRecordInteraction]
  );

  return (
    <tr
      className="hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer group"
      onClick={() => onSelectCard(card)}
    >
      <td className="py-2.5 px-3.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--app-text)] group-hover:underline underline-offset-2">
            {displayName}
          </span>
          {card.isMyCard && (
            <span className="text-[10px] text-[var(--app-text-muted)] font-medium">· 내 명함</span>
          )}
        </div>
      </td>
      <td className="py-2.5 px-3.5 text-[var(--app-text-muted)]">{card.data.titleKr || card.data.title || '-'}</td>
      <td className="py-2.5 px-3.5 text-[var(--app-text)]">
        {card.data.organizationKr || card.data.organization || '-'}
      </td>
      <td className="py-2.5 px-3.5 text-[var(--app-text-muted)] text-[11px]">
        <div>{card.category}</div>
        {!card.isMyCard && (card.metAt || card.metLocation) && (
          <div className="text-[10px] text-[var(--app-text-muted)] opacity-80 font-mono truncate max-w-[160px]">
            {[card.metAt, card.metLocation].filter(Boolean).join(' · ')}
          </div>
        )}
      </td>
      <td className="py-2.5 px-3.5">
        {card.scannedImage ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPhotoArchive(card);
            }}
            className="flex items-center gap-1 text-[10px] text-[var(--app-text)] hover:underline cursor-pointer"
          >
            <Camera className="w-3 h-3 stroke-[1.5]" />
            <span>사진 보기</span>
          </button>
        ) : (
          <span className="text-[10px] text-[var(--app-text-muted)]">-</span>
        )}
      </td>
      <td className="py-2.5 px-3.5 text-[var(--app-text-muted)] font-mono tabular-nums text-[11px]">
        {card.data.phone || card.data.email || '-'}
      </td>
      <td className="py-2.5 px-3.5 text-right relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 text-[var(--app-text-muted)]">
          {cleanPhoneNumber ? (
            <>
              <button
                type="button"
                onClick={handleCallClick}
                className="p-1.5 rounded-lg hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
                title={`전화 걸기 (${cleanPhoneNumber})`}
                aria-label={`${displayName}에게 즉시 전화 걸기`}
              >
                <Phone className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
              <button
                type="button"
                onClick={handleSmsClick}
                className="p-1.5 rounded-lg hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
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
            onRecordInteraction={onRecordInteraction}
            buttonClassName="p-1.5 rounded-lg hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
            menuDirection="auto"
          />
        </div>
      </td>
    </tr>
  );
};

export const VaultCardListRow = React.memo(VaultCardListRowComponent);
VaultCardListRow.displayName = 'VaultCardListRow';

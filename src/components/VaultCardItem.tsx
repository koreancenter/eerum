import React, { useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { resolveThemeStyles } from '../constants/templates';
import { downloadVCard } from '../utils/vcard';

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

  const handleOpenPhotoClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenPhotoArchive(card);
    },
    [card, onOpenPhotoArchive]
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

  const handleDownloadVCard = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      downloadVCard(card.data);
    },
    [card.data]
  );

  const handleExportClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onExportCard(card);
    },
    [card, onExportCard]
  );

  const handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEditCard(card);
    },
    [card, onEditCard]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteCard(card.id);
    },
    [card.id, onDeleteCard]
  );

  const stopLinkPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const surfaceBorderClass = themeStyles.isLight
    ? 'border-[#1C1B1A]/12 hover:border-[#1C1B1A]/30'
    : 'border-white/10 hover:border-white/25';

  const actionBtnClass = themeStyles.isLight
    ? 'p-1.5 rounded-lg text-[#5C5955] hover:text-[#121214] hover:bg-black/[0.06] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black/25'
    : 'p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25';

  const deleteBtnClass = themeStyles.isLight
    ? 'p-1.5 rounded-lg text-[#5C5955] hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500/30'
    : 'p-1.5 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/15 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400/30';

  return (
    <article
      className={`group relative rounded-xl border ${surfaceBorderClass} ${themeStyles.cardBg} p-3 shadow-sm transition-colors duration-150 flex flex-col justify-between gap-2 min-w-0`}
    >
      {/* Compact Clickable Card Body: flex justify-between items-start prevents any right-side element from overlapping card text */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelectClick}
        onKeyDown={handleBodyKeyDown}
        aria-label={`${displayName} 명함 상세 보기`}
        title="명함 크게 보기"
        className={`w-full flex justify-between items-start gap-3 min-w-0 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 ${
          themeStyles.isLight ? 'focus-visible:ring-black/30' : 'focus-visible:ring-white/35'
        }`}
      >
        {/* Left Identity & Contact Stack */}
        <div className="min-w-0 flex-1 space-y-0.5 leading-tight">
          {orgDisplay && (
            <p
              className={`text-[11px] font-medium leading-tight truncate ${themeStyles.textSecondary}`}
            >
              {orgDisplay}
            </p>
          )}

          <div className="flex items-baseline gap-1.5 min-w-0">
            <h3
              className={`text-[15px] font-semibold tracking-tight leading-snug truncate group-hover:underline underline-offset-2 ${themeStyles.textPrimary}`}
            >
              {displayName}
            </h3>
            {subName && (
              <span
                className={`text-[11px] font-normal leading-tight truncate ${themeStyles.textSecondary}`}
              >
                {subName}
              </span>
            )}
          </div>

          {titleDisplay && (
            <p className={`text-[11.5px] leading-tight truncate ${themeStyles.textSecondary}`}>
              {titleDisplay}
            </p>
          )}

          {(contactPrimary || contactSecondary) && (
            <div
              className={`pt-0.5 flex items-center gap-1.5 text-[11px] font-mono tabular-nums leading-tight min-w-0 ${themeStyles.textMuted}`}
            >
              {contactPrimary && <span className="shrink-0">{contactPrimary}</span>}
              {contactPrimary && contactSecondary && <span aria-hidden="true">·</span>}
              {contactSecondary && <span className="truncate">{contactSecondary}</span>}
            </div>
          )}
        </div>

        {/* Right Non-Overlapping Slot: Inline Category/Owner Label + Optional Photo Thumbnail or Logo */}
        {(card.isMyCard || card.category || photoPreviewUrl || customLogo) && (
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {(card.isMyCard || card.category) && (
              <span
                className={`max-w-[96px] truncate text-[10.5px] leading-tight ${
                  card.isMyCard
                    ? `font-semibold ${themeStyles.textPrimary}`
                    : `font-medium ${themeStyles.textSecondary}`
                }`}
              >
                {card.isMyCard ? '내 명함' : card.category}
              </span>
            )}

            {photoPreviewUrl ? (
              <div
                className={`w-16 sm:w-[72px] aspect-[9/5] rounded-md overflow-hidden border ${themeStyles.accentHairline} bg-black/10 shrink-0`}
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
                loading="lazy"
                className="h-5 w-auto max-w-[48px] object-contain opacity-90 shrink-0"
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Integrated Inner Card Footer: Direct Actions */}
      <div
        className={`pt-2 border-t ${themeStyles.accentHairline} flex items-center justify-between gap-1`}
      >
        <div className="flex items-center gap-0.5">
          {card.data.phoneRaw && (
            <>
              <a
                href={`tel:${card.data.phoneRaw}`}
                onClick={stopLinkPropagation}
                className={actionBtnClass}
                title="전화 걸기"
                aria-label={`${displayName}에게 전화 걸기`}
              >
                <Phone className="w-3.5 h-3.5 stroke-[1.5]" />
              </a>
              <a
                href={`sms:${card.data.phoneRaw}`}
                onClick={stopLinkPropagation}
                className={actionBtnClass}
                title="문자 보내기"
                aria-label={`${displayName}에게 문자 보내기`}
              >
                <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />
              </a>
            </>
          )}
          {card.data.email && (
            <a
              href={`mailto:${card.data.email}`}
              onClick={stopLinkPropagation}
              className={actionBtnClass}
              title="이메일 발송"
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
              className={actionBtnClass}
              title="웹사이트 열기"
              aria-label={`${displayName} 웹사이트 열기`}
            >
              <Globe className="w-3.5 h-3.5 stroke-[1.5]" />
            </a>
          )}
          <button
            type="button"
            onClick={handleDownloadVCard}
            className={actionBtnClass}
            title="주소록 저장 (.vcf)"
            aria-label={`${displayName} 연락처 저장`}
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          {hasPhoto && (
            <button
              type="button"
              onClick={handleOpenPhotoClick}
              className={actionBtnClass}
              title="실물 명함 원본 사진 보기"
              aria-label={`${displayName} 실물 명함 원본 사진 보기`}
            >
              <Camera className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          )}
          <button
            type="button"
            onClick={handleExportClick}
            className={actionBtnClass}
            title="독립형 HTML 코드 내보내기"
            aria-label={`${displayName} 명함 다운로드`}
          >
            <Download className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={handleEditClick}
            className={actionBtnClass}
            title="명함 수정"
            aria-label={`${displayName} 명함 수정`}
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          {!card.isMyCard && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className={deleteBtnClass}
              title="명함 삭제"
              aria-label={`${displayName} 명함 삭제`}
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          )}
        </div>
      </div>
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

  return (
    <div className="px-3 py-2.5 flex justify-between items-start gap-3 hover:bg-white/[0.03] transition-colors">
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

      <div className="flex items-center gap-0.5 shrink-0 text-zinc-400">
        {card.data.phoneRaw && (
          <>
            <a
              href={`tel:${card.data.phoneRaw}`}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10"
              title="전화 걸기"
              aria-label={`${displayName}에게 전화 걸기`}
            >
              <Phone className="w-3.5 h-3.5 stroke-[1.5]" />
            </a>
            <a
              href={`sms:${card.data.phoneRaw}`}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10"
              title="문자 보내기"
              aria-label={`${displayName}에게 문자 보내기`}
            >
              <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />
            </a>
          </>
        )}
        <button
          type="button"
          onClick={() => downloadVCard(card.data)}
          className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 cursor-pointer"
          title="주소록 저장 (.vcf)"
          aria-label={`${displayName} 연락처 저장`}
        >
          <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>
        {card.scannedImage && (
          <button
            type="button"
            onClick={() => onOpenPhotoArchive(card)}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
            title="실물 명함 원본 사진 보기"
            aria-label={`${displayName} 실물 사진 보기`}
          >
            <Camera className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onExportCard(card)}
          className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 cursor-pointer"
          title="명함 다운로드"
          aria-label={`${displayName} 명함 다운로드`}
        >
          <Download className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>
        <button
          type="button"
          onClick={() => onEditCard(card)}
          className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 cursor-pointer"
          title="명함 수정"
          aria-label={`${displayName} 명함 수정`}
        >
          <Edit3 className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>
        {!card.isMyCard && (
          <button
            type="button"
            onClick={() => onDeleteCard(card.id)}
            className="p-1.5 rounded-lg hover:text-rose-300 hover:bg-rose-500/15 cursor-pointer"
            title="명함 삭제"
            aria-label={`${displayName} 명함 삭제`}
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        )}
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
  return (
    <tr
      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
      onClick={() => onSelectCard(card)}
    >
      <td className="py-2.5 px-3.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white group-hover:underline underline-offset-2">
            {card.data.name || card.data.nameKr}
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
      <td className="py-2.5 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-0.5 text-zinc-400">
          {card.data.phoneRaw && (
            <a
              href={`tel:${card.data.phoneRaw}`}
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              title="전화 걸기"
            >
              <Phone className="w-3.5 h-3.5 stroke-[1.5]" />
            </a>
          )}
          <button
            type="button"
            onClick={() => downloadVCard(card.data)}
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="주소록 저장 (.vcf)"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={() => onExportCard(card)}
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="독립형 HTML 코드 내보내기"
          >
            <Download className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={() => onEditCard(card)}
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="수정"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          {!card.isMyCard && (
            <button
              type="button"
              onClick={() => onDeleteCard(card.id)}
              className="p-1.5 rounded-lg hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export const VaultCardListRow = React.memo(VaultCardListRowComponent);
VaultCardListRow.displayName = 'VaultCardListRow';

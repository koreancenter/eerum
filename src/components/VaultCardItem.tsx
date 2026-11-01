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
  Eye,
  Camera,
  MessageSquare,
} from 'lucide-react';
import { BusinessCardFront } from './BusinessCardFront';
import { isVerticalLayout } from '../constants/templates';
import { downloadVCard } from '../utils/vcard';
import { sanitizeHtml } from '../utils/sanitizeHtml';

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
  const isVertical = isVerticalLayout(card.layout_type);

  const sanitizedHtmlFront = useMemo(
    () => (card.html_front ? sanitizeHtml(card.html_front) : undefined),
    [card.html_front]
  );

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

  const handlePreviewKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectCard(card);
      }
    },
    [card, onSelectCard]
  );

  const handleDownloadVCard = useCallback(() => {
    downloadVCard(card.data);
  }, [card.data]);

  const handleExportClick = useCallback(() => {
    onExportCard(card);
  }, [card, onExportCard]);

  const handleEditClick = useCallback(() => {
    onEditCard(card);
  }, [card, onEditCard]);

  const handleDeleteClick = useCallback(() => {
    onDeleteCard(card.id);
  }, [card.id, onDeleteCard]);

  const displayName = card.data.name || card.data.nameKr || '명함';

  return (
    <div className="relative rounded-2xl bg-[#121214] border border-zinc-800/80 hover:border-white/20 overflow-hidden shadow-xl transition-colors duration-200 flex flex-col justify-between">
      {/* Card Header Info */}
      <div className="p-3.5 sm:p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="font-medium text-zinc-300">{card.category}</span>
          {card.isMyCard && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-white">내 명함</span>
            </>
          )}
          {hasPhoto && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleOpenPhotoClick}
                className="font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 underline-offset-2 hover:underline"
                title="실물 명함 원본 사진 열람"
              >
                <Camera className="w-3 h-3 stroke-[1.5]" />
                <span>사진 보관</span>
              </button>
            </>
          )}
        </div>
        <span className="text-[10px] font-mono tabular-nums text-zinc-400">
          {card.createdAt}
        </span>
      </div>

      {/* Card Miniature Preview (Click to Open in 3D Viewport) */}
      <div className="p-4 flex-1 flex items-center justify-center">
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelectClick}
          onKeyDown={handlePreviewKeyDown}
          aria-label={`${displayName} 크게 보기`}
          title="명함 크게 보기"
          className={`group/preview relative w-full ${
            isVertical ? 'aspect-[5/8] max-w-[200px] mx-auto' : 'aspect-[9/5]'
          } rounded-xl overflow-hidden shadow-md ring-1 ring-white/10 hover:ring-white/30 transition-shadow duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
        >
          <div className="w-full h-full pointer-events-none">
            <BusinessCardFront
              data={card.data}
              theme={card.theme}
              layout_type={card.layout_type}
              card_features={card.card_features}
              isPhotoCard={card.isPhotoCard || card.creation_mode === 'photo'}
              photoUrl={card.scannedImage || card.front_image_url}
              html_front={sanitizedHtmlFront}
              hideBorder={true}
            />
          </div>

          {/* Minimal Corner View Affordance (Never obscures card text) */}
          <div
            aria-hidden="true"
            className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-[#121214]/90 border border-white/15 flex items-center justify-center text-zinc-200 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-150 pointer-events-none shadow-md"
          >
            <Eye className="w-3.5 h-3.5 stroke-[1.5]" />
          </div>
        </div>
      </div>

      {/* Action Rail Footer */}
      <div className="p-3 border-t border-zinc-800/80 bg-[#0A0A0B] flex items-center justify-between text-zinc-400">
        <div className="flex items-center gap-1">
          {card.data.phoneRaw && (
            <>
              <a
                href={`tel:${card.data.phoneRaw}`}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                title="전화 걸기"
              >
                <Phone className="w-3.5 h-3.5 stroke-[1.5]" />
              </a>
              <a
                href={`sms:${card.data.phoneRaw}`}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                title="문자 보내기"
              >
                <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />
              </a>
            </>
          )}
          {card.data.email && (
            <a
              href={`mailto:${card.data.email}`}
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              title="이메일 발송"
            >
              <Mail className="w-3.5 h-3.5 stroke-[1.5]" />
            </a>
          )}
          {card.data.website && (
            <a
              href={card.data.website}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              title="웹사이트"
            >
              <Globe className="w-3.5 h-3.5 stroke-[1.5]" />
            </a>
          )}
          <button
            type="button"
            onClick={handleDownloadVCard}
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="주소록 저장 (.vcf)"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {hasPhoto && (
            <button
              type="button"
              onClick={handleOpenPhotoClick}
              className="p-1.5 rounded-lg text-zinc-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="실물 명함 원본 사진 보기"
            >
              <Camera className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          )}
          <button
            type="button"
            onClick={handleExportClick}
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="독립형 HTML 코드 내보내기"
          >
            <Download className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={handleEditClick}
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="명함 수정"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          {!card.isMyCard && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="명함 삭제"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const VaultCardItem = React.memo(VaultCardItemComponent);
VaultCardItem.displayName = 'VaultCardItem';

export interface VaultCardListRowProps {
  card: StoredCard;
  onSelectCard: (card: StoredCard) => void;
  onEditCard: (card: StoredCard) => void;
  onDeleteCard: (cardId: string) => void;
  onOpenPhotoArchive: (card: StoredCard) => void;
}

const VaultCardListRowComponent: React.FC<VaultCardListRowProps> = ({
  card,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onOpenPhotoArchive,
}) => {
  return (
    <tr
      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
      onClick={() => onSelectCard(card)}
    >
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white group-hover:underline underline-offset-2">
            {card.data.name || card.data.nameKr}
          </span>
          {card.isMyCard && (
            <span className="text-[10px] text-zinc-400 font-medium">· 내 명함</span>
          )}
        </div>
      </td>
      <td className="py-3.5 px-4 text-zinc-400">{card.data.titleKr || card.data.title || '-'}</td>
      <td className="py-3.5 px-4 text-zinc-300">
        {card.data.organizationKr || card.data.organization || '-'}
      </td>
      <td className="py-3.5 px-4 text-zinc-400 text-[11px]">{card.category}</td>
      <td className="py-3.5 px-4">
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
      <td className="py-3.5 px-4 text-zinc-400 font-mono tabular-nums text-[11px]">
        {card.data.phone || card.data.email || '-'}
      </td>
      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 text-zinc-400">
          <button
            type="button"
            onClick={() => downloadVCard(card.data)}
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="vCard 다운로드"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
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
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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

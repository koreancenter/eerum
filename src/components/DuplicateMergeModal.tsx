import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  Camera,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { StoredCard } from '../types/card';
import {
  DuplicateGroup,
  buildMergedVaultCard,
  mergeDuplicateNotes,
} from '../utils/duplicateDetector';
import { useLocale } from '../hooks/useLocale';

export interface DuplicateMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroups: DuplicateGroup[];
  onMergeGroup: (mergedCard: StoredCard, duplicateCardIds: string[]) => void;
}

const FIELD_LABELS_KO: Record<string, string> = {
  organization: '영문 소속',
  organizationKr: '소속/회사',
  subOrg: '하위 소속',
  name: '성명',
  nameEn: '영문명',
  nameKr: '한글명',
  title: '영문 직함',
  titleKr: '직함',
  phone: '전화번호',
  phoneRaw: '원본 번호',
  whatsappUrl: 'WhatsApp',
  linkedinUrl: 'LinkedIn',
  email: '이메일',
  website: '웹사이트 URL',
  websiteDisplay: '웹사이트',
  addressKr: '국문 주소',
  address_en: '영문 주소',
  addressEn: '영문 주소',
  addressLines: '상세 주소',
  googleMapsUrl: 'Google 지도',
  naverMapsUrl: '네이버 지도',
  category: '카테고리',
};

const FIELD_LABELS_EN: Record<string, string> = {
  organization: 'Company (EN)',
  organizationKr: 'Company / Org',
  subOrg: 'Department / Sub-org',
  name: 'Name',
  nameEn: 'English Name',
  nameKr: 'Korean Name',
  title: 'Title (EN)',
  titleKr: 'Title',
  phone: 'Phone',
  phoneRaw: 'Raw Phone',
  whatsappUrl: 'WhatsApp',
  linkedinUrl: 'LinkedIn',
  email: 'Email',
  website: 'Website URL',
  websiteDisplay: 'Website',
  addressKr: 'Address (KR)',
  address_en: 'Address (EN)',
  addressEn: 'Address (EN)',
  addressLines: 'Address Lines',
  googleMapsUrl: 'Google Maps',
  naverMapsUrl: 'Naver Map',
  category: 'Category',
};

function getCardModeLabel(card: StoredCard, isEn: boolean): string {
  if (card.creation_mode === 'photo' || card.isPhotoCard || card.scannedImage) {
    return isEn ? 'Photo Scan' : '실물 사진';
  }
  if (card.creation_mode === 'custom_html' || card.creation_mode === 'custom') {
    return isEn ? 'Custom Code' : '커스텀 코드';
  }
  return isEn ? 'Digital Template' : '디지털 템플릿';
}

function getCardDisplayName(card: StoredCard, isEn: boolean): string {
  return (card.data?.name || card.data?.nameKr || (isEn ? 'Unnamed' : '이름 없음')).trim();
}

function getCardOrg(card: StoredCard): string {
  return (
    card.data?.organizationKr ||
    card.data?.organization ||
    card.data?.subOrg ||
    ''
  ).trim();
}

function getCardTitle(card: StoredCard): string {
  return (card.data?.titleKr || card.data?.title || '').trim();
}

export const DuplicateMergeModal: React.FC<DuplicateMergeModalProps> = ({
  isOpen,
  onClose,
  duplicateGroups,
  onMergeGroup,
}) => {
  const { isEn } = useLocale();
  const [groupIndex, setGroupIndex] = useState<number>(0);
  const [primaryCardId, setPrimaryCardId] = useState<string>('');
  const [notesDraft, setNotesDraft] = useState<string>('');
  const fieldLabels = isEn ? FIELD_LABELS_EN : FIELD_LABELS_KO;

  // Clamp groupIndex whenever duplicateGroups shrinks after a merge
  const safeIndex =
    duplicateGroups.length > 0
      ? Math.min(groupIndex, duplicateGroups.length - 1)
      : 0;
  const activeGroup = duplicateGroups[safeIndex] || null;

  // Reset or sync selected primary card when active group changes
  useEffect(() => {
    if (!isOpen || !activeGroup) return;
    const stillInGroup = activeGroup.cards.some((c) => c.id === primaryCardId);
    if (!stillInGroup) {
      // Prefer card with scanned photos or most populated fields as default primary
      const ranked = [...activeGroup.cards].sort((a, b) => {
        const photoScoreA = (a.scannedImage ? 2 : 0) + (a.scannedImageBack ? 1 : 0);
        const photoScoreB = (b.scannedImage ? 2 : 0) + (b.scannedImageBack ? 1 : 0);
        if (photoScoreA !== photoScoreB) return photoScoreB - photoScoreA;
        const fieldScoreA = [
          a.data?.name,
          a.data?.phone,
          a.data?.email,
          a.data?.organizationKr || a.data?.organization,
          a.data?.titleKr || a.data?.title,
          a.notes,
        ].filter((v) => Boolean(v && v.trim())).length;
        const fieldScoreB = [
          b.data?.name,
          b.data?.phone,
          b.data?.email,
          b.data?.organizationKr || b.data?.organization,
          b.data?.titleKr || b.data?.title,
          b.notes,
        ].filter((v) => Boolean(v && v.trim())).length;
        return fieldScoreB - fieldScoreA;
      });
      setPrimaryCardId(ranked[0]?.id || activeGroup.cards[0]?.id || '');
    }
  }, [isOpen, activeGroup, primaryCardId]);

  const primaryCard = useMemo(
    () =>
      activeGroup?.cards.find((c) => c.id === primaryCardId) ||
      activeGroup?.cards[0] ||
      null,
    [activeGroup, primaryCardId]
  );

  const duplicateCards = useMemo(() => {
    if (!activeGroup || !primaryCard) return [];
    return activeGroup.cards.filter((c) => c.id !== primaryCard.id);
  }, [activeGroup, primaryCard]);

  // Recompute merged notes draft whenever group or primary card selection changes
  useEffect(() => {
    if (!isOpen || !primaryCard) return;
    setNotesDraft(mergeDuplicateNotes(primaryCard, duplicateCards));
  }, [isOpen, activeGroup?.id, primaryCard?.id]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const mergePreview = useMemo(() => {
    if (!primaryCard) return null;
    return buildMergedVaultCard(primaryCard, duplicateCards, notesDraft);
  }, [primaryCard, duplicateCards, notesDraft]);

  if (!isOpen) return null;

  const handleConfirmMerge = () => {
    if (!primaryCard || !mergePreview || duplicateCards.length === 0) return;
    const dupIds = duplicateCards.map((c) => c.id);
    const isLastGroup = duplicateGroups.length <= 1;
    onMergeGroup(mergePreview.mergedCard, dupIds);
    if (isLastGroup) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90dvh] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-[var(--app-shadow)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-merge-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--app-highlight)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-highlight-fg)] shrink-0">
              <GitMerge className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div className="min-w-0">
              <h3
                id="duplicate-merge-title"
                className="text-sm sm:text-base font-bold text-[var(--app-text)] tracking-tight truncate"
              >
                {isEn ? 'Merge Duplicate Contacts' : '중복 연락처 통합 정리'}
              </h3>
              {activeGroup && (
                <p className="text-[11px] text-[var(--app-text-muted)] flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono tabular-nums text-[var(--app-text)]">
                    {isEn
                      ? `Group ${safeIndex + 1} / ${duplicateGroups.length}`
                      : `${safeIndex + 1} / ${duplicateGroups.length}그룹`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {activeGroup.matchedReasons
                      .map((r) =>
                        r === 'phone'
                          ? isEn
                            ? 'Matching phone'
                            : '전화번호 일치'
                          : isEn
                            ? 'Matching email'
                            : '이메일 일치'
                      )
                      .join(' & ')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {isEn
                      ? `Comparing ${activeGroup.cards.length} cards`
                      : `총 ${activeGroup.cards.length}장 비교`}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {duplicateGroups.length > 1 && (
              <div className="flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={() =>
                    setGroupIndex((prev) =>
                      prev > 0 ? prev - 1 : duplicateGroups.length - 1
                    )
                  }
                  className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] transition-colors cursor-pointer"
                  aria-label={isEn ? 'Previous duplicate group' : '이전 중복 그룹'}
                  title={isEn ? 'Previous duplicate group' : '이전 중복 그룹'}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setGroupIndex((prev) =>
                      prev + 1 < duplicateGroups.length ? prev + 1 : 0
                    )
                  }
                  className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] transition-colors cursor-pointer"
                  aria-label={isEn ? 'Next duplicate group' : '다음 중복 그룹'}
                  title={isEn ? 'Next duplicate group' : '다음 중복 그룹'}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
              aria-label={isEn ? 'Close' : '닫기'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Comparison Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!activeGroup || !primaryCard || !mergePreview ? (
            <div className="py-12 text-center text-xs text-[var(--app-text-muted)]">
              {isEn ? 'No duplicate contacts to merge.' : '정리할 중복 연락처가 없습니다.'}
            </div>
          ) : (
            <>
              {/* Instruction Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--app-border)]">
                <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                  {isEn ? (
                    <>
                      Select the <strong className="text-[var(--app-text)]">Primary Card</strong> to keep. Its design, theme, and scanned photos stay intact, while any empty contact fields are filled automatically from the duplicates.
                    </>
                  ) : (
                    <>
                      유지할 <strong className="text-[var(--app-text)]">대표 명함(Primary Card)</strong>을 선택하세요. 대표 명함의 디자인·테마·실물 사진은 유지되며, 비어 있는 연락처 필드는 중복 명함에서 자동으로 채워집니다.
                    </>
                  )}
                </p>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div
                className={`grid gap-3 ${
                  activeGroup.cards.length === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {activeGroup.cards.map((card, idx) => {
                  const isPrimary = card.id === primaryCard.id;
                  const frontImg = card.scannedImage || card.front_image_url;
                  const backImg = card.scannedImageBack || card.back_image_url;
                  const displayName = getCardDisplayName(card, isEn);
                  const displayOrg = getCardOrg(card);
                  const displayTitle = getCardTitle(card);
                  const createdLabel = card.updatedAt?.split('T')[0] || card.createdAt || '-';

                  return (
                    <div
                      key={card.id}
                      onClick={() => setPrimaryCardId(card.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPrimaryCardId(card.id);
                        }
                      }}
                      aria-pressed={isPrimary}
                      className={`rounded-2xl border p-4 text-left transition-all cursor-pointer flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                        isPrimary
                          ? 'bg-[var(--app-surface)] border-[var(--app-accent)] shadow-[var(--app-shadow)] ring-1 ring-[var(--app-accent)]/25'
                          : 'bg-[var(--app-surface-subtle)] border-[var(--app-border)] hover:border-[var(--app-text-muted)]/40 opacity-85 hover:opacity-100'
                      }`}
                    >
                      {/* Card Selection Header */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--app-border)]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                              isPrimary
                                ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-[var(--app-accent-fg)]'
                                : 'border-[var(--app-text-muted)] bg-transparent'
                            }`}
                          >
                            {isPrimary && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span className="text-xs font-semibold text-[var(--app-text)] truncate">
                            {isPrimary
                              ? isEn
                                ? 'Primary Card (Keep)'
                                : '대표 명함 (유지)'
                              : isEn
                                ? `Duplicate ${idx + 1} (Remove after merge)`
                                : `중복 명함 ${idx + 1} (병합 후 삭제)`}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--app-text-muted)] shrink-0 tabular-nums">
                          {createdLabel}
                        </span>
                      </div>

                      {/* Identity & Visual Mode Summary */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <h4 className="text-sm font-bold text-[var(--app-text)] truncate">
                              {displayName}
                            </h4>
                            {card.data?.nameEn && (
                              <span className="text-[11px] text-[var(--app-text-muted)] truncate">
                                {card.data.nameEn}
                              </span>
                            )}
                          </div>
                          {displayOrg && (
                            <p className="text-xs text-[var(--app-text)] truncate">{displayOrg}</p>
                          )}
                          {displayTitle && (
                            <p className="text-[11px] text-[var(--app-text-muted)] truncate">{displayTitle}</p>
                          )}
                          <p className="text-[10.5px] text-[var(--app-text-muted)] pt-0.5">
                            {getCardModeLabel(card, isEn)} · {card.theme || 'obsidian'} ·{' '}
                            {card.category || (isEn ? 'Other' : '기타')}
                          </p>
                        </div>

                        {(frontImg || backImg) && (
                          <div className="flex items-center gap-1 shrink-0">
                            {frontImg && (
                              <div className="w-14 aspect-[9/5] rounded-md overflow-hidden border border-[var(--app-border)] bg-[var(--app-bg)] relative">
                                <img
                                  src={frontImg}
                                  alt={isEn ? `${displayName} front` : `${displayName} 앞면`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            {backImg && (
                              <div className="w-14 aspect-[9/5] rounded-md overflow-hidden border border-[var(--app-border)] bg-[var(--app-bg)] relative">
                                <img
                                  src={backImg}
                                  alt={isEn ? `${displayName} back` : `${displayName} 뒷면`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Contact & Memo Comparison Details */}
                      <dl className="grid grid-cols-1 gap-1.5 pt-2 border-t border-[var(--app-border)] text-[11px]">
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-[var(--app-text-muted)] shrink-0">
                            {isEn ? 'Phone' : '전화'}
                          </dt>
                          <dd className="text-[var(--app-text)] font-mono tabular-nums truncate text-right">
                            {card.data?.phone || <span className="text-[var(--app-text-muted)] opacity-50">-</span>}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-[var(--app-text-muted)] shrink-0">
                            {isEn ? 'Email' : '이메일'}
                          </dt>
                          <dd className="text-[var(--app-text)] font-mono truncate text-right">
                            {card.data?.email || <span className="text-[var(--app-text-muted)] opacity-50">-</span>}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-[var(--app-text-muted)] shrink-0">
                            {isEn ? 'Website' : '웹사이트'}
                          </dt>
                          <dd className="text-[var(--app-text-muted)] truncate text-right">
                            {card.data?.websiteDisplay || card.data?.website || (
                              <span className="opacity-50">-</span>
                            )}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-[var(--app-text-muted)] shrink-0">
                            {isEn ? 'Address' : '주소'}
                          </dt>
                          <dd className="text-[var(--app-text-muted)] truncate text-right">
                            {card.data?.addressKr ||
                              card.data?.addressLines?.filter(Boolean).join(' ') || (
                                <span className="opacity-50">-</span>
                              )}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-[var(--app-text-muted)] shrink-0">
                            {isEn ? 'Photo Scan' : '실물 사진'}
                          </dt>
                          <dd className="text-[var(--app-text-muted)] inline-flex items-center gap-1 justify-end">
                            {frontImg || backImg ? (
                              <>
                                <Camera className="w-3 h-3" />
                                <span>
                                  {frontImg && backImg
                                    ? isEn
                                      ? 'Front & Back'
                                      : '앞·뒷면 보관'
                                    : isEn
                                      ? '1 Side'
                                      : '1면 보관'}
                                </span>
                              </>
                            ) : (
                              <span className="opacity-50">{isEn ? 'None' : '없음'}</span>
                            )}
                          </dd>
                        </div>
                        <div className="pt-1 space-y-0.5">
                          <dt className="text-[var(--app-text-muted)]">
                            {isEn ? 'Existing Memo' : '보유 메모'}
                          </dt>
                          <dd className="text-[var(--app-text)] bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed whitespace-pre-wrap break-words max-h-20 overflow-y-auto">
                            {card.notes?.trim() ? (
                              card.notes.trim()
                            ) : (
                              <span className="text-[var(--app-text-muted)] opacity-60">
                                {isEn ? 'No memo' : '입력된 메모 없음'}
                              </span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>

              {/* Live Merged Result Preview */}
              <div className="rounded-2xl bg-[var(--app-bg)] border border-[var(--app-border)] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--app-border)]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--app-text)]">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--app-accent)] shrink-0" />
                    <span>{isEn ? 'Merged Result Preview' : '병합 결과 미리보기'}</span>
                  </div>
                  <div className="text-[11px] text-[var(--app-text-muted)]">
                    {mergePreview.filledFields.length > 0
                      ? isEn
                        ? `Auto-filled from duplicates: ${mergePreview.filledFields
                            .slice(0, 4)
                            .map((f) => fieldLabels[f] || f)
                            .join(', ')}${
                            mergePreview.filledFields.length > 4
                              ? ` +${mergePreview.filledFields.length - 4} more`
                              : ''
                          }`
                        : `중복 명함에서 ${mergePreview.filledFields
                            .slice(0, 4)
                            .map((f) => fieldLabels[f] || f)
                            .join(', ')}${
                            mergePreview.filledFields.length > 4
                              ? ` 외 ${mergePreview.filledFields.length - 4}개`
                              : ''
                          } 자동 보완됨`
                      : isEn
                        ? 'Primary card already has all fields populated'
                        : '대표 명함의 모든 정보가 최신 상태입니다'}
                  </div>
                </div>

                {/* Merged Key Fields Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="px-3 py-2 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] min-w-0">
                    <span className="text-[var(--app-text-muted)] block">
                      {isEn ? 'Name · Title' : '성명 · 직함'}
                    </span>
                    <span className="text-[var(--app-text)] font-medium truncate block">
                      {getCardDisplayName(mergePreview.mergedCard, isEn)}
                      {getCardTitle(mergePreview.mergedCard)
                        ? ` · ${getCardTitle(mergePreview.mergedCard)}`
                        : ''}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] min-w-0">
                    <span className="text-[var(--app-text-muted)] block">
                      {isEn ? 'Company · Category' : '소속 · 카테고리'}
                    </span>
                    <span className="text-[var(--app-text)] truncate block">
                      {getCardOrg(mergePreview.mergedCard) || '-'} ·{' '}
                      {mergePreview.mergedCard.category}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] min-w-0">
                    <span className="text-[var(--app-text-muted)] block">
                      {isEn ? 'Phone · Email' : '연락처 · 이메일'}
                    </span>
                    <span className="text-[var(--app-text)] font-mono truncate block">
                      {mergePreview.mergedCard.data.phone || '-'} ·{' '}
                      {mergePreview.mergedCard.data.email || '-'}
                    </span>
                  </div>
                </div>

                {/* Editable Concatenated Memo Preview */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="merged-notes-editor"
                    className="block text-[11px] font-medium text-[var(--app-text-muted)]"
                  >
                    {isEn
                      ? 'Combined Private Memo (with timestamp dividers · editable before merge)'
                      : '통합된 개인 메모 (타임스탬프 구분선 포함 · 병합 전 직접 수정 가능)'}
                  </label>
                  <textarea
                    id="merged-notes-editor"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={3}
                    placeholder={isEn ? 'No memos to merge.' : '병합될 메모가 없습니다.'}
                    className="w-full rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] p-3 text-xs text-[var(--app-text)] leading-relaxed placeholder:text-[var(--app-text-muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 resize-y"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 border-t border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            {isEn ? 'Later' : '나중에 하기'}
          </button>

          {activeGroup && duplicateCards.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmMerge}
              className="px-5 py-2.5 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-bold tracking-tight transition-all cursor-pointer active:scale-[0.98] shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <GitMerge className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>
                {isEn
                  ? `Merge & Remove ${duplicateCards.length} Duplicate${duplicateCards.length === 1 ? '' : 's'}`
                  : `병합 및 중복 ${duplicateCards.length}건 정리`}
              </span>
              <Trash2 className="w-3 h-3 opacity-60 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuplicateMergeModal;

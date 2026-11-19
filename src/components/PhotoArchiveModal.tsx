import React, { useState, useRef, useEffect } from 'react';
import { StoredCard } from '../types/card';
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  Download,
  Loader2,
  Link2,
  Check,
  Plus,
  UserPlus,
  ScanText,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BusinessCardFront } from './BusinessCardFront';
import { cropAndCompressCardImage } from '../utils/imageProcess';
import { ParsedCardFields, parseBusinessCardText } from '../utils/parseBusinessCardText';
import { sanitizeExternalUrl } from '../utils/sanitizeUrl';
import {
  CardSerializer,
  parseSlugFromInput,
  sanitizeCardForVault,
  isPlatformHost,
  normalizeDomain,
} from '@/utils/cardSerializer';
import { INITIAL_CARDS as SAMPLE_CARDS } from '../constants/sampleCards';
import { loadUserCards } from '../utils/initialCards';
import {
  CATEGORIES_UPDATED_EVENT,
  loadVaultCategories,
  addVaultCategory,
} from '../utils/categories';
import { ImportContactsModal } from './ImportContactsModal';

export interface PhotoArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: StoredCard | null;
  onSaveCard?: (newCard: StoredCard) => void;
  existingCards?: StoredCard[];
  onImportCards?: (cards: StoredCard[]) => void;
  showToast?: (msg: string) => void;
  onOpenImportContacts?: () => void;
}

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] hover:border-[var(--app-text-muted)]/40 focus:border-[var(--app-accent)] focus:outline-none disabled:opacity-50 text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]/70 text-xs';

export const PhotoArchiveModal: React.FC<PhotoArchiveModalProps> = ({
  isOpen,
  onClose,
  card,
  onSaveCard,
  existingCards,
  onImportCards,
  showToast,
  onOpenImportContacts,
}) => {
  // If card is provided and onSaveCard is not, we are in Viewer mode
  const isViewerMode = Boolean(card && !onSaveCard);

  // Viewer State
  const [viewTab, setViewTab] = useState<'photo' | 'digital' | 'compare'>('photo');

  // Registration Mode ('photo' scan vs 'link' shared URL vs 'contacts' batch import)
  const [registerMode, setRegisterMode] = useState<'photo' | 'link' | 'contacts'>('photo');

  // Archive Capture State
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<'front' | 'back'>('front');

  // Essential Quick Input State (Photo Mode)
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [phone, setPhone] = useState('');
  const [companyAndNote, setCompanyAndNote] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [extraMemo, setExtraMemo] = useState('');
  const [category, setCategory] = useState<string>('VIP 파트너');
  const [isProcessing, setIsProcessing] = useState(false);

  // Local OCR State
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');
  const [showRawOcrText, setShowRawOcrText] = useState(false);
  const [pendingOcrParsed, setPendingOcrParsed] = useState<ParsedCardFields | null>(null);
  const [ocrConflicts, setOcrConflicts] = useState<string[]>([]);

  // Shared Link Registration State (Link Mode)
  const [linkInput, setLinkInput] = useState('');
  const [linkNote, setLinkNote] = useState('');
  const [resolvedLinkCard, setResolvedLinkCard] = useState<StoredCard | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isResolvingLink, setIsResolvingLink] = useState(false);

  const [categories, setCategories] = useState<string[]>(() => loadVaultCategories());
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<'front' | 'back'>('front');
  const processingRef = useRef(false);

  useEffect(() => {
    const sync = () => {
      const next = loadVaultCategories();
      setCategories(next);
      setCategory((prev) => (next.includes(prev) ? prev : next[0] || '기타'));
    };
    if (isOpen) {
      sync();
    }
    window.addEventListener(CATEGORIES_UPDATED_EVENT, sync);
    return () => window.removeEventListener(CATEGORIES_UPDATED_EVENT, sync);
  }, [isOpen]);

  const handleQuickAddCategory = () => {
    const res = addVaultCategory(newCategoryInput);
    if (!res.ok || !res.added) {
      setCategoryError(res.error || '카테고리를 추가할 수 없습니다.');
      return;
    }
    setCategories(res.categories);
    setCategory(res.added);
    setNewCategoryInput('');
    setCategoryError(null);
    setIsAddingCategory(false);
  };

  if (!isOpen) return null;

  // VIEWER MODE: Original Photo & Dual Comparison
  if (isViewerMode && card) {
    const downloadOriginalPhoto = () => {
      if (!card.scannedImage) return;
      const a = document.createElement('a');
      a.href = card.scannedImage;
      a.download = `${card.data.name || 'card'}-physical-archive.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="실물 명함 아카이브"
          className="relative w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-[var(--app-shadow)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-[var(--app-border)] flex items-center justify-between gap-4 shrink-0">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--app-text)] tracking-tight truncate">
                {card.data.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[var(--app-text-muted)] mt-0.5">
                <span>{card.category}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{card.createdAt}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {card.scannedImage && (
                <button
                  type="button"
                  onClick={downloadOriginalPhoto}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-medium cursor-pointer transition-colors"
                  title="실물 사진 저장"
                >
                  <Download className="w-3.5 h-3.5 stroke-[1.5]" />
                  <span className="hidden sm:inline">사진 저장</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer transition-colors"
                title="닫기"
                aria-label="닫기"
              >
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>
          </div>

          {/* View Mode Bar */}
          <div className="px-5 sm:px-7 py-3 border-b border-[var(--app-border)] text-xs shrink-0">
            <div className="inline-flex items-center gap-1 p-1 bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-xl">
              <button
                type="button"
                onClick={() => setViewTab('photo')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  viewTab === 'photo'
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
                }`}
              >
                실물 사진
              </button>
              <button
                type="button"
                onClick={() => setViewTab('compare')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  viewTab === 'compare'
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
                }`}
              >
                실물 · 디지털 비교
              </button>
              <button
                type="button"
                onClick={() => setViewTab('digital')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  viewTab === 'digital'
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
                }`}
              >
                디지털 명함
              </button>
            </div>
          </div>

          {/* Content Viewport */}
          <div className="p-5 sm:p-7 overflow-y-auto flex-1 flex flex-col items-center justify-center">
            {viewTab === 'photo' && (
              <div className="w-full max-w-xl flex flex-col items-center gap-4 animate-in fade-in duration-150">
                <div className="relative rounded-2xl overflow-hidden border border-[var(--app-border)] shadow-[var(--app-shadow)] bg-[var(--app-bg)] aspect-[9/5] w-full flex items-center justify-center">
                  {card.scannedImage ? (
                    <img
                      src={card.scannedImage}
                      alt="보관된 실물 명함 앞면"
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="text-center p-6 text-[var(--app-text-muted)] text-xs">
                      실물 사진이 등록되지 않았습니다.
                    </div>
                  )}
                </div>
                {card.scannedImageBack && (
                  <div className="relative rounded-2xl overflow-hidden border border-[var(--app-border)] shadow-[var(--app-shadow)] bg-[var(--app-bg)] aspect-[9/5] w-full flex items-center justify-center">
                    <img
                      src={card.scannedImageBack}
                      alt="보관된 실물 명함 뒷면"
                      className="w-full h-full object-cover select-none"
                    />
                  </div>
                )}
              </div>
            )}

            {viewTab === 'compare' && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center animate-in fade-in duration-150 max-w-4xl">
                <div className="space-y-2.5">
                  <span className="text-xs text-[var(--app-text-muted)] block text-center">
                    실물 촬영본
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-[var(--app-border)] shadow-[var(--app-shadow)] bg-[var(--app-bg)] aspect-[9/5] w-full flex items-center justify-center">
                    {card.scannedImage ? (
                      <img
                        src={card.scannedImage}
                        alt="실물 명함"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[var(--app-text-muted)]">실물 사진 없음</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-xs text-[var(--app-text-muted)] block text-center">
                    디지털 명함
                  </span>
                  <div className="rounded-2xl overflow-hidden ring-1 ring-[var(--app-border)] shadow-[var(--app-shadow)] w-full">
                    <BusinessCardFront
                      data={card.data}
                      theme={card.theme}
                      layout_type={card.layout_type}
                      card_features={card.card_features}
                      isPrintPreview={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {viewTab === 'digital' && (
              <div className="w-full max-w-md animate-in fade-in duration-150">
                <div className="rounded-2xl overflow-hidden ring-1 ring-[var(--app-border)] shadow-[var(--app-shadow)]">
                  <BusinessCardFront
                    data={card.data}
                    theme={card.theme}
                    layout_type={card.layout_type}
                    card_features={card.card_features}
                    isPrintPreview={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // CAPTURE / ARCHIVE INPUT MODE
  const resetOcrStates = () => {
    setIsExtractingOcr(false);
    setOcrProgress(0);
    setOcrMessage('');
    setOcrError('');
    setRawOcrText('');
    setShowRawOcrText(false);
    setPendingOcrParsed(null);
    setOcrConflicts([]);
  };

  const resetModalInputs = () => {
    setFrontPhoto(null);
    setBackPhoto(null);
    setName('');
    setNameEn('');
    setPhone('');
    setCompanyAndNote('');
    setJobTitle('');
    setEmail('');
    setWebsite('');
    setAddress('');
    setExtraMemo('');
    setCategory('VIP 파트너');
    setLinkInput('');
    setLinkNote('');
    setResolvedLinkCard(null);
    setLinkError(null);
    setRegisterMode('photo');
    resetOcrStates();
  };

  const handleSafeClose = () => {
    if (isProcessing || processingRef.current || isResolvingLink) return;
    resetModalInputs();
    onClose();
  };

  const handleResolveSharedLink = async () => {
    const trimmed = linkInput.trim();
    if (!trimmed) {
      setLinkError('공유 링크 또는 슬러그를 입력해 주세요.');
      return;
    }

    setIsResolvingLink(true);
    setLinkError(null);

    try {
      let foundCard: StoredCard | null = null;

      // 1. Support direct portable JSON envelope paste
      if (trimmed.startsWith('{')) {
        try {
          foundCard = CardSerializer.fromJsonEnvelope(trimmed);
        } catch {
          foundCard = null;
        }
      }

      // 2. Check custom domain if a non-platform URL was pasted
      let customDomainQuery: string | null = null;
      if (!foundCard && /^https?:\/\//i.test(trimmed)) {
        try {
          const parsedUrl = new URL(trimmed);
          if (!isPlatformHost(parsedUrl.hostname)) {
            customDomainQuery = normalizeDomain(parsedUrl.hostname);
          }
        } catch {
          // Ignore malformed URL
        }
      }

      const parsedSlug = !foundCard ? parseSlugFromInput(trimmed) : null;

      // 3. Query backend /api/resolve or /api/cards first for live shared cards
      if (!foundCard && customDomainQuery) {
        try {
          const res = await fetch(`/api/resolve?domain=${encodeURIComponent(customDomainQuery)}`);
          if (res.ok) {
            const payload = await res.json();
            if (payload?.card) foundCard = payload.card as StoredCard;
          }
        } catch {
          // Fallback to local lookup
        }
      }

      if (!foundCard && parsedSlug) {
        try {
          const res = await fetch(`/api/cards?slug=${encodeURIComponent(parsedSlug)}`);
          if (res.ok) {
            const payload = await res.json();
            if (payload?.card) foundCard = payload.card as StoredCard;
          }
        } catch {
          // Fallback to local lookup
        }
      }

      // 4. Fallback to sample cards and locally stored public cards
      if (!foundCard) {
        const localPool = [...SAMPLE_CARDS, ...loadUserCards()];
        if (customDomainQuery) {
          foundCard =
            localPool.find(
              (c) => c.customDomain && normalizeDomain(c.customDomain) === customDomainQuery
            ) || null;
        }
        if (!foundCard && parsedSlug) {
          foundCard =
            localPool.find(
              (c) =>
                (c.slug && c.slug.toLowerCase() === parsedSlug) ||
                c.id.toLowerCase() === parsedSlug
            ) || null;
        }
      }

      if (foundCard) {
        const sanitized = sanitizeCardForVault(foundCard);
        setResolvedLinkCard(sanitized);
        if (sanitized.category) {
          setCategory(sanitized.category);
        }
      } else {
        setResolvedLinkCard(null);
        setLinkError('해당 공유 링크의 명함을 찾을 수 없습니다. 주소를 다시 확인해 주세요.');
      }
    } finally {
      setIsResolvingLink(false);
    }
  };

  const processImageToCardRatio = async (file: File, slot: 'front' | 'back') => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      const result = await cropAndCompressCardImage(file, {
        targetWidth: 1080,
        targetHeight: 600,
        quality: 0.88,
        format: 'image/webp',
      });
      if (slot === 'front') {
        setFrontPhoto(result.dataUrl);
        resetOcrStates();
      } else {
        setBackPhoto(result.dataUrl);
      }
    } catch (err) {
      console.error('Photo archiving error:', err);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const applyOcrResult = (parsed: ParsedCardFields, mode: 'fill_empty' | 'overwrite') => {
    let applied = 0;
    const canSet = (cur: string, next: string) =>
      Boolean(next.trim()) && (mode === 'overwrite' || cur.trim().length === 0);

    if (canSet(name, parsed.name)) {
      setName(parsed.name);
      applied += 1;
    }
    if (canSet(nameEn, parsed.nameEn)) {
      setNameEn(parsed.nameEn);
    }
    if (canSet(phone, parsed.phone)) {
      setPhone(parsed.phone);
      applied += 1;
    }
    if (canSet(companyAndNote, parsed.company)) {
      setCompanyAndNote(parsed.company);
      applied += 1;
    }
    if (canSet(jobTitle, parsed.title)) {
      setJobTitle(parsed.title);
      applied += 1;
    }
    if (canSet(email, parsed.email)) {
      setEmail(parsed.email);
      applied += 1;
    }
    if (canSet(website, parsed.website)) {
      setWebsite(parsed.website);
      applied += 1;
    }
    if (canSet(address, parsed.address)) {
      setAddress(parsed.address);
      applied += 1;
    }

    if (parsed.extraNotes.length > 0) {
      const currentMemo = extraMemo.trim();
      const additions = parsed.extraNotes.filter((line) => !currentMemo.includes(line));
      if (additions.length > 0) {
        setExtraMemo(currentMemo ? `${currentMemo} / ${additions.join(' / ')}` : additions.join(' / '));
        applied += 1;
      }
    }

    setPendingOcrParsed(null);
    setOcrConflicts([]);
    setOcrMessage(
      applied > 0
        ? `${applied}개 항목이 자동 입력되었습니다. 저장 전 내용을 확인해 주세요.`
        : '새로 채울 항목이 없어 기존 입력값을 유지했습니다.'
    );
  };

  const handleRunLocalOcr = async () => {
    if (!frontPhoto || isExtractingOcr || isProcessing) return;
    setIsExtractingOcr(true);
    setOcrProgress(2);
    setOcrMessage('');
    setOcrError('');
    setPendingOcrParsed(null);
    setOcrConflicts([]);

    try {
      const { runLocalCardOcr } = await import('../utils/localOcr');
      const { text, engine } = await runLocalCardOcr(frontPhoto, ({ progress }) => {
        setOcrProgress(progress);
      });
      setRawOcrText(text);

      if (!text.trim()) {
        setOcrError(
          '이미지에서 글자를 인식하지 못했습니다. 조명이 밝고 글자가 선명한 정면 사진으로 다시 시도해 주세요.'
        );
        return;
      }

      const parsed = parseBusinessCardText(text);
      if (engine === 'text-detector') {
        setOcrProgress(100);
      }
      const hasAnyField = Boolean(
        parsed.name ||
          parsed.nameEn ||
          parsed.phone ||
          parsed.company ||
          parsed.title ||
          parsed.email ||
          parsed.website ||
          parsed.extraNotes.length > 0
      );

      if (!hasAnyField) {
        setOcrError(
          '텍스트는 감지되었으나 연락처 항목을 찾지 못했습니다. 아래 원문 보기를 참고해 직접 입력해 주세요.'
        );
        setShowRawOcrText(true);
        return;
      }

      const conflicts: string[] = [];
      const checkConflict = (label: string, cur: string, ext: string) => {
        if (cur.trim() && ext.trim() && cur.trim().toLowerCase() !== ext.trim().toLowerCase()) {
          conflicts.push(label);
        }
      };
      checkConflict('성명', name, parsed.name);
      checkConflict('연락처', phone, parsed.phone);
      checkConflict('소속', companyAndNote, parsed.company);
      checkConflict('직함', jobTitle, parsed.title);
      checkConflict('이메일', email, parsed.email);
      checkConflict('웹사이트', website, parsed.website);
      checkConflict('주소', address, parsed.address);

      if (conflicts.length > 0) {
        setOcrConflicts(conflicts);
        setPendingOcrParsed(parsed);
      } else {
        applyOcrResult(parsed, 'fill_empty');
      }
    } catch (err) {
      console.error('Local OCR error:', err);
      setOcrError(
        '로컬 OCR 분석 중 문제가 발생했습니다. 최초 실행 시 언어 데이터 로드를 위해 네트워크 연결이 필요할 수 있습니다.'
      );
    } finally {
      setIsExtractingOcr(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so re-capturing or re-selecting the same photo always fires onChange
    e.target.value = '';
    if (!file || isProcessing || processingRef.current) return;
    void processImageToCardRatio(file, activeSlotRef.current);
  };

  const triggerUpload = (slot: 'front' | 'back', useCamera = false) => {
    if (isProcessing || processingRef.current) return;
    activeSlotRef.current = slot;
    setActiveSlot(slot);
    if (useCamera && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSave = () => {
    if (isProcessing || processingRef.current || isResolvingLink || !onSaveCard) return;

    if (registerMode === 'link') {
      if (!resolvedLinkCard) return;
      const vaultCard = sanitizeCardForVault(resolvedLinkCard, {
        category,
        notes: linkNote.trim() || resolvedLinkCard.notes || '공유 링크로 등록됨',
      });
      onSaveCard(vaultCard);
      resetModalInputs();
      onClose();
      return;
    }

    if (!name.trim() || !phone.trim()) return;

    const cleanName = name.trim();
    const cleanNameEn = nameEn.trim();
    const cleanOrg = companyAndNote.trim();
    const cleanTitle = jobTitle.trim();
    const cleanEmail = email.trim();
    const cleanWebsite = sanitizeExternalUrl(website) || website.trim();
    const cleanAddress = address.trim();
    const cleanWebsiteDisplay = cleanWebsite
      ? cleanWebsite.replace(/^https?:\/\//i, '').replace(/\/$/, '')
      : '';
    const cleanNotes = [extraMemo.trim(), !extraMemo.trim() ? cleanOrg : '']
      .filter(Boolean)
      .join(' / ');
    const rawPhone = phone.replace(/[^0-9+]/g, '');
    const id = `photo-card-${Date.now()}`;
    const now = new Date().toISOString().split('T')[0];

    const newCard: StoredCard = sanitizeCardForVault({
      id,
      isMyCard: false,
      isPhotoCard: Boolean(frontPhoto),
      creation_mode: 'photo',
      category,
      theme: 'sumi_ink',
      layout_type: 'editorial_minimal',
      card_features: {
        show_en_name: Boolean(cleanNameEn),
        show_sub_org: Boolean(cleanOrg),
        show_address: Boolean(cleanAddress),
        monogram_text: '',
      },
      createdAt: now,
      notes: cleanNotes || '실물 명함 보관',
      scannedImage: frontPhoto || undefined,
      scannedImageBack: backPhoto || undefined,
      front_image_url: frontPhoto || undefined,
      back_image_url: backPhoto || undefined,
      details: {
        en_name: cleanNameEn,
        sub_org: '',
        address: cleanAddress,
        address_en: '',
        slogan: '',
        show_address: Boolean(cleanAddress),
        show_en_name: Boolean(cleanNameEn),
      },
      data: {
        name: cleanName,
        nameEn: cleanNameEn,
        nameKr: '',
        title: '',
        titleKr: cleanTitle,
        organization: '',
        organizationKr: cleanOrg,
        subOrg: '',
        phone: phone.trim(),
        phoneRaw: rawPhone,
        whatsappUrl: rawPhone ? `https://wa.me/${rawPhone.replace(/^\+/, '')}` : '',
        email: cleanEmail,
        website: cleanWebsite,
        websiteDisplay: cleanWebsiteDisplay,
        addressLines: cleanAddress ? [cleanAddress] : [],
        addressKr: cleanAddress,
        address_en: '',
        details: {
          en_name: cleanNameEn,
          sub_org: '',
          address: cleanAddress,
          address_en: '',
          slogan: '',
          show_address: Boolean(cleanAddress),
          show_en_name: Boolean(cleanNameEn),
        },
        googleMapsUrl: '',
        naverMapsUrl: '',
      },
    });

    onSaveCard(newCard);
    resetModalInputs();
    onClose();
  };

  const renderCategorySelector = (disabled = false) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--app-text-muted)]">카테고리</span>
        {!isAddingCategory && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setCategoryError(null);
              setIsAddingCategory(true);
            }}
            className="text-[11px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3 h-3 stroke-[1.75]" />
            <span>새 카테고리</span>
          </button>
        )}
      </div>

      {isAddingCategory && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              maxLength={20}
              autoFocus
              value={newCategoryInput}
              onChange={(e) => {
                setNewCategoryInput(e.target.value);
                if (categoryError) setCategoryError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAddCategory();
                } else if (e.key === 'Escape') {
                  setIsAddingCategory(false);
                  setCategoryError(null);
                }
              }}
              placeholder="새 카테고리 이름"
              className="flex-1 min-w-0 h-8 px-3 rounded-lg bg-[var(--app-surface-subtle)] border border-[var(--app-border)] focus:border-[var(--app-accent)] focus:outline-none text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]/70"
            />
            <button
              type="button"
              onClick={handleQuickAddCategory}
              disabled={!newCategoryInput.trim()}
              className="h-8 px-3 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold text-[11px] disabled:opacity-40 cursor-pointer shrink-0"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingCategory(false);
                setCategoryError(null);
                setNewCategoryInput('');
              }}
              className="h-8 px-2.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] text-[11px] cursor-pointer shrink-0"
            >
              취소
            </button>
          </div>
          {categoryError && (
            <p className="text-[11px] text-amber-600 dark:text-amber-300">{categoryError}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-hide py-0.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            disabled={disabled}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-[11px] disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              category === cat
                ? 'bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] font-semibold shadow-sm'
                : 'bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] border border-[var(--app-border)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[var(--app-overlay)] backdrop-blur-xl animate-in fade-in duration-200"
      onClick={handleSafeClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="명함 추가"
        aria-busy={isProcessing}
        className="relative w-full max-w-xl sm:max-w-2xl min-h-[580px] sm:min-h-[620px] max-h-[90dvh] flex flex-col rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-[var(--app-shadow)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay: blocks duplicate touches while cropAndCompressCardImage runs */}
        {isProcessing && (
          <div
            role="status"
            aria-live="assertive"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute inset-0 z-50 bg-[var(--app-overlay)] backdrop-blur-sm flex flex-col items-center justify-center gap-3 px-6 text-center select-none touch-none cursor-wait animate-in fade-in duration-150"
          >
            <Loader2 className="w-6 h-6 text-[var(--app-accent)] animate-spin stroke-[1.5]" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--app-text)] tracking-wide">
                {activeSlot === 'front' ? '앞면' : '뒷면'} 사진을 정리하고 있습니다
              </p>
              <p className="text-[11px] text-[var(--app-text-muted)]">잠시만 기다려 주세요</p>
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          disabled={isProcessing}
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          disabled={isProcessing}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Minimalist Modal Header */}
        <div className="px-6 sm:px-7 pt-5 pb-4 border-b border-[var(--app-border)] space-y-4 shrink-0 bg-[var(--app-bg)]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--app-text)] tracking-tight">
              명함 추가
            </h3>
            <button
              type="button"
              onClick={handleSafeClose}
              disabled={isProcessing || isResolvingLink}
              className="min-w-[36px] min-h-[36px] -mr-1.5 flex items-center justify-center rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              title="닫기"
              aria-label="닫기"
            >
              <X className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* Registration Source Mode Switcher */}
          <div className="inline-flex items-center gap-1 p-1 bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-xl text-xs whitespace-nowrap">
            <button
              type="button"
              onClick={() => setRegisterMode('photo')}
              title="실물 사진 스캔"
              aria-label="실물 사진 스캔"
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                registerMode === 'photo'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              <Camera className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[1.75]" />
              <span className="hidden sm:inline">실물 사진 스캔</span>
            </button>
            <button
              type="button"
              onClick={() => setRegisterMode('link')}
              title="공유 링크 등록"
              aria-label="공유 링크 등록"
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                registerMode === 'link'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              <Link2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[1.75]" />
              <span className="hidden sm:inline">공유 링크 등록</span>
            </button>
            <button
              type="button"
              onClick={() => setRegisterMode('contacts')}
              title="연락처에서 가져오기"
              aria-label="연락처에서 가져오기"
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                registerMode === 'contacts'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              <UserPlus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[1.75]" />
              <span className="hidden sm:inline">연락처에서 가져오기</span>
            </button>
          </div>
        </div>

        {/* Whitespace-Driven Modal Body */}
        {registerMode === 'contacts' ? (
          <div className="flex-1 flex flex-col min-h-[480px] overflow-hidden">
            <ImportContactsModal
              isOpen={true}
              embedded={true}
              onClose={handleSafeClose}
              existingCards={existingCards}
              onImportCards={(importedCards) => {
                if (onImportCards) {
                  onImportCards(importedCards);
                } else {
                  importedCards.forEach((c) => onSaveCard?.(c));
                }
                handleSafeClose();
              }}
              categories={categories}
              showToast={showToast}
            />
          </div>
        ) : (
          <div className="px-6 sm:px-7 py-6 overflow-y-auto flex-1 space-y-7 text-xs min-h-[460px]">
            {registerMode === 'photo' ? (
            <>
              {/* 1. Physical Card Photo Slots */}
              <section className="space-y-3">
                <h4 className="text-xs font-medium text-[var(--app-text)] tracking-wide">
                  실물 사진
                </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Front Slot */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--app-text-muted)]">
                  <span>앞면</span>
                  {frontPhoto && (
                    <button
                      type="button"
                      disabled={isProcessing || isExtractingOcr}
                      onClick={() => {
                        setFrontPhoto(null);
                        resetOcrStates();
                      }}
                      className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] disabled:opacity-40 disabled:pointer-events-none text-[11px] cursor-pointer"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div
                  className={`relative aspect-[9/5] w-full rounded-2xl overflow-hidden flex flex-col items-center justify-center group ${
                    frontPhoto
                      ? 'border border-[var(--app-border)] bg-[var(--app-bg)]'
                      : 'border border-dashed border-[var(--app-border)] hover:border-[var(--app-accent)] bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  {frontPhoto ? (
                    <div className="relative w-full h-full">
                      <img
                        src={frontPhoto}
                        alt="명함 앞면"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => triggerUpload('front')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 disabled:pointer-events-none transition-opacity flex items-center justify-center gap-1.5 text-white font-medium cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>변경</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => triggerUpload('front', true)}
                        className="px-3.5 py-2 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-[var(--app-accent-fg)] flex items-center gap-1.5 cursor-pointer font-medium whitespace-nowrap"
                      >
                        <Camera className="w-3.5 h-3.5 stroke-[1.75]" />
                        <span>촬영</span>
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => triggerUpload('front', false)}
                        className="px-3.5 py-2 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] disabled:opacity-40 disabled:pointer-events-none text-[var(--app-text)] border border-[var(--app-border)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>앨범</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Back Slot */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--app-text-muted)]">
                  <span>뒷면</span>
                  {backPhoto && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setBackPhoto(null)}
                      className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] disabled:opacity-40 disabled:pointer-events-none text-[11px] cursor-pointer"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div
                  className={`relative aspect-[9/5] w-full rounded-2xl overflow-hidden flex flex-col items-center justify-center group ${
                    backPhoto
                      ? 'border border-[var(--app-border)] bg-[var(--app-bg)]'
                      : 'border border-dashed border-[var(--app-border)] hover:border-[var(--app-accent)] bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  {backPhoto ? (
                    <div className="relative w-full h-full">
                      <img
                        src={backPhoto}
                        alt="명함 뒷면"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => triggerUpload('back')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 disabled:pointer-events-none transition-opacity flex items-center justify-center gap-1.5 text-white font-medium cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>변경</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => triggerUpload('back', true)}
                        className="px-3.5 py-2 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-[var(--app-accent-fg)] flex items-center gap-1.5 cursor-pointer font-medium whitespace-nowrap"
                      >
                        <Camera className="w-3.5 h-3.5 stroke-[1.75]" />
                        <span>촬영</span>
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => triggerUpload('back', false)}
                        className="px-3.5 py-2 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] disabled:opacity-40 disabled:pointer-events-none text-[var(--app-text)] border border-[var(--app-border)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>앨범</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {frontPhoto && (
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleRunLocalOcr}
                  disabled={isExtractingOcr || isProcessing}
                  title="Auto-Fill Text from Image"
                  aria-label="이미지에서 텍스트 자동 채우기 (Auto-Fill Text from Image)"
                  className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                    isExtractingOcr
                      ? 'bg-[var(--app-surface-subtle)] border-[var(--app-border)] text-[var(--app-text-muted)] cursor-wait'
                      : 'bg-[var(--app-surface-subtle)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border-[var(--app-border)] text-[var(--app-text)] cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  {isExtractingOcr ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span className="tabular-nums">명함 텍스트 로컬 분석 중... {ocrProgress}%</span>
                    </>
                  ) : (
                    <>
                      <ScanText className="w-3.5 h-3.5 shrink-0 stroke-[1.6]" />
                      <span>이미지에서 텍스트 자동 채우기</span>
                    </>
                  )}
                </button>

                {isExtractingOcr ? (
                  <div className="space-y-1.5 px-1">
                    <div className="h-1 w-full rounded-full bg-[var(--app-surface-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--app-accent)] transition-all duration-200 ease-out"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[var(--app-text-muted)] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>이미지는 외부 서버로 전송되지 않고 브라우저 내에서만 분석됩니다.</span>
                    </p>
                  </div>
                ) : (
                  !ocrMessage &&
                  !ocrError &&
                  !pendingOcrParsed && (
                    <p className="text-[11px] text-[var(--app-text-muted)] flex items-center gap-1.5 px-0.5">
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                      <span>브라우저 내장 인식 우선 · 미지원 시 온디바이스 OCR 자동 로드</span>
                    </p>
                  )
                )}

                {pendingOcrParsed && !isExtractingOcr && (
                  <div className="rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-3.5 space-y-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[var(--app-text)]">
                        기존 입력과 겹치는 항목이 있습니다 ({ocrConflicts.join(', ')})
                      </p>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                        추출된 텍스트를 비어 있는 항목에만 채우거나, 기존 입력값을 덮어쓸 수 있습니다.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applyOcrResult(pendingOcrParsed, 'fill_empty')}
                        className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-medium whitespace-nowrap cursor-pointer transition-opacity"
                      >
                        비어 있는 항목만 채우기
                      </button>
                      <button
                        type="button"
                        onClick={() => applyOcrResult(pendingOcrParsed, 'overwrite')}
                        className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                      >
                        기존 입력 덮어쓰기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingOcrParsed(null);
                          setOcrConflicts([]);
                        }}
                        className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] text-xs whitespace-nowrap cursor-pointer"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {ocrMessage && !isExtractingOcr && (
                  <div className="rounded-xl bg-[var(--app-surface-subtle)] border border-emerald-500/30 px-3 py-2.5 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-300 flex items-start gap-1.5 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{ocrMessage}</span>
                      </p>
                      {rawOcrText && (
                        <button
                          type="button"
                          onClick={() => setShowRawOcrText((prev) => !prev)}
                          className="text-[11px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-0.5 shrink-0 whitespace-nowrap cursor-pointer"
                        >
                          <span>원문</span>
                          {showRawOcrText ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    {showRawOcrText && rawOcrText && (
                      <pre className="p-2 rounded-lg bg-[var(--app-bg)] border border-[var(--app-border)] text-[11px] text-[var(--app-text-muted)] font-mono whitespace-pre-wrap break-words max-h-28 overflow-y-auto">
                        {rawOcrText}
                      </pre>
                    )}
                  </div>
                )}

                {ocrError && !isExtractingOcr && (
                  <div className="rounded-xl bg-[var(--app-surface-subtle)] border border-amber-500/35 px-3 py-2.5 space-y-2 animate-in fade-in duration-150">
                    <p className="text-[11px] text-amber-600 dark:text-amber-300 leading-relaxed">{ocrError}</p>
                    {rawOcrText && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowRawOcrText((prev) => !prev)}
                          className="text-[11px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          <span>인식된 원문 {showRawOcrText ? '숨기기' : '보기'}</span>
                          {showRawOcrText ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        {showRawOcrText && (
                          <pre className="p-2 rounded-lg bg-[var(--app-bg)] border border-[var(--app-border)] text-[11px] text-[var(--app-text-muted)] font-mono whitespace-pre-wrap break-words max-h-28 overflow-y-auto">
                            {rawOcrText}
                          </pre>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2. Essential Contact Inputs (Separated by Hairline & Whitespace) */}
          <section className="pt-6 border-t border-[var(--app-border)] space-y-4">
            <h4 className="text-xs font-medium text-[var(--app-text)] tracking-wide">
              기본 정보
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--app-text)] font-medium">성명</span>
                  <span className="text-[10px] text-[var(--app-accent)] font-medium">필수</span>
                </label>
                <input
                  type="text"
                  value={name}
                  disabled={isProcessing}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="성명"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--app-text)] font-medium">연락처</span>
                  <span className="text-[10px] text-[var(--app-accent)] font-medium">필수</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  disabled={isProcessing}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="연락처"
                  className={`${INPUT_CLASS} font-mono tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--app-text-muted)] font-normal">소속</span>
                  <span className="text-[10px] text-[var(--app-text-muted)] opacity-75">선택</span>
                </label>
                <input
                  type="text"
                  value={companyAndNote}
                  disabled={isProcessing}
                  onChange={(e) => setCompanyAndNote(e.target.value)}
                  placeholder="회사 또는 소속"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--app-text-muted)] font-normal">직함</span>
                  <span className="text-[10px] text-[var(--app-text-muted)] opacity-75">선택</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  disabled={isProcessing}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="직책 또는 역할"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--app-text-muted)] font-normal">이메일</span>
                  <span className="text-[10px] text-[var(--app-text-muted)] opacity-75">선택</span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={isProcessing}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--app-text-muted)] font-normal">웹사이트</span>
                  <span className="text-[10px] text-[var(--app-text-muted)] opacity-75">선택</span>
                </label>
                <input
                  type="url"
                  value={website}
                  disabled={isProcessing}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className={`${INPUT_CLASS} font-mono`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--app-text-muted)] font-normal">주소</span>
                  <span className="text-[10px] text-[var(--app-text-muted)] opacity-75">선택</span>
                </label>
                <input
                  type="text"
                  value={address}
                  disabled={isProcessing}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="회사 또는 사무실 주소"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--app-text-muted)] font-normal">보관 메모 (유선/팩스 등)</span>
                  <span className="text-[10px] text-[var(--app-text-muted)] opacity-75">선택</span>
                </label>
                <input
                  type="text"
                  value={extraMemo}
                  disabled={isProcessing}
                  onChange={(e) => setExtraMemo(e.target.value)}
                  placeholder="미팅 일시 또는 보조 연락처"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* Category Selector */}
            <div className="pt-2">
              {renderCategorySelector(isProcessing)}
            </div>
          </section>
            </>
          ) : (
            /* SHARED LINK REGISTRATION VIEW */
            <div className="space-y-6 animate-in fade-in duration-150">
              <section className="space-y-2.5">
                <label className="text-xs font-medium text-[var(--app-text)] block">
                  전달받은 디지털 명함 주소 또는 슬러그
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={linkInput}
                    disabled={isResolvingLink}
                    onChange={(e) => {
                      setLinkInput(e.target.value);
                      if (linkError) setLinkError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleResolveSharedLink();
                      }
                    }}
                    placeholder="https://eerum.goguma.app/card/elena 또는 슬러그 입력"
                    className={`${INPUT_CLASS} font-mono`}
                  />
                  <button
                    type="button"
                    disabled={isResolvingLink || !linkInput.trim()}
                    onClick={() => void handleResolveSharedLink()}
                    className="px-4 py-2.5 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-[var(--app-accent-fg)] font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isResolvingLink ? '조회 중...' : '불러오기'}
                  </button>
                </div>
                {linkError && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-300 pt-0.5">{linkError}</p>
                )}
              </section>

              {!resolvedLinkCard && (
                <div className="p-5 rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] space-y-3">
                  <div className="flex items-center gap-2.5 text-[var(--app-text)]">
                    <div className="w-8 h-8 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-text)] shrink-0">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--app-text)]">공유 링크를 통한 빠른 등록</p>
                      <p className="text-[11px] text-[var(--app-text-muted)]">상대방이 공유한 웹 명함 주소 또는 고유 슬러그를 입력하세요</p>
                    </div>
                  </div>
                  <ul className="text-[11px] text-[var(--app-text-muted)] space-y-1.5 pl-2 border-l border-[var(--app-border)]">
                    <li>• 전체 웹 주소 (예: https://eerum.goguma.app/card/minsu)</li>
                    <li>• 공유 슬러그만 입력 (예: minsu)</li>
                    <li>• 불러오기 완료 후 보관 메모와 카테고리를 지정할 수 있습니다</li>
                  </ul>
                </div>
              )}

              {resolvedLinkCard && (
                <section className="pt-5 border-t border-[var(--app-border)] space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--app-text)]">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>명함 정보를 확인했습니다</span>
                    </span>
                    <span className="text-[11px] text-[var(--app-text-muted)] truncate max-w-[200px]">
                      {resolvedLinkCard.data.name}
                    </span>
                  </div>

                  <div className="rounded-2xl overflow-hidden ring-1 ring-[var(--app-border)] shadow-[var(--app-shadow)] max-w-md mx-auto">
                    <BusinessCardFront
                      data={resolvedLinkCard.data}
                      theme={resolvedLinkCard.theme}
                      layout_type={resolvedLinkCard.layout_type}
                      card_features={resolvedLinkCard.card_features}
                      isPrintPreview={false}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--app-text)] font-medium">보관 메모</span>
                      <span className="text-[10px] text-[var(--app-text-muted)]">선택</span>
                    </label>
                    <input
                      type="text"
                      value={linkNote}
                      onChange={(e) => setLinkNote(e.target.value)}
                      placeholder="미팅 일시 또는 메모"
                      className={INPUT_CLASS}
                    />
                  </div>

                  {renderCategorySelector(false)}
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* Minimalist Pure-Text Modal Footer */}
      {registerMode !== 'contacts' && (
        <div className="px-6 sm:px-7 py-4 border-t border-[var(--app-border)] flex items-center justify-between shrink-0 bg-[var(--app-bg)]">
          <button
            type="button"
            disabled={isProcessing || isResolvingLink}
            onClick={handleSafeClose}
            className="min-h-[40px] px-4 py-2 rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-xs font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={
              registerMode === 'photo'
                ? !name.trim() || !phone.trim() || isProcessing
                : !resolvedLinkCard || isResolvingLink
            }
            className="min-h-[40px] px-6 py-2.5 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-35 disabled:pointer-events-none text-[var(--app-accent-fg)] font-semibold text-xs tracking-wide cursor-pointer whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            보관함에 저장
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

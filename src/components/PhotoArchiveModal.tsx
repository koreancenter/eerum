import React, { useState, useRef } from 'react';
import { StoredCard, CardCategory } from '../types/card';
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  Download,
  Loader2,
} from 'lucide-react';
import { BusinessCardFront } from './BusinessCardFront';
import { cropAndCompressCardImage } from '../utils/imageProcess';

export interface PhotoArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: StoredCard | null;
  onSaveCard?: (newCard: StoredCard) => void;
}

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/25 focus:bg-white/[0.05] focus:outline-none disabled:opacity-50 text-white placeholder:text-zinc-400 text-xs';

export const PhotoArchiveModal: React.FC<PhotoArchiveModalProps> = ({
  isOpen,
  onClose,
  card,
  onSaveCard,
}) => {
  // If card is provided and onSaveCard is not, we are in Viewer mode
  const isViewerMode = Boolean(card && !onSaveCard);

  // Viewer State
  const [viewTab, setViewTab] = useState<'photo' | 'digital' | 'compare'>('photo');

  // Archive Capture State
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<'front' | 'back'>('front');

  // Essential Quick Input State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyAndNote, setCompanyAndNote] = useState('');
  const [category, setCategory] = useState<string>('VIP 파트너');
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<'front' | 'back'>('front');
  const processingRef = useRef(false);

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
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="실물 명함 아카이브"
          className="relative w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-3xl bg-[#111113] border border-white/10 text-neutral-100 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
                {card.data.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
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
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white text-xs font-medium cursor-pointer"
                  title="실물 사진 저장"
                >
                  <Download className="w-3.5 h-3.5 stroke-[1.5]" />
                  <span className="hidden sm:inline">사진 저장</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                title="닫기"
                aria-label="닫기"
              >
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>
          </div>

          {/* View Mode Bar */}
          <div className="px-5 sm:px-7 py-3 border-b border-white/[0.08] text-xs shrink-0">
            <div className="inline-flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl">
              <button
                type="button"
                onClick={() => setViewTab('photo')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0 ${
                  viewTab === 'photo'
                    ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white font-medium'
                }`}
              >
                실물 사진
              </button>
              <button
                type="button"
                onClick={() => setViewTab('compare')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0 ${
                  viewTab === 'compare'
                    ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white font-medium'
                }`}
              >
                실물 · 디지털 비교
              </button>
              <button
                type="button"
                onClick={() => setViewTab('digital')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0 ${
                  viewTab === 'digital'
                    ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white font-medium'
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
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 aspect-[9/5] w-full flex items-center justify-center">
                  {card.scannedImage ? (
                    <img
                      src={card.scannedImage}
                      alt="보관된 실물 명함 앞면"
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="text-center p-6 text-zinc-400 text-xs">
                      실물 사진이 등록되지 않았습니다.
                    </div>
                  )}
                </div>
                {card.scannedImageBack && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 aspect-[9/5] w-full flex items-center justify-center">
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
                  <span className="text-xs text-zinc-400 block text-center">
                    실물 촬영본
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-black/50 aspect-[9/5] w-full flex items-center justify-center">
                    {card.scannedImage ? (
                      <img
                        src={card.scannedImage}
                        alt="실물 명함"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-zinc-400">실물 사진 없음</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-xs text-zinc-300 block text-center">
                    디지털 명함
                  </span>
                  <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-xl w-full">
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
                <div className="rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl">
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
  const handleSafeClose = () => {
    if (isProcessing || processingRef.current) return;
    onClose();
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
    if (isProcessing || processingRef.current) return;
    if (!name.trim() || !phone.trim() || !onSaveCard) return;

    const cleanName = name.trim();
    const cleanOrg = companyAndNote.trim();
    const rawPhone = phone.replace(/[^0-9+]/g, '');
    const id = `photo-card-${Date.now()}`;
    const now = new Date().toISOString().split('T')[0];

    const newCard: StoredCard = {
      id,
      isMyCard: false,
      isPhotoCard: Boolean(frontPhoto),
      creation_mode: 'photo',
      category,
      theme: 'sumi_ink',
      layout_type: 'editorial_minimal',
      card_features: {
        show_en_name: false,
        show_sub_org: Boolean(cleanOrg),
        show_address: false,
        monogram_text: '',
      },
      createdAt: now,
      notes: cleanOrg || '실물 명함 보관',
      scannedImage: frontPhoto || undefined,
      scannedImageBack: backPhoto || undefined,
      front_image_url: frontPhoto || undefined,
      back_image_url: backPhoto || undefined,
      details: {
        en_name: '',
        sub_org: '',
        address: '',
        address_en: '',
        slogan: '',
        show_address: false,
        show_en_name: false,
      },
      data: {
        name: cleanName,
        nameEn: '',
        nameKr: '',
        title: '',
        titleKr: '',
        organization: '',
        organizationKr: cleanOrg,
        subOrg: '',
        phone: phone.trim(),
        phoneRaw: rawPhone,
        whatsappUrl: rawPhone ? `https://wa.me/${rawPhone.replace(/^\+/, '')}` : '',
        email: '',
        website: '',
        websiteDisplay: '',
        addressLines: [],
        addressKr: '',
        address_en: '',
        details: {
          en_name: '',
          sub_org: '',
          address: '',
          address_en: '',
          slogan: '',
          show_address: false,
          show_en_name: false,
        },
        googleMapsUrl: '',
        naverMapsUrl: '',
      },
    };

    onSaveCard(newCard);
    setFrontPhoto(null);
    setBackPhoto(null);
    setName('');
    setPhone('');
    setCompanyAndNote('');
    setCategory('VIP 파트너');
    onClose();
  };

  const categories: CardCategory[] = [
    'VIP 파트너',
    '글로벌 네트워크',
    '공공·기관',
    '투자·금융',
    'IT·기술',
    '기타',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={handleSafeClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="실물 명함 등록"
        aria-busy={isProcessing}
        className="relative w-full max-w-xl max-h-[90dvh] flex flex-col rounded-3xl bg-[#111113] border border-white/10 text-neutral-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay: blocks duplicate touches while cropAndCompressCardImage runs */}
        {isProcessing && (
          <div
            role="status"
            aria-live="assertive"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 px-6 text-center select-none touch-none cursor-wait animate-in fade-in duration-150"
          >
            <Loader2 className="w-6 h-6 text-white animate-spin stroke-[1.5]" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-white tracking-wide">
                {activeSlot === 'front' ? '앞면' : '뒷면'} 사진을 정리하고 있습니다
              </p>
              <p className="text-[11px] text-zinc-400">잠시만 기다려 주세요</p>
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
        <div className="px-6 sm:px-7 py-5 border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-white tracking-tight">
            실물 명함 등록
          </h3>
          <button
            type="button"
            onClick={handleSafeClose}
            disabled={isProcessing}
            className="min-w-[36px] min-h-[36px] -mr-1.5 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Whitespace-Driven Modal Body (Zero Nested Card Boxes) */}
        <div className="px-6 sm:px-7 py-6 overflow-y-auto flex-1 space-y-7 text-xs">
          {/* 1. Physical Card Photo Slots */}
          <section className="space-y-3">
            <h4 className="text-xs font-medium text-zinc-300 tracking-wide">
              실물 사진
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Front Slot */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>앞면</span>
                  {frontPhoto && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setFrontPhoto(null)}
                      className="text-zinc-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none text-[11px] cursor-pointer"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div
                  className={`relative aspect-[9/5] w-full rounded-2xl overflow-hidden flex flex-col items-center justify-center group ${
                    frontPhoto
                      ? 'border border-white/10 bg-[#0A0A0B]'
                      : 'border border-dashed border-white/[0.12] hover:border-white/25 bg-white/[0.02]'
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
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:pointer-events-none text-neutral-950 flex items-center gap-1.5 cursor-pointer font-medium whitespace-nowrap"
                      >
                        <Camera className="w-3.5 h-3.5 stroke-[1.75]" />
                        <span>촬영</span>
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => triggerUpload('front', false)}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 border border-white/10 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>뒷면</span>
                  {backPhoto && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setBackPhoto(null)}
                      className="text-zinc-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none text-[11px] cursor-pointer"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div
                  className={`relative aspect-[9/5] w-full rounded-2xl overflow-hidden flex flex-col items-center justify-center group ${
                    backPhoto
                      ? 'border border-white/10 bg-[#0A0A0B]'
                      : 'border border-dashed border-white/[0.12] hover:border-white/25 bg-white/[0.02]'
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
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:pointer-events-none text-neutral-950 flex items-center gap-1.5 cursor-pointer font-medium whitespace-nowrap"
                      >
                        <Camera className="w-3.5 h-3.5 stroke-[1.75]" />
                        <span>촬영</span>
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => triggerUpload('back', false)}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 border border-white/10 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>앨범</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 2. Essential Contact Inputs (Separated by Hairline & Whitespace) */}
          <section className="pt-6 border-t border-white/[0.07] space-y-4">
            <h4 className="text-xs font-medium text-zinc-300 tracking-wide">
              기본 정보
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-200 font-medium">성명</span>
                  <span className="text-[10px] text-zinc-400">필수</span>
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
                  <span className="text-zinc-200 font-medium">연락처</span>
                  <span className="text-[10px] text-zinc-400">필수</span>
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

            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-normal">소속 및 메모</span>
                <span className="text-[10px] text-zinc-400">선택</span>
              </label>
              <input
                type="text"
                value={companyAndNote}
                disabled={isProcessing}
                onChange={(e) => setCompanyAndNote(e.target.value)}
                placeholder="소속 또는 메모"
                className={INPUT_CLASS}
              />
            </div>

            {/* Category Selector */}
            <div className="pt-2 space-y-2">
              <span className="text-[11px] text-zinc-400 block">카테고리</span>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[11px] disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap shrink-0 ${
                      category === cat
                        ? 'bg-white text-neutral-950 font-semibold'
                        : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Minimalist Pure-Text Modal Footer */}
        <div className="px-6 sm:px-7 py-4 border-t border-white/[0.07] flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSafeClose}
            className="min-h-[40px] px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-xs font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || !phone.trim() || isProcessing}
            className="min-h-[40px] px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-35 disabled:pointer-events-none text-neutral-950 font-semibold text-xs tracking-wide cursor-pointer whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            보관함에 저장
          </button>
        </div>
      </div>
    </div>
  );
};

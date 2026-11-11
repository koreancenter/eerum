import React, { useState, useEffect } from 'react';
import {
  StoredCard,
  CardTheme,
  CardData,
  CardLayoutType,
  CardFeatures,
  CardCreationMode
} from '../types/card';
import { X, RotateCcw } from 'lucide-react';
import { APP_BASE_DOMAIN, normalizeDomain } from '@/utils/cardSerializer';
import { TemplateModeEditor } from './editor/TemplateModeEditor';
import {
  CustomHtmlEditor,
  DEFAULT_LUXURY_HTML_FRONT,
  DEFAULT_LUXURY_HTML_BACK
} from './editor/CustomHtmlEditor';
import { PhotoArchivingEditor } from './editor/PhotoArchivingEditor';
import { EditorPreviewPanel } from './editor/EditorPreviewPanel';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import { loadVaultCategories } from '../utils/categories';

export interface CardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: StoredCard | null;
  editingCard?: StoredCard | null;
  initialData?: StoredCard | CardData | null;
  onSave: (updatedCard: StoredCard) => void;
  onDelete?: (cardId: string) => void;
  isMyCardMode?: boolean;
  isCreating?: boolean;
}

export const THEME_OPTIONS: {
  id: CardTheme;
  name: string;
  description: string;
  dotColor: string;
  accent: string;
}[] = [
  {
    id: 'pure_white',
    name: '샴페인 샌드',
    description: 'Champagne Sand',
    dotColor: '#F5F2EC',
    accent: '#1C1B1A'
  },
  {
    id: 'warm_paper',
    name: '파인 코튼',
    description: 'Warm Cotton',
    dotColor: '#EAE7E0',
    accent: '#1C1C1F'
  },
  {
    id: 'sumi_ink',
    name: '수묵 인크',
    description: 'Sumi Ink',
    dotColor: '#141416',
    accent: '#EAEAE6'
  },
  {
    id: 'obsidian',
    name: '웜 슬레이트',
    description: 'Warm Slate',
    dotColor: '#202024',
    accent: '#D4D4D8'
  }
];

const CREATION_MODES: { id: CardCreationMode; label: string }[] = [
  { id: 'template', label: '디자인 템플릿' },
  { id: 'photo', label: '실물 사진' },
  { id: 'custom_html', label: '커스텀 코드' }
];

/**
 * Tab & Mode Auto-Selection:
 * - If card.creation_mode === 'photo' or card.photo_url exists -> set tab to 'photo' (실물 사진).
 * - If card.creation_mode === 'template' or card.template_id exists -> set tab to 'template' (디자인 템플릿).
 * - If card.creation_mode === 'custom' or 'custom_html' -> set tab to 'custom' (커스텀 코드).
 */
export function resolveCardCreationMode(target?: any): CardCreationMode {
  if (!target) return 'template';

  // 1. Photo mode or photo_url exists
  if (
    target.creation_mode === 'photo' ||
    Boolean(target.photo_url)
  ) {
    return 'photo';
  }

  // 2. Template mode, template_id, or layout_type exists
  if (
    target.creation_mode === 'template' ||
    Boolean(target.template_id) ||
    Boolean(target.layout_type)
  ) {
    return 'template';
  }

  // 3. Custom mode or custom_html exists
  if (
    target.creation_mode === 'custom' ||
    target.creation_mode === 'custom_html' ||
    Boolean(target.html_front)
  ) {
    return 'custom_html';
  }

  // 4. Fallback check for physical photo image presence
  if (target.isPhotoCard || target.front_image_url || target.scannedImage) {
    return 'photo';
  }

  return 'template';
}

function getSafeCard(c?: StoredCard | CardData | null, isMyCard = false): StoredCard {
  if (c && 'data' in c && c.data) {
    return c as StoredCard;
  }
  if (c && ('name' in c || 'organization' in c)) {
    const dataObj = c as CardData;
    return {
      id: `card-${Date.now()}`,
      isMyCard,
      isDefault: false,
      theme: 'pure_white',
      layout_type: 'editorial_minimal',
      category: isMyCard ? '글로벌 네트워크' : 'VIP 파트너',
      createdAt: new Date().toISOString().split('T')[0],
      data: dataObj,
    };
  }
  return {
    id: `card-${Date.now()}`,
    isMyCard,
    isDefault: false,
    theme: 'pure_white',
    layout_type: 'editorial_minimal',
    category: isMyCard ? '글로벌 네트워크' : 'VIP 파트너',
    createdAt: new Date().toISOString().split('T')[0],
    data: {
      name: '',
      nameEn: '',
      nameKr: '',
      organization: '',
      organizationKr: '',
      subOrg: '',
      title: '',
      titleKr: '',
      phone: '',
      phoneRaw: '',
      whatsappUrl: '',
      email: '',
      website: '',
      websiteDisplay: '',
      addressLines: [],
      addressKr: '',
      address_en: '',
      googleMapsUrl: '',
      naverMapsUrl: '',
    },
  };
}

export const CardEditorModal: React.FC<CardEditorModalProps> = ({
  isOpen,
  onClose,
  card,
  editingCard,
  initialData,
  onSave,
  onDelete,
  isMyCardMode = false,
  isCreating = false
}) => {
  const targetCard = editingCard || initialData || card;
  const activeCard = React.useMemo(
    () => getSafeCard(targetCard, isMyCardMode),
    [targetCard, isMyCardMode]
  );

  // Primary Creation Mode: 'template' | 'photo' | 'custom_html' | 'custom'
  const [creationMode, setCreationMode] = useState<CardCreationMode>(() =>
    resolveCardCreationMode(targetCard)
  );

  // Template Mode states
  const [templateSubTab, setTemplateSubTab] = useState<'visual_atelier' | 'identity_profile'>(
    isCreating ? 'identity_profile' : 'visual_atelier'
  );
  const [theme, setTheme] = useState<CardTheme>(() => activeCard.theme || 'pure_white');
  const [layoutType, setLayoutType] = useState<CardLayoutType>(() =>
    (activeCard.layout_type as CardLayoutType) ||
    ((activeCard as any).template_id as CardLayoutType) ||
    'editorial_minimal'
  );
  const [features, setFeatures] = useState<CardFeatures>(() => ({
    show_en_name: activeCard.card_features?.show_en_name ?? true,
    show_sub_org: activeCard.card_features?.show_sub_org ?? true,
    show_address: activeCard.card_features?.show_address ?? true,
    custom_logo: activeCard.card_features?.custom_logo ?? '',
    monogram_text: activeCard.card_features?.monogram_text ?? ''
  }));

  // Common Profile Data
  const [formData, setFormData] = useState<CardData>(() => ({
    ...activeCard.data,
    nameEn: activeCard.data.nameEn ?? ''
  }));
  const [category, setCategory] = useState<string>(() => {
    const dynamicCats = loadVaultCategories();
    if (activeCard.category) return activeCard.category;
    const preferred = isMyCardMode ? '글로벌 네트워크' : 'VIP 파트너';
    return dynamicCats.includes(preferred) ? preferred : dynamicCats[0] || preferred;
  });
  const [notes, setNotes] = useState<string>(() => activeCard.notes || '');
  const [slug, setSlug] = useState<string>(() =>
    isMyCardMode ? (activeCard.slug || `card-${String(Date.now()).slice(-4)}`) : ''
  );
  const [customDomain, setCustomDomain] = useState<string>(() =>
    isMyCardMode ? (activeCard.customDomain || '') : ''
  );
  const [isDefault, setIsDefault] = useState<boolean>(() =>
    isMyCardMode ? Boolean(activeCard.isDefault) : false
  );

  // Custom HTML Mode states
  const [htmlFront, setHtmlFront] = useState<string>(() =>
    activeCard.html_front || DEFAULT_LUXURY_HTML_FRONT
  );
  const [htmlBack, setHtmlBack] = useState<string>(() =>
    activeCard.html_back || DEFAULT_LUXURY_HTML_BACK
  );
  const [htmlEditorActiveFace, setHtmlEditorActiveFace] = useState<'front' | 'back'>('front');

  // Photo Mode states
  const [frontImageUrl, setFrontImageUrl] = useState<string | undefined>(() =>
    (activeCard as any).photo_url || activeCard.front_image_url || activeCard.scannedImage
  );
  const [backImageUrl, setBackImageUrl] = useState<string | undefined>(() =>
    (activeCard as any).back_photo_url || activeCard.back_image_url || activeCard.scannedImageBack
  );

  // Preview Face
  const [previewFace, setPreviewFace] = useState<'front' | 'back'>('front');

  // Mobile dedicated preview modal toggle
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  // Sync state whenever card, editingCard, initialData or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setIsMobilePreviewOpen(false);
      const currentTarget = editingCard || initialData || card;
      const safe = getSafeCard(currentTarget, isMyCardMode);
      const mode = resolveCardCreationMode(currentTarget);
      setCreationMode(mode);
      setTemplateSubTab(isCreating ? 'identity_profile' : 'visual_atelier');

      const initialAddressEn = (
        safe.data.address_en ||
        safe.data.addressEn ||
        safe.details?.address_en ||
        safe.data.details?.address_en ||
        (safe.data.addressLines && safe.data.addressLines.length > 0 ? safe.data.addressLines.join(', ') : '')
      ).trim();
      const rawAddressKr = (safe.data.addressKr ?? '').trim();
      const isPlaceholderAddressEn =
        initialAddressEn.includes('77 Cheongdam-ro') &&
        (initialAddressEn.includes('06015') || initialAddressEn.includes('Republic of Korea'));
      const cleanAddressEn =
        isPlaceholderAddressEn ||
        (initialAddressEn && initialAddressEn.toLowerCase() === rawAddressKr.toLowerCase())
          ? ''
          : initialAddressEn;

      const primaryName = isCreating
        ? (safe.data.name ?? '')
        : (safe.data.name || safe.data.nameKr || '');

      const rawSubName = isCreating
        ? ''
        : (
            safe.data.nameEn ??
            safe.data.details?.en_name ??
            safe.details?.en_name ??
            (safe.data.name ? safe.data.nameKr : '') ??
            ''
          ).trim();
      const cleanNameEn =
        rawSubName && rawSubName.toLowerCase() !== primaryName.trim().toLowerCase()
          ? rawSubName
          : '';

      const rawOrg = safe.data.organization ?? '';
      const rawOrgKr = safe.data.organizationKr ?? '';
      const cleanOrg =
        isCreating
          ? ''
          : rawOrg.trim() && rawOrgKr.trim() && rawOrg.trim().toLowerCase() === rawOrgKr.trim().toLowerCase()
            ? ''
            : rawOrg;
      const cleanOrgKr = isCreating ? (safe.data.organizationKr ?? '') : rawOrgKr;

      const rawTitle = safe.data.title ?? '';
      const rawTitleKr = safe.data.titleKr ?? '';
      const cleanTitle =
        isCreating
          ? ''
          : rawTitle.trim() && rawTitleKr.trim() && rawTitle.trim().toLowerCase() === rawTitleKr.trim().toLowerCase()
            ? ''
            : rawTitle;
      const cleanTitleKr = isCreating ? (safe.data.titleKr ?? '') : rawTitleKr;

      const rawSubOrg = safe.data.subOrg ?? safe.data.details?.sub_org ?? safe.details?.sub_org ?? '';
      const cleanSubOrg =
        rawSubOrg.trim() &&
        rawSubOrg.trim().toLowerCase() !== cleanOrg.trim().toLowerCase() &&
        rawSubOrg.trim().toLowerCase() !== cleanOrgKr.trim().toLowerCase()
          ? rawSubOrg
          : '';

      const defaultMySlug = safe.slug || `card-${String(Date.now()).slice(-4)}`;
      const rawCardWebsite = (safe.data.website ?? '').trim();
      const initialWebsite = isMyCardMode
        ? (rawCardWebsite || `https://${APP_BASE_DOMAIN}/card/${defaultMySlug}`)
        : rawCardWebsite;
      const initialWebsiteDisplay = isMyCardMode
        ? ((safe.data.websiteDisplay ?? '').trim() || `${APP_BASE_DOMAIN}/card/${defaultMySlug}`)
        : ((safe.data.websiteDisplay ?? '').trim() ||
            (rawCardWebsite ? rawCardWebsite.replace(/^https?:\/\//i, '').replace(/\/$/, '') : ''));

      const initialDataResolved: CardData = {
        ...safe.data,
        name: primaryName,
        nameEn: cleanNameEn,
        nameKr: '',
        organization: cleanOrg,
        organizationKr: cleanOrgKr,
        subOrg: cleanSubOrg,
        title: cleanTitle,
        titleKr: cleanTitleKr,
        phone: safe.data.phone ?? '',
        phoneRaw: safe.data.phoneRaw ?? safe.data.phone?.replace(/[^0-9+]/g, '') ?? '',
        whatsappUrl: safe.data.whatsappUrl ?? '',
        email: safe.data.email ?? '',
        addressKr: safe.data.addressKr ?? '',
        address_en: cleanAddressEn,
        addressLines: cleanAddressEn ? [cleanAddressEn] : (safe.data.addressLines || []),
        website: initialWebsite,
        websiteDisplay: initialWebsiteDisplay,
        googleMapsUrl: safe.data.googleMapsUrl ?? '',
        naverMapsUrl: safe.data.naverMapsUrl ?? '',
        details: {
          ...safe.details,
          ...safe.data.details,
          en_name: cleanNameEn,
          sub_org: cleanSubOrg,
          address: safe.data.addressKr ?? '',
          address_en: cleanAddressEn,
          slogan: safe.data.backTagline ?? '',
          show_address: safe.card_features?.show_address ?? true,
          show_en_name: safe.card_features?.show_en_name ?? true
        }
      };
      setFormData(initialDataResolved);

      const resolvedTheme = safe.theme || (safe as any).theme_preset || 'pure_white';
      setTheme(resolvedTheme);

      const resolvedLayout =
        (safe.layout_type as CardLayoutType) ||
        ((safe as any).template_id as CardLayoutType) ||
        'editorial_minimal';
      setLayoutType(resolvedLayout);

      setFeatures({
        show_en_name: safe.card_features?.show_en_name ?? true,
        show_sub_org: safe.card_features?.show_sub_org ?? true,
        show_address: safe.card_features?.show_address ?? true,
        custom_logo: safe.card_features?.custom_logo ?? '',
        monogram_text: safe.card_features?.monogram_text ?? ''
      });

      const currentDynamicCats = loadVaultCategories();
      const preferredDefault = isMyCardMode ? '글로벌 네트워크' : 'VIP 파트너';
      const resolvedCategory =
        safe.category && (!isCreating || currentDynamicCats.includes(safe.category))
          ? safe.category
          : currentDynamicCats.includes(preferredDefault)
            ? preferredDefault
            : currentDynamicCats[0] || preferredDefault;
      setCategory(resolvedCategory);

      setNotes(safe.notes || '');
      setSlug(isMyCardMode ? defaultMySlug : '');
      setCustomDomain(isMyCardMode ? (safe.customDomain || '') : '');
      setIsDefault(isMyCardMode ? Boolean(safe.isDefault) : false);

      setHtmlFront(safe.html_front || DEFAULT_LUXURY_HTML_FRONT);
      setHtmlBack(safe.html_back || DEFAULT_LUXURY_HTML_BACK);

      const frontPhoto =
        (safe as any).photo_url ||
        safe.front_image_url ||
        safe.scannedImage ||
        undefined;
      const backPhoto =
        (safe as any).back_photo_url ||
        safe.back_image_url ||
        safe.scannedImageBack ||
        undefined;
      setFrontImageUrl(frontPhoto);
      setBackImageUrl(backPhoto);
      setPreviewFace('front');
    }
  }, [card, editingCard, initialData, isOpen, isMyCardMode, isCreating]);

  if (!isOpen) return null;

  const handleFormFieldChange = (field: keyof CardData, value: string) => {
    setFormData(prev => {
      const updated: CardData = { ...prev, [field]: value };
      if (field === 'nameEn') {
        updated.nameEn = value;
        updated.nameKr = '';
        updated.details = {
          ...updated.details,
          en_name: value,
          show_address: features.show_address ?? true,
          show_en_name: features.show_en_name ?? true
        };
      }
      if (field === 'address_en') {
        updated.address_en = value;
        updated.details = {
          ...updated.details,
          show_address: features.show_address ?? true,
          show_en_name: features.show_en_name ?? true,
          address_en: value
        };
        updated.addressLines = value ? [value] : [];
      }
      if (field === 'phone') {
        const raw = value.replace(/[^0-9+]/g, '');
        updated.phoneRaw = raw;
        if (!prev.whatsappUrl || prev.whatsappUrl.includes('wa.me')) {
          updated.whatsappUrl = raw ? `https://wa.me/${raw.replace(/^\+/, '')}` : '';
        }
      }
      if (field === 'website') {
        updated.websiteDisplay = value.replace(/^https?:\/\//, '');
      }
      return updated;
    });
  };

  const cleanCustomDomain = isMyCardMode && customDomain ? normalizeDomain(customDomain) : '';
  const cleanSlug = isMyCardMode
    ? (slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || 'card')
    : '';
  const rawExternalWebsite = (formData.website ?? '').trim();
  const effectiveUrl = isMyCardMode
    ? (cleanCustomDomain ? `https://${cleanCustomDomain}` : `https://${APP_BASE_DOMAIN}/card/${cleanSlug}`)
    : (rawExternalWebsite
        ? (/^https?:\/\//i.test(rawExternalWebsite) ? rawExternalWebsite : `https://${rawExternalWebsite}`)
        : '');
  const effectiveDisplayUrl = isMyCardMode
    ? (cleanCustomDomain || `${APP_BASE_DOMAIN}/card/${cleanSlug}`)
    : (rawExternalWebsite ? rawExternalWebsite.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '');

  const handleResetSample = () => {
    if (isCreating) {
      setFormData({
        organization: '',
        organizationKr: '',
        subOrg: '',
        name: '',
        nameEn: '',
        nameKr: '',
        title: '',
        titleKr: '',
        phone: '',
        phoneRaw: '',
        whatsappUrl: '',
        email: '',
        website: isMyCardMode ? effectiveUrl : '',
        websiteDisplay: isMyCardMode ? effectiveDisplayUrl : '',
        addressLines: [],
        addressKr: '',
        address_en: '',
        details: {
          en_name: '',
          sub_org: '',
          address: '',
          address_en: '',
          slogan: '',
          show_address: true,
          show_en_name: true
        },
        googleMapsUrl: '',
        naverMapsUrl: ''
      });
      setTheme('pure_white');
      setLayoutType('editorial_minimal');
      setCreationMode('template');
    } else {
      const origWeb = (activeCard.data.website ?? '').trim();
      setFormData({
        ...activeCard.data,
        name: activeCard.data.name || activeCard.data.nameKr || '',
        nameEn: activeCard.data.nameEn ?? '',
        nameKr: '',
        website: isMyCardMode
          ? (origWeb || `https://${APP_BASE_DOMAIN}/card/${activeCard.slug || 'card'}`)
          : origWeb,
        websiteDisplay: isMyCardMode
          ? ((activeCard.data.websiteDisplay ?? '').trim() || `${APP_BASE_DOMAIN}/card/${activeCard.slug || 'card'}`)
          : ((activeCard.data.websiteDisplay ?? '').trim() || (origWeb ? origWeb.replace(/^https?:\/\//i, '').replace(/\/$/, '') : ''))
      });
      setSlug(isMyCardMode ? (activeCard.slug || 'card') : '');
      setCustomDomain(isMyCardMode ? (activeCard.customDomain || '') : '');
      setCategory(activeCard.category || (isMyCardMode ? '글로벌 네트워크' : 'VIP 파트너'));
      setNotes(activeCard.notes || '');
      setIsDefault(isMyCardMode ? Boolean(activeCard.isDefault) : false);
      setTheme(activeCard.theme || 'pure_white');
      setLayoutType(
        (activeCard.layout_type as CardLayoutType) ||
        ((activeCard as any).template_id as CardLayoutType) ||
        'editorial_minimal'
      );
      setCreationMode(resolveCardCreationMode(activeCard));
    }
  };

  const handleSave = () => {
    const cleanPrimaryName = (formData.name || formData.nameKr || '').trim() || '이름 미입력';
    const rawSubName = (formData.nameEn ?? '').trim();
    const cleanNameEn =
      rawSubName && rawSubName.toLowerCase() !== cleanPrimaryName.toLowerCase()
        ? rawSubName
        : '';

    const cleanOrgKr = (formData.organizationKr ?? '').trim();
    const rawOrgEn = (formData.organization ?? '').trim();
    const cleanOrgEn =
      rawOrgEn && rawOrgEn.toLowerCase() !== cleanOrgKr.toLowerCase()
        ? rawOrgEn
        : '';

    const rawSubOrg = (formData.subOrg ?? '').trim();
    const cleanSubOrg =
      rawSubOrg &&
      rawSubOrg.toLowerCase() !== cleanOrgKr.toLowerCase() &&
      rawSubOrg.toLowerCase() !== cleanOrgEn.toLowerCase()
        ? rawSubOrg
        : '';

    const cleanTitleKr = (formData.titleKr ?? '').trim();
    const rawTitleEn = (formData.title ?? '').trim();
    const cleanTitleEn =
      rawTitleEn && rawTitleEn.toLowerCase() !== cleanTitleKr.toLowerCase()
        ? rawTitleEn
        : '';

    const cleanAddressKr = (formData.addressKr ?? '').trim();
    const rawAddressEn = (formData.address_en ?? formData.details?.address_en ?? '').trim();
    const finalAddressEn =
      rawAddressEn && rawAddressEn.toLowerCase() !== cleanAddressKr.toLowerCase()
        ? rawAddressEn
        : '';

    const finalData: CardData = {
      ...formData,
      name: cleanPrimaryName,
      nameEn: cleanNameEn,
      nameKr: '',
      organization: cleanOrgEn,
      organizationKr: cleanOrgKr,
      subOrg: cleanSubOrg,
      title: cleanTitleEn,
      titleKr: cleanTitleKr,
      addressKr: cleanAddressKr,
      address_en: finalAddressEn,
      addressLines: finalAddressEn ? [finalAddressEn] : [],
      website: effectiveUrl,
      websiteDisplay: effectiveDisplayUrl,
      details: {
        ...formData.details,
        en_name: cleanNameEn,
        sub_org: cleanSubOrg,
        address: cleanAddressKr,
        address_en: finalAddressEn,
        slogan: formData.backTagline,
        show_address: features.show_address ?? true,
        show_en_name: features.show_en_name ?? true
      }
    };

    const isPhotoMode = creationMode === 'photo';
    const isHtmlMode = creationMode === 'custom_html' || (creationMode as string) === 'custom';

    const updated: StoredCard = {
      ...activeCard,
      data: finalData,
      theme,
      layout_type: layoutType,
      template_id: layoutType,
      card_features: features,
      category,
      notes,
      slug: isMyCardMode ? cleanSlug : undefined,
      customDomain: isMyCardMode ? (cleanCustomDomain || undefined) : undefined,
      isDefault: isMyCardMode ? isDefault : false,
      isMyCard: Boolean(isMyCardMode),
      creation_mode: creationMode,
      owner_key: isMyCardMode ? (activeCard.owner_key || `key_${Date.now()}`) : undefined,
      created_at: activeCard.created_at || new Date().toISOString(),
      details: {
        en_name: cleanNameEn,
        sub_org: cleanSubOrg,
        address: cleanAddressKr,
        address_en: finalAddressEn,
        slogan: formData.backTagline,
        show_address: features.show_address ?? true,
        show_en_name: features.show_en_name ?? true
      },
      html_front: isHtmlMode ? sanitizeHtml(htmlFront) : undefined,
      html_back: isHtmlMode ? sanitizeHtml(htmlBack) : undefined,
      front_image_url: isPhotoMode ? frontImageUrl : undefined,
      back_image_url: isPhotoMode ? backImageUrl : undefined,
      photo_url: isPhotoMode ? frontImageUrl : undefined,
      back_photo_url: isPhotoMode ? backImageUrl : undefined,
      scannedImage: isPhotoMode ? frontImageUrl : activeCard.scannedImage,
      scannedImageBack: isPhotoMode ? backImageUrl : activeCard.scannedImageBack,
      isPhotoCard: isPhotoMode && Boolean(frontImageUrl)
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0B0B0D]/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <style>{`
        .editor-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .editor-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .editor-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 9999px; }
        .editor-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.18); }
        .editor-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.08) transparent; }
      `}</style>

      <div
        className="CardEditorModal relative w-full max-w-6xl h-[90vh] max-h-[880px] flex flex-col rounded-2xl bg-[#121214] border border-white/[0.08] text-[#E8E8EC] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.75)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Typographic Mode Tab Strip */}
        <header className="px-4 sm:px-9 pt-3.5 sm:pt-6 border-b border-white/[0.06] bg-[#121214] shrink-0">
          <div className="flex items-center justify-between gap-3 pb-3 sm:pb-5">
            <h3 className="text-[15px] sm:text-[17px] font-medium text-[#F2F2F5] tracking-tight">
              {isCreating
                ? isMyCardMode
                  ? '새 내 명함 만들기'
                  : '보관함 명함 등록'
                : isMyCardMode
                  ? '내 명함 편집'
                  : '보관 명함 편집'}
            </h3>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleResetSample}
                className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                title="초기화"
                aria-label="초기화"
              >
                <RotateCcw className="w-4 h-4 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                title="닫기"
                aria-label="닫기"
              >
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>
          </div>

          {/* Minimal Border-Bottom Typographic Mode Switcher */}
          <nav className="flex items-center gap-4 sm:gap-7 overflow-x-auto no-scrollbar" aria-label="생성 방식">
            {CREATION_MODES.map((mode) => {
              const isActive =
                creationMode === mode.id ||
                (mode.id === 'custom_html' && (creationMode === 'custom' || creationMode === 'custom_html'));
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setCreationMode(mode.id)}
                  className={`relative pb-2 sm:pb-3.5 text-xs sm:text-[13px] tracking-wide whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none ${
                    isActive
                      ? 'text-[#F2F2F5] font-medium'
                      : 'text-zinc-400 hover:text-zinc-300 font-normal'
                  }`}
                >
                  {mode.label}
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-[#E4E4E7]" />
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        {/* Main Split Workspace */}
        <div className="flex-1 grid grid-cols-12 overflow-y-auto lg:overflow-hidden editor-scrollbar min-h-0">
          {/* Left Inspector Panel */}
          <div className="order-2 lg:order-1 col-span-12 lg:col-span-5 h-auto lg:h-full lg:overflow-y-auto px-4 py-4 sm:px-9 sm:py-8 editor-scrollbar">
            {creationMode === 'template' && (
              <TemplateModeEditor
                theme={theme}
                layoutType={layoutType}
                onChangeTheme={setTheme}
                onChangeLayout={setLayoutType}
                formData={formData}
                onChangeFormField={handleFormFieldChange}
                features={features}
                onChangeFeatures={setFeatures}
                slug={slug}
                onChangeSlug={setSlug}
                customDomain={customDomain}
                onChangeCustomDomain={setCustomDomain}
                category={category}
                onChangeCategory={setCategory}
                isDefault={isDefault}
                onChangeIsDefault={setIsDefault}
                isMyCardMode={isMyCardMode}
                subTab={templateSubTab}
                onChangeSubTab={setTemplateSubTab}
              />
            )}

            {creationMode === 'photo' && (
              <PhotoArchivingEditor
                frontImageUrl={frontImageUrl}
                backImageUrl={backImageUrl}
                onChangeFrontImage={setFrontImageUrl}
                onChangeBackImage={setBackImageUrl}
                cardData={formData}
                onChangeCardData={handleFormFieldChange}
                slug={slug}
                onChangeSlug={setSlug}
                notes={notes}
                onChangeNotes={setNotes}
                category={category}
                onChangeCategory={setCategory}
                isMyCardMode={isMyCardMode}
              />
            )}

            {(creationMode === 'custom_html' || (creationMode as string) === 'custom') && (
              <CustomHtmlEditor
                htmlFront={htmlFront}
                htmlBack={htmlBack}
                onChangeFront={setHtmlFront}
                onChangeBack={setHtmlBack}
                cardData={formData}
                onChangeCardData={handleFormFieldChange}
                activeFace={htmlEditorActiveFace}
                onChangeActiveFace={setHtmlEditorActiveFace}
                category={category}
                onChangeCategory={setCategory}
              />
            )}
          </div>

          {/* Right Live Gallery Stage */}
          <EditorPreviewPanel
            creationMode={creationMode}
            layoutType={layoutType}
            theme={theme}
            features={features}
            formData={formData}
            effectiveUrl={effectiveUrl}
            effectiveDisplayUrl={effectiveDisplayUrl}
            frontImageUrl={frontImageUrl}
            backImageUrl={backImageUrl}
            htmlFront={htmlFront}
            htmlBack={htmlBack}
            previewFace={previewFace}
            onFlipPreviewFace={() => setPreviewFace(prev => (prev === 'front' ? 'back' : 'front'))}
          />
        </div>

        {/* Restrained Footer */}
        <footer className="px-4 sm:px-9 py-2.5 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-white/[0.06] bg-[#121214] flex items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div />

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMobilePreviewOpen(true)}
              className="lg:hidden px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-white/10 bg-white/[0.05] hover:bg-white/10 text-zinc-200 text-xs sm:text-[13px] font-medium inline-flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            >
              미리보기
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] cursor-pointer text-xs sm:text-[13px] font-normal whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            >
              취소
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-lg bg-[#EAEAE6] hover:bg-[#F3F3F0] text-[#121214] font-medium text-xs sm:text-[13px] tracking-wide cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              {isCreating ? '등록' : '저장'}
            </button>
          </div>
        </footer>
      </div>

      {/* Dedicated Mobile Fullscreen Preview Modal */}
      {isMobilePreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="명함 전체 미리보기"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 lg:hidden"
          onClick={() => setIsMobilePreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md max-h-[92vh] flex flex-col rounded-3xl bg-[#0E0E11] border border-white/10 text-[#E8E8EC] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimal Header */}
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-white/[0.06] flex items-center justify-end shrink-0 bg-[#131317]/90 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setIsMobilePreviewOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="닫기"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Stage with atmospheric radial gallery glow */}
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 bg-[radial-gradient(circle_at_50%_35%,_rgba(255,255,255,0.06)_0%,_rgba(15,15,18,0.98)_55%,_#0B0B0E_100%)]">
              <EditorPreviewPanel
                isMobileModal={true}
                creationMode={creationMode}
                layoutType={layoutType}
                theme={theme}
                features={features}
                formData={formData}
                effectiveUrl={effectiveUrl}
                effectiveDisplayUrl={effectiveDisplayUrl}
                frontImageUrl={frontImageUrl}
                backImageUrl={backImageUrl}
                htmlFront={htmlFront}
                htmlBack={htmlBack}
                previewFace={previewFace}
                onFlipPreviewFace={() => setPreviewFace((prev) => (prev === 'front' ? 'back' : 'front'))}
              />
            </div>

            {/* Luxury Footer */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-white/[0.07] flex items-center justify-between gap-3 shrink-0 bg-[#131317]/95 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setIsMobilePreviewOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>← 편집 계속하기</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobilePreviewOpen(false);
                  handleSave();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-b from-white to-[#EAEAE6] hover:from-white hover:to-white text-neutral-950 text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-[0_4px_16px_rgba(255,255,255,0.2)] active:scale-95"
              >
                {isCreating ? '이 명함으로 등록' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CardEditModal = CardEditorModal;
export const CardFormModal = CardEditorModal;

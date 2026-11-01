export type CardCreationMode = 'template' | 'custom_html' | 'photo';

export interface BaseCard {
  id: string;
  slug: string;
  created_at: string;
  owner_key: string;
  creation_mode: CardCreationMode;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  website?: string;
}

export interface TemplateCard extends BaseCard {
  creation_mode: 'template';
  layout_type: 'editorial_minimal' | 'monogram_executive' | 'swiss_typo_bold' | 'warm_organic' | 'vertical_atelier' | 'serenity_vertical';
  theme_preset: 'pure_white' | 'sumi_ink' | 'warm_paper' | 'deep_forest' | 'classic_navy';
  details: {
    en_name?: string;
    sub_org?: string;
    address?: string;
    address_en?: string;
    slogan?: string;
    show_address: boolean;
    show_en_name: boolean;
  };
}

export interface CustomHtmlCard extends BaseCard {
  creation_mode: 'custom_html';
  html_front: string;
  html_back?: string;
}

export interface PhotoCard extends BaseCard {
  creation_mode: 'photo';
  front_image_url: string; // Base64 WebP compressed
  back_image_url?: string;
}

export type BusinessCard = TemplateCard | CustomHtmlCard | PhotoCard;

export type ThemePreset =
  | 'pure_white'   // Warm Champagne Sand (#F5F2EC), deep warm charcoal text (#1C1B1A), muted text (#787571)
  | 'sumi_ink'     // Rich Dark Canvas (#0A0A0B), matte white text (#FAFAFA), platinum monochrome accent
  | 'warm_paper'   // Fine Cotton Paper (#F5F5F4), deep charcoal text (#18181B), monochrome black accent
  | 'deep_forest'  // Muted Dark Forest (#0D1F18), soft platinum typography (#F4F7F4)
  | 'classic_navy'; // Midnight Indigo (#0A1128), silver-white typography, platinum border hints (#D0D9E8)

export type LegacyTheme =
  | 'obsidian'   // 1. Obsidian Charcoal (#121214)
  | 'cotton'     // 2. Warm Champagne Sand (#F5F2EC)
  | 'titanium'   // 3. Architectural Titanium (#18181B)
  | 'navy'       // 4. Midnight Diplomatic Navy
  | 'emerald'    // 5. Deep Forest Evergreen
  | 'sand'       // 6. Warm Stone Neutral
  | 'pure_white' // 7. Warm Champagne Sand (#F5F2EC)
  | 'slate';     // 8. Nordic Mineral Slate

export type CardTheme = ThemePreset | LegacyTheme;

export type CardLayoutType =
  | 'editorial_minimal'   // Asymmetric two-column, Korean/English duality, structured grid
  | 'monogram_executive'  // Centered alignment, elegant serif/monogram initials at top, concise executive typography
  | 'swiss_typo_bold'     // Modern high-contrast grotesque sans-serif with bold name presence and clean micro-metadata
  | 'warm_organic'        // Soft paper/canvas aesthetic with expansive negative space and refined classical proportions
  | 'vertical_atelier'    // Vertical-oriented card format ideal for architects, consultants, and artists
  | 'serenity_vertical';  // Quiet luxury vertical layout focused on undisturbed negative space and typographic restraint

export interface CardFeatures {
  show_en_name?: boolean;       // Toggle English name subtext
  show_sub_org?: boolean;       // Toggle secondary company/foundation name
  show_address?: boolean;       // Toggle address block
  custom_logo?: string;         // Optional custom logo upload (data URL or image path)
  monogram_text?: string;       // Text monogram fallback (e.g. "PK" or "GP")
}

export interface CardData {
  organization: string;
  organizationKr: string;
  subOrg?: string;
  name: string;
  nameEn?: string;
  nameKr: string;
  title: string;
  titleKr: string;
  phone: string;
  phoneRaw: string;
  whatsappUrl: string;
  linkedinUrl?: string;
  email: string;
  website: string;
  websiteDisplay: string;
  addressLines: string[];
  addressKr: string;
  address_en?: string;
  addressEn?: string;
  details?: {
    en_name?: string;
    sub_org?: string;
    address?: string;
    address_en?: string;
    slogan?: string;
    show_address?: boolean;
    show_en_name?: boolean;
  };
  googleMapsUrl: string;
  naverMapsUrl: string;
  backTitle?: string;
  backSubtitle?: string;
  backTagline?: string;
  backHqAddress?: string;
}

export type PrintLayout = 'single-card' | 'front-back-duo' | 'a4-sheet';
export type PrintSize = 'kr-standard' | 'iso-standard'; // 90x50mm vs 85x55mm
export type CardOrientation = 'portrait' | 'landscape';

export interface PrintConfig {
  layout: PrintLayout;
  size: PrintSize;
  showCropMarks: boolean;
  theme: CardTheme;
  scale: number;
}

export interface StoredCard {
  id: string;
  data: CardData;
  theme: CardTheme;
  layout_type?: CardLayoutType;
  card_features?: CardFeatures;
  category: string;
  isMyCard?: boolean;
  isDefault?: boolean;
  slug?: string;
  customDomain?: string;
  ownerEmail?: string;
  createdAt: string;
  notes?: string;
  scannedImage?: string; // Physical card photo archive (High-Res base64 or URL)
  scannedImageBack?: string; // Optional physical card back photo (WebP base64 or URL)
  isPhotoCard?: boolean; // When true, renders authentic physical photo as card face
  visualMode?: 'digital' | 'photo_archive';

  // 3-Way Card Creation Architecture Integration
  creation_mode?: CardCreationMode;
  owner_key?: string;
  created_at?: string;
  html_front?: string;
  html_back?: string;
  front_image_url?: string;
  back_image_url?: string;
  details?: {
    en_name?: string;
    sub_org?: string;
    address?: string;
    address_en?: string;
    slogan?: string;
    show_address: boolean;
    show_en_name: boolean;
  };
}

export type CardCategory = '전체' | 'VIP 파트너' | '글로벌 네트워크' | '공공·기관' | '투자·금융' | 'IT·기술' | '기타';

export type AppViewMode = 'my-card' | 'vault-cards' | 'vault-list';

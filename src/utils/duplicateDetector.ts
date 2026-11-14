import { CardData, StoredCard } from '../types/card';

export type DuplicateMatchReason = 'phone' | 'email';

export interface DuplicateGroup {
  id: string;
  cards: StoredCard[];
  matchedReasons: DuplicateMatchReason[];
  matchedPhones: string[];
  matchedEmails: string[];
}

/**
 * Normalizes a phone number string for duplicate comparison:
 * - Strips spaces, hyphens, parentheses, and dots
 * - Normalizes Korean country codes (+82 10-... / 0082 10-... / 8210...) -> 010...
 * - Returns empty string if resulting digit sequence is shorter than 7 digits
 */
export function normalizePhoneForDuplicate(raw?: string | null): string {
  if (!raw) return '';
  let compact = raw.trim().replace(/[\s\-().]/g, '');
  if (!compact) return '';

  if (compact.startsWith('+82')) {
    const rest = compact.slice(3).replace(/\D/g, '');
    if (!rest) return '';
    compact = rest.startsWith('0') ? rest : `0${rest}`;
  } else if (compact.startsWith('0082')) {
    const rest = compact.slice(4).replace(/\D/g, '');
    if (!rest) return '';
    compact = rest.startsWith('0') ? rest : `0${rest}`;
  } else if (/^82(?:1\d|2|[3-6]\d|70)/.test(compact) && compact.length >= 10) {
    const rest = compact.slice(2).replace(/\D/g, '');
    compact = rest.startsWith('0') ? rest : `0${rest}`;
  } else {
    compact = compact.replace(/\D/g, '');
  }

  return compact.length >= 7 ? compact : '';
}

/**
 * Normalizes an email address for duplicate comparison (trimmed, lowercase).
 */
export function normalizeEmailForDuplicate(email?: string | null): string {
  const cleaned = (email || '').trim().toLowerCase();
  if (!cleaned || !cleaned.includes('@') || cleaned.length < 3) return '';
  return cleaned;
}

/**
 * Extracts all normalized phone keys present on a card.
 */
function getCardPhoneKeys(card: StoredCard): string[] {
  const keys = new Set<string>();
  const p1 = normalizePhoneForDuplicate(card.data?.phone);
  const p2 = normalizePhoneForDuplicate(card.data?.phoneRaw);
  if (p1) keys.add(p1);
  if (p2) keys.add(p2);
  return Array.from(keys);
}

/**
 * Scans Vault contacts (`isMyCard: false`) for duplicate groups based on
 * normalized phone numbers or emails. Strictly excludes `isMyCard: true` cards.
 */
export function detectDuplicateVaultGroups(cards: StoredCard[]): DuplicateGroup[] {
  const vaultCards = cards.filter((c) => !c.isMyCard);
  const n = vaultCards.length;
  if (n < 2) return [];

  // Disjoint Set (Union-Find)
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent[rb] = ra;
    }
  };

  const phoneIndex = new Map<string, number[]>();
  const emailIndex = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const card = vaultCards[i];
    const phones = getCardPhoneKeys(card);
    for (const phoneKey of phones) {
      const list = phoneIndex.get(phoneKey) || [];
      list.push(i);
      phoneIndex.set(phoneKey, list);
    }

    const emailKey = normalizeEmailForDuplicate(card.data?.email);
    if (emailKey) {
      const list = emailIndex.get(emailKey) || [];
      list.push(i);
      emailIndex.set(emailKey, list);
    }
  }

  for (const indices of phoneIndex.values()) {
    if (indices.length > 1) {
      for (let k = 1; k < indices.length; k++) {
        union(indices[0], indices[k]);
      }
    }
  }

  for (const indices of emailIndex.values()) {
    if (indices.length > 1) {
      for (let k = 1; k < indices.length; k++) {
        union(indices[0], indices[k]);
      }
    }
  }

  const components = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = components.get(root) || [];
    list.push(i);
    components.set(root, list);
  }

  const groups: DuplicateGroup[] = [];
  for (const indices of components.values()) {
    if (indices.length < 2) continue;

    const groupCards = indices.map((idx) => vaultCards[idx]);
    const phoneCounts = new Map<string, number>();
    const emailCounts = new Map<string, number>();

    for (const card of groupCards) {
      for (const p of getCardPhoneKeys(card)) {
        phoneCounts.set(p, (phoneCounts.get(p) || 0) + 1);
      }
      const em = normalizeEmailForDuplicate(card.data?.email);
      if (em) {
        emailCounts.set(em, (emailCounts.get(em) || 0) + 1);
      }
    }

    const matchedPhones = Array.from(phoneCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key);
    const matchedEmails = Array.from(emailCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key);

    const matchedReasons: DuplicateMatchReason[] = [];
    if (matchedPhones.length > 0) matchedReasons.push('phone');
    if (matchedEmails.length > 0) matchedReasons.push('email');

    const sortedIds = groupCards.map((c) => c.id).sort();
    groups.push({
      id: sortedIds.join('::'),
      cards: groupCards,
      matchedReasons,
      matchedPhones,
      matchedEmails,
    });
  }

  return groups;
}

function formatMergeTimestamp(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Concatenates distinct non-empty notes from Primary Card and duplicate cards
 * using a clear timestamped separator so no contextual memo is lost.
 */
export function mergeDuplicateNotes(
  primary: StoredCard,
  duplicates: StoredCard[]
): string {
  const primaryNote = (primary.notes || '').trim();
  const seen = new Set<string>();
  const sections: string[] = [];

  if (primaryNote) {
    seen.add(primaryNote);
    sections.push(primaryNote);
  }

  const mergeStamp = formatMergeTimestamp();

  for (const dup of duplicates) {
    const dupNote = (dup.notes || '').trim();
    if (!dupNote) continue;
    if (seen.has(dupNote)) continue;
    if (primaryNote && primaryNote.includes(dupNote)) {
      seen.add(dupNote);
      continue;
    }

    seen.add(dupNote);
    const sourceDate = dup.updatedAt?.split('T')[0] || dup.createdAt || '';
    const sourceTag = sourceDate ? ` · 원본 ${sourceDate}` : '';
    if (sections.length === 0) {
      sections.push(`[병합된 메모 · ${mergeStamp}${sourceTag}]\n${dupNote}`);
    } else {
      sections.push(`--- [병합된 메모 · ${mergeStamp}${sourceTag}] ---\n${dupNote}`);
    }
  }

  return sections.join('\n\n');
}

const STRING_CARD_DATA_KEYS: Array<
  keyof Omit<CardData, 'addressLines' | 'details'>
> = [
  'organization',
  'organizationKr',
  'subOrg',
  'name',
  'nameEn',
  'nameKr',
  'title',
  'titleKr',
  'phone',
  'phoneRaw',
  'whatsappUrl',
  'linkedinUrl',
  'email',
  'website',
  'websiteDisplay',
  'addressKr',
  'address_en',
  'addressEn',
  'googleMapsUrl',
  'naverMapsUrl',
  'backTitle',
  'backSubtitle',
  'backTagline',
  'backHqAddress',
];

/**
 * Builds the merged Vault card while strictly preserving the Primary Card's
 * visual mode, theme, and front/back photos, auto-prefilling empty fields from
 * duplicate cards, and concatenating distinct notes.
 */
export function buildMergedVaultCard(
  primary: StoredCard,
  duplicates: StoredCard[],
  notesOverride?: string
): { mergedCard: StoredCard; filledFields: string[] } {
  const mergedData: CardData = {
    ...primary.data,
    addressLines: Array.isArray(primary.data?.addressLines)
      ? [...primary.data.addressLines]
      : [],
    details: primary.data?.details ? { ...primary.data.details } : undefined,
  };

  const filledFields: string[] = [];

  for (const key of STRING_CARD_DATA_KEYS) {
    const currentVal = (mergedData[key] as string | undefined)?.trim();
    if (!currentVal) {
      for (const dup of duplicates) {
        const candidate = (dup.data?.[key] as string | undefined)?.trim();
        if (candidate) {
          (mergedData[key] as string | undefined) = candidate;
          filledFields.push(key);
          break;
        }
      }
    }
  }

  // Address lines fallback
  const hasPrimaryAddressLines = mergedData.addressLines.some(
    (line) => typeof line === 'string' && line.trim().length > 0
  );
  if (!hasPrimaryAddressLines) {
    for (const dup of duplicates) {
      const dupLines = (dup.data?.addressLines || []).filter(
        (l) => typeof l === 'string' && l.trim().length > 0
      );
      if (dupLines.length > 0) {
        mergedData.addressLines = dupLines;
        filledFields.push('addressLines');
        break;
      }
    }
  }

  // Nested details fallback
  const detailKeys: Array<'en_name' | 'sub_org' | 'address' | 'address_en' | 'slogan'> = [
    'en_name',
    'sub_org',
    'address',
    'address_en',
    'slogan',
  ];
  for (const dk of detailKeys) {
    const currentVal = mergedData.details?.[dk]?.trim();
    if (!currentVal) {
      for (const dup of duplicates) {
        const candidate =
          dup.data?.details?.[dk]?.trim() || dup.details?.[dk]?.trim();
        if (candidate) {
          mergedData.details = {
            ...(mergedData.details || {}),
            [dk]: candidate,
          };
          break;
        }
      }
    }
  }

  // Category fallback if Primary is empty or '기타'
  let mergedCategory = (primary.category || '').trim();
  if (!mergedCategory || mergedCategory === '기타') {
    for (const dup of duplicates) {
      const dupCat = (dup.category || '').trim();
      if (dupCat && dupCat !== '기타') {
        mergedCategory = dupCat;
        filledFields.push('category');
        break;
      }
    }
  }
  if (!mergedCategory) {
    mergedCategory = '기타';
  }

  const mergedNotes =
    notesOverride !== undefined
      ? notesOverride.trim()
      : mergeDuplicateNotes(primary, duplicates);

  // Retain Primary Card's mode, theme, and front/back photos strictly
  const mergedCard: StoredCard = {
    ...primary,
    isMyCard: false,
    isDefault: false,
    owner_key: undefined,
    slug: undefined,
    customDomain: undefined,
    category: mergedCategory,
    notes: mergedNotes,
    updatedAt: new Date().toISOString(),
    data: mergedData,
    card_features: primary.card_features
      ? {
          ...primary.card_features,
          monogram_text:
            primary.card_features.monogram_text ||
            duplicates.find((d) => d.card_features?.monogram_text)?.card_features
              ?.monogram_text,
          custom_logo:
            primary.card_features.custom_logo ||
            duplicates.find((d) => d.card_features?.custom_logo)?.card_features
              ?.custom_logo,
        }
      : primary.card_features,
  };

  return { mergedCard, filledFields };
}

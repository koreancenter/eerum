import { StoredCard, CardData } from '../types/card';

export interface ParsedContact {
  id: string;
  name: string;
  nameEn?: string;
  nameKr?: string;
  organization: string;
  organizationKr?: string;
  title: string;
  titleKr?: string;
  phone: string;
  email: string;
  website?: string;
  notes?: string;
  address?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

/**
 * Decodes quoted-printable encoded strings (e.g., "=ED=95=9C=EA=B5=AD=EC=96=B4") into UTF-8 text.
 */
export function decodeQuotedPrintable(input: string): string {
  if (!input) return '';
  // Remove soft line breaks
  const cleaned = input.replace(/=\r?\n/g, '');
  try {
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; ) {
      if (
        cleaned[i] === '=' &&
        i + 2 < cleaned.length &&
        /^[0-9A-Fa-f]{2}$/.test(cleaned.substring(i + 1, i + 3))
      ) {
        bytes.push(parseInt(cleaned.substring(i + 1, i + 3), 16));
        i += 3;
      } else {
        bytes.push(cleaned.charCodeAt(i));
        i++;
      }
    }
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return cleaned;
  }
}

/**
 * Unfolds folded vCard lines (RFC 6350 / RFC 2426).
 * Any line starting with a space or tab is a continuation of the previous line.
 */
function unfoldVCardLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const unfolded = normalized.replace(/\n[ \t]/g, '');
  return unfolded.split('\n');
}

/**
 * Decodes property value considering charset and encoding params.
 */
function decodePropertyValue(paramStr: string, value: string): string {
  let val = value.trim();
  const upperParams = paramStr.toUpperCase();
  if (upperParams.includes('ENCODING=QUOTED-PRINTABLE') || upperParams.includes('QUOTED-PRINTABLE')) {
    val = decodeQuotedPrintable(val);
  }
  // Replace escaped characters like \, and \; and \n
  return val
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * Parses a vCard string (supports multiple BEGIN:VCARD ... END:VCARD records in one file).
 */
export function parseVCardContent(vcfString: string): ParsedContact[] {
  if (!vcfString || !vcfString.trim()) return [];

  const lines = unfoldVCardLines(vcfString);
  const contacts: ParsedContact[] = [];

  let currentLines: string[] = [];
  let inVCard = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase() === 'BEGIN:VCARD') {
      inVCard = true;
      currentLines = [];
      continue;
    }
    if (trimmed.toUpperCase() === 'END:VCARD') {
      if (inVCard && currentLines.length > 0) {
        const contact = parseSingleVCard(currentLines);
        if (contact && (contact.name || contact.phone || contact.email || contact.organization)) {
          contacts.push(contact);
        }
      }
      inVCard = false;
      currentLines = [];
      continue;
    }
    if (inVCard) {
      currentLines.push(line);
    }
  }

  // Fallback: If no BEGIN:VCARD tag was found but file contains lines with FN/TEL/EMAIL
  if (contacts.length === 0 && lines.some((l) => /^(FN|TEL|EMAIL|N):/i.test(l.trim()))) {
    const single = parseSingleVCard(lines);
    if (single && (single.name || single.phone || single.email)) {
      contacts.push(single);
    }
  }

  return contacts;
}

function parseSingleVCard(lines: string[]): ParsedContact | null {
  let fn = '';
  let familyName = '';
  let givenName = '';
  let org = '';
  let title = '';
  let phone = '';
  let email = '';
  let website = '';
  let notes = '';
  let address = '';

  for (const rawLine of lines) {
    const colonIdx = rawLine.indexOf(':');
    if (colonIdx === -1) continue;

    const keyPart = rawLine.substring(0, colonIdx).trim();
    const valPart = rawLine.substring(colonIdx + 1);

    const semicolonIdx = keyPart.indexOf(';');
    const propName = (semicolonIdx !== -1 ? keyPart.substring(0, semicolonIdx) : keyPart).toUpperCase();
    const paramStr = semicolonIdx !== -1 ? keyPart.substring(semicolonIdx + 1) : '';

    const decodedVal = decodePropertyValue(paramStr, valPart);

    switch (propName) {
      case 'FN':
        if (!fn) fn = decodedVal;
        break;
      case 'N': {
        const parts = decodedVal.split(';').map((s) => s.trim());
        familyName = parts[0] || '';
        givenName = parts[1] || '';
        break;
      }
      case 'ORG': {
        const orgParts = decodedVal.split(';').map((s) => s.trim()).filter(Boolean);
        org = orgParts.join(' ');
        break;
      }
      case 'TITLE':
      case 'ROLE':
        if (!title) title = decodedVal;
        break;
      case 'TEL':
        if (!phone) {
          phone = decodedVal;
        }
        break;
      case 'EMAIL':
        if (!email) {
          email = decodedVal;
        }
        break;
      case 'URL':
        if (!website) {
          website = decodedVal;
        }
        break;
      case 'NOTE':
        notes = (notes ? notes + '\n' : '') + decodedVal;
        break;
      case 'ADR': {
        const adrParts = decodedVal.split(';').map((s) => s.trim()).filter(Boolean);
        address = adrParts.join(' ');
        break;
      }
    }
  }

  // Resolve best name
  let name = fn.trim();
  if (!name) {
    if (familyName && givenName) {
      // Korean / East Asian name heuristic (no space if Hangul)
      const isHangul = /[\uAC00-\uD7AF]/.test(familyName + givenName);
      name = isHangul ? `${familyName}${givenName}` : `${givenName} ${familyName}`;
    } else {
      name = familyName || givenName;
    }
  }

  if (!name && !phone && !email && !org) {
    return null;
  }

  return {
    id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name || '이름 없음',
    organization: org,
    title,
    phone,
    email,
    website,
    notes,
    address,
  };
}

/**
 * Normalizes phone numbers by stripping whitespace, dashes, and country prefixes for duplicate checking.
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');
  // If starts with 82 (Korea country code) followed by 10/2, normalize to 0
  if (digits.startsWith('82') && digits.length >= 10) {
    return '0' + digits.slice(2);
  }
  return digits;
}

/**
 * Identifies duplicate contacts by comparing phone number or email against existing vault cards.
 */
export function detectDuplicates(
  contacts: ParsedContact[],
  existingCards: StoredCard[]
): ParsedContact[] {
  const existingPhones = new Set<string>();
  const existingEmails = new Set<string>();

  for (const card of existingCards) {
    if (card.data.phone) {
      const norm = normalizePhoneNumber(card.data.phone);
      if (norm) existingPhones.add(norm);
    }
    if (card.data.phoneRaw) {
      const norm = normalizePhoneNumber(card.data.phoneRaw);
      if (norm) existingPhones.add(norm);
    }
    if (card.data.email) {
      existingEmails.add(card.data.email.trim().toLowerCase());
    }
  }

  return contacts.map((contact) => {
    const contactNormPhone = normalizePhoneNumber(contact.phone);
    const contactEmail = contact.email.trim().toLowerCase();

    let isDup = false;
    let reason = '';

    if (contactNormPhone && existingPhones.has(contactNormPhone)) {
      isDup = true;
      reason = '동일한 전화번호 이미 보관됨';
    } else if (contactEmail && existingEmails.has(contactEmail)) {
      isDup = true;
      reason = '동일한 이메일 이미 보관됨';
    }

    return {
      ...contact,
      isDuplicate: isDup,
      duplicateReason: reason || undefined,
    };
  });
}

/**
 * Converts a ParsedContact into a full StoredCard object formatted for the Vault.
 */
export function convertContactToStoredCard(
  contact: ParsedContact,
  category = 'VIP 파트너'
): StoredCard {
  const safeId = `vault-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowDate = new Date().toISOString().split('T')[0];

  const cardData: CardData = {
    name: contact.name,
    nameKr: contact.name,
    nameEn: contact.nameEn || '',
    organization: contact.organization || '소속 미지정',
    organizationKr: contact.organization || '소속 미지정',
    title: contact.title || '직함 미지정',
    titleKr: contact.title || '직함 미지정',
    phone: contact.phone || '',
    phoneRaw: contact.phone || '',
    email: contact.email || '',
    website: contact.website || '',
    websiteDisplay: (contact.website || '').replace(/^https?:\/\//, ''),
    whatsappUrl: contact.phone ? `https://wa.me/${normalizePhoneNumber(contact.phone)}` : '',
    addressLines: contact.address ? [contact.address] : [],
    addressKr: contact.address || '',
    googleMapsUrl: '',
    naverMapsUrl: '',
  };

  return {
    id: safeId,
    data: cardData,
    theme: 'pure_white',
    layout_type: 'editorial_minimal',
    category: category || 'VIP 파트너',
    isMyCard: false,
    isDefault: false,
    createdAt: nowDate,
    created_at: new Date().toISOString(),
    notes: contact.notes || '',
  };
}

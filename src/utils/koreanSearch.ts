/**
 * Zero-dependency Korean Hangul Choseong (초성) & Multi-Field Search Utility.
 * Supports standard substring matching, pure choseong matching (e.g. "ㄱㄱㅁ" -> "고구마"),
 * and mixed syllable + trailing choseong IME input (e.g. "고구ㅁ" -> "고구마").
 */

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const CHOSEONG_STRIDE = 21 * 28; // 588

const HANGUL_JAMO_CHOSEONG_START = 0x1100;
const HANGUL_JAMO_CHOSEONG_END = 0x1112;

export const CHOSEONG_LIST = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

const CHOSEONG_SET = new Set<string>(CHOSEONG_LIST);

/**
 * Extracts the Hangul initial consonant (choseong) for a single character if it is
 * a Hangul syllable (가-힣) or Hangul Jamo (U+1100-U+1112). Otherwise returns the character as-is.
 */
export function getCharChoseong(char: string): string {
  if (!char) return '';
  const code = char.charCodeAt(0);

  if (code >= HANGUL_SYLLABLE_START && code <= HANGUL_SYLLABLE_END) {
    const index = Math.floor((code - HANGUL_SYLLABLE_START) / CHOSEONG_STRIDE);
    return CHOSEONG_LIST[index] ?? char;
  }

  if (code >= HANGUL_JAMO_CHOSEONG_START && code <= HANGUL_JAMO_CHOSEONG_END) {
    const index = code - HANGUL_JAMO_CHOSEONG_START;
    return CHOSEONG_LIST[index] ?? char;
  }

  return char;
}

/**
 * Normalizes a string by replacing Hangul syllables with their initial consonants (초성).
 * Example: "고구마" -> "ㄱㄱㅁ", "홍길동" -> "ㅎㄱㄷ"
 */
export function extractChoseong(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += getCharChoseong(text[i]);
  }
  return result;
}

/**
 * Returns true if the query contains at least one choseong character and every
 * non-whitespace character in the query is a Hangul choseong consonant.
 */
export function isChoseongQuery(query: string): boolean {
  const compact = query.replace(/\s+/g, '');
  if (!compact) return false;
  for (let i = 0; i < compact.length; i++) {
    if (!CHOSEONG_SET.has(compact[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Matches a target string against a search query with:
 * 1. Standard case-insensitive substring matching
 * 2. Pure choseong matching (including space-insensitive matching like "ㅎㄱㄷ" -> "홍 길동")
 * 3. Mixed syllable + choseong matching (useful during active Korean IME composition)
 */
export function matchesKoreanQuery(
  target: string | null | undefined,
  query: string
): boolean {
  const normQuery = query.trim().toLowerCase();
  if (!normQuery) return true;
  if (!target) return false;

  const normTarget = target.toLowerCase();

  // 1. Direct substring match
  if (normTarget.includes(normQuery)) {
    return true;
  }

  // 2. Pure choseong query match (with and without whitespace)
  if (isChoseongQuery(normQuery)) {
    const targetChoseong = extractChoseong(normTarget);
    if (targetChoseong.includes(normQuery)) {
      return true;
    }
    const compactTargetChoseong = targetChoseong.replace(/\s+/g, '');
    const compactQuery = normQuery.replace(/\s+/g, '');
    if (compactQuery && compactTargetChoseong.includes(compactQuery)) {
      return true;
    }
    return false;
  }

  // 3. Mixed syllable + choseong sliding window match (e.g., "고구ㅁ" matching "고구마")
  const qLen = normQuery.length;
  const tLen = normTarget.length;
  if (qLen <= tLen) {
    let hasChoseongChar = false;
    for (let i = 0; i < qLen; i++) {
      if (CHOSEONG_SET.has(normQuery[i])) {
        hasChoseongChar = true;
        break;
      }
    }

    if (hasChoseongChar) {
      for (let start = 0; start <= tLen - qLen; start++) {
        let matched = true;
        for (let offset = 0; offset < qLen; offset++) {
          const qc = normQuery[offset];
          const tc = normTarget[start + offset];
          if (qc === tc) continue;
          if (CHOSEONG_SET.has(qc) && getCharChoseong(tc) === qc) continue;
          matched = false;
          break;
        }
        if (matched) return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether any field in the provided list matches the query using Korean choseong
 * and standard substring matching, plus digit-normalized phone matching when applicable.
 */
export function matchesAnySearchField(
  fields: Array<string | null | undefined>,
  query: string,
  phoneFields: Array<string | null | undefined> = []
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  for (let i = 0; i < fields.length; i++) {
    if (matchesKoreanQuery(fields[i], trimmed)) {
      return true;
    }
  }

  // Support searching phone numbers without hyphens/spaces (e.g. "0103882" matches "+82 10-3882-9011")
  if (phoneFields.length > 0 && /^[\d\s+\-().]+$/.test(trimmed)) {
    const queryDigits = trimmed.replace(/\D/g, '');
    if (queryDigits.length >= 2) {
      for (let i = 0; i < phoneFields.length; i++) {
        const val = phoneFields[i];
        if (!val) continue;
        const valDigits = val.replace(/\D/g, '');
        if (valDigits.includes(queryDigits)) {
          return true;
        }
        if (valDigits.startsWith('82') && ('0' + valDigits.slice(2)).includes(queryDigits)) {
          return true;
        }
      }
    }
  }

  return false;
}

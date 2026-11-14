export interface ParsedCardFields {
  name: string;
  nameEn: string;
  company: string;
  title: string;
  phone: string;
  phoneRaw: string;
  email: string;
  website: string;
  address: string;
  extraNotes: string[];
  rawLines: string[];
}

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s,;<>()[\]"']+/gi;
const BARE_DOMAIN_REGEX =
  /\b(?:[a-z0-9-]+\.)+(?:com|co\.kr|kr|net|org|io|ai|app|dev|biz|info|jp|cn|me|studio|design)\b(?:\/[^\s,;<>()[\]"']*)?/gi;

// Matches Korean/International phone & fax sequences (including +82, area codes, 1588-xxxx, etc.)
const PHONE_CANDIDATE_REGEX =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]+)\d{3,4}[\s.-]+\d{4}|\b(?:01[016789]|02|0[3-6][1-5]|070|080|050\d?)[-.\s]?\d{3,4}[-.\s]?\d{4}\b|\b1[568]\d{2}[-.\s]?\d{4}\b/g;

const FAX_LABEL_REGEX = /\b(?:fax|f)\b|팩스|f\s*[.:]/i;
const MOBILE_LABEL_REGEX = /\b(?:mobile|cell|mob|m|hp|h\.p|c\.p)\b|휴대전화|휴대폰|모바일|핸드폰/i;
const TEL_LABEL_REGEX = /\b(?:tel|telephone|phone|office|t|direct|dir|d)\b|전화|대표번호|직통|사무실/i;

const KOREAN_CORPORATE_MARKERS = [
  '주식회사',
  '(주)',
  '㈜',
  '유한회사',
  '(유)',
  '사단법인',
  '(사)',
  '재단법인',
  '(재)',
  '연구소',
  '관리실',
  '센터',
  '스튜디오',
  '파트너스',
  '홀딩스',
  '그룹',
  '엔터테인먼트',
  '테크놀로지',
  '테크',
  '솔루션',
  '시스템즈',
  '시스템',
  '컴퍼니',
  '에이전시',
  '코리아',
  '벤처스',
  '캐피탈',
  '네트웍스',
  '네트워크',
  '디자인',
  '건축사사무소',
  '법무법인',
  '특허법인',
  '회계법인',
  '세무법인',
  '병원',
  '의원',
  '대학교',
  '대학',
  '협회',
  '재단',
  '공사',
  '공단',
  '은행',
  '증권',
];

const ENGLISH_CORPORATE_REGEX =
  /\b(?:inc\.?|corp\.?|corporation|co\.,?\s*ltd\.?|ltd\.?|llc|llp|plc|gmbh|group|holdings|foundation|institute|studio|labs?|partners|ventures|capital|agency|company|technologies|technology|solutions|systems|global|korea|office|center|centre|associates|consulting)\b/i;

const KOREAN_TITLES = [
  '대표이사',
  '공동대표',
  '총괄대표',
  '대표 마스터',
  '대표',
  '부회장',
  '회장',
  '부사장',
  '사장',
  '전무이사',
  '전무',
  '상무이사',
  '상무',
  '수석연구원',
  '책임연구원',
  '선임연구원',
  '연구원',
  '본부장',
  '센터장',
  '연구소장',
  '소장',
  '원장',
  '실장',
  '팀장',
  '국장',
  '지점장',
  '지사장',
  '점장',
  '부장',
  '차장',
  '과장',
  '대리',
  '주임',
  '사원',
  '매니저',
  '디렉터',
  '프로듀서',
  '엔지니어',
  '디자이너',
  '개발자',
  '컨설턴트',
  '파트너',
  '마스터',
  '변호사',
  '변리사',
  '회계사',
  '세무사',
  '교수',
  '프로',
  '수석',
  '책임',
  '선임',
];

const ENGLISH_TITLES_REGEX =
  /\b(?:ceo|cto|cfo|coo|cmo|cpo|ciso|cio|founder|co-founder|president|vice\s+president|evp|svp|vp|executive\s+director|managing\s+director|creative\s+director|art\s+director|technical\s+director|director|head\s+of\s+[a-z&\s]+|team\s+lead|tech\s+lead|lead|principal(?:\s+master)?|general\s+manager|senior\s+manager|assistant\s+manager|product\s+manager|project\s+manager|manager|senior\s+engineer|software\s+engineer|engineer|developer|designer|architect|consultant|specialist|analyst|coordinator|professor|researcher|partner)\b/i;

const KOREAN_NON_NAME_WORDS = new Set([
  '서울', '서울특별시', '부산', '부산광역시', '대구', '대구광역시', '인천', '인천광역시',
  '광주', '대전', '울산', '세종', '경기', '경기도', '강원', '충북', '충남', '전북', '전남',
  '경북', '경남', '제주', '강남구', '서초구', '송파구', '종로구', '중구', '마포구', '영등포구',
  '성남시', '분당구', '수원시', '용인시', '대한민국', '한국', '빌딩', '타워', '지층', '호실',
  '사무실', '대표번호', '전화', '팩스', '휴대폰', '모바일', '이메일', '홈페이지', '웹사이트',
  '명함', '주소', '영업', '기획', '개발', '마케팅', '디자인', '인사', '총무', '재무', '회계',
  '경영지원', '전략기획', '비즈니스',
]);

const KOREAN_VALID_SURNAMES = new Set(
  '김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허남심노하곽성차주우구신임나민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉사부황보제갈남궁독고선우사공서문'.split(
    ''
  )
);

const ENGLISH_ADDRESS_OR_NOISE_REGEX =
  /\b(?:seoul|korea|republic|gangnam|seocho|teheran|cheongdam|street|st\.|ave\.|avenue|road|rd\.|blvd|floor|fl\.|suite|ste\.|building|bldg|tower|tel|fax|mobile|email|web|website|http|www|district|gu|dong|ro)\b/i;

const KOREAN_ADDRESS_REGEX =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주).{0,20}(?:구|시|군|로|길|동|번지|층|호)|[가-힣]+(?:대로|번길|로)\s*\d+/;

function cleanLine(line: string): string {
  return line
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDigits(raw: string): string {
  const digits = raw.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+82')) {
    const rest = digits.slice(3);
    return rest.startsWith('0') ? rest : `0${rest}`;
  }
  if (digits.startsWith('82') && digits.length >= 10) {
    const rest = digits.slice(2);
    return rest.startsWith('0') ? rest : `0${rest}`;
  }
  return digits;
}

function isMobileDigits(normalized: string): boolean {
  return /^01[016789]\d{7,8}$/.test(normalized);
}

function formatPhoneDisplay(raw: string): string {
  const trimmed = raw.trim().replace(/^[.:;\-\s]+|[.:;\-\s]+$/g, '');
  return trimmed.replace(/\s*\.\s*/g, '-').replace(/\s+/g, ' ');
}

function extractEmail(rawText: string): string {
  const cleanedForEmail = rawText.replace(/\s*@\s*/g, '@');
  const matches = cleanedForEmail.match(EMAIL_REGEX);
  if (!matches || matches.length === 0) return '';
  return matches[0].trim();
}

function extractWebsite(rawText: string, email: string): string {
  const withoutEmail = email
    ? rawText.replace(new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
    : rawText;

  const explicitMatches = withoutEmail.match(URL_REGEX);
  if (explicitMatches && explicitMatches.length > 0) {
    const candidate = explicitMatches[0].replace(/[.,;:]+$/, '');
    return /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  }

  const bareMatches = withoutEmail.match(BARE_DOMAIN_REGEX);
  if (bareMatches && bareMatches.length > 0) {
    const candidate = bareMatches[0].replace(/[.,;:]+$/, '');
    return `https://${candidate}`;
  }

  return '';
}

interface ExtractedNumber {
  display: string;
  normalized: string;
  kind: 'mobile' | 'fax' | 'landline';
}

function extractPhoneNumbers(lines: string[]): {
  primaryPhone: string;
  primaryPhoneRaw: string;
  extraNotes: string[];
} {
  const found: ExtractedNumber[] = [];
  const seenNormalized = new Set<string>();

  for (const line of lines) {
    // Split segments if a line combines Tel and Fax, e.g. "T. 02-123-4567 | F. 02-123-4568"
    const segments = line.split(/[|·•/]+/).map((s) => s.trim()).filter(Boolean);
    for (const segment of segments) {
      const matches = segment.match(PHONE_CANDIDATE_REGEX);
      if (!matches) continue;

      for (const rawMatch of matches) {
        const display = formatPhoneDisplay(rawMatch);
        const normalized = normalizeDigits(display);
        // Require at least 8 digits (e.g., 1588-1234) or 9+ digits for valid phone
        const digitOnlyCount = normalized.replace(/[^0-9]/g, '').length;
        if (digitOnlyCount < 8 || digitOnlyCount > 15) continue;
        // Skip years or zip-like sequences
        if (/^(?:19|20)\d{6}$/.test(normalized)) continue;

        if (seenNormalized.has(normalized)) continue;
        seenNormalized.add(normalized);

        const matchIndex = segment.indexOf(rawMatch);
        const prefixContext = segment.slice(Math.max(0, matchIndex - 20), matchIndex);
        const isFax =
          FAX_LABEL_REGEX.test(prefixContext) ||
          (matches.length === 1 && FAX_LABEL_REGEX.test(segment));
        const isMobile =
          !isFax &&
          (isMobileDigits(normalized) ||
            MOBILE_LABEL_REGEX.test(prefixContext) ||
            (matches.length === 1 && MOBILE_LABEL_REGEX.test(segment)));

        found.push({
          display,
          normalized,
          kind: isFax ? 'fax' : isMobile ? 'mobile' : 'landline',
        });
      }
    }
  }

  if (found.length === 0) {
    return { primaryPhone: '', primaryPhoneRaw: '', extraNotes: [] };
  }

  // Prioritize mobile -> landline -> fax
  const primary =
    found.find((item) => item.kind === 'mobile') ||
    found.find((item) => item.kind === 'landline') ||
    found[0];

  const primaryPhoneRaw = primary.display.replace(/[^0-9+]/g, '');
  const extraNotes: string[] = [];

  for (const item of found) {
    if (item.normalized === primary.normalized) continue;
    if (item.kind === 'fax') {
      extraNotes.push(`팩스: ${item.display}`);
    } else if (item.kind === 'mobile') {
      extraNotes.push(`보조 연락처: ${item.display}`);
    } else {
      extraNotes.push(`유선전화: ${item.display}`);
    }
  }

  return {
    primaryPhone: primary.display,
    primaryPhoneRaw,
    extraNotes,
  };
}

function stripContactTokensFromLine(line: string): string {
  return line
    .replace(EMAIL_REGEX, ' ')
    .replace(URL_REGEX, ' ')
    .replace(PHONE_CANDIDATE_REGEX, ' ')
    .replace(/\b(?:tel|fax|mobile|cell|mob|email|e-mail|web|url|hp|h\.p|t|f|m)\b\s*[.:|/-]?/gi, ' ')
    .replace(/^(?:전화|팩스|휴대폰|이메일|홈페이지)\s*[.:|/-]?\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findKoreanTitleInText(text: string): string | null {
  for (const title of KOREAN_TITLES) {
    if (text.includes(title)) {
      return title;
    }
  }
  return null;
}

function isLikelyKoreanName(token: string): boolean {
  const compact = token.replace(/\s+/g, '');
  if (!/^[가-힣]{2,4}$/.test(compact)) return false;
  if (KOREAN_NON_NAME_WORDS.has(compact)) return false;
  if (KOREAN_TITLES.some((t) => compact === t || compact.endsWith(t))) return false;
  if (KOREAN_CORPORATE_MARKERS.some((m) => compact.includes(m))) return false;

  // 3-char names almost always begin with a recognized Korean surname
  if (compact.length === 3 && !KOREAN_VALID_SURNAMES.has(compact[0])) {
    return false;
  }
  return true;
}

function isLikelyEnglishName(line: string): boolean {
  const cleaned = line
    .replace(/^(?:Dr|Mr|Ms|Mrs|Prof)\.?\s+/i, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length > 42) return false;
  if (ENGLISH_CORPORATE_REGEX.test(cleaned)) return false;
  if (ENGLISH_TITLES_REGEX.test(cleaned)) return false;
  if (ENGLISH_ADDRESS_OR_NOISE_REGEX.test(cleaned)) return false;
  if (/[0-9@:/]/.test(cleaned)) return false;

  const words = cleaned.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;

  return words.every((w) => /^[A-Za-z][A-Za-z.'-]{0,20}$/.test(w));
}

function isAllCapsBanner(line: string): boolean {
  const letters = line.replace(/[^A-Za-z]/g, '');
  return letters.length >= 6 && letters === letters.toUpperCase();
}

/**
 * Parses raw multi-line OCR text from Korean and English business cards
 * into structured contact card fields.
 */
export function parseBusinessCardText(rawText: string): ParsedCardFields {
  const rawLines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((l) => l.length > 0);

  const email = extractEmail(rawText);
  const website = extractWebsite(rawText, email);
  const { primaryPhone, primaryPhoneRaw, extraNotes } = extractPhoneNumbers(rawLines);

  let company = '';
  let title = '';
  let nameKr = '';
  let nameEn = '';
  let address = '';

  const residualSegments: string[] = [];

  for (const originalLine of rawLines) {
    const cleaned = stripContactTokensFromLine(originalLine);
    if (!cleaned || cleaned.length < 2) continue;

    // Address detection
    if (!address && KOREAN_ADDRESS_REGEX.test(cleaned)) {
      address = cleaned;
      continue;
    }

    // Split on middot/slash/pipe separators so combined lines like "박기홍 · 대표 마스터" parse cleanly
    const parts = cleaned
      .split(/\s*[·•|/]\s*/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      residualSegments.push(part);
    }
  }

  const remainingAfterCompanyAndTitle: string[] = [];

  for (const segment of residualSegments) {
    const hasKrCorp = KOREAN_CORPORATE_MARKERS.some((marker) => segment.includes(marker));
    const hasEnCorp = ENGLISH_CORPORATE_REGEX.test(segment);
    const krTitleMatch = findKoreanTitleInText(segment);
    const enTitleMatch = segment.match(ENGLISH_TITLES_REGEX);

    // Handle combined Korean "홍길동 대표이사" or "대표이사 홍길동"
    if (krTitleMatch && !hasKrCorp) {
      const remainder = segment.replace(krTitleMatch, '').trim();
      const compactRemainder = remainder.replace(/\s+/g, '');
      const hasDeptKeyword = /(?:기획|전략|마케팅|영업|개발|디자인|인사|총무|재무|회계|연구|기술|사업|서비스|운영|지원|관리|생산|품질|홍보)/.test(
        compactRemainder
      );
      if (
        !hasDeptKeyword &&
        compactRemainder.length >= 2 &&
        compactRemainder.length <= 3 &&
        isLikelyKoreanName(compactRemainder)
      ) {
        if (!nameKr) nameKr = compactRemainder;
        if (!title) title = krTitleMatch;
        continue;
      }
    }

    // Check corporate markers first unless it's clearly just a short title
    if (!company && (hasKrCorp || hasEnCorp)) {
      company = segment;
      continue;
    }

    // Job title detection
    if ((krTitleMatch || enTitleMatch) && segment.length <= 45) {
      if (!title) {
        title = segment;
      } else if (!company && segment !== title && !enTitleMatch && !krTitleMatch) {
        company = segment;
      }
      continue;
    }

    remainingAfterCompanyAndTitle.push(segment);
  }

  // Extract Korean and English names from remaining candidates
  const leftoverForCompanyFallback: string[] = [];

  for (const segment of remainingAfterCompanyAndTitle) {
    const compactKr = segment.replace(/\s+/g, '');

    // Check Korean 2-4 char name
    if (!nameKr && isLikelyKoreanName(compactKr)) {
      nameKr = compactKr;
      continue;
    }

    // Check English name (avoid grabbing an all-caps company banner like "GLOBAL HERITAGE FOUNDATION" if all-caps & 3+ words)
    if (!nameEn && isLikelyEnglishName(segment)) {
      const wordCount = segment.trim().split(/\s+/).length;
      const looksLikeOrgBanner = isAllCapsBanner(segment) && wordCount >= 3 && !segment.includes(',');
      if (!looksLikeOrgBanner) {
        nameEn = segment;
        continue;
      }
    }

    leftoverForCompanyFallback.push(segment);
  }

  // If company wasn't caught by explicit suffix markers, pick best remaining organization candidate
  if (!company) {
    const candidate = leftoverForCompanyFallback.find(
      (seg) =>
        seg.length >= 2 &&
        seg.length <= 50 &&
        !TEL_LABEL_REGEX.test(seg) &&
        !ENGLISH_ADDRESS_OR_NOISE_REGEX.test(seg) &&
        !/^\d+$/.test(seg)
    );
    if (candidate) {
      company = candidate;
    }
  }

  const primaryName = nameKr || nameEn;
  const secondaryNameEn = nameKr && nameEn ? nameEn : '';

  return {
    name: primaryName,
    nameEn: secondaryNameEn,
    company,
    title,
    phone: primaryPhone,
    phoneRaw: primaryPhoneRaw,
    email,
    website,
    address,
    extraNotes,
    rawLines,
  };
}

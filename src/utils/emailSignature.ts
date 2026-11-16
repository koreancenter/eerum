import QRCode from 'qrcode';
import { StoredCard } from '@/types/card';
import { getCardDisplayUrl, getCardShareUrl } from './cardSerializer';
import { escapeHtmlText } from './sanitizeHtml';
import { sanitizeExternalUrl } from './sanitizeUrl';

export type EmailSignatureTheme = 'light' | 'dark';

export interface EmailSignatureOptions {
  theme?: EmailSignatureTheme;
  includeQrBadge?: boolean;
  qrDataUrl?: string;
}

export interface EmailSignatureBundle {
  html: string;
  plainText: string;
  shareUrl: string;
}

function normalizeDisplayPhoneHref(phoneRaw?: string, phone?: string): string {
  const cleaned = (phoneRaw || phone || '').replace(/[^0-9+]/g, '');
  return cleaned;
}

function buildMetaLine(card: StoredCard): {
  primaryName: string;
  secondaryName: string;
  roleLine: string;
  companyLine: string;
  phone: string;
  phoneHref: string;
  email: string;
  website: string;
  websiteDisplay: string;
  shareUrl: string;
  shareDisplayUrl: string;
} {
  const d = card.data;
  const primaryName = (d.name || d.nameKr || '디지털 명함').trim();
  const secondaryCandidate = (
    d.nameEn ||
    d.details?.en_name ||
    (d.name ? d.nameKr : '') ||
    ''
  ).trim();
  const secondaryName =
    secondaryCandidate && secondaryCandidate.toLowerCase() !== primaryName.toLowerCase()
      ? secondaryCandidate
      : '';

  const primaryTitle = (d.titleKr || d.title || '').trim();
  const secondaryTitle = (d.titleKr && d.title ? d.title : '').trim();
  const roleLine =
    secondaryTitle && secondaryTitle.toLowerCase() !== primaryTitle.toLowerCase()
      ? `${primaryTitle} · ${secondaryTitle}`
      : primaryTitle;

  const primaryOrg = (d.organizationKr || d.organization || '').trim();
  const secondaryOrg = (d.organizationKr && d.organization ? d.organization : '').trim();
  const subOrg = (d.subOrg || d.details?.sub_org || '').trim();
  const companyParts: string[] = [];
  if (primaryOrg) companyParts.push(primaryOrg);
  if (
    secondaryOrg &&
    !companyParts.some((p) => p.toLowerCase() === secondaryOrg.toLowerCase())
  ) {
    companyParts.push(secondaryOrg);
  }
  if (subOrg && !companyParts.some((p) => p.toLowerCase() === subOrg.toLowerCase())) {
    companyParts.push(subOrg);
  }
  const companyLine = companyParts.join(' · ');

  const phone = (d.phone || d.phoneRaw || '').trim();
  const phoneHref = normalizeDisplayPhoneHref(d.phoneRaw, d.phone);
  const email = (d.email || '').trim();

  const shareUrl = getCardShareUrl(card);
  const shareDisplayUrl = getCardDisplayUrl(card) || shareUrl.replace(/^https?:\/\//i, '');

  const rawWebsite = sanitizeExternalUrl(d.website);
  const website = rawWebsite || shareUrl;
  const websiteDisplay =
    (d.websiteDisplay || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '') ||
    website.replace(/^https?:\/\//i, '').replace(/\/$/, '');

  return {
    primaryName,
    secondaryName,
    roleLine,
    companyLine,
    phone,
    phoneHref,
    email,
    website,
    websiteDisplay,
    shareUrl,
    shareDisplayUrl,
  };
}

export async function generateSignatureQrDataUrl(
  shareUrl: string,
  theme: EmailSignatureTheme = 'light'
): Promise<string> {
  return QRCode.toDataURL(shareUrl, {
    width: 144,
    margin: 1,
    color: {
      dark: theme === 'dark' ? '#FAFAFA' : '#111113',
      light: theme === 'dark' ? '#141416' : '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}

export function buildEmailSignaturePlainText(card: StoredCard): string {
  const info = buildMetaLine(card);
  const lines: string[] = [];

  lines.push(
    info.secondaryName ? `${info.primaryName} (${info.secondaryName})` : info.primaryName
  );
  const roleOrg = [info.roleLine, info.companyLine].filter(Boolean).join(' · ');
  if (roleOrg) {
    lines.push(roleOrg);
  }

  const contactBits: string[] = [];
  if (info.phone) contactBits.push(`M. ${info.phone}`);
  if (info.email) contactBits.push(`E. ${info.email}`);
  if (contactBits.length > 0) {
    lines.push(contactBits.join('  |  '));
  }

  if (info.website && info.website !== info.shareUrl) {
    lines.push(`W. ${info.websiteDisplay}`);
  }
  lines.push(`Digital Card: ${info.shareUrl}`);

  return lines.join('\n');
}

/**
 * Generates a strict inline-styled HTML table email signature compatible with
 * Gmail, Apple Mail, and Outlook (desktop & web).
 */
export function buildEmailSignatureHtml(
  card: StoredCard,
  options: EmailSignatureOptions = {}
): string {
  const theme: EmailSignatureTheme = options.theme === 'dark' ? 'dark' : 'light';
  const includeQrBadge = options.includeQrBadge ?? true;
  const info = buildMetaLine(card);

  const isDark = theme === 'dark';
  const bgCard = isDark ? '#111113' : '#FFFFFF';
  const borderCard = isDark ? '#27272A' : '#E4E4E7';
  const textPrimary = isDark ? '#F4F4F5' : '#111113';
  const textSecondary = isDark ? '#A1A1AA' : '#52525B';
  const textMuted = isDark ? '#71717A' : '#71717A';
  const dividerColor = isDark ? '#27272A' : '#E4E4E7';
  const badgeBg = isDark ? '#1C1C20' : '#F5F2EC';
  const badgeBorder = isDark ? '#3F3F46' : '#D6D3CE';
  const badgeText = isDark ? '#F4F4F5' : '#18181B';

  const safeName = escapeHtmlText(info.primaryName);
  const safeNameEn = escapeHtmlText(info.secondaryName);
  const safeRole = escapeHtmlText(info.roleLine);
  const safeCompany = escapeHtmlText(info.companyLine);
  const safePhone = escapeHtmlText(info.phone);
  const safePhoneHref = escapeHtmlText(info.phoneHref);
  const safeEmail = escapeHtmlText(info.email);
  const safeWebsiteHref = escapeHtmlText(info.website);
  const safeWebsiteDisplay = escapeHtmlText(info.websiteDisplay);
  const safeShareUrl = escapeHtmlText(info.shareUrl);
  const safeShareDisplay = escapeHtmlText(info.shareDisplayUrl);

  const roleCompanyCombined = [safeRole, safeCompany].filter(Boolean).join(' &middot; ');

  const contactRows: string[] = [];
  if (safePhone) {
    const phoneNode = safePhoneHref
      ? `<a href="tel:${safePhoneHref}" style="color:${textPrimary};text-decoration:none;font-weight:500;">${safePhone}</a>`
      : `<span style="color:${textPrimary};font-weight:500;">${safePhone}</span>`;
    contactRows.push(
      `<tr><td style="padding:2px 0;font-size:12px;line-height:18px;color:${textSecondary};">` +
        `<span style="display:inline-block;width:16px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:10px;letter-spacing:0.06em;color:${textMuted};font-weight:600;">T</span>` +
        `${phoneNode}</td></tr>`
    );
  }
  if (safeEmail) {
    contactRows.push(
      `<tr><td style="padding:2px 0;font-size:12px;line-height:18px;color:${textSecondary};">` +
        `<span style="display:inline-block;width:16px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:10px;letter-spacing:0.06em;color:${textMuted};font-weight:600;">E</span>` +
        `<a href="mailto:${safeEmail}" style="color:${textPrimary};text-decoration:none;">${safeEmail}</a></td></tr>`
    );
  }
  if (safeWebsiteHref && info.website !== info.shareUrl) {
    contactRows.push(
      `<tr><td style="padding:2px 0;font-size:12px;line-height:18px;color:${textSecondary};">` +
        `<span style="display:inline-block;width:16px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:10px;letter-spacing:0.06em;color:${textMuted};font-weight:600;">W</span>` +
        `<a href="${safeWebsiteHref}" target="_blank" rel="noopener noreferrer" style="color:${textPrimary};text-decoration:none;">${safeWebsiteDisplay}</a></td></tr>`
    );
  }

  const qrImageTag =
    includeQrBadge && options.qrDataUrl && /^data:image\/png;base64,/i.test(options.qrDataUrl)
      ? `<a href="${safeShareUrl}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;border:0;">` +
        `<img src="${options.qrDataUrl}" width="72" height="72" alt="${safeName} 디지털 명함 QR" style="display:block;width:72px;height:72px;border:1px solid ${badgeBorder};border-radius:8px;background:${bgCard};padding:3px;" />` +
        `</a>`
      : '';

  const qrRightColumn = includeQrBadge
    ? `<td valign="middle" align="center" style="padding:0 0 0 16px;border-left:1px solid ${dividerColor};vertical-align:middle;text-align:center;width:96px;">` +
      (qrImageTag
        ? `${qrImageTag}<div style="margin-top:5px;font-family:'SFMono-Regular',Consolas,monospace;font-size:9px;letter-spacing:0.08em;color:${textMuted};line-height:12px;text-transform:uppercase;">` +
          `<a href="${safeShareUrl}" target="_blank" rel="noopener noreferrer" style="color:${textSecondary};text-decoration:none;font-weight:600;">QR &middot; 명함 열기</a></div>`
        : `<a href="${safeShareUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 12px;border-radius:8px;background-color:${badgeBg};border:1px solid ${badgeBorder};color:${badgeText};font-size:11px;font-weight:600;text-decoration:none;line-height:15px;">디지털 명함<br/><span style="font-size:9px;font-weight:500;color:${textMuted};">바로 열기 &#8599;</span></a>`) +
      `</td>`
    : '';

  return (
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:${bgCard};border:1px solid ${borderCard};border-radius:12px;max-width:560px;width:100%;mso-table-lspace:0pt;mso-table-rspace:0pt;">` +
    `<tbody><tr><td style="padding:16px 18px;">` +
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:100%;">` +
    `<tbody><tr>` +
    `<td valign="top" style="padding:0;vertical-align:top;">` +
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:100%;">` +
    `<tbody>` +
    `<tr><td style="padding:0 0 2px 0;font-size:16px;line-height:22px;font-weight:700;color:${textPrimary};letter-spacing:-0.01em;">${safeName}${
      safeNameEn
        ? ` <span style="font-size:12px;font-weight:500;color:${textSecondary};letter-spacing:0.01em;">&nbsp;${safeNameEn}</span>`
        : ''
    }</td></tr>` +
    (roleCompanyCombined
      ? `<tr><td style="padding:0 0 10px 0;font-size:12px;line-height:17px;font-weight:500;color:${textSecondary};border-bottom:1px solid ${dividerColor};">${roleCompanyCombined}</td></tr>`
      : `<tr><td style="padding:0 0 8px 0;border-bottom:1px solid ${dividerColor};font-size:1px;line-height:1px;">&nbsp;</td></tr>`) +
    `<tr><td style="padding:8px 0 0 0;"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tbody>${contactRows.join('')}</tbody></table></td></tr>` +
    `<tr><td style="padding:8px 0 0 0;">` +
    `<a href="${safeShareUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:5px 10px;border-radius:6px;background-color:${badgeBg};border:1px solid ${badgeBorder};color:${badgeText};font-size:11px;line-height:15px;font-weight:600;text-decoration:none;">&#9670;&nbsp;디지털 명함 보기 &middot; <span style="font-family:'SFMono-Regular',Consolas,monospace;font-weight:500;">${safeShareDisplay}</span> &#8599;</a>` +
    `</td></tr>` +
    `</tbody></table>` +
    `</td>` +
    qrRightColumn +
    `</tr></tbody></table>` +
    `</td></tr></tbody></table>`
  );
}

export async function generateEmailSignatureBundle(
  card: StoredCard,
  options: EmailSignatureOptions = {}
): Promise<EmailSignatureBundle> {
  const shareUrl = getCardShareUrl(card);
  const theme = options.theme ?? 'light';
  const includeQrBadge = options.includeQrBadge ?? true;

  let qrDataUrl = options.qrDataUrl;
  if (includeQrBadge && !qrDataUrl) {
    try {
      qrDataUrl = await generateSignatureQrDataUrl(shareUrl, theme);
    } catch {
      qrDataUrl = undefined;
    }
  }

  return {
    html: buildEmailSignatureHtml(card, {
      theme,
      includeQrBadge,
      qrDataUrl,
    }),
    plainText: buildEmailSignaturePlainText(card),
    shareUrl,
  };
}

/**
 * Copies the formatted signature as Rich HTML (`text/html` + `text/plain`) so it can
 * be pasted directly into Gmail, Apple Mail, or Outlook settings.
 */
export async function copyRichEmailSignature(
  html: string,
  plainText: string
): Promise<'rich' | 'execCommand' | 'text'> {
  if (
    typeof navigator !== 'undefined' &&
    typeof ClipboardItem !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function'
  ) {
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
      return 'rich';
    } catch {
      // Fallback below
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const container = document.createElement('div');
      container.setAttribute('contenteditable', 'true');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.opacity = '0';
      container.innerHTML = html;
      document.body.appendChild(container);

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(container);
      selection?.removeAllRanges();
      selection?.addRange(range);

      const copied = document.execCommand('copy');
      selection?.removeAllRanges();
      document.body.removeChild(container);
      if (copied) {
        return 'execCommand';
      }
    } catch {
      // Fallback to plain text clipboard write
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(html);
  }
  return 'text';
}

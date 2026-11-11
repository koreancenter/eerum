import { CardData, CardTheme, StoredCard } from '../types/card';
import { sanitizeHtml, escapeHtmlText } from './sanitizeHtml';
import { CARD_DATA } from '../constants/sampleCards';
import { APP_BASE_URL } from './cardSerializer';

export interface VCardOptions {
  includeRevision?: boolean;
}

export interface HtmlExportOptions {
  includeQr?: boolean;
  theme?: CardTheme;
}

export class CardExporter {
  /**
   * RFC-6350 / RFC-2426 Compliant vCard 3.0 String Generator
   */
  static toVCard(
    data: CardData = CARD_DATA,
    options: VCardOptions = { includeRevision: true }
  ): string {
    let name = (data.name || data.nameKr || '').trim();
    let nameEn = (data.nameEn || data.details?.en_name || '').trim();
    if (name.includes(',') && name.length > 2) {
      name = name.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (nameEn.includes(',') && nameEn.length > 2) {
      nameEn = nameEn.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const org = (data.organization || data.organizationKr || '').trim();
    const subOrg = (data.subOrg || data.details?.sub_org || '').trim();
    const title = (data.title || data.titleKr || '').trim();
    const phone = (data.phoneRaw || data.phone || '').trim();
    const email = (data.email || '').trim();
    const website = (data.website || '').trim();
    const address = (data.addressKr || data.address_en || data.addressEn || '').trim();

    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name || nameEn || 'Digital Contact'}`,
      `N:${name || nameEn || 'Contact'};;;;`,
    ];

    if (org) {
      lines.push(subOrg ? `ORG:${org};${subOrg}` : `ORG:${org}`);
    }
    if (title) lines.push(`TITLE:${title}`);
    if (phone) lines.push(`TEL;TYPE=CELL,VOICE:${phone}`);
    if (email) lines.push(`EMAIL;TYPE=INTERNET,PREF:${email}`);
    if (website) lines.push(`URL:${website}`);
    if (address) lines.push(`ADR;TYPE=WORK:;;${address};;;;`);

    if (options.includeRevision) {
      lines.push(`REV:${new Date().toISOString()}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  /**
   * Triggers browser download of RFC-compliant .vcf card file
   */
  static downloadVCard(data: CardData = CARD_DATA): void {
    const vcardContent = this.toVCard(data);
    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeFilename = (data.name || data.nameKr || 'contact')
      .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
      .toLowerCase();
    link.download = `${safeFilename}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Compiles portable, single-file HTML bundle with embedded dark mode styling and QR connection
   */
  static toStandaloneHtml(
    data: CardData,
    theme: CardTheme = 'pure_white',
    options: HtmlExportOptions = {}
  ): string {
    const primaryName = (data.name || data.nameKr || '').trim();
    const subName = (data.nameEn || data.details?.en_name || '').trim();

    const primaryOrg = (data.organization || data.organizationKr || '').trim();
    const rawSubOrg = (data.organization && data.organizationKr ? data.organizationKr : '').trim();
    const subOrgLabel =
      rawSubOrg && rawSubOrg.toLowerCase() !== primaryOrg.toLowerCase() ? rawSubOrg : '';

    const primaryTitle = (data.title || data.titleKr || '').trim();
    const rawSubTitle = (data.title && data.titleKr ? data.titleKr : '').trim();
    const subTitle =
      rawSubTitle && rawSubTitle.toLowerCase() !== primaryTitle.toLowerCase() ? rawSubTitle : '';

    const vcardString = this.toVCard(data);
    const vcardEncoded = encodeURIComponent(vcardString);
    const nameTitlePart = subName
      ? `${escapeHtmlText(primaryName)} (${escapeHtmlText(subName)})`
      : escapeHtmlText(primaryName);
    const pageTitle = primaryOrg
      ? `${nameTitlePart} — ${escapeHtmlText(primaryOrg)}`
      : nameTitlePart;
    const pageDesc = `${escapeHtmlText(
      [data.organizationKr || primaryOrg, data.titleKr || primaryTitle, primaryName]
        .filter(Boolean)
        .join(' ')
    )}의 디지털 명함입니다.`;
    const rawUrl = (data.website || 'https://eerum.goguma.app/master').trim();
    const officialUrl = /^https?:\/\//i.test(rawUrl) ? escapeHtmlText(rawUrl) : 'https://eerum.goguma.app/master';
    const safePhoneHref = escapeHtmlText((data.phoneRaw || '').replace(/[^0-9+]/g, ''));
    const safeEmailHref = escapeHtmlText((data.email || '').trim());
    const safeWhatsappUrl = /^https?:\/\//i.test(data.whatsappUrl || '') ? escapeHtmlText(data.whatsappUrl!) : '';

    const themeColors: Record<string, { bg: string; text: string; textSec: string; border: string; accent: string }> = {
      pure_white: { bg: '#F5F2EC', text: '#1C1B1A', textSec: '#787571', border: 'rgba(28,27,26,0.10)', accent: '#1C1B1A' },
      sumi_ink: { bg: '#0A0A0B', text: '#FAFAFA', textSec: '#A1A1AA', border: 'rgba(255,255,255,0.10)', accent: '#FAFAFA' },
      warm_paper: { bg: '#F5F5F4', text: '#121214', textSec: '#52525B', border: 'rgba(0,0,0,0.06)', accent: '#121214' },
      deep_forest: { bg: '#0D1914', text: '#FAFAFA', textSec: '#A1A1AA', border: 'rgba(255,255,255,0.10)', accent: '#E4E4E7' },
      classic_navy: { bg: '#0B101B', text: '#FAFAFA', textSec: '#A1A1AA', border: 'rgba(255,255,255,0.10)', accent: '#E4E4E7' },
      sand: { bg: '#F5F5F4', text: '#121214', textSec: '#52525B', border: 'rgba(0,0,0,0.06)', accent: '#121214' },
      cotton: { bg: '#F5F2EC', text: '#1C1B1A', textSec: '#787571', border: 'rgba(28,27,26,0.10)', accent: '#1C1B1A' },
      obsidian: { bg: '#121214', text: '#FAFAFA', textSec: '#A1A1AA', border: 'rgba(255,255,255,0.10)', accent: '#FAFAFA' },
      titanium: { bg: '#18181B', text: '#FAFAFA', textSec: '#A1A1AA', border: 'rgba(255,255,255,0.10)', accent: '#A1A1AA' },
      navy: { bg: '#0B101B', text: '#FAFAFA', textSec: '#A1A1AA', border: 'rgba(255,255,255,0.10)', accent: '#E4E4E7' },
      emerald: { bg: '#0D1914', text: '#FAFAFA', textSec: '#A1A1AA', border: 'rgba(255,255,255,0.10)', accent: '#E4E4E7' },
      slate: { bg: '#121214', text: '#FAFAFA', textSec: '#A1A1AA', border: 'rgba(255,255,255,0.10)', accent: '#A1A1AA' },
    };

    const targetTheme = options.theme || theme;
    const selectedTheme = themeColors[targetTheme] || themeColors.pure_white;

    return `<!DOCTYPE html>
<html lang="ko" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDesc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${officialUrl}">

  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

  <style>
    .perspective-1200 { perspective: 1200px; }
    .transform-style-3d { transform-style: preserve-3d; }
    .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
    .rotate-y-180 { transform: rotateY(180deg); }
  </style>
</head>
<body class="bg-[#0A0A0B] text-neutral-100 min-h-screen flex flex-col justify-between items-center selection:bg-neutral-100 selection:text-neutral-900 font-sans">

  <!-- Minimalist Brand Header -->
  <header class="w-full border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between no-print">
    <div class="flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
      <span class="text-xs font-semibold tracking-widest uppercase text-white/80">EERUM DIGITAL PASS</span>
    </div>
    <div class="text-[11px] font-mono text-zinc-400">
      <span>${escapeHtmlText(primaryOrg || 'KOREAN CENTER')}</span>
    </div>
  </header>

  <!-- Main Viewport -->
  <main class="flex-1 flex flex-col items-center justify-center p-4 max-w-xl w-full">
    
    <div class="flex items-center justify-between w-full max-w-[360px] sm:max-w-[400px] mb-3 no-print text-xs text-zinc-400">
      <span class="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">DIGITAL PASS</span>
      <button id="flip-btn" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121214] border border-white/10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        <span>뒷면 회전</span>
      </button>
    </div>

    <!-- 3D Card Object Canvas -->
    <div class="w-full max-w-[360px] sm:max-w-[400px] perspective-1200 cursor-pointer select-none" id="card-wrapper">
      <div id="card-inner" class="relative w-full aspect-[5/8] rounded-2xl transform-style-3d transition-transform duration-700 shadow-2xl" style="background-color: ${selectedTheme.bg}; border: 1px solid ${selectedTheme.border}; color: ${selectedTheme.text};">
        
        <!-- CARD FRONT -->
        <div class="absolute inset-0 w-full h-full p-6 sm:p-7 flex flex-col justify-between backface-hidden rounded-2xl overflow-hidden" style="background-color: ${selectedTheme.bg}; color: ${selectedTheme.text};">
          <div>
            ${subOrgLabel && subOrgLabel !== primaryOrg ? `<p class="text-[10px] tracking-tight font-medium" style="color: ${selectedTheme.textSec};">${escapeHtmlText(subOrgLabel)}</p>` : ''}
            ${primaryOrg ? `<h2 class="text-sm font-semibold tracking-tight">${escapeHtmlText(primaryOrg)}</h2>` : ''}
            ${data.subOrg && data.subOrg.trim() !== primaryOrg && data.subOrg.trim() !== subOrgLabel ? `<p class="text-[9px] font-semibold tracking-[0.2em] uppercase mt-0.5" style="color: ${selectedTheme.textSec};">${escapeHtmlText(data.subOrg)}</p>` : ''}
          </div>

          <div class="my-auto py-4 space-y-1">
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">${escapeHtmlText(primaryName)}</h1>
            ${subName && subName !== primaryName ? `<p class="text-xs font-mono tracking-wider" style="color: ${selectedTheme.textSec};">${escapeHtmlText(subName)}</p>` : ''}
            ${primaryTitle ? `<p class="text-xs pt-1 font-medium">${escapeHtmlText(primaryTitle)}${subTitle && subTitle !== primaryTitle ? ` <span style="color: ${selectedTheme.textSec};">(${escapeHtmlText(subTitle)})</span>` : ''}</p>` : ''}
          </div>

          <div class="space-y-2 pt-4 text-xs" style="border-top: 1px solid ${selectedTheme.border};">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px]" style="color: ${selectedTheme.textSec};">MOBILE</span>
              <a href="tel:${safePhoneHref}" class="hover:opacity-75 transition-opacity">${escapeHtmlText(data.phone || '')}</a>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px]" style="color: ${selectedTheme.textSec};">EMAIL</span>
              <a href="mailto:${safeEmailHref}" class="hover:opacity-75 transition-opacity">${escapeHtmlText(data.email || '')}</a>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px]" style="color: ${selectedTheme.textSec};">WEB</span>
              <a href="${officialUrl}" target="_blank" rel="noopener noreferrer" class="hover:opacity-75 transition-opacity font-medium">${escapeHtmlText(data.websiteDisplay || '')}</a>
            </div>
          </div>
        </div>

        <!-- CARD BACK -->
        <div class="absolute inset-0 w-full h-full p-6 sm:p-7 flex flex-col justify-between backface-hidden rotate-y-180 rounded-2xl overflow-hidden" style="background-color: ${selectedTheme.bg}; color: ${selectedTheme.text};">
          <div class="my-auto text-center space-y-2">
            <h2 class="text-lg sm:text-xl font-semibold tracking-[0.14em] uppercase">${escapeHtmlText(data.backTitle || primaryOrg || 'GOGUMA KNOWLEDGE OFFICE')}</h2>
            <p class="text-[10px] font-medium uppercase tracking-[0.24em]" style="color: ${selectedTheme.textSec};">${escapeHtmlText(data.backSubtitle || data.backTagline || 'KOREAN CENTER GLOBAL NETWORK')}</p>
          </div>

          <div class="pt-4 flex flex-col items-center text-center space-y-2" style="border-top: 1px solid ${selectedTheme.border};">
            <div id="qrcode-container" class="p-2 bg-[#FAFAFA] border border-black/5 rounded-xl shadow-md w-20 h-20 flex items-center justify-center"></div>
            <p class="font-mono text-[9px]" style="color: ${selectedTheme.textSec};">SCAN TO CONNECT</p>
            <p class="text-xs font-medium">${escapeHtmlText(data.websiteDisplay || '')}</p>
          </div>
        </div>

      </div>
    </div>

    <!-- Centered Action Dock -->
    <div class="w-full max-w-[360px] sm:max-w-[400px] mt-4 flex items-center justify-center flex-wrap gap-2 text-neutral-400 no-print">
      <a href="data:text/vcard;charset=utf-8,${vcardEncoded}" download="${escapeHtmlText(data.name || 'card')}.vcf" class="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:text-white hover:border-neutral-700 transition-colors" title="주소록에 연락처 저장">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
      </a>
      <a href="tel:${safePhoneHref}" class="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:text-white hover:border-neutral-700 transition-colors" title="전화 걸기">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
      </a>
      <a href="${safeWhatsappUrl}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:text-white hover:border-neutral-700 transition-colors" title="WhatsApp 대화">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
      </a>
      <a href="mailto:${safeEmailHref}" class="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:text-white hover:border-neutral-700 transition-colors" title="이메일 보내기">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
      </a>
      <a href="${officialUrl}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:text-white hover:border-neutral-700 transition-colors" title="공식 웹사이트">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
      </a>
      <button id="share-btn" class="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer" title="링크 공유">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
      </button>
    </div>

  </main>

  <footer class="py-6 px-4 text-center text-[11px] text-neutral-400 no-print">
    <p>© ${new Date().getFullYear()} ${escapeHtmlText(data.organization || '')}. Distributed via Self-Hosted Digital Pass.</p>
  </footer>

  <script>
    let isFlipped = false;
    const cardInner = document.getElementById('card-inner');
    const cardWrapper = document.getElementById('card-wrapper');
    const flipBtn = document.getElementById('flip-btn');

    function toggleFlip() {
      isFlipped = !isFlipped;
      cardInner.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
      flipBtn.querySelector('span').textContent = isFlipped ? '앞면 회전' : '뒷면 회전';
    }

    cardWrapper.addEventListener('click', toggleFlip);
    flipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFlip();
    });

    document.getElementById('share-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const shareData = {
        title: ${JSON.stringify(`${data.name || ''} — ${data.organization || ''}`).replace(/</g, '\\u003c')},
        text: ${JSON.stringify(`${data.organizationKr || ''} ${data.titleKr || ''} ${data.name || ''}의 디지털 명함입니다.`).replace(/</g, '\\u003c')},
        url: window.location.href
      };
      if (navigator.share) {
        try { await navigator.share(shareData); } catch (err) {}
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('명함 링크가 클립보드에 복사되었습니다.');
      }
    });

    window.addEventListener('DOMContentLoaded', () => {
      if (window.QRCode) {
        new QRCode(document.getElementById("qrcode-container"), {
          text: ${JSON.stringify(/^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://eerum.goguma.app/master').replace(/</g, '\\u003c')},
          width: 72,
          height: 72,
          colorDark : "#0a0a0c",
          colorLight : "#ffffff",
          correctLevel : QRCode.CorrectLevel.M
        });
      }
    });
  </script>
</body>
</html>`;
  }
}

export const generateVCard = (data: CardData = CARD_DATA): string => CardExporter.toVCard(data);
export const downloadVCard = (data: CardData = CARD_DATA): void => CardExporter.downloadVCard(data);
export const generateStandaloneHtml = (data: CardData, theme: CardTheme = 'pure_white'): string =>
  CardExporter.toStandaloneHtml(data, theme);

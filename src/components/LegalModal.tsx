import React, { useState, useEffect, useRef } from 'react';
import { X, Code2, ShieldCheck, FileText } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';

export type LegalDocType = 'privacy' | 'terms' | 'licenses';

interface LegalModalProps {
  isOpen: boolean;
  initialDoc?: LegalDocType;
  onClose: () => void;
}

interface OpenSourceLicense {
  name: string;
  license: string;
  copyright: string;
  description: string;
  url?: string;
}

const OPEN_SOURCE_LICENSES: OpenSourceLicense[] = [
  {
    name: 'React & React DOM',
    license: 'MIT',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
    url: 'https://react.dev',
  },
  {
    name: 'Tailwind CSS',
    license: 'MIT',
    copyright: 'Copyright (c) Tailwind Labs, Inc.',
    description: 'A utility-first CSS framework for rapid and modular UI development.',
    url: 'https://tailwindcss.com',
  },
  {
    name: 'Lucide React',
    license: 'ISC',
    copyright: 'Copyright (c) Lucide Contributors / Cole Bemis',
    description: 'Beautiful, clean, and consistent iconography component collection.',
    url: 'https://lucide.dev',
  },
  {
    name: 'Framer Motion',
    license: 'MIT',
    copyright: 'Copyright (c) 2018 Framer B.V.',
    description: 'A production-ready motion library for interactive React animations and gestures.',
    url: 'https://www.framer.com/motion',
  },
  {
    name: 'DOMPurify',
    license: 'Apache-2.0 / MPL-2.0',
    copyright: 'Copyright (c) 2024 Dr.-Ing. Mario Heiderich, Cure53',
    description: 'DOM-only, super-fast, ultra-tolerant XSS sanitizer for HTML and SVG.',
    url: 'https://github.com/cure53/DOMPurify',
  },
  {
    name: 'QRCode',
    license: 'MIT',
    copyright: 'Copyright (c) 2012 Ryan Day',
    description: 'High-performance offline QR code 2D matrix barcode generator.',
    url: 'https://github.com/soldair/node-qrcode',
  },
  {
    name: 'Vite & Express',
    license: 'MIT',
    copyright: 'Vite: Copyright (c) 2019-present Yuxi (Evan) You and Vite contributors / Express: Copyright (c) StrongLoop, Inc.',
    description: 'Next-generation modern web tooling and minimal, flexible Node.js web server.',
    url: 'https://vite.dev',
  },
];

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialDoc = 'privacy',
  onClose,
}) => {
  const { isEn, t } = useLocale();
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveDoc(initialDoc);
    }
  }, [isOpen, initialDoc]);

  const handleSelectDoc = (doc: LegalDocType) => {
    setActiveDoc(doc);
    if (scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = 0;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-[85vh] sm:h-[80vh] max-h-[640px] min-h-[460px] max-sm:min-h-[min(480px,85dvh)] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-[var(--app-shadow)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header with Mobile-Iconified Segmented Switcher & Close */}
        <div className="shrink-0 flex-shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--app-border)] flex items-center justify-between bg-[var(--app-bg)]">
          <div role="tablist" aria-label={isEn ? 'Select legal document' : '약관 및 정책 문서 선택'} className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={activeDoc === 'privacy'}
              onClick={() => handleSelectDoc('privacy')}
              title={t.footer.privacy}
              aria-label={t.footer.privacy}
              className={`h-8 sm:h-auto px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 border transition-colors inline-flex items-center justify-center gap-1.5 ${
                activeDoc === 'privacy'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-transparent shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4 stroke-[1.8] shrink-0" />
              <span className="hidden sm:inline">{t.footer.privacy}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeDoc === 'terms'}
              onClick={() => handleSelectDoc('terms')}
              title={isEn ? 'Terms of Service' : '서비스 이용약관'}
              aria-label={isEn ? 'Terms of Service' : '서비스 이용약관'}
              className={`h-8 sm:h-auto px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 border transition-colors inline-flex items-center justify-center gap-1.5 ${
                activeDoc === 'terms'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-transparent shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] border-transparent'
              }`}
            >
              <FileText className="w-4 h-4 stroke-[1.8] shrink-0" />
              <span className="hidden sm:inline">{isEn ? 'Terms of Service' : '서비스 이용약관'}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeDoc === 'licenses'}
              onClick={() => handleSelectDoc('licenses')}
              title={isEn ? 'License & Open Source Notices' : '라이선스 및 오픈소스 고지'}
              aria-label={isEn ? 'License Policy' : '라이선스 정책'}
              className={`h-8 sm:h-auto px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 border transition-colors inline-flex items-center justify-center gap-1.5 ${
                activeDoc === 'licenses'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-transparent shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] border-transparent'
              }`}
            >
              <Code2 className="w-4 h-4 stroke-[1.8] shrink-0" />
              <span className="hidden sm:inline">{isEn ? 'Licenses' : '라이선스 정책'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer shrink-0 ml-2 transition-colors"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          ref={scrollBodyRef}
          role="tabpanel"
          className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] p-4 sm:p-7 space-y-5 text-[var(--app-text-muted)] text-xs leading-relaxed font-sans"
        >
          {activeDoc === 'privacy' ? (
            isEn ? (
              <article className="space-y-4">
                <div>
                  <h3 id="legal-modal-title" className="text-base sm:text-lg font-bold text-[var(--app-text)] tracking-tight">
                    Privacy Policy
                  </h3>
                  <p className="text-[var(--app-text-muted)] text-[11px] sm:text-xs mt-0.5">
                    Last Updated: October 1, 2026 · Local-First Principle
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)]">
                  <p className="text-[var(--app-text-muted)] leading-snug text-xs">
                    <strong className="text-[var(--app-text)]">Local-First Core Principle:</strong> eerum never transmits or collects your name, phone number, email, title, organization, or saved vault cards to a central database. All data stays solely in your web browser&apos;s local storage on your device.
                  </p>
                </div>

                <div className="space-y-3.5 pt-1">
                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">1. Data Handled & Storage Location</h4>
                    <p className="text-[var(--app-text-muted)]">
                      - <strong className="text-[var(--app-text)]">Card Content:</strong> All details you enter including names, organization, job title, phone/WhatsApp, email, website URL, address, and custom images.<br />
                      - <strong className="text-[var(--app-text)]">Storage Location:</strong> Your device&apos;s browser storage (Web Storage / IndexedDB).<br />
                      - <strong className="text-[var(--app-text)]">Security Verification:</strong> When a 4-digit PIN is set, only a one-way SHA-256 hash computed locally via Web Crypto API is stored—never your plaintext PIN.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">2. Retention & Deletion</h4>
                    <p className="text-[var(--app-text-muted)]">
                      Your data remains safely on your device until you clear browser storage or run [Reset Local Data] from Settings. Running [Reset Local Data] permanently erases all local records immediately.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">3. Zero Third-Party Sharing or Tracking</h4>
                    <p className="text-[var(--app-text-muted)]">
                      This studio contains no third-party marketing trackers, analytics scripts, or behavioral telemetry such as Google Analytics or Meta Pixel. Your activity stays strictly private.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">4. Your Rights & Data Portability</h4>
                    <p className="text-[var(--app-text-muted)]">
                      You retain full ownership of your data and may export your cards at any time as vCard (.vcf), encrypted .eerum / JSON backups, standalone offline HTML, or 300 DPI print-ready PDF.
                    </p>
                  </section>
                </div>
              </article>
            ) : (
              <article className="space-y-4">
                <div>
                  <h3 id="legal-modal-title" className="text-base sm:text-lg font-bold text-[var(--app-text)] tracking-tight">
                    개인정보처리방침
                  </h3>
                  <p className="text-[var(--app-text-muted)] text-[11px] sm:text-xs mt-0.5">
                    최종 개정일: 2026년 10월 1일 · 로컬 퍼스트(Local-First) 원칙
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)]">
                  <p className="text-[var(--app-text-muted)] leading-snug text-xs">
                    <strong className="text-[var(--app-text)]">로컬 퍼스트 핵심 원칙:</strong> 본 서비스는 이용자의 이름, 전화번호, 이메일, 직함, 조직 및 보관함 명함 정보를 중앙 데이터베이스에 일체 전송하거나 수집하지 않습니다. 모든 데이터는 이용자의 웹 브라우저 로컬 저장소에만 보관됩니다.
                  </p>
                </div>

                <div className="space-y-3.5 pt-1">
                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">1. 처리하는 개인정보 항목 및 보관 방식</h4>
                    <p className="text-[var(--app-text-muted)]">
                      - <strong className="text-[var(--app-text)]">작성 항목:</strong> 성명(한글/영문), 소속 기관, 직함, 연락처(휴대폰, WhatsApp), 이메일, 웹사이트 URL, 주소, 프로필 이미지 등 명함에 입력된 모든 항목.<br />
                      - <strong className="text-[var(--app-text)]">저장 위치:</strong> 사용자의 단말기 내 브라우저 저장소(Web Storage / IndexedDB).<br />
                      - <strong className="text-[var(--app-text)]">보안 검증:</strong> 4자리 PIN 설정 시, 평문 비밀번호가 아닌 단말기 내 Web Crypto API 기반 SHA-256 단방향 해시값만 저장됩니다.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">2. 개인정보의 보유 및 파기</h4>
                    <p className="text-[var(--app-text-muted)]">
                      사용자가 작성한 데이터는 브라우저 캐시를 지우거나 하단 [로컬 데이터 초기화] 기능을 직접 실행하기 전까지 이용자의 기기에 안전하게 존속됩니다. [로컬 데이터 초기화] 실행 시 단말기 내 모든 레코드가 즉시 영구 파기됩니다.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">3. 제3자 제공 및 외부 추적 도구 부존재</h4>
                    <p className="text-[var(--app-text-muted)]">
                      본 스튜디오는 구글 애널리틱스, 페이스북 픽셀 등 일체의 제3자 마케팅 트래커나 사용자 행동 추적 스크립트를 탑재하지 않습니다. 이용자의 활동은 온전히 비공개 상태로 유지됩니다.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">4. 이용자의 권리와 데이터 내보내기</h4>
                    <p className="text-[var(--app-text-muted)]">
                      이용자는 언제든지 본인이 제작한 명함을 vCard(.vcf), JSON 데이터, 단일 파일 오프라인 HTML, 인쇄용 고해상도 PDF 형태로 즉시 내보낼 수 있으며, 데이터에 대한 완전한 소유권을 갖습니다.
                    </p>
                  </section>
                </div>
              </article>
            )
          ) : activeDoc === 'terms' ? (
            isEn ? (
              <article className="space-y-4">
                <div>
                  <h3 id="legal-modal-title" className="text-base sm:text-lg font-bold text-[var(--app-text)] tracking-tight">
                    Terms of Service
                  </h3>
                  <p className="text-[var(--app-text-muted)] text-[11px] sm:text-xs mt-0.5">
                    Last Updated: October 1, 2026
                  </p>
                </div>

                <div className="space-y-3.5 pt-1">
                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">Article 1 (Purpose)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      These Terms govern the conditions, rights, and obligations for using the local-first digital business card creation, management, and sharing platform provided by the Digital Business Card Studio (the &quot;Studio&quot;).
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">Article 2 (No-Registration Local Architecture)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      The Studio is designed to run immediately within your browser without cloud sign-up or external login. You may freely create and manage business cards directly on your own device.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">Article 3 (User Backup Responsibility)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      Because the Studio stores no personal data on central servers, we recommend creating periodic [Export / Backup] archives or using [Device P2P Sync] to prevent loss from browser resets or device replacement.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">Article 4 (Intellectual Property)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      All copyright and ownership of card content and printable PDF outputs you create belong exclusively to you. The Studio claims no ownership or commercial rights over your card content.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">Article 5 (Disclaimer)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      The Studio is not responsible for the accuracy of information entered by users or any disputes arising from transactions or card exchanges between users.
                    </p>
                  </section>
                </div>
              </article>
            ) : (
              <article className="space-y-4">
                <div>
                  <h3 id="legal-modal-title" className="text-base sm:text-lg font-bold text-[var(--app-text)] tracking-tight">
                    서비스 이용약관
                  </h3>
                  <p className="text-[var(--app-text-muted)] text-[11px] sm:text-xs mt-0.5">
                    최종 개정일: 2026년 10월 1일
                  </p>
                </div>

                <div className="space-y-3.5 pt-1">
                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">제1조 (목적)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      본 약관은 디지털 명함 스튜디오(이하 "스튜디오")가 제공하는 로컬 퍼스트 기반 디지털 명함 제작, 관리 및 공유 플랫폼의 이용 조건과 권리·의무를 규정함을 목적으로 합니다.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">제2조 (회원가입 없는 로컬 아키텍처)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      스튜디오는 복잡한 계정 가입 및 로그인 절차 없이 모든 기능이 이용자의 브라우저 내에서 즉시 동작하도록 설계되었습니다. 이용자는 본인의 단말기 환경에서 자유롭게 명함을 생성하고 관리할 수 있습니다.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">제3조 (이용자의 데이터 보관 책임)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      스튜디오는 중앙 서버에 개인 데이터를 보관하지 않으므로, 브라우저 데이터 강제 초기화나 단말기 분실 시 데이터 유실에 대비하여 정기적인 [내보내기(Export)] 또는 [기기 동기화] 기능을 활용하시기를 권장합니다.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">제4조 (지적재산권 및 출력물 권리)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      이용자가 입력하여 생성한 명함 콘텐츠 및 인쇄용 PDF 출력물의 저작권은 전적으로 이용자 본인에게 귀속됩니다. 스튜디오는 이용자의 명함 콘텐츠에 대해 어떠한 소유권이나 상업적 권리도 주장하지 않습니다.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">제5조 (면책 조항)</h4>
                    <p className="text-[var(--app-text-muted)]">
                      스튜디오는 이용자가 입력한 정보의 정확성이나 이용자 간의 거래 및 명함 교환으로 인해 발생하는 법적 분쟁에 대해 책임을 지지 않습니다.
                    </p>
                  </section>
                </div>
              </article>
            )
          ) : (
            <article className="space-y-6">
              {/* EERUM App Custom License Section */}
              <div className="space-y-3 pb-5 border-b border-[var(--app-border)]">
                <div>
                  <h3 id="legal-modal-title" className="text-base sm:text-lg font-bold text-[var(--app-text)] tracking-tight">
                    {isEn ? 'EERUM Software License' : '이룸(EERUM) 소프트웨어 라이선스'}
                  </h3>
                </div>
                <p className="text-[11px] text-[var(--app-text-muted)] font-mono">
                  Copyright (c) 2026 Korean Center. All rights reserved.
                </p>
                <p className="text-[var(--app-text-muted)] text-xs leading-relaxed">
                  {isEn
                    ? 'This software was developed to support personal and non-profit / public-interest endeavors and is licensed solely under the conditions below.'
                    : '본 소프트웨어는 개인 및 공익·비영리 단체의 가치 있는 활동을 지원하기 위해 개발되었으며, 아래의 명시된 조건 하에서만 사용이 허가됩니다.'}
                </p>

                {/* Permitted vs Prohibited Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Permitted */}
                  <div className="p-3 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--app-text)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {isEn ? 'Permitted Use' : '허용 범위'}
                    </div>
                    <ul className="text-[11px] text-[var(--app-text-muted)] space-y-1 list-disc list-inside leading-relaxed">
                      {isEn ? (
                        <>
                          <li>
                            <strong className="text-[var(--app-text)]">Personal Use:</strong> Creating, storing, and sharing personal non-commercial business cards on your device.
                          </li>
                          <li>
                            <strong className="text-[var(--app-text)]">Non-Profit Organizations:</strong> Free internal use for public-interest foundations, social groups, and academic/educational institutions.
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            <strong className="text-[var(--app-text)]">개인적 사용:</strong> 개인의 비영리 목적 명함 생성, 보관 및 단말기 내 자유로운 활용
                          </li>
                          <li>
                            <strong className="text-[var(--app-text)]">비영리 단체 사용:</strong> 공익 법인, 사회적 단체, 학술·교육 기관 등의 고유 공익 활동 내부 무료 사용
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Strictly Prohibited */}
                  <div className="p-3 rounded-xl bg-[var(--app-surface-subtle)] border border-rose-500/25 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--app-text)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {isEn ? 'Prohibited Use' : '비허용 범위'}
                    </div>
                    <ul className="text-[11px] text-[var(--app-text-muted)] space-y-1 list-disc list-inside leading-relaxed">
                      {isEn ? (
                        <>
                          <li>
                            <strong className="text-[var(--app-text)]">No Redistribution:</strong> Unauthorized third-party distribution, rental, or mirroring of source code or builds.
                          </li>
                          <li>
                            <strong className="text-[var(--app-text)]">No Modification / Rebranding:</strong> Altering source code, rebranding, or distributing derivative works.
                          </li>
                          <li>
                            <strong className="text-[var(--app-text)]">No Commercial Sale:</strong> Paid sales, bundling into commercial products, or commercial operation.
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            <strong className="text-[var(--app-text)]">재배포 금지:</strong> 소스 코드 또는 빌드 산출물의 무단 제3자 배포, 대여, 미러링 금지
                          </li>
                          <li>
                            <strong className="text-[var(--app-text)]">가공 및 변형 금지:</strong> 소스 임의 수정, 리브랜딩, 파생 및 2차 저작물 배포 금지
                          </li>
                          <li>
                            <strong className="text-[var(--app-text)]">판매 및 영리 목적 금지:</strong> 유료 판매, 상업용 솔루션 번들링, 일체의 상업적 영업 행위 금지
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--app-bg)] border border-[var(--app-border)] text-[10.5px] text-[var(--app-text-muted)] font-mono leading-relaxed">
                  {isEn
                    ? 'Disclaimer of Warranty: This software is provided "AS IS" without warranty of any kind, express or implied, including merchantability or fitness for a particular purpose. The copyright holder shall not be liable for any damages arising from its use.'
                    : '보증의 부인 (Disclaimer of Warranty): 본 소프트웨어는 상품성 및 특정 목적 적합성을 포함하여 어떠한 명시적·묵시적 보증 없이 "있는 그대로(AS IS)" 제공되며, 저작권자는 사용으로 인한 손해에 대해 책임을 지지 않습니다. (상세 라이선스 전문은 루트 LICENSE 파일 참조)'}
                </div>
              </div>

              {/* Third-Party Open Source Components */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--app-text)] tracking-tight">
                    {isEn ? 'Third-Party Open Source Notices' : '타사 오픈소스 컴포넌트 라이선스 고지'}
                  </h4>
                  <p className="text-[var(--app-text-muted)] text-[11px] mt-0.5">
                    {isEn
                      ? 'This studio includes the following open-source libraries and complies with their respective license terms.'
                      : '본 디지털 명함 스튜디오는 다음 오픈소스 라이브러리를 포함하고 있으며, 각 저작권자의 라이선스 조항을 준수합니다.'}
                  </p>
                </div>

                <div className="divide-y divide-[var(--app-border)] pt-1">
                  {OPEN_SOURCE_LICENSES.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="py-2.5 first:pt-0 last:pb-1 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--app-text)] text-xs sm:text-sm">
                          {pkg.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[var(--app-highlight)] border border-[var(--app-border)] text-[var(--app-highlight-fg)] font-mono text-[10px] font-medium shrink-0">
                          {pkg.license}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[var(--app-text-muted)] font-mono">
                        {pkg.copyright}
                      </p>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 flex-shrink-0 px-4 sm:px-6 py-3 border-t border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-bold cursor-pointer transition-opacity"
          >
            {isEn ? 'Close' : '확인 및 닫기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;

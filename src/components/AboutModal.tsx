import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, ExternalLink, Mail, Globe } from 'lucide-react';

export type AboutTab = 'philosophy' | 'features' | 'notes' | 'contact';

export interface AboutModalProps {
  isOpen: boolean;
  initialTab?: AboutTab;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

const NET_TO_DOT_ABSTRACT_URL = 'https://nettodot.org/pages/chapter01/abstract';
const NET_TO_DOT_HOME_URL = 'https://nettodot.org';
const CONTACT_EMAIL = 'dot@nettodot.org';

const CORE_FEATURES = [
  {
    lead: '무가입 즉시 생성',
    detail: '이메일이나 비밀번호 없이 접속 즉시 디지털 명함 제작',
  },
  {
    lead: '3-in-1 하이브리드 명함',
    detail: '미니멀 타이포그래피, 실물 명함 양면 스캔, 커스텀 HTML/Tailwind 명함 지원',
  },
  {
    lead: '온디바이스 보안',
    detail: '4자리 PIN 및 WebAuthn 생체인증 기반 로컬 암호화 보관함',
  },
  {
    lead: '오프라인·실물 연계',
    detail: '오프라인 QR 코드, .vcf 연락처 저장, 재단선 포함 벡터 인쇄 시트 및 암호화 백업',
  },
];

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  initialTab = 'philosophy',
  onClose,
  onShowToast,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<AboutTab, HTMLElement | null>>({
    philosophy: null,
    features: null,
    notes: null,
    contact: null,
  });

  useEffect(() => {
    if (!isOpen) return;
    setCopiedEmail(false);
    if (initialTab === 'philosophy' && scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = 0;
    } else if (sectionRefs.current[initialTab]) {
      sectionRefs.current[initialTab]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopiedEmail(true);
      onShowToast?.('이메일 주소(dot@nettodot.org)가 복사되었습니다.');
      window.setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      onShowToast?.('이메일 주소 복사에 실패했습니다.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--app-overlay)] backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        className="w-full max-w-2xl h-[86dvh] sm:h-[82dvh] max-h-[700px] min-h-[440px] rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] flex flex-col overflow-hidden text-[var(--app-text)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimalist Top Bar */}
        <header className="shrink-0 px-5 sm:px-8 py-4 border-b border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <h2
                id="about-modal-title"
                className="text-base sm:text-lg font-semibold text-[var(--app-text)] tracking-tight"
              >
                eerum
              </h2>
              <span className="text-[11px] font-mono tracking-[0.12em] text-[var(--app-text-muted)]">
                Net to Dot Movement
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] -mr-2 flex items-center justify-center rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </header>

        {/* Typography-Focused Scrollable Editorial Body */}
        <div
          ref={scrollBodyRef}
          className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] px-5 sm:px-8 py-6 sm:py-8"
        >
          <div className="divide-y divide-[var(--app-border)] space-y-8">
            {/* Section 1: 철학 — Net to Dot Movement */}
            <section
              ref={(el) => {
                sectionRefs.current.philosophy = el;
              }}
              aria-labelledby="about-section-philosophy"
              className="space-y-4 pb-1"
            >
              <p
                id="about-section-philosophy"
                className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-[var(--app-text-muted)]"
              >
                01 · 철학 — Net to Dot Movement
              </p>

              <h3 className="text-lg sm:text-xl font-semibold text-[var(--app-text)] tracking-tight leading-snug">
                거대한 그물(Net)에서 독립된 점(Dot)으로
              </h3>

              <p className="text-[13.5px] sm:text-sm text-[var(--app-text-muted)] leading-[1.8] tracking-[-0.01em] break-keep">
                eerum은 거대 플랫폼이 장악한 중앙 네트워크(Net)의 데이터 종속과 일방향적 감시에서
                벗어나, 사용자 스스로 데이터의 주권을 되찾고 디지털 기기를 능동적 도구로 다루는
                Net to Dot Movement의 실천적 결과물입니다. 불필요한 클라우드 서버 왕복과 상시
                트래킹을 배제해 개인정보를 온전히 기기 안에 보호하고, 지속 가능한 가벼운 디지털
                생태계를 지향합니다.
              </p>

              <div className="pt-1">
                <a
                  href={NET_TO_DOT_ABSTRACT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 min-h-[42px] px-5 py-2.5 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs sm:text-[13px] font-semibold tracking-tight transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  <span>Net to Dot 선언문 초록 읽기 ↗</span>
                </a>
              </div>
            </section>

            {/* Section 2: 주요 기능 안내 */}
            <section
              ref={(el) => {
                sectionRefs.current.features = el;
              }}
              aria-labelledby="about-section-features"
              className="pt-7 space-y-4"
            >
              <h3
                id="about-section-features"
                className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-[var(--app-text-muted)]"
              >
                02 · 주요 기능 안내
              </h3>

              <ul className="space-y-3 text-[13px] sm:text-[13.5px] leading-[1.75] text-[var(--app-text-muted)]">
                {CORE_FEATURES.map((item) => (
                  <li key={item.lead} className="flex items-start gap-3">
                    <span
                      className="mt-[0.62em] w-1 h-1 rounded-full bg-[var(--app-accent)] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="break-keep">
                      <strong className="font-semibold text-[var(--app-text)]">{item.lead}</strong>
                      <span className="opacity-60"> — </span>
                      <span>{item.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Section 3: 개발자 노트 */}
            <section
              ref={(el) => {
                sectionRefs.current.notes = el;
              }}
              aria-labelledby="about-section-notes"
              className="pt-7 space-y-4"
            >
              <h3
                id="about-section-notes"
                className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-[var(--app-text-muted)]"
              >
                03 · 개발자 노트
              </h3>

              <p className="text-[13.5px] sm:text-sm text-[var(--app-text-muted)] leading-[1.85] tracking-[-0.01em] break-keep">
                명함은 누군가에게 나를 건네는 가장 사적인 첫인상입니다. 그 기록이 중앙 서버의
                데이터베이스에 쌓이거나 구독료에 묶이지 않기를 바랐습니다. eerum에는 가입 절차도,
                행동 추적 쿠키도, 서버의 개인정보 수집도 없습니다. 기기 안의 작은 점(Dot)으로
                온전히 작동하며, 당신의 연결이 오직 당신의 통제 아래 머물도록 설계했습니다.
              </p>

              <p className="text-xs font-mono tracking-wide text-[var(--app-text-muted)] pt-1">
                somedot — A dot somewhere on Earth
              </p>
            </section>

            {/* Section 4: 연락처 및 프라이버시 원칙 */}
            <section
              ref={(el) => {
                sectionRefs.current.contact = el;
              }}
              aria-labelledby="about-section-contact"
              className="pt-7 space-y-4"
            >
              <h3
                id="about-section-contact"
                className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-[var(--app-text-muted)]"
              >
                04 · 연락처 및 프라이버시 원칙
              </h3>

              <div className="divide-y divide-[var(--app-border)] rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] overflow-hidden">
                {/* Email Row */}
                <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="w-4 h-4 text-[var(--app-text-muted)] shrink-0 stroke-[1.75]" />
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="text-xs sm:text-[13px] font-mono text-[var(--app-text)] hover:underline underline-offset-4 truncate"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border border-[var(--app-border)] text-[var(--app-text)] text-[11px] font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    aria-label="이메일 주소 복사"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Website Row */}
                <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Globe className="w-4 h-4 text-[var(--app-text-muted)] shrink-0 stroke-[1.75]" />
                    <a
                      href={NET_TO_DOT_HOME_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-[13px] font-mono text-[var(--app-text)] hover:underline underline-offset-4 truncate inline-flex items-center gap-1.5"
                    >
                      <span>nettodot.org</span>
                      <ExternalLink className="w-3 h-3 text-[var(--app-text-muted)] shrink-0" />
                    </a>
                  </div>

                  <a
                    href={NET_TO_DOT_HOME_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border border-[var(--app-border)] text-[var(--app-text)] text-[11px] font-medium inline-flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span>방문</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                본 앱은 어떠한 추적 쿠키나 개인정보도 수집하지 않습니다.
              </p>
            </section>
          </div>
        </div>

        {/* Minimalist Footer */}
        <footer className="shrink-0 px-5 sm:px-8 py-3.5 border-t border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-[var(--app-text-muted)]">
            eerum · Net to Dot Movement
          </span>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] px-4 py-1.5 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-semibold cursor-pointer transition-opacity"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AboutModal;

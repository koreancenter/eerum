import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type LegalDocType = 'privacy' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  initialDoc?: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialDoc = 'privacy',
  onClose,
}) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-[80vh] max-h-[640px] min-h-[480px] max-sm:min-h-[min(480px,85dvh)] rounded-2xl bg-[#121214] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header with Segmented Switcher & Close */}
        <div className="shrink-0 flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0A0A0B]">
          <div role="tablist" aria-label="약관 및 정책 문서 선택" className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              role="tab"
              aria-selected={activeDoc === 'privacy'}
              onClick={() => handleSelectDoc('privacy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 border transition-colors ${
                activeDoc === 'privacy'
                  ? 'bg-white text-neutral-950 border-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10 border-transparent'
              }`}
            >
              <span>개인정보처리방침</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeDoc === 'terms'}
              onClick={() => handleSelectDoc('terms')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 border transition-colors ${
                activeDoc === 'terms'
                  ? 'bg-white text-neutral-950 border-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10 border-transparent'
              }`}
            >
              <span>서비스 이용약관</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0 ml-2 transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          ref={scrollBodyRef}
          role="tabpanel"
          className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] p-6 sm:p-8 space-y-6 text-zinc-300 text-xs leading-relaxed font-sans"
        >
          {activeDoc === 'privacy' ? (
            <article className="space-y-5">
              <div>
                <h3 id="legal-modal-title" className="text-lg font-bold text-white tracking-tight">
                  개인정보처리방침
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  최종 개정일: 2026년 10월 1일 · 로컬 퍼스트(Local-First) 원칙
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0A0A0B] border border-zinc-800/80">
                <p className="text-zinc-300 leading-snug">
                  <strong className="text-white">로컬 퍼스트 핵심 원칙:</strong> 본 서비스는 이용자의 이름, 전화번호, 이메일, 직함, 조직 및 보관함 명함 정보를 중앙 데이터베이스에 일체 전송하거나 수집하지 않습니다. 모든 데이터는 이용자의 웹 브라우저 로컬 저장소에만 보관됩니다.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <section className="space-y-1.5">
                  <h4 className="font-semibold text-white text-sm">1. 처리하는 개인정보 항목 및 보관 방식</h4>
                  <p className="text-neutral-300">
                    - <strong>작성 항목:</strong> 성명(한글/영문), 소속 기관, 직함, 연락처(휴대폰, WhatsApp), 이메일, 웹사이트 URL, 주소, 프로필 이미지 등 명함에 입력된 모든 항목.<br />
                    - <strong>저장 위치:</strong> 사용자의 단말기 내 브라우저 저장소(Web Storage / IndexedDB).<br />
                    - <strong>보안 검증:</strong> 4자리 PIN 설정 시, 평문 비밀번호가 아닌 단말기 내 Web Crypto API 기반 SHA-256 단방향 해시값만 저장됩니다.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-semibold text-white text-sm">2. 개인정보의 보유 및 파기</h4>
                  <p className="text-neutral-300">
                    사용자가 작성한 데이터는 브라우저 캐시를 지우거나 하단 [로컬 데이터 초기화] 기능을 직접 실행하기 전까지 이용자의 기기에 안전하게 존속됩니다. [로컬 데이터 초기화] 실행 시 단말기 내 모든 레코드가 즉시 영구 파기됩니다.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-semibold text-white text-sm">3. 제3자 제공 및 외부 추적 도구 부존재</h4>
                  <p className="text-neutral-300">
                    본 스튜디오는 구글 애널리틱스, 페이스북 픽셀 등 일체의 제3자 마케팅 트래커나 사용자 행동 추적 스크립트를 탑재하지 않습니다. 이용자의 활동은 온전히 비공개 상태로 유지됩니다.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-semibold text-white text-sm">4. 이용자의 권리와 데이터 내보내기</h4>
                  <p className="text-neutral-300">
                    이용자는 언제든지 본인이 제작한 명함을 vCard(.vcf), JSON 데이터, 단일 파일 오프라인 HTML, 인쇄용 고해상도 PDF 형태로 즉시 내보낼 수 있으며, 데이터에 대한 완전한 소유권을 갖습니다.
                  </p>
                </section>
              </div>
            </article>
          ) : (
            <article className="space-y-5">
              <div>
                <h3 id="legal-modal-title" className="text-lg font-bold text-white tracking-tight">
                  서비스 이용약관
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  최종 개정일: 2026년 10월 1일
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <section className="space-y-1.5">
                  <h4 className="font-semibold text-white text-sm">제1조 (목적)</h4>
                  <p className="text-neutral-300">
                    본 약관은 디지털 명함 스튜디오(이하 "스튜디오")가 제공하는 로컬 퍼스트 기반 디지털 명함 제작, 관리 및 공유 플랫폼의 이용 조건과 권리·의무를 규정함을 목적으로 합니다.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-semibold text-white text-sm">제2조 (회원가입 없는 로컬 아키텍처)</h4>
                  <p className="text-neutral-300">
                    스튜디오는 복잡한 계정 가입 및 로그인 절차 없이 모든 기능이 이용자의 브라우저 내에서 즉시 동작하도록 설계되었습니다. 이용자는 본인의 단말기 환경에서 자유롭게 명함을 생성하고 관리할 수 있습니다.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-semibold text-white text-sm">제3조 (이용자의 데이터 보관 책임)</h4>
                  <p className="text-neutral-300">
                    스튜디오는 중앙 서버에 개인 데이터를 보관하지 않으므로, 브라우저 데이터 강제 초기화나 단말기 분실 시 데이터 유실에 대비하여 정기적인 [내보내기(Export)] 또는 [기기 동기화] 기능을 활용하시기를 권장합니다.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-semibold text-white text-sm">제4조 (지적재산권 및 출력물 권리)</h4>
                  <p className="text-neutral-300">
                    이용자가 입력하여 생성한 명함 콘텐츠 및 인쇄용 PDF 출력물의 저작권은 전적으로 이용자 본인에게 귀속됩니다. 스튜디오는 이용자의 명함 콘텐츠에 대해 어떠한 소유권이나 상업적 권리도 주장하지 않습니다.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-semibold text-white text-sm">제5조 (면책 조항)</h4>
                  <p className="text-neutral-300">
                    스튜디오는 이용자가 입력한 정보의 정확성이나 이용자 간의 거래 및 명함 교환으로 인해 발생하는 법적 분쟁에 대해 책임을 지지 않습니다.
                  </p>
                </section>
              </div>
            </article>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 flex-shrink-0 px-6 py-3.5 border-t border-white/10 bg-[#0A0A0B] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 text-xs font-bold cursor-pointer transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Camera, Plus, UserPlus } from 'lucide-react';

type VaultEmptyStateProps =
  | {
      variant: 'onboarding';
      onOpenImportContacts?: () => void;
      onOpenScan: () => void;
      onOpenEditor: () => void;
    }
  | {
      variant: 'filtered';
      selectedCategory: string;
      searchQuery: string;
      onOpenScan: () => void;
    };

export const VaultEmptyState: React.FC<VaultEmptyStateProps> = (props) => {
  if (props.variant === 'onboarding') {
    return (
      <section
        aria-label="명함 보관함 시작하기"
        className="w-full max-w-4xl mx-auto py-8 sm:py-14 px-1 flex flex-col items-center animate-in fade-in duration-300"
      >
        <div className="text-center max-w-md px-2">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--app-text)]">
            명함 보관함 채우기
          </h2>
          <p className="text-xs text-[var(--app-text-muted)] mt-1.5 leading-relaxed">
            기존 연락처나 실물 명함을 추가해 나만의 보관함을 시작해 보세요.
          </p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
          <button
            type="button"
            onClick={() => props.onOpenImportContacts?.()}
            className="group text-left p-5 sm:p-6 rounded-2xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] hover:border-[var(--app-text-muted)]/35 shadow-[var(--app-shadow)] transition-all duration-200 cursor-pointer active:scale-[0.99] flex flex-col items-start gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <span className="w-10 h-10 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-fg)] flex items-center justify-center shrink-0">
              <UserPlus className="w-4.5 h-4.5 stroke-[1.75]" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text)] tracking-tight">
                주소록에서 가져오기
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
                휴대폰 연락처 또는 .vcf 파일 일괄 등록
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={props.onOpenScan}
            className="group text-left p-5 sm:p-6 rounded-2xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] hover:border-[var(--app-text-muted)]/35 shadow-[var(--app-shadow)] transition-all duration-200 cursor-pointer active:scale-[0.99] flex flex-col items-start gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <span className="w-10 h-10 rounded-xl bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] flex items-center justify-center shrink-0">
              <Camera className="w-4.5 h-4.5 stroke-[1.75]" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text)] tracking-tight">
                실물 명함 촬영·스캔
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
                종이 명함 사진에서 이름·연락처 자동 추출
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={props.onOpenEditor}
            className="group text-left p-5 sm:p-6 rounded-2xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] hover:border-[var(--app-text-muted)]/35 shadow-[var(--app-shadow)] transition-all duration-200 cursor-pointer active:scale-[0.99] flex flex-col items-start gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <span className="w-10 h-10 rounded-xl bg-[var(--app-surface-subtle)] group-hover:bg-[var(--app-highlight)] text-[var(--app-text)] group-hover:text-[var(--app-highlight-fg)] border border-[var(--app-border)] group-hover:border-transparent flex items-center justify-center shrink-0 transition-colors">
              <Plus className="w-4.5 h-4.5 stroke-[1.75]" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text)] tracking-tight">
                직접 명함 입력
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
                새로운 비즈니스 연락처 직접 작성
              </p>
            </div>
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="py-20 text-center space-y-3 p-8 rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)]">
      <p className="text-sm font-semibold text-[var(--app-text)]">
        {props.selectedCategory !== '전체' && !props.searchQuery.trim()
          ? `'${props.selectedCategory}' 카테고리에 등록된 명함이 없습니다.`
          : '검색 조건에 일치하는 명함이 없습니다.'}
      </p>
      <p className="text-xs text-[var(--app-text-muted)]">
        실물 명함 사진을 촬영하거나 새 명함을 등록해 보세요.
      </p>
      <button
        type="button"
        onClick={props.onOpenScan}
        className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-fg)] text-xs font-semibold hover:opacity-90 cursor-pointer"
      >
        <Plus className="w-4 h-4 stroke-[2]" />
        <span>실물 명함 등록</span>
      </button>
    </div>
  );
};

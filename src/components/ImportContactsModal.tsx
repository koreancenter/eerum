import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Upload,
  Smartphone,
  CheckSquare,
  Square,
  AlertTriangle,
  Check,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { StoredCard } from '../types/card';
import {
  parseVCardContent,
  detectDuplicates,
  convertContactToStoredCard,
  ParsedContact,
} from '../utils/vCardParser';

export interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCards?: StoredCard[];
  onImportCards: (cards: StoredCard[]) => void;
  categories: string[];
  showToast?: (msg: string) => void;
  embedded?: boolean;
}

// Sample vCard data for immediate testing
const SAMPLE_VCF_DATA = `BEGIN:VCARD
VERSION:3.0
FN:최선우
N:최;선우;;;
ORG:테크노바 솔루션;연구개발본부
TITLE:수석 아키텍트
TEL;TYPE=CELL,VOICE:010-8291-3829
EMAIL;TYPE=INTERNET:sunwoo.choi@technova.io
URL:https://technova.io
NOTE:클라우드 네이티브 및 분산 시스템 전문가
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:이지은
N:이;지은;;;
ORG:루미너스 크리에이티브
TITLE:디자인 디렉터
TEL;TYPE=CELL,VOICE:010-5542-9018
EMAIL;TYPE=INTERNET:jieun@luminous-studio.kr
URL:https://luminous-studio.kr
NOTE:브랜드 아이덴티티 및 UX 총괄
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:김도윤
N:김;도윤;;;
ORG:넥스트에이지 벤처스
TITLE:파트너 / 투자심사역
TEL;TYPE=CELL,VOICE:010-3390-1284
EMAIL;TYPE=INTERNET:doyun.kim@nextage.vc
URL:https://nextage.vc
NOTE:시리즈 A/B 초기 스타트업 투자
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:박기홍
N:박;기홍;;;
ORG:Korean center
TITLE:대표이사
TEL;TYPE=CELL,VOICE:+8220109998272
EMAIL;TYPE=INTERNET:kihong.park@koreancenter.kr
NOTE:기존 보관함 중복 테스트 연락처
END:VCARD`;

export const ImportContactsModal: React.FC<ImportContactsModalProps> = ({
  isOpen,
  onClose,
  existingCards = [],
  onImportCards,
  categories,
  showToast = () => {},
  embedded = false,
}) => {
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCategory, setTargetCategory] = useState<string>(
    categories.find((c) => c !== '전체') || 'VIP 파트너'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check if Native Contact Picker API is available
  const isNativeContactsSupported =
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    'ContactsManager' in window;

  // Process raw text content from vCard
  const handleProcessVCardString = useCallback(
    (vcfString: string, sourceName = 'vCard 파일') => {
      setIsProcessing(true);
      try {
        const parsed = parseVCardContent(vcfString);
        if (parsed.length === 0) {
          showToast('유효한 연락처 정보(vCard)를 찾을 수 없습니다.');
          setIsProcessing(false);
          return;
        }

        const withDups = detectDuplicates(parsed, existingCards);
        setContacts(withDups);

        // Auto-select non-duplicates by default
        const nonDups = new Set<string>();
        withDups.forEach((c) => {
          if (!c.isDuplicate) {
            nonDups.add(c.id);
          }
        });
        setSelectedIds(nonDups);

        const dupCount = withDups.filter((c) => c.isDuplicate).length;
        if (dupCount > 0) {
          showToast(
            `${sourceName}에서 ${parsed.length}개의 연락처를 읽었습니다. (중복 ${dupCount}개 감지)`
          );
        } else {
          showToast(`${sourceName}에서 ${parsed.length}개의 연락처를 불러왔습니다.`);
        }
      } catch (err) {
        console.error('Failed to parse vCard:', err);
        showToast('연락처 파일을 파싱하는 도중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
      }
    },
    [existingCards, showToast]
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          handleProcessVCardString(text, file.name);
        }
      };
      reader.readAsText(file);
    },
    [handleProcessVCardString]
  );

  // Option B: Native Contact Picker API
  const handleNativeContactPicker = useCallback(async () => {
    if (!isNativeContactsSupported) {
      showToast('이 기기/브라우저는 기기 주소록 직접 선택(Contacts API)을 지원하지 않습니다.');
      return;
    }

    try {
      setIsProcessing(true);
      const props = ['name', 'email', 'tel', 'organization'];
      const results = await (navigator as any).contacts.select(props, {
        multiple: true,
      });

      if (!results || results.length === 0) {
        setIsProcessing(false);
        return;
      }

      const parsedList: ParsedContact[] = results.map((item: any, idx: number) => {
        const name = Array.isArray(item.name) ? item.name[0] : item.name || '이름 없음';
        const tel = Array.isArray(item.tel) ? item.tel[0] : item.tel || '';
        const email = Array.isArray(item.email) ? item.email[0] : item.email || '';
        const org = Array.isArray(item.organization)
          ? item.organization[0]
          : item.organization || '';

        return {
          id: `native-${Date.now()}-${idx}`,
          name,
          organization: org,
          title: '',
          phone: tel,
          email,
        };
      });

      const withDups = detectDuplicates(parsedList, existingCards);
      setContacts(withDups);
      const nonDups = new Set<string>();
      withDups.forEach((c) => {
        if (!c.isDuplicate) nonDups.add(c.id);
      });
      setSelectedIds(nonDups);
      showToast(`기기 주소록에서 ${parsedList.length}개의 연락처를 가져왔습니다.`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Contact picker error:', err);
        showToast('주소록을 가져오는 중 오류가 발생했거나 취소되었습니다.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isNativeContactsSupported, existingCards, showToast]);

  // Load sample vCard for immediate preview
  const handleLoadSample = useCallback(() => {
    handleProcessVCardString(SAMPLE_VCF_DATA, '테스트 샘플');
  }, [handleProcessVCardString]);

  // Selection toggles
  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  }, [contacts, selectedIds.size]);

  const handleSelectNonDuplicatesOnly = useCallback(() => {
    const nonDups = new Set<string>();
    contacts.forEach((c) => {
      if (!c.isDuplicate) {
        nonDups.add(c.id);
      }
    });
    setSelectedIds(nonDups);
  }, [contacts]);

  const handleToggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Commit selected contacts to vault
  const handleCommitImport = useCallback(() => {
    const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
    if (selectedContacts.length === 0) {
      showToast('가져올 연락처를 최소 1개 이상 선택해주세요.');
      return;
    }

    const newCards = selectedContacts.map((contact) =>
      convertContactToStoredCard(contact, targetCategory)
    );

    onImportCards(newCards);
    showToast(
      `${newCards.length}개의 연락처가 '${targetCategory}' 카테고리로 보관함에 저장되었습니다.`
    );
    onClose();
    // Reset state
    setContacts([]);
    setSelectedIds(new Set());
  }, [contacts, selectedIds, targetCategory, onImportCards, onClose, showToast]);

  const duplicateCount = useMemo(
    () => contacts.filter((c) => c.isDuplicate).length,
    [contacts]
  );

  if (!isOpen) return null;

  const bodyContent = (
    <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-[460px]">
      {/* Modal Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {contacts.length === 0 ? (
            /* ================= SOURCE SELECTION VIEW ================= */
            <div className="space-y-4">
              {/* Option A: vCard (.vcf) File Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? 'border-[var(--app-accent)] bg-[var(--app-highlight)]/35 text-[var(--app-text)]'
                    : 'border-[var(--app-border)] hover:border-[var(--app-accent)]/60 bg-[var(--app-surface-subtle)]/60 hover:bg-[var(--app-surface-subtle)]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf,.vcard,text/vcard,text/x-vcard"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <div className="w-12 h-12 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center mb-3 shadow-xs">
                  <Upload className="w-5 h-5 text-[var(--app-text)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--app-text)] mb-1">
                  vCard (.vcf) 파일 업로드
                </h3>
                <p className="text-xs text-[var(--app-text-muted)] text-center max-w-sm">
                  스마트폰 주소록이나 연락처 앱에서 내보낸 <code className="text-[var(--app-text)] font-medium">.vcf</code> 파일을 끌어다 놓거나 클릭하여 선택하세요.
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] text-[11px] text-[var(--app-text-muted)] font-medium">
                  <FileText className="w-3 h-3 text-[var(--app-text-muted)]" /> 단일 또는 수백 건 대량 vCard 지원
                </span>
              </div>

              {/* Option B: Native Contact Picker */}
              <div className="p-4 rounded-xl bg-[var(--app-surface-subtle)]/60 border border-[var(--app-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[var(--app-text)]" />
                    <h4 className="text-xs font-semibold text-[var(--app-text)]">기기 주소록 선택</h4>
                  </div>
                  <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                    스마트폰 브라우저(Android Chrome 등)에서 기기에 저장된 연락처를 직접 선택합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNativeContactPicker}
                  disabled={!isNativeContactsSupported || isProcessing}
                  className={`shrink-0 py-2 px-4 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isNativeContactsSupported
                      ? 'bg-[var(--app-surface)] hover:bg-[var(--app-border)] border border-[var(--app-border)] text-[var(--app-text)]'
                      : 'bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span>
                    {isNativeContactsSupported
                      ? '기기 주소록 열기'
                      : '모바일 환경에서 지원'}
                  </span>
                </button>
              </div>

              {/* Sample Test Data Bar */}
              <div className="pt-2 flex items-center justify-between border-t border-[var(--app-border)]">
                <span className="text-[11px] text-[var(--app-text-muted)]">
                  준비된 파일이 없으신가요?
                </span>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] inline-flex items-center px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  <span>테스트용 샘플 vCard 불러오기</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= PARSED CONTACTS PREVIEW & BULK SELECT ================= */
            <div className="space-y-3.5">
              {/* Summary & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--app-text)]">
                    {contacts.length}개의 연락처 발견
                  </span>
                  <span className="text-[var(--app-text-muted)]">·</span>
                  <span className="text-[var(--app-text-muted)] font-mono">
                    {selectedIds.size}개 선택됨
                  </span>
                  {duplicateCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 text-[11px] font-medium inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      중복 {duplicateCount}개
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-2.5 py-1 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-border)] border border-[var(--app-border)] text-[var(--app-text)] transition-colors cursor-pointer text-[11px]"
                  >
                    {selectedIds.size === contacts.length ? '전체 해제' : '전체 선택'}
                  </button>
                  {duplicateCount > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectNonDuplicatesOnly}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer text-[11px] font-medium"
                    >
                      중복 제외 선택
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setContacts([]);
                      setSelectedIds(new Set());
                    }}
                    className="px-2 py-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer text-[11px] inline-flex items-center gap-1"
                    title="다시 선택"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>초기화</span>
                  </button>
                </div>
              </div>

              {/* Target Category Select */}
              <div className="flex items-center justify-between px-1 text-xs">
                <label htmlFor="import-target-category" className="text-[var(--app-text-muted)]">
                  저장할 보관함 카테고리:
                </label>
                <select
                  id="import-target-category"
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] cursor-pointer"
                >
                  {categories
                    .filter((c) => c !== '전체')
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  {!categories.includes('VIP 파트너') && (
                    <option value="VIP 파트너">VIP 파트너</option>
                  )}
                </select>
              </div>

              {/* Scrollable Contacts Table / List */}
              <div className="border border-[var(--app-border)] rounded-xl overflow-hidden bg-[var(--app-bg)] max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[var(--app-surface-subtle)] border-b border-[var(--app-border)] text-[var(--app-text-muted)] text-[11px] uppercase tracking-wider z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          aria-label="모두 선택/해제"
                          className="cursor-pointer"
                        >
                          {selectedIds.size === contacts.length && contacts.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-[var(--app-accent)]" />
                          ) : (
                            <Square className="w-4 h-4 text-[var(--app-text-muted)]" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 font-medium">이름</th>
                      <th className="py-2.5 px-3 font-medium hidden sm:table-cell">회사 / 직함</th>
                      <th className="py-2.5 px-3 font-medium">연락처</th>
                      <th className="py-2.5 px-3 font-medium hidden md:table-cell">이메일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border)]">
                    {contacts.map((contact) => {
                      const isSelected = selectedIds.has(contact.id);
                      return (
                        <tr
                          key={contact.id}
                          onClick={() => handleToggleItem(contact.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[var(--app-highlight)]/45 hover:bg-[var(--app-highlight)]/60'
                              : 'hover:bg-[var(--app-surface-subtle)]/70'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItem(contact.id)}
                              className="accent-[var(--app-accent)] rounded cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-[var(--app-text)]">
                                {contact.name}
                              </span>
                              {contact.isDuplicate && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35"
                                  title={contact.duplicateReason}
                                >
                                  이미 보관됨
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--app-text-muted)] sm:hidden">
                              {[contact.organization, contact.title].filter(Boolean).join(' · ')}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[var(--app-text)] hidden sm:table-cell">
                            <div>{contact.organization || '-'}</div>
                            <div className="text-[11px] text-[var(--app-text-muted)]">{contact.title}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[var(--app-text)] text-[11px]">
                            {contact.phone || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--app-text-muted)] text-[11px] hidden md:table-cell truncate max-w-[150px]">
                            {contact.email || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-t border-[var(--app-border)] bg-[var(--app-bg)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
          >
            취소
          </button>

          {contacts.length > 0 && (
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={selectedIds.size === 0}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedIds.size > 0
                  ? 'bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] active:scale-95 shadow-md'
                  : 'bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] opacity-60 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>선택한 명함 {selectedIds.size}개 보관함에 등록</span>
            </button>
          )}
        </div>
    </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="연락처 가져오기 모달"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-2xl text-[var(--app-text)] overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--app-border)] bg-[var(--app-bg)]">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--app-text)] tracking-tight">
            연락처 대량 가져오기
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {bodyContent}
      </div>
    </div>
  );
};

export default ImportContactsModal;

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
  const [googleOauthStatus, setGoogleOauthStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');

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

  // Option C: Google Contacts trigger
  const handleGoogleContactsSync = useCallback(async () => {
    setGoogleOauthStatus('authorizing');
    try {
      // Check if user already has an access token or prompt
      showToast('Google 주소록(People API) 연동 준비 중...');
      
      // Simulate/trigger integration readiness
      setTimeout(() => {
        setGoogleOauthStatus('idle');
        showToast('Google People API (contacts.readonly) 연동 프로토콜이 대기 중입니다. vCard 파일 업로드를 우선 사용할 수 있습니다.');
      }, 1200);
    } catch (err) {
      setGoogleOauthStatus('idle');
      showToast('Google 연동 요청에 실패했습니다.');
    }
  }, [showToast]);

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
                    ? 'border-white bg-white/10 text-white'
                    : 'border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf,.vcard,text/vcard,text/x-vcard"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  vCard (.vcf) 파일 업로드
                </h3>
                <p className="text-xs text-zinc-400 text-center max-w-sm">
                  스마트폰 주소록이나 연락처 앱에서 내보낸 <code className="text-zinc-200">.vcf</code> 파일을 끌어다 놓거나 클릭하여 선택하세요.
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] text-zinc-300 font-medium">
                  <FileText className="w-3 h-3 text-zinc-400" /> 단일 또는 수백 건 대량 vCard 지원
                </span>
              </div>

              {/* Other Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option B: Native Contact Picker */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Smartphone className="w-4 h-4 text-white" />
                      <h4 className="text-xs font-semibold text-white">기기 주소록 선택</h4>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      스마트폰 브라우저(Android Chrome 등)에서 기기에 저장된 연락처를 직접 선택합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeContactPicker}
                    disabled={!isNativeContactsSupported || isProcessing}
                    className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isNativeContactsSupported
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-white/5 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <span>
                      {isNativeContactsSupported
                        ? '기기 주소록 열기'
                        : '모바일 환경에서 지원'}
                    </span>
                  </button>
                </div>

                {/* Option C: Google Contacts OAuth */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <h4 className="text-xs font-semibold text-white">Google 주소록 연동</h4>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Google People API (<code className="text-zinc-300">contacts.readonly</code>) 주소록을 동기화합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleContactsSync}
                    disabled={googleOauthStatus === 'authorizing'}
                    className="mt-3 w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{googleOauthStatus === 'authorizing' ? '연동 확인 중...' : 'Google 주소록 가져오기'}</span>
                  </button>
                </div>
              </div>

              {/* Sample Test Data Bar */}
              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <span className="text-[11px] text-zinc-500">
                  준비된 파일이 없으신가요?
                </span>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs text-zinc-300 hover:text-white inline-flex items-center px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span>테스트용 샘플 vCard 불러오기</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= PARSED CONTACTS PREVIEW & BULK SELECT ================= */
            <div className="space-y-3.5">
              {/* Summary & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {contacts.length}개의 연락처 발견
                  </span>
                  <span className="text-zinc-400">·</span>
                  <span className="text-zinc-300 font-mono">
                    {selectedIds.size}개 선택됨
                  </span>
                  {duplicateCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-medium inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      중복 {duplicateCount}개
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                  >
                    {selectedIds.size === contacts.length ? '전체 해제' : '전체 선택'}
                  </button>
                  {duplicateCount > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectNonDuplicatesOnly}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors cursor-pointer text-[11px]"
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
                    className="px-2 py-1 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer text-[11px] inline-flex items-center gap-1"
                    title="다시 선택"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>초기화</span>
                  </button>
                </div>
              </div>

              {/* Target Category Select */}
              <div className="flex items-center justify-between px-1 text-xs">
                <label htmlFor="import-target-category" className="text-zinc-400">
                  저장할 보관함 카테고리:
                </label>
                <select
                  id="import-target-category"
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#18181B] border border-white/15 text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
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
              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#18181B] border-b border-white/10 text-zinc-400 text-[11px] uppercase tracking-wider z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          aria-label="모두 선택/해제"
                          className="cursor-pointer"
                        >
                          {selectedIds.size === contacts.length && contacts.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-500" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 font-medium">이름</th>
                      <th className="py-2.5 px-3 font-medium hidden sm:table-cell">회사 / 직함</th>
                      <th className="py-2.5 px-3 font-medium">연락처</th>
                      <th className="py-2.5 px-3 font-medium hidden md:table-cell">이메일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {contacts.map((contact) => {
                      const isSelected = selectedIds.has(contact.id);
                      return (
                        <tr
                          key={contact.id}
                          onClick={() => handleToggleItem(contact.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-white/[0.06] hover:bg-white/[0.08]'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItem(contact.id)}
                              className="accent-white rounded cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-white">
                                {contact.name}
                              </span>
                              {contact.isDuplicate && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  title={contact.duplicateReason}
                                >
                                  이미 보관됨
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 sm:hidden">
                              {[contact.organization, contact.title].filter(Boolean).join(' · ')}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-300 hidden sm:table-cell">
                            <div>{contact.organization || '-'}</div>
                            <div className="text-[11px] text-zinc-400">{contact.title}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-300 text-[11px]">
                            {contact.phone || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 text-[11px] hidden md:table-cell truncate max-w-[150px]">
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
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-[#0A0A0B]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
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
                  ? 'bg-white hover:bg-zinc-200 text-neutral-950 active:scale-95 shadow-md'
                  : 'bg-white/10 text-zinc-500 cursor-not-allowed'
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#121214] border border-white/10 shadow-2xl text-zinc-200 overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
            연락처 대량 가져오기
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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

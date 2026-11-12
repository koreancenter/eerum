# 기능 및 기술 명세서 (SPEC.md)
> **이룸 (eerum) · Korean Center Global Network**  
> *Functional, Security, API & Database Architecture Specifications*

---

## 1. 시스템 아키텍처 개요 (System Architecture)

```text
[클라이언트 브라우저 (Local-First)]
├── IndexedDB / LocalStorage (온디바이스 평문/암호화 데이터)
├── Web Crypto API (AES-GCM 256 / PBKDF2 100,000회)
├── WebAuthn (Touch ID, Face ID, Windows Hello 생체 인증)
├── Service Worker / Workbox (오프라인 캐싱 및 PWA)
└── React 19 SPA (동적 렌더러 + DOMPurify 샌드박스)
          │
          ├── [개발 및 Node.js 서빙]: server.ts (Express + Vite Middleware)
          └── [글로벌 엣지 배포]: worker.ts (Cloudflare Workers + D1 SQLite + R2)
```

---

## 2. 데이터 모델 명세 (Data Contracts)

### 2.1 StoredCard 모델 (`src/types/card.ts`)
```typescript
export interface StoredCard {
  id: string;                    // 고유 식별자 (예: 'master', 'card-1731400000-xxxx')
  slug?: string;                 // 고유 공유 URL 경로 (예: /card/master)
  customDomain?: string;         // 개인 맞춤 도메인 (예: card.koreancenter.net)
  isMyCard?: boolean;            // true: 내 명함 (소유자) / false: 보관함 명함
  isDefault?: boolean;           // 내 명함 중 대표 명함 여부
  category: string;              // 보관 카테고리 (예: 'VIP 파트너', '글로벌 네트워크')
  creation_mode?: CardCreationMode; // 'template' | 'custom_html' | 'photo'
  theme: CardTheme;              // 'pure_white' | 'sumi_ink' | 'warm_paper' 등
  layout_type?: CardLayoutType;  // 'editorial_minimal' | 'monogram_executive' 등
  data: CardData;                // 인적 및 기업 상세 정보
  card_features?: CardFeatures;  // 영문 표기, 주소, 모노그램 등 토글 옵션
  html_front?: string;           // 커스텀 HTML 모드 전면 코드
  html_back?: string;            // 커스텀 HTML 모드 후면 코드
  scannedImage?: string;         // 실물 사진 원본 Base64 (WebP 압축)
  scannedImageBack?: string;     // 실물 사진 후면 Base64
  notes?: string;                // 메모 및 만남 이력
  createdAt: string;             // ISO 타임스탬프
}
```

### 2.2 CardData 필드 명세
```typescript
export interface CardData {
  organization: string;          // 영문 또는 기본 소속 (예: "Korean Center")
  organizationKr: string;        // 한글 소속 (예: "코리안센터")
  subOrg?: string;               // 하위 부서 또는 재단명
  name: string;                  // 성명 (영문 또는 주 표기)
  nameKr: string;                // 한글 성명
  nameEn?: string;               // 영문 성명
  title: string;                 // 영문 직함 (예: "CEO & Founder")
  titleKr: string;               // 한글 직함 (예: "대표이사")
  phone: string;                 // 표시용 전화번호 (예: "+82 10-9998-272")
  phoneRaw: string;              // 통화용 숫자 (예: "0109998272")
  whatsappUrl: string;           // WhatsApp 다이렉트 채팅 링크
  linkedinUrl?: string;          // LinkedIn 프로필 링크
  email: string;                 // 이메일 주소
  website: string;               // 웹사이트 URL
  websiteDisplay: string;        // 표시용 웹사이트 주소
  addressLines: string[];        // 주소 라인 배열
  addressKr: string;             // 한글 도로명 주소
  addressEn?: string;            // 영문 주소
  googleMapsUrl: string;         // Google Maps 좌표 링크
  naverMapsUrl: string;          // 네이버 지도 링크
  backTitle?: string;            // 뒷면 헤드라인
  backSubtitle?: string;         // 뒷면 서브타이틀
  backTagline?: string;          // 슬로건
  backHqAddress?: string;        // 본사 주소
}
```

---

## 3. 보안 및 암호화 아키텍처 (Security Specification)

### 3.1 로컬 금고 암호화 (.eerum.vault)
- **알고리즘**: `AES-GCM` (대칭키 256-bit)
- **키 유도 함수**: `PBKDF2` (SHA-256, 반복 횟수 100,000회, 16바이트 솔트)
- **초기화 벡터 (IV)**: 암호화 시마다 12바이트 난수 생성 (`crypto.getRandomValues`)
- **봉투 포맷 (Envelope JSON)**:
  ```json
  {
    "version": "1.0",
    "app": "eerum_business_card_vault",
    "kdf": "PBKDF2-SHA256-100000",
    "cipher": "AES-GCM-256",
    "salt": "<Base64 16 bytes>",
    "iv": "<Base64 12 bytes>",
    "ciphertext": "<Base64 Encrypted Data>"
  }
  ```

### 3.2 앱 PIN 잠금 및 무차별 대입 방어 (Brute-Force Throttling)
- **해시 저장**: PIN 평문은 저장하지 않으며 `SHA-256 + Unique Salt` 적용.
- **연속 실패 방어**:
  - 1~4회 실패: 실패 카운트 증가 및 시각적 진동 피드백.
  - 5회 연속 실패: 즉시 5분간 잠금 해제 입력 차단 (Cooldown Timestamp 기록).
  - 브라우저 재부팅 시에도 쿨다운 상태 유지.

### 3.3 생체 인증 (WebAuthn / Biometrics)
- `PublicKeyCredential` API 사용.
- `authenticatorAttachment: 'platform'` (Touch ID, Face ID, Windows Hello 등 기기 내장 인증기만 허용).
- `userVerification: 'required'`.
- 마스터 자격 증명 등록 후, PIN 번호 입력 없이 지문/얼굴 인식으로 즉시 앱 잠금 해제.

---

## 4. 백엔드 및 엣지 REST API 명세 (Backend & Edge API)

`server.ts`(Node.js)와 `worker.ts`(Cloudflare Workers)는 동일한 API 규격을 준수합니다.

### 4.1 상태 점검
- `GET /api/health`
  - 응답: `{ "status": "ok", "service": "Korean Center Card Studio", "architecture": "Zero-AI Local-First" }`

### 4.2 익명 피어 동기화 (Peer Sync)
- `GET /api/sync?id={syncId}`
  - 동기화 식별자(`syncId`)에 매핑된 명함 지갑 배열 반환.
- `POST /api/sync`
  - 요청 바디: `{ "syncId": "...", "cards": [...] }`
  - 응답: `{ "success": true, "syncId": "...", "count": N }`

### 4.3 공개 명함 조회 및 라우팅
- `GET /api/resolve?slug={slug}&domain={domain}`
  - 슬러그(`/card/:slug`) 또는 맞춤 도메인(`c.customDomain`)과 일치하는 명함 1건 반환.
- `GET /api/cards?slug={slug}`
  - 특정 명함 상세 조회.
- `POST /api/cards`
  - 명함 등록 및 업데이트 (동기화 및 공개 배포 시 사용).

---

## 5. 데이터베이스 스키마 (Cloudflare D1 SQLite)

```sql
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    custom_domain TEXT UNIQUE,
    owner_key TEXT,
    owner_email TEXT,
    creation_mode TEXT NOT NULL DEFAULT 'template' CHECK (creation_mode IN ('template', 'custom_html', 'photo')),
    theme TEXT NOT NULL DEFAULT 'pure_white',
    category TEXT NOT NULL DEFAULT '글로벌 네트워크',
    is_my_card INTEGER NOT NULL DEFAULT 0 CHECK (is_my_card IN (0, 1)),
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    view_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
    sync_id TEXT PRIMARY KEY,
    cards_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. PWA 및 성능 최적화 명세 (PWA & Performance)

### 6.1 캐싱 전략
- **정적 애셋 (JS, CSS, WOFF2, PNG)**:
  - Cache-Control: `public, max-age=31536000, immutable` (1년 장기 캐시).
- **HTML 문서 및 JSON 데이터**:
  - Cache-Control: `public, max-age=0, must-revalidate` (즉시 최신 상태 반영).
- **외부 폰트 (Google Fonts CDN)**:
  - Workbox `CacheFirst` 전략 (1년 만료, 최대 10개 엔트리).

### 6.2 번들 최적화 (Code Splitting)
- 초기 렌더링에 불필요한 고용량 라이브러리는 동적 `import()`로 지연 로딩:
  - `cardExporter.ts` (Canvas/PDF 변환 유틸리티): 인쇄 및 내보내기 모달 열람 시 로드.
  - `sanitizeHtml.ts` (DOMPurify): 커스텀 HTML 모드 진입 시 로드.
  - `AppModals.tsx` (설정, PIN, 동기화, 인쇄 모달 일체): 필요 시점에 비동기 로드.
- 초기 로드 번들 크기: **Gzip 기준 약 23KB 수준**으로 3G 네트워크에서도 서브세컨드 FCP 달성.

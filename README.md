# 이룸 (eerum) · Korean Center Global Network
> **Zero-AI, Quiet Luxury & Local-First Digital Business Card Studio**  
> 서버에 남지 않는 온디바이스 암호화(AES-GCM) 기반의 프라이빗 명함 제작·관리·공유 웹 애플리케이션

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646C9F?logo=vite&logoColor=white)](https://vite.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-100%20SEO-00CC66?logo=lighthouse&logoColor=white)](https://developer.chrome.com/docs/lighthouse/)

---

## 1. 프로젝트 개요 (Overview)

**이룸 (eerum)**은 비즈니스 리더와 글로벌 네트워크 구성원을 위한 **오프라인 우선(Local-First)** 고품격 디지털 명함 플랫폼입니다. 흔한 템플릿 서비스의 가벼운 느낌을 배제하고, 아날로그 인쇄물의 촉각적 깊이감과 정갈한 조판 미학을 웹 상에 그대로 재현했습니다.

사용자의 명함 정보와 연락처는 기본적으로 **사용자의 로컬 브라우저(IndexedDB/LocalStorage)**에만 존재하며, 외부 유출 위험 없이 **군사 등급 암호화(AES-GCM 256-bit)**와 **생체 인증(WebAuthn)**으로 안전하게 보호됩니다.

---

## 2. 핵심 차별화 요소 (Key Pillars)

1. **Quiet Luxury 미학 (타이포그래피 중심)**
   - 자극적인 그라디언트나 형광색 배제, 수묵(Sumi Ink), 한지(Warm Paper), 샴페인 샌드(Pure White), 딥 포레스트, 네이비 등 고급 소재 기반의 5대 프리셋.
   - 한글과 영문의 균형 잡힌 다국어 타이포그래피 계층 구조.
   - 3D CSS 원근감과 햅틱 반동 애니메이션이 적용된 양면(앞/뒷면) 플립 인터랙션.

2. **3대 명함 제작 아키텍처 (3-Way Card Creation)**
   - **디자인 템플릿 모드**: 6종의 레이아웃(Editorial Minimal, Monogram Executive, Swiss Typo Bold, Warm Organic, Vertical Atelier, Serenity Vertical)과 인적 정보 직관 입력.
   - **실물 사진 아카이빙 모드**: 종이 명함 전면/후면 사진을 브라우저 내에서 고품질 WebP로 압축·보정하여 실물 감성 그대로 보관.
   - **커스텀 HTML 코드 모드**: DOMPurify 및 Sandboxed iframe 격리 환경에서 자신만의 맞춤형 HTML/CSS 명함을 자유롭게 제작.

3. **로컬 우선 & 제로 트러스트 보안 (Privacy & Zero-AI)**
   - 제3자 AI 및 외부 트래커를 배제하여 개인 인적사항의 외부 학습 및 전송을 근본적으로 차단.
   - **PIN 잠금**: PBKDF2 100,000회 반복 해시 + 솔트 암호화, 5회 연속 실패 시 5분 냉각(Throttling).
   - **생체 인증(Biometrics)**: 브라우저 WebAuthn API(Face ID, Touch ID, 지문)를 활용한 원터치 잠금 해제.
   - **암호화 백업**: 마스터 패스워드로 암호화된 `.eerum.vault` 단일 파일 내보내기/불러오기 지원.

4. **명함 보관함 (Vault)과 내 명함(My Card)의 완전 분리**
   - 본인의 디지털 명함은 '내 명함' 탭에서 독립 관리.
   - 수신하거나 보관 중인 타인의 명함은 '명함 보관함'에서 카테고리별(VIP 파트너, 글로벌 네트워크, 공공·기관 등)로 분류, 실시간 음성 검색(Web Speech API) 및 다기준 정렬 지원.

5. **인쇄 및 다양한 공유 생태계**
   - 표준 규격 인쇄: 한국 표준(90×50mm) 및 국제 표준(85×55mm) 재단선(Crop Marks) 포함 A4 전지 시트 출력 지원.
   - 모바일 vCard(연락처 .vcf) 원클릭 전화번호부 저장.
   - 고해상도 QR 코드 생성 및 네이티브 Web Share API 연동.
   - 익명 피어 투 피어 동기화(Peer Sync)로 계정 생성 없이 기기간 명함 지갑 이전.

---

## 3. 기술 스택 (Tech Stack)

| 영역 | 사용 기술 | 설명 |
| :--- | :--- | :--- |
| **프론트엔드** | React 19, TypeScript 5, Vite 6 | 컴포넌트 기반 아키텍처 및 초고속 번들링 |
| **스타일링** | Tailwind CSS v4, Motion (Framer Motion) | 모던 CSS 및 3D 물리 기반 애니메이션 |
| **PWA** | vite-plugin-pwa, Workbox | 오프라인 캐싱, 서비스 워커, 홈 화면 설치 |
| **보안 및 암호화** | Web Crypto API (SubtleCrypto), WebAuthn | AES-GCM 256, PBKDF2 SHA-256, 생체 인증 |
| **살균 및 샌드박스** | DOMPurify | 커스텀 HTML 명함 XSS 공격 차단 |
| **백엔드 (Node.js)** | Express 4, tsx | 개발 서버 프록시 및 프로덕션 SSR/정적 서빙 |
| **엣지 런타임** | Cloudflare Workers, D1 (SQLite), R2 | 글로벌 엣지 배포용 서버리스 아키텍처 |

---

## 4. 폴더 구조 (Project Structure)

```text
├── public/                     # 정적 애셋 및 PWA 아이콘/매니페스트
│   ├── icon.svg, favicon.ico   # 브랜드 파비콘
│   ├── pwa-192x192.png 등      # PWA 마스커블 아이콘
│   ├── robots.txt, sitemap.xml # SEO 크롤러 최적화 파일
│   └── assets/                 # 미디어 및 스크린캐스트 자료
├── src/
│   ├── components/             # UI 컴포넌트
│   │   ├── BusinessCardFront.tsx   # 명함 앞면 렌더러
│   │   ├── BusinessCardBack.tsx    # 명함 뒷면 렌더러
│   │   ├── CardContainer.tsx       # 3D 양면 플립 컨테이너
│   │   ├── VaultView.tsx           # 명함 보관함 그리드/리스트 뷰
│   │   ├── VaultCardItem.tsx       # 보관함 명함 카드 아이템
│   │   ├── ActionButtons.tsx       # 전화/문자/길찾기/공유 액션 바
│   │   ├── PrintSheet.tsx          # 인쇄용 A4 조판 시트
│   │   ├── SandboxedCardRenderer.tsx # 커스텀 HTML 샌드박스
│   │   ├── editor/                 # 명함 편집기 서브 컴포넌트
│   │   └── AppModals.tsx           # 코드 스플리팅된 통합 모달 레이어
│   ├── constants/              # 기본 템플릿 및 샘플 명함
│   ├── hooks/                  # 커스텀 훅 (useAutoLock, useModalState, usePWAInstall)
│   ├── types/                  # TypeScript 인터페이스 (card.ts, api.ts)
│   ├── utils/                  # 핵심 유틸리티 (암호화, vCard, 이미지압축, 동기화)
│   ├── App.tsx                 # 최상위 뷰 및 라우팅 오케스트레이터
│   └── index.css               # Tailwind CSS v4 진입점
├── server.ts                   # Node.js Express 백엔드 (API & 정적 서빙)
├── worker.ts                   # Cloudflare Workers 엣지 라우터 (D1 & R2)
├── schema.sql                  # D1 SQLite 데이터베이스 스키마
├── wrangler.toml               # Cloudflare 배포 설정
├── vite.config.ts              # Vite 빌드 및 PWA 설정
└── package.json
```

---

## 5. 실행 및 개발 방법 (Getting Started)

### 사전 요구사항
- Node.js 18.0 이상
- npm 9.0 이상

### 설치 및 로컬 서버 구동
```bash
# 1. 의존성 설치
npm install

# 2. 로컬 풀스택 개발 서버 실행 (Port 3000)
npm run dev

# 3. 브라우저 접속
# http://localhost:3000
```

### 빌드 및 검사
```bash
# 타입 체크 및 린트 검사
npm run lint

# 프로덕션 최적화 빌드 (dist 생성)
npm run build

# 빌드 결과물 로컬 프리뷰
npm run preview
```

---

## 6. 라이선스 (License)

본 프로젝트는 비공개 독점 소프트웨어 또는 프로젝트 내 명시된 라이선스 규정을 따릅니다. 자세한 사항은 [LICENSE](./LICENSE) 파일을 참조하세요.

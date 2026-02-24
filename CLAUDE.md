# CLAUDE.md — 직방 단기임대(STR) 어드민 시스템

> 이 파일은 Claude (Cowork / Code) 세션이 프로젝트 컨텍스트를 빠르게 파악하기 위한 지침서입니다.
> 새 세션 시작 시: **"CLAUDE.md 읽고, docs/progress.md 최신 세션 읽어줘"**

---

## 1. 프로젝트 개요

**프로젝트명:** rental-admin-mvp (직방 단기임대 매물 관리 어드민)
**담당자:** Justin Choi (사업부, 비개발자)
**목표:** 정식 출시 전 AI 기반 매물 자동 검수 + CS 챗봇 구현

직방이 새로 시작하는 단기임대(STR, Short-Term Rental) 서비스의 매물 관리 백오피스.
호스트가 매물을 등록하면, 시스템 규칙 + AI가 자동으로 검수하여 승인/보완요청/반려를 판정한다.
관리자(어드민)는 예외 처리만 담당하는 것이 핵심 철학.

**자동 승인률 목표:** 90% 이상

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage + RLS) |
| AI (검수) | OpenAI GPT-4o Vision (매물 사진/텍스트 정책 위반 탐지) |
| AI (챗봇) | OpenAI GPT-4o (CS 챗봇 응답 생성) |
| Embedding | OpenAI text-embedding-3-small (정책 문서 벡터화) |
| Vector DB | Supabase pgvector (벡터 유사도 검색) |
| UI | shadcn/ui, Radix UI, TailwindCSS |
| Table | @tanstack/react-table |
| Form | React Hook Form + Zod |
| Address | Daum 주소 API |

---

## 3. 핵심 아키텍처: 2단계 자동 검수 파이프라인

```
매물 등록 (호스트)
    ↓
[1단계] 시스템 규칙 체크 (즉시, AI 불필요)
    ├─ 금칙어 발견 → 자동 반려
    ├─ 연락처 패턴 (010, URL 등) → 자동 반려
    ├─ 주소 중복 (동/호) → 자동 반려
    ├─ 관리대상 호스트 (위반 3회+) → 자동 반려
    └─ 통과 ↓
[2단계] AI 정책 검수 (비동기, GPT-4o Vision)
    ├─ 사진 내 연락처/QR → critical → 반려
    ├─ 중복사진 50%+ → major → 검수보완
    ├─ 실내사진 없음 → critical → 반려
    ├─ 사진 품질 저하 → major → 검수보완
    └─ 위반 없음 + auto_approval ON → 자동 승인
```

**판정 로직:**
- critical violation 1개+ → `rejected` (반려)
- major violation만 → `supplement` (검수보완, 호스트에게 수정 요청)
- 위반 없음 + auto_approval ON → `approved` (자동 승인)
- 위반 없음 + auto_approval OFF → `pending` (수동 대기)

---

## 4. 폴더 구조 (주요 파일)

```
rental-admin-mvp/
├── CLAUDE.md                          ← 이 파일 (세션 온보딩 가이드)
├── docs/
│   └── progress.md                    ← 세션별 진행 기록
├── app/
│   ├── actions/
│   │   └── property.ts                ← 매물 등록 (createProperty) — 시스템 규칙 통합
│   └── admin/
│       ├── dashboard/page.tsx         ← 대시보드 (통계, 자동승인률)
│       ├── properties/
│       │   ├── page.tsx               ← 매물 목록 (필터, 일괄처리)
│       │   ├── actions.ts             ← 매물 서버 액션 (CRUD, 통계)
│       │   └── [id]/
│       │       ├── page.tsx           ← 매물 상세 (승인/반려/보완)
│       │       ├── ai-actions.ts      ← AI 검수 (GPT-4o 정책 위반 탐지)
│       │       ├── inspection-details.tsx  ← 검수 결과 표시 컴포넌트
│       │       └── property-actions.tsx    ← 매물 액션 (상태 변경)
│       ├── settings/
│       │   ├── page.tsx               ← 설정 (자동승인, 검수 규칙)
│       │   ├── actions.ts             ← 설정 서버 액션
│       │   └── forbidden-words.tsx    ← 금칙어 관리 UI
│       ├── cs-chatbot/                ← CS 챗봇 (RAG 기반, 구현 완료)
│       │   ├── page.tsx               ← 챗봇 메인 (서버 컴포넌트 래퍼)
│       │   ├── chatbot-client.tsx     ← 2패널 레이아웃 (세션 목록 + 채팅)
│       │   ├── chat-interface.tsx     ← 채팅 UI (빠른 질문, 출처 표시)
│       │   └── actions.ts             ← 서버 액션 (sendMessage, createSession)
│       └── audit-logs/                ← 감사 로그
├── types/
│   ├── property.ts                    ← 매물 공통 타입 (단일 소스)
│   └── action-result.ts              ← Server Action 통일 응답 타입
├── lib/
│   ├── inspection/
│   │   └── system-rules.ts            ← 시스템 규칙 엔진 (금칙어, 중복, 패턴)
│   ├── admin-guard.ts                 ← Admin 권한 검증 유틸리티
│   ├── audit-log.ts                   ← 감사 로그 기록/조회
│   ├── env.ts                         ← 환경 변수 검증 (zod)
│   └── rag/                           ← RAG 파이프라인
│       ├── types.ts                   ← RAG 관련 타입 정의
│       ├── embeddings.ts              ← OpenAI text-embedding-3-small
│       ├── chunker.ts                 ← MD → 청크 분할 (FAQ Q+A / 헤더 기반)
│       ├── vector-search.ts           ← pgvector 유사도 검색
│       └── chat.ts                    ← GPT-4o RAG 파이프라인 오케스트레이션
├── scripts/
│   └── ingest-policies.mjs            ← 정책 문서 벡터 인제스트 CLI (ESM)
├── components/
│   ├── LoadingSpinner.tsx             ← 공통 로딩 컴포넌트
│   ├── ErrorMessage.tsx               ← 공통 에러 메시지 컴포넌트
│   └── ui/                            ← shadcn/ui 컴포넌트
├── supabase/migrations/               ← DB 마이그레이션
│   └── 20260213000000_add_inspection_system.sql  ← 검수 시스템 스키마
└── ../STR-정책/                       ← 정책 원본 문서 (참조용)
    └── files (1)/
        ├── 운영-1_매물검수.md          ← 매물 검수 정책 (핵심 참조)
        ├── 운영-2_호스트게스트관리.md
        ├── 정책-1_법적기준.md
        └── 정책-2_가격정책.md
```

---

## 5. DB 주요 테이블

### properties (매물)
- `status`: pending | approved | rejected | supplement
- `inspection_result`: JSONB — 시스템 규칙 + AI 검수 결과 통합
- `inspection_rule_violations`: TEXT[] — 시스템 규칙 위반 목록
- `inspection_ai_violations`: TEXT[] — AI 탐지 위반 목록
- `ai_review_score`: 0-100 (레거시 호환, AI 품질 점수)
- `ai_review_result`: JSONB (레거시 호환)

### forbidden_words (금칙어)
- `word`, `category`, `severity` (reject/flag), `is_regex`, `description`
- 카테고리: accommodation_fraud, external_contact, direct_transaction, contact_pattern

### admin_settings (어드민 설정)
- `auto_approval_enabled`, `auto_approval_threshold`
- `forbidden_words_enabled`, `duplicate_check_enabled`

### policy_embeddings (RAG 벡터)
- `content`, `embedding` (vector 1536), `source_file`, `category`, `section_title`
- 메타데이터: category (faq/policy/operation), target (common/host/guest), priority

### chat_sessions / chat_messages (CS 챗봇 대화)
- 세션별 대화 이력, 출처 추적, 매물 맥락 연동

---

## 6. 개발 컨벤션

### 파일 규칙
- 서버 액션: `actions.ts` (각 라우트 폴더 내)
- AI 관련: `ai-actions.ts`
- 클라이언트 컴포넌트: `"use client"` 필수 선언
- 한국어 UI 텍스트 (변수/코드는 영문)

### 상태 흐름
```
pending → approved | rejected | supplement
supplement → pending (호스트 재제출 시)
```

### 환경 변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=              # 임베딩 + 챗봇(GPT-4o) 통합
```

---

## 7. 로드맵 (큰 그림)

### 완료된 것
- 자동 검수: DB 스키마 + 시스템 규칙 엔진 + AI 정책 위반 탐지 + Admin UI
- 호스트 보완 워크플로우: 대시보드 → 상세 → 보완 피드백 → 수정/재제출 → 알림
- CS 챗봇 RAG: Phase 1~4 전체 완성 + 품질 개선 (마크다운 렌더링, [검토중] 태깅, 불필요 섹션 필터링)
- 감사 로그: 수동 + 자동 검수 전 이벤트 커버 (8개 액션 타입)
- 일괄 처리: 승인/반려/보완 요청 3종 완성

### 즉시 필요
- `정책-2_가격정책.md` 서브 헤더 추가 → 재인제스트 (확정/미확정 분리 개선)
- 실환경 테스트 (검수, 호스트 보완, CS 챗봇)

### 다음 목표
- 정책 문서 업데이트 시 자동 재인제스트
- 호스트/게스트 관리 기능 (운영-2 정책 기반)

---

## 8. 세션 운영 방법

### Cowork 세션 (기획/설계)
- 정책 분석, 구조 설계, UI 기획
- 결과물 → docs/progress.md에 기록

### Code 세션 (구현)
- 코드 작성, 버그 수정, 빌드 검증
- 완료 후 → docs/progress.md에 기록

### 새 세션 시작 시
```
"CLAUDE.md 읽고, docs/progress.md 최신 세션 읽어줘"
```
이 한 마디면 어떤 세션이든 현재 상황을 파악하고 바로 이어서 작업 가능.

---

## 9. 디자인 가이드라인 (상세: docs/design-guide.md)

### 공통 원칙
- 여백: 8px 배수 시스템 (Tailwind 기본), 섹션 간 gap-6~gap-8
- 색상: 시맨틱 변수 사용 필수 (bg-primary, text-muted-foreground 등)
- 라디우스: --radius 변수로 통일 (0.75rem)
- 폰트: Inter + 시스템 폰트 fallback
- 타이포 계층: bold/semibold/normal + foreground/muted-foreground

### 호스트 페이지 (/host/*)
- 모바일 퍼스트, 싱글 컬럼
- 아이콘: Phosphor Icons (`@phosphor-icons/react`) — Regular/Fill/Bold
- 입력창: h-12 (48px), text-base (16px), 상단 라벨 (font-medium)
- 검증: onBlur 에러표시, onChange 에러제거 (mode: "onTouched")
- 포커스: ring-2 ring-primary/20 transition-shadow
- 카드: border-0 shadow-sm, 넉넉한 패딩
- 버튼: h-12~h-14, rounded-xl

### 어드민 페이지 (/admin/*)
- 데스크톱 우선, 데이터 밀도 중시
- 아이콘: Lucide Icons (strokeWidth={1.5})
- 입력창: h-10 (40px) 기본, 정보 밀도 우선
- 카드: border shadow-sm
- 테이블: compact 모드 허용

---

## 10. 자동 스킬 적용 규칙 (Agent Skill Auto-Dispatch)

> **핵심 원칙: 사용자(Justin)는 스킬 이름을 몰라도 된다. Claude가 작업 맥락을 보고 자동으로 적용한다.**

### 자동 적용 매트릭스

Claude는 아래 상황을 감지하면 해당 스킬을 **자동으로** 참조하여 작업에 반영한다:

| 상황 감지 | 자동 적용 스킬 | 비고 |
|-----------|---------------|------|
| `.sql` 파일 수정, DB 쿼리 작성 | supabase-postgres-best-practices, postgresql-table-design, sql-optimization-patterns | |
| `.tsx`/`.ts` 파일 수정 (app/ 하위) | next-best-practices, nextjs-app-router-patterns | |
| 컴포넌트 구조 설계, Props 설계 | vercel-composition-patterns, vercel-react-best-practices | |
| 상태 관리 코드 작성 | react-state-management | |
| TypeScript 타입 정의 | typescript-advanced-types | |
| 테스트 코드 작성 | javascript-testing-patterns, test-driven-development | |
| E2E 테스트 작성 | e2e-testing-patterns, webapp-testing | |
| 버그 조사/수정 | systematic-debugging, debugging-strategies | |
| UI/디자인 작업 | frontend-design, tailwind-design-system, design-system-patterns | |
| 반응형 레이아웃 | responsive-design | |
| 에러 처리 코드 | error-handling-patterns | |
| API 설계/수정 | api-design-principles | |
| 인증/권한 코드 | auth-implementation-patterns, secrets-management | |
| RAG/임베딩 작업 | rag-implementation, embedding-strategies | |
| DB 마이그레이션 | database-migration | |
| 배포/CI/CD 작업 | deployment-pipeline-design | |
| AI 프롬프트 작성 | prompt-engineering-patterns | |
| 작업 완료 선언 전 | verification-before-completion | **항상** |

### 워크플로우 스킬 자동 체인

복합 작업 시 Claude는 다음 스킬 체인을 자동으로 따른다:

1. **새 기능 구현**: brainstorming → writing-plans → (사용자 확인) → executing-plans → verification-before-completion
2. **버그 수정**: systematic-debugging → test-driven-development → verification-before-completion
3. **코드 리뷰 요청**: requesting-code-review → code-review-excellence
4. **브랜치 완료**: finishing-a-development-branch → verification-before-completion
5. **대규모 작업**: dispatching-parallel-agents → subagent-driven-development

### 슬래시 커맨드 (사용자용)

사용자는 `.claude/commands/` 에 정의된 워크플로우 커맨드를 사용할 수 있다:
- `/project:새기능` — 새 기능 전체 워크플로우
- `/project:버그수정` — 버그 수정 워크플로우
- `/project:코드점검` — 코드 품질 점검
- `/project:배포준비` — 배포 전 최종 체크
- `/project:현황` — 프로젝트 현재 상태 종합 리포트

---

## 11. 참조 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| 매물 검수 정책 | `../STR-정책/files (1)/운영-1_매물검수.md` | 자동 검수 규칙의 원본 정책 |
| PRD 로드맵 | `단기임대_어드민시스템_개선_PRD_로드맵.md` | 전체 시스템 개선 PRD |
| PRD 요약 | `PRD_공유용_요약.md` | 공유용 요약본 |
| 설치 가이드 | `SETUP.md` | 개발 환경 설정 |
| RAG 설계서 | `docs/rag-design.md` | CS 챗봇 RAG 전체 설계 |
| 디자인 가이드 | `docs/design-guide.md` | 아이콘/폼/테마 디자인 규칙 |
| 진행 기록 | `docs/progress.md` | 세션별 진행 상황 |

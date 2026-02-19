# 세션 진행 기록 (Progress Log)

> 각 세션 종료 시 아래에 기록을 추가합니다.
> 새 세션 시작 시 **최신 세션 항목**만 읽으면 현재 상황을 파악할 수 있습니다.

---

## Session 10 — 2026-02-14 (Cowork)

**작업 내용:** 프로젝트 현황 리포트 + 환경 설정 가이드 작성

코드 구현은 완료되었으나, 실환경 동작을 위한 환경 설정(DB 마이그레이션, API 키, 정책 인제스트)이 필요한 상태를 파악하고, 사용자가 직접 설정할 수 있도록 3단계 가이드를 작성했다.

### 프로젝트 현황 리포트

- **코드 규모:** 104개 파일 (app 60개, components 24개, lib 12개, types 2개, utils 5개, scripts 1개)
- **완료 기능:** 자동 검수 시스템, 호스트 보완 워크플로우, CS 챗봇(RAG), 감사 로그, 일괄 처리
- **빌드 상태:** TypeScript 에러 0개, 빌드 성공, TODO/FIXME 0개
- **기술 부채:** Next.js 보안 취약점 4건(높음), `any` 타입 6건
- **블로킹 이슈:** DB 마이그레이션 미실행, API 키 미설정, 정책 문서 미인제스트

### 환경 설정 가이드 (3단계)

**1단계: Supabase SQL 마이그레이션 (4개)**
- `20260213000000_add_inspection_system.sql` — 자동 검수 시스템 (금칙어, 검수 결과 저장)
- `20260214000000_host_supplement_workflow.sql` — 호스트 보완 워크플로우 (RLS 정책)
- `20260214100000_add_rag_system.sql` — CS 챗봇 RAG (pgvector, 벡터 검색)
- `20260214200000_chatbot_feedback.sql` — 챗봇 답변 피드백

**2단계: API 키 설정 (.env.local)**
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase 대시보드에서 발급
- `OPENAI_API_KEY` — AI 검수 + 문서 벡터화
- `ANTHROPIC_API_KEY` — CS 챗봇 응답

**3단계: 정책 문서 인제스트**
- `npm install dotenv` — 스크립트 실행을 위한 패키지 설치
- `npx tsx scripts/ingest-policies.ts` — 정책 문서 벡터화

### 현재 상태

코드 구현 100% 완료, 환경 설정 0% 완료 (사용자 액션 대기 중)

**다음 세션 시작 시:** "환경 설정 완료했어?" 물어보고, 완료했으면 실환경 테스트, 안했으면 가이드대로 함께 진행

---

## Session 9 — 2026-02-13 (Code)

**작업 내용:** 일괄 보완 요청 기능 추가

기존 일괄 승인/반려에 더해, **일괄 보완 요청(supplement)** 기능을 추가했다. 어드민이 여러 매물을 선택하고 한번에 보완을 요청할 수 있다.

### 변경 내용

- `app/admin/properties/actions.ts` — `bulkSupplementProperties()` 서버 액션 추가 (status → "supplement" + admin_comment 일괄 적용)
- `app/admin/properties/page.tsx` — 일괄 액션 바에 "일괄 보완 요청" 버튼 추가 (주황색), 보완 사유 입력 다이얼로그 추가
- `lib/audit-log.ts` — `property_bulk_supplement` 감사 로그 액션 타입 추가

### 일괄 처리 완성 현황

| 액션 | 이전 | 이후 |
|------|------|------|
| 일괄 승인 | O | O |
| 일괄 반려 (사유 입력) | O | O |
| 일괄 보완 요청 (사유 입력) | X | O |

### 빌드 검증
- `npx tsc --noEmit` 통과 (에러 0개)
- `npm run build` 성공

---

## Session 8 — 2026-02-13 (Code)

**작업 내용:** CS 챗봇 Phase 4 — 매물 맥락 연동 + 답변 피드백

챗봇의 고도화 기능을 구현했다. 매물 상세 페이지에서 챗봇으로 바로 연결하여 해당 매물 맥락을 포함한 대화를 시작할 수 있고, 어시스턴트 답변에 좋아요/나빠요 피드백을 남길 수 있다.

### 구현 내용

**매물 맥락 연동**
- `app/admin/properties/[id]/page.tsx` — 헤더에 "이 매물에 대해 질문" 버튼 추가 → `/admin/cs-chatbot?propertyId={id}`로 이동
- `app/admin/cs-chatbot/page.tsx` — `searchParams.propertyId` 수신, 매물 정보 조회 후 클라이언트에 전달
- `app/admin/cs-chatbot/chatbot-client.tsx` — `initialPropertyContext` prop 추가, URL에 매물 맥락이 있으면 자동으로 새 세션 생성 (context_property_id 포함), 매물 맥락 배지 표시 (파란색 바)
- `app/admin/cs-chatbot/actions.ts` — `getPropertyContext()` 액션 추가

**답변 피드백**
- `supabase/migrations/20260214200000_chatbot_feedback.sql` — chat_messages에 feedback 컬럼 추가 ('helpful' | 'not_helpful')
- `app/admin/cs-chatbot/actions.ts` — `submitFeedback()` 액션 추가 (세션 소유권 검증 포함)
- `app/admin/cs-chatbot/chat-interface.tsx` — 어시스턴트 메시지에 ThumbsUp/ThumbsDown 버튼 추가, 피드백 상태 시각적 반영 (선택 시 색상 변경)

### 빌드 검증
- `npx tsc --noEmit` 통과 (에러 0개)
- `npm run build` 성공 (20개 라우트)

### 신규 파일 (1개)
| 파일 | 변경 |
|------|------|
| `supabase/migrations/20260214200000_chatbot_feedback.sql` | 신규 |

### 수정 파일 (4개)
| 파일 | 변경 |
|------|------|
| `app/admin/properties/[id]/page.tsx` | "이 매물에 대해 질문" 버튼 추가 |
| `app/admin/cs-chatbot/page.tsx` | searchParams로 propertyId 수신, 매물 정보 조회 |
| `app/admin/cs-chatbot/chatbot-client.tsx` | 매물 맥락 자동 세션 생성, 맥락 배지 표시 |
| `app/admin/cs-chatbot/chat-interface.tsx` | 피드백 버튼 (좋아요/나빠요) 추가 |
| `app/admin/cs-chatbot/actions.ts` | getPropertyContext, submitFeedback 액션 추가 |

**현재 상태:** 구현 완료. 마이그레이션 실행 후 동작 테스트 필요.

---

## Session 7 — 2026-02-13 (Code)

**작업 내용:** 감사 로그에 자동 검수 이벤트 기록 추가

자동 검수 파이프라인의 모든 판정 결과가 감사 로그에 남도록 통합했다. 기존에는 수동 승인/반려만 기록되었고, 시스템 자동 반려/AI 자동 반려/AI 자동 승인/AI 보완 요청/호스트 재제출은 기록되지 않았다.

### 변경 내용

- `lib/audit-log.ts` — 6개 AuditAction 타입 추가 (`auto_rejected_system`, `auto_rejected_ai`, `auto_approved`, `auto_supplement`, `auto_approved_no_ai`, `host_resubmitted`), `admin_user_id`를 nullable로 변경 (자동 처리 시 null)
- `app/actions/property.ts` — 시스템 규칙 자동 반려 시 감사 로그 기록
- `app/admin/properties/[id]/ai-actions.ts` — `finalizeInspection()` 3가지 분기 (반려/보완/승인) + `finalizeWithoutAi()` 승인 시 감사 로그 기록
- `app/host/actions.ts` — 호스트 재제출 시 감사 로그 기록

### 감사 로그 커버리지

| 이벤트 | 이전 | 이후 |
|--------|------|------|
| 수동 승인/반려/일괄 | O | O |
| 시스템 규칙 자동 반려 | X | O |
| AI 자동 반려 | X | O |
| AI 자동 승인 | X | O |
| AI 보완 요청 | X | O |
| AI 비활성 자동 승인 | X | O |
| 호스트 재제출 | X | O |

### 빌드 검증
- `npx tsc --noEmit` 통과 (에러 0개)
- `npm run build` 성공

---

## Session 6 — 2026-02-13 (Code)

**작업 내용:** CS 챗봇 RAG 구현 (Phase 1~3)

`docs/rag-design.md` 설계를 기반으로 CS 챗봇 RAG 파이프라인 Phase 1~3을 전체 구현했다. 정책 문서 벡터화 → 유사도 검색 → Claude 응답 생성 → 챗봇 UI까지 완성.

### 구현 내용

**Phase 1: 벡터 인프라**
- `supabase/migrations/20260214100000_add_rag_system.sql` — pgvector 확장, policy_embeddings 테이블, match_policy_documents RPC, chat_sessions/messages 테이블, RLS 정책
- `lib/rag/types.ts` — DocumentChunk, PolicyChunk, ChatMessage, ChatSession, FILE_CATEGORY_MAP 등 RAG 관련 타입
- `lib/rag/embeddings.ts` — OpenAI text-embedding-3-small 호출 (단일 + 배치)
- `lib/rag/chunker.ts` — 마크다운 청킹 (FAQ.md 파이프 테이블 → Q+A 쌍, 나머지 → 헤더 기반 섹션 분할 + 오버랩)
- `scripts/ingest-policies.ts` — 정책 문서 벡터 인제스트 CLI (`npx tsx scripts/ingest-policies.ts`)

**Phase 2: 검색 + 응답**
- `lib/rag/vector-search.ts` — pgvector 유사도 검색 (질문 임베딩 → RPC 호출 → 유사도 필터링)
- `lib/rag/chat.ts` — RAG 파이프라인 오케스트레이션 (카테고리 분류 → 벡터 검색 → 대화 이력 + 매물 맥락 구성 → Claude Sonnet 4.5 호출)
- `app/admin/cs-chatbot/actions.ts` — 서버 액션 (createSession, getSessions, deleteSession, getMessages, sendMessage)

**Phase 3: 챗봇 UI**
- `app/admin/cs-chatbot/page.tsx` — 서버 컴포넌트 래퍼
- `app/admin/cs-chatbot/chatbot-client.tsx` — 좌측 세션 목록 + 우측 채팅 2패널 레이아웃
- `app/admin/cs-chatbot/chat-interface.tsx` — 채팅 UI (빠른 질문 버튼, 낙관적 업데이트, 출처 표시, 로딩 상태)
- `app/admin/layout.tsx` 수정 — CS 챗봇 네비게이션 추가 (MessageCircle 아이콘)

### 추가 의존성
- `@anthropic-ai/sdk` — Claude API 호출용

### 빌드 검증
- `npx tsc --noEmit` 통과 (에러 0개)
- `npm run build` 성공 (19개 라우트 정상 생성, `/admin/cs-chatbot` 포함)

### 신규 파일 (11개)
| 파일 | 변경 |
|------|------|
| `supabase/migrations/20260214100000_add_rag_system.sql` | 신규 |
| `lib/rag/types.ts` | 신규 |
| `lib/rag/embeddings.ts` | 신규 |
| `lib/rag/chunker.ts` | 신규 |
| `lib/rag/vector-search.ts` | 신규 |
| `lib/rag/chat.ts` | 신규 |
| `scripts/ingest-policies.ts` | 신규 |
| `app/admin/cs-chatbot/actions.ts` | 신규 |
| `app/admin/cs-chatbot/page.tsx` | 신규 |
| `app/admin/cs-chatbot/chatbot-client.tsx` | 신규 |
| `app/admin/cs-chatbot/chat-interface.tsx` | 신규 |

### 수정 파일 (1개)
| 파일 | 변경 |
|------|------|
| `app/admin/layout.tsx` | CS 챗봇 네비게이션 추가 |

**현재 상태:** 코드 구현 완료. 동작을 위해 필요한 사항:
1. 마이그레이션 실행 (`20260214100000_add_rag_system.sql`)
2. 정책 문서 인제스트 (`npx tsx scripts/ingest-policies.ts`)
3. ANTHROPIC_API_KEY 환경 변수 설정

---

## Session 5 — 2026-02-13 (Code)

**작업 내용:** 호스트 보완 워크플로우 전체 구현

매물이 AI 검수에서 "보완 필요(supplement)" 판정을 받았을 때, 호스트가 피드백을 확인하고 수정/재제출할 수 있는 전체 플로우를 구현했다. 기존에 `/host/register/` 페이지만 있던 것에서, 호스트 대시보드 → 매물 상세 → 보완 피드백 → 수정/재제출 → 알림까지 완성.

### 구현 내용

**Phase 0: 기반 작업**
- `supabase/migrations/20260214000000_host_supplement_workflow.sql` — 알림 트리거 수정(host_id 사용, 호스트 페이지 링크), 호스트용 RLS 정책 추가
- `lib/host-guard.ts` — 호스트 인증 가드 (admin-guard 패턴 복제)
- `lib/property-mapper.ts` — 폼↔DB 매핑 유틸리티 (createProperty와 공용)
- `utils/supabase/middleware.ts` — 호스트 보호 경로 추가

**Phase 1: 레이아웃 + 서버 액션**
- `app/host/layout.tsx` — 호스트용 레이아웃 (모바일 퍼스트, 네비+알림벨)
- `app/host/actions.ts` — getHostProperties, getHostProperty, updatePropertyAndResubmit
- `app/host/notification-actions.ts` — getNotifications, getUnreadCount, markAsRead, markAllAsRead

**Phase 2: 호스트 대시보드**
- `app/host/dashboard/page.tsx` — 매물 목록, 빈 상태
- `app/host/dashboard/status-summary.tsx` — 상태별 매물 수 (supplement 강조)
- `app/host/dashboard/property-list.tsx` — 매물 카드 목록

**Phase 3: 매물 상세 + 보완 피드백**
- `app/host/properties/[id]/page.tsx` — 매물 상세 (서버 컴포넌트)
- `app/host/properties/[id]/property-detail-client.tsx` — 이미지 캐러셀 + 상태별 안내
- `app/host/properties/[id]/supplement-feedback.tsx` ★ — AI 위반 → 한국어 가이드 변환 (7가지 유형)
- `app/host/properties/[id]/property-info-summary.tsx` — 읽기 전용 매물 정보

**Phase 4: 수정/재제출**
- `app/host/properties/[id]/edit/page.tsx` — supplement만 수정 가능, 폼 pre-fill
- `app/host/properties/[id]/edit/edit-form-client.tsx` — 기존 Step 컴포넌트 100% 재사용
- `app/host/properties/[id]/edit/supplement-banner.tsx` — 위반 항목 → 스텝 바로가기
- `app/host/register/components/ImageUploader.tsx` 수정 — initialImages prop 추가

**Phase 5: 알림**
- `app/host/notifications/page.tsx` — 알림 목록
- `app/host/notifications/notification-list.tsx` — 읽음/안읽음, 타입별 아이콘

### 리팩토링
- `app/actions/property.ts` — 인라인 매핑 → `formDataToDbColumns()` 공용 유틸리티로 추출

### 빌드 검증
- `npx tsc --noEmit` 통과 (에러 0개)
- `npm run build` 성공 (18개 라우트 정상 생성)

### 신규 파일 (19개)
| 파일 | 변경 |
|------|------|
| `supabase/migrations/20260214000000_host_supplement_workflow.sql` | 신규 |
| `lib/host-guard.ts` | 신규 |
| `lib/property-mapper.ts` | 신규 |
| `app/host/layout.tsx` | 신규 |
| `app/host/actions.ts` | 신규 |
| `app/host/notification-actions.ts` | 신규 |
| `app/host/dashboard/page.tsx` | 신규 |
| `app/host/dashboard/status-summary.tsx` | 신규 |
| `app/host/dashboard/property-list.tsx` | 신규 |
| `app/host/properties/[id]/page.tsx` | 신규 |
| `app/host/properties/[id]/property-detail-client.tsx` | 신규 |
| `app/host/properties/[id]/supplement-feedback.tsx` | 신규 |
| `app/host/properties/[id]/property-info-summary.tsx` | 신규 |
| `app/host/properties/[id]/edit/page.tsx` | 신규 |
| `app/host/properties/[id]/edit/edit-form-client.tsx` | 신규 |
| `app/host/properties/[id]/edit/supplement-banner.tsx` | 신규 |
| `app/host/notifications/page.tsx` | 신규 |
| `app/host/notifications/notification-list.tsx` | 신규 |

### 수정 파일 (3개)
| 파일 | 변경 |
|------|------|
| `utils/supabase/middleware.ts` | 호스트 보호 경로 추가 |
| `app/host/register/components/ImageUploader.tsx` | initialImages prop 추가 |
| `app/actions/property.ts` | formDataToDbColumns 유틸리티 사용으로 리팩토링 |

**현재 상태:** 구현 완료. 마이그레이션 실행 후 실환경 테스트 필요.

---

## Session 4 — 2026-02-13 (Cowork)

**작업 내용:** CS 챗봇 RAG 아키텍처 설계

Next.js 통합 방식의 RAG + CS 챗봇 전체 아키텍처를 설계했다. 별도 Python 서버(LangChain+Streamlit) 대신, 기존 Next.js 앱 내에 직접 RAG 파이프라인을 구현하는 방향으로 결정.

**설계 문서:** `docs/rag-design.md` (상세 설계서)

**핵심 결정사항:**
- 별도 Python 서버 X → Next.js Server Action으로 통합 (인프라 1개)
- LangChain X → 직접 구현 (~100줄, 디버깅 용이)
- Streamlit X → 어드민 내 챗봇 페이지 (맥락 연동 가능)
- 스택: Supabase pgvector + OpenAI embedding-3-small + Claude Sonnet 4.5

**설계 내용:**
- 정책 문서 19개 (350KB) 분석 → 우선순위 분류 (P0~P3)
- 청킹 전략: FAQ는 Q+A 쌍 단위, 나머지는 헤더 기반 (1500자, 200자 오버랩)
- 메타데이터: source_file, category, target, section_title, priority
- DB: policy_embeddings (pgvector), chat_sessions, chat_messages
- Claude 시스템 프롬프트: 직방 STR CS 전문 상담원 역할
- UI: 좌측 세션 목록 + 우측 채팅, 출처 표시, 매물 맥락 연동

**구현 로드맵:**
- Phase 1 (1일): 벡터 인프라 (DB, embeddings, chunker, ingest script)
- Phase 2 (1일): 검색 + 응답 (vector-search, chat, server actions)
- Phase 3 (1-2일): 챗봇 UI (page, chat-interface, nav)
- Phase 4 (이후): 매물 맥락 연동, 피드백, 자동 재인제스트

**업데이트한 파일:**
- `CLAUDE.md` — RAG 관련 기술 스택, 폴더 구조, DB 테이블, 로드맵 추가
- `docs/progress.md` — 이 세션 기록 추가

**현재 상태:** 설계 완료, 구현 준비 상태. Code 세션에서 Phase 1부터 시작 가능.

---

## Session 3 — 2026-02-13 (Cowork)

**작업 내용:** CLAUDE.md + docs/progress.md 생성

이전 세션들에서 구현한 자동 검수 시스템의 컨텍스트를 영구 보존하기 위해 세션 온보딩 가이드(CLAUDE.md)와 이 진행 기록 파일을 생성했다.

**생성된 파일:**
- `CLAUDE.md` — 프로젝트 전체 컨텍스트, 아키텍처, 컨벤션 가이드
- `docs/progress.md` — 이 파일 (세션별 진행 기록)

**현재 상태:** 기획/설계 모드로 전환. 이후 Cowork에서 기획, Code에서 구현 분리 운영.

---

## Session 2 — 2026-02-13 (Cowork, 이전 세션 이어서)

**작업 내용:** 자동 검수 시스템 Phase 1~4 전체 구현 완료

이전 세션에서 설계한 계획(immutable-bouncing-falcon.md)을 기반으로 4개 Phase를 모두 구현했다.

### Phase 1: DB + 시스템 규칙 엔진 (이전 세션에서 완료)
- `supabase/migrations/20260213000000_add_inspection_system.sql` 생성
- `lib/inspection/system-rules.ts` 생성
- `app/actions/property.ts` 수정 — createProperty에 시스템 규칙 통합

### Phase 2: AI 프롬프트 리팩토링
- `app/admin/properties/[id]/ai-actions.ts` 전면 재작성
  - 기존: 5항목 품질 채점 (100점 만점)
  - 변경: 8가지 정책 위반 유형 탐지 (critical/major/minor)
  - 위반 유형: photo_contact_info, duplicate_photos, no_interior_photos, irrelevant_photos, low_quality_photos, space_bias, text_policy_violation, misleading_info
  - `finalizeInspection()` — 시스템 규칙 + AI 결과 조합하여 최종 판정
  - `finalizeWithoutAi()` — OPENAI_API_KEY 없을 때 폴백

### Phase 3: Admin UI 전체 업데이트
- `app/admin/properties/[id]/inspection-details.tsx` 신규 — 검수 결과 표시 컴포넌트
- `app/admin/properties/[id]/page.tsx` 수정 — InspectionDetails 통합, supplement 상태 추가
- `app/admin/properties/[id]/property-actions.tsx` 수정 — supplement 상태 타입 추가
- `app/admin/properties/page.tsx` 수정 — "보완 필요" 필터 탭, supplement 배지
- `app/admin/properties/actions.ts` 수정 — supplement 통계 추가
- `app/admin/settings/forbidden-words.tsx` 신규 — 금칙어 관리 (카테고리별 탭, 추가/삭제)
- `app/admin/settings/actions.ts` 수정 — 금칙어 CRUD, 검수 설정 액션 추가
- `app/admin/settings/page.tsx` 수정 — 검수 규칙 설정 카드, ForbiddenWordsManager
- `components/ui/checkbox.tsx` 신규 — 누락된 shadcn/ui 컴포넌트

### Phase 4: 대시보드 확장
- `app/admin/dashboard/page.tsx` 수정 — 자동승인률 카드, 보완 필요 카드, supplement 통계

### 빌드 검증
- `npx tsc --noEmit` 통과 (에러 0개)
- 수정한 빌드 에러: MapIterator 이슈, null 타입 이슈, 누락 컴포넌트

### 수정된 파일 전체 목록
| 파일 | 변경 |
|------|------|
| `supabase/migrations/20260213000000_add_inspection_system.sql` | 신규 |
| `lib/inspection/system-rules.ts` | 신규 |
| `app/actions/property.ts` | 수정 |
| `app/admin/properties/[id]/ai-actions.ts` | 전면 재작성 |
| `app/admin/properties/[id]/inspection-details.tsx` | 신규 |
| `app/admin/properties/[id]/page.tsx` | 수정 |
| `app/admin/properties/[id]/property-actions.tsx` | 수정 |
| `app/admin/properties/page.tsx` | 수정 |
| `app/admin/properties/actions.ts` | 수정 |
| `app/admin/settings/forbidden-words.tsx` | 신규 |
| `app/admin/settings/actions.ts` | 수정 |
| `app/admin/settings/page.tsx` | 수정 |
| `app/admin/dashboard/page.tsx` | 수정 |
| `components/ui/checkbox.tsx` | 신규 |

---

## Session 1 — 2026-02-13 (Cowork)

**작업 내용:** 정책 분석 + 자동 검수 시스템 설계

STR-정책 폴더의 운영-1_매물검수.md 정책 문서를 분석하고, rental-admin-mvp 코드베이스를 탐색하여 자동 검수 시스템의 전체 설계안을 작성했다.

**분석한 정책:**
- 운영-1_매물검수.md — 금칙어 목록, 사진 규칙, 중복 체크, 자동 판정 기준

**설계 결과:**
- 계획 파일: `.claude/plans/immutable-bouncing-falcon.md`
- 2단계 파이프라인 설계 (시스템 규칙 → AI 정책 검수)
- 4 Phase 구현 계획 수립 및 승인

**탐색한 코드:**
- app/actions/property.ts (매물 등록 플로우)
- app/admin/properties/[id]/ai-actions.ts (기존 AI 채점)
- app/admin/settings/ (설정 구조)
- supabase/migrations/ (DB 스키마)

---

## 다음 할 일 (Backlog)

### 즉시 필요 (환경 설정 — 사용자 액션)
- [ ] Supabase 마이그레이션 실행 (4개: `20260213000000_add_inspection_system.sql`, `20260214000000_host_supplement_workflow.sql`, `20260214100000_add_rag_system.sql`, `20260214200000_chatbot_feedback.sql`)
- [ ] 정책 문서 인제스트 실행 (`npx tsx scripts/ingest-policies.ts`)
- [ ] ANTHROPIC_API_KEY 환경 변수 설정
- [ ] 실환경 테스트: 자동 검수 (금칙어 반려, AI 검수, supplement 플로우)
- [ ] 실환경 테스트: 호스트 보완 워크플로우 (대시보드 → 상세 → 수정 → 재제출)
- [ ] 실환경 테스트: CS 챗봇 (정책 질문 → RAG 응답 → 매물 맥락 → 피드백)

### 단기 목표
- [x] ~~일괄 처리 고도화~~ (승인/반려/보완 요청 모두 완성)
- [ ] 정책 문서 업데이트 시 자동 재인제스트

### 중기 목표
- [ ] 호스트/게스트 관리 기능 (운영-2 정책 기반)
- [ ] 알림 시스템 (이메일/푸시)

### 장기 목표
- [ ] 가격 추천 AI
- [ ] 시장 분석 대시보드
- [ ] 모바일 어드민

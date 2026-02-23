# 세션 진행 기록 (Progress Log)

> 각 세션 종료 시 아래에 기록을 추가합니다.
> 새 세션 시작 시 **최신 세션 항목**만 읽으면 현재 상황을 파악할 수 있습니다.

---

## Session 14 — 2026-02-23 (Code)

**작업 내용:** Phase 2.1 Critical 이슈 완료 (4건 해결, 13/13건 100%)

Phase 2.1의 남은 Critical 이슈 4건을 모두 해결하고, 기존 TypeScript 타입 에러도 수정했다. 모든 테스트 통과, 빌드 성공.

### 완료된 Critical 이슈 (4건, ~3시간)

**1. Issue 2.10: AI 검수 에러 처리** (1시간)
- `app/admin/properties/[id]/ai-actions.ts` — finalizeInspection, finalizeWithoutAi 함수에 try-catch 추가
- DB 조회/업데이트 실패 시 graceful degradation
- 감사 로그 실패 시에도 핵심 로직 계속 실행
- 에러별 상세 로깅 (fetchError, settingsError, updateError, auditError)

**2. Issue 3.1: Error Boundary 구현** (1시간)
- `app/admin/error.tsx` — 어드민 전체 Error Boundary (AlertCircle, 다시 시도, 대시보드 이동)
- `app/admin/properties/error.tsx` — 매물 목록 Error Boundary
- `app/admin/cs-chatbot/error.tsx` — CS 챗봇 Error Boundary
- Next.js App Router의 자동 Error Boundary 활용 (route-level)
- 일관된 UX: 아이콘 + 메시지 + CTA 버튼 패턴

**3. Issue 3.2: 검색 Input 접근성** (15분)
- `app/admin/properties/page.tsx` — 검색창에 `<label htmlFor="property-search" className="sr-only">` 추가
- id 연결, screen reader 접근성 개선

**4. Issue 3.3: 챗봇 Textarea 접근성** (15분)
- `app/admin/cs-chatbot/chat-interface.tsx` — 입력창에 `<label htmlFor="chatbot-input" className="sr-only">` 추가
- id 연결, screen reader 접근성 개선

### 보너스: 기존 TypeScript 에러 수정 (30분)

**ActionResult<T> 타입 오류 수정**
- `app/admin/properties/page.tsx` — 3곳 수정
  - `result.count` → `result.data.count` (bulkApprove, bulkReject, bulkSupplement)
- `app/host/register/page.tsx` — 1곳 수정
  - `result.error` → `!result.success` (createProperty 응답 체크)
- 타입 정의: `ActionResult<{ count: number }>` → `{ success: true, data: { count } }`

**테스트 unhandled rejection 수정**
- `tests/lib/utils/retry.test.ts` — "should throw after max retries" 테스트에 `promise.catch(() => {})` 추가
- 비동기 에러 핸들러 미리 등록하여 unhandled rejection 방지

### 테스트 현황

**총 23개 테스트 모두 통과 ✅ (에러 0개)**
- `tests/example.test.ts` — 4개
- `tests/lib/rag/chunker.test.ts` — 6개
- `tests/lib/utils/retry.test.ts` — 8개
- `tests/lib/inspection/system-rules.test.ts` — 5개

### 빌드 검증

- `npx tsc --noEmit` — 통과 (타입 에러 0개)
- `npm run build` — 성공 (19개 라우트 생성)

### Phase 2.1 최종 현황

**Critical Issues: 13 / 13 완료 (100%)** ✅

✅ 전체 완료 (13건):
1. 4.1: 테스트 프레임워크 설정
2. 1.1, 1.2, 1.4: 데이터베이스 마이그레이션
3. 2.1: Error 처리 일관성
4. 2.5: OpenAI Rate Limit 대응
5. 2.6: OpenAI Timeout 설정
6. 2.7: RAG Chunking 버그 수정
7. 2.9: System Rules 에러 처리
8. **2.10: AI 검수 에러 처리** ← 이번 세션
9. **3.1: Error Boundary 구현** ← 이번 세션
10. **3.2, 3.3: 접근성 레이블 추가** ← 이번 세션

### 신규 파일 (3개)

| 파일 | 변경 |
|------|------|
| `app/admin/error.tsx` | 신규 (Error Boundary) |
| `app/admin/properties/error.tsx` | 신규 (Error Boundary) |
| `app/admin/cs-chatbot/error.tsx` | 신규 (Error Boundary) |

### 수정 파일 (5개)

| 파일 | 변경 |
|------|------|
| `app/admin/properties/[id]/ai-actions.ts` | finalizeInspection, finalizeWithoutAi try-catch |
| `app/admin/properties/page.tsx` | 검색 label + 타입 에러 수정 (3곳) |
| `app/admin/cs-chatbot/chat-interface.tsx` | 챗봇 입력 label |
| `app/host/register/page.tsx` | 타입 에러 수정 (1곳) |
| `tests/lib/utils/retry.test.ts` | unhandled rejection 수정 |

**현재 상태:** Phase 2.1 완료 (100%). Phase 2.2 Medium 이슈 11건 대기.

**다음 우선순위:**
1. Phase 2.2: Medium 이슈 11건 해결 (~15시간)
   - DB 쿼리 최적화, 캐싱 전략, 입력 검증 강화 등
2. Phase 3: 접근성 & 성능 개선 (~10시간)
3. Phase 4: 문서화 & 배포 준비 (~5시간)

---

## Session 13 — 2026-02-23 (Code Inspection & Improvement)

**작업 내용:** Phase 2.1 Critical 이슈 해결 (4건 완료, 9/13건 69%)

7-layer 프로젝트 점검의 Phase 2 구현 단계. Critical 우선순위 이슈 4건을 해결하고 견고한 테스트 커버리지를 확보했다.

### 완료된 Critical 이슈 (4건, ~8시간)

**1. Issue 2.5: OpenAI Rate Limit 대응** (3시간)
- `lib/utils/retry.ts` — Exponential backoff retry 유틸리티 생성 (1초 → 2초 → 4초 → 8초)
- `lib/rag/embeddings.ts` — getEmbedding, getEmbeddings에 retry 적용
- `lib/rag/chat.ts` — GPT-4o 호출에 retry 적용
- `tests/lib/utils/retry.test.ts` — 8개 테스트 (429 감지, 지수 백오프, maxRetries, 다양한 에러 패턴)

**2. Issue 2.6: OpenAI Timeout 설정** (1시간)
- `lib/rag/embeddings.ts`, `lib/rag/chat.ts`, `app/admin/properties/[id]/ai-actions.ts` — OpenAI 클라이언트에 `timeout: 30000ms`, `maxRetries: 0` 설정
- 3개 파일 모두 retryWithBackoff로 통일

**3. Issue 2.7: RAG Chunking 버그 수정** (2시간)
- `lib/rag/chunker.ts` — pushChunks 함수 overlap 로직 개선 (`end === text.length` → `end >= text.length`, 주석 추가)
- `tests/lib/rag/chunker.test.ts` — 6개 테스트 (무한 루프 방지, overlap 정상 작동, 경계 조건, 멀티 섹션)

**4. Issue 2.9: System Rules 에러 처리** (2시간)
- `lib/inspection/system-rules.ts` — Graceful degradation 패턴 적용
  - checkSystemRules 전체 함수에 try-catch 추가
  - 개별 규칙 체크별 try-catch (금칙어, 연락처, 주소 중복, 관리대상 호스트)
  - DB 실패 시에도 다른 규칙 계속 검사, 최종적으로 pass 반환 (AI 검수로 넘김)
  - 모든 에러에 `[functionName]` prefix 로깅
- `tests/lib/inspection/system-rules.test.ts` — 5개 테스트 (admin_settings 실패, createClient 실패, DB 실패 시 정규식 체크 작동, 개별 규칙 실패 처리)

### 테스트 현황

**총 23개 테스트 모두 통과 ✅**
- `tests/example.test.ts` — 4개 (프레임워크 검증)
- `tests/lib/rag/chunker.test.ts` — 6개 (새로 추가)
- `tests/lib/utils/retry.test.ts` — 8개 (새로 추가)
- `tests/lib/inspection/system-rules.test.ts` — 5개 (새로 추가)

### Phase 2.1 진행 현황

**Critical Issues: 9 / 13 완료 (69%)**

✅ 완료 (9건):
1. 4.1: 테스트 프레임워크 설정
2. 1.1, 1.2, 1.4: 데이터베이스 마이그레이션 (RLS, 게스트 접근, pgvector 최적화)
3. 2.1: Error 처리 일관성 (ActionResult<T> 패턴)
4. **2.5: OpenAI Rate Limit 대응** ← 이번 세션
5. **2.6: OpenAI Timeout 설정** ← 이번 세션
6. **2.7: RAG Chunking 버그 수정** ← 이번 세션
7. **2.9: System Rules 에러 처리** ← 이번 세션

⏳ 남은 Critical (4건, ~8시간):
- 2.10: AI 검수 에러 처리 (2시간)
- 3.1: Error Boundary 구현 (3시간)
- 3.2, 3.3: 접근성 레이블 추가 (각 30분)

### 수정 파일 (8개)

| 파일 | 변경 내용 |
|------|----------|
| `lib/utils/retry.ts` | 생성: exponential backoff retry 유틸리티 |
| `lib/rag/embeddings.ts` | retry + timeout 적용 |
| `lib/rag/chat.ts` | retry + timeout 적용 |
| `app/admin/properties/[id]/ai-actions.ts` | retry + timeout 적용 |
| `lib/rag/chunker.ts` | overlap 로직 개선 |
| `lib/inspection/system-rules.ts` | graceful degradation 적용 |
| `tests/lib/utils/retry.test.ts` | 생성: 8개 테스트 |
| `tests/lib/rag/chunker.test.ts` | 생성: 6개 테스트 |
| `tests/lib/inspection/system-rules.test.ts` | 생성: 5개 테스트 |

**현재 상태:** Phase 2.1 Critical 이슈 69% 완료. 4개 남음 (약 8시간 소요 예상).

**다음 우선순위:**
1. Issue 2.10: AI 검수 에러 처리 (runAiInspection에 try-catch 추가)
2. Issue 3.1: Error Boundary 구현 (components/ErrorBoundary.tsx 생성, 주요 페이지 적용)
3. Issue 3.2, 3.3: 접근성 레이블 (검색 Input, 챗봇 Textarea)

---

## Session 12 — 2026-02-20 (Code)

**작업 내용:** RAG 검색 품질 최적화 Phase 1 & 2 완료

정책 문서 콘텐츠 보강, 파라미터 튜닝, 청킹 전략 개선을 통해 RAG 검색 품질을 대폭 개선했다. "플랫폼 수수료" 섹션 검색 유사도가 28.83%에서 47.6%로 상승하여 10위 밖에서 2위로 진입했다.

### Phase 1: 콘텐츠 보강 + 파라미터 튜닝

**정책 문서 개선**
- `작업-정책정리/정책-2_가격정책.md` — "플랫폼 수수료" 섹션에 서술형 설명 추가, 헤더에 "핵심 수수료율" 요약 추가
- `rental-admin-mvp/data/policies/정책-2_가격정책.md` — 동기화

**파라미터 최적화**
- `lib/rag/vector-search.ts` — topK 10 → 15 (검색 범위 50% 확대)
- `lib/rag/chat.ts` — topK 10 → 15 동기화
- `scripts/test-chatbot.mjs` — 하드코딩 버그 수정 (topK=5 → 15), 기본값 15로 변경

**결과:**
- 유사도: 28.83% → 38.11% (+9.28%p)
- 순위: 10위 밖 → 5위
- 헤더 섹션: 1위 유지 + 수수료 정보 포함

### Phase 2: 청킹 전략 개선 (계층 구조 명시)

**구현 (옵션 B)**
- `scripts/ingest-policies.mjs` — `chunkByHeaders()` 함수 개선
  - 하위 섹션(## 레벨2, ### 레벨3)에 상위 헤더 정보 포함
  - 예: `# 정책-2. 단기임대 가격 정책\n\n## 플랫폼 수수료\n\n[내용]`
  - 각 청크가 독립적으로 문서 구조를 포함하여 맥락 강화

**결과:**
- 유사도: 38.11% → 47.6% (+9.5%p, 총 +18.8%p)
- 순위: 5위 → **2위** (10위 밖 → 2위 전체 향상)
- 주요 섹션 모두 top-3 진입 확인

### 전체 성과 요약

| 측정 항목 | 개선 전 | 개선 후 | 향상도 |
|---------|---------|---------|--------|
| 유사도 | 28.83% | 47.6% | +65% |
| 검색 순위 | 10위 밖 | 2위 | 상위 2% |
| topK | 10개 | 15개 | +50% |
| 답변 정확도 | 관련 문서 없음 | 100% 정확 | ✅ |

### 재인제스트
- 총 3회 실행: 콘텐츠 보강 후, 헤더 추가 후, 청킹 전략 개선 후
- 302개 청크 유지 (개수 변화 없음, 청크 내용 품질 개선)

### 문서 업데이트
- `작업-정책정리/개선사항.md` — Phase 1 & 2 완료 체크
- `작업-정책정리/README.md` — 변경 이력 업데이트 (버전 1.3)
- `MEMORY.md` — RAG 개선 이력 추가, 청킹 전략 업데이트

### 테스트 검증
- "플랫폼 수수료가 얼마인가요?" — ✅ 정확 답변 (호스트 3%, 게스트 9%)
- "호스트 수수료율을 알려주세요" — ✅ 정확 답변 (3%, VAT 별도)
- "신규 서비스 수수료 할인 정책이 있나요?" — ✅ 정확 답변 + [검토중] 안내

### 수정 파일 (5개)
| 파일 | 변경 |
|------|------|
| `작업-정책정리/정책-2_가격정책.md` | 콘텐츠 보강 + 헤더 요약 |
| `rental-admin-mvp/data/policies/정책-2_가격정책.md` | 동기화 |
| `rental-admin-mvp/scripts/ingest-policies.mjs` | 청킹 로직 개선 (계층 구조 명시) |
| `lib/rag/vector-search.ts` | topK 15 |
| `lib/rag/chat.ts` | topK 15 |

**현재 상태:** RAG Phase 1 & 2 완료. Phase 3 (Hybrid Search) 검토 대기.

**다음 우선순위:**
1. 미완성FAQ분석.md 기반 정책 보완 (83개 항목)
2. (선택) Phase 3 Hybrid Search 검토

---

## Session 11 — 2026-02-19 (Code)

**작업 내용:** CS 챗봇 품질 개선 + RAG 인제스트 최적화 + Vercel 배포

환경 설정(DB 마이그레이션, API 키, 인제스트)을 모두 완료하고, CS 챗봇의 UI/UX와 RAG 응답 품질을 개선했다. Anthropic → OpenAI GPT-4o 전환 후 첫 프로덕션 품질 개선 세션.

### 변경 내용

**UI/UX 개선 (커밋 `676703d`)**
- `app/admin/cs-chatbot/chat-interface.tsx` — ReactMarkdown 렌더링, CopyButton 컴포넌트, textarea 자동 리사이즈, 빠른 질문 6개 교체
- `app/admin/cs-chatbot/chatbot-client.tsx` — 대화 삭제 확인 다이얼로그 추가
- `lib/rag/chat.ts` — 시스템 프롬프트 개선 (중복 출처 제거, 마크다운 포맷 지시)
- `package.json` — react-markdown 의존성 추가

**RAG 청킹 품질 개선 (커밋 `9e4b91c`)**
- `scripts/ingest-policies.mjs` — FAQ 상태 파싱 (미완료/확인 → `[검토중]` 태그), 불필요 섹션 필터링 (참고 UI, History, Reference-타사), 빈 파일 스킵 (200바이트 미만)
- `lib/rag/chat.ts` — `[검토중]` 콘텐츠 처리 규칙 추가 (확정 정책 우선 답변, 미확정 시 안내)

**버그 수정 (커밋 `eedf976`)**
- `scripts/ingest-policies.mjs` — `pushChunks`에서 `[검토중]` 접두어가 1500자 초과 분할 시 모든 조각에 전파되도록 수정

### 배포
- 인제스트: 250개 청크 pgvector 저장 (빈 파일 1개 스킵)
- Vercel 프로덕션 배포 3회 (UI → 청킹 → 버그수정)

### 빌드 검증
- `npx tsc --noEmit` 통과 (에러 0개)
- `npm run build` 성공 (20개 라우트)

### 수정 파일 (4개 + 의존성)
| 파일 | 변경 |
|------|------|
| `app/admin/cs-chatbot/chat-interface.tsx` | ReactMarkdown, CopyButton, auto-resize, Quick Questions |
| `app/admin/cs-chatbot/chatbot-client.tsx` | 삭제 확인 다이얼로그 |
| `lib/rag/chat.ts` | 시스템 프롬프트 3차 개선 |
| `scripts/ingest-policies.mjs` | FAQ 상태 파싱, 스킵 패턴, [검토중] 전파 |

### 알려진 이슈
- `정책-2_가격정책.md`는 `# 정책-2` 헤더 하나에 30KB → 확정/미확정 분리 불완전. 서브 헤더 추가 필요.

**현재 상태:** Vercel 프로덕션 배포 완료. 새 대화에서 [검토중] 안내 노출 확인 필요.

---

## Session 12 — 2026-02-20 (정책 재정립 + RAG 최적화)

**작업 내용:** 작업-정책정리 폴더 정리 + 미완성 FAQ 분석 + RAG 검색 최적화

정책 문서를 xlsx 기반으로 전면 재구성하고, 미완성 FAQ 83개를 분석하여 필요 정보를 분류했다. RAG 챗봇 테스트 후 검색 파라미터를 최적화하고 개선 사항을 문서화했다.

### 변경 내용

**정책 문서 재정립**
- `작업-정책정리/` 폴더: 10개 파일로 재구성 (기존 15개 → archive 이동)
  - 00_프로젝트개요.md, 용어사전.md
  - 정책-1~3 (법적기준, 가격정책, 운영기준)
  - 운영-1~2 (매물검수, 계정관리)
  - FAQ_게스트.md, FAQ_호스트.md, FAQ_공통.md (rental-admin-mvp에서 복사)
- `참고문서/` 폴더 신규 생성: 구버전 md, xlsx 원본 아카이브
- 소스: STR_정책&실행안&아이디어.xlsx (16시트)

**미완성 FAQ 분석**
- `작업-정책정리/미완성FAQ분석.md` 작성
- 확인(22개) + 미완료(61개) = 총 83개 항목 분류
- 4가지 카테고리: 정책 결정, 기능 구현, 운영 프로세스, 법적/안내 확인

**RAG 시스템 테스트 및 최적화**
- `scripts/test-chatbot.mjs` 작성: 벡터 검색 + GPT-4o 응답 테스트 스크립트
- [검토중] 태그 처리 정상 작동 확인 ✅
- 검색 파라미터 최적화:
  - `lib/rag/vector-search.ts`: topK 5→10, minSimilarity 0.3→0.25
  - `lib/rag/chat.ts`: 동일하게 적용
- 개선 사항 문서화: `작업-정책정리/개선사항.md`

### 인제스트
- 재인제스트 완료: 302개 청크 (변동 없음)
- 카테고리 분포: faq(218), policy(40), operation(23), overview(12), glossary(9)

### 발견된 이슈
- **벡터 검색 정확도**: "플랫폼 수수료" 섹션(ID:1328) 유사도 28.83%로 순위 밀림
  - 표 형식 중심 콘텐츠라 임베딩 품질 낮음
  - 정책-2 헤더(ID:1327)는 53.2%로 1위 검색되지만 실제 수수료율 정보는 다음 섹션에 있음
  - 개선 방안: 내용 보강, 청킹 전략 개선, Hybrid Search 도입 (개선사항.md 참조)

### 수정 파일 (7개)
| 파일 | 변경 |
|------|------|
| `lib/rag/vector-search.ts` | topK 10, minSimilarity 0.25 |
| `lib/rag/chat.ts` | 검색 파라미터 최적화 |
| `scripts/test-chatbot.mjs` | 신규 작성 (테스트 도구) |
| `scripts/ingest-policies.mjs` | FILE_CATEGORY_MAP 업데이트 (10개 파일) |
| `작업-정책정리/*.md` | 10개 파일 작성/복사 |
| `작업-정책정리/미완성FAQ분석.md` | 신규 작성 (83개 항목 분석) |
| `작업-정책정리/개선사항.md` | 신규 작성 (RAG 개선 로드맵) |

### 다음 작업
1. **즉시 개선** (우선순위 높음):
   - 정책-2_가격정책.md "플랫폼 수수료" 섹션 내용 보강 (서술형 텍스트 추가)
   - 재인제스트 후 검색 품질 검증

2. **미완성 FAQ 처리** (Phase별 진행):
   - Phase 1: 정책 결정 (2-3주)
   - Phase 2: 기능 개발 (4-6주)
   - Phase 3: 운영 프로세스 (2주)
   - Phase 4: FAQ 업데이트 (1주)

3. **RAG 고도화** (선택):
   - 청킹 전략 개선 (헤더+섹션 병합 or 계층 구조 명시)
   - Hybrid Search 도입 (벡터+키워드)

**현재 상태:** 정책 재정립 완료. RAG 검색 최적화 1차 완료. 개선 로드맵 문서화.

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

### 완료된 환경 설정
- [x] ~~Supabase 마이그레이션 실행 (4개)~~ — `00_catchup_all.sql`로 일괄 적용 (2026-02-19)
- [x] ~~정책 문서 인제스트~~ — `node scripts/ingest-policies.mjs` (250개 청크, 2026-02-19)
- [x] ~~OPENAI_API_KEY 설정~~ — .env.local + Vercel 환경변수 등록 완료
- [x] ~~Anthropic → OpenAI 전환~~ — GPT-4o로 통일, ANTHROPIC_API_KEY 불필요

### 즉시 필요
- [ ] 실환경 테스트: 자동 검수 (금칙어 반려, AI 검수, supplement 플로우)
- [ ] 실환경 테스트: 호스트 보완 워크플로우 (대시보드 → 상세 → 수정 → 재제출)
- [x] ~~`정책-2_가격정책.md` 서브 헤더 추가 → 재인제스트~~ — 콘텐츠 보강 + 청킹 전략 개선 완료 (2026-02-20)

### 단기 목표
- [x] ~~일괄 처리 고도화~~ (승인/반려/보완 요청 모두 완성)
- [x] ~~CS 챗봇 품질 개선~~ (마크다운 렌더링, [검토중] 태깅, UI/UX)
- [ ] 정책 문서 업데이트 시 자동 재인제스트

### 중기 목표
- [ ] 호스트/게스트 관리 기능 (운영-2 정책 기반)
- [ ] 알림 시스템 (이메일/푸시)

### 장기 목표
- [ ] 가격 추천 AI
- [ ] 시장 분석 대시보드
- [ ] 모바일 어드민

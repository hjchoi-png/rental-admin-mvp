# 실행 가이드 — 지금부터 뭘 해야 하나

> Justin님 상황: Supabase 접속 가능, GitHub/Vercel 연결됨, 코드 24개 파일 커밋 안 됨

---

## 전체 순서 (5단계)

```
[1] API 키 발급 + .env.local 세팅        ← 10분
[2] Git 커밋 + Push                      ← 5분 (Code 세션에서)
[3] Supabase 마이그레이션 실행           ← 5분
[4] Vercel 환경변수 + 배포 확인          ← 10분
[5] 테스트                               ← 필요할 때
```

완료하면: 검수 시스템이 실제로 돌아가는 상태.
그 다음: RAG/CS챗봇 구현 시작 가능.

---

## Step 1. API 키 발급 + .env.local 세팅 (10분)

현재 `.env.local`에 있는 것:
```
NEXT_PUBLIC_SUPABASE_URL=***       ✅ 있음
NEXT_PUBLIC_SUPABASE_ANON_KEY=***  ✅ 있음
```

추가로 필요한 것 3개:

### 1-1. SUPABASE_SERVICE_ROLE_KEY (필수 — 시스템 규칙 엔진이 사용)

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 **Settings** → **API**
4. `service_role` key (⚠️ secret) 복사

### 1-2. OPENAI_API_KEY (필수 — AI 검수 + 임베딩)

1. https://platform.openai.com/api-keys 접속
2. **Create new secret key** 클릭
3. 이름: `str-admin` 등 아무거나
4. `sk-...` 로 시작하는 키 복사

> 💡 OpenAI 계정 없으면: https://platform.openai.com/signup 에서 가입
> 무료 크레딧이 있을 수 있고, 없으면 최소 $5 충전 필요

### 1-3. ANTHROPIC_API_KEY (RAG 챗봇용 — 지금 당장은 안 넣어도 됨)

1. https://console.anthropic.com/settings/keys 접속
2. **Create Key** 클릭
3. `sk-ant-...` 로 시작하는 키 복사

> 💡 이건 CS 챗봇 구현할 때 필요. 지금 당장은 스킵 가능.

### 적용 방법

`.env.local` 파일을 열어서 아래처럼 수정:

```
# 기존
NEXT_PUBLIC_SUPABASE_URL=기존값유지
NEXT_PUBLIC_SUPABASE_ANON_KEY=기존값유지

# 추가
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_키
OPENAI_API_KEY=sk-여기에_openai_키
ANTHROPIC_API_KEY=sk-ant-여기에_anthropic_키
```

> ⚠️ 이 파일은 `.gitignore`에 포함되어 있어서 GitHub에 올라가지 않음 (안전)

---

## Step 2. Git 커밋 + Push (5분)

현재 커밋 안 된 파일이 24개 있음. Code 세션에서 이렇게 하면 됨:

```
"CLAUDE.md 읽고, 현재 변경된 파일들 확인하고 커밋해줘"
```

또는 직접 하려면:
```bash
cd rental-admin-mvp
git add -A
git commit -m "feat: AI 자동 검수 시스템 + 세션 가이드 문서"
git push origin main
```

> 주의: `CLAUDE.md`와 `docs/` 폴더도 함께 커밋. 이러면 Code 세션에서도 읽을 수 있음.

---

## Step 3. Supabase 마이그레이션 (5분)

검수 시스템용 DB 스키마를 적용해야 함.

### 방법 A: SQL Editor에서 직접 실행 (추천)

1. Supabase 대시보드 → **SQL Editor**
2. 아래 파일 내용을 복붙해서 실행:
   - `supabase/migrations/20260213000000_add_inspection_system.sql`

이게 하는 것:
- `properties` 테이블에 `supplement` 상태 추가
- `inspection_result`, `inspection_rule_violations` 등 컬럼 추가
- `forbidden_words` 테이블 생성 (금칙어 40개+ 시딩)
- `admin_settings` 업데이트

### 방법 B: Supabase CLI (선택사항 — CLI 익숙하면)

```bash
npx supabase db push
```

> 💡 마이그레이션 전에 실행되지 않은 이전 마이그레이션 파일도 있을 수 있음.
> 에러가 나면 하나씩 순서대로 실행해보기.

---

## Step 4. Vercel 환경변수 (10분)

Vercel에 배포하려면, `.env.local`에 넣은 키들을 Vercel에도 등록해야 함.

1. https://vercel.com/dashboard 접속
2. `rental-admin-mvp` 프로젝트 클릭
3. **Settings** → **Environment Variables**
4. 아래 변수들 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 | Production, Preview |
| `OPENAI_API_KEY` | sk-... | Production, Preview |
| `ANTHROPIC_API_KEY` | sk-ant-... | Production, Preview |

> `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 이미 등록되어 있을 가능성 높음.

5. **Deployments** → 최신 배포에서 **Redeploy** 클릭

---

## Step 5. 테스트 체크리스트

배포 후 확인할 것들:

### 기본 동작
- [ ] 어드민 로그인 가능한지
- [ ] 매물 목록 페이지 정상 로드
- [ ] 대시보드 통계 표시

### 검수 시스템 (마이그레이션 후)
- [ ] 매물 등록 → 시스템 규칙 체크 동작
- [ ] 금칙어 포함 매물 → 자동 반려
- [ ] 설정 페이지 → 금칙어 관리 UI 표시
- [ ] AI 검수 실행 (OPENAI_API_KEY 필요)

---

## 그 다음은?

Step 1~4 완료하면 **검수 시스템이 실제로 돌아감**.

그 다음 우선순위:

```
1. 검수 시스템 실제 테스트 + 버그 수정
2. CS 챗봇 RAG Phase 1 구현 (Code 세션)
   → "CLAUDE.md 읽고, docs/rag-design.md 읽고, Phase 1 구현해줘"
3. Phase 2, 3 순차 구현
```

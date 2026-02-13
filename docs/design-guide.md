# 디자인 가이드라인 — 직방 단기임대(STR)

> 바이브 코딩 시대의 디자인 고도화 전략 보고서 요약 + 프로젝트별 적용 규칙

---

## 1. 프로젝트 디자인 철학

### 두 가지 UI 영역
| 영역 | 대상 | 디자인 방향 |
|------|------|------------|
| `/host/*` (호스트 페이지) | 호스트(비개발자), 모바일 | 감성적, 터치 친화, 전환율 최적화 |
| `/admin/*` (어드민) | 관리자, 데스크톱 | 효율적, 데이터 밀도, 정보 명확성 |

### 브랜드 컬러
- Primary: 직방 오렌지 `#EA5C2B` (HSL: 17 81% 55%)
- 시맨틱 변수 사용 필수 (`bg-primary`, `text-muted-foreground` 등)
- 하드코딩 색상 금지 (`bg-blue-500` 대신 CSS 변수)

---

## 2. 아이콘 시스템

### 호스트 페이지: Phosphor Icons
- 라이브러리: `@phosphor-icons/react`
- 웨이트: Regular(기본), Fill(활성/강조), Bold(CTA)
- 크기: 20~24px, 터치 영역 최소 44x44px

### 어드민 페이지: Lucide Icons
- 라이브러리: `lucide-react` (기존 유지)
- strokeWidth: 1.5 (기본 2에서 조정)
- 아이콘 색상: `text-muted-foreground` (텍스트보다 한 단계 연하게)

---

## 3. 폼 UX/UI 규칙

### 호스트 등록 폼 (모바일 퍼스트)
- **레이아웃**: 싱글 컬럼 절대 원칙 (예외: 동/호, 날짜 등 긴밀한 그룹만 수평)
- **Input 높이**: 48px (모바일 터치 최적)
- **폰트 크기**: 16px 이상 (iOS 줌 방지 — `text-base`)
- **내부 여백**: px-4 (16px)
- **라벨**: 입력 필드 상단 고정 (font-medium)
- **플레이스홀더**: 예시 용도로만 사용 (라벨 대체 금지)
- **검증 타이밍**: onBlur 에러표시, onChange 에러제거
- **포커스 스타일**: `ring-2 ring-primary/20` 글로우

### 어드민 폼 (데스크톱)
- **Input 높이**: 40px (기본) ~ 44px
- **정보 밀도 우선**: 컴팩트 레이아웃 허용
- **검증**: 동일한 onBlur/onChange 패턴

---

## 4. 컴포넌트 스타일 규칙

### Card
- 호스트: `border-0 shadow-sm` + 넉넉한 패딩 (`p-6`)
- 어드민: `border shadow-sm` (기본 유지)

### Button
- 호스트 CTA: 높이 48~56px, `rounded-xl`, 넓은 너비
- 어드민: 기본 Shadcn 사이즈 유지

### 여백과 리듬
- 8px 배수 시스템 (Tailwind 기본)
- 섹션 간: `gap-6` ~ `gap-8` (24~32px)
- 카드 내부: `p-6` (24px)
- "생각보다 2배 더 넓게" 원칙

### Border Radius
- `--radius: 0.75rem` (12px) — 현재 유지
- 호스트 버튼/칩: `rounded-xl` (16px)
- 어드민: `rounded-lg` (12px) 기본

### Shadow
- 호스트: 부드러운 쉐도우 (`shadow-sm` ~ `shadow-md`)
- 어드민 카드: `shadow-sm` (가볍게)
- 강조 카드: 컬러드 쉐도우 (`shadow-primary/10`)

---

## 5. 타이포그래피

### 폰트
- Inter (Google Fonts) — 현재 유지
- 한글: 시스템 폰트 fallback

### 계층 구조
- 페이지 제목: `text-2xl font-bold text-foreground`
- 카드 제목: `text-lg font-semibold text-foreground`
- 본문: `text-base font-normal text-foreground`
- 보조/캡션: `text-sm text-muted-foreground`
- 힌트: `text-xs text-muted-foreground`

---

## 6. 참조 레퍼런스

- Phosphor Icons: https://phosphoricons.com
- Shadcn UI: https://ui.shadcn.com
- WWIT (한국 앱 UI): https://wwit.design
- Mobbin (글로벌 앱 UI): https://mobbin.com

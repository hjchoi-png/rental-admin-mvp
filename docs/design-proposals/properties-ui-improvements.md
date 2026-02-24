# 매물 목록 페이지 UI 개선안

**프로젝트:** STR 단기임대 관리자 어드민
**페이지:** `/admin/properties`
**플랫폼:** Desktop Admin (1280px+)
**디자인 시스템:** Tailwind CSS + shadcn/ui
**날짜:** 2026-02-24

---

## 디자인 철학: Precision Control Dashboard

**Concept:** 관리자가 대량의 매물을 **정확하고 효율적으로** 처리하는 데 집중. 숫자와 상태가 명확히 보이는 **Data-Dense Interface** + **Subtle Sophistication**.

### 톤 & 무드
- **Utility-First**: 기능이 명확하고 즉시 이해 가능
- **Quiet Confidence**: 과도한 장식 없이 세련된 타이포그래피와 간격
- **Purposeful Motion**: 상태 변화를 명확히 전달하는 의도적 애니메이션

### 타이포그래피
```css
/* 숫자 표시 (점수, 카운트) */
font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
font-variant-numeric: tabular-nums; /* 숫자 정렬 */

/* UI 레이블 */
font-family: "Inter Tight", "Inter", sans-serif;
font-feature-settings: "ss01", "cv11"; /* Stylistic alternates */
```

### 컬러 전략
```typescript
// AI 스코어 그라데이션 (Perceptually Uniform)
const scoreGradient = {
  0: "#DC2626",   // red-600
  40: "#F59E0B",  // amber-500
  70: "#10B981",  // emerald-500
  100: "#059669", // emerald-600
}

// 상태 시각화
const statusColors = {
  processing: "#3B82F6",  // blue-500
  success: "#10B981",     // emerald-500
  failed: "#EF4444",      // red-500
  waiting: "#94A3B8"      // slate-400
}
```

---

## P0: 일괄 처리 UX 개선

### 현재 문제점
1. ETA 없음 → 사용자가 대기 시간 예측 불가
2. 실패 항목 재시도 불가 → 실패 시 처음부터 다시 선택해야 함
3. 개별 항목 상태 미표시 → 어떤 매물이 실패했는지 불명확
4. 진행률 바만 있음 → 진행 속도 체감 어려움

### 개선 제안: Real-time Progress Dashboard

#### 1. ETA 계산 로직
```typescript
// lib/utils/batch-eta.ts
interface ETACalculator {
  startTime: number
  processedCount: number
  totalCount: number
  lastUpdateTime: number
}

export function calculateETA(calc: ETACalculator): {
  remainingSeconds: number
  etaText: string
  speed: number // items/sec
} {
  const elapsed = calc.lastUpdateTime - calc.startTime
  const avgTimePerItem = elapsed / calc.processedCount
  const remaining = calc.totalCount - calc.processedCount
  const remainingSeconds = Math.ceil((avgTimePerItem * remaining) / 1000)

  const speed = calc.processedCount / (elapsed / 1000)

  let etaText = ""
  if (remainingSeconds < 60) {
    etaText = `약 ${remainingSeconds}초`
  } else {
    const minutes = Math.ceil(remainingSeconds / 60)
    etaText = `약 ${minutes}분`
  }

  return { remainingSeconds, etaText, speed }
}
```

#### 2. 실시간 진행 상태 UI

**Before (현재 - lines 1110-1158):**
```tsx
<div className="space-y-4 py-4">
  {/* 단순 진행률 바 */}
  <div className="w-full h-2.5 bg-muted rounded-full">
    <div className="h-full bg-primary" style={{width: `${percent}%`}} />
  </div>

  {/* 성공/실패/대기 카운트 */}
  <div className="grid grid-cols-3 gap-3">...</div>
</div>
```

**After (개선안):**
```tsx
<div className="space-y-6 py-4">
  {/* 진행률 헤더 with ETA */}
  <div className="flex items-baseline justify-between">
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">진행 상황</p>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold font-mono tabular-nums">
          {bulkProgress.processed}
        </span>
        <span className="text-lg text-muted-foreground">/ {bulkProgress.total}</span>
      </div>
    </div>

    {/* ETA Display */}
    {bulkProcessing && bulkProgress.processed > 0 && (
      <div className="text-right">
        <p className="text-xs text-muted-foreground">남은 시간</p>
        <p className="text-2xl font-bold font-mono text-blue-600">
          {etaText}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {speed.toFixed(1)}/초
        </p>
      </div>
    )}
  </div>

  {/* Enhanced Progress Bar with Segments */}
  <div className="relative">
    {/* Background track */}
    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
      {/* Success segment */}
      <div
        className="absolute h-full bg-emerald-500 transition-all duration-300 ease-out"
        style={{
          width: `${(bulkProgress.succeeded / bulkProgress.total) * 100}%`,
        }}
      />
      {/* Failed segment */}
      <div
        className="absolute h-full bg-red-500 transition-all duration-300 ease-out"
        style={{
          left: `${(bulkProgress.succeeded / bulkProgress.total) * 100}%`,
          width: `${(bulkProgress.failed / bulkProgress.total) * 100}%`,
        }}
      />
      {/* Processing indicator (animated) */}
      {bulkProcessing && (
        <div
          className="absolute h-full w-1 bg-blue-600 animate-pulse"
          style={{
            left: `${(bulkProgress.processed / bulkProgress.total) * 100}%`,
          }}
        />
      )}
    </div>

    {/* Percentage label */}
    <p className="text-xs text-center text-muted-foreground mt-2 font-mono">
      {Math.round((bulkProgress.processed / bulkProgress.total) * 100)}%
    </p>
  </div>

  {/* Status Cards with Icons */}
  <div className="grid grid-cols-3 gap-3">
    <div className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">성공</p>
      </div>
      <p className="text-3xl font-bold font-mono text-emerald-700 tabular-nums">
        {bulkProgress.succeeded}
      </p>
    </div>

    <div className="relative p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200">
      <div className="flex items-center gap-2 mb-1">
        {bulkProgress.failed > 0 && (
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
        <p className="text-xs font-medium text-red-700 uppercase tracking-wider">실패</p>
      </div>
      <p className="text-3xl font-bold font-mono text-red-700 tabular-nums">
        {bulkProgress.failed}
      </p>
    </div>

    <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200">
      <div className="flex items-center gap-2 mb-1">
        {bulkProcessing && (
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        )}
        <p className="text-xs font-medium text-slate-700 uppercase tracking-wider">대기</p>
      </div>
      <p className="text-3xl font-bold font-mono text-slate-700 tabular-nums">
        {bulkProgress.total - bulkProgress.processed}
      </p>
    </div>
  </div>

  {/* Failed Items with Retry */}
  {bulkProgress.failedIds.length > 0 && (
    <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" strokeWidth={2} />
          <p className="font-semibold text-red-900">
            실패한 항목 ({bulkProgress.failedIds.length}개)
          </p>
        </div>
        {!bulkProcessing && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRetryFailed}
            className="bg-red-600 hover:bg-red-700"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
            재시도
          </Button>
        )}
      </div>
      <p className="text-sm text-red-700">
        일부 매물 처리에 실패했습니다. 재시도 버튼을 눌러 실패한 항목만 다시 처리할 수 있습니다.
      </p>
    </div>
  )}

  {/* Processing Complete Message */}
  {!bulkProcessing && bulkProgress.processed === bulkProgress.total && (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-emerald-600" strokeWidth={2} />
        <p className="font-semibold text-emerald-900">처리 완료</p>
      </div>
      <p className="text-sm text-emerald-700">
        {bulkProgress.failed === 0
          ? `모든 매물(${bulkProgress.total}개)이 성공적으로 처리되었습니다.`
          : `${bulkProgress.succeeded}개 성공, ${bulkProgress.failed}개 실패했습니다.`}
      </p>
    </div>
  )}
</div>
```

#### 3. 재시도 핸들러 추가
```typescript
// app/admin/properties/page.tsx에 추가
const handleRetryFailed = async () => {
  if (bulkProgress.failedIds.length === 0) return
  if (!bulkOperation) return

  // 실패한 항목만으로 재시도
  const failedItems = bulkProgress.failedIds

  // 진행 상태 리셋 (실패 항목만)
  setBulkProgress({
    total: failedItems.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    failedIds: [],
  })
  setBulkProcessing(true)

  try {
    let processFn: (batch: string[]) => Promise<ActionResult<any>>

    if (bulkOperation === "approve") {
      processFn = bulkApproveProperties
    } else if (bulkOperation === "reject") {
      processFn = (batch) => bulkRejectProperties(batch, rejectComment)
    } else {
      processFn = (batch) => bulkSupplementProperties(batch, supplementComment)
    }

    const { succeeded, failed, failedIds } = await processBatches(
      failedItems,
      10,
      processFn,
      (processed, succeeded, failed) => {
        setBulkProgress((prev) => ({
          ...prev,
          processed: Math.min(processed, failedItems.length),
          succeeded,
          failed,
        }))
      }
    )

    setBulkProgress((prev) => ({ ...prev, failedIds }))

    if (succeeded > 0) {
      await loadProperties()
    }

    toast({
      title: failed === 0 ? "재시도 성공" : "재시도 부분 완료",
      description:
        failed === 0
          ? `모든 항목(${succeeded}개)이 성공했습니다.`
          : `${succeeded}개 성공, ${failed}개 실패했습니다.`,
      variant: failed === 0 ? "default" : "destructive",
    })
  } catch (error) {
    toast({
      title: "재시도 실패",
      description: error instanceof Error ? error.message : "재시도 중 오류가 발생했습니다.",
      variant: "destructive",
    })
  } finally {
    setBulkProcessing(false)
  }
}
```

---

## P1: Visual Feedback 강화 - Row Animations

### 현재 문제점
1. 승인/반려 시 즉각적인 피드백 없음
2. 상태 변경 후 전체 리로드 → 어떤 row가 변경되었는지 추적 어려움
3. 사용자 행동과 결과의 연결성 약함

### 개선 제안: Purposeful Row Animations

#### 1. Animation States
```typescript
// types/animation.ts
export type RowAnimationState =
  | "idle"
  | "approving"     // 승인 중
  | "approved"      // 승인 완료 (→ fade out)
  | "rejecting"     // 반려 중
  | "rejected"      // 반려 완료 (→ fade out)
  | "error"         // 오류 발생 (→ shake)
```

#### 2. Row with Animation
```tsx
// app/admin/properties/page.tsx

// State 추가
const [rowAnimations, setRowAnimations] = useState<Record<string, RowAnimationState>>({})

// Handlers 수정
const handleApprove = async (propertyId: string) => {
  // 애니메이션 시작
  setRowAnimations((prev) => ({ ...prev, [propertyId]: "approving" }))

  try {
    const result = await approveProperty(propertyId)
    if (result.success) {
      // 승인 완료 애니메이션
      setRowAnimations((prev) => ({ ...prev, [propertyId]: "approved" }))

      toast({
        title: "승인 완료",
        description: "매물이 승인되었습니다.",
        duration: 2000
      })

      // 1초 후 fade-out 시작, 1.5초 후 데이터 리로드
      setTimeout(async () => {
        await loadProperties()
        setRowAnimations((prev) => {
          const next = { ...prev }
          delete next[propertyId]
          return next
        })
      }, 1500)
    } else {
      throw new Error(result.error || "승인 실패")
    }
  } catch (error) {
    // 오류 애니메이션 (shake)
    setRowAnimations((prev) => ({ ...prev, [propertyId]: "error" }))

    toast({
      title: "승인 실패",
      description: error instanceof Error ? error.message : "승인 중 오류가 발생했습니다.",
      variant: "destructive",
    })

    // 2초 후 애니메이션 제거
    setTimeout(() => {
      setRowAnimations((prev) => {
        const next = { ...prev }
        delete next[propertyId]
        return next
      })
    }, 2000)
  }
}

// Table Row Rendering with Animations
table.getRowModel().rows.map((row) => {
  const property = row.original
  const animationState = rowAnimations[property.id] || "idle"

  return (
    <TableRow
      key={row.id}
      onClick={() => router.push(`/admin/properties/${property.id}`)}
      className={cn(
        "cursor-pointer transition-all duration-300 ease-out",
        // Hover state
        animationState === "idle" && "hover:bg-muted/50",
        // Approving state - pulse green
        animationState === "approving" && "bg-emerald-50 animate-pulse-subtle",
        // Approved state - fade out with green glow
        animationState === "approved" &&
          "bg-emerald-100 border-l-4 border-emerald-500 animate-fade-out-success",
        // Rejecting state - pulse red
        animationState === "rejecting" && "bg-red-50 animate-pulse-subtle",
        // Rejected state - fade out with red glow
        animationState === "rejected" &&
          "bg-red-100 border-l-4 border-red-500 animate-fade-out-error",
        // Error state - shake
        animationState === "error" && "animate-shake bg-red-50"
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(
            "transition-opacity duration-300",
            (animationState === "approved" || animationState === "rejected") &&
              "opacity-50"
          )}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
})
```

#### 3. Custom Tailwind Animations
```css
/* app/globals.css에 추가 */

@layer utilities {
  /* Subtle pulse for processing */
  @keyframes pulse-subtle {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.95;
      transform: scale(0.998);
    }
  }

  .animate-pulse-subtle {
    animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Fade out with success glow */
  @keyframes fade-out-success {
    0% {
      opacity: 1;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
    }
    50% {
      box-shadow: 0 0 20px 4px rgba(16, 185, 129, 0.2);
    }
    100% {
      opacity: 0;
      transform: translateX(20px);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }

  .animate-fade-out-success {
    animation: fade-out-success 1.5s ease-out forwards;
  }

  /* Fade out with error glow */
  @keyframes fade-out-error {
    0% {
      opacity: 1;
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
    }
    50% {
      box-shadow: 0 0 20px 4px rgba(239, 68, 68, 0.2);
    }
    100% {
      opacity: 0;
      transform: translateX(20px);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }

  .animate-fade-out-error {
    animation: fade-out-error 1.5s ease-out forwards;
  }

  /* Shake for errors */
  @keyframes shake {
    0%, 100% {
      transform: translateX(0);
    }
    10%, 30%, 50%, 70%, 90% {
      transform: translateX(-4px);
    }
    20%, 40%, 60%, 80% {
      transform: translateX(4px);
    }
  }

  .animate-shake {
    animation: shake 0.6s ease-in-out;
  }
}
```

---

## P1: AI 점수 시각화

### 현재 문제점
1. 숫자만 표시 → 점수 범위 파악 어려움
2. 색상 코딩만 있음 → 시각적 비교 어려움
3. 70점과 72점의 차이가 보이지 않음

### 개선 제안: Inline Score Gauge

#### Before (lines 576-584):
```tsx
columnHelper.accessor("ai_review_score", {
  header: "AI 점수",
  cell: (info) => {
    const score = info.getValue()
    if (score == null) return <span className="text-sm text-muted-foreground">-</span>
    const color = score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600"
    return <span className={`text-sm font-bold ${color}`}>{score}점</span>
  },
})
```

#### After:
```tsx
columnHelper.accessor("ai_review_score", {
  header: "AI 점수",
  cell: (info) => {
    const score = info.getValue()
    if (score == null) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-slate-100 rounded-full" />
          <span className="text-xs text-muted-foreground font-mono">-</span>
        </div>
      )
    }

    // Color gradient based on score
    const getScoreColor = (score: number) => {
      if (score >= 70) return { bg: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200" }
      if (score >= 40) return { bg: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200" }
      return { bg: "bg-red-500", text: "text-red-700", ring: "ring-red-200" }
    }

    const colors = getScoreColor(score)

    return (
      <div className="flex items-center gap-3">
        {/* Inline gauge */}
        <div className="relative w-20 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-500 ease-out", colors.bg)}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Score number with badge */}
        <div className={cn(
          "px-2.5 py-1 rounded-md ring-1 font-mono text-xs font-bold tabular-nums",
          colors.text,
          colors.ring
        )}>
          {score}
        </div>
      </div>
    )
  },
})
```

#### Alternative: Radial Gauge (더 강한 시각화)
```tsx
// components/AIScoreGauge.tsx
import { cn } from "@/lib/utils"

interface AIScoreGaugeProps {
  score: number | null
  size?: "sm" | "md" | "lg"
}

export function AIScoreGauge({ score, size = "sm" }: AIScoreGaugeProps) {
  if (score == null) {
    return <span className="text-xs text-muted-foreground">-</span>
  }

  const sizeClasses = {
    sm: { container: "w-12 h-12", stroke: 4, text: "text-[10px]" },
    md: { container: "w-16 h-16", stroke: 5, text: "text-xs" },
    lg: { container: "w-20 h-20", stroke: 6, text: "text-sm" },
  }

  const { container, stroke, text } = sizeClasses[size]
  const radius = (48 - stroke * 2) / 2 // Based on 48px viewBox
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#10B981" // emerald-500
    if (score >= 40) return "#F59E0B" // amber-500
    return "#EF4444" // red-500
  }

  const color = getScoreColor(score)

  return (
    <div className={cn("relative", container)}>
      <svg className="transform -rotate-90" viewBox="0 0 48 48">
        {/* Background circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-mono font-bold tabular-nums", text)} style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  )
}
```

---

## P1: Table Sorting

### 현재 문제점
1. 정렬 기능 없음 → 고득점/저득점 매물 찾기 어려움
2. 등록일순 정렬 불가 → 최신 등록 매물 확인 어려움

### 개선 제안: Column-based Sorting with TanStack Table

#### 1. Sorting State 추가
```typescript
import {
  getSortedRowModel,
  type SortingState
} from "@tanstack/react-table"

// State
const [sorting, setSorting] = useState<SortingState>([])

// Table configuration
const table = useReactTable({
  data: filteredData,
  columns,
  state: {
    sorting,
  },
  onSortingChange: setSorting,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(), // 추가
})
```

#### 2. Sortable Column Headers
```tsx
// Reusable Sortable Header Component
function SortableHeader({
  column,
  children
}: {
  column: any
  children: React.ReactNode
}) {
  const sortDirection = column.getIsSorted()

  return (
    <button
      className={cn(
        "flex items-center gap-2 font-semibold text-sm uppercase tracking-wider",
        "hover:text-primary transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-sm px-2 py-1 -mx-2 -my-1"
      )}
      onClick={column.getToggleSortingHandler()}
    >
      {children}
      <div className="flex flex-col gap-0.5">
        <ChevronUp
          className={cn(
            "h-3 w-3 transition-colors",
            sortDirection === "asc" ? "text-primary" : "text-muted-foreground/40"
          )}
          strokeWidth={3}
        />
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-colors -mt-1",
            sortDirection === "desc" ? "text-primary" : "text-muted-foreground/40"
          )}
          strokeWidth={3}
        />
      </div>
    </button>
  )
}

// Updated Columns with Sorting
const columns = useMemo(
  () => [
    // ... select column (no sort)

    columnHelper.accessor("title", {
      header: ({ column }) => (
        <SortableHeader column={column}>숙소 이름</SortableHeader>
      ),
      cell: (info) => <div className="font-medium">{info.getValue()}</div>,
      sortingFn: "alphanumeric",
    }),

    columnHelper.accessor("price_per_week", {
      header: ({ column }) => (
        <SortableHeader column={column}>주간 가격</SortableHeader>
      ),
      cell: (info) => (
        <div className="font-semibold font-mono tabular-nums">
          {info.getValue()?.toLocaleString()}원
        </div>
      ),
      sortingFn: "basic",
    }),

    columnHelper.accessor("ai_review_score", {
      header: ({ column }) => (
        <SortableHeader column={column}>AI 점수</SortableHeader>
      ),
      cell: (info) => {
        // ... AI score gauge component
      },
      sortingFn: "basic",
      // Default sort: highest score first
      sortDescFirst: true,
    }),

    columnHelper.accessor("created_at", {
      header: ({ column }) => (
        <SortableHeader column={column}>등록일</SortableHeader>
      ),
      cell: (info) => (
        <span className="text-sm font-mono">
          {formatDate(info.getValue())}
        </span>
      ),
      sortingFn: "datetime",
      // Default sort: newest first
      sortDescFirst: true,
    }),

    // ... status, actions columns (no sort)
  ],
  [selectedPropertyIds, filteredData, rowAnimations]
)
```

#### 3. Default Sort (최신순)
```typescript
// Initial sorting state
const [sorting, setSorting] = useState<SortingState>([
  { id: "created_at", desc: true } // 기본: 최신 등록순
])
```

#### 4. Quick Sort Buttons (Optional Enhancement)
```tsx
{/* Quick sort shortcuts above table */}
<div className="flex items-center gap-2 mb-4">
  <span className="text-sm text-muted-foreground">빠른 정렬:</span>
  <Button
    size="sm"
    variant={sorting[0]?.id === "ai_review_score" ? "default" : "outline"}
    onClick={() => setSorting([{ id: "ai_review_score", desc: true }])}
    className="text-xs"
  >
    <TrendingUp className="h-3 w-3 mr-1" />
    고득점순
  </Button>
  <Button
    size="sm"
    variant={sorting[0]?.id === "created_at" ? "default" : "outline"}
    onClick={() => setSorting([{ id: "created_at", desc: true }])}
    className="text-xs"
  >
    <Clock className="h-3 w-3 mr-1" />
    최신순
  </Button>
  <Button
    size="sm"
    variant={sorting[0]?.id === "price_per_week" ? "default" : "outline"}
    onClick={() => setSorting([{ id: "price_per_week", desc: true }])}
    className="text-xs"
  >
    <DollarSign className="h-3 w-3 mr-1" />
    고가순
  </Button>
</div>
```

---

## Implementation Priority

### Phase 1: P0 - Batch Processing UX (2-3 hours)
1. ETA calculation utility
2. Enhanced progress dialog UI
3. Retry failed items handler
4. State management updates

### Phase 2: P1 - Visual Feedback (1-2 hours)
1. Row animation states
2. Custom Tailwind animations
3. Handler updates with animation triggers

### Phase 3: P1 - AI Score Visualization (1 hour)
1. Inline gauge component
2. Column cell update
3. (Optional) Radial gauge component

### Phase 4: P1 - Table Sorting (1 hour)
1. Sorting state setup
2. Sortable header component
3. Column definitions update
4. (Optional) Quick sort buttons

**Total Estimated Time:** 5-7 hours

---

## Design Tokens Reference

```typescript
// tailwind.config.ts에 추가
export default {
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
        sans: ['"Inter Tight"', '"Inter"', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-out-success': 'fade-out-success 1.5s ease-out forwards',
        'fade-out-error': 'fade-out-error 1.5s ease-out forwards',
        'shake': 'shake 0.6s ease-in-out',
      },
    },
  },
}
```

---

## Accessibility Notes

1. **ETA Display**: Include `aria-live="polite"` for screen reader updates
2. **Progress Bar**: Add `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
3. **Sortable Headers**: Include `aria-sort` attribute
4. **Animations**: Respect `prefers-reduced-motion` media query

```tsx
// Example: Accessible Progress Bar
<div
  role="progressbar"
  aria-label="일괄 처리 진행 상황"
  aria-valuenow={bulkProgress.processed}
  aria-valuemin={0}
  aria-valuemax={bulkProgress.total}
  className="w-full h-3 bg-slate-100 rounded-full"
>
  {/* ... progress segments */}
</div>

// Example: Reduced Motion
<TableRow
  className={cn(
    animationState === "approved" && "animate-fade-out-success",
    "motion-reduce:transition-none motion-reduce:animate-none"
  )}
>
```

---

## Next Steps

1. **Review Proposal** - Stakeholder sign-off on design direction
2. **Implement Phase 1** - P0 batch processing improvements
3. **User Testing** - Validate ETA accuracy and retry UX
4. **Iterate Phases 2-4** - Visual feedback, score viz, sorting
5. **Performance Check** - Ensure animations don't impact table rendering
6. **Documentation** - Update component storybook/docs

---

**End of Proposal**

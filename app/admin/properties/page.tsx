"use client"

import { useState, useMemo, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table"
import { Check, X, Search, CheckSquare, XSquare, AlertCircle, Filter, SlidersHorizontal, RotateCcw, CheckCircle, ChevronUp, ChevronDown } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/LoadingSpinner"
import { calculateETA, formatSpeed, type ETAResult } from "@/lib/utils/batch-eta"
import {
  fetchProperties,
  approveProperty,
  rejectProperty,
  bulkApproveProperties,
  bulkRejectProperties,
  bulkSupplementProperties,
} from "./actions"
import type { PropertyListItem, PropertyStatus } from "@/types/property"
import { STATUS_VARIANTS, STATUS_LABELS } from "@/types/property"
import type { ActionResult } from "@/types/action-result"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | PropertyStatus
type RowAnimationState =
  | "idle"
  | "approving"
  | "approved"
  | "rejecting"
  | "rejected"
  | "error"

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateString
  }
}

const columnHelper = createColumnHelper<PropertyListItem>()

export default function PropertiesAdminPageWrapper() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4">
        <LoadingSpinner fullPage message="매물 목록 로딩 중..." />
      </div>
    }>
      <PropertiesAdminPage />
    </Suspense>
  )
}

function PropertiesAdminPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [properties, setProperties] = useState<PropertyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all"
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState("")
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set())
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false)
  const [bulkSupplementDialogOpen, setBulkSupplementDialogOpen] = useState(false)
  const [supplementComment, setSupplementComment] = useState("")
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkProgressOpen, setBulkProgressOpen] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    failedIds: [] as string[],
  })
  const [bulkOperation, setBulkOperation] = useState<"approve" | "reject" | "supplement" | null>(null)
  const [bulkStartTime, setBulkStartTime] = useState<number>(0)
  const [etaResult, setEtaResult] = useState<ETAResult | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }])
  const [rowAnimations, setRowAnimations] = useState<Record<string, RowAnimationState>>({})
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: "", max: "" })
  const [aiScoreRange, setAiScoreRange] = useState({ min: "", max: "" })
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("")
  const [rejectionTemplates, setRejectionTemplates] = useState<Array<{ id: string; title: string; content: string }>>([])

  useEffect(() => {
    // 반려 템플릿 불러오기
    const loadTemplates = async () => {
      try {
        const { fetchAdminSettings } = await import("../settings/actions")
        const { data } = await fetchAdminSettings()
        if (data) {
          setRejectionTemplates(data.rejection_templates || [])
        }
      } catch (error) {
        console.error("템플릿 로드 실패:", error)
      }
    }
    loadTemplates()
  }, [rejectDialogOpen, bulkRejectDialogOpen, bulkSupplementDialogOpen])

  // ETA 계산 (bulkProgress 변경 시마다)
  useEffect(() => {
    if (bulkProcessing && bulkStartTime > 0 && bulkProgress.processed > 0) {
      const eta = calculateETA({
        startTime: bulkStartTime,
        processedCount: bulkProgress.processed,
        totalCount: bulkProgress.total,
        lastUpdateTime: Date.now(),
      })
      setEtaResult(eta)
    } else {
      setEtaResult(null)
    }
  }, [bulkProgress, bulkProcessing, bulkStartTime])

  const loadProperties = useCallback(async () => {
    try {
      const { data, error } = await fetchProperties()
      if (error) throw new Error(error)
      setProperties(data || [])
    } catch (error) {
      console.error("데이터 조회 중 오류:", error)
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadProperties()
  }, [loadProperties])

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

        // 1.5초 후 데이터 리로드 (fade-out 애니메이션 시간)
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

  const handleRejectClick = (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    setRejectComment("")
    setRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!selectedPropertyId) return
    if (!rejectComment.trim()) {
      toast({ title: "반려 사유를 입력해주세요", variant: "destructive" })
      return
    }

    const propertyId = selectedPropertyId

    // 다이얼로그 먼저 닫기
    setRejectDialogOpen(false)
    setSelectedPropertyId(null)
    setRejectComment("")

    // 애니메이션 시작
    setRowAnimations((prev) => ({ ...prev, [propertyId]: "rejecting" }))

    try {
      const result = await rejectProperty(propertyId, rejectComment)
      if (result.success) {
        // 반려 완료 애니메이션
        setRowAnimations((prev) => ({ ...prev, [propertyId]: "rejected" }))

        toast({
          title: "반려 완료",
          description: "매물이 반려되었습니다.",
          duration: 2000
        })

        // 1.5초 후 데이터 리로드 (fade-out 애니메이션 시간)
        setTimeout(async () => {
          await loadProperties()
          setRowAnimations((prev) => {
            const next = { ...prev }
            delete next[propertyId]
            return next
          })
        }, 1500)
      } else {
        throw new Error(result.error || "반려 실패")
      }
    } catch (error) {
      // 오류 애니메이션 (shake)
      setRowAnimations((prev) => ({ ...prev, [propertyId]: "error" }))

      toast({
        title: "반려 실패",
        description: error instanceof Error ? error.message : "반려 중 오류가 발생했습니다.",
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPropertyIds(new Set(filteredData.map((p) => p.id)))
    } else {
      setSelectedPropertyIds(new Set())
    }
  }

  const handleSelectOne = (propertyId: string, checked: boolean) => {
    const newSet = new Set(selectedPropertyIds)
    if (checked) {
      newSet.add(propertyId)
    } else {
      newSet.delete(propertyId)
    }
    setSelectedPropertyIds(newSet)
  }

  /**
   * 배치 단위로 ID 배열을 나눔
   */
  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 배치 처리 with 진행률 표시
   */
  const processBatches = async <T,>(
    items: string[],
    batchSize: number,
    processFn: (batch: string[]) => Promise<ActionResult<T>>,
    onProgress?: (processed: number, succeeded: number, failed: number) => void
  ): Promise<{ succeeded: number; failed: number; failedIds: string[] }> => {
    const batches = chunkArray(items, batchSize)
    let succeeded = 0
    let failed = 0
    const failedIds: string[] = []

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      try {
        const result = await processFn(batch)
        if (result.success) {
          succeeded += batch.length
        } else {
          failed += batch.length
          failedIds.push(...batch)
        }
      } catch {
        failed += batch.length
        failedIds.push(...batch)
      }

      if (onProgress) {
        onProgress((i + 1) * batchSize, succeeded, failed)
      }

      // 다음 배치 전 짧은 딜레이 (서버 부하 완화)
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    return { succeeded, failed, failedIds }
  }

  const handleBulkApprove = async () => {
    if (selectedPropertyIds.size === 0) return

    const items = Array.from(selectedPropertyIds)
    const startTime = Date.now()
    setBulkOperation("approve")
    setBulkStartTime(startTime)
    setBulkProgress({
      total: items.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      failedIds: [],
    })
    setBulkProgressOpen(true)
    setBulkProcessing(true)

    try {
      const { succeeded, failed, failedIds } = await processBatches(
        items,
        10,
        bulkApproveProperties,
        (processed, succeeded, failed) => {
          setBulkProgress((prev) => ({
            ...prev,
            processed: Math.min(processed, items.length),
            succeeded,
            failed,
          }))
        }
      )

      setBulkProgress((prev) => ({ ...prev, failedIds }))

      if (succeeded > 0) {
        await loadProperties()
        setSelectedPropertyIds(new Set())
      }

      toast({
        title: failed === 0 ? "일괄 승인 완료" : "일괄 승인 부분 완료",
        description:
          failed === 0
            ? `${succeeded}개의 매물이 승인되었습니다.`
            : `${succeeded}개 승인, ${failed}개 실패했습니다.`,
        variant: failed === 0 ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "일괄 승인 실패",
        description: error instanceof Error ? error.message : "일괄 승인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleBulkReject = async () => {
    if (selectedPropertyIds.size === 0) return
    if (!rejectComment.trim()) {
      toast({ title: "반려 사유를 입력해주세요", variant: "destructive" })
      return
    }

    const items = Array.from(selectedPropertyIds)
    const comment = rejectComment
    const startTime = Date.now()

    setBulkRejectDialogOpen(false)
    setBulkOperation("reject")
    setBulkStartTime(startTime)
    setBulkProgress({
      total: items.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      failedIds: [],
    })
    setBulkProgressOpen(true)
    setBulkProcessing(true)

    try {
      const { succeeded, failed, failedIds } = await processBatches(
        items,
        10,
        (batch) => bulkRejectProperties(batch, comment),
        (processed, succeeded, failed) => {
          setBulkProgress((prev) => ({
            ...prev,
            processed: Math.min(processed, items.length),
            succeeded,
            failed,
          }))
        }
      )

      setBulkProgress((prev) => ({ ...prev, failedIds }))

      if (succeeded > 0) {
        await loadProperties()
        setSelectedPropertyIds(new Set())
        setRejectComment("")
      }

      toast({
        title: failed === 0 ? "일괄 반려 완료" : "일괄 반려 부분 완료",
        description:
          failed === 0
            ? `${succeeded}개의 매물이 반려되었습니다.`
            : `${succeeded}개 반려, ${failed}개 실패했습니다.`,
        variant: failed === 0 ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "일괄 반려 실패",
        description: error instanceof Error ? error.message : "일괄 반려 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleBulkSupplement = async () => {
    if (selectedPropertyIds.size === 0) return
    if (!supplementComment.trim()) {
      toast({ title: "보완 요청 사유를 입력해주세요", variant: "destructive" })
      return
    }

    const items = Array.from(selectedPropertyIds)
    const comment = supplementComment
    const startTime = Date.now()

    setBulkSupplementDialogOpen(false)
    setBulkOperation("supplement")
    setBulkStartTime(startTime)
    setBulkProgress({
      total: items.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      failedIds: [],
    })
    setBulkProgressOpen(true)
    setBulkProcessing(true)

    try {
      const { succeeded, failed, failedIds } = await processBatches(
        items,
        10,
        (batch) => bulkSupplementProperties(batch, comment),
        (processed, succeeded, failed) => {
          setBulkProgress((prev) => ({
            ...prev,
            processed: Math.min(processed, items.length),
            succeeded,
            failed,
          }))
        }
      )

      setBulkProgress((prev) => ({ ...prev, failedIds }))

      if (succeeded > 0) {
        await loadProperties()
        setSelectedPropertyIds(new Set())
        setSupplementComment("")
      }

      toast({
        title: failed === 0 ? "일괄 보완 요청 완료" : "일괄 보완 요청 부분 완료",
        description:
          failed === 0
            ? `${succeeded}개의 매물에 보완을 요청했습니다.`
            : `${succeeded}개 요청, ${failed}개 실패했습니다.`,
        variant: failed === 0 ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "일괄 보완 요청 실패",
        description: error instanceof Error ? error.message : "일괄 보완 요청 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setBulkProcessing(false)
    }
  }

  /**
   * 실패한 항목만 재시도
   */
  const handleRetryFailed = async () => {
    if (bulkProgress.failedIds.length === 0) return
    if (!bulkOperation) return

    // 실패한 항목만으로 재시도
    const failedItems = bulkProgress.failedIds
    const startTime = Date.now()

    // 진행 상태 리셋 (실패 항목만)
    setBulkStartTime(startTime)
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

  // 필터링 + 검색 (columns보다 먼저 선언 필요)
  const filteredData = useMemo(() => {
    let data = properties

    // 상태 필터
    if (statusFilter !== "all") {
      data = data.filter((p) => p.status === statusFilter)
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          p.guest_name?.toLowerCase().includes(q) ||
          p.guest_email?.toLowerCase().includes(q) ||
          p.guest_phone?.includes(q)
      )
    }

    // 가격 범위 필터
    if (priceRange.min) {
      const min = parseInt(priceRange.min)
      data = data.filter((p) => p.price_per_week >= min)
    }
    if (priceRange.max) {
      const max = parseInt(priceRange.max)
      data = data.filter((p) => p.price_per_week <= max)
    }

    // AI 점수 범위 필터
    if (aiScoreRange.min) {
      const min = parseInt(aiScoreRange.min)
      data = data.filter((p) => (p.ai_review_score || 0) >= min)
    }
    if (aiScoreRange.max) {
      const max = parseInt(aiScoreRange.max)
      data = data.filter((p) => (p.ai_review_score || 0) <= max)
    }

    // 매물 유형 필터
    if (propertyTypeFilter) {
      data = data.filter((p) => p.property_type === propertyTypeFilter)
    }

    return data
  }, [properties, statusFilter, searchQuery, priceRange, aiScoreRange, propertyTypeFilter])

  // Sortable Header Component
  const SortableHeader = ({ column, children }: { column: any; children: React.ReactNode }) => {
    const sortDirection = column.getIsSorted()

    return (
      <button
        className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-sm px-2 py-1 -mx-2 -my-1"
        onClick={column.getToggleSortingHandler()}
      >
        {children}
        <div className="flex flex-col gap-0.5">
          <ChevronUp
            className={`h-3 w-3 transition-colors ${
              sortDirection === "asc" ? "text-primary" : "text-muted-foreground/40"
            }`}
            strokeWidth={3}
          />
          <ChevronDown
            className={`h-3 w-3 transition-colors -mt-1 ${
              sortDirection === "desc" ? "text-primary" : "text-muted-foreground/40"
            }`}
            strokeWidth={3}
          />
        </div>
      </button>
    )
  }

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => {
          const allSelected =
            filteredData.length > 0 &&
            filteredData.every((p) => selectedPropertyIds.has(p.id))
          return (
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
              aria-label="전체 선택"
            />
          )
        },
        cell: (info) => {
          const propertyId = info.row.original.id
          return (
            <Checkbox
              checked={selectedPropertyIds.has(propertyId)}
              onCheckedChange={(checked) =>
                handleSelectOne(propertyId, checked as boolean)
              }
              aria-label="선택"
              onClick={(e) => e.stopPropagation()}
            />
          )
        },
      }),
      columnHelper.accessor("title", {
        header: "숙소 이름",
        cell: (info) => <div className="font-medium">{info.getValue()}</div>,
      }),
      columnHelper.accessor("property_type", {
        header: "유형",
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("guest_name", {
        header: "호스트",
        cell: (info) => {
          const row = info.row.original
          if (row.guest_name) {
            return (
              <div className="text-sm">
                <div className="font-medium">{row.guest_name}</div>
                <div className="text-muted-foreground">{row.guest_phone}</div>
              </div>
            )
          }
          return <span className="text-muted-foreground text-sm">회원</span>
        },
      }),
      columnHelper.accessor("price_per_week", {
        header: ({ column }) => <SortableHeader column={column}>주간 가격</SortableHeader>,
        cell: (info) => (
          <div className="font-semibold font-mono tabular-nums">{info.getValue()?.toLocaleString()}원</div>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("address", {
        header: "주소",
        cell: (info) => (
          <div className="text-sm max-w-[200px] truncate">{info.getValue()}</div>
        ),
      }),
      columnHelper.accessor("ai_review_score", {
        header: ({ column }) => <SortableHeader column={column}>AI 점수</SortableHeader>,
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
            if (score >= 70) return {
              bg: "bg-emerald-500",
              text: "text-emerald-700",
              ring: "ring-emerald-200"
            }
            if (score >= 40) return {
              bg: "bg-amber-500",
              text: "text-amber-700",
              ring: "ring-amber-200"
            }
            return {
              bg: "bg-red-500",
              text: "text-red-700",
              ring: "ring-red-200"
            }
          }

          const colors = getScoreColor(score)

          return (
            <div className="flex items-center gap-3">
              {/* Inline gauge */}
              <div className="relative w-20 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ease-out ${colors.bg}`}
                  style={{ width: `${score}%` }}
                />
              </div>

              {/* Score number with badge */}
              <div className={`px-2.5 py-1 rounded-md ring-1 font-mono text-xs font-bold tabular-nums ${colors.text} ${colors.ring}`}>
                {score}
              </div>
            </div>
          )
        },
        sortingFn: "basic",
        sortDescFirst: true,
      }),
      columnHelper.accessor("created_at", {
        header: ({ column }) => <SortableHeader column={column}>등록일</SortableHeader>,
        cell: (info) => <span className="text-sm font-mono">{formatDate(info.getValue())}</span>,
        sortingFn: "datetime",
        sortDescFirst: true,
      }),
      columnHelper.accessor("status", {
        header: "상태",
        cell: (info) => {
          const status = info.getValue()
          return <Badge variant={STATUS_VARIANTS[status] || "secondary"} className={`whitespace-nowrap ${status === "supplement" ? "border-orange-400 text-orange-600" : ""}`}>{STATUS_LABELS[status] || status}</Badge>
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "관리",
        cell: (info) => {
          const property = info.row.original
          return (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApprove(property.id)}
                disabled={property.status === "approved"}
              >
                <Check className="h-4 w-4 mr-1" />
                승인
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRejectClick(property.id)}
                disabled={property.status === "rejected"}
              >
                <X className="h-4 w-4 mr-1" />
                반려
              </Button>
            </div>
          )
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPropertyIds, filteredData]
  )

  const clearAdvancedFilters = () => {
    setPriceRange({ min: "", max: "" })
    setAiScoreRange({ min: "", max: "" })
    setPropertyTypeFilter("")
  }

  const hasAdvancedFilters = priceRange.min || priceRange.max || aiScoreRange.min || aiScoreRange.max || propertyTypeFilter

  // 매물 유형 목록 추출
  const propertyTypes = useMemo(() => {
    const types = new Set(properties.map((p) => p.property_type).filter(Boolean))
    return Array.from(types).sort()
  }, [properties])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <LoadingSpinner fullPage message="매물 데이터 로딩 중..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">매물 승인 관리</h1>
          <p className="text-muted-foreground mt-2">
            등록된 매물을 검토하고 승인/반려할 수 있습니다
          </p>
        </div>

        {/* 검색 및 고급 필터 */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <label htmlFor="property-search" className="sr-only">매물 검색</label>
            <Input
              id="property-search"
              placeholder="숙소명, 주소, 호스트명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Popover open={advancedFilterOpen} onOpenChange={setAdvancedFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                고급 필터
                {hasAdvancedFilters && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">고급 필터</h4>
                  <p className="text-sm text-muted-foreground">
                    추가 조건으로 매물을 필터링합니다.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* 가격 범위 */}
                  <div className="space-y-2">
                    <Label>주간 가격 (원)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="최소"
                        value={priceRange.min}
                        onChange={(e) =>
                          setPriceRange({ ...priceRange, min: e.target.value })
                        }
                      />
                      <span className="flex items-center">~</span>
                      <Input
                        type="number"
                        placeholder="최대"
                        value={priceRange.max}
                        onChange={(e) =>
                          setPriceRange({ ...priceRange, max: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* AI 점수 범위 */}
                  <div className="space-y-2">
                    <Label>AI 검수 점수</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="최소"
                        min="0"
                        max="100"
                        value={aiScoreRange.min}
                        onChange={(e) =>
                          setAiScoreRange({ ...aiScoreRange, min: e.target.value })
                        }
                      />
                      <span className="flex items-center">~</span>
                      <Input
                        type="number"
                        placeholder="최대"
                        min="0"
                        max="100"
                        value={aiScoreRange.max}
                        onChange={(e) =>
                          setAiScoreRange({ ...aiScoreRange, max: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* 매물 유형 */}
                  <div className="space-y-2">
                    <Label htmlFor="property-type-filter">매물 유형</Label>
                    <select
                      id="property-type-filter"
                      aria-describedby="property-type-filter-desc"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={propertyTypeFilter}
                      onChange={(e) => setPropertyTypeFilter(e.target.value)}
                    >
                      <option value="">전체</option>
                      {propertyTypes.map((type) => (
                        <option key={type} value={type || ""}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <p id="property-type-filter-desc" className="sr-only">
                      매물 유형으로 필터링합니다
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAdvancedFilters}
                    disabled={!hasAdvancedFilters}
                  >
                    초기화
                  </Button>
                  <Button size="sm" onClick={() => setAdvancedFilterOpen(false)}>
                    적용
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 일괄 처리 액션 바 */}
        {selectedPropertyIds.size > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {selectedPropertyIds.size}개 선택됨
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPropertyIds(new Set())}
                >
                  선택 해제
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleBulkApprove}
                  disabled={bulkProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  일괄 승인
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkSupplementDialogOpen(true)}
                  disabled={bulkProcessing}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  일괄 보완 요청
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkRejectDialogOpen(true)}
                  disabled={bulkProcessing}
                >
                  <XSquare className="h-4 w-4 mr-1" />
                  일괄 반려
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 필터 탭 */}
        <div className="flex gap-2 border-b">
          {([
            { key: "all", label: "전체" },
            { key: "pending", label: "검토 대기" },
            { key: "supplement", label: "보완 필요" },
            { key: "approved", label: "승인" },
            { key: "rejected", label: "반려" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} (
              {key === "all"
                ? properties.length
                : properties.filter((p) => p.status === key).length}
              )
            </button>
          ))}
        </div>

        {/* 테이블 */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                    {searchQuery ? "검색 결과가 없습니다." : "등록된 매물이 없습니다."}
                  </TableCell>
                </TableRow>
              ) : (
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
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 반려 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>매물 반려</DialogTitle>
            <DialogDescription>반려 사유를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {rejectionTemplates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="single-reject-template">템플릿 선택</Label>
                <select
                  id="single-reject-template"
                  aria-describedby="single-reject-template-desc"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  onChange={(e) => {
                    const template = rejectionTemplates.find((t) => t.id === e.target.value)
                    if (template) {
                      setRejectComment(template.content)
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">템플릿 선택...</option>
                  {rejectionTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
                <p id="single-reject-template-desc" className="sr-only">
                  사전 정의된 반려 사유 템플릿을 선택하거나 직접 입력하세요
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reject-comment">반려 사유</Label>
              <Textarea
                id="reject-comment"
                placeholder="반려 사유를 입력해주세요..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectComment("")
              }}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              반려하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 반려 다이얼로그 */}
      <Dialog open={bulkRejectDialogOpen} onOpenChange={setBulkRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일괄 반려</DialogTitle>
            <DialogDescription>
              선택한 {selectedPropertyIds.size}개의 매물을 반려합니다. 반려 사유를
              입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {rejectionTemplates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="bulk-reject-template">템플릿 선택</Label>
                <select
                  id="bulk-reject-template"
                  aria-describedby="bulk-reject-template-desc"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  onChange={(e) => {
                    const template = rejectionTemplates.find((t) => t.id === e.target.value)
                    if (template) {
                      setRejectComment(template.content)
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">템플릿 선택...</option>
                  {rejectionTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
                <p id="bulk-reject-template-desc" className="sr-only">
                  사전 정의된 반려 사유 템플릿을 선택하거나 직접 입력하세요
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="bulk-reject-comment">반려 사유</Label>
              <Textarea
                id="bulk-reject-comment"
                placeholder="반려 사유를 입력해주세요..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkRejectDialogOpen(false)
                setRejectComment("")
              }}
              disabled={bulkProcessing}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={bulkProcessing}
            >
              {bulkProcessing ? "처리 중..." : "일괄 반려하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 보완 요청 다이얼로그 */}
      <Dialog open={bulkSupplementDialogOpen} onOpenChange={setBulkSupplementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일괄 보완 요청</DialogTitle>
            <DialogDescription>
              선택한 {selectedPropertyIds.size}개의 매물에 보완을 요청합니다. 보완 사유를
              입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-supplement-comment">보완 요청 사유</Label>
              <Textarea
                id="bulk-supplement-comment"
                placeholder="보완이 필요한 사유를 입력해주세요... (예: 실내 사진 추가 필요, 매물 설명 보완 필요)"
                value={supplementComment}
                onChange={(e) => setSupplementComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkSupplementDialogOpen(false)
                setSupplementComment("")
              }}
              disabled={bulkProcessing}
            >
              취소
            </Button>
            <Button
              onClick={handleBulkSupplement}
              disabled={bulkProcessing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {bulkProcessing ? "처리 중..." : "일괄 보완 요청하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 처리 진행 다이얼로그 */}
      <Dialog open={bulkProgressOpen} onOpenChange={(open) => !bulkProcessing && setBulkProgressOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkOperation === "approve" && "일괄 승인 진행 중"}
              {bulkOperation === "reject" && "일괄 반려 진행 중"}
              {bulkOperation === "supplement" && "일괄 보완 요청 진행 중"}
            </DialogTitle>
            <DialogDescription>
              매물을 배치 단위로 처리하고 있습니다. 잠시만 기다려주세요.
            </DialogDescription>
          </DialogHeader>
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
              {bulkProcessing && etaResult && bulkProgress.processed > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">남은 시간</p>
                  <p className="text-2xl font-bold font-mono text-blue-600">
                    {etaResult.etaText}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatSpeed(etaResult.speed)}
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Progress Bar with Segments */}
            <div className="relative">
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
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
              <p className="text-xs text-center text-muted-foreground mt-2 font-mono">
                {Math.round((bulkProgress.processed / bulkProgress.total) * 100)}%
              </p>
            </div>

            {/* Status Cards with Icons */}
            <div className="grid grid-cols-3 gap-3">
              <div className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  {bulkProcessing && bulkProgress.succeeded > 0 && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
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
          <DialogFooter>
            <Button
              onClick={() => setBulkProgressOpen(false)}
              disabled={bulkProcessing}
              variant={bulkProcessing ? "outline" : "default"}
            >
              {bulkProcessing ? "처리 중..." : "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

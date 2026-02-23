"use client"

import { useState, useMemo, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table"
import { Check, X, Search, CheckSquare, XSquare, AlertCircle, Filter, SlidersHorizontal } from "lucide-react"

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

type StatusFilter = "all" | PropertyStatus

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
    <Suspense fallback={<div className="container mx-auto py-8 px-4"><p className="text-muted-foreground">로딩 중...</p></div>}>
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
    try {
      const result = await approveProperty(propertyId)
      if (result.success) {
        toast({ title: "승인 완료", description: "매물이 승인되었습니다." })
        await loadProperties()
      } else {
        throw new Error(result.error || "승인 실패")
      }
    } catch (error) {
      toast({
        title: "승인 실패",
        description: error instanceof Error ? error.message : "승인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
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
    try {
      const result = await rejectProperty(selectedPropertyId, rejectComment)
      if (result.success) {
        toast({ title: "반려 완료", description: "매물이 반려되었습니다." })
        setRejectDialogOpen(false)
        setSelectedPropertyId(null)
        setRejectComment("")
        await loadProperties()
      } else {
        throw new Error(result.error || "반려 실패")
      }
    } catch (error) {
      toast({
        title: "반려 실패",
        description: error instanceof Error ? error.message : "반려 중 오류가 발생했습니다.",
        variant: "destructive",
      })
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
    setBulkOperation("approve")
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

    setBulkRejectDialogOpen(false)
    setBulkOperation("reject")
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

    setBulkSupplementDialogOpen(false)
    setBulkOperation("supplement")
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
        header: "주간 가격",
        cell: (info) => (
          <div className="font-semibold">{info.getValue()?.toLocaleString()}원</div>
        ),
      }),
      columnHelper.accessor("address", {
        header: "주소",
        cell: (info) => (
          <div className="text-sm max-w-[200px] truncate">{info.getValue()}</div>
        ),
      }),
      columnHelper.accessor("ai_review_score", {
        header: "AI 점수",
        cell: (info) => {
          const score = info.getValue()
          if (score == null) return <span className="text-sm text-muted-foreground">-</span>
          const color = score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600"
          return <span className={`text-sm font-bold ${color}`}>{score}점</span>
        },
      }),
      columnHelper.accessor("created_at", {
        header: "등록일",
        cell: (info) => <span className="text-sm">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.accessor("status", {
        header: "상태",
        cell: (info) => {
          const status = info.getValue()
          return <Badge variant={STATUS_VARIANTS[status] || "secondary"} className={status === "supplement" ? "border-orange-400 text-orange-600" : ""}>{STATUS_LABELS[status] || status}</Badge>
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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
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
                    <Label>매물 유형</Label>
                    <select
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
            { key: "approved", label: "승인됨" },
            { key: "rejected", label: "반려됨" },
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
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => router.push(`/admin/properties/${property.id}`)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
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
                <Label>템플릿 선택</Label>
                <select
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
                <Label>템플릿 선택</Label>
                <select
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
          <div className="space-y-4 py-4">
            {/* 진행률 바 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">진행 상황</span>
                <span className="text-muted-foreground">
                  {Math.min(bulkProgress.processed, bulkProgress.total)} / {bulkProgress.total}
                </span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (bulkProgress.processed / bulkProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-green-50/50 text-center">
                <p className="text-xs text-muted-foreground">성공</p>
                <p className="text-lg font-bold text-green-700">{bulkProgress.succeeded}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50/50 text-center">
                <p className="text-xs text-muted-foreground">실패</p>
                <p className="text-lg font-bold text-red-700">{bulkProgress.failed}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50/50 text-center">
                <p className="text-xs text-muted-foreground">대기</p>
                <p className="text-lg font-bold text-blue-700">
                  {bulkProgress.total - bulkProgress.processed}
                </p>
              </div>
            </div>

            {/* 실패 항목 표시 */}
            {bulkProgress.failedIds.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-1">
                  실패한 항목 ({bulkProgress.failedIds.length}개)
                </p>
                <p className="text-xs text-muted-foreground">
                  일부 매물 처리에 실패했습니다. 나머지는 정상적으로 처리됩니다.
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

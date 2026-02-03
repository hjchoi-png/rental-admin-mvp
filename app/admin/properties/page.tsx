"use client"

export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table"
import { Check, X, Search } from "lucide-react"

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
import { useToast } from "@/components/ui/use-toast"
import { fetchProperties, approveProperty, rejectProperty } from "./actions"

type Property = {
  id: string
  title: string
  host_id: string | null
  price_per_week: number
  monthly_price: number | null
  property_type: string | null
  room_count: number | null
  max_guests: number | null
  address: string
  created_at: string
  status: "pending" | "approved" | "rejected"
  admin_comment?: string | null
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  ai_review_score?: number | null
}

type StatusFilter = "all" | "pending" | "approved" | "rejected"

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

const columnHelper = createColumnHelper<Property>()

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
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all"
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState("")

  const loadProperties = async () => {
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
  }

  useEffect(() => {
    loadProperties()
  }, [])

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

  const columns = useMemo(
    () => [
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
          const variants: Record<typeof status, "default" | "secondary" | "destructive"> = {
            approved: "default",
            pending: "secondary",
            rejected: "destructive",
          }
          const labels: Record<typeof status, string> = {
            approved: "승인됨",
            pending: "검토 대기",
            rejected: "반려됨",
          }
          return <Badge variant={variants[status]}>{labels[status]}</Badge>
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
    []
  )

  // 필터링 + 검색
  const filteredData = useMemo(() => {
    let data = properties
    if (statusFilter !== "all") {
      data = data.filter((p) => p.status === statusFilter)
    }
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
    return data
  }, [properties, statusFilter, searchQuery])

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

        {/* 검색 */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="숙소명, 주소, 호스트명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 border-b">
          {([
            { key: "all", label: "전체" },
            { key: "pending", label: "검토 대기" },
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
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectComment("") }}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleReject}>반려하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Calendar, User, Activity } from "lucide-react"
import { fetchAuditLogs, fetchAuditLogStats, type AuditLog } from "./actions"

const actionTypeLabels: Record<string, string> = {
  approve: "승인",
  reject: "반려",
  bulk_approve: "일괄 승인",
  bulk_reject: "일괄 반려",
  update_status: "상태 변경",
  update_settings: "설정 변경",
}

const actionTypeColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  approve: "default",
  reject: "destructive",
  bulk_approve: "default",
  bulk_reject: "destructive",
  update_status: "secondary",
  update_settings: "outline",
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return dateString
  }
}

export default function AuditLogsPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<{
    total: number
    today: number
    thisWeek: number
    byActionType: Record<string, number>
  }>({ total: 0, today: 0, thisWeek: 0, byActionType: {} })
  const [loading, setLoading] = useState(true)
  const [actionTypeFilter, setActionTypeFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [logsResult, statsResult] = await Promise.all([
        fetchAuditLogs({ actionType: actionTypeFilter }),
        fetchAuditLogStats(),
      ])

      if (logsResult.error) throw new Error(logsResult.error)
      if (statsResult.error) throw new Error(statsResult.error)

      setLogs(logsResult.data || [])
      setStats(statsResult.data)
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [actionTypeFilter, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs

    const query = searchQuery.toLowerCase()
    return logs.filter(
      (log) =>
        log.admin_email?.toLowerCase().includes(query) ||
        log.action_type.toLowerCase().includes(query) ||
        log.target_type.toLowerCase().includes(query) ||
        JSON.stringify(log.details).toLowerCase().includes(query)
    )
  }, [logs, searchQuery])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">감사 로그</h1>
          <p className="text-muted-foreground mt-2">
            관리자의 모든 작업 기록을 조회할 수 있습니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">전체 로그</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">오늘</p>
                  <p className="text-2xl font-bold">{stats.today}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">최근 7일</p>
                  <p className="text-2xl font-bold">{stats.thisWeek}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <User className="h-6 w-6 text-purple-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">작업 유형</p>
                  <p className="text-2xl font-bold">
                    {Object.keys(stats.byActionType).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 */}
        <Card>
          <CardHeader>
            <CardTitle>로그 필터</CardTitle>
            <CardDescription>작업 유형과 검색어로 로그를 필터링할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>작업 유형</Label>
                <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="작업 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="approve">승인</SelectItem>
                    <SelectItem value="reject">반려</SelectItem>
                    <SelectItem value="bulk_approve">일괄 승인</SelectItem>
                    <SelectItem value="bulk_reject">일괄 반려</SelectItem>
                    <SelectItem value="update_status">상태 변경</SelectItem>
                    <SelectItem value="update_settings">설정 변경</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>검색</Label>
                <Input
                  placeholder="관리자 이메일, 작업 내용 등 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 로그 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>로그 목록</CardTitle>
            <CardDescription>
              {filteredLogs.length}개의 로그가 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시간</TableHead>
                    <TableHead>관리자</TableHead>
                    <TableHead>작업</TableHead>
                    <TableHead>대상</TableHead>
                    <TableHead>상세 정보</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {searchQuery
                          ? "검색 결과가 없습니다."
                          : "로그가 없습니다."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {log.admin_email || "시스템"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionTypeColors[log.action_type] || "outline"}>
                            {actionTypeLabels[log.action_type] || log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.target_type === "property" && "매물"}
                          {log.target_type === "settings" && "설정"}
                          {log.target_type === "template" && "템플릿"}
                        </TableCell>
                        <TableCell className="text-sm max-w-md">
                          <details className="cursor-pointer">
                            <summary className="text-muted-foreground hover:text-foreground">
                              상세 보기
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Building2, Clock, CheckCircle2, XCircle, TrendingUp, MapPin, Home, AlertTriangle, Zap, Settings, ScrollText, BarChart3, Users, Timer, Activity } from "lucide-react"
import {
  fetchPropertyStats,
  fetchPropertiesByRegion,
  fetchPropertiesByType,
  fetchDailyRegistrationStats,
  fetchRejectionReasons,
  fetchAiQualityTrend,
  fetchProcessingSpeedStats,
  fetchHostActivityStats,
} from "../properties/actions"

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
  supplement: number
}

interface RegionStat {
  region: string
  total_count: number
  approved_count: number
  pending_count: number
  rejected_count: number
  avg_price: number
}

interface TypeStat {
  property_type: string
  total_count: number
  approved_count: number
  avg_price: number
  avg_ai_score: number
}

interface DailyStat {
  date: string
  total_registered: number
  approved_count: number
  rejected_count: number
  pending_count: number
}

interface RejectionReason {
  reason: string
  count: number
}

interface AiQualityTrendItem {
  date: string
  avg_score: number
  property_count: number
}

interface ProcessingSpeed {
  avg_minutes: number
  min_minutes: number
  max_minutes: number
  sample_count: number
}

interface HostActivity {
  total_hosts: number
  active_hosts: number
  avg_properties_per_host: number
  supplement_rate: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0, supplement: 0 })
  const [regionStats, setRegionStats] = useState<RegionStat[]>([])
  const [typeStats, setTypeStats] = useState<TypeStat[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [rejectionReasons, setRejectionReasons] = useState<RejectionReason[]>([])
  const [aiQualityTrend, setAiQualityTrend] = useState<AiQualityTrendItem[]>([])
  const [processingSpeed, setProcessingSpeed] = useState<ProcessingSpeed>({
    avg_minutes: 0,
    min_minutes: 0,
    max_minutes: 0,
    sample_count: 0,
  })
  const [hostActivity, setHostActivity] = useState<HostActivity>({
    total_hosts: 0,
    active_hosts: 0,
    avg_properties_per_host: 0,
    supplement_rate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAllStats = async () => {
      try {
        const [
          basicStats,
          regions,
          types,
          daily,
          rejections,
          aiQuality,
          speed,
          hosts,
        ] = await Promise.all([
          fetchPropertyStats(),
          fetchPropertiesByRegion(),
          fetchPropertiesByType(),
          fetchDailyRegistrationStats(),
          fetchRejectionReasons(),
          fetchAiQualityTrend(),
          fetchProcessingSpeedStats(),
          fetchHostActivityStats(),
        ])

        setStats(basicStats)
        setRegionStats(regions.data || [])
        setTypeStats(types.data || [])
        setDailyStats(daily.data || [])
        setRejectionReasons(rejections.data || [])
        setAiQualityTrend(aiQuality.data || [])
        setProcessingSpeed(speed.data || { avg_minutes: 0, min_minutes: 0, max_minutes: 0, sample_count: 0 })
        setHostActivity(hosts.data || { total_hosts: 0, active_hosts: 0, avg_properties_per_host: 0, supplement_rate: 0 })
      } catch (error) {
        console.error("통계 조회 실패:", error)
      } finally {
        setLoading(false)
      }
    }
    loadAllStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={1.5} />
      </div>
    )
  }

  const statCards = [
    {
      title: "전체 매물",
      value: stats.total,
      icon: Building2,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      valueColor: "text-primary",
    },
    {
      title: "검토 대기",
      value: stats.pending,
      icon: Clock,
      bgColor: "bg-amber-50",
      iconColor: "text-amber-500",
      valueColor: "text-amber-600",
    },
    {
      title: "승인됨",
      value: stats.approved,
      icon: CheckCircle2,
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-500",
      valueColor: "text-emerald-600",
    },
    {
      title: "보완 필요",
      value: stats.supplement,
      icon: AlertTriangle,
      bgColor: "bg-orange-50",
      iconColor: "text-orange-500",
      valueColor: "text-orange-600",
    },
    {
      title: "반려됨",
      value: stats.rejected,
      icon: XCircle,
      bgColor: "bg-rose-50",
      iconColor: "text-rose-500",
      valueColor: "text-rose-600",
    },
  ]

  // 자동승인률 계산
  const autoApprovalRate = stats.total > 0
    ? Math.round(((stats.approved) / stats.total) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground mt-1">매물 등록 현황 및 통계를 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/settings")}
          >
            <Settings className="h-4 w-4 mr-1" strokeWidth={1.5} />
            설정
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/audit-logs")}
          >
            <ScrollText className="h-4 w-4 mr-1" strokeWidth={1.5} />
            감사 로그
          </Button>
          <Button size="sm" onClick={() => router.push("/admin/properties")}>
            <Building2 className="h-4 w-4 mr-1" strokeWidth={1.5} />
            매물 관리
          </Button>
        </div>
      </div>

      {/* 기본 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className="border-0 shadow-md hover:shadow-lg transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {card.title}
                    </p>
                    <p className={`text-4xl font-bold ${card.valueColor}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.iconColor}`} strokeWidth={1.5} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 자동 검수 현황 */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Zap className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">자동 검수 현황</h3>
                <p className="text-sm text-blue-700">
                  승인률 {autoApprovalRate}% · 보완 {stats.supplement}건 · 반려 {stats.rejected}건
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-700">{autoApprovalRate}%</p>
              <p className="text-xs text-blue-500">승인률</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 빠른 액션 */}
      {(stats.pending > 0 || stats.supplement > 0) && (
        <div className="space-y-3">
          {stats.pending > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <Clock className="h-6 w-6 text-amber-600" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900">검토가 필요한 매물이 있습니다</h3>
                      <p className="text-sm text-amber-700">{stats.pending}개의 매물이 승인 대기 중입니다</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => router.push("/admin/properties?status=pending")}
                  >
                    검토하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.supplement > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <AlertTriangle className="h-6 w-6 text-orange-600" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-900">보완이 필요한 매물이 있습니다</h3>
                      <p className="text-sm text-orange-700">{stats.supplement}개의 매물이 호스트 보완 대기 중입니다</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    onClick={() => router.push("/admin/properties?status=supplement")}
                  >
                    확인하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 반려 사유 통계 */}
      {rejectionReasons.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <CardTitle>주요 반려 사유</CardTitle>
            </div>
            <CardDescription>최근 반려된 매물의 주요 사유 (상위 10개)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rejectionReasons.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(100, (item.count / (rejectionReasons[0]?.count || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-primary w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 검수 품질 트렌드 */}
      {aiQualityTrend.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <CardTitle>AI 검수 품질 트렌드</CardTitle>
            </div>
            <CardDescription>최근 30일간 AI 검수 평균 점수 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aiQualityTrend.slice(0, 10).map((item) => (
                <div
                  key={item.date}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {new Date(item.date).toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-6 items-center">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">평균 점수</p>
                      <p className="text-lg font-bold text-blue-600">
                        {item.avg_score.toFixed(1)}점
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">검수 건수</p>
                      <p className="text-sm font-semibold">{item.property_count}건</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 처리 속도 & 호스트 활동 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 처리 속도 통계 */}
        {processingSpeed.sample_count > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <CardTitle>처리 속도 통계</CardTitle>
              </div>
              <CardDescription>매물 검수 처리 시간 (분)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50/50">
                  <div>
                    <p className="text-sm text-muted-foreground">평균</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {processingSpeed.avg_minutes.toFixed(1)}분
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Timer className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-green-50/50 text-center">
                    <p className="text-xs text-muted-foreground">최소</p>
                    <p className="text-lg font-bold text-green-700">
                      {processingSpeed.min_minutes.toFixed(1)}분
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50/50 text-center">
                    <p className="text-xs text-muted-foreground">최대</p>
                    <p className="text-lg font-bold text-amber-700">
                      {processingSpeed.max_minutes.toFixed(1)}분
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  총 {processingSpeed.sample_count}건 기준
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 호스트 활동 통계 */}
        {hostActivity.total_hosts > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <CardTitle>호스트 활동 통계</CardTitle>
              </div>
              <CardDescription>호스트 및 매물 등록 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 text-center">
                    <p className="text-xs text-muted-foreground">전체 호스트</p>
                    <p className="text-2xl font-bold text-primary">
                      {hostActivity.total_hosts}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50/50 text-center">
                    <p className="text-xs text-muted-foreground">활동 중</p>
                    <p className="text-2xl font-bold text-green-700">
                      {hostActivity.active_hosts}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50/50 text-center">
                    <p className="text-xs text-muted-foreground">평균 매물 수</p>
                    <p className="text-lg font-bold text-blue-700">
                      {hostActivity.avg_properties_per_host.toFixed(1)}개
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50/50 text-center">
                    <p className="text-xs text-muted-foreground">보완 요청률</p>
                    <p className="text-lg font-bold text-orange-700">
                      {(hostActivity.supplement_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 지역별 통계 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <CardTitle>지역별 매물 현황</CardTitle>
          </div>
          <CardDescription>서울 각 구별 매물 등록 현황입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regionStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                등록된 매물이 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regionStats.slice(0, 9).map((region) => (
                  <Card key={region.region} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{region.region}</h4>
                          <span className="text-2xl font-bold text-primary">
                            {region.total_count}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center">
                            <p className="text-muted-foreground">승인</p>
                            <p className="font-medium text-green-600">{region.approved_count}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">대기</p>
                            <p className="font-medium text-amber-600">{region.pending_count}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">반려</p>
                            <p className="font-medium text-red-600">{region.rejected_count}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">평균 주간 가격</p>
                          <p className="font-semibold">{Math.round(region.avg_price).toLocaleString()}원</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 유형별 통계 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <CardTitle>매물 유형별 통계</CardTitle>
          </div>
          <CardDescription>매물 유형별 등록 현황 및 평균 지표입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {typeStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                등록된 매물이 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {typeStats.map((type) => (
                  <Card key={type.property_type} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-lg">{type.property_type}</h4>
                          <span className="text-2xl font-bold text-primary">
                            {type.total_count}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">승인</p>
                            <p className="text-lg font-semibold text-green-600">
                              {type.approved_count}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">평균 가격</p>
                            <p className="text-sm font-semibold">
                              {Math.round(type.avg_price).toLocaleString()}원
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">AI 점수</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {type.avg_ai_score ? `${Math.round(type.avg_ai_score)}점` : "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 최근 등록 추이 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <CardTitle>최근 등록 추이</CardTitle>
          </div>
          <CardDescription>최근 10일간 매물 등록 현황입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              데이터가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {dailyStats.slice(0, 10).map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {new Date(day.date).toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">전체</p>
                      <p className="font-semibold">{day.total_registered}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">승인</p>
                      <p className="font-semibold text-green-600">{day.approved_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">대기</p>
                      <p className="font-semibold text-amber-600">{day.pending_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">반려</p>
                      <p className="font-semibold text-red-600">{day.rejected_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

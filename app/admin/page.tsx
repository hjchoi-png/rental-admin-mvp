'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchPropertyStats } from './properties/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Building2, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await fetchPropertyStats()
        setStats(result)
      } catch (error) {
        console.error('통계 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const statCards = [
    {
      title: '전체 매물',
      value: stats.total,
      icon: Building2,
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
      filter: 'all'
    },
    {
      title: '검토 대기',
      value: stats.pending,
      icon: Clock,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-500',
      valueColor: 'text-amber-600',
      filter: 'pending'
    },
    {
      title: '승인됨',
      value: stats.approved,
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      valueColor: 'text-emerald-600',
      filter: 'approved'
    },
    {
      title: '반려됨',
      value: stats.rejected,
      icon: XCircle,
      bgColor: 'bg-rose-50',
      iconColor: 'text-rose-500',
      valueColor: 'text-rose-600',
      filter: 'rejected'
    },
  ]

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">관리자 대시보드</h1>
          <p className="text-muted-foreground mt-1">매물 등록 현황을 한눈에 확인하세요</p>
        </div>
        <Button
          onClick={() => router.push('/admin/properties')}
          className="bg-primary hover:bg-primary/90"
        >
          매물 관리하기
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-0 shadow-md"
              onClick={() => router.push(`/admin/properties?status=${card.filter}`)}
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
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 빠른 액션 섹션 */}
      {stats.pending > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">검토가 필요한 매물이 있습니다</h3>
                  <p className="text-sm text-amber-700">{stats.pending}개의 매물이 승인 대기 중입니다</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => router.push('/admin/properties?status=pending')}
              >
                검토하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

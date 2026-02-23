"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-guard"
import { insertAuditLog } from "@/lib/audit-log"
import type { ActionResult } from "@/types/action-result"

/**
 * 매물 목록 조회 (서버 사이드 - RLS 적용)
 *
 * 페이지네이션 지원: page, pageSize 파라미터 사용
 * 기본값: 전체 조회 (하위 호환)
 */
export async function fetchProperties(options?: {
  page?: number
  pageSize?: number
  status?: string
}) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { data: null, error: guard.error, total: 0 }

  const supabase = await createClient()

  // 목록에 필요한 컬럼만 조회 (images, description 등 무거운 데이터 제외)
  const selectFields = "id, title, host_id, price_per_week, monthly_price, property_type, room_count, max_guests, address, created_at, status, admin_comment, guest_name, guest_email, guest_phone, ai_review_score"

  let query = supabase
    .from("properties")
    .select(selectFields, { count: "exact" })
    .order("created_at", { ascending: false })

  // 상태 필터 (서버 사이드)
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status)
  }

  // 페이지네이션
  if (options?.page && options?.pageSize) {
    const from = (options.page - 1) * options.pageSize
    const to = from + options.pageSize - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query

  if (error) {
    return { data: null, error: error.message, total: 0 }
  }
  return { data, error: null, total: count || 0 }
}

/**
 * 매물 통계 조회 (서버 사이드 - RLS 적용)
 */
export async function fetchPropertyStats() {
  const guard = await requireAdmin()
  if (!guard.authorized) return { total: 0, pending: 0, approved: 0, rejected: 0, supplement: 0 }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("properties")
    .select("status")

  if (error) {
    return { total: 0, pending: 0, approved: 0, rejected: 0, supplement: 0 }
  }

  const properties = data || []
  return {
    total: properties.length,
    pending: properties.filter(p => p.status === 'pending').length,
    approved: properties.filter(p => p.status === 'approved').length,
    rejected: properties.filter(p => p.status === 'rejected').length,
    supplement: properties.filter(p => p.status === 'supplement').length,
  }
}

/**
 * 매물 상태를 승인으로 변경
 */
export async function approveProperty(
  propertyId: string
): Promise<ActionResult<null>> {
  try {
    const guard = await requireAdmin()
    if (!guard.authorized) return { success: false, error: guard.error }

    const supabase = await createClient()

    const { error } = await supabase
      .from("properties")
      .update({ status: "approved" })
      .eq("id", propertyId)

    if (error) {
      console.error('[approveProperty] Supabase error:', error)
      return { success: false, error: '매물 승인에 실패했습니다.' }
    }

    await insertAuditLog({
      action: "property_approved",
      admin_user_id: guard.userId,
      target_id: propertyId,
      target_type: "property",
    })

    revalidatePath("/admin/properties")
    return { success: true, data: null }
  } catch (error) {
    console.error('[approveProperty] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '매물 승인 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 매물 상태를 반려로 변경
 */
export async function rejectProperty(
  propertyId: string,
  adminComment: string
): Promise<ActionResult<null>> {
  try {
    const guard = await requireAdmin()
    if (!guard.authorized) return { success: false, error: guard.error }

    const supabase = await createClient()

    const { error } = await supabase
      .from("properties")
      .update({
        status: "rejected",
        admin_comment: adminComment,
      })
      .eq("id", propertyId)

    if (error) {
      console.error('[rejectProperty] Supabase error:', error)
      return { success: false, error: '매물 반려에 실패했습니다.' }
    }

    await insertAuditLog({
      action: "property_rejected",
      admin_user_id: guard.userId,
      target_id: propertyId,
      target_type: "property",
      details: { admin_comment: adminComment },
    })

    revalidatePath("/admin/properties")
    return { success: true, data: null }
  } catch (error) {
    console.error('[rejectProperty] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '매물 반려 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 일괄 승인 (여러 매물을 한번에 승인)
 */
export async function bulkApproveProperties(
  propertyIds: string[]
): Promise<ActionResult<{ count: number }>> {
  try {
    const guard = await requireAdmin()
    if (!guard.authorized) return { success: false, error: guard.error }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("properties")
      .update({ status: "approved" })
      .in("id", propertyIds)
      .select()

    if (error) {
      console.error('[bulkApproveProperties] Supabase error:', error)
      return { success: false, error: '일괄 승인에 실패했습니다.' }
    }

    await insertAuditLog({
      action: "property_bulk_approved",
      admin_user_id: guard.userId,
      target_type: "property",
      details: { property_ids: propertyIds, count: data?.length || 0 },
    })

    revalidatePath("/admin/properties")
    return { success: true, data: { count: data?.length || 0 } }
  } catch (error) {
    console.error('[bulkApproveProperties] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '일괄 승인 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 일괄 반려 (여러 매물을 한번에 반려)
 */
export async function bulkRejectProperties(
  propertyIds: string[],
  adminComment: string
): Promise<ActionResult<{ count: number }>> {
  try {
    const guard = await requireAdmin()
    if (!guard.authorized) return { success: false, error: guard.error }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("properties")
      .update({
        status: "rejected",
        admin_comment: adminComment,
      })
      .in("id", propertyIds)
      .select()

    if (error) {
      console.error('[bulkRejectProperties] Supabase error:', error)
      return { success: false, error: '일괄 반려에 실패했습니다.' }
    }

    await insertAuditLog({
      action: "property_bulk_rejected",
      admin_user_id: guard.userId,
      target_type: "property",
      details: { property_ids: propertyIds, count: data?.length || 0, admin_comment: adminComment },
    })

    revalidatePath("/admin/properties")
    return { success: true, data: { count: data?.length || 0 } }
  } catch (error) {
    console.error('[bulkRejectProperties] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '일괄 반려 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 일괄 보완 요청 (여러 매물을 한번에 보완 요청)
 */
export async function bulkSupplementProperties(
  propertyIds: string[],
  adminComment: string
): Promise<ActionResult<{ count: number }>> {
  try {
    const guard = await requireAdmin()
    if (!guard.authorized) return { success: false, error: guard.error }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("properties")
      .update({
        status: "supplement",
        admin_comment: adminComment,
      })
      .in("id", propertyIds)
      .select()

    if (error) {
      console.error('[bulkSupplementProperties] Supabase error:', error)
      return { success: false, error: '일괄 보완 요청에 실패했습니다.' }
    }

    await insertAuditLog({
      action: "property_bulk_supplement",
      admin_user_id: guard.userId,
      target_type: "property",
      details: { property_ids: propertyIds, count: data?.length || 0, admin_comment: adminComment },
    })

    revalidatePath("/admin/properties")
    return { success: true, data: { count: data?.length || 0 } }
  } catch (error) {
    console.error('[bulkSupplementProperties] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '일괄 보완 요청 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 지역별 매물 통계 조회
 */
export async function fetchPropertiesByRegion() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_properties_by_region")

  if (error) {
    console.error("지역별 통계 조회 오류:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * 유형별 매물 통계 조회
 */
export async function fetchPropertiesByType() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_properties_by_type")

  if (error) {
    console.error("유형별 통계 조회 오류:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * 일별 등록 통계 조회 (최근 30일)
 */
export async function fetchDailyRegistrationStats() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_daily_registration_stats")

  if (error) {
    console.error("일별 통계 조회 오류:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * 반려 사유 통계 조회 (Top 10)
 */
export async function fetchRejectionReasons() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("properties")
    .select("admin_comment")
    .eq("status", "rejected")
    .not("admin_comment", "is", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("반려 사유 조회 오류:", error)
    return { data: null, error: error.message }
  }

  // admin_comment에서 반려 사유 추출 및 집계
  const reasonCounts: Record<string, number> = {}
  data?.forEach((prop) => {
    const comment = prop.admin_comment as string
    // "AI 자동 반려: " 또는 다른 접두어 제거하고 핵심 사유만 추출
    const reason = comment.replace(/^(AI 자동 반려: |수동 반려: |시스템 반려: )/, "").trim()
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
  })

  // 빈도순 정렬
  const sortedReasons = Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }))

  return { data: sortedReasons, error: null }
}

/**
 * AI 검수 품질 트렌드 (최근 30일)
 */
export async function fetchAiQualityTrend() {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from("properties")
    .select("created_at, ai_review_score")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .not("ai_review_score", "is", null)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("AI 품질 트렌드 조회 오류:", error)
    return { data: null, error: error.message }
  }

  // 일별 평균 점수 계산
  const dailyScores: Record<string, { total: number; count: number }> = {}
  data?.forEach((prop) => {
    const date = new Date(prop.created_at).toISOString().split("T")[0]
    if (!dailyScores[date]) {
      dailyScores[date] = { total: 0, count: 0 }
    }
    dailyScores[date].total += prop.ai_review_score || 0
    dailyScores[date].count += 1
  })

  const trend = Object.entries(dailyScores)
    .map(([date, { total, count }]) => ({
      date,
      avg_score: Math.round(total / count),
      property_count: count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { data: trend, error: null }
}

/**
 * 처리 속도 통계
 */
export async function fetchProcessingSpeedStats() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("properties")
    .select("created_at, updated_at, status, inspection_result")
    .in("status", ["approved", "rejected", "supplement"])
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("처리 속도 조회 오류:", error)
    return { data: null, error: error.message }
  }

  // 등록 → 최종 판정까지 소요 시간 계산
  const processingTimes: number[] = []
  data?.forEach((prop) => {
    const created = new Date(prop.created_at).getTime()
    const updated = new Date(prop.updated_at).getTime()
    const diffMinutes = Math.round((updated - created) / 1000 / 60)
    if (diffMinutes > 0 && diffMinutes < 10080) {
      // 1주일(10080분) 이내만 유효
      processingTimes.push(diffMinutes)
    }
  })

  if (processingTimes.length === 0) {
    return {
      data: {
        avg_minutes: 0,
        min_minutes: 0,
        max_minutes: 0,
        sample_count: 0,
      },
      error: null,
    }
  }

  const avg = Math.round(
    processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length
  )
  const min = Math.min(...processingTimes)
  const max = Math.max(...processingTimes)

  return {
    data: {
      avg_minutes: avg,
      min_minutes: min,
      max_minutes: max,
      sample_count: processingTimes.length,
    },
    error: null,
  }
}

/**
 * 호스트 활동 통계
 */
export async function fetchHostActivityStats() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("properties")
    .select("host_id, status, created_at")
    .not("host_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    console.error("호스트 활동 조회 오류:", error)
    return { data: null, error: error.message }
  }

  // 호스트별 매물 수 및 보완/재등록 비율 계산
  const hostStats: Record<string, {
    total: number
    approved: number
    rejected: number
    supplement: number
    pending: number
  }> = {}

  data?.forEach((prop) => {
    const hostId = prop.host_id as string
    if (!hostStats[hostId]) {
      hostStats[hostId] = { total: 0, approved: 0, rejected: 0, supplement: 0, pending: 0 }
    }
    hostStats[hostId].total += 1
    if (prop.status === "approved") hostStats[hostId].approved += 1
    if (prop.status === "rejected") hostStats[hostId].rejected += 1
    if (prop.status === "supplement") hostStats[hostId].supplement += 1
    if (prop.status === "pending") hostStats[hostId].pending += 1
  })

  const totalHosts = Object.keys(hostStats).length
  const activeHosts = Object.values(hostStats).filter((s) => s.total >= 2).length
  const supplementRate =
    data.length > 0
      ? Math.round(
          (data.filter((p) => p.status === "supplement").length / data.length) * 100
        )
      : 0

  return {
    data: {
      total_hosts: totalHosts,
      active_hosts: activeHosts, // 2개 이상 등록한 호스트
      avg_properties_per_host: Math.round((data.length / totalHosts) * 10) / 10,
      supplement_rate: supplementRate,
    },
    error: null,
  }
}

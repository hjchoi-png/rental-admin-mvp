"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-guard"
import { insertAuditLog } from "@/lib/audit-log"

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
export async function approveProperty(propertyId: string) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from("properties")
    .update({ status: "approved" })
    .eq("id", propertyId)

  if (error) {
    return { success: false, error: error.message }
  }

  await insertAuditLog({
    action: "property_approved",
    admin_user_id: guard.userId,
    target_id: propertyId,
    target_type: "property",
  })

  revalidatePath("/admin/properties")
  return { success: true }
}

/**
 * 매물 상태를 반려로 변경
 */
export async function rejectProperty(propertyId: string, adminComment: string) {
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
    return { success: false, error: error.message }
  }

  await insertAuditLog({
    action: "property_rejected",
    admin_user_id: guard.userId,
    target_id: propertyId,
    target_type: "property",
    details: { admin_comment: adminComment },
  })

  revalidatePath("/admin/properties")
  return { success: true }
}

/**
 * 일괄 승인 (여러 매물을 한번에 승인)
 */
export async function bulkApproveProperties(propertyIds: string[]) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error, count: 0 }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("properties")
    .update({ status: "approved" })
    .in("id", propertyIds)
    .select()

  if (error) {
    return { success: false, error: error.message, count: 0 }
  }

  await insertAuditLog({
    action: "property_bulk_approved",
    admin_user_id: guard.userId,
    target_type: "property",
    details: { property_ids: propertyIds, count: data?.length || 0 },
  })

  revalidatePath("/admin/properties")
  return { success: true, count: data?.length || 0 }
}

/**
 * 일괄 반려 (여러 매물을 한번에 반려)
 */
export async function bulkRejectProperties(
  propertyIds: string[],
  adminComment: string
) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error, count: 0 }

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
    return { success: false, error: error.message, count: 0 }
  }

  await insertAuditLog({
    action: "property_bulk_rejected",
    admin_user_id: guard.userId,
    target_type: "property",
    details: { property_ids: propertyIds, count: data?.length || 0, admin_comment: adminComment },
  })

  revalidatePath("/admin/properties")
  return { success: true, count: data?.length || 0 }
}

/**
 * 일괄 보완 요청 (여러 매물을 한번에 보완 요청)
 */
export async function bulkSupplementProperties(
  propertyIds: string[],
  adminComment: string
) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error, count: 0 }

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
    return { success: false, error: error.message, count: 0 }
  }

  await insertAuditLog({
    action: "property_bulk_supplement",
    admin_user_id: guard.userId,
    target_type: "property",
    details: { property_ids: propertyIds, count: data?.length || 0, admin_comment: adminComment },
  })

  revalidatePath("/admin/properties")
  return { success: true, count: data?.length || 0 }
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

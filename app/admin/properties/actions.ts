"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * 매물 목록 조회 (서버 사이드 - RLS 적용)
 */
export async function fetchProperties() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

/**
 * 매물 통계 조회 (서버 사이드 - RLS 적용)
 */
export async function fetchPropertyStats() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("properties")
    .select("status")

  if (error) {
    return { total: 0, pending: 0, approved: 0, rejected: 0 }
  }

  const properties = data || []
  return {
    total: properties.length,
    pending: properties.filter(p => p.status === 'pending').length,
    approved: properties.filter(p => p.status === 'approved').length,
    rejected: properties.filter(p => p.status === 'rejected').length,
  }
}

/**
 * 매물 상태를 승인으로 변경
 */
export async function approveProperty(propertyId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("properties")
    .update({ status: "approved" })
    .eq("id", propertyId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/properties")
  return { success: true }
}

/**
 * 매물 상태를 반려로 변경
 */
export async function rejectProperty(propertyId: string, adminComment: string) {
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

  revalidatePath("/admin/properties")
  return { success: true }
}

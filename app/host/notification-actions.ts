"use server"

import { createClient } from "@/utils/supabase/server"
import { requireHost } from "@/lib/host-guard"

export interface HostNotification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

// ── 알림 목록 조회 ──────────────────────────────
export async function getNotifications() {
  const guard = await requireHost()
  if (!guard.authorized) return { data: null, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", guard.userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return { data: null, error: error.message }
  return { data: (data || []) as HostNotification[], error: null }
}

// ── 미읽은 알림 수 ──────────────────────────────
export async function getUnreadCount() {
  const guard = await requireHost()
  if (!guard.authorized) return { count: 0 }

  const supabase = await createClient()
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", guard.userId)
    .eq("is_read", false)

  if (error) return { count: 0 }
  return { count: count || 0 }
}

// ── 단건 읽음 처리 ──────────────────────────────
export async function markAsRead(notificationId: string) {
  const guard = await requireHost()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", guard.userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── 전체 읽음 처리 ──────────────────────────────
export async function markAllAsRead() {
  const guard = await requireHost()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", guard.userId)
    .eq("is_read", false)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

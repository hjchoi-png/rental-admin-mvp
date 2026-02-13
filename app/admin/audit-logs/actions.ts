"use server"

import { createClient } from "@/utils/supabase/server"

export interface AuditLog {
  id: string
  admin_id: string | null
  admin_email: string | null
  action_type: string
  target_type: string
  target_id: string | null
  details: Record<string, any>
  created_at: string
}

/**
 * 감사 로그 조회
 */
export async function fetchAuditLogs(options?: {
  actionType?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })

  // 필터 적용
  if (options?.actionType && options.actionType !== "all") {
    query = query.eq("action_type", options.actionType)
  }

  if (options?.startDate) {
    query = query.gte("created_at", options.startDate)
  }

  if (options?.endDate) {
    query = query.lte("created_at", options.endDate)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  } else {
    query = query.limit(100) // 기본 100개
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as AuditLog[], error: null }
}

/**
 * 감사 로그 통계
 */
export async function fetchAuditLogStats() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("audit_logs")
    .select("action_type, created_at")

  if (error) {
    return {
      data: {
        total: 0,
        today: 0,
        thisWeek: 0,
        byActionType: {},
      },
      error: error.message,
    }
  }

  const logs = data || []
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const stats = {
    total: logs.length,
    today: logs.filter((log) => new Date(log.created_at) >= today).length,
    thisWeek: logs.filter((log) => new Date(log.created_at) >= weekAgo).length,
    byActionType: logs.reduce(
      (acc, log) => {
        acc[log.action_type] = (acc[log.action_type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),
  }

  return { data: stats, error: null }
}

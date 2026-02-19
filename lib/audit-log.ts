"use server"

import { createClient } from "@/utils/supabase/server"

/**
 * 감사 로그 기록 유틸리티
 *
 * 매물 상태 변경, 설정 변경 등 중요 관리자 액션을 기록한다.
 * 누가, 언제, 무엇을 했는지 추적 가능.
 */

export type AuditAction =
  | "property_approved"
  | "property_rejected"
  | "property_supplement"
  | "property_bulk_approved"
  | "property_bulk_rejected"
  | "property_bulk_supplement"
  | "settings_updated"
  | "forbidden_word_added"
  | "forbidden_word_deleted"
  | "ai_inspection_run"
  // 자동 검수 관련
  | "auto_rejected_system"     // 시스템 규칙 자동 반려
  | "auto_rejected_ai"         // AI 자동 반려
  | "auto_approved"            // AI 자동 승인
  | "auto_supplement"          // AI 보완 요청
  | "auto_approved_no_ai"      // AI 비활성 상태 자동 승인
  | "host_resubmitted"         // 호스트 재제출

export interface AuditLogEntry {
  action: AuditAction
  admin_user_id: string | null  // null = 자동(시스템) 처리
  target_id?: string        // 대상 매물 ID 등
  target_type?: string      // "property" | "settings" | "forbidden_word"
  details?: Record<string, unknown>  // 추가 정보 (변경 전/후 등)
}

/**
 * 감사 로그 기록
 *
 * audit_logs 테이블에 insert한다.
 * 실패해도 메인 로직을 차단하지 않는다 (fire-and-forget).
 */
export async function insertAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from("audit_logs").insert({
      action: entry.action,
      admin_user_id: entry.admin_user_id,
      target_id: entry.target_id || null,
      target_type: entry.target_type || null,
      details: entry.details || {},
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    // 감사 로그 실패는 메인 로직을 차단하지 않음
    console.error("감사 로그 기록 실패:", error)
  }
}

/**
 * 감사 로그 조회
 */
export async function fetchAuditLogs(options?: {
  limit?: number
  offset?: number
  action?: AuditAction
  targetId?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })

  if (options?.action) query = query.eq("action", options.action)
  if (options?.targetId) query = query.eq("target_id", options.targetId)
  if (options?.limit) query = query.limit(options.limit)
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1)

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

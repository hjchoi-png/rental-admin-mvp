"use server"

import { createClient } from "@/utils/supabase/server"
import { requireHost } from "@/lib/host-guard"
import { revalidatePath } from "next/cache"
import { formDataToDbColumns } from "@/lib/property-mapper"
import { checkSystemRules } from "@/lib/inspection/system-rules"
import { runAiInspection } from "@/app/admin/properties/[id]/ai-actions"
import type { ActionResult, ListResult } from "@/types/action-result"
import type { Property } from "@/types/property"
import type { CreatePropertyInput } from "@/app/actions/property"
import { insertAuditLog } from "@/lib/audit-log"

// ── 호스트 매물 목록 ──────────────────────────────
export async function getHostProperties(): Promise<ListResult<Property>> {
  const guard = await requireHost()
  if (!guard.authorized) return { data: null, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, short_title, host_id, price_per_week, monthly_price, property_type, room_count, max_guests, address, created_at, status, admin_comment, images, ai_review_score, inspection_result")
    .eq("host_id", guard.userId)
    .order("created_at", { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: (data || []) as Property[], error: null }
}

// ── 호스트 매물 상세 ──────────────────────────────
export async function getHostProperty(id: string): Promise<ActionResult<Property>> {
  const guard = await requireHost()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("host_id", guard.userId)
    .single()

  if (error || !data) return { success: false, error: "매물을 찾을 수 없습니다." }
  return { success: true, data: data as Property }
}

// ── 매물 수정 + 재제출 ──────────────────────────────
export async function updatePropertyAndResubmit(
  id: string,
  formData: CreatePropertyInput
): Promise<ActionResult<{ propertyId: string }>> {
  const guard = await requireHost()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  // 소유권 + supplement 상태 확인
  const { data: existing } = await supabase
    .from("properties")
    .select("id, status, host_id")
    .eq("id", id)
    .eq("host_id", guard.userId)
    .single()

  if (!existing) return { success: false, error: "매물을 찾을 수 없습니다." }
  if (existing.status !== "supplement") {
    return { success: false, error: "보완 요청 상태의 매물만 수정할 수 있습니다." }
  }

  // DB 업데이트: 매물 데이터 + 상태 리셋
  const updateData: Record<string, unknown> = {
    ...formDataToDbColumns(formData),
    status: "pending",
    admin_comment: null,
    inspection_result: {},
    inspection_rule_violations: [],
    inspection_ai_violations: [],
    ai_review_score: null,
    ai_review_result: null,
  }

  const { error: updateError } = await supabase
    .from("properties")
    .update(updateData)
    .eq("id", id)

  if (updateError) return { success: false, error: "매물 수정 실패: " + updateError.message }

  // 감사 로그: 호스트 재제출
  await insertAuditLog({
    action: "host_resubmitted",
    admin_user_id: guard.userId,
    target_id: id,
    target_type: "property",
    details: { previousStatus: "supplement" },
  })

  // 검수 파이프라인 재실행
  try {
    const ruleResult = await checkSystemRules({
      id,
      address: formData.address,
      dong: formData.dong || null,
      ho: formData.ho || null,
      user_id: guard.userId,
      short_title: formData.shortTitle,
      description: formData.description,
      location_transport: formData.locationTransport || null,
      usage_guide: formData.usageGuide || null,
      host_message: formData.hostMessage || null,
      maintenance_detail: formData.maintenanceDetail || null,
      parking_condition: formData.parkingCondition || null,
    })

    if (ruleResult.decision === "reject") {
      await supabase
        .from("properties")
        .update({
          status: "rejected",
          inspection_result: {
            systemRules: ruleResult,
            decision: "reject",
            decidedAt: new Date().toISOString(),
            decidedBy: "system",
          },
          inspection_rule_violations: ruleResult.violations.map(
            (v) => `[${v.severity}] ${v.category}: ${v.message}`
          ),
          admin_comment: `자동 반려: ${ruleResult.rejectReason}`,
        })
        .eq("id", id)
    } else {
      if (ruleResult.violations.length > 0) {
        await supabase
          .from("properties")
          .update({
            inspection_result: {
              systemRules: ruleResult,
              decision: "pending_ai",
              decidedAt: new Date().toISOString(),
            },
            inspection_rule_violations: ruleResult.violations.map(
              (v) => `[${v.severity}] ${v.category}: ${v.message}`
            ),
          })
          .eq("id", id)
      }

      // AI 검수
      try {
        await runAiInspection(id)
      } catch (aiError) {
        console.error("AI 재검수 실패:", aiError)
      }
    }
  } catch (ruleError) {
    console.error("시스템 규칙 재검사 실패:", ruleError)
  }

  revalidatePath("/host/dashboard")
  revalidatePath(`/host/properties/${id}`)
  revalidatePath("/admin/properties")

  return { success: true, data: { propertyId: id } }
}

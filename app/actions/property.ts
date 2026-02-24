'use server'

import { createClient } from "@/utils/supabase/server"
import { z } from "zod"
import { runAiInspection } from "@/app/admin/properties/[id]/ai-actions"
import { checkSystemRules } from "@/lib/inspection/system-rules"
import { revalidatePath } from "next/cache"
import { formDataToDbColumns } from "@/lib/property-mapper"
import { insertAuditLog } from "@/lib/audit-log"
import type { ActionResult } from "@/types/action-result"

// v2 입력 데이터 검증 규칙 (6단계 폼)
const propertySchema = z.object({
  // 호스트 정보 (비회원)
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional(),

  // Step 1: 위치 및 구조
  address: z.string().min(1),
  dong: z.string().optional(),
  ho: z.string().optional(),
  dongNone: z.boolean().optional(),
  totalFloors: z.number().optional(),
  floorNumber: z.number().optional(),
  floorType: z.string().optional(),
  buildingType: z.string().min(1),
  roomCount: z.number().min(1),
  bathroomCount: z.number().min(0).default(0),
  kitchenCount: z.number().min(0).default(0),
  livingRoomCount: z.number().min(0).default(0),
  areaSqm: z.number().optional(),
  areaPyeong: z.number().optional(),
  areaUnit: z.string().optional(),
  hasElevator: z.boolean().optional(),
  parking: z.string().optional(),
  parkingType: z.string().optional(),
  parkingCount: z.number().optional(),
  parkingCondition: z.string().optional(),

  // Step 2: 옵션
  amenities: z.array(z.string()).optional(),
  petAllowed: z.boolean().optional(),

  // Step 3: 상세 정보
  shortTitle: z.string().min(1),
  images: z.array(z.string()).optional(),
  description: z.string().min(1),
  locationTransport: z.string().optional(),
  usageGuide: z.string().optional(),
  hostMessage: z.string().optional(),

  // Step 4: 요금 설정
  weeklyPrice: z.number().min(1),
  deposit: z.number().optional(),
  longTermDiscounts: z.array(z.object({ weeks: z.number(), discountPct: z.number() })).optional(),
  instantMoveDiscounts: z.array(z.object({ days: z.number(), amount: z.number() })).optional(),
  maintenanceFee: z.number().optional(),
  maintenanceElectric: z.boolean().optional(),
  maintenanceWater: z.boolean().optional(),
  maintenanceGas: z.boolean().optional(),
  maintenanceDetail: z.string().optional(),
  cleaningFree: z.boolean().optional(),
  checkoutCleaningFee: z.number().optional(),
  petCleaningFee: z.number().optional(),
  cancellationPolicy: z.string().optional(),
  cancellationAgreed: z.boolean().optional(),

  // Step 5: 예약 설정
  minStayWeeks: z.number().optional(),
  maxStayWeeks: z.number().optional(),
  blockedDates: z.array(z.string()).optional(),

  // Step 6: 입실/퇴실
  checkinTime: z.string().optional(),
  checkinMethod: z.string().optional(),
  checkoutTime: z.string().optional(),
  checkoutMethod: z.string().optional(),
})

export type CreatePropertyInput = z.infer<typeof propertySchema>

interface CreatePropertyResult {
  propertyId: string
  inspectionResult?: string
  rejectReason?: string
}

export async function createProperty(
  formData: CreatePropertyInput
): Promise<ActionResult<CreatePropertyResult>> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const parsed = propertySchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: '입력 데이터가 올바르지 않습니다.' }
    }

    const d = parsed.data

    const propertyData: Record<string, unknown> = {
      ...formDataToDbColumns(d),
      status: 'pending',
      host_id: user ? user.id : null,
      guest_name: user ? null : d.guestName || null,
      guest_email: user ? null : d.guestEmail || null,
      guest_phone: user ? null : d.guestPhone || null,
    }

    const { data, error } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single()

    if (error) {
      console.error('[createProperty] Supabase insert error:', error)
      console.error('[createProperty] Property data:', JSON.stringify(propertyData, null, 2))
      return { success: false, error: '매물 등록에 실패했습니다.' }
    }

  // ── 자동 검수 파이프라인 ──────────────────────────────
  // 1단계: 시스템 규칙 체크 (즉시, AI 불필요)
  try {
    const ruleResult = await checkSystemRules({
      id: data.id,
      address: d.address,
      dong: d.dong || null,
      ho: d.ho || null,
      user_id: user?.id || null,
      short_title: d.shortTitle,
      description: d.description,
      location_transport: d.locationTransport || null,
      usage_guide: d.usageGuide || null,
      host_message: d.hostMessage || null,
      maintenance_detail: d.maintenanceDetail || null,
      parking_condition: d.parkingCondition || null,
    })

    if (ruleResult.decision === "reject") {
      // 시스템 규칙 위반 → 자동 반려
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
        .eq("id", data.id)

      // 감사 로그: 시스템 규칙 자동 반려
      await insertAuditLog({
        action: "auto_rejected_system",
        admin_user_id: null,
        target_id: data.id,
        target_type: "property",
        details: {
          reason: ruleResult.rejectReason,
          violations: ruleResult.violations.map((v) => `[${v.severity}] ${v.category}: ${v.message}`),
        },
      })

      revalidatePath("/admin/properties")
      revalidatePath("/admin")

      return {
        success: true,
        data: {
          propertyId: data.id,
          inspectionResult: "rejected",
          rejectReason: ruleResult.rejectReason,
        },
      }
    }

    // 시스템 규칙 통과 → inspection_result에 규칙 결과 저장
    if (ruleResult.violations.length > 0) {
      // 위반은 있지만 reject 수준은 아닌 경우 (minor) → 기록만
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
        .eq("id", data.id)
    }
  } catch (ruleError) {
    console.error("[createProperty] 시스템 규칙 체크 실패:", ruleError)
    // 시스템 규칙 체크 실패 시에도 AI 검수는 계속 진행
  }

  // 2단계: AI 정책 검수 (비동기)
  try {
    await runAiInspection(data.id)
  } catch (aiError) {
    console.error('[createProperty] AI 자동 검수 실패:', aiError)
  }

  revalidatePath("/admin/properties")
  revalidatePath("/admin")

  return {
    success: true,
    data: { propertyId: data.id },
  }
  } catch (error) {
    console.error('[createProperty] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '매물 등록 중 오류가 발생했습니다.',
    }
  }
}

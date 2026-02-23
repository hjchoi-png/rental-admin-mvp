"use server"

import { createClient } from "@/utils/supabase/server"
import type { ActionResult } from "@/types/action-result"

export interface WaitlistData {
  email: string
  phone?: string
  name?: string
  location: string
  buildingType: string
  roomCount: string
  currentRent: number
  estimatedIncome?: number
  additionalIncome?: number
}

/**
 * 사전등록 (호스트 대기자 명단)
 */
export async function registerWaitlist(
  data: WaitlistData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    // 1. 중복 확인
    const { data: existing } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", data.email)
      .single()

    if (existing) {
      return {
        success: false,
        error: "이미 등록된 이메일입니다. 런칭 알림을 기다려주세요!",
      }
    }

    // 2. 삽입
    const { data: inserted, error } = await supabase
      .from("waitlist")
      .insert({
        email: data.email,
        phone: data.phone,
        name: data.name,
        location: data.location,
        building_type: data.buildingType,
        room_count: data.roomCount,
        current_rent: data.currentRent,
        estimated_income: data.estimatedIncome,
        additional_income: data.additionalIncome,
        status: "pending",
      })
      .select("id")
      .single()

    if (error) {
      console.error("사전등록 저장 실패:", error)
      return {
        success: false,
        error: "등록 중 오류가 발생했습니다. 다시 시도해주세요.",
      }
    }

    return {
      success: true,
      data: { id: inserted.id },
    }
  } catch (err) {
    console.error("사전등록 오류:", err)
    return {
      success: false,
      error: "시스템 오류가 발생했습니다.",
    }
  }
}

/**
 * 사전등록 통계 조회 (관리자용)
 */
export async function getWaitlistStats() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("사전등록 통계 조회 실패:", error)
    return { data: null, error: error.message }
  }

  // 통계 계산
  const total = data.length
  const byLocation = data.reduce((acc, item) => {
    acc[item.location] = (acc[item.location] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const avgAdditionalIncome =
    data.reduce((sum, item) => sum + (item.additional_income || 0), 0) / total || 0

  return {
    data: {
      total,
      byLocation,
      avgAdditionalIncome: Math.round(avgAdditionalIncome),
      recent: data.slice(0, 10),
    },
    error: null,
  }
}

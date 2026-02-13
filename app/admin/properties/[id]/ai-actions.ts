"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import OpenAI from "openai"

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null
  }
  return new OpenAI({ apiKey })
}

// ============================================================
// Types
// ============================================================

/** AI가 탐지한 개별 위반 항목 */
export interface AiViolation {
  type:
    | "photo_contact_info"    // 사진 내 연락처/QR/URL
    | "duplicate_photos"      // 중복 사진 50%+
    | "no_interior_photos"    // 실내 사진 없음
    | "irrelevant_photos"     // 매물 외 사진 50%+
    | "low_quality_photos"    // 사진 품질 저하 (어둠/흔들림)
    | "space_bias"            // 공간 편중 (침실만 반복 등)
    | "text_policy_violation" // 텍스트 내 정책 위반 (AI 추가 감지)
    | "misleading_info"       // 오해의 소지가 있는 정보
  severity: "critical" | "major" | "minor"
  confidence: number  // 0-100
  description: string
  details?: string
}

/** AI 이미지 분석 요약 */
export interface ImageAnalysisSummary {
  totalPhotos: number
  hasInteriorPhotos: boolean
  estimatedUniquePhotos: number
  hasExteriorPhotos: boolean
  photoQualityAvg: "good" | "fair" | "poor"
}

/** AI 검수 결과 (v2 - 정책 위반 탐지) */
export interface AiInspectionResult {
  violations: AiViolation[]
  imageAnalysis: ImageAnalysisSummary
  recommendedDecision: "approve" | "supplement" | "reject"
  summary: string
  inspectedAt: string
  // 호환성: 기존 점수도 계산
  totalScore: number
  categories: {
    name: string
    score: number
    maxScore: number
    comment: string
  }[]
}

// ============================================================
// AI 매물 검수 실행 (v2 - 정책 위반 탐지)
// ============================================================

/**
 * AI 매물 검수 실행
 *
 * 시스템 규칙 체크(1단계) 통과 후 호출되며,
 * GPT-4o Vision으로 사진 + 텍스트를 분석하여 정책 위반을 탐지한다.
 *
 * 검수 완료 후 자동 판정(finalizeInspection)까지 수행한다.
 */
export async function runAiInspection(propertyId: string) {
  try {
    const openai = getOpenAIClient()
    if (!openai) {
      console.log("OPENAI_API_KEY가 설정되지 않아 AI 검수를 건너뜁니다.")
      // API 키 없으면 자동 승인 로직만 실행
      await finalizeWithoutAi(propertyId)
      return { success: false, error: "AI 검수 기능이 비활성화되어 있습니다." }
    }

    const supabase = await createClient()

    // 1. 매물 데이터 조회
    const { data: property, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .single()

    if (error || !property) {
      return { success: false, error: "매물을 찾을 수 없습니다." }
    }

    // 이미 반려된 매물은 AI 검수 스킵
    if (property.status === "rejected") {
      return { success: false, error: "이미 반려된 매물입니다." }
    }

    // 2. images 배열 변환
    let imageArray: string[] = []
    if (Array.isArray(property.images)) {
      imageArray = property.images
    } else if (typeof property.images === "string") {
      try {
        const parsed = JSON.parse(property.images)
        imageArray = Array.isArray(parsed) ? parsed : []
      } catch {
        imageArray = property.images ? [property.images] : []
      }
    }

    // 3. OpenAI API 호출을 위한 메시지 구성
    const imageMessages: OpenAI.Chat.Completions.ChatCompletionContentPart[] = imageArray
      .slice(0, 10) // 최대 10장으로 확대
      .map((url: string) => ({
        type: "image_url" as const,
        image_url: { url, detail: "low" as const },
      }))

    const textInfo = `
[매물 정보]
- 매물명: ${property.title || property.short_title || "없음"}
- 유형: ${property.property_type || property.building_type || "없음"}
- 주소: ${property.address || "없음"} ${property.detail_address || ""}
- 방 수: ${property.room_count || "없음"}
- 욕실 수: ${property.bathroom_count || "없음"}
- 최대 인원: ${property.max_guests || "없음"}
- 면적: ${property.area_sqm ? property.area_sqm + "㎡" : "없음"}
- 주간 가격: ${property.price_per_week ? property.price_per_week.toLocaleString() + "원" : "없음"}
- 월간 가격: ${property.monthly_price ? property.monthly_price.toLocaleString() + "원" : "없음"}
- 보증금: ${property.deposit ? property.deposit.toLocaleString() + "원" : "없음"}
- 관리비: ${property.maintenance_fee ? property.maintenance_fee.toLocaleString() + "원" : "포함"}
- 최소 체류: ${property.min_stay_weeks ? property.min_stay_weeks + "주" : property.min_stay || "없음"}
- 편의시설: ${(property.amenities || []).join(", ") || "없음"}
- 등록 사진 수: ${imageArray.length}장

[텍스트 필드]
- 매물 소개: ${property.description || "없음"}
- 위치 및 교통: ${property.location_transport || "없음"}
- 이용 안내: ${property.usage_guide || "없음"}
- 호스트 메시지: ${property.host_message || "없음"}
- 관리비 상세: ${property.maintenance_detail || "없음"}
`.trim()

    const systemPrompt = `당신은 단기임대(STR) 플랫폼의 매물 검수 AI 에이전트입니다.
등록된 매물의 사진과 텍스트를 분석하여 정책 위반 사항을 탐지하세요.

## 검수 항목

### 사진 검수 (critical/major)
1. **photo_contact_info** (critical): 사진에 전화번호, 카톡ID, QR코드, URL, 워터마크 텍스트가 있는지 확인
2. **duplicate_photos** (major): 동일하거나 거의 동일한 사진이 전체의 50% 이상인지 확인
3. **no_interior_photos** (critical): 실내 사진이 단 1장도 없는지 확인
4. **irrelevant_photos** (major): 매물과 무관한 사진(음식, 풍경, 셀카 등)이 50% 이상인지 확인
5. **low_quality_photos** (minor): 사진이 어둡거나 흔들리거나 해상도가 극히 낮은지 확인
6. **space_bias** (minor): 특정 공간(침실 등)만 반복되고 다른 공간 사진이 없는지 확인

### 텍스트 검수 (AI 추가 감지)
7. **text_policy_violation** (major): 시스템 규칙에서 잡지 못한 미묘한 정책 위반 표현
8. **misleading_info** (minor): 실제와 다를 수 있는 과장/허위 의심 표현

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "violations": [
    {
      "type": "위반 유형 (위 목록 중 하나)",
      "severity": "critical 또는 major 또는 minor",
      "confidence": 85,
      "description": "위반 내용 설명 (한국어, 1문장)"
    }
  ],
  "imageAnalysis": {
    "totalPhotos": 0,
    "hasInteriorPhotos": true,
    "estimatedUniquePhotos": 0,
    "hasExteriorPhotos": false,
    "photoQualityAvg": "good"
  },
  "recommendedDecision": "approve 또는 supplement 또는 reject",
  "summary": "종합 검수 의견 (한국어, 2-3문장)",
  "qualityScores": {
    "cleanliness": { "score": 0, "maxScore": 20, "comment": "" },
    "facilities": { "score": 0, "maxScore": 20, "comment": "" },
    "photoQuality": { "score": 0, "maxScore": 20, "comment": "" },
    "descriptionCompleteness": { "score": 0, "maxScore": 20, "comment": "" },
    "priceAdequacy": { "score": 0, "maxScore": 20, "comment": "" }
  }
}

## 판정 기준
- **reject**: critical 위반 1개 이상, 또는 major 위반 2개 이상
- **supplement**: major 위반 1개, 또는 minor 위반 3개 이상
- **approve**: 위반 없음 또는 minor 위반 1-2개

## 중요 규칙
- 사진이 아예 없으면 no_interior_photos를 critical로 추가
- confidence는 확신도 (0-100), 70 미만이면 해당 위반을 제외
- 한국어로 작성
- 위반이 없으면 violations를 빈 배열로 반환`

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: textInfo },
          ...imageMessages,
        ],
      },
    ]

    // 4. OpenAI API 호출
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 2000,
      temperature: 0.2,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { success: false, error: "AI 응답이 비어있습니다." }
    }

    // 5. JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("AI 응답 JSON 매칭 실패:", content.substring(0, 500))
      return { success: false, error: "AI 응답을 파싱할 수 없습니다." }
    }

    let aiResult: any
    try {
      aiResult = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("AI 응답 JSON 파싱 실패:", parseError, jsonMatch[0].substring(0, 500))
      return { success: false, error: "AI 응답 JSON 형식이 올바르지 않습니다." }
    }

    // confidence 70 미만 위반 필터링
    const filteredViolations: AiViolation[] = (aiResult.violations || [])
      .filter((v: AiViolation) => v.confidence >= 70)

    // 호환성: 기존 품질 점수 계산
    const qualityScores = aiResult.qualityScores || {}
    const defaultScore = { score: 15, maxScore: 20, comment: "AI 분석 완료" }
    const categories = [
      { name: "청결도", ...(qualityScores.cleanliness || defaultScore) },
      { name: "시설 상태", ...(qualityScores.facilities || defaultScore) },
      { name: "사진 품질", ...(qualityScores.photoQuality || defaultScore) },
      { name: "설명 완성도", ...(qualityScores.descriptionCompleteness || defaultScore) },
      { name: "가격 적정성", ...(qualityScores.priceAdequacy || defaultScore) },
    ]
    const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0)

    const reviewResult: AiInspectionResult = {
      violations: filteredViolations,
      imageAnalysis: aiResult.imageAnalysis || {
        totalPhotos: imageArray.length,
        hasInteriorPhotos: true,
        estimatedUniquePhotos: imageArray.length,
        hasExteriorPhotos: false,
        photoQualityAvg: "fair" as const,
      },
      recommendedDecision: aiResult.recommendedDecision || "approve",
      summary: aiResult.summary || "",
      inspectedAt: new Date().toISOString(),
      totalScore,
      categories,
    }

    // 6. DB 저장 (AI 결과)
    const aiViolationStrings = filteredViolations.map(
      (v: AiViolation) => `[${v.severity}] ${v.type}: ${v.description}`
    )

    const { error: updateError } = await supabase
      .from("properties")
      .update({
        ai_review_score: totalScore,
        ai_review_result: reviewResult,
        inspection_ai_violations: aiViolationStrings,
      })
      .eq("id", propertyId)

    if (updateError) {
      return { success: false, error: `결과 저장 실패: ${updateError.message}` }
    }

    // 7. 최종 판정
    await finalizeInspection(propertyId, reviewResult)

    revalidatePath(`/admin/properties/${propertyId}`)
    revalidatePath("/admin/properties")
    revalidatePath("/admin")

    return { success: true, data: reviewResult }
  } catch (err) {
    console.error("AI 검수 오류:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "AI 검수 중 오류가 발생했습니다.",
    }
  }
}

// ============================================================
// 최종 판정 로직
// ============================================================

/**
 * 시스템 규칙 + AI 결과를 종합하여 최종 판정을 내린다.
 *
 * - critical violation → rejected
 * - major violation → supplement
 * - 위반 없음 + auto_approval ON → approved (자동 승인)
 * - 위반 없음 + auto_approval OFF → pending (수동 대기)
 */
async function finalizeInspection(
  propertyId: string,
  aiResult: AiInspectionResult
) {
  const supabase = await createClient()

  // 현재 매물 상태 조회 (이미 반려됐으면 스킵)
  const { data: property } = await supabase
    .from("properties")
    .select("status, inspection_result, inspection_rule_violations")
    .eq("id", propertyId)
    .single()

  if (!property || property.status === "rejected") return

  // admin_settings 조회
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("auto_approval_enabled, auto_approval_threshold")
    .single()

  const autoApprovalEnabled = settings?.auto_approval_enabled ?? false
  const autoApprovalThreshold = settings?.auto_approval_threshold ?? 80

  // AI 위반 분석
  const hasCritical = aiResult.violations.some((v) => v.severity === "critical")
  const majorCount = aiResult.violations.filter((v) => v.severity === "major").length
  const minorCount = aiResult.violations.filter((v) => v.severity === "minor").length

  let finalStatus: string = property.status
  let adminComment: string | null = null

  if (hasCritical || majorCount >= 2) {
    // 자동 반려
    finalStatus = "rejected"
    const criticalViolation = aiResult.violations.find((v) => v.severity === "critical")
    adminComment = `AI 자동 반려: ${criticalViolation?.description || aiResult.violations[0]?.description || "정책 위반 탐지"}`
  } else if (majorCount === 1 || minorCount >= 3) {
    // 보완 요청
    finalStatus = "supplement"
    const mainViolation = aiResult.violations.find((v) => v.severity === "major") || aiResult.violations[0]
    adminComment = `AI 검수 보완 요청: ${mainViolation?.description || "일부 항목 보완 필요"}`
  } else if (aiResult.violations.length === 0 || (minorCount <= 2 && majorCount === 0)) {
    // 위반 없음 또는 경미
    if (autoApprovalEnabled && aiResult.totalScore >= autoApprovalThreshold) {
      finalStatus = "approved"
      adminComment = null
    } else {
      // 수동 검토 대기 (상태 유지)
      finalStatus = "pending"
    }
  }

  // 기존 inspection_result에 AI 결과 병합
  const existingResult = (property.inspection_result as Record<string, unknown>) || {}
  const mergedResult = {
    ...existingResult,
    aiInspection: aiResult,
    finalDecision: finalStatus,
    decidedAt: new Date().toISOString(),
    decidedBy: finalStatus === "pending" ? "pending_manual" : "system",
    autoApproved: finalStatus === "approved" && autoApprovalEnabled,
  }

  const updateData: Record<string, unknown> = {
    inspection_result: mergedResult,
  }

  // 상태가 실제로 변경될 때만 업데이트
  if (finalStatus !== property.status) {
    updateData.status = finalStatus
    if (adminComment) {
      updateData.admin_comment = adminComment
    }
  }

  await supabase
    .from("properties")
    .update(updateData)
    .eq("id", propertyId)
}

/**
 * AI 없이 자동 판정 (OPENAI_API_KEY 미설정 시)
 *
 * 시스템 규칙만 통과한 상태에서:
 * - auto_approval ON → 자동 승인
 * - auto_approval OFF → pending 유지
 */
async function finalizeWithoutAi(propertyId: string) {
  const supabase = await createClient()

  const { data: property } = await supabase
    .from("properties")
    .select("status, inspection_result")
    .eq("id", propertyId)
    .single()

  if (!property || property.status === "rejected") return

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("auto_approval_enabled")
    .single()

  if (settings?.auto_approval_enabled) {
    const existingResult = (property.inspection_result as Record<string, unknown>) || {}
    await supabase
      .from("properties")
      .update({
        status: "approved",
        inspection_result: {
          ...existingResult,
          finalDecision: "approved",
          decidedAt: new Date().toISOString(),
          decidedBy: "system",
          autoApproved: true,
          note: "AI 검수 비활성화 상태에서 시스템 규칙 통과로 자동 승인",
        },
      })
      .eq("id", propertyId)
  }
}

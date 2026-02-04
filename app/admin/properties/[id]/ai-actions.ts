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

interface AiReviewResult {
  totalScore: number
  categories: {
    name: string
    score: number
    maxScore: number
    comment: string
  }[]
  summary: string
  inspectedAt: string
}

/**
 * AI 매물 검수 실행
 */
export async function runAiInspection(propertyId: string) {
  try {
    const openai = getOpenAIClient()
    if (!openai) {
      console.log("OPENAI_API_KEY가 설정되지 않아 AI 검수를 건너뜁니다.")
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

    // 2. images 배열 변환 (DB에서 문자열로 올 수 있음)
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

    // OpenAI API 호출을 위한 메시지 구성
    const imageMessages: OpenAI.Chat.Completions.ChatCompletionContentPart[] = imageArray
      .slice(0, 5) // 최대 5장
      .map((url: string) => ({
        type: "image_url" as const,
        image_url: { url, detail: "low" as const },
      }))

    const textInfo = `
[매물 정보]
- 숙소명: ${property.title || "없음"}
- 유형: ${property.property_type || "없음"}
- 주소: ${property.address || "없음"} ${property.detail_address || ""}
- 방 수: ${property.room_count || "없음"}
- 욕실 수: ${property.bathroom_count || "없음"}
- 최대 인원: ${property.max_guests || "없음"}
- 면적: ${property.area_sqm ? property.area_sqm + "㎡" : "없음"}
- 주간 가격: ${property.price_per_week ? property.price_per_week.toLocaleString() + "원" : "없음"}
- 월간 가격: ${property.monthly_price ? property.monthly_price.toLocaleString() + "원" : "없음"}
- 보증금: ${property.deposit ? property.deposit.toLocaleString() + "원" : "없음"}
- 관리비 포함: ${property.maintenance_included ? "예" : "아니오"}
- 최소 체류: ${property.min_stay || "없음"}
- 편의시설: ${(property.amenities || []).join(", ") || "없음"}
- 설명: ${property.description || "없음"}
- 등록 사진 수: ${imageArray.length}장
`.trim()

    const systemPrompt = `당신은 단기임대(STR) 매물 품질 검수 전문가입니다.
등록된 매물의 사진과 텍스트 정보를 분석하여 5개 항목으로 점수를 매겨주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "categories": [
    {"name": "청결도", "score": 0, "maxScore": 20, "comment": "사진에서 보이는 청결 상태 평가"},
    {"name": "시설 상태", "score": 0, "maxScore": 20, "comment": "가구/설비 상태 평가"},
    {"name": "사진 품질", "score": 0, "maxScore": 20, "comment": "사진 밝기/구도/선명도 평가"},
    {"name": "설명 완성도", "score": 0, "maxScore": 20, "comment": "텍스트 정보 충실도 평가"},
    {"name": "가격 적정성", "score": 0, "maxScore": 20, "comment": "유형/면적/위치 대비 가격 평가"}
  ],
  "summary": "종합 평가 코멘트 (2-3문장)"
}

점수 기준:
- 각 항목 0~20점 (총 100점 만점)
- 사진이 없으면 청결도/시설상태/사진품질은 각 5점 이하로 부여
- 한국어로 작성`

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

    // 3. OpenAI API 호출
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1000,
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { success: false, error: "AI 응답이 비어있습니다." }
    }

    // 4. JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: "AI 응답을 파싱할 수 없습니다." }
    }

    const aiResult = JSON.parse(jsonMatch[0])
    const totalScore = aiResult.categories.reduce(
      (sum: number, cat: { score: number }) => sum + cat.score,
      0
    )

    const reviewResult: AiReviewResult = {
      totalScore,
      categories: aiResult.categories,
      summary: aiResult.summary,
      inspectedAt: new Date().toISOString(),
    }

    // 5. DB 저장
    const { error: updateError } = await supabase
      .from("properties")
      .update({
        ai_review_score: totalScore,
        ai_review_result: reviewResult,
      })
      .eq("id", propertyId)

    if (updateError) {
      return { success: false, error: `결과 저장 실패: ${updateError.message}` }
    }

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

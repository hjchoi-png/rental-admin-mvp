"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Property } from "@/types/property"

// AI 위반 유형 → 호스트가 이해할 수 있는 한국어 가이드 매핑
const VIOLATION_GUIDE: Record<string, {
  title: string
  description: string
  actionGuide: string
  icon: "photo" | "text"
}> = {
  duplicate_photos: {
    title: "사진이 중복되었어요",
    description: "비슷한 사진이 많이 등록되어 있어요. 다양한 공간의 사진으로 교체해주세요.",
    actionGuide: "거실, 침실, 주방, 화장실 등 다양한 공간의 사진을 각각 등록해주세요.",
    icon: "photo",
  },
  no_interior_photos: {
    title: "실내 사진이 필요해요",
    description: "실내 사진이 확인되지 않았어요. 실제 매물 내부 사진을 등록해주세요.",
    actionGuide: "매물 내부의 각 공간을 촬영한 사진을 추가해주세요.",
    icon: "photo",
  },
  low_quality_photos: {
    title: "사진 품질을 개선해주세요",
    description: "일부 사진이 어둡거나 흐려요. 밝고 선명한 사진으로 교체해주세요.",
    actionGuide: "자연광이 들어오는 낮 시간에 촬영하면 더 좋은 결과를 얻을 수 있어요.",
    icon: "photo",
  },
  space_bias: {
    title: "다양한 공간 사진이 필요해요",
    description: "특정 공간의 사진만 등록되어 있어요. 모든 공간의 사진을 고르게 등록해주세요.",
    actionGuide: "침실, 거실, 주방, 화장실, 현관 등 모든 공간을 보여주세요.",
    icon: "photo",
  },
  irrelevant_photos: {
    title: "매물 관련 사진으로 교체해주세요",
    description: "매물과 무관한 사진이 포함되어 있어요.",
    actionGuide: "음식, 풍경, 인물 사진 등은 제외하고 실제 매물 사진만 등록해주세요.",
    icon: "photo",
  },
  text_policy_violation: {
    title: "매물 소개를 수정해주세요",
    description: "매물 소개에 수정이 필요한 표현이 있어요.",
    actionGuide: "외부 연락처, 직거래 유도, 숙박업 관련 표현은 삭제해주세요.",
    icon: "text",
  },
  misleading_info: {
    title: "정보를 확인해주세요",
    description: "실제와 다를 수 있는 표현이 감지되었어요.",
    actionGuide: "과장되거나 오해의 소지가 있는 표현이 있다면 정확한 내용으로 수정해주세요.",
    icon: "text",
  },
}

// 사진 아이콘 SVG
function PhotoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" className="fill-orange-500">
      <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.72,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm-80,120A44,44,0,1,1,172,132,44.05,44.05,0,0,1,128,176Z"/>
    </svg>
  )
}

// 텍스트 아이콘 SVG
function TextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" className="fill-orange-500">
      <path d="M208,56V88a8,8,0,0,1-16,0V64H136V192h24a8,8,0,0,1,0,16H96a8,8,0,0,1,0-16h24V64H64V88a8,8,0,0,1-16,0V56a8,8,0,0,1,8-8H200A8,8,0,0,1,208,56Z"/>
    </svg>
  )
}

interface SupplementFeedbackProps {
  property: Property
}

export default function SupplementFeedback({ property }: SupplementFeedbackProps) {
  const inspectionResult = property.inspection_result as Record<string, unknown> | null
  const aiInspection = inspectionResult?.aiInspection as Record<string, unknown> | undefined
  const violations = (aiInspection?.violations as Array<{
    type: string
    severity: string
    description: string
    confidence?: number
  }>) || []

  // major/minor만 표시 (critical이면 rejected 상태)
  const supplementViolations = violations.filter(
    (v) => v.severity === "major" || v.severity === "minor"
  )

  if (supplementViolations.length === 0 && !property.admin_comment) {
    return (
      <Card className="border-2 border-orange-200 bg-orange-50/50">
        <CardContent className="py-4">
          <p className="text-sm text-orange-700">
            보완이 필요한 항목이 있습니다. 매물 정보를 확인하고 수정해주세요.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" className="fill-orange-500">
            <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"/>
          </svg>
          보완이 필요해요
        </CardTitle>
        <p className="text-sm text-orange-600">
          아래 항목을 수정하시면 다시 검수를 진행합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {supplementViolations.map((violation, index) => {
          const guide = VIOLATION_GUIDE[violation.type] || {
            title: "수정이 필요한 항목",
            description: violation.description,
            actionGuide: "해당 항목을 확인하고 수정해주세요.",
            icon: "text" as const,
          }

          return (
            <div key={index} className="bg-white rounded-xl p-4 border border-orange-100">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {guide.icon === "photo" ? <PhotoIcon /> : <TextIcon />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{guide.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {guide.description}
                  </p>
                  <p className="text-xs text-primary mt-2 flex items-center gap-1">
                    → {guide.actionGuide}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* 어드민 코멘트 */}
        {property.admin_comment && (
          <div className="bg-white rounded-xl p-4 border border-orange-100 mt-2">
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{property.admin_comment}&rdquo;
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

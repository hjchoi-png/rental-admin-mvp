"use client"

import type { ViolationInfo } from "./page"

const VIOLATION_LABELS: Record<string, string> = {
  duplicate_photos: "중복 사진",
  no_interior_photos: "실내 사진 없음",
  low_quality_photos: "사진 품질",
  space_bias: "공간 편중",
  irrelevant_photos: "무관한 사진",
  text_policy_violation: "소개글 수정",
  misleading_info: "정보 확인",
  photo_contact_info: "사진 내 연락처",
}

interface SupplementBannerProps {
  violations: ViolationInfo[]
  onGoToStep: (step: number) => void
}

export default function SupplementBanner({ violations, onGoToStep }: SupplementBannerProps) {
  if (violations.length === 0) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
      <p className="text-sm font-semibold text-orange-700 mb-2">
        아래 항목을 수정해주세요
      </p>
      <div className="flex flex-wrap gap-2">
        {violations.map((v, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onGoToStep(v.relatedStep)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs font-medium hover:bg-orange-200 transition-colors"
          >
            {VIOLATION_LABELS[v.type] || v.type}
            <span className="text-orange-400">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}

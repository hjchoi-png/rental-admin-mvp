"use client"

import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Camera,
  FileText,
  Shield,
  Clock,
} from "lucide-react"

// ============================================================
// Types
// ============================================================

interface SystemRuleViolation {
  rule: string
  category: string
  severity: "critical" | "major" | "minor"
  field?: string
  message: string
  matchedWords?: string[]
}

interface AiViolation {
  type: string
  severity: "critical" | "major" | "minor"
  confidence: number
  description: string
  details?: string
}

interface ImageAnalysis {
  totalPhotos: number
  hasInteriorPhotos: boolean
  estimatedUniquePhotos: number
  hasExteriorPhotos: boolean
  photoQualityAvg: "good" | "fair" | "poor"
}

interface InspectionResult {
  systemRules?: {
    passed: boolean
    violations: SystemRuleViolation[]
    decision: string
    rejectReason?: string
  }
  aiInspection?: {
    violations: AiViolation[]
    imageAnalysis: ImageAnalysis
    recommendedDecision: string
    summary: string
    inspectedAt: string
    totalScore: number
    categories: {
      name: string
      score: number
      maxScore: number
      comment: string
    }[]
  }
  finalDecision?: string
  decidedAt?: string
  decidedBy?: string
  autoApproved?: boolean
  note?: string
}

interface InspectionDetailsProps {
  inspectionResult: InspectionResult | null
  ruleViolations: string[] | null
  aiViolations: string[] | null
  aiReviewScore: number | null
  status: string
}

// ============================================================
// Severity helpers
// ============================================================

const severityConfig = {
  critical: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
    label: "심각",
  },
  major: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertTriangle,
    label: "주요",
  },
  minor: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertCircle,
    label: "경미",
  },
}

const categoryLabels: Record<string, string> = {
  accommodation_fraud: "숙박업 오인",
  external_contact: "외부 연락 유도",
  direct_transaction: "직거래 유도",
  contact_pattern: "연락처 패턴",
  duplicate_address: "주소 중복",
  managed_host: "관리대상 호스트",
  photo_contact_info: "사진 내 연락처",
  duplicate_photos: "중복 사진",
  no_interior_photos: "실내사진 없음",
  irrelevant_photos: "무관 사진",
  low_quality_photos: "사진 품질",
  space_bias: "공간 편중",
  text_policy_violation: "텍스트 위반",
  misleading_info: "오해 소지",
}

const decisionConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  approved: { label: "자동 승인", color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle2 },
  rejected: { label: "자동 반려", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle },
  supplement: { label: "보완 필요", color: "text-orange-700 bg-orange-50 border-orange-200", icon: AlertTriangle },
  pending: { label: "수동 검토 대기", color: "text-blue-700 bg-blue-50 border-blue-200", icon: Clock },
  pending_ai: { label: "AI 검수 대기", color: "text-blue-700 bg-blue-50 border-blue-200", icon: Clock },
}

// ============================================================
// Component
// ============================================================

export default function InspectionDetails({
  inspectionResult,
  ruleViolations,
  aiViolations,
  aiReviewScore,
  status,
}: InspectionDetailsProps) {
  // 검수 결과가 아예 없는 경우
  if (!inspectionResult && !ruleViolations?.length && !aiViolations?.length && aiReviewScore == null) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="h-5 w-5" />
          <span className="font-medium">검수 대기 중</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">아직 검수가 진행되지 않았습니다.</p>
      </div>
    )
  }

  const result = inspectionResult || ({} as InspectionResult)
  const systemRules = result.systemRules
  const aiInspection = result.aiInspection
  const finalDecision = result.finalDecision || status
  const decision = decisionConfig[finalDecision] || decisionConfig.pending

  return (
    <div className="space-y-4">
      {/* 종합 판정 헤더 */}
      <div className={`p-4 rounded-lg border ${decision.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <decision.icon className="h-5 w-5" />
            <span className="font-semibold text-lg">{decision.label}</span>
            {result.autoApproved && (
              <Badge variant="outline" className="text-xs">자동</Badge>
            )}
          </div>
          {aiReviewScore != null && (
            <div className="text-right">
              <span className="text-sm opacity-70">AI 점수</span>
              <span className="text-2xl font-bold ml-2">{aiReviewScore}</span>
              <span className="text-sm opacity-70">/100</span>
            </div>
          )}
        </div>
        {result.decidedBy && result.decidedAt && (
          <p className="text-xs mt-2 opacity-60">
            {result.decidedBy === "system" ? "시스템 자동 판정" : "수동 검토 대기"} ·{" "}
            {new Date(result.decidedAt).toLocaleString("ko-KR")}
          </p>
        )}
      </div>

      {/* 시스템 규칙 결과 */}
      {(systemRules || (ruleViolations && ruleViolations.length > 0)) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <h4 className="font-semibold text-sm">시스템 규칙 검수</h4>
            {systemRules?.passed ? (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">통과</Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-red-600 border-red-300">위반 발견</Badge>
            )}
          </div>

          {systemRules?.violations && systemRules.violations.length > 0 ? (
            <div className="space-y-1.5">
              {systemRules.violations.map((v, i) => {
                const config = severityConfig[v.severity]
                const Icon = config.icon
                return (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-md text-sm border ${config.color}`}>
                    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        <span className="font-medium">{categoryLabels[v.category] || v.category}</span>
                      </div>
                      <p className="mt-0.5">{v.message}</p>
                      {v.field && <p className="text-xs opacity-70 mt-0.5">필드: {v.field}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : ruleViolations && ruleViolations.length > 0 ? (
            <div className="space-y-1">
              {ruleViolations.map((v, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md text-sm bg-red-50 border border-red-200 text-red-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{v}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* AI 검수 결과 */}
      {(aiInspection || (aiViolations && aiViolations.length > 0)) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-600" />
            <h4 className="font-semibold text-sm">AI 정책 검수</h4>
            {aiInspection && (
              <Badge variant="outline" className="text-xs">
                {aiInspection.recommendedDecision === "approve" ? "승인 권고" :
                 aiInspection.recommendedDecision === "supplement" ? "보완 권고" :
                 "반려 권고"}
              </Badge>
            )}
          </div>

          {/* AI 위반 목록 */}
          {aiInspection?.violations && aiInspection.violations.length > 0 ? (
            <div className="space-y-1.5">
              {aiInspection.violations.map((v, i) => {
                const config = severityConfig[v.severity]
                const Icon = config.icon
                return (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-md text-sm border ${config.color}`}>
                    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        <span className="font-medium">{categoryLabels[v.type] || v.type}</span>
                        <span className="text-xs opacity-50">확신도 {v.confidence}%</span>
                      </div>
                      <p className="mt-0.5">{v.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : aiViolations && aiViolations.length > 0 ? (
            <div className="space-y-1">
              {aiViolations.map((v, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md text-sm bg-orange-50 border border-orange-200 text-orange-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-600 pl-6">위반 사항 없음</p>
          )}

          {/* 이미지 분석 요약 */}
          {aiInspection?.imageAnalysis && (
            <div className="bg-gray-50 rounded-md p-3 border">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-700">이미지 분석</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2 rounded border text-center">
                  <p className="text-gray-500">전체</p>
                  <p className="font-bold text-lg">{aiInspection.imageAnalysis.totalPhotos}</p>
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <p className="text-gray-500">고유 사진</p>
                  <p className="font-bold text-lg">{aiInspection.imageAnalysis.estimatedUniquePhotos}</p>
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <p className="text-gray-500">실내사진</p>
                  <p className={`font-bold text-lg ${aiInspection.imageAnalysis.hasInteriorPhotos ? "text-green-600" : "text-red-600"}`}>
                    {aiInspection.imageAnalysis.hasInteriorPhotos ? "있음" : "없음"}
                  </p>
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <p className="text-gray-500">품질</p>
                  <p className={`font-bold text-lg ${
                    aiInspection.imageAnalysis.photoQualityAvg === "good" ? "text-green-600" :
                    aiInspection.imageAnalysis.photoQualityAvg === "fair" ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {aiInspection.imageAnalysis.photoQualityAvg === "good" ? "양호" :
                     aiInspection.imageAnalysis.photoQualityAvg === "fair" ? "보통" : "저하"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 품질 점수 (호환성) */}
          {aiInspection?.categories && (
            <div className="space-y-1.5">
              {aiInspection.categories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-16 text-gray-600">{cat.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`rounded-full h-1.5 ${
                        cat.score / cat.maxScore >= 0.7 ? "bg-green-500" :
                        cat.score / cat.maxScore >= 0.4 ? "bg-yellow-500" :
                        "bg-red-500"
                      }`}
                      style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-right text-gray-500">{cat.score}/{cat.maxScore}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI 종합 의견 */}
          {aiInspection?.summary && (
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border italic">
              {aiInspection.summary}
            </p>
          )}

          {aiInspection?.inspectedAt && (
            <p className="text-xs text-gray-400">
              AI 검수 시각: {new Date(aiInspection.inspectedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

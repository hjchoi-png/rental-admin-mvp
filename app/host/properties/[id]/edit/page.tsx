import { notFound, redirect } from "next/navigation"
import { getHostProperty } from "@/app/host/actions"
import { dbColumnsToFormData } from "@/lib/property-mapper"
import EditFormClient from "./edit-form-client"

// 위반 유형 → 관련 스텝 매핑
const VIOLATION_STEP_MAP: Record<string, number> = {
  duplicate_photos: 2,
  no_interior_photos: 2,
  low_quality_photos: 2,
  space_bias: 2,
  irrelevant_photos: 2,
  text_policy_violation: 2,
  misleading_info: 2,
  photo_contact_info: 2,
}

export interface ViolationInfo {
  type: string
  severity: string
  description: string
  relatedStep: number
}

function extractViolations(inspectionResult: Record<string, unknown> | null | undefined): ViolationInfo[] {
  if (!inspectionResult) return []

  const aiInspection = inspectionResult.aiInspection as Record<string, unknown> | undefined
  const violations = (aiInspection?.violations as Array<{
    type: string
    severity: string
    description: string
  }>) || []

  return violations
    .filter((v) => v.severity === "major" || v.severity === "minor")
    .map((v) => ({
      type: v.type,
      severity: v.severity,
      description: v.description,
      relatedStep: VIOLATION_STEP_MAP[v.type] ?? 2,
    }))
}

export default async function HostPropertyEditPage({
  params,
}: {
  params: { id: string }
}) {
  const result = await getHostProperty(params.id)

  if (!result.success) {
    if (result.error === "로그인이 필요합니다.") redirect("/")
    notFound()
  }

  // supplement 상태만 수정 가능
  if (result.data.status !== "supplement") {
    redirect(`/host/properties/${params.id}`)
  }

  const defaultValues = dbColumnsToFormData(result.data)
  const violations = extractViolations(result.data.inspection_result)

  return (
    <EditFormClient
      propertyId={params.id}
      defaultValues={defaultValues}
      violations={violations}
    />
  )
}

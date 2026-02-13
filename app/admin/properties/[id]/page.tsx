import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PropertyActions from "./property-actions"
import PropertyImages from "./property-images"
import InspectionDetails from "./inspection-details"

type Property = {
  id: string
  title: string
  host_id: string | null
  price_per_week: number
  monthly_price: number | null
  description: string
  address: string
  detail_address: string | null
  address_detail: string | null
  property_type: string | null
  room_count: number | null
  bathroom_count: number | null
  max_guests: number | null
  area_sqm: number | null
  maintenance_included: boolean
  deposit: number | null
  available_date: string | null
  min_stay: string | null
  amenities: string[]
  images: string[]
  status: "pending" | "approved" | "rejected" | "supplement"
  admin_comment?: string | null
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  ai_review_score?: number | null
  ai_review_result?: Record<string, unknown> | null
  inspection_result?: Record<string, unknown> | null
  inspection_rule_violations?: string[] | null
  inspection_ai_violations?: string[] | null
  created_at: string
  updated_at: string
  // v2 fields
  dong?: string | null
  ho?: string | null
  building_type?: string | null
  short_title?: string | null
  total_floors?: number | null
  floor_number?: number | null
  floor_type?: string | null
  kitchen_count?: number | null
  living_room_count?: number | null
  area_pyeong?: number | null
  has_elevator?: boolean | null
  parking?: string | null
  parking_type?: string | null
  parking_count?: number | null
  parking_condition?: string | null
  pet_allowed?: boolean | null
  location_transport?: string | null
  usage_guide?: string | null
  host_message?: string | null
  long_term_discounts?: { weeks: number; discountPct: number }[] | null
  instant_move_discounts?: { days: number; amount: number }[] | null
  maintenance_fee?: number | null
  maintenance_electric?: boolean | null
  maintenance_water?: boolean | null
  maintenance_gas?: boolean | null
  maintenance_detail?: string | null
  cleaning_free?: boolean | null
  checkout_cleaning_fee?: number | null
  pet_cleaning_fee?: number | null
  cancellation_policy?: string | null
  min_stay_weeks?: number | null
  max_stay_weeks?: number | null
  day_extension?: number | null
  checkin_time?: string | null
  checkin_method?: string | null
  checkout_time?: string | null
  checkout_method?: string | null
}

async function getProperty(id: string): Promise<Property | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null
  return data as Property
}

export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const property = await getProperty(params.id)
  if (!property) notFound()

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    approved: "default",
    pending: "secondary",
    rejected: "destructive",
    supplement: "outline",
  }
  const statusLabels: Record<string, string> = {
    approved: "승인됨",
    pending: "검토 대기",
    rejected: "반려됨",
    supplement: "보완 필요",
  }

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
    if (!value) return null
    return (
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Link href="/admin/properties">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">매물 상세 검토</h1>
          </div>
        </div>

        {/* 2컬럼 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: 이미지 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">매물 이미지</h2>
            <PropertyImages images={property.images || []} />
          </div>

          {/* 오른쪽: 정보 */}
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{property.title}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariants[property.status]}>
                    {statusLabels[property.status]}
                  </Badge>
                  {property.property_type && (
                    <Badge variant="outline">{property.property_type}</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {/* 가격 정보 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">주간 가격</p>
                    <p className="text-2xl font-bold">{property.price_per_week?.toLocaleString()}원</p>
                  </div>
                  {property.monthly_price && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">월간 가격</p>
                      <p className="text-2xl font-bold">{property.monthly_price.toLocaleString()}원</p>
                    </div>
                  )}
                </div>

                {property.deposit != null && property.deposit > 0 && (
                  <InfoRow label="보증금" value={`${property.deposit.toLocaleString()}원`} />
                )}
                <InfoRow
                  label="관리비"
                  value={property.maintenance_included ? "포함" : "별도"}
                />

                {/* 매물 스펙 */}
                <div className="grid grid-cols-3 gap-4 py-3 border-y">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">방</p>
                    <p className="text-lg font-bold">{property.room_count ?? "-"}개</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">화장실</p>
                    <p className="text-lg font-bold">{property.bathroom_count ?? "-"}개</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">최대 인원</p>
                    <p className="text-lg font-bold">{property.max_guests ?? "-"}명</p>
                  </div>
                </div>

                {property.area_sqm && (
                  <InfoRow label="전용면적" value={`${property.area_sqm}m²`} />
                )}

                <InfoRow
                  label="주소"
                  value={`${property.address}${property.detail_address ? ` ${property.detail_address}` : ""}`}
                />

                {property.available_date && (
                  <InfoRow label="입주 가능일" value={property.available_date} />
                )}
                {property.min_stay && (
                  <InfoRow label="최소 계약 기간" value={property.min_stay} />
                )}

                {/* 어메니티 */}
                {property.amenities && property.amenities.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">어메니티</p>
                    <div className="flex flex-wrap gap-1">
                      {property.amenities.map((a) => (
                        <Badge key={a} variant="outline">{a}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 호스트 정보 */}
                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-muted-foreground mb-2">호스트 정보</p>
                  {property.guest_name ? (
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">이름:</span> {property.guest_name}</p>
                      <p><span className="text-muted-foreground">이메일:</span> {property.guest_email}</p>
                      <p><span className="text-muted-foreground">연락처:</span> {property.guest_phone}</p>
                    </div>
                  ) : (
                    <p className="text-sm font-mono">{property.host_id}</p>
                  )}
                </div>

                <InfoRow
                  label="등록일"
                  value={new Date(property.created_at).toLocaleString("ko-KR")}
                />

                {property.admin_comment && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">반려 사유</p>
                    <p className="text-base text-destructive">{property.admin_comment}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 상세 설명 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">상세 설명</h3>
              <p className="text-base whitespace-pre-wrap">{property.description}</p>
            </div>

            {/* v2 추가 정보 */}
            {property.location_transport && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">위치 및 교통</h3>
                <p className="text-base whitespace-pre-wrap">{property.location_transport}</p>
              </div>
            )}
            {property.usage_guide && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">이용 안내</h3>
                <p className="text-base whitespace-pre-wrap">{property.usage_guide}</p>
              </div>
            )}
            {property.host_message && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">호스트 메시지</h3>
                <p className="text-base whitespace-pre-wrap">{property.host_message}</p>
              </div>
            )}

            {/* 건물 상세 */}
            {(property.building_type || property.has_elevator != null || property.parking) && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">건물 정보</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="건물 유형" value={property.building_type} />
                  <InfoRow label="층수" value={property.floor_number != null ? `${property.floor_type || ""}${property.floor_number}층 / ${property.total_floors}층` : null} />
                  <InfoRow label="주방" value={property.kitchen_count ? `${property.kitchen_count}개` : null} />
                  <InfoRow label="거실" value={property.living_room_count ? `${property.living_room_count}개` : null} />
                  <InfoRow label="엘리베이터" value={property.has_elevator != null ? (property.has_elevator ? "있음" : "없음") : null} />
                  <InfoRow label="주차" value={property.parking !== "불가능" ? `${property.parking}${property.parking_type ? ` (${property.parking_type})` : ""}${property.parking_count ? ` ${property.parking_count}대` : ""}` : property.parking} />
                  <InfoRow label="반려동물" value={property.pet_allowed != null ? (property.pet_allowed ? "허용" : "불가") : null} />
                </div>
              </div>
            )}

            {/* 요금 상세 */}
            {(property.maintenance_fee != null || property.cancellation_policy) && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">요금 상세</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="관리비" value={property.maintenance_fee ? `${property.maintenance_fee.toLocaleString()}원` : "없음"} />
                  <InfoRow label="퇴실 청소비" value={property.checkout_cleaning_fee ? `${property.checkout_cleaning_fee.toLocaleString()}원` : null} />
                  <InfoRow label="반려동물 청소비" value={property.pet_cleaning_fee ? `${property.pet_cleaning_fee.toLocaleString()}원` : null} />
                  <InfoRow label="위약금 규정" value={property.cancellation_policy} />
                </div>
                {property.maintenance_detail && (
                  <InfoRow label="관리비 상세" value={property.maintenance_detail} />
                )}
                {property.long_term_discounts && property.long_term_discounts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">장기 할인</p>
                    <div className="flex flex-wrap gap-1">
                      {property.long_term_discounts.map((d, i) => (
                        <Badge key={i} variant="outline">{d.weeks}주 이상 {d.discountPct}% 할인</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 입퇴실 정보 */}
            {(property.checkin_time || property.checkout_time) && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">입실/퇴실</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="입실" value={`${property.checkin_time || "15:00"} (${property.checkin_method || "비대면"})`} />
                  <InfoRow label="퇴실" value={`${property.checkout_time || "11:00"} (${property.checkout_method || "비대면"})`} />
                  <InfoRow label="최소 계약" value={property.min_stay_weeks ? `${property.min_stay_weeks}주` : null} />
                  <InfoRow label="일단위 연장" value={property.day_extension ? `${property.day_extension}일` : null} />
                </div>
              </div>
            )}

            {/* 자동 검수 결과 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">자동 검수 결과</h3>
              <InspectionDetails
                inspectionResult={property.inspection_result as Record<string, unknown> | null}
                ruleViolations={property.inspection_rule_violations || null}
                aiViolations={property.inspection_ai_violations || null}
                aiReviewScore={property.ai_review_score ?? null}
                status={property.status}
              />
            </div>

            {/* 검토 액션 */}
            <div className="pt-4 border-t">
              <PropertyActions
                propertyId={property.id}
                currentStatus={property.status}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

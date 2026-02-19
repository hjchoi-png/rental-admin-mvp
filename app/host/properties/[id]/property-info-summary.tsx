"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Property } from "@/types/property"

interface PropertyInfoSummaryProps {
  property: Property
}

export default function PropertyInfoSummary({ property }: PropertyInfoSummaryProps) {
  return (
    <div className="space-y-4">
      {/* 기본 정보 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="주소" value={property.address} />
          {(property.dong || property.ho) && (
            <InfoRow
              label="동/호"
              value={`${property.dong || "-"} / ${property.ho || "-"}`}
            />
          )}
          <InfoRow label="건물 유형" value={property.building_type || property.property_type || "-"} />
          <InfoRow label="방/화장실/주방" value={`${property.room_count || 0}개 / ${property.bathroom_count || 0}개 / ${property.kitchen_count || 0}개`} />
          {property.area_sqm && (
            <InfoRow label="면적" value={`${property.area_sqm}㎡${property.area_pyeong ? ` (${property.area_pyeong}평)` : ""}`} />
          )}
          <InfoRow label="주차" value={property.parking || "불가능"} />
        </CardContent>
      </Card>

      {/* 요금 정보 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">요금</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="주당 요금" value={`${property.price_per_week?.toLocaleString() || 0}원`} />
          <InfoRow label="보증금" value={`${property.deposit?.toLocaleString() || 300000}원`} />
          {(property.maintenance_fee ?? 0) > 0 && (
            <InfoRow label="관리비" value={`${property.maintenance_fee?.toLocaleString()}원/월`} />
          )}
          {(property.checkout_cleaning_fee ?? 0) > 0 && (
            <InfoRow label="퇴실 청소비" value={`${property.checkout_cleaning_fee?.toLocaleString()}원`} />
          )}
        </CardContent>
      </Card>

      {/* 매물 소개 */}
      {property.description && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">매물 소개</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {property.description}
            </p>
            {property.location_transport && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">교통/주변정보</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {property.location_transport}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 옵션 */}
      {property.amenities && property.amenities.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">옵션</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 예약/입퇴실 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">예약 조건</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="최소 숙박" value={`${property.min_stay_weeks || 1}주`} />
          <InfoRow label="최대 숙박" value={`${property.max_stay_weeks || 12}주`} />
          <InfoRow label="입실 시간" value={property.checkin_time || "15:00"} />
          <InfoRow label="퇴실 시간" value={property.checkout_time || "11:00"} />
          <InfoRow label="입실 방식" value={property.checkin_method || "비대면"} />
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

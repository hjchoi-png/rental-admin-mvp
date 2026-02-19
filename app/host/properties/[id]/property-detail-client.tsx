"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { STATUS_LABELS, STATUS_VARIANTS } from "@/types/property"
import type { Property, PropertyStatus } from "@/types/property"
import SupplementFeedback from "./supplement-feedback"
import PropertyInfoSummary from "./property-info-summary"

const STATUS_COLORS: Record<PropertyStatus, string> = {
  pending: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  supplement: "bg-orange-100 text-orange-700",
}

interface PropertyDetailClientProps {
  property: Property
}

export default function PropertyDetailClient({ property }: PropertyDetailClientProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const images = property.images || []

  return (
    <div className="space-y-6 pb-8">
      {/* 뒤로가기 */}
      <Link
        href="/host/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← 내 매물 목록
      </Link>

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold">
          {property.short_title || property.title}
        </h1>
        <Badge
          variant={STATUS_VARIANTS[property.status]}
          className={`flex-shrink-0 ${STATUS_COLORS[property.status]}`}
        >
          {STATUS_LABELS[property.status]}
        </Badge>
      </div>

      {/* 이미지 캐러셀 */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
            <Image
              src={images[currentImage]}
              alt={`매물 사진 ${currentImage + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
            />
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                {currentImage + 1} / {images.length}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {images.slice(0, 8).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden ${
                    currentImage === i ? "ring-2 ring-primary" : "opacity-60"
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </button>
              ))}
              {images.length > 8 && (
                <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  +{images.length - 8}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 상태별 안내 메시지 */}
      {property.status === "pending" && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <p className="text-sm text-blue-700 font-medium">
              검수가 진행 중입니다. 잠시만 기다려주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {property.status === "approved" && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4">
            <p className="text-sm text-green-700 font-medium">
              매물이 승인되어 게스트에게 노출되고 있습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {property.status === "rejected" && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-4 space-y-2">
            <p className="text-sm text-red-700 font-medium">
              매물이 반려되었습니다.
            </p>
            {property.admin_comment && (
              <p className="text-sm text-red-600">
                사유: {property.admin_comment}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 보완 피드백 (핵심) */}
      {property.status === "supplement" && (
        <>
          <SupplementFeedback property={property} />
          <Link href={`/host/properties/${property.id}/edit`}>
            <Button className="w-full h-14 rounded-xl text-base font-semibold">
              수정하고 다시 제출하기
            </Button>
          </Link>
        </>
      )}

      {/* 매물 상세 정보 */}
      <PropertyInfoSummary property={property} />
    </div>
  )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import type { Property, PropertyStatus } from "@/types/property"
import { STATUS_LABELS, STATUS_VARIANTS } from "@/types/property"

const STATUS_COLORS: Record<PropertyStatus, string> = {
  pending: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  approved: "bg-green-100 text-green-700 hover:bg-green-100",
  rejected: "bg-red-100 text-red-700 hover:bg-red-100",
  supplement: "bg-orange-100 text-orange-700 hover:bg-orange-100",
}

interface PropertyListProps {
  properties: Property[]
}

export default function PropertyList({ properties }: PropertyListProps) {
  return (
    <div className="space-y-3">
      {properties.map((property) => (
        <Link
          key={property.id}
          href={`/host/properties/${property.id}`}
          className="block"
        >
          <div className="flex gap-4 p-4 rounded-xl bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            {/* 대표 이미지 */}
            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
              {property.images?.[0] ? (
                <Image
                  src={property.images[0]}
                  alt={property.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  사진 없음
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm truncate">
                  {property.short_title || property.title}
                </h3>
                <Badge
                  variant={STATUS_VARIANTS[property.status]}
                  className={`flex-shrink-0 text-[11px] ${STATUS_COLORS[property.status]}`}
                >
                  {STATUS_LABELS[property.status]}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-1 truncate">
                {property.address}
              </p>

              <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-semibold text-primary">
                  {property.price_per_week?.toLocaleString()}원
                  <span className="text-xs font-normal text-muted-foreground">/주</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(property.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>

              {/* 보완 필요 안내 */}
              {property.status === "supplement" && (
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  보완이 필요한 항목이 있어요 →
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

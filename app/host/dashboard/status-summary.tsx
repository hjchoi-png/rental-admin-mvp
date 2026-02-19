"use client"

import type { Property, PropertyStatus } from "@/types/property"

const STATUS_CONFIG: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "검토 대기", color: "text-blue-600", bg: "bg-blue-50" },
  approved: { label: "승인됨", color: "text-green-600", bg: "bg-green-50" },
  rejected: { label: "반려됨", color: "text-red-600", bg: "bg-red-50" },
  supplement: { label: "보완 필요", color: "text-orange-600", bg: "bg-orange-50" },
}

interface StatusSummaryProps {
  properties: Property[]
}

export default function StatusSummary({ properties }: StatusSummaryProps) {
  const counts = properties.reduce<Record<PropertyStatus, number>>(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    },
    { pending: 0, approved: 0, rejected: 0, supplement: 0 }
  )

  return (
    <div className="grid grid-cols-2 gap-3">
      {(Object.entries(STATUS_CONFIG) as [PropertyStatus, typeof STATUS_CONFIG[PropertyStatus]][]).map(
        ([status, config]) => (
          <div
            key={status}
            className={`${config.bg} rounded-xl p-4 ${
              status === "supplement" && counts[status] > 0
                ? "ring-2 ring-orange-300"
                : ""
            }`}
          >
            <p className="text-xs text-muted-foreground">{config.label}</p>
            <p className={`text-2xl font-bold ${config.color}`}>
              {counts[status]}
            </p>
          </div>
        )
      )}
    </div>
  )
}

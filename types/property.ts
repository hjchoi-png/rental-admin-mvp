/**
 * 매물(Property) 관련 공통 타입 정의
 *
 * DB 스키마와 1:1 매핑되는 단일 소스 타입.
 * 모든 페이지/컴포넌트에서 이 타입을 import하여 사용한다.
 */

// ============================================================
// 매물 상태
// ============================================================

export type PropertyStatus = "pending" | "approved" | "rejected" | "supplement"

// ============================================================
// 매물 전체 타입 (DB properties 테이블)
// ============================================================

export interface Property {
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
  status: PropertyStatus
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

  // v2 상세 필드
  dong?: string | null
  ho?: string | null
  dong_none?: boolean | null
  building_type?: string | null
  short_title?: string | null
  total_floors?: number | null
  floor_number?: number | null
  floor_type?: string | null
  kitchen_count?: number | null
  living_room_count?: number | null
  area_pyeong?: number | null
  area_unit?: string | null
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
  cancellation_agreed?: boolean | null
  min_stay_weeks?: number | null
  max_stay_weeks?: number | null
  blocked_dates?: string[] | null
  day_extension?: number | null
  checkin_time?: string | null
  checkin_method?: string | null
  checkout_time?: string | null
  checkout_method?: string | null
}

// ============================================================
// 목록용 경량 타입 (select 최적화용)
// ============================================================

export type PropertyListItem = Pick<
  Property,
  | "id"
  | "title"
  | "host_id"
  | "price_per_week"
  | "monthly_price"
  | "property_type"
  | "room_count"
  | "max_guests"
  | "address"
  | "created_at"
  | "status"
  | "admin_comment"
  | "guest_name"
  | "guest_email"
  | "guest_phone"
  | "ai_review_score"
>

// ============================================================
// 상태 표시 헬퍼
// ============================================================

export const STATUS_VARIANTS: Record<PropertyStatus, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
  supplement: "outline",
}

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  approved: "승인됨",
  pending: "검토 대기",
  rejected: "반려됨",
  supplement: "보완 필요",
}

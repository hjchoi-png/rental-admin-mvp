'use server'

import { createClient } from "@/utils/supabase/server"
import { z } from "zod"
import { runAiInspection } from "@/app/admin/properties/[id]/ai-actions"

// v2 입력 데이터 검증 규칙 (6단계 폼)
const propertySchema = z.object({
  // 호스트 정보 (비회원)
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional(),

  // Step 1: 위치 및 구조
  address: z.string().min(1),
  dong: z.string().optional(),
  ho: z.string().optional(),
  dongNone: z.boolean().optional(),
  totalFloors: z.number().optional(),
  floorNumber: z.number().optional(),
  floorType: z.string().optional(),
  buildingType: z.string().min(1),
  roomCount: z.number().min(1),
  bathroomCount: z.number().min(0).default(0),
  kitchenCount: z.number().min(0).default(0),
  livingRoomCount: z.number().min(0).default(0),
  areaSqm: z.number().optional(),
  areaPyeong: z.number().optional(),
  areaUnit: z.string().optional(),
  hasElevator: z.boolean().optional(),
  parking: z.string().optional(),
  parkingType: z.string().optional(),
  parkingCount: z.number().optional(),
  parkingCondition: z.string().optional(),

  // Step 2: 옵션
  amenities: z.array(z.string()).optional(),
  petAllowed: z.boolean().optional(),

  // Step 3: 상세 정보
  shortTitle: z.string().min(1),
  images: z.array(z.string()).optional(),
  description: z.string().min(1),
  locationTransport: z.string().optional(),
  usageGuide: z.string().optional(),
  hostMessage: z.string().optional(),

  // Step 4: 요금 설정
  weeklyPrice: z.number().min(1),
  deposit: z.number().optional(),
  longTermDiscounts: z.array(z.object({ weeks: z.number(), discountPct: z.number() })).optional(),
  instantMoveDiscounts: z.array(z.object({ days: z.number(), amount: z.number() })).optional(),
  maintenanceFee: z.number().optional(),
  maintenanceElectric: z.boolean().optional(),
  maintenanceWater: z.boolean().optional(),
  maintenanceGas: z.boolean().optional(),
  maintenanceDetail: z.string().optional(),
  cleaningFree: z.boolean().optional(),
  checkoutCleaningFee: z.number().optional(),
  petCleaningFee: z.number().optional(),
  cancellationPolicy: z.string().optional(),
  cancellationAgreed: z.boolean().optional(),

  // Step 5: 예약 설정
  minStayWeeks: z.number().optional(),
  maxStayWeeks: z.number().optional(),
  dayExtension: z.number().optional(),
  blockedDates: z.array(z.string()).optional(),

  // Step 6: 입실/퇴실
  checkinTime: z.string().optional(),
  checkinMethod: z.string().optional(),
  checkoutTime: z.string().optional(),
  checkoutMethod: z.string().optional(),
})

export type CreatePropertyInput = z.infer<typeof propertySchema>

export async function createProperty(formData: CreatePropertyInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const parsed = propertySchema.safeParse(formData)
  if (!parsed.success) {
    return { error: '입력 데이터가 올바르지 않습니다.' }
  }

  const d = parsed.data

  const addressDetail = `${d.dong || ""}${d.dong ? " " : ""}${d.ho || ""}`.trim()

  const propertyData: Record<string, unknown> = {
    // 기존 필드
    title: d.shortTitle,
    address: d.address,
    detail_address: addressDetail || null,
    address_detail: addressDetail || null,
    property_type: d.buildingType,
    room_count: d.roomCount,
    bathroom_count: d.bathroomCount,
    max_guests: d.roomCount * 2,
    area_sqm: d.areaSqm || null,
    price_per_week: d.weeklyPrice,
    monthly_price: d.weeklyPrice * 4,
    maintenance_included: (d.maintenanceFee || 0) === 0,
    deposit: d.deposit || 300000,
    description: d.description,
    min_stay: d.minStayWeeks ? `${d.minStayWeeks}주` : "1주",
    amenities: d.amenities || [],
    images: d.images || [],
    status: 'pending',

    // 신규 v2 필드
    dong: d.dong || null,
    ho: d.ho || null,
    dong_none: d.dongNone || false,
    total_floors: d.totalFloors || null,
    floor_number: d.floorNumber || null,
    floor_type: d.floorType || null,
    building_type: d.buildingType,
    kitchen_count: d.kitchenCount || 0,
    living_room_count: d.livingRoomCount || 0,
    area_pyeong: d.areaPyeong || null,
    area_unit: d.areaUnit || "㎡",
    has_elevator: d.hasElevator ?? null,
    parking: d.parking || "불가능",
    parking_type: d.parkingType || null,
    parking_count: d.parkingCount || 0,
    parking_condition: d.parkingCondition || null,

    pet_allowed: d.petAllowed ?? null,

    short_title: d.shortTitle,
    location_transport: d.locationTransport || null,
    usage_guide: d.usageGuide || null,
    host_message: d.hostMessage || null,

    long_term_discounts: d.longTermDiscounts || [],
    instant_move_discounts: d.instantMoveDiscounts || [],
    maintenance_fee: d.maintenanceFee || 0,
    maintenance_electric: d.maintenanceElectric || false,
    maintenance_water: d.maintenanceWater || false,
    maintenance_gas: d.maintenanceGas || false,
    maintenance_detail: d.maintenanceDetail || null,
    cleaning_free: d.cleaningFree || false,
    checkout_cleaning_fee: d.checkoutCleaningFee || 0,
    pet_cleaning_fee: d.petCleaningFee || 0,
    cancellation_policy: d.cancellationPolicy || null,
    cancellation_agreed: d.cancellationAgreed || false,

    min_stay_weeks: d.minStayWeeks || 1,
    max_stay_weeks: d.maxStayWeeks || 12,
    day_extension: d.dayExtension || 0,
    blocked_dates: d.blockedDates || [],

    checkin_time: d.checkinTime || "15:00",
    checkin_method: d.checkinMethod || "비대면",
    checkout_time: d.checkoutTime || "11:00",
    checkout_method: d.checkoutMethod || "비대면",

    host_id: user ? user.id : null,
    guest_name: user ? null : d.guestName || null,
    guest_email: user ? null : d.guestEmail || null,
    guest_phone: user ? null : d.guestPhone || null,
  }

  const { data, error } = await supabase
    .from('properties')
    .insert(propertyData)
    .select()
    .single()

  if (error) {
    console.error('Error creating property:', error)
    return { error: '매물 등록 실패: ' + error.message }
  }

  // AI 자동 검수
  try {
    await runAiInspection(data.id)
  } catch (aiError) {
    console.error('AI 자동 검수 실패 (등록은 정상 완료):', aiError)
  }

  return { success: true, propertyId: data.id }
}

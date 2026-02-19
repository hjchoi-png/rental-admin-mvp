import type { CreatePropertyInput } from "@/app/actions/property"
import type { Property } from "@/types/property"

/**
 * 폼 데이터 → DB 컬럼 매핑
 * createProperty, updatePropertyAndResubmit 에서 공용 사용
 */
export function formDataToDbColumns(d: CreatePropertyInput): Record<string, unknown> {
  const addressDetail = `${d.dong || ""}${d.dong ? " " : ""}${d.ho || ""}`.trim()

  return {
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
    blocked_dates: d.blockedDates || [],

    checkin_time: d.checkinTime || "15:00",
    checkin_method: d.checkinMethod || "비대면",
    checkout_time: d.checkoutTime || "11:00",
    checkout_method: d.checkoutMethod || "비대면",
  }
}

/**
 * DB 컬럼 → 폼 데이터 매핑 (수정 페이지 pre-fill용)
 */
export function dbColumnsToFormData(p: Property) {
  return {
    address: p.address || "",
    dong: p.dong || "",
    ho: p.ho || "",
    dongNone: p.dong_none || false,
    totalFloors: p.total_floors || 1,
    floorNumber: p.floor_number || undefined,
    floorType: p.floor_type || undefined,
    buildingType: p.building_type || p.property_type || "",
    roomCount: p.room_count || 1,
    bathroomCount: p.bathroom_count || 1,
    kitchenCount: p.kitchen_count || 1,
    areaSqm: p.area_sqm || undefined,
    areaPyeong: p.area_pyeong || undefined,
    areaUnit: (p.area_unit as "평" | "㎡") || "㎡",
    hasElevator: p.has_elevator ?? undefined,
    parking: (p.parking as "불가능" | "가능" | "제한적가능") || "불가능",
    parkingType: p.parking_type || undefined,
    parkingCount: p.parking_count || 0,
    parkingCondition: p.parking_condition || undefined,

    amenities: p.amenities || [],
    petAllowed: p.pet_allowed ?? undefined,

    shortTitle: p.short_title || p.title || "",
    images: p.images || [],
    description: p.description || "",
    locationTransport: p.location_transport || "",
    usageGuide: p.usage_guide || "",
    hostMessage: p.host_message || "",

    weeklyPrice: p.price_per_week || 0,
    deposit: p.deposit || 300000,
    longTermDiscounts: p.long_term_discounts || [],
    instantMoveDiscounts: p.instant_move_discounts || [],
    maintenanceFee: p.maintenance_fee || 0,
    maintenanceElectric: p.maintenance_electric || false,
    maintenanceWater: p.maintenance_water || false,
    maintenanceGas: p.maintenance_gas || false,
    maintenanceDetail: p.maintenance_detail || "",
    cleaningFree: p.cleaning_free || false,
    checkoutCleaningFee: p.checkout_cleaning_fee || 0,
    petCleaningFee: p.pet_cleaning_fee || 0,
    cancellationPolicy: (p.cancellation_policy as "유연" | "표준" | "엄격") || undefined,
    cancellationAgreed: p.cancellation_agreed || false,

    minStayWeeks: p.min_stay_weeks || 1,
    maxStayWeeks: p.max_stay_weeks || 12,
    blockedDates: p.blocked_dates || [],

    checkinTime: p.checkin_time || "15:00",
    checkinMethod: (p.checkin_method as "비대면" | "대면") || "비대면",
    checkoutTime: p.checkout_time || "11:00",
    checkoutMethod: (p.checkout_method as "비대면" | "대면") || "비대면",
  }
}

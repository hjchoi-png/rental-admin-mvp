import { z } from "zod"

// ============================================
// 상수 정의
// ============================================

export const STEPS = [
  { label: "위치 및 구조", shortLabel: "위치" },
  { label: "옵션", shortLabel: "옵션" },
  { label: "상세 정보", shortLabel: "상세" },
  { label: "요금 설정", shortLabel: "요금" },
  { label: "예약 설정", shortLabel: "예약" },
  { label: "입실·퇴실", shortLabel: "입퇴실" },
] as const

export const BUILDING_TYPES = [
  "오피스텔", "아파트", "빌라", "원룸", "단독주택",
  "상가주택", "고시원", "펜션", "쉐어하우스", "게스트하우스", "생활형숙박시설",
] as const

export const AMENITY_OPTIONS = [
  "WiFi", "세탁기", "에어컨", "TV", "냉장고",
  "전자레인지", "주차", "엘리베이터", "건조기", "인덕션",
  "식기세척기", "침구류", "수건", "드라이어", "다리미",
  "옷장", "책상", "의자", "소화기", "화재경보기",
] as const

export const PARKING_OPTIONS = ["불가능", "가능", "제한적가능"] as const
export const PARKING_TYPE_OPTIONS = ["자주식", "기계식"] as const
export const CANCELLATION_POLICIES = ["유연", "표준", "엄격"] as const

export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, "0")
  const m = i % 2 === 0 ? "00" : "30"
  return `${h}:${m}`
})

export const WRITING_GUIDES = {
  description: {
    title: "게스트는 이런게 궁금해요:",
    items: [
      "이 방의 분위기는 어떤가요?",
      "최근 리모델링이나 관리가 되었나요?",
      "몇 명이 사용하기 적합한 공간인가요?",
      "생활하면서 특히 편리한 점은 무엇인가요?",
    ],
  },
  locationTransport: {
    title: "게스트는 이런게 궁금해요:",
    items: [
      "가장 가까운 지하철역은 어디이며, 도보로 얼마나 걸리나요?",
      "주변에 이용할 수 있는 버스 정류장은 도보로 얼마나 걸리나요?",
      "근처에 학교, 병원, 마트 같은 주요 시설이 있나요?",
      "도보 5분 내 생활 편의시설이 있다면 어떤 게 있나요?",
    ],
  },
  usageGuide: {
    title: "게스트는 이런게 궁금해요:",
    items: [
      "입주는 비대면인가요? 어떤 방식으로 안내되나요?",
      "이용 시 지켜야 할 규칙이 있다면 무엇인가요?",
    ],
  },
  hostMessage: {
    title: "게스트는 이런게 궁금해요:",
    items: [
      "게스트에게 전하고 싶은 인사말이나 부탁이 있다면요?",
      "근처에 추천하고 싶은 장소(카페, 시장, 산책길 등)가 있나요?",
      "이 지역에서 지내기 좋은 이유는 무엇인가요?",
      "특별히 안내하고 싶은 생활 팁이 있다면 알려주세요.",
    ],
  },
} as const

export const MAINTENANCE_TEMPLATES = [
  { label: "공과금 전액 포함", text: "관리비에 전기, 수도, 가스, 인터넷 요금이 모두 포함되어 있습니다. 별도 정산 없이 이용하세요." },
  { label: "공과금 일부 포함", text: "관리비에 수도, 인터넷 요금이 포함되어 있습니다. 전기, 가스 요금은 사용량에 따라 퇴실 시 별도 정산됩니다." },
  { label: "공과금 별도 정산", text: "관리비는 전기, 수도, 가스 요금은 사용량에 따라 퇴실 시 별도 정산됩니다." },
  { label: "공과금 정액제", text: "관리비에 기본 공과금이 포함되어 있습니다. 월 OO만원 초과 사용 시 초과분은 별도 정산됩니다." },
  { label: "관리비 무료", text: "별도 관리비가 없습니다. 공과금(전기, 수도, 가스)도 임대료에 포함되어 있습니다." },
] as const

export const CANCELLATION_TABLE = [
  { label: "입주 14일 전", flexible: "무료 취소", standard: "임대료의 10%", strict: "임대료의 20%" },
  { label: "입주 7일 전", flexible: "임대료의 15%", standard: "임대료의 30%", strict: "임대료의 50%" },
  { label: "입주 3일 전", flexible: "임대료의 30%", standard: "임대료의 40%", strict: "임대료의 60%" },
  { label: "입주 1일 전", flexible: "임대료의 40%", standard: "임대료의 50%", strict: "임대료의 70%" },
  { label: "입주 당일", flexible: "취소 불가", standard: "취소 불가", strict: "취소 불가" },
] as const

// ============================================
// Zod 스키마
// ============================================

const longTermDiscountSchema = z.object({
  weeks: z.number().min(2).max(12),
  discountPct: z.number().min(1).max(100),
})

const instantMoveDiscountSchema = z.object({
  days: z.number().min(0).max(7),
  amount: z.number().min(10000).max(300000),
})

export const registerSchema = z.object({
  // Step 1: 위치 및 구조
  address: z.string().min(1, "주소를 입력해주세요"),
  dong: z.string().optional(),
  ho: z.string().min(1, "호 정보를 입력해주세요"),
  dongNone: z.boolean().default(false),
  totalFloors: z.number().min(1, "전체 층수를 선택해주세요").max(80),
  floorNumber: z.number().optional(),
  floorType: z.string().optional(), // '반지하' | '옥탑방' | null
  buildingType: z.string().min(1, "건물 유형을 선택해주세요"),
  roomCount: z.number({ error: "방 개수를 입력해주세요" }).min(1, "방은 최소 1개 이상 필요합니다").max(10),
  bathroomCount: z.number().min(0).max(10).default(0),
  kitchenCount: z.number().min(0).max(10).default(0),
  livingRoomCount: z.number().min(0).max(10).default(0),
  areaSqm: z.number().min(1, "면적을 입력해주세요").max(3305.785).optional(),
  areaPyeong: z.number().optional(),
  areaUnit: z.enum(["평", "㎡"]).default("㎡"),
  hasElevator: z.boolean().optional(),
  parking: z.enum(["불가능", "가능", "제한적가능"]).default("불가능"),
  parkingType: z.string().optional(),
  parkingCount: z.number().min(0).max(10).default(0),
  parkingCondition: z.string().max(100, "주차 조건은 100자 이내로 입력해주세요").optional(),

  // Step 2: 옵션
  amenities: z.array(z.string()).default([]),
  petAllowed: z.boolean().optional(),

  // Step 3: 상세 정보
  shortTitle: z.string().min(5, "5자 이상 입력해주세요").max(20, "20자 이내로 입력해주세요"),
  images: z.array(z.string()).min(5, "최소 5장의 사진을 등록해주세요").max(30, "최대 30장까지 등록 가능합니다"),
  description: z.string().min(30, "30자 이상 입력해주세요").max(1000, "1000자 이내로 입력해주세요"),
  locationTransport: z.string().max(1000, "1000자 이내로 입력해주세요").optional(),
  usageGuide: z.string().max(1000, "1000자 이내로 입력해주세요").optional(),
  hostMessage: z.string().max(1000, "1000자 이내로 입력해주세요").optional(),

  // Step 4: 요금 설정
  weeklyPrice: z.number().min(10000, "주당 요금은 10,000원 이상이어야 합니다").max(10000000, "주당 요금은 10,000,000원을 초과할 수 없습니다"),
  deposit: z.number().default(300000),
  longTermDiscounts: z.array(longTermDiscountSchema).default([]),
  instantMoveDiscounts: z.array(instantMoveDiscountSchema).default([]),
  maintenanceFee: z.number().min(0).max(1000000, "관리비는 1,000,000원을 초과할 수 없습니다").default(0),
  maintenanceElectric: z.boolean().default(false),
  maintenanceWater: z.boolean().default(false),
  maintenanceGas: z.boolean().default(false),
  maintenanceDetail: z.string().max(1000, "1000자 이내로 입력해주세요").optional(),
  cleaningFree: z.boolean().default(false),
  checkoutCleaningFee: z.number().min(0).max(300000, "청소비는 300,000원을 초과할 수 없습니다").default(0),
  petCleaningFee: z.number().min(0).max(300000).default(0),
  cancellationPolicy: z.enum(["유연", "표준", "엄격"]).optional(),
  cancellationAgreed: z.boolean().refine(v => v === true, "위약금 규정 주의사항에 동의해주세요"),

  // Step 5: 예약 설정
  minStayWeeks: z.number().min(1).max(12).default(1),
  maxStayWeeks: z.number().default(12),
  dayExtension: z.number().min(0).max(6).default(0),
  blockedDates: z.array(z.string()).default([]),

  // Step 6: 입실/퇴실
  checkinTime: z.string().default("15:00"),
  checkinMethod: z.enum(["비대면", "대면"]).default("비대면"),
  checkoutTime: z.string().default("11:00"),
  checkoutMethod: z.enum(["비대면", "대면"]).default("비대면"),

  // 호스트 정보 (비로그인)
  guestName: z.string().optional(),
  guestEmail: z.string().email("올바른 이메일 형식이 아닙니다").optional().or(z.literal("")),
  guestPhone: z.string().optional(),
})

export type RegisterFormData = z.infer<typeof registerSchema>

// 스텝별 필드 매핑 (trigger 검증용)
export const STEP_FIELDS: Record<number, (keyof RegisterFormData)[]> = {
  0: ["address", "ho", "totalFloors", "buildingType", "roomCount", "bathroomCount", "hasElevator", "parking"],
  1: ["petAllowed"],
  2: ["shortTitle", "images", "description"],
  3: ["weeklyPrice", "cancellationPolicy", "cancellationAgreed"],
  4: ["minStayWeeks"],
  5: ["checkinTime", "checkoutTime"],
}

// 기본값
export const DEFAULT_VALUES: Partial<RegisterFormData> = {
  address: "",
  dong: "",
  ho: "",
  dongNone: false,
  totalFloors: 1,
  buildingType: "",
  roomCount: 1,
  bathroomCount: 0,
  kitchenCount: 0,
  livingRoomCount: 0,
  areaUnit: "㎡",
  parking: "불가능",
  parkingCount: 0,
  amenities: [],
  shortTitle: "",
  images: [],
  description: "",
  locationTransport: "",
  usageGuide: "",
  hostMessage: "",
  weeklyPrice: 0,
  deposit: 300000,
  longTermDiscounts: [],
  instantMoveDiscounts: [],
  maintenanceFee: 0,
  maintenanceElectric: false,
  maintenanceWater: false,
  maintenanceGas: false,
  maintenanceDetail: "",
  cleaningFree: false,
  checkoutCleaningFee: 0,
  petCleaningFee: 0,
  cancellationAgreed: false,
  minStayWeeks: 1,
  maxStayWeeks: 12,
  dayExtension: 0,
  blockedDates: [],
  checkinTime: "15:00",
  checkinMethod: "비대면",
  checkoutTime: "11:00",
  checkoutMethod: "비대면",
}

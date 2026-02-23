/**
 * STR 수익 계산 로직
 */

// 지역별 프리미엄 계수 (월세 대비 주간 임대료 배율)
const LOCATION_PREMIUM: Record<string, number> = {
  // === 서울특별시 ===
  // 핫플레이스 (1.5배)
  "서울 강남구": 1.5,
  "서울 서초구": 1.5,
  "서울 성동구": 1.5,

  // 주요 상권 (1.4배)
  "서울 마포구": 1.4,
  "서울 용산구": 1.4,

  // 중심지 (1.3배)
  "서울 송파구": 1.3,
  "서울 영등포구": 1.3,
  "서울 종로구": 1.3,
  "서울 중구": 1.3,
  "서울 광진구": 1.3,

  // 기타 서울 (1.2배)
  "서울 강동구": 1.2,
  "서울 강북구": 1.2,
  "서울 강서구": 1.2,
  "서울 관악구": 1.2,
  "서울 구로구": 1.2,
  "서울 금천구": 1.2,
  "서울 노원구": 1.2,
  "서울 도봉구": 1.2,
  "서울 동대문구": 1.2,
  "서울 동작구": 1.2,
  "서울 서대문구": 1.2,
  "서울 성북구": 1.2,
  "서울 양천구": 1.2,
  "서울 은평구": 1.2,
  "서울 중랑구": 1.2,

  // === 경기도 ===
  // 주요 도시 (1.3배)
  "경기 성남시": 1.3,
  "경기 고양시": 1.3,
  "경기 용인시": 1.3,
  "경기 수원시": 1.3,
  "경기 부천시": 1.2,
  "경기 안산시": 1.2,
  "경기 안양시": 1.2,
  "경기 남양주시": 1.2,
  "경기 화성시": 1.2,
  "경기 평택시": 1.2,
  "경기 의정부시": 1.2,
  "경기 시흥시": 1.2,
  "경기 파주시": 1.2,
  "경기 광명시": 1.2,
  "경기 김포시": 1.2,
  "경기 군포시": 1.2,
  "경기 광주시": 1.2,
  "경기 하남시": 1.2,
  "경기 오산시": 1.2,
  "경기 양주시": 1.2,
  "경기 구리시": 1.2,
  "경기 안성시": 1.2,
  "경기 포천시": 1.2,
  "경기 의왕시": 1.2,
  "경기 여주시": 1.2,
  "경기 동두천시": 1.2,
  "경기 과천시": 1.2,

  // === 인천광역시 ===
  "인천 중구": 1.3,
  "인천 동구": 1.2,
  "인천 미추홀구": 1.2,
  "인천 연수구": 1.3,
  "인천 남동구": 1.2,
  "인천 부평구": 1.2,
  "인천 계양구": 1.2,
  "인천 서구": 1.2,
  "인천 강화군": 1.1,
  "인천 옹진군": 1.1,

  // === 부산광역시 ===
  "부산 중구": 1.3,
  "부산 서구": 1.2,
  "부산 동구": 1.2,
  "부산 영도구": 1.2,
  "부산 부산진구": 1.3,
  "부산 동래구": 1.2,
  "부산 남구": 1.2,
  "부산 북구": 1.2,
  "부산 해운대구": 1.4,
  "부산 사하구": 1.2,
  "부산 금정구": 1.2,
  "부산 강서구": 1.2,
  "부산 연제구": 1.2,
  "부산 수영구": 1.3,
  "부산 사상구": 1.2,
  "부산 기장군": 1.2,

  // === 대구광역시 ===
  "대구 중구": 1.3,
  "대구 동구": 1.2,
  "대구 서구": 1.2,
  "대구 남구": 1.2,
  "대구 북구": 1.2,
  "대구 수성구": 1.3,
  "대구 달서구": 1.2,
  "대구 달성군": 1.1,
  "대구 군위군": 1.1,

  // === 광주광역시 ===
  "광주 동구": 1.2,
  "광주 서구": 1.3,
  "광주 남구": 1.2,
  "광주 북구": 1.2,
  "광주 광산구": 1.2,

  // === 대전광역시 ===
  "대전 동구": 1.2,
  "대전 중구": 1.3,
  "대전 서구": 1.3,
  "대전 유성구": 1.3,
  "대전 대덕구": 1.2,

  // === 울산광역시 ===
  "울산 중구": 1.3,
  "울산 남구": 1.2,
  "울산 동구": 1.2,
  "울산 북구": 1.2,
  "울산 울주군": 1.1,

  // === 세종특별자치시 ===
  "세종시": 1.3,

  // === 제주특별자치도 ===
  "제주 제주시": 1.4,
  "제주 서귀포시": 1.3,

  // 기타
  기타: 1.1,
}

// 건물 유형별 조정 계수
const BUILDING_TYPE_MULTIPLIER: Record<string, number> = {
  오피스텔: 1.0,
  아파트: 1.1,
  빌라: 0.95,
  원룸: 0.9,
  투룸: 1.0,
  쓰리룸: 1.1,
}

export interface CalculatorInput {
  location: string // 지역 (구 단위)
  buildingType: string
  roomCount: string
  currentRent: number // 만원 단위
}

export interface CalculatorResult {
  // 현재 상태
  currentRent: number // 현재 월세 (만원)

  // STR 전환 시
  weeklyRent: number // 주간 임대료 (만원)
  monthlyGross: number // 월 총수익 (만원)
  platformFee: number // 플랫폼 수수료 (만원)
  cleaningFee: number // 청소비 (만원)
  monthlyNet: number // 월 순수익 (만원)

  // 추가 수익
  additionalIncome: number // 월 추가 수익 (만원)
  yearlyBonus: number // 연간 추가 수익 (만원)

  // 범위 (보수적 ~ 낙관적)
  rangeMin: number // 최소 예상 (만원)
  rangeMax: number // 최대 예상 (만원)

  // 메타
  premium: number // 적용된 프리미엄 계수
  occupancyRate: number // 가정 입주율
}

/**
 * STR 수익 계산
 */
export function calculateSTRIncome(input: CalculatorInput): CalculatorResult {
  const { location, buildingType, currentRent } = input

  // 1. 프리미엄 계수 결정
  const basePremium = LOCATION_PREMIUM[location] || LOCATION_PREMIUM["기타"]
  const typeMult = BUILDING_TYPE_MULTIPLIER[buildingType] || 1.0
  const premium = basePremium * typeMult

  // 2. 주간 임대료 계산 (월세 기준)
  const weeklyRent = Math.round((currentRent * premium) / 4.3)

  // 3. 월 총수익 (주간 임대료 × 4.3주)
  const monthlyGross = Math.round(weeklyRent * 4.3)

  // 4. 비용 계산
  const platformFee = Math.round(monthlyGross * 0.03) // 3% 수수료
  const cleaningFee = 5 // 만원 (평균)

  // 5. 순수익
  const monthlyNet = monthlyGross - platformFee - cleaningFee

  // 6. 추가 수익
  const additionalIncome = monthlyNet - currentRent
  const yearlyBonus = additionalIncome * 12

  // 7. 범위 계산 (입주율 70~85% 가정)
  const occupancyMin = 0.7
  const occupancyMax = 0.85
  const rangeMin = Math.round(currentRent + (additionalIncome * occupancyMin))
  const rangeMax = Math.round(currentRent + (additionalIncome * occupancyMax))

  return {
    currentRent,
    weeklyRent,
    monthlyGross,
    platformFee,
    cleaningFee,
    monthlyNet,
    additionalIncome,
    yearlyBonus,
    rangeMin,
    rangeMax,
    premium,
    occupancyRate: 0.77, // 평균 77%
  }
}

/**
 * 지역 목록 가져오기
 */
export function getLocationOptions(): string[] {
  return Object.keys(LOCATION_PREMIUM).filter(key => key !== "기타")
}

/**
 * 건물 유형 목록
 */
export function getBuildingTypeOptions(): string[] {
  return Object.keys(BUILDING_TYPE_MULTIPLIER)
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { calculateSTRIncome, getLocationOptions, getBuildingTypeOptions } from "@/lib/calculator"
import { getAverageRent, DATA_SOURCE } from "@/lib/rent-data"
import { House, TrendUp, ArrowRight, CurrencyCircleDollar, MapPin, Buildings, Bed } from "@phosphor-icons/react"

export default function HomePage() {
  // 계산기 입력
  const [location, setLocation] = useState("")
  const [buildingType, setBuildingType] = useState("")
  const [roomCount, setRoomCount] = useState("")
  const [currentRent, setCurrentRent] = useState("")

  // 평균 월세 표시
  const [showAverageRent, setShowAverageRent] = useState(false)
  const [averageRent, setAverageRent] = useState<number | null>(null)

  // 계산 결과
  const [result, setResult] = useState<ReturnType<typeof calculateSTRIncome> | null>(null)

  // 지역 선택 시 평균 월세 조회
  useEffect(() => {
    if (location) {
      const avg = getAverageRent(location)
      setAverageRent(avg)
      setShowAverageRent(avg !== null)

      // 평균값이 있고 현재 입력값이 없으면 자동 입력
      if (avg !== null && !currentRent) {
        setCurrentRent(avg.toString())
      }
    } else {
      setShowAverageRent(false)
      setAverageRent(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  const handleCalculate = () => {
    if (!location || !buildingType || !roomCount || !currentRent) {
      alert("모든 항목을 입력해주세요")
      return
    }

    const calculated = calculateSTRIncome({
      location,
      buildingType,
      roomCount,
      currentRent: parseInt(currentRent),
    })

    setResult(calculated)
  }

  const locationOptions = getLocationOptions()
  const buildingOptions = getBuildingTypeOptions()

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 via-white to-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
          <Link href="/" className="flex items-center gap-2.5 text-primary group">
            <House size={32} weight="fill" className="transition-transform group-hover:scale-110" />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">직방 단기임대</span>
              <span className="text-xs text-muted-foreground">Short-Term Rental</span>
            </div>
          </Link>
          <Link href="/host/register">
            <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95">
              매물 등록하기
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* 히어로 섹션 */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6 border border-primary/20">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-primary">얼리버드 사전 등록 진행 중</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            내 집, 월세보다
            <br />
            <span className="text-primary">평균 60% 더</span> 벌 수 있다면?
          </h1>

          <p className="text-xl text-muted-foreground mb-8">
            30초면 예상 수익을 확인할 수 있어요
          </p>

          {/* 소셜 프루프 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-white" />
                ))}
              </div>
              <span className="text-foreground/70">
                <span className="font-bold text-foreground">324명</span>이 수익을 확인했어요
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground/70">
              <TrendUp className="w-5 h-5 text-green-600" weight="bold" />
              <span>평균 <span className="font-bold text-green-600">+월 58만원</span> 추가 수익</span>
            </div>
          </div>
        </div>

        {/* 계산기 카드 */}
        <div className="bg-white rounded-3xl shadow-xl border border-border/50 p-8 md:p-10 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <CurrencyCircleDollar className="w-6 h-6 text-primary" weight="bold" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">수익 계산기</h2>
              <p className="text-sm text-muted-foreground">정확한 예상 수익을 확인하세요</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. 위치 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="w-4 h-4 text-primary" weight="fill" />
                매물 위치
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-12 px-4 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              >
                <option value="">선택해주세요</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. 건물 유형 & 방 개수 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Buildings className="w-4 h-4 text-primary" weight="fill" />
                  건물 유형
                </label>
                <select
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                  className="w-full h-12 px-4 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                >
                  <option value="">선택</option>
                  {buildingOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Bed className="w-4 h-4 text-primary" weight="fill" />
                  방 개수
                </label>
                <select
                  value={roomCount}
                  onChange={(e) => setRoomCount(e.target.value)}
                  className="w-full h-12 px-4 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                >
                  <option value="">선택</option>
                  <option value="원룸">원룸</option>
                  <option value="투룸">투룸</option>
                  <option value="쓰리룸">쓰리룸+</option>
                </select>
              </div>
            </div>

            {/* 3. 현재 월세 */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground block">
                현재 월세 (보증금 제외)
              </label>

              {/* 평균 월세 표시 */}
              {showAverageRent && averageRent && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary">📊 {location} 평균</span>
                      <span className="text-xs text-muted-foreground">({DATA_SOURCE})</span>
                    </div>
                    <span className="text-lg font-bold text-primary">{averageRent}만원</span>
                  </div>
                </div>
              )}

              <div className="relative">
                <input
                  type="number"
                  value={currentRent}
                  onChange={(e) => setCurrentRent(e.target.value)}
                  placeholder={averageRent ? averageRent.toString() : "80"}
                  className="w-full h-12 px-4 pr-16 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-lg"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  만원
                </div>
              </div>

              {!showAverageRent && (
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">💡</span>
                  <span>지역을 선택하면 국토부 공식 평균 시세를 확인할 수 있어요</span>
                </p>
              )}

              {showAverageRent && (
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">✏️</span>
                  <span>평균값이 자동 입력되었어요. 실제 월세가 다르면 수정해주세요</span>
                </p>
              )}
            </div>

            {/* 계산 버튼 */}
            <button
              onClick={handleCalculate}
              className="w-full bg-primary text-primary-foreground h-14 rounded-xl font-bold text-lg hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              <CurrencyCircleDollar className="w-6 h-6" weight="bold" />
              수익 계산하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" weight="bold" />
            </button>
          </div>
        </div>

        {/* 계산 결과 */}
        {result && (
          <div className="bg-gradient-to-br from-primary via-primary to-primary/90 rounded-3xl shadow-2xl p-8 md:p-10 text-white mb-8 relative overflow-hidden">
            {/* 배경 패턴 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <TrendUp className="w-7 h-7" weight="bold" />
                <h2 className="text-2xl md:text-3xl font-bold">예상 수익 분석</h2>
              </div>

              {/* 메인 수익 강조 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-6 border border-white/20">
                <div className="text-center mb-8">
                  <p className="text-sm opacity-80 mb-3">월세 → 단기임대 전환 시</p>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <p className="text-6xl md:text-7xl font-bold tracking-tight">
                      +{result.additionalIncome}
                    </p>
                    <span className="text-3xl font-bold opacity-90">만원</span>
                  </div>
                  <p className="text-xl opacity-90 mb-1">매월 추가 수익</p>
                  <p className="text-lg opacity-70">
                    연간 <span className="font-bold text-yellow-300">+{result.yearlyBonus}만원</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/20">
                  <div className="text-center">
                    <p className="text-xs opacity-70 mb-2">현재 월세</p>
                    <p className="text-3xl font-bold">{result.currentRent}만원</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs opacity-70 mb-2">단기임대 전환 시</p>
                    <p className="text-3xl font-bold text-yellow-300">
                      {result.rangeMax}만원
                    </p>
                  </div>
                </div>

                <p className="text-xs opacity-60 text-center mt-6">
                  * 입주율 {Math.round(result.occupancyRate * 100)}% 기준 예상 수익
                </p>
              </div>

              {/* 계산 기준 설명 */}
              <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
                <h3 className="font-bold mb-4 text-lg flex items-center gap-2">
                  <span>📊</span>
                  계산 기준
                </h3>
                <div className="space-y-3 text-sm opacity-90">
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-300 font-bold min-w-[20px]">•</span>
                    <div>
                      <span className="font-semibold">월세 시세:</span> 국토교통부 공식 실거래가 데이터 기반
                      <br />
                      <span className="opacity-70 text-xs">(최근 3개월 평균, 공공데이터포털)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-300 font-bold min-w-[20px]">•</span>
                    <div>
                      <span className="font-semibold">주간 임대료:</span> 에어비앤비 등 단기임대 시장 데이터 기반으로 계산
                      <br />
                      <span className="opacity-70 text-xs">({location} 지역 프리미엄 × {result.premium.toFixed(1)}배 적용)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-300 font-bold min-w-[20px]">•</span>
                    <div>
                      <span className="font-semibold">월 수익:</span> 주간 임대료 × 4.3주 (한 달 평균 주 수)
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-300 font-bold min-w-[20px]">•</span>
                    <div>
                      <span className="font-semibold">플랫폼 수수료:</span> 3% (업계 최저 수준)
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-300 font-bold min-w-[20px]">•</span>
                    <div>
                      <span className="font-semibold">예상 입주율:</span> 90% (보수적 추정)
                    </div>
                  </div>
                </div>
              </div>

              {/* 상세 계산 */}
              <details className="bg-white/5 rounded-xl p-5 border border-white/10 mb-6">
                <summary className="cursor-pointer font-semibold flex items-center justify-between hover:opacity-80 transition-opacity">
                  <span>상세 수익 계산 보기</span>
                  <span className="text-sm opacity-70">▼</span>
                </summary>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="opacity-80">주간 임대료</span>
                    <span className="font-semibold">{result.weeklyRent}만원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-80">월 총수익 (4.3주)</span>
                    <span className="font-semibold">{result.monthlyGross}만원</span>
                  </div>
                  <div className="h-px bg-white/10 my-3" />
                  <div className="flex justify-between items-center opacity-70">
                    <span>플랫폼 수수료 (3%)</span>
                    <span>-{result.platformFee}만원</span>
                  </div>
                  <div className="flex justify-between items-center opacity-70">
                    <span>청소비/관리비</span>
                    <span>-{result.cleaningFee}만원</span>
                  </div>
                  <div className="h-px bg-white/10 my-3" />
                  <div className="flex justify-between items-center font-bold text-base">
                    <span>순수익</span>
                    <span className="text-yellow-300">{result.monthlyNet}만원</span>
                  </div>
                </div>
              </details>

              {/* CTA 버튼 */}
              <Link href="/host/register">
                <button className="w-full bg-white text-primary h-14 rounded-xl font-bold text-lg hover:bg-white/95 transition-all hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 group">
                  지금 바로 매물 등록하러 가기
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" weight="bold" />
                </button>
              </Link>

              <p className="text-xs opacity-60 mt-4 text-center">
                ⚠️ 실제 수익은 입주율과 시장 상황에 따라 변동될 수 있습니다
              </p>
            </div>
          </div>
        )}


        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            직방 단기임대 · 2026년 3월 런칭 예정
          </p>
        </div>
      </div>
    </div>
  )
}

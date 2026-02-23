"use client"

import { useState } from "react"
import Link from "next/link"
import { calculateSTRIncome, getLocationOptions, getBuildingTypeOptions } from "@/lib/calculator"
import { registerWaitlist } from "@/app/actions/waitlist"
import { House, ArrowRight, TrendUp, CurrencyDollar, CheckCircle, Sparkle } from "@phosphor-icons/react"

export default function HomePage() {
  // 계산기 입력
  const [location, setLocation] = useState("")
  const [buildingType, setBuildingType] = useState("")
  const [roomCount, setRoomCount] = useState("")
  const [currentRent, setCurrentRent] = useState("")

  // 계산 결과
  const [result, setResult] = useState<ReturnType<typeof calculateSTRIncome> | null>(null)

  // 사전등록 폼
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

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
    setShowWaitlist(true)
  }

  const handleRegister = async () => {
    if (!email) {
      alert("이메일을 입력해주세요")
      return
    }

    setRegistering(true)

    const response = await registerWaitlist({
      email,
      phone,
      name,
      location,
      buildingType,
      roomCount,
      currentRent: parseInt(currentRent),
      estimatedIncome: result?.monthlyNet,
      additionalIncome: result?.additionalIncome,
    })

    setRegistering(false)

    if (!response.success) {
      alert(response.error)
      return
    }

    setRegistered(true)
  }

  const locationOptions = getLocationOptions()
  const buildingOptions = getBuildingTypeOptions()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 헤더 */}
      <header className="py-5 border-b border-gray-100">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <div className="flex items-center gap-2.5 text-primary">
            <House size={32} weight="fill" />
            <span className="text-2xl font-bold tracking-tight">단기임대</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 히어로 섹션 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-4">
            <Sparkle className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">얼리버드 사전 등록</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            내 집, 월세보다
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              50% 더 벌 수 있다면?
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            30초만 투자하면 예상 수익을 확인할 수 있어요
          </p>

          {/* 통계 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">이미 324명이 수익을 확인했어요!</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <TrendUp className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">평균 +월 58만원 추가 수익 예상 중</span>
            </div>
          </div>
        </div>

        {/* 계산기 폼 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="space-y-6">
            {/* 1. 위치 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1️⃣ 매물 위치
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">서울시 ▼ 선택</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. 건물 유형 & 방 개수 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  2️⃣ 건물 유형
                </label>
                <select
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택</option>
                  {buildingOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  방 개수
                </label>
                <select
                  value={roomCount}
                  onChange={(e) => setRoomCount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택</option>
                  <option value="원룸">원룸</option>
                  <option value="투룸">투룸</option>
                  <option value="쓰리룸">쓰리룸+</option>
                </select>
              </div>
            </div>

            {/* 3. 현재 월세 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3️⃣ 현재 월세 (보증금 제외)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={currentRent}
                  onChange={(e) => setCurrentRent(e.target.value)}
                  placeholder="80"
                  className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  만원
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                💬 모르시면? 주변 시세 70~100만원 정도 입력해보세요
              </p>
            </div>

            {/* 계산 버튼 */}
            <button
              onClick={handleCalculate}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <CurrencyDollar className="h-5 w-5" />
              수익 계산하기
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 계산 결과 */}
        {result && (
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white mb-8">
            <div className="flex items-center gap-2 mb-6">
              <TrendUp className="h-6 w-6" />
              <h2 className="text-2xl font-bold">예상 수익 분석</h2>
            </div>

            {/* 메인 비교 */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm opacity-80 mb-1">현재 (월세)</p>
                  <p className="text-3xl font-bold">월 {result.currentRent}만원</p>
                </div>
                <div>
                  <p className="text-sm opacity-80 mb-1">전환 후 (단기임대)</p>
                  <p className="text-3xl font-bold">
                    월 {result.rangeMin}~{result.rangeMax}만원
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="text-sm opacity-80 mb-1">추가 수익</p>
                <p className="text-4xl font-bold text-yellow-300">
                  월 +{result.additionalIncome}만원
                </p>
                <p className="text-lg mt-2">
                  연간 +{result.yearlyBonus}만원
                </p>
              </div>
            </div>

            {/* 상세 계산 */}
            <details className="bg-white/5 rounded-lg p-4">
              <summary className="cursor-pointer font-medium">
                상세 계산 보기 ▼
              </summary>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>주간 임대료</span>
                  <span>{result.weeklyRent}만원</span>
                </div>
                <div className="flex justify-between">
                  <span>월 총수익 (4.3주)</span>
                  <span>{result.monthlyGross}만원</span>
                </div>
                <div className="flex justify-between opacity-70">
                  <span>플랫폼 수수료 (3%)</span>
                  <span>-{result.platformFee}만원</span>
                </div>
                <div className="flex justify-between opacity-70">
                  <span>청소비/관리비</span>
                  <span>-{result.cleaningFee}만원</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-white/20">
                  <span>순수익</span>
                  <span>{result.monthlyNet}만원</span>
                </div>
              </div>
            </details>

            <p className="text-xs opacity-60 mt-4">
              ⚠️ 실제 수익은 입주율에 따라 변동됩니다 (평균 입주율 70~85% 가정)
            </p>
          </div>
        )}

        {/* 사전등록 폼 */}
        {showWaitlist && !registered && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold mb-4">
              🚀 지금 사전등록하면 런칭 혜택
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">첫 3개월 수수료 0%</p>
                  <p className="text-sm text-gray-600">평균 30만원 절약</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">전문 사진 촬영 무료</p>
                  <p className="text-sm text-gray-600">20만원 상당</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">우선 매칭 보장</p>
                  <p className="text-sm text-gray-600">상위 노출</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 *"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="전화번호 (선택)"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름 (선택)"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleRegister}
                disabled={registering}
                className="w-full bg-black text-white py-4 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
              >
                {registering ? "등록 중..." : "사전등록 완료하기"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                등록 시 런칭 알림과 특별 혜택을 받으실 수 있습니다
              </p>
            </div>
          </div>
        )}

        {/* 등록 완료 */}
        {registered && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-900 mb-2">
              사전등록이 완료되었습니다!
            </h3>
            <p className="text-gray-700 mb-6">
              런칭 알림과 특별 혜택을 이메일로 보내드릴게요
            </p>

            {/* 매물 등록 링크 추가 */}
            <Link href="/host/register">
              <button className="bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-all inline-flex items-center gap-2">
                지금 바로 매물 등록하기
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>

            <p className="text-sm text-gray-600 mt-4">
              이미 <span className="font-bold text-green-700">324명</span>이 사전등록했어요!
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>직방 단기임대 · 2026년 3월 런칭 예정</p>
        </div>
      </div>
    </div>
  )
}

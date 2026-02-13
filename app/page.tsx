"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { House, ShieldCheck, Lightning, ArrowRight, Star } from "@phosphor-icons/react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary via-primary to-primary/90">
      {/* 헤더 */}
      <header className="py-5">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <div className="flex items-center gap-2.5 text-white">
            <House size={32} weight="fill" />
            <span className="text-2xl font-bold tracking-tight">단기임대</span>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="max-w-lg mx-auto text-center space-y-7">
          {/* 배지 */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 text-white rounded-2xl text-sm font-medium backdrop-blur-sm border border-white/10">
            <Star size={18} weight="fill" className="text-yellow-300" />
            얼리버드 사전 등록 오픈
          </div>

          {/* 타이틀 */}
          <h1 className="text-4xl md:text-[56px] font-bold text-white leading-[1.15] tracking-tight">
            단기임대<br />
            호스트 사전 등록
          </h1>

          <p className="text-base md:text-lg text-white/75 leading-relaxed max-w-sm mx-auto">
            서비스 정식 오픈 전, 미리 매물을 등록하고
            얼리버드 혜택을 받아보세요
          </p>

          {/* CTA 버튼 */}
          <div className="pt-2">
            <Link href="/host/register">
              <Button
                size="lg"
                className="host-btn bg-white text-primary hover:bg-white/95 font-bold shadow-xl hover:shadow-2xl transition-all text-lg px-10 py-7 gap-2"
              >
                매물 사전 등록하기
                <ArrowRight size={20} weight="bold" />
              </Button>
            </Link>
          </div>

          {/* 혜택 카드 */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <div className="flex items-center gap-2.5 text-white/90 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
              <ShieldCheck size={22} weight="fill" className="text-white shrink-0" />
              <span className="text-sm font-medium">수수료 무료</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/90 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
              <Lightning size={22} weight="fill" className="text-white shrink-0" />
              <span className="text-sm font-medium">우선 노출 혜택</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/90 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
              <House size={22} weight="fill" className="text-white shrink-0" />
              <span className="text-sm font-medium">간편한 등록</span>
            </div>
          </div>
        </div>
      </section>

      {/* 하단 안내 */}
      <footer className="py-4 text-center text-white/40 text-xs">
        © 2025 단기임대 · 사전 등록 서비스
      </footer>
    </div>
  )
}

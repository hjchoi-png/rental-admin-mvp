import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Shield, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-primary">
      {/* 헤더 */}
      <header className="py-6">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white">
            <Home className="h-8 w-8" />
            <span className="text-2xl font-bold">단기임대</span>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium backdrop-blur-sm">
            🎉 얼리버드 사전 등록 오픈
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            단기임대<br />
            호스트 사전 등록
          </h1>

          <p className="text-lg md:text-xl text-white/80">
            서비스 정식 오픈 전, 미리 매물을 등록하고<br />
            얼리버드 혜택을 받아보세요
          </p>

          <Link href="/host/register">
            <Button
              size="lg"
              className="text-lg px-10 py-7 bg-white text-primary hover:bg-white/90 font-bold shadow-xl hover:shadow-2xl transition-all"
            >
              매물 사전 등록하기
            </Button>
          </Link>

          {/* 혜택 */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            <div className="flex items-center gap-2 text-white/90">
              <Shield className="h-5 w-5" />
              <span>수수료 무료</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Zap className="h-5 w-5" />
              <span>우선 노출 혜택</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Home className="h-5 w-5" />
              <span>간편한 등록</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

import Link from "next/link"
import LogoutButton from "@/components/LogoutButton"
import { Home, LayoutDashboard, Building2, MessageCircle } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* 상단 오렌지 바 - 더 두껍게 */}
      <div className="h-1.5 bg-primary" />

      {/* Brutalist 고정 헤더 */}
      <header className="sticky top-0 z-50 bg-background border-b-2 border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* 왼쪽: 로고 - 심플하게 */}
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-primary flex items-center justify-center transition-transform group-hover:scale-110">
                <Home className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">단기임대</span>
                <span className="text-[10px] font-bold uppercase tracking-widest border border-foreground px-1.5 py-0.5">Admin</span>
              </div>
            </Link>

            {/* 중앙: 네비게이션 - 미니멀 */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/admin"
                className="relative text-sm font-semibold uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors group py-1"
              >
                대시보드
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
              </Link>
              <Link
                href="/admin/properties"
                className="relative text-sm font-semibold uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors group py-1"
              >
                매물 관리
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
              </Link>
              <Link
                href="/admin/cs-chatbot"
                className="relative text-sm font-semibold uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors group py-1"
              >
                CS 챗봇
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
              </Link>
            </nav>

            {/* 오른쪽: 로그아웃 버튼 */}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* 본문 - 더 넉넉한 여백 */}
      <main className="container mx-auto px-6 py-10">{children}</main>
    </div>
  )
}

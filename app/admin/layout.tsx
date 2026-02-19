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
      {/* 상단 오렌지 바 */}
      <div className="h-1 bg-primary" />

      {/* 고정 헤더 */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* 왼쪽: 로고 */}
            <Link href="/admin" className="flex items-center gap-2 text-lg font-bold text-primary">
              <Home className="h-5 w-5" strokeWidth={1.5} />
              <span>단기임대</span>
              <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1 font-semibold">Admin</span>
            </Link>

            {/* 중앙: 네비게이션 */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/admin" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors">
                <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
                대시보드
              </Link>
              <Link href="/admin/properties" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors">
                <Building2 className="h-4 w-4" strokeWidth={1.5} />
                매물 관리
              </Link>
              <Link href="/admin/cs-chatbot" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors">
                <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                CS 챗봇
              </Link>
            </nav>

            {/* 오른쪽: 로그아웃 버튼 */}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

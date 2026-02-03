import Link from "next/link"
import LogoutButton from "@/components/LogoutButton"
import { Home, LayoutDashboard, Building2 } from "lucide-react"

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
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* 왼쪽: 로고 */}
            <Link href="/admin" className="flex items-center gap-2 text-xl font-bold text-primary">
              <Home className="h-6 w-6" />
              <span>단기임대</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">Admin</span>
            </Link>

            {/* 중앙: 네비게이션 */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/admin" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <LayoutDashboard className="h-4 w-4" />
                대시보드
              </Link>
              <Link href="/admin/properties" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <Building2 className="h-4 w-4" />
                매물 관리
              </Link>
            </nav>

            {/* 오른쪽: 로그아웃 버튼 */}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

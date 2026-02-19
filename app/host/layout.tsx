import Link from "next/link"
import { createClient } from "@/utils/supabase/server"

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인 사용자는 레이아웃만 렌더링 (register 페이지 등)
  const isLoggedIn = !!user

  return (
    <div className="min-h-screen bg-background">
      {isLoggedIn && (
        <>
          <div className="h-1.5 bg-gradient-to-r from-primary via-orange-400 to-primary" />
          <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
            <div className="container mx-auto px-4 max-w-2xl">
              <div className="flex items-center justify-between h-14">
                <Link
                  href="/host/dashboard"
                  className="flex items-center gap-2 text-lg font-bold text-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" className="fill-primary"><path d="M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z"/></svg>
                  <span>단기임대</span>
                </Link>

                <div className="flex items-center gap-3">
                  <Link
                    href="/host/notifications"
                    className="relative p-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256"><path fill="currentColor" d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216Z"/></svg>
                  </Link>
                  <Link
                    href="/host/register"
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256"><path fill="currentColor" d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/></svg>
                    매물 등록
                  </Link>
                </div>
              </div>
            </div>
          </header>
        </>
      )}

      <main className={isLoggedIn ? "container mx-auto px-4 py-6 max-w-2xl" : ""}>
        {children}
      </main>
    </div>
  )
}

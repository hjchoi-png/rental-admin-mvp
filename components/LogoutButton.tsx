"use client"

import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("로그아웃 실패:", error)
        return
      }

      // 메인 페이지로 리다이렉트
      router.push("/")
      router.refresh() // 세션 상태 새로고침
    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error)
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleLogout}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      로그아웃
    </Button>
  )
}

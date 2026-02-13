import { createClient } from "@/utils/supabase/server"

/**
 * Admin 권한 검증 유틸리티
 *
 * Server Action에서 호출하여 현재 사용자가 admin 역할인지 확인한다.
 * admin이 아닌 경우 에러를 반환한다.
 *
 * 사용법:
 *   const guard = await requireAdmin()
 *   if (!guard.authorized) return { success: false, error: guard.error }
 *   // guard.userId 사용 가능
 */

export interface AdminGuardSuccess {
  authorized: true
  userId: string
}

export interface AdminGuardFailure {
  authorized: false
  error: string
}

export type AdminGuardResult = AdminGuardSuccess | AdminGuardFailure

export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: "인증이 필요합니다. 다시 로그인해주세요." }
  }

  // admin 역할 확인 (user_metadata 기반)
  const role = user.user_metadata?.role
  if (role !== "admin") {
    console.warn(`비인가 접근 시도: userId=${user.id}, role=${role}`)
    return { authorized: false, error: "관리자 권한이 필요합니다." }
  }

  return { authorized: true, userId: user.id }
}

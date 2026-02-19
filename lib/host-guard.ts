import { createClient } from "@/utils/supabase/server"

export interface HostGuardSuccess {
  authorized: true
  userId: string
}

export interface HostGuardFailure {
  authorized: false
  error: string
}

export type HostGuardResult = HostGuardSuccess | HostGuardFailure

export async function requireHost(): Promise<HostGuardResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: "로그인이 필요합니다." }
  }

  return { authorized: true, userId: user.id }
}
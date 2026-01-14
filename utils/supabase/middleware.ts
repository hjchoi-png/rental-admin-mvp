import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // 쿠키 설정 시 request와 response 모두 업데이트
          request.cookies.set({
            name,
            value,
            ...options,
          })
          // 새로운 Response 객체 생성하여 쿠키 설정
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // 쿠키 삭제 시 request와 response 모두 업데이트
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          // 새로운 Response 객체 생성하여 쿠키 삭제
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 세션 갱신 - 모든 요청에 대해 세션을 확인하고 쿠키를 자동으로 갱신
  // getUser() 호출 시 만료된 세션이 있으면 자동으로 갱신되고 쿠키가 업데이트됨
  // 이는 Supabase SSR 공식 문서에서 권장하는 방식입니다
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // /admin 경로 보호
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // 로그인 페이지는 제외하고 보호
    const isLoginPage = request.nextUrl.pathname.startsWith('/admin/login')

    // 인증되지 않은 사용자가 /admin 경로 접근 시 로그인 페이지로 리다이렉트
    if (!user && !isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    // 이미 로그인된 사용자가 로그인 페이지 접근 시 /admin으로 리다이렉트
    if (user && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

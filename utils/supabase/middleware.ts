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

  // 세션 갱신 및 토큰 검증 - 모든 요청에 대해 세션을 확인하고 쿠키를 자동으로 갱신
  // getUser() 호출 시 만료된 세션이 있으면 자동으로 갱신되고 쿠키가 업데이트됨
  // getUser()는 getSession()보다 더 안전하며, 서버에서 토큰 유효성을 확실하게 검증함
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // /admin 경로 보호 - 모든 /admin으로 시작하는 경로에 대해 엄격한 인증 검증
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const isLoginPage = request.nextUrl.pathname.startsWith('/admin/login')

    // 토큰 검증 실패 또는 유저가 없는 경우 (인증되지 않은 사용자)
    // getUser()는 토큰이 유효하지 않거나 만료된 경우 user를 null로 반환
    if (!user || userError) {
      // 로그인 페이지가 아닌 경우에만 리다이렉트 (무한 리다이렉트 방지)
      if (!isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/login'
        return NextResponse.redirect(url)
      }
      // 로그인 페이지인 경우 그대로 진행
      return supabaseResponse
    }

    // 인증된 사용자가 로그인 페이지에 접근하는 경우 /admin으로 리다이렉트
    if (user && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    // 인증된 사용자가 /admin 경로에 접근하는 경우 허용
    // 여기까지 도달했다는 것은 user가 존재하고 유효한 토큰을 가지고 있다는 의미
  }

  return supabaseResponse
}

import { login } from './actions'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-1 w-8 rounded-full bg-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            관리자 로그인
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            등록된 관리자 계정으로 접속하세요
          </p>
        </div>

        <form className="mt-8 space-y-5" action={login}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email-address" className="text-sm font-medium text-foreground">
                이메일 주소
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                placeholder="비밀번호"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full justify-center rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
          >
            로그인 하기
          </button>
        </form>
      </div>
    </div>
  )
}

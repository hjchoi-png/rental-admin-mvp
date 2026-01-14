import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">관리자 로그인</CardTitle>
          <CardDescription>
            이메일과 비밀번호를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {searchParams.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mb-4">
              {searchParams.error}
            </div>
          )}
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="admin@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            
            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

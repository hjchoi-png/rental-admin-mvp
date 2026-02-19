import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getHostProperties } from "../actions"
import StatusSummary from "./status-summary"
import PropertyList from "./property-list"
import Link from "next/link"

export default async function HostDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const result = await getHostProperties()

  if (result.error) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive">{result.error}</p>
      </div>
    )
  }

  const properties = result.data || []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">내 매물</h1>

      {properties.length > 0 ? (
        <>
          <StatusSummary properties={properties} />
          <PropertyList properties={properties} />
        </>
      ) : (
        <div className="text-center py-16 space-y-4">
          <div className="text-6xl">🏠</div>
          <h2 className="text-lg font-semibold text-foreground">
            등록된 매물이 없습니다
          </h2>
          <p className="text-sm text-muted-foreground">
            첫 번째 매물을 등록해보세요
          </p>
          <Link
            href="/host/register"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            매물 등록하기
          </Link>
        </div>
      )}
    </div>
  )
}

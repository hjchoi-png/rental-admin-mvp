import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getNotifications } from "../notification-actions"
import NotificationList from "./notification-list"

export default async function HostNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const result = await getNotifications()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">알림</h1>

      {result.data && result.data.length > 0 ? (
        <NotificationList notifications={result.data} />
      ) : (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-muted-foreground">알림이 없습니다</p>
        </div>
      )}
    </div>
  )
}

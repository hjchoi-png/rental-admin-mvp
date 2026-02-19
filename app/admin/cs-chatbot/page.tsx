import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getSessions, getPropertyContext } from "./actions"
import ChatbotClient from "./chatbot-client"

export default async function CsChatbotPage({
  searchParams,
}: {
  searchParams: { propertyId?: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const sessionsResult = await getSessions()

  // 매물 맥락이 있으면 매물 정보 조회
  let propertyContext: { id: string; title: string; address: string; status: string } | null = null
  if (searchParams.propertyId) {
    const result = await getPropertyContext(searchParams.propertyId)
    if (result.success) {
      propertyContext = result.data
    }
  }

  return (
    <ChatbotClient
      initialSessions={sessionsResult.data || []}
      initialPropertyContext={propertyContext}
    />
  )
}

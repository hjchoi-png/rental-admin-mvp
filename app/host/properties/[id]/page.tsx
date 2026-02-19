import { notFound, redirect } from "next/navigation"
import { getHostProperty } from "@/app/host/actions"
import PropertyDetailClient from "./property-detail-client"

export default async function HostPropertyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const result = await getHostProperty(params.id)

  if (!result.success) {
    if (result.error === "로그인이 필요합니다.") redirect("/")
    notFound()
  }

  return <PropertyDetailClient property={result.data} />
}

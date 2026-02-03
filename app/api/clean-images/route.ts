import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()

  const ids = [
    "b5d61d21-9430-4e0e-a193-468f6a697ee6",
    "47e8a5b8-3b67-476f-94fe-7d76de27ad21",
  ]

  for (const id of ids) {
    const { error } = await supabase
      .from("properties")
      .update({ images: "[]" })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message, id }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

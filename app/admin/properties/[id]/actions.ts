"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * 매물 상태를 승인으로 변경
 */
export async function approveProperty(propertyId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("properties")
    .update({ status: "approved" })
    .eq("id", propertyId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/properties")
  revalidatePath(`/admin/properties/${propertyId}`)
  return { success: true }
}

/**
 * 매물 상태를 반려로 변경
 */
export async function rejectProperty(propertyId: string, adminComment: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("properties")
    .update({
      status: "rejected",
      admin_comment: adminComment,
    })
    .eq("id", propertyId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/properties")
  revalidatePath(`/admin/properties/${propertyId}`)
  return { success: true }
}

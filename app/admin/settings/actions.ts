"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-guard"

export interface RejectionTemplate {
  id: string
  title: string
  content: string
}

export interface AdminSettings {
  id: string
  auto_approval_enabled: boolean
  auto_approval_threshold: number
  rejection_templates: RejectionTemplate[]
  forbidden_words_enabled?: boolean
  duplicate_check_enabled?: boolean
  auto_reject_on_rules?: boolean
}

export interface ForbiddenWord {
  id: string
  word: string
  category: string
  severity: string
  description: string | null
  is_regex: boolean
  created_at: string
}

/**
 * 어드민 설정 조회
 */
export async function fetchAdminSettings() {
  const guard = await requireAdmin()
  if (!guard.authorized) return { data: null, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("admin_settings")
    .select("*")
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as AdminSettings, error: null }
}

/**
 * 어드민 설정 업데이트
 */
export async function updateAdminSettings(
  settings: Partial<AdminSettings>
) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from("admin_settings")
    .update(settings)
    .eq("id", settings.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/settings")
  return { success: true }
}

/**
 * 반려 템플릿 추가
 */
export async function addRejectionTemplate(
  template: Omit<RejectionTemplate, "id">
) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  // 기존 설정 조회
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("*")
    .single()

  if (!settings) {
    return { success: false, error: "설정을 찾을 수 없습니다." }
  }

  // 새 템플릿 추가
  const newTemplate: RejectionTemplate = {
    id: `template_${Date.now()}`,
    ...template,
  }

  const updatedTemplates = [
    ...(settings.rejection_templates as RejectionTemplate[]),
    newTemplate,
  ]

  const { error } = await supabase
    .from("admin_settings")
    .update({ rejection_templates: updatedTemplates })
    .eq("id", settings.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/settings")
  return { success: true, template: newTemplate }
}

/**
 * 반려 템플릿 수정
 */
export async function updateRejectionTemplate(
  templateId: string,
  updates: Partial<RejectionTemplate>
) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  // 기존 설정 조회
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("*")
    .single()

  if (!settings) {
    return { success: false, error: "설정을 찾을 수 없습니다." }
  }

  // 템플릿 수정
  const updatedTemplates = (
    settings.rejection_templates as RejectionTemplate[]
  ).map((t) => (t.id === templateId ? { ...t, ...updates } : t))

  const { error } = await supabase
    .from("admin_settings")
    .update({ rejection_templates: updatedTemplates })
    .eq("id", settings.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/settings")
  return { success: true }
}

/**
 * 반려 템플릿 삭제
 */
export async function deleteRejectionTemplate(templateId: string) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  // 기존 설정 조회
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("*")
    .single()

  if (!settings) {
    return { success: false, error: "설정을 찾을 수 없습니다." }
  }

  // 템플릿 삭제
  const updatedTemplates = (
    settings.rejection_templates as RejectionTemplate[]
  ).filter((t) => t.id !== templateId)

  const { error } = await supabase
    .from("admin_settings")
    .update({ rejection_templates: updatedTemplates })
    .eq("id", settings.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/settings")
  return { success: true }
}

// ============================================================
// 금칙어 관리
// ============================================================

/**
 * 금칙어 목록 조회
 */
export async function fetchForbiddenWords() {
  const guard = await requireAdmin()
  if (!guard.authorized) return { data: null, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("forbidden_words")
    .select("*")
    .order("category")
    .order("word")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as ForbiddenWord[], error: null }
}

/**
 * 금칙어 추가
 */
export async function addForbiddenWord(
  word: string,
  category: string,
  severity: string = "reject",
  description: string = "",
  isRegex: boolean = false
) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("forbidden_words")
    .insert({
      word,
      category,
      severity,
      description: description || null,
      is_regex: isRegex,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/settings")
  return { success: true, data }
}

/**
 * 금칙어 삭제
 */
export async function deleteForbiddenWord(wordId: string) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from("forbidden_words")
    .delete()
    .eq("id", wordId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/settings")
  return { success: true }
}

/**
 * 검수 관련 설정 업데이트
 */
export async function updateInspectionSettings(settings: {
  id: string
  forbidden_words_enabled?: boolean
  duplicate_check_enabled?: boolean
  auto_reject_on_rules?: boolean
}) {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from("admin_settings")
    .update({
      forbidden_words_enabled: settings.forbidden_words_enabled,
      duplicate_check_enabled: settings.duplicate_check_enabled,
      auto_reject_on_rules: settings.auto_reject_on_rules,
    })
    .eq("id", settings.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/settings")
  return { success: true }
}

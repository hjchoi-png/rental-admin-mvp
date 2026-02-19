"use server"

import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/lib/admin-guard"
import { chat, generateSessionTitle } from "@/lib/rag/chat"
import type { ActionResult, ListResult } from "@/types/action-result"

interface ChatSession {
  id: string
  title: string | null
  context_property_id: string | null
  created_at: string
  updated_at: string
}

interface ChatMessage {
  id: number
  session_id: string
  role: "user" | "assistant"
  content: string
  sources: unknown[] | null
  created_at: string
}

/** 매물 정보 간략 조회 (세션 맥락 표시용) */
export async function getPropertyContext(
  propertyId: string
): Promise<ActionResult<{ id: string; title: string; address: string; status: string }>> {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, address, status")
    .eq("id", propertyId)
    .single()

  if (error || !data) return { success: false, error: "매물을 찾을 수 없습니다." }
  return { success: true, data }
}

/** 새 채팅 세션 생성 */
export async function createSession(
  contextPropertyId?: string
): Promise<ActionResult<ChatSession>> {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      admin_user_id: guard.userId,
      context_property_id: contextPropertyId || null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

/** 세션 목록 조회 */
export async function getSessions(): Promise<ListResult<ChatSession>> {
  const guard = await requireAdmin()
  if (!guard.authorized) return { data: null, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("admin_user_id", guard.userId)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) return { data: null, error: error.message }
  return { data: data || [], error: null }
}

/** 세션 삭제 */
export async function deleteSession(
  sessionId: string
): Promise<ActionResult<null>> {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("admin_user_id", guard.userId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

/** 세션 메시지 목록 조회 */
export async function getMessages(
  sessionId: string
): Promise<ListResult<ChatMessage>> {
  const guard = await requireAdmin()
  if (!guard.authorized) return { data: null, error: guard.error }

  const supabase = await createClient()

  // 세션 소유권 확인
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("admin_user_id", guard.userId)
    .single()

  if (!session) return { data: null, error: "세션을 찾을 수 없습니다." }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: data || [], error: null }
}

/** 메시지 전송 (RAG 파이프라인 실행) */
export async function sendMessage(
  sessionId: string,
  userMessage: string
): Promise<ActionResult<ChatMessage>> {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }
  }
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: "OPENAI_API_KEY가 설정되지 않았습니다." }
  }

  const supabase = await createClient()

  // 세션 소유권 + 매물 맥락 확인
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id, context_property_id")
    .eq("id", sessionId)
    .eq("admin_user_id", guard.userId)
    .single()

  if (!session) return { success: false, error: "세션을 찾을 수 없습니다." }

  // 사용자 메시지 저장
  const { error: userMsgError } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content: userMessage,
  })

  if (userMsgError) return { success: false, error: userMsgError.message }

  // RAG 파이프라인 실행
  try {
    const result = await chat(sessionId, userMessage, {
      contextPropertyId: session.context_property_id ?? undefined,
    })

    // 어시스턴트 응답 저장
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: result.content,
        sources: result.sources.map((s) => ({
          id: s.id,
          sourceFile: s.sourceFile,
          sectionTitle: s.sectionTitle,
          similarity: s.similarity,
        })),
      })
      .select()
      .single()

    if (assistantMsgError) {
      return { success: false, error: assistantMsgError.message }
    }

    // 첫 메시지면 세션 제목 자동 생성
    const { count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)

    if (count && count <= 2) {
      const title = await generateSessionTitle(userMessage)
      await supabase
        .from("chat_sessions")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", sessionId)
    } else {
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId)
    }

    return { success: true, data: assistantMsg }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "챗봇 응답 생성에 실패했습니다.",
    }
  }
}

/** 답변 피드백 제출 */
export async function submitFeedback(
  messageId: number,
  feedback: "helpful" | "not_helpful"
): Promise<ActionResult<null>> {
  const guard = await requireAdmin()
  if (!guard.authorized) return { success: false, error: guard.error }

  const supabase = await createClient()

  // 메시지가 본인 세션의 것인지 확인
  const { data: message } = await supabase
    .from("chat_messages")
    .select("id, session_id")
    .eq("id", messageId)
    .single()

  if (!message) return { success: false, error: "메시지를 찾을 수 없습니다." }

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", message.session_id)
    .eq("admin_user_id", guard.userId)
    .single()

  if (!session) return { success: false, error: "권한이 없습니다." }

  const { error } = await supabase
    .from("chat_messages")
    .update({ feedback })
    .eq("id", messageId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

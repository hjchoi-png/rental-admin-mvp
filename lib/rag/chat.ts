"use server"

import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/utils/supabase/server"
import { searchPolicies } from "./vector-search"
import type { PolicyChunk } from "./types"

const SYSTEM_PROMPT = `당신은 직방 단기임대(STR) 서비스의 CS 전문 상담원입니다.

## 역할
- 호스트와 게스트의 질문에 정책 기반으로 정확하게 답변합니다
- 모르는 내용은 "확인 후 안내드리겠습니다"라고 답합니다
- 절대 정책에 없는 내용을 추측하지 않습니다

## 톤앤매너
- 차갑지 않되, 책임은 정확히 구분
- "플랫폼이 책임지지 않습니다" 대신 "호스트와 게스트 간 합의 원칙"으로 안내
- 존댓말, 친절하되 전문적

## 답변 규칙
1. 반드시 [참조 문서]에 근거해서 답변하세요
2. 참조 문서에 없는 내용은 답변하지 마세요
3. 금액, 기간, 수수료 등 숫자는 정확히 인용하세요
4. 답변 끝에 참조한 문서를 표시하세요: 📄 출처: {source_file} > {section_title}

## 주의사항
- 법률 자문은 하지 않습니다. 법적 판단이 필요한 경우 전문가 상담을 권유하세요.
- 개인정보를 묻거나 받지 않습니다
- 타사 서비스 비교 질문은 "직방 단기임대 정책 기준으로" 답변하세요`

let anthropicClient: Anthropic | null = null

function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

interface ChatOptions {
  contextPropertyId?: string
}

interface ChatResult {
  content: string
  sources: PolicyChunk[]
}

/**
 * RAG 파이프라인 전체 오케스트레이션 (비스트리밍)
 *
 * 1. 질문 → 카테고리 분류
 * 2. 질문 → 벡터 검색
 * 3. 대화 이력 조회
 * 4. 검색 결과 + 시스템 프롬프트 + 대화 이력 → Claude 호출
 * 5. 응답 + 출처 반환
 */
export async function chat(
  sessionId: string,
  userMessage: string,
  options?: ChatOptions
): Promise<ChatResult> {
  // 1. 카테고리 분류
  const category = classifyQuestion(userMessage)

  // 2. 벡터 검색
  const sources = await searchPolicies(userMessage, {
    category,
    topK: 5,
    minSimilarity: 0.3,
  })

  // 3. 대화 이력 조회
  const supabase = await createClient()
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(10) // 최근 10개 메시지 (5턴)

  // 4. 사용자 메시지 구성
  const contextParts: string[] = []

  // 참조 문서
  if (sources.length > 0) {
    contextParts.push("[참조 문서]")
    for (const source of sources) {
      contextParts.push("---")
      contextParts.push(source.content)
      contextParts.push(`출처: ${source.sourceFile} > ${source.sectionTitle || ""}`)
    }
    contextParts.push("---\n")
  }

  // 매물 맥락
  if (options?.contextPropertyId) {
    const { data: property } = await supabase
      .from("properties")
      .select("title, address, status, inspection_result")
      .eq("id", options.contextPropertyId)
      .single()

    if (property) {
      contextParts.push("[매물 맥락]")
      contextParts.push(`매물명: ${property.title}`)
      contextParts.push(`주소: ${property.address}`)
      contextParts.push(`상태: ${property.status}`)
      contextParts.push("")
    }
  }

  // 현재 질문
  contextParts.push(`[현재 질문]\n${userMessage}`)

  // 대화 이력 구성
  const messages: Array<{ role: "user" | "assistant"; content: string }> = []
  if (history && history.length > 0) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }
  messages.push({ role: "user", content: contextParts.join("\n") })

  // 5. Claude 호출
  const client = getClient()
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  })

  const assistantContent =
    response.content[0].type === "text" ? response.content[0].text : ""

  return {
    content: assistantContent,
    sources,
  }
}

/** 질문 카테고리 분류 (키워드 기반) — 벡터 검색 필터링 보조 */
function classifyQuestion(query: string): string | undefined {
  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    policy: ["수수료", "가격", "요금", "정산", "결제", "환불", "보증금", "법", "등록", "위반", "호텔", "숙박"],
    operation: ["검수", "승인", "반려", "금칙어", "사진", "보완", "검토"],
    faq: ["어떻게", "뭐", "무엇", "가능", "불가", "할 수", "되나요"],
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => query.includes(kw))) {
      return category
    }
  }

  return undefined
}

/** 세션 제목 자동 생성 (첫 질문 기반) */
export async function generateSessionTitle(firstMessage: string): Promise<string> {
  // 간단하게 첫 질문의 앞 30자를 제목으로
  const title = firstMessage.slice(0, 30).trim()
  return title + (firstMessage.length > 30 ? "..." : "")
}

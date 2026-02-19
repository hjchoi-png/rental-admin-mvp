"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Loader2, Bot, User, FileText, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getMessages, sendMessage, submitFeedback } from "./actions"

interface Message {
  id: number
  session_id: string
  role: "user" | "assistant"
  content: string
  sources: Array<{
    id: number
    sourceFile: string
    sectionTitle: string
    similarity: number
  }> | null
  feedback?: "helpful" | "not_helpful" | null
  created_at: string
}

interface ChatInterfaceProps {
  sessionId: string
  onSessionUpdate: () => void
}

const QUICK_QUESTIONS = [
  "최소 계약 기간은 어떻게 되나요?",
  "수수료는 어떻게 계산되나요?",
  "보증금 반환 절차는?",
  "매물 검수 기준이 뭔가요?",
  "환불 정책을 알려주세요",
]

export default function ChatInterface({
  sessionId,
  onSessionUpdate,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 메시지 목록 로드
  useEffect(() => {
    async function loadMessages() {
      setIsInitializing(true)
      const result = await getMessages(sessionId)
      if (result.data) {
        setMessages(result.data as Message[])
      }
      setIsInitializing(false)
    }
    loadMessages()
  }, [sessionId])

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return

    setInput("")
    setIsLoading(true)

    // 낙관적 업데이트 — 사용자 메시지 즉시 표시
    const tempUserMsg: Message = {
      id: Date.now(),
      session_id: sessionId,
      role: "user",
      content: messageText,
      sources: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const result = await sendMessage(sessionId, messageText)
      if (result.success) {
        setMessages((prev) => [...prev, result.data as Message])
        onSessionUpdate()
      } else {
        // 에러 시 시스템 메시지로 표시
        const errorMsg: Message = {
          id: Date.now() + 1,
          session_id: sessionId,
          role: "assistant",
          content: `오류가 발생했습니다: ${result.error}`,
          sources: null,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    } catch {
      const errorMsg: Message = {
        id: Date.now() + 1,
        session_id: sessionId,
        role: "assistant",
        content: "네트워크 오류가 발생했습니다. 다시 시도해주세요.",
        sources: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleFeedback = async (messageId: number, feedback: "helpful" | "not_helpful") => {
    const result = await submitFeedback(messageId, feedback)
    if (result.success) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full border rounded-lg bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <WelcomeScreen onQuickQuestion={handleSend} />
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onFeedback={handleFeedback}
            />
          ))
        )}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div className="bg-muted/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                답변 생성 중...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="정책에 대해 질문하세요..."
            className="flex-1 resize-none border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[42px] max-h-[120px]"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[42px] w-[42px] flex-shrink-0"
          >
            <Send className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  )
}

function WelcomeScreen({
  onQuickQuestion,
}: {
  onQuickQuestion: (q: string) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-4xl mb-3">🤖</div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        직방 단기임대 CS 도우미
      </h3>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        정책 문서를 기반으로 답변합니다. 아래 질문을 클릭하거나 직접 입력하세요.
      </p>
      <div className="flex flex-wrap gap-2 max-w-md justify-center">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onQuickQuestion(q)}
            className="text-xs px-3 py-2 rounded-lg border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  onFeedback,
}: {
  message: Message
  onFeedback: (messageId: number, feedback: "helpful" | "not_helpful") => void
}) {
  const isUser = message.role === "user"

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* 아바타 */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-foreground/10" : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-foreground" strokeWidth={1.5} />
        ) : (
          <Bot className="h-4 w-4 text-primary" strokeWidth={1.5} />
        )}
      </div>

      {/* 메시지 */}
      <div className={`max-w-[75%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block rounded-xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-foreground"
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* 출처 표시 */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.sources.map((source, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/30 px-2 py-1 rounded-md"
              >
                <FileText className="h-3 w-3" strokeWidth={1.5} />
                {source.sourceFile}
                {source.sectionTitle && ` > ${source.sectionTitle}`}
              </span>
            ))}
          </div>
        )}

        {/* 피드백 버튼 (어시스턴트 메시지만) */}
        {!isUser && (
          <div className="mt-1.5 flex items-center gap-1">
            <button
              onClick={() => onFeedback(message.id, "helpful")}
              className={`p-1 rounded transition-colors ${
                message.feedback === "helpful"
                  ? "text-green-600 bg-green-50"
                  : "text-muted-foreground/40 hover:text-green-600 hover:bg-green-50"
              }`}
              title="도움이 됐어요"
            >
              <ThumbsUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => onFeedback(message.id, "not_helpful")}
              className={`p-1 rounded transition-colors ${
                message.feedback === "not_helpful"
                  ? "text-red-500 bg-red-50"
                  : "text-muted-foreground/40 hover:text-red-500 hover:bg-red-50"
              }`}
              title="도움이 안 됐어요"
            >
              <ThumbsDown className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

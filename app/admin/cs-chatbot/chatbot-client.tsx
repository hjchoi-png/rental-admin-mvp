"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, MessageSquare, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createSession, deleteSession, getSessions } from "./actions"
import ChatInterface from "./chat-interface"

interface ChatSession {
  id: string
  title: string | null
  context_property_id: string | null
  created_at: string
  updated_at: string
}

interface PropertyContext {
  id: string
  title: string
  address: string
  status: string
}

interface ChatbotClientProps {
  initialSessions: ChatSession[]
  initialPropertyContext?: PropertyContext | null
}

export default function ChatbotClient({
  initialSessions,
  initialPropertyContext,
}: ChatbotClientProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessions[0]?.id || null
  )
  const [isCreating, setIsCreating] = useState(false)
  const [propertyContext, setPropertyContext] = useState<PropertyContext | null>(
    initialPropertyContext || null
  )

  // 매물 맥락이 있으면 자동으로 새 세션 생성
  useEffect(() => {
    if (initialPropertyContext) {
      handleNewSessionWithContext(initialPropertyContext.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNewSession = async () => {
    setIsCreating(true)
    try {
      const result = await createSession()
      if (result.success) {
        setSessions((prev) => [result.data, ...prev])
        setActiveSessionId(result.data.id)
        setPropertyContext(null)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleNewSessionWithContext = async (propertyId: string) => {
    setIsCreating(true)
    try {
      const result = await createSession(propertyId)
      if (result.success) {
        setSessions((prev) => [result.data, ...prev])
        setActiveSessionId(result.data.id)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("이 대화를 삭제하시겠습니까?")) return
    const result = await deleteSession(sessionId)
    if (result.success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSessionId === sessionId) {
        setActiveSessionId(sessions.find((s) => s.id !== sessionId)?.id || null)
      }
    }
  }

  const handleSessionUpdate = async () => {
    const result = await getSessions()
    if (result.data) {
      setSessions(result.data)
    }
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* 좌측: 세션 목록 */}
      <div className="w-64 flex-shrink-0 flex flex-col border rounded-lg bg-white">
        <div className="p-3 border-b">
          <Button
            onClick={handleNewSession}
            disabled={isCreating}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
            새 대화
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              대화가 없습니다
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  activeSessionId === session.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-foreground"
                }`}
              >
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-sm truncate">
                      {session.title || "새 대화"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 pl-5.5">
                    {formatDate(session.updated_at)}
                  </p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteSession(session.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 우측: 채팅 영역 */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* 매물 맥락 배지 */}
        {propertyContext && activeSessionId && activeSession?.context_property_id === propertyContext.id && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Home className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
            <span className="text-sm text-blue-800">
              <span className="font-medium">{propertyContext.title}</span>
              <span className="text-blue-600 ml-2">{propertyContext.address}</span>
            </span>
            <Badge variant="outline" className="ml-auto text-[11px]">
              매물 맥락 연동
            </Badge>
          </div>
        )}

        {activeSessionId ? (
          <ChatInterface
            key={activeSessionId}
            sessionId={activeSessionId}
            onSessionUpdate={handleSessionUpdate}
          />
        ) : (
          <EmptyState onNewSession={handleNewSession} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ onNewSession }: { onNewSession: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full border rounded-lg bg-white">
      <div className="text-5xl mb-4">💬</div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        CS 정책 도우미
      </h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
        직방 단기임대 정책에 대해 질문하세요.
        <br />
        정책 문서를 기반으로 정확한 답변을 드립니다.
      </p>
      <Button onClick={onNewSession}>
        <Plus className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
        대화 시작하기
      </Button>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "방금"
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

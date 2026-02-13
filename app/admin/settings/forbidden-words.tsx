"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Shield, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  fetchForbiddenWords,
  addForbiddenWord,
  deleteForbiddenWord,
  type ForbiddenWord,
} from "./actions"

const categoryConfig: Record<string, { label: string; color: string }> = {
  accommodation_fraud: { label: "숙박업 오인", color: "bg-red-100 text-red-700" },
  external_contact: { label: "외부 연락 유도", color: "bg-orange-100 text-orange-700" },
  direct_transaction: { label: "직거래 유도", color: "bg-purple-100 text-purple-700" },
  contact_pattern: { label: "연락처 패턴", color: "bg-blue-100 text-blue-700" },
}

export default function ForbiddenWordsManager() {
  const { toast } = useToast()
  const [words, setWords] = useState<ForbiddenWord[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>("all")

  // 새 금칙어 폼
  const [newWord, setNewWord] = useState("")
  const [newCategory, setNewCategory] = useState("accommodation_fraud")
  const [newSeverity, setNewSeverity] = useState("reject")
  const [newDescription, setNewDescription] = useState("")
  const [newIsRegex, setNewIsRegex] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadWords = useCallback(async () => {
    try {
      const { data, error } = await fetchForbiddenWords()
      if (error) throw new Error(error)
      setWords(data || [])
    } catch (error) {
      toast({
        title: "금칙어 로드 실패",
        description: error instanceof Error ? error.message : "오류 발생",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  const handleAdd = async () => {
    if (!newWord.trim()) {
      toast({ title: "금칙어를 입력해주세요", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const result = await addForbiddenWord(
        newWord.trim(),
        newCategory,
        newSeverity,
        newDescription,
        newIsRegex
      )
      if (result.success) {
        toast({ title: "금칙어가 추가되었습니다" })
        setAddDialogOpen(false)
        setNewWord("")
        setNewDescription("")
        setNewIsRegex(false)
        await loadWords()
      } else {
        throw new Error(result.error || "추가 실패")
      }
    } catch (error) {
      toast({
        title: "추가 실패",
        description: error instanceof Error ? error.message : "오류 발생",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (wordId: string) => {
    try {
      const result = await deleteForbiddenWord(wordId)
      if (result.success) {
        toast({ title: "금칙어가 삭제되었습니다" })
        setDeleteTarget(null)
        await loadWords()
      } else {
        throw new Error(result.error || "삭제 실패")
      }
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: error instanceof Error ? error.message : "오류 발생",
        variant: "destructive",
      })
    }
  }

  const filteredWords = activeCategory === "all"
    ? words
    : words.filter((w) => w.category === activeCategory)

  // 카테고리별 개수
  const categoryCounts = words.reduce((acc, w) => {
    acc[w.category] = (acc[w.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return <p className="text-muted-foreground text-sm">금칙어 로딩 중...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">금칙어 관리</h3>
          <Badge variant="secondary">{words.length}개</Badge>
        </div>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          금칙어 추가
        </Button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          전체 ({words.length})
        </button>
        {Object.entries(categoryConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              activeCategory === key
                ? config.color + " font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {config.label} ({categoryCounts[key] || 0})
          </button>
        ))}
      </div>

      {/* 금칙어 목록 */}
      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
        {filteredWords.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            등록된 금칙어가 없습니다
          </div>
        ) : (
          filteredWords.map((word) => {
            const catConfig = categoryConfig[word.category]
            return (
              <div key={word.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-mono text-sm font-medium">{word.word}</span>
                  {word.is_regex && (
                    <Badge variant="outline" className="text-xs">정규식</Badge>
                  )}
                  <Badge className={`text-xs ${catConfig?.color || ""}`}>
                    {catConfig?.label || word.category}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${word.severity === "reject" ? "border-red-300 text-red-600" : "border-yellow-300 text-yellow-600"}`}
                  >
                    {word.severity === "reject" ? "반려" : "플래그"}
                  </Badge>
                  {word.description && (
                    <span className="text-xs text-muted-foreground">{word.description}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(word.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })
        )}
      </div>

      {/* 금칙어 추가 다이얼로그 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>금칙어 추가</DialogTitle>
            <DialogDescription>
              새로운 금칙어를 등록합니다. 이 단어가 포함된 매물은 자동으로 검출됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>금칙어</Label>
              <Input
                placeholder="예: 카톡, 직거래, 010-\\d{4}-\\d{4}"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>심각도</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
              >
                <option value="reject">반려 (자동 반려)</option>
                <option value="flag">플래그 (수동 검토)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>설명 (선택)</Label>
              <Input
                placeholder="왜 이 단어가 금칙어인지 설명"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-regex"
                checked={newIsRegex}
                onCheckedChange={(checked) => setNewIsRegex(checked as boolean)}
              />
              <Label htmlFor="is-regex" className="text-sm">정규식 패턴으로 사용</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "추가 중..." : "추가하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>금칙어 삭제</DialogTitle>
            <DialogDescription>
              이 금칙어를 정말 삭제하시겠습니까? 삭제하면 해당 단어는 더 이상 자동 검출되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              삭제하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

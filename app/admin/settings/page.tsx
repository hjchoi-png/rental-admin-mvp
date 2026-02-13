"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash2, Edit2, Check, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  fetchAdminSettings,
  updateAdminSettings,
  addRejectionTemplate,
  updateRejectionTemplate,
  deleteRejectionTemplate,
  updateInspectionSettings,
  type AdminSettings,
  type RejectionTemplate,
} from "./actions"
import ForbiddenWordsManager from "./forbidden-words"

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<RejectionTemplate | null>(null)
  const [newTemplate, setNewTemplate] = useState({ title: "", content: "" })

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await fetchAdminSettings()
      if (error) throw new Error(error)
      setSettings(data)
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "설정을 불러오지 못했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleAutoApprovalToggle = async (enabled: boolean) => {
    if (!settings) return
    try {
      const result = await updateAdminSettings({
        id: settings.id,
        auto_approval_enabled: enabled,
      })
      if (result.success) {
        toast({ title: "설정 저장", description: "자동 승인 설정이 변경되었습니다." })
        await loadSettings()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "설정 변경 실패",
        variant: "destructive",
      })
    }
  }

  const handleThresholdUpdate = async () => {
    if (!settings) return
    try {
      const result = await updateAdminSettings({
        id: settings.id,
        auto_approval_threshold: settings.auto_approval_threshold,
      })
      if (result.success) {
        toast({ title: "설정 저장", description: "임계값이 변경되었습니다." })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "설정 변경 실패",
        variant: "destructive",
      })
    }
  }

  const handleAddTemplate = async () => {
    if (!newTemplate.title.trim() || !newTemplate.content.trim()) {
      toast({ title: "입력 오류", description: "제목과 내용을 모두 입력해주세요.", variant: "destructive" })
      return
    }
    try {
      const result = await addRejectionTemplate(newTemplate)
      if (result.success) {
        toast({ title: "템플릿 추가", description: "새 템플릿이 추가되었습니다." })
        setAddDialogOpen(false)
        setNewTemplate({ title: "", content: "" })
        await loadSettings()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "템플릿 추가 실패",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return
    try {
      const result = await updateRejectionTemplate(selectedTemplate.id, {
        title: selectedTemplate.title,
        content: selectedTemplate.content,
      })
      if (result.success) {
        toast({ title: "템플릿 수정", description: "템플릿이 수정되었습니다." })
        setEditDialogOpen(false)
        setSelectedTemplate(null)
        await loadSettings()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "템플릿 수정 실패",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return
    try {
      const result = await deleteRejectionTemplate(selectedTemplate.id)
      if (result.success) {
        toast({ title: "템플릿 삭제", description: "템플릿이 삭제되었습니다." })
        setDeleteDialogOpen(false)
        setSelectedTemplate(null)
        await loadSettings()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "템플릿 삭제 실패",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-muted-foreground">설정을 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">어드민 설정</h1>
          <p className="text-muted-foreground mt-2">
            매물 승인 관련 설정과 반려 사유 템플릿을 관리합니다.
          </p>
        </div>

        {/* 자동 승인 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>자동 승인 설정</CardTitle>
            <CardDescription>
              AI 점수에 따라 매물을 자동으로 승인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-approval">자동 승인 활성화</Label>
                <p className="text-sm text-muted-foreground">
                  임계값 이상의 AI 점수를 받은 매물을 자동으로 승인합니다.
                </p>
              </div>
              <Switch
                id="auto-approval"
                checked={settings.auto_approval_enabled}
                onCheckedChange={handleAutoApprovalToggle}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="threshold">자동 승인 임계값 (현재: {settings.auto_approval_threshold}점)</Label>
              <div className="flex gap-2">
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.auto_approval_threshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      auto_approval_threshold: parseInt(e.target.value) || 0,
                    })
                  }
                  className="max-w-xs"
                />
                <Button onClick={handleThresholdUpdate}>저장</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                AI 점수가 이 값 이상인 매물은 자동으로 승인됩니다. (0-100)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 검수 규칙 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>검수 규칙 설정</CardTitle>
            <CardDescription>
              시스템 규칙 기반 자동 검수 기능을 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>금칙어 체크</Label>
                <p className="text-sm text-muted-foreground">
                  금칙어가 포함된 매물을 자동으로 탐지합니다.
                </p>
              </div>
              <Switch
                checked={settings.forbidden_words_enabled !== false}
                onCheckedChange={async (checked) => {
                  try {
                    const result = await updateInspectionSettings({
                      id: settings.id,
                      forbidden_words_enabled: checked,
                    })
                    if (result.success) {
                      toast({ title: "설정 저장", description: "금칙어 체크 설정이 변경되었습니다." })
                      await loadSettings()
                    }
                  } catch {
                    toast({ title: "오류", description: "설정 변경 실패", variant: "destructive" })
                  }
                }}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>주소 중복 체크</Label>
                <p className="text-sm text-muted-foreground">
                  동일한 주소(동/호)의 매물이 중복 등록되는 것을 방지합니다.
                </p>
              </div>
              <Switch
                checked={settings.duplicate_check_enabled !== false}
                onCheckedChange={async (checked) => {
                  try {
                    const result = await updateInspectionSettings({
                      id: settings.id,
                      duplicate_check_enabled: checked,
                    })
                    if (result.success) {
                      toast({ title: "설정 저장", description: "중복 체크 설정이 변경되었습니다." })
                      await loadSettings()
                    }
                  } catch {
                    toast({ title: "오류", description: "설정 변경 실패", variant: "destructive" })
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 금칙어 관리 */}
        <Card>
          <CardContent className="pt-6">
            <ForbiddenWordsManager />
          </CardContent>
        </Card>

        {/* 반려 사유 템플릿 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>반려 사유 템플릿</CardTitle>
                <CardDescription>
                  자주 사용하는 반려 사유를 템플릿으로 저장하여 빠르게 사용할 수 있습니다.
                </CardDescription>
              </div>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                템플릿 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {settings.rejection_templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  등록된 템플릿이 없습니다.
                </p>
              ) : (
                settings.rejection_templates.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{template.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.content}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTemplate(template)
                            setEditDialogOpen(true)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTemplate(template)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 템플릿 추가 다이얼로그 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반려 사유 템플릿 추가</DialogTitle>
            <DialogDescription>새로운 반려 사유 템플릿을 추가합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">제목</Label>
              <Input
                id="new-title"
                placeholder="예: 이미지 품질 불량"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-content">내용</Label>
              <Textarea
                id="new-content"
                placeholder="반려 사유 내용을 입력하세요..."
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddTemplate}>
              <Check className="h-4 w-4 mr-1" />
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 템플릿 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반려 사유 템플릿 수정</DialogTitle>
            <DialogDescription>템플릿 내용을 수정합니다.</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">제목</Label>
                <Input
                  id="edit-title"
                  value={selectedTemplate.title}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">내용</Label>
                <Textarea
                  id="edit-content"
                  value={selectedTemplate.content}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, content: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdateTemplate}>
              <Check className="h-4 w-4 mr-1" />
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 템플릿 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              <Trash2 className="h-4 w-4 mr-1" />
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

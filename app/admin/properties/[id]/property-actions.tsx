"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { approveProperty, rejectProperty } from "./actions"
import { runAiInspection } from "./ai-actions"

interface PropertyActionsProps {
  propertyId: string
  currentStatus: "pending" | "approved" | "rejected"
}

export default function PropertyActions({
  propertyId,
  currentStatus,
}: PropertyActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      const result = await approveProperty(propertyId)
      if (result.success) {
        toast({
          title: "승인되었습니다",
          description: "매물이 승인되었습니다.",
        })
        router.refresh()
      } else {
        throw new Error(result.error || "승인 실패")
      }
    } catch (error) {
      toast({
        title: "승인 실패",
        description:
          error instanceof Error ? error.message : "승인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectClick = () => {
    setRejectComment("")
    setRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      toast({
        title: "반려 사유를 입력해주세요",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await rejectProperty(propertyId, rejectComment)
      if (result.success) {
        toast({
          title: "반려되었습니다",
          description: "매물이 반려되었습니다.",
        })
        setRejectDialogOpen(false)
        setRejectComment("")
        router.refresh()
      } else {
        throw new Error(result.error || "반려 실패")
      }
    } catch (error) {
      toast({
        title: "반려 실패",
        description:
          error instanceof Error ? error.message : "반려 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAiInspection = async () => {
    setIsAiLoading(true)
    try {
      const result = await runAiInspection(propertyId)
      if (result.success) {
        toast({
          title: "AI 검수 완료",
          description: `총점: ${result.data?.totalScore}점`,
        })
        router.refresh()
      } else {
        throw new Error(result.error || "AI 검수 실패")
      }
    } catch (error) {
      toast({
        title: "AI 검수 실패",
        description: error instanceof Error ? error.message : "AI 검수 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsAiLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleApprove}
          disabled={currentStatus === "approved" || isLoading}
          className="flex-1"
          size="lg"
        >
          <Check className="h-4 w-4 mr-2" />
          승인
        </Button>
        <Button
          onClick={handleRejectClick}
          disabled={currentStatus === "rejected" || isLoading}
          variant="destructive"
          className="flex-1"
          size="lg"
        >
          <X className="h-4 w-4 mr-2" />
          반려
        </Button>
      </div>

      <Button
        onClick={handleAiInspection}
        disabled={isAiLoading}
        variant="outline"
        size="lg"
        className="w-full"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {isAiLoading ? "AI 검수 중... (약 10~20초)" : "AI 재검수 실행"}
      </Button>

      {/* 반려 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>매물 반려</DialogTitle>
            <DialogDescription>
              반려 사유를 입력해주세요. 이 사유는 호스트에게 표시됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-comment">반려 사유</Label>
              <Textarea
                id="reject-comment"
                placeholder="반려 사유를 입력해주세요..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectComment("")
              }}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isLoading}
            >
              {isLoading ? "처리 중..." : "반려하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

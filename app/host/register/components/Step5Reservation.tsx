"use client"

import { useFormContext } from "react-hook-form"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { RegisterFormData } from "../types"

export default function Step5Reservation() {
  const { setValue, watch, formState: { errors } } = useFormContext<RegisterFormData>()

  return (
    <div className="space-y-6">
      <Card className="host-card">
        <CardHeader>
          <CardTitle className="text-lg">계약 기간 설정</CardTitle>
          <CardDescription>게스트의 최소/최대 계약 기간을 설정해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 최소 계약 기간 */}
          <div className="space-y-2">
            <Label className="host-label">최소 계약 기간 <span className="text-destructive">*</span></Label>
            <Select
              value={String(watch("minStayWeeks") || 1)}
              onValueChange={(v) => setValue("minStayWeeks", Number(v), { shouldValidate: true })}
            >
              <SelectTrigger className="host-input">
                <SelectValue placeholder="선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    {w}주 {w >= 4 ? `(약 ${Math.floor(w / 4)}개월)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.minStayWeeks && (
              <p className="text-sm text-destructive">{errors.minStayWeeks.message}</p>
            )}
          </div>

          {/* 최대 계약 기간 */}
          <div className="space-y-2">
            <Label className="host-label">최대 계약 기간</Label>
            <div className="p-3 bg-muted/50 rounded-xl text-sm text-muted-foreground">
              12주 (3개월) — 시스템 고정값
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

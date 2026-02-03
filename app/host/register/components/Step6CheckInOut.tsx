"use client"

import { useFormContext } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TIME_OPTIONS, type RegisterFormData } from "../types"

export default function Step6CheckInOut() {
  const { setValue, watch, formState: { errors } } = useFormContext<RegisterFormData>()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>입실 규칙</CardTitle>
          <CardDescription>게스트의 입실 시간과 방식을 설정해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 입실 시간 */}
          <div className="space-y-2">
            <Label>입실 시간 <span className="text-destructive">*</span></Label>
            <Select
              value={watch("checkinTime")}
              onValueChange={(v) => setValue("checkinTime", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="시간 선택" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 입실 방식 */}
          <div className="space-y-2">
            <Label>입실 방식 <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={watch("checkinMethod")}
              onValueChange={(v) => setValue("checkinMethod", v as "비대면" | "대면", { shouldValidate: true })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="비대면" id="checkin-untact" />
                <Label htmlFor="checkin-untact" className="cursor-pointer">비대면</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="대면" id="checkin-contact" />
                <Label htmlFor="checkin-contact" className="cursor-pointer">대면</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>퇴실 규칙</CardTitle>
          <CardDescription>게스트의 퇴실 시간과 방식을 설정해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 퇴실 시간 */}
          <div className="space-y-2">
            <Label>퇴실 시간 <span className="text-destructive">*</span></Label>
            <Select
              value={watch("checkoutTime")}
              onValueChange={(v) => setValue("checkoutTime", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="시간 선택" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 퇴실 방식 */}
          <div className="space-y-2">
            <Label>퇴실 방식 <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={watch("checkoutMethod")}
              onValueChange={(v) => setValue("checkoutMethod", v as "비대면" | "대면", { shouldValidate: true })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="비대면" id="checkout-untact" />
                <Label htmlFor="checkout-untact" className="cursor-pointer">비대면</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="대면" id="checkout-contact" />
                <Label htmlFor="checkout-contact" className="cursor-pointer">대면</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

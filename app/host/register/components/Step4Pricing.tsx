"use client"

import { useState } from "react"
import { useFormContext, useFieldArray } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import {
  CANCELLATION_POLICIES,
  CANCELLATION_TABLE,
  MAINTENANCE_TEMPLATES,
  type RegisterFormData,
} from "../types"

function formatNumber(n: number | string): string {
  const num = typeof n === "string" ? parseInt(n.replace(/,/g, "")) : n
  if (isNaN(num)) return ""
  return num.toLocaleString()
}

function NumberInput({
  value,
  onChange,
  placeholder,
  suffix,
  max,
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
  suffix?: string
  max?: number
}) {
  const [display, setDisplay] = useState(value ? formatNumber(value) : "")

  return (
    <div className="relative">
      <Input
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "")
          const num = parseInt(raw) || 0
          if (max && num > max) return
          setDisplay(raw ? formatNumber(raw) : "")
          onChange(num)
        }}
        placeholder={placeholder}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}

export default function Step4Pricing() {
  const { setValue, watch, register, formState: { errors } } = useFormContext<RegisterFormData>()
  const { fields: ltFields, append: ltAppend, remove: ltRemove } = useFieldArray({ name: "longTermDiscounts" })
  const { fields: imFields, append: imAppend, remove: imRemove } = useFieldArray({ name: "instantMoveDiscounts" })

  const cleaningFree = watch("cleaningFree")
  const petAllowed = watch("petAllowed")
  const cancellationPolicy = watch("cancellationPolicy")
  const [templateOpen, setTemplateOpen] = useState(false)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 기본 요금 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 요금</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>주당 요금 <span className="text-destructive">*</span></Label>
            <NumberInput
              value={watch("weeklyPrice") || 0}
              onChange={(n) => setValue("weeklyPrice", n, { shouldValidate: true })}
              placeholder="금액을 입력해주세요"
              suffix="원"
              max={10000000}
            />
            {errors.weeklyPrice && (
              <p className="text-sm text-destructive">{errors.weeklyPrice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>보증금</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              300,000원 <span className="text-muted-foreground">(시스템 고정값)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              보증금은 직방에서 안전하게 보관하며, 퇴실 시 호스트님께서 상태를 확인한 후 퇴실 확정 버튼을 누르시면 게스트에게 반환됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 장기 계약 할인 */}
      <Card>
        <CardHeader>
          <CardTitle>장기 계약 할인</CardTitle>
          <CardDescription>기간에 따라 할인율을 설정해주세요 (선택)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ltFields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <Select
                value={String(watch(`longTermDiscounts.${i}.weeks`) || "")}
                onValueChange={(v) => setValue(`longTermDiscounts.${i}.weeks`, Number(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="기간" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, j) => j + 2).map((w) => (
                    <SelectItem key={w} value={String(w)}>{w}주</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                max={100}
                {...register(`longTermDiscounts.${i}.discountPct`, { valueAsNumber: true })}
                placeholder="할인율"
                className="w-24"
              />
              <span className="text-sm">%</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => ltRemove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {ltFields.length < 11 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => ltAppend({ weeks: 2, discountPct: 5 })}
            >
              <Plus className="h-4 w-4 mr-1" /> 추가
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 즉시 입주 할인 */}
      <Card>
        <CardHeader>
          <CardTitle>즉시 입주 할인</CardTitle>
          <CardDescription>입주일이 가까운 경우 할인 금액을 설정해주세요 (선택)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {imFields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <Select
                value={String(watch(`instantMoveDiscounts.${i}.days`) ?? "")}
                onValueChange={(v) => setValue(`instantMoveDiscounts.${i}.days`, Number(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="기간" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">오늘</SelectItem>
                  {Array.from({ length: 7 }, (_, j) => j + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}일</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(watch(`instantMoveDiscounts.${i}.amount`) || "")}
                onValueChange={(v) => setValue(`instantMoveDiscounts.${i}.amount`, Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="할인 금액" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 30 }, (_, j) => (j + 1) * 10000).map((a) => (
                    <SelectItem key={a} value={String(a)}>{(a / 10000)}만원</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="icon" onClick={() => imRemove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {imFields.length < 8 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imAppend({ days: 0, amount: 10000 })}
            >
              <Plus className="h-4 w-4 mr-1" /> 추가
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 관리비 */}
      <Card>
        <CardHeader>
          <CardTitle>관리비</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>1주 관리비</Label>
            <NumberInput
              value={watch("maintenanceFee") || 0}
              onChange={(n) => setValue("maintenanceFee", n)}
              placeholder="금액을 입력해주세요"
              suffix="원"
              max={1000000}
            />
          </div>
          <div className="space-y-3">
            <Label>포함 항목</Label>
            <div className="flex gap-6">
              {(["전기", "수도", "가스"] as const).map((item) => {
                const key = `maintenance${item === "전기" ? "Electric" : item === "수도" ? "Water" : "Gas"}` as keyof RegisterFormData
                return (
                  <div key={item} className="flex items-center gap-2">
                    <Switch
                      checked={watch(key) as boolean}
                      onCheckedChange={(v) => setValue(key, v as never)}
                    />
                    <span className="text-sm">{item}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>관리비 상세 설명</Label>
              <Button type="button" variant="link" size="sm" onClick={() => setTemplateOpen(true)}>
                추천 문구 보기
              </Button>
            </div>
            <Textarea
              {...register("maintenanceDetail")}
              rows={3}
              placeholder="관리비에 대해 상세히 안내해주세요"
              maxLength={1000}
            />
          </div>

          <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>관리비 추천 문구</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {MAINTENANCE_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => {
                      setValue("maintenanceDetail", t.text)
                      setTemplateOpen(false)
                    }}
                    className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.text}</p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* 청소비 */}
      <Card>
        <CardHeader>
          <CardTitle>청소비</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={cleaningFree}
              onCheckedChange={(v) => {
                setValue("cleaningFree", v)
                if (v) {
                  setValue("checkoutCleaningFee", 0)
                  setValue("petCleaningFee", 0)
                }
              }}
            />
            <span className="text-sm">퇴실 청소비 무료</span>
          </div>
          {!cleaningFree && (
            <>
              <div className="space-y-2">
                <Label>퇴실 청소비</Label>
                <NumberInput
                  value={watch("checkoutCleaningFee") || 0}
                  onChange={(n) => setValue("checkoutCleaningFee", n)}
                  placeholder="금액을 입력해주세요"
                  suffix="원"
                  max={300000}
                />
              </div>
              {petAllowed && (
                <div className="space-y-2">
                  <Label>반려동물 청소비</Label>
                  <NumberInput
                    value={watch("petCleaningFee") || 0}
                    onChange={(n) => setValue("petCleaningFee", n)}
                    placeholder="금액을 입력해주세요"
                    suffix="원"
                    max={300000}
                  />
                  <p className="text-xs text-muted-foreground">
                    반려동물 동반 시 추가로 발생하는 청소 비용입니다.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 위약금 규정 */}
      <Card>
        <CardHeader>
          <CardTitle>위약금 규정 <span className="text-destructive">*</span></CardTitle>
          <CardDescription>위약금 규정을 선택해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={cancellationPolicy}
            onValueChange={(v) => setValue("cancellationPolicy", v as typeof CANCELLATION_POLICIES[number], { shouldValidate: true })}
            className="flex gap-4"
          >
            {CANCELLATION_POLICIES.map((p) => (
              <div key={p} className="flex items-center space-x-2">
                <RadioGroupItem value={p} id={`cancel-${p}`} />
                <Label htmlFor={`cancel-${p}`} className="cursor-pointer">{p}</Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            유연: 공실을 빨리 채우고 싶은 매물 / 표준: 일반적인 단기임대 / 엄격: 성수기·고가 매물
          </p>
          {errors.cancellationPolicy && (
            <p className="text-sm text-destructive">{errors.cancellationPolicy.message}</p>
          )}

          {/* 위약금 상세 표 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 border text-left">구분</th>
                  <th className={`p-2 border ${cancellationPolicy === "유연" ? "bg-primary/10 font-bold" : ""}`}>유연</th>
                  <th className={`p-2 border ${cancellationPolicy === "표준" ? "bg-primary/10 font-bold" : ""}`}>표준</th>
                  <th className={`p-2 border ${cancellationPolicy === "엄격" ? "bg-primary/10 font-bold" : ""}`}>엄격</th>
                </tr>
              </thead>
              <tbody>
                {CANCELLATION_TABLE.map((row) => (
                  <tr key={row.label}>
                    <td className="p-2 border font-medium">{row.label}</td>
                    <td className={`p-2 border text-center ${cancellationPolicy === "유연" ? "bg-primary/5" : ""}`}>{row.flexible}</td>
                    <td className={`p-2 border text-center ${cancellationPolicy === "표준" ? "bg-primary/5" : ""}`}>{row.standard}</td>
                    <td className={`p-2 border text-center ${cancellationPolicy === "엄격" ? "bg-primary/5" : ""}`}>{row.strict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs space-y-1 text-muted-foreground">
            <p>&#8226; 입주 당일 취소는 불가합니다.</p>
            <p>&#8226; 위약금은 결제(예약) 시점의 임대료를 기준으로 합니다.</p>
            <p>&#8226; 관리비/청소비/보증금은 전액 환불됩니다.</p>
            <p className="text-amber-600 font-medium">
              &#8226; 호스트 사유로 인한 취소 시 100% 환불 + 임대료의 10% 위약금 지급
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cancellation-agree"
              checked={watch("cancellationAgreed") || false}
              onChange={(e) => setValue("cancellationAgreed", e.target.checked, { shouldValidate: true })}
              className="h-4 w-4"
            />
            <label htmlFor="cancellation-agree" className="text-sm cursor-pointer">
              위약금 규정 및 주의사항을 확인하였습니다.
            </label>
          </div>
          {errors.cancellationAgreed && (
            <p className="text-sm text-destructive">{errors.cancellationAgreed.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

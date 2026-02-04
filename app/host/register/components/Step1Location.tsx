"use client"

import { useFormContext } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { BUILDING_TYPES, PARKING_OPTIONS, type RegisterFormData } from "../types"
import AddressSearchDialog from "./AddressSearchDialog"

function CounterField({
  label,
  name,
  min = 0,
  max = 10,
  required = false,
}: {
  label: string
  name: keyof RegisterFormData
  min?: number
  max?: number
  required?: boolean
}) {
  const { setValue, watch, formState: { errors } } = useFormContext<RegisterFormData>()
  const value = (watch(name) as number) || 0

  return (
    <div className="space-y-1">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setValue(name, Math.max(min, value - 1) as never, { shouldValidate: true })}
          className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted"
        >
          -
        </button>
        <span className="w-8 text-center font-medium">{value}</span>
        <button
          type="button"
          onClick={() => setValue(name, Math.min(max, value + 1) as never, { shouldValidate: true })}
          className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted"
        >
          +
        </button>
      </div>
      {errors[name] && (
        <p className="text-sm text-destructive">{(errors[name] as { message?: string })?.message}</p>
      )}
    </div>
  )
}

export default function Step1Location() {
  const { setValue, watch, register, formState: { errors } } = useFormContext<RegisterFormData>()
  const dongNone = watch("dongNone")
  const parking = watch("parking")
  const areaUnit = watch("areaUnit") || "㎡"
  const buildingType = watch("buildingType")

  const handleAreaChange = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    if (areaUnit === "㎡") {
      setValue("areaSqm", num, { shouldValidate: true })
      setValue("areaPyeong", Math.round(num / 3.305785 * 100) / 100)
    } else {
      setValue("areaPyeong", num)
      setValue("areaSqm", Math.round(num * 3.305785 * 100) / 100, { shouldValidate: true })
    }
  }

  const toggleAreaUnit = () => {
    const newUnit = areaUnit === "㎡" ? "평" : "㎡"
    setValue("areaUnit", newUnit)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 주소 */}
      <Card data-field="address">
        <CardHeader>
          <CardTitle>주소 <span className="text-destructive">*</span></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressSearchDialog />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>동</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={dongNone}
                    onCheckedChange={(v) => {
                      setValue("dongNone", v)
                      if (v) setValue("dong", "")
                    }}
                  />
                  <span className="text-xs text-muted-foreground">동 정보 없음</span>
                </div>
              </div>
              <Input
                {...register("dong")}
                disabled={dongNone}
                placeholder="동 입력"
              />
              {!dongNone && errors.dong && (
                <p className="text-sm text-destructive">{errors.dong.message}</p>
              )}
            </div>
            <div className="space-y-2" data-field="ho">
              <Label>호 <span className="text-destructive">*</span></Label>
              <Input
                {...register("ho")}
                placeholder="호 입력"
              />
              {errors.ho && (
                <p className="text-sm text-destructive">{errors.ho.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 건물 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>건물 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>해당 층 <span className="text-destructive">*</span></Label>
            <Select
              value={watch("floorType") || (watch("floorNumber") ? String(watch("floorNumber")) : "")}
              onValueChange={(v) => {
                if (v === "반지하" || v === "옥탑방") {
                  setValue("floorType", v, { shouldValidate: true })
                  setValue("floorNumber", undefined)
                  setValue("totalFloors", 1) // 기본값 설정
                } else {
                  setValue("floorType", undefined)
                  setValue("floorNumber", Number(v), { shouldValidate: true })
                  setValue("totalFloors", Math.max(Number(v), watch("totalFloors") || 1))
                }
              }}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="반지하">반지하</SelectItem>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((f) => (
                  <SelectItem key={f} value={String(f)}>{f}층</SelectItem>
                ))}
                <SelectItem value="옥탑방">옥탑방</SelectItem>
              </SelectContent>
            </Select>
            {errors.floorNumber && (
              <p className="text-sm text-destructive">{errors.floorNumber.message}</p>
            )}
          </div>

          {/* 건물 유형 */}
          <div className="space-y-2" data-field="buildingType">
            <Label>건물 유형 <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {BUILDING_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue("buildingType", type, { shouldValidate: true })}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    buildingType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {errors.buildingType && (
              <p className="text-sm text-destructive">{errors.buildingType.message}</p>
            )}
            {(buildingType === "쉐어하우스" || buildingType === "게스트하우스") && (
              <p className="text-sm text-amber-600">{buildingType}는 1인실만 등록 가능합니다.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 공간 구조 */}
      <Card data-field="roomCount">
        <CardHeader>
          <CardTitle>공간 구조</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div data-field="roomCount">
              <CounterField label="방" name="roomCount" min={1} required />
            </div>
            <div data-field="bathroomCount">
              <CounterField label="화장실" name="bathroomCount" min={1} required />
            </div>
            <div data-field="kitchenCount">
              <CounterField label="주방" name="kitchenCount" min={1} required />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 전용 면적 */}
      <Card>
        <CardHeader>
          <CardTitle>전용 면적</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={areaUnit === "㎡" ? watch("areaSqm") || "" : watch("areaPyeong") || ""}
              onChange={(e) => handleAreaChange(e.target.value)}
              placeholder="면적 입력"
              className="flex-1"
            />
            <button
              type="button"
              onClick={toggleAreaUnit}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-muted min-w-[60px]"
            >
              {areaUnit}
            </button>
          </div>
          {watch("areaSqm") && watch("areaPyeong") && (
            <p className="text-xs text-muted-foreground">
              {watch("areaSqm")}㎡ = {watch("areaPyeong")}평
            </p>
          )}
          {errors.areaSqm && (
            <p className="text-sm text-destructive">{errors.areaSqm.message}</p>
          )}
        </CardContent>
      </Card>

      {/* 추가 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>추가 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 엘리베이터 */}
          <div className="space-y-2" data-field="hasElevator">
            <Label>엘리베이터 <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={watch("hasElevator") === undefined ? undefined : watch("hasElevator") ? "true" : "false"}
              onValueChange={(v) => setValue("hasElevator", v === "true", { shouldValidate: true })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="elevator-yes" />
                <Label htmlFor="elevator-yes" className="cursor-pointer">있음</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="elevator-no" />
                <Label htmlFor="elevator-no" className="cursor-pointer">없음</Label>
              </div>
            </RadioGroup>
            {errors.hasElevator && (
              <p className="text-sm text-destructive">{errors.hasElevator.message}</p>
            )}
          </div>

          {/* 주차 */}
          <div className="space-y-2" data-field="parking">
            <Label>주차 가능 여부 <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={parking}
              onValueChange={(v) => setValue("parking", v as typeof PARKING_OPTIONS[number], { shouldValidate: true })}
              className="flex gap-4"
            >
              {PARKING_OPTIONS.map((opt) => (
                <div key={opt} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={`parking-${opt}`} />
                  <Label htmlFor={`parking-${opt}`} className="cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {parking === "가능" && (
            <div className="space-y-4 pl-4 border-l-2">
              <div className="space-y-2">
                <Label>주차 방식</Label>
                <RadioGroup
                  value={watch("parkingType") || ""}
                  onValueChange={(v) => setValue("parkingType", v)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="자주식" id="parking-self" />
                    <Label htmlFor="parking-self" className="cursor-pointer">자주식</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="기계식" id="parking-machine" />
                    <Label htmlFor="parking-machine" className="cursor-pointer">기계식</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>주차 가능 대수</Label>
                <Select
                  value={String(watch("parkingCount") || 0)}
                  onValueChange={(v) => setValue("parkingCount", Number(v))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">선택 안함</SelectItem>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}대</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>주차 조건</Label>
                <Input
                  {...register("parkingCondition")}
                  placeholder="예: 선착순 1대, 월 10만원 별도"
                  maxLength={100}
                />
                {errors.parkingCondition && (
                  <p className="text-sm text-destructive">{errors.parkingCondition.message}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useFormContext } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AMENITY_OPTIONS, type RegisterFormData } from "../types"

export default function Step2Options() {
  const { setValue, watch, formState: { errors } } = useFormContext<RegisterFormData>()
  const amenities = watch("amenities") || []
  const petAllowed = watch("petAllowed")

  const toggleAmenity = (item: string) => {
    const next = amenities.includes(item)
      ? amenities.filter((a) => a !== item)
      : [...amenities, item]
    setValue("amenities", next)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>옵션 선택</CardTitle>
          <CardDescription>매물에서 제공하는 옵션을 선택해주세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {AMENITY_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleAmenity(item)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                  amenities.includes(item)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {amenities.length}개 선택됨
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>반려동물 동반 <span className="text-destructive">*</span></CardTitle>
          <CardDescription>반려동물 동반 가능 여부를 선택해주세요</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={petAllowed === undefined ? undefined : petAllowed ? "true" : "false"}
            onValueChange={(v) => setValue("petAllowed", v === "true", { shouldValidate: true })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="pet-yes" />
              <Label htmlFor="pet-yes" className="cursor-pointer">허용</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="pet-no" />
              <Label htmlFor="pet-no" className="cursor-pointer">불가</Label>
            </div>
          </RadioGroup>
          {errors.petAllowed && (
            <p className="text-sm text-destructive mt-2">{errors.petAllowed.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useFormContext } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { WRITING_GUIDES, type RegisterFormData } from "../types"
import WritingGuide from "./WritingGuide"
import ImageUploader from "./ImageUploader"

function CharCounter({ current, max }: { current: number; max: number }) {
  return (
    <span className={`text-xs ${current > max ? "text-destructive" : "text-muted-foreground"}`}>
      {current}/{max}자
    </span>
  )
}

export default function Step3Details() {
  const { register, watch, formState: { errors } } = useFormContext<RegisterFormData>()

  const shortTitle = watch("shortTitle") || ""
  const description = watch("description") || ""
  const locationTransport = watch("locationTransport") || ""
  const usageGuide = watch("usageGuide") || ""
  const hostMessage = watch("hostMessage") || ""

  return (
    <div className="space-y-6">
      {/* 한 줄 소개 */}
      <Card className="host-card">
        <CardHeader>
          <CardTitle className="text-lg">매물 한 줄 소개 <span className="text-destructive">*</span></CardTitle>
          <CardDescription>매물의 매력을 한 줄로 표현해주세요 (5~20자)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              {...register("shortTitle")}
              placeholder="예: 역세권 깔끔한 원룸"
              maxLength={20}
              className="host-input"
            />
            <CharCounter current={shortTitle.length} max={20} />
          </div>
          {errors.shortTitle && (
            <p className="text-sm text-destructive">{errors.shortTitle.message}</p>
          )}
        </CardContent>
      </Card>

      {/* 매물 사진 */}
      <Card className="host-card">
        <CardHeader>
          <CardTitle className="text-lg">매물 사진 <span className="text-destructive">*</span></CardTitle>
          <CardDescription>매물의 사진을 등록해주세요 (최소 5장)</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploader />
        </CardContent>
      </Card>

      {/* 매물 소개 */}
      <Card className="host-card">
        <CardHeader>
          <CardTitle className="text-lg">매물 소개 <span className="text-destructive">*</span></CardTitle>
          <CardDescription>매물에 대해 자세히 소개해주세요 (최소 30자)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            {...register("description")}
            rows={6}
            placeholder="매물의 특장점, 분위기 등을 자유롭게 작성해주세요"
            maxLength={1000}
            className="host-textarea"
          />
          <div className="flex justify-end">
            <CharCounter current={description.length} max={1000} />
          </div>
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
          <WritingGuide {...WRITING_GUIDES.description} />
        </CardContent>
      </Card>

      {/* 위치 및 교통 */}
      <Card className="host-card">
        <CardHeader>
          <CardTitle className="text-lg">위치 및 교통</CardTitle>
          <CardDescription>주변 교통편과 편의시설을 알려주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            {...register("locationTransport")}
            rows={4}
            placeholder="주변 교통편, 편의시설 등을 자유롭게 작성해주세요"
            maxLength={1000}
            className="host-textarea"
          />
          <div className="flex justify-end">
            <CharCounter current={locationTransport.length} max={1000} />
          </div>
          {errors.locationTransport && (
            <p className="text-sm text-destructive">{errors.locationTransport.message}</p>
          )}
          <WritingGuide {...WRITING_GUIDES.locationTransport} />
        </CardContent>
      </Card>

      {/* 이용 안내 */}
      <Card className="host-card">
        <CardHeader>
          <CardTitle className="text-lg">이용 안내</CardTitle>
          <CardDescription>입주 방식과 이용 규칙을 안내해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            {...register("usageGuide")}
            rows={4}
            placeholder="입주 방식, 이용 규칙 등을 자유롭게 작성해주세요"
            maxLength={1000}
            className="host-textarea"
          />
          <div className="flex justify-end">
            <CharCounter current={usageGuide.length} max={1000} />
          </div>
          <WritingGuide {...WRITING_GUIDES.usageGuide} />
        </CardContent>
      </Card>

      {/* 호스트 메시지 */}
      <Card className="host-card">
        <CardHeader>
          <CardTitle className="text-lg">호스트 메시지</CardTitle>
          <CardDescription>게스트에게 전하고 싶은 메시지를 남겨주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            {...register("hostMessage")}
            rows={4}
            placeholder="인사말, 추천 장소, 생활 팁 등을 자유롭게 작성해주세요"
            maxLength={1000}
            className="host-textarea"
          />
          <div className="flex justify-end">
            <CharCounter current={hostMessage.length} max={1000} />
          </div>
          <WritingGuide {...WRITING_GUIDES.hostMessage} />
        </CardContent>
      </Card>
    </div>
  )
}

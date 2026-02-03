"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { createProperty } from "@/app/actions/property"

import { registerSchema, type RegisterFormData, DEFAULT_VALUES, STEPS, STEP_FIELDS } from "./types"
import StepIndicator from "./components/StepIndicator"
import Step1Location from "./components/Step1Location"
import Step2Options from "./components/Step2Options"
import Step3Details from "./components/Step3Details"
import Step4Pricing from "./components/Step4Pricing"
import Step5Reservation from "./components/Step5Reservation"
import Step6CheckInOut from "./components/Step6CheckInOut"

export default function PropertyRegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: DEFAULT_VALUES as RegisterFormData,
    mode: "onTouched",
  })

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep]
    if (fields && fields.length > 0) {
      const valid = await methods.trigger(fields)
      if (!valid) return
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePrev = () => {
    setCurrentStep((s) => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const onSubmit = methods.handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      const result = await createProperty(data as any)

      if (result.error) {
        toast({ title: "등록 실패", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "매물이 등록되었습니다", description: "관리자 검토 후 승인됩니다." })
        setTimeout(() => router.push("/"), 1500)
      }
    } catch (err) {
      toast({
        title: "등록 실패",
        description: err instanceof Error ? err.message : "오류가 발생했습니다",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  })

  const stepComponents = [
    <Step1Location key={0} />,
    <Step2Options key={1} />,
    <Step3Details key={2} />,
    <Step4Pricing key={3} />,
    <Step5Reservation key={4} />,
    <Step6CheckInOut key={5} />,
  ]

  const isLastStep = currentStep === STEPS.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* 상단 컬러 바 */}
      <div className="h-2 bg-gradient-to-r from-primary to-orange-500" />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">매물 등록</h1>
          <p className="text-muted-foreground mt-2">
            얼리버드 사전등록으로 매물을 등록해주세요
          </p>
        </div>

        {/* 스텝 인디케이터 */}
        <StepIndicator currentStep={currentStep} />

        {/* 스텝 제목 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">{STEPS[currentStep].label}</h2>
        </div>

        {/* 폼 */}
        <FormProvider {...methods}>
          <form onSubmit={onSubmit}>
            {stepComponents[currentStep]}

            {/* 네비게이션 */}
            <div className="flex justify-between mt-8 max-w-2xl mx-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
                size="lg"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                이전
              </Button>

              {isLastStep ? (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      등록 중...
                    </>
                  ) : (
                    "매물 등록"
                  )}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext} size="lg">
                  다음
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  )
}

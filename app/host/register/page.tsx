"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { SpinnerGap, CaretLeft, CaretRight, PaperPlaneTilt } from "@phosphor-icons/react"
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
      if (!valid) {
        const errors = methods.formState.errors
        const firstErrorField = fields.find(field => errors[field])
        if (firstErrorField) {
          const element = document.querySelector(`[data-field="${firstErrorField}"]`) ||
                         document.querySelector(`[name="${firstErrorField}"]`)
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" })
            if (element instanceof HTMLElement && typeof element.focus === 'function') {
              setTimeout(() => element.focus(), 500)
            }
          }
        }
        return
      }
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

      if (!result.success) {
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
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* 상단 그라데이션 바 */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-orange-400 to-primary" />

      <div className="container mx-auto px-5 py-8 max-w-2xl">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">매물 등록</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            얼리버드 사전등록으로 매물을 등록해주세요
          </p>
        </div>

        {/* 스텝 인디케이터 */}
        <StepIndicator currentStep={currentStep} />

        {/* 스텝 제목 */}
        <div className="text-center mb-8">
          <h2 className="text-lg font-semibold text-foreground">{STEPS[currentStep].label}</h2>
        </div>

        {/* 폼 */}
        <FormProvider {...methods}>
          <form onSubmit={onSubmit}>
            {stepComponents[currentStep]}

            {/* 네비게이션 */}
            <div className="flex justify-between mt-10 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="host-btn flex-1 max-w-[160px]"
              >
                <CaretLeft size={18} weight="bold" className="mr-1" />
                이전
              </Button>

              {isLastStep ? (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="host-btn flex-1 max-w-[200px]"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerGap size={18} className="mr-2 animate-spin" />
                      등록 중...
                    </>
                  ) : (
                    <>
                      <PaperPlaneTilt size={18} weight="fill" className="mr-1" />
                      매물 등록
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="host-btn flex-1 max-w-[200px]"
                >
                  다음
                  <CaretRight size={18} weight="bold" className="ml-1" />
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  )
}

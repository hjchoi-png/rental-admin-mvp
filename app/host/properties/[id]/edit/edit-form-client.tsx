"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { SpinnerGap, CaretLeft, CaretRight, PaperPlaneTilt } from "@phosphor-icons/react"
import { updatePropertyAndResubmit } from "@/app/host/actions"

import { registerSchema, type RegisterFormData, STEPS, STEP_FIELDS } from "@/app/host/register/types"
import StepIndicator from "@/app/host/register/components/StepIndicator"
import Step1Location from "@/app/host/register/components/Step1Location"
import Step2Options from "@/app/host/register/components/Step2Options"
import Step3Details from "@/app/host/register/components/Step3Details"
import Step4Pricing from "@/app/host/register/components/Step4Pricing"
import Step5Reservation from "@/app/host/register/components/Step5Reservation"
import Step6CheckInOut from "@/app/host/register/components/Step6CheckInOut"
import SupplementBanner from "./supplement-banner"
import type { ViolationInfo } from "./page"

interface EditFormClientProps {
  propertyId: string
  defaultValues: Partial<RegisterFormData>
  violations: ViolationInfo[]
}

export default function EditFormClient({
  propertyId,
  defaultValues,
  violations,
}: EditFormClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 위반이 있는 스텝 번호 집합
  const violationSteps = new Set(violations.map((v) => v.relatedStep))

  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: defaultValues as RegisterFormData,
    mode: "onTouched",
  })

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep]
    if (fields && fields.length > 0) {
      const valid = await methods.trigger(fields)
      if (!valid) {
        const errors = methods.formState.errors
        const firstErrorField = fields.find((field) => errors[field])
        if (firstErrorField) {
          const element =
            document.querySelector(`[data-field="${firstErrorField}"]`) ||
            document.querySelector(`[name="${firstErrorField}"]`)
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" })
            if (element instanceof HTMLElement && typeof element.focus === "function") {
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

  const handleGoToStep = (step: number) => {
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const onSubmit = methods.handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      const result = await updatePropertyAndResubmit(propertyId, data as any)

      if (!result.success) {
        toast({
          title: "수정 실패",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "매물이 다시 제출되었습니다",
          description: "검수가 진행됩니다. 결과를 기다려주세요.",
        })
        setTimeout(() => router.push(`/host/properties/${propertyId}`), 1500)
      }
    } catch (err) {
      toast({
        title: "수정 실패",
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
    <div className="space-y-6 pb-8">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← 매물 상세로 돌아가기
      </button>

      {/* 헤더 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">매물 수정</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          보완 항목을 수정하고 다시 제출하세요
        </p>
      </div>

      {/* 보완 배너 */}
      <SupplementBanner violations={violations} onGoToStep={handleGoToStep} />

      {/* 스텝 인디케이터 */}
      <div className="relative">
        <StepIndicator currentStep={currentStep} />
        {/* 위반 스텝 강조 도트 */}
        <div className="flex justify-between px-4 mt-1">
          {STEPS.map((_, i) => (
            <div key={i} className="flex justify-center" style={{ width: `${100 / STEPS.length}%` }}>
              {violationSteps.has(i) && (
                <div className="w-2 h-2 rounded-full bg-orange-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 스텝 제목 */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {STEPS[currentStep].label}
        </h2>
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
                    제출 중...
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt size={18} weight="fill" className="mr-1" />
                    다시 제출
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
  )
}

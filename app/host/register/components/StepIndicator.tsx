"use client"

import { STEPS } from "../types"
import { Check } from "@phosphor-icons/react"

interface StepIndicatorProps {
  currentStep: number
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full max-w-xl mx-auto mb-10">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  index < currentStep
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/15 shadow-sm shadow-primary/25"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index < currentStep ? (
                  <Check size={16} weight="bold" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-[11px] mt-1.5 whitespace-nowrap transition-colors ${
                  index <= currentStep
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {step.shortLabel}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1.5 mt-[-18px] rounded-full transition-colors duration-300 ${
                  index < currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

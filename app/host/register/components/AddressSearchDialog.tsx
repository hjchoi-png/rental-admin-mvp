"use client"

import { useState } from "react"
import DaumPostcode from "react-daum-postcode"
import { useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { RegisterFormData } from "../types"

export default function AddressSearchDialog() {
  const { setValue, watch, formState: { errors } } = useFormContext<RegisterFormData>()
  const [open, setOpen] = useState(false)
  const address = watch("address")

  const handleComplete = (data: { address: string; addressType: string; bname: string }) => {
    let fullAddress = data.address
    if (data.addressType === "R" && data.bname) {
      fullAddress += ` (${data.bname})`
    }
    setValue("address", fullAddress, { shouldValidate: true })
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={address || ""}
          readOnly
          placeholder="주소를 검색해주세요"
          className="host-input flex-1"
        />
        <Button type="button" onClick={() => setOpen(true)} variant="outline" className="host-btn shrink-0">
          주소 검색
        </Button>
      </div>
      {errors.address && (
        <p className="text-sm text-destructive">{errors.address.message}</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>주소 검색</DialogTitle>
          </DialogHeader>
          <DaumPostcode onComplete={handleComplete} style={{ height: 500 }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

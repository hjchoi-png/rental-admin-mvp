"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { useFormContext } from "react-hook-form"
import Image from "next/image"
import { UploadSimple, X, DotsSixVertical } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/utils/supabase/client"
import type { RegisterFormData } from "../types"

const MAX_IMAGES = 30
const MIN_IMAGES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"]

interface ImageUploaderProps {
  initialImages?: string[]
}

export default function ImageUploader({ initialImages }: ImageUploaderProps = {}) {
  const { setValue, watch, formState: { errors } } = useFormContext<RegisterFormData>()
  const watchedImages = watch("images")
  const images = useMemo(() => watchedImages || [], [watchedImages])
  const [previews, setPreviews] = useState<{ url: string; file?: File }[]>([])
  const [uploading, setUploading] = useState(false)

  // 기존 이미지 URL로 preview 초기화 (수정 모드)
  useEffect(() => {
    if (initialImages && initialImages.length > 0 && previews.length === 0) {
      setPreviews(initialImages.map(url => ({ url })))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const processFile = useCallback(async (file: File): Promise<File> => {
    // HEIF 변환
    if (file.name.toLowerCase().match(/\.(heic|heif)$/)) {
      try {
        const heic2any = (await import("heic2any")).default
        const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 }) as Blob
        return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" })
      } catch {
        toast({ title: "파일 변환에 실패했습니다. 다른 사진을 선택해주세요", variant: "destructive" })
        throw new Error("HEIF conversion failed")
      }
    }
    return file
  }, [toast])

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().match(/\.(heic|heif)$/)) {
      return "지원하지 않는 파일 형식입니다. JPG, JPEG, PNG 형식으로 업로드해주세요"
    }
    if (file.size > MAX_FILE_SIZE) {
      return "파일 크기가 10MB를 초과합니다"
    }
    return null
  }

  const uploadToSupabase = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg"
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage
      .from("property-images")
      .upload(filename, file, { cacheControl: "3600" })
    if (error) throw error
    const { data } = supabase.storage.from("property-images").getPublicUrl(filename)
    return data.publicUrl
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const remaining = MAX_IMAGES - previews.length
    if (fileArray.length > remaining) {
      toast({ title: `최대 ${MAX_IMAGES}장까지 등록 가능합니다`, variant: "destructive" })
      return
    }

    setUploading(true)
    const newPreviews: { url: string; file?: File }[] = []
    const newUrls: string[] = []

    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        toast({ title: error, variant: "destructive" })
        continue
      }
      try {
        const processed = await processFile(file)
        const previewUrl = URL.createObjectURL(processed)
        newPreviews.push({ url: previewUrl, file: processed })

        const publicUrl = await uploadToSupabase(processed)
        newUrls.push(publicUrl)
      } catch {
        // skip failed files
      }
    }

    const updatedPreviews = [...previews, ...newPreviews]
    const updatedUrls = [...images, ...newUrls]
    setPreviews(updatedPreviews)
    setValue("images", updatedUrls, { shouldValidate: true })
    setUploading(false)
  }, [previews, images, setValue, toast, processFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const removeImage = (index: number) => {
    const p = previews[index]
    if (p?.url?.startsWith("blob:")) URL.revokeObjectURL(p.url)
    setPreviews((prev) => prev.filter((_, i) => i !== index))
    setValue("images", images.filter((_, i) => i !== index), { shouldValidate: true })
  }

  // 드래그 순서 변경
  const handleDragStart = (index: number) => setDraggedIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }
  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newPreviews = [...previews]
      const newUrls = [...images]
      const [draggedP] = newPreviews.splice(draggedIndex, 1)
      const [draggedU] = newUrls.splice(draggedIndex, 1)
      newPreviews.splice(dragOverIndex, 0, draggedP)
      newUrls.splice(dragOverIndex, 0, draggedU)
      setPreviews(newPreviews)
      setValue("images", newUrls)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-4">
      {/* 드롭존 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border/60 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
        onClick={() => fileRef.current?.click()}
      >
        <UploadSimple className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          파일을 여기로 끌어 놓으세요
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-2 rounded-xl">
          파일 선택
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,.heic,.heif"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* 안내 문구 */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>&#8226; JPG, JPEG, PNG 형식만 가능합니다. (장당 최대 10MB)</p>
        <p>&#8226; 최소 5장, 최대 30장까지 등록해 주세요.</p>
        <p>&#8226; 첫번째 사진이 대표 사진으로 등록돼요.</p>
        <p>&#8226; 순서를 바꾸고 싶을 땐, 사진을 눌러 원하는 위치로 옮겨 주세요.</p>
      </div>

      {/* 이미지 그리드 */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {previews.map((p, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`relative aspect-square rounded-xl overflow-hidden border group cursor-grab ${
                dragOverIndex === i ? "ring-2 ring-primary" : ""
              } ${i === 0 ? "ring-2 ring-primary" : ""}`}
            >
              <Image src={p.url || images[i]} alt="" fill className="object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-md">
                  대표
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <DotsSixVertical className="h-5 w-5 text-white" weight="bold" />
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {previews.length}/{MAX_IMAGES}장 {uploading && "(업로드 중...)"}
      </p>

      {errors.images && (
        <p className="text-sm text-destructive">{errors.images.message}</p>
      )}
    </div>
  )
}

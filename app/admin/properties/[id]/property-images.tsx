"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageOff } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

function SafeImage({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2">
        <ImageOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">이미지를 불러올 수 없습니다</p>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      priority={priority}
      onError={() => setError(true)}
    />
  )
}

interface PropertyImagesProps {
  images: string[] | string | null | undefined
}

export default function PropertyImages({ images: rawImages }: PropertyImagesProps) {
  // images가 문자열(JSON)일 수 있으므로 배열로 변환
  let images: string[] = []
  if (Array.isArray(rawImages)) {
    images = rawImages
  } else if (typeof rawImages === "string") {
    try {
      const parsed = JSON.parse(rawImages)
      images = Array.isArray(parsed) ? parsed : []
    } catch {
      images = rawImages ? [rawImages] : []
    }
  }

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">이미지가 없습니다</p>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div className="w-full h-96 relative rounded-lg overflow-hidden">
        <SafeImage src={images[0]} alt="매물 이미지" priority />
      </div>
    )
  }

  return (
    <div className="w-full">
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="w-full h-96 relative rounded-lg overflow-hidden">
                <SafeImage
                  src={image}
                  alt={`매물 이미지 ${index + 1}`}
                  priority={index === 0}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
      <div className="mt-2 text-center text-sm text-muted-foreground">
        {images.length}장의 이미지
      </div>
    </div>
  )
}

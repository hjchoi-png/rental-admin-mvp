"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

interface PropertyCardProps {
  title: string
  address: string
  pricePerWeek: number
  imageUrl: string | null
}

function extractDong(address: string): string {
  const parts = address.split(" ")
  const dongPart = parts.find((part) => part.endsWith("동"))
  return dongPart || address.split(" ").slice(0, 3).join(" ") || address
}

export default function PropertyCard({ title, address, pricePerWeek, imageUrl }: PropertyCardProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]">
      <div className="relative w-full h-48 bg-muted">
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            이미지 없음
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          {extractDong(address)}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {pricePerWeek.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">원</span>
          <span className="text-sm text-muted-foreground ml-auto">
            /주
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}

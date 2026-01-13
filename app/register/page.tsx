'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DaumPostcode from 'react-daum-postcode'
import { CheckCircle, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { supabase } from '@/utils/supabase/client'

interface HostData {
  name: string
  phone: string
  email: string
}

interface ListingData {
  title: string
  address: string
  weeklyRent: number
  deposit_price: number
  minContractWeeks: number
  imageUrls: string[]
}

export default function RegisterPage() {
  const router = useRouter()
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [hostData, setHostData] = useState<HostData>({
    name: '',
    phone: '',
    email: '',
  })
  
  const [listingData, setListingData] = useState<ListingData>({
    title: '',
    address: '',
    weeklyRent: 0,
    deposit_price: 0,
    minContractWeeks: 0,
    imageUrls: [],
  })
  
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  // 컴포넌트 언마운트 시 이미지 URL 정리
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview))
    }
  }, [imagePreviews])

  const handleAddressComplete = (data: {
    address: string
    buildingName?: string
    zonecode: string
  }) => {
    const fullAddress = `${data.address} ${data.buildingName ? `(${data.buildingName})` : ''}`
    setListingData({ ...listingData, address: fullAddress })
    setShowAddressModal(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newImages = [...images, ...files]
    setImages(newImages)
    
    // 미리보기 생성
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setImagePreviews([...imagePreviews, ...newPreviews])
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    
    // URL 해제
    URL.revokeObjectURL(imagePreviews[index])
    
    setImages(newImages)
    setImagePreviews(newPreviews)
  }

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []
    
    for (const image of images) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`
      
      const { error: uploadError, data } = await supabase.storage
        .from('property-images')
        .upload(filePath, image)
      
      if (uploadError) {
        throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath)
      
      uploadedUrls.push(publicUrl)
    }
    
    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // 1. 이미지 업로드
      const imageUrls = await uploadImages()
      
      // 2. 호스트 정보 저장
      const { data: host, error: hostError } = await supabase
        .from('hosts')
        .insert({
          name: hostData.name,
          phone: hostData.phone,
          email: hostData.email,
        })
        .select()
        .single()
      
      if (hostError) {
        throw new Error(`호스트 정보 저장 실패: ${hostError.message}`)
      }
      
      // 3. 매물 정보 저장
      const { error: listingError } = await supabase
        .from('listings')
        .insert({
          host_id: host.id,
          title: listingData.title,
          address: listingData.address,
          weekly_rent: listingData.weeklyRent,
          deposit_price: listingData.deposit_price,
          min_contract_weeks: listingData.minContractWeeks,
          images: imageUrls,
        })
      
      if (listingError) {
        throw new Error(`매물 정보 저장 실패: ${listingError.message}`)
      }
      
      // 4. 성공 알림 표시
      setShowSuccessAlert(true)
      
      // 5. 2초 후 메인 화면으로 이동
      setTimeout(() => {
        router.push('/')
      }, 2000)
      
    } catch (error) {
      alert(error instanceof Error ? error.message : '등록 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">매물 등록</h1>
      
      {showSuccessAlert && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">등록 완료</AlertTitle>
          <AlertDescription className="text-green-700">
            매물 등록이 접수되었습니다. 담당자가 연락드리겠습니다.
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 호스트 정보 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>호스트 정보</CardTitle>
            <CardDescription>매물을 등록하시는 분의 정보를 입력해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                required
                value={hostData.name}
                onChange={(e) => setHostData({ ...hostData, name: e.target.value })}
                placeholder="홍길동"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">연락처 *</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={hostData.phone}
                onChange={(e) => setHostData({ ...hostData, phone: e.target.value })}
                placeholder="010-0000-0000"
                pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                required
                value={hostData.email}
                onChange={(e) => setHostData({ ...hostData, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* 매물 정보 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>매물 정보</CardTitle>
            <CardDescription>등록하실 매물의 상세 정보를 입력해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                required
                value={listingData.title}
                onChange={(e) => setListingData({ ...listingData, title: e.target.value })}
                placeholder="역삼동 조용한 원룸"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">주소 *</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  required
                  readOnly
                  value={listingData.address}
                  placeholder="주소 찾기를 클릭하세요"
                  className="cursor-pointer"
                  onClick={() => setShowAddressModal(true)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddressModal(true)}
                >
                  주소 찾기
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weeklyRent">주 단위 임대료 (원) *</Label>
                <Input
                  id="weeklyRent"
                  type="number"
                  required
                  min="0"
                  value={listingData.weeklyRent || ''}
                  onChange={(e) => setListingData({ ...listingData, weeklyRent: parseInt(e.target.value) || 0 })}
                  placeholder="100000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deposit_price">보증금 (원) *</Label>
                <Input
                  id="deposit_price"
                  type="number"
                  required
                  min="0"
                  value={listingData.deposit_price || ''}
                  onChange={(e) => setListingData({ ...listingData, deposit_price: parseInt(e.target.value) || 0 })}
                  placeholder="5000000"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minContractWeeks">최소 계약 기간 (주) *</Label>
              <Input
                id="minContractWeeks"
                type="number"
                required
                min="1"
                value={listingData.minContractWeeks || ''}
                onChange={(e) => setListingData({ ...listingData, minContractWeeks: parseInt(e.target.value) || 0 })}
                placeholder="4"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* 사진 업로드 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>사진</CardTitle>
            <CardDescription>매물 사진을 업로드해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <Label htmlFor="images" className="cursor-pointer">
                <Button type="button" variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    사진 추가하기
                  </span>
                </Button>
              </Label>
            </div>
            
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`미리보기 ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 제출 버튼 */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/')}
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '등록 중...' : '등록하기'}
          </Button>
        </div>
      </form>
      
      {/* 주소 찾기 모달 */}
      {showAddressModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddressModal(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-semibold">주소 찾기</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowAddressModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <DaumPostcode
                onComplete={handleAddressComplete}
                autoClose={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

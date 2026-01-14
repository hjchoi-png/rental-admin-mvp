'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Check, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/utils/supabase/client'

interface Host {
  id: string
  name: string
  phone: string
}

interface Listing {
  id: string
  title: string
  address: string
  monthly_rent: number
  deposit_price: number
  contract_min_weeks: number
  images: string[]
  status: string
  host_id: string
  host?: Host
}

export default function AdminPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const fetchListings = async () => {
    try {
      // listings 데이터 가져오기
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })

      if (listingsError) {
        throw new Error(`매물 조회 실패: ${listingsError.message}`)
      }

      // 각 listing의 host 정보 가져오기
      const listingsWithHosts = await Promise.all(
        listingsData.map(async (listing) => {
          const { data: hostData, error: hostError } = await supabase
            .from('hosts')
            .select('id, name, phone')
            .eq('id', listing.host_id)
            .single()

          if (hostError) {
            console.error(`호스트 정보 조회 실패: ${hostError.message}`)
            return { ...listing, host: null }
          }

          return { ...listing, host: hostData }
        })
      )

      setListings(listingsWithHosts)
    } catch (error) {
      console.error('데이터 조회 중 오류:', error)
      alert(error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [])

  const handleApprove = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'approved' })
        .eq('id', listingId)

      if (error) {
        throw new Error(`승인 실패: ${error.message}`)
      }

      // 목록 새로고침
      await fetchListings()
      alert('매물이 승인되었습니다.')
    } catch (error) {
      alert(error instanceof Error ? error.message : '승인 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (listingId: string) => {
    const confirmed = window.confirm('정말 이 매물을 삭제하시겠습니까?')
    
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)

      if (error) {
        throw new Error(`삭제 실패: ${error.message}`)
      }

      // 목록 새로고침
      await fetchListings()
      alert('매물이 삭제되었습니다.')
    } catch (error) {
      alert(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return '승인됨'
      case 'pending':
        return '대기중'
      case 'rejected':
        return '거부됨'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">관리자 대시보드</h1>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">썸네일</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>가격</TableHead>
              <TableHead>호스트 정보</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  등록된 매물이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              listings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    {listing.images && listing.images.length > 0 ? (
                      <div className="relative w-16 h-16 rounded-md overflow-hidden">
                        <Image
                          src={listing.images[0]}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        이미지 없음
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{listing.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {listing.monthly_rent.toLocaleString()}원
                      </span>
                      <span className="text-xs text-muted-foreground">
                        월 임대료
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {listing.host ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{listing.host.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {listing.host.phone}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">정보 없음</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(listing.status)}>
                      {getStatusLabel(listing.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(listing.id)}
                        disabled={listing.status === 'approved'}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(listing.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

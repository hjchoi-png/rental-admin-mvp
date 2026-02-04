-- ============================================
-- properties 테이블에 상세 필드 추가
-- 얼리버드 등록 페이지 확장을 위한 마이그레이션
-- ============================================

-- 매물 기본 정보
ALTER TABLE properties
ADD COLUMN address_detail TEXT,              -- 상세주소 (동/호수)
ADD COLUMN property_type TEXT CHECK (property_type IN ('원룸', '투룸', '쓰리룸+', '스튜디오', '오피스텔')),
ADD COLUMN room_count INTEGER CHECK (room_count > 0),
ADD COLUMN bathroom_count INTEGER CHECK (bathroom_count > 0),
ADD COLUMN max_guests INTEGER CHECK (max_guests > 0),
ADD COLUMN area_sqm NUMERIC(7,2);           -- 전용면적 (㎡)

-- 가격 정보
ALTER TABLE properties
ADD COLUMN monthly_price INTEGER CHECK (monthly_price > 0),  -- 월간 가격
ADD COLUMN maintenance_included BOOLEAN DEFAULT false,        -- 관리비 포함 여부
ADD COLUMN deposit INTEGER CHECK (deposit >= 0);              -- 보증금

-- 매물 상세
ALTER TABLE properties
ADD COLUMN available_date DATE,                               -- 입주 가능일
ADD COLUMN min_stay TEXT CHECK (min_stay IN ('1주', '2주', '1개월', '3개월')),  -- 최소 계약 기간
ADD COLUMN amenities TEXT[] DEFAULT '{}';                      -- 어메니티 목록

-- AI 검수 결과 필드 (향후 사용)
ALTER TABLE properties
ADD COLUMN ai_review_score FLOAT,                             -- AI 검수 점수
ADD COLUMN ai_review_result JSONB;                            -- AI 검수 상세 결과

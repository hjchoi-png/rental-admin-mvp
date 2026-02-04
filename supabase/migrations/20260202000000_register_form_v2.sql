-- ============================================
-- 매물 등록 폼 v2 마이그레이션
-- PRD 스펙 기반 6단계 폼 필드 추가
-- ============================================

-- Step 1: 위치 및 구조
ALTER TABLE properties ADD COLUMN IF NOT EXISTS dong TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ho TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS dong_none BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_number INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS kitchen_count INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS living_room_count INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_pyeong NUMERIC(7,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_unit TEXT DEFAULT '㎡';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking TEXT DEFAULT '불가능';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_count INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_condition TEXT;

-- Step 2: 옵션
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pet_allowed BOOLEAN;

-- Step 3: 상세 정보
ALTER TABLE properties ADD COLUMN IF NOT EXISTS short_title TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS location_transport TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS usage_guide TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_message TEXT;

-- Step 4: 요금 설정
ALTER TABLE properties ADD COLUMN IF NOT EXISTS long_term_discounts JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS instant_move_discounts JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_fee INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_electric BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_water BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_gas BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_detail TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cleaning_free BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkout_cleaning_fee INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pet_cleaning_fee INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cancellation_agreed BOOLEAN DEFAULT false;

-- Step 5: 예약 설정
ALTER TABLE properties ADD COLUMN IF NOT EXISTS min_stay_weeks INTEGER DEFAULT 1;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS max_stay_weeks INTEGER DEFAULT 12;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS day_extension INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS blocked_dates JSONB DEFAULT '[]';

-- Step 6: 입실/퇴실 규칙
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkin_time TEXT DEFAULT '15:00';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkin_method TEXT DEFAULT '비대면';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkout_time TEXT DEFAULT '11:00';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkout_method TEXT DEFAULT '비대면';

-- 보증금 기본값 300,000으로 변경
ALTER TABLE properties ALTER COLUMN deposit SET DEFAULT 300000;

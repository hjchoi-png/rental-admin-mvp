-- RAG + CS 챗봇 시스템 스키마
-- pgvector 확장, 정책 문서 벡터 테이블, 대화 이력 테이블

-- pgvector 확장 활성화
create extension if not exists vector;

-- ============================================
-- 1. 정책 문서 벡터 테이블
-- ============================================
create table if not exists policy_embeddings (
  id bigint generated always as identity primary key,
  content text not null,
  embedding vector(1536),
  source_file text not null,
  category text not null,
  target text default 'common',
  section_title text,
  priority int default 1,
  content_type text default 'policy_rule',
  token_count int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 벡터 검색 인덱스 (IVFFlat — 소규모 데이터에 적합)
create index if not exists idx_pe_embedding
  on policy_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- 메타데이터 필터 인덱스
create index if not exists idx_pe_category on policy_embeddings(category);
create index if not exists idx_pe_priority on policy_embeddings(priority);
create index if not exists idx_pe_source on policy_embeddings(source_file);

-- ============================================
-- 2. 유사도 검색 함수
-- ============================================
create or replace function match_policy_documents(
  query_embedding vector(1536),
  match_count int default 5,
  filter_category text default null,
  filter_priority int default null
)
returns table (
  id bigint,
  content text,
  source_file text,
  category text,
  section_title text,
  priority int,
  content_type text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    pe.id,
    pe.content,
    pe.source_file,
    pe.category,
    pe.section_title,
    pe.priority,
    pe.content_type,
    1 - (pe.embedding <=> query_embedding) as similarity
  from policy_embeddings pe
  where
    (filter_category is null or pe.category = filter_category)
    and (filter_priority is null or pe.priority <= filter_priority)
  order by pe.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================
-- 3. 대화 세션 테이블
-- ============================================
create table if not exists chat_sessions (
  id uuid default gen_random_uuid() primary key,
  admin_user_id uuid references auth.users(id),
  title text,
  context_property_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 4. 대화 메시지 테이블
-- ============================================
create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- 5. RLS 정책
-- ============================================
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

create policy "Admin can manage own sessions"
  on chat_sessions for all
  using (admin_user_id = auth.uid());

create policy "Admin can manage own messages"
  on chat_messages for all
  using (
    session_id in (
      select cs.id from chat_sessions cs where cs.admin_user_id = auth.uid()
    )
  );

-- policy_embeddings는 admin만 읽기 가능 (인증된 사용자)
alter table policy_embeddings enable row level security;

create policy "Authenticated users can read embeddings"
  on policy_embeddings for select
  using (auth.role() = 'authenticated');

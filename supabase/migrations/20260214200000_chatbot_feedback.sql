-- CS 챗봇 답변 피드백 컬럼 추가
-- chat_messages 테이블에 feedback 컬럼 (helpful / not_helpful)

alter table chat_messages
  add column if not exists feedback text
  check (feedback in ('helpful', 'not_helpful'));

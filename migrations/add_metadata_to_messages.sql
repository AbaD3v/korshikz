-- Add metadata column to group_chat_messages for reactions, replies, and other message features
ALTER TABLE group_chat_messages 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- Optional: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_metadata 
ON group_chat_messages USING GIN(metadata);

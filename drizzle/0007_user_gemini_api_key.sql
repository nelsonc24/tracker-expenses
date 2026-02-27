-- Add encrypted Gemini API key column to users table
-- Stored as AES-256-GCM encrypted text: hex(iv):hex(authTag):hex(ciphertext)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gemini_api_key" text;

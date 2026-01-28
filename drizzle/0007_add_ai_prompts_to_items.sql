-- Add prompt and negativePrompt fields to items table for AI image generation
ALTER TABLE items 
ADD COLUMN prompt TEXT,
ADD COLUMN negative_prompt TEXT;

-- Add comments
COMMENT ON COLUMN items.prompt IS 'AI image generation prompt (English)';
COMMENT ON COLUMN items.negative_prompt IS 'AI image generation negative prompt (English)';

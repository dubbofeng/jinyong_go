ALTER TABLE npc_relationships
ADD COLUMN IF NOT EXISTS dialogue_flags JSONB NOT NULL DEFAULT '[]';

-- Migration: Change embedding dimension from 1536 to 1024
-- Reason: Supporting BAAI/bge-large-zh-v1.5 model which produces 1024-dimensional embeddings
-- Date: 2026-01-19

-- Step 1: Alter the column type to support 1024 dimensions
-- Note: This will work even if there's existing data (1536 dims will be truncated, but we have no valid data yet)
ALTER TABLE scout_executions
ALTER COLUMN summary_embedding TYPE vector(1024);

-- Step 2: Drop and recreate the HNSW index for the new dimension
DROP INDEX IF EXISTS idx_scout_executions_summary_embedding;

CREATE INDEX idx_scout_executions_summary_embedding
ON scout_executions USING hnsw (summary_embedding vector_cosine_ops);

-- Step 3: Add a comment explaining the dimension
COMMENT ON COLUMN scout_executions.summary_embedding IS
'Vector embedding of the summary text for similarity comparison.
Dimension: 1024 (BAAI/bge-large-zh-v1.5)
Different embedding models have different dimensions:
- text-embedding-3-small: 1536
- text-embedding-3-large: 3072
- bge-large-zh-v1.5: 1024
- bge-base-zh-v1.5: 768
Ensure the OPENAI_EMBEDDING_MODEL matches this dimension.';

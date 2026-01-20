#!/usr/bin/env python3
import os
import psycopg2
import json
import math

def cosine_similarity(vec_a, vec_b):
    """Calculate cosine similarity between two vectors"""
    if len(vec_a) != len(vec_b):
        raise ValueError(f"Vectors must have same length (got {len(vec_a)} and {len(vec_b)})")

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)

def main():
    # Get database URL from environment
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL environment variable not set")
        return

    print("📊 Testing Deduplication Logic with Real Database Embeddings\n")
    print("=" * 70)

    # Connect to database
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    # Query recent executions with embeddings
    query = """
        SELECT
            id,
            summary_text,
            completed_at,
            summary_embedding
        FROM scout_executions
        WHERE scout_id = '1b696c76-1ea5-4f8e-a66c-8f423f90a9d2'
          AND summary_embedding IS NOT NULL
        ORDER BY completed_at DESC
        LIMIT 2;
    """

    cursor.execute(query)
    rows = cursor.fetchall()

    if len(rows) < 2:
        print(f"⚠️  Only {len(rows)} execution(s) found with embeddings")
        print("   Need at least 2 executions to test deduplication\n")
        cursor.close()
        conn.close()
        return

    # Parse executions
    # PostgreSQL pgvector returns as string "[val1,val2,val3,...]"
    # Need to parse it as JSON
    embedding1_raw = rows[0][3]
    embedding2_raw = rows[1][3]

    # Convert string representation to list if needed
    if isinstance(embedding1_raw, str):
        embedding1 = json.loads(embedding1_raw)
    else:
        embedding1 = embedding1_raw

    if isinstance(embedding2_raw, str):
        embedding2 = json.loads(embedding2_raw)
    else:
        embedding2 = embedding2_raw

    exec1 = {
        "id": str(rows[0][0]),
        "summary": rows[0][1],
        "completed_at": rows[0][2],
        "embedding": embedding1
    }

    exec2 = {
        "id": str(rows[1][0]),
        "summary": rows[1][1],
        "completed_at": rows[1][2],
        "embedding": embedding2
    }

    cursor.close()
    conn.close()

    print("✅ Found 2 executions to compare:\n")
    print(f"Execution 1 (Latest):")
    print(f"  ID: {exec1['id']}")
    print(f"  Completed: {exec1['completed_at']}")
    print(f"  Summary: {exec1['summary']}")
    print(f"  Embedding dimensions: {len(exec1['embedding'])}\n")

    print(f"Execution 2 (Previous):")
    print(f"  ID: {exec2['id']}")
    print(f"  Completed: {exec2['completed_at']}")
    print(f"  Summary: {exec2['summary']}")
    print(f"  Embedding dimensions: {len(exec2['embedding'])}\n")

    # Calculate similarity
    print("=" * 70)
    similarity = cosine_similarity(exec1['embedding'], exec2['embedding'])
    similarity_percent = similarity * 100

    print(f"📏 Cosine Similarity: {similarity:.4f} ({similarity_percent:.1f}%)")
    print("=" * 70)
    print()

    # Evaluate against threshold
    threshold = 0.85
    is_duplicate = similarity >= threshold

    print(f"🎯 Deduplication Threshold: {threshold} ({threshold * 100:.0f}%)\n")

    if is_duplicate:
        print("❌ DUPLICATE DETECTED!")
        print("   The latest execution is too similar to the previous one.")
        print("   Expected behavior:")
        print("   - Email notification should be SKIPPED")
        print("   - Response should include duplicate warning note")
    else:
        print("✅ NOT A DUPLICATE")
        print("   The executions are sufficiently different.")
        print("   Expected behavior:")
        print("   - Email notification should be SENT")
        print("   - No duplicate warning needed")

    print()
    print("📊 Similarity Scale Reference:")
    print("   0.95-1.00: Nearly identical content")
    print("   0.85-0.95: Very similar (duplicate threshold)")
    print("   0.70-0.85: Similar topic, different details")
    print("   0.50-0.70: Somewhat related")
    print("   0.00-0.50: Different topics")

if __name__ == "__main__":
    main()

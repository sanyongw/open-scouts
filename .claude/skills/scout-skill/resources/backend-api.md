# Scout Backend API Specification

This document describes the API that the Scout skill scripts expect from the backend.

## Overview

The Scout backend provides AI-powered web search capabilities. It handles:
- Query processing and optimization
- Web searching using AI agents
- Result analysis and summarization
- Asynchronous job management

## Base URL

```
https://your-scout-backend.com/api
```

---

## Endpoints

### 1. Synchronous Search

**POST** `/search`

Performs a search and returns results synchronously.

**Request Body**:
```json
{
  "query": "string (required) - The search query",
  "options": {
    "timeout": "number (optional) - Max execution time in seconds (default: 60)",
    "verbose": "boolean (optional) - Return detailed metadata (default: false)",
    "limit": "number (optional) - Max results to return (default: 10)"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "results": [
    {
      "title": "Result title",
      "url": "https://example.com/article",
      "snippet": "Brief description or excerpt",
      "date": "2024-01-15" // Optional
    }
  ],
  "summary": "AI-generated summary of findings",
  "metadata": {
    "search_time": 45.2,
    "sources_checked": 15,
    "query_optimized": "optimized search query used"
  }
}
```

**Error Responses**:

```json
// 400 Bad Request
{
  "success": false,
  "error": "Query is required"
}

// 408 Request Timeout
{
  "success": false,
  "error": "Search exceeded timeout limit"
}

// 429 Too Many Requests
{
  "success": false,
  "error": "Rate limit exceeded. Please try again in 60 seconds.",
  "retry_after": 60
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Internal server error"
}
```

---

### 2. Asynchronous Search

**POST** `/search/async`

Starts a search that runs in the background.

**Request Body**:
```json
{
  "query": "string (required)",
  "options": {
    "timeout": "number (optional)",
    "limit": "number (optional)"
  }
}
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "search_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "status_url": "/api/search/status/550e8400-e29b-41d4-a716-446655440000",
  "estimated_completion": "2024-01-15T10:35:00Z"
}
```

---

### 3. Check Search Status

**GET** `/search/status/:search_id`

Check the status of an async search.

**Response** (200 OK):

**Pending**:
```json
{
  "search_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "progress": {
    "percentage": 0,
    "message": "Search queued"
  }
}
```

**Running**:
```json
{
  "search_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "progress": {
    "percentage": 45,
    "message": "Analyzing search results",
    "current_step": "scraping_content"
  }
}
```

**Completed**:
```json
{
  "search_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "results": [...],  // Same format as synchronous search
  "summary": "...",
  "completed_at": "2024-01-15T10:34:23Z"
}
```

**Failed**:
```json
{
  "search_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "Search execution failed: timeout",
  "failed_at": "2024-01-15T10:35:00Z"
}
```

---

### 4. Health Check (Optional)

**GET** `/health`

Check if the API is operational.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "database": "healthy",
    "ai_agent": "healthy",
    "search_api": "healthy"
  }
}
```

---

## Implementation with Open Scouts

To implement this API using Open Scouts, add these routes:

### 1. Create API Routes

```typescript
// app/api/public/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { query, options = {} } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    const timeout = options.timeout || 60;

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('scout_executions')
      .insert({
        scout_id: null, // Public API search
        status: 'running',
        started_at: new Date().toISOString(),
        metadata: { query, source: 'public_api' }
      })
      .select()
      .single();

    if (execError) throw execError;

    // Trigger edge function (scout-cron)
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scout-cron`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        execution_id: execution.id,
        query,
        timeout
      }),
      signal: AbortSignal.timeout((timeout + 10) * 1000)
    });

    if (!response.ok) {
      throw new Error(`Edge function returned ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      results: result.results || [],
      summary: result.summary || '',
      metadata: {
        search_time: result.search_time,
        sources_checked: result.sources_checked,
        execution_id: execution.id
      }
    });

  } catch (error: any) {
    console.error('Search error:', error);

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return NextResponse.json(
        { success: false, error: 'Search exceeded timeout limit' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Async Search Route

```typescript
// app/api/public/search/async/route.ts

export async function POST(request: NextRequest) {
  try {
    const { query, options = {} } = await request.json();

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // Create execution record
    const { data: execution } = await supabase
      .from('scout_executions')
      .insert({
        scout_id: null,
        status: 'pending',
        metadata: { query, source: 'public_api_async' }
      })
      .select()
      .single();

    // Trigger edge function asynchronously (don't wait)
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scout-cron`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        execution_id: execution.id,
        query,
        timeout: options.timeout || 60
      })
    }).catch(err => console.error('Async search trigger error:', err));

    return NextResponse.json({
      success: true,
      search_id: execution.id,
      status: 'pending',
      status_url: `/api/public/search/status/${execution.id}`,
      estimated_completion: new Date(Date.now() + 60000).toISOString()
    }, { status: 202 });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to start search' },
      { status: 500 }
    );
  }
}
```

### 3. Status Check Route

```typescript
// app/api/public/search/status/[id]/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: execution } = await supabase
      .from('scout_executions')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Search not found' },
        { status: 404 }
      );
    }

    const response: any = {
      search_id: execution.id,
      status: execution.status
    };

    if (execution.status === 'running') {
      response.progress = {
        percentage: 50, // Calculate based on execution time
        message: 'Analyzing search results',
        current_step: 'processing'
      };
    } else if (execution.status === 'completed') {
      // Parse results from execution metadata or related tables
      response.results = execution.metadata?.results || [];
      response.summary = execution.summary || '';
      response.completed_at = execution.completed_at;
    } else if (execution.status === 'failed') {
      response.error = execution.error_message;
      response.failed_at = execution.completed_at;
    }

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
```

### 4. Update Edge Function

Modify `supabase/functions/scout-cron/index.ts` to support public API:

```typescript
// Accept execution_id and query from request
const { execution_id, query, timeout = 60 } = await req.json();

// Execute search using AI agent
const results = await executeSearch(query, timeout);

// Update execution record
await supabase
  .from('scout_executions')
  .update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    result_count: results.length,
    summary: generateSummary(results),
    metadata: {
      ...metadata,
      results: results.slice(0, 20) // Store top 20 results
    }
  })
  .eq('id', execution_id);

// Return results
return new Response(
  JSON.stringify({
    results,
    summary: generateSummary(results),
    search_time: (Date.now() - startTime) / 1000,
    sources_checked: results.length
  }),
  { headers: { 'Content-Type': 'application/json' } }
);
```

---

## Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// middleware.ts or in route handler
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'), // 10 requests per minute
});

// In route handler
const identifier = request.ip || 'anonymous';
const { success } = await ratelimit.limit(identifier);

if (!success) {
  return NextResponse.json(
    { success: false, error: 'Rate limit exceeded', retry_after: 60 },
    { status: 429 }
  );
}
```

---

## Authentication (Optional)

For production, add API key authentication:

```typescript
// Check API key in header
const apiKey = request.headers.get('X-API-Key');

if (!apiKey || !isValidApiKey(apiKey)) {
  return NextResponse.json(
    { success: false, error: 'Invalid API key' },
    { status: 401 }
  );
}
```

---

## CORS Configuration

Allow cross-origin requests:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

export const config = {
  matcher: '/api/public/:path*',
};
```

---

## Testing the API

### Test Sync Search

```bash
curl -X POST https://your-backend.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "latest AI news", "options": {"timeout": 60}}'
```

### Test Async Search

```bash
# Start search
curl -X POST https://your-backend.com/api/search/async \
  -H "Content-Type: application/json" \
  -d '{"query": "comprehensive AI research"}'

# Check status
curl https://your-backend.com/api/search/status/SEARCH_ID
```

---

## Deployment Checklist

- [ ] API routes implemented
- [ ] Edge function updated
- [ ] Rate limiting enabled
- [ ] Error handling implemented
- [ ] CORS configured
- [ ] Health check endpoint added
- [ ] Monitoring and logging set up
- [ ] Load testing completed
- [ ] Documentation published
- [ ] API keys distributed (if using auth)

---

## Monitoring

Track these metrics:
- Request count (per endpoint)
- Average response time
- Error rate
- Timeout rate
- Rate limit hits
- Active async searches
- Success/failure ratio

Use services like:
- **Sentry** - Error tracking
- **DataDog** - Performance monitoring
- **LogRocket** - User session replay
- **PostHog** - Analytics

---

## Support

For implementation help:
- See Open Scouts documentation
- Check example implementations
- Contact support team

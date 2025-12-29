import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { query, options = {} } = await request.json();

    // Validate query
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    const timeout = options.timeout || 60;
    console.log('[Public API] Search request:', { query, timeout });

    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    // Get API keys from environment
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('[Public API] Starting real search with ID:', executionId);

    // Step 1: Search with Firecrawl
    const firecrawlRequest = {
      query,
      limit: 10,
      ignoreInvalidURLs: true,
      scrapeOptions: {
        maxAge: 3600000, // 1 hour cache
      },
    };

    console.log('[Public API] Firecrawl request:', JSON.stringify(firecrawlRequest, null, 2));

    const searchResponse = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firecrawlRequest),
      signal: AbortSignal.timeout(timeout * 1000),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Firecrawl search failed: ${searchResponse.status} - ${errorText}`);
    }

    const searchData = await searchResponse.json();
    const webResults = searchData.data?.web || [];

    console.log('[Public API] Firecrawl raw response:', JSON.stringify(searchData, null, 2));

    // Format results
    const results = webResults.map((item: any) => ({
      title: item.title || item.url,
      url: item.url,
      snippet: item.description || '',
      date: item.publishedTime || new Date().toISOString().split('T')[0],
    }));

    console.log('[Public API] Found', results.length, 'search results');
    console.log('[Public API] Formatted results:');
    results.forEach((result: any, index: number) => {
      console.log(`  ${index + 1}. ${result.title}`);
      console.log(`     URL: ${result.url}`);
      console.log(`     Snippet: ${result.snippet.substring(0, 100)}${result.snippet.length > 100 ? '...' : ''}`);
      console.log(`     Date: ${result.date}`);
    });

    // Step 2: Generate summary with OpenAI
    let summary = `Found ${results.length} results for "${query}"`;

    if (results.length > 0 && OPENAI_API_KEY) {
      try {
        const summaryPrompt = `You are a helpful search assistant. Based on these search results for the query "${query}", provide a brief 1-2 sentence summary of what was found:\n\n${results.slice(0, 5).map((r: any, i: number) => `${i + 1}. ${r.title}: ${r.snippet}`).join('\n\n')}\n\nProvide a concise summary:`;

        const openaiResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
              { role: 'user', content: summaryPrompt }
            ],
            temperature: 0.7,
            max_tokens: 150,
          }),
          signal: AbortSignal.timeout(10000), // 10s timeout for summary
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          summary = openaiData.choices[0]?.message?.content || summary;
          console.log('[Public API] LLM generated summary:', summary);
        }
      } catch (summaryError) {
        console.warn('[Public API] Summary generation failed:', summaryError);
        // Continue with default summary
      }
    }

    const result = {
      results,
      summary,
      sources_checked: results.length,
    };

    const searchTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('[Public API] Search completed in', searchTime, 'seconds');

    // Format results for Scout CLI
    return NextResponse.json({
      success: true,
      results: result.results || [],
      summary: result.summary || 'Search completed',
      metadata: {
        search_time: parseFloat(searchTime),
        sources_checked: result.sources_checked || (result.results?.length || 0),
        execution_id: executionId
      }
    });

  } catch (error: any) {
    console.error('[Public API] Search error:', error);

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return NextResponse.json(
        { success: false, error: 'Search exceeded timeout limit' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Firecrawl API tool implementations

import { isBlacklistedDomain } from "./constants.ts";

/**
 * Universal Aggregation Page Filter - 5-Layer Defense Mechanism
 * Detects and filters homepage, aggregation pages, category pages, etc.
 *
 * Layers:
 * 1. Homepage pattern detection (highest priority)
 * 2. Aggregation page path patterns
 * 3. Article identifier whitelist (highest priority for keeping)
 * 4. Path depth heuristics
 * 5. Conservative default strategy
 */
function isHomepageOrAggregationPage(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const hostname = urlObj.hostname;

    // === Layer 1: Homepage Pattern Detection ===
    // Root path detection
    if (pathname === '/' || pathname === '' || pathname === '/index.html' || pathname === '/index.php') {
      return true;
    }

    // Aggregation subdomain special handling (e.g., markets.businessinsider.com/)
    const aggregationSubdomains = ['markets.', 'finance.', 'news.', 'crypto.', 'blog.'];
    if (aggregationSubdomains.some(sub => hostname.includes(sub)) && pathname === '/') {
      return true;
    }

    // === Layer 2: Aggregation Page Path Patterns ===
    const aggregationPatterns = [
      // Basic aggregation keywords
      /^\/news\/?$/i,
      /^\/finance\/?$/i,
      /^\/latest\/?$/i,
      /^\/markets\//i,        // FIXED: Changed from /^\/markets\/?$/i to match multi-level paths
      /^\/stocks\//i,         // FIXED: Changed from /^\/stocks\/?$/i to match multi-level paths
      /^\/trending\/?$/i,
      /^\/breaking\/?$/i,
      /^\/popular\/?$/i,
      /^\/featured\/?$/i,

      // Realtime/Feed
      /^\/realtime/i,
      /^\/feed/i,

      // Topic/Category/Tag
      /^\/topic\//i,
      /^\/topics\//i,
      /^\/section\//i,
      /^\/sections\//i,
      /\/(index|list|category|tag)\//i,

      // Archives (year-only or year-month)
      /^\/archive\/\d{4}\/?$/i,
      /^\/archive\/\d{4}\/\d{1,2}\/?$/i,
      // Year-only or year-month paths (without full date)
      /^\/\d{4}\/?$/i,                      // /2026/
      /^\/\d{4}\/\d{1,2}\/?$/i,            // /2026/01/
      /^\/news\/\d{4}\/?$/i,               // /news/2026/
      /^\/news\/\d{4}\/\d{1,2}\/?$/i,      // /news/2026/01/

      // Other aggregation patterns
      /^\/highlights\/?$/i,
      /^\/top-stories\/?$/i,
      /^\/digest\/?$/i,
      /^\/roundup\/?$/i,

      // Financial-specific aggregation pages (NEW)
      /\/calendar\//i,        // NEW: Calendar pages (e.g., /calendar/earnings/)
      /\/earnings\//i,        // NEW: Earnings aggregation pages
      /\/screener\//i,        // NEW: Stock screener pages
      /\/quotes\//i,          // NEW: Quotes aggregation pages
      /\/watchlist\//i,       // NEW: Watchlist pages
      /\/portfolio\//i,       // NEW: Portfolio pages

      // Query parameter detection
      /[\?&](page|offset|limit)=/i,
      /[\?&](search|q|query)=/i,
      /[\?&](filter|category|type)=/i,
    ];

    if (aggregationPatterns.some(pattern => pattern.test(pathname))) {
      return true;
    }

    // === Layer 3: Article Identifier Whitelist (Highest Priority for Keeping) ===
    const articlePatterns = [
      // FIXED: Full date (YYYY/MM/DD) MUST be followed by content
      /\/\d{4}\/\d{1,2}\/\d{1,2}\/.+/,   // Must have date + content
      /\/article[-_]\d+/i,                // Article ID: /article-12345
      /\/news\/\d+/,                      // News ID: /news/98765
      /\/story\//i,                       // Story path: /story/...
      /\/post\//i,                        // Post path: /post/...
      /\/\d{8,}/,                         // Long numeric ID (e.g., Zhihu /question/123456789)
      /\/p\/\d+/i,                        // Medium-style /p/articleID
      /\/content\/\d+/i,                  // /content/ID
    ];

    if (articlePatterns.some(pattern => pattern.test(pathname))) {
      return false; // Explicitly an article, keep it
    }

    // === Layer 4: Path Depth Heuristics ===
    const pathSegments = pathname.split('/').filter(s => s.length > 0);

    // Too shallow (< 2 segments), likely aggregation
    if (pathSegments.length < 2) {
      return true;
    }

    // Depth = 2: Special check for shallow aggregation
    if (pathSegments.length === 2) {
      const firstSegment = pathSegments[0].toLowerCase();
      const shallowAggregationKeywords = [
        'news', 'finance', 'markets', 'stocks', 'tech', 'business',
        'world', 'politics', 'sports', 'entertainment', 'technology'
      ];

      if (shallowAggregationKeywords.includes(firstSegment)) {
        const secondSegment = pathSegments[1];
        // If second segment is NOT a pure numeric ID, treat as aggregation
        if (!/^\d+$/.test(secondSegment)) {
          return true;
        }
      }
    }

    // === Layer 5: Conservative Default Strategy ===
    // If no aggregation pattern matched, keep the URL (assume it's an article)
    return false;

  } catch (error) {
    // If URL parsing fails, use conservative approach: keep the URL
    console.error(`[URL Filter] Failed to parse URL: ${url}`, error);
    return false;
  }
}

// Execute web search using Firecrawl
export async function executeSearchTool(args: any, apiKey: string, location?: string, maxAge?: number) {
  try {
    const searchPayload: any = {
      query: args.query,
      limit: args.limit || 5,
      ignoreInvalidURLs: true, // Filter out URLs that can't be scraped (social media, etc.)
      scrapeOptions: {
        maxAge: maxAge || 3600000, // Default to 1 hour if not provided
      },
    };

    // Only add tbs if provided
    if (args.tbs) {
      searchPayload.tbs = args.tbs;
    }

    // Add location and country parameters for geo-targeting
    // According to Firecrawl API, for best results both should be set
    if (location) {
      // Format: "City,State,Country" (e.g., "San Francisco,California,United States")
      // For now, if we only have a city, append United States
      // NOTE: This assumes US-based searches. Future improvement: add country/state to database schema
      searchPayload.location = location.includes(',') ? location : `${location},United States`;
      searchPayload.country = "US"; // ISO country code
      console.log(`[Search] Using location: ${searchPayload.location}, country: ${searchPayload.country}`);
    }

    console.log(`[Search] Query: "${args.query}", Location: ${location || 'none'}, TBS: ${args.tbs || 'none'}`);

    // Add 60-second timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl search failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // V2 without scrapeOptions: response structure is { success: true, data: { web: [...], images: [...], news: [...] } }
    const webResults = data.data?.web || [];

    // Map results and filter out blacklisted domains
    const allResults = webResults.map((item: any) => ({
      title: item.title || item.url,
      url: item.url,
      description: item.description || "",
      markdown: item.description || "",
      publishedTime: item.publishedTime,
      favicon: item.favicon || null,
    }));

    // Filter out blacklisted domains AND homepage/aggregation pages
    const results = allResults.filter((item: any) => {
      // Check 1: Blacklisted domains (social media, etc.)
      if (isBlacklistedDomain(item.url)) {
        return false;
      }

      // Check 2: Homepage/aggregation pages
      if (isHomepageOrAggregationPage(item.url)) {
        console.log(`[Search] Filtered out homepage/aggregation page: ${item.url}`);
        return false;
      }

      return true;
    });
    const filteredCount = allResults.length - results.length;

    if (filteredCount > 0) {
      console.log(`[Search] Filtered out ${filteredCount} blacklisted URLs from search results`);
    }

    return {
      query: args.query,
      count: results.length,
      results,
      searchResults: results, // For visual display component
      filteredCount, // Track how many were filtered for debugging
      maxAge: searchPayload.scrapeOptions.maxAge, // Show what maxAge was used
      location: searchPayload.location || null, // Show what location was used
      country: searchPayload.country || null, // Show what country was used
      tbs: searchPayload.tbs || null, // Show what time filter was used
    };
  } catch (error: any) {
    const errorMessage = error.name === 'AbortError'
      ? 'Search request timed out after 60 seconds'
      : error.message;
    return { error: errorMessage, query: args.query, results: [] };
  }
}

// Execute website scraping using Firecrawl
export async function executeScrapeTool(args: any, apiKey: string, maxAge?: number) {
  try {
    const scrapePayload: any = {
      url: args.url,
      formats: [
        "markdown",
        {
          type: "screenshot",
          fullPage: false
        }
      ],
      maxAge: maxAge || 3600000, // Default to 1 hour if not provided
    };

    // Add 60-second timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scrapePayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl scrape failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // V2 response structure: data.data contains the scraped content
    const scrapedData = data.data || {};

    // Limit content to first 2000 characters to minimize data
    const content = (scrapedData.markdown || "").slice(0, 2000);

    return {
      url: args.url,
      title: scrapedData.metadata?.title || args.url,
      content,
      favicon: scrapedData.metadata?.ogImage || scrapedData.metadata?.favicon || null,
      screenshot: scrapedData.screenshot || null,
      maxAge: scrapePayload.maxAge, // Show what maxAge was used
    };
  } catch (error: any) {
    const errorMessage = error.name === 'AbortError'
      ? 'Scrape request timed out after 60 seconds'
      : error.message;
    return { error: errorMessage, url: args.url };
  }
}

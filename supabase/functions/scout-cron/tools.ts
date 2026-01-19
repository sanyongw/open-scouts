// Firecrawl API tool implementations

import { isBlacklistedDomain } from "./constants.ts";

/**
 * Check if URL is likely a homepage or aggregation page
 * Uses URL path patterns to identify non-article pages
 */
function isHomepageOrAggregationPage(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const hostname = urlObj.hostname;

    // 1. Homepage patterns (root paths)
    if (pathname === '/' || pathname === '' || pathname === '/index.html' || pathname === '/index.php') {
      return true;
    }

    // Special case: aggregation subdomains at root (e.g., markets.businessinsider.com/)
    if ((hostname.includes('markets.') || hostname.includes('finance.')) && pathname === '/') {
      return true;
    }

    // 2. Aggregation page patterns (category/feed pages)
    const aggregationPatterns = [
      /^\/news\/?$/i,           // /news, /news/
      /^\/finance\/?$/i,        // /finance, /finance/
      /^\/latest\/?$/i,         // /latest, /latest/
      /^\/markets\/?$/i,        // /markets, /markets/
      /^\/stocks\/?$/i,         // /stocks, /stocks/
      /^\/realtime/i,           // /realtime*
      /^\/feed/i,               // /feed*
      /^\/topic\//i,            // /topic/* (topic aggregation pages)
      /^\/topics\//i,           // /topics/*
      /\/(index|list|category|tag)\//i,  // */index/*, */list/*, etc.
    ];

    if (aggregationPatterns.some(pattern => pattern.test(pathname))) {
      return true;
    }

    // 3. Article patterns (definitely keep these)
    const articlePatterns = [
      /\/\d{4}\/\d{1,2}\/\d{1,2}\//,  // Date in path: /2026/01/18/
      /\/article[-_]\d+/i,             // Article ID: /article-12345
      /\/news\/\d+/,                   // News ID: /news/98765
      /\/story\//i,                    // Story path: /story/...
      /\/post\//i,                     // Post path: /post/...
    ];

    if (articlePatterns.some(pattern => pattern.test(pathname))) {
      return false; // Definitely an article, keep it
    }

    // 4. Path depth check (shallow paths are likely aggregation pages)
    const pathSegments = pathname.split('/').filter(s => s.length > 0);
    if (pathSegments.length < 2) {
      return true; // Too shallow, likely homepage/category
    }

    return false;
  } catch {
    // If URL parsing fails, don't filter (conservative approach)
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

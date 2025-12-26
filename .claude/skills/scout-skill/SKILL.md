---
name: scout
description: AI-powered web search assistant. Use when users ask to search, find, or monitor any web information - news, restaurants, jobs, products, research, or general queries. Zero configuration, instant results.
---

# Scout - AI Web Search Assistant

Scout uses AI to search and analyze web information. Just ask what you want to find, and Scout will search, analyze, and present the results.

## Quick Start

When a user asks to search for information, use the search script:

```bash
node scripts/search.js "<user's search query>"
```

The script will:
1. Send the query to the Scout backend API
2. AI agent searches and analyzes web content
3. Returns formatted results (usually takes 30-60 seconds)

## Usage Examples

### Example 1: News Search
**User**: "搜索最近的 LLM 新闻"

**Action**:
```bash
node scripts/search.js "搜索最近的 LLM 新闻"
```

### Example 2: Restaurant Search
**User**: "Find new Indian restaurants in San Francisco"

**Action**:
```bash
node scripts/search.js "Find new Indian restaurants in San Francisco"
```

### Example 3: Job Search
**User**: "Search for remote software engineer jobs at YC companies"

**Action**:
```bash
node scripts/search.js "Search for remote software engineer jobs at YC companies"
```

### Example 4: Product Research
**User**: "What are the best laptops for developers in 2024?"

**Action**:
```bash
node scripts/search.js "What are the best laptops for developers in 2024?"
```

## Command Options

### Basic Search
```bash
node scripts/search.js "your search query"
```

### Set Timeout (default: 60 seconds)
```bash
node scripts/search.js "complex query" --timeout 120
```

### JSON Output (for programmatic use)
```bash
node scripts/search.js "query" --json
```

### Verbose Mode (show detailed progress)
```bash
node scripts/search.js "query" --verbose
```

## What Scout Can Find

- 📰 **News & Updates** - Latest tech news, industry updates, announcements
- 🍽️ **Places & Businesses** - Restaurants, shops, services in specific areas
- 💼 **Jobs & Careers** - Job listings, company hiring, remote positions
- 🛍️ **Products & Reviews** - Product comparisons, reviews, recommendations
- 📚 **Research & Academia** - Papers, studies, expert opinions
- 🎬 **Entertainment** - Movies, shows, events, recommendations
- 🔧 **Technical Info** - Documentation, tutorials, troubleshooting
- 🌍 **General Knowledge** - Any factual information on the web

## Important Notes

### ⏱️ Wait Time
- Searches typically take **30-60 seconds**
- Inform users: "Searching, please wait about a minute..."
- Complex queries may take up to 2 minutes

### ✅ Zero Configuration
- **No API keys needed** - Everything configured on backend
- **No login required** - Public API access
- **No installation** - Just use the script

### 🎯 Best Practices

**1. Clear Query Formulation**
- Extract the core search intent from user's message
- Keep queries focused and specific
- Include location/date if mentioned by user

**2. Progress Communication**
- Tell user you're searching
- Explain it will take about a minute
- Show when results arrive

**3. Result Presentation**
- Format results clearly
- Highlight key information
- Provide source links

**4. Error Handling**
- If search fails, suggest simplifying the query
- Check if backend is accessible
- Offer to try again

## Advanced Usage

### Async Search (for long-running queries)

For complex searches that might take longer:

```bash
# Start async search
node scripts/async-search.js "complex query"
# Returns: Search started with ID: abc-123

# Check status later
node scripts/check-status.js abc-123
```

### Batch Search (multiple queries)

```bash
node scripts/batch-search.js queries.txt
```

Where `queries.txt` contains:
```
Latest AI news
Best restaurants in NYC
Remote jobs at startups
```

## Workflow

```
1. User asks to search for something
   ↓
2. Extract search query from user's message
   ↓
3. Execute: node scripts/search.js "query"
   ↓
4. Script calls backend API
   ↓
5. AI agent searches web (30-60s)
   ↓
6. Script receives and formats results
   ↓
7. Present results to user
```

## Error Handling

### Common Issues

**1. Timeout Error**
```
Error: Search timed out after 60 seconds
```
**Solution**: Retry with longer timeout
```bash
node scripts/search.js "query" --timeout 120
```

**2. Backend Unavailable**
```
Error: Cannot connect to Scout backend
```
**Solution**:
- Check if backend is online
- Try again in a few moments
- Report to user: "Scout service is temporarily unavailable"

**3. Invalid Query**
```
Error: Query is too short or invalid
```
**Solution**: Ask user to provide more specific search terms

**4. Rate Limit**
```
Error: Too many requests, please wait
```
**Solution**: Wait 1 minute and retry

## Script Reference

### Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `search.js` | Main search script | `node scripts/search.js "query"` |
| `async-search.js` | Start async search | `node scripts/async-search.js "query"` |
| `check-status.js` | Check search status | `node scripts/check-status.js <id>` |
| `batch-search.js` | Batch multiple searches | `node scripts/batch-search.js <file>` |
| `config.js` | Configuration | Edit backend URL |

### Script Location

All scripts are in the `scripts/` directory. They require Node.js 18+ and will auto-install dependencies on first run.

## Example Conversations

### Example 1: Simple Search

**User**: Search for recent AI news

**Claude**: I'll search for recent AI news. This will take about a minute...

[Executes: `node scripts/search.js "recent AI news"`]

✅ Found 8 results

📝 **Summary**: Discovered 8 recent AI news articles covering GPT-4.5 release, Claude 3.5 updates, and new AI regulations.

📋 **Results**:

1. **OpenAI Announces GPT-4.5 with Enhanced Reasoning**
   https://openai.com/blog/gpt-4-5
   OpenAI today released GPT-4.5, featuring 30% improvement in complex reasoning tasks...

2. **Anthropic Launches Claude 3.5 Opus**
   https://anthropic.com/news/claude-3-5-opus
   Claude 3.5 Opus now available to all users with 200K context window support...

[... more results ...]

---

### Example 2: Location-Based Search

**User**: I'm in San Francisco, find me good sushi restaurants

**Claude**: I'll search for highly-rated sushi restaurants in San Francisco...

[Executes: `node scripts/search.js "highly-rated sushi restaurants in San Francisco"`]

✅ Found 6 results

📝 **Summary**: Found 6 top-rated sushi restaurants in San Francisco, including Michelin-starred options and neighborhood favorites.

📋 **Results**:

1. **Kusakabe** ⭐⭐⭐ Michelin
   Address: 584 Washington St, San Francisco
   Known for: Omakase experience, fresh fish selection
   https://kusakabe-sf.com

[... more results ...]

---

### Example 3: Technical Search

**User**: How do I set up pg_cron in Supabase?

**Claude**: I'll search for guides on setting up pg_cron in Supabase...

[Executes: `node scripts/search.js "how to set up pg_cron in Supabase tutorial"`]

✅ Found 4 results

📝 **Summary**: Found official documentation and community tutorials for enabling and using pg_cron in Supabase.

📋 **Results**:

1. **Official Supabase Documentation - pg_cron**
   https://supabase.com/docs/guides/database/extensions/pgcron
   Complete guide to enabling and using pg_cron for scheduled jobs...

[... more results ...]

Would you like me to help you implement it based on these guides?

## Backend API

Scout connects to a backend API that handles the actual search execution. The backend is pre-configured with all necessary API keys (OpenAI, Firecrawl, etc.).

### API Endpoint

```
POST https://your-scout-backend.com/api/search
```

### Default Configuration

The default backend URL is configured in `scripts/config.js`. For production use, update this file with your backend URL.

## Troubleshooting

### Installation Issues

If scripts fail to run:

1. **Check Node.js version**:
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **Install dependencies manually**:
   ```bash
   cd scripts
   npm install
   ```

3. **Check permissions**:
   ```bash
   chmod +x scripts/*.js
   ```

### Search Issues

**Query returns no results**:
- Try broader search terms
- Check if query is too specific
- Verify backend is accessible

**Slow searches**:
- Normal for complex queries
- Consider using async search for very complex queries
- Check backend server load

**JSON parsing errors**:
- Ensure using latest script version
- Check backend API compatibility

## Support

For issues or questions:
- Check `examples/` directory for more usage patterns
- See `resources/api.md` for API documentation
- Report backend issues to your Scout administrator

## Tips for Best Results

1. **Be Specific**: Include key details like location, date range, or specific requirements
2. **Use Natural Language**: Write queries as you would ask a person
3. **One Topic Per Search**: Don't combine multiple unrelated searches
4. **Include Context**: Mention relevant details (e.g., "for developers", "in 2024")
5. **Follow Up**: Use results to ask clarifying questions or refine search

---

**Scout** - AI-powered search made simple. No config, no login, just results.

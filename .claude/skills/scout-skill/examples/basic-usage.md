# Scout Basic Usage Examples

This document provides examples of using Scout in Claude Code conversations.

## Simple Searches

### Example 1: Tech News

**User**: Search for latest AI news

**Claude's Actions**:
1. Recognizes search intent
2. Executes search script
3. Formats and presents results

**Behind the scenes**:
```bash
node scripts/search.js "latest AI news"
```

**Expected Output**:
```
Searching for: "latest AI news"
This will take about a minute, please wait...

✅ Search Complete

📝 Summary:
Found 8 recent AI news articles covering GPT-4.5 release, new AI regulations,
and Claude 3.5 updates from the past week.

📋 Found 8 results:

1. OpenAI Announces GPT-4.5 with Enhanced Reasoning
   🔗 https://openai.com/blog/gpt-4-5
   OpenAI today released GPT-4.5, featuring 30% improvement in complex
   reasoning tasks and extended context window...

2. Anthropic Launches Claude 3.5 Opus
   🔗 https://anthropic.com/news/claude-3-5-opus
   Claude 3.5 Opus now available to all users with 200K context support...

[... more results ...]
```

---

### Example 2: Restaurant Search

**User**: I'm in San Francisco. Find me good sushi restaurants.

**Claude's Response**:
```
I'll search for highly-rated sushi restaurants in San Francisco.
```

**Script Execution**:
```bash
node scripts/search.js "highly-rated sushi restaurants in San Francisco"
```

**Results**:
```
✅ Search Complete

📝 Summary:
Found 6 top-rated sushi restaurants in San Francisco, including
Michelin-starred options and neighborhood favorites.

📋 Found 6 results:

1. Kusakabe ⭐⭐⭐ Michelin
   🔗 https://kusakabe-sf.com
   Premium omakase experience in the Financial District. Known for
   exceptional fish quality and traditional preparation...
   📅 Reservations required 2 weeks in advance

2. Ju-Ni
   🔗 https://junisf.com
   Intimate 12-seat omakase bar in the Mission. Monthly changing menu...

[... more results ...]
```

---

### Example 3: Job Search

**User**: Search for remote software engineer jobs at YC companies

**Script**:
```bash
node scripts/search.js "remote software engineer jobs at YC companies"
```

**Results**:
```
✅ Search Complete

📝 Summary:
Found 12 remote software engineering positions at Y Combinator backed
companies, ranging from Series A to growth stage.

📋 Found 12 results:

1. Senior Full-Stack Engineer - BuildShip (YC W22)
   🔗 https://buildhip.com/careers
   Remote • $160k-$220k • Full-time
   Building the future of API development tools...

2. Backend Engineer - DataCorp (YC S21)
   🔗 https://datacorp.com/jobs
   Remote • $150k-$200k • Full-time
   Python, PostgreSQL, AWS experience required...

[... more results ...]
```

---

## Advanced Searches

### Example 4: Product Research

**User**: What are the best laptops for developers in 2024?

**Script**:
```bash
node scripts/search.js "best laptops for developers 2024 reviews"
```

**Results**:
```
✅ Search Complete

📝 Summary:
Compiled reviews and recommendations for developer laptops in 2024,
focusing on performance, build quality, and value.

📋 Found 7 results:

1. MacBook Pro M3 Max (2024) - Best Overall
   🔗 https://example.com/macbook-m3-review
   • Pros: Exceptional performance, long battery life, great display
   • Cons: Expensive, limited ports
   • Best for: iOS development, general programming
   • Price: $3,499

2. ThinkPad X1 Carbon Gen 12 - Best Windows Laptop
   🔗 https://example.com/thinkpad-review
   • Pros: Excellent keyboard, lightweight, durable
   • Cons: Average battery life
   • Best for: Enterprise development, Linux
   • Price: $1,899

[... more results ...]
```

---

### Example 5: Research Query

**User**: What is the current state of quantum computing research?

**Script**:
```bash
node scripts/search.js "quantum computing research 2024 current state breakthroughs"
```

**Results**:
```
✅ Search Complete

📝 Summary:
Current quantum computing research shows significant progress in error
correction, qubit stability, and practical applications. Major
breakthroughs from IBM, Google, and academic institutions.

📋 Found 10 results:

1. IBM Achieves Quantum Advantage in Error Correction
   🔗 https://research.ibm.com/blog/quantum-error-correction
   📅 January 2024
   IBM's new 1000+ qubit processor demonstrates reliable error
   correction at scale...

2. Google's Quantum AI Makes Breakthrough in Chemistry Simulation
   🔗 https://ai.google/research/quantum
   📅 December 2023
   Successfully simulated complex molecular interactions that would
   take classical computers years...

[... more results ...]
```

---

## Using Command Options

### Example 6: Extended Timeout

For complex queries that need more time:

**User**: Give me a comprehensive analysis of the current AI landscape

**Claude**:
```bash
node scripts/search.js "comprehensive AI landscape analysis 2024 trends companies research" --timeout 120
```

---

### Example 7: JSON Output

For programmatic processing:

```bash
node scripts/search.js "AI news" --json > results.json
```

Output:
```json
{
  "success": true,
  "results": [
    {
      "title": "OpenAI Announces GPT-4.5",
      "url": "https://openai.com/blog/gpt-4-5",
      "snippet": "OpenAI today released...",
      "date": "2024-01-15"
    }
  ],
  "summary": "Found 8 recent AI news articles...",
  "metadata": {
    "search_time": 45.2,
    "sources_checked": 15
  }
}
```

---

### Example 8: Verbose Mode

See detailed progress:

```bash
node scripts/search.js "AI trends" --verbose
```

Output:
```
Sending request to: https://scout-backend.com/api/search
Query: AI trends
Timeout: 60 seconds

Response received in 47.3s

✅ Search Complete

📝 Summary:
[...]

📋 Found 8 results:
[...]

ℹ️  Metadata:
   Search time: 47.2s
   Sources checked: 18
```

---

## Async Searches

### Example 9: Long-Running Search

For very complex queries:

**Start the search**:
```bash
node scripts/async-search.js "comprehensive market analysis of AI tools landscape 2024"
```

Output:
```
Starting async search for: "comprehensive market analysis..."

✅ Search started successfully

Search ID: 550e8400-e29b-41d4-a716-446655440000

To check status, run:
  node scripts/check-status.js 550e8400-e29b-41d4-a716-446655440000
```

**Check status**:
```bash
node scripts/check-status.js 550e8400-e29b-41d4-a716-446655440000
```

Output (while running):
```
Checking status for search: 550e8400-e29b-41d4-a716-446655440000

Status: RUNNING
Progress: 65%
Message: Analyzing search results
```

**Wait for completion**:
```bash
node scripts/check-status.js 550e8400-e29b-41d4-a716-446655440000 --wait
```

Output:
```
Checking status for search: 550e8400-e29b-41d4-a716-446655440000
Waiting for search to complete...
Press Ctrl+C to stop waiting

Progress: 100%

✅ Search Complete

[... results ...]
```

---

## Handling Different Types of Queries

### Location-Based

```bash
node scripts/search.js "coffee shops in Brooklyn with wifi"
node scripts/search.js "hiking trails near Seattle"
node scripts/search.js "coworking spaces in Austin Texas"
```

### Time-Sensitive

```bash
node scripts/search.js "tech events in SF this week"
node scripts/search.js "movies opening this weekend"
node scripts/search.js "2024 new product releases"
```

### Technical

```bash
node scripts/search.js "how to set up Docker on Ubuntu 22.04"
node scripts/search.js "React hooks best practices 2024"
node scripts/search.js "PostgreSQL performance tuning guide"
```

### Shopping/Products

```bash
node scripts/search.js "best noise cancelling headphones under 300"
node scripts/search.js "4K monitor recommendations for programming"
node scripts/search.js "standing desk reviews 2024"
```

---

## Error Handling

### Example 10: Timeout

**Query**:
```bash
node scripts/search.js "extremely complex query requiring extensive research"
```

**If it times out**:
```
❌ Search failed: Request timed out

💡 Suggestions:
   - Try increasing timeout: node search.js "query" --timeout 120
   - Simplify your search query
   - Try again later
```

**Solution**:
```bash
node scripts/search.js "extremely complex query" --timeout 180
```

---

### Example 11: No Results

**Query**:
```bash
node scripts/search.js "asdfqwerzxcv nonexistent topic"
```

**Output**:
```
✅ Search Complete

No results found. Try different search terms.
```

**Better query**:
```bash
node scripts/search.js "relevant topic with real keywords"
```

---

### Example 12: Backend Down

**Output**:
```
❌ Search failed: Network error: ENOTFOUND scout-backend.com

💡 Suggestions:
   - Check if the backend URL is correct in scripts/config.js
   - Verify you have internet connection
   - Ensure the Scout backend is running
```

**Check config**:
```javascript
// scripts/config.js
API_BASE_URL: 'https://your-scout-backend.com/api' // Verify this is correct
```

---

## Tips for Best Results

### 1. Be Specific

❌ Bad: "restaurants"
✅ Good: "Italian restaurants in downtown Chicago"

❌ Bad: "news"
✅ Good: "AI news from the past week"

### 2. Include Context

❌ Bad: "jobs"
✅ Good: "remote software engineering jobs at Series A startups"

❌ Bad: "hotels"
✅ Good: "budget hotels near Times Square New York under $150"

### 3. Use Natural Language

✅ "What are the best frameworks for building mobile apps in 2024?"
✅ "How do I deploy a Next.js app to Vercel?"
✅ "Find me vegan restaurants in Portland with outdoor seating"

### 4. One Topic Per Search

❌ "restaurants in SF and hotels in NYC and flights to LA"
✅ Separate searches for each topic

---

## Common Patterns

### Pattern 1: News Search
```
"[topic] news [timeframe]"
Examples:
- "AI news this week"
- "crypto news today"
- "Apple news past month"
```

### Pattern 2: Local Search
```
"[what] in/near [where] with [feature]"
Examples:
- "coffee shops in Brooklyn with wifi"
- "gyms near downtown Seattle with pool"
- "coworking spaces in Austin with meeting rooms"
```

### Pattern 3: Product Search
```
"best [product] for [use case] under [price]"
Examples:
- "best laptop for video editing under $2000"
- "best running shoes for marathon training"
- "best budget smartphone 2024"
```

### Pattern 4: How-To Search
```
"how to [action] [object] [context]"
Examples:
- "how to deploy Docker container to AWS"
- "how to optimize React app performance"
- "how to learn Python for data science"
```

---

These examples should help you understand how to effectively use Scout for various search tasks!

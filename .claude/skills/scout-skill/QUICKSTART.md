# Scout Skill - Quick Start Guide

This guide will help you get Scout up and running in 5 minutes.

## What is Scout?

Scout is a Claude Code skill that provides AI-powered web search capabilities. Users can search for anything - news, restaurants, jobs, products - without any configuration.

## Installation

### Option 1: Manual Install (Fastest)

```bash
# Copy to Claude Code skills directory
mkdir -p ~/.claude/skills
cp -r scout-skill ~/.claude/skills/scout

# Or for project-specific
mkdir -p .claude/skills
cp -r scout-skill .claude/skills/scout
```

### Option 2: From Plugin (If Available)

```bash
/plugin install scout@your-org
```

## Configuration

### 1. Update Backend URL

Edit `scout-skill/scripts/config.js`:

```javascript
module.exports = {
  API_BASE_URL: 'https://your-scout-backend.com/api',  // Change this!
  // ... rest of config
};
```

Or set environment variable:

```bash
export SCOUT_API_URL=https://your-scout-backend.com/api
```

### 2. Test Connection

```bash
cd scout-skill/scripts
node search.js "test query"
```

If you see results, you're all set!

## Usage

Once installed, just ask Claude to search:

```
You: Search for latest AI news

Claude: I'll search for latest AI news. This will take about a minute...

[Claude uses Scout skill]

✅ Found 8 results

📝 Summary: Found 8 recent AI news articles covering GPT-4.5 release...

📋 Results:
1. OpenAI Announces GPT-4.5...
2. Anthropic Launches Claude 3.5...
[...]
```

## What Scout Can Do

- 📰 **News** - "Search for AI news this week"
- 🍽️ **Places** - "Find sushi restaurants in San Francisco"
- 💼 **Jobs** - "Remote software engineer positions"
- 🛍️ **Products** - "Best laptops for developers 2024"
- 📚 **Research** - "Current state of quantum computing"
- 🌍 **General** - Any web search query

## Common Commands

### Basic Search
```bash
node scripts/search.js "your query"
```

### With Timeout
```bash
node scripts/search.js "complex query" --timeout 120
```

### JSON Output
```bash
node scripts/search.js "query" --json
```

### Async Search
```bash
# Start
node scripts/async-search.js "long query"
# Returns: Search ID: abc-123

# Check status
node scripts/check-status.js abc-123
```

## Backend Setup

Scout requires a backend API. You have two options:

### Option A: Use Open Scouts Backend

1. Deploy Open Scouts (see main README.md)
2. Add public API routes (see resources/backend-api.md)
3. Update config.js with your URL

### Option B: Custom Backend

Implement the API spec in `resources/backend-api.md`:
- `POST /search` - Synchronous search
- `POST /search/async` - Async search
- `GET /search/status/:id` - Status check

## Directory Structure

```
scout-skill/
├── SKILL.md                  # Skill definition (required by Claude Code)
├── README.md                 # Full documentation
├── QUICKSTART.md            # This file
├── scripts/
│   ├── config.js            # Configuration
│   ├── search.js            # Main search script
│   ├── async-search.js      # Async search
│   ├── check-status.js      # Status checker
│   └── package.json         # Node.js config
├── resources/
│   └── backend-api.md       # API specification
└── examples/
    └── basic-usage.md       # Usage examples
```

## Troubleshooting

### "Cannot find module"

Install Node.js 18+:
```bash
node --version  # Should be 18.0.0+
```

### "Connection refused"

Check backend URL in `scripts/config.js` is correct and backend is running.

### "Request timed out"

Increase timeout:
```bash
node scripts/search.js "query" --timeout 180
```

### "No results found"

Try:
- More specific keywords
- Simpler query
- Different phrasing

## Next Steps

1. **Read Full Docs**: See README.md for complete documentation
2. **Check Examples**: See examples/basic-usage.md for usage patterns
3. **Backend API**: See resources/backend-api.md for API implementation
4. **Customize**: Edit scripts/config.js for your needs

## Support

- **Documentation**: README.md, resources/, examples/
- **API Spec**: resources/backend-api.md
- **Examples**: examples/basic-usage.md
- **Issues**: Report via GitHub

## Tips for Best Results

1. **Be Specific**: "Italian restaurants in Brooklyn" vs "restaurants"
2. **Include Context**: "for developers", "in 2024", "budget friendly"
3. **Natural Language**: Write like you're asking a person
4. **One Topic**: Don't combine multiple unrelated searches

---

**You're ready to start using Scout!** 🎉

Try it out:
```
You: Search for the best coffee shops in my city

Claude: [Uses Scout to find results...]
```

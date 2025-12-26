# Scout - AI-Powered Web Search Skill for Claude Code

Scout is a Claude Code skill that provides AI-powered web search capabilities with zero configuration. Just install and start searching!

## Features

- 🔍 **AI-Powered Search** - Intelligent web search and analysis
- ⚡ **Zero Configuration** - No API keys or login required
- 🚀 **Instant Results** - Results in 30-60 seconds
- 🌐 **Universal** - Works for news, places, jobs, research, and more
- 📊 **Rich Results** - Formatted summaries with links and snippets

## Installation

### Option 1: Claude Code Plugin (Recommended)

```bash
# Add as plugin marketplace
/plugin marketplace add your-org/scout-skill

# Install
/plugin install scout@your-org
```

### Option 2: Manual Installation

```bash
# Global installation
mkdir -p ~/.claude/skills
cp -r scout-skill ~/.claude/skills/scout

# Project-specific installation
mkdir -p .claude/skills
cp -r scout-skill .claude/skills/scout
```

### Option 3: Symlink (for development)

```bash
ln -s /path/to/scout-skill ~/.claude/skills/scout
```

## Quick Start

Once installed, just ask Claude to search for anything:

```
You: Search for latest AI news
Claude: [Uses Scout skill to search and returns results]

You: Find good sushi restaurants in San Francisco
Claude: [Searches and shows restaurant recommendations]

You: What are the best laptops for developers in 2024?
Claude: [Returns product recommendations and reviews]
```

## How It Works

```
User Query → Claude recognizes search intent
    ↓
Skill provides search script
    ↓
Claude executes: node scripts/search.js "query"
    ↓
Script calls Scout backend API
    ↓
AI agent searches web (30-60s)
    ↓
Results returned and formatted
    ↓
Claude presents results to user
```

## Configuration

### Backend URL

Update `scripts/config.js` to point to your Scout backend:

```javascript
module.exports = {
  API_BASE_URL: 'https://your-scout-backend.com/api',
  // ... other config
};
```

Or set via environment variable:

```bash
export SCOUT_API_URL=https://your-scout-backend.com/api
```

### Advanced Options

See `scripts/config.js` for all configuration options:
- Timeout settings
- Output formatting
- API endpoints
- Request headers

## Usage Examples

### Basic Search

```bash
node scripts/search.js "your search query"
```

### With Timeout

```bash
node scripts/search.js "complex query" --timeout 120
```

### JSON Output

```bash
node scripts/search.js "query" --json
```

### Verbose Mode

```bash
node scripts/search.js "query" --verbose
```

### Async Search (for long queries)

```bash
# Start search
node scripts/async-search.js "comprehensive research query"
# Returns: Search ID: abc-123

# Check status
node scripts/check-status.js abc-123

# Wait for completion
node scripts/check-status.js abc-123 --wait
```

## What Scout Can Find

- 📰 News & Updates
- 🍽️ Restaurants & Places
- 💼 Jobs & Careers
- 🛍️ Products & Reviews
- 📚 Research & Academia
- 🎬 Entertainment
- 🔧 Technical Documentation
- 🌍 General Knowledge

## Requirements

- **Node.js**: 18.0.0 or higher
- **Network**: Internet connection to reach backend API
- **Backend**: Scout backend API running and accessible

## Troubleshooting

### Command Not Found

Make sure Node.js is installed:

```bash
node --version  # Should be 18.0.0+
```

### Connection Errors

Check backend URL in `scripts/config.js`:

```javascript
API_BASE_URL: 'https://your-scout-backend.com/api'
```

Test backend connectivity:

```bash
curl https://your-scout-backend.com/api/health
```

### Timeout Errors

Increase timeout for complex queries:

```bash
node scripts/search.js "query" --timeout 180
```

### No Results

Try:
- Simplifying your query
- Being more specific with keywords
- Including relevant context (location, date, etc.)

## Backend Setup

Scout requires a backend API. See `resources/backend-api.md` for:
- API specification
- Open Scouts backend setup
- Custom backend implementation

## Development

### Project Structure

```
scout-skill/
├── SKILL.md              # Skill definition
├── README.md             # This file
├── scripts/
│   ├── search.js         # Main search script
│   ├── async-search.js   # Async search
│   ├── check-status.js   # Status checker
│   ├── config.js         # Configuration
│   └── package.json      # Node.js package
├── resources/
│   ├── backend-api.md    # API documentation
│   └── examples.md       # Usage examples
└── examples/
    ├── basic-search.md   # Basic examples
    └── advanced.md       # Advanced usage
```

### Testing Scripts

```bash
# Direct script test
cd scripts
node search.js "test query"

# With npm
cd scripts
npm run search -- "test query"
```

### Making Scripts Executable

```bash
chmod +x scripts/*.js
```

Then run directly:

```bash
./scripts/search.js "query"
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test your changes
4. Submit a pull request

## Support

- **Issues**: Report bugs via GitHub issues
- **Documentation**: See `resources/` directory
- **Examples**: Check `examples/` directory

## License

MIT License - See LICENSE file for details

## Credits

Built on top of [Open Scouts](https://github.com/firecrawl/open-scouts) - AI-powered monitoring platform.

---

**Scout** - Making web search intelligent and effortless.

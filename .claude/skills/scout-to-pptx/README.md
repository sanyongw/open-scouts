# Scout to PowerPoint - Client

Ultra-simple client for generating PowerPoint presentations from search queries using the Open Scouts backend.

## Overview

This skill is a **lightweight HTTP client** that calls the Open Scouts backend API to generate professional PowerPoint presentations. All the heavy lifting (search, AI analysis, image generation, PPTX assembly) happens on the backend.

## Quick Start

```bash
cd .claude/skills/scout-to-pptx/scripts
node generate-pptx.js "AI industry trends 2024"
```

That's it! No dependencies to install, no API keys to configure.

## Architecture

```
┌──────────────────────────────────────┐
│  Skill (Client)                       │
│  • Simple Node.js script              │
│  • No dependencies                    │
│  • No API keys needed                 │
│  • Just HTTP calls                    │
└──────────────────────────────────────┘
            │ HTTP POST
            ↓
┌──────────────────────────────────────┐
│  Open Scouts Backend                  │
│  • Firecrawl search                   │
│  • OpenAI analysis                    │
│  • Gemini image generation            │
│  • PPTX assembly with pptxgenjs       │
└──────────────────────────────────────┘
            ↓
      Returns PPTX file
```

## Features

- ✅ **Zero Configuration** - No setup needed on client side
- ✅ **Portable** - Copy to any machine with Node.js
- ✅ **Secure** - API keys stay on the backend
- ✅ **Simple** - One script, no dependencies
- ✅ **Fast** - Direct HTTP streaming of PPTX files

## Usage

### Basic Command

```bash
node generate-pptx.js "your search query"
```

### Options

```bash
# Skip image generation (faster, 1-2 min instead of 4-5 min)
node generate-pptx.js "query" --no-images

# Extended timeout for complex searches
node generate-pptx.js "query" --timeout 600

# Verbose output
node generate-pptx.js "query" --verbose

# Help
node generate-pptx.js --help
```

## Generated Presentation

Your PPTX will include:

1. **Cover Slide** - Title + subtitle + AI-generated hero image
2. **Content Slides** (4-6) - Key points + section images
3. **Conclusion Slide** - Summary and recommendations
4. **Sources Slide** - Clickable reference links

## Requirements

**Client (this skill)**:
- Node.js 18+
- No npm dependencies!

**Backend (Open Scouts)**:
- Running Open Scouts instance
- API keys configured in `.env`

## Configuration

### Optional Environment Variables

```bash
# Backend URL (default: http://localhost:3000)
export SCOUT_API_URL="http://your-backend.com"

# Output directory (default: current directory)
export PPTX_OUTPUT_DIR="./presentations"
```

### Backend Setup

The Open Scouts backend needs these in `.env`:

```bash
# Required for all features
FIRECRAWL_API_KEY=your-firecrawl-key
OPENAI_API_KEY=your-openai-key

# Required for image generation
GEMINI_IMAGE_API_URL=https://llm.tokencloud.ai
GEMINI_IMAGE_API_KEY=your-gemini-key
GEMINI_IMAGE_MODEL=openrouter/google/gemini-3-pro-image-preview
```

## Examples

### Example 1: Tech Industry Report

```bash
node generate-pptx.js "AI industry trends 2024"
```

**Output**:
- File: `scout-report-AI-industry-trends-2024-1704123456.pptx`
- Time: ~4 minutes
- Size: ~2-3 MB
- Slides: 8-10

### Example 2: Quick Draft (No Images)

```bash
node generate-pptx.js "climate change solutions" --no-images
```

**Output**:
- Time: ~1.5 minutes
- Slides: 8-10 (text only)
- Perfect for quick reviews

### Example 3: Comprehensive Research

```bash
node generate-pptx.js "quantum computing breakthroughs" --timeout 600 --verbose
```

**Output**:
- Extended processing time
- Detailed logging
- Comprehensive content

## Timing

| Mode | Time | Use Case |
|------|------|----------|
| With Images | 3-5 min | Final presentations |
| Without Images | 1-2 min | Quick drafts, reviews |
| Complex Topics | 5-10 min | Detailed research |

## Error Handling

### Backend Not Running
```
Error: Network error: connect ECONNREFUSED
```
**Solution**: Start Open Scouts backend or check `SCOUT_API_URL`

### Timeout
```
Error: Request timed out
```
**Solutions**:
- Use `--no-images` for faster generation
- Increase timeout: `--timeout 600`
- Simplify query

### API Key Missing
```
Error: Gemini API configuration missing
```
**Solution**: Configure `GEMINI_IMAGE_API_KEY` in backend `.env`

## API Endpoint

The script calls:
```
POST {SCOUT_API_URL}/api/public/generate-pptx

Body:
{
  "query": "search query",
  "options": {
    "generateImages": true
  }
}

Response:
PPTX file stream (application/vnd.openxmlformats...)
```

## Project Structure

```
.claude/skills/scout-to-pptx/
├── SKILL.md              # Claude Code skill definition
├── README.md             # This file
├── QUICKSTART.md         # Quick start guide
├── examples/
│   └── usage.md          # Usage examples
└── scripts/
    ├── config.js         # Simple configuration
    ├── generate-pptx.js  # Main script (HTTP client)
    └── package.json      # Metadata (no dependencies)
```

## Development

### Testing Locally

```bash
# Start Open Scouts backend first
cd /path/to/open-scouts
npm run dev

# Then test the skill
cd .claude/skills/scout-to-pptx/scripts
node generate-pptx.js "test query" --verbose
```

### Debugging

```bash
# Check if backend is accessible
curl http://localhost:3000/api/health

# Test with verbose output
node generate-pptx.js "test" --verbose

# Check backend logs
# (in Open Scouts directory)
npm run dev
# Look for [Generate PPTX] logs
```

## Troubleshooting

**Q: Script can't connect to backend**
```bash
# Check backend URL
echo $SCOUT_API_URL

# Test connection
curl http://localhost:3000/api/health

# If using custom URL, set it:
export SCOUT_API_URL="http://your-backend.com"
```

**Q: File not saving**
```bash
# Check output directory
echo $PPTX_OUTPUT_DIR

# Create directory
mkdir -p ./presentations
export PPTX_OUTPUT_DIR="./presentations"
```

**Q: Image generation failing**
```bash
# Backend logs will show:
# [Generate PPTX] Image generation failed...

# Check backend .env has:
GEMINI_IMAGE_API_KEY=your-key
GEMINI_IMAGE_API_URL=https://llm.tokencloud.ai
GEMINI_IMAGE_MODEL=openrouter/google/gemini-3-pro-image-preview
```

## Performance Tips

1. **Use --no-images** for drafts: 3x faster
2. **Specific queries** return better results
3. **Increase timeout** for complex topics
4. **Check backend logs** for detailed progress

## Security

- ✅ No API keys stored in skill
- ✅ All secrets on backend
- ✅ HTTPS recommended for production
- ✅ Backend handles authentication

## License

MIT

## Support

- **Skill Issues**: Check this README
- **Backend Issues**: See Open Scouts documentation
- **API Configuration**: Check backend `.env` file

---

**Scout to PowerPoint** - Professional presentations in minutes, powered by Open Scouts.

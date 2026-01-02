---
name: scout-to-pptx
description: Generate professional PowerPoint presentations from web search results with AI-generated images. Simple client that calls Open Scouts backend API - no configuration needed, just run!
---

# Scout to PowerPoint - Client

Ultra-simple client for generating PowerPoint presentations from search queries.

## Quick Start

```bash
node scripts/generate-pptx.js "AI industry trends"
```

That's it! The script will:
1. Send your query to the Open Scouts backend
2. Wait for the backend to process (search → analyze → generate images → assemble PPTX)
3. Download and save the PowerPoint file

## Usage Examples

### Example 1: Basic Search
**User**: "Create a PowerPoint about recent AI news"

**Action**:
```bash
node scripts/generate-pptx.js "recent AI news 2024"
```

### Example 2: Fast Mode (No Images)
**User**: "Make a quick presentation, skip the images"

**Action**:
```bash
node scripts/generate-pptx.js "climate tech innovations" --no-images
```

### Example 3: Complex Topic
**User**: "Generate a detailed presentation about quantum computing"

**Action**:
```bash
node scripts/generate-pptx.js "quantum computing breakthroughs" --timeout 600
```

## Command Options

```bash
# Basic
node scripts/generate-pptx.js "query"

# Skip images (faster, 1-2 min instead of 4-5 min)
node scripts/generate-pptx.js "query" --no-images

# Extended timeout for complex searches
node scripts/generate-pptx.js "query" --timeout 600

# Verbose output
node scripts/generate-pptx.js "query" --verbose
```

## What You Get

Your PowerPoint will include:
- **Cover Slide** with AI-generated hero image
- **4-6 Content Slides** with key points and custom images
- **Conclusion Slide** with takeaways
- **Sources Slide** with clickable links

## Architecture

```
┌─────────────────────────────┐
│  This Skill (Client)        │
│  - Sends HTTP request       │
│  - Downloads PPTX file      │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│  Open Scouts Backend        │
│  - Scout search             │
│  - OpenAI analysis          │
│  - Gemini image generation  │
│  - PPTX assembly            │
└─────────────────────────────┘
```

**Benefits**:
- ✅ **Zero Configuration** - No API keys needed in the skill
- ✅ **Portable** - Works anywhere Node.js is installed
- ✅ **Simple** - Just one script file
- ✅ **Secure** - API keys stay on the backend

## Requirements

- **Node.js 18+** (no dependencies to install!)
- **Open Scouts backend** running and accessible

## Configuration

### Optional Environment Variables

```bash
# Backend URL (default: http://localhost:3000)
export SCOUT_API_URL="http://localhost:3000"

# Output directory (default: current directory)
export PPTX_OUTPUT_DIR="./presentations"
```

That's all! No API keys needed on the client side.

## Timing

- **With Images**: 3-5 minutes
- **Without Images**: 1-2 minutes

Inform users: "Generating your presentation, this will take about 4 minutes..."

## Error Handling

### Backend Not Running
```
Error: Network error: connect ECONNREFUSED
```
**Solution**: Make sure Open Scouts backend is running

### Timeout
```
Error: Request timed out
```
**Solution**: Use `--timeout 600` or `--no-images`

## Backend Setup

The backend needs these environment variables in `.env`:

```bash
# Required
FIRECRAWL_API_KEY=your-key
OPENAI_API_KEY=your-key

# For image generation
GEMINI_IMAGE_API_URL=https://llm.tokencloud.ai
GEMINI_IMAGE_API_KEY=your-key
GEMINI_IMAGE_MODEL=openrouter/google/gemini-3-pro-image-preview
```

## Workflow

```
User asks for presentation
   ↓
Claude recognizes scout-to-pptx skill
   ↓
Execute: node scripts/generate-pptx.js "query"
   ↓
Script sends HTTP POST to /api/public/generate-pptx
   ↓
Backend processes (3-5 minutes):
  • Searches web with Firecrawl
  • Analyzes with OpenAI
  • Generates images with Gemini
  • Assembles PowerPoint
   ↓
Script downloads PPTX file
   ↓
Saved: scout-report-query-timestamp.pptx
```

## Example Conversations

### Example 1: Standard Request

**User**: Create a presentation about AI safety research

**Claude**: I'll generate a professional PowerPoint about AI safety research. This will take about 4 minutes...

[Executes: `node scripts/generate-pptx.js "AI safety research recent developments"`]

✅ Presentation generated!

📁 File: scout-report-AI-safety-research-1704123456.pptx
📦 Size: 2.3 MB
⏱️ Time: 4.2 minutes

---

### Example 2: Quick Version

**User**: I need a quick presentation, no fancy images

**Claude**: I'll create a fast text-only presentation...

[Executes: `node scripts/generate-pptx.js "renewable energy" --no-images`]

✅ Done in 1.5 minutes!

## Tips

1. **Be Specific**: "AI in healthcare 2024" > "AI"
2. **Use --no-images**: For quick drafts or when time is limited
3. **Increase Timeout**: For comprehensive topics: `--timeout 600`
4. **Check Backend**: Ensure Open Scouts is running before starting

## Troubleshooting

**Q: "Cannot connect to backend"**
A: Check if `http://localhost:3000` is accessible or set `SCOUT_API_URL`

**Q: "Request timed out"**
A: Try `--no-images` or increase timeout with `--timeout 600`

**Q: "File not generated"**
A: Check backend logs for errors

## Files

```
.claude/skills/scout-to-pptx/
├── SKILL.md              # This file
├── README.md             # Full documentation
├── QUICKSTART.md         # Quick start guide
└── scripts/
    ├── config.js         # Simple config
    └── generate-pptx.js  # Main script (HTTP client only)
```

## Support

- **Issues**: Check backend logs in Open Scouts
- **Docs**: See README.md for details
- **Backend**: Ensure all API keys are configured in Open Scouts `.env`

---

**Scout to PowerPoint** - Professional presentations in minutes, powered by your Open Scouts backend.

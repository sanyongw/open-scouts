# Scout to PowerPoint - Quick Start Guide

Get started in 2 minutes!

## Prerequisites

- Node.js 18+ installed
- Open Scouts backend running

## Installation

### No Installation Needed!

The skill has no dependencies. Just use it:

```bash
cd .claude/skills/scout-to-pptx/scripts
node generate-pptx.js "AI news"
```

## Backend Setup (One-Time)

The Open Scouts backend needs API keys in `.env`:

```bash
# In Open Scouts root directory
# Add these to .env file:

GEMINI_IMAGE_API_URL=https://llm.tokencloud.ai
GEMINI_IMAGE_API_KEY=sk-RPo8Q8Lf9_SKoNMSjo5DNA
GEMINI_IMAGE_MODEL=openrouter/google/gemini-3-pro-image-preview
```

### Test the Setup

```bash
node generate-pptx.js "AI news" --no-images
```

If successful, you'll see a PowerPoint file created in ~1 minute!

## Basic Usage

### Simple Presentation

```bash
node scripts/generate-pptx.js "your search topic"
```

**Time**: 4-5 minutes
**Output**: PowerPoint with AI-generated images

### Quick Draft (No Images)

```bash
node scripts/generate-pptx.js "your topic" --no-images
```

**Time**: 1-2 minutes
**Output**: Text-only PowerPoint

## Usage from Claude Code

Once configured, just ask Claude:

```
You: Create a PowerPoint about quantum computing

Claude: [Uses scout-to-pptx skill]
         Generating presentation...

         ✅ Generated: scout-report-quantum-computing-xxx.pptx
```

## Common Commands

```bash
# Basic
node scripts/generate-pptx.js "AI trends 2024"

# No images (faster)
node scripts/generate-pptx.js "market analysis" --no-images

# Extended search
node scripts/generate-pptx.js "comprehensive research" --timeout 180

# Debug mode
node scripts/generate-pptx.js "test topic" --verbose
```

## What to Expect

### With Images (Default)
- ⏱️ Time: 4-5 minutes
- 📊 Slides: 8-10
- 🎨 Custom AI images on every slide
- 💰 Cost: ~$0.05 per presentation

### Without Images
- ⏱️ Time: 1-2 minutes
- 📊 Slides: 8-10
- 📝 Text and bullet points only
- 💰 Cost: ~$0.002 per presentation

## Troubleshooting

### "Scout search failed"
```bash
# Check Scout backend
curl http://localhost:3000/api/health
```

### "OPENAI_API_KEY not set"
```bash
# Add to .env
echo "OPENAI_API_KEY=sk-your-key" >> .env
```

### "Command not found"
```bash
# Install dependencies
cd scripts && npm install
```

## Tips

1. **Be Specific**: "AI healthcare 2024" > "AI"
2. **Use Keywords**: "market analysis", "latest trends"
3. **Warn Users**: Tell them it takes 5 minutes
4. **Draft First**: Use `--no-images` for quick review

## Next Steps

- Read full [README.md](README.md)
- Check [SKILL.md](SKILL.md) for Claude Code integration
- See [examples/](examples/) for usage patterns

---

You're ready! Start creating presentations with AI 🚀

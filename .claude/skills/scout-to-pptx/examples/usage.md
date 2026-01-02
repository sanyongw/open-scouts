# Scout to PowerPoint - Usage Examples

Real-world examples of generating presentations.

## Example 1: Technology Industry Report

### Command
```bash
node scripts/generate-pptx.js "artificial intelligence industry trends 2024"
```

### Output
**File**: `scout-report-artificial-intelligence-industry-1704123456.pptx`

**Slides**:
1. Cover: "AI Industry Trends 2024"
2. Market Growth & Projections
3. Leading Companies & Innovations
4. Key Applications & Use Cases
5. Challenges & Concerns
6. Future Outlook
7. Conclusion
8. Sources

**Time**: 4.3 minutes

**Images**: 6 AI-generated images showing:
- Futuristic AI visualization
- Tech company logos concept
- Healthcare AI application
- Data security concept
- Innovation pathway
- Sources (text slide)

---

## Example 2: Market Analysis

### Command
```bash
node scripts/generate-pptx.js "electric vehicle market analysis 2024" --verbose
```

### Output
```
🔍 Step 1/4: Searching the web...
   Query: "electric vehicle market analysis 2024"
   ✅ Found 12 results

🤖 Step 2/4: Analyzing and creating outline...
   ✅ Created 5 sections

📊 Step 3/4: Building PowerPoint...

🎨 Generating cover image...
   Generated prompt: "Modern electric vehicle charging at futuristic..."
   ✅ Image generated successfully

🎨 Generating image for section 1/5...
   Generated prompt: "Global electric vehicle market growth chart..."
   ✅ Image generated successfully

[... continues for all sections ...]

✅ SUCCESS!
📁 File: scout-report-electric-vehicle-market-1704234567.pptx
📊 Slides: 9
⏱️  Time: 4.7s
```

**Slides Include**:
- Market Size & Growth
- Key Players (Tesla, BYD, etc.)
- Consumer Adoption Trends
- Infrastructure Development
- Regulatory Environment
- Recommendations

---

## Example 3: Quick Business Brief (No Images)

### Command
```bash
node scripts/generate-pptx.js "startup funding Q4 2024" --no-images
```

### Output
**File**: `scout-report-startup-funding-q4-1704345678.pptx`

**Time**: 1.2 minutes (fast!)

**Use Case**:
- Internal team updates
- Quick drafts
- Time-sensitive briefs

**Content**:
- Text and bullet points only
- No image generation delay
- All key information preserved

---

## Example 4: Research Summary

### Command
```bash
node scripts/generate-pptx.js "quantum computing commercial applications" --timeout 120
```

### Query Characteristics
- **Complex topic**: Needs extended search
- **Emerging field**: Latest developments
- **Technical depth**: Detailed analysis

### Output Sections
1. Quantum Computing Fundamentals
2. Current Commercial Applications
3. Industry Leaders & Startups
4. Challenges & Limitations
5. Future Potential
6. Investment Outlook

**Time**: 5.2 minutes (extended search + images)

---

## Example 5: Competitive Analysis

### Scenario
User wants comparison of AI assistants

### Command
```bash
node scripts/generate-pptx.js "GPT-4 vs Claude vs Gemini comparison 2024"
```

### Generated Outline
- **Title**: "AI Assistants Comparison 2024"
- **Sections**:
  1. Overview of Leading AI Assistants
  2. Capabilities Comparison
  3. Pricing & Accessibility
  4. Use Case Strengths
  5. User Experience & Interface
  6. Recommendations by Need

### Images Generated
- AI assistant concept art
- Feature comparison visualization
- Pricing tiers concept
- Use case scenarios
- User interface mockup
- Decision matrix visual

---

## Example 6: Educational Content

### Command
```bash
node scripts/generate-pptx.js "climate change causes and solutions for students"
```

### Special Characteristics
- **Audience-aware**: Simplified for students
- **Educational focus**: Clear explanations
- **Visual learning**: Strong emphasis on images

### Generated Content
- Simple, clear language
- Bullet points with key facts
- Visual representations of concepts
- Action items for students
- Resource links

---

## Example 7: Batch Generation

### Use Case
Generate multiple presentations from a list

### Implementation
Create `topics.txt`:
```
AI in healthcare
Blockchain for supply chain
Remote work trends 2024
Sustainable energy innovations
```

### Bash Script
```bash
#!/bin/bash
while IFS= read -r topic; do
    echo "Generating: $topic"
    node scripts/generate-pptx.js "$topic" --no-images
    sleep 10
done < topics.txt
```

### Output
4 presentations generated in ~5 minutes total

---

## Example 8: Claude Code Integration

### User Request
```
User: Research renewable energy trends and create a presentation
```

### Claude's Actions
```
Claude: I'll research renewable energy trends and create a professional
        PowerPoint presentation for you.

        [Step 1] Searching for renewable energy trends...
        [Uses scout skill]

        [Step 2] Generating presentation with AI images...
        [Uses scout-to-pptx skill]

        ✅ Presentation created!

        📁 scout-report-renewable-energy-trends-1704456789.pptx
        📊 9 slides with custom AI-generated images

        The presentation covers:
        • Solar and wind energy growth
        • Emerging technologies
        • Market leaders
        • Policy developments
        • Investment trends
        • Future outlook
```

---

## Example 9: Troubleshooting Workflow

### Issue: Timeout on Complex Query

**Initial Command**:
```bash
node scripts/generate-pptx.js "comprehensive analysis global economy 2024"
```

**Error**:
```
❌ Error: Search timed out after 60 seconds
```

**Solution**:
```bash
# Increase timeout
node scripts/generate-pptx.js "comprehensive analysis global economy 2024" --timeout 180
```

**Result**: ✅ Success

---

## Example 10: Custom Styling (Advanced)

### Modify config.js Before Running

```javascript
// scripts/config.js
COLORS: {
  primary: '#1e40af',      // Corporate blue
  secondary: '#475569',
  accent: '#dc2626'        // Corporate red
},

FONTS: {
  heading: 'Helvetica',
  body: 'Arial'
}
```

### Run
```bash
node scripts/generate-pptx.js "corporate annual review"
```

### Result
Presentation with custom corporate branding

---

## Best Practices Summary

### Query Writing
✅ **Good**:
- "AI healthcare applications 2024"
- "Electric vehicle market trends analysis"
- "Startup funding rounds Q4 2024"

❌ **Avoid**:
- "AI" (too broad)
- "Tell me everything about technology" (unfocused)
- "???" (unclear intent)

### Time Management
- **Draft version**: Use `--no-images` (1-2 min)
- **Final version**: Include images (4-5 min)
- **Deep research**: Add `--timeout 180` (5-7 min)

### Use Cases by Speed

| Need | Command | Time |
|------|---------|------|
| Quick internal update | `--no-images` | 1-2 min |
| Client presentation | Default (with images) | 4-5 min |
| Comprehensive research | `--timeout 180` | 5-7 min |
| Multiple presentations | Batch script | Varies |

---

## Tips for Different Industries

### Tech/Startup
```bash
"YC winter 2024 batch analysis"
"SaaS pricing trends 2024"
"AI startup funding landscape"
```

### Healthcare
```bash
"telemedicine adoption trends"
"AI in medical diagnostics 2024"
"healthcare data privacy regulations"
```

### Finance
```bash
"cryptocurrency market trends Q4 2024"
"fintech innovations payment processing"
"ESG investing trends institutional"
```

### Education
```bash
"online learning platforms comparison 2024"
"AI in education applications"
"student engagement strategies remote"
```

---

## Common Workflows

### Workflow 1: Research → Present
1. Use scout-skill to research
2. Review findings
3. Generate presentation with scout-to-pptx
4. Review and refine

### Workflow 2: Quick Brief
1. Skip images for speed
2. Generate text-only presentation
3. Add images manually if needed

### Workflow 3: Comprehensive Report
1. Use extended timeout
2. Generate with images
3. Save images for reuse
4. Customize in PowerPoint if needed

---

Need more examples? Check the [README.md](../README.md) or [SKILL.md](../SKILL.md) for additional usage patterns!

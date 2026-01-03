import { NextRequest, NextResponse } from 'next/server';
import PptxGenJS from 'pptxgenjs';

export const maxDuration = 300; // 5 minutes

/**
 * Generate PowerPoint presentations from Scout search results
 *
 * This API endpoint:
 * 1. Accepts Scout search results (query, results, summary, keyFindings)
 * 2. Transforms Scout analysis into presentation outline
 * 3. Captures webpage screenshots as evidence (optional)
 * 4. Generates AI images for slides (optional)
 * 5. Assembles and returns a PPTX file
 *
 * POST /api/public/generate-pptx
 * Body: {
 *   scoutResults: {
 *     query: string,
 *     results: Array<{title: string, url: string, snippet: string}>,
 *     summary?: string,
 *     keyFindings?: Array<any>
 *   },
 *   options?: {
 *     generateImages?: boolean,
 *     captureScreenshots?: boolean
 *   }
 * }
 * Returns: PPTX file stream
 */
export async function POST(request: NextRequest) {
  try {
    const { scoutResults, options = {} } = await request.json();
    const { generateImages = true, captureScreenshots = false } = options;

    // Validate scoutResults
    if (!scoutResults || !scoutResults.query) {
      return NextResponse.json(
        { error: 'Scout results with query are required' },
        { status: 400 }
      );
    }

    if (!scoutResults.results || !Array.isArray(scoutResults.results) || scoutResults.results.length === 0) {
      return NextResponse.json(
        { error: 'Scout results must contain at least one search result' },
        { status: 400 }
      );
    }

    console.log('[Generate PPTX] Starting generation for query:', scoutResults.query);
    console.log('[Generate PPTX] Options:', { generateImages, captureScreenshots });
    console.log('[Generate PPTX] Scout results count:', scoutResults.results.length);

    const startTime = Date.now();

    // Get API keys from environment
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const GEMINI_IMAGE_API_URL = process.env.GEMINI_IMAGE_API_URL;
    const GEMINI_IMAGE_API_KEY = process.env.GEMINI_IMAGE_API_KEY;
    const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL;

    // Validate required keys
    if (captureScreenshots && !FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY required for screenshot capture');
    }
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (generateImages && (!GEMINI_IMAGE_API_KEY || !GEMINI_IMAGE_API_URL)) {
      throw new Error('Gemini API configuration missing for image generation');
    }

    // ========================================================================
    // STEP 1: Transform Scout results into presentation outline
    // ========================================================================
    console.log('[Generate PPTX] Step 1: Transforming Scout results...');

    // Use Scout's search results directly
    const searchResults = scoutResults.results.map((item: any) => ({
      title: item.title || item.url || 'Untitled',
      url: item.url || '',
      snippet: item.snippet || item.description || '',
      date: item.date || item.publishedTime || new Date().toISOString().split('T')[0],
    }));

    console.log('[Generate PPTX] Using', searchResults.length, 'Scout search results');

    // ========================================================================
    // STEP 2: Generate presentation outline from Scout data
    // ========================================================================
    console.log('[Generate PPTX] Step 2: Generating outline from Scout analysis...');

    let outline: any;

    // If Scout provided keyFindings, use them directly
    if (scoutResults.keyFindings && Array.isArray(scoutResults.keyFindings) && scoutResults.keyFindings.length > 0) {
      console.log('[Generate PPTX] Using Scout key findings:', scoutResults.keyFindings.length);

      outline = {
        title: scoutResults.query || 'Scout Research Report',
        subtitle: 'AI-Powered Research by Scout',
        sections: scoutResults.keyFindings.slice(0, 6).map((finding: any) => ({
          title: finding.title || finding.heading || 'Key Finding',
          content: finding.content || finding.description || finding.text || '',
          keyMessage: finding.insight || finding.keyMessage || finding.summary || '',
          sourceUrl: finding.url || finding.source || ''
        })),
        conclusion: scoutResults.summary || 'Research compiled by Scout AI'
      };
    } else {
      // Fallback: Use OpenAI to analyze Scout results
      console.log('[Generate PPTX] No key findings from Scout, generating outline with OpenAI...');

      const outlinePrompt = `You are an expert presentation designer. Given these Scout search results for the query "${scoutResults.query}", create a structured PowerPoint outline.

Search Results:
${searchResults.slice(0, 8).map((r: any, i: number) => `${i + 1}. ${r.title}\n   ${r.snippet}`).join('\n\n')}

${scoutResults.summary ? `\nScout's Summary:\n${scoutResults.summary}\n` : ''}

Your output must be valid JSON with this exact structure:
{
  "title": "Presentation title (concise, under 10 words)",
  "subtitle": "Brief subtitle or tagline",
  "sections": [
    {
      "title": "Section title",
      "content": "2-3 bullet points, each on a new line, starting with •",
      "keyMessage": "One sentence key takeaway"
    }
  ],
  "conclusion": "Overall conclusion and recommendations"
}

Guidelines:
- Create 4-6 sections maximum
- Each section should have a clear focus
- Use bullet points (starting with •)
- Keep content concise and impactful
- Focus on key insights

Return ONLY the JSON, no other text.`;

      const outlineResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: 'You are a presentation designer. Output only valid JSON.' },
            { role: 'user', content: outlinePrompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!outlineResponse.ok) {
        const errorText = await outlineResponse.text();
        throw new Error(`OpenAI outline generation failed: ${outlineResponse.status} - ${errorText}`);
      }

      const outlineData = await outlineResponse.json();
      outline = JSON.parse(outlineData.choices[0].message.content);
    }

    console.log('[Generate PPTX] Outline generated:', outline.title);
    console.log('[Generate PPTX] Sections:', outline.sections?.length || 0);

    // ========================================================================
    // STEP 3: Generate images with Gemini (if enabled)
    // ========================================================================
    const slideImages: Record<string, string> = {}; // slide index -> base64 image

    if (generateImages && GEMINI_IMAGE_API_KEY && GEMINI_IMAGE_API_URL) {
      console.log('[Generate PPTX] Step 3: Generating images...');

      // Helper function to generate image
      const generateImage = async (prompt: string, slideIndex: string): Promise<string | null> => {
        try {
          console.log(`[Generate PPTX] Generating image for ${slideIndex}...`);

          const imageResponse = await fetch(`${GEMINI_IMAGE_API_URL}/v1/images/generations`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GEMINI_IMAGE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: GEMINI_IMAGE_MODEL || 'openai/z-images',
              prompt: prompt,
              n: 1,
              size: '1024x1024',
              response_format: 'b64_json'
            }),
            signal: AbortSignal.timeout(60000),
          });

          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            console.warn(`[Generate PPTX] Image generation failed for ${slideIndex}:`, errorText);
            return null;
          }

          const imageData = await imageResponse.json();
          if (imageData.data && imageData.data[0]?.b64_json) {
            console.log(`[Generate PPTX] Image generated for ${slideIndex}`);
            return imageData.data[0].b64_json;
          }

          return null;
        } catch (error: any) {
          console.warn(`[Generate PPTX] Image generation error for ${slideIndex}:`, error.message);
          return null;
        }
      };

      // Helper function to create image prompt from content
      const createImagePrompt = async (title: string, content: string): Promise<string> => {
        try {
          const promptResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: OPENAI_MODEL,
              messages: [
                {
                  role: 'system',
                  content: 'Create a detailed image generation prompt (max 100 words) for a professional presentation slide. Focus on conceptual and abstract representations. Avoid text in images.'
                },
                {
                  role: 'user',
                  content: `Slide title: ${title}\nContent: ${content}\n\nCreate image prompt:`
                }
              ],
              temperature: 0.7,
              max_tokens: 150
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (promptResponse.ok) {
            const promptData = await promptResponse.json();
            return promptData.choices[0].message.content.trim();
          }
        } catch (error) {
          console.warn('[Generate PPTX] Prompt generation failed, using fallback');
        }

        // Fallback prompt
        return `Professional business concept illustration for: ${title}. Modern, clean, abstract style suitable for corporate presentation.`;
      };

      // Generate cover image
      const coverPrompt = await createImagePrompt(outline.title, outline.subtitle || '');
      const coverImage = await generateImage(coverPrompt, 'cover');
      if (coverImage) {
        slideImages['cover'] = coverImage;
      }

      // Generate section images
      if (outline.sections && outline.sections.length > 0) {
        for (let i = 0; i < Math.min(outline.sections.length, 6); i++) {
          const section = outline.sections[i];
          const sectionPrompt = await createImagePrompt(section.title, section.content);
          const sectionImage = await generateImage(sectionPrompt, `section-${i}`);
          if (sectionImage) {
            slideImages[`section-${i}`] = sectionImage;
          }
        }
      }

      console.log('[Generate PPTX] Generated', Object.keys(slideImages).length, 'images');
    }

    // ========================================================================
    // STEP 4: Assemble PowerPoint presentation
    // ========================================================================
    console.log('[Generate PPTX] Step 4: Assembling PowerPoint...');

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Scout AI';
    pptx.company = 'Open Scouts';
    pptx.subject = scoutResults.query;
    pptx.title = outline.title;

    // Colors
    const colors = {
      primary: '2563eb',
      secondary: '64748b',
      accent: 'f59e0b',
      text: '1e293b',
      background: 'ffffff'
    };

    // === COVER SLIDE ===
    let slide = pptx.addSlide();
    slide.background = { color: colors.primary };

    slide.addText(outline.title, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.5,
      fontSize: 44,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle'
    });

    if (outline.subtitle) {
      slide.addText(outline.subtitle, {
        x: 0.5,
        y: 4.2,
        w: 9,
        h: 0.8,
        fontSize: 20,
        color: 'E2E8F0',
        align: 'center',
        valign: 'middle'
      });
    }

    slide.addText(`Generated by Scout | ${new Date().toLocaleDateString()}`, {
      x: 0.5,
      y: 5.2,
      w: 9,
      h: 0.3,
      fontSize: 12,
      color: 'CBD5E1',
      align: 'center'
    });

    // Add cover image if generated
    if (slideImages['cover']) {
      slide.addImage({
        data: `data:image/png;base64,${slideImages['cover']}`,
        x: 0.5,
        y: 0.5,
        w: 2.5,
        h: 2.5,
        rounding: true
      });
    }

    // === CONTENT SLIDES ===
    if (outline.sections && outline.sections.length > 0) {
      for (let i = 0; i < outline.sections.length; i++) {
        const section = outline.sections[i];

        slide = pptx.addSlide();

        // Title
        slide.addText(section.title, {
          x: 0.5,
          y: 0.5,
          w: 5,
          h: 0.8,
          fontSize: 32,
          bold: true,
          color: colors.primary
        });

        // Content (bullet points)
        const contentLines = section.content.split('\n').filter((line: string) => line.trim());
        const bulletText = contentLines.map((line: string) => ({
          text: line.replace(/^[•\-\*]\s*/, ''),
          options: {
            bullet: { code: '2022' },
            indentLevel: 0
          }
        }));

        slide.addText(bulletText, {
          x: 0.5,
          y: 1.5,
          w: 5,
          h: 4,
          fontSize: 18,
          color: colors.text,
          lineSpacing: 24
        });

        // Key message box
        if (section.keyMessage) {
          slide.addText(section.keyMessage, {
            x: 0.5,
            y: 5.0,
            w: 5,
            h: 0.6,
            fontSize: 14,
            italic: true,
            color: colors.accent,
            fill: { color: 'FEF3C7' },
            margin: 10
          });
        }

        // Add section image if generated
        if (slideImages[`section-${i}`]) {
          slide.addImage({
            data: `data:image/png;base64,${slideImages[`section-${i}`]}`,
            x: 5.5,
            y: 1.5,
            w: 4,
            h: 4,
            rounding: true
          });
        }
      }
    }

    // === CONCLUSION SLIDE ===
    if (outline.conclusion) {
      slide = pptx.addSlide();

      slide.addText('Key Takeaways', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: colors.primary
      });

      slide.addText(outline.conclusion, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 3,
        fontSize: 20,
        color: colors.text,
        lineSpacing: 28
      });
    }

    // === SOURCES SLIDE ===
    if (searchResults && searchResults.length > 0) {
      slide = pptx.addSlide();

      slide.addText('Sources', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: colors.primary
      });

      const sources = searchResults.slice(0, 10).map((result: any, idx: number) => ({
        text: `${idx + 1}. ${result.title}`,
        options: {
          bullet: true,
          hyperlink: result.url ? { url: result.url } : undefined
        }
      }));

      slide.addText(sources, {
        x: 0.5,
        y: 1.3,
        w: 9,
        h: 4,
        fontSize: 14,
        color: colors.text
      });
    }

    // ========================================================================
    // STEP 5: Generate and return PPTX file
    // ========================================================================
    console.log('[Generate PPTX] Step 5: Generating file...');

    // Generate PPTX as buffer
    const pptxBuffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
    const buffer = Buffer.from(pptxBuffer);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('[Generate PPTX] Generation completed in', elapsedTime, 'seconds');
    console.log('[Generate PPTX] File size:', (buffer.length / 1024).toFixed(1), 'KB');

    // Generate filename
    const sanitizedQuery = scoutResults.query.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').substring(0, 30);
    const filename = `scout-report-${sanitizedQuery}-${Date.now()}.pptx`;
    const encodedFilename = encodeURIComponent(filename);

    // Return PPTX file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="report.pptx"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('[Generate PPTX] Error:', error);

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request exceeded timeout limit. Try again or use --no-images flag.' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

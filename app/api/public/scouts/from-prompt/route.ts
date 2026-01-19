import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Shared user ID for all Happy CLI instances
const SHARED_USER_ID = '3caa8842-0f81-4bfd-b1ac-93c92d7e64d8';

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Parsed Scout configuration from AI
 */
interface ParsedScoutConfig {
  title: string;
  description?: string;
  goal: string;
  search_queries: string[];
  frequency?: 'daily' | 'every_3_days' | 'weekly';
}

/**
 * Use OpenAI API to parse natural language prompt into structured Scout configuration
 */
async function parsePromptWithAI(prompt: string): Promise<ParsedScoutConfig> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const systemPrompt = `你是一个智能助手，负责从用户的自然语言提示词中提取结构化的 Scout 配置。

Scout 是一个 AI 驱动的网络监控工具，可以定期搜索和分析网络信息。

你需要从用户的提示词中提取以下信息：
1. title: Scout 的简短标题（必需，最多 50 字符）
2. description: 详细描述 Scout 的用途（可选，最多 200 字符）
3. goal: Scout 的主要目标（必需，清晰描述要追踪的内容）
4. search_queries: 搜索关键词数组（必需，3-5个相关搜索词，使用英文和中文混合）
5. frequency: 执行频率（可选，可选值：'daily', 'every_3_days', 'weekly'，默认 'daily'）

**搜索词优化通用原则：**

1. **具体优于宽泛（适用所有类型监控）**：
   - ✅ 使用具体主题、公司、产品、事件作为关键词
   - ❌ 避免只用"领域名 + latest/today"的宽泛组合
   - 原因：具体词能精确匹配文章URL，宽泛词容易匹配到网站首页/分类页

2. **新闻类监控（AI新闻、财经新闻、科技新闻等）最佳实践**：
   - 使用**细分领域/主题**关键词，覆盖面适中（不要太具体到某个单一事件）
   - 包含行业/板块词（如"科技股"、"能源板块"、"加密货币"、"房地产市场"）
   - 包含主题词（如"财报季"、"央行政策"、"经济数据"、"IPO上市"、"AI产品发布"）
   - 可包含热门公司/组织名作为多样性补充（不应全是公司名）
   - 可适当包含1-2个宽泛词（如"latest tech news"），但需与细分词混合使用
   - 示例对比：
     * ❌ 太宽泛："financial news latest", "finance news today" → 易返回网站首页
     * ❌ 太具体："Tesla Q4 2025 earnings report", "Apple January 2026 iPhone sales" → 覆盖面太窄
     * ✅ 平衡好："tech stocks earnings season", "Federal Reserve policy updates", "China economic data", "cryptocurrency market news", "AI industry developments"

3. **平台类监控（猪八戒、闲鱼等）**：
   - 使用 "site:域名" 限定网站范围
   - 包含动作词（如"发布"、"招标"、"任务"、"需求"）
   - 避免过强时效性词语（历史信息也有价值）
   - 包含具体项目类型（如"软件开发"、"小程序开发"、"UI设计"）

请以 JSON 格式返回，不要包含任何其他文字。

示例 1：
用户输入："搜索最新的AI新闻"
你应该返回：
{
  "title": "AI 新闻追踪",
  "description": "追踪和分析最新的人工智能行业新闻和动态",
  "goal": "持续监控 AI 领域的最新新闻、突破和趋势",
  "search_queries": ["AI news latest", "artificial intelligence news today", "machine learning updates", "AI breakthroughs", "人工智能 最新"],
  "frequency": "daily"
}

示例 2：
用户输入："监控猪八戒平台的开发任务"
你应该返回：
{
  "title": "猪八戒开发任务监控",
  "description": "追踪猪八戒平台上雇主发布的软件开发任务和需求",
  "goal": "监控猪八戒平台的软件开发、小程序、APP等开发类任务发布情况",
  "search_queries": ["site:zbj.com 软件开发 任务", "site:zbj.com 小程序开发 招标", "site:zbj.com APP开发 需求", "site:zbj.com 程序员 接单", "site:zbj.com 开发项目 发布"],
  "frequency": "daily"
}

示例 3：
用户输入："追踪咸鱼上的二手 MacBook"
你应该返回：
{
  "title": "咸鱼二手 MacBook 追踪",
  "description": "监控闲鱼平台上的二手 MacBook 交易信息",
  "goal": "追踪闲鱼平台上二手 MacBook 的价格和库存",
  "search_queries": ["site:xianyu.com MacBook", "闲鱼 MacBook Pro 二手", "咸鱼 MacBook Air 转让", "xianyu macbook 出售", "闲鱼 苹果笔记本"],
  "frequency": "daily"
}

示例 4：
用户输入："财经新闻追踪"
你应该返回：
{
  "title": "财经新闻追踪",
  "description": "追踪全球重要财经事件、市场动态和经济政策",
  "goal": "持续监控全球及中国的最新财经新闻、股市动态和宏观经济信息",
  "search_queries": ["tech stocks earnings season", "Federal Reserve policy updates", "China economic data", "cryptocurrency market news", "global stock market analysis"],
  "frequency": "daily"
}

注意：这里的search_queries使用了细分领域关键词（科技股财报季、美联储政策、中国经济数据等），
覆盖面适中，既避免了宽泛的"financial news latest"导致的首页问题，又不会像"Tesla Q4 earnings"那样限制在单一事件。`;

  try {
    const openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const response = await fetch(`${openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    const parsed = JSON.parse(content) as ParsedScoutConfig;

    // Validate required fields
    if (!parsed.title || !parsed.goal || !parsed.search_queries || parsed.search_queries.length === 0) {
      throw new Error('AI parsing result missing required fields');
    }

    console.log('[From-Prompt API] AI parsed config:', JSON.stringify(parsed, null, 2));

    return parsed;
  } catch (error: any) {
    console.error('[From-Prompt API] AI parsing failed:', error);
    throw new Error(`Failed to parse prompt with AI: ${error.message}`);
  }
}

/**
 * POST /api/public/scouts/from-prompt - Create scout from natural language prompt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      auto_execute = true,
      is_active = false
    } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('[From-Prompt API] Creating scout from prompt:', prompt);

    // Step 1: Parse prompt with AI
    const parsedConfig = await parsePromptWithAI(prompt);

    // Step 2: Create Scout
    // Set default location to "Any" (global) if not specified
    const defaultLocation = {
      city: 'Any',
      latitude: 0,
      longitude: 0
    };

    const { data: scout, error: createError } = await supabase
      .from('scouts')
      .insert({
        user_id: SHARED_USER_ID,
        title: parsedConfig.title,
        description: parsedConfig.description,
        goal: parsedConfig.goal,
        search_queries: parsedConfig.search_queries,
        frequency: parsedConfig.frequency || 'daily',
        is_active: is_active,
        consecutive_failures: 0,
        // Set default location to "Any" (global) for prompt-based scouts
        location: defaultLocation
      })
      .select()
      .single();

    if (createError) {
      console.error('[From-Prompt API] Create scout error:', createError);
      return NextResponse.json(
        { success: false, error: createError.message },
        { status: 500 }
      );
    }

    console.log('[From-Prompt API] Scout created:', scout.id);

    // Step 3: Optionally execute the scout
    let executionInfo = null;
    if (auto_execute) {
      try {
        // First, activate the scout temporarily for execution
        if (!scout.is_active) {
          const { error: activateError } = await supabase
            .from('scouts')
            .update({ is_active: true })
            .eq('id', scout.id);

          if (activateError) {
            console.error('[From-Prompt API] Failed to activate scout:', activateError);
            executionInfo = {
              triggered: false,
              error: 'Failed to activate scout for execution'
            };
          } else {
            // Call the edge function to execute the scout
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseAnonKey) {
              const execResponse = await fetch(
                `${supabaseUrl}/functions/v1/scout-cron?scoutId=${scout.id}`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${supabaseAnonKey}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (execResponse.ok) {
                executionInfo = {
                  triggered: true,
                  message: 'Scout execution started'
                };
                console.log('[From-Prompt API] Scout execution triggered');
              } else {
                const errorText = await execResponse.text();
                executionInfo = {
                  triggered: false,
                  error: `Execution failed: ${errorText}`
                };
                console.error('[From-Prompt API] Execution failed:', errorText);
              }
            } else {
              executionInfo = {
                triggered: false,
                error: 'Supabase configuration missing'
              };
            }

            // Restore original active state if needed
            if (!is_active) {
              await supabase
                .from('scouts')
                .update({ is_active: false })
                .eq('id', scout.id);
            }
          }
        } else {
          // Scout is already active, just execute
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

          if (supabaseUrl && supabaseAnonKey) {
            const execResponse = await fetch(
              `${supabaseUrl}/functions/v1/scout-cron?scoutId=${scout.id}`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${supabaseAnonKey}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (execResponse.ok) {
              executionInfo = {
                triggered: true,
                message: 'Scout execution started'
              };
            } else {
              const errorText = await execResponse.text();
              executionInfo = {
                triggered: false,
                error: `Execution failed: ${errorText}`
              };
            }
          }
        }
      } catch (execError: any) {
        console.error('[From-Prompt API] Execution error:', execError);
        executionInfo = {
          triggered: false,
          error: execError.message
        };
      }
    }

    // Step 4: Return response
    const message = `Scout "${parsedConfig.title}" 创建成功！${executionInfo?.triggered ? ' 已开始执行。' : ''}`;

    return NextResponse.json({
      success: true,
      data: {
        scout_id: scout.id,
        scout,
        parsed_config: parsedConfig,
        execution: executionInfo,
        message
      }
    });

  } catch (error: any) {
    console.error('[From-Prompt API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

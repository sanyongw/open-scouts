# Scout MCP Server 实现分析文档

## 文档信息

- **创建日期**: 2026-01-15
- **版本**: v1.0.0
- **作者**: Claude Code
- **文件路径**: `happy-cli/src/mcp/scouts-mcp-server.ts`

---

## 一、整体架构

### 1.1 技术栈

```typescript
- MCP框架: @modelcontextprotocol/sdk (HTTP-based MCP Server)
- 传输层: StreamableHTTPServerTransport (支持SSE流式响应)
- 验证库: Zod (参数校验)
- HTTP客户端: Native Fetch API
```

### 1.2 三层架构

```
┌─────────────────────────────────────────────────┐
│  Claude AI / Frontend                           │
│  - 通过 MCP 协议调用工具                         │
└──────────────────┬──────────────────────────────┘
                   │ JSON-RPC over HTTP
┌──────────────────▼──────────────────────────────┐
│  Scouts MCP Server (Port 3105)                  │
│  - 13个工具（scouts_* 前缀）                     │
│  - 请求转发与错误处理                            │
└──────────────────┬──────────────────────────────┘
                   │ HTTP REST API
┌──────────────────▼──────────────────────────────┐
│  Open Scouts Backend (Port 3000)                │
│  - Next.js 应用                                  │
│  - PostgreSQL 数据库                             │
│  - Firecrawl 爬虫引擎                            │
│  - AI 分析引擎                                   │
└─────────────────────────────────────────────────┘
```

### 1.3 配置说明

#### 环境变量

```bash
# happy-cli/.env.dev
OPEN_SCOUTS_URL=http://localhost:3000   # Open Scouts后台地址
SCOUTS_MCP_PORT=3105                    # MCP Server端口（默认3105，避免与Capital MCP的3101冲突）
```

#### 前端配置

```bash
# happy/.env
EXPO_PUBLIC_SCOUTS_MCP_URL=http://localhost:3005/scouts-mcp
```

#### 环境变量加载优先级

1. `.env.local` (最高优先级 - 敏感密钥)
2. `.env.dev` (推荐用于开发配置)
3. `.env.rocketchat` (可覆盖前面的配置)
4. 项目根目录 `.env` (最低优先级)

---

## 二、后台服务接口详解

### 2.1 Scout 管理接口

#### 1. 列出所有 Scouts

**HTTP请求**:
```http
GET /api/public/scouts?limit=20&offset=0&is_active=true&order_by=created_at&order_direction=desc
```

**MCP工具**: `scouts_list_scouts`

**请求参数**:
- `limit` (number, 可选): 每页数量，默认20
- `offset` (number, 可选): 偏移量，默认0
- `is_active` (boolean, 可选): 筛选激活状态
- `order_by` (enum, 可选): 排序字段
  - `created_at` - 创建时间
  - `updated_at` - 更新时间
  - `last_run_at` - 最后执行时间
- `order_direction` (enum, 可选): 排序方向
  - `asc` - 升序
  - `desc` - 降序

**响应示例**:
```json
{
  "success": true,
  "data": {
    "scouts": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "title": "AI新闻监控",
        "description": "追踪最新AI行业动态",
        "goal": "获取AI领域的突破性新闻",
        "search_queries": ["AI news", "机器学习 新闻"],
        "location": {
          "city": "Beijing",
          "latitude": 39.9,
          "longitude": 116.4
        },
        "frequency": "daily",
        "is_active": true,
        "last_run_at": "2026-01-15T10:00:00Z",
        "consecutive_failures": 0,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-15T10:00:00Z"
      }
    ],
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

**代码实现** (Line 131-161):
```typescript
mcp.registerTool('scouts_list_scouts', {
    title: '列出所有 Scouts',
    description: '获取 Scouts 列表，支持分页和筛选。',
    inputSchema: {
        limit: z.number().optional().describe('每页数量，默认 20'),
        offset: z.number().optional().describe('偏移量，默认 0'),
        is_active: z.boolean().optional().describe('筛选激活状态'),
        order_by: z.enum(['created_at', 'updated_at', 'last_run_at']).optional(),
        order_direction: z.enum(['asc', 'desc']).optional(),
    },
}, async (args) => {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    if (args.is_active !== undefined) params.set('is_active', String(args.is_active));
    if (args.order_by) params.set('order_by', args.order_by);
    if (args.order_direction) params.set('order_direction', args.order_direction);

    const response = await callOpenScoutsApi(`/api/public/scouts?${params}`);

    if (!response.success) {
        return formatApiError(response, '列出 Scouts');
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
        }],
    };
});
```

---

#### 2. 获取单个 Scout 详情

**HTTP请求**:
```http
GET /api/public/scouts/{scout_id}
```

**MCP工具**: `scouts_get_scout`

**路径参数**:
- `scout_id` (string, 必填): Scout的UUID

**响应**: 返回单个Scout对象（结构同列表接口中的单个对象）

**代码实现** (Line 163-182):
```typescript
mcp.registerTool('scouts_get_scout', {
    title: '获取 Scout 详情',
    description: '获取单个 Scout 的详细信息。',
    inputSchema: {
        scout_id: z.string().describe('Scout ID'),
    },
}, async (args) => {
    const response = await callOpenScoutsApi(`/api/public/scouts/${args.scout_id}`);

    if (!response.success) {
        return formatApiError(response, '获取 Scout');
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
        }],
    };
});
```

---

#### 3. 创建 Scout（手动配置）

**HTTP请求**:
```http
POST /api/public/scouts
Content-Type: application/json

{
  "title": "猪八戒平台监控",
  "description": "监控猪八戒平台的开发任务",
  "goal": "追踪软件开发外包需求",
  "search_queries": [
    "site:zbj.com 软件开发 任务",
    "site:zbj.com 小程序开发 招标"
  ],
  "location": {
    "city": "Beijing",
    "latitude": 39.9,
    "longitude": 116.4
  },
  "frequency": "daily",
  "is_active": false
}
```

**MCP工具**: `scouts_create_scout`

**请求参数**:
- `title` (string, 可选): Scout标题（与goal至少填一个）
- `description` (string, 可选): Scout描述
- `goal` (string, 可选): Scout目标（与title至少填一个）
- `search_queries` (string[], 可选): 搜索关键词数组
- `location` (object, 可选): 地理位置
  - `city` (string): 城市名称
  - `latitude` (number): 纬度
  - `longitude` (number): 经度
- `frequency` (enum, 可选): 执行频率
  - `daily` - 每天
  - `every_3_days` - 每3天
  - `weekly` - 每周
- `is_active` (boolean, 可选): 是否立即激活定期执行（默认false）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "scout": {
      "id": "uuid",
      "user_id": "uuid",
      "title": "猪八戒平台监控",
      "description": "监控猪八戒平台的开发任务",
      "goal": "追踪软件开发外包需求",
      "search_queries": [
        "site:zbj.com 软件开发 任务",
        "site:zbj.com 小程序开发 招标"
      ],
      "location": {
        "city": "Beijing",
        "latitude": 39.9,
        "longitude": 116.4
      },
      "frequency": "daily",
      "is_active": false,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-15T10:00:00Z"
    },
    "message": "Scout创建成功"
  }
}
```

**代码实现** (Line 184-216):
```typescript
mcp.registerTool('scouts_create_scout', {
    title: '创建 Scout',
    description: '创建新的 Scout。至少需要提供 title 或 goal。',
    inputSchema: {
        title: z.string().optional().describe('Scout 标题'),
        description: z.string().optional().describe('Scout 描述'),
        goal: z.string().optional().describe('Scout 目标'),
        search_queries: z.array(z.string()).optional().describe('搜索查询列表'),
        location: z.object({
            city: z.string(),
            latitude: z.number(),
            longitude: z.number(),
        }).optional().describe('地理位置'),
        frequency: z.enum(['daily', 'every_3_days', 'weekly']).optional(),
        is_active: z.boolean().optional().describe('是否激活，默认 false'),
    },
}, async (args) => {
    const response = await callOpenScoutsApi('/api/public/scouts', {
        method: 'POST',
        body: JSON.stringify(args),
    });

    if (!response.success) {
        return formatApiError(response, '创建 Scout');
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
        }],
    };
});
```

---

#### 4. 从提示词创建 Scout（AI自动配置）⭐ 核心功能

**HTTP请求**:
```http
POST /api/public/scouts/from-prompt
Content-Type: application/json

{
  "prompt": "搜索最新的AI新闻",
  "auto_execute": true,
  "is_active": false
}
```

**MCP工具**: `scouts_create_from_prompt`

**请求参数**:
- `prompt` (string, 必填): 自然语言提示词
  - 示例: "搜索最新的AI新闻"
  - 示例: "监控猪八戒平台的设计项目"
  - 示例: "追踪咸鱼上的二手 MacBook"
- `auto_execute` (boolean, 可选): 是否立即执行一次（默认true）
- `is_active` (boolean, 可选): 是否激活定期执行（默认false）

**AI处理流程**:
1. 使用LLM解析用户自然语言提示词
2. 自动生成 `title`（简短标题）
3. 自动生成 `description`（详细描述）
4. 自动生成 `goal`（监控目标）
5. 自动生成 `search_queries` 数组（多个关键词组合，包含中英文）
6. 推断合适的 `frequency`（执行频率）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "scout_id": "ac1f07e6-785f-43c2-a8ca-fd8a1205242e",
    "scout": {
      "id": "ac1f07e6-785f-43c2-a8ca-fd8a1205242e",
      "user_id": "3caa8842-0f81-4bfd-b1ac-93c92d7e64d8",
      "title": "测试配置验证",
      "description": "用于验证环境变量是否正确加载的测试Scout",
      "goal": "确认系统能够正确读取并应用环境变量配置",
      "search_queries": [
        "test config environment variables",
        "verify env loading",
        "check configuration setup",
        "environment test",
        "配置验证 测试"
      ],
      "location": {
        "city": "Any",
        "latitude": 0,
        "longitude": 0
      },
      "frequency": "daily",
      "is_active": false,
      "last_run_at": null,
      "consecutive_failures": 0,
      "created_at": "2026-01-15T10:36:13.302909+00:00",
      "updated_at": "2026-01-15T10:36:13.302909+00:00"
    },
    "parsed_config": {
      "title": "测试配置验证",
      "description": "用于验证环境变量是否正确加载的测试Scout",
      "goal": "确认系统能够正确读取并应用环境变量配置",
      "search_queries": [
        "test config environment variables",
        "verify env loading",
        "check configuration setup",
        "environment test",
        "配置验证 测试"
      ],
      "frequency": "daily"
    },
    "execution": {
      "triggered": true,
      "message": "Scout execution started"
    },
    "message": "Scout \"测试配置验证\" 创建成功！ 已开始执行。"
  }
}
```

**代码实现** (Line 218-249):
```typescript
mcp.registerTool('scouts_create_from_prompt', {
    title: '从提示词创建 Scout',
    description: '使用 AI 从自然语言提示词自动创建 Scout。例如："搜索最新的AI新闻"会自动创建一个追踪 AI 新闻的 Scout。',
    inputSchema: {
        prompt: z.string().describe('自然语言提示词，描述你想追踪的内容'),
        auto_execute: z.boolean().optional().describe('是否立即执行一次，默认 true'),
        is_active: z.boolean().optional().describe('是否设置为激活状态（定期执行），默认 false'),
    },
}, async (args) => {
    logger.debug(`[Scouts-MCP] Creating scout from prompt: ${args.prompt}`);

    // 直接调用 Open Scouts 的 from-prompt API
    const response = await callOpenScoutsApi('/api/public/scouts/from-prompt', {
        method: 'POST',
        body: JSON.stringify({
            prompt: args.prompt,
            auto_execute: args.auto_execute ?? true,
            is_active: args.is_active ?? false,
        }),
    });

    if (!response.success) {
        return formatApiError(response, '从提示词创建 Scout');
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
        }],
    };
});
```

**使用场景**:
- ✅ **最常用**: 用户只需输入一句话即可创建Scout，无需手动填写复杂字段
- ✅ **智能**: AI自动理解用户意图并生成最优配置
- ✅ **快速**: 创建完成后自动执行一次，立即获得结果

---

#### 5. 更新 Scout

**HTTP请求**:
```http
PATCH /api/public/scouts/{scout_id}
Content-Type: application/json

{
  "title": "新标题",
  "search_queries": ["新关键词1", "新关键词2"],
  "frequency": "weekly"
}
```

**MCP工具**: `scouts_update_scout`

**请求参数**:
- `scout_id` (string, 必填): Scout的UUID
- 其他字段同创建接口，均为可选

**特点**: 支持部分更新（只传需要修改的字段）

**代码实现** (Line 251-286):
```typescript
mcp.registerTool('scouts_update_scout', {
    title: '更新 Scout',
    description: '更新 Scout 配置。',
    inputSchema: {
        scout_id: z.string().describe('Scout ID'),
        title: z.string().optional().describe('Scout 标题'),
        description: z.string().optional().describe('Scout 描述'),
        goal: z.string().optional().describe('Scout 目标'),
        search_queries: z.array(z.string()).optional().describe('搜索查询列表'),
        location: z.object({
            city: z.string(),
            latitude: z.number(),
            longitude: z.number(),
        }).optional().describe('地理位置'),
        frequency: z.enum(['daily', 'every_3_days', 'weekly']).optional(),
        is_active: z.boolean().optional().describe('是否激活'),
    },
}, async (args) => {
    const { scout_id, ...updates } = args;

    const response = await callOpenScoutsApi(`/api/public/scouts/${scout_id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });

    if (!response.success) {
        return formatApiError(response, '更新 Scout');
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
        }],
    };
});
```

---

#### 6. 删除 Scout

**HTTP请求**:
```http
DELETE /api/public/scouts/{scout_id}
```

**MCP工具**: `scouts_delete_scout`

**路径参数**:
- `scout_id` (string, 必填): Scout的UUID

**注意**:
- ⚠️ 会级联删除所有相关数据（执行记录、对话历史等）
- ⚠️ 操作不可逆

**代码实现** (Line 288-309):
```typescript
mcp.registerTool('scouts_delete_scout', {
    title: '删除 Scout',
    description: '删除 Scout 及其所有相关数据（执行记录、对话历史等）。',
    inputSchema: {
        scout_id: z.string().describe('Scout ID'),
    },
}, async (args) => {
    const response = await callOpenScoutsApi(`/api/public/scouts/${args.scout_id}`, {
        method: 'DELETE',
    });

    if (!response.success) {
        return formatApiError(response, '删除 Scout');
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
        }],
    };
});
```

---

#### 7. 启用/禁用 Scout

**HTTP请求**:
```http
PATCH /api/public/scouts/{scout_id}
Content-Type: application/json

{
  "is_active": true
}
```

**MCP工具**: `scouts_toggle_active`

**请求参数**:
- `scout_id` (string, 必填): Scout的UUID
- `is_active` (boolean, 必填): 是否激活

**用途**: 快速切换定期执行开关，无需传递其他字段

**代码实现** (Line 311-334):
```typescript
mcp.registerTool('scouts_toggle_active', {
    title: '启用/禁用 Scout',
    description: '切换 Scout 的激活状态。',
    inputSchema: {
        scout_id: z.string().describe('Scout ID'),
        is_active: z.boolean().describe('是否激活'),
    },
}, async (args) => {
    const response = await callOpenScoutsApi(`/api/public/scouts/${args.scout_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: args.is_active }),
    });

    if (!response.success) {
        return formatApiError(response, '切换 Scout 状态');
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
        }],
    };
});
```

---

### 2.2 Scout 执行接口

#### 8. 列出执行历史

**HTTP请求**:
```http
GET /api/public/scouts/{scout_id}/executions?limit=20&offset=0&status=completed
```

**MCP工具**: `scouts_list_executions`

**请求参数**:
- `scout_id` (string, 必填): Scout的UUID
- `limit` (number, 可选): 每页数量，默认20
- `offset` (number, 可选): 偏移量，默认0
- `status` (enum, 可选): 筛选执行状态
  - `running` - 执行中
  - `completed` - 已完成
  - `failed` - 失败

**响应示例**:
```json
{
  "success": true,
  "data": {
    "executions": [
      {
        "id": "exec-uuid",
        "scout_id": "scout-uuid",
        "status": "completed",
        "started_at": "2026-01-15T10:00:00Z",
        "completed_at": "2026-01-15T10:05:32Z",
        "duration_seconds": 332,
        "results_count": 12,
        "error": null
      }
    ],
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

**代码实现** (Line 340-368):
```typescript
mcp.registerTool('scouts_list_executions', {
    title: '列出执行历史',
    description: '获取 Scout 的执行历史记录。',
    inputSchema: {
        scout_id: z.string().describe('Scout ID'),
        limit: z.number().optional().describe('每页数量，默认 20'),
        offset: z.number().optional().describe('偏移量，默认 0'),
        status: z.enum(['running', 'completed', 'failed']).optional(),
    },
}, async (args) => {
    const { scout_id, ...params } = args;
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.offset) queryParams.set('offset', String(params.offset));
    if (params.status) queryParams.set('status', params.status);

    const response = await callOpenScoutsApi(`/api/public/scouts/${scout_id}/executions?${queryParams}`);

    if (!response.success) {
        return formatApiError(response, '列出执行历史');
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
        }],
    };
});
```

---

#### 9. 获取执行结果详情

**HTTP请求**:
```http
GET /api/public/executions/{execution_id}?include_steps=true
```

**MCP工具**: `scouts_get_execution_result`

**请求参数**:
- `execution_id` (string, 必填): 执行记录的UUID
- `include_steps` (boolean, 可选): 是否包含步骤详情，默认true

**响应示例**:
```json
{
  "success": true,
  "data": {
    "execution": {
      "id": "exec-uuid",
      "scout_id": "scout-uuid",
      "status": "completed",
      "started_at": "2026-01-15T10:00:00Z",
      "completed_at": "2026-01-15T10:05:32Z",
      "duration_seconds": 332,
      "steps": [
        {
          "step_number": 1,
          "type": "search",
          "status": "completed",
          "started_at": "2026-01-15T10:00:00Z",
          "completed_at": "2026-01-15T10:01:15Z",
          "data": {
            "query": "AI news breakthrough",
            "results_count": 15
          }
        },
        {
          "step_number": 2,
          "type": "crawl",
          "status": "completed",
          "started_at": "2026-01-15T10:01:15Z",
          "completed_at": "2026-01-15T10:03:45Z",
          "data": {
            "urls_crawled": 15,
            "urls_success": 12,
            "urls_failed": 3,
            "content_extracted": 12
          }
        },
        {
          "step_number": 3,
          "type": "analyze",
          "status": "completed",
          "started_at": "2026-01-15T10:03:45Z",
          "completed_at": "2026-01-15T10:05:00Z",
          "data": {
            "ai_model": "gpt-4",
            "ai_analysis": "发现3条重要突破：1. OpenAI发布GPT-5 2. Google推出Gemini Ultra 3. Meta开源Llama 3",
            "relevance_score": 0.85,
            "tokens_used": 3500
          }
        },
        {
          "step_number": 4,
          "type": "deduplicate",
          "status": "completed",
          "started_at": "2026-01-15T10:05:00Z",
          "completed_at": "2026-01-15T10:05:15Z",
          "data": {
            "total_results": 12,
            "unique_results": 8,
            "duplicates_removed": 4,
            "dedup_method": "content_hash"
          }
        },
        {
          "step_number": 5,
          "type": "notify",
          "status": "completed",
          "started_at": "2026-01-15T10:05:15Z",
          "completed_at": "2026-01-15T10:05:32Z",
          "data": {
            "notification_sent": true,
            "notification_channel": "email",
            "recipients_count": 1
          }
        }
      ],
      "results": [
        {
          "id": "result-uuid-1",
          "title": "OpenAI发布GPT-5",
          "url": "https://example.com/gpt5",
          "summary": "OpenAI今日发布最新大语言模型GPT-5，在多项基准测试中超越前代...",
          "relevance_score": 0.95,
          "crawled_at": "2026-01-15T10:02:15Z",
          "content_snippet": "完整内容摘要..."
        },
        {
          "id": "result-uuid-2",
          "title": "Google推出Gemini Ultra",
          "url": "https://example.com/gemini-ultra",
          "summary": "Google发布Gemini系列最强模型Ultra版本，支持多模态输入...",
          "relevance_score": 0.92,
          "crawled_at": "2026-01-15T10:02:45Z",
          "content_snippet": "完整内容摘要..."
        }
      ],
      "error": null
    }
  }
}
```

**执行步骤说明**:
1. **search**: 使用搜索引擎查询关键词
2. **crawl**: 使用Firecrawl爬取搜索结果页面
3. **analyze**: 使用AI分析爬取内容的相关性和重要性
4. **deduplicate**: 去重，避免重复通知
5. **notify**: 发送通知给用户

**代码实现** (Line 370-393):
```typescript
mcp.registerTool('scouts_get_execution_result', {
    title: '获取执行结果',
    description: '获取执行结果，包含执行步骤详情。',
    inputSchema: {
        execution_id: z.string().describe('执行 ID'),
        include_steps: z.boolean().optional().describe('是否包含步骤详情，默认 true'),
    },
}, async (args) => {
    const params = new URLSearchParams();
    if (args.include_steps !== false) params.set('include_steps', 'true');

    const response = await callOpenScoutsApi(`/api/public/executions/${args.execution_id}?${params}`);

    if (!response.success) {
        return formatApiError(response, '获取执行结果');
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
        }],
    };
});
```

---

#### 10. 手动触发执行

**HTTP请求**:
```http
POST /api/test-scout?scoutId={scout_id}
```

**MCP工具**: `scouts_execute_scout`

**请求参数**:
- `scout_id` (string, 必填): Scout的UUID

**特点**:
- ✅ 免鉴权端点（测试用）
- ✅ 异步执行（立即返回，后台处理）
- ✅ 触发完整AI Agent流程：搜索 → 爬取 → 分析 → 去重 → 通知

**响应示例**:
```json
{
  "success": true,
  "message": "Scout execution triggered",
  "execution_id": "exec-uuid"
}
```

**代码实现** (Line 399-455):
```typescript
mcp.registerTool('scouts_execute_scout', {
    title: '执行 Scout 监控任务',
    description: '手动触发 Scout 执行（完整 AI Agent 流程：搜索+爬取+分析+去重+通知）。需要 Open Scouts 应用运行。',
    inputSchema: {
        scout_id: z.string().describe('Scout ID'),
    },
}, async (args) => {
    try {
        logger.debug(`[Scouts-MCP] Executing scout via API: ${args.scout_id}`);

        // 使用 test-scout 端点（免鉴权）
        const response = await fetch(`${OPEN_SCOUTS_URL}/api/test-scout?scoutId=${args.scout_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json() as { error?: string; success?: boolean; message?: string };

        if (!response.ok || !data.success) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: data.error || 'Execution failed',
                    }, null, 2)
                }],
                isError: true
            };
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    message: data.message || 'Scout execution triggered',
                    scout_id: args.scout_id,
                    note: '使用 scouts_list_executions 查询执行历史'
                }, null, 2)
            }]
        };
    } catch (error: any) {
        logger.debug(`[Scouts-MCP] Error executing scout via API: ${error.message}`);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message,
                    note: `请确保 Open Scouts 应用正在运行于 ${OPEN_SCOUTS_URL}`
                }, null, 2)
            }],
            isError: true
        };
    }
});
```

---

### 2.3 高级AI功能接口

#### 11. 网络搜索（Firecrawl + AI总结）

**HTTP请求**:
```http
POST /api/public/search
Content-Type: application/json

{
  "query": "2026年AI行业趋势",
  "location": {
    "city": "Beijing",
    "latitude": 39.9,
    "longitude": 116.4
  }
}
```

**MCP工具**: `scouts_search`

**请求参数**:
- `query` (string, 必填): 搜索查询
- `location` (object, 可选): 地理位置
  - `city` (string): 城市名称
  - `latitude` (number): 纬度
  - `longitude` (number): 经度

**处理流程**:
1. 使用Firecrawl进行网络搜索
2. 爬取搜索结果页面内容
3. 使用AI对内容进行总结和分析

**响应示例**:
```json
{
  "success": true,
  "data": {
    "query": "2026年AI行业趋势",
    "results": [
      {
        "title": "AI行业报告2026",
        "url": "https://example.com/report",
        "snippet": "2026年AI行业将迎来重大变革...",
        "crawled_content": "完整页面内容（已清洗）...",
        "relevance_score": 0.92
      },
      {
        "title": "Gartner: 2026 AI预测",
        "url": "https://gartner.com/ai-2026",
        "snippet": "Gartner分析师预测...",
        "crawled_content": "完整页面内容...",
        "relevance_score": 0.88
      }
    ],
    "summary": "根据搜索结果分析，2026年AI行业主要趋势包括：\n\n1. **AGI突破**: 多家机构预测AGI将在2026年取得关键突破\n2. **多模态融合**: 文本、图像、视频、音频的统一处理成为标配\n3. **边缘计算**: AI模型部署向边缘设备迁移，降低延迟\n4. **监管强化**: 各国加强AI伦理和安全监管\n5. **行业渗透**: AI深入制造业、医疗、金融等传统行业\n\n主要挑战：数据隐私、模型可解释性、算力成本"
  }
}
```

**代码实现** (Line 457-523):
```typescript
mcp.registerTool('scouts_search', {
    title: '网络搜索',
    description: '使用 Open Scouts 搜索引擎进行网络搜索（Firecrawl + AI 总结）。需要 Open Scouts 应用运行。',
    inputSchema: {
        query: z.string().describe('搜索查询'),
        location: z.object({
            city: z.string(),
            latitude: z.number(),
            longitude: z.number(),
        }).optional().describe('地理位置（可选）'),
    },
}, async (args) => {
    try {
        logger.debug(`[Scouts-MCP] Searching via API: ${args.query}`);

        const response = await fetch(`${OPEN_SCOUTS_URL}/api/public/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: args.query,
                location: args.location,
            }),
        });

        const data = await response.json() as { error?: string; results?: any[]; summary?: string };

        if (!response.ok) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: data.error || 'Search failed',
                    }, null, 2)
                }],
                isError: true
            };
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    data: {
                        query: args.query,
                        results: data.results || [],
                        summary: data.summary,
                    }
                }, null, 2)
            }]
        };
    } catch (error: any) {
        logger.debug(`[Scouts-MCP] Error searching via API: ${error.message}`);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message,
                    note: `请确保 Open Scouts 应用正在运行于 ${OPEN_SCOUTS_URL}`
                }, null, 2)
            }],
            isError: true
        };
    }
});
```

---

#### 12. AI 对话式配置 Scout（SSE流式响应）⭐

**HTTP请求**:
```http
POST /api/scout
Content-Type: application/json

{
  "scoutId": "scout-uuid",
  "message": "帮我调整为每周执行一次，并增加关于开源项目的关键词",
  "history": [
    {
      "role": "user",
      "content": "创建一个追踪AI新闻的Scout"
    },
    {
      "role": "assistant",
      "content": "好的，我已创建了AI新闻监控Scout，配置如下..."
    }
  ]
}
```

**MCP工具**: `scouts_chat_configure`

**请求参数**:
- `scoutId` (string, 必填): 要配置的Scout ID
- `message` (string, 必填): 用户消息（自然语言描述需求）
- `history` (array, 可选): 对话历史数组
  - `role` (enum): `user` | `assistant`
  - `content` (string): 消息内容

**特点**:
- ✅ 使用**SSE（Server-Sent Events）流式响应**
- ✅ AI实时理解用户需求并更新Scout配置
- ✅ 支持对话上下文（conversation_history）
- ✅ 自然语言交互，无需了解技术细节

**响应格式**（流式）:
```
data: {"type":"thinking","content":"正在分析您的需求..."}

data: {"type":"action","content":"更新执行频率为 weekly"}

data: {"type":"action","content":"添加搜索关键词：open source AI projects"}

data: {"type":"action","content":"添加搜索关键词：AI 开源项目"}

data: {"type":"complete","content":"配置已更新完成，Scout将每周执行，并追踪AI开源项目相关内容"}
```

**MCP Server处理方式** (Line 525-604):
```typescript
mcp.registerTool('scouts_chat_configure', {
    title: 'AI 对话式配置 Scout',
    description: '使用 AI 助手通过自然语言配置 Scout。需要 Open Scouts 应用运行。',
    inputSchema: {
        scout_id: z.string().describe('Scout ID'),
        message: z.string().describe('用户消息（自然语言描述需求）'),
        conversation_history: z.array(z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
        })).optional().describe('对话历史（可选）'),
    },
}, async (args) => {
    try {
        logger.debug(`[Scouts-MCP] Chat configuring scout via API: ${args.scout_id}`);

        const response = await fetch(`${OPEN_SCOUTS_URL}/api/scout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scoutId: args.scout_id,
                message: args.message,
                history: args.conversation_history || [],
            }),
        });

        if (!response.ok) {
            const data = await response.json() as { error?: string };
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: data.error || 'Chat configuration failed',
                    }, null, 2)
                }],
                isError: true
            };
        }

        // API 返回流式响应（SSE），需要读取流
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                aiResponse += chunk;
            }
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    data: {
                        ai_response: aiResponse,
                        note: 'AI 已根据对话更新 Scout 配置，请使用 scouts_get_scout 查看更新后的配置'
                    }
                }, null, 2)
            }]
        };
    } catch (error: any) {
        logger.debug(`[Scouts-MCP] Error chat configuring via API: ${error.message}`);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message,
                    note: `请确保 Open Scouts 应用正在运行于 ${OPEN_SCOUTS_URL}`
                }, null, 2)
            }],
            isError: true
        };
    }
});
```

**使用场景**:
- 📝 "帮我调整为每周执行一次"
- 📝 "增加关于开源项目的关键词"
- 📝 "把位置改为上海"
- 📝 "关键词太多了，帮我精简到5个最重要的"

---

#### 13. 获取用户偏好

**HTTP请求**:
```http
GET /api/public/preferences
```

**MCP工具**: `scouts_get_preferences`

**注意**: 当前版本返回硬编码默认值，Open Scouts未实现真实的用户偏好API

**响应示例**:
```json
{
  "success": true,
  "data": {
    "location": null,
    "firecrawl_key_status": "active",
    "note": "使用 Open Scouts 共享用户配置"
  }
}
```

**代码实现** (Line 610-630):
```typescript
mcp.registerTool('scouts_get_preferences', {
    title: '获取用户偏好',
    description: '获取用户偏好设置（位置、API Keys 等）。',
    inputSchema: {},
}, async () => {
    // 目前 Open Scouts 未提供公开的用户偏好 API
    // 返回默认值
    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                success: true,
                data: {
                    location: null,
                    firecrawl_key_status: 'active',
                    note: '使用 Open Scouts 共享用户配置'
                }
            }, null, 2)
        }],
    };
});
```

---

## 三、核心实现细节

### 3.1 API客户端封装

**统一的API调用函数** (Line 50-83):

```typescript
async function callOpenScoutsApi<T>(
    path: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const url = `${OPEN_SCOUTS_URL}${path}`;
        logger.debug(`[Scouts-MCP] API call: ${options.method || 'GET'} ${path}`);

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json() as ApiResponse<T>;

        if (!response.ok) {
            return {
                success: false,
                error: data.error || `HTTP ${response.status}: ${response.statusText}`,
            };
        }

        return data;
    } catch (error: any) {
        logger.debug(`[Scouts-MCP] API error: ${error.message}`);
        return {
            success: false,
            error: error.message || 'Network error',
        };
    }
}
```

**特点**:
- ✅ 统一错误处理
- ✅ 自动添加 Content-Type 头
- ✅ 返回类型安全的 `ApiResponse<T>`
- ✅ 日志记录所有API调用
- ✅ 网络错误自动捕获

**错误响应格式化** (Line 88-100):

```typescript
function formatApiError(response: ApiResponse, operation: string) {
    const errorMessage = response.error || 'Unknown error';
    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({
                success: false,
                error: `${operation} 失败: ${errorMessage}`,
            }, null, 2)
        }],
        isError: true,
    };
}
```

---

### 3.2 健康检查机制

**启动时检查 Open Scouts 可用性** (Line 111-120):

```typescript
try {
    const healthCheck = await fetch(`${OPEN_SCOUTS_URL}/api/public/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '_health_check_' }),
    });
    logger.info('[Scouts-MCP] Open Scouts API is reachable');
} catch (error) {
    logger.warn(`[Scouts-MCP] Open Scouts API not reachable at ${OPEN_SCOUTS_URL}`);
}
```

**用途**:
- ✅ 提前发现后台服务不可用
- ✅ 避免运行时错误
- ✅ 给出明确的错误提示

---

### 3.3 HTTP Server 配置

**CORS支持** (Line 642-651):

```typescript
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS 支持
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // ...
});
```

**支持场景**: 前端Web应用跨域调用MCP Server

**健康检查端点** (Line 654-663):

```typescript
// 健康检查端点
if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'healthy',
        server: 'scouts-mcp',
        version: '1.0.0',
        openScoutsUrl: OPEN_SCOUTS_URL,
    }));
    return;
}
```

**使用方式**:
```bash
curl http://localhost:3105/health
```

---

### 3.4 MCP Server 启动流程

**完整启动函数** (Line 106-712):

```typescript
export async function startScoutsMcpServer() {
    logger.debug(`[Scouts-MCP] Starting Scouts MCP Server on port ${SCOUTS_MCP_PORT}...`);
    logger.debug(`[Scouts-MCP] Open Scouts API URL: ${OPEN_SCOUTS_URL}`);

    // 1. 健康检查
    // 2. 创建 MCP Server
    // 3. 注册 13 个工具
    // 4. 创建 HTTP Transport
    // 5. 启动 HTTP Server
    // 6. 返回服务器信息

    return {
        url: `http://localhost:${SCOUTS_MCP_PORT}`,
        port: SCOUTS_MCP_PORT,
        toolNames: [
            'scouts_list_scouts',
            'scouts_get_scout',
            'scouts_create_scout',
            'scouts_create_from_prompt',
            'scouts_update_scout',
            'scouts_delete_scout',
            'scouts_toggle_active',
            'scouts_list_executions',
            'scouts_get_execution_result',
            'scouts_execute_scout',
            'scouts_search',
            'scouts_chat_configure',
            'scouts_get_preferences',
        ],
        stop: () => {
            logger.debug('[Scouts-MCP] Stopping Scouts MCP Server');
            mcp.close();
            server.close();
        },
    };
}
```

**在 daemon 中的调用** (happy-cli/src/daemon/run.ts):

```typescript
import { startScoutsMcpServer } from '@/mcp/scouts-mcp-server';

// Start Scouts MCP Server (for AI-powered web monitoring and tracking)
startScoutsMcpServer().then((result) => {
  logger.info(`[DAEMON RUN] Scouts MCP Server started at ${result.url}`);
  logger.debug(`[DAEMON RUN] Scouts MCP tools available: ${result.toolNames.join(', ')}`);
}).catch((err) => {
  logger.warn('[DAEMON RUN] Failed to start Scouts MCP Server:', err);
});
```

---

## 四、数据流示例

### 场景：用户在Web UI创建Scout

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 用户输入提示词                                                │
│    "监控猪八戒平台的设计项目"                                     │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Frontend 发起请求                                             │
│    POST http://localhost:3005/scouts-mcp                         │
│    {                                                             │
│      "jsonrpc": "2.0",                                           │
│      "method": "tools/call",                                     │
│      "params": {                                                 │
│        "name": "scouts_create_from_prompt",                      │
│        "arguments": {                                            │
│          "prompt": "监控猪八戒平台的设计项目"                      │
│        }                                                         │
│      },                                                          │
│      "id": 1                                                     │
│    }                                                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. happy-server 转发请求                                         │
│    → Scouts MCP Server (localhost:3105)                          │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Scouts MCP Server 调用后台API                                 │
│    POST http://localhost:3000/api/public/scouts/from-prompt      │
│    {                                                             │
│      "prompt": "监控猪八戒平台的设计项目",                         │
│      "auto_execute": true,                                       │
│      "is_active": false                                          │
│    }                                                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Open Scouts Backend 处理                                      │
│    ┌──────────────────────────────────────────────────────┐     │
│    │ 5.1 LLM 解析提示词                                    │     │
│    │     → "监控猪八戒平台的设计项目"                       │     │
│    │                                                       │     │
│    │ 5.2 生成 Scout 配置                                   │     │
│    │     title: "猪八戒设计任务监控"                        │     │
│    │     description: "追踪猪八戒平台发布的设计类项目"       │     │
│    │     goal: "获取设计外包需求"                           │     │
│    │     search_queries: [                                 │     │
│    │       "site:zbj.com 设计 任务",                        │     │
│    │       "site:zbj.com UI设计 招标",                      │     │
│    │       "site:zbj.com 平面设计 需求"                     │     │
│    │     ]                                                 │     │
│    │     frequency: "daily"                                │     │
│    │                                                       │     │
│    │ 5.3 存入 PostgreSQL 数据库                            │     │
│    │                                                       │     │
│    │ 5.4 触发首次执行（auto_execute=true）                 │     │
│    │     → Firecrawl 搜索                                  │     │
│    │     → AI 分析                                         │     │
│    └──────────────────────────────────────────────────────┘     │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. 响应返回链路                                                  │
│    Open Scouts → Scouts MCP Server → happy-server → Frontend    │
│                                                                  │
│    {                                                             │
│      "success": true,                                            │
│      "data": {                                                   │
│        "scout_id": "uuid",                                       │
│        "scout": { /* 完整Scout对象 */ },                         │
│        "parsed_config": { /* AI解析的配置 */ },                  │
│        "execution": {                                            │
│          "triggered": true,                                      │
│          "message": "Scout execution started"                    │
│        },                                                        │
│        "message": "Scout '猪八戒设计任务监控' 创建成功！"         │
│      }                                                           │
│    }                                                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Frontend 展示结果                                             │
│    ✅ "Scout '猪八戒设计任务监控' 创建成功！"                      │
│    📊 显示Scout详情卡片                                           │
│    🔄 显示执行中状态                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 五、接口对比总结

### 5.1 按功能分类

| 分类 | MCP工具 | 后台API | 说明 |
|------|---------|---------|------|
| **Scout 管理** | | | |
| 列出Scouts | `scouts_list_scouts` | `GET /api/public/scouts` | 支持分页、筛选、排序 |
| 获取详情 | `scouts_get_scout` | `GET /api/public/scouts/:id` | 获取单个Scout完整信息 |
| 手动创建 | `scouts_create_scout` | `POST /api/public/scouts` | 需手动填写所有字段 |
| **AI创建** ⭐ | `scouts_create_from_prompt` | `POST /api/public/scouts/from-prompt` | 一句话创建，自动配置 |
| 更新 | `scouts_update_scout` | `PATCH /api/public/scouts/:id` | 部分更新 |
| 删除 | `scouts_delete_scout` | `DELETE /api/public/scouts/:id` | 级联删除 |
| 启用/禁用 | `scouts_toggle_active` | `PATCH /api/public/scouts/:id` | 快速切换 |
| **执行管理** | | | |
| 执行历史 | `scouts_list_executions` | `GET /api/public/scouts/:id/executions` | 分页查询 |
| 执行详情 | `scouts_get_execution_result` | `GET /api/public/executions/:id` | 包含步骤详情 |
| 手动执行 | `scouts_execute_scout` | `POST /api/test-scout` | 免鉴权，异步 |
| **高级功能** | | | |
| 智能搜索 | `scouts_search` | `POST /api/public/search` | Firecrawl + AI总结 |
| **AI对话配置** ⭐ | `scouts_chat_configure` | `POST /api/scout` | SSE流式响应 |
| 用户偏好 | `scouts_get_preferences` | `GET /api/public/preferences` | 当前为mock数据 |

### 5.2 核心功能对比

| 功能 | 使用场景 | 复杂度 | 推荐度 |
|------|----------|--------|--------|
| **AI自动创建** (`scouts_create_from_prompt`) | 用户只需输入一句话 | ⭐ 简单 | ⭐⭐⭐⭐⭐ 最常用 |
| **手动创建** (`scouts_create_scout`) | 需要精确控制所有字段 | ⭐⭐⭐ 复杂 | ⭐⭐ 少用 |
| **AI对话配置** (`scouts_chat_configure`) | 自然语言调整配置 | ⭐⭐ 中等 | ⭐⭐⭐⭐ 推荐 |
| **智能搜索** (`scouts_search`) | 快速验证搜索效果 | ⭐ 简单 | ⭐⭐⭐ 常用 |
| **手动执行** (`scouts_execute_scout`) | 立即触发监控 | ⭐ 简单 | ⭐⭐⭐⭐ 推荐 |

---

## 六、实战建议

### 6.1 最佳实践

#### 创建 Scout 的推荐流程

```
1. 使用 scouts_create_from_prompt 创建Scout
   ↓
2. 使用 scouts_get_scout 查看AI生成的配置
   ↓
3. 如需调整，使用 scouts_chat_configure 对话式调整
   ↓
4. 使用 scouts_execute_scout 手动执行一次测试
   ↓
5. 使用 scouts_get_execution_result 查看执行结果
   ↓
6. 满意后，使用 scouts_toggle_active 启用定期执行
```

#### 常见错误处理

**错误1**: "Failed to parse MCP response"
- **原因**: 前端环境变量未配置或daemon未重启
- **解决**:
  1. 检查 `happy/.env` 中的 `EXPO_PUBLIC_SCOUTS_MCP_URL`
  2. 重新构建前端: `npx expo export --platform web --clear`
  3. 重启daemon加载新配置

**错误2**: "fetch failed" 或 "Network error"
- **原因**: Open Scouts Backend未运行
- **解决**: 启动Open Scouts Backend服务（端口3000）

**错误3**: "RPC method not available"
- **原因**: Daemon RPC handlers未完全初始化
- **解决**: 等待1-2分钟或重启daemon

### 6.2 调试技巧

#### 直接测试API

```bash
# 测试健康检查
curl http://localhost:3105/health

# 测试创建Scout
curl -X POST http://localhost:3005/scouts-mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "scouts_create_from_prompt",
      "arguments": {
        "prompt": "测试创建"
      }
    },
    "id": 1
  }'
```

#### 查看日志

```bash
# 查看daemon日志（包含Scouts MCP Server启动信息）
tail -f ~/.happy-dev/logs/$(ls -t ~/.happy-dev/logs/ | head -n 1)

# 筛选Scout相关日志
tail -f ~/.happy-dev/logs/$(ls -t ~/.happy-dev/logs/ | head -n 1) | grep -i scout
```

---

## 七、架构优势总结

### 7.1 设计优点

1. ✅ **解耦设计**: MCP Server作为中间层，前端无需直接调用Open Scouts API
2. ✅ **协议标准化**: 使用MCP协议，与Claude AI原生集成
3. ✅ **错误隔离**: API调用失败不影响MCP Server运行
4. ✅ **可扩展性**: 新增功能只需添加新工具，无需修改前端
5. ✅ **类型安全**: 使用Zod进行参数验证
6. ✅ **日志完善**: 所有API调用都有详细日志

### 7.2 核心流程

```
提示词 → AI解析 → 自动配置 → 执行监控 → 结果分析 → 智能通知
```

### 7.3 关键接口（必须掌握）

- `POST /api/public/scouts/from-prompt` - **AI自动创建**（最常用）
- `GET /api/public/scouts` - **列表查询**
- `POST /api/test-scout` - **手动执行**
- `GET /api/public/executions/:id` - **查看结果**
- `POST /api/scout` - **AI对话配置**（高级）

---

## 八、技术亮点

### 8.1 AI驱动的自动化

- **一句话创建**: 用户无需了解技术细节，AI自动生成最优配置
- **对话式调整**: 通过自然语言与AI对话，轻松修改配置
- **智能分析**: 执行结果由AI自动总结和评分

### 8.2 完整的执行链路

```
搜索 (search)
  ↓
爬取 (crawl) - Firecrawl
  ↓
分析 (analyze) - AI评分和总结
  ↓
去重 (deduplicate) - 内容哈希
  ↓
通知 (notify) - 邮件/WebHook
```

### 8.3 流式响应支持

- **SSE协议**: 实时展示AI思考和执行过程
- **用户体验**: 避免长时间等待，实时反馈进度

---

## 九、未来扩展方向

### 9.1 计划中的功能

- [ ] **批量管理**: 批量创建、更新、执行多个Scouts
- [ ] **模板系统**: 预设常用监控模板（竞品监控、招聘监控等）
- [ ] **高级筛选**: 支持更复杂的结果筛选规则
- [ ] **Webhook集成**: 支持自定义Webhook通知
- [ ] **定时任务**: 可视化Cron表达式编辑器

### 9.2 性能优化

- [ ] **结果缓存**: 避免重复执行相同搜索
- [ ] **并发执行**: 多个Scout并行执行
- [ ] **增量更新**: 只获取新增结果，避免重复通知

---

## 十、附录

### 10.1 环境变量完整配置

```bash
# happy-cli/.env.dev
OPEN_SCOUTS_URL=http://localhost:3000
SCOUTS_MCP_PORT=3105

# happy/.env
EXPO_PUBLIC_SCOUTS_MCP_URL=http://localhost:3005/scouts-mcp
```

### 10.2 完整工具列表

1. `scouts_list_scouts` - 列出所有Scouts
2. `scouts_get_scout` - 获取Scout详情
3. `scouts_create_scout` - 创建Scout（手动）
4. `scouts_create_from_prompt` - 从提示词创建Scout（AI）⭐
5. `scouts_update_scout` - 更新Scout
6. `scouts_delete_scout` - 删除Scout
7. `scouts_toggle_active` - 启用/禁用Scout
8. `scouts_list_executions` - 列出执行历史
9. `scouts_get_execution_result` - 获取执行结果
10. `scouts_execute_scout` - 手动触发执行
11. `scouts_search` - 网络搜索
12. `scouts_chat_configure` - AI对话式配置⭐
13. `scouts_get_preferences` - 获取用户偏好

### 10.3 代码位置索引

- **MCP Server实现**: `happy-cli/src/mcp/scouts-mcp-server.ts`
- **Daemon集成**: `happy-cli/src/daemon/run.ts` (line 743+)
- **前端UI**: `happy/sources/components/RightPanel/tabs/ScoutsTab.tsx`
- **API客户端**: `happy/sources/services/scoutsClient.ts`
- **Server路由**: `happy-server/sources/app/api/routes/scoutsMcpRoutes.ts`

---

**文档结束**

生成时间: 2026-01-15
版本: v1.0.0
维护者: EOS3 Team

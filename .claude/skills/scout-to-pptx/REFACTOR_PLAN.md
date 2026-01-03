# Scout-to-PPTX 改造方案

## 📋 当前实现的核心问题

### 问题描述
当前的 `scout-to-pptx` skill **绕过了 Scout 的核心能力**，直接调用 Firecrawl API 进行搜索和爬取，这违背了 skill 的设计初衷。

### 当前流程（错误）
```
用户请求
  ↓
直接调用 Firecrawl API 搜索 (10个结果)
  ↓
OpenAI 分析生成大纲
  ↓
Firecrawl scrape API 截图
  ↓
AI 生成配图
  ↓
组装 PPT
```

**存在的问题**：
- ❌ 绕过了 Scout 的搜索和分析能力
- ❌ 重复了 Scout 已经做的工作
- ❌ 受 Firecrawl API credits 限制（402 Insufficient credits）
- ❌ 没有体现 Scout 的核心价值

### 设计初衷

**Scout-to-PPTX 的核心**：
- ✅ Scout 负责网页搜索、爬取、分析
- ✅ PPT 生成是为了**可视化展示** Scout 的分析结果
- ✅ 生成 PPT 只是为了更好地**分享**和**展示** Scout 的成果

---

## 🎯 改造目标

### 正确的流程应该是
```
用户请求
  ↓
调用 Scout API 执行搜索任务
  ↓
Scout 爬取 + 分析 + 提取关键信息
  ↓
获取 Scout 的执行结果（已包含分析好的内容）
  ↓
基于 Scout 结果生成 PPT：
  - 使用 Scout 分析的内容
  - 添加网页截图作为证据
  - 生成 AI 配图美化
  ↓
返回专业的 PPT 报告
```

**核心原则**：
1. **Scout 是主角**：所有搜索、爬取、分析都由 Scout 完成
2. **PPT 是展示工具**：将 Scout 的结果可视化
3. **截图增强可信度**：对 Scout 找到的关键网页截图佐证

---

## 🔧 技术实现方案

### 方案 A：基于 Scout Execution（推荐）

#### API 设计
```typescript
POST /api/public/generate-pptx

Body:
{
  "executionId": "uuid-of-scout-execution",  // Scout 执行 ID
  "options": {
    "generateImages": true,       // 是否生成 AI 配图
    "captureScreenshots": true    // 是否截取网页截图
  }
}
```

#### 实现步骤

**1. 客户端流程**
```bash
# 第一步：使用现有的 scout skill 执行搜索
node .claude/skills/scout-skill/scripts/search.js "AI 最新进展"
# 输出: Scout execution started: execution_abc123

# 第二步：基于 Scout 结果生成 PPT
node .claude/skills/scout-to-pptx/scripts/generate-pptx.js --execution-id execution_abc123
```

**2. 后端实现**
```typescript
// app/api/public/generate-pptx/route.ts

export async function POST(request: NextRequest) {
  const { executionId, options = {} } = await request.json();

  // ========================================================================
  // STEP 1: 从数据库获取 Scout 执行结果
  // ========================================================================
  const execution = await supabase
    .from('scout_executions')
    .select('*')
    .eq('id', executionId)
    .single();

  if (!execution.data) {
    throw new Error('Scout execution not found');
  }

  // Scout 已经提供了：
  // - execution.data.results: 搜索结果列表
  // - execution.data.summary: AI 分析的总结
  // - execution.data.key_findings: 关键发现

  // ========================================================================
  // STEP 2: 基于 Scout 结果生成 PPT 大纲
  // ========================================================================
  const outline = await generateOutlineFromScoutResults(execution.data);

  // ========================================================================
  // STEP 3: 对 Scout 找到的关键网页截图（新增功能）
  // ========================================================================
  const screenshots = await captureScreenshots(execution.data.results.slice(0, 5));

  // ========================================================================
  // STEP 4: 生成 AI 配图（可选）
  // ========================================================================
  const aiImages = options.generateImages
    ? await generateAIImages(outline)
    : {};

  // ========================================================================
  // STEP 5: 组装 PPT
  // ========================================================================
  const pptx = assemblePPT({
    outline,
    scoutResults: execution.data,
    screenshots,
    aiImages
  });

  return new NextResponse(pptx);
}
```

**3. 数据库结构**
```sql
-- scout_executions 表已存在，包含：
-- id: uuid
-- query: text (搜索查询)
-- status: text (pending/running/completed/failed)
-- results: jsonb (搜索结果)
-- summary: text (AI 总结)
-- key_findings: jsonb (关键发现)
-- created_at: timestamp
```

---

### 方案 B：直接传递 Scout 结果（备选）

如果不想依赖数据库，可以直接传递 Scout 的结果：

```typescript
POST /api/public/generate-pptx

Body:
{
  "scoutResults": {
    "query": "AI 最新进展",
    "results": [...],      // Scout 搜索结果
    "summary": "...",      // Scout AI 总结
    "keyFindings": [...]   // Scout 关键发现
  },
  "options": {
    "generateImages": true,
    "captureScreenshots": true
  }
}
```

**优点**：
- ✅ 不依赖数据库
- ✅ 可以独立测试

**缺点**：
- ❌ 需要传输大量数据
- ❌ 客户端需要处理 Scout 结果

---

## 📝 详细改造清单

### 1. 后端 API 改造

#### 文件：`app/api/public/generate-pptx/route.ts`

**需要修改的部分**：

```typescript
// ❌ 删除：直接调用 Firecrawl 搜索
- const searchResponse = await fetch('https://api.firecrawl.dev/v2/search', {...});

// ✅ 新增：从 Scout 执行结果获取数据
+ const { executionId, scoutResults } = await request.json();
+
+ // 方案 A: 从数据库读取
+ const execution = await getScoutExecution(executionId);
+
+ // 或方案 B: 直接使用传入的结果
+ const results = scoutResults || execution.data;
```

**保留的部分**：
- ✅ STEP 3: 网页截图（基于 Scout 的结果 URLs）
- ✅ STEP 4: AI 图片生成
- ✅ STEP 5: PPT 组装
- ✅ STEP 6: 返回文件

**新增的功能**：
```typescript
// 将 Scout 的分析结果转换为 PPT 大纲
function generateOutlineFromScoutResults(scoutData: any) {
  return {
    title: scoutData.query,
    subtitle: "By Scout AI",
    sections: scoutData.key_findings.map((finding: any) => ({
      title: finding.title,
      content: finding.description,
      keyMessage: finding.insight,
      sourceUrl: finding.url  // 用于截图
    })),
    conclusion: scoutData.summary
  };
}
```

### 2. 客户端脚本改造

#### 文件：`.claude/skills/scout-to-pptx/scripts/generate-pptx.js`

**新增命令行参数**：
```javascript
// 支持两种模式：

// 模式 1: 基于 Scout execution ID
node generate-pptx.js --execution-id abc123

// 模式 2: 传统模式（向后兼容，但不推荐）
node generate-pptx.js "search query"
```

**修改请求体**：
```javascript
// ❌ 旧方式
const requestData = {
  query: "search query",
  options: { generateImages: true }
};

// ✅ 新方式
const requestData = {
  executionId: "abc123",  // 或 scoutResults: {...}
  options: {
    generateImages: true,
    captureScreenshots: true
  }
};
```

### 3. 集成 Scout API

#### 新增工具函数：
```javascript
// .claude/skills/scout-to-pptx/scripts/scout-integration.js

/**
 * 执行 Scout 搜索并返回 execution ID
 */
async function executeScoutSearch(query) {
  // 调用 Scout API
  const response = await fetch('http://localhost:3000/api/scout/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  const data = await response.json();
  return data.executionId;
}

/**
 * 等待 Scout 执行完成
 */
async function waitForScoutCompletion(executionId) {
  while (true) {
    const response = await fetch(`http://localhost:3000/api/scout/executions/${executionId}`);
    const data = await response.json();

    if (data.status === 'completed') {
      return data;
    } else if (data.status === 'failed') {
      throw new Error('Scout execution failed');
    }

    await sleep(2000); // 等待 2 秒后重试
  }
}
```

### 4. 完整的客户端流程

```javascript
// .claude/skills/scout-to-pptx/scripts/generate-pptx.js

async function generatePPTX(queryOrExecutionId, options) {
  let executionId;

  // 判断是 query 还是 executionId
  if (options.executionId) {
    executionId = options.executionId;
    console.log('📋 Using existing Scout execution:', executionId);
  } else {
    // 先执行 Scout 搜索
    console.log('🔍 Starting Scout search...');
    executionId = await executeScoutSearch(queryOrExecutionId);
    console.log('⏳ Waiting for Scout to complete...');
    await waitForScoutCompletion(executionId);
    console.log('✅ Scout search completed!');
  }

  // 基于 Scout 结果生成 PPT
  console.log('📊 Generating PowerPoint presentation...');
  const response = await fetch('http://localhost:3000/api/public/generate-pptx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      executionId,
      options: {
        generateImages: options.generateImages,
        captureScreenshots: true
      }
    })
  });

  // 保存 PPT 文件
  const buffer = await response.buffer();
  await savePPTX(buffer, `scout-report-${Date.now()}.pptx`);
}
```

---

## 🎨 PPT 内容结构（基于 Scout）

### 封面页
- **标题**: Scout 的搜索查询
- **副标题**: "AI-Powered Research by Scout"
- **日期**: 生成日期
- **配图**: AI 生成的主题图片

### 内容页（每个关键发现一页）
```
┌─────────────────────────────────────────────────────┐
│ 标题：Scout 发现的关键点标题                          │
├───────────────────┬─────────────────────────────────┤
│ 内容区域：         │  右上：AI 生成的配图              │
│ • Scout 提取的要点 │                                 │
│ • 关键信息        │  ─────────────────────────────  │
│ • 数据分析        │  右下：网页截图（佐证）            │
│                  │  📸 Source Evidence             │
│ 关键洞察：        │  [来源 URL]                      │
│ Scout 的 insight  │                                 │
└───────────────────┴─────────────────────────────────┘
```

### 结论页
- **总结**: Scout 的 AI 总结
- **建议**: Scout 的建议（如果有）

### 来源页
- **所有网页链接**: Scout 找到的所有相关网页
- **可点击**: 超链接到原始网页

---

## 🚀 实施步骤

### Phase 1: 基础架构（1-2小时）
1. ✅ 创建 `scout-integration.js` 工具函数
2. ✅ 修改后端 API 接受 `executionId` 参数
3. ✅ 添加从数据库读取 Scout 执行结果的逻辑
4. ✅ 测试基本流程

### Phase 2: 内容生成（1-2小时）
1. ✅ 实现 `generateOutlineFromScoutResults()` 函数
2. ✅ 将 Scout 的关键发现映射到 PPT 章节
3. ✅ 保留截图功能（从 stash 恢复）
4. ✅ 测试内容生成

### Phase 3: 客户端改造（1小时）
1. ✅ 修改命令行参数解析
2. ✅ 支持 `--execution-id` 参数
3. ✅ 集成 Scout API 调用
4. ✅ 向后兼容旧的 query 模式

### Phase 4: 测试和优化（1小时）
1. ✅ 端到端测试
2. ✅ 错误处理优化
3. ✅ 性能优化
4. ✅ 文档更新

---

## 📊 对比：改造前 vs 改造后

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| **搜索来源** | 直接调用 Firecrawl | Scout API |
| **内容分析** | OpenAI 重新分析 | 使用 Scout 的分析结果 |
| **API 调用** | 3次（Firecrawl搜索 + scrape + OpenAI） | 1次（Scout已完成） |
| **Credits消耗** | 高（每次都调用Firecrawl） | 低（复用Scout结果） |
| **核心价值** | ❌ 没有体现Scout能力 | ✅ 完全基于Scout |
| **可信度** | ✅ 有（AI分析） | ✅✅ 更高（Scout专业分析 + 截图佐证） |
| **生成速度** | 慢（重新搜索分析） | 快（直接使用Scout结果） |

---

## 📚 相关文档

- [Scout Skill 文档](../scout-skill/SKILL.md)
- [Scout API 参考](../../app/api/scout/)
- [Firecrawl 文档](https://docs.firecrawl.dev/)
- [PptxGenJS 文档](https://gitbrent.github.io/PptxGenJS/)

---

## 🔄 Git Stash 管理

### 当前暂存的修改
```bash
# 查看 stash
git stash list

# 恢复截图功能代码
git stash pop stash@{0}

# 或查看 stash 内容
git stash show -p stash@{0}
```

**暂存内容**：
- ✅ STEP 3: 网页截图功能
- ✅ PPT 中嵌入截图 + 来源标注
- ✅ "📸 Source Evidence" 标签

---

## ⚠️ 注意事项

1. **保持向后兼容**：旧的 query 模式应该仍然可以工作（自动调用 Scout）
2. **错误处理**：Scout 执行失败时的降级策略
3. **性能优化**：截图可以并行处理
4. **Credits 管理**：截图功能仍然需要 Firecrawl credits，但消耗大幅减少
5. **数据库权限**：确保 API 有权限读取 scout_executions 表

---

## ✅ 验收标准

改造完成后，应该满足：

1. ✅ **核心流程正确**：用户请求 → Scout搜索 → 生成PPT
2. ✅ **利用Scout能力**：所有搜索和分析都由 Scout 完成
3. ✅ **保留增强功能**：网页截图、AI配图仍然可用
4. ✅ **性能提升**：不重复调用 Firecrawl 搜索
5. ✅ **Credits节省**：减少 Firecrawl API 调用次数
6. ✅ **向后兼容**：支持 query 模式（自动调用Scout）
7. ✅ **文档完善**：更新所有相关文档

---

**文档版本**: 1.0
**创建时间**: 2026-01-03
**状态**: 待实施

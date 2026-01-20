# Embedding 功能修复指南

## 问题诊断

当前配置的代理 `https://llm.tokencloud.ai` **不支持 embedding 生成**，导致去重功能完全无法工作。

**根本原因**:
- 代理 API key 只能访问聊天模型（DeepSeek-V3, Gemini, GPT-4o 等）
- 没有任何标准的 embedding 模型（text-embedding-3-small, bge-large-zh 等）
- `BAAI/bge-reranker-large` 是 reranker（排序模型），不是 embedding 模型

---

## 解决方案 A: 独立配置 Embeddings (推荐) ⭐

**优点**: 聊天使用便宜的代理，embeddings 使用官方 API，成本最优

### 步骤 1: 修改代码支持独立 embedding endpoint

编辑 `supabase/functions/scout-cron/agent.ts`:

```typescript
// Line 81-85 修改为:
try {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";
  const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const OPENAI_EMBEDDING_MODEL = Deno.env.get("OPENAI_EMBEDDING_MODEL") || "text-embedding-3-small";

  // 添加这两行 - 为 embeddings 使用独立的配置
  const OPENAI_EMBEDDING_BASE_URL = Deno.env.get("OPENAI_EMBEDDING_BASE_URL") || OPENAI_BASE_URL;
  const OPENAI_EMBEDDING_API_KEY = Deno.env.get("OPENAI_EMBEDDING_API_KEY") || OPENAI_API_KEY;
```

```typescript
// Line 610 修改为:
const embeddingResponse = await fetch(`${OPENAI_EMBEDDING_BASE_URL}/embeddings`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${OPENAI_EMBEDDING_API_KEY}`,  // 使用独立的 key
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: OPENAI_EMBEDDING_MODEL,
    input: summaryText,
  }),
  signal: embeddingController.signal,
});
```

### 步骤 2: 更新 .env 配置

```bash
# 聊天模型 - 继续使用便宜的代理
OPENAI_BASE_URL=https://llm.tokencloud.ai
OPENAI_API_KEY=sk-RPo8Q8Lf9_SKoNMSjo5DNA
OPENAI_MODEL=DeepSeek-V3

# Embeddings - 使用官方 OpenAI API
OPENAI_EMBEDDING_BASE_URL=https://api.openai.com/v1
OPENAI_EMBEDDING_API_KEY=<你的官方-OpenAI-key>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 步骤 3: 更新 Supabase Edge Function secrets

```bash
# 更新 Edge Function 的环境变量
npx supabase secrets set OPENAI_EMBEDDING_BASE_URL=https://api.openai.com/v1
npx supabase secrets set OPENAI_EMBEDDING_API_KEY=<你的官方-OpenAI-key>
npx supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 步骤 4: 验证配置

```bash
# 测试 embedding 生成
curl -X POST "https://api.openai.com/v1/embeddings" \
  -H "Authorization: Bearer <你的官方-OpenAI-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-3-small",
    "input": "测试文本"
  }'

# 预期返回: {"data": [{"embedding": [...], "index": 0}], ...}
```

### 成本分析

**Embeddings 成本** (text-embedding-3-small):
- 价格: $0.02 / 1M tokens
- 平均摘要: ~50 tokens
- 每次执行: $0.000001 (可忽略不计)
- **1000 次执行 ≈ $0.001 USD** (不到 1 分钱)

**总成本**:
- 聊天模型 (DeepSeek-V3): 使用代理，成本较低
- Embeddings: 每月预计 < $0.1 USD
- **总计: 几乎可以忽略**

---

## 解决方案 B: 全部使用官方 OpenAI API

**优点**: 配置简单，官方支持
**缺点**: 聊天模型成本较高

### 修改 .env

```bash
# 全部使用官方 OpenAI API
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=<你的官方-OpenAI-key>
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 更新 Supabase secrets

```bash
npx supabase secrets set OPENAI_BASE_URL=https://api.openai.com/v1
npx supabase secrets set OPENAI_API_KEY=<你的官方-OpenAI-key>
npx supabase secrets set OPENAI_MODEL=gpt-4o-mini
npx supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 成本分析

**GPT-4o-mini** (聊天):
- 价格: $0.15 / 1M input tokens, $0.60 / 1M output tokens
- 每次 Scout 执行: 约 3K-5K tokens
- **预计每月**: $5-$20 USD (取决于使用频率)

**Embeddings**: < $0.1 USD/月

**总计**: 每月 $5-$20 USD

---

## 解决方案 C: 寻找支持 Embeddings 的代理

### 可能的代理服务

1. **OpenRouter** (https://openrouter.ai)
   - 支持多种 embedding 模型
   - 价格可能更便宜
   - 需要验证模型可用性

2. **Azure OpenAI**
   - 官方服务，稳定可靠
   - 需要 Azure 账户
   - 可能有区域限制

3. **其他兼容服务**
   - Together AI
   - Replicate
   - Anyscale

### 验证步骤

```bash
# 测试代理是否支持 embeddings
curl -X POST "<代理-URL>/embeddings" \
  -H "Authorization: Bearer <代理-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<模型名称>",
    "input": "test"
  }'
```

---

## 推荐方案总结

| 方案 | 配置复杂度 | 月成本 | 推荐度 |
|------|-----------|--------|--------|
| **方案 A: 独立 embedding** | 中 | < $1 | ⭐⭐⭐⭐⭐ |
| 方案 B: 全用官方 | 低 | $5-$20 | ⭐⭐⭐ |
| 方案 C: 找新代理 | 高 | 未知 | ⭐⭐ |

**最佳选择**: 方案 A - 保持现有聊天模型配置，只为 embeddings 使用官方 API。

---

## 验证测试

完成配置后，运行以下测试：

### 1. 手动测试 embedding 生成

```bash
# 触发一次 Scout 执行
curl -X POST "https://pognfpblehwkohhoxpnu.supabase.co/functions/v1/scout-cron?scoutId=<scout-id>" \
  -H "Authorization: Bearer <service-role-key>"
```

### 2. 检查数据库

```sql
-- 查看最新执行是否生成了 embedding
SELECT
  id,
  summary_text,
  CASE
    WHEN summary_embedding IS NULL THEN '❌ FAILED'
    ELSE '✅ SUCCESS'
  END as embedding_status,
  completed_at
FROM scout_executions
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
```

预期结果: `embedding_status = '✅ SUCCESS'`

### 3. 测试去重检测

```bash
# 连续触发同一 Scout 两次 (间隔 2 分钟)
curl -X POST ".../scout-cron?scoutId=<scout-id>"
sleep 120
curl -X POST ".../scout-cron?scoutId=<scout-id>"

# 检查第二次执行是否检测到重复
# 查看日志或数据库中的 results_summary
```

预期: 如果内容相似，第二次执行应该包含 "Note: This finding appears very similar..." 提示

---

## 常见问题

### Q: 为什么不能用 BAAI/bge-reranker-large?

A: 这是一个 **reranker 模型**，用于对搜索结果重新排序，不能生成向量嵌入。你需要的是 **embedding 模型**，如 text-embedding-3-small 或 bge-large-zh。

### Q: 我可以用免费的 embedding 服务吗?

A: OpenAI embeddings 非常便宜（每月 < $0.1），建议直接使用官方 API。免费服务可能有限制或稳定性问题。

### Q: 如何获取官方 OpenAI API key?

A:
1. 访问 https://platform.openai.com/api-keys
2. 登录或注册 OpenAI 账户
3. 创建新的 API key
4. 充值至少 $5 (新用户可能有免费额度)

### Q: 配置后多久生效?

A:
- 本地 .env: 重启 Next.js 开发服务器后立即生效
- Supabase secrets: 更新后需要等待 1-2 分钟生效

---

## 后续步骤

完成修复后:
1. ✅ 补救历史数据 (参考 DEDUPLICATION_VALIDATION_REPORT.md 的 backfill 脚本)
2. ✅ 添加监控告警 (embedding 生成失败率)
3. ✅ 优化去重阈值 (根据实际效果调整 0.85)
4. ✅ 添加时间窗口过滤 (30 天)

参考完整的验证报告: `DEDUPLICATION_VALIDATION_REPORT.md`

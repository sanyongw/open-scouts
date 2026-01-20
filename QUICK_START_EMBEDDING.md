# 快速配置 Embedding 功能

## ✅ 代码已更新

代码已修改完成，现在支持为 embeddings 使用独立的 API endpoint 和 key。

## 🔧 下一步：配置你的 OpenAI API Key

### 步骤 1: 获取 OpenAI API Key

1. 访问 https://platform.openai.com/api-keys
2. 登录或注册账户
3. 点击 "Create new secret key"
4. 复制生成的 key（格式: sk-proj-...）
5. 充值至少 $5（新用户可能有免费额度）

### 步骤 2: 更新 .env 文件

编辑 `/home/laiye/workspace/code/open-scouts/.env`:

```bash
# 将这行:
OPENAI_EMBEDDING_API_KEY=<your-official-openai-key>

# 改为:
OPENAI_EMBEDDING_API_KEY=sk-proj-你的真实key
```

**当前配置**:
```bash
# 聊天模型 - 继续使用代理 (便宜)
OPENAI_BASE_URL=https://llm.tokencloud.ai
OPENAI_API_KEY=sk-RPo8Q8Lf9_SKoNMSjo5DNA
OPENAI_MODEL=DeepSeek-V3

# Embeddings - 使用官方 API (必需)
OPENAI_EMBEDDING_BASE_URL=https://api.openai.com/v1
OPENAI_EMBEDDING_API_KEY=<需要替换>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 步骤 3: 更新 Supabase Edge Function Secrets

```bash
# 在项目根目录执行
npx supabase secrets set OPENAI_EMBEDDING_BASE_URL=https://api.openai.com/v1
npx supabase secrets set OPENAI_EMBEDDING_API_KEY=sk-proj-你的真实key
npx supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 步骤 4: 测试配置

```bash
# 1. 测试 embedding API
curl -X POST "https://api.openai.com/v1/embeddings" \
  -H "Authorization: Bearer sk-proj-你的真实key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-3-small",
    "input": "测试文本"
  }'

# 预期返回: {"data": [{"embedding": [...], ...}], ...}
```

### 步骤 5: 触发 Scout 执行验证

```bash
# 获取一个 Scout ID
psql "postgresql://postgres.pognfpblehwkohhoxpnu:WSY232wsy@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres" -c "
SELECT id, title FROM scouts WHERE is_active = true LIMIT 1;
"

# 触发执行 (替换 <scout-id>)
curl -X POST "https://pognfpblehwkohhoxpnu.supabase.co/functions/v1/scout-cron?scoutId=<scout-id>" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZ25mcGJsZWh3a29oaG94cG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk2MzI5MywiZXhwIjoyMDgxNTM5MjkzfQ.-JzaU3pYrCJwmF2JZJWe-q7RHaiAfgmdohzEb1SATmo"
```

### 步骤 6: 验证结果

```bash
# 检查最新执行是否生成了 embedding
psql "postgresql://postgres.pognfpblehwkohhoxpnu:WSY232wsy@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres" -c "
SELECT
  id,
  summary_text,
  CASE
    WHEN summary_embedding IS NULL THEN '❌ FAILED - 没有生成 embedding'
    ELSE '✅ SUCCESS - embedding 已生成'
  END as status,
  completed_at
FROM scout_executions
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
"
```

**预期结果**: status = '✅ SUCCESS - embedding 已生成'

## 💰 成本预估

**Embeddings 成本** (text-embedding-3-small):
- 价格: $0.02 / 1M tokens
- 每次执行: ~$0.000001 (50 tokens)
- **每月 1000 次执行 ≈ $0.001** (不到 1 分钱)

**总结**: 几乎可以忽略不计 💸

## ✅ 成功标志

配置成功后，你会看到：

1. **数据库中**: `summary_embedding` 字段有值（不再是 NULL）
2. **日志中**: "Embedding generated successfully (1536 dimensions)"
3. **去重检测**: 相似内容会被标记为重复

## 🔍 故障排查

### 问题 1: embedding 仍然是 NULL

**检查**:
```bash
# 查看 Edge Function 日志
npx supabase functions logs scout-cron --tail

# 搜索错误信息
# 如果看到 "Failed to generate embedding: 401"，说明 API key 无效
```

**解决**: 确认 API key 正确，并已设置到 Supabase secrets

### 问题 2: API key 无效

**错误**: "Incorrect API key provided"

**解决**:
1. 确认复制了完整的 key（包括 sk-proj- 前缀）
2. 确认 key 有效且已充值
3. 重新生成 key 并更新配置

### 问题 3: Supabase secrets 未生效

**症状**: 本地测试成功，但 Edge Function 仍然失败

**解决**:
```bash
# 查看当前 secrets
npx supabase secrets list

# 确认是否包含:
# - OPENAI_EMBEDDING_BASE_URL
# - OPENAI_EMBEDDING_API_KEY
# - OPENAI_EMBEDDING_MODEL

# 如果缺失，重新设置
npx supabase secrets set OPENAI_EMBEDDING_API_KEY=sk-proj-你的key
```

等待 1-2 分钟后重试。

## 📚 相关文档

- 详细修复指南: `EMBEDDING_FIX_GUIDE.md`
- 完整验证报告: `DEDUPLICATION_VALIDATION_REPORT.md`
- OpenAI Embeddings 文档: https://platform.openai.com/docs/guides/embeddings

## 🎯 测试去重功能

配置成功后，测试去重检测：

```bash
# 1. 触发第一次执行
curl -X POST ".../scout-cron?scoutId=<scout-id>"

# 2. 等待 2 分钟

# 3. 触发第二次执行
curl -X POST ".../scout-cron?scoutId=<scout-id>"

# 4. 检查第二次执行的响应
# 如果内容相似，应该看到:
# "Note: This finding appears very similar to a previous result..."
```

---

**需要帮助?** 查看完整的故障排查指南: `EMBEDDING_FIX_GUIDE.md`

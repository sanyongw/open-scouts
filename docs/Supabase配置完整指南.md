# Open Scouts - Supabase 配置完整指南

本文档记录了 Open Scouts 项目中 Supabase 的完整配置过程，包括遇到的问题和解决方案。

---

## 目录

1. [环境准备](#环境准备)
2. [创建 Supabase 项目](#创建-supabase-项目)
3. [配置数据库连接](#配置数据库连接)
4. [启用数据库扩展](#启用数据库扩展)
5. [运行数据库迁移](#运行数据库迁移)
6. [配置定时任务](#配置定时任务)
7. [部署 Edge Functions](#部署-edge-functions)
8. [验证部署](#验证部署)
9. [常见问题](#常见问题)

---

## 环境准备

### 1. 项目依赖

确保已安装：
- Node.js 18+ (本项目使用 v22.20.0)
- npm 或 bun

### 2. 环境变量配置

复制环境变量模板：
```bash
cp .env.example .env
```

需要配置的关键变量：
```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...

# AI 服务
OPENAI_API_KEY=sk-proj-xxx
FIRECRAWL_API_KEY=fc-xxx

# Supabase CLI Token（用于部署）
SUPABASE_ACCESS_TOKEN=sbp_xxx

# 可选：邮件通知
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL="Open Scouts <scouts@yourdomain.com>"
```

---

## 创建 Supabase 项目

### 1. 访问 Supabase Dashboard

访问：https://supabase.com/dashboard

### 2. 创建新项目

1. 点击 **"New Project"**
2. 填写项目信息：
   - **Name**: open-scouts（或自定义）
   - **Database Password**: 设置强密码（**重要：保存此密码**）
   - **Region**: 选择最近的区域（本例：Northeast Asia - ap-northeast-1）
   - **Pricing Plan**: Free（或根据需求选择）

3. 点击 **"Create new project"**

4. **等待 2-3 分钟**，直到项目状态显示为 "Active"（绿色）

### 3. 获取项目凭证

项目创建完成后，进入 **Project Settings** → **API**：

复制以下信息到 `.env` 文件：

```bash
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://pognfpblehwkohhoxpnu.supabase.co

# anon public key（客户端使用）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# service_role key（服务端使用，**保密**）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 4. 获取 Supabase Access Token

用于 CLI 部署 Edge Functions：

1. 访问：https://supabase.com/dashboard/account/tokens
2. 点击 **"Generate new token"**
3. 输入名称（如：`open-scouts-deploy`）
4. 复制 token（格式：`sbp_xxx...`）
5. 添加到 `.env`：
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_a52e501e832fafa4757fad29db5842023b8d7a3d
   ```

---

## 配置数据库连接

### 问题：IPv6 连接失败

**现象**：
```
❌ Error: connect ENETUNREACH 2406:da14:271:990f:... - Local (:::0)
```

**原因**：
- Supabase 直接数据库连接（端口 5432）仅支持 IPv6
- 本地网络不支持 IPv6

### 解决方案：使用连接池（支持 IPv4）

#### 1. 获取连接池 URL

访问：**Project Settings** → **Database** → **Connection Pooling**

在 **Transaction mode** 下，复制 **URI** 格式的连接字符串：

```
postgresql://postgres.pognfpblehwkohhoxpnu:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**关键区别**：

| 字段 | 直接连接（IPv6 Only） | 连接池（IPv4 + IPv6） |
|-----|-------------------|-------------------|
| 用户名 | `postgres` | `postgres.项目ID` |
| 主机 | `db.xxx.supabase.co` | `aws-0-region.pooler.supabase.com` |
| 端口 | `5432` | `6543` |

#### 2. 更新 .env 文件

```bash
# 修改前（直接连接）
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.pognfpblehwkohhoxpnu.supabase.co:5432/postgres

# 修改后（连接池）
DATABASE_URL=postgresql://postgres.pognfpblehwkohhoxpnu:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

#### 3. 测试连接

使用项目提供的测试脚本：

```bash
node test-db-connection.mjs
```

**成功输出**：
```
✅ 数据库连接成功！

📊 数据库信息:
   版本: PostgreSQL 17.6
   数据库: postgres
   服务器 IP: 2406:da14:...

📦 已安装的扩展:
   supabase_vault v0.3.1
```

---

## 启用数据库扩展

### 必需扩展清单

| 扩展名 | 用途 | 状态 |
|-------|------|------|
| `vector` (pgvector) | 向量搜索（语义去重） | ✅ 必需 |
| `pg_cron` | 定时任务调度 | ✅ 必需 |
| `pg_net` | HTTP 请求 | ✅ 必需 |
| `supabase_vault` | 密钥存储 | ✅ 通常已启用 |

### 启用步骤

1. **访问 Extensions 页面**
   ```
   Database → Extensions
   ```

2. **搜索并启用扩展**

   在搜索框中输入扩展名，点击右侧开关启用：

   - 搜索 `vector` → 点击启用
   - 搜索 `pg_cron` → 点击启用
   - 搜索 `pg_net` → 点击启用
   - 检查 `supabase_vault` 是否已启用

3. **等待启用完成**（约 10-30 秒）

4. **验证扩展**

   再次运行测试脚本：
   ```bash
   node test-db-connection.mjs
   ```

   应该看到：
   ```
   📦 已安装的扩展:
      pg_cron v1.6.4
      pg_net v0.19.5
      supabase_vault v0.3.1
      vector v0.8.0
   ```

---

## 运行数据库迁移

### 自动迁移脚本

项目提供了自动化的数据库设置脚本：

```bash
npm run setup:db
```

### 迁移内容

脚本会执行以下操作：

1. **创建数据表**（6 张表）：
   - `scouts` - Scout 配置
   - `scout_messages` - 对话历史
   - `scout_executions` - 执行记录
   - `scout_execution_steps` - 执行步骤详情
   - `user_preferences` - 用户设置
   - `firecrawl_usage_logs` - Firecrawl 使用日志

2. **创建索引**：
   - B-tree 索引（user_id, status, created_at 等）
   - **HNSW 向量索引**（summary_embedding）- 加速语义搜索

3. **启用 Row Level Security (RLS)**：
   - 所有表启用 RLS
   - 用户只能访问自己的数据
   - Service role 可以访问所有数据

4. **创建触发器和函数**：
   - `update_scout_timestamp()` - 自动更新 Scout 时间戳
   - `should_run_scout()` - 判断 Scout 是否到期
   - `dispatch_due_scouts()` - 调度到期的 Scouts
   - `cleanup_scout_executions()` - 清理卡住的执行

5. **配置 Vault 密钥**：
   ```sql
   -- 存储 Supabase URL 和 Service Role Key
   SELECT vault.create_secret('项目URL', 'project_url');
   SELECT vault.create_secret('Service Role Key', 'service_role_key');
   ```

6. **创建定时任务**：
   ```sql
   -- 每分钟调度到期的 Scouts
   SELECT cron.schedule(
     'dispatch-scouts',
     '* * * * *',
     $$SELECT dispatch_due_scouts();$$
   );

   -- 每 5 分钟清理卡住的执行
   SELECT cron.schedule(
     'cleanup-executions',
     '*/5 * * * *',
     $$SELECT cleanup_scout_executions();$$
   );
   ```

### 成功输出

```
🚀 Running database setup...

📄 Running schema migration...
✅ Schema created!

🔄 Enabling realtime for execution tables...
✅ Realtime enabled!

🔍 Checking for required extensions...
✅ pgvector extension enabled!
✅ Scheduling extensions (pg_cron, pg_net) enabled!
✅ Vault extension enabled!

🔧 Setting up scalable scout dispatcher...
✅ Vault secrets configured!

⏰ Configuring cron jobs...
✅ Dispatcher cron jobs configured:
   - dispatch-scouts: * * * * *
   - cleanup-scouts: */5 * * * *

🎉 Database setup complete!
```

---

## 配置定时任务

定时任务已通过 `npm run setup:db` 自动配置。

### 验证定时任务

在 Supabase Dashboard 中，进入 **Database** → **SQL Editor**，执行：

```sql
-- 查看所有定时任务
SELECT * FROM cron.job;
```

应该看到：

| jobid | schedule | command | active |
|-------|----------|---------|--------|
| 1 | * * * * * | SELECT dispatch_due_scouts(); | t |
| 2 | */5 * * * * | SELECT cleanup_scout_executions(); | t |

### 查看定时任务执行日志

```sql
-- 查看最近的执行记录
SELECT
  job_id,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### 定时任务工作原理

#### dispatch_due_scouts() 函数

每分钟执行一次，查找所有到期的 Scouts：

```sql
-- 判断标准
1. Scout 是 active 状态
2. Scout 配置完整（title, goal, search_queries 等）
3. 根据 frequency 判断是否到期：
   - daily: 距离上次运行 >= 24 小时
   - every_3_days: >= 72 小时
   - weekly: >= 168 小时
4. 没有正在运行的 execution
```

找到到期的 Scout 后，使用 **pg_net** 发起 HTTP 请求到 Edge Function：

```sql
SELECT net.http_post(
  url := 'https://pognfpblehwkohhoxpnu.supabase.co/functions/v1/scout-cron',
  headers := jsonb_build_object(
    'Authorization', 'Bearer service_role_key'
  ),
  body := jsonb_build_object('scoutId', scout_id)
);
```

#### cleanup_scout_executions() 函数

每 5 分钟执行一次，清理卡住的执行：

```sql
-- 将运行超过 10 分钟的 execution 标记为 failed
UPDATE scout_executions
SET
  status = 'failed',
  completed_at = NOW(),
  error_message = 'Execution timed out after 10 minutes'
WHERE
  status = 'running'
  AND started_at < NOW() - INTERVAL '10 minutes';
```

---

## 部署 Edge Functions

### Edge Functions 列表

| 函数名 | 大小 | 用途 |
|-------|------|------|
| `scout-cron` | 154kB | 执行 Scout 搜索和分析 |
| `send-test-email` | 128.5kB | 测试邮件发送功能 |

### 部署方法

#### 方法一：使用 Supabase CLI（推荐）

```bash
# 确保已登录并关联项目
npx supabase link --project-ref pognfpblehwkohhoxpnu

# 部署 scout-cron
npx supabase functions deploy scout-cron --no-verify-jwt

# 部署 send-test-email
npx supabase functions deploy send-test-email --no-verify-jwt
```

**参数说明**：
- `--no-verify-jwt`: 跳过本地验证，加快部署速度

**成功输出**：
```
Bundling Function: scout-cron
Deploying Function: scout-cron (script size: 154kB)
Deployed Functions on project pognfpblehwkohhoxpnu: scout-cron
You can inspect your deployment in the Dashboard: https://...
```

#### 方法二：通过 Dashboard Web UI

如果 CLI 网络较慢，可以手动上传：

1. 访问：**Edge Functions** 页面
2. 点击 **"Create a new function"**
3. 输入函数名（如 `scout-cron`）
4. 上传 `supabase/functions/scout-cron/` 文件夹中的所有文件
5. 点击 **"Deploy"**

### 同步 Edge Function 密钥

Edge Functions 需要访问以下环境变量：

```bash
# 使用项目提供的脚本
node sync-secrets.mjs
```

或手动同步：

```bash
npx supabase secrets set OPENAI_API_KEY="sk-proj-xxx"
npx supabase secrets set FIRECRAWL_API_KEY="fc-xxx"

# 可选：邮件通知
npx supabase secrets set RESEND_API_KEY="re_xxx"
npx supabase secrets set RESEND_FROM_EMAIL="Open Scouts <scouts@yourdomain.com>"
```

**验证密钥**：
```bash
npx supabase secrets list
```

应该看到：
```
OPENAI_API_KEY
FIRECRAWL_API_KEY
RESEND_API_KEY (可选)
RESEND_FROM_EMAIL (可选)
```

---

## 验证部署

### 1. 检查 Edge Functions 状态

访问：https://supabase.com/dashboard/project/pognfpblehwkohhoxpnu/functions

应该看到：
```
✅ scout-cron        Status: Active
✅ send-test-email   Status: Active
```

### 2. 测试 Edge Function

```bash
# 测试 scout-cron（应该返回错误，因为缺少 scoutId 参数）
curl -i "https://pognfpblehwkohhoxpnu.supabase.co/functions/v1/scout-cron" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# 预期响应：
# {"error":"scoutId is required. This function executes individual scouts..."}
```

### 3. 查看函数日志

在 Dashboard 中：**Edge Functions** → **scout-cron** → **Logs**

查看函数调用日志和错误信息。

### 4. 验证定时任务

```sql
-- 查看最近的定时任务执行
SELECT
  job_id,
  status,
  start_time,
  return_message
FROM cron.job_run_details
WHERE job_id IN (
  SELECT jobid FROM cron.job WHERE command LIKE '%dispatch_due_scouts%'
)
ORDER BY start_time DESC
LIMIT 5;
```

### 5. 完整功能测试

1. 访问应用：http://localhost:3006
2. 注册账号
3. 创建测试 Scout
4. 点击 "Run Now" 手动执行
5. 查看执行结果和日志

---

## 常见问题

### Q1: 数据库连接失败 - ENETUNREACH

**问题**：
```
Error: connect ENETUNREACH 2406:da14:... - Local (:::0)
```

**原因**：直接数据库连接仅支持 IPv6

**解决**：使用连接池 URL（端口 6543）

---

### Q2: Edge Functions 部署超时

**问题**：CLI 部署时下载 Docker 镜像很慢

**解决**：
1. 加上 `--no-verify-jwt` 参数
2. 或使用 Dashboard Web UI 手动上传

---

### Q3: 扩展启用失败

**问题**：启用 pg_cron 或 pg_net 时报错

**解决**：
1. 确保使用的是 Supabase Cloud（本地 Supabase 需要手动配置）
2. 等待几秒后刷新页面重试
3. 检查项目是否为 Pro 套餐（某些扩展需要付费套餐）

---

### Q4: 定时任务没有运行

**排查步骤**：

1. **检查扩展是否启用**：
   ```sql
   SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **检查定时任务是否存在**：
   ```sql
   SELECT * FROM cron.job;
   ```

3. **查看执行日志**：
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   ```

4. **检查 Vault 密钥**：
   ```sql
   SELECT name FROM vault.decrypted_secrets;
   ```

---

### Q5: Edge Function 报错 "Access token not provided"

**原因**：SUPABASE_ACCESS_TOKEN 未设置

**解决**：
1. 从 https://supabase.com/dashboard/account/tokens 生成 token
2. 添加到 `.env` 文件：
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_xxx
   ```
3. 重新运行部署命令

---

### Q6: RLS 策略导致无法访问数据

**问题**：用户创建的 Scout 看不到

**排查**：
1. 检查用户是否已登录（`auth.uid()` 返回 null）
2. 确认 RLS 策略已正确创建
3. 使用 Service Role Key 绕过 RLS 进行调试

**验证 RLS 策略**：
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'scouts';
```

---

## 架构设计亮点

### 1. 可扩展的调度架构

```
pg_cron (每分钟)
  → dispatch_due_scouts() 函数
    → 查找到期的 Scouts
      → pg_net.http_post() 为每个 Scout 发起独立 HTTP 请求
        → Edge Function (隔离执行，256MB 内存，400s 超时)
```

**优势**：
- ✅ 每个 Scout 独立执行，资源隔离
- ✅ 支持成千上万个 Scouts 并发运行
- ✅ 单个 Scout 失败不影响其他
- ✅ 自动清理机制防止卡住

### 2. 语义去重系统

使用 pgvector 存储和检索 AI 生成的摘要向量：

```sql
-- 存储向量（1536 维）
summary_embedding vector(1536)

-- HNSW 索引加速搜索
CREATE INDEX idx_scout_executions_summary_embedding
ON scout_executions
USING hnsw (summary_embedding vector_cosine_ops);
```

**去重流程**：
1. AI 生成本次执行的一句话摘要
2. 使用 OpenAI text-embedding-3-small 生成向量
3. 与最近 20 次执行的向量计算余弦相似度
4. 相似度 > 0.85 → 标记为重复，不发送通知
5. 相似度 < 0.85 → 发送邮件通知

### 3. 自动降级机制

```sql
-- 连续失败计数
consecutive_failures INT DEFAULT 0

-- 失败时 +1
UPDATE scouts SET consecutive_failures = consecutive_failures + 1 ...

-- 连续失败 3 次自动禁用
IF consecutive_failures >= 3 THEN
  UPDATE scouts SET is_active = false ...
  -- 发送邮件通知用户
END IF;

-- 成功时重置
UPDATE scouts SET consecutive_failures = 0 ...
```

---

## 总结

### 部署清单

- [x] 创建 Supabase 项目
- [x] 配置连接池 URL（解决 IPv6 问题）
- [x] 启用数据库扩展（vector, pg_cron, pg_net, vault）
- [x] 运行数据库迁移（表、索引、RLS、函数、触发器）
- [x] 配置 Vault 密钥（project_url, service_role_key）
- [x] 创建定时任务（dispatch-scouts, cleanup-executions）
- [x] 同步 Edge Function 密钥（OPENAI_API_KEY, FIRECRAWL_API_KEY）
- [x] 部署 Edge Functions（scout-cron, send-test-email）
- [x] 验证完整功能

### 关键配置

| 配置项 | 值 |
|-------|---|
| 项目 ID | pognfpblehwkohhoxpnu |
| 区域 | ap-northeast-1 (Northeast Asia) |
| 数据库版本 | PostgreSQL 17.6 |
| 连接方式 | 连接池（Transaction Mode，端口 6543） |
| 扩展 | vector v0.8.0, pg_cron v1.6.4, pg_net v0.19.5, vault v0.3.1 |
| 定时任务 | 每分钟调度 + 每 5 分钟清理 |
| Edge Functions | scout-cron (154kB) + send-test-email (128.5kB) |

### 下一步

1. **配置认证**（可选）：
   - Email/Password（默认已启用）
   - Google OAuth（需要 Google Cloud Console 配置）

2. **配置邮件通知**（可选）：
   - 注册 Resend
   - 同步 API Key 到 Edge Functions

3. **开始使用**：
   - 访问 http://localhost:3006
   - 创建第一个 Scout
   - 测试自动执行

---

**文档版本**: v1.0
**最后更新**: 2025-12-18
**项目**: Open Scouts
**作者**: Claude Code

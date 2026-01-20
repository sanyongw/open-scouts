#!/bin/bash

# 诊断 Scout 执行问题的脚本

EXECUTION_ID="f884a75e-1ea3-4f12-824d-8e9f2d8bd0ba"
SCOUT_ID="4af51012-1c86-4e61-ac19-ac5e6abe39e7"

echo "======================================================================"
echo "Scout 执行诊断报告"
echo "======================================================================"
echo ""

# 检查执行记录
echo "1. 执行记录详情："
echo "----------------------------------------------------------------------"
PGPASSWORD="WSY232wsy" psql -h aws-1-ap-northeast-1.pooler.supabase.com -p 6543 \
  -U postgres.pognfpblehwkohhoxpnu -d postgres -c "
SELECT
  se.id,
  s.title as scout_title,
  se.status,
  se.started_at,
  se.completed_at,
  EXTRACT(EPOCH FROM (COALESCE(se.completed_at, NOW()) - se.started_at)) as duration_seconds,
  se.error_message,
  se.results_summary IS NOT NULL as has_results
FROM scout_executions se
JOIN scouts s ON se.scout_id = s.id
WHERE se.id = '$EXECUTION_ID';
"
echo ""

# 检查 Scout 配置
echo "2. Scout 配置："
echo "----------------------------------------------------------------------"
PGPASSWORD="WSY232wsy" psql -h aws-1-ap-northeast-1.pooler.supabase.com -p 6543 \
  -U postgres.pognfpblehwkohhoxpnu -d postgres -c "
SELECT
  id,
  title,
  description,
  search_queries,
  frequency,
  created_at
FROM scouts
WHERE id = '$SCOUT_ID';
"
echo ""

# 检查用户的 Firecrawl API key
echo "3. 用户 API Key 配置："
echo "----------------------------------------------------------------------"
PGPASSWORD="WSY232wsy" psql -h aws-1-ap-northeast-1.pooler.supabase.com -p 6543 \
  -U postgres.pognfpblehwkohhoxpnu -d postgres -c "
SELECT
  u.id as user_id,
  u.email,
  fk.id IS NOT NULL as has_firecrawl_key,
  fk.is_valid,
  fk.last_used_at,
  fk.usage_count
FROM scouts s
JOIN auth.users u ON s.user_id = u.id
LEFT JOIN user_firecrawl_keys fk ON u.id = fk.user_id
WHERE s.id = '$SCOUT_ID';
"
echo ""

# 检查最近的成功执行
echo "4. 历史执行记录："
echo "----------------------------------------------------------------------"
PGPASSWORD="WSY232wsy" psql -h aws-1-ap-northeast-1.pooler.supabase.com -p 6543 \
  -U postgres.pognfpblehwkohhoxpnu -d postgres -c "
SELECT
  id,
  status,
  started_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds,
  LEFT(error_message, 100) as error_preview
FROM scout_executions
WHERE scout_id = '$SCOUT_ID'
ORDER BY started_at DESC
LIMIT 5;
"
echo ""

echo "======================================================================"
echo "诊断建议："
echo "======================================================================"
echo ""
echo "问题分析："
echo "- 该执行已超时（超过 Edge Function 的默认 2 分钟限制）"
echo "- 状态已更新为 'failed'"
echo ""
echo "可能的原因："
echo "1. 搜索查询使用了 'site:zbj.com'，Firecrawl 可能不支持 site: 操作符"
echo "2. 目标网站（zbj.com）可能有反爬虫机制或需要登录"
echo "3. Firecrawl API key 可能无效或超出配额"
echo "4. 搜索返回结果为空或超时"
echo ""
echo "建议解决方案："
echo "1. 移除搜索查询中的 'site:' 前缀，使用更通用的关键词"
echo "   例如：'猪八戒 软件开发 任务' 而不是 'site:zbj.com 软件开发 任务'"
echo ""
echo "2. 使用更具体的关键词："
echo "   - '猪八戒网 小程序开发 招标'"
echo "   - '猪八戒平台 APP开发 项目'"
echo "   - 'zbj.com 程序员接单'"
echo ""
echo "3. 查看 Supabase Dashboard 日志："
echo "   https://supabase.com/dashboard/project/pognfpblehwkohhoxpnu/logs/edge-functions?s=scout-cron"
echo ""
echo "4. 如果问题持续，考虑："
echo "   - 检查 Firecrawl API key 是否有效"
echo "   - 降低搜索查询数量（从 5 个减少到 2-3 个）"
echo "   - 使用不同的搜索策略"
echo ""

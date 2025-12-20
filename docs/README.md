# Open Scouts 文档中心

欢迎查阅 Open Scouts 项目文档！

---

## 📚 文档列表

### 1. 项目分析文档
**文件**: `项目分析文档.md`

**内容**:
- 项目概述和用途
- 核心技术架构
- 工作原理详解
- 数据库设计
- 实战案例：AI 新闻追踪完整流程
- 核心技术亮点（语义去重、分布式调度等）
- 关键文件说明

**适合人群**:
- 初次接触项目的开发者
- 想要深入理解架构的技术人员
- 准备二次开发或定制功能的团队

---

### 2. Supabase 配置完整指南
**文件**: `Supabase配置完整指南.md`

**内容**:
- 环境准备
- 创建 Supabase 项目
- 配置数据库连接（IPv6 问题解决方案）
- 启用数据库扩展
- 运行数据库迁移
- 配置定时任务
- 部署 Edge Functions
- 常见问题和解决方案
- 架构设计亮点

**适合人群**:
- 需要从零部署项目的开发者
- 遇到 Supabase 配置问题的用户
- 想要了解完整部署流程的技术人员

**包含的实用内容**:
- ✅ 所有配置步骤的截图说明
- ✅ 遇到的问题和解决方案
- ✅ SQL 脚本和命令行示例
- ✅ 常见错误排查指南

---

## 🚀 快速导航

### 我是新手，想快速了解项目
→ 先阅读 **项目分析文档.md** 的"项目概述"和"实战案例"部分

### 我想部署这个项目
→ 阅读根目录的 **README.md**，然后跟随 **Supabase配置完整指南.md**

### 我遇到了 Supabase 配置问题
→ 查看 **Supabase配置完整指南.md** 的"常见问题"章节

### 我想理解语义去重是如何实现的
→ 阅读 **项目分析文档.md** 的"核心技术亮点"部分

### 我想了解定时调度的工作原理
→ 阅读 **Supabase配置完整指南.md** 的"配置定时任务"和"架构设计亮点"部分

---

## 🗂️ 其他文档

### 项目根目录

| 文档 | 说明 |
|-----|------|
| `README.md` | 项目介绍、快速开始、技术栈 |
| `.env.example` | 环境变量配置模板 |
| `MANUAL_DEPLOY.md` | 手动部署指南（备选方案） |
| `EDGE_FUNCTIONS_DEPLOY.md` | Edge Functions 部署详解 |

### 代码文档

| 位置 | 说明 |
|-----|------|
| `supabase/migrations/` | 数据库迁移脚本（含详细注释） |
| `supabase/functions/scout-cron/` | AI Agent 执行逻辑 |
| `app/api/` | Next.js API 路由 |

---

## 💡 文档使用建议

### 第一次部署
1. 阅读 `README.md` 了解项目
2. 查看 `项目分析文档.md` 理解架构
3. 按照 `Supabase配置完整指南.md` 逐步配置
4. 遇到问题查看"常见问题"章节

### 二次开发
1. 阅读 `项目分析文档.md` 的技术架构部分
2. 查看 `supabase/migrations/00000000000000_schema.sql` 了解数据结构
3. 阅读 `supabase/functions/scout-cron/agent.ts` 理解 AI Agent 逻辑

### 排查问题
1. 查看 `Supabase配置完整指南.md` 的"常见问题"
2. 检查 Supabase Dashboard 中的日志
3. 使用项目提供的测试脚本（如 `test-db-connection.mjs`）

---

## 📞 获取帮助

### 查看日志
- **前端**: 浏览器控制台
- **Edge Functions**: Supabase Dashboard → Edge Functions → Logs
- **定时任务**: SQL 查询 `cron.job_run_details`
- **数据库**: Supabase Dashboard → Database → Logs

### 测试工具
项目提供了多个测试脚本：

```bash
# 测试数据库连接
node test-db-connection.mjs

# 同步 Edge Function 密钥
node sync-secrets.mjs

# 快速部署 Edge Functions
bash deploy-edge-functions-fast.sh
```

---

## 🎯 贡献文档

如果你在使用过程中：
- 发现文档错误或过时信息
- 有更好的解决方案
- 想要补充新的使用案例

欢迎提交 Pull Request 更新文档！

---

**文档版本**: v1.0
**最后更新**: 2025-12-18
**维护者**: Open Scouts Team

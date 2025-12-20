# Supabase 认证配置指南

本文档说明如何配置 Supabase 认证系统，包括邮件验证和 Google OAuth。

---

## 问题：注册时没有收到验证邮件

### 原因分析

Supabase 默认使用内置邮件服务，但有以下限制：

1. **免费项目限制**：
   - 每小时最多发送 4 封邮件
   - 邮件可能被标记为垃圾邮件
   - 发送延迟较大（可能 5-10 分钟）

2. **默认行为**：
   - Email Confirmation 默认启用
   - 用户注册后需要点击邮件链接才能登录
   - 如果没收到邮件，用户无法登录

---

## 解决方案

### 方案一：禁用邮件验证（开发/测试环境）

**优点**：
- ✅ 立即生效，无需等待
- ✅ 无需配置 SMTP
- ✅ 适合快速测试

**缺点**：
- ⚠️ 无法验证邮箱真实性
- ⚠️ 不适合生产环境

#### 配置步骤

1. **访问认证设置**
   ```
   Supabase Dashboard → Authentication → Providers → Email
   ```

2. **禁用邮件确认**
   - 找到 **"Confirm email"** 开关
   - 将其关闭（从绿色变为灰色）
   - 点击 **"Save"**

3. **（可选）禁用双重确认**
   - 找到 **"Secure email change"**
   - 如果启用，也可以关闭

4. **测试注册**
   - 访问 http://localhost:3006
   - 使用任意邮箱注册
   - 应该可以直接登录，无需验证邮件

---

### 方案二：配置自定义 SMTP（生产环境）

**优点**：
- ✅ 可靠的邮件发送
- ✅ 专业的发件人地址
- ✅ 可自定义邮件模板

**缺点**：
- ⏱️ 需要额外配置（15-20 分钟）
- 💰 可能有成本（免费额度通常够用）

#### 推荐 SMTP 服务

| 服务 | 免费额度 | 设置难度 | 推荐度 |
|-----|---------|---------|-------|
| **Resend** | 3000封/月，100封/天 | ⭐ 简单 | ⭐⭐⭐⭐⭐ |
| **SendGrid** | 100封/天 | ⭐⭐ 中等 | ⭐⭐⭐⭐ |
| **Mailgun** | 5000封/月（3个月） | ⭐⭐ 中等 | ⭐⭐⭐ |
| **Gmail SMTP** | 500封/天 | ⭐⭐⭐ 复杂 | ⭐⭐ |

#### 使用 Resend 配置 SMTP

##### 1. 注册 Resend

访问：https://resend.com

- 使用 GitHub 或邮箱注册
- 验证邮箱

##### 2. 获取 API Key

1. 进入 **API Keys** 页面
2. 点击 **"Create API Key"**
3. 输入名称（如：`open-scouts-auth`）
4. 复制生成的 API Key（格式：`re_xxx...`）

##### 3. 配置 Supabase SMTP

1. **访问 Supabase Auth 设置**
   ```
   Project Settings → Auth → SMTP Settings
   ```

2. **启用 Custom SMTP**
   - 打开 **"Enable Custom SMTP"** 开关

3. **填写 SMTP 配置**（Resend）：
   ```
   Sender name: Open Scouts
   Sender email: noreply@yourdomain.com

   Host: smtp.resend.com
   Port number: 465
   Username: resend
   Password: [your-resend-api-key]  # 粘贴 re_xxx...
   ```

   **重要**：
   - 免费版 Resend 只能发送到你的注册邮箱
   - 要发送到任意邮箱，需要验证自定义域名

4. **保存设置**
   - 点击 **"Save"**

##### 4. 验证自定义域名（可选，用于发送到任意邮箱）

1. **在 Resend Dashboard 添加域名**
   - 进入 **Domains** 页面
   - 点击 **"Add Domain"**
   - 输入你的域名（如：`yourdomain.com`）

2. **配置 DNS 记录**

   Resend 会提供 DNS 记录，添加到你的域名 DNS 设置中：

   ```
   类型: TXT
   名称: _resend
   值: [resend-verification-code]

   类型: MX
   名称: @
   值: mx1.resend.com (优先级 10)
   ```

3. **等待验证**（通常 5-15 分钟）

4. **更新发件人邮箱**
   - 回到 Supabase SMTP 设置
   - 修改 **Sender email** 为：`noreply@yourdomain.com`
   - 保存

##### 5. 测试邮件发送

1. 访问应用：http://localhost:3006
2. 注册新账号
3. 检查邮箱（包括垃圾箱）
4. 点击验证链接

---

### 方案三：配置 Google OAuth（推荐）

**优点**：
- ✅ 无需配置邮件
- ✅ 用户体验好（一键登录）
- ✅ 自动验证邮箱
- ✅ 更安全（OAuth 2.0）

**缺点**：
- 需要 Google Cloud Console 配置（10 分钟）

#### 配置步骤

##### 1. 创建 Google OAuth 凭证

1. **访问 Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **创建项目**（如果还没有）
   - 点击顶部项目下拉框
   - 选择 **"New Project"**
   - 输入项目名称（如：`open-scouts`）
   - 点击 **"Create"**

3. **启用 OAuth Consent Screen**
   - 导航到 **APIs & Services** → **OAuth consent screen**
   - 选择 **User type**: External
   - 点击 **"Create"**

   填写表单：
   ```
   App name: Open Scouts
   User support email: your-email@gmail.com
   Developer contact: your-email@gmail.com
   ```

   - 点击 **"Save and Continue"**
   - Scopes 页面直接点击 **"Save and Continue"**
   - Test users 页面可添加测试用户（可选）
   - 点击 **"Save and Continue"**

4. **创建 OAuth 2.0 Client ID**
   - 导航到 **APIs & Services** → **Credentials**
   - 点击 **"Create Credentials"** → **"OAuth client ID"**

   配置：
   ```
   Application type: Web application
   Name: Open Scouts Web Client

   Authorized JavaScript origins:
   - http://localhost:3000
   - http://localhost:3006
   - https://yourdomain.com (生产环境)

   Authorized redirect URIs:
   - https://pognfpblehwkohhoxpnu.supabase.co/auth/v1/callback
   ```

   - 点击 **"Create"**

5. **复制凭证**
   - 保存显示的 **Client ID** 和 **Client Secret**

##### 2. 在 Supabase 配置 Google Provider

1. **访问认证提供商设置**
   ```
   Supabase Dashboard → Authentication → Providers
   ```

2. **找到 Google 提供商**
   - 点击 **Google** 卡片

3. **启用并配置**
   ```
   Enable Sign in with Google: ON (绿色)

   Client ID (for OAuth): [粘贴 Google Client ID]
   Client Secret (for OAuth): [粘贴 Google Client Secret]
   ```

4. **保存设置**
   - 点击 **"Save"**

##### 3. 验证配置

1. 访问应用：http://localhost:3006
2. 应该看到 **"Sign in with Google"** 按钮
3. 点击按钮测试登录流程

---

## 邮件模板自定义（可选）

### 访问邮件模板

```
Supabase Dashboard → Authentication → Email Templates
```

### 可自定义的模板

| 模板 | 用途 | 触发时机 |
|-----|------|---------|
| **Confirm signup** | 注册验证邮件 | 用户首次注册 |
| **Magic Link** | 魔法链接登录 | 用户请求无密码登录 |
| **Change Email Address** | 邮箱变更确认 | 用户修改邮箱 |
| **Reset Password** | 密码重置 | 用户忘记密码 |

### 模板变量

邮件模板支持以下变量：

```
{{ .ConfirmationURL }}  - 确认链接
{{ .Token }}            - 验证 token
{{ .Email }}            - 用户邮箱
{{ .SiteURL }}          - 网站 URL
{{ .TokenHash }}        - Token 哈希值
```

### 自定义示例

**Confirm signup 模板**：

```html
<h2>欢迎加入 Open Scouts！</h2>

<p>感谢注册 Open Scouts。点击下面的按钮验证你的邮箱：</p>

<a href="{{ .ConfirmationURL }}"
   style="display: inline-block; padding: 12px 24px;
          background-color: #3b82f6; color: white;
          text-decoration: none; border-radius: 6px;">
  验证邮箱
</a>

<p>或复制以下链接到浏览器：</p>
<p>{{ .ConfirmationURL }}</p>

<p>如果你没有注册 Open Scouts，请忽略此邮件。</p>

<hr>
<small>此邮件由 Open Scouts 自动发送</small>
```

---

## 常见问题

### Q1: 注册后立即显示 "Email not confirmed"

**原因**：邮件确认已启用，但用户未收到邮件

**解决**：
- 方案 A：禁用邮件确认（方案一）
- 方案 B：配置 SMTP（方案二）
- 方案 C：使用 Google OAuth（方案三）

---

### Q2: 配置 SMTP 后仍然收不到邮件

**排查步骤**：

1. **检查 SMTP 配置**
   - 确认 Host、Port、Username、Password 正确
   - 尝试 Test Connection（如果 Dashboard 支持）

2. **检查垃圾箱**
   - 初次发送的邮件经常被标记为垃圾邮件

3. **查看 Supabase 日志**
   ```
   Supabase Dashboard → Logs → Auth Logs
   ```
   查找邮件发送错误

4. **验证 SMTP 服务**
   - 登录 SMTP 服务商 Dashboard（如 Resend）
   - 查看邮件发送日志

---

### Q3: Google OAuth 配置后点击登录没反应

**排查步骤**：

1. **检查重定向 URI**
   - 必须完全匹配：`https://[project-ref].supabase.co/auth/v1/callback`
   - 注意：没有尾部斜杠

2. **检查浏览器控制台**
   - 查看是否有 CORS 错误
   - 查看是否有网络请求失败

3. **验证 OAuth Consent Screen**
   - 确保已完成配置
   - 如果是 Testing 状态，确保测试用户已添加

---

### Q4: Resend 免费版无法发送到测试邮箱

**原因**：Resend 免费版只能发送到注册账号的邮箱

**解决**：
1. 使用 Resend 注册邮箱进行测试
2. 或验证自定义域名（参考上文）
3. 或使用其他 SMTP 服务（如 SendGrid）

---

## 推荐配置组合

### 开发环境
```
✅ Email Provider: 启用，但禁用 Confirm email
✅ Google OAuth: 启用（可选）
```

**优点**：快速测试，无需配置 SMTP

### 生产环境
```
✅ Email Provider: 启用 + 自定义 SMTP (Resend)
✅ Google OAuth: 启用（推荐）
✅ Email Confirmation: 启用
```

**优点**：完整功能 + 最佳用户体验

---

## 验证配置

### 测试邮件注册

1. 访问 http://localhost:3006
2. 点击 "Sign up"
3. 输入邮箱和密码
4. 提交注册

**预期结果**（禁用邮件确认）：
- ✅ 立即跳转到应用主页
- ✅ 可以正常使用

**预期结果**（启用邮件确认 + SMTP）：
- ✅ 显示 "Check your email"
- ✅ 收到验证邮件（1-2 分钟内）
- ✅ 点击链接后可以登录

### 测试 Google OAuth

1. 访问 http://localhost:3006
2. 点击 "Sign in with Google"
3. 选择 Google 账号
4. 授权应用

**预期结果**：
- ✅ 自动登录
- ✅ 跳转到应用主页
- ✅ 用户信息显示正确

---

## 总结

| 配置方式 | 难度 | 时间 | 适用场景 |
|---------|------|------|---------|
| 禁用邮件验证 | ⭐ | 2分钟 | 开发/测试 |
| 配置 SMTP | ⭐⭐ | 15分钟 | 需要邮件功能 |
| Google OAuth | ⭐⭐ | 10分钟 | 生产环境（推荐） |

**最佳实践**：
- 开发：禁用邮件验证
- 生产：Google OAuth + SMTP（Resend）

---

**文档版本**: v1.0
**最后更新**: 2025-12-18
**相关文档**: `Supabase配置完整指南.md`

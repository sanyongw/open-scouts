# LLM 推理服务测试

## 快速测试

运行以下命令测试模型推理服务是否正常：

```bash
node test-llm.js
```

## 测试说明

这个脚本会：
1. 检查环境变量配置（API Key、Base URL、Model）
2. 向 LLM API 发送一个简单的测试请求
3. 验证响应是否正常
4. 显示响应内容和 token 使用情况

## 环境变量

测试需要在 `.env` 文件中配置以下变量：

```bash
# 必需
OPENAI_API_KEY=your-api-key-here

# 可选（有默认值）
OPENAI_BASE_URL=https://api.openai.com/v1  # 默认 OpenAI API
OPENAI_MODEL=gpt-4o-mini                    # 默认模型
```

## 成功示例

```
🧪 测试 LLM 推理服务

配置信息:
  - Base URL: https://api.openai.com/v1
  - Model: gpt-4o-mini
  - API Key: 已设置 ✓

📡 发送测试请求...
✅ API 响应成功

响应内容:
  - ID: chatcmpl-xxx
  - Model: gpt-4o-mini
  - Message: 测试成功
  - Tokens: 25

✅ 模型推理服务正常运行!
```

## 常见错误

### 401 Unauthorized
API Key 不正确或已过期，请检查 `.env` 文件中的 `OPENAI_API_KEY`

### Connection refused
- Base URL 不正确
- 或网络连接问题

### Model not found
配置的模型在当前 API 提供商不可用，请更改 `OPENAI_MODEL`

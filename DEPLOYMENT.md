# 生产环境部署指南

本文档介绍如何使用 Docker 将 Open Scouts 部署到生产环境。

## 目录

- [前提条件](#前提条件)
- [快速部署](#快速部署)
- [详细步骤](#详细步骤)
- [环境配置](#环境配置)
- [容器管理](#容器管理)
- [监控与维护](#监控与维护)
- [故障排查](#故障排查)
- [高级配置](#高级配置)

## 前提条件

### 系统要求

- **Docker Engine**: 20.10+
- **Docker Compose**: v2.0+
- **操作系统**: Linux (推荐 Ubuntu 20.04+)
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 10GB 可用空间

### 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

### 必需的服务

在部署前，确保已设置以下服务：

1. **Supabase 项目** - [https://supabase.com](https://supabase.com)
   - 启用 `vector`, `pg_cron`, `pg_net` 扩展
   - 运行数据库设置脚本

2. **OpenAI API** - [https://platform.openai.com](https://platform.openai.com)
   - 获取 API 密钥

3. **Firecrawl API** - [https://firecrawl.dev](https://firecrawl.dev)
   - 获取 API 密钥

4. **Resend (可选)** - [https://resend.com](https://resend.com)
   - 用于邮件通知

## 快速部署

### 1. 克隆代码

```bash
git clone https://github.com/firecrawl/open-scouts.git
cd open-scouts
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（填入你的实际值）
nano .env
```

必需配置项：
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
FIRECRAWL_API_KEY=fc-...
```

### 3. 运行部署脚本

```bash
# 使用一键部署脚本
./scripts/docker-deploy.sh
```

或手动部署：

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f
```

### 4. 验证部署

访问 http://your-server-ip:3000 查看应用是否正常运行。

```bash
# 检查容器状态
docker compose ps

# 检查健康状态
curl http://localhost:3000/api/health
```

## 详细步骤

### 数据库设置

首次部署前，需要设置数据库：

```bash
# 1. 登录 Supabase CLI
npx supabase login

# 2. 链接项目
npx supabase link --project-ref your-project-ref

# 3. 运行数据库设置脚本
npm run setup:db

# 4. 部署 Edge Functions
npx supabase functions deploy scout-cron
npx supabase functions deploy send-test-email
```

### Docker 镜像构建

```bash
# 构建镜像
docker compose build

# 查看镜像大小
docker images | grep open-scouts
```

构建过程说明：
- **Stage 1**: 安装依赖并构建 Next.js 应用
- **Stage 2**: 创建最小化运行时镜像（~200MB）
- 包含健康检查、非 root 用户等安全措施

### 容器启动

```bash
# 启动容器（后台运行）
docker compose up -d

# 启动容器（前台，查看日志）
docker compose up

# 重启容器
docker compose restart
```

## 环境配置

### 环境变量说明

#### Supabase 配置

```env
# Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co

# 公开密钥（客户端使用）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# 服务角色密钥（服务端使用，保密！）
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# 数据库连接字符串
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Supabase 访问令牌（用于 CLI）
SUPABASE_ACCESS_TOKEN=sbp_...
```

#### OpenAI 配置

```env
# OpenAI API 密钥
OPENAI_API_KEY=sk-proj-...

# 可选：自定义 API 端点（用于代理）
OPENAI_BASE_URL=https://api.openai.com/v1

# 可选：指定模型
OPENAI_MODEL=gpt-4o-mini
```

#### Firecrawl 配置

```env
# Firecrawl API 密钥
FIRECRAWL_API_KEY=fc-...
```

#### 邮件通知配置（可选）

```env
# Resend API 密钥
RESEND_API_KEY=re_...

# 发件人邮箱（需要验证域名）
RESEND_FROM_EMAIL="Open Scouts <scouts@yourdomain.com>"
```

#### 站点配置

```env
# 生产环境网站 URL
NEXT_PUBLIC_SITE_URL=https://scouts.yourdomain.com
```

### .env 文件安全

⚠️ **重要**：`.env` 文件包含敏感信息

```bash
# 确保 .env 在 .gitignore 中
echo ".env" >> .gitignore

# 设置正确的文件权限
chmod 600 .env
```

## 容器管理

### 基本操作

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 重启
docker compose restart

# 查看状态
docker compose ps

# 查看日志（最后 100 行）
docker compose logs --tail=100 app

# 实时查看日志
docker compose logs -f app

# 进入容器
docker compose exec app sh
```

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
docker compose down
docker compose up -d --build

# 或使用无停机更新
docker compose up -d --no-deps --build app
```

### 数据备份

虽然应用本身是无状态的，但建议定期备份：

```bash
# 备份 .env 文件
cp .env .env.backup

# 导出容器配置
docker compose config > docker-compose.backup.yml
```

数据库备份通过 Supabase 控制台进行。

## 监控与维护

### 健康检查

应用内置健康检查端点：

```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 查看 Docker 健康状态
docker inspect open-scouts --format='{{.State.Health.Status}}'
```

健康检查配置：
- 间隔：30 秒
- 超时：5 秒
- 启动期：60 秒
- 重试次数：3 次

### 日志管理

日志配置（在 docker-compose.yml 中）：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

查看日志：

```bash
# 查看所有日志
docker compose logs app

# 查看最近的日志
docker compose logs --tail=50 app

# 实时跟踪日志
docker compose logs -f app

# 按时间过滤
docker compose logs --since=1h app
```

### 资源监控

```bash
# 查看资源使用
docker stats open-scouts

# 持续监控
docker stats --no-stream

# 查看详细信息
docker inspect open-scouts
```

### 资源限制

在 `docker-compose.yml` 中配置：

```yaml
deploy:
  resources:
    limits:
      cpus: '2'        # 调整 CPU 限制
      memory: 2G       # 调整内存限制
    reservations:
      cpus: '0.5'
      memory: 512M
```

## 故障排查

### 常见问题

#### 1. 容器无法启动

```bash
# 查看详细错误
docker compose logs app

# 检查端口占用
sudo lsof -i :3000

# 重新构建
docker compose build --no-cache
docker compose up -d
```

#### 2. 健康检查失败

```bash
# 检查应用是否响应
curl http://localhost:3000/api/health

# 手动测试健康检查脚本
docker compose exec app /healthcheck.sh

# 查看健康检查日志
docker inspect open-scouts --format='{{json .State.Health}}' | jq
```

#### 3. 环境变量未加载

```bash
# 验证环境变量
docker compose exec app env | grep NEXT_PUBLIC

# 检查 .env 文件
cat .env

# 重新构建（确保 NEXT_PUBLIC_* 变量在构建时传入）
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### 4. 内存不足

```bash
# 增加内存限制
# 编辑 docker-compose.yml
memory: 2G  # 从 1G 增加到 2G

# 重启容器
docker compose up -d
```

#### 5. 数据库连接失败

```bash
# 测试数据库连接
docker compose exec app node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Database connection test...');
"

# 检查 DATABASE_URL 格式
echo $DATABASE_URL
```

### 调试技巧

```bash
# 进入容器调试
docker compose exec app sh

# 查看 Next.js 构建输出
docker compose logs app | grep "Route (app)"

# 检查文件权限
docker compose exec app ls -la /app

# 查看网络配置
docker network inspect open-scouts-network

# 检查磁盘空间
df -h
docker system df
```

### 清理和重置

```bash
# 完全清理并重新开始
docker compose down -v
docker system prune -a
docker compose up -d --build

# 清理未使用的镜像
docker image prune -a

# 清理未使用的卷
docker volume prune
```

## 高级配置

### 使用自定义端口

编辑 `docker-compose.yml`：

```yaml
ports:
  - "8080:3000"  # 将应用暴露在 8080 端口
```

### 反向代理配置

#### Nginx

创建 `/etc/nginx/sites-available/open-scouts`:

```nginx
server {
    listen 80;
    server_name scouts.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/open-scouts /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL/HTTPS (Let's Encrypt)

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d scouts.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

#### Traefik

在 `docker-compose.yml` 中添加 labels：

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.scouts.rule=Host(`scouts.yourdomain.com`)"
  - "traefik.http.routers.scouts.entrypoints=websecure"
  - "traefik.http.routers.scouts.tls.certresolver=letsencrypt"
  - "traefik.http.services.scouts.loadbalancer.server.port=3000"
```

### 多容器部署

```yaml
# docker-compose.yml
services:
  app:
    # ... 现有配置 ...
    deploy:
      replicas: 3  # 运行 3 个实例

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app
```

### 环境变量管理

对于生产环境，建议使用密钥管理：

#### Docker Secrets

```yaml
services:
  app:
    secrets:
      - supabase_key
      - openai_key

secrets:
  supabase_key:
    file: ./secrets/supabase_key.txt
  openai_key:
    file: ./secrets/openai_key.txt
```

#### 外部密钥管理

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Cloud Secret Manager**

### 自动化部署

#### GitHub Actions

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/open-scouts
            git pull origin main
            docker compose down
            docker compose up -d --build
```

#### Watchtower (自动更新)

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 3600 open-scouts
```

### 性能优化

#### 1. 启用 Gzip

在 Next.js 中已启用，通过反向代理进一步优化。

#### 2. 缓存配置

```nginx
# Nginx 缓存静态资源
location /_next/static {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 1y;
    add_header Cache-Control "public, immutable";
}
```

#### 3. CDN 集成

将静态资源上传到 CDN（如 Cloudflare、AWS CloudFront）。

### 安全加固

#### 1. 防火墙配置

```bash
# UFW 配置
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

#### 2. 限制容器权限

```yaml
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp
```

#### 3. 定期更新

```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 更新 Docker 镜像
docker compose pull
docker compose up -d
```

## 生产环境检查清单

部署前检查：

- [ ] 所有环境变量已正确配置
- [ ] 数据库已设置并运行迁移
- [ ] Edge Functions 已部署
- [ ] 域名 DNS 已配置
- [ ] SSL 证书已安装
- [ ] 防火墙规则已设置
- [ ] 备份策略已实施
- [ ] 监控和日志已配置
- [ ] 健康检查正常
- [ ] 负载测试已完成

部署后验证：

- [ ] 应用可通过域名访问
- [ ] HTTPS 正常工作
- [ ] 健康检查通过
- [ ] 用户注册/登录功能正常
- [ ] Scout 创建和执行正常
- [ ] 邮件通知正常（如配置）
- [ ] 日志正常记录
- [ ] 性能满足要求

## 支持与资源

- **项目仓库**: [https://github.com/firecrawl/open-scouts](https://github.com/firecrawl/open-scouts)
- **问题反馈**: [GitHub Issues](https://github.com/firecrawl/open-scouts/issues)
- **文档**: [README.md](./README.md)

---

**需要帮助？** 在 GitHub 上提交 Issue 或查看现有讨论。

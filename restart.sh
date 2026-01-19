#!/bin/bash

# Open Scouts 重启脚本
# 用途：重启 Next.js 开发服务器

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "  Open Scouts - 重启服务"
echo "=========================================="
echo ""

# 停止服务
echo "第 1 步：停止现有服务"
echo "------------------------------------------"
"$PROJECT_DIR/stop.sh"

echo ""
echo "第 2 步：启动新服务"
echo "------------------------------------------"
"$PROJECT_DIR/start.sh"

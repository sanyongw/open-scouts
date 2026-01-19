#!/bin/bash

# Open Scouts 启动脚本
# 用途：启动 Next.js 开发服务器

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$PROJECT_DIR/logs/next-dev.log"
PID_FILE="$PROJECT_DIR/logs/next-dev.pid"

# 创建日志目录
mkdir -p "$PROJECT_DIR/logs"

echo "=========================================="
echo "  Open Scouts - 启动服务"
echo "=========================================="
echo ""

# 检查是否已经在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  服务已经在运行中 (PID: $OLD_PID)"
        echo ""
        echo "如需重启，请先运行: ./stop.sh"
        exit 1
    else
        echo "🧹 清理过期的 PID 文件..."
        rm -f "$PID_FILE"
    fi
fi

# 检查端口占用
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "⚠️  端口 3000 已被占用"
    echo ""
    echo "占用进程信息："
    netstat -tlnp 2>/dev/null | grep ":3000 "
    echo ""
    echo "请先停止占用端口的进程，或运行: ./stop.sh"
    exit 1
fi

# 检查 .env 文件
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "❌ 错误: .env 文件不存在"
    echo ""
    echo "请先创建 .env 文件并配置必要的环境变量"
    exit 1
fi

# 检查 node_modules
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo "⚠️  node_modules 不存在，正在安装依赖..."
    npm install
    echo ""
fi

# 启动服务
echo "🚀 正在启动 Next.js 开发服务器..."
echo ""

cd "$PROJECT_DIR"
nohup npm run dev > "$LOG_FILE" 2>&1 &
SERVICE_PID=$!

# 保存 PID
echo "$SERVICE_PID" > "$PID_FILE"

# 等待服务启动
echo "⏳ 等待服务就绪..."
sleep 5

# 验证服务状态
if ps -p "$SERVICE_PID" > /dev/null 2>&1; then
    echo "✅ 服务启动成功！"
    echo ""
    echo "📊 服务信息:"
    echo "  - 进程 ID: $SERVICE_PID"
    echo "  - 本地访问: http://localhost:3000"
    echo "  - 网络访问: http://$(hostname -I | awk '{print $1}'):3000"
    echo "  - 日志文件: $LOG_FILE"
    echo ""
    echo "📝 查看实时日志: tail -f $LOG_FILE"
    echo "🛑 停止服务: ./stop.sh"
    echo ""

    # 显示最近的日志
    echo "=========================================="
    echo "  最近日志 (最后 15 行)"
    echo "=========================================="
    tail -15 "$LOG_FILE"
else
    echo "❌ 服务启动失败"
    echo ""
    echo "错误日志："
    tail -20 "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
fi

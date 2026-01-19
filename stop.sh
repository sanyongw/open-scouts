#!/bin/bash

# Open Scouts 停止脚本
# 用途：停止 Next.js 开发服务器

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_DIR/logs/next-dev.pid"

echo "=========================================="
echo "  Open Scouts - 停止服务"
echo "=========================================="
echo ""

# 检查 PID 文件
if [ -f "$PID_FILE" ]; then
    SERVICE_PID=$(cat "$PID_FILE")

    # 检查进程是否存在
    if ps -p "$SERVICE_PID" > /dev/null 2>&1; then
        echo "🛑 正在停止服务 (PID: $SERVICE_PID)..."

        # 优雅停止
        kill "$SERVICE_PID"

        # 等待进程结束
        for i in {1..10}; do
            if ! ps -p "$SERVICE_PID" > /dev/null 2>&1; then
                echo "✅ 服务已停止"
                rm -f "$PID_FILE"
                break
            fi
            echo "⏳ 等待进程结束... ($i/10)"
            sleep 1
        done

        # 如果还没停止，强制停止
        if ps -p "$SERVICE_PID" > /dev/null 2>&1; then
            echo "⚠️  进程未响应，强制停止..."
            kill -9 "$SERVICE_PID"
            sleep 1

            if ps -p "$SERVICE_PID" > /dev/null 2>&1; then
                echo "❌ 无法停止进程 $SERVICE_PID"
                exit 1
            else
                echo "✅ 服务已强制停止"
                rm -f "$PID_FILE"
            fi
        fi
    else
        echo "⚠️  PID 文件存在，但进程不存在 (PID: $SERVICE_PID)"
        echo "🧹 清理 PID 文件..."
        rm -f "$PID_FILE"
    fi
else
    echo "⚠️  未找到 PID 文件，尝试查找 Next.js 进程..."
fi

# 查找并清理所有相关进程
echo ""
echo "🔍 检查残留进程..."

# 停止 next dev 进程
NEXT_DEV_PIDS=$(pgrep -f "next dev" || true)
if [ -n "$NEXT_DEV_PIDS" ]; then
    echo "发现 next dev 进程: $NEXT_DEV_PIDS"
    echo "$NEXT_DEV_PIDS" | xargs kill 2>/dev/null || true
    sleep 1
fi

# 停止 next-server 进程
NEXT_SERVER_PIDS=$(pgrep -f "next-server" || true)
if [ -n "$NEXT_SERVER_PIDS" ]; then
    echo "发现 next-server 进程: $NEXT_SERVER_PIDS"
    echo "$NEXT_SERVER_PIDS" | xargs kill 2>/dev/null || true
    sleep 1
fi

# 检查端口 3000
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo ""
    echo "⚠️  端口 3000 仍被占用："
    netstat -tlnp 2>/dev/null | grep ":3000 "
    echo ""
    PORT_PID=$(netstat -tlnp 2>/dev/null | grep ":3000 " | awk '{print $7}' | cut -d'/' -f1)
    if [ -n "$PORT_PID" ]; then
        echo "是否强制停止占用端口的进程 (PID: $PORT_PID)? [y/N]"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            kill -9 "$PORT_PID"
            echo "✅ 进程已停止"
        fi
    fi
else
    echo "✅ 端口 3000 已释放"
fi

# 最终检查
echo ""
REMAINING_PROCS=$(pgrep -f "next" || true)
if [ -z "$REMAINING_PROCS" ]; then
    echo "=========================================="
    echo "  ✅ 所有服务已完全停止"
    echo "=========================================="
else
    echo "⚠️  仍有以下 Next.js 相关进程运行："
    ps aux | grep -E "next" | grep -v grep
fi

echo ""

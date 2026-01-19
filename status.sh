#!/bin/bash

# Open Scouts 状态检查脚本
# 用途：检查服务运行状态

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_DIR/logs/next-dev.pid"
LOG_FILE="$PROJECT_DIR/logs/next-dev.log"

echo "=========================================="
echo "  Open Scouts - 服务状态"
echo "=========================================="
echo ""

# 检查 PID 文件
if [ -f "$PID_FILE" ]; then
    SERVICE_PID=$(cat "$PID_FILE")
    echo "📋 PID 文件: $PID_FILE"
    echo "   进程 ID: $SERVICE_PID"
    echo ""

    if ps -p "$SERVICE_PID" > /dev/null 2>&1; then
        echo "✅ 服务状态: 运行中"
        echo ""
        echo "📊 进程信息:"
        ps -p "$SERVICE_PID" -o pid,ppid,user,%cpu,%mem,etime,cmd --no-headers
    else
        echo "❌ 服务状态: 已停止 (PID 文件存在但进程不存在)"
        echo ""
        echo "💡 提示: 运行 ./start.sh 启动服务"
    fi
else
    echo "❌ 服务状态: 未运行 (未找到 PID 文件)"
    echo ""
    echo "💡 提示: 运行 ./start.sh 启动服务"
fi

echo ""
echo "=========================================="
echo "  相关进程"
echo "=========================================="

# 查找所有 Next.js 相关进程
NEXT_PROCS=$(ps aux | grep -E "next dev|next-server" | grep -v grep || true)
if [ -n "$NEXT_PROCS" ]; then
    echo "$NEXT_PROCS"
else
    echo "未找到 Next.js 相关进程"
fi

echo ""
echo "=========================================="
echo "  端口占用"
echo "=========================================="

# 检查端口 3000
PORT_INFO=$(netstat -tlnp 2>/dev/null | grep ":3000 " || true)
if [ -n "$PORT_INFO" ]; then
    echo "✅ 端口 3000: 已监听"
    echo "$PORT_INFO"
else
    echo "❌ 端口 3000: 未监听"
fi

echo ""
echo "=========================================="
echo "  HTTP 连接测试"
echo "=========================================="

# 测试 HTTP 连接
HTTP_STATUS=$(curl -s -w "%{http_code}" -m 3 http://localhost:3000 -o /dev/null 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ HTTP 响应: 正常 (状态码: $HTTP_STATUS)"

    # 测试响应时间
    RESPONSE_TIME=$(curl -s -w "%{time_total}" -m 5 http://localhost:3000 -o /dev/null 2>/dev/null || echo "timeout")
    echo "⏱️  响应时间: ${RESPONSE_TIME}s"
else
    echo "❌ HTTP 响应: 异常 (状态码: $HTTP_STATUS)"
fi

echo ""
echo "=========================================="
echo "  数据库连接"
echo "=========================================="

# 检查数据库连接
if [ -f "$PROJECT_DIR/.env" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" "$PROJECT_DIR/.env" | cut -d'=' -f2-)
    if [ -n "$DATABASE_URL" ]; then
        DB_STATUS=$(psql "$DATABASE_URL" -c "SELECT 'connected' as status;" 2>&1 || echo "failed")
        if echo "$DB_STATUS" | grep -q "connected"; then
            echo "✅ 数据库: 已连接"
        else
            echo "❌ 数据库: 连接失败"
        fi
    else
        echo "⚠️  数据库: 未配置 DATABASE_URL"
    fi
else
    echo "⚠️  .env 文件不存在"
fi

echo ""
echo "=========================================="
echo "  访问地址"
echo "=========================================="
echo "  本地: http://localhost:3000"
echo "  网络: http://$(hostname -I | awk '{print $1}'):3000"

# 显示最近日志
if [ -f "$LOG_FILE" ]; then
    echo ""
    echo "=========================================="
    echo "  最近日志 (最后 10 行)"
    echo "=========================================="
    tail -10 "$LOG_FILE"
fi

echo ""
echo "=========================================="
echo "  管理命令"
echo "=========================================="
echo "  启动: ./start.sh"
echo "  停止: ./stop.sh"
echo "  重启: ./restart.sh"
echo "  状态: ./status.sh"
echo "  日志: tail -f $LOG_FILE"
echo ""

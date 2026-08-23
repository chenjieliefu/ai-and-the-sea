#!/bin/zsh

# AI与海 macOS 一键启动器
# 双击本文件后，会自动检查环境、安装依赖、构建项目并打开游戏。

set -u
setopt pipefail

cd -- "$(dirname -- "$0")" || exit 1
PROJECT_DIR="$(pwd -P)"

# Finder 双击启动时 PATH 往往比终端短，补入常见的 Node.js 安装位置。
export PATH="$PROJECT_DIR/node_modules/.bin:$HOME/.local/bin:$HOME/.volta/bin:$HOME/.asdf/shims:$HOME/.local/share/mise/shims:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SERVER_PID=""

pause_before_close() {
  if [[ -t 0 ]]; then
    echo
    read -r "?按回车键关闭窗口..."
  fi
}

fail() {
  echo
  echo "❌ $1" >&2
  pause_before_close
  exit 1
}

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo
    echo "🛑 正在停止 AI与海..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

clear
echo "🌊 AI与海 一键启动"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 项目位置：$PROJECT_DIR"
echo

if ! command -v node >/dev/null 2>&1; then
  fail "未找到 Node.js。请先安装 Node.js 24 或更高版本：https://nodejs.org/"
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "未找到 npm。请重新安装完整的 Node.js 24 或更高版本。"
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null)"
if [[ "$NODE_MAJOR" != <-> ]] || (( NODE_MAJOR < 24 )); then
  fail "Node.js 版本过低（当前 $(node --version 2>/dev/null)），本项目需要 Node.js 24 或更高版本。"
fi

echo "✅ 运行环境：Node.js $(node --version) / npm $(npm --version)"

NEED_INSTALL=0
if [[ ! -x "$PROJECT_DIR/node_modules/.bin/tsc" ]] || \
   [[ ! -x "$PROJECT_DIR/node_modules/.bin/vite" ]] || \
   [[ ! -f "$PROJECT_DIR/node_modules/.package-lock.json" ]] || \
   [[ "$PROJECT_DIR/package-lock.json" -nt "$PROJECT_DIR/node_modules/.package-lock.json" ]]; then
  NEED_INSTALL=1
fi

if (( NEED_INSTALL )); then
  echo
  echo "📦 首次启动或依赖已更新，正在安装依赖..."
  npm install --no-audit --no-fund || fail "依赖安装失败，请检查网络后重试。"
else
  echo "✅ 项目依赖已就绪"
fi

echo
echo "🔨 正在构建最新版本..."
npm run build || fail "项目构建失败，请根据上方信息检查代码。"
echo "✅ 项目构建完成"

# 从 3001 开始寻找可用端口，不会强制关闭用户已有的程序。
APP_PORT="${AIYU_PORT:-3001}"
PORT_LIMIT=$(( APP_PORT + 20 ))
while (( APP_PORT <= PORT_LIMIT )); do
  if ! /usr/sbin/lsof -nP -iTCP:"$APP_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  APP_PORT=$(( APP_PORT + 1 ))
done

if (( APP_PORT > PORT_LIMIT )); then
  fail "3001 起的 21 个端口均已被占用，无法启动。"
fi

APP_URL="http://127.0.0.1:$APP_PORT"
export PORT="$APP_PORT"
export HOST="127.0.0.1"
export DB_PATH="$PROJECT_DIR/packages/backend/data.db"
export FRONTEND_DIST="$PROJECT_DIR/packages/frontend/dist"
export FRONTEND_ORIGIN="$APP_URL"
export BACKEND_ORIGIN="$APP_URL"

echo
echo "🚀 正在启动服务：$APP_URL"
node "$PROJECT_DIR/packages/backend/dist/index.js" &
SERVER_PID=$!

READY=0
for ATTEMPT in {1..120}; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    wait "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
    fail "服务未能正常启动，请查看上方日志。"
  fi

  if /usr/bin/curl -fsS "$APP_URL/config" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done

if (( ! READY )); then
  fail "服务启动超时，请查看上方日志。"
fi

echo "✅ AI与海已启动"
echo "🎮 游戏地址：$APP_URL"
echo "💡 保持此窗口打开；按 Control+C 可停止服务。"

if [[ "${AIYU_SKIP_BROWSER:-0}" != "1" ]]; then
  /usr/bin/open "$APP_URL" >/dev/null 2>&1 || true
fi

wait "$SERVER_PID"
SERVER_STATUS=$?
SERVER_PID=""

if (( SERVER_STATUS != 0 )); then
  fail "服务意外退出（错误码 $SERVER_STATUS）。"
fi

echo
echo "服务已停止。"

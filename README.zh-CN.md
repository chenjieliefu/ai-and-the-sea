# AI与海

[English](README.md) | **简体中文**

当前版本：**2.0.0**

AI与海是一款以玩家编程为核心的回合制海洋养鱼游戏。玩家编写 TypeScript 策略控制渔船，在有限地图和回合中投放鱼苗、喂养、捕捞并组织自己的海洋经营策略。

## 核心玩法

### 单人养鱼

- 从 1 艘渔船和固定地图开始，通过编程在 500 个回合内尽可能提高收益。
- 水域、位置、鱼种、饲料和航线都会影响策略。
- 程序在浏览器中本地运行，提交排行榜时由后端安全复算。

### 多人竞技

- 双方各自从 2 艘渔船和对称地图开始。
- 可以经营自己的水域，也可以进入对方水域捞鱼、投放鱼苗或进行拦截。
- 14×7 竞技地图会为 P2 镜像，双方都以“自己半场在左”的坐标系编程。
- 服务器推演每个回合，并通过 WebSocket 实时推送比赛状态。

## 技术特点

- 玩家代码经 `esbuild-wasm` 编译为统一 IIFE 产物。
- 前端 Web Worker 与后端 `worker_threads + vm` 使用同一执行实现。
- 水域、鱼类和操作均使用注册表扩展，引擎不需要硬编码分支。
- 随机种子保存在回放文件中，可确定性重现每场游戏。
- 未配置 GitHub OAuth 时自动使用 `local-dev` 身份。

## 环境要求

- Node.js 24 或更高版本。
- npm 10 或更高版本。

## 一键启动（macOS）

双击仓库根目录的：

```text
一键启动.command
```

启动器会自动检查环境、安装缺失依赖、构建最新版本、选择可用端口并打开浏览器。保持终端窗口打开；按 `Control+C` 停止服务。

## 从源码运行

```bash
npm install
```

分别在三个终端中运行：

```bash
npm run dev:shared
npm run dev:backend
npm run dev:frontend
```

打开 [http://localhost:5173](http://localhost:5173)。

## 构建与打包

```bash
npm run build
npm run package
```

Docker：

```bash
docker build -t aiyu:2.0.0 .
docker run -d -p 3001:3001 -v aiyu-data:/data aiyu:2.0.0
```

## 测试与检查

```bash
npm test
npm run typecheck
```

测试覆盖引擎语义、地图镜像、玩家代码编译、回合编排、确定性回放和后端沙箱。

## 项目结构

```text
AI与海/
├── packages/
│   ├── shared/      # 游戏引擎、玩家 API、编译与回放
│   ├── backend/     # Express、SQLite、WebSocket 与安全复算
│   └── frontend/    # Vite、CodeMirror 6、Canvas 与 Web Worker
├── scripts/             # 构建、打包和沙箱验证脚本
├── Dockerfile
└── 一键启动.command
```

## 玩家程序约束

- 必须定义 `function run(droneId: number): DroneOperation`。
- 每回合为每艘渔船调用一次 `run()`，单次时限为 400ms。
- 沙箱屏蔽网络、系统和异步 API。
- `esbuild` 只移除 TypeScript 类型标注，编译阶段不进行类型检查。

## 本地数据

- 一键启动器默认将 SQLite 数据保存在 `packages/backend/data.db`。
- 数据库、`.env` 文件、依赖和构建产物不会提交到 GitHub。
- 需要 GitHub OAuth 时，参考 `packages/backend/.env.example`。

## 常见问题

- Node.js 版本过低：升级到 Node.js 24 或更高版本。
- 3001 端口已占用：一键启动器会自动尝试后续端口。
- 出现 `node:sqlite` 的 `ExperimentalWarning` 时可以忽略。
- 未配置 GitHub OAuth 时，本地环境会自动以 `local-dev` 登录。

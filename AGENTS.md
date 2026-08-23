# AGENTS.md

AI与海: 玩家编写 TypeScript 控制渔船的回合制海洋养鱼游戏。

## 仓库结构 (npm workspaces)

```
packages/shared   游戏核心, 纯 TS, 零平台依赖 (仅 esbuild-wasm)
packages/backend  Express + node:sqlite + ws
packages/frontend Vite + CodeMirror 6 + Canvas, 无框架 (原生 TS)
scripts/          开发辅助脚本
```

**构建顺序依赖**: frontend/backend 依赖 shared 的 dist。开发 shared 时需
`npm run dev:shared` (tsc -w) 保持产物最新。前端 vite.config.ts 将
`@aiyu/shared` 直接 alias 到 TS 源码, 但 backend 始终使用 shared 的 dist。

## 命令

- `npm test` — shared + backend 的 vitest 测试。
- `npm run build` — shared → backend (含 runner.worker.js 打包) → frontend。
- `npm run package` — 构建 + 打包出独立部署目录 `release/`。
- `npm run dev:backend` (tsx watch, 端口 3001) / `npm run dev:frontend` (vite, 5173)。
- 未配置 `GITHUB_CLIENT_ID` 时后端进入开发模式, 所有请求自动以 `local-dev` 登录。

## 核心设计

- **前后端执行一致性**: 玩家代码经 esbuild-wasm 编译为 IIFE (globalName `__AIYU__`),
  前端 (Web Worker) 与后端 (worker_threads + vm) 用同一份实现执行。
- **竞技模式坐标镜像**: 地图 14×7, P1 frame=normal, P2 frame=mirror, 双方都用
  "自己半场在左"的本地坐标系编程。
- **扩展机制**: 水域/鱼用注册表 (`TILES` / `CROPS`), 每种一个文件继承基类;
  操作是 ops/ 目录下的类, 在 ops/index.ts 登记。引擎零 if 硬编码。
- **确定性回放**: `WorldState.rngSeed` 随机种子计入回放文件, 回放用同一种子重推演。

## 关键文件

- 引擎: `shared/src/engine.ts`、`shared/src/game-controller.ts`
- 玩家 API: `shared/src/player-api.ts`、`shared/src/view.ts`
- 编译: `shared/src/compile.ts`
- 沙箱: `backend/src/runner/runner.worker.ts`、`frontend/src/core/player-worker.ts`
- 后端服务: `backend/src/services/combat.ts`、`backend/src/services/single.ts`
- 文档单一来源: `shared/src/docs.ts`

## 测试

- `shared/src/*.test.ts`: 引擎语义、地图镜像、编译、回合编排。
- `backend/test/runner.test.ts`: 沙箱 (执行/日志/超时/隔离)。
- 改引擎/注册表/地图后跑 `npm test`; 改前端后至少 `npm run build -w @aiyu/frontend`。

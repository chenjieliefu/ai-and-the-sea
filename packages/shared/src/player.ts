// 轻量入口: 仅包含玩家沙箱 (worker / vm) 需要的最小集合, 不含 esbuild-wasm。
// 注意: 使用具名 re-export (而非 export *), 保证 tsc 产物为静态可分析的
// 属性导出, 便于 Vite/Rollup 打包。
export { TIMEOUT_MS, LOAD_TIMEOUT_MS, MAX_FEED, MAX_LOG_LINES, MAX_LOGS_PER_TURN } from './config';
export type { Position, InternalOperation, TileInfo, FishInfo, BoatInfo, GameInfo, PlayerView, SnapshotState } from './types';
export { TileType, FishType, FishState } from './types';
export type { FishData, Tile, BoatState, WorldState, GameEvent, GameResult, GameMode, Frame } from './types';
export { normalizeOp } from './ops';
export type { NormalizeResult } from './ops';
export { TILES, FISHES, isFishType, fishConfig, fishInfo } from './registry';
export type { TileTypeConfig, FishTypeConfig } from './registry';
export { mirrorPosition, createSingleWorld, createCombatWorld, isOwnHalf, isOwnHalfAt, inBounds, tileAt, samePos, placeFish, isFeed } from './maps';
export { toLocal, fromLocal, buildPlayerView, snapshotOf, findBoatAt } from './view';
export { playerApiFactory, BoatOperation, Move, Teleport, NewBoat, Stock, CollectFeed, Feed, Catch, Clear, Intercept, Charge, CatchRow, CatchCol, FeedRow, FeedCol, InterceptRow, InterceptCol, StockRow, StockCol, ChangeTile, Purify, PurifyRow, PurifyCol, OPS } from './player-api';
export type { PlayerApi, PlayerConsole } from './player-api';

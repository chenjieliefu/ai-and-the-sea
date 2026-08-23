// 核心数据类型。所有数据均为纯 JSON 可序列化结构 (无 class / Map / Set),
// 以便通过 postMessage / WebSocket 在 worker、前后端之间传输。

/** 地图上的坐标, 使用 (x, y) 元组, x 轴向右, y 轴向下 */
export type Position = [number, number];

/** 水域类型。未来新增水域类型时在 tiles/ 目录注册, 无需改动引擎 */
export enum TileType {
  Pond = 'pond',
  Deep = 'deep',
  Shoal = 'shoal',
  Brine = 'brine',
}

/** 鱼种类。未来新增鱼时在 registry.ts 中注册 */
export enum FishType {
  Shrimp = 'shrimp',
  Sardine = 'sardine',
  Pufferfish = 'pufferfish',
  Hairtail = 'hairtail',
  Shark = 'shark',
  Whale = 'whale',
  Jellyfish = 'jellyfish',
  Crab = 'crab',
  Carp = 'carp',
  Tuna = 'tuna',
}

/** 鱼状态 */
export enum FishState {
  /** 正在生长 */
  Growing = 'growing',
  /** 缺食: 不投喂则长期保持此状态, 生长不推进 (投喂后继续生长) */
  Hungry = 'hungry',
  /** 成熟, 可捕捞 */
  Grown = 'grown',
}

/** 游戏模式 */
export type GameMode = 'single' | 'combat';

/**
 * 坐标系变换。
 * 竞技模式下双方各自在自己的坐标系内编程: P1 使用绝对坐标 (normal),
 * P2 的世界是 P1 世界的镜像 (mirror), 因此双方都把自己的半场视为左侧。
 */
export type Frame = 'normal' | 'mirror';

/** 渔船可执行的操作 (判别联合)。新增操作时需同时注册 ops.ts 的模式与 engine.ts 的处理器 */
export type InternalOperation =
  | { type: 'move'; to: Position }
  | { type: 'teleport'; to: Position }
  | { type: 'stock'; fish: FishType }
  | { type: 'newBoat'; at: Position }
  | { type: 'collectFeed' }
  | { type: 'feed' }
  | { type: 'catch' }
  | { type: 'clear' }
  | { type: 'intercept'; at: Position }
  // 能量相关操作
  | { type: 'charge' }
  | { type: 'catchRow' }
  | { type: 'catchCol' }
  | { type: 'feedRow' }
  | { type: 'feedCol' }
  | { type: 'interceptRow' }
  | { type: 'interceptCol' }
  | { type: 'stockRow'; stocks: FishType[] }
  | { type: 'stockCol'; stocks: FishType[] }
  // 水域转换
  | { type: 'changeTile'; tileType: TileType }
  // 改善水质
  | { type: 'purify' }
  | { type: 'purifyRow' }
  | { type: 'purifyCol' };

/** 单个水域的信息 (玩家 API 视角) */
export interface TileInfo {
  type: TileType;
  hasFish: boolean;
  /** 水域上的鱼, 无鱼时为 null */
  fish: FishInfo | null;
  /** 鱼塘水质 (仅鱼塘有, 其他水域为 undefined; 初始 5, 上限 10) */
  quality?: number;
}

/** 单个鱼的信息 (玩家 API 视角) */
export interface FishInfo {
  type: FishType;
  state: FishState;
  /** 还需要多少回合成熟, 仅 Grown 时为 0 (Growing/Hungry 均为剩余回合数) */
  cyclesToGrown: number;
}

/** 渔船信息 (玩家 API 视角, 坐标为玩家本地坐标系) */
export interface BoatInfo {
  /** 本地编号: 自己的渔船为 0..N-1; 对方的渔船为真实全局 id (如竞技模式 P2 的渔船为 2, 3) */
  id: number;
  position: Position;
  /** 当前饲料量 */
  feed: number;
  /** 当前能量 (上限 MAX_ENERGY) */
  energy: number;
  /** 是否是对方的渔船 */
  isOpponent: boolean;
  /** 对方渔船偷菜所得金额 (偷菜后未带回/未被拦截的部分) */
  bounty: number;
}

/** 玩家全局信息 (玩家 API 视角) */
export interface GameInfo {
  mode: GameMode;
  turn: number;
  maxTurns: number;
  money: number;
  /** 己方渔船数量上限 (单人 2 / 竞技 3), NewBoat 创建时受此限制 */
  boatLimit: number;
}

/** 玩家程序每回合看到的完整世界快照 (坐标为玩家本地坐标系) */
export interface PlayerView {
  mode: GameMode;
  turn: number;
  maxTurns: number;
  map: {
    width: number;
    height: number;
    tiles: TileInfo[][];
  };
  /** 场上所有渔船 (含对方), 本地坐标 */
  boats: BoatInfo[];
  /** 当前由 run() 控制的渔船 (即 boatId 对应的渔船) */
  self: BoatInfo;
  /** 自己的金钱 */
  money: number;
}

// ---------------------------------------------------------------------------
// 引擎内部状态 (绝对坐标)
// ---------------------------------------------------------------------------

export interface FishData {
  type: FishType;
  state: FishState;
  /** 距离成熟的剩余生长回合数 (Growing 时递减; Hungry 时不推进) */
  growthRemaining: number;
  /**
   * 缺食触发点 (剩余回合数, 降序): 投放时按 hungerCount 次数确定性随机选取
   * (见 rng.ts), 生长到该剩余回合数时进入 Hungry; 空数组 = 无需投喂。
   * 随机只改变时机、不改变次数; 对玩家隐藏 (API 不暴露)。
   */
  hungerAt?: number[];
  /** 已触发的缺食次数 (即 hungerAt 的进度下标) */
  hungersDone?: number;
  /** 螃蟹: 成熟后还需扩散的小螃蟹数量 (每回合 1 个, 按上右下左顺序, 到 0 停止) */
  spreadLeft?: number;
}

export interface Tile {
  type: TileType;
  fish: FishData | null;
  /** 鱼塘水质 (仅鱼塘持有; 初始 INITIAL_TILE_QUALITY, 超过 MAX_TILE_QUALITY 咸水化, 扣到 < 0 浅滩化) */
  quality?: number;
}

export interface BoatState {
  /** 全局渔船 id (唯一) */
  id: number;
  /** 所属玩家下标 (0 / 1) */
  player: number;
  position: Position;
  feed: number;
  /** 能量储量 (上限 MAX_ENERGY, 经 Charge 补充) */
  energy: number;
  /** 偷菜所得临时资金池 (离开对方半场前持有) */
  bounty: number;
  /** 本回合的拦截目标, 回合结束时结算 */
  interceptTarget: Position | null;
  /** 行/列范围拦截: 以施法点 (渔船释放时的位置) 为中心的 3 格范围, 回合结束时结算 */
  interceptZone: { axis: 'row' | 'col'; center: Position } | null;
}

export interface PlayerState {
  id: number;
  money: number;
  alive: boolean;
}

export interface WorldState {
  mode: GameMode;
  map: Tile[][];
  boats: BoatState[];
  players: PlayerState[];
  turn: number;
  maxTurns: number;
  /**
   * 本局游戏的随机种子: 游戏开始时随机取得 (对玩家不可预测), 用于投放时
   * 选取鱼缺食时机等随机机制; 计入回放文件, 回放时用同一种子重推演,
   * 保证回放与游玩过程、结果完全一致。
   */
  rngSeed: number;
}

// ---------------------------------------------------------------------------
// 鱼特效上下文 (鱼自己的文件里定义特效函数时使用)
// ---------------------------------------------------------------------------

/** 鱼成熟特效 (onGrown: 鱼变为 Grown 时执行) 的执行上下文 */
export interface MaturityEffectContext {
  world: WorldState;
  pos: Position;
  fish: FishData;
  events: GameEvent[];
}

/** 鱼生长特效 (growUpdate: 生长中每回合执行) 的执行上下文 */
export interface GrowthEffectContext {
  world: WorldState;
  fish: FishData;
  pos: Position;
  events: GameEvent[];
}

/** 鱼成熟后每回合特效 (grownUpdate: Grown 状态下每回合执行) 的执行上下文 */
export interface GrownEffectContext {
  world: WorldState;
  pos: Position;
  fish: FishData;
  events: GameEvent[];
}

/** 鱼捕捞特效 (onCaught: 捕捞时执行, 如金枪鱼把脚下水域转为鱼塘) 的执行上下文 */
export interface CatchEffectContext {
  world: WorldState;
  pos: Position;
  fish: FishData;
  events: GameEvent[];
}

/** 水域鱼事件 (onFishStocked / onFishFed / onFishCaught) 的执行上下文 */
export interface TileFishEventContext {
  world: WorldState;
  pos: Position;
  /** 相关鱼 (捕捞回调调用时该格鱼已移除) */
  fish: FishData;
  events: GameEvent[];
}

// ---------------------------------------------------------------------------
// 事件流 (渲染 / 回放 / 日志)
// ---------------------------------------------------------------------------

/** 快照中的水域 */
export interface SnapshotTile {
  type: TileType;
  fish: FishInfo | null;
  /** 鱼塘水质 (仅鱼塘有, 供前端 Tooltip 展示) */
  quality?: number;
}

/** 快照中的渔船 */
export interface SnapshotBoat {
  id: number;
  player: number;
  position: Position;
  feed: number;
  energy: number;
  bounty: number;
  interceptTarget: Position | null;
}

/** 快照中的玩家 */
export interface SnapshotPlayer {
  id: number;
  money: number;
  alive: boolean;
}

/** 每回合结束时的世界快照 (绝对坐标), 渲染与回放都基于它 */
export interface SnapshotState {
  mode: GameMode;
  turn: number;
  maxTurns: number;
  map: SnapshotTile[][];
  boats: SnapshotBoat[];
  players: SnapshotPlayer[];
}

export interface GameResultFinished {
  type: 'finished';
  scores: { player: number; name: string; money: number }[];
}

/** 程序超时 / 报错 / 内存超限导致的非正常结束 */
export interface GameResultError {
  type: 'error';
  player: number;
  message: string;
}

export type GameResult = GameResultFinished | GameResultError;

export type GameEvent =
  | { type: 'turn'; turn: number }
  | { type: 'move'; boat: number; from: Position; to: Position }
  | { type: 'move-blocked'; boat: number; to: Position; reason: 'out-of-bounds' | 'occupied' }
  | { type: 'stock'; boat: number; pos: Position; fish: FishType }
  | { type: 'collect-feed'; boat: number; pos: Position; feed: number }
  | { type: 'feed'; boat: number; pos: Position }
  | { type: 'catch'; boat: number; pos: Position; value: number; stole: boolean }
  | { type: 'charge'; boat: number; pos: Position; energy: number }
  | { type: 'change-tile'; boat: number; pos: Position; tileType: TileType }
  | { type: 'purify'; boat: number; pos: Position }
  | { type: 'clear'; boat: number; pos: Position }
  | { type: 'intercept'; boat: number; pos: Position; thief: number; bounty: number }
  | { type: 'stash'; boat: number; pos: Position; bounty: number }
  | { type: 'new-boat'; boat: number; pos: Position }
  | { type: 'fish-grow'; pos: Position; state: FishState; cyclesToGrown: number }
  | { type: 'invalid-op'; boat: number; message: string }
  | { type: 'log'; player: number; lines: string[] }
  | { type: 'snapshot'; state: SnapshotState }
  | { type: 'end'; result: GameResult };

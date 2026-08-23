// 注入玩家沙箱的 API 实现。前后端共用这一份实现, 保证玩家代码
// 在前端本地执行与在后端验证执行时得到完全相同的结果。
// API 函数只读取"每回合由宿主传入的视图快照", 因此天然无状态。
// 操作类 (Move / Stock / ...) 已拆分到 ops/ 目录, 每个操作一个文件, 见 ./ops。
import { FishInfo, BoatInfo, GameInfo, PlayerView, Position, TileInfo } from './types';
import { MAX_LOGS_PER_TURN, MAX_LOG_LINES, BOAT_LIMIT } from './config';
import {
  BoatOperation,
  Move,
  Teleport,
  Stock,
  CollectFeed,
  Feed,
  Catch,
  Clear,
  Intercept,
  Charge,
  CatchRow,
  CatchCol,
  FeedRow,
  FeedCol,
  InterceptRow,
  InterceptCol,
  StockRow,
  StockCol,
  NewBoat,
  ChangeTile,
  Purify,
  PurifyRow,
  PurifyCol,
} from './ops';

export {
  BoatOperation,
  Move,
  Teleport,
  NewBoat,
  Stock,
  CollectFeed,
  Feed,
  Catch,
  Clear,
  Intercept,
  Charge,
  CatchRow,
  CatchCol,
  FeedRow,
  FeedCol,
  InterceptRow,
  InterceptCol,
  StockRow,
  StockCol,
  ChangeTile,
  Purify,
  PurifyRow,
  PurifyCol,
} from './ops';

/** 注入沙箱的全部操作类 (按类名供玩家代码直接引用) */
export const OPS = {
  BoatOperation,
  Move,
  Teleport,
  Stock,
  CollectFeed,
  Feed,
  Catch,
  Clear,
  Intercept,
  Charge,
  CatchRow,
  CatchCol,
  FeedRow,
  FeedCol,
  InterceptRow,
  InterceptCol,
  StockRow,
  StockCol,
  NewBoat,
  ChangeTile,
  Purify,
  PurifyRow,
  PurifyCol,
};

export interface PlayerApi {
  /** 获取当前由 run() 控制的渔船信息 */
  getSelf(): BoatInfo;
  /** 获取当前回合信息与自己的金钱 */
  getGame(): GameInfo;
  /** 获取地图尺寸 */
  getMap(): { width: number; height: number };
  /** 获取指定水域信息, 坐标越界返回 null */
  getTile(position: Position): TileInfo | null;
  /** 获取指定水域的鱼信息, 无鱼或越界返回 null */
  getFish(position: Position): FishInfo | null;
  /** 获取指定水域上的渔船信息, 无渔船或越界返回 null */
  getBoat(position: Position): BoatInfo | null;
}

export interface PlayerConsole {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

function inView(view: PlayerView, pos: Position): boolean {
  return (
    pos[0] >= 0 && pos[0] < view.map.width && pos[1] >= 0 && pos[1] < view.map.height
  );
}

function fmtArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

/**
 * 创建玩家 API 与受控 console。
 * @param getView 每回合返回当前视图 (由宿主在调用 run() 前设置)
 */
export function playerApiFactory(getView: () => PlayerView | null): {
  api: PlayerApi;
  ops: typeof OPS;
  console: PlayerConsole;
  drainLogs: () => string[];
} {
  let logs: string[] = [];
  let truncated = false;

  const log = (level: string, args: unknown[]) => {
    if (logs.length >= MAX_LOG_LINES) {
      if (!truncated) {
        logs.push('[系统] 日志过多, 已截断');
        truncated = true;
      }
      return;
    }
    const line = `[${level}] ${args.map(fmtArg).join(' ')}`;
    logs.push(line);
    if (logs.length >= MAX_LOGS_PER_TURN && level !== 'error' && level !== 'warn') {
      logs.push('[系统] 本回合日志过多, 其余被忽略');
    }
  };

  const consoleObj: PlayerConsole = {
    log: (...a: unknown[]) => log('log', a),
    info: (...a: unknown[]) => log('info', a),
    warn: (...a: unknown[]) => log('warn', a),
    error: (...a: unknown[]) => log('error', a),
  };

  const api: PlayerApi = {
    getSelf(): BoatInfo {
      const view = getView();
      if (!view) throw new Error('API 调用时机错误: 当前回合视图未就绪');
      return view.self;
    },
    getGame(): GameInfo {
      const view = getView();
      if (!view) throw new Error('API 调用时机错误: 当前回合视图未就绪');
      return { mode: view.mode, turn: view.turn, maxTurns: view.maxTurns, money: view.money, boatLimit: BOAT_LIMIT[view.mode] };
    },
    getMap() {
      const view = getView();
      if (!view) throw new Error('API 调用时机错误: 当前回合视图未就绪');
      return { width: view.map.width, height: view.map.height };
    },
    getTile(position: Position): TileInfo | null {
      const view = getView();
      if (!view) throw new Error('API 调用时机错误: 当前回合视图未就绪');
      if (!inView(view, position)) return null;
      return view.map.tiles[position[1]][position[0]];
    },
    getFish(position: Position): FishInfo | null {
      const view = getView();
      if (!view) throw new Error('API 调用时机错误: 当前回合视图未就绪');
      if (!inView(view, position)) return null;
      const tile = view.map.tiles[position[1]][position[0]];
      return tile.fish;
    },
    getBoat(position: Position): BoatInfo | null {
      const view = getView();
      if (!view) throw new Error('API 调用时机错误: 当前回合视图未就绪');
      if (!inView(view, position)) return null;
      for (const d of view.boats) {
        if (d.position[0] === position[0] && d.position[1] === position[1]) return d;
      }
      return null;
    },
  };

  return { api, ops: OPS, console: consoleObj, drainLogs: () => logs.splice(0, logs.length) };
}

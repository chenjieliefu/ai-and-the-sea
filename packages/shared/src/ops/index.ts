// 操作类的注册表与玩家操作的结构校验/规范化 (原 ops.ts)。
//
// - 引擎 (engine.ts) 阶段 1 按 type 查 OP_CLASSES 并调用 cls.apply() 执行语义,
//   不再有 if-else 分支 / 处理器字典; 新增操作 = 在 ops/ 新建操作类 + 在此登记。
// - normalizeOp 负责把玩家代码的返回值 (操作类实例或纯对象) 校验并规范化为纯对象,
//   便于跨 realm / postMessage 传输。
import { InternalOperation } from '../types';
import { TILES, isFishType } from '../registry';
import { isPosition } from './base';
import type { OpClass } from './base';
import { Move } from './move';
import { Teleport } from './teleport';
import { NewBoat } from './new-boat';
import { Stock } from './stock';
import { CollectFeed } from './collect-feed';
import { Feed } from './feed';
import { Catch } from './catch';
import { Clear } from './clear';
import { Intercept } from './intercept';
import { Charge } from './charge';
import { CatchRow } from './catch-row';
import { CatchCol } from './catch-col';
import { FeedRow } from './feed-row';
import { FeedCol } from './feed-col';
import { InterceptRow } from './intercept-row';
import { InterceptCol } from './intercept-col';
import { StockRow } from './stock-row';
import { StockCol } from './stock-col';
import { ChangeTile } from './change-tile';
import { Purify } from './purify';
import { PurifyRow } from './purify-row';
import { PurifyCol } from './purify-col';

export { BoatOperation, isPosition } from './base';
export type { OpClass, OpContext, OpField, OpResult, TurnSession, MoveCandidate } from './base';
// 操作类对外的具名导出 (玩家侧 API 经 player-api.ts 二次导出到沙箱)
export { Move } from './move';
export { Teleport } from './teleport';
export { NewBoat } from './new-boat';
export { Stock } from './stock';
export { CollectFeed } from './collect-feed';
export { Feed } from './feed';
export { Catch } from './catch';
export { Clear } from './clear';
export { Intercept } from './intercept';
export { Charge } from './charge';
export { CatchRow } from './catch-row';
export { CatchCol } from './catch-col';
export { FeedRow } from './feed-row';
export { FeedCol } from './feed-col';
export { InterceptRow } from './intercept-row';
export { InterceptCol } from './intercept-col';
export { StockRow } from './stock-row';
export { StockCol } from './stock-col';
export { ChangeTile } from './change-tile';
export { Purify } from './purify';
export { PurifyRow } from './purify-row';
export { PurifyCol } from './purify-col';

/** 操作 type → 操作类。引擎与 normalizeOp 共用这一处注册表 */
export const OP_CLASSES: Record<string, OpClass> = {
  move: Move,
  teleport: Teleport,
  newBoat: NewBoat,
  stock: Stock,
  collectFeed: CollectFeed,
  feed: Feed,
  catch: Catch,
  clear: Clear,
  intercept: Intercept,
  charge: Charge,
  catchRow: CatchRow,
  catchCol: CatchCol,
  feedRow: FeedRow,
  feedCol: FeedCol,
  interceptRow: InterceptRow,
  interceptCol: InterceptCol,
  stockRow: StockRow,
  stockCol: StockCol,
  changeTile: ChangeTile,
  purify: Purify,
  purifyRow: PurifyRow,
  purifyCol: PurifyCol,
};

/** 按操作 type 取操作类 (engine 阶段 1 的分发入口, 替代 if-else 链) */
export function opClassOf(type: string): OpClass | null {
  return OP_CLASSES[type] ?? null;
}

/** 玩家 class 构造名 → 操作 type 的映射 (兜底: 实例丢失 type 字段时的旧兼容路径) */
const OP_CLASS_TYPES: Record<string, string> = {};
for (const [type, cls] of Object.entries(OP_CLASSES)) {
  OP_CLASS_TYPES[cls.name] = type;
}

export type NormalizeResult =
  | { ok: true; op: InternalOperation | null }
  | { ok: false; error: string };

/** 识别操作类型: 优先纯对象形式 (raw.type), 其次玩家 class 的构造类名 */
function opTypeOf(raw: Record<string, unknown>): string | null {
  if (typeof raw.type === 'string' && raw.type in OP_CLASSES) return raw.type;
  const ctor = raw.constructor as { name?: string } | undefined;
  if (ctor && typeof ctor.name === 'string') {
    const mapped = OP_CLASS_TYPES[ctor.name];
    if (mapped) return mapped;
  }
  return null;
}

/**
 * 校验并规范化 run() 的返回值, 输出统一的纯对象形式。
 * - undefined / null: 视为空操作 (本回合不动作), 但会记日志提示
 * - 结构非法: 返回错误, 该回合操作被忽略并产生 invalid-op 事件
 * - 玩家 class 实例 (`new Move(...)`) 与纯对象 (`{ type: 'move', ... }`) 均支持
 * - 结构字段模式来自操作类的静态 fields, 新增操作只需在类里声明
 */
export function normalizeOp(raw: unknown): NormalizeResult {
  if (raw === undefined || raw === null) {
    return { ok: true, op: null };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'run() 必须返回一个操作对象 (例如 new Move([x, y]) 或什么都不返回)' };
  }
  const op = raw as Record<string, unknown>;
  const type = opTypeOf(op);
  if (!type) {
    return { ok: false, error: '无法识别的操作: 请使用 new Move(...) / new Stock(...) 等操作类, 或 { type: "move", ... }' };
  }
  const cls = OP_CLASSES[type];
  for (const { name, kind } of cls.fields) {
    const v = op[name];
    if (kind === 'position' && !isPosition(v)) {
      return { ok: false, error: `操作 ${type} 的字段 ${name} 必须是 [x, y] 坐标` };
    }
    if (kind === 'string' && typeof v !== 'string') {
      return { ok: false, error: `操作 ${type} 的字段 ${name} 必须是字符串` };
    }
    if (kind === 'fish' && !(Array.isArray(v) && v.length > 0 && v.every((c) => isFishType(c)))) {
      return { ok: false, error: `操作 ${type} 的字段 ${name} 必须是非空鱼种类数组 (如 ['strawberry', 'grape'])` };
    }
  }
  if (type === 'stock' && !isFishType(op.fish)) {
    return { ok: false, error: `未知鱼种类: ${String(op.fish)}` };
  }
  if (type === 'changeTile' && !(String(op.tileType) in TILES)) {
    return { ok: false, error: `ChangeTile 的目标类型必须是 pond / deep / shoal 之一, 收到: ${String(op.tileType)}` };
  }
  // 输出干净的纯对象 (丢弃额外字段, 便于跨 worker 传输)
  const out: Record<string, unknown> = { type };
  for (const { name } of cls.fields) out[name] = op[name];
  return { ok: true, op: out as InternalOperation };
}

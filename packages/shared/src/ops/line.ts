// 行/列范围操作的抽象基类。
// CatchRow/CatchCol/FeedRow/FeedCol/StockRow/StockCol/InterceptRow/InterceptCol
// 共享同一套逻辑, 具体类只声明 type 与 axis, 通过继承 + 重写 apply() 复用。
import { FishState, FishType, InternalOperation, TileType } from '../types';
import { TILES, fishConfig } from '../registry';
import {
  PURIFY_GAIN,
  PURIFY_ROW_COL_COST,
  HARVEST_ROW_COL_COST,
  INTERCEPT_ROW_COL_COST,
  PLANT_ROW_COL_COST,
  FEED_ROW_COL_COST,
} from '../config';
import { isOwnHalfAt } from '../maps';
import { BoatOperation, OpContext, OpResult, TurnSession } from './base';
import { interfishpingValue, lineRangePositions, tryStockAt } from './helpers';

/**
 * 行/列范围捕捞: 一次性捕捞以渔船为中心的行/列 3 格内全部成熟鱼, 消耗能量。
 * 竞技模式仅捕捞自己半场的鱼 (对方半场的鱼不能由此捕捞)。
 */
export abstract class LineCatchOp extends BoatOperation {
  static readonly axis: 'row' | 'col';
  static apply(ctx: OpContext, op: InternalOperation, _session: TurnSession): OpResult {
    const axis = this.axis;
    const { world, boat, events } = ctx;
    if (boat.energy < HARVEST_ROW_COL_COST) {
      return { ok: false, message: `能量不足: ${op.type} 需要 ${HARVEST_ROW_COL_COST} 点能量` };
    }
    boat.energy -= HARVEST_ROW_COL_COST;
    let count = 0;
    for (const pos of lineRangePositions(boat.position, axis, world)) {
      const tile = world.map[pos[1]][pos[0]];
      const fish = tile.fish;
      if (!fish || fish.state !== FishState.Grown) continue;
      if (world.mode === 'combat' && !isOwnHalfAt(world, boat.player, pos)) continue;
      const cfg = fishConfig(fish.type);
      // 间作: 四方向至少 2 个不同种类鱼 → 收益 +20%
      const value = interfishpingValue(world, pos, fish.type, cfg.value);
      tile.fish = null;
      // 水域的"鱼捕捞"回调 (如鱼塘: 周围有浅滩则本格浅滩化)
      TILES[tile.type].onFishCaught?.({ world, pos, fish, events });
      // 鱼的"捕捞特效" (如金枪鱼: 把脚下水域转为鱼塘)
      cfg.onCaught?.({ world, pos, fish, events });
      // 行/列捕捞只作用于自己半场, 捕捞直接入账 (不产生偷菜)
      world.players[boat.player].money += value;
      events.push({
        type: 'catch',
        boat: boat.id,
        pos: [pos[0], pos[1]],
        value,
        stole: false,
      });
      count++;
    }
    return { ok: true, message: count === 0 ? '范围内没有可捕捞的鱼' : undefined };
  }
}

/**
 * 行/列范围投喂: 以渔船为中心的行/列 3 格内给缺食鱼投喂直到饲料耗尽,
 * 跳过不需要投喂的鱼, 消耗能量。
 */
export abstract class LineFeedOp extends BoatOperation {
  static readonly axis: 'row' | 'col';
  static apply(ctx: OpContext, op: InternalOperation, _session: TurnSession): OpResult {
    const axis = this.axis;
    const { world, boat, events } = ctx;
    if (boat.energy < FEED_ROW_COL_COST) {
      return { ok: false, message: `能量不足: ${op.type} 需要 ${FEED_ROW_COL_COST} 点能量` };
    }
    boat.energy -= FEED_ROW_COL_COST;
    let count = 0;
    for (const pos of lineRangePositions(boat.position, axis, world)) {
      const tile = world.map[pos[1]][pos[0]];
      const fish = tile.fish;
      if (!fish || fish.state !== FishState.Hungry) continue; // 跳过不需要投喂的鱼
      if (boat.feed < 1) break; // 饲料耗尽即停止
      boat.feed -= 1;
      fish.state = FishState.Growing;
      // 水域的"鱼投喂"回调
      TILES[tile.type].onFishFed?.({ world, pos, fish, events });
      events.push({ type: 'feed', boat: boat.id, pos: [pos[0], pos[1]] });
      count++;
    }
    return { ok: true, message: count === 0 ? '没有浇到任何鱼 (饲料耗尽或范围内无缺食鱼)' : undefined };
  }
}

/**
 * 行/列范围投放: 以渔船为中心的行/列 3 格内按 stocks 数组顺序投放,
 * 跳过无法投放的格子 (水域不适配 / 已有鱼 / 金钱不足), 消耗能量。
 */
export abstract class LineStockOp extends BoatOperation {
  static readonly axis: 'row' | 'col';
  static apply(ctx: OpContext, op: InternalOperation, _session: TurnSession): OpResult {
    const axis = this.axis;
    const { world, boat, events } = ctx;
    const stocks = (op as { stocks: FishType[] }).stocks;
    if (boat.energy < PLANT_ROW_COL_COST) {
      return { ok: false, message: `能量不足: ${op.type} 需要 ${PLANT_ROW_COL_COST} 点能量` };
    }
    boat.energy -= PLANT_ROW_COL_COST;
    let count = 0;
    let stockIdx = 0;
    for (const pos of lineRangePositions(boat.position, axis, world)) {
      if (stockIdx >= stocks.length) break;
      if (!tryStockAt(world, boat, pos, stocks[stockIdx], events)) continue;
      events.push({ type: 'stock', boat: boat.id, pos: [pos[0], pos[1]], fish: stocks[stockIdx] });
      stockIdx++;
      count++;
    }
    return { ok: true, message: count === 0 ? '范围内没有可投放的位置 (或已全部种下)' : undefined };
  }
}

/**
 * 行/列范围拦截: 以施法点 (渔船释放时的位置) 为中心的行/列 3 格范围,
 * 回合结束时拦截其中携带偷菜资金的对方渔船, 消耗能量。
 */
export abstract class LineInterceptOp extends BoatOperation {
  static readonly axis: 'row' | 'col';
  static apply(ctx: OpContext, _op: InternalOperation, _session: TurnSession): OpResult {
    const axis = this.axis;
    const { world, boat } = ctx;
    if (world.mode !== 'combat') return { ok: false, message: '拦截仅在竞技模式可用' };
    if (boat.energy < INTERCEPT_ROW_COL_COST) {
      return { ok: false, message: `能量不足: 范围拦截需要 ${INTERCEPT_ROW_COL_COST} 点能量` };
    }
    boat.energy -= INTERCEPT_ROW_COL_COST;
    boat.interceptZone = { axis, center: [boat.position[0], boat.position[1]] };
    return { ok: true };
  }
}

/**
 * 行/列范围改善水质: 以渔船为中心的行/列 3 格内给鱼塘改善水质 (水质 +3),
 * 非鱼塘格子跳过 (不返还能量), 消耗能量。
 */
export abstract class LinePurifyOp extends BoatOperation {
  static readonly axis: 'row' | 'col';
  static apply(ctx: OpContext, op: InternalOperation, _session: TurnSession): OpResult {
    const axis = this.axis;
    const { world, boat, events } = ctx;
    if (boat.energy < PURIFY_ROW_COL_COST) {
      return { ok: false, message: `能量不足: ${op.type} 需要 ${PURIFY_ROW_COL_COST} 点能量` };
    }
    boat.energy -= PURIFY_ROW_COL_COST;
    let count = 0;
    for (const pos of lineRangePositions(boat.position, axis, world)) {
      const tile = world.map[pos[1]][pos[0]];
      if (tile.type !== TileType.Pond) continue; // 非鱼塘跳过 (不返还能量)
      tile.quality = (tile.quality ?? 0) + PURIFY_GAIN;
      events.push({ type: 'purify', boat: boat.id, pos: [pos[0], pos[1]] });
      count++;
    }
    return { ok: true, message: count === 0 ? '范围内没有鱼塘' : undefined };
  }
}

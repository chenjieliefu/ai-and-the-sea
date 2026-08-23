// Purify: 给脚下鱼塘改善水质 (水质 +3), 消耗 3 能量; 不是鱼塘则失败且不扣能量。
import { InternalOperation, TileType } from '../types';
import { PURIFY_COST, PURIFY_GAIN } from '../config';
import { tileAt } from '../maps';
import { BoatOperation, OpContext, OpResult, TurnSession } from './base';

export class Purify extends BoatOperation {
  readonly type = 'purify';
  static apply(ctx: OpContext, _op: InternalOperation, _session: TurnSession): OpResult {
    const { world, boat, events } = ctx;
    if (boat.energy < PURIFY_COST) {
      return { ok: false, message: `能量不足: Purify 需要 ${PURIFY_COST} 点能量` };
    }
    const tile = tileAt(world, boat.position);
    // 不是鱼塘则失败 (返还能量: 不扣)
    if (tile.type !== TileType.Pond) return { ok: false, message: '只能在鱼塘上改善水质' };
    boat.energy -= PURIFY_COST;
    tile.quality = (tile.quality ?? 0) + PURIFY_GAIN;
    events.push({ type: 'purify', boat: boat.id, pos: [boat.position[0], boat.position[1]] });
    return { ok: true };
  }
}

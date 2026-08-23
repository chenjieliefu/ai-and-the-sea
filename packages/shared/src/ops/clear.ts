// Clear: 放掉当前水域的鱼 (竞技模式仅限己方半场)。
import { InternalOperation } from '../types';
import { isOwnHalf, tileAt } from '../maps';
import { BoatOperation, OpContext, OpResult, TurnSession } from './base';

export class Clear extends BoatOperation {
  readonly type = 'clear';
  static apply(ctx: OpContext, _op: InternalOperation, _session: TurnSession): OpResult {
    const { world, boat, events } = ctx;
    const tile = tileAt(world, boat.position);
    if (!tile.fish) return { ok: false, message: '当前水域没有鱼' };
    if (world.mode === 'combat' && !isOwnHalf(world, boat)) {
      return { ok: false, message: '只能在己方半场放掉' };
    }
    tile.fish = null;
    events.push({ type: 'clear', boat: boat.id, pos: [boat.position[0], boat.position[1]] });
    return { ok: true };
  }
}

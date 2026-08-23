// Feed: 给当前水域的缺食鱼投喂 (恢复生长, 从缺食时剩余进度继续)。
import { FishState, InternalOperation } from '../types';
import { TILES } from '../registry';
import { tileAt } from '../maps';
import { BoatOperation, OpContext, OpResult, TurnSession } from './base';

export class Feed extends BoatOperation {
  readonly type = 'feed';
  static apply(ctx: OpContext, _op: InternalOperation, _session: TurnSession): OpResult {
    const { world, boat, events } = ctx;
    const tile = tileAt(world, boat.position);
    const fish = tile.fish;
    if (!fish || fish.state !== FishState.Hungry) {
      return { ok: false, message: '当前水域没有需要投喂的鱼' };
    }
    if (boat.feed < 1) return { ok: false, message: '没有水了, 请先到深水补给饲料' };
    boat.feed -= 1;
    fish.state = FishState.Growing; // 恢复生长, 从缺食时剩余的生长进度继续
    // 水域的"鱼投喂"回调
    TILES[tile.type].onFishFed?.({ world, pos: boat.position, fish, events });
    events.push({ type: 'feed', boat: boat.id, pos: [boat.position[0], boat.position[1]] });
    return { ok: true };
  }
}

// CollectFeed: 在深水上补给饲料 (一次取满, 上限 5 格)。
import { InternalOperation } from '../types';
import { TILES } from '../registry';
import { MAX_FEED } from '../config';
import { tileAt } from '../maps';
import { BoatOperation, OpContext, OpResult, TurnSession } from './base';

export class CollectFeed extends BoatOperation {
  readonly type = 'collectFeed';
  static apply(ctx: OpContext, _op: InternalOperation, _session: TurnSession): OpResult {
    const { world, boat, events } = ctx;
    const tile = tileAt(world, boat.position);
    if (!TILES[tile.type].canCollectFeed) return { ok: false, message: '只能在深水上补给饲料' };
    if (boat.feed >= MAX_FEED) return { ok: false, message: `饲料量已满 (最多 ${MAX_FEED} 格)` };
    boat.feed = MAX_FEED;
    events.push({
      type: 'collect-feed',
      boat: boat.id,
      pos: [boat.position[0], boat.position[1]],
      feed: boat.feed,
    });
    return { ok: true };
  }
}

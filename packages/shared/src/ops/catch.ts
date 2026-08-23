// Catch: 捕捞当前水域的成熟鱼。
// 竞技模式在对方半场捕捞 → 进入渔船 bounty (偷菜, 回己方半场入账 / 被拦截清零);
// 捕捞伴随间作加成; 捕捞后触发该水域的 onFishCaught 回调 (如鱼塘的浅滩化)。
import { FishState, InternalOperation, Position } from '../types';
import { TILES, fishConfig } from '../registry';
import { isOwnHalf, tileAt } from '../maps';
import { BoatOperation, OpContext, OpResult, TurnSession } from './base';
import { interfishpingValue } from './helpers';

export class Catch extends BoatOperation {
  readonly type = 'catch';
  static apply(ctx: OpContext, _op: InternalOperation, _session: TurnSession): OpResult {
    const { world, boat, events } = ctx;
    const tile = tileAt(world, boat.position);
    const fish = tile.fish;
    if (!fish || fish.state !== FishState.Grown) return { ok: false, message: '鱼尚未成熟' };
    const cfg = fishConfig(fish.type);
    const pos: Position = [boat.position[0], boat.position[1]];
    // 间作: 四方向至少 2 个不同种类鱼 → 收益 +20%
    const value = interfishpingValue(world, pos, fish.type, cfg.value);
    tile.fish = null;
    const stole = world.mode === 'combat' && !isOwnHalf(world, boat);
    if (stole) boat.bounty += value;
    else world.players[boat.player].money += value;
    // 水域的"鱼捕捞"回调 (如鱼塘: 周围有浅滩则本格浅滩化)
    TILES[tile.type].onFishCaught?.({ world, pos, fish, events });
    // 鱼的"捕捞特效" (如金枪鱼: 把脚下水域转为鱼塘)
    cfg.onCaught?.({ world, pos, fish, events });
    events.push({
      type: 'catch',
      boat: boat.id,
      pos,
      value,
      stole,
    });
    return { ok: true };
  }
}

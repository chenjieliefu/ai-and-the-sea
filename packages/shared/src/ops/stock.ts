// Stock: 在当前位置投放鱼。
import { FishType, InternalOperation } from '../types';
import { TILES, fishConfig, isFishType } from '../registry';
import { tileAt } from '../maps';
import { BoatOperation, OpContext, OpField, OpResult, TurnSession } from './base';
import { tryStockAt } from './helpers';

export class Stock extends BoatOperation {
  static readonly fields: OpField[] = [{ name: 'fish', kind: 'string' }];
  readonly type = 'stock';
  constructor(public fish: FishType) {
    super();
    if (!isFishType(fish)) throw new Error(`Stock 的参数 fish 必须是鱼种类 (如 FishType.Shrimp), 收到: ${String(fish)}`);
  }
  static apply(ctx: OpContext, op: InternalOperation, _session: TurnSession): OpResult {
    const { world, boat, events } = ctx;
    const fish = (op as { fish: FishType }).fish;
    const cfg = fishConfig(fish);
    const tile = tileAt(world, boat.position);
    if (!cfg.canStock(tile)) {
      return { ok: false, message: `${cfg.name} 不能投放在 ${TILES[tile.type].name} 上` };
    }
    if (tile.fish) return { ok: false, message: '该水域已有鱼' };
    const player = world.players[boat.player];
    if (player.money < cfg.stockCost) return { ok: false, message: '金钱不足' };
    tryStockAt(world, boat, boat.position, fish, events);
    events.push({ type: 'stock', boat: boat.id, pos: [boat.position[0], boat.position[1]], fish });
    return { ok: true };
  }
}

// ChangeTile: 转换脚下水域 — 消耗能量, 上下左右必须有至少一个与目标类型相同的水域
// (不允许凭空创造), 有鱼的水域不可转换。
import { InternalOperation, TileType } from '../types';
import { TILES } from '../registry';
import { CHANGE_TILE_COST } from '../config';
import { orthNeighbors, tileAt } from '../maps';
import { BoatOperation, OpContext, OpField, OpResult, TurnSession } from './base';

export class ChangeTile extends BoatOperation {
  static readonly fields: OpField[] = [{ name: 'tileType', kind: 'string' }];
  readonly type = 'changeTile';
  constructor(public tileType: TileType) {
    super();
    if (!(tileType in TILES)) {
      throw new Error(`ChangeTile 的目标类型必须是 pond / deep / shoal 之一, 收到: ${String(tileType)}`);
    }
  }
  static apply(ctx: OpContext, op: InternalOperation, _session: TurnSession): OpResult {
    const { world, boat, events } = ctx;
    if (boat.energy < CHANGE_TILE_COST) {
      return { ok: false, message: `能量不足: ChangeTile 需要 ${CHANGE_TILE_COST} 点能量` };
    }
    const target = (op as { tileType: TileType }).tileType;
    const tile = tileAt(world, boat.position);
    if (tile.type === target) return { ok: false, message: '目标类型与当前水域相同' };
    if (tile.fish) return { ok: false, message: '该水域有鱼, 不能转换水域类型' };
    // 前提: 上下左右必须有至少一个与目标类型相同的水域, 不允许凭空创造
    const hasNeighbor = orthNeighbors(boat.position, world).some(
      ([nx, ny]) => world.map[ny][nx].type === target
    );
    if (!hasNeighbor) {
      return { ok: false, message: `周围没有 ${TILES[target].name} 水域, 不能凭空创造` };
    }
    boat.energy -= CHANGE_TILE_COST;
    // 转为鱼塘时水质为 0
    world.map[boat.position[1]][boat.position[0]] = {
      type: target,
      fish: null,
      ...(target === TileType.Pond ? { quality: 0 } : {}),
    };
    events.push({
      type: 'change-tile',
      boat: boat.id,
      pos: [boat.position[0], boat.position[1]],
      tileType: target,
    });
    return { ok: true };
  }
}

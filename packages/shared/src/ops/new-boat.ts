// NewBoat: 花费 4000 金钱在指定位置创建一架新的渔船 (上限: 单人 2 / 竞技 3)。
// 金钱在阶段 1 扣除, 实际创建延迟到回合末 (避免遍历中修改渔船列表)。
import { InternalOperation, Position } from '../types';
import { BOAT_LIMIT, NEW_BOAT_COST } from '../config';
import { inBounds, samePos } from '../maps';
import { BoatOperation, OpContext, OpField, OpResult, TurnSession, isPosition } from './base';

export class NewBoat extends BoatOperation {
  static readonly fields: OpField[] = [{ name: 'at', kind: 'position' }];
  readonly type = 'newBoat';
  constructor(public at: Position) {
    super();
    if (!isPosition(at)) throw new Error('NewBoat 的参数 at 必须是 [x, y] 坐标');
  }
  static apply(ctx: OpContext, op: InternalOperation, session: TurnSession): OpResult {
    const { world, boat } = ctx;
    const at = (op as { at: Position }).at;
    const limit = BOAT_LIMIT[world.mode];
    const ownCount = world.boats.filter((d) => d.player === boat.player).length;
    const player = world.players[boat.player];
    if (player.money < NEW_BOAT_COST) {
      return { ok: false, message: `金钱不足: NewBoat 需要 ${NEW_BOAT_COST} 金钱` };
    }
    if (ownCount >= limit) {
      return { ok: false, message: `渔船数量已达上限 (${limit} 架)` };
    }
    if (!inBounds(world, at)) {
      return { ok: false, message: `NewBoat 目标位置 ${JSON.stringify(at)} 越界` };
    }
    if (world.boats.some((d) => samePos(d.position, at))) {
      return { ok: false, message: '该位置已有渔船' };
    }
    player.money -= NEW_BOAT_COST;
    session.newBoatRequests.push({ player: boat.player, pos: at });
    return { ok: true };
  }
}

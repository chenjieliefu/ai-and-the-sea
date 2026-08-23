// Charge: 充能 — 原地不动, 能量 +5 (上限 10)。
import { InternalOperation } from '../types';
import { CHARGE_GAIN, MAX_ENERGY } from '../config';
import { BoatOperation, OpContext, OpResult, TurnSession } from './base';

export class Charge extends BoatOperation {
  readonly type = 'charge';
  static apply(ctx: OpContext, _op: InternalOperation, _session: TurnSession): OpResult {
    const { boat, events } = ctx;
    const gained = Math.min(MAX_ENERGY - boat.energy, CHARGE_GAIN);
    boat.energy += gained;
    events.push({
      type: 'charge',
      boat: boat.id,
      pos: [boat.position[0], boat.position[1]],
      energy: boat.energy,
    });
    return { ok: true };
  }
}

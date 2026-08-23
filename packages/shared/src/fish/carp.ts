// 鲤鱼: 功能性鱼, 游动时带动水流, 为周围的鱼提供缓慢的投喂支持。
// 特殊效果 (growUpdate) 直接定义在本文件, 引擎直接调用。
import { FishState, FishType, Tile, TileType } from '../types';
import type { GrowthEffectContext } from '../types';
import { TILES } from '../registry';
import { BaseFish } from './base';

export class Carp extends BaseFish {
  readonly type = FishType.Carp;
  readonly name = '鲤鱼';
  readonly description = '功能性鱼, 游动时带动水流, 为 [上下左右] 的缺食鱼补水, 成熟后无此效果。';
  readonly stockCost = 150;
  readonly value = 100;
  readonly growCyclesBase = 80;
  readonly hungerCountBase = 0; // 无需投喂
  readonly color = '#e8a33c';

  canStock(tile: Tile): boolean {
    return tile.type === TileType.Deep;
  }
  /** 养殖条件描述 */
  readonly canStockDesc = '深水';

  /**
   * 生长中每回合按 上→右→下→左 顺序检查周围水域,
   * 若存在缺食鱼则自动补水 (每回合仅补水一次), 成熟后无此效果。
   * 补水效果与普通 Feed 一致 (前端渲染淡蓝色特效)。
   */
  growUpdate({ world, pos, events }: GrowthEffectContext): void {
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const nx = pos[0] + dx;
      const ny = pos[1] + dy;
      if (nx < 0 || nx >= world.map[0].length || ny < 0 || ny >= world.map.length) continue;
      const tile = world.map[ny][nx];
      const nb = tile.fish;
      if (!nb || nb.state !== FishState.Hungry) continue;
      nb.state = FishState.Growing;
      // 自动补水同样触发目标水域的"鱼补水"回调
      TILES[tile.type].onFishFed?.({ world, pos: [nx, ny], fish: nb, events });
      events.push({ type: 'feed', boat: -1, pos: [nx, ny] });
      return; // 每回合仅补水一次
    }
  }
}

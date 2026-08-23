// 水母: 能净化水质的鱼, 生长时会加速周围鱼的生长。
// 特殊效果 (growUpdate) 直接定义在本文件, 引擎直接调用。
import { FishState, FishType, Position, Tile, TileType, WorldState } from '../types';
import type { GrowthEffectContext } from '../types';
import { BaseFish } from './base';

export class Jellyfish extends BaseFish {
  readonly type = FishType.Jellyfish;
  readonly name = '水母';
  readonly description = '能净化水质的鱼, 生长时会加速周围鱼的生长。';
  readonly qualityCost = -4; // 净化水质: 捕捞时恢复水质
  readonly stockCost = 100;
  readonly value = 120;
  readonly growCyclesBase = 30;
  readonly hungerCountBase = 2; // 生长中缺食 2 次
  readonly color = '#c89bd8';

  canStock(tile: Tile): boolean {
    return tile.type === TileType.Pond || tile.type === TileType.Shoal;
  }
  /** 养殖条件描述 */
  readonly canStockDesc = '鱼塘 / 浅滩';

  /** 生长特效 (growUpdate): 生长中每回合按 上→右→下→左 加速邻格鱼的生长 */
  growUpdate({ world, pos }: GrowthEffectContext): void {
    this.accelerateNeighbors(world, pos);
  }

  /**
   * 按 上→右→下→左 顺序检查周围水域, 若有鱼且不缺食 (Growing)
   * 且距离成熟剩余 >= 2 周期, 则其生长时间 -1 周期。
   */
  private accelerateNeighbors(world: WorldState, pos: Position): void {
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const nx = pos[0] + dx;
      const ny = pos[1] + dy;
      if (nx < 0 || nx >= world.map[0].length || ny < 0 || ny >= world.map.length) continue;
      const nb = world.map[ny][nx].fish;
      if (!nb || nb.state !== FishState.Growing) continue; // 缺食 (Hungry) 的鱼不加速
      if (nb.growthRemaining < 2) continue; // 距成熟不足 2 周期不加速
      nb.growthRemaining -= 1;
      break;
    }
  }
}

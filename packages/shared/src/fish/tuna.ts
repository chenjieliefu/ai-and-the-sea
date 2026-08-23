// 金枪鱼: 生命力顽强的鱼, 能在浅滩 / 咸水生长, 捕捞后把脚下水域转为鱼塘 (水质 2)。
// 生长固定 15 周期 (不受环境 debuff 影响); 特殊效果 (onCaught) 定义在本文件。
import { FishType, Tile, TileType } from '../types';
import type { CatchEffectContext, WorldState } from '../types';
import { BaseFish } from './base';

export class Tuna extends BaseFish {
  readonly type = FishType.Tuna;
  readonly name = '金枪鱼';
  readonly description = '生命力顽强的鱼, 能将不适宜生长的水域转为鱼塘; 不受环境 debuff 影响。';
  readonly stockCost = 80;
  readonly value = 100;
  readonly growCyclesBase = 15;
  readonly hungerCountBase = 0; // 无需投喂
  readonly color = '#3b5b8a';

  canStock(tile: Tile): boolean {
    return tile.type === TileType.Shoal || tile.type === TileType.Brine;
  }

  readonly canStockDesc = '浅滩 / 咸水';

  /** 生长固定 15 周期: 忽略水域 growthFactor (浅滩 ×3 / 咸水 ×1.5 均不生效) */
  growCycles(_tile: Tile, _world: WorldState): number {
    return this.growCyclesBase;
  }

  /** 捕捞特效: 将脚下的水域转变为鱼塘, 水质为 2 */
  onCaught({ world, pos }: CatchEffectContext): void {
    world.map[pos[1]][pos[0]] = { type: TileType.Pond, fish: null, quality: 2 };
  }
}

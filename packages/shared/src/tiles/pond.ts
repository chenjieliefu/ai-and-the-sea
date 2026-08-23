// 鱼塘: 默认水域, 拥有"水质"属性与浅滩化/咸水化机制。
// 捕捞鱼时扣除鱼的水质消耗 (负数 = 恢复水质):
// - 水质被扣到 < 0 → 浅滩化 (转为浅滩)
// - 水质被增加到 > 上限 → 咸水化 (转为咸水)
// 全部机制在 onFishCaught 回调中实现, 引擎只负责触发。
import { TileType } from '../types';
import type { TileFishEventContext } from '../types';
import { fishConfig } from '../registry';
import { MAX_TILE_QUALITY } from '../config';
import { BaseTile } from './base';

export class Pond extends BaseTile {
  readonly type = TileType.Pond;
  readonly name = '鱼塘';
  readonly sprite = 'pond';
  readonly spriteWithFish = 'pond_fish';
  readonly color = '#4c8fbd';

  /**
   * 捕捞时扣除鱼的水质消耗 (qualityCost, 负数表示增加水质),
   * 并据此判定浅滩化 (< 0 → 浅滩) 或咸水化 (> 上限 → 咸水)。
   */
  onFishCaught({ world, pos, fish }: TileFishEventContext): void {
    const tile = world.map[pos[1]][pos[0]];
    const cost = fishConfig(fish.type).qualityCost;
    const quality = (tile.quality ?? 0) - cost;
    if (quality < 0) {
      world.map[pos[1]][pos[0]] = { type: TileType.Shoal, fish: null };
    } else if (quality > MAX_TILE_QUALITY) {
      world.map[pos[1]][pos[0]] = { type: TileType.Brine, fish: null };
    } else {
      tile.quality = quality;
    }
  }
}

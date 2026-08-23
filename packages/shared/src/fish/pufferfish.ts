// 河豚: 需要投喂的鱼, 捕捞时消耗 1 点水质。
import { FishType, Tile, TileType } from '../types';
import { BaseFish } from './base';

export class Pufferfish extends BaseFish {
  readonly type = FishType.Pufferfish;
  readonly name = '河豚';
  readonly description = '需要投喂的鱼, 鼓鼓的, 收益较高。';
  readonly qualityCost = 1; // 消耗水质
  readonly stockCost = 30;
  readonly value = 180;
  readonly growCyclesBase = 30;
  readonly hungerCountBase = 2; // 总缺食 2 次
  readonly color = '#f2d24b';

  canStock(tile: Tile): boolean {
    return tile.type !== TileType.Deep;
  }
  /** 养殖条件描述 */
  readonly canStockDesc = '鱼塘 / 浅滩 / 咸水';
}

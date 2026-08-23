// 鲨鱼: 周期长、需投喂的大鱼, 捕捞时消耗 3 点水质。
import { FishType, Tile, TileType } from '../types';
import { BaseFish } from './base';

export class Shark extends BaseFish {
  readonly type = FishType.Shark;
  readonly name = '鲨鱼';
  readonly description = '凶猛的大鱼, 收益高, 需要投喂并消耗部分水质。';
  readonly qualityCost = 3; // 消耗水质
  readonly stockCost = 300;
  readonly value = 700;
  readonly growCyclesBase = 50;
  readonly hungerCountBase = 5; // 总缺食 5 次
  readonly color = '#6b7b8a';

  canStock(tile: Tile): boolean {
    return tile.type === TileType.Pond || tile.type === TileType.Brine;
  }
  /** 养殖条件描述 */
  readonly canStockDesc = '鱼塘 / 咸水';
}

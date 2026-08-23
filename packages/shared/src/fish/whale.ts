// 鲸鱼: 最高价值的鱼, 需要合理规划投喂, 捕捞时消耗 6 点水质 (最耗水质)。
// 浅滩受 3 倍减速 (与基类默认 growCycles 一致, 无特殊周期)。
import { FishType, Tile, TileType } from '../types';
import { BaseFish } from './base';

export class Whale extends BaseFish {
  readonly type = FishType.Whale;
  readonly name = '鲸鱼';
  readonly description = '鱼王, 价值最高, 需要合理规划投喂和水质。';
  readonly qualityCost = 6; // 最耗水质
  readonly stockCost = 1000;
  readonly value = 2000;
  readonly growCyclesBase = 80;
  readonly hungerCountBase = 8; // 总缺食 8 次
  readonly color = '#4a5a6a';

  canStock(tile: Tile): boolean {
    return tile.type === TileType.Pond || tile.type === TileType.Brine;
  }
  /** 养殖条件描述 */
  readonly canStockDesc = '鱼塘 / 咸水';
}

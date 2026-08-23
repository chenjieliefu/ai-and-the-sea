// 沙丁鱼: 生长周期稍长的中阶鱼。
import { FishType, Tile, TileType } from '../types';
import { BaseFish } from './base';

export class Sardine extends BaseFish {
  readonly type = FishType.Sardine;
  readonly name = '沙丁鱼';
  readonly description = '成群的小鱼, 生长周期稍长, 收益更高。';
  readonly stockCost = 20;
  readonly value = 40;
  readonly growCyclesBase = 15;
  readonly hungerCountBase = 0; // 无需投喂
  readonly color = '#8fb0c7';

  canStock(tile: Tile): boolean {
    return tile.type === TileType.Pond || tile.type === TileType.Shoal;
  }
  /** 养殖条件描述 */
  readonly canStockDesc = '鱼塘 / 浅滩';
}

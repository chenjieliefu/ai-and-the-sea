// 小虾: 零成本的基础鱼苗。
// 每种鱼一个文件, 继承 BaseFish; 生长周期用基类默认实现 (浅滩 ×3)。
import { FishType, Tile, TileType } from '../types';
import { BaseFish } from './base';

export class Shrimp extends BaseFish {
  readonly type = FishType.Shrimp;
  readonly name = '小虾';
  readonly description = '零成本的基础鱼苗, 最容易养殖。';
  readonly stockCost = 0;
  readonly value = 5;
  readonly growCyclesBase = 5;
  readonly hungerCountBase = 0; // 无需投喂
  readonly color = '#ef5a6f';

  canStock(tile: Tile): boolean {
    return tile.type === TileType.Pond || tile.type === TileType.Shoal;
  }
  /** 养殖条件描述 */
  readonly canStockDesc = '鱼塘 / 浅滩';
}

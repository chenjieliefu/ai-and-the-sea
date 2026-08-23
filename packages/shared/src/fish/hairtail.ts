// 带鱼: 深水鱼, 让深水区也成为盈利点。
import { FishType, Tile, TileType } from '../types';
import { BaseFish } from './base';

export class Hairtail extends BaseFish {
  readonly type = FishType.Hairtail;
  readonly name = '带鱼';
  readonly description = '深水鱼, 让深水区也成为盈利点。';
  readonly stockCost = 30;
  readonly value = 90;
  readonly growCyclesBase = 40;
  readonly hungerCountBase = 0; // 无需投喂
  readonly color = '#b8c4cc';

  canStock(tile: Tile): boolean {
    return tile.type === TileType.Deep;
  }
  /** 养殖条件描述 */
  readonly canStockDesc = '深水';
}

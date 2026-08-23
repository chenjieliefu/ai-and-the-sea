// StockRow: 投放整行 (以渔船为中心的行 3 格, 按 stocks 顺序,
// 跳过无法投放的格子, 直到行末或数组耗尽), 消耗 3 能量。
import { FishType } from '../types';
import { isFishType } from '../registry';
import type { OpField } from './base';
import { LineStockOp } from './line';

export class StockRow extends LineStockOp {
  static readonly axis = 'row' as const;
  static readonly fields: OpField[] = [{ name: 'stocks', kind: 'fish' }];
  readonly type = 'stockRow';
  constructor(public stocks: FishType[]) {
    super();
    if (!Array.isArray(stocks) || stocks.length === 0 || !stocks.every((c) => isFishType(c))) {
      throw new Error('StockRow 的参数 stocks 必须是非空鱼种类数组 (如 [\'strawberry\', \'grape\'])');
    }
  }
}

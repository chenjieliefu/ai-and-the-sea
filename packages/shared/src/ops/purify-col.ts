// PurifyCol: 改善水质整列 (以渔船为中心的列 3 格, 鱼塘水质 +3, 非鱼塘跳过), 消耗 8 能量。
import { LinePurifyOp } from './line';

export class PurifyCol extends LinePurifyOp {
  readonly type = 'purifyCol';
  static readonly axis = 'col' as const;
}

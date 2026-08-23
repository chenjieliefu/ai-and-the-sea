// PurifyRow: 改善水质整行 (以渔船为中心的行 3 格, 鱼塘水质 +3, 非鱼塘跳过), 消耗 8 能量。
import { LinePurifyOp } from './line';

export class PurifyRow extends LinePurifyOp {
  readonly type = 'purifyRow';
  static readonly axis = 'row' as const;
}

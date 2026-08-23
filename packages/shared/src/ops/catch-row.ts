// CatchRow: 捕捞整行 (以渔船为中心的行 3 格, 竞技模式仅自己半场), 消耗 4 能量。
import { LineCatchOp } from './line';

export class CatchRow extends LineCatchOp {
  readonly type = 'catchRow';
  static readonly axis = 'row' as const;
}

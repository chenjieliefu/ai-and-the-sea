// CatchCol: 捕捞整列 (以渔船为中心的列 3 格, 竞技模式仅自己半场), 消耗 4 能量。
import { LineCatchOp } from './line';

export class CatchCol extends LineCatchOp {
  readonly type = 'catchCol';
  static readonly axis = 'col' as const;
}

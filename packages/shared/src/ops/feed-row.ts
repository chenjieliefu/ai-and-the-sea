// FeedRow: 浇灌整行 (以渔船为中心的行 3 格, 给缺食鱼投喂直到饲料耗尽), 消耗 3 能量。
import { LineFeedOp } from './line';

export class FeedRow extends LineFeedOp {
  readonly type = 'feedRow';
  static readonly axis = 'row' as const;
}

// FeedCol: 浇灌整列 (以渔船为中心的列 3 格, 给缺食鱼投喂直到饲料耗尽), 消耗 3 能量。
import { LineFeedOp } from './line';

export class FeedCol extends LineFeedOp {
  readonly type = 'feedCol';
  static readonly axis = 'col' as const;
}

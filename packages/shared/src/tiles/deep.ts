// 深水: 唯一可补给饲料的水域 (canCollectFeed 重写为 true); 只可养深水鱼。
import { TileType } from '../types';
import { BaseTile } from './base';

export class Deep extends BaseTile {
  readonly type = TileType.Deep;
  readonly name = '深水';
  readonly canCollectFeed = true;
  readonly sprite = 'deep';
  readonly spriteWithFish = 'deep';
  readonly color = '#2c6ba8';
}

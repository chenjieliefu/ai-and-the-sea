// 咸水: 咸水化的产物 (水质超过上限时转化)。养殖时生长周期 ×1.5,
// 投喂次数 ×2; 不可补给饲料。
import { TileType } from '../types';
import { BaseTile } from './base';

export class Brine extends BaseTile {
  readonly type = TileType.Brine;
  readonly name = '咸水';
  readonly growthFactor = 1.5;
  readonly hungerFactor = 2;
  readonly sprite = 'brine';
  readonly spriteWithFish = 'brine_fish';
  readonly color = '#c7c9b8';
}

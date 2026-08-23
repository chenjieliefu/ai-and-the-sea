// 浅滩: 养殖时生长周期 ×3 (growthFactor 重写); 捕捞时易浅滩化 (引擎语义)。
import { TileType } from '../types';
import { BaseTile } from './base';

export class Shoal extends BaseTile {
  readonly type = TileType.Shoal;
  readonly name = '浅滩';
  readonly growthFactor = 3;
  readonly sprite = 'shoal';
  readonly spriteWithFish = 'shoal_fish';
  readonly color = '#9ed3e0';
}

// 水域基类: 每种水域一个文件, 继承 BaseTile 并填写自己的属性。
// 与鱼基类 (fish/base.ts) 同构: 通用字段带默认值 (canCollectFeed=false,
// growthFactor=1, hungerFactor=1), 特殊水域按需重写 (深水补给饲料, 浅滩生长 ×3,
// 咸水生长 ×1.5 且投喂次数 ×2)。
// 鱼生命周期回调 (onFishStocked / onFishFed / onFishCaught) 也定义在此,
// 引擎在对应时机直接调用, 无需 if 硬编码。
import { TileType } from '../types';
import type { TileFishEventContext } from '../types';
import type { TileTypeConfig } from '../registry';

export abstract class BaseTile implements TileTypeConfig {
  abstract readonly type: TileType;
  abstract readonly name: string;
  /** 渔船能否在该水域补给饲料 (默认否, 深水重写为 true) */
  readonly canCollectFeed: boolean = false;
  /** 投放在该水域上的生长周期倍率 (默认 ×1, 浅滩重写为 ×3 / 咸水 ×1.5; BaseFish.growCycles() 消费) */
  readonly growthFactor: number = 1;
  /** 投放在该水域上的投喂次数倍率 (默认 ×1, 咸水重写为 ×2; BaseFish.hungerCount() 消费) */
  readonly hungerFactor: number = 1;
  /** 无鱼时的水域贴图名 (public/sprites/<name>.svg) */
  abstract readonly sprite: string;
  /** 有鱼时的水域贴图名 */
  abstract readonly spriteWithFish: string;
  /** 无贴图时程序化绘制的底色 */
  abstract readonly color: string;

  /** 鱼种下时执行 (多数水域不声明) */
  onFishStocked?(ctx: TileFishEventContext): void;
  /** 鱼投喂时执行 (多数水域不声明) */
  onFishFed?(ctx: TileFishEventContext): void;
  /** 鱼捕捞时执行 (如鱼塘的浅滩化) */
  onFishCaught?(ctx: TileFishEventContext): void;
}

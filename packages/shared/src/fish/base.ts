// 鱼基类: 每种鱼一个文件, 继承 BaseFish 并填写自己的属性。
// 实际生长周期默认由基类的 growCycles() 计算 (按投放水域的 growthFactor,
// 浅滩 ×3 向下取整), 需要特殊周期计算的鱼重写 growCycles()
// (如螃蟹: 20 + 2 × 场上螃蟹总数)。
// 投放判定 (canStock) 与水质消耗 (qualityCost) 也在此声明, 由子类实现/覆盖。
import { FishType, Tile, WorldState } from '../types';
import type { GrownEffectContext, GrowthEffectContext, CatchEffectContext, MaturityEffectContext } from '../types';
import type { FishTypeConfig } from '../registry';
import { TILES } from '../registry';

export abstract class BaseFish implements FishTypeConfig {
  abstract readonly type: FishType;
  abstract readonly name: string;
  abstract readonly description: string;
  /**
   * 是否可以投放在指定水域上: 由子类实现 (基类不判断), 检查 Tile 类型
   * (如 Lotus 只种在深水) 以及需要时的水质等条件。
   */
  abstract canStock(tile: Tile): boolean;
  /** 投放条件的人类可读描述 (如 "鱼塘 / 浅滩"), 与 canStock 保持一致, API 手册展示用 */
  abstract readonly canStockDesc: string;
  /**
   * 水质消耗: 捕捞时若脚下是鱼塘则扣除该值 (负数 = 为鱼塘恢复水质)。
   * 基类默认 0, 子类按需覆盖。
   */
  readonly qualityCost: number = 0;
  abstract readonly stockCost: number;
  abstract readonly value: number;
  /** 基准生长周期 (鱼塘上的回合数; 前端贴图进度也用它) */
  abstract readonly growCyclesBase: number;
  /** 基准总缺食次数 (鱼塘上的次数, 0 = 无需投喂); 缺食时机投放时随机选取 */
  abstract readonly hungerCountBase: number;
  /** 统计图表语义色 (饼图 / 图例 / 进度条共用) */
  abstract readonly color: string;

  /** 成熟特效: 鱼成熟时执行 (多数鱼不声明) */
  onGrown?(ctx: MaturityEffectContext): void;
  /** 成熟后每回合特效: 鱼处于 Grown 状态时每个回合执行 (多数鱼不声明, 如螃蟹扩散) */
  grownUpdate?(ctx: GrownEffectContext): void;
  /** 生长特效: 生长中每个回合执行 (多数鱼不声明) */
  growUpdate?(ctx: GrowthEffectContext): void;
  /** 捕捞特效: 鱼被捕捞时执行 (多数鱼不声明, 如金枪鱼转为鱼塘) */
  onCaught?(ctx: CatchEffectContext): void;

  /**
   * 实际生长周期: 返回投放在该水域上的实际回合数。
   * 默认按投放水域的 growthFactor 计算 (浅滩 ×3 向下取整)。
   * 需要特殊周期计算的鱼重写此函数 (如螃蟹按场上数量)。
   */
  growCycles(tile: Tile, _world: WorldState): number {
    return Math.floor(this.growCyclesBase * TILES[tile.type].growthFactor);
  }

  /**
   * 总缺食次数: 默认 hungerCountBase × 水域投喂倍率 (咸水 ×2)。子类可按需重写。
   */
  hungerCount(tile: Tile, _world: WorldState): number {
    return this.hungerCountBase * TILES[tile.type].hungerFactor;
  }
}

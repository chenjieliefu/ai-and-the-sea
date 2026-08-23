// 水域与鱼的数据注册表。水域配置按"每种水域一个文件"放在 tiles/ 目录
// (继承 BaseTile, 见下); 鱼配置按"每种鱼一个文件"放在 fish/ 目录
// (继承 BaseFish, 见下), 这里只做汇总。
import { FishState, FishType, GrownEffectContext, GrowthEffectContext, CatchEffectContext, MaturityEffectContext, Tile, TileFishEventContext, TileType, WorldState } from './types';
import { INITIAL_TILE_QUALITY } from './config';
import { Pond } from './tiles/pond';
import { Deep } from './tiles/deep';
import { Shoal } from './tiles/shoal';
import { Brine } from './tiles/brine';
import { Shrimp } from './fish/shrimp';
import { Sardine } from './fish/sardine';
import { Pufferfish } from './fish/pufferfish';
import { Hairtail } from './fish/hairtail';
import { Shark } from './fish/shark';
import { Whale } from './fish/whale';
import { Jellyfish } from './fish/jellyfish';
import { Crab } from './fish/crab';
import { Carp } from './fish/carp';
import { Tuna } from './fish/tuna';

export { BaseTile } from './tiles/base';
export { BaseFish } from './fish/base';

export interface TileTypeConfig {
  type: TileType;
  name: string;
  /** 渔船能否在该水域补给饲料 */
  canCollectFeed: boolean;
  /** 投放在该水域上时的生长周期倍率 (浅滩 ×3 / 咸水 ×1.5, 由 BaseFish.growCycles() 消费) */
  growthFactor: number;
  /** 投放在该水域上时的投喂次数倍率 (咸水 ×2, 由 BaseFish.hungerCount() 消费) */
  hungerFactor: number;
  /** 无鱼时的水域贴图名 (public/sprites/<name>.svg) */
  sprite: string;
  /** 有鱼时的水域贴图名; 无则与 sprite 相同 */
  spriteWithFish: string;
  /** 无贴图时程序化绘制的底色 */
  color: string;
  /**
   * 鱼种下时执行: 引擎在鱼种到该水域上后调用 (包括范围投放与螃蟹扩散)。
   * 多数水域不声明 (无特效)。
   */
  onFishStocked?: (ctx: TileFishEventContext) => void;
  /**
   * 鱼投喂时执行: 引擎在给该水域上的缺食鱼投喂后调用 (包括行/列投喂与
   * 鲤鱼的自动投喂)。多数水域不声明 (无特效)。
   */
  onFishFed?: (ctx: TileFishEventContext) => void;
  /**
   * 鱼捕捞时执行: 引擎在捕捞该水域上的鱼后调用 (包括行/列捕捞)。
   * 如鱼塘的浅滩化 (tiles/pond.ts)。多数水域不声明 (无特效)。
   */
  onFishCaught?: (ctx: TileFishEventContext) => void;
}

/**
 * 水域注册表。每种水域是 tiles/<type>.ts 里的一个类 (继承 BaseTile),
 * 这里统一实例化; 通用默认值 (canCollectFeed=false, growthFactor=1, hungerFactor=1)
 * 放在基类, 特殊水域重写 (深水补给饲料 / 浅滩 ×3 / 咸水 ×1.5 且投喂 ×2)。
 */
export const TILES: Record<TileType, TileTypeConfig> = {
  [TileType.Pond]: new Pond(),
  [TileType.Deep]: new Deep(),
  [TileType.Shoal]: new Shoal(),
  [TileType.Brine]: new Brine(),
};

export interface FishTypeConfig {
  type: FishType;
  name: string;
  /** 鱼简介 (API 手册展示用) */
  description: string;
  /**
   * 是否可以投放在指定水域上 (替代原 habitats): 由子类实现, 检查 Tile 类型
   * (如 Lotus 只种在深水) 以及需要时的水质等条件, 基类不判断。
   */
  canStock(tile: Tile): boolean;
  /**
   * 投放条件的人类可读描述 (如 "鱼塘 / 浅滩"、"仅鱼塘"、"鱼塘 (水质 < 6)"),
   * 与 canStock 保持一致; API 手册 (fishDocEntries) 用它拼接鱼的可种描述。
   */
  canStockDesc: string;
  /**
   * 水质消耗: 捕捞时若脚下是鱼塘则扣除该值 (负数 = 为鱼塘恢复水质)。
   * 基类默认 0。
   */
  qualityCost: number;
  /** 投放成本 */
  stockCost: number;
  /** 成熟后捕捞所得 */
  value: number;
  /** 基准生长周期 (鱼塘上的回合数; 前端贴图进度也用它) */
  growCyclesBase: number;
  /**
   * 实际生长周期: 返回投放在指定水域上的实际生长回合数。
   * 默认实现 (BaseFish) 按水域 growthFactor 计算 (浅滩 ×3 向下取整),
   * 需要特殊周期计算的鱼重写 (如螃蟹: 20 + 2 × 场上螃蟹总数)。
   */
  growCycles(tile: Tile, world: WorldState): number;
  /**
   * 总缺食次数: 默认 hungerCountBase × 水域投喂倍率 (咸水 ×2), 由 BaseFish
   * 实现, 子类可按需重写 (如螃蟹随动态周期增减)。
   */
  hungerCount(tile: Tile, world: WorldState): number;
  /**
   * 基准总缺食次数 (鱼塘上的次数): 整个生长周期内总共需要投喂的次数,
   * 0 表示无需投喂。缺食时机在投放时随机选取 (见 rng.ts), 与次数无关。
   */
  hungerCountBase: number;
  /**
   * 统计图表语义色 (饼图 / 进度条 / 图例共用, 由前端消费)。
   * 原前端 stats.ts 的 FISH_COLORS 迁入各鱼自己的文件。
   */
  color: string;
  /**
   * 成熟特效: 鱼成熟时执行的函数 (定义在鱼自己的文件里, 引擎直接调用)。
   * 多数鱼不声明 (无特效)。
   */
  onGrown?: (ctx: MaturityEffectContext) => void;
  /**
   * 成熟后每回合特效: 鱼处于 Grown 状态时每个回合都会执行的函数
   * (定义在鱼自己的文件里, 引擎直接调用)。如螃蟹的扩散。
   * 多数鱼不声明 (无特效)。
   */
  grownUpdate?: (ctx: GrownEffectContext) => void;
  /**
   * 生长特效: 鱼生长中的每个回合都会执行的函数 (定义在鱼自己的文件里, 引擎直接调用)。
   * 多数鱼不声明 (无特效)。
   */
  growUpdate?: (ctx: GrowthEffectContext) => void;
  /**
   * 捕捞特效: 鱼被捕捞时执行的函数 (定义在鱼自己的文件里, 引擎直接调用)。
   * 如金枪鱼: 捕捞后把脚下水域转为鱼塘。多数鱼不声明 (无特效)。
   */
  onCaught?: (ctx: CatchEffectContext) => void;
}

/**
 * 鱼注册表 (与 agent/FISH.md 对应)。
 * 注意: 鱼代码名 (FishType) 与贴图名一致 (public/sprites/fish/<type>_<n>.avif)。
 * 每种鱼是 fish/<type>.ts 里的一个类 (继承 BaseFish), 这里统一实例化。
 */
export const FISHES: Record<FishType, FishTypeConfig> = {
  [FishType.Shrimp]: new Shrimp(),
  [FishType.Sardine]: new Sardine(),
  [FishType.Pufferfish]: new Pufferfish(),
  [FishType.Hairtail]: new Hairtail(),
  [FishType.Shark]: new Shark(),
  [FishType.Whale]: new Whale(),
  [FishType.Jellyfish]: new Jellyfish(),
  [FishType.Crab]: new Crab(),
  [FishType.Carp]: new Carp(),
  [FishType.Tuna]: new Tuna(),
};

export function isFishType(v: unknown): v is FishType {
  return typeof v === 'string' && v in FISHES;
}

export function fishConfig(type: FishType): FishTypeConfig {
  return FISHES[type];
}

/**
 * 鱼可投放的水域类型 (由 canStock 对每种水域逐一探测得出, 供文档/MCP 展示)。
 * 探测时鱼塘按初始水质计算。
 */
export function stockableTiles(cfg: FishTypeConfig): TileType[] {
  return Object.values(TileType).filter((tt) =>
    cfg.canStock({
      type: tt,
      fish: null,
      quality: tt === TileType.Pond ? INITIAL_TILE_QUALITY : undefined,
    })
  );
}

/** 鱼在某一时刻对外暴露的计数 (Grown 为 0, Growing/Hungry 为剩余回合数) */
export function fishInfo(type: FishType, state: FishState, growthRemaining: number) {
  return {
    type,
    state,
    cyclesToGrown: state === FishState.Grown ? 0 : Math.max(0, growthRemaining),
  };
}

// 螃蟹: 成熟后按 [上右下左] 顺序横走扩散 4 只; 场上螃蟹越多生长越慢。
// 全部机制 (成熟特效 onGrown / 成熟后每回合扩散 grownUpdate / 动态周期 growCycles 重写)
// 都定义在本文件, 引擎只负责在对应时机调用回调。
import { FishState, FishType, Position, Tile, TileType, WorldState } from '../types';
import type { GameEvent, GrownEffectContext, MaturityEffectContext } from '../types';
import { TILES } from '../registry';
import { pickHungerPoints, stockingSeed } from '../rng';
import { BaseFish } from './base';

/** 场上螃蟹总数 (用于动态生长周期, 投放/扩散时按当时场上数量计算) */
function countCrab(world: WorldState): number {
  let count = 0;
  for (const row of world.map) {
    for (const t of row) {
      if (t.fish?.type === FishType.Crab) count++;
    }
  }
  return count;
}

export class Crab extends BaseFish {
  readonly type = FishType.Crab;
  readonly name = '螃蟹';
  readonly description = '成熟后横着走, 向周边扩散新的螃蟹, 一共四只。场上螃蟹越多, 螃蟹生长越慢。少量恢复水质。';
  readonly stockCost = 80;
  readonly qualityCost = -2;
  readonly value = 40;
  readonly growCyclesBase = 20;
  readonly hungerCountBase = 1; // 缺食次数固定为 1 次
  readonly color = '#e06a4a';

  canStock(tile: Tile): boolean {
    return tile.type === TileType.Pond;
  }
  /** 养殖条件描述 */
  readonly canStockDesc = '鱼塘';

  /** 动态生长周期: 基础 20 + 2 × 场上螃蟹总数 (忽略水域倍率, 螃蟹只长在鱼塘) */
  growCycles(_tile: Tile, world: WorldState): number {
    return this.growCyclesBase + 2 * countCrab(world);
  }

  /** 成熟特效: 进入扩散期, 之后每回合按上右下左顺序扩散 1 只 (共 4 次) */
  onGrown({ fish }: MaturityEffectContext): void {
    fish.spreadLeft = 4;
  }

  /** 成熟后每回合按 上→右→下→左 顺序扩散 1 只小螃蟹, spreadLeft 到 0 停止 */
  grownUpdate({ world, pos, fish, events }: GrownEffectContext): void {
    if (!fish.spreadLeft || fish.spreadLeft <= 0) return;
    this.spawnCrab(world, pos, 4 - fish.spreadLeft, events);
    fish.spreadLeft -= 1;
  }

  /**
   * 按方向序号 (0=上, 1=右, 2=下, 3=左) 在邻格种下一只新的螃蟹
   * (水域需为空且为鱼塘; 越界或不可养殖则放弃该方向)。
   */
  private spawnCrab(world: WorldState, pos: Position, dirIndex: number, events: GameEvent[]): void {
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
    const [dx, dy] = dirs[dirIndex] ?? [0, 0];
    const nx = pos[0] + dx;
    const ny = pos[1] + dy;
    if (nx < 0 || nx >= world.map[0].length || ny < 0 || ny >= world.map.length) return;
    const tile = world.map[ny][nx];
    if (tile.fish || tile.type !== TileType.Pond) return;
    // 扩散出的螃蟹同样按场上螃蟹总数动态计算生长周期 (本类重写的 growCycles),
    // 缺食时机同样确定性随机 (种子含位置/回合)
    const cycles = this.growCycles(tile, world);
    tile.fish = {
      type: FishType.Crab,
      state: FishState.Growing,
      growthRemaining: cycles,
      hungerAt: pickHungerPoints(
        stockingSeed(world, [nx, ny], FishType.Crab, -1),
        cycles,
        this.hungerCount(tile, world)
      ),
      hungersDone: 0,
    };
    // 扩散种下同样触发水域的"鱼种下"回调
    TILES[tile.type].onFishStocked?.({ world, pos: [nx, ny], fish: tile.fish, events });
    events.push({ type: 'stock', boat: -1, pos: [nx, ny], fish: FishType.Crab });
  }
}

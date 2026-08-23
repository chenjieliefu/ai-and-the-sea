// 操作语义共用的辅助函数 (从 engine.ts 迁出, 供各操作类使用)。
import { FishState, FishType, BoatState, GameEvent, Position, WorldState } from '../types';
import { TILES, fishConfig } from '../registry';
import { inBounds, orthNeighbors } from '../maps';
import { pickHungerPoints, stockingSeed } from '../rng';

/** 以渔船为中心的行/列 3 格范围 (越界跳过) */
export function lineRangePositions(center: Position, axis: 'row' | 'col', world: WorldState): Position[] {
  const out: Position[] = [];
  const c = center[axis === 'row' ? 0 : 1];
  for (let i = c - 1; i <= c + 1; i++) {
    const pos: Position = axis === 'row' ? [i, center[1]] : [center[0], i];
    if (inBounds(world, pos)) out.push(pos);
  }
  return out;
}

/**
 * 间作: 若鱼的四方向邻格至少有 2 个不同于自己种类的鱼, 捕捞收益 +20% (向下取整)。
 */
export function interfishpingValue(world: WorldState, pos: Position, fishType: FishType, base: number): number {
  let diff = 0;
  for (const [nx, ny] of orthNeighbors(pos, world)) {
    const nb = world.map[ny][nx].fish;
    if (nb && nb.type !== fishType) diff++;
  }
  return diff >= 2 ? Math.floor(base * 1.2) : base;
}

/**
 * 尝试在指定格投放鱼 (与单格 Stock 相同的判定: 水域适配 / 无鱼 / 金钱足够)。
 * 成功时扣除成本并写入鱼数据, 返回 true; 任一条件不满足则不改动任何状态, 返回 false。
 * 实际生长周期由鱼自己的 growCycles(tile, world) 计算 (基类默认按水域倍率,
 * 特殊鱼重写, 如螃蟹按场上数量)。
 * 种下后触发该水域的 onFishStocked 回调。
 */
export function tryStockAt(
  world: WorldState,
  boat: BoatState,
  pos: Position,
  fish: FishType,
  events: GameEvent[]
): boolean {
  const cfg = fishConfig(fish);
  const tile = world.map[pos[1]][pos[0]];
  if (!cfg.canStock(tile)) return false;
  if (tile.fish) return false;
  const player = world.players[boat.player];
  if (player.money < cfg.stockCost) return false;
  player.money -= cfg.stockCost;
  // 实际周期 = 鱼 growCycles(tile, world) (基类默认按水域倍率 (浅滩 ×3) 向下取整);
  // 缺食次数 = 鱼 hungerCount(tile, world) (基类默认按周期/间隔 × 水域投喂倍率);
  // 缺食时机 = 投放时确定性随机选取 (hungerAt, 保证回放一致)
  const adjusted = cfg.growCycles(tile, world);
  tile.fish = {
    type: fish,
    state: FishState.Growing,
    growthRemaining: adjusted,
    hungerAt: pickHungerPoints(
      stockingSeed(world, pos, fish, boat.player),
      adjusted,
      cfg.hungerCount(tile, world)
    ),
    hungersDone: 0,
  };
  // 水域的"鱼种下"回调
  TILES[tile.type].onFishStocked?.({ world, pos, fish: tile.fish, events });
  return true;
}

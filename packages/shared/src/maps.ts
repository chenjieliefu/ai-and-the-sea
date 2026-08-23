// 地图定义与生成。
// 单人投放: 7x7, 出生点 (3,3)。
// 竞技模式: 14x7, 左半 7x7 与单人投放相同, 右半为左半的镜像;
//           P1 出生在左半 (3,2)(3,4), P2 出生在镜像位置。
// 竞技模式下双方各自以本地坐标系编程 (P2 的世界为镜像), 因此地图必须关于
// 中轴 (x = 6.5) 镜像对称 —— 这是构建地图时的约束, 不要破坏。
import {
  FishData,
  BoatState,
  PlayerState,
  Position,
  Tile,
  TileType,
  WorldState,
} from './types';
import { START_MONEY, INITIAL_TILE_QUALITY } from './config';

export const SINGLE_WIDTH = 7;
export const SINGLE_HEIGHT = 7;
export const COMBAT_WIDTH = 14;
export const COMBAT_HEIGHT = 7;

/** 单人地图上的深水位置 */
const SINGLE_FEED_TILES: Position[] = [
  [1, 1],
  [2, 1],
  [1, 2],
  [4, 4],
  [4, 5],
  [5, 4],
  [5, 5],
];

/** 单人地图上的浅滩区域: [左上 x, 左上 y, 右下 x, 右下 y], 深水优先于浅滩 */
const SINGLE_SAND_REGIONS: [number, number, number, number][] = [
  [0, 0, 6, 1],
  [0, 2, 2, 3],
];

/** 单人地图出生点 */
const SINGLE_SPAWNS: Position[] = [[3, 3]];

/** 竞技模式 P1 出生点 (左半) */
const COMBAT_SPAWNS_P1: Position[] = [
  [3, 2],
  [3, 4],
];

/**
 * 沿水平中轴镜像坐标。竞技模式 P2 的本地坐标系 = 绝对坐标的镜像。
 * width 必须为偶数 (14), 镜像后左右半场互换。
 */
export function mirrorPosition(pos: Position, width: number): Position {
  return [width - 1 - pos[0], pos[1]];
}

function emptyTile(type: TileType): Tile {
  // 仅鱼塘持有水质属性 (初始 INITIAL_TILE_QUALITY)
  return {
    type,
    fish: null,
    ...(type === TileType.Pond ? { quality: INITIAL_TILE_QUALITY } : {}),
  };
}

function buildMap(width: number, height: number): Tile[][] {
  const map: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) row.push(emptyTile(TileType.Pond));
    map.push(row);
  }
  return map;
}

function isFeedAt(map: Tile[][], pos: Position): boolean {
  return map[pos[1]][pos[0]].type === TileType.Deep;
}

/** 铺设单人地图左半的地形: 深水优先, 其次是浅滩区域 (只覆盖鱼塘) */
function applyLandscape(map: Tile[][]): void {
  for (const [x, y] of SINGLE_FEED_TILES) map[y][x] = emptyTile(TileType.Deep);
  for (const [x1, y1, x2, y2] of SINGLE_SAND_REGIONS) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (map[y][x].type === TileType.Pond) map[y][x] = emptyTile(TileType.Shoal);
      }
    }
  }
}

/**
 * 本局随机种子: 未显式传入时随机取得。种子对玩家不可预测 (避免把随机机制
 * 硬编码进代码), 且计入回放文件, 回放时用同一种子重推演。
 */
function drawSeed(seed?: number): number {
  return seed ?? Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export function createSingleWorld(maxTurns: number, rngSeed?: number): WorldState {
  const map = buildMap(SINGLE_WIDTH, SINGLE_HEIGHT);
  applyLandscape(map);
  const spawn = SINGLE_SPAWNS[0];
  const boat: BoatState = {
    id: 0,
    player: 0,
    position: [spawn[0], spawn[1]],
    feed: 0,
    energy: 0,
    bounty: 0,
    interceptTarget: null,
    interceptZone: null,
  };
  const players: PlayerState[] = [{ id: 0, money: START_MONEY, alive: true }];
  return { mode: 'single', map, boats: [boat], players, turn: 0, maxTurns, rngSeed: drawSeed(rngSeed) };
}

export function createCombatWorld(maxTurns: number, rngSeed?: number): WorldState {
  const map = buildMap(COMBAT_WIDTH, COMBAT_HEIGHT);
  // 左半与单人地图相同 (含浅滩)
  applyLandscape(map);
  // 右半为左半的镜像
  for (let y = 0; y < SINGLE_HEIGHT; y++) {
    for (let x = 0; x < SINGLE_WIDTH; x++) {
      const [mx, my] = mirrorPosition([x, y], COMBAT_WIDTH);
      map[my][mx] = emptyTile(map[y][x].type);
    }
  }
  const boats: BoatState[] = [];
  const spawnsP2 = COMBAT_SPAWNS_P1.map((p) => mirrorPosition(p, COMBAT_WIDTH));
  const spawns = [...COMBAT_SPAWNS_P1, ...spawnsP2];
  spawns.forEach((pos, i) => {
    boats.push({
      id: i,
      player: i < 2 ? 0 : 1,
      position: [pos[0], pos[1]],
      feed: 0,
      energy: 0,
      bounty: 0,
      interceptTarget: null,
      interceptZone: null,
    });
  });
  const players: PlayerState[] = [
    { id: 0, money: START_MONEY, alive: true },
    { id: 1, money: START_MONEY, alive: true },
  ];
  return { mode: 'combat', map, boats, players, turn: 0, maxTurns, rngSeed: drawSeed(rngSeed) };
}

/**
 * 判断某坐标是否属于某玩家的半场。
 * 单人投放: 处处都是自己的半场。
 * 竞技模式: P1 半场为绝对坐标 x < width/2, P2 半场为 x >= width/2
 * (P2 本地坐标中的"左半"对应绝对坐标的右半)。
 */
export function isOwnHalfAt(world: WorldState, player: number, pos: Position): boolean {
  if (world.mode !== 'combat') return true;
  const half = world.map[0].length / 2;
  return player === 0 ? pos[0] < half : pos[0] >= half;
}

/** 判断渔船当前是否位于自己的半场 */
export function isOwnHalf(world: WorldState, boat: BoatState): boolean {
  return isOwnHalfAt(world, boat.player, boat.position);
}

export function inBounds(world: WorldState, pos: Position): boolean {
  return (
    pos[0] >= 0 && pos[0] < world.map[0].length && pos[1] >= 0 && pos[1] < world.map.length
  );
}

export function tileAt(world: WorldState, pos: Position): Tile {
  return world.map[pos[1]][pos[0]];
}

export function samePos(a: Position, b: Position): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** 上下左右四个正交邻格 (越界跳过) */
export function orthNeighbors(pos: Position, world: WorldState): Position[] {
  const out: Position[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = pos[0] + dx;
    const ny = pos[1] + dy;
    if (nx >= 0 && nx < world.map[0].length && ny >= 0 && ny < world.map.length) {
      out.push([nx, ny]);
    }
  }
  return out;
}

/** 供测试/调试使用的辅助: 在当前水域投放鱼 */
export function placeFish(world: WorldState, pos: Position, fish: FishData): void {
  world.map[pos[1]][pos[0]].fish = fish;
}

export function isFeed(world: WorldState, pos: Position): boolean {
  return isFeedAt(world.map, pos);
}

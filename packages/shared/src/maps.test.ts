import { describe, expect, it } from 'vitest';
import {
  COMBAT_HEIGHT,
  COMBAT_WIDTH,
  SINGLE_HEIGHT,
  SINGLE_WIDTH,
  createCombatWorld,
  createSingleWorld,
  mirrorPosition,
} from './maps';
import { TileType } from './types';

describe('maps', () => {
  it('单人地图 7x7, 出生点在 (3,3)', () => {
    const w = createSingleWorld(300);
    expect(w.map.length).toBe(SINGLE_HEIGHT);
    expect(w.map[0].length).toBe(SINGLE_WIDTH);
    expect(w.boats).toHaveLength(1);
    expect(w.boats[0].position).toEqual([3, 3]);
    expect(w.mode).toBe('single');
  });

  it('单人地图深水位置正确', () => {
    const w = createSingleWorld(300);
    const feedTiles = [
      [1, 1], [2, 1], [1, 2],
      [4, 4], [4, 5], [5, 4], [5, 5],
    ];
    for (const [x, y] of feedTiles) expect(w.map[y][x].type).toBe(TileType.Deep);
    expect(w.map[3][3].type).toBe(TileType.Pond);
  });

  it('单人地图浅滩区域正确: (0,0)-(6,1) 与 (0,2)-(2,3) 为浅滩, 深水不被覆盖', () => {
    const w = createSingleWorld(300);
    for (let x = 0; x <= 6; x++) {
      for (let y = 0; y <= 1; y++) {
        const t = w.map[y][x].type;
        // 深水 (1,1)(2,1) 优先于浅滩
        if ((x === 1 || x === 2) && y === 1) expect(t).toBe(TileType.Deep);
        else expect(t).toBe(TileType.Shoal);
      }
    }
    for (let x = 0; x <= 2; x++) {
      for (let y = 2; y <= 3; y++) {
        const t = w.map[y][x].type;
        if (x === 1 && y === 2) expect(t).toBe(TileType.Deep);
        else expect(t).toBe(TileType.Shoal);
      }
    }
    // 区域外仍是鱼塘
    expect(w.map[4][3].type).toBe(TileType.Pond);
  });

  it('竞技地图 14x7, 左右半场互为镜像', () => {
    const w = createCombatWorld(300);
    expect(w.map.length).toBe(COMBAT_HEIGHT);
    expect(w.map[0].length).toBe(COMBAT_WIDTH);
    for (let y = 0; y < COMBAT_HEIGHT; y++) {
      for (let x = 0; x < COMBAT_WIDTH / 2; x++) {
        const [mx, my] = mirrorPosition([x, y], COMBAT_WIDTH);
        expect(w.map[my][mx].type).toBe(w.map[y][x].type);
      }
    }
  });

  it('竞技地图双方出生点互为镜像, 各自在自己的半场', () => {
    const w = createCombatWorld(300);
    expect(w.boats).toHaveLength(4);
    const p1 = w.boats.filter((d) => d.player === 0);
    const p2 = w.boats.filter((d) => d.player === 1);
    expect(p1.map((d) => d.position)).toEqual([[3, 2], [3, 4]]);
    expect(p2.map((d) => d.position)).toEqual([[10, 2], [10, 4]]);
    for (const d of p1) expect(d.position[0]).toBeLessThan(7);
    for (const d of p2) expect(d.position[0]).toBeGreaterThanOrEqual(7);
  });

  it('单人地图左半 = 竞技地图左半', () => {
    const single = createSingleWorld(300);
    const combat = createCombatWorld(300);
    for (let y = 0; y < SINGLE_HEIGHT; y++) {
      for (let x = 0; x < SINGLE_WIDTH; x++) {
        expect(combat.map[y][x].type).toBe(single.map[y][x].type);
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import { normalizeOp } from './ops';
import { CollectFeed, Clear, Catch, Intercept, Move, NewBoat, Stock, StockCol, StockRow, Teleport, Feed } from './player-api';
import { FishType } from './types';

describe('normalizeOp: 玩家操作类 (class API)', () => {
  it('Move 实例 → 纯对象 { type: "move", to }', () => {
    const r = normalizeOp(new Move([1, 2]));
    expect(r).toEqual({ ok: true, op: { type: 'move', to: [1, 2] } });
  });

  it('Teleport 实例 → 纯对象 { type: "teleport", to }', () => {
    expect(normalizeOp(new Teleport([6, 3]))).toEqual({ ok: true, op: { type: 'teleport', to: [6, 3] } });
    expect(() => new Teleport('x' as never)).toThrow(/坐标/);
  });

  it('NewBoat 实例 → 纯对象 { type: "newBoat", at }', () => {
    expect(normalizeOp(new NewBoat([6, 6]))).toEqual({ ok: true, op: { type: 'newBoat', at: [6, 6] } });
    expect(() => new NewBoat([1] as never)).toThrow(/坐标/);
  });

  it('Stock 实例 → 纯对象 { type: "stock", fish }', () => {
    const r = normalizeOp(new Stock(FishType.Shrimp));
    expect(r).toEqual({ ok: true, op: { type: 'stock', fish: 'shrimp' } });
  });

  it('StockRow / StockCol 实例 → 纯对象 { type, stocks }', () => {
    expect(normalizeOp(new StockRow([FishType.Shrimp, FishType.Sardine])))
      .toEqual({ ok: true, op: { type: 'stockRow', stocks: ['shrimp', 'sardine'] } });
    expect(normalizeOp(new StockCol([FishType.Whale])))
      .toEqual({ ok: true, op: { type: 'stockCol', stocks: ['whale'] } });
    // 空数组 / 非法鱼抛错
    expect(() => new StockRow([])).toThrow(/非空鱼种类数组/);
    expect(() => new StockCol(['cucumber' as never])).toThrow(/非空鱼种类数组/);
    // 纯对象形式校验
    expect(normalizeOp({ type: 'stockRow', stocks: [] }).ok).toBe(false);
    expect(normalizeOp({ type: 'stockCol', stocks: ['cucumber'] }).ok).toBe(false);
  });

  it('CollectFeed / Feed / Catch / Clear → 无参操作', () => {
    expect(normalizeOp(new CollectFeed())).toEqual({ ok: true, op: { type: 'collectFeed' } });
    expect(normalizeOp(new Feed())).toEqual({ ok: true, op: { type: 'feed' } });
    expect(normalizeOp(new Catch())).toEqual({ ok: true, op: { type: 'catch' } });
    expect(normalizeOp(new Clear())).toEqual({ ok: true, op: { type: 'clear' } });
  });

  it('Intercept 实例 → 纯对象 { type: "intercept", at }', () => {
    expect(normalizeOp(new Intercept([3, 4]))).toEqual({ ok: true, op: { type: 'intercept', at: [3, 4] } });
  });

  it('构造函数参数非法时抛错 (Move / Stock / Intercept)', () => {
    expect(() => new Move('abc' as never)).toThrow(/坐标/);
    expect(() => new Stock('cucumber' as never)).toThrow(/鱼/);
    expect(() => new Intercept([1] as never)).toThrow(/坐标/);
  });

  it('纯对象形式仍然兼容', () => {
    expect(normalizeOp({ type: 'move', to: [1, 1] })).toEqual({ ok: true, op: { type: 'move', to: [1, 1] } });
    expect(normalizeOp(null)).toEqual({ ok: true, op: null });
    expect(normalizeOp({ type: 'fly' }).ok).toBe(false);
  });

  it('操作类实例的额外字段被丢弃, 输出干净纯对象', () => {
    const op = new Move([1, 1]) as unknown as Record<string, unknown>;
    op.hack = 'x';
    const r = normalizeOp(op);
    expect(r.ok && r.op).toEqual({ type: 'move', to: [1, 1] });
  });

  it('类名被压缩 (constructor.name 不可靠) 时仍能识别操作', () => {
    // 浏览器构建的 minifier 会把 class Move 重命名为单字母,
    // 识别必须依赖实例上的 type 字段, 而不是 constructor.name
    const op = new Move([1, 1]);
    Object.defineProperty(op.constructor, 'name', { value: 'l' });
    expect(normalizeOp(op)).toEqual({ ok: true, op: { type: 'move', to: [1, 1] } });
    const caught = new Catch();
    Object.defineProperty(caught.constructor, 'name', { value: 'x' });
    expect(normalizeOp(caught)).toEqual({ ok: true, op: { type: 'catch' } });
  });
});

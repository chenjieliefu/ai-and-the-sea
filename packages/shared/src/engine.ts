// 回合引擎: 接收各渔船本回合的操作, 完成语义校验、移动仲裁、
// 拦截/偷菜结算与鱼生长, 输出事件流。
//
// 设计约定:
// - 所有操作效果视为"回合结束瞬间同时发生", 冲突 (同一格子多个渔船)
//   按"代码执行时间短者优先"仲裁。
// - 每种操作是一个 class (ops/<type>.ts), 继承 BoatOperation 并通过重写
//   静态方法 apply() 实现自己的语义; 引擎阶段 1 只按 type 查 OP_CLASSES
//   注册表 (ops/index.ts) 并调用 cls.apply(), 不再有 if-else / 处理器字典。
// - 移动/传送在 apply() 里登记移动候选, NewBoat 登记回合末延迟创建请求,
//   其余操作直接修改世界。
import {
  FishData,
  FishState,
  GameEvent,
  InternalOperation,
  Position,
  WorldState,
} from './types';
import { fishConfig } from './registry';
import { inBounds, isOwnHalf, samePos } from './maps';
import { opClassOf } from './ops';
import type { MoveCandidate, TurnSession } from './ops';

/** 某架渔船本回合的动作 */
export interface BoatAction {
  op: InternalOperation | null;
  /** run() 执行耗时 (毫秒), 用于冲突仲裁 */
  durationMs: number;
}
/**
 * 执行一个回合。
 * @param actions 全局渔船 id → 动作
 * @returns 本回合产生的事件 (不含 turn/snapshot/end, 由 GameController 补充)
 */
export function stepTurn(world: WorldState, actions: Record<number, BoatAction>): GameEvent[] {
  const events: GameEvent[] = [];
  const moveCandidates: MoveCandidate[] = [];
  /** NewBoat 待创建请求 (回合结束统一创建, 避免遍历中修改渔船列表) */
  const newBoatRequests: { player: number; pos: Position }[] = [];
  const session: TurnSession = { moveCandidates, newBoatRequests };

  // 阶段 1: 语义校验并执行非移动操作, 收集移动候选。
  // 每个操作类实现自己的 apply(): 移动/传送登记移动候选, NewBoat 登记延迟创建,
  // 其余直接修改世界。这里只做注册表分发, 无 if-else。
  for (const boat of world.boats) {
    const act = actions[boat.id];
    if (!act || !act.op) continue;
    const cls = opClassOf(act.op.type);
    if (!cls) {
      events.push({ type: 'invalid-op', boat: boat.id, message: `未知操作类型: ${String(act.op.type)}` });
      continue;
    }
    const result = cls.apply({ world, boat, events, durationMs: act.durationMs }, act.op, session);
    if (!result.ok) {
      events.push({ type: 'invalid-op', boat: boat.id, message: result.message ?? '操作无效' });
    }
  }

  // 阶段 2: 移动仲裁。先按 (耗时, 全局id) 排序, 依次"认领"目标格;
  // 目标格被任何渔船最终位置占据则移动失败 (本回合原地不动)。
  const finalPositions = new Map<number, Position>();
  for (const d of world.boats) finalPositions.set(d.id, d.position);

  moveCandidates.sort((a, b) => a.durationMs - b.durationMs || a.boat.id - b.boat.id);
  const accepted = new Set<number>();
  for (const m of moveCandidates) {
    if (!inBounds(world, m.to)) {
      events.push({ type: 'move-blocked', boat: m.boat.id, to: m.to, reason: 'out-of-bounds' });
      continue;
    }
    let conflict = false;
    for (const [id, pos] of finalPositions) {
      if (id !== m.boat.id && samePos(pos, m.to)) {
        conflict = true;
        break;
      }
    }
    if (conflict) {
      events.push({ type: 'move-blocked', boat: m.boat.id, to: m.to, reason: 'occupied' });
      continue;
    }
    finalPositions.set(m.boat.id, m.to);
    accepted.add(m.boat.id);
  }
  for (const m of moveCandidates) {
    if (!accepted.has(m.boat.id)) continue;
    const from: Position = [m.boat.position[0], m.boat.position[1]];
    m.boat.position = m.to;
    events.push({ type: 'move', boat: m.boat.id, from, to: m.to });
  }

  // 阶段 3: 回合结束结算 —— 拦截 (单格 / 行 / 列), 然后偷菜资金带回
  for (const boat of world.boats) {
    const target = boat.interceptTarget;
    if (!target) continue;
    boat.interceptTarget = null;
    for (const other of world.boats) {
      if (other.player === boat.player || other.bounty <= 0) continue;
      if (!samePos(other.position, target)) continue;
      const bounty = other.bounty;
      other.bounty = 0;
      world.players[boat.player].money += bounty;
      events.push({
        type: 'intercept',
        boat: boat.id,
        pos: [target[0], target[1]],
        thief: other.id,
        bounty,
      });
    }
  }
  for (const boat of world.boats) {
    const zone = boat.interceptZone;
    if (!zone) continue;
    boat.interceptZone = null;
    // 以施法点为中心的行/列 3 格范围
    for (const other of world.boats) {
      if (other.player === boat.player || other.bounty <= 0) continue;
      const dist = zone.axis === 'row'
        ? Math.abs(other.position[1] - zone.center[1])
        : Math.abs(other.position[0] - zone.center[0]);
      if (dist > 1) continue;
      const bounty = other.bounty;
      other.bounty = 0;
      world.players[boat.player].money += bounty;
      events.push({
        type: 'intercept',
        boat: boat.id,
        pos: [other.position[0], other.position[1]],
        thief: other.id,
        bounty,
      });
    }
  }
  for (const boat of world.boats) {
    if (boat.bounty > 0 && isOwnHalf(world, boat)) {
      const bounty = boat.bounty;
      boat.bounty = 0;
      world.players[boat.player].money += bounty;
      events.push({
        type: 'stash',
        boat: boat.id,
        pos: [boat.position[0], boat.position[1]],
        bounty,
      });
    }
  }

  // 阶段 4: 鱼生长
  tickFishs(world, events);

  // 阶段 5: 创建新渔船 (NewBoat, 下一回合开始执行代码)。
  // 目标格被任何渔船的最终位置占据则创建失败 (金钱已在阶段 1 扣除)。
  for (const req of newBoatRequests) {
    if (world.boats.some((d) => samePos(d.position, req.pos))) {
      events.push({ type: 'invalid-op', boat: -1, message: 'NewBoat 失败: 目标位置已被占据' });
      continue;
    }
    const id = world.boats.reduce((m, d) => Math.max(m, d.id), -1) + 1;
    world.boats.push({
      id,
      player: req.player,
      position: [req.pos[0], req.pos[1]],
      feed: 0,
      energy: 0,
      bounty: 0,
      interceptTarget: null,
      interceptZone: null,
    });
    events.push({ type: 'new-boat', boat: id, pos: [req.pos[0], req.pos[1]] });
  }

  return events;
}

function tickFishs(world: WorldState, events: GameEvent[]): void {
  for (let y = 0; y < world.map.length; y++) {
    for (let x = 0; x < world.map[y].length; x++) {
      const fish = world.map[y][x].fish;
      if (!fish) continue;
      tickFish(world, fish, [x, y], events);
    }
  }
}

function tickFish(world: WorldState, fish: FishData, pos: Position, events: GameEvent[]): void {
  const cfg = fishConfig(fish.type);
  if (fish.state === FishState.Growing) {
    fish.growthRemaining -= 1;
    if (fish.growthRemaining <= 0) {
      fish.state = FishState.Grown;
      fish.growthRemaining = 0;
      events.push({ type: 'fish-grow', pos, state: FishState.Grown, cyclesToGrown: 0 });
      // 成熟特效 (onGrown): 鱼成熟时执行其挂接的特效 (多数鱼未声明, 无操作)。
      // 特效函数直接定义在鱼自己的文件里 (fish/<type>.ts), 引擎直接调用。
      cfg.onGrown?.({ world, pos, fish, events });
    } else {
      // 生长特效 (growUpdate): 每个生长回合都会执行 (多数鱼未声明, 无操作)。
      cfg.growUpdate?.({ world, fish, pos, events });

      // 缺食触发: 投放时随机选取的触发点 (hungerAt, 降序), 生长到该剩余回合数时缺食。
      // 随机只改变时机、不改变次数, 且对玩家隐藏 (API 不暴露); 回放因种子确定而一致。
      const hungerAt = fish.hungerAt ?? [];
      const done = fish.hungersDone ?? 0;
      if (done < hungerAt.length && fish.growthRemaining === hungerAt[done]) {
        fish.state = FishState.Hungry;
        fish.hungersDone = done + 1;
        events.push({ type: 'fish-grow', pos, state: FishState.Hungry, cyclesToGrown: 0 });
      } else {
        events.push({
          type: 'fish-grow',
          pos,
          state: FishState.Growing,
          cyclesToGrown: fish.growthRemaining,
        });
      }
    }
  } else if (fish.state === FishState.Hungry) {
    // 缺食: 长期保持 Hungry, 不枯萎; 生长不推进, 等待投喂后恢复
    events.push({ type: 'fish-grow', pos, state: FishState.Hungry, cyclesToGrown: 0 });
  } else if (fish.state === FishState.Grown) {
    // 成熟后每回合特效 (grownUpdate): 每个鱼成熟后每个回合都会执行其挂接的特效
    // (多数鱼不声明, 无操作)。特效函数直接定义在鱼自己的文件里
    // (fish/<type>.ts), 引擎直接调用。
    // 如螃蟹: 按上右下左顺序扩散 1 株小螃蟹 (FishData.spreadLeft, 到 0 停止)。
    cfg.grownUpdate?.({ world, pos, fish, events });
  }
}

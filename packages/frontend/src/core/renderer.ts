// Canvas game renderer: draws tiles/fish/boats, supports zoom (wheel) and drag-to-pan.
// Rendering uses absolute coordinates; the mirror option renders from the opponent's view (combat mode P2).
import type { SnapshotState, FishInfo, Position } from '@aiyu/shared';
import { FishState, FishType, TileType, TILES, fishConfig, MAX_TILE_QUALITY } from '@aiyu/shared';
import { loadSprites, fishStageIndex, growCyclesOf } from './sprites';
import type { Sprites } from './sprites';
import { el } from '../ui/ui';
import { icon } from '../ui/icon';
import { theme } from './theme';

const TILE = 48;
/** Canvas render colors: shares the tokens.css single source of truth with the DOM (read via theme.ts). */
const COLORS = {
  pondGrid: theme.grid,
  feedBorder: theme.feedBorder,
  fishGrowing: theme.fishGrowing,
  fishHungry: theme.fishHungry,
  fishGrown: theme.fishGrown,
  p1: theme.p1,
  p2: theme.p2,
  bounty: theme.bounty,
  feedPip: theme.feedPip,
  intercept: theme.interceptMark,
};

/** Tile effect (color + initial opacity, fades out linearly over time). */
const FX = {
  feed: { color: theme.fxFeed, alpha: 0.45 }, // light blue: feed
  catch: { color: theme.fxCatch, alpha: 0.7 }, // deep gold: catch (starts more opaque)
  intercept: { color: theme.fxIntercept, alpha: 0.45 }, // light red: intercept
  purify: { color: theme.fxPurify, alpha: 0.5 }, // green: purify
} as const;

/** Effect duration (milliseconds). */
const FX_DURATION = 200;

interface TileFx {
  type: keyof typeof FX;
  x: number;
  y: number;
  start: number;
}

export interface RenderOptions {
  /** Render from a mirrored view (combat mode P2's local perspective). */
  mirror?: boolean;
}

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private scale = 1;
  private ox = 0;
  private oy = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private tooltip: HTMLDivElement | null = null;
  private opts: RenderOptions = {};
  private state: SnapshotState | null = null;
  private hoverPos: { x: number; y: number } | null = null;
  private didFit = false;
  /** Whether resize() has sized the bitmap with real layout dimensions (fit only computes in this state). */
  private sized = false;
  private resizeObserver: ResizeObserver | null = null;
  /** Boat movement animation (absolute coordinates from → to). */
  private animations = new Map<number, { from: Position; to: Position; start: number; duration: number }>();
  /** Tile effects (feed/catch/intercept, 0.2s fade), deduplicated by tile key. */
  private fx = new Map<string, TileFx>();
  /** Charge effect: boat id → start time (0.2s green tint). */
  private chargeFx = new Map<number, number>();
  private rafId: number | null = null;
  /** Loaded sprites (null before loading finishes, with procedural draw as fallback). */
  private sprites: Sprites | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    // Canvas size follows layout: it may not be mounted on the DOM yet at construction (size 0),
    // so ResizeObserver fills it in once layout is resolved, without waiting for window resize.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
    }
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // Load sprites asynchronously, falling back to procedural drawing until ready.
    void loadSprites().then((s) => {
      this.sprites = s;
      this.draw();
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0012);
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.scale = Math.min(6, Math.max(0.2, this.scale * factor));
      // Zoom anchored at the cursor.
      const wx = (mx - this.ox) / this.scale;
      const wy = (my - this.oy) / this.scale;
      this.ox = mx - wx * this.scale;
      this.oy = my - wy * this.scale;
      this.draw();
    });
    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (this.dragging) {
        this.ox += e.clientX - this.lastX;
        this.oy += e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.draw();
      } else {
        this.hoverPos = this.screenToTile(mx, my);
        this.draw();
        this.updateTooltip();
      }
    });
    canvas.addEventListener('pointerup', () => (this.dragging = false));
    canvas.addEventListener('pointerleave', () => {
      this.hoverPos = null;
      if (this.tooltip) this.tooltip.style.display = 'none';
      this.draw();
    });
  }

  /** Lazily create the tooltip and attach it to the canvas's current parent.
   *  The canvas may not be mounted yet when the Renderer is constructed (e.g. the
   *  replay screen builds its layout afterwards), so attaching eagerly would put
   *  the absolutely-positioned tooltip under document.body instead of the canvas
   *  host, landing on the top bar. */
  private ensureTooltip(): HTMLDivElement {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'render-tooltip';
      this.tooltip.style.display = 'none';
    }
    const host = this.canvas.parentElement ?? document.body;
    if (this.tooltip.parentElement !== host) host.append(this.tooltip);
    return this.tooltip;
  }

  private resize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w > 0 && h > 0) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.sized = true;
      // If layout was resolved and we have not auto-fit yet, do so here with real dimensions.
      if (!this.didFit) this.fit();
      this.draw();
    }
  }

  setOptions(opts: RenderOptions): void {
    this.opts = opts;
    this.draw();
  }

  /** Zoom/pan to fit the whole map into the canvas. */
  fit(): void {
    if (!this.state) return;
    // Skip when layout is not ready (resize has not sized the bitmap yet); fit again on resize.
    if (!this.sized) return;
    const w = this.state.map[0].length * TILE;
    const h = this.state.map.length * TILE;
    // On first render fill the canvas as much as possible (leave ~3% margin), no longer capped at 1.6x.
    this.scale = Math.min(this.canvas.width / w, this.canvas.height / h, 8) * 0.97;
    this.ox = (this.canvas.width - w * this.scale) / 2;
    this.oy = (this.canvas.height - h * this.scale) / 2;
    this.didFit = true; // Auto-fit only once, then preserve the user's zoom/pan.
    this.draw();
  }

  render(state: SnapshotState): void {
    this.state = state;
    if (!this.didFit) this.fit();
    this.draw();
    // Hover content may change after a snapshot update (boat feed/fish growth, etc.); refresh the top-right panel.
    this.updateTooltip();
  }

  /** Clear the canvas. */
  clear(): void {
    this.state = null;
    this.didFit = false;
    this.animations.clear();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.draw();
  }

  /** Add a move transition animation for a boat (from → to, absolute coordinates). */
  animateBoat(id: number, from: Position, to: Position, duration = 250): void {
    if (from[0] === to[0] && from[1] === to[1]) return;
    this.animations.set(id, { from, to, start: performance.now(), duration });
    this.ensureLoop();
  }

  /** Tile effect: feed (light blue) / catch (light gold) / intercept (light red), covers the whole tile and fades over 0.2s. */
  tileFx(type: 'feed' | 'catch' | 'intercept' | 'purify', x: number, y: number): void {
    this.fx.set(`${x},${y}`, { type, x, y, start: performance.now() });
    this.ensureLoop();
  }

  /** Charge effect: tints the boat green, recovering within 0.2s. */
  chargeFxOn(id: number): void {
    this.chargeFx.set(id, performance.now());
    this.ensureLoop();
  }

  /** Ensure the rAF loop is running (kept alive while any animation/effect persists). */
  private ensureLoop(): void {
    if (this.rafId !== null) return;
    const step = (now: number) => {
      let alive = false;
      for (const [aid, a] of this.animations) {
        if (now - a.start >= a.duration) this.animations.delete(aid);
        else alive = true;
      }
      for (const [key, f] of this.fx) {
        if (now - f.start >= FX_DURATION) this.fx.delete(key);
        else alive = true;
      }
      for (const [cid, start] of this.chargeFx) {
        if (now - start >= FX_DURATION) this.chargeFx.delete(cid);
        else alive = true;
      }
      this.draw();
      this.rafId = alive ? requestAnimationFrame(step) : null;
    };
    this.rafId = requestAnimationFrame(step);
  }

  /** Boat current render position (animation interpolation first, otherwise snapshot position). */
  private animatedPosition(id: number, fallback: Position): Position {
    const a = this.animations.get(id);
    if (!a) return fallback;
    const t = Math.min(1, (performance.now() - a.start) / a.duration);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
    return [
      a.from[0] + (a.to[0] - a.from[0]) * eased,
      a.from[1] + (a.to[1] - a.from[1]) * eased,
    ];
  }

  private rx(x: number): number {
    if (!this.opts.mirror || !this.state) return x;
    return this.state.map[0].length - 1 - x;
  }

  private screenToTile(mx: number, my: number): { x: number; y: number } | null {
    if (!this.state) return null;
    const tx = Math.floor((mx - this.ox) / this.scale / TILE);
    const ty = Math.floor((my - this.oy) / this.scale / TILE);
    const w = this.state.map[0].length;
    const h = this.state.map.length;
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return null;
    return { x: tx, y: ty };
  }

  /** Update the top-right info panel: Tile / boat / fish three sections. */
  private updateTooltip(): void {
    const tip = this.ensureTooltip();
    if (!this.state || !this.hoverPos) {
      tip.style.display = 'none';
      return;
    }
    const { x, y } = this.hoverPos;
    const dx = this.rx(x);
    const tile = this.state.map[y][dx];
    const rows: HTMLElement[] = [];

    // 1. Tile
    // 竞技模式: 屏幕左半 (无论是否镜像视角) 即当前视角的己方半场;
    // 鱼塘: 附带水质信息 (仅鱼塘有 quality)。
    const tileExtras: string[] = [];
    if (this.state.mode === 'combat') {
      tileExtras.push(dx < this.state.map[0].length / 2 ? '己方半场' : '对方半场');
    }
    if (tile.quality !== undefined) {
      tileExtras.push(`水质 ${tile.quality}/${MAX_TILE_QUALITY}`);
    }
    rows.push(
      el('div', { class: 'tt-row' }, [
        el('span', { class: 'tt-title', text: TILES[tile.type].name }),
        el('span', { class: 'muted', text: `  (${x}, ${y})` }),
        ...tileExtras.map((e) => el('span', { class: 'muted', text: ` · ${e}` })),
      ])
    );

    // 2. Boat (if any): number/owner + feed/energy unordered list.
    const boat = this.state.boats.find((d) => d.position[0] === dx && d.position[1] === y);
    if (boat) {
      const owner = boat.player === 0 ? '我方' : '对方';
      rows.push(
        el('div', { class: 'tt-row' }, [
          el('span', { class: 'tt-title', text: `渔船 #${boat.id} (${owner})` }),
        ])
      );
      rows.push(
        el('ul', { class: 'doc-list' }, [
          el('li', {}, [icon('drop', 12), document.createTextNode(` ${boat.feed}`)]),
          el('li', {}, [icon('bolt', 12), document.createTextNode(` ${boat.energy}`)]),
        ])
      );
    }

    // 3. Fish (if any).
    if (tile.fish) {
      const c = tile.fish;
      const cfg = fishConfig(c.type);
      let info: string;
      if (c.state === FishState.Growing) {
        info =
          `生长中, ${c.cyclesToGrown} 回合后成熟` +
          (cfg.hungerCountBase > 0 ? ' · 需定期投喂' : ' · 无需投喂');
      } else if (c.state === FishState.Hungry) {
        info =
          c.cyclesToGrown > 0
            ? `缺食, 投喂后 ${c.cyclesToGrown} 回合成熟`
            : '缺食, 需要投喂';
      } else {
        info = '已成熟, 可捕捞';
      }
      rows.push(
        el('div', { class: 'tt-row' }, [
          el('span', { class: 'tt-title', text: cfg.name }),
          el('span', { text: ` · ${info}` }),
        ])
      );
    }

    tip.replaceChildren(...rows);
    tip.style.display = 'block';
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = theme.bgCanvas;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.state) return;
    const { map, boats } = this.state;

    // Tiles
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const dx = this.rx(x);
        const tile = map[y][dx];
        const px = this.ox + x * TILE * this.scale;
        const py = this.oy + y * TILE * this.scale;
        const s = TILE * this.scale;
        this.drawTile(tile, px, py, s);
        if (tile.fish) this.drawFishTile(tile.fish, px, py, s);
      }
    }

    // Half-field divider (combat mode).
    if (this.state.mode === 'combat') {
      const half = map[0].length / 2;
      const px = this.ox + half * TILE * this.scale;
      ctx.strokeStyle = theme.halfLine;
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, this.oy);
      ctx.lineTo(px, this.oy + map.length * TILE * this.scale);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Intercept markers.
    for (const d of boats) {
      if (d.interceptTarget) {
        const tx = d.interceptTarget[0];
        const ty = d.interceptTarget[1];
        const px = this.ox + this.rx(tx) * TILE * this.scale;
        const py = this.oy + ty * TILE * this.scale;
        ctx.strokeStyle = COLORS.intercept;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px + (TILE * this.scale) / 2, py + (TILE * this.scale) / 2, TILE * this.scale * 0.42, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Tile effects (feed/catch/intercept): cover the current tile, fading within 0.2s (drawn below boats).
    const fxNow = performance.now();
    for (const f of this.fx.values()) {
      const t = (fxNow - f.start) / FX_DURATION;
      if (t < 0 || t >= 1) continue;
      const fx = FX[f.type];
      const alpha = Math.round(fx.alpha * (1 - t) * 255).toString(16).padStart(2, '0');
      const px = this.ox + this.rx(f.x) * TILE * this.scale;
      const py = this.oy + f.y * TILE * this.scale;
      ctx.fillStyle = fx.color + alpha;
      ctx.fillRect(px, py, TILE * this.scale, TILE * this.scale);
    }

    // Boats (drawn last, on the top layer).
    for (const d of boats) {
      const pos = this.animatedPosition(d.id, d.position);
      this.drawBoat(d, this.rx(pos[0]), pos[1]);
    }

    // Hover highlight.
    if (this.hoverPos) {
      const { x, y } = this.hoverPos;
      const px = this.ox + x * TILE * this.scale;
      const py = this.oy + y * TILE * this.scale;
      ctx.strokeStyle = theme.hoverStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, TILE * this.scale - 2, TILE * this.scale - 2);
    }
  }

  /** Draw a single tile: prefer the sprite (from the TILES registry), otherwise draw procedurally. */
  private drawTile(
    tile: { type: TileType; fish: FishInfo | null },
    px: number,
    py: number,
    s: number
  ): void {
    const ctx = this.ctx;
    const cfg = TILES[tile.type];
    // Use the <type>_field variant sprite when a fish is present (e.g. sand_field.svg).
    const sprite = this.sprites?.tiles[tile.fish ? cfg.spriteWithFish : cfg.sprite];
    if (sprite) {
      ctx.drawImage(sprite, px, py, s, s);
      return;
    }
    ctx.fillStyle = cfg.color;
    ctx.fillRect(px, py, s, s);
    if (tile.type === TileType.Deep) {
      ctx.strokeStyle = COLORS.feedBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
    } else {
      ctx.strokeStyle = COLORS.pondGrid;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
    }
  }

  private drawFishTile(fish: FishInfo, px: number, py: number, s: number): void {
    const ctx = this.ctx;
    // Sprite: square covering one cell, selected by growth stage.
    const stages = this.sprites?.fish[fish.type];
    if (stages && stages.length > 0) {
      const idx = fishStageIndex(fish.state, fish.cyclesToGrown, growCyclesOf(fish.type), stages.length);
      const img = stages[Math.min(idx, stages.length - 1)];
      if (img) {
        ctx.drawImage(img, px, py, s, s);
        // Hungry marker: a 💧 emoji in the top-right corner.
        if (fish.state === FishState.Hungry) {
          this.drawHungryMarker(px + s * 0.78, py + s * 0.22, s);
        }
        return;
      }
    }
    // Procedural draw fallback: a little fish (ellipse body + tail + eye), colored per fish.
    const cx = px + s / 2;
    const cy = py + s / 2;
    const color = fishConfig(fish.type).color;
    if (fish.state === FishState.Growing) {
      this.drawFish(cx, cy, s * 0.3, color, fish.type);
    } else if (fish.state === FishState.Hungry) {
      this.drawFish(cx, cy, s * 0.28, color, fish.type);
      this.drawHungryMarker(cx + s * 0.25, cy - s * 0.2, s);
    } else if (fish.state === FishState.Grown) {
      this.drawFish(cx, cy + s * 0.02, s * 0.42, color, fish.type);
    }
  }

  /** Draw a single fish (head to the right) with a species-specific shape and color. */
  private drawFish(cx: number, cy: number, bw: number, color: string, type: FishType): void {
    const ctx = this.ctx;
    const bh = bw * 0.6; // body half-height
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    const eye = (ex: number, ey: number): void => {
      const r = Math.max(1.1, bw * 0.16);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0b1c30';
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
    };

    if (type === FishType.Shrimp) {
      // Curved body + tail fan + antennae.
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, bw * 0.5);
      ctx.beginPath();
      ctx.arc(cx - bw * 0.2, cy, bw * 0.7, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx + bw * 0.4, cy - bw * 0.55);
      ctx.lineTo(cx + bw * 0.95, cy - bw * 0.15);
      ctx.lineTo(cx + bw * 0.4, cy + bw * 0.55);
      ctx.closePath();
      ctx.fill();
      eye(cx - bw * 0.25, cy - bw * 0.25);
      return;
    }

    if (type === FishType.Jellyfish) {
      // Dome + tentacles.
      ctx.beginPath();
      ctx.arc(cx, cy, bw, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = Math.max(1, bw * 0.12);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * bw * 0.35, cy);
        ctx.quadraticCurveTo(cx + i * bw * 0.35, cy + bh * 0.9, cx + i * bw * 0.45, cy + bh * 1.3);
        ctx.stroke();
      }
      eye(cx - bw * 0.35, cy - bh * 0.4);
      eye(cx + bw * 0.35, cy - bh * 0.4);
      return;
    }

    if (type === FishType.Crab) {
      // Round body + two claws.
      ctx.beginPath();
      ctx.ellipse(cx, cy, bw, bh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - bw * 0.95, cy - bh * 0.5, bw * 0.32, 0, Math.PI * 2);
      ctx.arc(cx + bw * 0.95, cy - bh * 0.5, bw * 0.32, 0, Math.PI * 2);
      ctx.fill();
      eye(cx - bw * 0.3, cy - bh * 0.15);
      eye(cx + bw * 0.3, cy - bh * 0.15);
      return;
    }

    if (type === FishType.Whale) {
      // Big body + spout.
      ctx.beginPath();
      ctx.ellipse(cx, cy, bw, bh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + bw * 0.75, cy - bh * 0.1);
      ctx.lineTo(cx + bw * 1.15, cy - bh * 0.7);
      ctx.lineTo(cx + bw * 1.05, cy + bh * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7cc8f4';
      ctx.beginPath();
      ctx.arc(cx - bw * 0.4, cy - bh * 0.8, Math.max(1, bw * 0.1), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      eye(cx + bw * 0.45, cy - bh * 0.3);
      return;
    }

    if (type === FishType.Shark) {
      // Pointed snout + dorsal fin.
      ctx.beginPath();
      ctx.moveTo(cx + bw * 1.15, cy);
      ctx.lineTo(cx + bw * 0.3, cy - bh);
      ctx.lineTo(cx - bw * 0.5, cy - bh * 0.55);
      ctx.lineTo(cx - bw * 0.85, cy);
      ctx.lineTo(cx - bw * 0.5, cy + bh * 0.55);
      ctx.lineTo(cx + bw * 0.3, cy + bh);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + bw * 0.1, cy - bh * 0.6);
      ctx.lineTo(cx + bw * 0.35, cy - bh * 1.3);
      ctx.lineTo(cx + bw * 0.55, cy - bh * 0.6);
      ctx.closePath();
      ctx.fill();
      eye(cx + bw * 0.65, cy - bh * 0.3);
      return;
    }

    if (type === FishType.Pufferfish) {
      // Round spiky body + tiny tail.
      ctx.beginPath();
      ctx.arc(cx, cy, bw * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + bw * 0.8, cy);
      ctx.lineTo(cx + bw * 1.2, cy - bh * 0.5);
      ctx.lineTo(cx + bw * 1.2, cy + bh * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = Math.max(1, bw * 0.1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * bw * 0.85, cy + Math.sin(a) * bw * 0.85);
        ctx.lineTo(cx + Math.cos(a) * bw * 1.1, cy + Math.sin(a) * bw * 1.1);
        ctx.stroke();
      }
      eye(cx + bw * 0.35, cy - bh * 0.3);
      return;
    }

    // Default sleek fish (sardine / carp / tuna / hairtail), tail shape varies slightly.
    const tailW = type === FishType.Hairtail ? bw * 0.35 : bw * 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.5, cy);
    ctx.lineTo(cx - bw * 1.05, cy - tailW);
    ctx.lineTo(cx - bw * 1.05, cy + tailW);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy, bw, bh, 0, 0, Math.PI * 2);
    ctx.fill();
    eye(cx + bw * 0.45, cy - bh * 0.25);
  }

  // Hungry marker: 💧 emoji at the given screen position.
  private drawHungryMarker(x: number, y: number, s: number): void {
    const ctx = this.ctx;
    ctx.font = `${Math.max(10, s * 0.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💧', x, y);
  }

  private drawBoat(
    d: { id: number; player: number; feed: number; bounty: number },
    x: number,
    y: number
  ): void {
    const ctx = this.ctx;
    const px = this.ox + x * TILE * this.scale;
    const py = this.oy + y * TILE * this.scale;
    const s = TILE * this.scale;
    const cx = px + s / 2;
    const cy = py + s / 2;
    const r = s * 0.4;

    const bodySprite = d.player === 0 ? this.sprites?.boat : this.sprites?.boatEnemy;
    if (bodySprite) {
      this.drawBoatSprite(d, bodySprite, cx, cy, s);
    } else {
      // Procedural fallback: simple boat hull + number.
      ctx.fillStyle = d.player === 0 ? COLORS.p1 : COLORS.p2;
      ctx.strokeStyle = theme.boatOutline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.quadraticCurveTo(cx - r, cy - r * 0.2, cx - r, cy + r * 0.6);
      ctx.lineTo(cx - r, cy + r);
      ctx.lineTo(cx + r, cy + r);
      ctx.lineTo(cx + r, cy + r * 0.6);
      ctx.quadraticCurveTo(cx + r, cy - r * 0.2, cx, cy - r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.textOnDark;
      ctx.font = `bold ${Math.max(10, s * 0.3)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(d.id), cx, cy);
    }
    // Charge effect: tints the whole body green, recovering within 0.2s.
    const chargeStart = this.chargeFx.get(d.id);
    if (chargeStart !== undefined) {
      const t = (performance.now() - chargeStart) / FX_DURATION;
      if (t < 1) {
        ctx.fillStyle = `rgba(${theme.chargeTintRgb}, ${(0.45 * (1 - t)).toFixed(2)})`;
        roundRect(ctx, px, py, s, s, s * 0.08);
        ctx.fill();
      }
    }
    // Feed storage (drawn along the lower edge of the scaled body).
    for (let i = 0; i < d.feed; i++) {
      ctx.fillStyle = COLORS.feedPip;
      ctx.beginPath();
      ctx.arc(cx - s * 0.18 + i * s * 0.09, cy + s * 0.21, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fish-stealing bounty pool (top-right of the body).
    if (d.bounty > 0) {
      ctx.fillStyle = COLORS.bounty;
      ctx.beginPath();
      ctx.arc(cx + s * 0.21, cy - s * 0.2, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.textOnBright;
      ctx.font = `bold ${Math.max(8, s * 0.12)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(d.bounty), cx + s * 0.21, cy - s * 0.2 + 1);
    }
  }

  /**
   * Draw a boat in sprite mode: body sprite + forehead number + eyes offset toward movement.
   * The body region of boat.svg is image coordinates (149,143)-(383,324), center (266,233.5);
   * the eyes sprite (89x68) is placed at the body center.
   */
  private drawBoatSprite(
    d: { id: number; player: number; feed: number; bounty: number },
    body: HTMLImageElement,
    cx: number,
    cy: number,
    s: number
  ): void {
    const ctx = this.ctx;
    const IMG_W = 532;
    const IMG_H = 370;
    // Draw the boat filling most of the cell, keeping the sprite's aspect ratio.
    const drawW = s * 0.92;
    const drawH = drawW * (IMG_H / IMG_W);
    const x = cx - drawW / 2;
    const y = cy - drawH / 2;
    ctx.drawImage(body, x, y, drawW, drawH);

    // Number: on the cabin (upper-middle of the boat).
    const idText = String(d.id);
    ctx.font = `bold ${Math.max(8, s * 0.13)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.strokeStyle = theme.boatIdStroke;
    ctx.strokeText(idText, cx, cy - drawH * 0.04);
    ctx.fillStyle = theme.textOnDark;
    ctx.fillText(idText, cx, cy - drawH * 0.04);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

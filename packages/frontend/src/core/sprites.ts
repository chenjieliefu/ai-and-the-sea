// Sprite loading and rendering helpers. Sprites live in public/sprites/:
// - Boats: boat.svg / boat_enemy.svg (hull + cabin)
// - Tiles: loaded via the TILES registry's sprite/spriteWithFish names (pond/pond_fish/deep/shoal/shoal_fish/brine/brine_fish)
// - Fishs: fish/<type>_<n>.avif, square, fill one cell, index 0..n = growth stages
import { FishState, FishType, fishConfig, TILES } from '@aiyu/shared';

export interface Sprites {
  boat: HTMLImageElement | null;
  boatEnemy: HTMLImageElement | null;
  boatEyes: HTMLImageElement | null;
  /** Tile sprites: keys are the sprite / spriteWithFish names in the TILES registry */
  tiles: Record<string, HTMLImageElement | null>;
  /** Per-fish growth stage sprites (0-based index, mapping to <type>_1.._n) */
  fish: Partial<Record<FishType, HTMLImageElement[]>>;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // missing image does not block; renderer falls back to procedural draw
    img.src = src;
  });
}

async function loadFishStages(type: FishType): Promise<HTMLImageElement[]> {
  const stages: HTMLImageElement[] = [];
  for (let i = 1; i <= 8; i++) {
    const img = await loadImage(`/sprites/fish/${type}_${i}.avif`);
    if (!img) break;
    stages.push(img);
  }
  return stages;
}

let cache: Promise<Sprites> | null = null;

/** Load all sprites (module-level cache, shared across screens) */
export function loadSprites(): Promise<Sprites> {
  if (!cache) {
    cache = (async () => {
      const [boat, boatEnemy, boatEyes] = await Promise.all([
        loadImage('/sprites/boat.svg'),
        loadImage('/sprites/boat_enemy.svg'),
        loadImage('/sprites/boat_eyes.svg'),
      ]);
      // Drive tile sprites from the registry: adding a tile type auto-loads its sprite (missing sprite falls back to procedural draw).
      const names = new Set<string>();
      for (const cfg of Object.values(TILES)) {
        names.add(cfg.sprite);
        names.add(cfg.spriteWithFish);
      }
      const entries = await Promise.all(
        [...names].map(async (name) => [name, await loadImage(`/sprites/${name}.svg`)] as const)
      );
      const tiles: Sprites['tiles'] = {};
      for (const [name, img] of entries) tiles[name] = img;
      // Drive from the registry: adding a fish (FishType) auto-loads its sprite (missing sprite falls back to procedural draw).
      const fish: Sprites['fish'] = {};
      await Promise.all(
        Object.values(FishType).map(async (type) => {
          fish[type] = await loadFishStages(type);
        })
      );
      return { boat, boatEnemy, boatEyes, tiles, fish };
    })();
  }
  return cache;
}

/**
 * Compute the growth-stage sprite index a fish should use (0-based).
 * Growth progress = (growCycles - remaining) / (growCycles - 1), mapped only onto
 * stage sprites except the last one —— the last (mature) is used only when state == Grown.
 * Hungry and Growing share the same progress formula (the snapshot carries the remaining
 * cycles at pause time), so after feeding restores growth the sprite stays continuous and
 * never jumps back to a mid placeholder stage.
 */
export function fishStageIndex(
  state: FishState,
  cyclesToGrown: number,
  growCycles: number,
  stages: number
): number {
  const n = Math.max(1, stages);
  if (state === FishState.Grown) return n - 1;
  // In old replay data the Hungry cyclesToGrown is 0, degrading to a mid-stage placeholder.
  if (state === FishState.Hungry && cyclesToGrown <= 0) {
    return Math.min(n - 1, Math.max(0, Math.floor(n / 2)));
  }
  const total = Math.max(1, growCycles);
  const remaining = Math.max(1, Math.min(total, cyclesToGrown));
  const progress = (total - remaining) / Math.max(1, total - 1); // 0 just stocked → 1 about to mature
  return Math.max(0, Math.min(n - 2, Math.floor(progress * Math.max(1, n - 1))));
}

/** Whether a fish's growth-stage sprites have been loaded */
export function hasFishSprites(sprites: Sprites | null, type: FishType): boolean {
  return !!sprites && !!sprites.fish[type] && sprites.fish[type]!.length > 0;
}

/** Number of base grow cycles a fish has (used for stage sprite rendering). */
export function growCyclesOf(type: FishType): number {
  return fishConfig(type).growCyclesBase;
}

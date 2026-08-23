/*
 * Runtime theme token reader.
 * The color source of truth lives in styles/tokens.css (CSS variables); both Canvas
 * rendering (renderer.ts) and API method badges (api-docs.ts) read the same tokens via
 * this module, avoiding duplicate DOM and Canvas color definitions.
 *
 * Reads CSS variables on :root via getComputedStyle; if styles are not loaded yet or the
 * read fails, falls back to defaults below that match tokens.css exactly, ensuring renders
 * never lose colors due to timing anomalies.
 */

/** Read a CSS variable, falling back to a default value on failure. */
function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

/** Canvas render colors (renderer.ts), sourced from tokens.css --color-* / semantic colors */
export const theme = {
  // Tile / canvas
  bgCanvas: cssVar('--bg-canvas', '#0b1c30'),
  grid: cssVar('--color-grid', 'rgba(0, 0, 0, 0.18)'),
  feedBorder: cssVar('--color-feed-border', '#4a9cc9'),

  // Fishs
  fishGrowing: cssVar('--color-fish-growing', '#57c8b8'),
  fishHungry: cssVar('--color-fish-hungry', '#f0a030'),
  fishGrown: cssVar('--color-fish-grown', '#f5c04b'),

  // Boats
  p1: cssVar('--color-p1', '#4fa8e8'),
  p2: cssVar('--color-p2', '#e05848'),

  // Boat accessory markers
  bounty: cssVar('--color-bounty', '#f5c042'),
  feedPip: cssVar('--color-feed-pip', '#4aace0'),
  interceptMark: cssVar('--color-intercept-mark', '#f5d148'),

  // Tile effect colors (independent of alpha)
  fxFeed: cssVar('--color-fx-feed', '#7dd3fc'),
  fxCatch: cssVar('--color-fx-catch', '#f5a03b'),
  fxIntercept: cssVar('--color-fx-intercept', '#f8a5a5'),
  fxPurify: cssVar('--color-fx-purify', '#5fc9b8'),

  // Canvas neutral strokes / shadows
  halfLine: cssVar('--color-half-line', 'rgba(255, 255, 255, 0.5)'),
  hoverStroke: cssVar('--color-hover-stroke', 'rgba(255, 255, 255, 0.9)'),
  boatOutline: cssVar('--color-boat-outline', 'rgba(0, 0, 0, 0.4)'),
  boatIdStroke: cssVar('--color-boat-id-stroke', 'rgba(0, 0, 0, 0.85)'),
  textOnDark: cssVar('--color-text-on-dark', '#ffffff'),
  textOnBright: cssVar('--color-text-on-bright', '#000000'),
  chargeTintRgb: cssVar('--color-charge-tint', '74, 222, 128'),
} as const;

/** API method badge colors (api-docs.ts), sourced from tokens.css --method-* */
export function methodColor(method: string): string {
  switch (method) {
    case 'GET':
      return cssVar('--method-get', '#7ac04c');
    case 'POST':
      return cssVar('--method-post', '#4a8be0');
    case 'WS':
      return cssVar('--method-ws', '#b070e0');
    case 'DELETE':
      return cssVar('--method-delete', '#e05848');
    case 'PUT':
      return cssVar('--method-put', '#f5a03b');
    default:
      return cssVar('--method-default', '#7d7158');
  }
}
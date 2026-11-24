import type { ThemeMessageRule, ThemeSetArgs } from 'claude-code'

type ThemeStyleColor = NonNullable<ThemeMessageRule['backgroundColor']>
type ThemeFillVector = Extract<NonNullable<ThemeMessageRule['fill']>, { vector: unknown }>['vector']

// A torn page edge for each message. The drawing is cut in nine: corners draw once, the edges tile, so the tear
// keeps its grain on a message of any length. The two seam points of each side match, or every tile would step.
const BOX = 160
const SLICE = 16
const STEP = 2

type Corners = readonly [number, number, number, number]

/** The outline of one torn sheet and the inner edge of its aged band, as SVG path data. */
export type Tear = { edge: string; band: string }

function random(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A stable number for a text, so the same answer always gets the same scrap. */
export function seedOf(text: string): number {
  let hash = 2166136261

  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  }

  return hash >>> 0
}

/**
 * How far the tear bites in at each point along a side `length` long, from the box edge: a few slow waves that
 * repeat every `period` from `start`, with fine grain on top. `seam` gives two points that must match.
 */
function side(next: () => number, length: number, low: number, range: number, period: number, start: number, seam?: [number, number]): number[] {
  const waves = [1, 2, 3, 5].map(k => ({ k, size: 1 / k, phase: next() * Math.PI * 2 }))
  const total = waves.reduce((sum, wave) => sum + wave.size, 0)
  const depths = Array.from({ length: Math.round(length / STEP) + 1 }, (_, i) => {
    const x = i * STEP - start
    const swell = waves.reduce((sum, w) => sum + w.size * Math.sin((2 * Math.PI * w.k * x) / period + w.phase), 0) / total

    return low + range * (0.5 + 0.5 * swell) + next() * 0.7
  })

  if (seam !== undefined) {
    depths[seam[1]] = depths[seam[0]] ?? low
  }

  return depths
}

const round = (n: number): string => (Math.round(n * 10) / 10).toString()

type Sides = { top: number[]; right: number[]; bottom: number[]; left: number[] }

/**
 * One closed outline of a `width` by `height` sheet, `extra` further in than the tear (the aged band's inner edge).
 * Each corner is cut off on the diagonal by its own depth: a little for a ragged corner, a lot for the one bitten away.
 */
function outline(width: number, height: number, sides: Sides, corners: Corners, extra: Sides): string {
  const points: [number, number][] = []
  const at = (depths: number[], i: number): number => depths[i] ?? 0
  const [tl, tr, br, bl] = corners
  const across = sides.top.length
  const down = sides.left.length
  const between = (i: number, from: number, to: number, length: number): boolean => i * STEP > from && i * STEP < length - to

  for (let i = 1; i < across - 1; i++) {
    if (between(i, tl, tr, width)) points.push([i * STEP, at(sides.top, i) + at(extra.top, i)])
  }

  for (let i = 1; i < down - 1; i++) {
    if (between(i, tr, br, height)) points.push([width - at(sides.right, i) - at(extra.right, i), i * STEP])
  }

  for (let i = across - 2; i > 0; i--) {
    if (between(i, bl, br, width)) points.push([i * STEP, height - at(sides.bottom, i) - at(extra.bottom, i)])
  }

  for (let i = down - 2; i > 0; i--) {
    if (between(i, tl, bl, height)) points.push([at(sides.left, i) + at(extra.left, i), i * STEP])
  }

  return `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}Z`
}

/**
 * A torn sheet `width` by `height`. With `tile`, the waves repeat between the slice lines so the nine-cut edges tile
 * without a step; without it, they run once along each side.
 */
export function tear(seed: number, width: number, height: number, tile = false, scale = 1, slice = SLICE): Tear {
  const next = random(seed)
  const wave = (length: number) => (tile ? { period: length - 2 * slice, start: slice } : { period: length, start: 0 })
  const seam = (length: number): [number, number] | undefined => (tile ? [slice / STEP, (length - slice) / STEP] : undefined)
  const make = (length: number, low: number, range: number) => {
    const { period, start } = wave(length)

    return side(next, length, low * scale, range * scale, period, start, seam(length))
  }

  const sides = { top: make(width, 0.3, 4), right: make(height, 0.3, 3), bottom: make(width, 0.3, 4.5), left: make(height, 0.3, 3) }
  // One corner of four is bitten off; the others are only ragged. Kept under the slice less the band, so the seams
  // of a tiled sheet are never cut.
  const bitten = Math.floor(next() * 4)
  const corners = [0, 1, 2, 3].map(i => scale * (i === bitten ? 8 + next() * 3 : 2 + next() * 2)) as unknown as Corners
  const band = { top: make(width, 1.4, 2.4), right: make(height, 1.4, 2.4), bottom: make(width, 1.4, 2.4), left: make(height, 1.4, 2.4) }
  const none = { top: [], right: [], bottom: [], left: [] }

  return { edge: outline(width, height, sides, corners, none), band: outline(width, height, sides, corners, band) }
}

// Lifts each scrap off the page as paper lies on paper. A raw shade, so it darkens both modes' page the same way.
const LIFT = { x: 1, y: 3, blur: 7, color: '#00000059' } as const

/**
 * A torn sheet in `paper`, its edge aged a shade towards the page, and the tear itself drawn in a fine line.
 * `scale` and `slice` make a smaller tear for a short row, whose corners must fit inside its height.
 */
export function tornPaper(seed: number, paper: ThemeStyleColor, scale = 1, slice = SLICE): ThemeFillVector {
  const { edge, band } = tear(seed, BOX, BOX, true, scale, slice)

  return {
    viewBox: BOX,
    slice,
    repeat: true,
    paths: [
      { d: edge, color: paper },
      { d: `${edge}${band}`, color: 'surface-0' },
      { d: edge, strokeWidth: 1, color: 'border-strong' },
    ],
  }
}

export function sheet(seed: number, ink: ThemeStyleColor, paper: ThemeStyleColor, rotate?: number): ThemeMessageRule {
  return {
    color: ink,
    backgroundColor: paper,
    fill: { vector: tornPaper(seed, paper) },
    padding: 15,
    shadow: LIFT,
    ...(rotate === undefined ? {} : { rotate }),
  }
}

type ThemeToolRule = NonNullable<NonNullable<ThemeSetArgs['style']>['ToolUse']>

/**
 * A tool call as a note in the margin: a smaller, older scrap with no lift, in the page's second ink. The app's own
 * font stays, because a tool row holds paths and commands that have to be read exactly.
 */
export const MARGIN_NOTE: ThemeToolRule = {
  color: 'text-secondary',
  backgroundColor: 'surface-1',
  fill: { vector: tornPaper(53, 'surface-1', 0.5, 8) },
  paddingX: 12,
  paddingY: 5,
  shadow: 'none',
}

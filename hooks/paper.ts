import type { ThemeMessageRule } from 'claude-code'

type ThemeStyleColor = NonNullable<ThemeMessageRule['backgroundColor']>
type ThemeFillVector = Extract<NonNullable<ThemeMessageRule['fill']>, { vector: unknown }>['vector']

// A torn page edge for each message. The drawing is cut in nine: corners draw once, the edges tile, so the tear
// keeps its grain on a message of any length. The two seam points of each side match, or every tile would step.
const BOX = 160
const SLICE = 16
const STEP = 2
const PERIOD = BOX - 2 * SLICE
const POINTS = BOX / STEP + 1
const SEAM_A = SLICE / STEP
const SEAM_B = (BOX - SLICE) / STEP

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

/**
 * How far the tear bites in at each point along one side, from the box edge: a few slow waves that repeat once per
 * tile, so the seams meet, with fine grain on top.
 */
function side(next: () => number, low: number, range: number): number[] {
  const waves = [1, 2, 3, 5].map(k => ({ k, size: 1 / k, phase: next() * Math.PI * 2 }))
  const total = waves.reduce((sum, wave) => sum + wave.size, 0)
  const depths = Array.from({ length: POINTS }, (_, i) => {
    const x = i * STEP - SLICE
    const swell = waves.reduce((sum, w) => sum + w.size * Math.sin((2 * Math.PI * w.k * x) / PERIOD + w.phase), 0) / total

    return low + range * (0.5 + 0.5 * swell) + next() * 0.7
  })
  depths[SEAM_B] = depths[SEAM_A] ?? low

  return depths
}

type Corners = readonly [number, number, number, number]

const round = (n: number): string => (Math.round(n * 10) / 10).toString()

/**
 * One closed outline, `extra` further in than the tear (the aged band's inner edge). Each corner is cut off on the
 * diagonal by its own depth: a little for a ragged corner, a lot for the one bitten away.
 */
function outline(top: number[], right: number[], bottom: number[], left: number[], corners: Corners, extra: number[]): string {
  const points: [number, number][] = []
  const at = (depths: number[], i: number): number => depths[i] ?? 0
  const inset = (depths: number[], i: number): number => at(depths, i) + at(extra, i)
  const [tl, tr, br, bl] = corners
  const between = (i: number, from: number, to: number): boolean => i * STEP > from && i * STEP < BOX - to

  for (let i = 1; i < POINTS - 1; i++) if (between(i, tl, tr)) points.push([i * STEP, inset(top, i)])
  for (let i = 1; i < POINTS - 1; i++) if (between(i, tr, br)) points.push([BOX - inset(right, i), i * STEP])
  for (let i = POINTS - 2; i > 0; i--) if (between(i, bl, br)) points.push([i * STEP, BOX - inset(bottom, i)])
  for (let i = POINTS - 2; i > 0; i--) if (between(i, tl, bl)) points.push([inset(left, i), i * STEP])

  return `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}Z`
}

/** A torn sheet in `paper`, its edge aged a shade towards the page, and the tear itself drawn in a fine line. */
export function tornPaper(seed: number, paper: ThemeStyleColor): ThemeFillVector {
  const next = random(seed)
  const top = side(next, 0.3, 4)
  const right = side(next, 0.3, 3)
  const bottom = side(next, 0.3, 4.5)
  const left = side(next, 0.3, 3)
  // One corner of four is bitten off; the others are only ragged.
  const bitten = Math.floor(next() * 4)
  // Kept under the slice less the band, so the seams at x 16 and 144 are never cut.
  const corners = [0, 1, 2, 3].map(i => (i === bitten ? 8 + next() * 3 : 2 + next() * 2)) as unknown as Corners
  const band = side(next, 1.4, 2.4)
  const none = band.map(() => 0)
  const edge = outline(top, right, bottom, left, corners, none)

  return {
    viewBox: BOX,
    slice: SLICE,
    repeat: true,
    paths: [
      { d: edge, color: paper },
      { d: `${edge}${outline(top, right, bottom, left, corners, band)}`, color: 'surface-0' },
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
    shadow: 'none',
    ...(rotate === undefined ? {} : { rotate }),
  }
}

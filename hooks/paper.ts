import type { ThemeMessageRule } from 'claude-code'

type ThemeStyleColor = NonNullable<ThemeMessageRule['backgroundColor']>
type ThemeFillVector = Extract<NonNullable<ThemeMessageRule['fill']>, { vector: unknown }>['vector']

// A torn page edge for each message. The drawing is cut in nine: corners draw once, the edges tile, so the tear
// keeps its grain on a message of any length. The two seam points of each side match, or every tile would step.
const BOX = 72
const SLICE = 12
const STEP = 3
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

/** How far the tear bites in at each point along one side, from the box edge. */
function side(next: () => number, low: number, range: number): number[] {
  const depths = Array.from({ length: POINTS }, () => low + next() * range)
  depths[SEAM_B] = depths[SEAM_A] ?? low

  return depths
}

type Corners = readonly [number, number, number, number]

const round = (n: number): string => (Math.round(n * 10) / 10).toString()

/** One closed outline, `extra` points further in than the tear (the aged band's inner edge). */
function outline(top: number[], right: number[], bottom: number[], left: number[], corners: Corners, extra: number[]): string {
  const points: [number, number][] = []
  const at = (depths: number[], i: number): number => depths[i] ?? 0
  const inset = (depths: number[], i: number): number => at(depths, i) + at(extra, i)
  const [tl, tr, br, bl] = corners.map(c => c + at(extra, 0)) as unknown as Corners

  points.push([tl, tl])
  for (let i = 1; i < POINTS - 1; i++) points.push([i * STEP, inset(top, i)])
  points.push([BOX - tr, tr])
  for (let i = 1; i < POINTS - 1; i++) points.push([BOX - inset(right, i), i * STEP])
  points.push([BOX - br, BOX - br])
  for (let i = POINTS - 2; i > 0; i--) points.push([i * STEP, BOX - inset(bottom, i)])
  points.push([bl, BOX - bl])
  for (let i = POINTS - 2; i > 0; i--) points.push([inset(left, i), i * STEP])

  return `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}Z`
}

/** A torn sheet in `paper`, its edge aged a shade towards the page, and the tear itself drawn in a fine line. */
export function tornPaper(seed: number, paper: ThemeStyleColor): ThemeFillVector {
  const next = random(seed)
  const top = side(next, 0.4, 2.8)
  const right = side(next, 0.4, 2.2)
  const bottom = side(next, 0.4, 3.2)
  const left = side(next, 0.4, 2.2)
  // One corner of four is bitten off; the others are only ragged.
  const bitten = Math.floor(next() * 4)
  const corners = [0, 1, 2, 3].map(i => (i === bitten ? 5 + next() * 2 : 1 + next() * 1.5)) as unknown as Corners
  const band = side(next, 1.6, 1.8)
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

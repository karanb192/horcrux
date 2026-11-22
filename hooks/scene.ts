// The page behind the conversation, as one SVG string. Pure vector: gradients, lines and paths, no pictures, no
// filters, no fonts. Light mode is an aged page by day; dark mode is the same page by candlelight.
//
// The root crops to fill any window (`slice`), so the paper, rules and stains may lose their sides. The margin,
// the spine and the ink live in two edge groups that @media rules slide inward as the window narrows, so they stay
// on screen in a square or tall window too.

const W = 1600
const H = 1000

// Where a drop of ink lands when you write: the margins, never the middle where the words sit or the foot where
// the message box sits. Left drops are drawn in the left group, right drops in the right group. Every drop sits
// between y=340 and y=660, which a window as wide as 3.5:1 still shows whole.
const BLOOM_SPOTS: readonly (readonly ['left' | 'right', number, number])[] = [
  ['left', 96, 380],
  ['right', 1512, 470],
  ['left', 120, 560],
  ['right', 1488, 360],
  ['left', 84, 640],
  ['right', 1530, 620],
  ['left', 132, 450],
  ['right', 1500, 540],
]

export const BLOOM_COUNT = BLOOM_SPOTS.length

// With `slice`, a window narrower than 16:10 shows x from 800 - 500a to 800 + 500a, where a is its width over its
// height. Each step slides the edge groups in by at least what that window hides.
// Each entry: a ratio written as tenths (16 is 16/10) and the slide for windows at or below it.
const EDGE_STEPS: readonly (readonly [number, number])[] = [
  [16, 100],
  [14, 200],
  [12, 300],
  [10, 400],
  [8, 500],
  [6, 560],
]

function edgeRules(): string {
  const rules: string[] = []

  for (const [tenths, shift] of EDGE_STEPS) {
    rules.push(
      `@media (max-aspect-ratio: ${tenths}/10){.edge-l{transform:translate(${shift}px,0)}.edge-r{transform:translate(${-shift}px,0)}}`,
    )
  }

  return rules.join('\n')
}

const STYLE = `
.p0{stop-color:#f6ecd3}.p1{stop-color:#ecdcb6}.p2{stop-color:#d6bf8e}
.s0{stop-color:#5a4324;stop-opacity:.28}.s1{stop-color:#5a4324;stop-opacity:0}
.f0{stop-color:#9a6b2f;stop-opacity:.22}.f1{stop-color:#9a6b2f;stop-opacity:0}
.g0{stop-color:#ffc070;stop-opacity:.05}.g1{stop-color:#ffc070;stop-opacity:0}
.k0{stop-color:#1c130b;stop-opacity:.75}.k1{stop-color:#1c130b;stop-opacity:.35}.k2{stop-color:#1c130b;stop-opacity:0}
.rule{stroke:#7f93a6;stroke-opacity:.2;stroke-width:1.2}
.margin{stroke:#b0584a;stroke-opacity:.28;stroke-width:1.6}
.blot{fill:#1c130b;fill-opacity:.62}
.speck{fill:#1c130b;fill-opacity:.45}
.glow{opacity:.85;animation:flicker 7s ease-in-out infinite alternate}
.bloom{opacity:0;transform-box:fill-box;transform-origin:center;animation:soak 3.6s ease-out 1 forwards}
.drop{opacity:0;animation:drop 2.4s ease-out .25s 1 forwards}
@keyframes flicker{0%{opacity:.7}35%{opacity:.95}60%{opacity:.8}100%{opacity:1}}
@keyframes soak{0%{opacity:.85;transform:scale(.15)}30%{opacity:.8;transform:scale(.85)}100%{opacity:0;transform:scale(1.15)}}
@keyframes drop{0%{opacity:.7}100%{opacity:0}}
${edgeRules()}
@media (prefers-color-scheme: dark){
.p0{stop-color:#3a2c1d}.p1{stop-color:#251b12}.p2{stop-color:#140e09}
.s0{stop-color:#000000;stop-opacity:.55}.s1{stop-color:#000000;stop-opacity:0}
.f0{stop-color:#000000;stop-opacity:.25}.f1{stop-color:#000000;stop-opacity:0}
.g0{stop-color:#ffad4d;stop-opacity:.22}.g1{stop-color:#ffad4d;stop-opacity:0}
.k0{stop-color:#050302;stop-opacity:.8}.k1{stop-color:#050302;stop-opacity:.4}.k2{stop-color:#050302;stop-opacity:0}
.rule{stroke:#8a7558;stroke-opacity:.18}
.margin{stroke:#a4574a;stroke-opacity:.3}
.blot{fill:#050302;fill-opacity:.7}
.speck{fill:#050302;fill-opacity:.5}
}
`

function rules(): string {
  const lines: string[] = []

  for (let y = 112; y < H; y += 40) {
    lines.push(`<line class="rule" x1="0" y1="${y}" x2="${W}" y2="${y}"/>`)
  }

  return lines.join('')
}

// Foxing: the brown spots old paper grows, mostly near the edges.
const FOXING: readonly (readonly [number, number, number])[] = [
  [210, 90, 70],
  [1420, 120, 90],
  [1540, 880, 110],
  [260, 930, 80],
  [760, 40, 50],
  [1180, 960, 60],
  [40, 520, 70],
  [1570, 520, 60],
]

function foxing(): string {
  return FOXING.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#oh-fox)"/>`).join('')
}

// Two old blots that were always there: one in the top right corner, one at the bottom left.
const OLD_INK_RIGHT = `
<path class="blot" d="M1452 92c18-14 44-10 52 8 9 19 30 14 34 32 4 20-20 26-18 44 2 16-22 22-34 12-14-11-30 4-44-8-13-11 0-27-10-40-11-15 4-36 20-48z"/>
<circle class="speck" cx="1418" cy="74" r="5"/><circle class="speck" cx="1556" cy="118" r="4"/>
<circle class="speck" cx="1530" cy="196" r="3"/><circle class="speck" cx="1404" cy="150" r="2.5"/>
`

const OLD_INK_LEFT = `
<path class="blot" d="M58 872c10-16 34-18 44-4 12 15 30 8 34 24 4 17-16 24-12 38 3 13-18 20-28 10-11-10-27 2-37-9-9-10 2-22-6-33-7-11-3-18 5-26z"/>
<circle class="speck" cx="150" cy="860" r="4"/><circle class="speck" cx="40" cy="950" r="3"/><circle class="speck" cx="132" cy="958" r="2.5"/>
`

function bloomAt(x: number, y: number): string {
  return [
    `<circle class="bloom" cx="${x}" cy="${y}" r="64" fill="url(#oh-ink)"/>`,
    `<circle class="drop" cx="${x + 52}" cy="${y - 34}" r="5" fill="url(#oh-ink)"/>`,
    `<circle class="drop" cx="${x - 40}" cy="${y + 46}" r="4" fill="url(#oh-ink)"/>`,
    `<circle class="drop" cx="${x + 30}" cy="${y + 58}" r="3" fill="url(#oh-ink)"/>`,
  ].join('')
}

function edges(bloomIndex: number | undefined): string {
  const spot =
    bloomIndex === undefined ? undefined : BLOOM_SPOTS[((bloomIndex % BLOOM_COUNT) + BLOOM_COUNT) % BLOOM_COUNT]
  const ink = (side: 'left' | 'right') => (spot !== undefined && spot[0] === side ? bloomAt(spot[1], spot[2]) : '')

  return [
    '<g class="edge-l">',
    `<rect x="-600" width="750" height="${H}" fill="url(#oh-spine)"/>`,
    `<line class="margin" x1="176" y1="0" x2="176" y2="${H}"/>`,
    OLD_INK_LEFT,
    ink('left'),
    '</g>',
    '<g class="edge-r">',
    OLD_INK_RIGHT,
    ink('right'),
    '</g>',
  ].join('')
}

function page(): string {
  return [
    `<rect width="${W}" height="${H}" fill="url(#oh-paper)"/>`,
    foxing(),
    rules(),
    `<ellipse class="glow" cx="1380" cy="900" rx="760" ry="560" fill="url(#oh-candle)"/>`,
  ].join('')
}

// The spine's gradient runs dark at x=0 of its own box, which starts 600 left of the page, so the shadow stays
// against the window's left edge after the group slides in.
const DEFS = `<defs>
<radialGradient id="oh-paper" cx="50%" cy="46%" r="75%"><stop offset="0" class="p0"/><stop offset=".62" class="p1"/><stop offset="1" class="p2"/></radialGradient>
<linearGradient id="oh-spine" x1="0" x2="1" y1="0" y2="0"><stop offset=".8" class="s0"/><stop offset="1" class="s1"/></linearGradient>
<radialGradient id="oh-fox"><stop offset="0" class="f0"/><stop offset="1" class="f1"/></radialGradient>
<radialGradient id="oh-candle"><stop offset="0" class="g0"/><stop offset="1" class="g1"/></radialGradient>
<radialGradient id="oh-ink"><stop offset="0" class="k0"/><stop offset=".55" class="k1"/><stop offset="1" class="k2"/></radialGradient>
</defs>`

/** The page alone, or the page with a drop of ink soaking into a margin. */
export function scene(bloomIndex?: number): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`,
    `<style>${STYLE}</style>`,
    DEFS,
    page(),
    edges(bloomIndex),
    '</svg>',
  ].join('')
}

/** The box a window of this width-over-height ratio shows, in the scene's units: [left, top, right, bottom]. */
export function visibleBox(aspect: number): readonly [number, number, number, number] {
  if (aspect >= W / H) {
    const half = W / aspect / 2

    return [0, H / 2 - half, W, H / 2 + half]
  }

  const half = (H * aspect) / 2

  return [W / 2 - half, 0, W / 2 + half, H]
}

/** How far the edge groups slide in at this ratio, by the same steps as the @media rules. */
export function edgeShift(aspect: number): number {
  let shift = 0

  for (const [tenths, step] of EDGE_STEPS) {
    if (aspect <= tenths / 10) {
      shift = step
    }
  }

  return shift
}

/** Every drop's centre, by side, for checking what a window keeps. */
export function bloomSpots(): readonly (readonly ['left' | 'right', number, number])[] {
  return BLOOM_SPOTS
}

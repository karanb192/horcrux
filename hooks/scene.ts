// The page behind the conversation, as one SVG string. Pure vector: gradients, lines and paths, no pictures, no
// filters, no fonts. Light mode is an aged page by day; dark mode is the same page by candlelight.

const W = 1600
const H = 1000

// Where a drop of ink lands when you write: the margins, never the middle where the words sit or the foot where
// the message box sits. Index by the bloom's number.
const BLOOM_SPOTS: readonly (readonly [number, number])[] = [
  [96, 300],
  [1512, 420],
  [120, 560],
  [1488, 250],
  [84, 700],
  [1530, 640],
  [132, 180],
  [1500, 760],
]

export const BLOOM_COUNT = BLOOM_SPOTS.length

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
const OLD_INK = `
<path class="blot" d="M1452 92c18-14 44-10 52 8 9 19 30 14 34 32 4 20-20 26-18 44 2 16-22 22-34 12-14-11-30 4-44-8-13-11 0-27-10-40-11-15 4-36 20-48z"/>
<circle class="speck" cx="1418" cy="74" r="5"/><circle class="speck" cx="1556" cy="118" r="4"/>
<circle class="speck" cx="1530" cy="196" r="3"/><circle class="speck" cx="1404" cy="150" r="2.5"/>
<path class="blot" d="M58 872c10-16 34-18 44-4 12 15 30 8 34 24 4 17-16 24-12 38 3 13-18 20-28 10-11-10-27 2-37-9-9-10 2-22-6-33-7-11-3-18 5-26z"/>
<circle class="speck" cx="150" cy="860" r="4"/><circle class="speck" cx="40" cy="950" r="3"/><circle class="speck" cx="132" cy="958" r="2.5"/>
`

function page(): string {
  return [
    `<rect width="${W}" height="${H}" fill="url(#oh-paper)"/>`,
    foxing(),
    rules(),
    `<line class="margin" x1="176" y1="0" x2="176" y2="${H}"/>`,
    OLD_INK,
    `<rect width="150" height="${H}" fill="url(#oh-spine)"/>`,
    `<ellipse class="glow" cx="1380" cy="900" rx="760" ry="560" fill="url(#oh-candle)"/>`,
  ].join('')
}

function bloom(index: number): string {
  const spot = BLOOM_SPOTS[((index % BLOOM_COUNT) + BLOOM_COUNT) % BLOOM_COUNT] ?? BLOOM_SPOTS[0]
  const [x, y] = spot ?? [96, 300]

  return [
    `<circle class="bloom" cx="${x}" cy="${y}" r="64" fill="url(#oh-ink)"/>`,
    `<circle class="drop" cx="${x + 52}" cy="${y - 34}" r="5" fill="url(#oh-ink)"/>`,
    `<circle class="drop" cx="${x - 40}" cy="${y + 46}" r="4" fill="url(#oh-ink)"/>`,
    `<circle class="drop" cx="${x + 30}" cy="${y + 58}" r="3" fill="url(#oh-ink)"/>`,
  ].join('')
}

const DEFS = `<defs>
<radialGradient id="oh-paper" cx="50%" cy="46%" r="75%"><stop offset="0" class="p0"/><stop offset=".62" class="p1"/><stop offset="1" class="p2"/></radialGradient>
<linearGradient id="oh-spine" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="s0"/><stop offset="1" class="s1"/></linearGradient>
<radialGradient id="oh-fox"><stop offset="0" class="f0"/><stop offset="1" class="f1"/></radialGradient>
<radialGradient id="oh-candle"><stop offset="0" class="g0"/><stop offset="1" class="g1"/></radialGradient>
<radialGradient id="oh-ink"><stop offset="0" class="k0"/><stop offset=".55" class="k1"/><stop offset="1" class="k2"/></radialGradient>
</defs>`

/** The page alone, or the page with a drop of ink soaking into it. */
export function scene(bloomIndex?: number): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`,
    `<style>${STYLE}</style>`,
    DEFS,
    page(),
    bloomIndex === undefined ? '' : bloom(bloomIndex),
    '</svg>',
  ].join('')
}

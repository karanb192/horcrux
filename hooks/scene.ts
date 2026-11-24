// The page behind the conversation, as one SVG string. Pure vector: gradients, lines and paths, no pictures, no
// filters, no fonts. An old, blank, water-stained diary page under floating candles; at night, under stars too.
//
// The root crops to fill any window (`slice`). The spine, the margins' ink, the footprints and the seal live in two
// edge groups that @media rules slide inward as the window narrows, so they stay on screen in square or tall windows.

const W = 1600
const H = 1000

/** What the page is doing besides lying there. */
export type SceneState = {
  /** A drop of ink soaking into a margin: its spot. */
  bloom?: number
  /** The other hand writing in the right margin while Claude replies, then its words sinking away. */
  writing?: 'on' | 'sinking'
  /** The page lighting up after /lumos: dim to bright, and the candles catching one by one. */
  entering?: boolean
  /** /nox: a basilisk fang stabs the page, ink bleeds from the wound, and the page goes dark. */
  dying?: boolean
}

// A fixed sequence, so the page is the same art every time it is drawn.
function rng(seed: number): () => number {
  let s = seed

  return () => {
    s = (s * 16807) % 2147483647

    return (s - 1) / 2147483646
  }
}

const f = (n: number) => n.toFixed(1)

function blob(rand: () => number, cx: number, cy: number, r: number, wobble: number, n = 14): string {
  const pts: [number, number][] = []

  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (1 + (rand() * 2 - 1) * wobble)

    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }

  let d = ''

  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n] ?? [cx, cy]
    const p1 = pts[i] ?? [cx, cy]
    const p2 = pts[(i + 1) % n] ?? [cx, cy]
    const p3 = pts[(i + 2) % n] ?? [cx, cy]

    if (i === 0) {
      d += `M${f(p1[0])} ${f(p1[1])}`
    }

    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }

  return `${d}Z`
}

// Where a drop of ink lands when you write: always the same place in the left margin, so the eye learns it. A drop
// that moved round the margins read as random. It sits between y=340 and y=660, which a window as wide as 3.5:1 still
// shows whole.
const BLOOM_SPOTS: readonly (readonly ['left' | 'right', number, number])[] = [['left', 108, 470]]

export const BLOOM_COUNT = BLOOM_SPOTS.length

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
  return EDGE_STEPS.map(
    ([tenths, shift]) =>
      `@media (max-aspect-ratio: ${tenths}/10){.edge-l{transform:translate(${shift}px,0)}.edge-r{transform:translate(${-shift}px,0)}}`,
  ).join('\n')
}

const STYLE = `
.p0{stop-color:#f6ecd3}.p1{stop-color:#ecdcb6}.p2{stop-color:#cfb487}
.s0{stop-color:#5a4324;stop-opacity:.3}.s1{stop-color:#5a4324;stop-opacity:0}
.f0{stop-color:#9a6b2f;stop-opacity:.2}.f1{stop-color:#9a6b2f;stop-opacity:0}
.g0{stop-color:#ffc070;stop-opacity:.05}.g1{stop-color:#ffc070;stop-opacity:0}
.k0{stop-color:#140c06;stop-opacity:.6}.k1{stop-color:#140c06;stop-opacity:0}
.fib{stroke:#7a5a30;stroke-opacity:.07;stroke-width:1}
.tide{fill:none;stroke:#8a6430;stroke-opacity:.08;stroke-width:1.4}.tide2{fill:none;stroke:#8a6430;stroke-opacity:.04;stroke-width:10}
.tidefill{fill:#a07a40;fill-opacity:.035}
.blot{fill:#1c130b;fill-opacity:.6}.speck{fill:#1c130b;fill-opacity:.45}
.ink{fill:#140c06}.vein{fill:none;stroke:#140c06;stroke-linecap:round}.rim{fill:none;stroke:none}
.hand{fill:none;stroke:#2a1a0d;stroke-opacity:.55;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.foot{fill:#2a1a0d;fill-opacity:0;animation:step 26s linear infinite}
.wax{fill:#8e221b}.wax2{fill:#6e1712}.wax3{fill:none;stroke:#b8453a;stroke-width:3;stroke-linecap:round;stroke-opacity:.8}
.stars{display:none}
.glow{opacity:.85;animation:flicker 7s ease-in-out infinite alternate}
.veil{fill:#1a1209;opacity:0}
@keyframes flicker{0%{opacity:.7}35%{opacity:.95}60%{opacity:.8}100%{opacity:1}}
@keyframes step{0%{fill-opacity:0}1.5%{fill-opacity:.42}22%{fill-opacity:.32}34%,100%{fill-opacity:0}}
.bloom{opacity:0;animation:sink 3.8s ease-in 1 forwards}
.core{transform-box:fill-box;transform-origin:center;animation:spread 3.8s cubic-bezier(.2,.7,.3,1) 1 forwards}
.v{stroke-dasharray:1;stroke-dashoffset:1;animation:creep 3.8s ease-out 1 forwards}
@keyframes spread{0%{transform:scale(.1)}30%{transform:scale(1)}100%{transform:scale(1.08)}}
@keyframes creep{0%,8%{stroke-dashoffset:1}55%,100%{stroke-dashoffset:0}}
@keyframes sink{0%{opacity:0}5%{opacity:.92}50%{opacity:.85}100%{opacity:0}}
.w{stroke-dasharray:1;stroke-dashoffset:1;animation:scrawl 9s ease-in-out infinite}
@keyframes scrawl{0%{stroke-dashoffset:1;opacity:1}30%,70%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
.gone{animation:fade 2.4s ease-in 1 forwards}
@keyframes fade{0%{opacity:1}100%{opacity:0}}
.enter{animation:lift 2.8s ease-out 1 forwards}
@keyframes lift{0%{opacity:.75}100%{opacity:0}}
.star{fill:#f6e7c4;opacity:.35;animation:twinkle 6s ease-in-out infinite alternate}
@keyframes twinkle{0%{opacity:.15}100%{opacity:.7}}
.candle{animation:bob 7s ease-in-out infinite alternate}
@keyframes bob{0%{transform:translate(0,0)}100%{transform:translate(0,-10px)}}
.flame{transform-box:fill-box;transform-origin:50% 100%;animation:burn 2.2s ease-in-out infinite alternate}
@keyframes burn{0%{transform:scale(1,1)}100%{transform:scale(.92,1.08)}}
.ignite{transform-box:fill-box;transform-origin:50% 100%;animation:ignite 1.2s ease-out 1 backwards}
@keyframes ignite{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}
.wick{stroke:#2a1a0d;stroke-width:2}
.wax-c{fill:url(#hx-candle-body);stroke:#9c7f4d;stroke-width:1.4}
.wick{stroke:#2a1a0d;stroke-width:2}
.cb0{stop-color:#f4ead2}.cb1{stop-color:#cdbb93}
.fl0{stop-color:#fff6d8}.fl1{stop-color:#ffb347}.fl2{stop-color:#e0661c}
.halo0{stop-color:#ffcf7a;stop-opacity:.4}.halo1{stop-color:#ffcf7a;stop-opacity:0}
.fang{fill:url(#hx-fang);stroke:#4a3a20;stroke-width:2.5;stroke-opacity:.7}
.fang-lit{fill:#fffaf0;opacity:.35}
.stab{animation:stab .55s cubic-bezier(.6,0,.9,.4) 1 backwards}
@keyframes stab{0%{translate:300px -380px}100%{translate:0 0}}
.wound{transform-box:fill-box;transform-origin:center;animation:bleed 3s ease-out .5s 1 backwards}
@keyframes bleed{0%{transform:scale(0)}35%{transform:scale(.8)}100%{transform:scale(1.25)}}
.drip{fill:none;stroke:#140c06;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:run 2.6s ease-in .8s 1 forwards}
@keyframes run{0%{stroke-dashoffset:1}100%{stroke-dashoffset:0}}
.dusk{fill:#0a0604;opacity:0;animation:dusk 3.6s ease-in 1 forwards}
@keyframes dusk{0%,45%{opacity:0}100%{opacity:.7}}
.fg0{stop-color:#f4ead2}.fg1{stop-color:#c7ad7a}
${edgeRules()}
@media (prefers-color-scheme: dark){
.p0{stop-color:#3a2c1d}.p1{stop-color:#251b12}.p2{stop-color:#110b06}
.s0{stop-color:#000000;stop-opacity:.55}.s1{stop-color:#000000;stop-opacity:0}
.f0{stop-color:#000000;stop-opacity:.25}.f1{stop-color:#000000;stop-opacity:0}
.g0{stop-color:#ffad4d;stop-opacity:.24}.g1{stop-color:#ffad4d;stop-opacity:0}
.k0{stop-color:#030201;stop-opacity:.7}.k1{stop-color:#030201;stop-opacity:0}
.fib{stroke:#d9b98a;stroke-opacity:.045}
.tide{stroke:#000000;stroke-opacity:.22}.tide2{stroke:#000000;stroke-opacity:.1}.tidefill{fill:#000000;fill-opacity:.06}
.blot{fill:#050302;fill-opacity:.7}.speck{fill:#050302;fill-opacity:.5}
.ink{fill:#030201}.vein{stroke:#030201}.rim{stroke:#ffb35c;stroke-opacity:.4;stroke-width:2.5}
.hand{stroke:#e9d6ad;stroke-opacity:.45}
.foot{fill:#e9d6ad}
.wax{fill:#7a1a16}.wax2{fill:#5a110e}.wax3{stroke:#a63a30}
.stars{display:inline}
.wax-c{stroke:none}
.halo0{stop-opacity:.55}
.veil{fill:#000000}
}
`

function fibres(): string {
  const rand = rng(11)
  let s = ''

  for (let i = 0; i < 320; i += 1) {
    const x = rand() * W
    const y = rand() * H
    const a = rand() * Math.PI
    const l = 5 + rand() * 11

    s += `<line class="fib" x1="${f(x)}" y1="${f(y)}" x2="${f(x + Math.cos(a) * l)}" y2="${f(y + Math.sin(a) * l)}"/>`
  }

  return s
}

// Two old water rings, the marks of a page that was once soaked through.
function tides(): string {
  const rand = rng(29)
  const ring = (cx: number, cy: number, r: number) => {
    const d = blob(rand, cx, cy, r, 0.12, 18)

    return `<path class="tidefill" d="${d}"/><path class="tide" d="${d}"/><path class="tide2" d="${blob(rand, cx + 6, cy + 4, r * 0.93, 0.14, 16)}"/>`
  }

  return ring(1300, 820, 170) + ring(330, 150, 110)
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
  return FOXING.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#hx-fox)"/>`).join('')
}

const OLD_BLOT = `<path class="blot" d="M58 872c10-16 34-18 44-4 12 15 30 8 34 24 4 17-16 24-12 38 3 13-18 20-28 10-11-10-27 2-37-9-9-10 2-22-6-33-7-11-3-18 5-26z"/>
<circle class="speck" cx="150" cy="860" r="4"/><circle class="speck" cx="40" cy="950" r="3"/><circle class="speck" cx="132" cy="958" r="2.5"/>`

// Someone small and unseen walks up the left margin, one step at a time, and the steps fade behind them.
function footprints(): string {
  let s = ''

  for (let i = 0; i < 14; i += 1) {
    const left = i % 2 === 0
    const x = left ? 78 : 104
    const y = 880 - i * 52
    const tilt = left ? -8 : 8

    const flip = left ? -1 : 1

    s += `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${flip} 1)"><path class="foot" style="animation-delay:${f(i * 0.9)}s" d="M0 -16c5 0 7 5 7 11s-2 10-6 10-6-4-6-10 1-11 5-11zM1 8c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5zM-3 -22a2 2 0 1 0 0.1 0zM1 -24a2 2 0 1 0 0.1 0zM5 -23a1.8 1.8 0 1 0 0.1 0zM8 -20a1.6 1.6 0 1 0 0.1 0z"/></g>`
  }

  return s
}

// A seal of red wax, pressed with a quill crossed over a drop of ink.
const SEAL = (() => {
  const rand = rng(41)

  return `<g transform="translate(1486 160)">
<path class="wax" d="${blob(rand, 0, 0, 46, 0.1, 18)}"/>
<path class="wax2" d="${blob(rand, 0, 0, 34, 0.04, 16)}"/>
<path class="wax3" d="M-16 18 C-6 4 6 -10 18 -22"/>
<path class="wax3" d="M18 -22 C10 -12 2 -4 -4 4"/>
<path class="wax3" d="M2 -10 c0 0 -10 12 -10 18 a10 10 0 0 0 20 0 c0 -6 -10 -18 -10 -18z"/>
</g>`
})()

function bloomAt(index: number, x: number, y: number): string {
  const rand = rng(100 + index)
  let veins = ''

  for (let i = 0; i < 11; i += 1) {
    const a = (i / 11) * Math.PI * 2 + (rand() - 0.5) * 0.5
    const len = 50 + rand() * 80
    const bend = (rand() - 0.5) * 1
    const mx = x + Math.cos(a + bend) * len * 0.55
    const my = y + Math.sin(a + bend) * len * 0.55
    const w = 2.5 + rand() * 3.5

    veins += `<path class="vein v" pathLength="1" stroke-width="${f(w)}" style="animation-delay:${f(0.1 + rand() * 0.4)}s" d="M${x} ${y}Q${f(mx)} ${f(my)} ${f(x + Math.cos(a) * len)} ${f(y + Math.sin(a) * len)}"/>`
  }

  let specks = ''

  for (let i = 0; i < 7; i += 1) {
    const a = rand() * Math.PI * 2
    const d = 60 + rand() * 60

    specks += `<circle class="ink" cx="${f(x + Math.cos(a) * d)}" cy="${f(y + Math.sin(a) * d)}" r="${f(1.5 + rand() * 3)}"/>`
  }

  const core = blob(rand, x, y, 40, 0.28, 16)

  return `<g class="bloom"><circle cx="${x}" cy="${y}" r="96" fill="url(#hx-soak)"/>${veins}<path class="ink core" d="${core}"/><path class="rim core" d="${core}"/>${specks}</g>`
}

// The other hand: lines of unreadable script in the right margin, written one after another while Claude replies.
// When the reply ends they keep writing as they sink away: drawing them whole there made every line appear at once.
function hand(state: 'on' | 'sinking'): string {
  const rand = rng(57)
  let s = ''

  for (let line = 0; line < 6; line += 1) {
    const y = 360 + line * 56
    let d = `M1416 ${y}`
    let x = 1416

    while (x < 1560) {
      const step = 9 + rand() * 9
      const up = 6 + rand() * 12

      d += `c${f(step * 0.3)} ${f(-up)} ${f(step * 0.7)} ${f(-up)} ${f(step)} 0`
      x += step

      if (rand() > 0.72) {
        d += `c${f(-4)} ${f(6)} ${f(4)} ${f(8)} ${f(6)} 0`
        x += 6
      }
    }

    s += `<path class="hand w" pathLength="1" style="animation-delay:${f(line * 1.2)}s" d="${d}"/>`
  }

  return `<g class="${state === 'sinking' ? 'gone' : ''}">${s}</g>`
}

// Candles that float, bob and burn, by day and by night; at night a ceiling of faint stars above them.
function night(entering: boolean): string {
  const rand = rng(73)
  let stars = ''

  for (let i = 0; i < 70; i += 1) {
    stars += `<circle class="star" cx="${f(rand() * W)}" cy="${f(rand() * 300)}" r="${f(0.7 + rand() * 1.3)}" style="animation-delay:${f(-rand() * 6)}s;animation-duration:${f(4 + rand() * 5)}s"/>`
  }

  const CANDLES: readonly (readonly [number, number, number])[] = [
    [140, 120, 1],
    [380, 70, 0.8],
    [620, 150, 0.7],
    [980, 90, 0.75],
    [1220, 140, 0.85],
    [1400, 300, 0.95],
    [230, 330, 0.9],
  ]

  // After /lumos each candle catches in turn: its halo and flame grow from nothing.
  const candles = CANDLES.map(([x, y, scale], i) => {
    const lit = entering ? ` class="ignite" style="animation-delay:${f(0.6 + i * 0.35)}s"` : ''

    return `<g transform="translate(${x} ${y}) scale(${scale})"><g class="candle" style="animation-delay:${f(-i * 1.3)}s">
<rect class="wax-c" x="-9" y="-6" width="18" height="70" rx="3"/>
<line class="wick" x1="0" y1="-6" x2="0" y2="-12"/>
<g${lit}><circle r="46" cy="-26" fill="url(#hx-halo)"/><path class="flame" style="animation-delay:${f(-i * 0.4)}s" fill="url(#hx-flame)" d="M0 -40c6 10 9 17 9 22a9 9 0 0 1-18 0c0-5 3-12 9-22z"/></g>
</g></g>`
  }).join('')

  return `<g class="stars">${stars}</g>${candles}`
}

const DEFS = `<defs>
<radialGradient id="hx-paper" cx="50%" cy="46%" r="75%"><stop offset="0" class="p0"/><stop offset=".62" class="p1"/><stop offset="1" class="p2"/></radialGradient>
<linearGradient id="hx-spine" x1="0" x2="1" y1="0" y2="0"><stop offset=".8" class="s0"/><stop offset="1" class="s1"/></linearGradient>
<radialGradient id="hx-fox"><stop offset="0" class="f0"/><stop offset="1" class="f1"/></radialGradient>
<radialGradient id="hx-candlelight"><stop offset="0" class="g0"/><stop offset="1" class="g1"/></radialGradient>
<radialGradient id="hx-soak"><stop offset="0" class="k0"/><stop offset="1" class="k1"/></radialGradient>
<linearGradient id="hx-candle-body" x1="0" x2="1"><stop offset="0" class="cb0"/><stop offset="1" class="cb1"/></linearGradient>
<radialGradient id="hx-flame" cx="50%" cy="70%" r="60%"><stop offset="0" class="fl0"/><stop offset=".5" class="fl1"/><stop offset="1" class="fl2"/></radialGradient>
<radialGradient id="hx-halo"><stop offset="0" class="halo0"/><stop offset="1" class="halo1"/></radialGradient>
<linearGradient id="hx-fang" x1="0" x2="1" y1="1" y2="0"><stop offset="0" class="fg0"/><stop offset="1" class="fg1"/></linearGradient>
</defs>`

// The wound is in the right margin, clear of the words; the fang comes down from the top right and stays.
const WOUND_X = 1452
const WOUND_Y = 520

// A basilisk fang: a long curved tooth, thick at the root, tip at the origin, root up and to the right.
const FANG =
  'M0 0C14 -34 30 -88 50 -150C66 -204 98 -272 152 -334C166 -350 184 -362 204 -364C226 -366 246 -352 250 -330' +
  'C252 -316 246 -304 236 -294C192 -246 160 -190 138 -134C112 -70 66 -22 0 0Z'
const FANG_LIT = 'M14 -22C40 -70 62 -140 92 -210C110 -252 136 -296 170 -330C150 -290 128 -244 112 -196C92 -132 58 -66 14 -22Z'

function fang(): string {
  const rand = rng(91)
  let drips = ''

  for (let i = 0; i < 5; i += 1) {
    const x = WOUND_X - 40 + i * 20 + (rand() - 0.5) * 8
    const len = 120 + rand() * 220

    drips += `<path class="drip" pathLength="1" stroke-width="${f(4 + rand() * 6)}" style="animation-delay:${f(0.8 + rand() * 0.6)}s" d="M${f(x)} ${WOUND_Y}q${f((rand() - 0.5) * 12)} ${f(len / 2)} ${f((rand() - 0.5) * 16)} ${f(len)}"/>`
  }

  return [
    `<rect class="dusk" x="-600" width="${W + 1200}" height="${H}"/>`,
    `<g class="wound"><path class="ink" d="${blob(rand, WOUND_X, WOUND_Y, 110, 0.32, 18)}"/><path class="ink" opacity=".55" d="${blob(rand, WOUND_X + 10, WOUND_Y + 8, 165, 0.36, 20)}"/></g>`,
    drips,
    `<g class="stab" transform="translate(${WOUND_X} ${WOUND_Y})"><path class="fang" d="${FANG}"/><path class="fang-lit" d="${FANG_LIT}"/></g>`,
  ].join('')
}

function edges(state: SceneState): string {
  const spot =
    state.bloom === undefined ? undefined : BLOOM_SPOTS[((state.bloom % BLOOM_COUNT) + BLOOM_COUNT) % BLOOM_COUNT]
  const ink = (side: 'left' | 'right') =>
    spot !== undefined && spot[0] === side ? bloomAt(state.bloom ?? 0, spot[1], spot[2]) : ''

  return [
    '<g class="edge-l">',
    `<rect x="-600" width="750" height="${H}" fill="url(#hx-spine)"/>`,
    OLD_BLOT,
    footprints(),
    ink('left'),
    '</g>',
    '<g class="edge-r">',
    SEAL,
    state.writing === undefined ? '' : hand(state.writing),
    ink('right'),
    state.dying === true ? fang() : '',
    '</g>',
  ].join('')
}

/** The page, with whatever it is doing now. */
export function scene(state: SceneState = {}): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`,
    `<style>${STYLE}</style>`,
    DEFS,
    `<rect width="${W}" height="${H}" fill="url(#hx-paper)"/>`,
    foxing(),
    fibres(),
    tides(),
    `<ellipse class="glow" cx="1380" cy="900" rx="760" ry="560" fill="url(#hx-candlelight)"/>`,
    night(state.entering === true),
    edges(state),
    state.entering === true ? `<rect class="veil enter" width="${W}" height="${H}"/>` : '',
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

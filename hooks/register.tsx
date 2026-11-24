import type { EngineInterface, Register, ThemeResult } from 'claude-code'

import { COLOR_PROBLEMS, PAGE, lookFor } from './look'
import { BLOOM_COUNT, scene } from './scene'
import type { SceneState } from './scene'

const PLUGIN = 'horcrux'
const OPEN = 'lumos'
const CLOSE = 'nox'
const OFF_KEY = 'off'
const BLOOM_MS = 3800
const SINK_MS = 2600
const ENTER_MS = 6000

// Words for the terminal's spinner while Claude works. Each reads as something a diary does, never as a plain
// status verb, so the line gets noticed.
export const WRITING = [
  'Dipping the quill',
  'Writing back',
  'Turning the pages',
  'Remembering',
  'Reading between the lines',
  'Waiting for the ink',
  'Scratching at the page',
  'Pressing the nib',
  'Ink pooling',
  'Soaking in your words',
  'Listening through the paper',
  'Leafing through old entries',
  'Whispering in ink',
  'Smudging the margins',
  'Turning a yellowed page',
  'Searching old pages',
  'Reading your hand',
  'Remembering fifty years back',
] as const

// Words for the line that closes a turn, which the engine draws as "<word> for 3s".
export const WRITTEN = [
  'Inked',
  'Blotted',
  'Scrawled',
  'Scribbled',
  'Quilled',
  'Smudged',
  'Inscribed',
  'Remembered',
  'Soaked in',
  'Dried',
] as const

// The words a build says when it refuses an attribute it does not know, such as `sound` on an older one.
const UNKNOWN_ATTRIBUTE = /does not know the attribute/

// What this build of Claude Code takes. Learned once per load, and only from a refusal that names an unknown
// attribute: any other failure is passed on and teaches nothing.
let takes: 'all' | 'style' | 'colors' | undefined

// Whether the diary is closed in this session. Undefined until read from the store or set by the command.
let off: boolean | undefined

// Whether the theme standing is this mod's, as far as it can tell. False once a backdrop drawn for another
// plugin is seen. A theme with no moving scene raises no Backdrop render, so it stays unseen: see the README.
let ours = false

// Whether a window has drawn this mod's page. Ink is only worth drawing where someone can see it; a desktop window
// that attaches later draws the page first and so turns this on.
let seen = false

// What the page is doing now, and the timers that end each part of it.
type Timer = { cancel: () => void }

let bloom: number | undefined
let blooms = 0
let drying: Timer | undefined
let writing: SceneState['writing']
let sinking: Timer | undefined
let entering = false
let settling: Timer | undefined

// Where this session draws, from its start. Only a terminal session is told the page shows elsewhere: a desktop
// window can report the theme undrawn for a moment while it attaches, though it draws the page a moment later.
let surface: string | null = null

/** A stable pick from a list, so one spinner word maps to one diary word for the whole session. */
export function pick<T>(list: readonly T[], seed: string): T {
  let hash = 0

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }

  return list[Math.abs(hash) % list.length] as T
}

function refusesAttribute(error: unknown): boolean {
  return UNKNOWN_ATTRIBUTE.test(String(error))
}

/** Reads whether the diary is closed. A store that can't be read leaves it open, and says so in the debug log. */
async function readOff($: EngineInterface): Promise<boolean> {
  try {
    off = (await $.store.get(OFF_KEY)) === true
  } catch (error) {
    off = false
    $.ui.log(`horcrux: could not read the on/off setting, so the diary stays open: ${String(error)}`, { to: 'debug' })
  }

  return off
}

async function isOff($: EngineInterface): Promise<boolean> {
  return off ?? readOff($)
}

/** Sets the whole look once. A build that refuses `sound` or `style` gets the look without it. */
async function setLook($: EngineInterface): Promise<ThemeResult> {
  if (takes === undefined || takes === 'all') {
    try {
      const set = await $.theme.set(lookFor(PAGE, true, true))

      takes = 'all'

      return set
    } catch (error) {
      if (takes === 'all' || !refusesAttribute(error)) {
        throw error
      }
    }
  }

  if (takes === undefined || takes === 'style') {
    try {
      const set = await $.theme.set(lookFor(PAGE, false, true))

      takes = 'style'

      return set
    } catch (error) {
      if (takes === 'style' || !refusesAttribute(error)) {
        throw error
      }
    }
  }

  const set = await $.theme.set(lookFor(PAGE, false, false))

  takes = 'colors'

  return set
}

/** Sets the look, and lights the page: dim to bright, and the candles catch one by one. */
async function open($: EngineInterface): Promise<ThemeResult> {
  const set = await setLook($)

  ours = true
  settling?.cancel()
  entering = true
  $.ui.invalidate('ui.render')
  settling = $.clock.after(ENTER_MS, () => {
    entering = false
    settling = undefined
    $.ui.invalidate('ui.render')
  })

  return set
}

/** While Claude replies, the other hand writes in the right margin; when the reply ends, its words sink away. */
function startWriting($: EngineInterface): void {
  sinking?.cancel()
  sinking = undefined
  writing = 'on'
  $.ui.invalidate('ui.render')
}

function stopWriting($: EngineInterface): void {
  if (writing !== 'on') {
    return
  }

  writing = 'sinking'
  $.ui.invalidate('ui.render')
  sinking = $.clock.after(SINK_MS, () => {
    writing = undefined
    sinking = undefined
    $.ui.invalidate('ui.render')
  })
}

function quiet(): void {
  for (const timer of [drying, sinking, settling]) {
    timer?.cancel()
  }

  drying = sinking = settling = undefined
  bloom = undefined
  writing = undefined
  entering = false
}

/**
 * A drop of ink lands in a margin and soaks in. It redraws this mod's own backdrop and nothing else: where no
 * window draws the page, or another theme stands, nothing shows. A new turn starts a new drop.
 */
function startBloom($: EngineInterface): void {
  drying?.cancel()
  blooms += 1
  bloom = blooms % BLOOM_COUNT
  $.ui.invalidate('ui.render')
  drying = $.clock.after(BLOOM_MS, () => {
    bloom = undefined
    drying = undefined
    $.ui.invalidate('ui.render')
  })
}

/** `/lumos` opens the diary and `/nox` closes it. Either answer is shown to you alone. */
async function spell($: EngineInterface, name: typeof OPEN | typeof CLOSE): Promise<string> {
  const closed = await isOff($)

  if (name === CLOSE) {
    if (!closed && ours) {
      await $.theme.clear()
    }

    ours = false
    quiet()
    off = true
    // Saved even when nothing showed: an explicit close is also the default for new sessions.
    await $.store.set(OFF_KEY, true)
    $.ui.invalidate('ui.render')

    return closed ? 'Nox. The diary was already dark, and stays dark in new sessions too.' : 'Nox. The diary closes. /lumos opens it again.'
  }

  await open($)

  off = false
  await $.store.set(OFF_KEY, false)

  return surface === 'terminal'
    ? 'Lumos. The diary is open. The page and the candles show in the Claude desktop app; here you get the diary\'s words.'
    : 'Lumos. The diary is open. Write something.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)

    surface = e.surface

    await $.command.register({ name: OPEN, description: 'Open the diary: an old page, ink and candlelight (horcrux)' })
    await $.command.register({ name: CLOSE, description: 'Close the diary and bring back the plain app (horcrux)' })

    const unpainted = COLOR_PROBLEMS.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.log(`horcrux: ${unpainted}`, { to: 'debug' })
    }

    if (!(await readOff($))) {
      try {
        await open($)
      } catch (error) {
        $.ui.log(`horcrux: ${String(error)}`, { to: 'debug' })
      }
    }

    return started
  })

  // The main conversation's turns only: a subagent starting its own turn is not you writing. Only `agentId` is read;
  // the prompt and the reply these events carry are never looked at.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined && off !== true && ours && seen) {
      startBloom($)
      startWriting($)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      stopWriting($)
    }

    return next(e)
  })

  // Shown to you alone: the answers never go to the model.
  on('command.run', { command: OPEN }, async ($) => ({
    text: await spell($, OPEN).catch((error: unknown) => `horcrux: ${String(error)}`),
    isTextDisplayOnly: true,
  }))

  on('command.run', { command: CLOSE }, async ($) => ({
    text: await spell($, CLOSE).catch((error: unknown) => `horcrux: ${String(error)}`),
    isTextDisplayOnly: true,
  }))

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== PLUGIN) {
      ours = false

      return next(e)
    }

    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== PAGE) {
      return next(e)
    }

    seen = true

    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        alt="An old diary page, blank and water-stained, with a wax seal; at night, floating candles"
        source={scene({ bloom, writing, entering })}
      />
    )
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || (await isOff($))) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, word: pick(WRITING, e.props.word) } })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    if (await isOff($)) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, word: pick(WRITTEN, e.props.word) } })
  })
}

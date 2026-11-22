import type { EngineInterface, Register, ThemeResult } from 'claude-code'

import { COLOR_PROBLEMS, PAGE, lookFor } from './look'
import { BLOOM_COUNT, scene } from './scene'

const PLUGIN = 'otherhand'
const COMMAND = 'otherhand'
const OFF_KEY = 'off'
const BLOOM_MS = 3800
const BLOOM_PREFIX = `${PAGE}-ink-`

// Present-tense words for the terminal's spinner, and past-tense ones for the line that closes a turn.
export const WRITING = [
  'Inking',
  'Dipping the quill',
  'Writing back',
  'Turning the pages',
  'Remembering',
  'Blotting',
  'Reading between the lines',
  'Waiting for the ink',
] as const

export const WRITTEN = ['Inked', 'Written', 'Penned', 'Blotted'] as const

// What this build of Claude Code takes. A build from before `style` or `sound` refuses the whole set, so the look
// is tried whole first and then with less. Learned once per load.
let takes: 'all' | 'style' | 'colors' | undefined

// Whether the person turned the look off. Read from the store at session start and on each command; until then, on.
let off: boolean | undefined

// Whether the last set said a window draws the look. Ink only blooms where someone can see it.
let drawn = false
let blooming = false
let blooms = 0

/** A stable pick from a list, so one spinner word maps to one diary word for the whole session. */
export function pick<T>(list: readonly T[], seed: string): T {
  let hash = 0

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }

  return list[Math.abs(hash) % list.length] as T
}

/** The bloom number in a scene name such as `page-ink-3`, or undefined for the plain page. */
export function bloomOf(name: string): number | undefined {
  if (!name.startsWith(BLOOM_PREFIX)) {
    return undefined
  }

  const n = Number(name.slice(BLOOM_PREFIX.length))

  return Number.isInteger(n) && n >= 0 && n < BLOOM_COUNT ? n : undefined
}

async function readOff($: EngineInterface): Promise<boolean> {
  try {
    off = (await $.store.get(OFF_KEY)) === true
  } catch {
    off = false
  }

  return off
}

async function setLook($: EngineInterface, sceneName: string): Promise<ThemeResult> {
  if (takes === undefined || takes === 'all') {
    try {
      const set = await $.theme.set(lookFor(sceneName, true, true))

      takes = 'all'

      return set
    } catch (error) {
      if (takes === 'all') {
        throw error
      }
    }
  }

  if (takes === undefined || takes === 'style') {
    try {
      const set = await $.theme.set(lookFor(sceneName, false, true))

      takes = 'style'

      return set
    } catch (error) {
      if (takes === 'style') {
        throw error
      }
    }
  }

  const set = await $.theme.set(lookFor(sceneName, false, false))

  takes = 'colors'

  return set
}

async function open($: EngineInterface): Promise<ThemeResult> {
  const set = await setLook($, PAGE)

  drawn = set.isDrawn

  return set
}

async function settle($: EngineInterface): Promise<void> {
  try {
    if (off !== true) {
      await setLook($, PAGE)
    }
  } catch (error) {
    $.ui.log(`otherhand: ${String(error)}`, { to: 'debug' })
  } finally {
    blooming = false
  }
}

/** A drop of ink soaks into the margin when you write. One at a time; nothing where no window draws the page. */
async function bloom($: EngineInterface): Promise<void> {
  if (blooming || !drawn || off === true) {
    return
  }

  blooming = true
  blooms += 1

  try {
    await setLook($, `${BLOOM_PREFIX}${blooms % BLOOM_COUNT}`)
  } catch (error) {
    blooming = false
    $.ui.log(`otherhand: ${String(error)}`, { to: 'debug' })

    return
  }

  $.clock.after(BLOOM_MS, () => void settle($))
}

async function command($: EngineInterface, args: string): Promise<string> {
  const word = args.trim().toLowerCase()
  const wasOff = await readOff($)
  const wantOff = word === 'off' ? true : word === 'on' ? false : word === '' ? !wasOff : undefined

  if (wantOff === undefined) {
    return 'Try /otherhand, /otherhand on or /otherhand off.'
  }

  await $.store.set(OFF_KEY, wantOff)
  off = wantOff

  if (wantOff) {
    await $.theme.clear()
    drawn = false

    return 'The diary closes. /otherhand opens it again.'
  }

  const set = await open($)

  return set.isDrawn
    ? 'The diary is open. Write something.'
    : 'The diary is open, but this window draws no page. The page shows in the Claude desktop app; the terminal keeps the diary words.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)

    await $.command.register({
      name: COMMAND,
      description: 'Open or close the diary. Add "on" or "off".',
      argumentHint: '[on|off]',
      immediate: true,
    })

    const unpainted = COLOR_PROBLEMS.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.log(`otherhand: ${unpainted}`, { to: 'debug' })
    }

    if (!(await readOff($))) {
      try {
        await open($)
      } catch (error) {
        $.ui.log(`otherhand: ${String(error)}`, { to: 'debug' })
      }
    }

    return started
  })

  on('turn.start', async ($, e, next) => {
    void bloom($)

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => ({
    text: await command($, e.args).catch((error: unknown) => `otherhand: ${String(error)}`),
  }))

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== PLUGIN || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }

    const name = e.props.scene

    if (name !== PAGE && bloomOf(name) === undefined) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg alt="An old diary page, lined, with a few ink blots" source={scene(bloomOf(name))} />
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || off === true || (off === undefined && (await readOff($)))) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, word: pick(WRITING, e.props.word) } })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    if (off === true || (off === undefined && (await readOff($)))) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, word: pick(WRITTEN, e.props.word) } })
  })
}

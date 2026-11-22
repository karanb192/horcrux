import type { EngineInterface, Register, ThemeResult } from 'claude-code'

import { COLOR_PROBLEMS, PAGE, lookFor } from './look'
import { BLOOM_COUNT, scene } from './scene'

const PLUGIN = 'otherhand'
const COMMAND = 'otherhand'
const OFF_KEY = 'off'
const BLOOM_MS = 3800

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

// The words a build says when it refuses an attribute it does not know, such as `sound` on an older one.
const UNKNOWN_ATTRIBUTE = /does not know the attribute/

// What this build of Claude Code takes. Learned once per load, and only from a refusal that names an unknown
// attribute: any other failure is passed on and teaches nothing.
let takes: 'all' | 'style' | 'colors' | undefined

// Whether the diary is closed in this session. Undefined until read from the store or set by the command.
let off: boolean | undefined

// Whether the theme standing is this mod's. False once a backdrop drawn for another plugin is seen, so closing
// the diary never clears a theme someone else chose.
let ours = false

// The drop of ink soaking in now, by its spot, and the timer that dries it.
let bloom: number | undefined
let blooms = 0
let drying: { cancel: () => void } | undefined

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
    $.ui.log(`otherhand: could not read the on/off setting, so the diary stays open: ${String(error)}`, { to: 'debug' })
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

async function open($: EngineInterface): Promise<ThemeResult> {
  const set = await setLook($)

  ours = true

  return set
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

async function command($: EngineInterface, args: string): Promise<string> {
  const word = args.trim().toLowerCase()
  const closed = await isOff($)
  const wantOff = word === 'off' ? true : word === 'on' ? false : word === '' ? !closed : undefined

  if (wantOff === undefined) {
    return 'Try /otherhand, /otherhand on or /otherhand off.'
  }

  if (wantOff) {
    if (closed) {
      return 'The diary is already closed. /otherhand opens it.'
    }

    if (ours) {
      await $.theme.clear()
    }

    ours = false
    drying?.cancel()
    bloom = undefined
    off = true
    await $.store.set(OFF_KEY, true)

    return 'The diary closes. /otherhand opens it again.'
  }

  const set = await open($)

  off = false
  await $.store.set(OFF_KEY, false)

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

  // The main conversation's turns only: a subagent starting its own turn is not you writing.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined && off !== true && ours) {
      startBloom($)
    }

    return next(e)
  })

  // Shown to you alone: the command's answer never goes to the model.
  on('command.run', { command: COMMAND }, async ($, e) => ({
    text: await command($, e.args).catch((error: unknown) => `otherhand: ${String(error)}`),
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

    const { Svg } = $.ui.resolve(e)

    return <Svg alt="An old diary page, lined, with a few ink blots" source={scene(bloom)} />
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

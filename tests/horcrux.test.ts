import { describe, expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput, On, RenderElement, SessionStartInput, ThemeSetArgs } from 'claude-code'

import { lookFor } from '../hooks/look'
import { WRITING, WRITTEN, pick } from '../hooks/register'
import { BLOOM_COUNT, bloomSpots, edgeShift, scene, visibleBox } from '../hooks/scene'

const start: SessionStartInput = { surface: 'desktop', isInteractive: true, cwd: '/work' }
const run = (command: 'lumos' | 'nox'): CommandRunInput => ({
  command,
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
})
// The test environment has timers, but this project's tsconfig loads no DOM or Node types.
declare const setTimeout: (fn: () => void, ms: number) => unknown

const page = { scene: 'page', plugin: 'horcrux', glass: { blur: 10, opacity: 0.6 } } as const
const spinner = { word: 'Sauteing', message: null, suffix: '…', mode: 'responding' } as const
const BLANK: RenderElement = { type: 'Box', props: {}, children: [] } as unknown as RenderElement

/** Stubs every call the mod makes. `refuse` answers a set the way a build that lacks an attribute does. */
function engine(on: On, sets: ThemeSetArgs[], refuse?: (args: ThemeSetArgs) => string | undefined) {
  const store = new Map<string, unknown>()
  let clears = 0

  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('store.get', ($, e) => ({ value: store.get(e.key) }))
  on('store.set', ($, e) => {
    store.set(e.key, e.value)

    return { value: undefined }
  })
  on('theme.set', ($, e) => {
    const refusal = refuse?.(e)

    if (refusal !== undefined) {
      return { deny: refusal }
    }

    sets.push(e)

    return { value: { isDrawn: true, requestId: 'theme' } }
  })
  on('theme.clear', () => {
    clears += 1

    return { value: { isDrawn: false, requestId: 'theme', reason: 'the theme is cleared' } }
  })
  on('ui.log', () => ({ value: undefined }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))

  return { store, clears: () => clears }
}

/** The wave of the done cue's first layer, which tells the melody (bell) from the plain cue. */
function cue(look: ThemeSetArgs | undefined): string | undefined {
  const layer = look?.sound?.cues?.done?.layers[0]

  return layer && 'wave' in layer ? layer.wave : undefined
}

describe('the look', () => {
  test('session start sets the page with cursive type and sound, once', async ($, on) => {
    const sets: ThemeSetArgs[] = []

    engine(on, sets)
    await $.session.start(start)

    expect(sets).toHaveLength(1)
    expect(sets[0]?.backdrop).toMatchObject({ scene: 'page' })
    expect(sets[0]?.style?.Text?.fontFamily).toEqual(['cursive'])
    expect(sets[0]?.sound?.cues?.send).toBeDefined()
  })

  test('a build that does not know sound still gets the page and the type', async ($, on) => {
    const sets: ThemeSetArgs[] = []

    engine(on, sets, args => (args.sound !== undefined ? 'theme.set does not know the attribute "sound"' : undefined))
    await $.session.start(start)

    expect(sets).toHaveLength(1)
    expect(sets[0]?.sound).toBeUndefined()
    expect(sets[0]?.style?.Text?.fontFamily).toEqual(['cursive'])
  })

  test('a passing failure does not strip the sound for the rest of the load', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    let failures = 1

    engine(on, sets, () => (failures-- > 0 ? 'the app went away for a moment' : undefined))
    await $.session.start(start)

    expect(sets).toHaveLength(0)

    await $.command.run(run('lumos'))

    expect(sets).toHaveLength(1)
    expect(sets[0]?.sound).toBeDefined()
  })

  test('/nox closes the diary, says so to you alone, and stays closed next session', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const stubs = engine(on, sets)

    await $.session.start(start)
    const closed = await $.command.run(run('nox'))

    expect(closed.text).toContain('Nox')
    expect(closed.isTextDisplayOnly).toBe(true)
    expect(stubs.store.get('off')).toBe(true)
    expect(stubs.clears()).toBe(1)

    await $.session.start(start)
    expect(sets).toHaveLength(1)

    const opened = await $.command.run(run('lumos'))

    expect(opened.text).toContain('Lumos')
    expect(sets).toHaveLength(2)
  })

  test('closing twice clears nothing the second time, and still saves off', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const stubs = engine(on, sets)

    await $.session.start(start)
    await $.command.run(run('nox'))
    stubs.store.set('off', false)
    const again = await $.command.run(run('nox'))

    expect(again.text).toContain('already silent')
    expect(stubs.clears()).toBe(1)
    expect(stubs.store.get('off')).toBe(true)
  })

  test("closing never clears a theme another plugin set", async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const stubs = engine(on, sets)

    on('ui.render', { component: 'Backdrop' }, () => BLANK)
    await $.session.start(start)
    await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: { ...page, plugin: 'lagoon-mod' } })
    await $.command.run(run('nox'))

    expect(stubs.clears()).toBe(0)
    expect(stubs.store.get('off')).toBe(true)
  })

})

describe('the ink', () => {
  test('writing draws a drop of ink on the page without setting the theme again, then it dries', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)

    engine(on, sets)
    await $.session.start(start)

    const ui = await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })

    expect(JSON.stringify(await ui.drawn())).not.toContain('class=\\"bloom\\"')

    await $.turn.start({ text: 'hello', turnId: 't1' })

    expect(JSON.stringify(await ui.drawn())).toContain('class=\\"bloom\\"')
    expect(sets).toHaveLength(1)

    await clock.advance(4000)

    expect(JSON.stringify(await ui.drawn())).not.toContain('class=\\"bloom\\"')
  })

  test('no ink, and no redraws, where no window has drawn the page', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)

    engine(on, sets)
    await $.session.start({ ...start, surface: 'terminal' })
    await $.turn.start({ text: 'hello', turnId: 't1' })
    await clock.advance(4000)

    const ui = await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })

    expect(JSON.stringify(await ui.drawn())).not.toContain('class=\\"bloom\\"')
  })

  test("a subagent's turn draws no ink", async ($, on) => {
    const sets: ThemeSetArgs[] = []

    mock.clock(on)
    engine(on, sets)
    await $.session.start(start)

    const ui = await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })

    await $.turn.start({ text: 'look around', turnId: 't2', agentId: 'sub1' })

    expect(JSON.stringify(await ui.drawn())).not.toContain('class=\\"bloom\\"')
  })

  test("another plugin's backdrop passes through untouched", async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const seen: string[] = []

    engine(on, sets)
    on('ui.render', { component: 'Backdrop' }, ($, e) => {
      seen.push(e.props.plugin)

      return BLANK
    })
    await $.session.start(start)
    await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: { ...page, plugin: 'lagoon-mod' } })

    expect(seen).toEqual(['lagoon-mod'])
  })
})

describe('the spells', () => {
  test('/lumos in the desktop app just opens the diary; in a terminal it says where the page shows', async ($, on) => {
    const sets: ThemeSetArgs[] = []

    mock.clock(on)
    engine(on, sets)
    await $.session.start(start)
    expect((await $.command.run(run('lumos'))).text).toBe('Lumos. Hello. My name is Tom Riddle. How did you come by my diary?')

    await $.session.start({ ...start, surface: 'terminal' })
    expect((await $.command.run(run('lumos'))).text).toContain('desktop app')
  })
})

describe('the canon', () => {
  test('/nox where the page is drawn: a fang stabs it, ink bleeds, and only then the theme clears', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)
    const stubs = engine(on, sets)

    await $.session.start(start)

    const ui = await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })
    const closed = await $.command.run(run('nox'))

    expect(closed.text).toContain('fang')
    expect(JSON.stringify(await ui.drawn())).toContain('class=\\"fang\\"')
    expect(stubs.clears()).toBe(0)
    expect(stubs.store.get('off')).toBe(true)

    await clock.advance(4000)
    expect(stubs.clears()).toBe(1)
  })

  test('/nox fade: a theme another plugin sets meanwhile is left standing', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)
    const stubs = engine(on, sets)

    on('ui.render', { component: 'Backdrop' }, () => BLANK)
    await $.session.start(start)
    await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })
    await $.command.run(run('nox'))
    await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: { ...page, plugin: 'lagoon-mod' } })
    await clock.advance(4000)

    expect(stubs.clears()).toBe(0)
  })

  test('the first reply after the diary opens ends with the melody, then the page brings the plain cue back', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)

    engine(on, sets)
    on('turn.complete', ($, e) => ({ text: e.answer }))
    await $.session.start(start)
    await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })

    expect(cue(sets[0])).toBe('bell')

    await $.turn.complete({ answer: 'hi', durationMs: 900, isAborted: false, turnId: 't1', reason: 'answer' })
    await clock.advance(6500)
    await new Promise<void>(resolve => setTimeout(() => resolve(), 150))

    expect(sets.length).toBe(2)
    expect(sets[1]?.sound).toEqual(lookFor('page', true, true).sound)
    expect(cue(sets[1])).not.toBe('bell')
  })

  test('a plain theme picked while the melody plays is never overwritten', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)

    engine(on, sets)
    on('turn.complete', ($, e) => ({ text: e.answer }))
    await $.session.start(start)

    const ui = await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })

    await $.turn.complete({ answer: 'hi', durationMs: 900, isAborted: false, turnId: 't1', reason: 'answer' })
    // A theme with no scene asks for no Backdrop, so the page stops drawing.
    await ui.unmount()
    await clock.advance(20000)
    await new Promise<void>(resolve => setTimeout(() => resolve(), 150))

    expect(sets.length).toBe(1)
  })

  test('a failed reset is tried again the next time the page draws', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)
    let busy = 1

    engine(on, sets, () => (sets.length === 1 && busy-- > 0 ? 'the app is busy' : undefined))
    on('turn.complete', ($, e) => ({ text: e.answer }))
    await $.session.start(start)
    await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })
    await $.turn.complete({ answer: 'hi', durationMs: 900, isAborted: false, turnId: 't1', reason: 'answer' })
    await clock.advance(6500)
    await new Promise<void>(resolve => setTimeout(() => resolve(), 150))

    expect(sets.length).toBe(1)

    await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })
    await new Promise<void>(resolve => setTimeout(() => resolve(), 150))

    expect(sets.length).toBe(2)
    expect(cue(sets[1])).not.toBe('bell')
  })
})

describe('the other hand', () => {
  test('while Claude replies the margin fills with script, then it sinks away and is gone', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)

    engine(on, sets)
    on('turn.complete', ($, e) => ({ text: e.answer }))
    await $.session.start(start)
    await clock.advance(7000)

    const ui = await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })

    await $.turn.start({ text: 'hello', turnId: 't1' })
    expect(JSON.stringify(await ui.drawn())).toContain('hand w')

    await $.turn.complete({ answer: 'hi', durationMs: 900, isAborted: false, turnId: 't1', reason: 'answer' })
    expect(JSON.stringify(await ui.drawn())).toContain('class=\\"gone\\"')

    await clock.advance(3000)
    expect(JSON.stringify(await ui.drawn())).not.toContain('class=\\"hand')
  })

  test('/lumos lights the page up, then the light settles', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)

    engine(on, sets)
    await $.session.start(start)

    const ui = await $.ui.mount({ plugin: 'horcrux', surface: 'desktop', component: 'Backdrop', props: page })

    expect(JSON.stringify(await ui.drawn())).toContain('veil enter')

    await clock.advance(6500)
    expect(JSON.stringify(await ui.drawn())).not.toContain('veil enter')
  })
})

describe('the terminal', () => {
  test('the spinner and the turn line speak the diary, and the same rows go back when it closes', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const words: string[] = []

    engine(on, sets)
    on('ui.render', { component: 'Spinner' }, ($, e) => {
      words.push(`spin:${e.props.word}`)

      return BLANK
    })
    on('ui.render', { component: 'TurnDuration' }, ($, e) => {
      words.push(`turn:${e.props.word}`)

      return BLANK
    })
    await $.session.start({ ...start, surface: 'terminal' })
    const spin = await $.ui.mount({ plugin: 'horcrux', surface: 'terminal', component: 'Spinner', props: spinner })
    const line = await $.ui.mount({ plugin: 'horcrux', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 3000 } })

    expect(WRITING).toContain(words[0]?.slice(5) as (typeof WRITING)[number])
    expect(WRITTEN).toContain(words[1]?.slice(5) as (typeof WRITTEN)[number])

    await $.command.run(run('nox'))
    await spin.drawn()
    await line.drawn()
    await new Promise<void>(resolve => setTimeout(() => resolve(), 150))
    await spin.drawn()

    expect(words).toContain('spin:Sauteing')
    expect(words).toContain('turn:Baked')
  })
})

describe('the scene', () => {
  test('every page fits the engine and holds no picture', () => {
    for (const svg of [scene(), ...Array.from({ length: BLOOM_COUNT }, (_, i) => scene({ bloom: i })), scene({ writing: 'on' }), scene({ writing: 'sinking' }), scene({ entering: true }), scene({ dying: true })]) {
      expect(svg.length).toBeLessThan(131_072)
      expect(svg).not.toContain('<image')
      expect(svg).not.toContain('href')
      expect(svg).toContain('preserveAspectRatio="xMidYMid slice"')
    }
  })

  test('every drop stays whole on screen from a 1:2 window to a 3.5:1 one', () => {
    for (const aspect of [0.5, 0.62, 0.75, 1, 1.2, 1.33, 1.5, 1.6, 2, 2.4, 3, 3.5]) {
      const [left, top, right, bottom] = visibleBox(aspect)
      const shift = edgeShift(aspect)

      for (const [side, x, y] of bloomSpots()) {
        const drawnAt = side === 'left' ? x + shift : x - shift

        expect(drawnAt - 64).toBeGreaterThanOrEqual(left)
        expect(drawnAt + 64).toBeLessThanOrEqual(right)
        expect(y - 64).toBeGreaterThanOrEqual(top)
        expect(y + 64).toBeLessThanOrEqual(bottom)
      }
    }
  })

  test('the diary words are distinct, short enough for a narrow terminal, and never the plain ones', () => {
    for (const list of [WRITING, WRITTEN]) {
      expect(new Set(list).size).toBe(list.length)

      for (const word of list) {
        expect(word.length).toBeLessThanOrEqual(30)
      }
    }

    expect(WRITTEN).not.toContain('Written' as (typeof WRITTEN)[number])
    expect(WRITTEN).not.toContain('Penned' as (typeof WRITTEN)[number])
  })

  test('one spinner word always maps to the same diary word', () => {
    expect(pick(WRITING, 'Sauteing')).toBe(pick(WRITING, 'Sauteing'))
    expect(WRITING).toContain(pick(WRITING, 'Sauteing'))
  })
})

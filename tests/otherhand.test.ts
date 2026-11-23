import { describe, expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput, On, RenderElement, SessionStartInput, ThemeSetArgs } from 'claude-code'

import { WRITING, WRITTEN, pick } from '../hooks/register'
import { BLOOM_COUNT, bloomSpots, edgeShift, scene, visibleBox } from '../hooks/scene'

const start: SessionStartInput = { surface: 'desktop', isInteractive: true, cwd: '/work' }
const run = (args: string): CommandRunInput => ({
  command: 'otherhand',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
})
// The test environment has timers, but this project's tsconfig loads no DOM or Node types.
declare const setTimeout: (fn: () => void, ms: number) => unknown

const page = { scene: 'page', plugin: 'otherhand', glass: { blur: 10, opacity: 0.6 } } as const
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

    await $.command.run(run('on'))

    expect(sets).toHaveLength(1)
    expect(sets[0]?.sound).toBeDefined()
  })

  test('/otherhand off closes the diary, says so to you alone, and stays closed next session', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const stubs = engine(on, sets)

    await $.session.start(start)
    const closed = await $.command.run(run('off'))

    expect(closed.text).toContain('closes')
    expect(closed.isTextDisplayOnly).toBe(true)
    expect(stubs.store.get('off')).toBe(true)
    expect(stubs.clears()).toBe(1)

    await $.session.start(start)
    expect(sets).toHaveLength(1)

    const opened = await $.command.run(run('on'))

    expect(opened.text).toContain('open')
    expect(sets).toHaveLength(2)
  })

  test('closing twice clears nothing the second time, and still saves off', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const stubs = engine(on, sets)

    await $.session.start(start)
    await $.command.run(run('off'))
    stubs.store.set('off', false)
    const again = await $.command.run(run('off'))

    expect(again.text).toContain('stays closed')
    expect(stubs.clears()).toBe(1)
    expect(stubs.store.get('off')).toBe(true)
  })

  test("closing never clears a theme another plugin set", async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const stubs = engine(on, sets)

    on('ui.render', { component: 'Backdrop' }, () => BLANK)
    await $.session.start(start)
    await $.ui.mount({ plugin: 'otherhand', surface: 'desktop', component: 'Backdrop', props: { ...page, plugin: 'lagoon-mod' } })
    await $.command.run(run('off'))

    expect(stubs.clears()).toBe(0)
    expect(stubs.store.get('off')).toBe(true)
  })

  test('an unknown word gets the usage line and changes nothing', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const stubs = engine(on, sets)

    const answer = await $.command.run(run('sideways'))

    expect(answer.text).toContain('/otherhand on')
    expect(stubs.store.has('off')).toBe(false)
  })
})

describe('the ink', () => {
  test('writing draws a drop of ink on the page without setting the theme again, then it dries', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)

    engine(on, sets)
    await $.session.start(start)

    const ui = await $.ui.mount({ plugin: 'otherhand', surface: 'desktop', component: 'Backdrop', props: page })

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

    const ui = await $.ui.mount({ plugin: 'otherhand', surface: 'desktop', component: 'Backdrop', props: page })

    expect(JSON.stringify(await ui.drawn())).not.toContain('class=\\"bloom\\"')
  })

  test("a subagent's turn draws no ink", async ($, on) => {
    const sets: ThemeSetArgs[] = []

    mock.clock(on)
    engine(on, sets)
    await $.session.start(start)

    const ui = await $.ui.mount({ plugin: 'otherhand', surface: 'desktop', component: 'Backdrop', props: page })

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
    await $.ui.mount({ plugin: 'otherhand', surface: 'desktop', component: 'Backdrop', props: { ...page, plugin: 'lagoon-mod' } })

    expect(seen).toEqual(['lagoon-mod'])
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
    const spin = await $.ui.mount({ plugin: 'otherhand', surface: 'terminal', component: 'Spinner', props: spinner })
    const line = await $.ui.mount({ plugin: 'otherhand', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 3000 } })

    expect(WRITING).toContain(words[0]?.slice(5) as (typeof WRITING)[number])
    expect(WRITTEN).toContain(words[1]?.slice(5) as (typeof WRITTEN)[number])

    await $.command.run(run('off'))
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
    for (const svg of [scene(), ...Array.from({ length: BLOOM_COUNT }, (_, i) => scene(i))]) {
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

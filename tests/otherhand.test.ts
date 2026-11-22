import { describe, expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput, On, SessionStartInput, ThemeSetArgs } from 'claude-code'

import { WRITING, bloomOf, pick } from '../hooks/register'
import { BLOOM_COUNT, scene } from '../hooks/scene'

const start: SessionStartInput = { surface: 'desktop', isInteractive: true, cwd: '/work' }
const run = (args: string): CommandRunInput => ({
  command: 'otherhand',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
})

/** Stubs every call the mod makes; `drawn` says whether a window draws the look. */
function engine(on: On, sets: ThemeSetArgs[], drawn = true, refuse?: (args: ThemeSetArgs) => boolean) {
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
    if (refuse?.(e)) {
      return { deny: 'theme.set does not know the attribute "sound"' }
    }

    sets.push(e)

    return { value: drawn ? { isDrawn: true, requestId: 'theme' } : { isDrawn: false, requestId: 'theme', reason: 'no window draws themes' } }
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
  test('session start sets the page with cursive type and sound', async ($, on) => {
    const sets: ThemeSetArgs[] = []

    engine(on, sets)
    await $.session.start(start)

    expect(sets).toHaveLength(1)
    expect(sets[0]?.backdrop).toMatchObject({ scene: 'page' })
    expect(sets[0]?.style?.Text?.fontFamily).toEqual(['cursive'])
    expect(sets[0]?.sound?.cues?.send).toBeDefined()
  })

  test('a build that refuses sound still gets the page and the type', async ($, on) => {
    const sets: ThemeSetArgs[] = []

    engine(on, sets, true, args => args.sound !== undefined)
    await $.session.start(start)

    expect(sets).toHaveLength(1)
    expect(sets[0]?.sound).toBeUndefined()
    expect(sets[0]?.style?.Text?.fontFamily).toEqual(['cursive'])
  })

  test('/otherhand off closes the diary and keeps it closed next session', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const stubs = engine(on, sets)

    await $.session.start(start)
    const closed = await $.command.run(run('off'))

    expect(closed.text).toContain('closes')
    expect(stubs.store.get('off')).toBe(true)
    expect(stubs.clears()).toBe(1)

    await $.session.start(start)
    expect(sets).toHaveLength(1)

    const opened = await $.command.run(run('on'))

    expect(opened.text).toContain('open')
    expect(sets).toHaveLength(2)
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
  test('writing soaks a drop of ink into the margin, then the page settles', async ($, on) => {
    const sets: ThemeSetArgs[] = []
    const clock = mock.clock(on)

    engine(on, sets)
    await $.session.start(start)
    await $.turn.start({ text: 'hello', turnId: 't1' })
    await clock.advance(10)

    const bloomed = sets[1]?.backdrop

    expect(bloomed && 'scene' in bloomed && bloomed.scene !== undefined ? bloomOf(bloomed.scene) : undefined).toBeDefined()

    await clock.advance(4000)

    expect(sets.at(-1)?.backdrop).toMatchObject({ scene: 'page' })
  })

  test('no ink where no window draws the page', async ($, on) => {
    const sets: ThemeSetArgs[] = []

    mock.clock(on)
    engine(on, sets, false)
    await $.session.start({ ...start, surface: 'terminal' })
    await $.turn.start({ text: 'hello', turnId: 't1' })

    expect(sets).toHaveLength(1)
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

  test('scene names round-trip and strangers are refused', () => {
    expect(bloomOf('page-ink-3')).toBe(3)
    expect(bloomOf('page')).toBeUndefined()
    expect(bloomOf(`page-ink-${BLOOM_COUNT}`)).toBeUndefined()
    expect(bloomOf('lagoon')).toBeUndefined()
  })

  test('one spinner word always maps to the same diary word', () => {
    expect(pick(WRITING, 'Sauteing')).toBe(pick(WRITING, 'Sauteing'))
    expect(WRITING).toContain(pick(WRITING, 'Sauteing'))
  })
})

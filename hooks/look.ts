import type { ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { sheet } from './paper'

export const PAGE = 'page'

// An aged page by day; the same page by candlelight at night. Iron-gall ink, never pure black.
const made = makeColors({
  label: 'Horcrux',
  id: 'horcrux',
  roles: { accent: '#7a2e1f', danger: '#a3322a', success: '#4f6b2f', warning: '#9a6a14', pro: '#4a3b6b' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e9dbb9',
        'surface-1': '#efe3c5',
        'surface-2': '#f4ead2',
        'text-primary': '#24180e',
        'text-secondary': '#4a3a28',
        'text-muted': '#64523d',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1b140e',
        'surface-1': '#221a12',
        'surface-2': '#2a2017',
        'surface-3': '#30251a',
        'text-primary': '#f2e4c7',
        'text-secondary': '#d4c3a2',
        'text-muted': '#ae9c7d',
      },
    },
  },
})

export const COLOR_PROBLEMS: readonly string[] = made.problems

// Your words in blue-black fountain-pen ink; the other hand in brown-black iron gall. Each message's ground is
// the page's own colour where the conversation sits, so the words read as written on the page, not on a slip.
// Light was measured in the desktop app; dark is from a render of the scene, to be checked in the app.
const MESSAGE_INK = {
  light: {
    'bg-user-message': '#eee5ca',
    'text-user-message': '#1d2a45',
    'bg-assistant-message': '#eee5ca',
    'text-assistant-message': '#2a1a0d',
  },
  dark: {
    'bg-user-message': '#352819',
    'text-user-message': '#c9d6f0',
    'bg-assistant-message': '#352819',
    'text-assistant-message': '#f0dfbf',
  },
} as const

function withMessageInk(colors: ThemeSetArgs['colors']): ThemeSetArgs['colors'] {
  if (colors === undefined) {
    return colors
  }

  const inputs = colors.inputs ?? {}

  return {
    ...colors,
    inputs: {
      ...inputs,
      light: { ...(inputs.light ?? {}), ...MESSAGE_INK.light },
      dark: { ...(inputs.dark ?? {}), ...MESSAGE_INK.dark },
    },
  } as ThemeSetArgs['colors']
}

const COLORS = withMessageInk(made.theme)

const WRITTEN = { fontFamily: ['cursive'], fontSize: 19, lineHeight: 30 } as const

export const STYLE: NonNullable<ThemeSetArgs['style']> = {
  Text: WRITTEN,
  Heading: { fontFamily: ['cursive'], fontWeight: 'semibold' },
  // Each message is a torn scrap of the page. Your lines lean a little, as a hand does; each message keeps the
  // scrap and the slant it gets.
  UserMessage: [
    sheet(11, 'text-user-message', 'bg-user-message', -0.6),
    sheet(23, 'text-user-message', 'bg-user-message', 0.4),
  ],
  AssistantMessage: [
    sheet(37, 'text-assistant-message', 'bg-assistant-message'),
    sheet(41, 'text-assistant-message', 'bg-assistant-message'),
  ],
}

type Sound = ThemeSetArgs extends { sound?: infer Known } ? NonNullable<Known> : never

// Quiet enough to sit under hours of work: a room with a candle in it, and a quill.
export const SOUND: Sound = {
  ambience: {
    reverb: 0.2,
    layers: [
      { wave: 'brown', drone: true, gain: 0.2, filter: { type: 'lowpass', hz: 420 } },
      // The candle: a soft crackle, now and then.
      { wave: 'crackle', scatter: 0.3, attack: 0.002, release: 0.08, gain: 0.07, filter: { type: 'lowpass', hz: 2400 } },
      // Far off, rarely, an owl.
      { wave: 'triangle', notes: ['F4', 'F4', 'D4'], step: 0.38, scatter: 0.02, glide: -2, attack: 0.04, release: 0.32, gain: 0.05, filter: { type: 'lowpass', hz: 900 } },
    ],
  },
  cues: {
    // The nib touches the page.
    send: {
      reverb: 0.1,
      layers: [
        { wave: 'pink', attack: 0.002, release: 0.05, gain: 0.22, filter: { type: 'bandpass', hz: 3600 } },
        { wave: 'sine', notes: ['A5'], glide: -3, attack: 0.002, release: 0.06, gain: 0.08 },
      ],
    },
    // One short stroke of the quill.
    tool: {
      layers: [{ wave: 'pink', attack: 0.004, release: 0.03, gain: 0.08, filter: { type: 'bandpass', hz: 2800 } }],
    },
    // The ink settles.
    done: {
      reverb: 0.35,
      layers: [
        { wave: 'pink', attack: 0.05, release: 0.45, gain: 0.12, filter: { type: 'lowpass', hz: 900 } },
        { wave: 'sine', notes: ['D4'], attack: 0.03, release: 0.9, gain: 0.07, filter: { type: 'lowpass', hz: 800 } },
      ],
    },
    // The page waits for your answer.
    ask: {
      reverb: 0.3,
      layers: [{ wave: 'sine', notes: ['A3', 'E4'], step: 0.14, attack: 0.02, release: 0.5, gain: 0.08, filter: { type: 'lowpass', hz: 1100 } }],
    },
    // A blot.
    error: {
      layers: [{ wave: 'sine', notes: ['A2'], glide: -4, attack: 0.005, release: 0.25, gain: 0.14 }],
    },
    // A page turns.
    compact: {
      reverb: 0.2,
      layers: [{ wave: 'pink', attack: 0.08, release: 0.6, gain: 0.14, filter: { type: 'bandpass', hz: 1400, to: 3200 } }],
    },
    // A drop of ink, lower at the left of the page and higher at the right.
    click: {
      reverb: 0.25,
      layers: [{ wave: 'sine', notes: ['D5', 'E5', 'G5', 'A5', 'B5'], glide: 6, attack: 0.003, release: 0.12, gain: 0.2 }],
    },
  },
}

// The opening phrase of the films' celesta theme, on the app's own bell tone: B E. G F# E- B A. One eighth note is
// one 0.2 s step and 0 is a rest, so the phrase plays and ends inside the 4 s a cue may last. It answers the first
// reply after the diary opens, once.
export const MELODY: NonNullable<NonNullable<Sound['cues']>['done']> = {
  reverb: 0.45,
  layers: [
    {
      wave: 'bell',
      notes: ['B3', 0, 'E4', 0, 0, 'G4', 'F#4', 0, 'E4', 0, 0, 0, 'B4', 0, 'A4', 0],
      step: 0.2,
      attack: 0.004,
      release: 0.6,
      gain: 0.16,
    },
  ],
}

const GLASS = { blur: 10 } as const

export function lookFor(scene: string, withSound: boolean, withStyle: boolean, withMelody = false): ThemeSetArgs {
  const sound: Sound = withMelody ? { ...SOUND, cues: { ...SOUND.cues, done: MELODY } } : SOUND

  return {
    colors: COLORS,
    backdrop: { scene, glass: GLASS },
    ...(withStyle ? { style: STYLE } : {}),
    ...(withSound ? { sound } : {}),
  }
}

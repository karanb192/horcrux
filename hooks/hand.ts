import { seedOf, tear } from './paper'

// The diary's own answers to /lumos and /nox, written in a hand as the messages are. The style that sets the
// messages' font cannot reach a command's row, so the row is drawn: the words stay in the alt text.
// The same size and leading as the messages' words (look.ts), so the diary's lines and the messages match.
const SIZE = 22
const LINE = 34
const SPACING = 0.6
const CHARS = 52
// A cursive letter at this size and spacing runs 9.8 to 10.6 units wide, by how many capitals a line holds (measured in a
// Chromium render); over that, so the scrap never cuts a word.
const LETTER = 11.2
const PAD = 15

// The reply's own scrap and ink (look.ts and the theme's surface-0 and border-strong), as the desktop app drew them.
const LIGHT = { paper: '#eee5ca', band: '#e9dbb9', edge: '#a8977b', ink: '#2a1a0d' }
const DARK = { paper: '#352819', band: '#1b140e', edge: '#4a4439', ink: '#f0dfbf' }

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Breaks the answer into lines a hand would write, at spaces only. */
export function lines(text: string): string[] {
  const out: string[] = []
  let line = ''

  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line !== '' && line.length + 1 + word.length > CHARS) {
      out.push(line)
      line = word
    } else {
      line = line === '' ? word : `${line} ${word}`
    }
  }

  if (line !== '') out.push(line)

  return out
}

/**
 * The diary's words in ink on a torn scrap, the same as a reply's. Still on purpose: the row is redrawn whenever the
 * page is, and a written-in reveal replayed on every ink bloom. The scrap's shape comes from the words, so a redraw
 * never changes it.
 */
export function handwriting(text: string): { source: string; width: number; height: number } {
  const written = lines(text)
  const longest = Math.max(...written.map(line => line.length))
  const width = Math.round(longest * LETTER + 2 * PAD)
  const height = written.length * LINE + 2 * PAD - 6
  const { edge, band } = tear(seedOf(text), width, height)
  const rows = written.map((line, i) => `<text x="${PAD}" y="${PAD + LINE * (i + 1) - 10}">${escape(line)}</text>`).join('')
  const paint = (c: typeof LIGHT) =>
    `.paper{fill:${c.paper}}.band{fill:${c.band}}.edge{stroke:${c.edge}}text{fill:${c.ink}}`

  const style = [
    `text{font-family:cursive;font-size:${SIZE}px;font-weight:600;letter-spacing:${SPACING}px}.band{fill-rule:evenodd}.edge{fill:none;stroke-width:1}`,
    paint(LIGHT),
    `@media (prefers-color-scheme: dark){${paint(DARK)}}`,
  ].join('')

  return {
    source:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
      `<style>${style}</style><path class="paper" d="${edge}"/><path class="band" d="${edge}${band}"/>` +
      `<path class="edge" d="${edge}"/>${rows}</svg>`,
    width,
    height,
  }
}

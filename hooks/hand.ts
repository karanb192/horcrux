// The diary's own answers to /lumos and /nox, written in a hand as the messages are. The style that sets the
// messages' font cannot reach a command's row, so the row is drawn: the words stay in the alt text.
// The same size and leading as the messages' words (look.ts), so the diary's lines and the messages match.
const SIZE = 21
const LINE = 32
const CHARS = 54
const WIDTH = 640

const INK_LIGHT = '#2a1a0d'
const INK_DARK = '#f0dfbf'

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
 * The diary's words in ink. Still on purpose: the row is redrawn whenever the page is, and a written-in reveal
 * replayed on every ink bloom.
 */
export function handwriting(text: string): { source: string; width: number; height: number } {
  const written = lines(text)
  const height = written.length * LINE + 12
  const rows = written
    .map((line, i) => `<text x="6" y="${LINE * (i + 1) - 6}">${escape(line)}</text>`)
    .join('')

  const style = [
    `text{font-family:cursive;font-size:${SIZE}px;fill:${INK_LIGHT}}`,
    `@media (prefers-color-scheme: dark){text{fill:${INK_DARK}}}`,
  ].join('')

  return {
    source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}"><style>${style}</style>${rows}</svg>`,
    width: WIDTH,
    height,
  }
}

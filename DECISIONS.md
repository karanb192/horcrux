# Decisions

## Made

- **A look, not a redraw.** The desktop page, type and sound go through `$.theme.set` (data the app draws). Rejected: drawing messages as SVG in `ui.render`, which breaks selecting, copying, find and screen readers.
- **Ink blooms on `turn.start`, not `prompt.submit`.** Both fire when you write; `turn.start` keeps the footprint to "draws and remembers" and the hook never reads the prompt. Rejected: `prompt.submit`, which shows in the footprint as seeing every prompt.
- **A bloom is a sibling scene.** Writing sets the theme again with `page-ink-N` (the same page plus a drop of ink), then sets `page` back after 3.8 s. Rejected: a timer that redraws the backdrop, which the app holds still for people who asked for reduced motion and which costs a redraw per frame.
- **Code stays plain.** Only message words, headings and the two message boxes are styled. Code blocks, diffs, tool rows, permission prompts and questions keep the app's look.
- **Try the whole look, then less.** A build that does not know `sound` or `style` refuses the whole set, so the mod tries all, then without sound, then colors and page only, and remembers what worked for the load.
- **Off is remembered.** `/otherhand off` writes one key to the mod's own store. Rejected: per-project choice (more state, more surface) for a first version.
- **No franchise words in the name, command or UI.** README and description carry the reference for search, with a disclaimer and credit to MaximeRivest/riddle.

## Unverified

- **Desktop drawing.** Tests cannot paint. Whether the page, cursive type, message inks and the bloom look right needs a person looking at the desktop app in light and dark mode, with a long code block and a larger text size. If a message ink fails the app's 3:1 check over the page, that message draws in the app's own colors.
- **Sound.** Tests play none. The levels are guesses until someone listens.
- **Terminal words.** The Spinner and TurnDuration rewrites are covered by no drawn capture yet; the interactive harness stopped on first-run screens.
- **Generic cursive.** The look depends on the system's cursive font; on some machines it may read poorly.

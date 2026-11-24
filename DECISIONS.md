# Decisions

## Made

- **A look, not a redraw.** The desktop page, type and sound go through `$.theme.set` (data the app draws). Rejected: drawing messages as SVG in `ui.render`, which breaks selecting, copying, find and screen readers.
- **Ink blooms on `turn.start`, not `prompt.submit`.** Both fire when you write; `turn.start` keeps the footprint to "draws and remembers". Its event carries the prompt text; the hook reads only `agentId`. Rejected: `prompt.submit`, which shows in the footprint as seeing every prompt.
- **A bloom redraws only our own backdrop.** The theme is set once per session. Writing redraws the mod's Backdrop with a drop of ink (`$.ui.invalidate`), and a timer redraws it plain 3.8 s later. Two redraws per turn, not one per frame. Where another plugin's theme stands, the hook is never asked, so nothing is taken back. Rejected: setting the theme again with a sibling scene per drop (the first version), which replaced any theme someone picked in between (Codex review, PR 1).
- **Main turns only, and only where the page was drawn.** A subagent's `turn.start` (it carries `agentId`) draws no ink, and no turn redraws anything until a window has drawn the mod's backdrop once.
- **Closing is best-effort about ownership.** The types offer no way to see another plugin's theme unless it draws a scene, so `/nox` may clear a plain-colour theme picked after Horcrux. The README says so (Codex review round 2). An explicit `/nox` always saves, so a retry repairs a failed save. Toggling redraws the terminal rows so they drop the diary words at once.
- **Drops sit in a band.** Every drop is between y=340 and y=660, so a 3.5:1 window still shows it whole; a test checks both axes.
- **Edges slide in.** The root crops to fill any window, which hid every margin drop in a square window (Codex review). The margin, spine and ink sit in two edge groups that `@media (max-aspect-ratio)` rules slide inward; a test checks every drop stays inside the visible range from 0.5 to 2.4.
- **Code stays plain.** Only message words, headings and the two message boxes are styled. Code blocks, diffs, tool rows, permission prompts and questions keep the app's look.
- **Try the whole look, then less, only for an unknown attribute.** A build that does not know `sound` or `style` refuses the whole set with "does not know the attribute", so only that refusal steps down; any other failure is passed on and teaches nothing.
- **Off is remembered, the toggle follows this session.** `/lumos` and `/nox` change what this session shows and save it as the default for new sessions. Closing twice clears nothing; the ownership bullet above says when closing clears another plugin's theme. Rejected: per-project choice for a first version.
- **The command's answer is for you alone.** `isTextDisplayOnly`, so its text never reaches the model. The command is not `immediate`, because an immediate answer mid-turn stays in requests.
- **Named for the story.** Horcrux: a piece of Claude sealed in an old diary. Commands are spells everyone knows: `/lumos` opens, `/nox` closes. Rejected: Otherhand (nobody could recall `/otherhand`), Riddle (MaximeRivest/riddle), Claude's Diary (rlancemartin/claude-diary). Known neighbour: jesseduffield/horcrux, a file-splitting CLI; different job.
- **The reference is open.** Horcrux is free and open source, a fan homage nobody makes money from, so copyright is not a concern: the README, description, keywords, UI words, commands and pictures use Harry Potter freely. The README credit line is the only disclaimer.
- **The page is blank.** The diary's pages had no lines; the first version's ruled lines read as a school notebook.
- **The night is the wow.** Dark mode adds floating candles and faint stars; `/lumos` dims the page and lights it back up while the candles catch one by one (6 s). Footprints walk up the margin on a 26 s loop. While Claude replies, script writes itself into the right margin (`turn.start` to `turn.complete`), then sinks away in 2.6 s. All of it is CSS in our own backdrop, redrawn with `$.ui.invalidate`; nothing re-sets the theme.

## Unverified

- **Desktop drawing.** Tests cannot paint. Whether the page, cursive type, message inks and the bloom look right needs a person looking at the desktop app in light and dark mode, with a long code block and a larger text size. If a message ink fails the app's 3:1 check over the page, that message draws in the app's own colors.
- **Sound.** Tests play none. The levels are guesses until someone listens.
- **Terminal words.** The Spinner and TurnDuration rewrites pass mounted tests through the engine, but no drawn capture of a real terminal exists yet; the interactive harness stopped on first-run screens.
- **Desktop redraws.** That `$.ui.invalidate('ui.render')` restarts the bloom animation in the desktop app, and that a reduced-motion window shows the plain page, are from the guide, not seen.
- **Generic cursive.** The look depends on the system's cursive font; on some machines it may read poorly.

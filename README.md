# Otherhand

**Tom Riddle's diary, for your coding agent.** You write on an old page, a drop of ink soaks into the margin, and a second hand writes back in cursive.

<!-- Hero: a real screen recording of the Claude desktop app goes here. -->

A theme mod for [Claude Code](https://code.claude.com/docs/en/plugins/mods/overview). It draws only: it adds no tokens to your conversation, makes no network calls and runs no processes.

## Install

Needs Claude Code 2.1.330 or later.

```sh
claude plugin marketplace add karanb192/otherhand
claude plugin install otherhand@otherhand
```

Then open a new session, or run `/reload-plugins` in an open one.

## What you get

In the **Claude desktop app** (the Code tab):

1. **The page.** An aged, lined diary page behind the conversation, with old ink blots and foxing at the edges. At night it is the same page by candlelight, with a slow flicker.
2. **The second hand.** Claude's replies and your messages in cursive, each in its own ink: yours blue-black, the diary's brown-black.
3. **Ink that soaks in.** Each time you write, a drop of ink lands in a margin, spreads and sinks into the paper. It stays in the margins at any window size, square and tall ones included.
4. **Sound, if you want it.** A quiet room with a candle, a nib touching the page when you send, a quill stroke for each tool call, a page turning when the conversation compacts. Off until you press the speaker in the session's title bar.

In the **terminal**, which draws no themes, the spinner and the line that closes each turn speak the diary's words: "Dipping the quill…", "Writing back…", "Inked for 12s".

Code blocks, diffs, permission prompts and questions keep the app's own look, so nothing you need to read carefully ever turns cursive. Your accessibility settings win over the theme.

## Commands

| Command | What it does |
|---|---|
| `/otherhand` | Close the diary if it is open, open it if it is closed |
| `/otherhand off` | Close the diary: the app's own look comes back, and stays in later sessions |
| `/otherhand on` | Open it again |

## What it can access

| | |
|---|---|
| Reads | Its own on/off setting |
| Writes | Its own on/off setting |
| Sees | The backdrop, the spinner and the turn line it draws, and the start of each turn. A turn's event carries your prompt; Otherhand only checks whether the turn is the main conversation's, and never reads, keeps or sends the prompt |
| Network | None |
| Tokens | None. Even `/otherhand`'s answers are shown to you alone and never sent to the model |

`claude plugin validate` prints this footprint before anything runs.

## Limits

- The page, the cursive type and the sound need the Claude desktop app. The terminal and the editors draw no themes; there you get the diary's words only.
- One theme shows at a time. Another mod that sets a theme replaces this one; Otherhand never takes it back, and `/otherhand off` only clears the page when the page is Otherhand's.
- `/otherhand` typed while Claude is working runs when the turn ends.
- Fonts are the system's generic cursive font. The theme API takes generic families only, so the handwriting looks different on different machines.
- If you ask your system for reduced motion, the page holds still and the ink does not bloom.

## Credits

The idea of a diary that writes back is Tom Riddle's diary from *Harry Potter and the Chamber of Secrets*. Otherhand is a fan homage with its own art, words and sounds. It uses no names, images or text from the books or films, and is not affiliated with or endorsed by J.K. Rowling, Warner Bros. or anyone connected to them.

The first great version of this idea is [Riddle](https://github.com/MaximeRivest/riddle) by Maxime Rivest, which turns a reMarkable tablet into the diary. Otherhand brings the same feeling to Claude Code.

`hooks/make-colors.js` and `hooks/make-colors.d.ts` are copied unchanged from Claude Code's own plugin-authoring guide, which tells mod authors to copy them.

## License

MIT

# WASD vs ARROW

Couch 1v1 party games for one laptop: one player on **W A S D**, the other on the **arrow keys**.
Characters are glossy vinyl collectible figures (the Blender-made parts kit from Agent Office), unboxed from
their own collector boxes.

## Play

```
./serve.sh
```

That starts a small local server on http://localhost:8790 and opens it (ES modules don't load from `file://`).
`python3 serve.py 8790` does the same without opening a browser.

## Figures and names

18 collectible figures, ◀ ▶ to flip through them, 🎲 for a random one. Tap (or click) the name on your pick
panel to type your own; it stays with you when you switch figures. Clear it to get the figure's name back.

## Controls

| | Team WASD | Team ARROWS |
|---|---|---|
| Move / choose | W A S D | ↑ ← ↓ → |
| Confirm / ready / jump | W | ↑ |
| Back / shuffle / duck | S | ↓ |
| Dash (arena games) | double-tap a direction | double-tap a direction |

Esc pauses (R restart, Q quit), M toggles music, F fullscreen, Enter/Space confirms.

## iPad / tablet

The start screen asks **One keyboard** or **Touch screen** (touch is pre-selected on tablets). In touch mode
each player owns one half of the landscape screen:

- **Stick:** analog, any angle; push further to go faster. It jumps to wherever your thumb lands on your
  side and springs back home when you let go.
- **Action button:** only in games that need one (SHOVE, KICK, JUMP, THROW, BOOST, DROP…).
- **Arrow pads instead of a stick** where tapping is better: Hurdle Hustle (RUN/RUN/JUMP/DUCK), Quick Draw,
  Dance Duel (notes fall onto the pads) and Spin Cycle (JUMP/DUCK).
- **Kart Kerfuffle:** point the stick where you want to drive.

After choosing Touch, pick how you sit:

- **Facing each other** (default): the tablet lies flat between you, each player at one short end. Every
  screen is drawn twice, once turned toward each player (figure pick, game list, how-to, scores, results,
  pause, scoreboard, finale), and each player's controls run along their own edge.
- **Side by side:** both at the long edge, one half of the screen each. Switch any time in the pause menu.

In "facing each other" there is one game list, turned toward whoever picks; the pick alternates between the
players from game to game.

## Home screen app

📲 **Add to Home Screen** (start screen and corner buttons) shows how to install it: on iPad/iPhone Safari it's
Share → Add to Home Screen, Chrome/Edge/Android get a one-tap Install. The icon (BLAZE vs DJ NOODLE) is rendered
from the game's own figures: `tools/make-icons.sh` regenerates every size (dev server must be running).

To play on an iPad, start the server with `./serve.sh --lan`; it prints the address to open in Safari
(the Mac and iPad must be on the same Wi-Fi). Then use Share → Add to Home Screen: launched from the home
screen it runs full-screen in landscape.

## The games

- **Cake Clash** 🎂: sumo on a floating birthday cake that shrinks every second. First to 3.
- **Paint Panic** 🎨: paint the most tiles in 45 s. Power-ups: splat bomb, speed bolt, big brush.
- **Hurdle Hustle** 🏃: alternate left/right to sprint, UP to jump hurdles, hold DOWN to limbo under bars. First to 2 heats.
- **Hot Potato** 💣: pass the bomb by tagging your rival; whoever holds it at BOOM loses the round. First to 3.
- **Goal Rush** ⚽: top-down mini soccer with a beach ball; double-tap for a power kick. First to 3 goals.
- **Choco Drop** 🍫: chocolate tiles crumble under your feet into hot cocoa; last one standing. First to 3.
- **Kart Kerfuffle** 🏎️: 3-lap kart race (up = gas, down = brake, left/right = steer).
- **Beach Bonk** 🏐: side-view volleyball; move and jump to bonk the ball over the net. First to 5.
- **Snowball Showdown** ❄️: move up/down your lane, press toward your rival to throw, hold away to duck. First to 5 hits.
- **Spin Cycle** 🌀: jump the low bar, duck the high bar as they spin faster; 3 hearts each.
- **Trail Blazers** 🌈: light-cycle duel; your ribbon trail is a wall. First to 3.
- **Tower Tumble** 🧱: drop sliding blocks to stack the taller tower; miss and it topples.
- **Quick Draw** 🤠: press the arrow on the sign first; too early or wrong and you're locked out. First to 5.
- **Dance Duel** 🕺: rhythm game on two note highways with its own groove; highest score wins.
- **Party Mode**: five random games in a row; a tie goes to one sudden-death round.

## Game night

Every finished game is added to tonight's scoreboard (🏆 in the menu, on the results card, in the pause menu,
or <kbd>B</kbd>). It shows the total score, a chip per game played and the best winning streak. From there:
**Keep playing**, **Restart score** (tap twice), or **End here**: a ceremony with the champion on the podium,
crown, trophy, confetti cannons and fireworks, after which a new night starts at 0 – 0.

## Code map

- `js/main.js`: app flow (select → menu → how-to → play → results), input routing, thumbnails + portraits.
- `js/engine.js`: renderer, palette, studio lighting, shared vinyl materials, camera rig, key-cap prop.
- `js/figures.js`: vinyl figure assembly + poses, the 12-figure roster, random figures.
- `js/box.js`, `js/showroom.js`: the collector boxes and the stage they stand on.
- `js/ceremony.js`: the end-of-night podium ceremony.
- `js/touch.js`: on-screen sticks, buttons and pads; seating (facing / side by side).
- `js/games/base.js`: shared round flow, movement, dashes and bumps; one file per game next to it.
- `js/audio.js`: all sound effects and the music loop are synthesized (no audio files).
- `assets/models/pop_kit.glb`: built by `tools/blender/build_pop_kit.py`.
- `vendor/three`: three.js r186, vendored so the game runs offline.

Add `?debug` to the URL for an on-screen log of taps and screen changes (useful on an iPad).

Testing in a console: `await __app.devPlay('./games/goal.js')` jumps straight into a game (dev mode, nothing saved),
and `__app.step(seconds)` advances it at a fixed 60 Hz.

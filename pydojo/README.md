# PyDojo 🐍🥋

**Live: https://hrvojekrizic.ch/pydojo/** (works on iPhone and Mac. On iPhone: Share → Add to Home Screen.)

A Duolingo-style, practice-first Python course that runs in the browser on **iPhone and Mac**.
It goes from your first `print()` to the coding, data-engineering and data-science interviews at big data companies.

- **18 units, 104 lessons, 390 tutorial cards and 1,160+ exercises (470+ of them real coding tasks).** Every lesson teaches first (short concept cards with runnable examples), then makes you practise: multiple choice, predict-the-output, fill-in-the-blanks, arrange-the-code, and real coding tasks graded by tests.
- **Real Python in the browser.** Python 3.14 via Pyodide, with **pandas, NumPy, sqlite3 and matplotlib**, plus 11 realistic datasets (orders, users, click events, A/B test, server logs, stocks, ...).
- **A custom Python keyboard for the iPhone.** The system keyboard never pops up. Instead you get a symbol row (`( ) [ ] { } : = " '`), digits on long-press, operator keys (`== != <= >= += ** //`), auto-indent, auto-closing brackets and quotes, a space-bar trackpad (hold and drag to move the cursor), and a suggestion bar that knows Python keywords, your variables and the methods of strings, lists, dicts and DataFrames.
- **Exams and an interview simulator.** Each unit has a timed exam, and there are 7 mock interview rounds (phone screen, arrays & hashing, graphs/heaps/DP, data engineering, data science, SQL, final onsite loop). They are graded A+…F on **hidden tests**, interviews come with a hiring verdict, and you get a full review with model solutions.
- **Duolingo mechanics.** XP, daily goal, streak, belts (white → black), mistakes re-queued until you get them right, and spaced-repetition review of everything you got wrong.
- **Everything is unlocked from the start.** No server and no account: progress is stored in **cookies** (mirrored to localStorage) on each device. Profile → Export/Import moves it between devices.

## Start it on the Mac

Double-click **`PyDojo.app`** in this folder. You can drag it into the Dock.
It starts a small local server in the background (port 8765) and opens PyDojo in your browser.

For an app window without browser chrome: in Safari, choose **File → Add to Dock**. The launcher then opens that web app automatically.

Alternatives:
```bash
python3 serve.py --open      # foreground; Ctrl+C stops it
python3 serve.py --stop      # stop the background server started by PyDojo.app
```
`Start PyDojo.command` does the same in a Terminal window.

Mac shortcuts: **Cmd+Enter** checks your code, **Shift+Enter** runs it, **1–6** pick answers, **Enter** continues.
The on-screen Python keyboard can also be shown on the Mac (keyboard icon in a lesson, or Profile → Settings).

## Use it on the iPhone

Easiest: open **https://hrvojekrizic.ch/pydojo/** and tap **Share → Add to Home Screen**. It works anywhere, and offline after the first visit.

Or, while the local server runs on your Mac (launched via `PyDojo.app`), open this address on your iPhone. Both devices need to be on the same Wi-Fi:

**http://Hrvojes-MacBook-Pro.local:8765/**

(Profile → "Use on iPhone" shows this link with a QR code.) Then tap **Share → Add to Home Screen** for a full-screen app.
The first time, macOS may ask whether python3 may accept incoming connections. Allow it.

> Progress lives per device and per address. Use Profile → Export/Import to carry it over.

To use it anywhere, without the Mac running, host the folder on any static HTTPS host (GitHub Pages, Cloudflare Pages, Netlify).
It is a plain static site with no build step. Over HTTPS it also works offline after the first visit (service worker).

## How it works

```
index.html, css/app.css      app shell and design (light/dark)
js/app.js                    router, learning path, practice, exams list, profile, playground
js/lesson.js                 lesson/review/drill player (check → feedback → re-queue mistakes)
js/exam.js                   timed exams & interviews, grading, review
js/steps.js                  the six exercise types
js/editor.js                 custom code editor (own caret/selection, so iOS never shows its keyboard)
js/keyboard.js, suggest.js   the Python keyboard and its suggestion bar
js/runner.js, py-worker.js   Pyodide in a Web Worker (infinite loops are stopped and the worker restarted)
js/pycore.js, pyharness.js   grading engine shared by the app and the validator
js/store.js                  progress in cookies + localStorage, XP/streak/belts, spaced repetition
content/uNN-*.js             one file per unit; content/interviews.js
data/                        practice datasets (regenerate with tools/gen_datasets.py)
```

### Content checks
Every exercise is verified by running it through the same Python engine the app uses. The validator checks that reference solutions pass, that starter code and typical wrong solutions fail, that predicted outputs are exact, and that examples run:
```bash
cd tools && npm install        # once (pyodide + playwright)
node tools/validate.mjs        # whole course
node tests/render-all.mjs      # renders every step in WebKit (server must be running)
```
See `CONTENT_GUIDE.md` for the content format.

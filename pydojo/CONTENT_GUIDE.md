# PyDojo content guide

PyDojo is a Duolingo-style, practice-first Python course. It runs in the browser
(iPhone Safari and Mac) on **Pyodide 314.0.7 → Python 3.14.2, pandas 3.0.2,
numpy 2.4.6, sqlite3 (SQLite 3.39), matplotlib 3.10**. The learner wants to get hired
at data-heavy big-tech companies (SWE, data engineer, data scientist), starting
from zero Python.

Every unit lives in one ES module: `content/uNN-slug.js`, with the unit object as
its default export. The interview simulator lives in `content/interviews.js`.
`content/u01-first-steps.js` is the reference example. Read it before writing.

**Validate every file before you call it done:**

```
cd PyDojo && node tools/validate.mjs content/u05-lists.js
```

It runs every reference solution, starter, wrong answer, predicted output and
example through the real grading engine. A file is done when it reports
**OK** (warnings are worth fixing, errors are mandatory).

---

## Unit object

```js
export default {
  id: 'u05',                 // uNN, unique
  order: 5,                  // position in the course
  track: 'foundations',      // 'foundations' | 'data' | 'interview'
  title: 'Lists & Tuples',
  subtitle: 'indexing, slicing, sorting, unpacking',  // ≤ 45 chars
  icon: '📚',                // one emoji
  color: '#2F80ED',          // unit accent colour (hex)
  lessons: [ /* 4–6 lessons */ ],
  exam: { /* see Exams */ },
};
```

## Lesson object

```js
{
  id: 'u05-l2',              // uNN-lK, unique
  title: 'Slicing',
  summary: 'Grab parts of a list with [start:stop:step].', // one sentence
  steps: [ /* 9–14 steps */ ],
}
```

**Teach, then practise, then teach again.** A lesson alternates short `learn`
cards with exercises. Two thirds or more of the steps are exercises. Every lesson
ends with at least **two `code` exercises**. The last one combines the lesson's
ideas. Order the exercises from easy to hard. Never quiz on something that hasn't
been taught yet (in this unit or an earlier one).

## Step types

All text fields (`body`, `prompt`, `explain`, hints, options) use **markdown-lite**:
paragraphs (blank line), `inline code`, **bold**, *italic*, `- bullets`, `1. lists`,
fenced ```` ```python ```` blocks, `> tip callouts`, and simple `| pipe | tables |`.

### learn: a tutorial card
```js
{ type: 'learn', title: 'Return vs print',
  body: 'A function **returns** a value back to the caller...',   // ≤ 120 words
  code: 'def double(x):\n    return x * 2\n\nprint(double(21))',  // optional runnable example
  run: true,           // default true when code is present. Validator runs it; it must not raise.
  setup: '' }          // optional hidden code run before `code`
```
Teach ONE idea per card, with a concrete example. Use the code example for what
the card explains. The learner can run and edit it.

### choice: multiple choice
```js
{ type: 'choice', prompt: 'What does this print?',
  code: 'x = 7 // 2\nprint(x)',          // optional code shown above the options
  options: ['3', '3.5', '4', '3.0'],     // 2–6 options, short
  answer: 0,                              // index of the correct option
  checkOutput: true,                      // validator proves options[answer] == real printed output
  explain: '`//` is floor division...' }  // shown after answering (always write one)
```
Use `checkOutput: true` whenever the question is "what does this print". For an
error, the option text must be exactly `ErrorType: message`, as Python prints it.
Make distractors plausible: the mistakes a learner really makes.

### output: type the exact output
```js
{ type: 'output', prompt: 'Type exactly what this prints.',
  code: 'for i in range(3):\n    print(i * i)',
  answer: '0\n1\n4',
  explain: '...' }
```
The validator checks `answer` against the real output. Trailing spaces and blank
lines are ignored, all other spacing counts. Keep outputs to 1–4 short lines.

### blanks: fill in the blanks from a word bank
```js
{ type: 'blanks', prompt: 'Complete the function so it returns the square.',
  code: 'def square(n):\n    ___ n ___ 2',
  bank: ['return', '**', 'print', '*', '//', 'yield'],
  answer: ['return', '**'],               // one token per ___, in order
  accept: [],                             // optional: other fully-correct answer arrays
  tests: [{ call: 'square(5)', expect: '25' }],   // optional: proves the filled code works
  explain: '...' }
```
Use 1–3 blanks and 2–4 distractor tokens. The filled-in program must run, or
pass `tests` when given. Never write `___` anywhere else in the code.

### order: arrange lines of code (Parsons problem)
```js
{ type: 'order', prompt: 'Arrange the lines to print the even numbers below 10.',
  lines: ['for n in range(10):', '    if n % 2 == 0:', '        print(n)'],  // correct order, real indentation
  distractors: ['    if n % 2 = 0:'],   // optional, 0–2 plausible wrong lines
  tests: [{ stdout: '0\n2\n4\n6\n8\n' }],  // optional
  explain: '...' }
```
3–9 lines, each unique. Make exactly one order correct. Don't include two
independent lines that could swap places.

### code: write (or fix) real code, graded by tests
```js
{ type: 'code', kind: 'write',            // 'write' (default) or 'fix' (starter contains a bug)
  title: 'Count the vowels',              // short card title
  prompt: 'Write `count_vowels(text)` that returns how many vowels (a, e, i, o, u, any case) are in `text`.\n\n```python\ncount_vowels("Data") # 2\n```',
  starter: 'def count_vowels(text):\n    pass\n',
  solution: 'def count_vowels(text):\n    return sum(1 for ch in text.lower() if ch in "aeiou")\n',
  setup: '',                              // optional hidden code run before user code (e.g. data)
  tests: [
    { call: 'count_vowels("Data")', expect: '2' },
    { call: 'count_vowels("")', expect: '0' },
    { call: 'count_vowels("AEIOU xyz")', expect: '5', hidden: true },
    { call: 'count_vowels("rhythm")', hidden: true },  // no expect → compared with the reference solution
  ],
  hints: ['Loop over each character...', 'Lower-case the text first so "A" counts too.'],
  wrong: ['def count_vowels(text):\n    return sum(1 for ch in text if ch in "aeiou")\n'],  // common mistakes; must FAIL
  require: [],  forbid: [],               // optional static rules (below)
  explain: 'Shown after solving: why the solution works, alternatives, complexity.' }
```
Rules:
- The **starter** gives the function signature (or the skeleton) and must fail the tests.
- Write the prompt like a real task: say what to return, the input types and edge
  cases, and show 1–2 examples.
- 3–8 tests. Visible tests use an explicit `expect`. Add `hidden: true` edge cases
  (empty input, ties, negatives, big input).
- Add 1–3 `wrong` solutions (the realistic mistakes) to prove the tests catch them.
- Hints go from gentle to nearly the answer (2–3 hints).
- `explain` teaches. Mention complexity in the algorithm and data units.

### Tests: one of `call` / `var` / `stdout` / `assert` / `code`
| test | meaning |
|---|---|
| `{ call: 'f(2, 3)', expect: '5' }` | evaluate `call` in the learner's namespace. `expect` is a Python expression evaluated in the reference-solution namespace (so `pd`, helpers etc. work there) |
| `{ call: 'f(big)' }` | no `expect`: compare with what the reference solution returns |
| `{ var: 'total', expect: '42' }` | a top-level variable after the learner's code ran (`expect` optional) |
| `{ stdout: 'Hello\n' }` / `{ stdout: true }` | full printed output of the learner's program equals the text / the solution's output |
| `{ assert: 'len(result) == 3', name: 'three items', fail: 'message' }` | expression must be truthy |
| `{ code: 'assert f([]) == []', name: 'empty list' }` | statements must run without raising |

Options for any test: `given` (see below), `name` (label shown to the learner), `hidden: true`,
`unordered: true` (compare as sorted lists), `tol: 1e-6` (float tolerance, which is
also the default for floats), `raises: 'ValueError'` (the call must raise this),
`maxMs: 800` (a performance check, see below).

**`given`: re-run a script with other inputs.** Early units have no functions yet, so
exercises are scripts that read variables from `setup`. A learner could just
hard-code the answer. Add `given` tests to stop that. The learner's whole program
(and the reference solution) runs again from scratch after `setup` plus the `given`
assignments, and then the test is evaluated:
`{ given: 'seconds = 3661', stdout: true }` or `{ given: 'a = "7"\nb = "-2"', var: 'total', hidden: true }`.
Every script-style exercise with `setup` variables needs at least one `given` test.

How comparisons work: floats are approximate. Bools must be bools, not 0/1. List
and tuple must match their type. Dicts compare keys and values. numpy arrays
compare by shape and values. pandas DataFrames and Series compare with
`assert_frame_equal(check_dtype=False)`, so **the index matters**: tell the learner
in the prompt whether to `reset_index()`. Use `unordered` when order doesn't matter.

### Static rules: `require` / `forbid`
Keywords: `for while lambda yield class def return try with if import raise
comprehension listcomp dictcomp setcomp genexp fstring recursion decorator walrus`.
Any other word means a name, attribute or module (e.g. `forbid: ['sorted', 'sort']`,
`require: ['groupby']`). Use them sparingly, only when the exercise is about the
technique.

## Exams (one per unit)
```js
exam: {
  id: 'u05-exam', title: 'Lists & Tuples Exam', minutes: 20,
  intro: 'One or two sentences about what is tested.',
  questions: [ /* 7–10 questions: choice / output / blanks / order / code */ ],
}
```
- **No learn cards.** No feedback until the end. Graded A+…F.
- Harder than the lessons. Combine ideas from the whole unit, like real interview
  questions. At least **3 `code` questions**, each with hidden tests and `wrong` solutions.
- `points` per question is optional. Defaults: choice 2, output/blanks/order 3, code 10.

## Interviews (`content/interviews.js`)
```js
export default { id: 'interviews', interviews: [
  { id: 'iv-phone', title: 'Python Phone Screen', level: 'Medium', minutes: 35,
    style: 'Big-tech phone screen',
    intro: 'What this round is like and what interviewers look for.',
    questions: [ /* mostly code, like an exam */ ] },
]}
```

## Mobile + engine constraints (important)
- The phone editor shows **~44 characters per line**. Keep example and solution
  lines ≤ 44 characters where possible, and never over 70. Prefer short names
  (`nums`, `df`, `s`) and break long expressions over lines.
- Options ≤ 40 characters. Prompts: short paragraphs. The phone screen is small.
- Determinism: seed randomness (`random.seed(0)`, `np.random.default_rng(0)`).
  Never print times, ids or memory addresses. No `input()`, no network, no `time.sleep`.
- numpy 2 scalars print as `np.float64(1.5)` inside lists or with `repr`, but `print(x)`
  shows `1.5`. Avoid those reprs in output questions, or convert with `float()`/`int()`.
- pandas 3: text columns have dtype `str` (not `object`). Copy-on-Write is always on,
  so chained assignment `df[a][b] = …` never works: teach `df.loc[...] = …`.
  `print(df)` output is fine for output steps, but keep frames tiny.
- Solutions must run in well under a second. Performance tests (`maxMs`) need inputs
  where the naive solution is >20× slower than the limit. Phones run ~2× slower than
  the validator.
- A starter or wrong solution must **never loop forever**.
- Datasets are available to every exercise as files (`pd.read_csv('data/orders.csv')`,
  `open('data/server.log')`):

| file | columns / format |
|---|---|
| `data/orders.csv` (1200 rows, 2025) | order_id, user_id, order_date (YYYY-MM-DD), product, category (Electronics, Books, Home, Sports, Toys, Grocery), quantity, unit_price, country (DE, US, FR, HR, UK, ES, IT, NL), status (completed, cancelled, returned) |
| `data/users.csv` (300) | user_id, name, signup_date, country, plan (free, pro, team), age (some missing), referrer (ads, organic, friend, social, some missing) |
| `data/events.csv` (1997, Nov 2025) | user_id, ts ("YYYY-MM-DD HH:MM:SS"), event (page_view, search, add_to_cart, checkout, purchase), device (mobile, desktop, tablet) |
| `data/ab_test.csv` (3000) | user_id, group (control, treatment), device (mobile, desktop), converted (0/1), revenue |
| `data/server.log` (600 lines) | `203.0.113.5 - - [12/Nov/2025:09:00:40 +0000] "POST /api/checkout HTTP/1.1" 200 8940 0.137` (ip, time, method, path, status, bytes, response seconds) |
| `data/weather.csv` (1095) | date, city (Zagreb, Berlin, Madrid), temp_c, rain_mm. Daily for 2025 |
| `data/stocks.csv` (750) | date, ticker (PYDJ, DATA, BIGQ), close, volume. 250 trading days |
| `data/customers_messy.csv` (128) | customer_id, name (messy case/spaces), email (some missing/invalid), country ("Germany", " germany ", "DE", …), signup_date, spend ("1200.50", "€1,200.50", "", "n/a"). Has 8 exact duplicate rows |
| `data/employees.csv` (43) | emp_id, name, dept_id (one row empty), manager_id (empty for managers), salary, hire_date |
| `data/departments.csv` (5) | dept_id, dept_name, location |
| `data/words.txt` | ~170 words of plain English text, 11 lines |

Don't hard-code facts about these datasets in prompts unless the validator
checks them through tests or `checkOutput`.

## Tone
Friendly and direct, like a good senior engineer pairing with you. Explain *why*,
not just *what*. Point out the interview angle ("Interviewers love asking…") and
the big-data angle ("on a billion rows this matters because…") wherever it's real.

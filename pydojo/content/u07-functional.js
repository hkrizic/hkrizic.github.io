// Unit 7 — Comprehensions & Functional Python ("Functions II").
import { py, md } from './helpers.js';

export default {
  id: 'u07',
  order: 7,
  track: 'foundations',
  title: 'Comprehensions & Functional Python',
  subtitle: 'comprehensions, lambda, higher-order funcs',
  icon: '⚡',
  color: '#14B8A6',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u07-l1',
      title: 'List Comprehensions',
      summary: 'Build, transform and filter lists in a single readable expression.',
      steps: [
        {
          type: 'learn',
          title: 'From loop to comprehension',
          body: md`
            You've written this loop many times: start with an empty list, loop, \`append\`.

            A **list comprehension** does the same job in one expression:
            \`[expression for item in iterable]\`. Read it as *"the expression, for every item"*.

            It builds a **new** list and leaves the original untouched.
          `,
          code: py`
            prices = [10.0, 24.5, 3.2]

            with_vat = []
            for p in prices:
                with_vat.append(round(p * 1.2, 2))
            print(with_vat)

            with_vat = [round(p * 1.2, 2) for p in prices]
            print(with_vat)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            nums = [1, 2, 3, 4]
            print([n * n for n in nums])
            print([str(n) for n in nums])
          `,
          answer: "[1, 4, 9, 16]\n['1', '2', '3', '4']",
          explain: 'The expression runs once per item. `str(n)` turns each number into text, so the second list holds strings, shown with quotes.',
        },
        {
          type: 'learn',
          title: 'Filtering with if',
          body: md`
            Add an \`if\` at the **end** to keep only some items:
            \`[expr for x in xs if condition]\`.

            Items where the condition is false are skipped, so the result can be **shorter** than the input. This replaces the loop + \`if\` + \`append\` pattern.
          `,
          code: py`
            orders = [120, 35, 990, 15, 300]
            big = [o for o in orders if o >= 100]
            print(big)
            print(len(big), "big orders")
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            words = ["data", "is", "the", "new", "oil"]
            print([w.upper() for w in words if len(w) > 2])
          `,
          options: ["['DATA', 'THE', 'NEW', 'OIL']", "['DATA']", "['IS']", "['DATA', 'IS', 'THE', 'NEW', 'OIL']"],
          answer: 0,
          checkOutput: true,
          explain: 'The filter `len(w) > 2` drops only "is". The expression `w.upper()` then runs for the items that were kept.',
        },
        {
          type: 'blanks',
          prompt: 'Complete the comprehension so it collects the names of **active** users.',
          code: py`
            users = [
                {"name": "ana", "active": True},
                {"name": "bo", "active": False},
                {"name": "cy", "active": True},
            ]
            names = [u["name"] ___ u in users ___ u["active"]]
            print(names)
          `,
          bank: ['for', 'if', 'while', 'else', 'where', 'and'],
          answer: ['for', 'if'],
          tests: [{ stdout: "['ana', 'cy']\n" }],
          explain: 'Pattern: `[what for item in items if keep]`. Python has no `where` keyword (that is SQL), and `while` can\'t appear in a comprehension.',
        },
        {
          type: 'learn',
          title: 'if/else in front vs if at the end',
          body: md`
            Two different \`if\`s can appear in a comprehension, with two different jobs:

            - **Filter** (at the end): \`[x for x in xs if x > 0]\` **drops** items.
            - **Conditional expression** (in front): \`[x if x > 0 else 0 for x in xs]\` keeps **every** item but **chooses its value**.

            The front version needs an \`else\`, because it must produce a value for each item. The filter at the end can't have an \`else\`.
          `,
          code: py`
            temps = [21, -3, 18, -7]
            print([t for t in temps if t > 0])
            print([t if t > 0 else 0 for t in temps])
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: 'print([n if n % 2 else -n for n in range(5)])',
          options: ['[0, 1, -2, 3, -4]', '[1, 3]', '[0, -1, 2, -3, 4]', '[0, 2, 4]'],
          answer: 0,
          checkOutput: true,
          explain: '`n % 2` is 1 (truthy) for odd numbers, so they stay as they are. Even numbers take the `else` branch and get negated (and `-0` is just `0`). No item is dropped: the list still has 5 elements.',
        },
        {
          type: 'output',
          prompt: 'How long is each list? Type the output.',
          code: py`
            xs = range(10)
            a = [x for x in xs if x % 3 == 0]
            b = [x if x % 3 == 0 else None for x in xs]
            print(len(a), len(b))
          `,
          answer: '4 10',
          explain: '`a` filters: only 0, 3, 6, 9 survive. `b` maps every one of the 10 items to a value (`x` or `None`), so its length always equals the input length.',
        },
        {
          type: 'learn',
          title: 'Know when to stop',
          body: md`
            Comprehensions are great for **one** transformation plus **one** filter. Go back to a normal loop when you need:

            - several statements, a \`try/except\` or a \`print\` per item
            - side effects: \`[print(x) for x in xs]\` builds a useless list of \`None\`s
            - more clauses than you can read aloud in one breath

            The loop variable is **local** to the comprehension, so it never overwrites a variable with the same name outside.

            > Comprehensions are also a bit faster than \`append\` loops, because Python doesn't look up \`.append\` on every item.
          `,
          code: py`
            x = "keep me"
            squares = [x * x for x in range(4)]
            print(x)
            print(squares)
          `,
        },
        {
          type: 'order',
          prompt: 'A list `prices` exists. Arrange the lines into the **loop version** of `[p * 0.9 for p in prices if p > 100]` and print the result.',
          setup: 'prices = [80, 150, 200]',
          lines: ['result = []', 'for p in prices:', '    if p > 100:', '        result.append(p * 0.9)', 'print(result)'],
          distractors: ['        result = p * 0.9'],
          tests: [{ stdout: '[135.0, 180.0]\n' }],
          explain: 'Every comprehension unrolls into exactly this shape: empty list, `for`, optional `if`, `append`. If you can write the loop, you can write the comprehension, and vice versa.',
        },
        {
          type: 'code',
          title: 'Clean the email list',
          prompt: md`
            Sign-up forms produce messy emails. Write \`clean_emails(emails)\` that returns a **new list** where every email is stripped of surrounding whitespace and lower-cased. **Drop** entries that are empty or only whitespace.

            \`\`\`python
            clean_emails([" Ana@X.com", "", "bo@y.org  ", "   "])
            # ['ana@x.com', 'bo@y.org']
            \`\`\`
          `,
          starter: 'def clean_emails(emails):\n    pass\n',
          solution: py`
            def clean_emails(emails):
                return [e.strip().lower() for e in emails
                        if e.strip()]
          `,
          tests: [
            { call: 'clean_emails([" Ana@X.com", "", "bo@y.org  ", "   "])', expect: "['ana@x.com', 'bo@y.org']" },
            { call: 'clean_emails([])', expect: '[]' },
            { call: 'clean_emails(["   ", "\\t"])', expect: '[]', hidden: true },
            { call: 'clean_emails(["CY@Z.IO"])', expect: "['cy@z.io']", hidden: true },
            { code: 'xs = [" A@B.C "]\nclean_emails(xs)\nassert xs == [" A@B.C "]', name: 'does not modify the input', hidden: true },
          ],
          hints: [
            'The expression is `e.strip().lower()`. The filter decides whether to keep `e` at all.',
            'An empty string is falsy, so `if e.strip()` drops entries that are blank after stripping.',
          ],
          wrong: [
            'def clean_emails(emails):\n    return [e.strip().lower() for e in emails if e]\n',
            'def clean_emails(emails):\n    return [e.lower() for e in emails if e.strip()]\n',
          ],
          explain: md`
            The filter must test the **stripped** value: \`"   "\` is truthy until you strip it, which is the classic data-cleaning bug (it turns into an empty email after cleaning).

            Calling \`strip()\` twice per item is fine here. The comprehension runs in O(n) and never touches the original list.
          `,
        },
        {
          type: 'code',
          title: 'Clip sensor readings',
          prompt: md`
            A sensor sends readings. **Negative** values are errors and must be dropped; anything above \`cap\` must be clipped down to \`cap\`. Write \`clip(readings, cap)\` that returns the cleaned list in the original order, using **one list comprehension**.

            \`\`\`python
            clip([5, -1, 12, 7, 30], 10)  # [5, 10, 7, 10]
            \`\`\`
          `,
          starter: 'def clip(readings, cap):\n    pass\n',
          solution: py`
            def clip(readings, cap):
                return [r if r <= cap else cap
                        for r in readings if r >= 0]
          `,
          tests: [
            { call: 'clip([5, -1, 12, 7, 30], 10)', expect: '[5, 10, 7, 10]' },
            { call: 'clip([], 5)', expect: '[]' },
            { call: 'clip([0, 10, -0.5, 10.5], 10)', expect: '[0, 10, 10]', hidden: true },
            { call: 'clip([-3, -2], 1)', expect: '[]', hidden: true },
          ],
          require: ['listcomp'],
          hints: [
            'You need both kinds of `if`: one at the end to drop negatives, one in front to choose between `r` and `cap`.',
            '`[r if r <= cap else cap for r in readings if r >= 0]`. `min(r, cap)` works as the expression too.',
          ],
          wrong: [
            'def clip(readings, cap):\n    return [r if r <= cap else cap for r in readings if r > 0]\n',
            'def clip(readings, cap):\n    return [r for r in readings if 0 <= r <= cap]\n',
          ],
          explain: 'The trailing `if` decides **which** items appear, the front `if/else` decides **what** each one becomes. Zero is a valid reading, so the filter is `>= 0`, not `> 0`. Clipping (also called winsorizing) is a standard way to tame outliers before computing averages.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the normaliser',
          prompt: md`
            \`normalize(scores)\` should turn every score into a fraction of the **highest** score, rounded to 2 decimals, and turn missing scores (\`None\`) into \`0.0\`. You can assume at least one score is a positive number.

            \`\`\`python
            normalize([50, None, 100])  # [0.5, 0.0, 1.0]
            \`\`\`

            It doesn't even run. Fix it.
          `,
          starter: py`
            def normalize(scores):
                top = max(scores)
                return [round(s / top, 2) for s in scores
                        if s is not None else 0.0]
          `,
          solution: py`
            def normalize(scores):
                top = max([s for s in scores if s is not None])
                return [round(s / top, 2) if s is not None else 0.0
                        for s in scores]
          `,
          tests: [
            { call: 'normalize([50, None, 100])', expect: '[0.5, 0.0, 1.0]' },
            { call: 'normalize([3])', expect: '[1.0]' },
            { call: 'normalize([None, 8, 2, None])', expect: '[0.0, 1.0, 0.25, 0.0]', hidden: true },
            { call: 'normalize([1, 3])', expect: '[0.33, 1.0]', hidden: true },
          ],
          hints: [
            'The first error is a SyntaxError: an `if/else` that **chooses a value** belongs in front of the `for`.',
            '`max()` can\'t compare `None` with numbers. Take the max of the scores that are not `None`.',
          ],
          wrong: [
            'def normalize(scores):\n    top = max([s for s in scores if s is not None])\n    return [round(s / top, 2) for s in scores if s is not None]\n',
          ],
          explain: md`
            Two bugs, both about the two kinds of \`if\`:

            1. \`... for s in scores if cond else x\` is a SyntaxError. A filter can't have an \`else\`; a value choice goes in front.
            2. \`max\` of a list containing \`None\` raises \`TypeError\`. Filter first, then take the max.

            Turning the missing values into \`0.0\` instead of dropping them keeps the output aligned with the input, which matters when each position is a user or a day.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u07-l2',
      title: 'Dict, Set & Nested Comprehensions',
      summary: 'Build dicts and sets in one line, flatten and transpose with nested comprehensions.',
      steps: [
        {
          type: 'learn',
          title: 'Dict comprehensions',
          body: md`
            Same idea with curly braces and a \`key: value\` pair:
            \`{key: value for item in iterable}\`.

            Typical jobs: build a lookup from a list, transform the values of a dict via \`.items()\`, or **invert** a dict. If two items produce the same key, the **last one wins**.
          `,
          code: py`
            names = ["ana", "bo", "cyril"]
            print({n: len(n) for n in names})

            prices = {"mug": 8.0, "tee": 20.0}
            print({k: v * 2 for k, v in prices.items()})
            print({v: k for k, v in prices.items()})
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            words = ["sql", "python", "sql", "go"]
            lengths = {w: len(w) for w in words}
            print(lengths)
            print(len(lengths))
          `,
          answer: "{'sql': 3, 'python': 6, 'go': 2}\n3",
          explain: 'The second `"sql"` just writes the same key again. A dict keeps one entry per key, in first-insertion order.',
        },
        {
          type: 'blanks',
          prompt: 'Keep only the products that cost more than 10.',
          code: py`
            prices = {"mug": 8, "lamp": 35, "pen": 2, "desk": 120}
            pricey = {k: v ___ k, v in prices.___() if v > 10}
            print(pricey)
          `,
          bank: ['for', 'items', 'keys', 'values', 'while', 'get'],
          answer: ['for', 'items'],
          tests: [{ stdout: "{'lamp': 35, 'desk': 120}\n" }],
          explain: '`.items()` yields `(key, value)` pairs, which unpack into `k, v`. Looping over `prices` directly (or `.keys()`) would only give the keys.',
        },
        {
          type: 'code',
          title: 'Price list in euros',
          prompt: md`
            \`to_eur(prices_usd, rate)\` gets a dict \`sku → price in USD\` and an exchange rate. Return a **new** dict with every price converted (\`price * rate\`) and rounded to 2 decimals. Skip SKUs whose price is \`None\` (not priced yet). A price of \`0.0\` is a real price.

            \`\`\`python
            to_eur({"A1": 10.0, "B2": None, "C3": 2.5}, 0.9)
            # {'A1': 9.0, 'C3': 2.25}
            \`\`\`
          `,
          starter: 'def to_eur(prices_usd, rate):\n    pass\n',
          solution: py`
            def to_eur(prices_usd, rate):
                return {sku: round(p * rate, 2)
                        for sku, p in prices_usd.items()
                        if p is not None}
          `,
          tests: [
            { call: 'to_eur({"A1": 10.0, "B2": None, "C3": 2.5}, 0.9)', expect: "{'A1': 9.0, 'C3': 2.25}" },
            { call: 'to_eur({}, 0.9)', expect: '{}' },
            { call: 'to_eur({"X": 0.0, "Y": None}, 2)', expect: "{'X': 0.0}", hidden: true },
            { call: 'to_eur({"Z": 19.99, "Q": 1}, 0.5)', hidden: true },
          ],
          hints: [
            'Loop over `prices_usd.items()` to get both the SKU and the price.',
            'Filter with `if p is not None`. A plain `if p` would also drop the free item priced `0.0`.',
          ],
          wrong: [
            'def to_eur(prices_usd, rate):\n    return {sku: round(p * rate, 2) for sku, p in prices_usd.items() if p}\n',
            'def to_eur(prices_usd, rate):\n    return {sku: p * rate for sku, p in prices_usd.items() if p is not None}\n',
          ],
          explain: '`if p` and `if p is not None` look alike but differ for `0` and `0.0`. When "missing" is encoded as `None`, test for `None` explicitly. Truthiness checks silently eat real zeros, a frequent bug in metrics code.',
        },
        {
          type: 'learn',
          title: 'Set comprehensions',
          body: md`
            Curly braces **without** a colon build a **set**: \`{expr for x in xs}\`. Duplicates vanish automatically, which is perfect for *"which distinct values appear?"*.

            Careful: \`{}\` on its own is an empty **dict**. Write \`set()\` for an empty set.

            Sets have no order, so wrap them in \`sorted()\` when you need stable output.
          `,
          code: py`
            emails = ["a@gmail.com", "b@corp.io", "c@gmail.com"]
            domains = {e.split("@")[1] for e in emails}
            print(sorted(domains))
            print(type({}), type({1}))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            events = ["view", "click", "view", "buy", "click"]
            kinds = {e for e in events}
            print(len(events), len(kinds))
          `,
          options: ['5 3', '5 5', '3 3', '5 4'],
          answer: 0,
          checkOutput: true,
          explain: 'The set keeps one copy of each distinct value: view, click, buy. Counting distinct values ("unique users today") is one of the most common metrics there is.',
        },
        {
          type: 'learn',
          title: 'Several for clauses',
          body: md`
            A comprehension can have several \`for\` clauses. They run like **nested loops, in the order you'd write them**, outer loop first:

            \`\`\`python
            flat = []
            for row in rows:
                for x in row:
                    flat.append(x)
            \`\`\`

            becomes \`[x for row in rows for x in row]\`. The same shape produces every **combination** of two lists (the cartesian product).
          `,
          code: py`
            rows = [[1, 2], [3], [4, 5, 6]]
            print([x for row in rows for x in row])

            sizes = ["S", "M"]
            colors = ["red", "blue"]
            print([s + "-" + c for s in sizes for c in colors])
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            pairs = [(a, b) for a in "xy" for b in [1, 2]]
            print(pairs)
            print(len(pairs))
          `,
          answer: "[('x', 1), ('x', 2), ('y', 1), ('y', 2)]\n4",
          explain: 'The first `for` is the outer loop: for `"x"` the inner loop runs fully (1, 2), then for `"y"`. Two by two gives 4 pairs. That is exactly what a SQL `CROSS JOIN` produces.',
        },
        {
          type: 'learn',
          title: 'Comprehension inside a comprehension',
          body: md`
            Put a whole comprehension in the **expression** slot and you get a list of lists. That's how you **transpose** a matrix (rows become columns):

            \`[[row[i] for row in m] for i in range(len(m[0]))]\`

            Compare the shapes:
            - \`[x for row in m for x in row]\`: one bracket, two \`for\`s → **flat**
            - \`[[...] for ...]\`: brackets inside → **nested**

            > Stop at two levels. Beyond that a loop or a helper function reads better, and in an interview, readable beats clever.
          `,
          code: py`
            m = [[1, 2, 3],
                 [4, 5, 6]]
            t = [[row[i] for row in m] for i in range(3)]
            print(t)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            grid = [[1, 2], [3, 4], [5, 6]]
            print([[r[i] * 10 for r in grid] for i in range(2)])
          `,
          options: ['[[10, 30, 50], [20, 40, 60]]', '[10, 30, 50, 20, 40, 60]', '[[10, 20], [30, 40], [50, 60]]', '[[10, 20, 30], [40, 50, 60]]'],
          answer: 0,
          checkOutput: true,
          explain: 'The outer comprehension runs over column indexes 0 and 1. For each one, the inner comprehension walks down all rows and picks that column: column 0 is 1, 3, 5, column 1 is 2, 4, 6.',
        },
        {
          type: 'code',
          title: 'Unique tags',
          prompt: md`
            Each blog post has a list of tags, typed by hand in random case. Write \`unique_tags(posts)\` that returns a **sorted list** of all distinct tags, lower-cased.

            \`\`\`python
            posts = [{"tags": ["Python", "data"]},
                     {"tags": []},
                     {"tags": ["DATA", "sql"]}]
            unique_tags(posts)  # ['data', 'python', 'sql']
            \`\`\`
          `,
          setup: 'POSTS = [{"tags": ["Python", "data"]}, {"tags": []}, {"tags": ["DATA", "sql"]}]',
          starter: 'def unique_tags(posts):\n    pass\n',
          solution: py`
            def unique_tags(posts):
                return sorted({t.lower()
                               for p in posts
                               for t in p["tags"]})
          `,
          tests: [
            { call: 'unique_tags(POSTS)', expect: "['data', 'python', 'sql']", name: 'unique_tags(posts) from the example' },
            { call: 'unique_tags([])', expect: '[]' },
            { call: 'unique_tags([{"tags": ["B", "a", "b", "A"]}])', expect: "['a', 'b']", hidden: true },
            { call: 'unique_tags([{"tags": ["x"]}, {"tags": ["X", "y"]}, {"tags": ["Y"]}])', expect: "['x', 'y']", hidden: true },
          ],
          hints: [
            'Two `for` clauses: first over the posts, then over each post\'s `p["tags"]`.',
            'A set comprehension removes duplicates; `sorted()` turns the set into a sorted list.',
          ],
          wrong: [
            'def unique_tags(posts):\n    return sorted({t for p in posts for t in p["tags"]})\n',
            'def unique_tags(posts):\n    return [t.lower() for p in posts for t in p["tags"]]\n',
            'def unique_tags(posts):\n    return sorted({t.lower() for t in p["tags"] for p in posts})\n',
          ],
          explain: md`
            The \`for\` clauses must appear in loop order: \`for p in posts\` first, so that \`p\` exists when \`for t in p["tags"]\` runs. Swapping them gives a \`NameError\`.

            Lower-casing **before** deduplicating matters: \`"DATA"\` and \`"data"\` should collapse into one tag. Building the set is O(n) and sorting the k distinct tags is O(k log k).
          `,
        },
        {
          type: 'code',
          title: 'Transpose a matrix',
          prompt: md`
            Write \`transpose(m)\` that turns rows into columns. \`m\` is a list of rows, all the same length (not necessarily square). An empty matrix \`[]\` gives \`[]\`.

            \`\`\`python
            transpose([[1, 2, 3], [4, 5, 6]])
            # [[1, 4], [2, 5], [3, 6]]
            \`\`\`
          `,
          starter: 'def transpose(m):\n    pass\n',
          solution: py`
            def transpose(m):
                if not m:
                    return []
                return [[row[i] for row in m]
                        for i in range(len(m[0]))]
          `,
          tests: [
            { call: 'transpose([[1, 2, 3], [4, 5, 6]])', expect: '[[1, 4], [2, 5], [3, 6]]' },
            { call: 'transpose([[7]])', expect: '[[7]]' },
            { call: 'transpose([])', expect: '[]', hidden: true },
            { call: 'transpose([[1], [2], [3]])', expect: '[[1, 2, 3]]', hidden: true },
            { call: 'transpose([[1, 2], [3, 4], [5, 6]])', expect: '[[1, 3, 5], [2, 4, 6]]', hidden: true },
          ],
          hints: [
            'For each column index `i`, collect `row[i]` from every row.',
            'The number of columns is `len(m[0])`, so handle an empty `m` first.',
          ],
          wrong: [
            'def transpose(m):\n    if not m:\n        return []\n    return [[row[i] for i in range(len(m[0]))] for row in m]\n',
            'def transpose(m):\n    return [[row[i] for row in m] for i in range(len(m[0]))]\n',
            'def transpose(m):\n    if not m:\n        return []\n    return [[row[i] for row in m] for i in range(len(m))]\n',
          ],
          explain: md`
            The **outer** comprehension decides the shape of the result: one inner list per column. Swapping the loops just copies the matrix.

            Using \`len(m)\` instead of \`len(m[0])\` only works for square matrices, which is a bug that hides until real data arrives. Soon you'll also meet \`list(zip(*m))\`, which transposes in one call (it returns tuples).
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u07-l3',
      title: 'lambda & Key Functions',
      summary: 'Write tiny inline functions and sort records by any rule.',
      steps: [
        {
          type: 'learn',
          title: 'lambda: a tiny anonymous function',
          body: md`
            \`lambda args: expression\` creates a function without a name. Its body is **one expression**, whose value is returned automatically: no \`return\`, no statements, no loops.

            \`lambda x: x * 2\` does the same as
            \`\`\`python
            def double(x):
                return x * 2
            \`\`\`

            Use lambdas for short throwaway functions that you pass to another function, like \`sorted\`. If you want to give it a name, write a \`def\`: it shows up properly in tracebacks and can have a docstring.
          `,
          code: py`
            print((lambda x: x * x)(7))
            add = lambda a, b=10: a + b  # demo only
            print(add(5), add(5, 1))
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            power = lambda x, n=2: x ** n
            print(power(3), power(2, 5))
          `,
          answer: '9 32',
          explain: 'Lambdas support default arguments like any function: `power(3)` uses `n=2`, `power(2, 5)` is 2⁵.',
        },
        {
          type: 'choice',
          prompt: 'Which line is **not** valid Python?',
          options: ['lambda x: return x + 1', 'lambda x, y: x if x > y else y', 'lambda: 42', 'lambda s: s.strip().lower()'],
          answer: 0,
          explain: '`return` is a statement, and a lambda body must be a single **expression** whose value is returned automatically. A conditional expression is fine, and a lambda may take no arguments at all.',
        },
        {
          type: 'learn',
          title: 'Sorting with key=',
          body: md`
            \`sorted\`, \`min\` and \`max\` accept \`key=\`: a function that is called **once per item**. Items are then compared by what it returns. You've used named ones (\`key=len\`); a lambda lets you sort by anything:

            - \`sorted(users, key=lambda u: u["age"])\`
            - \`max(orders, key=lambda o: o["total"])\` returns the whole **order**, not just the total

            Python's sort is **stable**: items with equal keys keep their original order.
          `,
          code: py`
            users = [{"name": "ana", "age": 31},
                     {"name": "bo", "age": 25},
                     {"name": "cy", "age": 40}]
            youngest = min(users, key=lambda u: u["age"])
            print(youngest["name"])
            by_age = sorted(users, key=lambda u: u["age"])
            print([u["name"] for u in by_age])
          `,
        },
        {
          type: 'output',
          prompt: 'Careful with the ties. What does this print?',
          code: py`
            words = ["bb", "a", "ccc", "dd", "e"]
            print(sorted(words, key=len))
          `,
          answer: "['a', 'e', 'bb', 'dd', 'ccc']",
          explain: 'Only the lengths are compared. "a" and "e" tie (and so do "bb" and "dd"); a **stable** sort keeps tied items in their original order. It doesn\'t sort them alphabetically.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            sales = {"ana": 120, "bo": 340, "cy": 90}
            print(max(sales, key=lambda k: sales[k]))
            print(max(sales))
          `,
          options: ['bo\ncy', 'bo\nbo', '340\ncy', 'bo\n340'],
          answer: 0,
          checkOutput: true,
          explain: 'Iterating a dict gives its **keys**. With `key=`, the names are compared by their sales, so "bo" wins. Without it, `max` compares the names themselves alphabetically, and "cy" is the largest string.',
        },
        {
          type: 'learn',
          title: 'Sorting by several keys',
          body: md`
            Return a **tuple** from the key function. Tuples compare element by element: first by \`[0]\`, ties broken by \`[1]\`, and so on.

            For **descending** order on a number, negate it:
            \`key=lambda p: (-p[1], p[0])\` means *highest score first, then name A→Z*.

            You can't negate a string. If **every** key should be descending, use \`reverse=True\` instead.
          `,
          code: py`
            players = [("cy", 90), ("bo", 75),
                       ("ana", 90), ("di", 75)]
            ranked = sorted(players,
                            key=lambda p: (-p[1], p[0]))
            print(ranked)
          `,
        },
        {
          type: 'blanks',
          prompt: 'Rank the teams: most points first, ties alphabetically.',
          code: py`
            points = {"red": 7, "blue": 9, "green": 7}
            ranked = sorted(points.items(),
                            key=___ kv: (___kv[1], kv[0]))
            print(ranked)
          `,
          bank: ['lambda', '-', 'def', '+', 'not', 'reverse'],
          answer: ['lambda', '-'],
          tests: [{ stdout: "[('blue', 9), ('green', 7), ('red', 7)]\n" }],
          explain: '`.items()` gives `(team, points)` pairs. The key `(-points, team)` sorts by points descending and breaks ties by name ascending, all in one pass.',
        },
        {
          type: 'output',
          prompt: 'Does `reverse=True` flip the ties too? Type the output.',
          code: py`
            rows = [("b", 2), ("a", 2), ("c", 1)]
            k = lambda r: r[1]
            print(sorted(rows, key=k))
            print(sorted(rows, key=k, reverse=True))
          `,
          answer: "[('c', 1), ('b', 2), ('a', 2)]\n[('b', 2), ('a', 2), ('c', 1)]",
          explain: '`reverse=True` reverses the comparison, not the stability: tied items ("b" before "a") still keep their original order. If you want a defined tie-break, put it in the key tuple.',
        },
        {
          type: 'code',
          title: 'Leaderboard',
          prompt: md`
            \`scores\` maps player → points. Write \`leaderboard(scores)\` that returns the player names ordered by points, **highest first**. Players with equal points are ordered **alphabetically**.

            \`\`\`python
            leaderboard({"zoe": 50, "adam": 80, "max": 50})
            # ['adam', 'max', 'zoe']
            \`\`\`
          `,
          starter: 'def leaderboard(scores):\n    pass\n',
          solution: py`
            def leaderboard(scores):
                return sorted(scores,
                              key=lambda p: (-scores[p], p))
          `,
          tests: [
            { call: 'leaderboard({"zoe": 50, "adam": 80, "max": 50})', expect: "['adam', 'max', 'zoe']" },
            { call: 'leaderboard({})', expect: '[]' },
            { call: 'leaderboard({"b": 1, "c": 1, "a": 1})', expect: "['a', 'b', 'c']", hidden: true },
            { call: 'leaderboard({"x": -5, "y": 0})', expect: "['y', 'x']", hidden: true },
            { call: 'leaderboard({"q": 3, "p": 7, "r": 3, "o": 7, "n": 1})', hidden: true },
          ],
          hints: [
            '`sorted(scores, ...)` iterates over the names. Look up each name\'s points inside the key.',
            'Key: the tuple `(-scores[p], p)`.',
          ],
          wrong: [
            'def leaderboard(scores):\n    return sorted(scores, key=lambda p: scores[p], reverse=True)\n',
            'def leaderboard(scores):\n    return sorted(scores, key=lambda p: (scores[p], p), reverse=True)\n',
          ],
          explain: md`
            \`reverse=True\` alone leaves ties in dict order, and reversing the whole tuple sorts tied names Z→A. Negating only the number gives *points descending, name ascending* in a single O(n log n) sort.

            Interviewers love this exact question because a *defined* tie-break is what makes output reproducible.
          `,
        },
        {
          type: 'code',
          title: 'Sort the orders',
          prompt: md`
            Each order is a dict with \`id\`, \`country\` and \`total\`. Write \`sort_orders(orders)\` that returns the list of order **ids**, sorted by country A→Z and, within a country, by total **highest first**. Don't modify the input list.

            \`\`\`python
            orders = [{"id": 1, "country": "US", "total": 20},
                      {"id": 2, "country": "DE", "total": 5},
                      {"id": 3, "country": "US", "total": 99}]
            sort_orders(orders)  # [2, 3, 1]
            \`\`\`
          `,
          setup: py`
            ORDERS = [{"id": 1, "country": "US", "total": 20},
                      {"id": 2, "country": "DE", "total": 5},
                      {"id": 3, "country": "US", "total": 99}]
            MORE = [{"id": 10, "country": "HR", "total": 12.5},
                    {"id": 11, "country": "DE", "total": -3.0},
                    {"id": 12, "country": "HR", "total": 12.5},
                    {"id": 13, "country": "DE", "total": 40.0},
                    {"id": 14, "country": "HR", "total": 80.0}]
          `,
          starter: 'def sort_orders(orders):\n    pass\n',
          solution: py`
            def sort_orders(orders):
                ranked = sorted(orders, key=lambda o:
                                (o["country"], -o["total"]))
                return [o["id"] for o in ranked]
          `,
          tests: [
            { call: 'sort_orders(ORDERS)', expect: '[2, 3, 1]', name: 'sort_orders(orders) from the example' },
            { call: 'sort_orders([])', expect: '[]' },
            { call: 'sort_orders(MORE)', expect: '[13, 11, 14, 10, 12]', hidden: true, name: 'ties, refunds and floats' },
            {
              code: py`
                xs = [{"id": 1, "country": "B", "total": 1},
                      {"id": 2, "country": "A", "total": 1}]
                sort_orders(xs)
                assert [o["id"] for o in xs] == [1, 2], "the input list was reordered"
              `,
              name: 'does not modify the input',
              hidden: true,
            },
          ],
          hints: [
            'Sort the dicts with a tuple key, then pull out the ids with a comprehension.',
            'Key: `(o["country"], -o["total"])`. Use `sorted()`, not `.sort()`, to leave the input alone.',
          ],
          wrong: [
            'def sort_orders(orders):\n    ranked = sorted(orders, key=lambda o: (o["country"], o["total"]))\n    return [o["id"] for o in ranked]\n',
            'def sort_orders(orders):\n    orders.sort(key=lambda o: (o["country"], -o["total"]))\n    return [o["id"] for o in orders]\n',
          ],
          explain: 'A tuple key handles mixed directions in one pass: the string sorts ascending, the negated number descending. `orders.sort()` would reorder the caller\'s list behind their back, a nasty side effect when the same list feeds another report.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the top products',
          prompt: md`
            \`top_products(products, n)\` should return the names of the \`n\` products with the **highest rating**, best first, ties ordered by name A→Z. It crashes. Fix it (and don't reorder the caller's list).

            \`\`\`python
            top_products(PRODUCTS, 2)  # ['lamp', 'desk']
            \`\`\`
          `,
          setup: py`
            PRODUCTS = [{"name": "mug", "rating": 4.1},
                        {"name": "lamp", "rating": 4.8},
                        {"name": "pen", "rating": 3.9},
                        {"name": "desk", "rating": 4.6}]
            TIES = [{"name": "b", "rating": 5.0},
                    {"name": "c", "rating": 4.0},
                    {"name": "a", "rating": 5.0}]
          `,
          starter: py`
            def top_products(products, n):
                ranked = products.sort(key=lambda p: p["rating"])
                return [p["name"] for p in ranked[:n]]
          `,
          solution: py`
            def top_products(products, n):
                ranked = sorted(products, key=lambda p:
                                (-p["rating"], p["name"]))
                return [p["name"] for p in ranked[:n]]
          `,
          tests: [
            { call: 'top_products(PRODUCTS, 2)', expect: "['lamp', 'desk']" },
            { call: 'top_products(PRODUCTS, 0)', expect: '[]' },
            { call: 'top_products(TIES, 2)', expect: "['a', 'b']", hidden: true, name: 'ties are ordered by name' },
            { call: 'top_products(TIES, 10)', expect: "['a', 'b', 'c']", hidden: true },
          ],
          hints: [
            '`list.sort()` sorts in place and returns `None`, so `ranked` is `None`. `sorted()` returns a new list.',
            'Best first with a name tie-break: key `(-p["rating"], p["name"])`.',
          ],
          wrong: [
            'def top_products(products, n):\n    ranked = sorted(products, key=lambda p: p["rating"], reverse=True)\n    return [p["name"] for p in ranked[:n]]\n',
            'def top_products(products, n):\n    ranked = sorted(products, key=lambda p: p["rating"])\n    return [p["name"] for p in ranked[:n]]\n',
          ],
          explain: md`
            Three bugs in two lines: \`.sort()\` returns \`None\` (the error), the order was ascending, and ties had no rule. \`sorted(...)[:n]\` is the "top-n" idiom: O(n log n), and the input stays untouched.

            *"Why does my variable hold \`None\`?"* is a top-10 Python question on Stack Overflow, and \`x = x.sort()\` is usually the reason.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u07-l4',
      title: 'Built-in Functional Tools',
      summary: 'map, filter, zip, any, all, generator expressions, and lazy iterators.',
      steps: [
        {
          type: 'learn',
          title: 'map and filter',
          body: md`
            - \`map(f, xs)\` calls \`f\` on every item.
            - \`filter(pred, xs)\` keeps the items where \`pred(item)\` is truthy.

            Both return a lazy **iterator**, not a list: wrap them in \`list()\` to see the values.

            \`map\` shines with an existing function: \`list(map(int, "3 5 8".split()))\` parses a line of numbers. With a lambda, a comprehension usually reads better. \`filter(None, xs)\` drops every falsy item.
          `,
          code: py`
            line = "12 7 30"
            nums = list(map(int, line.split()))
            print(nums, sum(nums))
            evens = filter(lambda n: n % 2 == 0, nums)
            print(list(evens))
            print(list(filter(None, ["a", "", "b", ""])))
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            print(list(map(len, ["ab", "", "xyz"])))
            print(list(filter(None, [0, 3, "", "hi", None])))
          `,
          answer: "[2, 0, 3]\n[3, 'hi']",
          explain: '`map(len, ...)` measures every string, including the empty one. `filter(None, ...)` keeps only truthy values: `0`, `""` and `None` are dropped.',
        },
        {
          type: 'learn',
          title: 'zip and enumerate, revisited',
          body: md`
            You met them with lists. Three more facts worth knowing:

            - \`zip\` stops at the **shortest** input, silently. Pass \`strict=True\` to get an error instead.
            - \`dict(zip(keys, values))\` builds a dict from two parallel lists, such as a CSV header and a row.
            - \`enumerate(xs, start=1)\` numbers items from 1, handy for line numbers and rankings.
          `,
          code: py`
            cols = ["id", "name", "plan"]
            vals = [7, "ana", "pro"]
            print(dict(zip(cols, vals)))
            for rank, name in enumerate(["bo", "cy"], start=1):
                print(rank, name)
            print(list(zip([1, 2, 3], "ab")))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            names = ["ana", "bo", "cy"]
            scores = [90, 75]
            print(dict(zip(names, scores)))
          `,
          options: ["{'ana': 90, 'bo': 75}", "{'ana': 90, 'bo': 75, 'cy': None}", "[('ana', 90), ('bo', 75)]", 'ValueError: lengths differ'],
          answer: 0,
          checkOutput: true,
          explain: '`zip` quietly stops when the shorter list runs out, so "cy" just disappears. In a data pipeline that is silent data loss: use `zip(names, scores, strict=True)` when the lengths must match.',
        },
        {
          type: 'learn',
          title: 'any, all and generator expressions',
          body: md`
            \`sum\`, \`min\`, \`max\`, \`any\` and \`all\` accept a **generator expression**: a comprehension in round brackets. It yields items one at a time and never builds a list, so memory stays tiny even for a billion rows.

            - \`sum(o["qty"] for o in orders)\`
            - \`any(...)\`: is **at least one** true? Stops at the first \`True\`.
            - \`all(...)\`: are **all** true? Stops at the first \`False\`.

            Inside a call you can drop the extra brackets. Edge cases: \`any([])\` is \`False\`, \`all([])\` is \`True\` (nothing breaks the rule).
          `,
          code: py`
            orders = [{"qty": 2, "paid": True},
                      {"qty": 5, "paid": False}]
            print(sum(o["qty"] for o in orders))
            print(any(o["qty"] > 4 for o in orders))
            print(all(o["paid"] for o in orders))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            print(all([]), any([]))
            print(all([1, 0]), any([0, 0, 2]))
          `,
          options: ['True False\nFalse True', 'False False\nFalse True', 'True True\nFalse True', 'False True\nTrue False'],
          answer: 0,
          checkOutput: true,
          explain: '`all([])` is vacuously true: there is no element that fails. `any([])` is false: there is no element that passes. This edge case decides whether an empty batch counts as "all valid", so think about it in validation code.',
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            nums = [3, 8, 1, 9]
            print(sum(n * n for n in nums if n > 2))
            print(max(len(w) for w in ["ab", "abcd"]))
          `,
          answer: '154\n4',
          explain: 'Generator expressions take filters too: 3² + 8² + 9² = 9 + 64 + 81 = 154. The 1 is skipped.',
        },
        {
          type: 'learn',
          title: 'Iterators are single-use',
          body: md`
            \`map\`, \`filter\`, \`zip\`, \`enumerate\` and generator expressions are **lazy iterators**: they compute the next item only when asked, and you can walk through them **once**. Afterwards they are empty. They don't raise an error, they just yield nothing.

            \`next(it)\` asks for a single item.

            Need the values twice? Store them: \`nums = list(map(...))\`.

            > This laziness is the same streaming idea that lets a file loop or Spark process data bigger than memory.
          `,
          code: py`
            doubled = map(lambda x: x * 2, [1, 2, 3])
            print(next(doubled))
            print(list(doubled))
            print(list(doubled))
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            m = map(int, ["4", "5", "6"])
            print(sum(m))
            print(sum(m))
          `,
          answer: '15\n0',
          explain: 'The first `sum` consumes the whole iterator. The second one finds it empty, and the sum of nothing is 0. No error, just a wrong number, which makes this bug hard to spot.',
        },
        {
          type: 'choice',
          prompt: 'Trickier: what does this print?',
          code: py`
            big = filter(lambda n: n > 1, [1, 2, 3, 4])
            print(3 in big)
            print(list(big))
          `,
          options: ['True\n[4]', 'True\n[2, 3, 4]', 'True\n[]', 'False\n[2, 3, 4]'],
          answer: 0,
          checkOutput: true,
          explain: '`in` pulls items from the iterator until it finds a match: it consumes 2, then 3, and stops. Only 4 is left for `list(big)`.',
        },
        {
          type: 'blanks',
          prompt: 'The **top-k idiom**: sort descending, then slice the first `k`. Complete it to print the 2 best-selling products.',
          code: py`
            sales = {"mug": 30, "tee": 85, "cap": 50}
            best = sorted(sales.items(),
                          key=lambda kv: kv[1],
                          ___=True)[:___]
            print(best)
          `,
          bank: ['reverse', '2', 'desc', '3', '-2', 'order'],
          answer: ['reverse', '2'],
          tests: [{ stdout: "[('tee', 85), ('cap', 50)]\n" }],
          explain: '`reverse=True` puts the largest first and `[:2]` keeps two. This costs O(n log n). For a huge n and a small k, `heapq.nlargest(k, ...)` does it in O(n log k), which is a common follow-up question.',
        },
        {
          type: 'code',
          title: 'Batch health check',
          prompt: md`
            Write \`batch_summary(orders)\` for a list of order dicts with \`qty\` (int), \`price\` (float) and \`paid\` (bool). Return a tuple of:

            1. the total quantity
            2. whether **any** order is worth more than 100 (\`qty * price > 100\`)
            3. whether **all** orders are paid

            Use \`sum\`, \`any\` and \`all\` with generator expressions.

            \`\`\`python
            batch_summary([
                {"qty": 2, "price": 60.0, "paid": True},
                {"qty": 1, "price": 5.0, "paid": False},
            ])  # (3, True, False)
            \`\`\`
          `,
          starter: 'def batch_summary(orders):\n    pass\n',
          solution: py`
            def batch_summary(orders):
                qty = sum(o["qty"] for o in orders)
                big = any(o["qty"] * o["price"] > 100
                          for o in orders)
                paid = all(o["paid"] for o in orders)
                return qty, big, paid
          `,
          tests: [
            { call: 'batch_summary([{"qty": 2, "price": 60.0, "paid": True}, {"qty": 1, "price": 5.0, "paid": False}])', expect: '(3, True, False)' },
            { call: 'batch_summary([])', expect: '(0, False, True)' },
            { call: 'batch_summary([{"qty": 4, "price": 25.0, "paid": True}])', expect: '(4, False, True)', hidden: true, name: 'exactly 100 is not "more than 100"' },
            { call: 'batch_summary([{"qty": 1, "price": 1.0, "paid": True}, {"qty": 3, "price": 40.0, "paid": True}])', expect: '(4, True, True)', hidden: true },
          ],
          require: ['any', 'all'],
          hints: [
            'One line each: `sum(... for o in orders)`, `any(...)`, `all(...)`.',
            'The value of an order is `o["qty"] * o["price"]`, and the test is strictly `> 100`.',
          ],
          wrong: [
            'def batch_summary(orders):\n    qty = sum(o["qty"] for o in orders)\n    big = any(o["price"] > 100 for o in orders)\n    paid = all(o["paid"] for o in orders)\n    return qty, big, paid\n',
            'def batch_summary(orders):\n    qty = sum(o["qty"] for o in orders)\n    big = any(o["qty"] * o["price"] >= 100 for o in orders)\n    paid = all(o["paid"] for o in orders)\n    return qty, big, paid\n',
            'def batch_summary(orders):\n    qty = sum(o["qty"] for o in orders)\n    big = any(o["qty"] * o["price"] > 100 for o in orders)\n    paid = any(o["paid"] for o in orders)\n    return qty, big, paid\n',
          ],
          explain: 'Each generator expression streams the orders without building a temporary list, and `any`/`all` stop early once the answer is known. For an empty batch you get `(0, False, True)`: decide consciously whether "all paid" should be true for no orders at all.',
        },
        {
          type: 'code',
          title: 'Top k products',
          prompt: md`
            Write \`top_k(revenue, k)\`: \`revenue\` maps product → revenue. Return the \`k\` best products as a list of \`(product, revenue)\` tuples, highest revenue first, ties ordered A→Z by product name. If \`k\` is larger than the number of products, return them all.

            \`\`\`python
            top_k({"mug": 30, "tee": 85, "cap": 30}, 2)
            # [('tee', 85), ('cap', 30)]
            \`\`\`
          `,
          starter: 'def top_k(revenue, k):\n    pass\n',
          solution: py`
            def top_k(revenue, k):
                ranked = sorted(revenue.items(),
                                key=lambda kv: (-kv[1], kv[0]))
                return ranked[:k]
          `,
          tests: [
            { call: 'top_k({"mug": 30, "tee": 85, "cap": 30}, 2)', expect: "[('tee', 85), ('cap', 30)]" },
            { call: 'top_k({}, 3)', expect: '[]' },
            { call: 'top_k({"a": 1}, 5)', expect: "[('a', 1)]", hidden: true },
            { call: 'top_k({"b": 2, "a": 2, "c": 9}, 3)', expect: "[('c', 9), ('a', 2), ('b', 2)]", hidden: true },
            { call: 'top_k({"x": 5}, 0)', expect: '[]', hidden: true },
          ],
          hints: [
            'Sort `revenue.items()` with a tuple key, then slice.',
            'Key `(-kv[1], kv[0])` puts the highest revenue first and breaks ties by name. Slicing past the end is safe.',
          ],
          wrong: [
            'def top_k(revenue, k):\n    return sorted(revenue.items(), key=lambda kv: kv[1], reverse=True)[:k]\n',
            'def top_k(revenue, k):\n    return sorted(revenue, key=lambda p: (-revenue[p], p))[:k]\n',
          ],
          explain: '`sorted(...)[:k]` is O(n log n) and handles every edge case for free: `k = 0` gives `[]`, and a `k` past the end just returns everything. Without the name in the key, ties come out in dict order, which differs between runs of a real pipeline.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the price range',
          prompt: md`
            \`price_range(raw)\` gets prices as strings and should return \`(lowest, highest)\` as floats. It fails with \`ValueError: max() iterable argument is empty\`, even though the list isn't empty. Find out why and fix it.

            \`\`\`python
            price_range(["9.5", "3", "12"])  # (3.0, 12.0)
            \`\`\`
          `,
          starter: py`
            def price_range(raw):
                prices = map(float, raw)
                return min(prices), max(prices)
          `,
          solution: py`
            def price_range(raw):
                prices = list(map(float, raw))
                return min(prices), max(prices)
          `,
          tests: [
            { call: 'price_range(["9.5", "3", "12"])', expect: '(3.0, 12.0)' },
            { call: 'price_range(["1"])', expect: '(1.0, 1.0)', hidden: true },
            { call: 'price_range(["-2.5", "100", "0"])', expect: '(-2.5, 100.0)', hidden: true },
          ],
          hints: [
            '`min` walked through the whole `map` iterator. What is left for `max`?',
            'Turn the iterator into a list once: `list(map(float, raw))`.',
          ],
          wrong: [
            'def price_range(raw):\n    return min(raw), max(raw)\n',
          ],
          explain: md`
            \`min\` consumed every item of the \`map\`, so \`max\` received an empty iterator. Materialising it with \`list()\` lets you read the values twice.

            Comparing the raw strings instead would "work" but be wrong: as text, \`"12" < "3"\`, because strings compare character by character.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u07-l5',
      title: 'Functions Are Values',
      summary: 'Pass functions around, return them, and build closures that remember state.',
      steps: [
        {
          type: 'learn',
          title: 'Functions are values',
          body: md`
            In Python a function is a value like any other. Without parentheses, \`max\` **is** the function; \`max(xs)\` **calls** it. So you can give a function another name, **pass it as an argument**, or store it in a dict.

            A dict of functions (a **dispatch table**) replaces a long \`if/elif\` chain: a config says \`"agg": "max"\` and the code looks the function up.

            Functions that take or return functions are called **higher-order** functions. \`sorted(key=...)\` and \`map\` are ones you already use.
          `,
          code: py`
            def apply_twice(f, x):
                return f(f(x))

            print(apply_twice(abs, -3))
            print(apply_twice(str.upper, "go"))

            AGG = {"sum": sum, "max": max, "count": len}
            data = [4, 8, 6]
            for name in ["sum", "count"]:
                print(name, AGG[name](data))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def add_one(n):
                return n + 1

            fs = [add_one, abs, str]
            print([f(-5) for f in fs])
          `,
          options: ["[-4, 5, '-5']", '[-4, 5, -5]', "[-6, 5, '-5']", '[-4, -4, -4]'],
          answer: 0,
          checkOutput: true,
          explain: 'The list holds three functions. The comprehension calls each one with -5: `add_one(-5)` is -4, `abs(-5)` is 5, and `str(-5)` is the string `"-5"`.',
        },
        {
          type: 'code',
          title: 'Config-driven aggregate',
          prompt: md`
            Write \`aggregate(values, how)\` where \`how\` is one of \`"sum"\`, \`"min"\`, \`"max"\`, \`"count"\` or \`"mean"\`, and return that aggregate of the list \`values\`. Use a **dict of functions**, not an \`if/elif\` chain. For an unknown \`how\`, return \`None\`.

            \`\`\`python
            aggregate([4, 8, 6], "max")   # 8
            aggregate([4, 8, 6], "mean")  # 6.0
            aggregate([4, 8, 6], "p99")   # None
            \`\`\`
          `,
          starter: 'def aggregate(values, how):\n    pass\n',
          solution: py`
            def mean(xs):
                return sum(xs) / len(xs)

            AGG = {"sum": sum, "min": min, "max": max,
                   "count": len, "mean": mean}

            def aggregate(values, how):
                f = AGG.get(how)
                if f is None:
                    return None
                return f(values)
          `,
          tests: [
            { call: 'aggregate([4, 8, 6], "max")', expect: '8' },
            { call: 'aggregate([4, 8, 6], "mean")', expect: '6.0' },
            { call: 'aggregate([4, 8, 6], "p99")', expect: 'None' },
            { call: 'aggregate([4, 8, 6], "count")', expect: '3', hidden: true },
            { call: 'aggregate([1, 2], "mean")', expect: '1.5', hidden: true },
            { call: 'aggregate([5, -2, 9], "min")', expect: '-2', hidden: true },
            { call: 'aggregate([], "sum")', expect: '0', hidden: true },
          ],
          hints: [
            'Build a dict like `{"sum": sum, "max": max, ...}`. There is no built-in mean, so define a small helper function and put it in the dict.',
            '`AGG.get(how)` returns `None` for an unknown name. Only call the function if you found one.',
          ],
          wrong: [
            'AGG = {"sum": sum, "min": min, "max": max, "count": len,\n       "mean": lambda xs: sum(xs) / len(xs)}\n\ndef aggregate(values, how):\n    return AGG[how](values)\n',
            'AGG = {"sum": sum, "min": min, "max": max, "count": len,\n       "mean": lambda xs: sum(xs) // len(xs)}\n\ndef aggregate(values, how):\n    f = AGG.get(how)\n    return f(values) if f else None\n',
          ],
          explain: 'Adding a new aggregation is now a one-line change to the table, and the lookup is O(1) however many options exist. This is how config-driven ETL jobs, CLI subcommands and pandas\' `agg("mean")` work under the hood. `AGG[how]` would raise `KeyError` for unknown names; `.get` lets you choose the fallback.',
        },
        {
          type: 'learn',
          title: 'Returning functions: closures',
          body: md`
            A function can define another function inside it and **return** it. The inner function remembers the variables of the outer call, even after the outer function has finished. That combination is a **closure**.

            Every call of the outer function creates a fresh, independent closure. That's how you build configurable functions: a scaler fitted to some data, a validator with limits, a rate limiter.
          `,
          code: py`
            def make_multiplier(n):
                def multiply(x):
                    return x * n
                return multiply

            double = make_multiplier(2)
            triple = make_multiplier(3)
            print(double(5), triple(5))
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            def make_greeter(greeting):
                def greet(name):
                    return f"{greeting}, {name}!"
                return greet

            hi = make_greeter("Hi")
            yo = make_greeter("Yo")
            print(hi("Ana"))
            print(yo(hi("Bo")))
          `,
          answer: 'Hi, Ana!\nYo, Hi, Bo!!',
          explain: 'Each closure keeps its own `greeting`. The inner call runs first: `hi("Bo")` gives "Hi, Bo!", and `yo` wraps that whole string, adding a second "!".',
        },
        {
          type: 'code',
          title: 'Min-max scaler',
          prompt: md`
            Machine-learning features are often scaled into the range 0–1 with \`(x - lo) / (hi - lo)\`. Write \`make_scaler(values)\` that looks at a list of numbers **once**, remembers its min and max, and **returns a function** that scales any new number with them.

            \`\`\`python
            scale = make_scaler([10, 20, 50])
            scale(30)   # 0.5
            scale(10)   # 0.0
            \`\`\`

            If all values are equal (\`hi == lo\`), the returned function gives \`0.0\` for any input.
          `,
          starter: 'def make_scaler(values):\n    pass\n',
          solution: py`
            def make_scaler(values):
                lo, hi = min(values), max(values)
                def scale(x):
                    if hi == lo:
                        return 0.0
                    return (x - lo) / (hi - lo)
                return scale
          `,
          tests: [
            { call: 'make_scaler([10, 20, 50])(30)', expect: '0.5' },
            { call: 'make_scaler([10, 20, 50])(10)', expect: '0.0' },
            { call: 'make_scaler([10, 20, 50])(90)', expect: '2.0', hidden: true },
            { call: 'make_scaler([5, 5])(7)', expect: '0.0', hidden: true },
            {
              code: py`
                data = [0, 10]
                s = make_scaler(data)
                data.append(100)
                assert s(5) == 0.5, "min/max must be fixed when the scaler is made"
              `,
              name: 'remembers min and max from creation time',
              hidden: true,
            },
          ],
          hints: [
            'Compute `lo` and `hi` in the outer function, then define `scale(x)` inside it and `return scale` (no parentheses).',
            'Guard against `hi == lo` inside `scale` to avoid dividing by zero.',
          ],
          wrong: [
            'def make_scaler(values):\n    def scale(x):\n        lo, hi = min(values), max(values)\n        if hi == lo:\n            return 0.0\n        return (x - lo) / (hi - lo)\n    return scale\n',
            'def make_scaler(values):\n    lo, hi = min(values), max(values)\n    def scale(x):\n        return (x - lo) / (hi - lo)\n    return scale\n',
          ],
          explain: md`
            This is the **fit / transform** split used by scikit-learn: *fit* once (scan the data for min and max), then *transform* many values cheaply. Computing min/max inside \`scale\` would rescan the list on every call (O(n) each time) and silently change if the list changes later.

            Values outside the training range map outside 0–1. That's expected, and worth knowing for an ML interview.
          `,
        },
        {
          type: 'learn',
          title: 'nonlocal: changing an outer variable',
          body: md`
            **Reading** an outer variable inside a closure just works. **Assigning** to it doesn't: \`count += 1\` makes \`count\` a new *local* variable, and Python raises \`UnboundLocalError\`.

            Declare \`nonlocal count\` to say *"I mean the variable of the enclosing function"*.

            Mutating an outer list with \`.append\` needs no \`nonlocal\`, because you never rebind the name.
          `,
          code: py`
            def make_counter():
                count = 0
                def increment():
                    nonlocal count
                    count += 1
                    return count
                return increment

            c = make_counter()
            c()
            c()
            print(c())
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            def make_counter():
                count = 0
                def increment():
                    count += 1
                    return count
                return increment

            print(make_counter()())
          `,
          options: [
            "UnboundLocalError: cannot access local variable 'count' where it is not associated with a value",
            '1',
            '0',
            "NameError: name 'count' is not defined",
          ],
          answer: 0,
          checkOutput: true,
          explain: 'Because `increment` assigns to `count`, Python treats `count` as local to `increment` for the whole function. `count += 1` then tries to read that local before it has a value. `nonlocal count` fixes it.',
        },
        {
          type: 'blanks',
          prompt: 'Complete the closure so each call hands out the next ticket number: 1, 2, 3, …',
          code: py`
            def make_ticketer():
                last = 0
                def next_ticket():
                    ___ last
                    last += 1
                    ___ last
                return next_ticket

            t = make_ticketer()
            print(t(), t(), t())
          `,
          bank: ['nonlocal', 'return', 'global', 'yield', 'print', 'local'],
          answer: ['nonlocal', 'return'],
          tests: [{ stdout: '1 2 3\n' }],
          explain: '`nonlocal last` binds to the variable of `make_ticketer`. `global last` would look for a module-level `last`, which doesn\'t exist, and every ticketer would share it anyway.',
        },
        {
          type: 'code',
          title: 'Rate limiter',
          prompt: md`
            APIs protect themselves with rate limits. Write \`make_limiter(max_calls)\` that returns a function \`allow()\`. The first \`max_calls\` calls to \`allow()\` return \`True\`, every later call returns \`False\`. Each limiter counts **independently**.

            \`\`\`python
            allow = make_limiter(2)
            allow()  # True
            allow()  # True
            allow()  # False
            \`\`\`
          `,
          starter: 'def make_limiter(max_calls):\n    pass\n',
          solution: py`
            def make_limiter(max_calls):
                used = 0
                def allow():
                    nonlocal used
                    if used < max_calls:
                        used += 1
                        return True
                    return False
                return allow
          `,
          tests: [
            { call: '(lambda a: [a(), a(), a()])(make_limiter(2))', expect: '[True, True, False]', name: 'make_limiter(2): three calls' },
            { call: 'make_limiter(0)()', expect: 'False' },
            { call: '(lambda a, b: [a(), a(), b(), a()])(make_limiter(2), make_limiter(1))', expect: '[True, True, True, False]', hidden: true, name: 'two limiters count independently' },
            { call: '(lambda a: [a() for _ in range(5)])(make_limiter(3))', expect: '[True, True, True, False, False]', hidden: true },
          ],
          hints: [
            'Keep a counter `used = 0` in `make_limiter`, define `allow` inside, and return it.',
            '`allow` changes the counter, so it needs `nonlocal used`. Compare before you increment.',
          ],
          wrong: [
            'used = 0\n\ndef make_limiter(max_calls):\n    def allow():\n        global used\n        used += 1\n        return used <= max_calls\n    return allow\n',
            'def make_limiter(max_calls):\n    used = 0\n    def allow():\n        nonlocal used\n        used += 1\n        return used <= max_calls + 1\n    return allow\n',
          ],
          explain: md`
            Each call to \`make_limiter\` creates a new \`used\` variable, so limiters don't interfere. A \`global\` counter would be shared by all of them, a classic bug in multi-tenant code.

            Real rate limiters also reset over time (a *token bucket*). Same closure idea, plus a timestamp.
          `,
        },
        {
          type: 'learn',
          title: 'The late-binding gotcha',
          body: md`
            Closures remember **variables**, not values. The value is looked up when the function is **called**. Create functions in a loop and they all share the loop variable, so they all see its **last** value.

            Two fixes:
            - Bind the current value as a **default argument**: \`lambda i=i: i\`. Defaults are evaluated when the function is created.
            - Build each function in a factory function, like \`make_multiplier(n)\`.

            > A favourite interview trick question.
          `,
          code: py`
            fs = [lambda: i for i in range(3)]
            print([f() for f in fs])

            fs = [lambda i=i: i for i in range(3)]
            print([f() for f in fs])
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            adders = []
            for n in [1, 2, 3]:
                adders.append(lambda x: x + n)
            print([add(10) for add in adders])
            n = 100
            print(adders[0](10))
          `,
          answer: '[13, 13, 13]\n110',
          explain: 'All three lambdas read the same variable `n` at call time. After the loop it is 3, so every call gives 13. Reassigning `n = 100` changes what they all see.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the alert checks',
          prompt: md`
            \`make_alerts(limits)\` gets a dict \`metric → limit\` and should return a dict \`metric → check\`, where \`check(value)\` returns \`True\` if the value is **above that metric's limit**. Right now every check uses the same limit. Fix it.

            \`\`\`python
            checks = make_alerts({"cpu": 90, "mem": 70})
            checks["cpu"](80)   # False
            checks["mem"](80)   # True
            \`\`\`
          `,
          starter: py`
            def make_alerts(limits):
                checks = {}
                for metric, limit in limits.items():
                    checks[metric] = lambda v: v > limit
                return checks
          `,
          solution: py`
            def make_check(limit):
                return lambda v: v > limit

            def make_alerts(limits):
                return {m: make_check(lim)
                        for m, lim in limits.items()}
          `,
          tests: [
            { call: 'make_alerts({"cpu": 90, "mem": 70})["cpu"](80)', expect: 'False' },
            { call: 'make_alerts({"cpu": 90, "mem": 70})["mem"](80)', expect: 'True' },
            { call: 'make_alerts({"a": 1, "b": 5, "c": 3})["b"](4)', expect: 'False', hidden: true },
            { call: 'sorted(make_alerts({"x": 0, "y": 1}))', expect: "['x', 'y']", hidden: true },
            { call: 'make_alerts({})', expect: '{}', hidden: true },
          ],
          hints: [
            'All the lambdas read the same `limit` variable when they are called, and by then it holds the last limit.',
            'Freeze the current value: `lambda v, limit=limit: v > limit`, or create each check in a small factory function.',
          ],
          wrong: [
            'def make_alerts(limits):\n    return {m: lambda v: v > lim for m, lim in limits.items()}\n',
          ],
          explain: md`
            The bug survives a rewrite to a dict comprehension, because the comprehension variable is also shared by all the lambdas. The fix is to give each check its **own** variable:

            - a factory \`make_check(limit)\`, where every call creates a fresh \`limit\`, or
            - a default argument \`lambda v, limit=limit: v > limit\`, evaluated once per lambda.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u07-l6',
      title: '*args, **kwargs & Unpacking',
      summary: 'Variadic functions, keyword-only arguments, unpacking into calls and merging dicts.',
      steps: [
        {
          type: 'learn',
          title: '*args and **kwargs',
          body: md`
            A \`*\` parameter collects any number of extra **positional** arguments into a **tuple**. A \`**\` parameter collects extra **keyword** arguments into a **dict**.

            The names \`args\`/\`kwargs\` are just a convention: the stars do the work. Order in a signature: normal parameters, \`*args\`, keyword-only parameters, \`**kwargs\`.

            Typical uses: \`total(*amounts)\` and structured logging like \`log(event, **fields)\`.
          `,
          code: py`
            def total(*amounts):
                return sum(amounts)

            def log(event, **fields):
                kv = [f"{k}={v}" for k, v in fields.items()]
                print(event, " ".join(kv))

            print(total(), total(5, 10, 2.5))
            log("login", user="ana", ms=120)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            def f(first, *rest):
                print(first, rest)

            f(1)
            f(1, 2, 3)
          `,
          answer: '1 ()\n1 (2, 3)',
          explain: '`rest` is always a tuple: empty when nothing extra is passed, otherwise holding every extra positional argument.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def describe(*args, **kwargs):
                print(len(args), kwargs)

            describe(1, "a", x=3, y=None)
          `,
          options: ["2 {'x': 3, 'y': None}", '4 {}', "2 [('x', 3), ('y', None)]", "4 {'x': 3, 'y': None}"],
          answer: 0,
          checkOutput: true,
          explain: 'Positional arguments go to `args` (a tuple of 2), keyword arguments to `kwargs` (a dict). A function with both accepts *any* call, which is why wrappers and decorators use this signature.',
        },
        {
          type: 'learn',
          title: 'Keyword-only arguments',
          body: md`
            Parameters **after** a bare \`*\` (or after \`*args\`) can only be passed **by name**:

            \`\`\`python
            def fetch(url, *, timeout=5, retries=3):
            \`\`\`

            \`fetch(u, timeout=10)\` works, \`fetch(u, 10)\` is a \`TypeError\`. Why bother? \`fetch(u, 10, 0)\` is unreadable, and swapping two numbers is a silent bug. Keyword-only options make every call self-documenting.

            Built-ins do it too: in \`sorted(xs, key=len)\` the \`key\` is keyword-only, so \`sorted(xs, len)\` fails.
          `,
          code: py`
            def fetch(url, *, timeout=5, retries=3):
                return f"{url} t={timeout} r={retries}"

            print(fetch("/api"))
            print(fetch("/api", retries=0))
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            def fetch(url, *, timeout=5):
                return f"{url} {timeout}"

            print(fetch("/api", 10))
          `,
          options: ['TypeError: fetch() takes 1 positional argument but 2 were given', '/api 10', '/api 5', 'SyntaxError: invalid syntax'],
          answer: 0,
          checkOutput: true,
          explain: 'Only `url` can be filled positionally. The `*` makes `timeout` keyword-only, so the call must say `timeout=10`.',
        },
        {
          type: 'learn',
          title: 'Unpacking into a call',
          body: md`
            Stars also work the other way round, in a **call**: \`f(*xs)\` spreads a list or tuple into positional arguments, and \`f(**opts)\` spreads a dict into keyword arguments.

            Together they let a wrapper **forward** whatever it receives:

            \`\`\`python
            def call_logged(f, *args, **kwargs):
                print("calling", f.__name__)
                return f(*args, **kwargs)
            \`\`\`

            (Decorators, later in the course, are built on exactly this.) A classic trick: \`zip(*matrix)\` passes every row as a separate argument, which transposes the matrix.
          `,
          code: py`
            def area(w, h):
                return w * h

            dims = [3, 4]
            opts = {"w": 2, "h": 5}
            print(area(*dims), area(**opts))
            print(*["a", "b", "c"], sep=" | ")
            print(list(zip(*[[1, 2, 3], [4, 5, 6]])))
          `,
        },
        {
          type: 'output',
          prompt: 'Type all three lines.',
          code: py`
            nums = [3, 1, 2]
            print(*nums)
            print(*sorted(nums), sep="-")
            print(nums)
          `,
          answer: '3 1 2\n1-2-3\n[3, 1, 2]',
          explain: '`print(*nums)` is the same as `print(3, 1, 2)`: three separate values joined by `sep`. Without the star, `print` gets one argument, the list itself.',
        },
        {
          type: 'blanks',
          prompt: 'Complete the call so it prints `db:6543 ssl=True`.',
          code: py`
            def connect(host, *, port=5432, ssl=False):
                return f"{host}:{port} ssl={ssl}"

            cfg = {"port": 6543, "ssl": True}
            print(connect("db", ___cfg))
          `,
          bank: ['**', '*', '&', '...'],
          answer: ['**'],
          tests: [{ stdout: 'db:6543 ssl=True\n' }],
          explain: '`**cfg` turns the dict into `port=6543, ssl=True`. A single `*cfg` would pass the **keys** "port" and "ssl" as positional arguments, which `connect` refuses.',
        },
        {
          type: 'learn',
          title: 'Merging dicts',
          body: md`
            Two ways to merge dicts into a **new** dict:

            - \`{**defaults, **overrides}\`: unpack both into a dict literal
            - \`defaults | overrides\` (Python 3.9+)

            In both, when a key appears twice the **right-hand** value wins. \`a |= b\` updates \`a\` in place, like \`a.update(b)\`.

            Classic pattern: \`config = {**DEFAULTS, **user_settings}\`. The defaults dict stays untouched.
          `,
          code: py`
            DEFAULTS = {"lang": "en", "rows": 10}
            user = {"rows": 50, "theme": "dark"}
            print({**DEFAULTS, **user})
            print(DEFAULTS | {"lang": "hr"})
            print(DEFAULTS)
          `,
        },
        {
          type: 'output',
          prompt: 'Watch which side wins. Type both lines.',
          code: py`
            a = {"x": 1, "y": 2}
            b = {"y": 20, "z": 30}
            print({**a, **b})
            print(b | a)
          `,
          answer: "{'x': 1, 'y': 20, 'z': 30}\n{'y': 2, 'z': 30, 'x': 1}",
          explain: 'Keys keep the position of their **first** appearance, but the value comes from the **last** dict that has the key. In `b | a`, "y" stays first (from `b`) yet takes `a`\'s value 2.',
        },
        {
          type: 'code',
          title: 'SQL builder',
          prompt: md`
            Write \`select(table, *columns, limit=None)\` that builds a SQL query string:

            - no columns means \`*\`
            - columns are joined with \`", "\`
            - add \`" LIMIT n"\` only when \`limit\` is given (\`limit=0\` is a real limit)

            \`\`\`python
            select("users")              # 'SELECT * FROM users'
            select("users", "id", "name")
            # 'SELECT id, name FROM users'
            select("events", "ts", limit=5)
            # 'SELECT ts FROM events LIMIT 5'
            \`\`\`
          `,
          starter: 'def select(table, *columns, limit=None):\n    pass\n',
          solution: py`
            def select(table, *columns, limit=None):
                cols = ", ".join(columns) if columns else "*"
                sql = f"SELECT {cols} FROM {table}"
                if limit is not None:
                    sql += f" LIMIT {limit}"
                return sql
          `,
          tests: [
            { call: 'select("users")', expect: '"SELECT * FROM users"' },
            { call: 'select("users", "id", "name")', expect: '"SELECT id, name FROM users"' },
            { call: 'select("events", "ts", limit=5)', expect: '"SELECT ts FROM events LIMIT 5"' },
            { call: 'select("t", limit=0)', expect: '"SELECT * FROM t LIMIT 0"', hidden: true },
            { call: 'select("t", "a", "b", "c")', expect: '"SELECT a, b, c FROM t"', hidden: true },
          ],
          hints: [
            '`columns` is a tuple, empty when no columns were passed.',
            'Check `limit is not None`, because `if limit:` would ignore `limit=0`.',
          ],
          wrong: [
            'def select(table, *columns, limit=None):\n    cols = ", ".join(columns) if columns else "*"\n    sql = f"SELECT {cols} FROM {table}"\n    if limit:\n        sql += f" LIMIT {limit}"\n    return sql\n',
            'def select(table, *columns, limit=None):\n    sql = f"SELECT {\', \'.join(columns)} FROM {table}"\n    if limit is not None:\n        sql += f" LIMIT {limit}"\n    return sql\n',
          ],
          explain: md`
            Because \`limit\` comes after \`*columns\`, it is automatically keyword-only: there's no way to pass it positionally by accident.

            > Building SQL from strings is fine for **identifiers you control**. Never paste user input into SQL; use the database driver's parameters (you'll see that in the SQL unit).
          `,
        },
        {
          type: 'code',
          title: 'Merge configs',
          prompt: md`
            Write \`merge_config(defaults, *overrides, **extra)\` that returns a **new** dict: start from \`defaults\`, apply each dict in \`overrides\` in order, then apply the keyword arguments in \`extra\`. Later values win. Never modify \`defaults\`.

            \`\`\`python
            base = {"env": "dev", "debug": False}
            merge_config(base, {"env": "prod"}, debug=True)
            # {'env': 'prod', 'debug': True}
            \`\`\`
          `,
          starter: 'def merge_config(defaults, *overrides, **extra):\n    pass\n',
          solution: py`
            def merge_config(defaults, *overrides, **extra):
                merged = {**defaults}
                for o in overrides:
                    merged |= o
                return merged | extra
          `,
          tests: [
            { call: 'merge_config({"env": "dev", "debug": False}, {"env": "prod"}, debug=True)', expect: '{"env": "prod", "debug": True}' },
            { call: 'merge_config({"a": 1})', expect: '{"a": 1}' },
            { call: 'merge_config({}, {"a": 1}, {"a": 2})', expect: '{"a": 2}', hidden: true, name: 'later overrides win' },
            { call: 'merge_config({}, {"a": 1}, a=3)', expect: '{"a": 3}', hidden: true, name: 'keyword arguments win last' },
            { code: 'd = {"a": 1}\nmerge_config(d, {"a": 2}, b=3)\nassert d == {"a": 1}, "defaults was modified"', name: 'defaults is not modified', hidden: true },
            { code: 'd = {"a": 1}\nr = merge_config(d)\nr["a"] = 9\nassert d["a"] == 1, "the result is the same dict as defaults"', name: 'returns a new dict', hidden: true },
          ],
          hints: [
            'Start with a copy: `merged = {**defaults}` (or `dict(defaults)`).',
            'Loop over `overrides` and merge each one in, then merge `extra` last.',
          ],
          wrong: [
            'def merge_config(defaults, *overrides, **extra):\n    merged = defaults\n    for o in overrides:\n        merged.update(o)\n    merged.update(extra)\n    return merged\n',
            'def merge_config(defaults, *overrides, **extra):\n    merged = {**defaults}\n    for o in overrides:\n        merged |= o\n    return extra | merged\n',
          ],
          explain: md`
            \`merged = defaults\` doesn't copy: both names point to the **same** dict (aliasing), so updating \`merged\` corrupts the shared defaults for every later caller. \`{**defaults}\` makes a shallow copy first.

            This layering (defaults → config files → command-line flags) is how almost every data tool resolves its settings.
          `,
        },
        {
          type: 'code',
          title: 'Function pipeline',
          prompt: md`
            Write \`pipeline(*funcs)\` that returns a **new function**. Calling it with a value passes the value through every function **in order, left to right**, and returns the result. With no functions, the value comes back unchanged.

            \`\`\`python
            clean = pipeline(str.strip, str.lower)
            clean("  Hello ")   # 'hello'
            \`\`\`
          `,
          starter: 'def pipeline(*funcs):\n    pass\n',
          solution: py`
            def pipeline(*funcs):
                def run(value):
                    for f in funcs:
                        value = f(value)
                    return value
                return run
          `,
          tests: [
            { call: 'pipeline(str.strip, str.lower)("  Hello ")', expect: '"hello"' },
            { call: 'pipeline()(42)', expect: '42' },
            { call: 'pipeline(lambda x: x + 1, lambda x: x * 10)(1)', expect: '20', hidden: true, name: 'functions run left to right' },
            { call: 'pipeline(str.split, len)("a b c")', expect: '3', hidden: true },
            { call: 'pipeline(abs, str, len)(-1234)', expect: '4', hidden: true },
          ],
          hints: [
            'Return an inner function `run(value)` that loops over `funcs` (a tuple the closure remembers).',
            'Feed each result into the next function: `value = f(value)`.',
          ],
          wrong: [
            'def pipeline(*funcs):\n    def run(value):\n        for f in funcs[::-1]:\n            value = f(value)\n        return value\n    return run\n',
            'def pipeline(*funcs):\n    def run(value):\n        result = value\n        for f in funcs:\n            result = f(value)\n        return result\n    return run\n',
          ],
          explain: 'This combines everything in the unit: `*funcs` collects the steps, a closure remembers them, and functions are passed around as values. Data tools are built from the same idea: pandas `.pipe()`, scikit-learn `Pipeline`, and chains of Spark transformations.',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u07-exam',
    title: 'Comprehensions & Functional Python Exam',
    minutes: 25,
    intro: 'Tricky tracing (late binding, iterator exhaustion, comprehension scope) plus real functional-style coding tasks. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          fs = [lambda x: x * i for i in range(1, 4)]
          print([f(10) for f in fs])
        `,
        options: ['[30, 30, 30]', '[10, 20, 30]', '[0, 10, 20]', '[10, 10, 10]'],
        answer: 0,
        checkOutput: true,
        explain: 'All three lambdas close over the same comprehension variable `i` and read it when called. By then the comprehension has finished with `i = 3`.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          it = map(int, "123456")
          print(list(zip(it, it)))
        `,
        options: ['[(1, 2), (3, 4), (5, 6)]', '[(1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6)]', '[(1, 1), (2, 2), (3, 3)]', '[]'],
        answer: 0,
        checkOutput: true,
        explain: 'Both arguments are the **same** iterator. To build each pair, `zip` takes one item from its first argument and then one from its second, which consumes two consecutive items. It\'s a known idiom for grouping a stream into pairs.',
      },
      {
        type: 'output',
        prompt: 'Type exactly what this prints.',
        code: py`
          x = 10
          data = [x for x in range(4)]
          evens = (n for n in data if n % 2 == 0)
          print(x, sum(evens), sum(evens))
        `,
        answer: '10 2 0',
        explain: 'The comprehension\'s `x` is local to it, so the outer `x` stays 10. The generator yields 0 and 2 (sum 2) and is then exhausted, so the second `sum` gets nothing: 0.',
      },
      {
        type: 'output',
        prompt: 'Type both lines.',
        code: py`
          rows = [("ana", 3), ("bo", 5),
                  ("cy", 3), ("di", 5)]
          rows.sort(key=lambda r: (-r[1], r[0]))
          print([n for n, _ in rows])
          print(min(rows, key=lambda r: r[1])[0])
        `,
        answer: "['bo', 'di', 'ana', 'cy']\nana",
        explain: 'Score descending, then name ascending. `min` by score finds the first row with the lowest score in the **current** (already sorted) order: "ana" comes before "cy".',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          def make():
              seen = []
              def add(x):
                  seen.append(x)
                  return len(seen)
              return add

          a, b = make(), make()
          a("p")
          a("q")
          print(a("r"), b("s"))
        `,
        options: ['3 1', '4 4', '3 4', '1 1'],
        answer: 0,
        checkOutput: true,
        explain: 'Every call to `make()` creates a new `seen` list, so `a` and `b` have separate state. `append` mutates the list without rebinding the name, so no `nonlocal` is needed.',
      },
      {
        type: 'blanks',
        prompt: 'Complete the call so it prints `3.67`.',
        code: py`
          def stats(*nums, digits=1):
              return round(sum(nums) / len(nums), digits)

          data = [3, 4, 4]
          opts = {"digits": 2}
          print(stats(___data, ___opts))
        `,
        bank: ['*', '**', '&', '...', '[]'],
        answer: ['*', '**'],
        tests: [{ stdout: '3.67\n' }],
        explain: '`*data` spreads the list into the positional `*nums`, and `**opts` turns the dict into the keyword argument `digits=2`. 11 / 3 rounded to 2 decimals is 3.67.',
      },
      {
        type: 'order',
        prompt: 'Arrange the lines to define `compose(*funcs)`, which applies the functions **right to left** like math: `compose(f, g)(x) == f(g(x))`.',
        lines: [
          'def compose(*funcs):',
          '    def run(x):',
          '        for f in funcs[::-1]:',
          '            x = f(x)',
          '        return x',
          '    return run',
        ],
        distractors: ['        for f in funcs:', '    return run(x)'],
        tests: [
          { call: 'compose(lambda x: x + 1, lambda x: x * 2)(5)', expect: '11' },
          { call: 'compose(str.upper, str.strip)("  hi ")', expect: '"HI"' },
          { call: 'compose()(7)', expect: '7' },
        ],
        explain: '`funcs[::-1]` walks the tuple backwards, so the right-most function runs first: 5 * 2 = 10, then + 1 = 11. The outer function returns `run` itself, not `run(x)`: there is no `x` yet when `compose` is called.',
      },
      {
        type: 'code',
        title: 'Top spenders',
        prompt: md`
          \`orders\` is a list of dicts with \`user\`, \`amount\` (float) and \`status\`. Only orders with status \`"paid"\` count. Write \`top_spenders(orders, k)\` that returns the top \`k\` users as \`(user, total)\` tuples, where \`total\` is **rounded to 2 decimals**. Order by total, highest first; ties by user A→Z.

          \`\`\`python
          top_spenders(ORDERS, 2)
          # [('bo', 75.5), ('ana', 40.0)]
          \`\`\`
        `,
        setup: py`
          ORDERS = [
              {"user": "ana", "amount": 25.0, "status": "paid"},
              {"user": "bo", "amount": 75.5, "status": "paid"},
              {"user": "cy", "amount": 99.0, "status": "refunded"},
              {"user": "ana", "amount": 15.0, "status": "paid"},
              {"user": "di", "amount": 40.0, "status": "paid"},
              {"user": "cy", "amount": 12.0, "status": "paid"},
          ]
          TIES = [
              {"user": "zed", "amount": 10.0, "status": "paid"},
              {"user": "amy", "amount": 4.5, "status": "paid"},
              {"user": "amy", "amount": 5.5, "status": "paid"},
              {"user": "kim", "amount": 30.0, "status": "pending"},
          ]
        `,
        starter: 'def top_spenders(orders, k):\n    pass\n',
        solution: py`
          def top_spenders(orders, k):
              totals = {}
              for o in orders:
                  if o["status"] == "paid":
                      u = o["user"]
                      totals[u] = totals.get(u, 0) + o["amount"]
              rows = [(u, round(t, 2))
                      for u, t in totals.items()]
              rows.sort(key=lambda r: (-r[1], r[0]))
              return rows[:k]
        `,
        tests: [
          { call: 'top_spenders(ORDERS, 2)', expect: "[('bo', 75.5), ('ana', 40.0)]" },
          { call: 'top_spenders(ORDERS, 10)', expect: "[('bo', 75.5), ('ana', 40.0), ('di', 40.0), ('cy', 12.0)]", hidden: true },
          { call: 'top_spenders(TIES, 5)', expect: "[('amy', 10.0), ('zed', 10.0)]", hidden: true, name: 'ties and non-paid orders' },
          { call: 'top_spenders([], 3)', expect: '[]', hidden: true },
          { call: 'top_spenders(ORDERS, 0)', expect: '[]', hidden: true },
        ],
        wrong: [
          'def top_spenders(orders, k):\n    totals = {}\n    for o in orders:\n        u = o["user"]\n        totals[u] = totals.get(u, 0) + o["amount"]\n    rows = [(u, round(t, 2)) for u, t in totals.items()]\n    rows.sort(key=lambda r: (-r[1], r[0]))\n    return rows[:k]\n',
          'def top_spenders(orders, k):\n    totals = {}\n    for o in orders:\n        if o["status"] == "paid":\n            u = o["user"]\n            totals[u] = totals.get(u, 0) + o["amount"]\n    rows = [(u, round(t, 2)) for u, t in totals.items()]\n    rows.sort(key=lambda r: r[1], reverse=True)\n    return rows[:k]\n',
        ],
        explain: 'Group-by-sum with a dict (one O(n) pass), then rank with a tuple key and slice. Rounding *before* ranking means ties are judged on the values you actually report. The SQL equivalent is `GROUP BY user ORDER BY total DESC, user LIMIT k`.',
      },
      {
        type: 'code',
        title: 'Moving average',
        prompt: md`
          Monitoring dashboards smooth noisy metrics with a moving average. Write \`make_moving_average(window)\` that returns a function \`add(x)\`: it records \`x\` and returns the average of the last \`window\` recorded values (or of all of them while fewer than \`window\` exist). Each returned function keeps its **own** history.

          \`\`\`python
          avg = make_moving_average(3)
          [avg(x) for x in [1, 2, 3, 4]]
          # [1.0, 1.5, 2.0, 3.0]
          \`\`\`
        `,
        starter: 'def make_moving_average(window):\n    pass\n',
        solution: py`
          def make_moving_average(window):
              recent = []
              def add(x):
                  recent.append(x)
                  if len(recent) > window:
                      recent.pop(0)
                  return sum(recent) / len(recent)
              return add
        `,
        tests: [
          { call: '(lambda f: [f(x) for x in [1, 2, 3, 4]])(make_moving_average(3))', expect: '[1.0, 1.5, 2.0, 3.0]', name: 'window 3 over 1, 2, 3, 4' },
          { call: 'make_moving_average(1)(7)', expect: '7.0', hidden: true },
          { call: '(lambda a, b: [a(10), b(0), a(20)])(make_moving_average(2), make_moving_average(2))', expect: '[10.0, 0.0, 15.0]', hidden: true, name: 'independent histories' },
          { call: '(lambda f: [f(x) for x in [4, 8, 0, 2, 10]])(make_moving_average(2))', expect: '[4.0, 6.0, 4.0, 1.0, 6.0]', hidden: true },
        ],
        wrong: [
          'def make_moving_average(window):\n    recent = []\n    def add(x):\n        recent.append(x)\n        return sum(recent) / len(recent)\n    return add\n',
          'def make_moving_average(window):\n    recent = []\n    def add(x):\n        recent.append(x)\n        return sum(recent[-window:]) / window\n    return add\n',
          'recent = []\n\ndef make_moving_average(window):\n    def add(x):\n        recent.append(x)\n        last = recent[-window:]\n        return sum(last) / len(last)\n    return add\n',
        ],
        explain: md`
          The list lives in the enclosing function, so every average has its own history; mutating it needs no \`nonlocal\`. Dividing by \`window\` is wrong while the window is still filling up.

          \`list.pop(0)\` is O(window). With \`collections.deque(maxlen=window)\` the drop is O(1), and keeping a running sum makes each update O(1) instead of re-summing: the kind of improvement an interviewer asks for next.
        `,
      },
      {
        type: 'code',
        title: 'Filter records',
        prompt: md`
          Write \`filter_records(records, **criteria)\` that returns the records (dicts) whose fields equal **all** given criteria, in their original order. A record that is **missing** a field doesn't match, even when you ask for \`None\`. With no criteria, every record matches.

          \`\`\`python
          filter_records(USERS, country="DE", plan="pro")
          # [{'name': 'ana', 'country': 'DE', 'plan': 'pro', ...}, ...]
          \`\`\`
        `,
        setup: py`
          USERS = [
              {"name": "ana", "country": "DE", "plan": "pro", "ref": None},
              {"name": "bo", "country": "US", "plan": "pro"},
              {"name": "cy", "country": "DE", "plan": "free", "ref": "ads"},
              {"name": "di", "country": "DE", "plan": "pro"},
          ]
        `,
        starter: 'def filter_records(records, **criteria):\n    pass\n',
        solution: py`
          def filter_records(records, **criteria):
              return [r for r in records
                      if all(k in r and r[k] == v
                             for k, v in criteria.items())]
        `,
        tests: [
          { call: 'filter_records(USERS, country="DE", plan="pro")', expect: '[USERS[0], USERS[3]]' },
          { call: 'filter_records(USERS)', expect: 'USERS', name: 'no criteria → every record' },
          { call: 'filter_records(USERS, plan="team")', expect: '[]', hidden: true },
          { call: 'filter_records(USERS, ref=None)', expect: '[USERS[0]]', hidden: true, name: 'missing field never matches, even None' },
          { call: 'filter_records(USERS, ref="ads", country="DE")', expect: '[USERS[2]]', hidden: true },
          { call: 'filter_records([], a=1)', expect: '[]', hidden: true },
        ],
        wrong: [
          'def filter_records(records, **criteria):\n    return [r for r in records if any(r.get(k) == v for k, v in criteria.items())]\n',
          'def filter_records(records, **criteria):\n    return [r for r in records if all(r[k] == v for k, v in criteria.items())]\n',
          'def filter_records(records, **criteria):\n    return [r for r in records if all(r.get(k) == v for k, v in criteria.items())]\n',
        ],
        explain: md`
          \`**criteria\` turns any keyword call into a dict, \`all()\` with a generator expression checks every condition and stops at the first mismatch, and \`all\` of nothing is \`True\`, so no criteria matches everything.

          \`r.get(k) == v\` looks right but treats a *missing* field as \`None\`. \`k in r and r[k] == v\` is precise and never raises \`KeyError\`. ORM helpers such as SQLAlchemy's \`filter_by(**kw)\` use exactly this keyword-arguments-as-criteria design.
        `,
      },
    ],
  },
};

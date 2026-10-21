// Unit 11 — NumPy: fast arrays and vectorised math.
import { py, md } from './helpers.js';

export default {
  id: 'u11',
  order: 11,
  track: 'data',
  title: 'NumPy',
  subtitle: 'fast arrays & vectorised math',
  icon: '🔢',
  color: '#0EA5E9',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u11-l1',
      title: 'Arrays',
      summary: 'Create NumPy arrays and read their dtype, shape and size.',
      steps: [
        {
          type: 'learn',
          title: 'Why NumPy?',
          body: md`
            A Python list stores **pointers** to separate number objects scattered around memory. A NumPy **array** stores the raw numbers side by side in one block, all of the **same type** (its *dtype*).

            That layout lets NumPy loop in compiled C instead of Python, often 10–100× faster, and use far less memory. pandas, scikit-learn and PyTorch are all built on it.

            Everyone imports it as \`np\`.
          `,
          code: py`
            import numpy as np

            prices = np.array([9.5, 12.0, 3.25])
            print(prices)
            print(type(prices))
            print(prices.dtype)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            a = np.array([1, 2, 3.5])
            print(a.dtype)
          `,
          options: ['float64', 'int64', 'object', 'mixed'],
          answer: 0,
          checkOutput: true,
          explain: 'One array, one dtype. NumPy **upcasts** the ints so everything fits: `1` becomes `1.0`. Nothing is stored as a mix.',
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            nums = [1, 2, 3]
            arr = np.array(nums)
            print(nums * 2)
            print(arr * 2)
          `,
          answer: '[1, 2, 3, 1, 2, 3]\n[2 4 6]',
          explain: '`*` on a list **repeats** it. On an array it is math applied to every element. Notice that arrays print without commas.',
        },
        {
          type: 'learn',
          title: 'shape, ndim and size',
          body: md`
            Arrays can have any number of dimensions. A table of numbers is a **2-D** array built from a list of rows.

            - \`.shape\`: a tuple with the length of each dimension, \`(rows, cols)\`
            - \`.ndim\`: the number of dimensions
            - \`.size\`: the total number of elements
            - \`len(a)\`: the length of the **first** dimension only
          `,
          code: py`
            import numpy as np

            m = np.array([[1, 2, 3],
                          [4, 5, 6]])
            print(m.shape, m.ndim, m.size)
            print(len(m))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            m = np.array([[1, 2], [3, 4], [5, 6]])
            print(m.shape)
          `,
          options: ['(3, 2)', '(2, 3)', '6', '(6,)'],
          answer: 0,
          checkOutput: true,
          explain: 'Three inner lists are 3 rows, each with 2 values, so 2 columns. A 2-D shape is always `(rows, cols)`. A 1-D shape looks like `(6,)`: the trailing comma makes it a one-element tuple.',
        },
        {
          type: 'learn',
          title: 'Building arrays from scratch',
          body: md`
            You rarely type arrays by hand:

            - \`np.arange(start, stop, step)\`: like \`range\`, **stop excluded**
            - \`np.linspace(start, stop, n)\`: \`n\` evenly spaced values, **stop included**
            - \`np.zeros(shape)\`, \`np.ones(shape)\`, \`np.full(shape, value)\`

            \`shape\` is an int for 1-D or a tuple like \`(2, 3)\`. \`zeros\` and \`ones\` give floats unless you pass \`dtype=int\`. \`a.tolist()\` turns an array back into a plain list.
          `,
          code: py`
            import numpy as np

            print(np.arange(0, 10, 3))
            print(np.linspace(0, 1, 5))
            print(np.zeros(3))
            print(np.ones((2, 2), dtype=int))
            print(np.full(3, 7.5))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            print(np.linspace(0, 1, 5).tolist())
          `,
          options: ['[0.0, 0.25, 0.5, 0.75, 1.0]', '[0.0, 0.2, 0.4, 0.6, 0.8]', '[0.0, 0.2, 0.4, 0.6, 0.8, 1.0]', '[0, 1, 2, 3, 4]'],
          answer: 0,
          checkOutput: true,
          explain: '`linspace` takes the **number of points** and includes both ends: 5 points from 0 to 1 are 0.25 apart. Option 2 is what `np.arange(0, 1, 0.2)` gives. Step size versus point count is the classic mix-up.',
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            print(np.arange(5))
            print(np.arange(1, 10, 3))
            print(np.zeros((2, 3)).shape)
          `,
          answer: '[0 1 2 3 4]\n[1 4 7]\n(2, 3)',
          explain: '`arange` stops *before* the stop value: 1, 4, 7, and 10 is excluded. `np.zeros((2, 3))` takes the shape as a tuple.',
        },
        {
          type: 'learn',
          title: 'One dtype, fixed size',
          body: md`
            Every element has the same dtype, so each takes a fixed number of bytes. \`float64\` is 8 bytes, so a million floats are exactly 8 MB (\`.nbytes\`). A Python list of a million floats costs about 4× more, because every float is a full object plus a pointer.

            - \`.astype(int)\` converts, and **truncates** decimals (no rounding).
            - Mix a string into the list and *everything* becomes text, so math stops working.

            > The default integer size depends on the platform: \`int64\` on most laptops, \`int32\` in this browser engine.
          `,
          code: py`
            import numpy as np

            a = np.array([1.7, 2.2, 3.9])
            print(a.astype(int))
            print(a.itemsize, a.nbytes)
            print(np.array([1, "2"]))
          `,
        },
        {
          type: 'choice',
          prompt: 'A feature matrix has 1,000,000 rows and 50 `float64` columns. Roughly how much memory does the array need?',
          options: ['400 MB', '50 MB', '8 MB', '4 GB'],
          answer: 0,
          explain: '1,000,000 × 50 × 8 bytes = 400,000,000 bytes ≈ 400 MB. Data-engineering interviews love "will it fit in RAM?" estimates like this. Switching to `float32` would halve it.',
        },
        {
          type: 'blanks',
          prompt: 'Create a 3 × 4 grid of **integer** zeros.',
          code: py`
            import numpy as np
            grid = np.___((3, 4), dtype=___)
            print(grid.shape)
          `,
          bank: ['zeros', 'int', 'ones', 'float', 'arange', 'str'],
          answer: ['zeros', 'int'],
          tests: [
            { var: 'grid', expect: 'np.zeros((3, 4), dtype=int)' },
            { assert: 'grid.dtype.kind == "i"', name: 'integer dtype' },
          ],
          explain: '`np.zeros(shape, dtype=int)`. Without `dtype` you would get floats (`0.`), which matters later when the values become indexes or counts.',
        },
        {
          type: 'code',
          title: 'Text cells to numbers',
          prompt: md`
            CSV readers hand you text. Write \`to_matrix(cells)\` that turns a list of rows of numeric strings into a 2-D **float** array with the same shape.

            \`\`\`python
            to_matrix([["3", "4.5"], ["1", "2"]])
            # array([[3. , 4.5],
            #        [1. , 2. ]])
            \`\`\`
          `,
          starter: py`
            import numpy as np

            def to_matrix(cells):
                pass
          `,
          solution: py`
            import numpy as np

            def to_matrix(cells):
                return np.array(cells, dtype=float)
          `,
          tests: [
            { call: 'to_matrix([["3", "4.5"], ["1", "2"]])', expect: 'np.array([[3, 4.5], [1, 2]])' },
            { call: 'to_matrix([["7"]]).shape', expect: '(1, 1)' },
            { assert: 'to_matrix([["1", "2"]]).dtype == np.float64', name: 'dtype is float64' },
            { call: 'to_matrix([["-1.5", "0", "2e3"]] * 3)', hidden: true },
            { assert: 'to_matrix([["1"], ["2"]]).shape == (2, 1)', name: 'keeps the column shape', hidden: true },
          ],
          hints: [
            '`np.array` accepts a `dtype=` argument.',
            '`np.array(cells, dtype=float)` parses every string while building the array.',
          ],
          wrong: [
            'import numpy as np\n\ndef to_matrix(cells):\n    return np.array(cells)\n',
            'import numpy as np\n\ndef to_matrix(cells):\n    return np.array([float(x) for row in cells for x in row])\n',
          ],
          explain: '`dtype=float` converts each string while building, and nested lists become a 2-D array. `np.array(cells).astype(float)` works too. Without the dtype you get an array of **strings**, and flattening into one list loses the row structure.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the thresholds',
          prompt: md`
            \`thresholds(n)\` should return \`n\` evenly spaced cut-offs from 0 to 1, **including both ends**. You'd use them to sweep a classifier's decision threshold.

            \`\`\`python
            thresholds(5)
            # array([0.  , 0.25, 0.5 , 0.75, 1.  ])
            \`\`\`

            The current version is wrong. Run it, find out why, and fix it.
          `,
          starter: py`
            import numpy as np

            def thresholds(n):
                return np.arange(0, 1, 1 / n)
          `,
          solution: py`
            import numpy as np

            def thresholds(n):
                return np.linspace(0, 1, n)
          `,
          tests: [
            { call: 'thresholds(5)', expect: 'np.array([0, 0.25, 0.5, 0.75, 1])' },
            { call: 'len(thresholds(11))', expect: '11' },
            { call: 'thresholds(2)', expect: 'np.array([0.0, 1.0])', hidden: true },
            { call: 'thresholds(101)', hidden: true },
          ],
          hints: [
            'Run `thresholds(5)` and look at the last value. Is 1.0 there?',
            '`np.linspace(start, stop, n)` includes the stop and takes a **count**, not a step.',
          ],
          wrong: [
            'import numpy as np\n\ndef thresholds(n):\n    return np.arange(0, 1 + 1 / n, 1 / n)\n',
            'import numpy as np\n\ndef thresholds(n):\n    return np.linspace(0, 1, n + 1)\n',
          ],
          explain: '`arange` excludes the stop and works with a *step*. With float steps it can even give one value more or less than you expect, because of rounding. When you know how many points you want, `linspace` is the safe choice.',
        },
        {
          type: 'code',
          title: 'Describe an array',
          prompt: md`
            Write \`describe(a)\` that returns a one-line summary of an array, built from its \`ndim\`, \`dtype\`, \`shape\` and \`nbytes\`:

            \`\`\`python
            describe(np.zeros((2, 3)))
            # '2-D float64 array, shape (2, 3), 48 bytes'
            \`\`\`
          `,
          starter: py`
            import numpy as np

            def describe(a):
                pass
          `,
          solution: py`
            import numpy as np

            def describe(a):
                return (f"{a.ndim}-D {a.dtype} array, "
                        f"shape {a.shape}, {a.nbytes} bytes")
          `,
          tests: [
            { call: 'describe(np.zeros((2, 3)))', expect: '"2-D float64 array, shape (2, 3), 48 bytes"' },
            { call: 'describe(np.linspace(0, 1, 4))', expect: '"1-D float64 array, shape (4,), 32 bytes"' },
            { call: 'describe(np.ones((2, 2, 2), dtype=np.int8))', hidden: true },
            { call: 'describe(np.full((1, 5), 2.5))', hidden: true },
          ],
          hints: [
            'Use an f-string with `{a.ndim}`, `{a.dtype}`, `{a.shape}` and `{a.nbytes}`.',
            'A tuple inside an f-string prints like `(2, 3)`, and a 1-D shape like `(4,)`.',
          ],
          wrong: [
            'import numpy as np\n\ndef describe(a):\n    return f"{len(a)}-D {a.dtype} array, shape {a.shape}, {a.nbytes} bytes"\n',
            'import numpy as np\n\ndef describe(a):\n    return f"{a.ndim}-D {a.dtype} array, shape {a.shape}, {a.size} bytes"\n',
          ],
          explain: '`len(a)` is only the first dimension. `ndim` counts the dimensions. `size` counts elements and `nbytes` = `size × itemsize` counts memory. Interviewers ask about this difference when you discuss memory.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u11-l2',
      title: 'Vectorised Math',
      summary: 'Replace loops with element-wise operations, ufuncs and aggregations.',
      steps: [
        {
          type: 'learn',
          title: 'Element-wise arithmetic',
          body: md`
            Arithmetic between two arrays of the same shape works **element by element**: \`price * qty\` multiplies the first price with the first quantity, the second with the second, and so on. A plain number (a *scalar*) is applied to every element.

            No loop, no index variable. That's **vectorised** code.
          `,
          code: py`
            import numpy as np

            price = np.array([9.5, 20.0, 4.0])
            qty = np.array([2, 1, 5])
            revenue = price * qty
            print(revenue)
            print(revenue * 1.19)  # add 19% VAT
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            a = np.array([1, 2, 3])
            b = np.array([10, 20, 30])
            print(a * b)
            print(b // a)
            print(a ** 2)
          `,
          answer: '[10 40 90]\n[10 10 10]\n[1 4 9]',
          explain: 'Each operator pairs up elements by position: 1·10, 2·20, 3·30, and so on. `** 2` squares every element.',
        },
        {
          type: 'learn',
          title: 'Why vectorised is faster',
          body: md`
            A Python loop over a million numbers runs a million rounds of bytecode, and every round unpacks number objects and checks their types. \`price * qty\` hands the whole job to one C loop over raw memory.

            In this engine, the loop below is roughly **70× slower** than the one-liner for a million items. Data interviews expect you to reach for vectorised code by reflex, and to explain *why* it's faster.
          `,
          code: py`
            import numpy as np

            rng = np.random.default_rng(0)
            price = rng.uniform(1, 100, 100_000)
            qty = rng.integers(1, 6, 100_000)

            slow = 0.0
            for p, q in zip(price, qty):
                slow += p * q
            fast = (price * qty).sum()
            print(np.isclose(slow, fast))
          `,
        },
        {
          type: 'choice',
          prompt: 'Why is `(price * qty).sum()` much faster than a Python `for` loop over the same arrays?',
          options: ['One compiled C loop on raw numbers', 'NumPy runs everything on the GPU', 'NumPy skips duplicate values', 'NumPy caches earlier results'],
          answer: 0,
          explain: 'No magic, just much less work per element. There is no bytecode dispatch and no boxing into Python objects, and the memory is contiguous, so the CPU cache and SIMD instructions can stream through it.',
        },
        {
          type: 'learn',
          title: 'Universal functions (ufuncs)',
          body: md`
            NumPy's math functions work element-wise on whole arrays: \`np.sqrt\`, \`np.log\`, \`np.log10\`, \`np.exp\`, \`np.abs\`, \`np.round(a, 2)\`, and \`np.maximum(a, b)\` for an element-wise max.

            Use \`np.log\`, not \`math.log\`: the \`math\` module only handles one number at a time.
          `,
          code: py`
            import numpy as np

            x = np.array([1.0, 10.0, 100.0])
            print(np.log10(x))
            print(np.sqrt(x))
            print(np.round(np.log(x), 2))
            print(np.maximum(x, 5))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            print(np.sqrt(np.array([4, 9, 16])))
          `,
          options: ['[2. 3. 4.]', '[2 3 4]', '[16 81 256]', '[2, 3, 4]'],
          answer: 0,
          checkOutput: true,
          explain: '`sqrt` always returns floats, even for perfect squares. NumPy prints floats with a trailing dot (`2.`) and no commas.',
        },
        {
          type: 'learn',
          title: 'Aggregations',
          body: md`
            Aggregations collapse an array to one number: \`a.sum()\`, \`a.mean()\`, \`a.std()\`, \`a.min()\`, \`a.max()\`.

            - \`a.argmax()\` / \`a.argmin()\`: the **position** of the max / min
            - \`a.cumsum()\`: running totals, same length as \`a\`

            > Trap: NumPy's \`std\` uses \`ddof=0\` (population std). pandas' \`.std()\` uses \`ddof=1\` (sample std). Same data, different answers.
          `,
          code: py`
            import numpy as np

            sales = np.array([120, 80, 200, 150])
            print(sales.sum(), sales.mean())
            print(sales.argmax())  # day 2
            print(sales.cumsum())
            print(round(sales.std(), 1))
            print(round(sales.std(ddof=1), 1))
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            a = np.array([2, 1, 3, 1])
            print(a.sum(), a.max(), a.argmax())
            print(a.cumsum())
          `,
          answer: '7 3 2\n[2 3 6 7]',
          explain: 'The max is 3 at **position** 2. `cumsum` keeps a running total: 2, 2+1, 2+1+3, 2+1+3+1.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            x = np.array([2, 4])
            print(x.std())
          `,
          options: ['1.0', '1.4142135623730951', '2.0', '3.0'],
          answer: 0,
          checkOutput: true,
          explain: 'The mean is 3 and both values are 1 away, so the population std is 1.0. With `ddof=1` (divide by n − 1) it would be √2 ≈ 1.414, and that is what pandas shows. Expect this question when your numbers don\'t match a colleague\'s.',
        },
        {
          type: 'blanks',
          prompt: 'Compute the total revenue of all order lines in one line.',
          code: py`
            import numpy as np
            price = np.array([9.5, 20.0, 4.0])
            qty = np.array([2, 1, 5])
            total = (price ___ qty).___()
            print(total)
          `,
          bank: ['*', 'sum', '+', 'mean', 'cumsum', 'max'],
          answer: ['*', 'sum'],
          tests: [{ var: 'total', expect: '59.0' }],
          explain: '`price * qty` is the array of line revenues (19, 20, 20). `.sum()` adds them up. The dot product `price @ qty` does both steps at once.',
        },
        {
          type: 'code',
          title: 'Line totals with discounts',
          prompt: md`
            Each order line has a \`price\`, a \`qty\` and a \`discount\` (a fraction: \`0.1\` means 10 % off). All three are arrays of the same length.

            Write \`line_totals(price, qty, discount)\` returning the array of line totals, **rounded to 2 decimals**. No loops.

            \`\`\`python
            line_totals(np.array([10.0, 4.5]),
                        np.array([3, 2]),
                        np.array([0.1, 0.0]))
            # array([27., 9.])
            \`\`\`
          `,
          setup: py`
            import numpy as np
            _r = np.random.default_rng(5)
            P = _r.uniform(1, 50, 200).round(2)
            Q = _r.integers(1, 9, 200)
            D = _r.choice([0.0, 0.1, 0.25], 200)
          `,
          starter: py`
            import numpy as np

            def line_totals(price, qty, discount):
                pass
          `,
          solution: py`
            import numpy as np

            def line_totals(price, qty, discount):
                totals = price * qty * (1 - discount)
                return np.round(totals, 2)
          `,
          tests: [
            { call: 'line_totals(np.array([10.0, 4.5]), np.array([3, 2]), np.array([0.1, 0.0]))', expect: 'np.array([27.0, 9.0])' },
            { call: 'line_totals(np.array([8.0]), np.array([5]), np.array([0.25]))', expect: 'np.array([30.0])' },
            { call: 'line_totals(P, Q, D)', hidden: true, name: '200 random order lines' },
            { call: 'line_totals(np.array([]), np.array([]), np.array([]))', hidden: true, name: 'empty arrays' },
          ],
          forbid: ['for', 'while'],
          hints: [
            '`1 - discount` is the fraction the customer still pays.',
            '`np.round(price * qty * (1 - discount), 2)`',
          ],
          wrong: [
            'import numpy as np\n\ndef line_totals(price, qty, discount):\n    return np.round(price * qty * discount, 2)\n',
            'import numpy as np\n\ndef line_totals(price, qty, discount):\n    return np.round(price * qty - discount, 2)\n',
            'import numpy as np\n\ndef line_totals(price, qty, discount):\n    return np.round(price * qty, 2) * (1 - discount)\n',
          ],
          explain: 'The three arrays line up element by element, so one expression computes every line at once. `np.round` works on a whole array. The built-in `round` only takes a single number. Rounding should be the **last** step, otherwise the discount reintroduces long decimals.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Vectorise the revenue loop',
          prompt: md`
            This function is correct, but it loops in Python, which is far too slow for the 50 million order lines in the real warehouse.

            Rewrite \`total_revenue(price, qty)\` **without any loop**, so NumPy does the work. Return the total rounded to 2 decimals.
          `,
          setup: py`
            import numpy as np
            _r = np.random.default_rng(9)
            P = _r.uniform(1, 100, 50_000).round(2)
            Q = _r.integers(1, 6, 50_000)
          `,
          starter: py`
            import numpy as np

            def total_revenue(price, qty):
                total = 0.0
                for i in range(len(price)):
                    total += price[i] * qty[i]
                return round(total, 2)
          `,
          solution: py`
            import numpy as np

            def total_revenue(price, qty):
                total = (price * qty).sum()
                return round(float(total), 2)
          `,
          tests: [
            { call: 'total_revenue(np.array([9.5, 20.0]), np.array([2, 1]))', expect: '39.0' },
            { call: 'total_revenue(np.array([]), np.array([]))', expect: '0.0' },
            { call: 'total_revenue(P, Q)', hidden: true, name: '50,000 order lines' },
          ],
          forbid: ['for', 'while'],
          hints: [
            '`price * qty` is already the array of line revenues.',
            '`round(float((price * qty).sum()), 2)`',
          ],
          wrong: [
            'import numpy as np\n\ndef total_revenue(price, qty):\n    return round(float(price.sum() * qty.sum()), 2)\n',
            'import numpy as np\n\ndef total_revenue(price, qty):\n    return round(float((price + qty).sum()), 2)\n',
          ],
          explain: 'Same math, but the multiply and the sum each run as one C loop. `price @ qty` (the dot product) multiplies and sums in a single step. Summing the prices and the quantities separately and then multiplying is a classic wrong shortcut: it pairs every price with every quantity.',
        },
        {
          type: 'code',
          title: 'z-scores',
          prompt: md`
            A **z-score** says how many standard deviations a value is from the mean: \`(x - mean) / std\`.

            Write \`zscores(x)\` returning the z-scores of a 1-D float array, **rounded to 3 decimals**, using NumPy's default (population) std. If all values are equal, the std is 0: return an array of zeros of the same length instead of dividing by zero.

            \`\`\`python
            zscores(np.array([2.0, 4.0, 6.0]))
            # array([-1.225,  0.   ,  1.225])
            \`\`\`
          `,
          setup: py`
            import numpy as np
            R = np.random.default_rng(2).normal(50, 8, 300)
          `,
          starter: py`
            import numpy as np

            def zscores(x):
                pass
          `,
          solution: py`
            import numpy as np

            def zscores(x):
                sd = x.std()
                if sd == 0:
                    return np.zeros(len(x))
                return np.round((x - x.mean()) / sd, 3)
          `,
          tests: [
            { call: 'zscores(np.array([2.0, 4.0, 6.0]))', expect: 'np.array([-1.225, 0.0, 1.225])' },
            { call: 'zscores(np.array([5.0, 5.0, 5.0]))', expect: 'np.zeros(3)', name: 'constant values give zeros' },
            { call: 'zscores(np.array([1.0, 2.0, 3.0, 10.0]))', hidden: true },
            { call: 'zscores(R)', hidden: true, name: '300 random values' },
          ],
          hints: [
            '`x - x.mean()` subtracts the mean from every element.',
            'Compute `sd = x.std()` first and return `np.zeros(len(x))` when it is 0.',
          ],
          wrong: [
            'import numpy as np\n\ndef zscores(x):\n    sd = x.std(ddof=1)\n    if sd == 0:\n        return np.zeros(len(x))\n    return np.round((x - x.mean()) / sd, 3)\n',
            'import numpy as np\n\ndef zscores(x):\n    return np.round((x - x.mean()) / x.std(), 3)\n',
          ],
          explain: '`x - x.mean()` subtracts one number from every element. That\'s a first taste of **broadcasting** (Lesson 4). z-scores put features on a common scale before clustering or regression, and |z| > 3 is a quick outlier rule. Without the zero guard you get `nan` everywhere (0 / 0) and a RuntimeWarning.',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u11-l3',
      title: 'Indexing & Masks',
      summary: 'Slice, pick and filter arrays with positions and boolean masks.',
      steps: [
        {
          type: 'learn',
          title: 'Indexing and slicing',
          body: md`
            Arrays index like lists: \`a[0]\`, \`a[-1]\`, \`a[1:4]\`, \`a[::2]\`.

            One big difference: a slice is a **view**, a window onto the same memory, not a copy. Change the slice and you change the original. That saves memory on huge arrays, but it can surprise you. Call \`.copy()\` when you need an independent array.
          `,
          code: py`
            import numpy as np

            a = np.array([10, 20, 30, 40, 50])
            print(a[0], a[-1], a[1:4])
            window = a[:2]
            window[0] = 99
            print(a)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            a = np.arange(10)
            print(a[2:8:2])
            print(a[::-3])
            print(a[-2:])
          `,
          answer: '[2 4 6]\n[9 6 3 0]\n[8 9]',
          explain: '`2:8:2` → 2, 4, 6 (8 excluded). A negative step walks backwards from the end: 9, 6, 3, 0. `-2:` is the last two.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            a = np.array([1, 2, 3])
            b = a[:2]
            b[0] = 100
            print(a[0])
          `,
          options: ['100', '1', '2', 'Error'],
          answer: 0,
          checkOutput: true,
          explain: '`b` is a view into `a`\'s memory, so writing to `b[0]` writes to `a[0]`. With a Python list, `a[:2]` would be a copy and `a[0]` would stay 1. Use `a[:2].copy()` when you need independence.',
        },
        {
          type: 'learn',
          title: 'Fancy indexing and argsort',
          body: md`
            Pass a **list of positions** to pick several elements at once, in any order: \`a[[0, 2, 4]]\`. This *fancy indexing* always returns a **copy**.

            \`np.argsort(a)\` returns the positions that would sort \`a\`. Feed them back in to reorder the values, or to find the top-k:
          `,
          code: py`
            import numpy as np

            scores = np.array([72, 95, 60, 88])
            print(scores[[1, 3]])
            order = np.argsort(scores)
            print(order)
            print(scores[order[::-1]])  # high to low
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            a = np.array([5, 8, 1, 9])
            idx = np.argsort(a)
            print(idx)
            print(a[idx[-2:]])
          `,
          answer: '[2 0 1 3]\n[8 9]',
          explain: 'The smallest value 1 is at position 2, then 5 at 0, 8 at 1, 9 at 3. The last two positions point to the two largest values.',
        },
        {
          type: 'learn',
          title: 'Boolean masks',
          body: md`
            A comparison on an array gives an array of \`True\`/\`False\`, called a **mask**. Indexing with a mask keeps the elements where it's True.

            Combine masks with \`&\` (and), \`|\` (or), \`~\` (not), and **wrap each condition in parentheses**, because \`&\` binds tighter than \`>\`.

            True counts as 1, so \`mask.sum()\` counts the matches and \`mask.mean()\` gives the **fraction** that matches.
          `,
          code: py`
            import numpy as np

            temps = np.array([18, 25, 31, 22, 35])
            hot = temps > 30
            print(hot)
            print(temps[hot])
            print(hot.sum(), hot.mean())
            print(temps[(temps > 20) & (temps < 32)])
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            import numpy as np
            a = np.array([1, 5, 9])
            print(a[(a > 2) and (a < 8)])
          `,
          options: [
            'ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()',
            '[5]',
            '[5 9]',
            '[]',
          ],
          answer: 0,
          checkOutput: true,
          explain: '`and` asks Python for **one** True/False for the whole array, and that is ambiguous. Element-wise logic needs `&`: `a[(a > 2) & (a < 8)]` gives `[5]`. pandas raises the same error. It is one of the most common bugs in data interviews.',
        },
        {
          type: 'blanks',
          prompt: 'Count the cold, wet days: more than 5 mm of rain **and** below 10 °C.',
          code: py`
            import numpy as np
            rain = np.array([0.0, 7.5, 12.0, 6.1, 0.4])
            temp = np.array([8.0, 9.5, 14.0, 3.2, 2.0])
            cold_wet = (rain ___ 5) ___ (temp < 10)
            print(cold_wet.___())
          `,
          bank: ['>', '&', 'sum', 'and', '<', '|', 'len'],
          answer: ['>', '&', 'sum'],
          tests: [{ stdout: '2\n' }],
          explain: 'Two masks combined with `&`, then `.sum()` counts the True values: days 1 and 3.',
        },
        {
          type: 'code',
          title: 'Count in a range',
          prompt: md`
            Write \`count_between(a, lo, hi)\` returning how many values of the array \`a\` lie in the **inclusive** range \`lo ≤ x ≤ hi\`, as an int. Use a mask, no loop.

            \`\`\`python
            count_between(np.array([1, 5, 7, 10]), 5, 10)  # 3
            \`\`\`
          `,
          setup: py`
            import numpy as np
            T = np.random.default_rng(3).normal(20, 6, 500).round(1)
          `,
          starter: py`
            import numpy as np

            def count_between(a, lo, hi):
                pass
          `,
          solution: py`
            import numpy as np

            def count_between(a, lo, hi):
                inside = (a >= lo) & (a <= hi)
                return int(inside.sum())
          `,
          tests: [
            { call: 'count_between(np.array([1, 5, 7, 10]), 5, 10)', expect: '3' },
            { call: 'count_between(np.array([1, 2]), 5, 10)', expect: '0' },
            { call: 'count_between(np.array([]), 0, 1)', expect: '0', hidden: true },
            { call: 'count_between(T, 15, 25)', hidden: true, name: '500 temperatures' },
          ],
          forbid: ['for', 'while'],
          hints: [
            'Build two masks, `a >= lo` and `a <= hi`.',
            'Combine them with `&` (with parentheses!) and call `.sum()`.',
          ],
          wrong: [
            'import numpy as np\n\ndef count_between(a, lo, hi):\n    return int(((a > lo) & (a < hi)).sum())\n',
            'import numpy as np\n\ndef count_between(a, lo, hi):\n    return int(((a >= lo) | (a <= hi)).sum())\n',
          ],
          explain: '`.sum()` on a bool array counts the True values. `int(...)` turns the NumPy integer into a plain Python int, a good habit when results go into JSON or a report. Using `|` instead of `&` is true for *every* value, since any number is either ≥ lo or ≤ hi.',
        },
        {
          type: 'learn',
          title: 'np.where, clip and NaN',
          body: md`
            - \`np.where(cond, a, b)\`: element-wise *if/else*. Takes \`a\` where cond is True, else \`b\`. Nest them for three cases.
            - \`a.clip(lo, hi)\`: caps values into a range, a quick way to tame outliers.
            - \`np.nan\` marks a missing float. Any math with NaN gives NaN, so \`a.mean()\` becomes \`nan\`. Find missing values with \`np.isnan(a)\`, and skip them with \`np.nanmean(a)\` (also \`nansum\`, \`nanmax\`, …).

            Never test \`x == np.nan\`: it is **always** False.
          `,
          code: py`
            import numpy as np

            amount = np.array([12.0, 80.0, np.nan, 300.0])
            print(np.where(amount > 50, "big", "small"))
            print(amount.clip(0, 100))
            print(np.isnan(amount).sum(), np.nanmean(amount))
          `,
        },
        {
          type: 'order',
          prompt: 'Arrange the lines to print the share of orders above €50.',
          lines: [
            'import numpy as np',
            'amounts = np.array([12, 80, 55, 3, 99])',
            'big = amounts > 50',
            'share = big.mean()',
            'print(share)',
          ],
          distractors: ['big = amounts[amounts > 50]'],
          tests: [{ stdout: '0.6\n' }],
          explain: 'The mask `amounts > 50` has three True values out of five, and `.mean()` turns that into 0.6. The distractor keeps the *values* (80, 55, 99), so its mean would be the average big order instead of a share.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the top-k',
          prompt: md`
            \`top_k(a, k)\` should return the \`k\` **largest** values of \`a\`, largest first. \`k\` can be 0, and then the result is an empty array.

            \`\`\`python
            top_k(np.array([4, 9, 1, 7]), 2)  # array([9, 7])
            \`\`\`
          `,
          setup: py`
            import numpy as np
            T = np.random.default_rng(4).integers(0, 1000, 300)
          `,
          starter: py`
            import numpy as np

            def top_k(a, k):
                return np.sort(a)[:k]
          `,
          solution: py`
            import numpy as np

            def top_k(a, k):
                return np.sort(a)[::-1][:k]
          `,
          tests: [
            { call: 'top_k(np.array([4, 9, 1, 7]), 2)', expect: 'np.array([9, 7])' },
            { call: 'top_k(np.array([3, 3, 1]), 3)', expect: 'np.array([3, 3, 1])' },
            { call: 'top_k(np.array([5, 2, 8]), 0)', expect: 'np.array([], dtype=int)', hidden: true, name: 'k = 0' },
            { call: 'top_k(T, 5)', hidden: true },
          ],
          hints: [
            '`np.sort` sorts ascending. Reverse an array with `[::-1]`.',
            'Watch out for `k = 0`: what does `a[-0:]` return?',
          ],
          wrong: [
            'import numpy as np\n\ndef top_k(a, k):\n    return np.sort(a)[-k:]\n',
            'import numpy as np\n\ndef top_k(a, k):\n    return np.sort(a)[-k:][::-1]\n',
          ],
          explain: '`np.sort(a)[::-1][:k]` sorts, flips to descending, then takes the first k. The tempting `np.sort(a)[-k:][::-1]` breaks for k = 0, because `-0` is just `0` and `a[0:]` is the whole array. For huge arrays, `np.argpartition` finds the top k without a full sort: O(n) instead of O(n log n).',
        },
        {
          type: 'code',
          title: 'Order size labels',
          prompt: md`
            Write \`size_labels(amounts)\` that labels every order amount:

            - \`"small"\` below 20
            - \`"medium"\` from 20 up to (but not including) 100
            - \`"large"\` from 100

            Return an array of strings, no loops.

            \`\`\`python
            size_labels(np.array([5.0, 20.0, 150.0])).tolist()
            # ['small', 'medium', 'large']
            \`\`\`
          `,
          setup: py`
            import numpy as np
            A = np.random.default_rng(6).exponential(60, 400).round(2)
          `,
          starter: py`
            import numpy as np

            def size_labels(amounts):
                pass
          `,
          solution: py`
            import numpy as np

            def size_labels(amounts):
                return np.where(amounts < 20, "small",
                                np.where(amounts < 100,
                                         "medium", "large"))
          `,
          tests: [
            { call: 'size_labels(np.array([5.0, 20.0, 150.0])).tolist()', expect: '["small", "medium", "large"]' },
            { call: 'size_labels(np.array([19.99, 99.99, 100.0])).tolist()', expect: '["small", "medium", "large"]', name: 'boundaries' },
            { call: 'size_labels(A).tolist()', hidden: true, name: '400 random amounts' },
          ],
          forbid: ['for', 'while'],
          hints: [
            'The "else" part of `np.where` can itself be another `np.where`.',
            '`np.where(a < 20, "small", np.where(a < 100, "medium", "large"))`',
          ],
          wrong: [
            'import numpy as np\n\ndef size_labels(amounts):\n    return np.where(amounts < 20, "small", np.where(amounts <= 100, "medium", "large"))\n',
            'import numpy as np\n\ndef size_labels(amounts):\n    return np.where(amounts < 20, "small", "large")\n',
          ],
          explain: 'The outer `where` handles "small". Everything else goes to the inner `where`, which splits medium from large. For many categories, `np.select([c1, c2, …], [v1, v2, …], default)` reads better. In pandas you\'ll use `pd.cut` for binning.',
        },
        {
          type: 'code',
          title: 'Clean the sensor feed',
          prompt: md`
            A temperature sensor sends \`-999.0\` when it fails, and sometimes \`nan\`. Write \`sensor_stats(r)\` returning a tuple \`(valid_count, mean)\`:

            - \`valid_count\`: how many readings are real (an int)
            - \`mean\`: their mean, rounded to 2 decimals

            If no reading is valid, return \`(0, None)\`.

            \`\`\`python
            sensor_stats(np.array([21.5, -999.0, np.nan, 22.5]))
            # (2, 22.0)
            \`\`\`
          `,
          setup: py`
            import numpy as np
            _r = np.random.default_rng(8)
            S = _r.normal(21, 2, 200).round(1)
            S[_r.choice(200, 15, replace=False)] = -999.0
            S[_r.choice(200, 10, replace=False)] = np.nan
          `,
          starter: py`
            import numpy as np

            def sensor_stats(r):
                pass
          `,
          solution: py`
            import numpy as np

            def sensor_stats(r):
                ok = (r != -999) & ~np.isnan(r)
                n = int(ok.sum())
                if n == 0:
                    return (0, None)
                return (n, round(float(r[ok].mean()), 2))
          `,
          tests: [
            { call: 'sensor_stats(np.array([21.5, -999.0, np.nan, 22.5]))', expect: '(2, 22.0)' },
            { call: 'sensor_stats(np.array([-999.0, np.nan]))', expect: '(0, None)', name: 'nothing valid' },
            { call: 'sensor_stats(np.array([18.0, 19.0, 20.5]))', expect: '(3, 19.17)', hidden: true },
            { call: 'sensor_stats(S)', hidden: true, name: '200 readings with failures' },
          ],
          hints: [
            'Valid means: not -999 **and** not NaN. `~np.isnan(r)` is True for real numbers.',
            'Build one mask `ok`, count with `ok.sum()`, and take `r[ok].mean()`.',
          ],
          wrong: [
            'import numpy as np\n\ndef sensor_stats(r):\n    ok = r != -999\n    if ok.sum() == 0:\n        return (0, None)\n    return (int(ok.sum()), round(float(r[ok].mean()), 2))\n',
            'import numpy as np\n\ndef sensor_stats(r):\n    ok = ~np.isnan(r)\n    if ok.sum() == 0:\n        return (0, None)\n    return (int(ok.sum()), round(float(np.nanmean(r)), 2))\n',
          ],
          explain: 'Real data is full of *sentinel values* like -999, 0 or 9999 that secretly mean "missing". They silently wreck averages, so check `min()`/`max()` before trusting a mean. One combined mask handles both kinds of missing value, and the same mask gives you the count.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u11-l4',
      title: '2-D Arrays & Broadcasting',
      summary: 'Work with tables of numbers: axis, reshape, broadcasting and stacking.',
      steps: [
        {
          type: 'learn',
          title: 'Rows, columns and reshape',
          body: md`
            Index a 2-D array with \`[row, col]\`. A \`:\` means "everything along this axis":

            - \`m[1, 2]\`: one element
            - \`m[0]\`: the first row
            - \`m[:, 1]\`: the second column
            - \`m[:2, 1:]\`: a sub-block

            \`a.reshape(rows, cols)\` gives the same data a new shape (the sizes must match). Pass \`-1\` for one dimension and NumPy works it out.
          `,
          code: py`
            import numpy as np

            m = np.arange(12).reshape(3, 4)
            print(m)
            print(m[1, 2], m[:, 1])
            print(m[:2, 1:])
            print(m.reshape(2, -1).shape)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            m = np.arange(6).reshape(2, 3)
            print(m)
            print(m[1, 2], m[:, 0])
          `,
          answer: '[[0 1 2]\n [3 4 5]]\n5 [0 3]',
          explain: '`reshape(2, 3)` fills row by row. `m[1, 2]` is row 1, column 2 → 5. `m[:, 0]` is the first column. 2-D arrays print with a space before every row after the first.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            print(np.arange(12).reshape(3, -1).shape)
          `,
          options: ['(3, 4)', '(4, 3)', '(3, 12)', '(3, -1)'],
          answer: 0,
          checkOutput: true,
          explain: '12 elements in 3 rows leaves 4 per row. `-1` means "whatever fits".',
        },
        {
          type: 'learn',
          title: 'The axis argument',
          body: md`
            Aggregations take an \`axis\`:

            - \`axis=0\` collapses the **rows** → one result per **column**
            - \`axis=1\` collapses the **columns** → one result per **row**

            Memory trick: the axis you name is the one that **disappears**. A \`(3, 4)\` array summed over \`axis=0\` has shape \`(4,)\`.
          `,
          code: py`
            import numpy as np

            # 2 stores (rows) x 3 days (columns)
            sales = np.array([[5, 3, 8],
                              [2, 7, 1]])
            print(sales.sum(axis=0))     # per day
            print(sales.sum(axis=1))     # per store
            print(sales.argmax(axis=1))  # best day per store
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            m = np.array([[1, 2],
                          [3, 4]])
            print(m.sum(axis=0))
            print(m.max(axis=1))
            print(m.mean())
          `,
          answer: '[4 6]\n[2 4]\n2.5',
          explain: 'Column sums: 1+3, 2+4. Row maxima: 2 and 4. Without an axis, the aggregation uses every element.',
        },
        {
          type: 'choice',
          prompt: '`X` holds 1,000 users (rows) × 20 features (columns). Which expression gives the mean of **each feature**?',
          options: ['X.mean(axis=0)', 'X.mean(axis=1)', 'X.mean()', 'X[0].mean()'],
          answer: 0,
          explain: 'You want 20 results, one per column, so the 1,000 rows must disappear: `axis=0`. `axis=1` would give 1,000 per-user means, and `X.mean()` a single number.',
        },
        {
          type: 'learn',
          title: 'Broadcasting',
          body: md`
            NumPy can combine arrays of **different shapes** by stretching the smaller one, without copying it. Compare the shapes from the **right**. Two dimensions fit when they are equal or one of them is 1.

            - \`(3, 4)\` with \`(4,)\` ✓ the row is reused for all 3 rows
            - \`(3, 4)\` with \`(3, 1)\` ✓ the column is reused across 4 columns
            - \`(3, 4)\` with \`(3,)\` ✗ 4 vs 3

            \`keepdims=True\` keeps a collapsed axis as size 1, so row totals stay a column \`(3, 1)\`.
          `,
          code: py`
            import numpy as np

            X = np.array([[1., 2.], [3., 6.], [5., 10.]])
            print(X - X.mean(axis=0))   # (3,2) - (2,)
            tot = X.sum(axis=1, keepdims=True)
            print(tot.shape)            # (3, 1)
            print(X / tot)
          `,
        },
        {
          type: 'choice',
          prompt: 'Which pair of shapes does **not** broadcast?',
          options: ['(3, 4) and (3,)', '(3, 4) and (4,)', '(3, 4) and (3, 1)', '(3, 4) and (1, 4)'],
          answer: 0,
          explain: 'Align from the right: `(3, 4)` vs `(3,)` compares 4 with 3, which are not equal, and neither is 1. Turn the 3 values into a column with `v.reshape(-1, 1)` (or `v[:, None]`) to make it work.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            X = np.ones((4, 1)) + np.arange(3)
            print(X.shape)
          `,
          options: ['(4, 3)', '(4, 1)', '(3, 4)', '(1, 3)'],
          answer: 0,
          checkOutput: true,
          explain: '`(4, 1)` and `(3,)`: on the right, 1 stretches to 3. On the left, the missing dimension counts as 1 and stretches to 4. The result `(4, 3)` pairs every row with every column. This "outer" trick builds distance tables in one line.',
        },
        {
          type: 'blanks',
          prompt: 'Standardise every **column** of `X`: subtract the column mean, divide by the column std.',
          code: py`
            import numpy as np
            X = np.array([[1., 10.], [2., 20.], [3., 60.]])
            Z = (X - X.mean(axis=___)) / X.std(axis=___)
            print(Z.shape)
          `,
          bank: ['0', '0', '1', '1', 'None'],
          answer: ['0', '0'],
          tests: [{ var: 'Z', expect: '(X - X.mean(axis=0)) / X.std(axis=0)' }],
          explain: 'Column statistics collapse the rows: `axis=0` gives shape `(2,)`, which broadcasts across all 3 rows. With `axis=1` you\'d get shape `(3,)`, which doesn\'t fit `(3, 2)`.',
        },
        {
          type: 'learn',
          title: 'Stacking arrays',
          body: md`
            Glue arrays together:

            - \`np.vstack([a, b])\`: stack **rows**, one on top of the other
            - \`np.hstack([a, b])\`: side by side
            - \`np.column_stack([x, y])\`: turn 1-D arrays into the **columns** of a table
            - \`np.concatenate(arrays, axis=0)\`: the general version

            Typical use: add a column of ones (the intercept) before fitting a linear regression.
          `,
          code: py`
            import numpy as np

            x = np.array([1.5, 2.0, 3.5])
            X = np.column_stack([np.ones(3), x])
            print(X)
            print(np.vstack([X, [1.0, 9.0]]).shape)
          `,
        },
        {
          type: 'code',
          title: 'Category shares per store',
          prompt: md`
            \`M\` is a 2-D array: one row per store, one column per product category, values = revenue. Write \`row_shares(M)\` returning each value as a **share of its row total**, rounded to 3 decimals. Every row of the result sums to 1. You can assume no row total is 0.

            \`\`\`python
            row_shares(np.array([[1., 3.], [2., 8.]]))
            # array([[0.25, 0.75],
            #        [0.2 , 0.8 ]])
            \`\`\`
          `,
          setup: py`
            import numpy as np
            R = np.random.default_rng(1).uniform(1, 100, (6, 4))
          `,
          starter: py`
            import numpy as np

            def row_shares(M):
                pass
          `,
          solution: py`
            import numpy as np

            def row_shares(M):
                tot = M.sum(axis=1, keepdims=True)
                return np.round(M / tot, 3)
          `,
          tests: [
            { call: 'row_shares(np.array([[1., 3.], [2., 8.]]))', expect: 'np.array([[0.25, 0.75], [0.2, 0.8]])' },
            { call: 'row_shares(np.array([[2., 6., 2.]]))', expect: 'np.array([[0.2, 0.6, 0.2]])' },
            { call: 'row_shares(R)', hidden: true, name: '6 stores × 4 categories' },
            { call: 'row_shares(np.array([[5.], [1.]]))', expect: 'np.array([[1.], [1.]])', hidden: true },
          ],
          hints: [
            'You need one total per row: `M.sum(axis=1)`.',
            'Keep it as a column with `keepdims=True` so it broadcasts across the columns.',
          ],
          wrong: [
            'import numpy as np\n\ndef row_shares(M):\n    return np.round(M / M.sum(axis=1), 3)\n',
            'import numpy as np\n\ndef row_shares(M):\n    return np.round(M / M.sum(axis=0), 3)\n',
            'import numpy as np\n\ndef row_shares(M):\n    return np.round(M / M.sum(), 3)\n',
          ],
          explain: 'Without `keepdims`, the row totals have shape `(n,)` and broadcast along the **wrong** axis: column j is divided by row j\'s total. For a square matrix that *silently* gives wrong numbers instead of an error, the nastiest kind of bug. `M.sum(axis=1)[:, None]` is an equivalent spelling.',
        },
        {
          type: 'code',
          title: 'Standardise features',
          prompt: md`
            Before training many models you scale each **feature (column)** to mean 0 and std 1.

            Write \`standardize(X)\` for a 2-D float array: subtract each column's mean and divide by each column's std (NumPy default, \`ddof=0\`). Round to 3 decimals. A column whose std is 0 should become all zeros, with no NaN.

            \`\`\`python
            standardize(np.array([[1., 5.], [3., 5.]]))
            # array([[-1.,  0.],
            #        [ 1.,  0.]])
            \`\`\`
          `,
          setup: py`
            import numpy as np
            R = np.random.default_rng(3).normal(10, 4, (50, 3))
          `,
          starter: py`
            import numpy as np

            def standardize(X):
                pass
          `,
          solution: py`
            import numpy as np

            def standardize(X):
                mu = X.mean(axis=0)
                sd = X.std(axis=0)
                sd = np.where(sd == 0, 1.0, sd)
                return np.round((X - mu) / sd, 3)
          `,
          tests: [
            { call: 'standardize(np.array([[1., 5.], [3., 5.]]))', expect: 'np.array([[-1., 0.], [1., 0.]])', name: 'constant column becomes 0' },
            { call: 'standardize(np.array([[1., 10.], [2., 20.], [3., 60.]]))', expect: 'np.array([[-1.225, -0.926], [0., -0.463], [1.225, 1.389]])' },
            { call: 'standardize(R)', hidden: true, name: '50 rows × 3 features' },
          ],
          hints: [
            'Column statistics: `X.mean(axis=0)` and `X.std(axis=0)`.',
            'Replace zero stds before dividing: `np.where(sd == 0, 1.0, sd)`. Then a constant column gives 0 / 1 = 0.',
          ],
          wrong: [
            'import numpy as np\n\ndef standardize(X):\n    return np.round((X - X.mean(axis=0)) / X.std(axis=0), 3)\n',
            'import numpy as np\n\ndef standardize(X):\n    mu = X.mean(axis=1, keepdims=True)\n    sd = X.std(axis=1, keepdims=True)\n    sd = np.where(sd == 0, 1.0, sd)\n    return np.round((X - mu) / sd, 3)\n',
            'import numpy as np\n\ndef standardize(X):\n    sd = X.std(axis=0, ddof=1)\n    sd = np.where(sd == 0, 1.0, sd)\n    return np.round((X - X.mean(axis=0)) / sd, 3)\n',
          ],
          explain: '`X.mean(axis=0)` has shape `(n_features,)` and broadcasts across every row. This is exactly what scikit-learn\'s `StandardScaler` does, including leaving constant columns at 0 instead of producing NaN.',
        },
        {
          type: 'code',
          title: 'Weighted final grades',
          prompt: md`
            \`scores\` is a 2-D array (students × assignments) and \`weights\` a 1-D array with one weight per assignment (they need not sum to 1).

            Write \`final_grades(scores, weights)\` returning a tuple \`(grades, best)\`:

            - \`grades\`: each student's weighted average, \`sum(score × weight) / sum(weights)\`, rounded to 1 decimal
            - \`best\`: the row index (an int) of the student with the highest grade

            \`\`\`python
            s = np.array([[80, 90], [70, 100]])
            final_grades(s, np.array([1, 3]))
            # (array([87.5, 92.5]), 1)
            \`\`\`
          `,
          setup: py`
            import numpy as np
            S = np.random.default_rng(7).integers(40, 101, (30, 5))
            W = np.array([1, 1, 2, 2, 4])
          `,
          starter: py`
            import numpy as np

            def final_grades(scores, weights):
                pass
          `,
          solution: py`
            import numpy as np

            def final_grades(scores, weights):
                total = (scores * weights).sum(axis=1)
                grades = total / weights.sum()
                best = int(grades.argmax())
                return np.round(grades, 1), best
          `,
          tests: [
            { call: 'final_grades(np.array([[80, 90], [70, 100]]), np.array([1, 3]))', expect: '(np.array([87.5, 92.5]), 1)' },
            { call: 'final_grades(np.array([[50, 50, 100]]), np.array([1, 1, 2]))', expect: '(np.array([75.0]), 0)' },
            { call: 'final_grades(S, W)', hidden: true, name: '30 students × 5 assignments' },
          ],
          hints: [
            '`scores * weights` multiplies every row by the weight row (broadcasting).',
            'Sum each row with `axis=1`, divide by `weights.sum()`, and use `argmax()` for the best row.',
          ],
          wrong: [
            'import numpy as np\n\ndef final_grades(scores, weights):\n    grades = scores.mean(axis=1)\n    return np.round(grades, 1), int(grades.argmax())\n',
            'import numpy as np\n\ndef final_grades(scores, weights):\n    grades = (scores * weights).sum(axis=0) / weights.sum()\n    return np.round(grades, 1), int(grades.argmax())\n',
            'import numpy as np\n\ndef final_grades(scores, weights):\n    grades = (scores * weights).sum(axis=1) / weights.sum()\n    return np.round(grades, 1), float(grades.max())\n',
          ],
          explain: '`scores * weights` broadcasts the weight row onto every student, and `sum(axis=1)` collapses each student\'s row. The matrix product `scores @ weights / weights.sum()` does multiply-and-sum in one step. That\'s how a linear model scores a whole batch at once.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u11-l5',
      title: 'Random & Simulation',
      summary: 'Seeded random numbers, Monte Carlo estimates, percentiles and smoothing.',
      steps: [
        {
          type: 'learn',
          title: 'Reproducible randomness',
          body: md`
            Create one **generator** with a seed, \`rng = np.random.default_rng(42)\`, and draw everything from it:

            - \`rng.integers(lo, hi, size)\`: ints, **hi excluded**
            - \`rng.random(size)\`: floats in [0, 1)
            - \`rng.choice(items, size, p=...)\`: sample from a list, optionally with probabilities

            Same seed → same numbers on every run, so experiments and tests are reproducible. The old \`np.random.seed()\` style still works, but new code uses \`default_rng\`.
          `,
          code: py`
            import numpy as np

            rng = np.random.default_rng(42)
            print(rng.integers(1, 7, size=5))  # dice
            print(rng.random(3).round(3))
            print(rng.choice(["A", "B"], size=4, p=[0.9, 0.1]))
          `,
        },
        {
          type: 'choice',
          prompt: 'Can `rng.integers(1, 7, size=1000)` ever produce a 7?',
          options: ['No, the upper bound is excluded', 'Yes, both bounds are included', 'Only with a different seed', 'Only if size is above 6'],
          answer: 0,
          explain: 'Like `range`, the high end is excluded, so you get 1 to 6: a die. Python\'s `random.randint(1, 6)` includes both ends. Mixing up the two is a classic off-by-one.',
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            a = np.random.default_rng(7).integers(0, 100, 5)
            b = np.random.default_rng(7).integers(0, 100, 5)
            c = np.random.default_rng(8).integers(0, 100, 5)
            print((a == b).all())
            print((a == c).all())
            print(a.shape)
          `,
          answer: 'True\nFalse\n(5,)',
          explain: 'Two generators with the same seed produce identical streams. A different seed gives different numbers. You don\'t need to know the actual values to answer this.',
        },
        {
          type: 'learn',
          title: 'Distributions',
          body: md`
            - \`rng.normal(mean, std, size)\`: the bell curve (heights, measurement noise)
            - \`rng.uniform(lo, hi, size)\`: every value equally likely
            - \`rng.exponential(scale, size)\`: waiting times
            - \`rng.binomial(n, p, size)\`: successes in n tries (conversions!)

            The more samples you draw, the closer the sample mean and std get to the true values. That's the **law of large numbers**, and every simulation relies on it.
          `,
          code: py`
            import numpy as np

            rng = np.random.default_rng(0)
            h = rng.normal(170, 10, size=100_000)
            print(round(h.mean(), 1), round(h.std(), 1))
            signups = rng.binomial(1000, 0.03, size=5)
            print(signups)  # per 1000 visitors
          `,
        },
        {
          type: 'choice',
          prompt: '`x = rng.normal(50, 5, size=1_000_000)`. About what fraction of `x` lies between 45 and 55?',
          options: ['68%', '95%', '50%', '99.7%'],
          answer: 0,
          explain: '45–55 is the mean ± 1 std, which holds about 68 % of a normal distribution (±2 std ≈ 95 %, ±3 std ≈ 99.7 %). You could check it with a mask: `((x > 45) & (x < 55)).mean()`.',
        },
        {
          type: 'learn',
          title: 'Monte Carlo: simulate, then count',
          body: md`
            When a probability is hard to calculate, **simulate** it. Generate many random trials, mark the successes with a mask, and take \`mask.mean()\`.

            Vectorise the trials: one **row** per trial, one **column** per die, customer or step. Then a single \`axis=1\` aggregation scores every trial at once.
          `,
          code: py`
            import numpy as np

            rng = np.random.default_rng(1)
            rolls = rng.integers(1, 7, size=(100_000, 2))
            seven = rolls.sum(axis=1) == 7
            print(seven.mean())  # exact answer: 1/6
          `,
        },
        {
          type: 'blanks',
          prompt: 'Estimate the chance of rolling **at least one six** in 4 rolls of a die.',
          code: py`
            import numpy as np
            rng = np.random.default_rng(0)
            rolls = rng.integers(1, 7, size=(100_000, ___))
            hit = (rolls == 6).___(axis=1)
            print(round(hit.mean(), 2))
          `,
          bank: ['4', 'any', 'all', '6', 'sum', '7'],
          answer: ['4', 'any'],
          tests: [{ stdout: '0.52\n' }],
          explain: 'Each row is one experiment with 4 rolls. `.any(axis=1)` asks "is there a six anywhere in this row?". The exact answer is 1 − (5/6)⁴ ≈ 0.518. A famous 17th-century gambling problem, solved in three lines.',
        },
        {
          type: 'code',
          title: 'Estimate π',
          prompt: md`
            Drop \`n\` random points uniformly in the unit square [0, 1) × [0, 1). The fraction that lands inside the quarter circle \`x² + y² ≤ 1\` approaches π/4.

            Write \`estimate_pi(n, seed)\` that uses \`np.random.default_rng(seed)\` and returns the estimate of π as a float. Vectorise it, no loops.

            \`\`\`python
            estimate_pi(200_000, 1)  # about 3.14
            \`\`\`
          `,
          starter: py`
            import numpy as np

            def estimate_pi(n, seed):
                pass
          `,
          solution: py`
            import numpy as np

            def estimate_pi(n, seed):
                rng = np.random.default_rng(seed)
                x = rng.random(n)
                y = rng.random(n)
                inside = x**2 + y**2 <= 1
                return 4 * float(inside.mean())
          `,
          tests: [
            { assert: 'abs(estimate_pi(200_000, 1) - 3.1416) < 0.02', name: 'close to π for n = 200,000' },
            { assert: 'estimate_pi(1000, 3) == estimate_pi(1000, 3)', name: 'same seed gives the same answer' },
            { assert: 'isinstance(estimate_pi(100, 0), float)', name: 'returns a float' },
            { assert: 'abs(estimate_pi(500_000, 7) - 3.1416) < 0.01', name: 'close to π for n = 500,000', hidden: true },
          ],
          forbid: ['for', 'while'],
          hints: [
            'Draw `x = rng.random(n)` and `y = rng.random(n)`, then build the mask `x**2 + y**2 <= 1`.',
            'The mask\'s mean estimates π/4, so multiply by 4.',
          ],
          wrong: [
            'import numpy as np\n\ndef estimate_pi(n, seed):\n    rng = np.random.default_rng(seed)\n    x, y = rng.random(n), rng.random(n)\n    return float((x**2 + y**2 <= 1).mean())\n',
            'import numpy as np\n\ndef estimate_pi(n, seed):\n    rng = np.random.default_rng(seed)\n    x, y = rng.random(n), rng.random(n)\n    return 4 * float((x + y <= 1).mean())\n',
          ],
          explain: 'The error shrinks like 1/√n: 100× more points buys only 10× more accuracy. That square-root law is why A/B tests need big samples, and it\'s at the heart of every Monte Carlo method.',
        },
        {
          type: 'learn',
          title: 'Percentiles and moving averages',
          body: md`
            - \`np.percentile(x, 95)\`: the value that 95 % of the data lies below. Latency targets are written as p50 / p95 / p99, because a mean hides the slow tail.
            - \`np.median(x)\`: the 50th percentile, robust to outliers.
            - A **moving average** with window k smooths noise. \`np.convolve(x, np.ones(k) / k, mode="valid")\` slides the window along and returns \`len(x) - k + 1\` values.
          `,
          code: py`
            import numpy as np

            ms = np.array([80, 95, 70, 1200, 85, 90])
            print(ms.mean(), np.median(ms))
            print(np.percentile(ms, [50, 95]))
            x = np.array([1, 2, 3, 4, 5, 6])
            w = np.ones(3) / 3
            print(np.convolve(x, w, mode="valid"))
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import numpy as np
            x = np.array([2, 4, 6, 8])
            ma = np.convolve(x, np.ones(2) / 2, mode="valid")
            print(ma)
            print(len(ma))
          `,
          answer: '[3. 5. 7.]\n3',
          explain: 'Windows of 2: (2+4)/2, (4+6)/2, (6+8)/2. Only full windows count, so 4 values give 3 averages.',
        },
        {
          type: 'code',
          title: 'Moving average',
          prompt: md`
            Write \`moving_average(x, k)\` returning the moving average of a 1-D array with window \`k\` (1 ≤ k ≤ len(x)). Only full windows count, so the result has \`len(x) - k + 1\` values. Round to 2 decimals.

            \`\`\`python
            moving_average(np.array([1., 2., 3., 4., 5.]), 2)
            # array([1.5, 2.5, 3.5, 4.5])
            \`\`\`
          `,
          setup: py`
            import numpy as np
            P = 100 + np.random.default_rng(11).normal(0, 1, 120).cumsum()
          `,
          starter: py`
            import numpy as np

            def moving_average(x, k):
                pass
          `,
          solution: py`
            import numpy as np

            def moving_average(x, k):
                w = np.ones(k) / k
                ma = np.convolve(x, w, mode="valid")
                return np.round(ma, 2)
          `,
          tests: [
            { call: 'moving_average(np.array([1., 2., 3., 4., 5.]), 2)', expect: 'np.array([1.5, 2.5, 3.5, 4.5])' },
            { call: 'moving_average(np.array([3., 1., 2.]), 3)', expect: 'np.array([2.0])' },
            { call: 'moving_average(np.array([5., 7.]), 1)', expect: 'np.array([5., 7.])', name: 'window of 1' },
            { call: 'moving_average(P, 7)', hidden: true, name: '120-day price series' },
          ],
          hints: [
            'A window of k equal weights is `np.ones(k) / k`.',
            '`np.convolve(x, weights, mode="valid")` keeps only the full windows.',
          ],
          wrong: [
            'import numpy as np\n\ndef moving_average(x, k):\n    return np.round(np.convolve(x, np.ones(k) / k, mode="same"), 2)\n',
            'import numpy as np\n\ndef moving_average(x, k):\n    return np.round(np.convolve(x, np.ones(k), mode="valid"), 2)\n',
          ],
          explain: 'The cumsum trick does the same in O(n) for any window: `c = np.cumsum(np.insert(x, 0, 0))`, then `(c[k:] - c[:-k]) / k`. pandas has `s.rolling(k).mean()` (Unit 13), which keeps the first k − 1 positions as NaN instead of dropping them.',
        },
        {
          type: 'code',
          title: 'Latency SLO report',
          prompt: md`
            Every line of \`data/server.log\` ends with the response time in **seconds**:

            \`\`\`
            ... "GET /api/products/40 HTTP/1.1" 400 5004 0.049
            \`\`\`

            Write \`latency_report(path)\` that reads the file, converts every response time to **milliseconds**, and returns a dict with:

            - \`"p50"\`, \`"p95"\`, \`"p99"\`: NumPy percentiles, rounded to 1 decimal
            - \`"slow"\`: how many requests took **more than 500 ms** (an int)
          `,
          setup: py`
            with open("mini.log", "w") as f:
                f.write('a "GET / HTTP/1.1" 200 10 0.1\n')
                f.write('b "GET / HTTP/1.1" 200 10 0.2\n')
                f.write('c "GET / HTTP/1.1" 500 10 1.5\n')
                f.write('d "GET / HTTP/1.1" 200 10 0.3\n')
          `,
          starter: py`
            import numpy as np

            def latency_report(path):
                pass
          `,
          solution: py`
            import numpy as np

            def latency_report(path):
                with open(path) as f:
                    sec = [float(ln.split()[-1]) for ln in f]
                ms = np.array(sec) * 1000
                p50, p95, p99 = np.percentile(ms, [50, 95, 99])
                return {
                    "p50": round(float(p50), 1),
                    "p95": round(float(p95), 1),
                    "p99": round(float(p99), 1),
                    "slow": int((ms > 500).sum()),
                }
          `,
          tests: [
            { call: 'latency_report("mini.log")', expect: '{"p50": 250.0, "p95": 1320.0, "p99": 1464.0, "slow": 1}', name: '4-line log' },
            { call: 'latency_report("data/server.log")', name: 'the real server log' },
            { call: 'latency_report("data/server.log")["slow"]', hidden: true },
          ],
          hints: [
            'The last whitespace-separated field is `line.split()[-1]`.',
            '`np.percentile(ms, [50, 95, 99])` returns all three at once. Count slow requests with a mask: `(ms > 500).sum()`.',
          ],
          wrong: [
            'import numpy as np\n\ndef latency_report(path):\n    with open(path) as f:\n        ms = np.array([float(l.split()[-1]) for l in f])\n    p = np.percentile(ms, [50, 95, 99])\n    return {"p50": round(float(p[0]), 1), "p95": round(float(p[1]), 1), "p99": round(float(p[2]), 1), "slow": int((ms > 500).sum())}\n',
            'import numpy as np\n\ndef latency_report(path):\n    with open(path) as f:\n        ms = np.array([float(l.split()[-1]) for l in f]) * 1000\n    p = np.percentile(ms, [50, 95, 99])\n    return {"p50": round(float(ms.mean()), 1), "p95": round(float(p[1]), 1), "p99": round(float(p[2]), 1), "slow": int((ms > 500).sum())}\n',
          ],
          explain: 'Percentiles describe the tail that real users feel: one 1.5 s request barely moves the median but dominates p99. This log has 600 lines. For a 50 GB log you would stream line by line and use an approximate quantile sketch (like t-digest), because exact percentiles need every value in memory.',
        },
        {
          type: 'code',
          title: 'The birthday problem',
          prompt: md`
            How likely is it that at least two of \`k\` people share a birthday? Simulate it.

            Write \`p_shared_birthday(k, n_trials, seed)\`:

            1. draw birthdays with \`rng.integers(0, 365, size=(n_trials, k))\`, one row per room
            2. find the rows where some day appears twice
            3. return the fraction of such rows as a float

            Tip: sort each row with \`np.sort(days, axis=1)\`. A repeat then means two **neighbours** are equal, and \`np.diff(days, axis=1)\` gives the differences between neighbours. No loops.

            \`\`\`python
            p_shared_birthday(23, 20_000, 0)  # about 0.507
            \`\`\`
          `,
          starter: py`
            import numpy as np

            def p_shared_birthday(k, n_trials, seed):
                pass
          `,
          solution: py`
            import numpy as np

            def p_shared_birthday(k, n_trials, seed):
                rng = np.random.default_rng(seed)
                days = rng.integers(0, 365, (n_trials, k))
                days = np.sort(days, axis=1)
                same = np.diff(days, axis=1) == 0
                return float(same.any(axis=1).mean())
          `,
          tests: [
            { assert: 'abs(p_shared_birthday(23, 20_000, 0) - 0.507) < 0.02', name: '23 people: about 50 %' },
            { assert: 'p_shared_birthday(1, 1000, 0) == 0', name: 'one person never shares' },
            { assert: 'abs(p_shared_birthday(50, 20_000, 1) - 0.970) < 0.01', name: '50 people: about 97 %', hidden: true },
            { assert: 'abs(p_shared_birthday(10, 20_000, 2) - 0.117) < 0.015', name: '10 people: about 12 %', hidden: true },
          ],
          forbid: ['for', 'while'],
          hints: [
            'After `np.sort(days, axis=1)`, equal birthdays sit next to each other.',
            '`(np.diff(days, axis=1) == 0).any(axis=1)` marks the rooms with a shared birthday. Take its `.mean()`.',
          ],
          wrong: [
            'import numpy as np\n\ndef p_shared_birthday(k, n_trials, seed):\n    rng = np.random.default_rng(seed)\n    days = rng.integers(0, 365, size=(n_trials, k))\n    same = np.diff(days, axis=1) == 0\n    return float(same.any(axis=1).mean())\n',
            'import numpy as np\n\ndef p_shared_birthday(k, n_trials, seed):\n    rng = np.random.default_rng(seed)\n    days = np.sort(rng.integers(0, 365, size=(n_trials, k)), axis=1)\n    same = np.diff(days, axis=1) == 0\n    return float(same.all(axis=1).mean())\n',
          ],
          explain: 'The exact answer is 1 − 365!/((365 − k)! · 365ᵏ), yet the simulation only needs arrays, a sort, a mask and an axis. Without sorting you only detect *neighbouring* equal birthdays, about 6 % instead of 51 %. Interviewers at data-heavy companies love this puzzle, and checking your formula with a quick simulation impresses them.',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u11-exam',
    title: 'NumPy Exam',
    minutes: 25,
    intro: 'Views vs copies, masks, axes, broadcasting and simulation, mixed into interview-style tasks. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          import numpy as np
          a = np.array([1, 2, 3, 4])
          b = a[a % 2 == 0]
          b[0] = 99
          print(a.tolist())
        `,
        options: ['[1, 2, 3, 4]', '[1, 99, 3, 4]', '[99, 2, 3, 4]', '[1, 2, 3, 99]'],
        answer: 0,
        checkOutput: true,
        explain: 'Boolean (and fancy) indexing returns a **copy**, so `b` is independent and `a` is unchanged. Only basic slices like `a[1:3]` are views.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          import numpy as np
          a = np.arange(6)
          v = a[1:4]
          c = a[[1, 2, 3]]
          v[0] = 10
          c[1] = 20
          print(a.tolist())
          print(v.tolist(), c.tolist())
        `,
        answer: '[0, 10, 2, 3, 4, 5]\n[10, 2, 3] [1, 20, 3]',
        explain: 'The slice `v` is a view, so `v[0] = 10` writes into `a`. Fancy indexing made `c` a copy, so `c[1] = 20` stays in `c`.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          import numpy as np
          a = np.arange(3).reshape(3, 1)
          b = np.arange(4)
          print((a * b).shape, (a * b)[2, 3])
        `,
        options: ['(3, 4) 6', '(4, 3) 6', '(3, 4) 5', '(3, 1) 6'],
        answer: 0,
        checkOutput: true,
        explain: '`(3, 1)` × `(4,)` broadcasts to `(3, 4)`: entry `[i, j]` is `i * j`, so `[2, 3]` is 6. It\'s an outer product.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          import numpy as np
          m = np.array([[1, 2, 3],
                        [6, 5, 4]])
          a = m.sum(axis=0)
          b = m.sum(axis=1, keepdims=True)
          print(a.shape, b.shape)
          print(m.argmax(axis=0).tolist(), m.argmax())
        `,
        answer: '(3,) (2, 1)\n[1, 1, 1] 3',
        explain: '`axis=0` removes the 2 rows, leaving 3. `keepdims` keeps a column of 2 row sums. Per column, row 1 holds the max every time. Without an axis, `argmax` indexes the **flattened** array: 6 is element 3.',
      },
      {
        type: 'choice',
        prompt: 'Which expression counts the values of `a` that are negative **or** above 100?',
        options: ['((a < 0) | (a > 100)).sum()', '(a < 0 | a > 100).sum()', '((a < 0) or (a > 100)).sum()', '(a < 0).sum() | (a > 100).sum()'],
        answer: 0,
        explain: 'Option 2 evaluates `0 | a` first because of precedence. Option 3 raises "truth value … is ambiguous". Option 4 combines two *counts* bitwise, e.g. 3 | 1 = 3 instead of 4.',
      },
      {
        type: 'blanks',
        prompt: 'Fill the missing values with the mean of the known values.',
        code: py`
          import numpy as np
          x = np.array([3.0, np.nan, 5.0, np.nan])
          filled = np.___(np.___(x), np.nanmean(x), x)
          print(filled.tolist())
        `,
        bank: ['where', 'isnan', 'clip', 'isna', 'nan', 'mean'],
        answer: ['where', 'isnan'],
        tests: [{ stdout: '[3.0, 4.0, 5.0, 4.0]\n' }],
        explain: '`np.isnan` builds the mask (NumPy has no `isna`, that\'s pandas). `np.where` picks the mean wherever the mask is True.',
      },
      {
        type: 'code',
        title: 'Precision and recall',
        prompt: md`
          A fraud model outputs \`y_pred\` (1 = flagged) and you know the truth \`y_true\` (1 = fraud). Both are 0/1 integer arrays.

          Write \`precision_recall(y_true, y_pred)\` returning a tuple \`(precision, recall)\`, each rounded to 3 decimals:

          - precision = TP / (TP + FP): of the flagged, how many were fraud
          - recall = TP / (TP + FN): of the fraud, how many were flagged

          If a denominator is 0, that metric is \`0.0\`. No loops.
        `,
        setup: py`
          import numpy as np
          _r = np.random.default_rng(12)
          Y = _r.integers(0, 2, 500)
          P = np.where(_r.random(500) < 0.8, Y, 1 - Y)
        `,
        starter: py`
          import numpy as np

          def precision_recall(y_true, y_pred):
              pass
        `,
        solution: py`
          import numpy as np

          def precision_recall(y_true, y_pred):
              t, p = y_true == 1, y_pred == 1
              tp = int((t & p).sum())
              fp = int((~t & p).sum())
              fn = int((t & ~p).sum())
              prec = tp / (tp + fp) if tp + fp else 0.0
              rec = tp / (tp + fn) if tp + fn else 0.0
              return (round(prec, 3), round(rec, 3))
        `,
        tests: [
          { call: 'precision_recall(np.array([1, 0, 1, 1, 0, 0]), np.array([1, 1, 0, 1, 1, 0]))', expect: '(0.5, 0.667)' },
          { call: 'precision_recall(np.array([0, 0]), np.array([0, 0]))', expect: '(0.0, 0.0)', hidden: true, name: 'nothing flagged, no fraud' },
          { call: 'precision_recall(Y, P)', hidden: true, name: '500 predictions' },
          { call: 'precision_recall(Y, np.ones(500, dtype=int))', hidden: true, name: 'flag everything' },
        ],
        forbid: ['for', 'while'],
        wrong: [
          'import numpy as np\n\ndef precision_recall(y_true, y_pred):\n    tp = ((y_true == 1) & (y_pred == 1)).sum()\n    fp = ((y_true == 0) & (y_pred == 1)).sum()\n    fn = ((y_true == 1) & (y_pred == 0)).sum()\n    p = tp / (tp + fp) if tp + fp else 0.0\n    r = tp / (tp + fn) if tp + fn else 0.0\n    return (round(float(r), 3), round(float(p), 3))\n',
          'import numpy as np\n\ndef precision_recall(y_true, y_pred):\n    tp = ((y_true == 1) & (y_pred == 1)).sum()\n    fp = ((y_true == 0) & (y_pred == 1)).sum()\n    fn = ((y_true == 1) & (y_pred == 0)).sum()\n    return (round(float(tp / (tp + fp)), 3), round(float(tp / (tp + fn)), 3))\n',
          'import numpy as np\n\ndef precision_recall(y_true, y_pred):\n    acc = round(float((y_true == y_pred).mean()), 3)\n    return (acc, acc)\n',
        ],
        explain: 'Each count is one combined mask. Precision answers "can I trust a flag?", recall answers "how much fraud do we catch?". On imbalanced data, accuracy is misleading: flagging nothing is 99 % accurate when fraud is 1 %.',
      },
      {
        type: 'code',
        title: 'Impute, then min-max scale',
        prompt: md`
          \`X\` is a 2-D float array (rows = customers, columns = features) with some \`nan\` values. Write \`prepare(X)\` that:

          1. replaces every \`nan\` with the **mean of its column** (ignoring NaNs)
          2. then min-max scales each column to [0, 1]: \`(x - col_min) / (col_max - col_min)\`
          3. rounds to 3 decimals

          Don't modify \`X\` itself. Every column has at least two different non-NaN values.
        `,
        setup: py`
          import numpy as np
          _r = np.random.default_rng(21)
          R = _r.normal(50, 10, (40, 4))
          R[_r.random((40, 4)) < 0.1] = np.nan
        `,
        starter: py`
          import numpy as np

          def prepare(X):
              pass
        `,
        solution: py`
          import numpy as np

          def prepare(X):
              mu = np.nanmean(X, axis=0)
              F = np.where(np.isnan(X), mu, X)
              lo = F.min(axis=0)
              hi = F.max(axis=0)
              return np.round((F - lo) / (hi - lo), 3)
        `,
        tests: [
          { call: 'prepare(np.array([[1., 10.], [np.nan, 20.], [3., np.nan]]))', expect: 'np.array([[0., 0.], [0.5, 1.], [1., 0.5]])' },
          { call: 'prepare(R)', hidden: true, name: '40 × 4 with 10 % missing' },
          { code: 'A = np.array([[1., np.nan], [3., 4.], [5., 0.]])\nprepare(A)\nassert np.isnan(A[0, 1])', name: 'does not modify X', hidden: true },
        ],
        wrong: [
          'import numpy as np\n\ndef prepare(X):\n    mu = np.nanmean(X, axis=0)\n    for j in range(X.shape[1]):\n        X[np.isnan(X[:, j]), j] = mu[j]\n    lo, hi = X.min(axis=0), X.max(axis=0)\n    return np.round((X - lo) / (hi - lo), 3)\n',
          'import numpy as np\n\ndef prepare(X):\n    F = np.where(np.isnan(X), np.nanmean(X), X)\n    lo, hi = F.min(axis=0), F.max(axis=0)\n    return np.round((F - lo) / (hi - lo), 3)\n',
          'import numpy as np\n\ndef prepare(X):\n    F = np.nan_to_num(X)\n    lo, hi = F.min(axis=0), F.max(axis=0)\n    return np.round((F - lo) / (hi - lo), 3)\n',
        ],
        explain: '`np.nanmean(X, axis=0)` gives one mean per column, and `np.where(np.isnan(X), mu, X)` broadcasts it into the holes and returns a **new** array. Writing into `X` would corrupt the caller\'s data, a real bug in feature pipelines that get run twice.',
      },
      {
        type: 'code',
        title: 'Distance matrix',
        prompt: md`
          \`P\` is an \`(n, d)\` array: n points in d dimensions. Write \`distances(P)\` returning the \`(n, n)\` matrix of Euclidean distances, where entry \`[i, j]\` is the distance between point i and point j, rounded to 3 decimals. Use broadcasting, no loops.

          Shape hint: \`P[:, None, :] - P[None, :, :]\` has shape \`(n, n, d)\`.
        `,
        setup: py`
          import numpy as np
          Q = np.random.default_rng(5).uniform(-5, 5, (8, 3))
        `,
        starter: py`
          import numpy as np

          def distances(P):
              pass
        `,
        solution: py`
          import numpy as np

          def distances(P):
              diff = P[:, None, :] - P[None, :, :]
              d = np.sqrt((diff ** 2).sum(axis=2))
              return np.round(d, 3)
        `,
        tests: [
          { call: 'distances(np.array([[0., 0.], [3., 4.]]))', expect: 'np.array([[0., 5.], [5., 0.]])' },
          { call: 'distances(np.array([[1., 2., 3.]]))', expect: 'np.array([[0.]])', hidden: true, name: 'a single point' },
          { call: 'distances(Q)', hidden: true, name: '8 points in 3-D' },
          { assert: 'np.allclose(distances(Q), distances(Q).T)', name: 'symmetric', hidden: true },
        ],
        forbid: ['for', 'while'],
        wrong: [
          'import numpy as np\n\ndef distances(P):\n    diff = P[:, None, :] - P[None, :, :]\n    return np.round((diff ** 2).sum(axis=2), 3)\n',
          'import numpy as np\n\ndef distances(P):\n    diff = P[:, None, :] - P[None, :, :]\n    return np.round(np.abs(diff).sum(axis=2), 3)\n',
          'import numpy as np\n\ndef distances(P):\n    diff = P[:, None, :] - P[None, :, :]\n    return np.round(np.sqrt((diff ** 2).sum(axis=1)), 3)\n',
        ],
        explain: 'Broadcasting `(n, 1, d)` against `(1, n, d)` builds every pairwise difference at once. Summing the squares over the last axis and taking the root gives the distances. This is the core of k-nearest-neighbours. Memory grows like n²·d, so for big n you work in chunks or use the identity ‖a − b‖² = ‖a‖² + ‖b‖² − 2a·b.',
      },
      {
        type: 'code',
        kind: 'fix',
        title: 'Fix the conversion simulation',
        prompt: md`
          \`p_at_least(k, n, p, trials, seed)\` should estimate the probability of **at least \`k\`** successes in \`n\` independent tries that each succeed with probability \`p\`. It simulates \`trials\` experiments, one row each.

          The answers are clearly wrong. Find and fix the bugs.
        `,
        starter: py`
          import numpy as np

          def p_at_least(k, n, p, trials, seed):
              rng = np.random.default_rng(seed)
              hits = rng.random((trials, n)) < p
              wins = hits.sum(axis=0) > k
              return float(wins.mean())
        `,
        solution: py`
          import numpy as np

          def p_at_least(k, n, p, trials, seed):
              rng = np.random.default_rng(seed)
              hits = rng.random((trials, n)) < p
              wins = hits.sum(axis=1) >= k
              return float(wins.mean())
        `,
        tests: [
          { assert: 'abs(p_at_least(3, 10, 0.2, 50_000, 0) - 0.322) < 0.015', name: 'P(at least 3 of 10 at p = 0.2) ≈ 0.322' },
          { assert: 'abs(p_at_least(1, 5, 0.5, 50_000, 1) - 0.969) < 0.01', name: 'P(at least 1 of 5 at p = 0.5) ≈ 0.969', hidden: true },
          { assert: 'p_at_least(0, 4, 0.3, 1000, 2) == 1.0', name: 'at least 0 is certain', hidden: true },
          { assert: 'abs(p_at_least(5, 5, 0.5, 50_000, 3) - 0.03125) < 0.006', name: 'all 5 of 5 ≈ 0.031', hidden: true },
        ],
        wrong: [
          'import numpy as np\n\ndef p_at_least(k, n, p, trials, seed):\n    rng = np.random.default_rng(seed)\n    hits = rng.random((trials, n)) < p\n    wins = hits.sum(axis=1) > k\n    return float(wins.mean())\n',
          'import numpy as np\n\ndef p_at_least(k, n, p, trials, seed):\n    rng = np.random.default_rng(seed)\n    hits = rng.random((trials, n)) < p\n    wins = hits.sum(axis=0) >= k\n    return float(wins.mean())\n',
        ],
        explain: 'Two bugs. `axis=0` summed each *try* across all experiments, instead of each experiment across its tries, so it needs `axis=1`. And "at least k" means `>= k`, not `> k`. Sanity checks like k = 0 → 1.0 catch this kind of bug fast. (`rng.binomial(n, p, trials)` would draw the success counts directly.)',
      },
    ],
  },
};

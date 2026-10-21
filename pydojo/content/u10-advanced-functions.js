// Unit 10 — Advanced Functions.
import { py, md } from './helpers.js';

export default {
  id: 'u10',
  order: 10,
  track: 'foundations',
  title: 'Advanced Functions',
  subtitle: 'recursion, memo, generators, decorators',
  icon: '🧠',
  color: '#A855F7',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u10-l1',
      title: 'Recursion',
      summary: 'Solve a problem by solving a smaller copy of it.',
      steps: [
        {
          type: 'learn',
          title: 'A function that calls itself',
          body: md`
            A **recursive** function solves a problem by calling itself on a *smaller* version of it. Every one needs two parts:

            - a **base case**: an input small enough to answer directly. It stops the recursion.
            - a **recursive case**: shrink the input, call yourself, combine the result.

            The trick is to *trust* the recursive call ("assume \`factorial(n - 1)\` already works") and think about one step only.
          `,
          code: py`
            def factorial(n):
                if n <= 1:            # base case
                    return 1
                return n * factorial(n - 1)

            print(factorial(5))
            print(factorial(20))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def digit_sum(n):
                if n < 10:
                    return n
                return n % 10 + digit_sum(n // 10)

            print(digit_sum(4096))
          `,
          options: ['19', '4096', '6', '10'],
          answer: 0,
          checkOutput: true,
          explain: '`n % 10` peels off the last digit and `n // 10` drops it: 6 + digit_sum(409) → 9 + digit_sum(40) → 0 + digit_sum(4) → 4 (base case). Total 6 + 9 + 0 + 4 = 19.',
        },
        {
          type: 'learn',
          title: 'The call stack',
          body: md`
            Each call gets its own **frame** with its own local variables, stacked on top of its caller. Nothing returns until a base case is reached. Then the frames finish one by one in **reverse** order, and any code *after* the recursive call runs on the way back up.

            Python caps the stack at about 1000 frames and raises \`RecursionError\` beyond that. The cause is usually a missing or unreachable base case, or input too deep for recursion (use a loop then).
          `,
          code: py`
            def depth(n, pad=""):
                print(pad + f"depth({n}) called")
                if n == 0:
                    result = 0
                else:
                    result = 1 + depth(n - 1, pad + "  ")
                print(pad + f"depth({n}) returns {result}")
                return result

            depth(2)
          `,
        },
        {
          type: 'output',
          prompt: 'Trace the stack. What does this print?',
          code: py`
            def show(n):
                if n == 0:
                    return
                print("in", n)
                show(n - 1)
                print("out", n)

            show(2)
          `,
          answer: 'in 2\nin 1\nout 1\nout 2',
          explain: '`show(2)` prints "in 2" and then waits inside `show(1)`, which prints "in 1" and waits inside `show(0)`, which returns at once. Now the frames unwind: `show(1)` finishes with "out 1", then `show(2)` with "out 2".',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            def countdown(n):
                if n == 0:
                    return "liftoff"
                return countdown(n - 2)

            print(countdown(5))
          `,
          options: ['RecursionError: maximum recursion depth exceeded', 'liftoff', 'None', '-1'],
          answer: 0,
          checkOutput: true,
          explain: '5 → 3 → 1 → -1 → -3 … jumps right over 0, so the base case is never reached. A safer base case is `if n <= 0:`. Always ask: does *every* input eventually reach a base case?',
        },
        {
          type: 'blanks',
          prompt: 'Complete the recursive power function.',
          code: py`
            def power(base, exp):
                if exp == ___:
                    return 1
                return base * ___(base, exp - 1)
          `,
          bank: ['0', 'power', '1', 'base', 'exp', 'return'],
          answer: ['0', 'power'],
          tests: [
            { call: 'power(2, 10)', expect: '1024' },
            { call: 'power(7, 0)', expect: '1' },
          ],
          explain: 'Anything to the power 0 is 1, which is the base case. Each recursive call lowers `exp` by one until it hits 0. With `exp == 1` as the base case, `power(7, 0)` would count down forever (-1, -2, …).',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines into a recursive sum that prints `15`.',
          lines: [
            'def total(nums):',
            '    if not nums:',
            '        return 0',
            '    first, *rest = nums',
            '    return first + total(rest)',
            'print(total([4, 5, 6]))',
          ],
          distractors: ['    return first + total(nums)', '        return nums'],
          tests: [{ stdout: '15\n' }],
          explain: 'The empty-list check must come first: unpacking `first, *rest = []` would raise. `total(rest)` shrinks the problem by one element each time. `total(nums)` would recurse on the same list forever.',
        },
        {
          type: 'learn',
          title: 'Strings and nested data',
          body: md`
            Strings and lists shrink nicely: handle the first element, recurse on the rest (\`s[1:]\`). Each slice copies, so that's O(n²) in total: fine for learning, but use indexes or a loop for long inputs.

            Recursion really shines on **nested** data (JSON, folder trees, org charts), where you don't know the depth in advance. Check \`isinstance(x, list)\`: if it's a container, recurse into each item. Otherwise it's a leaf.
          `,
          code: py`
            def count_leaves(x):
                if not isinstance(x, list):
                    return 1                 # a leaf
                return sum(count_leaves(i) for i in x)

            print(count_leaves([1, [2, 3], [[4], []], 5]))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def rev(s):
                if len(s) <= 1:
                    return s
                return rev(s[1:]) + s[0]

            print(rev("stressed"))
          `,
          answer: 'desserts',
          explain: 'The first character goes to the *end* of the reversed rest: rev("stressed") = rev("tressed") + "s", and so on down to a single character.',
        },
        {
          type: 'code',
          title: 'Recursive palindrome',
          prompt: md`
            Unit 4 checked palindromes with slicing. Now write a **recursive** \`is_palindrome(s)\`: \`True\` if \`s\` reads the same backwards, **ignoring case**. Empty and one-character strings are palindromes.

            Compare the first and last character, then recurse on what's between them. Don't use \`[::-1]\`.

            \`\`\`python
            is_palindrome("Racecar")   # True
            is_palindrome("abca")      # False
            \`\`\`
          `,
          starter: py`
            def is_palindrome(s):
                pass
          `,
          solution: py`
            def is_palindrome(s):
                s = s.lower()
                if len(s) <= 1:
                    return True
                if s[0] != s[-1]:
                    return False
                return is_palindrome(s[1:-1])
          `,
          tests: [
            { call: 'is_palindrome("level")', expect: 'True' },
            { call: 'is_palindrome("Racecar")', expect: 'True' },
            { call: 'is_palindrome("ab")', expect: 'False' },
            { call: 'is_palindrome("")', expect: 'True' },
            { call: 'is_palindrome("a")', expect: 'True', hidden: true },
            { call: 'is_palindrome("abca")', expect: 'False', hidden: true },
            { call: 'is_palindrome("Noon")', expect: 'True', hidden: true },
            { call: 'is_palindrome("abcdcbaX")', expect: 'False', hidden: true },
          ],
          require: ['recursion'],
          hints: [
            'Base case: `len(s) <= 1` means `True`.',
            'If `s[0] != s[-1]` you can return `False` right away.',
            '`s[1:-1]` drops the first and last character. Lower-case the string first.',
          ],
          wrong: [
            py`
              def is_palindrome(s):
                  if len(s) <= 1:
                      return True
                  if s[0] != s[-1]:
                      return False
                  return is_palindrome(s[1:-1])
            `,
            py`
              def is_palindrome(s):
                  s = s.lower()
                  if len(s) <= 1:
                      return True
                  return s[0] == s[-1]
            `,
            py`
              def is_palindrome(s):
                  s = s.lower()
                  if len(s) == 1:
                      return True
                  if s[0] != s[-1]:
                      return False
                  return is_palindrome(s[1:-1])
            `,
          ],
          explain: md`
            Two base cases hide in \`len(s) <= 1\`: even-length strings shrink to \`""\` and odd-length ones to one character. Checking only \`== 1\` crashes on even lengths. The early \`return False\` stops as soon as one pair differs. In an interview, also mention the two-pointer loop: same idea, O(1) extra memory and no slicing.
          `,
        },
        {
          type: 'code',
          title: 'Flatten nested lists',
          prompt: md`
            Write \`flatten(items)\`, which returns a flat list of all the values in a list nested to **any depth**. Only lists are flattened. Strings, tuples and numbers are kept as they are.

            \`\`\`python
            flatten([1, [2, [3, [4]]], 5])   # [1, 2, 3, 4, 5]
            flatten(["ab", [("x", 1)]])      # ["ab", ("x", 1)]
            \`\`\`
          `,
          starter: py`
            def flatten(items):
                pass
          `,
          solution: py`
            def flatten(items):
                out = []
                for x in items:
                    if isinstance(x, list):
                        out.extend(flatten(x))
                    else:
                        out.append(x)
                return out
          `,
          tests: [
            { call: 'flatten([1, [2, [3, [4]]], 5])', expect: '[1, 2, 3, 4, 5]' },
            { call: 'flatten([])', expect: '[]' },
            { call: 'flatten([[[]], []])', expect: '[]' },
            { call: 'flatten(["ab", [("x", 1)]])', expect: '["ab", ("x", 1)]', hidden: true },
            { call: 'flatten([[1, 2], [3, [4, [5, [6]]]], 7])', expect: '[1, 2, 3, 4, 5, 6, 7]', hidden: true },
            { code: 'deep = [0]\nfor i in range(1, 200):\n    deep = [deep, i]\nassert flatten(deep) == list(range(200))', name: '200 levels deep', hidden: true },
          ],
          require: ['recursion'],
          hints: [
            'Loop over the items. A list needs flattening, anything else is a value.',
            'For a nested list, `out.extend(flatten(x))`.',
            'Use `isinstance(x, list)`: strings are iterable too, so "is it iterable?" is the wrong test.',
          ],
          wrong: [
            py`
              def flatten(items):
                  out = []
                  for x in items:
                      if isinstance(x, list):
                          out.extend(x)
                      else:
                          out.append(x)
                  return out
            `,
            py`
              def flatten(items):
                  out = []
                  for x in items:
                      if hasattr(x, "__iter__"):
                          out.extend(flatten(x))
                      else:
                          out.append(x)
                  return out
            `,
          ],
          explain: md`
            Each recursive call flattens one sub-list completely, and \`extend\` splices the result in. Testing "is it iterable?" recurses into strings, and a one-character string iterates to itself, so it recurses forever. Flattening nested JSON is a common pre-processing step before loading data into a table.
          `,
        },
        {
          type: 'code',
          title: 'Fast power',
          prompt: md`
            Write a **recursive** \`fast_power(x, n)\` for any integer \`n\` (also negative) **without** \`**\` or \`pow\`. It must take O(log n) steps, not n:

            - xⁿ = (x^(n//2))² when n is even
            - xⁿ = (x^(n//2))² · x when n is odd
            - x⁻ⁿ = 1 / xⁿ

            \`\`\`python
            fast_power(2, 10)   # 1024
            fast_power(2, -2)   # 0.25
            \`\`\`
          `,
          starter: py`
            def fast_power(x, n):
                pass
          `,
          solution: py`
            def fast_power(x, n):
                if n < 0:
                    return 1 / fast_power(x, -n)
                if n == 0:
                    return 1
                half = fast_power(x, n // 2)
                if n % 2 == 0:
                    return half * half
                return half * half * x
          `,
          tests: [
            { call: 'fast_power(2, 10)', expect: '1024' },
            { call: 'fast_power(3, 0)', expect: '1' },
            { call: 'fast_power(2, -2)', expect: '0.25' },
            { call: 'fast_power(5, 3)', expect: '125', hidden: true },
            { call: 'fast_power(2, 1000) == 2 ** 1000', expect: 'True', hidden: true, name: 'n = 1000 (too deep for n steps)' },
            { call: 'fast_power(1.0000001, 10 ** 6)', hidden: true, name: 'n = 1,000,000' },
          ],
          require: ['recursion'],
          forbid: ['pow'],
          hints: [
            'Compute `half = fast_power(x, n // 2)` **once** and reuse it.',
            'Even n: `half * half`. Odd n: `half * half * x`.',
            'Handle `n < 0` first: `return 1 / fast_power(x, -n)`.',
          ],
          wrong: [
            py`
              def fast_power(x, n):
                  if n < 0:
                      return 1 / fast_power(x, -n)
                  if n == 0:
                      return 1
                  return x * fast_power(x, n - 1)
            `,
            py`
              def fast_power(x, n):
                  if n == 0:
                      return 1
                  half = fast_power(x, n // 2)
                  if n % 2 == 0:
                      return half * half
                  return half * half * x
            `,
          ],
          explain: md`
            Halving \`n\` each call means only about log₂(n) frames: 20 for a million, against a million frames (and a \`RecursionError\`) for the one-step-at-a-time version. Calling \`fast_power(x, n // 2)\` *twice* instead of storing \`half\` would bring back O(n) work. This "exponentiation by squaring" is LeetCode 50 and the core of modular exponentiation in cryptography.
          `,
        },
        {
          type: 'code',
          title: 'Disk usage of a folder tree',
          prompt: md`
            A folder is a dict: a file name maps to its size in bytes, a sub-folder name maps to another dict. Write \`du(tree)\`, which returns the **total size of every folder**, keyed by path: \`"."\` for the root, then paths like \`"src"\` and \`"src/lib"\`.

            \`\`\`python
            tree = {"a.txt": 10,
                    "src": {"b.py": 5, "lib": {"c.py": 7}},
                    "empty": {}}
            du(tree)
            # {".": 22, "src": 12, "src/lib": 7, "empty": 0}
            \`\`\`
          `,
          starter: py`
            def du(tree):
                pass
          `,
          solution: py`
            def join(path, name):
                if path == ".":
                    return name
                return f"{path}/{name}"

            def du(tree, path="."):
                totals = {path: 0}
                for name, v in tree.items():
                    if isinstance(v, dict):
                        sub = join(path, name)
                        totals.update(du(v, sub))
                        totals[path] += totals[sub]
                    else:
                        totals[path] += v
                return totals
          `,
          tests: [
            { call: 'du({"a.txt": 10, "src": {"b.py": 5, "lib": {"c.py": 7}}, "empty": {}})', expect: '{".": 22, "src": 12, "src/lib": 7, "empty": 0}' },
            { call: 'du({})', expect: '{".": 0}' },
            { call: 'du({"x": 1, "y": 2})', expect: '{".": 3}' },
            { call: 'du({"a": {"b": {"c": {"f": 4}}}, "g": 1})', expect: '{".": 5, "a": 4, "a/b": 4, "a/b/c": 4}', hidden: true },
            { call: 'du({"docs": {"x.md": 3}, "img": {"y.png": 40, "raw": {}}})', expect: '{".": 43, "docs": 3, "img": 40, "img/raw": 0}', hidden: true },
          ],
          require: ['recursion'],
          hints: [
            'Start each folder\'s result with `{path: 0}` and add file sizes to it.',
            'For a sub-folder, recurse with its full path, merge the returned dict, then add the sub-folder\'s total to the current folder.',
            'The root\'s children have no `"./"` prefix: `"src"`, not `"./src"`.',
          ],
          wrong: [
            py`
              def du(tree, path="."):
                  totals = {path: 0}
                  for name, v in tree.items():
                      if isinstance(v, dict):
                          sub = f"{path}/{name}"
                          totals.update(du(v, sub))
                          totals[path] += totals[sub]
                      else:
                          totals[path] += v
                  return totals
            `,
            py`
              def join(path, name):
                  if path == ".":
                      return name
                  return f"{path}/{name}"

              def du(tree, path="."):
                  totals = {path: 0}
                  for name, v in tree.items():
                      if isinstance(v, dict):
                          sub = join(path, name)
                          totals.update(du(v, sub))
                      else:
                          totals[path] += v
                  return totals
            `,
          ],
          explain: md`
            Each call returns the totals for its whole subtree, and the parent adds the child's total to its own. Information flows **up** the recursion. This is a post-order traversal, the same shape as \`du -s\`, computing an org chart's head count, or summing a nested JSON budget. You'll meet it again with trees in Unit 17.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u10-l2',
      title: 'Memoization',
      summary: 'Remember answers so recursion stops repeating itself: a first taste of dynamic programming.',
      steps: [
        {
          type: 'learn',
          title: 'Naive Fibonacci explodes',
          body: md`
            \`fib(n) = fib(n - 1) + fib(n - 2)\` turns directly into recursion. But every call spawns two more, and the same values are recomputed again and again: \`fib(3)\` alone is computed thousands of times inside \`fib(20)\`.

            The number of calls grows like 1.6ⁿ: **exponential** time. \`fib(30)\` makes 2.7 million calls, and \`fib(50)\` would need about 40 billion.
          `,
          code: py`
            calls = 0

            def fib(n):
                global calls
                calls += 1
                if n < 2:
                    return n
                return fib(n - 1) + fib(n - 2)

            print(fib(20), calls)
          `,
        },
        {
          type: 'choice',
          prompt: 'How many calls does `fib(5)` make?',
          code: py`
            calls = 0

            def fib(n):
                global calls
                calls += 1
                if n < 2:
                    return n
                return fib(n - 1) + fib(n - 2)

            fib(5)
            print(calls)
          `,
          options: ['15', '5', '8', '31'],
          answer: 0,
          checkOutput: true,
          explain: 'calls(n) = 1 + calls(n − 1) + calls(n − 2), with 1 call for n = 0 or 1. So 1, 1, 3, 5, 9, **15**. The call count itself grows like Fibonacci numbers.',
        },
        {
          type: 'learn',
          title: 'A memo dict',
          body: md`
            **Memoization**: store each answer the first time you compute it, and check the store before doing any work. Now each \`n\` is computed once, so \`fib(n)\` takes O(n) time and O(n) memory instead of O(1.6ⁿ).

            Recursion plus a cache is **top-down dynamic programming**, the idea behind a big share of DP interview questions. The \`memo=None\` default avoids the shared-mutable-default trap.
          `,
          code: py`
            def fib(n, memo=None):
                if memo is None:
                    memo = {}
                if n in memo:
                    return memo[n]
                if n < 2:
                    return n
                a = fib(n - 1, memo)
                b = fib(n - 2, memo)
                memo[n] = a + b
                return memo[n]

            print(fib(90))
          `,
        },
        {
          type: 'output',
          prompt: 'When is the memo used? What does this print?',
          code: py`
            memo = {}

            def f(n):
                if n in memo:
                    print("hit", n)
                    return memo[n]
                if n < 2:
                    return n
                memo[n] = f(n - 1) + f(n - 2)
                return memo[n]

            print(f(4))
          `,
          answer: 'hit 2\n3',
          explain: '`f(4)` calls `f(3)` first, which computes `f(2)` (storing it) and `f(1)`. Back in `f(4)`, the second call `f(2)` finds the stored value: the only hit. Base cases 0 and 1 are never stored, so they never "hit".',
        },
        {
          type: 'blanks',
          prompt: 'Complete the memoized stair-climbing count (1 or 2 steps at a time).',
          code: py`
            def ways(n, memo):
                if n <= 1:
                    return 1
                if n ___ memo:
                    return memo[n]
                a = ways(n - 1, memo)
                b = ways(n - 2, memo)
                memo[n] = a + b
                ___ memo[n]
          `,
          bank: ['in', 'return', 'not in', 'yield', 'print', '=='],
          answer: ['in', 'return'],
          tests: [
            { call: 'ways(10, {})', expect: '89' },
            { call: 'ways(50, {})', expect: '20365011074', name: 'n = 50 is instant' },
          ],
          explain: 'Check the memo first (`n in memo`), compute on a miss, store, and **return** the stored value. `not in` would read `memo[n]` exactly when it doesn\'t exist.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the useless memo',
          prompt: md`
            \`tilings(n)\` counts the ways to tile a 2 × n strip with 1 × 2 dominoes. It gives correct answers, but \`tilings(32)\` takes seconds, and the memo isn't helping at all. Find the bug and make it fast.
          `,
          starter: py`
            def tilings(n, memo=None):
                memo = {}
                if n <= 1:
                    return 1
                if n in memo:
                    return memo[n]
                a = tilings(n - 1, memo)
                b = tilings(n - 2, memo)
                memo[n] = a + b
                return memo[n]
          `,
          solution: py`
            def tilings(n, memo=None):
                if memo is None:
                    memo = {}
                if n <= 1:
                    return 1
                if n in memo:
                    return memo[n]
                a = tilings(n - 1, memo)
                b = tilings(n - 2, memo)
                memo[n] = a + b
                return memo[n]
          `,
          tests: [
            { call: 'tilings(10)', expect: '89' },
            { call: 'tilings(0)', expect: '1' },
            { call: 'tilings(32)', expect: '3524578', maxMs: 50, name: 'tilings(32) is fast' },
            { call: 'tilings(2)', expect: '2', hidden: true },
          ],
          hints: [
            'Every call runs `memo = {}`. What does that do to the memo passed in by the caller?',
            'Only create a new dict when none was passed: `if memo is None: memo = {}`.',
          ],
          wrong: [py`
            def tilings(n, memo={}):
                memo = {}
                if n <= 1:
                    return 1
                if n in memo:
                    return memo[n]
                a = tilings(n - 1, memo)
                b = tilings(n - 2, memo)
                memo[n] = a + b
                return memo[n]
          `],
          explain: md`
            \`memo = {}\` on every call throws away the dict the caller passed in, so every call starts with an empty memo and nothing is ever reused. The answers stay right while the speed stays exponential. That's why performance bugs are sneaky: always test caching with a timing check or a call counter, not just correct outputs.
          `,
        },
        {
          type: 'learn',
          title: 'functools.cache and lru_cache',
          body: md`
            The standard library memoizes for you. Put \`@cache\` above a function (unbounded), or \`@lru_cache(maxsize=1024)\` to keep only the most recent results: the LRU cache from Unit 9. The \`@\` line is a **decorator**, and lesson 5 shows how they work.

            The arguments become dict keys, so they must be **hashable**: pass tuples, not lists. \`f.cache_info()\` reports hits and misses.
          `,
          code: py`
            from functools import cache

            @cache
            def fib(n):
                if n < 2:
                    return n
                return fib(n - 1) + fib(n - 2)

            print(fib(100))
            print(fib.cache_info())
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            from functools import cache

            @cache
            def total(prices):
                return sum(prices)

            print(total([1, 2, 3]))
          `,
          options: ["TypeError: unhashable type: 'list'", '6', "TypeError: 'list' object is not callable", 'None'],
          answer: 0,
          checkOutput: true,
          explain: 'The cache stores results in a dict keyed by the arguments, and a list can\'t be a dict key because it could change after being stored. Call `total((1, 2, 3))` with a tuple instead.',
        },
        {
          type: 'code',
          title: 'Climbing stairs',
          prompt: md`
            You climb \`n\` stairs, taking any step size from the tuple \`steps\` each time. Write \`climb(n, steps=(1, 2))\`, which returns the number of distinct ways to reach the top exactly. Make it fast with \`functools.cache\`.

            \`\`\`python
            climb(4)              # 5
            climb(4, (1, 2, 3))   # 7
            climb(3, (2,))        # 0
            \`\`\`
          `,
          starter: py`
            from functools import cache

            def climb(n, steps=(1, 2)):
                pass
          `,
          solution: py`
            from functools import cache

            @cache
            def climb(n, steps=(1, 2)):
                if n == 0:
                    return 1
                if n < 0:
                    return 0
                return sum(climb(n - s, steps) for s in steps)
          `,
          tests: [
            { call: 'climb(4)', expect: '5' },
            { call: 'climb(4, (1, 2, 3))', expect: '7' },
            { call: 'climb(0)', expect: '1' },
            { call: 'climb(3, (2,))', expect: '0', hidden: true },
            { call: 'climb(30)', expect: '1346269', maxMs: 50, hidden: true, name: 'climb(30) is fast' },
            { call: 'climb(25, (1, 3, 5))', hidden: true },
          ],
          hints: [
            'The last step was one of `steps`, so ways(n) = sum of ways(n − s).',
            'Base cases: exactly at the top (n == 0) is 1 way, overshooting (n < 0) is 0.',
            'Put `@cache` on the line above `def climb`.',
          ],
          wrong: [
            py`
              def climb(n, steps=(1, 2)):
                  if n == 0:
                      return 1
                  if n < 0:
                      return 0
                  return sum(climb(n - s, steps) for s in steps)
            `,
            py`
              from functools import cache

              @cache
              def climb(n, steps=(1, 2)):
                  if n <= 1:
                      return 1
                  return sum(climb(n - s, steps) for s in steps)
            `,
          ],
          explain: md`
            With 1-or-2 steps this is Fibonacci again (LeetCode 70). Generalising to any \`steps\` shows the real DP pattern: **the answer for n is a combination of answers for smaller n**. There are n + 1 distinct states, each computed once, so it's O(n · len(steps)). The default tuple \`(1, 2)\` is part of the cache key, which is why it must be hashable.
          `,
        },
        {
          type: 'learn',
          title: 'Thinking in subproblems',
          body: md`
            The dynamic programming recipe:

            1. **State**: what one subproblem is, e.g. \`paths(r, c)\` = ways to reach cell (r, c) moving only right or down.
            2. **Recurrence**: combine smaller states: from above + from the left.
            3. **Base cases**: the first row and the first column have exactly one path.
            4. **Memoize** (top-down), or fill a table with a loop (**bottom-up**, which has no recursion limit).
          `,
          code: py`
            from functools import cache

            def grid_paths(rows, cols):
                @cache
                def paths(r, c):
                    if r == 0 or c == 0:
                        return 1
                    return paths(r - 1, c) + paths(r, c - 1)
                return paths(rows - 1, cols - 1)

            print(grid_paths(3, 3), grid_paths(10, 10))
          `,
        },
        {
          type: 'output',
          prompt: 'The same Fibonacci, bottom-up. What does this print?',
          code: py`
            n = 6
            table = [0] * (n + 1)
            table[1] = 1
            for i in range(2, n + 1):
                table[i] = table[i - 1] + table[i - 2]
            print(table)
          `,
          answer: '[0, 1, 1, 2, 3, 5, 8]',
          explain: 'Bottom-up DP fills the table from the base cases upward, so every value it needs is already there. No recursion and no stack limit, and you can often keep just the last two values for O(1) memory.',
        },
        {
          type: 'code',
          title: 'Grid paths with obstacles',
          prompt: md`
            A grid is a list of equal-length strings: \`"."\` is open, \`"#"\` is blocked. Moving only **right** or **down**, count the paths from the top-left to the bottom-right cell. A blocked start or end means 0.

            \`\`\`python
            paths(["...",
                   ".#.",
                   "..."])   # 2
            \`\`\`
          `,
          starter: py`
            from functools import cache

            def paths(grid):
                pass
          `,
          solution: py`
            from functools import cache

            def paths(grid):
                rows, cols = len(grid), len(grid[0])

                @cache
                def go(r, c):
                    if r >= rows or c >= cols:
                        return 0
                    if grid[r][c] == "#":
                        return 0
                    if (r, c) == (rows - 1, cols - 1):
                        return 1
                    return go(r + 1, c) + go(r, c + 1)

                return go(0, 0)
          `,
          tests: [
            { call: 'paths(["...", "...", "..."])', expect: '6' },
            { call: 'paths(["...", ".#.", "..."])', expect: '2' },
            { call: 'paths(["#.."])', expect: '0' },
            { call: 'paths(["."])', expect: '1' },
            { call: 'paths(["..", "#."])', expect: '1', hidden: true },
            { call: 'paths(["..", ".#"])', expect: '0', hidden: true, name: 'blocked end' },
            { call: 'paths(["." * 12] * 12)', expect: '705432', maxMs: 30, hidden: true, name: '12 × 12 open grid is fast' },
            { call: 'paths(["....#", "#....", "..#..", "....."])', hidden: true },
          ],
          hints: [
            'Define a helper `go(r, c)`: the number of paths from (r, c) to the goal.',
            'Off the grid or on `#` → 0. At the goal → 1. Otherwise `go(r + 1, c) + go(r, c + 1)`.',
            'Decorate the inner helper with `@cache`. It sees `grid` through the closure.',
          ],
          wrong: [
            py`
              def paths(grid):
                  rows, cols = len(grid), len(grid[0])

                  def go(r, c):
                      if r >= rows or c >= cols:
                          return 0
                      if grid[r][c] == "#":
                          return 0
                      if (r, c) == (rows - 1, cols - 1):
                          return 1
                      return go(r + 1, c) + go(r, c + 1)

                  return go(0, 0)
            `,
            py`
              from functools import cache

              def paths(grid):
                  rows, cols = len(grid), len(grid[0])

                  @cache
                  def go(r, c):
                      if r >= rows or c >= cols:
                          return 0
                      if (r, c) == (rows - 1, cols - 1):
                          return 1
                      if grid[r][c] == "#":
                          return 0
                      return go(r + 1, c) + go(r, c + 1)

                  return go(0, 0)
            `,
          ],
          explain: md`
            There are only rows × cols states, so the memoized version is O(rows · cols), while the uncached one revisits cells exponentially often. Caching an **inner** function is a neat trick: the grid is captured by the closure, and the cache only lives for one call to \`paths\`, so different grids never mix. Check walls *before* the goal, or a blocked goal counts as a path. This is LeetCode 63.
          `,
        },
        {
          type: 'code',
          title: 'Fewest coins',
          prompt: md`
            Write \`min_coins(amount, coins)\`: the **fewest** coins (any number of each value in the tuple \`coins\`) that add up to \`amount\` exactly, or \`-1\` if it's impossible.

            Careful: the greedy "always take the biggest coin" is **wrong**. For \`amount=6, coins=(1, 3, 4)\` it gives 4 + 1 + 1 (3 coins), but 3 + 3 is 2.

            \`\`\`python
            min_coins(11, (1, 2, 5))   # 3  (5 + 5 + 1)
            min_coins(3, (2,))         # -1
            \`\`\`
          `,
          starter: py`
            from functools import cache

            def min_coins(amount, coins):
                pass
          `,
          solution: py`
            from functools import cache

            def min_coins(amount, coins):
                @cache
                def best(a):
                    if a == 0:
                        return 0
                    if a < 0:
                        return float("inf")
                    return 1 + min(best(a - c) for c in coins)

                result = best(amount)
                if result == float("inf"):
                    return -1
                return result
          `,
          tests: [
            { call: 'min_coins(11, (1, 2, 5))', expect: '3' },
            { call: 'min_coins(6, (1, 3, 4))', expect: '2', name: 'greedy would say 3' },
            { call: 'min_coins(3, (2,))', expect: '-1' },
            { call: 'min_coins(0, (1,))', expect: '0' },
            { call: 'min_coins(63, (1, 5, 10, 21, 25))', expect: '3', hidden: true },
            { call: 'min_coins(7, (2, 4))', expect: '-1', hidden: true },
            { call: 'min_coins(299, (3, 7, 11))', hidden: true },
          ],
          hints: [
            'best(a) = 1 + the smallest best(a − c) over all coins c.',
            'Return `float("inf")` for impossible sub-amounts so `min` simply ignores them.',
            'Convert `inf` to `-1` only once, at the very end.',
          ],
          wrong: [
            py`
              def min_coins(amount, coins):
                  count = 0
                  for c in sorted(coins, reverse=True):
                      count += amount // c
                      amount %= c
                  return count if amount == 0 else -1
            `,
            py`
              from functools import cache

              def min_coins(amount, coins):
                  @cache
                  def best(a):
                      if a == 0:
                          return 0
                      if a < 0:
                          return float("inf")
                      return 1 + min(best(a - c) for c in coins)

                  return best(amount)
            `,
          ],
          explain: md`
            Coin change (LeetCode 322) is *the* classic proof that greedy can fail and DP can't: DP tries every last coin and keeps the best. States 0…amount, each trying every coin, gives O(amount · len(coins)). Using \`inf\` as "impossible" keeps the recurrence clean, since \`1 + inf\` is still \`inf\`. For very large amounts, switch to a bottom-up table to avoid the recursion limit.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u10-l3',
      title: 'Iterators & Generators',
      summary: 'Produce values lazily, one at a time, and stream data bigger than memory.',
      steps: [
        {
          type: 'learn',
          title: 'The iteration protocol',
          body: md`
            \`for x in data\` secretly does two things: \`it = iter(data)\`, then \`next(it)\` again and again until it raises \`StopIteration\`.

            - An **iterable** (list, str, dict, file) can hand out an iterator.
            - An **iterator** remembers its position. Once it's used up, it stays empty.

            \`next(it, default)\` returns the default instead of raising.
          `,
          code: py`
            nums = [10, 20]
            it = iter(nums)
            print(next(it))
            print(next(it))
            try:
                next(it)
            except StopIteration:
                print("done")
            print(next(it, "default"))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            it = iter("abc")
            print(next(it))
            print(list(it))
            print(list(it))
          `,
          answer: "a\n['b', 'c']\n[]",
          explain: '`next` consumed "a". `list(it)` takes everything that is left, and after that the iterator is exhausted, so the second `list(it)` is empty. The string itself is untouched: `iter("abc")` would start fresh.',
        },
        {
          type: 'learn',
          title: 'Generator functions: yield',
          body: md`
            A function containing \`yield\` returns a **generator** when called, and none of its code runs yet. Each \`next()\` runs it until the next \`yield\`, hands out that value, and **pauses** with all local variables intact. When the function ends, \`StopIteration\` is raised for you.

            So generators are iterators you write as normal-looking functions.
          `,
          code: py`
            def countdown(n):
                print("start")
                while n > 0:
                    yield n
                    n -= 1
                print("end")

            g = countdown(3)
            print("created")
            print(next(g))
            print(list(g))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def gen():
                print("A")
                yield 1
                print("B")
                yield 2
                print("C")

            g = gen()
            x = next(g)
            y = next(g)
            print(x + y)
          `,
          options: ['A\nB\n3', 'A\nB\nC\n3', '3', 'A\n3'],
          answer: 0,
          checkOutput: true,
          explain: 'The first `next` runs up to `yield 1` (printing A). The second resumes right after it, prints B and pauses at `yield 2`. Nobody asks for a third value, so the code after it ("C") never runs.',
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def running_total(nums):
                total = 0
                for n in nums:
                    total += n
                    yield total

            print(list(running_total([3, 1, 4])))
            for t in running_total([5, 5]):
                print(t, end=" ")
          `,
          answer: '[3, 4, 8]\n5 10',
          explain: '`total` survives between yields because the generator is only paused. Each call to `running_total(...)` creates a brand-new generator with its own `total`.',
        },
        {
          type: 'blanks',
          prompt: 'Make it print `[0, 2, 4, 6]`.',
          code: py`
            def evens(limit):
                n = 0
                while n < limit:
                    ___ n
                    n += 2

            print(___(evens(7)))
          `,
          bank: ['yield', 'list', 'return', 'print', 'next', 'iter'],
          answer: ['yield', 'list'],
          tests: [{ stdout: '[0, 2, 4, 6]\n' }],
          explain: '`yield` makes `evens` a generator. `return n` would end the function at the first value. Printing the generator itself shows `<generator object ...>`, so `list()` drains it into a list first.',
        },
        {
          type: 'code',
          title: 'Parse events lazily',
          prompt: md`
            Write a **generator** \`parse_events(lines)\`. Each line looks like \`"42,search"\`: yield \`(42, "search")\` with the user id as an int and the event stripped of spaces and newlines. Skip blank lines and lines starting with \`#\`.

            It must work on a stream of millions of lines, taking **one line at a time**, never building a list.

            \`\`\`python
            lines = ["1,search", "", "# test", "2, purchase\n"]
            list(parse_events(lines))
            # [(1, "search"), (2, "purchase")]
            \`\`\`
          `,
          setup: py`
            pulled = 0

            def source(n=200_000):
                global pulled
                for i in range(n):
                    pulled += 1
                    yield f"{i},page_view"
          `,
          starter: py`
            def parse_events(lines):
                pass
          `,
          solution: py`
            def parse_events(lines):
                for line in lines:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    user, event = line.split(",")
                    yield int(user), event.strip()
          `,
          tests: [
            { call: 'list(parse_events(["1,search", "", "# test", "2, purchase\\n"]))', expect: '[(1, "search"), (2, "purchase")]' },
            { call: 'list(parse_events([]))', expect: '[]' },
            { code: 'g = parse_events(["3,checkout"])\nassert next(g) == (3, "checkout")', name: 'works with next()' },
            { code: 'pulled = 0\ng = parse_events(source())\nassert next(g) == (0, "page_view")\nassert pulled <= 2', name: 'reads lazily, one line at a time', hidden: true },
            { call: 'list(parse_events(["   ", "7,add_to_cart  "]))', expect: '[(7, "add_to_cart")]', hidden: true },
          ],
          require: ['yield'],
          hints: [
            'Loop over `lines` and `yield` one tuple per good line. No list anywhere.',
            '`line.strip()` first, then `if not line or line.startswith("#"): continue`.',
            '`user, event = line.split(",")` then `yield int(user), event.strip()`.',
          ],
          wrong: [
            py`
              def parse_events(lines):
                  out = []
                  for line in lines:
                      line = line.strip()
                      if not line or line.startswith("#"):
                          continue
                      user, event = line.split(",")
                      out.append((int(user), event.strip()))
                  yield from out
            `,
            py`
              def parse_events(lines):
                  for line in lines:
                      if not line.strip():
                          continue
                      user, event = line.split(",")
                      yield int(user), event.strip()
            `,
          ],
          explain: md`
            Because \`parse_events\` pulls one line, yields one tuple and pauses, its memory use doesn't depend on the input size. The first wrong answer has a \`yield\` too, but builds the full list first, so it isn't lazy at all. That's why the hidden test counts how many lines were pulled before the first result came out.
          `,
        },
        {
          type: 'learn',
          title: 'Generator expressions',
          body: md`
            \`(x * 2 for x in nums)\` is a **lazy** comprehension: values are made on demand and can be consumed **once**. Pass it straight to \`sum\`, \`max\`, \`any\` or \`"".join\`. \`sum(x * x for x in range(10**8))\` runs in constant memory, while the list version first builds 100 million numbers (gigabytes).

            The source (\`nums\`) is captured when the expression is created, and items are pulled later. Generators can even be **infinite**, as long as the consumer stops (\`break\`, a few \`next()\` calls).
          `,
          code: py`
            import sys

            nums = range(1_000_000)
            as_list = [n * n for n in nums]
            as_gen = (n * n for n in nums)
            print(sys.getsizeof(as_list) > 1_000_000)
            print(sys.getsizeof(as_gen) < 1_000)
            print(sum(as_gen) == sum(as_list))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            nums = (n for n in [1, 2, 3])
            print(sum(nums), sum(nums))
          `,
          options: ['6 0', '6 6', '0 0', "TypeError: 'generator' object is not reusable"],
          answer: 0,
          checkOutput: true,
          explain: 'The first `sum` exhausts the generator. The second gets an empty iterator, and the sum of nothing is 0. No error! This silent emptiness is a classic bug: if you need the data twice, use a list.',
        },
        {
          type: 'output',
          prompt: 'An infinite generator. What does this print?',
          code: py`
            def ids():
                n = 0
                while True:
                    n += 1
                    yield f"T{n:03d}"

            g = ids()
            for t in g:
                if t == "T003":
                    break
            print(next(g))
          `,
          answer: 'T004',
          explain: 'The `for` loop pulled T001, T002 and T003, then broke out. The generator stays paused right after T003, so the next value is T004. `while True` is safe here because the consumer decides when to stop.',
        },
        {
          type: 'learn',
          title: 'Files bigger than RAM',
          body: md`
            A file object is itself an iterator over lines: \`for line in f\` reads one line at a time, so you can scan a 50 GB log with a few KB of memory. \`f.read()\` or \`f.readlines()\` would load it all at once.

            Chain generators into a **pipeline**: each stage pulls one item from the stage before it, and nothing runs until the end pulls. Spark, Kafka consumers and pandas' \`chunksize=\` all use this streaming idea.
          `,
          code: py`
            def read_lines(path):
                with open(path) as f:
                    for line in f:
                        yield line.rstrip("\n")

            def server_errors(lines):
                for line in lines:
                    status = line.split('"')[2].split()[0]
                    if status.startswith("5"):
                        yield line

            lines = read_lines("data/server.log")
            errs = server_errors(lines)
            print(next(errs)[:46])
            print(1 + sum(1 for _ in errs), "lines with 5xx")
          `,
        },
        {
          type: 'code',
          title: 'Dedupe a stream',
          prompt: md`
            Event streams often deliver duplicates. Unit 5 deduped a list; now write a lazy **generator** \`dedupe(items, key=None)\` that yields each item the **first** time its key is seen, in the original order. The key is \`key(item)\`, or the item itself when \`key\` is \`None\`. It must work on endless streams.

            \`\`\`python
            list(dedupe([3, 1, 3, 2, 1]))         # [3, 1, 2]
            list(dedupe(["a", "A", "b"], key=str.lower))
            # ["a", "b"]
            \`\`\`
          `,
          setup: py`
            pulled = 0

            def stream(n=200_000):
                global pulled
                for i in range(n):
                    pulled += 1
                    yield i // 2
          `,
          starter: py`
            def dedupe(items, key=None):
                pass
          `,
          solution: py`
            def dedupe(items, key=None):
                seen = set()
                for item in items:
                    k = item if key is None else key(item)
                    if k not in seen:
                        seen.add(k)
                        yield item
          `,
          tests: [
            { call: 'list(dedupe([3, 1, 3, 2, 1]))', expect: '[3, 1, 2]' },
            { call: 'list(dedupe(["a", "A", "b"], key=str.lower))', expect: '["a", "b"]' },
            { call: 'list(dedupe([]))', expect: '[]' },
            { code: 'pulled = 0\ng = dedupe(stream())\nassert [next(g) for _ in range(3)] == [0, 1, 2]\nassert pulled <= 6', name: 'works lazily on a stream', hidden: true },
            { call: 'list(dedupe([{"id": 1}, {"id": 1, "x": 2}, {"id": 2}], key=lambda e: e["id"]))', expect: '[{"id": 1}, {"id": 2}]', hidden: true, name: 'unhashable items with a key' },
            { call: 'list(dedupe("mississippi"))', expect: '["m", "i", "s", "p"]', hidden: true },
          ],
          require: ['yield'],
          hints: [
            'Keep a `seen` set *inside* the generator. It lives as long as the generator does.',
            'Compute `k = item if key is None else key(item)` and check `k`, not the item.',
            'Yield the original **item**, but remember its **key**.',
          ],
          wrong: [
            py`
              def dedupe(items, key=None):
                  seen = set()
                  for item in items:
                      k = item if key is None else key(item)
                      if k not in seen:
                          seen.add(item)
                          yield item
            `,
            py`
              def dedupe(items, key=None):
                  prev = object()
                  for item in items:
                      k = item if key is None else key(item)
                      if k != prev:
                          prev = k
                          yield item
            `,
          ],
          explain: md`
            The \`seen\` set makes each check O(1), so the whole stream is O(n) time. Memory grows with the number of *distinct* keys. Real streaming systems bound that with time windows or probabilistic sets (Bloom filters), which you'll meet in the big-data unit. Remembering only the previous item removes *consecutive* duplicates only (that's \`groupby\` territory, next lesson).
          `,
        },
        {
          type: 'code',
          title: 'Endpoint latency report',
          prompt: md`
            Log lines look like this:

            \`\`\`
            203.0.113.5 - - [12/Nov/2025:09:00:40 +0000] "POST /api/checkout HTTP/1.1" 200 8940 0.137
            \`\`\`

            After the quoted request come the status, the bytes and the response time in seconds. Write:

            1. a generator \`parse(lines)\` that yields \`(path, status, seconds)\` with the query string removed (\`/search?q=x\` → \`/search\`), status as int, seconds as float;
            2. \`endpoint_stats(lines)\`, using \`parse\`, that returns \`{path: (count, avg_seconds)}\` for **2xx** responses only, with the average rounded to 3 decimals.

            It must stream: \`endpoint_stats(open("data/server.log"))\` reads one line at a time.
          `,
          setup: py`
            LOG = [
                '203.0.113.5 - - [12/Nov/2025:09:00:40 +0000] "POST /api/checkout HTTP/1.1" 200 8940 0.137',
                '203.0.113.24 - - [12/Nov/2025:09:01:19 +0000] "GET /api/products/40 HTTP/1.1" 400 5004 0.049',
                '203.0.113.53 - - [12/Nov/2025:09:01:47 +0000] "GET /search?q=python HTTP/1.1" 200 1712 0.054',
                '203.0.113.9 - - [12/Nov/2025:09:02:03 +0000] "GET /search?q=sql HTTP/1.1" 201 1500 0.046',
                '203.0.113.7 - - [12/Nov/2025:09:02:10 +0000] "POST /api/checkout HTTP/1.1" 200 8000 0.263',
                '203.0.113.8 - - [12/Nov/2025:09:02:30 +0000] "GET /static/app.js HTTP/1.1" 304 0 0.003',
            ]
          `,
          starter: py`
            def parse(lines):
                pass


            def endpoint_stats(lines):
                pass
          `,
          solution: py`
            def parse(lines):
                for line in lines:
                    parts = line.split('"')
                    url = parts[1].split()[1]
                    status, _, secs = parts[2].split()
                    path = url.split("?")[0]
                    yield path, int(status), float(secs)


            def endpoint_stats(lines):
                count, total = {}, {}
                for path, status, secs in parse(lines):
                    if not 200 <= status < 300:
                        continue
                    count[path] = count.get(path, 0) + 1
                    total[path] = total.get(path, 0) + secs
                return {p: (n, round(total[p] / n, 3))
                        for p, n in count.items()}
          `,
          tests: [
            { call: 'endpoint_stats(LOG)', expect: '{"/api/checkout": (2, 0.2), "/search": (2, 0.05)}' },
            { call: 'next(parse(LOG))', expect: '("/api/checkout", 200, 0.137)', name: 'parse yields tuples' },
            { call: 'endpoint_stats([])', expect: '{}' },
            { call: 'endpoint_stats(line for line in LOG)', expect: '{"/api/checkout": (2, 0.2), "/search": (2, 0.05)}', hidden: true, name: 'accepts any iterable' },
            { call: 'endpoint_stats(open("data/server.log"))', hidden: true, name: 'the real server.log' },
          ],
          require: ['yield'],
          hints: [
            '`line.split(\'"\')` gives [before, request, after]. The request is `"POST /api/checkout HTTP/1.1"`.',
            '`parts[2].split()` → `["200", "8940", "0.137"]`. Strip the query with `url.split("?")[0]`.',
            'Keep two dicts, count and total, keyed by path. Divide at the end.',
          ],
          wrong: [
            py`
              def parse(lines):
                  for line in lines:
                      parts = line.split('"')
                      url = parts[1].split()[1]
                      status, _, secs = parts[2].split()
                      yield url, int(status), float(secs)


              def endpoint_stats(lines):
                  count, total = {}, {}
                  for path, status, secs in parse(lines):
                      if not 200 <= status < 300:
                          continue
                      count[path] = count.get(path, 0) + 1
                      total[path] = total.get(path, 0) + secs
                  return {p: (n, round(total[p] / n, 3))
                          for p, n in count.items()}
            `,
            py`
              def parse(lines):
                  for line in lines:
                      parts = line.split('"')
                      url = parts[1].split()[1]
                      status, _, secs = parts[2].split()
                      path = url.split("?")[0]
                      yield path, int(status), float(secs)


              def endpoint_stats(lines):
                  count, total = {}, {}
                  for path, status, secs in parse(lines):
                      if status != 200:
                          continue
                      count[path] = count.get(path, 0) + 1
                      total[path] = total.get(path, 0) + secs
                  return {p: (n, round(total[p] / n, 3))
                          for p, n in count.items()}
            `,
          ],
          explain: md`
            This is a real streaming aggregation: **read → parse → filter → aggregate**, holding only one line plus one small dict per endpoint in memory. Keeping *sum and count* (not a list of every latency) is what makes it scale: it's how \`AVG\` works in SQL engines and how Spark combines partial results from many machines. Percentiles like p99 are harder to stream, which is why they're a favourite interview follow-up.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u10-l4',
      title: 'itertools & Lazy Pipelines',
      summary: 'Slice, chain, group and combine iterators without building lists.',
      steps: [
        {
          type: 'learn',
          title: 'count, islice, chain',
          body: md`
            \`itertools\` functions take iterables and return **lazy iterators**:

            - \`count(start, step)\` counts forever.
            - \`islice(it, stop)\` or \`islice(it, start, stop, step)\` slices *any* iterator, even an infinite one (no negative indexes).
            - \`chain(a, b, ...)\` walks several iterables as if they were one.

            Like any iterator, they are consumed as you go.
          `,
          code: py`
            from itertools import count, islice, chain

            ids = (f"u{n}" for n in count(100))
            print(list(islice(ids, 3)))
            print(list(islice(range(100), 10, 20, 4)))
            print(list(chain([1, 2], (3,), "ab")))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            from itertools import count, islice

            c = count(1)
            print(list(islice(c, 3)))
            print(next(c))
            print(list(islice(c, 2)))
          `,
          answer: '[1, 2, 3]\n4\n[5, 6]',
          explain: '`islice` doesn\'t restart the counter. It takes the next 3 values from `c` and leaves it paused. `next(c)` continues from 4, and the second `islice` takes the next two after that.',
        },
        {
          type: 'blanks',
          prompt: 'Make it print `[1, 2, 3] [4, 5]`.',
          code: py`
            from itertools import ___, islice

            ids = count(1)
            batch1 = list(___(ids, 3))
            batch2 = list(islice(ids, 2))
            print(batch1, batch2)
          `,
          bank: ['count', 'islice', 'range', 'chain', 'slice', 'next'],
          answer: ['count', 'islice'],
          tests: [{ stdout: '[1, 2, 3] [4, 5]\n' }],
          explain: '`count(1)` is the endless ID source. `islice(ids, 3)` takes the first three. Plain `slice` only builds a slice object for `[a:b]`, and it can\'t slice an iterator.',
        },
        {
          type: 'learn',
          title: 'groupby needs sorted input',
          body: md`
            \`groupby(items, key)\` groups **consecutive** items with the same key and yields \`(key, group)\` pairs. It never looks ahead, so unsorted input gives the same key several times. Sort by the same key first, or use a dict/\`Counter\` when order doesn't matter.

            Each \`group\` is an iterator that's only valid until you move to the next group. Because it holds one group at a time, \`groupby\` is how you aggregate already-sorted data (logs, sorted files) without loading it all.
          `,
          code: py`
            from itertools import groupby

            events = ["view", "view", "buy", "view"]
            for k, g in groupby(events):
                print(k, len(list(g)))

            orders = [("DE", 5), ("US", 3), ("DE", 2)]
            by_country = lambda o: o[0]
            orders.sort(key=by_country)
            for c, grp in groupby(orders, key=by_country):
                print(c, sum(q for _, q in grp))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            from itertools import groupby

            words = ["apple", "bob", "avocado", "berry"]
            first = lambda w: w[0]
            print([k for k, _ in groupby(words, key=first)])
          `,
          options: ["['a', 'b', 'a', 'b']", "['a', 'b']", "['b', 'a']", "[('a', 2), ('b', 2)]"],
          answer: 0,
          checkOutput: true,
          explain: 'The first letters run a, b, a, b. Every change starts a new group. `sorted(words, key=first)` first would give `[\'a\', \'b\']`. This is the #1 groupby bug.',
        },
        {
          type: 'code',
          title: 'Run-length encoding',
          prompt: md`
            Unit 4 built run-length encoding with a loop. Redo it with \`itertools.groupby\`, which finds the runs for you: every **run** of the same character becomes the character plus the run length.

            \`\`\`python
            rle("aaabccdd")   # "a3b1c2d2"
            rle("aaAA")       # "a2A2"
            rle("")           # ""
            \`\`\`
          `,
          starter: py`
            from itertools import groupby

            def rle(s):
                pass
          `,
          solution: py`
            from itertools import groupby

            def rle(s):
                parts = []
                for ch, run in groupby(s):
                    parts.append(f"{ch}{len(list(run))}")
                return "".join(parts)
          `,
          tests: [
            { call: 'rle("aaabccdd")', expect: '"a3b1c2d2"' },
            { call: 'rle("aaAA")', expect: '"a2A2"' },
            { call: 'rle("")', expect: '""' },
            { call: 'rle("aaba")', expect: '"a2b1a1"', hidden: true, name: 'runs, not totals' },
            { call: 'rle("z" * 12)', expect: '"z12"', hidden: true },
            { call: 'rle("abc")', expect: '"a1b1c1"', hidden: true },
          ],
          require: ['groupby'],
          hints: [
            'Without a key, `groupby(s)` groups equal neighbouring characters.',
            'A group is an iterator: `len(list(run))` gives its length.',
            'Collect the pieces in a list and `"".join` them at the end (repeated `+=` on strings is slower).',
          ],
          wrong: [
            py`
              from collections import Counter

              def rle(s):
                  return "".join(f"{c}{n}" for c, n in Counter(s).items())
            `,
            py`
              from itertools import groupby

              def rle(s):
                  parts = []
                  for ch, run in groupby(s.lower()):
                      parts.append(f"{ch}{len(list(run))}")
                  return "".join(parts)
            `,
          ],
          explain: md`
            RLE is exactly the case where "consecutive" is the point, so \`groupby\` on unsorted input is correct here. \`Counter\` would merge separate runs ("aaba" → a3b1). It's an interview classic (string compression, LeetCode 443) and a real technique: columnar formats like Parquet use run-length encoding for repetitive columns.
          `,
        },
        {
          type: 'learn',
          title: 'Running totals and combinatorics',
          body: md`
            | tool | gives |
            |---|---|
            | \`accumulate(xs)\` | running totals (or any 2-argument function: \`accumulate(xs, max)\`) |
            | \`zip_longest(a, b, fillvalue=x)\` | zips to the **longest** input |
            | \`combinations(xs, r)\` | unordered picks: C(n, r) |
            | \`permutations(xs, r)\` | ordered picks: n! / (n − r)! |
            | \`product(a, b)\` | every pairing, like nested loops |

            These explode fast: 10 items have 3.6 million permutations. In interviews they're perfect for brute-forcing small cases to check your clever solution.
          `,
          code: py`
            from itertools import (accumulate, combinations,
                                   permutations, product,
                                   zip_longest)

            print(list(accumulate([5, 3, 8, 2])))
            pairs = zip_longest("abc", [1], fillvalue="-")
            print(list(pairs))
            print(list(combinations("abc", 2)))
            print(len(list(permutations("abc"))))
            print(list(product("ab", [0, 1])))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            from itertools import accumulate, zip_longest

            mul = lambda a, b: a * b
            print(list(accumulate([2, 3, 4], mul)))
            print(list(zip_longest([1, 2, 3], "xy")))
          `,
          answer: "[2, 6, 24]\n[(1, 'x'), (2, 'y'), (3, None)]",
          explain: '`accumulate` with a function keeps applying it to the running result: 2, 2·3, 6·4. `zip_longest` pads the shorter input with `fillvalue`, which defaults to `None`. Plain `zip` would stop after 2 pairs.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            from itertools import (combinations,
                                   permutations, product)

            a = len(list(combinations(range(5), 3)))
            b = len(list(permutations(range(5), 2)))
            c = len(list(product(range(3), repeat=2)))
            print(a, b, c)
          `,
          options: ['10 20 9', '60 20 9', '10 10 6', '10 20 6'],
          answer: 0,
          checkOutput: true,
          explain: 'C(5, 3) = 10 unordered triples. 5 · 4 = 20 ordered pairs. `product(range(3), repeat=2)` is 3 · 3 = 9 pairs, including (0, 0).',
        },
        {
          type: 'code',
          title: 'Two-item bundles',
          prompt: md`
            A shop wants every **2-item bundle** that costs at most \`budget\`. \`prices\` maps item name → price. Return a list of name pairs, each pair in alphabetical order, the list sorted. Use \`itertools.combinations\`.

            \`\`\`python
            prices = {"mug": 8, "tea": 4, "pot": 25, "pen": 2}
            bundles(prices, 12)
            # [("mug", "pen"), ("mug", "tea"), ("pen", "tea")]
            \`\`\`
          `,
          starter: py`
            from itertools import combinations

            def bundles(prices, budget):
                pass
          `,
          solution: py`
            from itertools import combinations

            def bundles(prices, budget):
                names = sorted(prices)
                return [(a, b)
                        for a, b in combinations(names, 2)
                        if prices[a] + prices[b] <= budget]
          `,
          tests: [
            { call: 'bundles({"mug": 8, "tea": 4, "pot": 25, "pen": 2}, 12)', expect: '[("mug", "pen"), ("mug", "tea"), ("pen", "tea")]' },
            { call: 'bundles({"a": 5}, 100)', expect: '[]', name: 'one item has no pairs' },
            { call: 'bundles({}, 10)', expect: '[]', hidden: true },
            { call: 'bundles({"z": 6, "b": 6, "k": 7}, 12)', expect: '[("b", "z")]', hidden: true, name: 'exactly on budget counts' },
            { call: 'bundles({"x": 1, "y": 2, "w": 3, "v": 4}, 6)', hidden: true },
          ],
          require: ['combinations'],
          hints: [
            'Sort the names first. Then `combinations(names, 2)` yields each pair once, already in alphabetical order.',
            'Keep a pair when `prices[a] + prices[b] <= budget`.',
          ],
          wrong: [
            py`
              from itertools import permutations

              def bundles(prices, budget):
                  names = sorted(prices)
                  return [(a, b)
                          for a, b in permutations(names, 2)
                          if prices[a] + prices[b] <= budget]
            `,
            py`
              from itertools import combinations

              def bundles(prices, budget):
                  names = sorted(prices)
                  return [(a, b)
                          for a, b in combinations(names, 2)
                          if prices[a] + prices[b] < budget]
            `,
            py`
              from itertools import combinations

              def bundles(prices, budget):
                  return [(a, b)
                          for a, b in combinations(prices, 2)
                          if prices[a] + prices[b] <= budget]
            `,
          ],
          explain: md`
            \`combinations\` emits items in input order and never repeats a pair, so sorting the input once gives sorted pairs for free. \`permutations\` would list every bundle twice. This brute force is O(n²). For a "two items that sum to exactly X" query on a big catalogue, the hash-set trick (Two Sum) brings it down to O(n).
          `,
        },
        {
          type: 'learn',
          title: 'A lazy pipeline',
          body: md`
            Build data jobs as a chain of small lazy stages: **read → parse → filter → aggregate**. Each stage is a generator that pulls from the one before. Nothing runs until the last step asks for items, and here the job stops reading the file as soon as it has 3 results.

            \`yield from it\` is short for \`for x in it: yield x\`. Memory stays flat however big the file is.
          `,
          code: py`
            import csv
            from itertools import islice

            def rows(path):
                with open(path) as f:
                    yield from csv.DictReader(f)

            def purchases(rs):
                for r in rs:
                    if r["event"] == "purchase":
                        yield r

            def devices(rs):
                return (r["device"] for r in rs)

            pipe = devices(purchases(rows("data/events.csv")))
            print(list(islice(pipe, 3)))
          `,
        },
        {
          type: 'order',
          prompt: '`data` is a list like `["a,50", "b,150"]`. Arrange a lazy pipeline that prints the total of amounts over 100.',
          setup: 'data = ["a,50", "b,150", "c,250.5"]',
          lines: [
            'def parse(lines):',
            '    for line in lines:',
            '        user, amount = line.split(",")',
            '        yield user, float(amount)',
            'big = (p for p in parse(data) if p[1] > 100)',
            'print(sum(amount for _, amount in big))',
          ],
          distractors: ['        return user, float(amount)', '    yield user, float(amount)'],
          tests: [{ stdout: '400.5\n' }],
          explain: '`parse` yields inside the loop, one tuple per line. `big` is a generator expression over it, and `sum` drives the whole chain. `return` would stop after the first line, and a `yield` outside the loop would only produce the last line.',
        },
        {
          type: 'code',
          title: 'Requests per hour',
          prompt: md`
            Log lines are written in **time order**, so all lines of one hour are consecutive: perfect for \`groupby\`. Each line contains a timestamp like \`[12/Nov/2025:09:00:40 +0000]\`, and the hour key is the 14 characters after \`[\`: \`"12/Nov/2025:09"\`.

            Write a **generator** \`requests_per_hour(lines)\` yielding \`(hour, count)\` pairs in order. It must work on any iterable of lines, including an open file.

            \`\`\`python
            list(requests_per_hour(open("data/server.log")))[0]
            # ("12/Nov/2025:09", ...)
            \`\`\`
          `,
          setup: py`
            SAMPLE = [
                '1.1.1.1 - - [12/Nov/2025:09:00:40 +0000] "GET / HTTP/1.1" 200 10 0.1',
                '1.1.1.2 - - [12/Nov/2025:09:59:59 +0000] "GET /a HTTP/1.1" 200 10 0.1',
                '1.1.1.3 - - [12/Nov/2025:10:00:00 +0000] "GET /b HTTP/1.1" 404 10 0.1',
                '1.1.1.4 - - [12/Nov/2025:10:30:00 +0000] "GET /c HTTP/1.1" 200 10 0.1',
                '1.1.1.5 - - [12/Nov/2025:10:45:00 +0000] "GET /d HTTP/1.1" 500 10 0.1',
                '1.1.1.6 - - [13/Nov/2025:10:05:00 +0000] "GET /e HTTP/1.1" 200 10 0.1',
            ]
          `,
          starter: py`
            from itertools import groupby

            def requests_per_hour(lines):
                pass
          `,
          solution: py`
            from itertools import groupby

            def hour_of(line):
                stamp = line.split("[")[1]
                return stamp[:14]

            def requests_per_hour(lines):
                for hour, grp in groupby(lines, key=hour_of):
                    yield hour, sum(1 for _ in grp)
          `,
          tests: [
            { call: 'list(requests_per_hour(SAMPLE[:5]))', expect: '[("12/Nov/2025:09", 2), ("12/Nov/2025:10", 3)]' },
            { call: 'list(requests_per_hour([]))', expect: '[]' },
            { call: 'list(requests_per_hour(SAMPLE))', expect: '[("12/Nov/2025:09", 2), ("12/Nov/2025:10", 3), ("13/Nov/2025:10", 1)]', hidden: true, name: 'a new day starts a new hour' },
            { call: '(lambda g: iter(g) is g)(requests_per_hour(SAMPLE))', expect: 'True', hidden: true, name: 'returns a lazy iterator' },
            { call: 'list(requests_per_hour(open("data/server.log")))', hidden: true, name: 'the real server.log' },
          ],
          require: ['groupby'],
          hints: [
            'Write a key function: `line.split("[")[1][:14]`.',
            '`for hour, grp in groupby(lines, key=hour_of):` then count the group.',
            '`sum(1 for _ in grp)` counts an iterator without building a list.',
          ],
          wrong: [
            py`
              from collections import Counter

              def requests_per_hour(lines):
                  hours = Counter(l.split("[")[1][:14] for l in lines)
                  return list(hours.items())
            `,
            py`
              from itertools import groupby

              def hour_of(line):
                  stamp = line.split("[")[1]
                  return stamp[12:14]

              def requests_per_hour(lines):
                  for hour, grp in groupby(lines, key=hour_of):
                      yield hour, sum(1 for _ in grp)
            `,
          ],
          explain: md`
            Because the input is already sorted by time, \`groupby\` needs memory for **one group at a time**, and a dict-based count would need one entry per hour of history. This "sort once, then stream groups" pattern is how SQL engines run a sort-based \`GROUP BY\` and how MapReduce reducers receive their keys. Keying on the hour alone (\`"09"\`) would merge different days.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u10-l5',
      title: 'Decorators',
      summary: 'Wrap functions to add logging, counting, caching and retries.',
      steps: [
        {
          type: 'learn',
          title: 'Functions that wrap functions',
          body: md`
            Functions are values (Unit 7): you can pass one in and return a new one. A **decorator** takes a function and returns a replacement, usually an inner \`wrapper\` that runs extra code before or after calling the original.

            The wrapper accepts \`*args, **kwargs\` and passes them on, so it works for any signature. Thanks to the closure, it still remembers \`func\` after the decorator has returned.
          `,
          code: py`
            def shout(func):
                def wrapper(*args, **kwargs):
                    result = func(*args, **kwargs)
                    return result.upper()
                return wrapper

            def greet(name):
                return f"hi {name}"

            loud = shout(greet)
            print(loud("ada"))
            print(greet("ada"))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def twice(func):
                def wrapper(x):
                    return func(func(x))
                return wrapper

            def add3(x):
                return x + 3

            f = twice(add3)
            print(f(1), add3(1))
          `,
          answer: '7 4',
          explain: '`f(1)` runs `add3(add3(1))` = `add3(4)` = 7. Wrapping doesn\'t change the original: `add3(1)` is still 4.',
        },
        {
          type: 'learn',
          title: '@ syntax and functools.wraps',
          body: md`
            \`@logged\` above \`def area\` means exactly \`area = logged(area)\`, right after the definition. The decorator runs **once, when the function is defined**. The wrapper runs on **every call**.

            One problem: the wrapper replaces the original's name and docstring (\`area.__name__\` becomes \`"wrapper"\`), which confuses logs, debuggers and docs. \`@functools.wraps(func)\` on the wrapper copies them over. Always use it.
          `,
          code: py`
            from functools import wraps

            def logged(func):
                @wraps(func)
                def wrapper(*args, **kwargs):
                    print(f"calling {func.__name__}{args}")
                    return func(*args, **kwargs)
                return wrapper

            @logged
            def area(w, h):
                """Rectangle area."""
                return w * h

            print(area(3, 4))
            print(area.__name__, "-", area.__doc__)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def register(func):
                print("registering", func.__name__)
                return func

            @register
            def job():
                print("running")

            print("ready")
            job()
          `,
          options: ['registering job\nready\nrunning', 'ready\nregistering job\nrunning', 'ready\nrunning', 'registering job\nready\nregistering job\nrunning'],
          answer: 0,
          checkOutput: true,
          explain: 'Decorating happens at definition time, before "ready". This decorator returns the original function unchanged, so calling `job()` doesn\'t register again. Flask\'s `@app.route` registers URL handlers with exactly this trick.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def deco(func):
                def wrapper(*args):
                    return func(*args)
                return wrapper

            @deco
            def report():
                return 1

            print(report.__name__)
          `,
          options: ['wrapper', 'report', 'deco', 'func'],
          answer: 0,
          checkOutput: true,
          explain: 'After decoration, the name `report` points to the inner `wrapper` function, and that function\'s `__name__` is "wrapper". `@wraps(func)` would copy over "report".',
        },
        {
          type: 'code',
          title: 'Call counter',
          prompt: md`
            Write a decorator \`counted\`. The decorated function works exactly as before (any arguments, same return value), and its \`calls\` attribute counts how often it has been called. Keep the original name with \`wraps\`.

            \`\`\`python
            @counted
            def add(a, b):
                return a + b

            add(1, 2)
            add(3, 4)
            add.calls      # 2
            add.__name__   # "add"
            \`\`\`
          `,
          starter: py`
            from functools import wraps

            def counted(func):
                pass
          `,
          solution: py`
            from functools import wraps

            def counted(func):
                @wraps(func)
                def wrapper(*args, **kwargs):
                    wrapper.calls += 1
                    return func(*args, **kwargs)
                wrapper.calls = 0
                return wrapper
          `,
          tests: [
            { code: '@counted\ndef add(a, b):\n    return a + b\nadd(1, 2)\nadd(3, 4)\nassert add.calls == 2\nassert add(1, 1) == 2\nassert add.calls == 3', name: 'counts calls and returns results' },
            { code: '@counted\ndef f():\n    pass\nassert f.__name__ == "f"\nassert f.calls == 0', name: 'keeps the name, starts at 0' },
            { code: '@counted\ndef g():\n    return 1\n\n@counted\ndef h():\n    return 2\n\ng()\ng()\nh()\nassert (g.calls, h.calls) == (2, 1)', name: 'each function has its own counter', hidden: true },
            { code: '@counted\ndef p(x, y=1):\n    return x * y\nassert p(2, y=5) == 10', name: 'passes keyword arguments', hidden: true },
          ],
          require: ['decorator'],
          hints: [
            'Inside `counted`, define `wrapper(*args, **kwargs)` and return it.',
            'Functions can have attributes: set `wrapper.calls = 0` before returning it.',
            'In the wrapper: `wrapper.calls += 1`, then `return func(*args, **kwargs)`.',
          ],
          wrong: [
            py`
              from functools import wraps

              total_calls = 0

              def counted(func):
                  @wraps(func)
                  def wrapper(*args, **kwargs):
                      global total_calls
                      total_calls += 1
                      wrapper.calls = total_calls
                      return func(*args, **kwargs)
                  wrapper.calls = 0
                  return wrapper
            `,
            py`
              def counted(func):
                  def wrapper(*args, **kwargs):
                      wrapper.calls += 1
                      return func(*args, **kwargs)
                  wrapper.calls = 0
                  return wrapper
            `,
            py`
              from functools import wraps

              def counted(func):
                  @wraps(func)
                  def wrapper(*args):
                      wrapper.calls += 1
                      return func(*args)
                  wrapper.calls = 0
                  return wrapper
            `,
          ],
          explain: md`
            Each call to \`counted\` creates a **new** wrapper with its own \`calls\` attribute, so counters never mix. A closure variable with \`nonlocal count\` works just as well. Storing it on the function makes it easy to read from outside. Metrics decorators like this (call counts, error counts, latencies) are standard in production services.
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the audit decorator',
          prompt: md`
            \`audit\` should record the name of every called function in \`wrapper.log\`, and otherwise behave **exactly** like the original. Right now \`price(100)\` returns \`None\`, \`price(100, vat=0.1)\` crashes and \`price.__name__\` is wrong. Fix all **three** bugs in \`audit\`.
          `,
          starter: py`
            from functools import wraps

            def audit(func):
                def wrapper(*args):
                    wrapper.log.append(func.__name__)
                    func(*args)
                wrapper.log = []
                return wrapper

            @audit
            def price(net, vat=0.2):
                return round(net * (1 + vat), 2)
          `,
          solution: py`
            from functools import wraps

            def audit(func):
                @wraps(func)
                def wrapper(*args, **kwargs):
                    wrapper.log.append(func.__name__)
                    return func(*args, **kwargs)
                wrapper.log = []
                return wrapper

            @audit
            def price(net, vat=0.2):
                return round(net * (1 + vat), 2)
          `,
          tests: [
            { call: 'price(100)', expect: '120.0' },
            { call: 'price(100, vat=0.1)', expect: '110.0' },
            { call: 'price.__name__', expect: '"price"' },
            { code: '@audit\ndef f(x):\n    return x\nf(1)\nf(2)\nassert f.log == ["f", "f"]', name: 'logs every call', hidden: true },
          ],
          hints: [
            'A wrapper that calls `func(...)` but doesn\'t `return` it loses the result.',
            '`*args` alone can\'t receive `vat=0.1`. Add `**kwargs` and pass it on.',
            '`@wraps(func)` above `def wrapper` fixes the name.',
          ],
          wrong: [
            py`
              from functools import wraps

              def audit(func):
                  def wrapper(*args, **kwargs):
                      wrapper.log.append(func.__name__)
                      return func(*args, **kwargs)
                  wrapper.log = []
                  return wrapper

              @audit
              def price(net, vat=0.2):
                  return round(net * (1 + vat), 2)
            `,
            py`
              from functools import wraps

              def audit(func):
                  @wraps(func)
                  def wrapper(*args):
                      wrapper.log.append(func.__name__)
                      return func(*args)
                  wrapper.log = []
                  return wrapper

              @audit
              def price(net, vat=0.2):
                  return round(net * (1 + vat), 2)
            `,
          ],
          explain: md`
            The three rules of a well-behaved wrapper: accept \`*args, **kwargs\`, **return** the original result, and use \`@wraps\`. Break any of them and the decorator changes behaviour it was never supposed to touch, which is the worst kind of bug in shared infrastructure code.
          `,
        },
        {
          type: 'learn',
          title: 'Decorators with arguments',
          body: md`
            \`@retry(times=3)\` *calls* \`retry\` first, and that call must **return a decorator**. So it takes three layers:

            1. the outer function takes the options and returns \`decorator\`,
            2. \`decorator(func)\` returns \`wrapper\`,
            3. \`wrapper(*args, **kwargs)\` runs on each call.

            Read it as \`fetch = retry(times=3)(fetch)\`. The inner layers see the options through closures.
          `,
          code: py`
            from functools import wraps

            def repeat(n):
                def decorator(func):
                    @wraps(func)
                    def wrapper(*args, **kwargs):
                        return [func(*args, **kwargs)
                                for _ in range(n)]
                    return wrapper
                return decorator

            @repeat(3)
            def ping():
                return "pong"

            print(ping())
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete the decorator factory so it prints `<b>hi</b>`.',
          code: py`
            def tag(name):
                def decorator(func):
                    def wrapper(*args, **kwargs):
                        inner = func(*args, **kwargs)
                        return f"<{name}>{inner}</{name}>"
                    return ___
                return ___

            @tag("b")
            def hello():
                return "hi"

            print(hello())
          `,
          bank: ['wrapper', 'decorator', 'func', 'tag', 'name', 'wrapper()'],
          answer: ['wrapper', 'decorator'],
          tests: [{ stdout: '<b>hi</b>\n' }],
          explain: '`decorator` returns the `wrapper` *function* (not `wrapper()`, which would call it on the spot). `tag("b")` returns `decorator`, which `@` then applies to `hello`. Returning `func` would leave `hello` undecorated.',
        },
        {
          type: 'code',
          title: 'Retry decorator',
          prompt: md`
            Network calls fail now and then. Write \`retry(times=3)\`, a decorator factory: the wrapped function is attempted up to \`times\` times **in total**, and the first successful result is returned. If every attempt raises, re-raise the **last** exception. Use \`wraps\`.

            The hidden setup has \`make_flaky(k)\`, which builds a function that raises \`ConnectionError\` on its first \`k\` calls and then returns \`"ok"\`.

            \`\`\`python
            @retry(times=3)
            def fetch():
                ...   # fails twice, then works
            fetch()   # "ok"
            \`\`\`
          `,
          setup: py`
            def make_flaky(fails):
                def flaky(*args, **kwargs):
                    flaky.attempts += 1
                    if flaky.attempts <= fails:
                        raise ConnectionError("timeout")
                    return "ok"
                flaky.attempts = 0
                return flaky
          `,
          starter: py`
            from functools import wraps

            def retry(times=3):
                pass
          `,
          solution: py`
            from functools import wraps

            def retry(times=3):
                def decorator(func):
                    @wraps(func)
                    def wrapper(*args, **kwargs):
                        for attempt in range(1, times + 1):
                            try:
                                return func(*args, **kwargs)
                            except Exception:
                                if attempt == times:
                                    raise
                    return wrapper
                return decorator
          `,
          tests: [
            { code: 'f = retry(times=3)(make_flaky(2))\nassert f() == "ok"', name: 'succeeds on the 3rd attempt' },
            { call: 'retry(times=2)(make_flaky(5))()', raises: 'ConnectionError', name: 'gives up and re-raises' },
            { code: 'flaky = make_flaky(5)\ntry:\n    retry(times=4)(flaky)()\nexcept ConnectionError:\n    pass\nassert flaky.attempts == 4', name: 'exactly `times` attempts' },
            { code: 'flaky = make_flaky(0)\nassert retry(times=5)(flaky)() == "ok"\nassert flaky.attempts == 1', name: 'stops after the first success', hidden: true },
            { code: 'assert retry()(make_flaky(2))() == "ok"', name: 'times defaults to 3', hidden: true },
            { code: '@retry(times=2)\ndef fetch(url, timeout=1):\n    return f"{url}:{timeout}"\nassert fetch("u", timeout=5) == "u:5"\nassert fetch.__name__ == "fetch"', name: 'passes arguments, keeps the name', hidden: true },
          ],
          hints: [
            'Three layers: `retry(times)` → `decorator(func)` → `wrapper(*args, **kwargs)`.',
            'Loop over the attempts. `return func(...)` inside a `try` exits on the first success.',
            'In `except`, a bare `raise` re-raises the current exception. Do that only on the last attempt.',
          ],
          wrong: [
            py`
              from functools import wraps

              def retry(times=3):
                  def decorator(func):
                      @wraps(func)
                      def wrapper(*args, **kwargs):
                          for attempt in range(times + 1):
                              try:
                                  return func(*args, **kwargs)
                              except Exception:
                                  if attempt == times:
                                      raise
                      return wrapper
                  return decorator
            `,
            py`
              from functools import wraps

              def retry(times=3):
                  def decorator(func):
                      @wraps(func)
                      def wrapper(*args, **kwargs):
                          for attempt in range(times):
                              try:
                                  return func(*args, **kwargs)
                              except Exception:
                                  pass
                      return wrapper
                  return decorator
            `,
          ],
          explain: md`
            A bare \`raise\` inside \`except\` re-raises the active exception with its original traceback, so callers see the real error, not a vague "retry failed". Swallowing the last error and returning \`None\` is the dangerous variant: the caller carries on with bad data. Production retries add exponential backoff (\`time.sleep(2 ** attempt)\`, plus jitter) and retry only *transient* errors. That's the exam version.
          `,
        },
        {
          type: 'learn',
          title: 'Stacking and timing',
          body: md`
            Decorators stack bottom-up: \`@a\` above \`@b\` above \`def f\` means \`f = a(b(f))\`. \`b\` wraps first, so \`a\` is the outermost layer and runs first on each call.

            A timing decorator reads \`time.perf_counter()\` before and after the call. Real times change on every run, so graded code never prints them. Here they are stored in a list, and \`try/finally\` records the time even when the call raises.
          `,
          code: py`
            import time
            from functools import wraps

            def timed(func):
                @wraps(func)
                def wrapper(*args, **kwargs):
                    start = time.perf_counter()
                    try:
                        return func(*args, **kwargs)
                    finally:
                        took = time.perf_counter() - start
                        wrapper.times.append(took)
                wrapper.times = []
                return wrapper

            @timed
            def crunch(n):
                return sum(i * i for i in range(n))

            crunch(10_000)
            crunch(20_000)
            print(len(crunch.times))
            print(all(t >= 0 for t in crunch.times))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def a(func):
                def wrapper():
                    return "a(" + func() + ")"
                return wrapper

            def b(func):
                def wrapper():
                    return "b(" + func() + ")"
                return wrapper

            @a
            @b
            def core():
                return "x"

            print(core())
          `,
          answer: 'a(b(x))',
          explain: '`core = a(b(core))`. Calling it enters `a`\'s wrapper first, which calls `b`\'s wrapper, which calls the real `core`. The results are wrapped on the way back out, so the closest decorator ends up innermost.',
        },
        {
          type: 'code',
          title: 'Memoize by hand',
          prompt: md`
            Build your own \`@cache\`. Write \`memoize(func)\`: results are stored in a dict keyed by the **tuple of positional arguments**, and each distinct input is computed only once. Expose that dict as \`wrapper.cache\`, and keep the name with \`wraps\`.

            \`\`\`python
            @memoize
            def fib(n):
                return n if n < 2 else fib(n - 1) + fib(n - 2)

            fib(30)          # instant
            fib.cache[(10,)] # 55
            \`\`\`
          `,
          starter: py`
            from functools import wraps

            def memoize(func):
                pass
          `,
          solution: py`
            from functools import wraps

            def memoize(func):
                cache = {}

                @wraps(func)
                def wrapper(*args):
                    if args not in cache:
                        cache[args] = func(*args)
                    return cache[args]

                wrapper.cache = cache
                return wrapper
          `,
          tests: [
            { code: 'seen = []\n\n@memoize\ndef square(x):\n    seen.append(x)\n    return x * x\n\nassert square(4) == 16\nassert square(4) == 16\nassert seen == [4]', name: 'computes each input once' },
            { code: '@memoize\ndef fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n\nassert fib(30) == 832040\nassert fib.cache[(10,)] == 55', name: 'fib(30) with a cache keyed by args', maxMs: 30 },
            { code: 'hits = []\n\n@memoize\ndef zero(x):\n    hits.append(x)\n    return 0\n\nzero(1)\nzero(1)\nassert hits == [1]', name: 'falsy results are cached too', hidden: true },
            { code: '@memoize\ndef sub(a, b):\n    return a - b\n\nassert sub(5, 2) == 3\nassert sub(5, 3) == 2\nassert sub(2, 5) == -3', name: 'all arguments form the key', hidden: true },
            { code: '@memoize\ndef named(x):\n    return x\n\nassert named.__name__ == "named"', name: 'keeps the name', hidden: true },
          ],
          require: ['decorator'],
          hints: [
            'Create `cache = {}` in `memoize` (once per decorated function), *not* inside the wrapper.',
            '`def wrapper(*args):` and `args` is already a hashable tuple you can use as the key.',
            'Check `if args not in cache:`. Testing `cache.get(args)` treats a stored 0 as missing.',
          ],
          wrong: [
            py`
              from functools import wraps

              def memoize(func):
                  cache = {}

                  @wraps(func)
                  def wrapper(*args):
                      if not cache.get(args):
                          cache[args] = func(*args)
                      return cache[args]

                  wrapper.cache = cache
                  return wrapper
            `,
            py`
              from functools import wraps

              def memoize(func):
                  cache = {}

                  @wraps(func)
                  def wrapper(*args):
                      if args[0] not in cache:
                          cache[args[0]] = func(*args)
                      return cache[args[0]]

                  wrapper.cache = cache
                  return wrapper
            `,
            py`
              from functools import wraps

              def memoize(func):
                  @wraps(func)
                  def wrapper(*args):
                      cache = {}
                      if args not in cache:
                          cache[args] = func(*args)
                      return cache[args]

                  wrapper.cache = {}
                  return wrapper
            `,
          ],
          explain: md`
            The recursion goes through the cache automatically: after decoration, the name \`fib\` *is* the wrapper, so \`fib(n - 1)\` inside the body hits the cache too. The \`cache.get\` bug is subtle and common: \`0\`, \`""\` and \`None\` are falsy, so they get recomputed every time. \`functools.cache\` also handles keyword arguments and is written in C, so prefer it in real code. Writing it by hand is a favourite interview warm-up.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u10-l6',
      title: 'Context Managers & functools',
      summary: 'Guaranteed setup and cleanup with `with`, plus partial and reduce.',
      steps: [
        {
          type: 'learn',
          title: 'with, revisited',
          body: md`
            \`with open(p) as f:\` guarantees \`f.close()\` even if the block raises. Any object with \`__enter__\` and \`__exit__\` works:

            1. \`__enter__()\` runs first, and its return value goes to \`as\`.
            2. The block runs.
            3. \`__exit__(exc_type, exc, tb)\` **always** runs: with the exception's details, or three \`None\`s.

            If \`__exit__\` returns \`True\`, the exception is swallowed. \`None\` or \`False\` lets it propagate.
          `,
          code: py`
            class Tracer:
                def __enter__(self):
                    print("enter")
                    return self

                def __exit__(self, exc_type, exc, tb):
                    if exc_type:
                        print("exit with", exc_type.__name__)
                    else:
                        print("exit cleanly")
                    return False

            with Tracer():
                print("body")

            try:
                with Tracer():
                    1 / 0
            except ZeroDivisionError:
                print("caught outside")
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            class Quiet:
                def __enter__(self):
                    return "res"

                def __exit__(self, *exc):
                    print("cleanup")
                    return True

            with Quiet() as r:
                print(r)
                raise ValueError("boom")
                print("never")
            print("after")
          `,
          answer: 'res\ncleanup\nafter',
          explain: '`as r` receives what `__enter__` returned. The `raise` skips the rest of the block, `__exit__` runs, and because it returns `True` the error is swallowed, so the program continues with "after". Swallowing everything like this is usually a bad idea.',
        },
        {
          type: 'code',
          title: 'Transaction with rollback',
          prompt: md`
            Write a class context manager \`Transaction(data)\` for a dict:

            - on enter, take a snapshot (a copy) of \`data\` and return \`data\` itself;
            - if the block **raises**, restore \`data\` to the snapshot **in place** (callers hold a reference to that same dict), then let the exception propagate;
            - if the block succeeds, keep the changes.

            \`\`\`python
            stock = {"mug": 10}
            with Transaction(stock) as s:
                s["mug"] -= 3
                raise ValueError("payment failed")
            # ValueError propagates, stock is {"mug": 10} again
            \`\`\`
          `,
          starter: py`
            class Transaction:
                def __init__(self, data):
                    self.data = data
          `,
          solution: py`
            class Transaction:
                def __init__(self, data):
                    self.data = data

                def __enter__(self):
                    self.snapshot = dict(self.data)
                    return self.data

                def __exit__(self, exc_type, exc, tb):
                    if exc_type is not None:
                        self.data.clear()
                        self.data.update(self.snapshot)
                    return False
          `,
          tests: [
            { code: 'data = {"a": 10}\nwith Transaction(data):\n    data["a"] = 5\nassert data == {"a": 5}', name: 'success keeps the changes' },
            { code: 'data = {"a": 10}\ntry:\n    with Transaction(data):\n        data["a"] = 0\n        data["b"] = 1\n        raise ValueError("bad row")\nexcept ValueError:\n    pass\nassert data == {"a": 10}', name: 'an error rolls back' },
            { code: 'caught = False\ntry:\n    with Transaction({}):\n        raise KeyError("x")\nexcept KeyError:\n    caught = True\nassert caught', name: 'the exception still propagates' },
            { code: 'd = {"k": 1}\nwith Transaction(d) as t:\n    assert t is d', name: 'as gives the same dict', hidden: true },
            { code: 'd = {"k": 1}\nalias = d\ntry:\n    with Transaction(d) as t:\n        del t["k"]\n        raise RuntimeError\nexcept RuntimeError:\n    pass\nassert alias == {"k": 1}', name: 'restores in place', hidden: true },
          ],
          hints: [
            '`__enter__`: store `self.snapshot = dict(self.data)` and return `self.data`.',
            '`__exit__(self, exc_type, exc, tb)`: if `exc_type` is not None, restore with `clear()` and `update()`.',
            'Return `False` so the exception keeps going.',
          ],
          wrong: [
            py`
              class Transaction:
                  def __init__(self, data):
                      self.data = data

                  def __enter__(self):
                      self.snapshot = dict(self.data)
                      return self.data

                  def __exit__(self, exc_type, exc, tb):
                      if exc_type is not None:
                          self.data = self.snapshot
                      return False
            `,
            py`
              class Transaction:
                  def __init__(self, data):
                      self.data = data

                  def __enter__(self):
                      self.snapshot = dict(self.data)
                      return self.data

                  def __exit__(self, exc_type, exc, tb):
                      if exc_type is not None:
                          self.data.clear()
                          self.data.update(self.snapshot)
                      return True
            `,
            py`
              class Transaction:
                  def __init__(self, data):
                      self.data = data

                  def __enter__(self):
                      self.snapshot = self.data
                      return self.data

                  def __exit__(self, exc_type, exc, tb):
                      if exc_type is not None:
                          self.data.clear()
                          self.data.update(self.snapshot)
                      return False
            `,
          ],
          explain: md`
            This is how database transactions behave: all or nothing. Two subtle traps: \`self.snapshot = self.data\` is an *alias*, not a copy (Unit 5), and \`self.data = self.snapshot\` only rebinds the context manager's attribute while the caller's dict stays broken. Mutate in place with \`clear()\` + \`update()\`. Returning \`True\` would hide the very error that caused the rollback.
          `,
        },
        {
          type: 'learn',
          title: '@contextmanager and suppress',
          body: md`
            \`contextlib.contextmanager\` turns a generator into a context manager. The code before \`yield\` is the enter part, the yielded value goes to \`as\`, and the code after \`yield\` is the exit part. Put the \`yield\` in \`try/finally\` so cleanup runs even when the block raises.

            \`with suppress(FileNotFoundError):\` is a tidy \`try/except: pass\` for errors you **expect and don't care about**. Never suppress a broad \`Exception\`: that hides real bugs.
          `,
          code: py`
            from contextlib import contextmanager, suppress

            @contextmanager
            def tag(name):
                print(f"<{name}>")
                try:
                    yield name.upper()
                finally:
                    print(f"</{name}>")

            with tag("p") as t:
                print("inside", t)

            with suppress(KeyError):
                print({}["missing"])
            print("still running")
          `,
        },
        {
          type: 'choice',
          prompt: 'There is no `try/finally` here. What does this print?',
          code: py`
            from contextlib import contextmanager

            @contextmanager
            def opened(log):
                log.append("open")
                yield
                log.append("close")

            log = []
            try:
                with opened(log):
                    raise KeyError("x")
            except KeyError:
                pass
            print(log)
          `,
          options: ["['open']", "['open', 'close']", '[]', "KeyError: 'x'"],
          answer: 0,
          checkOutput: true,
          explain: 'The exception is re-raised *inside* the generator at the `yield`. With no `try` around it, the generator stops right there, so "close" never runs: a resource leak. Wrap the `yield` in `try/finally`.',
        },
        {
          type: 'blanks',
          prompt: 'Complete a context manager that temporarily changes settings and always restores them.',
          code: py`
            from contextlib import ___

            @contextmanager
            def changed(settings, **new):
                old = dict(settings)
                settings.update(new)
                try:
                    ___
                finally:
                    settings.clear()
                    settings.update(old)
          `,
          bank: ['contextmanager', 'yield', 'return', 'suppress', 'wraps', 'pass'],
          answer: ['contextmanager', 'yield'],
          tests: [
            { code: 's = {"debug": False}\nwith changed(s, debug=True):\n    assert s["debug"] is True\nassert s == {"debug": False}', name: 'changes, then restores' },
            { code: 's = {"x": 1}\ntry:\n    with changed(s, x=2):\n        raise KeyError\nexcept KeyError:\n    pass\nassert s == {"x": 1}', name: 'restores even after an error' },
          ],
          explain: 'The `yield` is the moment the `with` block runs, and `finally` guarantees the restore. Tests use this exact pattern to patch config temporarily (pytest\'s `monkeypatch` and `unittest.mock.patch` work the same way). `return` or `pass` would make it a normal function, not a generator.',
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            from contextlib import suppress

            data = {"a": 1}
            with suppress(KeyError):
                print(data["a"])
                print(data["b"])
                print("not reached")
            print("done")
          `,
          answer: '1\ndone',
          explain: '`suppress` doesn\'t skip just the failing line: the **whole rest of the block** is abandoned at the first `KeyError`, exactly as with `try/except`. Execution continues after the `with`.',
        },
        {
          type: 'code',
          title: 'Pipeline step logger',
          prompt: md`
            Write \`step(log, name)\` with \`@contextmanager\` to log the stages of a data job:

            - on entry, append \`"start <name>"\`;
            - on success, append \`"end <name>"\`;
            - on an exception, append \`"fail <name>: <ExceptionType>"\` and **re-raise** it.

            \`\`\`python
            log = []
            with step(log, "load"):
                pass
            # log == ["start load", "end load"]
            with step(log, "parse"):
                int("x")
            # ValueError propagates, and log ends with
            # "fail parse: ValueError"
            \`\`\`
          `,
          starter: py`
            from contextlib import contextmanager

            def step(log, name):
                pass
          `,
          solution: py`
            from contextlib import contextmanager

            @contextmanager
            def step(log, name):
                log.append(f"start {name}")
                try:
                    yield
                except Exception as e:
                    kind = type(e).__name__
                    log.append(f"fail {name}: {kind}")
                    raise
                log.append(f"end {name}")
          `,
          tests: [
            { code: 'log = []\nwith step(log, "load"):\n    pass\nassert log == ["start load", "end load"]', name: 'logs start and end' },
            { code: 'log = []\ntry:\n    with step(log, "parse"):\n        int("x")\nexcept ValueError:\n    pass\nassert log == ["start parse", "fail parse: ValueError"]', name: 'logs the failure type' },
            { code: 'caught = False\ntry:\n    with step([], "x"):\n        raise KeyError("k")\nexcept KeyError:\n    caught = True\nassert caught', name: 're-raises the exception' },
            { code: 'log = []\nwith step(log, "a"):\n    with step(log, "b"):\n        pass\nassert log == ["start a", "start b", "end b", "end a"]', name: 'nested steps', hidden: true },
          ],
          require: ['contextmanager', 'yield'],
          hints: [
            'Decorate with `@contextmanager` and `yield` exactly once.',
            'Wrap the `yield` in `try` / `except Exception as e:` to see failures.',
            'A bare `raise` in the `except` block passes the error on. Without it, the error is swallowed.',
          ],
          wrong: [
            py`
              from contextlib import contextmanager

              @contextmanager
              def step(log, name):
                  log.append(f"start {name}")
                  try:
                      yield
                  except Exception as e:
                      kind = type(e).__name__
                      log.append(f"fail {name}: {kind}")
                  log.append(f"end {name}")
            `,
            py`
              from contextlib import contextmanager

              @contextmanager
              def step(log, name):
                  log.append(f"start {name}")
                  try:
                      yield
                  finally:
                      log.append(f"end {name}")
            `,
          ],
          explain: md`
            An exception in the \`with\` block is thrown into the generator **at the \`yield\`**, so a \`try\` around it sees it. If the generator handles it and finishes normally, \`contextmanager\` treats the error as handled and swallows it. That's why the bare \`raise\` is essential. Workflow orchestrators like Airflow wrap every task in this kind of start/end/fail bookkeeping.
          `,
        },
        {
          type: 'learn',
          title: 'functools.partial',
          body: md`
            \`partial(f, *args, **kwargs)\` returns a new function with some arguments already filled in. Later calls add the rest, and they can still override the keyword ones.

            It's handy for callbacks and for \`map\`/\`sorted\` keys, where you need a one-argument function but have a more general one. A partial can also be a cleaner replacement for a \`lambda\` that just fixes an argument.
          `,
          code: py`
            from functools import partial

            def price_with_tax(amount, rate):
                return round(amount * (1 + rate), 2)

            de_price = partial(price_with_tax, rate=0.19)
            hr_price = partial(price_with_tax, rate=0.25)
            print(de_price(100), hr_price(100))

            from_binary = partial(int, base=2)
            print(list(map(from_binary, ["101", "11"])))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            from functools import partial

            def scale(x, factor, offset=0):
                return x * factor + offset

            double = partial(scale, factor=2)
            to_f = partial(scale, factor=1.8, offset=32)
            print(double(21), to_f(100))
            print(double(5, offset=1))
          `,
          answer: '42 212.0\n11',
          explain: '`double(21)` is `scale(21, factor=2)`: 42. `to_f(100)` is 100 · 1.8 + 32 = 212.0 (a float because 1.8 is). Extra keyword arguments at call time are added to the pre-filled ones: `scale(5, factor=2, offset=1)` = 11.',
        },
        {
          type: 'learn',
          title: 'reduce, and when not to',
          body: md`
            \`reduce(f, items, start)\` folds a sequence into one value: \`f(f(f(start, a), b), c)\`. It's the "reduce" in MapReduce.

            But most reductions already have a clearer built-in: \`sum\`, \`max\`, \`min\`, \`any\`, \`all\`, \`"".join\`, \`math.prod\`. Reach for \`reduce\` only when nothing fits (merging dicts, composing functions), and **always pass a start value** so empty input works.
          `,
          code: py`
            from functools import reduce

            nums = [3, 1, 4, 1, 5]
            print(reduce(lambda a, b: a + b, nums, 0))
            print(sum(nums))    # same, clearer, faster

            configs = [{"a": 1}, {"b": 2}, {"a": 3}]
            merged = reduce(lambda acc, d: {**acc, **d},
                            configs, {})
            print(merged)
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            from functools import reduce

            print(reduce(lambda a, b: a * b, []))
          `,
          options: ['TypeError: reduce() of empty iterable with no initial value', '0', '1', 'None'],
          answer: 0,
          checkOutput: true,
          explain: 'Without a start value, `reduce` uses the first item as the start, and an empty list has none. `reduce(lambda a, b: a * b, [], 1)` returns 1, and `math.prod([])` is 1 too. Data pipelines hit empty partitions all the time, so always pass the start value.',
        },
        {
          type: 'code',
          title: 'Compose a pipeline',
          prompt: md`
            Write \`compose(*funcs)\`, which returns **one** function that applies \`funcs\` **left to right**: \`compose(f, g)(x)\` is \`g(f(x))\`. \`compose()\` with no functions returns its input unchanged. Use \`functools.reduce\`.

            \`\`\`python
            clean = compose(str.strip, str.lower)
            clean("  Hi ")      # "hi"
            compose(lambda x: x + 1, lambda x: x * 2)(3)   # 8
            \`\`\`
          `,
          starter: py`
            from functools import reduce

            def compose(*funcs):
                pass
          `,
          solution: py`
            from functools import reduce

            def apply(value, f):
                return f(value)

            def compose(*funcs):
                def run(x):
                    return reduce(apply, funcs, x)
                return run
          `,
          tests: [
            { call: 'compose(lambda x: x + 1, lambda x: x * 2)(3)', expect: '8', name: 'left to right' },
            { call: 'compose(str.strip, str.lower)("  Hi ")', expect: '"hi"' },
            { call: 'compose()(5)', expect: '5', name: 'no functions = identity' },
            { code: 'from functools import partial\nto_int_pow = compose(int, partial(pow, 2))\nassert to_int_pow("10") == 1024', name: 'works with partial', hidden: true },
            { code: 'f = compose(abs, str)\nassert f(-3) == "3" and f(4) == "4"', name: 'reusable', hidden: true },
          ],
          require: ['reduce'],
          hints: [
            'Return an inner function `run(x)` that does the work.',
            'The running value starts at `x`, and each step applies the next function to it: `def apply(value, f): return f(value)` is the reduce function.',
            'Pass `x` as the start value so `compose()` works.',
          ],
          wrong: [
            py`
              from functools import reduce

              def compose(*funcs):
                  def run(x):
                      return reduce(lambda acc, f: f(acc),
                                    reversed(funcs), x)
                  return run
            `,
            py`
              from functools import reduce

              def compose(*funcs):
                  return reduce(lambda f, g: lambda x: g(f(x)), funcs)
            `,
          ],
          explain: md`
            Here \`reduce\` earns its place: the accumulator is the value flowing through the pipeline, and no built-in does that. The second wrong answer composes functions directly, which is elegant but crashes on an empty \`funcs\` because it has no start value. Mathematical composition (f ∘ g) runs right to left, so name the direction in your docstring.
          `,
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u10-exam',
    title: 'Advanced Functions Exam',
    minutes: 30,
    intro: 'Trace generators, closures, decorators and context managers, then write recursive, lazy and decorator code under time pressure. No hints and no feedback until you submit.',
    questions: [
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          def make_counter():
              count = 0
              def inc():
                  nonlocal count
                  count += 1
                  return count
              return inc

          def gen(f):
              while True:
                  v = f()
                  if v > 3:
                      return
                  yield v * 10

          c = make_counter()
          print(list(gen(c)), c())
        `,
        answer: '[10, 20, 30] 5',
        explain: 'The generator calls the shared counter on every step: 1, 2, 3 are yielded as 10, 20, 30, and the 4th call ends the generator. The counter remembers 4 through its closure, so `c()` gives 5.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          def deco(tag):
              print("make", tag)
              def wrap(f):
                  print("wrap", tag)
                  def inner():
                      return tag + f()
                  return inner
              return wrap

          @deco("a")
          @deco("b")
          def f():
              return "!"

          print(f())
        `,
        options: [
          'make a\nmake b\nwrap b\nwrap a\nab!',
          'make b\nwrap b\nmake a\nwrap a\nab!',
          'make a\nwrap a\nmake b\nwrap b\nab!',
          'make a\nmake b\nwrap a\nwrap b\nba!',
        ],
        answer: 0,
        checkOutput: true,
        explain: 'The decorator *expressions* `deco("a")` and `deco("b")` are evaluated top to bottom first. Then the resulting decorators are applied bottom-up: `wrap b` wraps `f` first, then `wrap a`. The outer `inner` adds "a" before the inner result "b!".',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          nums = [1, 2, 3]
          g = (n * 10 for n in nums)
          nums.append(4)
          print(next(g))
          nums = [7]
          print(list(g))
        `,
        answer: '10\n[20, 30, 40]',
        explain: 'The generator grabs the *list object* when it is created, and pulls items lazily. Appending to that same list is visible to it. Rebinding the name `nums` to a new list is not: the generator still holds the old one.',
      },
      {
        type: 'choice',
        prompt: 'How many times does the body of `f` run?',
        code: py`
          from functools import lru_cache

          calls = 0

          @lru_cache(maxsize=None)
          def f(n):
              global calls
              calls += 1
              return 1 if n < 2 else f(n - 1) + f(n - 2)

          f(10)
          f(12)
          print(calls)
        `,
        options: ['13', '11', '24', '2'],
        answer: 0,
        checkOutput: true,
        explain: '`f(10)` computes each of 0…10 once: 11 calls. `f(12)` then only needs `f(12)` and `f(11)`, because everything below is already cached: 2 more, 13 in total.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          from itertools import groupby, accumulate

          groups = list(groupby("aaabba"))
          print([(k, len(list(g))) for k, g in groups])
          print(list(accumulate([3, 1, 4], max)))
        `,
        answer: "[('a', 0), ('b', 0), ('a', 0)]\n[3, 3, 4]",
        explain: 'Each group iterator is only valid until `groupby` moves on, and `list(groupby(...))` moved through all of them before any group was read. So every group is empty. The keys are still right (runs a, b, a). `accumulate(..., max)` is the running maximum.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          from contextlib import contextmanager

          @contextmanager
          def guard(log):
              log.append("in")
              try:
                  yield
              except ValueError:
                  log.append("handled")
              log.append("out")

          log = []
          with guard(log):
              raise ValueError
          with guard(log):
              pass
          print(log)
        `,
        options: [
          "['in', 'handled', 'out', 'in', 'out']",
          "['in', 'handled', 'in', 'out']",
          "['in', 'out', 'in', 'out']",
          'ValueError',
        ],
        answer: 0,
        checkOutput: true,
        explain: 'The `ValueError` is thrown into the generator at the `yield`. It is caught there, so the generator carries on to "out" and finishes normally, and `contextmanager` therefore swallows the error. The second block runs cleanly: in, out.',
      },
      {
        type: 'blanks',
        prompt: 'Complete `once`: the function body runs on the first call only, and later calls return the first result.',
        code: py`
          from functools import ___

          def once(func):
              @wraps(func)
              def wrapper(*args, **kwargs):
                  if not wrapper.done:
                      wrapper.done = True
                      wrapper.result = func(*args, **kwargs)
                  return wrapper.result
              wrapper.done = ___
              return wrapper
        `,
        bank: ['wraps', 'False', 'True', 'partial', 'reduce', 'cache'],
        answer: ['wraps', 'False'],
        tests: [
          { code: 'calls = []\n\n@once\ndef init():\n    calls.append(1)\n    return "ready"\n\nassert init() == "ready"\nassert init() == "ready"\nassert calls == [1]\nassert init.__name__ == "init"', name: 'runs once, keeps the name' },
        ],
        explain: '`done` starts as `False`, so the first call runs the body and stores the result. `wraps` must be imported before `@wraps` can be used. This is the classic "initialise lazily, exactly once" pattern (for config, connections, models).',
      },
      {
        type: 'code',
        title: 'Flatten a nested dict',
        prompt: md`
          Write a **recursive** \`flatten_dict(d, sep=".")\` that turns nested dicts into one flat dict whose keys are the joined paths. Keys are converted with \`str\`. Values that aren't dicts (including lists) are kept as they are, and empty nested dicts disappear. Don't modify the input.

          \`\`\`python
          flatten_dict({"a": {"b": 1, "c": {"d": 2}}, "e": 3})
          # {"a.b": 1, "a.c.d": 2, "e": 3}
          flatten_dict({"x": {"y": 0}}, sep="/")
          # {"x/y": 0}
          \`\`\`
        `,
        starter: py`
          def flatten_dict(d, sep="."):
              pass
        `,
        solution: py`
          def flatten_dict(d, sep=".", prefix=""):
              out = {}
              for k, v in d.items():
                  key = str(k)
                  if prefix:
                      key = prefix + sep + key
                  if isinstance(v, dict):
                      out.update(flatten_dict(v, sep, key))
                  else:
                      out[key] = v
              return out
        `,
        tests: [
          { call: 'flatten_dict({"a": {"b": 1, "c": {"d": 2}}, "e": 3})', expect: '{"a.b": 1, "a.c.d": 2, "e": 3}' },
          { call: 'flatten_dict({})', expect: '{}' },
          { call: 'flatten_dict({"x": {"y": {"z": 0}}}, sep="/")', expect: '{"x/y/z": 0}' },
          { call: 'flatten_dict({"a": {}, "b": 1})', expect: '{"b": 1}', hidden: true, name: 'empty dicts disappear' },
          { call: 'flatten_dict({"tags": ["x", "y"], "u": {"ids": [1]}})', expect: '{"tags": ["x", "y"], "u.ids": [1]}', hidden: true, name: 'lists are values' },
          { call: 'flatten_dict({1: {2: "x"}})', expect: '{"1.2": "x"}', hidden: true, name: 'non-string keys' },
          { code: 'd = {"a": {"b": 1}}\nflatten_dict(d)\nassert d == {"a": {"b": 1}}', name: 'input is unchanged', hidden: true },
          { code: 'd = 1\nfor _ in range(60):\n    d = {"k": d}\nassert flatten_dict(d) == {".".join(["k"] * 60): 1}', name: '60 levels deep', hidden: true },
        ],
        require: ['recursion'],
        wrong: [
          py`
            def flatten_dict(d, sep="."):
                out = {}
                for k, v in d.items():
                    if isinstance(v, dict):
                        for k2, v2 in v.items():
                            out[f"{k}{sep}{k2}"] = v2
                    else:
                        out[str(k)] = v
                return out
          `,
          py`
            def flatten_dict(d, sep=".", prefix=""):
                out = {}
                for k, v in d.items():
                    key = f"{prefix}{sep}{k}"
                    if isinstance(v, dict):
                        out.update(flatten_dict(v, sep, key))
                    else:
                        out[key] = v
                return out
          `,
          py`
            def flatten_dict(d, sep=".", prefix=""):
                out = {}
                for k, v in d.items():
                    key = prefix + sep + k if prefix else k
                    if isinstance(v, dict):
                        out.update(flatten_dict(v, sep, key))
                    else:
                        out[key] = v
                return out
          `,
        ],
        explain: md`
          Passing the **path so far** down as an argument is the standard way to build path-like keys in recursion. The root has no prefix, so it gets no leading separator. This is exactly what \`pandas.json_normalize\` does to nested API responses before they become table columns, and a frequent data-engineering interview task.
        `,
      },
      {
        type: 'code',
        title: 'Chunked generator',
        prompt: md`
          Write \`chunked(iterable, size)\` that lazily yields **lists** of \`size\` consecutive items (the last one may be shorter). It must work on huge or endless iterators, pulling items only as needed.

          An invalid \`size\` (below 1) must raise \`ValueError\` **immediately when \`chunked\` is called**, not later on the first \`next()\`.

          \`\`\`python
          list(chunked(range(7), 3))
          # [[0, 1, 2], [3, 4, 5], [6]]
          chunked([1, 2], 0)   # ValueError right away
          \`\`\`
        `,
        setup: py`
          pulled = 0

          def stream(n=200_000):
              global pulled
              for i in range(n):
                  pulled += 1
                  yield i
        `,
        starter: py`
          def chunked(iterable, size):
              pass
        `,
        solution: py`
          def chunked(iterable, size):
              if size < 1:
                  raise ValueError("size must be >= 1")
              return _chunks(iterable, size)


          def _chunks(iterable, size):
              batch = []
              for x in iterable:
                  batch.append(x)
                  if len(batch) == size:
                      yield batch
                      batch = []
              if batch:
                  yield batch
        `,
        tests: [
          { call: 'list(chunked(range(7), 3))', expect: '[[0, 1, 2], [3, 4, 5], [6]]' },
          { call: 'list(chunked([], 2))', expect: '[]' },
          { call: 'list(chunked("abcd", 2))', expect: '[["a", "b"], ["c", "d"]]' },
          { call: 'chunked([1, 2], 0)', raises: 'ValueError', hidden: true, name: 'raises as soon as it is called' },
          { code: 'pulled = 0\ng = chunked(stream(), 2)\nassert next(g) == [0, 1]\nassert pulled <= 3', name: 'pulls items lazily', hidden: true },
          { code: 'a, b = chunked([1, 2, 3, 4], 2)\na.append(9)\nassert b == [3, 4]', name: 'every chunk is a separate list', hidden: true },
          { call: 'list(chunked(range(5), 10))', expect: '[[0, 1, 2, 3, 4]]', hidden: true },
        ],
        wrong: [
          py`
            def chunked(iterable, size):
                if size < 1:
                    raise ValueError("size must be >= 1")
                batch = []
                for x in iterable:
                    batch.append(x)
                    if len(batch) == size:
                        yield batch
                        batch = []
                if batch:
                    yield batch
          `,
          py`
            def chunked(iterable, size):
                if size < 1:
                    raise ValueError("size must be >= 1")
                return _chunks(iterable, size)


            def _chunks(iterable, size):
                batch = []
                for x in iterable:
                    batch.append(x)
                    if len(batch) == size:
                        yield batch
                        batch.clear()
                if batch:
                    yield batch
          `,
          py`
            def chunked(iterable, size):
                if size < 1:
                    raise ValueError("size must be >= 1")
                items = list(iterable)
                return [items[i:i + size]
                        for i in range(0, len(items), size)]
          `,
        ],
        explain: md`
          A function containing \`yield\` doesn't run *any* of its body until the first \`next()\`, so validation inside a generator is lazy. Splitting it into an eager wrapper plus an inner generator is the standard fix (\`itertools.batched\` behaves this way). \`batch.clear()\` is the sneaky bug: it empties the list you just handed out. Batching is everywhere in data engineering: bulk inserts, API pagination, mini-batches for ML training.
        `,
      },
      {
        type: 'code',
        title: 'Production-grade retry',
        prompt: md`
          Write \`retry(times=3, on=(Exception,), log=None)\`:

          - Only exceptions that are instances of a class in \`on\` are retried. Any other exception propagates **immediately**, without a retry.
          - If \`log\` is a list, append \`(attempt, "ExceptionName")\` for every caught failure, with attempts counted from 1.
          - After \`times\` failed attempts, re-raise the last exception.
          - \`times < 1\` raises \`ValueError\` as soon as \`retry(...)\` is called.
          - Arguments pass through, and the name is kept.

          The setup has \`make_flaky(k, exc=ConnectionError)\`, which raises \`exc\` on its first \`k\` calls, then returns \`"ok"\`, and counts its calls in \`.attempts\`.
        `,
        setup: py`
          def make_flaky(fails, exc=ConnectionError):
              def flaky(*args, **kwargs):
                  flaky.attempts += 1
                  if flaky.attempts <= fails:
                      raise exc("boom")
                  return "ok"
              flaky.attempts = 0
              return flaky
        `,
        starter: py`
          from functools import wraps

          def retry(times=3, on=(Exception,), log=None):
              pass
        `,
        solution: py`
          from functools import wraps

          def retry(times=3, on=(Exception,), log=None):
              if times < 1:
                  raise ValueError("times must be >= 1")

              def decorator(func):
                  @wraps(func)
                  def wrapper(*args, **kwargs):
                      for attempt in range(1, times + 1):
                          try:
                              return func(*args, **kwargs)
                          except on as e:
                              if log is not None:
                                  name = type(e).__name__
                                  log.append((attempt, name))
                              if attempt == times:
                                  raise
                  return wrapper
              return decorator
        `,
        tests: [
          { code: 'log = []\nf = retry(times=3, log=log)(make_flaky(2))\nassert f() == "ok"\nassert log == [(1, "ConnectionError"), (2, "ConnectionError")]', name: 'retries and logs' },
          { code: 'flaky = make_flaky(5, KeyError)\nf = retry(times=3, on=(ConnectionError,))(flaky)\ntry:\n    f()\nexcept KeyError:\n    pass\nassert flaky.attempts == 1', name: 'other errors are not retried' },
          { call: 'retry(times=0)', raises: 'ValueError', hidden: true, name: 'times is validated immediately' },
          { code: 'flaky = make_flaky(9)\nlog = []\ntry:\n    retry(times=2, log=log)(flaky)()\n    ok = False\nexcept ConnectionError:\n    ok = True\nassert ok and flaky.attempts == 2\nassert log == [(1, "ConnectionError"), (2, "ConnectionError")]', name: 'gives up after times attempts', hidden: true },
          { code: 'flaky = make_flaky(1)\nassert retry(on=(OSError,))(flaky)() == "ok"', name: 'subclasses of `on` are retried', hidden: true },
          { code: '@retry(times=2)\ndef fetch(url, timeout=1):\n    return f"{url}:{timeout}"\nassert fetch("u", timeout=5) == "u:5"\nassert fetch.__name__ == "fetch"', name: 'arguments and name', hidden: true },
          { code: 'flaky = make_flaky(2)\nassert retry(times=3)(flaky)() == "ok"', name: 'works without a log', hidden: true },
        ],
        wrong: [
          py`
            from functools import wraps

            def retry(times=3, on=(Exception,), log=None):
                if times < 1:
                    raise ValueError("times must be >= 1")

                def decorator(func):
                    @wraps(func)
                    def wrapper(*args, **kwargs):
                        for attempt in range(1, times + 1):
                            try:
                                return func(*args, **kwargs)
                            except Exception as e:
                                if log is not None:
                                    name = type(e).__name__
                                    log.append((attempt, name))
                                if attempt == times:
                                    raise
                    return wrapper
                return decorator
          `,
          py`
            from functools import wraps

            def retry(times=3, on=(Exception,), log=None):
                def decorator(func):
                    @wraps(func)
                    def wrapper(*args, **kwargs):
                        if times < 1:
                            raise ValueError("times must be >= 1")
                        for attempt in range(1, times + 1):
                            try:
                                return func(*args, **kwargs)
                            except on as e:
                                if log is not None:
                                    name = type(e).__name__
                                    log.append((attempt, name))
                                if attempt == times:
                                    raise
                    return wrapper
                return decorator
          `,
          py`
            from functools import wraps

            def retry(times=3, on=(Exception,), log=None):
                if times < 1:
                    raise ValueError("times must be >= 1")

                def decorator(func):
                    @wraps(func)
                    def wrapper(*args, **kwargs):
                        for attempt in range(1, times + 1):
                            try:
                                return func(*args, **kwargs)
                            except on as e:
                                if attempt == times:
                                    raise
                                if log is not None:
                                    name = type(e).__name__
                                    log.append((attempt, name))
                    return wrapper
                return decorator
          `,
        ],
        explain: md`
          \`except on as e\` works because \`except\` accepts a tuple of classes and matches subclasses, so \`OSError\` covers \`ConnectionError\`. Retrying *everything* is a real production bug: a \`KeyError\` from bad data will never fix itself, and retrying it just multiplies load. Validating \`times\` in the outermost layer makes a misconfiguration fail when the module is imported, not at 3 a.m. on the first failing request.
        `,
      },
    ],
  },
};

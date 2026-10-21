// Interview Simulator: timed, graded mock rounds (see CONTENT_GUIDE.md → Interviews).
import { py, md } from './helpers.js';

// ------------------------------------------------------------------ shared setups

// In-memory SQLite database for the SQL round, loaded from the CSV datasets.
// Empty CSV cells become NULL; column types give SQLite the right affinity.
const SQL_SETUP = py`
  import csv
  import sqlite3
  conn = sqlite3.connect(":memory:")
  _TABLES = {
      "employees.csv": "employees(emp_id INTEGER, name TEXT,"
          " dept_id INTEGER, manager_id INTEGER,"
          " salary INTEGER, hire_date TEXT)",
      "departments.csv": "departments(dept_id INTEGER,"
          " dept_name TEXT, location TEXT)",
      "orders.csv": "orders(order_id INTEGER, user_id INTEGER,"
          " order_date TEXT, product TEXT, category TEXT,"
          " quantity INTEGER, unit_price REAL, country TEXT,"
          " status TEXT)",
      "users.csv": "users(user_id INTEGER, name TEXT,"
          " signup_date TEXT, country TEXT, plan TEXT,"
          " age INTEGER, referrer TEXT)",
      "events.csv": "events(user_id INTEGER, ts TEXT,"
          " event TEXT, device TEXT)",
  }
  for _file, _ddl in _TABLES.items():
      conn.execute("CREATE TABLE " + _ddl)
      with open("data/" + _file) as _fh:
          _rows = list(csv.reader(_fh))[1:]
      _marks = ", ".join("?" * len(_rows[0]))
      conn.executemany(
          "INSERT INTO " + _ddl.split("(")[0] + " VALUES (" + _marks + ")",
          [[v if v != "" else None for v in r] for r in _rows])
  conn.commit()
`;

const SQL_STARTER = py`
  sql = """
  SELECT *
  FROM employees
  LIMIT 5
  """
`;

// ================================================================== rounds

export default {
  id: 'interviews',
  interviews: [
    // ================================================================ 1. phone
    {
      id: 'iv-phone',
      title: 'Python Phone Screen',
      level: 'Medium',
      minutes: 30,
      style: 'Phone screen',
      intro: md`
        The first technical call at most big-tech companies: 30 minutes in a shared editor with one engineer. Two quick Python warm-ups, then three coding problems.

        **What the interviewer scores**
        - **Correctness**: code that works on the first run, edge cases included (empty input, ties, deep nesting).
        - **Complexity**: say the Big-O before you code, then hit it. Inputs of 10⁵ items rule out O(n²).
        - **Communication**: restate the problem, name your approach, walk through an example.

        **How grading works**: hidden tests check edge cases and speed (some tests have a time limit). You get a grade A+…F and a hiring signal at the end.

        > Tip: about 8 minutes per problem. Run the visible examples first, then think about what the hidden tests will throw at you.
      `,
      questions: [
        {
          type: 'choice',
          points: 2,
          prompt: 'Warm-up: what does this print?',
          code: py`
            def add(item, bucket=[]):
                bucket.append(item)
                return bucket

            add("a")
            print(add("b"))
          `,
          options: ["['a', 'b']", "['b']", 'None', "['b', 'a']"],
          answer: 0,
          checkOutput: true,
          explain: md`
            Default values are evaluated **once**, when \`def\` runs, so every call shares the same list. The fix is the \`None\` sentinel:

            \`\`\`python
            def add(item, bucket=None):
                if bucket is None:
                    bucket = []
            \`\`\`

            Interviewers ask this to check that you know defaults live on the function object. The same bug in a long-running service leaks memory across requests.
          `,
        },
        {
          type: 'choice',
          points: 2,
          prompt: 'Warm-up: what does this print?',
          code: py`
            fns = [lambda: i * 10 for i in range(3)]
            print([f() for f in fns])
          `,
          options: ['[20, 20, 20]', '[0, 10, 20]', '[0, 0, 0]', "NameError: name 'i' is not defined"],
          answer: 0,
          checkOutput: true,
          explain: md`
            Closures are **late-binding**: each lambda looks \`i\` up when it is *called*, and by then the loop has finished with \`i = 2\`. Bind the current value with a default argument (\`lambda i=i: i * 10\`) or use \`functools.partial\`.

            A strong candidate also mentions where it bites in practice: callbacks or tasks created in a loop.
          `,
        },
        {
          type: 'code',
          points: 10,
          title: 'First unique character',
          prompt: md`
            Write \`first_unique(s)\` that returns the **index** of the first character that appears exactly once in \`s\`, or \`-1\` if there is none. Comparison is case-sensitive.

            \`\`\`python
            first_unique("leetcode")      # 0
            first_unique("loveleetcode")  # 2
            first_unique("aabb")          # -1
            \`\`\`

            Constraints: \`0 <= len(s) <= 2 * 10**5\`. Aim for O(n).
          `,
          setup: 'big = "".join(chr(97 + i % 25) for i in range(150_000)) + "z"',
          starter: 'def first_unique(s):\n    pass\n',
          solution: py`
            from collections import Counter

            def first_unique(s):
                counts = Counter(s)
                for i, ch in enumerate(s):
                    if counts[ch] == 1:
                        return i
                return -1
          `,
          tests: [
            { call: 'first_unique("leetcode")', expect: '0' },
            { call: 'first_unique("loveleetcode")', expect: '2' },
            { call: 'first_unique("aabb")', expect: '-1' },
            { call: 'first_unique("")', expect: '-1', hidden: true, name: 'empty string' },
            { call: 'first_unique("z")', expect: '0', hidden: true },
            { call: 'first_unique("aA")', expect: '0', hidden: true, name: 'case-sensitive' },
            { call: 'first_unique("abab")', expect: '-1', hidden: true },
            { call: 'first_unique("xxyzy")', expect: '3', hidden: true },
            { call: 'first_unique(big)', expect: '150000', hidden: true, maxMs: 250, name: '150,001 characters, unique one at the end' },
          ],
          wrong: [
            py`
              def first_unique(s):
                  for i, ch in enumerate(s):
                      if ch not in s[i + 1:]:
                          return i
                  return -1
            `,
            py`
              def first_unique(s):
                  for i, ch in enumerate(s):
                      if s.count(ch) == 1:
                          return i
                  return -1
            `,
            py`
              from collections import Counter

              def first_unique(s):
                  if not s:
                      return -1
                  c = Counter(s)
                  return s.index(min(c, key=c.get))
            `,
          ],
          explain: md`
            **Two passes**: count every character with a hash map, then scan the string again and return the first index whose count is 1. O(n) time, O(k) extra space for k distinct characters.

            Common traps:
            - \`ch not in s[i + 1:]\` only looks *ahead*, so in \`"abab"\` the second \`a\` looks unique. The slice also copies, making it O(n²).
            - \`s.count(ch)\` inside the loop is a full scan per character: 2·10¹⁰ steps at 2·10⁵.

            **What a strong candidate adds**: the streaming follow-up ("characters arrive one by one, report the first unique at any time"). Keep a dict of candidates in arrival order plus a set of repeated characters; the answer is the first key of the dict.
          `,
        },
        {
          type: 'code',
          points: 10,
          title: 'Balanced brackets',
          prompt: md`
            Write \`is_balanced(s)\` that returns \`True\` if every bracket in \`s\` is closed by the matching type, in the right order. Brackets are \`()\`, \`[]\` and \`{}\`. Ignore every other character.

            \`\`\`python
            is_balanced("f(a[0]) + {x}")  # True
            is_balanced("(]")             # False
            is_balanced("(()")            # False
            \`\`\`

            Constraints: \`len(s) <= 2 * 10**5\`. O(n) expected.
          `,
          setup: 'deep = "(" * 35_000 + "[]" + ")" * 35_000',
          starter: 'def is_balanced(s):\n    pass\n',
          solution: py`
            def is_balanced(s):
                pairs = {")": "(", "]": "[", "}": "{"}
                stack = []
                for ch in s:
                    if ch in "([{":
                        stack.append(ch)
                    elif ch in pairs:
                        if not stack or stack.pop() != pairs[ch]:
                            return False
                return not stack
          `,
          tests: [
            { call: 'is_balanced("f(a[0]) + {x}")', expect: 'True' },
            { call: 'is_balanced("(]")', expect: 'False' },
            { call: 'is_balanced("(()")', expect: 'False' },
            { call: 'is_balanced("")', expect: 'True', hidden: true, name: 'empty string' },
            { call: 'is_balanced("no brackets")', expect: 'True', hidden: true },
            { call: 'is_balanced("]")', expect: 'False', hidden: true, name: 'closing bracket first' },
            { call: 'is_balanced(")(")', expect: 'False', hidden: true },
            { call: 'is_balanced("([)]")', expect: 'False', hidden: true, name: 'crossed pairs' },
            { call: 'is_balanced("{[()()]}")', expect: 'True', hidden: true },
            { call: 'is_balanced(deep)', expect: 'True', hidden: true, maxMs: 150, name: '35,000 nested levels' },
          ],
          wrong: [
            py`
              def is_balanced(s):
                  return all(s.count(o) == s.count(c)
                             for o, c in ["()", "[]", "{}"])
            `,
            py`
              def is_balanced(s):
                  pairs = {")": "(", "]": "[", "}": "{"}
                  stack = []
                  for ch in s:
                      if ch in "([{":
                          stack.append(ch)
                      elif ch in pairs:
                          if not stack or stack.pop() != pairs[ch]:
                              return False
                  return True
            `,
            py`
              def is_balanced(s):
                  s = "".join(ch for ch in s if ch in "()[]{}")
                  while "()" in s or "[]" in s or "{}" in s:
                      s = s.replace("()", "")
                      s = s.replace("[]", "")
                      s = s.replace("{}", "")
                  return s == ""
            `,
          ],
          explain: md`
            **Stack**: push opening brackets; on a closing bracket the top of the stack must be its partner. At the end the stack must be empty. O(n) time, O(n) space in the worst case (all openers).

            Why the alternatives fail:
            - Counting brackets ignores *order*: \`"([)]"\` and \`")("\` have equal counts.
            - Forgetting \`return not stack\` accepts \`"(()"\`.
            - Repeatedly deleting \`"()"\` pairs is O(n²): 35,000 nested levels need 35,000 passes over the string.

            A strong candidate checks the empty-stack case *before* popping (the \`"]"\` test) and mentions the real uses: parsers, JSON/config validators, matching tags in templates.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Flatten a deeply nested list',
          prompt: md`
            Write \`flatten(xs)\` that returns a new flat list with every non-list value from the nested list \`xs\`, in left-to-right order.

            - Only \`list\` counts as nesting. Strings, tuples, dicts and \`None\` are plain values.
            - Don't modify \`xs\`.
            - Nesting can be **1,500 levels deep**, deeper than Python's default recursion limit (1,000).

            \`\`\`python
            flatten([1, [2, [3, [4]], 5], []])
            # [1, 2, 3, 4, 5]
            flatten(["ab", ("c", [1])])
            # ['ab', ('c', [1])]
            \`\`\`
          `,
          setup: py`
            deep = [0]
            for _i in range(1, 1_500):
                deep = [_i, list(range(15)), deep]
          `,
          starter: 'def flatten(xs):\n    pass\n',
          solution: py`
            def flatten(xs):
                out = []
                stack = [iter(xs)]
                while stack:
                    for x in stack[-1]:
                        if isinstance(x, list):
                            stack.append(iter(x))
                            break
                        out.append(x)
                    else:  # this level is exhausted
                        stack.pop()
                return out
          `,
          tests: [
            { call: 'flatten([1, [2, [3, [4]], 5], []])', expect: '[1, 2, 3, 4, 5]' },
            { call: 'flatten(["ab", ("c", [1])])', expect: '["ab", ("c", [1])]' },
            { call: 'flatten([])', expect: '[]', hidden: true },
            { call: 'flatten([[[]], []])', expect: '[]', hidden: true, name: 'only empty lists' },
            { call: 'flatten([None, [0, [False, ""]]])', expect: '[None, 0, False, ""]', hidden: true, name: 'falsy values are kept' },
            { call: 'flatten([{"a": [1]}, [(2, [3])]])', expect: '[{"a": [1]}, (2, [3])]', hidden: true, name: 'dicts and tuples are values' },
            { code: 'x = [1, [2, [3]]]\nflatten(x)\nassert x == [1, [2, [3]]]', hidden: true, name: 'input is not modified' },
            { call: 'flatten(deep)', expect: '[v for i in range(1499, 0, -1) for v in [i, *range(15)]] + [0]', hidden: true, maxMs: 150, name: '1,500 levels deep, 24,000 values' },
          ],
          wrong: [
            py`
              def flatten(xs):
                  out = []
                  for x in xs:
                      if isinstance(x, list):
                          out.extend(flatten(x))
                      else:
                          out.append(x)
                  return out
            `,
            py`
              def flatten(xs):
                  out = []
                  stack = [iter(xs)]
                  while stack:
                      for x in stack[-1]:
                          if isinstance(x, (list, tuple)):
                              stack.append(iter(x))
                              break
                          out.append(x)
                      else:
                          stack.pop()
                  return out
            `,
            py`
              def flatten(xs):
                  while any(isinstance(x, list) for x in xs):
                      xs = [y for x in xs
                            for y in (x if isinstance(x, list) else [x])]
                  return list(xs)
            `,
          ],
          explain: md`
            The recursive version is what most people write first, and it's the right *idea*, but 1,500 levels blow the recursion limit (\`RecursionError\`). The fix is to manage the stack yourself: a **stack of iterators**. Each iterator remembers where it stopped in its list; on a nested list, push its iterator and continue there; when one runs out, pop it.

            O(n) time for n values plus lists, O(d) extra space for depth d. Flattening one level per pass (the \`while any(...)\` version) is O(n·d): 1,500 passes over a growing list for the deep test.

            **What a strong candidate says**: "Recursion depth is a real constraint in Python (no tail-call optimisation), so I'll convert to an explicit stack." Mentioning a generator version (\`yield\` values lazily) for huge inputs is a bonus. Also, \`isinstance(x, list)\` matters: checking for "anything iterable" would recurse into strings forever, since \`"a"[0]\` is \`"a"\`.
          `,
        },
      ],
    },

    // ================================================================ 2. arrays
    {
      id: 'iv-arrays',
      title: 'Coding Round: Arrays & Hashing',
      level: 'Medium',
      minutes: 45,
      style: 'Onsite coding',
      intro: md`
        Arrays and hash maps are the most common onsite category at big-tech companies. Expect one complexity question, then four problems where the brute force is easy and the interview is about finding the **O(n)** idea.

        **What the interviewer scores**
        - You state the brute force and its cost first, then improve it: "O(n²) with two loops; with a hash map I can do one pass."
        - Edge cases without being told: empty input, duplicates, negatives, zeros, ties.
        - Clean, readable code with honest complexity.

        **How grading works**: hidden tests include inputs of 10⁴–2·10⁵ elements with time limits. A correct O(n²) solution still fails those, just like in a real interview.

        > Tip: before coding, ask yourself "what do I need to look up in O(1)?" That's your dict or set.
      `,
      questions: [
        {
          type: 'choice',
          points: 3,
          prompt: 'What are the time and extra-memory costs of this function for a list of n items?',
          code: py`
            def has_dupes(nums):
                for i, x in enumerate(nums):
                    if x in nums[i + 1:]:
                        return True
                return False
          `,
          options: ['O(n²) time, O(n) extra memory', 'O(n²) time, O(1) extra memory', 'O(n) time, O(n) extra memory', 'O(n log n) time, O(1) memory'],
          answer: 0,
          explain: md`
            \`x in list\` is a linear scan, done n times → O(n²). The trap is memory: \`nums[i + 1:]\` **copies** the rest of the list on every iteration, so O(n) extra memory at a time (and the copying alone is O(n²) work).

            The O(n) answer: \`return len(set(nums)) != len(nums)\`, or a loop that adds to a \`seen\` set and returns early on a repeat.
          `,
        },
        {
          type: 'code',
          points: 10,
          title: 'Top k frequent elements',
          prompt: md`
            Write \`top_k_frequent(nums, k)\` that returns the \`k\` most frequent values in \`nums\`, most frequent first. Break ties by the **smaller value first**, so the answer is unique.

            \`\`\`python
            top_k_frequent([1, 1, 1, 2, 2, 3], 2)
            # [1, 2]
            top_k_frequent([4, 4, 6, 6, 5], 2)
            # [4, 6]
            \`\`\`

            Constraints: \`1 <= len(nums) <= 2 * 10**5\`, \`1 <= k <=\` number of distinct values. Aim for O(n log k).
          `,
          setup: py`
            import random
            random.seed(7)
            big = [random.randrange(5_000) for _ in range(150_000)]
          `,
          starter: 'def top_k_frequent(nums, k):\n    pass\n',
          solution: py`
            import heapq
            from collections import Counter

            def top_k_frequent(nums, k):
                c = Counter(nums)
                return heapq.nsmallest(
                    k, c, key=lambda x: (-c[x], x))
          `,
          tests: [
            { call: 'top_k_frequent([1, 1, 1, 2, 2, 3], 2)', expect: '[1, 2]' },
            { call: 'top_k_frequent([4, 4, 6, 6, 5], 2)', expect: '[4, 6]' },
            { call: 'top_k_frequent([7], 1)', expect: '[7]', hidden: true },
            { call: 'top_k_frequent([3, 1, 2], 3)', expect: '[1, 2, 3]', hidden: true, name: 'all tied' },
            { call: 'top_k_frequent([5, 5, -1, -1, 2], 2)', expect: '[-1, 5]', hidden: true, name: 'tie with a negative value' },
            { call: 'top_k_frequent([2, 2, 1, 1, 1, 3, 3, 3], 2)', expect: '[1, 3]', hidden: true },
            { call: 'top_k_frequent(big, 10)', hidden: true, maxMs: 350, name: '150,000 values, 5,000 distinct' },
          ],
          wrong: [
            py`
              from collections import Counter

              def top_k_frequent(nums, k):
                  return [x for x, _ in Counter(nums).most_common(k)]
            `,
            py`
              from collections import Counter

              def top_k_frequent(nums, k):
                  c = Counter(nums)
                  order = sorted(c, key=lambda x: (c[x], x),
                                 reverse=True)
                  return order[:k]
            `,
            py`
              def top_k_frequent(nums, k):
                  vals = sorted(set(nums),
                                key=lambda x: (-nums.count(x), x))
                  return vals[:k]
            `,
          ],
          explain: md`
            Count with \`Counter\` (O(n)), then take the k best with a heap: \`heapq.nsmallest(k, ..., key=(-count, value))\` is O(u log k) for u distinct values. Sorting all u keys (O(u log u)) is also fine in an interview if you say so. **Bucket sort** by frequency gives O(n).

            The traps:
            - \`most_common\` breaks ties by first appearance, not by value.
            - \`reverse=True\` flips *both* keys, so ties come out largest-first.
            - \`nums.count(x)\` per distinct value is O(n·u).

            **Big-data angle**: on a stream of billions of events you can't keep every count. Interviewers then expect approximate *heavy hitters*: Count-Min Sketch or Misra-Gries, or count per partition and merge (map-reduce).
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Longest consecutive sequence',
          prompt: md`
            Write \`longest_consecutive(nums)\` that returns the length of the longest run of consecutive integers (like 4, 5, 6, 7) that can be formed from the values in \`nums\`. Order in the list doesn't matter, and duplicates count once.

            \`\`\`python
            longest_consecutive([100, 4, 200, 1, 3, 2])
            # 4: the run 1, 2, 3, 4
            longest_consecutive([0, 3, 7, 2, 5, 8, 4])
            # 4: the run 2, 3, 4, 5
            \`\`\`

            Constraints: \`0 <= len(nums) <= 10**5\`. Required: **O(n)** time.
          `,
          setup: py`
            import random
            random.seed(3)
            run = list(range(-6_000, 6_000))
            random.shuffle(run)
          `,
          starter: 'def longest_consecutive(nums):\n    pass\n',
          solution: py`
            def longest_consecutive(nums):
                s = set(nums)
                best = 0
                for x in s:
                    if x - 1 in s:
                        continue  # not the start of a run
                    y = x
                    while y + 1 in s:
                        y += 1
                    best = max(best, y - x + 1)
                return best
          `,
          tests: [
            { call: 'longest_consecutive([100, 4, 200, 1, 3, 2])', expect: '4' },
            { call: 'longest_consecutive([0, 3, 7, 2, 5, 8, 4])', expect: '4' },
            { call: 'longest_consecutive([])', expect: '0', hidden: true, name: 'empty list' },
            { call: 'longest_consecutive([5])', expect: '1', hidden: true },
            { call: 'longest_consecutive([1, 2, 2, 3])', expect: '3', hidden: true, name: 'duplicates' },
            { call: 'longest_consecutive([-2, -1, 0, 5, 6])', expect: '3', hidden: true, name: 'negatives' },
            { call: 'longest_consecutive([10, 5, 12, 3, 55, 11, 4, 2])', expect: '4', hidden: true },
            { call: 'longest_consecutive(run)', expect: '12000', hidden: true, maxMs: 180, name: 'one shuffled run of 12,000' },
          ],
          wrong: [
            py`
              def longest_consecutive(nums):
                  s = set(nums)
                  best = 0
                  for x in s:
                      y = x
                      while y + 1 in s:
                          y += 1
                      best = max(best, y - x + 1)
                  return best
            `,
            py`
              def longest_consecutive(nums):
                  if not nums:
                      return 0
                  s = sorted(nums)
                  best = cur = 1
                  for a, b in zip(s, s[1:]):
                      if b == a + 1:
                          cur += 1
                          best = max(best, cur)
                      else:
                          cur = 1
                  return best
            `,
            py`
              def longest_consecutive(nums):
                  s = set(nums)
                  best = 1
                  for x in s:
                      if x - 1 not in s:
                          y = x
                          while y + 1 in s:
                              y += 1
                          best = max(best, y - x + 1)
                  return best
            `,
          ],
          explain: md`
            Put everything in a set. Only start counting at a **run start**, a value whose predecessor \`x - 1\` is missing, then walk up with \`y + 1 in s\`. Every value is visited by at most one walk, so the total is **O(n)** even though there's a nested \`while\`. That amortised argument is exactly what the interviewer wants to hear.

            Without the start check, every value of a long run walks to its end: O(n²). Sorting works in O(n log n), but duplicates must be skipped (\`[1, 2, 2, 3]\` is a run of 3), and the interviewer asked for O(n).

            **Data angle**: this is the "gaps and islands" problem. In SQL you solve it with \`value - ROW_NUMBER()\` as a group key, the same idea as the SQL round's "active 3 days in a row".
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Subarray sum equals k',
          prompt: md`
            Write \`count_subarrays(nums, k)\` that returns how many **contiguous** subarrays of \`nums\` sum to exactly \`k\`. Values can be negative or zero.

            \`\`\`python
            count_subarrays([1, 1, 1], 2)  # 2
            count_subarrays([1, 2, 3], 3)  # 2: [1, 2] and [3]
            \`\`\`

            Constraints: \`0 <= len(nums) <= 10**5\`, \`-1000 <= nums[i] <= 1000\`. Aim for O(n).
          `,
          setup: py`
            import random
            random.seed(11)
            arr = [random.randint(-5, 5) for _ in range(15_000)]
          `,
          starter: 'def count_subarrays(nums, k):\n    pass\n',
          solution: py`
            from collections import defaultdict

            def count_subarrays(nums, k):
                seen = defaultdict(int)
                seen[0] = 1  # the empty prefix
                total = count = 0
                for x in nums:
                    total += x
                    count += seen[total - k]
                    seen[total] += 1
                return count
          `,
          tests: [
            { call: 'count_subarrays([1, 1, 1], 2)', expect: '2' },
            { call: 'count_subarrays([1, 2, 3], 3)', expect: '2' },
            { call: 'count_subarrays([], 0)', expect: '0', hidden: true, name: 'empty list' },
            { call: 'count_subarrays([0, 0, 0], 0)', expect: '6', hidden: true, name: 'zeros and k = 0' },
            { call: 'count_subarrays([1, -1, 0], 0)', expect: '3', hidden: true, name: 'negatives' },
            { call: 'count_subarrays([5], 5)', expect: '1', hidden: true },
            { call: 'count_subarrays([3, 4, 7, 2, -3, 1, 4, 2], 7)', expect: '4', hidden: true },
            { call: 'count_subarrays(arr, 3)', hidden: true, maxMs: 240, name: '15,000 values' },
          ],
          wrong: [
            py`
              def count_subarrays(nums, k):
                  count = lo = total = 0
                  for hi, x in enumerate(nums):
                      total += x
                      while total > k and lo <= hi:
                          total -= nums[lo]
                          lo += 1
                      if total == k:
                          count += 1
                  return count
            `,
            py`
              from collections import defaultdict

              def count_subarrays(nums, k):
                  seen = defaultdict(int)
                  seen[0] = 1
                  total = count = 0
                  for x in nums:
                      total += x
                      seen[total] += 1
                      count += seen[total - k]
                  return count
            `,
            py`
              def count_subarrays(nums, k):
                  count = 0
                  for i in range(len(nums)):
                      total = 0
                      for j in range(i, len(nums)):
                          total += nums[j]
                          if total == k:
                              count += 1
                  return count
            `,
          ],
          explain: md`
            **Prefix sums + hash map.** A subarray \`nums[i:j]\` sums to k exactly when \`prefix[j] - prefix[i] == k\`. So while scanning, count how many earlier prefixes equal \`total - k\`, then record the current prefix. Start with \`{0: 1}\` for subarrays that begin at index 0. O(n) time, O(n) space.

            The traps:
            - A sliding window only works when all values are positive. With negatives or zeros, growing the window can *lower* the sum.
            - Recording \`total\` *before* looking it up counts the empty subarray whenever k = 0.
            - The double loop is O(n²): 10¹⁰ steps at 10⁵.

            **What a strong candidate says**: "Prefix sum + 'have I seen the complement' is the same trick as two-sum." It's also how you answer *"how many time windows had net change k"* on metrics data.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Product of array except self',
          prompt: md`
            Write \`product_except_self(nums)\` that returns a list \`out\` where \`out[i]\` is the product of every element of \`nums\` except \`nums[i]\`.

            - **Don't use division.** The interviewer points out it breaks on zeros.
            - O(n) time. Bonus: O(1) extra space besides the output list.

            \`\`\`python
            product_except_self([1, 2, 3, 4])
            # [24, 12, 8, 6]
            product_except_self([-1, 1, 0, -3])
            # [0, 0, 3, 0]
            \`\`\`

            Constraints: \`2 <= len(nums) <= 10**5\`.
          `,
          setup: py`
            import random
            random.seed(5)
            signs = [random.choice([1, -1]) for _ in range(12_000)]
          `,
          starter: 'def product_except_self(nums):\n    pass\n',
          solution: py`
            def product_except_self(nums):
                n = len(nums)
                out = [1] * n
                left = 1
                for i in range(n):
                    out[i] = left        # product before i
                    left *= nums[i]
                right = 1
                for i in range(n - 1, -1, -1):
                    out[i] *= right      # times product after i
                    right *= nums[i]
                return out
          `,
          tests: [
            { call: 'product_except_self([1, 2, 3, 4])', expect: '[24, 12, 8, 6]' },
            { call: 'product_except_self([-1, 1, 0, -3])', expect: '[0, 0, 3, 0]' },
            { call: 'product_except_self([2, 3])', expect: '[3, 2]', hidden: true },
            { call: 'product_except_self([0, 0, 5])', expect: '[0, 0, 0]', hidden: true, name: 'two zeros' },
            { call: 'product_except_self([0, 4, 5])', expect: '[20, 0, 0]', hidden: true, name: 'one zero' },
            { call: 'product_except_self([-2, -3, 4])', expect: '[-12, -8, 6]', hidden: true },
            { call: 'product_except_self(signs)', hidden: true, maxMs: 250, name: '12,000 values' },
          ],
          wrong: [
            py`
              import math

              def product_except_self(nums):
                  total = math.prod(nums)
                  return [total // x for x in nums]
            `,
            py`
              def product_except_self(nums):
                  n = len(nums)
                  out = [1] * n
                  left = 1
                  for i in range(n):
                      left *= nums[i]
                      out[i] = left
                  right = 1
                  for i in range(n - 1, -1, -1):
                      right *= nums[i]
                      out[i] *= right
                  return out
            `,
            py`
              def product_except_self(nums):
                  out = []
                  for i in range(len(nums)):
                      p = 1
                      for j, x in enumerate(nums):
                          if j != i:
                              p *= x
                      out.append(p)
                  return out
            `,
          ],
          explain: md`
            \`out[i]\` = (product of everything **left** of i) × (product of everything **right** of i). One pass left-to-right writes the left products into \`out\`, one pass right-to-left multiplies in a running right product. O(n) time, O(1) extra space besides \`out\`.

            Division fails twice: one zero makes \`total // 0\` crash, and two zeros make every answer 0. Handling those cases with zero-counting is possible, but it's not what was asked. The off-by-one version (updating \`left\` *before* storing it) includes \`nums[i]\` itself.

            **What a strong candidate says**: "Prefix and suffix aggregates are a general tool: running totals, cumulative max, 'everything except me' features in ML pipelines." In fixed-width languages they'd also mention overflow. Python ints don't overflow, but they get slow when huge.
          `,
        },
      ],
    },
    // ================================================================ 3. algo
    {
      id: 'iv-algo',
      title: 'Coding Round: Graphs, Heaps & DP',
      level: 'Hard',
      minutes: 50,
      style: 'Onsite coding',
      intro: md`
        The "hard" onsite round: one concept check, then a graph problem, a data-structure design problem and a dynamic-programming problem. Each one has a tempting wrong approach (FIFO instead of a heap, greedy instead of DP) that passes the easy examples.

        **What the interviewer scores**
        - **Modelling**: "this is a DAG, so topological sort" or "overlapping subproblems, so DP". Say it out loud.
        - **Proof of correctness**: why greedy fails, why your heap invariant holds, how you detect a cycle.
        - **Complexity**, including space, and what happens at the limits (recursion depth!).

        **How grading works**: hidden tests cover cycles, duplicates, ties and inputs of 10⁴ items with time limits.

        > Tip: before you code a class, write down its **invariant** in one sentence ("the heap holds exactly the k largest values seen so far"). Then every method just restores it.
      `,
      questions: [
        {
          type: 'choice',
          points: 3,
          prompt: 'You call `heapq.heapify(xs)` on a list of n numbers. What is its time complexity?',
          options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(n²)'],
          answer: 0,
          explain: md`
            **O(n)**. \`heapify\` sifts down from the middle of the list to the front. Half the nodes are leaves (no work), a quarter move at most one level, and so on. The sum n/4·1 + n/8·2 + … is bounded by n.

            Pushing n items one by one is O(n log n), which is why interviewers ask. It matters for "k largest of n": \`heapify\` + k pops is O(n + k log n), while a size-k heap is O(n log k).
          `,
        },
        {
          type: 'code',
          points: 20,
          title: 'Course schedule (deterministic order)',
          prompt: md`
            There are \`n\` courses \`0 … n-1\` and a list \`prereqs\` of pairs \`(a, b)\` meaning **course \`b\` must be taken before course \`a\`**.

            Write \`course_order(n, prereqs)\` that returns an order in which to take all courses. Whenever several courses are available, take the **smallest number first** (so the answer is unique). If it's impossible because of a cycle, return \`[]\`.

            \`\`\`python
            course_order(4, [(1, 0), (2, 0),
                             (3, 1), (3, 2)])
            # [0, 1, 2, 3]
            course_order(3, [(0, 1), (1, 2), (2, 1)])
            # []  (1 and 2 need each other)
            course_order(3, [(0, 2)])
            # [1, 2, 0]
            \`\`\`

            Constraints: \`1 <= n <= 10**5\`, up to \`2 * 10**5\` pairs, and pairs may repeat. Target: O((n + e) log n).
          `,
          setup: py`
            import random
            random.seed(21)
            N = 20_000
            _perm = list(range(N))
            random.shuffle(_perm)
            EDGES = []
            for _i in range(1, N):
                for _ in range(2):
                    _j = random.randrange(_i)
                    EDGES.append((_perm[_i], _perm[_j]))

            def _sig(order):
                return (len(order), order[:3], order[-3:],
                        sum(i * c for i, c in enumerate(order))
                        % 1_000_003)
          `,
          starter: 'def course_order(n, prereqs):\n    pass\n',
          solution: py`
            import heapq

            def course_order(n, prereqs):
                indeg = [0] * n
                nxt = [[] for _ in range(n)]
                for a, b in prereqs:
                    indeg[a] += 1
                    nxt[b].append(a)
                heap = [c for c in range(n) if indeg[c] == 0]
                heapq.heapify(heap)
                order = []
                while heap:
                    c = heapq.heappop(heap)
                    order.append(c)
                    for a in nxt[c]:
                        indeg[a] -= 1
                        if indeg[a] == 0:
                            heapq.heappush(heap, a)
                return order if len(order) == n else []
          `,
          tests: [
            { call: 'course_order(4, [(1, 0), (2, 0), (3, 1), (3, 2)])', expect: '[0, 1, 2, 3]' },
            { call: 'course_order(3, [(0, 1), (1, 2), (2, 1)])', expect: '[]' },
            { call: 'course_order(3, [(0, 2)])', expect: '[1, 2, 0]' },
            { call: 'course_order(1, [])', expect: '[0]', hidden: true },
            { call: 'course_order(2, [(0, 0)])', expect: '[]', hidden: true, name: 'self-loop is a cycle' },
            { call: 'course_order(3, [(1, 0), (1, 0), (2, 1)])', expect: '[0, 1, 2]', hidden: true, name: 'duplicate pairs' },
            { call: 'course_order(5, [(0, 4), (1, 3)])', expect: '[2, 3, 1, 4, 0]', hidden: true, name: 'smallest available first' },
            { call: 'course_order(4, [(1, 0), (2, 1), (3, 2), (1, 3)])', expect: '[]', hidden: true, name: 'cycle after a valid start' },
            { call: '_sig(course_order(N, EDGES))', expect: '(20000, [13861, 8930, 16800], [8656, 14463, 15207], 196139)', hidden: true, maxMs: 330, name: '20,000 courses, 40,000 pairs' },
          ],
          wrong: [
            py`
              from collections import deque

              def course_order(n, prereqs):
                  indeg = [0] * n
                  nxt = [[] for _ in range(n)]
                  for a, b in prereqs:
                      indeg[a] += 1
                      nxt[b].append(a)
                  q = deque(c for c in range(n) if indeg[c] == 0)
                  order = []
                  while q:
                      c = q.popleft()
                      order.append(c)
                      for a in nxt[c]:
                          indeg[a] -= 1
                          if indeg[a] == 0:
                              q.append(a)
                  return order if len(order) == n else []
            `,
            py`
              import heapq

              def course_order(n, prereqs):
                  indeg = [0] * n
                  nxt = [[] for _ in range(n)]
                  for a, b in prereqs:
                      indeg[a] += 1
                      nxt[b].append(a)
                  heap = [c for c in range(n) if indeg[c] == 0]
                  heapq.heapify(heap)
                  order = []
                  while heap:
                      c = heapq.heappop(heap)
                      order.append(c)
                      for a in nxt[c]:
                          indeg[a] -= 1
                          if indeg[a] == 0:
                              heapq.heappush(heap, a)
                  return order
            `,
            py`
              def course_order(n, prereqs):
                  indeg = [0] * n
                  nxt = [[] for _ in range(n)]
                  for a, b in prereqs:
                      indeg[a] += 1
                      nxt[b].append(a)
                  done = [False] * n
                  order = []
                  for _ in range(n):
                      pick = -1
                      for c in range(n):
                          if not done[c] and indeg[c] == 0:
                              pick = c
                              break
                      if pick < 0:
                          return []
                      done[pick] = True
                      order.append(pick)
                      for a in nxt[pick]:
                          indeg[a] -= 1
                  return order
            `,
          ],
          explain: md`
            **Kahn's algorithm with a min-heap.** Count each course's unmet prerequisites (in-degree). Courses with in-degree 0 are available; always pop the smallest one from a heap, then "complete" it by decrementing its dependants. If fewer than n courses come out, the rest are stuck in a cycle. O((n + e) log n) time, O(n + e) space.

            Why the alternatives fail:
            - A FIFO queue gives *a* valid order, but not the smallest-first one: for \`(5, [(0, 4), (1, 3)])\` it returns \`[2, 3, 4, 1, 0]\`.
            - Without the \`len(order) == n\` check, a cycle silently returns a partial plan.
            - Rescanning all courses for the next available one is O(n²).

            **What a strong candidate says**: "This is a DAG check plus topological order. The tie-break makes it deterministic, which is what you want for build systems and data pipelines: Airflow/dbt run tasks in exactly this kind of order, and a cycle is a config error to report, not to hang on."
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'k-th largest in a stream',
          prompt: md`
            Design a class for a live leaderboard. \`KthLargest(k, nums)\` starts with the scores in \`nums\`, and \`add(val)\` inserts a new score and **returns the k-th largest score so far**. If fewer than \`k\` scores have been seen, \`add\` returns \`None\`.

            \`\`\`python
            kl = KthLargest(3, [4, 5, 8, 2])
            kl.add(3)   # 4
            kl.add(5)   # 5
            kl.add(10)  # 5
            kl.add(9)   # 8
            \`\`\`

            Constraints: up to \`10**5\` initial scores and \`10**5\` calls to \`add\`. Each \`add\` must be O(log k).
          `,
          setup: py`
            import random
            random.seed(5)
            init = [random.randrange(10**6) for _ in range(20_000)]
            adds = [random.randrange(10**6) for _ in range(20_000)]

            def _run(k, nums, xs):
                kl = KthLargest(k, nums)
                return [kl.add(v) for v in xs]
          `,
          starter: py`
            class KthLargest:
                def __init__(self, k, nums):
                    pass

                def add(self, val):
                    pass
          `,
          solution: py`
            import heapq

            class KthLargest:
                def __init__(self, k, nums):
                    self.k = k
                    # min-heap holding the k largest values
                    self.h = heapq.nlargest(k, nums)
                    heapq.heapify(self.h)

                def add(self, val):
                    if len(self.h) < self.k:
                        heapq.heappush(self.h, val)
                    elif val > self.h[0]:
                        heapq.heapreplace(self.h, val)
                    if len(self.h) < self.k:
                        return None
                    return self.h[0]
          `,
          tests: [
            { call: '_run(3, [4, 5, 8, 2], [3, 5, 10, 9, 4])', expect: '[4, 5, 5, 8, 8]', name: 'the example' },
            { call: '_run(1, [], [5, 3, 7])', expect: '[5, 5, 7]', hidden: true, name: 'k = 1, empty start' },
            { call: '_run(3, [1], [2, 3, 4])', expect: '[None, 1, 2]', hidden: true, name: 'fewer than k scores' },
            { call: '_run(2, [5, 5, 5], [5, 1])', expect: '[5, 5]', hidden: true, name: 'duplicates' },
            { call: '_run(2, [-1, -5], [-3, 0])', expect: '[-3, -1]', hidden: true, name: 'negatives' },
            { call: 'sum(_run(100, init, adds))', hidden: true, maxMs: 150, name: '20,000 scores + 20,000 adds' },
          ],
          wrong: [
            py`
              import heapq

              class KthLargest:
                  def __init__(self, k, nums):
                      self.k = k
                      self.h = list(nums)
                      heapq.heapify(self.h)

                  def add(self, val):
                      heapq.heappush(self.h, val)
                      if len(self.h) < self.k:
                          return None
                      return self.h[0]
            `,
            py`
              import heapq

              class KthLargest:
                  def __init__(self, k, nums):
                      self.k = k
                      self.h = list(nums)
                      heapq.heapify(self.h)

                  def add(self, val):
                      heapq.heappush(self.h, val)
                      if len(self.h) > self.k:
                          heapq.heappop(self.h)
                      if len(self.h) < self.k:
                          return None
                      return self.h[0]
            `,
            py`
              class KthLargest:
                  def __init__(self, k, nums):
                      self.k = k
                      self.xs = list(nums)

                  def add(self, val):
                      self.xs.append(val)
                      self.xs.sort(reverse=True)
                      if len(self.xs) < self.k:
                          return None
                      return self.xs[self.k - 1]
            `,
          ],
          explain: md`
            **Invariant: a min-heap of exactly the k largest values seen.** Its root is the k-th largest. A new value smaller than the root can't change the answer; a bigger one replaces the root (\`heapreplace\`, one O(log k) step). Start with \`nlargest(k, nums)\`, which is O(n log k). Memory is O(k), no matter how long the stream runs.

            The traps:
            - Never trimming the heap: its root is the global *minimum*.
            - Trimming only inside \`add\`: if \`nums\` started with more than k values, the heap stays too big forever.
            - Re-sorting on every call is O(n log n) per add.

            **Big-data angle**: this is how "top-k per window" works in streaming systems (Flink, Kafka Streams). Each partition keeps a size-k heap, and the heaps merge cheaply because the k largest of the union are among the per-partition top-k.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Coin change',
          prompt: md`
            Write \`min_coins(coins, amount)\` that returns the **fewest coins** that add up to \`amount\`, using any number of each coin value, or \`-1\` if it can't be done.

            \`\`\`python
            min_coins([1, 2, 5], 11)  # 3  (5 + 5 + 1)
            min_coins([2], 3)         # -1
            min_coins([1, 3, 4], 6)   # 2  (3 + 3)
            \`\`\`

            Note the last one: greedy (take the biggest coin first) gives 4 + 1 + 1.

            Constraints: up to 12 distinct coin values from 1 to \`10**4\`, \`0 <= amount <= 10**4\`.
          `,
          starter: 'def min_coins(coins, amount):\n    pass\n',
          solution: py`
            def min_coins(coins, amount):
                INF = amount + 1  # more coins than possible
                dp = [0] + [INF] * amount
                for a in range(1, amount + 1):
                    for c in coins:
                        if c <= a and dp[a - c] + 1 < dp[a]:
                            dp[a] = dp[a - c] + 1
                return dp[amount] if dp[amount] < INF else -1
          `,
          tests: [
            { call: 'min_coins([1, 2, 5], 11)', expect: '3' },
            { call: 'min_coins([2], 3)', expect: '-1' },
            { call: 'min_coins([1, 3, 4], 6)', expect: '2' },
            { call: 'min_coins([1], 0)', expect: '0', hidden: true, name: 'amount 0' },
            { call: 'min_coins([3, 5], 7)', expect: '-1', hidden: true },
            { call: 'min_coins([5, 3], 9)', expect: '3', hidden: true },
            { call: 'min_coins([186, 419, 83, 408], 6249)', expect: '20', hidden: true },
            { call: 'min_coins([97, 101, 103, 107, 109, 113], 10_000)', expect: '90', hidden: true, maxMs: 500, name: 'amount 10,000' },
          ],
          wrong: [
            py`
              def min_coins(coins, amount):
                  n = 0
                  for c in sorted(coins, reverse=True):
                      n += amount // c
                      amount %= c
                  return n if amount == 0 else -1
            `,
            py`
              def min_coins(coins, amount):
                  INF = amount + 1
                  dp = [0] + [INF] * amount
                  for c in coins:
                      for a in range(amount, c - 1, -1):
                          dp[a] = min(dp[a], dp[a - c] + 1)
                  return dp[amount] if dp[amount] < INF else -1
            `,
            py`
              def min_coins(coins, amount):
                  dp = [0] + [float("inf")] * amount
                  for a in range(1, amount + 1):
                      for c in coins:
                          if c <= a:
                              dp[a] = min(dp[a], dp[a - c] + 1)
                  return dp[amount]
            `,
          ],
          explain: md`
            **Bottom-up DP**: \`dp[a]\` = fewest coins for amount a. \`dp[0] = 0\`, and \`dp[a] = 1 + min(dp[a - c])\` over coins c ≤ a. Use a sentinel bigger than any real answer (\`amount + 1\`) and map it to -1 at the end. O(amount × coins) time, O(amount) space.

            The traps:
            - **Greedy** is only optimal for "canonical" coin systems like euros. \`[1, 3, 4]\` breaks it.
            - Looping amounts **downwards** inside the coin loop is the 0/1-knapsack template: each coin can then be used only once, so 11 = 5 + 5 + 1 is never found.
            - Forgetting to turn "infinity" back into -1.

            Top-down memoisation is also correct, but it recurses up to \`amount / min(coins)\` levels deep: with a 1-coin and amount 10,000 that's a \`RecursionError\` in Python. Say this before the interviewer does.

            **What a strong candidate says**: "It's an unbounded knapsack. BFS over amounts also works and stops at the first time we reach the target." Then they mention the follow-up: *count the number of ways* (same table, sum instead of min, loop over coins on the outside).
          `,
        },
      ],
    },

    // ================================================================ 4. data engineering
    {
      id: 'iv-dataeng',
      title: 'Data Engineering Round',
      level: 'Hard',
      minutes: 50,
      style: 'Onsite: data engineering',
      intro: md`
        The round data-engineering teams at big data companies run instead of (or next to) classic algorithms: real pipeline problems in plain Python. Sessionization, CDC compaction, log parsing, a cache, then two design questions about how batch jobs survive retries and late data.

        **What the interviewer scores**
        - **Messy-data instincts**: unsorted input, duplicates, out-of-order versions, malformed lines, exact boundaries ("is 30 minutes still the same session?").
        - **Scale thinking**: one pass, O(n log n) at worst, bounded memory. Say how it maps to Spark/SQL ("this is a window function partitioned by user").
        - **Correctness under re-runs**: idempotent results, deterministic tie-breaks.

        **How grading works**: hidden tests feed shuffled, duplicated and malformed input plus 40,000–50,000-row inputs with time limits.

        > Tip: ask (or decide and state) the boundary rules first. In real pipelines most bugs are off-by-one boundaries, not algorithms.
      `,
      questions: [
        {
          type: 'code',
          points: 15,
          title: 'Sessionize click events',
          prompt: md`
            Clickstream events arrive as \`(user_id, ts)\` pairs (ts in epoch seconds), **in no particular order**. A session is a run of one user's events where each event is at most **1800 s (30 min)** after the previous one. A gap of **more than** 1800 s starts a new session.

            Write \`sessionize(events)\` that returns a list of \`(user_id, start, end, n_events)\` **tuples**, sorted by user_id, then start.

            \`\`\`python
            events = [("u1", 0), ("u2", 50),
                      ("u1", 1800), ("u1", 4000)]
            sessionize(events)
            # [("u1", 0, 1800, 2),
            #  ("u1", 4000, 4000, 1),
            #  ("u2", 50, 50, 1)]
            \`\`\`

            Constraints: up to \`2 * 10**5\` events. User ids are strings. Duplicate events count separately.
          `,
          setup: py`
            import random
            random.seed(42)
            clicks = []
            for _ in range(50_000):
                _u = "user" + str(random.randrange(8_000))
                clicks.append((_u, random.randrange(3 * 86_400)))

            def _sig(r):
                return (len(r), r[0], r[-1],
                        sum(s[2] - s[1] for s in r))
          `,
          starter: 'def sessionize(events):\n    pass\n',
          solution: py`
            def sessionize(events, gap=1800):
                out = []
                for u, t in sorted(events):
                    last = out[-1] if out else None
                    same = last and last[0] == u
                    if same and t - last[2] <= gap:
                        out[-1] = (u, last[1], t, last[3] + 1)
                    else:
                        out.append((u, t, t, 1))
                return out
          `,
          tests: [
            { call: 'sessionize([("u1", 0), ("u2", 50), ("u1", 1800), ("u1", 4000)])', expect: '[("u1", 0, 1800, 2), ("u1", 4000, 4000, 1), ("u2", 50, 50, 1)]' },
            { call: 'sessionize([])', expect: '[]', hidden: true, name: 'no events' },
            { call: 'sessionize([("a", 100), ("a", 1901)])', expect: '[("a", 100, 100, 1), ("a", 1901, 1901, 1)]', hidden: true, name: 'gap of 1801 s splits' },
            { call: 'sessionize([("a", 0), ("a", 1800), ("a", 3600)])', expect: '[("a", 0, 3600, 3)]', hidden: true, name: 'gaps of exactly 1800 s stay together' },
            { call: 'sessionize([("a", 5), ("a", 5)])', expect: '[("a", 5, 5, 2)]', hidden: true, name: 'duplicate events' },
            { call: 'sessionize([("b", 9000), ("a", 7000), ("b", 10), ("a", 10), ("b", 2000)])', expect: '[("a", 10, 10, 1), ("a", 7000, 7000, 1), ("b", 10, 10, 1), ("b", 2000, 2000, 1), ("b", 9000, 9000, 1)]', hidden: true, name: 'shuffled, interleaved users' },
            { call: 'sessionize([("x", 3000), ("x", 1500), ("x", 0)])', expect: '[("x", 0, 3000, 3)]', hidden: true, name: 'reverse order' },
            { call: '_sig(sessionize(clicks))', expect: '(47850, ("user0", 65100, 65100, 1), ("user999", 255485, 255485, 1), 1922681)', hidden: true, maxMs: 350, name: '50,000 events, 8,000 users' },
          ],
          wrong: [
            py`
              def sessionize(events, gap=1800):
                  last, out = {}, {}
                  for u, t in events:
                      if u in last and t - last[u] <= gap:
                          s = out[u][-1]
                          out[u][-1] = (u, s[1], t, s[3] + 1)
                      else:
                          out.setdefault(u, []).append((u, t, t, 1))
                      last[u] = t
                  return [s for u in sorted(out) for s in out[u]]
            `,
            py`
              def sessionize(events, gap=1800):
                  out = []
                  for u, t in sorted(events):
                      last = out[-1] if out else None
                      if last and last[0] == u and t - last[2] < gap:
                          out[-1] = (u, last[1], t, last[3] + 1)
                      else:
                          out.append((u, t, t, 1))
                  return out
            `,
            py`
              def sessionize(events, gap=1800):
                  out = []
                  for u in sorted({u for u, _ in events}):
                      ts = sorted(t for v, t in events if v == u)
                      start = prev = ts[0]
                      n = 0
                      for t in ts:
                          if t - prev > gap:
                              out.append((u, start, prev, n))
                              start, n = t, 0
                          prev = t
                          n += 1
                      out.append((u, start, prev, n))
                  return out
            `,
          ],
          explain: md`
            **Sort by (user, ts), then one pass.** After sorting, each user's events are contiguous and in time order, so a session ends exactly when the user changes or the gap exceeds 1800 s. O(n log n) for the sort, O(n) for the pass. The output comes out already ordered.

            The traps:
            - Assuming the input is sorted. Logs from many servers never are.
            - \`<\` vs \`<=\`: the spec says a gap of exactly 1800 s stays in the session. State the boundary out loud.
            - Filtering the whole list once per user is O(n × users): fine on 10 rows, a disaster on 10⁸.

            **How it maps to Spark/SQL** (interviewers almost always ask):

            \`\`\`sql
            new = CASE WHEN ts - LAG(ts) OVER w > 1800
                         OR LAG(ts) OVER w IS NULL
                  THEN 1 ELSE 0 END
            session_id = SUM(new) OVER w  -- running
            -- w = PARTITION BY user ORDER BY ts
            \`\`\`

            In streaming (Flink, Spark Structured Streaming) this is a **session window** with a 30-minute gap plus a watermark for late events.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Compact a CDC change log',
          prompt: md`
            A change-data-capture (CDC) feed delivers row changes as \`(key, version, value)\` tuples. They can arrive **out of order** and **duplicated**. \`value=None\` means the row was **deleted** (a tombstone).

            Write \`compact(changes)\` that returns a dict with the current value of every live key:

            - The record with the **highest version** wins.
            - On equal versions, the one that appears **later** in the list wins.
            - Keys whose winning record is a delete are left out.

            \`\`\`python
            ch = [("a", 1, "x"), ("b", 1, "y"),
                  ("a", 3, "z"), ("a", 2, "old"),
                  ("b", 2, None)]
            compact(ch)  # {'a': 'z'}
            \`\`\`

            Constraints: up to \`2 * 10**5\` changes. O(n) time.
          `,
          setup: py`
            import random
            random.seed(1)
            cdc = []
            for _ in range(40_000):
                _v = random.randrange(10**6)
                if random.random() < 0.1:
                    _v = None
                cdc.append((random.randrange(6_000),
                            random.randrange(30), _v))

            def _sig(d):
                return (len(d), sum(d.values()))
          `,
          starter: 'def compact(changes):\n    pass\n',
          solution: py`
            def compact(changes):
                best = {}  # key -> (version, value)
                for key, ver, val in changes:
                    cur = best.get(key)
                    if cur is None or ver >= cur[0]:
                        best[key] = (ver, val)
                return {k: v for k, (_, v) in best.items()
                        if v is not None}
          `,
          tests: [
            { call: 'compact([("a", 1, "x"), ("b", 1, "y"), ("a", 3, "z"), ("a", 2, "old"), ("b", 2, None)])', expect: '{"a": "z"}' },
            { call: 'compact([])', expect: '{}', hidden: true, name: 'empty feed' },
            { call: 'compact([("k", 5, "new"), ("k", 4, "old")])', expect: '{"k": "new"}', hidden: true, name: 'older version arrives late' },
            { call: 'compact([("k", 1, "first"), ("k", 1, "second")])', expect: '{"k": "second"}', hidden: true, name: 'same version: later wins' },
            { call: 'compact([("k", 1, "v1"), ("k", 2, None), ("k", 3, "v3")])', expect: '{"k": "v3"}', hidden: true, name: 're-insert after delete' },
            { call: 'compact([("k", 2, "keep"), ("k", 1, None)])', expect: '{"k": "keep"}', hidden: true, name: 'stale delete is ignored' },
            { call: 'compact([("k", 2, None), ("k", 1, "stale")])', expect: '{}', hidden: true, name: 'stale upsert after a delete' },
            { call: 'compact([("k", 1, 0), ("j", 1, "")])', expect: '{"k": 0, "j": ""}', hidden: true, name: 'falsy values are not deletes' },
            { call: '_sig(compact(cdc))', expect: '(5440, 2725724808)', hidden: true, maxMs: 200, name: '40,000 changes, 6,000 keys' },
          ],
          wrong: [
            py`
              def compact(changes):
                  d = {}
                  for key, ver, val in changes:
                      d[key] = val
                  return {k: v for k, v in d.items() if v is not None}
            `,
            py`
              def compact(changes):
                  ver_of, out = {}, {}
                  for key, ver, val in changes:
                      if key in ver_of and ver < ver_of[key]:
                          continue
                      if val is None:
                          out.pop(key, None)
                          ver_of.pop(key, None)
                      else:
                          out[key] = val
                          ver_of[key] = ver
                  return out
            `,
            py`
              def compact(changes):
                  out = {}
                  for key in {k for k, _, _ in changes}:
                      best = None
                      for k, ver, val in changes:
                          if k == key and (best is None or ver >= best[0]):
                              best = (ver, val)
                      if best[1] is not None:
                          out[key] = best[1]
                  return out
            `,
          ],
          explain: md`
            Keep \`key → (version, value)\` and replace only when the incoming version is \`>=\` the stored one. **Tombstones stay in the map** while compacting and are filtered out only at the end. O(n) time, O(keys) memory.

            The traps:
            - Last-write-wins by arrival order: an old version that arrives late overwrites the new one.
            - Deleting the key on a tombstone *forgets its version*, so a stale upsert that arrives afterwards resurrects a deleted row.
            - \`if not val\` treats \`0\` and \`""\` as deletes. Only \`None\` is a tombstone.

            **What a strong candidate says**: "That's why Kafka log compaction and Delta/Iceberg MERGE keep tombstones for a retention period. The result is the same no matter how often a record is replayed, so the job is **idempotent**. In SQL: \`ROW_NUMBER() OVER (PARTITION BY key ORDER BY version DESC, offset DESC) = 1\`, then drop deletes." They'd also ask where the version comes from: a database LSN or commit timestamp, never the consumer's clock.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Endpoint latency report',
          prompt: md`
            Each line of an access log looks like this (ip, time, request, status, bytes, response time in seconds), shown wrapped here but one line in the file:

            \`\`\`
            203.0.113.5 - - [12/Nov/2025:09:00:40 +0000]
              "POST /api/checkout HTTP/1.1" 200 8940 0.137
            \`\`\`

            Write \`endpoint_stats(lines)\` for any iterable of lines (a list, or an open file like \`open("data/server.log")\`). Return a dict mapping each endpoint to a tuple \`(requests, p95_ms, error_rate)\`:

            - **endpoint** = method + space + path, with the query string removed and every all-digit path segment replaced by \`{id}\`: \`GET /api/products/40?x=1\` → \`"GET /api/products/{id}"\`.
            - **p95_ms**: nearest-rank 95th percentile. Sort the times, take the one at 1-based position \`ceil(0.95 * n)\`, return \`round(seconds * 1000)\`.
            - **error_rate**: share of requests with status **>= 500**, rounded to 3 decimals.
            - Skip blank or malformed lines.

            Example: two lines \`"GET /api/products/7 …" 200 512 0.120\` and \`"GET /api/products/9?ref=x …" 503 0 0.480\` give \`{"GET /api/products/{id}": (2, 480, 0.5)}\`.
          `,
          setup: py`
            def _line(req, status, sec):
                return ('10.0.0.1 - - [12/Nov/2025:09:00:00 +0000] "'
                        + req + ' HTTP/1.1" ' + status + ' 100 ' + sec)

            SAMPLE = [
                _line("GET /api/products/7", "200", "0.120"),
                _line("GET /api/products/9?ref=ad", "503", "0.480"),
                _line("GET /search?q=mug", "404", "0.030"),
                "not a log line",
                "",
                _line("POST /api/cart", "201", "0.055"),
            ]
            TWENTY = [_line("GET /x", "200", f"{i / 1000:.3f}")
                      for i in range(1, 21)]
            MESSY = [
                _line("GET /api/v2/users/42/orders/7", "500", "0.200"),
                _line("GET /api/v2/users/43/orders/8", "200", "0.100"),
                _line("GET /", "301", "0.010"),
                '10.0.0.9 - - [12/Nov/2025:09:00:00 +0000] "GET / HTTP/1.1" 200',
                "\n",
            ]
          `,
          starter: 'def endpoint_stats(lines):\n    pass\n',
          solution: py`
            import math

            def endpoint_stats(lines):
                lat, err = {}, {}
                for line in lines:
                    try:
                        _, req, rest = line.split('"')
                        method, path, _ = req.split()
                        status, _, sec = rest.split()
                        status, sec = int(status), float(sec)
                    except ValueError:
                        continue  # malformed line
                    parts = path.split("?")[0].split("/")
                    path = "/".join("{id}" if p.isdigit() else p
                                    for p in parts)
                    ep = method + " " + path
                    lat.setdefault(ep, []).append(sec)
                    err[ep] = err.get(ep, 0) + (status >= 500)
                out = {}
                for ep, xs in lat.items():
                    xs.sort()
                    p95 = xs[math.ceil(0.95 * len(xs)) - 1]
                    out[ep] = (len(xs), round(p95 * 1000),
                               round(err[ep] / len(xs), 3))
                return out
          `,
          tests: [
            { call: 'endpoint_stats(SAMPLE)', expect: '{"GET /api/products/{id}": (2, 480, 0.5), "GET /search": (1, 30, 0.0), "POST /api/cart": (1, 55, 0.0)}', name: 'small sample with junk lines' },
            { call: 'endpoint_stats(TWENTY)', expect: '{"GET /x": (20, 19, 0.0)}', hidden: true, name: 'p95 of 20 values is the 19th' },
            { call: 'endpoint_stats(MESSY)', expect: '{"GET /api/v2/users/{id}/orders/{id}": (2, 200, 0.5), "GET /": (1, 10, 0.0)}', hidden: true, name: 'several ids, truncated line' },
            { call: 'endpoint_stats([])', expect: '{}', hidden: true },
            { call: 'endpoint_stats(open("data/server.log"))', hidden: true, name: 'the real data/server.log' },
          ],
          wrong: [
            py`
              def endpoint_stats(lines):
                  lat, err = {}, {}
                  for line in lines:
                      try:
                          _, req, rest = line.split('"')
                          method, path, _ = req.split()
                          status, _, sec = rest.split()
                          status, sec = int(status), float(sec)
                      except ValueError:
                          continue
                      parts = path.split("?")[0].split("/")
                      path = "/".join("{id}" if p.isdigit() else p
                                      for p in parts)
                      ep = method + " " + path
                      lat.setdefault(ep, []).append(sec)
                      err[ep] = err.get(ep, 0) + (status >= 500)
                  out = {}
                  for ep, xs in lat.items():
                      xs.sort()
                      p95 = xs[int(0.95 * len(xs))]
                      out[ep] = (len(xs), round(p95 * 1000),
                                 round(err[ep] / len(xs), 3))
                  return out
            `,
            py`
              import math

              def endpoint_stats(lines):
                  lat, err = {}, {}
                  for line in lines:
                      try:
                          _, req, rest = line.split('"')
                          method, path, _ = req.split()
                          status, _, sec = rest.split()
                          status, sec = int(status), float(sec)
                      except ValueError:
                          continue
                      parts = path.split("?")[0].split("/")
                      path = "/".join("{id}" if p.isdigit() else p
                                      for p in parts)
                      ep = method + " " + path
                      lat.setdefault(ep, []).append(sec)
                      err[ep] = err.get(ep, 0) + (status >= 400)
                  out = {}
                  for ep, xs in lat.items():
                      xs.sort()
                      p95 = xs[math.ceil(0.95 * len(xs)) - 1]
                      out[ep] = (len(xs), round(p95 * 1000),
                                 round(err[ep] / len(xs), 3))
                  return out
            `,
            py`
              import math

              def endpoint_stats(lines):
                  lat, err = {}, {}
                  for line in lines:
                      try:
                          _, req, rest = line.split('"')
                          method, path, _ = req.split()
                          status, _, sec = rest.split()
                          status, sec = int(status), float(sec)
                      except ValueError:
                          continue
                      path = path.split("?")[0]
                      if path.split("/")[-1].isdigit():
                          path = path.rsplit("/", 1)[0] + "/{id}"
                      ep = method + " " + path
                      lat.setdefault(ep, []).append(sec)
                      err[ep] = err.get(ep, 0) + (status >= 500)
                  out = {}
                  for ep, xs in lat.items():
                      xs.sort()
                      p95 = xs[math.ceil(0.95 * len(xs)) - 1]
                      out[ep] = (len(xs), round(p95 * 1000),
                                 round(err[ep] / len(xs), 3))
                  return out
            `,
          ],
          explain: md`
            Parse defensively, normalise, aggregate, then summarise:
            - Splitting on \`"\` gives exactly three parts for a good line; anything else raises \`ValueError\` and gets skipped. A regex works too. Say which lines you'd count in a "malformed" metric instead of dropping silently.
            - Normalising ids (\`/users/42\` → \`/users/{id}\`) keeps **metric cardinality** bounded. Without it, every product gets its own time series and the monitoring bill explodes.
            - p95 needs the sorted latencies per endpoint: O(n log n) overall, O(n) memory.

            The traps: \`xs[int(0.95 * n)]\` is off by one (for n = 20 it returns the maximum), 4xx are client errors and not part of an availability error rate, and only replacing the *last* segment misses \`/users/42/orders/7\`.

            **What a strong candidate says**: "Exact percentiles don't merge across servers or partitions: you can't average p95s. At scale I'd keep a mergeable sketch per endpoint (t-digest, HDR histogram) or use \`approx_percentile\` in Spark/Presto." They'd also note that percentile definitions differ: numpy's default interpolates, while nearest-rank always returns a real observed value.
          `,
        },
        {
          type: 'code',
          points: 20,
          title: 'LRU cache from scratch',
          prompt: md`
            Implement \`LRUCache(capacity)\` (capacity ≥ 1) with:

            - \`get(key)\`: the value, or \`-1\` if the key is missing. A hit makes the key the **most recently used**.
            - \`put(key, value)\`: insert or update (an update also counts as a use). If the cache grows beyond \`capacity\`, evict the **least recently used** key.

            Both must be **O(1)**. The interviewer adds: *no \`OrderedDict\` and no \`functools\`*. Build it from a dict plus a doubly linked list.

            \`\`\`python
            c = LRUCache(2)
            c.put(1, "a")
            c.put(2, "b")
            c.get(1)       # 'a' (1 is now most recent)
            c.put(3, "c")  # evicts 2
            c.get(2)       # -1
            c.put(1, "A")  # update; 1 most recent
            c.put(4, "d")  # evicts 3
            c.get(3), c.get(1), c.get(4)
            # (-1, 'A', 'd')
            \`\`\`
          `,
          setup: py`
            def _ops(cap, ops):
                c = LRUCache(cap)
                out = []
                for op in ops:
                    if op[0] == "get":
                        out.append(c.get(op[1]))
                    else:
                        c.put(op[1], op[2])
                return out

            def _bench(cap, hot_gets):
                c = LRUCache(cap)
                for i in range(cap):
                    c.put(i, i)
                s = 0
                for _ in range(hot_gets):
                    s += c.get(cap - 1)
                for i in range(cap, 2 * cap):
                    c.put(i, i)  # every put evicts
                return s + c.get(2 * cap - 1) + c.get(0)
          `,
          starter: py`
            class LRUCache:
                def __init__(self, capacity):
                    pass

                def get(self, key):
                    pass

                def put(self, key, value):
                    pass
          `,
          solution: py`
            class Node:
                __slots__ = ("key", "val", "prev", "next")

                def __init__(self, key=None, val=None):
                    self.key, self.val = key, val
                    self.prev = self.next = None

            class LRUCache:
                def __init__(self, capacity):
                    self.cap = capacity
                    self.map = {}
                    self.head = Node()  # LRU end (sentinel)
                    self.tail = Node()  # MRU end (sentinel)
                    self.head.next = self.tail
                    self.tail.prev = self.head

                def _unlink(self, n):
                    n.prev.next = n.next
                    n.next.prev = n.prev

                def _append(self, n):  # just before tail
                    n.prev, n.next = self.tail.prev, self.tail
                    self.tail.prev.next = n
                    self.tail.prev = n

                def get(self, key):
                    n = self.map.get(key)
                    if n is None:
                        return -1
                    self._unlink(n)
                    self._append(n)
                    return n.val

                def put(self, key, value):
                    n = self.map.get(key)
                    if n is not None:
                        n.val = value
                        self._unlink(n)
                    else:
                        if len(self.map) == self.cap:
                            lru = self.head.next
                            self._unlink(lru)
                            del self.map[lru.key]
                        n = self.map[key] = Node(key, value)
                    self._append(n)
          `,
          tests: [
            { call: '_ops(2, [("put", 1, "a"), ("put", 2, "b"), ("get", 1), ("put", 3, "c"), ("get", 2), ("put", 1, "A"), ("put", 4, "d"), ("get", 3), ("get", 1), ("get", 4)])', expect: '["a", -1, -1, "A", "d"]', name: 'the example' },
            { call: '_ops(1, [("put", 1, 1), ("put", 2, 2), ("get", 1), ("get", 2)])', expect: '[-1, 2]', hidden: true, name: 'capacity 1' },
            { call: '_ops(2, [("put", 1, 1), ("put", 2, 2), ("get", 1), ("put", 1, 10), ("get", 2), ("get", 1)])', expect: '[1, 2, 10]', hidden: true, name: 'update at capacity does not evict' },
            { call: '_ops(2, [("put", 1, 1), ("put", 2, 2), ("put", 1, 11), ("put", 3, 3), ("get", 2), ("get", 1), ("get", 3)])', expect: '[-1, 11, 3]', hidden: true, name: 'an update refreshes recency' },
            { call: '_ops(2, [("put", "a", 1), ("put", "b", 2), ("get", "a"), ("put", "c", 3), ("get", "b"), ("get", "a"), ("get", "zz")])', expect: '[1, -1, 1, -1]', hidden: true, name: 'a get refreshes recency' },
            { call: '_bench(10_000, 60_000)', expect: '599959998', hidden: true, maxMs: 240, name: '10,000 keys, hot key + eviction storm' },
          ],
          forbid: ['OrderedDict', 'functools'],
          wrong: [
            py`
              class LRUCache:
                  def __init__(self, capacity):
                      self.cap = capacity
                      self.d = {}
                      self.order = []  # LRU first

                  def get(self, key):
                      if key not in self.d:
                          return -1
                      self.order.remove(key)
                      self.order.append(key)
                      return self.d[key]

                  def put(self, key, value):
                      if key in self.d:
                          self.order.remove(key)
                      elif len(self.d) == self.cap:
                          del self.d[self.order.pop(0)]
                      self.d[key] = value
                      self.order.append(key)
            `,
            py`
              class Node:
                  def __init__(self, key=None, val=None):
                      self.key, self.val = key, val
                      self.prev = self.next = None

              class LRUCache:
                  def __init__(self, capacity):
                      self.cap = capacity
                      self.map = {}
                      self.head, self.tail = Node(), Node()
                      self.head.next = self.tail
                      self.tail.prev = self.head

                  def _unlink(self, n):
                      n.prev.next = n.next
                      n.next.prev = n.prev

                  def _append(self, n):
                      n.prev, n.next = self.tail.prev, self.tail
                      self.tail.prev.next = n
                      self.tail.prev = n

                  def get(self, key):
                      n = self.map.get(key)
                      if n is None:
                          return -1
                      self._unlink(n)
                      self._append(n)
                      return n.val

                  def put(self, key, value):
                      if key in self.map:
                          self.map[key].val = value
                          return
                      if len(self.map) == self.cap:
                          lru = self.head.next
                          self._unlink(lru)
                          del self.map[lru.key]
                      n = self.map[key] = Node(key, value)
                      self._append(n)
            `,
            py`
              class Node:
                  def __init__(self, key=None, val=None):
                      self.key, self.val = key, val
                      self.prev = self.next = None

              class LRUCache:
                  def __init__(self, capacity):
                      self.cap = capacity
                      self.map = {}
                      self.head, self.tail = Node(), Node()
                      self.head.next = self.tail
                      self.tail.prev = self.head

                  def _unlink(self, n):
                      n.prev.next = n.next
                      n.next.prev = n.prev

                  def _append(self, n):
                      n.prev, n.next = self.tail.prev, self.tail
                      self.tail.prev.next = n
                      self.tail.prev = n

                  def get(self, key):
                      n = self.map.get(key)
                      if n is None:
                          return -1
                      self._unlink(n)
                      self._append(n)
                      return n.val

                  def put(self, key, value):
                      if len(self.map) == self.cap:
                          lru = self.head.next
                          self._unlink(lru)
                          del self.map[lru.key]
                      n = self.map.get(key)
                      if n is not None:
                          n.val = value
                          self._unlink(n)
                      else:
                          n = self.map[key] = Node(key, value)
                      self._append(n)
            `,
          ],
          explain: md`
            **Hash map + doubly linked list.** The dict maps key → node, so lookup is O(1). The list keeps nodes in recency order, so moving a node to the most-recent end and removing the least-recent one are O(1) pointer swaps. Two **sentinel** nodes (head and tail) remove every "is the list empty?" special case. O(1) per operation, O(capacity) memory.

            The traps:
            - A Python list for the order: \`order.remove(key)\` is O(n). A hot key at the end costs a full scan on every hit.
            - Updating a value without moving the key to the most-recent end.
            - Evicting *before* checking whether the key already exists: an update at capacity throws out a key for nothing.

            **What a strong candidate says**: "In production I'd use \`functools.lru_cache\` or \`OrderedDict.move_to_end\`, which do exactly this in C. For a shared cache (Redis/Memcached) LRU is approximated by sampling. And for concurrency I'd add a lock, or shard the cache by key hash."
          `,
        },
        {
          type: 'choice',
          points: 4,
          prompt: 'A daily batch job aggregates yesterday\'s events into `daily_stats/date=2025-11-12/`. The scheduler sometimes **retries** a run after it failed halfway. Which write strategy keeps the table correct no matter how often it runs?',
          options: ['Overwrite that date partition atomically', 'Append rows; dedupe in the dashboard', 'Append, but skip if files already exist', 'Write files with random unique names'],
          answer: 0,
          explain: md`
            The job must be **idempotent**: running it twice gives the same table as running it once. Recomputing the whole partition and replacing it atomically (\`INSERT OVERWRITE ... PARTITION (date=...)\`, a Delta/Iceberg transaction, or write to a staging path and then swap) does that.

            - Appending duplicates every retry, and pushing dedup downstream means every consumer must get it right.
            - "Skip if files exist" leaves a half-written partition in place forever after a crash mid-write.
            - Random names make every retry add another copy.

            Interviewers want to hear the word **idempotent** and the pattern "deterministic input range → full overwrite of the output range".
          `,
        },
        {
          type: 'choice',
          points: 4,
          prompt: 'Mobile events can arrive up to **48 hours late** (phones offline). Your daily revenue report for day D runs at 01:00 on D+1 and is keyed by **event time**. What is the standard fix?',
          options: ['Recompute days D-2 … D on every run', 'Drop events more than 1 hour late', 'Run the job at 23:59 on day D', 'Key the report by arrival time instead'],
          answer: 0,
          explain: md`
            Use a **lookback window**: each run recomputes the last few event-time partitions (here three days) and overwrites them. Thanks to idempotent overwrites, re-running old days is safe, and day D is final once it's older than the maximum lateness.

            - Dropping late events silently under-reports revenue, mostly for mobile users.
            - Running earlier makes the problem worse.
            - Arrival time is a good partition key for the *raw landing table* (append-only, easy incremental loads). But the business asked for revenue per day the purchase happened, so the report still needs a lookback.

            In streaming the same idea is a **watermark** with allowed lateness: windows stay open for late data and emit updated results.
          `,
        },
      ],
    },

    // ================================================================ 5. data science
    {
      id: 'iv-datasci',
      title: 'Data Science & Analytics Round',
      level: 'Hard',
      minutes: 50,
      style: 'Onsite: data science',
      intro: md`
        The analytics round for data-scientist and product-analyst roles: pandas and statistics on real datasets, then three questions about statistical reasoning. The interviewer cares as much about **what you'd conclude** as about the code.

        **What the interviewer scores**
        - **Exact definitions**: which rows count (completed orders only?), distinct users vs events, pooled vs unpooled standard error, one- vs two-sided tests.
        - **Clean pandas**: groupby/agg/unstack instead of loops, no chained assignment, the right index on the result.
        - **Judgement**: spotting peeking, Simpson's paradox and selection bias before they ship a wrong decision.

        **How grading works**: hidden tests run your functions on the real \`data/*.csv\` files and on small tricky frames (cross-year cohorts, missing funnel steps, a losing treatment).

        > Tip: say the formula before you code it. Most lost points in this round are definition mistakes, not pandas mistakes.
      `,
      questions: [
        {
          type: 'code',
          points: 20,
          title: 'A/B test readout',
          prompt: md`
            \`df\` has one row per user with columns \`group\` (\`"control"\` / \`"treatment"\`) and \`converted\` (0/1), like \`data/ab_test.csv\`.

            Write \`ab_summary(df)\` that returns a dict with exactly these keys:

            - \`p_c\`, \`p_t\`: conversion rates of control and treatment
            - \`lift\`: relative lift \`p_t / p_c - 1\`
            - \`z\`: two-proportion z statistic with the **pooled** standard error
            - \`p_value\`: **two-sided** p-value from the normal distribution
            - \`ci\`: a tuple \`(low, high)\`, the 95 % confidence interval of \`p_t - p_c\` using the **unpooled** standard error and 1.96

            No scipy: use \`math.erf\`, with Φ(x) = (1 + erf(x / √2)) / 2.

            \`\`\`python
            df = pd.read_csv("data/ab_test.csv")
            res = ab_summary(df)
            res["p_value"] < 0.05  # significant?
            \`\`\`
          `,
          setup: py`
            import math
            import pandas as pd
            tiny = pd.DataFrame({
                "group": ["control"] * 100 + ["treatment"] * 100,
                "converted": [1] * 10 + [0] * 90 + [1] * 15 + [0] * 85,
            })
            worse = pd.DataFrame({
                "group": ["treatment", "control"] * 110,
                "converted": ([1, 1] * 20 + [0, 1] * 13
                              + [0, 0] * 77),
            })
          `,
          starter: 'import math\n\ndef ab_summary(df):\n    pass\n',
          solution: py`
            import math

            def ab_summary(df):
                g = df.groupby("group")["converted"]
                n, x = g.count(), g.sum()
                nc, nt = int(n["control"]), int(n["treatment"])
                xc, xt = int(x["control"]), int(x["treatment"])
                pc, pt = xc / nc, xt / nt
                p = (xc + xt) / (nc + nt)  # pooled rate
                se = math.sqrt(p * (1 - p)
                               * (1 / nc + 1 / nt))
                z = (pt - pc) / se
                phi = (1 + math.erf(abs(z) / math.sqrt(2))) / 2
                se_u = math.sqrt(pc * (1 - pc) / nc
                                 + pt * (1 - pt) / nt)
                d = pt - pc
                return {"p_c": pc, "p_t": pt,
                        "lift": pt / pc - 1, "z": z,
                        "p_value": 2 * (1 - phi),
                        "ci": (d - 1.96 * se_u, d + 1.96 * se_u)}
          `,
          tests: [
            { call: 'ab_summary(tiny)["lift"]', expect: '0.5', name: 'lift for 10 % → 15 %' },
            { call: 'round(ab_summary(tiny)["z"], 4)', expect: '1.069', name: 'z with pooled SE' },
            { call: 'round(ab_summary(tiny)["p_value"], 4)', expect: '0.285', name: 'two-sided p-value' },
            { call: 'tuple(round(v, 4) for v in ab_summary(tiny)["ci"])', expect: '(-0.0414, 0.1414)', name: '95 % CI with unpooled SE' },
            { call: 'sorted(ab_summary(tiny))', expect: '["ci", "lift", "p_c", "p_t", "p_value", "z"]', hidden: true, name: 'exactly the six keys' },
            { call: 'ab_summary(pd.read_csv("data/ab_test.csv"))', hidden: true, name: 'the real data/ab_test.csv' },
            { call: 'ab_summary(worse)', hidden: true, name: 'treatment loses (negative z), rows interleaved' },
          ],
          forbid: ['scipy', 'statsmodels'],
          wrong: [
            py`
              import math

              def ab_summary(df):
                  g = df.groupby("group")["converted"]
                  n, x = g.count(), g.sum()
                  nc, nt = int(n["control"]), int(n["treatment"])
                  xc, xt = int(x["control"]), int(x["treatment"])
                  pc, pt = xc / nc, xt / nt
                  se = math.sqrt(pc * (1 - pc) / nc
                                 + pt * (1 - pt) / nt)
                  z = (pt - pc) / se
                  phi = (1 + math.erf(abs(z) / math.sqrt(2))) / 2
                  d = pt - pc
                  return {"p_c": pc, "p_t": pt,
                          "lift": pt / pc - 1, "z": z,
                          "p_value": 2 * (1 - phi),
                          "ci": (d - 1.96 * se, d + 1.96 * se)}
            `,
            py`
              import math

              def ab_summary(df):
                  g = df.groupby("group")["converted"]
                  n, x = g.count(), g.sum()
                  nc, nt = int(n["control"]), int(n["treatment"])
                  xc, xt = int(x["control"]), int(x["treatment"])
                  pc, pt = xc / nc, xt / nt
                  p = (xc + xt) / (nc + nt)
                  se = math.sqrt(p * (1 - p)
                                 * (1 / nc + 1 / nt))
                  z = (pt - pc) / se
                  phi = (1 + math.erf(z / math.sqrt(2))) / 2
                  se_u = math.sqrt(pc * (1 - pc) / nc
                                   + pt * (1 - pt) / nt)
                  d = pt - pc
                  return {"p_c": pc, "p_t": pt,
                          "lift": pt / pc - 1, "z": z,
                          "p_value": 1 - phi,
                          "ci": (d - 1.96 * se_u, d + 1.96 * se_u)}
            `,
            py`
              import math

              def ab_summary(df):
                  g = df.groupby("group")["converted"]
                  n, x = g.count(), g.sum()
                  nc, nt = int(n["control"]), int(n["treatment"])
                  xc, xt = int(x["control"]), int(x["treatment"])
                  pc, pt = xc / nc, xt / nt
                  p = (xc + xt) / (nc + nt)
                  se = math.sqrt(p * (1 - p)
                                 * (1 / nc + 1 / nt))
                  z = (pt - pc) / se
                  phi = (1 + math.erf(abs(z) / math.sqrt(2))) / 2
                  se_u = math.sqrt(pc * (1 - pc) / nc
                                   + pt * (1 - pt) / nt)
                  d = pt - pc
                  return {"p_c": pc, "p_t": pt,
                          "lift": pt - pc, "z": z,
                          "p_value": 2 * (1 - phi),
                          "ci": (d - 1.96 * se_u, d + 1.96 * se_u)}
            `,
          ],
          explain: md`
            Under H₀ both groups share one conversion rate, so the **test** uses the pooled rate p̂ = (x_c + x_t) / (n_c + n_t):

            \`\`\`
            se = sqrt(p̂(1 - p̂)(1/n_c + 1/n_t))
            z  = (p_t - p_c) / se
            p  = 2 · (1 - Φ(|z|))
            \`\`\`

            The **confidence interval** doesn't assume H₀, so it uses each group's own variance: \`sqrt(p_c(1-p_c)/n_c + p_t(1-p_t)/n_t)\`. Knowing *why* the two standard errors differ is a classic senior signal. Other traps: a one-sided p-value (halves the p-value and ignores harm), and reporting the absolute difference as "lift".

            **What a strong candidate adds before saying "ship it"**:
            - **SRM check**: are the group sizes consistent with a 50/50 split? A sample-ratio mismatch means broken assignment, and then no p-value can be trusted.
            - **Practical significance**: is the CI's lower bound still worth the engineering cost?
            - **Segments and guardrails**: per-device effects (the dataset has a \`device\` column), revenue per user, latency.
            - The sample size was fixed in advance (no peeking), and variance reduction like **CUPED** would allow shorter tests.
          `,
        },
        {
          type: 'code',
          points: 20,
          title: 'Monthly cohort retention',
          prompt: md`
            \`df\` has the columns of \`data/orders.csv\` (order_id, user_id, order_date \`"YYYY-MM-DD"\`, …, status). Write \`retention(df)\` that builds a monthly cohort retention table:

            - Use only **completed** orders.
            - A user's cohort is the month of their **first completed** order, as text \`"YYYY-MM"\`.
            - offset = months between an order's month and the cohort month (0 = the cohort month). December 2024 → January 2025 is offset 1.
            - Each cell = share of the cohort's users with at least one completed order at that offset, **rounded to 3 decimals**.

            Return a DataFrame with one row per cohort (index = cohort, sorted) and one column per offset (ints \`0, 1, 2, …\` up to the largest offset), with \`0.0\` where nobody ordered.

            \`\`\`python
            df = pd.DataFrame({
                "user_id": [1, 1, 2, 2, 3],
                "order_date": ["2024-12-05",
                    "2025-01-10", "2024-12-20",
                    "2024-12-21", "2025-01-02"],
                "status": ["completed"] * 5,
            })
            retention(df)
            #            0    1
            # 2024-12  1.0  0.5
            # 2025-01  1.0  0.0
            \`\`\`
          `,
          setup: py`
            import pandas as pd
            tiny = pd.DataFrame({
                "user_id": [1, 1, 2, 2, 3],
                "order_date": ["2024-12-05", "2025-01-10",
                               "2024-12-20", "2024-12-21",
                               "2025-01-02"],
                "status": ["completed"] * 5,
            })
            tricky = pd.DataFrame({
                "user_id": [1, 1, 1, 1, 2, 2],
                "order_date": ["2025-03-01", "2025-04-02",
                               "2025-04-15", "2025-06-01",
                               "2025-04-30", "2025-05-01"],
                "status": ["cancelled", "completed", "completed",
                           "completed", "completed", "returned"],
            })
          `,
          starter: 'import pandas as pd\n\ndef retention(df):\n    pass\n',
          solution: py`
            import pandas as pd

            def retention(df):
                d = df[df["status"] == "completed"].copy()
                ym = d["order_date"].str[:7]  # "YYYY-MM"
                m = (ym.str[:4].astype(int) * 12
                     + ym.str[5:].astype(int))  # month index
                by = d["user_id"]
                d["cohort"] = ym.groupby(by).transform("min")
                first = m.groupby(by).transform("min")
                d["offset"] = m - first
                size = d.groupby("cohort")["user_id"].nunique()
                t = (d.groupby(["cohort", "offset"])["user_id"]
                      .nunique()
                      .unstack(fill_value=0))
                cols = range(int(d["offset"].max()) + 1)
                t = t.reindex(columns=cols, fill_value=0)
                return t.div(size, axis=0).round(3)
          `,
          tests: [
            { call: 'retention(tiny)', expect: 'pd.DataFrame({0: [1.0, 1.0], 1: [0.5, 0.0]}, index=["2024-12", "2025-01"])', name: 'the example (crosses a year)' },
            { call: 'retention(tricky)', expect: 'pd.DataFrame({0: [1.0], 1: [0.0], 2: [0.5]}, index=["2025-04"])', hidden: true, name: 'cancelled first order, two orders in one month' },
            { call: 'retention(pd.read_csv("data/orders.csv"))', hidden: true, name: 'the real data/orders.csv' },
          ],
          wrong: [
            py`
              import pandas as pd

              def retention(df):
                  d = df[df["status"] == "completed"].copy()
                  ym = d["order_date"].str[:7]  # "YYYY-MM"
                  m = (ym.str[:4].astype(int) * 12
                       + ym.str[5:].astype(int))  # month index
                  by = d["user_id"]
                  d["cohort"] = ym.groupby(by).transform("min")
                  first = m.groupby(by).transform("min")
                  d["offset"] = m - first
                  size = d.groupby("cohort")["user_id"].nunique()
                  t = (d.groupby(["cohort", "offset"])["user_id"]
                        .count()
                        .unstack(fill_value=0))
                  cols = range(int(d["offset"].max()) + 1)
                  t = t.reindex(columns=cols, fill_value=0)
                  return t.div(size, axis=0).round(3)
            `,
            py`
              import pandas as pd

              def retention(df):
                  d = df.copy()
                  ym = d["order_date"].str[:7]  # "YYYY-MM"
                  m = (ym.str[:4].astype(int) * 12
                       + ym.str[5:].astype(int))  # month index
                  by = d["user_id"]
                  d["cohort"] = ym.groupby(by).transform("min")
                  first = m.groupby(by).transform("min")
                  d["offset"] = m - first
                  size = d.groupby("cohort")["user_id"].nunique()
                  t = (d.groupby(["cohort", "offset"])["user_id"]
                        .nunique()
                        .unstack(fill_value=0))
                  cols = range(int(d["offset"].max()) + 1)
                  t = t.reindex(columns=cols, fill_value=0)
                  return t.div(size, axis=0).round(3)
            `,
            py`
              import pandas as pd

              def retention(df):
                  d = df[df["status"] == "completed"].copy()
                  ym = d["order_date"].str[:7]
                  m = ym.str[5:].astype(int)  # month number only
                  by = d["user_id"]
                  d["cohort"] = ym.groupby(by).transform("min")
                  first = m.groupby(by).transform("min")
                  d["offset"] = m - first
                  size = d.groupby("cohort")["user_id"].nunique()
                  t = (d.groupby(["cohort", "offset"])["user_id"]
                        .nunique()
                        .unstack(fill_value=0))
                  cols = range(int(d["offset"].max()) + 1)
                  t = t.reindex(columns=cols, fill_value=0)
                  return t.div(size, axis=0).round(3)
            `,
          ],
          explain: md`
            The recipe is the same in pandas, SQL and Spark:
            1. **Filter** to the events that count (completed orders).
            2. **Cohort** per user: \`groupby(user).transform("min")\` keeps the result aligned to every row.
            3. **Offset** as a month index \`year * 12 + month\`, so December → January is +1, not -11.
            4. **Count distinct users** per (cohort, offset), \`unstack\` to a grid, \`reindex\` so every offset column exists, then divide each row by the cohort size.

            The traps the hidden tests check: counting *orders* instead of users (two orders in one month must not count twice), building cohorts from cancelled orders, and month arithmetic that breaks across years.

            **What a strong candidate says**: "Read the table along the diagonals too: newer cohorts have fewer possible offsets, so a falling right edge isn't churn. And small cohorts are noisy, so I'd show cohort sizes next to the shares." In SQL this is \`MIN(month) OVER (PARTITION BY user_id)\` plus \`COUNT(DISTINCT user_id)\` grouped by cohort and offset.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Funnel by device',
          prompt: md`
            \`df\` has the columns of \`data/events.csv\`: user_id, ts, event, device. The funnel steps, in order, are \`page_view → search → add_to_cart → checkout → purchase\`.

            Write \`funnel(df)\` returning a DataFrame with one row per device (index sorted alphabetically) and these columns, **in this order**:

            - the five steps: the number of **distinct users** with at least one event of that step on that device (int, 0 if none)
            - \`conversion\`: purchase users / page_view users, rounded to 3 decimals (\`0.0\` when there are no page views)

            Ignore events that are not funnel steps.

            \`\`\`python
            funnel(pd.read_csv("data/events.csv"))
            \`\`\`
          `,
          setup: py`
            import pandas as pd

            def _ev(rows):
                return pd.DataFrame(rows, columns=["user_id", "ts",
                                                   "event", "device"])

            tiny = _ev([
                (1, "2025-11-01 09:00:00", "page_view", "mobile"),
                (1, "2025-11-01 09:01:00", "page_view", "mobile"),
                (1, "2025-11-01 09:02:00", "search", "mobile"),
                (1, "2025-11-01 09:03:00", "add_to_cart", "mobile"),
                (2, "2025-11-01 10:00:00", "page_view", "mobile"),
                (1, "2025-11-02 08:00:00", "page_view", "desktop"),
                (1, "2025-11-02 08:01:00", "search", "desktop"),
                (1, "2025-11-02 08:02:00", "add_to_cart", "desktop"),
                (1, "2025-11-02 08:03:00", "checkout", "desktop"),
                (1, "2025-11-02 08:04:00", "purchase", "desktop"),
                (3, "2025-11-02 09:00:00", "page_view", "desktop"),
                (3, "2025-11-02 09:01:00", "search", "desktop"),
            ])
            sparse = _ev([
                (7, "2025-11-03 10:00:00", "page_view", "tablet"),
                (8, "2025-11-03 11:00:00", "search", "tv"),
                (8, "2025-11-03 11:01:00", "login", "tv"),
                (9, "2025-11-03 12:00:00", "page_view", "tablet"),
                (9, "2025-11-03 12:05:00", "search", "tablet"),
            ])
          `,
          starter: py`
            import pandas as pd

            STEPS = ["page_view", "search", "add_to_cart",
                     "checkout", "purchase"]

            def funnel(df):
                pass
          `,
          solution: py`
            import pandas as pd

            STEPS = ["page_view", "search", "add_to_cart",
                     "checkout", "purchase"]

            def funnel(df):
                t = (df[df["event"].isin(STEPS)]
                     .groupby(["device", "event"])["user_id"]
                     .nunique()
                     .unstack(fill_value=0)
                     .reindex(columns=STEPS, fill_value=0)
                     .sort_index())
                pv = t["page_view"]
                conv = t["purchase"] / pv.where(pv > 0)
                t["conversion"] = conv.fillna(0.0).round(3)
                return t
          `,
          tests: [
            {
              call: 'funnel(tiny)',
              expect: 'pd.DataFrame({"page_view": [2, 2], "search": [2, 1], "add_to_cart": [1, 1], "checkout": [1, 0], "purchase": [1, 0], "conversion": [0.5, 0.0]}, index=["desktop", "mobile"])',
              name: 'small example: distinct users, not events',
            },
            {
              call: 'funnel(sparse)',
              expect: 'pd.DataFrame({"page_view": [2, 0], "search": [1, 1], "add_to_cart": [0, 0], "checkout": [0, 0], "purchase": [0, 0], "conversion": [0.0, 0.0]}, index=["tablet", "tv"])',
              hidden: true,
              name: 'missing steps, a device with no page views, unknown events',
            },
            { call: 'funnel(pd.read_csv("data/events.csv"))', hidden: true, name: 'the real data/events.csv' },
          ],
          wrong: [
            py`
              import pandas as pd

              STEPS = ["page_view", "search", "add_to_cart",
                       "checkout", "purchase"]

              def funnel(df):
                  t = (df[df["event"].isin(STEPS)]
                       .groupby(["device", "event"])["user_id"]
                       .count()
                       .unstack(fill_value=0)
                       .reindex(columns=STEPS, fill_value=0)
                       .sort_index())
                  pv = t["page_view"]
                  conv = t["purchase"] / pv.where(pv > 0)
                  t["conversion"] = conv.fillna(0.0).round(3)
                  return t
            `,
            py`
              import pandas as pd

              def funnel(df):
                  t = (df.groupby(["device", "event"])["user_id"]
                       .nunique()
                       .unstack(fill_value=0)
                       .sort_index())
                  t["conversion"] = (t["purchase"]
                                     / t["page_view"]).round(3)
                  return t
            `,
            py`
              import pandas as pd

              STEPS = ["page_view", "search", "add_to_cart",
                       "checkout", "purchase"]

              def funnel(df):
                  t = (df[df["event"].isin(STEPS)]
                       .groupby(["device", "event"])["user_id"]
                       .nunique()
                       .unstack(fill_value=0)
                       .reindex(columns=STEPS, fill_value=0)
                       .sort_index())
                  t["conversion"] = (t["purchase"]
                                     / t["page_view"]).round(3)
                  return t
            `,
          ],
          explain: md`
            \`groupby(["device", "event"])["user_id"].nunique()\` counts distinct users per cell; \`unstack\` turns events into columns. Then the two lines everyone forgets:
            - \`reindex(columns=STEPS, fill_value=0)\` puts the steps in **funnel order** (unstack sorts them alphabetically) and creates columns for steps nobody reached.
            - A device with no page views would give \`0 / 0 = NaN\`. Mask the zero denominators and fill with 0.0.

            Counting events instead of users inflates every step: one user who refreshes five times is one visitor, not five.

            **What a strong candidate says**: "This is an *unordered* funnel: a user counts at checkout even if they skipped search. For product decisions I'd also build a **strict** funnel (each step after the previous one, within a session or time limit), report step-to-step conversion, and check whether the device gap comes from traffic mix, for example tablets being mostly returning users."
          `,
        },
        {
          type: 'choice',
          points: 3,
          prompt: 'You check an A/B test every morning and plan to stop **the first day p < 0.05**. If the treatment truly has no effect, what happens to your false-positive rate?',
          options: ['It rises well above 5 %', 'It stays at 5 %', 'It drops below 5 %', 'Only the test\'s power changes'],
          answer: 0,
          explain: md`
            Every look is another chance for random noise to cross the threshold. With daily peeks over a few weeks, the chance of *ever* seeing p < 0.05 under H₀ climbs to 20–30 %. This is **peeking**, a form of p-hacking, like testing 20 metrics and reporting the one that "worked".

            Fixes: decide the sample size up front with a power analysis and look once; or use a **sequential test** built for repeated looks (alpha spending, mSPRT / always-valid p-values); correct for multiple metrics (Bonferroni, Benjamini-Hochberg).
          `,
        },
        {
          type: 'choice',
          points: 3,
          prompt: 'In an experiment, treatment converts better than control on **mobile** and better on **desktop**, yet **worse overall**. What is the most likely explanation?',
          options: ['The groups have a different device mix', 'A rounding error in the overall query', 'The test is underpowered', 'Treatment hurts desktop power users'],
          answer: 0,
          explain: md`
            **Simpson's paradox.** If treatment received a larger share of low-converting mobile traffic, its overall average is pulled down even though it wins inside each segment. The aggregate compares different mixes, not the treatment.

            What a strong candidate does next: check the device split per group (proper randomisation should balance it, so a big difference suggests broken assignment, a sample-ratio mismatch), then report a **stratified** effect (per segment, or reweighted to a common mix).
          `,
        },
        {
          type: 'choice',
          points: 3,
          prompt: 'Users who opened the new **Insights** tab spend 40 % more than users who didn\'t. The PM wants to push everyone into the tab. What is the main problem with that conclusion?',
          options: ['Engaged users self-select into the tab', 'The sample size is too small', 'Spend isn\'t normally distributed', '40 % is below significance'],
          answer: 0,
          explain: md`
            **Selection bias**: nobody assigned users to the tab. Your most engaged, highest-spending users are the ones who explore new features, so the tab may be a *symptom* of engagement rather than its cause.

            The fix is an experiment: promote the tab to a random half of users and compare spend between the halves (an intent-to-treat analysis). If an experiment is impossible, causal-inference methods (matching on pre-period spend, difference-in-differences) help, but state their assumptions.
          `,
        },
      ],
    },

    // ================================================================ 6. SQL
    {
      id: 'iv-sql',
      title: 'SQL Round',
      level: 'Medium-Hard',
      minutes: 40,
      style: 'Onsite: SQL',
      intro: md`
        Almost every data role has a live SQL round: an analyst, data scientist or data engineer writes queries against a small warehouse while the interviewer watches. One NULL trap, then five queries from easy to hard: self-joins, "second highest", window functions (\`LAG\`, \`ROW_NUMBER\`, \`DENSE_RANK\`) and a gaps-and-islands problem.

        **Your environment**: \`conn\` is a \`sqlite3\` connection to an in-memory database built from the course datasets:

        | table | columns |
        |---|---|
        | \`employees\` | emp_id, name, dept_id, manager_id, salary, hire_date |
        | \`departments\` | dept_id, dept_name, location |
        | \`orders\` | order_id, user_id, order_date, product, category, quantity, unit_price, country, status |
        | \`users\` | user_id, name, signup_date, country, plan, age, referrer |
        | \`events\` | user_id, ts, event, device |

        Empty CSV cells are \`NULL\`. Write your query into the string \`sql\`. To try it, add \`print(conn.execute(sql).fetchall())\`.

        **What the interviewer scores**: correct results *including* NULLs and ties, the right window function for the job, and readable CTEs.

        **How grading works**: hidden tests insert extra rows (ties, NULLs, new departments) and re-run your query.

        > Tip: SQLite dialect. Use \`substr(order_date, 1, 7)\` for the month, \`date(ts)\` for the day and \`julianday(d)\` for day arithmetic.
      `,
      questions: [
        {
          type: 'choice',
          points: 3,
          prompt: 'Warm-up: what does this print?',
          code: py`
            import sqlite3
            db = sqlite3.connect(":memory:")
            db.executescript("""
            CREATE TABLE users(id);
            CREATE TABLE banned(id);
            INSERT INTO users VALUES (1), (2), (3);
            INSERT INTO banned VALUES (2), (NULL);
            """)
            q = """SELECT COUNT(*) FROM users
            WHERE id NOT IN (SELECT id FROM banned)"""
            print(db.execute(q).fetchone()[0])
          `,
          options: ['0', '2', '1', '3'],
          answer: 0,
          checkOutput: true,
          explain: md`
            \`id NOT IN (2, NULL)\` means \`id <> 2 AND id <> NULL\`. Comparing with NULL gives NULL (unknown), so the condition is never TRUE and **no row survives**. One NULL in the subquery silently empties the result.

            Use \`NOT EXISTS (SELECT 1 FROM banned b WHERE b.id = u.id)\`, or filter \`WHERE id IS NOT NULL\` inside the subquery. Interviewers love this one because it bites in production anti-joins.
          `,
        },
        {
          type: 'code',
          points: 10,
          title: 'Paid more than the boss',
          prompt: md`
            Table \`employees(emp_id, name, dept_id, manager_id, salary, hire_date)\`. \`manager_id\` points to another employee and is NULL for people without a manager.

            Return every employee who earns **strictly more than their direct manager**, with the columns \`employee\`, \`salary\`, \`manager\`, \`manager_salary\` (any row order).
          `,
          setup: SQL_SETUP,
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT e.name   AS employee,
                   e.salary,
                   m.name   AS manager,
                   m.salary AS manager_salary
            FROM employees e
            JOIN employees m ON m.emp_id = e.manager_id
            WHERE e.salary > m.salary
            """
          `,
          tests: [
            { call: 'conn.execute(sql).fetchall()', expect: '[]', name: 'real data: nobody out-earns their manager' },
            {
              given: py`
                conn.executemany(
                    "INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?)",
                    [(50, "Ada Lovelace", 1, 1, 130000, "2025-01-01"),
                     (51, "Alan Turing", 3, 22, 95000, "2025-01-01"),
                     (52, "Grace Hopper", 3, 22, 89600, "2025-01-01"),
                     (53, "Edsger Dijkstra", None, 50, 140000, "2025-01-01")])
              `,
              call: 'conn.execute(sql).fetchall()',
              expect: '[("Edsger Dijkstra", 140000, "Ada Lovelace", 130000), ("Ada Lovelace", 130000, "Lena Martin", 124800), ("Alan Turing", 95000, "Mila Dubois", 89600)]',
              unordered: true,
              name: 'after hiring four people (one ties with the manager)',
            },
            {
              given: py`
                conn.executemany(
                    "INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?)",
                    [(70, "Temp Worker", None, 43, 60001, "2025-02-01"),
                     (71, "Unpaid Intern", 1, 1, None, "2025-02-01")])
              `,
              call: 'conn.execute(sql).fetchall()',
              expect: '[("Temp Worker", 60001, "Robin Contractor", 60000)]',
              unordered: true,
              hidden: true,
              name: 'manager without a department, NULL salary',
            },
          ],
          wrong: [
            py`
              sql = """
              SELECT e.name, e.salary, m.name, m.salary
              FROM employees e
              JOIN employees m ON m.emp_id = e.manager_id
              WHERE e.salary >= m.salary
              """
            `,
            py`
              sql = """
              SELECT e.name, e.salary, m.name, m.salary
              FROM employees e
              LEFT JOIN employees m ON m.emp_id = e.manager_id
              WHERE e.salary > COALESCE(m.salary, 0)
              """
            `,
            py`
              sql = """
              SELECT e.name, e.salary, m.name, m.salary
              FROM employees e
              JOIN employees m ON e.emp_id = m.manager_id
              WHERE e.salary > m.salary
              """
            `,
          ],
          explain: md`
            A **self-join**: the same table twice under two aliases, one row per (employee, manager) pair. The inner join drops people without a manager, which is exactly right here. "More than" is strict, so a tie is not included.

            The traps: \`LEFT JOIN\` + \`COALESCE(m.salary, 0)\` makes every top-level manager "out-earn" a non-existent boss, and swapping the join condition compares managers with their reports.

            **Follow-ups interviewers ask**: "...than their manager's manager?" (join a third time, or a recursive CTE for any depth) and "...than their department average?" (\`AVG(salary) OVER (PARTITION BY dept_id)\`).
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Second-highest salary per department',
          prompt: md`
            Tables \`employees(emp_id, name, dept_id, manager_id, salary, hire_date)\` and \`departments(dept_id, dept_name, location)\`.

            For **every** department, return \`dept_name\` and the **second-highest distinct salary** in it, or \`NULL\` if there isn't one. Order by \`dept_name\`.

            Example: salaries 90, 90, 80 → 80. A department with one employee (or none) → NULL.
          `,
          setup: SQL_SETUP,
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH ranked AS (
              SELECT dept_id, salary,
                     DENSE_RANK() OVER (
                       PARTITION BY dept_id
                       ORDER BY salary DESC) AS rk
              FROM employees
            )
            SELECT d.dept_name, MAX(r.salary)
            FROM departments d
            LEFT JOIN ranked r
              ON r.dept_id = d.dept_id AND r.rk = 2
            GROUP BY d.dept_id, d.dept_name
            ORDER BY d.dept_name
            """
          `,
          tests: [
            { call: 'conn.execute(sql).fetchall()', expect: '[("Data", 96700), ("Engineering", 105100), ("Marketing", 67100), ("Sales", 74600), ("Support", 52600)]', name: 'real data' },
            {
              given: py`
                conn.execute("INSERT INTO departments VALUES "
                             "(6, 'Research', 'Berlin'), (7, 'Legal', 'Paris')")
                conn.execute("INSERT INTO employees VALUES "
                             "(60, 'Solo Researcher', 6, NULL, 90000, '2025-01-01'),"
                             "(61, 'Top Twin', 2, 13, 115200, '2025-01-01')")
              `,
              call: 'conn.execute(sql).fetchall()',
              expect: '[("Data", 96700), ("Engineering", 105100), ("Legal", None), ("Marketing", 67100), ("Research", None), ("Sales", 74600), ("Support", 52600)]',
              hidden: true,
              name: 'tie at the top, one-person and empty departments',
            },
          ],
          wrong: [
            py`
              sql = """
              WITH ranked AS (
                SELECT dept_id, salary,
                       ROW_NUMBER() OVER (
                         PARTITION BY dept_id
                         ORDER BY salary DESC) AS rk
                FROM employees
              )
              SELECT d.dept_name, MAX(r.salary)
              FROM departments d
              LEFT JOIN ranked r
                ON r.dept_id = d.dept_id AND r.rk = 2
              GROUP BY d.dept_id, d.dept_name
              ORDER BY d.dept_name
              """
            `,
            py`
              sql = """
              WITH ranked AS (
                SELECT dept_id, salary,
                       DENSE_RANK() OVER (
                         PARTITION BY dept_id
                         ORDER BY salary DESC) AS rk
                FROM employees
              )
              SELECT d.dept_name, MAX(r.salary)
              FROM departments d
              JOIN ranked r ON r.dept_id = d.dept_id
              WHERE r.rk = 2
              GROUP BY d.dept_id, d.dept_name
              ORDER BY d.dept_name
              """
            `,
            py`
              sql = """
              SELECT d.dept_name, MAX(e.salary)
              FROM departments d
              LEFT JOIN employees e
                ON e.dept_id = d.dept_id
               AND e.salary < (SELECT MAX(salary) FROM employees)
              GROUP BY d.dept_id, d.dept_name
              ORDER BY d.dept_name
              """
            `,
          ],
          explain: md`
            \`DENSE_RANK\` gives tied salaries the same rank with no gaps (90, 90, 80 → 1, 1, 2), so rank 2 is the second-highest *distinct* salary. The **LEFT JOIN from departments** with \`rk = 2\` inside the \`ON\` clause keeps departments without a match. They get NULL from \`MAX\`.

            Why the alternatives fail:
            - \`ROW_NUMBER\` numbers ties 1, 2, so a tie at the top returns the top salary again. \`RANK\` would skip to 3 and return NULL.
            - Filtering \`rk = 2\` in \`WHERE\` turns the LEFT JOIN back into an inner join: the NULL departments vanish.
            - The uncorrelated \`MAX(salary)\` subquery is the *company* maximum, not the department's.

            This is the most-asked SQL question at big tech. Saying "ROW_NUMBER vs RANK vs DENSE_RANK differ only on ties" earns points by itself.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Month-over-month revenue growth',
          prompt: md`
            Table \`orders(order_id, user_id, order_date 'YYYY-MM-DD', product, category, quantity, unit_price, country, status)\`.

            Revenue = \`quantity * unit_price\` over **completed** orders. Return one row per month with:

            - \`month\` (\`'YYYY-MM'\`)
            - \`revenue\`, rounded to 2 decimals
            - \`prev_revenue\`: the previous month's rounded revenue (NULL for the first month)
            - \`growth\` = \`revenue / prev_revenue - 1\`, not rounded (NULL for the first month)

            Order by month.
          `,
          setup: SQL_SETUP,
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH m AS (
              SELECT substr(order_date, 1, 7) AS month,
                     ROUND(SUM(quantity * unit_price), 2)
                       AS revenue
              FROM orders
              WHERE status = 'completed'
              GROUP BY month
            )
            SELECT month, revenue,
                   LAG(revenue) OVER w AS prev_revenue,
                   revenue / LAG(revenue) OVER w - 1
                     AS growth
            FROM m
            WINDOW w AS (ORDER BY month)
            ORDER BY month
            """
          `,
          tests: [
            { call: 'conn.execute(sql).fetchall()[0]', expect: '("2025-01", 3236.3, None, None)', name: 'first month' },
            { call: 'len(conn.execute(sql).fetchall())', expect: '12', name: 'twelve months' },
            { call: 'conn.execute(sql).fetchall()', hidden: true, tol: 1e-3, name: 'all months match' },
          ],
          wrong: [
            py`
              sql = """
              WITH m AS (
                SELECT substr(order_date, 1, 7) AS month,
                       ROUND(SUM(quantity * unit_price), 2) AS revenue
                FROM orders
                GROUP BY month
              )
              SELECT month, revenue,
                     LAG(revenue) OVER (ORDER BY month),
                     revenue / LAG(revenue) OVER (ORDER BY month) - 1
              FROM m
              ORDER BY month
              """
            `,
            py`
              sql = """
              WITH m AS (
                SELECT substr(order_date, 1, 7) AS month,
                       ROUND(SUM(unit_price), 2) AS revenue
                FROM orders
                WHERE status = 'completed'
                GROUP BY month
              )
              SELECT month, revenue,
                     LAG(revenue) OVER (ORDER BY month),
                     revenue / LAG(revenue) OVER (ORDER BY month) - 1
              FROM m
              ORDER BY month
              """
            `,
            py`
              sql = """
              WITH m AS (
                SELECT substr(order_date, 1, 7) AS month,
                       ROUND(SUM(quantity * unit_price), 2) AS revenue
                FROM orders
                WHERE status = 'completed'
                GROUP BY month
              )
              SELECT month, revenue,
                     LEAD(revenue) OVER (ORDER BY month),
                     revenue / LEAD(revenue) OVER (ORDER BY month) - 1
              FROM m
              ORDER BY month
              """
            `,
          ],
          explain: md`
            Aggregate first (a CTE with one row per month), **then** apply the window function: \`LAG(revenue) OVER (ORDER BY month)\` reads the previous row. A named \`WINDOW w\` avoids repeating the definition. NULL propagates, so the first month's growth is NULL automatically.

            The traps: forgetting \`status = 'completed'\` (cancelled and returned orders aren't revenue), \`SUM(unit_price)\` without the quantity, and \`LEAD\` (next month) instead of \`LAG\`.

            **What a strong candidate mentions**: if a month had no orders, \`LAG\` would compare with the month *before* the gap. The robust version joins against a calendar table of all months first. And for YoY growth on daily data: \`LAG(revenue, 12)\` on monthly rows, or a self-join on month − 12.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Top 3 customers per country',
          prompt: md`
            Table \`orders(order_id, user_id, order_date, product, category, quantity, unit_price, country, status)\`. \`orders.country\` is the customer's country.

            A customer's revenue = \`SUM(quantity * unit_price)\` over their **completed** orders. Return the **top 3 customers per country**: \`country\`, \`user_id\`, \`revenue\` (rounded to 2 decimals). Rank by revenue, highest first, and break ties by the **smaller user_id**, so every country has at most 3 rows.

            Order by country, then revenue descending, then user_id.
          `,
          setup: SQL_SETUP,
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH rev AS (
              SELECT country, user_id,
                     SUM(quantity * unit_price) AS revenue
              FROM orders
              WHERE status = 'completed'
              GROUP BY country, user_id
            ), ranked AS (
              SELECT *, ROW_NUMBER() OVER (
                       PARTITION BY country
                       ORDER BY revenue DESC, user_id) AS rn
              FROM rev
            )
            SELECT country, user_id, ROUND(revenue, 2)
            FROM ranked
            WHERE rn <= 3
            ORDER BY country, revenue DESC, user_id
            """
          `,
          tests: [
            { call: 'conn.execute(sql).fetchall()[:3]', expect: '[("DE", 289, 1244.2), ("DE", 220, 1002.6), ("DE", 244, 828.9)]', name: 'Germany\'s top 3' },
            { call: 'len(conn.execute(sql).fetchall())', expect: '24', name: '8 countries × 3' },
            { call: 'conn.execute(sql).fetchall()', hidden: true, name: 'all rows match' },
            {
              given: py`
                conn.executemany(
                    "INSERT INTO orders VALUES (?, ?, '2025-06-01',"
                    " 'Lamp', 'Home', 1, ?, 'PL', ?)",
                    [(9001, 901, 100.0, "completed"),
                     (9002, 902, 50.0, "completed"),
                     (9003, 903, 50.0, "completed"),
                     (9004, 904, 50.0, "completed"),
                     (9005, 904, 500.0, "cancelled")])
              `,
              call: '[r for r in conn.execute(sql).fetchall() if r[0] == "PL"]',
              expect: '[("PL", 901, 100.0), ("PL", 902, 50.0), ("PL", 903, 50.0)]',
              hidden: true,
              name: 'a new country with a three-way tie and a cancelled order',
            },
          ],
          wrong: [
            py`
              sql = """
              WITH rev AS (
                SELECT country, user_id,
                       SUM(quantity * unit_price) AS revenue
                FROM orders
                WHERE status = 'completed'
                GROUP BY country, user_id
              ), ranked AS (
                SELECT *, DENSE_RANK() OVER (
                         PARTITION BY country
                         ORDER BY revenue DESC) AS rn
                FROM rev
              )
              SELECT country, user_id, ROUND(revenue, 2)
              FROM ranked
              WHERE rn <= 3
              ORDER BY country, revenue DESC, user_id
              """
            `,
            py`
              sql = """
              SELECT country, user_id,
                     ROUND(SUM(quantity * unit_price), 2) AS revenue
              FROM orders
              WHERE status = 'completed'
              GROUP BY country, user_id
              ORDER BY country, revenue DESC, user_id
              LIMIT 3
              """
            `,
            py`
              sql = """
              WITH rev AS (
                SELECT country, user_id,
                       SUM(quantity * unit_price) AS revenue
                FROM orders
                GROUP BY country, user_id
              ), ranked AS (
                SELECT *, ROW_NUMBER() OVER (
                         PARTITION BY country
                         ORDER BY revenue DESC, user_id) AS rn
                FROM rev
              )
              SELECT country, user_id, ROUND(revenue, 2)
              FROM ranked
              WHERE rn <= 3
              ORDER BY country, revenue DESC, user_id
              """
            `,
          ],
          explain: md`
            "Top N **per group**" = aggregate, then \`ROW_NUMBER() OVER (PARTITION BY group ORDER BY metric DESC, tiebreak)\`, then filter \`rn <= N\` in an outer query. Window functions are evaluated after \`WHERE\` and \`GROUP BY\`, which is why the filter needs the extra CTE level (or \`QUALIFY\` in Snowflake/BigQuery/DuckDB).

            The traps: \`LIMIT 3\` is global, not per country; \`RANK\`/\`DENSE_RANK\` without a tie-break lets ties push a country past 3 rows; and cancelled orders aren't revenue.

            **What a strong candidate says**: "I'd confirm the tie rule with the stakeholder: 'top 3' with ties could legitimately mean \`RANK() <= 3\`. Here the spec says exactly 3, so ROW_NUMBER with user_id as a deterministic tie-break." Deterministic output matters in pipelines: the same input must always produce the same table.
          `,
        },
        {
          type: 'code',
          points: 20,
          title: 'Active 3 days in a row',
          prompt: md`
            Table \`events(user_id, ts 'YYYY-MM-DD HH:MM:SS', event, device)\`.

            Return the \`user_id\` of every user who was active (any event) on **at least 3 consecutive calendar days**, one row per user, ordered by user_id.
          `,
          setup: SQL_SETUP,
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH days AS (
              SELECT DISTINCT user_id, date(ts) AS day
              FROM events
            ), grouped AS (
              SELECT user_id,
                     julianday(day) - ROW_NUMBER() OVER (
                       PARTITION BY user_id ORDER BY day) AS grp
              FROM days
            )
            SELECT DISTINCT user_id
            FROM grouped
            GROUP BY user_id, grp
            HAVING COUNT(*) >= 3
            ORDER BY user_id
            """
          `,
          tests: [
            { call: 'conn.execute(sql).fetchall()', expect: '[(41,), (220,)]', name: 'real data' },
            {
              given: py`
                conn.executemany(
                    "INSERT INTO events VALUES (?, ?, 'page_view', 'mobile')",
                    [(990, "2025-11-10 23:59:00"), (990, "2025-11-11 00:01:00"),
                     (990, "2025-11-11 12:00:00"), (990, "2025-11-12 08:00:00"),
                     (991, "2025-11-01 10:00:00"), (991, "2025-11-02 10:00:00"),
                     (991, "2025-11-04 10:00:00"), (991, "2025-11-05 10:00:00"),
                     (992, "2025-11-01 09:00:00"), (992, "2025-11-02 09:00:00"),
                     (992, "2025-11-03 09:00:00"), (992, "2025-11-20 09:00:00"),
                     (992, "2025-11-21 09:00:00"), (992, "2025-11-22 09:00:00"),
                     (993, "2025-11-15 01:00:00"), (993, "2025-11-15 02:00:00"),
                     (993, "2025-11-15 03:00:00"),
                     (994, "2025-10-31 18:00:00"), (994, "2025-11-01 18:00:00"),
                     (994, "2025-11-02 18:00:00")])
              `,
              call: 'conn.execute(sql).fetchall()',
              expect: '[(41,), (220,), (990,), (992,), (994,)]',
              hidden: true,
              name: 'many events per day, two streaks, a month boundary',
            },
          ],
          wrong: [
            py`
              sql = """
              WITH grouped AS (
                SELECT user_id,
                       julianday(date(ts)) - ROW_NUMBER() OVER (
                         PARTITION BY user_id ORDER BY ts) AS grp
                FROM events
              )
              SELECT DISTINCT user_id
              FROM grouped
              GROUP BY user_id, grp
              HAVING COUNT(*) >= 3
              ORDER BY user_id
              """
            `,
            py`
              sql = """
              SELECT user_id
              FROM events
              GROUP BY user_id
              HAVING COUNT(DISTINCT date(ts)) >= 3
              ORDER BY user_id
              """
            `,
            py`
              sql = """
              WITH days AS (
                SELECT DISTINCT user_id, date(ts) AS day
                FROM events
              ), grouped AS (
                SELECT user_id,
                       julianday(day) - ROW_NUMBER() OVER (
                         PARTITION BY user_id ORDER BY day) AS grp
                FROM days
              )
              SELECT user_id
              FROM grouped
              GROUP BY user_id, grp
              HAVING COUNT(*) >= 3
              ORDER BY user_id
              """
            `,
          ],
          explain: md`
            **Gaps and islands.** On consecutive days, the day number and the row number grow together, so \`julianday(day) - ROW_NUMBER()\` stays constant within a streak and jumps after a gap. Group by that difference and count. Three details decide it:
            - **Deduplicate days first.** Two events on one day would get two row numbers and break the streak.
            - Use real date arithmetic (\`julianday\`), so Oct 31 → Nov 1 is consecutive.
            - \`SELECT DISTINCT\` at the end: a user with two separate streaks must appear once.

            An equally good answer: with distinct days, \`julianday(day) - julianday(LAG(day, 2) OVER (PARTITION BY user_id ORDER BY day)) = 2\` means "this day and the two before it are consecutive".

            **What a strong candidate says**: "This is the same pattern as longest-streak, sessionization and outage detection. On a warehouse with billions of events, I'd compute it on a pre-aggregated daily-activity table, not on raw events."
          `,
        },
      ],
    },

    // ================================================================ 7. final loop
    {
      id: 'iv-final',
      title: 'Final Onsite Loop',
      level: 'Very hard',
      minutes: 60,
      style: 'Final onsite loop',
      intro: md`
        The last day of a big-tech onsite, compressed into one hour: four production-flavoured coding problems and two data-system design questions. Nothing here is a textbook puzzle. Each problem is a component you'd find in a real data platform (a rate limiter, a streaming median, an uptime calculator, a group-by engine).

        **What the interviewer scores**
        - **Design before code**: name the data structure and its invariant, the complexity, and the memory bound.
        - **Production edge cases**: exact window boundaries, rejected requests, floats, None values, touching intervals, skewed keys.
        - **Trade-offs**: exact vs approximate, single machine vs distributed, what you'd monitor.

        **How grading works**: every coding problem has hidden edge cases and a time-limited test with tens of thousands of operations. This is the bar-raiser round, and an A here is a strong hire signal.

        > Tip: if you're stuck, say the brute force and its cost, then optimise. Silence is the only answer that scores zero.
      `,
      questions: [
        {
          type: 'code',
          points: 20,
          title: 'Sliding-window rate limiter',
          prompt: md`
            Implement a rate limiter for an API gateway: \`RateLimiter(limit, window)\` with \`allow(user, ts) -> bool\`.

            - A request is allowed if the user had fewer than \`limit\` **allowed** requests with timestamps in \`(ts - window, ts]\`.
            - Rejected requests don't count against the user.
            - Calls arrive in non-decreasing \`ts\` order (ints or floats, seconds). Users are independent.

            \`\`\`python
            rl = RateLimiter(2, 10)
            rl.allow("a", 0)   # True
            rl.allow("a", 5)   # True
            rl.allow("a", 9)   # False: 0 and 5 in (-1, 9]
            rl.allow("b", 9)   # True
            rl.allow("a", 10)  # True: 0 left the window
            \`\`\`

            Constraints: up to \`10**5\` calls, \`limit\` up to \`10**4\`. Each call must be amortised O(1), memory O(users × limit).
          `,
          setup: py`
            import random

            def _drive(limit, window, calls):
                rl = RateLimiter(limit, window)
                return [rl.allow(u, t) for u, t in calls]

            random.seed(9)
            CALLS = []
            _t = 0.0
            for _ in range(60_000):
                _t += random.random() * 0.01
                CALLS.append(("u" + str(random.randrange(4)), _t))
          `,
          starter: py`
            class RateLimiter:
                def __init__(self, limit, window):
                    pass

                def allow(self, user, ts):
                    pass
          `,
          solution: py`
            from collections import defaultdict, deque

            class RateLimiter:
                def __init__(self, limit, window):
                    self.limit = limit
                    self.window = window
                    self.log = defaultdict(deque)  # allowed ts

                def allow(self, user, ts):
                    q = self.log[user]
                    while q and q[0] <= ts - self.window:
                        q.popleft()  # left the window
                    if len(q) < self.limit:
                        q.append(ts)
                        return True
                    return False
          `,
          tests: [
            { call: '_drive(2, 10, [("a", 0), ("a", 5), ("a", 9), ("b", 9), ("a", 10)])', expect: '[True, True, False, True, True]', name: 'the example' },
            { call: '_drive(2, 10, [("a", 8), ("a", 9), ("a", 11), ("a", 18), ("a", 19)])', expect: '[True, True, False, True, True]', hidden: true, name: 'burst across a window boundary' },
            { call: '_drive(1, 10, [("a", 0), ("a", 5), ("a", 10)])', expect: '[True, False, True]', hidden: true, name: 'rejected requests do not count' },
            { call: '_drive(3, 1, [("a", 5)] * 5)', expect: '[True, True, True, False, False]', hidden: true, name: 'same timestamp' },
            { call: '_drive(1, 0.5, [("a", 0.25), ("a", 0.5), ("a", 0.75), ("b", 0.75)])', expect: '[True, False, True, True]', hidden: true, name: 'float timestamps' },
            { call: 'sum(_drive(4_000, 100, CALLS))', expect: '48071', hidden: true, maxMs: 400, name: '60,000 calls, limit 4,000' },
          ],
          wrong: [
            py`
              from collections import defaultdict

              class RateLimiter:
                  def __init__(self, limit, window):
                      self.limit = limit
                      self.window = window
                      self.count = defaultdict(int)

                  def allow(self, user, ts):
                      key = (user, int(ts // self.window))
                      if self.count[key] < self.limit:
                          self.count[key] += 1
                          return True
                      return False
            `,
            py`
              from collections import defaultdict, deque

              class RateLimiter:
                  def __init__(self, limit, window):
                      self.limit = limit
                      self.window = window
                      self.log = defaultdict(deque)

                  def allow(self, user, ts):
                      q = self.log[user]
                      while q and q[0] <= ts - self.window:
                          q.popleft()
                      q.append(ts)
                      return len(q) <= self.limit
            `,
            py`
              from collections import defaultdict

              class RateLimiter:
                  def __init__(self, limit, window):
                      self.limit = limit
                      self.window = window
                      self.log = defaultdict(list)

                  def allow(self, user, ts):
                      start = ts - self.window
                      log = [t for t in self.log[user] if t > start]
                      self.log[user] = log
                      if len(log) < self.limit:
                          log.append(ts)
                          return True
                      return False
            `,
          ],
          explain: md`
            **Sliding-window log**: per user, a deque of the timestamps of *allowed* requests. On each call, pop expired timestamps from the left (each timestamp is popped at most once, so amortised O(1)), then allow if fewer than \`limit\` remain. Memory O(users × limit).

            Why the alternatives fail:
            - **Fixed windows** (\`ts // window\`) let a user send 2 × limit requests around a boundary.
            - Logging rejected requests lets a retrying client lock itself out forever.
            - Rebuilding the list on every call is O(limit) per request.

            **What a strong candidate discusses**:
            - **Token bucket** (O(1) memory per user, smooth refill, allows controlled bursts) and the **sliding-window counter** (two fixed-window counters, weighted: approximate but tiny), which is what most API gateways actually run.
            - **Distributed**: state in Redis (a sorted set per user with \`ZREMRANGEBYSCORE\` + \`ZCARD\` in one Lua script, or a token bucket), sharded by user, with a TTL so idle users don't leak memory.
            - What to return: HTTP 429 with a \`Retry-After\` header.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Running median of a stream',
          prompt: md`
            Latency samples stream in and a dashboard shows the running median. Implement \`MedianFinder\` with \`add(x)\` and \`median()\`:

            - \`median()\` returns the middle value as a float. For an even count, it's the mean of the two middle values. With no values yet, return \`None\`.

            \`\`\`python
            m = MedianFinder()
            m.add(5)
            m.add(1)
            m.median()  # 3.0
            m.add(10)
            m.median()  # 5.0
            \`\`\`

            Constraints: up to \`10**5\` calls of each, interleaved. \`add\` in O(log n), \`median\` in O(1).
          `,
          setup: py`
            import random

            def _stream(xs):
                m = MedianFinder()
                out = [m.median()]
                for x in xs:
                    m.add(x)
                    out.append(m.median())
                return out

            def _total(xs):
                m = MedianFinder()
                s = 0.0
                for x in xs:
                    m.add(x)
                    s += m.median()
                return s

            random.seed(12)
            LAT = [random.randrange(1, 10_000) for _ in range(30_000)]
          `,
          starter: py`
            class MedianFinder:
                def __init__(self):
                    pass

                def add(self, x):
                    pass

                def median(self):
                    pass
          `,
          solution: py`
            import heapq

            class MedianFinder:
                def __init__(self):
                    self.lo = []  # max-heap (negated): lower half
                    self.hi = []  # min-heap: upper half

                def add(self, x):
                    lo, hi = self.lo, self.hi
                    heapq.heappush(lo, -x)
                    # move lo's largest to hi: keeps lo <= hi
                    heapq.heappush(hi, -heapq.heappop(lo))
                    if len(hi) > len(lo):  # rebalance sizes
                        heapq.heappush(lo, -heapq.heappop(hi))

                def median(self):
                    if not self.lo:
                        return None
                    if len(self.lo) > len(self.hi):
                        return float(-self.lo[0])
                    return (-self.lo[0] + self.hi[0]) / 2
          `,
          tests: [
            { call: '_stream([5, 1, 10])', expect: '[None, 5.0, 3.0, 5.0]', name: 'the example' },
            { call: '_stream([1, 2, 3, 4, 5])', expect: '[None, 1.0, 1.5, 2.0, 2.5, 3.0]', hidden: true, name: 'ascending input' },
            { call: '_stream([5, 4, 3, 2, 1])', expect: '[None, 5.0, 4.5, 4.0, 3.5, 3.0]', hidden: true, name: 'descending input' },
            { call: '_stream([2, 2, 2])', expect: '[None, 2.0, 2.0, 2.0]', hidden: true, name: 'duplicates' },
            { call: '_stream([-1.5, -3, 4, 0])', expect: '[None, -1.5, -2.25, -1.5, -0.75]', hidden: true, name: 'negatives and floats' },
            { call: '_total(LAT)', expect: '150149495.5', hidden: true, maxMs: 280, name: '30,000 adds + 30,000 medians' },
          ],
          wrong: [
            py`
              class MedianFinder:
                  def __init__(self):
                      self.xs = []

                  def add(self, x):
                      self.xs.append(x)

                  def median(self):
                      if not self.xs:
                          return None
                      s = self.xs
                      s.sort()
                      n = len(s)
                      if n % 2:
                          return float(s[n // 2])
                      return (s[n // 2 - 1] + s[n // 2]) / 2
            `,
            py`
              import heapq

              class MedianFinder:
                  def __init__(self):
                      self.lo, self.hi = [], []

                  def add(self, x):
                      heapq.heappush(self.lo, -x)
                      heapq.heappush(self.hi, -heapq.heappop(self.lo))
                      if len(self.hi) > len(self.lo):
                          heapq.heappush(self.lo, -heapq.heappop(self.hi))

                  def median(self):
                      if not self.lo:
                          return None
                      return float(-self.lo[0])
            `,
            py`
              import heapq

              class MedianFinder:
                  def __init__(self):
                      self.lo, self.hi = [], []

                  def add(self, x):
                      if not self.lo or x <= -self.lo[0]:
                          heapq.heappush(self.lo, -x)
                      else:
                          heapq.heappush(self.hi, x)
                      if len(self.lo) > len(self.hi) + 1:
                          heapq.heappush(self.hi, -heapq.heappop(self.lo))

                  def median(self):
                      if not self.lo:
                          return None
                      if len(self.lo) > len(self.hi):
                          return float(-self.lo[0])
                      return (-self.lo[0] + self.hi[0]) / 2
            `,
          ],
          explain: md`
            **Two heaps.** \`lo\` is a max-heap (store negatives) with the smaller half, \`hi\` a min-heap with the larger half. Invariants: every value in \`lo\` ≤ every value in \`hi\`, and \`len(lo)\` is \`len(hi)\` or one more. The median is then \`lo\`'s top, or the mean of both tops. Pushing through \`lo\` into \`hi\` and moving one back if \`hi\` got bigger restores both invariants in O(log n).

            The traps: re-sorting on every \`median()\` call (O(n log n) each), forgetting to average for even counts, and rebalancing in only one direction (ascending input then breaks the size invariant).

            **What a strong candidate discusses**: "For latency we usually want p99, not just p50, over a *sliding* window and across many servers. Exact two-heap medians don't merge or expire cheaply, so production systems use **t-digest** or HDR histograms (mergeable, bounded memory, small relative error)." Removal from a sliding window needs lazy deletion (a 'to delete' counter per value) or a sorted container.
          `,
        },
        {
          type: 'code',
          points: 15,
          title: 'Merge busy intervals',
          prompt: md`
            Each interval \`(start, end)\` is a half-open range \`[start, end)\` when a server was busy, with integers \`start < end\`. The list is unsorted, and intervals may overlap, nest or touch.

            Write \`merge_and_cover(intervals)\` returning a tuple \`(merged, total)\`:

            - \`merged\`: disjoint \`(start, end)\` tuples sorted by start. Touching intervals like \`(1, 3)\` and \`(3, 5)\` merge into \`(1, 5)\`.
            - \`total\`: total covered time, the sum of the merged lengths.

            \`\`\`python
            merge_and_cover([(5, 8), (1, 3),
                             (2, 4), (8, 9)])
            # ([(1, 4), (5, 9)], 7)
            \`\`\`

            Constraints: up to \`2 * 10**5\` intervals. O(n log n).
          `,
          setup: py`
            import random
            random.seed(4)
            BUSY = []
            for _ in range(15_000):
                _s = random.randrange(10**7)
                BUSY.append((_s, _s + random.randrange(1, 400)))

            def _sig(res):
                merged, total = res
                return (len(merged), merged[:2], merged[-1], total)
          `,
          starter: 'def merge_and_cover(intervals):\n    pass\n',
          solution: py`
            def merge_and_cover(intervals):
                merged = []
                for s, e in sorted(intervals):
                    if merged and s <= merged[-1][1]:
                        ps, pe = merged[-1]
                        merged[-1] = (ps, max(pe, e))
                    else:
                        merged.append((s, e))
                total = sum(e - s for s, e in merged)
                return merged, total
          `,
          tests: [
            { call: 'merge_and_cover([(5, 8), (1, 3), (2, 4), (8, 9)])', expect: '([(1, 4), (5, 9)], 7)' },
            { call: 'merge_and_cover([])', expect: '([], 0)' },
            { call: 'merge_and_cover([(1, 10), (2, 3), (4, 5)])', expect: '([(1, 10)], 9)', hidden: true, name: 'nested intervals' },
            { call: 'merge_and_cover([(1, 3), (3, 5)])', expect: '([(1, 5)], 4)', hidden: true, name: 'touching intervals' },
            { call: 'merge_and_cover([(2, 4), (2, 4)])', expect: '([(2, 4)], 2)', hidden: true, name: 'duplicates' },
            { call: 'merge_and_cover([(10, 12), (1, 2), (11, 15), (2, 10)])', expect: '([(1, 15)], 14)', hidden: true, name: 'unsorted chain' },
            { call: 'merge_and_cover([(0, 1), (5, 6)])', expect: '([(0, 1), (5, 6)], 2)', hidden: true, name: 'disjoint' },
            { call: '_sig(merge_and_cover(BUSY))', expect: '(11087, [(1477, 1763), (2580, 3138)], (9999686, 9999848), 2586209)', hidden: true, maxMs: 200, name: '15,000 intervals' },
          ],
          wrong: [
            py`
              def merge_and_cover(intervals):
                  merged = []
                  for s, e in sorted(intervals):
                      if merged and s <= merged[-1][1]:
                          merged[-1] = (merged[-1][0], e)
                      else:
                          merged.append((s, e))
                  total = sum(e - s for s, e in merged)
                  return merged, total
            `,
            py`
              def merge_and_cover(intervals):
                  merged = []
                  for s, e in sorted(intervals):
                      if merged and s < merged[-1][1]:
                          ps, pe = merged[-1]
                          merged[-1] = (ps, max(pe, e))
                      else:
                          merged.append((s, e))
                  total = sum(e - s for s, e in merged)
                  return merged, total
            `,
            py`
              def merge_and_cover(intervals):
                  merged = []
                  for s, e in intervals:
                      keep = []
                      for ms, me in merged:
                          if ms <= e and s <= me:
                              s, e = min(s, ms), max(e, me)
                          else:
                              keep.append((ms, me))
                      keep.append((s, e))
                      merged = keep
                  merged.sort()
                  return merged, sum(e - s for s, e in merged)
            `,
          ],
          explain: md`
            **Sort by start, then sweep.** After sorting, an interval either overlaps/touches the last merged one (\`s <= last_end\`: extend the end to \`max(last_end, e)\`) or starts a new block. O(n log n) for the sort, O(n) sweep.

            The traps: setting the end to \`e\` instead of \`max(...)\` breaks on nested intervals (\`(1, 10)\` swallows \`(2, 3)\`); \`<\` instead of \`<=\` leaves touching half-open intervals unmerged; and comparing each new interval with every merged block is O(n²).

            **What a strong candidate discusses**:
            - **Uptime/SLA**: the covered time over a period is exactly how "busy" or "down" minutes are computed from incident logs.
            - **Peak concurrency** (how many intervals overlap at most) is the sibling question: sweep sorted +1/-1 events, or keep a min-heap of end times (meeting rooms).
            - **At scale**: partition by server, sort within partitions; in SQL use \`MAX(end) OVER (ORDER BY start ROWS UNBOUNDED PRECEDING)\` to find where new blocks start.
          `,
        },
        {
          type: 'code',
          points: 20,
          title: 'GROUP BY engine without pandas',
          prompt: md`
            Implement a tiny \`groupby().agg()\` in plain Python, as you would inside a map-reduce reducer: \`group_agg(rows, by, aggs)\`.

            - \`rows\`: list of dicts. \`by\`: list of column names (their values are never None).
            - \`aggs\`: dict \`output_name -> (column, func)\`, func one of \`"count"\`, \`"sum"\`, \`"mean"\`, \`"min"\`, \`"max"\`, \`"nunique"\`.
            - Return a list of dicts, one per group, **sorted by the group values**, each with the \`by\` columns plus one entry per output name.

            **Missing data**, like SQL: values that are \`None\` or missing are ignored. \`"count"\` counts non-null values, except \`("*", "count")\`, which counts rows. \`"sum"\`, \`"mean"\`, \`"min"\`, \`"max"\` of no values → \`None\`; \`"nunique"\` → 0.

            \`\`\`python
            rows = [
              {"city": "Zagreb", "temp": 10, "rain": 1},
              {"city": "Berlin", "temp": 4, "rain": None},
              {"city": "Zagreb", "temp": 14, "rain": 3},
            ]
            group_agg(rows, ["city"], {
                "n": ("*", "count"),
                "avg_t": ("temp", "mean"),
                "wet": ("rain", "count"),
            })
            # [{'city': 'Berlin', 'n': 1,
            #   'avg_t': 4.0, 'wet': 0},
            #  {'city': 'Zagreb', 'n': 2,
            #   'avg_t': 12.0, 'wet': 2}]
            \`\`\`

            Constraints: up to \`10**5\` rows and \`10**4\` groups. One pass over the rows.
          `,
          setup: py`
            import random
            CITY = [
                {"city": "Zagreb", "temp": 10, "rain": 1},
                {"city": "Berlin", "temp": 4, "rain": None},
                {"city": "Zagreb", "temp": 14, "rain": 3},
            ]
            SALES = [
                {"region": "EU", "shop": "b", "amt": 5, "sku": "x"},
                {"region": "US", "shop": "a", "amt": None, "sku": "y"},
                {"region": "EU", "shop": "a", "amt": 7, "sku": "x"},
                {"region": "EU", "shop": "b", "amt": 1},
                {"region": "EU", "shop": "b", "amt": None, "sku": "z"},
                {"region": "US", "shop": "a", "sku": "y"},
            ]
            ALL = {f: ("amt", f) for f in
                   ["count", "sum", "mean", "min", "max", "nunique"]}
            ALL["rows"] = ("*", "count")
            ALL["skus"] = ("sku", "nunique")
            ALL["first_sku"] = ("sku", "min")

            random.seed(8)
            BIG = [{"user": "u" + str(random.randrange(1_000)),
                    "amt": random.choice([None, *range(1, 50)]),
                    "cat": random.choice("abcde")}
                   for _ in range(20_000)]
            BIG_AGGS = {"n": ("*", "count"), "total": ("amt", "sum"),
                        "avg": ("amt", "mean"),
                        "cats": ("cat", "nunique")}

            def _sig(res):
                return (len(res), res[0], res[-1],
                        round(sum(r["avg"] or 0 for r in res), 6))
          `,
          starter: 'def group_agg(rows, by, aggs):\n    pass\n',
          solution: py`
            FINISH = {
                "count": len,
                "sum": lambda v: sum(v) if v else None,
                "mean": lambda v: sum(v) / len(v) if v else None,
                "min": lambda v: min(v) if v else None,
                "max": lambda v: max(v) if v else None,
                "nunique": lambda v: len(set(v)),
            }

            def group_agg(rows, by, aggs):
                groups = {}  # key tuple -> {output: [values]}
                for r in rows:
                    key = tuple(r[c] for c in by)
                    acc = groups.get(key)
                    if acc is None:
                        acc = groups[key] = {o: [] for o in aggs}
                    for o, (col, fn) in aggs.items():
                        v = 1 if col == "*" else r.get(col)
                        if v is not None:
                            acc[o].append(v)
                out = []
                for key in sorted(groups):
                    row = dict(zip(by, key))
                    for o, (col, fn) in aggs.items():
                        row[o] = FINISH[fn](groups[key][o])
                    out.append(row)
                return out
          `,
          tests: [
            {
              call: 'group_agg(CITY, ["city"], {"n": ("*", "count"), "avg_t": ("temp", "mean"), "wet": ("rain", "count")})',
              expect: '[{"city": "Berlin", "n": 1, "avg_t": 4.0, "wet": 0}, {"city": "Zagreb", "n": 2, "avg_t": 12.0, "wet": 2}]',
              name: 'the example',
            },
            {
              call: 'group_agg(SALES, ["region", "shop"], ALL)',
              expect: '[{"region": "EU", "shop": "a", "count": 1, "sum": 7, "mean": 7.0, "min": 7, "max": 7, "nunique": 1, "rows": 1, "skus": 1, "first_sku": "x"}, {"region": "EU", "shop": "b", "count": 2, "sum": 6, "mean": 3.0, "min": 1, "max": 5, "nunique": 2, "rows": 3, "skus": 2, "first_sku": "x"}, {"region": "US", "shop": "a", "count": 0, "sum": None, "mean": None, "min": None, "max": None, "nunique": 0, "rows": 2, "skus": 1, "first_sku": "y"}]',
              hidden: true,
              name: 'two keys, every function, None and missing values',
            },
            { call: 'group_agg([], ["city"], {"n": ("*", "count")})', expect: '[]', hidden: true, name: 'no rows' },
            { call: 'group_agg(CITY, ["city"], {"hot": ("temp", "max"), "total": ("rain", "sum")})', expect: '[{"city": "Berlin", "hot": 4, "total": None}, {"city": "Zagreb", "hot": 14, "total": 4}]', hidden: true, name: 'sum of only None is None' },
            { call: '_sig(group_agg(BIG, ["user"], BIG_AGGS))', expect: '(1000, {"user": "u0", "n": 30, "total": 824, "avg": 27.466666666666665, "cats": 5}, {"user": "u999", "n": 18, "total": 453, "avg": 25.166666666666668, "cats": 5}, 24838.089826)', hidden: true, maxMs: 270, name: '20,000 rows, 1,000 groups' },
          ],
          wrong: [
            py`
              FINISH = {
                  "count": len,
                  "sum": lambda v: sum(v) if v else None,
                  "mean": lambda v: sum(v) / len(v) if v else None,
                  "min": lambda v: min(v) if v else None,
                  "max": lambda v: max(v) if v else None,
                  "nunique": lambda v: len(set(v)),
              }

              def group_agg(rows, by, aggs):
                  groups = {}
                  for r in rows:
                      key = tuple(r[c] for c in by)
                      acc = groups.setdefault(key, {o: [] for o in aggs})
                      for o, (col, fn) in aggs.items():
                          acc[o].append(1 if col == "*" else r.get(col))
                  out = []
                  for key in sorted(groups):
                      row = dict(zip(by, key))
                      for o, (col, fn) in aggs.items():
                          vals = groups[key][o]
                          if fn != "count":
                              vals = [v for v in vals if v is not None]
                          row[o] = FINISH[fn](vals)
                      out.append(row)
                  return out
            `,
            py`
              FINISH = {
                  "count": len,
                  "sum": lambda v: sum(v) if v else None,
                  "min": lambda v: min(v) if v else None,
                  "max": lambda v: max(v) if v else None,
                  "nunique": lambda v: len(set(v)),
              }

              def group_agg(rows, by, aggs):
                  groups = {}
                  for r in rows:
                      key = tuple(r[c] for c in by)
                      g = groups.setdefault(key, {o: [] for o in aggs})
                      for o, (col, fn) in aggs.items():
                          g[o].append(1 if col == "*" else r.get(col))
                  out = []
                  for key in sorted(groups):
                      row = dict(zip(by, key))
                      for o, (col, fn) in aggs.items():
                          raw = groups[key][o]
                          v = [x for x in raw if x is not None]
                          if fn == "mean":  # divides by the group size
                              row[o] = sum(v) / len(raw) if v else None
                          else:
                              row[o] = FINISH[fn](v)
                      out.append(row)
                  return out
            `,
            py`
              FINISH = {
                  "count": len,
                  "sum": lambda v: sum(v) if v else None,
                  "mean": lambda v: sum(v) / len(v) if v else None,
                  "min": lambda v: min(v) if v else None,
                  "max": lambda v: max(v) if v else None,
                  "nunique": lambda v: len(set(v)),
              }

              def group_agg(rows, by, aggs):
                  keys = sorted({tuple(r[c] for c in by) for r in rows})
                  out = []
                  for key in keys:
                      grp = [r for r in rows
                             if tuple(r[c] for c in by) == key]
                      row = dict(zip(by, key))
                      for o, (col, fn) in aggs.items():
                          vals = [1 if col == "*" else r.get(col)
                                  for r in grp]
                          vals = [v for v in vals if v is not None]
                          row[o] = FINISH[fn](vals)
                      out.append(row)
                  return out
            `,
          ],
          explain: md`
            **Hash aggregation**: one pass builds \`group key → accumulators\`, then a finish step turns each accumulator into the output value. Sorting the group keys at the end costs O(g log g) for g groups, so the total is O(n · a + g log g) for a aggregations.

            The traps:
            - \`count(col)\` must skip NULLs. Only \`count(*)\` counts rows, exactly as in SQL.
            - \`mean\` divides by the number of **non-null** values, not the group size.
            - Filtering all rows once per group is O(n · g): the classic "loop inside a loop" that never finishes on a real table.

            **What a strong candidate says**: "This solution stores every value, so memory is O(n). A real engine keeps **mergeable partial aggregates**: count and sum (mean = sum / count), running min and max, so map-side *combiners* can pre-aggregate and reducers only merge. \`nunique\` is the odd one out: exact distinct counts need the whole set, so at scale it becomes **HyperLogLog** (\`approx_count_distinct\`)." That's exactly the Spark/MapReduce shuffle story: partial aggregation before the shuffle, final aggregation after.
          `,
        },
        {
          type: 'choice',
          points: 4,
          prompt: 'An `events` table gets **5 billion rows a day**. Almost every query filters on a date range, and many also filter on `user_id` (100 M distinct users). How should you lay it out in the data lake (Parquet + Spark/Trino)?',
          options: ['Partition by date, cluster by user_id', 'Partition by user_id', 'Partition by event_id for even spread', 'No partitions; rely on file statistics'],
          answer: 0,
          explain: md`
            Partition on a **low-to-medium-cardinality** column that nearly every query filters on: \`event_date\` gives ~365 partitions a year, and a date filter skips everything else (partition pruning). *Inside* each date, sort, bucket or Z-order by \`user_id\` so per-user queries skip most files via min/max statistics, and joins on user_id can avoid a full shuffle.

            - **user_id partitions**: 100 M directories of tiny files. Metadata and the small-files problem kill performance.
            - **event_id**: spreads evenly, but nobody filters on it, so every query scans everything.
            - **No partitions**: file statistics help only if the data is sorted by the filter column, and the files still have to be listed and opened.
          `,
        },
        {
          type: 'choice',
          points: 4,
          prompt: 'You join `clicks` (2 TB) with `users` (50 GB) on `user_id` in Spark. One bot account has **30 % of all clicks**: 199 tasks finish in 2 minutes, one runs for 3 hours. What is the best fix?',
          options: ['Salt the hot key; replicate its user row', 'Add more executors', 'Repartition both sides by user_id', 'Switch to a sort-merge join'],
          answer: 0,
          explain: md`
            This is **data skew**: every row with the hot key hashes to the same partition, so one task does 30 % of the work no matter how many machines you add. Repartitioning by the same key keeps the hot key together, and a sort-merge join is most likely what's already running.

            **Salting**: on the big side, append a random suffix 0…N-1 to the hot key's rows. On the small side, replicate that key's row N times with each suffix. The hot key's work is now split across N tasks. Alternatives: split hot keys out and **broadcast-join** only their (tiny) user rows, or let Spark 3's AQE skew-join optimisation split oversized partitions. And ask the product question too: should bot traffic be filtered upstream?
          `,
        },
      ],
    },
  ],
};

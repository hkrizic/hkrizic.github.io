// Unit 16 — Complexity & Core Patterns (interview track).
import { py, md } from './helpers.js';

export default {
  id: 'u16',
  order: 16,
  track: 'interview',
  title: 'Complexity & Core Patterns',
  subtitle: 'Big-O, hashing, two pointers, windows',
  icon: '🎯',
  color: '#EAB308',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u16-l1',
      title: 'Big-O Thinking',
      summary: 'Predict how code scales before you run it, and know what Python operations really cost.',
      steps: [
        {
          type: 'learn',
          title: 'Count the work, not the seconds',
          body: md`
            **Big-O** describes how the number of steps grows as the input size **n** grows. Seconds depend on the machine; growth doesn't.

            Keep only the fastest-growing term and drop constants: \`3n + 5\` → **O(n)**, \`n²/2 + n\` → **O(n²)**.

            Every coding interview ends a solution with *"what's the time and space complexity?"*. Answer it out loud, every time.
          `,
          code: py`
            def count_steps(n):
                steps = 0
                for i in range(n):
                    steps += 1        # n times
                for i in range(n):
                    for j in range(n):
                        steps += 1    # n * n times
                return steps

            for n in [10, 100, 1000]:
                print(n, count_steps(n))
          `,
        },
        {
          type: 'choice',
          prompt: 'What is the time complexity of `total`?',
          code: py`
            def total(nums):
                s = 0
                for x in nums:
                    for _ in range(3):
                        s += x
                return s
          `,
          options: ['O(n)', 'O(n²)', 'O(3)', 'O(n log n)'],
          answer: 0,
          explain: 'The inner loop always runs 3 times, no matter how big `nums` is. 3·n steps → **O(n)**. A nested loop is only O(n²) when *both* loops grow with n.',
        },
        {
          type: 'choice',
          prompt: 'What is the time complexity of `pairs`?',
          code: py`
            def pairs(nums):
                out = []
                for i in range(len(nums)):
                    for j in range(i):
                        out.append((nums[j], nums[i]))
                return out
          `,
          options: ['O(n²)', 'O(n)', 'O(n log n)', 'O(2ⁿ)'],
          answer: 0,
          explain: 'The inner loop runs 0, 1, 2, …, n−1 times: n(n−1)/2 in total. Halving doesn\'t change the class: **O(n²)** time, and O(n²) space for the output list too.',
        },
        {
          type: 'learn',
          title: 'The complexity ladder',
          body: md`
            | class | typical code | n = 10⁶ |
            |---|---|---|
            | O(1) | \`d[key]\`, \`lst[-1]\` | 1 step |
            | O(log n) | binary search, halving | ~20 |
            | O(n) | one loop, \`sum\` | 10⁶ |
            | O(n log n) | \`sorted\` | ~2·10⁷ |
            | O(n²) | all pairs | 10¹² |

            Python does roughly **10–50 million** simple steps per second. So with n = 10⁵, O(n²) means minutes, and O(n log n) means milliseconds. Interview rule of thumb: n ≤ 10⁵ needs O(n log n) or better.

            **O(log n)** appears whenever the problem *halves* each step:
          `,
          code: py`
            n = 1_000_000
            steps = 0
            while n > 1:
                n //= 2
                steps += 1
            print(steps)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            i, steps = 1, 0
            while i < 100:
                i *= 3
                steps += 1
            print(i, steps)
          `,
          answer: '243 5',
          explain: '1 → 3 → 9 → 27 → 81 → 243: five multiplications. A loop whose variable *multiplies* (or divides) by a constant runs O(log n) times, here log₃(100) ≈ 4.2, rounded up.',
        },
        {
          type: 'choice',
          prompt: 'Time complexity of `has_dup`?',
          code: py`
            def has_dup(nums):
                nums = sorted(nums)
                for i in range(1, len(nums)):
                    if nums[i] == nums[i - 1]:
                        return True
                return False
          `,
          options: ['O(n log n)', 'O(n)', 'O(n² log n)', 'O(log n)'],
          answer: 0,
          explain: 'Sorting is O(n log n), the loop is O(n). Steps that run **one after another add up**, and the biggest term wins: O(n log n). Space is O(n) for the sorted copy.',
        },
        {
          type: 'learn',
          title: 'What Python operations cost',
          body: md`
            Built-ins hide loops. A hidden loop is still a loop.

            | operation | cost |
            |---|---|
            | \`lst.append(x)\`, \`lst.pop()\` | O(1) |
            | \`lst[i]\`, \`len(lst)\` | O(1) |
            | \`x in lst\`, \`lst.index(x)\`, \`min\`, \`sum\` | O(n) |
            | \`lst.insert(0, x)\`, \`lst.pop(0)\` | O(n): all items shift |
            | \`lst[a:b]\` | O(b − a): it **copies** |
            | \`x in st\` / \`d[k]\` (set, dict) | O(1) average |
            | \`sorted(lst)\` | O(n log n) |

            Build strings with \`"".join(parts)\`. \`s += t\` in a loop *may* copy the whole string every time.
          `,
          code: py`
            nums = list(range(10))
            part = nums[2:5]      # copies 3 items
            nums.insert(0, -1)    # shifts all 10
            print(part, nums[:3])
            print("".join(["a", "b", "c"]))
          `,
        },
        {
          type: 'choice',
          prompt: 'Which operation is O(n) on a list of n items?',
          options: ['lst.insert(0, x)', 'lst.append(x)', 'lst[-1]', 'len(lst)'],
          answer: 0,
          explain: 'A list is one block of memory. Inserting at the front moves every existing item one slot right. `append` writes at the end (amortised O(1)), and `len` is stored, not counted. Need fast front inserts? `collections.deque.appendleft` is O(1).',
        },
        {
          type: 'choice',
          prompt: '`a` and `b` are lists with n items each. Time complexity?',
          code: py`
            def common(a, b):
                return [x for x in a if x in b]
          `,
          options: ['O(n²)', 'O(n)', 'O(n log n)', 'O(2n)'],
          answer: 0,
          explain: '`x in b` scans the list `b`: O(n), done n times → **O(n²)**. This one-liner hides a nested loop, and it\'s the most common performance bug in interview code. Turn `b` into a set first and it becomes O(n).',
        },
        {
          type: 'blanks',
          prompt: 'Make `common` O(n) by changing the lookup structure.',
          code: py`
            def common(a, b):
                lookup = ___(b)
                return [x for x in a if x ___ lookup]
          `,
          bank: ['set', 'list', 'in', 'not in', 'sorted', '=='],
          answer: ['set', 'in'],
          tests: [
            { call: 'common([1, 2, 3, 4], [4, 1, 9])', expect: '[1, 4]' },
            { call: 'common([], [1])', expect: '[]' },
          ],
          explain: 'Building the set is O(n) once, then each `in` is O(1) on average: O(n) total time, O(n) extra space. Trading memory for speed like this is the core move of hashing.',
        },
        {
          type: 'learn',
          title: 'Space complexity',
          body: md`
            **Space complexity** counts the *extra* memory your code needs as n grows: new lists, sets, dicts, string copies and recursion frames. The input itself usually doesn't count.

            - Two indices walking a string: **O(1)** extra space.
            - \`s[::-1]\`, \`sorted(x)\`, \`set(x)\`: **O(n)**, because they build something new.
            - Recursion n levels deep: **O(n)** stack frames.

            Interviewers often follow up with *"can you do it in O(1) extra space?"*
          `,
          code: py`
            def is_pal_copy(s):
                return s == s[::-1]    # O(n) space

            def is_pal_inplace(s):
                i, j = 0, len(s) - 1
                while i < j:           # O(1) space
                    if s[i] != s[j]:
                        return False
                    i, j = i + 1, j - 1
                return True

            print(is_pal_copy("level"))
            print(is_pal_inplace("level"))
          `,
        },
        {
          type: 'choice',
          prompt: 'Time and extra space of `total` for a list of n numbers?',
          code: py`
            def total(nums):
                if not nums:
                    return 0
                return nums[0] + total(nums[1:])
          `,
          options: ['O(n²) time, O(n²) space', 'O(n) time, O(1) space', 'O(n) time, O(n) space', 'O(n²) time, O(1) space'],
          answer: 0,
          explain: 'Every call copies the rest of the list with `nums[1:]`: n + (n−1) + … ≈ n²/2 → **O(n²) time**. All those copies stay alive at once (each frame holds its slice while it waits), so space is **O(n²)** too. Passing an index instead of a slice makes it O(n) time and O(n) stack.',
        },
        {
          type: 'code',
          title: 'Running maximum',
          prompt: md`
            Write \`running_max(nums)\` that returns a list where position \`i\` holds the largest value of \`nums[0..i]\`.

            This version is correct but **O(n²)** (a slice and a \`max\` per item):
            \`\`\`python
            def running_max(nums):
                return [max(nums[:i + 1])
                        for i in range(len(nums))]
            \`\`\`
            Yours must be O(n) and handle 30,000 numbers instantly.
            \`\`\`python
            running_max([3, 1, 4, 1, 5])  # [3, 3, 4, 4, 5]
            running_max([])               # []
            \`\`\`
          `,
          starter: py`
            def running_max(nums):
                return [max(nums[:i + 1])
                        for i in range(len(nums))]
          `,
          solution: py`
            def running_max(nums):
                out = []
                best = None
                for x in nums:
                    if best is None or x > best:
                        best = x
                    out.append(best)
                return out
          `,
          tests: [
            { call: 'running_max([3, 1, 4, 1, 5])', expect: '[3, 3, 4, 4, 5]' },
            { call: 'running_max([])', expect: '[]' },
            { call: 'running_max([-2, -5, -1])', expect: '[-2, -2, -1]', hidden: true, name: 'all negative' },
            { call: 'running_max([7])', expect: '[7]', hidden: true },
            { call: 'running_max([2, 2, 1])', expect: '[2, 2, 2]', hidden: true },
            { call: 'sum(running_max(list(range(30000))))', expect: '449985000', hidden: true, maxMs: 200, name: '30,000 numbers (performance)' },
          ],
          hints: [
            'You don\'t need to look back: the maximum so far only changes when a bigger number arrives.',
            'Keep one variable `best`. For each `x`: update `best` if `x` is bigger, then append `best`.',
            'Careful with the start value: `best = 0` is wrong for all-negative lists. Use the first item or `None`.',
          ],
          wrong: [
            py`
              def running_max(nums):
                  out, best = [], 0
                  for x in nums:
                      best = max(best, x)
                      out.append(best)
                  return out
            `,
          ],
          explain: 'One pass, carrying the answer forward: **O(n) time**, O(n) space for the output (O(1) extra). The slow version recomputed the max from scratch n times, an O(n²) waste. "Carry state forward instead of recomputing" is the idea behind prefix sums and sliding windows later in this unit. Starting `best` at 0 is the classic bug: it silently breaks on negative data.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the slow dedupe',
          prompt: md`
            \`dedupe(items)\` keeps the **first occurrence** of every item, in the original order:
            \`\`\`python
            dedupe([3, 1, 3, 2, 1])  # [3, 1, 2]
            \`\`\`
            It gives the right answer, but it's O(n²) and times out on 50,000 items. Make it **O(n)** without changing its output.
          `,
          starter: py`
            def dedupe(items):
                result = []
                for x in items:
                    if x not in result:
                        result.append(x)
                return result
          `,
          solution: py`
            def dedupe(items):
                seen = set()
                result = []
                for x in items:
                    if x not in seen:
                        seen.add(x)
                        result.append(x)
                return result
          `,
          tests: [
            { call: 'dedupe([3, 1, 3, 2, 1])', expect: '[3, 1, 2]' },
            { call: 'dedupe([])', expect: '[]' },
            { call: 'dedupe(["b", "a", "b"])', expect: '["b", "a"]', hidden: true },
            { call: 'dedupe([5, 5, 5])', expect: '[5]', hidden: true },
            { call: 'dedupe(list(range(25000)) * 2)[-3:]', expect: '[24997, 24998, 24999]', hidden: true, maxMs: 200, name: '50,000 items (performance)' },
          ],
          hints: [
            'Which line hides a loop? `x not in result` scans the whole result list.',
            'Keep a `set` of what you have already seen next to the result list. Check the set, not the list.',
          ],
          wrong: [
            'def dedupe(items):\n    return list(set(items))\n',
            'def dedupe(items):\n    return sorted(set(items))\n',
          ],
          explain: 'The list keeps the order, the set answers "seen before?" in O(1): **O(n) time, O(n) space**. `list(set(items))` is fast but loses the order. The idiomatic one-liner is `list(dict.fromkeys(items))`: dict keys are unique and keep insertion order.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u16-l2',
      title: 'Hashing Patterns',
      summary: 'Trade memory for speed: sets and dicts turn O(n²) searches into O(n).',
      steps: [
        {
          type: 'learn',
          title: 'Have I seen it before?',
          body: md`
            Many "find a pair / duplicate / match" problems have an obvious O(n²) solution: compare every item with every other item.

            The hashing pattern does **one pass** and remembers what it has seen in a set or dict. Each lookup is O(1) on average, so the whole thing is **O(n) time, O(n) space**.

            When an interviewer says "can you do better than O(n²)?", the answer is very often *a dict*.
          `,
          code: py`
            def contains_duplicate(nums):
                seen = set()
                for x in nums:
                    if x in seen:
                        return True
                    seen.add(x)
                return False

            print(contains_duplicate([1, 2, 3, 1]))
            print(contains_duplicate([1, 2, 3]))
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete `first_repeat`: return the first value that appears a second time, or `None`.',
          code: py`
            def first_repeat(nums):
                seen = set()
                for x in nums:
                    if x ___ seen:
                        return x
                    seen.___(x)
                return None
          `,
          bank: ['in', 'not in', 'add', 'append', 'update', 'pop'],
          answer: ['in', 'add'],
          tests: [
            { call: 'first_repeat([2, 5, 1, 5, 2])', expect: '5' },
            { call: 'first_repeat([1, 2])', expect: 'None' },
          ],
          explain: 'Sets use `add` (lists use `append`). Check *before* adding, otherwise every value looks like a repeat. O(n) time, O(n) space.',
        },
        {
          type: 'learn',
          title: 'Two Sum in one pass',
          body: md`
            **Two Sum**: return the indices of the two numbers that add up to \`target\`. It's the most-asked interview question of all time.

            Walk the list once. For each \`x\`, the partner you need is \`target - x\`. Keep a dict **value → index** of everything seen so far:

            - partner in the dict → done
            - otherwise store \`x\` and move on

            Check **before** storing, so a number can't pair with itself.
          `,
          code: py`
            nums, target = [2, 7, 11, 15], 9
            seen = {}
            for i, x in enumerate(nums):
                need = target - x
                print(i, x, "need", need, "seen", seen)
                if need in seen:
                    print("answer:", [seen[need], i])
                    break
                seen[x] = i
          `,
        },
        {
          type: 'output',
          prompt: 'Trace it. What does this print?',
          code: py`
            nums, target = [3, 5, 2, 3], 6
            seen = {}
            for i, x in enumerate(nums):
                if target - x in seen:
                    print(seen[target - x], i)
                    break
                seen[x] = i
          `,
          answer: '0 3',
          explain: 'At i=0, 3 needs 3 but `seen` is empty, so store {3: 0}. 5 needs 1, and 2 needs 4: neither is there. At i=3, 3 needs 3, which was stored at index 0. Checking before storing stopped index 0 from pairing with itself.',
        },
        {
          type: 'code',
          title: 'Two Sum',
          prompt: md`
            Write \`two_sum(nums, target)\` that returns \`[i, j]\` with \`i < j\` and \`nums[i] + nums[j] == target\`.

            Exactly one answer exists. You may not use the same index twice. Numbers can be negative. Aim for **O(n)**: the tests include 15,000 numbers.
            \`\`\`python
            two_sum([2, 7, 11, 15], 9)  # [0, 1]
            two_sum([3, 2, 4], 6)       # [1, 2]
            \`\`\`
          `,
          starter: 'def two_sum(nums, target):\n    pass\n',
          solution: py`
            def two_sum(nums, target):
                seen = {}
                for i, x in enumerate(nums):
                    if target - x in seen:
                        return [seen[target - x], i]
                    seen[x] = i
          `,
          tests: [
            { call: 'two_sum([2, 7, 11, 15], 9)', expect: '[0, 1]' },
            { call: 'two_sum([3, 2, 4], 6)', expect: '[1, 2]' },
            { call: 'two_sum([3, 3], 6)', expect: '[0, 1]', hidden: true, name: 'duplicate values' },
            { call: 'two_sum([-3, 4, 3, 90], 0)', expect: '[0, 2]', hidden: true, name: 'negatives' },
            { call: 'two_sum([5, 1, 0, -1], -1)', expect: '[2, 3]', hidden: true },
            { call: 'two_sum(list(range(15000)), 29997)', expect: '[14998, 14999]', hidden: true, maxMs: 150, name: '15,000 numbers (performance)' },
          ],
          hints: [
            'For each number `x`, which number would complete the pair?',
            'Store `value → index` in a dict as you go, and look up `target - x` before storing `x`.',
          ],
          wrong: [
            py`
              def two_sum(nums, target):
                  seen = {}
                  for i, x in enumerate(nums):
                      seen[x] = i
                      if target - x in seen:
                          return [seen[target - x], i]
            `,
            py`
              def two_sum(nums, target):
                  for i in range(len(nums)):
                      for j in range(i + 1, len(nums)):
                          if nums[i] + nums[j] == target:
                              return [i, j]
            `,
          ],
          explain: 'One pass with a dict: **O(n) time, O(n) space**, versus O(n²) time and O(1) space for checking all pairs. Say that trade-off out loud in the interview. Storing before checking is the classic bug: `[3, 2, 4]` with target 6 would return `[0, 0]`. If the array were sorted, two pointers would give O(1) space (next lesson).',
        },
        {
          type: 'learn',
          title: 'Grouping with a canonical key',
          body: md`
            To group "equivalent" things, compute a **key** that is identical for everything in the same group, then collect into a \`defaultdict(list)\`.

            For anagrams ("eat", "tea", "ate"), sorting the letters gives the same key: \`"aet"\`. Sorting one word of length k costs O(k log k), so n words cost **O(n · k log k)**, with no pairwise comparisons at all.

            Dicts keep insertion order, so groups come out in order of first appearance.
          `,
          code: py`
            from collections import defaultdict

            groups = defaultdict(list)
            for w in ["eat", "tea", "tan", "ate"]:
                key = "".join(sorted(w))
                groups[key].append(w)
            print(dict(groups))
          `,
        },
        {
          type: 'choice',
          prompt: 'Which key correctly groups anagrams?',
          options: ['"".join(sorted(w))', 'frozenset(w)', 'sum(ord(c) for c in w)', 'len(w)'],
          answer: 0,
          explain: '`frozenset` forgets counts: "aab" and "abb" collide. A sum of character codes collides too ("ad" and "bc" both sum to 197). Sorted letters keep every letter *and* its count. A 26-slot letter-count tuple also works and is O(k) per word.',
        },
        {
          type: 'code',
          title: 'Group anagrams',
          prompt: md`
            Write \`group_anagrams(words)\` that groups words that are anagrams of each other.

            Return a list of groups. Groups appear in order of their **first word's** position, and words inside a group keep their input order.
            \`\`\`python
            group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
            # [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]
            \`\`\`
          `,
          starter: 'def group_anagrams(words):\n    pass\n',
          solution: py`
            from collections import defaultdict

            def group_anagrams(words):
                groups = defaultdict(list)
                for w in words:
                    groups["".join(sorted(w))].append(w)
                return list(groups.values())
          `,
          tests: [
            { call: 'group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])', expect: '[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]' },
            { call: 'group_anagrams([])', expect: '[]' },
            { call: 'group_anagrams([""])', expect: '[[""]]', hidden: true, name: 'empty word' },
            { call: 'group_anagrams(["aab", "abb", "bab"])', expect: '[["aab"], ["abb", "bab"]]', hidden: true, name: 'letter counts matter' },
            { call: 'group_anagrams(["ad", "bc", "da"])', expect: '[["ad", "da"], ["bc"]]', hidden: true },
            { call: 'group_anagrams(["a", "a"])', expect: '[["a", "a"]]', hidden: true, name: 'duplicates' },
          ],
          hints: [
            'Anagrams become the same string once you sort their letters.',
            'Use `defaultdict(list)` keyed by `"".join(sorted(w))`, then return `list(groups.values())`.',
          ],
          wrong: [
            py`
              from collections import defaultdict

              def group_anagrams(words):
                  groups = defaultdict(list)
                  for w in words:
                      groups[frozenset(w)].append(w)
                  return list(groups.values())
            `,
            py`
              from collections import defaultdict

              def group_anagrams(words):
                  groups = defaultdict(list)
                  for w in words:
                      groups[sum(map(ord, w))].append(w)
                  return list(groups.values())
            `,
          ],
          explain: '**O(n · k log k) time** for n words of length up to k, **O(n · k) space** for the groups. The insight: instead of comparing words pairwise (O(n²)), map each one to a canonical key and let the dict do the matching. The same trick groups log lines by template, or users by a normalised email.',
        },
        {
          type: 'code',
          title: 'First unique character',
          prompt: md`
            Write \`first_unique(s)\` that returns the **index** of the first character that appears exactly once in \`s\`, or \`-1\` if there is none.

            Must be O(n): strings can be 120,000 characters long.
            \`\`\`python
            first_unique("leetcode")      # 0
            first_unique("loveleetcode")  # 2
            first_unique("aabb")          # -1
            \`\`\`
          `,
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
            { call: 'first_unique("abcab")', expect: '2', hidden: true },
            { call: 'first_unique("ab" * 60000 + "c")', expect: '120000', hidden: true, maxMs: 150, name: '120,001 characters (performance)' },
          ],
          hints: [
            'Two passes: first count every character, then find the first one with count 1.',
            '`collections.Counter(s)` does the counting pass in one line.',
          ],
          wrong: [
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
                  for ch, c in Counter(s).items():
                      if c == 1:
                          return ch
                  return -1
            `,
          ],
          explain: 'Count once, scan once: **O(n) time**, and **O(1) space** if the alphabet is fixed (at most 26 letters, or the size of the character set). `s.count(ch)` inside the loop rescans the string every time: O(n²). Counting first and querying second is the pattern behind "most frequent", "majority element" and "is it an anagram".',
        },
        {
          type: 'learn',
          title: 'Longest consecutive run in O(n)',
          body: md`
            Given unsorted numbers, how long is the longest run of consecutive values (like 1, 2, 3, 4)? Sorting gives O(n log n). A **set** gives O(n):

            1. Put everything in a set.
            2. Only start counting at a number \`x\` where \`x - 1\` is **not** in the set. That makes \`x\` the start of a run.
            3. Count upward while \`x + 1, x + 2, …\` exist.

            Each number is visited by at most one count-up, so the total work is O(n). Without step 2, a long run gets re-counted from every member: O(n²).
          `,
          code: py`
            nums = [100, 4, 200, 1, 3, 2]
            s = set(nums)
            for x in s:
                if x - 1 not in s:
                    y = x
                    while y + 1 in s:
                        y += 1
                    print("run", x, "to", y)
          `,
        },
        {
          type: 'order',
          prompt: 'Arrange the lines of `longest_consecutive`.',
          lines: [
            'def longest_consecutive(nums):',
            '    s, best = set(nums), 0',
            '    for x in s:',
            '        if x - 1 not in s:',
            '            y = x',
            '            while y + 1 in s:',
            '                y += 1',
            '            best = max(best, y - x + 1)',
            '    return best',
          ],
          distractors: ['        if x + 1 not in s:'],
          tests: [
            { call: 'longest_consecutive([100, 4, 200, 1, 3, 2])', expect: '4' },
            { call: 'longest_consecutive([])', expect: '0' },
          ],
          explain: 'The `x - 1 not in s` guard is what makes it linear: only run *starts* trigger the inner `while`. A run from x to y has length `y - x + 1`.',
        },
        {
          type: 'code',
          title: 'Longest consecutive sequence',
          prompt: md`
            Write \`longest_consecutive(nums)\` that returns the length of the longest sequence of consecutive integers in the unsorted list \`nums\`. Duplicates and negatives can appear.

            Required: **O(n)**. The tests include 13,000 numbers in one long run.
            \`\`\`python
            longest_consecutive([100, 4, 200, 1, 3, 2])  # 4
            longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])  # 9
            \`\`\`
          `,
          starter: 'def longest_consecutive(nums):\n    pass\n',
          solution: py`
            def longest_consecutive(nums):
                s = set(nums)
                best = 0
                for x in s:
                    if x - 1 not in s:
                        y = x
                        while y + 1 in s:
                            y += 1
                        best = max(best, y - x + 1)
                return best
          `,
          tests: [
            { call: 'longest_consecutive([100, 4, 200, 1, 3, 2])', expect: '4' },
            { call: 'longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])', expect: '9' },
            { call: 'longest_consecutive([])', expect: '0', hidden: true, name: 'empty list' },
            { call: 'longest_consecutive([5])', expect: '1', hidden: true },
            { call: 'longest_consecutive([1, 2, 2, 3])', expect: '3', hidden: true, name: 'duplicates inside a run' },
            { call: 'longest_consecutive([-1, -2, 0, 5, 9])', expect: '3', hidden: true, name: 'negatives' },
            { call: 'longest_consecutive(list(range(13000, 0, -1)))', expect: '13000', hidden: true, maxMs: 150, name: '13,000 numbers (performance)' },
          ],
          hints: [
            'Put the numbers in a set so "is x + 1 here?" is O(1).',
            'Only start counting from numbers that have no left neighbour (`x - 1 not in s`).',
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
                  nums = sorted(nums)
                  best = cur = 1 if nums else 0
                  for i in range(1, len(nums)):
                      if nums[i] == nums[i - 1] + 1:
                          cur += 1
                      else:
                          cur = 1
                      best = max(best, cur)
                  return best
            `,
          ],
          explain: '**O(n) time, O(n) space.** The key insight is the start-of-run guard: every number is touched by at most one inner count-up, so the nested loops still add up to O(n) (an *amortised* argument interviewers love). Sorting works too in O(n log n), but then duplicates must be skipped rather than resetting the run, which is exactly the bug in the second wrong solution.',
        },
      ],
    },
    // ------------------------------------------------------------------ L3
    {
      id: 'u16-l3',
      title: 'Two Pointers',
      summary: 'Two indices walking a list replace nested loops: O(n) time, O(1) space.',
      steps: [
        {
          type: 'learn',
          title: 'Two pointers from both ends',
          body: md`
            Put one index \`i\` at the start and one index \`j\` at the end, and move them **toward each other** until they meet. Every item is touched once: **O(n) time, O(1) extra space**.

            Reversing in place: swap \`a[i]\` and \`a[j]\`, then step both inward.

            The pointers don't have to move together. To check a palindrome while ignoring punctuation, each pointer skips forward (or back) over characters that don't count, *then* you compare.
          `,
          code: py`
            chars = list("hello")
            i, j = 0, len(chars) - 1
            while i < j:
                chars[i], chars[j] = chars[j], chars[i]
                i += 1
                j -= 1
            print(chars)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            nums = [1, 2, 3, 4, 5]
            i, j = 0, len(nums) - 1
            swaps = 0
            while i < j:
                nums[i], nums[j] = nums[j], nums[i]
                i, j = i + 1, j - 1
                swaps += 1
            print(nums, swaps)
          `,
          answer: '[5, 4, 3, 2, 1] 2',
          explain: 'Swaps (0, 4) and (1, 3). Then i = j = 2, the loop stops, and the middle element stays put. A reversal needs exactly n // 2 swaps.',
        },
        {
          type: 'code',
          title: 'Reverse in place',
          prompt: md`
            Write \`reverse_in_place(a)\` that reverses the list \`a\` **in place** with O(1) extra space. Don't return anything: the tests look at \`a\` afterwards.

            Don't use \`reverse()\` or \`reversed()\`.
            \`\`\`python
            a = ["h", "e", "l", "l", "o"]
            reverse_in_place(a)
            print(a)  # ['o', 'l', 'l', 'e', 'h']
            \`\`\`
          `,
          starter: 'def reverse_in_place(a):\n    pass\n',
          solution: py`
            def reverse_in_place(a):
                i, j = 0, len(a) - 1
                while i < j:
                    a[i], a[j] = a[j], a[i]
                    i += 1
                    j -= 1
          `,
          tests: [
            { code: 'a = list("hello")\nreverse_in_place(a)\nassert a == list("olleh"), a', name: '"hello" is reversed in place' },
            { code: 'a = [1, 2, 3, 4]\nreverse_in_place(a)\nassert a == [4, 3, 2, 1], a', name: '[1, 2, 3, 4] becomes [4, 3, 2, 1]' },
            { code: 'a = []\nreverse_in_place(a)\nassert a == [], a', name: 'empty list', hidden: true },
            { code: 'a = [7]\nreverse_in_place(a)\nassert a == [7], a', name: 'one item', hidden: true },
            { code: 'a = [1, 2, 3]\nreverse_in_place(a)\nassert a == [3, 2, 1], a', name: 'odd length', hidden: true },
          ],
          forbid: ['reverse', 'reversed'],
          hints: [
            'Start with `i, j = 0, len(a) - 1`.',
            'While `i < j`: swap with `a[i], a[j] = a[j], a[i]`, then move both pointers inward.',
          ],
          wrong: [
            'def reverse_in_place(a):\n    a = a[::-1]\n',
            py`
              def reverse_in_place(a):
                  for i in range(len(a)):
                      a[i], a[-1 - i] = a[-1 - i], a[i]
            `,
            py`
              def reverse_in_place(a):
                  for i in range(len(a) // 2 + 1):
                      a[i], a[-1 - i] = a[-1 - i], a[i]
            `,
          ],
          explain: '**O(n) time, O(1) extra space**: n // 2 swaps. `a = a[::-1]` only rebinds the local name to a new list, so the caller\'s list never changes (and the copy costs O(n) space). Looping over the *whole* list swaps every pair twice, which puts everything back where it started.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: 'print([c.isalnum() for c in "a1 _!"])',
          options: ['[True, True, False, False, False]', '[True, True, False, True, False]', '[True, False, False, False, False]', '[True, True, True, True, True]'],
          answer: 0,
          checkOutput: true,
          explain: '`isalnum()` is True only for letters and digits. Space, `_` and `!` are not alphanumeric. Careful: in regular expressions `\\w` *does* include `_`, which trips people up.',
        },
        {
          type: 'code',
          title: 'Valid palindrome',
          prompt: md`
            Write \`is_palindrome(s)\` that returns \`True\` if \`s\` reads the same forwards and backwards after **ignoring case and every non-alphanumeric character**.

            Use two pointers for O(1) extra space.
            \`\`\`python
            is_palindrome("A man, a plan, a canal: Panama")  # True
            is_palindrome("race a car")                      # False
            \`\`\`
          `,
          starter: 'def is_palindrome(s):\n    pass\n',
          solution: py`
            def is_palindrome(s):
                i, j = 0, len(s) - 1
                while i < j:
                    if not s[i].isalnum():
                        i += 1
                    elif not s[j].isalnum():
                        j -= 1
                    elif s[i].lower() != s[j].lower():
                        return False
                    else:
                        i, j = i + 1, j - 1
                return True
          `,
          tests: [
            { call: 'is_palindrome("A man, a plan, a canal: Panama")', expect: 'True' },
            { call: 'is_palindrome("race a car")', expect: 'False' },
            { call: 'is_palindrome("")', expect: 'True', hidden: true, name: 'empty string' },
            { call: 'is_palindrome(" .,")', expect: 'True', hidden: true, name: 'only punctuation' },
            { call: 'is_palindrome("0P")', expect: 'False', hidden: true, name: 'digits count' },
            { call: 'is_palindrome("ab_a")', expect: 'True', hidden: true, name: 'underscore is skipped' },
            { call: 'is_palindrome("No lemon, no melon")', expect: 'True', hidden: true },
          ],
          hints: [
            'Inside the loop, first skip: if `s[i]` isn\'t alphanumeric, move `i` and continue. Same for `j`.',
            'Only when both point at real characters, compare `s[i].lower()` with `s[j].lower()`.',
          ],
          wrong: [
            py`
              def is_palindrome(s):
                  t = [c.lower() for c in s if c.isalpha()]
                  return t == t[::-1]
            `,
            py`
              def is_palindrome(s):
                  t = [c for c in s if c.isalnum()]
                  return t == t[::-1]
            `,
          ],
          explain: '**O(n) time, O(1) extra space.** Each step moves at least one pointer, so the loop runs at most n times. The filter-and-reverse version (`t == t[::-1]` on cleaned text) is fine too but uses O(n) space, and interviewers usually ask for the pointer version as the follow-up. Using `isalpha` silently drops digits: "0P" would wrongly pass.',
        },
        {
          type: 'learn',
          title: 'Sorted input: move the pointer that can\'t win',
          body: md`
            In a **sorted** list, find two numbers that sum to \`target\`. Start at both ends:

            - sum too small → \`i += 1\`. \`nums[i]\` can't reach the target even with the biggest partner, so it's out.
            - sum too big → \`j -= 1\`, for the mirror reason.

            Each step rules out a whole row of pairs, so it's **O(n)** instead of O(n²), with O(1) space.

            The same argument solves *Container With Most Water*: the **shorter** wall limits every container it's part of, and moving the taller wall inward can only lose width. So always move the shorter one.
          `,
          code: py`
            def pair_sum_sorted(nums, target):
                i, j = 0, len(nums) - 1
                while i < j:
                    s = nums[i] + nums[j]
                    if s == target:
                        return [i, j]
                    if s < target:
                        i += 1
                    else:
                        j -= 1
                return []

            print(pair_sum_sorted([1, 3, 4, 6, 9], 13))
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete the sorted pair sum. It must never use the same index twice.',
          code: py`
            def pair_sum_sorted(nums, target):
                i, j = 0, len(nums) - 1
                while i ___ j:
                    s = nums[i] + nums[j]
                    if s == target:
                        return [i, j]
                    if s < target:
                        i ___ 1
                    else:
                        j ___ 1
                return []
          `,
          bank: ['<', '<=', '+=', '-=', '=', '>'],
          answer: ['<', '+=', '-='],
          tests: [
            { call: 'pair_sum_sorted([1, 3, 4, 6, 9], 13)', expect: '[2, 4]' },
            { call: 'pair_sum_sorted([2, 5], 4)', expect: '[]' },
            { call: 'pair_sum_sorted([-3, 0, 2, 8], -1)', expect: '[0, 2]' },
          ],
          explain: 'With `<=` the pointers could meet and pair an item with itself (2 + 2 = 4). Too small a sum moves the *left* pointer right, toward bigger numbers.',
        },
        {
          type: 'choice',
          prompt: 'The list is already sorted. How does two-pointer pair sum compare with the dict-based Two Sum?',
          options: ['Both O(n) time; pointers need O(1) space', 'Pointers are O(log n) time', 'Both use O(n) extra space', 'Pointers are O(n²), dict is O(n)'],
          answer: 0,
          explain: 'Both make a single pass: O(n) time. The dict stores up to n entries (O(n) space), the pointers store two integers (O(1) space). On unsorted input, sorting first costs O(n log n) and loses the original indices, which is why Two Sum on unsorted data uses the dict.',
        },
        {
          type: 'code',
          title: 'Container with most water',
          prompt: md`
            \`height[i]\` is the height of a vertical wall at position \`i\`. Two walls and the ground form a container holding \`min(height[i], height[j]) * (j - i)\` water.

            Write \`max_area(height)\` that returns the maximum water any two walls can hold. There are at least 2 walls. Must be **O(n)**: tests include 7,000 walls.
            \`\`\`python
            max_area([1, 8, 6, 2, 5, 4, 8, 3, 7])  # 49
            max_area([1, 1])                       # 1
            \`\`\`
          `,
          starter: 'def max_area(height):\n    pass\n',
          solution: py`
            def max_area(height):
                i, j = 0, len(height) - 1
                best = 0
                while i < j:
                    h = min(height[i], height[j])
                    best = max(best, h * (j - i))
                    if height[i] < height[j]:
                        i += 1
                    else:
                        j -= 1
                return best
          `,
          tests: [
            { call: 'max_area([1, 8, 6, 2, 5, 4, 8, 3, 7])', expect: '49' },
            { call: 'max_area([1, 1])', expect: '1' },
            { call: 'max_area([4, 3, 2, 1, 4])', expect: '16', hidden: true },
            { call: 'max_area([1, 2, 1])', expect: '2', hidden: true },
            { call: 'max_area([2, 3, 4, 5, 18, 17, 6])', expect: '17', hidden: true },
            { call: 'max_area([(i * 37) % 1000 + 1 for i in range(7000)])', expect: '6721008', hidden: true, maxMs: 150, name: '7,000 walls (performance)' },
          ],
          hints: [
            'Start with the widest container: `i = 0`, `j = len(height) - 1`.',
            'After measuring, move the pointer at the **shorter** wall. Keeping it can never give a bigger area.',
          ],
          wrong: [
            py`
              def max_area(height):
                  i, j = 0, len(height) - 1
                  best = 0
                  while i < j:
                      h = min(height[i], height[j])
                      best = max(best, h * (j - i))
                      if height[i] > height[j]:
                          i += 1
                      else:
                          j -= 1
                  return best
            `,
            py`
              def max_area(height):
                  best = 0
                  for i in range(len(height)):
                      for j in range(i + 1, len(height)):
                          h = min(height[i], height[j])
                          best = max(best, h * (j - i))
                  return best
            `,
          ],
          explain: '**O(n) time, O(1) space.** Proof sketch for the interviewer: when `height[i]` is the shorter wall, every container using `i` with a closer `j` is narrower *and* no taller, so none of them can beat the one you just measured. Discarding `i` is safe. Moving the taller wall instead throws away exactly the candidates that might win.',
        },
        {
          type: 'learn',
          title: 'Read and write pointers',
          body: md`
            A second flavour: both pointers move **in the same direction**. A fast *read* pointer scans every item, and a slow *write* pointer \`k\` marks where the next kept item goes.

            To remove duplicates from a **sorted** list in place: keep \`nums[i]\` only if it differs from the last kept value \`nums[k - 1]\`. At the end, the first \`k\` slots hold the answer, and whatever is left after them doesn't matter.

            O(n) time, O(1) space. The same skeleton does "move zeroes to the end" and "remove all copies of a value".
          `,
          code: py`
            nums = [1, 1, 2, 3, 3, 3, 4]
            k = 1
            for i in range(1, len(nums)):
                if nums[i] != nums[k - 1]:
                    nums[k] = nums[i]
                    k += 1
            print(k, nums[:k])
            print(nums)
          `,
        },
        {
          type: 'code',
          title: 'Remove duplicates in place',
          prompt: md`
            \`nums\` is sorted in non-decreasing order. Write \`remove_duplicates(nums)\` that removes the duplicates **in place** so each value appears once, keeps their order, and **returns the new length** \`k\`. The first \`k\` items of \`nums\` must hold the unique values. What comes after them doesn't matter.

            O(1) extra space: don't build a new list.
            \`\`\`python
            nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]
            k = remove_duplicates(nums)  # 5
            nums[:k]                     # [0, 1, 2, 3, 4]
            \`\`\`
          `,
          setup: py`
            def after(nums):
                k = remove_duplicates(nums)
                return k, nums[:k]
          `,
          starter: 'def remove_duplicates(nums):\n    pass\n',
          solution: py`
            def remove_duplicates(nums):
                if not nums:
                    return 0
                k = 1
                for i in range(1, len(nums)):
                    if nums[i] != nums[k - 1]:
                        nums[k] = nums[i]
                        k += 1
                return k
          `,
          tests: [
            { call: 'after([1, 1, 2])', expect: '(2, [1, 2])', name: '[1, 1, 2] → k = 2, nums[:2] == [1, 2]' },
            { call: 'after([0, 0, 1, 1, 1, 2, 2, 3, 3, 4])', expect: '(5, [0, 1, 2, 3, 4])', name: 'the example → k = 5' },
            { call: 'after([])', expect: '(0, [])', hidden: true, name: 'empty list → 0' },
            { call: 'after([7])', expect: '(1, [7])', hidden: true, name: 'one item' },
            { call: 'after([-3, -3, -3])', expect: '(1, [-3])', hidden: true, name: 'all equal' },
            { call: 'after([1, 2, 3])', expect: '(3, [1, 2, 3])', hidden: true, name: 'no duplicates' },
          ],
          hints: [
            '`k` is the write position. The first item is always kept, so start with `k = 1`.',
            'For each `i` from 1: if `nums[i] != nums[k - 1]`, copy it to `nums[k]` and increase `k`. Handle the empty list first.',
          ],
          wrong: [
            'def remove_duplicates(nums):\n    nums = sorted(set(nums))\n    return len(nums)\n',
            py`
              def remove_duplicates(nums):
                  k = 1
                  for i in range(1, len(nums)):
                      if nums[i] != nums[k - 1]:
                          nums[k] = nums[i]
                          k += 1
                  return k
            `,
          ],
          explain: '**O(n) time, O(1) extra space.** The read pointer `i` visits each item once, and the write pointer `k` only moves forward. `nums = sorted(set(nums))` creates a *new* list and rebinds the local name: the caller\'s list is untouched (and it costs O(n) space). Forgetting the empty list returns 1 for `[]`, a classic edge-case miss.',
        },
        {
          type: 'learn',
          title: '3Sum: sort, fix one, two-pointer the rest',
          body: md`
            **3Sum**: find all unique triplets that sum to 0. Brute force is O(n³).

            1. Sort the list.
            2. For each \`i\`, run the sorted pair sum on the part to its right, looking for \`-nums[i]\`.
            3. **Skip duplicates**: skip an \`i\` whose value equals the previous one, and after recording a triplet, move \`lo\` past equal values.

            n pair-sum passes of O(n) each: **O(n²) time**, O(1) extra space apart from the output and the sort. Bonus: once \`nums[i] > 0\`, no triplet can reach 0, so you can stop early.
          `,
          code: py`
            nums = sorted([-1, 0, 1, 2, -1, -4])
            print(nums)
            for i in range(len(nums) - 2):
                if i > 0 and nums[i] == nums[i - 1]:
                    print("skip duplicate", nums[i])
                    continue
                print("fix", nums[i], "need", -nums[i])
          `,
        },
        {
          type: 'order',
          prompt: 'Arrange the inner pair search of 3Sum (`nums` is sorted, `target` is given). Each pair must be recorded only once.',
          setup: 'nums, target = [-2, -1, -1, 0, 1, 1, 3], 0',
          lines: [
            'lo, hi, out = 0, len(nums) - 1, []',
            'while lo < hi:',
            '    s = nums[lo] + nums[hi]',
            '    if s < target:',
            '        lo += 1',
            '    elif s > target:',
            '        hi -= 1',
            '    else:',
            '        out.append((nums[lo], nums[hi]))',
            '        lo, hi = lo + 1, hi - 1',
            '        while lo < hi and nums[lo] == nums[lo - 1]:',
            '            lo += 1',
          ],
          distractors: ['        while lo < hi and nums[lo] == nums[lo + 1]:'],
          tests: [{ var: 'out', expect: '[(-1, 1)]', name: 'finds (-1, 1) exactly once' }],
          explain: 'After a match, both pointers move inward, then `lo` skips values equal to the one just used (`nums[lo - 1]`). Without that skip, the second -1 would pair with the second 1 and record (-1, 1) twice. Comparing with `nums[lo + 1]` looks ahead instead and checks the wrong neighbour.',
        },
        {
          type: 'code',
          title: '3Sum',
          prompt: md`
            Write \`three_sum(nums)\` that returns all **unique** triplets \`[a, b, c]\` from \`nums\` (using three different positions) with \`a + b + c == 0\`.

            Each triplet must be in ascending order. The list of triplets can be in any order. Aim for **O(n²)**: tests include 850 numbers.
            \`\`\`python
            three_sum([-1, 0, 1, 2, -1, -4])
            # [[-1, -1, 2], [-1, 0, 1]]
            three_sum([0, 0, 0, 0])  # [[0, 0, 0]]
            \`\`\`
          `,
          starter: 'def three_sum(nums):\n    pass\n',
          solution: py`
            def three_sum(nums):
                a = sorted(nums)
                n, res = len(a), []
                for i in range(n - 2):
                    if a[i] > 0:
                        break
                    if i > 0 and a[i] == a[i - 1]:
                        continue
                    lo, hi = i + 1, n - 1
                    while lo < hi:
                        s = a[i] + a[lo] + a[hi]
                        if s < 0:
                            lo += 1
                        elif s > 0:
                            hi -= 1
                        else:
                            res.append([a[i], a[lo], a[hi]])
                            lo, hi = lo + 1, hi - 1
                            while lo < hi and a[lo] == a[lo - 1]:
                                lo += 1
                return res
          `,
          tests: [
            { call: 'three_sum([-1, 0, 1, 2, -1, -4])', expect: '[[-1, -1, 2], [-1, 0, 1]]', unordered: true },
            { call: 'three_sum([0, 1, 1])', expect: '[]', unordered: true },
            { call: 'three_sum([0, 0, 0, 0])', expect: '[[0, 0, 0]]', unordered: true, name: 'no duplicate triplets' },
            { call: 'three_sum([])', expect: '[]', unordered: true, hidden: true, name: 'empty list' },
            { call: 'three_sum([-2, 0, 1, 1, 2])', expect: '[[-2, 0, 2], [-2, 1, 1]]', unordered: true, hidden: true },
            { call: 'three_sum([-4, -1, -1, 0, 1, 2, 2])', expect: '[[-4, 2, 2], [-1, -1, 2], [-1, 0, 1]]', unordered: true, hidden: true, name: 'duplicates everywhere' },
            { call: 'three_sum([3, -2, 1, 0])', expect: '[]', unordered: true, hidden: true },
            { call: 'three_sum(list(range(1, 850)) + [-3])', expect: '[[-3, 1, 2]]', unordered: true, hidden: true, maxMs: 200, name: '850 numbers (performance)' },
          ],
          hints: [
            'Sort first. Then for each index `i`, you need two numbers to its right summing to `-nums[i]`: that\'s the sorted pair sum.',
            'Skip `i` when `nums[i] == nums[i - 1]`. After a match, move both pointers and skip `lo` past repeated values.',
            'Sort a copy (`a = sorted(nums)`) so you don\'t change the caller\'s list.',
          ],
          wrong: [
            py`
              def three_sum(nums):
                  nums = sorted(nums)
                  n, res = len(nums), []
                  for i in range(n - 2):
                      lo, hi = i + 1, n - 1
                      while lo < hi:
                          s = nums[i] + nums[lo] + nums[hi]
                          if s < 0:
                              lo += 1
                          elif s > 0:
                              hi -= 1
                          else:
                              res.append([nums[i], nums[lo], nums[hi]])
                              lo, hi = lo + 1, hi - 1
                  return res
            `,
            py`
              def three_sum(nums):
                  nums = sorted(nums)
                  n, found = len(nums), set()
                  for i in range(n):
                      for j in range(i + 1, n):
                          for k in range(j + 1, n):
                              if nums[i] + nums[j] + nums[k] == 0:
                                  found.add((nums[i], nums[j], nums[k]))
                  return [list(t) for t in found]
            `,
            py`
              def three_sum(nums):
                  nums = sorted(nums)
                  n, res = len(nums), []
                  for i in range(n - 2):
                      if i + 1 < n and nums[i] == nums[i + 1]:
                          continue
                      lo, hi = i + 1, n - 1
                      while lo < hi:
                          s = nums[i] + nums[lo] + nums[hi]
                          if s < 0:
                              lo += 1
                          elif s > 0:
                              hi -= 1
                          else:
                              res.append([nums[i], nums[lo], nums[hi]])
                              lo, hi = lo + 1, hi - 1
                              while lo < hi and nums[lo] == nums[lo - 1]:
                                  lo += 1
                  return res
            `,
          ],
          explain: '**O(n²) time** (sorting is O(n log n), dominated by n pair searches of O(n)), **O(1) extra space** besides the output and the sorted copy. The two skips make every triplet unique without a set of tuples. Skipping when `nums[i] == nums[i + 1]` looks plausible but throws away the *first* copy, so a triplet that needs both -1s, like [-1, -1, 2], is lost. Follow-ups you may get: 3Sum Closest and 4Sum (one more outer loop, O(n³)).',
        },
      ],
    },
    // ------------------------------------------------------------------ L4
    {
      id: 'u16-l4',
      title: 'Sliding Window',
      summary: 'Answer questions about every contiguous run in one pass by sliding a window.',
      steps: [
        {
          type: 'learn',
          title: 'Fixed-size window',
          body: md`
            "Something about every run of **k consecutive** items" (sums, averages, counts) looks like O(n·k): recompute each window from scratch.

            Instead, **slide**: when the window moves one step, one item enters on the right and one leaves on the left. Update the running value with just those two: **O(n)** total.

            This is exactly what \`df["price"].rolling(3).mean()\` does in pandas, and how streaming systems compute "last 5 minutes" metrics.
          `,
          code: py`
            prices, k = [3, 5, 4, 8, 6], 3
            window = sum(prices[:k])
            avgs = [window / k]
            for i in range(k, len(prices)):
                window += prices[i] - prices[i - k]
                avgs.append(round(window / k, 2))
            print(avgs)
          `,
        },
        {
          type: 'choice',
          prompt: 'Time complexity of this version, for n numbers and window size k?',
          code: py`
            def max_sum_k(nums, k):
                n = len(nums)
                return max(sum(nums[i:i + k])
                           for i in range(n - k + 1))
          `,
          options: ['O(n·k)', 'O(n)', 'O(k)', 'O(n log k)'],
          answer: 0,
          explain: 'About n windows, and each one slices and sums k items: **O(n·k)**, which becomes O(n²) when k ≈ n/2. The sliding version touches each item twice (once entering, once leaving): O(n).',
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            nums, k = [4, 2, 1, 7, 8], 2
            w = sum(nums[:k])
            sums = [w]
            for i in range(k, len(nums)):
                w += nums[i] - nums[i - k]
                sums.append(w)
            print(sums)
          `,
          answer: '[6, 3, 8, 15]',
          explain: 'Start with 4 + 2 = 6. Then +1 −4 = 3, +7 −2 = 8, +8 −1 = 15. Four windows of size 2 in a list of 5: n − k + 1 windows.',
        },
        {
          type: 'code',
          title: 'Max sum of k consecutive',
          prompt: md`
            Write \`max_sum_k(nums, k)\` that returns the largest sum of any \`k\` consecutive numbers. \`1 <= k <= len(nums)\`, and numbers can be negative.

            Must be **O(n)**: tests use 60,000 numbers with k = 30,000.
            \`\`\`python
            max_sum_k([1, 4, 2, 10, 23, 3, 1, 0, 20], 4)  # 39
            max_sum_k([5], 1)                             # 5
            \`\`\`
          `,
          starter: 'def max_sum_k(nums, k):\n    pass\n',
          solution: py`
            def max_sum_k(nums, k):
                window = sum(nums[:k])
                best = window
                for i in range(k, len(nums)):
                    window += nums[i] - nums[i - k]
                    best = max(best, window)
                return best
          `,
          tests: [
            { call: 'max_sum_k([1, 4, 2, 10, 23, 3, 1, 0, 20], 4)', expect: '39' },
            { call: 'max_sum_k([5], 1)', expect: '5' },
            { call: 'max_sum_k([-3, -1, -2], 2)', expect: '-3', hidden: true, name: 'all negative' },
            { call: 'max_sum_k([2, 3], 2)', expect: '5', hidden: true, name: 'k equals the length' },
            { call: 'max_sum_k([1, 2, 3, 4], 1)', expect: '4', hidden: true, name: 'best window is the last one' },
            { call: 'max_sum_k(list(range(60000)), 30000)', expect: '1349985000', hidden: true, maxMs: 200, name: '60,000 numbers (performance)' },
          ],
          hints: [
            'Compute the first window with `sum(nums[:k])`. That\'s also your first `best`.',
            'For each new index `i` from `k`: add `nums[i]`, subtract `nums[i - k]`, update `best`.',
          ],
          wrong: [
            py`
              def max_sum_k(nums, k):
                  window, best = sum(nums[:k]), 0
                  for i in range(k, len(nums)):
                      window += nums[i] - nums[i - k]
                      best = max(best, window)
                  return max(best, window)
            `,
            py`
              def max_sum_k(nums, k):
                  window = sum(nums[:k])
                  best = window
                  for i in range(k, len(nums) - 1):
                      window += nums[i] - nums[i - k]
                      best = max(best, window)
                  return best
            `,
            py`
              def max_sum_k(nums, k):
                  return max(sum(nums[i:i + k])
                             for i in range(len(nums) - k + 1))
            `,
          ],
          explain: '**O(n) time, O(1) space.** Each item is added once and subtracted once. Initialise `best` with the first window, not 0, or all-negative inputs break. Off-by-one check: the last window starts at `n - k`, so the loop must reach index `n - 1`.',
        },
        {
          type: 'learn',
          title: 'Variable window: grow right, shrink left',
          body: md`
            When the window size isn't fixed, keep two indices \`left\` and \`right\`:

            1. **Grow**: move \`right\` one step and add its item.
            2. **Shrink**: while the window breaks the rule, remove \`nums[left]\` and move \`left\` forward.
            3. The window is valid again, so record its length.

            Both indices only move forward, so each item enters once and leaves once: **O(n)**, even with the inner \`while\`.

            Example: the longest run with sum ≤ \`limit\` (non-negative numbers).
          `,
          code: py`
            nums, limit = [2, 1, 3, 1, 1, 4], 5
            left = total = best = 0
            for right, x in enumerate(nums):
                total += x
                while total > limit:
                    total -= nums[left]
                    left += 1
                best = max(best, right - left + 1)
            print(best)
          `,
        },
        {
          type: 'output',
          prompt: 'This window never holds a repeated character. Trace it: what does it print?',
          code: py`
            s = "abba"
            seen, left = set(), 0
            for right, ch in enumerate(s):
                while ch in seen:
                    seen.remove(s[left])
                    left += 1
                seen.add(ch)
                print(s[left:right + 1])
          `,
          answer: 'a\nab\nb\nba',
          explain: 'At the second "b" the window must drop *both* "a" and "b" before it is valid again, leaving "b". Then the last "a" fits, since the first "a" already left. "abba" is the classic test that breaks careless window code.',
        },
        {
          type: 'code',
          title: 'Longest substring without repeats',
          prompt: md`
            Write \`longest_unique(s)\` that returns the length of the longest substring of \`s\` with **no repeated characters**.

            Must be **O(n)**: the tests include a 9,000-character string whose answer is 4,500.
            \`\`\`python
            longest_unique("abcabcbb")  # 3  ("abc")
            longest_unique("bbbbb")     # 1
            longest_unique("pwwkew")    # 3  ("wke")
            \`\`\`
          `,
          starter: 'def longest_unique(s):\n    pass\n',
          solution: py`
            def longest_unique(s):
                last = {}
                left = best = 0
                for right, ch in enumerate(s):
                    if ch in last:
                        left = max(left, last[ch] + 1)
                    last[ch] = right
                    best = max(best, right - left + 1)
                return best
          `,
          tests: [
            { call: 'longest_unique("abcabcbb")', expect: '3' },
            { call: 'longest_unique("bbbbb")', expect: '1' },
            { call: 'longest_unique("pwwkew")', expect: '3' },
            { call: 'longest_unique("")', expect: '0', hidden: true, name: 'empty string' },
            { call: 'longest_unique("abba")', expect: '2', hidden: true, name: '"abba"' },
            { call: 'longest_unique(" ")', expect: '1', hidden: true, name: 'a single space' },
            { call: 'longest_unique("dvdf")', expect: '3', hidden: true },
            { call: 'longest_unique("".join(map(chr, range(256, 4756))) * 2)', expect: '4500', hidden: true, maxMs: 150, name: '9,000 characters (performance)' },
          ],
          hints: [
            'Keep the window `s[left:right + 1]` free of repeats. Grow `right` one character at a time.',
            'With a set: while `ch` is already in the window, remove `s[left]` and move `left`. Then add `ch`.',
            'Faster variant: a dict of each character\'s last index lets `left` jump straight to `last[ch] + 1`, but never backwards, so use `max(left, ...)`.',
          ],
          wrong: [
            py`
              def longest_unique(s):
                  last = {}
                  left = best = 0
                  for right, ch in enumerate(s):
                      if ch in last:
                          left = last[ch] + 1
                      last[ch] = right
                      best = max(best, right - left + 1)
                  return best
            `,
            py`
              def longest_unique(s):
                  best = 0
                  for i in range(len(s)):
                      seen = set()
                      for ch in s[i:]:
                          if ch in seen:
                              break
                          seen.add(ch)
                      best = max(best, len(seen))
                  return best
            `,
          ],
          explain: '**O(n) time, O(min(n, alphabet)) space.** The window only ever moves forward. With the last-index dict, `left = last[ch] + 1` alone can jump *backwards* when `ch` was last seen before the window started ("abba"), so take the max. Restarting from every index is O(n·m) where m is the answer length, which is quadratic on long unique runs.',
        },
        {
          type: 'learn',
          title: 'Shortest window: shrink while valid',
          body: md`
            For the **shortest** window that satisfies a condition, flip the loop: grow until the window is valid, then **shrink while it is still valid**, recording the length at every step.

            This only works when growing the window can never make it *less* valid. With non-negative numbers, adding an item never lowers the sum. With negatives, that breaks, so use prefix sums (next lesson) instead.

            Example: the shortest piece of text that contains at least 3 "a"s.
          `,
          code: py`
            s, need = "baacaba", 3
            left = count = 0
            best = len(s) + 1
            for right, ch in enumerate(s):
                count += ch == "a"
                while count >= need:
                    best = min(best, right - left + 1)
                    count -= s[left] == "a"
                    left += 1
            print(best)
          `,
        },
        {
          type: 'choice',
          prompt: 'Why does "shortest subarray with sum ≥ target" need all numbers to be positive for the sliding window to work?',
          options: ['Growing must never lower the sum', 'Negative numbers can\'t be indexed', 'sum() rejects negatives', 'It would become O(n log n)'],
          answer: 0,
          explain: 'Shrinking is only safe if a window that is too small can\'t become valid by losing items, and a valid window stays valid when it grows. A negative number breaks both: dropping it *raises* the sum. With negatives, the standard answer is prefix sums plus a monotonic deque, or prefix sums plus a hash map for "sum exactly k".',
        },
        {
          type: 'code',
          title: 'Minimum size subarray sum',
          prompt: md`
            Write \`min_subarray_len(target, nums)\` that returns the length of the **shortest** contiguous subarray whose sum is **≥ target**, or \`0\` if there is none. All numbers are positive.

            Must be **O(n)**: tests include 15,000 numbers.
            \`\`\`python
            min_subarray_len(7, [2, 3, 1, 2, 4, 3])  # 2  ([4, 3])
            min_subarray_len(4, [1, 4, 4])           # 1
            min_subarray_len(11, [1, 1, 1, 1])       # 0
            \`\`\`
          `,
          starter: 'def min_subarray_len(target, nums):\n    pass\n',
          solution: py`
            def min_subarray_len(target, nums):
                left = total = 0
                best = len(nums) + 1
                for right, x in enumerate(nums):
                    total += x
                    while total >= target:
                        best = min(best, right - left + 1)
                        total -= nums[left]
                        left += 1
                return 0 if best > len(nums) else best
          `,
          tests: [
            { call: 'min_subarray_len(7, [2, 3, 1, 2, 4, 3])', expect: '2' },
            { call: 'min_subarray_len(4, [1, 4, 4])', expect: '1' },
            { call: 'min_subarray_len(11, [1, 1, 1, 1])', expect: '0' },
            { call: 'min_subarray_len(15, [1, 2, 3, 4, 5])', expect: '5', hidden: true, name: 'needs the whole list' },
            { call: 'min_subarray_len(100, [])', expect: '0', hidden: true, name: 'empty list' },
            { call: 'min_subarray_len(5, [5])', expect: '1', hidden: true },
            { call: 'min_subarray_len(7500, [1] * 15000)', expect: '7500', hidden: true, maxMs: 150, name: '15,000 numbers (performance)' },
          ],
          hints: [
            'Grow the window with `right`, keeping a running `total`.',
            'While `total >= target`: record the length, then remove `nums[left]` and move `left` forward.',
            'Start `best` at something impossible (like `len(nums) + 1`) and turn it into 0 at the end.',
          ],
          wrong: [
            py`
              def min_subarray_len(target, nums):
                  left = total = 0
                  best = float("inf")
                  for right, x in enumerate(nums):
                      total += x
                      while total >= target:
                          best = min(best, right - left + 1)
                          total -= nums[left]
                          left += 1
                  return best
            `,
            py`
              def min_subarray_len(target, nums):
                  left = total = 0
                  best = len(nums) + 1
                  for right, x in enumerate(nums):
                      total += x
                      while total > target:
                          best = min(best, right - left + 1)
                          total -= nums[left]
                          left += 1
                  return 0 if best > len(nums) else best
            `,
            py`
              def min_subarray_len(target, nums):
                  best = 0
                  for i in range(len(nums)):
                      total = 0
                      for j in range(i, len(nums)):
                          total += nums[j]
                          if total >= target:
                              if best == 0 or j - i + 1 < best:
                                  best = j - i + 1
                              break
                  return best
            `,
          ],
          explain: '**O(n) time, O(1) space.** `left` and `right` each move at most n times. The condition is "≥ target", so shrink with `>=`: with `>` you miss windows that hit the target exactly. Return 0 for "impossible" as specified, not `inf`. Read the spec\'s edge-case contract as carefully as the main task.',
        },
        {
          type: 'learn',
          title: 'Windows with a counts dict',
          body: md`
            To know *what* is inside a window (how many distinct values, how often each appears), keep a dict of **counts**:

            - entering item: \`counts[x] = counts.get(x, 0) + 1\`
            - leaving item: decrement it, and **delete the key when it reaches 0**

            Then \`len(counts)\` is the number of distinct values in the window, always in O(1). Below: distinct values in every window of size 3.
          `,
          code: py`
            nums, k = [1, 2, 1, 3, 3, 4], 3
            counts, out = {}, []
            for i, x in enumerate(nums):
                counts[x] = counts.get(x, 0) + 1
                if i >= k:
                    old = nums[i - k]
                    counts[old] -= 1
                    if counts[old] == 0:
                        del counts[old]
                if i >= k - 1:
                    out.append(len(counts))
            print(out)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            counts = {"a": 2, "b": 1}
            counts["b"] -= 1
            print(len(counts), counts)
          `,
          options: ["2 {'a': 2, 'b': 0}", "1 {'a': 2}", "1 {'a': 2, 'b': 0}", "KeyError: 'b'"],
          answer: 0,
          checkOutput: true,
          explain: 'A count of 0 is still a key, so `len(counts)` still says 2 distinct values. That\'s why the window must `del counts[key]` when a count drops to 0. `Counter` behaves the same way.',
        },
        {
          type: 'code',
          title: 'At most k distinct characters',
          prompt: md`
            Write \`longest_k_distinct(s, k)\` that returns the length of the longest substring of \`s\` containing **at most k distinct characters**. \`k >= 0\`.

            Must be **O(n)**: tests include 8,000 characters.
            \`\`\`python
            longest_k_distinct("eceba", 2)  # 3  ("ece")
            longest_k_distinct("aa", 1)     # 2
            \`\`\`
          `,
          starter: 'def longest_k_distinct(s, k):\n    pass\n',
          solution: py`
            def longest_k_distinct(s, k):
                counts = {}
                left = best = 0
                for right, ch in enumerate(s):
                    counts[ch] = counts.get(ch, 0) + 1
                    while len(counts) > k:
                        old = s[left]
                        counts[old] -= 1
                        if counts[old] == 0:
                            del counts[old]
                        left += 1
                    best = max(best, right - left + 1)
                return best
          `,
          tests: [
            { call: 'longest_k_distinct("eceba", 2)', expect: '3' },
            { call: 'longest_k_distinct("aa", 1)', expect: '2' },
            { call: 'longest_k_distinct("abc", 0)', expect: '0', hidden: true, name: 'k = 0' },
            { call: 'longest_k_distinct("", 2)', expect: '0', hidden: true, name: 'empty string' },
            { call: 'longest_k_distinct("aabbcc", 1)', expect: '2', hidden: true },
            { call: 'longest_k_distinct("aabbcc", 3)', expect: '6', hidden: true, name: 'k covers everything' },
            { call: 'longest_k_distinct("abaccc", 2)', expect: '4', hidden: true },
            { call: 'longest_k_distinct("ab" * 4000, 2)', expect: '8000', hidden: true, maxMs: 150, name: '8,000 characters (performance)' },
          ],
          hints: [
            'Grow the window with `right` and count characters in a dict.',
            'While the dict has more than `k` keys, shrink from the left, deleting keys whose count hits 0.',
          ],
          wrong: [
            py`
              def longest_k_distinct(s, k):
                  counts = {}
                  left = best = 0
                  for right, ch in enumerate(s):
                      counts[ch] = counts.get(ch, 0) + 1
                      while len(counts) > k:
                          counts[s[left]] -= 1
                          left += 1
                          if left > right:
                              break
                      best = max(best, right - left + 1)
                  return best
            `,
            py`
              def longest_k_distinct(s, k):
                  best = 0
                  for i in range(len(s)):
                      seen = set()
                      for j in range(i, len(s)):
                          seen.add(s[j])
                          if len(seen) > k:
                              break
                          best = max(best, j - i + 1)
                  return best
            `,
          ],
          explain: '**O(n) time, O(k) space**: the dict never holds more than k + 1 keys. Forgetting to delete zero counts keeps `len(counts)` too high, so the window over-shrinks and reports answers that are too small. This exact skeleton also solves "Fruit Into Baskets" (k = 2) and, with a Counter of a target string, "Minimum Window Substring".',
        },
      ],
    },
    // ------------------------------------------------------------------ L5
    {
      id: 'u16-l5',
      title: 'Prefix Sums & Binary Search',
      summary: 'Precompute once to answer range questions in O(1), and halve the search space for O(log n).',
      steps: [
        {
          type: 'learn',
          title: 'Prefix sums',
          body: md`
            \`pre[i]\` = the sum of the **first i** items, with \`pre[0] = 0\`. Building it is one O(n) pass.

            Then the sum of \`nums[l..r]\` (inclusive) is \`pre[r + 1] - pre[l]\`: **O(1) per query**, instead of O(r − l) for \`sum(nums[l:r + 1])\`.

            The extra 0 at the front removes every special case for ranges that start at index 0. \`itertools.accumulate(nums, initial=0)\` builds the same list. In SQL this is \`SUM(x) OVER (ORDER BY t)\`, and in pandas \`.cumsum()\`.
          `,
          code: py`
            nums = [3, 1, 4, 1, 5, 9]
            pre = [0]
            for x in nums:
                pre.append(pre[-1] + x)
            print(pre)
            l, r = 2, 4                 # nums[2..4]
            print(pre[r + 1] - pre[l])  # 4 + 1 + 5
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            from itertools import accumulate

            nums = [2, -1, 3, 4]
            pre = list(accumulate(nums, initial=0))
            print(pre)
            print(pre[4] - pre[1])
          `,
          answer: '[0, 2, 1, 4, 8]\n6',
          explain: '`pre` has n + 1 entries. `pre[4] - pre[1]` is the sum of `nums[1..3]` = −1 + 3 + 4 = 6.',
        },
        {
          type: 'code',
          title: 'Range sum queries',
          prompt: md`
            Write \`range_sums(nums, queries)\` where each query is a pair \`(l, r)\` with \`0 <= l <= r < len(nums)\`. Return a list with the sum of \`nums[l..r]\` (inclusive) for each query, in order.

            Must handle 20,000 queries over 80,000 numbers quickly, so each query has to be O(1).
            \`\`\`python
            range_sums([3, 1, 4, 1, 5], [(0, 2), (1, 1), (2, 4)])
            # [8, 1, 10]
            \`\`\`
          `,
          starter: 'def range_sums(nums, queries):\n    pass\n',
          solution: py`
            def range_sums(nums, queries):
                pre = [0]
                for x in nums:
                    pre.append(pre[-1] + x)
                return [pre[r + 1] - pre[l]
                        for l, r in queries]
          `,
          tests: [
            { call: 'range_sums([3, 1, 4, 1, 5], [(0, 2), (1, 1), (2, 4)])', expect: '[8, 1, 10]' },
            { call: 'range_sums([7], [(0, 0)])', expect: '[7]' },
            { call: 'range_sums([5, -2, 3], [(0, 2), (1, 2), (0, 0)])', expect: '[6, 1, 5]', hidden: true, name: 'negatives' },
            { call: 'range_sums([1, 2, 3], [])', expect: '[]', hidden: true, name: 'no queries' },
            { call: 'sum(range_sums(list(range(80000)), [(i, i + 40000) for i in range(0, 40000, 2)]))', expect: '31999999980000', hidden: true, maxMs: 150, name: '20,000 long queries (performance)' },
          ],
          hints: [
            'Build `pre` once with `pre = [0]` and `pre.append(pre[-1] + x)`.',
            'The sum of `nums[l..r]` is `pre[r + 1] - pre[l]`.',
          ],
          wrong: [
            py`
              def range_sums(nums, queries):
                  pre = [0]
                  for x in nums:
                      pre.append(pre[-1] + x)
                  return [pre[r] - pre[l] for l, r in queries]
            `,
            py`
              def range_sums(nums, queries):
                  return [sum(nums[l:r + 1]) for l, r in queries]
            `,
          ],
          explain: '**O(n + q) time, O(n) space** for n numbers and q queries, versus O(n·q) for summing every range. This is the classic "precompute once, query many times" trade-off. `pre[r] - pre[l]` drops the last item of every range: write the formula down with a tiny example before trusting it.',
        },
        {
          type: 'learn',
          title: 'Prefix sums + a hash map',
          body: md`
            **How many subarrays sum to exactly k?** A subarray \`i..j\` sums to k exactly when

            \`pre[j + 1] - pre[i] == k\`, i.e. \`pre[i] == pre[j + 1] - k\`.

            So walk once with a running prefix sum, and at each step ask: *how many earlier prefixes equal \`current - k\`?* A dict of prefix-sum counts answers that in O(1). Start it with \`{0: 1}\`: the empty prefix before the first item.

            **O(n)**, and unlike sliding windows it works with **negative numbers**.
          `,
          code: py`
            nums, k = [1, 2, 1, 2], 3
            counts = {0: 1}
            pre = total = 0
            for x in nums:
                pre += x
                total += counts.get(pre - k, 0)
                counts[pre] = counts.get(pre, 0) + 1
                print("x", x, "pre", pre, "count", total)
          `,
        },
        {
          type: 'choice',
          prompt: 'Why does the counts dict start as `{0: 1}` instead of `{}`?',
          options: ['It counts subarrays starting at index 0', 'It prevents a KeyError', 'It makes k = 0 work', 'It counts the empty subarray'],
          answer: 0,
          explain: 'A subarray `0..j` has sum `pre[j + 1] - 0`. To find it, the "prefix before index 0" (sum 0) must already be counted once. Without it, `[3]` with k = 3 finds nothing. The empty subarray is never counted: you look up before inserting the current prefix.',
        },
        {
          type: 'code',
          title: 'Subarray sum equals k',
          prompt: md`
            Write \`subarray_sum(nums, k)\` that returns **how many** contiguous, non-empty subarrays sum to exactly \`k\`. Numbers can be negative or zero.

            Must be **O(n)**: tests include 16,000 numbers.
            \`\`\`python
            subarray_sum([1, 1, 1], 2)   # 2
            subarray_sum([1, 2, 3], 3)   # 2  ([1, 2] and [3])
            subarray_sum([1, -1, 0], 0)  # 3
            \`\`\`
          `,
          starter: 'def subarray_sum(nums, k):\n    pass\n',
          solution: py`
            def subarray_sum(nums, k):
                counts = {0: 1}
                pre = total = 0
                for x in nums:
                    pre += x
                    total += counts.get(pre - k, 0)
                    counts[pre] = counts.get(pre, 0) + 1
                return total
          `,
          tests: [
            { call: 'subarray_sum([1, 1, 1], 2)', expect: '2' },
            { call: 'subarray_sum([1, 2, 3], 3)', expect: '2' },
            { call: 'subarray_sum([1, -1, 0], 0)', expect: '3', name: 'negatives and zero' },
            { call: 'subarray_sum([], 0)', expect: '0', hidden: true, name: 'empty list' },
            { call: 'subarray_sum([3], 3)', expect: '1', hidden: true, name: 'starts at index 0' },
            { call: 'subarray_sum([0, 0, 0], 0)', expect: '6', hidden: true, name: 'all zeros' },
            { call: 'subarray_sum([2, -2, 2, -2], 2)', expect: '3', hidden: true },
            { call: 'subarray_sum([(i * 7) % 11 - 5 for i in range(16000)], 3)', expect: '10582215', hidden: true, maxMs: 150, name: '16,000 numbers (performance)' },
          ],
          hints: [
            'Keep a running prefix sum `pre`. A subarray ending here sums to k when some earlier prefix equals `pre - k`.',
            'Store counts of prefix sums in a dict that starts as `{0: 1}`. Look up `pre - k` *before* adding the current `pre`.',
          ],
          wrong: [
            py`
              def subarray_sum(nums, k):
                  counts = {}
                  pre = total = 0
                  for x in nums:
                      pre += x
                      total += counts.get(pre - k, 0)
                      counts[pre] = counts.get(pre, 0) + 1
                  return total
            `,
            py`
              def subarray_sum(nums, k):
                  left = cur = total = 0
                  for right, x in enumerate(nums):
                      cur += x
                      while cur > k and left <= right:
                          cur -= nums[left]
                          left += 1
                      if cur == k:
                          total += 1
                  return total
            `,
            py`
              def subarray_sum(nums, k):
                  total = 0
                  for i in range(len(nums)):
                      s = 0
                      for j in range(i, len(nums)):
                          s += nums[j]
                          if s == k:
                              total += 1
                  return total
            `,
          ],
          explain: '**O(n) time, O(n) space.** Every subarray is a difference of two prefixes, so counting pairs of prefixes that differ by k counts subarrays, and the dict finds the partners in O(1). It\'s Two Sum again, on prefix sums. A sliding window fails here because negative numbers make the sum non-monotonic. Interview follow-ups: "longest subarray with sum k" (store the *first* index of each prefix) and "subarrays divisible by k" (key by `pre % k`).',
        },
        {
          type: 'learn',
          title: 'Binary search, done right',
          body: md`
            On a **sorted** list, compare with the middle and throw away the half that can't contain the target: **O(log n)**. A million items take about 20 steps.

            Write it with an explicit **invariant**: *"if target exists, it is in \`nums[lo..hi]\`"*.

            - start \`lo, hi = 0, len(nums) - 1\`, loop \`while lo <= hi\` (the range isn't empty yet)
            - always step **past** \`mid\` (\`mid + 1\` / \`mid - 1\`), or the loop can run forever

            Most binary search bugs are off-by-ones in exactly these three places.
          `,
          code: py`
            def binary_search(nums, target):
                lo, hi = 0, len(nums) - 1
                while lo <= hi:
                    mid = (lo + hi) // 2
                    if nums[mid] == target:
                        return mid
                    if nums[mid] < target:
                        lo = mid + 1   # go right
                    else:
                        hi = mid - 1   # go left
                return -1

            print(binary_search([1, 3, 5, 7, 9, 11], 9))
            print(binary_search([1, 3, 5, 7, 9, 11], 4))
          `,
        },
        {
          type: 'choice',
          prompt: 'This version has a classic bug. What does it print?',
          code: py`
            def bs(nums, t):
                lo, hi = 0, len(nums) - 1
                while lo < hi:
                    mid = (lo + hi) // 2
                    if nums[mid] == t:
                        return mid
                    if nums[mid] < t:
                        lo = mid + 1
                    else:
                        hi = mid - 1
                return -1

            print(bs([1, 3, 5], 5), bs([1, 3, 5], 1))
          `,
          options: ['-1 -1', '2 0', '2 -1', '-1 0'],
          answer: 0,
          checkOutput: true,
          explain: 'With `hi` inclusive, the range `nums[lo..hi]` still holds one candidate when `lo == hi`, but `while lo < hi` stops before checking it. Both searches narrow down to the right index and give up one step too early. Inclusive `hi` pairs with `<=`, exclusive `hi = len(nums)` pairs with `<`.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the binary search',
          prompt: md`
            \`binary_search(nums, target)\` should return the index of \`target\` in the sorted list \`nums\`, or \`-1\`. It must stay **O(log n)**: a hidden test runs 5,000 searches on 100,000 items.

            It has **two** bugs. Find and fix them.
          `,
          setup: 'A = list(range(0, 200000, 2))',
          starter: py`
            def binary_search(nums, target):
                lo, hi = 0, len(nums) - 1
                while lo < hi:
                    mid = (lo + hi) // 2
                    if nums[mid] == target:
                        return mid
                    if nums[mid] > target:
                        lo = mid + 1
                    else:
                        hi = mid - 1
                return -1
          `,
          solution: py`
            def binary_search(nums, target):
                lo, hi = 0, len(nums) - 1
                while lo <= hi:
                    mid = (lo + hi) // 2
                    if nums[mid] == target:
                        return mid
                    if nums[mid] < target:
                        lo = mid + 1
                    else:
                        hi = mid - 1
                return -1
          `,
          tests: [
            { call: 'binary_search([1, 3, 5, 7, 9, 11], 9)', expect: '4' },
            { call: 'binary_search([1, 3, 5, 7, 9, 11], 1)', expect: '0' },
            { call: 'binary_search([1, 3, 5, 7, 9, 11], 11)', expect: '5', name: 'last item' },
            { call: 'binary_search([1, 3, 5, 7, 9, 11], 4)', expect: '-1', name: 'missing value' },
            { call: 'binary_search([], 3)', expect: '-1', hidden: true, name: 'empty list' },
            { call: 'binary_search([5], 5)', expect: '0', hidden: true, name: 'one item' },
            { call: 'binary_search([2, 4], 5)', expect: '-1', hidden: true, name: 'bigger than everything' },
            { call: 'sum(binary_search(A, x) for x in range(0, 200000, 40))', expect: '249950000', hidden: true, maxMs: 150, name: '5,000 searches (performance)' },
          ],
          hints: [
            'Trace `[1, 3, 5, 7, 9, 11]` looking for 9: which way does it go after comparing with `nums[2] = 5`?',
            'If `nums[mid]` is too **small**, the target is to the right: `lo = mid + 1`. And with an inclusive `hi`, the loop must run while `lo <= hi`.',
          ],
          wrong: [
            py`
              def binary_search(nums, target):
                  lo, hi = 0, len(nums) - 1
                  while lo < hi:
                      mid = (lo + hi) // 2
                      if nums[mid] == target:
                          return mid
                      if nums[mid] < target:
                          lo = mid + 1
                      else:
                          hi = mid - 1
                  return -1
            `,
            'def binary_search(nums, target):\n    return nums.index(target) if target in nums else -1\n',
          ],
          explain: '**O(log n) time, O(1) space.** Every iteration removes `mid` and one half, so the range shrinks to empty after about log₂(n) steps. The linear `nums.index` fallback is correct but O(n) per search: 5,000 searches on 100,000 items is half a billion comparisons. In Python, `(lo + hi) // 2` can\'t overflow, but say "`lo + (hi - lo) // 2`" in a Java/C++ interview.',
        },
        {
          type: 'learn',
          title: 'Find the first True',
          body: md`
            The most reusable template: given a condition that is False, False, …, True, True along the sorted range, find the **first True**.

            Use a **half-open** range \`[lo, hi)\` with \`hi = len(nums)\` ("none is True" is a valid answer), and \`while lo < hi\`: if \`cond(mid)\`, then \`hi = mid\` (mid might be the answer), else \`lo = mid + 1\`.

            - \`nums[mid] >= target\` → leftmost position of target = **insert position** = \`bisect_left\`
            - \`nums[mid] > target\` → one past the last copy = \`bisect_right\`
            - \`works(mid)\` for a *value* → **binary search on the answer**
          `,
          code: py`
            from bisect import bisect_left, bisect_right

            def lower_bound(nums, target):
                lo, hi = 0, len(nums)
                while lo < hi:
                    mid = (lo + hi) // 2
                    if nums[mid] >= target:
                        hi = mid
                    else:
                        lo = mid + 1
                return lo

            nums = [1, 3, 3, 3, 8]
            print(lower_bound(nums, 3))   # first 3
            print(bisect_left(nums, 3))   # same
            print(bisect_right(nums, 3))  # past last 3
            print(lower_bound(nums, 4))   # insert 4
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete `search_insert`: the index of `target` if present, else where it would be inserted to keep `nums` sorted.',
          code: py`
            def search_insert(nums, target):
                lo, hi = 0, ___
                while lo ___ hi:
                    mid = (lo + hi) // 2
                    if nums[mid] >= target:
                        hi = ___
                    else:
                        lo = mid + 1
                return lo
          `,
          bank: ['len(nums)', 'len(nums) - 1', '<', '>', 'mid', 'mid - 1'],
          answer: ['len(nums)', '<', 'mid'],
          tests: [
            { call: 'search_insert([1, 3, 5, 6], 5)', expect: '2' },
            { call: 'search_insert([1, 3, 5, 6], 2)', expect: '1' },
            { call: 'search_insert([1, 3, 5, 6], 7)', expect: '4' },
            { call: 'search_insert([], 3)', expect: '0' },
          ],
          explain: '`hi = len(nums)` allows the answer "after everything" (7 → 4). `hi = mid`, not `mid - 1`, because `mid` itself might be the first True. Here `lo == hi` means the range is empty, so `<` is right. O(log n) time, O(1) space.',
        },
        {
          type: 'code',
          title: 'First and last position',
          prompt: md`
            Write \`search_range(nums, target)\` for a sorted list that returns \`[first, last]\`: the first and last index of \`target\`, or \`[-1, -1]\` if it's absent.

            Must be **O(log n)** even when a value repeats many times: hidden tests run 1,500 searches on 300,000 items, and searches where one value fills 50,000 slots. You may use the \`bisect\` module.
            \`\`\`python
            search_range([5, 7, 7, 8, 8, 10], 8)  # [3, 4]
            search_range([5, 7, 7, 8, 8, 10], 6)  # [-1, -1]
            \`\`\`
          `,
          setup: 'B = [i // 3 for i in range(300000)]\nC = [i // 50000 for i in range(300000)]',
          starter: 'def search_range(nums, target):\n    pass\n',
          solution: py`
            from bisect import bisect_left, bisect_right

            def search_range(nums, target):
                lo = bisect_left(nums, target)
                if lo == len(nums) or nums[lo] != target:
                    return [-1, -1]
                hi = bisect_right(nums, target) - 1
                return [lo, hi]
          `,
          tests: [
            { call: 'search_range([5, 7, 7, 8, 8, 10], 8)', expect: '[3, 4]' },
            { call: 'search_range([5, 7, 7, 8, 8, 10], 6)', expect: '[-1, -1]' },
            { call: 'search_range([], 0)', expect: '[-1, -1]', hidden: true, name: 'empty list' },
            { call: 'search_range([1], 1)', expect: '[0, 0]', hidden: true, name: 'one item' },
            { call: 'search_range([2, 2, 2, 2], 2)', expect: '[0, 3]', hidden: true, name: 'all equal' },
            { call: 'search_range([1, 3], 4)', expect: '[-1, -1]', hidden: true, name: 'bigger than everything' },
            { call: 'search_range([1, 3], 0)', expect: '[-1, -1]', hidden: true, name: 'smaller than everything' },
            { call: 'sum(sum(search_range(B, x)) for x in range(0, 150000, 100))', expect: '299701000', hidden: true, maxMs: 150, name: '1,500 searches (performance)' },
            { call: 'sum(sum(search_range(C, x % 7)) for x in range(1400))', expect: '359998400', hidden: true, maxMs: 150, name: '50,000 copies of each value (performance)' },
          ],
          hints: [
            'The first index is the first position where `nums[i] >= target`. Check it really holds `target`.',
            'The last index is (first position where `nums[i] > target`) − 1: that\'s `bisect_right(nums, target) - 1`.',
          ],
          wrong: [
            py`
              from bisect import bisect_left, bisect_right

              def search_range(nums, target):
                  lo = bisect_left(nums, target)
                  if nums[lo] != target:
                      return [-1, -1]
                  return [lo, bisect_right(nums, target) - 1]
            `,
            py`
              from bisect import bisect_left

              def search_range(nums, target):
                  lo = bisect_left(nums, target)
                  if lo == len(nums) or nums[lo] != target:
                      return [-1, -1]
                  hi = lo
                  while hi + 1 < len(nums) and nums[hi + 1] == target:
                      hi += 1
                  return [lo, hi]
            `,
            py`
              def search_range(nums, target):
                  if target not in nums:
                      return [-1, -1]
                  i = nums.index(target)
                  return [i, i + nums.count(target) - 1]
            `,
          ],
          explain: '**O(log n) time, O(1) space**: two binary searches. Finding the first copy and then walking right is O(k) for k copies, which degrades to O(n) when one value dominates (think of a log file sorted by status code: millions of 200s). Always check `lo == len(nums)` before reading `nums[lo]`: the target can be bigger than everything.',
        },
        {
          type: 'code',
          title: 'Ship packages within D days',
          prompt: md`
            Packages with \`weights\` must be shipped **in order**. Each day you load packages onto the ship one by one until the next one would exceed the ship's capacity. Then the ship leaves and the next day starts.

            Write \`ship_within_days(weights, days)\` that returns the **minimum capacity** that ships everything within \`days\` days.

            Key fact: if capacity c works, every bigger capacity works too. Use that to binary search on the answer. Tests include 1,300 packages.
            \`\`\`python
            ship_within_days([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)  # 15
            ship_within_days([3, 2, 2, 4, 1, 4], 3)               # 6
            \`\`\`
          `,
          starter: 'def ship_within_days(weights, days):\n    pass\n',
          solution: py`
            def ship_within_days(weights, days):
                def fits(cap):
                    used, load = 1, 0
                    for w in weights:
                        if load + w > cap:
                            used += 1
                            load = 0
                        load += w
                    return used <= days

                lo, hi = max(weights), sum(weights)
                while lo < hi:
                    mid = (lo + hi) // 2
                    if fits(mid):
                        hi = mid
                    else:
                        lo = mid + 1
                return lo
          `,
          tests: [
            { call: 'ship_within_days([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)', expect: '15' },
            { call: 'ship_within_days([3, 2, 2, 4, 1, 4], 3)', expect: '6' },
            { call: 'ship_within_days([1, 2, 3, 1, 1], 4)', expect: '3', hidden: true },
            { call: 'ship_within_days([10], 1)', expect: '10', hidden: true, name: 'one package' },
            { call: 'ship_within_days([5], 2)', expect: '5', hidden: true, name: 'more days than packages' },
            { call: 'ship_within_days([1, 1, 1, 1], 1)', expect: '4', hidden: true, name: 'one day: ship everything' },
            { call: 'ship_within_days([7, 2, 5, 10, 8], 2)', expect: '18', hidden: true },
            { call: 'ship_within_days(list(range(1, 1301)), 10)', expect: '84889', hidden: true, maxMs: 150, name: '1,300 packages (performance)' },
          ],
          hints: [
            'Write a helper `fits(cap)` that simulates the days greedily and checks `used <= days`. That\'s O(n).',
            'The answer lies between `max(weights)` (the heaviest package must fit) and `sum(weights)` (one day). Find the first capacity where `fits` is True.',
            'Use the half-open template: `while lo < hi`, `hi = mid` when it fits, else `lo = mid + 1`.',
          ],
          wrong: [
            py`
              def ship_within_days(weights, days):
                  def fits(cap):
                      used, load = 1, 0
                      for w in weights:
                          if load + w > cap:
                              used += 1
                              load = 0
                          load += w
                      return used <= days

                  lo, hi = 1, sum(weights)
                  while lo < hi:
                      mid = (lo + hi) // 2
                      if fits(mid):
                          hi = mid
                      else:
                          lo = mid + 1
                  return lo
            `,
            py`
              def ship_within_days(weights, days):
                  def fits(cap):
                      used, load = 1, 0
                      for w in weights:
                          if load + w > cap:
                              used += 1
                              load = 0
                          else:
                              load += w
                      return used <= days

                  lo, hi = max(weights), sum(weights)
                  while lo < hi:
                      mid = (lo + hi) // 2
                      if fits(mid):
                          hi = mid
                      else:
                          lo = mid + 1
                  return lo
            `,
            py`
              def ship_within_days(weights, days):
                  def fits(cap):
                      used, load = 1, 0
                      for w in weights:
                          if load + w > cap:
                              used += 1
                              load = 0
                          load += w
                      return used <= days

                  cap = max(weights)
                  while not fits(cap):
                      cap += 1
                  return cap
            `,
          ],
          explain: '**O(n · log S) time** where S = sum(weights), **O(1) space.** The insight is *monotonicity*: feasibility flips from False to True exactly once as capacity grows, so you can binary search over capacities instead of indices. Trying capacities one by one is O(n · S). Start `lo` at `max(weights)`: below that, the simulation would "ship" an oversized package. This template also solves Koko Eating Bananas, Split Array Largest Sum and "minimum time to finish k jobs".',
        },
      ],
    },
    // ------------------------------------------------------------------ L6
    {
      id: 'u16-l6',
      title: 'Sorting, Intervals & Stacks',
      summary: 'Sort with custom keys, sweep sorted intervals, and let a stack remember what is still open.',
      steps: [
        {
          type: 'learn',
          title: 'Sorting with keys',
          body: md`
            \`sorted(items, key=f)\` sorts by \`f(item)\`, in **O(n log n)**.

            - **Tuple keys** sort by several fields: \`key=lambda p: (-p[1], p[0])\` means "second field descending, then first field ascending".
            - \`-x\` flips the order of a *number*. For strings, use \`reverse=True\` or two stable passes.
            - Python's sort is **stable**: items with equal keys keep their original order.

            Sorting first is often the whole trick: it puts related items next to each other, so one linear sweep finishes the job.
          `,
          code: py`
            people = [("ana", 31), ("bo", 25),
                      ("cy", 31), ("di", 25)]
            # oldest first, ties by name A → Z
            key = lambda p: (-p[1], p[0])
            print(sorted(people, key=key))

            # stable: "bb" stays before "dd"
            words = ["bb", "a", "ccc", "dd"]
            print(sorted(words, key=len))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            nums = [3, -1, -4, 2, 1]
            print(sorted(nums, key=lambda x: (abs(x), x)))
          `,
          options: ['[-1, 1, 2, 3, -4]', '[1, -1, 2, 3, -4]', '[-4, -1, 1, 2, 3]', '[-4, 3, 2, -1, 1]'],
          answer: 0,
          checkOutput: true,
          explain: 'The primary key is `abs(x)`: 1, 1, 2, 3, 4. The tie between -1 and 1 is broken by the second key `x`, and -1 < 1. Tuple keys compare element by element, left to right.',
        },
        {
          type: 'code',
          title: 'Sort by frequency',
          prompt: md`
            Write \`sort_by_freq(nums)\` that returns the numbers sorted so the **most frequent values come first**. Ties in frequency go **smaller value first**. Every copy stays in the result.
            \`\`\`python
            sort_by_freq([1, 1, 2, 2, 2, 3])  # [2, 2, 2, 1, 1, 3]
            sort_by_freq([6, 4, 6, 4])        # [4, 4, 6, 6]
            \`\`\`
          `,
          starter: 'def sort_by_freq(nums):\n    pass\n',
          solution: py`
            from collections import Counter

            def sort_by_freq(nums):
                c = Counter(nums)
                return sorted(nums,
                              key=lambda x: (-c[x], x))
          `,
          tests: [
            { call: 'sort_by_freq([1, 1, 2, 2, 2, 3])', expect: '[2, 2, 2, 1, 1, 3]' },
            { call: 'sort_by_freq([6, 4, 6, 4])', expect: '[4, 4, 6, 6]', name: 'tie → smaller first' },
            { call: 'sort_by_freq([])', expect: '[]', hidden: true, name: 'empty list' },
            { call: 'sort_by_freq([3, 1, 2])', expect: '[1, 2, 3]', hidden: true, name: 'all unique' },
            { call: 'sort_by_freq([-1, 5, -1, 5, 0])', expect: '[-1, -1, 5, 5, 0]', hidden: true, name: 'negatives' },
            { call: 'sort_by_freq([9, 9, 9, 1, 1, 7])', expect: '[9, 9, 9, 1, 1, 7]', hidden: true },
          ],
          hints: [
            'Count first with `Counter(nums)`.',
            'Sort the original list with a tuple key: frequency descending (negate it), then the value ascending.',
          ],
          wrong: [
            py`
              from collections import Counter

              def sort_by_freq(nums):
                  c = Counter(nums)
                  return sorted(nums, key=lambda x: (-c[x], -x))
            `,
            py`
              from collections import Counter

              def sort_by_freq(nums):
                  out = []
                  for x, k in Counter(nums).most_common():
                      out += [x] * k
                  return out
            `,
          ],
          explain: '**O(n log n) time, O(n) space.** Counting is O(n) and the sort dominates. `most_common()` breaks ties by first appearance, not by value: read the tie rule in every spec. Interview follow-up: with small counts you can bucket by frequency for O(n).',
        },
        {
          type: 'learn',
          title: 'Intervals: sort by start, then sweep',
          body: md`
            Interval problems (meetings, sessions, bookings) almost always start with **sorting by start time**. After that, any overlap must be between **neighbours**: check each interval only against the one before it. O(n log n) for the sort, O(n) for the sweep.

            - **Conflict?** \`cur.start < prev.end\` means they overlap.
            - **Merge**: keep a result list. If the next interval starts at or before the last merged end, extend that end with \`max(...)\`, else append a new interval.

            Read the spec for **touching** intervals: a meeting ending at 10 doesn't clash with one starting at 10, but "merge intervals" usually joins [1, 4] and [4, 5].
          `,
          code: py`
            meetings = [[1, 3], [8, 10], [2, 4], [9, 12]]
            meetings.sort(key=lambda m: m[0])
            print(meetings)
            for prev, cur in zip(meetings, meetings[1:]):
                if cur[0] < prev[1]:
                    print("clash:", prev, cur)
          `,
        },
        {
          type: 'code',
          title: 'Meeting rooms',
          prompt: md`
            \`intervals\` is a list of \`[start, end]\` meetings. Write \`can_attend(intervals)\` that returns \`True\` if one person can attend **all** of them. A meeting that ends at 10 doesn't clash with one that starts at 10.

            Must be **O(n log n)**: tests include 12,000 meetings.
            \`\`\`python
            can_attend([[0, 30], [5, 10], [15, 20]])  # False
            can_attend([[7, 10], [2, 4]])             # True
            \`\`\`
          `,
          starter: 'def can_attend(intervals):\n    pass\n',
          solution: py`
            def can_attend(intervals):
                ivs = sorted(intervals)
                for i in range(1, len(ivs)):
                    if ivs[i][0] < ivs[i - 1][1]:
                        return False
                return True
          `,
          tests: [
            { call: 'can_attend([[0, 30], [5, 10], [15, 20]])', expect: 'False' },
            { call: 'can_attend([[7, 10], [2, 4]])', expect: 'True' },
            { call: 'can_attend([])', expect: 'True', hidden: true, name: 'no meetings' },
            { call: 'can_attend([[1, 2], [2, 3]])', expect: 'True', hidden: true, name: 'touching is fine' },
            { call: 'can_attend([[1, 5], [2, 3]])', expect: 'False', hidden: true, name: 'one inside another' },
            { call: 'can_attend([[5, 8], [1, 4], [3, 6]])', expect: 'False', hidden: true },
            { call: 'can_attend([[i * 2, i * 2 + 1] for i in range(12000)][::-1])', expect: 'True', hidden: true, maxMs: 200, name: '12,000 meetings (performance)' },
          ],
          hints: [
            'Sort the meetings by start time.',
            'After sorting, a clash can only happen between neighbours: check `ivs[i][0] < ivs[i - 1][1]`.',
          ],
          wrong: [
            py`
              def can_attend(intervals):
                  for i in range(1, len(intervals)):
                      if intervals[i][0] < intervals[i - 1][1]:
                          return False
                  return True
            `,
            py`
              def can_attend(intervals):
                  ivs = sorted(intervals)
                  for i in range(1, len(ivs)):
                      if ivs[i][0] <= ivs[i - 1][1]:
                          return False
                  return True
            `,
            py`
              def can_attend(intervals):
                  n = len(intervals)
                  for i in range(n):
                      for j in range(i + 1, n):
                          a, b = intervals[i]
                          c, d = intervals[j]
                          if a < d and c < b:
                              return False
                  return True
            `,
          ],
          explain: '**O(n log n) time** (the sort), **O(n) space** for the sorted copy (O(1) extra if you may sort in place). Why neighbours suffice: if meeting k overlaps some earlier meeting j, it also overlaps meeting k−1, because k−1 started after j and before k. Follow-up: "Meeting Rooms II" (how many rooms?) uses a min-heap of end times or a sweep over sorted starts and ends.',
        },
        {
          type: 'code',
          title: 'Merge intervals',
          prompt: md`
            Write \`merge_intervals(intervals)\` that merges all overlapping intervals and returns them **sorted by start**. Here intervals that touch (\`[1, 4]\` and \`[4, 5]\`) **are** merged. Don't modify the input lists.
            \`\`\`python
            merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]])
            # [[1, 6], [8, 10], [15, 18]]
            merge_intervals([[1, 4], [4, 5]])  # [[1, 5]]
            \`\`\`
          `,
          starter: 'def merge_intervals(intervals):\n    pass\n',
          solution: py`
            def merge_intervals(intervals):
                merged = []
                for s, e in sorted(intervals):
                    if merged and s <= merged[-1][1]:
                        last = merged[-1]
                        last[1] = max(last[1], e)
                    else:
                        merged.append([s, e])
                return merged
          `,
          tests: [
            { call: 'merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]])', expect: '[[1, 6], [8, 10], [15, 18]]' },
            { call: 'merge_intervals([[1, 4], [4, 5]])', expect: '[[1, 5]]', name: 'touching intervals merge' },
            { call: 'merge_intervals([])', expect: '[]', hidden: true, name: 'empty list' },
            { call: 'merge_intervals([[1, 4], [2, 3]])', expect: '[[1, 4]]', hidden: true, name: 'one inside another' },
            { call: 'merge_intervals([[8, 10], [1, 3]])', expect: '[[1, 3], [8, 10]]', hidden: true, name: 'unsorted input' },
            { call: 'merge_intervals([[2, 3], [4, 5], [6, 7], [1, 10]])', expect: '[[1, 10]]', hidden: true },
            { code: 'a = [[1, 3], [2, 6]]\nmerge_intervals(a)\nassert a == [[1, 3], [2, 6]], a', name: 'input is not modified', hidden: true },
          ],
          hints: [
            'Sort by start. Keep `merged`, a list of intervals that are already final except possibly the last one.',
            'If the next start is `<=` the last merged end, extend: `last[1] = max(last[1], e)`. Otherwise append a **new** list `[s, e]`.',
          ],
          wrong: [
            py`
              def merge_intervals(intervals):
                  merged = []
                  for s, e in sorted(intervals):
                      if merged and s <= merged[-1][1]:
                          merged[-1][1] = e
                      else:
                          merged.append([s, e])
                  return merged
            `,
            py`
              def merge_intervals(intervals):
                  merged = []
                  for s, e in intervals:
                      if merged and s <= merged[-1][1]:
                          merged[-1][1] = max(merged[-1][1], e)
                      else:
                          merged.append([s, e])
                  return merged
            `,
            py`
              def merge_intervals(intervals):
                  merged = []
                  for iv in sorted(intervals):
                      if merged and iv[0] <= merged[-1][1]:
                          merged[-1][1] = max(merged[-1][1], iv[1])
                      else:
                          merged.append(iv)
                  return merged
            `,
          ],
          explain: '**O(n log n) time, O(n) space.** After sorting, an interval can only overlap the *last* merged one. Two classic bugs: overwriting the end (`= e`) instead of taking the `max` loses an outer interval that contains the next one, and appending the input list object itself means later merges silently edit the caller\'s data. In pipelines, this exact merge turns raw click events into user sessions.',
        },
        {
          type: 'learn',
          title: 'Stacks: the most recent open thing',
          body: md`
            A Python list is a stack: \`append\` pushes and \`pop\` removes the **last** item, both O(1). Use one whenever the newest open item must be closed first.

            - **Brackets**: push every opening bracket. A closing bracket must match the bracket on top. At the end the stack must be empty.
            - **Reverse Polish Notation** (\`3 4 + 2 *\` = \`(3 + 4) * 2\`): push numbers. An operator pops **b** (top), then **a**, and pushes \`a op b\`. The order matters for \`-\` and \`/\`.

            Below, a stack replays typing where \`#\` is backspace.
          `,
          code: py`
            def type_out(keys):
                stack = []
                for ch in keys:
                    if ch == "#":
                        if stack:
                            stack.pop()
                    else:
                        stack.append(ch)
                return "".join(stack)

            print(type_out("ab#c"), type_out("a##b"))
          `,
        },
        {
          type: 'code',
          title: 'Valid parentheses',
          prompt: md`
            Write \`is_valid(s)\` for a string of \`()[]{}\` characters. It's valid if every bracket is closed by the **same type**, in the **right order**.

            Must be O(n): tests include 120,000 characters.
            \`\`\`python
            is_valid("()[]{}")  # True
            is_valid("([)]")    # False
            is_valid("{[]}")    # True
            \`\`\`
          `,
          starter: 'def is_valid(s):\n    pass\n',
          solution: py`
            def is_valid(s):
                pairs = {")": "(", "]": "[", "}": "{"}
                stack = []
                for ch in s:
                    if ch not in pairs:
                        stack.append(ch)
                    elif not stack:
                        return False
                    elif stack.pop() != pairs[ch]:
                        return False
                return not stack
          `,
          tests: [
            { call: 'is_valid("()[]{}")', expect: 'True' },
            { call: 'is_valid("([)]")', expect: 'False' },
            { call: 'is_valid("{[]}")', expect: 'True' },
            { call: 'is_valid("(]")', expect: 'False', hidden: true, name: 'wrong type' },
            { call: 'is_valid("")', expect: 'True', hidden: true, name: 'empty string' },
            { call: 'is_valid("((")', expect: 'False', hidden: true, name: 'never closed' },
            { call: 'is_valid(")(")', expect: 'False', hidden: true, name: 'closes before opening' },
            { call: 'is_valid("([{" * 20000 + "}])" * 20000)', expect: 'True', hidden: true, maxMs: 150, name: '120,000 characters (performance)' },
          ],
          hints: [
            'Map each closing bracket to its opener: `{")": "(", ...}`.',
            'Push openers. For a closer, the stack must be non-empty and its popped top must be the matching opener. Finally, return `not stack`.',
          ],
          wrong: [
            py`
              def is_valid(s):
                  depth = 0
                  for ch in s:
                      depth += 1 if ch in "([{" else -1
                      if depth < 0:
                          return False
                  return depth == 0
            `,
            py`
              def is_valid(s):
                  pairs = {")": "(", "]": "[", "}": "{"}
                  stack = []
                  for ch in s:
                      if ch in pairs:
                          if not stack or stack.pop() != pairs[ch]:
                              return False
                      else:
                          stack.append(ch)
                  return True
            `,
            py`
              def is_valid(s):
                  while "()" in s or "[]" in s or "{}" in s:
                      s = s.replace("()", "")
                      s = s.replace("[]", "").replace("{}", "")
                  return s == ""
            `,
          ],
          explain: '**O(n) time, O(n) space** (the stack can hold n/2 openers). A depth counter only works for *one* bracket type: it can\'t tell that "([)]" closes in the wrong order. Forgetting the final `not stack` accepts "((". The replace-in-a-loop trick is correct but O(n²) on deeply nested input, since each pass removes only the innermost pairs.',
        },
        {
          type: 'order',
          prompt: 'Arrange `eval_rpn` so that `["5", "8", "-"]` gives -3. `OPS` maps each operator to a two-argument function.',
          setup: py`
            OPS = {
                "+": lambda a, b: a + b,
                "-": lambda a, b: a - b,
                "*": lambda a, b: a * b,
                "/": lambda a, b: int(a / b),
            }
          `,
          lines: [
            'def eval_rpn(tokens):',
            '    stack = []',
            '    for t in tokens:',
            '        if t in OPS:',
            '            b = stack.pop()',
            '            a = stack.pop()',
            '            stack.append(OPS[t](a, b))',
            '        else:',
            '            stack.append(int(t))',
            '    return stack.pop()',
          ],
          distractors: ['            stack.append(OPS[t](b, a))'],
          tests: [
            { call: 'eval_rpn(["5", "8", "-"])', expect: '-3' },
            { call: 'eval_rpn(["2", "1", "+", "3", "*"])', expect: '9' },
            { call: 'eval_rpn(["4", "13", "5", "/", "+"])', expect: '6' },
            { call: 'eval_rpn(["7", "-2", "/"])', expect: '-3' },
          ],
          explain: 'The top of the stack is the **right** operand, so pop `b` first, then `a`, and compute `a op b`. Division in this puzzle truncates toward zero: `int(7 / -2)` is -3, while `7 // -2` would be -4. Each token is pushed and popped at most once: O(n) time, O(n) space.',
        },
        {
          type: 'learn',
          title: 'Monotonic stack',
          body: md`
            "For each item, find the **next/previous greater** item" is O(n²) with nested loops. A **monotonic stack** does it in O(n).

            Keep the stack **decreasing**. When a new item \`x\` arrives, pop everything ≤ \`x\`: those items can never be "the greater one" for anything that comes later, because \`x\` is bigger *and* closer. After popping, the top (if any) is the previous greater of \`x\`.

            Store **indices** instead of values when you need distances. Every index is pushed once and popped at most once, so the total work is O(n).
          `,
          code: py`
            nums = [3, 7, 1, 7, 5]
            stack, prev = [], []
            for x in nums:
                while stack and stack[-1] <= x:
                    stack.pop()
                prev.append(stack[-1] if stack else -1)
                stack.append(x)
            print("previous greater:", prev)
          `,
        },
        {
          type: 'choice',
          prompt: 'Time complexity of this loop for n numbers?',
          code: py`
            stack = []
            for i, x in enumerate(nums):
                while stack and nums[stack[-1]] < x:
                    stack.pop()
                stack.append(i)
          `,
          options: ['O(n)', 'O(n²)', 'O(n log n)', 'O(n · stack size)'],
          answer: 0,
          explain: 'The inner `while` can pop many items at once, but each index is pushed exactly once and popped at most once over the *whole* run: at most 2n operations. This is an **amortised** argument: one step can be expensive, but the total is O(n). Say it explicitly in interviews, because "a while inside a for" makes many people answer O(n²).',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix next greater element',
          prompt: md`
            \`next_greater(nums)\` should return, for each position, the first value **to its right that is strictly greater**, or \`-1\` if none exists.
            \`\`\`python
            next_greater([2, 1, 3])  # [3, 3, -1]
            next_greater([5, 5])     # [-1, -1]
            \`\`\`
            It uses a monotonic stack of **indices**, but it has **two** bugs.
          `,
          starter: py`
            def next_greater(nums):
                res = [-1] * len(nums)
                stack = []  # indices
                for i, x in enumerate(nums):
                    while stack and nums[stack[-1]] <= x:
                        res[stack.pop()] = x
                    stack.append(x)
                return res
          `,
          solution: py`
            def next_greater(nums):
                res = [-1] * len(nums)
                stack = []  # indices
                for i, x in enumerate(nums):
                    while stack and nums[stack[-1]] < x:
                        res[stack.pop()] = x
                    stack.append(i)
                return res
          `,
          tests: [
            { call: 'next_greater([2, 1, 3])', expect: '[3, 3, -1]' },
            { call: 'next_greater([5, 5])', expect: '[-1, -1]', name: 'equal is not greater' },
            { call: 'next_greater([1, 2, 3])', expect: '[2, 3, -1]' },
            { call: 'next_greater([])', expect: '[]', hidden: true, name: 'empty list' },
            { call: 'next_greater([4, 1, 2])', expect: '[-1, 2, -1]', hidden: true },
            { call: 'next_greater([2, 2, 3])', expect: '[3, 3, -1]', hidden: true },
            { call: 'sum(next_greater(list(range(18000, 0, -1)) + [18001]))', expect: '324017999', hidden: true, maxMs: 150, name: '18,001 numbers (performance)' },
          ],
          hints: [
            'The stack holds *indices* (look at how `nums[stack[-1]]` and `res[stack.pop()]` use it). What gets pushed?',
            'An equal value is not "strictly greater": the pop condition must be `<`, not `<=`.',
          ],
          wrong: [
            py`
              def next_greater(nums):
                  res = [-1] * len(nums)
                  stack = []
                  for i, x in enumerate(nums):
                      while stack and nums[stack[-1]] <= x:
                          res[stack.pop()] = x
                      stack.append(i)
                  return res
            `,
            py`
              def next_greater(nums):
                  res = []
                  for i in range(len(nums)):
                      r = -1
                      for j in range(i + 1, len(nums)):
                          if nums[j] > nums[i]:
                              r = nums[j]
                              break
                      res.append(r)
                  return res
            `,
          ],
          explain: '**O(n) time, O(n) space.** The stack holds indices whose answer is still unknown, and their values are decreasing from bottom to top. When `x` arrives, it *is* the answer for every smaller value on top. Pushing values instead of indices breaks `res[stack.pop()]`, and `<=` treats equal values as greater. Variants to expect: circular arrays (loop twice over `2n` indices), stock span, largest rectangle in a histogram.',
        },
        {
          type: 'code',
          title: 'Daily temperatures',
          prompt: md`
            Given daily \`temps\`, write \`daily_temperatures(temps)\` that returns, for each day, **how many days you wait** until a strictly warmer day, or \`0\` if no warmer day comes.

            Must be **O(n)**: tests include 18,001 days.
            \`\`\`python
            daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73])
            # [1, 1, 4, 2, 1, 1, 0, 0]
            \`\`\`
          `,
          starter: 'def daily_temperatures(temps):\n    pass\n',
          solution: py`
            def daily_temperatures(temps):
                res = [0] * len(temps)
                stack = []
                for i, t in enumerate(temps):
                    while stack and temps[stack[-1]] < t:
                        j = stack.pop()
                        res[j] = i - j
                    stack.append(i)
                return res
          `,
          tests: [
            { call: 'daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73])', expect: '[1, 1, 4, 2, 1, 1, 0, 0]' },
            { call: 'daily_temperatures([30, 40, 50, 60])', expect: '[1, 1, 1, 0]' },
            { call: 'daily_temperatures([])', expect: '[]', hidden: true, name: 'no days' },
            { call: 'daily_temperatures([50, 50])', expect: '[0, 0]', hidden: true, name: 'equal is not warmer' },
            { call: 'daily_temperatures([60, 50, 40])', expect: '[0, 0, 0]', hidden: true, name: 'only getting colder' },
            { call: 'daily_temperatures([30, 60, 90, 20, 95])', expect: '[1, 1, 2, 1, 0]', hidden: true },
            { call: 'sum(daily_temperatures(list(range(18000, 0, -1)) + [99999]))', expect: '162009000', hidden: true, maxMs: 150, name: '18,001 days (performance)' },
          ],
          hints: [
            'Keep a stack of day indices still waiting for a warmer day. Their temperatures decrease from bottom to top.',
            'On day `i`, pop every waiting day `j` colder than today and set `res[j] = i - j`. Then push `i`.',
          ],
          wrong: [
            py`
              def daily_temperatures(temps):
                  res = [0] * len(temps)
                  stack = []
                  for i, t in enumerate(temps):
                      while stack and temps[stack[-1]] <= t:
                          j = stack.pop()
                          res[j] = i - j
                      stack.append(i)
                  return res
            `,
            py`
              def daily_temperatures(temps):
                  res = [0] * len(temps)
                  for i in range(len(temps)):
                      for j in range(i + 1, len(temps)):
                          if temps[j] > temps[i]:
                              res[i] = j - i
                              break
                  return res
            `,
          ],
          explain: '**O(n) time, O(n) space**, amortised: each day is pushed once and popped at most once. The brute force scans forward from every day: O(n²) when temperatures keep falling, which is exactly the hidden test. Storing indices (not temperatures) is what lets you compute the distance `i - j`.',
        },
      ],
    },
  ],
  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u16-exam',
    title: 'Complexity & Core Patterns Exam',
    minutes: 40,
    intro: 'A real coding round: complexity analysis, hashing, two pointers, sliding windows, prefix sums, binary search and stacks. Hidden tests include large inputs, so brute force won\'t pass. Say the complexity to yourself before you submit each answer.',
    questions: [
      {
        type: 'choice',
        prompt: 'Time complexity of `doubled` for a list of n numbers?',
        code: py`
          def doubled(nums):
              out = []
              for x in nums:
                  out = out + [x * 2]
              return out
        `,
        options: ['O(n²)', 'O(n)', 'O(n log n)', 'O(1)'],
        answer: 0,
        explain: '`out + [x * 2]` builds a **brand-new list** and copies everything already in `out`: 1 + 2 + … + n copies = O(n²). `out.append(x * 2)` (or `out += [...]`, which extends in place) is amortised O(1), so the loop would be O(n).',
      },
      {
        type: 'output',
        prompt: 'Type exactly what this prints.',
        code: py`
          nums = [1, 2, 3, 4, 5, 6]
          lo, hi = 0, len(nums)
          mids = []
          while lo < hi:
              mid = (lo + hi) // 2
              mids.append(mid)
              if nums[mid] * 2 > 7:
                  hi = mid
              else:
                  lo = mid + 1
          print(mids, lo)
        `,
        answer: '[3, 1, 2] 3',
        explain: 'The "first True" template, with condition `nums[i] * 2 > 7`. mid 3 (8 > 7, so hi = 3), mid 1 (4, lo = 2), mid 2 (6, lo = 3). The range [3, 3) is empty: the first True is index 3.',
      },
      {
        type: 'choice',
        prompt: 'Time complexity of `distinct_substrings` for a string of length n?',
        code: py`
          def distinct_substrings(s):
              seen = set()
              for i in range(len(s)):
                  for j in range(i + 1, len(s) + 1):
                      seen.add(s[i:j])
              return len(seen)
        `,
        options: ['O(n³)', 'O(n²)', 'O(n² log n)', 'O(n)'],
        answer: 0,
        explain: 'There are about n²/2 substrings, but each one is **copied** by the slice and **hashed** when added, which costs O(length): on average about n/3. Total O(n³) time, and O(n³) space in the worst case for the set. Slices and hashing of strings are never free.',
      },
      {
        type: 'blanks',
        prompt: 'Complete `longest_sum_k`: the length of the longest subarray summing to exactly `k` (numbers may be negative).',
        code: py`
          def longest_sum_k(nums, k):
              first = {0: ___}
              pre = best = 0
              for i, x in enumerate(nums):
                  pre += x
                  if pre - k in first:
                      best = max(best, i - first[pre - k])
                  if pre ___ first:
                      first[pre] = ___
              return best
        `,
        bank: ['-1', '0', 'not in', 'in', 'i', 'i + 1'],
        answer: ['-1', 'not in', 'i'],
        tests: [
          { call: 'longest_sum_k([1, -1, 5, -2, 3], 3)', expect: '4' },
          { call: 'longest_sum_k([-2, -1, 2, 1], 1)', expect: '2' },
          { call: 'longest_sum_k([3], 3)', expect: '1' },
          { call: 'longest_sum_k([1, 2, 3], 7)', expect: '0' },
        ],
        explain: 'The empty prefix "ends" at index -1, so a subarray `0..i` has length `i - (-1)`. To get the **longest** subarray, keep only the **first** index of each prefix sum (`not in`). O(n) time, O(n) space.',
      },
      {
        type: 'code',
        title: 'Product of array except self',
        prompt: md`
          Write \`product_except_self(nums)\` that returns a list where position \`i\` holds the product of every number **except** \`nums[i]\`.

          Don't use division (zeros are allowed). Required: **O(n)** time. Tests include 7,200 numbers.
          \`\`\`python
          product_except_self([1, 2, 3, 4])       # [24, 12, 8, 6]
          product_except_self([-1, 1, 0, -3, 3])  # [0, 0, 9, 0, 0]
          \`\`\`
        `,
        starter: 'def product_except_self(nums):\n    pass\n',
        solution: py`
          def product_except_self(nums):
              n = len(nums)
              res = [1] * n
              left = 1
              for i in range(n):
                  res[i] = left
                  left *= nums[i]
              right = 1
              for i in range(n - 1, -1, -1):
                  res[i] *= right
                  right *= nums[i]
              return res
        `,
        tests: [
          { call: 'product_except_self([1, 2, 3, 4])', expect: '[24, 12, 8, 6]' },
          { call: 'product_except_self([-1, 1, 0, -3, 3])', expect: '[0, 0, 9, 0, 0]' },
          { call: 'product_except_self([5, 2])', expect: '[2, 5]', hidden: true, name: 'two numbers' },
          { call: 'product_except_self([0, 4, 0])', expect: '[0, 0, 0]', hidden: true, name: 'two zeros' },
          { call: 'product_except_self([2, 3, 0])', expect: '[0, 0, 6]', hidden: true, name: 'one zero' },
          { call: 'sum(product_except_self([1, -1, -1] * 2400))', expect: '-2400', hidden: true, maxMs: 150, name: '7,200 numbers (performance)' },
        ],
        wrong: [
          py`
            def product_except_self(nums):
                total = 1
                for x in nums:
                    total *= x
                return [total // x for x in nums]
          `,
          py`
            def product_except_self(nums):
                res = []
                for i in range(len(nums)):
                    p = 1
                    for j, x in enumerate(nums):
                        if j != i:
                            p *= x
                    res.append(p)
                return res
          `,
          py`
            def product_except_self(nums):
                n = len(nums)
                res = [1] * n
                left = 1
                for i in range(n):
                    left *= nums[i]
                    res[i] = left
                right = 1
                for i in range(n - 1, -1, -1):
                    right *= nums[i]
                    res[i] *= right
                return res
          `,
        ],
        explain: '**O(n) time, O(1) extra space** (the output doesn\'t count). Position i needs (product of everything left of i) × (product of everything right of i): one forward pass writes the left products, one backward pass multiplies in the right products. Update the running product *after* using it, otherwise `nums[i]` sneaks into its own answer. Division fails on zeros.',
      },
      {
        type: 'code',
        title: 'Max consecutive ones with k flips',
        prompt: md`
          \`nums\` contains only 0s and 1s. Write \`longest_ones(nums, k)\` that returns the length of the longest run of 1s you can get if you may flip **at most k** zeros to 1.

          Required: **O(n)**. Tests include 7,000 items.
          \`\`\`python
          longest_ones([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2)  # 6
          longest_ones([1, 0, 1], 0)                          # 1
          \`\`\`
        `,
        starter: 'def longest_ones(nums, k):\n    pass\n',
        solution: py`
          def longest_ones(nums, k):
              left = zeros = best = 0
              for right, x in enumerate(nums):
                  if x == 0:
                      zeros += 1
                  while zeros > k:
                      if nums[left] == 0:
                          zeros -= 1
                      left += 1
                  best = max(best, right - left + 1)
              return best
        `,
        tests: [
          { call: 'longest_ones([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2)', expect: '6' },
          { call: 'longest_ones([1, 0, 1], 0)', expect: '1' },
          { call: 'longest_ones([0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1], 3)', expect: '10', hidden: true },
          { call: 'longest_ones([], 2)', expect: '0', hidden: true, name: 'empty list' },
          { call: 'longest_ones([0, 0, 0], 5)', expect: '3', hidden: true, name: 'k bigger than the zeros' },
          { call: 'longest_ones([0, 0], 0)', expect: '0', hidden: true, name: 'no flips, no ones' },
          { call: 'longest_ones([1, 1, 0, 1], 1)', expect: '4', hidden: true },
          { call: 'longest_ones([1, 0] * 3500, 1750)', expect: '3501', hidden: true, maxMs: 150, name: '7,000 items (performance)' },
        ],
        wrong: [
          py`
            def longest_ones(nums, k):
                left = zeros = best = 0
                for right, x in enumerate(nums):
                    if x == 0:
                        zeros += 1
                    while zeros >= k and left <= right:
                        if nums[left] == 0:
                            zeros -= 1
                        left += 1
                    best = max(best, right - left + 1)
                return best
          `,
          py`
            def longest_ones(nums, k):
                best = 0
                for i in range(len(nums)):
                    zeros = 0
                    for j in range(i, len(nums)):
                        zeros += nums[j] == 0
                        if zeros > k:
                            break
                        best = max(best, j - i + 1)
                return best
          `,
        ],
        explain: 'Reframe it: "the longest window containing at most k zeros". Then it\'s the grow/shrink template: **O(n) time, O(1) space**. Recognising that reframing is the real interview skill. The brute force restarts from every index: O(n²) on long windows.',
      },
      {
        type: 'code',
        kind: 'fix',
        title: 'Fix the k-diff pairs',
        prompt: md`
          \`k_diff_pairs(nums, k)\` should return the number of **unique** pairs of values \`(a, b)\` from \`nums\` with \`b - a == k\`, where \`k >= 0\`. For \`k == 0\` a pair needs the same value at two different positions.
          \`\`\`python
          k_diff_pairs([3, 1, 4, 1, 5], 2)  # 2: (1, 3), (3, 5)
          k_diff_pairs([1, 3, 1, 5, 4], 0)  # 1: (1, 1)
          \`\`\`
          The current code has two bugs. Keep it O(n): tests include 40,000 numbers.
        `,
        starter: py`
          def k_diff_pairs(nums, k):
              s = set(nums)
              count = 0
              for x in nums:
                  if x + k in s:
                      count += 1
              return count
        `,
        solution: py`
          from collections import Counter

          def k_diff_pairs(nums, k):
              c = Counter(nums)
              if k == 0:
                  return sum(v > 1 for v in c.values())
              return sum(x + k in c for x in c)
        `,
        tests: [
          { call: 'k_diff_pairs([3, 1, 4, 1, 5], 2)', expect: '2' },
          { call: 'k_diff_pairs([1, 3, 1, 5, 4], 0)', expect: '1', name: 'k = 0' },
          { call: 'k_diff_pairs([1, 2, 3, 4, 5], 1)', expect: '4', hidden: true },
          { call: 'k_diff_pairs([1, 1, 1, 1], 0)', expect: '1', hidden: true, name: 'one value, many copies' },
          { call: 'k_diff_pairs([1, 2, 3], 5)', expect: '0', hidden: true },
          { call: 'k_diff_pairs([-1, -2, -3], 1)', expect: '2', hidden: true, name: 'negatives' },
          { call: 'k_diff_pairs([1, 1, 2, 2], 1)', expect: '1', hidden: true, name: 'duplicates count once' },
          { call: 'k_diff_pairs(list(range(20000)) * 2, 3)', expect: '19997', hidden: true, maxMs: 200, name: '40,000 numbers (performance)' },
        ],
        wrong: [
          py`
            def k_diff_pairs(nums, k):
                s = set(nums)
                count = 0
                for x in s:
                    if x + k in s:
                        count += 1
                return count
          `,
          py`
            from collections import Counter

            def k_diff_pairs(nums, k):
                c = Counter(nums)
                if k == 0:
                    return sum(1 for v in c.values() if v > 1)
                return sum(1 for x in nums if x + k in c)
          `,
        ],
        explain: 'Bug 1: looping over `nums` counts a value once per copy, so loop over the **distinct** values. Bug 2: with `k == 0`, `x + 0 in s` is always True, so you need **counts**, not a set. **O(n) time, O(n) space.** k = 0 is the edge case interviewers deliberately put in this problem.',
      },
      {
        type: 'code',
        title: 'Koko eating bananas',
        prompt: md`
          Koko has \`piles\` of bananas and \`h\` hours (\`h >= len(piles)\`). Each hour she picks one pile and eats up to \`k\` bananas from it. If the pile has fewer, she finishes it and waits for the next hour.

          Write \`min_eating_speed(piles, h)\` that returns the **smallest integer k** that lets her finish within \`h\` hours. Piles can be as large as 10⁹, so don't try every speed. Tests include 1,000 piles.
          \`\`\`python
          min_eating_speed([3, 6, 7, 11], 8)        # 4
          min_eating_speed([30, 11, 23, 4, 20], 5)  # 30
          \`\`\`
        `,
        starter: 'def min_eating_speed(piles, h):\n    pass\n',
        solution: py`
          def min_eating_speed(piles, h):
              def hours(k):
                  return sum((p + k - 1) // k
                             for p in piles)

              lo, hi = 1, max(piles)
              while lo < hi:
                  mid = (lo + hi) // 2
                  if hours(mid) <= h:
                      hi = mid
                  else:
                      lo = mid + 1
              return lo
        `,
        tests: [
          { call: 'min_eating_speed([3, 6, 7, 11], 8)', expect: '4' },
          { call: 'min_eating_speed([30, 11, 23, 4, 20], 5)', expect: '30' },
          { call: 'min_eating_speed([30, 11, 23, 4, 20], 6)', expect: '23', hidden: true },
          { call: 'min_eating_speed([1], 1)', expect: '1', hidden: true, name: 'one tiny pile' },
          { call: 'min_eating_speed([1000000000], 2)', expect: '500000000', hidden: true, name: 'huge pile' },
          { call: 'min_eating_speed([312884470], 312884469)', expect: '2', hidden: true, name: 'almost one per hour' },
          { call: 'min_eating_speed([40000 + i for i in range(1000)], 1000)', expect: '40999', hidden: true, maxMs: 150, name: '1,000 piles (performance)' },
        ],
        wrong: [
          py`
            def min_eating_speed(piles, h):
                def hours(k):
                    return sum(p // k for p in piles)

                lo, hi = 1, max(piles)
                while lo < hi:
                    mid = (lo + hi) // 2
                    if hours(mid) <= h:
                        hi = mid
                    else:
                        lo = mid + 1
                return lo
          `,
          py`
            def min_eating_speed(piles, h):
                def hours(k):
                    return sum((p + k - 1) // k for p in piles)

                lo, hi = 1, max(piles) - 1
                while lo < hi:
                    mid = (lo + hi) // 2
                    if hours(mid) <= h:
                        hi = mid
                    else:
                        lo = mid + 1
                return lo
          `,
        ],
        explain: '**O(n log M) time** with M = max(piles), **O(1) space.** Hours needed only go down as k grows, so binary search for the first k with `hours(k) <= h`. The answer is at most `max(piles)` (one pile per hour), so `hi` must include it. Use integer ceiling `(p + k - 1) // k`: floor division undercounts, and `math.ceil(p / k)` goes through floats, which can round wrongly for huge numbers.',
      },
      {
        type: 'code',
        title: 'Trapping rain water',
        prompt: md`
          \`height\` describes an elevation map where each bar has width 1. Write \`trap(height)\` that returns how much rain water is trapped between the bars.

          Water above bar \`i\` = \`min(highest bar to its left, highest bar to its right) - height[i]\` (never negative). Required: **O(n) time**; O(1) extra space is the bonus. Tests include 15,000 bars.
          \`\`\`python
          trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])  # 6
          trap([4, 2, 0, 3, 2, 5])                    # 9
          \`\`\`
        `,
        starter: 'def trap(height):\n    pass\n',
        solution: py`
          def trap(height):
              h = height
              i, j = 0, len(h) - 1
              left_max = right_max = water = 0
              while i < j:
                  if h[i] < h[j]:
                      left_max = max(left_max, h[i])
                      water += left_max - h[i]
                      i += 1
                  else:
                      right_max = max(right_max, h[j])
                      water += right_max - h[j]
                      j -= 1
              return water
        `,
        tests: [
          { call: 'trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])', expect: '6' },
          { call: 'trap([4, 2, 0, 3, 2, 5])', expect: '9' },
          { call: 'trap([])', expect: '0', hidden: true, name: 'no bars' },
          { call: 'trap([1])', expect: '0', hidden: true, name: 'one bar' },
          { call: 'trap([3, 0, 3])', expect: '3', hidden: true },
          { call: 'trap([5, 4, 3])', expect: '0', hidden: true, name: 'downhill holds nothing' },
          { call: 'trap([2, 0, 1])', expect: '1', hidden: true, name: 'shorter right wall' },
          { call: 'trap([5, 0, 0, 0, 5])', expect: '15', hidden: true },
          { call: 'trap([(i * 7919) % 1000 for i in range(15000)])', expect: '7478640', hidden: true, maxMs: 150, name: '15,000 bars (performance)' },
        ],
        wrong: [
          py`
            def trap(height):
                water = 0
                for i in range(len(height)):
                    left = max(height[:i + 1])
                    right = max(height[i:])
                    water += min(left, right) - height[i]
                return water
          `,
          py`
            def trap(height):
                i, j = 0, len(height) - 1
                left_max = right_max = water = 0
                while i < j:
                    left_max = max(left_max, height[i])
                    right_max = max(right_max, height[j])
                    if height[i] > height[j]:
                        water += left_max - height[i]
                        i += 1
                    else:
                        water += right_max - height[j]
                        j -= 1
                return water
          `,
          py`
            def trap(height):
                n = len(height)
                left, right = [0] * n, [0] * n
                for i in range(1, n):
                    left[i] = max(left[i - 1], height[i - 1])
                for i in range(n - 2, -1, -1):
                    right[i] = max(right[i + 1], height[i + 1])
                return sum(min(left[i], right[i]) - height[i]
                           for i in range(n))
          `,
        ],
        explain: '**O(n) time, O(1) space.** If `height[i] < height[j]`, the water at `i` is decided by `left_max` alone: some bar at least as tall as `height[i]` exists on the right (namely `j`), so the right side can\'t be the limit. Process the lower side and move it inward. The prefix/suffix-max arrays version is O(n) time and O(n) space, and it\'s a fine first answer. Just never let a bar\'s water go negative. Recomputing the maxima with slices for every bar is O(n²).',
      },
    ],
  },
};

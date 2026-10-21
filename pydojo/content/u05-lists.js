// Unit 5 — Lists & Tuples.
import { py, md } from './helpers.js';

export default {
  id: 'u05',
  order: 5,
  track: 'foundations',
  title: 'Lists & Tuples',
  subtitle: 'mutation, sorting, unpacking, aliasing',
  icon: '📚',
  color: '#2F80ED',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u05-l1',
      title: 'List Basics',
      summary: 'Create lists, read them, grow them and summarise them.',
      steps: [
        {
          type: 'learn',
          title: 'Lists hold many values',
          body: md`
            A **list** is an ordered collection in square brackets: \`[3, 1, 4]\`. It can hold any values, even mixed types, and \`[]\` is the empty list.

            Lists index and slice exactly like strings: from 0, negatives from the end, and a slice is a new list. \`len()\` counts the items.

            The big difference: lists are **mutable**. \`nums[0] = 9\` changes the list in place.
          `,
          code: py`
            scores = [88, 92, 79, 95]
            print(scores[0], scores[-1], len(scores))
            print(scores[1:3])
            scores[0] = 90
            print(scores)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            temps = [12, 15, 9, 21, 18]
            print(temps[1], temps[-2], len(temps))
          `,
          options: ['15 21 5', '12 18 5', '15 18 4', '12 21 5'],
          answer: 0,
          checkOutput: true,
          explain: 'Index 1 is the **second** item (15). `-2` is the second from the end (21). Five items, so `len` is 5.',
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            nums = [3, 1, 4, 1, 5]
            nums[0] = 9
            print(nums)
            print(nums[1:3], nums[::2])
          `,
          answer: '[9, 1, 4, 1, 5]\n[1, 4] [9, 4, 5]',
          explain: 'Assigning to an index replaces that item, something strings never allow. Slices work exactly as on strings: `[1:3]` is items 1 and 2, `[::2]` every other item.',
        },
        {
          type: 'learn',
          title: 'in, for and append',
          body: md`
            - \`x in lst\`: is \`x\` one of the items? Whole items only: \`"a" in ["abc"]\` is False.
            - \`for x in lst:\` visits every item in order.
            - \`lst.append(x)\` adds \`x\` to the **end**, changing the list.

            Start from \`[]\` and \`append\` inside a loop: that's how you build a new list from data.
          `,
          code: py`
            countries = ["DE", "US", "FR"]
            print("US" in countries, "HR" in countries)

            big = []
            for n in [5, 120, 42, 300]:
                if n > 100:
                    big.append(n)
            print(big)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: 'print(4 in [1, 2, 3], "a" in ["abc"])',
          options: ['False False', 'False True', 'True False', 'True True'],
          answer: 0,
          checkOutput: true,
          explain: 'On a list, `in` compares whole items. "abc" contains the letter a, but the list\'s only item is "abc", which isn\'t equal to "a". (On a *string*, `"a" in "abc"` would be True.)',
        },
        {
          type: 'blanks',
          prompt: 'Build the list of even numbers below 10.',
          code: py`
            evens = ___
            for n in range(10):
                if n % 2 == 0:
                    evens.___(n)
            print(evens)
          `,
          bank: ['[]', 'append', '""', 'add', 'push', '0'],
          answer: ['[]', 'append'],
          tests: [{ stdout: '[0, 2, 4, 6, 8]\n' }],
          explain: 'Start with the empty list and `append` each match. Lists have no `push` (that\'s JavaScript) and no `add` (that\'s for sets, Unit 6).',
        },
        {
          type: 'learn',
          title: 'Totals, averages and extremes',
          body: md`
            The **accumulator** pattern from Unit 2 works on lists: start a variable, update it for each item. For the common cases Python has built-ins: \`sum(lst)\`, \`min(lst)\`, \`max(lst)\`. The average is \`sum(lst) / len(lst)\`.

            Empty lists are the classic edge case: \`sum([])\` is 0, but \`min\`/\`max\` raise ValueError and the average divides by zero. An empty list is **falsy**, so \`if not lst:\` catches it.
          `,
          code: py`
            amounts = [19.99, 5.0, 42.5]
            total = 0
            for a in amounts:
                total += a
            print(round(total, 2), round(sum(amounts), 2))
            print(min(amounts), max(amounts))
            print(round(sum(amounts) / len(amounts), 2))
            print(bool([]), bool([0]))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            prices = [4.5, 10, 2.25]
            print(sum(prices), max(prices) - min(prices))
          `,
          answer: '16.75 7.75',
          explain: 'The sum is 16.75, the range (max minus min) is 10 - 2.25. Mixing ints and floats is fine: the result is a float.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: 'print(max([]))',
          options: ['ValueError: max() iterable argument is empty', '0', 'None', 'IndexError: list index out of range'],
          answer: 0,
          checkOutput: true,
          explain: 'There is no largest item in an empty list, so Python refuses to guess. Check for empty input first, or pass a fallback: `max(lst, default=0)`.',
        },
        {
          type: 'order',
          prompt: '`nums` already exists. Arrange the lines to compute its average by hand and print it.',
          setup: 'nums = [4, 8, 6]',
          lines: ['total = 0', 'for x in nums:', '    total += x', 'avg = total / len(nums)', 'print(avg)'],
          distractors: ['    total = x'],
          tests: [{ stdout: '6.0\n' }],
          explain: 'Initialise before the loop, accumulate inside it, divide after it. `total = x` would keep only the last value instead of adding them up.',
        },
        {
          type: 'code',
          title: 'Big orders',
          prompt: md`
            Write \`count_above(amounts, limit)\` that returns how many amounts are **strictly greater** than \`limit\`.

            \`\`\`python
            count_above([20, 150, 99.5, 300], 100)  # 2
            \`\`\`
          `,
          starter: 'def count_above(amounts, limit):\n    pass\n',
          solution: py`
            def count_above(amounts, limit):
                count = 0
                for a in amounts:
                    if a > limit:
                        count += 1
                return count
          `,
          tests: [
            { call: 'count_above([20, 150, 99.5, 300], 100)', expect: '2' },
            { call: 'count_above([], 10)', expect: '0' },
            { call: 'count_above([100, 100.01], 100)', expect: '1', hidden: true },
            { call: 'count_above([-5, -1, -3], -2)', expect: '1', hidden: true },
            { call: 'count_above([1, 2, 3], 0)', expect: '3', hidden: true },
          ],
          hints: [
            'Start a counter at 0 and loop over the amounts.',
            'Add 1 when `a > limit`, and return the counter **after** the loop.',
          ],
          wrong: [
            py`
              def count_above(amounts, limit):
                  count = 0
                  for a in amounts:
                      if a >= limit:
                          count += 1
                  return count
            `,
            py`
              def count_above(amounts, limit):
                  count = 0
                  for a in amounts:
                      if a > limit:
                          count += 1
                      return count
            `,
          ],
          explain: '"Strictly greater" means `>`, so an order of exactly 100 doesn\'t count. Boundary conditions like this are where analytics numbers silently disagree between teams. A `return` indented into the loop exits after the first item, another classic.',
        },
        {
          type: 'code',
          title: 'Average order value',
          prompt: md`
            Write \`average(values)\` that returns the mean of a list of numbers **rounded to 2 decimals**, or \`None\` for an empty list.

            \`\`\`python
            average([10, 20, 25])  # 18.33
            average([])            # None
            \`\`\`
          `,
          starter: 'def average(values):\n    pass\n',
          solution: py`
            def average(values):
                if not values:
                    return None
                return round(sum(values) / len(values), 2)
          `,
          tests: [
            { call: 'average([10, 20, 25])', expect: '18.33' },
            { call: 'average([])', expect: 'None' },
            { call: 'average([5])', expect: '5.0', hidden: true },
            { call: 'average([-1, 1])', expect: '0.0', hidden: true },
            { call: 'average([0.1, 0.2])', expect: '0.15', hidden: true },
          ],
          hints: [
            'Guard clause first: `if not values: return None`.',
            '`round(sum(values) / len(values), 2)`',
          ],
          wrong: [
            'def average(values):\n    return round(sum(values) / len(values), 2)\n',
            py`
              def average(values):
                  if not values:
                      return None
                  return sum(values) // len(values)
            `,
            py`
              def average(values):
                  if not values:
                      return None
                  return sum(values) / len(values)
            `,
          ],
          explain: 'Decide what empty input means **before** you divide. Returning `None` says "no data", which is different from an average of 0. Dashboards that show 0 for "no orders yet" mislead people. `//` would floor the result to 18.',
        },
        {
          type: 'code',
          title: 'Biggest daily jump',
          prompt: md`
            \`visits\` holds daily website visits in date order. Write \`biggest_jump(visits)\` that returns the largest **increase** from one day to the next. If visits never go up (or there are fewer than 2 days), return 0.

            \`\`\`python
            biggest_jump([100, 130, 90, 160, 150])  # 70
            biggest_jump([5, 4, 3])                 # 0
            \`\`\`
          `,
          starter: 'def biggest_jump(visits):\n    pass\n',
          solution: py`
            def biggest_jump(visits):
                best = 0
                for i in range(1, len(visits)):
                    jump = visits[i] - visits[i - 1]
                    if jump > best:
                        best = jump
                return best
          `,
          tests: [
            { call: 'biggest_jump([100, 130, 90, 160, 150])', expect: '70' },
            { call: 'biggest_jump([5, 4, 3])', expect: '0' },
            { call: 'biggest_jump([])', expect: '0', hidden: true },
            { call: 'biggest_jump([7])', expect: '0', hidden: true },
            { call: 'biggest_jump([1, 2, 4, 8])', expect: '4', hidden: true },
            { call: 'biggest_jump([10, 0, 50])', expect: '50', hidden: true },
          ],
          hints: [
            'Compare each day with the day before: loop `i` from 1 and look at `visits[i] - visits[i - 1]`.',
            'Keep the best jump so far in a variable that starts at 0.',
          ],
          wrong: [
            'def biggest_jump(visits):\n    return max(visits) - min(visits)\n',
            py`
              def biggest_jump(visits):
                  best = 0
                  for i in range(1, len(visits)):
                      jump = abs(visits[i] - visits[i - 1])
                      if jump > best:
                          best = jump
                  return best
            `,
            py`
              def biggest_jump(visits):
                  best = 0
                  for i in range(len(visits)):
                      jump = visits[i + 1] - visits[i]
                      if jump > best:
                          best = jump
                  return best
            `,
          ],
          explain: '`max - min` ignores time order: the max might come *before* the min. Starting `i` at 1 means `i - 1` is always valid, while `visits[i + 1]` runs off the end. One pass, O(n). This "consecutive pairs" loop is the core of the famous best-time-to-buy-stock question.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u05-l2',
      title: 'Modifying Lists',
      summary: 'Insert, remove and replace items, and avoid the loop-mutation trap.',
      steps: [
        {
          type: 'learn',
          title: 'Adding items',
          body: md`
            - \`lst.append(x)\`: add **one** item at the end
            - \`lst.extend(other)\`: add **each** item of another list
            - \`lst.insert(i, x)\`: put \`x\` at index \`i\`, shifting the rest right

            \`a + b\` builds a **new** list and leaves both alone, while \`a += b\` extends \`a\` in place.

            Careful: \`append\` of a list adds the whole list as a single item.
          `,
          code: py`
            a = [1, 2]
            a.append([3, 4])
            print(a, len(a))
            b = [1, 2]
            b.extend([3, 4])
            b.insert(0, 0)
            print(b)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            a = [1, 2]
            b = a + [3]
            a.append([4, 5])
            a.insert(0, 0)
            print(a, len(a))
            print(b)
          `,
          answer: '[0, 1, 2, [4, 5]] 4\n[1, 2, 3]',
          explain: '`a + [3]` made a separate new list, so later changes to `a` don\'t affect `b`. The appended `[4, 5]` counts as one item, so `len(a)` is 4.',
        },
        {
          type: 'learn',
          title: 'Removing items',
          body: md`
            - \`lst.pop()\` removes the **last** item and returns it; \`lst.pop(i)\` removes index \`i\`
            - \`lst.remove(x)\` removes the **first** item equal to \`x\` (ValueError if there is none)
            - \`del lst[i]\` or \`del lst[a:b]\` deletes by position
            - \`lst.clear()\` empties the list

            \`pop()\` from the end is fast. \`pop(0)\` and \`insert(0, x)\` have to shift every other item, so they are O(n).
          `,
          code: py`
            jobs = ["a", "b", "c", "d"]
            last = jobs.pop()
            first = jobs.pop(0)
            print(last, first, jobs)
            jobs.remove("c")
            del jobs[0]
            print(jobs)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            nums = [5, 3, 5, 1]
            nums.remove(5)
            last = nums.pop()
            print(nums, last)
            del nums[0]
            print(nums)
          `,
          answer: '[3, 5] 1\n[5]',
          explain: '`remove(5)` deletes only the **first** 5. `pop()` takes the last item (1) and returns it. `del nums[0]` then removes the 3.',
        },
        {
          type: 'choice',
          prompt: 'A first-in, first-out queue. What does this print?',
          code: py`
            q = ["a", "b", "c"]
            x = q.pop(0)
            q.insert(1, x)
            print(q)
          `,
          options: ["['b', 'a', 'c']", "['a', 'b', 'c']", "['b', 'c', 'a']", "['c', 'a', 'b']"],
          answer: 0,
          checkOutput: true,
          explain: 'After `pop(0)` the list is ["b", "c"]. Inserting at index 1 puts "a" between them.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: 'tags = ["a", "b"]\ntags.remove("z")',
          options: ['ValueError: list.remove(x): x not in list', "KeyError: 'z'", 'Nothing, the list stays the same', 'IndexError: list index out of range'],
          answer: 0,
          checkOutput: true,
          explain: '`remove` insists the item exists. Guard with `if "z" in tags:` first when it might be missing.',
        },
        {
          type: 'learn',
          title: 'Finding and replacing ranges',
          body: md`
            - \`lst.index(x)\`: position of the first \`x\` (ValueError if missing, so check \`in\` first)
            - \`lst.count(x)\`: how many times \`x\` appears

            **Slice assignment** replaces a whole range with the items of another list, which may be longer or shorter: \`lst[1:3] = ["x"]\`. Assigning \`[]\` deletes the range.
          `,
          code: py`
            tags = ["py", "sql", "py", "ml"]
            print(tags.index("sql"), tags.count("py"))
            tags[1:3] = ["go", "rust", "c"]
            print(tags)
            tags[:2] = []
            print(tags)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            tags = ["py", "sql", "py", "ml"]
            print(tags.index("py"), tags.count("py"))
            print(tags.index("ml"))
          `,
          answer: '0 2\n3',
          explain: '`index` only reports the **first** match, even though "py" appears twice.',
        },
        {
          type: 'blanks',
          prompt: 'Replace the middle three numbers with a single 0, so the program prints `[1, 0, 5]`.',
          code: py`
            nums = [1, 2, 3, 4, 5]
            nums[1:4] = ___
            print(nums)
          `,
          bank: ['[0]', '0', '[]', '[0, 0, 0]'],
          answer: ['[0]'],
          tests: [{ stdout: '[1, 0, 5]\n' }],
          explain: 'A slice is replaced by the **items** of a list, so three items become one. A bare `0` raises a TypeError (it isn\'t a list), `[]` deletes the range, and `[0, 0, 0]` keeps the length.',
        },
        {
          type: 'learn',
          title: "Don't change a list while looping over it",
          body: md`
            Removing items from the list you're looping over makes the loop **skip** elements. The loop tracks a position. When an item disappears, everything after it shifts left, and the next item slides into the slot the loop has already visited.

            Two safe options:
            - build a **new** list with the items you want to keep (usually best)
            - loop over a copy, \`for x in lst[:]:\`, and remove from the original
          `,
          code: py`
            nums = [1, 2, 2, 3]
            keep = []
            for n in nums:
                if n != 2:
                    keep.append(n)
            print(keep)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            nums = [1, 2, 2, 3]
            for n in nums:
                if n == 2:
                    nums.remove(n)
            print(nums)
          `,
          options: ['[1, 2, 3]', '[1, 3]', '[1, 2, 2, 3]', 'ValueError: list.remove(x): x not in list'],
          answer: 0,
          checkOutput: true,
          explain: 'At position 1 the loop sees the first 2 and removes it. The second 2 shifts into position 1, which the loop already visited, so it moves on to position 2 (now the 3) and skips it. No error, just a silently wrong result: the worst kind of bug.',
        },
        {
          type: 'code',
          title: 'Process a job queue',
          prompt: md`
            \`queue\` is a list of job names, oldest first. Write \`process(queue, n)\` that **removes** the first \`n\` jobs from \`queue\` (first in, first out) and returns them as a list, in the order they were removed. If there are fewer than \`n\` jobs, process all of them.

            \`\`\`python
            q = ["a", "b", "c"]
            process(q, 2)  # ["a", "b"]
            q              # ["c"]
            \`\`\`
          `,
          starter: 'def process(queue, n):\n    pass\n',
          solution: py`
            def process(queue, n):
                done = []
                while queue and len(done) < n:
                    done.append(queue.pop(0))
                return done
          `,
          tests: [
            {
              code: 'q = ["a", "b", "c"]\ndone = process(q, 2)\nassert done == ["a", "b"], done\nassert q == ["c"], q',
              name: 'returns ["a", "b"] and leaves ["c"] in the queue',
            },
            { call: 'process(["x"], 5)', expect: '["x"]' },
            { code: 'q = [1, 2]\nassert process(q, 0) == []\nassert q == [1, 2]', name: 'n = 0 processes nothing', hidden: true },
            { code: 'assert process([], 3) == []', name: 'empty queue', hidden: true },
            {
              code: 'q = ["j1", "j2", "j3", "j4"]\nassert process(q, 4) == ["j1", "j2", "j3", "j4"]\nassert q == []',
              name: 'processes everything',
              hidden: true,
            },
          ],
          hints: [
            '`queue.pop(0)` removes and returns the oldest job.',
            'Keep going while the queue isn\'t empty **and** you have processed fewer than `n` jobs.',
          ],
          wrong: [
            'def process(queue, n):\n    return queue[:n]\n',
            py`
              def process(queue, n):
                  done = []
                  while queue and len(done) < n:
                      done.append(queue.pop())
                  return done
            `,
            py`
              def process(queue, n):
                  done = []
                  for _ in range(n):
                      done.append(queue.pop(0))
                  return done
            `,
          ],
          explain: 'A slice would return the right jobs but leave them in the queue, so they\'d run twice. `pop(0)` is O(n) because every remaining item shifts left. Real queues use `collections.deque`, whose `popleft()` is O(1) (Unit 17). Queues like Kafka or SQS are first-in, first-out for the same reason: fairness.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: remove the bots',
          prompt: md`
            \`remove_bots(users)\` should return a **new** list without the usernames that end in \`"_bot"\`, leaving the input list unchanged.

            \`\`\`python
            remove_bots(["ada", "x_bot", "y_bot", "bob"])
            # ["ada", "bob"]
            \`\`\`

            It gives wrong results when two bots are next to each other, and it changes the caller's list. Fix both problems.
          `,
          starter: py`
            def remove_bots(users):
                for u in users:
                    if u.endswith("_bot"):
                        users.remove(u)
                return users
          `,
          solution: py`
            def remove_bots(users):
                humans = []
                for u in users:
                    if not u.endswith("_bot"):
                        humans.append(u)
                return humans
          `,
          tests: [
            { call: 'remove_bots(["ada", "x_bot", "y_bot", "bob"])', expect: '["ada", "bob"]' },
            { call: 'remove_bots(["a_bot", "b_bot"])', expect: '[]' },
            {
              code: 'users = ["ada", "x_bot"]\nremove_bots(users)\nassert users == ["ada", "x_bot"], users',
              name: 'does not change the input list',
            },
            { call: 'remove_bots([])', expect: '[]', hidden: true },
            { call: 'remove_bots(["bot_ada", "robot", "c_bot"])', expect: '["bot_ada", "robot"]', hidden: true },
          ],
          hints: [
            'Don\'t remove anything. Start an empty list and append the users you want to **keep**.',
            'Keep `u` when `not u.endswith("_bot")`.',
          ],
          wrong: [
            py`
              def remove_bots(users):
                  for u in users[:]:
                      if u.endswith("_bot"):
                          users.remove(u)
                  return users
            `,
            py`
              def remove_bots(users):
                  humans = []
                  for u in users:
                      if "bot" not in u:
                          humans.append(u)
                  return humans
            `,
          ],
          explain: 'Building a new list avoids the skipping bug **and** leaves the caller\'s data alone. Functions that quietly mutate their inputs cause some of the nastiest bugs in data pipelines. Looping over a copy fixes the skipping, but still changes the original. And `"bot" in u` would also drop the human "robot".',
        },
        {
          type: 'code',
          title: 'Insert into a sorted list',
          prompt: md`
            \`nums\` is sorted ascending. Write \`insert_sorted(nums, x)\` that inserts \`x\` **into** \`nums\` at the right position, so it stays sorted, and returns \`nums\`.

            Don't use \`sort\` or \`sorted\`: re-sorting a whole list to add one item is wasteful.

            \`\`\`python
            insert_sorted([1, 3, 5], 4)  # [1, 3, 4, 5]
            \`\`\`
          `,
          starter: 'def insert_sorted(nums, x):\n    pass\n',
          solution: py`
            def insert_sorted(nums, x):
                i = 0
                while i < len(nums) and nums[i] <= x:
                    i += 1
                nums.insert(i, x)
                return nums
          `,
          tests: [
            { call: 'insert_sorted([1, 3, 5], 4)', expect: '[1, 3, 4, 5]' },
            { call: 'insert_sorted([], 7)', expect: '[7]' },
            { call: 'insert_sorted([1, 2], 0)', expect: '[0, 1, 2]', hidden: true },
            { call: 'insert_sorted([1, 2], 9)', expect: '[1, 2, 9]', hidden: true },
            { call: 'insert_sorted([2, 2, 3], 2)', expect: '[2, 2, 2, 3]', hidden: true },
            {
              code: 'a = [10, 20]\ninsert_sorted(a, 15)\nassert a == [10, 15, 20], a',
              name: 'changes the list in place',
              hidden: true,
            },
          ],
          forbid: ['sort', 'sorted'],
          hints: [
            'Walk an index `i` forward while `nums[i]` is still `<= x`.',
            'Check `i < len(nums)` first, so you never index past the end. Then `nums.insert(i, x)`.',
          ],
          wrong: [
            'def insert_sorted(nums, x):\n    nums.append(x)\n    return nums\n',
            py`
              def insert_sorted(nums, x):
                  for i in range(len(nums)):
                      if nums[i] > x:
                          nums.insert(i, x)
                          return nums
                  return nums
            `,
            py`
              def insert_sorted(nums, x):
                  i = 0
                  while i < len(nums) - 1 and nums[i] <= x:
                      i += 1
                  nums.insert(i, x)
                  return nums
            `,
          ],
          explain: 'Order matters in `i < len(nums) and nums[i] <= x`: `and` stops early, so `nums[i]` is never read past the end. When `x` is the largest, the loop runs off the end and `insert` at `len(nums)` appends, the case the `for` version forgets. Finding the spot is O(n) here; binary search (the `bisect` module, Unit 17) makes it O(log n).',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u05-l3',
      title: 'Sorting',
      summary: 'sort() vs sorted(), custom keys, stability and top-N.',
      steps: [
        {
          type: 'learn',
          title: 'sort() vs sorted()',
          body: md`
            - \`lst.sort()\` sorts the list **in place** and returns \`None\`.
            - \`sorted(x)\` returns a **new** sorted list and leaves \`x\` alone. It works on any sequence, strings included.

            Both accept \`reverse=True\` for descending order. Strings sort by character codes, so every upper-case letter comes before every lower-case one.
          `,
          code: py`
            nums = [3, 1, 2]
            print(sorted(nums), nums)
            nums.sort(reverse=True)
            print(nums)
            print(sorted(["b", "a", "C"]))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            nums = [3, 1, 2]
            result = nums.sort()
            print(result, nums)
          `,
          options: ['None [1, 2, 3]', '[1, 2, 3] [1, 2, 3]', '[1, 2, 3] [3, 1, 2]', 'None [3, 1, 2]'],
          answer: 0,
          checkOutput: true,
          explain: '`sort()` changes the list and returns `None`, so `x = x.sort()` throws your list away, a very common bug. Want a sorted copy? Use `sorted()`.',
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            words = ["pear", "apple", "Fig", "Banana"]
            print(sorted(words))
            print(sorted(words, reverse=True)[0])
          `,
          answer: "['Banana', 'Fig', 'apple', 'pear']\npear",
          explain: '"B" and "F" are upper-case, and upper-case letters (codes 65–90) sort before lower-case ones (97–122). Descending, "pear" comes first.',
        },
        {
          type: 'learn',
          title: 'Sort by anything with key=',
          body: md`
            \`key=\` takes a **function**. Python calls it on every item and sorts by the results:

            - \`key=len\`: by length
            - \`key=str.lower\`: alphabetically, ignoring case
            - \`key=abs\`: by distance from zero

            Pass the function **without** parentheses: \`key=len\`, not \`key=len()\`. Your own functions work too, which is perfect for records like \`("ada", 36)\`. Tuples index just like lists.
          `,
          code: py`
            words = ["pear", "apple", "Fig", "Banana"]
            print(sorted(words, key=len))
            print(sorted(words, key=str.lower))

            def by_age(person):
                return person[1]

            people = [("ada", 36), ("bob", 25), ("cy", 41)]
            print(sorted(people, key=by_age))
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            temps = [-7, 3, -1, 10]
            print(sorted(temps))
            print(sorted(temps, key=abs))
          `,
          answer: '[-7, -1, 3, 10]\n[-1, 3, -7, 10]',
          explain: 'With `key=abs` the list is sorted by 7, 3, 1, 10 (the absolute values) but the original items are returned, signs included.',
        },
        {
          type: 'blanks',
          prompt: 'Sort the names alphabetically, ignoring case, so the program prints `[\'Ada\', \'bob\', \'cy\']`.',
          code: py`
            names = ["bob", "Ada", "cy"]
            print(sorted(names, key=___))
          `,
          bank: ['str.lower', 'len', 'str.lower()', 'abs', 'lower'],
          answer: ['str.lower'],
          tests: [{ stdout: "['Ada', 'bob', 'cy']\n" }],
          explain: '`str.lower` is the function itself; Python calls it as `str.lower("Ada")` for each name. `str.lower()` calls it immediately with nothing (TypeError), and plain `lower` isn\'t a defined name.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            words = ["kiwi", "fig"]
            print(sorted(words, key=len()))
          `,
          options: ['TypeError: len() takes exactly one argument (0 given)', "['fig', 'kiwi']", "['kiwi', 'fig']", 'SyntaxError: invalid syntax'],
          answer: 0,
          checkOutput: true,
          explain: '`len()` with parentheses calls `len` right now, with no argument, before `sorted` even starts. `key` needs the function itself: `key=len`.',
        },
        {
          type: 'learn',
          title: 'Stable sorts, min/max with key, top-N',
          body: md`
            Python's sort is **stable**: items with equal keys keep their original order, even with \`reverse=True\`. That gives you multi-level sorting: sort by the **secondary** key first, then by the primary key.

            \`min\` and \`max\` accept \`key=\` too and return the **item**, not the key value. On ties they return the first one.

            Top N: sort descending, then slice: \`sorted(xs, reverse=True)[:n]\`.
          `,
          code: py`
            def by_len(w):
                return len(w)

            words = ["cc", "a", "bb", "d"]
            print(sorted(words, key=by_len))
            print(sorted(sorted(words), key=by_len))
            print(max(words, key=by_len))
            print(sorted([5, 9, 1, 7], reverse=True)[:2])
          `,
        },
        {
          type: 'output',
          prompt: 'Tricky! What does this print?',
          code: py`
            def by_len(w):
                return len(w)

            words = ["bb", "a", "cc", "d"]
            print(sorted(words, key=by_len, reverse=True))
          `,
          answer: "['bb', 'cc', 'a', 'd']",
          explain: '`reverse=True` reverses the **comparison**, not the finished list, so ties keep their original order: "bb" before "cc", "a" before "d". Reversing the result of an ascending sort would give `[\'cc\', \'bb\', \'d\', \'a\']` instead.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            orders = [("A", 30), ("B", 75), ("C", 75)]

            def amount(order):
                return order[1]

            print(max(orders, key=amount))
          `,
          options: ["('B', 75)", "('C', 75)", '75', 'B'],
          answer: 0,
          checkOutput: true,
          explain: '`max` returns the whole item, not its key, and on a tie it keeps the **first** one it met.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: median',
          prompt: md`
            \`median(values)\` should return the middle value of a non-empty list; for an even count, the average of the two middle values. It must **not** reorder the caller's list.

            \`\`\`python
            median([5, 1, 3])     # 3
            median([4, 1, 3, 2])  # 2.5
            \`\`\`

            It crashes. Fix it.
          `,
          starter: py`
            def median(values):
                ordered = values.sort()
                mid = len(ordered) // 2
                if len(ordered) % 2 == 1:
                    return ordered[mid]
                return (ordered[mid - 1] + ordered[mid]) / 2
          `,
          solution: py`
            def median(values):
                ordered = sorted(values)
                mid = len(ordered) // 2
                if len(ordered) % 2 == 1:
                    return ordered[mid]
                return (ordered[mid - 1] + ordered[mid]) / 2
          `,
          tests: [
            { call: 'median([5, 1, 3])', expect: '3' },
            { call: 'median([4, 1, 3, 2])', expect: '2.5' },
            { call: 'median([7])', expect: '7', hidden: true },
            { call: 'median([1, 2])', expect: '1.5', hidden: true },
            { call: 'median([-5, 10, 0, 3, 3])', expect: '3', hidden: true },
            { code: 'v = [3, 1, 2]\nmedian(v)\nassert v == [3, 1, 2], v', name: 'does not reorder the input', hidden: true },
          ],
          hints: [
            'What does `values.sort()` return? Print `ordered` to see.',
            'Use `sorted(values)`: it returns a new sorted list and leaves `values` alone.',
          ],
          wrong: [
            py`
              def median(values):
                  values.sort()
                  mid = len(values) // 2
                  if len(values) % 2 == 1:
                      return values[mid]
                  return (values[mid - 1] + values[mid]) / 2
            `,
            py`
              def median(values):
                  ordered = values
                  mid = len(ordered) // 2
                  if len(ordered) % 2 == 1:
                      return ordered[mid]
                  return (ordered[mid - 1] + ordered[mid]) / 2
            `,
          ],
          explain: '`sort()` returns `None`, so `len(None)` crashed. Calling `values.sort()` on its own would compute the right median but reorder the caller\'s data as a side effect. The median beats the mean for skewed data like salaries or response times, because one huge outlier barely moves it.',
        },
        {
          type: 'code',
          title: 'Top N scores',
          prompt: md`
            Write \`top_n(scores, n)\` that returns the \`n\` highest scores, **highest first**, without changing \`scores\`. If there are fewer than \`n\` scores, return all of them, sorted.

            \`\`\`python
            top_n([70, 95, 88, 60], 2)  # [95, 88]
            \`\`\`
          `,
          starter: 'def top_n(scores, n):\n    pass\n',
          solution: py`
            def top_n(scores, n):
                return sorted(scores, reverse=True)[:n]
          `,
          tests: [
            { call: 'top_n([70, 95, 88, 60], 2)', expect: '[95, 88]' },
            { call: 'top_n([1, 2], 5)', expect: '[2, 1]' },
            { call: 'top_n([], 3)', expect: '[]', hidden: true },
            { call: 'top_n([5, 5, 4], 2)', expect: '[5, 5]', hidden: true },
            { call: 'top_n([3, 1, 2], 0)', expect: '[]', hidden: true },
            { code: 's = [3, 9, 1]\ntop_n(s, 2)\nassert s == [3, 9, 1], s', name: 'does not change scores', hidden: true },
          ],
          hints: [
            'Sort descending with `sorted(..., reverse=True)`.',
            'Then slice the first `n` items. Slices never fail, even if `n` is too big.',
          ],
          wrong: [
            'def top_n(scores, n):\n    return sorted(scores)[-n:]\n',
            'def top_n(scores, n):\n    scores.sort(reverse=True)\n    return scores[:n]\n',
          ],
          explain: '`sorted(scores)[-n:]` returns the right items in ascending order, and with `n = 0` it returns everything, because `-0` is just 0. Sorting is O(n log n). For the top 10 of a billion rows you\'d use a heap, `heapq.nlargest`, in O(n log k) (Unit 17), which is what `ORDER BY … LIMIT` does in a database.',
        },
        {
          type: 'code',
          title: 'Product ranking',
          prompt: md`
            \`products\` is a list of \`(name, revenue)\` tuples. Write \`ranking(products)\` that returns the product **names**, highest revenue first. Products with equal revenue are listed **alphabetically**.

            \`\`\`python
            ranking([("mug", 50), ("pen", 90), ("cap", 50)])
            # ["pen", "cap", "mug"]
            \`\`\`
          `,
          starter: 'def ranking(products):\n    pass\n',
          solution: py`
            def name(p):
                return p[0]

            def revenue(p):
                return p[1]

            def ranking(products):
                by_name = sorted(products, key=name)
                ranked = sorted(by_name, key=revenue,
                                reverse=True)
                names = []
                for p in ranked:
                    names.append(p[0])
                return names
          `,
          tests: [
            { call: 'ranking([("mug", 50), ("pen", 90), ("cap", 50)])', expect: '["pen", "cap", "mug"]' },
            { call: 'ranking([])', expect: '[]' },
            { call: 'ranking([("b", 1), ("a", 1), ("c", 1)])', expect: '["a", "b", "c"]', hidden: true },
            { call: 'ranking([("x", 5), ("y", 10)])', expect: '["y", "x"]', hidden: true },
            { call: 'ranking([("tea", 3), ("cup", 7), ("ink", 3), ("box", 7), ("art", 1)])', hidden: true },
          ],
          hints: [
            'Write two tiny key functions: one returns `p[0]`, the other `p[1]`.',
            'Stability: sort by **name** first, then by revenue with `reverse=True`. The ties keep their alphabetical order.',
            'Finally collect `p[0]` from each sorted tuple.',
          ],
          wrong: [
            py`
              def revenue(p):
                  return p[1]

              def ranking(products):
                  names = []
                  for p in sorted(products, key=revenue, reverse=True):
                      names.append(p[0])
                  return names
            `,
            py`
              def name(p):
                  return p[0]

              def revenue(p):
                  return p[1]

              def ranking(products):
                  ordered = sorted(products, key=revenue, reverse=True)
                  ordered = sorted(ordered, key=name)
                  names = []
                  for p in ordered:
                      names.append(p[0])
                  return names
            `,
          ],
          explain: 'Sort by the **least** important key first, and the most important last: the final sort decides the main order, and stability preserves the earlier one inside ties. In the other order the name sort wipes out the revenue order. This is SQL\'s `ORDER BY revenue DESC, name`. In Unit 7 you\'ll do it in one call with a lambda returning `(-revenue, name)`.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u05-l4',
      title: 'enumerate, zip & Unpacking',
      summary: 'Loop with indexes, walk lists in parallel, and use tuples as records.',
      steps: [
        {
          type: 'learn',
          title: 'enumerate: index and item together',
          body: md`
            When you need the position **and** the item, skip \`range(len(lst))\`. \`enumerate(lst)\` produces \`(index, item)\` pairs that you unpack right in the \`for\`:

            \`for i, item in enumerate(lst):\`

            \`enumerate(lst, start=1)\` counts from 1, perfect for rankings and line numbers. Wrap it in \`list()\` to see all the pairs at once.
          `,
          code: py`
            for i, c in enumerate(["DE", "US", "FR"]):
                print(i, c)
            names = ["ada", "bob"]
            for rank, name in enumerate(names, start=1):
                print(f"{rank}. {name}")
            print(list(enumerate("ab")))
          `,
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            for i, ch in enumerate("abc", start=1):
                print(i * ch)
          `,
          answer: 'a\nbb\nccc',
          explain: 'With `start=1` the indexes are 1, 2, 3, and a number times a string repeats it.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: 'print(list(enumerate(["x", "y"])))',
          options: ["[(0, 'x'), (1, 'y')]", "[(1, 'x'), (2, 'y')]", '[0, 1]', "['x', 'y']"],
          answer: 0,
          checkOutput: true,
          explain: 'Each element is a tuple `(index, item)`, counting from 0 unless you pass `start`.',
        },
        {
          type: 'learn',
          title: 'zip: walk lists side by side',
          body: md`
            \`zip(a, b)\` pairs up the items at the same position: 1st with 1st, 2nd with 2nd, and so on. It's the clean way to loop over **parallel lists**, like names and scores that belong together.

            \`zip\` stops at the **shortest** input, silently. Check the lengths when a mismatch would be a bug. It also accepts three or more inputs.
          `,
          code: py`
            names = ["ada", "bob", "cy"]
            scores = [90, 72, 85]
            for name, score in zip(names, scores):
                print(name, score)
            print(list(zip([1, 2, 3], "ab")))
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            days = ["Mon", "Tue", "Wed"]
            sales = [120, 80]
            for d, s in zip(days, sales):
                print(d, s * 2)
          `,
          answer: 'Mon 240\nTue 160',
          explain: '`sales` has only two items, so `zip` stops after two pairs and "Wed" is silently dropped. Silent truncation is why you should check lengths on real data.',
        },
        {
          type: 'blanks',
          prompt: 'Compute the basket total from the parallel lists, so the program prints `18.5`.',
          code: py`
            qty = [2, 1, 5]
            price = [3.0, 10.0, 0.5]
            total = 0
            for q, p in ___(qty, price):
                total += q ___ p
            print(total)
          `,
          bank: ['zip', '*', 'enumerate', '+', 'range'],
          answer: ['zip', '*'],
          tests: [{ stdout: '18.5\n' }],
          explain: '`zip` pairs each quantity with its price: 2×3 + 1×10 + 5×0.5 = 18.5. This multiply-and-add over two lists is a **dot product**, which numpy does in one call (Unit 11).',
        },
        {
          type: 'code',
          title: 'Day-over-day change',
          prompt: md`
            Write \`changes(values)\` that returns a list of the differences between each value and the one **before** it.

            \`\`\`python
            changes([100, 130, 90])  # [30, -40]
            changes([5])             # []
            \`\`\`

            Tip: \`zip(values, values[1:])\` pairs each value with the next one.
          `,
          starter: 'def changes(values):\n    pass\n',
          solution: py`
            def changes(values):
                diffs = []
                for prev, cur in zip(values, values[1:]):
                    diffs.append(cur - prev)
                return diffs
          `,
          tests: [
            { call: 'changes([100, 130, 90])', expect: '[30, -40]' },
            { call: 'changes([5])', expect: '[]' },
            { call: 'changes([])', expect: '[]', hidden: true },
            { call: 'changes([1.5, 1.0, 2.5])', expect: '[-0.5, 1.5]', hidden: true },
            { call: 'changes([3, 3, 3])', expect: '[0, 0]', hidden: true },
          ],
          hints: [
            '`values[1:]` is the list shifted by one, so `zip` gives you `(previous, current)` pairs.',
            'Append `cur - prev` for each pair.',
          ],
          wrong: [
            py`
              def changes(values):
                  diffs = []
                  for prev, cur in zip(values, values[1:]):
                      diffs.append(prev - cur)
                  return diffs
            `,
            py`
              def changes(values):
                  diffs = []
                  for i in range(len(values)):
                      diffs.append(values[i + 1] - values[i])
                  return diffs
            `,
          ],
          explain: '`zip(values, values[1:])` is the "pairwise" idiom: because `zip` stops at the shorter input, you get exactly `len(values) - 1` pairs and never an IndexError. pandas calls this `.diff()` (Unit 12).',
        },
        {
          type: 'learn',
          title: 'Unpacking, with a star',
          body: md`
            Unpacking assigns the items of any sequence to names: \`a, b = [1, 2]\`. The counts must match, or Python raises a ValueError.

            A **starred** name collects "everything else" into a list:
            - \`first, *rest = items\`
            - \`*init, last = items\`
            - \`head, *middle, tail = items\`

            Unpacking also works in \`for\` loops, even nested: \`for i, (name, age) in enumerate(people):\`.
          `,
          code: py`
            first, *rest = [10, 20, 30, 40]
            print(first, rest)
            y, *middle, d = "2025-11-12".split("-")
            print(y, middle, d)
            people = [("ada", 36), ("bob", 25)]
            for i, (name, age) in enumerate(people):
                print(i, name, age)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            first, *rest = [10, 20, 30, 40]
            *init, last = rest
            print(first, rest)
            print(init, last)
          `,
          answer: '10 [20, 30, 40]\n[20, 30] 40',
          explain: 'The starred name always becomes a **list**, possibly an empty one. `rest` is `[20, 30, 40]`; splitting it again puts everything but the last item into `init`.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: 'a, b = [1, 2, 3]',
          options: ['ValueError: too many values to unpack (expected 2, got 3)', 'a = 1, b = [2, 3]', 'a = 1, b = 2, and 3 is dropped', 'TypeError: cannot unpack list'],
          answer: 0,
          checkOutput: true,
          explain: 'Plain unpacking demands an exact match. Use a star (`a, *b = ...`) if you want "the rest".',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: first and last name',
          prompt: md`
            \`split_name(full)\` should return a tuple \`(first, last)\`. Middle names are ignored, and extra spaces must not matter.

            \`\`\`python
            split_name("Ada Lovelace")       # ("Ada", "Lovelace")
            split_name("Ada King Lovelace")  # ("Ada", "Lovelace")
            \`\`\`

            It crashes on middle names. Fix it with starred unpacking.
          `,
          starter: py`
            def split_name(full):
                first, last = full.split()
                return first, last
          `,
          solution: py`
            def split_name(full):
                first, *middle, last = full.split()
                return first, last
          `,
          tests: [
            { call: 'split_name("Ada Lovelace")', expect: '("Ada", "Lovelace")' },
            { call: 'split_name("Ada King Lovelace")', expect: '("Ada", "Lovelace")' },
            { call: 'split_name("  Grace  Brewster Murray Hopper ")', expect: '("Grace", "Hopper")', hidden: true },
            { call: 'split_name("Alan Turing")', expect: '("Alan", "Turing")', hidden: true },
          ],
          hints: [
            'Unpack as `first, *middle, last`.',
            'Keep `split()` without an argument, so runs of spaces are ignored.',
          ],
          wrong: [
            py`
              def split_name(full):
                  parts = full.split()
                  return parts[0], parts[1]
            `,
            py`
              def split_name(full):
                  first, *middle, last = full.split(" ")
                  return first, last
            `,
          ],
          explain: '`*middle` soaks up zero or more middle names, so two-part and four-part names both work. `split(" ")` would produce empty strings for the extra spaces. (`parts[0], parts[-1]` is a fine alternative.) Real names are messier still: single names, suffixes, particles like "van". Never assume a format in production data without checking it.',
        },
        {
          type: 'learn',
          title: 'Tuples: fixed records',
          body: md`
            A **tuple** is like a list in parentheses, \`("ada", 36)\`, but **immutable**: no append, no item assignment. Use a tuple for a fixed record whose positions mean something (name, age), and a list for a growing collection of similar items.

            It's the **comma** that makes a tuple, not the parentheses: \`return a, b\` returns one, and a single-item tuple is \`(5,)\`. Because they never change, tuples can be dictionary keys (Unit 6).
          `,
          code: py`
            user = ("ada", 36, "DE")
            name, age, country = user
            print(name, user[1], len(user))
            print(type((5)), type((5,)))
            point = 3, 4
            print(point)
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            point = (3, 4)
            point[0] = 5
            print(point)
          `,
          options: ["TypeError: 'tuple' object does not support item assignment", '(5, 4)', '(3, 4)', 'IndexError: tuple index out of range'],
          answer: 0,
          checkOutput: true,
          explain: 'Tuples are read-only. To "change" one, build a new tuple: `point = (5, point[1])`.',
        },
        {
          type: 'code',
          title: 'Leaderboard',
          prompt: md`
            \`names\` and \`points\` are parallel lists. Write \`leaderboard(names, points)\` that returns one line per player, ranked by points (highest first), in the form \`"1. ada (90)"\`. Players with equal points keep their **original order**.

            \`\`\`python
            leaderboard(["bob", "ada", "cy"], [72, 90, 72])
            # ["1. ada (90)", "2. bob (72)", "3. cy (72)"]
            \`\`\`
          `,
          starter: 'def leaderboard(names, points):\n    pass\n',
          solution: py`
            def by_points(pair):
                return pair[1]

            def leaderboard(names, points):
                pairs = list(zip(names, points))
                ranked = sorted(pairs, key=by_points,
                                reverse=True)
                lines = []
                for i, (name, pts) in enumerate(ranked, start=1):
                    lines.append(f"{i}. {name} ({pts})")
                return lines
          `,
          tests: [
            { call: 'leaderboard(["bob", "ada", "cy"], [72, 90, 72])', expect: '["1. ada (90)", "2. bob (72)", "3. cy (72)"]' },
            { call: 'leaderboard([], [])', expect: '[]' },
            { call: 'leaderboard(["solo"], [0])', expect: '["1. solo (0)"]', hidden: true },
            { call: 'leaderboard(["a", "b", "c", "d"], [5, 9, 5, 9])', expect: '["1. b (9)", "2. d (9)", "3. a (5)", "4. c (5)"]', hidden: true },
            { call: 'leaderboard(["x", "y", "z"], [1, 2, 3])', hidden: true },
          ],
          hints: [
            '`zip(names, points)` keeps each name glued to its points.',
            'Sort the pairs with a key function returning `pair[1]` and `reverse=True`. Stability keeps the ties in order.',
            '`enumerate(ranked, start=1)` gives the rank; unpack `rank, (name, pts)`.',
          ],
          wrong: [
            py`
              def leaderboard(names, points):
                  lines = []
                  ranked = sorted(points, reverse=True)
                  pairs = zip(names, ranked)
                  for i, (name, pts) in enumerate(pairs, start=1):
                      lines.append(f"{i}. {name} ({pts})")
                  return lines
            `,
            py`
              def by_points(pair):
                  return pair[1]

              def leaderboard(names, points):
                  pairs = list(zip(names, points))
                  ranked = sorted(pairs, key=by_points, reverse=True)
                  lines = []
                  for rank, (name, pts) in enumerate(ranked):
                      lines.append(f"{rank}. {name} ({pts})")
                  return lines
            `,
            py`
              def by_points(pair):
                  return pair[1]

              def leaderboard(names, points):
                  pairs = list(zip(names, points))
                  ranked = sorted(pairs, key=by_points)[::-1]
                  lines = []
                  for i, (name, pts) in enumerate(ranked, start=1):
                      lines.append(f"{i}. {name} ({pts})")
                  return lines
            `,
          ],
          explain: 'Sorting `points` on its own breaks the link between names and scores. Zip first, then sort the pairs, so each record moves as one unit. Reversing an ascending sort also flips the ties. Keeping fields of a record together is exactly why tables have rows; parallel lists are fragile.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u05-l5',
      title: 'Nested Lists & Aliasing',
      summary: 'Grids of data, and why two names can share one list.',
      steps: [
        {
          type: 'learn',
          title: 'Lists inside lists',
          body: md`
            A list can hold other lists. A **matrix** (a grid, or a table of rows) is a list of rows: \`m[r]\` is a row and \`m[r][c]\` one cell.

            - number of rows: \`len(m)\`
            - number of columns: \`len(m[0])\`

            Walk rows and then cells with a nested loop. A **transpose** swaps rows and columns: column \`c\` of \`m\` becomes row \`c\` of the result.
          `,
          code: py`
            m = [[1, 2, 3],
                 [4, 5, 6]]
            print(m[1][0], m[0][-1])
            print(len(m), len(m[0]))
            for row in m:
                total = 0
                for x in row:
                    total += x
                print(total)
          `,
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            grid = [["a", "b"], ["c", "d"], ["e", "f"]]
            print(grid[2][1] + grid[0][0])
            print(len(grid), len(grid[0]))
            print(grid[1])
          `,
          answer: "fa\n3 2\n['c', 'd']",
          explain: 'The first index picks the row, the second the column. There are 3 rows of 2 columns, and `grid[1]` is a whole row.',
        },
        {
          type: 'code',
          title: 'Transpose',
          prompt: md`
            Write \`transpose(m)\` that returns a **new** matrix whose row \`c\` is column \`c\` of \`m\`. \`m\` is rectangular (every row has the same length) and may be empty.

            \`\`\`python
            transpose([[1, 2, 3],
                       [4, 5, 6]])
            # [[1, 4], [2, 5], [3, 6]]
            \`\`\`
          `,
          starter: 'def transpose(m):\n    pass\n',
          solution: py`
            def transpose(m):
                if not m:
                    return []
                result = []
                for c in range(len(m[0])):
                    new_row = []
                    for row in m:
                        new_row.append(row[c])
                    result.append(new_row)
                return result
          `,
          tests: [
            { call: 'transpose([[1, 2, 3], [4, 5, 6]])', expect: '[[1, 4], [2, 5], [3, 6]]' },
            { call: 'transpose([])', expect: '[]' },
            { call: 'transpose([[1]])', expect: '[[1]]', hidden: true },
            { call: 'transpose([[1, 2]])', expect: '[[1], [2]]', hidden: true },
            { call: 'transpose([[1, 2, 3], [4, 5, 6], [7, 8, 9]])', expect: '[[1, 4, 7], [2, 5, 8], [3, 6, 9]]', hidden: true },
          ],
          hints: [
            'The outer loop runs over the **column** numbers: `range(len(m[0]))`.',
            'For each column `c`, collect `row[c]` from every row into a new row.',
            'Handle the empty matrix first: `m[0]` doesn\'t exist there.',
          ],
          wrong: [
            py`
              def transpose(m):
                  result = []
                  for row in m:
                      new_row = []
                      for x in row:
                          new_row.append(x)
                      result.append(new_row)
                  return result
            `,
            py`
              def transpose(m):
                  result = []
                  for c in range(len(m[0])):
                      new_row = []
                      for row in m:
                          new_row.append(row[c])
                      result.append(new_row)
                  return result
            `,
          ],
          explain: 'Swapping which index the outer loop runs over is the whole trick. Transposing turns "one row per user" into "one row per metric", and you\'ll do it constantly: `zip(*m)` in Unit 7, `.T` in numpy and pandas.',
        },
        {
          type: 'learn',
          title: 'Two names, one list',
          body: md`
            Assignment never copies. After \`b = a\`, both names point to the **same** list, so a change made through \`b\` shows up through \`a\`. Reassigning (\`b = [9]\`) just points \`b\` somewhere else.

            - \`a == b\`: same **contents**?
            - \`a is b\`: the very **same object**?
            - \`x is None\`: the standard test for \`None\` (there is only one \`None\` object)

            Passing a list to a function works the same way: the function gets the caller's list, not a copy.

            > Interview trap: a default like \`def f(x, bag=[])\` is created **once**, so every call shares the same list. Use \`bag=None\` and create the list inside.
          `,
          code: py`
            a = [1, 2]
            b = a
            b.append(3)
            print(a, a is b)
            c = [1, 2, 3]
            print(a == c, a is c)
          `,
        },
        {
          type: 'output',
          prompt: 'Careful! What does this print?',
          code: py`
            a = [1, 2]
            b = a
            b.append(3)
            b = [9]
            print(a, b)
          `,
          answer: '[1, 2, 3] [9]',
          explain: '`append` changed the one shared list. `b = [9]` doesn\'t change any list: it just points `b` at a new one, and `a` keeps the old list.',
        },
        {
          type: 'choice',
          prompt: 'The classic interview trap. What does this print?',
          code: py`
            def add(x, bag=[]):
                bag.append(x)
                return bag

            add(1)
            print(add(2))
          `,
          options: ['[1, 2]', '[2]', '[1]', '[]'],
          answer: 0,
          checkOutput: true,
          explain: 'The default list is created once, when `def` runs, and then reused by every call that doesn\'t pass `bag`. The fix: `def add(x, bag=None):` and inside `if bag is None: bag = []`.',
        },
        {
          type: 'learn',
          title: 'Copies: shallow and deep',
          body: md`
            To get an independent list, copy it: \`a.copy()\`, \`a[:]\` or \`list(a)\`.

            These are **shallow** copies: a new outer list holding the **same** items. For a list of lists, the inner lists are still shared. \`copy.deepcopy(a)\` copies all the way down.
          `,
          code: py`
            import copy
            a = [[1, 2], [3]]
            shallow = a.copy()
            deep = copy.deepcopy(a)
            a[0].append(99)
            print(shallow)
            print(deep)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            a = [[1], [2]]
            b = a.copy()
            b[0].append(9)
            b.append([3])
            print(a)
            print(len(b))
          `,
          answer: '[[1, 9], [2]]\n3',
          explain: '`b` is a new outer list, so appending `[3]` to it doesn\'t touch `a`. But `b[0]` **is** `a[0]`, the same inner list, so the 9 shows up in `a` too.',
        },
        {
          type: 'blanks',
          prompt: 'Save a snapshot of the board that later moves can\'t change, so the program prints `[\'x\', \' \']`.',
          code: py`
            import copy
            board = [["x", " "], [" ", "o"]]
            saved = copy.___(board)
            board[0][1] = "x"
            print(saved[0])
          `,
          bank: ['deepcopy', 'copy', 'clone', 'list'],
          answer: ['deepcopy'],
          tests: [{ stdout: "['x', ' ']\n" }],
          explain: '`copy.copy` is a shallow copy: the rows would still be shared, so the move would appear in the snapshot. Only `deepcopy` copies the inner rows too.',
        },
        {
          type: 'learn',
          title: 'The [[0] * 3] * 3 bug',
          body: md`
            \`[0] * 3\` is fine: \`[0, 0, 0]\`. Numbers can't be changed in place, so sharing them is harmless.

            But \`[[0] * 3] * 3\` repeats a **reference to one row** three times. Change one cell and the whole column changes, because there is really only one row.

            Build each row separately in a loop instead (Unit 7 shows a one-line version).
          `,
          code: py`
            bad = [[0] * 3] * 3
            bad[0][0] = 1
            print(bad)

            good = []
            for _ in range(3):
                good.append([0] * 3)
            good[0][0] = 1
            print(good)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            grid = [[0] * 2] * 2
            grid[1][0] = 5
            print(grid, grid[0] is grid[1])
          `,
          options: ['[[5, 0], [5, 0]] True', '[[0, 0], [5, 0]] False', '[[0, 0], [5, 0]] True', '[[5, 0], [5, 0]] False'],
          answer: 0,
          checkOutput: true,
          explain: 'Both rows are the same list object (`is` is True), so writing to "row 1" also writes to "row 0".',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: game board',
          prompt: md`
            \`make_grid(rows, cols, fill)\` should return a \`rows\` × \`cols\` grid where every cell is \`fill\` and every row is an **independent** list. Players report that placing a piece in one row puts it in every row. Fix it.

            \`\`\`python
            make_grid(2, 3, 0)  # [[0, 0, 0], [0, 0, 0]]
            \`\`\`
          `,
          starter: py`
            def make_grid(rows, cols, fill):
                return [[fill] * cols] * rows
          `,
          solution: py`
            def make_grid(rows, cols, fill):
                grid = []
                for _ in range(rows):
                    grid.append([fill] * cols)
                return grid
          `,
          tests: [
            { call: 'make_grid(2, 3, 0)', expect: '[[0, 0, 0], [0, 0, 0]]' },
            {
              code: 'g = make_grid(3, 2, ".")\ng[0][0] = "X"\nassert g[1][0] == ".", g\nassert g[2][0] == ".", g',
              name: 'rows are independent',
            },
            { call: 'make_grid(0, 5, 0)', expect: '[]', hidden: true },
            { code: 'g = make_grid(2, 2, 0)\nassert g[0] is not g[1]', name: 'each row is its own list', hidden: true },
          ],
          hints: [
            'The outer `* rows` copies a reference to the same row object.',
            'Use a loop that creates a **fresh** `[fill] * cols` on every iteration and appends it.',
          ],
          wrong: [
            py`
              def make_grid(rows, cols, fill):
                  row = [fill] * cols
                  grid = []
                  for _ in range(rows):
                      grid.append(row)
                  return grid
            `,
          ],
          explain: 'The inner `[fill] * cols` is fine because `fill` is immutable. The bug is reusing one row object. The tempting "fix" of building `row` once outside the loop has exactly the same bug: the expression must run once **per row**.',
        },
        {
          type: 'code',
          title: 'Rotate an image',
          prompt: md`
            An image is a matrix of pixels. Write \`rotate(m)\` that returns a **new** matrix: \`m\` rotated 90° **clockwise**. Don't change \`m\`. It may be rectangular or empty.

            \`\`\`python
            rotate([[1, 2],
                    [3, 4]])
            # [[3, 1], [4, 2]]
            rotate([[1, 2, 3],
                    [4, 5, 6]])
            # [[4, 1], [5, 2], [6, 3]]
            \`\`\`
          `,
          starter: 'def rotate(m):\n    pass\n',
          solution: py`
            def rotate(m):
                if not m:
                    return []
                result = []
                for c in range(len(m[0])):
                    new_row = []
                    for r in range(len(m) - 1, -1, -1):
                        new_row.append(m[r][c])
                    result.append(new_row)
                return result
          `,
          tests: [
            { call: 'rotate([[1, 2], [3, 4]])', expect: '[[3, 1], [4, 2]]' },
            { call: 'rotate([[1, 2, 3], [4, 5, 6]])', expect: '[[4, 1], [5, 2], [6, 3]]' },
            { call: 'rotate([])', expect: '[]', hidden: true },
            { call: 'rotate([[7]])', expect: '[[7]]', hidden: true },
            { call: 'rotate([[1, 2, 3], [4, 5, 6], [7, 8, 9]])', expect: '[[7, 4, 1], [8, 5, 2], [9, 6, 3]]', hidden: true },
            { code: 'm = [[1, 2], [3, 4]]\nrotate(m)\nassert m == [[1, 2], [3, 4]], m', name: 'does not change the input', hidden: true },
          ],
          hints: [
            'Like a transpose: the new row `c` is built from column `c`.',
            'But read the column from the **bottom** row up: `range(len(m) - 1, -1, -1)`.',
          ],
          wrong: [
            py`
              def rotate(m):
                  if not m:
                      return []
                  result = []
                  for c in range(len(m[0])):
                      new_row = []
                      for r in range(len(m)):
                          new_row.append(m[r][c])
                      result.append(new_row)
                  return result
            `,
            py`
              def rotate(m):
                  if not m:
                      return []
                  result = []
                  for c in range(len(m[0]) - 1, -1, -1):
                      new_row = []
                      for r in range(len(m)):
                          new_row.append(m[r][c])
                      result.append(new_row)
                  return result
            `,
            py`
              def rotate(m):
                  if not m:
                      return []
                  m.reverse()
                  result = []
                  for c in range(len(m[0])):
                      new_row = []
                      for row in m:
                          new_row.append(row[c])
                      result.append(new_row)
                  return result
            `,
          ],
          explain: 'Clockwise rotation = transpose + read each column bottom-up (equivalently: reverse the row order, then transpose). Reading top-down gives a plain transpose; walking the columns backwards rotates counter-clockwise. Calling `m.reverse()` gives the right answer but scrambles the caller\'s image. "Rotate Image" is a well-known interview question, and numpy has it built in as `np.rot90`.',
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u05-l6',
      title: 'Practical List Processing',
      summary: 'Running totals, windows, dedupe, merging and batching.',
      steps: [
        {
          type: 'learn',
          title: 'Running totals and moving windows',
          body: md`
            A **running total** (cumulative sum) keeps adding as it goes and records the total after every item: daily revenue becomes revenue-to-date.

            A **moving average** smooths noisy data. With a window of \`k\`, the window ending at position \`i\` is \`values[i - k + 1:i + 1]\`. There are \`len(values) - k + 1\` full windows.
          `,
          code: py`
            sales = [5, 3, 8, 4]
            running = 0
            totals = []
            for s in sales:
                running += s
                totals.append(running)
            print(totals)

            window = sales[1:4]
            print(window, sum(window) / len(window))
          `,
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            v = [2, 4, 6, 8, 10]
            k = 3
            for i in range(k - 1, len(v)):
                print(v[i - k + 1:i + 1])
          `,
          answer: '[2, 4, 6]\n[4, 6, 8]\n[6, 8, 10]',
          explain: 'The first full window ends at index `k - 1` = 2. Five values with a window of 3 give 5 - 3 + 1 = 3 windows.',
        },
        {
          type: 'code',
          title: 'Running total',
          prompt: md`
            Write \`running_total(values)\` that returns a list where item \`i\` is the sum of \`values[0]\` through \`values[i]\`.

            \`\`\`python
            running_total([5, 3, 8, 4])  # [5, 8, 16, 20]
            \`\`\`
          `,
          starter: 'def running_total(values):\n    pass\n',
          solution: py`
            def running_total(values):
                totals = []
                running = 0
                for v in values:
                    running += v
                    totals.append(running)
                return totals
          `,
          tests: [
            { call: 'running_total([5, 3, 8, 4])', expect: '[5, 8, 16, 20]' },
            { call: 'running_total([])', expect: '[]' },
            { call: 'running_total([-1, 1, -1])', expect: '[-1, 0, -1]', hidden: true },
            { call: 'running_total([2.5])', expect: '[2.5]', hidden: true },
            { call: 'running_total([0, 0, 7])', expect: '[0, 0, 7]', hidden: true },
          ],
          hints: [
            'Keep one running sum outside the loop.',
            'Add the value **first**, then append the running sum.',
          ],
          wrong: [
            py`
              def running_total(values):
                  totals = []
                  running = 0
                  for v in values:
                      totals.append(running)
                      running += v
                  return totals
            `,
            py`
              def running_total(values):
                  totals = []
                  for v in values:
                      running = 0
                      running += v
                      totals.append(running)
                  return totals
            `,
          ],
          explain: 'Carrying the sum forward makes this O(n). Recomputing `sum(values[:i + 1])` for each position also works, but it\'s O(n²): 10,000 days would mean 50 million additions. Spotting "I\'m recomputing the same thing" is the key optimisation skill.',
        },
        {
          type: 'code',
          title: 'Moving average',
          prompt: md`
            Write \`moving_average(values, k)\` that returns the average of every **full** window of \`k\` consecutive values, each rounded to 2 decimals. With fewer than \`k\` values, return \`[]\`.

            \`\`\`python
            moving_average([2, 4, 6, 8, 10], 3)  # [4.0, 6.0, 8.0]
            moving_average([1, 2], 3)            # []
            \`\`\`
          `,
          starter: 'def moving_average(values, k):\n    pass\n',
          solution: py`
            def moving_average(values, k):
                result = []
                for i in range(k - 1, len(values)):
                    window = values[i - k + 1:i + 1]
                    result.append(round(sum(window) / k, 2))
                return result
          `,
          tests: [
            { call: 'moving_average([2, 4, 6, 8, 10], 3)', expect: '[4.0, 6.0, 8.0]' },
            { call: 'moving_average([1, 2], 3)', expect: '[]' },
            { call: 'moving_average([1, 2, 3], 1)', expect: '[1.0, 2.0, 3.0]', hidden: true },
            { call: 'moving_average([1, 2, 4], 2)', expect: '[1.5, 3.0]', hidden: true },
            { call: 'moving_average([1, 2, 7], 3)', expect: '[3.33]', hidden: true },
            { call: 'moving_average([10, 20, 30, 40], 4)', expect: '[25.0]', hidden: true },
          ],
          hints: [
            'The first full window ends at index `k - 1`, so loop `i` from `k - 1` to the end.',
            'The window is `values[i - k + 1:i + 1]`. Divide its sum by `k` and round.',
          ],
          wrong: [
            py`
              def moving_average(values, k):
                  result = []
                  for i in range(k, len(values)):
                      window = values[i - k + 1:i + 1]
                      result.append(round(sum(window) / k, 2))
                  return result
            `,
            py`
              def moving_average(values, k):
                  result = []
                  for i in range(len(values)):
                      window = values[max(0, i - k + 1):i + 1]
                      result.append(round(sum(window) / len(window), 2))
                  return result
            `,
          ],
          explain: 'Moving averages are everywhere: 7-day active users, stock charts, sensor smoothing. Off-by-one on the first window is the classic bug. Summing each window costs O(k), so the total is O(n·k); a sliding sum (add the new value, subtract the one leaving) makes it O(n). pandas offers both as `.rolling(k).mean()`.',
        },
        {
          type: 'learn',
          title: 'Removing duplicates, keeping order',
          body: md`
            To dedupe while keeping the **first** occurrence of each item, walk the list and keep an item only if you haven't kept it already:

            \`if x not in result: result.append(x)\`

            Correct, but \`not in\` on a list scans it every time, so this is **O(n²)**. A million user IDs means hundreds of billions of comparisons. In Unit 6 a *set* makes each check O(1); remember this exercise when you get there.
          `,
          code: py`
            ids = [3, 1, 3, 2, 1]
            result = []
            for x in ids:
                if x not in result:
                    result.append(x)
            print(result)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            events = ["view", "click", "view", "buy", "click"]
            seen = []
            for e in events:
                if e not in seen:
                    seen.append(e)
            print(seen[-1], len(seen))
          `,
          options: ['buy 3', 'click 3', 'click 5', 'buy 5'],
          answer: 0,
          checkOutput: true,
          explain: 'Only the first "view" and the first "click" are kept, so the result is ["view", "click", "buy"]. The last *new* item was "buy".',
        },
        {
          type: 'code',
          title: 'Dedupe, keep order',
          prompt: md`
            Write \`dedupe(items)\` that returns a new list without duplicates, keeping the **first** occurrence of each item in its original order. No sets or dicts yet: use a list.

            \`\`\`python
            dedupe(["b", "a", "b", "c", "a"])  # ["b", "a", "c"]
            \`\`\`
          `,
          starter: 'def dedupe(items):\n    pass\n',
          solution: py`
            def dedupe(items):
                result = []
                for x in items:
                    if x not in result:
                        result.append(x)
                return result
          `,
          tests: [
            { call: 'dedupe(["b", "a", "b", "c", "a"])', expect: '["b", "a", "c"]' },
            { call: 'dedupe([])', expect: '[]' },
            { call: 'dedupe([1, 1, 1])', expect: '[1]', hidden: true },
            { call: 'dedupe([3, 2, 1])', expect: '[3, 2, 1]', hidden: true },
            { call: 'dedupe([1, "1", 1])', expect: '[1, "1"]', hidden: true },
          ],
          forbid: ['set', 'dict', 'fromkeys'],
          hints: [
            'Start an empty `result` list.',
            'Append `x` only `if x not in result`.',
          ],
          wrong: [
            py`
              def dedupe(items):
                  result = []
                  for i in range(len(items)):
                      if items[i] not in items[i + 1:]:
                          result.append(items[i])
                  return result
            `,
            py`
              def dedupe(items):
                  result = []
                  for x in items:
                      if not result or result[-1] != x:
                          result.append(x)
                  return result
            `,
          ],
          explain: '"Not seen later" keeps the **last** occurrence instead of the first, and comparing with the previous item only removes *adjacent* duplicates. Which occurrence to keep is a real decision in data cleaning: SQL and pandas make you choose it explicitly (`keep="first"`).',
        },
        {
          type: 'learn',
          title: 'Merging two sorted lists',
          body: md`
            When two lists are **already sorted**, you can merge them in a single pass with **two pointers**: \`i\` walks \`a\` and \`j\` walks \`b\`. Repeatedly take the smaller of \`a[i]\` and \`b[j]\` and advance that pointer. When one list runs out, add the rest of the other.

            That's O(n + m) instead of O(n log n) for re-sorting. It is the heart of merge sort, and of how databases and Spark merge huge sorted files (sort-merge join).
          `,
          code: py`
            a, b = [1, 4, 9], [2, 3, 10]
            i, j = 0, 0
            out = []
            while i < len(a) and j < len(b):
                if a[i] <= b[j]:
                    out.append(a[i])
                    i += 1
                else:
                    out.append(b[j])
                    j += 1
            out.extend(a[i:])
            out.extend(b[j:])
            print(out)
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete the two-pointer merge.',
          code: py`
            def merge(a, b):
                i, j, out = 0, 0, []
                while i < len(a) and j < len(b):
                    if a[i] ___ b[j]:
                        out.append(a[i])
                        i += 1
                    else:
                        out.append(b[j])
                        j += 1
                return out + a[i:] + b[___:]
          `,
          bank: ['<=', 'j', '>=', 'i', '0', '=='],
          answer: ['<=', 'j'],
          tests: [
            { call: 'merge([1, 4, 9], [2, 3, 10])', expect: '[1, 2, 3, 4, 9, 10]' },
            { call: 'merge([], [1])', expect: '[1]' },
            { call: 'merge([5], [])', expect: '[5]' },
            { call: 'merge([1, 2], [1, 2])', expect: '[1, 1, 2, 2]' },
          ],
          explain: 'Take from `a` while its current item is the smaller (or equal) one. When the loop ends, at most one list has leftovers, and each pointer marks where its own leftovers start, so `b`\'s tail is `b[j:]`.',
        },
        {
          type: 'code',
          title: 'Merge sorted lists',
          prompt: md`
            Write \`merge_sorted(a, b)\` that merges two **ascending** lists into one ascending list, in a single pass. Don't use \`sort\` or \`sorted\`.

            \`\`\`python
            merge_sorted([1, 4, 9], [2, 3, 10])
            # [1, 2, 3, 4, 9, 10]
            \`\`\`
          `,
          starter: 'def merge_sorted(a, b):\n    pass\n',
          solution: py`
            def merge_sorted(a, b):
                i, j = 0, 0
                out = []
                while i < len(a) and j < len(b):
                    if a[i] <= b[j]:
                        out.append(a[i])
                        i += 1
                    else:
                        out.append(b[j])
                        j += 1
                return out + a[i:] + b[j:]
          `,
          tests: [
            { call: 'merge_sorted([1, 4, 9], [2, 3, 10])', expect: '[1, 2, 3, 4, 9, 10]' },
            { call: 'merge_sorted([], [])', expect: '[]' },
            { call: 'merge_sorted([1, 1], [1])', expect: '[1, 1, 1]', hidden: true },
            { call: 'merge_sorted([5, 6], [1, 2])', expect: '[1, 2, 5, 6]', hidden: true },
            { call: 'merge_sorted([-3, 0], [-5, 7, 8])', expect: '[-5, -3, 0, 7, 8]', hidden: true },
            { call: 'merge_sorted([2], [1, 3, 5, 7])', hidden: true },
          ],
          forbid: ['sort', 'sorted'],
          hints: [
            'Two indexes `i` and `j`, both starting at 0. Loop while **both** lists still have items.',
            'Append the smaller current item and advance only that index.',
            'After the loop, add the leftovers: `a[i:]` and `b[j:]`.',
          ],
          wrong: [
            py`
              def merge_sorted(a, b):
                  i, j = 0, 0
                  out = []
                  while i < len(a) and j < len(b):
                      if a[i] <= b[j]:
                          out.append(a[i])
                          i += 1
                      else:
                          out.append(b[j])
                          j += 1
                  return out
            `,
            'def merge_sorted(a, b):\n    return a + b\n',
            py`
              def merge_sorted(a, b):
                  i, j = 0, 0
                  out = []
                  while i < len(a) or j < len(b):
                      if a[i] <= b[j]:
                          out.append(a[i])
                          i += 1
                      else:
                          out.append(b[j])
                          j += 1
                  return out
            `,
          ],
          explain: 'Each step moves one pointer forward, so the loop runs at most `len(a) + len(b)` times: O(n + m). Forgetting the leftovers is the bug interviewers expect; looping with `or` runs past the end of the shorter list. The same idea merges sorted files that don\'t fit in memory (external sort).',
        },
        {
          type: 'learn',
          title: 'Batches: chunking a list',
          body: md`
            Big jobs work in **batches**: insert 1,000 rows per database call, send 100 emails per API request, read a huge file piece by piece. A batch is just a slice:

            \`\`\`python
            for start in range(0, len(items), size):
                batch = items[start:start + size]
            \`\`\`

            The \`range\` step jumps from one batch start to the next. The last batch is simply shorter, since slices never fail.
          `,
          code: py`
            items = ["a", "b", "c", "d", "e", "f", "g"]
            for start in range(0, len(items), 3):
                print(start, items[start:start + 3])
          `,
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            ids = list(range(1, 8))
            print(ids)
            print(list(range(0, len(ids), 3)))
            print(ids[6:9])
          `,
          answer: '[1, 2, 3, 4, 5, 6, 7]\n[0, 3, 6]\n[7]',
          explain: 'Seven items in batches of 3 start at 0, 3 and 6. The last slice asks for 6–8, gets only index 6, and doesn\'t complain.',
        },
        {
          type: 'code',
          title: 'Chunk into batches',
          prompt: md`
            Write \`chunk(items, size)\` that splits \`items\` into consecutive batches of \`size\` items (the last one may be smaller) and returns them as a list of lists.

            \`\`\`python
            chunk([1, 2, 3, 4, 5], 2)  # [[1, 2], [3, 4], [5]]
            \`\`\`
          `,
          starter: 'def chunk(items, size):\n    pass\n',
          solution: py`
            def chunk(items, size):
                batches = []
                for start in range(0, len(items), size):
                    batches.append(items[start:start + size])
                return batches
          `,
          tests: [
            { call: 'chunk([1, 2, 3, 4, 5], 2)', expect: '[[1, 2], [3, 4], [5]]' },
            { call: 'chunk([], 3)', expect: '[]' },
            { call: 'chunk([1, 2, 3], 3)', expect: '[[1, 2, 3]]', hidden: true },
            { call: 'chunk([1, 2, 3], 5)', expect: '[[1, 2, 3]]', hidden: true },
            { call: 'chunk(list(range(10)), 4)', expect: '[[0, 1, 2, 3], [4, 5, 6, 7], [8, 9]]', hidden: true },
          ],
          hints: [
            '`range(0, len(items), size)` gives the start of every batch.',
            'Each batch is the slice `items[start:start + size]`.',
          ],
          wrong: [
            py`
              def chunk(items, size):
                  batches = []
                  for start in range(0, len(items) - size + 1, size):
                      batches.append(items[start:start + size])
                  return batches
            `,
            py`
              def chunk(items, size):
                  batches = []
                  for start in range(0, len(items)):
                      batches.append(items[start:start + size])
                  return batches
            `,
          ],
          explain: 'Dropping the partial last batch loses data silently, the worst kind of pipeline bug. Batching amortises the per-request overhead (network round trips, transactions): 1,000 inserts in 10 batches is far faster than 1,000 single inserts.',
        },
        {
          type: 'code',
          title: 'Newsletter batches',
          prompt: md`
            You're sending a newsletter. \`user_ids\` may contain duplicates (people signed up twice), and nobody should get the email twice. Write \`make_batches(user_ids, size)\` that removes duplicates (keeping first occurrences, in order) and **then** splits the result into batches of \`size\`.

            \`\`\`python
            make_batches([7, 3, 7, 9, 3, 1], 2)
            # [[7, 3], [9, 1]]
            \`\`\`
          `,
          starter: 'def make_batches(user_ids, size):\n    pass\n',
          solution: py`
            def make_batches(user_ids, size):
                unique = []
                for u in user_ids:
                    if u not in unique:
                        unique.append(u)
                batches = []
                for start in range(0, len(unique), size):
                    batches.append(unique[start:start + size])
                return batches
          `,
          tests: [
            { call: 'make_batches([7, 3, 7, 9, 3, 1], 2)', expect: '[[7, 3], [9, 1]]' },
            { call: 'make_batches([], 10)', expect: '[]' },
            { call: 'make_batches([1, 1, 1], 2)', expect: '[[1]]', hidden: true },
            { call: 'make_batches([5, 4, 3, 2, 1], 2)', expect: '[[5, 4], [3, 2], [1]]', hidden: true },
            { call: 'make_batches([1, 2, 1, 3, 2, 4, 5], 3)', expect: '[[1, 2, 3], [4, 5]]', hidden: true },
          ],
          hints: [
            'Two steps: first dedupe into a new list, then chunk that list.',
            'You can reuse the patterns (or the functions) from the last two exercises.',
          ],
          wrong: [
            py`
              def make_batches(user_ids, size):
                  batches = []
                  for start in range(0, len(user_ids), size):
                      batch = []
                      for u in user_ids[start:start + size]:
                          if u not in batch:
                              batch.append(u)
                      batches.append(batch)
                  return batches
            `,
            py`
              def make_batches(user_ids, size):
                  batches = []
                  for start in range(0, len(user_ids), size):
                      batches.append(user_ids[start:start + size])
                  return batches
            `,
          ],
          explain: 'Order of operations matters: deduping inside each batch still emails user 7 twice, once per batch. Composing two small, tested helpers (`dedupe`, then `chunk`) is how real pipelines stay correct. With a set (Unit 6) the dedupe step becomes O(n).',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u05-exam',
    title: 'Lists & Tuples Exam',
    minutes: 25,
    intro: 'Mutation, aliasing, sorting with keys, unpacking and classic list algorithms. Read every snippet carefully: the traps are deliberate. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'output',
        prompt: 'Type both lines.',
        code: py`
          a = [1, 2, 3]
          b = a
          a = a + [4]
          b += [5]
          print(a)
          print(b)
        `,
        answer: '[1, 2, 3, 4]\n[1, 2, 3, 5]',
        explain: '`a + [4]` builds a **new** list and points `a` at it, so `b` still holds the original. `b += [5]` extends that original in place.',
      },
      {
        type: 'output',
        prompt: 'Type both lines.',
        code: py`
          words = ["kiwi", "Fig", "banana", "apple"]
          words.sort(key=len)
          print(words[0], words[-1])
          print(sorted(words)[:2])
        `,
        answer: "Fig banana\n['Fig', 'apple']",
        explain: 'By length: Fig (3), kiwi (4), apple (5), banana (6). The default sort is by character codes, and upper-case "F" comes before every lower-case letter.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          row = [0, 0]
          grid = [row, row[:]]
          grid[0][0] = 1
          grid[1][1] = 2
          print(row, grid)
        `,
        options: ['[1, 0] [[1, 0], [0, 2]]', '[1, 2] [[1, 2], [1, 2]]', '[0, 0] [[1, 0], [0, 2]]', '[1, 0] [[1, 0], [1, 2]]'],
        answer: 0,
        checkOutput: true,
        explain: '`grid[0]` **is** `row`, so writing to it changes `row`. `grid[1]` is a copy made before any change, so it only gets the 2.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          nums = [2, 4, 6, 7]
          for n in nums:
              if n % 2 == 0:
                  nums.remove(n)
          print(nums)
        `,
        options: ['[4, 7]', '[7]', '[4, 6, 7]', '[6, 7]'],
        answer: 0,
        checkOutput: true,
        explain: 'Removing 2 shifts 4 into position 0, which was already visited, so the loop next sees 6 (removes it) and then runs out of items. 4 survives untouched.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          pairs = list(zip("abc", [1, 2]))
          first, *rest = pairs
          print(len(rest), first[1])
        `,
        options: ['1 1', '2 1', '1 a', '2 a'],
        answer: 0,
        checkOutput: true,
        explain: '`zip` stops at the shorter input: `[("a", 1), ("b", 2)]`. `first` is `("a", 1)`, so `first[1]` is 1, and `rest` holds the single remaining pair.',
      },
      {
        type: 'blanks',
        prompt: 'Complete `top2(records)`, which returns the two records with the highest score, highest first.',
        code: py`
          def by_score(rec):
              return rec[1]

          def top2(records):
              ranked = ___(records, key=___, reverse=True)
              return ranked[:2]
        `,
        bank: ['sorted', 'by_score', 'records.sort', 'by_score()', 'len', 'max'],
        answer: ['sorted', 'by_score'],
        tests: [
          { call: 'top2([("a", 3), ("b", 9), ("c", 5)])', expect: '[("b", 9), ("c", 5)]' },
          { call: 'top2([("x", 1)])', expect: '[("x", 1)]' },
        ],
        explain: '`sorted` returns a new list (`records.sort` returns None), and `key` takes the function itself, not a call.',
      },
      {
        type: 'order',
        prompt: 'Arrange the lines into `count_pairs(nums, target)`, which counts the index pairs `i < j` whose values add up to `target`.',
        lines: [
          'def count_pairs(nums, target):',
          '    count = 0',
          '    for i in range(len(nums)):',
          '        for j in range(i + 1, len(nums)):',
          '            if nums[i] + nums[j] == target:',
          '                count += 1',
          '    return count',
        ],
        distractors: ['        for j in range(len(nums)):'],
        tests: [
          { call: 'count_pairs([1, 2, 3, 4], 5)', expect: '2' },
          { call: 'count_pairs([2, 2, 2], 4)', expect: '3' },
          { call: 'count_pairs([], 1)', expect: '0' },
        ],
        explain: 'Starting `j` at `i + 1` counts each pair once and never pairs an item with itself. This brute force is O(n²); in Unit 6 a dict brings it down to O(n).',
      },
      {
        type: 'code',
        title: 'Rotate right',
        prompt: md`
          Write \`rotate_right(nums, k)\` that returns a **new** list with the items shifted \`k\` places to the right; items that fall off the end wrap around to the front. \`k\` may be larger than the list, and the list may be empty.

          \`\`\`python
          rotate_right([1, 2, 3, 4, 5], 2)  # [4, 5, 1, 2, 3]
          \`\`\`
        `,
        starter: 'def rotate_right(nums, k):\n    pass\n',
        solution: py`
          def rotate_right(nums, k):
              if not nums:
                  return []
              k = k % len(nums)
              return nums[-k:] + nums[:-k]
        `,
        tests: [
          { call: 'rotate_right([1, 2, 3, 4, 5], 2)', expect: '[4, 5, 1, 2, 3]' },
          { call: 'rotate_right([1, 2], 0)', expect: '[1, 2]' },
          { call: 'rotate_right([1, 2, 3], 3)', expect: '[1, 2, 3]', hidden: true },
          { call: 'rotate_right([1, 2, 3], 4)', expect: '[3, 1, 2]', hidden: true },
          { call: 'rotate_right([], 5)', expect: '[]', hidden: true },
          { call: 'rotate_right(["a", "b", "c", "d"], 103)', expect: '["b", "c", "d", "a"]', hidden: true },
          { code: 'v = [1, 2, 3]\nrotate_right(v, 1)\nassert v == [1, 2, 3], v', name: 'does not change the input', hidden: true },
        ],
        wrong: [
          'def rotate_right(nums, k):\n    return nums[-k:] + nums[:-k]\n',
          py`
            def rotate_right(nums, k):
                k = k % len(nums)
                return nums[-k:] + nums[:-k]
          `,
          py`
            def rotate_right(nums, k):
                if not nums:
                    return []
                k = k % len(nums)
                return nums[k:] + nums[:k]
          `,
        ],
        explain: '`k % len(nums)` turns any rotation into one smaller than the list (rotating 3 items by 3 changes nothing), and it needs the empty-list guard to avoid dividing by zero. Note that `k = 0` still works: `nums[-0:]` is the whole list and `nums[:-0]` is empty.',
      },
      {
        type: 'code',
        title: 'Second largest',
        prompt: md`
          Write \`second_largest(nums)\` that returns the second-largest **distinct** value, or \`None\` if there isn't one. Do it in **one pass**, without sorting.

          \`\`\`python
          second_largest([3, 9, 5, 9])  # 5
          second_largest([4, 4])        # None
          \`\`\`
        `,
        starter: 'def second_largest(nums):\n    pass\n',
        solution: py`
          def second_largest(nums):
              first = None
              second = None
              for x in nums:
                  if first is None or x > first:
                      second = first
                      first = x
                  elif x != first:
                      if second is None or x > second:
                          second = x
              return second
        `,
        tests: [
          { call: 'second_largest([3, 9, 5, 9])', expect: '5' },
          { call: 'second_largest([4, 4])', expect: 'None' },
          { call: 'second_largest([])', expect: 'None', hidden: true },
          { call: 'second_largest([7])', expect: 'None', hidden: true },
          { call: 'second_largest([-1, -5, -3])', expect: '-3', hidden: true },
          { call: 'second_largest([1, 2, 3, 4])', expect: '3', hidden: true },
          { call: 'second_largest([10, 10, 9])', expect: '9', hidden: true },
          { call: 'second_largest([0, -1])', expect: '-1', hidden: true },
        ],
        forbid: ['sort', 'sorted'],
        wrong: [
          py`
            def second_largest(nums):
                first = None
                second = None
                for x in nums:
                    if first is None or x >= first:
                        second = first
                        first = x
                    elif second is None or x > second:
                        second = x
                return second
          `,
          py`
            def second_largest(nums):
                first = 0
                second = 0
                for x in nums:
                    if x > first:
                        second = first
                        first = x
                    elif x != first and x > second:
                        second = x
                return second
          `,
          py`
            def second_largest(nums):
                first = None
                second = None
                for x in nums:
                    if first is None or x > first:
                        first = x
                    elif x != first and (second is None or x > second):
                        second = x
                return second
          `,
        ],
        explain: 'Two trackers: when a new maximum arrives, the old maximum is **demoted** to second. Starting at 0 instead of None breaks all-negative input; `>=` lets a repeated maximum push itself into second place; and forgetting the demotion fails on any increasing list. O(n) time, O(1) space.',
      },
      {
        type: 'code',
        title: 'Merge meeting times',
        prompt: md`
          Room bookings are \`[start, end]\` pairs. Write \`merge_intervals(intervals)\` that merges all overlapping **or touching** intervals and returns them sorted by start. Don't change the input.

          \`\`\`python
          merge_intervals([[8, 10], [1, 3], [2, 6]])
          # [[1, 6], [8, 10]]
          merge_intervals([[1, 4], [4, 5]])
          # [[1, 5]]
          \`\`\`
        `,
        starter: 'def merge_intervals(intervals):\n    pass\n',
        solution: py`
          def start(iv):
              return iv[0]

          def merge_intervals(intervals):
              merged = []
              for s, e in sorted(intervals, key=start):
                  if merged and s <= merged[-1][1]:
                      if e > merged[-1][1]:
                          merged[-1][1] = e
                  else:
                      merged.append([s, e])
              return merged
        `,
        tests: [
          { call: 'merge_intervals([[8, 10], [1, 3], [2, 6]])', expect: '[[1, 6], [8, 10]]' },
          { call: 'merge_intervals([[1, 4], [4, 5]])', expect: '[[1, 5]]' },
          { call: 'merge_intervals([])', expect: '[]', hidden: true },
          { call: 'merge_intervals([[1, 10], [2, 3]])', expect: '[[1, 10]]', hidden: true },
          { call: 'merge_intervals([[5, 6], [1, 2]])', expect: '[[1, 2], [5, 6]]', hidden: true },
          { call: 'merge_intervals([[1, 2], [3, 4]])', expect: '[[1, 2], [3, 4]]', hidden: true },
          { call: 'merge_intervals([[6, 8], [1, 9], [2, 4], [4, 7], [10, 11]])', hidden: true },
          {
            code: 'iv = [[1, 3], [2, 6]]\nmerge_intervals(iv)\nassert iv == [[1, 3], [2, 6]], iv',
            name: 'does not change the input',
            hidden: true,
          },
        ],
        wrong: [
          py`
            def merge_intervals(intervals):
                merged = []
                for s, e in intervals:
                    if merged and s <= merged[-1][1]:
                        if e > merged[-1][1]:
                            merged[-1][1] = e
                    else:
                        merged.append([s, e])
                return merged
          `,
          py`
            def start(iv):
                return iv[0]

            def merge_intervals(intervals):
                merged = []
                for s, e in sorted(intervals, key=start):
                    if merged and s <= merged[-1][1]:
                        merged[-1][1] = e
                    else:
                        merged.append([s, e])
                return merged
          `,
          py`
            def start(iv):
                return iv[0]

            def merge_intervals(intervals):
                merged = []
                for iv in sorted(intervals, key=start):
                    if merged and iv[0] <= merged[-1][1]:
                        if iv[1] > merged[-1][1]:
                            merged[-1][1] = iv[1]
                    else:
                        merged.append(iv)
                return merged
          `,
        ],
        explain: 'Sort by start, then each interval either extends the last merged one or starts a new one: O(n log n) for the sort plus one pass. Two traps: an interval fully inside another must not **shrink** it (take the max end), and appending the input lists themselves means `merged[-1][1] = …` silently edits the caller\'s data. That\'s aliasing again, so append a fresh `[s, e]`.',
      },
    ],
  },
};

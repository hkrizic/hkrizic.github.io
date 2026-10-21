// Unit 17 — Data Structures & Algorithms (interview track).
import { py, md } from './helpers.js';

// ------------------------------------------------------------ shared setups
const OPS = py`
  def run_ops(cls, ops):
      obj = cls()
      out = []
      for op, *args in ops:
          out.append(getattr(obj, op)(*args))
      return out
`;

const RAND = py`
  import random

  def rand_list(n, seed, lo=-10**6, hi=10**6):
      r = random.Random(seed)
      return [r.randint(lo, hi) for _ in range(n)]
`;

const LL = py`
  class ListNode:
      def __init__(self, val=0, next=None):
          self.val = val
          self.next = next

  def build(vals):
      head = None
      for v in reversed(list(vals)):
          head = ListNode(v, head)
      return head

  def to_list(head, limit=10**6):
      out = []
      while head is not None:
          out.append(head.val)
          head = head.next
          if len(out) > limit:
              raise ValueError("the list has a cycle")
      return out

  def build_cycle(vals, pos):
      head = build(vals)
      nodes = []
      cur = head
      while cur:
          nodes.append(cur)
          cur = cur.next
      if pos >= 0:
          nodes[-1].next = nodes[pos]
      return head
`;

const TREE = py`
  from collections import deque

  class TreeNode:
      def __init__(self, val=0, left=None, right=None):
          self.val = val
          self.left = left
          self.right = right

  def build_tree(vals):
      if not vals or vals[0] is None:
          return None
      root = TreeNode(vals[0])
      q = deque([root])
      i = 1
      while q and i < len(vals):
          node = q.popleft()
          if vals[i] is not None:
              node.left = TreeNode(vals[i])
              q.append(node.left)
          i += 1
          if i < len(vals) and vals[i] is not None:
              node.right = TreeNode(vals[i])
              q.append(node.right)
          i += 1
      return root

  def inorder(root):
      out, stack, cur = [], [], root
      while stack or cur:
          while cur:
              stack.append(cur)
              cur = cur.left
          cur = stack.pop()
          out.append(cur.val)
          cur = cur.right
      return out

  def balanced_bst(lo, hi):
      if lo >= hi:
          return None
      mid = (lo + hi) // 2
      return TreeNode(mid, balanced_bst(lo, mid),
                      balanced_bst(mid + 1, hi))
`;

export default {
  id: 'u17',
  order: 17,
  track: 'interview',
  title: 'Data Structures & Algorithms',
  subtitle: 'trees, graphs, heaps, dynamic programming',
  icon: '🌳',
  color: '#10B981',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u17-l1',
      title: 'Stacks, Queues & Deques',
      summary: 'LIFO vs FIFO, collections.deque, MinStack, two-stack queues and monotonic deques.',
      steps: [
        {
          type: 'learn',
          title: 'Stack vs queue',
          body: md`
            A **stack** is LIFO (last in, first out). A Python list is a perfect stack: \`append\` and \`pop()\` work at the end in **O(1)**.

            A **queue** is FIFO (first in, first out). \`list.pop(0)\` removes the front and then shifts every other element one slot left: **O(n)**. Use \`collections.deque\` instead: \`append\`, \`appendleft\`, \`pop\` and \`popleft\` are all O(1).
          `,
          code: py`
            from collections import deque

            stack = [1, 2]
            stack.append(3)
            print(stack.pop())    # 3: last in

            q = deque([1, 2])
            q.append(3)
            print(q.popleft())    # 1: first in
            q.appendleft(0)
            print(q, q[0], q[-1])
          `,
        },
        {
          type: 'choice',
          prompt: 'A job queue holds n jobs in a Python list. What does one `jobs.pop(0)` cost?',
          options: ['O(n)', 'O(1)', 'O(log n)', 'O(n²)'],
          answer: 0,
          explain: md`
            After removing index 0, the list moves the other n − 1 pointers one slot to the left. Draining a million jobs this way is about 5·10¹¹ moves. With \`deque.popleft()\` it's a million O(1) steps.

            Interviewers watch for this: "I'll use a deque so popping from the front is O(1)" earns points.
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            from collections import deque
            d = deque()
            d.append(1)
            d.append(2)
            d.appendleft(3)
            print(d.pop(), d.popleft())
            d.extend([4, 5])
            print(list(d))
          `,
          answer: '2 3\n[1, 4, 5]',
          explain: 'The deque goes [1] → [1, 2] → [3, 1, 2]. `pop()` takes 2 from the right, `popleft()` takes 3 from the left, which leaves [1]. `extend` adds on the right.',
        },
        {
          type: 'learn',
          title: 'BFS needs a queue',
          body: md`
            **Breadth-first search** explores in rings: the start, then everything 1 step away, then 2 steps away, and so on. A FIFO queue produces exactly that order, because whatever was discovered first gets processed first.

            Swap the queue for a stack and the search dives deep down one branch instead. That's **depth-first search**.

            Mark a node as seen **when you enqueue it**, so it's never queued twice.
          `,
          code: py`
            from collections import deque

            friends = {"ana": ["bo", "cy"],
                       "bo": ["dee"],
                       "cy": ["dee", "eli"],
                       "dee": [], "eli": []}
            q = deque(["ana"])
            seen = {"ana"}
            while q:
                name = q.popleft()
                print(name, end=" ")
                for f in friends[name]:
                    if f not in seen:
                        seen.add(f)
                        q.append(f)
          `,
        },
        {
          type: 'output',
          prompt: 'Same graph, but now the container is a list used as a **stack** (`pop()` from the end). What does it print?',
          code: py`
            friends = {"ana": ["bo", "cy"],
                       "bo": ["dee"],
                       "cy": ["dee", "eli"],
                       "dee": [], "eli": []}
            todo = ["ana"]
            seen = {"ana"}
            while todo:
                name = todo.pop()
                print(name, end=" ")
                for f in friends[name]:
                    if f not in seen:
                        seen.add(f)
                        todo.append(f)
          `,
          answer: 'ana cy eli dee bo',
          explain: md`
            After \`ana\`, the stack is \`[bo, cy]\`, and \`cy\` (pushed last) comes out first. \`cy\` pushes \`dee\` and \`eli\`, \`eli\` comes out, then \`dee\`, and only then \`bo\`. A stack goes deep before it goes wide: that's DFS order.
          `,
        },
        {
          type: 'code',
          title: 'Requests in the last 3 seconds',
          prompt: md`
            Write \`recent_counts(times)\`. \`times\` is a list of request timestamps in milliseconds, **sorted ascending**. For each request, count how many requests (including itself) happened in the inclusive range \`[t - 3000, t]\`. Return the list of counts.

            \`\`\`python
            recent_counts([1, 100, 3001, 3002])
            # [1, 2, 3, 3]
            \`\`\`

            Constraints: up to 10⁵ timestamps. Aim for O(n).
          `,
          starter: 'def recent_counts(times):\n    pass\n',
          solution: py`
            from collections import deque

            def recent_counts(times):
                window = deque()
                out = []
                for t in times:
                    window.append(t)
                    while window[0] < t - 3000:
                        window.popleft()
                    out.append(len(window))
                return out
          `,
          tests: [
            { call: 'recent_counts([1, 100, 3001, 3002])', expect: '[1, 2, 3, 3]' },
            { call: 'recent_counts([1, 3001, 3002])', expect: '[1, 2, 2]', name: 'exactly 3000 ms ago still counts' },
            { call: 'recent_counts([])', expect: '[]', hidden: true },
            { call: 'recent_counts([5, 5, 5])', expect: '[1, 2, 3]', hidden: true, name: 'equal timestamps' },
            { call: 'recent_counts([0, 10000, 20000])', expect: '[1, 1, 1]', hidden: true },
            { call: 'sum(recent_counts(list(range(0, 40000, 2))))', expect: '28894250', hidden: true, maxMs: 200, name: 'fast on 20,000 requests' },
          ],
          hints: [
            'Keep the timestamps of the current window in a deque.',
            'For each new `t`: append it, then `popleft()` while the oldest is `< t - 3000`. The deque length is the count.',
          ],
          wrong: [
            py`
              def recent_counts(times):
                  out = []
                  for i, t in enumerate(times):
                      out.append(sum(1 for x in times[:i + 1]
                                     if x >= t - 3000))
                  return out
            `,
            py`
              from collections import deque

              def recent_counts(times):
                  window = deque()
                  out = []
                  for t in times:
                      window.append(t)
                      while window[0] <= t - 3000:
                          window.popleft()
                      out.append(len(window))
                  return out
            `,
          ],
          explain: md`
            **O(n) time, O(w) space** (w = requests in one window). Every timestamp enters the deque once and leaves at most once, so the inner \`while\` is O(n) in total, not per request.

            Rescanning the prefix for every request is O(n²), which is 2·10⁸ steps at n = 20,000. Because the input is sorted, \`bisect_left(times, t - 3000)\` also works in O(n log n). The deque version is the one that still works on an endless **stream** of events, which is the big-data framing interviewers like.
          `,
        },
        {
          type: 'learn',
          title: 'MinStack: remember the minimum',
          body: md`
            A classic design question: a stack with \`push\`, \`pop\`, \`top\` and \`get_min\`, **all O(1)**. Calling \`min()\` on every request is O(n).

            The trick: store each element **together with the minimum at that moment**. When you pop, the previous minimum is still stored one level down, so nothing has to be recomputed.
          `,
          code: py`
            stack = []
            for x in [5, 3, 7, 2]:
                low = min(x, stack[-1][1]) if stack else x
                stack.append((x, low))
            print(stack)
            stack.pop()
            print("min now:", stack[-1][1])
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete `push` so every entry stores `(value, minimum so far)`.',
          code: py`
            class MinStack:
                def __init__(self):
                    self.items = []

                def push(self, x):
                    low = x
                    if self.items:
                        low = ___(x, self.items[-1][___])
                    self.items.append((x, low))
          `,
          bank: ['min', 'max', '1', '0', '-1', 'sorted'],
          answer: ['min', '1'],
          tests: [
            { code: 's = MinStack()\nfor v in [4, 2, 9]:\n    s.push(v)\nassert s.items == [(4, 4), (2, 2), (9, 2)]', name: 'pushes 4, 2, 9' },
          ],
          explain: 'Index `[1]` of the top tuple is the minimum of everything below. The new minimum is the smaller of that and `x`.',
        },
        {
          type: 'code',
          title: 'MinStack',
          prompt: md`
            Implement the class \`MinStack\`:

            - \`push(x)\` puts \`x\` on top
            - \`pop()\` removes the top and **returns** it
            - \`top()\` returns the top without removing it
            - \`get_min()\` returns the smallest value in the stack

            Every method must be **O(1)**. \`pop\`, \`top\` and \`get_min\` are never called on an empty stack.

            Tests use a helper \`run_ops(cls, ops)\` that creates the object, runs the operations and collects the return values:

            \`\`\`python
            run_ops(MinStack, [("push", 3), ("push", 1),
                    ("get_min",), ("pop",), ("get_min",)])
            # [None, None, 1, 1, 3]
            \`\`\`
          `,
          setup: OPS + '\n\n' + py`
            def stress(cls, n):
                s = cls()
                total = 0
                for i in range(n):
                    s.push((i * 7919) % 100003 - 50000)
                    total += s.get_min()
                for _ in range(n // 2):
                    total += s.pop() + s.get_min()
                return total
          `,
          starter: py`
            class MinStack:
                def __init__(self):
                    pass

                def push(self, x):
                    pass

                def pop(self):
                    pass

                def top(self):
                    pass

                def get_min(self):
                    pass
          `,
          solution: py`
            class MinStack:
                def __init__(self):
                    self.items = []

                def push(self, x):
                    low = x
                    if self.items:
                        low = min(x, self.items[-1][1])
                    self.items.append((x, low))

                def pop(self):
                    return self.items.pop()[0]

                def top(self):
                    return self.items[-1][0]

                def get_min(self):
                    return self.items[-1][1]
          `,
          tests: [
            { call: 'run_ops(MinStack, [("push", 3), ("push", 1), ("get_min",), ("pop",), ("get_min",)])', expect: '[None, None, 1, 1, 3]' },
            { call: 'run_ops(MinStack, [("push", -2), ("push", 0), ("push", -3), ("get_min",), ("pop",), ("top",), ("get_min",)])', expect: '[None, None, None, -3, -3, 0, -2]' },
            { call: 'run_ops(MinStack, [("push", 1), ("push", 1), ("push", 2), ("pop",), ("pop",), ("get_min",)])', expect: '[None, None, None, 2, 1, 1]', hidden: true, name: 'duplicate minimums' },
            { call: 'run_ops(MinStack, [("push", 5), ("top",), ("get_min",), ("pop",), ("push", 7), ("get_min",)])', expect: '[None, 5, 5, 5, None, 7]', hidden: true, name: 'empty, then reuse' },
            { call: 'stress(MinStack, 20000)', expect: '-1500013244', hidden: true, maxMs: 150, name: 'O(1) per call (50,000 operations)' },
          ],
          hints: [
            'Store a tuple `(x, current_min)` for every element.',
            '`current_min = min(x, self.items[-1][1])` when the stack is not empty; then `get_min` is just `self.items[-1][1]`.',
          ],
          wrong: [
            py`
              class MinStack:
                  def __init__(self):
                      self.items = []

                  def push(self, x):
                      self.items.append(x)

                  def pop(self):
                      return self.items.pop()

                  def top(self):
                      return self.items[-1]

                  def get_min(self):
                      return min(self.items)
            `,
            py`
              class MinStack:
                  def __init__(self):
                      self.items = []
                      self.mins = []

                  def push(self, x):
                      self.items.append(x)
                      if not self.mins or x < self.mins[-1]:
                          self.mins.append(x)

                  def pop(self):
                      x = self.items.pop()
                      if x == self.mins[-1]:
                          self.mins.pop()
                      return x

                  def top(self):
                      return self.items[-1]

                  def get_min(self):
                      return self.mins[-1]
            `,
            py`
              class MinStack:
                  def __init__(self):
                      self.items = []
                      self.low = None

                  def push(self, x):
                      self.items.append(x)
                      if self.low is None or x < self.low:
                          self.low = x

                  def pop(self):
                      return self.items.pop()

                  def top(self):
                      return self.items[-1]

                  def get_min(self):
                      return self.low
            `,
          ],
          explain: md`
            **O(1) time per operation, O(n) space.** Each entry carries the minimum of itself and everything beneath it, so popping automatically "restores" the old minimum.

            The two-stack variant (a separate \`mins\` stack) also works, but it must push when \`x <= mins[-1]\`. With a strict \`<\`, a duplicate minimum gets lost on the first pop. A single \`self.low\` variable can't go back to the previous minimum at all.
          `,
        },
        {
          type: 'order',
          prompt: md`
            A queue built from two stacks: \`push\` appends to \`self.inbox\`. To pop, **if \`self.outbox\` is empty**, move every item from \`inbox\` to \`outbox\` (this reverses them, so the oldest ends on top). Then pop from \`outbox\`. Arrange the method.
          `,
          lines: [
            'def pop(self):',
            '    if not self.outbox:',
            '        while self.inbox:',
            '            self.outbox.append(self.inbox.pop())',
            '    return self.outbox.pop()',
          ],
          distractors: ['    return self.inbox.pop()', '        while self.outbox:'],
          tests: [
            { code: 'class Q:\n    pass\nq = Q()\nq.inbox = [1, 2, 3]\nq.outbox = []\nassert pop(q) == 1\nq.inbox.append(4)\nassert pop(q) == 2\nassert pop(q) == 3\nassert pop(q) == 4', name: 'FIFO order' },
          ],
          explain: 'Moving only when `outbox` is empty is the whole trick. Items already in `outbox` are older than anything in `inbox`, so they must leave first.',
        },
        {
          type: 'code',
          title: 'Queue from two stacks',
          prompt: md`
            Implement \`MyQueue\` using **two Python lists as stacks** (only \`append\`, \`pop()\`, \`[-1]\` and \`len\`; no \`deque\`, no \`pop(0)\`):

            - \`push(x)\` adds to the back
            - \`pop()\` removes and returns the front
            - \`peek()\` returns the front
            - \`empty()\` returns \`True\`/\`False\`

            Every operation must be **amortised O(1)**. \`pop\`/\`peek\` are only called on a non-empty queue. A \`run_ops(cls, ops)\` helper exists, as in the MinStack task.
          `,
          setup: OPS + '\n\n' + py`
            def qstress(cls, n):
                q = cls()
                total = 0
                for i in range(n):
                    q.push(i)
                    q.push(i * 3)
                    total += q.pop() * (i % 7) + q.peek()
                while not q.empty():
                    total += q.pop()
                return total
          `,
          starter: py`
            class MyQueue:
                def __init__(self):
                    pass

                def push(self, x):
                    pass

                def pop(self):
                    pass

                def peek(self):
                    pass

                def empty(self):
                    pass
          `,
          solution: py`
            class MyQueue:
                def __init__(self):
                    self.inbox = []
                    self.outbox = []

                def push(self, x):
                    self.inbox.append(x)

                def _fill(self):
                    if not self.outbox:
                        while self.inbox:
                            x = self.inbox.pop()
                            self.outbox.append(x)

                def pop(self):
                    self._fill()
                    return self.outbox.pop()

                def peek(self):
                    self._fill()
                    return self.outbox[-1]

                def empty(self):
                    return not self.inbox and not self.outbox
          `,
          tests: [
            { call: 'run_ops(MyQueue, [("push", 1), ("push", 2), ("peek",), ("pop",), ("empty",)])', expect: '[None, None, 1, 1, False]' },
            { call: 'run_ops(MyQueue, [("empty",), ("push", 7), ("pop",), ("empty",)])', expect: '[True, None, 7, True]' },
            { call: 'run_ops(MyQueue, [("push", 1), ("push", 2), ("pop",), ("push", 3), ("pop",), ("pop",)])', expect: '[None, None, 1, None, 2, 3]', hidden: true, name: 'push between pops' },
            { call: 'run_ops(MyQueue, [("push", 4), ("push", 5), ("peek",), ("push", 6), ("peek",), ("pop",), ("pop",), ("peek",)])', expect: '[None, None, 4, None, 4, 4, 5, 6]', hidden: true },
            { call: 'qstress(MyQueue, 5000)', expect: '87475001', hidden: true, maxMs: 120, name: 'amortised O(1) (20,000 operations)' },
          ],
          forbid: ['deque', 'insert'],
          hints: [
            '`push` always appends to `inbox`.',
            'Only when `outbox` is empty, pour all of `inbox` into it. Then the front of the queue is `outbox[-1]`.',
            '`empty()` must check both lists.',
          ],
          wrong: [
            py`
              class MyQueue:
                  def __init__(self):
                      self.a = []
                      self.b = []

                  def push(self, x):
                      self.a.append(x)

                  def pop(self):
                      while self.a:
                          self.b.append(self.a.pop())
                      x = self.b.pop()
                      while self.b:
                          self.a.append(self.b.pop())
                      return x

                  def peek(self):
                      while self.a:
                          self.b.append(self.a.pop())
                      x = self.b[-1]
                      while self.b:
                          self.a.append(self.b.pop())
                      return x

                  def empty(self):
                      return not self.a
            `,
            py`
              class MyQueue:
                  def __init__(self):
                      self.inbox = []
                      self.outbox = []

                  def push(self, x):
                      self.inbox.append(x)

                  def pop(self):
                      while self.inbox:
                          self.outbox.append(self.inbox.pop())
                      return self.outbox.pop()

                  def peek(self):
                      while self.inbox:
                          self.outbox.append(self.inbox.pop())
                      return self.outbox[-1]

                  def empty(self):
                      return not self.inbox and not self.outbox
            `,
            py`
              class MyQueue:
                  def __init__(self):
                      self.inbox = []
                      self.outbox = []

                  def push(self, x):
                      self.inbox.append(x)

                  def pop(self):
                      if not self.outbox:
                          while self.inbox:
                              self.outbox.append(self.inbox.pop())
                      return self.outbox.pop()

                  def peek(self):
                      if not self.outbox:
                          while self.inbox:
                              self.outbox.append(self.inbox.pop())
                      return self.outbox[-1]

                  def empty(self):
                      return not self.inbox
            `,
          ],
          explain: md`
            **Amortised O(1) per operation, O(n) space.** Each element is moved from \`inbox\` to \`outbox\` exactly once in its life, so n operations cost O(n) in total, even though a single \`pop\` can occasionally take O(n).

            Pouring back and forth on every call makes each operation O(n), which is 10⁸ moves for 20,000 operations. Pouring while \`outbox\` still holds older items breaks the FIFO order. "Amortised" is the word interviewers want to hear here.
          `,
        },
        {
          type: 'learn',
          title: 'Monotonic deque',
          body: md`
            **Sliding window maximum**: the max of every window of size k. Calling \`max(window)\` each time is O(n·k).

            Keep a deque of **indices** whose values **decrease** from front to back:
            1. Before adding \`i\`, pop from the back every index whose value is ≤ \`nums[i]\`. Those can never be the max again: \`nums[i]\` is at least as big and stays in the window longer.
            2. Pop the front if it has slid out (index ≤ \`i - k\`).
            3. The front is now the window's max.
          `,
          code: py`
            from collections import deque

            nums = [4, 2, 12, 3, 8]
            dq = deque()
            for i, x in enumerate(nums):
                while dq and nums[dq[-1]] <= x:
                    dq.pop()
                dq.append(i)
                print(x, [nums[j] for j in dq])
          `,
        },
        {
          type: 'choice',
          prompt: 'The monotonic-deque algorithm has a `while` loop inside a `for` loop over n elements. Why is it still O(n)?',
          options: [
            'Each index is pushed and popped once',
            'The while loop runs at most k times',
            'deque operations are O(1)',
            'The window has a fixed size',
          ],
          answer: 0,
          explain: md`
            Count the work per **element**, not per loop iteration: every index is appended once and removed at most once, so all the \`while\` iterations together add up to ≤ n. That's **amortised analysis**.

            "At most k times" would only prove O(n·k). O(1) deque operations are necessary, but on their own they don't bound how often the loop runs.
          `,
        },
        {
          type: 'code',
          title: 'Sliding window maximum',
          prompt: md`
            Write \`max_sliding_window(nums, k)\` that returns a list with the maximum of every contiguous window of size \`k\`, from left to right.

            \`\`\`python
            max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3)
            # [3, 3, 5, 5, 6, 7]
            \`\`\`

            Constraints: \`1 <= k <= len(nums) <= 10⁵\`. Must be **O(n)**: \`max()\` of every slice is too slow.
          `,
          setup: RAND + '\n\nBIG = rand_list(100000, 1)\n',
          starter: 'def max_sliding_window(nums, k):\n    pass\n',
          solution: py`
            from collections import deque

            def max_sliding_window(nums, k):
                dq = deque()  # indices, values decreasing
                out = []
                for i, x in enumerate(nums):
                    while dq and nums[dq[-1]] <= x:
                        dq.pop()
                    dq.append(i)
                    if dq[0] <= i - k:
                        dq.popleft()
                    if i >= k - 1:
                        out.append(nums[dq[0]])
                return out
          `,
          tests: [
            { call: 'max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3)', expect: '[3, 3, 5, 5, 6, 7]' },
            { call: 'max_sliding_window([9, 8, 7, 6], 2)', expect: '[9, 8, 7]', name: 'decreasing values expire' },
            { call: 'max_sliding_window([5], 1)', expect: '[5]', hidden: true },
            { call: 'max_sliding_window([2, 7, 1], 3)', expect: '[7]', hidden: true, name: 'k == len(nums)' },
            { call: 'max_sliding_window([4, 4, 4, 1], 2)', expect: '[4, 4, 4]', hidden: true, name: 'duplicates' },
            { call: 'max_sliding_window([-5, -2, -8, -1], 2)', expect: '[-2, -2, -1]', hidden: true },
            { call: 'sum(max_sliding_window(BIG, 5000))', expect: '94966187533', hidden: true, maxMs: 250, name: 'O(n) on 100,000 numbers, k = 5000' },
          ],
          hints: [
            'Store **indices** in a deque, so you can tell when the front has left the window.',
            'Pop from the back while `nums[dq[-1]] <= x`. Pop from the front if `dq[0] <= i - k`.',
            'Once `i >= k - 1`, the answer for this window is `nums[dq[0]]`.',
          ],
          wrong: [
            py`
              def max_sliding_window(nums, k):
                  return [max(nums[i:i + k])
                          for i in range(len(nums) - k + 1)]
            `,
            py`
              from collections import deque

              def max_sliding_window(nums, k):
                  dq = deque()
                  out = []
                  for i, x in enumerate(nums):
                      while dq and nums[dq[-1]] <= x:
                          dq.pop()
                      dq.append(i)
                      if i >= k - 1:
                          out.append(nums[dq[0]])
                  return out
            `,
          ],
          explain: md`
            **O(n) time, O(k) space.** The deque holds candidate indices with decreasing values: the front is the max, and everything behind it could become the max once the front expires. Each index enters and leaves once.

            Without the expiry check, the old max stays at the front forever (\`[9, 8, 7, 6]\` would give \`[9, 9, 9]\`). Recomputing \`max\` per window is O(n·k): 5·10⁸ comparisons here. This is a "hard" on LeetCode, and the same deque trick computes rolling maxima over metric streams.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u17-l2',
      title: 'Linked Lists',
      summary: 'Pointer surgery: reverse, slow/fast pointers, Floyd\'s cycle check, dummy heads.',
      steps: [
        {
          type: 'learn',
          title: 'Nodes and pointers',
          body: md`
            A **linked list** is a chain of nodes. Each node holds a \`val\` and a \`next\` pointer to the following node (\`None\` at the end). You only keep the \`head\`.

            There are no indexes: reaching the k-th node means walking k steps, O(k). In exchange, inserting or removing next to a node you already hold is **O(1)**, with no shifting.
          `,
          code: py`
            class ListNode:
                def __init__(self, val=0, next=None):
                    self.val = val
                    self.next = next

            head = ListNode(1, ListNode(2, ListNode(3)))
            cur = head
            while cur:
                print(cur.val, end=" -> ")
                cur = cur.next
            print(None)
          `,
        },
        {
          type: 'output',
          prompt: 'The helper `build([...])` creates a linked list from a Python list and returns its head. What does this print?',
          setup: LL,
          code: py`
            head = build([10, 20, 30, 40])
            head.next = head.next.next
            cur = head
            total = 0
            while cur:
                total += cur.val
                cur = cur.next
            print(total, head.next.val)
          `,
          answer: '80 30',
          explain: '`head.next = head.next.next` makes 10 point straight at 30, so the 20 node is skipped (deleted) in O(1). The list is now 10 → 30 → 40.',
        },
        {
          type: 'choice',
          prompt: 'You hold only the `head` of a linked list with n nodes. Which operation is O(1)?',
          options: [
            'Insert a new node at the front',
            'Read the value at index n // 2',
            'Append at the end',
            'Check whether a value exists',
          ],
          answer: 0,
          explain: md`
            \`head = ListNode(x, head)\` is O(1). Index access and search must walk the chain: O(n). Appending is O(n) too unless you also keep a \`tail\` pointer. That trade-off is why Python lists are arrays, and why \`deque\` is built from linked blocks.
          `,
        },
        {
          type: 'learn',
          title: 'Reverse in place',
          body: md`
            Walk once and flip every \`next\` pointer backwards. You need three names:

            - \`prev\`: the head of the part that's already reversed
            - \`cur\`: the node you're flipping
            - \`nxt\`: \`cur.next\`, saved **before** you overwrite it

            When \`cur\` falls off the end, \`prev\` is the new head. That's O(n) time and O(1) extra space, the most asked linked-list question of all.
          `,
          setup: LL,
          code: py`
            head = build([1, 2, 3])
            prev, cur = None, head
            while cur:
                nxt = cur.next
                cur.next = prev
                prev = cur
                cur = nxt
            print(to_list(prev))
          `,
        },
        {
          type: 'order',
          prompt: 'Arrange the lines into `reverse_list(head)`, which reverses the list in place and returns the new head.',
          setup: LL,
          lines: [
            'def reverse_list(head):',
            '    prev, cur = None, head',
            '    while cur:',
            '        nxt = cur.next',
            '        cur.next = prev',
            '        prev, cur = cur, nxt',
            '    return prev',
          ],
          distractors: ['    return cur', '        cur.next = nxt'],
          tests: [
            { call: 'to_list(reverse_list(build([1, 2, 3])))', expect: '[3, 2, 1]' },
            { call: 'reverse_list(None)', expect: 'None' },
          ],
          explain: 'Save `nxt` first, then flip, then advance both pointers. At the end `cur` is `None`, so returning `cur` would lose the list. `prev` is the new head.',
        },
        {
          type: 'learn',
          title: 'Slow and fast pointers',
          body: md`
            Two pointers moving at different speeds solve many list problems in **one pass with O(1) memory**:

            - **Middle**: \`slow\` moves 1 step, \`fast\` moves 2. When \`fast\` reaches the end, \`slow\` is in the middle.
            - **Cycle (Floyd)**: in a loop, \`fast\` eventually laps \`slow\` and they meet. If \`fast\` reaches \`None\`, there's no loop.
            - **k-th from the end**: give one pointer a head start of k, then move both at the same speed.

            Compare nodes with \`is\`: you care whether it's the same node, not an equal value.
          `,
          setup: LL,
          code: py`
            head = build_cycle([1, 2, 3, 4], 1)  # 4 -> 2
            slow = fast = head
            steps = 0
            while fast and fast.next:
                slow = slow.next
                fast = fast.next.next
                steps += 1
                if slow is fast:
                    print("met at", slow.val, "after", steps)
                    break
          `,
        },
        {
          type: 'choice',
          prompt: 'The list has an **even** number of nodes. What does this print?',
          setup: LL,
          code: py`
            head = build([1, 2, 3, 4])
            slow = fast = head
            while fast and fast.next:
                slow = slow.next
                fast = fast.next.next
            print(slow.val)
          `,
          options: ['3', '2', '4', '2.5'],
          answer: 0,
          checkOutput: true,
          explain: md`
            \`fast\` visits 1 → 3 → \`None\` (it jumps off the end), while \`slow\` visits 1 → 2 → 3. With \`while fast and fast.next\`, an even-length list gives the **second** middle. Use \`while fast.next and fast.next.next\` if you need the first.
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete Floyd\'s cycle check (`True` if the list loops back on itself).',
          setup: LL,
          code: py`
            def has_cycle(head):
                slow = fast = head
                while fast and fast.___:
                    slow = slow.next
                    fast = fast.next.___
                    if slow ___ fast:
                        return True
                return False
          `,
          bank: ['next', 'next', 'is', 'is not', 'val', 'prev'],
          answer: ['next', 'next', 'is'],
          tests: [
            { call: 'has_cycle(build_cycle([3, 2, 0, -4], 1))', expect: 'True' },
            { call: 'has_cycle(build([1, 2, 3]))', expect: 'False' },
            { call: 'has_cycle(build_cycle([1], 0))', expect: 'True', name: 'self-loop' },
            { call: 'has_cycle(None)', expect: 'False' },
          ],
          explain: md`
            **O(n) time, O(1) space.** Once both pointers are inside the loop, the gap between them shrinks by one node per step, so \`fast\` catches \`slow\` within one lap. The \`fast and fast.next\` guard is what ends the loop on an acyclic list.

            A \`set\` of visited nodes also works, in O(n) space. The follow-up question is always "now with O(1) memory".
          `,
        },
        {
          type: 'code',
          title: 'K-th node from the end',
          prompt: md`
            Write \`kth_from_end(head, k)\` that returns the **value** of the k-th node from the end (\`k = 1\` is the last node). \`1 <= k <= length\`.

            \`\`\`python
            kth_from_end(build([1, 2, 3, 4, 5]), 2)  # 4
            \`\`\`

            Do it in **one pass** with O(1) extra space. \`build\` and \`ListNode\` are available.
          `,
          setup: LL,
          starter: 'def kth_from_end(head, k):\n    pass\n',
          solution: py`
            def kth_from_end(head, k):
                lead = trail = head
                for _ in range(k):
                    lead = lead.next
                while lead:
                    lead = lead.next
                    trail = trail.next
                return trail.val
          `,
          tests: [
            { call: 'kth_from_end(build([1, 2, 3, 4, 5]), 2)', expect: '4' },
            { call: 'kth_from_end(build([1, 2, 3, 4, 5]), 1)', expect: '5' },
            { call: 'kth_from_end(build([1, 2, 3, 4, 5]), 5)', expect: '1', hidden: true, name: 'k == length' },
            { call: 'kth_from_end(build([9]), 1)', expect: '9', hidden: true },
            { call: 'kth_from_end(build([8, 6, 7, 5, 3]), 3)', expect: '7', hidden: true },
            { call: 'kth_from_end(build(range(800)), 234)', expect: '566', hidden: true },
          ],
          hints: [
            'Move a `lead` pointer k steps ahead first.',
            'Then move `lead` and `trail` together until `lead` is `None`. `trail` is k nodes behind the end.',
          ],
          wrong: [
            py`
              def kth_from_end(head, k):
                  lead = trail = head
                  for _ in range(k - 1):
                      lead = lead.next
                  while lead:
                      lead = lead.next
                      trail = trail.next
                  return trail.val
            `,
            py`
              def kth_from_end(head, k):
                  lead = trail = head
                  for _ in range(k):
                      lead = lead.next
                  while lead.next:
                      lead = lead.next
                      trail = trail.next
                  return trail.val
            `,
          ],
          explain: md`
            **O(n) time, O(1) space, one pass.** Keeping a fixed gap of k nodes means that when \`lead\` falls off the end, \`trail\` is exactly k from the end.

            The off-by-ones are the whole difficulty: a gap of k − 1 lands one node too far, and \`while lead.next\` crashes when k equals the length (\`lead\` is already \`None\`). Test the edges (k = 1, k = n) out loud in an interview.
          `,
        },
        {
          type: 'learn',
          title: 'The dummy head',
          body: md`
            Building or editing a list usually has an annoying special case: the **head** itself might change. Start with a **dummy** node in front, plus a \`tail\` pointer:

            - append with \`tail.next = node\`, then \`tail = node\`
            - return \`dummy.next\` at the end

            Now the first node is no longer special. **Merging two sorted lists** uses it: keep attaching the smaller head to \`tail\`, and when one list runs out, attach the rest of the other in one O(1) step.
          `,
          setup: LL,
          code: py`
            dummy = tail = ListNode(0)
            for x in [5, 8, 2, 6]:
                if x % 2 == 0:
                    tail.next = ListNode(x)
                    tail = tail.next
            print(to_list(dummy.next))
          `,
        },
        {
          type: 'code',
          title: 'Merge two sorted lists',
          prompt: md`
            Write \`merge_two(a, b)\`: \`a\` and \`b\` are heads of linked lists sorted ascending (either may be \`None\`). Splice their nodes together into one sorted list and return its head. Reuse the existing nodes; don't create new ones.

            \`\`\`python
            to_list(merge_two(build([1, 2, 4]),
                              build([1, 3, 4])))
            # [1, 1, 2, 3, 4, 4]
            \`\`\`

            \`ListNode\`, \`build\` and \`to_list\` are available.
          `,
          setup: LL,
          starter: 'def merge_two(a, b):\n    pass\n',
          solution: py`
            def merge_two(a, b):
                dummy = tail = ListNode(0)
                while a and b:
                    if a.val <= b.val:
                        tail.next, a = a, a.next
                    else:
                        tail.next, b = b, b.next
                    tail = tail.next
                tail.next = a or b
                return dummy.next
          `,
          tests: [
            { call: 'to_list(merge_two(build([1, 2, 4]), build([1, 3, 4])))', expect: '[1, 1, 2, 3, 4, 4]' },
            { call: 'to_list(merge_two(build([]), build([0])))', expect: '[0]' },
            { call: 'merge_two(None, None)', expect: 'None', hidden: true },
            { call: 'to_list(merge_two(build([1, 2, 3]), build([])))', expect: '[1, 2, 3]', hidden: true },
            { call: 'to_list(merge_two(build([5, 6, 7]), build([1, 2])))', expect: '[1, 2, 5, 6, 7]', hidden: true, name: 'all of b comes first' },
            { call: 'to_list(merge_two(build([-3, 10]), build([-5, -3, 0])))', expect: '[-5, -3, -3, 0, 10]', hidden: true },
            { code: 'a = build([1, 4])\nb = build([2])\nh = merge_two(a, b)\nassert h is a and h.next is b', name: 'reuses the original nodes', hidden: true },
          ],
          hints: [
            'Start with `dummy = tail = ListNode(0)`.',
            'While both lists have nodes, attach the smaller one to `tail.next` and advance that list and `tail`.',
            'At the end, `tail.next = a or b` attaches whatever is left.',
          ],
          wrong: [
            py`
              def merge_two(a, b):
                  dummy = tail = ListNode(0)
                  while a and b:
                      if a.val <= b.val:
                          tail.next, a = a, a.next
                      else:
                          tail.next, b = b, b.next
                      tail = tail.next
                  return dummy.next
            `,
            py`
              def merge_two(a, b):
                  dummy = tail = ListNode(0)
                  while a and b:
                      if a.val <= b.val:
                          tail.next, a = a, a.next
                      else:
                          tail.next, b = b, b.next
                      tail = tail.next
                  tail.next = a
                  return dummy.next
            `,
            py`
              def merge_two(a, b):
                  dummy = tail = ListNode(0)
                  while a and b:
                      if a.val <= b.val:
                          tail.next, a = a, a.next
                      else:
                          tail.next, b = b, b.next
                      tail = tail.next
                  tail.next = a or b
                  return dummy
            `,
          ],
          explain: md`
            **O(n + m) time, O(1) extra space.** Each step attaches one node, and the leftover tail is attached in O(1) because it's already sorted.

            Forgetting the leftover (or attaching only \`a\`'s) drops nodes. Returning \`dummy\` leaks the fake 0. This merge is the heart of merge sort, and of merging sorted files in external sorting when data doesn't fit in memory.
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: remove all occurrences',
          prompt: md`
            \`remove_value(head, val)\` should delete **every** node whose value is \`val\` and return the new head. It has two bugs: it never removes the head, and it skips a node after each deletion (\`[1, 2, 2, 3]\` with 2 gives \`[1, 2, 3]\`). Fix both.
          `,
          setup: LL,
          starter: py`
            def remove_value(head, val):
                cur = head
                while cur and cur.next:
                    if cur.next.val == val:
                        cur.next = cur.next.next
                    cur = cur.next
                return head
          `,
          solution: py`
            def remove_value(head, val):
                dummy = ListNode(0, head)
                cur = dummy
                while cur.next:
                    if cur.next.val == val:
                        cur.next = cur.next.next
                    else:
                        cur = cur.next
                return dummy.next
          `,
          tests: [
            { call: 'to_list(remove_value(build([1, 2, 6, 3, 4, 5, 6]), 6))', expect: '[1, 2, 3, 4, 5]' },
            { call: 'to_list(remove_value(build([1, 2, 2, 3]), 2))', expect: '[1, 3]', name: 'consecutive matches' },
            { call: 'to_list(remove_value(build([5, 1]), 5))', expect: '[1]', name: 'head is removed' },
            { call: 'to_list(remove_value(build([7, 7, 7, 7]), 7))', expect: '[]', hidden: true },
            { call: 'to_list(remove_value(build([]), 1))', expect: '[]', hidden: true },
            { call: 'to_list(remove_value(build([1, 2, 3]), 9))', expect: '[1, 2, 3]', hidden: true },
          ],
          hints: [
            'Put a dummy node in front: `dummy = ListNode(0, head)`. Now the head is just another "next" node.',
            'Only advance `cur` when you did **not** delete. After a deletion, `cur.next` is a new node that also needs checking.',
          ],
          wrong: [
            py`
              def remove_value(head, val):
                  while head and head.val == val:
                      head = head.next
                  cur = head
                  while cur and cur.next:
                      if cur.next.val == val:
                          cur.next = cur.next.next
                      cur = cur.next
                  return head
            `,
            py`
              def remove_value(head, val):
                  cur = head
                  while cur and cur.next:
                      if cur.next.val == val:
                          cur.next = cur.next.next
                      else:
                          cur = cur.next
                  return head
            `,
          ],
          explain: md`
            **O(n) time, O(1) space.** With a dummy in front, deleting the head is the same operation as deleting any other node, and returning \`dummy.next\` picks up the new head automatically.

            The second bug is subtle: after \`cur.next = cur.next.next\`, the node now at \`cur.next\` hasn't been checked yet, so \`cur\` must stay put.
          `,
        },
        {
          type: 'code',
          title: 'Palindrome list',
          prompt: md`
            Write \`is_palindrome(head)\` that returns \`True\` if the list's values read the same forwards and backwards.

            \`\`\`python
            is_palindrome(build([1, 2, 2, 1]))  # True
            is_palindrome(build([1, 2]))        # False
            \`\`\`

            Follow-up interviewers ask: **O(n) time and O(1) extra space**. Combine this lesson's tricks: find the middle, reverse the second half, compare. (Modifying the list is allowed.)
          `,
          setup: LL,
          starter: 'def is_palindrome(head):\n    pass\n',
          solution: py`
            def is_palindrome(head):
                slow = fast = head
                while fast and fast.next:
                    slow = slow.next
                    fast = fast.next.next
                prev = None  # reverse 2nd half
                while slow:
                    nxt = slow.next
                    slow.next = prev
                    prev, slow = slow, nxt
                a, b = head, prev
                while b:
                    if a.val != b.val:
                        return False
                    a, b = a.next, b.next
                return True
          `,
          tests: [
            { call: 'is_palindrome(build([1, 2, 2, 1]))', expect: 'True' },
            { call: 'is_palindrome(build([1, 2]))', expect: 'False' },
            { call: 'is_palindrome(build([1, 2, 3, 2, 1]))', expect: 'True', name: 'odd length' },
            { call: 'is_palindrome(build([]))', expect: 'True', hidden: true },
            { call: 'is_palindrome(build([4]))', expect: 'True', hidden: true },
            { call: 'is_palindrome(build([1, 2, 3, 1]))', expect: 'False', hidden: true },
            { call: 'is_palindrome(build([1, 1, 2, 1]))', expect: 'False', hidden: true },
            { call: 'is_palindrome(build(list(range(400)) + list(range(399, -1, -1))))', expect: 'True', hidden: true, name: 'long list' },
          ],
          hints: [
            'Slow/fast pointers: when `fast` is done, `slow` is at the start of the second half.',
            'Reverse from `slow` onwards with the prev/cur/nxt loop.',
            'Walk from `head` and from the reversed half at the same time, comparing values until the reversed half ends.',
          ],
          wrong: [
            py`
              def is_palindrome(head):
                  vals = []
                  while head:
                      vals.append(head.val)
                      head = head.next
                  return vals == vals.reverse()
            `,
            py`
              def is_palindrome(head):
                  prev, cur = None, head
                  while cur:
                      cur.next, prev, cur = prev, cur, cur.next
                  a, b = head, prev
                  while a and b:
                      if a.val != b.val:
                          return False
                      a, b = a.next, b.next
                  return True
            `,
          ],
          explain: md`
            **O(n) time, O(1) extra space.** Middle (slow/fast) + reverse the second half + compare. For odd lengths the middle node ends up compared with itself, which is harmless.

            Reversing the **whole** list destroys the original order you wanted to compare with: \`head\` becomes the last node. And \`vals.reverse()\` returns \`None\`, so the first wrong version is always \`False\`. Copying into a Python list and checking \`vals == vals[::-1]\` is correct and fine as a first answer, but it uses O(n) memory.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u17-l3',
      title: 'Trees',
      summary: 'Recursive DFS, binary search trees, the bounds trick and level-order BFS.',
      steps: [
        {
          type: 'learn',
          title: 'Trees are recursive',
          body: md`
            A binary tree node has a \`val\`, a \`left\` and a \`right\` child (\`None\` if missing). Tests write trees **level by level**, like LeetCode: \`[3, 9, 20, None, None, 15, 7]\`, where \`None\` marks a missing child. The helper \`build_tree\` turns that list into nodes.

            Almost every tree problem is one recursive idea: **solve the left subtree, solve the right subtree, combine** at the node. The base case is the empty tree, \`None\`.
          `,
          setup: TREE,
          code: py`
            root = build_tree([3, 9, 20, None, None, 15, 7])

            def count(node):
                if node is None:
                    return 0
                return 1 + count(node.left) + count(node.right)

            print(count(root), root.right.left.val)
          `,
        },
        {
          type: 'output',
          prompt: 'This walk visits the left subtree, then prints the node, then visits the right subtree (**in-order**). What does it print?',
          setup: TREE,
          code: py`
            root = build_tree([1, 2, 3, 4, 5])

            def walk(node):
                if node:
                    walk(node.left)
                    print(node.val, end=" ")
                    walk(node.right)

            walk(root)
          `,
          answer: '4 2 5 1 3',
          explain: md`
            The tree is 1 with children 2 and 3, and 2 has children 4 and 5. In-order finishes all of 2's subtree (4, 2, 5) before printing 1, then does 3. Printing **before** the recursive calls is pre-order (1 2 4 5 3). Printing **after** both is post-order (4 5 2 3 1).
          `,
        },
        {
          type: 'choice',
          prompt: 'A recursive DFS visits each node of a binary tree once. The tree has n nodes and height h. What are its time and extra space?',
          options: ['O(n) time, O(h) space', 'O(n) time, O(1) space', 'O(log n) time and space', 'O(n²) time, O(n) space'],
          answer: 0,
          explain: md`
            Every node is visited once: O(n). The call stack holds one frame per level of the current path: O(h). That's O(log n) for a balanced tree but O(n) for a degenerate chain.

            In Python this matters: the recursion limit is 1000 frames, so a skewed tree with 10⁵ nodes needs an explicit stack.
          `,
        },
        {
          type: 'code',
          title: 'Maximum depth',
          prompt: md`
            Write \`max_depth(root)\` that returns the number of nodes on the longest path from the root down to a leaf. An empty tree has depth 0.

            \`\`\`python
            max_depth(build_tree([3, 9, 20, None, None, 15, 7]))
            # 3
            \`\`\`

            \`TreeNode\` and \`build_tree\` are available.
          `,
          setup: TREE,
          starter: 'def max_depth(root):\n    pass\n',
          solution: py`
            def max_depth(root):
                if root is None:
                    return 0
                return 1 + max(max_depth(root.left),
                               max_depth(root.right))
          `,
          tests: [
            { call: 'max_depth(build_tree([3, 9, 20, None, None, 15, 7]))', expect: '3' },
            { call: 'max_depth(build_tree([1, None, 2]))', expect: '2', name: 'only a right child' },
            { call: 'max_depth(build_tree([]))', expect: '0', hidden: true },
            { call: 'max_depth(build_tree([7]))', expect: '1', hidden: true },
            { call: 'max_depth(build_tree([1, 2, None, 3, None, 4, None, 5]))', expect: '5', hidden: true, name: 'left chain' },
            { call: 'max_depth(balanced_bst(0, 1000))', expect: '10', hidden: true },
          ],
          hints: [
            'Base case: `None` has depth 0.',
            'A node\'s depth is 1 + the deeper of its two subtrees.',
          ],
          wrong: [
            py`
              def max_depth(root):
                  if root is None:
                      return 0
                  return 1 + max_depth(root.left)
            `,
            py`
              def max_depth(root):
                  if not root.left and not root.right:
                      return 1
                  return 1 + max(max_depth(root.left),
                                 max_depth(root.right))
            `,
          ],
          explain: md`
            **O(n) time, O(h) space.** Classic post-order recursion: the answer for a node needs the answers of both children first.

            Making the leaf the base case instead of \`None\` crashes on nodes with a single child (and on an empty tree). With \`None\` as the base case, every case is covered by one rule.
          `,
        },
        {
          type: 'code',
          title: 'Path sum',
          prompt: md`
            Write \`has_path_sum(root, target)\` that returns \`True\` if some **root-to-leaf** path adds up to \`target\`. A leaf is a node with no children. Values can be negative.

            \`\`\`python
            t = build_tree([5, 4, 8, 11, None, 13, 4,
                            7, 2, None, None, None, 1])
            has_path_sum(t, 22)  # True: 5+4+11+2
            \`\`\`
          `,
          setup: TREE,
          starter: 'def has_path_sum(root, target):\n    pass\n',
          solution: py`
            def has_path_sum(root, target):
                if root is None:
                    return False
                rest = target - root.val
                if not root.left and not root.right:
                    return rest == 0
                return (has_path_sum(root.left, rest) or
                        has_path_sum(root.right, rest))
          `,
          tests: [
            { call: 'has_path_sum(build_tree([5, 4, 8, 11, None, 13, 4, 7, 2, None, None, None, 1]), 22)', expect: 'True' },
            { call: 'has_path_sum(build_tree([1, 2, 3]), 5)', expect: 'False' },
            { call: 'has_path_sum(build_tree([1, 2]), 1)', expect: 'False', name: '1 alone is not a root-to-leaf path' },
            { call: 'has_path_sum(build_tree([]), 0)', expect: 'False', hidden: true, name: 'empty tree' },
            { call: 'has_path_sum(build_tree([-2, None, -3]), -5)', expect: 'True', hidden: true },
            { call: 'has_path_sum(build_tree([1]), 1)', expect: 'True', hidden: true },
            { call: 'has_path_sum(build_tree([5, 4, 8, 11, None, 13, 4, 7, 2, None, None, None, 1]), 26)', expect: 'True', hidden: true },
          ],
          hints: [
            'Subtract the node\'s value from `target` on the way down.',
            'Only a **leaf** (no left and no right child) may check `rest == 0`. `None` itself returns `False`.',
          ],
          wrong: [
            py`
              def has_path_sum(root, target):
                  if root is None:
                      return target == 0
                  rest = target - root.val
                  return (has_path_sum(root.left, rest) or
                          has_path_sum(root.right, rest))
            `,
            py`
              def has_path_sum(root, target):
                  if root is None:
                      return False
                  if root.val == target:
                      return True
                  rest = target - root.val
                  return (has_path_sum(root.left, rest) or
                          has_path_sum(root.right, rest))
            `,
          ],
          explain: md`
            **O(n) time, O(h) space.** Pass the remaining target down; decide only at leaves.

            The famous bug is letting \`None\` answer \`target == 0\`. A node with one child then counts its missing side as a "leaf", so \`[1, 2]\` with target 1 wrongly returns \`True\`, and so does an empty tree with target 0. Interviewers pick exactly these inputs.
          `,
        },
        {
          type: 'learn',
          title: 'Binary search trees',
          body: md`
            In a **BST**, every value in a node's left subtree is smaller than the node, and every value in its right subtree is larger.

            So searching follows **one path** from the root: go left if the target is smaller, right if it's bigger. That's **O(h)**: O(log n) when balanced, O(n) when the tree has degenerated into a chain (insert sorted data and see!). Inserting walks the same path and hangs the new node where the walk falls off.

            Bonus: an in-order walk visits a BST's values **in sorted order**.
          `,
          setup: TREE,
          code: py`
            root = build_tree([8, 3, 10, 1, 6, None, 14])

            def contains(node, x):
                while node:
                    if x == node.val:
                        return True
                    if x < node.val:
                        node = node.left
                    else:
                        node = node.right
                return False

            print(contains(root, 6), contains(root, 7))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          setup: TREE,
          code: py`
            def walk(n):
                if n:
                    yield from walk(n.left)
                    yield n.val
                    yield from walk(n.right)

            root = build_tree([5, 3, 8, 1, 4, None, 9])
            print(list(walk(root)))
          `,
          options: ['[1, 3, 4, 5, 8, 9]', '[5, 3, 8, 1, 4, 9]', '[1, 4, 3, 9, 8, 5]', '[5, 3, 1, 4, 8, 9]'],
          answer: 0,
          checkOutput: true,
          explain: 'In-order (left, node, right) of a BST gives the values sorted. The other options are level order, post-order and pre-order. "k-th smallest in a BST" is just the k-th value of this walk.',
        },
        {
          type: 'code',
          title: 'Insert into a BST',
          prompt: md`
            Write \`bst_insert(root, val)\` that inserts \`val\` into the BST and returns the root (a new node if the tree was empty). \`val\` is not in the tree yet. Don't rebalance: hang the new node where the search path ends.

            \`\`\`python
            t = bst_insert(build_tree([4, 2, 7, 1, 3]), 5)
            inorder(t)       # [1, 2, 3, 4, 5, 7]
            t.right.left.val # 5
            \`\`\`

            \`TreeNode\`, \`build_tree\` and \`inorder\` are available.
          `,
          setup: TREE,
          starter: 'def bst_insert(root, val):\n    pass\n',
          solution: py`
            def bst_insert(root, val):
                if root is None:
                    return TreeNode(val)
                if val < root.val:
                    root.left = bst_insert(root.left, val)
                else:
                    root.right = bst_insert(root.right, val)
                return root
          `,
          tests: [
            { call: 'inorder(bst_insert(build_tree([4, 2, 7, 1, 3]), 5))', expect: '[1, 2, 3, 4, 5, 7]' },
            { call: 'bst_insert(build_tree([4, 2, 7, 1, 3]), 5).right.left.val', expect: '5', name: 'hangs under 7' },
            { call: 'bst_insert(None, 3).val', expect: '3', name: 'empty tree' },
            { call: 'inorder(bst_insert(build_tree([40, 20, 60, 10, 30, 50, 70]), 25))', expect: '[10, 20, 25, 30, 40, 50, 60, 70]', hidden: true },
            { call: 'bst_insert(build_tree([40, 20, 60, 10, 30, 50, 70]), 25).left.right.left.val', expect: '25', hidden: true },
            { call: 'inorder(bst_insert(build_tree([5]), -1))', expect: '[-1, 5]', hidden: true },
          ],
          hints: [
            'Empty spot → `return TreeNode(val)`.',
            'Recurse into the correct side and **assign** the result back: `root.left = bst_insert(root.left, val)`. Then return `root`.',
          ],
          wrong: [
            py`
              def bst_insert(root, val):
                  if root is None:
                      return TreeNode(val)
                  if val < root.val:
                      bst_insert(root.left, val)
                  else:
                      bst_insert(root.right, val)
                  return root
            `,
            py`
              def bst_insert(root, val):
                  if root is None:
                      return TreeNode(val)
                  if val > root.val:
                      root.left = bst_insert(root.left, val)
                  else:
                      root.right = bst_insert(root.right, val)
                  return root
            `,
          ],
          explain: md`
            **O(h) time, O(h) space** for the recursion (O(1) iteratively). The insert follows the same path a search would.

            Recursing without assigning the result back is the classic bug: the new node is created and immediately lost, because \`None\` children have no parent link to update. Returning the (possibly new) subtree root from every call fixes all cases at once.
          `,
        },
        {
          type: 'learn',
          title: 'Validate a BST: pass down bounds',
          body: md`
            Checking only \`left.val < node.val < right.val\` is the bug interviewers are hoping for. In \`[5, 1, 6, None, None, 3, 7]\` the 3 sits in 5's **right** subtree, which is illegal, even though 3 < 6 looks fine locally.

            Pass down the allowed **range** instead: every node must satisfy \`lo < val < hi\`. Going left, the node's value becomes the new \`hi\`. Going right, it becomes the new \`lo\`. The root starts with \`(-inf, inf)\`.
          `,
          setup: TREE,
          code: py`
            def local_ok(node):  # the classic WRONG check
                if node is None:
                    return True
                if node.left and node.left.val >= node.val:
                    return False
                if node.right and node.right.val <= node.val:
                    return False
                return local_ok(node.left) and local_ok(node.right)

            print(local_ok(build_tree([5, 1, 6, None, None, 3, 7])))
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: validate a BST',
          prompt: md`
            \`is_valid_bst(root)\` uses the local check from the card, so it accepts \`[5, 1, 6, None, None, 3, 7]\`. Rewrite it with the **bounds** trick. Values must be **strictly** increasing (duplicates make it invalid). An empty tree is valid.
          `,
          setup: TREE,
          starter: py`
            def is_valid_bst(root):
                if root is None:
                    return True
                if root.left and root.left.val >= root.val:
                    return False
                if root.right and root.right.val <= root.val:
                    return False
                return (is_valid_bst(root.left) and
                        is_valid_bst(root.right))
          `,
          solution: py`
            def is_valid_bst(root, lo=float("-inf"),
                             hi=float("inf")):
                if root is None:
                    return True
                if not lo < root.val < hi:
                    return False
                return (is_valid_bst(root.left, lo, root.val) and
                        is_valid_bst(root.right, root.val, hi))
          `,
          tests: [
            { call: 'is_valid_bst(build_tree([2, 1, 3]))', expect: 'True' },
            { call: 'is_valid_bst(build_tree([5, 1, 6, None, None, 3, 7]))', expect: 'False', name: '3 is in 5\'s right subtree' },
            { call: 'is_valid_bst(build_tree([5, 1, 4, None, None, 3, 6]))', expect: 'False' },
            { call: 'is_valid_bst(build_tree([]))', expect: 'True', hidden: true },
            { call: 'is_valid_bst(build_tree([2, 2, 2]))', expect: 'False', hidden: true, name: 'duplicates' },
            { call: 'is_valid_bst(build_tree([10, 5, 15, 2, 12, 11, 20]))', expect: 'False', hidden: true, name: '12 in 10\'s left subtree' },
            { call: 'is_valid_bst(build_tree([-1, -5, 0]))', expect: 'True', hidden: true },
            { call: 'is_valid_bst(balanced_bst(0, 3000))', expect: 'True', hidden: true },
          ],
          hints: [
            'Add parameters `lo` and `hi` with defaults `float("-inf")` and `float("inf")`.',
            'Check `lo < root.val < hi`, then recurse left with `(lo, root.val)` and right with `(root.val, hi)`.',
          ],
          wrong: [
            py`
              def is_valid_bst(root, lo=float("-inf"),
                               hi=float("inf")):
                  if root is None:
                      return True
                  if not lo <= root.val <= hi:
                      return False
                  return (is_valid_bst(root.left, lo, root.val) and
                          is_valid_bst(root.right, root.val, hi))
            `,
            py`
              def is_valid_bst(root, lo=0, hi=10**9):
                  if root is None:
                      return True
                  if not lo < root.val < hi:
                      return False
                  return (is_valid_bst(root.left, lo, root.val) and
                          is_valid_bst(root.right, root.val, hi))
            `,
          ],
          explain: md`
            **O(n) time, O(h) space.** Each node inherits the tightest bounds from all its ancestors, so a violation anywhere above is caught, not just with the parent.

            Equivalent alternative: do an in-order walk and check that each value is strictly greater than the previous one. Use real infinities for the starting bounds. "Magic" limits like 0 or 10⁹ break on negative or huge values.
          `,
        },
        {
          type: 'learn',
          title: 'Level order with BFS',
          body: md`
            To visit a tree **level by level**, use a queue (BFS). To know where one level ends, use this trick: at the start of each round, \`len(q)\` is exactly the number of nodes on the current level. Pop that many, record them, and enqueue their children for the next round.

            Time O(n), space O(w), where w is the widest level (up to n/2 for the bottom of a full tree).
          `,
          setup: TREE,
          code: py`
            root = build_tree([3, 9, 20, None, None, 15, 7])
            q = deque([root])
            depth = 0
            while q:
                size = len(q)
                for _ in range(size):
                    node = q.popleft()
                    print(depth, node.val)
                    if node.left:
                        q.append(node.left)
                    if node.right:
                        q.append(node.right)
                depth += 1
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete `level_order(root)`, which returns the values grouped by level, e.g. `[[3], [9, 20], [15, 7]]`.',
          setup: TREE,
          code: py`
            def level_order(root):
                if root is None:
                    return []
                out, q = [], deque([root])
                while q:
                    level = []
                    for _ in range(___(q)):
                        node = q.___()
                        level.append(node.val)
                        for child in (node.left, node.right):
                            if child:
                                q.append(child)
                    out.append(level)
                return out
          `,
          bank: ['len', 'popleft', 'pop', 'sum', 'max', 'appendleft'],
          answer: ['len', 'popleft'],
          tests: [
            { call: 'level_order(build_tree([3, 9, 20, None, None, 15, 7]))', expect: '[[3], [9, 20], [15, 7]]' },
            { call: 'level_order(build_tree([1, 2, 3, 4, 5, 6, 7]))', expect: '[[1], [2, 3], [4, 5, 6, 7]]' },
            { call: 'level_order(None)', expect: '[]' },
          ],
          explain: '`range(len(q))` is evaluated once, before the loop adds children, so it processes exactly one level. `pop()` would take from the wrong end and mix the levels up.',
        },
        {
          type: 'code',
          title: 'Right side view',
          prompt: md`
            Imagine standing to the right of the tree. Write \`right_side_view(root)\` that returns the values you can see, top to bottom: the **last** node of every level.

            \`\`\`python
            right_side_view(build_tree([1, 2, 3, None, 5, None, 4]))
            # [1, 3, 4]
            right_side_view(build_tree([1, 2, 3, 4]))
            # [1, 3, 4]   (4 is visible below 3)
            \`\`\`
          `,
          setup: TREE,
          starter: 'def right_side_view(root):\n    pass\n',
          solution: py`
            def right_side_view(root):
                if root is None:
                    return []
                out, q = [], deque([root])
                while q:
                    for i in range(len(q)):
                        node = q.popleft()
                        if node.left:
                            q.append(node.left)
                        if node.right:
                            q.append(node.right)
                    out.append(node.val)
                return out
          `,
          tests: [
            { call: 'right_side_view(build_tree([1, 2, 3, None, 5, None, 4]))', expect: '[1, 3, 4]' },
            { call: 'right_side_view(build_tree([1, 2, 3, 4]))', expect: '[1, 3, 4]', name: 'a left node can be visible' },
            { call: 'right_side_view(build_tree([]))', expect: '[]', hidden: true },
            { call: 'right_side_view(build_tree([1, None, 3]))', expect: '[1, 3]', hidden: true },
            { call: 'right_side_view(build_tree([1, 2, None, 3, None, 4]))', expect: '[1, 2, 3, 4]', hidden: true, name: 'left chain' },
            { call: 'right_side_view(balanced_bst(0, 15))', expect: '[7, 11, 13, 14]', hidden: true },
          ],
          hints: [
            'Do level-order BFS with the `len(q)` trick.',
            'After processing a level, the last node you popped is the rightmost one.',
          ],
          wrong: [
            py`
              def right_side_view(root):
                  out = []
                  while root:
                      out.append(root.val)
                      root = root.right
                  return out
            `,
            py`
              def right_side_view(root):
                  if root is None:
                      return []
                  out, q = [], deque([root])
                  while q:
                      out.append(q[0].val)
                      for i in range(len(q)):
                          node = q.popleft()
                          if node.left:
                              q.append(node.left)
                          if node.right:
                              q.append(node.right)
                  return out
            `,
          ],
          explain: md`
            **O(n) time, O(w) space.** BFS groups nodes by depth, and the rightmost node of each depth is the visible one.

            Following \`.right\` pointers only is the tempting shortcut, but it misses levels whose right side is empty. Then a left node is what you see. A DFS that visits right before left and records the first node at each new depth works too.
          `,
        },
        {
          type: 'code',
          title: 'Lowest common ancestor in a BST',
          prompt: md`
            The **lowest common ancestor** (LCA) of \`p\` and \`q\` is the deepest node that has both in its subtree (a node counts as its own descendant).

            Write \`lca_bst(root, p, q)\` for a **BST**, where \`p\` and \`q\` are values that exist in the tree. Return the LCA **node**.

            \`\`\`python
            t = build_tree([6, 2, 8, 0, 4, 7, 9,
                            None, None, 3, 5])
            lca_bst(t, 2, 8).val  # 6
            lca_bst(t, 2, 4).val  # 2
            \`\`\`

            Use the BST order to get **O(h)** per query: the tests ask 1,500 questions on a tree with 32,768 nodes.
          `,
          setup: TREE + '\n\n' + py`
            import random
            BIG_T = balanced_bst(0, 2 ** 15)
            _r = random.Random(7)
            PAIRS = [(_r.randrange(2 ** 15),
                      _r.randrange(2 ** 15))
                     for _ in range(1500)]
            PAIRS = [(a, b) for a, b in PAIRS if a != b]
            T6 = build_tree([6, 2, 8, 0, 4, 7, 9,
                             None, None, 3, 5])
          `,
          starter: 'def lca_bst(root, p, q):\n    pass\n',
          solution: py`
            def lca_bst(root, p, q):
                node = root
                while node:
                    if p < node.val and q < node.val:
                        node = node.left
                    elif p > node.val and q > node.val:
                        node = node.right
                    else:
                        return node
          `,
          tests: [
            { call: 'lca_bst(T6, 2, 8).val', expect: '6' },
            { call: 'lca_bst(T6, 2, 4).val', expect: '2', name: 'a node is its own ancestor' },
            { call: 'lca_bst(T6, 3, 5).val', expect: '4', hidden: true },
            { call: 'lca_bst(T6, 5, 0).val', expect: '2', hidden: true, name: 'p > q' },
            { call: 'lca_bst(T6, 9, 7).val', expect: '8', hidden: true },
            { call: 'lca_bst(build_tree([2, 1]), 2, 1).val', expect: '2', hidden: true },
            { call: 'sum(lca_bst(BIG_T, a, b).val for a, b in PAIRS)', expect: '24273816', hidden: true, maxMs: 100, name: '1,500 queries in O(h) each' },
          ],
          hints: [
            'If both values are smaller than the node, the LCA is in the left subtree. Both bigger → right subtree.',
            'Otherwise they split here (or one of them **is** this node), so this node is the LCA.',
          ],
          wrong: [
            py`
              def lca_bst(root, p, q):
                  if root is None or root.val in (p, q):
                      return root
                  left = lca_bst(root.left, p, q)
                  right = lca_bst(root.right, p, q)
                  if left and right:
                      return root
                  return left or right
            `,
            py`
              def lca_bst(root, p, q):
                  node = root
                  while node:
                      if q < node.val:
                          node = node.left
                      elif p > node.val:
                          node = node.right
                      else:
                          return node
            `,
          ],
          explain: md`
            **O(h) time, O(1) space.** Walking down from the root, both values stay on the same side until the first node where they split. That node is the LCA, and the BST order tells you which side to take without looking anywhere else.

            The general binary-tree LCA (recurse both sides) is correct but O(n) per query: about 5·10⁷ node visits here. Assuming \`p < q\` without checking breaks when the caller passes them the other way round.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u17-l4',
      title: 'Graphs',
      summary: 'Adjacency lists, BFS shortest paths, DFS flood fill, topological sort and cycles.',
      steps: [
        {
          type: 'learn',
          title: 'Adjacency lists',
          body: md`
            A graph is nodes plus edges. Store it as an **adjacency list**: a dict that maps each node to a list of its neighbours. Build it from an edge list with \`defaultdict(list)\`. For an **undirected** edge, add both directions.

            Space is O(V + E). An adjacency matrix needs O(V²): for a social network with 10⁶ users that's 10¹² cells, almost all of them zero.
          `,
          code: py`
            from collections import defaultdict

            edges = [("a", "b"), ("a", "c"), ("b", "d")]
            graph = defaultdict(list)
            for u, v in edges:
                graph[u].append(v)
                graph[v].append(u)  # undirected
            print(dict(graph))
            print(len(graph["a"]), "neighbours of a")
          `,
        },
        {
          type: 'output',
          prompt: 'These edges are **directed** (u → v). What does this print?',
          code: py`
            from collections import defaultdict

            edges = [(1, 2), (1, 3), (3, 2), (2, 4)]
            out_deg = defaultdict(int)
            in_deg = defaultdict(int)
            for u, v in edges:
                out_deg[u] += 1
                in_deg[v] += 1
            print(out_deg[1], in_deg[2], in_deg[1], out_deg[4])
          `,
          answer: '2 2 0 0',
          explain: 'Node 1 has edges to 2 and 3 (out-degree 2). Node 2 is the target of 1 → 2 and 3 → 2 (in-degree 2). Nothing points at 1, and 4 points nowhere. `defaultdict(int)` answers 0 for keys it has never seen. In-degrees are the core of topological sort, coming up below.',
        },
        {
          type: 'choice',
          prompt: 'BFS over a graph stored as an adjacency list with V nodes and E edges. What is its running time?',
          options: ['O(V + E)', 'O(V · E)', 'O(V²)', 'O(E log V)'],
          answer: 0,
          explain: md`
            Every node is enqueued and dequeued once (O(V)), and every adjacency list is scanned once when its node is dequeued (O(E) in total). That's **O(V + E)**, and DFS is the same.

            O(V²) is what you get with an adjacency **matrix**, because finding a node's neighbours means scanning a whole row.
          `,
        },
        {
          type: 'learn',
          title: 'BFS finds shortest paths',
          body: md`
            In an **unweighted** graph, BFS reaches nodes in order of distance: everything at distance 1, then 2, and so on. So the first time you reach a node, you got there by a shortest path.

            Store \`dist[node]\` at the moment you **enqueue** it. The dict doubles as the visited set. DFS doesn't do this: it finds *a* path, not the shortest one.
          `,
          code: py`
            from collections import deque

            graph = {"a": ["b", "c"], "b": ["d"],
                     "c": ["d"], "d": ["e"], "e": []}
            dist = {"a": 0}
            q = deque(["a"])
            while q:
                u = q.popleft()
                for v in graph[u]:
                    if v not in dist:
                        dist[v] = dist[u] + 1
                        q.append(v)
            print(dist)
          `,
        },
        {
          type: 'choice',
          prompt: 'Why mark a node as visited when it is **enqueued**, not when it is dequeued?',
          options: [
            'So no node is queued twice',
            'Dequeuing is O(n)',
            'BFS would loop forever otherwise',
            'It makes the distances wrong otherwise',
          ],
          answer: 0,
          explain: md`
            If you only mark on dequeue, a node with many already-queued neighbours gets added to the queue once per neighbour. The answers stay correct and it still terminates, but the queue can blow up to O(E) entries with lots of wasted work. Marking at enqueue guarantees each node is queued exactly once.
          `,
        },
        {
          type: 'code',
          title: 'Shortest path (unweighted)',
          prompt: md`
            Write \`shortest_path(graph, start, goal)\` that returns the **number of edges** on a shortest path from \`start\` to \`goal\` in a **directed** graph, or \`-1\` if \`goal\` can't be reached. \`graph\` maps a node to a list of neighbours. Nodes without outgoing edges may be missing from the dict.

            \`\`\`python
            g = {"a": ["b", "c"], "b": ["d"],
                 "c": ["d"], "d": ["e"]}
            shortest_path(g, "a", "e")  # 3
            shortest_path(g, "e", "a")  # -1
            \`\`\`

            Graphs have up to 10⁵ nodes: aim for O(V + E).
          `,
          setup: py`
            G1 = {"a": ["b", "c"], "b": ["d"],
                  "c": ["d"], "d": ["e"]}

            def big_graph(n):
                return {i: [(i + 1) % n, (i * 37 + 11) % n]
                        for i in range(n)}

            BG = big_graph(30000)
          `,
          starter: 'def shortest_path(graph, start, goal):\n    pass\n',
          solution: py`
            from collections import deque

            def shortest_path(graph, start, goal):
                dist = {start: 0}
                q = deque([start])
                while q:
                    u = q.popleft()
                    if u == goal:
                        return dist[u]
                    for v in graph.get(u, []):
                        if v not in dist:
                            dist[v] = dist[u] + 1
                            q.append(v)
                return -1
          `,
          tests: [
            { call: 'shortest_path(G1, "a", "e")', expect: '3' },
            { call: 'shortest_path(G1, "e", "a")', expect: '-1', name: 'edges are one-way' },
            { call: 'shortest_path(G1, "b", "b")', expect: '0', hidden: true, name: 'start == goal' },
            { call: 'shortest_path({1: [2, 5], 2: [3], 3: [4], 4: [5]}, 1, 5)', expect: '1', hidden: true, name: 'the first path found is not the shortest' },
            { call: 'shortest_path({"x": ["y"]}, "x", "z")', expect: '-1', hidden: true },
            { call: 'shortest_path({0: [1], 1: [0, 2], 2: [3], 3: [1]}, 0, 3)', expect: '3', hidden: true, name: 'graph with cycles' },
            { call: 'shortest_path(BG, 1, 0)', expect: '13', hidden: true },
            { call: 'shortest_path(BG, 0, -1)', expect: '-1', hidden: true, maxMs: 300, name: 'full search of 30,000 nodes' },
          ],
          hints: [
            'BFS from `start` with a deque; keep `dist = {start: 0}`.',
            'When you pop `goal`, return its distance. Use `graph.get(u, [])` for nodes that have no entry.',
            'If the queue empties without reaching `goal`, return -1.',
          ],
          wrong: [
            py`
              def shortest_path(graph, start, goal):
                  stack = [(start, 0)]
                  seen = {start}
                  while stack:
                      u, d = stack.pop()
                      if u == goal:
                          return d
                      for v in reversed(graph.get(u, [])):
                          if v not in seen:
                              seen.add(v)
                              stack.append((v, d + 1))
                  return -1
            `,
            py`
              from collections import deque

              def shortest_path(graph, start, goal):
                  seen = [start]
                  q = deque([(start, 0)])
                  while q:
                      u, d = q.popleft()
                      if u == goal:
                          return d
                      for v in graph.get(u, []):
                          if v not in seen:
                              seen.append(v)
                              q.append((v, d + 1))
                  return -1
            `,
            py`
              from collections import deque

              def shortest_path(graph, start, goal):
                  dist = {start: 0}
                  q = deque([start])
                  while q:
                      u = q.popleft()
                      if u == goal:
                          return dist[u]
                      for v in graph[u]:
                          if v not in dist:
                              dist[v] = dist[u] + 1
                              q.append(v)
                  return -1
            `,
          ],
          explain: md`
            **O(V + E) time, O(V) space.** BFS explores in distance order, so the first time \`goal\` comes out of the queue, its distance is minimal.

            DFS happily walks 1 → 2 → 3 → 4 → 5 and reports 4 when the direct edge gives 1. Keeping \`seen\` in a **list** makes every check O(V): fine on toy graphs, 10⁹ steps on this one. For **weighted** edges BFS is no longer enough: that's Dijkstra, which is BFS with a heap (next lesson).
          `,
        },
        {
          type: 'learn',
          title: 'DFS and connected components',
          body: md`
            To count the **connected components** of an undirected graph, loop over all nodes. Each unvisited node starts a new component: flood it with DFS (or BFS), marking everything reachable. Every node and edge is touched once: **O(V + E)**.

            In Python, prefer an explicit **stack** over recursion. The recursion limit is 1000 frames, and a long chain of nodes would crash with \`RecursionError\`.
          `,
          code: py`
            graph = {1: [2], 2: [1, 3], 3: [2],
                     4: [5], 5: [4], 6: []}
            seen = set()
            comps = 0
            for start in graph:
                if start in seen:
                    continue
                comps += 1
                seen.add(start)
                stack = [start]
                while stack:
                    u = stack.pop()
                    for v in graph[u]:
                        if v not in seen:
                            seen.add(v)
                            stack.append(v)
            print(comps)
          `,
        },
        {
          type: 'code',
          title: 'Count connected components',
          prompt: md`
            Write \`count_components(n, edges)\`. The nodes are \`0 … n-1\` and \`edges\` is a list of **undirected** pairs \`[u, v]\` (there may be duplicates and self-loops). Return the number of connected components.

            \`\`\`python
            count_components(5, [[0, 1], [1, 2], [3, 4]])  # 2
            \`\`\`

            n can be 10⁵, and the graph may be one long chain, so use an explicit stack or queue rather than recursion.
          `,
          setup: py`
            import random
            _r = random.Random(3)
            E = [(_r.randrange(100000), _r.randrange(100000))
                 for _ in range(70000)]
            CHAIN = [[i, i + 1] for i in range(2999)]
          `,
          starter: 'def count_components(n, edges):\n    pass\n',
          solution: py`
            from collections import defaultdict

            def count_components(n, edges):
                graph = defaultdict(list)
                for u, v in edges:
                    graph[u].append(v)
                    graph[v].append(u)
                seen = set()
                comps = 0
                for s in range(n):
                    if s in seen:
                        continue
                    comps += 1
                    seen.add(s)
                    stack = [s]
                    while stack:
                        u = stack.pop()
                        for v in graph[u]:
                            if v not in seen:
                                seen.add(v)
                                stack.append(v)
                return comps
          `,
          tests: [
            { call: 'count_components(5, [[0, 1], [1, 2], [3, 4]])', expect: '2' },
            { call: 'count_components(5, [[0, 1], [1, 2], [2, 3], [3, 4]])', expect: '1' },
            { call: 'count_components(3, [])', expect: '3', hidden: true, name: 'isolated nodes count' },
            { call: 'count_components(4, [[0, 0], [1, 2], [2, 1]])', expect: '3', hidden: true, name: 'self-loop and duplicate edge' },
            { call: 'count_components(4, [[0, 1], [1, 2], [2, 0]])', expect: '2', hidden: true, name: 'a cycle' },
            { call: 'count_components(3000, CHAIN)', expect: '1', hidden: true, name: 'a chain of 3000 nodes' },
            { call: 'count_components(100000, E)', expect: '32162', hidden: true, maxMs: 1000, name: '100,000 nodes' },
          ],
          hints: [
            'Build an adjacency list with both directions of every edge.',
            'Loop `s` over `range(n)` (not just nodes that appear in edges). Each unseen `s` is a new component: flood it with a stack.',
          ],
          wrong: [
            py`
              from collections import defaultdict

              def count_components(n, edges):
                  graph = defaultdict(list)
                  for u, v in edges:
                      graph[u].append(v)
                      graph[v].append(u)
                  seen = set()
                  comps = 0
                  for s in list(graph):
                      if s in seen:
                          continue
                      comps += 1
                      seen.add(s)
                      stack = [s]
                      while stack:
                          u = stack.pop()
                          for v in graph[u]:
                              if v not in seen:
                                  seen.add(v)
                                  stack.append(v)
                  return comps
            `,
            py`
              from collections import defaultdict

              def count_components(n, edges):
                  graph = defaultdict(list)
                  for u, v in edges:
                      graph[u].append(v)
                      graph[v].append(u)
                  seen = set()

                  def dfs(u):
                      seen.add(u)
                      for v in graph[u]:
                          if v not in seen:
                              dfs(v)

                  comps = 0
                  for s in range(n):
                      if s not in seen:
                          comps += 1
                          dfs(s)
                  return comps
            `,
            'def count_components(n, edges):\n    return n - len(edges)\n',
          ],
          explain: md`
            **O(V + E) time and space.** Each flood fill marks one whole component, so the number of fills is the answer.

            Looping only over nodes that appear in \`edges\` forgets isolated nodes. Recursive DFS is the textbook answer, but on a 3000-node chain it dies with \`RecursionError\`. Mention that, and the explicit stack, in an interview. **Union-find** (disjoint sets) is the other standard answer, and it's handy when edges arrive as a stream.
          `,
        },
        {
          type: 'code',
          title: 'Number of islands',
          prompt: md`
            \`grid\` is a list of equal-length strings of \`"1"\` (land) and \`"0"\` (water). An **island** is a group of land cells connected **horizontally or vertically** (not diagonally). Write \`num_islands(grid)\` that returns how many islands there are.

            \`\`\`python
            num_islands(["11000",
                         "11000",
                         "00100",
                         "00011"])  # 3
            \`\`\`

            Grids go up to 300 × 300, so a flood fill can be 90,000 cells deep: use a stack or a queue, not recursion. (Strings can't be modified, so track visited cells in a set.)
          `,
          setup: py`
            import random

            def make_grid(n, seed):
                r = random.Random(seed)
                return ["".join("1" if r.random() < 0.55
                                else "0" for _ in range(n))
                        for _ in range(n)]

            G300 = make_grid(300, 5)
            FULL = ["1" * 300] * 300
          `,
          starter: 'def num_islands(grid):\n    pass\n',
          solution: py`
            def num_islands(grid):
                rows = len(grid)
                cols = len(grid[0]) if grid else 0
                seen = set()
                count = 0
                for r in range(rows):
                    for c in range(cols):
                        if grid[r][c] != "1" or (r, c) in seen:
                            continue
                        count += 1
                        seen.add((r, c))
                        stack = [(r, c)]
                        while stack:
                            i, j = stack.pop()
                            for a, b in ((i + 1, j), (i - 1, j),
                                         (i, j + 1), (i, j - 1)):
                                if (0 <= a < rows and 0 <= b < cols
                                        and grid[a][b] == "1"
                                        and (a, b) not in seen):
                                    seen.add((a, b))
                                    stack.append((a, b))
                return count
          `,
          tests: [
            { call: 'num_islands(["11000", "11000", "00100", "00011"])', expect: '3' },
            { call: 'num_islands(["11110", "11010", "11000", "00000"])', expect: '1' },
            { call: 'num_islands(["10", "01"])', expect: '2', name: 'diagonal does not connect' },
            { call: 'num_islands([])', expect: '0', hidden: true },
            { call: 'num_islands(["0"])', expect: '0', hidden: true },
            { call: 'num_islands(["111", "010", "111"])', expect: '1', hidden: true },
            { call: 'num_islands(["101", "000", "101"])', expect: '4', hidden: true },
            { call: 'num_islands(G300)', expect: '4003', hidden: true, maxMs: 1000, name: 'random 300 × 300' },
            { call: 'num_islands(FULL)', expect: '1', hidden: true, maxMs: 1000, name: 'one island of 90,000 cells' },
          ],
          hints: [
            'Scan every cell. An unvisited `"1"` starts a new island.',
            'Flood that island with a stack of `(row, col)` pairs, adding the 4 neighbours that are in bounds, land, and unseen.',
          ],
          wrong: [
            'def num_islands(grid):\n    return sum(row.count("1") for row in grid)\n',
            py`
              def num_islands(grid):
                  rows = len(grid)
                  cols = len(grid[0]) if grid else 0
                  seen = set()
                  count = 0
                  for r in range(rows):
                      for c in range(cols):
                          if grid[r][c] != "1" or (r, c) in seen:
                              continue
                          count += 1
                          seen.add((r, c))
                          stack = [(r, c)]
                          while stack:
                              i, j = stack.pop()
                              for a in (i - 1, i, i + 1):
                                  for b in (j - 1, j, j + 1):
                                      if (0 <= a < rows and 0 <= b < cols
                                              and grid[a][b] == "1"
                                              and (a, b) not in seen):
                                          seen.add((a, b))
                                          stack.append((a, b))
                  return count
            `,
            py`
              def num_islands(grid):
                  rows = len(grid)
                  cols = len(grid[0]) if grid else 0
                  seen = set()

                  def sink(r, c):
                      if not (0 <= r < rows and 0 <= c < cols):
                          return
                      if grid[r][c] != "1" or (r, c) in seen:
                          return
                      seen.add((r, c))
                      sink(r + 1, c)
                      sink(r - 1, c)
                      sink(r, c + 1)
                      sink(r, c - 1)

                  count = 0
                  for r in range(rows):
                      for c in range(cols):
                          if grid[r][c] == "1" and (r, c) not in seen:
                              count += 1
                              sink(r, c)
                  return count
            `,
          ],
          explain: md`
            **O(R·C) time and space.** A grid is a graph whose nodes are cells and whose edges join 4-neighbours. Counting islands is counting connected components: each flood fill visits one island, and every cell is visited once.

            Including diagonals merges \`["10", "01"]\` into one island. The recursive "sink" version is the most common interview answer, but a big island makes it 90,000 frames deep. Saying "I'd use an explicit stack because of Python's recursion limit" is a real plus.
          `,
        },
        {
          type: 'learn',
          title: 'Topological sort (Kahn)',
          body: md`
            Course prerequisites form a **directed** graph: \`b → a\` means "take b before a". You can finish everything exactly when the graph has **no cycle**.

            **Kahn's algorithm**: count each node's **in-degree** (incoming edges). Queue every node with in-degree 0. Pop one, "take" it, and decrement its neighbours' in-degrees; any that reach 0 join the queue. If you took all n nodes, there's no cycle, and the order you took them in is a **topological order**. O(V + E).
          `,
          code: py`
            from collections import deque

            graph = {"math": ["stats", "ml"],
                     "stats": ["ml"],
                     "python": ["ml"], "ml": []}
            indeg = {u: 0 for u in graph}
            for u in graph:
                for v in graph[u]:
                    indeg[v] += 1
            q = deque(u for u in graph if indeg[u] == 0)
            order = []
            while q:
                u = q.popleft()
                order.append(u)
                for v in graph[u]:
                    indeg[v] -= 1
                    if indeg[v] == 0:
                        q.append(v)
            print(order)
          `,
        },
        {
          type: 'order',
          prompt: md`
            Arrange Kahn's algorithm. This compact version uses the \`order\` list itself as the queue: a \`for\` loop over a list also visits items appended during the loop. For a graph with a cycle it returns fewer than \`len(graph)\` nodes.
          `,
          lines: [
            'def topo_order(graph):',
            '    indeg = {u: 0 for u in graph}',
            '    for u in graph:',
            '        for v in graph[u]:',
            '            indeg[v] += 1',
            '    order = [u for u in graph if indeg[u] == 0]',
            '    for u in order:',
            '        for w in graph[u]:',
            '            indeg[w] -= 1',
            '            if indeg[w] == 0:',
            '                order.append(w)',
            '    return order',
          ],
          distractors: ['            indeg[u] += 1'],
          tests: [
            { call: 'topo_order({"a": ["b", "c"], "b": ["d"], "c": ["d"], "d": []})', expect: '["a", "b", "c", "d"]' },
            { call: 'topo_order({"x": ["y"], "y": ["x"], "z": []})', expect: '["z"]', name: 'a cycle never reaches in-degree 0' },
          ],
          explain: 'The in-degrees must be complete before you pick the starting nodes. A node joins `order` only after its last prerequisite has been taken. Nodes on a cycle wait for each other forever, so they never join.',
        },
        {
          type: 'code',
          title: 'Course schedule',
          prompt: md`
            There are \`num_courses\` courses \`0 … n-1\`. Each pair \`[a, b]\` in \`prereqs\` means "to take a, you must first take b". Write \`can_finish(num_courses, prereqs)\` that returns \`True\` if you can take all courses.

            \`\`\`python
            can_finish(2, [[1, 0]])          # True
            can_finish(2, [[1, 0], [0, 1]])  # False
            \`\`\`

            Up to 10⁵ courses and prerequisites, possibly one very long chain. Aim for O(V + E).
          `,
          setup: 'CHAIN = [[i + 1, i] for i in range(99999)]\n',
          starter: 'def can_finish(num_courses, prereqs):\n    pass\n',
          solution: py`
            from collections import deque

            def can_finish(num_courses, prereqs):
                graph = [[] for _ in range(num_courses)]
                indeg = [0] * num_courses
                for a, b in prereqs:
                    graph[b].append(a)
                    indeg[a] += 1
                q = deque(i for i in range(num_courses)
                          if indeg[i] == 0)
                taken = 0
                while q:
                    u = q.popleft()
                    taken += 1
                    for v in graph[u]:
                        indeg[v] -= 1
                        if indeg[v] == 0:
                            q.append(v)
                return taken == num_courses
          `,
          tests: [
            { call: 'can_finish(2, [[1, 0]])', expect: 'True' },
            { call: 'can_finish(2, [[1, 0], [0, 1]])', expect: 'False' },
            { call: 'can_finish(4, [[1, 0], [2, 0], [3, 1], [3, 2]])', expect: 'True', name: 'diamond' },
            { call: 'can_finish(3, [[0, 1], [1, 2], [2, 0]])', expect: 'False', hidden: true, name: '3-cycle' },
            { call: 'can_finish(3, [[1, 0], [1, 2], [2, 1]])', expect: 'False', hidden: true, name: 'a free course does not save a cycle' },
            { call: 'can_finish(1, [])', expect: 'True', hidden: true },
            { call: 'can_finish(3, [[0, 0]])', expect: 'False', hidden: true, name: 'self-prerequisite' },
            { call: 'can_finish(100000, CHAIN)', expect: 'True', hidden: true, maxMs: 600, name: 'chain of 100,000 courses' },
          ],
          hints: [
            'Edge direction: `[a, b]` means b → a. Count in-degrees.',
            'Run Kahn\'s algorithm and count how many courses you manage to take. Compare with `num_courses`.',
          ],
          wrong: [
            py`
              def can_finish(num_courses, prereqs):
                  pairs = {(a, b) for a, b in prereqs}
                  return not any((b, a) in pairs
                                 for a, b in pairs)
            `,
            py`
              def can_finish(num_courses, prereqs):
                  indeg = [0] * num_courses
                  for a, b in prereqs:
                      indeg[a] += 1
                  return 0 in indeg
            `,
            py`
              def can_finish(num_courses, prereqs):
                  graph = [[] for _ in range(num_courses)]
                  for a, b in prereqs:
                      graph[b].append(a)
                  state = [0] * num_courses

                  def cyclic(u):
                      state[u] = 1
                      for v in graph[u]:
                          if state[v] == 1:
                              return True
                          if state[v] == 0 and cyclic(v):
                              return True
                      state[u] = 2
                      return False

                  return not any(state[u] == 0 and cyclic(u)
                                 for u in range(num_courses))
            `,
          ],
          explain: md`
            **O(V + E) time and space.** A course becomes available once all its prerequisites are taken (in-degree 0). Courses on a cycle never become available, so \`taken < n\` means there's a cycle.

            Checking only mutual pairs misses longer cycles. "Some course has no prerequisites" doesn't mean all can be taken. The recursive DFS with colours is correct, but a 100,000-course chain blows Python's recursion limit. The same algorithm orders tasks in build systems and Airflow-style data pipelines.
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: cycle detection with DFS',
          prompt: md`
            \`has_cycle(graph)\` should return \`True\` if a **directed** graph (dict: node → list of neighbours) contains a cycle. It uses one \`visited\` set and shouts "cycle" whenever it meets a visited node. That's wrong: in the diamond \`a → b → d\`, \`a → c → d\`, node \`d\` is reached twice without any cycle (and the outer loop restarts DFS on finished nodes too).

            Fix it with **three states**: unvisited, *on the current path*, and *finished*. Only reaching a node that's **on the current path** means a cycle. Nodes with no outgoing edges may be missing from the dict.
          `,
          starter: py`
            def has_cycle(graph):
                visited = set()

                def dfs(u):
                    if u in visited:
                        return True
                    visited.add(u)
                    return any(dfs(v) for v in graph.get(u, []))

                return any(dfs(u) for u in graph)
          `,
          solution: py`
            def has_cycle(graph):
                state = {}  # 1 = on path, 2 = finished

                def dfs(u):
                    state[u] = 1
                    for v in graph.get(u, []):
                        if state.get(v) == 1:
                            return True
                        if v not in state and dfs(v):
                            return True
                    state[u] = 2
                    return False

                return any(u not in state and dfs(u)
                           for u in graph)
          `,
          tests: [
            { call: 'has_cycle({"a": ["b", "c"], "b": ["d"], "c": ["d"]})', expect: 'False', name: 'diamond' },
            { call: 'has_cycle({"a": ["b"], "b": ["c"], "c": ["a"]})', expect: 'True' },
            { call: 'has_cycle({"a": ["b"]})', expect: 'False', name: 'single edge' },
            { call: 'has_cycle({"a": ["a"]})', expect: 'True', hidden: true, name: 'self-loop' },
            { call: 'has_cycle({})', expect: 'False', hidden: true },
            { call: 'has_cycle({1: [2], 2: [], 3: [4], 4: [5], 5: [3]})', expect: 'True', hidden: true, name: 'cycle in a second component' },
            { call: 'has_cycle({1: [2, 3], 2: [3], 3: [4], 4: []})', expect: 'False', hidden: true },
            { call: 'has_cycle({i: [i + 1] for i in range(300)})', expect: 'False', hidden: true, name: 'long chain' },
          ],
          hints: [
            'Use a dict `state`: mark `1` when you enter a node, `2` when all its neighbours are done.',
            'Neighbour with state 1 → cycle. Neighbour with no state → recurse. State 2 → already fully explored, skip it.',
          ],
          wrong: [
            py`
              def has_cycle(graph):
                  on_path, done = set(), set()

                  def dfs(u):
                      on_path.add(u)
                      for v in graph.get(u, []):
                          if v in on_path:
                              return True
                          if v not in done and dfs(v):
                              return True
                      done.add(u)
                      return False

                  return any(u not in done and dfs(u)
                             for u in graph)
            `,
            py`
              def has_cycle(graph):
                  visited = set()

                  def dfs(u):
                      if u in visited:
                          return True
                      visited.add(u)
                      return any(dfs(v) for v in graph.get(u, []))

                  return dfs(next(iter(graph))) if graph else False
            `,
          ],
          explain: md`
            **O(V + E) time, O(V) space.** "On the current path" is what a cycle really means: you can walk from \`v\` back to \`v\`. A finished node can be reached many times through different paths (diamonds, shared dependencies) without any cycle.

            Forgetting to take nodes **off** the path when they finish (the first wrong version) brings back the diamond bug. Starting DFS from only one node misses cycles in other components. In undirected graphs the rule is different: there, any visited neighbour other than your parent closes a cycle.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u17-l5',
      title: 'Heaps',
      summary: 'heapq, max-heaps by negation, top-k, merging k sorted lists and the two-heap median.',
      steps: [
        {
          type: 'learn',
          title: 'heapq: a min-heap in a list',
          body: md`
            A **heap** always gives you its smallest item fast. Python's \`heapq\` keeps one inside a plain list:

            - \`heappush(h, x)\` and \`heappop(h)\`: O(log n)
            - \`h[0]\` peeks at the smallest: O(1)
            - \`heapify(lst)\` turns a list into a heap in **O(n)**

            There's only a **min**-heap. For a max-heap, push **negated** values. Tuples compare item by item, so \`(priority, task)\` works. \`nlargest(k, xs)\` and \`nsmallest\` are built on heaps.
          `,
          code: py`
            import heapq

            h = []
            for x in [5, 1, 8, 3]:
                heapq.heappush(h, x)
            print(h[0], heapq.heappop(h), heapq.heappop(h))

            prices = [20, 5, 50, 10]
            mx = [-p for p in prices]
            heapq.heapify(mx)
            print(-heapq.heappop(mx))  # the max
            print(heapq.nlargest(2, prices))
          `,
        },
        {
          type: 'output',
          prompt: 'Type the output exactly.',
          code: py`
            import heapq

            h = []
            heapq.heappush(h, (2, "write"))
            heapq.heappush(h, (1, "plan"))
            heapq.heappush(h, (2, "test"))
            heapq.heappush(h, (0, "coffee"))
            while h:
                p, task = heapq.heappop(h)
                print(task, end=" ")
          `,
          answer: 'coffee plan test write',
          explain: 'Tuples compare by the first item, and ties fall through to the second: `(2, "test") < (2, "write")` because "test" < "write" alphabetically. This is a priority queue, the structure behind schedulers and Dijkstra\'s algorithm.',
        },
        {
          type: 'choice',
          prompt: 'You need the top 10 of n = 10⁸ streaming scores. You keep a **min-heap of size k = 10**: push each score, and pop whenever the heap has more than 10 items. Time and memory?',
          options: ['O(n log k) time, O(k) memory', 'O(n log n) time, O(n) memory', 'O(k log n) time, O(1) memory', 'O(n) time, O(n) memory'],
          answer: 0,
          explain: md`
            Each score costs one push/pop on a heap of ≤ k + 1 items: O(log k). The heap's root is the **smallest of the current top k**, so anything smaller is thrown away at once.

            Sorting needs all n values in memory: O(n log n) and O(n). With k = 10 and data that doesn't fit in RAM, the heap wins easily. For small in-memory lists, \`sorted(xs)[-k:]\` is fine and often faster in Python because sorting runs in C.
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import heapq

            h = [5, 1, 4, 2, 3]
            heapq.heapify(h)
            print(h[0], h == sorted(h))
          `,
          options: ['1 False', '1 True', '5 False', '5 True'],
          answer: 0,
          checkOutput: true,
          explain: md`
            A heap only guarantees \`h[i] <= h[2i+1]\` and \`h[i] <= h[2i+2]\` (each parent ≤ its children). The smallest is at index 0, but the rest isn't sorted: here \`h\` is \`[1, 2, 4, 5, 3]\`. Never read \`h[1]\` as "the second smallest".
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: the most expensive items',
          prompt: md`
            \`top_prices(prices, k)\` should return the \`k\` largest prices, **largest first**. If there are fewer than \`k\` prices, return all of them (largest first). It uses a max-heap by negation, but it has two bugs. Fix them.

            \`\`\`python
            top_prices([20, 5, 50, 10], 2)  # [50, 20]
            \`\`\`
          `,
          starter: py`
            import heapq

            def top_prices(prices, k):
                h = [-p for p in prices]
                heapq.heapify(h)
                return [heapq.heappop(h) for _ in range(k)]
          `,
          solution: py`
            import heapq

            def top_prices(prices, k):
                h = [-p for p in prices]
                heapq.heapify(h)
                k = min(k, len(h))
                return [-heapq.heappop(h) for _ in range(k)]
          `,
          tests: [
            { call: 'top_prices([20, 5, 50, 10], 2)', expect: '[50, 20]' },
            { call: 'top_prices([3, 3, 1], 2)', expect: '[3, 3]', name: 'duplicates' },
            { call: 'top_prices([7], 3)', expect: '[7]', name: 'k larger than the list' },
            { call: 'top_prices([], 1)', expect: '[]', hidden: true },
            { call: 'top_prices([4, 1, 9], 0)', expect: '[]', hidden: true },
            { call: 'top_prices([2.5, -1, 8], 3)', expect: '[8, 2.5, -1]', hidden: true },
          ],
          hints: [
            'The heap stores negated prices. What do you need to do to each popped value?',
            'Popping from an empty heap raises `IndexError`. Pop at most `len(h)` times.',
          ],
          wrong: [
            py`
              import heapq

              def top_prices(prices, k):
                  h = [-p for p in prices]
                  heapq.heapify(h)
                  return [-heapq.heappop(h) for _ in range(k)]
            `,
            py`
              import heapq

              def top_prices(prices, k):
                  h = list(prices)
                  heapq.heapify(h)
                  return [heapq.heappop(h)
                          for _ in range(min(k, len(h)))]
            `,
          ],
          explain: md`
            **O(n + k log n) time, O(n) space**: heapify is O(n), then k pops at O(log n) each. Negate on the way in **and** on the way out. Forgetting the second negation is the most common heapq bug.

            One-liner alternative: \`heapq.nlargest(k, prices)\`, which already handles k > n.
          `,
        },
        {
          type: 'code',
          title: 'K-th largest element',
          prompt: md`
            Write \`kth_largest(nums, k)\` that returns the k-th largest element **in sorted order** (not the k-th distinct value). \`1 <= k <= len(nums)\`.

            \`\`\`python
            kth_largest([3, 2, 1, 5, 6, 4], 2)           # 5
            kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)  # 4
            \`\`\`

            Don't sort: keep a **min-heap of the k largest** seen so far, O(n log k).
          `,
          starter: 'def kth_largest(nums, k):\n    pass\n',
          solution: py`
            import heapq

            def kth_largest(nums, k):
                h = []
                for x in nums:
                    heapq.heappush(h, x)
                    if len(h) > k:
                        heapq.heappop(h)
                return h[0]
          `,
          tests: [
            { call: 'kth_largest([3, 2, 1, 5, 6, 4], 2)', expect: '5' },
            { call: 'kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)', expect: '4', name: 'duplicates count' },
            { call: 'kth_largest([1], 1)', expect: '1', hidden: true },
            { call: 'kth_largest([-1, -1], 2)', expect: '-1', hidden: true },
            { call: 'kth_largest([7, 7, 7, 2], 3)', expect: '7', hidden: true },
            { call: 'kth_largest([9, 3, 5], 3)', expect: '3', hidden: true, name: 'k == n (the minimum)' },
          ],
          forbid: ['sorted', 'sort'],
          hints: [
            'Push every number onto a heap; whenever it has more than k items, pop the smallest.',
            'At the end the heap holds the k largest, and its root `h[0]` is the smallest of them: the k-th largest.',
          ],
          wrong: [
            py`
              import heapq

              def kth_largest(nums, k):
                  return heapq.nlargest(k, set(nums))[-1]
            `,
            py`
              import heapq

              def kth_largest(nums, k):
                  return heapq.nsmallest(k, nums)[-1]
            `,
            py`
              import heapq

              def kth_largest(nums, k):
                  h = []
                  for x in nums:
                      heapq.heappush(h, x)
                      if len(h) >= k:
                          heapq.heappop(h)
                  return h[0]
            `,
          ],
          explain: md`
            **O(n log k) time, O(k) space.** The size-k min-heap is a "bouncer": its root is the weakest member of the current top k, and anything smaller never gets in.

            \`heapq.nlargest(k, nums)[-1]\` is a correct one-liner. Removing duplicates with \`set\` answers a different question (k-th **distinct**). Quickselect does this in O(n) on average and is a good follow-up to mention.
          `,
        },
        {
          type: 'code',
          title: 'Top k frequent elements',
          prompt: md`
            Write \`top_k_frequent(nums, k)\` that returns the \`k\` most frequent values, **in any order**. The answer is guaranteed to be unique.

            \`\`\`python
            top_k_frequent([1, 1, 1, 2, 2, 3], 2)  # [1, 2]
            \`\`\`

            Up to 10⁵ numbers with many distinct values: \`nums.count(x)\` for every distinct x is far too slow.
          `,
          setup: py`
            import random
            _r = random.Random(11)
            BIGF = ([i % 5000 for i in range(50000)]
                    + [7] * 50 + [42] * 40 + [4999] * 30)
            _r.shuffle(BIGF)
          `,
          starter: 'def top_k_frequent(nums, k):\n    pass\n',
          solution: py`
            import heapq
            from collections import Counter

            def top_k_frequent(nums, k):
                counts = Counter(nums)
                return heapq.nlargest(k, counts,
                                      key=counts.get)
          `,
          tests: [
            { call: 'top_k_frequent([1, 1, 1, 2, 2, 3], 2)', expect: '[1, 2]', unordered: true },
            { call: 'top_k_frequent([1], 1)', expect: '[1]', unordered: true },
            { call: 'top_k_frequent([4, 4, -1, -1, -1, 2], 1)', expect: '[-1]', unordered: true, hidden: true },
            { call: 'top_k_frequent([5, 3, 5, 3, 5, 7, 3, 3], 2)', expect: '[3, 5]', unordered: true, hidden: true },
            { call: 'top_k_frequent([9, 8, 7, 9, 8, 9], 3)', expect: '[7, 8, 9]', unordered: true, hidden: true, name: 'k == number of distinct values' },
            { call: 'top_k_frequent(BIGF, 3)', expect: '[7, 42, 4999]', unordered: true, hidden: true, maxMs: 100, name: '60,000 numbers, 5000 distinct' },
          ],
          hints: [
            'Count first: `Counter(nums)` is O(n).',
            'Then take the k keys with the largest counts: `heapq.nlargest(k, counts, key=counts.get)`.',
          ],
          wrong: [
            py`
              def top_k_frequent(nums, k):
                  return sorted(set(nums), key=nums.count,
                                reverse=True)[:k]
            `,
            py`
              from collections import Counter

              def top_k_frequent(nums, k):
                  return Counter(nums).most_common(k)
            `,
            py`
              import heapq

              def top_k_frequent(nums, k):
                  return heapq.nlargest(k, set(nums))
            `,
          ],
          explain: md`
            **O(n + d log k) time, O(d) space** (d = distinct values). Count with a hash map, then a size-k heap over the d counts.

            \`most_common(k)\` is fine too, but it returns \`(value, count)\` pairs, so take \`[x for x, _ in ...]\`. \`nums.count\` inside a sort key rescans the list once per distinct value: O(n·d), 3·10⁸ steps here. Bucket sort by frequency gets O(n). "Top-k heavy hitters" over click logs is a staple big-data question.
          `,
        },
        {
          type: 'learn',
          title: 'Merge k sorted lists',
          body: md`
            You have k sorted lists and want one sorted output. Put the **first element of each list** into a heap as \`(value, list_index, position)\`. Pop the smallest, output it, and push the **next** element from the same list.

            The heap never holds more than k items, so N elements cost **O(N log k)**. The list index in the tuple also breaks ties, so Python never has to compare anything it can't. This is how databases merge sorted runs in external sorting.
          `,
          code: py`
            import heapq

            lists = [[1, 4, 7], [2, 5], [0, 9]]
            print(list(heapq.merge(*lists)))

            h = [(lst[0], i, 0) for i, lst in enumerate(lists)]
            heapq.heapify(h)
            val, i, j = heapq.heappop(h)
            print(val, "came from list", i)
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete the k-way merge of Python lists.',
          code: py`
            import heapq

            def merge_k(lists):
                h = [(lst[0], i, 0)
                     for i, lst in enumerate(lists) if lst]
                heapq.heapify(h)
                out = []
                while h:
                    val, i, j = heapq.___(h)
                    out.append(val)
                    if j + 1 < len(lists[i]):
                        nxt = (lists[i][___], i, j + 1)
                        heapq.heappush(h, nxt)
                return out
          `,
          bank: ['heappop', 'j + 1', 'heappush', 'j', 'i + 1', 'heapify'],
          answer: ['heappop', 'j + 1'],
          tests: [
            { call: 'merge_k([[1, 4, 7], [2, 5], [0, 9]])', expect: '[0, 1, 2, 4, 5, 7, 9]' },
            { call: 'merge_k([[], [3], []])', expect: '[3]' },
          ],
          explain: 'Pop the smallest head, then refill the heap from the same list at position `j + 1`. Empty lists are skipped up front, so they never enter the heap.',
        },
        {
          type: 'code',
          title: 'Merge k sorted linked lists',
          prompt: md`
            LeetCode's version: \`lists\` is a Python list of **linked-list heads** (each list sorted ascending, any may be \`None\`). Write \`merge_k_lists(lists)\` that splices all nodes into one sorted linked list and returns its head.

            \`\`\`python
            h = merge_k_lists([build([1, 4, 5]),
                               build([1, 3, 4]),
                               build([2, 6])])
            to_list(h)  # [1, 1, 2, 3, 4, 4, 5, 6]
            \`\`\`

            \`ListNode\`, \`build\` and \`to_list\` are available. Use a heap: no sorting allowed, and one test merges 2000 lists.
          `,
          setup: LL + '\n\n' + py`
            import random

            def digest(head):
                # reads the list and unlinks it as it goes:
                # freeing a long chain recursively can
                # overflow the browser's stack
                n = s = 0
                prev = None
                ok = True
                while head is not None and n <= 10**6:
                    if prev is not None and head.val < prev:
                        ok = False
                    prev = head.val
                    n += 1
                    s += head.val
                    head.next, head = None, head.next
                return (n, s) if ok else -1

            def unlink_all(heads):
                for node in heads:
                    while node is not None:
                        node.next, node = None, node.next

            def make_k(k, m, seed):
                r = random.Random(seed)
                return [build(sorted(r.randrange(10**6)
                                     for _ in range(m)))
                        for _ in range(k)]

            BK = make_k(2000, 30, 2)
          `,
          starter: 'def merge_k_lists(lists):\n    pass\n',
          solution: py`
            import heapq

            def merge_k_lists(lists):
                h = [(node.val, i, node)
                     for i, node in enumerate(lists) if node]
                heapq.heapify(h)
                dummy = tail = ListNode(0)
                while h:
                    val, i, node = heapq.heappop(h)
                    tail.next = node
                    tail = node
                    if node.next:
                        nxt = node.next
                        heapq.heappush(h, (nxt.val, i, nxt))
                return dummy.next
          `,
          tests: [
            { call: 'to_list(merge_k_lists([build([1, 4, 5]), build([1, 3, 4]), build([2, 6])]))', expect: '[1, 1, 2, 3, 4, 4, 5, 6]' },
            { call: 'merge_k_lists([])', expect: 'None' },
            { call: 'merge_k_lists([None, None])', expect: 'None', hidden: true },
            { call: 'to_list(merge_k_lists([None, build([2]), build([-1, 2, 2])]))', expect: '[-1, 2, 2, 2]', hidden: true, name: 'ties and empty lists' },
            { call: 'to_list(merge_k_lists([build([5, 6, 7])]))', expect: '[5, 6, 7]', hidden: true },
            { code: 'try:\n    got = digest(merge_k_lists(BK))\nfinally:\n    unlink_all(BK)\nassert got == (60000, 29967411478), got', hidden: true, maxMs: 250, name: '2000 lists, 60,000 nodes' },
          ],
          forbid: ['sorted', 'sort'],
          hints: [
            'Heap entries: `(node.val, i, node)`. The index `i` breaks ties, because `ListNode` objects can\'t be compared with `<`.',
            'Pop the smallest, attach it to `tail`, and push its `next` node (if any) with the same `i`.',
          ],
          wrong: [
            py`
              def merge_k_lists(lists):
                  lists = list(lists)
                  dummy = tail = ListNode(0)
                  while True:
                      best = -1
                      for i, node in enumerate(lists):
                          if node and (best < 0 or
                                       node.val < lists[best].val):
                              best = i
                      if best < 0:
                          break
                      node = lists[best]
                      lists[best] = node.next
                      tail.next = node
                      tail = node
                  return dummy.next
            `,
            py`
              import heapq

              def merge_k_lists(lists):
                  h = [(node.val, node)
                       for node in lists if node]
                  heapq.heapify(h)
                  dummy = tail = ListNode(0)
                  while h:
                      val, node = heapq.heappop(h)
                      tail.next = node
                      tail = node
                      if node.next:
                          heapq.heappush(h, (node.next.val,
                                             node.next))
                  return dummy.next
            `,
          ],
          explain: md`
            **O(N log k) time, O(k) extra space** (N nodes in k lists). The heap holds one candidate per list, so each pop/push is O(log k).

            Scanning all k heads for the minimum at every step is O(N·k): 6·10⁷ comparisons here. Leaving out the index makes ties compare \`ListNode\` objects and crash with \`TypeError\`. Merging lists pairwise (like merge sort) is another O(N log k) answer worth mentioning.
          `,
        },
        {
          type: 'learn',
          title: 'Median of a stream: two heaps',
          body: md`
            Keep the **smaller half** of the numbers in a max-heap \`lo\` (stored negated) and the **larger half** in a min-heap \`hi\`. Invariants: everything in \`lo\` ≤ everything in \`hi\`, and \`len(lo)\` is \`len(hi)\` or one more.

            **Add x**: push it into \`lo\`, move \`lo\`'s largest over to \`hi\`, and if \`hi\` is now bigger, move its smallest back. **Median**: \`-lo[0]\` for an odd count, otherwise the average of the two tops.

            Add is O(log n) and median is O(1).
          `,
          code: py`
            import heapq

            lo, hi = [], []  # lo holds negatives
            for x in [5, 15, 1, 3]:
                heapq.heappush(lo, -x)
                heapq.heappush(hi, -heapq.heappop(lo))
                if len(hi) > len(lo):
                    heapq.heappush(lo, -heapq.heappop(hi))
                print(sorted(-v for v in lo), sorted(hi))
          `,
        },
        {
          type: 'order',
          prompt: 'Arrange the `add` method of the two-heap median finder (`self.lo` holds negated values).',
          lines: [
            'def add(self, x):',
            '    heapq.heappush(self.lo, -x)',
            '    top = -heapq.heappop(self.lo)',
            '    heapq.heappush(self.hi, top)',
            '    if len(self.hi) > len(self.lo):',
            '        back = heapq.heappop(self.hi)',
            '        heapq.heappush(self.lo, -back)',
          ],
          distractors: ['    heapq.heappush(self.hi, -top)', '    if len(self.lo) > len(self.hi):'],
          tests: [
            { code: 'import heapq\nclass M:\n    pass\nm = M()\nm.lo, m.hi = [], []\nfor v in [5, 15, 1, 3]:\n    add(m, v)\nassert sorted(-v for v in m.lo) == [1, 3]\nassert sorted(m.hi) == [5, 15]\nadd(m, 8)\nassert -m.lo[0] == 5', name: 'keeps both halves balanced' },
          ],
          explain: 'Routing every new value through `lo` and then handing `lo`\'s maximum to `hi` guarantees that every value in `lo` is ≤ every value in `hi`. The final `if` restores the size rule: `lo` may be ahead by at most one.',
        },
        {
          type: 'code',
          title: 'Median finder',
          prompt: md`
            Implement \`MedianFinder\` with:

            - \`add(num)\`: add an integer from the stream
            - \`median()\`: return the median of everything added so far, as a **float** (the average of the two middle values for an even count)

            \`add\` must be O(log n) and \`median\` O(1). \`median\` is only called after at least one \`add\`. A \`run_ops(cls, ops)\` helper exists.

            \`\`\`python
            run_ops(MedianFinder, [("add", 1), ("add", 2),
                    ("median",), ("add", 3), ("median",)])
            # [None, None, 1.5, None, 2.0]
            \`\`\`
          `,
          setup: OPS + '\n\n' + py`
            def mstress(cls, n):
                m = cls()
                total = 0.0
                for i in range(n):
                    m.add((i * 7919) % 10007)
                    total += m.median()
                return total
          `,
          starter: py`
            import heapq

            class MedianFinder:
                def __init__(self):
                    pass

                def add(self, num):
                    pass

                def median(self):
                    pass
          `,
          solution: py`
            import heapq

            class MedianFinder:
                def __init__(self):
                    self.lo = []  # max-heap (negated)
                    self.hi = []  # min-heap

                def add(self, num):
                    heapq.heappush(self.lo, -num)
                    top = -heapq.heappop(self.lo)
                    heapq.heappush(self.hi, top)
                    if len(self.hi) > len(self.lo):
                        back = heapq.heappop(self.hi)
                        heapq.heappush(self.lo, -back)

                def median(self):
                    if len(self.lo) > len(self.hi):
                        return float(-self.lo[0])
                    return (-self.lo[0] + self.hi[0]) / 2
          `,
          tests: [
            { call: 'run_ops(MedianFinder, [("add", 1), ("add", 2), ("median",), ("add", 3), ("median",)])', expect: '[None, None, 1.5, None, 2.0]' },
            { call: 'run_ops(MedianFinder, [("add", 5), ("median",)])', expect: '[None, 5.0]' },
            { call: 'run_ops(MedianFinder, [("add", 6), ("add", 10), ("add", 2), ("add", 6), ("median",), ("add", 5), ("median",)])', expect: '[None, None, None, None, 6.0, None, 6.0]', hidden: true },
            { call: 'run_ops(MedianFinder, [("add", -1), ("add", -2), ("median",), ("add", -3), ("median",), ("add", -4), ("median",)])', expect: '[None, None, -1.5, None, -2.0, None, -2.5]', hidden: true, name: 'negatives' },
            { call: 'run_ops(MedianFinder, [("add", 3), ("add", 1), ("add", 2), ("add", 4), ("median",)])', expect: '[None, None, None, None, 2.5]', hidden: true },
            { call: 'mstress(MedianFinder, 15000)', expect: '75078938.0', hidden: true, maxMs: 150, name: '15,000 adds, a median after each' },
          ],
          hints: [
            'Two heaps: `lo` (negated, the smaller half) and `hi` (the larger half). Keep `len(lo)` equal to `len(hi)` or one more.',
            'Use the `add` from the previous step. Then the median is `-lo[0]` for an odd count, else `(-lo[0] + hi[0]) / 2`.',
          ],
          wrong: [
            py`
              class MedianFinder:
                  def __init__(self):
                      self.nums = []

                  def add(self, num):
                      self.nums.append(num)

                  def median(self):
                      s = sorted(self.nums)
                      n = len(s)
                      if n % 2:
                          return float(s[n // 2])
                      return (s[n // 2 - 1] + s[n // 2]) / 2
            `,
            py`
              import heapq

              class MedianFinder:
                  def __init__(self):
                      self.h = []

                  def add(self, num):
                      heapq.heappush(self.h, num)

                  def median(self):
                      n = len(self.h)
                      if n % 2:
                          return float(self.h[n // 2])
                      return (self.h[n // 2 - 1] + self.h[n // 2]) / 2
            `,
            py`
              import heapq

              class MedianFinder:
                  def __init__(self):
                      self.lo = []
                      self.hi = []

                  def add(self, num):
                      heapq.heappush(self.lo, -num)
                      top = -heapq.heappop(self.lo)
                      heapq.heappush(self.hi, top)
                      if len(self.hi) > len(self.lo):
                          back = heapq.heappop(self.hi)
                          heapq.heappush(self.lo, -back)

                  def median(self):
                      if len(self.lo) > len(self.hi):
                          return float(-self.lo[0])
                      return float((-self.lo[0] + self.hi[0]) // 2)
            `,
          ],
          explain: md`
            **add O(log n), median O(1), O(n) space.** The two heap tops are exactly the middle of the sorted data, without ever sorting it.

            Sorting on every \`median()\` call is O(n log n) per query, about 10⁹ steps for this stream. A single heap is **not sorted**, so \`h[n // 2]\` isn't the median. \`//\` turns the median of 1 and 2 into 1.0 instead of 1.5. \`bisect.insort\` into a sorted list is a decent fallback (O(n) per add, but a fast memmove), and worth discussing in an interview.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u17-l6',
      title: 'Dynamic Programming & Backtracking',
      summary: 'Memo to tables, 1-D and 2-D DP recipes, and choose / explore / un-choose.',
      steps: [
        {
          type: 'learn',
          title: 'Recursion → memo → table',
          body: md`
            **Dynamic programming** = recursion whose subproblems repeat, solved once each.

            1. Write the plain recursion: \`fib(n) = fib(n-1) + fib(n-2)\`. Correct, but it recomputes the same values exponentially often.
            2. **Memoise** it (\`@lru_cache\`): every \`n\` is computed once → O(n).
            3. **Tabulate**: fill answers from small to large in a loop. No recursion, so no recursion limit, and often O(1) memory.
          `,
          code: py`
            from functools import lru_cache

            calls = 0
            def fib(n):
                global calls
                calls += 1
                if n < 2:
                    return n
                return fib(n - 1) + fib(n - 2)
            print(fib(20), calls)

            @lru_cache(maxsize=None)
            def fib_memo(n):
                if n < 2:
                    return n
                return fib_memo(n - 1) + fib_memo(n - 2)
            print(fib_memo(90))

            def fib_table(n):
                a, b = 0, 1
                for _ in range(n):
                    a, b = b, a + b
                return a
            print(fib_table(90))
          `,
        },
        {
          type: 'choice',
          prompt: 'How does the number of calls made by the **plain** recursive `fib(n)` grow?',
          options: ['Exponentially (about 1.6ⁿ)', 'Linearly, O(n)', 'Quadratically, O(n²)', 'O(n log n)'],
          answer: 0,
          explain: md`
            Each call spawns two more, and the tree of calls has about φⁿ ≈ 1.6ⁿ nodes: \`fib(20)\` already makes 21,891 calls, and \`fib(50)\` would take hours. Memoisation collapses the tree to one call per distinct \`n\`, which is **O(n) time and O(n) space**. The loop version is O(n) time and **O(1) space**.
          `,
        },
        {
          type: 'code',
          title: 'Climbing stairs',
          prompt: md`
            You climb a staircase of \`n\` steps, taking **1 or 2 steps** at a time. Write \`climb_stairs(n)\` that returns the number of distinct ways to reach the top. \`1 <= n <= 90\`.

            \`\`\`python
            climb_stairs(3)  # 3: 1+1+1, 1+2, 2+1
            \`\`\`
          `,
          starter: 'def climb_stairs(n):\n    pass\n',
          solution: py`
            def climb_stairs(n):
                a, b = 1, 1  # ways(0), ways(1)
                for _ in range(n - 1):
                    a, b = b, a + b
                return b
          `,
          tests: [
            { call: 'climb_stairs(1)', expect: '1' },
            { call: 'climb_stairs(2)', expect: '2' },
            { call: 'climb_stairs(3)', expect: '3' },
            { call: 'climb_stairs(10)', expect: '89', hidden: true },
            { call: 'climb_stairs(45)', expect: '1836311903', hidden: true },
            { call: 'climb_stairs(38)', expect: '63245986', hidden: true, maxMs: 100, name: 'no exponential recursion' },
          ],
          hints: [
            'The last move was either 1 step (from n - 1) or 2 steps (from n - 2): `ways(n) = ways(n-1) + ways(n-2)`.',
            'Keep just the last two values in a loop, like `fib_table`. Base cases: `ways(0) = ways(1) = 1`.',
          ],
          wrong: [
            py`
              def climb_stairs(n):
                  if n <= 1:
                      return 1
                  return climb_stairs(n - 1) + climb_stairs(n - 2)
            `,
            py`
              def climb_stairs(n):
                  a, b = 0, 1
                  for _ in range(n - 1):
                      a, b = b, a + b
                  return b
            `,
          ],
          explain: md`
            **O(n) time, O(1) space.** It's Fibonacci in disguise: to stand on step n, your last move came from n − 1 or from n − 2, so the counts add up.

            The plain recursion gives the right answer but makes ~10⁸ calls for n = 38. \`@lru_cache\` fixes the speed. The two-variable loop also avoids deep recursion. That matters in this browser: Pyodide can crash on very deep \`lru_cache\` recursion (a few hundred levels), so prefer tables for big inputs.
          `,
        },
        {
          type: 'learn',
          title: 'The DP recipe',
          body: md`
            1. **State**: what does \`dp[i]\` mean, in words?
            2. **Recurrence**: how does \`dp[i]\` follow from smaller states?
            3. **Base cases** and the **fill order**.

            **House robber** (no two adjacent houses): \`dp[i]\` = best loot from the first i houses = \`max(dp[i-1], dp[i-2] + nums[i-1])\`. Either skip house i, or rob it on top of the best from two houses back.

            **Coin change**: \`dp[a]\` = fewest coins that make amount a = \`1 + min(dp[a - c])\` over coins \`c <= a\`, with \`dp[0] = 0\` and "impossible" stored as infinity.
          `,
          code: py`
            nums = [2, 7, 9, 3, 1]
            dp = [0] * (len(nums) + 1)
            dp[1] = nums[0]
            for i in range(2, len(nums) + 1):
                dp[i] = max(dp[i - 1], dp[i - 2] + nums[i - 1])
            print(dp)
          `,
        },
        {
          type: 'blanks',
          prompt: 'House robber with O(1) memory: `prev` and `cur` are the best totals up to two houses back and one house back.',
          code: py`
            def rob(nums):
                prev, cur = 0, 0
                for x in nums:
                    prev, cur = cur, ___(cur, prev ___ x)
                return cur
          `,
          bank: ['max', '+', 'min', '-', 'sum', '*'],
          answer: ['max', '+'],
          tests: [
            { call: 'rob([2, 7, 9, 3, 1])', expect: '12' },
            { call: 'rob([2, 1, 1, 2])', expect: '4' },
            { call: 'rob([])', expect: '0' },
          ],
          explain: 'For each house, either skip it (keep `cur`) or rob it on top of the best total from two houses back (`prev + x`). Only the last two states are ever needed, so the table shrinks to two variables.',
        },
        {
          type: 'code',
          title: 'House robber on a circle',
          prompt: md`
            The houses now stand in a **circle**: the first and the last house are neighbours. You still can't rob two adjacent houses. Write \`rob_circle(nums)\` that returns the maximum loot (\`nums\` are non-negative, up to 100 houses, possibly none).

            \`\`\`python
            rob_circle([2, 3, 2])     # 3
            rob_circle([1, 2, 3, 1])  # 4
            \`\`\`
          `,
          setup: RAND,
          starter: 'def rob_circle(nums):\n    pass\n',
          solution: py`
            def rob_line(nums):
                prev, cur = 0, 0
                for x in nums:
                    prev, cur = cur, max(cur, prev + x)
                return cur

            def rob_circle(nums):
                if len(nums) == 1:
                    return nums[0]
                return max(rob_line(nums[1:]),
                           rob_line(nums[:-1]))
          `,
          tests: [
            { call: 'rob_circle([2, 3, 2])', expect: '3', name: 'first and last are neighbours' },
            { call: 'rob_circle([1, 2, 3, 1])', expect: '4' },
            { call: 'rob_circle([5])', expect: '5', hidden: true, name: 'one house' },
            { call: 'rob_circle([])', expect: '0', hidden: true },
            { call: 'rob_circle([200, 3, 140, 20, 10])', expect: '340', hidden: true },
            { call: 'rob_circle([4, 1, 2, 7, 5, 3, 1])', expect: '14', hidden: true },
            { call: 'rob_circle(rand_list(100, 3, 0, 1000))', hidden: true, maxMs: 200, name: '100 houses' },
          ],
          hints: [
            'You can never rob both the first and the last house. So either the first is excluded, or the last is.',
            'Run the straight-line robber on `nums[1:]` and on `nums[:-1]`, and take the max. A single house is a special case.',
          ],
          wrong: [
            py`
              def rob_circle(nums):
                  prev, cur = 0, 0
                  for x in nums:
                      prev, cur = cur, max(cur, prev + x)
                  return cur
            `,
            py`
              def rob_line(nums):
                  prev, cur = 0, 0
                  for x in nums:
                      prev, cur = cur, max(cur, prev + x)
                  return cur

              def rob_circle(nums):
                  return max(rob_line(nums[1:]),
                             rob_line(nums[:-1]))
            `,
          ],
          explain: md`
            **O(n) time, O(n) space** for the slices (O(1) with index ranges). Breaking the circle into two straight lines is the key insight: every valid plan skips the first house or the last one (or both), and each line is the problem you already solved.

            Without the special case, one house becomes two empty lines and the answer 0. "Reduce to a solved problem" is exactly the move interviewers look for.
          `,
        },
        {
          type: 'code',
          title: 'Coin change',
          prompt: md`
            Write \`coin_change(coins, amount)\` that returns the **fewest** coins needed to make \`amount\`, with unlimited coins of each value, or \`-1\` if it can't be done. \`amount = 0\` needs 0 coins.

            \`\`\`python
            coin_change([1, 2, 5], 11)  # 3 (5 + 5 + 1)
            coin_change([2], 3)         # -1
            \`\`\`

            Careful: always taking the biggest coin is **not** optimal for every coin set.
          `,
          starter: 'def coin_change(coins, amount):\n    pass\n',
          solution: py`
            def coin_change(coins, amount):
                INF = float("inf")
                dp = [0] + [INF] * amount
                for a in range(1, amount + 1):
                    for c in coins:
                        if c <= a and dp[a - c] + 1 < dp[a]:
                            dp[a] = dp[a - c] + 1
                return dp[amount] if dp[amount] < INF else -1
          `,
          tests: [
            { call: 'coin_change([1, 2, 5], 11)', expect: '3' },
            { call: 'coin_change([2], 3)', expect: '-1' },
            { call: 'coin_change([1], 0)', expect: '0' },
            { call: 'coin_change([1, 3, 4], 6)', expect: '2', hidden: true, name: 'greedy fails: 3 + 3 beats 4 + 1 + 1' },
            { call: 'coin_change([186, 419, 83, 408], 6249)', expect: '20', hidden: true },
            { call: 'coin_change([3, 7], 5)', expect: '-1', hidden: true },
            { call: 'coin_change([2, 5, 10, 1], 27)', expect: '4', hidden: true },
            { call: 'coin_change([1, 2, 5], 120)', expect: '24', hidden: true, maxMs: 300, name: 'no exponential search' },
          ],
          hints: [
            '`dp[a]` = fewest coins for amount `a`. Start with `dp[0] = 0` and everything else infinity.',
            'For each amount `a` from 1 up, try every coin `c <= a`: `dp[a] = min(dp[a], dp[a - c] + 1)`.',
            'Convert "still infinity" to -1 at the end.',
          ],
          wrong: [
            py`
              def coin_change(coins, amount):
                  count = 0
                  for c in sorted(coins, reverse=True):
                      count += amount // c
                      amount %= c
                  return count if amount == 0 else -1
            `,
            py`
              def coin_change(coins, amount):
                  INF = float("inf")
                  dp = [0] + [INF] * amount
                  for a in range(1, amount + 1):
                      for c in coins:
                          if c <= a:
                              dp[a] = min(dp[a], dp[a - c] + 1)
                  return dp[amount]
            `,
            py`
              def coin_change(coins, amount):
                  dp = [0] * (amount + 1)
                  for a in range(1, amount + 1):
                      for c in coins:
                          if c <= a:
                              dp[a] = min(dp[a], dp[a - c] + 1)
                  return dp[amount]
            `,
          ],
          explain: md`
            **O(amount · k) time, O(amount) space** for k coin types. Every amount looks at its best "last coin". Bottom-up order guarantees \`dp[a - c]\` is final before you use it.

            Greedy works for euro coins but not for \`[1, 3, 4]\`. Forgetting to map infinity to -1 returns \`inf\`. Initialising with 0 instead of infinity makes every amount look free. This is the **unbounded knapsack** pattern, the same one behind "minimum number of servers" or "fewest API calls" problems.
          `,
        },
        {
          type: 'order',
          prompt: md`
            **Longest increasing subsequence** (strictly increasing, elements need not be adjacent). Let \`dp[i]\` be the length of the longest one **ending at index i**: 1 plus the best \`dp[j]\` over earlier \`j\` with \`nums[j] < nums[i]\`. Arrange the O(n²) solution.
          `,
          lines: [
            'def lis(nums):',
            '    dp = [1] * len(nums)',
            '    for i in range(len(nums)):',
            '        for j in range(i):',
            '            if nums[j] < nums[i]:',
            '                dp[i] = max(dp[i], dp[j] + 1)',
            '    return max(dp, default=0)',
          ],
          distractors: ['            if nums[j] <= nums[i]:', '    return dp[-1]'],
          tests: [
            { call: 'lis([10, 9, 2, 5, 3, 7, 101, 18])', expect: '4' },
            { call: 'lis([7, 7, 7])', expect: '1' },
            { call: 'lis([])', expect: '0' },
            { call: 'lis([3, 1, 2])', expect: '2' },
          ],
          explain: md`
            **O(n²) time, O(n) space.** The answer is the **max over all endings**, not \`dp[-1]\`: the longest run may end before the last element. \`<=\` would allow equal values, which isn't strictly increasing.

            Interview follow-up: O(n log n). Keep \`tails[k]\` = the smallest possible tail of an increasing subsequence of length k + 1. For each x, \`bisect_left(tails, x)\` finds the slot to overwrite (or append). \`len(tails)\` is the answer.
          `,
        },
        {
          type: 'learn',
          title: '2-D DP on two strings',
          body: md`
            For two strings, the state is a pair of prefixes: \`dp[i][j]\` = the answer for \`a[:i]\` and \`b[:j]\`. Row 0 and column 0 are the empty prefixes.

            **Longest common subsequence**: if \`a[i-1] == b[j-1]\`, extend the diagonal: \`dp[i-1][j-1] + 1\`. Otherwise drop a character from one string: \`max(dp[i-1][j], dp[i][j-1])\`.

            Fill row by row: O(m·n) time and space. **Edit distance** uses the same grid, with a min over three moves.
          `,
          code: py`
            a, b = "abcde", "ace"
            dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
            for i in range(1, len(a) + 1):
                for j in range(1, len(b) + 1):
                    if a[i - 1] == b[j - 1]:
                        dp[i][j] = dp[i - 1][j - 1] + 1
                    else:
                        dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
            print(dp[-1][-1])
            for row in dp:
                print(row)
          `,
        },
        {
          type: 'output',
          prompt: 'Fill the LCS table in your head. What does this print?',
          code: py`
            a, b = "abc", "acb"
            dp = [[0] * 4 for _ in range(4)]
            for i in range(1, 4):
                for j in range(1, 4):
                    if a[i - 1] == b[j - 1]:
                        dp[i][j] = dp[i - 1][j - 1] + 1
                    else:
                        dp[i][j] = max(dp[i - 1][j],
                                       dp[i][j - 1])
            print(dp[-1][-1], dp[2])
          `,
          answer: '2 [0, 1, 1, 2]',
          explain: 'Row 2 compares the prefix "ab" with "", "a", "ac", "acb": the LCS lengths are 0, 1, 1, 2 ("ab" ⊂ "acb"). The full LCS of "abc" and "acb" has length 2, for example "ab" or "ac".',
        },
        {
          type: 'code',
          title: 'Edit distance',
          prompt: md`
            Write \`edit_distance(a, b)\` that returns the minimum number of single-character **inserts, deletes or replacements** that turn \`a\` into \`b\` (the Levenshtein distance). Strings have up to 100 characters.

            \`\`\`python
            edit_distance("horse", "ros")  # 3
            # horse → rorse → rose → ros
            \`\`\`
          `,
          setup: py`
            import random
            _r = random.Random(4)
            S1 = "".join(_r.choice("acgt") for _ in range(60))
            S2 = "".join(_r.choice("acgt") for _ in range(60))
          `,
          starter: 'def edit_distance(a, b):\n    pass\n',
          solution: py`
            def edit_distance(a, b):
                m, n = len(a), len(b)
                dp = [[0] * (n + 1) for _ in range(m + 1)]
                for i in range(m + 1):
                    dp[i][0] = i
                for j in range(n + 1):
                    dp[0][j] = j
                for i in range(1, m + 1):
                    for j in range(1, n + 1):
                        if a[i - 1] == b[j - 1]:
                            dp[i][j] = dp[i - 1][j - 1]
                        else:
                            dp[i][j] = 1 + min(dp[i - 1][j],
                                               dp[i][j - 1],
                                               dp[i - 1][j - 1])
                return dp[m][n]
          `,
          tests: [
            { call: 'edit_distance("horse", "ros")', expect: '3' },
            { call: 'edit_distance("intention", "execution")', expect: '5' },
            { call: 'edit_distance("", "")', expect: '0' },
            { call: 'edit_distance("", "abc")', expect: '3', hidden: true },
            { call: 'edit_distance("abc", "")', expect: '3', hidden: true },
            { call: 'edit_distance("kitten", "sitting")', expect: '3', hidden: true },
            { call: 'edit_distance("same", "same")', expect: '0', hidden: true },
            { call: 'edit_distance(S1, S2)', hidden: true, maxMs: 500, name: 'two 60-character strings' },
          ],
          hints: [
            '`dp[i][j]` = distance between `a[:i]` and `b[:j]`. Turning a prefix into the empty string costs its length: `dp[i][0] = i`, `dp[0][j] = j`.',
            'Equal last characters: `dp[i-1][j-1]`. Otherwise 1 + the min of delete (`dp[i-1][j]`), insert (`dp[i][j-1]`) and replace (`dp[i-1][j-1]`).',
          ],
          wrong: [
            py`
              def edit_distance(a, b):
                  m, n = len(a), len(b)
                  dp = [[0] * (n + 1) for _ in range(m + 1)]
                  for i in range(1, m + 1):
                      for j in range(1, n + 1):
                          if a[i - 1] == b[j - 1]:
                              dp[i][j] = dp[i - 1][j - 1] + 1
                          else:
                              dp[i][j] = max(dp[i - 1][j],
                                             dp[i][j - 1])
                  return m + n - 2 * dp[m][n]
            `,
            py`
              def edit_distance(a, b):
                  m, n = len(a), len(b)
                  dp = [[0] * (n + 1) for _ in range(m + 1)]
                  for i in range(1, m + 1):
                      for j in range(1, n + 1):
                          if a[i - 1] == b[j - 1]:
                              dp[i][j] = dp[i - 1][j - 1]
                          else:
                              dp[i][j] = 1 + min(dp[i - 1][j],
                                                 dp[i][j - 1],
                                                 dp[i - 1][j - 1])
                  return dp[m][n]
            `,
          ],
          explain: md`
            **O(m·n) time and space** (O(min(m, n)) space if you keep only two rows). Each cell asks "what was the last operation?": delete, insert, replace, or nothing if the characters already match.

            The LCS shortcut \`m + n − 2·LCS\` counts only inserts and deletes, so a replacement costs 2 instead of 1. Missing base cases (row and column 0) undercount every prefix. The plain recursion (no memo) is exponential and never finishes on 60-character strings. This exact DP powers spell checkers, fuzzy joins on messy names, and DNA alignment.
          `,
        },
        {
          type: 'learn',
          title: 'Backtracking',
          body: md`
            To **generate** every subset, permutation or combination, build a candidate step by step:

            1. **choose**: add an option to \`path\`
            2. **explore**: recurse
            3. **un-choose**: remove it again (\`path.pop()\`) and try the next option

            When \`path\` is complete, store a **copy** (\`path[:]\`), because \`path\` keeps changing. The output is exponential (2ⁿ subsets, n! permutations), so n is small, typically ≤ 10–15. **Prune** branches that can't succeed to save time.
          `,
          code: py`
            def permutations(nums):
                out, path = [], []
                used = [False] * len(nums)

                def go():
                    if len(path) == len(nums):
                        out.append(path[:])  # copy!
                        return
                    for i, x in enumerate(nums):
                        if not used[i]:
                            used[i] = True      # choose
                            path.append(x)
                            go()                # explore
                            path.pop()          # un-choose
                            used[i] = False

                go()
                return out

            print(permutations([1, 2, 3]))
          `,
        },
        {
          type: 'code',
          title: 'All subsets',
          prompt: md`
            Write \`subsets(nums)\` that returns **all** subsets of a list of distinct integers (the power set, including \`[]\`). Inside each subset, keep the elements in their **original order**. The subsets themselves may come in any order.

            \`\`\`python
            subsets([1, 2, 3])
            # [[], [1], [2], [3], [1, 2], [1, 3],
            #  [2, 3], [1, 2, 3]]  (any order)
            \`\`\`

            Don't use \`itertools\`: write the backtracking yourself.
          `,
          starter: 'def subsets(nums):\n    pass\n',
          solution: py`
            def subsets(nums):
                out, path = [], []

                def go(i):
                    if i == len(nums):
                        out.append(path[:])
                        return
                    path.append(nums[i])  # take nums[i]
                    go(i + 1)
                    path.pop()            # skip nums[i]
                    go(i + 1)

                go(0)
                return out
          `,
          tests: [
            { call: 'subsets([1, 2, 3])', expect: '[[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]]', unordered: true },
            { call: 'subsets([])', expect: '[[]]', unordered: true },
            { call: 'subsets([0])', expect: '[[], [0]]', unordered: true, hidden: true },
            { call: 'subsets([3, 1])', expect: '[[], [3], [1], [3, 1]]', unordered: true, hidden: true, name: 'keeps the original order inside' },
            { call: 'subsets([5, -2, 9, 4])', unordered: true, hidden: true },
            { call: 'len(subsets(list(range(15))))', expect: '32768', hidden: true, maxMs: 1500 },
          ],
          forbid: ['itertools'],
          hints: [
            'For each index, make two choices: take `nums[i]` or skip it.',
            'Recurse with `go(i + 1)`, and when `i == len(nums)`, store `path[:]` (a copy).',
          ],
          wrong: [
            py`
              def subsets(nums):
                  out, path = [], []

                  def go(i):
                      if i == len(nums):
                          out.append(path)
                          return
                      path.append(nums[i])
                      go(i + 1)
                      path.pop()
                      go(i + 1)

                  go(0)
                  return out
            `,
            py`
              def subsets(nums):
                  out = [[]]
                  for i in range(len(nums)):
                      for j in range(i, len(nums)):
                          out.append(nums[i:j + 1])
                  return out
            `,
          ],
          explain: md`
            **O(n · 2ⁿ) time and space**: 2ⁿ subsets, each copied in O(n). Each element is an independent yes/no decision, so the recursion tree has exactly 2ⁿ leaves.

            Appending \`path\` itself stores 2ⁿ references to **one** list, which is empty by the end. Contiguous slices are sub**arrays**, not subsets: \`[1, 3]\` is missing. Iterative alternative: start with \`[[]]\`, and for each x add \`s + [x]\` for every existing subset s.
          `,
        },
        {
          type: 'code',
          title: 'Combination sum',
          prompt: md`
            \`candidates\` are distinct positive integers; each can be used **any number of times**. Write \`combination_sum(candidates, target)\` that returns all **unique** combinations that add up to \`target\`. Each combination in **ascending** order, combinations in any order.

            \`\`\`python
            combination_sum([2, 3, 6, 7], 7)
            # [[2, 2, 3], [7]]
            \`\`\`

            \`[2, 3, 2]\` is the same combination as \`[2, 2, 3]\`: don't list it twice.
          `,
          starter: 'def combination_sum(candidates, target):\n    pass\n',
          solution: py`
            def combination_sum(candidates, target):
                nums = sorted(candidates)
                out, path = [], []

                def go(start, left):
                    if left == 0:
                        out.append(path[:])
                        return
                    for i in range(start, len(nums)):
                        if nums[i] > left:
                            break  # sorted: rest too big
                        path.append(nums[i])
                        go(i, left - nums[i])
                        path.pop()

                go(0, target)
                return out
          `,
          tests: [
            { call: 'combination_sum([2, 3, 6, 7], 7)', expect: '[[2, 2, 3], [7]]', unordered: true },
            { call: 'combination_sum([2, 3, 5], 8)', expect: '[[2, 2, 2, 2], [2, 3, 3], [3, 5]]', unordered: true },
            { call: 'combination_sum([2], 1)', expect: '[]', unordered: true },
            { call: 'combination_sum([1], 2)', expect: '[[1, 1]]', unordered: true, hidden: true },
            { call: 'combination_sum([7, 3, 2], 18)', unordered: true, hidden: true, name: 'unsorted candidates' },
            { call: 'combination_sum([5, 10, 25], 40)', unordered: true, hidden: true },
            { call: 'len(combination_sum([2, 3, 5, 7, 11], 36))', hidden: true, maxMs: 300, name: 'prunes duplicates (target 36)' },
          ],
          hints: [
            'Sort the candidates. Recurse with a `start` index so a combination never goes back to a smaller candidate: that kills duplicates like `[3, 2, 2]`.',
            'Reuse is allowed, so recurse with `go(i, left - nums[i])`, not `i + 1`. Stop when `left == 0`, and `break` once a candidate exceeds `left`.',
          ],
          wrong: [
            py`
              def combination_sum(candidates, target):
                  nums = sorted(candidates)
                  out, path = [], []

                  def go(left):
                      if left == 0:
                          out.append(path[:])
                          return
                      for x in nums:
                          if x > left:
                              break
                          path.append(x)
                          go(left - x)
                          path.pop()

                  go(target)
                  return out
            `,
            py`
              def combination_sum(candidates, target):
                  nums = sorted(candidates)
                  out, path = [], []

                  def go(start, left):
                      if left == 0:
                          out.append(path[:])
                          return
                      for i in range(start, len(nums)):
                          if nums[i] > left:
                              break
                          path.append(nums[i])
                          go(i + 1, left - nums[i])
                          path.pop()

                  go(0, target)
                  return out
            `,
            py`
              def combination_sum(candidates, target):
                  out, path = [], []

                  def go(start, left):
                      if left == 0:
                          out.append(path[:])
                          return
                      for i in range(start, len(candidates)):
                          if candidates[i] > left:
                              break
                          path.append(candidates[i])
                          go(i, left - candidates[i])
                          path.pop()

                  go(0, target)
                  return out
            `,
          ],
          explain: md`
            **Exponential time** in the worst case, and O(target / min) recursion depth. The \`start\` index is the core trick: by only moving forward through the sorted candidates, each multiset is generated exactly once, in ascending order. Sorting also enables the \`break\` pruning.

            Looping over all candidates at every level produces every **ordering** (\`[2, 2, 3]\`, \`[2, 3, 2]\`, …). \`i + 1\` forbids reuse. Skipping the sort breaks both the ascending order and the pruning.
          `,
        },
      ],
    },
  ],
  exam: {
    id: 'u17-exam',
    title: 'Data Structures & Algorithms Exam',
    minutes: 45,
    intro: 'A full coding round: linked lists, heaps, BFS on grids and graphs, trees and dynamic programming. Hidden tests check edge cases and speed, as in a real interview. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: '`nums` has n elements. What is the time complexity of `k_smallest`?',
        code: py`
          import heapq

          def k_smallest(nums, k):
              heapq.heapify(nums)
              return [heapq.heappop(nums)
                      for _ in range(k)]
        `,
        options: ['O(n + k log n)', 'O(n log n)', 'O(k log k)', 'O(n · k)'],
        answer: 0,
        explain: '`heapify` is O(n) (not O(n log n): most nodes sit near the bottom and barely move). Then k pops cost O(log n) each. For k much smaller than n this beats sorting. Note that it also destroys the caller\'s list order: mention that side effect in an interview.',
      },
      {
        type: 'output',
        prompt: '`build` makes a linked list and `to_list` reads it back. What does this print?',
        setup: LL,
        code: py`
          head = build([1, 2, 3, 4, 5])
          prev, cur = None, head
          for _ in range(3):
              nxt = cur.next
              cur.next = prev
              prev, cur = cur, nxt
          head.next = cur
          print(to_list(prev))
        `,
        answer: '[3, 2, 1, 4, 5]',
        explain: 'Three rounds of the reversal loop flip the first three nodes: `prev` is 3 → 2 → 1 and `cur` is node 4. The old head (node 1) is now the tail of the reversed part, so `head.next = cur` reconnects it to 4 → 5. This is the building block of "reverse nodes in k-groups".',
      },
      {
        type: 'choice',
        prompt: 'This tries to keep the **two highest** scores. What does it print?',
        code: py`
          import heapq

          scores = [("ann", 90), ("bob", 85),
                    ("cy", 90), ("dee", 70)]
          h = []
          for name, s in scores:
              heapq.heappush(h, (-s, name))
              if len(h) > 2:
                  heapq.heappop(h)
          print(sorted(h))
        `,
        options: [
          "[(-85, 'bob'), (-70, 'dee')]",
          "[(-90, 'ann'), (-90, 'cy')]",
          "[(-90, 'cy'), (-85, 'bob')]",
          "[(-90, 'ann'), (-85, 'bob')]",
        ],
        answer: 0,
        checkOutput: true,
        explain: 'With negated scores, `heappop` removes the most negative entry, which is the **highest** score. So the heap ends up keeping the two lowest scores. For "top k", keep a **min**-heap of the real scores: the root is the weakest of the top k, and that\'s the one to evict.',
      },
      {
        type: 'code',
        title: 'Rotting oranges',
        prompt: md`
          \`grid\` is a list of lists: \`0\` empty, \`1\` fresh orange, \`2\` rotten orange. Every minute, each rotten orange rots its fresh neighbours (up, down, left, right). Write \`minutes_to_rot(grid)\` that returns the minutes until no fresh orange is left, or \`-1\` if some can never rot. Don't change the caller's grid.

          \`\`\`python
          minutes_to_rot([[2, 1, 1],
                          [1, 1, 0],
                          [0, 1, 1]])  # 4
          \`\`\`

          Grids up to 300 × 300.
        `,
        setup: py`
          OG = [[1] * 300 for _ in range(300)]
          OG[0][0] = 2
        `,
        starter: 'def minutes_to_rot(grid):\n    pass\n',
        solution: py`
          from collections import deque

          def minutes_to_rot(grid):
              g = [row[:] for row in grid]
              rows, cols = len(g), len(g[0])
              q = deque((r, c) for r in range(rows)
                        for c in range(cols) if g[r][c] == 2)
              fresh = sum(row.count(1) for row in g)
              minutes = 0
              while q and fresh:
                  minutes += 1
                  for _ in range(len(q)):
                      r, c = q.popleft()
                      for a, b in ((r + 1, c), (r - 1, c),
                                   (r, c + 1), (r, c - 1)):
                          if (0 <= a < rows and 0 <= b < cols
                                  and g[a][b] == 1):
                              g[a][b] = 2
                              fresh -= 1
                              q.append((a, b))
              return -1 if fresh else minutes
        `,
        tests: [
          { call: 'minutes_to_rot([[2, 1, 1], [1, 1, 0], [0, 1, 1]])', expect: '4' },
          { call: 'minutes_to_rot([[2, 1, 1], [0, 1, 1], [1, 0, 1]])', expect: '-1', name: 'an unreachable orange' },
          { call: 'minutes_to_rot([[0, 2]])', expect: '0', hidden: true, name: 'nothing fresh' },
          { call: 'minutes_to_rot([[1]])', expect: '-1', hidden: true, name: 'fresh but no rotten' },
          { call: 'minutes_to_rot([[2, 1, 1, 1, 2]])', expect: '2', hidden: true, name: 'two sources at once' },
          { call: 'minutes_to_rot([[2, 2], [1, 1]])', expect: '1', hidden: true },
          { code: 'g = [[2, 1], [1, 1]]\nminutes_to_rot(g)\nassert g == [[2, 1], [1, 1]]', name: 'leaves the input unchanged', hidden: true },
          { call: 'minutes_to_rot(OG)', expect: '598', hidden: true, maxMs: 1500, name: '300 × 300 grid' },
        ],
        wrong: [
          py`
            from collections import deque

            def minutes_to_rot(grid):
                g = [row[:] for row in grid]
                rows, cols = len(g), len(g[0])
                start = [(r, c) for r in range(rows)
                         for c in range(cols) if g[r][c] == 2]
                q = deque(start[:1])
                fresh = sum(row.count(1) for row in g)
                minutes = 0
                while q and fresh:
                    minutes += 1
                    for _ in range(len(q)):
                        r, c = q.popleft()
                        for a, b in ((r + 1, c), (r - 1, c),
                                     (r, c + 1), (r, c - 1)):
                            if (0 <= a < rows and 0 <= b < cols
                                    and g[a][b] != 0
                                    and (a, b) not in start):
                                if g[a][b] == 1:
                                    fresh -= 1
                                g[a][b] = 0
                                q.append((a, b))
                return -1 if fresh else minutes
          `,
          py`
            from collections import deque

            def minutes_to_rot(grid):
                g = [row[:] for row in grid]
                rows, cols = len(g), len(g[0])
                q = deque((r, c) for r in range(rows)
                          for c in range(cols) if g[r][c] == 2)
                fresh = sum(row.count(1) for row in g)
                minutes = 0
                while q:
                    minutes += 1
                    for _ in range(len(q)):
                        r, c = q.popleft()
                        for a, b in ((r + 1, c), (r - 1, c),
                                     (r, c + 1), (r, c - 1)):
                            if (0 <= a < rows and 0 <= b < cols
                                    and g[a][b] == 1):
                                g[a][b] = 2
                                fresh -= 1
                                q.append((a, b))
                return -1 if fresh else minutes
          `,
          py`
            from collections import deque

            def minutes_to_rot(grid):
                rows, cols = len(grid), len(grid[0])
                q = deque((r, c) for r in range(rows)
                          for c in range(cols) if grid[r][c] == 2)
                fresh = sum(row.count(1) for row in grid)
                minutes = 0
                while q and fresh:
                    minutes += 1
                    for _ in range(len(q)):
                        r, c = q.popleft()
                        for a, b in ((r + 1, c), (r - 1, c),
                                     (r, c + 1), (r, c - 1)):
                            if (0 <= a < rows and 0 <= b < cols
                                    and grid[a][b] == 1):
                                grid[a][b] = 2
                                fresh -= 1
                                q.append((a, b))
                return -1 if fresh else minutes
          `,
        ],
        explain: md`
          **O(R·C) time and space.** **Multi-source BFS**: put *every* rotten orange in the queue at minute 0, then each BFS level is one minute. Count the fresh oranges up front and stop when the count hits 0. Anything left over is unreachable, so the answer is -1.

          Starting from a single source overestimates the time when several oranges rot in parallel. Running one level past the last infection is the classic off-by-one. Mutating the input is a side effect interviewers notice.
        `,
      },
      {
        type: 'code',
        title: 'Diameter of a binary tree',
        prompt: md`
          The **diameter** of a binary tree is the number of **edges** on the longest path between any two nodes. The path may or may not pass through the root. Write \`diameter(root)\`.

          \`\`\`python
          diameter(build_tree([1, 2, 3, 4, 5]))  # 3
          # 4 → 2 → 1 → 3 (or 5 → 2 → 1 → 3)
          \`\`\`

          \`build_tree\` and \`TreeNode\` are available. Aim for one O(n) pass.
        `,
        setup: TREE,
        starter: 'def diameter(root):\n    pass\n',
        solution: py`
          def diameter(root):
              best = 0

              def height(node):
                  nonlocal best
                  if node is None:
                      return 0
                  l = height(node.left)
                  r = height(node.right)
                  best = max(best, l + r)
                  return 1 + max(l, r)

              height(root)
              return best
        `,
        tests: [
          { call: 'diameter(build_tree([1, 2, 3, 4, 5]))', expect: '3' },
          { call: 'diameter(build_tree([1, 2]))', expect: '1' },
          { call: 'diameter(build_tree([]))', expect: '0', hidden: true },
          { call: 'diameter(build_tree([1]))', expect: '0', hidden: true },
          { call: 'diameter(build_tree([1, 2, None, 3, 4, 5, None, None, 6, 7]))', expect: '5', hidden: true, name: 'longest path avoids the root' },
          { call: 'diameter(balanced_bst(0, 2 ** 12))', expect: '23', hidden: true },
        ],
        wrong: [
          py`
            def diameter(root):
                def height(node):
                    if node is None:
                        return 0
                    return 1 + max(height(node.left),
                                   height(node.right))

                if root is None:
                    return 0
                return height(root.left) + height(root.right)
          `,
          py`
            def diameter(root):
                best = 0

                def height(node):
                    nonlocal best
                    if node is None:
                        return 0
                    l = height(node.left)
                    r = height(node.right)
                    best = max(best, l + r + 1)
                    return 1 + max(l, r)

                height(root)
                return best
          `,
        ],
        explain: md`
          **O(n) time, O(h) space.** One post-order pass: every node returns its height to its parent, and on the way computes the longest path that *bends* at it (\`left height + right height\`). The answer is the best bend anywhere, tracked in a \`nonlocal\` variable.

          Measuring only through the root misses paths that live in one subtree. Counting nodes instead of edges is off by one. Calling a separate \`height()\` at every node is O(n²) on a skewed tree.
        `,
      },
      {
        type: 'code',
        title: 'Course schedule: the order',
        prompt: md`
          \`num_courses\` courses \`0 … n-1\`. A pair \`[a, b]\` means "take b before a". Write \`find_order(num_courses, prereqs)\` that returns **any** order in which all courses can be taken, or \`[]\` if that's impossible.

          \`\`\`python
          find_order(4, [[1, 0], [2, 0], [3, 1], [3, 2]])
          # [0, 1, 2, 3] or [0, 2, 1, 3]
          find_order(2, [[1, 0], [0, 1]])  # []
          \`\`\`

          Up to 10⁵ courses, possibly in one long chain. The helper \`valid(n, prereqs, order)\` checks an answer.
        `,
        setup: py`
          import random

          def valid(n, prereqs, order):
              if sorted(order) != list(range(n)):
                  return False
              pos = {c: i for i, c in enumerate(order)}
              return all(pos[b] < pos[a] for a, b in prereqs)

          CHAIN = [[i + 1, i] for i in range(99999)]
          random.Random(5).shuffle(CHAIN)
        `,
        starter: 'def find_order(num_courses, prereqs):\n    pass\n',
        solution: py`
          from collections import deque

          def find_order(num_courses, prereqs):
              graph = [[] for _ in range(num_courses)]
              indeg = [0] * num_courses
              for a, b in prereqs:
                  graph[b].append(a)
                  indeg[a] += 1
              q = deque(i for i in range(num_courses)
                        if indeg[i] == 0)
              order = []
              while q:
                  u = q.popleft()
                  order.append(u)
                  for v in graph[u]:
                      indeg[v] -= 1
                      if indeg[v] == 0:
                          q.append(v)
              if len(order) < num_courses:
                  return []
              return order
        `,
        tests: [
          { assert: 'valid(2, [[1, 0]], find_order(2, [[1, 0]]))', name: 'find_order(2, [[1, 0]]) is valid' },
          { assert: 'valid(4, [[1, 0], [2, 0], [3, 1], [3, 2]], find_order(4, [[1, 0], [2, 0], [3, 1], [3, 2]]))', name: 'diamond' },
          { call: 'find_order(2, [[1, 0], [0, 1]])', expect: '[]' },
          { call: 'find_order(1, [])', expect: '[0]', hidden: true },
          { assert: 'valid(3, [], find_order(3, []))', name: 'no prerequisites', hidden: true },
          { call: 'find_order(3, [[1, 0], [1, 2], [2, 1]])', expect: '[]', hidden: true, name: 'cycle behind a free course' },
          { call: 'find_order(2, [[0, 0]])', expect: '[]', hidden: true, name: 'self-loop' },
          { assert: 'valid(100000, CHAIN, find_order(100000, CHAIN))', name: 'chain of 100,000 courses', hidden: true, maxMs: 1000 },
        ],
        wrong: [
          py`
            from collections import deque

            def find_order(num_courses, prereqs):
                graph = [[] for _ in range(num_courses)]
                indeg = [0] * num_courses
                for a, b in prereqs:
                    graph[b].append(a)
                    indeg[a] += 1
                q = deque(i for i in range(num_courses)
                          if indeg[i] == 0)
                order = []
                while q:
                    u = q.popleft()
                    order.append(u)
                    for v in graph[u]:
                        indeg[v] -= 1
                        if indeg[v] == 0:
                            q.append(v)
                return order
          `,
          py`
            from collections import deque

            def find_order(num_courses, prereqs):
                graph = [[] for _ in range(num_courses)]
                indeg = [0] * num_courses
                for a, b in prereqs:
                    graph[a].append(b)
                    indeg[b] += 1
                q = deque(i for i in range(num_courses)
                          if indeg[i] == 0)
                order = []
                while q:
                    u = q.popleft()
                    order.append(u)
                    for v in graph[u]:
                        indeg[v] -= 1
                        if indeg[v] == 0:
                            q.append(v)
                if len(order) < num_courses:
                    return []
                return order
          `,
          py`
            def find_order(num_courses, prereqs):
                graph = [[] for _ in range(num_courses)]
                for a, b in prereqs:
                    graph[b].append(a)
                state = [0] * num_courses
                post = []

                def dfs(u):
                    state[u] = 1
                    for v in graph[u]:
                        if state[v] == 1:
                            return False
                        if state[v] == 0 and not dfs(v):
                            return False
                    state[u] = 2
                    post.append(u)
                    return True

                for u in range(num_courses):
                    if state[u] == 0 and not dfs(u):
                        return []
                return post[::-1]
          `,
        ],
        explain: md`
          **O(V + E) time and space.** Kahn's algorithm outputs a course only once all its prerequisites are out, so the output order is valid by construction. If fewer than n courses come out, the rest sit on a cycle, so return \`[]\`.

          Forgetting that final check returns a partial schedule. Reversing the edge direction produces the order backwards. The DFS post-order version is correct but recursive: a 100,000-course chain overflows Python's stack.
        `,
      },
      {
        type: 'code',
        title: 'Top k frequent words',
        prompt: md`
          Write \`top_k_words(words, k)\` that returns the \`k\` most frequent words, **most frequent first**. Words with the same frequency are ordered **alphabetically**. \`k\` is at most the number of distinct words.

          \`\`\`python
          top_k_words(["i", "love", "leetcode",
                       "i", "love", "coding"], 2)
          # ["i", "love"]
          \`\`\`

          Up to 10⁵ words: aim for O(n + d log k) (d = distinct words).
        `,
        setup: py`
          import random
          _r = random.Random(21)
          WORDS = ["w" + str(_r.randrange(5000))
                   for _ in range(60000)]
        `,
        starter: 'def top_k_words(words, k):\n    pass\n',
        solution: py`
          import heapq
          from collections import Counter

          def top_k_words(words, k):
              c = Counter(words)
              return heapq.nsmallest(
                  k, c, key=lambda w: (-c[w], w))
        `,
        tests: [
          { call: 'top_k_words(["i", "love", "leetcode", "i", "love", "coding"], 2)', expect: '["i", "love"]' },
          { call: 'top_k_words(["the", "day", "is", "sunny", "the", "the", "the", "sunny", "is", "is"], 4)', expect: '["the", "is", "sunny", "day"]' },
          { call: 'top_k_words(["b", "a", "c", "b", "a", "c"], 2)', expect: '["a", "b"]', hidden: true, name: 'ties are alphabetical' },
          { call: 'top_k_words(["x"], 1)', expect: '["x"]', hidden: true },
          { call: 'top_k_words(["bb", "a", "bb", "c", "a", "d"], 4)', expect: '["a", "bb", "c", "d"]', hidden: true },
          { call: 'top_k_words(WORDS, 5)', expect: '["w3446", "w2896", "w2371", "w2556", "w3039"]', hidden: true, maxMs: 150, name: '60,000 words with ties' },
        ],
        wrong: [
          py`
            from collections import Counter

            def top_k_words(words, k):
                return [w for w, _ in Counter(words).most_common(k)]
          `,
          py`
            import heapq
            from collections import Counter

            def top_k_words(words, k):
                c = Counter(words)
                return heapq.nlargest(k, c,
                                      key=lambda w: (c[w], w))
          `,
          py`
            def top_k_words(words, k):
                uniq = sorted(set(words))
                uniq.sort(key=lambda w: -words.count(w))
                return uniq[:k]
          `,
        ],
        explain: md`
          **O(n + d log k) time, O(d) space.** Count with a \`Counter\`, then pick k with a heap on the key \`(-count, word)\`: higher counts first, and for equal counts the alphabetically smaller word first.

          \`most_common\` breaks ties by first appearance, not alphabetically. \`nlargest\` with \`(count, word)\` reverses the alphabet for ties. \`words.count\` per distinct word is O(n·d), about 3·10⁸ steps here. \`sorted(c, key=lambda w: (-c[w], w))[:k]\` is a fine O(d log d) answer.
        `,
      },
      {
        type: 'code',
        title: 'Word break',
        prompt: md`
          Write \`word_break(s, words)\` that returns \`True\` if \`s\` can be split into a sequence of one or more dictionary words (each word may be reused). An empty string counts as splittable.

          \`\`\`python
          word_break("applepenapple", ["apple", "pen"])  # True
          word_break("catsandog",
                     ["cats", "dog", "sand", "and", "cat"])  # False
          \`\`\`

          Strings up to 300 characters, and some inputs make plain recursion explode.
        `,
        starter: 'def word_break(s, words):\n    pass\n',
        solution: py`
          def word_break(s, words):
              ws = set(words)
              longest = max(map(len, ws), default=0)
              ok = [True] + [False] * len(s)
              for i in range(1, len(s) + 1):
                  for j in range(max(0, i - longest), i):
                      if ok[j] and s[j:i] in ws:
                          ok[i] = True
                          break
              return ok[len(s)]
        `,
        tests: [
          { call: 'word_break("leetcode", ["leet", "code"])', expect: 'True' },
          { call: 'word_break("applepenapple", ["apple", "pen"])', expect: 'True' },
          { call: 'word_break("catsandog", ["cats", "dog", "sand", "and", "cat"])', expect: 'False' },
          { call: 'word_break("", ["a"])', expect: 'True', hidden: true },
          { call: 'word_break("a", [])', expect: 'False', hidden: true },
          { call: 'word_break("goalspecial", ["go", "goal", "goals", "special"])', expect: 'True', hidden: true, name: 'longest-first greedy fails' },
          { call: 'word_break("ab" * 150, ["a", "b", "ab"])', expect: 'True', hidden: true, name: '300 characters' },
          { call: 'word_break("a" * 22 + "b", ["a", "aa", "aaa", "aaaa", "aaaaa"])', expect: 'False', hidden: true, maxMs: 50, name: 'exponential trap' },
        ],
        wrong: [
          py`
            def word_break(s, words):
                while s:
                    for w in sorted(words, key=len, reverse=True):
                        if s.startswith(w):
                            s = s[len(w):]
                            break
                    else:
                        return False
                return True
          `,
          py`
            def word_break(s, words):
                if not s:
                    return True
                return any(s.startswith(w) and
                           word_break(s[len(w):], words)
                           for w in words)
          `,
        ],
        explain: md`
          **O(n · L) substring checks** (L = longest word), O(n) space. \`ok[i]\` means "the first i characters can be split". It's true when some earlier \`ok[j]\` is true and \`s[j:i]\` is a word. Memoised recursion on the start index is equivalent.

          Greedy longest-match commits to "goals" and gets stuck. Plain recursion re-explores the same suffixes exponentially often: on \`"aaa…ab"\` every split fails, but only after trying them all.
        `,
      },
      {
        type: 'code',
        title: 'LIS in O(n log n)',
        prompt: md`
          Write \`lis_fast(nums)\` that returns the length of the longest **strictly** increasing subsequence. \`len(nums)\` is up to 10⁵, so the O(n²) DP is too slow: you need **O(n log n)**.

          \`\`\`python
          lis_fast([10, 9, 2, 5, 3, 7, 101, 18])  # 4
          \`\`\`
        `,
        setup: RAND + '\n\nBIGL = rand_list(10000, 8)\n',
        starter: 'def lis_fast(nums):\n    pass\n',
        solution: py`
          from bisect import bisect_left

          def lis_fast(nums):
              tails = []
              for x in nums:
                  i = bisect_left(tails, x)
                  if i == len(tails):
                      tails.append(x)
                  else:
                      tails[i] = x
              return len(tails)
        `,
        tests: [
          { call: 'lis_fast([10, 9, 2, 5, 3, 7, 101, 18])', expect: '4' },
          { call: 'lis_fast([0, 1, 0, 3, 2, 3])', expect: '4' },
          { call: 'lis_fast([7, 7, 7, 7])', expect: '1', hidden: true, name: 'strictly increasing' },
          { call: 'lis_fast([])', expect: '0', hidden: true },
          { call: 'lis_fast([4, 10, 4, 3, 8, 9])', expect: '3', hidden: true },
          { call: 'lis_fast([5, 4, 3, 2, 1])', expect: '1', hidden: true },
          { call: 'lis_fast(BIGL)', expect: '188', hidden: true, maxMs: 100, name: '10,000 numbers' },
        ],
        wrong: [
          py`
            def lis_fast(nums):
                dp = [1] * len(nums)
                for i in range(len(nums)):
                    for j in range(i):
                        if nums[j] < nums[i]:
                            dp[i] = max(dp[i], dp[j] + 1)
                return max(dp, default=0)
          `,
          py`
            from bisect import bisect_right

            def lis_fast(nums):
                tails = []
                for x in nums:
                    i = bisect_right(tails, x)
                    if i == len(tails):
                        tails.append(x)
                    else:
                        tails[i] = x
                return len(tails)
          `,
          py`
            def lis_fast(nums):
                tails = []
                for x in nums:
                    if not tails or x > tails[-1]:
                        tails.append(x)
                return len(tails)
          `,
        ],
        explain: md`
          **O(n log n) time, O(n) space.** \`tails[k]\` is the smallest possible last value of an increasing subsequence of length k + 1. That list is always sorted, so binary search finds where x fits. Overwriting keeps every tail as small as possible, which leaves the most room to extend later. \`len(tails)\` is the answer (but \`tails\` itself is not necessarily a real subsequence).

          \`bisect_right\` lets equal values extend the run (non-strict). Only appending, without ever replacing, is a greedy that gets stuck on an early large value. The O(n²) DP needs 5·10⁷ steps here.
        `,
      },
    ],
  },
};

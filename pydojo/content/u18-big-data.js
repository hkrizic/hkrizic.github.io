// Unit 18 — Big Data Engineering: streaming, map-reduce, sessions, joins.
import { py, md } from './helpers.js';

// A valid access-log line for a path / latency (used in several setups).
const LOG_HELPER = py`
  def L(path, secs=0.1, method="GET", status=200):
      return ("1.1.1.1 - - [12/Nov/2025:09:00:00 +0000]"
              f' "{method} {path} HTTP/1.1" {status} 10 {secs}')
`;

// A stream that explodes when read: proves that code is lazy.
const EXPLODE = py`
  from itertools import chain

  def explode():
      raise RuntimeError("read too far: not lazy")
      yield
`;

export default {
  id: 'u18',
  order: 18,
  track: 'interview',
  title: 'Big Data Engineering',
  subtitle: 'streaming, map-reduce, sessions, joins',
  icon: '🏭',
  color: '#D946EF',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u18-l1',
      title: 'Streaming & Memory',
      summary: 'Process data bigger than RAM: one record at a time, in one pass.',
      steps: [
        {
          type: 'learn',
          title: '2 TB won\'t fit in a list',
          body: md`
            A laptop has ~16 GB of RAM. \`f.read()\`, \`f.readlines()\` and \`list(f)\` load the **whole file** into memory: fine for 600 lines, a crash for 2 TB.

            A file object is an **iterator**: \`for line in f\` reads one line, hands it to you and forgets it. Memory stays O(1), however big the file is.

            Spark, Hadoop and Beam workers do exactly this with their partitions: they stream records through your code and never hold the whole dataset.
          `,
          code: py`
            errors = 0
            with open("data/server.log") as f:
                for line in f:  # one line in RAM
                    status = line.split()[8]
                    if status.startswith("5"):
                        errors += 1
            print("5xx responses:", errors)
          `,
        },
        {
          type: 'choice',
          prompt: 'The log `p` is 2 TB and your machine has 16 GB of RAM. Which line count works?',
          options: [
            'sum(1 for _ in open(p))',
            'len(open(p).readlines())',
            'len(open(p).read().splitlines())',
            'len(list(open(p)))',
          ],
          answer: 0,
          explain: md`
            Only the generator expression streams. The others build a list of every line (or one giant string) first and die with \`MemoryError\`.

            All four are O(n) time. Streaming doesn't make the count faster, it makes it *possible*. On a cluster the same count is split up: every worker counts its own partition and the driver adds the partial counts.
          `,
        },
        {
          type: 'learn',
          title: 'Generator pipelines',
          body: md`
            Split the work into small **generator stages**. Each \`yield\` hands one record to the next stage, so the whole pipeline holds a single record at a time. Nothing runs until the last stage asks for data (lazy evaluation).

            This is how Spark runs \`map\` → \`filter\` → \`map\`: the steps are fused into one stage, and each record flows through all of them before the next record is read.
          `,
          code: py`
            def read(path):
                with open(path) as f:
                    for line in f:
                        yield line.split()

            def slow(rows, limit):
                for r in rows:
                    if float(r[10]) > limit:
                        yield r[6]

            paths = slow(read("data/server.log"), 0.8)
            print(next(paths))  # reads just enough
            print(sum(1 for _ in paths), "more")
          `,
        },
        {
          type: 'output',
          prompt: 'Laziness check. Type exactly what this prints.',
          code: py`
            def source():
                for i in range(1, 4):
                    print("read", i)
                    yield i

            g = (x * 2 for x in source())
            print("ready")
            print(next(g), next(g))
          `,
          answer: 'ready\nread 1\nread 2\n2 4',
          explain: 'Building `g` runs nothing, so `ready` comes first. Each `next` pulls exactly one item through both stages, and both arguments are evaluated before `print` runs. Item 3 is never read. Spark is lazy the same way: transformations only build a plan, and nothing is read until an action such as `count()` asks for results.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines into a generator that yields the path of every request slower than `limit` seconds (field 10 is the latency, field 6 the path).',
          lines: [
            'def slow_paths(lines, limit):',
            '    for line in lines:',
            '        parts = line.split()',
            '        if float(parts[10]) > limit:',
            '            yield parts[6]',
          ],
          distractors: ['            return parts[6]', '        if parts[10] > limit:'],
          setup: LOG_HELPER,
          tests: [
            { call: 'list(slow_paths([L("/a", 0.9), L("/b", 0.2), L("/c", 1.5)], 0.5))', expect: '["/a", "/c"]' },
            { call: 'list(slow_paths(iter([L("/a", 0.9), L("/c", 1.5)]), 1.0))', expect: '["/c"]' },
          ],
          explain: '`return` would stop at the first slow request, and comparing the text `"0.9"` with a float raises a TypeError. Convert first, then `yield` to keep the function lazy. Chained generators like this are what a Spark stage does with fused `filter` and `map` steps.',
        },
        {
          type: 'code',
          title: 'Parse the access log lazily',
          prompt: md`
            Write a generator \`parse_log(lines)\` that turns raw access-log lines into dicts:

            \`\`\`
            203.0.113.5 - - [12/Nov/2025:09:00:40 +0000] "POST /api/checkout HTTP/1.1" 200 8940 0.137
            \`\`\`
            becomes
            \`\`\`python
            {"ip": "203.0.113.5", "method": "POST",
             "path": "/api/checkout", "status": 200,
             "bytes": 8940, "secs": 0.137}
            \`\`\`

            - Split on whitespace. A valid line has exactly **11 fields**: skip every other line (blank lines, truncated writes).
            - \`method\` without the leading \`"\`. \`status\` and \`bytes\` are ints, \`secs\` is a float.
            - \`bytes\` can be \`-\` (no body), which means \`0\`.
            - Stay **lazy**: read the next line only when the caller asks for the next record. The tests feed you a stream that explodes if you read too far.
          `,
          setup: EXPLODE + '\n' + py`
            LINE = ("203.0.113.5 - - [12/Nov/2025:09:00:40"
                    ' +0000] "POST /api/checkout HTTP/1.1"'
                    " 200 8940 0.137")
            REC = {"ip": "203.0.113.5", "method": "POST",
                   "path": "/api/checkout", "status": 200,
                   "bytes": 8940, "secs": 0.137}
          `,
          starter: py`
            def parse_log(lines):
                pass
          `,
          solution: py`
            def parse_log(lines):
                for line in lines:
                    p = line.split()
                    if len(p) != 11:
                        continue
                    b = p[9]
                    yield {
                        "ip": p[0],
                        "method": p[5].lstrip('"'),
                        "path": p[6],
                        "status": int(p[8]),
                        "bytes": 0 if b == "-" else int(b),
                        "secs": float(p[10]),
                    }
          `,
          tests: [
            { call: 'next(parse_log([LINE]))', expect: 'REC', name: 'parses the example line' },
            { call: 'list(parse_log(["", "garbage line", LINE]))', expect: '[REC]', name: 'skips lines without 11 fields' },
            { call: 'next(parse_log(chain([LINE], explode())))', expect: 'REC', name: 'lazy: reads only what it needs', hidden: true },
            { call: 'next(parse_log([LINE.replace(" 8940 ", " - ")]))["bytes"]', expect: '0', name: 'bytes "-" means 0', hidden: true },
            { call: 'sum(r["bytes"] for r in parse_log(open("data/server.log")))', name: 'total bytes of data/server.log', hidden: true },
            { call: 'len(list(parse_log(open("data/server.log"))))', hidden: true },
          ],
          hints: [
            'Count the pieces of `LINE.split()`: the method is piece 5, the path piece 6, status/bytes/secs are 8, 9, 10.',
            '`p[5].lstrip(\'"\')` removes the quote. Use `continue` for lines you skip.',
            'Put `yield {...}` inside the `for` loop. Building a list first breaks the laziness test.',
          ],
          wrong: [
            py`
              def parse_log(lines):
                  out = []
                  for line in lines:
                      p = line.split()
                      if len(p) == 11:
                          out.append({
                              "ip": p[0], "method": p[5].lstrip('"'),
                              "path": p[6], "status": int(p[8]),
                              "bytes": 0 if p[9] == "-" else int(p[9]),
                              "secs": float(p[10])})
                  yield from out
            `,
            py`
              def parse_log(lines):
                  for line in lines:
                      p = line.split()
                      if len(p) == 11:
                          yield {"ip": p[0], "method": p[5].lstrip('"'),
                                 "path": p[6], "status": int(p[8]),
                                 "bytes": int(p[9]), "secs": float(p[10])}
            `,
          ],
          explain: md`
            One record in memory at a time: O(1) space for any file size. The first wrong version collects a list before yielding, which is O(n) memory and reads the whole input before the caller gets record #1.

            In Spark this is the parse step of \`spark.read.text(...)\` followed by a \`map\`. Real logs always contain junk. Skipping it, instead of crashing a three-hour job on line 9 million, is the first rule of pipelines (lesson 6 adds error reports).
          `,
        },
        {
          type: 'learn',
          title: 'Batching',
          body: md`
            Sending rows one at a time to a database, an API or Kafka is slow, because every call pays a network round trip. Producers **batch**: collect n records, send them together, repeat. Don't forget the last, **partial** batch!

            Python 3.12+ has \`itertools.batched(it, n)\`. Interviewers still ask you to write it, because it tests iterators, laziness and edge cases in five lines.
          `,
          code: py`
            rows = range(1, 8)
            batch = []
            for r in rows:
                batch.append(r)
                if len(batch) == 3:
                    print("send", batch)
                    batch = []
            if batch:  # the leftovers
                print("send", batch)
          `,
        },
        {
          type: 'code',
          title: 'Write batched()',
          prompt: md`
            Write a generator \`batched(iterable, n)\` that yields **tuples** of \`n\` items, with a shorter last tuple when the items run out.

            \`\`\`python
            list(batched("ABCDEFG", 3))
            # [('A','B','C'), ('D','E','F'), ('G',)]
            \`\`\`

            - \`n < 1\` raises \`ValueError\`.
            - Works on any iterable (lists, files, generators) and stays lazy: never read more items than the batch you are about to yield.
            - Build it yourself, without \`itertools.batched\`.
          `,
          setup: EXPLODE,
          starter: py`
            def batched(iterable, n):
                pass
          `,
          solution: py`
            from itertools import islice

            def batched(iterable, n):
                if n < 1:
                    raise ValueError("n must be >= 1")
                it = iter(iterable)
                while batch := tuple(islice(it, n)):
                    yield batch
          `,
          tests: [
            { call: 'list(batched("ABCDEFG", 3))', expect: '[("A", "B", "C"), ("D", "E", "F"), ("G",)]' },
            { call: 'list(batched([1, 2, 3, 4], 2))', expect: '[(1, 2), (3, 4)]', name: 'no empty tuple at the end' },
            { call: 'list(batched([], 5))', expect: '[]' },
            { call: 'list(batched([1, 2], 0))', raises: 'ValueError', name: 'n = 0 raises ValueError', hidden: true },
            { call: 'list(batched((x for x in range(5)), 2))', expect: '[(0, 1), (2, 3), (4,)]', name: 'works on a generator', hidden: true },
            { call: 'next(batched(chain([1, 2, 3], explode()), 3))', expect: '(1, 2, 3)', name: 'lazy: does not read ahead', hidden: true },
            { call: 'sum(len(b) for b in batched(range(10**5), 7))', expect: '100000', hidden: true },
          ],
          hints: [
            'Turn the input into one iterator with `it = iter(iterable)`, so every batch continues where the last one stopped.',
            '`tuple(islice(it, n))` takes the next n items (fewer at the end, `()` when empty).',
            '`while batch := tuple(islice(it, n)):` then `yield batch`.',
          ],
          wrong: [
            py`
              def batched(iterable, n):
                  if n < 1:
                      raise ValueError
                  batch = []
                  for x in iterable:
                      batch.append(x)
                      if len(batch) == n:
                          yield tuple(batch)
                          batch = []
            `,
            py`
              def batched(iterable, n):
                  if n < 1:
                      raise ValueError
                  items = list(iterable)
                  for i in range(0, len(items), n):
                      yield tuple(items[i:i + n])
            `,
            py`
              from itertools import islice

              def batched(iterable, n):
                  it = iter(iterable)
                  while batch := list(islice(it, n)):
                      yield batch
            `,
          ],
          explain: md`
            \`iter()\` matters: \`islice\` on a *list* would restart from index 0 every time, and the loop would never end. The walrus loop stops at the first empty tuple, which also handles the partial last batch for free.

            Wrong #1 drops the leftovers (a real bug that silently loses the tail of every file). Wrong #2 copies the whole input into memory. Batching is everywhere: Kafka producers (\`batch.size\`), bulk inserts into warehouses, and \`mapPartitions\` in Spark, which hands you an iterator per partition precisely so you can batch.
          `,
        },
        {
          type: 'learn',
          title: 'One pass, all the stats',
          body: md`
            Every pass over 2 TB costs real minutes and money, and a generator can be read only **once**. So keep running aggregates in a single loop: \`n\`, \`total\`, \`lo\`, \`hi\`.

            Variance is the trap. The school formula \`mean(x²) - mean(x)²\` subtracts two huge, nearly equal numbers, and floats lose the difference. **Welford's algorithm** keeps \`n\`, \`mean\` and \`m2\` (sum of squared deviations) and updates them per value:

            \`\`\`python
            n += 1
            d = x - mean
            mean += d / n
            m2 += d * (x - mean)  # the NEW mean
            \`\`\`
            Variance is \`m2 / n\` (or \`m2 / (n - 1)\` for the sample variance).
          `,
          code: py`
            n, total = 0, 0.0
            lo, hi = float("inf"), float("-inf")
            with open("data/server.log") as f:
                for line in f:
                    s = float(line.split()[10])
                    n += 1
                    total += s
                    lo, hi = min(lo, s), max(hi, s)
            print(n, round(total / n, 3), lo, hi)
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'The generator that ran dry',
          prompt: md`
            \`latency_summary(lines)\` should return \`{"n": ..., "mean": ..., "max": ...}\` for the response times (the **last** field of each line), or \`None\` when there are no lines.

            It receives a file or a generator, so it can read the data only **once**. On real input it crashes with \`ZeroDivisionError\`. Find out why and fix it with a single pass.
          `,
          starter: py`
            def latency_summary(lines):
                secs = (float(l.split()[-1])
                        for l in lines)
                total = sum(secs)
                n = sum(1 for _ in secs)
                mean = total / n
                return {"n": n, "mean": mean,
                        "max": max(secs)}
          `,
          solution: py`
            def latency_summary(lines):
                n, total, hi = 0, 0.0, None
                for line in lines:
                    s = float(line.split()[-1])
                    n += 1
                    total += s
                    if hi is None or s > hi:
                        hi = s
                if n == 0:
                    return None
                return {"n": n, "mean": total / n,
                        "max": hi}
          `,
          tests: [
            { call: 'latency_summary(iter(["a 0.5", "b 0.25", "c 0.75"]))', expect: '{"n": 3, "mean": 0.5, "max": 0.75}' },
            { call: 'latency_summary(iter([]))', expect: 'None', name: 'no lines → None' },
            { call: 'latency_summary(l for l in ["x 2.0"])', expect: '{"n": 1, "mean": 2.0, "max": 2.0}', hidden: true },
            { call: 'latency_summary(open("data/server.log"))', name: 'summary of data/server.log', hidden: true },
          ],
          hints: [
            'After `sum(secs)` the generator is exhausted. What does `sum(1 for _ in secs)` count then?',
            'Use one `for line in lines:` loop that updates `n`, `total` and the max together.',
            'Check `n == 0` before dividing and return `None`.',
          ],
          wrong: [
            py`
              def latency_summary(lines):
                  n, total, hi = 0, 0.0, 0.0
                  for line in lines:
                      s = float(line.split()[-1])
                      n += 1
                      total += s
                      hi = max(hi, s)
                  return {"n": n, "mean": total / n, "max": hi}
            `,
          ],
          explain: md`
            A generator is a one-shot stream: once \`sum\` has consumed it, every later pass sees nothing. That is exactly how a file or a Kafka topic behaves at scale. The fix keeps every aggregate in one loop: O(n) time, O(1) memory.

            \`list(lines)\` first would also "work", but it costs O(n) memory, which is exactly what you can't afford on 2 TB. Count, sum, min and max are also **mergeable**, so a cluster computes them per partition and combines the partials.
          `,
        },
        {
          type: 'choice',
          prompt: 'Epoch-like numbers near 10⁹. The true (population) variance is 22.5. What does the textbook formula print?',
          code: py`
            xs = [1e9 + 4, 1e9 + 7, 1e9 + 13, 1e9 + 16]
            n = len(xs)
            mean = sum(xs) / n
            sq = sum(x * x for x in xs) / n
            print(sq - mean ** 2)
          `,
          options: ['0.0', '22.5', '22.0', '30.0'],
          answer: 0,
          checkOutput: true,
          explain: '`x * x` is about 10¹⁸, where a float can only represent multiples of 128. The tiny difference of 22.5 drowns in rounding error (catastrophic cancellation). Timestamps in ms, prices in cents and sensor readings all hit this. Welford never squares the big values, only the small deviations. That\'s why Spark\'s variance aggregate uses Welford-style updates and NumPy/pandas subtract the mean before squaring: none of them uses the textbook formula.',
        },
        {
          type: 'blanks',
          prompt: 'Complete Welford\'s update so the program prints the mean and population variance `(5.0, 4.0)`.',
          code: py`
            def welford(xs):
                n, mean, m2 = 0, 0.0, 0.0
                for x in xs:
                    n += 1
                    d = x - mean
                    mean += d / ___
                    m2 += d * (x - ___)
                return mean, m2 / n

            print(welford([2, 4, 4, 4, 5, 5, 7, 9]))
          `,
          bank: ['n', 'mean', 'n - 1', 'd', 'x', 'm2'],
          answer: ['n', 'mean'],
          tests: [{ stdout: '(5.0, 4.0)\n' }],
          explain: 'The mean moves by `d / n` toward the new value. `m2` grows by the old deviation times the new deviation, `d * (x - mean)`, which is why `mean` is updated first. Three numbers of state per key also make this cheap to keep in a streaming job (Flink/Beam state) or a Spark aggregation buffer.',
        },
        {
          type: 'code',
          title: 'Streaming variance',
          prompt: md`
            Write \`stream_var(xs)\` that returns \`(n, mean, var)\` for an iterable of numbers in **one pass** using Welford's algorithm. \`var\` is the **sample variance**: \`m2 / (n - 1)\`, like pandas \`.var()\`.

            \`\`\`python
            stream_var([2, 4, 4, 4, 5, 5, 7, 9])
            # (8, 5.0, 4.571428571428571)
            \`\`\`

            - \`n == 0\` → \`(0, 0.0, 0.0)\`, and \`n == 1\` → \`(1, x, 0.0)\`.
            - Must stay accurate for huge values such as epoch timestamps in milliseconds.
          `,
          setup: py`
            import random
            rng = random.Random(3)
            DATA = [rng.gauss(50, 10) for _ in range(5000)]
          `,
          starter: py`
            def stream_var(xs):
                pass
          `,
          solution: py`
            def stream_var(xs):
                n, mean, m2 = 0, 0.0, 0.0
                for x in xs:
                    n += 1
                    d = x - mean
                    mean += d / n
                    m2 += d * (x - mean)
                var = m2 / (n - 1) if n > 1 else 0.0
                return n, mean, var
          `,
          tests: [
            { call: 'stream_var([2, 4, 4, 4, 5, 5, 7, 9])', expect: '(8, 5.0, 4.571428571428571)' },
            { call: 'stream_var([])', expect: '(0, 0.0, 0.0)' },
            { call: 'stream_var([7])', expect: '(1, 7.0, 0.0)', hidden: true },
            { call: 'stream_var(x * 1.0 for x in range(10))', expect: '(10, 4.5, 55 / 6)', name: 'works on a generator', hidden: true },
            { call: 'stream_var([1.7e12 + d for d in (4, 7, 13, 16)])', expect: '(4, 1.7e12 + 10, 30.0)', name: 'accurate for values near 1.7e12', hidden: true },
            { call: 'stream_var(iter(DATA))', hidden: true },
          ],
          hints: [
            'Start from the Welford update in the lesson: `n`, `mean`, `m2`.',
            'At the end: `m2 / (n - 1) if n > 1 else 0.0`.',
          ],
          wrong: [
            py`
              def stream_var(xs):
                  n, s, sq = 0, 0.0, 0.0
                  for x in xs:
                      n += 1
                      s += x
                      sq += x * x
                  if n == 0:
                      return 0, 0.0, 0.0
                  mean = s / n
                  var = (sq - n * mean * mean) / (n - 1) if n > 1 else 0.0
                  return n, mean, var
            `,
            py`
              def stream_var(xs):
                  n, mean, m2 = 0, 0.0, 0.0
                  for x in xs:
                      n += 1
                      d = x - mean
                      mean += d / n
                      m2 += d * (x - mean)
                  return n, mean, m2 / n if n else 0.0
            `,
          ],
          explain: md`
            Welford is one pass, O(1) memory and numerically stable: it only ever squares small deviations. The sum-of-squares version (wrong #1) is also one pass but returns garbage for big values.

            Bonus for interviews: the state \`(n, mean, m2)\` is **mergeable**. Two partitions' states combine with a closed formula (Chan et al.), which is how Spark computes \`stddev\` over a cluster without a second pass. You'll implement that merge in the exam.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u18-l2',
      title: 'MapReduce',
      summary: 'Map, shuffle, reduce: the pattern behind Hadoop, Spark and GROUP BY.',
      steps: [
        {
          type: 'learn',
          title: 'Map, shuffle, reduce',
          body: md`
            MapReduce splits one huge job into three phases:

            1. **map**: every worker reads its chunk and emits \`(key, value)\` pairs, e.g. \`("data", 1)\` per word
            2. **shuffle**: the framework groups all pairs by key and sends each key to one reducer. This crosses the network, so it's the expensive part
            3. **reduce**: each reducer folds the values of one key, e.g. \`sum\`

            Hadoop, Spark's \`reduceByKey\` and SQL's \`GROUP BY\` all run this pattern. Here are the three phases on one machine:
          `,
          code: py`
            from collections import defaultdict

            lines = ["big data", "big ideas big wins"]
            # map
            pairs = [(w, 1) for l in lines
                     for w in l.split()]
            # shuffle: group the values by key
            groups = defaultdict(list)
            for k, v in pairs:
                groups[k].append(v)
            # reduce
            counts = {k: sum(vs)
                      for k, vs in groups.items()}
            print(counts)
          `,
        },
        {
          type: 'choice',
          prompt: 'In a MapReduce job on 500 machines, which phase moves the most data over the network?',
          options: ['The shuffle', 'The map', 'The reduce', 'Writing the output'],
          answer: 0,
          explain: md`
            Mappers run where the data already lives (*data locality*), and reducers write their results locally. The shuffle is all-to-all: every mapper sends pairs to every reducer.

            That's why the first Spark tuning question is "how many bytes do we shuffle?" (see *shuffle read/write* in the Spark UI). Filtering early, combiners and broadcast joins all exist to shrink the shuffle.
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            pairs = [("de", 3), ("us", 5), ("de", 4)]
            groups = {}
            for k, v in pairs:
                groups.setdefault(k, []).append(v)
            print(groups)
            print({k: max(vs) for k, vs in groups.items()})
          `,
          answer: "{'de': [3, 4], 'us': [5]}\n{'de': 4, 'us': 5}",
          explain: 'The shuffle turns a flat list of pairs into one list of values per key, in the order they were emitted. The reducer here is `max`. In Spark this is `groupByKey()` followed by `mapValues(max)`, though `reduceByKey(max)` is better because it combines before the shuffle.',
        },
        {
          type: 'code',
          title: 'Word count',
          prompt: md`
            The "hello world" of big data. Write \`word_count(lines)\` that counts the words in an iterable of text lines (a file works too) and returns a dict word → count.

            - Lower-case everything. A **word** is a run of letters a–z: use \`re.findall(r"[a-z]+", line.lower())\`, so \`"Data,"\` and \`"data"\` are the same word.
            - Stream the lines: one line at a time.

            \`\`\`python
            word_count(["Big data, big ideas."])
            # {'big': 2, 'data': 1, 'ideas': 1}
            \`\`\`
          `,
          starter: py`
            import re

            def word_count(lines):
                pass
          `,
          solution: py`
            import re
            from collections import Counter

            def word_count(lines):
                counts = Counter()
                for line in lines:
                    words = re.findall(r"[a-z]+", line.lower())
                    counts.update(words)
                return dict(counts)
          `,
          tests: [
            { call: 'word_count(["Big data, big ideas."])', expect: '{"big": 2, "data": 1, "ideas": 1}' },
            { call: 'word_count([])', expect: '{}' },
            { call: 'word_count(["It\'s 2025: AI/ML!"])', expect: '{"it": 1, "s": 1, "ai": 1, "ml": 1}', hidden: true },
            { call: 'word_count(open("data/words.txt"))["data"]', name: 'count of "data" in data/words.txt', hidden: true },
            { call: 'word_count(open("data/words.txt"))', name: 'all counts for data/words.txt', hidden: true },
          ],
          hints: [
            '`Counter.update(list_of_words)` adds 1 per word.',
            'Map = `re.findall(...)` per line, reduce = adding the counts.',
          ],
          wrong: [
            py`
              from collections import Counter

              def word_count(lines):
                  counts = Counter()
                  for line in lines:
                      counts.update(line.lower().split())
                  return dict(counts)
            `,
            py`
              import re
              from collections import Counter

              def word_count(lines):
                  counts = Counter()
                  for line in lines:
                      counts.update(re.findall(r"[a-zA-Z]+", line))
                  return dict(counts)
            `,
          ],
          explain: md`
            \`split()\` keeps punctuation (\`"data,"\` ≠ \`"data"\`), and forgetting to lower-case splits \`"Big"\` from \`"big"\`. Normalisation bugs like these silently skew every downstream metric.

            O(total characters) time, O(distinct words) memory. On a cluster each mapper builds its own \`Counter\` for its chunk, and the reducers add those up.
          `,
        },
        {
          type: 'learn',
          title: 'You write two functions',
          body: md`
            The beauty of MapReduce is the split of responsibilities. **You** write two small functions, and the **framework** does distribution, the shuffle and retries:

            - \`mapper(record)\` returns an iterable of \`(key, value)\` pairs: zero, one or many
            - \`reducer(key, values)\` gets one key and the **list** of all its values

            Mappers and reducers are pure functions, so a failed task can simply be re-run on another machine with the same result. That is how Hadoop survives dying disks every day.
          `,
          code: py`
            def mapper(line):
                for w in line.lower().split():
                    yield w, 1

            def reducer(key, values):
                return sum(values)

            print(list(mapper("Big big data")))
            print(reducer("big", [1, 1]))
          `,
        },
        {
          type: 'code',
          title: 'A tiny MapReduce framework',
          prompt: md`
            Write \`map_reduce(records, mapper, reducer)\`:

            1. call \`mapper(record)\` for every record. It returns an iterable of \`(key, value)\` pairs, possibly empty;
            2. group the values by key, keeping the order in which they were emitted;
            3. return a dict \`{key: reducer(key, values)}\`, where \`values\` is a **list**.

            \`\`\`python
            mapper = lambda x: [(x % 3, x)]
            reducer = lambda k, vs: sum(vs)
            map_reduce(range(10), mapper, reducer)
            # {0: 18, 1: 12, 2: 15}
            \`\`\`
          `,
          starter: py`
            def map_reduce(records, mapper, reducer):
                pass
          `,
          solution: py`
            from collections import defaultdict

            def map_reduce(records, mapper, reducer):
                groups = defaultdict(list)
                for rec in records:
                    for key, value in mapper(rec):
                        groups[key].append(value)
                return {k: reducer(k, vs)
                        for k, vs in groups.items()}
          `,
          tests: [
            { call: 'map_reduce(range(10), lambda x: [(x % 3, x)], lambda k, vs: sum(vs))', expect: '{0: 18, 1: 12, 2: 15}' },
            { call: 'map_reduce(range(5), lambda x: [] if x % 2 else [("even", x)], lambda k, vs: vs)', expect: '{"even": [0, 2, 4]}', name: 'mapper may emit nothing; values keep their order' },
            { call: 'map_reduce(["a", "bb"], lambda s: [(len(s), s)], lambda k, vs: f"{k}:{vs}")', expect: '{1: "1:[\'a\']", 2: "2:[\'bb\']"}', name: 'reducer gets the key and a list', hidden: true },
            { call: 'map_reduce(["ab"], lambda s: ((c, 1) for c in s * 2), lambda k, vs: sum(vs))', expect: '{"a": 2, "b": 2}', name: 'mapper may yield many pairs', hidden: true },
            { call: 'map_reduce([], lambda r: [(r, 1)], lambda k, vs: 0)', expect: '{}', hidden: true },
            { call: 'map_reduce(open("data/words.txt"), lambda l: [(w, 1) for w in l.lower().split()], lambda k, vs: len(vs))', name: 'word count on data/words.txt', hidden: true },
          ],
          hints: [
            'A `defaultdict(list)` is your shuffle: `groups[key].append(value)`.',
            'Two nested loops: over the records, then over the pairs that `mapper(rec)` returns.',
            'Finally call `reducer(k, vs)` once per key.',
          ],
          wrong: [
            py`
              from collections import defaultdict

              def map_reduce(records, mapper, reducer):
                  groups = defaultdict(list)
                  for rec in records:
                      for key, value in mapper(rec):
                          groups[key].append(value)
                  return {k: reducer(vs) for k, vs in groups.items()}
            `,
            py`
              from collections import defaultdict

              def map_reduce(records, mapper, reducer):
                  groups = defaultdict(list)
                  for rec in records:
                      key, value = mapper(rec)
                      groups[key].append(value)
                  return {k: reducer(k, vs) for k, vs in groups.items()}
            `,
          ],
          explain: md`
            The dict is a one-machine **hash shuffle**. Hadoop instead partitions the map output by \`hash(key) % R\` (one part per reducer), sorts each part and merge-sorts them on the reducer side. Same result: every reducer sees all values of its keys together.

            O(N) to map and group, plus the reducers' work. The weak spot is memory: one key with a billion values makes one giant list. That's *skew*, coming up in this lesson.
          `,
        },
        {
          type: 'learn',
          title: 'The inverted index',
          body: md`
            Google's original MapReduce paper used it to build the **inverted index**: for every word, the list of documents that contain it. Search becomes a lookup instead of a scan.

            - map: \`(line_no, text)\` → \`(word, line_no)\` for each word
            - reduce: \`word, [line numbers]\` → sorted, **unique** line numbers

            An AND query ("big data") intersects the lists of its words. Lucene and Elasticsearch, and the full-text indexes inside databases, are built on this structure.
          `,
          code: py`
            from collections import defaultdict

            docs = ["big data", "data lake", "big big lake"]
            index = defaultdict(set)
            for i, text in enumerate(docs, start=1):
                for w in text.split():
                    index[w].add(i)
            print(dict(index))
            print(index["big"] & index["lake"])
          `,
        },
        {
          type: 'code',
          title: 'Build a search index',
          prompt: md`
            Write two functions:

            - \`build_index(lines)\` → dict word → **sorted list of unique line numbers** (1-based) that contain the word. Words as in word count: \`re.findall(r"[a-z]+", line.lower())\`.
            - \`search(index, query)\` → sorted list of the line numbers that contain **every** word of the query (tokenised the same way). Return \`[]\` if a word is unknown or the query has no words.

            \`\`\`python
            docs = ["Big data", "data, data!", "big lakes"]
            idx = build_index(docs)
            idx["data"]               # [1, 2]
            search(idx, "big DATA")   # [1]
            \`\`\`

            The tests also index 20 000 lines that all contain the same word, so keep each step O(1).
          `,
          setup: py`
            BIG = ["data pipeline data"] * 20000
          `,
          starter: py`
            import re

            def build_index(lines):
                pass

            def search(index, query):
                pass
          `,
          solution: py`
            import re
            from collections import defaultdict

            def words(text):
                return re.findall(r"[a-z]+", text.lower())

            def build_index(lines):
                index = defaultdict(set)
                for i, line in enumerate(lines, start=1):
                    for w in words(line):
                        index[w].add(i)
                return {w: sorted(s) for w, s in index.items()}

            def search(index, query):
                terms = words(query)
                if not terms:
                    return []
                hits = set(index.get(terms[0], []))
                for t in terms[1:]:
                    hits &= set(index.get(t, []))
                return sorted(hits)
          `,
          tests: [
            { call: 'build_index(["Big data", "data, data!", "big lakes"])', expect: '{"big": [1, 3], "data": [1, 2], "lakes": [3]}' },
            { call: 'search(build_index(["Big data", "data, data!", "big lakes"]), "big DATA")', expect: '[1]' },
            { call: 'search(build_index(["Big data"]), "big spark")', expect: '[]', name: 'unknown word → []' },
            { call: 'search(build_index(["Big data"]), "...")', expect: '[]', name: 'query without words → []', hidden: true },
            { call: 'build_index(open("data/words.txt"))', name: 'index of data/words.txt', hidden: true },
            { call: 'search(build_index(open("data/words.txt")), "the data")', hidden: true },
            { call: 'len(build_index(BIG)["data"])', expect: '20000', name: '20 000 lines, fast', maxMs: 250, hidden: true },
          ],
          hints: [
            '`enumerate(lines, start=1)` gives 1-based line numbers.',
            'Collect line numbers in a `set` per word (no duplicates, O(1) adds) and sort at the end.',
            'For `search`, intersect sets: `hits &= set(index.get(t, []))`.',
          ],
          wrong: [
            py`
              import re
              from collections import defaultdict

              def build_index(lines):
                  index = defaultdict(set)
                  for i, line in enumerate(lines):
                      for w in re.findall(r"[a-z]+", line.lower()):
                          index[w].add(i)
                  return {w: sorted(s) for w, s in index.items()}

              def search(index, query):
                  terms = re.findall(r"[a-z]+", query.lower())
                  if not terms:
                      return []
                  hits = set(index.get(terms[0], []))
                  for t in terms[1:]:
                      hits &= set(index.get(t, []))
                  return sorted(hits)
            `,
            py`
              import re
              from collections import defaultdict

              def build_index(lines):
                  index = defaultdict(list)
                  for i, line in enumerate(lines, start=1):
                      for w in re.findall(r"[a-z]+", line.lower()):
                          if i not in index[w]:
                              index[w].append(i)
                  return dict(index)

              def search(index, query):
                  terms = re.findall(r"[a-z]+", query.lower())
                  if not terms:
                      return []
                  hits = set(index.get(terms[0], []))
                  for t in terms[1:]:
                      hits &= set(index.get(t, []))
                  return sorted(hits)
            `,
            py`
              import re
              from collections import defaultdict

              def build_index(lines):
                  index = defaultdict(set)
                  for i, line in enumerate(lines, start=1):
                      for w in re.findall(r"[a-z]+", line.lower()):
                          index[w].add(i)
                  return {w: sorted(s) for w, s in index.items()}

              def search(index, query):
                  hits = set()
                  for t in re.findall(r"[a-z]+", query.lower()):
                      hits |= set(index.get(t, []))
                  return sorted(hits)
            `,
          ],
          explain: md`
            \`i not in some_list\` scans the list, so a word on every line costs O(n²) in total (wrong #2 needs seconds for 20 000 lines; a web crawl has billions). A set makes every add O(1).

            Real engines store the lists sorted and compressed (delta encoding) and intersect them with two pointers, starting from the rarest word. The AND query is an intersection, OR would be a union (wrong #3).
          `,
        },
        {
          type: 'learn',
          title: 'Combiners and skew',
          body: md`
            Shuffling \`("the", 1)\` a billion times wastes the network. A **combiner** pre-reduces on each mapper (say, its local \`Counter\`), so every mapper ships \`("the", 48210)\` just once. Spark's \`reduceByKey\` does this automatically, \`groupByKey\` doesn't.

            It's only safe when the reduce is **associative and commutative**: sum, count, min, max. A mean isn't: ship \`(sum, count)\` and divide at the very end.

            **Skew**: one hot key (a bot, \`null\`, "US") lands on a single reducer, and the whole job waits for that straggler. The fix is **salting**: split the hot key into \`key#0 … key#N-1\`, aggregate, then combine the partials.
          `,
          code: py`
            from collections import Counter

            chunks = [["a", "b", "a"], ["a", "c"]]
            partials = [Counter(c) for c in chunks]
            print(partials)             # combiners
            print(sum(partials, Counter()))  # reducer
          `,
        },
        {
          type: 'choice',
          prompt: 'Which reduce function can NOT be reused as its own combiner?',
          options: ['mean of the values', 'sum of the values', 'max of the values', 'min of the values'],
          answer: 0,
          explain: 'mean(mean(1, 2, 3), mean(4)) = mean(2, 4) = 3, but the true mean is 2.5. Sum, max and min give the same answer however you group the values (associative + commutative). For a mean, combine `(sum, count)` pairs instead, as in the next exercise. Spark\'s `avg` keeps exactly such a `(sum, count)` buffer per partition.',
        },
        {
          type: 'code',
          title: 'A distributed mean',
          prompt: md`
            Every mapper sees one chunk of \`(key, value)\` pairs. Write:

            - \`combine(pairs)\` → dict key → \`(sum, count)\` (a **tuple**) for one chunk;
            - \`final_means(partials)\` → takes a list of such dicts, one per mapper, and returns a dict key → mean over **all** values.

            \`\`\`python
            p1 = combine([("de", 10), ("de", 20), ("us", 5)])
            p2 = combine([("de", 60)])
            p1
            # {'de': (30, 2), 'us': (5, 1)}
            final_means([p1, p2])
            # {'de': 30.0, 'us': 5.0}
            \`\`\`
          `,
          setup: py`
            import csv
            with open("data/orders.csv") as f:
                ROWS = [(r["category"], float(r["unit_price"]))
                        for r in csv.DictReader(f)]
            CHUNKS = [ROWS[i::4] for i in range(4)]
          `,
          starter: py`
            def combine(pairs):
                pass

            def final_means(partials):
                pass
          `,
          solution: py`
            def combine(pairs):
                acc = {}
                for k, v in pairs:
                    s, c = acc.get(k, (0, 0))
                    acc[k] = (s + v, c + 1)
                return acc

            def final_means(partials):
                tot = {}
                for part in partials:
                    for k, (s, c) in part.items():
                        S, C = tot.get(k, (0, 0))
                        tot[k] = (S + s, C + c)
                return {k: s / c for k, (s, c) in tot.items()}
          `,
          tests: [
            { call: 'combine([("de", 10), ("de", 20), ("us", 5)])', expect: '{"de": (30, 2), "us": (5, 1)}' },
            { call: 'final_means([combine([("de", 10), ("de", 20), ("us", 5)]), combine([("de", 60)])])', expect: '{"de": 30.0, "us": 5.0}' },
            { call: 'combine([])', expect: '{}', hidden: true },
            { call: 'final_means([])', expect: '{}', hidden: true },
            { call: 'final_means([combine(c) for c in CHUNKS])', name: 'mean unit_price per category of orders.csv, in 4 chunks', hidden: true },
          ],
          hints: [
            'In `combine`, keep a running `(sum, count)` per key: `acc.get(k, (0, 0))`.',
            'In `final_means`, add up the sums and the counts per key across all partials. Divide only at the very end.',
          ],
          wrong: [
            py`
              def combine(pairs):
                  acc = {}
                  for k, v in pairs:
                      s, c = acc.get(k, (0, 0))
                      acc[k] = (s + v, c + 1)
                  return acc

              def final_means(partials):
                  means = {}
                  for part in partials:
                      for k, (s, c) in part.items():
                          means.setdefault(k, []).append(s / c)
                  return {k: sum(m) / len(m) for k, m in means.items()}
            `,
            py`
              def combine(pairs):
                  acc = {}
                  for k, v in pairs:
                      acc.setdefault(k, []).append(v)
                  return {k: (sum(v) / len(v), len(v)) for k, v in acc.items()}

              def final_means(partials):
                  tot = {}
                  for part in partials:
                      for k, (m, c) in part.items():
                          S, C = tot.get(k, (0, 0))
                          tot[k] = (S + m, C + 1)
                  return {k: s / c for k, (s, c) in tot.items()}
            `,
          ],
          explain: md`
            The mean of the partial means (wrong #1) weights a chunk with 1 value like a chunk with 1 million: here it gives 37.5 instead of 30 for "de". The \`(sum, count)\` pair is associative, so it can be combined in any order and on any machine.

            This is exactly how Spark implements \`avg\`: a partial aggregate per partition, a shuffle of tiny \`(sum, count)\` buffers, then a final merge. Distributed variance works the same with \`(n, mean, m2)\`.
          `,
        },
        {
          type: 'choice',
          prompt: 'A Spark job counts events per user_id. 199 of 200 tasks finish in 2 minutes, one runs for 2 hours. A single bot account produced 40 % of all events. Best fix?',
          options: [
            'Salt the hot key, aggregate twice',
            'Add 200 more executors',
            'Give every executor more memory',
            'Sort the input by user_id first',
          ],
          answer: 0,
          explain: md`
            All rows of one key go to one task, however many machines you add. Salting spreads the bot over N tasks (\`bot#0 … bot#N-1\`), and a second, tiny aggregation merges the N partial counts.

            Spark 3's adaptive query execution splits skewed *join* partitions automatically. Often the best fix is even simpler: filter the bots out early.
          `,
        },
        {
          type: 'blanks',
          prompt: 'Two-stage aggregation with a salted key. Complete stage 2 so the program prints `6 1`.',
          code: py`
            from collections import Counter

            events = ["bot"] * 6 + ["ann", "bob"]
            stage1 = Counter()
            for i, user in enumerate(events):
                stage1[f"{user}#{i % 3}"] += 1  # salted
            stage2 = Counter()
            for key, c in stage1.items():
                stage2[key.___("#")[0]] += ___
            print(stage2["bot"], stage2["ann"])
          `,
          bank: ['split', 'c', '1', 'strip', 'key', 'len(c)'],
          answer: ['split', 'c'],
          tests: [{ stdout: '6 1\n' }],
          explain: 'Stage 1 spreads "bot" over three salted keys with 2 events each. Stage 2 strips the salt and **adds the partial counts**. Adding 1 instead would count partial groups (bot = 3). In Spark you\'d add a salt column (`concat(key, \'#\', rand_int)`), aggregate by the salted key, then aggregate again by the original key.',
        },
      ],
    },
    // ------------------------------------------------------------------ L3
    {
      id: 'u18-l3',
      title: 'Top-K & Heavy Hitters',
      summary: 'Find the biggest, slowest and most frequent things without sorting everything.',
      steps: [
        {
          type: 'learn',
          title: 'Top-k without sorting everything',
          body: md`
            "Top 10 products", "top 100 queries", "slowest endpoints": top-k is the most common big-data question.

            - \`sorted(xs, reverse=True)[:k]\`: O(n log n), needs all n items in memory
            - \`heapq.nlargest(k, xs, key=...)\`: O(n log k), keeps only k items, streams
            - \`Counter.most_common(k)\`: counting plus \`nlargest\`

            Ties need an explicit rule, because "first seen" changes when data is split differently. For "highest score first, ties A→Z", use \`heapq.nsmallest\` with the key \`(-score, name)\`.
          `,
          code: py`
            import heapq
            from collections import Counter

            c = Counter(["/", "/cart", "/", "/api"])
            print(c.most_common(1))
            pairs = [("bo", 7), ("al", 9), ("cy", 7)]
            print(heapq.nsmallest(2, pairs,
                  key=lambda p: (-p[1], p[0])))
          `,
        },
        {
          type: 'choice',
          prompt: 'In "mississippi", `i` and `s` both appear 4 times. What does this print?',
          code: py`
            from collections import Counter
            print(Counter("mississippi").most_common(1))
          `,
          options: ["[('i', 4)]", "[('s', 4)]", "[('i', 4), ('s', 4)]", "[('m', 1)]"],
          answer: 0,
          checkOutput: true,
          explain: '`most_common` breaks ties by insertion order: `i` was seen before `s`. On a cluster, "insertion order" depends on how the data was partitioned, so the same query can return different winners on different runs. Always add an explicit tie-break.',
        },
        {
          type: 'code',
          title: 'Most requested paths',
          prompt: md`
            Write \`top_paths(lines, k)\` that returns the \`k\` most requested paths of an access log as \`(path, count)\` tuples, most requests first, **ties by path A→Z**.

            - The path is field 6 of \`line.split()\`, without its query string: \`/search?q=mug\` → \`/search\`.
            - Skip lines that don't have exactly 11 fields.
            - In the tests, \`L("/a")\` builds a valid log line for the path \`/a\`.

            \`\`\`python
            top_paths([L("/b"), L("/a"),
                       L("/b?x=1"), L("/c")], 2)
            # [('/b', 2), ('/a', 1)]
            \`\`\`
          `,
          setup: LOG_HELPER,
          starter: py`
            import heapq
            from collections import Counter

            def top_paths(lines, k):
                pass
          `,
          solution: py`
            import heapq
            from collections import Counter

            def top_paths(lines, k):
                counts = Counter()
                for line in lines:
                    p = line.split()
                    if len(p) == 11:
                        counts[p[6].split("?")[0]] += 1
                return heapq.nsmallest(
                    k, counts.items(),
                    key=lambda kv: (-kv[1], kv[0]))
          `,
          tests: [
            { call: 'top_paths([L("/b"), L("/a"), L("/b?x=1"), L("/c")], 2)', expect: '[("/b", 2), ("/a", 1)]' },
            { call: 'top_paths([L("/z"), L("/y"), L("/x")], 2)', expect: '[("/x", 1), ("/y", 1)]', name: 'ties: path A→Z, not first seen' },
            { call: 'top_paths(["", "bad line", L("/a")], 5)', expect: '[("/a", 1)]', hidden: true },
            { call: 'top_paths([L("/a")], 0)', expect: '[]', hidden: true },
            { call: 'top_paths(open("data/server.log"), 5)', name: 'top 5 of data/server.log', hidden: true },
          ],
          hints: [
            'Count with a `Counter`, keyed by `p[6].split("?")[0]`.',
            '`heapq.nsmallest(k, counts.items(), key=...)` with the key `(-count, path)`.',
          ],
          wrong: [
            py`
              from collections import Counter

              def top_paths(lines, k):
                  counts = Counter()
                  for line in lines:
                      p = line.split()
                      if len(p) == 11:
                          counts[p[6].split("?")[0]] += 1
                  return counts.most_common(k)
            `,
            py`
              import heapq
              from collections import Counter

              def top_paths(lines, k):
                  counts = Counter()
                  for line in lines:
                      p = line.split()
                      if len(p) == 11:
                          counts[p[6]] += 1
                  return heapq.nsmallest(k, counts.items(), key=lambda kv: (-kv[1], kv[0]))
            `,
          ],
          explain: md`
            Counting is O(n), the selection O(m log k) for m distinct paths, and memory is O(m). \`most_common\` alone (wrong #1) gives a tie order that depends on the input order, which is the bug behind "the dashboard changes when I rerun it".

            On a cluster this is one shuffle (count per path), then every partition keeps its local top k and the driver merges them: Spark's \`takeOrdered\`.
          `,
        },
        {
          type: 'learn',
          title: 'A size-k heap in a stream',
          body: md`
            \`nlargest\` hides a trick you should be able to write yourself: keep a **min-heap of size k**. Its root \`h[0]\` is the smallest of the current top k, the bar that a newcomer must beat.

            - heap not full → \`heappush\`
            - \`x > h[0]\` → \`heapreplace(h, x)\` (pop the root and push x in one O(log k) step)
            - otherwise ignore x

            O(n log k) time and O(k) memory: the top 100 of 10 billion items fits on any machine. Only \`h[0]\` is special: the rest of the heap list is **not** sorted.
          `,
          code: py`
            import heapq

            h = []
            for x in [5, 1, 8, 3, 9, 2]:
                if len(h) < 3:
                    heapq.heappush(h, x)
                elif x > h[0]:
                    heapq.heapreplace(h, x)
            print(h[0], sorted(h, reverse=True))
          `,
        },
        {
          type: 'output',
          prompt: 'This version pushes first and pops when the heap grows too big. Type exactly what it prints.',
          code: py`
            import heapq

            h = []
            for x in [4, 10, 2, 7, 7, 1]:
                heapq.heappush(h, x)
                if len(h) > 2:
                    heapq.heappop(h)
            print(h[0])
            print(sorted(h))
          `,
          answer: '7\n[7, 10]',
          explain: 'Every pop removes the current minimum, so the heap always holds the two largest values seen so far: [4, 10] → [4, 10] → [7, 10] → [7, 10] → [7, 10]. The root is the 2nd largest. Spark\'s `takeOrdered(k)` runs this per partition and merges the k-sized results on the driver.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the streaming top-k',
          prompt: md`
            \`top_k_stream(nums, k)\` should return the \`k\` largest numbers of a stream, largest first, in O(n log k). A teammate's version sometimes returns the wrong numbers, and it crashes for \`k = 0\` (which should return \`[]\`). Fix both bugs.

            \`\`\`python
            top_k_stream([1, 5, 3, 4], 2)   # [5, 4]
            \`\`\`
          `,
          starter: py`
            import heapq

            def top_k_stream(nums, k):
                h = []
                for x in nums:
                    if len(h) < k:
                        heapq.heappush(h, x)
                    elif x > h[-1]:
                        heapq.heapreplace(h, x)
                return sorted(h, reverse=True)
          `,
          solution: py`
            import heapq

            def top_k_stream(nums, k):
                if k <= 0:
                    return []
                h = []
                for x in nums:
                    if len(h) < k:
                        heapq.heappush(h, x)
                    elif x > h[0]:
                        heapq.heapreplace(h, x)
                return sorted(h, reverse=True)
          `,
          tests: [
            { call: 'top_k_stream([1, 5, 3, 4], 2)', expect: '[5, 4]' },
            { call: 'top_k_stream([3, 1], 0)', expect: '[]', name: 'k = 0 → []' },
            { call: 'top_k_stream([3, 1], 5)', expect: '[3, 1]', name: 'fewer items than k' },
            { call: 'top_k_stream([5, 5, 5, 1], 2)', expect: '[5, 5]', hidden: true },
            { call: 'top_k_stream(iter([]), 3)', expect: '[]', hidden: true },
            { call: 'top_k_stream((x * 7919 % 10007 for x in range(50000)), 5)', name: 'big stream', hidden: true },
          ],
          hints: [
            'Which element of a heap list is guaranteed to be the smallest? Only one index is.',
            '`h[-1]` is just some leaf. Compare with `h[0]`, and return `[]` early when `k <= 0`.',
          ],
          wrong: [
            py`
              import heapq

              def top_k_stream(nums, k):
                  if k <= 0:
                      return []
                  h = []
                  for x in nums:
                      if len(h) < k:
                          heapq.heappush(h, x)
                      elif x > h[-1]:
                          heapq.heapreplace(h, x)
                  return sorted(h, reverse=True)
            `,
            py`
              import heapq

              def top_k_stream(nums, k):
                  h = []
                  for x in nums:
                      if len(h) < k:
                          heapq.heappush(h, x)
                      elif x > h[0]:
                          heapq.heapreplace(h, x)
                  return sorted(h, reverse=True)
            `,
          ],
          explain: md`
            A heap only guarantees \`h[0] <= h[i]\` for every i: the list is not sorted, and \`h[-1]\` isn't the max or the min. With \`h[-1]\` the bar is too high and real top-k items get rejected. That bug passes many tests, because sometimes \`h[-1]\` happens to be the minimum.

            For \`k = 0\` there is no bar at all: \`h[0]\` on an empty list raises \`IndexError\`, so handle it up front. Edge cases like k = 0, k > n and duplicates are exactly what interviewers probe. On a cluster every partition runs this heap and only the k-sized heaps travel to the driver.
          `,
        },
        {
          type: 'learn',
          title: 'Percentiles and log parsing',
          body: md`
            Averages hide pain: 99 requests at 0.1 s and one at 9 s average 0.19 s. SLOs use **percentiles**: p95 is the latency that 95 % of requests beat.

            Nearest-rank p95: sort the n values and take the one at 1-based position \`ceil(0.95 * n)\`, which is index \`ceil(0.95 * n) - 1\`.

            Exact percentiles need every value per key. At scale, engines use sketches (t-digest, \`approx_percentile\`) with tiny memory.

            For parsing, a regex with **groups** is sturdier than counting split fields:
          `,
          code: py`
            import re, math

            pat = re.compile(
                r'"(\w+) (\S+) [^"]*" (\d{3}) \S+ ([\d.]+)$')
            line = ("1.2.3.4 - - [12/Nov/2025:09:00:40 +0000]"
                    ' "GET /a?q=1 HTTP/1.1" 200 512 0.25')
            print(pat.search(line).groups())

            xs = sorted([0.1, 0.4, 0.2, 0.9, 0.3])
            print(xs[math.ceil(0.95 * len(xs)) - 1])
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete the parsing so the program prints `POST /api/cart 202`.',
          code: py`
            import re

            pat = re.compile(
                r'"(\w+) (\S+) HTTP/[\d.]+" (\d+)')
            line = ('9.9.9.9 - - [x] "POST /api/cart'
                    ' HTTP/1.1" 201 77 0.1')
            m = pat.___(line)
            method, path, status = m.___()
            print(method, path, int(status) + 1)
          `,
          bank: ['search', 'groups', 'match', 'group', 'findall', 'split'],
          answer: ['search', 'groups'],
          tests: [{ stdout: 'POST /api/cart 202\n' }],
          explain: '`match` only tries at the very start of the string, where the IP is, so it would return `None`. `search` scans for the pattern anywhere. `groups()` returns all captured groups as a tuple; `group()` would return the whole matched text. Log pipelines do the same with `regexp_extract` in Spark SQL or grok patterns in log shippers.',
        },
        {
          type: 'code',
          title: 'Slowest endpoints by p95',
          prompt: md`
            Write \`slowest_endpoints(lines, k, min_count=5)\` that returns the \`k\` endpoints with the highest **p95 latency** as \`(endpoint, p95)\` tuples, slowest first, ties by endpoint A→Z.

            - endpoint = \`"METHOD /path"\`, with the query string removed and every **all-digit** path segment replaced by \`:id\`: \`GET /api/products/40?x=1\` → \`GET /api/products/:id\`
            - p95 = nearest rank: the sorted latencies at index \`ceil(0.95 * n) - 1\`
            - ignore endpoints with fewer than \`min_count\` requests, and lines your regex can't parse
            - \`L(path, secs, method="GET")\` builds test lines

            \`\`\`python
            slowest_endpoints([L("/a/1", 0.5), L("/a/22", 0.9),
                               L("/b?q=1", 0.2), L("/b", 0.3)],
                              2, min_count=1)
            # [('GET /a/:id', 0.9), ('GET /b', 0.3)]
            \`\`\`
          `,
          setup: LOG_HELPER,
          starter: py`
            import re, math

            def slowest_endpoints(lines, k, min_count=5):
                pass
          `,
          solution: py`
            import re, math
            from collections import defaultdict

            PAT = re.compile(
                r'"(\w+) (\S+) [^"]*" \d{3} \S+ ([\d.]+)$')

            def endpoint(method, path):
                path = path.split("?")[0]
                segs = [":id" if s.isdigit() else s
                        for s in path.split("/")]
                return method + " " + "/".join(segs)

            def slowest_endpoints(lines, k, min_count=5):
                lat = defaultdict(list)
                for line in lines:
                    m = PAT.search(line.strip())
                    if m:
                        meth, path, secs = m.groups()
                        ep = endpoint(meth, path)
                        lat[ep].append(float(secs))
                res = []
                for ep, xs in lat.items():
                    if len(xs) >= min_count:
                        xs.sort()
                        i = math.ceil(0.95 * len(xs)) - 1
                        res.append((ep, xs[i]))
                res.sort(key=lambda t: (-t[1], t[0]))
                return res[:k]
          `,
          tests: [
            { call: 'slowest_endpoints([L("/a/1", 0.5), L("/a/22", 0.9), L("/b?q=1", 0.2), L("/b", 0.3)], 2, min_count=1)', expect: '[("GET /a/:id", 0.9), ("GET /b", 0.3)]' },
            { call: 'slowest_endpoints([L("/x", s) for s in range(1, 21)], 1)', expect: '[("GET /x", 19.0)]', name: 'nearest rank: p95 of 1..20 is 19' },
            { call: 'slowest_endpoints([L("/a", 1)] * 4 + [L("/b", 0.1)] * 5, 3)', expect: '[("GET /b", 0.1)]', name: 'min_count filters rare endpoints', hidden: true },
            { call: 'slowest_endpoints([L("/v2/items/7", 0.4, "POST"), L("/v2/items/8/tags", 0.6)], 5, min_count=1)', expect: '[("GET /v2/items/:id/tags", 0.6), ("POST /v2/items/:id", 0.4)]', hidden: true },
            { call: 'slowest_endpoints(["junk", L("/a", 0.2)], 1, min_count=1)', expect: '[("GET /a", 0.2)]', hidden: true },
            { call: 'slowest_endpoints(open("data/server.log"), 3)', name: 'top 3 of data/server.log (has a tie)', hidden: true },
          ],
          hints: [
            'Group latencies per endpoint in a `defaultdict(list)`. Build the endpoint with `path.split("?")[0]` and `seg.isdigit()` per `/`-segment.',
            'Sort each list and take `xs[math.ceil(0.95 * len(xs)) - 1]`.',
            'Sort the results with `key=lambda t: (-t[1], t[0])` and slice `[:k]`.',
          ],
          wrong: [
            py`
              import re
              from collections import defaultdict

              PAT = re.compile(r'"(\w+) (\S+) [^"]*" \d{3} \S+ ([\d.]+)$')

              def slowest_endpoints(lines, k, min_count=5):
                  lat = defaultdict(list)
                  for line in lines:
                      m = PAT.search(line.strip())
                      if m:
                          meth, path, secs = m.groups()
                          segs = [":id" if s.isdigit() else s for s in path.split("?")[0].split("/")]
                          lat[meth + " " + "/".join(segs)].append(float(secs))
                  res = []
                  for ep, xs in lat.items():
                      if len(xs) >= min_count:
                          xs.sort()
                          res.append((ep, xs[min(int(0.95 * len(xs)), len(xs) - 1)]))
                  res.sort(key=lambda t: (-t[1], t[0]))
                  return res[:k]
            `,
            py`
              import re, math
              from collections import defaultdict

              PAT = re.compile(r'"(\w+) (\S+) [^"]*" \d{3} \S+ ([\d.]+)$')

              def slowest_endpoints(lines, k, min_count=5):
                  lat = defaultdict(list)
                  for line in lines:
                      m = PAT.search(line.strip())
                      if m:
                          meth, path, secs = m.groups()
                          segs = [":id" if s.isdigit() else s for s in path.split("?")[0].split("/")]
                          lat[meth + " " + "/".join(segs)].append(float(secs))
                  res = []
                  for ep, xs in lat.items():
                      if len(xs) >= min_count:
                          xs.sort()
                          res.append((ep, xs[math.ceil(0.95 * len(xs)) - 1]))
                  res.sort(key=lambda t: -t[1])
                  return res[:k]
            `,
            py`
              import re, math
              from collections import defaultdict

              PAT = re.compile(r'"(\w+) (\S+) [^"]*" \d{3} \S+ ([\d.]+)$')

              def slowest_endpoints(lines, k, min_count=5):
                  lat = defaultdict(list)
                  for line in lines:
                      m = PAT.search(line.strip())
                      if m:
                          meth, path, secs = m.groups()
                          lat[meth + " " + path.split("?")[0]].append(float(secs))
                  res = []
                  for ep, xs in lat.items():
                      if len(xs) >= min_count:
                          xs.sort()
                          res.append((ep, xs[math.ceil(0.95 * len(xs)) - 1]))
                  res.sort(key=lambda t: (-t[1], t[0]))
                  return res[:k]
            `,
          ],
          explain: md`
            Normalising \`/api/products/40\` to \`/api/products/:id\` matters: without it, every product id is its own "endpoint" with too few requests to rank. \`int(0.95 * n)\` (wrong #1) is the classic off-by-one: for n = 20 it picks the maximum, not the 19th value.

            Cost: O(n) to parse and group, plus O(m log m) sorting per endpoint. Monitoring systems can't keep every latency, so they store **histograms or t-digests** per endpoint and minute: small, mergeable, approximately right.
          `,
        },
        {
          type: 'learn',
          title: 'Sketches: approximate counting',
          body: md`
            Exact answers need memory proportional to the data: a \`set\` of 2 billion user ids is ~100 GB. When ±1 % is fine, **sketches** use kilobytes:

            - **Count-Min Sketch** (how often?): d rows of w counters. Each item increments one counter per row, and the estimate is the **minimum** of its d counters. Collisions only add, so it can over-count but **never under-counts**.
            - **HyperLogLog** (how many distinct?): hash every item and remember the longest run of leading zero bits per bucket. ~1 % error in 12 KB for billions of items: \`APPROX_COUNT_DISTINCT\` in warehouses.
            - **Misra–Gries** (heavy hitters): k − 1 counters catch every item seen more than n/k times.
          `,
          code: py`
            import zlib

            W, D = 50, 3
            table = [[0] * W for _ in range(D)]

            def cells(item):
                for row in range(D):
                    h = zlib.crc32(f"{row}:{item}".encode())
                    yield row, h % W

            def add(item):
                for r, c in cells(item):
                    table[r][c] += 1

            def estimate(item):
                return min(table[r][c] for r, c in cells(item))

            text = open("data/words.txt").read().lower()
            for w in text.split():
                add(w)
            print(estimate("the"), estimate("data"))
          `,
        },
        {
          type: 'choice',
          prompt: 'A Count-Min Sketch estimates that the query "python" appeared 1 200 times today. What do you know about the true count?',
          options: ['It is at most 1 200', 'It is at least 1 200', 'It is exactly 1 200', 'It is within ±10 of 1 200'],
          answer: 0,
          explain: 'Each of the item\'s counters holds its true count **plus** whatever collided with it, so every counter is ≥ the truth, and so is the minimum. With width w = e/ε the over-count is at most ε·N with high probability. Great for "which queries are trending", useless for billing. Stream processors use it for trending topics and heavy-hitter alerts, because sketches from many partitions can be added together cell by cell.',
        },
        {
          type: 'choice',
          prompt: 'Daily distinct users over 5 billion events, for a dashboard where ±2 % is fine, with very little memory. Best tool?',
          options: ['HyperLogLog', 'A Python set per day', 'A Count-Min Sketch', 'Sort all ids, then count'],
          answer: 0,
          explain: md`
            A set is exact, but its memory grows with the number of distinct ids. Count-Min answers "how often is *this* item seen", not "how many distinct items". Sorting is O(n log n) and spills to disk.

            HLL sketches are also **mergeable**: the union of seven daily sketches gives the weekly distinct count. You can't add daily distinct counts, because the same user appears on several days.
          `,
        },
        {
          type: 'code',
          title: 'Misra–Gries heavy hitters',
          prompt: md`
            Implement the **Misra–Gries** summary. \`misra_gries(stream, k)\` reads the stream once and keeps at most \`k - 1\` counters in a dict:

            - item already has a counter → add 1
            - otherwise, fewer than \`k - 1\` counters → add the item with count 1
            - otherwise → **decrement every counter by 1** and delete counters that reach 0 (the new item is not added)

            Return the final dict. Every item that occurs **more than n/k times** is guaranteed to survive (its count is an under-estimate).

            \`\`\`python
            misra_gries("abacabadaa", 3)   # {'a': 4}
            \`\`\`
          `,
          starter: py`
            def misra_gries(stream, k):
                counters = {}
                return counters
          `,
          solution: py`
            def misra_gries(stream, k):
                counters = {}
                for x in stream:
                    if x in counters:
                        counters[x] += 1
                    elif len(counters) < k - 1:
                        counters[x] = 1
                    else:
                        for key in list(counters):
                            counters[key] -= 1
                            if counters[key] == 0:
                                del counters[key]
                return counters
          `,
          tests: [
            { call: 'misra_gries("abacabadaa", 3)', expect: '{"a": 4}' },
            { call: 'misra_gries("aabbcab", 3)', expect: '{"a": 2, "b": 2}' },
            { call: 'misra_gries([], 4)', expect: '{}' },
            { call: 'misra_gries("xyz", 1)', expect: '{}', name: 'k = 1 keeps no counters', hidden: true },
            { code: 'import random\ns = ["hot"] * 3000 + [f"u{i}" for i in range(6000)]\nrandom.Random(1).shuffle(s)\nr = misra_gries(iter(s), 4)\nassert "hot" in r and len(r) <= 3', name: 'a heavy item always survives; at most k-1 counters', hidden: true },
            { call: 'misra_gries((x % 7 if x % 3 else 0 for x in range(3000)), 5)', hidden: true },
          ],
          hints: [
            'Three cases in order: `x in counters`, `len(counters) < k - 1`, else.',
            'Loop over `list(counters)` while decrementing, so you may delete keys during the loop.',
          ],
          wrong: [
            py`
              def misra_gries(stream, k):
                  counters = {}
                  for x in stream:
                      if x in counters:
                          counters[x] += 1
                      elif len(counters) < k - 1:
                          counters[x] = 1
                      else:
                          for key in counters:
                              counters[key] -= 1
                  return counters
            `,
            py`
              def misra_gries(stream, k):
                  counters = {}
                  for x in stream:
                      if x in counters:
                          counters[x] += 1
                      elif len(counters) < k:
                          counters[x] = 1
                      else:
                          for key in list(counters):
                              counters[key] -= 1
                              if counters[key] == 0:
                                  del counters[key]
                  return counters
            `,
            py`
              def misra_gries(stream, k):
                  counters = {}
                  for x in stream:
                      if x in counters:
                          counters[x] += 1
                          continue
                      if len(counters) >= k - 1:
                          for key in list(counters):
                              counters[key] -= 1
                              if counters[key] == 0:
                                  del counters[key]
                      if len(counters) < k - 1:
                          counters[x] = 1
                  return counters
            `,
          ],
          explain: md`
            Why it works: each decrement step cancels k distinct items (the k − 1 counted ones plus the newcomer), so it can happen at most n/k times. An item with more than n/k occurrences can't be cancelled completely.

            One pass, O(k) memory. The surviving keys are *candidates*: a second pass (or an exact count of just those keys) removes false positives. Misra–Gries summaries of different partitions can be merged, so stream processors compute them per partition and combine them. With k = 2 this is the Boyer–Moore majority vote, a favourite interview question. Without deleting zero counters (wrong #1) the dict fills up with dead keys and never admits new items.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u18-l4',
      title: 'Sampling & Partitioning',
      summary: 'Reservoir samples, stable hash partitions and sticky A/B buckets.',
      steps: [
        {
          type: 'learn',
          title: 'Reservoir sampling',
          body: md`
            You want 1 000 random log lines from a stream of unknown length, in one pass with O(k) memory. **Reservoir sampling** (Algorithm R):

            - keep the first k items
            - for item number \`i\` (0-based, \`i >= k\`) draw \`j = randint(0, i)\`; if \`j < k\`, the item replaces \`res[j]\`

            Item i gets in with probability k/(i+1), and later replacements thin everyone out equally: in the end **every item is in the sample with probability k/n**.

            Use your own \`random.Random(seed)\` instead of the global \`random\`: the sample becomes **reproducible**, so a rerun of the job, or a test, sees the same rows.
          `,
          code: py`
            import random

            def reservoir(stream, k, seed=0):
                rng = random.Random(seed)
                res = []
                for i, x in enumerate(stream):
                    if i < k:
                        res.append(x)
                    else:
                        j = rng.randint(0, i)
                        if j < k:
                            res[j] = x
                return res

            print(reservoir(range(10**5), 5))
            print(reservoir(range(10**5), 5))  # same!
          `,
        },
        {
          type: 'choice',
          prompt: 'A reservoir with k = 10 reads a stream of 1 000 000 items. What is the chance that the very first item is still in the sample at the end?',
          options: ['10 / 1 000 000', '1 / 10', 'About 0: it was replaced long ago', '1 / 2'],
          answer: 0,
          explain: 'Every item, first or last, ends up in the sample with probability k/n. The first item enters for sure but has to survive ~1 000 000 replacement draws, while the last one enters with probability k/n and never has to survive anything. That symmetry is the whole point of the algorithm. Spark\'s `sample()` flips a coin per row instead; reservoir sampling is for streams of unknown length, where you need exactly k rows.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines of Algorithm R (`rng` is a `random.Random`).',
          lines: [
            'def reservoir(stream, k, rng):',
            '    res = []',
            '    for i, x in enumerate(stream):',
            '        if i < k:',
            '            res.append(x)',
            '        else:',
            '            j = rng.randint(0, i)',
            '            if j < k:',
            '                res[j] = x',
            '    return res',
          ],
          distractors: ['            j = rng.randint(0, i - 1)'],
          setup: 'import random',
          tests: [
            { call: 'reservoir(range(10), 3, random.Random(0))', expect: '[5, 1, 6]' },
            { call: 'reservoir([1, 2], 5, random.Random(0))', expect: '[1, 2]' },
          ],
          explain: '`randint(0, i)` includes both ends, so there are i + 1 choices and the new item wins with probability k/(i+1). `randint(0, i - 1)` (the distractor) gives later items a slightly higher chance: a biased sample that looks fine at first glance. Biased samples poison every metric computed from them, from A/B analyses to ML training sets.',
        },
        {
          type: 'code',
          title: 'A sample per key',
          prompt: md`
            Debugging needs a few examples of **every** status code, not 1 000 random 200s. Write \`sample_per_key(rows, key, k, seed=0)\`: a uniform random sample of up to \`k\` rows **per value of \`row[key]\`**, in one pass.

            - Create **one** \`rng = random.Random(seed)\` for the whole call.
            - Keep a reservoir and a counter per key. When a row is item number \`i\` (0-based) **of its key**: if \`i < k\` append it, else draw \`j = rng.randint(0, i)\` and, if \`j < k\`, replace \`res[j]\`.
            - Return a dict key → list of rows.

            \`\`\`python
            rows = [{"s": 1}, {"s": 2}, {"s": 1}]
            sample_per_key(rows, "s", 5)
            # {1: [{'s': 1}, {'s': 1}], 2: [{'s': 2}]}
            \`\`\`
          `,
          setup: py`
            import random
            with open("data/server.log") as f:
                LOG = [{"status": l.split()[8],
                        "path": l.split()[6]} for l in f]
          `,
          starter: py`
            import random

            def sample_per_key(rows, key, k, seed=0):
                pass
          `,
          solution: py`
            import random

            def sample_per_key(rows, key, k, seed=0):
                rng = random.Random(seed)
                res, seen = {}, {}
                for row in rows:
                    g = row[key]
                    i = seen.get(g, 0)
                    seen[g] = i + 1
                    bucket = res.setdefault(g, [])
                    if i < k:
                        bucket.append(row)
                    else:
                        j = rng.randint(0, i)
                        if j < k:
                            bucket[j] = row
                return res
          `,
          tests: [
            { call: 'sample_per_key([{"s": 1}, {"s": 2}, {"s": 1}], "s", 5)', expect: '{1: [{"s": 1}, {"s": 1}], 2: [{"s": 2}]}' },
            { call: 'sample_per_key([{"s": "ab"[i % 2], "i": i} for i in range(8)], "s", 2, seed=0)', expect: '{"a": [{"s": "a", "i": 6}, {"s": "a", "i": 4}], "b": [{"s": "b", "i": 1}, {"s": "b", "i": 5}]}', name: 'seeded sample, k = 2' },
            { call: 'sample_per_key([], "s", 3)', expect: '{}', hidden: true },
            { call: 'sample_per_key(LOG, "status", 3, seed=1)', name: '3 log lines per status of data/server.log', hidden: true },
            { code: 'from collections import Counter\nc = Counter()\nfor seed in range(2000):\n    rows = [{"g": 1, "i": i} for i in range(10)]\n    for r in sample_per_key(rows, "g", 2, seed)[1]:\n        c[r["i"]] += 1\nassert all(300 <= c[i] <= 500 for i in range(10)), c', name: 'uniform: every row is picked ~20 % of the time', hidden: true },
          ],
          hints: [
            'Two dicts: `seen[g]` (how many rows of that key so far) and `res[g]` (the reservoir).',
            'Read `i = seen.get(g, 0)` before incrementing: it is the 0-based number of this row within its key.',
            'Call `rng.randint(0, i)` only when the key\'s reservoir is full (`i >= k`).',
          ],
          wrong: [
            py`
              import random

              def sample_per_key(rows, key, k, seed=0):
                  rng = random.Random(seed)
                  res = {}
                  for i, row in enumerate(rows):
                      bucket = res.setdefault(row[key], [])
                      if len(bucket) < k:
                          bucket.append(row)
                      else:
                          j = rng.randint(0, i)
                          if j < k:
                              bucket[j] = row
                  return res
            `,
            py`
              import random

              def sample_per_key(rows, key, k, seed=0):
                  rng = random.Random(seed)
                  res, seen = {}, {}
                  for row in rows:
                      g = row[key]
                      i = seen.get(g, 0)
                      seen[g] = i + 1
                      bucket = res.setdefault(g, [])
                      if i < k:
                          bucket.append(row)
                      else:
                          j = rng.randint(0, i - 1)
                          if j < k:
                              bucket[j] = row
                  return res
            `,
          ],
          explain: md`
            Each key runs its own Algorithm R, so the counter must be per key. Wrong #1 uses the global row number: a rare status that first shows up at row 500 is then almost never replaced, so the sample is biased toward early rows.

            This is **stratified sampling**: it guarantees coverage of rare groups (500s, small countries, new devices). On a cluster every partition keeps its own reservoirs; merging two reservoirs needs weights proportional to how many items each side saw.
          `,
        },
        {
          type: 'learn',
          title: 'Stable hashing for partitions',
          body: md`
            To split data across n workers (or Kafka partitions, or output files), send each record to \`partition = hash(key) % n\`. All records with the same key land in the same place, which is what makes the shuffle and per-key ordering work.

            But **never use Python's \`hash()\` on strings for this**: it is salted with a random seed per process (\`PYTHONHASHSEED\`, a defence against hash-flooding attacks). Two workers, or yesterday's run and today's, would disagree.

            Use a deterministic hash of the bytes: \`zlib.crc32(key.encode())\`, or \`hashlib.md5\` for better mixing. Kafka (murmur2) and Spark (murmur3) do the same.
          `,
          code: py`
            import zlib

            def partition(key, n):
                return zlib.crc32(key.encode()) % n

            for user in ["ann", "bob", "cy", "ann"]:
                print(user, partition(user, 4))
          `,
        },
        {
          type: 'choice',
          prompt: 'Why is `hash(user_id) % 8` a bug in a pipeline that runs on many processes?',
          options: [
            'Processes may hash a string differently',
            'hash() is too slow for big data',
            '% 8 sends most keys to partition 0',
            'hash() only accepts integers',
          ],
          answer: 0,
          explain: 'String hashes are randomised per interpreter start, so "ann" can go to partition 3 on one worker and partition 6 on another: joins silently miss rows and per-user state gets split. (Ints happen to hash to themselves, which hides the bug in small tests.) Stable byte hashes like crc32, murmur or md5 give the same answer on every machine, every day. Kafka\'s default partitioner hashes the key bytes with murmur2 for exactly this reason.',
        },
        {
          type: 'blanks',
          prompt: 'Complete the stable bucket function so the program prints `8`.',
          code: py`
            import zlib

            def bucket(key, n):
                return zlib.___(key.___()) % n

            print(bucket("abc", 10))
          `,
          bank: ['crc32', 'encode', 'hash', 'decode', 'lower', 'md5'],
          answer: ['crc32', 'encode'],
          tests: [{ stdout: '8\n' }],
          explain: '`crc32` needs **bytes**, so the string is encoded first (UTF-8 by default). `zlib` has no `hash` or `md5`; those live in builtins and `hashlib`. Every partitioner (Kafka, Spark, Hive bucketing) hashes bytes, never Python objects.',
        },
        {
          type: 'code',
          title: 'Hash-partition the records',
          prompt: md`
            Write \`partition(records, key, n)\` that splits a list of dicts into \`n\` partitions (a list of n lists). Record \`r\` goes to partition \`zlib.crc32(str(r[key]).encode()) % n\`; keep the input order inside each partition. Keys can be ints or strings, so apply \`str()\` first. \`n < 1\` raises \`ValueError\`.

            Then write \`skew(parts)\`: the size of the biggest partition divided by the average size (\`0.0\` if there are no records). 1.0 is perfectly balanced.

            \`\`\`python
            partition([{"id": "abc"}], "id", 10)[8]
            # [{'id': 'abc'}]
            skew([[1, 2, 3], [4], [5, 6]])   # 1.5
            \`\`\`
          `,
          setup: py`
            import csv
            with open("data/events.csv") as f:
                EV = list(csv.DictReader(f))
          `,
          starter: py`
            import zlib

            def partition(records, key, n):
                pass

            def skew(parts):
                pass
          `,
          solution: py`
            import zlib

            def partition(records, key, n):
                if n < 1:
                    raise ValueError("n must be >= 1")
                parts = [[] for _ in range(n)]
                for r in records:
                    h = zlib.crc32(str(r[key]).encode())
                    parts[h % n].append(r)
                return parts

            def skew(parts):
                total = sum(len(p) for p in parts)
                if total == 0:
                    return 0.0
                biggest = max(len(p) for p in parts)
                return biggest / (total / len(parts))
          `,
          tests: [
            { call: 'partition([{"id": "abc"}], "id", 10)[8]', expect: '[{"id": "abc"}]' },
            { call: '[len(p) for p in partition([{"u": i} for i in range(100)], "u", 4)]', expect: '[24, 26, 24, 26]', name: 'int keys are hashed as text' },
            { call: 'skew([[1, 2, 3], [4], [5, 6]])', expect: '1.5' },
            { call: 'skew([[], []])', expect: '0.0', hidden: true },
            { call: 'partition([{"k": "x", "n": 1}, {"k": "y", "n": 2}, {"k": "x", "n": 3}], "k", 3)', name: 'keeps input order inside a partition', hidden: true },
            { call: 'partition([{"k": 1}], "k", 0)', raises: 'ValueError', hidden: true },
            { call: 'partition(EV, "user_id", 8)', name: 'events.csv by user_id into 8 partitions', hidden: true },
            { call: 'skew(partition(EV, "event", 8))', name: 'skew of partitioning events.csv by event type', hidden: true },
          ],
          hints: [
            'Create independent lists: `[[] for _ in range(n)]`. (`[[]] * n` would be n references to one list!)',
            '`zlib.crc32(str(r[key]).encode()) % n` picks the partition.',
            'For `skew`: `max(sizes) / (total / len(parts))`.',
          ],
          wrong: [
            py`
              def partition(records, key, n):
                  if n < 1:
                      raise ValueError
                  parts = [[] for _ in range(n)]
                  for r in records:
                      parts[hash(r[key]) % n].append(r)
                  return parts

              def skew(parts):
                  total = sum(len(p) for p in parts)
                  return max(len(p) for p in parts) / (total / len(parts)) if total else 0.0
            `,
            py`
              import zlib

              def partition(records, key, n):
                  if n < 1:
                      raise ValueError
                  parts = [[]] * n
                  for r in records:
                      parts[zlib.crc32(str(r[key]).encode()) % n].append(r)
                  return parts

              def skew(parts):
                  total = sum(len(p) for p in parts)
                  return max(len(p) for p in parts) / (total / len(parts)) if total else 0.0
            `,
            py`
              import zlib

              def partition(records, key, n):
                  if n < 1:
                      raise ValueError
                  parts = [[] for _ in range(n)]
                  for r in records:
                      parts[zlib.crc32(r[key].encode()) % n].append(r)
                  return parts

              def skew(parts):
                  total = sum(len(p) for p in parts)
                  return max(len(p) for p in parts) / (total / len(parts)) if total else 0.0
            `,
          ],
          explain: md`
            This is exactly what a shuffle writer does: one output buffer per downstream partition, chosen by a stable hash of the key. Partitioning \`events.csv\` by event type gives a high skew: there are only five distinct keys and \`page_view\` dominates. High-cardinality keys (user ids) spread far better.

            Monitoring max/average partition size is how you catch skew before a job runs for hours. Spark's AQE uses the same statistic to split oversized partitions.
          `,
        },
        {
          type: 'learn',
          title: 'Sticky A/B buckets and samples',
          body: md`
            The same trick assigns users to experiments: \`bucket = crc32(f"{experiment}:{user_id}") % 100\`, then buckets 0–49 → control, 50–99 → treatment.

            - **Sticky**: a user sees the same variant on every request, device and server, with no lookup table.
            - **Salted with the experiment name**: otherwise the same users would be in treatment for *every* experiment, and the experiments would bias each other.

            Deterministic **sampling** works the same way: keep a user when \`bucket < 10\` for a 10 % sample. A user is either fully in (all their events) or fully out, and the 10 % sample sits inside the 20 % one.
          `,
          code: py`
            import zlib

            def bucket(exp, uid):
                s = f"{exp}:{uid}".encode()
                return zlib.crc32(s) % 100

            for uid in [7, 42, 1001]:
                b = bucket("new_checkout", uid)
                group = "treatment" if b >= 50 else "control"
                print(uid, b, group)
          `,
        },
        {
          type: 'output',
          prompt: 'Two deterministic samples of the same users. Type what this prints.',
          code: py`
            import zlib

            def bucket(u):
                return zlib.crc32(u.encode()) % 100

            users = [f"u{i}" for i in range(1000)]
            s10 = {u for u in users if bucket(u) < 10}
            s20 = {u for u in users if bucket(u) < 20}
            print(s10 <= s20, s20 <= s10)
          `,
          answer: 'True False',
          explain: 'Every user with a bucket below 10 also has a bucket below 20, so the 10 % sample is a **subset** of the 20 % one (`<=` on sets). Random sampling can\'t promise that, and nested samples let you grow an analysis without losing the users you already studied. Warehouses get the same property from `MOD(hash(user_id), 100) < pct` filters.',
        },
        {
          type: 'choice',
          prompt: 'Two experiments both put users into treatment when `crc32(str(user_id)) % 100 < 50`. What goes wrong?',
          options: [
            'The same users get treatment in both',
            'Users switch groups between visits',
            'The groups are no longer 50/50',
            'Nothing, crc32 is stable',
          ],
          answer: 0,
          explain: 'Without the experiment name in the hashed string, both experiments use identical buckets: the treatment groups are the same people, so a big effect of experiment A leaks into the results of B. Salting with the experiment name makes the assignments independent. Experimentation platforms at big companies hash `experiment_salt + user_id` for exactly this reason.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the experiment assignment',
          prompt: md`
            \`assign(user_id, exp, split)\` returns a user's variant. \`split\` is an ordered list of \`(variant, percent)\` pairs that sums to 100, e.g. \`[("control", 50), ("treatment", 50)]\`.

            The bucket must be \`zlib.crc32(f"{exp}:{user_id}".encode()) % 100\`, exactly like in the other services. The variants own consecutive bucket ranges in list order: control 0–49, treatment 50–99.

            The current version has **two** bugs. Fix them.
          `,
          starter: py`
            import zlib

            def assign(user_id, exp, split):
                b = hash(f"{exp}:{user_id}") % 100
                upto = 0
                for variant, pct in split:
                    upto += pct
                    if b <= upto:
                        return variant
          `,
          solution: py`
            import zlib

            def assign(user_id, exp, split):
                key = f"{exp}:{user_id}".encode()
                b = zlib.crc32(key) % 100
                upto = 0
                for variant, pct in split:
                    upto += pct
                    if b < upto:
                        return variant
          `,
          setup: 'S = [("control", 50), ("treatment", 50)]',
          tests: [
            { call: 'assign(182, "checkout", S)', expect: '"treatment"', name: 'user 182 has bucket 50 → treatment' },
            { call: 'assign(15, "checkout", S)', expect: '"control"', name: 'user 15 has bucket 49 → control' },
            { call: 'assign(128, "checkout", [("a", 10), ("b", 90)])', expect: '"b"', name: 'bucket 10 with a 10/90 split → b', hidden: true },
            { call: '[assign(u, "checkout", S) for u in range(300)]', hidden: true },
            { call: '[assign(u, "pricing", [("a", 20), ("b", 30), ("c", 50)]) for u in range(300)]', name: 'three-way split', hidden: true },
            { assert: '0.47 < sum(assign(u, "x", S) == "treatment" for u in range(10000)) / 10000 < 0.53', name: 'about 50 % treatment', hidden: true },
          ],
          hints: [
            'Which function gives a different answer in every Python process?',
            'With `upto = 50` after control, should bucket 50 still be control?',
            'Use `zlib.crc32(...encode()) % 100` and `b < upto`.',
          ],
          wrong: [
            py`
              import zlib

              def assign(user_id, exp, split):
                  b = zlib.crc32(f"{exp}:{user_id}".encode()) % 100
                  upto = 0
                  for variant, pct in split:
                      upto += pct
                      if b <= upto:
                          return variant
            `,
            py`
              def assign(user_id, exp, split):
                  b = hash(f"{exp}:{user_id}") % 100
                  upto = 0
                  for variant, pct in split:
                      upto += pct
                      if b < upto:
                          return variant
            `,
            py`
              import zlib

              def assign(user_id, exp, split):
                  b = zlib.crc32(str(user_id).encode()) % 100
                  upto = 0
                  for variant, pct in split:
                      upto += pct
                      if b < upto:
                          return variant
            `,
          ],
          explain: md`
            Bug 1: \`hash()\` changes between processes, so a user could flip variants on every deploy, which ruins the experiment. Bug 2: with \`<=\`, control owns buckets 0–50 (51 %) and bucket 100 can't exist, so the split is quietly 51/49.

            Off-by-one bugs at boundaries are invisible on dashboards and can wreck an A/B test's validity. Real platforms also log every assignment ("exposure") so the analysis uses who actually saw what.
          `,
        },
        {
          type: 'code',
          title: 'A deterministic user sample',
          prompt: md`
            Write a generator \`sample_users(rows, pct)\` that yields only the rows of a deterministic \`pct\` % **user** sample: keep a row when \`zlib.crc32(str(row["user_id"]).encode()) % 100 < pct\` (\`pct\` from 0 to 100).

            Then write \`sample_stats(path, pct)\` that streams a CSV file with \`csv.DictReader\` through \`sample_users\` and returns \`(distinct_users, events)\` of the sample.

            \`\`\`python
            sample_stats("data/events.csv", 100)
            # (258, 1997)
            sample_stats("data/events.csv", 0)
            # (0, 0)
            \`\`\`
          `,
          starter: py`
            import csv, zlib

            def sample_users(rows, pct):
                pass

            def sample_stats(path, pct):
                pass
          `,
          solution: py`
            import csv, zlib

            def sample_users(rows, pct):
                for row in rows:
                    key = str(row["user_id"]).encode()
                    if zlib.crc32(key) % 100 < pct:
                        yield row

            def sample_stats(path, pct):
                users, n = set(), 0
                with open(path) as f:
                    rows = csv.DictReader(f)
                    for row in sample_users(rows, pct):
                        users.add(row["user_id"])
                        n += 1
                return len(users), n
          `,
          tests: [
            { call: 'sample_stats("data/events.csv", 100)', expect: '(258, 1997)' },
            { call: 'sample_stats("data/events.csv", 0)', expect: '(0, 0)' },
            { call: 'list(sample_users([{"user_id": 1}, {"user_id": "1"}], 100))', expect: '[{"user_id": 1}, {"user_id": "1"}]' },
            { call: 'sample_stats("data/events.csv", 25)', name: '25 % sample of data/events.csv', hidden: true },
            { code: 'import csv\nrows = list(csv.DictReader(open("data/events.csv")))\nfrom collections import Counter\nfull = Counter(r["user_id"] for r in rows)\npart = Counter(r["user_id"] for r in sample_users(rows, 30))\nassert part and all(part[u] == full[u] for u in part)\nsmall = {r["user_id"] for r in sample_users(rows, 10)}\nassert small <= set(part)', name: 'a sampled user keeps all events; 10 % ⊂ 30 %', hidden: true },
          ],
          hints: [
            '`sample_users` is a filter generator: `for row in rows: if ...: yield row`.',
            'In `sample_stats`, count events with a counter and users with a set.',
          ],
          wrong: [
            py`
              import csv, random

              def sample_users(rows, pct):
                  rng = random.Random(0)
                  for row in rows:
                      if rng.random() * 100 < pct:
                          yield row

              def sample_stats(path, pct):
                  users, n = set(), 0
                  with open(path) as f:
                      for row in sample_users(csv.DictReader(f), pct):
                          users.add(row["user_id"])
                          n += 1
                  return len(users), n
            `,
            py`
              import csv, zlib

              def sample_users(rows, pct):
                  for row in rows:
                      if zlib.crc32(str(row["user_id"]).encode()) % 100 <= pct:
                          yield row

              def sample_stats(path, pct):
                  users, n = set(), 0
                  with open(path) as f:
                      for row in sample_users(csv.DictReader(f), pct):
                          users.add(row["user_id"])
                          n += 1
                  return len(users), n
            `,
          ],
          explain: md`
            A random sample per **event** (wrong #1) keeps only some of each user's clicks: funnels and sessions break because users appear with holes in their history. Sampling by a hash of the user id keeps whole users, is reproducible, and needs no coordination between machines.

            Warehouses do it with a filter such as \`WHERE MOD(FARM_FINGERPRINT(user_id), 100) < 10\` (block-level \`TABLESAMPLE\` would cut users apart), and log pipelines use it to keep, say, 1 % of users at full detail.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u18-l5',
      title: 'Sessions & Windows',
      summary: 'Sessionize clickstreams, count in time windows, dedup and handle late data.',
      steps: [
        {
          type: 'learn',
          title: 'Sessionization',
          body: md`
            Product analytics thinks in **sessions**: bursts of activity separated by quiet periods. The standard rule: a new session starts when a user has been **inactive for more than 30 minutes**.

            Recipe: group the events by user, sort each user's events by time, walk them, and start a new session whenever \`t - prev > gap\`. Compare with the **previous event**, not with the session start: a 3-hour binge with a click every 5 minutes is one session.

            In SQL that's \`LAG(ts)\` plus a running \`SUM\` of new-session flags. Streaming engines (Beam, Flink) call these **session windows**.
          `,
          code: py`
            times = ["10:00", "10:20", "10:55", "11:10"]
            sid, prev = 0, None
            for s in times:
                h, m = map(int, s.split(":"))
                t = h * 60 + m  # minutes
                if prev is None or t - prev > 30:
                    sid += 1
                print(s, "session", sid)
                prev = t
          `,
        },
        {
          type: 'choice',
          prompt: 'One user\'s events at 10:00, 10:20, 10:50 and 11:30. A new session starts after **more than** 30 minutes of inactivity. How many sessions?',
          options: ['2', '1', '3', '4'],
          answer: 0,
          explain: '10:20 → 10:50 is exactly 30 minutes, which is not *more* than 30, so it\'s the same session. 10:50 → 11:30 is 40 minutes: new session. Boundary off-by-ones are a classic interview trap: always ask whether the limit is inclusive. Spark\'s `session_window(ts, "30 minutes")` and Flink session windows encode the same rule.',
        },
        {
          type: 'blanks',
          prompt: 'Complete `session_ids` (times are sorted seconds) so the program prints `[1, 1, 2, 2, 2]`.',
          code: py`
            def session_ids(times, gap=1800):
                ids, sid, prev = [], 0, None
                for t in times:
                    if prev is None or t - ___ > gap:
                        sid += 1
                    ids.append(sid)
                    prev = ___
                return ids

            print(session_ids([0, 600, 3000, 4800, 4900]))
          `,
          bank: ['prev', 't', 'times[0]', 'sid', 'gap', 'ids[-1]'],
          answer: ['prev', 't'],
          tests: [{ stdout: '[1, 1, 2, 2, 2]\n' }],
          explain: 'Compare with the previous event and then move `prev` forward. 3000 − 600 = 2400 > 1800 starts session 2, and 4800 − 3000 = 1800 is not more than the gap, so it stays in session 2. Comparing with `times[0]` would measure the session *length* instead of the inactivity. In SQL: `CASE WHEN ts - LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) > 1800 THEN 1 END`, then a running `SUM`.',
        },
        {
          type: 'code',
          title: 'Sessionize a clickstream',
          prompt: md`
            Write \`sessions(events, gap=1800)\`. \`events\` is a list of \`(user_id, ts)\` tuples **in any order**, with \`ts\` in seconds. Return one tuple per session, \`(user_id, start, end, n_events)\`, sorted by user_id, then start. A new session starts when the gap to the user's **previous** event is **more than** \`gap\`.

            \`\`\`python
            sessions([("b", 100), ("a", 0), ("a", 1800),
                      ("a", 4000), ("b", 50)])
            # [('a', 0, 1800, 2), ('a', 4000, 4000, 1),
            #  ('b', 50, 100, 2)]
            \`\`\`

            The tests include \`data/events.csv\` and 80 000 events from 5 000 users, so don't scan all events once per user.
          `,
          setup: py`
            import csv, random
            from datetime import datetime

            T0 = datetime(2025, 11, 1)
            EV = []
            with open("data/events.csv") as f:
                for r in csv.DictReader(f):
                    t = datetime.fromisoformat(r["ts"]) - T0
                    EV.append((int(r["user_id"]),
                               int(t.total_seconds())))
            SHUF = EV[:]
            random.Random(2).shuffle(SHUF)
            rng = random.Random(5)
            BIG = [(rng.randrange(5000), rng.randrange(86400))
                   for _ in range(80000)]
          `,
          starter: py`
            def sessions(events, gap=1800):
                pass
          `,
          solution: py`
            def sessions(events, gap=1800):
                out = []
                cur = None  # [user, start, end, n]
                for user, ts in sorted(events):
                    same = cur and user == cur[0]
                    if same and ts - cur[2] <= gap:
                        cur[2] = ts
                        cur[3] += 1
                    else:
                        if cur:
                            out.append(tuple(cur))
                        cur = [user, ts, ts, 1]
                if cur:
                    out.append(tuple(cur))
                return out
          `,
          tests: [
            { call: 'sessions([("b", 100), ("a", 0), ("a", 1800), ("a", 4000), ("b", 50)])', expect: '[("a", 0, 1800, 2), ("a", 4000, 4000, 1), ("b", 50, 100, 2)]' },
            { call: 'sessions([])', expect: '[]' },
            { call: 'sessions([("u", 0), ("u", 1000), ("u", 2000), ("u", 3000)])', expect: '[("u", 0, 3000, 4)]', name: 'gap to the previous event, not to the start', hidden: true },
            { call: 'sessions([("u", 0), ("u", 1800), ("u", 3601)])', expect: '[("u", 0, 1800, 2), ("u", 3601, 3601, 1)]', name: 'exactly 30 min is the same session', hidden: true },
            { call: 'sessions(EV)', name: 'sessions of data/events.csv', hidden: true },
            { call: 'sessions(SHUF)', name: 'shuffled data/events.csv gives the same sessions', hidden: true },
            { call: 'len(sessions(BIG))', expect: '57599', name: '80 000 events, fast', maxMs: 300, hidden: true },
          ],
          hints: [
            '`sorted(events)` sorts by user, then by time: one pass over that list sees each user\'s events in order.',
            'Keep the current session as `[user, start, end, n]`. Extend it when it\'s the same user and `ts - end <= gap`.',
            'Don\'t forget to append the last open session after the loop.',
          ],
          wrong: [
            py`
              def sessions(events, gap=1800):
                  out, cur = [], None
                  for user, ts in sorted(events):
                      if cur and user == cur[0] and ts - cur[2] < gap:
                          cur[2] = ts
                          cur[3] += 1
                      else:
                          if cur:
                              out.append(tuple(cur))
                          cur = [user, ts, ts, 1]
                  if cur:
                      out.append(tuple(cur))
                  return out
            `,
            py`
              def sessions(events, gap=1800):
                  out, cur = [], None
                  for user, ts in sorted(events):
                      if cur and user == cur[0] and ts - cur[1] <= gap:
                          cur[2] = ts
                          cur[3] += 1
                      else:
                          if cur:
                              out.append(tuple(cur))
                          cur = [user, ts, ts, 1]
                  if cur:
                      out.append(tuple(cur))
                  return out
            `,
            py`
              def sessions(events, gap=1800):
                  out, cur = [], None
                  for user, ts in events:
                      if cur and user == cur[0] and ts - cur[2] <= gap:
                          cur[2] = ts
                          cur[3] += 1
                      else:
                          if cur:
                              out.append(tuple(cur))
                          cur = [user, ts, ts, 1]
                  if cur:
                      out.append(tuple(cur))
                  return out
            `,
            py`
              def sessions(events, gap=1800):
                  out = []
                  for u in sorted({u for u, _ in events}):
                      ts = sorted(t for uu, t in events if uu == u)
                      start = prev = ts[0]
                      n = 1
                      for t in ts[1:]:
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
            One sort, O(n log n), then a single O(n) pass. The last wrong version is correct but scans all events once per user, O(n · users): seconds here, days on a real clickstream.

            At scale the sort *is* the shuffle: Spark partitions by user and sorts within partitions (\`repartition("user_id").sortWithinPartitions("ts")\`), then every task sessionizes its users independently. Streaming engines keep one open session per user in state and close it when the gap has passed on the watermark.
          `,
        },
        {
          type: 'learn',
          title: 'Tumbling and sliding windows',
          body: md`
            Dashboards aggregate time into **windows**:

            - **Tumbling**: fixed, non-overlapping buckets. Each event belongs to exactly one: \`start = ts // size * size\`. "Orders per 5 minutes."
            - **Sliding**: overlapping windows, e.g. "requests in the last hour" at every event. Used for rate limits, moving averages and alerts.
            - **Session**: data-driven gaps, as before.

            Spark's \`window(ts, "5 minutes")\`, Beam/Flink window assigners and SQL's \`date_trunc\` all use that same floor formula. A sliding count over sorted events is O(n) with two pointers: the left edge only ever moves forward.
          `,
          code: py`
            from collections import Counter

            ts = [0, 59, 299, 300, 301, 899]
            w = Counter(t // 300 * 300 for t in ts)
            print(sorted(w.items()))
          `,
        },
        {
          type: 'output',
          prompt: 'Floor versus round. Type both lines.',
          code: py`
            ts = [0, 299, 300, 601, 905]
            print([t // 300 * 300 for t in ts])
            print([round(t / 300) * 300 for t in ts])
          `,
          answer: '[0, 0, 300, 600, 900]\n[0, 300, 300, 600, 900]',
          explain: 'A window [0, 300) must contain 299. `round` moves 299 into the next window, a subtle bug that shifts counts at every boundary. Always floor. Spark\'s `window()` and SQL\'s `date_trunc` floor too, so a rounding pipeline won\'t match the warehouse numbers.',
        },
        {
          type: 'code',
          title: 'Events per 5 minutes',
          prompt: md`
            Write \`per_5_min(rows)\`. The rows are dicts with a \`"ts"\` text field like \`"2025-11-01 07:09:59"\` (e.g. from \`csv.DictReader\` on \`data/events.csv\`). Return a dict that maps the **window start** as \`"YYYY-MM-DD HH:MM"\` to the number of events in that 5-minute tumbling window. Only non-empty windows appear.

            \`\`\`python
            per_5_min([{"ts": "2025-11-01 07:09:59"},
                       {"ts": "2025-11-01 07:10:00"}])
            # {'2025-11-01 07:05': 1, '2025-11-01 07:10': 1}
            \`\`\`
          `,
          setup: 'import csv',
          starter: py`
            def per_5_min(rows):
                pass
          `,
          solution: py`
            from collections import Counter

            def per_5_min(rows):
                c = Counter()
                for r in rows:
                    ts = r["ts"]
                    m = int(ts[14:16]) // 5 * 5
                    c[f"{ts[:14]}{m:02d}"] += 1
                return dict(c)
          `,
          tests: [
            { call: 'per_5_min([{"ts": "2025-11-01 07:09:59"}, {"ts": "2025-11-01 07:10:00"}])', expect: '{"2025-11-01 07:05": 1, "2025-11-01 07:10": 1}' },
            { call: 'per_5_min([])', expect: '{}' },
            { call: 'per_5_min([{"ts": "2025-11-01 23:59:59"}, {"ts": "2025-11-01 00:04:00"}])', expect: '{"2025-11-01 23:55": 1, "2025-11-01 00:00": 1}', hidden: true },
            { call: 'per_5_min(csv.DictReader(open("data/events.csv")))', name: 'windows of data/events.csv', hidden: true },
          ],
          hints: [
            'The minute is `ts[14:16]`. Floor it to a multiple of 5 with `// 5 * 5`.',
            'Rebuild the label: `f"{ts[:14]}{m:02d}"` (the zero-padding matters for 07:05).',
          ],
          wrong: [
            py`
              from collections import Counter

              def per_5_min(rows):
                  c = Counter()
                  for r in rows:
                      ts = r["ts"]
                      m = round(int(ts[14:16]) / 5) * 5
                      c[f"{ts[:14]}{m:02d}"] += 1
                  return dict(c)
            `,
            py`
              from collections import Counter

              def per_5_min(rows):
                  c = Counter()
                  for r in rows:
                      ts = r["ts"]
                      m = int(ts[14:16]) // 5 * 5
                      c[f"{ts[:14]}{m}"] += 1
                  return dict(c)
            `,
          ],
          explain: md`
            Fixed-width timestamps can be bucketed with plain string slicing, which is much faster than parsing a \`datetime\` per row. With \`datetime\` you would write \`dt.replace(minute=dt.minute // 5 * 5, second=0)\`.

            Remember that this is a **group by window start**, so it parallelises perfectly: every partition counts locally and the partial counts are added, a combiner again.
          `,
        },
        {
          type: 'code',
          title: 'Moving one-hour count',
          prompt: md`
            Write \`last_hour_counts(times, window=3600)\`. \`times\` is a **sorted** list of event timestamps in seconds. Return a list where element \`i\` is the number of events \`j <= i\` with \`times[j] > times[i] - window\`, the events in the hour that ends at event i.

            \`\`\`python
            last_hour_counts([0, 1000, 3600, 3601, 9000])
            # [1, 2, 2, 3, 1]
            \`\`\`

            The test has 40 000 events with ~1 800 in every hour, so counting the window from scratch for every event is too slow. Aim for O(n).
          `,
          setup: py`
            import random
            rng = random.Random(9)
            BIG = sorted(rng.randrange(80000)
                         for _ in range(40000))
          `,
          starter: py`
            def last_hour_counts(times, window=3600):
                pass
          `,
          solution: py`
            def last_hour_counts(times, window=3600):
                out, j = [], 0
                for i, t in enumerate(times):
                    while times[j] <= t - window:
                        j += 1
                    out.append(i - j + 1)
                return out
          `,
          tests: [
            { call: 'last_hour_counts([0, 1000, 3600, 3601, 9000])', expect: '[1, 2, 2, 3, 1]' },
            { call: 'last_hour_counts([])', expect: '[]' },
            { call: 'last_hour_counts([5, 5, 5])', expect: '[1, 2, 3]', name: 'equal timestamps', hidden: true },
            { call: 'last_hour_counts([0, 10, 20], window=10)', expect: '[1, 1, 1]', hidden: true },
            { call: 'sum(last_hour_counts(BIG))', expect: '70396293', name: '40 000 events, fast', maxMs: 150, hidden: true },
          ],
          hints: [
            'Keep a left pointer `j`. When the window ends at `t`, every event with `times[j] <= t - window` is too old.',
            'Old events never come back into the window, so `j` only moves forward: O(n) in total.',
            'The count is `i - j + 1`.',
          ],
          wrong: [
            py`
              def last_hour_counts(times, window=3600):
                  out, j = [], 0
                  for i, t in enumerate(times):
                      while times[j] < t - window:
                          j += 1
                      out.append(i - j + 1)
                  return out
            `,
            py`
              def last_hour_counts(times, window=3600):
                  out = []
                  for i, t in enumerate(times):
                      c, j = 0, i
                      while j >= 0 and times[j] > t - window:
                          c += 1
                          j -= 1
                      out.append(c)
                  return out
            `,
          ],
          explain: md`
            Two pointers turn O(n · w) into O(n): each event enters the window once and leaves once. For an unsorted stream you'd keep a \`deque\` of timestamps per key instead, which is the same idea as a rate limiter.

            \`bisect\` works too (O(n log n)). Streaming systems implement sliding windows as many overlapping tumbling windows (*hopping*), or with incremental state like this.
          `,
        },
        {
          type: 'learn',
          title: 'Dedup: keep the latest version',
          body: md`
            Real pipelines see the same record many times: retries, at-least-once delivery, CDC streams that send every update of a row. Before aggregating, **deduplicate**: per primary key, keep the **latest** version, the one with the highest \`updated_at\` or version number.

            Arrival order isn't time order, so compare the timestamps. Don't just keep the first or the last row you saw.

            One dict, one pass: O(n) time, O(distinct keys) memory. In SQL it's \`ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC) = 1\`.
          `,
          code: py`
            rows = [("u1", 3, "gold"), ("u2", 1, "free"),
                    ("u1", 5, "pro"), ("u1", 4, "team")]
            latest = {}
            for key, ver, plan in rows:
                old = latest.get(key)
                if old is None or ver > old[0]:
                    latest[key] = (ver, plan)
            print(latest)
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the deduplication',
          prompt: md`
            \`dedup_latest(records)\` gets dicts with \`id\`, \`updated_at\` (ISO text like \`"2025-11-03T10:00:00"\`, which sorts correctly as text) and other fields. It must return one record per \`id\`: the one with the **greatest** \`updated_at\`. On a tie, the record that arrived **later** wins. Output order: by \`id\`.

            The current version keeps the wrong records. Fix it.
          `,
          setup: py`
            import random
            rng = random.Random(4)
            RECS = [{"id": rng.randrange(300),
                     "updated_at": f"2025-11-0{rng.randrange(1, 10)}",
                     "v": i} for i in range(3000)]
          `,
          starter: py`
            def dedup_latest(records):
                seen = {}
                for r in records:
                    if r["id"] not in seen:
                        seen[r["id"]] = r
                return [seen[k] for k in sorted(seen)]
          `,
          solution: py`
            def dedup_latest(records):
                best = {}
                for r in records:
                    cur = best.get(r["id"])
                    t = r["updated_at"]
                    if cur is None or t >= cur["updated_at"]:
                        best[r["id"]] = r
                return [best[k] for k in sorted(best)]
          `,
          tests: [
            { call: 'dedup_latest([{"id": 1, "updated_at": "2025-11-03T10:00", "v": "new"}, {"id": 1, "updated_at": "2025-11-03T09:00", "v": "old"}, {"id": 2, "updated_at": "2025-11-01T00:00", "v": "x"}])', expect: '[{"id": 1, "updated_at": "2025-11-03T10:00", "v": "new"}, {"id": 2, "updated_at": "2025-11-01T00:00", "v": "x"}]', name: 'an old version arriving late is ignored' },
            { call: 'dedup_latest([{"id": 7, "updated_at": "2025-11-03T09:00", "v": "a"}, {"id": 7, "updated_at": "2025-11-03T10:00", "v": "b"}])', expect: '[{"id": 7, "updated_at": "2025-11-03T10:00", "v": "b"}]' },
            { call: 'dedup_latest([{"id": 1, "updated_at": "T", "v": "first"}, {"id": 1, "updated_at": "T", "v": "second"}])[0]["v"]', expect: '"second"', name: 'tie: the later arrival wins', hidden: true },
            { call: 'dedup_latest([])', expect: '[]', hidden: true },
            { call: 'dedup_latest(RECS)', name: '3 000 records, 300 ids', hidden: true },
          ],
          hints: [
            'The current code keeps the *first arrival*. What should decide instead?',
            'Replace the stored record when `r["updated_at"] >= cur["updated_at"]`. Why `>=` and not `>`?',
          ],
          wrong: [
            py`
              def dedup_latest(records):
                  seen = {}
                  for r in records:
                      seen[r["id"]] = r
                  return [seen[k] for k in sorted(seen)]
            `,
            py`
              def dedup_latest(records):
                  best = {}
                  for r in records:
                      cur = best.get(r["id"])
                      if cur is None or r["updated_at"] > cur["updated_at"]:
                          best[r["id"]] = r
                  return [best[k] for k in sorted(best)]
            `,
          ],
          explain: md`
            "Keep the first" and "keep the last arrival" are both wrong as soon as delivery is out of order, and with retries and parallel producers it always is. Comparing the version field makes the result **independent of arrival order**, which is also what makes the job safe to re-run.

            \`>=\` makes ties deterministic (latest arrival wins). In Spark: \`row_number()\` over a window, or \`reduceByKey\` with a "pick the newer" function, which is a valid combiner because max-by-version is associative.
          `,
        },
        {
          type: 'learn',
          title: 'Late data and watermarks',
          body: md`
            Streams arrive **out of order**: a phone in a tunnel uploads its clicks 20 minutes late. So systems separate **event time** (when it happened) from **processing time** (when it arrived).

            A **watermark** is the claim "I've probably seen everything up to time W". A common rule: \`W = max event time seen - allowed lateness\`. When W passes a window's end, the window is **final** and emitted. Events older than W are **late**: dropped, counted, or sent to a side output for a later correction.

            More lateness means more complete results, but more state and slower answers. Beam, Flink and Spark (\`withWatermark\`) all make you choose.
          `,
          code: py`
            lateness = 60
            max_seen = float("-inf")
            for ts in [100, 130, 90, 200, 120]:
                if ts < max_seen - lateness:
                    print(ts, "late: dropped")
                    continue
                max_seen = max(max_seen, ts)
                print(ts, "ok, watermark", max_seen - lateness)
          `,
        },
        {
          type: 'choice',
          prompt: 'Watermark = max event time seen − 10 minutes. The max event time so far is 12:30. Which newly arriving event is dropped as late?',
          options: ['One with event time 12:15', 'One with event time 12:25', 'One with event time 12:31', 'None: every event counts'],
          answer: 0,
          explain: 'The watermark is 12:20. Anything older than that is late: 12:15 is dropped. 12:25 is out of order but still within the allowed lateness, so it counts, and 12:31 is simply new (it moves the watermark to 12:21). In Spark: `withWatermark("ts", "10 minutes")`; Flink and Beam use the same max-minus-lateness rule by default.',
        },
        {
          type: 'code',
          title: 'Windows with a watermark',
          prompt: md`
            Write \`windowed_counts(stream, size, lateness)\`. \`stream\` yields event timestamps (int seconds) in **arrival** order. Process them one by one:

            - an event is **late** if \`ts < max_seen - lateness\`, where \`max_seen\` is the largest timestamp accepted **before** it. Late events are not counted.
            - every other event is counted in its tumbling window \`ts // size * size\` and may raise \`max_seen\`.

            Return \`(counts, late)\`: a dict window start → count, and the list of late timestamps in arrival order.

            \`\`\`python
            windowed_counts([10, 70, 15, 130, 75, 3], 60, 60)
            # ({0: 2, 60: 2, 120: 1}, [3])
            \`\`\`
          `,
          starter: py`
            def windowed_counts(stream, size, lateness):
                pass
          `,
          solution: py`
            def windowed_counts(stream, size, lateness):
                counts, late = {}, []
                max_seen = None
                for ts in stream:
                    if (max_seen is not None
                            and ts < max_seen - lateness):
                        late.append(ts)
                        continue
                    w = ts // size * size
                    counts[w] = counts.get(w, 0) + 1
                    if max_seen is None or ts > max_seen:
                        max_seen = ts
                return counts, late
          `,
          tests: [
            { call: 'windowed_counts([10, 70, 15, 130, 75, 3], 60, 60)', expect: '({0: 2, 60: 2, 120: 1}, [3])' },
            { call: 'windowed_counts([5, 3, 7], 10, 0)', expect: '({0: 2}, [3])', name: 'lateness 0: anything older than the max is late' },
            { call: 'windowed_counts([], 60, 60)', expect: '({}, [])', hidden: true },
            { call: 'windowed_counts([100, 40], 60, 60)', expect: '({60: 1, 0: 1}, [])', name: 'exactly at the watermark is not late', hidden: true },
            { call: 'windowed_counts([100, 50, 45], 60, 50)', expect: '({60: 1, 0: 1}, [45])', name: 'the watermark follows the max, not the last event', hidden: true },
            { call: 'windowed_counts((t * 37 % 1000 for t in range(2000)), 100, 300)', name: 'shuffled stream', hidden: true },
          ],
          hints: [
            'Track `max_seen` (start with `None`). Check lateness first, before you update anything.',
            'Only accepted events update `counts` and `max_seen = max(max_seen, ts)`.',
          ],
          wrong: [
            py`
              def windowed_counts(stream, size, lateness):
                  counts, late = {}, []
                  last = None
                  for ts in stream:
                      if last is not None and ts < last - lateness:
                          late.append(ts)
                          continue
                      w = ts // size * size
                      counts[w] = counts.get(w, 0) + 1
                      last = ts
                  return counts, late
            `,
            py`
              def windowed_counts(stream, size, lateness):
                  counts, late = {}, []
                  max_seen = None
                  for ts in stream:
                      if max_seen is not None and ts <= max_seen - lateness:
                          late.append(ts)
                          continue
                      w = ts // size * size
                      counts[w] = counts.get(w, 0) + 1
                      if max_seen is None or ts > max_seen:
                          max_seen = ts
                  return counts, late
            `,
            py`
              def windowed_counts(stream, size, lateness):
                  counts, late = {}, []
                  max_seen = None
                  for ts in stream:
                      if max_seen is not None and ts < max_seen - lateness:
                          late.append(ts)
                      w = ts // size * size
                      counts[w] = counts.get(w, 0) + 1
                      if max_seen is None or ts > max_seen:
                          max_seen = ts
                  return counts, late
            `,
          ],
          explain: md`
            The watermark must only move **forward**: it follows the max event time, not the most recent arrival (wrong #1 lets one old event drag it back and accept far-too-late data). Returning the late events instead of silently dropping them is good practice: production jobs write them to a side table so a later **backfill** can correct the closed windows.

            In Spark: \`df.withWatermark("ts", "1 minute").groupBy(window("ts", "1 minute")).count()\`. The engine also uses the watermark to throw away state of finished windows, which keeps memory bounded.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u18-l6',
      title: 'Joins & Data Quality',
      summary: 'Hash and merge joins, schema checks, idempotent writes and delivery guarantees.',
      steps: [
        {
          type: 'learn',
          title: 'The hash join',
          body: md`
            Joining \`orders\` (n rows) to \`users\` (m rows) with two nested loops costs n × m comparisons: 10⁶ × 10⁶ = 10¹², days of work. A **hash join** costs O(n + m):

            1. **build**: put the smaller side in a dict \`key → list of rows\` (keys can repeat!)
            2. **probe**: stream the bigger side and look up each key

            An **inner** join drops rows without a match. A **left** join keeps every left row, with \`None\` for the missing side. And, as in SQL, a \`None\` key never matches anything.

            Databases, Spark's shuffle hash join and pandas \`merge\` all work like this.
          `,
          code: py`
            users = [{"id": 1, "plan": "pro"},
                     {"id": 2, "plan": "free"}]
            orders = [{"uid": 1, "amt": 30},
                      {"uid": 3, "amt": 5},
                      {"uid": 1, "amt": 12}]
            by_id = {}
            for u in users:  # build
                by_id.setdefault(u["id"], []).append(u)
            for o in orders:  # probe
                for u in by_id.get(o["uid"], []):
                    print(o["amt"], u["plan"])
          `,
        },
        {
          type: 'choice',
          prompt: 'You hash-join a 2 TB `events` table with a 50 MB `countries` table. Which side should become the in-memory dict?',
          options: ['countries, the small side', 'events, the big side', 'Either: the cost is the same', 'Neither: sort both first'],
          answer: 0,
          explain: 'The build side has to fit in memory. The probe side is only streamed past it, one row at a time. Query planners use table statistics to pick the smaller build side, which is one reason stale statistics produce terrible plans. Spark\'s shuffle hash join builds its table from the smaller side of each partition pair for the same reason.',
        },
        {
          type: 'output',
          prompt: 'A left join by hand. Type exactly what this prints.',
          code: py`
            idx = {1: ["pro"], 2: ["free"]}
            orders = [(10, 1), (11, 3), (12, 2), (13, 1)]
            for oid, uid in orders:
                for plan in idx.get(uid, [None]):
                    print(oid, plan)
          `,
          answer: '10 pro\n11 None\n12 free\n13 pro',
          explain: 'User 3 has no entry, so `get` returns the default `[None]` and order 11 is still printed once: that\'s left-join semantics. With the default `[]` it would vanish, which is an inner join. pandas `merge(how="left")` and SQL `LEFT JOIN` fill the missing side with NaN/NULL the same way.',
        },
        {
          type: 'code',
          title: 'Write a hash join',
          prompt: md`
            Write \`hash_join(left, right, lkey, rkey, how="inner")\`. \`left\` and \`right\` are lists of dicts. Return a list of \`(l, r)\` pairs:

            - every left row paired with every right row where \`l[lkey] == r[rkey]\`, in left order, then right order;
            - \`how="left"\`: a left row without matches appears once as \`(l, None)\`;
            - \`None\` keys never match.

            Build a dict on \`right\`. The tests join 8 000 × 8 000 rows, which is far too slow with nested loops.

            \`\`\`python
            L = [{"id": 1}, {"id": 2}]
            R = [{"uid": 1, "x": "a"}, {"uid": 1, "x": "b"}]
            hash_join(L, R, "id", "uid", how="left")
            # [({'id': 1}, {'uid': 1, 'x': 'a'}),
            #  ({'id': 1}, {'uid': 1, 'x': 'b'}),
            #  ({'id': 2}, None)]
            \`\`\`
          `,
          setup: py`
            import csv, random
            rng = random.Random(11)
            BL = [{"oid": i, "uid": rng.randrange(9600)}
                  for i in range(8000)]
            BR = [{"id": u, "plan": "free"} for u in range(8000)]
            with open("data/orders.csv") as f:
                ORD = list(csv.DictReader(f))
            with open("data/users.csv") as f:
                USR = list(csv.DictReader(f))
            A = [{"id": 1}, {"id": 2}]
            B = [{"uid": 1, "x": "a"}, {"uid": 1, "x": "b"}]
          `,
          starter: py`
            def hash_join(left, right, lkey, rkey,
                          how="inner"):
                pass
          `,
          solution: py`
            def hash_join(left, right, lkey, rkey,
                          how="inner"):
                idx = {}
                for r in right:
                    k = r[rkey]
                    if k is not None:
                        idx.setdefault(k, []).append(r)
                out = []
                for l in left:
                    matches = idx.get(l[lkey], [])
                    for r in matches:
                        out.append((l, r))
                    if not matches and how == "left":
                        out.append((l, None))
                return out
          `,
          tests: [
            { call: 'hash_join(A, B, "id", "uid", how="left")', expect: '[({"id": 1}, B[0]), ({"id": 1}, B[1]), ({"id": 2}, None)]' },
            { call: 'hash_join(A, B, "id", "uid")', expect: '[({"id": 1}, B[0]), ({"id": 1}, B[1])]', name: 'inner join' },
            { call: 'hash_join([{"k": None}], [{"k": None}], "k", "k")', expect: '[]', name: 'None keys never match', hidden: true },
            { call: 'hash_join([{"k": None}], [{"k": None}], "k", "k", how="left")', expect: '[({"k": None}, None)]', hidden: true },
            { call: 'hash_join([{"k": 1, "i": 1}, {"k": 1, "i": 2}], [{"k": 1, "j": 1}, {"k": 1, "j": 2}], "k", "k")', name: 'duplicate keys on both sides: all 4 pairs', hidden: true },
            { call: '[(l["order_id"], r["plan"]) for l, r in hash_join(ORD, USR, "user_id", "user_id", "left")]', name: 'orders.csv ⟕ users.csv', hidden: true },
            { call: 'len(hash_join(BL, BR, "uid", "id"))', expect: '6615', name: '8 000 × 8 000 rows, fast', maxMs: 100, hidden: true },
          ],
          hints: [
            'Build: `idx.setdefault(r[rkey], []).append(r)` and skip `None` keys.',
            'Probe: `for r in idx.get(l[lkey], []): out.append((l, r))`.',
            'For a left join, append `(l, None)` when there were no matches.',
          ],
          wrong: [
            py`
              def hash_join(left, right, lkey, rkey, how="inner"):
                  idx = {r[rkey]: r for r in right}
                  out = []
                  for l in left:
                      r = idx.get(l[lkey])
                      if r is not None:
                          out.append((l, r))
                      elif how == "left":
                          out.append((l, None))
                  return out
            `,
            py`
              def hash_join(left, right, lkey, rkey, how="inner"):
                  idx = {}
                  for r in right:
                      idx.setdefault(r[rkey], []).append(r)
                  out = []
                  for l in left:
                      matches = idx.get(l[lkey], [])
                      for r in matches:
                          out.append((l, r))
                      if not matches and how == "left":
                          out.append((l, None))
                  return out
            `,
            py`
              def hash_join(left, right, lkey, rkey, how="inner"):
                  out = []
                  for l in left:
                      found = False
                      for r in right:
                          if l[lkey] is not None and l[lkey] == r[rkey]:
                              out.append((l, r))
                              found = True
                      if not found and how == "left":
                          out.append((l, None))
                  return out
            `,
          ],
          explain: md`
            Wrong #1 is the most common hash-join bug: a plain dict \`{key: row}\` keeps only the **last** row per key, so one-to-many joins silently lose rows. Wrong #3 is correct but O(n · m).

            O(n + m) time and O(m) memory for the build side. When the build side is too big for one machine, Spark first **shuffles both sides by** \`hash(key) % partitions\`, so matching keys meet on the same worker, then hash-joins each partition pair.
          `,
        },
        {
          type: 'learn',
          title: 'Sort-merge joins and heapq.merge',
          body: md`
            When **both** sides are too big for memory, databases and Spark use a **sort-merge join**: sort each side by key (an external sort that spills sorted runs to disk), then walk both with two pointers, like the merge step of merge sort. Memory stays tiny; the cost is the sort. If the inputs already arrive sorted (e.g. both tables bucketed and sorted by user_id), it's nearly free.

            \`heapq.merge(*sorted_iterables)\` lazily merges any number of sorted streams with a size-k heap: the last step of an external sort.
          `,
          code: py`
            import heapq

            run1 = [(1, "a"), (4, "d")]
            run2 = [(2, "b"), (3, "c"), (5, "e")]
            print(list(heapq.merge(run1, run2)))
          `,
        },
        {
          type: 'choice',
          prompt: 'Careful: one input is not sorted. What does this print?',
          code: py`
            import heapq
            a = [5, 1, 9]
            b = [2, 3, 10]
            print(list(heapq.merge(a, b)))
          `,
          options: ['[2, 3, 5, 1, 9, 10]', '[1, 2, 3, 5, 9, 10]', '[5, 1, 9, 2, 3, 10]', 'ValueError: inputs not sorted'],
          answer: 0,
          checkOutput: true,
          explain: '`merge` trusts you: it only ever compares the current heads of the streams and never checks the order. Unsorted input gives quietly wrong output. That\'s why a sort-merge join plan always has a Sort step (or a guarantee that the data is already sorted) in front of the merge.',
        },
        {
          type: 'code',
          title: 'Merge join two sorted streams',
          prompt: md`
            Write a generator \`merge_join(left, right)\`. Both are iterables of \`(key, value)\` pairs **sorted by key**. Keys in \`left\` are unique (a dimension table), keys in \`right\` may repeat (facts). For every right pair whose key exists in left, yield \`(key, left_value, right_value)\`, in right order.

            Walk both streams with one "pointer" each: no dicts and no lists of the input. The tests use streams that explode if you read further than you need.

            \`\`\`python
            list(merge_join([(1, "a"), (2, "b"), (4, "d")],
                            [(1, "x"), (2, "y"), (2, "z"),
                             (3, "q"), (4, "w")]))
            # [(1, 'a', 'x'), (2, 'b', 'y'),
            #  (2, 'b', 'z'), (4, 'd', 'w')]
            \`\`\`
          `,
          setup: EXPLODE,
          starter: py`
            def merge_join(left, right):
                pass
          `,
          solution: py`
            def merge_join(left, right):
                it = iter(left)
                cur = next(it, None)
                for rk, rv in right:
                    while cur is not None and cur[0] < rk:
                        cur = next(it, None)
                    if cur is None:
                        return
                    if cur[0] == rk:
                        yield rk, cur[1], rv
          `,
          tests: [
            { call: 'list(merge_join([(1, "a"), (2, "b"), (4, "d")], [(1, "x"), (2, "y"), (2, "z"), (3, "q"), (4, "w")]))', expect: '[(1, "a", "x"), (2, "b", "y"), (2, "b", "z"), (4, "d", "w")]' },
            { call: 'list(merge_join([(1, "a"), (2, "b"), (3, "c"), (9, "i")], [(9, "x")]))', expect: '[(9, "i", "x")]', name: 'skips several left keys at once' },
            { call: 'list(merge_join([], [(1, "x")]))', expect: '[]', hidden: true },
            { call: 'list(merge_join([(5, "e")], [(1, "x"), (5, "y"), (9, "z")]))', expect: '[(5, "e", "y")]', hidden: true },
            { call: 'next(merge_join(chain([(1, "a")], explode()), chain([(1, "x")], explode())))', expect: '(1, "a", "x")', name: 'streams: reads no further than needed', hidden: true },
            { call: 'sum(1 for _ in merge_join(((i, i) for i in range(0, 60000, 2)), ((i // 3, i) for i in range(90000))))', name: 'two big generators', hidden: true },
          ],
          hints: [
            'Take the first left pair with `cur = next(it, None)`, then loop over the right side.',
            'For each right key, advance the left pointer **while** its key is smaller.',
            'Yield when the keys are equal, but don\'t advance the left side: the next right row may have the same key.',
          ],
          wrong: [
            py`
              def merge_join(left, right):
                  it = iter(left)
                  cur = next(it, None)
                  for rk, rv in right:
                      if cur is not None and cur[0] < rk:
                          cur = next(it, None)
                      if cur is None:
                          return
                      if cur[0] == rk:
                          yield rk, cur[1], rv
            `,
            py`
              def merge_join(left, right):
                  it = iter(left)
                  cur = next(it, None)
                  for rk, rv in right:
                      while cur is not None and cur[0] < rk:
                          cur = next(it, None)
                      if cur is None:
                          return
                      if cur[0] == rk:
                          yield rk, cur[1], rv
                          cur = next(it, None)
            `,
            py`
              def merge_join(left, right):
                  dim = dict(left)
                  for rk, rv in right:
                      if rk in dim:
                          yield rk, dim[rk], rv
            `,
          ],
          explain: md`
            Each side is read exactly once: O(n + m) time and O(1) memory, however big the inputs. Wrong #2 advances the left pointer after a match and loses the second fact with key 2. Wrong #3 (a dict) is a hash join: correct, but it needs the whole left side in memory.

            Real merge joins also handle many-to-many keys by buffering one key group at a time. This is Spark's default \`SortMergeJoin\` for two big tables: it scales to 10 TB on each side, as long as you pay for the sort.
          `,
        },
        {
          type: 'learn',
          title: 'Broadcast joins and bad rows',
          body: md`
            **Broadcast join**: when one side is small (a 250-row country table), copy it to *every* worker and hash-join locally. The 5 TB side never moves, so there's no shuffle at all. Spark does it automatically below a size threshold, or on a \`broadcast()\` hint.

            **Data quality**: bad rows will arrive: missing fields, \`"n/a"\`, negative quantities. Don't crash a 3-hour job on row 9 million, and don't silently drop rows either. **Validate** every record against a schema, pass the good ones on, and send the bad ones with a reason to a quarantine table that someone monitors.
          `,
          code: py`
            rows = [{"qty": "2"}, {"qty": "x"}, {"qty": ""}]
            good, bad = [], []
            for i, r in enumerate(rows):
                try:
                    good.append(int(r["qty"]))
                except ValueError:
                    bad.append((i, "qty", repr(r["qty"])))
            print(good)
            print(bad)
          `,
        },
        {
          type: 'choice',
          prompt: 'You join 5 TB of `orders` with a 2 MB `countries` table on a 100-node cluster. Cheapest plan?',
          options: ['Broadcast countries to every node', 'Shuffle both tables by country', 'Sort-merge join on country', 'Collect orders on the driver'],
          answer: 0,
          explain: 'Broadcasting copies 2 MB × 100 = 200 MB. Shuffling moves all 5 TB across the network, and the country key is heavily skewed (one huge "US" partition) on top. Broadcast joins avoid both problems; the limit is that the small side must fit in every executor\'s memory.',
        },
        {
          type: 'code',
          title: 'Validate records against a schema',
          prompt: md`
            Write \`validate(rows, schema)\` → \`(good, errors)\`.

            - \`rows\`: dicts of **strings** (as \`csv.DictReader\` gives them).
            - \`schema\`: dict field → \`(type, lo, hi)\`, where type is \`int\` or \`float\` and \`lo\`/\`hi\` are **inclusive** bounds (\`None\` = no bound).
            - Check each schema field, in schema order:
              - key missing, or empty / whitespace-only → \`"missing"\`
              - \`type(value)\` raises ValueError → \`"bad type"\` (so \`int("2.5")\` is bad)
              - outside \`[lo, hi]\` → \`"out of range"\`
            - A row without problems goes to \`good\` as a **copy** with the schema fields converted (other fields unchanged). Every problem goes to \`errors\` as \`(row_index, field, reason)\`, with all problems of a row reported.

            \`\`\`python
            S = {"qty": (int, 1, 100),
                 "price": (float, 0, None)}
            validate([{"qty": "2", "price": "9.5", "sku": "A"},
                      {"qty": "0", "price": "abc"}], S)
            # ([{'qty': 2, 'price': 9.5, 'sku': 'A'}],
            #  [(1, 'qty', 'out of range'),
            #   (1, 'price', 'bad type')])
            \`\`\`
          `,
          setup: py`
            import csv
            S = {"qty": (int, 1, 100), "price": (float, 0, None)}
            OS = {"quantity": (int, 1, 3),
                  "unit_price": (float, 5, 150)}
          `,
          starter: py`
            def validate(rows, schema):
                pass
          `,
          solution: py`
            def check(raw, typ, lo, hi):
                if raw is None or not raw.strip():
                    return "missing", None
                try:
                    v = typ(raw)
                except ValueError:
                    return "bad type", None
                if lo is not None and v < lo:
                    return "out of range", None
                if hi is not None and v > hi:
                    return "out of range", None
                return None, v

            def validate(rows, schema):
                good, errors = [], []
                for i, row in enumerate(rows):
                    out, ok = dict(row), True
                    for f, (typ, lo, hi) in schema.items():
                        err, v = check(row.get(f), typ, lo, hi)
                        if err:
                            errors.append((i, f, err))
                            ok = False
                        else:
                            out[f] = v
                    if ok:
                        good.append(out)
                return good, errors
          `,
          tests: [
            { call: 'validate([{"qty": "2", "price": "9.5", "sku": "A"}, {"qty": "0", "price": "abc"}], S)', expect: '([{"qty": 2, "price": 9.5, "sku": "A"}], [(1, "qty", "out of range"), (1, "price", "bad type")])' },
            { call: 'validate([{"qty": " ", "price": "1"}, {"price": "1"}], S)', expect: '([], [(0, "qty", "missing"), (1, "qty", "missing")])', name: 'blank and absent fields are missing' },
            { call: 'validate([{"qty": "2.5", "price": "1"}], S)', expect: '([], [(0, "qty", "bad type")])', name: 'int("2.5") is a bad type', hidden: true },
            { call: 'validate([{"qty": "1", "price": "0"}, {"qty": "100", "price": "5"}], S)[0]', expect: '[{"qty": 1, "price": 0.0}, {"qty": 100, "price": 5.0}]', name: 'bounds are inclusive', hidden: true },
            { code: 'rows = [{"qty": "3", "price": "1"}]\nvalidate(rows, S)\nassert rows[0]["qty"] == "3"', name: 'does not modify the input rows', fail: 'the input row was changed: copy it first', hidden: true },
            { call: 'validate(csv.DictReader(open("data/orders.csv")), OS)', name: 'orders.csv with a strict schema', hidden: true },
          ],
          hints: [
            'Start each row with `out = dict(row)` and a flag `ok = True`. A helper `check(raw, typ, lo, hi)` that returns `(reason, value)` keeps the loop short.',
            '`raw is None or not raw.strip()` catches absent, empty and blank values.',
            'Wrap only the conversion in `try/except ValueError`, then compare with the bounds that are not `None`.',
          ],
          wrong: [
            py`
              def validate(rows, schema):
                  good, errors = [], []
                  for i, row in enumerate(rows):
                      out, ok = dict(row), True
                      for field, (typ, lo, hi) in schema.items():
                          raw = row.get(field)
                          if raw is None or not raw.strip():
                              errors.append((i, field, "missing"))
                              ok = False
                              break
                          try:
                              v = typ(raw)
                          except ValueError:
                              errors.append((i, field, "bad type"))
                              ok = False
                              break
                          if (lo is not None and v < lo) or (hi is not None and v > hi):
                              errors.append((i, field, "out of range"))
                              ok = False
                              break
                          out[field] = v
                      if ok:
                          good.append(out)
                  return good, errors
            `,
            py`
              def validate(rows, schema):
                  good, errors = [], []
                  for i, row in enumerate(rows):
                      out, ok = dict(row), True
                      for field, (typ, lo, hi) in schema.items():
                          raw = row.get(field)
                          if raw is None or not raw.strip():
                              errors.append((i, field, "missing"))
                              ok = False
                              continue
                          try:
                              v = typ(float(raw))
                          except ValueError:
                              errors.append((i, field, "bad type"))
                              ok = False
                              continue
                          if (lo is not None and v < lo) or (hi is not None and v > hi):
                              errors.append((i, field, "out of range"))
                              ok = False
                              continue
                          out[field] = v
                      if ok:
                          good.append(out)
                  return good, errors
            `,
            py`
              def validate(rows, schema):
                  good, errors = [], []
                  for i, row in enumerate(rows):
                      ok = True
                      for field, (typ, lo, hi) in schema.items():
                          if field not in row:
                              errors.append((i, field, "missing"))
                              ok = False
                              continue
                          try:
                              v = typ(row[field])
                          except ValueError:
                              errors.append((i, field, "bad type"))
                              ok = False
                              continue
                          if (lo is not None and v < lo) or (hi is not None and v > hi):
                              errors.append((i, field, "out of range"))
                              ok = False
                              continue
                          row[field] = v
                      if ok:
                          good.append(row)
                  return good, errors
            `,
          ],
          explain: md`
            Reporting **every** problem of a row (not just the first) saves the upstream team a fix-rerun-fix loop. \`int(float("2.5"))\` would silently truncate 2.5 items to 2: never "repair" data while validating it. Mutating the input (wrong #3) corrupts the raw data, which you may need for a re-run.

            In production this is a data contract: tools like Great Expectations, dbt tests or Spark's \`badRecordsPath\` do the same, plus alerting when the error rate jumps. O(rows × fields).
          `,
        },
        {
          type: 'learn',
          title: 'Idempotency and exactly-once',
          body: md`
            Distributed jobs fail and get **retried**: Kafka consumers, Spark tasks and Airflow tasks can all run twice. The delivery guarantees:

            - **at-most-once**: never retry, may **lose** data
            - **at-least-once**: retry until acknowledged, may **duplicate**
            - **exactly-once** *effect*: at-least-once delivery plus **idempotent** writes, so a replay changes nothing

            Idempotent writes: **upsert** by primary key with a version check (replays and older versions are ignored), or **overwrite whole partitions** instead of appending. That's also what makes **backfills** (re-running past dates after a bug fix) safe.
          `,
          code: py`
            daily = {}  # date -> rows (one partition per day)

            def write(date, rows, mode):
                if mode == "append":
                    daily.setdefault(date, []).extend(rows)
                else:  # overwrite the partition
                    daily[date] = list(rows)

            for attempt in range(2):  # the job is retried
                write("2025-11-03", [1, 2], "append")
            print(daily)
            for attempt in range(2):
                write("2025-11-03", [1, 2], "overwrite")
            print(daily)
          `,
        },
        {
          type: 'choice',
          prompt: 'A consumer writes each event to the database, then commits its Kafka offset. It crashes between the two and restarts from the last committed offset. What keeps the table correct?',
          options: ['Upsert keyed by a unique event id', 'Commit the offset before writing', 'Retry the write until it succeeds', 'Add more Kafka partitions'],
          answer: 0,
          explain: md`
            After the restart the same events are processed again (at-least-once). An upsert keyed by the event id turns the replay into a no-op: an exactly-once *effect*.

            Committing first makes it at-most-once: a crash after the commit loses the events. Retries don't help against duplicates, they cause them. The other robust option is writing the output and the offsets in **one transaction**.
          `,
        },
        {
          type: 'choice',
          prompt: 'A bug inflated `daily_revenue` for the last 30 days. You fixed the code. How should the backfill write the corrected days?',
          options: [
            'Overwrite each day\'s partition',
            'Append the corrected rows',
            'Drop the table, recompute all years',
            'Append rows that subtract the error',
          ],
          answer: 0,
          explain: 'Overwriting the partition per day (`INSERT OVERWRITE ... PARTITION (date=...)`, or delete + insert in one transaction) is idempotent: running a day twice gives the same result, so a half-failed backfill can simply be restarted. Appending doubles the data, and recomputing years of history is slow and risky. Partitioning by date is what makes backfills cheap.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Make the upsert idempotent',
          prompt: md`
            \`apply_batch(table, batch)\` merges a batch of rows into \`table\` (a dict id → row). Rows have an \`id\` and a \`version\`. The rules:

            - unknown id → insert
            - known id → replace only if the new \`version\` is **greater** (equal or older versions are replays: ignore them)
            - return the number of rows inserted or replaced

            Retries mean the same batch can arrive twice: the second call must change nothing and return 0. Rows inside a batch can be out of order. The current version breaks these rules. Fix it.
          `,
          setup: py`
            import random
            rng = random.Random(8)
            BATCH = [{"id": rng.randrange(500),
                      "version": rng.randrange(20)}
                     for _ in range(5000)]
          `,
          starter: py`
            def apply_batch(table, batch):
                changed = 0
                for row in batch:
                    table[row["id"]] = row
                    changed += 1
                return changed
          `,
          solution: py`
            def apply_batch(table, batch):
                changed = 0
                for row in batch:
                    cur = table.get(row["id"])
                    if (cur is None or
                            row["version"] > cur["version"]):
                        table[row["id"]] = row
                        changed += 1
                return changed
          `,
          tests: [
            { code: 't = {}\nb = [{"id": 1, "version": 1, "x": "a"}]\nassert apply_batch(t, b) == 1\nassert apply_batch(t, b) == 0', name: 'the same batch twice: the second call changes nothing' },
            { code: 't = {}\nn = apply_batch(t, [{"id": 1, "version": 2, "x": "new"}, {"id": 1, "version": 1, "x": "old"}])\nassert n == 1 and t[1]["x"] == "new"', name: 'an older version later in the batch is ignored' },
            { code: 't = {1: {"id": 1, "version": 5, "x": "keep"}}\nassert apply_batch(t, [{"id": 1, "version": 5, "x": "dup"}]) == 0\nassert t[1]["x"] == "keep"', name: 'equal version = replay', hidden: true },
            { call: 'apply_batch({}, [])', expect: '0', hidden: true },
            { call: 'apply_batch({}, BATCH)', name: '5 000 rows, 500 ids', hidden: true },
          ],
          hints: [
            'Look up the current row with `table.get(row["id"])` before writing.',
            'Write (and count) only when there is no current row or `row["version"] > cur["version"]`.',
          ],
          wrong: [
            py`
              def apply_batch(table, batch):
                  changed = 0
                  for row in batch:
                      cur = table.get(row["id"])
                      if cur is None or row["version"] >= cur["version"]:
                          table[row["id"]] = row
                          changed += 1
                  return changed
            `,
            py`
              def apply_batch(table, batch):
                  for row in batch:
                      cur = table.get(row["id"])
                      if cur is None or row["version"] > cur["version"]:
                          table[row["id"]] = row
                  return len(batch)
            `,
          ],
          explain: md`
            With the version check, applying a batch is **idempotent** (twice = once) and **order-insensitive** (the highest version wins whatever the arrival order). That's what turns at-least-once delivery into an exactly-once result. With \`>=\` the table ends up the same, but every replay "changes" rows: triggers fire, CDC events go out, counters drift.

            Warehouses express this as \`MERGE INTO t USING batch ON t.id = batch.id WHEN MATCHED AND batch.version > t.version THEN UPDATE ... WHEN NOT MATCHED THEN INSERT ...\`.
          `,
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u18-exam',
    title: 'Big Data Engineering Exam',
    minutes: 45,
    intro: 'A data-engineering interview loop in one sitting: partitioning, streaming, sketches and watermarks, plus five coding tasks (mergeable statistics, sessions, a rate limiter, CDC with deletes and a join). Hidden tests check edge cases and speed. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'Records are routed with `crc32(key) % 8`. You add a 9th worker and switch to `% 9`. Roughly what fraction of the keys move to a different worker?',
        options: ['About 8/9 of them', 'About 1/9 of them', 'About half of them', 'None: crc32 is stable'],
        answer: 0,
        explain: 'A key stays only if `h % 8 == h % 9`, which holds for 8 of every 72 residues: 1/9. So ~89 % of the keys (and their state) move. That is why systems use **consistent hashing** (a ring with virtual nodes, where adding a node moves ~1/n of the keys) or a fixed, large number of partitions that get reassigned to workers (Kafka partitions, Spark shuffle partitions).',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          it = iter(range(7))
          pairs = list(zip(it, it))
          print(pairs, next(it, None))
        `,
        options: [
          '[(0, 1), (2, 3), (4, 5)] None',
          '[(0, 1), (2, 3), (4, 5)] 6',
          '[(0, 1), (2, 3), (4, 5), (6,)] None',
          '[(0, 0), (1, 1), (2, 2)] 3',
        ],
        answer: 0,
        checkOutput: true,
        explain: 'Both arguments are the *same* iterator, so zip takes two consecutive items per tuple. At the end zip pulls 6 for a new tuple, finds no partner and stops: the 6 is consumed and **lost**. A batching helper built on `zip(it, it)` silently drops data, which is why `batched` must keep its partial last batch. The same "silent tail loss" bug shows up in streaming jobs that flush only full batches when a stream ends.',
      },
      {
        type: 'code',
        title: 'Distributed variance',
        prompt: md`
          Every partition summarises its numbers as a Welford state \`(n, mean, m2)\`; the driver merges the states. Write:

          - \`merge(a, b)\` → the combined state. With \`n = na + nb\` and \`d = mean_b - mean_a\`:
            - \`mean = mean_a + d * nb / n\`
            - \`m2 = m2_a + m2_b + d * d * na * nb / n\`
            - the empty state is \`(0, 0.0, 0.0)\`; merging two empty states gives an empty state
          - \`parallel_var(parts)\`: \`parts\` is a list of partitions (lists of numbers). Compute each partition's state in **one pass** (Welford), merge them all, and return the **sample variance** of all values (\`m2 / (n - 1)\`), or \`0.0\` with fewer than two values.

          \`\`\`python
          merge((2, 1.0, 2.0), (3, 6.0, 8.0))
          # (5, 4.0, 40.0)
          parallel_var([[2, 4, 4], [4, 5, 5, 7], [9]])
          # 4.571428571428571
          \`\`\`
        `,
        setup: py`
          import random
          rng = random.Random(21)
          PARTS = [[rng.uniform(1e9, 1e9 + 100)
                    for _ in range(rng.randrange(0, 300))]
                   for _ in range(12)]
        `,
        starter: py`
          def merge(a, b):
              pass

          def parallel_var(parts):
              pass
        `,
        solution: py`
          def merge(a, b):
              na, ma, m2a = a
              nb, mb, m2b = b
              n = na + nb
              if n == 0:
                  return (0, 0.0, 0.0)
              d = mb - ma
              mean = ma + d * nb / n
              m2 = m2a + m2b + d * d * na * nb / n
              return (n, mean, m2)

          def state(xs):
              n, mean, m2 = 0, 0.0, 0.0
              for x in xs:
                  n += 1
                  d = x - mean
                  mean += d / n
                  m2 += d * (x - mean)
              return (n, mean, m2)

          def parallel_var(parts):
              total = (0, 0.0, 0.0)
              for p in parts:
                  total = merge(total, state(p))
              n, _, m2 = total
              return m2 / (n - 1) if n > 1 else 0.0
        `,
        tests: [
          { call: 'merge((2, 1.0, 2.0), (3, 6.0, 8.0))', expect: '(5, 4.0, 40.0)' },
          { call: 'parallel_var([[2, 4, 4], [4, 5, 5, 7], [9]])', expect: '4.571428571428571' },
          { call: 'merge((0, 0.0, 0.0), (3, 6.0, 8.0))', expect: '(3, 6.0, 8.0)', hidden: true },
          { call: 'merge((0, 0.0, 0.0), (0, 0.0, 0.0))', expect: '(0, 0.0, 0.0)', hidden: true },
          { call: 'parallel_var([[], [5], []])', expect: '0.0', hidden: true },
          { call: 'parallel_var([[1e12 + 1, 1e12 + 3], [1e12 + 5]])', expect: '4.0', name: 'stable near 1e12', hidden: true },
          { call: 'parallel_var(PARTS)', expect: '__import__("statistics").variance([x for p in PARTS for x in p])', tol: 1e-6, name: '12 uneven partitions', hidden: true },
        ],
        wrong: [
          py`
            def merge(a, b):
                na, ma, m2a = a
                nb, mb, m2b = b
                n = na + nb
                if n == 0:
                    return (0, 0.0, 0.0)
                return (n, (ma + mb) / 2, m2a + m2b + (mb - ma) ** 2 * na * nb / n)

            def parallel_var(parts):
                total = (0, 0.0, 0.0)
                for p in parts:
                    n, mean, m2 = 0, 0.0, 0.0
                    for x in p:
                        n += 1
                        d = x - mean
                        mean += d / n
                        m2 += d * (x - mean)
                    total = merge(total, (n, mean, m2))
                return total[2] / (total[0] - 1) if total[0] > 1 else 0.0
          `,
          py`
            def merge(a, b):
                na, ma, m2a = a
                nb, mb, m2b = b
                n = na + nb
                if n == 0:
                    return (0, 0.0, 0.0)
                return (n, ma + (mb - ma) * nb / n, m2a + m2b)

            def parallel_var(parts):
                total = (0, 0.0, 0.0)
                for p in parts:
                    n, mean, m2 = 0, 0.0, 0.0
                    for x in p:
                        n += 1
                        d = x - mean
                        mean += d / n
                        m2 += d * (x - mean)
                    total = merge(total, (n, mean, m2))
                return total[2] / (total[0] - 1) if total[0] > 1 else 0.0
          `,
          py`
            def merge(a, b):
                na, ma, m2a = a
                nb, mb, m2b = b
                n = na + nb
                d = mb - ma
                return (n, ma + d * nb / n, m2a + m2b + d * d * na * nb / n)

            def parallel_var(parts):
                vs = []
                for p in parts:
                    if len(p) > 1:
                        m = sum(p) / len(p)
                        vs.append(sum((x - m) ** 2 for x in p) / (len(p) - 1))
                return sum(vs) / len(vs) if vs else 0.0
          `,
        ],
        explain: md`
          The \`d² · na · nb / n\` term accounts for the two partitions having different means. Without it (wrong #2) the variance *between* partitions is lost. Averaging the partition variances (wrong #3) is wrong for the same reason, and ignores the partition sizes too.

          Because \`merge\` is associative, partitions can be combined in any order: a tree reduction across 1 000 executors gives the same answer as one pass. That's Spark's \`stddev\`/\`variance\` aggregate.
        `,
      },
      {
        type: 'output',
        prompt: 'Two sorted runs, merged and grouped. Type exactly what this prints.',
        code: py`
          import heapq
          from itertools import groupby

          a = [("ann", 3), ("cy", 1)]
          b = [("ann", 2), ("bo", 5)]
          merged = heapq.merge(a, b)
          for k, g in groupby(merged, key=lambda p: p[0]):
              print(k, sum(v for _, v in g))
        `,
        answer: 'ann 5\nbo 5\ncy 1',
        explain: '`heapq.merge` produces one sorted stream, so equal keys are adjacent and `groupby` sees each key exactly once: the reduce side of a sort-based shuffle. `groupby` on *unsorted* data would emit the same key several times.',
      },
      {
        type: 'code',
        title: 'Session conversion rate',
        prompt: md`
          Write \`conversion(rows, gap=1800)\`. \`rows\` are clickstream dicts with \`user_id\`, \`ts\` (\`"YYYY-MM-DD HH:MM:SS"\`) and \`event\`, **in any order** (like \`data/events.csv\`, maybe shuffled).

          Split every user's events into sessions: a new session starts when more than \`gap\` seconds have passed since that user's **previous** event. Return \`(sessions, converted)\`: the number of sessions, and the number of sessions that contain **at least one** \`"purchase"\` event.

          A row looks like \`{"user_id": "1", "ts": "2025-11-01 10:00:00", "event": "page_view"}\`. In the tests, \`ev(user, "HH:MM:SS", event="page_view")\` builds such a row on 2025-11-01.

          \`\`\`python
          EX = [ev("1", "10:00:00"),
                ev("2", "09:00:30", "purchase"),
                ev("1", "10:45:00"),
                ev("1", "10:10:00", "purchase"),
                ev("2", "09:00:00", "purchase")]
          conversion(EX)   # (3, 2)
          \`\`\`
        `,
        setup: py`
          import csv, random

          def ev(u, ts, e="page_view"):
              return {"user_id": u, "ts": "2025-11-01 " + ts,
                      "event": e}

          EX = [ev("1", "10:00:00"), ev("2", "09:00:30", "purchase"),
                ev("1", "10:45:00"), ev("1", "10:10:00", "purchase"),
                ev("2", "09:00:00", "purchase")]
          with open("data/events.csv") as f:
              ROWS = list(csv.DictReader(f))
          SHUF = ROWS[:]
          random.Random(3).shuffle(SHUF)
        `,
        starter: py`
          from datetime import datetime

          def conversion(rows, gap=1800):
              pass
        `,
        solution: py`
          from datetime import datetime

          def conversion(rows, gap=1800):
              by = lambda r: (r["user_id"], r["ts"])
              sessions, converted = 0, set()
              prev = None  # (user, time)
              for r in sorted(rows, key=by):
                  u = r["user_id"]
                  t = datetime.fromisoformat(r["ts"])
                  if prev and u == prev[0]:
                      d = (t - prev[1]).total_seconds()
                      new = d > gap
                  else:
                      new = True
                  sessions += new
                  if r["event"] == "purchase":
                      converted.add(sessions)
                  prev = (u, t)
              return sessions, len(converted)
        `,
        tests: [
          { call: 'conversion(EX)', expect: '(3, 2)' },
          { call: 'conversion([])', expect: '(0, 0)' },
          { call: 'conversion([ev("1", "10:00:00"), ev("1", "10:30:00", "purchase")])', expect: '(1, 1)', name: 'exactly 30 minutes: same session', hidden: true },
          { call: 'conversion([ev("1", "10:00:00"), ev("1", "10:20:00"), ev("1", "10:40:00"), ev("1", "11:00:00", "purchase")])', expect: '(1, 1)', name: 'gap to the previous event, not the start', hidden: true },
          { call: 'conversion([ev("1", "10:00:00"), {"user_id": "1", "ts": "2025-11-02 10:10:00", "event": "purchase"}])', expect: '(2, 1)', name: 'a day later is a new session', hidden: true },
          { call: 'conversion(ROWS)', name: 'data/events.csv', hidden: true },
          { call: 'conversion(SHUF)', name: 'shuffled data/events.csv', hidden: true },
        ],
        wrong: [
          py`
            from datetime import datetime

            def conversion(rows, gap=1800):
                evs = sorted((r["user_id"], r["ts"], r["event"]) for r in rows)
                sessions, converted, prev = 0, 0, None
                for user, ts, event in evs:
                    t = datetime.fromisoformat(ts)
                    if prev is None or user != prev[0] or (t - prev[1]).total_seconds() > gap:
                        sessions += 1
                    if event == "purchase":
                        converted += 1
                    prev = (user, t)
                return sessions, converted
          `,
          py`
            from datetime import datetime

            def conversion(rows, gap=1800):
                last, sid, sessions, conv = {}, {}, 0, set()
                for r in rows:
                    u, t = r["user_id"], datetime.fromisoformat(r["ts"])
                    if u not in last or (t - last[u]).total_seconds() > gap:
                        sessions += 1
                        sid[u] = sessions
                    last[u] = t
                    if r["event"] == "purchase":
                        conv.add(sid[u])
                return sessions, len(conv)
          `,
          py`
            from datetime import datetime

            def conversion(rows, gap=1800):
                evs = sorted((r["user_id"], r["ts"], r["event"]) for r in rows)
                sessions, converted, prev = 0, set(), None
                for user, ts, event in evs:
                    t = datetime.fromisoformat(ts)
                    if prev is None or user != prev[0] or (t - prev[1]).total_seconds() >= gap:
                        sessions += 1
                    if event == "purchase":
                        converted.add(sessions)
                    prev = (user, t)
                return sessions, len(converted)
          `,
          py`
            from datetime import datetime

            def conversion(rows, gap=1800):
                by = lambda r: (r["user_id"], r["ts"])
                sessions, converted, prev = 0, set(), None
                for r in sorted(rows, key=by):
                    u, t = r["user_id"], datetime.fromisoformat(r["ts"])
                    if prev is None or u != prev[0] or (t - prev[1]).seconds > gap:
                        sessions += 1
                    if r["event"] == "purchase":
                        converted.add(sessions)
                    prev = (u, t)
                return sessions, len(converted)
          `,
        ],
        explain: md`
          Sort by (user, time) once, then a single pass assigns global session numbers; a *set* of converting session ids counts each session once, even with two purchases (wrong #1 counts purchases). Careful with \`timedelta.seconds\`: it ignores whole days, so a user returning 24 h + 10 min later would look 10 minutes away. Use \`total_seconds()\`. Wrong #2 is a correct **streaming** algorithm, but only for time-ordered input: on shuffled data it breaks, which is exactly why streaming engines need event time and watermarks.

          O(n log n). In Spark: \`repartition("user_id")\`, sort within partitions, then a window with \`lag\`; or a SQL \`SUM(new_session) OVER (PARTITION BY user_id ORDER BY ts)\`.
        `,
      },
      {
        type: 'choice',
        prompt: 'Monday had 1.0 M distinct users and Tuesday 1.2 M. How many distinct users did Monday + Tuesday have?',
        options: ['Between 1.2 M and 2.2 M', 'Exactly 2.2 M', 'Exactly 1.1 M', 'At most 1.2 M'],
        answer: 0,
        explain: 'Distinct counts are **not additive**: users active on both days count once. The union is at least the larger day (all Monday users came back) and at most the sum (no overlap). To roll up correctly, keep per-day sets, or mergeable HyperLogLog sketches whose union gives the 2-day estimate. A favourite trick question about pre-aggregated tables. Warehouses expose mergeable sketches for this (`HLL_UNION`, `APPROX_COUNT_DISTINCT`).',
      },
      {
        type: 'code',
        title: 'Sliding-window rate limiter',
        prompt: md`
          Write \`rate_limit(requests, limit, window=60)\`. \`requests\` is a list of \`(ts, ip)\` tuples sorted by \`ts\` (int seconds). A request is **accepted** when its IP has fewer than \`limit\` **accepted** requests with timestamps in \`(ts - window, ts]\`; otherwise it is rejected, and rejected requests don't count toward the limit. Return the list of indexes of the rejected requests.

          \`\`\`python
          reqs = [(0, "a"), (10, "a"), (20, "a"),
                  (60, "a"), (61, "b"), (70, "a")]
          rate_limit(reqs, 2)   # [2]
          \`\`\`

          It must handle 100 000 requests quickly.
        `,
        setup: py`
          import random
          rng = random.Random(13)
          BIG, ts = [], 0
          for _ in range(100000):
              ts += rng.random() < 0.1
              BIG.append((ts, f"10.0.0.{rng.randrange(20)}"))
        `,
        starter: py`
          def rate_limit(requests, limit, window=60):
              pass
        `,
        solution: py`
          from collections import defaultdict, deque

          def rate_limit(requests, limit, window=60):
              recent = defaultdict(deque)
              rejected = []
              for i, (ts, ip) in enumerate(requests):
                  q = recent[ip]
                  while q and q[0] <= ts - window:
                      q.popleft()
                  if len(q) < limit:
                      q.append(ts)
                  else:
                      rejected.append(i)
              return rejected
        `,
        tests: [
          { call: 'rate_limit([(0, "a"), (10, "a"), (20, "a"), (60, "a"), (61, "b"), (70, "a")], 2)', expect: '[2]' },
          { call: 'rate_limit([(0, "a"), (0, "b"), (1, "a"), (1, "b")], 1)', expect: '[2, 3]', name: 'every IP has its own window' },
          { call: 'rate_limit([], 5)', expect: '[]', hidden: true },
          { call: 'rate_limit([(5, "x"), (6, "x")], 0)', expect: '[0, 1]', name: 'limit 0 rejects everything', hidden: true },
          { call: 'rate_limit([(0, "a"), (1, "a"), (2, "a"), (60, "a"), (61, "a")], 2)', expect: '[2]', name: 'rejected requests do not count', hidden: true },
          { call: 'len(rate_limit(BIG, 25))', expect: '25775', name: '100 000 requests, fast', maxMs: 250, hidden: true },
        ],
        wrong: [
          py`
            from collections import defaultdict, deque

            def rate_limit(requests, limit, window=60):
                recent = defaultdict(deque)
                rejected = []
                for i, (ts, ip) in enumerate(requests):
                    q = recent[ip]
                    while q and q[0] <= ts - window:
                        q.popleft()
                    q.append(ts)
                    if len(q) > limit:
                        rejected.append(i)
                return rejected
          `,
          py`
            from collections import defaultdict, deque

            def rate_limit(requests, limit, window=60):
                recent = defaultdict(deque)
                rejected = []
                for i, (ts, ip) in enumerate(requests):
                    q = recent[ip]
                    while q and q[0] < ts - window:
                        q.popleft()
                    if len(q) < limit:
                        q.append(ts)
                    else:
                        rejected.append(i)
                return rejected
          `,
          py`
            from collections import deque

            def rate_limit(requests, limit, window=60):
                q, rejected = deque(), []
                for i, (ts, ip) in enumerate(requests):
                    while q and q[0] <= ts - window:
                        q.popleft()
                    if len(q) < limit:
                        q.append(ts)
                    else:
                        rejected.append(i)
                return rejected
          `,
          py`
            from collections import defaultdict

            def rate_limit(requests, limit, window=60):
                accepted = defaultdict(list)
                rejected = []
                for i, (ts, ip) in enumerate(requests):
                    n = sum(1 for t in accepted[ip] if t > ts - window)
                    if n < limit:
                        accepted[ip].append(ts)
                    else:
                        rejected.append(i)
                return rejected
          `,
        ],
        explain: md`
          A deque per key holds only the accepted timestamps inside the window: each timestamp is appended once and popped once, so the whole run is O(n) with O(limit) memory per IP. Counting rejected requests (wrong #1) locks out a client forever if it keeps retrying, a real outage pattern. Wrong #4 rescans the whole history: O(n²).

          At scale this state lives in Redis (sorted sets or a token bucket per key) or in a stream processor keyed by IP, which is the same as a sliding window per key.
        `,
      },
      {
        type: 'choice',
        prompt: 'A job counts purchases per 10-minute tumbling window with a watermark of max event time − 15 min. The max event time seen is 12:40. Which window can be finalized and emitted now?',
        options: ['[12:10, 12:20)', '[12:20, 12:30)', '[12:30, 12:40)', 'None until 12:55'],
        answer: 0,
        explain: 'The watermark is 12:40 − 15 min = 12:25. A window is final once the watermark passes its **end**: [12:10, 12:20) ends at 12:20 ≤ 12:25, so it is emitted. [12:20, 12:30) still accepts late events until the watermark reaches 12:30. Lateness trades freshness for completeness. Spark Structured Streaming emits such windows in `append` mode only after the watermark has passed them.',
      },
      {
        type: 'code',
        title: 'Apply a CDC stream with deletes',
        prompt: md`
          A change-data-capture feed delivers events \`(key, lsn, op, value)\`, where \`op\` is \`"upsert"\` or \`"delete"\` and the log sequence number \`lsn\` grows with every change (higher = newer). Delivery is **at-least-once and out of order**: duplicates and old events can arrive late.

          Write \`apply_cdc(events)\` → the final table as a dict key → value. For every key, the event with the **highest lsn** wins: if it's a delete, the key is absent. Use O(number of keys) memory.

          \`\`\`python
          apply_cdc([("a", 1, "upsert", 10),
                     ("a", 3, "delete", None),
                     ("a", 2, "upsert", 20),
                     ("b", 5, "upsert", 7),
                     ("b", 5, "upsert", 7)])
          # {'b': 7}
          \`\`\`
        `,
        setup: py`
          import random
          rng = random.Random(17)
          FEED = []
          for lsn in range(1, 6001):
              op = "delete" if rng.random() < 0.2 else "upsert"
              FEED.append((rng.randrange(400), lsn, op, lsn * 10))
          FEED += rng.sample(FEED, 1500)
          rng.shuffle(FEED)
        `,
        starter: py`
          def apply_cdc(events):
              pass
        `,
        solution: py`
          def apply_cdc(events):
              latest = {}  # key -> (lsn, op, value)
              for key, lsn, op, value in events:
                  cur = latest.get(key)
                  if cur is None or lsn > cur[0]:
                      latest[key] = (lsn, op, value)
              return {k: v for k, (_, op, v)
                      in latest.items() if op == "upsert"}
        `,
        tests: [
          { call: 'apply_cdc([("a", 1, "upsert", 10), ("a", 3, "delete", None), ("a", 2, "upsert", 20), ("b", 5, "upsert", 7), ("b", 5, "upsert", 7)])', expect: '{"b": 7}' },
          { call: 'apply_cdc([("k", 2, "delete", None), ("k", 4, "upsert", "back"), ("k", 1, "upsert", "old")])', expect: '{"k": "back"}', name: 're-inserted after a delete' },
          { call: 'apply_cdc([])', expect: '{}', hidden: true },
          { call: 'apply_cdc(FEED)', name: '7 500 shuffled events with duplicates', hidden: true },
          { code: 'once = apply_cdc(FEED)\nassert apply_cdc(FEED + FEED) == once\nassert apply_cdc(sorted(FEED, key=lambda e: e[1])) == once', name: 'idempotent and order-insensitive', hidden: true },
        ],
        wrong: [
          py`
            def apply_cdc(events):
                table = {}
                for key, lsn, op, value in events:
                    if op == "delete":
                        table.pop(key, None)
                    else:
                        table[key] = value
                return table
          `,
          py`
            def apply_cdc(events):
                table = {}  # key -> (lsn, value)
                for key, lsn, op, value in events:
                    cur = table.get(key)
                    if cur is not None and lsn <= cur[0]:
                        continue
                    if op == "delete":
                        table.pop(key, None)
                    else:
                        table[key] = (lsn, value)
                return {k: v for k, (l, v) in table.items()}
          `,
          py`
            def apply_cdc(events):
                latest = {}
                for key, lsn, op, value in events:
                    if op == "delete":
                        latest.pop(key, None)
                        continue
                    cur = latest.get(key)
                    if cur is None or lsn > cur[0]:
                        latest[key] = (lsn, value)
                return {k: v for k, (l, v) in latest.items()}
          `,
        ],
        explain: md`
          The key insight is the **tombstone**: a delete must be remembered with its lsn. Wrong #2 forgets the key on delete, so an older upsert that arrives late resurrects a deleted row, the classic CDC bug. Keeping \`(lsn, op, value)\` per key makes the result idempotent (replays change nothing) and independent of arrival order.

          Real systems (Debezium → Kafka → a lakehouse MERGE) do exactly this and expire tombstones only after a safe retention period.
        `,
      },
      {
        type: 'code',
        title: 'Revenue per plan',
        prompt: md`
          Write \`revenue_by_plan(orders, users)\`. Both are iterables of dicts of strings, like \`csv.DictReader\` on \`data/orders.csv\` and \`data/users.csv\`.

          - only orders with \`status == "completed"\`
          - revenue = \`quantity × unit_price\`
          - join \`orders.user_id\` → \`users.user_id\` (unique in users) to get the user's \`plan\`; orders of unknown users count under the plan \`"unknown"\`
          - return a dict plan → total revenue **rounded to 2 decimals**; plans without completed orders don't appear

          Read \`users\` into a dict once (the build side) and stream \`orders\`. In the example, \`order(uid, qty, price, status="completed")\` builds an order row.

          \`\`\`python
          U = [{"user_id": "1", "plan": "pro"},
               {"user_id": "2", "plan": "free"}]
          O = [order("1", "2", "10.5"),  # 2 × 10.5
               order("2", "1", "3", "cancelled"),
               order("9", "3", "1.25")]  # unknown
          revenue_by_plan(O, U)
          # {'pro': 21.0, 'unknown': 3.75}
          \`\`\`
        `,
        setup: py`
          import csv

          def order(uid, qty, price, status="completed"):
              return {"user_id": uid, "quantity": qty,
                      "unit_price": price, "status": status}

          U = [{"user_id": "1", "plan": "pro"},
               {"user_id": "2", "plan": "free"}]
          O = [order("1", "2", "10.5"),
               order("2", "1", "3", "cancelled"),
               order("9", "3", "1.25")]
        `,
        starter: py`
          def revenue_by_plan(orders, users):
              pass
        `,
        solution: py`
          def revenue_by_plan(orders, users):
              plan = {u["user_id"]: u["plan"] for u in users}
              rev = {}
              for o in orders:
                  if o["status"] != "completed":
                      continue
                  p = plan.get(o["user_id"], "unknown")
                  q = int(o["quantity"])
                  amt = q * float(o["unit_price"])
                  rev[p] = rev.get(p, 0.0) + amt
              return {p: round(v, 2) for p, v in rev.items()}
        `,
        tests: [
          { call: 'revenue_by_plan(O, U)', expect: '{"pro": 21.0, "unknown": 3.75}' },
          { call: 'revenue_by_plan([], U)', expect: '{}', hidden: true },
          { call: 'revenue_by_plan(O + [order("2", "3", "0.1"), order("2", "1", "0.2")], U)', expect: '{"pro": 21.0, "unknown": 3.75, "free": 0.5}', name: 'several plans, cancelled skipped', hidden: true },
          { call: 'revenue_by_plan(csv.DictReader(open("data/orders.csv")), csv.DictReader(open("data/users.csv")))', name: 'orders.csv ⋈ users.csv', hidden: true },
        ],
        wrong: [
          py`
            def revenue_by_plan(orders, users):
                plan = {u["user_id"]: u["plan"] for u in users}
                rev = {}
                for o in orders:
                    p = plan.get(o["user_id"], "unknown")
                    rev[p] = rev.get(p, 0.0) + int(o["quantity"]) * float(o["unit_price"])
                return {p: round(v, 2) for p, v in rev.items()}
          `,
          py`
            def revenue_by_plan(orders, users):
                plan = {u["user_id"]: u["plan"] for u in users}
                rev = {}
                for o in orders:
                    if o["status"] != "completed" or o["user_id"] not in plan:
                        continue
                    p = plan[o["user_id"]]
                    rev[p] = rev.get(p, 0.0) + int(o["quantity"]) * float(o["unit_price"])
                return {p: round(v, 2) for p, v in rev.items()}
          `,
          py`
            def revenue_by_plan(orders, users):
                plan = {u["user_id"]: u["plan"] for u in users}
                rev = {}
                for o in orders:
                    if o["status"] != "completed":
                        continue
                    p = plan.get(o["user_id"], "unknown")
                    rev[p] = rev.get(p, 0.0) + float(o["unit_price"])
                return {p: round(v, 2) for p, v in rev.items()}
          `,
        ],
        explain: md`
          A left hash join plus an aggregation in one streaming pass: O(|orders| + |users|) time, O(|users|) memory. An inner join (wrong #2) silently drops revenue from users missing in the dimension table, and that missing money is exactly what finance will ask about. Mapping them to "unknown" keeps totals reconcilable.

          In Spark, a small users table would be **broadcast**, so the orders are never shuffled for the join, only for the tiny final \`groupBy(plan)\`.
        `,
      },
    ],
  },
};

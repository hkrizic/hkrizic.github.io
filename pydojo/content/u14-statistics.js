// Unit 14 — Statistics & Analytics (track: data)
import { py, md } from './helpers.js';

// Shared hidden setup snippets ------------------------------------------------
const PHI = py`
  import math

  def phi(z):
      return 0.5 * (1 + math.erf(z / math.sqrt(2)))
`;

const AB_SETUP = py`
  import math
  import pandas as pd
  ab = pd.read_csv("data/ab_test.csv")

  def make_ab(xa, na, xb, nb):
      g = ["control"] * na + ["treatment"] * nb
      c = ([1] * xa + [0] * (na - xa)
           + [1] * xb + [0] * (nb - xb))
      return pd.DataFrame({"group": g, "converted": c})
`;

export default {
  id: 'u14',
  order: 14,
  track: 'data',
  title: 'Statistics & Analytics',
  subtitle: 'stats, A/B tests, funnels, cohorts',
  icon: '📈',
  color: '#E11D48',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u14-l1',
      title: 'Center & Spread',
      summary: 'Mean, median, mode, variance and standard deviation, and which one to report.',
      steps: [
        {
          type: 'learn',
          title: 'Mean, median, mode',
          body: md`
            - **Mean**: sum ÷ count.
            - **Median**: the middle value after sorting (the average of the two middle values when n is even).
            - **Mode**: the most frequent value.

            Python's built-in \`statistics\` module has all three. Watch what one huge order does: it drags the mean far away, while the median barely notices.
          `,
          code: py`
            import statistics as st

            orders = [12, 15, 11, 14, 13, 250]
            print(sum(orders) / len(orders))
            print(st.mean(orders))
            print(st.median(orders))
            print(st.mode([2, 3, 3, 5]))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import statistics as st
            x = [10, 12, 11, 13, 200]
            print(st.mean(x), st.median(x))
          `,
          options: ['49.2 12', '49.2 11', '12 49.2', '11.5 12'],
          answer: 0,
          checkOutput: true,
          explain: 'Mean = 246 / 5 = 49.2. Sorted: 10, 11, **12**, 13, 200, so the median is 12. One extreme value moved the mean by 37, the median not at all.',
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import statistics as st
            print(st.median([4, 1, 3, 2]))
            print(st.mode(["ios", "web", "ios"]))
          `,
          answer: '2.5\nios',
          explain: 'Sorted, the list is 1, 2, 3, 4. With an even count the median is the mean of the two middle values: (2 + 3) / 2 = 2.5. The mode also works for text.',
        },
        {
          type: 'code',
          title: 'Median by hand',
          prompt: md`
            Write \`median(values)\` **without** \`statistics\`, numpy or pandas. \`values\` is a non-empty list of numbers in any order.

            - odd length: the middle value of the sorted list
            - even length: the mean of the two middle values
            - don't change the caller's list

            \`\`\`python
            median([3, 1, 2])     # 2
            median([4, 1, 3, 2])  # 2.5
            \`\`\`
          `,
          starter: 'def median(values):\n    pass\n',
          solution: py`
            def median(values):
                s = sorted(values)
                n = len(s)
                mid = n // 2
                if n % 2 == 1:
                    return s[mid]
                return (s[mid - 1] + s[mid]) / 2
          `,
          tests: [
            { call: 'median([3, 1, 2])', expect: '2' },
            { call: 'median([4, 1, 3, 2])', expect: '2.5' },
            { call: 'median([7])', expect: '7', hidden: true },
            { call: 'median([5, 5, 1, 9, 2, 8])', expect: '5.0', hidden: true },
            { call: 'median([-3, -1, -2, 10])', expect: '-1.5', hidden: true },
            { code: 'xs = [3, 1, 2]\nmedian(xs)\nassert xs == [3, 1, 2]', name: 'does not change the input list', hidden: true },
          ],
          forbid: ['statistics', 'numpy', 'pandas'],
          hints: [
            'Sort first: `s = sorted(values)` gives a new list.',
            'With `mid = len(s) // 2`, odd n → `s[mid]`; even n → average of `s[mid - 1]` and `s[mid]`.',
          ],
          wrong: [
            py`
              def median(values):
                  n = len(values)
                  mid = n // 2
                  if n % 2 == 1:
                      return values[mid]
                  return (values[mid - 1] + values[mid]) / 2
            `,
            py`
              def median(values):
                  s = sorted(values)
                  return s[len(s) // 2]
            `,
            py`
              def median(values):
                  values.sort()
                  n = len(values)
                  mid = n // 2
                  if n % 2 == 1:
                      return values[mid]
                  return (values[mid - 1] + values[mid]) / 2
            `,
          ],
          explain: '`sorted()` returns a new list, so the caller\'s data stays intact (`.sort()` would reorder it in place, a nasty side effect). Sorting costs O(n log n). Selection algorithms (quickselect) find the median in O(n) on average, which is a classic follow-up interview question.',
        },
        {
          type: 'learn',
          title: 'Skewed data: why the median wins for revenue',
          body: md`
            Revenue, order values, session lengths and salaries are **right-skewed**: lots of small values and a long tail of big ones. The tail pulls the mean up, so **mean > median**.

            - "What does a *typical* order look like?" → report the **median**.
            - "What will *total* revenue be?" → use the **mean**, because total = count × mean.

            pandas' \`.skew()\` measures the asymmetry: > 0 means a long right tail.
          `,
          code: py`
            import pandas as pd
            df = pd.read_csv("data/orders.csv")
            rev = df["quantity"] * df["unit_price"]
            print(round(rev.mean(), 2))
            print(rev.median())
            print(round(rev.skew(), 2))
          `,
        },
        {
          type: 'choice',
          prompt: 'After a pricing change, **mean** revenue per user rose 20 %, but the **median** didn\'t move. What is the most likely explanation?',
          options: [
            'A few big spenders spent a lot more',
            'Most users spent a little more',
            'The median is broken by outliers',
            'Fewer users bought anything',
          ],
          answer: 0,
          explain: 'If most users spent more, the median would rise too. A moving mean with a flat median is the fingerprint of a change in the **tail**. Before celebrating, look at p90/p99 and at how much of the lift comes from the top 1 % of users.',
        },
        {
          type: 'choice',
          prompt: 'Finance forecasts next month\'s **total** revenue as (expected number of orders) × (some order-value statistic). Which statistic should they use?',
          options: ['The mean', 'The median', 'The mode', 'The 75th percentile'],
          answer: 0,
          explain: 'Total = n × mean, exactly. With right-skewed data, n × median would **underestimate** the total. Pick the statistic that answers the question: median for "typical", mean for "sum".',
        },
        {
          type: 'learn',
          title: 'Variance and standard deviation',
          body: md`
            **Variance** = average squared distance from the mean. The **standard deviation** (std) is its square root, back in the data's units.

            - **Population** (you have every value): divide by **n**.
            - **Sample** (you estimate a bigger population): divide by **n − 1** (Bessel's correction). The sample mean sits closer to its own points than the true mean does, so dividing by n would *underestimate* the spread.

            The bigger n is, the smaller the difference.
          `,
          code: py`
            import math
            x = [2, 4, 4, 4, 5, 5, 7, 9]
            n = len(x)
            m = sum(x) / n
            ss = sum((v - m) ** 2 for v in x)
            print("population var:", ss / n)
            print("sample var:", round(ss / (n - 1), 3))
            print("population std:", math.sqrt(ss / n))
          `,
        },
        {
          type: 'learn',
          title: 'ddof: pandas and numpy disagree',
          body: md`
            **ddof** ("delta degrees of freedom") is what gets subtracted from n.

            | tool | default |
            |---|---|
            | pandas \`.std()\` / \`.var()\` | sample, ddof=1 |
            | \`np.std\` / \`np.var\` | population, ddof=0 |
            | \`statistics.stdev\` / \`pstdev\` | sample / population |

            Same data, different answers! Interviewers love this one. Always say which one you used, and pass \`ddof\` explicitly when it matters.
          `,
          code: py`
            import numpy as np
            import pandas as pd
            import statistics as st
            x = [2, 4, 4, 4, 5, 5, 7, 9]
            print(np.std(x), np.std(x, ddof=1))
            print(pd.Series(x).std())
            print(st.pstdev(x), st.stdev(x))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            import pandas as pd
            x = [1, 2, 3, 4]
            a = np.var(x)
            b = pd.Series(x).var()
            print(round(a, 3), round(b, 3))
          `,
          options: ['1.25 1.667', '1.667 1.25', '1.25 1.25', '1.118 1.291'],
          answer: 0,
          checkOutput: true,
          explain: 'Squared deviations from 2.5 sum to 5. numpy divides by n = 4 → 1.25. pandas divides by n − 1 = 3 → 1.667. (1.118 and 1.291 are the std values, the square roots.)',
        },
        {
          type: 'blanks',
          prompt: 'Make numpy compute the same standard deviation as pandas, so the program prints `True`.',
          code: py`
            import numpy as np
            import pandas as pd
            x = [3, 7, 8, 12]
            a = np.std(x, ___=1)
            b = pd.Series(x).___()
            print(round(a, 6) == round(b, 6))
          `,
          bank: ['ddof', 'std', 'axis', 'var', 'dof', 'mean'],
          answer: ['ddof', 'std'],
          tests: [{ stdout: 'True\n' }],
          explain: '`ddof=1` switches numpy to the sample formula (divide by n − 1), which is pandas\' default for `.std()`.',
        },
        {
          type: 'output',
          prompt: 'Only two data points. What does this print?',
          code: py`
            import statistics as st
            x = [0, 4]
            print(st.pvariance(x), st.variance(x))
            print(st.pstdev(x))
          `,
          answer: '4 8\n2.0',
          explain: 'Mean 2, squared deviations 4 + 4 = 8. Population: 8 / 2 = 4. Sample: 8 / (2 − 1) = 8. With tiny samples the choice doubles the answer. With 10,000 rows it hardly matters.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the variance',
          prompt: md`
            \`sample_var(xs)\` should return the **sample** variance (like pandas \`.var()\`) of a list with at least 2 numbers. It has **two** bugs. Find and fix them.

            \`\`\`python
            sample_var([1, 2, 3, 4])  # 1.6666666666666667
            \`\`\`
          `,
          starter: py`
            def sample_var(xs):
                m = sum(xs) / len(xs)
                total = 0
                for x in xs:
                    total += x - m ** 2
                return total / len(xs)
          `,
          solution: py`
            def sample_var(xs):
                m = sum(xs) / len(xs)
                total = 0
                for x in xs:
                    total += (x - m) ** 2
                return total / (len(xs) - 1)
          `,
          tests: [
            { call: 'sample_var([1, 2, 3, 4])', expect: '5 / 3' },
            { call: 'sample_var([2, 4, 4, 4, 5, 5, 7, 9])', expect: '32 / 7' },
            { call: 'sample_var([10, 10])', expect: '0.0', hidden: true },
            { call: 'sample_var([-1.5, 2.5, 7.0])', hidden: true },
          ],
          forbid: ['statistics', 'numpy', 'pandas'],
          hints: [
            '`**` binds tighter than `-`: `x - m ** 2` squares only `m`.',
            'The sample variance divides by `len(xs) - 1`.',
          ],
          wrong: [
            py`
              def sample_var(xs):
                  m = sum(xs) / len(xs)
                  total = 0
                  for x in xs:
                      total += (x - m) ** 2
                  return total / len(xs)
            `,
            py`
              def sample_var(xs):
                  m = sum(xs) / len(xs)
                  total = 0
                  for x in xs:
                      total += x - m ** 2
                  return total / (len(xs) - 1)
            `,
          ],
          explain: 'Parenthesise the deviation before squaring, and divide by n − 1 for a sample. Note that Σ(x − m) is always 0, which is exactly why we square the deviations.',
        },
        {
          type: 'code',
          title: 'Order value summary',
          prompt: md`
            Write \`order_value_summary(df)\` for a DataFrame shaped like \`data/orders.csv\`.

            - Use only rows with \`status == "completed"\`.
            - Order value = \`quantity * unit_price\`.
            - Return a dict:

            | key | value |
            |---|---|
            | \`"n"\` | number of completed orders (int) |
            | \`"mean"\`, \`"median"\` | rounded to 2 decimals |
            | \`"std"\` | **sample** std, rounded to 2 |
            | \`"right_skewed"\` | \`True\` if mean > median |
          `,
          setup: py`
            import pandas as pd
            orders = pd.read_csv("data/orders.csv")
            small = pd.DataFrame({
                "quantity": [1, 2, 1, 1],
                "unit_price": [10.0, 5.0, 30.0, 8.0],
                "status": ["completed"] * 3 + ["cancelled"],
            })
          `,
          starter: 'def order_value_summary(df):\n    pass\n',
          solution: py`
            def order_value_summary(df):
                done = df[df["status"] == "completed"]
                v = done["quantity"] * done["unit_price"]
                mean, med = v.mean(), v.median()
                return {
                    "n": len(v),
                    "mean": round(mean, 2),
                    "median": round(med, 2),
                    "std": round(v.std(), 2),
                    "right_skewed": bool(mean > med),
                }
          `,
          tests: [
            {
              call: 'order_value_summary(small)',
              expect: "{'n': 3, 'mean': 16.67, 'median': 10.0, 'std': 11.55, 'right_skewed': True}",
              name: '3 completed orders worth 10, 10 and 30',
            },
            { call: 'order_value_summary(orders)', name: 'all of data/orders.csv' },
            { call: 'order_value_summary(orders[orders["category"] == "Grocery"])', hidden: true },
          ],
          hints: [
            'Filter first: `done = df[df["status"] == "completed"]`.',
            'pandas `.std()` is already the sample std (ddof=1). `np.std` would not be.',
          ],
          wrong: [
            py`
              import numpy as np

              def order_value_summary(df):
                  done = df[df["status"] == "completed"]
                  v = done["quantity"] * done["unit_price"]
                  return {
                      "n": len(v),
                      "mean": round(v.mean(), 2),
                      "median": round(v.median(), 2),
                      "std": round(float(np.std(v)), 2),
                      "right_skewed": bool(v.mean() > v.median()),
                  }
            `,
            py`
              def order_value_summary(df):
                  v = df["quantity"] * df["unit_price"]
                  return {
                      "n": len(v),
                      "mean": round(v.mean(), 2),
                      "median": round(v.median(), 2),
                      "std": round(v.std(), 2),
                      "right_skewed": bool(v.mean() > v.median()),
                  }
            `,
          ],
          explain: 'A summary like this is the first thing to compute for any metric. Mean well above median plus a large std means a heavy right tail, so report the median as "typical" and keep the mean for totals. `bool(...)` turns numpy\'s `np.True_` into a plain Python bool.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u14-l2',
      title: 'Distributions & Outliers',
      summary: 'Percentiles, the IQR rule, z-scores and the normal distribution, applied to real metrics.',
      steps: [
        {
          type: 'learn',
          title: 'Percentiles and tail latency',
          body: md`
            The **p-th percentile** is the value below which p % of the data falls. The median is p50.

            Engineers watch **p95 / p99 latency** because the mean hides the slow requests that real users feel. One page load often triggers dozens of requests, so most users hit the p99 eventually.

            \`np.percentile(x, 95)\` and pandas \`s.quantile(0.95)\` both interpolate **linearly** between neighbouring values by default.
          `,
          code: py`
            import numpy as np
            with open("data/server.log") as f:
                secs = [float(line.split()[-1])
                        for line in f]
            ms = np.array(secs) * 1000
            print("mean:", round(ms.mean(), 1))
            p = np.percentile(ms, [50, 95, 99])
            print("p50/p95/p99:", p.round(1))
          `,
        },
        {
          type: 'output',
          prompt: 'Linear interpolation: the quantile q sits at position q × (n − 1) in the sorted data. What does this print?',
          code: py`
            import pandas as pd
            s = pd.Series([10, 20, 30, 40, 50])
            print(s.quantile(0.5))
            print(s.quantile(0.25))
            print(s.quantile(0.9))
          `,
          answer: '30.0\n20.0\n46.0',
          explain: 'n − 1 = 4. q = 0.5 → position 2 → 30. q = 0.25 → position 1 → 20. q = 0.9 → position 3.6 → 40 + 0.6 × (50 − 40) = 46.',
        },
        {
          type: 'code',
          title: 'Latency report',
          prompt: md`
            Each log line ends with the response time **in seconds**:

            \`\`\`
            203.0.113.5 - - [12/Nov/2025:09:00:40 +0000] "POST /api/checkout HTTP/1.1" 200 8940 0.137
            \`\`\`

            Write \`latency_report(lines)\` that returns \`{"p50": …, "p95": …, "p99": …}\` in **milliseconds**, each rounded to 1 decimal, using numpy's default (linear) percentiles.

            \`log\` (all lines of \`data/server.log\`) is already loaded for you to try.
          `,
          setup: py`
            import numpy as np
            log = open("data/server.log").read().splitlines()
            mini = [f'1.2.3.4 - - [t] "GET / HTTP/1.1" 200 9 {s}'
                    for s in ("0.010", "0.020", "0.030",
                              "0.040", "0.500")]
          `,
          starter: 'import numpy as np\n\ndef latency_report(lines):\n    pass\n',
          solution: py`
            import numpy as np

            def latency_report(lines):
                ms = np.array([float(l.split()[-1])
                               for l in lines]) * 1000
                p = np.percentile(ms, [50, 95, 99])
                return {"p50": round(float(p[0]), 1),
                        "p95": round(float(p[1]), 1),
                        "p99": round(float(p[2]), 1)}
          `,
          tests: [
            { call: 'latency_report(mini)', expect: "{'p50': 30.0, 'p95': 408.0, 'p99': 481.6}", name: 'five requests: 10, 20, 30, 40, 500 ms' },
            { call: 'latency_report(log)', name: 'the whole server.log' },
            { call: 'latency_report([l for l in log if "/api/" in l])', hidden: true, name: 'API requests only' },
          ],
          hints: [
            'The response time is the last whitespace-separated field: `float(line.split()[-1])`.',
            'Convert to ms (× 1000) first, then `np.percentile(ms, [50, 95, 99])`.',
          ],
          wrong: [
            py`
              def latency_report(lines):
                  ms = sorted(float(l.split()[-1]) * 1000
                              for l in lines)
                  n = len(ms)
                  return {"p50": round(ms[int(0.50 * n)], 1),
                          "p95": round(ms[int(0.95 * n)], 1),
                          "p99": round(ms[int(0.99 * n)], 1)}
            `,
            py`
              import numpy as np

              def latency_report(lines):
                  s = np.array([float(l.split()[-1])
                                for l in lines])
                  p = np.percentile(s, [50, 95, 99])
                  return {"p50": round(float(p[0]), 1),
                          "p95": round(float(p[1]), 1),
                          "p99": round(float(p[2]), 1)}
            `,
          ],
          explain: 'There are several percentile definitions (nearest-rank, linear, …), and they disagree on small samples. Name your method when you report numbers. On real systems p99 is often 5–20× the median. At big-data scale, exact percentiles need a sort (O(n log n)), so streaming systems use sketches such as t-digest instead.',
        },
        {
          type: 'learn',
          title: 'The IQR rule for outliers',
          body: md`
            **Q1** = 25th percentile, **Q3** = 75th percentile, **IQR = Q3 − Q1** (the middle 50 % of the data).

            Tukey's rule flags a value as an outlier when it lies below **Q1 − 1.5·IQR** or above **Q3 + 1.5·IQR**. These are the box-plot whiskers.

            It's **robust**: quartiles barely move when a few extreme values join the data, unlike the mean and the std, which the outliers themselves inflate.
          `,
          code: py`
            import pandas as pd
            df = pd.read_csv("data/orders.csv")
            rev = df["quantity"] * df["unit_price"]
            q1, q3 = rev.quantile([0.25, 0.75])
            iqr = q3 - q1
            hi = q3 + 1.5 * iqr
            print(q1, q3, round(iqr, 2), round(hi, 2))
            print((rev > hi).sum(), "above the fence")
          `,
        },
        {
          type: 'choice',
          prompt: 'A dataset has Q1 = 20 and Q3 = 50. Which value is an outlier by the IQR rule?',
          options: ['100', '90', '0', '-20'],
          answer: 0,
          explain: 'IQR = 30, so 1.5·IQR = 45. Fences: 20 − 45 = −25 and 50 + 45 = 95. Only 100 lies outside [−25, 95].',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines so `iqr_outliers(s)` returns the values of `s` outside the IQR fences (both sides).',
          setup: 'import pandas as pd',
          lines: [
            'def iqr_outliers(s):',
            '    q1, q3 = s.quantile([0.25, 0.75])',
            '    iqr = q3 - q1',
            '    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr',
            '    return s[(s < lo) | (s > hi)]',
          ],
          distractors: ['    return s[(s < lo) & (s > hi)]', '    iqr = q3 + q1'],
          tests: [
            { call: 'iqr_outliers(pd.Series([1, 2, 3, 4, 100])).tolist()', expect: '[100]' },
            { call: 'iqr_outliers(pd.Series([-50, 10, 11, 12, 13])).tolist()', expect: '[-50]' },
          ],
          explain: 'A value can\'t be below `lo` **and** above `hi` at the same time, so `&` would always return nothing. Use `|` (or) to catch both tails. The result keeps the original index, so you can look the rows up later.',
        },
        {
          type: 'code',
          title: 'Outliers per category',
          prompt: md`
            A €190 monitor order is normal for Electronics but would be an extreme Grocery order. Flag outliers **within each category**.

            Write \`outlier_summary(df)\` for an orders DataFrame:
            - revenue = \`quantity * unit_price\` (all statuses)
            - an order is an outlier if its revenue is outside the IQR fences **of its own category**
            - return a DataFrame indexed by category (sorted A→Z) with columns \`orders\`, \`outliers\` and \`share\` (= outliers / orders, rounded to 3)
          `,
          setup: py`
            import pandas as pd
            orders = pd.read_csv("data/orders.csv")
            tiny = pd.DataFrame({
                "category": ["A"] * 5 + ["B"] * 5,
                "quantity": [1] * 10,
                "unit_price": [1, 2, 3, 4, 100, 1000,
                               1010, 1020, 1030, 1040],
            })
            low = pd.DataFrame({
                "category": ["C"] * 5,
                "quantity": [1] * 5,
                "unit_price": [100, 101, 102, 103, 1],
            })
          `,
          starter: 'def outlier_summary(df):\n    pass\n',
          solution: py`
            def outlier_summary(df):
                rev = df["quantity"] * df["unit_price"]
                g = rev.groupby(df["category"])
                q1 = g.transform("quantile", 0.25)
                q3 = g.transform("quantile", 0.75)
                iqr = q3 - q1
                out = ((rev < q1 - 1.5 * iqr)
                       | (rev > q3 + 1.5 * iqr))
                res = out.groupby(df["category"]).agg(
                    ["size", "sum"])
                res.columns = ["orders", "outliers"]
                share = res["outliers"] / res["orders"]
                res["share"] = share.round(3)
                return res
          `,
          tests: [
            {
              call: 'outlier_summary(tiny)',
              expect: 'pd.DataFrame({"orders": [5, 5], "outliers": [1, 0], "share": [0.2, 0.0]}, index=["A", "B"])',
              name: 'per-category fences (A has one outlier, B none)',
            },
            { call: 'outlier_summary(orders)', name: 'data/orders.csv' },
            { call: 'outlier_summary(low)', expect: 'pd.DataFrame({"orders": [5], "outliers": [1], "share": [0.2]}, index=["C"])', hidden: true, name: 'a suspiciously small order is an outlier too' },
            { call: 'outlier_summary(orders[orders["country"] == "DE"])', hidden: true },
          ],
          hints: [
            '`rev.groupby(df["category"]).transform("quantile", 0.25)` returns one value per **row**: that row\'s category Q1.',
            'Build a boolean Series `out`, then `out.groupby(df["category"]).agg(["size", "sum"])` counts rows and True values.',
          ],
          wrong: [
            py`
              def outlier_summary(df):
                  rev = df["quantity"] * df["unit_price"]
                  q1, q3 = rev.quantile([0.25, 0.75])
                  iqr = q3 - q1
                  out = ((rev < q1 - 1.5 * iqr)
                         | (rev > q3 + 1.5 * iqr))
                  res = out.groupby(df["category"]).agg(
                      ["size", "sum"])
                  res.columns = ["orders", "outliers"]
                  share = res["outliers"] / res["orders"]
                  res["share"] = share.round(3)
                  return res
            `,
            py`
              def outlier_summary(df):
                  rev = df["quantity"] * df["unit_price"]
                  g = rev.groupby(df["category"])
                  q1 = g.transform(lambda s: s.quantile(0.25))
                  q3 = g.transform(lambda s: s.quantile(0.75))
                  out = rev > q3 + 1.5 * (q3 - q1)
                  res = out.groupby(df["category"]).agg(
                      ["size", "sum"])
                  res.columns = ["orders", "outliers"]
                  share = res["outliers"] / res["orders"]
                  res["share"] = share.round(3)
                  return res
            `,
          ],
          explain: 'Global fences flag almost every Electronics order and no Grocery order: you\'d be detecting "is this category expensive?" instead of "is this order unusual?". `groupby().transform()` (U13) broadcasts each group\'s statistic back to its rows, which is the standard way to compare a row with its own group.',
        },
        {
          type: 'learn',
          title: 'See the shape: a histogram',
          body: md`
            A **histogram** buckets values into bins and counts them. Plot it before computing anything: it shows skew, multiple peaks and outliers at a glance.

            Order revenue: a big pile of small orders and a long right tail, with the mean (dashed) to the right of the median.
          `,
          code: py`
            import pandas as pd
            import matplotlib.pyplot as plt
            df = pd.read_csv("data/orders.csv")
            rev = df["quantity"] * df["unit_price"]
            plt.figure(figsize=(6, 3.5))
            plt.hist(rev, bins=40, color="#E11D48")
            plt.axvline(rev.median(), color="k",
                        label="median")
            plt.axvline(rev.mean(), color="k", ls="--",
                        label="mean")
            plt.xlabel("order revenue (€)")
            plt.ylabel("orders")
            plt.legend()
            plt.show()
          `,
        },
        {
          type: 'learn',
          title: 'The normal distribution and z-scores',
          body: md`
            Many averages and measurement errors follow the bell-shaped **normal distribution** N(μ, σ).

            The **z-score** z = (x − μ) / σ says how many standard deviations a value is from the mean.

            **68-95-99.7 rule**: about 68 % of values lie within 1σ, 95 % within 2σ (exactly: 1.96σ) and 99.7 % within 3σ.

            The CDF Φ(z) = P(Z ≤ z) needs no scipy: **Φ(z) = ½·(1 + erf(z/√2))**.
          `,
          code: py`
            import math
            import numpy as np

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            for k in (1, 2, 3):
                print(k, round(phi(k) - phi(-k), 4))

            rng = np.random.default_rng(0)
            x = rng.normal(100, 15, 100_000)
            print(np.mean(abs(x - 100) < 30))
          `,
        },
        {
          type: 'choice',
          prompt: 'Daily signups are roughly normal with mean 1,000 and std 50. On about what share of days do you expect **more than 1,100** signups?',
          options: ['2.5 %', '5 %', '16 %', '0.15 %'],
          answer: 0,
          explain: '1,100 is 2σ above the mean. About 95 % of days fall within ±2σ, so 5 % fall outside, split evenly between the two tails: ≈ 2.5 % above (exactly 1 − Φ(2) ≈ 2.3 %). 16 % would be the share above 1σ, 0.15 % above 3σ.',
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            import math

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            print(round(phi(0), 2))
            print(round(phi(1.96), 3))
            print(round(1 - phi(1), 3))
          `,
          answer: '0.5\n0.975\n0.159',
          explain: 'Φ(0) = 0.5 by symmetry. Φ(1.96) = 0.975: 2.5 % lies above +1.96σ, the famous 95 % two-sided cut-off. 1 − Φ(1) ≈ 0.159: about 16 % lie more than 1σ above the mean.',
        },
        {
          type: 'blanks',
          prompt: 'Compute z-scores with pandas. Notice how small the outlier\'s z is!',
          code: py`
            import pandas as pd
            s = pd.Series([10, 12, 11, 13, 40])
            z = (s - s.___()) / s.___()
            print(z.round(2).tolist())
          `,
          bank: ['mean', 'std', 'median', 'max', 'sum', 'count'],
          answer: ['mean', 'std'],
          tests: [{ stdout: '[-0.56, -0.41, -0.48, -0.33, 1.78]\n' }],
          explain: '40 is clearly an outlier, yet its z is only 1.78 because the outlier inflates the std it is divided by (**masking**). With n values the largest possible |z| is (n − 1)/√n, only 1.79 for n = 5. A "|z| > 3" rule can never fire on tiny samples. Use the IQR rule, or a baseline without the point.',
        },
        {
          type: 'code',
          title: 'Anomalous days',
          prompt: md`
            Write \`anomalies(daily, k=3)\`. \`daily\` is a pandas Series of a daily metric (index = date strings). Return the **list of dates** (index labels, in their original order) whose |z| > k, with z computed from the series' mean and **sample** std (pandas' default).

            Flag days that are unusually **high or low**.

            \`\`\`python
            daily_orders = orders.groupby("order_date").size()
            anomalies(daily_orders)  # a list of date strings
            \`\`\`
          `,
          setup: py`
            import pandas as pd
            orders = pd.read_csv("data/orders.csv")
            daily_orders = orders.groupby("order_date").size()
            days = [f"2025-03-{d:02d}" for d in range(1, 13)]
            s12 = pd.Series([50, 52, 49, 51, 50, 20,
                             50, 51, 49, 52, 50, 71],
                            index=days)
          `,
          starter: 'def anomalies(daily, k=3):\n    pass\n',
          solution: py`
            def anomalies(daily, k=3):
                z = (daily - daily.mean()) / daily.std()
                return list(daily.index[z.abs() > k])
          `,
          tests: [
            { call: 'anomalies(s12, k=2)', expect: '["2025-03-06"]', name: '12 days, k=2 (one low day)' },
            { call: 'anomalies(daily_orders)', name: 'daily orders in 2025, k=3' },
            { call: 'anomalies(daily_orders, k=2.5)', hidden: true },
            { call: 'anomalies(-s12, k=2)', hidden: true },
          ],
          hints: [
            'z = (daily − mean) / std, all as whole-Series operations.',
            '`daily.index[mask]` selects the labels. Use `z.abs()` so low days count too.',
          ],
          wrong: [
            py`
              def anomalies(daily, k=3):
                  z = (daily - daily.mean()) / daily.std()
                  return list(daily.index[z > k])
            `,
            py`
              def anomalies(daily, k=3):
                  sd = daily.std(ddof=0)
                  z = (daily - daily.mean()) / sd
                  return list(daily.index[z.abs() > k])
            `,
          ],
          explain: 'On the real data, every flagged day is in November/December: the holiday season. A global z-score treats seasonality as anomalies. Production monitors compare each day with a **rolling baseline** of recent days (or the same weekday last weeks). You\'ll build that in the exam. Also beware: days with zero orders are missing from a `groupby` count entirely, so reindex to a full date range before computing statistics.',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u14-l3',
      title: 'Correlation',
      summary: 'Covariance, Pearson r, spurious correlation, causation and Simpson\'s paradox.',
      steps: [
        {
          type: 'learn',
          title: 'Covariance',
          body: md`
            Covariance measures whether two variables move together:

            cov(x, y) = Σ(x − x̄)(y − ȳ) / (n − 1)

            - **positive**: above-average x tends to come with above-average y
            - **negative**: above-average x comes with below-average y

            Problem: its size depends on the units (measure in cents instead of euros and it grows 100×), so you can't read *strength* from it. \`np.cov\` divides by n − 1 and returns a 2×2 matrix.
          `,
          code: py`
            import numpy as np
            ads = [1, 2, 3, 4, 5]
            sales = [12, 15, 19, 22, 30]
            mx, my = np.mean(ads), np.mean(sales)
            prods = [(a - mx) * (s - my)
                     for a, s in zip(ads, sales)]
            print(sum(prods) / (len(ads) - 1))
            print(np.cov(ads, sales)[0, 1])
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import numpy as np
            print(np.cov([1, 2, 3], [6, 4, 2])[0, 1])
          `,
          options: ['-2.0', '2.0', '-1.3333333333333333', '-4.0'],
          answer: 0,
          checkOutput: true,
          explain: 'Deviations: x → −1, 0, 1 and y → 2, 0, −2. Products sum to −4. np.cov divides by n − 1 = 2 → −2.0. Dividing by n would give −1.33.',
        },
        {
          type: 'learn',
          title: 'Pearson correlation r',
          body: md`
            Divide the covariance by both standard deviations and the units cancel:

            **r = cov(x, y) / (sₓ · s_y)**, always between −1 and 1.

            r = 1: perfect increasing line. r = 0: no *linear* relation. r = −1: perfect decreasing line. **r²** is the share of y's variance a straight line in x explains.

            Use the same ddof on top and bottom! pandas: \`s1.corr(s2)\` or \`df.corr()\` for a whole matrix. numpy: \`np.corrcoef(x, y)[0, 1]\`.
          `,
          code: py`
            import numpy as np
            import pandas as pd
            ads = [1, 2, 3, 4, 5]
            sales = [12, 15, 19, 22, 30]
            sx = np.std(ads, ddof=1)
            sy = np.std(sales, ddof=1)
            r = np.cov(ads, sales)[0, 1] / (sx * sy)
            print(round(r, 4))
            r2 = np.corrcoef(ads, sales)[0, 1]
            print(round(r2, 4))
            a, s = pd.Series(ads), pd.Series(sales)
            print(round(a.corr(s), 4))
          `,
        },
        {
          type: 'output',
          prompt: 'r measures **linear** relationships. What does this print?',
          code: py`
            import numpy as np
            x = np.array([-2, -1, 0, 1, 2])
            r1 = np.corrcoef(x, 3 * x + 7)[0, 1]
            r2 = np.corrcoef(x, -x)[0, 1]
            r3 = np.corrcoef(x, x ** 2)[0, 1]
            print(round(r1, 2))
            print(round(r2, 2))
            print(round(r3, 2))
          `,
          answer: '1.0\n-1.0\n0.0',
          explain: 'Any increasing straight line gives r = 1 (slope size doesn\'t matter). y = x² is **perfectly determined** by x, yet r = 0, because the relation isn\'t a line. r = 0 doesn\'t mean "unrelated": always plot the data.',
        },
        {
          type: 'code',
          title: 'Pearson r by hand',
          prompt: md`
            Write \`pearson(x, y)\` that returns Pearson's r for two equal-length lists (n ≥ 2, neither constant). No numpy, pandas or \`statistics\`. Don't round.

            \`\`\`python
            pearson([1, 2, 3], [2, 4, 6])        # 1.0
            pearson([1, 2, 3, 4], [4, 3, 2, 1])  # -1.0
            \`\`\`
          `,
          setup: py`
            import csv
            with open("data/weather.csv") as f:
                rows = [r for r in csv.DictReader(f)
                        if r["city"] == "Madrid"]
            temp = [float(r["temp_c"]) for r in rows]
            rain = [float(r["rain_mm"]) for r in rows]
          `,
          starter: 'import math\n\ndef pearson(x, y):\n    pass\n',
          solution: py`
            import math

            def pearson(x, y):
                n = len(x)
                mx, my = sum(x) / n, sum(y) / n
                sxy = sum((a - mx) * (b - my)
                          for a, b in zip(x, y))
                sxx = sum((a - mx) ** 2 for a in x)
                syy = sum((b - my) ** 2 for b in y)
                return sxy / math.sqrt(sxx * syy)
          `,
          tests: [
            { call: 'pearson([1, 2, 3], [2, 4, 6])', expect: '1.0' },
            { call: 'pearson([1, 2, 3, 4], [4, 3, 2, 1])', expect: '-1.0' },
            { call: 'pearson([1, 2, 3, 4], [2, 1, 4, 3])', expect: '0.6' },
            { call: 'pearson(temp, rain)', hidden: true, name: 'Madrid temperature vs rain' },
            { call: 'pearson([0.5, 2.5, -1.0, 4.0], [10, 30, 0, 20])', hidden: true },
          ],
          forbid: ['numpy', 'pandas', 'statistics'],
          hints: [
            'Centre both lists on their means, then sum the products of the deviations.',
            'r = Σ(dx·dy) / √(Σdx² · Σdy²). The (n − 1) factors cancel, so you never need them.',
          ],
          wrong: [
            py`
              import math

              def pearson(x, y):
                  n = len(x)
                  mx, my = sum(x) / n, sum(y) / n
                  cov = sum((a - mx) * (b - my)
                            for a, b in zip(x, y)) / (n - 1)
                  sx = math.sqrt(sum((a - mx) ** 2
                                     for a in x) / n)
                  sy = math.sqrt(sum((b - my) ** 2
                                     for b in y) / n)
                  return cov / (sx * sy)
            `,
            py`
              import math

              def pearson(x, y):
                  sxy = sum(a * b for a, b in zip(x, y))
                  sxx = sum(a * a for a in x)
                  syy = sum(b * b for b in y)
                  return sxy / math.sqrt(sxx * syy)
            `,
          ],
          explain: 'Mixing ddof (n − 1 in the covariance, n in the stds) scales r by n/(n − 1), which can even push it above 1. Forgetting to subtract the means gives **cosine similarity** instead: a different, also useful, measure (it\'s what embeddings use). One pass, O(n).',
        },
        {
          type: 'code',
          title: 'Correlate returns, not prices',
          prompt: md`
            Write \`returns_corr(df)\` for a DataFrame shaped like \`data/stocks.csv\` (\`date, ticker, close, volume\`).

            1. Pivot to one column per ticker (index = date).
            2. Compute **daily returns** with \`pct_change()\`.
            3. Return the correlation matrix of the returns, rounded to 3.

            Tickers stay in alphabetical order (pivot does that for you).
          `,
          setup: py`
            import pandas as pd
            stocks = pd.read_csv("data/stocks.csv")
            two = pd.DataFrame({
                "date": ["d1", "d2", "d3", "d4"] * 2,
                "ticker": ["A"] * 4 + ["B"] * 4,
                "close": [100, 110, 99, 108.9,
                          50, 45, 49.5, 44.55],
            })
          `,
          starter: 'def returns_corr(df):\n    pass\n',
          solution: py`
            def returns_corr(df):
                wide = df.pivot(index="date",
                                columns="ticker",
                                values="close")
                return wide.pct_change().corr().round(3)
          `,
          tests: [
            {
              call: 'returns_corr(two)',
              expect: 'pd.DataFrame([[1.0, -1.0], [-1.0, 1.0]], index=["A", "B"], columns=["A", "B"])',
              name: 'A: +10 %, −10 %, +10 %; B: the opposite',
            },
            { call: 'returns_corr(stocks)', name: 'data/stocks.csv' },
            { call: 'returns_corr(stocks[stocks["date"] < "2025-07-01"])', hidden: true },
          ],
          hints: [
            '`df.pivot(index="date", columns="ticker", values="close")`',
            'Then `.pct_change()` turns prices into returns. `.corr()` gives the matrix.',
          ],
          wrong: [
            py`
              def returns_corr(df):
                  wide = df.pivot(index="date",
                                  columns="ticker",
                                  values="close")
                  return wide.corr().round(3)
            `,
          ],
          explain: 'Compare `returns_corr(stocks)` with the correlation of the raw prices: the prices show r ≈ ±0.5 between some tickers, while the returns are nearly uncorrelated. Any two series that trend over time look correlated (**spurious correlation**). Remove the trend first: use returns, differences or growth rates. The same applies to "users vs revenue over time" dashboards.',
        },
        {
          type: 'learn',
          title: 'Correlation is not causation',
          body: md`
            A correlation between X and Y can come from:
            - a **confounder**: hot weather drives both ice-cream sales and drownings
            - **reverse causation**: big cities get more ad budget *because* they already sell more
            - **selection**: users who choose a feature were already more engaged

            Only a **randomized experiment** (A/B test) breaks these links: random assignment makes the groups alike on average in everything except the treatment. Observational data suggests hypotheses, and experiments test them.
          `,
        },
        {
          type: 'choice',
          prompt: 'Users who turned on **dark mode** retain 30 % better. The PM wants to make dark mode the default for everyone to boost retention. What do you say?',
          options: [
            'A/B test it: engaged users self-select',
            'Ship it: 30 % is a big effect',
            'Ship it if r is significant',
            'Remove dark mode and measure the drop',
          ],
          answer: 0,
          explain: 'Power users explore settings, so they choose dark mode *and* retain better: selection bias. A significance test doesn\'t fix confounding, it only rules out noise. Randomize the default and compare retention.',
        },
        {
          type: 'choice',
          prompt: 'Across 50 cities, marketing spend and revenue have r = 0.9. Which conclusion is justified?',
          options: [
            'Spend and revenue rise together',
            'Doubling spend will double revenue',
            'Spend explains 90 % of revenue',
            'r = 0.9 proves causation',
          ],
          answer: 0,
          explain: 'r describes association only. Budgets are often allocated to cities that already sell more (reverse causation), and city size drives both (confounder). Even the "explained" share would be r² = 0.81, and only in the statistical sense of a fitted line.',
        },
        {
          type: 'learn',
          title: "Simpson's paradox",
          body: md`
            A trend in **every** subgroup can **reverse** when the groups are pooled, if the groups' mix differs.

            Below, the new checkout converts better on desktop *and* on mobile, yet worse overall: most of its traffic came from mobile, which converts lower. The overall number mixes "better variant" with "worse traffic".

            Segment before you conclude, and check that the mix is balanced (randomization does this in a proper A/B test).
          `,
          code: py`
            import pandas as pd
            df = pd.DataFrame({
                "variant": ["old", "old", "new", "new"],
                "device": ["desktop", "mobile"] * 2,
                "users": [800, 200, 200, 800],
                "buyers": [160, 20, 44, 88],
            })
            print(df.assign(rate=df.buyers / df.users))
            cols = ["users", "buyers"]
            tot = df.groupby("variant")[cols].sum()
            print(tot.buyers / tot.users)
          `,
        },
        {
          type: 'choice',
          prompt: 'Team B solves a higher share of **both** easy and hard tickets than team A. What does this print?',
          code: py`
            import pandas as pd
            df = pd.DataFrame({
                "team": ["A", "A", "B", "B"],
                "kind": ["easy", "hard", "easy", "hard"],
                "tickets": [90, 10, 20, 80],
                "solved": [81, 2, 19, 24],
            })
            cols = ["tickets", "solved"]
            t = df.groupby("team")[cols].sum()
            rate = t.solved / t.tickets
            print(rate.round(2).tolist())
          `,
          options: ['[0.83, 0.43]', '[0.43, 0.83]', '[0.55, 0.62]', '[0.9, 0.95]'],
          answer: 0,
          checkOutput: true,
          explain: 'A: easy 90 %, hard 20 %. B: easy 95 %, hard 30 %. B wins both, but A mostly handles easy tickets: 83/100 overall vs B\'s 43/100. Judge B by the overall rate and you\'d punish the team that takes the hard work.',
        },
        {
          type: 'blanks',
          prompt: 'Compute r and r² with numpy so the program prints `0.6 0.36`.',
          code: py`
            import numpy as np
            x = [1, 2, 3, 4]
            y = [2, 1, 4, 3]
            r = np.___(x, y)[0, 1]
            r2 = r ___ 2
            print(round(r, 2), round(r2, 2))
          `,
          bank: ['corrcoef', '**', 'cov', '*', 'corr', '//'],
          answer: ['corrcoef', '**'],
          tests: [{ stdout: '0.6 0.36\n' }],
          explain: '`np.corrcoef` returns the correlation matrix; `[0, 1]` is the x-y entry. `np.cov` would give the covariance (1.0 here). r² = 0.36: a line explains 36 % of y\'s variance.',
        },
        {
          type: 'code',
          title: 'Segment the A/B test',
          prompt: md`
            Write \`segment_rates(df, segment)\` for A/B data with columns \`group\` (\`control\`/\`treatment\`), \`converted\` (0/1) and a segment column such as \`device\`.

            Return a DataFrame with:
            - one row per segment value (sorted), plus a final row \`"ALL"\` with the **pooled** rate of all users of that group
            - columns \`control\`, \`treatment\`
            - values = conversion rate, rounded to 4
          `,
          setup: py`
            import pandas as pd
            ab = pd.read_csv("data/ab_test.csv")
            rows = []
            for g, d, n, k in [("control", "desktop", 800, 160),
                               ("control", "mobile", 200, 20),
                               ("treatment", "desktop", 200, 44),
                               ("treatment", "mobile", 800, 88)]:
                rows += [(g, d, 1)] * k + [(g, d, 0)] * (n - k)
            paradox = pd.DataFrame(
                rows, columns=["group", "device", "converted"])
          `,
          starter: 'def segment_rates(df, segment):\n    pass\n',
          solution: py`
            def segment_rates(df, segment):
                t = df.pivot_table(index=segment,
                                   columns="group",
                                   values="converted",
                                   aggfunc="mean")
                g = df.groupby("group")["converted"]
                t.loc["ALL"] = g.mean()
                return t.round(4)
          `,
          tests: [
            {
              call: 'segment_rates(paradox, "device")',
              expect: 'pd.DataFrame({"control": [0.2, 0.1, 0.18], "treatment": [0.22, 0.11, 0.132]}, index=["desktop", "mobile", "ALL"])',
              name: "Simpson's paradox data",
            },
            { call: 'segment_rates(ab, "device")', name: 'data/ab_test.csv by device' },
            { call: 'segment_rates(ab[ab["user_id"] <= 1500], "device")', hidden: true },
          ],
          hints: [
            '`df.pivot_table(index=segment, columns="group", values="converted", aggfunc="mean")` gives the segment rows.',
            'For "ALL", don\'t average the segment rates. Compute `df.groupby("group")["converted"].mean()` over all rows.',
          ],
          wrong: [
            py`
              def segment_rates(df, segment):
                  t = df.pivot_table(index=segment,
                                     columns="group",
                                     values="converted",
                                     aggfunc="mean")
                  t.loc["ALL"] = t.mean()
                  return t.round(4)
            `,
          ],
          explain: 'The mean of segment rates weights a 200-user segment like an 800-user one. Pooled rates weight by users. In the real test, treatment wins on both devices, and the two groups have a similar device mix (as randomization should give), so the pooled result agrees. A segment table is the first sanity check of any experiment readout.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u14-l4',
      title: 'A/B Testing',
      summary: 'Conversion rates, lift, the two-proportion z-test, confidence intervals and the classic pitfalls.',
      steps: [
        {
          type: 'learn',
          title: 'Reading an A/B test',
          body: md`
            Users are **randomly** split into **control** (A, current product) and **treatment** (B, the change). Because the split is random, a difference beyond noise is *caused* by the change.

            The usual metric is **conversion rate** = converters / users, per group.
            - **Absolute lift** = p_B − p_A, in percentage points (pp)
            - **Relative lift** = (p_B − p_A) / p_A

            "10 % → 12 %" is +2 pp absolute but +20 % relative. Always say which one you mean.
          `,
          code: py`
            import pandas as pd
            ab = pd.read_csv("data/ab_test.csv")
            g = ab.groupby("group")["converted"]
            rates = g.mean()
            print(rates.round(4))
            pa, pb = rates["control"], rates["treatment"]
            print(f"absolute: {(pb - pa) * 100:+.2f} pp")
            print(f"relative: {(pb - pa) / pa:+.1%}")
          `,
        },
        {
          type: 'output',
          prompt: 'Control converts at 4 %, treatment at 5 %. What does this print?',
          code: py`
            pa, pb = 0.040, 0.050
            print(f"{(pb - pa) * 100:.1f} pp")
            print(f"{(pb - pa) / pa:.0%}")
          `,
          answer: '1.0 pp\n25%',
          explain: 'One percentage point absolute, 25 % relative. A headline of "+25 % conversions!" and "+1 pp" describe the same result, so know which one your audience hears.',
        },
        {
          type: 'code',
          title: 'Conversion table',
          prompt: md`
            Write \`conversion_table(df)\` for A/B data (columns \`group\`, \`converted\`, …). Return a DataFrame indexed by group (\`control\`, \`treatment\`) with columns:

            - \`users\`: number of users in the group
            - \`conversions\`: number with \`converted == 1\`
            - \`rate\`: conversions / users, rounded to 4
          `,
          setup: AB_SETUP,
          starter: 'def conversion_table(df):\n    pass\n',
          solution: py`
            def conversion_table(df):
                t = df.groupby("group")["converted"].agg(
                    users="size", conversions="sum")
                rate = t["conversions"] / t["users"]
                t["rate"] = rate.round(4)
                return t
          `,
          tests: [
            {
              call: 'conversion_table(make_ab(1, 4, 3, 6))',
              expect: 'pd.DataFrame({"users": [4, 6], "conversions": [1, 3], "rate": [0.25, 0.5]}, index=["control", "treatment"])',
              name: '1 of 4 vs 3 of 6',
            },
            { call: 'conversion_table(ab)', name: 'data/ab_test.csv' },
            { call: 'conversion_table(ab[ab["device"] == "mobile"])', hidden: true },
          ],
          hints: [
            '`groupby("group")["converted"].agg(users="size", conversions="sum")` creates two named columns.',
            'Each group\'s rate uses **its own** user count as the denominator.',
          ],
          wrong: [
            py`
              def conversion_table(df):
                  t = df.groupby("group")["converted"].agg(
                      users="size", conversions="sum")
                  t["rate"] = (t["conversions"] / len(df)).round(4)
                  return t
            `,
          ],
          explain: 'Dividing by the total number of users (both groups) halves every rate: a wrong-denominator bug that looks plausible on a dashboard. Showing `users` next to `rate` lets readers check the split is ~50/50. A big imbalance (**sample ratio mismatch**) means the randomization is broken.',
        },
        {
          type: 'learn',
          title: 'The two-proportion z-test',
          body: md`
            Is the lift real or noise? Assume **H₀: both groups convert at the same rate**.

            1. Pooled rate: p̂ = (x_A + x_B) / (n_A + n_B)
            2. Standard error under H₀: SE = √(p̂(1 − p̂)(1/n_A + 1/n_B))
            3. z = (p_B − p_A) / SE
            4. Two-sided p-value = 2 · (1 − Φ(|z|))

            The **p-value** is the probability of a difference at least this extreme **if H₀ were true**. Below α = 0.05 we call the result "statistically significant".
          `,
          code: py`
            import math

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            xa, na = 200, 2000
            xb, nb = 250, 2000
            pa, pb = xa / na, xb / nb
            p = (xa + xb) / (na + nb)
            se = math.sqrt(p * (1 - p) * (1/na + 1/nb))
            z = (pb - pa) / se
            print(round(z, 3))
            print(round(2 * (1 - phi(abs(z))), 4))
          `,
        },
        {
          type: 'order',
          prompt: 'Arrange the lines into a pooled two-proportion z-test that returns `(z, p_value)`. (`math` and `phi` already exist.)',
          setup: PHI,
          lines: [
            'def z_test(xa, na, xb, nb):',
            '    pa, pb = xa / na, xb / nb',
            '    p = (pa * na + pb * nb) / (na + nb)',
            '    se = math.sqrt(p*(1-p)*(1/na + 1/nb))',
            '    z = (pb - pa) / se',
            '    return z, 2 * (1 - phi(abs(z)))',
          ],
          distractors: ['    se = math.sqrt(p*(1-p) / (na + nb))', '    return z, 1 - phi(z)'],
          tests: [
            { call: 'tuple(round(v, 4) for v in z_test(200, 2000, 250, 2000))', expect: '(2.502, 0.0124)' },
          ],
          explain: 'Each line needs the one before it: rates → pooled rate → standard error → z → p-value. `pa * na` is just `xa`, so the pooled rate is total conversions over total users.',
        },
        {
          type: 'choice',
          prompt: 'Treatment did **worse** here (z is negative). What does this print?',
          code: py`
            import math

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            z = -1.96
            print(round(2 * (1 - phi(abs(z))), 3))
          `,
          options: ['0.05', '1.95', '0.025', '0.975'],
          answer: 0,
          checkOutput: true,
          explain: 'With `abs`, a z of −1.96 is just as extreme as +1.96: p = 2 × 0.025 = 0.05. Without `abs` you\'d get 2 × (1 − 0.025) = 1.95, an impossible "probability". A two-sided test catches effects in both directions, including harm.',
        },
        {
          type: 'code',
          title: 'z-test function',
          prompt: md`
            Write \`z_test(xa, na, xb, nb)\`: \`xa\` conversions out of \`na\` users in control, \`xb\` out of \`nb\` in treatment.

            Return a tuple \`(z, p)\`, both rounded to 4, using the **pooled** standard error and a **two-sided** p-value. z is positive when treatment converts better. Use \`math\` only (Φ via \`math.erf\`).

            \`\`\`python
            z_test(200, 2000, 250, 2000)  # (2.502, 0.0124)
            \`\`\`
          `,
          setup: AB_SETUP + '\ng = ab.groupby("group")["converted"]\nxa, xb = g.sum()["control"], g.sum()["treatment"]\nna, nb = g.size()["control"], g.size()["treatment"]',
          starter: 'import math\n\ndef z_test(xa, na, xb, nb):\n    pass\n',
          solution: py`
            import math

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            def z_test(xa, na, xb, nb):
                pa, pb = xa / na, xb / nb
                p = (xa + xb) / (na + nb)
                se = math.sqrt(p * (1 - p)
                               * (1 / na + 1 / nb))
                z = (pb - pa) / se
                pv = 2 * (1 - phi(abs(z)))
                return round(z, 4), round(pv, 4)
          `,
          tests: [
            { call: 'z_test(200, 2000, 250, 2000)', expect: '(2.502, 0.0124)' },
            { call: 'z_test(250, 2000, 200, 2000)', expect: '(-2.502, 0.0124)', name: 'treatment worse' },
            { call: 'z_test(50, 500, 50, 500)', expect: '(0.0, 1.0)', hidden: true },
            { call: 'z_test(int(xa), int(na), int(xb), int(nb))', hidden: true, name: 'data/ab_test.csv' },
            { call: 'z_test(30, 1000, 45, 1100)', hidden: true },
          ],
          hints: [
            'Pooled rate: `p = (xa + xb) / (na + nb)`.',
            'p-value: `2 * (1 - phi(abs(z)))` with `phi(z) = 0.5 * (1 + math.erf(z / math.sqrt(2)))`.',
          ],
          wrong: [
            py`
              import math

              def phi(z):
                  return 0.5 * (1 + math.erf(z / math.sqrt(2)))

              def z_test(xa, na, xb, nb):
                  pa, pb = xa / na, xb / nb
                  se = math.sqrt(pa * (1 - pa) / na
                                 + pb * (1 - pb) / nb)
                  z = (pb - pa) / se
                  pv = 2 * (1 - phi(abs(z)))
                  return round(z, 4), round(pv, 4)
            `,
            py`
              import math

              def phi(z):
                  return 0.5 * (1 + math.erf(z / math.sqrt(2)))

              def z_test(xa, na, xb, nb):
                  pa, pb = xa / na, xb / nb
                  p = (xa + xb) / (na + nb)
                  se = math.sqrt(p * (1 - p)
                                 * (1 / na + 1 / nb))
                  z = (pb - pa) / se
                  return round(z, 4), round(1 - phi(z), 4)
            `,
            py`
              import math

              def phi(z):
                  return 0.5 * (1 + math.erf(z / math.sqrt(2)))

              def z_test(xa, na, xb, nb):
                  pa, pb = xa / na, xb / nb
                  p = (xa + xb) / (na + nb)
                  se = math.sqrt(p * (1 - p)
                                 * (1 / na + 1 / nb))
                  z = (pb - pa) / se
                  pv = 2 * (1 - phi(z))
                  return round(z, 4), round(pv, 4)
            `,
          ],
          explain: 'Under H₀ both groups share one true rate, so the test pools them for the SE. The one-sided p-value is half the two-sided one and only looks for improvements, so it "finds" significance twice as easily. Pre-register two-sided tests unless you truly don\'t care about harm. It\'s O(1) given the counts, and on a billion rows the expensive part is just the `GROUP BY` that produces them.',
        },
        {
          type: 'learn',
          title: 'Confidence interval for the lift',
          body: md`
            A p-value says **whether** there's an effect, a confidence interval says **how big** it plausibly is.

            For d = p_B − p_A use the **unpooled** SE (we no longer assume H₀):

            SE = √(p_A(1−p_A)/n_A + p_B(1−p_B)/n_B), 95 % CI = d ± 1.96·SE

            If the CI excludes 0, the lift is significant at 5 % (it nearly always agrees with the z-test). Meaning: this procedure captures the true lift in 95 % of experiments, so values inside are plausible effect sizes.
          `,
          code: py`
            import math
            xa, na, xb, nb = 200, 2000, 250, 2000
            pa, pb = xa / na, xb / nb
            se = math.sqrt(pa * (1 - pa) / na
                           + pb * (1 - pb) / nb)
            d = pb - pa
            lo, hi = d - 1.96 * se, d + 1.96 * se
            print(f"lift {d:.2%}")
            print(f"95% CI [{lo:.2%}, {hi:.2%}]")
          `,
        },
        {
          type: 'choice',
          prompt: 'Your A/B test gives **p = 0.03**. Which statement is correct?',
          options: [
            'Data this extreme: 3 % chance if H₀ true',
            'There is a 3 % chance H₀ is true',
            'There is a 97 % chance B is better',
            'The lift is 3 percentage points',
          ],
          answer: 0,
          explain: 'A p-value is computed **assuming** H₀: P(data at least this extreme | H₀). It is not P(H₀ | data): that would need a prior (Bayesian analysis). It says nothing about the size of the lift either: use the confidence interval for that.',
        },
        {
          type: 'code',
          title: 'Confidence interval',
          prompt: md`
            Write \`diff_ci(xa, na, xb, nb, z=1.96)\` that returns the confidence interval for p_B − p_A as a tuple \`(low, high)\`, both rounded to 4, using the **unpooled** standard error.

            \`\`\`python
            diff_ci(200, 2000, 250, 2000)  # (0.0054, 0.0446)
            \`\`\`
          `,
          setup: 'import math',
          starter: 'import math\n\ndef diff_ci(xa, na, xb, nb, z=1.96):\n    pass\n',
          solution: py`
            import math

            def diff_ci(xa, na, xb, nb, z=1.96):
                pa, pb = xa / na, xb / nb
                se = math.sqrt(pa * (1 - pa) / na
                               + pb * (1 - pb) / nb)
                d = pb - pa
                return (round(d - z * se, 4),
                        round(d + z * se, 4))
          `,
          tests: [
            { call: 'diff_ci(200, 2000, 250, 2000)', expect: '(0.0054, 0.0446)' },
            { call: 'diff_ci(120, 1000, 150, 1000)', expect: '(0.0001, 0.0599)' },
            { call: 'diff_ci(120, 1000, 150, 1000, z=2.576)', hidden: true, name: '99 % interval' },
            { call: 'diff_ci(40, 300, 25, 350)', hidden: true },
          ],
          hints: [
            'SE = √(pa(1−pa)/na + pb(1−pb)/nb).',
            'Return `(d - z * se, d + z * se)`, each rounded.',
          ],
          wrong: [
            py`
              import math

              def diff_ci(xa, na, xb, nb, z=1.96):
                  pa, pb = xa / na, xb / nb
                  p = (xa + xb) / (na + nb)
                  se = math.sqrt(p * (1 - p)
                                 * (1 / na + 1 / nb))
                  d = pb - pa
                  return (round(d - z * se, 4),
                          round(d + z * se, 4))
            `,
            py`
              import math

              def diff_ci(xa, na, xb, nb, z=1.96):
                  pa, pb = xa / na, xb / nb
                  se = math.sqrt(pa * (1 - pa) / na
                                 + pb * (1 - pb) / nb)
                  d = pb - pa
                  return (round(d - 1.96 * se, 4),
                          round(d + 1.96 * se, 4))
            `,
          ],
          explain: 'The second example barely excludes 0 (0.0001): technically significant, but plausible lifts range from ~0 to 6 pp. That\'s a very different story from a tight interval. Report the CI next to the p-value so decision-makers see both the *existence* and the *range* of the effect.',
        },
        {
          type: 'learn',
          title: 'Pitfalls that sink real experiments',
          body: md`
            - **Significant ≠ important.** With 10 M users, a +0.02 pp lift can have p < 0.001 and still not pay for its engineering cost. Agree on the minimum lift worth shipping *before* the test.
            - **Peeking**: checking every day and stopping at the first p < 0.05 inflates the false-positive rate far above 5 %. Fix the sample size up front (or use sequential methods built for it).
            - **Many metrics or segments**: test 20 independent things at α = 0.05 and you expect one false positive. **Bonferroni**: compare each p-value with α / m.
          `,
        },
        {
          type: 'choice',
          prompt: 'A PM checks the dashboard every morning and stops the test on the **first** day p < 0.05. What\'s the problem?',
          options: [
            'False positives end up well above 5 %',
            'Nothing: p < 0.05 is p < 0.05',
            'It makes the test slower to finish',
            'The groups become unbalanced',
          ],
          answer: 0,
          explain: 'Each daily look is another chance for noise to cross 0.05. With 20+ looks, an A/A test (no real difference) "wins" roughly a quarter of the time or more. The 5 % guarantee only holds for one look at a pre-planned sample size.',
        },
        {
          type: 'choice',
          prompt: 'You test a new feed on **20** independent metrics and one shows p = 0.04. With a Bonferroni correction (α = 0.05), what threshold should each p-value beat?',
          options: ['0.0025', '0.05', '0.01', '0.04'],
          answer: 0,
          explain: '0.05 / 20 = 0.0025, so p = 0.04 is not significant after correction. Without correction, P(at least one false positive) = 1 − 0.95²⁰ ≈ 64 %. Pick one **primary** metric in advance, and treat the others as guardrails or exploration.',
        },
        {
          type: 'code',
          title: 'The experiment readout',
          prompt: md`
            Write \`ab_report(df, alpha=0.05)\` for A/B data (columns \`group\`, \`converted\`, …). Return a dict:

            | key | value |
            |---|---|
            | \`rate_a\`, \`rate_b\` | control / treatment conversion rate |
            | \`abs_lift\` | rate_b − rate_a |
            | \`rel_lift\` | abs_lift / rate_a |
            | \`z\`, \`p\` | pooled two-proportion z-test, two-sided |
            | \`significant\` | \`p < alpha\` (a bool) |

            Round every number to 4 (compute from **unrounded** values).
          `,
          setup: AB_SETUP,
          starter: 'import math\n\ndef ab_report(df, alpha=0.05):\n    pass\n',
          solution: py`
            import math

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            def ab_report(df, alpha=0.05):
                g = df.groupby("group")["converted"]
                x, n = g.sum(), g.size()
                xa, na = x["control"], n["control"]
                xb, nb = x["treatment"], n["treatment"]
                pa, pb = xa / na, xb / nb
                p = (xa + xb) / (na + nb)
                se = math.sqrt(p * (1 - p)
                               * (1 / na + 1 / nb))
                z = (pb - pa) / se
                pv = 2 * (1 - phi(abs(z)))
                r = lambda v: round(float(v), 4)
                return {
                    "rate_a": r(pa), "rate_b": r(pb),
                    "abs_lift": r(pb - pa),
                    "rel_lift": r((pb - pa) / pa),
                    "z": r(z), "p": r(pv),
                    "significant": bool(pv < alpha),
                }
          `,
          tests: [
            {
              call: 'ab_report(make_ab(200, 2000, 250, 2000))',
              expect: "{'rate_a': 0.1, 'rate_b': 0.125, 'abs_lift': 0.025, 'rel_lift': 0.25, 'z': 2.502, 'p': 0.0124, 'significant': True}",
              name: '10 % vs 12.5 % with 2,000 users each',
            },
            { call: 'ab_report(ab)', name: 'data/ab_test.csv' },
            { call: 'ab_report(ab[ab["device"] == "mobile"])', name: 'mobile users only' },
            { call: 'ab_report(ab[ab["device"] == "desktop"])', hidden: true },
            { call: 'ab_report(ab, alpha=0.01)', hidden: true, name: 'stricter alpha' },
          ],
          hints: [
            '`g = df.groupby("group")["converted"]`, then `g.sum()` and `g.size()` give x and n per group.',
            'Reuse your z-test, and remember `abs(z)` in the two-sided p-value.',
          ],
          wrong: [
            py`
              import math

              def phi(z):
                  return 0.5 * (1 + math.erf(z / math.sqrt(2)))

              def ab_report(df, alpha=0.05):
                  g = df.groupby("group")["converted"]
                  x, n = g.sum(), g.size()
                  xa, na = x["control"], n["control"]
                  xb, nb = x["treatment"], n["treatment"]
                  pa, pb = xa / na, xb / nb
                  p = (xa + xb) / (na + nb)
                  se = math.sqrt(p * (1 - p)
                                 * (1 / na + 1 / nb))
                  z = (pb - pa) / se
                  pv = 1 - phi(z)
                  return {
                      "rate_a": round(float(pa), 4),
                      "rate_b": round(float(pb), 4),
                      "abs_lift": round(float(pb - pa), 4),
                      "rel_lift": round(float((pb - pa) / pa), 4),
                      "z": round(float(z), 4),
                      "p": round(float(pv), 4),
                      "significant": bool(pv < alpha),
                  }
            `,
            py`
              import math

              def phi(z):
                  return 0.5 * (1 + math.erf(z / math.sqrt(2)))

              def ab_report(df, alpha=0.05):
                  g = df.groupby("group")["converted"]
                  x, n = g.sum(), g.size()
                  xa, na = x["control"], n["control"]
                  xb, nb = x["treatment"], n["treatment"]
                  pa, pb = xa / na, xb / nb
                  p = (xa + xb) / (na + nb)
                  se = math.sqrt(p * (1 - p)
                                 * (1 / na + 1 / nb))
                  z = (pb - pa) / se
                  pv = 2 * (1 - phi(abs(z)))
                  return {
                      "rate_a": round(float(pa), 4),
                      "rate_b": round(float(pb), 4),
                      "abs_lift": round(float(pb - pa), 4),
                      "rel_lift": round(float((pb - pa) / pb), 4),
                      "z": round(float(z), 4),
                      "p": round(float(pv), 4),
                      "significant": bool(pv < 0.05),
                  }
            `,
          ],
          explain: 'On the real data the overall lift is significant, yet the mobile-only test isn\'t, though mobile still shows a positive lift. "Not significant" ≠ "no effect": the mobile segment has fewer users and a smaller lift, so the test has less power. Deciding to ship only on desktop based on this would be slicing after the fact, a multiple-testing trap. Relative lift is always relative to the **baseline** (control).',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u14-l5',
      title: 'Product Analytics',
      summary: 'Funnels, cohort retention and DAU/MAU, the metrics every product team lives by.',
      steps: [
        {
          type: 'learn',
          title: 'Funnels',
          body: md`
            A **funnel** counts **unique users** reaching each step: page_view → search → add_to_cart → checkout → purchase. Two ratios matter:

            - **% of top**: users at a step / users at the first step
            - **step conversion**: users at a step / users at the previous step. The biggest drop shows where to work.

            Count users with \`nunique()\`, not events: one user can view ten pages.
          `,
          code: py`
            import pandas as pd
            ev = pd.read_csv("data/events.csv")
            steps = ["page_view", "search", "add_to_cart",
                     "checkout", "purchase"]
            g = ev.groupby("event")["user_id"]
            users = g.nunique().reindex(steps)
            print(users)
            print((users / users.shift()).round(3))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            f = pd.Series([1000, 600, 300, 150],
                          index=["visit", "cart",
                                 "checkout", "buy"])
            conv = (f / f.shift()).round(2)
            print(conv.tolist()[1:])
          `,
          options: ['[0.6, 0.5, 0.5]', '[0.6, 0.3, 0.15]', '[0.4, 0.5, 0.5]', '[1.67, 2.0, 2.0]'],
          answer: 0,
          checkOutput: true,
          explain: '`f.shift()` moves each value down one row, so each step is divided by the step **before** it: 600/1000, 300/600, 150/300. `[0.6, 0.3, 0.15]` would be the % of top.',
        },
        {
          type: 'blanks',
          prompt: 'Compute the share of visitors who purchased, counting **people**, not events.',
          code: py`
            import pandas as pd
            ev = pd.read_csv("data/events.csv")
            users = ev.groupby("event")["user_id"].___()
            rate = users["purchase"] / users["___"]
            print(round(rate, 3))
          `,
          bank: ['nunique', 'page_view', 'count', 'size', 'search', 'checkout'],
          answer: ['nunique', 'page_view'],
          tests: [{ stdout: '0.426\n' }],
          explain: 'Every session starts with a page_view, so its unique users are the top of the funnel. `count` would count events: 941 page views but only 258 people, which would make the rate look three times worse.',
        },
        {
          type: 'code',
          title: 'Build a funnel',
          prompt: md`
            Write \`funnel(df, steps)\` for an events DataFrame (\`user_id\`, \`event\`, …) and a list of step names in funnel order.

            Return a DataFrame indexed by \`steps\` (in that order) with columns:
            - \`users\`: unique users with that event
            - \`pct_of_top\`: users / users at the first step, rounded to 3
            - \`step_conv\`: users / users at the previous step, rounded to 3 (the first step is \`1.0\`)
          `,
          setup: py`
            import pandas as pd
            ev = pd.read_csv("data/events.csv")
            STEPS = ["page_view", "search", "add_to_cart",
                     "checkout", "purchase"]
            tiny = pd.DataFrame({
                "user_id": [1, 1, 1, 1, 2, 2, 3, 4, 4],
                "event": ["page_view", "page_view", "search",
                          "add_to_cart", "page_view", "search",
                          "page_view", "page_view", "page_view"],
            })
          `,
          starter: 'import pandas as pd\n\ndef funnel(df, steps):\n    pass\n',
          solution: py`
            import pandas as pd

            def funnel(df, steps):
                u = df.groupby("event")["user_id"].nunique()
                u = u.reindex(steps, fill_value=0)
                out = pd.DataFrame({"users": u})
                out["pct_of_top"] = (u / u.iloc[0]).round(3)
                step = u / u.shift()
                step.iloc[0] = 1.0
                out["step_conv"] = step.round(3)
                return out
          `,
          tests: [
            {
              call: 'funnel(tiny, ["page_view", "search", "add_to_cart"])',
              expect: 'pd.DataFrame({"users": [4, 2, 1], "pct_of_top": [1.0, 0.5, 0.25], "step_conv": [1.0, 0.5, 0.5]}, index=["page_view", "search", "add_to_cart"])',
              name: 'tiny: 4 → 2 → 1 users',
            },
            { call: 'funnel(ev, STEPS)', name: 'data/events.csv' },
            { call: 'funnel(ev[ev["device"] == "tablet"], STEPS)', hidden: true },
            { call: 'funnel(ev, ["page_view", "add_to_cart", "purchase"])', hidden: true },
          ],
          hints: [
            '`df.groupby("event")["user_id"].nunique().reindex(steps)` puts the counts in funnel order.',
            '`u / u.shift()` divides each step by the previous one. Set the first value to 1.0.',
          ],
          wrong: [
            py`
              import pandas as pd

              def funnel(df, steps):
                  u = df.groupby("event")["user_id"].count()
                  u = u.reindex(steps, fill_value=0)
                  out = pd.DataFrame({"users": u})
                  out["pct_of_top"] = (u / u.iloc[0]).round(3)
                  step = u / u.shift()
                  step.iloc[0] = 1.0
                  out["step_conv"] = step.round(3)
                  return out
            `,
            py`
              import pandas as pd

              def funnel(df, steps):
                  u = df.groupby("event")["user_id"].nunique()
                  u = u.reindex(steps, fill_value=0)
                  out = pd.DataFrame({"users": u})
                  out["pct_of_top"] = (u / u.iloc[0]).round(3)
                  out["step_conv"] = (u / u.iloc[0]).round(3)
                  return out
            `,
          ],
          explain: 'This "loose" funnel counts anyone who ever did each event. A **strict** funnel also requires the steps to happen in order (and often within one session or time window), which you get by comparing per-user first timestamps. In SQL this is one `COUNT(DISTINCT user_id)` per step, which scales to billions of events.',
        },
        {
          type: 'code',
          title: 'Funnel by device',
          prompt: md`
            Write \`device_funnel(df, steps)\`. Return a DataFrame with one row per **device** (sorted) and one column per step **in funnel order**. Each value is the share of that device's first-step users who reached the step (unique users), rounded to 3. The first column is therefore all \`1.0\`.

            A user who used two devices counts once on each device.
          `,
          setup: py`
            import pandas as pd
            ev = pd.read_csv("data/events.csv")
            STEPS = ["page_view", "search", "add_to_cart",
                     "checkout", "purchase"]
          `,
          starter: 'def device_funnel(df, steps):\n    pass\n',
          solution: py`
            def device_funnel(df, steps):
                keys = ["device", "event"]
                n = df.groupby(keys)["user_id"].nunique()
                t = n.unstack(fill_value=0)[steps]
                top = t[steps[0]]
                return t.div(top, axis=0).round(3)
          `,
          tests: [
            { assert: 'list(device_funnel(ev, STEPS).columns) == STEPS', name: 'columns are in funnel order' },
            { call: 'device_funnel(ev, STEPS)', name: 'data/events.csv' },
            { call: 'device_funnel(ev, ["page_view", "checkout", "purchase"])', hidden: true },
          ],
          hints: [
            'Group by both columns: `df.groupby(["device", "event"])["user_id"].nunique()`, then `.unstack()` makes events the columns.',
            'Reorder with `t[steps]`, then `t.div(t[steps[0]], axis=0)` divides each row by its own first step.',
          ],
          wrong: [
            py`
              def device_funnel(df, steps):
                  g = df.groupby(["device", "event"])["user_id"]
                  t = g.nunique().unstack(fill_value=0)
                  return t.div(t[steps[0]], axis=0).round(3)
            `,
            py`
              def device_funnel(df, steps):
                  g = df.groupby(["device", "event"])["user_id"]
                  t = g.nunique().unstack(fill_value=0)
                  t = t[steps]
                  return (t / t[steps[0]].sum()).round(3)
            `,
          ],
          explain: '`unstack()` sorts the event columns alphabetically (add_to_cart, checkout, page_view, …), which makes a funnel unreadable, so reorder explicitly. Dividing each row by its own top gives a fair comparison across devices with very different traffic. Desktop converts noticeably better here. Is that the device, or the kind of user who shops on desktop? (Correlation ≠ causation again.)',
        },
        {
          type: 'learn',
          title: 'Cohorts and retention',
          body: md`
            A **cohort** groups users by when they started, e.g. the month of their first order. **Retention in month k** = the share of the cohort's users who ordered again k months after their first month.

            Cohort tables separate "are newer users better?" from "is the user base just growing?".

            Month-index trick: **year × 12 + month**. Differences then count months, even across years.
          `,
          code: py`
            import pandas as pd
            o = pd.read_csv("data/orders.csv",
                            parse_dates=["order_date"])
            d = o["order_date"]
            o["m"] = d.dt.year * 12 + d.dt.month
            g = o.groupby("user_id")["m"]
            o["cohort"] = g.transform("min")
            o["k"] = o["m"] - o["cohort"]
            t = o.pivot_table(index="cohort", columns="k",
                              values="user_id",
                              aggfunc="nunique")
            print(t.iloc[:3, :4])
          `,
        },
        {
          type: 'order',
          prompt: '`o` has a `user_id` column and a month number `m`. Arrange the lines to print how many users ordered again in the month right after their first month.',
          setup: py`
            import pandas as pd
            o = pd.read_csv("data/orders.csv",
                            parse_dates=["order_date"])
            o["m"] = o["order_date"].dt.month
          `,
          lines: [
            'first = o.groupby("user_id")["m"].min()',
            'o["cohort"] = o["user_id"].map(first)',
            'o["k"] = o["m"] - o["cohort"]',
            'm1 = o[o["k"] == 1]',
            'print(m1["user_id"].nunique())',
          ],
          distractors: ['o["k"] = o["cohort"] - o["m"]'],
          tests: [{ stdout: '57\n' }],
          explain: '`groupby().min()` gives one first month per user. `.map(first)` attaches it to every order of that user. Then k = 0 is the first month, k = 1 the next. `nunique` again: a user with three orders that month still counts once.',
        },
        {
          type: 'code',
          title: 'Retention table',
          prompt: md`
            Write \`retention(orders, max_k=3)\` for an orders DataFrame (\`order_date\` as "YYYY-MM-DD" text).

            - Use **completed** orders only. A user's cohort is the month of their first completed order.
            - Return a DataFrame: index = cohort as \`"YYYY-MM"\` strings (sorted), columns = the ints \`0 … max_k\`, value = share of the cohort's users with a completed order k months after the cohort month, rounded to 3. Column 0 is 1.0.
            - A cohort with no orders in month k gets \`0.0\`, **but** cells after the last month that appears in \`orders\` (any status) haven't happened yet: make them \`NaN\`.
          `,
          setup: py`
            import pandas as pd
            orders = pd.read_csv("data/orders.csv")
            nan = float("nan")
            tiny = pd.DataFrame({
                "user_id": [1, 1, 2, 2, 3, 3, 4],
                "order_date": ["2025-01-05", "2025-02-10",
                               "2025-01-20", "2025-03-01",
                               "2025-02-14", "2025-02-20",
                               "2025-03-03"],
                "status": ["completed"] * 5
                          + ["cancelled"] * 2,
            })
          `,
          starter: 'import pandas as pd\n\ndef retention(orders, max_k=3):\n    pass\n',
          solution: py`
            import pandas as pd

            def months(dates):
                d = pd.to_datetime(dates)
                return d.dt.year * 12 + d.dt.month - 1

            def retention(orders, max_k=3):
                last = months(orders["order_date"]).max()
                ok = orders["status"] == "completed"
                o = orders[ok].copy()
                o["m"] = months(o["order_date"])
                g = o.groupby("user_id")["m"]
                o["c"] = g.transform("min")
                o["k"] = o["m"] - o["c"]
                t = o.pivot_table(index="c", columns="k",
                                  values="user_id",
                                  aggfunc="nunique")
                t = t.reindex(columns=range(max_k + 1))
                t = t.fillna(0)
                t = t.div(t[0], axis=0)
                for k in t.columns:
                    t.loc[t.index + k > last, k] = None
                t.index = [f"{c // 12}-{c % 12 + 1:02d}"
                           for c in t.index]
                return t.round(3)
          `,
          tests: [
            {
              call: 'retention(tiny)',
              expect: 'pd.DataFrame({0: [1.0, 1.0], 1: [0.5, 0.0], 2: [0.5, nan], 3: [nan, nan]}, index=["2025-01", "2025-02"])',
              name: 'tiny: 2 cohorts, data ends in March',
            },
            { call: 'retention(orders)', name: 'data/orders.csv, max_k=3' },
            { call: 'retention(orders, max_k=6)', hidden: true },
            { call: 'retention(orders[orders["country"] == "DE"], 2)', hidden: true },
          ],
          hints: [
            'Turn each date into a month number: `d.dt.year * 12 + d.dt.month - 1`. Then the cohort is the per-user `min` (via `transform`), and k = m − cohort.',
            '`pivot_table(index=cohort, columns=k, values="user_id", aggfunc="nunique")`, then `reindex(columns=range(max_k + 1))`, `fillna(0)` and divide by column 0.',
            'A cell is in the future when `cohort + k > last`. Set those to NaN before turning the index into "YYYY-MM" labels.',
          ],
          wrong: [
            py`
              import pandas as pd

              def months(dates):
                  d = pd.to_datetime(dates)
                  return d.dt.year * 12 + d.dt.month - 1

              def retention(orders, max_k=3):
                  ok = orders["status"] == "completed"
                  o = orders[ok].copy()
                  o["m"] = months(o["order_date"])
                  g = o.groupby("user_id")["m"]
                  o["c"] = g.transform("min")
                  o["k"] = o["m"] - o["c"]
                  t = o.pivot_table(index="c", columns="k",
                                    values="user_id",
                                    aggfunc="nunique")
                  t = t.reindex(columns=range(max_k + 1))
                  t = t.fillna(0)
                  t = t.div(t[0], axis=0)
                  t.index = [f"{c // 12}-{c % 12 + 1:02d}"
                             for c in t.index]
                  return t.round(3)
            `,
            py`
              import pandas as pd

              def months(dates):
                  d = pd.to_datetime(dates)
                  return d.dt.year * 12 + d.dt.month - 1

              def retention(orders, max_k=3):
                  last = months(orders["order_date"]).max()
                  o = orders.copy()
                  o["m"] = months(o["order_date"])
                  g = o.groupby("user_id")["m"]
                  o["c"] = g.transform("min")
                  o["k"] = o["m"] - o["c"]
                  t = o.pivot_table(index="c", columns="k",
                                    values="user_id",
                                    aggfunc="nunique")
                  t = t.reindex(columns=range(max_k + 1))
                  t = t.fillna(0)
                  t = t.div(t[0], axis=0)
                  for k in t.columns:
                      t.loc[t.index + k > last, k] = None
                  t.index = [f"{c // 12}-{c % 12 + 1:02d}"
                             for c in t.index]
                  return t.round(3)
            `,
          ],
          explain: 'Writing 0 into future cells is a classic dashboard bug: the newest cohorts look like they "churned to zero" when their months just haven\'t happened yet (**right-censoring**). Retention in this dataset *rises* in late months because of the Nov/Dec shopping season, a calendar effect showing up as an age effect. Cohort tables expose exactly this kind of confusion.',
        },
        {
          type: 'learn',
          title: 'DAU, MAU and stickiness',
          body: md`
            - **DAU**: unique users active on a day
            - **MAU**: unique users active in the month (or the trailing 30 days)
            - **Stickiness = average DAU / MAU**. 0.2 means the typical monthly user shows up on about 6 days a month (0.2 × 30).

            Messaging apps aim for 0.5+, a tax app is happy at 0.02. Count *users*, not events, and agree on what "active" means and on the time zone.
          `,
          code: py`
            import pandas as pd
            ev = pd.read_csv("data/events.csv")
            ev["day"] = ev["ts"].str[:10]
            g = ev.groupby("day")["user_id"]
            dau = g.nunique()
            mau = ev["user_id"].nunique()
            print(len(dau), "days")
            print(round(dau.mean(), 1), mau)
            print(round(dau.mean() / mau, 3))
          `,
        },
        {
          type: 'choice',
          prompt: 'Average DAU is 12,000 and MAU is 60,000. Which statement is true?',
          options: [
            'Users average ~6 active days a month',
            'Stickiness is 5',
            'Each user is active 12 days a month',
            '20 % of users are active every day',
          ],
          answer: 0,
          explain: 'Stickiness = 12,000 / 60,000 = 0.2, and 0.2 × 30 ≈ 6 active days per monthly user **on average**. It doesn\'t say who: 20 % daily users and 80 % one-time visitors could give a similar number. Look at the distribution of active days per user too.',
        },
        {
          type: 'code',
          title: 'Device scorecard',
          prompt: md`
            Write \`device_metrics(ev)\` for an events DataFrame (\`user_id\`, \`ts\`, \`event\`, \`device\`). The day is the first 10 characters of \`ts\`. Return a DataFrame indexed by device (sorted) with columns:

            - \`mau\`: unique users on that device over the whole data
            - \`avg_dau\`: mean daily unique users, averaged over **every day that appears in \`ev\`**. A device with no users on some day counts **0** for that day. Rounded to 2.
            - \`stickiness\`: avg_dau / mau (from unrounded values), rounded to 3
            - \`buy_rate\`: unique purchasers / mau, rounded to 3
          `,
          setup: py`
            import pandas as pd
            ev = pd.read_csv("data/events.csv")
          `,
          starter: 'import pandas as pd\n\ndef device_metrics(ev):\n    pass\n',
          solution: py`
            import pandas as pd

            def device_metrics(ev):
                ev = ev.assign(day=ev["ts"].str[:10])
                u = ev.groupby("device")["user_id"]
                mau = u.nunique()
                g = ev.groupby(["device", "day"])["user_id"]
                daily = g.nunique().unstack(fill_value=0)
                dau = daily.mean(axis=1)
                buy = ev[ev["event"] == "purchase"]
                b = buy.groupby("device")["user_id"]
                b = b.nunique().reindex(mau.index,
                                        fill_value=0)
                return pd.DataFrame({
                    "mau": mau,
                    "avg_dau": dau.round(2),
                    "stickiness": (dau / mau).round(3),
                    "buy_rate": (b / mau).round(3),
                })
          `,
          tests: [
            { call: 'device_metrics(ev)', name: 'data/events.csv' },
            { call: 'device_metrics(ev[ev["ts"] < "2025-11-16"])', hidden: true, name: 'first half of November' },
          ],
          hints: [
            'Make the day column with `ev["ts"].str[:10]`.',
            '`groupby(["device", "day"])["user_id"].nunique().unstack(fill_value=0)` gives a device × day table with 0 for missing days. Its row means are the average DAU.',
          ],
          wrong: [
            py`
              import pandas as pd

              def device_metrics(ev):
                  ev = ev.assign(day=ev["ts"].str[:10])
                  mau = ev.groupby("device")["user_id"].nunique()
                  g = ev.groupby(["device", "day"])["user_id"]
                  dau = g.nunique().groupby("device").mean()
                  buy = ev[ev["event"] == "purchase"]
                  b = buy.groupby("device")["user_id"].nunique()
                  return pd.DataFrame({
                      "mau": mau,
                      "avg_dau": dau.round(2),
                      "stickiness": (dau / mau).round(3),
                      "buy_rate": (b / mau).round(3),
                  })
            `,
            py`
              import pandas as pd

              def device_metrics(ev):
                  ev = ev.assign(day=ev["ts"].str[:10])
                  mau = ev.groupby("device")["user_id"].nunique()
                  g = ev.groupby(["device", "day"])["user_id"]
                  daily = g.size().unstack(fill_value=0)
                  dau = daily.mean(axis=1)
                  buy = ev[ev["event"] == "purchase"]
                  b = buy.groupby("device")["user_id"].nunique()
                  return pd.DataFrame({
                      "mau": mau,
                      "avg_dau": dau.round(2),
                      "stickiness": (dau / mau).round(3),
                      "buy_rate": (b / mau).round(3),
                  })
            `,
          ],
          explain: 'Tablet has days without any activity. Averaging only the days that exist inflates its DAU, a silent bias that hits every small segment. Missing rows in a `groupby` mean "zero", and you must put them back (`unstack(fill_value=0)`, `reindex`, or a calendar table in SQL). Also note `size()` counts events, not users.',
        },
        {
          type: 'choice',
          prompt: 'Overnight, add_to_cart → checkout conversion drops from 50 % to 25 % on **every** device, right after an app release. What do you check first?',
          options: [
            'Whether the release broke event logging',
            'Launch an A/B test of the checkout',
            'Wait a month for more data',
            'Compute the p-value of the drop',
          ],
          answer: 0,
          explain: 'A sudden step change across all segments that coincides with a release is usually **instrumentation**: a renamed event, a duplicated add_to_cart, a lost checkout call. Validate the data pipeline before analysing user behaviour. Real behaviour changes are rarely that clean.',
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u14-l6',
      title: 'Simulation & Bootstrap',
      summary: 'Seeded randomness, bootstrap CIs, permutation tests and why small tests are noisy.',
      steps: [
        {
          type: 'learn',
          title: 'Seeds and simulation',
          body: md`
            Simulation answers probability questions you can't solve on paper (and checks the ones you can). Always **seed** the random generator so results are reproducible:

            - \`random.seed(42)\` for Python's \`random\` module
            - \`rng = np.random.default_rng(42)\` for numpy (the modern API: pass \`rng\` around instead of using global state)

            Same seed → same numbers → same answer on every run. Vectorize: one call that draws 100,000 numbers beats 100,000 calls.
          `,
          code: py`
            import numpy as np
            rng = np.random.default_rng(42)
            rolls = rng.integers(1, 7, size=(100_000, 2))
            p = np.mean(rolls.sum(axis=1) == 7)
            print(round(p, 3), round(6 / 36, 3))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import random
            random.seed(7)
            a = [random.randint(1, 6) for _ in range(5)]
            random.seed(7)
            b = [random.randint(1, 6) for _ in range(5)]
            print(a == b)
          `,
          options: ['True', 'False', 'It changes from run to run', 'ValueError: seed already set'],
          answer: 0,
          checkOutput: true,
          explain: 'Re-seeding resets the generator, so the same sequence comes out again. That\'s what makes simulations, train/test splits and bootstrap results reproducible (and gradable!).',
        },
        {
          type: 'code',
          title: 'At least one six',
          prompt: md`
            A 17th-century gambling puzzle: roll **4 dice**. What's the chance of **at least one six**?

            Write \`p_six(trials, seed=0)\` that simulates \`trials\` rounds of 4 dice with \`np.random.default_rng(seed)\` and returns the fraction of rounds with at least one six (a float). Vectorize it: the tests use 50,000 trials.

            The exact answer is 1 − (5/6)⁴ ≈ 0.5177.
          `,
          setup: 'import numpy as np',
          starter: 'import numpy as np\n\ndef p_six(trials, seed=0):\n    pass\n',
          solution: py`
            import numpy as np

            def p_six(trials, seed=0):
                rng = np.random.default_rng(seed)
                rolls = rng.integers(1, 7, size=(trials, 4))
                hit = (rolls == 6).any(axis=1)
                return float(hit.mean())
          `,
          tests: [
            { assert: 'abs(p_six(50_000) - (1 - (5 / 6) ** 4)) < 0.01', name: 'close to 0.5177 with 50,000 trials' },
            { assert: 'p_six(5000, seed=1) == p_six(5000, seed=1)', name: 'same seed → same result' },
            { assert: 'p_six(5000, seed=1) != p_six(5000, seed=2)', name: 'uses the seed argument', hidden: true },
            { assert: 'isinstance(p_six(100), float)', name: 'returns a float', hidden: true },
            { assert: 'abs(p_six(50_000, seed=9) - 0.5177) < 0.01', hidden: true },
          ],
          hints: [
            '`rng.integers(1, 7, size=(trials, 4))` gives a trials × 4 array of dice (7 is exclusive).',
            '`(rolls == 6).any(axis=1)` is True for rows with at least one six. Its `.mean()` is the fraction.',
          ],
          wrong: [
            py`
              import numpy as np

              def p_six(trials, seed=0):
                  rng = np.random.default_rng(seed)
                  rolls = rng.integers(1, 7, size=(trials, 4))
                  hit = (rolls == 6).sum(axis=1) == 1
                  return float(hit.mean())
            `,
            py`
              import numpy as np

              def p_six(trials, seed=0):
                  rng = np.random.default_rng(0)
                  rolls = rng.integers(1, 7, size=(trials, 4))
                  return float((rolls == 6).any(axis=1).mean())
            `,
            py`
              import numpy as np

              def p_six(trials, seed=0):
                  rng = np.random.default_rng(seed)
                  rolls = rng.integers(1, 6, size=(trials, 4))
                  return float((rolls == 6).any(axis=1).mean())
            `,
          ],
          explain: '"At least one" is easiest via the complement: 1 − P(no six) = 1 − (5/6)⁴. The simulation agrees to about ±0.005: the standard error of a simulated proportion is √(p(1−p)/n) ≈ 0.002 here. `integers(1, 6)` never produces a 6, because the upper bound is exclusive. Off-by-one bugs exist in randomness too.',
        },
        {
          type: 'learn',
          title: 'The bootstrap',
          body: md`
            How uncertain is a **median** from a few hundred users? There's no simple formula, so **resample**:

            1. Draw n values **with replacement** from your sample.
            2. Compute the statistic.
            3. Repeat B times (1,000–10,000).

            The spread of the B statistics approximates the sampling distribution. Its middle 95 % (2.5th to 97.5th percentile) is a **percentile bootstrap CI**. It works for medians, percentiles, ratios: anything you can compute.
          `,
          code: py`
            import numpy as np
            import pandas as pd
            import matplotlib.pyplot as plt
            ab = pd.read_csv("data/ab_test.csv")
            buyers = ab[ab["converted"] == 1]
            rev = buyers["revenue"].to_numpy()
            rng = np.random.default_rng(0)
            n = len(rev)
            meds = [np.median(rng.choice(rev, size=n))
                    for _ in range(2000)]
            lo, hi = np.percentile(meds, [2.5, 97.5])
            print(round(np.median(rev), 2),
                  round(lo, 2), round(hi, 2))
            plt.figure(figsize=(6, 3))
            plt.hist(meds, bins=30, color="#E11D48")
            plt.axvline(lo, color="k", ls="--")
            plt.axvline(hi, color="k", ls="--")
            plt.xlabel("bootstrap median revenue (€)")
            plt.show()
          `,
        },
        {
          type: 'order',
          prompt: 'Arrange the lines into a bootstrap 95 % CI for the median.',
          setup: 'import numpy as np',
          lines: [
            'def boot_ci(x, b=1000, seed=0):',
            '    rng = np.random.default_rng(seed)',
            '    meds = [np.median(rng.choice(x, size=len(x)))',
            '            for _ in range(b)]',
            '    return np.percentile(meds, [2.5, 97.5])',
          ],
          distractors: ['    return np.percentile(meds, [5, 95])', '    meds = [np.median(rng.choice(x, size=b))'],
          tests: [
            { call: 'boot_ci([3, 1, 4, 1, 5, 9, 2, 6], 500, 0).round(2).tolist()' },
          ],
          explain: 'Each resample has the **same size** as the data (`len(x)`, not `b`), and `rng.choice` samples with replacement by default. A 95 % interval cuts 2.5 % from each tail, so it spans the 2.5th to the 97.5th percentile. [5, 95] would be a 90 % interval.',
        },
        {
          type: 'code',
          title: 'Bootstrap CI for a median',
          prompt: md`
            Write \`median_ci(x, b=2000, seed=0, level=0.95)\` that returns a percentile bootstrap CI for the median of \`x\` as a tuple \`(low, high)\`, rounded to 2.

            Do it exactly like this, so results are reproducible:
            - \`rng = np.random.default_rng(seed)\`
            - \`b\` times: \`rng.choice(x, size=len(x), replace=True)\` and take its median
            - the CI ends are the percentiles \`(1 − level)/2\` and \`1 − (1 − level)/2\` (×100 for numpy) of the b medians
          `,
          setup: py`
            import numpy as np
            import pandas as pd
            ab = pd.read_csv("data/ab_test.csv")
            buyers = ab[ab["converted"] == 1]
            rev = buyers["revenue"].to_numpy()
          `,
          starter: 'import numpy as np\n\ndef median_ci(x, b=2000, seed=0, level=0.95):\n    pass\n',
          solution: py`
            import numpy as np

            def median_ci(x, b=2000, seed=0, level=0.95):
                rng = np.random.default_rng(seed)
                n = len(x)
                meds = [np.median(rng.choice(x, size=n,
                                             replace=True))
                        for _ in range(b)]
                a = (1 - level) / 2 * 100
                lo, hi = np.percentile(meds, [a, 100 - a])
                return (round(float(lo), 2),
                        round(float(hi), 2))
          `,
          tests: [
            { assert: 'median_ci(rev)[0] < np.median(rev) < median_ci(rev)[1]', name: 'the interval contains the sample median' },
            { call: 'median_ci(rev)', name: 'revenue of converters, seed 0' },
            { call: 'median_ci(rev, b=1000, seed=3, level=0.9)', hidden: true },
            { call: 'median_ci([3, 1, 4, 1, 5, 9, 2, 6, 5, 3], seed=1)', hidden: true },
          ],
          hints: [
            'A list comprehension with `np.median(rng.choice(x, size=len(x), replace=True))` inside, `b` times.',
            'For level 0.95 the percentiles are 2.5 and 97.5: `a = (1 - level) / 2 * 100`.',
          ],
          wrong: [
            py`
              import numpy as np

              def median_ci(x, b=2000, seed=0, level=0.95):
                  rng = np.random.default_rng(seed)
                  meds = [np.median(rng.choice(x, size=len(x),
                                               replace=False))
                          for _ in range(b)]
                  a = (1 - level) / 2 * 100
                  lo, hi = np.percentile(meds, [a, 100 - a])
                  return round(float(lo), 2), round(float(hi), 2)
            `,
            py`
              import numpy as np

              def median_ci(x, b=2000, seed=0, level=0.95):
                  rng = np.random.default_rng(seed)
                  meds = [np.median(rng.choice(x, size=len(x)))
                          for _ in range(b)]
                  a = (1 - level) * 100
                  lo, hi = np.percentile(meds, [a, 100 - a])
                  return round(float(lo), 2), round(float(hi), 2)
            `,
          ],
          explain: 'Without replacement, every "resample" is the original data shuffled: the median never changes and the CI collapses to a point. The bootstrap assumes your sample represents the population. It struggles with tiny samples and with extreme statistics (like the max). Cost: O(B · n). On big data, resample by user-level buckets instead of rows.',
        },
        {
          type: 'choice',
          prompt: 'The bootstrap 95 % CI for "median basket value, treatment − control" is **[−0.40 €, +2.10 €]**. What\'s the best reading?',
          options: [
            'Inconclusive: −0.40 to +2.10 € plausible',
            'B is better: most of the CI is above 0',
            'There is a 95 % chance the lift is 0',
            'B is worse: the CI includes negatives',
          ],
          answer: 0,
          explain: 'The interval contains 0, so the data can\'t rule out "no effect". But it also can\'t rule out a +2 € lift: "not significant" is not "no effect". If +1 € matters to the business, the test is underpowered. Run it longer or with more traffic.',
        },
        {
          type: 'learn',
          title: 'The permutation test',
          body: md`
            Another p-value with no formulas. If the treatment does nothing (H₀), the group labels are arbitrary. So:

            1. Compute the observed difference in means.
            2. **Shuffle the labels** (permute the pooled values), split into groups of the original sizes, recompute the difference.
            3. Repeat many times.

            Two-sided p-value = share of shuffled differences with |diff| ≥ |observed|. No normality assumption, any statistic.
          `,
          code: py`
            import numpy as np
            a = np.array([12.0, 15, 11, 14, 13, 12])
            b = np.array([16.0, 14, 18, 15, 17, 19])
            obs = b.mean() - a.mean()
            pooled = np.concatenate([a, b])
            rng = np.random.default_rng(0)
            diffs = []
            for _ in range(5000):
                s = rng.permutation(pooled)
                diffs.append(s[6:].mean() - s[:6].mean())
            diffs = np.array(diffs)
            print(round(obs, 2))
            print(np.mean(np.abs(diffs) >= abs(obs)))
          `,
        },
        {
          type: 'code',
          title: 'Permutation test',
          prompt: md`
            Write \`perm_test(a, b, n_perm=2000, seed=0)\` returning the two-sided permutation p-value for the difference in means (b − a), rounded to 4.

            Follow these steps exactly:
            - \`pooled = np.concatenate([a, b])\`, \`rng = np.random.default_rng(seed)\`
            - \`n_perm\` times: \`s = rng.permutation(pooled)\`. The **first \`len(a)\`** values are the new group a, the rest group b.
            - p = share of permutations with |diff| ≥ |observed diff|
          `,
          setup: py`
            import numpy as np
            import pandas as pd
            ab = pd.read_csv("data/ab_test.csv")
            buyers = ab[ab["converted"] == 1]
            g = buyers.groupby("group")["revenue"]
            ctl = g.get_group("control").to_numpy()
            trt = g.get_group("treatment").to_numpy()
          `,
          starter: 'import numpy as np\n\ndef perm_test(a, b, n_perm=2000, seed=0):\n    pass\n',
          solution: py`
            import numpy as np

            def perm_test(a, b, n_perm=2000, seed=0):
                a = np.asarray(a, dtype=float)
                b = np.asarray(b, dtype=float)
                obs = b.mean() - a.mean()
                pooled = np.concatenate([a, b])
                rng = np.random.default_rng(seed)
                k = len(a)
                diffs = np.empty(n_perm)
                for i in range(n_perm):
                    s = rng.permutation(pooled)
                    diffs[i] = s[k:].mean() - s[:k].mean()
                p = np.mean(np.abs(diffs) >= abs(obs))
                return round(float(p), 4)
          `,
          tests: [
            { call: 'perm_test([1, 2, 3], [1, 2, 3])', expect: '1.0', name: 'identical groups → p = 1' },
            { call: 'perm_test([1, 2, 3, 4, 5] * 4, [11, 12, 13, 14, 15] * 4)', expect: '0.0', name: 'clearly different groups → p = 0' },
            { call: 'perm_test(ctl, trt)', name: 'revenue of converters: control vs treatment' },
            { call: 'perm_test(trt, ctl, n_perm=1000, seed=5)', hidden: true },
            { call: 'perm_test([12.0, 15, 11, 14, 13], [16.0, 14, 18, 15], seed=2)', hidden: true },
          ],
          hints: [
            'Inside the loop: `s = rng.permutation(pooled)`, then `s[len(a):].mean() - s[:len(a)].mean()`.',
            'Two-sided: compare `np.abs(diffs) >= abs(obs)` and take the mean of the booleans.',
          ],
          wrong: [
            py`
              import numpy as np

              def perm_test(a, b, n_perm=2000, seed=0):
                  a = np.asarray(a, dtype=float)
                  b = np.asarray(b, dtype=float)
                  obs = b.mean() - a.mean()
                  pooled = np.concatenate([a, b])
                  rng = np.random.default_rng(seed)
                  k = len(a)
                  diffs = np.empty(n_perm)
                  for i in range(n_perm):
                      s = rng.permutation(pooled)
                      diffs[i] = s[k:].mean() - s[:k].mean()
                  return round(float(np.mean(diffs >= obs)), 4)
            `,
            py`
              import numpy as np

              def perm_test(a, b, n_perm=2000, seed=0):
                  a = np.asarray(a, dtype=float)
                  b = np.asarray(b, dtype=float)
                  obs = b.mean() - a.mean()
                  pooled = np.concatenate([a, b])
                  rng = np.random.default_rng(seed)
                  k = len(a)
                  diffs = np.empty(n_perm)
                  for i in range(n_perm):
                      s = rng.permutation(pooled)
                      diffs[i] = s[k:].mean() - s[:k].mean()
                  p = np.mean(np.abs(diffs) > abs(obs))
                  return round(float(p), 4)
            `,
          ],
          explain: 'Among converters, treatment\'s average order is slightly **smaller**, and the permutation test says that difference is consistent with noise. So the treatment\'s revenue gain comes from *more* buyers, not bigger baskets. With p = 0 from 2,000 permutations, report "p < 1/2000", not "p = 0". `>=` matters: the observed split itself is one of the possible permutations.',
        },
        {
          type: 'learn',
          title: 'Sample size: why small tests are noisy',
          body: md`
            The standard error of a rate shrinks with **√n**: 4× the users → half the noise.

            To detect an absolute lift δ on a baseline rate p with α = 0.05 (two-sided) and 80 % power, each group needs about

            **n = (z₀.₉₇₅ + z₀.₈)² · 2p(1−p) / δ² = (1.96 + 0.84)² · 2p(1−p) / δ²**

            Halving δ quadruples n. That's why tiny lifts need huge traffic, and why surprising results from small tests often fail to replicate.
          `,
          code: py`
            import numpy as np
            rng = np.random.default_rng(1)
            for n in (200, 2_000, 20_000):
                a = rng.binomial(n, 0.1, 5000) / n
                b = rng.binomial(n, 0.1, 5000) / n
                print(n, round(np.std(b - a), 4))
          `,
        },
        {
          type: 'choice',
          prompt: 'Your test needs 8,000 users per group to detect a 1 pp lift. How many does it need to detect a **0.5 pp** lift (same baseline, α and power)?',
          options: ['32,000', '16,000', '4,000', '8,000'],
          answer: 0,
          explain: 'n ∝ 1/δ². Halving δ multiplies n by 2² = 4. Small effects are expensive, which is why you agree on the minimum detectable effect (MDE) before you start.',
        },
        {
          type: 'code',
          title: 'Sample size calculator',
          prompt: md`
            Write \`n_per_group(p, mde, relative=False, z_alpha=1.96, z_beta=0.84)\` that returns the users needed **per group** (an int, rounded **up**) using

            n = (z_alpha + z_beta)² · 2p(1 − p) / δ²

            \`mde\` is the absolute lift δ, unless \`relative=True\`: then the lift is \`mde × p\` (e.g. "detect a 10 % relative lift").

            \`\`\`python
            n_per_group(0.12, 0.015)  # 7360
            \`\`\`
          `,
          setup: 'import math',
          starter: 'import math\n\ndef n_per_group(p, mde, relative=False,\n                z_alpha=1.96, z_beta=0.84):\n    pass\n',
          solution: py`
            import math

            def n_per_group(p, mde, relative=False,
                            z_alpha=1.96, z_beta=0.84):
                d = mde * p if relative else mde
                n = ((z_alpha + z_beta) ** 2
                     * 2 * p * (1 - p) / d ** 2)
                return math.ceil(n)
          `,
          tests: [
            { call: 'n_per_group(0.12, 0.015)', expect: '7360' },
            { call: 'n_per_group(0.05, 0.015)', expect: '3311' },
            { call: 'n_per_group(0.12, 0.1, relative=True)', expect: '11499', name: '10 % relative lift on a 12 % baseline' },
            { call: 'n_per_group(0.2, 0.015, z_beta=1.28)', hidden: true, name: '90 % power' },
            { call: 'n_per_group(0.03, 0.2, relative=True)', hidden: true },
          ],
          hints: [
            'Turn a relative MDE into an absolute one first: `d = mde * p`.',
            '`math.ceil` rounds up. You can\'t run a test with 7,359.15 users.',
          ],
          wrong: [
            py`
              import math

              def n_per_group(p, mde, relative=False,
                              z_alpha=1.96, z_beta=0.84):
                  d = mde * p if relative else mde
                  n = ((z_alpha + z_beta) ** 2
                       * p * (1 - p) / d ** 2)
                  return math.ceil(n)
            `,
            py`
              import math

              def n_per_group(p, mde, relative=False,
                              z_alpha=1.96, z_beta=0.84):
                  d = mde * p if relative else mde
                  n = ((z_alpha + z_beta) ** 2
                       * 2 * p * (1 - p) / d ** 2)
                  return round(n)
            `,
            py`
              import math

              def n_per_group(p, mde, relative=False,
                              z_alpha=1.96, z_beta=0.84):
                  n = ((z_alpha + z_beta) ** 2
                       * 2 * p * (1 - p) / mde ** 2)
                  return math.ceil(n)
            `,
          ],
          explain: 'A 10 % relative lift on a 12 % baseline is only 1.2 pp, so you need ~11.5k users per group. Interview tip: (1.96 + 0.84)² · 2 ≈ 16, so n ≈ 16·p(1−p)/δ² is the back-of-envelope version. Then divide by daily traffic to estimate how many days the test must run, and run full weeks to cover weekday effects.',
        },
        {
          type: 'code',
          title: 'Simulate A/A tests',
          prompt: md`
            If there's no real difference, a test at α = 0.05 should "win" 5 % of the time. Check it by simulation.

            Write \`aa_fpr(n, sims=2000, p=0.1, seed=0)\`:
            - \`rng = np.random.default_rng(seed)\`
            - \`xa = rng.binomial(n, p, size=sims)\` (conversions in A), then \`xb\` the same way for B, **in that order**
            - for each of the \`sims\` pairs run the pooled two-proportion z-test (n users per group) and count it as significant if its two-sided p-value < 0.05
            - return the share of significant tests (a float)
          `,
          setup: 'import numpy as np',
          starter: 'import math\nimport numpy as np\n\ndef aa_fpr(n, sims=2000, p=0.1, seed=0):\n    pass\n',
          solution: py`
            import math
            import numpy as np

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            def aa_fpr(n, sims=2000, p=0.1, seed=0):
                rng = np.random.default_rng(seed)
                xa = rng.binomial(n, p, size=sims)
                xb = rng.binomial(n, p, size=sims)
                hits = 0
                for a, b in zip(xa, xb):
                    pool = (a + b) / (2 * n)
                    se = math.sqrt(pool * (1 - pool) * 2 / n)
                    z = (b - a) / n / se
                    if 2 * (1 - phi(abs(z))) < 0.05:
                        hits += 1
                return hits / sims
          `,
          tests: [
            { assert: '0.03 < aa_fpr(2000, sims=3000) < 0.07', name: 'about 5 % false positives' },
            { call: 'aa_fpr(1000)', name: 'n = 1000, seed 0' },
            { call: 'aa_fpr(500, sims=1000, p=0.3, seed=4)', hidden: true },
            { assert: 'aa_fpr(800, seed=1) != aa_fpr(800, seed=2)', hidden: true, name: 'uses the seed' },
          ],
          hints: [
            'Draw both arrays up front, then loop with `for a, b in zip(xa, xb):`.',
            'Pooled rate `(a + b) / (2 * n)`, SE `√(pool(1−pool)·2/n)`, z = (b − a)/n / SE, p = 2·(1 − Φ(|z|)).',
          ],
          wrong: [
            py`
              import math
              import numpy as np

              def phi(z):
                  return 0.5 * (1 + math.erf(z / math.sqrt(2)))

              def aa_fpr(n, sims=2000, p=0.1, seed=0):
                  rng = np.random.default_rng(seed)
                  xa = rng.binomial(n, p, size=sims)
                  xb = rng.binomial(n, p, size=sims)
                  hits = 0
                  for a, b in zip(xa, xb):
                      pool = (a + b) / (2 * n)
                      se = math.sqrt(pool * (1 - pool) * 2 / n)
                      z = (b - a) / n / se
                      if 1 - phi(abs(z)) < 0.05:
                          hits += 1
                  return hits / sims
            `,
            py`
              import math
              import numpy as np

              def phi(z):
                  return 0.5 * (1 + math.erf(z / math.sqrt(2)))

              def aa_fpr(n, sims=2000, p=0.1, seed=0):
                  rng = np.random.default_rng(0)
                  xa = rng.binomial(n, p, size=sims)
                  xb = rng.binomial(n, p, size=sims)
                  hits = 0
                  for a, b in zip(xa, xb):
                      pool = (a + b) / (2 * n)
                      se = math.sqrt(pool * (1 - pool) * 2 / n)
                      z = (b - a) / n / se
                      if 2 * (1 - phi(abs(z))) < 0.05:
                          hits += 1
                  return hits / sims
            `,
          ],
          explain: 'Halving the p-value (forgetting the factor 2) doubles the false-positive rate to ~10 %. Extend this simulation to **peeking**: compute the z-test after every 10 % of the users and stop at the first p < 0.05. The false-positive rate climbs well above 5 %. Big-tech experimentation platforms run exactly these A/A simulations to validate their stats engines.',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u14-exam',
    title: 'Statistics & Analytics Exam',
    minutes: 35,
    intro: 'Interview-style questions on descriptive stats, A/B testing, product metrics and resampling. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'An A/B test ends with **p = 0.20** for the primary metric. Which conclusion is correct?',
        options: [
          'The data can\'t rule out "no effect"',
          'The treatment has no effect',
          'There is an 80 % chance B is better',
          'H₀ is true with probability 0.20',
        ],
        answer: 0,
        explain: 'Failing to reject H₀ isn\'t evidence that H₀ is true: the test may simply be underpowered. Look at the confidence interval: if it\'s wide and includes business-relevant lifts, the result is inconclusive, not negative.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          import numpy as np
          import pandas as pd
          x = np.array([3, 5, 7])
          a, b = x.std(), pd.Series(x).std()
          print(a == b, round(b / a, 3))
        `,
        options: ['False 1.225', 'True 1.0', 'False 1.5', 'False 0.816'],
        answer: 0,
        checkOutput: true,
        explain: 'numpy uses ddof=0 (√(8/3) ≈ 1.633), pandas ddof=1 (√(8/2) = 2). Their ratio is √(n/(n−1)) = √1.5 ≈ 1.225.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          import pandas as pd
          s = pd.Series([1, 2, 3, 4, 5, 6, 7, 100])
          q1, q3 = s.quantile([0.25, 0.75])
          hi = q3 + 1.5 * (q3 - q1)
          print(q1, q3, hi)
          print(s[s > hi].tolist())
        `,
        answer: '2.75 6.25 11.5\n[100]',
        explain: 'n − 1 = 7. Q1 at position 1.75 → 2 + 0.75 = 2.75. Q3 at position 5.25 → 6 + 0.25 = 6.25. IQR = 3.5, upper fence 6.25 + 5.25 = 11.5.',
      },
      {
        type: 'choice',
        prompt: 'In a **randomized** 50/50 test, treatment wins on iOS and on Android but loses overall. You also notice 70 % of treatment users are on Android vs 40 % in control. What is the most likely issue?',
        options: [
          'Broken randomization/assignment',
          'Simpson\'s paradox is normal in A/B tests',
          'The treatment hurts cross-device users',
          'The test needs more users',
        ],
        answer: 0,
        explain: 'Simpson\'s paradox needs an unequal mix, and proper randomization makes the mix equal (up to noise). A 70 % vs 40 % split means assignment or logging is broken (e.g. a bug that only buckets some Android versions). Don\'t interpret the result: fix the experiment. Check sample ratios and segment mixes before reading any A/B test.',
      },
      {
        type: 'code',
        title: 'Revenue per user test',
        prompt: md`
          Conversion isn't everything: test **revenue per user** (all users, non-buyers count as 0).

          Write \`revenue_test(df)\` for A/B data (\`group\`, \`revenue\`, …). Use the large-sample z-test for a difference in means:
          - d = mean_B − mean_A
          - SE = √(s²_A/n_A + s²_B/n_B) with **sample** variances
          - z = d / SE, two-sided p-value via Φ

          Return \`{"diff": d, "z": z, "p": p, "ci": (d − 1.96·SE, d + 1.96·SE)}\`, every number rounded to 4.
        `,
        setup: py`
          import pandas as pd
          ab = pd.read_csv("data/ab_test.csv")
          small = pd.DataFrame({
              "group": ["control"] * 4 + ["treatment"] * 4,
              "revenue": [0, 0, 10, 30, 0, 20, 20, 40.0],
          })
        `,
        starter: 'import math\n\ndef revenue_test(df):\n    pass\n',
        solution: py`
          import math

          def phi(z):
              return 0.5 * (1 + math.erf(z / math.sqrt(2)))

          def revenue_test(df):
              g = df.groupby("group")["revenue"]
              m, v, n = g.mean(), g.var(), g.size()
              a, b = "control", "treatment"
              d = m[b] - m[a]
              se = math.sqrt(v[a] / n[a] + v[b] / n[b])
              z = d / se
              p = 2 * (1 - phi(abs(z)))
              r = lambda x: round(float(x), 4)
              return {"diff": r(d), "z": r(z), "p": r(p),
                      "ci": (r(d - 1.96 * se),
                             r(d + 1.96 * se))}
        `,
        tests: [
          { call: 'revenue_test(small)', hidden: true, name: 'tiny groups of 4' },
          { call: 'revenue_test(ab)', hidden: true, name: 'data/ab_test.csv' },
          { call: 'revenue_test(ab[ab["device"] == "desktop"])', hidden: true },
        ],
        wrong: [
          py`
            import math

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            def revenue_test(df):
                g = df.groupby("group")["revenue"]
                m, v, n = g.mean(), g.var(ddof=0), g.size()
                a, b = "control", "treatment"
                d = m[b] - m[a]
                se = math.sqrt(v[a] / n[a] + v[b] / n[b])
                z = d / se
                p = 2 * (1 - phi(abs(z)))
                r = lambda x: round(float(x), 4)
                return {"diff": r(d), "z": r(z), "p": r(p),
                        "ci": (r(d - 1.96 * se),
                               r(d + 1.96 * se))}
          `,
          py`
            import math

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            def revenue_test(df):
                df = df[df["revenue"] > 0]
                g = df.groupby("group")["revenue"]
                m, v, n = g.mean(), g.var(), g.size()
                a, b = "control", "treatment"
                d = m[b] - m[a]
                se = math.sqrt(v[a] / n[a] + v[b] / n[b])
                z = d / se
                p = 2 * (1 - phi(abs(z)))
                r = lambda x: round(float(x), 4)
                return {"diff": r(d), "z": r(z), "p": r(p),
                        "ci": (r(d - 1.96 * se),
                               r(d + 1.96 * se))}
          `,
          py`
            import math

            def phi(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            def revenue_test(df):
                g = df.groupby("group")["revenue"]
                m, v, n = g.mean(), g.var(), g.size()
                a, b = "control", "treatment"
                d = m[b] - m[a]
                se = math.sqrt(v[a] / n[a] + v[b] / n[b])
                z = d / se
                p = 1 - phi(z)
                r = lambda x: round(float(x), 4)
                return {"diff": r(d), "z": r(z), "p": r(p),
                        "ci": (r(d - 1.96 * se),
                               r(d + 1.96 * se))}
          `,
        ],
        explain: 'Revenue per user is heavy-tailed and mostly zeros, so its variance is large: here the conversion lift is significant, but the revenue lift is not (yet). Dropping non-buyers changes the question to "basket size", which hides the conversion effect. With n in the thousands the CLT makes the z-test valid even though revenue is far from normal.',
      },
      {
        type: 'code',
        title: 'Day-1 retention',
        prompt: md`
          Write \`d1_retention(ev)\` for an events DataFrame (\`user_id\`, \`ts\` = "YYYY-MM-DD HH:MM:SS", …).

          - A user's first day d₀ is the date of their first event.
          - **Eligible** users: d₀ is before the last date in the data (otherwise we can't observe d₀ + 1).
          - **Retained**: the user has at least one event on exactly d₀ + 1 day.

          Return retained / eligible, rounded to 4.
        `,
        setup: py`
          import pandas as pd
          ev = pd.read_csv("data/events.csv")
          tiny = pd.DataFrame({
              "user_id": [1, 1, 2, 2, 3, 4],
              "ts": ["2025-11-01 09:00:00", "2025-11-02 10:00:00",
                     "2025-11-01 23:00:00", "2025-11-03 08:00:00",
                     "2025-11-02 12:00:00", "2025-11-03 07:00:00"],
          })
        `,
        starter: 'import pandas as pd\n\ndef d1_retention(ev):\n    pass\n',
        solution: py`
          import pandas as pd

          def d1_retention(ev):
              day = pd.to_datetime(ev["ts"].str[:10])
              d = pd.DataFrame({"u": ev["user_id"],
                                "day": day})
              first = d.groupby("u")["day"].min()
              elig = first[first < day.max()]
              seen = set(zip(d["u"], d["day"]))
              one = pd.Timedelta(days=1)
              kept = sum((u, f + one) in seen
                         for u, f in elig.items())
              return round(kept / len(elig), 4)
        `,
        tests: [
          { call: 'd1_retention(tiny)', expect: '0.3333', hidden: true, name: 'tiny: 1 of 3 eligible users retained' },
          { call: 'd1_retention(ev)', hidden: true, name: 'data/events.csv' },
          { call: 'd1_retention(ev[ev["device"] == "mobile"])', hidden: true },
        ],
        wrong: [
          py`
            import pandas as pd

            def d1_retention(ev):
                day = pd.to_datetime(ev["ts"].str[:10])
                d = pd.DataFrame({"u": ev["user_id"],
                                  "day": day})
                first = d.groupby("u")["day"].min()
                seen = set(zip(d["u"], d["day"]))
                one = pd.Timedelta(days=1)
                kept = sum((u, f + one) in seen
                           for u, f in first.items())
                return round(kept / len(first), 4)
          `,
          py`
            import pandas as pd

            def d1_retention(ev):
                day = pd.to_datetime(ev["ts"].str[:10])
                d = pd.DataFrame({"u": ev["user_id"],
                                  "day": day})
                first = d.groupby("u")["day"].min()
                last = d.groupby("u")["day"].max()
                elig = first[first < day.max()]
                kept = (last[elig.index] > elig).sum()
                return round(kept / len(elig), 4)
          `,
        ],
        explain: 'Users who first appear on the last day can\'t have a day 1 yet. Leaving them in the denominator drags retention down (right-censoring again). "Came back at any later time" is a different, much larger metric (unbounded retention), so define the window precisely. A set of (user, day) pairs makes each lookup O(1).',
      },
      {
        type: 'code',
        title: 'Bootstrap a difference in medians',
        prompt: md`
          Write \`boot_median_diff(a, b, n_boot=2000, seed=0)\` that returns a 95 % percentile bootstrap CI for **median(b) − median(a)** as \`(low, high)\` rounded to 2.

          Exactly: \`rng = np.random.default_rng(seed)\`. In each of the \`n_boot\` iterations, resample \`a\` (size len(a), with replacement) **first**, then \`b\` (size len(b)), and store the difference of their medians. The CI ends are the 2.5th and 97.5th percentiles.
        `,
        setup: py`
          import numpy as np
          import pandas as pd
          ab = pd.read_csv("data/ab_test.csv")
          buyers = ab[ab["converted"] == 1]
          g = buyers.groupby("group")["revenue"]
          ctl = g.get_group("control").to_numpy()
          trt = g.get_group("treatment").to_numpy()
        `,
        starter: 'import numpy as np\n\ndef boot_median_diff(a, b, n_boot=2000, seed=0):\n    pass\n',
        solution: py`
          import numpy as np

          def boot_median_diff(a, b, n_boot=2000, seed=0):
              rng = np.random.default_rng(seed)
              diffs = []
              for _ in range(n_boot):
                  ra = rng.choice(a, size=len(a))
                  rb = rng.choice(b, size=len(b))
                  d = np.median(rb) - np.median(ra)
                  diffs.append(d)
              lo, hi = np.percentile(diffs, [2.5, 97.5])
              return (round(float(lo), 2),
                      round(float(hi), 2))
        `,
        tests: [
          { call: 'boot_median_diff(ctl, trt)', hidden: true, name: 'converters: treatment − control' },
          { call: 'boot_median_diff(trt, ctl, n_boot=1000, seed=7)', hidden: true },
          { call: 'boot_median_diff([1, 2, 3, 4, 5, 6], [4, 5, 6, 7, 8, 9], seed=1)', hidden: true },
        ],
        wrong: [
          py`
            import numpy as np

            def boot_median_diff(a, b, n_boot=2000, seed=0):
                rng = np.random.default_rng(seed)
                pooled = np.concatenate([a, b])
                diffs = []
                for _ in range(n_boot):
                    ra = rng.choice(pooled, size=len(a))
                    rb = rng.choice(pooled, size=len(b))
                    diffs.append(np.median(rb) - np.median(ra))
                lo, hi = np.percentile(diffs, [2.5, 97.5])
                return round(float(lo), 2), round(float(hi), 2)
          `,
          py`
            import numpy as np

            def boot_median_diff(a, b, n_boot=2000, seed=0):
                rng = np.random.default_rng(seed)
                diffs = []
                for _ in range(n_boot):
                    ra = rng.choice(a, size=len(a), replace=True)
                    rb = rng.choice(b, size=len(b), replace=True)
                    diffs.append(np.median(rb) - np.median(ra))
                lo, hi = np.percentile(diffs, [5, 95])
                return round(float(lo), 2), round(float(hi), 2)
          `,
        ],
        explain: 'Resample each group **separately**: the CI describes the difference between two populations. Resampling from the pooled data simulates H₀ instead (that\'s a permutation-style null distribution, centred on 0). Medians of skewed revenue are much more stable than means, which is why many companies report them.',
      },
      {
        type: 'code',
        title: 'Rolling anomaly detector',
        prompt: md`
          Global z-scores flag the whole holiday season. Compare each day with its **recent past** instead.

          Write \`rolling_anomalies(daily, window=7, k=3)\`. \`daily\` is a Series with one row per day (no gaps). For each day compute z = (value − mean) / std, where mean and std (sample) come from the **previous \`window\` days, excluding the day itself**. Return the list of index labels with |z| > k. The first \`window\` days have no baseline and are never flagged.
        `,
        setup: py`
          import pandas as pd
          orders = pd.read_csv("data/orders.csv")
          days = pd.date_range("2025-01-01", "2025-12-31")
          days = days.strftime("%Y-%m-%d")
          daily = (orders.groupby("order_date").size()
                   .reindex(days, fill_value=0))
          spike = pd.Series([10, 11, 9, 10, 11, 9, 10, 30, 10],
                            index=list("abcdefghi"))
        `,
        starter: 'def rolling_anomalies(daily, window=7, k=3):\n    pass\n',
        solution: py`
          def rolling_anomalies(daily, window=7, k=3):
              base = daily.shift(1).rolling(window)
              z = (daily - base.mean()) / base.std()
              return list(daily.index[z.abs() > k])
        `,
        tests: [
          { call: 'rolling_anomalies(spike)', expect: '["h"]', hidden: true, name: 'one spike after a calm week' },
          { call: 'rolling_anomalies(daily)', hidden: true, name: 'daily orders 2025' },
          { call: 'rolling_anomalies(daily, window=14, k=2.5)', hidden: true },
        ],
        wrong: [
          py`
            def rolling_anomalies(daily, window=7, k=3):
                base = daily.rolling(window)
                z = (daily - base.mean()) / base.std()
                return list(daily.index[z.abs() > k])
          `,
          py`
            def rolling_anomalies(daily, window=7, k=3):
                z = (daily - daily.mean()) / daily.std()
                return list(daily.index[z.abs() > k])
          `,
        ],
        explain: 'Including today in its own baseline lets a spike inflate the std it is judged against (masking), so the 30 in the spike test hides. `shift(1)` before `rolling` makes the baseline strictly historical, which is also what a real-time monitor can compute. Production systems add weekday seasonality and robust statistics (median/MAD).',
      },
      {
        type: 'choice',
        prompt: 'Baseline checkout conversion is 5 %. You want 80 % power at α = 0.05 (two-sided) to detect an absolute lift of **0.5 pp**. Roughly how many users per group? (Use n ≈ 16·p(1−p)/δ².)',
        options: ['≈ 30,000', '≈ 3,000', '≈ 300,000', '≈ 1,500'],
        answer: 0,
        explain: '16 × 0.05 × 0.95 / 0.005² = 0.76 / 0.000025 = 30,400 per group, ~61k total. With 5,000 checkout visitors a day that\'s about two weeks, so plan for full weeks.',
      },
      {
        type: 'choice',
        prompt: 'You compared **10** new variants against control on the same metric. The best one has p = 0.03; all others p > 0.2. What do you tell the team?',
        options: [
          'Not significant after Bonferroni (0.005)',
          'Ship the best variant: p < 0.05',
          'All 10 variants are significant together',
          'Re-run only the losing variants',
        ],
        answer: 0,
        explain: 'With 10 comparisons, P(at least one p < 0.05 by chance) ≈ 1 − 0.95¹⁰ ≈ 40 %. Bonferroni: 0.05 / 10 = 0.005. The honest next step is a confirmation test of the winner alone. Its effect will likely shrink (the "winner\'s curse").',
      },
    ],
  },
};

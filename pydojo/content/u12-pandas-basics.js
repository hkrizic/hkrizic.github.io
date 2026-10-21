// Unit 12 — pandas Basics: DataFrames, selecting, filtering, cleaning.
import { py, md } from './helpers.js';

const ORDERS = 'import pandas as pd\norders = pd.read_csv("data/orders.csv")';
const MESSY = 'import pandas as pd\nc = pd.read_csv("data/customers_messy.csv")';

export default {
  id: 'u12',
  order: 12,
  track: 'data',
  title: 'pandas Basics',
  subtitle: 'DataFrames, selecting, filtering, cleaning',
  icon: '🐼',
  color: '#22C55E',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u12-l1',
      title: 'Series & DataFrames',
      summary: 'Labelled columns and tables: the two building blocks of pandas.',
      steps: [
        {
          type: 'learn',
          title: 'Series: values with labels',
          body: md`
            pandas is NumPy plus **labels**. A \`Series\` is a 1-D array where every value has a label in its **index**. Look values up by label, filter with masks and do vectorised math, just like with arrays.

            Build one from a list plus an index, or from a dict: the keys become the index. Everyone imports pandas as \`pd\`.
          `,
          code: py`
            import pandas as pd

            s = pd.Series([120, 80, 95],
                          index=["DE", "US", "FR"])
            print(s)
            print(s["US"])
            print(s[s > 90])
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            s = pd.Series([3, 5, 7], index=["a", "b", "c"])
            print(s["b"] + s.sum())
            print(s[s > 4].index.tolist())
          `,
          answer: "20\n['b', 'c']",
          explain: '`s["b"]` is 5 and the sum is 15. The mask keeps labels b and c, and `.index.tolist()` turns the labels into a plain list.',
        },
        {
          type: 'learn',
          title: 'Index alignment',
          body: md`
            When you combine two Series, pandas matches values **by label, not by position**. A label that exists in only one of them gets \`NaN\` (missing).

            That's usually what you want (this year's revenue per country minus last year's), but missing labels can surprise you. \`.add(other, fill_value=0)\` (also \`.sub\`, \`.mul\`, \`.div\`) treats a missing label as 0 **before** computing. \`.sort_index()\` sorts by label.
          `,
          code: py`
            import pandas as pd

            last = pd.Series({"DE": 100, "US": 80})
            this = pd.Series({"US": 90, "FR": 40})
            print(this - last)
            print(this.sub(last, fill_value=0))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            a = pd.Series([1, 2], index=["x", "y"])
            b = pd.Series([10, 20], index=["y", "z"])
            print((a + b).tolist())
          `,
          options: ['[nan, 12.0, nan]', '[11, 22]', '[11.0, 22.0]', '[1, 12, 20]'],
          answer: 0,
          checkOutput: true,
          explain: 'Labels are matched: only `y` is in both (2 + 10 = 12). `x` and `z` have no partner, so they become NaN. NaN is a float, which turns the whole result into floats. "Why did my arithmetic produce NaNs?" is a classic interview question.',
        },
        {
          type: 'learn',
          title: 'DataFrame: a table of columns',
          body: md`
            A \`DataFrame\` is a table: named **columns** (each one a Series) that share one **index** of row labels.

            Build it from a dict of lists (column by column), or from a **list of dicts**, one per row, which is exactly what JSON APIs return. \`columns=[...]\` picks and orders the columns. A missing key becomes NaN.

            Look around with \`df.shape\` (rows, cols), \`df.columns\`, \`len(df)\`, and \`df.head(n)\` / \`df.tail(n)\` (5 rows by default).
          `,
          code: py`
            import pandas as pd

            df = pd.DataFrame({
                "product": ["Mug", "Lamp", "Tea"],
                "price": [8.9, 35.0, 6.5],
                "qty": [3, 1, 4],
            })
            print(df)
            print(df.shape, df.columns.tolist())
            print(df.head(2))
          `,
        },
        {
          type: 'choice',
          prompt: 'Rows from an API, one dict per row. What does this print?',
          code: py`
            import pandas as pd
            rows = [{"a": 1, "b": 2}, {"a": 3}]
            df = pd.DataFrame(rows)
            print(df.shape, df["b"].tolist())
          `,
          options: ['(2, 2) [2.0, nan]', '(2, 2) [2, None]', '(2, 1) [2]', 'KeyError: b'],
          answer: 0,
          checkOutput: true,
          explain: 'The missing key becomes NaN. Because NaN is a float, the whole `b` column turns into floats (`2.0`). Ints that unexpectedly become floats usually mean "there\'s a missing value in there".',
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"x": range(10)})
            print(len(df.head(3)), len(df.tail(20)))
            print(df.shape)
          `,
          answer: '3 10\n(10, 1)',
          explain: '`tail(20)` on a 10-row frame simply returns all 10 rows. It doesn\'t raise an error. The shape is (rows, columns).',
        },
        {
          type: 'learn',
          title: 'Index, dtypes and missing values',
          body: md`
            By default rows get a \`RangeIndex\` 0, 1, 2, … . \`set_index("col")\` makes a column the index, and \`reset_index()\` turns the index back into a column.

            Every column has one **dtype**: \`int64\`, \`float64\`, \`bool\`, \`str\` (text, pandas 3) or \`datetime64\`. Convert with \`.astype(...)\`.

            Missing values show up as \`NaN\`. \`s.isna()\` and \`s.notna()\` return bool masks, and a comparison like \`df["qty"] >= 3\` gives a bool column you can store.
          `,
          code: py`
            import pandas as pd

            df = pd.DataFrame({"city": ["Zagreb", "Oslo"],
                               "qty": ["3", "1"]})
            df["qty"] = df["qty"].astype(int)
            df["bulk"] = df["qty"] >= 3
            print(df.dtypes)
            print(df.set_index("city"))
          `,
        },
        {
          type: 'blanks',
          prompt: 'Build a table with one row per city, indexed by the city name.',
          code: py`
            import pandas as pd
            df = pd.___({"city": ["Rome", "Oslo"],
                         "pop_m": [2.8, 0.7]})
            df = df.___("city")
            print(df.index.tolist())
          `,
          bank: ['DataFrame', 'set_index', 'Series', 'reset_index', 'index', 'dict'],
          answer: ['DataFrame', 'set_index'],
          tests: [{ stdout: "['Rome', 'Oslo']\n" }],
          explain: 'A dict of lists becomes a DataFrame. `set_index("city")` moves the column into the index, so you can look up rows by city.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"x": [1, None, 3]})
            print(df["x"].dtype, df["x"].isna().sum())
          `,
          options: ['float64 1', 'int64 1', 'object 1', 'float64 0'],
          answer: 0,
          checkOutput: true,
          explain: '`None` in a numeric column becomes NaN, and NaN forces the column to `float64`. `isna().sum()` counts the True values, so it counts the missing cells.',
        },
        {
          type: 'code',
          title: 'Build a results table',
          prompt: md`
            Write \`results(names, scores)\` returning a DataFrame with the columns \`name\`, \`score\` and \`passed\` (True when the score is **at least 50**), in that order, with the default 0, 1, 2, … index.

            \`\`\`python
            results(["Ana", "Ben"], [72, 45])
            #   name  score  passed
            # 0  Ana     72    True
            # 1  Ben     45   False
            \`\`\`
          `,
          starter: py`
            import pandas as pd

            def results(names, scores):
                pass
          `,
          solution: py`
            import pandas as pd

            def results(names, scores):
                df = pd.DataFrame({"name": names,
                                   "score": scores})
                df["passed"] = df["score"] >= 50
                return df
          `,
          tests: [
            { call: 'results(["Ana", "Ben"], [72, 45])', expect: 'pd.DataFrame({"name": ["Ana", "Ben"], "score": [72, 45], "passed": [True, False]})' },
            { call: 'results(["Cy"], [50])["passed"].tolist()', expect: '[True]', name: 'exactly 50 passes' },
            { call: 'results(["a", "b", "c"], [0, 100, 49.5])', hidden: true },
          ],
          hints: [
            'Start from a dict of lists: `pd.DataFrame({"name": names, "score": scores})`.',
            'A comparison on a column gives a bool Series: `df["score"] >= 50`.',
          ],
          wrong: [
            'import pandas as pd\n\ndef results(names, scores):\n    df = pd.DataFrame({"name": names, "score": scores})\n    df["passed"] = df["score"] > 50\n    return df\n',
            'import pandas as pd\n\ndef results(names, scores):\n    df = pd.DataFrame({"score": scores, "name": names})\n    df["passed"] = df["score"] >= 50\n    return df\n',
          ],
          explain: 'Each dict key becomes a column, in insertion order, and column order matters when tables are compared or exported. The comparison runs on the whole column at once, just like a NumPy mask.',
        },
        {
          type: 'code',
          title: 'Revenue growth by country',
          prompt: md`
            \`last\` and \`this\` are Series of revenue per country (country codes as the index) for last year and this year. A country missing from one of them had **0 revenue** that year.

            Write \`growth(last, this)\` returning \`this - last\` for **every** country that appears in either Series, sorted by country code (\`.sort_index()\`).

            \`\`\`python
            last = pd.Series({"DE": 100, "US": 80})
            this = pd.Series({"US": 90, "FR": 40})
            growth(last, this)
            # DE   -100.0
            # FR     40.0
            # US     10.0
            \`\`\`
          `,
          starter: py`
            import pandas as pd

            def growth(last, this):
                pass
          `,
          solution: py`
            import pandas as pd

            def growth(last, this):
                diff = this.sub(last, fill_value=0)
                return diff.sort_index()
          `,
          tests: [
            { call: 'growth(pd.Series({"DE": 100, "US": 80}), pd.Series({"US": 90, "FR": 40}))', expect: 'pd.Series({"DE": -100.0, "FR": 40.0, "US": 10.0})' },
            { call: 'growth(pd.Series({"HR": 5}), pd.Series({"HR": 7}))', expect: 'pd.Series({"HR": 2})' },
            { call: 'growth(pd.Series({"US": 1, "DE": 2}), pd.Series({"US": 3, "DE": 5}))', hidden: true, name: 'same countries, unsorted' },
            { call: 'growth(pd.Series({"NL": 9.5, "ES": 3.0, "IT": 1.0}), pd.Series({"IT": 4.0, "UK": 2.5}))', hidden: true },
          ],
          hints: [
            'Plain `this - last` gives NaN for countries missing on one side.',
            '`this.sub(last, fill_value=0)` treats a missing country as 0, then `.sort_index()`.',
          ],
          wrong: [
            'import pandas as pd\n\ndef growth(last, this):\n    return (this - last).sort_index()\n',
            'import pandas as pd\n\ndef growth(last, this):\n    return (this - last).fillna(0).sort_index()\n',
            'import pandas as pd\n\ndef growth(last, this):\n    return this.sub(last, fill_value=0)\n',
          ],
          explain: '`fill_value=0` fills a missing label **before** subtracting, so DE becomes 0 − 100. The tempting `(this - last).fillna(0)` fills **after** subtracting and reports DE\'s growth as 0 instead of −100, a real reporting bug.',
        },
        {
          type: 'code',
          title: 'API records to a table',
          prompt: md`
            An API returns users as a list of dicts, and some records have no \`"country"\`. Write \`to_table(records)\` returning a DataFrame:

            - indexed by \`user_id\`
            - with the columns \`name\` and \`country\` in that order (missing countries stay NaN)
            - plus a bool column \`has_country\`

            \`\`\`python
            recs = [{"user_id": 7, "name": "Ana", "country": "HR"},
                    {"user_id": 9, "name": "Ben"}]
            to_table(recs)
            #         name country  has_country
            # user_id
            # 7        Ana      HR         True
            # 9        Ben     NaN        False
            \`\`\`

            The column must exist even if **no** record has a country.
          `,
          starter: py`
            import pandas as pd

            def to_table(records):
                pass
          `,
          solution: py`
            import pandas as pd

            def to_table(records):
                cols = ["user_id", "name", "country"]
                df = pd.DataFrame(records, columns=cols)
                df = df.set_index("user_id")
                df["has_country"] = df["country"].notna()
                return df
          `,
          tests: [
            { call: 'to_table([{"user_id": 7, "name": "Ana", "country": "HR"}, {"user_id": 9, "name": "Ben"}])', expect: 'pd.DataFrame({"name": ["Ana", "Ben"], "country": ["HR", None], "has_country": [True, False]}, index=pd.Index([7, 9], name="user_id"))' },
            { call: 'to_table([{"name": "Cy", "user_id": 3, "country": "DE"}]).columns.tolist()', expect: '["name", "country", "has_country"]', name: 'column order' },
            { call: 'to_table([{"user_id": 1, "name": "Dee"}])["has_country"].tolist()', expect: '[False]', hidden: true, name: 'no record has a country' },
            { call: 'to_table([{"user_id": 4, "name": "Eve", "country": "FR"}, {"user_id": 2, "name": "Flo", "country": None}])', hidden: true },
          ],
          hints: [
            '`pd.DataFrame(records, columns=[...])` creates every listed column, even if no record has it.',
            'Then `set_index("user_id")`, and `df["country"].notna()` for the bool column.',
          ],
          wrong: [
            'import pandas as pd\n\ndef to_table(records):\n    df = pd.DataFrame(records).set_index("user_id")\n    df["has_country"] = df["country"].notna()\n    return df\n',
            'import pandas as pd\n\ndef to_table(records):\n    df = pd.DataFrame(records, columns=["user_id", "name", "country"]).set_index("user_id")\n    df["has_country"] = df["country"] != None\n    return df\n',
          ],
          explain: 'Passing `columns=` fixes the schema: same columns in the same order, whatever the API sent. That makes downstream code robust. Never compare with `== None` or `!= None`: missing values are NaN, and only `isna()`/`notna()` detect them reliably.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u12-l2',
      title: 'Loading & Inspecting',
      summary: 'Read CSV files and run the first checks on any new dataset.',
      steps: [
        {
          type: 'learn',
          title: 'read_csv and a first look',
          body: md`
            Real data lives in files. \`pd.read_csv(path)\` reads a CSV into a DataFrame and **guesses each column's dtype**.

            The first thing to do with any new dataset is to look at it: \`shape\`, \`head()\`, \`dtypes\`, and \`df.info()\`, which shows columns, dtypes, non-null counts and memory in one go.
          `,
          code: py`
            import pandas as pd

            orders = pd.read_csv("data/orders.csv")
            print(orders.shape)
            print(orders.head(3))
            orders.info()
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            o = pd.read_csv("data/orders.csv")
            print(o["unit_price"].dtype, o["order_date"].dtype)
          `,
          options: ['float64 str', 'float64 datetime64[us]', 'str str', 'int64 str'],
          answer: 0,
          checkOutput: true,
          explain: 'Numbers with decimals become `float64`. Dates are **not** parsed automatically: `order_date` is plain text (`str` in pandas 3, `object` in older versions) until you ask for dates.',
        },
        {
          type: 'learn',
          title: 'describe, value_counts, unique',
          body: md`
            - \`df.describe()\`: count, mean, std, min, quartiles and max of each numeric column. Scan it for impossible values (negative quantities, ages of 200).
            - \`s.value_counts()\`: how often each value occurs, most common first. Add \`normalize=True\` for **shares** that sum to 1.
            - \`s.unique()\` the distinct values, \`s.nunique()\` how many there are
            - \`s.sort_values(ascending=False)\` sorts any Series

            \`value_counts\` is probably the most-used method in exploratory analysis.
          `,
          code: py`
            import pandas as pd

            orders = pd.read_csv("data/orders.csv")
            print(orders["quantity"].describe())
            vc = orders["status"].value_counts(normalize=True)
            print(vc.round(3))
            print(orders["category"].unique())
          `,
        },
        {
          type: 'output',
          prompt: '`orders.csv` has 1200 rows, 9 columns and 8 different countries. What does this print?',
          code: py`
            import pandas as pd
            o = pd.read_csv("data/orders.csv")
            print(o["country"].nunique())
            print(len(o["country"]))
            print(o.shape[1])
          `,
          answer: '8\n1200\n9',
          explain: '`nunique()` counts **distinct** values, while `len()` counts every row. `shape[1]` is the number of columns. Quick counts like these are your first sanity check against the documentation.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            orders = pd.read_csv("data/orders.csv")
            vc = orders["status"].value_counts()
            print(vc.index[0])
          `,
          options: ['completed', 'cancelled', 'returned', 'status'],
          answer: 0,
          checkOutput: true,
          explain: '`value_counts` sorts by count, descending, so position 0 is the most frequent value. Most orders complete, and cancellations and returns are the minority you\'ll usually filter out.',
        },
        {
          type: 'learn',
          title: 'Dates and sanity checks',
          body: md`
            Ask for real dates while reading: \`parse_dates=["order_date"]\`. Then min/max, sorting and date math work properly.

            Before any analysis, run the standard sanity checks:

            - \`df.isna().sum()\`: missing values per column
            - \`df.duplicated().sum()\`: fully duplicated rows
            - \`df["order_id"].is_unique\`: is the key really a key?
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv",
                            parse_dates=["order_date"])
            print(o["order_date"].dtype)
            print(o["order_date"].min(), o["order_date"].max())
            print(o.isna().sum().sum(), o.duplicated().sum())
            print(o["order_id"].is_unique)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does `df.isna().sum()` return?',
          options: ['Missing values per column', 'The total number of missing values', 'The rows with a missing value', 'True if any value is missing'],
          answer: 0,
          explain: '`isna()` gives a True/False frame of the same shape, and `.sum()` adds up each column. Chain another `.sum()` for the grand total, or use `.mean()` for the **share** missing per column.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines to print the percentage of users with an unknown age.',
          lines: [
            'import pandas as pd',
            'df = pd.read_csv("data/users.csv")',
            'n_missing = df["age"].isna().sum()',
            'share = n_missing / len(df)',
            'print(round(share * 100, 1))',
          ],
          distractors: ['n_missing = df["age"].count()'],
          tests: [{ stdout: true }],
          explain: '`isna().sum()` counts the missing ages. `count()` counts the **non**-missing ones, the opposite.',
        },
        {
          type: 'blanks',
          prompt: 'Complete the sanity checks on the messy customer file.',
          code: py`
            import pandas as pd
            c = pd.read_csv("data/customers_messy.csv")
            missing = c.___().sum()
            dupes = c.___().sum()
            print(dupes)
          `,
          bank: ['isna', 'duplicated', 'unique', 'nunique', 'dropna', 'value_counts'],
          answer: ['isna', 'duplicated'],
          tests: [{ stdout: '8\n' }],
          explain: 'The file has 8 exact duplicate rows, a typical artifact of exports that were run twice. You\'ll clean them up in Lesson 6.',
        },
        {
          type: 'code',
          title: 'Data profile',
          prompt: md`
            Write \`profile(df)\` returning a dict that summarises any DataFrame:

            - \`"rows"\`: number of rows
            - \`"cols"\`: number of columns
            - \`"missing"\`: total number of missing cells
            - \`"dupes"\`: number of fully duplicated rows

            All values plain ints.

            \`\`\`python
            profile(pd.read_csv("data/customers_messy.csv"))
            # {'rows': 128, 'cols': 6, 'missing': 53, 'dupes': 8}
            \`\`\`
          `,
          starter: py`
            import pandas as pd

            def profile(df):
                pass
          `,
          solution: py`
            import pandas as pd

            def profile(df):
                rows, cols = df.shape
                return {
                    "rows": rows,
                    "cols": cols,
                    "missing": int(df.isna().sum().sum()),
                    "dupes": int(df.duplicated().sum()),
                }
          `,
          tests: [
            { call: 'profile(pd.read_csv("data/customers_messy.csv"))', expect: '{"rows": 128, "cols": 6, "missing": 53, "dupes": 8}' },
            { call: 'profile(pd.read_csv("data/users.csv"))', name: 'users.csv' },
            { call: 'profile(pd.DataFrame({"a": [1, 1, None], "b": [2, 2, 3]}))', expect: '{"rows": 3, "cols": 2, "missing": 1, "dupes": 1}', hidden: true },
            { call: 'profile(pd.read_csv("data/orders.csv"))', hidden: true },
          ],
          hints: [
            '`rows, cols = df.shape` unpacks the shape.',
            'Missing: `df.isna().sum().sum()`. Duplicates: `df.duplicated().sum()`. Wrap both in `int()`.',
          ],
          wrong: [
            'import pandas as pd\n\ndef profile(df):\n    return {"rows": len(df), "cols": len(df.columns), "missing": int(df.isna().any(axis=1).sum()), "dupes": int(df.duplicated().sum())}\n',
            'import pandas as pd\n\ndef profile(df):\n    return {"rows": len(df), "cols": df.size, "missing": int(df.isna().sum().sum()), "dupes": int(df.duplicated().sum())}\n',
          ],
          explain: '`isna().sum().sum()` counts missing **cells**. `isna().any(axis=1).sum()` would count rows that have at least one gap, a different number. `df.size` is rows × columns, not the number of columns. A profile like this is the first cell of every notebook.',
        },
        {
          type: 'code',
          title: 'Missing-value report',
          prompt: md`
            Write \`missing_report(df)\` returning a Series with the **percentage** of missing values per column (0–100, rounded to 1 decimal). Keep only the columns with at least one missing value, sorted from most to least missing.

            \`\`\`python
            missing_report(pd.read_csv("data/customers_messy.csv"))
            # spend    34.4
            # email     7.0
            \`\`\`
          `,
          starter: py`
            import pandas as pd

            def missing_report(df):
                pass
          `,
          solution: py`
            import pandas as pd

            def missing_report(df):
                pct = df.isna().mean() * 100
                pct = pct[pct > 0].round(1)
                return pct.sort_values(ascending=False)
          `,
          tests: [
            { call: 'missing_report(pd.read_csv("data/customers_messy.csv"))', expect: 'pd.Series({"spend": 34.4, "email": 7.0})' },
            { call: 'missing_report(pd.read_csv("data/users.csv")).to_dict()', expect: '{"age": 5.3, "referrer": 5.3}', name: 'users.csv' },
            { call: 'missing_report(pd.read_csv("data/orders.csv"))', hidden: true, name: 'no missing values → empty' },
            { call: 'missing_report(pd.DataFrame({"a": [None, 1, 2, 3], "b": [None, None, 1, 2], "c": [1, 2, 3, 4]}))', hidden: true },
          ],
          hints: [
            'The mean of a bool column is the share of True values: `df.isna().mean()`.',
            'Multiply by 100, keep `pct[pct > 0]`, round, then `sort_values(ascending=False)`.',
          ],
          wrong: [
            'import pandas as pd\n\ndef missing_report(df):\n    pct = df.isna().mean()\n    return pct[pct > 0].round(1).sort_values(ascending=False)\n',
            'import pandas as pd\n\ndef missing_report(df):\n    pct = (df.isna().mean() * 100).round(1)\n    return pct.sort_values(ascending=False)\n',
            'import pandas as pd\n\ndef missing_report(df):\n    pct = df.isna().mean() * 100\n    return pct[pct > 0].round(1).sort_values()\n',
          ],
          explain: '`isna().mean()` is the share missing, because True counts as 1. This one-liner tells you which columns need a cleaning decision: drop, fill, or keep as "unknown".',
        },
        {
          type: 'learn',
          title: 'Reading big files',
          body: md`
            \`read_csv\` options that matter once files get big:

            - \`usecols=[...]\`: load only the columns you need
            - \`nrows=1000\`: a quick peek at a huge file
            - \`dtype={"country": "category"}\`: repeated text is stored once, with small integer codes
            - \`chunksize=100_000\`: iterate over pieces when the file is bigger than RAM

            \`df.memory_usage(deep=True).sum()\` tells you what a frame really costs in bytes.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv",
                            usecols=["order_id", "country"],
                            nrows=100)
            print(o.shape)
            c = o["country"].astype("category")
            print(c.cat.categories.tolist())
          `,
        },
        {
          type: 'code',
          title: 'A clean loader',
          prompt: md`
            Write \`load_orders(path)\` that reads an orders CSV with:

            - only the columns \`order_id\`, \`order_date\`, \`quantity\`, \`unit_price\`, \`country\` (they appear in this order in the file)
            - \`order_date\` parsed as a datetime
            - \`country\` stored as a \`category\`

            and returns the DataFrame.
          `,
          starter: py`
            import pandas as pd

            def load_orders(path):
                pass
          `,
          solution: py`
            import pandas as pd

            def load_orders(path):
                cols = ["order_id", "order_date",
                        "quantity", "unit_price", "country"]
                return pd.read_csv(
                    path, usecols=cols,
                    parse_dates=["order_date"],
                    dtype={"country": "category"})
          `,
          tests: [
            { call: 'load_orders("data/orders.csv").columns.tolist()', expect: '["order_id", "order_date", "quantity", "unit_price", "country"]' },
            { assert: 'pd.api.types.is_datetime64_any_dtype(load_orders("data/orders.csv")["order_date"])', name: 'order_date is a datetime' },
            { assert: 'isinstance(load_orders("data/orders.csv")["country"].dtype, pd.CategoricalDtype)', name: 'country is a category' },
            { call: 'load_orders("data/orders.csv")', hidden: true, name: 'the whole frame' },
          ],
          hints: [
            'All three requirements are `read_csv` arguments: `usecols`, `parse_dates` and `dtype`.',
            '`dtype={"country": "category"}`',
          ],
          wrong: [
            'import pandas as pd\n\ndef load_orders(path):\n    cols = ["order_id", "order_date", "quantity", "unit_price", "country"]\n    return pd.read_csv(path, usecols=cols, dtype={"country": "category"})\n',
            'import pandas as pd\n\ndef load_orders(path):\n    cols = ["order_id", "order_date", "quantity", "unit_price", "country"]\n    return pd.read_csv(path, usecols=cols, parse_dates=["order_date"])\n',
          ],
          explain: 'Doing the typing at load time means every later step can trust the dtypes. On a 10 GB file, `usecols` plus `category` can cut memory several-fold, and that is often the difference between "fits on my laptop" and "needs a cluster".',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u12-l3',
      title: 'Selecting Data',
      summary: 'Columns, loc vs iloc, and setting values the safe way.',
      steps: [
        {
          type: 'learn',
          title: 'Columns: [ ] vs [[ ]]',
          body: md`
            \`df["price"]\` gives one column as a **Series**. \`df[["product", "price"]]\` (a *list* of names inside the brackets) gives a **DataFrame** with those columns, in that order.

            \`df.price\` works too, but avoid it in real code: it breaks for names with spaces and for names that clash with methods (\`df.count\`, \`df.size\`).
          `,
          code: py`
            import pandas as pd

            df = pd.DataFrame({"product": ["Mug", "Lamp"],
                               "price": [8.9, 35.0],
                               "qty": [3, 1]})
            print(df["price"])
            print(df[["qty", "product"]])
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
            one, many = df["a"], df[["a"]]
            print(type(one).__name__, type(many).__name__)
          `,
          options: ['Series DataFrame', 'Series Series', 'DataFrame DataFrame', 'DataFrame Series'],
          answer: 0,
          checkOutput: true,
          explain: 'One name → a Series. A list of names → always a DataFrame, even if the list has only one name. It matters because many methods (merges, `to_csv` with headers) need a DataFrame.',
        },
        {
          type: 'learn',
          title: 'loc: select by label',
          body: md`
            \`df.loc[rows, cols]\` selects by **label**: index labels for the rows, column names for the columns.

            - \`df.loc["lamp"]\`: one row
            - \`df.loc[["mug", "tea"], "price"]\`: some rows, one column
            - \`df.loc["mug":"tea"]\`: a label slice **includes both ends**
            - \`df.loc[mask, "price"]\`: the rows where a bool mask is True
          `,
          code: py`
            import pandas as pd

            idx = ["mug", "lamp", "tea", "pot"]
            df = pd.DataFrame({"price": [8.9, 35.0, 6.5, 12.0]},
                              index=idx)
            print(df.loc["lamp", "price"])
            print(df.loc["lamp":"tea", "price"].tolist())
            print(df.loc[df["price"] > 10, "price"].tolist())
          `,
        },
        {
          type: 'learn',
          title: 'iloc: select by position',
          body: md`
            \`df.iloc[rows, cols]\` selects by **integer position**, exactly like NumPy: \`df.iloc[0]\` is the first row, \`df.iloc[-1]\` the last, \`df.iloc[:3, 1:]\` a block. Slices **exclude** the end, like Python.

            With the default 0, 1, 2 … index, \`loc\` and \`iloc\` look the same. After sorting (\`df.sort_values("col")\`) or filtering, labels and positions no longer match, and mixing them up is a classic bug.
          `,
          code: py`
            import pandas as pd

            df = pd.DataFrame({"city": ["Rome", "Oslo", "Bern"],
                               "pop": [2.8, 0.7, 0.1]})
            print(df.iloc[0])
            print(df.iloc[-1, 0])
            print(df.iloc[:2, 1].tolist())
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"v": [1, 2, 3, 4]},
                              index=["a", "b", "c", "d"])
            print(df.loc["b":"d", "v"].tolist())
            print(df.iloc[1:3, 0].tolist())
            print(df.iloc[-1, 0])
          `,
          answer: '[2, 3, 4]\n[2, 3]\n4',
          explain: 'The label slice `"b":"d"` includes d. The position slice `1:3` stops before position 3.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"x": [30, 10, 20]})
            s = df.sort_values("x")
            print(s.loc[0, "x"], s.iloc[0, 0])
          `,
          options: ['30 10', '10 10', '10 30', '30 30'],
          answer: 0,
          checkOutput: true,
          explain: 'Sorting moves rows but keeps their labels. Label 0 still belongs to the row with 30, while position 0 is now the row with 10. Use `loc` for "this label" and `iloc` for "the n-th row".',
        },
        {
          type: 'learn',
          title: 'Setting values safely',
          body: md`
            Change values with **one** \`loc\` call: \`df.loc[mask, "col"] = value\`. That modifies \`df\` itself.

            Never chain two indexers: \`df[mask]["col"] = value\`. The first \`[ ]\` builds a temporary new frame, and you change *that*. pandas 3 uses **Copy-on-Write**, so chained assignment never changes \`df\`. (Older pandas sometimes did and sometimes didn't, with a \`SettingWithCopyWarning\`.)

            To leave a caller's frame untouched, start your function with \`df = df.copy()\`.
          `,
          code: py`
            import pandas as pd

            df = pd.DataFrame({"qty": [1, 5, 2],
                               "flag": ["", "", ""]})
            df.loc[df["qty"] >= 2, "flag"] = "multi"
            print(df)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"x": [1, 2, 3], "y": [0, 0, 0]})
            df[df["x"] > 1]["y"] = 9
            print(df["y"].tolist())
          `,
          options: ['[0, 0, 0]', '[0, 9, 9]', '[9, 9, 9]', 'SettingWithCopyError'],
          answer: 0,
          checkOutput: true,
          explain: '`df[df["x"] > 1]` builds a new frame, and the 9s land in that temporary object. pandas 3 even warns with a `ChainedAssignmentError`. `df.loc[df["x"] > 1, "y"] = 9` gives `[0, 9, 9]`. Interviewers love this one because it bites real pipelines.',
        },
        {
          type: 'blanks',
          prompt: 'Mark every order with 4 or more items as bulk.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"qty": [1, 4, 6]})
            df["bulk"] = False
            df.___[df["qty"] >= 4, ___] = True
            print(df["bulk"].tolist())
          `,
          bank: ['loc', '"bulk"', 'iloc', '"qty"', 'at', 'bulk'],
          answer: ['loc', '"bulk"'],
          tests: [{ stdout: '[False, True, True]\n' }],
          explain: '`loc` takes a mask for the rows and a column **name** (a string) for the column. `iloc` would need integer positions instead of a mask.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines: return a copy where cancelled orders have quantity 0, without touching the input.',
          setup: 'import pandas as pd',
          lines: [
            'def zero_cancelled(df):',
            '    df = df.copy()',
            '    gone = df["status"] == "cancelled"',
            '    df.loc[gone, "quantity"] = 0',
            '    return df',
          ],
          distractors: ['    df[gone]["quantity"] = 0'],
          tests: [{ call: 'zero_cancelled(pd.DataFrame({"status": ["cancelled", "completed"], "quantity": [2, 3]}))["quantity"].tolist()', expect: '[0, 3]' }],
          explain: 'Copy first, build the mask, then set the values with a single `loc` call. The distractor is chained assignment, which silently does nothing.',
        },
        {
          type: 'code',
          title: 'Order lookup',
          prompt: md`
            Write \`lookup(df, ids)\` that takes the orders table and a list of order ids, and returns the \`product\` and \`quantity\` of those orders **in the order of \`ids\`**, as a DataFrame indexed by \`order_id\`.

            An unknown id should raise a \`KeyError\` (that's what \`loc\` does).

            \`\`\`python
            lookup(orders, [1003, 1001])
            #             product  quantity
            # order_id
            # 1003      Olive Oil         1
            # 1001      Dumbbells         1
            \`\`\`
          `,
          setup: ORDERS,
          starter: py`
            def lookup(df, ids):
                pass
          `,
          solution: py`
            def lookup(df, ids):
                by_id = df.set_index("order_id")
                return by_id.loc[ids, ["product", "quantity"]]
          `,
          tests: [
            { call: 'lookup(orders, [1003, 1001])', name: 'two ids, in the given order' },
            { call: 'lookup(orders, [1005]).shape', expect: '(1, 2)' },
            { call: 'lookup(orders, [2200, 1500, 1001])', hidden: true },
            { call: 'lookup(orders, [9999])', raises: 'KeyError', hidden: true, name: 'unknown id raises KeyError' },
          ],
          hints: [
            'Make `order_id` the index first: `df.set_index("order_id")`.',
            'Then `.loc[ids, ["product", "quantity"]]`: a list of labels for the rows and a list of names for the columns.',
          ],
          wrong: [
            'def lookup(df, ids):\n    return df.iloc[ids][["product", "quantity"]]\n',
            'def lookup(df, ids):\n    rows = df[df["order_id"].isin(ids)]\n    return rows.set_index("order_id")[["product", "quantity"]]\n',
            'def lookup(df, ids):\n    return df.set_index("order_id").loc[ids]\n',
          ],
          explain: 'With a meaningful index, `loc` is a fast keyed lookup (hash-based, like a dict) that returns rows in the order you asked for. `iloc` would treat 1003 as a *position* and fail. Filtering with a mask returns rows in table order instead.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the VIP flag',
          prompt: md`
            \`flag_vip(df)\` should return a **copy** of the orders with a new bool column \`vip\`, True when \`quantity * unit_price\` is **at least 150**. It must not change the caller's frame.

            Right now \`vip\` is never True, **and** the caller's frame gets the new column. Fix both bugs.
          `,
          setup: ORDERS,
          starter: py`
            def flag_vip(df):
                df["vip"] = False
                big = df["quantity"] * df["unit_price"] >= 150
                df[big]["vip"] = True
                return df
          `,
          solution: py`
            def flag_vip(df):
                df = df.copy()
                df["vip"] = False
                big = df["quantity"] * df["unit_price"] >= 150
                df.loc[big, "vip"] = True
                return df
          `,
          tests: [
            { call: 'flag_vip(pd.DataFrame({"quantity": [2, 1], "unit_price": [80.0, 20.0]}))["vip"].tolist()', expect: '[True, False]' },
            { code: 'o = pd.read_csv("data/orders.csv")\nflag_vip(o)\nassert "vip" not in o.columns', name: 'does not modify the input' },
            { call: 'flag_vip(pd.DataFrame({"quantity": [1, 3], "unit_price": [150.0, 49.9]}))["vip"].tolist()', expect: '[True, False]', hidden: true, name: 'exactly 150 counts' },
            { call: 'flag_vip(orders.head(60))', hidden: true },
          ],
          hints: [
            '`df[big]["vip"] = True` is chained assignment. Use `df.loc[big, "vip"] = True`.',
            'Start with `df = df.copy()` so the caller\'s frame is never touched.',
          ],
          wrong: [
            'def flag_vip(df):\n    df["vip"] = False\n    big = df["quantity"] * df["unit_price"] >= 150\n    df.loc[big, "vip"] = True\n    return df\n',
            'def flag_vip(df):\n    df = df.copy()\n    df["vip"] = False\n    big = df["quantity"] * df["unit_price"] >= 150\n    df[big]["vip"] = True\n    return df\n',
          ],
          explain: 'Two classic bugs. Chained assignment writes into a temporary copy. Mutating the argument changes the caller\'s data, so running a notebook cell twice suddenly gives different results. Even simpler: `df = df.copy()` then `df["vip"] = df["quantity"] * df["unit_price"] >= 150`.',
        },
        {
          type: 'code',
          title: 'Country discount',
          prompt: md`
            Write \`discount(df, country, pct)\` returning a **copy** of the orders where \`unit_price\` is reduced by \`pct\` percent (rounded to 2 decimals), **only** for orders from \`country\`. Other rows stay exactly as they were, and the input frame must not change.

            \`\`\`python
            d = discount(orders, "HR", 10)
            # an HR price of 39.90 becomes 35.91
            \`\`\`
          `,
          setup: ORDERS,
          starter: py`
            def discount(df, country, pct):
                pass
          `,
          solution: py`
            def discount(df, country, pct):
                df = df.copy()
                rows = df["country"] == country
                old = df.loc[rows, "unit_price"]
                new = old * (1 - pct / 100)
                df.loc[rows, "unit_price"] = new.round(2)
                return df
          `,
          tests: [
            { call: 'discount(orders, "HR", 10)', name: '10 % off in HR' },
            { code: 'o = pd.read_csv("data/orders.csv")\ndiscount(o, "DE", 50)\nassert o.equals(pd.read_csv("data/orders.csv"))', name: 'does not modify the input' },
            { call: 'discount(orders.head(40), "DE", 25)', hidden: true },
            { call: 'discount(orders, "XX", 50).equals(orders)', expect: 'True', hidden: true, name: 'unknown country changes nothing' },
          ],
          hints: [
            'Build the mask `rows = df["country"] == country` on a copy of the frame.',
            'Compute the new prices for those rows, `.round(2)` them, and write them back with `df.loc[rows, "unit_price"] = ...`.',
          ],
          wrong: [
            'def discount(df, country, pct):\n    df = df.copy()\n    df["unit_price"] = (df["unit_price"] * (1 - pct / 100)).round(2)\n    return df\n',
            'def discount(df, country, pct):\n    df = df.copy()\n    rows = df["country"] == country\n    df.loc[rows, "unit_price"] = (df.loc[rows, "unit_price"] * pct / 100).round(2)\n    return df\n',
            'def discount(df, country, pct):\n    rows = df["country"] == country\n    df.loc[rows, "unit_price"] = (df.loc[rows, "unit_price"] * (1 - pct / 100)).round(2)\n    return df\n',
          ],
          explain: '`df.loc[mask, col] = values` writes only into the masked rows, and the right-hand side is aligned by index label. A function that copies and returns a new frame is easy to test and safe to rerun.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u12-l4',
      title: 'Filtering Rows',
      summary: 'Answer real questions with masks, isin, between, str.contains and query.',
      steps: [
        {
          type: 'learn',
          title: 'Boolean masks on DataFrames',
          body: md`
            Filtering works like NumPy masks: \`df[mask]\` keeps the rows where the mask is True.

            Combine conditions with \`&\`, \`|\`, \`~\` and **parentheses around each condition**. Python's \`and\`/\`or\` raise a ValueError on a Series.

            A filtered frame keeps its original index labels. Call \`reset_index(drop=True)\` if you want 0, 1, 2 … again.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            de = o[o["country"] == "DE"]
            big_de = o[(o["country"] == "DE")
                       & (o["quantity"] >= 3)]
            print(len(o), len(de), len(big_de))
            print(big_de.index[:3].tolist())
          `,
        },
        {
          type: 'choice',
          prompt: 'Which filter is written correctly?',
          options: [
            'd[(d["q"] > 2) & (d["c"] == "DE")]',
            'd[d["q"] > 2 & d["c"] == "DE"]',
            'd[(d["q"] > 2) and (d["c"] == "DE")]',
            'd[d["q"] > 2, d["c"] == "DE"]',
          ],
          answer: 0,
          explain: 'Without parentheses, `&` binds first: `2 & d["q"]` is evaluated, then a chained comparison that raises. `and` raises "The truth value of a Series is ambiguous". A comma means "rows, columns", which is something else entirely.',
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"n": [5, 12, 7, 20],
                               "t": ["a", "b", "a", "b"]})
            print(len(df[(df["n"] > 6) | (df["t"] == "a")]))
            print(df[~(df["t"] == "a")]["n"].tolist())
          `,
          answer: '4\n[12, 20]',
          explain: 'Every row is either above 6 or of type a, so `|` keeps all 4. `~` flips the mask and keeps the b rows.',
        },
        {
          type: 'learn',
          title: 'isin, between and .str',
          body: md`
            - \`s.isin(["DE", "FR"])\`: membership in a list (SQL's \`IN\`)
            - \`s.between(10, 50)\`: **inclusive** on both ends by default
            - \`s.str.contains("mug", case=False)\`: text search (also \`.str.startswith\`, \`.str.endswith\`)

            Each returns a bool mask, so they combine with \`&\`, \`|\`, \`~\` as usual. With pandas 3's \`str\` dtype, missing text simply doesn't match.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            eu = o[o["country"].isin(["DE", "FR", "IT"])]
            mid = o[o["unit_price"].between(10, 20)]
            m = o["product"].str.contains("book", case=False)
            print(len(eu), len(mid))
            print(o.loc[m, "product"].unique().tolist())
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            s = pd.Series([1, 5, 10, 15])
            print(s.between(5, 10).sum(), s.isin([1, 15]).sum())
          `,
          options: ['2 2', '1 2', '2 0', '3 2'],
          answer: 0,
          checkOutput: true,
          explain: '`between` includes both ends, so 5 and 10 match. `isin` checks membership: 1 and 15. Use `inclusive="left"`, `"right"` or `"neither"` to change the bounds.',
        },
        {
          type: 'learn',
          title: 'query()',
          body: md`
            \`df.query("...")\` writes the filter as a string that reads almost like SQL:

            \`\`\`python
            o.query("country == 'DE' and quantity >= 3")
            \`\`\`

            Inside \`query\`, \`and\`/\`or\`/\`not\` and \`in [...]\` are fine. Refer to Python variables with \`@\`: \`o.query("unit_price > @limit")\`.

            It's handy for long filters in notebooks. Plain masks are easier to build step by step inside functions.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            limit = 100
            big = o.query("unit_price * quantity > @limit")
            print(len(big))
            print(len(o.query("country in ['HR', 'NL']")))
          `,
        },
        {
          type: 'blanks',
          prompt: 'Keep the orders below the threshold stored in `max_price`, and check the result against a mask.',
          code: py`
            import pandas as pd
            o = pd.read_csv("data/orders.csv")
            max_price = 10
            cheap = o.query("unit_price < ___max_price")
            mask = o["unit_price"] < max_price
            print(len(cheap) == mask.___())
          `,
          bank: ['@', 'sum', '$', 'len', '#', 'count'],
          answer: ['@', 'sum'],
          tests: [{ stdout: 'True\n' }],
          explain: '`@name` pulls a Python variable into the query. `mask.sum()` counts the True rows. `mask.count()` would count *all* non-missing values, 1200.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines to count the cancelled Electronics orders.',
          lines: [
            'import pandas as pd',
            'o = pd.read_csv("data/orders.csv")',
            'elec = o[o["category"] == "Electronics"]',
            'gone = elec[elec["status"] == "cancelled"]',
            'print(len(gone))',
          ],
          distractors: ['gone = elec[elec["status"] = "cancelled"]'],
          tests: [{ stdout: true }],
          explain: 'Filtering step by step works too: each filter narrows the previous result. Comparison needs `==`, and a single `=` is a SyntaxError inside brackets.',
        },
        {
          type: 'code',
          title: 'Completed DE orders over €50',
          prompt: md`
            Write \`big_de(df)\` that returns the **completed** orders from **DE** whose order value (\`quantity * unit_price\`) is **over 50**.

            Return the matching rows with all their original columns and their **original index**.
          `,
          setup: ORDERS,
          starter: py`
            def big_de(df):
                pass
          `,
          solution: py`
            def big_de(df):
                value = df["quantity"] * df["unit_price"]
                keep = ((df["status"] == "completed")
                        & (df["country"] == "DE")
                        & (value > 50))
                return df[keep]
          `,
          tests: [
            { call: 'big_de(orders)', name: 'the full orders table' },
            { call: 'big_de(orders.iloc[600:])', hidden: true, name: 'second half of the year' },
            { call: 'len(big_de(pd.DataFrame({"status": ["completed"] * 2, "country": ["DE", "DE"], "quantity": [1, 2], "unit_price": [50.0, 25.5]})))', expect: '1', hidden: true, name: 'exactly 50 is not over 50' },
          ],
          hints: [
            'Compute `value = df["quantity"] * df["unit_price"]` first.',
            'Three conditions, each in parentheses, joined with `&`. Return `df[keep]` without resetting the index.',
          ],
          wrong: [
            'def big_de(df):\n    value = df["quantity"] * df["unit_price"]\n    return df[(df["country"] == "DE") & (value > 50)]\n',
            'def big_de(df):\n    return df[(df["status"] == "completed") & (df["country"] == "DE") & (df["unit_price"] > 50)]\n',
            'def big_de(df):\n    value = df["quantity"] * df["unit_price"]\n    keep = (df["status"] == "completed") & (df["country"] == "DE") & (value >= 50)\n    return df[keep]\n',
          ],
          explain: 'Spell out each part of the question as its own mask, then combine them. Forgetting the status filter is the most common analytics bug: cancelled orders inflate every number. Using `unit_price` instead of the order value answers a different question.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the filter',
          prompt: md`
            \`returns_in(df, countries)\` should return the **number** of **returned** orders from any of the given countries (a list of codes). It crashes. Fix it.
          `,
          setup: ORDERS,
          starter: py`
            def returns_in(df, countries):
                rows = df[df["status"] == "returned" &
                          df["country"] in countries]
                return len(rows)
          `,
          solution: py`
            def returns_in(df, countries):
                m = ((df["status"] == "returned")
                     & df["country"].isin(countries))
                return int(m.sum())
          `,
          tests: [
            { call: 'returns_in(orders, ["DE", "FR"])', name: 'DE and FR' },
            { call: 'returns_in(orders, [])', expect: '0', name: 'empty list' },
            { call: 'returns_in(orders, ["US"])', hidden: true },
            { call: 'returns_in(orders.head(500), ["UK", "ES", "NL"])', hidden: true },
          ],
          hints: [
            '`"returned" & df["country"]` runs first, because `&` binds tighter than `==`. Add parentheses.',
            '`x in countries` asks one yes/no question about the whole Series. Use `df["country"].isin(countries)` for a per-row mask.',
          ],
          wrong: [
            'def returns_in(df, countries):\n    m = (df["status"] == "returned") | df["country"].isin(countries)\n    return int(m.sum())\n',
            'def returns_in(df, countries):\n    return int(df["country"].isin(countries).sum())\n',
          ],
          explain: 'Two classic errors in one line: missing parentheses around the comparison, and Python\'s `in`, which tests a whole container instead of each row. `isin` is the vectorised membership test.',
        },
        {
          type: 'code',
          title: 'Product search',
          prompt: md`
            Write \`search(df, word)\` returning how many **completed** orders have a product name that **contains** \`word\`, ignoring upper/lower case.

            \`\`\`python
            search(orders, "MUG")  # counts the Mug orders
            \`\`\`
          `,
          setup: ORDERS,
          starter: py`
            def search(df, word):
                pass
          `,
          solution: py`
            def search(df, word):
                p = df["product"]
                hit = p.str.contains(word, case=False)
                done = df["status"] == "completed"
                return int((hit & done).sum())
          `,
          tests: [
            { call: 'search(orders, "MUG")', name: 'MUG' },
            { call: 'search(orders, "zzz")', expect: '0' },
            { call: 'search(orders, "book")', hidden: true },
            { call: 'search(orders, "o")', hidden: true },
          ],
          hints: [
            '`.str.contains(word, case=False)` gives a mask.',
            'Combine it with `df["status"] == "completed"` using `&`, then `.sum()`.',
          ],
          wrong: [
            'def search(df, word):\n    hit = df["product"].str.contains(word)\n    return int((hit & (df["status"] == "completed")).sum())\n',
            'def search(df, word):\n    return int(df["product"].str.contains(word, case=False).sum())\n',
            'def search(df, word):\n    hit = df["product"].str.lower() == word.lower()\n    return int((hit & (df["status"] == "completed")).sum())\n',
          ],
          explain: '`contains` matches substrings, so "book" finds "Cookbook" and "Data Science Handbook". Decide whether that\'s what you want, and use `==` for exact matches. By default the pattern is a **regular expression**. Pass `regex=False` when users type characters like `(` or `+`.',
        },
        {
          type: 'code',
          title: 'Find the promo candidates',
          prompt: md`
            Marketing wants **Books** and **Toys** orders that were **not cancelled**, with a \`unit_price\` between 15 and 40 (**inclusive**), from any country in \`countries\`.

            Write \`promo(df, countries)\` returning the **sorted list** of the matching \`order_id\`s.
          `,
          setup: ORDERS,
          starter: py`
            def promo(df, countries):
                pass
          `,
          solution: py`
            def promo(df, countries):
                m = (df["category"].isin(["Books", "Toys"])
                     & (df["status"] != "cancelled")
                     & df["unit_price"].between(15, 40)
                     & df["country"].isin(countries))
                return sorted(df.loc[m, "order_id"].tolist())
          `,
          tests: [
            { call: 'promo(orders, ["HR"])', name: 'HR' },
            { call: 'promo(orders.head(0), ["DE"])', expect: '[]', name: 'empty table' },
            { call: 'promo(orders, ["DE", "UK", "NL"])', hidden: true },
            { call: 'promo(orders, ["US", "FR", "ES", "IT"])', hidden: true },
            { call: 'promo(pd.DataFrame({"order_id": [1, 2, 3], "category": ["Books", "Toys", "Books"], "status": ["completed", "returned", "cancelled"], "unit_price": [15.0, 40.0, 20.0], "country": ["DE", "DE", "DE"]}), ["DE"])', expect: '[1, 2]', hidden: true, name: 'bounds are inclusive, returned counts' },
          ],
          hints: [
            'Four masks: `isin` for the categories, `!= "cancelled"`, `between(15, 40)`, and `isin(countries)`.',
            'Select the ids with `df.loc[m, "order_id"]`, then `sorted(...tolist())`.',
          ],
          wrong: [
            'def promo(df, countries):\n    m = df["category"].isin(["Books", "Toys"]) & df["unit_price"].between(15, 40) & df["country"].isin(countries)\n    return sorted(df.loc[m, "order_id"].tolist())\n',
            'def promo(df, countries):\n    m = df["category"].isin(["Books", "Toys"]) & (df["status"] == "completed") & df["unit_price"].between(15, 40) & df["country"].isin(countries)\n    return sorted(df.loc[m, "order_id"].tolist())\n',
            'def promo(df, countries):\n    m = df["category"].isin(["Books", "Toys"]) & (df["status"] != "cancelled") & df["unit_price"].between(15, 40, inclusive="neither") & df["country"].isin(countries)\n    return sorted(df.loc[m, "order_id"].tolist())\n',
          ],
          explain: '"Not cancelled" is not the same as "completed": returned orders count here. Read every word of a filter spec, since interviewers write them to test exactly this. Naming each mask on its own line keeps long filters reviewable.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u12-l5',
      title: 'New Columns & Sorting',
      summary: 'Derive columns the vectorised way, then sort and tidy the result.',
      steps: [
        {
          type: 'learn',
          title: 'Vectorised new columns',
          body: md`
            Create a column by assigning a vectorised expression: \`df["revenue"] = df["quantity"] * df["unit_price"]\`. pandas computes the whole column in one go, without a loop.

            \`df.assign(name=...)\` does the same but **returns a new frame** and leaves \`df\` alone, which is what you want in method chains. Inside \`assign\`, a \`lambda d: ...\` receives the frame as it is at that point.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            o["revenue"] = o["quantity"] * o["unit_price"]
            o2 = o.assign(vat=lambda d: d["revenue"] * 0.2)
            print(o2[["revenue", "vat"]].head(3))
            print("vat" in o.columns)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"q": [2, 3], "p": [1.5, 4.0]})
            out = df.assign(total=df["q"] * df["p"])
            print(out["total"].tolist())
            print(df.columns.tolist())
          `,
          answer: "[3.0, 12.0]\n['q', 'p']",
          explain: '`assign` returned a new frame with the extra column. The original `df` still has only `q` and `p`.',
        },
        {
          type: 'learn',
          title: 'Conditional columns: where, map, apply',
          body: md`
            - \`np.where(cond, a, b)\`: vectorised if/else, the fastest option
            - \`s.map({"DE": "EU", ...})\`: look each value up in a dict (unknown → NaN)
            - \`s.apply(func)\` / \`df.apply(func, axis=1)\`: calls a Python function **once per value or row**. Flexible, but it runs at loop speed, often 50–100× slower

            Rule of thumb: vectorised operations first, \`apply\` last.
          `,
          code: py`
            import numpy as np
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            o["size"] = np.where(o["quantity"] >= 3,
                                 "bulk", "single")
            region = {"DE": "EU", "FR": "EU", "US": "NA"}
            o["region"] = o["country"].map(region)
            print(o[["country", "region", "size"]].head(4))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            s = pd.Series(["DE", "US", "XX"])
            print(s.map({"DE": "EU", "US": "NA"}).tolist())
          `,
          options: ["['EU', 'NA', nan]", "['EU', 'NA', 'XX']", "['EU', 'NA']", 'KeyError: XX'],
          answer: 0,
          checkOutput: true,
          explain: '`map` with a dict returns NaN for keys it doesn\'t know. It doesn\'t raise and it doesn\'t keep the original value. Check `.isna().sum()` after mapping, or use `s.map(d).fillna(s)` to keep unknown values.',
        },
        {
          type: 'choice',
          prompt: 'Why is `df["a"] * df["b"]` usually much faster than `df.apply(lambda r: r["a"] * r["b"], axis=1)`?',
          options: ['apply calls Python once per row', 'apply writes the frame to disk', 'apply sorts the rows first', 'They are equally fast'],
          answer: 0,
          explain: '`apply(axis=1)` builds a Series for every row and runs your lambda in the interpreter. The vectorised version is one C loop over two arrays. In this engine, 24,000 rows take about 170 ms with `apply` and about 2 ms vectorised.',
        },
        {
          type: 'learn',
          title: 'Sorting and tidying',
          body: md`
            - \`df.sort_values("revenue", ascending=False)\`: sort rows by a column
            - \`df.sort_values(["country", "revenue"], ascending=[True, False])\`: several keys, each with its own direction
            - \`df.nlargest(5, "revenue")\`: the top 5 rows, faster than a full sort
            - \`df.sort_index()\`: back to index order

            Then tidy up with \`rename(columns={"old": "new"})\` and \`drop(columns=[...])\`.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            o["revenue"] = o["quantity"] * o["unit_price"]
            top = o.sort_values(["country", "revenue"],
                                ascending=[True, False])
            print(top[["country", "revenue"]].head(3))
            print(o.nlargest(2, "revenue")["order_id"].tolist())
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"name": ["a", "b", "c", "d"],
                               "team": ["x", "y", "x", "y"],
                               "pts": [3, 5, 9, 7]})
            s = df.sort_values(["team", "pts"],
                               ascending=[True, False])
            print(s["name"].tolist())
          `,
          answer: "['c', 'a', 'd', 'b']",
          explain: 'Team x comes first (A→Z), and inside it the higher points: c (9), then a (3). Then team y: d (7), b (5).',
        },
        {
          type: 'blanks',
          prompt: 'Sort by country A→Z, and within each country by revenue, highest first.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"country": ["US", "DE", "DE"],
                               "revenue": [50, 20, 90]})
            s = df.sort_values(["country", "revenue"],
                               ascending=[___, ___])
            print(s["revenue"].tolist())
          `,
          bank: ['True', 'False', 'None', '"asc"', '0'],
          answer: ['True', 'False'],
          tests: [{ stdout: '[90, 20, 50]\n' }],
          explain: 'One direction per key: country ascending, revenue descending.',
        },
        {
          type: 'code',
          title: 'Revenue columns',
          prompt: md`
            Write \`add_revenue(df)\` that returns a **new** frame (don't modify \`df\`) with two extra columns at the end:

            - \`revenue\` = quantity × unit_price, rounded to 2 decimals
            - \`big\` = True when revenue is **at least 100**
          `,
          setup: ORDERS,
          starter: py`
            def add_revenue(df):
                pass
          `,
          solution: py`
            def add_revenue(df):
                rev = df["quantity"] * df["unit_price"]
                rev = rev.round(2)
                return df.assign(revenue=rev,
                                 big=rev >= 100)
          `,
          tests: [
            { call: 'add_revenue(pd.DataFrame({"quantity": [2, 1], "unit_price": [50.0, 9.99]}))', expect: 'pd.DataFrame({"quantity": [2, 1], "unit_price": [50.0, 9.99], "revenue": [100.0, 9.99], "big": [True, False]})' },
            { call: 'add_revenue(orders)', name: 'the orders table' },
            { code: 'o = pd.read_csv("data/orders.csv")\nadd_revenue(o)\nassert "revenue" not in o.columns', name: 'does not modify the input', hidden: true },
          ],
          hints: [
            'Compute `rev = (df["quantity"] * df["unit_price"]).round(2)`.',
            '`df.assign(revenue=rev, big=rev >= 100)` returns a new frame with both columns.',
          ],
          wrong: [
            'def add_revenue(df):\n    rev = (df["quantity"] * df["unit_price"]).round(2)\n    return df.assign(revenue=rev, big=rev > 100)\n',
            'def add_revenue(df):\n    df["revenue"] = (df["quantity"] * df["unit_price"]).round(2)\n    df["big"] = df["revenue"] >= 100\n    return df\n',
          ],
          explain: '`assign` never touches the original, so the function is safe to call twice. Keyword arguments become columns in the order you write them.',
        },
        {
          type: 'code',
          title: 'Top orders',
          prompt: md`
            Write \`top_orders(df, n)\` returning the \`n\` **completed** orders with the highest revenue (quantity × unit_price):

            - columns \`order_id\`, \`product\`, \`revenue\` (rounded to 2)
            - highest revenue first, ties broken by the **smaller** \`order_id\`
            - a fresh 0 … n−1 index (\`reset_index(drop=True)\`)
          `,
          setup: ORDERS,
          starter: py`
            def top_orders(df, n):
                pass
          `,
          solution: py`
            def top_orders(df, n):
                d = df[df["status"] == "completed"]
                rev = d["quantity"] * d["unit_price"]
                d = d.assign(revenue=rev.round(2))
                d = d.sort_values(["revenue", "order_id"],
                                  ascending=[False, True])
                cols = ["order_id", "product", "revenue"]
                return d[cols].head(n).reset_index(drop=True)
          `,
          tests: [
            { call: 'top_orders(orders, 5)', name: 'top 5' },
            { call: 'len(top_orders(orders, 3))', expect: '3' },
            { call: 'top_orders(orders, 40)', hidden: true, name: 'top 40 (many ties)' },
            { call: 'top_orders(orders.iloc[:300], 3)', hidden: true },
          ],
          hints: [
            'Filter completed orders, add the revenue column, then sort by `["revenue", "order_id"]` with `ascending=[False, True]`.',
            'Select the three columns, `.head(n)`, then `.reset_index(drop=True)`.',
          ],
          wrong: [
            'def top_orders(df, n):\n    d = df.assign(revenue=(df["quantity"] * df["unit_price"]).round(2))\n    d = d.sort_values(["revenue", "order_id"], ascending=[False, True])\n    return d[["order_id", "product", "revenue"]].head(n).reset_index(drop=True)\n',
            'def top_orders(df, n):\n    d = df[df["status"] == "completed"]\n    d = d.assign(revenue=(d["quantity"] * d["unit_price"]).round(2))\n    d = d.sort_values(["revenue", "order_id"], ascending=[False, True])\n    return d[["order_id", "product", "revenue"]].head(n)\n',
          ],
          explain: 'Always define a tie-breaker. Many orders share the same revenue, and without one the "top 40" can change between runs or library versions. `nlargest(n, "revenue")` keeps the first of tied rows, which works here only because the table is already in order_id order.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Ditch the apply',
          prompt: md`
            This works, but it's slow on big tables because \`apply\` runs Python once per row. Rewrite \`price_band(df)\` **without \`apply\` and without loops**, returning the same Series of labels with \`df\`'s index:

            - \`"budget"\` when unit_price < 15
            - \`"mid"\` when 15 ≤ unit_price < 50
            - \`"premium"\` otherwise

            Return plain strings (if you use \`pd.cut\`, add \`.astype(str)\`).
          `,
          setup: ORDERS,
          starter: py`
            def band(p):
                if p < 15:
                    return "budget"
                if p < 50:
                    return "mid"
                return "premium"

            def price_band(df):
                return df["unit_price"].apply(band)
          `,
          solution: py`
            import numpy as np
            import pandas as pd

            def price_band(df):
                p = df["unit_price"]
                mid = np.where(p < 50, "mid", "premium")
                lab = np.where(p < 15, "budget", mid)
                return pd.Series(lab, index=df.index)
          `,
          tests: [
            { call: 'price_band(pd.DataFrame({"unit_price": [14.99, 15.0, 49.9, 50.0]})).tolist()', expect: '["budget", "mid", "mid", "premium"]', name: 'boundaries' },
            { call: 'price_band(orders)', name: 'the orders table' },
            { call: 'price_band(orders.iloc[100:200])', hidden: true, name: 'keeps the original index' },
          ],
          forbid: ['apply', 'for', 'while'],
          hints: [
            'Nest two `np.where` calls: the "else" branch of the first one is the second one.',
            '`np.where` returns a NumPy array. Wrap it: `pd.Series(lab, index=df.index)`.',
          ],
          wrong: [
            'import numpy as np\nimport pandas as pd\n\ndef price_band(df):\n    p = df["unit_price"]\n    return pd.Series(np.where(p < 15, "budget", np.where(p < 50, "mid", "premium")))\n',
            'import numpy as np\nimport pandas as pd\n\ndef price_band(df):\n    p = df["unit_price"]\n    return pd.Series(np.where(p <= 15, "budget", np.where(p <= 50, "mid", "premium")), index=df.index)\n',
          ],
          explain: '`np.where` evaluates the conditions on whole columns at once. Without `index=df.index` the result gets a fresh 0, 1, 2 … index and would misalign as soon as you assign it to a filtered frame. `pd.cut(p, [0, 15, 50, np.inf], right=False, labels=[...])` is the idiomatic binning alternative.',
        },
        {
          type: 'code',
          title: 'Tidy the report',
          prompt: md`
            Write \`report(df)\` returning a frame ready to show a manager:

            - only **completed** orders
            - columns \`Country\`, \`Product\`, \`Revenue\` (renamed from country and product, and quantity × unit_price rounded to 2)
            - sorted by Country A→Z, then Revenue high → low, then \`order_id\` low → high
            - a fresh 0 … n−1 index
          `,
          setup: ORDERS,
          starter: py`
            def report(df):
                pass
          `,
          solution: py`
            def report(df):
                d = df[df["status"] == "completed"]
                rev = d["quantity"] * d["unit_price"]
                d = d.assign(Revenue=rev.round(2))
                d = d.sort_values(
                    ["country", "Revenue", "order_id"],
                    ascending=[True, False, True])
                d = d.rename(columns={"country": "Country",
                                      "product": "Product"})
                out = d[["Country", "Product", "Revenue"]]
                return out.reset_index(drop=True)
          `,
          tests: [
            { call: 'report(orders)', name: 'the orders table' },
            { call: 'report(orders).columns.tolist()', expect: '["Country", "Product", "Revenue"]' },
            { call: 'report(orders.iloc[::5])', hidden: true },
          ],
          hints: [
            'Sort **before** you drop `order_id`, because it is only needed as the tie-breaker.',
            '`rename(columns={"country": "Country", "product": "Product"})`, select the three columns, then `reset_index(drop=True)`.',
          ],
          wrong: [
            'def report(df):\n    d = df[df["status"] == "completed"]\n    d = d.assign(Revenue=(d["quantity"] * d["unit_price"]).round(2))\n    d = d.sort_values(["country", "Revenue"], ascending=[True, True])\n    d = d.rename(columns={"country": "Country", "product": "Product"})\n    return d[["Country", "Product", "Revenue"]].reset_index(drop=True)\n',
            'def report(df):\n    d = df.assign(Revenue=(df["quantity"] * df["unit_price"]).round(2))\n    d = d.sort_values(["country", "Revenue", "order_id"], ascending=[True, False, True])\n    d = d.rename(columns={"country": "Country", "product": "Product"})\n    return d[["Country", "Product", "Revenue"]].reset_index(drop=True)\n',
          ],
          explain: 'Order of operations matters: filter, derive, sort (with the tie-breaker still present), rename, select, re-index. Presentation-ready tables with clear names and stable ordering are what reviewers and managers actually look at.',
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u12-l6',
      title: 'Cleaning Messy Data',
      summary: 'Fix text, categories, numbers stored as text, missing values and duplicates.',
      steps: [
        {
          type: 'learn',
          title: 'Meet the mess',
          body: md`
            \`data/customers_messy.csv\` looks like a real CRM export: names in random case with stray spaces, the same country spelled many ways, spend stored as text like \`"€1,200.50"\`, missing emails, and duplicate rows.

            Analysts spend a big part of their time here. The trick is to fix **one problem at a time**, with vectorised string methods under \`.str\`.
          `,
          code: py`
            import pandas as pd

            c = pd.read_csv("data/customers_messy.csv")
            print(c.head())
            print(c["country"].unique())
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            c = pd.read_csv("data/customers_messy.csv")
            print(c["country"].nunique())
          `,
          options: ['14', '4', '8', '128'],
          answer: 0,
          checkOutput: true,
          explain: 'There are only 4 real countries (DE, HR, US, FR) but 14 spellings. Any groupby on this column would be garbage until it\'s normalised.',
        },
        {
          type: 'learn',
          title: 'Cleaning text columns',
          body: md`
            String methods work on a whole column at once:

            - \`.str.strip()\` removes spaces at both ends
            - \`.str.lower()\`, \`.str.upper()\`, \`.str.title()\`
            - \`.str.replace("€", "")\`: literal replacement
            - \`.str.split(" ")\`, \`.str[0]\`, \`.str.len()\`

            For categories with many spellings: **canonicalise** first (strip + lower), then \`map\` each variant to one code with a dict. Unmapped values become NaN, so \`isna().sum()\` should be 0 afterwards.
          `,
          code: py`
            import pandas as pd

            s = pd.Series(["  ana HORVAT", "Ben smith "])
            print(s.str.strip().str.title().tolist())
            c = pd.Series([" Germany ", "DE", "croatia"])
            key = c.str.strip().str.lower()
            codes = {"germany": "DE", "de": "DE",
                     "croatia": "HR"}
            print(key.map(codes).tolist())
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            s = pd.Series(["  Ana ", "ANA", "ana", "Ann"])
            print(s.nunique())
            print(s.str.strip().str.lower().nunique())
          `,
          answer: '4\n2',
          explain: 'Raw, all four strings differ. After strip + lower, three of them collapse into "ana", which leaves "ana" and "ann".',
        },
        {
          type: 'blanks',
          prompt: 'Canonicalise the spellings, then map them to a code.',
          code: py`
            import pandas as pd
            s = pd.Series([" France", "fr ", "FRANCE"])
            key = s.str.___().str.___()
            codes = {"france": "FR", "fr": "FR"}
            print(key.map(codes).tolist())
          `,
          bank: ['strip', 'lower', 'upper', 'title', 'split', 'len'],
          answer: ['strip', 'lower'],
          accept: [['lower', 'strip']],
          tests: [{ stdout: "['FR', 'FR', 'FR']\n" }],
          explain: 'Both orders work: spaces don\'t care about case. The dict only needs lower-case keys once the text is canonical.',
        },
        {
          type: 'learn',
          title: 'Text to numbers',
          body: md`
            Numbers stored as text need cleaning before they become floats: remove the currency symbol and the thousands separator, then convert.

            \`pd.to_numeric(s, errors="coerce")\` converts and turns anything unparseable into NaN instead of crashing.

            Note that \`read_csv\` already treats empty cells and markers like \`"n/a"\`, \`"NA"\` and \`"null"\` as missing. That's why some spend values are NaN before you do anything.
          `,
          code: py`
            import pandas as pd

            s = pd.Series(["1200.50", "€1,200.50",
                           None, "oops"])
            t = s.str.replace("€", "").str.replace(",", "")
            print(pd.to_numeric(t, errors="coerce").tolist())
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            s = pd.Series(["1.5", "abc", "3"])
            print(pd.to_numeric(s, errors="coerce").sum())
          `,
          options: ['4.5', 'nan', 'ValueError: Unable to parse "abc"', '1.53'],
          answer: 0,
          checkOutput: true,
          explain: '`errors="coerce"` turns "abc" into NaN, and pandas aggregations **skip NaN** by default (`skipna=True`), giving 1.5 + 3. Without `coerce`, `to_numeric` would raise on "abc".',
        },
        {
          type: 'learn',
          title: 'Missing values and duplicates',
          body: md`
            - \`isna()\` / \`notna()\`: find missing values
            - \`fillna(value)\` fills them, \`dropna(subset=["email"])\` drops the rows missing that column
            - \`drop_duplicates()\` removes exact duplicate rows. Use \`subset=[...]\` and \`keep="first"\`/\`"last"\` to dedupe on a key.
            - \`pd.to_datetime(s, errors="coerce")\`: text → dates, and bad ones become \`NaT\`

            Decide deliberately: is a missing spend "0" or "unknown"? Filling with 0 drags the mean down.
          `,
          code: py`
            import pandas as pd

            c = pd.read_csv("data/customers_messy.csv")
            d = c.drop_duplicates()
            print(len(c), len(d))
            print(len(d.dropna(subset=["email"])))
            dates = pd.to_datetime(d["signup_date"])
            print(dates.min(), dates.max())
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            s = pd.Series([4.0, None, 2.0])
            print(s.mean(), s.fillna(0).mean())
            print(len(s.dropna()))
          `,
          answer: '3.0 2.0\n2',
          explain: '`mean()` skips the missing value: (4 + 2) / 2 = 3. Filling it with 0 makes it a real data point: 6 / 3 = 2. Same data, different answer, so always say how you handled missing values.',
        },
        {
          type: 'code',
          title: 'Clean the names',
          prompt: md`
            Write \`clean_names(s)\` that takes a Series of messy names and returns them with surrounding spaces removed and in Title Case.

            \`\`\`python
            clean_names(pd.Series(["  ana HORVAT"])).tolist()
            # ['Ana Horvat']
            \`\`\`
          `,
          setup: MESSY,
          starter: py`
            import pandas as pd

            def clean_names(s):
                pass
          `,
          solution: py`
            import pandas as pd

            def clean_names(s):
                return s.str.strip().str.title()
          `,
          tests: [
            { call: 'clean_names(pd.Series(["  ana HORVAT", "BEN smith "])).tolist()', expect: '["Ana Horvat", "Ben Smith"]' },
            { call: 'clean_names(c["name"])', name: 'the customers file' },
            { call: 'clean_names(pd.Series(["LEA visser  ", "  mia  "])).tolist()', hidden: true },
          ],
          hints: [
            'Chain two `.str` methods.',
            '`s.str.strip().str.title()`',
          ],
          wrong: [
            'import pandas as pd\n\ndef clean_names(s):\n    return s.str.title()\n',
            'import pandas as pd\n\ndef clean_names(s):\n    return s.str.strip().str.capitalize()\n',
          ],
          explain: '`title()` capitalises every word, while `capitalize()` only the first character of the whole string ("Ana horvat"). Clean keys like names and emails before joining or deduplicating, or "Ana Horvat" and "ana horvat " count as two people.',
        },
        {
          type: 'code',
          title: 'Parse the spend column',
          prompt: md`
            Write \`parse_spend(s)\` that turns spend strings like \`"1200.50"\` and \`"€1,200.50"\` into floats. Missing values, and anything unparseable, become NaN.

            \`\`\`python
            parse_spend(pd.Series(["€1,200.50", "99.9", None])).tolist()
            # [1200.5, 99.9, nan]
            \`\`\`
          `,
          setup: MESSY,
          starter: py`
            import pandas as pd

            def parse_spend(s):
                pass
          `,
          solution: py`
            import pandas as pd

            def parse_spend(s):
                t = s.str.replace("€", "").str.replace(",", "")
                return pd.to_numeric(t, errors="coerce")
          `,
          tests: [
            { call: 'parse_spend(pd.Series(["€1,200.50", "99.9", None]))', expect: 'pd.Series([1200.5, 99.9, None], dtype=float)' },
            { call: 'parse_spend(c["spend"])', name: 'the customers file' },
            { call: 'parse_spend(pd.Series(["€12", "bad", "3,000"]))', hidden: true, name: 'junk and thousands' },
          ],
          hints: [
            'Remove `"€"` and `","` with two `.str.replace` calls.',
            '`pd.to_numeric(t, errors="coerce")` converts and turns junk into NaN.',
          ],
          wrong: [
            'import pandas as pd\n\ndef parse_spend(s):\n    return pd.to_numeric(s.str.replace("€", ""), errors="coerce")\n',
            'import pandas as pd\n\ndef parse_spend(s):\n    return s.str.replace("€", "").str.replace(",", "").astype(float)\n',
          ],
          explain: 'Forgetting the thousands separator is sneaky: with `coerce`, "1,200.50" silently becomes NaN, and your biggest customers disappear from the totals. Always compare the NaN count before and after converting.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the country codes',
          prompt: md`
            \`country_code(s)\` should turn every spelling in the \`country\` column of \`data/customers_messy.csv\` into one of \`DE\`, \`HR\`, \`US\`, \`FR\`. Right now many rows come out as NaN. Fix it so **every** variant maps to a code.
          `,
          setup: MESSY,
          starter: py`
            CODES = {"germany": "DE", "de": "DE",
                     "croatia": "HR", "hr": "HR",
                     "usa": "US", "us": "US",
                     "france": "FR", "fr": "FR"}

            def country_code(s):
                return s.map(CODES)
          `,
          solution: py`
            CODES = {"germany": "DE", "de": "DE",
                     "croatia": "HR", "hr": "HR",
                     "usa": "US", "us": "US",
                     "united states": "US",
                     "france": "FR", "fr": "FR"}

            def country_code(s):
                key = s.str.strip().str.lower()
                return key.map(CODES)
          `,
          tests: [
            { call: 'country_code(c["country"]).isna().sum()', expect: '0', name: 'no country left unmapped' },
            { call: 'country_code(pd.Series([" Germany ", "us"])).tolist()', expect: '["DE", "US"]' },
            { call: 'country_code(c["country"])', hidden: true },
            { call: 'country_code(pd.Series(["United States", "france "])).tolist()', expect: '["US", "FR"]', hidden: true },
          ],
          hints: [
            'Print `s.str.strip().str.lower().unique()` to see every spelling.',
            'Canonicalise before mapping, and add the spelling that is missing from the dict.',
          ],
          wrong: [
            'CODES = {"germany": "DE", "de": "DE", "croatia": "HR", "hr": "HR", "usa": "US", "us": "US", "france": "FR", "fr": "FR"}\n\ndef country_code(s):\n    return s.str.strip().str.lower().map(CODES)\n',
            'CODES = {"germany": "DE", "de": "DE", "croatia": "HR", "hr": "HR", "usa": "US", "us": "US", "united states": "US", "france": "FR", "fr": "FR"}\n\ndef country_code(s):\n    return s.map(CODES)\n',
          ],
          explain: 'Two fixes: canonicalise the text so " Germany " and "germany" become the same key, and complete the dictionary ("united states"). The `isna().sum() == 0` check is what tells you the mapping is complete. Make it an assertion in real pipelines.',
        },
        {
          type: 'code',
          title: 'The full clean-up',
          prompt: md`
            Write \`clean(df)\` that takes the raw customers table and returns a clean one:

            1. drop exact duplicate rows
            2. \`name\`: stripped, Title Case
            3. \`country\`: one of DE / HR / US / FR
            4. \`spend\`: float, with missing values as \`0.0\`
            5. \`signup_date\`: a datetime
            6. a new bool column \`valid_email\` at the end: True when the email is present **and** contains \`"@"\`

            Keep the original column order and reset the index to 0 … n−1.
          `,
          setup: MESSY,
          starter: py`
            import pandas as pd

            CODES = {"germany": "DE", "de": "DE",
                     "croatia": "HR", "hr": "HR",
                     "usa": "US", "us": "US",
                     "united states": "US",
                     "france": "FR", "fr": "FR"}

            def clean(df):
                pass
          `,
          solution: py`
            import pandas as pd

            CODES = {"germany": "DE", "de": "DE",
                     "croatia": "HR", "hr": "HR",
                     "usa": "US", "us": "US",
                     "united states": "US",
                     "france": "FR", "fr": "FR"}

            def clean(df):
                d = df.drop_duplicates().reset_index(drop=True)
                d["name"] = d["name"].str.strip().str.title()
                key = d["country"].str.strip().str.lower()
                d["country"] = key.map(CODES)
                t = d["spend"].str.replace("€", "")
                t = t.str.replace(",", "")
                spend = pd.to_numeric(t, errors="coerce")
                d["spend"] = spend.fillna(0.0)
                d["signup_date"] = pd.to_datetime(
                    d["signup_date"])
                ok = d["email"].str.contains("@")
                d["valid_email"] = ok.fillna(False)
                return d
          `,
          tests: [
            { call: 'len(clean(c))', expect: '120', name: 'duplicates dropped' },
            { call: 'clean(c)["country"].isna().sum()', expect: '0', name: 'every country mapped' },
            { call: 'clean(c)', name: 'the whole clean table' },
            { call: 'clean(c.iloc[::-1])', hidden: true, name: 'rows in reverse order' },
          ],
          hints: [
            'One step per line, in the listed order. Start with `d = df.drop_duplicates().reset_index(drop=True)`.',
            'Spend: two `str.replace` calls, `pd.to_numeric(..., errors="coerce")`, then `.fillna(0.0)`. Email: `d["email"].str.contains("@")`.',
          ],
          wrong: [
            'import pandas as pd\n\nCODES = {"germany": "DE", "de": "DE", "croatia": "HR", "hr": "HR", "usa": "US", "us": "US", "united states": "US", "france": "FR", "fr": "FR"}\n\ndef clean(df):\n    d = df.copy()\n    d["name"] = d["name"].str.strip().str.title()\n    d["country"] = d["country"].str.strip().str.lower().map(CODES)\n    t = d["spend"].str.replace("€", "").str.replace(",", "")\n    d["spend"] = pd.to_numeric(t, errors="coerce").fillna(0.0)\n    d["signup_date"] = pd.to_datetime(d["signup_date"])\n    d["valid_email"] = d["email"].str.contains("@").fillna(False)\n    return d\n',
            'import pandas as pd\n\nCODES = {"germany": "DE", "de": "DE", "croatia": "HR", "hr": "HR", "usa": "US", "us": "US", "united states": "US", "france": "FR", "fr": "FR"}\n\ndef clean(df):\n    d = df.drop_duplicates().reset_index(drop=True)\n    d["name"] = d["name"].str.strip().str.title()\n    d["country"] = d["country"].str.strip().str.lower().map(CODES)\n    t = d["spend"].str.replace("€", "").str.replace(",", "")\n    d["spend"] = pd.to_numeric(t, errors="coerce").fillna(0.0)\n    d["signup_date"] = pd.to_datetime(d["signup_date"])\n    d["valid_email"] = d["email"].notna()\n    return d\n',
            'import pandas as pd\n\nCODES = {"germany": "DE", "de": "DE", "croatia": "HR", "hr": "HR", "usa": "US", "us": "US", "united states": "US", "france": "FR", "fr": "FR"}\n\ndef clean(df):\n    d = df.drop_duplicates()\n    d["name"] = d["name"].str.strip().str.title()\n    d["country"] = d["country"].str.strip().str.lower().map(CODES)\n    t = d["spend"].str.replace("€", "").str.replace(",", "")\n    d["spend"] = pd.to_numeric(t, errors="coerce")\n    d["signup_date"] = pd.to_datetime(d["signup_date"])\n    d["valid_email"] = d["email"].str.contains("@").fillna(False)\n    return d\n',
          ],
          explain: 'Deduplicate first, so every later step works on fewer rows and nothing is counted twice. Then fix one column per line. In a real job, wrap this in a function exactly like this one and add assertions (`assert d["country"].notna().all()`), so the next export with a new spelling fails loudly instead of silently.',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u12-exam',
    title: 'pandas Basics Exam',
    minutes: 30,
    intro: 'Label vs position indexing, alignment, Copy-on-Write, filtering and cleaning. Expect the traps interviewers set. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'The index holds integers. What does this print?',
        code: py`
          import pandas as pd
          s = pd.Series([10, 20, 30], index=[2, 1, 0])
          print(s[0], s.iloc[0])
        `,
        options: ['30 10', '10 10', '10 30', '30 30'],
        answer: 0,
        checkOutput: true,
        explain: 'With an integer index, `s[0]` means **label** 0, which is the value 30. `iloc[0]` is position 0, which is 10. Writing `loc`/`iloc` explicitly removes the ambiguity.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          import pandas as pd
          s = pd.Series([10, 20, 30, 40], index=[3, 2, 1, 0])
          print(s.loc[2:0].tolist())
          print(s.iloc[2:].tolist())
          print(s[0])
        `,
        answer: '[20, 30, 40]\n[30, 40]\n40',
        explain: 'A label slice walks the index in its stored order, from label 2 to label 0 inclusive. The position slice starts at position 2. `s[0]` is label 0, the last value.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          import pandas as pd
          a = pd.Series({"x": 1.0, "y": 2.0})
          b = pd.Series({"y": 3.0, "z": 4.0})
          print((a + b).mean(), a.add(b, fill_value=0).mean())
        `,
        options: ['5.0 3.3333333333333335', 'nan 3.3333333333333335', '5.0 5.0', '3.3333333333333335 5.0'],
        answer: 0,
        checkOutput: true,
        explain: '`a + b` is NaN, 5, NaN, and the mean skips NaN, so it is 5.0. With `fill_value=0` it\'s 1, 5, 4 → 10 / 3. Silent NaNs change averages without any error.',
      },
      {
        type: 'choice',
        prompt: 'What does this print (pandas 3)?',
        code: py`
          import pandas as pd
          df = pd.DataFrame({"a": [1, 2, 3]})
          sub = df[df["a"] > 1]
          sub.loc[:, "a"] = 0
          print(df["a"].tolist(), sub["a"].tolist())
        `,
        options: ['[1, 2, 3] [0, 0]', '[1, 0, 0] [0, 0]', '[1, 0, 0] [2, 3]', '[1, 2, 3] [2, 3]'],
        answer: 0,
        checkOutput: true,
        explain: 'A filtered frame behaves like an independent copy under Copy-on-Write. Changing `sub` never touches `df`. To change `df`, use `df.loc[df["a"] > 1, "a"] = 0`.',
      },
      {
        type: 'blanks',
        prompt: 'Non-cancelled orders from EU countries, two ways. Make both agree.',
        code: py`
          import pandas as pd
          o = pd.read_csv("data/orders.csv")
          eu = ["DE", "FR", "IT", "ES", "NL", "HR"]
          gone = o["status"] == "cancelled"
          m = o["country"].___(eu) & ___(gone)
          q = "country in @eu and status != 'cancelled'"
          print(m.sum() == len(o.query(q)))
        `,
        bank: ['isin', '~', 'between', 'not', '!', 'contains'],
        answer: ['isin', '~'],
        tests: [{ stdout: 'True\n' }],
        explain: '`isin` is the vectorised `in`, and `~` negates a mask element-wise. Python\'s `not` would try to turn the whole Series into a single bool and raise.',
      },
      {
        type: 'code',
        title: 'Country scorecard',
        prompt: md`
          Write \`scorecard(df, country)\` for the orders table, returning a dict for that country:

          - \`"orders"\`: number of **completed** orders
          - \`"revenue"\`: their total revenue (quantity × unit_price), rounded to 2
          - \`"avg_order"\`: their average order value, rounded to 2
          - \`"cancel_rate"\`: cancelled orders ÷ **all** of the country's orders, rounded to 3

          If the country has no orders at all, return \`{"orders": 0, "revenue": 0.0, "avg_order": 0.0, "cancel_rate": 0.0}\`.
        `,
        setup: ORDERS,
        starter: py`
          def scorecard(df, country):
              pass
        `,
        solution: py`
          def scorecard(df, country):
              d = df[df["country"] == country]
              if len(d) == 0:
                  return {"orders": 0, "revenue": 0.0,
                          "avg_order": 0.0,
                          "cancel_rate": 0.0}
              done = d[d["status"] == "completed"]
              rev = done["quantity"] * done["unit_price"]
              cancel = (d["status"] == "cancelled").mean()
              return {
                  "orders": len(done),
                  "revenue": round(float(rev.sum()), 2),
                  "avg_order": round(float(rev.mean()), 2),
                  "cancel_rate": round(float(cancel), 3),
              }
        `,
        tests: [
          { call: 'scorecard(orders, "HR")', name: 'HR' },
          { call: 'scorecard(orders, "US")', hidden: true },
          { call: 'scorecard(orders, "XX")', expect: '{"orders": 0, "revenue": 0.0, "avg_order": 0.0, "cancel_rate": 0.0}', hidden: true, name: 'unknown country' },
          { call: 'scorecard(orders.head(200), "DE")', hidden: true },
        ],
        wrong: [
          'def scorecard(df, country):\n    d = df[df["country"] == country]\n    if len(d) == 0:\n        return {"orders": 0, "revenue": 0.0, "avg_order": 0.0, "cancel_rate": 0.0}\n    done = d[d["status"] == "completed"]\n    rev = done["quantity"] * done["unit_price"]\n    return {"orders": len(done), "revenue": round(float(rev.sum()), 2), "avg_order": round(float(rev.mean()), 2), "cancel_rate": round(float((done["status"] == "cancelled").mean()), 3)}\n',
          'def scorecard(df, country):\n    d = df[df["country"] == country]\n    if len(d) == 0:\n        return {"orders": 0, "revenue": 0.0, "avg_order": 0.0, "cancel_rate": 0.0}\n    done = d[d["status"] == "completed"]\n    rev = d["quantity"] * d["unit_price"]\n    return {"orders": len(done), "revenue": round(float(rev.sum()), 2), "avg_order": round(float(rev.mean()), 2), "cancel_rate": round(float((d["status"] == "cancelled").mean()), 3)}\n',
          'def scorecard(df, country):\n    d = df[df["country"] == country]\n    if len(d) == 0:\n        return {"orders": 0, "revenue": 0.0, "avg_order": 0.0, "cancel_rate": 0.0}\n    done = d[d["status"] == "completed"]\n    rev = done["quantity"] * done["unit_price"]\n    return {"orders": len(done), "revenue": round(float(rev.sum()), 2), "avg_order": round(float(done["unit_price"].mean()), 2), "cancel_rate": round(float((d["status"] == "cancelled").mean()), 3)}\n',
        ],
        explain: 'Each metric has its own population: revenue over completed orders, cancel rate over **all** orders. Computing the cancel rate on the completed subset always gives 0, a bug that is easy to miss in a dashboard.',
      },
      {
        type: 'code',
        title: 'Top spenders',
        prompt: md`
          From the raw \`data/customers_messy.csv\` table, write \`top_spenders(df, n)\` returning the list of the \`n\` customer **names** with the highest spend, highest first. Before ranking:

          - drop exact duplicate rows
          - parse \`spend\` (like \`"€1,200.50"\`) to a float, and leave out customers whose spend is missing
          - return names stripped and in Title Case
        `,
        setup: MESSY,
        starter: py`
          import pandas as pd

          def top_spenders(df, n):
              pass
        `,
        solution: py`
          import pandas as pd

          def top_spenders(df, n):
              d = df.drop_duplicates()
              t = d["spend"].str.replace("€", "")
              t = t.str.replace(",", "")
              d = d.assign(
                  spend=pd.to_numeric(t, errors="coerce"),
                  name=d["name"].str.strip().str.title())
              d = d.dropna(subset=["spend"])
              d = d.sort_values("spend", ascending=False)
              return d["name"].head(n).tolist()
        `,
        tests: [
          { call: 'top_spenders(c, 5)', name: 'top 5' },
          { call: 'top_spenders(c, 500)', hidden: true, name: 'everyone with a known spend' },
          { call: 'top_spenders(c.iloc[40:], 10)', hidden: true },
        ],
        wrong: [
          'import pandas as pd\n\ndef top_spenders(df, n):\n    t = df["spend"].str.replace("€", "").str.replace(",", "")\n    d = df.assign(spend=pd.to_numeric(t, errors="coerce"), name=df["name"].str.strip().str.title())\n    d = d.dropna(subset=["spend"]).sort_values("spend", ascending=False)\n    return d["name"].head(n).tolist()\n',
          'import pandas as pd\n\ndef top_spenders(df, n):\n    d = df.drop_duplicates()\n    t = d["spend"].str.replace("€", "")\n    d = d.assign(spend=pd.to_numeric(t, errors="coerce"), name=d["name"].str.strip().str.title())\n    d = d.dropna(subset=["spend"]).sort_values("spend", ascending=False)\n    return d["name"].head(n).tolist()\n',
          'import pandas as pd\n\ndef top_spenders(df, n):\n    d = df.drop_duplicates()\n    t = d["spend"].str.replace("€", "").str.replace(",", "")\n    d = d.assign(spend=pd.to_numeric(t, errors="coerce"))\n    d = d.dropna(subset=["spend"]).sort_values("spend", ascending=False)\n    return d["name"].head(n).tolist()\n',
        ],
        explain: 'Every cleaning step changes the ranking. Duplicates list a person twice, and a half-parsed spend column silently drops the "€1,234.56" customers, often the biggest ones. Clean, then rank.',
      },
      {
        type: 'code',
        kind: 'fix',
        title: 'Fix the refund report',
        prompt: md`
          \`refunds(df, countries)\` should return a **new** frame with the **returned or cancelled** orders from the given countries, plus a column \`refund\` = quantity × unit_price rounded to 2. Sort by refund, high → low (ties: smaller order_id first), with a fresh 0 … n−1 index. The input must not change.

          It has several bugs. Find and fix them all.
        `,
        setup: ORDERS,
        starter: py`
          def refunds(df, countries):
              st = df["status"]
              bad = st == "returned" | st == "cancelled"
              out = df[bad & df["country"].isin(countries)]
              rev = out["quantity"] * out["unit_price"]
              out["refund"] = rev
              return out.sort_values("refund")
        `,
        solution: py`
          def refunds(df, countries):
              st = df["status"]
              bad = (st == "returned") | (st == "cancelled")
              out = df[bad & df["country"].isin(countries)]
              rev = out["quantity"] * out["unit_price"]
              out = out.assign(refund=rev.round(2))
              out = out.sort_values(["refund", "order_id"],
                                    ascending=[False, True])
              return out.reset_index(drop=True)
        `,
        tests: [
          { call: 'refunds(orders, ["DE"])', name: 'DE' },
          { call: 'refunds(orders, ["US", "UK"])', hidden: true },
          { call: 'len(refunds(orders, []))', expect: '0', hidden: true, name: 'no countries' },
          { code: 'o = pd.read_csv("data/orders.csv")\nrefunds(o, ["FR"])\nassert "refund" not in o.columns', name: 'does not modify the input', hidden: true },
        ],
        wrong: [
          'def refunds(df, countries):\n    st = df["status"]\n    bad = (st == "returned") | (st == "cancelled")\n    out = df[bad & df["country"].isin(countries)]\n    out = out.assign(refund=(out["quantity"] * out["unit_price"]).round(2))\n    out = out.sort_values(["refund", "order_id"], ascending=[False, True])\n    return out\n',
          'def refunds(df, countries):\n    st = df["status"]\n    bad = (st == "returned") | (st == "cancelled")\n    out = df[bad & df["country"].isin(countries)]\n    out = out.assign(refund=(out["quantity"] * out["unit_price"]).round(2))\n    return out.sort_values(["refund", "order_id"]).reset_index(drop=True)\n',
        ],
        explain: 'Bugs: missing parentheses (crash), no rounding, ascending sort, no tie-breaker, and the old index kept. Each one alone would get a take-home sent back. Reading the spec line by line against your code catches them.',
      },
      {
        type: 'code',
        title: 'Latest record per email',
        prompt: md`
          The CRM export has several records for the same person. Write \`latest_per_email(df)\` that takes the raw customers table and keeps, for each **valid** email, only the record with the **latest** \`signup_date\` (ties → the larger \`customer_id\`).

          - normalise emails first: strip and lower-case
          - valid means present and containing \`"@"\`. Drop the rest.
          - return all original columns (email normalised), sorted by \`customer_id\`, with a fresh 0 … n−1 index
        `,
        setup: MESSY,
        starter: py`
          import pandas as pd

          def latest_per_email(df):
              pass
        `,
        solution: py`
          import pandas as pd

          def latest_per_email(df):
              mail = df["email"].str.strip().str.lower()
              d = df.assign(email=mail)
              d = d[d["email"].str.contains("@")]
              keys = ["signup_date", "customer_id"]
              d = d.sort_values(keys)
              d = d.drop_duplicates("email", keep="last")
              d = d.sort_values("customer_id")
              return d.reset_index(drop=True)
        `,
        tests: [
          { call: 'latest_per_email(c)', name: 'the customers file' },
          { call: 'latest_per_email(c.iloc[::-1])', hidden: true, name: 'rows in reverse order' },
          { call: 'latest_per_email(pd.DataFrame({"customer_id": [1, 2, 3, 4], "email": [" Ana@x.com", "ana@x.com", "bad", None], "signup_date": ["2025-01-02", "2025-01-02", "2025-03-01", "2025-04-01"]}))', hidden: true, name: 'normalisation, ties and invalid emails' },
        ],
        wrong: [
          'import pandas as pd\n\ndef latest_per_email(df):\n    d = df.assign(email=df["email"].str.strip().str.lower())\n    d = d[d["email"].str.contains("@")]\n    d = d.sort_values(["signup_date", "customer_id"]).drop_duplicates("email", keep="first")\n    return d.sort_values("customer_id").reset_index(drop=True)\n',
          'import pandas as pd\n\ndef latest_per_email(df):\n    d = df[df["email"].str.contains("@")]\n    d = d.sort_values(["signup_date", "customer_id"]).drop_duplicates("email", keep="last")\n    return d.sort_values("customer_id").reset_index(drop=True)\n',
          'import pandas as pd\n\ndef latest_per_email(df):\n    d = df.assign(email=df["email"].str.strip().str.lower())\n    d = d.dropna(subset=["email"])\n    d = d.sort_values(["signup_date", "customer_id"]).drop_duplicates("email", keep="last")\n    return d.sort_values("customer_id").reset_index(drop=True)\n',
        ],
        explain: 'Sort so the record you want comes last, then `drop_duplicates(key, keep="last")`. That is the pandas version of SQL\'s `ROW_NUMBER() OVER (PARTITION BY email ORDER BY signup_date DESC) = 1`. Normalise the key first, or " Ana@x.com" and "ana@x.com" survive as two people.',
      },
    ],
  },
};

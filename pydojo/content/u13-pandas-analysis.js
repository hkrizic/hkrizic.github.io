// Unit 13 — pandas Analysis: groupby, merge, pivot, time series.
import { py, md } from './helpers.js';

const ORDERS = 'import pandas as pd\norders = pd.read_csv("data/orders.csv")';
const OU = 'import pandas as pd\norders = pd.read_csv("data/orders.csv")\nusers = pd.read_csv("data/users.csv")';

export default {
  id: 'u13',
  order: 13,
  track: 'data',
  title: 'pandas Analysis',
  subtitle: 'groupby, merge, pivot, time series',
  icon: '📊',
  color: '#F97316',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u13-l1',
      title: 'groupby & Aggregation',
      summary: 'Answer "per X" questions with split-apply-combine.',
      steps: [
        {
          type: 'learn',
          title: 'Split, apply, combine',
          body: md`
            \`groupby\` answers "per X" questions: revenue **per** country, orders **per** user.

            1. **split** the rows into groups by a key
            2. **apply** an aggregation to each group
            3. **combine** the results into a Series indexed by the key, sorted by key

            \`.idxmax()\` then gives the **label** of the largest value.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            o["revenue"] = o["quantity"] * o["unit_price"]
            by_c = o.groupby("country")["revenue"].sum()
            print(by_c.round(2))
            print(by_c.idxmax())
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"team": ["b", "a", "b", "a", "b"],
                               "pts": [1, 2, 3, 4, 5]})
            g = df.groupby("team")["pts"]
            print(g.sum().tolist())
            print(g.mean().to_dict())
          `,
          answer: "[6, 9]\n{'a': 3.0, 'b': 3.0}",
          explain: 'Groups come out **sorted by key**: a first (2 + 4), then b (1 + 3 + 5). Both teams average 3.0, and a mean is always a float.',
        },
        {
          type: 'learn',
          title: 'Several aggregations with agg',
          body: md`
            \`.agg()\` computes several statistics at once. **Named aggregation** gives clean column names, one \`new_name=(column, function)\` pair per output column.

            The group key becomes the **index**. \`.reset_index()\`, or \`groupby(..., as_index=False)\`, turns it back into an ordinary column, which is what you want for reports, merges and plots.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            o["revenue"] = o["quantity"] * o["unit_price"]
            t = o.groupby("country").agg(
                orders=("order_id", "count"),
                revenue=("revenue", "sum"),
                avg_qty=("quantity", "mean"))
            print(t.round(2).head(3))
            print(t.reset_index().columns.tolist())
          `,
        },
        {
          type: 'choice',
          prompt: 'What does `df.groupby("country", as_index=False)["revenue"].sum()` return?',
          options: ['A DataFrame: country, revenue', 'A Series indexed by country', 'A DataFrame indexed by country', 'One number, the total'],
          answer: 0,
          explain: 'With `as_index=False` the key stays a regular column, so you get a two-column table with a 0, 1, 2 … index. The default (`as_index=True`) gives a Series indexed by country.',
        },
        {
          type: 'learn',
          title: 'size vs count vs nunique',
          body: md`
            - \`size()\`: rows per group, **including** NaN
            - \`count()\`: **non-missing** values per group
            - \`nunique()\`: distinct values per group

            In \`users.csv\`, \`age\` has gaps, so \`groupby("plan")["age"].count()\` is smaller than \`.size()\`. Means and medians skip NaN automatically.
          `,
          code: py`
            import pandas as pd

            u = pd.read_csv("data/users.csv")
            g = u.groupby("plan")
            print(g.size().tolist())
            print(g["age"].count().tolist())
            print(g["country"].nunique().tolist())
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"k": ["a", "a", "b"],
                               "v": [1.0, None, 3.0]})
            g = df.groupby("k")["v"]
            print(g.size().tolist(), g.count().tolist())
          `,
          options: ['[2, 1] [1, 1]', '[1, 1] [2, 1]', '[2, 1] [2, 1]', '[1, 1] [1, 1]'],
          answer: 0,
          checkOutput: true,
          explain: 'Group a has 2 rows, but only 1 non-missing value. Interview classic: "count the orders per user" → `size()`. "Count the users who reported an age" → `count()`.',
        },
        {
          type: 'blanks',
          prompt: 'Orders and total units per category, with clean column names.',
          code: py`
            import pandas as pd
            o = pd.read_csv("data/orders.csv")
            t = o.groupby("category").___(
                orders=("order_id", "___"),
                units=("quantity", "sum"))
            toys = (o["category"] == "Toys").sum()
            print(t.loc["Toys", "orders"] == toys)
          `,
          bank: ['agg', 'count', 'apply', 'sum', 'mean', 'max'],
          answer: ['agg', 'count'],
          tests: [{ stdout: 'True\n' }],
          explain: 'Named aggregation goes through `.agg(name=(column, function))`. `"count"` counts rows with an `order_id`. `"sum"` would add up the ids themselves, a classic slip.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines to print the country with the highest average quantity per order.',
          lines: [
            'import pandas as pd',
            'o = pd.read_csv("data/orders.csv")',
            'avg = o.groupby("country")["quantity"].mean()',
            'best = avg.idxmax()',
            'print(best)',
          ],
          distractors: ['avg = o.groupby("quantity")["country"].mean()'],
          tests: [{ stdout: true }],
          explain: 'Group by the dimension you want one answer **per** (country), and aggregate the measure (quantity). `idxmax` returns the label, not the value.',
        },
        {
          type: 'code',
          title: 'Revenue per country',
          prompt: md`
            Write \`revenue_by_country(df)\` returning a Series: total revenue (quantity × unit_price) of **completed** orders per country, rounded to 2, sorted from highest to lowest.
          `,
          setup: ORDERS,
          starter: py`
            def revenue_by_country(df):
                pass
          `,
          solution: py`
            def revenue_by_country(df):
                d = df[df["status"] == "completed"]
                d = d.assign(rev=d["quantity"] * d["unit_price"])
                out = d.groupby("country")["rev"].sum()
                return out.round(2).sort_values(ascending=False)
          `,
          tests: [
            { call: 'revenue_by_country(pd.DataFrame({"country": ["DE", "US", "DE"], "status": ["completed", "completed", "cancelled"], "quantity": [2, 1, 5], "unit_price": [10.0, 30.0, 9.0]}))', expect: 'pd.Series({"US": 30.0, "DE": 20.0})' },
            { call: 'revenue_by_country(orders)', name: 'the orders table' },
            { call: 'revenue_by_country(orders.iloc[:400])', hidden: true },
          ],
          hints: [
            'Filter completed orders and add a revenue column with `assign`.',
            '`groupby("country")["rev"].sum()`, then `.round(2).sort_values(ascending=False)`.',
          ],
          wrong: [
            'def revenue_by_country(df):\n    d = df.assign(rev=df["quantity"] * df["unit_price"])\n    return d.groupby("country")["rev"].sum().round(2).sort_values(ascending=False)\n',
            'def revenue_by_country(df):\n    d = df[df["status"] == "completed"]\n    d = d.assign(rev=d["quantity"] * d["unit_price"])\n    return d.groupby("country")["rev"].sum().round(2)\n',
            'def revenue_by_country(df):\n    d = df[df["status"] == "completed"]\n    return d.groupby("country")["unit_price"].sum().round(2).sort_values(ascending=False)\n',
          ],
          explain: 'Filter → derive → group → aggregate → sort. That is the skeleton of most analytics queries. In SQL: `SELECT country, SUM(quantity * unit_price) FROM orders WHERE status = \'completed\' GROUP BY country ORDER BY 2 DESC`.',
        },
        {
          type: 'code',
          title: 'Category summary table',
          prompt: md`
            Write \`category_stats(df)\` returning a DataFrame with one row per category and the columns:

            - \`category\`
            - \`orders\`: number of orders
            - \`units\`: total quantity
            - \`avg_price\`: mean unit_price, rounded to 2

            Use **all** orders (any status), sort by \`units\` descending, and use a 0 … n−1 index.
          `,
          setup: ORDERS,
          starter: py`
            def category_stats(df):
                pass
          `,
          solution: py`
            def category_stats(df):
                t = df.groupby("category", as_index=False).agg(
                    orders=("order_id", "count"),
                    units=("quantity", "sum"),
                    avg_price=("unit_price", "mean"))
                t["avg_price"] = t["avg_price"].round(2)
                t = t.sort_values("units", ascending=False)
                return t.reset_index(drop=True)
          `,
          tests: [
            { call: 'category_stats(orders)', name: 'the orders table' },
            { call: 'category_stats(orders).columns.tolist()', expect: '["category", "orders", "units", "avg_price"]' },
            { call: 'category_stats(orders[orders["country"] == "DE"])', hidden: true, name: 'only DE' },
          ],
          hints: [
            '`groupby("category", as_index=False).agg(orders=("order_id", "count"), ...)`',
            'Round `avg_price`, sort by `units`, then `reset_index(drop=True)`.',
          ],
          wrong: [
            'def category_stats(df):\n    t = df.groupby("category", as_index=False).agg(orders=("order_id", "count"), units=("quantity", "sum"), avg_price=("unit_price", "mean"))\n    t["avg_price"] = t["avg_price"].round(2)\n    return t.sort_values("units", ascending=False)\n',
            'def category_stats(df):\n    t = df.groupby("category", as_index=False).agg(orders=("order_id", "count"), units=("quantity", "sum"), avg_price=("unit_price", "mean"))\n    t["avg_price"] = t["avg_price"].round(2)\n    return t.sort_values("orders", ascending=False).reset_index(drop=True)\n',
          ],
          explain: '`as_index=False` keeps `category` as a column, and named aggregation sets the column names. Sorting scrambles the index, so `reset_index(drop=True)` gives the clean 0 … n−1 index a report expects.',
        },
        {
          type: 'code',
          title: 'Age coverage per plan',
          prompt: md`
            For \`users.csv\`, write \`age_coverage(users)\` returning a DataFrame indexed by \`plan\` (A→Z) with the columns:

            - \`users\`: number of users
            - \`known_age\`: users with a known age
            - \`median_age\`: the median of the known ages
            - \`pct_missing\`: % of users with an unknown age, rounded to 1
          `,
          setup: 'import pandas as pd\nusers = pd.read_csv("data/users.csv")',
          starter: py`
            def age_coverage(users):
                pass
          `,
          solution: py`
            def age_coverage(users):
                t = users.groupby("plan").agg(
                    users=("user_id", "size"),
                    known_age=("age", "count"),
                    median_age=("age", "median"))
                miss = 1 - t["known_age"] / t["users"]
                t["pct_missing"] = (miss * 100).round(1)
                return t
          `,
          tests: [
            { call: 'age_coverage(users)', name: 'users.csv' },
            { call: 'age_coverage(pd.DataFrame({"user_id": [1, 2, 3], "plan": ["pro", "pro", "free"], "age": [30.0, None, 41.0]}))', expect: 'pd.DataFrame({"users": [1, 2], "known_age": [1, 1], "median_age": [41.0, 30.0], "pct_missing": [0.0, 50.0]}, index=["free", "pro"])' },
            { call: 'age_coverage(users[users["country"] == "US"])', hidden: true, name: 'only US users' },
          ],
          hints: [
            '`size` counts rows, `count` counts non-missing values. Use both in one `agg`.',
            '`pct_missing = (1 - known_age / users) * 100`, rounded to 1.',
          ],
          wrong: [
            'def age_coverage(users):\n    t = users.groupby("plan").agg(users=("user_id", "size"), known_age=("age", "size"), median_age=("age", "median"))\n    t["pct_missing"] = ((1 - t["known_age"] / t["users"]) * 100).round(1)\n    return t\n',
            'def age_coverage(users):\n    t = users.groupby("plan").agg(users=("user_id", "size"), known_age=("age", "count"), median_age=("age", "mean"))\n    t["pct_missing"] = ((1 - t["known_age"] / t["users"]) * 100).round(1)\n    return t\n',
            'def age_coverage(users):\n    t = users.groupby("plan").agg(users=("user_id", "size"), known_age=("age", "count"), median_age=("age", "median"))\n    t["pct_missing"] = (1 - t["known_age"] / t["users"]).round(1)\n    return t\n',
          ],
          explain: 'Reporting coverage next to a statistic is good practice: a median age based on 60 % of users means something different from one based on 99 %. `size` vs `count` is exactly the tool for it.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the average order value',
          prompt: md`
            \`aov(df)\` should return the **average order value** per country for completed orders: total revenue ÷ number of orders, rounded to 2, as a Series indexed by country (A→Z).

            The numbers it returns are far too small. Find the bug.
          `,
          setup: ORDERS,
          starter: py`
            def aov(df):
                d = df[df["status"] == "completed"]
                g = d.groupby("country")["unit_price"]
                return g.mean().round(2)
          `,
          solution: py`
            def aov(df):
                d = df[df["status"] == "completed"]
                d = d.assign(rev=d["quantity"] * d["unit_price"])
                g = d.groupby("country")["rev"]
                return (g.sum() / g.count()).round(2)
          `,
          tests: [
            { call: 'aov(pd.DataFrame({"country": ["DE", "DE"], "status": ["completed"] * 2, "quantity": [3, 1], "unit_price": [10.0, 20.0]}))', expect: 'pd.Series({"DE": 25.0})' },
            { call: 'aov(orders)', name: 'the orders table' },
            { call: 'aov(orders.head(300))', hidden: true },
          ],
          hints: [
            'An order with quantity 3 is worth 3 × unit_price. The current code ignores quantity.',
            'Compute a revenue column first, then take its mean per country.',
          ],
          wrong: [
            'def aov(df):\n    d = df[df["status"] == "completed"]\n    g = d.groupby("country")\n    return (g["unit_price"].sum() / g.size()).round(2)\n',
            'def aov(df):\n    d = df.assign(rev=df["quantity"] * df["unit_price"])\n    return d.groupby("country")["rev"].mean().round(2)\n',
          ],
          explain: 'Average order value is revenue per order, not the average item price. Define the metric first, then write the code. `g.sum() / g.count()` equals `g.mean()` here, but writing it out makes the definition explicit.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u13-l2',
      title: 'Advanced groupby',
      summary: 'Multiple keys, transform, top-N per group, filter, cumcount and rank.',
      steps: [
        {
          type: 'learn',
          title: 'Several keys and unstack',
          body: md`
            Group by a **list** of columns to get one row per **combination**. The result has a two-level **MultiIndex**.

            \`unstack()\` moves the inner level into columns, giving a readable grid (\`fill_value=0\` for empty cells). \`reset_index()\` flattens it into ordinary columns instead.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            g = o.groupby(["country", "status"]).size()
            print(g.head(4))
            print(g.unstack(fill_value=0).head(3))
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"c": ["x", "x", "y", "x"],
                               "s": ["ok", "no", "ok", "ok"]})
            g = df.groupby(["c", "s"]).size()
            print(g.tolist())
            print(g.index.tolist())
          `,
          answer: "[1, 2, 1]\n[('x', 'no'), ('x', 'ok'), ('y', 'ok')]",
          explain: 'Only combinations that occur appear, sorted by both keys. A MultiIndex is a list of tuples.',
        },
        {
          type: 'learn',
          title: 'transform: back to row level',
          body: md`
            An aggregation returns **one row per group**. \`transform\` returns a value **for every original row**: the group's result repeated, aligned to the original index. Perfect for:

            - share of the group total: \`x / x.groupby(key).transform("sum")\`
            - deviation from the group mean
            - z-score within a group
          `,
          code: py`
            import pandas as pd

            df = pd.DataFrame({"team": ["a", "a", "b"],
                               "pts": [2, 6, 5]})
            g = df.groupby("team")["pts"]
            df["share"] = df["pts"] / g.transform("sum")
            df["vs_avg"] = df["pts"] - g.transform("mean")
            print(df)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"k": list("aabbb"), "v": range(5)})
            g = df.groupby("k")["v"]
            print(len(g.sum()), len(g.transform("sum")))
          `,
          options: ['2 5', '5 2', '2 2', '5 5'],
          answer: 0,
          checkOutput: true,
          explain: '`sum` gives one value per group (a and b). `transform("sum")` gives one value per **row**, so it can be stored as a new column of `df`.',
        },
        {
          type: 'learn',
          title: 'Top-N, filter, cumcount, rank',
          body: md`
            - **Top N per group**: sort first, then \`groupby(key).head(n)\`
            - **Keep whole groups** that pass a test: \`groupby(key).filter(lambda g: len(g) >= 5)\`
            - **Number the rows in a group**: \`groupby(key).cumcount()\` → 0, 1, 2 … in the current order
            - **Rank within a group**: \`groupby(key)["x"].rank(ascending=False, method="dense")\`

            These four cover most "per user / per category" interview questions.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            o["rev"] = o["quantity"] * o["unit_price"]
            top2 = (o.sort_values("rev", ascending=False)
                     .groupby("category").head(2))
            print(top2[["category", "product", "rev"]])
            o["nth"] = o.groupby("user_id").cumcount() + 1
            print(o["nth"].max())
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"u": ["a", "b", "a", "a", "b"]})
            df["n"] = df.groupby("u").cumcount()
            print(df["n"].tolist())
          `,
          answer: '[0, 0, 1, 2, 1]',
          explain: '`cumcount` numbers each user\'s rows in their current order, starting at 0. Sort by date first and it becomes "this is the user\'s n-th order".',
        },
        {
          type: 'blanks',
          prompt: "Add each order's share of its category's revenue.",
          code: py`
            import pandas as pd
            df = pd.DataFrame({"cat": ["A", "A", "B"],
                               "rev": [30.0, 10.0, 5.0]})
            tot = df.groupby("cat")["rev"].___("___")
            df["share"] = df["rev"] / tot
            print(df["share"].tolist())
          `,
          bank: ['transform', 'sum', 'agg', 'mean', 'apply', 'size'],
          answer: ['transform', 'sum'],
          tests: [{ stdout: '[0.75, 0.25, 1.0]\n' }],
          explain: '`transform("sum")` returns 40, 40, 5, aligned with the rows. With `agg("sum")` you\'d get a Series indexed by A and B, and dividing would align on the wrong labels and produce NaN.',
        },
        {
          type: 'code',
          title: 'Share of country revenue',
          prompt: md`
            Write \`with_share(df)\` that returns the orders with two new columns:

            - \`rev\` = quantity × unit_price
            - \`share\` = the order's share of its **country's** total \`rev\`, rounded to 4

            Use all orders, and keep the original rows, order and index.
          `,
          setup: ORDERS,
          starter: py`
            def with_share(df):
                pass
          `,
          solution: py`
            def with_share(df):
                rev = df["quantity"] * df["unit_price"]
                d = df.assign(rev=rev)
                g = d.groupby("country")["rev"]
                share = d["rev"] / g.transform("sum")
                return d.assign(share=share.round(4))
          `,
          tests: [
            { call: 'with_share(pd.DataFrame({"country": ["DE", "US", "DE"], "quantity": [1, 2, 3], "unit_price": [10.0, 5.0, 10.0]}))["share"].tolist()', expect: '[0.25, 1.0, 0.75]' },
            { call: 'with_share(orders)', name: 'the orders table' },
            { call: 'with_share(orders.iloc[::7])', hidden: true, name: 'every 7th order' },
          ],
          hints: [
            'Add `rev` first, then `d.groupby("country")["rev"].transform("sum")` gives each row its country total.',
            'Divide, round to 4 and add it with `assign`.',
          ],
          wrong: [
            'def with_share(df):\n    d = df.assign(rev=df["quantity"] * df["unit_price"])\n    tot = d.groupby("category")["rev"].transform("sum")\n    return d.assign(share=(d["rev"] / tot).round(4))\n',
            'def with_share(df):\n    d = df.assign(rev=df["quantity"] * df["unit_price"])\n    return d.assign(share=(d["rev"] / d["rev"].sum()).round(4))\n',
          ],
          explain: '`transform` keeps the result aligned with the original rows, so it drops straight into a new column. This is the pandas version of SQL\'s `SUM(rev) OVER (PARTITION BY country)`.',
        },
        {
          type: 'code',
          title: 'Loyal customers',
          prompt: md`
            Write \`loyal(df, k)\` returning the **sorted list** of \`user_id\`s that have **at least \`k\` completed** orders.
          `,
          setup: ORDERS,
          starter: py`
            def loyal(df, k):
                pass
          `,
          solution: py`
            def loyal(df, k):
                d = df[df["status"] == "completed"]
                n = d.groupby("user_id").size()
                return sorted(n[n >= k].index.tolist())
          `,
          tests: [
            { call: 'loyal(orders, 8)', name: 'k = 8' },
            { call: 'loyal(orders, 1000)', expect: '[]' },
            { call: 'loyal(orders, 1)', hidden: true },
            { call: 'loyal(orders.head(400), 2)', hidden: true },
          ],
          hints: [
            'Count completed orders per user with `groupby("user_id").size()`.',
            'Keep the users with `n[n >= k]` and return the sorted index as a list.',
          ],
          wrong: [
            'def loyal(df, k):\n    n = df.groupby("user_id").size()\n    return sorted(n[n >= k].index.tolist())\n',
            'def loyal(df, k):\n    d = df[df["status"] == "completed"]\n    n = d.groupby("user_id").size()\n    return sorted(n[n > k].index.tolist())\n',
          ],
          explain: 'Count per group, then filter the counts: SQL\'s `GROUP BY user_id HAVING COUNT(*) >= k`. `groupby("user_id").filter(lambda g: len(g) >= k)` does the same but returns the matching **rows** instead.',
        },
        {
          type: 'code',
          title: 'First orders only',
          prompt: md`
            Write \`first_orders(df)\` returning each user's **first** order (earliest \`order_date\`; ties → the smaller \`order_id\`). Columns \`user_id\`, \`order_id\`, \`order_date\`, \`category\`, sorted by \`user_id\`, with a 0 … n−1 index. The input rows can come in **any order**.
          `,
          setup: ORDERS,
          starter: py`
            def first_orders(df):
                pass
          `,
          solution: py`
            def first_orders(df):
                keys = ["user_id", "order_date", "order_id"]
                d = df.sort_values(keys)
                d = d[d.groupby("user_id").cumcount() == 0]
                cols = ["user_id", "order_id",
                        "order_date", "category"]
                return d[cols].reset_index(drop=True)
          `,
          tests: [
            { call: 'first_orders(orders)', name: 'the orders table' },
            { call: 'len(first_orders(orders)) == orders["user_id"].nunique()', expect: 'True', name: 'one row per user' },
            { call: 'first_orders(orders.iloc[::-1])', hidden: true, name: 'rows in reverse order' },
            { call: 'first_orders(orders[orders["country"] == "FR"])', hidden: true },
          ],
          hints: [
            'Sort by user, then date, then order_id, so each user\'s first order comes first.',
            '`groupby("user_id").cumcount() == 0` marks the first row of each user. `drop_duplicates("user_id")` after sorting works too.',
          ],
          wrong: [
            'def first_orders(df):\n    d = df[df.groupby("user_id").cumcount() == 0]\n    return d[["user_id", "order_id", "order_date", "category"]].sort_values("user_id").reset_index(drop=True)\n',
            'def first_orders(df):\n    d = df.sort_values(["user_id", "order_date", "order_id"])\n    d = d[d.groupby("user_id").cumcount() == 1]\n    return d[["user_id", "order_id", "order_date", "category"]].reset_index(drop=True)\n',
          ],
          explain: '"First per group" = sort, then take row 0 of each group. Never rely on the file already being in order: the hidden test reverses it. In SQL this is `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date, order_id) = 1`.',
        },
        {
          type: 'code',
          title: 'Best sellers per category',
          prompt: md`
            Write \`best_sellers(df, n)\` returning the top \`n\` products per category by **units sold** (sum of quantity) in **completed** orders:

            - columns \`category\`, \`product\`, \`units\`
            - sorted by category A→Z, then units high → low (ties: product A→Z)
            - a 0 … index
          `,
          setup: ORDERS,
          starter: py`
            def best_sellers(df, n):
                pass
          `,
          solution: py`
            def best_sellers(df, n):
                d = df[df["status"] == "completed"]
                t = d.groupby(["category", "product"],
                              as_index=False)["quantity"].sum()
                t = t.rename(columns={"quantity": "units"})
                t = t.sort_values(
                    ["category", "units", "product"],
                    ascending=[True, False, True])
                top = t.groupby("category").head(n)
                return top.reset_index(drop=True)
          `,
          tests: [
            { call: 'best_sellers(orders, 2)', name: 'top 2 per category' },
            { call: 'len(best_sellers(orders, 1))', expect: '6' },
            { call: 'best_sellers(orders, 10)', hidden: true, name: 'n larger than the group' },
            { call: 'best_sellers(orders.head(300), 1)', hidden: true },
          ],
          hints: [
            'Aggregate first: `groupby(["category", "product"], as_index=False)["quantity"].sum()`.',
            'Sort by `["category", "units", "product"]` with `ascending=[True, False, True]`, then `groupby("category").head(n)`.',
          ],
          wrong: [
            'def best_sellers(df, n):\n    t = df.groupby(["category", "product"], as_index=False)["quantity"].sum().rename(columns={"quantity": "units"})\n    t = t.sort_values(["category", "units", "product"], ascending=[True, False, True])\n    return t.groupby("category").head(n).reset_index(drop=True)\n',
            'def best_sellers(df, n):\n    d = df[df["status"] == "completed"]\n    t = d.groupby(["category", "product"], as_index=False)["quantity"].sum().rename(columns={"quantity": "units"})\n    return t.groupby("category").head(n).reset_index(drop=True)\n',
          ],
          explain: 'Top-N per group = aggregate, sort (group key first, then the metric), `head(n)` per group. `head` takes the first rows in the *current* order, so without the sort you get alphabetical products, not best sellers.',
        },
        {
          type: 'code',
          title: 'Rank inside the category',
          prompt: md`
            Write \`rank_products(df)\` that, for **completed** orders, returns one row per (category, product) with the columns:

            - \`category\`, \`product\`
            - \`revenue\`: total quantity × unit_price, rounded to 2
            - \`rank\`: 1 = highest revenue **within its category** (dense ranking, as an int)
            - \`share\`: product revenue ÷ category revenue, rounded to 3

            Sort by category, then rank, then product. Use a 0 … index.
          `,
          setup: ORDERS,
          starter: py`
            def rank_products(df):
                pass
          `,
          solution: py`
            def rank_products(df):
                d = df[df["status"] == "completed"]
                rev = d["quantity"] * d["unit_price"]
                d = d.assign(revenue=rev)
                t = d.groupby(["category", "product"],
                              as_index=False)["revenue"].sum()
                g = t.groupby("category")["revenue"]
                r = g.rank(ascending=False, method="dense")
                t["rank"] = r.astype(int)
                share = t["revenue"] / g.transform("sum")
                t["share"] = share.round(3)
                t["revenue"] = t["revenue"].round(2)
                t = t.sort_values(["category", "rank", "product"])
                return t.reset_index(drop=True)
          `,
          tests: [
            { call: 'rank_products(orders)', name: 'the orders table' },
            { call: 'rank_products(orders).groupby("category")["share"].sum().round(2).tolist()', expect: '[1.0] * 6', name: 'shares add up to 1 per category' },
            { call: 'rank_products(orders[orders["country"].isin(["DE", "FR"])])', hidden: true },
          ],
          hints: [
            'Aggregate to one row per (category, product) first, then work on that small table.',
            'On the aggregated table: `g = t.groupby("category")["revenue"]`, then `g.rank(ascending=False, method="dense")` and `g.transform("sum")`.',
          ],
          wrong: [
            'def rank_products(df):\n    d = df[df["status"] == "completed"]\n    d = d.assign(revenue=d["quantity"] * d["unit_price"])\n    t = d.groupby(["category", "product"], as_index=False)["revenue"].sum()\n    t["rank"] = t["revenue"].rank(ascending=False, method="dense").astype(int)\n    t["share"] = (t["revenue"] / t.groupby("category")["revenue"].transform("sum")).round(3)\n    t["revenue"] = t["revenue"].round(2)\n    return t.sort_values(["category", "rank", "product"]).reset_index(drop=True)\n',
            'def rank_products(df):\n    d = df[df["status"] == "completed"]\n    d = d.assign(revenue=d["quantity"] * d["unit_price"])\n    t = d.groupby(["category", "product"], as_index=False)["revenue"].sum()\n    g = t.groupby("category")["revenue"]\n    t["rank"] = g.rank(method="dense").astype(int)\n    t["share"] = (t["revenue"] / g.transform("sum")).round(3)\n    t["revenue"] = t["revenue"].round(2)\n    return t.sort_values(["category", "rank", "product"]).reset_index(drop=True)\n',
          ],
          explain: 'Two levels of grouping: first to (category, product) to get revenue, then by category alone for rank and share. Ranking over the whole table instead of within the category is the bug to watch for. `method="dense"` gives tied products the same rank without leaving gaps.',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u13-l3',
      title: 'merge & concat',
      summary: 'Join tables like SQL, catch unmatched rows and fan-outs, stack exports.',
      steps: [
        {
          type: 'learn',
          title: 'Joining tables',
          body: md`
            Real data is split across tables: orders reference users by \`user_id\`. \`merge\` joins them like SQL:

            | how | keeps |
            |---|---|
            | \`"inner"\` | only keys in **both** (default) |
            | \`"left"\` | every left row, NaN where nothing matches |
            | \`"right"\` | every right row |
            | \`"outer"\` | everything from both |
          `,
          code: py`
            import pandas as pd

            orders = pd.DataFrame({"oid": [1, 2, 3],
                                   "uid": [10, 20, 99]})
            plans = ["pro", "free", "team"]
            users = pd.DataFrame({"uid": [10, 20, 30],
                                  "plan": plans})
            print(orders.merge(users, on="uid"))
            print(orders.merge(users, on="uid", how="left"))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            a = pd.DataFrame({"k": [1, 2, 3]})
            b = pd.DataFrame({"k": [2, 3, 4, 5]})
            print(len(a.merge(b, how="inner")),
                  len(a.merge(b, how="left")),
                  len(a.merge(b, how="outer")))
          `,
          options: ['2 3 5', '2 3 4', '3 3 5', '2 4 5'],
          answer: 0,
          checkOutput: true,
          explain: 'Inner: keys 2 and 3. Left: all 3 rows of `a`. Outer: the union 1–5. Without `on=`, merge joins on all shared column names, here `k`.',
        },
        {
          type: 'learn',
          title: 'Different key names and suffixes',
          body: md`
            When the key columns have different names, use \`left_on="user_id", right_on="id"\`. Both columns stay in the result.

            Columns that exist in **both** tables (other than the key) get the suffixes \`_x\` and \`_y\`. Pick readable ones with \`suffixes=("_order", "_user")\`, or select only the columns you need before merging.
          `,
          code: py`
            import pandas as pd

            o = pd.DataFrame({"user_id": [1, 2],
                              "country": ["DE", "FR"]})
            u = pd.DataFrame({"id": [1, 2],
                              "country": ["DE", "ES"]})
            m = o.merge(u, left_on="user_id", right_on="id",
                        suffixes=("_order", "_user"))
            print(m)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            a = pd.DataFrame({"id": [1], "name": ["x"], "v": [5]})
            b = pd.DataFrame({"id": [1], "v": [7]})
            print(a.merge(b, on="id").columns.tolist())
          `,
          answer: "['id', 'name', 'v_x', 'v_y']",
          explain: '`v` exists on both sides, so pandas keeps both and adds the default suffixes. Code that later reads `m["v"]` then fails with a KeyError.',
        },
        {
          type: 'learn',
          title: 'indicator and validate',
          body: md`
            Two guards every analyst should use:

            - \`indicator=True\` adds a \`_merge\` column: \`"both"\`, \`"left_only"\` or \`"right_only"\`. Keep the \`left_only\` rows for an **anti-join** ("users who never ordered").
            - \`validate="many_to_one"\` raises a \`MergeError\` if the right-hand keys are **not unique**. Duplicate keys silently multiply rows. This **fan-out** inflates revenue numbers.
          `,
          code: py`
            import pandas as pd

            u = pd.read_csv("data/users.csv")
            o = pd.read_csv("data/orders.csv")
            buyers = o[["user_id"]].drop_duplicates()
            m = u.merge(buyers, on="user_id",
                        how="left", indicator=True)
            print(m["_merge"].value_counts())
          `,
        },
        {
          type: 'choice',
          prompt: 'The price table accidentally has two rows for SKU A. What does this print?',
          code: py`
            import pandas as pd
            orders = pd.DataFrame({"sku": ["A", "B"],
                                   "qty": [1, 2]})
            prices = pd.DataFrame({"sku": ["A", "A", "B"],
                                   "price": [5, 6, 7]})
            m = orders.merge(prices, on="sku")
            print(len(m), m["qty"].sum())
          `,
          options: ['3 4', '2 3', '3 3', '2 4'],
          answer: 0,
          checkOutput: true,
          explain: 'A matches two price rows, so order A appears twice, and total quantity jumps from 3 to 4. `validate="many_to_one"` would have raised instead. Checking `len()` before and after every merge is a cheap habit that catches this.',
        },
        {
          type: 'learn',
          title: 'concat: stacking tables',
          body: md`
            \`pd.concat([df1, df2])\` stacks frames **vertically**, for example monthly exports into one table. Columns are matched by name, and missing ones become NaN. Add \`ignore_index=True\` for a fresh index.

            \`pd.concat([...], axis=1)\` puts frames **side by side**, aligned on the index.
          `,
          code: py`
            import pandas as pd

            jan = pd.DataFrame({"day": [1, 2],
                                "sales": [10, 12]})
            feb = pd.DataFrame({"day": [1], "sales": [9],
                                "promo": [True]})
            both = pd.concat([jan, feb], ignore_index=True)
            print(both)
          `,
        },
        {
          type: 'blanks',
          prompt: 'Find the users who never placed an order (an anti-join).',
          code: py`
            import pandas as pd
            u = pd.read_csv("data/users.csv")
            o = pd.read_csv("data/orders.csv")
            buyers = o[["user_id"]].drop_duplicates()
            m = u.merge(buyers, on="user_id",
                        how="___", indicator=___)
            never = m[m["_merge"] == "left_only"]
            alt = ~u["user_id"].isin(o["user_id"])
            print(len(never) == alt.sum())
          `,
          bank: ['left', 'True', 'inner', 'False', 'right', '"both"'],
          answer: ['left', 'True'],
          tests: [{ stdout: 'True\n' }],
          explain: 'A left join keeps every user, and `_merge == "left_only"` marks those without a match. An inner join would throw exactly those users away. `~isin(...)` is the shortcut for a single key column.',
        },
        {
          type: 'code',
          title: 'Attach the plan',
          prompt: md`
            Write \`with_plan(orders, users)\` that returns the orders with the user's \`plan\` and \`signup_date\` added (left join on \`user_id\`).

            The result must have exactly as many rows as \`orders\`, in the same order, with a 0 … index. Make the merge **fail loudly** with a \`MergeError\` if \`users\` ever contains duplicate \`user_id\`s.
          `,
          setup: OU,
          starter: py`
            def with_plan(orders, users):
                pass
          `,
          solution: py`
            def with_plan(orders, users):
                u = users[["user_id", "plan", "signup_date"]]
                return orders.merge(u, on="user_id", how="left",
                                    validate="many_to_one")
          `,
          tests: [
            { call: 'with_plan(orders, users)', name: 'all users' },
            { call: 'with_plan(orders, users).shape', expect: '(1200, 11)' },
            { call: 'with_plan(orders, users.iloc[50:])', hidden: true, name: 'some users missing' },
            { call: 'with_plan(orders, pd.concat([users, users.head(3)]))', raises: 'MergeError', hidden: true, name: 'duplicate users raise MergeError' },
          ],
          hints: [
            'Select only the columns you want from `users` (plus the key), so no `country_x`/`country_y` appear.',
            '`orders.merge(u, on="user_id", how="left", validate="many_to_one")`',
          ],
          wrong: [
            'def with_plan(orders, users):\n    u = users[["user_id", "plan", "signup_date"]]\n    return orders.merge(u, on="user_id", how="left")\n',
            'def with_plan(orders, users):\n    u = users[["user_id", "plan", "signup_date"]]\n    return orders.merge(u, on="user_id", validate="many_to_one")\n',
            'def with_plan(orders, users):\n    return orders.merge(users, on="user_id", how="left", validate="many_to_one")\n',
          ],
          explain: 'A left join keeps orders whose user is missing, and an inner join silently drops them. `validate` turns a silent fan-out into an error. Selecting columns first avoids suffix clutter, since both tables have a `country`.',
        },
        {
          type: 'code',
          title: 'Who never bought?',
          prompt: md`
            Write \`never_bought(users, orders)\` returning the **sorted list** of \`user_id\`s with **no completed order**. Users whose orders were all cancelled or returned count as "never bought". Use a merge with \`indicator=True\`.
          `,
          setup: OU,
          starter: py`
            def never_bought(users, orders):
                pass
          `,
          solution: py`
            def never_bought(users, orders):
                done = orders[orders["status"] == "completed"]
                buyers = done[["user_id"]].drop_duplicates()
                m = users.merge(buyers, on="user_id",
                                how="left", indicator=True)
                left = m[m["_merge"] == "left_only"]
                return sorted(left["user_id"].tolist())
          `,
          tests: [
            { call: 'never_bought(users, orders)', name: 'all orders' },
            { call: 'never_bought(users, orders.head(300))', hidden: true },
            { call: 'never_bought(users.head(5), orders.head(0))', expect: '[1, 2, 3, 4, 5]', hidden: true, name: 'no orders at all' },
          ],
          hints: [
            'Filter completed orders first, and keep one row per buyer with `drop_duplicates()`.',
            'Left-merge users with the buyers using `indicator=True`, and keep `_merge == "left_only"`.',
          ],
          wrong: [
            'def never_bought(users, orders):\n    buyers = orders[["user_id"]].drop_duplicates()\n    m = users.merge(buyers, on="user_id", how="left", indicator=True)\n    return sorted(m.loc[m["_merge"] == "left_only", "user_id"].tolist())\n',
            'def never_bought(users, orders):\n    done = orders[orders["status"] == "completed"]\n    m = users.merge(done[["user_id"]], on="user_id", how="inner", indicator=True)\n    return sorted(m.loc[m["_merge"] == "left_only", "user_id"].tolist())\n',
          ],
          explain: 'An anti-join answers "who is missing?". It\'s the basis of churn lists, activation funnels and data-quality checks ("orders whose user doesn\'t exist"). Deduplicating the right side first keeps the merge small.',
        },
        {
          type: 'code',
          title: 'Combine two exports',
          prompt: md`
            Two order exports overlap: some orders appear in both, and the **second** export (\`q2\`) has the more recent status. Write \`combine(q1, q2)\` that stacks them, keeps **one row per \`order_id\`** (the version from \`q2\` when it appears in both), sorts by \`order_id\`, and resets the index.
          `,
          setup: py`
            import pandas as pd
            orders = pd.read_csv("data/orders.csv")
            q1 = orders.iloc[:700].copy()
            q2 = orders.iloc[600:].copy()
            q2.loc[q2.index[:100], "status"] = "returned"
          `,
          starter: py`
            import pandas as pd

            def combine(q1, q2):
                pass
          `,
          solution: py`
            import pandas as pd

            def combine(q1, q2):
                both = pd.concat([q1, q2], ignore_index=True)
                both = both.drop_duplicates("order_id",
                                            keep="last")
                both = both.sort_values("order_id")
                return both.reset_index(drop=True)
          `,
          tests: [
            { call: 'combine(q1, q2)', name: 'overlapping exports' },
            { call: 'len(combine(q1, q2))', expect: '1200' },
            { call: 'combine(q2.iloc[::-1], q1.iloc[:50])', hidden: true, name: 'unsorted input' },
          ],
          hints: [
            '`pd.concat([q1, q2], ignore_index=True)` puts q2\'s rows after q1\'s.',
            '`drop_duplicates("order_id", keep="last")` keeps the later export\'s version.',
          ],
          wrong: [
            'import pandas as pd\n\ndef combine(q1, q2):\n    both = pd.concat([q1, q2], ignore_index=True)\n    both = both.drop_duplicates("order_id", keep="first")\n    return both.sort_values("order_id").reset_index(drop=True)\n',
            'import pandas as pd\n\ndef combine(q1, q2):\n    both = pd.concat([q1, q2], ignore_index=True)\n    both = both.drop_duplicates()\n    return both.sort_values("order_id").reset_index(drop=True)\n',
          ],
          explain: 'Deduplicate on the **key**, not on whole rows. The changed rows differ in `status`, so a full-row `drop_duplicates()` keeps both versions. "Last write wins" via concat order plus `keep="last"` is a standard data-engineering upsert.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the inflated revenue',
          prompt: md`
            Finance says revenue per plan is too high. In this export, \`users\` contains some users **twice** (identical rows). Fix \`revenue_by_plan(orders, users)\` so each order is counted once: deduplicate users on \`user_id\` before joining, and add \`validate\` so a fan-out can never happen silently again.

            Return completed-order revenue per plan, rounded to 2, as a Series indexed by plan (A→Z).
          `,
          setup: py`
            import pandas as pd
            orders = pd.read_csv("data/orders.csv")
            users = pd.read_csv("data/users.csv")
            users_dup = pd.concat(
                [users, users.sample(20, random_state=1)])
          `,
          starter: py`
            def revenue_by_plan(orders, users):
                d = orders[orders["status"] == "completed"]
                m = d.merge(users, on="user_id")
                m["rev"] = m["quantity"] * m["unit_price"]
                return m.groupby("plan")["rev"].sum().round(2)
          `,
          solution: py`
            def revenue_by_plan(orders, users):
                d = orders[orders["status"] == "completed"]
                u = users.drop_duplicates("user_id")
                m = d.merge(u, on="user_id",
                            validate="many_to_one")
                m["rev"] = m["quantity"] * m["unit_price"]
                return m.groupby("plan")["rev"].sum().round(2)
          `,
          tests: [
            { call: 'revenue_by_plan(orders, users_dup)', name: 'users with duplicates' },
            { call: 'revenue_by_plan(orders, users)', name: 'clean users' },
            { call: 'revenue_by_plan(orders.iloc[:500], users_dup)', hidden: true },
          ],
          hints: [
            'Every duplicated user doubles all of their orders in the join.',
            '`users.drop_duplicates("user_id")` before the merge, and `validate="many_to_one"` in the merge.',
          ],
          wrong: [
            'def revenue_by_plan(orders, users):\n    d = orders[orders["status"] == "completed"]\n    m = d.merge(users, on="user_id", how="left")\n    m["rev"] = m["quantity"] * m["unit_price"]\n    return m.groupby("plan")["rev"].sum().round(2)\n',
            'def revenue_by_plan(orders, users):\n    m = orders.merge(users.drop_duplicates("user_id"), on="user_id")\n    m["rev"] = m["quantity"] * m["unit_price"]\n    return m.groupby("plan")["rev"].sum().round(2)\n',
          ],
          explain: 'Fan-out is one of the most expensive silent bugs in analytics: the totals look plausible, just wrong. Dedupe the dimension table and assert the relationship with `validate`. Comparing `len()` before and after a merge is the 5-second check.',
        },
        {
          type: 'code',
          title: 'Headcount by department',
          prompt: md`
            Using \`data/employees.csv\` and \`data/departments.csv\`, write \`headcount(emp, dept)\` returning a DataFrame with the columns \`dept_name\`, \`employees\`, \`avg_salary\` (rounded to 0):

            - one row per department, **plus** a row \`"Unassigned"\` for employees without a department
            - sorted by \`employees\` high → low, then \`dept_name\` A→Z
            - a 0 … index
          `,
          setup: py`
            import pandas as pd
            emp = pd.read_csv("data/employees.csv")
            dept = pd.read_csv("data/departments.csv")
          `,
          starter: py`
            import pandas as pd

            def headcount(emp, dept):
                pass
          `,
          solution: py`
            import pandas as pd

            def headcount(emp, dept):
                m = emp.merge(dept, on="dept_id", how="left")
                name = m["dept_name"].fillna("Unassigned")
                m = m.assign(dept_name=name)
                t = m.groupby("dept_name", as_index=False).agg(
                    employees=("emp_id", "count"),
                    avg_salary=("salary", "mean"))
                t["avg_salary"] = t["avg_salary"].round(0)
                t = t.sort_values(["employees", "dept_name"],
                                  ascending=[False, True])
                return t.reset_index(drop=True)
          `,
          tests: [
            { call: 'headcount(emp, dept)', name: 'all employees' },
            { call: 'headcount(emp, dept)["dept_name"].tolist()[-1]', expect: '"Unassigned"' },
            { call: 'headcount(emp[emp["salary"] > 60000], dept)', hidden: true, name: 'salary above 60k' },
          ],
          hints: [
            'A left join keeps the employee whose `dept_id` is empty. Their `dept_name` is NaN.',
            'Fill it with `"Unassigned"` **before** grouping: groupby drops NaN keys by default.',
          ],
          wrong: [
            'import pandas as pd\n\ndef headcount(emp, dept):\n    m = emp.merge(dept, on="dept_id")\n    t = m.groupby("dept_name", as_index=False).agg(employees=("emp_id", "count"), avg_salary=("salary", "mean"))\n    t["avg_salary"] = t["avg_salary"].round(0)\n    return t.sort_values(["employees", "dept_name"], ascending=[False, True]).reset_index(drop=True)\n',
            'import pandas as pd\n\ndef headcount(emp, dept):\n    m = emp.merge(dept, on="dept_id", how="left")\n    t = m.groupby("dept_name", as_index=False).agg(employees=("emp_id", "count"), avg_salary=("salary", "mean"))\n    t["avg_salary"] = t["avg_salary"].round(0)\n    return t.sort_values(["employees", "dept_name"], ascending=[False, True]).reset_index(drop=True)\n',
          ],
          explain: 'Two silent row-droppers: an inner join, and `groupby` skipping NaN keys (`dropna=True` by default). Both make the contractor vanish from the headcount. Fill missing keys, or pass `groupby(..., dropna=False)`, whenever "unknown" is a real answer.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u13-l4',
      title: 'Reshaping: pivot & melt',
      summary: 'Turn long data into grids and back: pivot_table, crosstab, melt, pivot.',
      steps: [
        {
          type: 'learn',
          title: 'pivot_table',
          body: md`
            \`pivot_table\` is a groupby with two keys laid out as a grid: one key down the rows, one across the columns.

            - \`index=\`, \`columns=\`, \`values=\`, \`aggfunc=\` (\`"sum"\`, \`"mean"\`, \`"count"\`, …)
            - \`fill_value=0\`: empty cells (no orders) become 0 instead of NaN
            - \`margins=True\`: adds an \`All\` row and column with totals
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            o["rev"] = o["quantity"] * o["unit_price"]
            p = o.pivot_table(index="country",
                              columns="category",
                              values="rev",
                              aggfunc="sum",
                              fill_value=0)
            print(p.round(0).head(3))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            o = pd.read_csv("data/orders.csv")
            p = o.pivot_table(index="country",
                              columns="status",
                              values="order_id",
                              aggfunc="count")
            print(p.shape)
          `,
          options: ['(8, 3)', '(3, 8)', '(1200, 3)', '(8, 6)'],
          answer: 0,
          checkOutput: true,
          explain: 'One row per country (8), one column per status (3). The grid holds the aggregated values, not the original 1,200 rows.',
        },
        {
          type: 'learn',
          title: 'crosstab',
          body: md`
            \`pd.crosstab(rows, cols)\` counts the combinations of two categorical columns: a frequency table.

            \`normalize="index"\` turns each row into shares that sum to 1, which answers "what fraction of DE's orders were cancelled?". \`normalize="columns"\` does the same per column.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            t = pd.crosstab(o["country"], o["status"],
                            normalize="index")
            print(t.round(3).head(3))
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            df = pd.DataFrame({"dev": ["m", "d", "m", "m"],
                               "buy": [1, 0, 0, 1]})
            t = pd.crosstab(df["dev"], df["buy"])
            print(t.loc["m"].tolist())
            print(t.columns.tolist())
          `,
          answer: '[1, 2]\n[0, 1]',
          explain: 'Device m has one row with buy = 0 and two with buy = 1. The columns are the distinct values of `buy`, sorted.',
        },
        {
          type: 'learn',
          title: 'melt and pivot',
          body: md`
            **Wide** data has one column per variable (\`jan\`, \`feb\`, \`mar\`). **Long** ("tidy") data has one row per observation, with \`month\` and \`sales\` columns. groupby and plotting prefer long data.

            - \`df.melt(id_vars="store", var_name="month", value_name="sales")\`: wide → long
            - \`long.pivot(index="store", columns="month", values="sales")\`: long → wide

            \`pivot\` doesn't aggregate: duplicate (index, column) pairs raise an error. Use \`pivot_table\` then.
          `,
          code: py`
            import pandas as pd

            wide = pd.DataFrame({"store": ["A", "B"],
                                 "jan": [10, 7],
                                 "feb": [12, 9]})
            long = wide.melt(id_vars="store",
                             var_name="month",
                             value_name="sales")
            print(long)
            print(long.pivot(index="store", columns="month",
                             values="sales"))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            wide = pd.DataFrame({"store": ["A", "B"],
                                 "jan": [1, 2], "feb": [3, 4]})
            long = wide.melt(id_vars="store")
            print(long.shape, long.columns.tolist())
          `,
          options: [
            "(4, 3) ['store', 'variable', 'value']",
            "(2, 3) ['store', 'jan', 'feb']",
            "(4, 2) ['store', 'value']",
            "(4, 3) ['store', 'month', 'sales']",
          ],
          answer: 0,
          checkOutput: true,
          explain: '2 stores × 2 month columns = 4 rows. Without `var_name`/`value_name`, pandas calls the new columns `variable` and `value`.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines to melt a wide table and total it per store.',
          lines: [
            'import pandas as pd',
            'wide = pd.DataFrame({"s": ["A"], "q1": [5], "q2": [7]})',
            'long = wide.melt(id_vars="s", value_name="v")',
            'total = long.groupby("s")["v"].sum()',
            'print(total["A"])',
          ],
          distractors: ['long = wide.melt(id_vars="v", value_name="s")'],
          tests: [{ stdout: '12\n' }],
          explain: 'Once the data is long, one groupby replaces summing column by column, and it keeps working when a `q3` column appears.',
        },
        {
          type: 'blanks',
          prompt: 'Revenue grid: countries down, categories across, empty cells as 0.',
          code: py`
            import pandas as pd
            o = pd.read_csv("data/orders.csv")
            o["rev"] = o["quantity"] * o["unit_price"]
            p = o.pivot_table(index="country",
                              columns="category",
                              values="rev",
                              aggfunc="___", ___=0)
            print(p.shape)
          `,
          bank: ['sum', 'fill_value', 'count', 'fillna', 'margins', 'mean'],
          answer: ['sum', 'fill_value'],
          tests: [{ var: 'p', expect: 'o.pivot_table(index="country", columns="category", values="rev", aggfunc="sum", fill_value=0)' }],
          explain: '`aggfunc="sum"` totals the revenue per cell, and `fill_value=0` fills combinations with no orders. `fillna` is a method, not an argument here, and `margins` adds totals.',
        },
        {
          type: 'code',
          title: 'Revenue grid',
          prompt: md`
            Write \`revenue_grid(df)\` returning a pivot table of **completed** revenue:

            - countries as rows, categories as columns, empty cells 0
            - plus a \`Total\` column (the row sum) at the end
            - all cells rounded to 2
            - rows sorted by \`Total\`, highest first
          `,
          setup: ORDERS,
          starter: py`
            def revenue_grid(df):
                pass
          `,
          solution: py`
            def revenue_grid(df):
                d = df[df["status"] == "completed"]
                rev = d["quantity"] * d["unit_price"]
                d = d.assign(rev=rev)
                p = d.pivot_table(index="country",
                                  columns="category",
                                  values="rev", aggfunc="sum",
                                  fill_value=0)
                p["Total"] = p.sum(axis=1)
                p = p.round(2)
                return p.sort_values("Total", ascending=False)
          `,
          tests: [
            { call: 'revenue_grid(orders)', name: 'the orders table' },
            { call: 'revenue_grid(orders).columns.tolist()[-1]', expect: '"Total"' },
            { call: 'revenue_grid(orders.iloc[:150])', hidden: true, name: 'a small slice with empty cells' },
          ],
          hints: [
            'Filter, add `rev`, then `pivot_table(..., aggfunc="sum", fill_value=0)`.',
            '`p["Total"] = p.sum(axis=1)` adds the row totals. Round, then sort by it.',
          ],
          wrong: [
            'def revenue_grid(df):\n    d = df[df["status"] == "completed"]\n    d = d.assign(rev=d["quantity"] * d["unit_price"])\n    p = d.pivot_table(index="country", columns="category", values="rev", aggfunc="sum", fill_value=0, margins=True, margins_name="Total")\n    return p.round(2).sort_values("Total", ascending=False)\n',
            'def revenue_grid(df):\n    d = df.assign(rev=df["quantity"] * df["unit_price"])\n    p = d.pivot_table(index="country", columns="category", values="rev", aggfunc="sum", fill_value=0)\n    p["Total"] = p.sum(axis=1)\n    return p.round(2).sort_values("Total", ascending=False)\n',
            'def revenue_grid(df):\n    d = df[df["status"] == "completed"]\n    d = d.assign(rev=d["quantity"] * d["unit_price"])\n    p = d.pivot_table(index="country", columns="category", values="rev", aggfunc="sum")\n    p["Total"] = p.sum(axis=1)\n    return p.round(2).sort_values("Total", ascending=False)\n',
          ],
          explain: '`margins=True` would also add a total **row**, which then gets sorted to the top as the biggest "country". Adding only the column you need keeps the grid honest. A grid like this is often the first table in a business review.',
        },
        {
          type: 'code',
          title: 'Cancellation mix',
          prompt: md`
            Write \`status_mix(df)\` returning, per country, the share of orders in each status (each row sums to 1):

            - columns in the order \`completed\`, \`cancelled\`, \`returned\`
            - rounded to 3
            - rows sorted by the \`cancelled\` share, highest first
          `,
          setup: ORDERS,
          starter: py`
            import pandas as pd

            def status_mix(df):
                pass
          `,
          solution: py`
            import pandas as pd

            def status_mix(df):
                t = pd.crosstab(df["country"], df["status"],
                                normalize="index")
                t = t[["completed", "cancelled", "returned"]]
                t = t.round(3)
                return t.sort_values("cancelled",
                                     ascending=False)
          `,
          tests: [
            { call: 'status_mix(orders)', name: 'the orders table' },
            { call: 'status_mix(orders).index[0]', expect: '"NL"', name: 'highest cancellation share first' },
            { call: 'status_mix(orders.iloc[:600])', hidden: true, name: 'first half of the year' },
          ],
          hints: [
            '`pd.crosstab(df["country"], df["status"], normalize="index")`',
            'Reorder the columns with a list, round, then `sort_values("cancelled", ascending=False)`.',
          ],
          wrong: [
            'import pandas as pd\n\ndef status_mix(df):\n    t = pd.crosstab(df["country"], df["status"], normalize="columns")\n    t = t[["completed", "cancelled", "returned"]].round(3)\n    return t.sort_values("cancelled", ascending=False)\n',
            'import pandas as pd\n\ndef status_mix(df):\n    t = pd.crosstab(df["country"], df["status"], normalize="index").round(3)\n    return t.sort_values("cancelled", ascending=False)\n',
          ],
          explain: '`normalize="index"` answers "of this country\'s orders, what share…". `"columns"` would answer "of all cancellations, what share came from this country", a different (and also useful) question. Put the columns in a meaningful order rather than alphabetical.',
        },
        {
          type: 'code',
          title: 'Wide to long',
          prompt: md`
            A finance sheet has one row per store and one column per month (\`store, jan, feb, mar, …\`). Write \`to_long(wide)\` returning a long table with the columns \`store\`, \`month\`, \`sales\`:

            - sorted by store A→Z
            - within a store, months in the **original column order** (calendar order, not alphabetical!)
            - a 0 … index

            Tip: \`sort_values("store", kind="stable")\` keeps the existing order among rows with the same store.
          `,
          setup: py`
            import pandas as pd
            W = pd.DataFrame({"store": ["B", "A", "C"],
                              "jan": [5, 3, 8], "feb": [6, 2, 9],
                              "mar": [4, 7, 1], "apr": [2, 2, 3]})
            W2 = pd.DataFrame({"store": ["Zg", "Ber"],
                               "oct": [1, 2], "nov": [3, 4],
                               "dec": [5, 6]})
          `,
          starter: py`
            def to_long(wide):
                pass
          `,
          solution: py`
            def to_long(wide):
                long = wide.melt(id_vars="store",
                                 var_name="month",
                                 value_name="sales")
                long = long.sort_values("store", kind="stable")
                return long.reset_index(drop=True)
          `,
          tests: [
            { call: 'to_long(W)', name: '3 stores × 4 months' },
            { call: 'to_long(W)["month"].tolist()[:4]', expect: '["jan", "feb", "mar", "apr"]', name: 'calendar order inside a store' },
            { call: 'to_long(W2)', hidden: true },
          ],
          hints: [
            '`wide.melt(id_vars="store", var_name="month", value_name="sales")` lists all January rows, then all February rows, …',
            'A **stable** sort by store keeps that month order inside each store. Sorting by `["store", "month"]` would sort the months alphabetically.',
          ],
          wrong: [
            'def to_long(wide):\n    long = wide.melt(id_vars="store", var_name="month", value_name="sales")\n    return long.sort_values(["store", "month"]).reset_index(drop=True)\n',
            'def to_long(wide):\n    long = wide.melt(id_vars="store", var_name="month", value_name="sales")\n    return long.reset_index(drop=True)\n',
          ],
          explain: 'Text months sort alphabetically: apr, feb, jan, mar. Either keep the original order with a stable sort, or make `month` an ordered categorical: `pd.Categorical(long["month"], categories=months, ordered=True)`. Better still, store real dates.',
        },
        {
          type: 'code',
          title: 'Best category per country',
          prompt: md`
            Write \`best_category(df)\` returning one row per country (A→Z) with the columns:

            - \`country\`
            - \`category\`: the category with the highest **completed** revenue in that country
            - \`revenue\`: that category's revenue, rounded to 2
            - \`share\`: its share of the country's completed revenue, rounded to 3

            Use a 0 … index.
          `,
          setup: ORDERS,
          starter: py`
            import pandas as pd

            def best_category(df):
                pass
          `,
          solution: py`
            import pandas as pd

            def best_category(df):
                d = df[df["status"] == "completed"]
                rev = d["quantity"] * d["unit_price"]
                p = d.assign(rev=rev).pivot_table(
                    index="country", columns="category",
                    values="rev", aggfunc="sum", fill_value=0)
                best = p.max(axis=1)
                out = pd.DataFrame({
                    "category": p.idxmax(axis=1),
                    "revenue": best.round(2),
                    "share": (best / p.sum(axis=1)).round(3)})
                return out.reset_index()
          `,
          tests: [
            { call: 'best_category(orders)', name: 'the orders table' },
            { call: 'best_category(orders).columns.tolist()', expect: '["country", "category", "revenue", "share"]' },
            { call: 'best_category(orders[orders["quantity"] > 1])', hidden: true, name: 'multi-item orders only' },
          ],
          hints: [
            'Pivot countries × categories first. Then work along each row with `axis=1`.',
            '`p.idxmax(axis=1)` is the best category, `p.max(axis=1)` its revenue, and `p.sum(axis=1)` the country total.',
          ],
          wrong: [
            'import pandas as pd\n\ndef best_category(df):\n    d = df.assign(rev=df["quantity"] * df["unit_price"])\n    p = d.pivot_table(index="country", columns="category", values="rev", aggfunc="sum", fill_value=0)\n    out = pd.DataFrame({"category": p.idxmax(axis=1), "revenue": p.max(axis=1).round(2), "share": (p.max(axis=1) / p.sum(axis=1)).round(3)})\n    return out.reset_index()\n',
            'import pandas as pd\n\ndef best_category(df):\n    d = df[df["status"] == "completed"]\n    d = d.assign(rev=d["quantity"] * d["unit_price"])\n    p = d.pivot_table(index="country", columns="category", values="rev", aggfunc="sum", fill_value=0)\n    out = pd.DataFrame({"category": p.idxmax(axis=1), "revenue": p.max(axis=1).round(2), "share": (p.max(axis=1) / p.values.sum()).round(3)})\n    return out.reset_index()\n',
          ],
          explain: 'Pivot first, then read along the rows. `idxmax(axis=1)` returns the **column label** of each row\'s maximum. The groupby alternative is to aggregate to (country, category), sort, and take `groupby("country").head(1)`.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u13-l5',
      title: 'Time Series',
      summary: 'Dates, the .dt accessor, resample, rolling windows, returns and drawdowns.',
      steps: [
        {
          type: 'learn',
          title: 'Dates and the .dt accessor',
          body: md`
            Convert text to timestamps with \`pd.to_datetime(s)\` (or \`parse_dates=\` in \`read_csv\`). The \`.dt\` accessor then exposes the parts, vectorised:

            - \`.dt.year\`, \`.dt.month\`, \`.dt.day\`, \`.dt.hour\`
            - \`.dt.day_name()\`, \`.dt.dayofweek\` (Monday = 0)
            - \`.dt.to_period("M")\`: the month, like \`2025-11\`

            Subtracting two timestamps gives a \`Timedelta\`. Its \`.days\` (or \`.dt.days\` on a column) is the gap in days.
          `,
          code: py`
            import pandas as pd

            e = pd.read_csv("data/events.csv",
                            parse_dates=["ts"])
            print(e["ts"].dt.hour.value_counts().head(3))
            print(e["ts"].dt.day_name().iloc[0])
            print(e["ts"].max() - e["ts"].min())
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints. (3 Nov 2025 is a Monday, 25 Dec 2025 a Thursday.)',
          code: py`
            import pandas as pd
            s = pd.to_datetime(pd.Series(
                ["2025-11-03 14:30:00", "2025-12-25 08:05:00"]))
            print(s.dt.month.tolist(), s.dt.hour.tolist())
            print(s.dt.day_name().tolist())
            print((s.iloc[1] - s.iloc[0]).days)
          `,
          answer: "[11, 12] [14, 8]\n['Monday', 'Thursday']\n51",
          explain: 'From 3 Nov 14:30 to 25 Dec 08:05 is 51 days and about 17.5 hours. `.days` keeps only the whole days.',
        },
        {
          type: 'learn',
          title: 'resample: change the frequency',
          body: md`
            With a **DatetimeIndex**, \`resample\` groups rows into time buckets, like groupby for time.

            Frequency codes: \`"D"\` day, \`"W"\` week (ending Sunday), \`"MS"\` month start, \`"ME"\` month end, \`"QE"\` quarter end. pandas 3 removed the old \`"M"\`, so write \`"ME"\`.

            Without an index you can also group by \`df["date"].dt.to_period("M")\`.
          `,
          code: py`
            import pandas as pd

            w = pd.read_csv("data/weather.csv",
                            parse_dates=["date"])
            z = w[w["city"] == "Zagreb"].set_index("date")
            rain = z["rain_mm"].resample("ME").sum()
            print(rain.round(1).head(3))
            print(len(z["temp_c"].resample("W").mean()))
          `,
        },
        {
          type: 'choice',
          prompt: 'You have daily rows for all of 2025 and call `.resample("MS").sum()`. What comes back?',
          options: ['12 rows, dated the 1st of each month', '12 rows, dated the last day of each month', '365 rows, one per day', '52 rows, one per week'],
          answer: 0,
          explain: '`"MS"` labels each bucket with the month **start**, while `"ME"` would use 2025-01-31, 2025-02-28, … The sums are identical, only the labels differ, and that matters when you join with another table.',
        },
        {
          type: 'learn',
          title: 'rolling, shift, pct_change, cummax',
          body: md`
            For ordered series (sort by date first!):

            - \`s.rolling(7).mean()\`: 7-period moving average (the first 6 are NaN)
            - \`s.shift(1)\`: the previous value (a lag), so \`s - s.shift(1)\` is the change (also \`s.diff()\`)
            - \`s.pct_change()\`: \`s / s.shift(1) - 1\`, the **daily return** for prices
            - \`s.cummax()\`: the running maximum

            **Drawdown** = \`p / p.cummax() - 1\`: how far the price is below its best level so far. Its minimum is the **max drawdown**.
          `,
          code: py`
            import pandas as pd

            s = pd.Series([100.0, 102.0, 99.0, 105.0])
            print(s.shift(1).tolist())
            print(s.pct_change().round(3).tolist())
            print(s.rolling(2).mean().tolist())
            print(s.cummax().tolist())
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import pandas as pd
            s = pd.Series([10, 12, 9, 15])
            print(s.diff().tolist())
            print(s.rolling(3).max().tolist())
          `,
          answer: '[nan, 2.0, -3.0, 6.0]\n[nan, nan, 12.0, 15.0]',
          explain: 'The first difference has no previous value. A rolling window of 3 needs 3 values before it produces anything: max(10, 12, 9) = 12, then max(12, 9, 15) = 15.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import pandas as pd
            p = pd.Series([100, 120, 90, 130])
            dd = p / p.cummax() - 1
            print(dd.min())
          `,
          options: ['-0.25', '-0.1', '0.3', '-0.3'],
          answer: 0,
          checkOutput: true,
          explain: 'The running max is 100, 120, 120, 130. At 90 the price is 25 % below the previous peak of 120. The fall from 100 to 90 (−10 %) is not the max drawdown, because drawdown is measured from the peak.',
        },
        {
          type: 'blanks',
          prompt: 'Daily returns, computed separately for each ticker.',
          code: py`
            import pandas as pd
            s = pd.read_csv("data/stocks.csv",
                            parse_dates=["date"])
            s = s.sort_values(["ticker", "date"])
            g = s.groupby("___")["close"]
            s["ret"] = g.___()
            print(s["ret"].isna().sum())
          `,
          bank: ['ticker', 'pct_change', 'date', 'diff', 'shift', 'close'],
          answer: ['ticker', 'pct_change'],
          tests: [
            { stdout: '3\n' },
            { assert: 'abs(s["ret"].iloc[1] - (s["close"].iloc[1] / s["close"].iloc[0] - 1)) < 1e-12', name: 'ret is the relative change' },
          ],
          explain: 'Grouping by ticker stops the first day of one ticker from being compared with the last day of another. That leaves one NaN per ticker, so 3.',
        },
        {
          type: 'code',
          title: 'Busiest hour',
          prompt: md`
            Write \`busiest_hour(events)\` that takes the events table (with \`ts\` as text, as read from the CSV) and returns the hour of the day (0–23, an int) with the most \`purchase\` events. Ties → the **earlier** hour.
          `,
          setup: 'import pandas as pd\nevents = pd.read_csv("data/events.csv")',
          starter: py`
            import pandas as pd

            def busiest_hour(events):
                pass
          `,
          solution: py`
            import pandas as pd

            def busiest_hour(events):
                p = events[events["event"] == "purchase"]
                hours = pd.to_datetime(p["ts"]).dt.hour
                counts = hours.value_counts().sort_index()
                return int(counts.idxmax())
          `,
          tests: [
            { call: 'busiest_hour(events)', name: 'all events' },
            { call: 'busiest_hour(pd.DataFrame({"ts": ["2025-11-01 15:00:00", "2025-11-02 09:30:00", "2025-11-03 10:00:00"], "event": ["purchase", "purchase", "page_view"]}))', expect: '9', name: 'tie → earlier hour' },
            { call: 'busiest_hour(events[events["device"] == "mobile"])', hidden: true },
            { call: 'busiest_hour(events[events["device"] == "desktop"])', hidden: true },
          ],
          hints: [
            'Filter the purchases, then `pd.to_datetime(p["ts"]).dt.hour`.',
            '`value_counts().sort_index()` lists hours in order, and `idxmax()` returns the first hour with the maximum count.',
          ],
          wrong: [
            'import pandas as pd\n\ndef busiest_hour(events):\n    hours = pd.to_datetime(events["ts"]).dt.hour\n    return int(hours.value_counts().sort_index().idxmax())\n',
            'import pandas as pd\n\ndef busiest_hour(events):\n    p = events[events["event"] == "purchase"]\n    return int(pd.to_datetime(p["ts"]).dt.hour.value_counts().index[0])\n',
          ],
          explain: '`idxmax` returns the **first** label with the maximum, so sorting the index first makes "earliest hour wins" explicit. `value_counts()` alone orders ties arbitrarily. Hour-of-day patterns drive real decisions like push-notification timing and on-call staffing.',
        },
        {
          type: 'code',
          title: 'Monthly rain',
          prompt: md`
            Write \`monthly_rain(weather, city)\` returning a Series with the total \`rain_mm\` per month for that city, indexed by **month-end** dates (\`resample("ME")\`), rounded to 1. The \`date\` column arrives as text.
          `,
          setup: 'import pandas as pd\nweather = pd.read_csv("data/weather.csv")',
          starter: py`
            import pandas as pd

            def monthly_rain(weather, city):
                pass
          `,
          solution: py`
            import pandas as pd

            def monthly_rain(weather, city):
                w = weather[weather["city"] == city]
                w = w.assign(date=pd.to_datetime(w["date"]))
                s = w.set_index("date")["rain_mm"]
                return s.resample("ME").sum().round(1)
          `,
          tests: [
            { call: 'monthly_rain(weather, "Zagreb")', name: 'Zagreb' },
            { call: 'len(monthly_rain(weather, "Berlin"))', expect: '12' },
            { call: 'monthly_rain(weather, "Madrid")', hidden: true },
          ],
          hints: [
            'Filter the city, convert `date` with `pd.to_datetime`, and make it the index.',
            '`s.resample("ME").sum().round(1)`',
          ],
          wrong: [
            'import pandas as pd\n\ndef monthly_rain(weather, city):\n    w = weather[weather["city"] == city]\n    s = w.assign(date=pd.to_datetime(w["date"])).set_index("date")["rain_mm"]\n    return s.resample("MS").sum().round(1)\n',
            'import pandas as pd\n\ndef monthly_rain(weather, city):\n    w = weather[weather["city"] == city]\n    s = w.assign(date=pd.to_datetime(w["date"])).set_index("date")["rain_mm"]\n    return s.resample("ME").mean().round(1)\n',
          ],
          explain: 'Choose the aggregation that fits the measure: rain **adds up** over a month (sum), while temperature is **averaged** (mean). `resample` also creates empty buckets for months with no rows, which `groupby` on the month would skip.',
        },
        {
          type: 'code',
          title: 'Returns and volatility',
          prompt: md`
            Write \`ticker_stats(stocks)\` returning a DataFrame indexed by ticker (A→Z) with the columns:

            - \`total_return\`: last close ÷ first close − 1 (by date), rounded to 4
            - \`volatility\`: the standard deviation of the daily returns (\`pct_change\`, pandas default std), rounded to 4

            The input rows can come in **any order**. Dates are text like \`2025-01-02\`, which sort correctly as strings.
          `,
          setup: 'import pandas as pd\nstocks = pd.read_csv("data/stocks.csv")',
          starter: py`
            import pandas as pd

            def ticker_stats(stocks):
                pass
          `,
          solution: py`
            import pandas as pd

            def ticker_stats(stocks):
                s = stocks.sort_values(["ticker", "date"])
                g = s.groupby("ticker")["close"]
                ret = g.pct_change()
                out = pd.DataFrame({
                    "total_return": g.last() / g.first() - 1,
                    "volatility": ret.groupby(s["ticker"]).std(),
                })
                return out.round(4)
          `,
          tests: [
            { call: 'ticker_stats(stocks)', name: 'all tickers' },
            { call: 'ticker_stats(stocks.iloc[::-1])', name: 'rows in reverse order' },
            { call: 'ticker_stats(stocks[stocks["date"] < "2025-07-01"])', hidden: true, name: 'first half only' },
          ],
          hints: [
            'Sort by ticker and date first. `g = s.groupby("ticker")["close"]` then gives `g.first()`, `g.last()` and `g.pct_change()`.',
            'Group the returns by ticker again for `.std()`: `ret.groupby(s["ticker"]).std()`.',
          ],
          wrong: [
            'import pandas as pd\n\ndef ticker_stats(stocks):\n    g = stocks.groupby("ticker")["close"]\n    ret = g.pct_change()\n    out = pd.DataFrame({"total_return": g.last() / g.first() - 1, "volatility": ret.groupby(stocks["ticker"]).std()})\n    return out.round(4)\n',
            'import pandas as pd\n\ndef ticker_stats(stocks):\n    s = stocks.sort_values(["ticker", "date"])\n    g = s.groupby("ticker")["close"]\n    ret = s["close"].pct_change()\n    out = pd.DataFrame({"total_return": g.last() / g.first() - 1, "volatility": ret.groupby(s["ticker"]).std()})\n    return out.round(4)\n',
          ],
          explain: 'Time-series functions (`pct_change`, `first`, `last`, `rolling`) depend on row order, so always sort explicitly. Computing `pct_change` without the groupby compares the first day of one ticker with the last day of the previous one, and that single bogus return dominates the volatility.',
        },
        {
          type: 'code',
          title: 'Drawdown report',
          prompt: md`
            Write \`drawdown_report(stocks, ticker)\` returning a dict for one ticker:

            - \`"max_drawdown"\`: the most negative value of close ÷ running max − 1, rounded to 4
            - \`"trough"\`: the date of that lowest point, as text exactly as in the CSV
            - \`"ma20_last"\`: the 20-day rolling mean of close on the last day, rounded to 2

            The input rows can come in any order.
          `,
          setup: 'import pandas as pd\nstocks = pd.read_csv("data/stocks.csv")',
          starter: py`
            def drawdown_report(stocks, ticker):
                pass
          `,
          solution: py`
            def drawdown_report(stocks, ticker):
                s = stocks[stocks["ticker"] == ticker]
                s = s.sort_values("date").set_index("date")
                c = s["close"]
                dd = c / c.cummax() - 1
                ma = c.rolling(20).mean().iloc[-1]
                return {
                    "max_drawdown": round(float(dd.min()), 4),
                    "trough": dd.idxmin(),
                    "ma20_last": round(float(ma), 2),
                }
          `,
          tests: [
            { call: 'drawdown_report(stocks, "DATA")', name: 'DATA' },
            { call: 'drawdown_report(stocks.iloc[::-1], "PYDJ")', name: 'PYDJ, rows reversed' },
            { call: 'drawdown_report(stocks, "BIGQ")', hidden: true },
          ],
          hints: [
            'Filter the ticker, sort by date, and make `date` the index, so `idxmin()` returns a date.',
            '`dd = c / c.cummax() - 1`. For the moving average: `c.rolling(20).mean().iloc[-1]`.',
          ],
          wrong: [
            'def drawdown_report(stocks, ticker):\n    s = stocks[stocks["ticker"] == ticker].sort_values("date").set_index("date")\n    c = s["close"]\n    dd = c / c.max() - 1\n    return {"max_drawdown": round(float(dd.min()), 4), "trough": dd.idxmin(), "ma20_last": round(float(c.rolling(20).mean().iloc[-1]), 2)}\n',
            'def drawdown_report(stocks, ticker):\n    s = stocks[stocks["ticker"] == ticker].set_index("date")\n    c = s["close"]\n    dd = c / c.cummax() - 1\n    return {"max_drawdown": round(float(dd.min()), 4), "trough": dd.idxmin(), "ma20_last": round(float(c.rolling(20).mean().iloc[-1]), 2)}\n',
          ],
          explain: 'Dividing by the overall max (instead of the running max) compares early prices with a peak that hadn\'t happened yet. Max drawdown is the "how bad could it get" number risk teams care about, and the same cummax trick measures the worst slump of any KPI.',
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u13-l6',
      title: 'Mini Analysis Project',
      summary: 'End-to-end business questions on orders and users, chained and presented.',
      steps: [
        {
          type: 'learn',
          title: 'From question to number',
          body: md`
            Take-homes and analytics interviews reward a repeatable process:

            1. **Define the metric** precisely: which orders count, which date, which denominator
            2. **Shape the data**: filter, join, derive columns
            3. **Aggregate**: groupby or pivot
            4. **Sanity-check**: row counts before and after joins, totals that should match
            5. **Present**: sorted, rounded, clearly named

            Say your definitions out loud. "Revenue = quantity × unit_price of completed orders" prevents half the follow-up questions.
          `,
        },
        {
          type: 'choice',
          prompt: '"Repeat-customer rate" is most commonly defined as…',
          options: ['buyers with 2+ orders ÷ all buyers', 'repeat orders ÷ all orders', 'users with 2+ orders ÷ all users', 'second orders ÷ first orders'],
          answer: 0,
          explain: 'The usual denominator is **buyers** (people who ordered at least once), not all signed-up users. That would mix conversion into the metric. Whichever you use, state it, since interviewers often probe exactly this.',
        },
        {
          type: 'learn',
          title: 'Method chaining: assign and pipe',
          body: md`
            A **chain** reads top to bottom like a recipe and leaves no half-finished variables behind. Wrap it in parentheses so each step can sit on its own line.

            - \`assign(col=lambda d: ...)\` refers to the frame *at that point* in the chain
            - \`.pipe(func, arg)\` calls \`func(frame, arg)\`, so your own helper functions fit into the chain
          `,
          code: py`
            import pandas as pd

            def completed(df):
                return df[df["status"] == "completed"]

            def add_rev(df):
                rev = df["quantity"] * df["unit_price"]
                return df.assign(rev=rev)

            o = pd.read_csv("data/orders.csv")
            top = (o.pipe(completed)
                    .pipe(add_rev)
                    .groupby("category")["rev"].sum()
                    .nlargest(3)
                    .round(2))
            print(top)
          `,
        },
        {
          type: 'order',
          prompt: 'Arrange the lines to print the category with the most completed revenue.',
          lines: [
            'import pandas as pd',
            'o = pd.read_csv("data/orders.csv")',
            'done = o[o["status"] == "completed"]',
            'rev = done["quantity"] * done["unit_price"]',
            'by_cat = rev.groupby(done["category"]).sum()',
            'print(by_cat.idxmax())',
          ],
          distractors: ['by_cat = rev.groupby(o["category"]).sum()'],
          tests: [{ stdout: true }],
          explain: 'A Series can be grouped by another Series that shares its index. Here that is the category of the same (completed) rows.',
        },
        {
          type: 'code',
          title: 'Repeat-customer rate',
          prompt: md`
            Write \`repeat_rate(orders)\` returning the share of **buyers** (users with at least one **completed** order) who have **2 or more** completed orders, rounded to 3. Return \`0.0\` if there are no buyers.
          `,
          setup: ORDERS,
          starter: py`
            def repeat_rate(orders):
                pass
          `,
          solution: py`
            def repeat_rate(orders):
                d = orders[orders["status"] == "completed"]
                n = d.groupby("user_id").size()
                if len(n) == 0:
                    return 0.0
                return round(float((n >= 2).mean()), 3)
          `,
          tests: [
            { call: 'repeat_rate(pd.DataFrame({"user_id": [1, 1, 2, 3, 3], "status": ["completed", "completed", "completed", "completed", "cancelled"]}))', expect: '0.333' },
            { call: 'repeat_rate(orders)', name: 'the orders table' },
            { call: 'repeat_rate(orders[orders["country"] == "NL"])', hidden: true },
            { call: 'repeat_rate(orders.head(0))', expect: '0.0', hidden: true, name: 'no orders' },
          ],
          hints: [
            'Count completed orders per user: `groupby("user_id").size()`.',
            'The mean of the mask `n >= 2` is the share of buyers with 2+ orders.',
          ],
          wrong: [
            'def repeat_rate(orders):\n    n = orders.groupby("user_id").size()\n    if len(n) == 0:\n        return 0.0\n    return round(float((n >= 2).mean()), 3)\n',
            'def repeat_rate(orders):\n    d = orders[orders["status"] == "completed"]\n    n = d.groupby("user_id").size()\n    if len(n) == 0:\n        return 0.0\n    return round(float((n > 2).mean()), 3)\n',
          ],
          explain: 'The mean of a bool Series is a rate, a pattern you\'ll use for every "share of X that…" metric. User 3 has two orders, but only one counts, because the other was cancelled.',
        },
        {
          type: 'code',
          title: 'Monthly revenue by plan',
          prompt: md`
            Write \`monthly_by_plan(orders, users)\` returning a table of **completed** revenue:

            - one row per month, labelled as text \`"2025-01"\`, \`"2025-02"\`, … (from \`order_date\`), sorted
            - one column per plan (\`free\`, \`pro\`, \`team\`)
            - rounded to 2, empty cells 0

            Join the plan from \`users\` on \`user_id\`.
          `,
          setup: OU,
          starter: py`
            def monthly_by_plan(orders, users):
                pass
          `,
          solution: py`
            def monthly_by_plan(orders, users):
                d = orders[orders["status"] == "completed"]
                plans = users[["user_id", "plan"]]
                d = d.merge(plans, on="user_id",
                            validate="many_to_one")
                d = d.assign(
                    month=d["order_date"].str[:7],
                    rev=d["quantity"] * d["unit_price"])
                p = d.pivot_table(index="month", columns="plan",
                                  values="rev", aggfunc="sum",
                                  fill_value=0)
                return p.round(2)
          `,
          tests: [
            { call: 'monthly_by_plan(orders, users)', name: 'all orders' },
            { call: 'monthly_by_plan(orders, users).index[0]', expect: '"2025-01"' },
            { call: 'monthly_by_plan(orders.iloc[:300], users)', hidden: true },
          ],
          hints: [
            'The first 7 characters of `"2025-03-14"` are the month: `d["order_date"].str[:7]`.',
            'Merge the plan in, then `pivot_table(index="month", columns="plan", values="rev", aggfunc="sum", fill_value=0)`.',
          ],
          wrong: [
            'def monthly_by_plan(orders, users):\n    d = orders.merge(users[["user_id", "plan"]], on="user_id")\n    d = d.assign(month=d["order_date"].str[:7], rev=d["quantity"] * d["unit_price"])\n    return d.pivot_table(index="month", columns="plan", values="rev", aggfunc="sum", fill_value=0).round(2)\n',
            'import pandas as pd\n\ndef monthly_by_plan(orders, users):\n    d = orders[orders["status"] == "completed"].merge(users[["user_id", "plan"]], on="user_id")\n    d = d.assign(month=pd.to_datetime(d["order_date"]).dt.month, rev=d["quantity"] * d["unit_price"])\n    return d.pivot_table(index="month", columns="plan", values="rev", aggfunc="sum", fill_value=0).round(2)\n',
          ],
          explain: 'Using `.dt.month` (1–12) would merge January 2025 with January 2026 once a second year arrives. Year-month labels (`str[:7]` or `.dt.to_period("M")`) stay correct. Joining a dimension (plan) onto the facts (orders), then pivoting, is the classic star-schema query.',
        },
        {
          type: 'learn',
          title: 'Presenting results',
          body: md`
            A result is only useful if someone can read it in five seconds:

            - **sort** by what matters, usually the metric, descending
            - **round** sensibly: money to 2 decimals, shares to 1–3
            - **rename** columns to plain words
            - keep the **key** as a column (\`reset_index()\`) when the table goes into a report or CSV
            - say what is **excluded** ("completed orders only, 2025")

            \`f"{x:.1%}"\` formats a share as a percentage, and \`df.to_string(index=False)\` prints a clean table.
          `,
          code: py`
            import pandas as pd

            o = pd.read_csv("data/orders.csv")
            done = o[o["status"] == "completed"]
            share = len(done) / len(o)
            print(f"Completed: {share:.1%} of {len(o):,} orders")
            t = done["country"].value_counts().head(3)
            t = t.rename_axis("Country")
            t = t.reset_index(name="Orders")
            print(t.to_string(index=False))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            share = 0.12345
            print(f"{share:.1%}")
          `,
          options: ['12.3%', '0.1%', '12.35%', '0.12%'],
          answer: 0,
          checkOutput: true,
          explain: 'The `%` format multiplies by 100 and adds the sign, and `.1` keeps one decimal. Keep the stored value as a fraction (0.12345) and format only when displaying.',
        },
        {
          type: 'code',
          title: 'KPI summary',
          prompt: md`
            Write \`kpis(orders)\` returning a dict:

            - \`"revenue"\`: total completed revenue, rounded to 2
            - \`"orders"\`: number of completed orders
            - \`"aov"\`: average order value (revenue ÷ orders), rounded to 2
            - \`"buyers"\`: number of distinct users with a completed order
            - \`"cancel_rate"\`: cancelled orders ÷ all orders, rounded to 3
            - \`"top_country"\`: the country with the highest completed revenue

            You can assume there is at least one completed order.
          `,
          setup: ORDERS,
          starter: py`
            def kpis(orders):
                pass
          `,
          solution: py`
            def kpis(orders):
                d = orders[orders["status"] == "completed"]
                rev = d["quantity"] * d["unit_price"]
                by_c = rev.groupby(d["country"]).sum()
                cancel = (orders["status"] == "cancelled").mean()
                return {
                    "revenue": round(float(rev.sum()), 2),
                    "orders": len(d),
                    "aov": round(float(rev.mean()), 2),
                    "buyers": int(d["user_id"].nunique()),
                    "cancel_rate": round(float(cancel), 3),
                    "top_country": by_c.idxmax(),
                }
          `,
          tests: [
            { call: 'kpis(orders)', name: 'the orders table' },
            { call: 'kpis(orders.iloc[600:])', hidden: true },
            { call: 'kpis(orders[orders["category"] == "Books"])', hidden: true, name: 'only Books' },
            { call: 'kpis(pd.DataFrame({"user_id": [1, 1, 2, 3], "status": ["completed", "completed", "completed", "cancelled"], "quantity": [1, 1, 1, 2], "unit_price": [5.0, 5.0, 100.0, 9.0], "country": ["DE", "DE", "US", "DE"]}))', expect: '{"revenue": 110.0, "orders": 3, "aov": 36.67, "buyers": 2, "cancel_rate": 0.25, "top_country": "US"}', hidden: true, name: 'most orders is not most revenue' },
          ],
          hints: [
            'Filter once (`d`), compute `rev` once, and derive the completed-order KPIs from those.',
            'The cancel rate uses **all** orders. `by_c.idxmax()` gives the top country.',
          ],
          wrong: [
            'def kpis(orders):\n    d = orders[orders["status"] == "completed"]\n    rev = d["quantity"] * d["unit_price"]\n    return {"revenue": round(float(rev.sum()), 2), "orders": len(d), "aov": round(float(rev.sum() / len(orders)), 2), "buyers": int(d["user_id"].nunique()), "cancel_rate": round(float((orders["status"] == "cancelled").mean()), 3), "top_country": rev.groupby(d["country"]).sum().idxmax()}\n',
            'def kpis(orders):\n    d = orders[orders["status"] == "completed"]\n    rev = d["quantity"] * d["unit_price"]\n    return {"revenue": round(float(rev.sum()), 2), "orders": len(d), "aov": round(float(rev.mean()), 2), "buyers": len(d), "cancel_rate": round(float((orders["status"] == "cancelled").mean()), 3), "top_country": rev.groupby(d["country"]).sum().idxmax()}\n',
            'def kpis(orders):\n    d = orders[orders["status"] == "completed"]\n    rev = d["quantity"] * d["unit_price"]\n    return {"revenue": round(float(rev.sum()), 2), "orders": len(d), "aov": round(float(rev.mean()), 2), "buyers": int(d["user_id"].nunique()), "cancel_rate": round(float((orders["status"] == "cancelled").mean()), 3), "top_country": d["country"].value_counts().idxmax()}\n',
          ],
          explain: 'A KPI block is a set of definitions. Each number has its own population (completed vs all orders) and its own unit (orders vs distinct users). "Top country" by revenue and "top country" by order count can differ, so read the spec.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the weekday report',
          prompt: md`
            \`weekday_revenue(orders)\` should return **completed** revenue per weekday, rounded to 2, in **calendar order** Monday → Sunday (weekdays with no orders show 0). It has two bugs.

            Tip: \`s.reindex(DAYS, fill_value=0)\` puts a Series into a given label order.
          `,
          setup: ORDERS,
          starter: py`
            import pandas as pd

            DAYS = ["Monday", "Tuesday", "Wednesday",
                    "Thursday", "Friday", "Saturday", "Sunday"]

            def weekday_revenue(orders):
                d = pd.to_datetime(orders["order_date"])
                day = d.dt.day_name()
                rev = orders["quantity"] * orders["unit_price"]
                return rev.groupby(day).sum().round(2)
          `,
          solution: py`
            import pandas as pd

            DAYS = ["Monday", "Tuesday", "Wednesday",
                    "Thursday", "Friday", "Saturday", "Sunday"]

            def weekday_revenue(orders):
                o = orders[orders["status"] == "completed"]
                d = pd.to_datetime(o["order_date"])
                day = d.dt.day_name()
                rev = o["quantity"] * o["unit_price"]
                out = rev.groupby(day).sum().round(2)
                return out.reindex(DAYS, fill_value=0)
          `,
          tests: [
            { call: 'weekday_revenue(orders)', name: 'the orders table' },
            { call: 'weekday_revenue(orders).index.tolist()[0]', expect: '"Monday"' },
            { call: 'weekday_revenue(orders.head(5))', hidden: true, name: 'only a few days present' },
          ],
          hints: [
            'groupby sorts the day names alphabetically (Friday first). `reindex(DAYS, fill_value=0)` fixes the order and fills missing days.',
            'And the spec says **completed** revenue.',
          ],
          wrong: [
            'import pandas as pd\n\nDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]\n\ndef weekday_revenue(orders):\n    day = pd.to_datetime(orders["order_date"]).dt.day_name()\n    rev = orders["quantity"] * orders["unit_price"]\n    return rev.groupby(day).sum().round(2).reindex(DAYS, fill_value=0)\n',
            'import pandas as pd\n\nDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]\n\ndef weekday_revenue(orders):\n    o = orders[orders["status"] == "completed"]\n    day = pd.to_datetime(o["order_date"]).dt.day_name()\n    rev = o["quantity"] * o["unit_price"]\n    return rev.groupby(day).sum().round(2).reindex(DAYS)\n',
          ],
          explain: '`reindex` is how you impose a business order (weekdays, funnel steps, sizes S/M/L) on a result, and `fill_value=0` turns "no data" into an explicit 0 instead of NaN. Alphabetical weekdays are a giveaway of an unreviewed report.',
        },
        {
          type: 'code',
          title: 'Which channel brings the best customers?',
          prompt: md`
            Write \`channel_report(orders, users)\` returning a DataFrame indexed by \`referrer\` (a missing referrer → \`"unknown"\`) with the columns:

            - \`users\`: number of users from that channel
            - \`buyers\`: users with at least one **completed** order
            - \`conversion\`: buyers ÷ users, rounded to 3
            - \`revenue_per_user\`: completed revenue ÷ users, rounded to 2

            Sort by \`revenue_per_user\`, highest first. Every user counts, including those who never ordered.
          `,
          setup: OU,
          starter: py`
            def channel_report(orders, users):
                pass
          `,
          solution: py`
            def channel_report(orders, users):
                d = orders[orders["status"] == "completed"]
                rev = d["quantity"] * d["unit_price"]
                d = d.assign(rev=rev)
                per_user = d.groupby("user_id",
                                     as_index=False)["rev"].sum()
                u = users.merge(per_user, on="user_id",
                                how="left")
                u["rev"] = u["rev"].fillna(0.0)
                u["buyer"] = u["rev"] > 0
                u["referrer"] = u["referrer"].fillna("unknown")
                t = u.groupby("referrer").agg(
                    users=("user_id", "size"),
                    buyers=("buyer", "sum"),
                    rev=("rev", "sum"))
                conv = t["buyers"] / t["users"]
                t["conversion"] = conv.round(3)
                rpu = t["rev"] / t["users"]
                t["revenue_per_user"] = rpu.round(2)
                t = t.drop(columns="rev")
                return t.sort_values("revenue_per_user",
                                     ascending=False)
          `,
          tests: [
            { call: 'channel_report(orders, users)', name: 'all users' },
            { call: 'channel_report(orders, users)["users"].sum()', expect: '300', name: 'every user counted' },
            { call: 'channel_report(orders.iloc[:400], users)', hidden: true },
          ],
          hints: [
            'Aggregate completed revenue per user first, then **left**-join it onto `users` and fill the non-buyers with 0.',
            'Fill missing referrers with `"unknown"` before grouping. Then `agg(users=("user_id", "size"), buyers=("buyer", "sum"), rev=("rev", "sum"))`.',
          ],
          wrong: [
            'def channel_report(orders, users):\n    d = orders[orders["status"] == "completed"]\n    d = d.assign(rev=d["quantity"] * d["unit_price"])\n    per_user = d.groupby("user_id", as_index=False)["rev"].sum()\n    u = users.merge(per_user, on="user_id", how="inner")\n    u["buyer"] = u["rev"] > 0\n    u["referrer"] = u["referrer"].fillna("unknown")\n    t = u.groupby("referrer").agg(users=("user_id", "size"), buyers=("buyer", "sum"), rev=("rev", "sum"))\n    t["conversion"] = (t["buyers"] / t["users"]).round(3)\n    t["revenue_per_user"] = (t["rev"] / t["users"]).round(2)\n    return t.drop(columns="rev").sort_values("revenue_per_user", ascending=False)\n',
            'def channel_report(orders, users):\n    d = orders[orders["status"] == "completed"]\n    d = d.assign(rev=d["quantity"] * d["unit_price"])\n    per_user = d.groupby("user_id", as_index=False)["rev"].sum()\n    u = users.merge(per_user, on="user_id", how="left")\n    u["rev"] = u["rev"].fillna(0.0)\n    u["buyer"] = u["rev"] > 0\n    t = u.groupby("referrer").agg(users=("user_id", "size"), buyers=("buyer", "sum"), rev=("rev", "sum"))\n    t["conversion"] = (t["buyers"] / t["users"]).round(3)\n    t["revenue_per_user"] = (t["rev"] / t["users"]).round(2)\n    return t.drop(columns="rev").sort_values("revenue_per_user", ascending=False)\n',
            'def channel_report(orders, users):\n    d = orders.assign(rev=orders["quantity"] * orders["unit_price"])\n    per_user = d.groupby("user_id", as_index=False)["rev"].sum()\n    u = users.merge(per_user, on="user_id", how="left")\n    u["rev"] = u["rev"].fillna(0.0)\n    u["buyer"] = u["rev"] > 0\n    u["referrer"] = u["referrer"].fillna("unknown")\n    t = u.groupby("referrer").agg(users=("user_id", "size"), buyers=("buyer", "sum"), rev=("rev", "sum"))\n    t["conversion"] = (t["buyers"] / t["users"]).round(3)\n    t["revenue_per_user"] = (t["rev"] / t["users"]).round(2)\n    return t.drop(columns="rev").sort_values("revenue_per_user", ascending=False)\n',
          ],
          explain: 'This is a real growth-team question, and every step matters. Aggregate first, so the join is one row per user. A **left** join keeps non-buyers, otherwise conversion is 100 % everywhere. Filling NaN keys keeps the "unknown" channel, otherwise groupby drops it. The denominator is all users of the channel.',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u13-exam',
    title: 'pandas Analysis Exam',
    minutes: 35,
    intro: 'A take-home in miniature: groupby, transform, joins, reshaping and time series on the course datasets. Define each metric carefully. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          import pandas as pd
          df = pd.DataFrame({"g": ["a", "a", "b", "b"],
                             "v": [1.0, None, 4.0, 6.0]})
          g = df.groupby("g")["v"]
          r = g.agg(["mean", "size", "count"])
          print(r.loc["a"].tolist())
        `,
        options: ['[1.0, 2.0, 1.0]', '[0.5, 2.0, 1.0]', '[1.0, 1.0, 1.0]', '[nan, 2.0, 1.0]'],
        answer: 0,
        checkOutput: true,
        explain: 'The mean skips NaN (1.0, not 0.5). `size` counts both rows, `count` only the non-missing one. The row mixes float and int, so it prints as floats.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          import pandas as pd
          df = pd.DataFrame({"k": ["x", "y", "x"],
                             "v": [1, 5, 3]})
          m = df.groupby("k")["v"].transform("mean")
          df["d"] = df["v"] - m
          print(df["d"].tolist())
        `,
        answer: '[-1.0, 0.0, 1.0]',
        explain: 'Group x has mean 2, and group y has mean 5. `transform` puts each row\'s group mean next to it, so the subtraction is row by row.',
      },
      {
        type: 'choice',
        prompt: 'Both tables have duplicate keys. What does this print?',
        code: py`
          import pandas as pd
          a = pd.DataFrame({"k": [1, 1, 2], "x": [1, 2, 3]})
          b = pd.DataFrame({"k": [1, 1, 3], "y": [7, 8, 9]})
          print(len(a.merge(b, on="k", how="left")),
                len(a.merge(b, on="k", how="outer")))
        `,
        options: ['5 6', '3 4', '4 6', '5 5'],
        answer: 0,
        checkOutput: true,
        explain: 'Key 1 is 2 × 2 = 4 rows (many-to-many!). The left join adds key 2 with NaN, giving 5. The outer join also adds key 3, giving 6. With many-to-many keys, row counts multiply.',
      },
      {
        type: 'choice',
        prompt: 'You need each order\'s revenue divided by **its user\'s** average order revenue, stored as a new column. Which tool fits?',
        options: ['groupby("user_id").transform("mean")', 'groupby("user_id").agg("mean")', 'pivot_table(aggfunc="mean")', 'resample("D").mean()'],
        answer: 0,
        explain: '`transform` returns one value per original row, aligned with the index, so you can divide directly. `agg` returns one row per user, and you would have to merge it back first.',
      },
      {
        type: 'blanks',
        prompt: 'Weekly mean temperature in Berlin, smoothed over 4 weeks.',
        code: py`
          import pandas as pd
          w = pd.read_csv("data/weather.csv",
                          parse_dates=["date"])
          b = w[w["city"] == "Berlin"].set_index("date")
          weekly = b["temp_c"].___("W").mean()
          smooth = weekly.___(4).mean()
          print(smooth.isna().sum())
        `,
        bank: ['resample', 'rolling', 'groupby', 'shift', 'expanding', 'pct_change'],
        answer: ['resample', 'rolling'],
        tests: [{ var: 'smooth', expect: 'b["temp_c"].resample("W").mean().rolling(4).mean()' }],
        explain: '`resample` changes the frequency (daily → weekly). `rolling` smooths along the result. `expanding` would average everything so far instead of the last 4 weeks.',
      },
      {
        type: 'code',
        title: 'Top customers per country',
        prompt: md`
          Write \`top_customers(orders, users, n)\`: for each country (from the orders table), the \`n\` users with the highest **completed** revenue in that country.

          - columns \`country\`, \`user_id\`, \`name\`, \`plan\`, \`revenue\`
          - round revenue to 2 decimals **first**, then rank
          - sorted by country A→Z, then revenue high → low (ties: smaller user_id first)
          - a 0 … index
        `,
        setup: OU,
        starter: py`
          def top_customers(orders, users, n):
              pass
        `,
        solution: py`
          def top_customers(orders, users, n):
              d = orders[orders["status"] == "completed"]
              rev = d["quantity"] * d["unit_price"]
              d = d.assign(revenue=rev)
              t = d.groupby(["country", "user_id"],
                            as_index=False)["revenue"].sum()
              t["revenue"] = t["revenue"].round(2)
              t = t.sort_values(
                  ["country", "revenue", "user_id"],
                  ascending=[True, False, True])
              t = t.groupby("country").head(n)
              info = users[["user_id", "name", "plan"]]
              t = t.merge(info, on="user_id", how="left",
                          validate="many_to_one")
              cols = ["country", "user_id", "name",
                      "plan", "revenue"]
              return t[cols].reset_index(drop=True)
        `,
        tests: [
          { call: 'top_customers(orders, users, 2)', name: 'top 2 per country' },
          { call: 'top_customers(orders, users, 1)', hidden: true },
          { call: 'top_customers(orders.iloc[::3], users, 3)', hidden: true, name: 'every 3rd order' },
        ],
        wrong: [
          'def top_customers(orders, users, n):\n    d = orders.assign(revenue=orders["quantity"] * orders["unit_price"])\n    t = d.groupby(["country", "user_id"], as_index=False)["revenue"].sum()\n    t["revenue"] = t["revenue"].round(2)\n    t = t.sort_values(["country", "revenue", "user_id"], ascending=[True, False, True]).groupby("country").head(n)\n    t = t.merge(users[["user_id", "name", "plan"]], on="user_id", how="left")\n    return t[["country", "user_id", "name", "plan", "revenue"]].reset_index(drop=True)\n',
          'def top_customers(orders, users, n):\n    d = orders[orders["status"] == "completed"]\n    d = d.assign(revenue=d["quantity"] * d["unit_price"])\n    t = d.groupby(["country", "user_id"], as_index=False)["revenue"].sum()\n    t["revenue"] = t["revenue"].round(2)\n    t = t.sort_values(["revenue", "user_id"], ascending=[False, True]).head(n)\n    t = t.merge(users[["user_id", "name", "plan"]], on="user_id", how="left")\n    return t[["country", "user_id", "name", "plan", "revenue"]].sort_values("country").reset_index(drop=True)\n',
          'def top_customers(orders, users, n):\n    d = orders[orders["status"] == "completed"]\n    d = d.assign(revenue=d["quantity"] * d["unit_price"])\n    t = d.groupby(["country", "user_id"], as_index=False)["revenue"].sum()\n    t["revenue"] = t["revenue"].round(2)\n    t = t.groupby("country").head(n)\n    t = t.merge(users[["user_id", "name", "plan"]], on="user_id", how="left")\n    return t[["country", "user_id", "name", "plan", "revenue"]].reset_index(drop=True)\n',
        ],
        explain: 'Aggregate to the grain you rank at (country, user), sort, take the top N per group, and only then join the descriptive columns. Joining last keeps the join small and avoids any risk of fan-out before the ranking.',
      },
      {
        type: 'code',
        title: 'Big moves',
        prompt: md`
          Write \`big_moves(stocks, pct)\` returning the days on which a ticker's **daily return** (close vs **that ticker's** previous trading day) was larger than \`pct\` in absolute value (\`pct\` is a fraction like 0.04).

          - columns \`date\`, \`ticker\`, \`close\`, \`ret\`
          - filter on the unrounded return, then round \`ret\` to 4
          - sorted by date, then ticker, with a 0 … index
          - the input rows can come in any order. Dates are \`YYYY-MM-DD\` text.
        `,
        setup: 'import pandas as pd\nstocks = pd.read_csv("data/stocks.csv")',
        starter: py`
          def big_moves(stocks, pct):
              pass
        `,
        solution: py`
          def big_moves(stocks, pct):
              s = stocks.sort_values(["ticker", "date"])
              ret = s.groupby("ticker")["close"].pct_change()
              s = s.assign(ret=ret)
              s = s[s["ret"].abs() > pct]
              s = s.assign(ret=s["ret"].round(4))
              s = s.sort_values(["date", "ticker"])
              cols = ["date", "ticker", "close", "ret"]
              return s[cols].reset_index(drop=True)
        `,
        tests: [
          { call: 'big_moves(stocks, 0.04)', name: 'moves over 4 %' },
          { call: 'big_moves(stocks.iloc[::-1], 0.05)', hidden: true, name: 'rows reversed' },
          { call: 'big_moves(stocks.sample(frac=1, random_state=3), 0.03)', hidden: true, name: 'rows shuffled' },
        ],
        wrong: [
          'def big_moves(stocks, pct):\n    s = stocks.sort_values(["ticker", "date"])\n    s = s.assign(ret=s["close"].pct_change())\n    s = s[s["ret"].abs() > pct].assign(ret=lambda d: d["ret"].round(4))\n    return s.sort_values(["date", "ticker"])[["date", "ticker", "close", "ret"]].reset_index(drop=True)\n',
          'def big_moves(stocks, pct):\n    s = stocks.assign(ret=stocks.groupby("ticker")["close"].pct_change())\n    s = s[s["ret"].abs() > pct].assign(ret=lambda d: d["ret"].round(4))\n    return s.sort_values(["date", "ticker"])[["date", "ticker", "close", "ret"]].reset_index(drop=True)\n',
          'def big_moves(stocks, pct):\n    s = stocks.sort_values(["ticker", "date"])\n    s = s.assign(ret=s.groupby("ticker")["close"].pct_change())\n    s = s[s["ret"] > pct].assign(ret=lambda d: d["ret"].round(4))\n    return s.sort_values(["date", "ticker"])[["date", "ticker", "close", "ret"]].reset_index(drop=True)\n',
        ],
        explain: 'Three classic time-series bugs: not sorting by date, computing returns across ticker boundaries, and forgetting that big **drops** count too (`abs()`). Anomaly alerts on any KPI are built exactly like this.',
      },
      {
        type: 'code',
        title: 'City climate summary',
        prompt: md`
          Write \`city_summary(weather)\` returning a DataFrame indexed by city (A→Z) with the columns:

          - \`wettest_month\`: the month number (1–12) with the highest total \`rain_mm\` (an int)
          - \`month_rain\`: that month's total rain, rounded to 1
          - \`hot_days\`: the number of days with \`temp_c\` **above** 25
          - \`warmest_week\`: the highest 7-day rolling mean of \`temp_c\` (days in date order), rounded to 1

          The \`date\` column arrives as text, and the rows can come in any order.
        `,
        setup: 'import pandas as pd\nweather = pd.read_csv("data/weather.csv")',
        starter: py`
          import pandas as pd

          def city_summary(weather):
              pass
        `,
        solution: py`
          import pandas as pd

          def city_summary(weather):
              w = weather.assign(
                  date=pd.to_datetime(weather["date"]))
              w = w.sort_values(["city", "date"])
              rows = {}
              for city, g in w.groupby("city"):
                  m = g.groupby(g["date"].dt.month)
                  rain = m["rain_mm"].sum()
                  t = g["temp_c"]
                  week = t.rolling(7).mean()
                  rows[city] = {
                      "wettest_month": int(rain.idxmax()),
                      "month_rain": round(rain.max(), 1),
                      "hot_days": int((t > 25).sum()),
                      "warmest_week": round(week.max(), 1),
                  }
              out = pd.DataFrame.from_dict(rows,
                                           orient="index")
              return out
        `,
        tests: [
          { call: 'city_summary(weather)', name: 'the weather table' },
          { call: 'city_summary(weather.sample(frac=1, random_state=0))', hidden: true, name: 'rows shuffled' },
          { call: 'city_summary(weather[weather["date"] < "2025-07-01"])', hidden: true, name: 'first half of 2025' },
        ],
        wrong: [
          'import pandas as pd\n\ndef city_summary(weather):\n    w = weather.assign(date=pd.to_datetime(weather["date"]))\n    rows = {}\n    for city, g in w.groupby("city"):\n        rain = g.groupby(g["date"].dt.month)["rain_mm"].sum()\n        rows[city] = {"wettest_month": int(rain.idxmax()), "month_rain": round(float(rain.max()), 1), "hot_days": int((g["temp_c"] > 25).sum()), "warmest_week": round(float(g["temp_c"].rolling(7).mean().max()), 1)}\n    return pd.DataFrame.from_dict(rows, orient="index")\n',
          'import pandas as pd\n\ndef city_summary(weather):\n    w = weather.assign(date=pd.to_datetime(weather["date"])).sort_values(["city", "date"])\n    rows = {}\n    for city, g in w.groupby("city"):\n        rain = g.groupby(g["date"].dt.month)["rain_mm"].mean()\n        rows[city] = {"wettest_month": int(rain.idxmax()), "month_rain": round(float(rain.max()), 1), "hot_days": int((g["temp_c"] > 25).sum()), "warmest_week": round(float(g["temp_c"].rolling(7).mean().max()), 1)}\n    return pd.DataFrame.from_dict(rows, orient="index")\n',
          'import pandas as pd\n\ndef city_summary(weather):\n    w = weather.assign(date=pd.to_datetime(weather["date"])).sort_values(["city", "date"])\n    rows = {}\n    for city, g in w.groupby("city"):\n        rain = g.groupby(g["date"].dt.month)["rain_mm"].sum()\n        rows[city] = {"wettest_month": int(rain.idxmax()), "month_rain": round(float(rain.max()), 1), "hot_days": int((g["temp_c"] >= 25).sum()), "warmest_week": round(float(g["temp_c"].max()), 1)}\n    return pd.DataFrame.from_dict(rows, orient="index")\n',
        ],
        explain: 'Looping over `groupby` is fine when there are few groups and each needs several different calculations. The rolling window only means "7 consecutive days" after sorting by date, which is what the shuffled hidden test checks. A fully vectorised version uses `groupby("city")["temp_c"].rolling(7).mean()`.',
      },
      {
        type: 'code',
        kind: 'fix',
        title: 'Fix the monthly buyers',
        prompt: md`
          \`monthly_buyers(orders)\` should return a DataFrame indexed by month number (1–12) with:

          - \`buyers\`: the number of **distinct** users with at least one **completed** order that month
          - \`growth\`: the change vs the **previous** month as a fraction (\`pct_change\`), rounded to 3 (NaN for the first month)

          It has three bugs.
        `,
        setup: ORDERS,
        starter: py`
          import pandas as pd

          def monthly_buyers(orders):
              o = orders.copy()
              d = pd.to_datetime(o["order_date"])
              o["month"] = d.dt.month
              t = o.groupby("month").agg(
                  buyers=("user_id", "count"))
              t["growth"] = t["buyers"].pct_change(-1).round(3)
              return t
        `,
        solution: py`
          import pandas as pd

          def monthly_buyers(orders):
              o = orders[orders["status"] == "completed"]
              d = pd.to_datetime(o["order_date"])
              o = o.assign(month=d.dt.month)
              t = o.groupby("month").agg(
                  buyers=("user_id", "nunique"))
              t["growth"] = t["buyers"].pct_change().round(3)
              return t
        `,
        tests: [
          { call: 'monthly_buyers(orders)', name: 'the orders table' },
          { call: 'monthly_buyers(orders.iloc[300:900])', hidden: true },
          { call: 'monthly_buyers(orders[orders["country"] == "US"])', hidden: true, name: 'only US' },
        ],
        wrong: [
          'import pandas as pd\n\ndef monthly_buyers(orders):\n    o = orders[orders["status"] == "completed"]\n    o = o.assign(month=pd.to_datetime(o["order_date"]).dt.month)\n    t = o.groupby("month").agg(buyers=("user_id", "count"))\n    t["growth"] = t["buyers"].pct_change().round(3)\n    return t\n',
          'import pandas as pd\n\ndef monthly_buyers(orders):\n    o = orders.assign(month=pd.to_datetime(orders["order_date"]).dt.month)\n    t = o.groupby("month").agg(buyers=("user_id", "nunique"))\n    t["growth"] = t["buyers"].pct_change().round(3)\n    return t\n',
          'import pandas as pd\n\ndef monthly_buyers(orders):\n    o = orders[orders["status"] == "completed"]\n    o = o.assign(month=pd.to_datetime(o["order_date"]).dt.month)\n    t = o.groupby("month").agg(buyers=("user_id", "nunique"))\n    t["growth"] = t["buyers"].pct_change(-1).round(3)\n    return t\n',
        ],
        explain: 'Bugs: no status filter, `count` (orders) instead of `nunique` (people), and `pct_change(-1)`, which compares with the **next** month. "Monthly active buyers" and its growth rate are the first chart in most product reviews, so these bugs would be very visible.',
      },
    ],
  },
};

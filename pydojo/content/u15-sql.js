// Unit 15 — SQL with Python (track: data)
import { py, md } from './helpers.js';

// Hidden setup: an in-memory SQLite database loaded from the CSV files ------
const DB_HEAD = py`
  import sqlite3
  import csv
  conn = sqlite3.connect(":memory:")

  def _load(fname, table, cols):
      with open("data/" + fname) as f:
          rows = list(csv.reader(f))[1:]
      rows = [[v if v != "" else None for v in r]
              for r in rows]
      conn.execute(f"CREATE TABLE {table} ({cols})")
      qs = ",".join("?" * len(rows[0]))
      conn.executemany(
          f"INSERT INTO {table} VALUES ({qs})", rows)
`;

const TABLES = {
  orders: '_load("orders.csv", "orders", "order_id INTEGER, user_id INTEGER, order_date TEXT, product TEXT, category TEXT, quantity INTEGER, unit_price REAL, country TEXT, status TEXT")',
  users: '_load("users.csv", "users", "user_id INTEGER, name TEXT, signup_date TEXT, country TEXT, plan TEXT, age INTEGER, referrer TEXT")',
  events: '_load("events.csv", "events", "user_id INTEGER, ts TEXT, event TEXT, device TEXT")',
  employees: '_load("employees.csv", "employees", "emp_id INTEGER, name TEXT, dept_id INTEGER, manager_id INTEGER, salary INTEGER, hire_date TEXT")',
  departments: '_load("departments.csv", "departments", "dept_id INTEGER, dept_name TEXT, location TEXT")',
};

const db = (...names) => [DB_HEAD, ...names.map((n) => TABLES[n]), 'del _load', 'conn.commit()'].join('\n');

// Schemas for prompts
const T_ORDERS = '`orders(order_id, user_id, order_date, product, category, quantity, unit_price, country, status)`';
const T_USERS = '`users(user_id, name, signup_date, country, plan, age, referrer)`';
const T_EVENTS = '`events(user_id, ts, event, device)`';
const T_EMP = '`employees(emp_id, name, dept_id, manager_id, salary, hire_date)`';
const T_DEPT = '`departments(dept_id, dept_name, location)`';

const ROWS = { call: 'conn.execute(sql).fetchall()', name: 'rows match (values and order)' };
const SQL_STARTER = 'sql = """\nSELECT ...\nFROM ...\n"""\n';

export default {
  id: 'u15',
  order: 15,
  track: 'data',
  title: 'SQL with Python',
  subtitle: 'sqlite3, joins, window functions',
  icon: '🗄️',
  color: '#0891B2',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u15-l1',
      title: 'sqlite3 & SELECT',
      summary: 'Run SQL from Python, filter and sort rows, and pass values safely.',
      steps: [
        {
          type: 'learn',
          title: 'A database in one line',
          body: md`
            Python ships with **sqlite3**: a complete SQL database, stored in a file or entirely in memory (\`":memory:"\`).

            1. \`conn = sqlite3.connect(...)\` opens it.
            2. \`conn.execute(sql)\` runs a statement and returns a **cursor**.
            3. \`.fetchall()\` gives a list of tuples, \`.fetchone()\` one tuple (or \`None\`).

            The SQL you learn here runs almost unchanged on Postgres, BigQuery, Snowflake or Spark SQL.
          `,
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            conn.execute("""CREATE TABLE users
                (id INTEGER, name TEXT, plan TEXT)""")
            conn.execute("""INSERT INTO users VALUES
                (1, 'Ada', 'pro'), (2, 'Linus', 'free')""")
            cur = conn.execute("SELECT * FROM users")
            print(cur.fetchall())
            cur = conn.execute("SELECT name FROM users")
            print(cur.fetchone())
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            print(conn.execute("SELECT 2 * 21").fetchone())
          `,
          options: ['(42,)', '42', '[(42,)]', '[42]'],
          answer: 0,
          checkOutput: true,
          explain: 'Every row comes back as a **tuple**, even with a single column. `fetchone()` returns one row: `(42,)`. `fetchall()` would wrap it in a list: `[(42,)]`. Use `row[0]` to get the bare value.',
        },
        {
          type: 'learn',
          title: 'SELECT, WHERE, ORDER BY, LIMIT',
          body: md`
            \`\`\`sql
            SELECT product, unit_price
            FROM orders
            WHERE country = 'DE' AND quantity >= 3
            ORDER BY unit_price DESC, product
            LIMIT 5;
            \`\`\`

            - Text uses **single quotes**: \`'DE'\`.
            - \`ORDER BY\` is ascending unless you write \`DESC\`. A second key breaks ties.
            - \`SELECT DISTINCT category\` removes duplicate rows.
            - Without \`ORDER BY\`, the row order is **not guaranteed**.

            In this lesson \`conn\` is already connected to a database with ${T_ORDERS} and ${T_USERS}.
          `,
          setup: db('orders', 'users'),
          code: py`
            sql = """
            SELECT product, unit_price
            FROM orders
            WHERE country = 'DE' AND quantity >= 3
            ORDER BY unit_price DESC, product
            LIMIT 5
            """
            for row in conn.execute(sql):
                print(row)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            conn.executescript("""
            CREATE TABLE s (name TEXT, score INT);
            INSERT INTO s VALUES ('ana', 81), ('bo', 65),
                                 ('cy', 92), ('di', 70);
            """)
            q = """SELECT name FROM s
            WHERE score >= 70 ORDER BY score"""
            print(conn.execute(q).fetchall())
          `,
          answer: "[('di',), ('ana',), ('cy',)]",
          explain: 'bo (65) is filtered out. The rest is sorted ascending by score: 70, 81, 92. Each row is a one-element tuple. `executescript` runs several `;`-separated statements at once.',
        },
        {
          type: 'code',
          title: 'Big orders from Croatia',
          prompt: md`
            Table ${T_ORDERS}.

            Write a query in \`sql\` returning \`order_id, product, quantity\` of **completed** orders from **HR** with a quantity of **at least 3**, newest first (\`order_date\` descending). Break ties by \`order_id\` ascending.
          `,
          setup: db('orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT order_id, product, quantity
            FROM orders
            WHERE status = 'completed'
              AND country = 'HR'
              AND quantity >= 3
            ORDER BY order_date DESC, order_id
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("INSERT INTO orders VALUES (9002, 1, \'2025-12-31\', \'Lamp\', \'Home\', 3, 35.0, \'HR\', \'completed\')")\nconn.execute("INSERT INTO orders VALUES (9001, 1, \'2025-12-31\', \'Mug\', \'Home\', 4, 8.9, \'HR\', \'completed\')")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'two orders on the same day: lower order_id first',
            },
          ],
          hints: [
            'Combine the three conditions with `AND`. Text values need single quotes: `\'HR\'`.',
            '`ORDER BY order_date DESC, order_id` sorts by date, then by id inside each date.',
          ],
          wrong: [
            py`
              sql = """
              SELECT order_id, product, quantity
              FROM orders
              WHERE country = 'HR' AND quantity >= 3
              ORDER BY order_date DESC, order_id
              """
            `,
            py`
              sql = """
              SELECT order_id, product, quantity
              FROM orders
              WHERE status = 'completed'
                AND country = 'HR'
                AND quantity > 3
              ORDER BY order_date DESC, order_id
              """
            `,
            py`
              sql = """
              SELECT order_id, product, quantity
              FROM orders
              WHERE status = 'completed'
                AND country = 'HR'
                AND quantity >= 3
              ORDER BY order_date DESC
              """
            `,
          ],
          explain: 'Dates stored as ISO text ("2025-12-31") sort correctly as strings, which is why ISO format is the standard. The tie-breaker makes the output **deterministic**: without it, two same-day orders may come back in any order, and a test, a report diff or a paginated API will flicker.',
        },
        {
          type: 'blanks',
          prompt: 'List the first three categories alphabetically, each only once.',
          setup: db('orders'),
          code: py`
            sql = """
            SELECT ___ category
            FROM orders
            ORDER BY category
            ___ 3
            """
            print(conn.execute(sql).fetchall())
          `,
          bank: ['DISTINCT', 'LIMIT', 'UNIQUE', 'TOP', 'ALL', 'OFFSET'],
          answer: ['DISTINCT', 'LIMIT'],
          tests: [{ stdout: "[('Books',), ('Electronics',), ('Grocery',)]\n" }],
          explain: '`DISTINCT` deduplicates the selected columns, and `LIMIT` caps the number of rows. `TOP 3` is SQL Server syntax, and `UNIQUE` is a constraint, not a SELECT keyword.',
        },
        {
          type: 'choice',
          prompt: 'You run `SELECT * FROM orders LIMIT 5` twice on a busy production database. Are you guaranteed the same 5 rows?',
          options: [
            'No: without ORDER BY order is undefined',
            'Yes: rows come back in insert order',
            'Yes: LIMIT takes the oldest rows',
            'Only if the table has a primary key',
          ],
          answer: 0,
          explain: 'Tables are **sets**: the engine returns rows in whatever order is cheapest (parallel scans, indexes, compaction). For "top 5" or pagination, always `ORDER BY` a unique key.',
        },
        {
          type: 'learn',
          title: 'Parameters, never f-strings',
          body: md`
            Never paste values into SQL with f-strings or \`+\`. If \`name\` comes from a user, \`x' OR '1'='1\` turns your filter into "every row". That's **SQL injection**, still one of the most common security bugs.

            Use \`?\` placeholders and pass a tuple. sqlite3 sends the values separately, so they can never become SQL:

            \`\`\`python
            conn.execute("SELECT * FROM users WHERE plan = ? AND age > ?", ("pro", 30))
            \`\`\`

            Placeholders work for **values** only, not for table or column names.
          `,
          setup: db('users'),
          code: py`
            name = "x' OR '1'='1"
            bad = ("SELECT COUNT(*) FROM users "
                   f"WHERE name = '{name}'")
            print(bad)
            print(conn.execute(bad).fetchone())
            good = ("SELECT COUNT(*) FROM users "
                    "WHERE name = ?")
            print(conn.execute(good, (name,)).fetchone())
          `,
        },
        {
          type: 'choice',
          prompt: 'Which call is safe when `country` was typed by a user?',
          options: [
            'execute("… = ?", (country,))',
            "execute(f\"… = '{country}'\")",
            "execute(\"… = '\" + country + \"'\")",
            "execute(\"… = '%s'\" % country)",
          ],
          answer: 0,
          explain: 'Only the placeholder version keeps data and code apart. The other three build the SQL text from user input: different syntax, same injection hole. Note the trailing comma: `(country,)` is a one-element tuple.',
        },
        {
          type: 'code',
          title: 'Safe order lookup',
          prompt: md`
            Write \`orders_in(conn, country, min_qty)\` that returns a list of \`(order_id, quantity)\` tuples for orders from \`country\` with \`quantity >= min_qty\`, ordered by \`order_id\`. Use \`?\` parameters: the tests include a malicious country string.
          `,
          setup: db('orders'),
          starter: 'def orders_in(conn, country, min_qty):\n    pass\n',
          solution: py`
            def orders_in(conn, country, min_qty):
                sql = """
                SELECT order_id, quantity
                FROM orders
                WHERE country = ? AND quantity >= ?
                ORDER BY order_id
                """
                params = (country, min_qty)
                return conn.execute(sql, params).fetchall()
          `,
          tests: [
            { call: 'orders_in(conn, "HR", 4)', name: 'HR, at least 4 items' },
            { call: 'orders_in(conn, "DE\' OR \'1\'=\'1", 1)', expect: '[]', name: 'SQL injection attempt returns nothing' },
            { call: 'orders_in(conn, "NL", 5)', hidden: true },
            { call: 'orders_in(conn, "XX", 1)', expect: '[]', hidden: true, name: 'unknown country' },
          ],
          hints: [
            'Put `?` where the values go: `WHERE country = ? AND quantity >= ?`.',
            'Pass them in order: `conn.execute(sql, (country, min_qty)).fetchall()`.',
          ],
          wrong: [
            py`
              def orders_in(conn, country, min_qty):
                  sql = f"""
                  SELECT order_id, quantity
                  FROM orders
                  WHERE country = '{country}'
                    AND quantity >= {min_qty}
                  ORDER BY order_id
                  """
                  return conn.execute(sql).fetchall()
            `,
            py`
              def orders_in(conn, country, min_qty):
                  sql = """
                  SELECT order_id, quantity
                  FROM orders
                  WHERE country = ? AND quantity > ?
                  ORDER BY order_id
                  """
                  params = (country, min_qty)
                  return conn.execute(sql, params).fetchall()
            `,
          ],
          explain: 'With the f-string version, the injected `OR \'1\'=\'1\'` returns every order. Swap SELECT for DELETE and you lose the table. Parameters are also faster: the database can cache the prepared statement and reuse it for every call.',
        },
        {
          type: 'order',
          prompt: '`rows` is a list of `(city, temp)` tuples. Arrange the lines to load them into a new table and print the hottest city.',
          setup: 'rows = [("Zagreb", 21.5), ("Berlin", 18.0), ("Madrid", 27.0)]',
          lines: [
            'import sqlite3',
            'conn = sqlite3.connect(":memory:")',
            'conn.execute("CREATE TABLE t (city TEXT, temp REAL)")',
            'conn.executemany("INSERT INTO t VALUES (?, ?)", rows)',
            'top = conn.execute("SELECT city FROM t ORDER BY temp DESC")',
            'print(top.fetchone())',
          ],
          distractors: ['conn.execute("INSERT INTO t VALUES (?, ?)", rows)'],
          tests: [{ stdout: "('Madrid',)\n" }],
          explain: '`executemany` runs the INSERT once per tuple: the fast way to bulk-load. `execute` with a list of tuples fails, because it expects the parameters of **one** row. `fetchone()` takes just the first row of the sorted result. Adding `LIMIT 1` would let the database stop early.',
        },
        {
          type: 'code',
          title: 'Most expensive products',
          prompt: md`
            Write \`top_products(conn, category, n)\` that returns the \`n\` most expensive **distinct** \`(product, unit_price)\` pairs in \`category\` from ${T_ORDERS}: highest price first, ties by product name. Pass both values as parameters (\`LIMIT ?\` works too).

            \`\`\`python
            top_products(conn, "Books", 2)
            # [('Data Science Handbook', 45.0), ('Python Crash Course', 32.0)]
            \`\`\`
          `,
          setup: db('orders'),
          starter: 'def top_products(conn, category, n):\n    pass\n',
          solution: py`
            def top_products(conn, category, n):
                sql = """
                SELECT DISTINCT product, unit_price
                FROM orders
                WHERE category = ?
                ORDER BY unit_price DESC, product
                LIMIT ?
                """
                cur = conn.execute(sql, (category, n))
                return cur.fetchall()
          `,
          tests: [
            { call: 'top_products(conn, "Books", 2)', expect: "[('Data Science Handbook', 45.0), ('Python Crash Course', 32.0)]" },
            { call: 'top_products(conn, "Toys", 10)', name: 'fewer products than n' },
            { call: 'top_products(conn, "Electronics", 1)', hidden: true },
            { call: 'top_products(conn, "Grocery", 3)', hidden: true },
          ],
          hints: [
            'Every order of the same product repeats the row, so you need `SELECT DISTINCT`.',
            '`ORDER BY unit_price DESC, product LIMIT ?` with params `(category, n)`.',
          ],
          wrong: [
            py`
              def top_products(conn, category, n):
                  sql = """
                  SELECT product, unit_price
                  FROM orders
                  WHERE category = ?
                  ORDER BY unit_price DESC, product
                  LIMIT ?
                  """
                  return conn.execute(sql, (category, n)).fetchall()
            `,
            py`
              def top_products(conn, category, n):
                  sql = """
                  SELECT DISTINCT product, unit_price
                  FROM orders
                  WHERE category = ?
                  ORDER BY unit_price, product
                  LIMIT ?
                  """
                  return conn.execute(sql, (category, n)).fetchall()
            `,
          ],
          explain: 'DISTINCT runs **before** ORDER BY and LIMIT. Without it the top rows are the same product repeated. On big tables DISTINCT needs a sort or hash of all rows, so filter first (WHERE), then deduplicate.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u15-l2',
      title: 'Aggregates & GROUP BY',
      summary: 'COUNT/SUM/AVG, grouping, HAVING vs WHERE, NULLs and conditional aggregation.',
      steps: [
        {
          type: 'learn',
          title: 'Aggregate functions',
          body: md`
            Aggregates collapse many rows into one value: \`COUNT(*)\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`. \`AS\` names the output column, \`ROUND(x, 2)\` rounds.

            \`\`\`sql
            SELECT COUNT(*) AS n_orders,
                   ROUND(SUM(quantity * unit_price), 2) AS revenue
            FROM orders
            WHERE status = 'completed';
            \`\`\`

            Gotcha: in SQLite (and Postgres), **int / int is integer division**: \`7 / 2\` is 3. Multiply by \`1.0\` first.

            \`conn\` has ${T_ORDERS} and ${T_USERS}.
          `,
          setup: db('orders', 'users'),
          code: py`
            sql = """
            SELECT COUNT(*) AS n_orders,
                   ROUND(SUM(quantity * unit_price), 2)
                     AS revenue,
                   ROUND(AVG(unit_price), 2) AS avg_price,
                   MIN(order_date), MAX(order_date)
            FROM orders
            WHERE status = 'completed'
            """
            print(conn.execute(sql).fetchone())
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            q = "SELECT 7 / 2, 7 * 1.0 / 2, ROUND(2.675, 1)"
            print(conn.execute(q).fetchone())
          `,
          answer: '(3, 3.5, 2.7)',
          explain: 'Two integers give integer division (3). `7 * 1.0` makes it a float first. This bug silently turns conversion rates into 0 in real dashboards: `SUM(converted) / COUNT(*)` is 0 in SQLite and Postgres.',
        },
        {
          type: 'learn',
          title: 'GROUP BY, then HAVING',
          body: md`
            \`GROUP BY\` makes one output row per group. **WHERE filters rows before grouping. HAVING filters groups after aggregating**, so only HAVING can use aggregates.

            \`\`\`sql
            SELECT category, COUNT(*) AS n
            FROM orders
            WHERE status = 'completed'   -- rows
            GROUP BY category
            HAVING COUNT(*) >= 150       -- groups
            ORDER BY n DESC;
            \`\`\`

            Logical order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Every selected column must be grouped or aggregated.
          `,
          setup: db('orders'),
          code: py`
            sql = """
            SELECT category, COUNT(*) AS n
            FROM orders
            WHERE status = 'completed'
            GROUP BY category
            HAVING COUNT(*) >= 150
            ORDER BY n DESC
            """
            print(conn.execute(sql).fetchall())
          `,
        },
        {
          type: 'order',
          prompt: 'Arrange the lines into a valid query: completed orders per category, only categories with more than 150 of them, biggest first.',
          setup: db('orders'),
          lines: [
            'sql = """',
            'SELECT category, COUNT(*) AS n',
            'FROM orders',
            "WHERE status = 'completed'",
            'GROUP BY category',
            'HAVING COUNT(*) > 150',
            'ORDER BY n DESC',
            '"""',
          ],
          distractors: ['WHERE COUNT(*) > 150'],
          tests: [{ call: 'conn.execute(sql).fetchall()' }],
          explain: 'The written order is fixed: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT. A condition on `COUNT(*)` must go into HAVING, since WHERE runs before any group exists.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          setup: db('orders'),
          code: py`
            q = """SELECT country FROM orders
            WHERE COUNT(*) > 100 GROUP BY country"""
            try:
                conn.execute(q)
            except Exception as e:
                print(type(e).__name__ + ":", e)
          `,
          options: [
            'OperationalError: misuse of aggregate: COUNT()',
            "[('DE',), ('US',)]",
            '[]',
            'SyntaxError: invalid syntax',
          ],
          answer: 0,
          checkOutput: true,
          explain: 'WHERE is evaluated per row, before groups exist, so an aggregate can\'t appear there. Move the condition to `HAVING COUNT(*) > 100`. sqlite3 raises `sqlite3.OperationalError` for errors like this.',
        },
        {
          type: 'code',
          title: 'Revenue by category',
          prompt: md`
            Using ${T_ORDERS}, write \`sql\`: for **completed** orders, return \`category\`, \`n_orders\` and \`revenue\` (sum of \`quantity * unit_price\`, rounded to 2). Keep only categories with revenue **above 5,000**. Highest revenue first.
          `,
          setup: db('orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT category,
                   COUNT(*) AS n_orders,
                   ROUND(SUM(quantity * unit_price), 2)
                     AS revenue
            FROM orders
            WHERE status = 'completed'
            GROUP BY category
            HAVING SUM(quantity * unit_price) > 5000
            ORDER BY revenue DESC
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE orders SET status = \'cancelled\' WHERE category = \'Toys\' AND order_id % 2 = 0")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'after half the Toys orders were cancelled',
            },
          ],
          hints: [
            'Status filter → WHERE. Revenue filter → HAVING (it uses SUM).',
            '`HAVING SUM(quantity * unit_price) > 5000` then `ORDER BY revenue DESC`.',
          ],
          wrong: [
            py`
              sql = """
              SELECT category,
                     COUNT(*) AS n_orders,
                     ROUND(SUM(quantity * unit_price), 2)
                       AS revenue
              FROM orders
              GROUP BY category
              HAVING SUM(quantity * unit_price) > 5000
              ORDER BY revenue DESC
              """
            `,
            py`
              sql = """
              SELECT category,
                     COUNT(*) AS n_orders,
                     ROUND(SUM(unit_price), 2) AS revenue
              FROM orders
              WHERE status = 'completed'
              GROUP BY category
              HAVING SUM(unit_price) > 5000
              ORDER BY revenue DESC
              """
            `,
          ],
          explain: 'SQLite (and MySQL) also accept the alias in HAVING (`HAVING revenue > 5000`), but Postgres and most warehouses don\'t: repeat the expression to stay portable. Filtering rows in WHERE first means fewer rows to group: on billions of rows, push every filter as early as possible.',
        },
        {
          type: 'learn',
          title: 'NULL: the missing value',
          body: md`
            \`NULL\` means "unknown". The rules that bite:
            - \`COUNT(*)\` counts rows. \`COUNT(col)\` counts non-NULL values. \`COUNT(DISTINCT col)\` counts unique non-NULL values.
            - \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\` skip NULLs.
            - \`x = NULL\` is never true. Use \`x IS NULL\` / \`IS NOT NULL\`.
            - \`COALESCE(x, 'none')\` replaces NULL.

            In \`users\`, some \`age\` and \`referrer\` values are NULL.
          `,
          setup: db('users'),
          code: py`
            sql = """
            SELECT COUNT(*), COUNT(age), COUNT(referrer),
                   COUNT(DISTINCT plan), ROUND(AVG(age), 1)
            FROM users
            """
            print(conn.execute(sql).fetchone())
            bad = """SELECT COUNT(*) FROM users
            WHERE age = NULL"""
            print(conn.execute(bad).fetchone())
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            conn.execute("CREATE TABLE t (x INT)")
            conn.execute("""INSERT INTO t
                VALUES (2), (NULL), (4)""")
            q = "SELECT COUNT(*), COUNT(x), AVG(x) FROM t"
            print(conn.execute(q).fetchone())
          `,
          options: ['(3, 2, 3.0)', '(3, 3, 2.0)', '(2, 2, 3.0)', '(3, 2, 2.0)'],
          answer: 0,
          checkOutput: true,
          explain: '3 rows, but only 2 non-NULL values. AVG skips the NULL: (2 + 4) / 2 = 3.0, not (2 + 0 + 4) / 3 = 2.0. If missing means "zero" in your business logic, say so with `AVG(COALESCE(x, 0))`.',
        },
        {
          type: 'code',
          title: 'Plan profile with missing data',
          prompt: md`
            Using ${T_USERS} (\`age\` and \`referrer\` can be NULL), write \`sql\` that returns per \`plan\`:

            - \`users\`: all users
            - \`with_age\`: users with a known age
            - \`avg_age\`: average of the **known** ages, rounded to 1
            - \`no_referrer\`: users whose referrer is NULL

            Order by plan.
          `,
          setup: db('users'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT plan,
                   COUNT(*) AS users,
                   COUNT(age) AS with_age,
                   ROUND(AVG(age), 1) AS avg_age,
                   COUNT(*) - COUNT(referrer)
                     AS no_referrer
            FROM users
            GROUP BY plan
            ORDER BY plan
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE users SET age = NULL, referrer = NULL WHERE user_id % 5 = 0")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'with more missing values',
            },
          ],
          hints: [
            '`COUNT(age)` counts only non-NULL ages, and `AVG(age)` already ignores NULLs.',
            'NULL referrers = all rows minus the non-NULL ones: `COUNT(*) - COUNT(referrer)` (or `SUM(referrer IS NULL)`).',
          ],
          wrong: [
            py`
              sql = """
              SELECT plan,
                     COUNT(*) AS users,
                     COUNT(age) AS with_age,
                     ROUND(AVG(COALESCE(age, 0)), 1) AS avg_age,
                     COUNT(*) - COUNT(referrer)
                       AS no_referrer
              FROM users
              GROUP BY plan
              ORDER BY plan
              """
            `,
            py`
              sql = """
              SELECT plan,
                     COUNT(age) AS users,
                     COUNT(age) AS with_age,
                     ROUND(AVG(age), 1) AS avg_age,
                     SUM(referrer = NULL) AS no_referrer
              FROM users
              GROUP BY plan
              ORDER BY plan
              """
            `,
          ],
          explain: 'Treating missing ages as 0 drags the average down. A classic silent bug when someone "cleans" NULLs with COALESCE. `referrer = NULL` is NULL for every row, so its SUM is NULL. Always report how many values are missing next to an average.',
        },
        {
          type: 'learn',
          title: 'CASE WHEN: conditional aggregation',
          body: md`
            \`CASE\` is SQL's if/else. Inside an aggregate it counts or sums only some rows, which is how you **pivot** in SQL:

            \`\`\`sql
            SELECT country,
              COUNT(*) AS n,
              SUM(CASE WHEN status = 'cancelled'
                       THEN 1 ELSE 0 END) AS cancelled,
              AVG(CASE WHEN status = 'completed'
                       THEN 1.0 ELSE 0 END) AS done_rate
            FROM orders
            GROUP BY country;
            \`\`\`

            The AVG of a 0/1 flag is a rate. Without ELSE, CASE returns NULL, which SUM and AVG skip.
          `,
          setup: db('orders'),
          code: py`
            sql = """
            SELECT country, COUNT(*) AS n,
              SUM(CASE WHEN category = 'Books'
                       THEN 1 ELSE 0 END) AS books,
              SUM(CASE WHEN category = 'Toys'
                       THEN 1 ELSE 0 END) AS toys
            FROM orders
            GROUP BY country
            ORDER BY n DESC
            LIMIT 3
            """
            print(conn.execute(sql).fetchall())
          `,
        },
        {
          type: 'blanks',
          prompt: 'Find the category with the most **returned** orders.',
          setup: db('orders'),
          code: py`
            sql = """
            SELECT category,
              SUM(___ status = 'returned'
                  THEN 1 ELSE 0 ___) AS returns
            FROM orders
            GROUP BY category
            ORDER BY returns DESC, category
            LIMIT 1
            """
            print(conn.execute(sql).fetchall())
          `,
          bank: ['CASE WHEN', 'END', 'IF', 'ELSE', 'DONE', 'WHERE'],
          answer: ['CASE WHEN', 'END'],
          tests: [{ stdout: "[('Books', 12)]\n" }],
          explain: 'Every CASE ends with END. Three categories tie at 12 returns, so the tie-breaker `category` picks Books. Without it, the answer would depend on the engine.',
        },
        {
          type: 'code',
          title: 'Problem orders by country',
          prompt: md`
            Using ${T_ORDERS}, write \`sql\` returning per \`country\`:
            - \`orders\`: all orders
            - \`completed\`: orders with status completed
            - \`problem_rate\`: share of orders that were **cancelled or returned**, rounded to 3

            Only countries with **at least 100** orders. Highest problem_rate first, ties by country.
          `,
          setup: db('orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT country,
              COUNT(*) AS orders,
              SUM(CASE WHEN status = 'completed'
                       THEN 1 ELSE 0 END) AS completed,
              ROUND(AVG(CASE WHEN status IN
                    ('cancelled', 'returned')
                    THEN 1.0 ELSE 0 END), 3)
                AS problem_rate
            FROM orders
            GROUP BY country
            HAVING COUNT(*) >= 100
            ORDER BY problem_rate DESC, country
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE orders SET status = \'returned\' WHERE country = \'ES\' AND order_id % 3 = 0")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'after a wave of returns in ES',
            },
          ],
          hints: [
            '`SUM(CASE WHEN … THEN 1 ELSE 0 END)` counts, `AVG(CASE WHEN … THEN 1.0 ELSE 0 END)` gives a rate.',
            '`status IN (\'cancelled\', \'returned\')` matches both. The 100-order filter needs HAVING.',
          ],
          wrong: [
            py`
              sql = """
              SELECT country,
                COUNT(*) AS orders,
                SUM(CASE WHEN status = 'completed'
                         THEN 1 ELSE 0 END) AS completed,
                ROUND(SUM(CASE WHEN status IN
                      ('cancelled', 'returned')
                      THEN 1 ELSE 0 END) / COUNT(*), 3)
                  AS problem_rate
              FROM orders
              GROUP BY country
              HAVING COUNT(*) >= 100
              ORDER BY problem_rate DESC, country
              """
            `,
            py`
              sql = """
              SELECT country,
                COUNT(*) AS orders,
                SUM(CASE WHEN status = 'completed'
                         THEN 1 ELSE 0 END) AS completed,
                ROUND(AVG(CASE WHEN status = 'cancelled'
                      THEN 1.0 ELSE 0 END), 3)
                  AS problem_rate
              FROM orders
              GROUP BY country
              HAVING COUNT(*) >= 100
              ORDER BY problem_rate DESC, country
              """
            `,
          ],
          explain: '`SUM(...) / COUNT(*)` with two integers is integer division: every rate becomes 0. The minimum-volume filter matters too: a country with 5 orders and 2 returns would top a ranking with a meaningless 40 %. Always check a rate\'s denominator.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the top spenders query',
          prompt: md`
            The analyst wants every user with **at least 5 completed orders**: \`user_id\`, number of completed orders \`n\` and total \`spend\` (sum of \`quantity * unit_price\`, rounded to 2), biggest spend first, ties by user_id.

            The query runs but the numbers are wrong. Find the **two** bugs.
          `,
          setup: db('orders'),
          starter: py`
            sql = """
            SELECT user_id,
                   COUNT(*) AS n,
                   ROUND(SUM(unit_price), 2) AS spend
            FROM orders
            GROUP BY user_id
            HAVING COUNT(*) >= 5
            ORDER BY spend DESC, user_id
            """
          `,
          solution: py`
            sql = """
            SELECT user_id,
                   COUNT(*) AS n,
                   ROUND(SUM(quantity * unit_price), 2)
                     AS spend
            FROM orders
            WHERE status = 'completed'
            GROUP BY user_id
            HAVING COUNT(*) >= 5
            ORDER BY spend DESC, user_id
            """
          `,
          tests: [ROWS],
          hints: [
            'Which orders should count at all? Add a WHERE.',
            'Spend must include the quantity.',
          ],
          wrong: [
            py`
              sql = """
              SELECT user_id,
                     COUNT(*) AS n,
                     ROUND(SUM(unit_price), 2) AS spend
              FROM orders
              WHERE status = 'completed'
              GROUP BY user_id
              HAVING COUNT(*) >= 5
              ORDER BY spend DESC, user_id
              """
            `,
            py`
              sql = """
              SELECT user_id,
                     COUNT(*) AS n,
                     ROUND(SUM(quantity * unit_price), 2)
                       AS spend
              FROM orders
              GROUP BY user_id
              HAVING COUNT(*) >= 5
              ORDER BY spend DESC, user_id
              """
            `,
          ],
          explain: 'Cancelled and returned orders aren\'t spend, and they also inflate `n`, which changes who passes the HAVING filter. Both bugs produce plausible-looking numbers, the worst kind. Sanity-check one user by hand against the raw rows.',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u15-l3',
      title: 'JOINs',
      summary: 'INNER vs LEFT joins, self-joins, anti-joins and the row-multiplication trap.',
      steps: [
        {
          type: 'learn',
          title: 'INNER JOIN',
          body: md`
            A join matches rows of two tables on a condition:

            \`\`\`sql
            SELECT e.name, d.dept_name
            FROM employees AS e
            JOIN departments AS d
              ON d.dept_id = e.dept_id;
            \`\`\`

            \`JOIN\` (= \`INNER JOIN\`) keeps only pairs that match on **both** sides. Aliases (\`e\`, \`d\`) keep queries short and are required when both tables have a column with the same name.

            An employee whose \`dept_id\` is NULL matches nothing, so they **disappear**. \`conn\` has ${T_EMP} and ${T_DEPT}.
          `,
          setup: db('employees', 'departments'),
          code: py`
            total = conn.execute(
                "SELECT COUNT(*) FROM employees").fetchone()
            sql = """
            SELECT e.name, d.dept_name
            FROM employees AS e
            JOIN departments AS d
              ON d.dept_id = e.dept_id
            """
            rows = conn.execute(sql).fetchall()
            print(total, len(rows))
            print(rows[:3])
          `,
        },
        {
          type: 'choice',
          prompt: 'How many employees does the inner join lose? What does this print?',
          setup: db('employees', 'departments'),
          code: py`
            a = conn.execute("""SELECT COUNT(*)
            FROM employees""").fetchone()[0]
            b = conn.execute("""SELECT COUNT(*)
            FROM employees e JOIN departments d
              ON d.dept_id = e.dept_id""").fetchone()[0]
            print(a - b)
          `,
          options: ['1', '0', '5', '43'],
          answer: 0,
          checkOutput: true,
          explain: 'One contractor has `dept_id` NULL, and `NULL = 1` is never true, so their row has no partner. Silently dropped rows are the #1 join bug in reporting: headcounts and revenue that don\'t add up to the total.',
        },
        {
          type: 'learn',
          title: 'LEFT JOIN keeps everyone',
          body: md`
            \`LEFT JOIN\` keeps **every row of the left table**. Where nothing matches, the right side's columns are NULL. Put the table you must not lose (all employees, all users, all days) on the left.

            \`\`\`sql
            SELECT d.dept_name, COUNT(e.emp_id) AS headcount
            FROM departments d
            LEFT JOIN employees e ON e.dept_id = d.dept_id
            GROUP BY d.dept_id, d.dept_name;
            \`\`\`

            Count with \`COUNT(right.col)\`, not \`COUNT(*)\`: an unmatched left row is still 1 row. \`COALESCE(d.dept_name, 'Unassigned')\` labels the gaps.
          `,
          setup: db('employees', 'departments'),
          code: py`
            sql = """
            SELECT e.name,
                   COALESCE(d.dept_name, 'Unassigned')
            FROM employees e
            LEFT JOIN departments d
              ON d.dept_id = e.dept_id
            ORDER BY e.emp_id DESC
            LIMIT 3
            """
            print(conn.execute(sql).fetchall())
          `,
        },
        {
          type: 'code',
          title: 'Headcount per department',
          prompt: md`
            Using ${T_DEPT} and ${T_EMP}, write \`sql\` returning \`dept_name\`, \`headcount\` and \`avg_salary\` (rounded to 0) for **every** department, including departments without employees (headcount 0, avg_salary NULL).

            Order by headcount descending, then dept_name.
          `,
          setup: db('employees', 'departments'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT d.dept_name,
                   COUNT(e.emp_id) AS headcount,
                   ROUND(AVG(e.salary), 0) AS avg_salary
            FROM departments d
            LEFT JOIN employees e
              ON e.dept_id = d.dept_id
            GROUP BY d.dept_id, d.dept_name
            ORDER BY headcount DESC, d.dept_name
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("INSERT INTO departments VALUES (6, \'Legal\', \'Paris\')")',
              call: 'conn.execute(sql).fetchall()',
              name: 'a new, empty department shows headcount 0',
            },
          ],
          hints: [
            'Start FROM departments and LEFT JOIN employees, so every department survives.',
            '`COUNT(e.emp_id)` gives 0 for a department with no match. `COUNT(*)` would give 1.',
          ],
          wrong: [
            py`
              sql = """
              SELECT d.dept_name,
                     COUNT(e.emp_id) AS headcount,
                     ROUND(AVG(e.salary), 0) AS avg_salary
              FROM departments d
              JOIN employees e ON e.dept_id = d.dept_id
              GROUP BY d.dept_id, d.dept_name
              ORDER BY headcount DESC, d.dept_name
              """
            `,
            py`
              sql = """
              SELECT d.dept_name,
                     COUNT(*) AS headcount,
                     ROUND(AVG(e.salary), 0) AS avg_salary
              FROM departments d
              LEFT JOIN employees e
                ON e.dept_id = d.dept_id
              GROUP BY d.dept_id, d.dept_name
              ORDER BY headcount DESC, d.dept_name
              """
            `,
          ],
          explain: 'The inner join hides the new department entirely; `COUNT(*)` reports a headcount of 1 for it. "Show all X, including those with zero Y" is one of the most common interview prompts, and the answer is always LEFT JOIN + COUNT(column).',
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints (three lines).',
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            conn.executescript("""
            CREATE TABLE u (id INT, name TEXT);
            CREATE TABLE o (uid INT, amt INT);
            INSERT INTO u VALUES (1, 'ana'), (2, 'bo'),
                                 (3, 'cy');
            INSERT INTO o VALUES (1, 10), (1, 5), (3, 7);
            """)
            q = """SELECT u.name, COUNT(o.uid), SUM(o.amt)
            FROM u LEFT JOIN o ON o.uid = u.id
            GROUP BY u.name ORDER BY u.name"""
            for row in conn.execute(q):
                print(row)
          `,
          answer: "('ana', 2, 15)\n('bo', 0, None)\n('cy', 1, 7)",
          explain: 'bo has no orders: the LEFT JOIN keeps him with NULLs, `COUNT(o.uid)` is 0, and `SUM` of nothing is NULL (`None` in Python), not 0. Wrap it in `COALESCE(SUM(o.amt), 0)` if you want 0.',
        },
        {
          type: 'learn',
          title: 'Self-joins and three tables',
          body: md`
            A table can join **itself** under two aliases. \`manager_id\` points to another employee's \`emp_id\`:

            \`\`\`sql
            SELECT e.name AS employee, m.name AS manager
            FROM employees e
            LEFT JOIN employees m ON m.emp_id = e.manager_id;
            \`\`\`

            Chain joins to bring in more tables, one \`JOIN … ON …\` per table:

            \`\`\`sql
            SELECT e.name, d.dept_name, m.name AS manager
            FROM employees e
            LEFT JOIN departments d ON d.dept_id = e.dept_id
            LEFT JOIN employees m ON m.emp_id = e.manager_id;
            \`\`\`
          `,
          setup: db('employees', 'departments'),
          code: py`
            sql = """
            SELECT e.name, d.dept_name, m.name AS manager
            FROM employees e
            LEFT JOIN departments d
              ON d.dept_id = e.dept_id
            LEFT JOIN employees m
              ON m.emp_id = e.manager_id
            ORDER BY e.emp_id
            LIMIT 4
            """
            for row in conn.execute(sql):
                print(row)
          `,
        },
        {
          type: 'code',
          title: 'Earning more than the boss',
          prompt: md`
            A classic interview question. Using ${T_EMP}, write \`sql\` returning \`(employee name, employee salary, manager name, manager salary)\` for employees who earn **strictly more than their manager**. Highest employee salary first, ties by employee name.

            (Today, nobody does, so the first test expects an empty result. The other tests give people raises.)
          `,
          setup: db('employees'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT e.name, e.salary, m.name, m.salary
            FROM employees e
            JOIN employees m ON m.emp_id = e.manager_id
            WHERE e.salary > m.salary
            ORDER BY e.salary DESC, e.name
            """
          `,
          tests: [
            { call: 'conn.execute(sql).fetchall()', expect: '[]', name: 'current data: nobody' },
            {
              given: 'conn.execute("UPDATE employees SET salary = 130000 WHERE emp_id IN (5, 14)")',
              call: 'conn.execute(sql).fetchall()',
              name: 'two employees get a raise to 130,000',
            },
            {
              given: 'conn.execute("UPDATE employees SET salary = 124800 WHERE emp_id = 2")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'equal to the manager is not more',
            },
            {
              given: 'conn.execute("UPDATE employees SET salary = 999999 WHERE emp_id = 30")\nconn.execute("UPDATE employees SET salary = 90000 WHERE emp_id = 40")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
          ],
          hints: [
            'Join employees to itself: `FROM employees e JOIN employees m ON m.emp_id = e.manager_id`.',
            'Then compare the two salary columns in WHERE.',
          ],
          wrong: [
            py`
              sql = """
              SELECT e.name, e.salary, m.name, m.salary
              FROM employees e
              JOIN employees m ON m.emp_id = e.manager_id
              WHERE e.salary >= m.salary
              ORDER BY e.salary DESC, e.name
              """
            `,
            py`
              sql = """
              SELECT e.name, e.salary, m.name, m.salary
              FROM employees e
              JOIN employees m ON m.manager_id = e.emp_id
              WHERE e.salary > m.salary
              ORDER BY e.salary DESC, e.name
              """
            `,
          ],
          explain: 'The direction of the ON condition decides who is who: `m.emp_id = e.manager_id` makes `m` the manager of `e`. Swap it and `m` becomes `e`\'s reports. Managers themselves have NULL manager_id, so the inner join correctly drops them here.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines: names of employees earning over 100,000, each with their manager\'s name, sorted by employee name.',
          setup: db('employees'),
          lines: [
            'sql = """',
            'SELECT e.name, m.name AS manager',
            'FROM employees e',
            'JOIN employees m ON m.emp_id = e.manager_id',
            'WHERE e.salary > 100000',
            'ORDER BY e.name',
            '"""',
          ],
          distractors: ['JOIN employees m ON m.manager_id = e.emp_id'],
          tests: [{ call: 'conn.execute(sql).fetchall()' }],
          explain: 'FROM introduces `e`, the JOIN introduces `m` as `e`\'s manager, WHERE filters on the employee\'s salary. The distractor joins in the wrong direction (finding reports instead of managers).',
        },
        {
          type: 'learn',
          title: 'Anti-joins and row explosions',
          body: md`
            **Anti-join**: rows with *no* match. "Users who never ordered":

            \`\`\`sql
            SELECT u.user_id
            FROM users u
            LEFT JOIN orders o ON o.user_id = u.user_id
            WHERE o.order_id IS NULL;
            \`\`\`

            Conditions on the right table belong in **ON**. In WHERE they'd discard the NULL rows you're looking for.

            **Row multiplication**: a user with 3 orders and 5 events becomes 3 × 5 = 15 rows when you join both, so every SUM is inflated. Aggregate each table first, or use \`COUNT(DISTINCT …)\`. Check row counts before and after every join.
          `,
          setup: db('orders', 'events'),
          code: py`
            q = """
            SELECT COUNT(*) FROM orders o
            JOIN events e ON e.user_id = o.user_id
            WHERE o.user_id = 235
            """
            def count(table):
                return conn.execute(
                    f"SELECT COUNT(*) FROM {table} "
                    "WHERE user_id = 235").fetchone()[0]
            both = conn.execute(q).fetchone()[0]
            print(count("orders"), count("events"), both)
          `,
        },
        {
          type: 'code',
          title: 'Users without a completed order',
          prompt: md`
            Using ${T_USERS} and ${T_ORDERS}, write \`sql\` returning \`user_id, name, plan\` of users who have **no completed order** (they may have cancelled or returned ones). Order by user_id.
          `,
          setup: db('users', 'orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT u.user_id, u.name, u.plan
            FROM users u
            LEFT JOIN orders o
              ON o.user_id = u.user_id
             AND o.status = 'completed'
            WHERE o.order_id IS NULL
            ORDER BY u.user_id
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE orders SET status = \'returned\' WHERE user_id IN (3, 4, 5)")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
          ],
          hints: [
            'LEFT JOIN orders and keep the rows where the order side is NULL.',
            'Put `AND o.status = \'completed\'` into the **ON** clause, not into WHERE.',
          ],
          wrong: [
            py`
              sql = """
              SELECT u.user_id, u.name, u.plan
              FROM users u
              LEFT JOIN orders o ON o.user_id = u.user_id
              WHERE o.status = 'completed'
                AND o.order_id IS NULL
              ORDER BY u.user_id
              """
            `,
            py`
              sql = """
              SELECT u.user_id, u.name, u.plan
              FROM users u
              LEFT JOIN orders o ON o.user_id = u.user_id
              WHERE o.order_id IS NULL
              ORDER BY u.user_id
              """
            `,
          ],
          explain: 'With the status test in WHERE, unmatched rows have `o.status` = NULL and are thrown away, so the result is always empty. In ON, it restricts *which orders may match*, and users with only cancelled orders survive as NULL rows. `WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.user_id AND o.status = \'completed\')` is the equivalent subquery form (next lesson).',
        },
        {
          type: 'choice',
          prompt: 'User 7 has 3 orders and 4 sessions. What does `SELECT COUNT(*) FROM orders o JOIN sessions s ON s.user_id = o.user_id WHERE o.user_id = 7` return?',
          options: ['12', '7', '3', '4'],
          answer: 0,
          explain: 'Every order pairs with every session of the same user: 3 × 4 = 12 rows. A `SUM(o.amount)` over this join would count each order 4 times. On big data such fan-outs can also explode a join from millions to billions of rows.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the buyer count',
          prompt: md`
            Product wants the number of **distinct users** with at least one **completed** order, per user country, most buyers first, ties by country. This query (on ${T_USERS} and ${T_ORDERS}) returns numbers that are far too high. Fix the **two** bugs.
          `,
          setup: db('users', 'orders'),
          starter: py`
            sql = """
            SELECT u.country, COUNT(*) AS buyers
            FROM users u
            JOIN orders o ON o.user_id = u.user_id
            GROUP BY u.country
            ORDER BY buyers DESC, u.country
            """
          `,
          solution: py`
            sql = """
            SELECT u.country,
                   COUNT(DISTINCT u.user_id) AS buyers
            FROM users u
            JOIN orders o ON o.user_id = u.user_id
            WHERE o.status = 'completed'
            GROUP BY u.country
            ORDER BY buyers DESC, u.country
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE orders SET status = \'cancelled\' WHERE user_id < 100")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
          ],
          hints: [
            'After the join there is one row per **order**. What are you counting?',
            'Count `DISTINCT u.user_id`, and only completed orders should make someone a buyer.',
          ],
          wrong: [
            py`
              sql = """
              SELECT u.country,
                     COUNT(DISTINCT u.user_id) AS buyers
              FROM users u
              JOIN orders o ON o.user_id = u.user_id
              GROUP BY u.country
              ORDER BY buyers DESC, u.country
              """
            `,
            py`
              sql = """
              SELECT u.country, COUNT(*) AS buyers
              FROM users u
              JOIN orders o ON o.user_id = u.user_id
              WHERE o.status = 'completed'
              GROUP BY u.country
              ORDER BY buyers DESC, u.country
              """
            `,
          ],
          explain: 'A join to a one-to-many table multiplies rows. COUNT(*) then counts orders, not people. `COUNT(DISTINCT …)` is correct but costly on huge tables (it must remember every id), so warehouses offer approximate versions such as `APPROX_COUNT_DISTINCT` (HyperLogLog).',
        },
        {
          type: 'code',
          title: 'Manager summary',
          prompt: md`
            Using ${T_EMP} and ${T_DEPT}, write \`sql\` with one row per manager: \`dept_name\` (the manager's department), \`manager\` (name), \`reports\` (number of people with that \`manager_id\`) and \`avg_report_salary\` (their average salary, rounded to 0). Order by dept_name.
          `,
          setup: db('employees', 'departments'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT d.dept_name,
                   m.name AS manager,
                   COUNT(*) AS reports,
                   ROUND(AVG(e.salary), 0)
                     AS avg_report_salary
            FROM employees e
            JOIN employees m ON m.emp_id = e.manager_id
            JOIN departments d ON d.dept_id = m.dept_id
            GROUP BY d.dept_name, m.emp_id, m.name
            ORDER BY d.dept_name
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("INSERT INTO employees VALUES (44, \'Ana Novak\', 2, 13, 99000, \'2025-06-01\')")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'a new report joins the Data team',
            },
          ],
          hints: [
            'Start from the reports `e`, join their manager `m`, then join the manager\'s department.',
            'Group by the manager. COUNT(*) then counts that manager\'s reports.',
          ],
          wrong: [
            py`
              sql = """
              SELECT d.dept_name, m.name AS manager,
                     COUNT(*) AS reports,
                     ROUND(AVG(e.salary), 0)
                       AS avg_report_salary
              FROM employees e
              JOIN departments d ON d.dept_id = e.dept_id
              JOIN employees m ON m.dept_id = d.dept_id
               AND m.manager_id IS NULL
              GROUP BY d.dept_name, m.emp_id, m.name
              ORDER BY d.dept_name
              """
            `,
            py`
              sql = """
              SELECT d.dept_name,
                     m.name AS manager,
                     COUNT(*) AS reports,
                     ROUND(AVG(m.salary), 0)
                       AS avg_report_salary
              FROM employees e
              JOIN employees m ON m.emp_id = e.manager_id
              JOIN departments d ON d.dept_id = m.dept_id
              GROUP BY d.dept_name, m.emp_id, m.name
              ORDER BY d.dept_name
              """
            `,
          ],
          explain: 'Joining "everyone in the department" to "the department\'s manager" counts the manager as their own report. Follow the real relationship (`manager_id`) instead. Grouping by `m.emp_id` as well as the name keeps two managers with the same name apart.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u15-l4',
      title: 'Subqueries & CTEs',
      summary: 'Scalar, IN and correlated subqueries, and WITH clauses for step-by-step queries.',
      steps: [
        {
          type: 'learn',
          title: 'Scalar subqueries',
          body: md`
            A query in parentheses can be used inside another one. A **scalar** subquery returns a single value, so it fits anywhere a number fits:

            \`\`\`sql
            SELECT name, salary,
                   salary - (SELECT AVG(salary) FROM employees) AS vs_avg
            FROM employees
            WHERE salary > (SELECT AVG(salary) FROM employees)
            ORDER BY salary DESC;
            \`\`\`

            \`conn\` has ${T_EMP}, ${T_DEPT}, ${T_ORDERS} and ${T_USERS}.
          `,
          setup: db('employees', 'departments', 'orders', 'users'),
          code: py`
            sql = """
            SELECT name, salary,
                   ROUND(salary - (SELECT AVG(salary)
                                   FROM employees))
            FROM employees
            WHERE salary > (SELECT AVG(salary)
                            FROM employees)
            ORDER BY salary DESC
            LIMIT 4
            """
            for row in conn.execute(sql):
                print(row)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            conn.executescript("""
            CREATE TABLE p (name TEXT, price INT);
            INSERT INTO p VALUES ('a', 10), ('b', 20),
                                 ('c', 60);
            """)
            q = """SELECT name,
              price - (SELECT AVG(price) FROM p)
            FROM p
            WHERE price > (SELECT AVG(price) FROM p)"""
            print(conn.execute(q).fetchall())
          `,
          answer: "[('c', 30.0)]",
          explain: 'AVG(price) = 30.0 (a float, even from integers). Only c is above it, by 30.0.',
        },
        {
          type: 'code',
          title: 'Unusually large orders',
          prompt: md`
            Using ${T_ORDERS}, write \`sql\` returning \`order_id\` and \`value\` (\`quantity * unit_price\`, rounded to 2) of **completed** orders whose value is more than **5 times the average value of completed orders**. Largest value first, ties by order_id.
          `,
          setup: db('orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT order_id,
                   ROUND(quantity * unit_price, 2) AS value
            FROM orders
            WHERE status = 'completed'
              AND quantity * unit_price > 5 * (
                  SELECT AVG(quantity * unit_price)
                  FROM orders
                  WHERE status = 'completed')
            ORDER BY value DESC, order_id
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE orders SET quantity = 5 WHERE category = \'Books\' AND quantity = 4")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
          ],
          hints: [
            'Compute the threshold in a scalar subquery: `(SELECT AVG(quantity * unit_price) FROM orders WHERE …)`.',
            'The outer query needs the status filter too.',
          ],
          wrong: [
            py`
              sql = """
              SELECT order_id,
                     ROUND(quantity * unit_price, 2) AS value
              FROM orders
              WHERE status = 'completed'
                AND unit_price > 5 * (
                    SELECT AVG(unit_price) FROM orders
                    WHERE status = 'completed')
              ORDER BY value DESC, order_id
              """
            `,
            py`
              sql = """
              SELECT order_id,
                     ROUND(quantity * unit_price, 2) AS value
              FROM orders
              WHERE quantity * unit_price > 5 * (
                  SELECT AVG(quantity * unit_price)
                  FROM orders
                  WHERE status = 'completed')
              ORDER BY value DESC, order_id
              """
            `,
          ],
          explain: 'The subquery is not correlated (it doesn\'t reference the outer row), so the database computes it once. A "k × average" rule is a quick outlier screen. With skewed revenue, k × median or the IQR rule (U14) is more robust.',
        },
        {
          type: 'learn',
          title: 'IN and EXISTS',
          body: md`
            \`IN (subquery)\` tests membership in a list of values:

            \`\`\`sql
            SELECT user_id, name FROM users
            WHERE user_id IN (SELECT user_id FROM orders
                              WHERE category = 'Electronics');
            \`\`\`

            Unlike a JOIN, IN never duplicates rows: a user with 5 matching orders appears once.

            Careful with \`NOT IN\`: if the subquery returns any NULL, \`x NOT IN (…)\` is never true and you get **no rows**. Prefer \`NOT EXISTS (SELECT 1 FROM … WHERE …)\`.
          `,
          setup: db('orders', 'users'),
          code: py`
            q_in = """SELECT COUNT(*) FROM users
            WHERE user_id IN (
              SELECT user_id FROM orders
              WHERE category = 'Electronics')"""
            q_join = """SELECT COUNT(*) FROM users u
            JOIN orders o ON o.user_id = u.user_id
            WHERE o.category = 'Electronics'"""
            print(conn.execute(q_in).fetchone(),
                  conn.execute(q_join).fetchone())
          `,
        },
        {
          type: 'code',
          title: 'Readers, not gadget buyers',
          prompt: md`
            Using ${T_USERS} and ${T_ORDERS}, write \`sql\` returning \`user_id, name\` of **pro**-plan users who ordered at least one **Books** item but **never** ordered **Electronics** (any status). Order by user_id. Each user once.
          `,
          setup: db('users', 'orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT user_id, name
            FROM users
            WHERE plan = 'pro'
              AND user_id IN (
                  SELECT user_id FROM orders
                  WHERE category = 'Books')
              AND user_id NOT IN (
                  SELECT user_id FROM orders
                  WHERE category = 'Electronics')
            ORDER BY user_id
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE users SET plan = \'pro\' WHERE user_id < 60")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
          ],
          hints: [
            'One `IN (…)` for Books and one `NOT IN (…)` for Electronics.',
            '`orders.user_id` is never NULL, so NOT IN is safe here. NOT EXISTS works too.',
          ],
          wrong: [
            py`
              sql = """
              SELECT u.user_id, u.name
              FROM users u
              JOIN orders o ON o.user_id = u.user_id
              WHERE u.plan = 'pro'
                AND o.category = 'Books'
                AND u.user_id NOT IN (
                    SELECT user_id FROM orders
                    WHERE category = 'Electronics')
              ORDER BY u.user_id
              """
            `,
            py`
              sql = """
              SELECT user_id, name
              FROM users
              WHERE plan = 'pro'
                AND user_id IN (
                    SELECT user_id FROM orders
                    WHERE category = 'Books')
              ORDER BY user_id
              """
            `,
          ],
          explain: 'The JOIN version returns a user once per Books order. You could patch it with DISTINCT, but IN states the intent ("is in the set") directly. A semi-join like this is also what query planners optimise best.',
        },
        {
          type: 'learn',
          title: 'Correlated subqueries',
          body: md`
            A **correlated** subquery references the outer row, so it is evaluated once per row:

            \`\`\`sql
            SELECT e.name, e.dept_id, e.salary
            FROM employees e
            WHERE e.salary > (
              SELECT AVG(x.salary) FROM employees x
              WHERE x.dept_id = e.dept_id
            );
            \`\`\`

            "Earns more than the average **of their own department**." Easy to read, but naively O(n²): fine for 43 rows, painful for 43 million unless the database rewrites it. Window functions (next lesson) do it in one pass.
          `,
          setup: db('employees'),
          code: py`
            sql = """
            SELECT e.name, e.dept_id, e.salary
            FROM employees e
            WHERE e.salary > (
              SELECT AVG(x.salary) FROM employees x
              WHERE x.dept_id = e.dept_id)
            ORDER BY e.dept_id, e.salary DESC
            LIMIT 5
            """
            for row in conn.execute(sql):
                print(row)
          `,
        },
        {
          type: 'choice',
          prompt: 'The contractor Robin has `dept_id` NULL. Does Robin appear in the correlated "above own department average" query?',
          options: [
            'No: x.dept_id = NULL is never true',
            'Yes: compared with the company average',
            'Yes: NULL counts as department 0',
            'The query raises an error',
          ],
          answer: 0,
          explain: 'For Robin the subquery matches no rows, so AVG returns NULL. `salary > NULL` is NULL (not true), so the row is filtered out. NULL propagates silently through comparisons, so decide explicitly how unassigned rows should be handled.',
        },
        {
          type: 'code',
          title: 'Above their department\'s average',
          prompt: md`
            Using ${T_EMP} and ${T_DEPT}, write \`sql\` returning \`dept_name, name, salary, dept_avg\` (the department's average salary, rounded to 0) for employees earning **more than their own department's average**. Order by dept_name, then salary descending, then name.
          `,
          setup: db('employees', 'departments'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT d.dept_name, e.name, e.salary,
                   ROUND((SELECT AVG(x.salary)
                          FROM employees x
                          WHERE x.dept_id = e.dept_id), 0)
                     AS dept_avg
            FROM employees e
            JOIN departments d ON d.dept_id = e.dept_id
            WHERE e.salary > (
                SELECT AVG(x.salary) FROM employees x
                WHERE x.dept_id = e.dept_id)
            ORDER BY d.dept_name, e.salary DESC, e.name
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE employees SET salary = salary + 30000 WHERE dept_id = 5")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
            {
              given: 'conn.execute("UPDATE employees SET salary = 99000 WHERE emp_id IN (34, 35)")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'two Marketing salaries tie',
            },
            {
              given: 'conn.execute("UPDATE employees SET salary = 50000 WHERE dept_id = 4")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'equal to the average is not above it',
            },
          ],
          hints: [
            'Correlate on department: `WHERE x.dept_id = e.dept_id` inside the subquery.',
            'You can use the same subquery twice: once in SELECT (rounded) and once in WHERE.',
          ],
          wrong: [
            py`
              sql = """
              SELECT d.dept_name, e.name, e.salary,
                     ROUND((SELECT AVG(salary)
                            FROM employees), 0) AS dept_avg
              FROM employees e
              JOIN departments d ON d.dept_id = e.dept_id
              WHERE e.salary > (SELECT AVG(salary)
                                FROM employees)
              ORDER BY d.dept_name, e.salary DESC, e.name
              """
            `,
            py`
              sql = """
              SELECT d.dept_name, e.name, e.salary,
                     ROUND((SELECT AVG(x.salary)
                            FROM employees x
                            WHERE x.dept_id = e.dept_id), 0)
                       AS dept_avg
              FROM employees e
              JOIN departments d ON d.dept_id = e.dept_id
              WHERE e.salary >= (
                  SELECT AVG(x.salary) FROM employees x
                  WHERE x.dept_id = e.dept_id)
              ORDER BY d.dept_name, e.salary DESC
              """
            `,
          ],
          explain: 'Comparing with the company average says "works in a well-paid department", not "is paid well for their department". Most of Engineering would pass and almost nobody in Support. This exact question ("above department average") is a favourite. The window-function version is `AVG(salary) OVER (PARTITION BY dept_id)`.',
        },
        {
          type: 'learn',
          title: 'WITH: common table expressions',
          body: md`
            A **CTE** names a subquery so you can build a query in readable steps, like variables in Python:

            \`\`\`sql
            WITH monthly AS (
              SELECT strftime('%Y-%m', order_date) AS month,
                     SUM(quantity * unit_price) AS revenue
              FROM orders WHERE status = 'completed'
              GROUP BY month
            )
            SELECT month, ROUND(revenue, 2) FROM monthly
            WHERE revenue > (SELECT AVG(revenue) FROM monthly);
            \`\`\`

            \`strftime('%Y-%m', d)\` turns a date into its month. Chain CTEs with commas: \`WITH a AS (…), b AS (SELECT … FROM a) SELECT …\`. Interviewers love CTEs: they show structured thinking.
          `,
          setup: db('orders'),
          code: py`
            sql = """
            WITH monthly AS (
              SELECT strftime('%Y-%m', order_date) AS month,
                     SUM(quantity * unit_price) AS revenue
              FROM orders WHERE status = 'completed'
              GROUP BY month
            )
            SELECT month, ROUND(revenue, 2) FROM monthly
            WHERE revenue > (SELECT AVG(revenue)
                             FROM monthly)
            """
            print(conn.execute(sql).fetchall())
          `,
        },
        {
          type: 'blanks',
          prompt: 'Count the users with at least 8 orders.',
          setup: db('orders'),
          code: py`
            sql = """
            ___ big AS (
              SELECT user_id, COUNT(*) AS n
              FROM orders
              GROUP BY user_id
              HAVING COUNT(*) >= 8
            )
            SELECT COUNT(*) ___ big
            """
            print(conn.execute(sql).fetchone())
          `,
          bank: ['WITH', 'FROM', 'AS', 'SELECT', 'INTO', 'WHERE'],
          answer: ['WITH', 'FROM'],
          tests: [{ call: 'conn.execute(sql).fetchone()' }],
          explain: 'The CTE `big` holds one row per heavy user. The main query reads from it like a table. Two-level aggregation ("count the users whose count is ≥ 8") always needs a subquery or CTE.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines into a CTE query: average number of orders per user, by plan.',
          setup: db('orders', 'users'),
          lines: [
            'sql = """WITH per_user AS (',
            '  SELECT user_id, COUNT(*) AS n',
            '  FROM orders GROUP BY user_id',
            ')',
            'SELECT u.plan, ROUND(AVG(p.n), 2)',
            'FROM per_user p',
            'JOIN users u ON u.user_id = p.user_id',
            'GROUP BY u.plan ORDER BY u.plan"""',
          ],
          distractors: ['JOIN users u ON u.plan = p.user_id'],
          tests: [{ call: 'conn.execute(sql).fetchall()' }],
          explain: 'Step 1 (the CTE) aggregates orders to one row per user. Step 2 joins users and averages per plan. Aggregating before joining avoids the row-multiplication trap.',
        },
        {
          type: 'code',
          title: 'Repeat buyers by country',
          prompt: md`
            Using ${T_ORDERS} (the country is the buyer's country), write \`sql\` returning per \`country\`:
            - \`buyers\`: users with at least one **completed** order
            - \`repeaters\`: users with at least **two** completed orders
            - \`repeat_rate\`: repeaters / buyers, rounded to 3

            Highest repeat_rate first, ties by country.
          `,
          setup: db('orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH per_user AS (
              SELECT country, user_id, COUNT(*) AS n
              FROM orders
              WHERE status = 'completed'
              GROUP BY country, user_id
            )
            SELECT country,
                   COUNT(*) AS buyers,
                   SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END)
                     AS repeaters,
                   ROUND(AVG(CASE WHEN n >= 2
                             THEN 1.0 ELSE 0 END), 3)
                     AS repeat_rate
            FROM per_user
            GROUP BY country
            ORDER BY repeat_rate DESC, country
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("DELETE FROM orders WHERE order_id % 2 = 0")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'with half the orders removed',
            },
          ],
          hints: [
            'CTE: one row per (country, user) with their number of completed orders.',
            'Outer query: COUNT(*) = buyers, a CASE on `n >= 2` gives repeaters and the rate.',
          ],
          wrong: [
            py`
              sql = """
              WITH per_user AS (
                SELECT country, user_id, COUNT(*) AS n
                FROM orders
                GROUP BY country, user_id
              )
              SELECT country,
                     COUNT(*) AS buyers,
                     SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END)
                       AS repeaters,
                     ROUND(AVG(CASE WHEN n >= 2
                               THEN 1.0 ELSE 0 END), 3)
                       AS repeat_rate
              FROM per_user
              GROUP BY country
              ORDER BY repeat_rate DESC, country
              """
            `,
            py`
              sql = """
              WITH per_user AS (
                SELECT country, user_id, COUNT(*) AS n
                FROM orders
                WHERE status = 'completed'
                GROUP BY country, user_id
              )
              SELECT country,
                     COUNT(*) AS buyers,
                     SUM(CASE WHEN n > 2 THEN 1 ELSE 0 END)
                       AS repeaters,
                     ROUND(AVG(CASE WHEN n > 2
                               THEN 1.0 ELSE 0 END), 3)
                       AS repeat_rate
              FROM per_user
              GROUP BY country
              ORDER BY repeat_rate DESC, country
              """
            `,
          ],
          explain: 'Two levels of aggregation (orders → users → countries) is the pattern behind retention, repeat rate and "users who did X at least N times". In SQLite and MySQL, `AVG(n >= 2)` works because comparisons return 0/1. In Postgres you\'d need a cast, so CASE is the portable spelling.',
        },
        {
          type: 'code',
          title: 'Best category per country',
          prompt: md`
            Using ${T_ORDERS}, write \`sql\` returning, for each \`country\`, the \`category\` with the highest **completed** revenue (sum of \`quantity * unit_price\`) and that \`revenue\` rounded to 2. Order by country. Solve it **without window functions**, using CTEs.
          `,
          setup: db('orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH rev AS (
              SELECT country, category,
                     SUM(quantity * unit_price) AS revenue
              FROM orders
              WHERE status = 'completed'
              GROUP BY country, category
            ),
            best AS (
              SELECT country, MAX(revenue) AS revenue
              FROM rev
              GROUP BY country
            )
            SELECT r.country, r.category,
                   ROUND(r.revenue, 2)
            FROM rev r
            JOIN best b
              ON b.country = r.country
             AND b.revenue = r.revenue
            ORDER BY r.country
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE orders SET category = \'Books\' WHERE country = \'NL\' AND category = \'Home\'")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
          ],
          forbid: ['OVER'],
          hints: [
            'CTE 1: revenue per (country, category). CTE 2: the maximum revenue per country.',
            'Join the two on country **and** revenue to find which category hit the maximum.',
          ],
          wrong: [
            py`
              sql = """
              WITH rev AS (
                SELECT country, category,
                       SUM(quantity * unit_price) AS revenue
                FROM orders
                WHERE status = 'completed'
                GROUP BY country, category
              )
              SELECT r.country, r.category,
                     ROUND(r.revenue, 2)
              FROM rev r
              WHERE r.revenue = (SELECT MAX(revenue)
                                 FROM rev)
              ORDER BY r.country
              """
            `,
            py`
              sql = """
              WITH rev AS (
                SELECT country, category,
                       SUM(quantity * unit_price) AS revenue
                FROM orders
                GROUP BY country, category
              ),
              best AS (
                SELECT country, MAX(revenue) AS revenue
                FROM rev
                GROUP BY country
              )
              SELECT r.country, r.category,
                     ROUND(r.revenue, 2)
              FROM rev r
              JOIN best b
                ON b.country = r.country
               AND b.revenue = r.revenue
              ORDER BY r.country
              """
            `,
          ],
          explain: 'The global MAX finds just one winner for the whole table. The "max per group, then join back" pattern returns **all** tied winners, which is often what you want. Next lesson does the same with `ROW_NUMBER()` in one pass and lets you choose how to break ties.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u15-l5',
      title: 'Window Functions',
      summary: 'ROW_NUMBER, RANK, running totals, LAG/LEAD and top-N per group: the most-asked SQL interview topic.',
      steps: [
        {
          type: 'learn',
          title: 'Aggregates that keep the rows',
          body: md`
            A **window function** computes over rows related to the current row but, unlike GROUP BY, **keeps every row**:

            \`\`\`sql
            SELECT name, dept_id, salary,
                   AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg
            FROM employees;
            \`\`\`

            \`OVER (…)\` defines the window. \`PARTITION BY\` splits rows into groups, and \`ORDER BY\` (inside OVER) orders rows within each group. It's pandas' \`groupby().transform()\` in SQL.

            \`conn\` has ${T_EMP}, ${T_DEPT} and ${T_ORDERS}.
          `,
          setup: db('employees', 'departments', 'orders'),
          code: py`
            sql = """
            SELECT name, dept_id, salary,
              ROUND(AVG(salary) OVER (
                PARTITION BY dept_id)) AS dept_avg,
              ROUND(salary - AVG(salary) OVER (
                PARTITION BY dept_id)) AS diff
            FROM employees
            ORDER BY emp_id
            LIMIT 4
            """
            for row in conn.execute(sql):
                print(row)
          `,
        },
        {
          type: 'choice',
          prompt: '`employees` has 43 rows: 5 departments plus one row with a NULL dept_id. What does this print?',
          setup: db('employees'),
          code: py`
            a = conn.execute("""SELECT dept_id,
              AVG(salary) OVER (PARTITION BY dept_id)
            FROM employees""").fetchall()
            b = conn.execute("""SELECT dept_id, AVG(salary)
            FROM employees GROUP BY dept_id""").fetchall()
            print(len(a), len(b))
          `,
          options: ['43 6', '6 43', '43 43', '6 5'],
          answer: 0,
          checkOutput: true,
          explain: 'The window version returns every employee with their group\'s average attached. GROUP BY collapses each group to one row: 5 departments + 1 NULL group = 6. NULLs form their own partition and their own group.',
        },
        {
          type: 'learn',
          title: 'ROW_NUMBER, RANK, DENSE_RANK',
          body: md`
            | salary | ROW_NUMBER | RANK | DENSE_RANK |
            |---|---|---|---|
            | 90 | 1 | 1 | 1 |
            | 90 | 2 | 1 | 1 |
            | 80 | 3 | 3 | 2 |

            Add \`PARTITION BY dept_id\` to restart the numbering in each group. Window functions run **after** WHERE, so to keep the top N per group, rank in a CTE and filter outside:

            \`\`\`sql
            WITH r AS (
              SELECT *, ROW_NUMBER() OVER (
                PARTITION BY dept_id ORDER BY salary DESC) AS rn
              FROM employees)
            SELECT * FROM r WHERE rn <= 3;
            \`\`\`
          `,
          setup: db('employees'),
          code: py`
            sql = """
            WITH r AS (
              SELECT dept_id, name, salary,
                ROW_NUMBER() OVER (
                  PARTITION BY dept_id
                  ORDER BY salary DESC) AS rn
              FROM employees
              WHERE dept_id IS NOT NULL)
            SELECT dept_id, name, salary
            FROM r WHERE rn = 1
            """
            for row in conn.execute(sql):
                print(row)
          `,
        },
        {
          type: 'output',
          prompt: 'Type the four lines this prints.',
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            conn.executescript("""
            CREATE TABLE s (name TEXT, pts INT);
            INSERT INTO s VALUES ('a', 70), ('b', 90),
                                 ('c', 90), ('d', 80);
            """)
            q = """SELECT name,
              RANK() OVER (ORDER BY pts DESC),
              DENSE_RANK() OVER (ORDER BY pts DESC)
            FROM s ORDER BY pts DESC, name"""
            for row in conn.execute(q):
                print(row)
          `,
          answer: "('b', 1, 1)\n('c', 1, 1)\n('d', 3, 2)\n('a', 4, 3)",
          explain: 'b and c tie for first. RANK then skips to 3 (two rows are ahead of d), DENSE_RANK continues with 2. "Third-highest **distinct** score" needs DENSE_RANK. "Third place in a race" needs RANK.',
        },
        {
          type: 'code',
          title: 'Rank within department',
          prompt: md`
            Using ${T_EMP}, write \`sql\` returning \`dept_id, name, salary, rnk\` for every employee with a department, where \`rnk\` ranks salaries **within the department**, highest = 1, and **equal salaries share a rank with no gaps** after ties. Order by dept_id, rnk, name.
          `,
          setup: db('employees'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            SELECT dept_id, name, salary,
                   DENSE_RANK() OVER (
                     PARTITION BY dept_id
                     ORDER BY salary DESC) AS rnk
            FROM employees
            WHERE dept_id IS NOT NULL
            ORDER BY dept_id, rnk, name
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE employees SET salary = 105100 WHERE emp_id = 3")',
              call: 'conn.execute(sql).fetchall()',
              name: 'two Engineering salaries tie',
            },
          ],
          hints: [
            '"Share a rank, no gaps" is DENSE_RANK.',
            '`DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)`',
          ],
          wrong: [
            py`
              sql = """
              SELECT dept_id, name, salary,
                     RANK() OVER (
                       PARTITION BY dept_id
                       ORDER BY salary DESC) AS rnk
              FROM employees
              WHERE dept_id IS NOT NULL
              ORDER BY dept_id, rnk, name
              """
            `,
            py`
              sql = """
              SELECT dept_id, name, salary,
                     DENSE_RANK() OVER (
                       ORDER BY salary DESC) AS rnk
              FROM employees
              WHERE dept_id IS NOT NULL
              ORDER BY dept_id, rnk, name
              """
            `,
          ],
          explain: 'Without PARTITION BY the ranking runs over the whole company. RANK leaves a gap after the tie (1, 2, 2, 4…). Window functions need one sort per partition: O(n log n), and the engine can do all partitions in parallel, which is why they scale so well.',
        },
        {
          type: 'code',
          title: 'Top three salaries per department',
          prompt: md`
            The famous LeetCode "Department Top Three Salaries". Using ${T_EMP} and ${T_DEPT}, write \`sql\` returning \`dept_name, name, salary\` for employees whose salary is among the **three highest distinct salaries** of their department (ties all included). Order by dept_name, salary descending, name.
          `,
          setup: db('employees', 'departments'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH r AS (
              SELECT d.dept_name, e.name, e.salary,
                     DENSE_RANK() OVER (
                       PARTITION BY e.dept_id
                       ORDER BY e.salary DESC) AS rnk
              FROM employees e
              JOIN departments d ON d.dept_id = e.dept_id
            )
            SELECT dept_name, name, salary
            FROM r
            WHERE rnk <= 3
            ORDER BY dept_name, salary DESC, name
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE employees SET salary = 124800 WHERE emp_id = 3")',
              call: 'conn.execute(sql).fetchall()',
              name: 'a tie at the top of Engineering',
            },
            {
              given: 'conn.execute("UPDATE employees SET salary = 52600 WHERE emp_id IN (40, 42)")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
          ],
          hints: [
            'Rank inside a CTE (you can\'t filter on a window function in the same SELECT), then keep `rnk <= 3`.',
            '"Distinct salaries, ties included" → DENSE_RANK, partitioned by department.',
          ],
          wrong: [
            py`
              sql = """
              WITH r AS (
                SELECT d.dept_name, e.name, e.salary,
                       ROW_NUMBER() OVER (
                         PARTITION BY e.dept_id
                         ORDER BY e.salary DESC) AS rnk
                FROM employees e
                JOIN departments d ON d.dept_id = e.dept_id
              )
              SELECT dept_name, name, salary
              FROM r
              WHERE rnk <= 3
              ORDER BY dept_name, salary DESC, name
              """
            `,
            py`
              sql = """
              WITH r AS (
                SELECT d.dept_name, e.name, e.salary,
                       RANK() OVER (
                         PARTITION BY e.dept_id
                         ORDER BY e.salary DESC) AS rnk
                FROM employees e
                JOIN departments d ON d.dept_id = e.dept_id
              )
              SELECT dept_name, name, salary
              FROM r
              WHERE rnk <= 3
              ORDER BY dept_name, salary DESC, name
              """
            `,
          ],
          explain: 'With a tie at the top, ROW_NUMBER cuts someone with the 3rd-highest distinct salary, and RANK jumps from 1 to 3 and drops the next salary level. Always ask the interviewer how ties should behave. Choosing the ranking function *is* the answer.',
        },
        {
          type: 'learn',
          title: 'Running totals and moving averages',
          body: md`
            With \`ORDER BY\` inside OVER, an aggregate becomes **cumulative**: \`SUM(rev) OVER (ORDER BY day)\` is a running total.

            Careful: the default frame is \`RANGE\`, so rows with the **same** ORDER BY value are summed together. Spell out the frame when it matters:

            \`\`\`sql
            SUM(rev) OVER (ORDER BY day
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
            AVG(rev) OVER (ORDER BY day
              ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)  -- 7-row moving avg
            \`\`\`

            Add \`PARTITION BY\` for one running total per group.
          `,
          setup: db('orders'),
          code: py`
            sql = """
            WITH d AS (
              SELECT order_date AS day, COUNT(*) AS n
              FROM orders
              WHERE order_date LIKE '2025-12-0%'
              GROUP BY order_date)
            SELECT day, n,
              SUM(n) OVER (ORDER BY day) AS running,
              ROUND(AVG(n) OVER (ORDER BY day ROWS
                BETWEEN 2 PRECEDING AND CURRENT ROW), 2)
            FROM d
            """
            for row in conn.execute(sql):
                print(row)
          `,
        },
        {
          type: 'code',
          title: 'December running revenue',
          prompt: md`
            Using ${T_ORDERS}, write \`sql\` returning one row per day of **December 2025** (days with completed orders only): \`day\`, \`revenue\` (that day's completed revenue) and \`running\` (cumulative revenue since Dec 1). Round both to 2, but compute the running total from **unrounded** daily values. Order by day.
          `,
          setup: db('orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH daily AS (
              SELECT order_date AS day,
                     SUM(quantity * unit_price) AS revenue
              FROM orders
              WHERE status = 'completed'
                AND order_date >= '2025-12-01'
              GROUP BY order_date
            )
            SELECT day,
                   ROUND(revenue, 2),
                   ROUND(SUM(revenue) OVER (
                     ORDER BY day), 2) AS running
            FROM daily
            ORDER BY day
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("DELETE FROM orders WHERE order_date = \'2025-12-02\'")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
          ],
          hints: [
            'CTE: completed revenue per day in December.',
            'Outer query: `SUM(revenue) OVER (ORDER BY day)`.',
          ],
          wrong: [
            py`
              sql = """
              WITH daily AS (
                SELECT order_date AS day,
                       SUM(quantity * unit_price) AS revenue
                FROM orders
                WHERE status = 'completed'
                  AND order_date >= '2025-12-01'
                GROUP BY order_date
              )
              SELECT day,
                     ROUND(revenue, 2),
                     ROUND(SUM(revenue) OVER (), 2)
              FROM daily
              ORDER BY day
              """
            `,
            py`
              sql = """
              WITH daily AS (
                SELECT order_date AS day,
                       SUM(quantity * unit_price) AS revenue
                FROM orders
                WHERE order_date >= '2025-12-01'
                GROUP BY order_date
              )
              SELECT day,
                     ROUND(revenue, 2),
                     ROUND(SUM(revenue) OVER (
                       ORDER BY day), 2) AS running
              FROM daily
              ORDER BY day
              """
            `,
          ],
          explain: '`OVER ()` with no ORDER BY is the grand total on every row. Because each day appears once in `daily`, RANGE and ROWS frames give the same result here. On raw order rows (many per day) they would differ. Running totals are a single pass over sorted data: O(n) after the sort.',
        },
        {
          type: 'learn',
          title: 'LAG and LEAD',
          body: md`
            \`LAG(x)\` reads x from the **previous** row in the window order, and \`LEAD(x)\` from the next one. \`LAG(x, k)\` looks k rows back. The first row's LAG is NULL.

            Typical uses: day-over-day change, time between a user's orders, "did the next event happen within 30 minutes?".

            \`julianday(d)\` turns a date into a day number, so \`julianday(d) - julianday(prev)\` is a gap in days.
          `,
          setup: db('orders'),
          code: py`
            sql = """
            WITH d AS (
              SELECT order_date AS day, COUNT(*) AS n
              FROM orders
              WHERE order_date LIKE '2025-12-0%'
              GROUP BY order_date)
            SELECT day, n,
              n - LAG(n) OVER (ORDER BY day) AS change,
              LEAD(day) OVER (ORDER BY day) AS next_day
            FROM d
            LIMIT 4
            """
            for row in conn.execute(sql):
                print(row)
          `,
        },
        {
          type: 'blanks',
          prompt: 'Show each month\'s order count and the change from the previous month.',
          setup: db('orders'),
          code: py`
            sql = """
            WITH m AS (
              SELECT strftime('%m', order_date) AS month,
                     COUNT(*) AS n
              FROM orders GROUP BY month
            )
            SELECT month, n,
              n - ___(n) ___ (ORDER BY month) AS change
            FROM m
            ORDER BY month
            LIMIT 3
            """
            print(conn.execute(sql).fetchall())
          `,
          bank: ['LAG', 'OVER', 'LEAD', 'PARTITION', 'WITHIN', 'PREV'],
          answer: ['LAG', 'OVER'],
          tests: [{ call: 'conn.execute(sql).fetchall()' }],
          explain: 'LAG looks one row back in month order, so January\'s change is NULL (no previous month). LEAD would subtract the *next* month. Every window function needs its OVER clause.',
        },
        {
          type: 'code',
          title: 'Month-over-month growth',
          prompt: md`
            Using ${T_ORDERS}, write \`sql\` returning one row per month (\`'YYYY-MM'\`) of **completed** revenue: \`month\`, \`revenue\`, \`prev\` (the previous month's revenue, NULL for the first) and \`pct\`: the change in percent, \`100 × (revenue − prev) / prev\`. Round revenue and prev to 2, pct to 1. Order by month.
          `,
          setup: db('orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH m AS (
              SELECT strftime('%Y-%m', order_date) AS month,
                     SUM(quantity * unit_price) AS revenue
              FROM orders
              WHERE status = 'completed'
              GROUP BY month
            ),
            l AS (
              SELECT month, revenue,
                     LAG(revenue) OVER (ORDER BY month)
                       AS prev
              FROM m
            )
            SELECT month, ROUND(revenue, 2),
                   ROUND(prev, 2),
                   ROUND(100.0 * (revenue - prev) / prev, 1)
            FROM l
            ORDER BY month
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE orders SET status = \'cancelled\' WHERE order_date LIKE \'2025-06%\'")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
            },
          ],
          hints: [
            'CTE 1: revenue per month. CTE 2: add `LAG(revenue) OVER (ORDER BY month) AS prev`.',
            'Then compute the percentage from `revenue` and `prev` in the final SELECT.',
          ],
          wrong: [
            py`
              sql = """
              WITH m AS (
                SELECT strftime('%Y-%m', order_date) AS month,
                       SUM(quantity * unit_price) AS revenue
                FROM orders
                WHERE status = 'completed'
                GROUP BY month
              ),
              l AS (
                SELECT month, revenue,
                       LEAD(revenue) OVER (ORDER BY month)
                         AS prev
                FROM m
              )
              SELECT month, ROUND(revenue, 2),
                     ROUND(prev, 2),
                     ROUND(100.0 * (revenue - prev) / prev, 1)
              FROM l
              ORDER BY month
              """
            `,
            py`
              sql = """
              WITH m AS (
                SELECT strftime('%Y-%m', order_date) AS month,
                       SUM(quantity * unit_price) AS revenue
                FROM orders
                WHERE status = 'completed'
                GROUP BY month
              ),
              l AS (
                SELECT month, revenue,
                       LAG(revenue) OVER (ORDER BY month)
                         AS prev
                FROM m
              )
              SELECT month, ROUND(revenue, 2),
                     ROUND(prev, 2),
                     ROUND(100.0 * (revenue - prev) / revenue, 1)
              FROM l
              ORDER BY month
              """
            `,
          ],
          explain: 'Growth is always relative to the **earlier** value. One subtle trap: LAG returns the previous *row*, not the previous *month*. If a month had no revenue at all, LAG silently compares with two months ago. In production, join to a calendar (lesson 6) first.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          setup: db('employees'),
          code: py`
            q = """SELECT name FROM employees
            WHERE ROW_NUMBER() OVER (
              ORDER BY salary DESC) <= 3"""
            try:
                conn.execute(q)
            except Exception as e:
                print(type(e).__name__ + ":", e)
          `,
          options: [
            'OperationalError: misuse of window function ROW_NUMBER()',
            'The three best-paid names',
            'OperationalError: no such column: ROW_NUMBER',
            '[]',
          ],
          answer: 0,
          checkOutput: true,
          explain: 'Window functions are computed after WHERE (and after GROUP BY/HAVING), so WHERE can\'t see them. Compute the rank in a CTE or subquery and filter in the outer query, the standard top-N pattern. (Some warehouses offer `QUALIFY` for this.)',
        },
        {
          type: 'code',
          title: 'Time between orders',
          prompt: md`
            How quickly do loyal customers come back? Using ${T_ORDERS} (**completed** orders only), write \`sql\` returning \`user_id\`, \`orders\` (their number of completed orders) and \`avg_gap\`: the average number of days between consecutive orders of that user, rounded to 1. Order a user's orders by order_date, then order_id. Only users with **at least 8** completed orders. Shortest avg_gap first, ties by user_id.
          `,
          setup: db('orders'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH o AS (
              SELECT user_id, order_date,
                     LAG(order_date) OVER (
                       PARTITION BY user_id
                       ORDER BY order_date, order_id)
                       AS prev
              FROM orders
              WHERE status = 'completed'
            )
            SELECT user_id, COUNT(*) AS orders,
                   ROUND(AVG(julianday(order_date)
                             - julianday(prev)), 1)
                     AS avg_gap
            FROM o
            GROUP BY user_id
            HAVING COUNT(*) >= 8
            ORDER BY avg_gap, user_id
            """
          `,
          tests: [
            ROWS,
            {
              given: 'conn.execute("UPDATE orders SET status = \'completed\'")',
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'with every order completed',
            },
          ],
          hints: [
            '`LAG(order_date) OVER (PARTITION BY user_id ORDER BY order_date, order_id)` gives each order its user\'s previous order date.',
            'AVG skips the NULL gap of each user\'s first order. COUNT(*) still counts that order.',
          ],
          wrong: [
            py`
              sql = """
              WITH o AS (
                SELECT user_id, order_date,
                       LAG(order_date) OVER (
                         ORDER BY order_date, order_id)
                         AS prev
                FROM orders
                WHERE status = 'completed'
              )
              SELECT user_id, COUNT(*) AS orders,
                     ROUND(AVG(julianday(order_date)
                               - julianday(prev)), 1)
                       AS avg_gap
              FROM o
              GROUP BY user_id
              HAVING COUNT(*) >= 8
              ORDER BY avg_gap, user_id
              """
            `,
            py`
              sql = """
              WITH o AS (
                SELECT user_id, order_date,
                       LAG(order_date) OVER (
                         PARTITION BY user_id
                         ORDER BY order_date, order_id)
                         AS prev
                FROM orders
                WHERE status = 'completed'
              )
              SELECT user_id, COUNT(*) AS orders,
                     ROUND(AVG(COALESCE(julianday(order_date)
                               - julianday(prev), 0)), 1)
                       AS avg_gap
              FROM o
              GROUP BY user_id
              HAVING COUNT(*) >= 8
              ORDER BY avg_gap, user_id
              """
            `,
          ],
          explain: 'Without PARTITION BY, LAG compares with the previous order of *any* user. Treating the first order\'s missing gap as 0 biases the average down. Here NULL-skipping is exactly right. "Time to second purchase" and "days between sessions" are standard retention features built this way.',
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u15-l6',
      title: 'SQL ↔ pandas',
      summary: 'Move between SQL and pandas, handle dates, and solve classic interview queries.',
      steps: [
        {
          type: 'learn',
          title: 'read_sql_query: SQL in, DataFrame out',
          body: md`
            \`pd.read_sql_query(sql, conn, params=(…))\` runs a query and returns a DataFrame with the column names from your SELECT. \`df.to_sql("table", conn, index=False)\` writes one back.

            Typical workflow: let the database **filter, join and aggregate** (it's close to the data and built for it), then pull the small result into pandas for reshaping, statistics and charts.

            \`conn\` has ${T_ORDERS}, ${T_EVENTS}, ${T_EMP} and ${T_DEPT}.
          `,
          setup: db('orders', 'events', 'employees', 'departments'),
          code: py`
            import pandas as pd
            sql = """
            SELECT category, COUNT(*) AS n,
                   ROUND(AVG(unit_price), 2) AS avg_price
            FROM orders
            WHERE country = ?
            GROUP BY category
            ORDER BY n DESC
            """
            df = pd.read_sql_query(sql, conn,
                                   params=("DE",))
            print(df)
          `,
        },
        {
          type: 'code',
          title: 'Monthly revenue as a DataFrame',
          prompt: md`
            Write \`monthly_revenue(conn, country)\` that returns a DataFrame with columns \`month\` (\`'YYYY-MM'\`) and \`revenue\` (completed revenue, rounded to 2) for one country, one row per month, ordered by month, with the default 0…n−1 index. Use \`pd.read_sql_query\` with a \`?\` parameter.
          `,
          setup: db('orders'),
          starter: 'import pandas as pd\n\ndef monthly_revenue(conn, country):\n    pass\n',
          solution: py`
            import pandas as pd

            def monthly_revenue(conn, country):
                sql = """
                SELECT strftime('%Y-%m', order_date)
                         AS month,
                       ROUND(SUM(quantity * unit_price), 2)
                         AS revenue
                FROM orders
                WHERE status = 'completed'
                  AND country = ?
                GROUP BY month
                ORDER BY month
                """
                return pd.read_sql_query(
                    sql, conn, params=(country,))
          `,
          tests: [
            { assert: 'list(monthly_revenue(conn, "DE").columns) == ["month", "revenue"]', name: 'columns are month, revenue' },
            { call: 'monthly_revenue(conn, "DE")', name: 'Germany' },
            { call: 'monthly_revenue(conn, "NL")', hidden: true },
          ],
          hints: [
            '`strftime(\'%Y-%m\', order_date) AS month` and `GROUP BY month`.',
            '`pd.read_sql_query(sql, conn, params=(country,))` returns the DataFrame with a default index.',
          ],
          wrong: [
            py`
              import pandas as pd

              def monthly_revenue(conn, country):
                  sql = """
                  SELECT strftime('%Y-%m', order_date)
                           AS month,
                         ROUND(SUM(quantity * unit_price), 2)
                           AS revenue
                  FROM orders
                  WHERE country = ?
                  GROUP BY month
                  ORDER BY month
                  """
                  return pd.read_sql_query(
                      sql, conn, params=(country,))
            `,
            py`
              import pandas as pd

              def monthly_revenue(conn, country):
                  sql = """
                  SELECT strftime('%Y-%m', order_date)
                           AS month,
                         ROUND(SUM(quantity * unit_price), 2)
                           AS revenue
                  FROM orders
                  WHERE status = 'completed'
                    AND country = ?
                  GROUP BY month
                  ORDER BY month
                  """
                  df = pd.read_sql_query(
                      sql, conn, params=(country,))
                  return df.set_index("month")
            `,
          ],
          explain: 'Only 12 rows travel from the database to Python, instead of every order. That\'s the whole point of pushing aggregation down. From here, `df.plot(x="month", y="revenue")` or a growth column are one line of pandas.',
        },
        {
          type: 'learn',
          title: 'Translating between SQL and pandas',
          body: md`
            | SQL | pandas |
            |---|---|
            | \`WHERE\` | \`df[mask]\` |
            | \`GROUP BY … agg\` | \`groupby().agg()\` |
            | \`HAVING\` | filter after \`agg\` |
            | \`JOIN\` / \`LEFT JOIN\` | \`merge(how="inner"/"left")\` |
            | \`ORDER BY … LIMIT n\` | \`sort_values().head(n)\` |
            | \`AVG(x) OVER (PARTITION BY g)\` | \`groupby(g)[x].transform("mean")\` |
            | \`ROW_NUMBER()\` | \`groupby(g).cumcount() + 1\` |
            | \`RANK()\` / \`DENSE_RANK()\` | \`rank(method="min")\` / \`"dense"\` |
            | \`LAG(x)\` | \`groupby(g)[x].shift()\` |
            | running \`SUM\` | \`groupby(g)[x].cumsum()\` |

            Interviewers often ask you to write the same logic in both. Knowing this table cold saves minutes.
          `,
        },
        {
          type: 'choice',
          prompt: 'With `g = df.groupby("dept_id")["salary"]`, which matches `DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)`?',
          options: [
            'g.rank(method="dense", ascending=False)',
            'g.rank(method="min", ascending=False)',
            'g.rank(method="first", ascending=False)',
            'g.rank(method="dense")',
          ],
          answer: 0,
          explain: '`"min"` is RANK (ties share the lowest rank, then a gap), `"first"` is ROW_NUMBER (ties broken by position), and the last one ranks the lowest salary as 1. pandas returns float ranks (1.0, 2.0…), so cast with `.astype(int)` if needed.',
        },
        {
          type: 'output',
          prompt: 'LAG and running SUM per user, in pandas. What does this print?',
          code: py`
            import pandas as pd
            df = pd.DataFrame({
                "user": ["a", "a", "b", "a", "b"],
                "amt": [10, 20, 5, 40, 7],
            })
            g = df.groupby("user")["amt"]
            print(g.shift().tolist())
            print(g.cumsum().tolist())
          `,
          answer: '[nan, 10.0, nan, 20.0, 5.0]\n[10, 30, 5, 70, 12]',
          explain: 'Each user is its own partition. `shift()` is LAG: the first row of each user has no previous value (NaN, which turns the column into floats). `cumsum()` is the running SUM within each user, and rows keep their original order.',
        },
        {
          type: 'code',
          title: 'Translate SQL to pandas',
          prompt: md`
            Write \`dept_stats(emp, dept)\` in **pandas** (DataFrames read from \`data/employees.csv\` and \`data/departments.csv\`) that returns exactly what this query returns via \`pd.read_sql_query\`:

            \`\`\`sql
            SELECT d.dept_name,
                   COUNT(*) AS n,
                   ROUND(AVG(e.salary), 1) AS avg_salary
            FROM employees e
            JOIN departments d ON d.dept_id = e.dept_id
            GROUP BY d.dept_name
            HAVING COUNT(*) >= 7
            ORDER BY avg_salary DESC
            \`\`\`

            Same columns, same row order, default 0…n−1 index.
          `,
          setup: db('employees', 'departments') + '\n' + py`
            import pandas as pd
            emp = pd.read_csv("data/employees.csv")
            dept = pd.read_csv("data/departments.csv")
            SQL = """
            SELECT d.dept_name,
                   COUNT(*) AS n,
                   ROUND(AVG(e.salary), 1) AS avg_salary
            FROM employees e
            JOIN departments d ON d.dept_id = e.dept_id
            GROUP BY d.dept_name
            HAVING COUNT(*) >= 7
            ORDER BY avg_salary DESC
            """
          `,
          starter: 'import pandas as pd\n\ndef dept_stats(emp, dept):\n    pass\n',
          solution: py`
            import pandas as pd

            def dept_stats(emp, dept):
                m = emp.merge(dept, on="dept_id")
                g = m.groupby("dept_name")["salary"]
                out = g.agg(n="size", avg_salary="mean")
                out = out[out["n"] >= 7].copy()
                out["avg_salary"] = out.avg_salary.round(1)
                out = out.sort_values("avg_salary",
                                      ascending=False)
                return out.reset_index()
          `,
          tests: [
            { call: 'dept_stats(emp, dept)', expect: 'pd.read_sql_query(SQL, conn)', name: 'same as the SQL result' },
            {
              call: 'dept_stats(emp[emp["salary"] < 100000], dept)',
              expect: 'pd.read_sql_query(SQL.replace("FROM employees e", "FROM (SELECT * FROM employees WHERE salary < 100000) e"), conn)',
              hidden: true,
              name: 'only salaries under 100k',
            },
          ],
          hints: [
            'JOIN → `emp.merge(dept, on="dept_id")` (inner by default, so the employee without a department drops out like in SQL).',
            '`groupby("dept_name")["salary"].agg(n="size", avg_salary="mean")`, then filter, round, sort, `reset_index()`.',
          ],
          wrong: [
            py`
              import pandas as pd

              def dept_stats(emp, dept):
                  m = emp.merge(dept, on="dept_id")
                  g = m.groupby("dept_name")["salary"]
                  out = g.agg(n="size", avg_salary="mean")
                  out = out[out["n"] >= 7].copy()
                  out["avg_salary"] = out["avg_salary"].round(1)
                  return out.sort_values("avg_salary",
                                         ascending=False)
            `,
            py`
              import pandas as pd

              def dept_stats(emp, dept):
                  m = emp.merge(dept, on="dept_id")
                  g = m.groupby("dept_name")["salary"]
                  out = g.agg(n="size", avg_salary="mean")
                  out = out[out["n"] > 7].copy()
                  out["avg_salary"] = out["avg_salary"].round(1)
                  out = out.sort_values("avg_salary",
                                        ascending=False)
                  return out.reset_index()
            `,
          ],
          explain: 'In pandas the group key becomes the **index**. SQL has no index, so `reset_index()` turns it back into a column. HAVING is simply a filter on the aggregated frame. Comparing your pandas output with a SQL query like this is a great way to test data pipelines.',
        },
        {
          type: 'learn',
          title: 'Dates in SQLite and calendar tables',
          body: md`
            SQLite stores dates as ISO text (\`'YYYY-MM-DD'\`), which sorts correctly as text.
            - \`strftime('%Y-%m', d)\`: month bucket; \`strftime('%w', d)\`: weekday (0 = Sunday)
            - \`date(d, '+1 day')\`, \`date(d, 'start of month')\`
            - \`julianday(b) - julianday(a)\`: days between

            Days **without** data are missing from a GROUP BY. Generate a calendar with a **recursive CTE**, then LEFT JOIN onto it:

            \`\`\`sql
            WITH RECURSIVE cal(d) AS (
              SELECT '2025-02-01'
              UNION ALL
              SELECT date(d, '+1 day') FROM cal
              WHERE d < '2025-02-28')
            SELECT d FROM cal;
            \`\`\`
          `,
          setup: db('orders'),
          code: py`
            sql = """
            WITH RECURSIVE cal(d) AS (
              SELECT '2025-02-01'
              UNION ALL
              SELECT date(d, '+1 day') FROM cal
              WHERE d < '2025-02-07')
            SELECT c.d, COUNT(o.order_id)
            FROM cal c
            LEFT JOIN orders o ON o.order_date = c.d
            GROUP BY c.d
            """
            print(conn.execute(sql).fetchall())
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            import sqlite3
            conn = sqlite3.connect(":memory:")
            q = """SELECT date('2025-11-30', '+1 day'),
              strftime('%Y-%m', '2025-11-30'),
              julianday('2025-12-01')
                - julianday('2025-11-01')"""
            print(conn.execute(q).fetchone())
          `,
          answer: "('2025-12-01', '2025-11', 30.0)",
          explain: 'Date arithmetic handles month ends for you. julianday returns a float (fractions are times of day), so differences are floats too: 30.0 days.',
        },
        {
          type: 'choice',
          prompt: 'The warehouse table `events` has **2 billion** rows. You need daily active users for the last 30 days as a pandas chart. What do you do?',
          options: [
            'GROUP BY in SQL, pull ~30 rows',
            'read_sql_query the table, then groupby',
            'Export it to CSV and use read_csv',
            'Loop over users with one query each',
          ],
          answer: 0,
          explain: 'Moving 2 billion rows over the network into one machine\'s RAM would take hours (or crash). The warehouse aggregates them in parallel next to the data. Push filters and aggregations down; pull only results. One query per user is the "N+1 queries" anti-pattern.',
        },
        {
          type: 'learn',
          title: 'Two classic interview queries',
          body: md`
            **Second-highest salary**, NULL if there is none:

            \`\`\`sql
            SELECT MAX(salary) FROM employees
            WHERE salary < (SELECT MAX(salary) FROM employees);
            \`\`\`

            An aggregate always returns one row, NULL when nothing matches. \`LIMIT 1 OFFSET 1\` instead returns *no row at all*.

            **Gaps and islands** (consecutive days): number each user's distinct days with \`ROW_NUMBER()\`. Within a run of consecutive days, \`julianday(day) − rn\` stays **constant**, so it labels each streak. Group by it and count.
          `,
          setup: db('events'),
          code: py`
            sql = """
            WITH d AS (
              SELECT DISTINCT date(ts) AS day
              FROM events WHERE user_id = 41),
            g AS (
              SELECT day, julianday(day) - ROW_NUMBER()
                OVER (ORDER BY day) AS grp
              FROM d)
            SELECT MIN(day), MAX(day), COUNT(*)
            FROM g GROUP BY grp
            """
            print(conn.execute(sql).fetchall())
          `,
        },
        {
          type: 'code',
          title: 'Nth highest salary',
          prompt: md`
            Write \`nth_salary(conn, n)\` that returns the **n-th highest distinct** salary in ${T_EMP} as an int, or \`None\` if there are fewer than n distinct salaries. Use a \`?\` parameter.

            \`\`\`python
            nth_salary(conn, 1)  # 124800
            \`\`\`
          `,
          setup: db('employees'),
          starter: 'def nth_salary(conn, n):\n    pass\n',
          solution: py`
            def nth_salary(conn, n):
                sql = """
                SELECT DISTINCT salary FROM employees
                ORDER BY salary DESC
                LIMIT 1 OFFSET ?
                """
                row = conn.execute(sql, (n - 1,)).fetchone()
                return row[0] if row else None
          `,
          tests: [
            { call: 'nth_salary(conn, 1)', expect: '124800' },
            { call: 'nth_salary(conn, 2)', name: 'second highest' },
            {
              given: 'conn.execute("UPDATE employees SET salary = 124800 WHERE emp_id = 13")',
              call: 'nth_salary(conn, 2)',
              name: 'two people share the top salary',
            },
            { call: 'nth_salary(conn, 100)', expect: 'None', hidden: true, name: 'fewer than n distinct salaries' },
            { call: 'nth_salary(conn, 7)', hidden: true },
          ],
          hints: [
            '`SELECT DISTINCT salary … ORDER BY salary DESC LIMIT 1 OFFSET ?` skips the n − 1 higher salaries.',
            '`fetchone()` returns `None` when there is no row, so return `row[0] if row else None`.',
          ],
          wrong: [
            py`
              def nth_salary(conn, n):
                  sql = """
                  SELECT salary FROM employees
                  ORDER BY salary DESC
                  LIMIT 1 OFFSET ?
                  """
                  row = conn.execute(sql, (n - 1,)).fetchone()
                  return row[0] if row else None
            `,
            py`
              def nth_salary(conn, n):
                  sql = """
                  SELECT DISTINCT salary FROM employees
                  ORDER BY salary DESC
                  LIMIT 1 OFFSET ?
                  """
                  row = conn.execute(sql, (n,)).fetchone()
                  return row[0] if row else None
            `,
            py`
              def nth_salary(conn, n):
                  sql = """
                  SELECT DISTINCT salary FROM employees
                  ORDER BY salary DESC
                  LIMIT 1 OFFSET ?
                  """
                  return conn.execute(sql, (n - 1,)).fetchone()
            `,
          ],
          explain: 'Without DISTINCT, a shared top salary makes "2nd highest" equal the highest. OFFSET counts rows to *skip*, so n − 1. The DENSE_RANK version (`WHERE rnk = ?`) works too and extends to "n-th highest per department". Both need a sort: O(n log n), or an index on salary.',
        },
        {
          type: 'code',
          title: 'Longest activity streak',
          prompt: md`
            Using ${T_EVENTS} (\`ts\` = "YYYY-MM-DD HH:MM:SS"), write \`sql\` returning \`user_id\` and \`streak\`: the user's **longest run of consecutive active days** (days with at least one event). Only users with a streak of **at least 2** days. Longest first, ties by user_id.
          `,
          setup: db('events'),
          starter: SQL_STARTER,
          solution: py`
            sql = """
            WITH days AS (
              SELECT DISTINCT user_id, date(ts) AS day
              FROM events
            ),
            g AS (
              SELECT user_id,
                     julianday(day) - ROW_NUMBER() OVER (
                       PARTITION BY user_id
                       ORDER BY day) AS grp
              FROM days
            ),
            runs AS (
              SELECT user_id, COUNT(*) AS len
              FROM g
              GROUP BY user_id, grp
            )
            SELECT user_id, MAX(len) AS streak
            FROM runs
            GROUP BY user_id
            HAVING MAX(len) >= 2
            ORDER BY streak DESC, user_id
            """
          `,
          tests: [
            ROWS,
            {
              given: py`
                for d in range(10, 15):
                    conn.execute(
                        "INSERT INTO events VALUES (?, ?, ?, ?)",
                        (7, f"2025-11-{d} 12:00:00", "page_view", "mobile"))
                    conn.execute(
                        "INSERT INTO events VALUES (?, ?, ?, ?)",
                        (7, f"2025-11-{d} 18:00:00", "search", "mobile"))
              `,
              call: 'conn.execute(sql).fetchall()',
              hidden: true,
              name: 'user 7 is active 5 days in a row, twice a day',
            },
          ],
          hints: [
            'Step 1: one row per (user, day): `SELECT DISTINCT user_id, date(ts)`.',
            'Step 2: `julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day)` is constant within a streak. Step 3: count rows per (user, grp), then take the MAX per user.',
          ],
          wrong: [
            py`
              sql = """
              WITH days AS (
                SELECT user_id, date(ts) AS day
                FROM events
              ),
              g AS (
                SELECT user_id,
                       julianday(day) - ROW_NUMBER() OVER (
                         PARTITION BY user_id
                         ORDER BY day) AS grp
                FROM days
              ),
              runs AS (
                SELECT user_id, COUNT(*) AS len
                FROM g
                GROUP BY user_id, grp
              )
              SELECT user_id, MAX(len) AS streak
              FROM runs
              GROUP BY user_id
              HAVING MAX(len) >= 2
              ORDER BY streak DESC, user_id
              """
            `,
            py`
              sql = """
              WITH days AS (
                SELECT DISTINCT user_id, date(ts) AS day
                FROM events
              )
              SELECT user_id, COUNT(*) AS streak
              FROM days
              GROUP BY user_id
              HAVING COUNT(*) >= 2
              ORDER BY streak DESC, user_id
              """
            `,
          ],
          explain: 'Duplicate days break the trick: two events on the same day advance ROW_NUMBER without advancing the date, which splits a streak. Counting all active days ignores consecutiveness entirely. Gaps-and-islands appears in interviews as "login streaks", "consecutive seats" or "uptime periods", and it\'s the same three steps every time.',
        },
        {
          type: 'code',
          title: 'DAU trend: SQL + pandas',
          prompt: md`
            Write \`dau_trend(conn)\` that uses SQL to get daily active users from ${T_EVENTS} (unique users per \`date(ts)\`), loads them with \`pd.read_sql_query\` and adds a pandas column \`dau_7d\`: the 7-day rolling mean of \`dau\` (NaN for the first 6 days), rounded to 2.

            Return a DataFrame with columns \`day\`, \`dau\`, \`dau_7d\`, ordered by day, default index.
          `,
          setup: db('events'),
          starter: 'import pandas as pd\n\ndef dau_trend(conn):\n    pass\n',
          solution: py`
            import pandas as pd

            def dau_trend(conn):
                sql = """
                SELECT date(ts) AS day,
                       COUNT(DISTINCT user_id) AS dau
                FROM events
                GROUP BY day
                ORDER BY day
                """
                df = pd.read_sql_query(sql, conn)
                r = df["dau"].rolling(7).mean()
                df["dau_7d"] = r.round(2)
                return df
          `,
          tests: [
            { assert: 'list(dau_trend(conn).columns) == ["day", "dau", "dau_7d"]', name: 'columns day, dau, dau_7d' },
            { call: 'dau_trend(conn)', name: 'November 2025' },
            {
              given: 'conn.execute("DELETE FROM events WHERE user_id % 3 = 0")',
              call: 'dau_trend(conn)',
              hidden: true,
            },
          ],
          hints: [
            'SQL: `SELECT date(ts) AS day, COUNT(DISTINCT user_id) AS dau FROM events GROUP BY day ORDER BY day`.',
            'pandas: `df["dau"].rolling(7).mean().round(2)`.',
          ],
          wrong: [
            py`
              import pandas as pd

              def dau_trend(conn):
                  sql = """
                  SELECT date(ts) AS day, COUNT(*) AS dau
                  FROM events
                  GROUP BY day
                  ORDER BY day
                  """
                  df = pd.read_sql_query(sql, conn)
                  r = df["dau"].rolling(7).mean()
                  df["dau_7d"] = r.round(2)
                  return df
            `,
            py`
              import pandas as pd

              def dau_trend(conn):
                  sql = """
                  SELECT date(ts) AS day,
                         COUNT(DISTINCT user_id) AS dau
                  FROM events
                  GROUP BY day
                  ORDER BY day
                  """
                  df = pd.read_sql_query(sql, conn)
                  r = df["dau"].rolling(7, min_periods=1)
                  df["dau_7d"] = r.mean().round(2)
                  return df
            `,
          ],
          explain: 'SQL does the heavy distinct-count over all events, pandas does the time-series smoothing on 30 rows: each tool where it\'s strongest. A 7-day window also cancels the weekday pattern, which is why dashboards default to it. `rolling(7)` counts rows, so it needs one row per day. Join a calendar first if days can be missing.',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u15-exam',
    title: 'SQL with Python Exam',
    minutes: 35,
    intro: 'Interview-style SQL: NULL traps, joins, window functions and multi-step queries. `conn` is an in-memory SQLite database. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'Why does `SELECT category, SUM(quantity) AS units FROM orders WHERE units > 100 GROUP BY category` fail?',
        options: [
          'WHERE runs before aggregation',
          'Aliases need double quotes',
          'SUM needs a DISTINCT',
          'GROUP BY must come before WHERE',
        ],
        answer: 0,
        explain: 'Logical order: FROM → WHERE → GROUP BY → HAVING → SELECT. When WHERE runs, neither the groups nor the alias `units` exist. Use `HAVING SUM(quantity) > 100`.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          import sqlite3
          conn = sqlite3.connect(":memory:")
          q = """SELECT NULL = NULL, NULL IS NULL,
                        1 + NULL, COALESCE(NULL, 5)"""
          print(conn.execute(q).fetchone())
        `,
        options: ['(None, 1, None, 5)', '(1, 1, 1, 5)', '(0, 1, None, 5)', '(None, 1, 1, None)'],
        answer: 0,
        checkOutput: true,
        explain: 'Comparing with NULL gives NULL ("unknown"), not true or false. Only `IS NULL` tests for it. Arithmetic with NULL is NULL. COALESCE returns its first non-NULL argument.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          import sqlite3
          conn = sqlite3.connect(":memory:")
          conn.executescript("""
          CREATE TABLE u (id INT);
          CREATE TABLE o (uid INT, status TEXT);
          INSERT INTO u VALUES (1), (2), (3);
          INSERT INTO o VALUES (1, 'paid'), (2, 'refund');
          """)
          a = conn.execute("""SELECT COUNT(*) FROM u
          LEFT JOIN o ON o.uid = u.id
           AND o.status = 'paid'""").fetchone()
          b = conn.execute("""SELECT COUNT(*) FROM u
          LEFT JOIN o ON o.uid = u.id
          WHERE o.status = 'paid'""").fetchone()
          print(a, b)
        `,
        answer: '(3,) (1,)',
        explain: 'In ON, the condition only limits which rows may match: all 3 users survive. In WHERE it runs after the join and removes every row whose status isn\'t \'paid\', including the NULL rows, turning the LEFT JOIN into an inner join.',
      },
      {
        type: 'choice',
        prompt: '`SELECT name FROM employees WHERE emp_id NOT IN (SELECT manager_id FROM employees)` should list everyone who manages nobody, but it returns **0 rows**. Why?',
        options: [
          'manager_id has NULLs; NOT IN fails',
          'NOT IN needs a GROUP BY',
          'emp_id and manager_id types differ',
          'A subquery can\'t read its own table',
        ],
        answer: 0,
        explain: '`x NOT IN (1, 13, NULL)` means `x <> 1 AND x <> 13 AND x <> NULL`, and the last part is NULL, so the whole condition is never true. Use `NOT EXISTS`, or filter `WHERE manager_id IS NOT NULL` inside the subquery.',
      },
      {
        type: 'code',
        title: 'First-purchase category',
        prompt: md`
          Using ${T_ORDERS}, write \`sql\`: for each category, how many users made their **first completed order** in it. A user's first order is the earliest \`order_date\`, ties broken by the lower \`order_id\`. Return \`category, users\`, most users first, ties by category.
        `,
        setup: db('orders'),
        starter: SQL_STARTER,
        solution: py`
          sql = """
          WITH r AS (
            SELECT user_id, category,
                   ROW_NUMBER() OVER (
                     PARTITION BY user_id
                     ORDER BY order_date, order_id) AS rn
            FROM orders
            WHERE status = 'completed'
          )
          SELECT category, COUNT(*) AS users
          FROM r
          WHERE rn = 1
          GROUP BY category
          ORDER BY users DESC, category
          """
        `,
        tests: [
          { call: 'conn.execute(sql).fetchall()', hidden: true, name: 'rows match' },
          {
            given: 'conn.execute("UPDATE orders SET order_date = \'2025-01-01\' WHERE user_id IN (204, 54, 277)")',
            call: 'conn.execute(sql).fetchall()',
            hidden: true,
            name: 'same-day ties',
          },
        ],
        wrong: [
          py`
            sql = """
            WITH r AS (
              SELECT user_id, category,
                     RANK() OVER (
                       PARTITION BY user_id
                       ORDER BY order_date) AS rn
              FROM orders
              WHERE status = 'completed'
            )
            SELECT category, COUNT(*) AS users
            FROM r
            WHERE rn = 1
            GROUP BY category
            ORDER BY users DESC, category
            """
          `,
          py`
            sql = """
            WITH r AS (
              SELECT user_id, category,
                     ROW_NUMBER() OVER (
                       PARTITION BY user_id
                       ORDER BY order_date, order_id) AS rn
              FROM orders
            )
            SELECT category, COUNT(*) AS users
            FROM r
            WHERE rn = 1
            GROUP BY category
            ORDER BY users DESC, category
            """
          `,
        ],
        explain: 'ROW_NUMBER with a unique tie-breaker gives exactly one first order per user. RANK on the date alone counts a user twice when their first day had two orders. "First touch" attribution like this decides marketing budgets, so ties must be handled deliberately.',
      },
      {
        type: 'code',
        title: 'December vs November by category',
        prompt: md`
          Using ${T_ORDERS} (**completed** orders), write \`sql\` returning, for each category with revenue in **December 2025**: \`category\`, \`nov\` (November 2025 revenue), \`dec\` (December revenue) and \`growth_pct\` = 100 × (dec − nov) / nov. Round revenues to 2 and growth to 1. If a category had **no November revenue**, \`nov\` and \`growth_pct\` are NULL. Order by growth_pct descending, then category.
        `,
        setup: db('orders'),
        starter: SQL_STARTER,
        solution: py`
          sql = """
          WITH m AS (
            SELECT category,
                   strftime('%Y-%m', order_date) AS month,
                   SUM(quantity * unit_price) AS revenue
            FROM orders
            WHERE status = 'completed'
            GROUP BY category, month
          )
          SELECT d.category,
                 ROUND(n.revenue, 2) AS nov,
                 ROUND(d.revenue, 2) AS dec,
                 ROUND(100.0 * (d.revenue - n.revenue)
                       / n.revenue, 1) AS growth_pct
          FROM m d
          LEFT JOIN m n
            ON n.category = d.category
           AND n.month = '2025-11'
          WHERE d.month = '2025-12'
          ORDER BY growth_pct DESC, d.category
          """
        `,
        tests: [
          { call: 'conn.execute(sql).fetchall()', hidden: true, name: 'rows match' },
          {
            given: 'conn.execute("DELETE FROM orders WHERE category = \'Toys\' AND order_date LIKE \'2025-11%\'")',
            call: 'conn.execute(sql).fetchall()',
            hidden: true,
            name: 'Toys sold nothing in November',
          },
        ],
        wrong: [
          py`
            sql = """
            WITH m AS (
              SELECT category,
                     strftime('%Y-%m', order_date) AS month,
                     SUM(quantity * unit_price) AS revenue
              FROM orders
              WHERE status = 'completed'
              GROUP BY category, month
            ),
            l AS (
              SELECT category, month, revenue,
                     LAG(revenue) OVER (
                       PARTITION BY category
                       ORDER BY month) AS prev
              FROM m
            )
            SELECT category, ROUND(prev, 2) AS nov,
                   ROUND(revenue, 2) AS dec,
                   ROUND(100.0 * (revenue - prev) / prev, 1)
                     AS growth_pct
            FROM l
            WHERE month = '2025-12'
            ORDER BY growth_pct DESC, category
            """
          `,
          py`
            sql = """
            WITH m AS (
              SELECT category,
                     strftime('%Y-%m', order_date) AS month,
                     SUM(quantity * unit_price) AS revenue
              FROM orders
              WHERE status = 'completed'
              GROUP BY category, month
            )
            SELECT d.category,
                   ROUND(n.revenue, 2) AS nov,
                   ROUND(d.revenue, 2) AS dec,
                   ROUND(100.0 * (d.revenue - n.revenue)
                         / n.revenue, 1) AS growth_pct
            FROM m d
            JOIN m n
              ON n.category = d.category
             AND n.month = '2025-11'
            WHERE d.month = '2025-12'
            ORDER BY growth_pct DESC, d.category
            """
          `,
        ],
        explain: 'LAG looks at the previous **row**: when November is missing it silently compares December with October. Joining on the explicit month makes the comparison exact, and the LEFT JOIN keeps categories without a November. Interviewers plant exactly this gap to see whether you notice.',
      },
      {
        type: 'code',
        title: 'Median order value per country',
        prompt: md`
          SQLite has no MEDIAN function. Using ${T_ORDERS} (**completed** orders, value = \`quantity * unit_price\`), write \`sql\` returning \`country\` and \`median\` (rounded to 2) for every country, ordered by country. With an even number of orders the median is the mean of the two middle values.
        `,
        setup: db('orders'),
        starter: SQL_STARTER,
        solution: py`
          sql = """
          WITH v AS (
            SELECT country,
                   quantity * unit_price AS value,
                   ROW_NUMBER() OVER (
                     PARTITION BY country
                     ORDER BY quantity * unit_price) AS rn,
                   COUNT(*) OVER (
                     PARTITION BY country) AS n
            FROM orders
            WHERE status = 'completed'
          )
          SELECT country, ROUND(AVG(value), 2) AS median
          FROM v
          WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
          GROUP BY country
          ORDER BY country
          """
        `,
        tests: [
          { call: 'conn.execute(sql).fetchall()', hidden: true, name: 'rows match' },
          {
            given: 'conn.execute("DELETE FROM orders WHERE order_id IN (SELECT MIN(order_id) FROM orders WHERE status = \'completed\' GROUP BY country)")',
            call: 'conn.execute(sql).fetchall()',
            hidden: true,
            name: 'one completed order fewer per country (odd ↔ even)',
          },
        ],
        wrong: [
          py`
            sql = """
            WITH v AS (
              SELECT country,
                     quantity * unit_price AS value,
                     ROW_NUMBER() OVER (
                       PARTITION BY country
                       ORDER BY quantity * unit_price) AS rn,
                     COUNT(*) OVER (
                       PARTITION BY country) AS n
              FROM orders
              WHERE status = 'completed'
            )
            SELECT country, ROUND(AVG(value), 2) AS median
            FROM v
            WHERE rn = (n + 1) / 2
            GROUP BY country
            ORDER BY country
            """
          `,
          py`
            sql = """
            SELECT country,
                   ROUND(AVG(quantity * unit_price), 2)
                     AS median
            FROM orders
            WHERE status = 'completed'
            GROUP BY country
            ORDER BY country
            """
          `,
        ],
        explain: 'With integer division, (n + 1) / 2 and (n + 2) / 2 are the same position for odd n and the two middle positions for even n, and AVG handles both. Medians are far below the means here (skewed revenue, U14). Warehouses offer `PERCENTILE_CONT(0.5)` or `APPROX_QUANTILES`.',
      },
      {
        type: 'code',
        title: 'Quick second purchase',
        prompt: md`
          Using ${T_ORDERS} (**completed** orders; a user's orders sorted by \`order_date\`, then \`order_id\`), write \`sql\` returning **one row**: \`buyers\` (users with ≥ 1 completed order), \`fast\` (users whose **second** completed order came at most **30 days** after their first) and \`rate\` = fast / buyers, rounded to 4.
        `,
        setup: db('orders'),
        starter: SQL_STARTER,
        solution: py`
          sql = """
          WITH r AS (
            SELECT user_id, order_date,
                   ROW_NUMBER() OVER (
                     PARTITION BY user_id
                     ORDER BY order_date, order_id) AS rn
            FROM orders
            WHERE status = 'completed'
          ),
          f AS (
            SELECT user_id,
                   MAX(CASE WHEN rn = 1
                       THEN order_date END) AS d1,
                   MAX(CASE WHEN rn = 2
                       THEN order_date END) AS d2
            FROM r
            GROUP BY user_id
          ),
          k AS (
            SELECT CASE WHEN d2 IS NOT NULL
                   AND julianday(d2) - julianday(d1) <= 30
                   THEN 1 ELSE 0 END AS fast
            FROM f
          )
          SELECT COUNT(*) AS buyers, SUM(fast) AS fast,
                 ROUND(AVG(fast), 4) AS rate
          FROM k
          """
        `,
        tests: [
          { call: 'conn.execute(sql).fetchall()', hidden: true, name: 'rows match' },
          {
            given: 'conn.execute("UPDATE orders SET status = \'cancelled\' WHERE order_id % 4 = 0")',
            call: 'conn.execute(sql).fetchall()',
            hidden: true,
          },
        ],
        wrong: [
          py`
            sql = """
            WITH r AS (
              SELECT user_id, order_date,
                     ROW_NUMBER() OVER (
                       PARTITION BY user_id
                       ORDER BY order_date, order_id) AS rn
              FROM orders
              WHERE status = 'completed'
            ),
            f AS (
              SELECT user_id,
                     MAX(CASE WHEN rn = 1
                         THEN order_date END) AS d1,
                     MAX(CASE WHEN rn = 2
                         THEN order_date END) AS d2
              FROM r
              GROUP BY user_id
            ),
            k AS (
              SELECT CASE WHEN
                     julianday(d2) - julianday(d1) <= 30
                     THEN 1 ELSE 0 END AS fast
              FROM f
              WHERE d2 IS NOT NULL
            )
            SELECT COUNT(*) AS buyers, SUM(fast) AS fast,
                   ROUND(AVG(fast), 4) AS rate
            FROM k
            """
          `,
          py`
            sql = """
            WITH r AS (
              SELECT user_id, order_date,
                     LAG(order_date) OVER (
                       PARTITION BY user_id
                       ORDER BY order_date, order_id)
                       AS prev
              FROM orders
              WHERE status = 'completed'
            ),
            k AS (
              SELECT user_id,
                     MAX(CASE WHEN julianday(order_date)
                         - julianday(prev) <= 30
                         THEN 1 ELSE 0 END) AS fast
              FROM r
              GROUP BY user_id
            )
            SELECT COUNT(*) AS buyers, SUM(fast) AS fast,
                   ROUND(AVG(fast), 4) AS rate
            FROM k
            """
          `,
        ],
        explain: 'The denominator is **all** buyers. Dropping one-time buyers (first wrong answer) inflates the rate. The LAG version measures "any two consecutive orders within 30 days", not "the second order". `MAX(CASE WHEN rn = k …)` pivots the k-th event into columns: a pattern worth memorising.',
      },
      {
        type: 'code',
        title: 'Every day of February',
        prompt: md`
          Using ${T_ORDERS}, write \`sql\` returning **every** day of February 2025 (\`'2025-02-01'\` … \`'2025-02-28'\`) with \`day\`, \`orders\` (number of **completed** orders that day, **0** if none) and \`revenue\` (their revenue rounded to 2, **0** if none). Order by day.
        `,
        setup: db('orders'),
        starter: SQL_STARTER,
        solution: py`
          sql = """
          WITH RECURSIVE cal(day) AS (
            SELECT '2025-02-01'
            UNION ALL
            SELECT date(day, '+1 day') FROM cal
            WHERE day < '2025-02-28'
          )
          SELECT c.day,
                 COUNT(o.order_id) AS orders,
                 ROUND(COALESCE(
                   SUM(o.quantity * o.unit_price), 0), 2)
                   AS revenue
          FROM cal c
          LEFT JOIN orders o
            ON o.order_date = c.day
           AND o.status = 'completed'
          GROUP BY c.day
          ORDER BY c.day
          """
        `,
        tests: [
          { call: 'conn.execute(sql).fetchall()', hidden: true, name: '28 rows with zero days' },
          {
            given: 'conn.execute("DELETE FROM orders WHERE order_date BETWEEN \'2025-02-10\' AND \'2025-02-14\'")',
            call: 'conn.execute(sql).fetchall()',
            hidden: true,
          },
        ],
        wrong: [
          py`
            sql = """
            SELECT order_date AS day,
                   COUNT(*) AS orders,
                   ROUND(SUM(quantity * unit_price), 2)
                     AS revenue
            FROM orders
            WHERE status = 'completed'
              AND order_date LIKE '2025-02%'
            GROUP BY order_date
            ORDER BY order_date
            """
          `,
          py`
            sql = """
            WITH RECURSIVE cal(day) AS (
              SELECT '2025-02-01'
              UNION ALL
              SELECT date(day, '+1 day') FROM cal
              WHERE day < '2025-02-28'
            )
            SELECT c.day,
                   COUNT(o.order_id) AS orders,
                   ROUND(COALESCE(
                     SUM(o.quantity * o.unit_price), 0), 2)
                     AS revenue
            FROM cal c
            LEFT JOIN orders o ON o.order_date = c.day
            WHERE o.status = 'completed'
            GROUP BY c.day
            ORDER BY c.day
            """
          `,
        ],
        explain: 'A plain GROUP BY can only return days that have rows, and a status filter in WHERE drops the zero days again. The calendar CTE + LEFT JOIN + `COUNT(col)`/`COALESCE` combination produces gap-free series. You need those before computing averages, rolling windows or LAG-based growth.',
      },
      {
        type: 'choice',
        prompt: 'Salaries in a department: 120k, 120k, 110k, 100k, 90k. You need "employees with the **top 3 salary levels**". Which ranking function do you filter with `<= 3`?',
        options: ['DENSE_RANK()', 'RANK()', 'ROW_NUMBER()', 'NTILE(3)'],
        answer: 0,
        explain: 'DENSE_RANK gives 1, 1, 2, 3, 4: the four people on the top three levels. RANK gives 1, 1, 3, 4, 5 (only three people, and the 100k level is missing), and ROW_NUMBER cuts arbitrarily inside ties. NTILE splits rows into buckets of equal size.',
      },
    ],
  },
};

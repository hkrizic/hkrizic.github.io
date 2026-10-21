// Unit 8 — Errors, Files & Modules.
import { py, md } from './helpers.js';

// Small fixture files written by exercise setups (hidden from the learner).
const TINY_LOG = py`
  _rows = [
      '1.1.1.1 - - [12/Nov/2025:09:00:01 +0000] "GET / HTTP/1.1" 200 10 0.100',
      '',
      '1.1.1.2 - - [12/Nov/2025:09:00:02 +0000] "GET /a HTTP/1.1" 404 0 0.050',
      '1.1.1.3 - - [12/Nov/2025:09:00:03 +0000] "POST /b HTTP/1.1" 200 99 0.900',
      '',
  ]
  with open("tiny.log", "w") as _f:
      _f.write("\n".join(_rows) + "\n")
`;

const MINI_ORDERS = py`
  _csv = """order_id,user_id,order_date,product,category,quantity,unit_price,country,status
  1,1,2025-01-01,Mug,Home,2,8.50,DE,completed
  2,1,2025-01-02,Lamp,Home,1,30.00,DE,cancelled
  3,2,2025-01-02,Book,Books,3,12.99,US,completed
  4,3,2025-01-03,"Pen, blue",Books,10,0.10,FR,completed
  5,3,2025-01-04,Ball,Sports,1,20.00,FR,returned
  """
  with open("mini_orders.csv", "w") as _f:
      _f.write(_csv)
`;

// Removes `path`, calls fn(path, *args), returns (result, file text).
const WRITTEN = py`
  import os

  def _written(fn, path, *args):
      if os.path.exists(path):
          os.remove(path)
      result = fn(path, *args)
      with open(path) as f:
          return result, f.read()
`;

export default {
  id: 'u08',
  order: 8,
  track: 'foundations',
  title: 'Errors, Files & Modules',
  subtitle: 'exceptions, files, CSV/JSON, stdlib, dates',
  icon: '🛡️',
  color: '#EF4444',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u08-l1',
      title: 'Exceptions',
      summary: 'Read tracebacks and handle errors with try/except/else/finally.',
      steps: [
        {
          type: 'learn',
          title: 'Reading a traceback',
          body: md`
            When something goes wrong, Python stops and prints a **traceback**. Read it **from the bottom up**:

            \`\`\`
            Traceback (most recent call last):
              line 5, in <module>
                print(average([]))
              line 2, in average
                return sum(xs) / len(xs)
            ZeroDivisionError: division by zero
            \`\`\`

            - The **last line** says *what* happened: the exception type and message.
            - The frame just above it says *where*: line 2, inside \`average\`. Higher frames show how you got there.

            | type | typical cause |
            |---|---|
            | \`ValueError\` | right type, bad value: \`int("abc")\` |
            | \`TypeError\` | wrong type: \`"a" + 1\` |
            | \`KeyError\` / \`IndexError\` | missing key / position |
          `,
        },
        {
          type: 'choice',
          prompt: md`
            Which line actually raised this error?

            \`\`\`
            Traceback (most recent call last):
              line 9, in <module>
                report(orders)
              line 6, in report
                total += parse(o)
              line 2, in parse
                return int(o["qty"])
            KeyError: 'qty'
            \`\`\`
          `,
          options: ['line 2, in parse', 'line 9, in <module>', 'line 6, in report', 'The KeyError line'],
          answer: 0,
          explain: 'The bottom frame is where the exception was raised: `o["qty"]` inside `parse`, because one order has no `"qty"` key. Lines 9 and 6 are just the callers on the way there.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            prices = {"mug": 8}
            print(prices["lamp"])
          `,
          options: ["KeyError: 'lamp'", 'None', "NameError: name 'lamp' is not defined", 'IndexError: list index out of range'],
          answer: 0,
          checkOutput: true,
          explain: 'Indexing a dict with a missing key raises `KeyError`, and the message is the key itself. (`prices.get("lamp")` would return `None` instead.)',
        },
        {
          type: 'learn',
          title: 'try / except',
          body: md`
            Wrap code that might fail in \`try\`. If an exception of the named type happens, Python jumps to the \`except\` block instead of crashing, then carries on **after** the whole \`try\` statement.

            Catch the **specific** exception you expect and know how to handle. Here a bad value becomes \`None\` instead of killing the whole report.
          `,
          code: py`
            def to_int(s):
                try:
                    return int(s)
                except ValueError:
                    return None

            print([to_int(s) for s in ["7", "x", "-3"]])
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            for s in ["3", "x", "5"]:
                try:
                    n = int(s)
                    print(n * 2)
                except ValueError:
                    print("bad:", s)
            print("done")
          `,
          answer: '6\nbad: x\n10\ndone',
          explain: 'For "x", `int(s)` raises, so the rest of the `try` block (the `print(n * 2)`) is skipped and the `except` block runs. Then the loop simply continues with "5".',
        },
        {
          type: 'learn',
          title: 'Several excepts, as e, and the hierarchy',
          body: md`
            - Several \`except\` clauses: the **first** matching one runs.
            - \`except (KeyError, IndexError):\` handles several types the same way.
            - \`except ValueError as e:\` gives you the exception object. \`str(e)\` is its message, handy for logs.

            Exceptions form a family tree: \`except LookupError\` also catches its children \`KeyError\` and \`IndexError\`, and \`except Exception\` catches nearly everything. So put **specific** clauses first.

            Never write a bare \`except:\`. It swallows everything, even Ctrl-C and typos (\`NameError\`), and hides real bugs.
          `,
          code: py`
            def first_qty(orders):
                try:
                    return int(orders[0]["qty"])
                except (IndexError, KeyError):
                    return 0
                except ValueError as e:
                    print("bad qty:", e)
                    return 0

            print(first_qty([]))
            print(first_qty([{"qty": "2x"}]))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            try:
                [10, 20][5]
            except LookupError as e:
                print("lookup:", e)
            except IndexError:
                print("index")
          `,
          options: ['lookup: list index out of range', 'index', 'lookup: 5', 'IndexError: list index out of range'],
          answer: 0,
          checkOutput: true,
          explain: '`IndexError` is a subclass of `LookupError`, so the **first** clause already matches and the second one never gets a chance. That\'s why the specific clause must come first.',
        },
        {
          type: 'choice',
          prompt: md`
            A teammate wrote this. What is the real problem?

            \`\`\`python
            try:
                total = sum(o["amount"] for o in ordres)
            except:
                total = 0
            \`\`\`
          `,
          options: [
            'The typo `ordres` is silently hidden',
            '`sum()` can\'t take a generator',
            'A bare `except:` is a SyntaxError',
            'Nothing, it is good defensive code',
          ],
          answer: 0,
          explain: 'The misspelled `ordres` raises `NameError`, and the bare `except:` turns it into a revenue of 0 with no warning. The dashboard happily shows €0. Catch only what you expect (`except KeyError:`), so real bugs still crash loudly.',
        },
        {
          type: 'learn',
          title: 'else and finally',
          body: md`
            Two optional blocks complete the picture:

            - \`else:\` runs only if the \`try\` block raised **nothing**. Put the code that depends on success there. It keeps the \`try\` block small, so you don't accidentally catch errors from unrelated lines.
            - \`finally:\` runs **always**: after success, after a handled error, even after a \`return\`. Use it for cleanup: closing connections, releasing locks, logging that a job finished.
          `,
          code: py`
            def parse(s):
                try:
                    n = float(s)
                except ValueError:
                    print("skip", s)
                else:
                    print("ok", n)
                finally:
                    print("checked", s)

            parse("2.5")
            parse("abc")
          `,
        },
        {
          type: 'output',
          prompt: 'Careful with `finally` and `return`. Type the output.',
          code: py`
            def load(s):
                try:
                    n = int(s)
                except ValueError:
                    return "bad"
                else:
                    return n * 10
                finally:
                    print("done", s)

            print(load("4"))
            print(load("x"))
          `,
          answer: 'done 4\n40\ndone x\nbad',
          explain: 'The `return` value is computed, then `finally` runs **before** the function actually hands it back. So "done 4" is printed before the caller prints 40.',
        },
        {
          type: 'code',
          title: 'Parse the amounts',
          prompt: md`
            A CSV column of amounts arrived as strings, some of them junk (\`"n/a"\`, \`""\`, \`"12,5"\`). Write \`parse_amounts(values)\` that returns a tuple \`(amounts, bad)\`: the values that \`float()\` can parse (as floats, in order), and the **number** of values it couldn't.

            \`\`\`python
            parse_amounts(["10.5", "n/a", "-3", "", "1e3"])
            # ([10.5, -3.0, 1000.0], 2)
            \`\`\`
          `,
          starter: 'def parse_amounts(values):\n    pass\n',
          solution: py`
            def parse_amounts(values):
                amounts, bad = [], 0
                for v in values:
                    try:
                        amounts.append(float(v))
                    except ValueError:
                        bad += 1
                return amounts, bad
          `,
          tests: [
            { call: 'parse_amounts(["10.5", "n/a", "-3", "", "1e3"])', expect: '([10.5, -3.0, 1000.0], 2)' },
            { call: 'parse_amounts([])', expect: '([], 0)' },
            { call: 'parse_amounts(["12,5", " 7 "])', expect: '([7.0], 1)', hidden: true },
            { call: 'parse_amounts(["x", "y"])', expect: '([], 2)', hidden: true },
          ],
          hints: [
            'Loop over the values and `try` to convert each one with `float(v)`.',
            '`float("n/a")` raises `ValueError`. Catch exactly that and count it.',
          ],
          wrong: [
            'def parse_amounts(values):\n    amounts, bad = [], 0\n    for v in values:\n        if v.isdigit():\n            amounts.append(float(v))\n        else:\n            bad += 1\n    return amounts, bad\n',
            'def parse_amounts(values):\n    amounts, bad = [], 0\n    for v in values:\n        try:\n            amounts.append(float(v))\n        except TypeError:\n            bad += 1\n    return amounts, bad\n',
          ],
          explain: md`
            Letting \`float()\` decide is more reliable than checking first: it accepts \`"-3"\`, \`"1e3"\` and \`" 7 "\`, which a hand-written check like \`isdigit()\` rejects.

            Returning the **count** of bad values matters: a pipeline that silently drops 40 % of its rows is broken, and that number is how you notice.
          `,
        },
        {
          type: 'code',
          title: 'Conversion rate',
          prompt: md`
            \`stats\` is a dict of daily funnel counters, like \`{"visits": 200, "purchases": 9}\`. Write \`rate(stats, num, den)\` that returns \`stats[num] / stats[den]\` rounded to 4 decimals, but returns \`None\` if either key is missing **or** the denominator is 0. Use \`try/except\`.

            \`\`\`python
            s = {"visits": 200, "purchases": 9}
            rate(s, "purchases", "visits")  # 0.045
            rate(s, "purchases", "clicks")  # None
            \`\`\`
          `,
          starter: 'def rate(stats, num, den):\n    pass\n',
          solution: py`
            def rate(stats, num, den):
                try:
                    return round(stats[num] / stats[den], 4)
                except (KeyError, ZeroDivisionError):
                    return None
          `,
          tests: [
            { call: 'rate({"visits": 200, "purchases": 9}, "purchases", "visits")', expect: '0.045' },
            { call: 'rate({"visits": 200, "purchases": 9}, "purchases", "clicks")', expect: 'None' },
            { call: 'rate({"a": 1, "b": 0}, "a", "b")', expect: 'None' },
            { call: 'rate({"a": 2, "b": 3}, "a", "b")', expect: '0.6667', hidden: true },
            { call: 'rate({"b": 3}, "a", "b")', expect: 'None', hidden: true },
          ],
          require: ['try'],
          hints: [
            'Two different things can go wrong: a missing key and a zero denominator.',
            '`except (KeyError, ZeroDivisionError):` handles both in one clause.',
          ],
          wrong: [
            'def rate(stats, num, den):\n    try:\n        return round(stats[num] / stats[den], 4)\n    except KeyError:\n        return None\n',
            'def rate(stats, num, den):\n    try:\n        return round(stats[num] / stats[den], 4)\n    except ZeroDivisionError:\n        return None\n',
          ],
          explain: 'A tuple of exception types handles several failure modes the same way. Other errors, like a string where a number should be, still raise, which is what you want: those are bugs, not "no data".',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the latency average',
          prompt: md`
            \`avg_latency(values)\` gets response times as strings from a log. It should skip values that aren't numbers and return the average of the rest, rounded to 3 decimals, or \`0.0\` if nothing is valid. It has **two** bugs.

            \`\`\`python
            avg_latency(["0.120", "timeout", "0.080"])  # 0.1
            avg_latency(["-", "?"])                     # 0.0
            \`\`\`
          `,
          starter: py`
            def avg_latency(values):
                total, count = 0.0, 0
                for v in values:
                    try:
                        total += float(v)
                        count += 1
                    except TypeError:
                        pass
                return round(total / count, 3)
          `,
          solution: py`
            def avg_latency(values):
                total, count = 0.0, 0
                for v in values:
                    try:
                        total += float(v)
                        count += 1
                    except ValueError:
                        pass
                if count == 0:
                    return 0.0
                return round(total / count, 3)
          `,
          tests: [
            { call: 'avg_latency(["0.120", "timeout", "0.080"])', expect: '0.1' },
            { call: 'avg_latency(["-", "?"])', expect: '0.0' },
            { call: 'avg_latency([])', expect: '0.0', hidden: true },
            { call: 'avg_latency(["1", "2", "x"])', expect: '1.5', hidden: true },
          ],
          hints: [
            'Which exception does `float("timeout")` raise? Run it and read the last line of the traceback.',
            'With no valid values, `count` is 0. Return `0.0` before dividing.',
          ],
          wrong: [
            'def avg_latency(values):\n    total, count = 0.0, 0\n    for v in values:\n        try:\n            total += float(v)\n            count += 1\n        except ValueError:\n            pass\n    return round(total / count, 3)\n',
          ],
          explain: md`
            1. \`float("timeout")\` raises \`ValueError\`, not \`TypeError\`, so the handler never matched. Always check the real exception type, don't guess.
            2. An all-invalid batch makes \`count\` 0. Guard the division.

            Note that \`count += 1\` sits inside the \`try\` **after** the conversion: it only runs if \`float(v)\` succeeded.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u08-l2',
      title: 'Raising & Custom Exceptions',
      summary: 'Fail loudly on bad input, define your own errors, and keep pipelines running.',
      steps: [
        {
          type: 'learn',
          title: 'raise: fail loudly',
          body: md`
            When a function gets input it can't handle, **raise** an exception instead of returning a wrong answer or a silent \`None\`:

            \`\`\`python
            raise ValueError(f"qty must be > 0, got {qty}")
            \`\`\`

            Pick the type that fits: \`ValueError\` for a bad value, \`TypeError\` for a wrong type. Put the **offending value** in the message: at 3 a.m., *"qty must be > 0, got -3"* beats *"invalid input"*.

            A bad value that fails **early** is cheap. One that slips into a dashboard is expensive.
          `,
          code: py`
            def discount(price, pct):
                if not 0 <= pct <= 100:
                    raise ValueError(f"pct must be 0-100: {pct}")
                return round(price * (1 - pct / 100), 2)

            print(discount(80, 25))
            try:
                discount(80, 150)
            except ValueError as e:
                print("error:", e)
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            def set_age(age):
                if age < 0:
                    raise ValueError(f"bad age {age}")
                return age

            print(set_age(-1))
          `,
          options: ['ValueError: bad age -1', '-1', 'None', 'ValueError: bad age {age}'],
          answer: 0,
          checkOutput: true,
          explain: '`raise` stops the function immediately: the `return` never runs and `print` never gets a value. Nobody catches the exception, so the program ends with it. The f-string is filled in before raising.',
        },
        {
          type: 'code',
          title: 'Parse a quantity',
          prompt: md`
            Write \`parse_qty(text)\` that turns text like \`" 3 "\` into the int \`3\`. Raise \`ValueError\` if the text is not a whole number **or** if the number is not positive (0 or less).

            \`int()\` already raises \`ValueError\` for junk, so you only need to add the range check.

            \`\`\`python
            parse_qty(" 3 ")   # 3
            parse_qty("0")     # ValueError
            parse_qty("two")   # ValueError
            \`\`\`
          `,
          starter: 'def parse_qty(text):\n    pass\n',
          solution: py`
            def parse_qty(text):
                qty = int(text)
                if qty <= 0:
                    raise ValueError(f"qty must be > 0, got {qty}")
                return qty
          `,
          tests: [
            { call: 'parse_qty(" 3 ")', expect: '3' },
            { call: 'parse_qty("0")', raises: 'ValueError' },
            { call: 'parse_qty("two")', raises: 'ValueError' },
            { call: 'parse_qty("-5")', raises: 'ValueError', hidden: true },
            { call: 'parse_qty("2.5")', raises: 'ValueError', hidden: true },
            { call: 'parse_qty("12")', expect: '12', hidden: true },
          ],
          hints: [
            'Convert with `int(text)` and let it raise for junk.',
            'Then `if qty <= 0: raise ValueError(...)`.',
          ],
          wrong: [
            'def parse_qty(text):\n    try:\n        qty = int(text)\n    except ValueError:\n        return None\n    if qty <= 0:\n        return None\n    return qty\n',
            'def parse_qty(text):\n    qty = int(text)\n    if qty < 0:\n        raise ValueError("negative")\n    return qty\n',
            'def parse_qty(text):\n    qty = int(float(text))\n    if qty <= 0:\n        raise ValueError("not positive")\n    return qty\n',
          ],
          explain: md`
            Returning \`None\` pushes the problem to every caller, who must remember to check for it. Raising makes the failure impossible to ignore.

            \`int(float(text))\` would quietly turn \`"2.5"\` into 2. Truncating a quantity is a data bug, not a feature.
          `,
        },
        {
          type: 'learn',
          title: 'Custom exceptions',
          body: md`
            You can define your own exception type in two lines:

            \`\`\`python
            class InvalidOrder(Exception):
                pass
            \`\`\`

            (\`class\` gets a whole unit later. For now, this is all you need.) Raise it like any other: \`raise InvalidOrder("order 7: qty is 0")\`.

            A named exception lets callers handle **your** domain error specifically, without catching unrelated errors. Inherit from \`ValueError\` instead of \`Exception\` when it *is* a kind of bad value: then existing \`except ValueError\` handlers still catch it.
          `,
          code: py`
            class InvalidOrder(ValueError):
                pass

            def check(order):
                if order["qty"] <= 0:
                    raise InvalidOrder(f"order {order['id']}: qty")
                return "ok"

            try:
                check({"id": 7, "qty": 0})
            except ValueError as e:
                print(type(e).__name__, "-", e)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            class InvalidOrder(Exception):
                pass

            def check(qty):
                if qty <= 0:
                    raise InvalidOrder(f"qty={qty}")
                return "ok"

            for q in [2, 0, 5]:
                try:
                    print(check(q))
                except InvalidOrder as e:
                    print("rejected", e)
          `,
          answer: 'ok\nrejected qty=0\nok',
          explain: 'For 0, `check` raises before returning, so `print(check(q))` never prints. The handler prints the message instead, and the loop continues with 5.',
        },
        {
          type: 'blanks',
          prompt: 'Define the exception and raise it when the stock runs out.',
          code: py`
            class OutOfStock(___):
                pass

            def take(stock, n):
                if n > stock:
                    ___ OutOfStock(f"want {n}, have {stock}")
                return stock - n

            try:
                take(3, 5)
            except OutOfStock as e:
                print(e)
          `,
          bank: ['Exception', 'raise', 'return', 'except', 'Error', 'throw'],
          answer: ['Exception', 'raise'],
          tests: [{ stdout: 'want 5, have 3\n' }],
          explain: 'A custom exception inherits from `Exception` (or a more specific built-in). Python uses `raise`; `throw` is Java/JavaScript. `return OutOfStock(...)` would hand back an exception object without raising it.',
        },
        {
          type: 'learn',
          title: 'Re-raising and translating',
          body: md`
            Sometimes you can't fully handle an error, but you want to log it or add context:

            - A bare \`raise\` inside \`except\` re-raises the **same** exception, with its original traceback.
            - \`raise NewError(...) from e\` **translates** a low-level error into your domain error and keeps the original attached as its cause.

            Translating turns a cryptic \`KeyError: 'qty'\` from deep inside the parser into \`InvalidOrder: missing 'qty'\`, which is the message the caller actually understands.
          `,
          code: py`
            class InvalidOrder(Exception):
                pass

            def qty_of(order):
                try:
                    return int(order["qty"])
                except KeyError as e:
                    raise InvalidOrder(f"missing {e}") from e

            try:
                qty_of({"id": 1})
            except InvalidOrder as e:
                print("caught:", e)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def parse(s):
                try:
                    return int(s)
                except ValueError:
                    print("log:", s)
                    raise

            try:
                parse("x")
            except ValueError:
                print("caller handled it")
          `,
          options: ['log: x\ncaller handled it', 'log: x', 'caller handled it', "ValueError: invalid literal for int() with base 10: 'x'"],
          answer: 0,
          checkOutput: true,
          explain: '`parse` logs and then re-raises the same `ValueError` with the bare `raise`. The caller\'s `except` catches it, so the program finishes normally. Log-and-re-raise is common in services: record context locally, let a higher level decide.',
        },
        {
          type: 'code',
          title: 'Validate an order',
          prompt: md`
            Define \`class InvalidOrder(ValueError)\` and write \`order_total(order)\` for an order dict with \`qty\` (int) and \`price\` (float). Return \`qty * price\` rounded to 2 decimals. Raise \`InvalidOrder\`:

            - if a field is **missing** (translate the \`KeyError\`)
            - if \`qty <= 0\` or \`price < 0\` (a price of 0 is fine: free items exist)

            \`\`\`python
            order_total({"qty": 2, "price": 9.5})  # 19.0
            order_total({"qty": 0, "price": 9.5})  # InvalidOrder
            order_total({"price": 9.5})            # InvalidOrder
            \`\`\`
          `,
          starter: 'class InvalidOrder(ValueError):\n    pass\n\ndef order_total(order):\n    pass\n',
          solution: py`
            class InvalidOrder(ValueError):
                pass

            def order_total(order):
                try:
                    qty, price = order["qty"], order["price"]
                except KeyError as e:
                    raise InvalidOrder(f"missing {e}") from e
                if qty <= 0 or price < 0:
                    raise InvalidOrder(f"bad values: {order}")
                return round(qty * price, 2)
          `,
          tests: [
            { call: 'order_total({"qty": 2, "price": 9.5})', expect: '19.0' },
            { call: 'order_total({"qty": 0, "price": 9.5})', raises: 'InvalidOrder' },
            { call: 'order_total({"price": 9.5})', raises: 'InvalidOrder' },
            { call: 'order_total({"qty": 1})', raises: 'InvalidOrder', hidden: true },
            { call: 'order_total({"qty": 3, "price": -1.0})', raises: 'InvalidOrder', hidden: true },
            { call: 'order_total({"qty": 5, "price": 0.0})', expect: '0.0', hidden: true },
            { assert: 'issubclass(InvalidOrder, ValueError)', name: 'InvalidOrder is a ValueError', hidden: true },
          ],
          hints: [
            'Read both fields inside a `try`, and turn a `KeyError` into `raise InvalidOrder(...) from e`.',
            'After that, check the ranges and `raise InvalidOrder(...)` for bad values.',
          ],
          wrong: [
            'class InvalidOrder(ValueError):\n    pass\n\ndef order_total(order):\n    qty, price = order["qty"], order["price"]\n    if qty <= 0 or price < 0:\n        raise InvalidOrder("bad values")\n    return round(qty * price, 2)\n',
            'class InvalidOrder(ValueError):\n    pass\n\ndef order_total(order):\n    try:\n        qty, price = order["qty"], order["price"]\n    except KeyError as e:\n        raise InvalidOrder("missing") from e\n    if qty <= 0 or price <= 0:\n        raise InvalidOrder("bad values")\n    return round(qty * price, 2)\n',
          ],
          explain: md`
            The caller now has **one** exception to handle for every kind of bad order, and because \`InvalidOrder\` is a \`ValueError\`, generic handlers still work. \`from e\` keeps the original \`KeyError\` in the traceback for whoever debugs it.

            Keep the \`try\` block tight: it only wraps the dict lookups, so a bug elsewhere isn't misreported as "missing field".
          `,
        },
        {
          type: 'learn',
          title: 'EAFP vs LBYL, and pipelines',
          body: md`
            Two styles of defensive code:
            - **LBYL**, *Look Before You Leap*: check first. \`if s.isdigit(): n = int(s)\`
            - **EAFP**, *Easier to Ask Forgiveness than Permission*: just try, and handle the failure.

            Python favours EAFP. Hand-written checks are easy to get wrong (\`"-5".isdigit()\` is \`False\`), the operation itself is the best validator, and a check can go stale: a file can be deleted between "exists?" and "open".

            In a pipeline, one bad row must not kill a 10-million-row job. Skip it, but **count** (or log) it: silent data loss is a bug too.
          `,
          code: py`
            rows = ["4", "-2", "x", "10"]
            good, bad = [], 0
            for r in rows:
                try:
                    good.append(int(r))
                except ValueError:
                    bad += 1
            print(good, "skipped:", bad)
            print([r.isdigit() for r in rows])
          `,
        },
        {
          type: 'choice',
          prompt: 'An LBYL check uses `str.isdigit()` before calling `int()`. What does this print?',
          code: py`
            values = ["42", "-7", " 8", "3.5"]
            print([v.isdigit() for v in values])
          `,
          options: ['[True, False, False, False]', '[True, True, True, False]', '[True, True, False, False]', '[True, True, True, True]'],
          answer: 0,
          checkOutput: true,
          explain: '`isdigit()` is `True` only if every character is a digit, so the minus sign and the space fail. Yet `int("-7")` and `int(" 8")` both work. The LBYL check rejects valid data; EAFP with `try: int(v)` gets it right.',
        },
        {
          type: 'code',
          title: 'Robust order loader',
          prompt: md`
            Rows from a CSV are dicts of **strings**. Write \`load_orders(rows)\` that returns \`(revenue, bad)\`:

            - A row is valid if \`qty\` parses as an int > 0 and \`price\` parses as a float >= 0. A missing key makes the row invalid.
            - \`revenue\` is the sum of \`qty * price\` over valid rows, rounded to 2 decimals.
            - \`bad\` is the number of invalid rows.

            \`\`\`python
            rows = [{"qty": "2", "price": "9.99"},
                    {"qty": "x", "price": "1"},
                    {"price": "5"},
                    {"qty": "1", "price": "0.01"}]
            load_orders(rows)  # (19.99, 2)
            \`\`\`
          `,
          setup: py`
            ROWS = [{"qty": "2", "price": "9.99"},
                    {"qty": "x", "price": "1"},
                    {"price": "5"},
                    {"qty": "1", "price": "0.01"}]
            EDGE = [{"qty": "0", "price": "5"},
                    {"qty": "-1", "price": "5"},
                    {"qty": "3", "price": "-0.5"},
                    {"qty": "4", "price": "0"},
                    {"qty": "2", "price": "n/a"},
                    {"qty": "1", "price": "2.5", "note": "ok"}]
          `,
          starter: 'def load_orders(rows):\n    pass\n',
          solution: py`
            def load_orders(rows):
                revenue, bad = 0.0, 0
                for r in rows:
                    try:
                        qty = int(r["qty"])
                        price = float(r["price"])
                        if qty <= 0 or price < 0:
                            raise ValueError("out of range")
                    except (KeyError, ValueError):
                        bad += 1
                        continue
                    revenue += qty * price
                return round(revenue, 2), bad
          `,
          tests: [
            { call: 'load_orders(ROWS)', expect: '(19.99, 2)', name: 'load_orders(rows) from the example' },
            { call: 'load_orders([])', expect: '(0.0, 0)' },
            { call: 'load_orders(EDGE)', expect: '(2.5, 4)', hidden: true, name: 'zero / negative / free items' },
            { call: 'load_orders([{"qty": "1"}, {"qty": "2", "price": "3"}])', expect: '(6.0, 1)', hidden: true },
          ],
          hints: [
            'Put both conversions **and** the range check inside one `try`. Raising `ValueError` yourself for out-of-range values lets one `except` handle everything.',
            '`except (KeyError, ValueError):` count the row as bad and `continue`. Add to the revenue only after the `try` succeeded.',
          ],
          wrong: [
            'def load_orders(rows):\n    revenue, bad = 0.0, 0\n    for r in rows:\n        try:\n            qty = int(r["qty"])\n            price = float(r["price"])\n            if qty <= 0 or price < 0:\n                raise ValueError("out of range")\n        except ValueError:\n            bad += 1\n            continue\n        revenue += qty * price\n    return round(revenue, 2), bad\n',
            'def load_orders(rows):\n    revenue, bad = 0.0, 0\n    for r in rows:\n        try:\n            qty = int(r["qty"])\n            price = float(r["price"])\n        except (KeyError, ValueError):\n            bad += 1\n            continue\n        revenue += qty * price\n    return round(revenue, 2), bad\n',
          ],
          explain: md`
            Raising your own \`ValueError\` for out-of-range values funnels every kind of bad row into the same handler. One place to count, one place to log.

            This "validate, skip, count" loop is the core of every ingestion job. Production versions also write the rejected rows to a *dead-letter* file so they can be inspected and replayed.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u08-l3',
      title: 'Working with Files',
      summary: 'Read, stream and write text files safely with with-blocks.',
      steps: [
        {
          type: 'learn',
          title: 'Opening and reading a file',
          body: md`
            \`open(path)\` gives you a file object. Always open files in a \`with\` block: the file is **closed automatically** when the block ends, even if an error happens inside.

            - \`f.read()\`: the whole file as one string
            - \`f.readline()\`: just the next line
            - \`f.readlines()\`: a list of all lines, each still ending in \`"\n"\`

            Pass \`encoding="utf-8"\` for text: otherwise the default depends on the computer, and characters like \`€\` or \`č\` can break. Paths are relative to the working directory; the course data lives in \`data/\`.
          `,
          code: py`
            with open("data/words.txt", encoding="utf-8") as f:
                text = f.read()
            print(len(text.split()), "words")
            print(text[:40])
          `,
        },
        {
          type: 'output',
          prompt: '`data/words.txt` has 11 lines, and its first line ends with `data.` What does this print?',
          code: py`
            with open("data/words.txt") as f:
                lines = f.readlines()
            print(len(lines))
            print(repr(lines[0][-6:]))
          `,
          answer: "11\n'data.\\n'",
          explain: '`readlines()` keeps the newline character at the end of each line. `repr` makes it visible as `\\n`. That invisible character is why you `strip()` lines before comparing or parsing them.',
        },
        {
          type: 'learn',
          title: 'Line by line: streaming',
          body: md`
            A file object is an **iterator over lines**. \`for line in f:\` reads one line at a time, so memory stays tiny even for a 50 GB log. \`read()\` and \`readlines()\` load *everything* at once.

            Each line still ends with \`"\n"\`: call \`line.strip()\` before you parse it, and skip blank lines.

            > Streaming line by line is the most common pattern in log processing, and the reason one machine can churn through files bigger than its RAM.
          `,
          code: py`
            count = 0
            with open("data/words.txt") as f:
                for line in f:
                    line = line.strip()
                    if "data" in line.lower():
                        count += 1
            print(count, "lines mention data")
          `,
        },
        {
          type: 'choice',
          prompt: 'You must count the errors in a **50 GB** log on a laptop with 16 GB of RAM. Which approach works?',
          options: [
            '`for line in f:` and count as you go',
            '`f.read().splitlines()`, then count',
            '`lines = f.readlines()` first',
            'All three, Python compresses text',
          ],
          answer: 0,
          explain: '`read()` and `readlines()` try to hold all 50 GB in memory at once and crash. Iterating the file object keeps one line in memory at a time: O(1) memory, O(n) time.',
        },
        {
          type: 'learn',
          title: 'Parsing a log line',
          body: md`
            Each line of \`data/server.log\` looks like this:

            \`\`\`
            203.0.113.5 - - [12/Nov/2025:09:00:40 +0000] "POST /api/checkout HTTP/1.1" 200 8940 0.137
            \`\`\`

            \`line.split()\` cuts it on whitespace into 11 fields. The last three are the **status code**, the **bytes** sent and the **response time** in seconds: \`parts[-3]\`, \`parts[-2]\`, \`parts[-1]\`. The method is \`parts[5]\` (with a stray \`"\`) and the path is \`parts[6]\`.

            Everything you read from a file is a **string**. Convert with \`int()\` / \`float()\` before doing math.
          `,
          code: py`
            with open("data/server.log") as f:
                first = f.readline()
            parts = first.split()
            print(parts)
            print(int(parts[-3]), float(parts[-1]))
          `,
        },
        {
          type: 'output',
          prompt: md`
            \`line\` holds this log line:

            \`\`\`
            198.51.100.7 - - [12/Nov/2025:10:15:02 +0000] "GET /api/cart HTTP/1.1" 404 512 0.250
            \`\`\`

            What does the program print?
          `,
          setup: 'line = \'198.51.100.7 - - [12/Nov/2025:10:15:02 +0000] "GET /api/cart HTTP/1.1" 404 512 0.250\\n\'',
          code: py`
            parts = line.split()
            method = parts[5].strip('"')
            status = int(parts[-3])
            print(method, parts[6])
            print(status >= 400, float(parts[-1]) * 2)
          `,
          answer: 'GET /api/cart\nTrue 0.5',
          explain: '`strip(\'"\')` removes the quote glued to the method. The status becomes the int 404, so `>= 400` is True (a client or server error). `float("0.250") * 2` is 0.5.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines so the program counts the server errors (status 500 or higher) in `data/server.log`, streaming line by line.',
          lines: [
            'errors = 0',
            'with open("data/server.log") as f:',
            '    for line in f:',
            '        if int(line.split()[-3]) >= 500:',
            '            errors += 1',
            'print(errors)',
          ],
          distractors: ['        if line.split()[-3] >= 500:', '    for line in f.read():'],
          tests: [
            { var: 'errors', expect: 'sum(1 for l in open("data/server.log") if int(l.split()[-3]) >= 500)', name: 'errors holds the number of 5xx lines' },
          ],
          explain: 'The counter starts before the loop, the comparison needs `int()` (comparing the string "503" with 500 raises `TypeError`), and the result is printed once, after the loop. `for line in f.read()` would loop over single **characters**, not lines.',
        },
        {
          type: 'code',
          title: 'Count status codes',
          prompt: md`
            Write \`count_statuses(path)\` that reads a log file in the \`server.log\` format **line by line** and returns a dict mapping each status code (as an **int**) to how many requests had it. Skip blank lines.

            \`\`\`python
            count_statuses("data/server.log")
            # {200: ..., 400: ..., 404: ..., ...}
            \`\`\`
          `,
          setup: TINY_LOG,
          starter: 'def count_statuses(path):\n    pass\n',
          solution: py`
            def count_statuses(path):
                counts = {}
                with open(path) as f:
                    for line in f:
                        parts = line.split()
                        if not parts:
                            continue
                        status = int(parts[-3])
                        counts[status] = counts.get(status, 0) + 1
                return counts
          `,
          tests: [
            { call: 'count_statuses("tiny.log")', expect: '{200: 2, 404: 1}', name: 'a small log with blank lines' },
            { call: 'count_statuses("data/server.log")', hidden: true, name: 'all of data/server.log' },
            { assert: 'all(isinstance(k, int) for k in count_statuses("tiny.log"))', name: 'status codes are ints', hidden: true },
          ],
          hints: [
            'Inside `with open(path) as f:` loop `for line in f:` and `split()` each line. An empty list means a blank line.',
            'The status is `int(parts[-3])`. Count with `counts.get(status, 0) + 1`.',
          ],
          wrong: [
            'def count_statuses(path):\n    counts = {}\n    with open(path) as f:\n        for line in f:\n            parts = line.split()\n            if not parts:\n                continue\n            counts[parts[-3]] = counts.get(parts[-3], 0) + 1\n    return counts\n',
            'def count_statuses(path):\n    counts = {}\n    with open(path) as f:\n        for line in f:\n            status = int(line.split()[-3])\n            counts[status] = counts.get(status, 0) + 1\n    return counts\n',
          ],
          explain: md`
            One pass, O(n) time, O(k) memory for the k distinct codes. The file is never loaded whole, so the same function works on a 50 GB log.

            Converting to \`int\` matters downstream: \`status >= 500\` works on ints, while \`"404" >= "500"\` compares text. (\`collections.Counter\` would do the counting part for you, too.)
          `,
        },
        {
          type: 'code',
          title: 'Slowest request',
          prompt: md`
            Write \`slowest(log_path)\` that returns a tuple \`(url, seconds)\` for the request with the **longest** response time in a log file: \`url\` is \`parts[6]\` and \`seconds\` is a **float**. If several requests tie, return the **first** one. Skip blank lines, and return \`None\` if the file has no requests at all.

            \`\`\`python
            slowest("data/server.log")
            # ('/search?q=...', 0.9...)
            \`\`\`
          `,
          setup: TINY_LOG + '\n' + py`
            _ties = [
                '1.1.1.1 - - [12/Nov/2025:09:00:01 +0000] "GET /first HTTP/1.1" 200 10 0.500',
                '1.1.1.2 - - [12/Nov/2025:09:00:02 +0000] "GET /second HTTP/1.1" 200 10 0.500',
                '1.1.1.3 - - [12/Nov/2025:09:00:03 +0000] "GET /fast HTTP/1.1" 200 10 0.010',
            ]
            with open("ties.log", "w") as _f:
                _f.write("\n".join(_ties) + "\n")
            with open("empty.log", "w") as _f:
                _f.write("\n\n")
          `,
          starter: 'def slowest(log_path):\n    pass\n',
          solution: py`
            def slowest(log_path):
                best = None
                with open(log_path) as f:
                    for line in f:
                        parts = line.split()
                        if not parts:
                            continue
                        secs = float(parts[-1])
                        if best is None or secs > best[1]:
                            best = (parts[6], secs)
                return best
          `,
          tests: [
            { call: 'slowest("tiny.log")', expect: "('/b', 0.9)", name: 'a small log' },
            { call: 'slowest("ties.log")', expect: "('/first', 0.5)", name: 'ties → the first one' },
            { call: 'slowest("empty.log")', expect: 'None', hidden: true },
            { call: 'slowest("data/server.log")', hidden: true, name: 'all of data/server.log' },
          ],
          hints: [
            'Keep the best `(url, seconds)` seen so far, starting from `None`.',
            'Replace it only when the new time is strictly greater: `>` keeps the first of several ties.',
          ],
          wrong: [
            'def slowest(log_path):\n    best = None\n    with open(log_path) as f:\n        for line in f:\n            parts = line.split()\n            if not parts:\n                continue\n            secs = float(parts[-1])\n            if best is None or secs >= best[1]:\n                best = (parts[6], secs)\n    return best\n',
            'def slowest(log_path):\n    best = None\n    with open(log_path) as f:\n        for line in f:\n            parts = line.split()\n            if not parts:\n                continue\n            if best is None or parts[-1] > best[1]:\n                best = (parts[6], parts[-1])\n    return best\n',
          ],
          explain: md`
            A running maximum needs O(1) memory, whatever the file size. \`>\` versus \`>=\` is exactly the "first or last tie" decision, and interviewers do ask which one you need.

            Comparing the raw strings happens to work for times like \`"0.137"\` vs \`"0.900"\`, but breaks as soon as a request takes \`"10.2"\` seconds, because \`"10.2" < "9.1"\` as text.
          `,
        },
        {
          type: 'learn',
          title: 'Writing files and modes',
          body: md`
            The second argument of \`open\` is the **mode**:

            | mode | meaning |
            |---|---|
            | \`"r"\` | read (the default) |
            | \`"w"\` | write: creates the file, **erases** old content |
            | \`"a"\` | append to the end |
            | \`"x"\` | create, fail if the file exists |

            \`f.write(s)\` writes exactly \`s\` and does **not** add a newline, so add \`"\n"\` yourself. \`print(..., file=f)\` also works, and does add one.

            A mistaken \`"w"\` destroys data; a mistaken \`"a"\` duplicates it on every re-run.
          `,
          code: py`
            with open("report.txt", "w", encoding="utf-8") as f:
                f.write("status,count\n")
                f.write("200,435\n")
                print("404,30", file=f)

            with open("report.txt", encoding="utf-8") as f:
                print(f.read())
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            with open("note.txt", "w") as f:
                f.write("a")
                f.write("b\n")
            with open("note.txt", "a") as f:
                f.write("c")
            with open("note.txt") as f:
                print(f.read())
          `,
          options: ['ab\nc', 'a\nb\nc', 'c', 'abc'],
          answer: 0,
          checkOutput: true,
          explain: '`write` adds no newlines of its own, so "a" and "b\\n" join into the line "ab". Mode `"a"` then appends "c" after the existing content instead of erasing it.',
        },
        {
          type: 'blanks',
          prompt: 'Complete the function so it **overwrites** the file with one name per line.',
          code: py`
            def save_names(path, names):
                with open(path, ___, encoding="utf-8") as f:
                    for name in names:
                        f.___(name + "\n")

            save_names("names.txt", ["ana", "bo"])
            save_names("names.txt", ["cy"])
            with open("names.txt") as f:
                print(f.read())
          `,
          bank: ['"w"', 'write', '"a"', '"r"', 'print', 'append'],
          answer: ['"w"', 'write'],
          tests: [{ stdout: 'cy\n' }],
          explain: 'Mode `"w"` empties the file first, so the second call leaves only "cy". With `"a"` the file would hold all three names; with `"r"` writing fails. File objects have `write`, not `append`.',
        },
        {
          type: 'code',
          title: 'Write a report',
          prompt: md`
            Write \`write_report(path, counts)\`: \`counts\` maps status code → count. Write a text file with a header line \`status,count\`, then one \`code,count\` line per status, **sorted by status code**. Overwrite the file if it exists, and return the number of **data** lines written (not counting the header).

            \`\`\`python
            write_report("out.csv", {404: 3, 200: 10})  # 2
            \`\`\`
            The file then contains:
            \`\`\`
            status,count
            200,10
            404,3
            \`\`\`
          `,
          setup: WRITTEN,
          starter: 'def write_report(path, counts):\n    pass\n',
          solution: py`
            def write_report(path, counts):
                with open(path, "w", encoding="utf-8") as f:
                    f.write("status,count\n")
                    for code in sorted(counts):
                        f.write(f"{code},{counts[code]}\n")
                return len(counts)
          `,
          tests: [
            { call: '_written(write_report, "r1.csv", {404: 3, 200: 10})', expect: py`(2, "status,count\n200,10\n404,3\n")`, name: 'write_report("out.csv", {404: 3, 200: 10}): returns 2, sorted lines' },
            { call: '_written(write_report, "r2.csv", {})', expect: py`(0, "status,count\n")`, name: 'empty counts: header only' },
            {
              code: py`
                with open("r3.csv", "w") as f:
                    f.write("old junk\n")
                write_report("r3.csv", {500: 1})
                with open("r3.csv") as f:
                    assert f.read() == "status,count\n500,1\n", "the old content is still there"
              `,
              name: 'overwrites an existing file',
              hidden: true,
            },
            { call: '_written(write_report, "r4.csv", {100: 3, 9: 1, 10: 2})', expect: py`(3, "status,count\n9,1\n10,2\n100,3\n")`, hidden: true, name: 'numeric sort order' },
          ],
          hints: [
            'Open with mode `"w"`, write the header, then loop over `sorted(counts)`.',
            'Every `write` needs its own `"\\n"`. An f-string builds each line: `f"{code},{counts[code]}\\n"`.',
          ],
          wrong: [
            'def write_report(path, counts):\n    with open(path, "a") as f:\n        f.write("status,count\\n")\n        for code in sorted(counts):\n            f.write(f"{code},{counts[code]}\\n")\n    return len(counts)\n',
            'def write_report(path, counts):\n    with open(path, "w") as f:\n        f.write("status,count\\n")\n        for code, n in counts.items():\n            f.write(f"{code},{n}\\n")\n    return len(counts)\n',
            'def write_report(path, counts):\n    with open(path, "w") as f:\n        f.write("status,count\\n")\n        for code in sorted(counts):\n            f.write(f"{code},{counts[code]}\\n")\n    return len(counts) + 1\n',
          ],
          explain: md`
            Sorting the **int** keys gives 9, 10, 100. Had you converted them to strings first, you'd get 10, 100, 9.

            Mode \`"w"\` makes the job **idempotent**: running it twice gives the same file. Idempotent outputs are a core data-engineering principle, because failed jobs get retried.
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix save_lines',
          prompt: md`
            \`save_lines(path, lines)\` should **replace** the file's content with the given lines, each followed by a newline. Calling it twice must not duplicate anything. It has two bugs.

            \`\`\`python
            save_lines("todo.txt", ["a", "b"])
            # file content: "a\nb\n"
            \`\`\`
          `,
          setup: WRITTEN,
          starter: py`
            def save_lines(path, lines):
                with open(path, "a", encoding="utf-8") as f:
                    for line in lines:
                        f.write(line)
          `,
          solution: py`
            def save_lines(path, lines):
                with open(path, "w", encoding="utf-8") as f:
                    for line in lines:
                        f.write(line + "\n")
          `,
          tests: [
            { call: '_written(save_lines, "s1.txt", ["a", "b"])[1]', expect: py`"a\nb\n"`, name: 'writes one line per item' },
            { call: '_written(save_lines, "s3.txt", [])[1]', expect: '""', hidden: true },
            {
              code: py`
                save_lines("s2.txt", ["x"])
                save_lines("s2.txt", ["y", "z"])
                with open("s2.txt") as f:
                    assert f.read() == "y\nz\n", "the second call must replace the first"
              `,
              name: 'calling it twice replaces the content',
            },
          ],
          hints: [
            'Which mode erases the old content?',
            '`write` adds no newline. Add `"\\n"` to each line.',
          ],
          wrong: [
            'def save_lines(path, lines):\n    with open(path, "a", encoding="utf-8") as f:\n        for line in lines:\n            f.write(line + "\\n")\n',
            'def save_lines(path, lines):\n    with open(path, "w", encoding="utf-8") as f:\n        f.write("\\n".join(lines))\n',
          ],
          explain: md`
            Mode \`"a"\` piles up content on every call, and \`write\` never adds line breaks. \`"\n".join(lines)\` looks equivalent but leaves the last line without a newline, which breaks tools (and \`cat\`, and \`wc -l\`) that expect complete lines.

            \`f.writelines(line + "\n" for line in lines)\` is another clean way to write it.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u08-l4',
      title: 'CSV & JSON',
      summary: 'Read and write CSV files and JSON documents, the formats every pipeline speaks.',
      steps: [
        {
          type: 'learn',
          title: 'The csv module',
          body: md`
            Why not just \`line.split(",")\`? Because real CSVs **quote** fields that contain commas: \`7,"Smith, Ann",DE\`. Splitting breaks that row into 4 pieces; \`csv.reader\` returns the right 3.

            - \`csv.reader(f)\` yields each row as a **list of strings**.
            - \`next(reader)\` grabs one row, usually the header.
            - Open CSV files with \`newline=""\`, as the csv docs recommend.

            \`csv.reader\` accepts any iterable of lines, even a plain list, which is handy for quick tests.
          `,
          code: py`
            import csv
            lines = ['id,name,country',
                     '7,"Smith, Ann",DE']
            print(lines[1].split(","))
            for row in csv.reader(lines):
                print(row)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            import csv
            rows = list(csv.reader(["a,b,c", '1,"x, y",3']))
            print(len(rows[1]), rows[1][1])
            print(rows[1][2] * 2)
          `,
          answer: '3 x, y\n33',
          explain: 'The quoted field `"x, y"` stays one value, without its quotes. And every value is a string: `"3" * 2` repeats the text instead of doubling a number.',
        },
        {
          type: 'learn',
          title: 'DictReader: rows as dicts',
          body: md`
            \`csv.DictReader(f)\` uses the header line as keys and yields every row as a **dict**: \`row["unit_price"]\` beats remembering that the price is column 6.

            **Every value is a string**, numbers included. Convert before doing math: \`int(row["quantity"])\`, \`float(row["unit_price"])\`.

            Forgetting this is the #1 CSV bug: \`"2" * 3\` is \`"222"\`, not 6.
          `,
          code: py`
            import csv
            with open("data/orders.csv", newline="") as f:
                reader = csv.DictReader(f)
                first = next(reader)
            print(first)
            qty = int(first["quantity"])
            price = float(first["unit_price"])
            print(qty * price)
          `,
        },
        {
          type: 'choice',
          prompt: 'The first order in `data/orders.csv` has quantity 1 and status completed. What does this print?',
          code: py`
            import csv
            with open("data/orders.csv", newline="") as f:
                row = next(csv.DictReader(f))
            print(row["quantity"] * 2, row["status"])
          `,
          options: ['11 completed', '2 completed', '1 1 completed', 'TypeError: can\'t multiply sequence'],
          answer: 0,
          checkOutput: true,
          explain: '`row["quantity"]` is the string "1", and a string times 2 is the string repeated: "11". No error, just a silently wrong number.',
        },
        {
          type: 'code',
          title: 'Revenue per category',
          prompt: md`
            Write \`revenue_by_category(path)\` that reads an orders CSV (same columns as \`data/orders.csv\`) with \`csv.DictReader\` and returns a dict \`category → revenue\`. Revenue is the sum of \`quantity * unit_price\` over orders with status \`"completed"\` only, **rounded to 2 decimals**. Categories without completed orders don't appear.

            \`\`\`python
            revenue_by_category("data/orders.csv")
            # {'Sports': ..., 'Grocery': ..., ...}
            \`\`\`
          `,
          setup: MINI_ORDERS,
          starter: 'import csv\n\ndef revenue_by_category(path):\n    pass\n',
          solution: py`
            import csv

            def revenue_by_category(path):
                totals = {}
                with open(path, newline="") as f:
                    for row in csv.DictReader(f):
                        if row["status"] != "completed":
                            continue
                        cat = row["category"]
                        qty = int(row["quantity"])
                        rev = qty * float(row["unit_price"])
                        totals[cat] = totals.get(cat, 0) + rev
                return {c: round(t, 2)
                        for c, t in totals.items()}
          `,
          tests: [
            { call: 'revenue_by_category("mini_orders.csv")', expect: "{'Home': 17.0, 'Books': 39.97}", name: 'a small file with a quoted comma' },
            { call: 'revenue_by_category("data/orders.csv")', hidden: true, name: 'all of data/orders.csv' },
            { assert: 'all(round(v, 2) == v for v in revenue_by_category("data/orders.csv").values())', name: 'values are rounded to 2 decimals', hidden: true },
          ],
          hints: [
            'Loop `for row in csv.DictReader(f):` and skip rows whose status isn\'t "completed".',
            'Convert both numbers, accumulate per category with `totals.get(cat, 0) + rev`, and round at the very end.',
          ],
          wrong: [
            'import csv\n\ndef revenue_by_category(path):\n    totals = {}\n    with open(path, newline="") as f:\n        for row in csv.DictReader(f):\n            cat = row["category"]\n            rev = int(row["quantity"]) * float(row["unit_price"])\n            totals[cat] = totals.get(cat, 0) + rev\n    return {c: round(t, 2) for c, t in totals.items()}\n',
            'def revenue_by_category(path):\n    totals = {}\n    with open(path) as f:\n        next(f)\n        for line in f:\n            p = line.strip().split(",")\n            if p[8] != "completed":\n                continue\n            totals[p[4]] = totals.get(p[4], 0) + int(p[5]) * float(p[6])\n    return {c: round(t, 2) for c, t in totals.items()}\n',
            'import csv\n\ndef revenue_by_category(path):\n    totals = {}\n    with open(path, newline="") as f:\n        for row in csv.DictReader(f):\n            if row["status"] == "completed":\n                cat = row["category"]\n                rev = int(row["quantity"]) * float(row["unit_price"])\n                totals[cat] = totals.get(cat, 0) + rev\n    return totals\n',
          ],
          explain: md`
            Round **once, at the end**: rounding every partial sum accumulates error. And the hand-rolled \`split(",")\` version breaks on \`"Pen, blue"\`, which is exactly why the csv module exists.

            In SQL this is \`SELECT category, SUM(quantity * unit_price) ... WHERE status = 'completed' GROUP BY category\`; in pandas it's a \`groupby\`. Same logic everywhere.
          `,
        },
        {
          type: 'learn',
          title: 'Writing CSVs',
          body: md`
            \`csv.writer(f)\` turns lists into correctly quoted CSV lines: \`writerow(row)\` writes one, \`writerows(rows)\` many. \`csv.DictWriter(f, fieldnames=[...])\` does the same for dicts; call \`writeheader()\` first.

            Values are converted with \`str()\`, and fields containing commas or quotes are quoted for you. Open the file with \`newline=""\` here too, otherwise you can get blank lines between rows on Windows.
          `,
          code: py`
            import csv
            rows = [{"city": "Zagreb, HR", "temp": 21.5},
                    {"city": "Berlin", "temp": 14}]
            with open("temps.csv", "w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=["city", "temp"])
                w.writeheader()
                w.writerows(rows)
            with open("temps.csv") as f:
                print(f.read())
          `,
        },
        {
          type: 'output',
          prompt: 'What ends up in the file? Type the printed output.',
          code: py`
            import csv
            with open("out.csv", "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["name", "city"])
                w.writerow(["Ann", "Split, HR"])
            with open("out.csv") as f:
                print(f.read())
          `,
          answer: 'name,city\nAnn,"Split, HR"',
          explain: 'The writer quotes only the field that needs it, the one containing a comma, so any CSV reader can split the line correctly again.',
        },
        {
          type: 'learn',
          title: 'JSON and JSON Lines',
          body: md`
            JSON is the text format of APIs and config files.
            - \`json.dumps(obj)\` → JSON string; \`json.loads(text)\` → Python objects
            - \`json.dump(obj, f)\` / \`json.load(f)\` do the same with files

            dict ↔ object, list ↔ array, \`True\` ↔ \`true\`, \`None\` ↔ \`null\`. Two surprises: **tuples become lists**, and **dict keys become strings**. \`indent=2\` pretty-prints; \`sort_keys=True\` gives a stable key order (great for diffs and tests).

            **JSON Lines** (\`.jsonl\`) stores one JSON object per line. You can append to it, stream it and split it across workers, which is why logs and Spark/BigQuery exports use it.
          `,
          code: py`
            import json
            user = {"id": 7, "tags": ("pro", "beta"),
                    "email": None, "active": True}
            text = json.dumps(user, sort_keys=True)
            print(text)
            back = json.loads(text)
            print(back["tags"], back["email"])
            print(json.dumps({"id": 7, "ok": True}, indent=2))
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines exactly.',
          code: py`
            import json
            data = {"b": [1, 2], "a": False}
            print(json.dumps(data, sort_keys=True))
            print(json.dumps([None, "x"]))
          `,
          answer: '{"a": false, "b": [1, 2]}\n[null, "x"]',
          explain: 'JSON spells the constants in lower case (`false`, `null`) and always uses double quotes. `sort_keys=True` puts "a" before "b".',
        },
        {
          type: 'choice',
          prompt: 'What does this round trip print?',
          code: py`
            import json
            d = {1: "one", "k": (2, 3)}
            print(json.loads(json.dumps(d)))
          `,
          options: ["{'1': 'one', 'k': [2, 3]}", "{1: 'one', 'k': (2, 3)}", "{1: 'one', 'k': [2, 3]}", "{'1': 'one', 'k': (2, 3)}"],
          answer: 0,
          checkOutput: true,
          explain: 'JSON object keys are always strings, so the int key 1 comes back as "1". JSON has no tuples, so `(2, 3)` comes back as a list. A round trip doesn\'t always return what you put in: a frequent caching bug.',
        },
        {
          type: 'code',
          title: 'Parse JSON Lines',
          prompt: md`
            An event stream is stored as JSON Lines. Write \`parse_jsonl(text)\` that returns \`(events, bad)\`: the list of decoded values (in order) and the number of **malformed** lines. Blank lines are neither: skip them.

            Malformed JSON raises \`json.JSONDecodeError\`, a subclass of \`ValueError\`.

            \`\`\`python
            text = '{"user": 1}\n{oops\n\n{"user": 2}\n'
            parse_jsonl(text)
            # ([{'user': 1}, {'user': 2}], 1)
            \`\`\`
          `,
          setup: py`
            TEXT = '{"user": 1}\n{oops\n\n{"user": 2}\n'
          `,
          starter: 'import json\n\ndef parse_jsonl(text):\n    pass\n',
          solution: py`
            import json

            def parse_jsonl(text):
                events, bad = [], 0
                for line in text.splitlines():
                    if not line.strip():
                        continue
                    try:
                        events.append(json.loads(line))
                    except json.JSONDecodeError:
                        bad += 1
                return events, bad
          `,
          tests: [
            { call: 'parse_jsonl(TEXT)', expect: "([{'user': 1}, {'user': 2}], 1)", name: 'parse_jsonl(text) from the example' },
            { call: 'parse_jsonl("")', expect: '([], 0)' },
            { call: py`parse_jsonl('  \n[1, 2]\n"str"')`, expect: "([[1, 2], 'str'], 0)", hidden: true, name: 'whitespace-only lines and non-object values' },
            { call: py`parse_jsonl('{\n}\n{"a": 1}\n')`, expect: "([{'a': 1}], 2)", hidden: true },
          ],
          hints: [
            'Loop over `text.splitlines()`; `continue` when `line.strip()` is empty.',
            'Wrap `json.loads(line)` in `try` and catch `json.JSONDecodeError` (or `ValueError`).',
          ],
          wrong: [
            'import json\n\ndef parse_jsonl(text):\n    events, bad = [], 0\n    for line in text.splitlines():\n        try:\n            events.append(json.loads(line))\n        except json.JSONDecodeError:\n            bad += 1\n    return events, bad\n',
            'import json\n\ndef parse_jsonl(text):\n    return [json.loads(l) for l in text.splitlines() if l.strip()], 0\n',
          ],
          explain: md`
            Each line is decoded on its own, so one corrupt record costs you one record, not the whole file. A single big JSON array would be all-or-nothing. That isolation (plus appendability and easy splitting) is why streaming systems love JSON Lines.

            \`json.loads("")\` raises too, which is why blank lines must be skipped **before** parsing, or every trailing newline would count as an error.
          `,
        },
        {
          type: 'code',
          title: 'CSV to JSON Lines',
          prompt: md`
            A typical ingestion step: write \`csv_to_jsonl(src, dst)\` that reads the orders CSV at \`src\` with \`DictReader\` and writes **one JSON object per row** to \`dst\` (overwriting it). Keep all columns, but convert \`quantity\` to \`int\` and \`unit_price\` to \`float\`. Return the number of rows written.

            One output line looks like:
            \`\`\`
            {"order_id": "1", ..., "quantity": 2, "unit_price": 8.5, ...}
            \`\`\`
          `,
          setup: MINI_ORDERS + '\n' + py`
            import json, os

            def _convert(src, dst):
                if os.path.exists(dst):
                    os.remove(dst)
                n = csv_to_jsonl(src, dst)
                with open(dst) as f:
                    return n, [json.loads(line) for line in f]
          `,
          starter: 'import csv\nimport json\n\ndef csv_to_jsonl(src, dst):\n    pass\n',
          solution: py`
            import csv
            import json

            def csv_to_jsonl(src, dst):
                with open(src, newline="") as f:
                    rows = list(csv.DictReader(f))
                with open(dst, "w") as out:
                    for r in rows:
                        r["quantity"] = int(r["quantity"])
                        r["unit_price"] = float(r["unit_price"])
                        out.write(json.dumps(r) + "\n")
                return len(rows)
          `,
          tests: [
            { call: '_convert("mini_orders.csv", "m1.jsonl")[0]', expect: '5', name: 'returns the number of rows' },
            {
              call: '_convert("mini_orders.csv", "m1.jsonl")[1][3]',
              expect: '{"order_id": "4", "user_id": "3", "order_date": "2025-01-03", "product": "Pen, blue", "category": "Books", "quantity": 10, "unit_price": 0.1, "country": "FR", "status": "completed"}',
              name: 'the 4th line is the right JSON object',
            },
            { assert: 'isinstance(_convert("mini_orders.csv", "m2.jsonl")[1][0]["quantity"], int)', name: 'quantity is an int', hidden: true },
            {
              code: py`
                csv_to_jsonl("mini_orders.csv", "m3.jsonl")
                csv_to_jsonl("mini_orders.csv", "m3.jsonl")
                with open("m3.jsonl") as f:
                    assert len(f.readlines()) == 5, "the file should be overwritten"
              `,
              name: 'overwrites the output file',
              hidden: true,
            },
            { call: '_convert("data/orders.csv", "o.jsonl")', hidden: true, name: 'all of data/orders.csv' },
          ],
          hints: [
            'Read the rows with `csv.DictReader`, convert the two fields in each row dict, then `json.dumps` it.',
            'Open the output with `"w"` and write `json.dumps(r) + "\\n"` for every row.',
          ],
          wrong: [
            'import csv\nimport json\n\ndef csv_to_jsonl(src, dst):\n    with open(src, newline="") as f:\n        rows = list(csv.DictReader(f))\n    with open(dst, "w") as out:\n        for r in rows:\n            out.write(json.dumps(r) + "\\n")\n    return len(rows)\n',
            'import csv\nimport json\n\ndef csv_to_jsonl(src, dst):\n    with open(src, newline="") as f:\n        rows = list(csv.DictReader(f))\n    with open(dst, "a") as out:\n        for r in rows:\n            r["quantity"] = int(r["quantity"])\n            r["unit_price"] = float(r["unit_price"])\n            out.write(json.dumps(r) + "\\n")\n    return len(rows)\n',
          ],
          explain: md`
            Typing the values during ingestion means every downstream consumer gets real numbers instead of re-parsing strings.

            This version loads the CSV into memory first. For huge files, stream instead: open both files in one statement, \`with open(src, newline="") as f, open(dst, "w") as out:\`, and convert row by row in O(1) memory.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u08-l5',
      title: 'Modules & the Standard Library',
      summary: 'import styles, math, seeded randomness, __main__, namedtuple and deque.',
      steps: [
        {
          type: 'learn',
          title: 'import, and __main__',
          body: md`
            A **module** is a Python file you can reuse:

            | line | then use |
            |---|---|
            | \`import math\` | \`math.sqrt(9)\` |
            | \`from math import sqrt\` | \`sqrt(9)\` |
            | \`import numpy as np\` | \`np.array(...)\` |

            Avoid \`from math import *\`: you can't tell where names come from, and it can silently overwrite your own.

            Importing **runs** the module's file once. Inside a module, \`__name__\` is the module's name, but in the file you run directly it is \`"__main__"\`. So scripts end with \`if __name__ == "__main__": main()\`: the demo code runs when you execute the file, not when someone imports it.
          `,
          code: py`
            import math
            import statistics as st
            from collections import Counter

            print(math.sqrt(81))
            print(st.median([5, 1, 9]))
            print(Counter("abca").most_common(1))
            print(__name__)
          `,
        },
        {
          type: 'choice',
          prompt: 'After which line does `sqrt(16)` work **without** a prefix?',
          options: ['from math import sqrt', 'import math', 'import math as sqrt', 'import sqrt from math'],
          answer: 0,
          explain: '`from math import sqrt` copies the name `sqrt` into your namespace. `import math` needs `math.sqrt`. `import math as sqrt` names the whole *module* `sqrt`, and `import ... from ...` is JavaScript syntax.',
        },
        {
          type: 'choice',
          prompt: 'The file `stats.py` contains `print(__name__)`. Another file runs `import stats`. What is printed?',
          options: ['stats', '__main__', 'stats.py', 'Nothing'],
          answer: 0,
          explain: 'When a file is imported, `__name__` is the module name. Only the file you start directly gets `"__main__"`. That difference is exactly what the `if __name__ == "__main__":` guard tests.',
        },
        {
          type: 'learn',
          title: 'math essentials',
          body: md`
            - \`math.sqrt(x)\`, \`math.log(x)\`, \`math.pi\`, \`math.inf\`
            - \`math.ceil(x)\` rounds **up**, \`math.floor(x)\` rounds **down** (toward −∞). \`int()\` just chops toward 0, so \`int(-2.5)\` is \`-2\` but \`floor(-2.5)\` is \`-3\`.
            - \`math.isclose(a, b)\` compares floats with a tolerance: the right way to check \`0.1 + 0.2 == 0.3\`.

            \`ceil\` is the paging function: 1,001 rows in pages of 100 need \`ceil(1001 / 100)\` = 11 pages.
          `,
          code: py`
            import math
            print(math.ceil(1001 / 100), math.floor(7.9))
            print(math.floor(-2.5), int(-2.5))
            print(0.1 + 0.2 == 0.3)
            print(math.isclose(0.1 + 0.2, 0.3))
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            import math
            print(math.ceil(10 / 4), math.floor(10 / 4))
            print(math.ceil(-1.5), math.sqrt(49))
          `,
          answer: '3 2\n-1 7.0',
          explain: '10 / 4 = 2.5, so ceil is 3 and floor is 2. Rounding *up* from -1.5 goes toward zero: -1. `sqrt` always returns a float, even for perfect squares.',
        },
        {
          type: 'code',
          title: 'Plan the batches',
          prompt: md`
            A job uploads \`n\` rows in batches of \`size\` rows. Write \`plan_batches(n, size)\` that returns \`(batches, last)\`: how many batches are needed, and how many rows go into the **last** batch. For \`n = 0\` return \`(0, 0)\`.

            \`\`\`python
            plan_batches(1001, 100)  # (11, 1)
            plan_batches(500, 100)   # (5, 100)
            \`\`\`
          `,
          starter: 'import math\n\ndef plan_batches(n, size):\n    pass\n',
          solution: py`
            import math

            def plan_batches(n, size):
                batches = math.ceil(n / size)
                if batches == 0:
                    return 0, 0
                last = n - (batches - 1) * size
                return batches, last
          `,
          tests: [
            { call: 'plan_batches(1001, 100)', expect: '(11, 1)' },
            { call: 'plan_batches(500, 100)', expect: '(5, 100)' },
            { call: 'plan_batches(0, 50)', expect: '(0, 0)', hidden: true },
            { call: 'plan_batches(7, 10)', expect: '(1, 7)', hidden: true },
            { call: 'plan_batches(10**9 + 1, 10**6)', expect: '(1001, 1)', hidden: true },
          ],
          hints: [
            '`math.ceil(n / size)` counts a partially filled batch as a whole batch.',
            'All batches but the last are full: `last = n - (batches - 1) * size`. Handle `n == 0` separately.',
          ],
          wrong: [
            'def plan_batches(n, size):\n    return n // size, n % size\n',
            'import math\n\ndef plan_batches(n, size):\n    return math.ceil(n / size), n % size\n',
          ],
          explain: md`
            \`n // size\` misses the partial batch, and \`n % size\` is 0 when the division is exact, although the last batch is then *full*.

            For astronomically large ints, \`n / size\` loses precision as a float. The pure-integer ceiling \`-(-n // size)\` avoids that, a neat trick worth remembering.
          `,
        },
        {
          type: 'learn',
          title: 'random, reproducibly',
          body: md`
            - \`random.choice(xs)\`: one random item
            - \`random.sample(xs, k)\`: \`k\` distinct items (no repeats)
            - \`random.shuffle(xs)\`: shuffles the list **in place** and returns \`None\`
            - \`random.randint(a, b)\`: an int from \`a\` to \`b\`, **both included**

            The numbers come from a generator started by a **seed**: same seed, same sequence. Seed every experiment, A/B assignment and train/test split, so results can be reproduced and tested. \`rng = random.Random(42)\` gives you a private generator that other code can't disturb.
          `,
          code: py`
            import random
            rng = random.Random(42)
            users = ["ana", "bo", "cy", "di", "eva"]
            print(rng.choice(users))
            print(rng.sample(users, 2))
            print(random.Random(42).choice(users))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import random
            xs = [1, 2, 3]
            print(random.shuffle(xs))
          `,
          options: ['None', '[3, 1, 2]', '[1, 2, 3]', 'A random order of 1, 2, 3'],
          answer: 0,
          checkOutput: true,
          explain: 'Like `list.sort()`, `shuffle` changes the list in place and returns `None`. Print `xs` afterwards to see the new order.',
        },
        {
          type: 'code',
          title: 'Train/test split',
          prompt: md`
            Write \`train_test_split(rows, test_frac, seed)\` that returns \`(train, test)\`:

            1. Copy \`rows\`: never shuffle the caller's list!
            2. Shuffle the copy with \`random.Random(seed).shuffle(...)\`.
            3. The **first** \`int(len(rows) * test_frac)\` items are \`test\`, the rest are \`train\`.

            \`\`\`python
            train, test = train_test_split(list(range(10)), 0.2, 0)
            len(train), len(test)  # (8, 2)
            \`\`\`
          `,
          starter: 'import random\n\ndef train_test_split(rows, test_frac, seed):\n    pass\n',
          solution: py`
            import random

            def train_test_split(rows, test_frac, seed):
                xs = rows[:]
                random.Random(seed).shuffle(xs)
                n_test = int(len(xs) * test_frac)
                return xs[n_test:], xs[:n_test]
          `,
          tests: [
            { call: 'tuple(map(len, train_test_split(list(range(10)), 0.2, 0)))', expect: '(8, 2)', name: 'sizes for 10 rows, 20 % test' },
            { call: 'train_test_split(list(range(10)), 0.2, 0)', hidden: true, name: 'exact shuffle for seed 0' },
            { assert: 'train_test_split(list(range(20)), 0.5, 7) == train_test_split(list(range(20)), 0.5, 7)', name: 'same seed → same split', hidden: true },
            { code: 'xs = list(range(5))\ntrain_test_split(xs, 0.4, 1)\nassert xs == [0, 1, 2, 3, 4], "rows was shuffled in place"', name: 'does not modify rows', hidden: true },
            { assert: 'sorted(sum(train_test_split(list(range(9)), 0.3, 3), [])) == list(range(9))', name: 'every row lands in exactly one part', hidden: true },
            { call: 'train_test_split([], 0.5, 1)', expect: '([], [])', hidden: true },
          ],
          hints: [
            '`xs = rows[:]` copies the list. Then `random.Random(seed).shuffle(xs)`.',
            '`n_test = int(len(xs) * test_frac)`, and return `xs[n_test:], xs[:n_test]` (train first!).',
          ],
          wrong: [
            'import random\n\ndef train_test_split(rows, test_frac, seed):\n    random.Random(seed).shuffle(rows)\n    n_test = int(len(rows) * test_frac)\n    return rows[n_test:], rows[:n_test]\n',
            'import random\n\ndef train_test_split(rows, test_frac, seed):\n    xs = rows[:]\n    random.Random(seed).shuffle(xs)\n    n_test = int(len(xs) * test_frac)\n    return xs[:n_test], xs[n_test:]\n',
          ],
          explain: md`
            Shuffling before splitting matters because data files are often sorted (by date, by user). The first 20 % of a sorted file is not a fair sample.

            A fixed seed makes the split reproducible: rerun the notebook next week and you evaluate on the **same** test set. scikit-learn's \`train_test_split(..., random_state=0)\` works the same way.
          `,
        },
        {
          type: 'learn',
          title: 'collections: namedtuple and deque',
          body: md`
            You've used \`Counter\` and \`defaultdict\`. Two more classics:

            - \`namedtuple("Req", ["path", "status"])\` creates a lightweight **record type**: a tuple whose fields also have names (\`r.status\` instead of \`r[1]\`). Immutable and memory-light.
            - \`deque\` ("deck") is a list optimised for adding and removing at **both ends** in O(1), while \`list.pop(0)\` is O(n). With \`maxlen=n\` it keeps only the **last n** items: a free sliding window for the last 100 log lines or the last 5 prices.
          `,
          code: py`
            from collections import namedtuple, deque

            Req = namedtuple("Req", ["path", "status"])
            r = Req("/api", 200)
            print(r.path, r[1], r)

            last3 = deque(maxlen=3)
            for x in range(1, 6):
                last3.append(x)
            print(list(last3))
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            from collections import deque
            q = deque([1, 2, 3])
            q.appendleft(0)
            q.append(4)
            q.popleft()
            print(list(q))
            w = deque(maxlen=2)
            for x in "abc":
                w.append(x)
            print(list(w))
          `,
          answer: "[1, 2, 3, 4]\n['b', 'c']",
          explain: '`appendleft(0)` then `popleft()` cancel out, and 4 joins at the right. With `maxlen=2`, appending "c" pushes "a" out of the other end automatically.',
        },
        {
          type: 'blanks',
          prompt: 'Complete the code so it keeps only the 3 most recent events.',
          code: py`
            from collections import ___
            recent = deque(___=3)
            for ev in ["a", "b", "c", "d"]:
                recent.append(ev)
            print(list(recent))
          `,
          bank: ['deque', 'maxlen', 'Counter', 'size', 'list', 'limit'],
          answer: ['deque', 'maxlen'],
          tests: [{ stdout: "['b', 'c', 'd']\n" }],
          explain: '`deque(maxlen=3)` drops the oldest item whenever a fourth one arrives. No manual bookkeeping, and every append is O(1).',
        },
        {
          type: 'code',
          title: 'tail',
          prompt: md`
            Write \`tail(path, n)\` that returns the **last \`n\` lines** of a text file as a list of strings, without their trailing newline. Read the file line by line into a \`deque(maxlen=n)\`, so memory stays O(n) even for a huge log. A file with fewer than \`n\` lines gives all its lines.

            \`\`\`python
            tail("data/words.txt", 1)
            # ['Start small, test often and let the computer do the boring work.']
            \`\`\`
          `,
          starter: 'from collections import deque\n\ndef tail(path, n):\n    pass\n',
          solution: py`
            from collections import deque

            def tail(path, n):
                last = deque(maxlen=n)
                with open(path) as f:
                    for line in f:
                        last.append(line.rstrip("\n"))
                return list(last)
          `,
          tests: [
            { call: 'tail("data/words.txt", 1)', expect: "['Start small, test often and let the computer do the boring work.']" },
            { call: 'len(tail("data/words.txt", 100))', expect: '11', name: 'fewer lines than n' },
            { call: 'tail("data/server.log", 3)', hidden: true, name: 'last 3 lines of data/server.log' },
            { call: 'tail("data/words.txt", 0)', expect: '[]', hidden: true },
          ],
          require: ['deque'],
          hints: [
            'Create `deque(maxlen=n)` and append every line while you loop over the file.',
            'Strip the newline with `line.rstrip("\\n")`, and return a `list`, not the deque.',
          ],
          wrong: [
            'from collections import deque\n\ndef tail(path, n):\n    last = deque(maxlen=n)\n    with open(path) as f:\n        for line in f:\n            last.append(line.rstrip("\\n"))\n    return last\n',
            'from collections import deque\n\ndef tail(path, n):\n    last = deque(maxlen=n)\n    with open(path) as f:\n        for line in f:\n            last.append(line)\n    return list(last)\n',
          ],
          explain: md`
            This is how the Unix \`tail\` command can work on a file of any size: O(n) memory and one streaming pass.

            The tempting \`f.readlines()[-n:]\` loads the whole file, and it has a sneaky bug: for \`n = 0\`, \`[-0:]\` is \`[0:]\`, the **entire** list.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u08-l6',
      title: 'Dates & Times',
      summary: 'Parse, format, compare and bucket timestamps with datetime.',
      steps: [
        {
          type: 'learn',
          title: 'date, datetime and timedelta',
          body: md`
            The \`datetime\` module has three types you'll use constantly:

            - \`date(2025, 11, 3)\`: a calendar day
            - \`datetime(2025, 11, 3, 14, 30)\`: a day plus a time
            - \`timedelta(days=7, hours=2)\`: a **duration**

            Add a \`timedelta\` to move in time, and the calendar (month lengths, leap years) is handled for you. Read the parts with \`.year\`, \`.month\`, \`.day\`, \`.hour\`.

            > Never use \`datetime.now()\` or \`date.today()\` inside logic you want to test: the result changes every run. Pass the "as of" date in as a parameter.
          `,
          code: py`
            from datetime import date, datetime, timedelta

            d = date(2025, 11, 28)
            print(d + timedelta(days=5))
            dt = datetime(2025, 11, 3, 14, 30)
            print(dt + timedelta(hours=10), dt.hour)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            from datetime import date, timedelta
            d = date(2025, 2, 27)
            print(d + timedelta(days=2))
            print(d.year, d.month, d.day)
          `,
          answer: '2025-03-01\n2025 2 27',
          explain: '2025 is not a leap year, so February has 28 days: 27 → 28 → 1 March. Dates print in ISO format, `YYYY-MM-DD`.',
        },
        {
          type: 'learn',
          title: 'Parsing text into dates',
          body: md`
            Data arrives as text, so parse it:

            - ISO text (\`2025-11-03\`, \`2025-11-03 14:05:00\`): \`date.fromisoformat(s)\` or \`datetime.fromisoformat(s)\`. Fast and strict.
            - Anything else: \`datetime.strptime(s, format)\` ("string **p**arse time") with format codes:

            | code | meaning | example |
            |---|---|---|
            | \`%Y\` | 4-digit year | 2025 |
            | \`%m\` | month | 11 |
            | \`%d\` | day | 03 |
            | \`%H:%M:%S\` | hour:min:sec | 14:05:00 |
            | \`%b\` | month name | Nov |

            Classic bug: \`%M\` is **minutes**, \`%m\` is the **month**.
          `,
          code: py`
            from datetime import datetime
            a = datetime.fromisoformat("2025-11-03 14:05:00")
            b = datetime.strptime("03.11.2025", "%d.%m.%Y")
            c = datetime.strptime("12/Nov/2025:09:00:40",
                                  "%d/%b/%Y:%H:%M:%S")
            print(a)
            print(b)
            print(c)
          `,
        },
        {
          type: 'choice',
          prompt: 'Which format parses the log timestamp `12/Nov/2025:09:00:40`?',
          options: ['"%d/%b/%Y:%H:%M:%S"', '"%d/%m/%Y:%H:%M:%S"', '"%d/%b/%Y:%H:%m:%S"', '"%d/%b/%Y %H:%M:%S"'],
          answer: 0,
          explain: '"Nov" is a month **name**, so it needs `%b`, not `%m`. Minutes are `%M`. Every literal character must match too: the log has a `:` between year and hour, not a space.',
        },
        {
          type: 'blanks',
          prompt: 'Parse the European date so the program prints `2025-11-03 00:00:00`.',
          code: py`
            from datetime import datetime
            dt = datetime.___("03.11.2025", "%d.%m.%___")
            print(dt)
          `,
          bank: ['strptime', 'Y', 'strftime', 'y', 'parse', 'M'],
          answer: ['strptime', 'Y'],
          tests: [{ stdout: '2025-11-03 00:00:00\n' }],
          explain: '`strptime` parses, `strftime` formats. `%Y` is the 4-digit year; `%y` expects only two digits and would fail on "2025". No time was given, so it defaults to midnight.',
        },
        {
          type: 'learn',
          title: 'Formatting with strftime',
          body: md`
            \`dt.strftime(format)\` ("string **f**ormat time") turns a datetime back into text using the same codes, plus \`%A\` for the weekday name (\`%a\` short). f-strings understand the codes too: \`f"{dt:%Y-%m}"\`.

            \`dt.weekday()\` gives the weekday as a number: **Monday is 0**, Sunday is 6.

            Formatting is how you build **bucket keys**: \`"%Y-%m-%d"\` for daily, \`"%Y-%m-%d %H:00"\` for hourly, \`"%Y-%m"\` for monthly reports.
          `,
          code: py`
            from datetime import datetime
            dt = datetime(2025, 11, 3, 14, 5)
            print(dt.strftime("%d %b %Y, %H:%M"))
            print(dt.strftime("%A"), dt.weekday())
            print(f"{dt:%Y-%m-%d %H:00}")
          `,
        },
        {
          type: 'output',
          prompt: '8 November 2025 is a Saturday. Type both lines.',
          code: py`
            from datetime import datetime
            dt = datetime.fromisoformat("2025-11-08 09:41:07")
            print(dt.strftime("%Y-%m-%d %H:00"))
            print(dt.strftime("%a"), dt.weekday())
          `,
          answer: '2025-11-08 09:00\nSat 5',
          explain: 'The hourly bucket keeps the hour and writes a literal ":00", dropping minutes and seconds. Saturday is weekday 5 when Monday is 0.',
        },
        {
          type: 'learn',
          title: 'Date arithmetic',
          body: md`
            Subtracting two dates (or two datetimes) gives a \`timedelta\`:

            - \`.days\`: whole days
            - \`.total_seconds()\`: the full duration in seconds (divide by 60 or 3600)

            Dates compare with \`<\`, \`>\` and \`==\`, so \`max()\` and \`sorted()\` work on them directly. (ISO strings even sort correctly as plain text, a nice property of the format.)

            \`timedelta\` has no months, because months differ in length. "One month later" needs a business rule.
          `,
          code: py`
            from datetime import date, datetime
            signup = date(2025, 1, 20)
            first_buy = date(2025, 3, 2)
            print((first_buy - signup).days)
            a = datetime(2025, 11, 3, 23, 50)
            b = datetime(2025, 11, 4, 0, 20)
            print((b - a).total_seconds() / 60)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            from datetime import date
            print((date(2024, 3, 1) - date(2024, 2, 1)).days)
            print((date(2025, 3, 1) - date(2025, 2, 1)).days)
          `,
          options: ['29\n28', '28\n28', '30\n30', '29\n29'],
          answer: 0,
          checkOutput: true,
          explain: '2024 is a leap year (February has 29 days), 2025 is not. Date arithmetic knows the calendar, which is why you should never compute days by hand with "30 days per month".',
        },
        {
          type: 'code',
          title: 'Add business days',
          prompt: md`
            Delivery promises skip weekends. Write \`add_business_days(start, n)\`: \`start\` is an ISO date string and \`n >= 0\`. Step forward one day at a time, counting only Monday–Friday, until \`n\` business days have passed. Return the result as an ISO string.

            \`\`\`python
            add_business_days("2025-11-07", 1)  # Fri → '2025-11-10'
            add_business_days("2025-11-03", 5)  # '2025-11-10'
            add_business_days("2025-11-08", 0)  # '2025-11-08'
            \`\`\`
          `,
          starter: 'from datetime import date, timedelta\n\ndef add_business_days(start, n):\n    pass\n',
          solution: py`
            from datetime import date, timedelta

            def add_business_days(start, n):
                d = date.fromisoformat(start)
                while n > 0:
                    d += timedelta(days=1)
                    if d.weekday() < 5:
                        n -= 1
                return d.isoformat()
          `,
          tests: [
            { call: 'add_business_days("2025-11-07", 1)', expect: '"2025-11-10"' },
            { call: 'add_business_days("2025-11-03", 5)', expect: '"2025-11-10"' },
            { call: 'add_business_days("2025-11-08", 0)', expect: '"2025-11-08"' },
            { call: 'add_business_days("2025-11-08", 1)', expect: '"2025-11-10"', hidden: true, name: 'starting on a Saturday' },
            { call: 'add_business_days("2025-12-31", 2)', expect: '"2026-01-02"', hidden: true },
            { call: 'add_business_days("2025-11-03", 10)', expect: '"2025-11-17"', hidden: true },
          ],
          hints: [
            'Parse with `date.fromisoformat(start)`, then loop `while n > 0:` adding one day each time.',
            'Count a day only if `d.weekday() < 5` (Monday 0 … Friday 4). Return `d.isoformat()`.',
          ],
          wrong: [
            'from datetime import date, timedelta\n\ndef add_business_days(start, n):\n    d = date.fromisoformat(start)\n    return (d + timedelta(days=n)).isoformat()\n',
            'from datetime import date, timedelta\n\ndef add_business_days(start, n):\n    d = date.fromisoformat(start)\n    while n > 0:\n        d += timedelta(days=1)\n        if d.weekday() <= 5:\n            n -= 1\n    return d.isoformat()\n',
            'from datetime import date, timedelta\n\ndef add_business_days(start, n):\n    d = date.fromisoformat(start)\n    while n > 0:\n        if d.weekday() < 5:\n            n -= 1\n        d += timedelta(days=1)\n    return d.isoformat()\n',
          ],
          explain: md`
            Step first, then check: the start day itself never counts. The loop is O(n), which is fine for delivery dates; for huge \`n\` you'd jump whole weeks (5 business days = 7 calendar days) and handle the remainder.

            Real systems also skip public holidays, usually with a set of holiday dates checked in the same loop.
          `,
        },
        {
          type: 'code',
          title: 'Events by weekday',
          prompt: md`
            Write \`events_by_weekday(path)\` that reads an events CSV (columns \`user_id, ts, event, device\`, with \`ts\` like \`2025-11-01 07:05:53\`) and returns a dict mapping the weekday **name** (\`"Monday"\` … \`"Sunday"\`) to the number of events on that weekday. Only weekdays that occur appear.

            \`\`\`python
            events_by_weekday("data/events.csv")
            # {'Saturday': ..., 'Sunday': ..., ...}
            \`\`\`
          `,
          setup: py`
            _csv = """user_id,ts,event,device
            1,2025-11-03 08:00:00,page_view,mobile
            1,2025-11-03 23:59:59,purchase,mobile
            2,2025-11-04 00:00:00,search,desktop
            3,2025-11-09 12:00:00,page_view,tablet
            """
            with open("mini_events.csv", "w") as _f:
                _f.write(_csv)
          `,
          starter: 'import csv\nfrom datetime import datetime\n\ndef events_by_weekday(path):\n    pass\n',
          solution: py`
            import csv
            from datetime import datetime

            def events_by_weekday(path):
                counts = {}
                with open(path, newline="") as f:
                    for row in csv.DictReader(f):
                        dt = datetime.fromisoformat(row["ts"])
                        day = dt.strftime("%A")
                        counts[day] = counts.get(day, 0) + 1
                return counts
          `,
          tests: [
            { call: 'events_by_weekday("mini_events.csv")', expect: "{'Monday': 2, 'Tuesday': 1, 'Sunday': 1}", name: 'a small file around midnight' },
            { call: 'events_by_weekday("data/events.csv")', hidden: true, name: 'all of data/events.csv' },
            { assert: 'sum(events_by_weekday("data/events.csv").values()) == 1997', name: 'every event is counted once', hidden: true },
          ],
          hints: [
            'Parse each `row["ts"]` with `datetime.fromisoformat`.',
            '`dt.strftime("%A")` gives the full weekday name, which is your bucket key.',
          ],
          wrong: [
            'import csv\nfrom datetime import datetime\n\ndef events_by_weekday(path):\n    counts = {}\n    with open(path, newline="") as f:\n        for row in csv.DictReader(f):\n            day = datetime.fromisoformat(row["ts"]).strftime("%a")\n            counts[day] = counts.get(day, 0) + 1\n    return counts\n',
            'import csv\n\ndef events_by_weekday(path):\n    counts = {}\n    with open(path, newline="") as f:\n        for row in csv.DictReader(f):\n            day = row["ts"][:10]\n            counts[day] = counts.get(day, 0) + 1\n    return counts\n',
          ],
          explain: md`
            Parse → format a bucket key → count: the same three steps give you hourly traffic (\`"%H"\`), daily active users (\`"%Y-%m-%d"\`) or monthly revenue (\`"%Y-%m"\`).

            Watch the edges: 23:59:59 on Monday and 00:00:00 on Tuesday belong to different days. Time zones make this harder in real data, so log in UTC and convert at the end.
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the monthly report',
          prompt: md`
            \`monthly_counts(dates)\` should count ISO dates like \`"2025-11-03"\` per month and return a dict keyed by month name and year, such as \`{"Nov 2025": 2, "Dec 2025": 1}\`. Every date ends up in January. Fix it.

            \`\`\`python
            monthly_counts(["2025-11-03", "2025-11-20", "2025-12-01"])
            # {'Nov 2025': 2, 'Dec 2025': 1}
            \`\`\`
          `,
          starter: py`
            from datetime import datetime

            def monthly_counts(dates):
                counts = {}
                for s in dates:
                    dt = datetime.strptime(s, "%Y-%M-%d")
                    key = dt.strftime("%b %Y")
                    counts[key] = counts.get(key, 0) + 1
                return counts
          `,
          solution: py`
            from datetime import datetime

            def monthly_counts(dates):
                counts = {}
                for s in dates:
                    dt = datetime.strptime(s, "%Y-%m-%d")
                    key = dt.strftime("%b %Y")
                    counts[key] = counts.get(key, 0) + 1
                return counts
          `,
          tests: [
            { call: 'monthly_counts(["2025-11-03", "2025-11-20", "2025-12-01"])', expect: "{'Nov 2025': 2, 'Dec 2025': 1}" },
            { call: 'monthly_counts([])', expect: '{}' },
            { call: 'monthly_counts(["2024-12-31", "2025-01-01", "2025-01-31"])', expect: "{'Dec 2024': 1, 'Jan 2025': 2}", hidden: true },
            { call: 'monthly_counts(["2025-02-12", "2025-12-02"])', expect: "{'Feb 2025': 1, 'Dec 2025': 1}", hidden: true, name: 'day and month must not be swapped' },
          ],
          hints: [
            'Print `datetime.strptime("2025-11-03", "%Y-%M-%d")`. Where did the 11 go?',
            '`%M` is minutes, `%m` is the month.',
          ],
          wrong: [
            'from datetime import datetime\n\ndef monthly_counts(dates):\n    counts = {}\n    for s in dates:\n        dt = datetime.strptime(s, "%Y-%d-%m")\n        key = dt.strftime("%b %Y")\n        counts[key] = counts.get(key, 0) + 1\n    return counts\n',
            'from datetime import datetime\n\ndef monthly_counts(dates):\n    counts = {}\n    for s in dates:\n        dt = datetime.strptime(s, "%Y-%m-%d")\n        key = dt.strftime("%B %Y")\n        counts[key] = counts.get(key, 0) + 1\n    return counts\n',
          ],
          explain: md`
            With \`%M\`, the "11" was parsed as **minutes**, and the month silently defaulted to January. No error at all, just wrong numbers, which makes it one of the nastiest date bugs.

            Swapping day and month (\`%Y-%d-%m\`) is the other classic: when the day is 12 or less it silently produces the wrong month, and it only crashes from the 13th on. Always test with a date where day, month and minute all differ, like the 20th of November.
          `,
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u08-exam',
    title: 'Errors, Files & Modules Exam',
    minutes: 25,
    intro: 'Exception flow, file formats, dates, and three realistic pipeline tasks: a robust log parser, a CSV aggregation and sessionization. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'output',
        prompt: 'Type exactly what this prints.',
        code: py`
          def f(x):
              try:
                  r = 10 // x
              except ZeroDivisionError:
                  return "div0"
              except TypeError:
                  return "type"
              else:
                  return r
              finally:
                  print("f", x, end="; ")

          print(f(3))
          print(f(0))
          print(f("a"))
        `,
        answer: 'f 3; 3\nf 0; div0\nf a; type',
        explain: '`finally` runs before each return value reaches the caller, and its `end="; "` keeps the cursor on the same line, so the caller\'s print continues that line. `10 // "a"` raises `TypeError`.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          def get(d, k):
              try:
                  return int(d[k])
              except LookupError:
                  return "missing"
              except Exception as e:
                  return type(e).__name__

          print(get({"a": "1"}, "b"), get({"a": "x"}, "a"))
        `,
        options: ['missing ValueError', 'missing Exception', 'KeyError ValueError', 'missing missing'],
        answer: 0,
        checkOutput: true,
        explain: 'The missing key raises `KeyError`, a `LookupError`. `int("x")` raises `ValueError`, which only the broad clause matches, and `type(e).__name__` reports the real class, not "Exception".',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          import json
          rec = {"id": 7, "tags": ("a", "b"), 2: None}
          back = json.loads(json.dumps(rec))
          print(back == rec, back["2"], back["tags"])
        `,
        options: ["False None ['a', 'b']", "True None ('a', 'b')", "False None ('a', 'b')", "KeyError: '2'"],
        answer: 0,
        checkOutput: true,
        explain: 'JSON turns the int key 2 into the string "2" and the tuple into a list, so the round trip is not equal to the original. `None` survives as `null` → `None`.',
      },
      {
        type: 'output',
        prompt: '1 January 2026 is a Thursday. Type both lines.',
        code: py`
          from datetime import datetime, timedelta
          t = datetime(2025, 12, 31, 23, 30)
          t += timedelta(minutes=45)
          print(t)
          print(t.strftime("%a %d %b"), t.weekday())
        `,
        answer: '2026-01-01 00:15:00\nThu 01 Jan 3',
        explain: 'Adding 45 minutes rolls over the hour, the day, the month and the year at once. Thursday is weekday 3 (Monday = 0), and `%d` is zero-padded.',
      },
      {
        type: 'blanks',
        prompt: 'Complete the code so a bad timestamp raises `ParseError` that a generic `except ValueError` would also catch, keeping the original error as its cause.',
        code: py`
          from datetime import datetime

          class ParseError(___):
              pass

          def parse_ts(s):
              try:
                  return datetime.fromisoformat(s)
              except ValueError as e:
                  raise ParseError(f"bad ts: {s}") ___ e
        `,
        bank: ['ValueError', 'from', 'Exception', 'as', 'with', 'raise'],
        answer: ['ValueError', 'from'],
        tests: [
          { call: 'parse_ts("2025-11-03 10:00:00").hour', expect: '10' },
          { call: 'parse_ts("03/11/2025")', raises: 'ParseError' },
          { assert: 'issubclass(ParseError, ValueError)', name: 'ParseError is a ValueError' },
        ],
        explain: 'Subclassing `ValueError` keeps existing handlers working, and `raise ... from e` chains the original exception so the traceback shows both. Plain `Exception` would not be caught by `except ValueError`.',
      },
      {
        type: 'order',
        prompt: 'Arrange the lines to define `save_jsonl(path, records)`, which overwrites `path` with one JSON object per line and returns how many it wrote. (`json` is already imported.)',
        setup: 'import json',
        lines: [
          'def save_jsonl(path, records):',
          '    with open(path, "w") as f:',
          '        for r in records:',
          '            f.write(json.dumps(r) + "\\n")',
          '    return len(records)',
        ],
        distractors: ['    with open(path, "a") as f:', '            f.write(json.dumps(r))'],
        tests: [
          {
            code: py`
              n = save_jsonl("t6.jsonl", [{"a": 1}, {"b": [2]}])
              assert n == 2
              with open("t6.jsonl") as f:
                  assert f.read() == '{"a": 1}\n{"b": [2]}\n'
            `,
            name: 'writes two JSON lines',
          },
        ],
        explain: 'Mode `"w"` makes reruns idempotent, and every record needs its own `"\\n"` or the lines merge into invalid JSON. The `return` sits after the `with` block, once the file is safely closed.',
      },
      {
        type: 'code',
        title: 'Robust log parser',
        prompt: md`
          Write \`parse_log(lines)\` for a list of lines in the \`server.log\` format. A valid line has exactly **11** whitespace-separated fields; the path is \`parts[6]\`, the status \`parts[8]\` (int) and the seconds \`parts[10]\` (float). Return \`(records, errors)\`:

          - \`records\`: \`(path, status, seconds)\` tuples for valid lines, in order
          - \`errors\`: the **1-based line numbers** of malformed lines (wrong field count, or a status / seconds that doesn't parse)

          Blank lines are skipped silently, but they still count for line numbering.

          \`\`\`python
          parse_log(LINES)
          # ([('/', 200, 0.12), ('/api/products', 500, 0.875)],
          #  [3, 4, 5])
          \`\`\`
        `,
        setup: py`
          LINES = [
              '1.2.3.4 - - [12/Nov/2025:09:00:01 +0000] "GET / HTTP/1.1" 200 512 0.120',
              '',
              'garbage line',
              '1.2.3.5 - - [12/Nov/2025:09:00:02 +0000] "POST /api/cart HTTP/1.1" 2OO 10 0.050',
              '1.2.3.6 - - [12/Nov/2025:09:00:03 +0000] "GET /search HTTP/1.1" 404 0 -',
              '1.2.3.7 - - [12/Nov/2025:09:00:04 +0000] "GET /api/products HTTP/1.1" 500 99 0.875',
          ]
          EXTRA = [
              '1.1.1.1 - - [12/Nov/2025:09:00:05 +0000] "GET /x HTTP/1.1" 200 5 0.100 extra',
              '1.1.1.2 - - [12/Nov/2025:09:00:06 +0000] "GET /y HTTP/1.1" 200 5',
              '   ',
              '1.1.1.3 - - [12/Nov/2025:09:00:07 +0000] "GET /z HTTP/1.1" 304 0 0.010',
          ]
          with open("data/server.log") as _f:
              REAL = _f.read().splitlines()
        `,
        starter: 'def parse_log(lines):\n    pass\n',
        solution: py`
          def parse_log(lines):
              records, errors = [], []
              for i, line in enumerate(lines, start=1):
                  parts = line.split()
                  if not parts:
                      continue
                  try:
                      if len(parts) != 11:
                          raise ValueError("field count")
                      status = int(parts[8])
                      secs = float(parts[10])
                  except ValueError:
                      errors.append(i)
                      continue
                  records.append((parts[6], status, secs))
              return records, errors
        `,
        tests: [
          { call: 'parse_log(LINES)', expect: "([('/', 200, 0.12), ('/api/products', 500, 0.875)], [3, 4, 5])", name: 'parse_log(LINES) from the example' },
          { call: 'parse_log([])', expect: '([], [])', hidden: true },
          { call: 'parse_log(EXTRA)', expect: "([('/z', 304, 0.01)], [1, 2])", hidden: true, name: 'too many / too few fields, whitespace line' },
          { call: 'parse_log(REAL)', hidden: true, name: 'all 600 lines of data/server.log' },
        ],
        wrong: [
          'def parse_log(lines):\n    records, errors = [], []\n    for i, line in enumerate(lines):\n        parts = line.split()\n        if not parts:\n            continue\n        try:\n            if len(parts) != 11:\n                raise ValueError("field count")\n            status = int(parts[8])\n            secs = float(parts[10])\n        except ValueError:\n            errors.append(i)\n            continue\n        records.append((parts[6], status, secs))\n    return records, errors\n',
          'def parse_log(lines):\n    records, errors = [], []\n    for i, line in enumerate(lines, start=1):\n        parts = line.split()\n        if not parts:\n            continue\n        try:\n            status = int(parts[8])\n            secs = float(parts[10])\n        except (ValueError, IndexError):\n            errors.append(i)\n            continue\n        records.append((parts[6], status, secs))\n    return records, errors\n',
          'def parse_log(lines):\n    records, errors = [], []\n    n = 0\n    for line in lines:\n        parts = line.split()\n        if not parts:\n            continue\n        n += 1\n        try:\n            if len(parts) != 11:\n                raise ValueError("field count")\n            status = int(parts[8])\n            secs = float(parts[10])\n        except ValueError:\n            errors.append(n)\n            continue\n        records.append((parts[6], status, secs))\n    return records, errors\n',
        ],
        explain: md`
          Validate the **shape** first (field count), then the values, and funnel every failure into one \`except ValueError\`. Without the count check, a line with an extra trailing field is accepted as valid: garbage in, garbage out.

          \`enumerate(lines, start=1)\` numbers every physical line, blank ones included, so the reported numbers match what an engineer sees when opening the file.
        `,
      },
      {
        type: 'code',
        title: 'Country report',
        prompt: md`
          Write \`country_report(path)\` for an orders CSV (columns as in \`data/orders.csv\`). For **completed** orders only, compute per country the number of orders and the revenue (\`quantity * unit_price\`). Return a list of \`(country, orders, revenue)\` tuples with revenue rounded to 2 decimals, sorted by revenue **highest first**, ties by country A→Z.

          \`\`\`python
          country_report("mini.csv")
          # [('DE', 2, 25.0), ('FR', 1, 20.0),
          #  ('US', 1, 20.0), ('HR', 1, 7.5)]
          \`\`\`
        `,
        setup: py`
          _csv = """order_id,user_id,order_date,product,category,quantity,unit_price,country,status
          1,1,2025-01-01,Mug,Home,2,10.00,DE,completed
          2,2,2025-01-01,Lamp,Home,1,20.00,US,completed
          3,3,2025-01-02,Desk,Home,1,500.00,FR,cancelled
          4,4,2025-01-02,"Pen, red",Books,4,5.00,FR,completed
          5,5,2025-01-03,Book,Books,1,12.50,DE,returned
          6,6,2025-01-03,Tea,Grocery,3,2.50,HR,completed
          7,1,2025-01-04,Cup,Home,1,5.00,DE,completed
          """
          with open("mini.csv", "w") as _f:
              _f.write(_csv)
        `,
        starter: 'import csv\n\ndef country_report(path):\n    pass\n',
        solution: py`
          import csv

          def country_report(path):
              stats = {}
              with open(path, newline="") as f:
                  for r in csv.DictReader(f):
                      if r["status"] != "completed":
                          continue
                      qty = int(r["quantity"])
                      rev = qty * float(r["unit_price"])
                      c = r["country"]
                      n, total = stats.get(c, (0, 0.0))
                      stats[c] = (n + 1, total + rev)
              rows = [(c, n, round(t, 2))
                      for c, (n, t) in stats.items()]
              rows.sort(key=lambda x: (-x[2], x[0]))
              return rows
        `,
        tests: [
          { call: 'country_report("mini.csv")', expect: "[('DE', 2, 25.0), ('FR', 1, 20.0), ('US', 1, 20.0), ('HR', 1, 7.5)]", name: 'country_report("mini.csv")' },
          { call: 'country_report("data/orders.csv")', hidden: true, name: 'all of data/orders.csv' },
          { assert: 'sum(n for _, n, _ in country_report("data/orders.csv")) == sum(1 for line in open("data/orders.csv") if line.rstrip().endswith(",completed"))', name: 'counts every completed order once', hidden: true },
        ],
        wrong: [
          'import csv\n\ndef country_report(path):\n    stats = {}\n    with open(path, newline="") as f:\n        for r in csv.DictReader(f):\n            rev = int(r["quantity"]) * float(r["unit_price"])\n            n, total = stats.get(r["country"], (0, 0.0))\n            stats[r["country"]] = (n + 1, total + rev)\n    rows = [(c, n, round(t, 2)) for c, (n, t) in stats.items()]\n    rows.sort(key=lambda x: (-x[2], x[0]))\n    return rows\n',
          'import csv\n\ndef country_report(path):\n    stats = {}\n    with open(path, newline="") as f:\n        for r in csv.DictReader(f):\n            if r["status"] != "completed":\n                continue\n            rev = int(r["quantity"]) * float(r["unit_price"])\n            n, total = stats.get(r["country"], (0, 0.0))\n            stats[r["country"]] = (n + 1, total + rev)\n    rows = [(c, n, round(t, 2)) for c, (n, t) in stats.items()]\n    rows.sort(key=lambda x: x[2], reverse=True)\n    return rows\n',
          'import csv\n\ndef country_report(path):\n    stats = {}\n    with open(path, newline="") as f:\n        for r in csv.DictReader(f):\n            if r["status"] != "completed":\n                continue\n            rev = int(r["quantity"]) * float(r["unit_price"])\n            n, total = stats.get(r["country"], (0, 0.0))\n            stats[r["country"]] = (n + 1, total + rev)\n    rows = [(c, n, round(t, 2)) for c, (n, t) in stats.items()]\n    rows.sort(key=lambda x: (-x[1], x[0]))\n    return rows\n',
        ],
        explain: md`
          A dict of \`(count, total)\` tuples computes several aggregates in a single streaming pass, which is exactly what a database does for \`SELECT country, COUNT(*), SUM(...) ... GROUP BY country ORDER BY 3 DESC, 1\`.

          Filtering by status before aggregating, typing the strings, and a defined tie-break are the three things reviewers check first in any report.
        `,
      },
      {
        type: 'code',
        title: 'Sessionization',
        prompt: md`
          Web analytics groups a user's events into **sessions**: a new session starts when **more than** \`gap\` minutes have passed since the user's previous event. Write \`count_sessions(timestamps, gap=30)\`. \`timestamps\` are \`"YYYY-MM-DD HH:MM:SS"\` strings in **any order**. Return the number of sessions (0 for no events). A gap of exactly \`gap\` minutes stays in the same session.

          \`\`\`python
          count_sessions(["2025-11-01 10:00:00",
                          "2025-11-01 10:20:00",
                          "2025-11-01 11:00:00"])  # 2
          \`\`\`
        `,
        setup: py`
          import csv as _csv
          with open("data/events.csv", newline="") as _f:
              _rows = list(_csv.DictReader(_f))
          TS_235 = [r["ts"] for r in _rows if r["user_id"] == "235"]
          BY_USER = {}
          for _r in _rows:
              BY_USER.setdefault(_r["user_id"], []).append(_r["ts"])
        `,
        starter: 'from datetime import datetime, timedelta\n\ndef count_sessions(timestamps, gap=30):\n    pass\n',
        solution: py`
          from datetime import datetime, timedelta

          def count_sessions(timestamps, gap=30):
              times = sorted(datetime.fromisoformat(t)
                             for t in timestamps)
              if not times:
                  return 0
              limit = timedelta(minutes=gap)
              sessions = 1
              for prev, cur in zip(times, times[1:]):
                  if cur - prev > limit:
                      sessions += 1
              return sessions
        `,
        tests: [
          { call: 'count_sessions(["2025-11-01 10:00:00", "2025-11-01 10:20:00", "2025-11-01 11:00:00"])', expect: '2' },
          { call: 'count_sessions([])', expect: '0', hidden: true },
          { call: 'count_sessions(["2025-11-01 11:00:00", "2025-11-01 10:00:00", "2025-11-01 10:20:00"])', expect: '2', hidden: true, name: 'unsorted input' },
          { call: 'count_sessions(["2025-11-01 10:00:00", "2025-11-01 10:30:00"])', expect: '1', hidden: true, name: 'exactly 30 minutes stays in the session' },
          { call: 'count_sessions(["2025-11-01 10:00:00", "2025-11-01 10:20:00", "2025-11-01 11:00:00"], gap=10)', expect: '3', hidden: true },
          { call: 'count_sessions(["2025-11-01 23:50:00", "2025-11-02 00:10:00"])', expect: '1', hidden: true, name: 'a session across midnight' },
          { call: 'count_sessions(TS_235)', hidden: true, name: 'user 235 from data/events.csv' },
          { call: 'sum(count_sessions(v) for v in BY_USER.values())', hidden: true, name: 'every user in data/events.csv' },
        ],
        wrong: [
          'from datetime import datetime, timedelta\n\ndef count_sessions(timestamps, gap=30):\n    times = [datetime.fromisoformat(t) for t in timestamps]\n    if not times:\n        return 0\n    sessions = 1\n    for prev, cur in zip(times, times[1:]):\n        if cur - prev > timedelta(minutes=gap):\n            sessions += 1\n    return sessions\n',
          'from datetime import datetime, timedelta\n\ndef count_sessions(timestamps, gap=30):\n    times = sorted(datetime.fromisoformat(t) for t in timestamps)\n    if not times:\n        return 0\n    sessions = 1\n    for prev, cur in zip(times, times[1:]):\n        if cur - prev >= timedelta(minutes=gap):\n            sessions += 1\n    return sessions\n',
          'from datetime import datetime\n\ndef count_sessions(timestamps, gap=30):\n    times = sorted(datetime.fromisoformat(t) for t in timestamps)\n    sessions = 1\n    for prev, cur in zip(times, times[1:]):\n        if (cur - prev).seconds > gap * 60:\n            sessions += 1\n    return sessions\n',
        ],
        explain: md`
          Sort, then compare neighbours with \`zip(times, times[1:])\`: O(n log n) overall. Comparing \`timedelta\` objects avoids a trap: \`.seconds\` is only the seconds **part** of a duration and ignores whole days, so a 1-day gap has \`.seconds == 0\`.

          Sessionization is a classic data-engineering interview question. At scale it's done per user with a window function (\`LAG(ts) OVER (PARTITION BY user ORDER BY ts)\`), which is the very same neighbour comparison.
        `,
      },
      {
        type: 'code',
        kind: 'fix',
        title: 'Fix the hourly histogram',
        prompt: md`
          \`hourly_histogram(path, day)\` should read an events CSV and return a list of **24** counts: how many events happened in each hour (index 0 = 00:00–00:59, …, 23) on the ISO date \`day\`, e.g. \`"2025-11-05"\`. It returns all zeros, and sometimes crashes. Fix it.
        `,
        setup: py`
          _csv = """user_id,ts,event,device
          1,2025-11-05 00:10:00,page_view,mobile
          1,2025-11-05 23:59:59,purchase,mobile
          2,2025-11-05 23:00:00,search,desktop
          3,2025-11-06 00:00:00,page_view,tablet
          4,2025-11-05 09:30:00,checkout,mobile
          """
          with open("hours.csv", "w") as _f:
              _f.write(_csv)
        `,
        starter: py`
          import csv
          from datetime import datetime

          def hourly_histogram(path, day):
              counts = [0] * 23
              with open(path, newline="") as f:
                  for row in csv.DictReader(f):
                      dt = datetime.fromisoformat(row["ts"])
                      if dt.date() == day:
                          counts[dt.hour] += 1
              return counts
        `,
        solution: py`
          import csv
          from datetime import datetime

          def hourly_histogram(path, day):
              counts = [0] * 24
              with open(path, newline="") as f:
                  for row in csv.DictReader(f):
                      dt = datetime.fromisoformat(row["ts"])
                      if dt.date().isoformat() == day:
                          counts[dt.hour] += 1
              return counts
        `,
        tests: [
          { call: 'hourly_histogram("hours.csv", "2025-11-05")', expect: '[1] + [0] * 8 + [1] + [0] * 13 + [2]', name: 'hourly_histogram("hours.csv", "2025-11-05")' },
          { call: 'len(hourly_histogram("hours.csv", "2025-12-25"))', expect: '24', hidden: true },
          { call: 'hourly_histogram("data/events.csv", "2025-11-05")', hidden: true, name: 'a real day from data/events.csv' },
        ],
        wrong: [
          'import csv\nfrom datetime import datetime\n\ndef hourly_histogram(path, day):\n    counts = [0] * 24\n    with open(path, newline="") as f:\n        for row in csv.DictReader(f):\n            dt = datetime.fromisoformat(row["ts"])\n            if dt.date() == day:\n                counts[dt.hour] += 1\n    return counts\n',
          'import csv\nfrom datetime import datetime\n\ndef hourly_histogram(path, day):\n    counts = [0] * 23\n    with open(path, newline="") as f:\n        for row in csv.DictReader(f):\n            dt = datetime.fromisoformat(row["ts"])\n            if dt.date().isoformat() == day and dt.hour < 23:\n                counts[dt.hour] += 1\n    return counts\n',
        ],
        explain: md`
          Two bugs: a day has **24** hours (0–23), so \`[0] * 23\` has no slot for 23:xx and crashes with \`IndexError\`. And a \`date\` object never equals a string: \`date(2025, 11, 5) == "2025-11-05"\` is simply \`False\`, no error. Compare like with like: \`dt.date().isoformat() == day\`, or parse \`day\` once with \`date.fromisoformat\`.

          Silent type mismatches in comparisons are among the hardest bugs to spot in data code, because nothing crashes.
        `,
      },
    ],
  },
};

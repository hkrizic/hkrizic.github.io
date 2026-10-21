// Unit 6 — Dictionaries & Sets.
import { py, md } from './helpers.js';

export default {
  id: 'u06',
  order: 6,
  track: 'foundations',
  title: 'Dictionaries & Sets',
  subtitle: 'lookups, counting, grouping, set algebra',
  icon: '🗂️',
  color: '#EC4899',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u06-l1',
      title: 'Dictionary Basics',
      summary: 'Store values under keys and look them up instantly.',
      steps: [
        {
          type: 'learn',
          title: 'Look things up by key',
          body: md`
            A **dictionary** maps **keys** to **values**: \`{"ada": 36, "bob": 25}\`. Instead of a position, you look a value up by its key: \`ages["ada"]\`.

            Keys are unique and must be immutable (strings, numbers, tuples). Values can be anything, even lists or other dicts.

            Looking up a key that isn't there raises a **KeyError**.
          `,
          code: py`
            prices = {"coffee": 3.2, "tea": 2.5}
            print(prices["tea"])
            print(len(prices))
            print(prices)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            stock = {"mug": 12, "pen": 40, "cap": 0}
            print(stock["pen"] + stock["mug"])
            print(len(stock))
          `,
          answer: '52\n3',
          explain: '`len` counts key-value **pairs**. A value of 0 still counts: the key "cap" exists.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            ages = {"ada": 36}
            print(ages["bob"])
          `,
          options: ["KeyError: 'bob'", 'None', '0', "NameError: name 'bob' is not defined"],
          answer: 0,
          checkOutput: true,
          explain: 'Square brackets demand that the key exists. The error message names the missing key, which helps when debugging a pipeline.',
        },
        {
          type: 'learn',
          title: 'get(), in, and defaults',
          body: md`
            - \`d.get(key)\` returns the value, or \`None\` if the key is missing. Never a KeyError.
            - \`d.get(key, default)\` returns \`default\` instead of \`None\`.
            - \`key in d\` checks the **keys** (not the values), and it's fast however big the dict is.

            Use \`d[key]\` when a missing key would be a bug you want to hear about, and \`get\` when missing is normal.
          `,
          code: py`
            stock = {"mug": 3}
            print(stock.get("mug"), stock.get("tea"))
            print(stock.get("tea", 0))
            print("mug" in stock, 3 in stock)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            plan = {"ada": "pro", "bob": "free"}
            print(plan.get("cy", "free"))
            print("pro" in plan, "ada" in plan)
          `,
          answer: 'free\nFalse True',
          explain: '`"pro"` is a **value**, not a key, so `in` says False. To search values, use `"pro" in plan.values()`, but that is a slow scan.',
        },
        {
          type: 'code',
          title: 'Country names',
          prompt: md`
            \`COUNTRIES\` (already defined) maps two-letter codes to names: \`{"DE": "Germany", "HR": "Croatia", ...}\`.

            Write \`country_name(code)\` that returns the name for \`code\`, ignoring case and surrounding spaces. Unknown codes give \`"Unknown"\`.

            \`\`\`python
            country_name(" de")  # "Germany"
            country_name("XX")   # "Unknown"
            \`\`\`
          `,
          setup: 'COUNTRIES = {"DE": "Germany", "HR": "Croatia", "US": "United States", "FR": "France"}',
          starter: 'def country_name(code):\n    pass\n',
          solution: py`
            def country_name(code):
                key = code.strip().upper()
                return COUNTRIES.get(key, "Unknown")
          `,
          tests: [
            { call: 'country_name(" de")', expect: '"Germany"' },
            { call: 'country_name("XX")', expect: '"Unknown"' },
            { call: 'country_name("hr")', expect: '"Croatia"', hidden: true },
            { call: 'country_name("")', expect: '"Unknown"', hidden: true },
            { call: 'country_name("Us ")', expect: '"United States"', hidden: true },
          ],
          hints: [
            'Normalise the code first: `code.strip().upper()`.',
            'Then `COUNTRIES.get(key, "Unknown")`.',
          ],
          wrong: [
            'def country_name(code):\n    return COUNTRIES[code.strip().upper()]\n',
            'def country_name(code):\n    return COUNTRIES.get(code, "Unknown")\n',
          ],
          explain: 'Normalise, then look up with a default: two lines that handle messy input without a single `if`. Lookup tables like this (codes → names, ids → records) are the most common use of dicts in data work.',
        },
        {
          type: 'learn',
          title: 'Add, change, delete',
          body: md`
            - \`d[key] = value\` adds the key, or **overwrites** it if it exists
            - \`d.update(other)\` copies every pair from another dict
            - \`del d[key]\` removes a key (KeyError if it's missing)
            - \`d.pop(key, default)\` removes it and returns its value, or \`default\` if missing
            - \`d.copy()\` makes a shallow copy, just like lists

            Dicts keep **insertion order**: keys come out in the order they were first added. Overwriting keeps a key's position.
          `,
          code: py`
            user = {"name": "Ada"}
            user["plan"] = "free"
            user["plan"] = "pro"
            user.update({"country": "UK"})
            print(user)
            removed = user.pop("country")
            print(removed, user)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            d = {"b": 1, "a": 2}
            d["c"] = 3
            d["b"] = 10
            del d["a"]
            print(d)
          `,
          answer: "{'b': 10, 'c': 3}",
          explain: 'Dicts aren\'t sorted: they keep insertion order. "b" was added first, so it stays first even after its value changes.',
        },
        {
          type: 'blanks',
          prompt: 'Remove "tea" from the cart in a way that would not crash if it were missing, so the program prints `2 {\'mug\': 1}`.',
          code: py`
            cart = {"tea": 2, "mug": 1}
            removed = cart.___("tea", ___)
            print(removed, cart)
          `,
          bank: ['pop', 'get', 'remove', '0', 'del'],
          answer: ['pop', '0'],
          tests: [{ stdout: "2 {'mug': 1}\n" }],
          explain: '`pop` removes the key **and** returns its value, and the second argument is the fallback for a missing key. `get` would return 2 but leave "tea" in the cart; dicts have no `remove` method.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines to add 5 teas to the stock, creating the "tea" entry first if it doesn\'t exist.',
          lines: [
            'stock = {"mug": 3}',
            'if "tea" not in stock:',
            '    stock["tea"] = 0',
            'stock["tea"] += 5',
            'print(stock)',
          ],
          distractors: ['stock.get("tea") += 5'],
          tests: [{ stdout: "{'mug': 3, 'tea': 5}\n" }],
          explain: '`+=` reads the old value first, so the key must exist before you add to it. You can\'t assign to a function call like `stock.get(...)`: that\'s a SyntaxError. (Next lesson: the one-line version with `get`.)',
        },
        {
          type: 'code',
          title: 'Update the stock',
          prompt: md`
            Write \`update_stock(stock, item, delta)\` that changes the quantity of \`item\` by \`delta\` (which may be negative) **in place**, and returns \`stock\`. New items start at 0. If an item's quantity drops to 0 or below, remove it from \`stock\`.

            \`\`\`python
            s = {"mug": 3}
            update_stock(s, "pen", 10)  # {"mug": 3, "pen": 10}
            update_stock(s, "mug", -3)  # {"pen": 10}
            \`\`\`
          `,
          starter: 'def update_stock(stock, item, delta):\n    pass\n',
          solution: py`
            def update_stock(stock, item, delta):
                stock[item] = stock.get(item, 0) + delta
                if stock[item] <= 0:
                    del stock[item]
                return stock
          `,
          tests: [
            { call: 'update_stock({"mug": 3}, "pen", 10)', expect: '{"mug": 3, "pen": 10}' },
            { call: 'update_stock({"mug": 3}, "mug", -3)', expect: '{}' },
            { code: 's = {"mug": 3}\nupdate_stock(s, "mug", 2)\nassert s == {"mug": 5}, s', name: 'changes the dict in place' },
            { call: 'update_stock({}, "cap", -1)', expect: '{}', hidden: true },
            { call: 'update_stock({"a": 1, "b": 2}, "a", -5)', expect: '{"b": 2}', hidden: true },
            { call: 'update_stock({"a": 1}, "a", 0)', expect: '{"a": 1}', hidden: true },
          ],
          hints: [
            '`stock.get(item, 0)` gives the current quantity, even for a new item.',
            'After updating, `del stock[item]` if the new quantity is `<= 0`.',
          ],
          wrong: [
            py`
              def update_stock(stock, item, delta):
                  stock[item] += delta
                  if stock[item] <= 0:
                      del stock[item]
                  return stock
            `,
            py`
              def update_stock(stock, item, delta):
                  stock[item] = stock.get(item, 0) + delta
                  if stock[item] == 0:
                      del stock[item]
                  return stock
            `,
            py`
              def update_stock(stock, item, delta):
                  stock[item] = stock.get(item, 0) + delta
                  return stock
            `,
          ],
          explain: '`get(item, 0)` turns "new item" into "item with quantity 0", so one line covers both cases. Checking `<= 0` instead of `== 0` guards against overselling, where a negative stock would otherwise linger in your inventory.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: settings overrides',
          prompt: md`
            \`with_overrides(defaults, overrides)\` should return a **new** dict: all the defaults, with any keys from \`overrides\` replacing them.

            \`\`\`python
            DEFAULTS = {"theme": "light", "lang": "en"}
            with_overrides(DEFAULTS, {"theme": "dark"})
            # {"theme": "dark", "lang": "en"}
            \`\`\`

            The result is right, but after one call every *other* user suddenly gets the dark theme too. Fix it.
          `,
          starter: py`
            def with_overrides(defaults, overrides):
                result = defaults
                result.update(overrides)
                return result
          `,
          solution: py`
            def with_overrides(defaults, overrides):
                result = defaults.copy()
                result.update(overrides)
                return result
          `,
          tests: [
            { call: 'with_overrides({"theme": "light", "lang": "en"}, {"theme": "dark"})', expect: '{"theme": "dark", "lang": "en"}' },
            {
              code: 'd = {"theme": "light"}\nwith_overrides(d, {"theme": "dark"})\nassert d == {"theme": "light"}, d',
              name: 'defaults stay unchanged',
            },
            { call: 'with_overrides({"a": 1}, {})', expect: '{"a": 1}', hidden: true },
            { call: 'with_overrides({}, {"x": 2})', expect: '{"x": 2}', hidden: true },
            {
              code: 'o = {"x": 1}\nr = with_overrides({}, o)\nr["y"] = 2\nassert o == {"x": 1}, o',
              name: 'result is independent of overrides',
              hidden: true,
            },
          ],
          hints: [
            '`result = defaults` doesn\'t copy anything. Both names point to the same dict (Unit 5, aliasing).',
            'Start from `defaults.copy()`, then `update` it.',
          ],
          wrong: [
            py`
              def with_overrides(defaults, overrides):
                  result = overrides.copy()
                  result.update(defaults)
                  return result
            `,
          ],
          explain: 'Aliasing works exactly like with lists: `result = defaults` made `update` write into the shared defaults, so every later caller saw the override. Copy first, then update. The order also matters: whatever is applied last wins. (`{**defaults, **overrides}` does the same in one expression, Unit 7.)',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u06-l2',
      title: 'Looping over Dicts',
      summary: 'keys, values, items, sorting by value and inverting.',
      steps: [
        {
          type: 'learn',
          title: 'keys, values, items',
          body: md`
            Looping over a dict gives you its **keys**, in insertion order.

            - \`d.keys()\`, \`d.values()\`: just the keys, or just the values
            - \`d.items()\`: \`(key, value)\` pairs; unpack them right in the \`for\`

            \`sum(d.values())\`, \`max(d.values())\` and \`list(d)\` (the keys) work as you'd expect.
          `,
          code: py`
            sales = {"DE": 120, "US": 340, "FR": 95}
            for country in sales:
                print(country)
            for country, amount in sales.items():
                print(f"{country}: {amount}")
            print(sum(sales.values()), list(sales))
          `,
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            scores = {"ada": 3, "bob": 5}
            for name, s in scores.items():
                print(name.upper(), s * 10)
            print(max(scores.values()))
          `,
          answer: 'ADA 30\nBOB 50\n5',
          explain: '`items()` hands you both parts of each pair. `max(scores.values())` is the highest value. To get *whose* score it is, you\'ll use a key function later in this lesson.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            d = {"x": 2, "y": 5}
            print(len(d.items()), list(d)[-1], 5 in d.values())
          `,
          options: ['2 y True', '4 y True', '2 5 True', '2 y False'],
          answer: 0,
          checkOutput: true,
          explain: 'There are 2 pairs. `list(d)` is the list of keys, whose last one is "y". `in d.values()` searches the values, where 5 is found.',
        },
        {
          type: 'code',
          title: 'Inventory value',
          prompt: md`
            \`stock\` maps product → quantity and \`prices\` maps product → unit price. Write \`inventory_value(stock, prices)\` that returns the total value of the stock, rounded to 2 decimals. Products without a price count as 0.

            \`\`\`python
            inventory_value({"mug": 3, "pen": 10},
                            {"mug": 8.5, "pen": 1.2})
            # 37.5
            \`\`\`
          `,
          starter: 'def inventory_value(stock, prices):\n    pass\n',
          solution: py`
            def inventory_value(stock, prices):
                total = 0
                for item, qty in stock.items():
                    total += qty * prices.get(item, 0)
                return round(total, 2)
          `,
          tests: [
            { call: 'inventory_value({"mug": 3, "pen": 10}, {"mug": 8.5, "pen": 1.2})', expect: '37.5' },
            { call: 'inventory_value({}, {"mug": 1})', expect: '0' },
            { call: 'inventory_value({"cap": 2}, {})', expect: '0', hidden: true },
            { call: 'inventory_value({"a": 1, "b": 2}, {"a": 0.1, "b": 0.2, "c": 99})', expect: '0.5', hidden: true },
            { call: 'inventory_value({"mug": 3, "hat": 2}, {"mug": 1.1})', expect: '3.3', hidden: true },
          ],
          hints: [
            'Loop over `stock.items()` to get each item and its quantity.',
            'Look up the price with `prices.get(item, 0)`.',
          ],
          wrong: [
            py`
              def inventory_value(stock, prices):
                  total = 0
                  for item, qty in stock.items():
                      total += qty * prices[item]
                  return round(total, 2)
            `,
            py`
              def inventory_value(stock, prices):
                  total = sum(stock.values()) * sum(prices.values())
                  return round(total, 2)
            `,
          ],
          explain: 'Looping over `stock` and *looking up* in `prices` is a tiny join: each lookup is O(1), so the whole thing is O(n). The extra "c" price is simply never asked for. Missing prices are a data-quality question: here 0, but in a real report you\'d flag them.',
        },
        {
          type: 'learn',
          title: "Don't resize a dict while looping",
          body: md`
            Adding or deleting keys while you loop over a dict raises a **RuntimeError**: the dict can't keep its place while its size changes. (Changing the *value* of an existing key is fine.)

            Loop over a snapshot of the keys, \`for k in list(d):\`, or build a new dict with the pairs you want to keep.
          `,
          code: py`
            counts = {"a": 2, "b": 0, "c": 5}
            for k in list(counts):
                if counts[k] == 0:
                    del counts[k]
            print(counts)

            doubled = {}
            for k, v in counts.items():
                doubled[k] = v * 2
            print(doubled)
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            d = {"a": 1, "b": 0}
            for k in d:
                if d[k] == 0:
                    del d[k]
            print(d)
          `,
          options: ['RuntimeError: dictionary changed size during iteration', "{'a': 1}", "{'a': 1, 'b': 0}", "KeyError: 'b'"],
          answer: 0,
          checkOutput: true,
          explain: 'Unlike lists, which silently skip items, dicts detect the change and stop with an error. That\'s louder, but safer.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: drop the zeros',
          prompt: md`
            \`drop_zeros(counts)\` should delete every key whose value is 0 from \`counts\` (**in place**) and return it. It crashes. Fix it.

            \`\`\`python
            drop_zeros({"a": 0, "b": 1})  # {"b": 1}
            \`\`\`
          `,
          starter: py`
            def drop_zeros(counts):
                for k in counts:
                    if counts[k] == 0:
                        del counts[k]
                return counts
          `,
          solution: py`
            def drop_zeros(counts):
                for k in list(counts):
                    if counts[k] == 0:
                        del counts[k]
                return counts
          `,
          tests: [
            { call: 'drop_zeros({"a": 0, "b": 1})', expect: '{"b": 1}' },
            { call: 'drop_zeros({"x": 0, "y": 0})', expect: '{}' },
            { code: 'c = {"a": 1, "b": 0}\ndrop_zeros(c)\nassert c == {"a": 1}, c', name: 'removes the keys in place' },
            { call: 'drop_zeros({})', expect: '{}', hidden: true },
            { call: 'drop_zeros({"a": 2, "b": -1})', expect: '{"a": 2, "b": -1}', hidden: true },
          ],
          hints: [
            'You can\'t delete from the dict you\'re iterating over.',
            'Iterate over a snapshot instead: `for k in list(counts):`.',
          ],
          wrong: [
            py`
              def drop_zeros(counts):
                  kept = {}
                  for k, v in counts.items():
                      if v != 0:
                          kept[k] = v
                  return kept
            `,
          ],
          explain: '`list(counts)` copies the keys into a list first, so deleting from the dict no longer disturbs the loop. Building a new dict is often cleaner, but this function promised to work **in place**, and callers may rely on that.',
        },
        {
          type: 'learn',
          title: 'Sorting a dict',
          body: md`
            A dict has no \`sort()\`, but \`sorted()\` works on it:

            - \`sorted(d)\`: the **keys**, alphabetically
            - \`sorted(d, key=d.get)\`: the keys, ordered by their **values**. \`d.get\` is a function that takes a key and returns its value, exactly what \`key=\` needs.
            - \`sorted(d.items(), key=by_value)\`: \`(key, value)\` pairs, with a helper \`def by_value(pair): return pair[1]\`

            Add \`reverse=True\` for highest first. \`max(d, key=d.get)\` finds the key with the biggest value.
          `,
          code: py`
            sales = {"DE": 120, "US": 340, "FR": 95}
            print(sorted(sales))
            print(sorted(sales, key=sales.get, reverse=True))

            def by_value(pair):
                return pair[1]

            print(sorted(sales.items(), key=by_value))
            print(max(sales, key=sales.get))
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            scores = {"ada": 90, "bob": 72, "cy": 85}
            print(sorted(scores, key=scores.get))
            print(sorted(scores.values(), reverse=True)[0])
          `,
          answer: "['bob', 'cy', 'ada']\n90",
          explain: 'Sorting by `scores.get` orders the **names** by their scores: 72, 85, 90. Sorting the values gives just the numbers, without the names.',
        },
        {
          type: 'blanks',
          prompt: 'Find the best-selling product, so the program prints `pen`.',
          code: py`
            sales = {"mug": 50, "pen": 90, "cap": 70}
            best = max(sales, key=sales.___)
            print(best)
          `,
          bank: ['get', 'values', 'items', 'keys'],
          answer: ['get'],
          tests: [{ stdout: 'pen\n' }],
          explain: '`max` loops over the keys and compares `sales.get(key)` for each. `values`, `items` and `keys` take no argument, so passing them as a key function raises a TypeError.',
        },
        {
          type: 'code',
          title: 'Best sellers',
          prompt: md`
            \`sales\` maps product → units sold. Write \`top_products(sales, n)\` that returns a list of the \`n\` best-selling \`(product, units)\` pairs, most units first. Ties are broken **alphabetically** by product name.

            \`\`\`python
            top_products({"mug": 5, "pen": 9, "cap": 5}, 2)
            # [("pen", 9), ("cap", 5)]
            \`\`\`
          `,
          starter: 'def top_products(sales, n):\n    pass\n',
          solution: py`
            def units(pair):
                return pair[1]

            def top_products(sales, n):
                pairs = sorted(sales.items())
                pairs = sorted(pairs, key=units, reverse=True)
                return pairs[:n]
          `,
          tests: [
            { call: 'top_products({"mug": 5, "pen": 9, "cap": 5}, 2)', expect: '[("pen", 9), ("cap", 5)]' },
            { call: 'top_products({}, 3)', expect: '[]' },
            { call: 'top_products({"a": 1}, 5)', expect: '[("a", 1)]', hidden: true },
            { call: 'top_products({"b": 2, "a": 2, "c": 3}, 3)', expect: '[("c", 3), ("a", 2), ("b", 2)]', hidden: true },
            { call: 'top_products({"x": 1, "y": 2}, 0)', expect: '[]', hidden: true },
          ],
          hints: [
            '`sorted(sales.items())` sorts the pairs by product name (the first element of each tuple).',
            'Then sort again by units with `reverse=True`. Stability keeps the alphabetical order inside ties (Unit 5).',
            'Slice the first `n` pairs.',
          ],
          wrong: [
            py`
              def units(pair):
                  return pair[1]

              def top_products(sales, n):
                  pairs = sorted(sales.items(), key=units, reverse=True)
                  return pairs[:n]
            `,
            py`
              def top_products(sales, n):
                  names = sorted(sales, key=sales.get, reverse=True)
                  return names[:n]
            `,
          ],
          explain: 'Tuples compare element by element, so sorting the items sorts by name (keys are unique, so the counts never need comparing). The second, stable sort by units then keeps names in order within each tie. Leaderboards and "top 10 products" reports need deterministic tie-breaking, or the same query returns different answers on different days.',
        },
        {
          type: 'learn',
          title: 'Inverting a dict',
          body: md`
            Inverting swaps keys and values: \`{"DE": "Germany"}\` becomes \`{"Germany": "DE"}\`. Loop over the items and assign \`inv[v] = k\`.

            Watch out: keys are unique, values needn't be. If two keys share a value, the later one **overwrites** the earlier in the inverted dict. To keep them all, map each value to a **list** of keys.
          `,
          code: py`
            plan = {"ada": "pro", "bob": "free", "cy": "pro"}
            inv = {}
            for user, p in plan.items():
                inv[p] = user
            print(inv)   # ada was overwritten by cy!
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            codes = {"DE": 49, "HR": 385, "AT": 43}
            by_number = {}
            for country, num in codes.items():
                by_number[num] = country
            print(by_number[385], len(by_number))
          `,
          answer: 'HR 3',
          explain: 'All three dialling codes are distinct, so nothing is overwritten and the inverted dict also has 3 keys. Inverting lets you look up "backwards" in O(1).',
        },
        {
          type: 'code',
          title: 'Users by plan',
          prompt: md`
            Write \`users_by_plan(plans)\` that inverts a user → plan dict into a plan → list-of-users dict. Users in each list keep their original order.

            \`\`\`python
            users_by_plan({"ada": "pro", "bob": "free", "cy": "pro"})
            # {"pro": ["ada", "cy"], "free": ["bob"]}
            \`\`\`
          `,
          starter: 'def users_by_plan(plans):\n    pass\n',
          solution: py`
            def users_by_plan(plans):
                groups = {}
                for user, plan in plans.items():
                    if plan not in groups:
                        groups[plan] = []
                    groups[plan].append(user)
                return groups
          `,
          tests: [
            { call: 'users_by_plan({"ada": "pro", "bob": "free", "cy": "pro"})', expect: '{"pro": ["ada", "cy"], "free": ["bob"]}' },
            { call: 'users_by_plan({})', expect: '{}' },
            { call: 'users_by_plan({"a": "x"})', expect: '{"x": ["a"]}', hidden: true },
            { call: 'users_by_plan({"a": "t", "b": "t", "c": "t"})', expect: '{"t": ["a", "b", "c"]}', hidden: true },
            { call: 'users_by_plan({"u1": "free", "u2": "team", "u3": "free", "u4": "pro", "u5": "team"})', hidden: true },
          ],
          hints: [
            'Loop over `plans.items()`.',
            'If the plan isn\'t a key yet, create an empty list for it. Then append the user.',
          ],
          wrong: [
            py`
              def users_by_plan(plans):
                  groups = {}
                  for user, plan in plans.items():
                      groups[plan] = [user]
                  return groups
            `,
            py`
              def users_by_plan(plans):
                  groups = {}
                  for user, plan in plans.items():
                      groups[plan].append(user)
                  return groups
            `,
          ],
          explain: '"Create the list if it\'s missing, then append" is the **grouping** pattern, so common that the next lesson gives you two shortcuts for it. Overwriting with `[user]` keeps only the last user of each plan.',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u06-l3',
      title: 'Counting & Grouping',
      summary: 'Word counts, group-by, Counter and defaultdict.',
      steps: [
        {
          type: 'learn',
          title: 'Counting with get()',
          body: md`
            Counting is the most common dict job: words in a text, events per user, errors per endpoint. For each item, take its current count (0 if new) and add 1:

            \`counts[w] = counts.get(w, 0) + 1\`

            One pass, O(1) per update. Counting a billion log lines is just this loop; split across many machines and merged at the end, it's **MapReduce**.
          `,
          code: py`
            words = "to be or not to be".split()
            counts = {}
            for w in words:
                counts[w] = counts.get(w, 0) + 1
            print(counts)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            counts = {}
            for ch in "banana":
                counts[ch] = counts.get(ch, 0) + 1
            print(counts)
          `,
          answer: "{'b': 1, 'a': 3, 'n': 2}",
          explain: 'Keys appear in the order they were **first** seen: b, a, n. Each later sighting only bumps the count.',
        },
        {
          type: 'blanks',
          prompt: 'Count the events so the program prints `{\'view\': 2, \'buy\': 1}`.',
          code: py`
            events = ["view", "buy", "view"]
            counts = {}
            for e in events:
                counts[e] = counts.___(e, ___) + 1
            print(counts)
          `,
          bank: ['get', '0', 'pop', '1', 'None', 'count'],
          answer: ['get', '0'],
          tests: [{ stdout: "{'view': 2, 'buy': 1}\n" }],
          explain: 'A new key starts at 0, and adding 1 makes it 1. A default of 1 would count every first sighting twice, and `None + 1` is a TypeError.',
        },
        {
          type: 'code',
          title: 'Word frequencies',
          prompt: md`
            Write \`word_counts(text)\` that returns a dict mapping each word to how often it appears. Words are separated by whitespace, case doesn't matter (count them lower-case), and the punctuation \`.,!?\` at either end of a word is removed. Skip anything that becomes empty.

            \`\`\`python
            word_counts("Data is big. Big data!")
            # {"data": 2, "is": 1, "big": 2}
            \`\`\`
          `,
          starter: 'def word_counts(text):\n    pass\n',
          solution: py`
            def word_counts(text):
                counts = {}
                for word in text.lower().split():
                    word = word.strip(".,!?")
                    if word:
                        counts[word] = counts.get(word, 0) + 1
                return counts
          `,
          tests: [
            { call: 'word_counts("Data is big. Big data!")', expect: '{"data": 2, "is": 1, "big": 2}' },
            { call: 'word_counts("")', expect: '{}' },
            { call: 'word_counts("Hi hi HI")', expect: '{"hi": 3}', hidden: true },
            { call: 'word_counts("wait ... what?")', expect: '{"wait": 1, "what": 1}', hidden: true },
            { call: 'word_counts("end.")', expect: '{"end": 1}', hidden: true },
          ],
          hints: [
            'Lower-case the text and `split()` it.',
            'Clean each word with `word.strip(".,!?")` and skip it if it\'s now `""`.',
            '`counts[word] = counts.get(word, 0) + 1`',
          ],
          wrong: [
            py`
              def word_counts(text):
                  counts = {}
                  for word in text.split():
                      word = word.strip(".,!?")
                      if word:
                          counts[word] = counts.get(word, 0) + 1
                  return counts
            `,
            py`
              def word_counts(text):
                  counts = {}
                  for word in text.lower().split():
                      counts[word] = counts.get(word, 0) + 1
                  return counts
            `,
            py`
              def word_counts(text):
                  counts = {}
                  for word in text.lower().split():
                      word = word.strip(".,!?")
                      counts[word] = counts.get(word, 0) + 1
                  return counts
            `,
          ],
          explain: 'Normalise → tokenise → count: the start of every text-analytics pipeline, from search engines to sentiment models. Without the empty check, "..." would be counted as the word "". The tokenisation rules change the numbers a lot, so always state them.',
        },
        {
          type: 'learn',
          title: 'Grouping into lists',
          body: md`
            Grouping collects the items that share a key into a **list per key**: orders per customer, users per country. The pattern: make sure the key has a list, then append.

            \`groups.setdefault(key, []).append(item)\`

            \`setdefault(key, default)\` returns the value for \`key\`. If the key is missing, it first inserts \`default\`. So the first sighting of a country creates the empty list, and every call returns the list to append to.
          `,
          code: py`
            users = [("ada", "UK"), ("bob", "US"), ("cy", "UK")]
            by_country = {}
            for name, country in users:
                by_country.setdefault(country, []).append(name)
            print(by_country)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            groups = {}
            for n in [1, 2, 3, 4, 5]:
                key = "even" if n % 2 == 0 else "odd"
                groups.setdefault(key, []).append(n)
            print(groups)
            print(groups.setdefault("odd", []))
          `,
          answer: "{'odd': [1, 3, 5], 'even': [2, 4]}\n[1, 3, 5]",
          explain: 'When the key already exists, `setdefault` ignores the default and returns the existing list. It never overwrites.',
        },
        {
          type: 'code',
          title: 'Orders per customer',
          prompt: md`
            \`orders\` is a list of \`(customer, order_id)\` tuples. Write \`orders_by_customer(orders)\` that returns a dict mapping each customer to the list of their order ids, in the original order.

            \`\`\`python
            orders_by_customer([("ada", 1), ("bob", 2), ("ada", 3)])
            # {"ada": [1, 3], "bob": [2]}
            \`\`\`
          `,
          starter: 'def orders_by_customer(orders):\n    pass\n',
          solution: py`
            def orders_by_customer(orders):
                groups = {}
                for customer, oid in orders:
                    groups.setdefault(customer, []).append(oid)
                return groups
          `,
          tests: [
            { call: 'orders_by_customer([("ada", 1), ("bob", 2), ("ada", 3)])', expect: '{"ada": [1, 3], "bob": [2]}' },
            { call: 'orders_by_customer([])', expect: '{}' },
            { call: 'orders_by_customer([("cy", 7)])', expect: '{"cy": [7]}', hidden: true },
            { call: 'orders_by_customer([("a", 1), ("b", 2), ("a", 3), ("c", 4), ("b", 5), ("a", 6)])', hidden: true },
          ],
          hints: [
            'Unpack each tuple in the `for`: `for customer, oid in orders:`.',
            '`groups.setdefault(customer, []).append(oid)`',
          ],
          wrong: [
            py`
              def orders_by_customer(orders):
                  groups = {}
                  for customer, oid in orders:
                      groups[customer] = [oid]
                  return groups
            `,
            py`
              def orders_by_customer(orders):
                  groups = {}
                  for customer, oid in orders:
                      groups[customer] = groups.get(customer, 0) + 1
                  return groups
            `,
          ],
          explain: 'This is SQL\'s `GROUP BY customer`, done in one O(n) pass. Once the rows are grouped, any per-group statistic (count, sum, first order, last order) is a short loop over each list.',
        },
        {
          type: 'learn',
          title: 'Counter and defaultdict',
          body: md`
            The \`collections\` module has pro versions of both patterns:

            - \`Counter(items)\` counts in one line. Missing keys read as 0, and \`.most_common(n)\` returns the top \`n\` \`(item, count)\` pairs, highest first (ties keep first-seen order).
            - \`defaultdict(list)\` creates an empty list the first time you touch a missing key, so grouping is just \`groups[key].append(x)\`. \`defaultdict(int)\` starts counts at 0.

            Careful: with a defaultdict, even *reading* a missing key inserts it.
          `,
          code: py`
            from collections import Counter, defaultdict
            c = Counter("mississippi")
            print(c.most_common(2), c["z"])

            groups = defaultdict(list)
            for word in ["apple", "avocado", "banana"]:
                groups[word[0]].append(word)
            print(dict(groups))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            from collections import Counter
            c = Counter(["DE", "US", "DE", "FR", "US", "DE"])
            print(c.most_common(2))
          `,
          options: ["[('DE', 3), ('US', 2)]", "[('DE', 3)]", "['DE', 'US']", "{'DE': 3, 'US': 2}"],
          answer: 0,
          checkOutput: true,
          explain: '`most_common(n)` returns a **list of tuples**, sorted by count, highest first. It\'s the one-liner for "top 10 countries / pages / errors".',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            from collections import defaultdict
            d = defaultdict(int)
            if d["x"] == 0:
                d["y"] += 1
            print(len(d), dict(d))
          `,
          options: ["2 {'x': 0, 'y': 1}", "1 {'y': 1}", "KeyError: 'x'", "1 {'x': 0}"],
          answer: 0,
          checkOutput: true,
          explain: 'Just *reading* `d["x"]` created the key with the default 0. With a defaultdict, check membership with `"x" in d` when you don\'t want that side effect.',
        },
        {
          type: 'code',
          title: 'Top status codes',
          prompt: md`
            \`lines\` is a list of log lines in the \`server.log\` format, where the status code is the **third field from the end**:

            \`\`\`
            ... "GET /api HTTP/1.1" 404 512 0.031
            \`\`\`

            Write \`top_statuses(lines, n)\` that returns the \`n\` most common status codes as \`(status, count)\` pairs, most common first, using a \`Counter\`. Keep the status codes as strings.
          `,
          starter: 'from collections import Counter\n\ndef top_statuses(lines, n):\n    pass\n',
          solution: py`
            from collections import Counter

            def top_statuses(lines, n):
                c = Counter()
                for line in lines:
                    status = line.split()[-3]
                    c[status] += 1
                return c.most_common(n)
          `,
          setup: py`
            def _line(status, path="/"):
                return ('1.2.3.4 - - [12/Nov/2025:09:00:00 +0000] "GET '
                        + path + ' HTTP/1.1" ' + status + ' 100 0.010')
            LINES = []
            for _s in ["404", "200", "404", "500", "404", "200"]:
                LINES.append(_line(_s))
            MORE = []
            for _i in range(50):
                MORE.append(_line(["503", "200", "404", "503", "301"][_i % 5], "/p" + str(_i)))
          `,
          tests: [
            { call: 'top_statuses(LINES, 2)', expect: '[("404", 3), ("200", 2)]', name: 'six lines: three 404s, two 200s, one 500' },
            { call: 'top_statuses([], 3)', expect: '[]' },
            { call: 'top_statuses(LINES, 10)', expect: '[("404", 3), ("200", 2), ("500", 1)]', hidden: true },
            { call: 'top_statuses(MORE, 3)', hidden: true },
            { call: 'top_statuses(LINES, 0)', expect: '[]', hidden: true },
          ],
          hints: [
            '`line.split()[-3]` is the status field.',
            'Count with `c[status] += 1` (a Counter starts at 0), then `return c.most_common(n)`.',
          ],
          wrong: [
            py`
              from collections import Counter

              def top_statuses(lines, n):
                  c = Counter()
                  for line in lines:
                      c[line.split()[-2]] += 1
                  return c.most_common(n)
            `,
            py`
              from collections import Counter

              def top_statuses(lines, n):
                  c = Counter()
                  for line in lines:
                      c[line.split()[-3]] += 1
                  return sorted(c.items())[:n]
            `,
          ],
          explain: '`Counter` is a dict subclass, so everything you know about dicts still applies. Counting from the end (`[-3]`) is robust here because the request part in the middle can contain spaces. "Top error codes in the last hour" is the first query every on-call engineer runs.',
        },
        {
          type: 'code',
          title: 'Category report',
          prompt: md`
            \`orders\` is a list of \`(category, amount)\` tuples. Write \`category_report(orders)\` that returns a dict mapping each category to a tuple \`(number_of_orders, total_amount)\`, with the total rounded to 2 decimals. Categories appear in the order they first occur.

            \`\`\`python
            category_report([("Books", 12.5), ("Toys", 30), ("Books", 7.5)])
            # {"Books": (2, 20.0), "Toys": (1, 30.0)}
            \`\`\`
          `,
          starter: 'def category_report(orders):\n    pass\n',
          solution: py`
            from collections import defaultdict

            def category_report(orders):
                counts = defaultdict(int)
                totals = defaultdict(float)
                for cat, amount in orders:
                    counts[cat] += 1
                    totals[cat] += amount
                report = {}
                for cat in counts:
                    total = round(totals[cat], 2)
                    report[cat] = (counts[cat], total)
                return report
          `,
          tests: [
            { call: 'category_report([("Books", 12.5), ("Toys", 30), ("Books", 7.5)])', expect: '{"Books": (2, 20.0), "Toys": (1, 30.0)}' },
            { call: 'category_report([])', expect: '{}' },
            { call: 'category_report([("A", 0.1), ("A", 0.2)])', expect: '{"A": (2, 0.3)}', hidden: true },
            { call: 'category_report([("Home", 5), ("Toys", 1), ("Home", 2.25), ("Grocery", 3), ("Toys", 4)])', hidden: true },
          ],
          hints: [
            'Keep two running dicts: one for counts, one for totals (`defaultdict(int)` and `defaultdict(float)` help).',
            'At the end, build the result: `report[cat] = (counts[cat], round(totals[cat], 2))`.',
          ],
          wrong: [
            py`
              def category_report(orders):
                  report = {}
                  for cat, amount in orders:
                      n, total = report.get(cat, (0, 0))
                      report[cat] = [n + 1, round(total + amount, 2)]
                  return report
            `,
            py`
              def category_report(orders):
                  report = {}
                  for cat, amount in orders:
                      n, total = report.get(cat, (0, 0))
                      report[cat] = (n + 1, amount)
                  return report
            `,
          ],
          explain: 'This is `GROUP BY category` with `COUNT(*)` and `SUM(amount)`. Keeping one accumulator per statistic is the shape of every aggregation engine, from pandas `groupby().agg()` to Spark. Round only at the end, so rounding errors don\'t pile up.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u06-l4',
      title: 'Records & Nested Data',
      summary: 'Lists of dicts, nested JSON-like data and safe access.',
      steps: [
        {
          type: 'learn',
          title: 'Rows as dicts',
          body: md`
            Data from APIs (JSON) and CSV readers usually arrives as a **list of dicts**: one dict per row, with column names as keys.

            \`order["amount"]\` explains itself, much better than \`order[2]\`. Loop over the rows to filter and aggregate, like SQL's \`WHERE\` and \`SUM\`.
          `,
          code: py`
            orders = [
                {"id": 1, "user": "ada", "amount": 30.0},
                {"id": 2, "user": "bob", "amount": 12.5},
                {"id": 3, "user": "ada", "amount": 7.5},
            ]
            total = 0
            for o in orders:
                if o["user"] == "ada":
                    total += o["amount"]
            print(total)
            print(orders[1]["user"])
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            rows = [{"name": "ada", "age": 36},
                    {"name": "bob", "age": 25}]
            print(rows[1]["name"], len(rows))
            print(rows[0]["age"] + rows[1]["age"])
          `,
          answer: 'bob 2\n61',
          explain: 'First pick the row by position, then the field by key. `len(rows)` counts rows, not fields.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            orders = [
                {"amount": 20, "status": "completed"},
                {"amount": 50, "status": "cancelled"},
                {"amount": 15, "status": "completed"},
            ]
            total = 0
            for o in orders:
                if o["status"] == "completed":
                    total += o["amount"]
            print(total)
          `,
          options: ['35', '85', '50', '20'],
          answer: 0,
          checkOutput: true,
          explain: 'Only the completed orders count: 20 + 15. Filtering before aggregating is the bread and butter of every revenue report.',
        },
        {
          type: 'code',
          title: 'Completed revenue',
          prompt: md`
            \`orders\` is a list of dicts with the keys \`"unit_price"\`, \`"quantity"\` and \`"status"\`. Write \`completed_revenue(orders)\` that returns the total revenue (unit price × quantity) of the orders whose status is \`"completed"\`, rounded to 2 decimals.

            \`\`\`python
            completed_revenue([
                {"unit_price": 10.0, "quantity": 2,
                 "status": "completed"},
                {"unit_price": 99.0, "quantity": 1,
                 "status": "returned"},
            ])  # 20.0
            \`\`\`
          `,
          starter: 'def completed_revenue(orders):\n    pass\n',
          solution: py`
            def completed_revenue(orders):
                total = 0
                for o in orders:
                    if o["status"] == "completed":
                        total += o["unit_price"] * o["quantity"]
                return round(total, 2)
          `,
          setup: py`
            ORDERS = [
                {"unit_price": 19.99, "quantity": 3, "status": "completed"},
                {"unit_price": 5.0, "quantity": 1, "status": "cancelled"},
                {"unit_price": 120.0, "quantity": 1, "status": "returned"},
                {"unit_price": 2.5, "quantity": 4, "status": "completed"},
                {"unit_price": 7.25, "quantity": 2, "status": "completed"},
            ]
          `,
          tests: [
            {
              call: 'completed_revenue([{"unit_price": 10.0, "quantity": 2, "status": "completed"}, {"unit_price": 99.0, "quantity": 1, "status": "returned"}])',
              expect: '20.0',
              name: 'the example from the prompt',
            },
            { call: 'completed_revenue([])', expect: '0' },
            { call: 'completed_revenue(ORDERS)', expect: '84.47', name: 'five orders, three completed', hidden: true },
            { call: 'completed_revenue(ORDERS[1:3])', expect: '0', name: 'no completed orders', hidden: true },
          ],
          hints: [
            'Loop over the rows and skip any whose `o["status"]` isn\'t `"completed"`.',
            'Add `o["unit_price"] * o["quantity"]`, and round once at the end.',
          ],
          wrong: [
            py`
              def completed_revenue(orders):
                  total = 0
                  for o in orders:
                      if o["status"] == "completed":
                          total += o["unit_price"]
                  return round(total, 2)
            `,
            py`
              def completed_revenue(orders):
                  total = 0
                  for o in orders:
                      if o["status"] != "cancelled":
                          total += o["unit_price"] * o["quantity"]
                  return round(total, 2)
            `,
          ],
          explain: '"Not cancelled" isn\'t "completed": returned orders would sneak into the revenue. Define metrics by what you **include**, not by what you exclude, because new statuses appear over time. You\'ll write this same query in pandas (Unit 12) and SQL (Unit 15).',
        },
        {
          type: 'learn',
          title: 'Filter, pick, sort rows',
          body: md`
            Typical row jobs:
            - **filter**: keep the rows matching a condition
            - **pick** a field: collect \`row["email"]\` from each row
            - **sort** rows by a field with a small key function: \`def by_age(u): return u["age"]\`, then \`sorted(users, key=by_age)\`

            These are SQL's \`WHERE\`, \`SELECT\` and \`ORDER BY\`. pandas does the same on millions of rows (Unit 12).
          `,
          code: py`
            users = [
                {"name": "ada", "age": 36, "plan": "pro"},
                {"name": "bob", "age": 25, "plan": "free"},
                {"name": "cy", "age": 41, "plan": "pro"},
            ]

            def by_age(u):
                return u["age"]

            pros = []
            for u in users:
                if u["plan"] == "pro":
                    pros.append(u["name"])
            print(pros)
            print(max(users, key=by_age)["name"])
          `,
        },
        {
          type: 'blanks',
          prompt: 'Find the youngest user, so the program prints `bob`.',
          code: py`
            users = [{"name": "ada", "age": 36},
                     {"name": "bob", "age": 25}]

            def by_age(u):
                return u["age"]

            youngest = sorted(users, key=___)[0]
            print(youngest["name"])
          `,
          bank: ['by_age', 'by_age()', '"age"', 'u["age"]', 'len'],
          answer: ['by_age'],
          tests: [{ stdout: 'bob\n' }],
          explain: '`key` needs a function that turns a row into the value to sort by. A string like `"age"` isn\'t callable, and `len` would compare the number of fields (2 for both). (`min(users, key=by_age)` is the O(n) way to get just the youngest.)',
        },
        {
          type: 'code',
          title: 'Emails for a plan',
          prompt: md`
            \`users\` is a list of dicts with \`"email"\`, \`"plan"\` and \`"active"\` (True/False). Write \`emails_for(users, plan)\` that returns the emails of the **active** users on \`plan\`, sorted alphabetically.

            \`\`\`python
            users = [
                {"email": "cy@x.io", "plan": "pro", "active": True},
                {"email": "ada@x.io", "plan": "pro", "active": True},
                {"email": "bob@x.io", "plan": "pro", "active": False},
            ]
            emails_for(users, "pro")  # ["ada@x.io", "cy@x.io"]
            \`\`\`
          `,
          starter: 'def emails_for(users, plan):\n    pass\n',
          solution: py`
            def emails_for(users, plan):
                emails = []
                for u in users:
                    if u["plan"] == plan and u["active"]:
                        emails.append(u["email"])
                return sorted(emails)
          `,
          setup: py`
            USERS = [
                {"email": "cy@x.io", "plan": "pro", "active": True},
                {"email": "ada@x.io", "plan": "pro", "active": True},
                {"email": "bob@x.io", "plan": "pro", "active": False},
            ]
            MORE = [
                {"email": "zoe@y.com", "plan": "team", "active": True},
                {"email": "max@y.com", "plan": "free", "active": True},
                {"email": "ann@y.com", "plan": "team", "active": True},
                {"email": "kim@y.com", "plan": "team", "active": False},
                {"email": "eve@y.com", "plan": "pro", "active": True},
            ]
          `,
          tests: [
            { call: 'emails_for(USERS, "pro")', expect: '["ada@x.io", "cy@x.io"]', name: 'the example users, plan "pro"' },
            { call: 'emails_for(USERS, "team")', expect: '[]', name: 'no users on "team"' },
            { call: 'emails_for(MORE, "team")', expect: '["ann@y.com", "zoe@y.com"]', hidden: true },
            { call: 'emails_for([], "pro")', expect: '[]', hidden: true },
          ],
          hints: [
            'Two conditions in one `if`: the plan matches **and** the user is active.',
            'Collect the emails in a list and return `sorted(...)` of it.',
          ],
          wrong: [
            py`
              def emails_for(users, plan):
                  emails = []
                  for u in users:
                      if u["plan"] == plan:
                          emails.append(u["email"])
                  return sorted(emails)
            `,
            py`
              def emails_for(users, plan):
                  emails = []
                  for u in users:
                      if u["plan"] == plan and u["active"]:
                          emails.append(u["email"])
                  return emails
            `,
          ],
          explain: 'Filter (`WHERE plan = ... AND active`), pick (`SELECT email`), sort (`ORDER BY email`). Since `u["active"]` is already a bool, `and u["active"]` reads naturally; no `== True` needed.',
        },
        {
          type: 'learn',
          title: 'Nested dicts',
          body: md`
            Values can be dicts themselves. That's how JSON nests data: a user has settings, and settings have notification preferences. Chain the lookups: \`user["settings"]["theme"]\`.

            Each \`[ ]\` steps one level down. If a key is missing at any level you get a KeyError, and the message shows only the missing key, not where in the structure it was.
          `,
          code: py`
            user = {
                "name": "ada",
                "settings": {
                    "theme": "dark",
                    "notify": {"email": True, "sms": False},
                },
            }
            print(user["settings"]["theme"])
            print(user["settings"]["notify"]["sms"])
            user["settings"]["theme"] = "light"
            print(user["settings"]["theme"])
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            cfg = {"db": {"host": "localhost", "port": 5432},
                   "debug": False}
            print(cfg["db"]["port"] + 1)
            print(len(cfg), len(cfg["db"]))
          `,
          answer: '5433\n2 2',
          explain: 'The outer dict has 2 keys ("db" and "debug"), and so does the inner one ("host" and "port"). `len` only counts one level.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            cfg = {"db": {"host": "localhost"}}
            print(cfg["db"]["port"])
          `,
          options: ["KeyError: 'port'", "KeyError: 'db'", 'None', "TypeError: 'dict' object is not subscriptable"],
          answer: 0,
          checkOutput: true,
          explain: '`cfg["db"]` works and returns the inner dict, which has no "port". The error names only the key that failed.',
        },
        {
          type: 'learn',
          title: 'Safe nested access',
          body: md`
            Real JSON is often incomplete: some users have no \`settings\` at all. \`get\` with an **empty dict** as the default keeps the chain going:

            \`user.get("settings", {}).get("theme", "light")\`

            For deep paths, walk a **list of keys** in a loop, one level per step, and stop early when a key is missing. Libraries call this "dig" or "get_in".
          `,
          code: py`
            users = [
                {"name": "ada", "settings": {"theme": "dark"}},
                {"name": "bob"},
            ]
            for u in users:
                s = u.get("settings", {})
                print(u["name"], s.get("theme", "light"))
          `,
        },
        {
          type: 'code',
          title: 'Dig into nested data',
          prompt: md`
            Write \`get_path(data, path, default)\` that follows the keys in the list \`path\` down through nested dicts and returns the value it finds, or \`default\` if any key along the way is missing. An empty path returns \`data\` itself. Every value you step into is a dict.

            \`\`\`python
            cfg = {"db": {"primary": {"port": 5432}}}
            get_path(cfg, ["db", "primary", "port"], 0)  # 5432
            get_path(cfg, ["db", "replica", "port"], 0)  # 0
            \`\`\`
          `,
          starter: 'def get_path(data, path, default):\n    pass\n',
          solution: py`
            def get_path(data, path, default):
                current = data
                for key in path:
                    if key not in current:
                        return default
                    current = current[key]
                return current
          `,
          setup: 'CFG = {"db": {"primary": {"port": 5432, "host": "db1"}}, "debug": False, "tags": {}}',
          tests: [
            { call: 'get_path(CFG, ["db", "primary", "port"], 0)', expect: '5432' },
            { call: 'get_path(CFG, ["db", "replica", "port"], 0)', expect: '0' },
            { call: 'get_path(CFG, [], None)', expect: 'CFG', name: 'empty path returns the data', hidden: true },
            { call: 'get_path(CFG, ["debug"], True)', expect: 'False', name: 'a stored False is a real value', hidden: true },
            { call: 'get_path(CFG, ["tags", "x"], "none")', expect: '"none"', hidden: true },
            { call: 'get_path(CFG, ["db"], None)', expect: '{"primary": {"port": 5432, "host": "db1"}}', hidden: true },
          ],
          hints: [
            'Keep a `current` variable that starts at `data` and steps one level down per key.',
            'Before each step, check `key not in current` and return `default` right away.',
          ],
          wrong: [
            py`
              def get_path(data, path, default):
                  current = data
                  for key in path:
                      current = current.get(key, default)
                  return current
            `,
            py`
              def get_path(data, path, default):
                  current = data
                  for key in path:
                      if not current.get(key):
                          return default
                      current = current[key]
                  return current
            `,
          ],
          explain: 'Return as soon as a key is missing: continuing with the default would try to step *into* the default. And test membership with `in`, not truthiness, because `False`, `0` and `""` are real stored values. Treating them as "missing" is a classic config bug ("debug is off… so use the default: on!").',
        },
        {
          type: 'code',
          title: 'Per-user summary',
          prompt: md`
            \`orders\` is a list of dicts with \`"user"\` and \`"amount"\` keys. Write \`user_summary(orders)\` that returns a nested dict: for each user, \`{"orders": count, "revenue": total}\`, with revenue rounded to 2 decimals.

            \`\`\`python
            user_summary([
                {"user": "ada", "amount": 30.0},
                {"user": "bob", "amount": 12.5},
                {"user": "ada", "amount": 7.25},
            ])
            # {"ada": {"orders": 2, "revenue": 37.25},
            #  "bob": {"orders": 1, "revenue": 12.5}}
            \`\`\`
          `,
          starter: 'def user_summary(orders):\n    pass\n',
          solution: py`
            def user_summary(orders):
                summary = {}
                for o in orders:
                    u = o["user"]
                    if u not in summary:
                        summary[u] = {"orders": 0, "revenue": 0}
                    summary[u]["orders"] += 1
                    summary[u]["revenue"] += o["amount"]
                for u in summary:
                    r = summary[u]["revenue"]
                    summary[u]["revenue"] = round(r, 2)
                return summary
          `,
          tests: [
            {
              call: 'user_summary([{"user": "ada", "amount": 30.0}, {"user": "bob", "amount": 12.5}, {"user": "ada", "amount": 7.25}])',
              expect: '{"ada": {"orders": 2, "revenue": 37.25}, "bob": {"orders": 1, "revenue": 12.5}}',
              name: 'the example from the prompt',
            },
            { call: 'user_summary([])', expect: '{}' },
            {
              call: 'user_summary([{"user": "x", "amount": 0.1}, {"user": "x", "amount": 0.2}])',
              expect: '{"x": {"orders": 2, "revenue": 0.3}}',
              hidden: true,
            },
            {
              call: 'user_summary([{"user": "a", "amount": 1}, {"user": "b", "amount": 2}, {"user": "c", "amount": 3}, {"user": "a", "amount": 4}])',
              hidden: true,
            },
          ],
          hints: [
            'The first time you see a user, give them a fresh `{"orders": 0, "revenue": 0}`.',
            'Then update both fields: `summary[u]["orders"] += 1` and add the amount to the revenue.',
            'Round the revenues in a second loop at the end.',
          ],
          wrong: [
            py`
              def user_summary(orders):
                  empty = {"orders": 0, "revenue": 0}
                  summary = {}
                  for o in orders:
                      u = o["user"]
                      if u not in summary:
                          summary[u] = empty
                      summary[u]["orders"] += 1
                      summary[u]["revenue"] += o["amount"]
                  return summary
            `,
            py`
              def user_summary(orders):
                  summary = {}
                  for o in orders:
                      summary[o["user"]] = {"orders": 1, "revenue": o["amount"]}
                  return summary
            `,
          ],
          explain: 'Watch the first wrong answer: every user gets the **same** `empty` dict object, so all their stats are added into one shared dict. That\'s Unit 5\'s aliasing bug in disguise. The literal `{"orders": 0, "revenue": 0}` inside the loop creates a new dict each time it runs.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u06-l5',
      title: 'Sets',
      summary: 'Unique values, fast membership and set algebra for analytics.',
      steps: [
        {
          type: 'learn',
          title: 'Sets: unique values',
          body: md`
            A **set** is an unordered collection of **unique** items: \`{3, 1, 2}\`. Duplicates vanish automatically, so \`set(lst)\` is the one-line dedupe, and \`len\` counts distinct values.

            - \`x in s\`: an O(1) membership test, like dict keys
            - \`s.add(x)\`, \`s.discard(x)\` (no error if missing), \`s.remove(x)\` (KeyError if missing)
            - no indexing and no order: use \`sorted(s)\` for predictable output

            \`{}\` is an empty **dict**. An empty set is \`set()\`.
          `,
          code: py`
            visits = ["ada", "bob", "ada", "cy", "bob"]
            unique = set(visits)
            print(len(unique), sorted(unique))
            unique.add("dee")
            unique.discard("zed")
            print("ada" in unique, len(unique))
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            s = set([3, 1, 3, 2, 1])
            print(len(s), sorted(s))
            s.add(2)
            s.add(9)
            print(len(s))
          `,
          answer: '3 [1, 2, 3]\n4',
          explain: 'The duplicates are dropped on creation. Adding 2 again does nothing, since it\'s already there; 9 is new.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: 'print(type({}), type(set()))',
          options: ["<class 'dict'> <class 'set'>", "<class 'set'> <class 'set'>", "<class 'set'> <class 'dict'>", "<class 'dict'> <class 'dict'>"],
          answer: 0,
          checkOutput: true,
          explain: 'Dicts got the curly braces first, so `{}` means an empty dict. `{1, 2}` with items is a set, but the empty set must be written `set()`.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            tags = {"py", "sql"}
            tags.discard("go")
            tags.remove("go")
          `,
          options: ["KeyError: 'go'", 'Nothing, both are silent', 'ValueError: list.remove(x): x not in list', "AttributeError: 'set' object has no attribute 'remove'"],
          answer: 0,
          checkOutput: true,
          explain: '`discard` quietly ignores a missing item, while `remove` raises a KeyError, just like a missing dict key.',
        },
        {
          type: 'learn',
          title: 'Set algebra',
          body: md`
            - \`a | b\`, **union**: in either set
            - \`a & b\`, **intersection**: in both
            - \`a - b\`, **difference**: in \`a\` but not in \`b\`
            - \`a ^ b\`, **symmetric difference**: in exactly one of them

            Each also exists as a method (\`a.union(b)\`, \`a.intersection(b)\`, …). \`a <= b\` asks "is \`a\` a subset of \`b\`?". These run in time proportional to the set sizes, with no nested loops.
          `,
          code: py`
            mon = {"ada", "bob", "cy"}
            tue = {"bob", "cy", "dee"}
            print(sorted(mon | tue))
            print(sorted(mon & tue))
            print(sorted(mon - tue), sorted(tue - mon))
            print(sorted(mon ^ tue))
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            a = {1, 2, 3}
            b = {2, 3, 4}
            print(sorted(a & b), sorted(a - b))
            print(sorted(a ^ b), {1, 2} <= a)
          `,
          answer: '[2, 3] [1]\n[1, 4] True',
          explain: '2 and 3 are shared. 1 is only in `a`, 4 only in `b`, so the symmetric difference is {1, 4}. Every item of {1, 2} is in `a`, so it\'s a subset.',
        },
        {
          type: 'blanks',
          prompt: 'Find the users active on both days, and those who churned (active Monday, gone Tuesday).',
          code: py`
            mon = {"ada", "bob", "cy"}
            tue = {"bob", "cy", "dee"}
            both = mon ___ tue
            churned = mon ___ tue
            print(sorted(both), sorted(churned))
          `,
          bank: ['&', '-', '|', '^', '+'],
          answer: ['&', '-'],
          tests: [{ stdout: "['bob', 'cy'] ['ada']\n" }],
          explain: 'Intersection gives "in both", difference gives "in the first but not the second". Sets have no `+`: use `|` for a union.',
        },
        {
          type: 'code',
          title: 'Unique visitors',
          prompt: md`
            \`events\` is a list of \`(user_id, page)\` tuples. Write \`unique_visitors(events, page)\` that returns how many **different** users viewed \`page\`.

            \`\`\`python
            events = [(1, "/home"), (2, "/home"),
                      (1, "/home"), (1, "/cart")]
            unique_visitors(events, "/home")  # 2
            \`\`\`
          `,
          starter: 'def unique_visitors(events, page):\n    pass\n',
          solution: py`
            def unique_visitors(events, page):
                users = set()
                for user, p in events:
                    if p == page:
                        users.add(user)
                return len(users)
          `,
          tests: [
            { call: 'unique_visitors([(1, "/home"), (2, "/home"), (1, "/home"), (1, "/cart")], "/home")', expect: '2' },
            { call: 'unique_visitors([], "/")', expect: '0' },
            { call: 'unique_visitors([(1, "/a"), (2, "/b")], "/c")', expect: '0', hidden: true },
            { call: 'unique_visitors([(3, "/a"), (3, "/a"), (3, "/a")], "/a")', expect: '1', hidden: true },
            { call: 'unique_visitors([(1, "/x"), (2, "/y"), (3, "/x"), (2, "/x"), (1, "/x")], "/x")', expect: '3', hidden: true },
          ],
          hints: [
            'Start with `users = set()` (not `{}`).',
            'Add the user for every event on the page, then return `len(users)`.',
          ],
          wrong: [
            py`
              def unique_visitors(events, page):
                  count = 0
                  for user, p in events:
                      if p == page:
                          count += 1
                  return count
            `,
            py`
              def unique_visitors(events, page):
                  users = set()
                  for user, p in events:
                      users.add(user)
                  return len(users)
            `,
          ],
          explain: '"Page views" counts events; "unique visitors" counts distinct users. Mixing them up is the classic analytics blunder. At web scale, exact distinct counts need a lot of memory, so systems use approximations like HyperLogLog (`APPROX_COUNT_DISTINCT` in BigQuery).',
        },
        {
          type: 'learn',
          title: 'Analytics with sets',
          body: md`
            Product analytics questions are often set algebra in disguise:
            - **retained**: active yesterday **and** today → \`day1 & day2\`
            - **churned**: active yesterday but not today → \`day1 - day2\`
            - **new**: active today but not yesterday → \`day2 - day1\`

            And here is the O(n) dedupe that keeps order: track a \`seen\` set and append an item only if it isn't in \`seen\` yet. Each check is now O(1), instead of O(n) for Unit 5's list version.
          `,
          code: py`
            items = ["b", "a", "b", "c", "a"]
            seen = set()
            result = []
            for x in items:
                if x not in seen:
                    seen.add(x)
                    result.append(x)
            print(result)
          `,
        },
        {
          type: 'code',
          title: 'Retention',
          prompt: md`
            \`day1\` and \`day2\` list the user ids that were active on two consecutive days (with duplicates, since users visit several times). Write \`retention(day1, day2)\` that returns a tuple \`(retained, churned, new)\` of **counts**:
            - retained: active on both days
            - churned: active on day 1 only
            - new: active on day 2 only

            \`\`\`python
            retention([1, 2, 2, 3], [2, 3, 3, 4, 5])  # (2, 1, 2)
            \`\`\`
          `,
          starter: 'def retention(day1, day2):\n    pass\n',
          solution: py`
            def retention(day1, day2):
                a = set(day1)
                b = set(day2)
                return len(a & b), len(a - b), len(b - a)
          `,
          tests: [
            { call: 'retention([1, 2, 2, 3], [2, 3, 3, 4, 5])', expect: '(2, 1, 2)' },
            { call: 'retention([], [])', expect: '(0, 0, 0)' },
            { call: 'retention([1, 1], [1])', expect: '(1, 0, 0)', hidden: true },
            { call: 'retention([1, 2], [])', expect: '(0, 2, 0)', hidden: true },
            { call: 'retention([], [7, 7, 8])', expect: '(0, 0, 2)', hidden: true },
          ],
          hints: [
            'Convert both lists to sets first, which removes the duplicates.',
            'Then it\'s `&`, `-` and `-` the other way round, each wrapped in `len()`.',
          ],
          wrong: [
            py`
              def retention(day1, day2):
                  a = set(day1)
                  b = set(day2)
                  return len(a & b), len(b - a), len(a - b)
            `,
            py`
              def retention(day1, day2):
                  retained = 0
                  for u in day1:
                      if u in day2:
                          retained += 1
                  churned = len(day1) - retained
                  new = len(day2) - retained
                  return retained, churned, new
            `,
          ],
          explain: 'Counting over the raw lists counts *visits*, not *users*: user 2 would be "retained" twice. Deduplicate to the right grain first. Day-over-day retention and churn are the core metrics of every subscription business, and in SQL they\'re a join on user id between two days.',
        },
        {
          type: 'code',
          title: 'Fast dedupe',
          prompt: md`
            Write \`dedupe(items)\` that removes duplicates, keeping the first occurrence of each item in its original order, in **O(n)** time. It must handle tens of thousands of items instantly, so Unit 5's list version is too slow here.

            \`\`\`python
            dedupe(["b", "a", "b", "c", "a"])  # ["b", "a", "c"]
            \`\`\`
          `,
          starter: 'def dedupe(items):\n    pass\n',
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
          setup: 'BIG = list(range(12000)) * 2',
          tests: [
            { call: 'dedupe(["b", "a", "b", "c", "a"])', expect: '["b", "a", "c"]' },
            { call: 'dedupe([])', expect: '[]' },
            { call: 'dedupe([1, 1, 1])', expect: '[1]', hidden: true },
            { call: 'dedupe([3, 2, 1, 3])', expect: '[3, 2, 1]', hidden: true },
            {
              call: 'dedupe(BIG)[-3:]',
              expect: '[11997, 11998, 11999]',
              name: '24,000 items, fast',
              maxMs: 60,
              hidden: true,
            },
          ],
          hints: [
            'Keep two things: a `seen` set for fast checks and a `result` list for the order.',
            'For each item: if it\'s not in `seen`, add it to both.',
          ],
          wrong: [
            py`
              def dedupe(items):
                  result = []
                  for x in items:
                      if x not in result:
                          result.append(x)
                  return result
            `,
            'def dedupe(items):\n    return list(set(items))\n',
            'def dedupe(items):\n    return sorted(set(items))\n',
          ],
          explain: 'The set answers "seen it?" in O(1), the list remembers the order. `list(set(items))` is fast but scrambles the order: sets have none. On 24,000 items the list version does about 200 million comparisons, the set version 24,000 lookups. (`list(dict.fromkeys(items))` is a neat one-line alternative: dicts keep insertion order.)',
        },
        {
          type: 'code',
          title: 'Similar shoppers',
          prompt: md`
            Recommendation systems compare users by what they bought. The **Jaccard similarity** of two sets is the number of shared items divided by the number of distinct items overall: |A ∩ B| / |A ∪ B|.

            Write \`jaccard(a, b)\` for two lists of product ids (duplicates possible), rounded to 3 decimals. If both are empty, return 0.0.

            \`\`\`python
            jaccard(["mug", "pen", "cap"],
                    ["pen", "cap", "hat", "pen"])  # 0.5
            \`\`\`
          `,
          starter: 'def jaccard(a, b):\n    pass\n',
          solution: py`
            def jaccard(a, b):
                sa = set(a)
                sb = set(b)
                union = sa | sb
                if not union:
                    return 0.0
                return round(len(sa & sb) / len(union), 3)
          `,
          tests: [
            { call: 'jaccard(["mug", "pen", "cap"], ["pen", "cap", "hat", "pen"])', expect: '0.5' },
            { call: 'jaccard([], [])', expect: '0.0' },
            { call: 'jaccard([1, 2], [3])', expect: '0.0', hidden: true },
            { call: 'jaccard([1, 2], [2, 1, 1])', expect: '1.0', hidden: true },
            { call: 'jaccard([1, 2, 3], [3])', expect: '0.333', hidden: true },
          ],
          hints: [
            'Convert both lists to sets.',
            'Guard against an empty union, then divide `len(sa & sb)` by `len(sa | sb)`.',
          ],
          wrong: [
            py`
              def jaccard(a, b):
                  shared = 0
                  for x in a:
                      if x in b:
                          shared += 1
                  total = len(a) + len(b) - shared
                  if total == 0:
                      return 0.0
                  return round(shared / total, 3)
            `,
            py`
              def jaccard(a, b):
                  sa = set(a)
                  sb = set(b)
                  return round(len(sa & sb) / len(sa | sb), 3)
            `,
          ],
          explain: '1.0 means identical baskets, 0.0 nothing in common. Duplicates must not count, which is why the sets come first. At scale (millions of users), comparing every pair is impossible, so systems use MinHash to estimate Jaccard similarity: the same set idea, sketched.',
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u06-l6',
      title: 'Choosing the Right Structure',
      summary: 'O(1) lookups, hash joins, two-sum and tuple keys.',
      steps: [
        {
          type: 'learn',
          title: 'Why sets and dicts are fast',
          body: md`
            \`x in some_list\` checks the items one by one: **O(n)**. A million items means up to a million comparisons.

            Sets and dicts **hash** each key: they compute a number from it that says where the key is stored. A lookup jumps straight there: **O(1)** on average, whatever the size.

            | operation | list | set / dict |
            |---|---|---|
            | \`x in c\` | O(n) | O(1) |
            | add an item | O(1) | O(1) |
            | look up by | index | key / value |

            Testing membership inside a loop? Convert to a set first.
          `,
          code: py`
            banned = {"u7", "u9"}
            for user in ["u1", "u9", "u3"]:
                if user in banned:
                    print("blocked", user)
          `,
        },
        {
          type: 'choice',
          prompt: 'You check 1 million incoming user ids against a **list** of 100,000 banned ids, with `if uid in banned`. What is the best fix?',
          options: ['Convert banned to a set once', 'Sort banned before each check', 'Use a while loop instead of for', 'Use banned.count(uid) > 0'],
          answer: 0,
          explain: 'With a list that\'s up to 10¹¹ comparisons; with a set, a million O(1) lookups, after a one-time O(n) conversion. Sorting before every check is even slower, and `count` always scans the whole list.',
        },
        {
          type: 'code',
          title: 'Flag blocked accounts',
          prompt: md`
            Write \`flagged(transactions, blocklist)\` that returns the transactions (in order) whose account id is in \`blocklist\`. Both are lists of account-id strings and both can be large (tens of thousands of items), so it must be fast.

            \`\`\`python
            flagged(["a1", "b2", "a1", "c3"], ["a1", "c3"])
            # ["a1", "a1", "c3"]
            \`\`\`
          `,
          starter: 'def flagged(transactions, blocklist):\n    pass\n',
          solution: py`
            def flagged(transactions, blocklist):
                blocked = set(blocklist)
                result = []
                for t in transactions:
                    if t in blocked:
                        result.append(t)
                return result
          `,
          setup: py`
            TX = []
            for _i in range(30000):
                TX.append("acct" + str(_i % 7919))
            BL = []
            for _i in range(0, 20000, 3):
                BL.append("acct" + str(_i))
          `,
          tests: [
            { call: 'flagged(["a1", "b2", "a1", "c3"], ["a1", "c3"])', expect: '["a1", "a1", "c3"]' },
            { call: 'flagged([], ["a"])', expect: '[]' },
            { call: 'flagged(["x", "y"], [])', expect: '[]', hidden: true },
            { call: 'len(flagged(TX, BL))', name: '30,000 transactions vs 6,667 blocked ids, fast', maxMs: 60, hidden: true },
          ],
          hints: [
            'Build `set(blocklist)` **once**, before the loop.',
            'Then loop over the transactions and keep those `in` the set.',
          ],
          wrong: [
            py`
              def flagged(transactions, blocklist):
                  result = []
                  for t in transactions:
                      if t in blocklist:
                          result.append(t)
                  return result
            `,
            py`
              def flagged(transactions, blocklist):
                  return sorted(set(transactions) & set(blocklist))
            `,
          ],
          explain: 'One O(m) conversion, then n O(1) lookups: O(n + m) instead of O(n × m). Here that\'s ~37,000 operations instead of ~200 million comparisons. The intersection shortcut is fast but loses duplicates and order, and the task wanted every flagged transaction.',
        },
        {
          type: 'learn',
          title: 'A dict as an index: fast joins',
          body: md`
            To combine two datasets, like attaching user names to orders, the naive way scans all users **for every order**: O(n × m). With 1M orders and 100k users that's 10¹¹ steps.

            Instead, build an **index** once: a dict from id to record, O(m). Then each order finds its user in O(1), and the whole join is O(n + m).

            That's a **hash join**, the algorithm databases and Spark use to join big tables.
          `,
          code: py`
            users = [{"id": 1, "name": "ada"},
                     {"id": 2, "name": "bob"}]
            orders = [{"order": 10, "user_id": 2},
                      {"order": 11, "user_id": 1}]
            by_id = {}
            for u in users:
                by_id[u["id"]] = u
            for o in orders:
                print(o["order"], by_id[o["user_id"]]["name"])
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            users = [("u1", "DE"), ("u2", "US")]
            country = {}
            for uid, c in users:
                country[uid] = c
            for uid in ["u2", "u1", "u2"]:
                print(country[uid], end=" ")
          `,
          answer: 'US DE US',
          explain: 'The index is built once; after that every lookup is instant, however many users there are. (The trailing space from `end=" "` doesn\'t matter here.)',
        },
        {
          type: 'code',
          title: 'Join orders to users',
          prompt: md`
            Write \`orders_with_names(orders, users)\` that returns a list of \`(order_id, name)\` tuples, one per order, in order.
            - \`orders\`: list of dicts with \`"id"\` and \`"user_id"\`
            - \`users\`: list of dicts with \`"id"\` and \`"name"\`

            Orders whose user doesn't exist get the name \`"unknown"\` (a left join). Build an index so it runs in O(n + m).

            \`\`\`python
            orders = [{"id": 10, "user_id": 2},
                      {"id": 11, "user_id": 9}]
            users = [{"id": 2, "name": "bob"}]
            orders_with_names(orders, users)
            # [(10, "bob"), (11, "unknown")]
            \`\`\`
          `,
          starter: 'def orders_with_names(orders, users):\n    pass\n',
          solution: py`
            def orders_with_names(orders, users):
                name_of = {}
                for u in users:
                    name_of[u["id"]] = u["name"]
                result = []
                for o in orders:
                    name = name_of.get(o["user_id"], "unknown")
                    result.append((o["id"], name))
                return result
          `,
          setup: py`
            USR = []
            for _i in range(3000):
                USR.append({"id": _i, "name": "user" + str(_i)})
            ORD = []
            for _i in range(8000):
                ORD.append({"id": _i, "user_id": (_i * 7) % 3500})
          `,
          tests: [
            {
              call: 'orders_with_names([{"id": 10, "user_id": 2}, {"id": 11, "user_id": 9}], [{"id": 2, "name": "bob"}])',
              expect: '[(10, "bob"), (11, "unknown")]',
              name: 'the example from the prompt',
            },
            { call: 'orders_with_names([], [])', expect: '[]' },
            {
              call: 'orders_with_names([{"id": 1, "user_id": 5}, {"id": 2, "user_id": 5}], [{"id": 5, "name": "cy"}, {"id": 6, "name": "dee"}])',
              expect: '[(1, "cy"), (2, "cy")]',
              hidden: true,
            },
            { call: 'orders_with_names(ORD, USR)[-3:]', name: '8,000 orders × 3,000 users, fast', maxMs: 40, hidden: true },
          ],
          hints: [
            'First loop: build `name_of[u["id"]] = u["name"]`.',
            'Second loop: `name_of.get(o["user_id"], "unknown")` for each order.',
            'Append a **tuple**: `(o["id"], name)`.',
          ],
          wrong: [
            py`
              def orders_with_names(orders, users):
                  result = []
                  for o in orders:
                      name = "unknown"
                      for u in users:
                          if u["id"] == o["user_id"]:
                              name = u["name"]
                      result.append((o["id"], name))
                  return result
            `,
            py`
              def orders_with_names(orders, users):
                  name_of = {}
                  for u in users:
                      name_of[u["id"]] = u["name"]
                  result = []
                  for o in orders:
                      result.append((o["id"], name_of[o["user_id"]]))
                  return result
            `,
          ],
          explain: 'The nested-loop join compares every order with every user: 24 million comparisons here, and it gets quadratically worse as data grows. The index turns it into 11,000 cheap operations. `.get(..., "unknown")` is what makes it a **left** join: no order disappears just because its user is missing.',
        },
        {
          type: 'learn',
          title: 'Two-sum with a dict',
          body: md`
            The most famous interview question: given \`nums\` and a \`target\`, find two indexes whose values add up to \`target\`.

            Brute force tries every pair: O(n²). The dict trick: walk the list once, remembering each value's index in \`seen\`. For each \`x\`, the partner you need is \`target - x\`. If it's already in \`seen\`, you're done.

            One pass: O(n) time, O(n) memory. Trading memory for speed is the core idea behind most "can you optimise this?" answers.
          `,
          code: py`
            nums = [3, 8, 11, 4]
            target = 12
            seen = {}
            for i, x in enumerate(nums):
                if target - x in seen:
                    print(seen[target - x], i)
                seen[x] = i
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete the one-pass two-sum. It returns the pair of indexes, or None.',
          code: py`
            def two_sum(nums, target):
                seen = {}
                for i, x in enumerate(nums):
                    if target - x ___ seen:
                        return (seen[target - x], i)
                    seen[x] = ___
                return None
          `,
          bank: ['in', 'i', 'not in', 'x', '==', 'target'],
          answer: ['in', 'i'],
          tests: [
            { call: 'two_sum([2, 7, 11, 15], 9)', expect: '(0, 1)' },
            { call: 'two_sum([3, 3], 6)', expect: '(0, 1)' },
            { call: 'two_sum([1, 2], 7)', expect: 'None' },
          ],
          explain: 'The dict maps **value → index**. Checking *before* storing `x` means an item can never pair with itself, and `[3, 3]` still works because the first 3 is already stored when the second arrives.',
        },
        {
          type: 'code',
          title: 'Count the pairs',
          prompt: md`
            A twist on two-sum. Write \`count_pairs(nums, target)\` that returns how many index pairs \`i < j\` satisfy \`nums[i] + nums[j] == target\`. Values can repeat. It must be O(n): the lists can be long.

            \`\`\`python
            count_pairs([1, 5, 3, 3, 4], 6)  # 2  (1+5, 3+3)
            count_pairs([2, 2, 2], 4)        # 3
            \`\`\`
          `,
          starter: 'def count_pairs(nums, target):\n    pass\n',
          solution: py`
            def count_pairs(nums, target):
                counts = {}
                pairs = 0
                for x in nums:
                    pairs += counts.get(target - x, 0)
                    counts[x] = counts.get(x, 0) + 1
                return pairs
          `,
          setup: 'NUMS = list(range(6000))',
          tests: [
            { call: 'count_pairs([1, 5, 3, 3, 4], 6)', expect: '2' },
            { call: 'count_pairs([2, 2, 2], 4)', expect: '3' },
            { call: 'count_pairs([], 1)', expect: '0', hidden: true },
            { call: 'count_pairs([-1, 1, 0, 0], 0)', expect: '2', hidden: true },
            { call: 'count_pairs([5], 10)', expect: '0', hidden: true },
            { call: 'count_pairs(NUMS, 5999)', expect: '3000', name: '6,000 numbers, fast', maxMs: 30, hidden: true },
          ],
          hints: [
            'Instead of remembering one index per value, remember **how many times** you have seen each value.',
            'For each `x`, every earlier `target - x` forms a pair with it: add `counts.get(target - x, 0)`.',
            'Update the count of `x` **after** that, so `x` never pairs with itself.',
          ],
          wrong: [
            py`
              def count_pairs(nums, target):
                  n = 0
                  for i in range(len(nums)):
                      for j in range(i + 1, len(nums)):
                          if nums[i] + nums[j] == target:
                              n += 1
                  return n
            `,
            py`
              def count_pairs(nums, target):
                  counts = {}
                  pairs = 0
                  for x in nums:
                      counts[x] = counts.get(x, 0) + 1
                      pairs += counts.get(target - x, 0)
                  return pairs
            `,
            py`
              def count_pairs(nums, target):
                  seen = set()
                  pairs = 0
                  for x in nums:
                      if target - x in seen:
                          pairs += 1
                      seen.add(x)
                  return pairs
            `,
          ],
          explain: 'Counts handle duplicates: the third 2 in `[2, 2, 2]` pairs with **both** earlier 2s. A set only remembers *whether* a value appeared, not how often. Updating before checking lets `x` pair with itself (2 + 2 counted from a single 2). The double loop is right but O(n²): 18 million checks for 6,000 numbers.',
        },
        {
          type: 'learn',
          title: 'Tuples as keys',
          body: md`
            Dict keys and set items must be **hashable**: immutable, so their hash can never change. Strings, numbers and **tuples** qualify; lists and dicts don't (TypeError).

            Tuples make great composite keys:
            - grid cells: \`grid[(row, col)]\`
            - multi-column grouping: \`totals[("DE", "Books")]\`

            A set of \`(x, y)\` tuples is a sparse grid: you only store the cells that matter.
          `,
          code: py`
            board = {(0, 0): "X", (1, 1): "O"}
            print(board[(1, 1)], board.get((2, 2), "."))
            visited = {(0, 0), (0, 1)}
            print((0, 1) in visited)
            sales = {}
            sales[("DE", "Books")] = 120
            print(sales)
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            d = {}
            d[[1, 2]] = "a"
          `,
          options: ["TypeError: cannot use 'list' as a dict key (unhashable type: 'list')", "{[1, 2]: 'a'}", "KeyError: [1, 2]", "{(1, 2): 'a'}"],
          answer: 0,
          checkOutput: true,
          explain: 'A list could change after being stored, which would break the hash table, so Python refuses it. Use the tuple `(1, 2)` as the key instead.',
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            cells = set()
            for r in range(2):
                for c in range(3):
                    cells.add((r, c))
            print(len(cells), (1, 2) in cells, (2, 1) in cells)
          `,
          answer: '6 True False',
          explain: '2 rows × 3 columns = 6 cells. Row 2 doesn\'t exist (`range(2)` is 0 and 1), so `(2, 1)` isn\'t in the set.',
        },
        {
          type: 'code',
          title: 'Robot revisits',
          prompt: md`
            A delivery robot starts at \`(0, 0)\` and follows \`moves\`, a string of \`U\`, \`D\`, \`L\`, \`R\` (up: y + 1, down: y - 1, left: x - 1, right: x + 1).

            Write \`first_revisit(moves)\` that returns the first position \`(x, y)\` the robot visits **for the second time** (the start counts as visited), or \`None\` if it never comes back to a cell.

            \`\`\`python
            first_revisit("RULD")  # (0, 0)
            first_revisit("RRUL")  # None
            \`\`\`
          `,
          starter: 'def first_revisit(moves):\n    pass\n',
          solution: py`
            STEP = {"U": (0, 1), "D": (0, -1),
                    "L": (-1, 0), "R": (1, 0)}

            def first_revisit(moves):
                x, y = 0, 0
                seen = {(0, 0)}
                for m in moves:
                    dx, dy = STEP[m]
                    x, y = x + dx, y + dy
                    if (x, y) in seen:
                        return (x, y)
                    seen.add((x, y))
                return None
          `,
          tests: [
            { call: 'first_revisit("RULD")', expect: '(0, 0)' },
            { call: 'first_revisit("RRUL")', expect: 'None' },
            { call: 'first_revisit("")', expect: 'None', hidden: true },
            { call: 'first_revisit("UD")', expect: '(0, 0)', hidden: true },
            { call: 'first_revisit("RRRLLL")', expect: '(2, 0)', hidden: true },
            { call: 'first_revisit("UURDL")', expect: '(0, 1)', hidden: true },
            { call: 'first_revisit("RRUULLDDRR")', hidden: true },
          ],
          hints: [
            'Keep the current `(x, y)` and a set `seen` that already contains `(0, 0)`.',
            'A dict like `{"U": (0, 1), ...}` turns each letter into a step `(dx, dy)`.',
            'After each move: if `(x, y)` is in `seen`, return it; otherwise add it.',
          ],
          wrong: [
            py`
              STEP = {"U": (0, 1), "D": (0, -1),
                      "L": (-1, 0), "R": (1, 0)}

              def first_revisit(moves):
                  x, y = 0, 0
                  seen = set()
                  for m in moves:
                      dx, dy = STEP[m]
                      x, y = x + dx, y + dy
                      if (x, y) in seen:
                          return (x, y)
                      seen.add((x, y))
                  return None
            `,
            py`
              STEP = {"U": (0, -1), "D": (0, 1),
                      "L": (-1, 0), "R": (1, 0)}

              def first_revisit(moves):
                  x, y = 0, 0
                  seen = {(0, 0)}
                  for m in moves:
                      dx, dy = STEP[m]
                      x, y = x + dx, y + dy
                      if (x, y) in seen:
                          return (x, y)
                      seen.add((x, y))
                  return None
            `,
          ],
          explain: 'A set of coordinate tuples is a grid with no fixed size: the robot can wander anywhere without you allocating a matrix. Each check is O(1), so the whole walk is O(n). The same "visited set" is the backbone of graph searches like BFS and DFS (Unit 17).',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u06-exam',
    title: 'Dictionaries & Sets Exam',
    minutes: 25,
    intro: 'Lookups, counting, grouping, set algebra, joins and O(n) tricks, in the shape of real interview and data-engineering questions. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          d = {"a": 1}
          d.setdefault("a", 5)
          d.setdefault("b", 5)
          x = d.pop("a") + d.get("c", 10)
          print(d, x)
        `,
        answer: "{'b': 5} 11",
        explain: '`setdefault` never overwrites, so "a" stays 1 and only "b" is created. `pop("a")` returns 1 and removes it; `get("c", 10)` returns the default.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          a = {1, 2, 3, 4}
          b = {3, 4, 5}
          print(len(a | b), sorted(a ^ b), a - b <= a)
        `,
        options: ['5 [1, 2, 5] True', '7 [1, 2, 5] True', '5 [3, 4] True', '5 [1, 2, 5] False'],
        answer: 0,
        checkOutput: true,
        explain: 'The union has 5 distinct items, not 4 + 3. The symmetric difference leaves out the shared 3 and 4. A difference is always a subset of the left set.',
      },
      {
        type: 'output',
        prompt: 'Type both lines.',
        code: py`
          votes = {"py": 5, "go": 3, "js": 5, "c": 1}
          ranked = sorted(votes, key=votes.get, reverse=True)
          print(ranked)
          print(max(votes, key=votes.get))
        `,
        answer: "['py', 'js', 'go', 'c']\npy",
        explain: 'Stable sort: "py" and "js" tie at 5 and keep their insertion order, even with `reverse=True`. `max` returns the first key with the highest value.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          from collections import Counter
          c = Counter("hello world")
          print(c["l"], c["z"], c.most_common(1))
        `,
        options: ["3 0 [('l', 3)]", "3 None [('l', 3)]", "KeyError: 'z'", "2 0 [('o', 2)]"],
        answer: 0,
        checkOutput: true,
        explain: '"l" appears three times. A Counter returns 0 for missing keys (without inserting them), and `most_common(1)` is a list with one tuple.',
      },
      {
        type: 'choice',
        prompt: 'Which of these can be used as a dictionary key?',
        options: ['("DE", 2025)', '["DE", 2025]', '{"DE": 2025}', '{"DE", 2025}'],
        answer: 0,
        explain: 'Keys must be hashable, i.e. immutable. A tuple of a string and an int qualifies; lists, dicts and sets can change, so they can\'t be keys.',
      },
      {
        type: 'blanks',
        prompt: 'Complete `by_length(words)`, which groups words by their length.',
        code: py`
          from collections import defaultdict

          def by_length(words):
              groups = defaultdict(___)
              for w in words:
                  groups[len(w)].___(w)
              return dict(groups)
        `,
        bank: ['list', 'append', 'int', 'add', 'set', 'extend'],
        answer: ['list', 'append'],
        tests: [
          { call: 'by_length(["a", "bb", "c"])', expect: '{1: ["a", "c"], 2: ["bb"]}' },
          { call: 'by_length([])', expect: '{}' },
        ],
        explain: '`defaultdict(list)` creates an empty list for each new length. `extend(w)` would add the word\'s individual letters.',
      },
      {
        type: 'order',
        prompt: 'Arrange the lines into `most_frequent(words)`, which returns the most common word and its count.',
        lines: [
          'def most_frequent(words):',
          '    counts = {}',
          '    for w in words:',
          '        counts[w] = counts.get(w, 0) + 1',
          '    best = max(counts, key=counts.get)',
          '    return best, counts[best]',
        ],
        distractors: ['    best = max(counts)'],
        tests: [
          { call: 'most_frequent(["a", "b", "a"])', expect: '("a", 2)' },
          { call: 'most_frequent(["z", "y", "y"])', expect: '("y", 2)' },
        ],
        explain: '`max(counts)` compares the **keys** themselves (alphabetically), so it would pick "z". `key=counts.get` compares the counts.',
      },
      {
        type: 'code',
        title: 'Group anagrams',
        prompt: md`
          Write \`group_anagrams(words)\` that groups words that are anagrams of each other. Return a list of groups (lists). Groups appear in the order of their first word, and words keep their original order within a group.

          \`\`\`python
          group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
          # [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]
          \`\`\`
        `,
        starter: 'def group_anagrams(words):\n    pass\n',
        solution: py`
          def group_anagrams(words):
              groups = {}
              for w in words:
                  key = "".join(sorted(w))
                  groups.setdefault(key, []).append(w)
              return list(groups.values())
        `,
        tests: [
          { call: 'group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])', expect: '[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]' },
          { call: 'group_anagrams([])', expect: '[]' },
          { call: 'group_anagrams(["a"])', expect: '[["a"]]', hidden: true },
          { call: 'group_anagrams(["ab", "ba", "ab"])', expect: '[["ab", "ba", "ab"]]', hidden: true },
          { call: 'group_anagrams(["aab", "ab", "aba"])', expect: '[["aab", "aba"], ["ab"]]', hidden: true },
          { call: 'group_anagrams(["listen", "google", "silent", "enlist", "gogole", "x"])', hidden: true },
        ],
        wrong: [
          py`
            def group_anagrams(words):
                groups = {}
                for w in words:
                    groups.setdefault(len(w), []).append(w)
                return list(groups.values())
          `,
          py`
            def group_anagrams(words):
                groups = {}
                for w in words:
                    key = "".join(sorted(set(w)))
                    groups.setdefault(key, []).append(w)
                return list(groups.values())
          `,
          py`
            def group_anagrams(words):
                groups = {}
                for w in words:
                    groups.setdefault(sorted(w), []).append(w)
                return list(groups.values())
          `,
        ],
        explain: 'The sorted letters form a **signature** shared by all anagrams. It must be a string (a list isn\'t hashable), and it must keep repeated letters ("aab" ≠ "ab", which a set signature would merge). Dicts keep insertion order, so groups come out in first-seen order. O(n · k log k) for n words of length k.',
      },
      {
        type: 'code',
        title: 'Longest activity streak',
        prompt: md`
          \`days\` lists the day numbers on which a user was active: unsorted, with duplicates. Write \`longest_streak(days)\` that returns the length of the longest run of **consecutive** days. It must be O(n), so **no sorting**.

          \`\`\`python
          longest_streak([10, 4, 20, 1, 3, 2])  # 4 (days 1-4)
          longest_streak([])                    # 0
          \`\`\`
        `,
        starter: 'def longest_streak(days):\n    pass\n',
        solution: py`
          def longest_streak(days):
              s = set(days)
              best = 0
              for d in s:
                  if d - 1 not in s:
                      length = 1
                      while d + length in s:
                          length += 1
                      best = max(best, length)
              return best
        `,
        setup: 'DAYS = list(range(6000, 0, -1))',
        tests: [
          { call: 'longest_streak([10, 4, 20, 1, 3, 2])', expect: '4' },
          { call: 'longest_streak([])', expect: '0' },
          { call: 'longest_streak([5, 5, 5])', expect: '1', hidden: true },
          { call: 'longest_streak([1, 3, 5])', expect: '1', hidden: true },
          { call: 'longest_streak([-1, 0, 1])', expect: '3', hidden: true },
          { call: 'longest_streak([7, 6, 5, 9, 8, 100, 2, 2])', expect: '5', hidden: true },
          { call: 'longest_streak(DAYS)', expect: '6000', name: '6,000 consecutive days, fast', maxMs: 40, hidden: true },
        ],
        forbid: ['sort', 'sorted'],
        wrong: [
          py`
            def longest_streak(days):
                s = set(days)
                best = 0
                for d in s:
                    length = 1
                    while d + length in s:
                        length += 1
                    best = max(best, length)
                return best
          `,
          py`
            def longest_streak(days):
                best = 0
                run = 0
                prev = None
                for d in sorted(set(days)):
                    if prev is not None and d == prev + 1:
                        run += 1
                    else:
                        run = 1
                    best = max(best, run)
                    prev = d
                return best
          `,
          py`
            def longest_streak(days):
                s = set(days)
                best = 1
                for d in s:
                    if d - 1 not in s:
                        length = 1
                        while d + length in s:
                            length += 1
                        best = max(best, length)
                return best
          `,
        ],
        explain: 'Only start counting at the **beginning** of a run (`d - 1 not in s`). Then every day is visited at most twice overall: O(n). Counting up from every day is O(n²) on one long streak. Sorting is the natural O(n log n) answer, and interviewers often ask exactly this follow-up: "can you do it without sorting?"',
      },
      {
        type: 'code',
        title: 'Revenue by country',
        prompt: md`
          \`users\` is a list of dicts \`{"id", "country"}\` and \`orders\` a list of dicts \`{"user_id", "amount", "status"}\`.

          Write \`revenue_by_country(users, orders)\` that returns a dict mapping country → total amount of **completed** orders, rounded to 2 decimals, with the countries in order of revenue, **highest first** (dicts keep insertion order). Ignore orders from unknown users. Countries without completed orders are left out.

          \`\`\`python
          users = [{"id": 1, "country": "DE"},
                   {"id": 2, "country": "US"}]
          orders = [
              {"user_id": 2, "amount": 5.0, "status": "completed"},
              {"user_id": 1, "amount": 9.5, "status": "completed"},
          ]
          revenue_by_country(users, orders)
          # {"DE": 9.5, "US": 5.0}
          \`\`\`
        `,
        starter: 'def revenue_by_country(users, orders):\n    pass\n',
        solution: py`
          def revenue_by_country(users, orders):
              country_of = {}
              for u in users:
                  country_of[u["id"]] = u["country"]
              totals = {}
              for o in orders:
                  c = country_of.get(o["user_id"])
                  if c is None or o["status"] != "completed":
                      continue
                  totals[c] = totals.get(c, 0) + o["amount"]
              ranked = sorted(totals, key=totals.get,
                              reverse=True)
              result = {}
              for c in ranked:
                  result[c] = round(totals[c], 2)
              return result
        `,
        setup: py`
          U = [{"id": 1, "country": "DE"}, {"id": 2, "country": "US"},
               {"id": 3, "country": "DE"}, {"id": 4, "country": "FR"}]
          O = [
              {"user_id": 2, "amount": 50.5, "status": "completed"},
              {"user_id": 1, "amount": 20.0, "status": "completed"},
              {"user_id": 3, "amount": 15.25, "status": "completed"},
              {"user_id": 2, "amount": 99.0, "status": "cancelled"},
              {"user_id": 9, "amount": 500.0, "status": "completed"},
              {"user_id": 4, "amount": 10.0, "status": "returned"},
              {"user_id": 1, "amount": 30.0, "status": "completed"},
          ]
          SMALL_U = [{"id": 1, "country": "DE"}, {"id": 2, "country": "US"}]
          SMALL_O = [{"user_id": 2, "amount": 5.0, "status": "completed"},
                     {"user_id": 1, "amount": 9.5, "status": "completed"}]
          TINY_O = [{"user_id": 1, "amount": 0.1, "status": "completed"},
                    {"user_id": 1, "amount": 0.1, "status": "completed"},
                    {"user_id": 1, "amount": 0.1, "status": "completed"}]
        `,
        tests: [
          { call: 'revenue_by_country(SMALL_U, SMALL_O)', expect: '{"DE": 9.5, "US": 5.0}', name: 'the example from the prompt' },
          { call: 'list(revenue_by_country(SMALL_U, SMALL_O))', expect: '["DE", "US"]', name: 'countries ordered by revenue' },
          { call: 'revenue_by_country(U, O)', expect: '{"DE": 65.25, "US": 50.5}', name: 'mixed statuses and an unknown user', hidden: true },
          { call: 'list(revenue_by_country(U, O))', expect: '["DE", "US"]', name: 'mixed data, ordered by revenue', hidden: true },
          { call: 'revenue_by_country(SMALL_U, [])', expect: '{}', hidden: true },
          { call: 'revenue_by_country(SMALL_U, TINY_O)', expect: '{"DE": 0.3}', name: 'rounds the totals', hidden: true },
        ],
        wrong: [
          py`
            def revenue_by_country(users, orders):
                country_of = {}
                for u in users:
                    country_of[u["id"]] = u["country"]
                totals = {}
                for o in orders:
                    c = country_of.get(o["user_id"])
                    if c is None or o["status"] != "completed":
                        continue
                    totals[c] = round(totals.get(c, 0) + o["amount"], 2)
                return totals
          `,
          py`
            def revenue_by_country(users, orders):
                country_of = {}
                for u in users:
                    country_of[u["id"]] = u["country"]
                totals = {}
                for o in orders:
                    if o["status"] != "completed":
                        continue
                    c = country_of[o["user_id"]]
                    totals[c] = totals.get(c, 0) + o["amount"]
                ranked = sorted(totals, key=totals.get, reverse=True)
                result = {}
                for c in ranked:
                    result[c] = round(totals[c], 2)
                return result
          `,
          py`
            def revenue_by_country(users, orders):
                country_of = {}
                for u in users:
                    country_of[u["id"]] = u["country"]
                totals = {}
                for o in orders:
                    c = country_of.get(o["user_id"])
                    if c is None:
                        continue
                    totals[c] = totals.get(c, 0) + o["amount"]
                ranked = sorted(totals, key=totals.get, reverse=True)
                result = {}
                for c in ranked:
                    result[c] = round(totals[c], 2)
                return result
          `,
        ],
        explain: 'Index → filter → aggregate → sort: a complete mini ETL job, and exactly `SELECT country, SUM(amount) … JOIN … WHERE status = \'completed\' GROUP BY country ORDER BY 2 DESC`. Dict equality ignores order, so the order has to be built deliberately: sort the keys, then insert them in that order. An unknown user must be skipped, not crash the job, since real data always has orphans.',
      },
    ],
  },
};

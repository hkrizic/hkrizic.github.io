// Unit 9 — Object-Oriented Python.
import { py, md } from './helpers.js';

export default {
  id: 'u09',
  order: 9,
  track: 'foundations',
  title: 'Object-Oriented Python',
  subtitle: 'classes, dunders, properties, dataclasses',
  icon: '🏗️',
  color: '#6366F1',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u09-l1',
      title: 'Classes & Objects',
      summary: 'Bundle data and behaviour into your own types.',
      steps: [
        {
          type: 'learn',
          title: 'Your own types',
          body: md`
            You've used objects from day one: \`"ada".upper()\` calls the \`upper\` **method** of a \`str\` object. A **class** lets you define your own type: what data each object holds (its **attributes**) and what it can do (its **methods**).

            Calling the class like a function creates a new **instance** and runs \`__init__\` on it. \`self\` is that brand-new object, so \`self.name = name\` stores an attribute on it.

            > Convention: class names use **CamelCase** (\`User\`, \`OrderLine\`). Everything else stays snake_case.
          `,
          code: py`
            class User:
                def __init__(self, name, plan):
                    self.name = name
                    self.plan = plan

            u = User("ada", "pro")
            print(u.name, u.plan)
            print(type(u).__name__)
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            class User:
                def __init__(self, name, plan):
                    self.name = name
                    self.plan = plan

            u = User("ada")
          `,
          options: [
            "TypeError: User.__init__() missing 1 required positional argument: 'plan'",
            'It works and u.plan is None',
            "AttributeError: 'User' object has no attribute 'plan'",
            'It works and u.plan is ""',
          ],
          answer: 0,
          checkOutput: true,
          explain: md`
            \`User("ada")\` runs \`__init__(u, "ada")\`. Python fills in \`self\` for you, so you pass every argument **after** \`self\`. \`plan\` has no default value, so the call fails before the object is even ready. Python never invents \`None\` for a missing argument.
          `,
        },
        {
          type: 'learn',
          title: 'Methods and self',
          body: md`
            A **method** is a function defined inside a class. When you call \`acct.deposit(50)\`, Python runs \`Account.deposit(acct, 50)\`: the object before the dot is passed in as \`self\`.

            That's why every method lists \`self\` first, and it's how a method reads and changes *that particular* object's attributes.
          `,
          code: py`
            class Account:
                def __init__(self, owner):
                    self.owner = owner
                    self.balance = 0

                def deposit(self, amount):
                    self.balance += amount
                    return self.balance

            acct = Account("ada")
            acct.deposit(50)
            print(acct.deposit(25))
            print(Account.deposit(acct, 5))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            class Counter:
                def __init__(self):
                    self.n = 0

                def hit(self):
                    self.n += 1

            a = Counter()
            b = Counter()
            a.hit()
            a.hit()
            b.hit()
            print(a.n, b.n)
          `,
          answer: '2 1',
          explain: 'Every instance has its own attributes. Inside `hit`, `self` is whichever object the method was called on, so `a.hit()` only touches `a.n`.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            class Cart:
                def __init__(self):
                    self.items = []

                def add(item):
                    self.items.append(item)

            c = Cart()
            c.add("book")
          `,
          options: [
            'TypeError: Cart.add() takes 1 positional argument but 2 were given',
            "NameError: name 'self' is not defined",
            "AttributeError: 'Cart' object has no attribute 'add'",
            'It works: c.items is ["book"]',
          ],
          answer: 0,
          checkOutput: true,
          explain: md`
            \`c.add("book")\` passes **two** arguments: \`c\` itself and \`"book"\`. \`def add(item)\` only has room for one. Forgetting \`self\` is the most common class bug, and "2 were given" when you passed one is the clue.
          `,
        },
        {
          type: 'learn',
          title: 'Methods calling methods',
          body: md`
            Inside a method, reach the object's other attributes **and methods** through \`self.\`. A bare \`subtotal()\` would look for a global function and raise \`NameError\`.

            Building bigger methods from small ones keeps each one short and easy to test, exactly like with plain functions.
          `,
          code: py`
            class Order:
                def __init__(self, qty, unit_price):
                    self.qty = qty
                    self.unit_price = unit_price

                def subtotal(self):
                    return self.qty * self.unit_price

                def total(self, vat=0.2):
                    gross = self.subtotal() * (1 + vat)
                    return round(gross, 2)

            o = Order(3, 10.0)
            print(o.subtotal(), o.total())
          `,
        },
        {
          type: 'blanks',
          prompt: 'Complete the class so the program prints `212.0`.',
          code: py`
            class Temperature:
                def ___(self, celsius):
                    ___.celsius = celsius

                def fahrenheit(self):
                    return self.celsius * 9 / 5 + 32

            t = Temperature(100)
            print(t.fahrenheit())
          `,
          bank: ['__init__', 'self', 'init', 'this', '__new__', 'Temperature'],
          answer: ['__init__', 'self'],
          tests: [{ stdout: '212.0\n' }],
          explain: '`__init__` (two underscores on each side) is the method Python calls automatically on a new instance. `self.celsius = …` stores the value on that instance. `Temperature.celsius = …` would set a single value on the class, shared by every temperature.',
        },
        {
          type: 'output',
          prompt: 'Trace it carefully. What does this print?',
          code: py`
            class Tank:
                def __init__(self, size):
                    self.size = size
                    self.level = 0

                def free(self):
                    return self.size - self.level

                def fill(self, amount):
                    added = min(amount, self.free())
                    self.level += added
                    return added

            t = Tank(10)
            print(t.fill(7), t.fill(7), t.free())
          `,
          answer: '7 3 0',
          explain: 'The arguments of `print` are evaluated left to right. The first `fill(7)` has 10 free, adds 7. The second has only 3 free, so it adds 3. Then the tank is full: `free()` is 0. Each call to `fill` reads the *current* state through `self.free()`.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines so the program prints `6`.',
          lines: [
            'class Wallet:',
            '    def __init__(self, cash):',
            '        self.cash = cash',
            'w = Wallet(10)',
            'w.cash -= 4',
            'print(w.cash)',
          ],
          distractors: ['    def __init__(cash):', 'w = Wallet'],
          tests: [{ stdout: '6\n' }],
          explain: 'The class must exist before you create an instance, and the instance must exist before you change its attribute. `w = Wallet` (no parentheses) would only give the class a second name.',
        },
        {
          type: 'code',
          title: 'User accounts',
          prompt: md`
            Write a class \`User\`:

            - \`User(name, email)\` stores both as attributes \`name\` and \`email\`.
            - \`domain()\` returns the part of the email after \`@\`, in lower case.
            - \`greeting()\` returns \`"Hi, <Name>!"\` with the name's first letter upper-case and the rest lower-case.

            \`\`\`python
            u = User("ada", "Ada@Example.COM")
            u.domain()    # "example.com"
            u.greeting()  # "Hi, Ada!"
            \`\`\`
          `,
          starter: py`
            class User:
                def __init__(self, name, email):
                    pass

                def domain(self):
                    pass

                def greeting(self):
                    pass
          `,
          solution: py`
            class User:
                def __init__(self, name, email):
                    self.name = name
                    self.email = email

                def domain(self):
                    domain = self.email.split("@")[-1]
                    return domain.lower()

                def greeting(self):
                    name = self.name.capitalize()
                    return f"Hi, {name}!"
          `,
          tests: [
            { code: 'u = User("ada", "a@x.io")\nassert u.name == "ada"\nassert u.email == "a@x.io"', name: 'stores name and email' },
            { call: 'User("ada", "Ada@Example.COM").domain()', expect: '"example.com"' },
            { call: 'User("ada", "x@y.com").greeting()', expect: '"Hi, Ada!"' },
            { call: 'User("BOB", "b@corp.de").greeting()', expect: '"Hi, Bob!"', hidden: true },
            { call: 'User("li", "li@Sub.Mail.ORG").domain()', expect: '"sub.mail.org"', hidden: true },
            { code: 'a = User("a", "a@a.com")\nb = User("b", "b@b.com")\nassert a.domain() == "a.com"\nassert b.domain() == "b.com"', name: 'each user has its own data', hidden: true },
          ],
          hints: [
            'In `__init__`, store the arguments on `self`: `self.name = name`.',
            '`self.email.split("@")[-1]` is everything after the `@`. Then `.lower()`.',
            '`"bOB".capitalize()` gives `"Bob"`.',
          ],
          wrong: [
            py`
              class User:
                  def __init__(self, name, email):
                      self.name = name
                      self.email = email

                  def domain(self):
                      domain = self.email.split("@")[-1]
                      return domain

                  def greeting(self):
                      name = self.name.capitalize()
                      return f"Hi, {name}!"
            `,
            py`
              class User:
                  def __init__(self, name, email):
                      self.name = name
                      self.email = email

                  def domain(self):
                      domain = self.email.split("@")[-1]
                      return domain.lower()

                  def greeting(self):
                      return f"Hi, {self.name}!"
            `,
          ],
          explain: md`
            \`__init__\` only *stores* data. The other methods derive answers from it on demand, so they always reflect the current attributes. \`capitalize()\` upper-cases the first character and lower-cases the rest, which \`"BOB"\` needs.
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the inventory',
          prompt: md`
            \`Inventory\` tracks stock per SKU. \`count(sku)\` returns 0 for unknown SKUs and \`add(sku, qty)\` returns the new count. It crashes. Find and fix the **two** bugs.

            \`\`\`python
            inv = Inventory()
            inv.add("A1", 5)   # 5
            inv.add("A1", 2)   # 7
            inv.count("B2")    # 0
            \`\`\`
          `,
          starter: py`
            class Inventory:
                def __init__(self):
                    stock = {}

                def count(self, sku):
                    return self.stock.get(sku, 0)

                def add(self, sku, qty):
                    self.stock[sku] = count(sku) + qty
                    return self.stock[sku]
          `,
          solution: py`
            class Inventory:
                def __init__(self):
                    self.stock = {}

                def count(self, sku):
                    return self.stock.get(sku, 0)

                def add(self, sku, qty):
                    self.stock[sku] = self.count(sku) + qty
                    return self.stock[sku]
          `,
          tests: [
            { code: 'inv = Inventory()\nassert inv.add("A1", 5) == 5\nassert inv.add("A1", 2) == 7', name: 'add returns the new count' },
            { call: 'Inventory().count("B2")', expect: '0' },
            { code: 'a = Inventory()\nb = Inventory()\na.add("X", 1)\nassert b.count("X") == 0', name: 'inventories are independent', hidden: true },
          ],
          hints: [
            '`stock = {}` creates a local variable that disappears when `__init__` ends.',
            'Inside a method, other methods are reached through `self.`: `self.count(sku)`.',
          ],
          wrong: [py`
            class Inventory:
                def __init__(self):
                    self.stock = {}

                def count(self, sku):
                    return self.stock.get(sku, 0)

                def add(self, sku, qty):
                    self.stock[sku] = count(sku) + qty
                    return self.stock[sku]
          `],
          explain: md`
            Two classic bugs: assigning to a plain name inside a method makes a **local variable**, not an attribute. And methods aren't in scope by their bare name, so you always go through \`self\`. Both come from the same rule: the object's data lives on \`self\`, nowhere else.
          `,
        },
        {
          type: 'code',
          title: 'Shopping cart',
          prompt: md`
            Build a \`Cart\` class:

            - \`add(name, price, qty=1)\` records a line.
            - \`count()\` returns the total number of **units**.
            - \`total()\` returns the sum of \`price * qty\`, rounded to 2 decimals.
            - \`shipping()\` returns \`0\` when \`total()\` is **at least** 50, otherwise \`4.99\`.

            \`\`\`python
            c = Cart()
            c.add("mug", 8.5, 2)
            c.add("tea", 4.25)
            c.count()     # 3
            c.total()     # 21.25
            c.shipping()  # 4.99
            \`\`\`
          `,
          starter: py`
            class Cart:
                def __init__(self):
                    self.lines = []

                def add(self, name, price, qty=1):
                    pass

                def count(self):
                    pass

                def total(self):
                    pass

                def shipping(self):
                    pass
          `,
          solution: py`
            class Cart:
                def __init__(self):
                    self.lines = []

                def add(self, name, price, qty=1):
                    self.lines.append((name, price, qty))

                def count(self):
                    return sum(q for _, _, q in self.lines)

                def total(self):
                    t = sum(p * q for _, p, q in self.lines)
                    return round(t, 2)

                def shipping(self):
                    return 0 if self.total() >= 50 else 4.99
          `,
          tests: [
            { code: 'c = Cart()\nc.add("mug", 8.5, 2)\nc.add("tea", 4.25)\nassert c.count() == 3', name: 'count() adds up the quantities' },
            { code: 'c = Cart()\nc.add("mug", 8.5, 2)\nc.add("tea", 4.25)\nassert c.total() == 21.25\nassert c.shipping() == 4.99', name: 'total and shipping for a small cart' },
            { code: 'c = Cart()\nc.add("lamp", 25, 2)\nassert c.shipping() == 0', name: 'exactly 50 ships free', hidden: true },
            { code: 'c = Cart()\nc.add("pen", 0.1, 3)\nassert c.total() == 0.3', name: 'total is rounded', hidden: true },
            { code: 'c = Cart()\nassert c.count() == 0\nassert c.total() == 0\nassert c.shipping() == 4.99', name: 'empty cart', hidden: true },
          ],
          hints: [
            'Store each line as a tuple `(name, price, qty)` in `self.lines`.',
            '`sum(p * q for _, p, q in self.lines)` multiplies inside the loop.',
            '`shipping` should call `self.total()` rather than repeat the math.',
          ],
          wrong: [
            py`
              class Cart:
                  def __init__(self):
                      self.lines = []

                  def add(self, name, price, qty=1):
                      self.lines.append((name, price, qty))

                  def count(self):
                      return len(self.lines)

                  def total(self):
                      t = sum(p * q for _, p, q in self.lines)
                      return round(t, 2)

                  def shipping(self):
                      return 0 if self.total() >= 50 else 4.99
            `,
            py`
              class Cart:
                  def __init__(self):
                      self.lines = []

                  def add(self, name, price, qty=1):
                      self.lines.append((name, price, qty))

                  def count(self):
                      return sum(q for _, _, q in self.lines)

                  def total(self):
                      t = sum(p * q for _, p, q in self.lines)
                      return round(t, 2)

                  def shipping(self):
                      return 0 if self.total() > 50 else 4.99
            `,
            py`
              class Cart:
                  def __init__(self):
                      self.lines = []

                  def add(self, name, price, qty=1):
                      self.lines.append((name, price, qty))

                  def count(self):
                      return sum(q for _, _, q in self.lines)

                  def total(self):
                      return sum(p * q for _, p, q in self.lines)

                  def shipping(self):
                      return 0 if self.total() >= 50 else 4.99
            `,
          ],
          explain: md`
            The cart stores raw lines and **derives** everything else, so \`count\`, \`total\` and \`shipping\` can never disagree. \`shipping\` reuses \`total()\` instead of duplicating the formula: one place to fix if the pricing rule changes. "At least 50" means \`>=\`. Boundary conditions like this are where graders (and interviewers) poke first.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u09-l2',
      title: 'Dunder Methods',
      summary: 'Make your objects print, compare, sort and add like built-ins.',
      steps: [
        {
          type: 'learn',
          title: 'Dunders and __repr__',
          body: md`
            Python's syntax runs special **dunder** (double underscore) methods: \`len(x)\` calls \`x.__len__()\`, \`a + b\` calls \`a.__add__(b)\`, \`print(x)\` calls \`x.__str__()\`. Define them and your objects behave like built-ins.

            Start with \`__repr__\`. It returns an unambiguous string for developers, ideally one that looks like the code that rebuilds the object. Without it you get \`<__main__.Money object at 0x10f3…>\`, which is useless in logs and debuggers.
          `,
          code: py`
            class Money:
                def __init__(self, cents):
                    self.cents = cents

                def __repr__(self):
                    return f"Money({self.cents})"

            m = Money(250)
            print(m)
            print([m, Money(99)])
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            class Point:
                def __init__(self, x, y):
                    self.x, self.y = x, y

                def __repr__(self):
                    return f"Point({self.x}, {self.y})"

            pts = [Point(1, 2), Point(0, 5)]
            print(pts)
            print(pts[1])
          `,
          answer: '[Point(1, 2), Point(0, 5)]\nPoint(0, 5)',
          explain: 'A list shows each item\'s `__repr__`. With no `__str__` defined, `print(pts[1])` falls back to `__repr__` too.',
        },
        {
          type: 'learn',
          title: '__str__ for humans',
          body: md`
            \`print(x)\`, \`str(x)\` and f-strings use \`__str__\` when it exists, and fall back to \`__repr__\` otherwise.

            **Containers always show their items' \`__repr__\`**, and \`{x!r}\` in an f-string forces the repr too.

            Rule of thumb: always write \`__repr__\` (for developers and logs). Add \`__str__\` only when end users need a friendlier form.
          `,
          code: py`
            class Money:
                def __init__(self, cents):
                    self.cents = cents

                def __repr__(self):
                    return f"Money({self.cents})"

                def __str__(self):
                    return f"€{self.cents / 100:.2f}"

            m = Money(250)
            print(m)
            print(f"{m!r} is shown as {m}")
            print([m])
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            class Tag:
                def __init__(self, name):
                    self.name = name

                def __repr__(self):
                    return f"Tag({self.name!r})"

                def __str__(self):
                    return "#" + self.name

            tags = [Tag("ml"), Tag("sql")]
            print(tags[0], tags)
          `,
          options: [
            "#ml [Tag('ml'), Tag('sql')]",
            '#ml [#ml, #sql]',
            "Tag('ml') [Tag('ml'), Tag('sql')]",
            "#ml ['#ml', '#sql']",
          ],
          answer: 0,
          checkOutput: true,
          explain: '`print` calls `str()` on each argument: `tags[0]` becomes `#ml`. But `str()` of a list is built from the **repr** of its items. `{self.name!r}` puts quotes around the name, so the repr looks like real code.',
        },
        {
          type: 'learn',
          title: '__eq__ and __hash__',
          body: md`
            By default \`==\` between your objects checks **identity**: is it the very same object? Define \`__eq__\` to compare by value. For types you don't handle, return \`NotImplemented\`: Python then asks the other operand, and if neither knows, \`==\` falls back to identity (so \`False\`). (\`isinstance(x, Money)\` checks the type; lesson 4 covers it.)

            The catch: defining \`__eq__\` sets \`__hash__\` to \`None\`, so your objects can't be set members or dict keys anymore. Add a \`__hash__\` that hashes **the same fields** \`__eq__\` compares. Equal objects must have equal hashes. Only do it for objects you won't mutate later.
          `,
          code: py`
            class Money:
                def __init__(self, cents):
                    self.cents = cents

                def __eq__(self, other):
                    if not isinstance(other, Money):
                        return NotImplemented
                    return self.cents == other.cents

                def __hash__(self):
                    return hash(self.cents)

            print(Money(5) == Money(5), Money(5) == 5)
            print(len({Money(5), Money(5), Money(7)}))
          `,
        },
        {
          type: 'output',
          prompt: 'No `__eq__` here. What does this print?',
          code: py`
            class P:
                def __init__(self, x):
                    self.x = x

            a = P(1)
            b = P(1)
            c = a
            print(a == b, a == c, a is c)
          `,
          answer: 'False True True',
          explain: 'Without `__eq__`, `==` falls back to identity. `a` and `b` are two different objects that happen to hold the same data. `c = a` doesn\'t copy anything: both names point to one object.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            class SKU:
                def __init__(self, code):
                    self.code = code

                def __eq__(self, other):
                    return self.code == other.code

            seen = {SKU("A1")}
          `,
          options: [
            "TypeError: cannot use 'SKU' as a set element (unhashable type: 'SKU')",
            'It works: a set with one SKU',
            "AttributeError: 'SKU' object has no attribute '__hash__'",
            'It works, but duplicates are not removed',
          ],
          answer: 0,
          checkOutput: true,
          explain: 'Defining `__eq__` without `__hash__` makes the class unhashable on purpose: the default hash is based on identity, which would break the rule "equal objects have equal hashes". Add `def __hash__(self): return hash(self.code)`.',
        },
        {
          type: 'learn',
          title: 'Operators: <, len, in, +',
          body: md`
            | you write | Python calls |
            |---|---|
            | \`a < b\` | \`a.__lt__(b)\` |
            | \`len(x)\` | \`x.__len__()\` |
            | \`item in x\` | \`x.__contains__(item)\` |
            | \`a + b\` | \`a.__add__(b)\` |

            - \`sorted()\`, \`min()\` and \`max()\` only need \`__lt__\`.
            - \`__len__\` also makes \`if x:\` false when the length is 0.
            - \`__add__\` must return a **new** object and leave both operands alone.
            - \`sum()\` starts from \`0\`, and \`0 + v\` calls \`v.__radd__(0)\`. Define \`__radd__\` too, or pass a start: \`sum(xs, Money(0))\`.
          `,
          code: py`
            class Vec:
                def __init__(self, x, y):
                    self.x, self.y = x, y

                def __repr__(self):
                    return f"Vec({self.x}, {self.y})"

                def __add__(self, other):
                    return Vec(self.x + other.x,
                               self.y + other.y)

                def __lt__(self, other):
                    return self.size() < other.size()

                def size(self):
                    return self.x ** 2 + self.y ** 2

            print(Vec(1, 2) + Vec(10, 20))
            vs = [Vec(3, 4), Vec(1, 1), Vec(0, 2)]
            print(sorted(vs))
          `,
        },
        {
          type: 'blanks',
          prompt: 'Make the jobs sort by priority, lowest first, so it prints `[\'backup\', \'etl\']`.',
          code: py`
            class Job:
                def __init__(self, name, priority):
                    self.name = name
                    self.priority = priority

                def ___(self, other):
                    return self.priority ___ other.priority

            jobs = [Job("etl", 2), Job("backup", 1)]
            print([j.name for j in sorted(jobs)])
          `,
          bank: ['__lt__', '<', '__eq__', '>', '__sort__', '=='],
          answer: ['__lt__', '<'],
          tests: [{ stdout: "['backup', 'etl']\n" }],
          explain: '`sorted()` asks "is a < b?" by calling `a.__lt__(b)`. Returning `self.priority > other.priority` would sort the opposite way. There is no `__sort__`.',
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            class Playlist:
                def __init__(self, songs):
                    self.songs = list(songs)

                def __len__(self):
                    return len(self.songs)

                def __contains__(self, song):
                    return song.lower() in self.songs

            p = Playlist(["intro", "outro"])
            print(len(p), "INTRO" in p, bool(p))
          `,
          answer: '2 True True',
          explain: '`in` calls `__contains__`, which lower-cases the query first. `bool(p)` uses `__len__`: a non-zero length is truthy, so a non-empty playlist counts as `True` in an `if`.',
        },
        {
          type: 'choice',
          prompt: 'This `__add__` has a bug. What does the program print?',
          code: py`
            class Vec:
                def __init__(self, x, y):
                    self.x, self.y = x, y

                def __add__(self, other):
                    self.x += other.x
                    self.y += other.y
                    return self

            a = Vec(1, 1)
            b = a + Vec(2, 2)
            print(a.x, b.x, a is b)
          `,
          options: ['3 3 True', '1 3 False', '1 3 True', '3 3 False'],
          answer: 0,
          checkOutput: true,
          explain: '`__add__` modified `a` and returned it, so `b` *is* `a`. Nobody expects `a + b` to change `a`: imagine `total = price + tax` silently changing `price`. Always build and return a new object.',
        },
        {
          type: 'code',
          title: 'Money that prints and adds',
          prompt: md`
            Write a \`Money\` class that stores an integer number of \`cents\`:

            - \`repr\` looks like \`Money(250)\`
            - \`str\` looks like \`€2.50\` (always 2 decimals)
            - \`+\` returns a **new** \`Money\` and doesn't change either side
            - \`sum([...])\` of Money objects works (it starts from \`0\`)

            \`\`\`python
            print(Money(250))            # €2.50
            Money(1) + Money(2)          # Money(3)
            sum([Money(5), Money(7)])    # Money(12)
            \`\`\`
          `,
          starter: py`
            class Money:
                def __init__(self, cents):
                    self.cents = cents
          `,
          solution: py`
            class Money:
                def __init__(self, cents):
                    self.cents = cents

                def __repr__(self):
                    return f"Money({self.cents})"

                def __str__(self):
                    return f"€{self.cents / 100:.2f}"

                def __add__(self, other):
                    return Money(self.cents + other.cents)

                def __radd__(self, other):
                    return Money(self.cents + other)
          `,
          tests: [
            { call: 'repr(Money(250))', expect: '"Money(250)"' },
            { call: 'str(Money(250))', expect: '"€2.50"' },
            { call: 'str(Money(5))', expect: '"€0.05"' },
            { call: 'repr(Money(1) + Money(2))', expect: '"Money(3)"' },
            { code: 'a = Money(100)\nb = Money(50)\nc = a + b\nassert c.cents == 150\nassert a.cents == 100 and b.cents == 50', name: '+ returns a new Money' },
            { call: 'repr(sum([Money(5), Money(7)]))', expect: '"Money(12)"', name: 'sum() works' },
            { call: 'str(Money(123456))', expect: '"€1234.56"', hidden: true },
            { call: 'repr([Money(1), Money(2)])', expect: '"[Money(1), Money(2)]"', hidden: true },
          ],
          hints: [
            'Two methods for text: `__repr__` returns `f"Money({self.cents})"`, `__str__` returns the euro form with `:.2f`.',
            '`__add__(self, other)` should `return Money(self.cents + other.cents)`.',
            '`sum` computes `0 + Money(5)` first, which calls `Money(5).__radd__(0)`.',
          ],
          wrong: [
            py`
              class Money:
                  def __init__(self, cents):
                      self.cents = cents

                  def __repr__(self):
                      return f"Money({self.cents})"

                  def __str__(self):
                      return f"€{self.cents / 100}"

                  def __add__(self, other):
                      return Money(self.cents + other.cents)

                  def __radd__(self, other):
                      return Money(self.cents + other)
            `,
            py`
              class Money:
                  def __init__(self, cents):
                      self.cents = cents

                  def __repr__(self):
                      return f"Money({self.cents})"

                  def __str__(self):
                      return f"€{self.cents / 100:.2f}"

                  def __add__(self, other):
                      self.cents += other.cents
                      return self

                  def __radd__(self, other):
                      return Money(self.cents + other)
            `,
            py`
              class Money:
                  def __init__(self, cents):
                      self.cents = cents

                  def __str__(self):
                      return f"€{self.cents / 100:.2f}"

                  def __add__(self, other):
                      return Money(self.cents + other.cents)

                  def __radd__(self, other):
                      return Money(self.cents + other)
            `,
          ],
          explain: md`
            Storing **integer cents** instead of float euros is how real payment systems avoid \`0.1 + 0.2\` errors: integers are exact. \`__radd__\` exists because \`sum\` begins with the int \`0\`. \`int.__add__\` doesn't know Money and returns \`NotImplemented\`, so Python asks the right-hand side instead.
          `,
        },
        {
          type: 'code',
          title: 'Sortable versions',
          prompt: md`
            Release versions like \`"1.10.2"\` must compare **numerically, part by part**: \`1.10\` is newer than \`1.9\` (string comparison gets this wrong!).

            Write \`Version(text)\`:
            - \`repr\` is \`Version('1.10.2')\` (the original text, quoted)
            - \`==\` compares the numeric parts: \`Version("1.02") == Version("1.2")\`
            - \`<\` works, so \`sorted\` and \`max\` work
            - versions can go in a set (equal versions count once)

            > Tuples of ints already compare part by part: \`(1, 10) > (1, 9)\`.
          `,
          starter: py`
            class Version:
                def __init__(self, text):
                    self.text = text
          `,
          solution: py`
            class Version:
                def __init__(self, text):
                    self.text = text
                    nums = text.split(".")
                    self.parts = tuple(int(p) for p in nums)

                def __repr__(self):
                    return f"Version({self.text!r})"

                def __eq__(self, other):
                    return self.parts == other.parts

                def __lt__(self, other):
                    return self.parts < other.parts

                def __hash__(self):
                    return hash(self.parts)
          `,
          tests: [
            { call: 'repr(Version("1.10.2"))', expect: '"Version(\'1.10.2\')"' },
            { call: 'Version("1.9.9") < Version("1.10.0")', expect: 'True' },
            { call: 'repr(sorted([Version("2.0.0"), Version("1.10.0"), Version("1.9.0")]))', expect: '"[Version(\'1.9.0\'), Version(\'1.10.0\'), Version(\'2.0.0\')]"', name: 'sorted() orders numerically' },
            { call: 'Version("1.02") == Version("1.2")', expect: 'True' },
            { call: 'len({Version("1.0"), Version("1.00"), Version("1.1")})', expect: '2', name: 'works in a set' },
            { call: 'Version("0.9") < Version("0.10")', expect: 'True', hidden: true },
            { call: 'repr(max([Version("3.1"), Version("3.12"), Version("3.2")]))', expect: '"Version(\'3.12\')"', hidden: true },
            { call: 'Version("2.1") == Version("2.0")', expect: 'False', hidden: true },
          ],
          hints: [
            'In `__init__`, also store `self.parts = tuple(int(p) for p in text.split("."))`.',
            '`__eq__` and `__lt__` both compare `self.parts` with `other.parts`.',
            'For sets you need `__hash__`. Hash the same thing `__eq__` compares: `hash(self.parts)`.',
          ],
          wrong: [
            py`
              class Version:
                  def __init__(self, text):
                      self.text = text

                  def __repr__(self):
                      return f"Version({self.text!r})"

                  def __eq__(self, other):
                      return self.text == other.text

                  def __lt__(self, other):
                      return self.text < other.text

                  def __hash__(self):
                      return hash(self.text)
            `,
            py`
              class Version:
                  def __init__(self, text):
                      self.text = text
                      nums = text.split(".")
                      self.parts = tuple(int(p) for p in nums)

                  def __repr__(self):
                      return f"Version({self.text!r})"

                  def __eq__(self, other):
                      return self.parts == other.parts

                  def __lt__(self, other):
                      return self.parts < other.parts
            `,
            py`
              class Version:
                  def __init__(self, text):
                      self.text = text
                      nums = text.split(".")
                      self.parts = tuple(int(p) for p in nums)

                  def __repr__(self):
                      return f"Version({self.text!r})"

                  def __eq__(self, other):
                      return self.parts == other.parts

                  def __lt__(self, other):
                      return self.parts < other.parts

                  def __hash__(self):
                      return hash(self.text)
            `,
          ],
          explain: md`
            Converting to a tuple of ints once, in \`__init__\`, gives you correct ordering for free: tuples compare element by element. The set test checks the hash contract. \`"1.0"\` and \`"1.00"\` are equal, so they **must** hash the same, which is why hashing \`self.text\` is a bug even though it "works" most of the time. Version sorting is a well-known interview warm-up (LeetCode 165).
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u09-l3',
      title: 'Properties & Class Methods',
      summary: 'Shared class data, computed attributes, validation and alternative constructors.',
      steps: [
        {
          type: 'learn',
          title: 'Class attributes are shared',
          body: md`
            A name assigned in the class body is a **class attribute**: one value on the class, shared by every instance. Use them for constants and class-wide counters.

            Reading \`self.vat\` looks on the instance first, then on the class. But **assigning** \`b.vat = …\` always creates an *instance* attribute that hides the class one for that object only. To change the shared value, assign to \`Order.vat\`.
          `,
          code: py`
            class Order:
                vat = 0.2        # class attribute
                created = 0

                def __init__(self, net):
                    self.net = net   # instance attribute
                    Order.created += 1

                def gross(self):
                    return self.net * (1 + self.vat)

            a, b = Order(100), Order(50)
            b.vat = 0.5
            print(a.gross(), b.gross(), Order.created)
            print(Order.vat)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            class Shop:
                currency = "EUR"

            a = Shop()
            b = Shop()
            a.currency = "USD"
            print(a.currency, b.currency)
            Shop.currency = "GBP"
            print(a.currency, b.currency)
          `,
          answer: 'USD EUR\nUSD GBP',
          explain: '`a.currency = "USD"` creates an instance attribute on `a` only. Changing `Shop.currency` later affects every instance that *doesn\'t* have its own, which is only `b`.',
        },
        {
          type: 'output',
          prompt: 'A ticket-ID counter. What does this print?',
          code: py`
            class Ticket:
                next_id = 1

                def __init__(self):
                    self.id = self.next_id
                    self.next_id += 1

            a, b = Ticket(), Ticket()
            print(a.id, b.id, Ticket.next_id)
          `,
          answer: '1 1 1',
          explain: '`self.next_id += 1` means `self.next_id = self.next_id + 1`: it *reads* the class value 1, then *assigns* an instance attribute 2 on that one ticket. The class counter never moves, so every ticket gets id 1. Fix: `Ticket.next_id += 1`.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            class Team:
                members = []

                def __init__(self, name):
                    self.name = name

                def join(self, person):
                    self.members.append(person)

            a = Team("data")
            b = Team("web")
            a.join("ada")
            print(b.members)
          `,
          options: ["['ada']", '[]', "AttributeError: 'Team' object has no attribute 'members'", 'None'],
          answer: 0,
          checkOutput: true,
          explain: '`self.members.append(...)` doesn\'t assign anything, it **mutates** the one list stored on the class. Every team shares it. This is the mutable-class-attribute bug, the same trap as a mutable default argument `def f(x=[])`. Create mutable state in `__init__`: `self.members = []`.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the shared tags',
          prompt: md`
            Every \`Post\` should have its **own** list of tags, with no duplicates. Right now tagging one post tags them all. Fix it.

            \`\`\`python
            p1, p2 = Post("a"), Post("b")
            p1.add_tag("ml")
            p2.tags   # should be []
            \`\`\`
          `,
          starter: py`
            class Post:
                tags = []

                def __init__(self, title):
                    self.title = title

                def add_tag(self, tag):
                    if tag not in self.tags:
                        self.tags.append(tag)
          `,
          solution: py`
            class Post:
                def __init__(self, title):
                    self.title = title
                    self.tags = []

                def add_tag(self, tag):
                    if tag not in self.tags:
                        self.tags.append(tag)
          `,
          tests: [
            { code: 'p1 = Post("a")\np2 = Post("b")\np1.add_tag("ml")\nassert p2.tags == []', name: "posts don't share tags" },
            { code: 'p = Post("x")\np.add_tag("sql")\np.add_tag("sql")\nassert p.tags == ["sql"]', name: 'no duplicate tags' },
            { code: 'p1 = Post("a")\np1.add_tag("ml")\np2 = Post("b")\np2.add_tag("ai")\nassert p1.tags == ["ml"]', name: 'a new post does not reset older ones', hidden: true },
          ],
          hints: ['Where is the list created? Once, when the class is defined.', 'Move the list into `__init__` as `self.tags = []`.'],
          wrong: [py`
            class Post:
                tags = []

                def __init__(self, title):
                    self.title = title
                    Post.tags = []

                def add_tag(self, tag):
                    if tag not in self.tags:
                        self.tags.append(tag)
          `],
          explain: md`
            The class body runs **once**, so \`tags = []\` creates one list for all posts. \`__init__\` runs once per post, so a list created there belongs to that post. Resetting \`Post.tags\` in \`__init__\` doesn't help: every post would still share whichever list was created last.
          `,
        },
        {
          type: 'learn',
          title: '@property: computed attributes',
          body: md`
            A **property** looks like an attribute but runs a method. You read it *without parentheses*.

            Use it for values derived from other attributes. A property is recomputed every time it's read, so it can never go stale, unlike a value calculated once in \`__init__\`.
          `,
          code: py`
            class Rect:
                def __init__(self, w, h):
                    self.w, self.h = w, h

                @property
                def area(self):
                    return self.w * self.h

            r = Rect(3, 4)
            print(r.area)
            r.w = 10
            print(r.area)    # follows the change
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            class Temp:
                def __init__(self, c):
                    self.c = c

                @property
                def f(self):
                    return self.c * 9 / 5 + 32

            t = Temp(100)
            print(t.f())
          `,
          options: ["TypeError: 'float' object is not callable", '212.0', "AttributeError: 'Temp' object has no attribute 'f'", 'None'],
          answer: 0,
          checkOutput: true,
          explain: '`t.f` already runs the method and gives `212.0`. The extra `()` then tries to *call* that float. Properties are read like attributes: `t.f`.',
        },
        {
          type: 'learn',
          title: 'Setters validate',
          body: md`
            Add \`@name.setter\` to run code on **assignment**. That's the place for validation. Store the real value under \`_name\`; the leading underscore means "internal, use the property".

            \`self.price = price\` in \`__init__\` goes through the setter as well, so even new objects are validated. A property **without** a setter is read-only: assigning to it raises \`AttributeError\`.
          `,
          code: py`
            class Product:
                def __init__(self, name, price):
                    self.name = name
                    self.price = price    # runs the setter

                @property
                def price(self):
                    return self._price

                @price.setter
                def price(self, value):
                    if value < 0:
                        raise ValueError("negative price")
                    self._price = value

            p = Product("mug", 9.5)
            p.price = 12
            print(p.price)
            try:
                p.price = -1
            except ValueError as e:
                print("rejected:", e)
          `,
        },
        {
          type: 'blanks',
          prompt: 'Make `balance` a validated property.',
          code: py`
            class Account:
                def __init__(self, balance):
                    self._balance = balance

                ___
                def balance(self):
                    return self._balance

                @balance.___
                def balance(self, value):
                    if value < 0:
                        raise ValueError("negative")
                    self._balance = value
          `,
          bank: ['@property', 'setter', 'getter', '@staticmethod', 'property', '@balance'],
          answer: ['@property', 'setter'],
          tests: [
            { code: 'a = Account(5)\na.balance = 9\nassert a.balance == 9', name: 'assignment works' },
            { call: 'setattr(Account(1), "balance", -5)', raises: 'ValueError', name: 'negative balance is rejected' },
          ],
          explain: '`@property` creates the getter, and `@balance.setter` attaches the setter to that same property. Both methods must have the same name. `@balance.getter` would *replace* the getter with the two-argument function, leaving no setter at all.',
        },
        {
          type: 'code',
          title: 'Seats and pricing',
          prompt: md`
            Finish \`Subscription\` (the starter has the price table and \`__init__\`):

            - \`seats\` is a property. Assigning anything below 1 raises \`ValueError\`. This must also apply in the constructor.
            - \`monthly_cost\` is a **read-only** property: the plan's price × seats. It must always match the current seats.

            \`\`\`python
            s = Subscription("pro", 3)
            s.monthly_cost   # 36
            s.seats = 5
            s.monthly_cost   # 60
            Subscription("team", 0)   # ValueError
            \`\`\`
          `,
          starter: py`
            class Subscription:
                PRICES = {"free": 0, "pro": 12, "team": 20}

                def __init__(self, plan, seats):
                    self.plan = plan
                    self.seats = seats

                # add the seats property and setter

                # add the monthly_cost property
          `,
          solution: py`
            class Subscription:
                PRICES = {"free": 0, "pro": 12, "team": 20}

                def __init__(self, plan, seats):
                    self.plan = plan
                    self.seats = seats

                @property
                def seats(self):
                    return self._seats

                @seats.setter
                def seats(self, n):
                    if n < 1:
                        raise ValueError("min 1 seat")
                    self._seats = n

                @property
                def monthly_cost(self):
                    return self.PRICES[self.plan] * self.seats
          `,
          tests: [
            { call: 'Subscription("pro", 3).monthly_cost', expect: '36' },
            { code: 's = Subscription("team", 2)\ns.seats = 5\nassert s.monthly_cost == 100', name: 'cost follows the seats' },
            { call: 'Subscription("pro", 0)', raises: 'ValueError', name: 'constructor is validated' },
            { code: 's = Subscription("pro", 2)\ntry:\n    s.seats = -1\nexcept ValueError:\n    pass\nassert s.seats == 2', name: 'rejected value is not stored', hidden: true },
            { call: 'setattr(Subscription("pro", 1), "monthly_cost", 5)', raises: 'AttributeError', name: 'monthly_cost is read-only', hidden: true },
            { call: 'Subscription("free", 1).monthly_cost', expect: '0', hidden: true },
          ],
          hints: [
            'Copy the shape of the `Product.price` example: a getter returning `self._seats` and a setter that checks, then stores.',
            '`__init__` already does `self.seats = seats`, which calls your setter.',
            '`monthly_cost` needs only a getter: `return self.PRICES[self.plan] * self.seats`.',
          ],
          wrong: [
            py`
              class Subscription:
                  PRICES = {"free": 0, "pro": 12, "team": 20}

                  def __init__(self, plan, seats):
                      self.plan = plan
                      self.seats = seats
                      self.monthly_cost = self.PRICES[plan] * seats

                  @property
                  def seats(self):
                      return self._seats

                  @seats.setter
                  def seats(self, n):
                      if n < 1:
                          raise ValueError("min 1 seat")
                      self._seats = n
            `,
            py`
              class Subscription:
                  PRICES = {"free": 0, "pro": 12, "team": 20}

                  def __init__(self, plan, seats):
                      self.plan = plan
                      self._seats = seats

                  @property
                  def seats(self):
                      return self._seats

                  @seats.setter
                  def seats(self, n):
                      if n < 1:
                          raise ValueError("min 1 seat")
                      self._seats = n

                  @property
                  def monthly_cost(self):
                      return self.PRICES[self.plan] * self.seats
            `,
            py`
              class Subscription:
                  PRICES = {"free": 0, "pro": 12, "team": 20}

                  def __init__(self, plan, seats):
                      self.plan = plan
                      self.seats = seats

                  @property
                  def seats(self):
                      return self._seats

                  @seats.setter
                  def seats(self, n):
                      if n < 0:
                          raise ValueError("min 1 seat")
                      self._seats = n

                  @property
                  def monthly_cost(self):
                      return self.PRICES[self.plan] * self.seats
            `,
          ],
          explain: md`
            Two ideas working together: the **setter** guards the only way data gets in (including the constructor, because \`__init__\` assigns through it), and the **computed property** guarantees derived values can't drift. A cost stored once in \`__init__\` silently goes wrong the first time someone changes the seats. That's the kind of stale-data bug that ends up in billing reports.
          `,
        },
        {
          type: 'learn',
          title: '@classmethod and @staticmethod',
          body: md`
            A **classmethod** receives the class (\`cls\`) instead of an instance. Its main job is **alternative constructors** like \`from_string\` or \`from_dict\`: parse the input, then \`return cls(...)\`.

            A **staticmethod** receives neither. It's a plain function that lives in the class because it belongs there logically, like a validator.
          `,
          code: py`
            class Event:
                def __init__(self, user, action):
                    self.user = user
                    self.action = action

                @classmethod
                def from_string(cls, line):
                    user, action = line.split(",")
                    return cls(user.strip(), action.strip())

                @staticmethod
                def is_valid(line):
                    return line.count(",") == 1

            line = "u42, checkout"
            if Event.is_valid(line):
                e = Event.from_string(line)
                print(e.user, e.action)
          `,
        },
        {
          type: 'choice',
          prompt: 'Why does `from_string` end with `return cls(...)` instead of `return Event(...)`?',
          options: [
            'So subclasses get their own type back',
            'cls(...) runs faster than Event(...)',
            "Event isn't defined inside its class",
            'Classmethods must not use the class name',
          ],
          answer: 0,
          explain: '`cls` is whichever class the method was called on. `SpecialEvent.from_string(...)` passes `cls=SpecialEvent`, so the parsed object has the subclass type. Hard-coding `Event(...)` would always build a plain `Event`. The name *is* available inside methods, because methods run after the class exists.',
        },
        {
          type: 'code',
          title: 'Sensor readings from CSV',
          prompt: md`
            Write a class \`Reading\`:

            - \`Reading(sensor, value)\` stores \`sensor\` and \`value\`.
            - classmethod \`from_csv(line)\` parses \`"t-1, 21.5"\`: strip spaces around the sensor, convert the value to **float**, build the object with \`cls(...)\`.
            - staticmethod \`c_to_f(c)\` converts Celsius to Fahrenheit: \`c * 9 / 5 + 32\`.
            - \`repr\` looks like \`Reading('t-1', 21.5)\`.
          `,
          starter: py`
            class Reading:
                def __init__(self, sensor, value):
                    self.sensor = sensor
                    self.value = value
          `,
          solution: py`
            class Reading:
                def __init__(self, sensor, value):
                    self.sensor = sensor
                    self.value = value

                @classmethod
                def from_csv(cls, line):
                    sensor, value = line.split(",")
                    return cls(sensor.strip(), float(value))

                @staticmethod
                def c_to_f(c):
                    return c * 9 / 5 + 32

                def __repr__(self):
                    s, v = self.sensor, self.value
                    return f"Reading({s!r}, {v})"
          `,
          tests: [
            { call: 'repr(Reading.from_csv("t-1, 21.5"))', expect: '"Reading(\'t-1\', 21.5)"' },
            { call: 'repr(Reading.from_csv(" t-2 ,-3"))', expect: '"Reading(\'t-2\', -3.0)"', name: 'strips and converts to float' },
            { call: 'Reading.c_to_f(100)', expect: '212.0' },
            { call: 'Reading.c_to_f(-40)', expect: '-40.0', hidden: true },
            { code: 'r = Reading.from_csv("x,7")\nassert isinstance(r.value, float)', name: 'value is a float', hidden: true },
            { code: 'class Special(Reading):\n    pass\nassert type(Special.from_csv("a,1")) is Special', name: 'builds the object with cls(...)', hidden: true },
          ],
          hints: [
            'Decorate with `@classmethod` and take `cls` first: `def from_csv(cls, line):`.',
            '`sensor, value = line.split(",")`, then `return cls(sensor.strip(), float(value))`.',
            '`float(" 21.5")` already ignores surrounding spaces.',
          ],
          wrong: [
            py`
              class Reading:
                  def __init__(self, sensor, value):
                      self.sensor = sensor
                      self.value = value

                  @classmethod
                  def from_csv(cls, line):
                      sensor, value = line.split(",")
                      return cls(sensor, float(value))

                  @staticmethod
                  def c_to_f(c):
                      return c * 9 / 5 + 32

                  def __repr__(self):
                      s, v = self.sensor, self.value
                      return f"Reading({s!r}, {v})"
            `,
            py`
              class Reading:
                  def __init__(self, sensor, value):
                      self.sensor = sensor
                      self.value = value

                  @classmethod
                  def from_csv(cls, line):
                      sensor, value = line.split(",")
                      return Reading(sensor.strip(), float(value))

                  @staticmethod
                  def c_to_f(c):
                      return c * 9 / 5 + 32

                  def __repr__(self):
                      s, v = self.sensor, self.value
                      return f"Reading({s!r}, {v})"
            `,
          ],
          explain: md`
            \`from_csv\` keeps parsing in one place, so \`__init__\` stays simple and every caller gets the same cleaning rules. This is the pattern behind \`dict.fromkeys\`, \`datetime.fromisoformat\` and pandas' \`DataFrame.from_records\`. \`c_to_f\` doesn't need \`self\` or \`cls\`, so a staticmethod is the honest signature.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u09-l4',
      title: 'Inheritance & Polymorphism',
      summary: 'Reuse and specialise behaviour with subclasses, super() and shared interfaces.',
      steps: [
        {
          type: 'learn',
          title: 'Subclasses inherit',
          body: md`
            \`class Admin(User):\` creates a **subclass**. An \`Admin\` gets every method of \`User\`. It can add new ones, or **override** one by defining a method with the same name.

            Method lookup starts at the object's own class and walks up to its parents. So when the inherited \`describe\` calls \`self.can_delete()\`, an \`Admin\` runs *its own* version.
          `,
          code: py`
            class User:
                def __init__(self, name):
                    self.name = name

                def can_delete(self):
                    return False

                def describe(self):
                    ok = self.can_delete()
                    return f"{self.name} (delete: {ok})"

            class Admin(User):
                def can_delete(self):
                    return True

            print(User("bo").describe())
            print(Admin("ada").describe())
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            class Animal:
                def sound(self):
                    return "..."

                def speak(self):
                    return self.sound() * 2

            class Dog(Animal):
                def sound(self):
                    return "woof"

            class Puppy(Dog):
                pass

            print(Puppy().speak(), Animal().speak())
          `,
          answer: 'woofwoof ......',
          explain: '`Puppy` has no methods of its own. `speak` is found on `Animal`, but inside it `self.sound()` starts the lookup again from `Puppy`: `Puppy` → `Dog` (found, "woof"). A plain `Animal` uses its own `"..."`.',
        },
        {
          type: 'learn',
          title: 'super() extends the parent',
          body: md`
            If a subclass defines \`__init__\`, the parent's \`__init__\` is **not** called automatically. Call it with \`super().__init__(...)\`, then add the extra attributes.

            \`super().method()\` also lets an override *extend* the parent's version instead of copy-pasting it.
          `,
          code: py`
            class Employee:
                def __init__(self, name, salary):
                    self.name = name
                    self.salary = salary

                def monthly(self):
                    return self.salary / 12

            class Manager(Employee):
                def __init__(self, name, salary, bonus):
                    super().__init__(name, salary)
                    self.bonus = bonus

                def monthly(self):
                    base = super().monthly()
                    return base + self.bonus / 12

            m = Manager("ada", 120000, 24000)
            print(m.name, m.monthly())
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            class Base:
                def __init__(self):
                    self.items = []

            class Queue(Base):
                def __init__(self, name):
                    self.name = name

            q = Queue("jobs")
            q.items.append(1)
          `,
          options: [
            "AttributeError: 'Queue' object has no attribute 'items'",
            'It works: q.items is [1]',
            'TypeError: Base.__init__() missing 1 required positional argument',
            "NameError: name 'items' is not defined",
          ],
          answer: 0,
          checkOutput: true,
          explain: '`Queue.__init__` overrides `Base.__init__` completely, so `self.items = []` never runs. Add `super().__init__()` as the first line of `Queue.__init__`.',
        },
        {
          type: 'blanks',
          prompt: 'Complete `Square` so the program prints `square 3`.',
          code: py`
            class Shape:
                def __init__(self, name):
                    self.name = name

            class Square(Shape):
                def __init__(self, side):
                    ___().___("square")
                    self.side = side

            s = Square(3)
            print(s.name, s.side)
          `,
          bank: ['super', '__init__', 'self', 'Shape', 'init', 'parent'],
          answer: ['super', '__init__'],
          tests: [{ stdout: 'square 3\n' }],
          explain: '`super()` gives you the parent class\'s methods bound to the current object, so `super().__init__("square")` runs `Shape.__init__` on this square. `Shape()` would try to build a *separate* new Shape.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines so the program prints `Tom (9 lives)`.',
          lines: [
            'class Animal:',
            '    def __init__(self, name):',
            '        self.name = name.title()',
            'class Cat(Animal):',
            '    def __init__(self, name, lives=9):',
            '        super().__init__(name)',
            '        self.tag = f"{self.name} ({lives} lives)"',
            'print(Cat("tom").tag)',
          ],
          distractors: ['        Animal.__init__(name)', '    def __init__(name, lives=9):'],
          tests: [{ stdout: 'Tom (9 lives)\n' }],
          explain: '`class Cat(Animal)` needs `Animal` to exist already. Inside `Cat.__init__`, `super().__init__(name)` must run before `self.name` is used to build the tag. `Animal.__init__(name)` forgets to pass `self`.',
        },
        {
          type: 'learn',
          title: 'isinstance and polymorphism',
          body: md`
            \`isinstance(obj, Cls)\` is \`True\` for instances of \`Cls\` **or any subclass**, while \`type(obj) == Cls\` is exact. It also accepts a tuple: \`isinstance(x, (int, float))\`. Fun fact: \`bool\` is a subclass of \`int\`.

            **Polymorphism**: code that calls \`shape.area()\` works for *any* object with an \`area\` method. New types plug in without touching the loop. Prefer that over long \`if isinstance(...) elif ...\` chains.
          `,
          code: py`
            class Shape:
                pass

            class Rect(Shape):
                def __init__(self, w, h):
                    self.w, self.h = w, h

                def area(self):
                    return self.w * self.h

            class Circle(Shape):
                def __init__(self, r):
                    self.r = r

                def area(self):
                    return round(3.14159 * self.r ** 2, 2)

            shapes = [Rect(2, 3), Circle(1)]
            print([s.area() for s in shapes])
            r = shapes[0]
            print(isinstance(r, Shape), type(r) == Shape)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            class A:
                pass

            class B(A):
                pass

            b = B()
            print(isinstance(b, A), type(b) == A)
            print(isinstance(3.5, (int, float)))
            print(isinstance(True, int))
          `,
          answer: 'True False\nTrue\nTrue',
          explain: 'A `B` *is an* `A`, but its exact type is `B`. With a tuple, `isinstance` checks "any of these". And `True` is an `int` because `bool` subclasses `int`, which is why `sum([True, True, False])` is 2 (handy for counting).',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the overdraft account',
          prompt: md`
            \`Overdraft\` is an \`Account\` that may go up to \`limit\` **below zero**. Using it crashes. \`Account\` is fine. Fix the **two** bugs in \`Overdraft\`.

            \`\`\`python
            a = Overdraft("ada", 50)    # limit 100
            a.withdraw(120)
            a.balance                   # -70
            a.withdraw(40)              # ValueError
            \`\`\`
          `,
          starter: py`
            class Account:
                def __init__(self, owner, balance=0):
                    self.owner = owner
                    self.balance = balance

                def withdraw(self, amount):
                    if amount > self.balance:
                        raise ValueError("insufficient funds")
                    self.balance -= amount


            class Overdraft(Account):
                def __init__(self, owner, balance=0, limit=100):
                    self.limit = limit

                def withdraw(self, amount):
                    if amount > self.balance + limit:
                        raise ValueError("over limit")
                    self.balance -= amount
          `,
          solution: py`
            class Account:
                def __init__(self, owner, balance=0):
                    self.owner = owner
                    self.balance = balance

                def withdraw(self, amount):
                    if amount > self.balance:
                        raise ValueError("insufficient funds")
                    self.balance -= amount


            class Overdraft(Account):
                def __init__(self, owner, balance=0, limit=100):
                    super().__init__(owner, balance)
                    self.limit = limit

                def withdraw(self, amount):
                    if amount > self.balance + self.limit:
                        raise ValueError("over limit")
                    self.balance -= amount
          `,
          tests: [
            { code: 'a = Overdraft("ada", 50)\na.withdraw(120)\nassert a.balance == -70', name: 'can go below zero' },
            { code: 'a = Overdraft("ada", 50)\na.withdraw(120)\ntry:\n    a.withdraw(40)\n    ok = False\nexcept ValueError:\n    ok = True\nassert ok and a.balance == -70', name: 'stops at the limit' },
            { call: 'Overdraft("bo", 0, limit=20).owner', expect: '"bo"' },
            { code: 'a = Overdraft("x", 10, limit=5)\na.withdraw(15)\nassert a.balance == -5', name: 'exactly at the limit is allowed', hidden: true },
            { call: 'Account("x", 10).withdraw(11)', raises: 'ValueError', name: 'Account still refuses overdrafts', hidden: true },
          ],
          hints: [
            'Read the first error: which attribute is missing, and who should have set it?',
            'Call the parent constructor: `super().__init__(owner, balance)`.',
            '`limit` on its own is not defined inside `withdraw`. Which object holds it?',
          ],
          wrong: [
            py`
              class Account:
                  def __init__(self, owner, balance=0):
                      self.owner = owner
                      self.balance = balance

                  def withdraw(self, amount):
                      if amount > self.balance:
                          raise ValueError("insufficient funds")
                      self.balance -= amount


              class Overdraft(Account):
                  def __init__(self, owner, balance=0, limit=100):
                      self.limit = limit

                  def withdraw(self, amount):
                      if amount > self.balance + self.limit:
                          raise ValueError("over limit")
                      self.balance -= amount
            `,
            py`
              class Account:
                  def __init__(self, owner, balance=0):
                      self.owner = owner
                      self.balance = balance

                  def withdraw(self, amount):
                      if amount > self.balance:
                          raise ValueError("insufficient funds")
                      self.balance -= amount


              class Overdraft(Account):
                  def __init__(self, owner, balance=0, limit=100):
                      super().__init__(owner, balance)
                      self.limit = limit

                  def withdraw(self, amount):
                      if amount >= self.balance + self.limit:
                          raise ValueError("over limit")
                      self.balance -= amount
            `,
          ],
          explain: md`
            The subclass's \`__init__\` replaced the parent's, so \`owner\` and \`balance\` were never set. \`super().__init__(owner, balance)\` reuses the parent's setup instead of duplicating it. Then the override only changes the one rule that differs: how far down the balance may go.
          `,
        },
        {
          type: 'learn',
          title: 'Interfaces and duck typing',
          body: md`
            A base class can define an **interface**: methods every subclass must provide. The base version raises \`NotImplementedError\`, so a subclass that forgot to override fails loudly. (\`abc.ABC\` with \`@abstractmethod\` goes further and refuses to even create such an object.)

            **Duck typing**: Python doesn't *require* a shared base class. Anything with an \`.export()\` method can be used where an exporter is expected. "If it quacks like a duck, it's a duck."
          `,
          code: py`
            import json

            class Exporter:
                def export(self, rows):
                    raise NotImplementedError

            class CsvExporter(Exporter):
                def export(self, rows):
                    lines = [",".join(r) for r in rows]
                    return "\n".join(lines)

            class JsonLines:    # no base class
                def export(self, rows):
                    lines = [json.dumps(r) for r in rows]
                    return "\n".join(lines)

            rows = [["id", "v"], ["1", "a"]]
            for ex in [CsvExporter(), JsonLines()]:
                print(ex.export(rows))
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            class Notifier:
                def send(self, msg):
                    raise NotImplementedError("send")

                def alert(self, msg):
                    return self.send("ALERT: " + msg)

            class Email(Notifier):
                def sned(self, msg):
                    return "mail " + msg

            print(Email().alert("disk full"))
          `,
          options: ['NotImplementedError: send', 'mail ALERT: disk full', "AttributeError: 'Email' object has no attribute 'send'", 'None'],
          answer: 0,
          checkOutput: true,
          explain: 'The typo `sned` means `Email` never overrides `send`, so lookup finds `Notifier.send`, which raises. That is the point of the pattern: a forgotten (or misspelled) method fails immediately with a clear name instead of silently doing nothing.',
        },
        {
          type: 'code',
          title: 'Payment methods',
          prompt: md`
            The \`Payment\` base class is given. Write three subclasses that **only override \`fee()\`**:

            | class | fee |
            |---|---|
            | \`Card\` | 1.5 % of the amount |
            | \`PayPal\` | 0.35 plus 3.4 % of the amount |
            | \`BankTransfer\` | free |

            \`\`\`python
            Card(100).total()      # 101.5
            PayPal(100).total()    # 103.75
            \`\`\`
          `,
          starter: py`
            class Payment:
                def __init__(self, amount):
                    self.amount = amount

                def fee(self):
                    raise NotImplementedError

                def total(self):
                    return round(self.amount + self.fee(), 2)


            # write Card, PayPal and BankTransfer below
          `,
          solution: py`
            class Payment:
                def __init__(self, amount):
                    self.amount = amount

                def fee(self):
                    raise NotImplementedError

                def total(self):
                    return round(self.amount + self.fee(), 2)


            class Card(Payment):
                def fee(self):
                    return self.amount * 0.015


            class PayPal(Payment):
                def fee(self):
                    return 0.35 + self.amount * 0.034


            class BankTransfer(Payment):
                def fee(self):
                    return 0
          `,
          tests: [
            { call: 'Card(100).total()', expect: '101.5' },
            { call: 'PayPal(100).total()', expect: '103.75' },
            { call: 'BankTransfer(80).total()', expect: '80' },
            { call: 'all(isinstance(c(1), Payment) for c in (Card, PayPal, BankTransfer))', expect: 'True', name: 'all three inherit from Payment' },
            { call: 'Card(19.99).total()', hidden: true },
            { call: 'round(sum(p.total() for p in [Card(10), PayPal(10), BankTransfer(10)]), 2)', hidden: true, name: 'works polymorphically in one loop' },
            { call: 'Payment(10).total()', raises: 'NotImplementedError', hidden: true, name: 'base class still raises' },
          ],
          hints: [
            '`class Card(Payment):` then define only `def fee(self):`.',
            '1.5 % of the amount is `self.amount * 0.015`.',
            '`total()` is inherited and calls *your* `fee()` through `self`.',
          ],
          wrong: [
            py`
              class Payment:
                  def __init__(self, amount):
                      self.amount = amount

                  def fee(self):
                      raise NotImplementedError

                  def total(self):
                      return round(self.amount + self.fee(), 2)


              class Card(Payment):
                  def fee(self):
                      return self.amount * 0.015


              class PayPal(Payment):
                  def fee(self):
                      return 0.35 + 0.034


              class BankTransfer(Payment):
                  def fee(self):
                      return 0
            `,
            py`
              class Payment:
                  def __init__(self, amount):
                      self.amount = amount

                  def fee(self):
                      raise NotImplementedError

                  def total(self):
                      return round(self.amount + self.fee(), 2)


              class Card:
                  def __init__(self, amount):
                      self.amount = amount

                  def total(self):
                      return round(self.amount * 1.015, 2)


              class PayPal(Payment):
                  def fee(self):
                      return 0.35 + self.amount * 0.034


              class BankTransfer(Payment):
                  def fee(self):
                      return 0
            `,
          ],
          explain: md`
            This is the **template method** pattern: the base class owns the algorithm (\`total\`) and subclasses fill in one step (\`fee\`). Adding Apple Pay tomorrow means one tiny new class, and no checkout code changes. Real payment code would use integer cents (see the Money exercise) to avoid float rounding.
          `,
        },
        {
          type: 'code',
          title: 'A logger with timestamps',
          prompt: md`
            \`Logger\` is given. Write \`StampLogger(Logger)\`:

            - \`StampLogger(clock)\` calls the parent constructor and stores \`clock\`, a function that returns the current time as text.
            - It overrides \`format(msg)\` to put the time in front of **the parent's** formatting, reused with \`super()\`.

            \`\`\`python
            log = StampLogger(lambda: "09:00")
            log.log("disk full")
            log.lines   # ["09:00 [INFO] disk full"]
            \`\`\`
          `,
          starter: py`
            class Logger:
                def __init__(self):
                    self.lines = []

                def format(self, msg):
                    return f"[INFO] {msg}"

                def log(self, msg):
                    self.lines.append(self.format(msg))


            class StampLogger(Logger):
                pass
          `,
          solution: py`
            class Logger:
                def __init__(self):
                    self.lines = []

                def format(self, msg):
                    return f"[INFO] {msg}"

                def log(self, msg):
                    self.lines.append(self.format(msg))


            class StampLogger(Logger):
                def __init__(self, clock):
                    super().__init__()
                    self.clock = clock

                def format(self, msg):
                    base = super().format(msg)
                    return f"{self.clock()} {base}"
          `,
          tests: [
            { code: 'log = StampLogger(lambda: "09:00")\nlog.log("disk full")\nassert log.lines == ["09:00 [INFO] disk full"]', name: 'stamps each line' },
            { code: 'times = iter(["09:00", "09:05"])\nlog = StampLogger(lambda: next(times))\nlog.log("a")\nlog.log("b")\nassert log.lines == ["09:00 [INFO] a", "09:05 [INFO] b"]', name: 'asks the clock on every line' },
            { call: 'Logger().format("x")', expect: '"[INFO] x"', name: 'Logger is unchanged' },
            { call: 'isinstance(StampLogger(lambda: "t"), Logger)', expect: 'True', hidden: true },
            { code: 'Logger.format = lambda self, m: f"<{m}>"\nassert StampLogger(lambda: "t").format("x") == "t <x>"', name: "reuses the parent's format via super()", hidden: true },
          ],
          hints: [
            '`def __init__(self, clock):` starts with `super().__init__()`, otherwise `self.lines` never exists.',
            'In `format`, get the parent\'s text with `super().format(msg)`.',
            'Calling `self.format(msg)` inside `format` would call itself forever.',
          ],
          wrong: [
            py`
              class Logger:
                  def __init__(self):
                      self.lines = []

                  def format(self, msg):
                      return f"[INFO] {msg}"

                  def log(self, msg):
                      self.lines.append(self.format(msg))


              class StampLogger(Logger):
                  def __init__(self, clock):
                      self.clock = clock

                  def format(self, msg):
                      base = super().format(msg)
                      return f"{self.clock()} {base}"
            `,
            py`
              class Logger:
                  def __init__(self):
                      self.lines = []

                  def format(self, msg):
                      return f"[INFO] {msg}"

                  def log(self, msg):
                      self.lines.append(self.format(msg))


              class StampLogger(Logger):
                  def __init__(self, clock):
                      super().__init__()
                      self.clock = clock

                  def format(self, msg):
                      return f"{self.clock()} [INFO] {msg}"
            `,
          ],
          explain: md`
            Two uses of \`super()\` in one class: extending the constructor and extending a method. The inherited \`log\` calls \`self.format\`, which dispatches to *your* override. That's polymorphism inside the class hierarchy. Injecting \`clock\` instead of reading the real time makes the class deterministic and testable, a habit that pays off in every data pipeline test suite.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u09-l5',
      title: 'Dataclasses',
      summary: 'Typed records with free __init__, __repr__, ordering and validation.',
      steps: [
        {
          type: 'learn',
          title: '@dataclass writes the boilerplate',
          body: md`
            For classes that are mostly data, \`@dataclass\` generates \`__init__\`, \`__repr__\` and \`__eq__\` from the **annotated fields** in the class body. You can still add methods.

            The type hints document the fields but aren't enforced at runtime: \`Order("1", ...)\` would happily store a string.
          `,
          code: py`
            from dataclasses import dataclass

            @dataclass
            class Order:
                order_id: int
                product: str
                qty: int
                unit_price: float

                def total(self):
                    return self.qty * self.unit_price

            o = Order(1, "mug", 2, 8.5)
            print(o)
            print(o.total(), o == Order(1, "mug", 2, 8.5))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            from dataclasses import dataclass

            @dataclass
            class Point:
                x: int
                y: int

            p = Point(1, 2)
            q = Point(y=2, x=1)
            print(p == q, p is q)
            print(q)
          `,
          answer: 'True False\nPoint(x=1, y=2)',
          explain: 'The generated `__init__` accepts keyword arguments too. The generated `__eq__` compares the fields in order, so `p == q`, but they are still two separate objects. The repr lists fields in declaration order, not in the order you passed them.',
        },
        {
          type: 'learn',
          title: 'Defaults and default_factory',
          body: md`
            Fields with defaults must come **after** fields without, just like function parameters.

            For a mutable default (list, dict, set) write \`field(default_factory=list)\`. The factory runs once **per new object**. A plain \`= []\` is rejected with a \`ValueError\` when the class is created: dataclasses protect you from the shared-list bug of lesson 3.
          `,
          code: py`
            from dataclasses import dataclass, field

            @dataclass
            class Event:
                user_id: int
                name: str
                device: str = "mobile"
                tags: list = field(default_factory=list)

            e1 = Event(7, "search")
            e2 = Event(8, "purchase", "desktop")
            e1.tags.append("promo")
            print(e1)
            print(e2.tags)
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            from dataclasses import dataclass

            @dataclass
            class Basket:
                user: str
                items: list = []
          `,
          options: [
            "ValueError: mutable default <class 'list'> for field items is not allowed: use default_factory",
            'It works; all baskets share one list',
            'It works; each basket gets its own list',
            "TypeError: unhashable type: 'list'",
          ],
          answer: 0,
          checkOutput: true,
          explain: 'The error is raised when the class is *defined*, before any basket exists. Dataclasses refuse list, dict and set defaults because every instance would share that one object.',
        },
        {
          type: 'blanks',
          prompt: 'Give every basket its own list, so this prints `[\'tea\'] []`.',
          code: py`
            from dataclasses import dataclass, ___

            @dataclass
            class Basket:
                user: str
                items: list = field(___=list)

            a = Basket("ada")
            b = Basket("bo")
            a.items.append("tea")
            print(a.items, b.items)
          `,
          bank: ['field', 'default_factory', 'default', 'factory', 'list', 'dataclass'],
          answer: ['field', 'default_factory'],
          tests: [{ stdout: "['tea'] []\n" }],
          explain: '`default_factory=list` calls `list()` for each new Basket. `default=list` would store the `list` *class itself* as the value, and `a.items.append` would then fail.',
        },
        {
          type: 'learn',
          title: 'order=True and frozen=True',
          body: md`
            \`@dataclass(order=True)\` adds \`<\`, \`<=\`, \`>\`, \`>=\`. Objects compare **as tuples of their fields, in declaration order**, so put the sort key first.

            \`frozen=True\` makes instances immutable: assigning a field raises \`FrozenInstanceError\` (a kind of \`AttributeError\`). Frozen dataclasses also get a \`__hash__\`, so they can be set members and dict keys. That makes them perfect for records and grouping keys in data pipelines.
          `,
          code: py`
            from dataclasses import dataclass

            @dataclass(order=True, frozen=True)
            class Ver:
                major: int
                minor: int

            vs = [Ver(1, 10), Ver(1, 2), Ver(0, 9)]
            print(sorted(vs)[0], max(vs))
            print(len({Ver(1, 2), Ver(1, 2)}))
            try:
                vs[0].major = 2
            except AttributeError as e:
                print(type(e).__name__)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            from dataclasses import dataclass

            @dataclass(order=True)
            class Score:
                points: int
                name: str

            s = [Score(5, "bo"), Score(9, "al"),
                 Score(5, "ad")]
            print([x.name for x in sorted(s)])
            print(max(s).name)
          `,
          answer: "['ad', 'bo', 'al']\nal",
          explain: 'Objects compare like `(points, name)` tuples. The two 5s tie on points, so the name breaks the tie: "ad" < "bo". The highest points win `max` regardless of name.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            from dataclasses import dataclass

            @dataclass
            class Key:
                region: str
                day: int

            totals = {Key("eu", 1): 100}
          `,
          options: [
            "TypeError: cannot use 'Key' as a dict key (unhashable type: 'Key')",
            'It works: a dict with one entry',
            "AttributeError: 'Key' object has no attribute '__hash__'",
            "KeyError: Key(region='eu', day=1)",
          ],
          answer: 0,
          checkOutput: true,
          explain: 'A plain `@dataclass` defines `__eq__`, and (as in lesson 2) that switches off hashing, since a mutable object whose hash could change would get lost inside a dict. Use `@dataclass(frozen=True)` for keys.',
        },
        {
          type: 'learn',
          title: '__post_init__ validates',
          body: md`
            The generated \`__init__\` calls \`__post_init__(self)\` right after setting the fields. That's the place to **validate**, **normalise** (strip, lower-case) or **derive** fields. Mark derived fields with \`field(init=False)\` so they aren't constructor arguments.

            In a pipeline, this means bad records fail at the boundary with a clear message, instead of corrupting a report three steps later.
          `,
          code: py`
            from dataclasses import dataclass, field

            @dataclass
            class Order:
                product: str
                qty: int
                unit_price: float
                total: float = field(init=False)

                def __post_init__(self):
                    if self.qty <= 0:
                        raise ValueError("qty must be > 0")
                    name = self.product.strip()
                    self.product = name.lower()
                    t = self.qty * self.unit_price
                    self.total = round(t, 2)

            print(Order("  Mug ", 3, 8.9))
            try:
                Order("tea", 0, 2.5)
            except ValueError as e:
                print(e)
          `,
        },
        {
          type: 'output',
          prompt: 'Careful. What does this print?',
          code: py`
            from dataclasses import dataclass, field

            @dataclass
            class Line:
                qty: int
                price: float
                total: float = field(init=False)

                def __post_init__(self):
                    self.total = self.qty * self.price

            a = Line(2, 1.5)
            a.qty = 10
            print(a.total, a)
          `,
          answer: '3.0 Line(qty=10, price=1.5, total=3.0)',
          explain: '`__post_init__` runs once, at creation. Changing `qty` afterwards doesn\'t update `total`, so the record is now inconsistent. Either make the dataclass `frozen=True` (no changes allowed) or make `total` a `@property`.',
        },
        {
          type: 'code',
          title: 'Validated event records',
          prompt: md`
            Write a dataclass \`Event\` with fields \`user_id\` (int), \`event\` (str) and \`device\` (str, default \`"mobile"\`).

            In \`__post_init__\`: strip and lower-case \`event\`, then raise \`ValueError\` if it isn't in \`VALID\`.

            \`\`\`python
            Event(1, " Search ")
            # Event(user_id=1, event='search', device='mobile')
            Event(3, "logout")   # ValueError
            \`\`\`
          `,
          starter: py`
            from dataclasses import dataclass

            VALID = {"page_view", "search", "add_to_cart",
                     "checkout", "purchase"}

            # write the Event dataclass here
          `,
          solution: py`
            from dataclasses import dataclass

            VALID = {"page_view", "search", "add_to_cart",
                     "checkout", "purchase"}

            @dataclass
            class Event:
                user_id: int
                event: str
                device: str = "mobile"

                def __post_init__(self):
                    self.event = self.event.strip().lower()
                    if self.event not in VALID:
                        raise ValueError(self.event)
          `,
          tests: [
            { call: 'repr(Event(1, " Search "))', expect: '"Event(user_id=1, event=\'search\', device=\'mobile\')"' },
            { call: 'Event(2, "purchase", "desktop").device', expect: '"desktop"' },
            { call: 'Event(3, "logout")', raises: 'ValueError' },
            { call: 'Event(1, "search") == Event(1, "SEARCH ")', expect: 'True', hidden: true },
            { call: 'Event(4, "Add_To_Cart", device="tablet").event', expect: '"add_to_cart"', hidden: true },
            { call: 'Event(5, "")', raises: 'ValueError', hidden: true },
          ],
          hints: [
            'Fields: `user_id: int`, `event: str`, `device: str = "mobile"`.',
            'Normalise first, then validate. Otherwise `" Search "` is rejected.',
            '`if self.event not in VALID: raise ValueError(self.event)`',
          ],
          wrong: [
            py`
              from dataclasses import dataclass

              VALID = {"page_view", "search", "add_to_cart",
                       "checkout", "purchase"}

              @dataclass
              class Event:
                  user_id: int
                  event: str
                  device: str = "mobile"

                  def __post_init__(self):
                      if self.event not in VALID:
                          raise ValueError(self.event)
                      self.event = self.event.strip().lower()
            `,
            py`
              from dataclasses import dataclass

              VALID = {"page_view", "search", "add_to_cart",
                       "checkout", "purchase"}

              @dataclass
              class Event:
                  user_id: int
                  event: str
                  device: str = "mobile"

                  def __post_init__(self):
                      self.event = self.event.lower()
                      if self.event not in VALID:
                          raise ValueError(self.event)
            `,
          ],
          explain: md`
            **Normalise, then validate**: the order matters, because raw input is messy. Because the cleaned value is stored back on the record, equality and every later step see one canonical spelling. That's why \`Event(1, "search") == Event(1, "SEARCH ")\`.
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the order record',
          prompt: md`
            Every \`Order\` should get its **own** \`items\` list, and an unknown \`status\` (anything except \`"new"\` and \`"paid"\`) must raise \`ValueError\`. Right now the class can't even be created. Fix the **two** bugs.
          `,
          starter: py`
            from dataclasses import dataclass, field

            @dataclass
            class Order:
                order_id: int
                items: list = []
                status: str = "new"

                def __postinit__(self):
                    if self.status not in ("new", "paid"):
                        raise ValueError(self.status)
          `,
          solution: py`
            from dataclasses import dataclass, field

            @dataclass
            class Order:
                order_id: int
                items: list = field(default_factory=list)
                status: str = "new"

                def __post_init__(self):
                    if self.status not in ("new", "paid"):
                        raise ValueError(self.status)
          `,
          tests: [
            { code: 'a = Order(1)\nb = Order(2)\na.items.append("x")\nassert b.items == []', name: 'each order has its own items' },
            { call: 'Order(3, status="lost")', raises: 'ValueError', name: 'unknown status raises' },
            { call: 'Order(4, ["a"], "paid").status', expect: '"paid"' },
            { call: 'repr(Order(5))', expect: '"Order(order_id=5, items=[], status=\'new\')"', hidden: true },
          ],
          hints: [
            'The first error message tells you exactly what to use instead of `= []`.',
            'Look closely at the spelling of the validation method: it needs **two** words joined by underscores.',
          ],
          wrong: [py`
            from dataclasses import dataclass, field

            @dataclass
            class Order:
                order_id: int
                items: list = field(default_factory=list)
                status: str = "new"

                def __postinit__(self):
                    if self.status not in ("new", "paid"):
                        raise ValueError(self.status)
          `],
          explain: md`
            The second bug is the dangerous one: a misspelled \`__postinit__\` raises no error. It's just a normal method nobody calls, so validation silently never runs. Typos in dunder names fail *quietly*, so always test that your validation actually rejects bad input.
          `,
        },
        {
          type: 'code',
          title: 'Parse sales records',
          prompt: md`
            Raw sales lines look like \`"2025-11-02, 19.99"\`. Write:

            1. \`Sale\`: a **sortable** (by day, then amount) and **frozen** dataclass with \`day: str\` and \`amount: float\`.
            2. classmethod \`Sale.from_csv(line)\`: strip the day, convert the amount to float.
            3. \`parse(lines)\`: a **sorted** list of \`Sale\`, **skipping** malformed lines. A wrong number of fields or a non-numeric amount both raise \`ValueError\` while parsing.

            \`\`\`python
            parse(["2025-11-02, 5", "oops", "2025-11-01,9.5"])
            # [Sale(day='2025-11-01', amount=9.5),
            #  Sale(day='2025-11-02', amount=5.0)]
            \`\`\`
          `,
          starter: py`
            from dataclasses import dataclass

            class Sale:
                pass


            def parse(lines):
                pass
          `,
          solution: py`
            from dataclasses import dataclass

            @dataclass(order=True, frozen=True)
            class Sale:
                day: str
                amount: float

                @classmethod
                def from_csv(cls, line):
                    day, amount = line.split(",")
                    return cls(day.strip(), float(amount))


            def parse(lines):
                sales = []
                for line in lines:
                    try:
                        sales.append(Sale.from_csv(line))
                    except ValueError:
                        continue
                return sorted(sales)
          `,
          tests: [
            { call: '[(s.day, s.amount) for s in parse(["2025-11-02, 5", "2025-11-01,9.5"])]', expect: '[("2025-11-01", 9.5), ("2025-11-02", 5.0)]', name: 'parses and sorts' },
            { call: '[(s.day, s.amount) for s in parse(["oops", "2025-01-01,abc", "2025-01-02,3", "a,b,c"])]', expect: '[("2025-01-02", 3.0)]', name: 'skips malformed lines' },
            { call: 'setattr(Sale("d", 1.0), "amount", 2.0)', raises: 'AttributeError', name: 'Sale is frozen' },
            { call: 'Sale("2025-01-01", 5.0) < Sale("2025-01-01", 7.5)', expect: 'True' },
            { call: 'len({Sale("d", 1.0), Sale("d", 1.0)})', expect: '1', hidden: true, name: 'Sale is hashable' },
            { call: 'parse([])', expect: '[]', hidden: true },
            { call: '[s.amount for s in parse(["d,3", "d,1", "d,2"])]', expect: '[1.0, 2.0, 3.0]', hidden: true, name: 'same day sorts by amount' },
            { call: '(lambda s: (s.day, s.amount))(Sale.from_csv(" 2025-02-01 , 7 "))', expect: '("2025-02-01", 7.0)', hidden: true, name: 'from_csv strips the day' },
          ],
          hints: [
            '`@dataclass(order=True, frozen=True)` above `class Sale:`, fields `day: str` and `amount: float`.',
            'Inside `parse`, wrap `Sale.from_csv(line)` in `try` / `except ValueError`.',
            '`order=True` makes `sorted(sales)` work: day first, then amount.',
          ],
          wrong: [
            py`
              from dataclasses import dataclass

              @dataclass(order=True, frozen=True)
              class Sale:
                  day: str
                  amount: float

                  @classmethod
                  def from_csv(cls, line):
                      day, amount = line.split(",")
                      return cls(day.strip(), float(amount))


              def parse(lines):
                  sales = []
                  for line in lines:
                      try:
                          sales.append(Sale.from_csv(line))
                      except ValueError:
                          continue
                  return sales
            `,
            py`
              from dataclasses import dataclass

              @dataclass(order=True)
              class Sale:
                  day: str
                  amount: float

                  @classmethod
                  def from_csv(cls, line):
                      day, amount = line.split(",")
                      return cls(day.strip(), float(amount))


              def parse(lines):
                  sales = []
                  for line in lines:
                      try:
                          sales.append(Sale.from_csv(line))
                      except ValueError:
                          continue
                  return sorted(sales)
            `,
            py`
              from dataclasses import dataclass

              @dataclass(order=True, frozen=True)
              class Sale:
                  day: str
                  amount: float

                  @classmethod
                  def from_csv(cls, line):
                      day, amount = line.split(",")
                      return cls(day, float(amount))


              def parse(lines):
                  sales = []
                  for line in lines:
                      try:
                          sales.append(Sale.from_csv(line))
                      except ValueError:
                          continue
                  return sorted(sales)
            `,
          ],
          explain: md`
            This is a miniature ingestion step: **parse at the boundary, skip (or quarantine) bad rows, emit typed immutable records**. ISO dates (\`YYYY-MM-DD\`) sort correctly as strings, so \`order=True\` gives chronological order for free. In production you would also *count* the skipped lines, because a silent drop of 30 % of the input is a bug too.
          `,
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u09-l6',
      title: 'Designing Objects',
      summary: 'Composition, iterable containers and an LRU cache on an ordered dict.',
      steps: [
        {
          type: 'learn',
          title: 'Composition: has-a beats is-a',
          body: md`
            Inheritance says "a Manager **is an** Employee". **Composition** says "a Cart **has** LineItems": an object holds other objects and delegates work to them.

            Prefer composition when the relationship is "has-a", or when you'd only inherit to reuse code. \`class Cart(list)\` would expose every list method, so \`cart.clear()\` or \`cart.insert(0, junk)\` could bypass your rules. Small objects with one job each are easier to test and to change.
          `,
          code: py`
            from dataclasses import dataclass

            @dataclass
            class LineItem:
                sku: str
                price: float
                qty: int = 1

                def subtotal(self):
                    return self.price * self.qty

            class Cart:
                def __init__(self):
                    self.items = []

                def add(self, item):
                    self.items.append(item)

                def total(self):
                    s = sum(i.subtotal() for i in self.items)
                    return round(s, 2)

            cart = Cart()
            cart.add(LineItem("mug", 8.5, 2))
            cart.add(LineItem("tea", 4.25))
            print(cart.total())
          `,
        },
        {
          type: 'choice',
          prompt: 'A `Car` needs the start-up logic that lives in `Engine`. Which design fits best?',
          options: [
            'Car stores an Engine in an attribute',
            'Car inherits from Engine',
            'Engine inherits from Car',
            'Copy Engine.start() into Car',
          ],
          answer: 0,
          explain: 'A car *has* an engine, it isn\'t one. Composition lets you swap in an `ElectricEngine` later, test the engine on its own, and keep `Car`\'s interface free of engine internals. Copy-paste creates two versions that drift apart.',
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            class Engine:
                def __init__(self):
                    self.running = False

                def start(self):
                    self.running = True
                    return "vroom"

            class Car:
                def __init__(self):
                    self.engine = Engine()

                def start(self):
                    return self.engine.start().upper()

            a, b = Car(), Car()
            print(a.start(), b.engine.running)
          `,
          answer: 'VROOM False',
          explain: '`Car.start` **delegates** to its engine and post-processes the result. Each car builds its own `Engine()` in `__init__`, so starting `a` leaves `b`\'s engine off.',
        },
        {
          type: 'learn',
          title: 'Iterable objects',
          body: md`
            \`for x in obj\` first calls \`iter(obj)\`, which calls \`obj.__iter__()\`. It must return an **iterator**. The easy way is to hand out the iterator of a list you hold: \`return iter(self.items)\`. Then \`for\`, \`list()\`, \`sum()\`, \`sorted()\`, \`max()\`, unpacking and even \`in\` all work.

            \`__getitem__(self, i)\` powers \`obj[i]\`. Delegate to the list and negative indexes and slices come for free. (Unit 10 shows how to write \`__iter__\` with \`yield\`.)
          `,
          code: py`
            class Playlist:
                def __init__(self, songs):
                    self.songs = list(songs)

                def __iter__(self):
                    return iter(self.songs)

                def __getitem__(self, i):
                    return self.songs[i]

                def __len__(self):
                    return len(self.songs)

            p = Playlist(["intro", "drop", "outro"])
            for s in p:
                print(s, end=" ")
            print()
            print(p[0], p[-1], p[1:], len(p))
          `,
        },
        {
          type: 'output',
          prompt: 'Only `__iter__` is defined. What does this print?',
          code: py`
            class Batch:
                def __init__(self, rows):
                    self.rows = rows

                def __iter__(self):
                    return iter(self.rows)

            b = Batch([3, 1, 2])
            print(sum(b), sorted(b), max(b))
            print(2 in b, list(b)[::-1])
          `,
          answer: '6 [1, 2, 3] 3\nTrue [2, 1, 3]',
          explain: 'Every one of these built-ins just loops over the object, and `__iter__` gives each one a fresh iterator. `in` falls back to looping when there is no `__contains__`. `list(b)[::-1]` reverses the *original* order 3, 1, 2.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            class Team:
                def __init__(self, names):
                    self.names = names

            for n in Team(["ada", "bo"]):
                print(n)
          `,
          options: ["TypeError: 'Team' object is not iterable", 'ada\nbo', "AttributeError: 'Team' object has no attribute 'names'", 'Nothing is printed'],
          answer: 0,
          checkOutput: true,
          explain: 'Holding a list doesn\'t make the object itself iterable: Python doesn\'t guess which attribute you mean. Add `def __iter__(self): return iter(self.names)`.',
        },
        {
          type: 'blanks',
          prompt: 'Make `Deck` iterable so this prints `[\'A\', \'K\', \'Q\'] K`.',
          code: py`
            class Deck:
                def __init__(self, cards):
                    self.cards = list(cards)

                def ___(self):
                    return ___(self.cards)

                def __getitem__(self, i):
                    return self.cards[i]

            d = Deck("AKQ")
            print(list(d), d[1])
          `,
          bank: ['__iter__', 'iter', 'list', '__next__', 'next', 'yield'],
          answer: ['__iter__', 'iter'],
          tests: [{ stdout: "['A', 'K', 'Q'] K\n" }],
          explain: '`__iter__` must return an **iterator**, an object with `__next__`. A list is iterable but not an iterator, so `return list(self.cards)` fails with "iter() returned non-iterator". `iter(self.cards)` returns a list iterator.',
        },
        {
          type: 'code',
          title: 'Inventory model',
          prompt: md`
            \`Product\` is given. Write \`Inventory\`, a container of products:

            - \`add(product)\` stores it under its \`sku\`. Re-adding a sku **replaces** the old product.
            - \`inv["A1"]\` returns that product (\`KeyError\` if unknown).
            - \`len(inv)\` is the number of distinct products.
            - \`for p in inv\` yields the products in the order they were first added.
            - \`low_stock(limit=5)\` returns the skus with \`qty < limit\`, in that same order.

            \`\`\`python
            inv = Inventory()
            inv.add(Product("A1", "mug", 3))
            inv.add(Product("B2", "tea", 40))
            inv["B2"].name      # "tea"
            inv.low_stock()     # ["A1"]
            \`\`\`
          `,
          setup: py`
            def demo():
                inv = Inventory()
                inv.add(Product("A1", "mug", 3))
                inv.add(Product("B2", "tea", 40))
                inv.add(Product("C3", "pot", 5))
                return inv
          `,
          starter: py`
            from dataclasses import dataclass

            @dataclass
            class Product:
                sku: str
                name: str
                qty: int


            class Inventory:
                def __init__(self):
                    self.products = {}
          `,
          solution: py`
            from dataclasses import dataclass

            @dataclass
            class Product:
                sku: str
                name: str
                qty: int


            class Inventory:
                def __init__(self):
                    self.products = {}

                def add(self, product):
                    self.products[product.sku] = product

                def __getitem__(self, sku):
                    return self.products[sku]

                def __len__(self):
                    return len(self.products)

                def __iter__(self):
                    return iter(self.products.values())

                def low_stock(self, limit=5):
                    return [p.sku for p in self
                            if p.qty < limit]
          `,
          tests: [
            { call: 'demo()["B2"].name', expect: '"tea"', name: 'inv["B2"] returns the product' },
            { call: 'len(demo())', expect: '3', name: 'len() counts products' },
            { call: '[p.name for p in demo()]', expect: '["mug", "tea", "pot"]', name: 'iterates products in insertion order' },
            { call: 'demo().low_stock()', expect: '["A1"]', name: 'low_stock() uses qty < 5' },
            { call: 'demo().low_stock(10)', expect: '["A1", "C3"]', hidden: true },
            { call: 'demo()["Z9"]', raises: 'KeyError', hidden: true },
            { code: 'inv = demo()\ninv.add(Product("A1", "big mug", 9))\nassert len(inv) == 3\nassert inv["A1"].name == "big mug"\nassert inv.low_stock() == []', name: 're-adding a sku replaces it', hidden: true },
            { call: 'list(Inventory())', expect: '[]', hidden: true },
          ],
          hints: [
            'A dict `sku → product` gives you replacement, lookup and insertion order at once.',
            '`__iter__` should iterate the **products**, which are the dict\'s values: `iter(self.products.values())`.',
            '`low_stock` can loop over `self`, because your class is iterable now.',
          ],
          wrong: [
            py`
              from dataclasses import dataclass

              @dataclass
              class Product:
                  sku: str
                  name: str
                  qty: int


              class Inventory:
                  def __init__(self):
                      self.products = {}

                  def add(self, product):
                      self.products[product.sku] = product

                  def __getitem__(self, sku):
                      return self.products[sku]

                  def __len__(self):
                      return len(self.products)

                  def __iter__(self):
                      return iter(self.products)

                  def low_stock(self, limit=5):
                      return [s for s, p in self.products.items()
                              if p.qty < limit]
            `,
            py`
              from dataclasses import dataclass

              @dataclass
              class Product:
                  sku: str
                  name: str
                  qty: int


              class Inventory:
                  def __init__(self):
                      self.products = []

                  def add(self, product):
                      self.products.append(product)

                  def __getitem__(self, sku):
                      for p in self.products:
                          if p.sku == sku:
                              return p
                      raise KeyError(sku)

                  def __len__(self):
                      return len(self.products)

                  def __iter__(self):
                      return iter(self.products)

                  def low_stock(self, limit=5):
                      return [p.sku for p in self
                              if p.qty < limit]
            `,
            py`
              from dataclasses import dataclass

              @dataclass
              class Product:
                  sku: str
                  name: str
                  qty: int


              class Inventory:
                  def __init__(self):
                      self.products = {}

                  def add(self, product):
                      self.products[product.sku] = product

                  def __getitem__(self, sku):
                      return self.products[sku]

                  def __len__(self):
                      return len(self.products)

                  def __iter__(self):
                      return iter(self.products.values())

                  def low_stock(self, limit=5):
                      return [p.sku for p in self
                              if p.qty <= limit]
            `,
          ],
          explain: md`
            \`Inventory\` **composes** a dict and exposes a deliberate, small interface: four dunders plus one business method. Callers can't reach in and break invariants (like two products with the same sku). The dict gives O(1) lookup by sku; the list version needs an O(n) scan per lookup and gets the replace rule wrong.
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the report',
          prompt: md`
            \`Report\` collects \`(name, value)\` rows. \`add\` should return the report itself so calls can be **chained**, looping over a report should yield its rows, and \`len()\` should count them. There are **three** bugs.

            \`\`\`python
            r = Report("kpis").add("dau", 120).add("mau", 900)
            len(r)    # 2
            dict(r)   # {"dau": 120, "mau": 900}
            \`\`\`
          `,
          starter: py`
            class Report:
                def __init__(self, title):
                    self.title = title
                    self.rows = []

                def add(self, name, value):
                    self.rows.append((name, value))

                def __iter__(self):
                    return self.rows

                def __len__(self):
                    return len(self.rows) - 1
          `,
          solution: py`
            class Report:
                def __init__(self, title):
                    self.title = title
                    self.rows = []

                def add(self, name, value):
                    self.rows.append((name, value))
                    return self

                def __iter__(self):
                    return iter(self.rows)

                def __len__(self):
                    return len(self.rows)
          `,
          tests: [
            { code: 'r = Report("k").add("dau", 120).add("mau", 900)\nassert len(r) == 2', name: 'add() can be chained' },
            { call: 'dict(Report("k").add("a", 1).add("b", 2))', expect: '{"a": 1, "b": 2}' },
            { call: 'len(Report("empty"))', expect: '0' },
            { call: 'list(Report("x").add("a", 1))', expect: '[("a", 1)]', hidden: true },
            { call: 'sorted(Report("x").add("b", 2).add("a", 1))', expect: '[("a", 1), ("b", 2)]', hidden: true },
          ],
          hints: [
            'What does `add` return right now? A method without `return` returns `None`.',
            '`__iter__` must return an iterator, not a list.',
            'Count again: how many rows does `len` report for an empty report?',
          ],
          wrong: [
            py`
              class Report:
                  def __init__(self, title):
                      self.title = title
                      self.rows = []

                  def add(self, name, value):
                      self.rows.append((name, value))

                  def __iter__(self):
                      return iter(self.rows)

                  def __len__(self):
                      return len(self.rows)
            `,
            py`
              class Report:
                  def __init__(self, title):
                      self.title = title
                      self.rows = []

                  def add(self, name, value):
                      self.rows.append((name, value))
                      return self

                  def __iter__(self):
                      return iter(self.rows)

                  def __len__(self):
                      return len(self.rows) - 1
            `,
          ],
          explain: md`
            Returning \`self\` from a mutating method enables **method chaining**, the "fluent" style you'll see in pandas (\`df.dropna().sort_values(...)\`) and query builders. And because \`__iter__\` yields \`(name, value)\` pairs, \`dict(report)\` works with no extra code: Python's built-ins compose with any well-behaved iterable.
          `,
        },
        {
          type: 'learn',
          title: 'An LRU cache on an OrderedDict',
          body: md`
            A cache keeps recent results so you don't recompute or refetch them. With limited room, evict the **least recently used** (LRU) entry.

            \`collections.OrderedDict\` is a dict that also keeps a linked list of its keys, with two O(1) helpers: \`move_to_end(key)\` marks a key as the most recent, and \`popitem(last=False)\` removes the oldest.

            "Design an LRU cache" is a top interview question (LeetCode 146). The textbook answer is a hash map plus a doubly linked list, which is exactly what \`OrderedDict\` is inside.
          `,
          code: py`
            from collections import OrderedDict

            class LRU:
                def __init__(self, capacity):
                    self.capacity = capacity
                    self.data = OrderedDict()

                def get(self, key):
                    if key not in self.data:
                        return None
                    self.data.move_to_end(key)
                    return self.data[key]

                def put(self, key, value):
                    self.data[key] = value
                    self.data.move_to_end(key)
                    if len(self.data) > self.capacity:
                        self.data.popitem(last=False)

            c = LRU(2)
            c.put("a", 1)
            c.put("b", 2)
            c.get("a")        # a is now the most recent
            c.put("c", 3)     # evicts b
            print(list(c.data))
          `,
        },
        {
          type: 'output',
          prompt: 'The `LRU` class from the card is already defined. What does this print?',
          setup: py`
            from collections import OrderedDict

            class LRU:
                def __init__(self, capacity):
                    self.capacity = capacity
                    self.data = OrderedDict()

                def get(self, key):
                    if key not in self.data:
                        return None
                    self.data.move_to_end(key)
                    return self.data[key]

                def put(self, key, value):
                    self.data[key] = value
                    self.data.move_to_end(key)
                    if len(self.data) > self.capacity:
                        self.data.popitem(last=False)
          `,
          code: py`
            c = LRU(2)
            c.put("x", 1)
            c.put("y", 2)
            c.put("x", 10)
            c.put("z", 3)
            print(c.get("y"), c.get("x"), list(c.data))
          `,
          answer: "None 10 ['z', 'x']",
          explain: 'Re-putting `x` moves it to the end: order `y, x`. Adding `z` overflows, so the oldest, `y`, is evicted. `get("y")` misses. `get("x")` hits and moves `x` to the end, so the final order is `z, x`.',
        },
        {
          type: 'code',
          title: 'LRU cache',
          prompt: md`
            Implement the classic interview \`LRUCache(capacity)\`:

            - \`get(key)\` returns the value, or \`-1\` if the key is missing. A hit makes that key the **most recently used**.
            - \`put(key, value)\` inserts or updates (an update counts as a use too). If the cache now holds more than \`capacity\` keys, evict the least recently used one and append its key to \`self.evicted\`.

            Both must be O(1).

            \`\`\`python
            c = LRUCache(2)
            c.put(1, 1)
            c.put(2, 2)
            c.get(1)      # 1
            c.put(3, 3)   # evicts 2
            c.get(2)      # -1
            \`\`\`
          `,
          starter: py`
            from collections import OrderedDict

            class LRUCache:
                def __init__(self, capacity):
                    self.capacity = capacity
                    self.data = OrderedDict()
                    self.evicted = []

                def get(self, key):
                    pass

                def put(self, key, value):
                    pass

                def __len__(self):
                    return len(self.data)
          `,
          solution: py`
            from collections import OrderedDict

            class LRUCache:
                def __init__(self, capacity):
                    self.capacity = capacity
                    self.data = OrderedDict()
                    self.evicted = []

                def get(self, key):
                    if key not in self.data:
                        return -1
                    self.data.move_to_end(key)
                    return self.data[key]

                def put(self, key, value):
                    self.data[key] = value
                    self.data.move_to_end(key)
                    if len(self.data) > self.capacity:
                        old, _ = self.data.popitem(last=False)
                        self.evicted.append(old)

                def __len__(self):
                    return len(self.data)
          `,
          tests: [
            { code: 'c = LRUCache(2)\nc.put(1, 1)\nc.put(2, 2)\nassert c.get(1) == 1\nc.put(3, 3)\nassert c.get(2) == -1\nc.put(4, 4)\nassert c.get(1) == -1\nassert c.get(3) == 3\nassert c.get(4) == 4\nassert c.evicted == [2, 1]', name: 'LeetCode example' },
            { code: 'c = LRUCache(2)\nc.put("a", 1)\nc.put("b", 2)\nc.put("a", 9)\nc.put("c", 3)\nassert c.get("a") == 9\nassert c.get("b") == -1\nassert len(c) == 2', name: 'an update refreshes the key' },
            { code: 'c = LRUCache(1)\nc.put("x", 1)\nc.put("y", 2)\nassert c.get("x") == -1\nassert c.get("y") == 2\nassert c.evicted == ["x"]', name: 'capacity 1', hidden: true },
            { code: 'c = LRUCache(2)\nassert c.get("nope") == -1\nassert len(c) == 0', name: 'a miss adds nothing', hidden: true },
            { code: 'c = LRUCache(3)\nfor k in "abc":\n    c.put(k, k)\nc.get("a")\nc.get("b")\nc.put("d", "d")\nc.put("e", "e")\nassert c.evicted == ["c", "a"]', name: 'evicts in least-recent order', hidden: true },
          ],
          hints: [
            'A hit: `self.data.move_to_end(key)`, then return the value.',
            'In `put`, assign the value, then `move_to_end(key)`: assigning an existing key keeps its old position.',
            '`self.data.popitem(last=False)` removes and returns the oldest `(key, value)` pair.',
          ],
          wrong: [
            py`
              from collections import OrderedDict

              class LRUCache:
                  def __init__(self, capacity):
                      self.capacity = capacity
                      self.data = OrderedDict()
                      self.evicted = []

                  def get(self, key):
                      if key not in self.data:
                          return -1
                      return self.data[key]

                  def put(self, key, value):
                      self.data[key] = value
                      self.data.move_to_end(key)
                      if len(self.data) > self.capacity:
                          old, _ = self.data.popitem(last=False)
                          self.evicted.append(old)

                  def __len__(self):
                      return len(self.data)
            `,
            py`
              from collections import OrderedDict

              class LRUCache:
                  def __init__(self, capacity):
                      self.capacity = capacity
                      self.data = OrderedDict()
                      self.evicted = []

                  def get(self, key):
                      if key not in self.data:
                          return -1
                      self.data.move_to_end(key)
                      return self.data[key]

                  def put(self, key, value):
                      self.data[key] = value
                      if len(self.data) > self.capacity:
                          old, _ = self.data.popitem(last=False)
                          self.evicted.append(old)

                  def __len__(self):
                      return len(self.data)
            `,
            py`
              from collections import OrderedDict

              class LRUCache:
                  def __init__(self, capacity):
                      self.capacity = capacity
                      self.data = OrderedDict()
                      self.evicted = []

                  def get(self, key):
                      if key not in self.data:
                          return -1
                      self.data.move_to_end(key)
                      return self.data[key]

                  def put(self, key, value):
                      self.data[key] = value
                      self.data.move_to_end(key)
                      if len(self.data) > self.capacity:
                          old, _ = self.data.popitem()
                          self.evicted.append(old)

                  def __len__(self):
                      return len(self.data)
            `,
          ],
          explain: md`
            Every operation is O(1): a hash lookup plus relinking one node of the internal list. A plain dict also keeps insertion order, and \`d[k] = d.pop(k)\` moves a key to the end, but evicting with \`next(iter(d))\` gets slower as deleted slots pile up at the front, so it's only O(1) on paper. Interviewers usually want the hash map + doubly linked list built by hand (Unit 17), so be ready to explain that \`OrderedDict\` *is* that structure. To cache a function's results, use \`functools.lru_cache\` (Unit 10).
          `,
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u09-exam',
    title: 'Object-Oriented Python Exam',
    minutes: 25,
    intro: 'Classes, dunder methods, properties, inheritance and dataclasses, combined into interview-style tasks. No hints and no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          class Repo:
              tags = []
              stars = 0

              def __init__(self, name):
                  self.name = name

              def star(self):
                  self.stars += 1
                  self.tags.append(self.name)

          a, b = Repo("a"), Repo("b")
          a.star()
          a.star()
          b.star()
          print(a.stars, b.stars, Repo.stars, len(b.tags))
        `,
        options: ['2 1 0 3', '3 3 3 3', '2 1 3 3', '2 1 0 1'],
        answer: 0,
        checkOutput: true,
        explain: '`self.stars += 1` reads the class value and *assigns* an instance attribute, so each repo counts on its own and `Repo.stars` stays 0. `self.tags.append` *mutates* the one shared class list, so it holds all 3 names.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          class Base:
              def __init__(self):
                  self.log = []
                  self.setup()

              def setup(self):
                  self.log.append("base")

          class Child(Base):
              def setup(self):
                  super().setup()
                  self.log.append("child")

          print(Child().log, Base().log)
        `,
        answer: "['base', 'child'] ['base']",
        explain: '`Child` inherits `__init__`, but `self.setup()` inside it dispatches on the real object\'s class, so it runs `Child.setup`, which extends the parent version via `super()`.',
      },
      {
        type: 'choice',
        prompt: 'The first `print` works. What happens on the **last** line?',
        code: py`
          class Meters:
              def __init__(self, v):
                  self.v = v

              def __add__(self, other):
                  if isinstance(other, Meters):
                      other = other.v
                  return Meters(self.v + other)

              def __repr__(self):
                  return f"{self.v}m"

          print(Meters(2) + Meters(3), Meters(2) + 3)
          print(sum([Meters(1), Meters(2)]))
        `,
        options: [
          "TypeError: unsupported operand type(s) for +: 'int' and 'Meters'",
          '3m',
          '0m',
          "AttributeError: 'int' object has no attribute 'v'",
        ],
        answer: 0,
        checkOutput: true,
        explain: '`sum` starts with `0 + Meters(1)`. `int.__add__` returns `NotImplemented`, and Python then looks for `Meters.__radd__`, which doesn\'t exist. `Meters.__add__` is never called for an int on the *left*.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          from dataclasses import dataclass, field

          @dataclass
          class Batch:
              name: str
              rows: list = field(default_factory=list)
              size: int = field(init=False)

              def __post_init__(self):
                  self.size = len(self.rows)

          a = Batch("a", [1, 2])
          b = Batch("b")
          a.rows.append(3)
          print(a.size, len(a.rows), b.rows,
                a == Batch("a", [1, 2, 3]))
        `,
        answer: '2 3 [] False',
        explain: '`size` was computed once in `__post_init__` (2) and went stale after the append. `b` gets its own empty list. The generated `__eq__` compares *all* fields, including `size`: 2 vs 3, so `False`.',
      },
      {
        type: 'blanks',
        prompt: 'Complete the class so it prints `100.0 32.0`.',
        code: py`
          class Temperature:
              def __init__(self, c):
                  self.c = c

              @___
              def f(self):
                  return self.c * 9 / 5 + 32

              @___
              def from_f(cls, f):
                  return cls((f - 32) * 5 / 9)

          t = Temperature.from_f(212)
          print(t.c, Temperature(0).f)
        `,
        bank: ['property', 'classmethod', 'staticmethod', 'setter', 'dataclass'],
        answer: ['property', 'classmethod'],
        tests: [{ stdout: '100.0 32.0\n' }],
        explain: '`f` is read without parentheses, so it is a property. `from_f` takes `cls` and builds a new instance: an alternative constructor, i.e. a classmethod.',
      },
      {
        type: 'code',
        title: 'Bank account',
        prompt: md`
          Implement \`BankAccount\`:

          - \`BankAccount(owner, balance=0)\`. A negative opening balance raises \`ValueError\`.
          - \`balance\` is a **read-only** property.
          - \`deposit(amount)\` / \`withdraw(amount)\`: the amount must be > 0, and you can't withdraw more than the balance. Invalid calls raise \`ValueError\` and **change nothing**.
          - \`history\`: a list of \`("deposit", amount)\` / \`("withdraw", amount)\` tuples, successful operations only.
          - \`transfer_to(other, amount)\` moves money to another account using \`withdraw\` and \`deposit\`. If it fails, **neither** account changes.
        `,
        starter: py`
          class BankAccount:
              def __init__(self, owner, balance=0):
                  pass
        `,
        solution: py`
          class BankAccount:
              def __init__(self, owner, balance=0):
                  if balance < 0:
                      raise ValueError("negative balance")
                  self.owner = owner
                  self._balance = balance
                  self.history = []

              @property
              def balance(self):
                  return self._balance

              def deposit(self, amount):
                  if amount <= 0:
                      raise ValueError("amount <= 0")
                  self._balance += amount
                  self.history.append(("deposit", amount))

              def withdraw(self, amount):
                  if amount <= 0:
                      raise ValueError("amount <= 0")
                  if amount > self._balance:
                      raise ValueError("insufficient funds")
                  self._balance -= amount
                  self.history.append(("withdraw", amount))

              def transfer_to(self, other, amount):
                  self.withdraw(amount)
                  other.deposit(amount)
        `,
        tests: [
          { code: 'a = BankAccount("ada", 100)\na.deposit(50)\na.withdraw(30)\nassert a.balance == 120\nassert a.history == [("deposit", 50), ("withdraw", 30)]', name: 'deposit, withdraw and history' },
          { call: 'BankAccount("bo", 10).withdraw(11)', raises: 'ValueError', name: 'cannot overdraw' },
          { call: 'BankAccount("bo").deposit(0)', raises: 'ValueError', hidden: true },
          { call: 'BankAccount("bo", 50).withdraw(-5)', raises: 'ValueError', hidden: true, name: 'negative withdrawals are rejected' },
          { call: 'BankAccount("bo", -5)', raises: 'ValueError', hidden: true },
          { code: 'a = BankAccount("x", 10)\ntry:\n    a.withdraw(50)\nexcept ValueError:\n    pass\nassert a.balance == 10 and a.history == []', name: 'a failed withdraw changes nothing', hidden: true },
          { code: 'a = BankAccount("a", 100)\nb = BankAccount("b")\na.transfer_to(b, 40)\nassert (a.balance, b.balance) == (60, 40)\nassert b.history == [("deposit", 40)]', name: 'transfer moves money', hidden: true },
          { code: 'a = BankAccount("a", 10)\nb = BankAccount("b", 5)\ntry:\n    a.transfer_to(b, 50)\nexcept ValueError:\n    pass\nassert (a.balance, b.balance) == (10, 5)\nassert b.history == []', name: 'a failed transfer changes neither account', hidden: true },
          { call: 'setattr(BankAccount("x"), "balance", 5)', raises: 'AttributeError', hidden: true, name: 'balance is read-only' },
        ],
        wrong: [
          py`
            class BankAccount:
                def __init__(self, owner, balance=0):
                    if balance < 0:
                        raise ValueError("negative balance")
                    self.owner = owner
                    self._balance = balance
                    self.history = []

                @property
                def balance(self):
                    return self._balance

                def deposit(self, amount):
                    if amount <= 0:
                        raise ValueError("amount <= 0")
                    self._balance += amount
                    self.history.append(("deposit", amount))

                def withdraw(self, amount):
                    if amount > self._balance:
                        raise ValueError("insufficient funds")
                    self._balance -= amount
                    self.history.append(("withdraw", amount))

                def transfer_to(self, other, amount):
                    self.withdraw(amount)
                    other.deposit(amount)
          `,
          py`
            class BankAccount:
                def __init__(self, owner, balance=0):
                    if balance < 0:
                        raise ValueError("negative balance")
                    self.owner = owner
                    self._balance = balance
                    self.history = []

                @property
                def balance(self):
                    return self._balance

                def deposit(self, amount):
                    if amount <= 0:
                        raise ValueError("amount <= 0")
                    self._balance += amount
                    self.history.append(("deposit", amount))

                def withdraw(self, amount):
                    if amount <= 0:
                        raise ValueError("amount <= 0")
                    if amount > self._balance:
                        raise ValueError("insufficient funds")
                    self._balance -= amount
                    self.history.append(("withdraw", amount))

                def transfer_to(self, other, amount):
                    other.deposit(amount)
                    self.withdraw(amount)
          `,
          py`
            class BankAccount:
                def __init__(self, owner, balance=0):
                    if balance < 0:
                        raise ValueError("negative balance")
                    self.owner = owner
                    self.balance = balance
                    self.history = []

                def deposit(self, amount):
                    if amount <= 0:
                        raise ValueError("amount <= 0")
                    self.balance += amount
                    self.history.append(("deposit", amount))

                def withdraw(self, amount):
                    if amount <= 0:
                        raise ValueError("amount <= 0")
                    if amount > self.balance:
                        raise ValueError("insufficient funds")
                    self.balance -= amount
                    self.history.append(("withdraw", amount))

                def transfer_to(self, other, amount):
                    self.withdraw(amount)
                    other.deposit(amount)
          `,
        ],
        explain: md`
          The key ideas: **validate before mutating** (so a failed call leaves no trace), keep the balance behind a read-only property so it can only change through the audited methods, and order \`transfer_to\` so the step that can fail (\`withdraw\`) runs first. Rejecting negative withdrawals matters: \`withdraw(-5)\` would otherwise *add* money, a classic fintech bug.
        `,
      },
      {
        type: 'code',
        title: 'Vector with operators',
        prompt: md`
          Write \`Vector(*coords)\`, an n-dimensional vector:

          - \`coords\` is stored as a **tuple**, and \`len(v)\` is its length.
          - \`repr\` looks like \`Vector(1, 2, 3)\`.
          - \`v + w\` adds element-wise and returns a new Vector. Different lengths raise \`ValueError\`.
          - \`v * k\` **and** \`k * v\` scale by a number.
          - \`==\` compares coordinates. Comparing with a non-Vector is \`False\` (it doesn't crash).

          \`\`\`python
          Vector(1, 2) + Vector(10, 20)   # Vector(11, 22)
          3 * Vector(1, 2)                # Vector(3, 6)
          \`\`\`
        `,
        starter: py`
          class Vector:
              def __init__(self, *coords):
                  self.coords = tuple(coords)
        `,
        solution: py`
          class Vector:
              def __init__(self, *coords):
                  self.coords = tuple(coords)

              def __repr__(self):
                  inner = ", ".join(map(str, self.coords))
                  return f"Vector({inner})"

              def __len__(self):
                  return len(self.coords)

              def __eq__(self, other):
                  if not isinstance(other, Vector):
                      return NotImplemented
                  return self.coords == other.coords

              def __add__(self, other):
                  if len(self) != len(other):
                      raise ValueError("length mismatch")
                  pairs = zip(self.coords, other.coords)
                  return Vector(*(a + b for a, b in pairs))

              def __mul__(self, k):
                  scaled = (c * k for c in self.coords)
                  return Vector(*scaled)

              def __rmul__(self, k):
                  return self * k
        `,
        tests: [
          { call: 'repr(Vector(1, 2, 3))', expect: '"Vector(1, 2, 3)"' },
          { call: 'repr(Vector(1, 2) + Vector(10, 20))', expect: '"Vector(11, 22)"' },
          { call: 'repr(Vector(1, 2) * 3)', expect: '"Vector(3, 6)"' },
          { call: 'repr(3 * Vector(1, 2))', expect: '"Vector(3, 6)"', hidden: true },
          { call: 'Vector(1, 2) == Vector(1, 2)', expect: 'True' },
          { call: 'Vector(1, 2) == (1, 2)', expect: 'False', hidden: true },
          { call: 'Vector(1, 2) + Vector(1, 2, 3)', raises: 'ValueError', hidden: true },
          { call: 'len(Vector(4, 5, 6))', expect: '3', hidden: true },
          { code: 'a = Vector(1, 1)\nb = a + Vector(2, 2)\nassert a.coords == (1, 1) and b.coords == (3, 3)', name: '+ does not modify the operands', hidden: true },
          { call: 'repr(Vector())', expect: '"Vector()"', hidden: true },
        ],
        wrong: [
          py`
            class Vector:
                def __init__(self, *coords):
                    self.coords = tuple(coords)

                def __repr__(self):
                    inner = ", ".join(map(str, self.coords))
                    return f"Vector({inner})"

                def __len__(self):
                    return len(self.coords)

                def __eq__(self, other):
                    if not isinstance(other, Vector):
                        return NotImplemented
                    return self.coords == other.coords

                def __add__(self, other):
                    if len(self) != len(other):
                        raise ValueError("length mismatch")
                    pairs = zip(self.coords, other.coords)
                    return Vector(*(a + b for a, b in pairs))

                def __mul__(self, k):
                    scaled = (c * k for c in self.coords)
                    return Vector(*scaled)
          `,
          py`
            class Vector:
                def __init__(self, *coords):
                    self.coords = tuple(coords)

                def __repr__(self):
                    inner = ", ".join(map(str, self.coords))
                    return f"Vector({inner})"

                def __len__(self):
                    return len(self.coords)

                def __eq__(self, other):
                    return self.coords == other.coords

                def __add__(self, other):
                    if len(self) != len(other):
                        raise ValueError("length mismatch")
                    pairs = zip(self.coords, other.coords)
                    return Vector(*(a + b for a, b in pairs))

                def __mul__(self, k):
                    scaled = (c * k for c in self.coords)
                    return Vector(*scaled)

                def __rmul__(self, k):
                    return self * k
          `,
          py`
            class Vector:
                def __init__(self, *coords):
                    self.coords = tuple(coords)

                def __repr__(self):
                    inner = ", ".join(map(str, self.coords))
                    return f"Vector({inner})"

                def __len__(self):
                    return len(self.coords)

                def __eq__(self, other):
                    if not isinstance(other, Vector):
                        return NotImplemented
                    return self.coords == other.coords

                def __add__(self, other):
                    pairs = zip(self.coords, other.coords)
                    return Vector(*(a + b for a, b in pairs))

                def __mul__(self, k):
                    scaled = (c * k for c in self.coords)
                    return Vector(*scaled)

                def __rmul__(self, k):
                    return self * k
          `,
        ],
        explain: md`
          \`3 * v\` calls \`int.__mul__(3, v)\` first. That returns \`NotImplemented\`, so Python tries \`v.__rmul__(3)\`. \`zip\` silently stops at the shorter input, which is exactly why you check the lengths yourself: a silent truncation in a feature vector is a nasty ML bug. Returning \`NotImplemented\` (not \`False\`) from \`__eq__\` lets the other operand have a say.
        `,
      },
      {
        type: 'code',
        title: 'Top categories report',
        prompt: md`
          Rows arrive as dicts of **strings**, as \`csv.DictReader\` gives them (\`ROWS\` is defined):

          \`\`\`python
          {"order_id": "1", "category": "Books",
           "quantity": "2", "unit_price": "10.00",
           "country": "DE", "status": "completed"}
          \`\`\`

          1. A **frozen** dataclass \`Order\` with \`order_id: int\`, \`category: str\`, \`country: str\`, \`revenue: float\` (quantity × unit_price) and \`status: str\`, plus classmethod \`from_row(row)\`.
          2. \`top_categories(rows, country, n=3)\`: for **completed** orders in that country, return the top \`n\` \`(category, revenue)\` pairs, revenue rounded to 2 decimals, highest first, ties broken by category A→Z.
        `,
        setup: py`
          ROWS = [
              {"order_id": "1", "category": "Books", "quantity": "2", "unit_price": "10.00", "country": "DE", "status": "completed"},
              {"order_id": "2", "category": "Toys", "quantity": "1", "unit_price": "35.50", "country": "DE", "status": "completed"},
              {"order_id": "3", "category": "Books", "quantity": "1", "unit_price": "15.00", "country": "DE", "status": "cancelled"},
              {"order_id": "4", "category": "Books", "quantity": "3", "unit_price": "12.00", "country": "US", "status": "completed"},
              {"order_id": "5", "category": "Home", "quantity": "1", "unit_price": "20.00", "country": "DE", "status": "completed"},
              {"order_id": "6", "category": "Toys", "quantity": "1", "unit_price": "4.50", "country": "DE", "status": "returned"},
              {"order_id": "7", "category": "Grocery", "quantity": "4", "unit_price": "5.00", "country": "DE", "status": "completed"},
          ]

          def load_rows():
              import csv
              with open("data/orders.csv") as f:
                  return list(csv.DictReader(f))
        `,
        starter: py`
          from dataclasses import dataclass

          # ROWS is already defined

          def top_categories(rows, country, n=3):
              pass
        `,
        solution: py`
          from collections import defaultdict
          from dataclasses import dataclass

          @dataclass(frozen=True)
          class Order:
              order_id: int
              category: str
              country: str
              revenue: float
              status: str

              @classmethod
              def from_row(cls, r):
                  qty = int(r["quantity"])
                  return cls(
                      order_id=int(r["order_id"]),
                      category=r["category"],
                      country=r["country"],
                      revenue=qty * float(r["unit_price"]),
                      status=r["status"],
                  )

          def top_categories(rows, country, n=3):
              totals = defaultdict(float)
              for row in rows:
                  o = Order.from_row(row)
                  if o.country != country:
                      continue
                  if o.status != "completed":
                      continue
                  totals[o.category] += o.revenue
              ranked = sorted(totals.items(),
                              key=lambda t: (-t[1], t[0]))
              return [(c, round(v, 2))
                      for c, v in ranked[:n]]
        `,
        tests: [
          { code: 'o = Order.from_row(ROWS[0])\nassert (o.order_id, o.category, o.country, o.status) == (1, "Books", "DE", "completed")\nassert abs(o.revenue - 20.0) < 1e-9', name: 'from_row parses a row' },
          { call: 'top_categories(ROWS, "DE")', expect: '[("Toys", 35.5), ("Books", 20.0), ("Grocery", 20.0)]' },
          { call: 'setattr(Order.from_row(ROWS[0]), "status", "x")', raises: 'AttributeError', hidden: true, name: 'Order is frozen' },
          { call: 'top_categories(ROWS, "DE", n=1)', expect: '[("Toys", 35.5)]', hidden: true },
          { call: 'top_categories(ROWS, "US")', expect: '[("Books", 36.0)]', hidden: true },
          { call: 'top_categories(ROWS, "FR")', expect: '[]', hidden: true },
          { call: 'top_categories(load_rows(), "HR")', hidden: true, name: 'real orders.csv, HR' },
          { call: 'top_categories(load_rows(), "US", n=6)', hidden: true, name: 'real orders.csv, US, all categories' },
        ],
        wrong: [
          py`
            from collections import defaultdict
            from dataclasses import dataclass

            @dataclass(frozen=True)
            class Order:
                order_id: int
                category: str
                country: str
                revenue: float
                status: str

                @classmethod
                def from_row(cls, r):
                    qty = int(r["quantity"])
                    return cls(
                        order_id=int(r["order_id"]),
                        category=r["category"],
                        country=r["country"],
                        revenue=qty * float(r["unit_price"]),
                        status=r["status"],
                    )

            def top_categories(rows, country, n=3):
                totals = defaultdict(float)
                for row in rows:
                    o = Order.from_row(row)
                    if o.country != country:
                        continue
                    totals[o.category] += o.revenue
                ranked = sorted(totals.items(),
                                key=lambda t: (-t[1], t[0]))
                return [(c, round(v, 2))
                        for c, v in ranked[:n]]
          `,
          py`
            from collections import defaultdict
            from dataclasses import dataclass

            @dataclass(frozen=True)
            class Order:
                order_id: int
                category: str
                country: str
                revenue: float
                status: str

                @classmethod
                def from_row(cls, r):
                    qty = int(r["quantity"])
                    return cls(
                        order_id=int(r["order_id"]),
                        category=r["category"],
                        country=r["country"],
                        revenue=qty * float(r["unit_price"]),
                        status=r["status"],
                    )

            def top_categories(rows, country, n=3):
                totals = defaultdict(float)
                for row in rows:
                    o = Order.from_row(row)
                    if o.country != country:
                        continue
                    if o.status != "completed":
                        continue
                    totals[o.category] += o.revenue
                ranked = sorted(totals.items(),
                                key=lambda t: t[1],
                                reverse=True)
                return [(c, round(v, 2))
                        for c, v in ranked[:n]]
          `,
          py`
            from collections import defaultdict
            from dataclasses import dataclass

            @dataclass
            class Order:
                order_id: int
                category: str
                country: str
                revenue: float
                status: str

                @classmethod
                def from_row(cls, r):
                    qty = int(r["quantity"])
                    return cls(
                        order_id=int(r["order_id"]),
                        category=r["category"],
                        country=r["country"],
                        revenue=qty * float(r["unit_price"]),
                        status=r["status"],
                    )

            def top_categories(rows, country, n=3):
                totals = defaultdict(float)
                for row in rows:
                    o = Order.from_row(row)
                    if o.country != country:
                        continue
                    if o.status != "completed":
                        continue
                    totals[o.category] += o.revenue
                ranked = sorted(totals.items(),
                                key=lambda t: (-t[1], t[0]))
                return [(c, round(v, 2))
                        for c, v in ranked[:n]]
          `,
        ],
        explain: md`
          The shape of nearly every analytics job: **parse → filter → group → aggregate → rank**. \`key=lambda t: (-t[1], t[0])\` sorts by revenue descending and category ascending in one pass. \`reverse=True\` alone can't mix directions, and a stable sort keeps arbitrary insertion order for ties. Unit 12 does the same in one line of pandas: \`df.groupby("category")["revenue"].sum().nlargest(3)\`.
        `,
      },
      {
        type: 'code',
        kind: 'fix',
        title: 'Fix the playlist',
        prompt: md`
          Songs are equal when title and artist match, **ignoring case**. A playlist keeps unique songs in order. There are **three** bugs:

          1. all playlists share their songs,
          2. \`for song in playlist\` crashes,
          3. songs can't be used in a set (equal songs must count once).
        `,
        starter: py`
          class Song:
              def __init__(self, title, artist):
                  self.title = title
                  self.artist = artist

              def key(self):
                  t, a = self.title, self.artist
                  return (t.lower(), a.lower())

              def __eq__(self, other):
                  return self.key() == other.key()


          class Playlist:
              songs = []

              def add(self, song):
                  if song not in self.songs:
                      self.songs.append(song)

              def __iter__(self):
                  return self.songs

              def __len__(self):
                  return len(self.songs)
        `,
        solution: py`
          class Song:
              def __init__(self, title, artist):
                  self.title = title
                  self.artist = artist

              def key(self):
                  t, a = self.title, self.artist
                  return (t.lower(), a.lower())

              def __eq__(self, other):
                  return self.key() == other.key()

              def __hash__(self):
                  return hash(self.key())


          class Playlist:
              def __init__(self):
                  self.songs = []

              def add(self, song):
                  if song not in self.songs:
                      self.songs.append(song)

              def __iter__(self):
                  return iter(self.songs)

              def __len__(self):
                  return len(self.songs)
        `,
        tests: [
          { code: 'p = Playlist()\nq = Playlist()\np.add(Song("Hey", "X"))\nassert len(q) == 0', name: 'playlists are independent' },
          { code: 'p = Playlist()\np.add(Song("one", "x"))\np.add(Song("two", "y"))\nassert [s.title for s in p] == ["one", "two"]', name: 'a playlist can be looped over' },
          { call: 'len({Song("Hey", "Jude"), Song("hey", "JUDE")})', expect: '1', name: 'equal songs count once in a set' },
          { code: 'p = Playlist()\np.add(Song("a", "b"))\np.add(Song("A", "B"))\nassert len(p) == 1', name: 'duplicates are skipped', hidden: true },
          { call: 'Song("a", "b") == Song("a", "c")', expect: 'False', hidden: true },
          { call: 'len({Song("a", "b"), Song("a", "c")})', expect: '2', hidden: true },
        ],
        wrong: [
          py`
            class Song:
                def __init__(self, title, artist):
                    self.title = title
                    self.artist = artist

                def key(self):
                    t, a = self.title, self.artist
                    return (t.lower(), a.lower())

                def __eq__(self, other):
                    return self.key() == other.key()

                def __hash__(self):
                    return hash(self.key())


            class Playlist:
                songs = []

                def add(self, song):
                    if song not in self.songs:
                        self.songs.append(song)

                def __iter__(self):
                    return iter(self.songs)

                def __len__(self):
                    return len(self.songs)
          `,
          py`
            class Song:
                def __init__(self, title, artist):
                    self.title = title
                    self.artist = artist

                def key(self):
                    t, a = self.title, self.artist
                    return (t.lower(), a.lower())

                def __eq__(self, other):
                    return self.key() == other.key()

                def __hash__(self):
                    return hash(self.title)


            class Playlist:
                def __init__(self):
                    self.songs = []

                def add(self, song):
                    if song not in self.songs:
                        self.songs.append(song)

                def __iter__(self):
                    return iter(self.songs)

                def __len__(self):
                    return len(self.songs)
          `,
        ],
        explain: md`
          Three lessons in one class: mutable state belongs in \`__init__\`, \`__iter__\` must return an *iterator*, and \`__hash__\` must agree with \`__eq__\`. Hashing \`self.title\` breaks the rule because \`"Hey"\` and \`"hey"\` are equal songs with different hashes. Hash exactly what \`__eq__\` compares: \`hash(self.key())\`.
        `,
      },
    ],
  },
};

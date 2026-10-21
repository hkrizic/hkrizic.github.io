// Unit 3 — Functions.
import { py, md } from './helpers.js';

export default {
  id: 'u03',
  order: 3,
  track: 'foundations',
  title: 'Functions',
  subtitle: 'def, return, arguments, scope, testing',
  icon: '🧩',
  color: '#8B5CF6',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u03-l1',
      title: 'def & return',
      summary: 'Define functions, call them, and hand results back with return.',
      steps: [
        {
          type: 'learn',
          title: 'Your first function',
          body: md`
            A **function** is a named, reusable block of code. \`def\` **defines** it, but nothing runs yet. **Calling** it, with its name and parentheses, runs the body.

            - \`def name(parameters):\`, then an indented body
            - **parameters** are the inputs: names that receive the values you pass in
            - the \`def\` must run **before** the first call

            Functions let you name an idea once (\`greet\`, \`net_price\`) and reuse it everywhere. Every data pipeline is built out of them.
          `,
          code: py`
            def greet(name):
                print(f"Hello, {name}!")

            greet("Ada")
            greet("Linus")
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def hello():
                print("inside")

            print("before")
            hello()
            hello()
            print("after")
          `,
          answer: 'before\ninside\ninside\nafter',
          explain: 'The `def` only creates the function, it prints nothing. Each call `hello()` runs the body once, at the moment of the call.',
        },
        {
          type: 'learn',
          title: 'return: hand back a result',
          body: md`
            \`return value\` ends the function and sends \`value\` back to the caller. The call expression **becomes** that value, so you can store it, print it or calculate with it.

            > \`pass\` is a placeholder that does nothing. Exercise starters use it for an empty body: replace it with your code.
          `,
          code: py`
            def net_price(gross):
                return gross / 1.25

            p = net_price(100)
            print(p)
            print(net_price(50) + net_price(25))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def square(n):
                return n * n

            a = square(3)
            print(a + square(4))
            print(square(square(2)))
          `,
          answer: '25\n16',
          explain: '`square(3)` is 9 and `square(4)` is 16, so the sum is 25. In the last line the inner call runs first: `square(2)` is 4, then `square(4)` is 16.',
        },
        {
          type: 'blanks',
          prompt: 'Complete `area` so it **gives back** the area of a rectangle.',
          code: py`
            ___ area(w, h):
                ___ w * h
          `,
          bank: ['def', 'return', 'print', 'function', 'yield'],
          answer: ['def', 'return'],
          tests: [
            { call: 'area(3, 4)', expect: '12' },
            { call: 'area(2.5, 2)', expect: '5.0' },
          ],
          explain: '`def` starts a definition (Python has no `function` keyword). `return` hands the value back. `print` would only show it and the function would return `None`.',
        },
        {
          type: 'learn',
          title: 'return vs print',
          body: md`
            This is the **#1 beginner bug** with functions:

            - \`print\` shows text on the screen for a **human**. The program can't use it afterwards.
            - \`return\` hands the value back to the **code**, which can keep working with it.

            A function without \`return\` gives back the special value **\`None\`** ("nothing"). Whoever called it gets that \`None\`, not what was printed. Graders, tests and other functions only ever see the return value.
          `,
          code: py`
            def add_p(a, b):
                print(a + b)

            def add_r(a, b):
                return a + b

            x = add_p(2, 3)
            y = add_r(2, 3)
            print(x, y)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def double(n):
                print(n * 2)

            result = double(4)
            print(result)
          `,
          options: ['8\nNone', '8\n8', '8', 'None'],
          answer: 0,
          checkOutput: true,
          explain: 'The call prints 8 as a side effect, but `double` has no `return`, so `result` is `None`.',
        },
        {
          type: 'choice',
          prompt: 'And now?',
          code: py`
            def double(n):
                print(n * 2)

            print(double(4) + 1)
          `,
          options: [
            "TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'",
            '9',
            '8\n9',
            "NameError: name 'double' is not defined",
          ],
          answer: 0,
          checkOutput: true,
          explain: 'It does print 8 first. Then `None + 1` crashes. Whenever you see `NoneType` in an error, ask: "which function forgot to return?"',
        },
        {
          type: 'learn',
          title: 'Calls are expressions',
          body: md`
            \`return\` exits **immediately**. Code after it in the same block never runs.

            A call is an **expression**, so it can go anywhere a value can: inside arithmetic, an f-string, an \`if\` condition, or as the argument of **another call**. Python evaluates the innermost call first.
          `,
          code: py`
            def vat(amount):
                return amount * 0.25
                print("never runs")

            total = 80 + vat(80)
            print(total)
            print(f"VAT: {vat(19.99):.2f}")
            if vat(10) > 2:
                print("big tax")
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def inc(n):
                return n + 1

            def twice(n):
                return n * 2

            print(twice(inc(3)), inc(twice(3)))
          `,
          answer: '8 7',
          explain: 'Inside out: `inc(3)` is 4 and `twice(4)` is 8. `twice(3)` is 6 and `inc(6)` is 7. The order of composition changes the result.',
        },
        {
          type: 'code',
          title: 'Celsius to Fahrenheit',
          prompt: md`
            Write \`fahrenheit(c)\` that **returns** the temperature \`c\` (°C) in °F, using \`c * 9 / 5 + 32\`.

            \`\`\`python
            fahrenheit(100)  # 212.0
            fahrenheit(-40)  # -40.0
            \`\`\`
          `,
          starter: 'def fahrenheit(c):\n    pass\n',
          solution: 'def fahrenheit(c):\n    return c * 9 / 5 + 32\n',
          tests: [
            { call: 'fahrenheit(100)', expect: '212.0' },
            { call: 'fahrenheit(-40)', expect: '-40.0' },
            { call: 'fahrenheit(0)', expect: '32.0' },
            { call: 'fahrenheit(37)', expect: '98.6', hidden: true },
            { call: 'fahrenheit(21.5)', hidden: true },
          ],
          hints: ['Replace `pass` with a `return` line.', '`return c * 9 / 5 + 32`'],
          wrong: [
            'def fahrenheit(c):\n    print(c * 9 / 5 + 32)\n',
            'def fahrenheit(c):\n    return (c + 32) * 9 / 5\n',
          ],
          explain: 'One line, one job. Notice the tests call your function with different inputs and compare the **returned** value. That\'s how every automated test (and interview grader) works, so a `print` scores zero.',
        },
        {
          type: 'code',
          title: 'Order total with bulk discount',
          prompt: md`
            Write \`order_total(price, qty)\` that returns \`price * qty\`, with **10 % off** when \`qty\` is 10 or more. Round the result to 2 decimals.

            \`\`\`python
            order_total(2.5, 4)    # 10.0
            order_total(2.5, 10)   # 22.5
            \`\`\`
          `,
          starter: 'def order_total(price, qty):\n    pass\n',
          solution: py`
            def order_total(price, qty):
                total = price * qty
                if qty >= 10:
                    total *= 0.9
                return round(total, 2)
          `,
          tests: [
            { call: 'order_total(2.5, 4)', expect: '10.0' },
            { call: 'order_total(2.5, 10)', expect: '22.5' },
            { call: 'order_total(19.99, 3)', expect: '59.97', hidden: true },
            { call: 'order_total(19.99, 12)', expect: '215.89', hidden: true },
            { call: 'order_total(0, 50)', expect: '0.0', hidden: true },
            { call: 'order_total(1, 9)', expect: '9', hidden: true },
          ],
          hints: [
            'Compute the plain total first, then apply the discount inside an `if`.',
            'Finish with `return round(total, 2)`.',
          ],
          wrong: [
            'def order_total(price, qty):\n    total = price * qty\n    if qty > 10:\n        total *= 0.9\n    return round(total, 2)\n',
            'def order_total(price, qty):\n    total = price * qty\n    if qty >= 10:\n        total *= 0.9\n    return total\n',
            'def order_total(price, qty):\n    total = price * qty\n    if qty >= 10:\n        total *= 0.9\n    print(round(total, 2))\n',
          ],
          explain: 'A local variable (`total`) holds the work in progress, and one `return` at the end delivers it. Rounding belongs at the very end: rounding intermediate steps adds up errors (19.99 × 12 × 0.9 = 215.892).',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the tax helper',
          prompt: md`
            \`tax(amount)\` should **return** 20 % of \`amount\`, so the script prints \`120.0\`. Fix the two bugs.
          `,
          starter: py`
            def tax(amount)
                result = amount * 0.2
                print(result)

            total = 100 + tax(100)
            print(total)
          `,
          solution: py`
            def tax(amount):
                result = amount * 0.2
                return result

            total = 100 + tax(100)
            print(total)
          `,
          tests: [
            { stdout: '120.0\n', name: 'prints 120.0 (and nothing else)' },
            { call: 'tax(50)', expect: '10.0' },
            { call: 'tax(0)', expect: '0.0', hidden: true },
          ],
          hints: [
            'Run it: the first error points at the `def` line. What does every `def` line end with?',
            'Next you\'ll see a `NoneType` error. The function must `return` the result, not print it.',
          ],
          wrong: [
            'def tax(amount):\n    result = amount * 0.2\n    print(result)\n\ntotal = 100 + tax(100)\nprint(total)\n',
            'def tax(amount):\n    result = amount * 0.2\n    print(result)\n    return result\n\ntotal = 100 + tax(100)\nprint(total)\n',
          ],
          explain: 'A missing `:` stops the whole program before it starts. The second bug only shows up when the result is **used**: `100 + None`. Keeping a debug `print` inside the function also changes the program\'s output, which is why the test checks the full output.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u03-l2',
      title: 'Parameters & Arguments',
      summary: 'Positional and keyword arguments, defaults, and the errors you get when a call doesn\'t fit.',
      steps: [
        {
          type: 'learn',
          title: 'Positional and keyword arguments',
          body: md`
            **Parameters** are the names in the \`def\` line. **Arguments** are the values in the call.

            - **Positional** arguments match by **position**: first to first, second to second.
            - **Keyword** arguments match by **name** (\`role="analyst"\`). Their order doesn't matter, and the call documents itself.

            Swap two positional arguments and Python won't complain. You just get nonsense (last line below).
          `,
          code: py`
            def describe(name, role):
                return f"{name} works as {role}"

            print(describe("Ada", "engineer"))
            print(describe(role="analyst", name="Bo"))
            print(describe("data scientist", "Linus"))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def ratio(part, whole):
                return part / whole * 100

            print(ratio(25, 200))
            print(ratio(whole=50, part=10))
            print(ratio(50, 10))
          `,
          answer: '12.5\n20.0\n500.0',
          explain: 'Keywords match by name, so the second call is `part=10, whole=50`. The third call is positional: `part=50, whole=10`, which gives 500.0. When two parameters have the same type, keywords protect you from silent swaps.',
        },
        {
          type: 'learn',
          title: 'Default values',
          body: md`
            Give a parameter a **default** with \`=\` in the \`def\`. Callers can leave it out, or override it by position or by name.

            Rule: parameters **with** defaults come **after** the ones without. \`def f(a=1, b)\` is a SyntaxError, because Python couldn't tell which value goes where.

            Defaults are perfect for settings that are usually the same: a tax rate, a currency, \`retries=3\`.
          `,
          code: py`
            def with_vat(net, rate=0.25):
                return round(net * (1 + rate), 2)

            print(with_vat(100))
            print(with_vat(100, 0.1))
            print(with_vat(100, rate=0.05))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def greet(name, greeting="Hi", punct="!"):
                return greeting + ", " + name + punct

            print(greet("Bo", punct="?"))
            print(greet("Al", "Yo"))
          `,
          options: ['Hi, Bo?\nYo, Al!', 'Hi, Bo?\nAl, Yo!', 'Bo, Hi?\nYo, Al!', 'Hi, Bo!\nYo, Al!'],
          answer: 0,
          checkOutput: true,
          explain: 'The keyword `punct="?"` skips over `greeting`, which keeps its default. In the second call, "Yo" is the second positional argument, so it fills `greeting`.',
        },
        {
          type: 'choice',
          prompt: 'Which definition is a SyntaxError?',
          options: ['def f(a=1, b):', 'def f(a, b=1):', 'def f(a, b=1, c=2):', 'def f(a, b, c):'],
          answer: 0,
          explain: 'Python says: "parameter without a default follows parameter with a default". In `f(5)`, should 5 go to `a` or to `b`? Required parameters always come first.',
        },
        {
          type: 'learn',
          title: "When a call doesn't fit",
          body: md`
            Python checks every call against the \`def\` and raises a **TypeError** that says exactly what's wrong. Learn to read these:

            | call to \`def f(a, b)\` | TypeError message |
            |---|---|
            | \`f(1)\` | missing 1 required positional argument: 'b' |
            | \`f(1, 2, 3)\` | takes 2 positional arguments but 3 were given |
            | \`f(1, c=2)\` | got an unexpected keyword argument 'c' |
            | \`f(1, a=2)\` | got multiple values for argument 'a' |

            In every call, **positional arguments come before keyword ones**: \`f(a=1, 2)\` is a SyntaxError.
          `,
          code: py`
            def f(a, b):
                return a - b

            print(f(10, 3), f(b=3, a=10), f(10, b=3))
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            def total(price, qty):
                return price * qty

            print(total(9.99))
          `,
          options: [
            "TypeError: total() missing 1 required positional argument: 'qty'",
            'TypeError: total() takes 2 positional arguments but 1 was given',
            '9.99',
            'None',
          ],
          answer: 0,
          checkOutput: true,
          explain: 'Python never guesses a missing value. The message names the function and the missing parameter, so you know exactly which call to fix.',
        },
        {
          type: 'choice',
          prompt: 'And this one?',
          code: py`
            def total(price, qty=1):
                return price * qty

            print(total(5, qty=2, discount=1))
          `,
          options: [
            "TypeError: total() got an unexpected keyword argument 'discount'",
            '10',
            '9',
            'TypeError: total() takes 2 positional arguments but 3 were given',
          ],
          answer: 0,
          checkOutput: true,
          explain: '`total` has no parameter named `discount`, and Python won\'t silently ignore it. A typo in a keyword argument (`qyt=2`) fails the same way, which is a good thing.',
        },
        {
          type: 'output',
          prompt: 'Careful with the types. What does this print?',
          code: py`
            def fee(amount, pct=2, minimum=1):
                return max(amount * pct / 100, minimum)

            print(fee(30))
            print(fee(30, 5))
            print(fee(200, minimum=5))
          `,
          answer: '1\n1.5\n5',
          explain: '`fee(30)` computes 0.6, and `max(0.6, 1)` returns the int 1. `fee(30, 5)` is 1.5. In the last call 4.0 loses to the minimum, the int 5. `max` returns whichever argument is bigger, with its own type.',
        },
        {
          type: 'blanks',
          prompt: 'Give `express` a default of `False` and use it, so `shipping(3)` returns 11 and `shipping(3, True)` returns 22.',
          code: py`
            def shipping(weight, express___False):
                base = 5 + weight * 2
                return base * 2 if ___ else base
          `,
          bank: ['=', '==', 'express', 'weight', ':', 'True'],
          answer: ['=', 'express'],
          tests: [
            { call: 'shipping(3)', expect: '11' },
            { call: 'shipping(3, True)', expect: '22' },
            { call: 'shipping(weight=1, express=True)', expect: '14' },
          ],
          explain: 'A default uses a single `=`. Then the parameter is an ordinary local variable: `express` is a bool, so it can be the condition directly. No need for `express == True`.',
        },
        {
          type: 'code',
          title: 'BMI with optional precision',
          prompt: md`
            Write \`bmi(weight_kg, height_m, digits=1)\` that returns weight / height² rounded to \`digits\` decimals.

            \`\`\`python
            bmi(70, 1.75)            # 22.9
            bmi(70, 1.75, digits=2)  # 22.86
            \`\`\`
          `,
          starter: 'def bmi(weight_kg, height_m, digits=1):\n    pass\n',
          solution: 'def bmi(weight_kg, height_m, digits=1):\n    return round(weight_kg / height_m ** 2, digits)\n',
          tests: [
            { call: 'bmi(70, 1.75)', expect: '22.9' },
            { call: 'bmi(70, 1.75, digits=2)', expect: '22.86' },
            { call: 'bmi(height_m=1.8, weight_kg=81)', expect: '25.0' },
            { call: 'bmi(70, 1.75, 0)', expect: '23.0', hidden: true },
            { call: 'bmi(55.5, 1.62, 3)', expect: '21.148', hidden: true },
          ],
          hints: ['Height squared is `height_m ** 2`.', '`round(value, digits)` uses the parameter, so the caller decides the precision.'],
          wrong: [
            'def bmi(weight_kg, height_m, digits=2):\n    return round(weight_kg / height_m ** 2, digits)\n',
            'def bmi(weight_kg, height_m, digits=1):\n    return round(weight_kg / height_m * 2, digits)\n',
            'def bmi(height_m, weight_kg, digits=1):\n    return round(weight_kg / height_m ** 2, digits)\n',
          ],
          explain: 'The parameter order is part of the contract: swap `weight_kg` and `height_m` and every positional call breaks, while keyword calls keep working. That\'s why public APIs (pandas, scikit-learn) push you to pass options by keyword.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the label maker',
          prompt: md`
            \`make_label\` builds IDs like \`ID-0007\`: a \`prefix\` (default \`"ID"\`), a dash, and the \`number\` padded to 4 digits. The **number is required** and comes first:

            \`\`\`python
            make_label(7)          # 'ID-0007'
            make_label(42, "ORD")  # 'ORD-0042'
            \`\`\`

            The definition doesn't even run. Fix it.
          `,
          starter: py`
            def make_label(prefix="ID", number):
                return f"{prefix}-{number:04d}"
          `,
          solution: py`
            def make_label(number, prefix="ID"):
                return f"{prefix}-{number:04d}"
          `,
          tests: [
            { call: 'make_label(7)', expect: '"ID-0007"' },
            { call: 'make_label(42, "ORD")', expect: '"ORD-0042"' },
            { call: 'make_label(prefix="U", number=123)', expect: '"U-0123"' },
            { call: 'make_label(12345)', expect: '"ID-12345"', hidden: true },
          ],
          hints: ['The SyntaxError says a parameter without a default follows one with a default.', 'Put `number` first: `def make_label(number, prefix="ID"):`'],
          wrong: [
            'def make_label(prefix="ID", number=0):\n    return f"{prefix}-{number:04d}"\n',
            'def make_label(number, prefix="ID"):\n    return f"{prefix}-{number}"\n',
          ],
          explain: 'Giving `number` a default too makes the error disappear, but then `make_label(7)` puts 7 into `prefix`. Required parameters go first, optional ones after. `:04d` pads to **at least** 4 digits, so 12345 stays intact.',
        },
        {
          type: 'code',
          title: 'Flexible compound interest',
          prompt: md`
            Write \`grow(principal, rate=0.05, years=1, monthly=False)\` that returns the final amount, **rounded to 2 decimals**:

            - yearly: \`principal * (1 + rate) ** years\`
            - if \`monthly\` is True: \`principal * (1 + rate / 12) ** (years * 12)\`

            \`\`\`python
            grow(1000)                          # 1050.0
            grow(1000, years=10)                # 1628.89
            grow(1000, 0.05, 10, monthly=True)  # 1647.01
            \`\`\`
          `,
          starter: 'def grow(principal, rate=0.05, years=1, monthly=False):\n    pass\n',
          solution: py`
            def grow(principal, rate=0.05, years=1, monthly=False):
                n = 12 if monthly else 1
                amount = principal * (1 + rate / n) ** (years * n)
                return round(amount, 2)
          `,
          tests: [
            { call: 'grow(1000)', expect: '1050.0' },
            { call: 'grow(1000, years=10)', expect: '1628.89' },
            { call: 'grow(1000, 0.05, 10, monthly=True)', expect: '1647.01' },
            { call: 'grow(500, rate=0.1, years=2)', expect: '605.0', hidden: true },
            { call: 'grow(1000, monthly=True)', expect: '1051.16', hidden: true },
            { call: 'grow(2500, 0.04, 0)', expect: '2500', hidden: true },
          ],
          hints: [
            'Monthly compounding is the yearly formula with the rate split by 12 and 12 times as many periods.',
            'One trick: `n = 12 if monthly else 1`, then `(1 + rate / n) ** (years * n)`.',
          ],
          wrong: [
            py`
              def grow(principal, rate=0.05, years=1, monthly=False):
                  if monthly:
                      return round(principal * (1 + rate) ** (years * 12), 2)
                  return round(principal * (1 + rate) ** years, 2)
            `,
            py`
              def grow(principal, rate=0.05, years=1, monthly=False):
                  if monthly:
                      return round(principal * (1 + rate / 12) ** years, 2)
                  return round(principal * (1 + rate) ** years, 2)
            `,
          ],
          explain: 'Four parameters, three with defaults, and every call reads clearly because of keywords: `grow(1000, years=10)`. Parameterising the number of periods (`n`) instead of copying the formula keeps both cases in one line.',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u03-l3',
      title: 'Several Values & Early Returns',
      summary: 'Return tuples and unpack them, exit early with guard clauses, return booleans directly.',
      steps: [
        {
          type: 'learn',
          title: 'Returning several values',
          body: md`
            \`return a, b\` returns **both** values packed into a **tuple**: a fixed, ordered group of values, printed in parentheses like \`(2, 15)\`.

            **Unpack** it straight into variables: \`m, s = split_time(135)\`. The number of names must match the number of values.

            (Tuples get a whole lesson later. For now this is all you need.)
          `,
          code: py`
            def split_time(seconds):
                return seconds // 60, seconds % 60

            m, s = split_time(135)
            print(m, "min", s, "s")
            print(split_time(135))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def stats(a, b):
                total = a + b
                return total, total / 2

            t, avg = stats(4, 7)
            print(t, avg)
            print(stats(1, 2))
          `,
          answer: '11 5.5\n(3, 1.5)',
          explain: 'Unpacked, you get two separate values. Printed without unpacking, you see the tuple itself, with parentheses and a comma.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            def split_time(seconds):
                return seconds // 60, seconds % 60

            h, m, s = split_time(135)
          `,
          options: [
            'ValueError: not enough values to unpack (expected 3, got 2)',
            'TypeError: split_time() returned 2 values',
            'ValueError: too many values to unpack (expected 3)',
            'Nothing: s becomes None',
          ],
          answer: 0,
          checkOutput: true,
          explain: 'Three names, two values. Python refuses instead of guessing. The message tells you both counts, which makes this easy to debug.',
        },
        {
          type: 'learn',
          title: 'Guard clauses: return early',
          body: md`
            Handle the special cases **first** and \`return\` right away. The main logic then sits at the top level of the function instead of deep inside \`if\`/\`else\` blocks.

            These early exits are called **guard clauses**. They make edge cases (zero, negative, missing data) impossible to overlook. Real data always has them: an empty day, a product with 0 views, a user with no orders.
          `,
          code: py`
            def avg_order(revenue, orders):
                if orders == 0:
                    return 0.0
                return revenue / orders

            print(avg_order(500, 4))
            print(avg_order(0, 0))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def classify(n):
                if n < 0:
                    return "negative"
                if n == 0:
                    return "zero"
                if n < 10:
                    return "small"
                return "large"

            print(classify(-5), classify(0))
            print(classify(7), classify(70))
          `,
          answer: 'negative zero\nsmall large',
          explain: 'Each `return` ends the call, so the later `if`s act like `elif`s without being written as one. The final `return` is the "everything else" case.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines into `conversion(buyers, visitors)`: return 0.0 when there are no visitors, otherwise the conversion rate in %. It prints `2.5 0.0`.',
          lines: [
            'def conversion(buyers, visitors):',
            '    if visitors == 0:',
            '        return 0.0',
            '    return buyers / visitors * 100',
            'print(conversion(5, 200), conversion(3, 0))',
          ],
          distractors: ['    return visitors / buyers * 100', '        return 0'],
          tests: [{ stdout: '2.5 0.0\n' }],
          explain: 'The guard must come **before** the division, otherwise `conversion(3, 0)` raises ZeroDivisionError. Returning `0.0` (not `0`) keeps the return type consistent: always a float.',
        },
        {
          type: 'choice',
          prompt: '`return` inside a loop. What does this print?',
          code: py`
            def first_divisor(n):
                for d in range(2, n):
                    if n % d == 0:
                        return d
                return n

            print(first_divisor(91), first_divisor(13))
          `,
          options: ['7 13', '7 None', '13 13', '7 1'],
          answer: 0,
          checkOutput: true,
          explain: '`return` leaves the loop **and** the function in one go, so 91 stops at its first divisor, 7. For the prime 13 the loop finishes, and the `return n` after the loop runs.',
        },
        {
          type: 'learn',
          title: 'Return the condition itself',
          body: md`
            A comparison already **is** a bool, so you don't need \`if\` to return True or False:

            \`\`\`python
            if age >= 18:
                return True
            else:
                return False
            \`\`\`
            is just \`return age >= 18\`.

            Name such functions like questions: \`is_adult\`, \`has_discount\`, \`can_ship\`. And beware: an \`if\` with \`return True\` but no other \`return\` gives back \`None\` (not \`False\`) in the other case.
          `,
          code: py`
            def is_adult(age):
                return age >= 18

            def can_ship(weight, country):
                return weight <= 30 and country != "XX"

            print(is_adult(17), can_ship(12, "HR"))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def is_positive(n):
                if n > 0:
                    return True

            print(is_positive(5), is_positive(-2))
          `,
          options: ['True None', 'True False', 'True', 'None None'],
          answer: 0,
          checkOutput: true,
          explain: 'For -2 the `if` is skipped and the function falls off the end, returning `None`. `None` is falsy, so `if is_positive(-2):` still "works", but a test expecting `False` fails, and `None == False` is False. `return n > 0` fixes it.',
        },
        {
          type: 'blanks',
          prompt: 'Complete `is_even` in one line.',
          code: py`
            def is_even(n):
                return n ___ 2 ___ 0
          `,
          bank: ['%', '==', '//', '=', '!=', '/'],
          answer: ['%', '=='],
          tests: [
            { call: 'is_even(4)', expect: 'True' },
            { call: 'is_even(7)', expect: 'False' },
            { call: 'is_even(0)', expect: 'True' },
            { call: 'is_even(-3)', expect: 'False' },
          ],
          explain: 'The remainder after dividing by 2 is 0 for even numbers. `=` is assignment and can\'t appear in a return expression. `!=` would give you `is_odd`.',
        },
        {
          type: 'code',
          title: 'Hours, minutes, seconds',
          prompt: md`
            Write \`hms(seconds)\` that returns a **tuple** \`(hours, minutes, secs)\` for a non-negative int.

            \`\`\`python
            hms(3725)          # (1, 2, 5)
            h, m, s = hms(59)  # 0 0 59
            \`\`\`
          `,
          starter: 'def hms(seconds):\n    pass\n',
          solution: py`
            def hms(seconds):
                h = seconds // 3600
                m = seconds % 3600 // 60
                s = seconds % 60
                return h, m, s
          `,
          tests: [
            { call: 'hms(3725)', expect: '(1, 2, 5)' },
            { call: 'hms(59)', expect: '(0, 0, 59)' },
            { call: 'hms(0)', expect: '(0, 0, 0)', hidden: true },
            { call: 'hms(86399)', expect: '(23, 59, 59)', hidden: true },
            { call: 'hms(90061)', expect: '(25, 1, 1)', hidden: true },
          ],
          hints: ['Same arithmetic as the uptime report in Unit 1.', 'End with `return h, m, s`: the commas make the tuple.'],
          wrong: [
            'def hms(seconds):\n    h = seconds // 3600\n    m = seconds // 60\n    s = seconds % 60\n    return h, m, s\n',
            'def hms(seconds):\n    h = seconds // 3600\n    m = seconds % 3600 // 60\n    s = seconds % 60\n    return s, m, h\n',
            'def hms(seconds):\n    h = seconds // 3600\n    m = seconds % 3600 // 60\n    s = seconds % 60\n    print(h, m, s)\n',
          ],
          explain: 'The order of the returned values is part of the function\'s contract: callers unpack by position. `(s, m, h)` has the right numbers in the wrong slots and breaks every caller.',
        },
        {
          type: 'code',
          title: 'Letter grade with a guard',
          prompt: md`
            Write \`grade(score)\`:

            - scores outside 0–100 return \`"invalid"\` (check that **first**)
            - 90+ → \`"A"\`, 80+ → \`"B"\`, 70+ → \`"C"\`, 60+ → \`"D"\`, anything lower → \`"F"\`

            \`\`\`python
            grade(95)   # 'A'
            grade(101)  # 'invalid'
            \`\`\`
          `,
          starter: 'def grade(score):\n    pass\n',
          solution: py`
            def grade(score):
                if score < 0 or score > 100:
                    return "invalid"
                if score >= 90:
                    return "A"
                if score >= 80:
                    return "B"
                if score >= 70:
                    return "C"
                if score >= 60:
                    return "D"
                return "F"
          `,
          tests: [
            { call: 'grade(95)', expect: '"A"' },
            { call: 'grade(80)', expect: '"B"' },
            { call: 'grade(101)', expect: '"invalid"' },
            { call: 'grade(100)', expect: '"A"', hidden: true },
            { call: 'grade(60)', expect: '"D"', hidden: true },
            { call: 'grade(59.5)', expect: '"F"', hidden: true },
            { call: 'grade(0)', expect: '"F"', hidden: true },
            { call: 'grade(-1)', expect: '"invalid"', hidden: true },
          ],
          hints: [
            'Guard first: `if score < 0 or score > 100: return "invalid"`.',
            'Then one `if ... return` per grade, highest first. Each return ends the function.',
          ],
          wrong: [
            'def grade(score):\n    if score >= 90:\n        return "A"\n    if score >= 80:\n        return "B"\n    if score >= 70:\n        return "C"\n    if score >= 60:\n        return "D"\n    return "F"\n',
            'def grade(score):\n    if score < 0 or score >= 100:\n        return "invalid"\n    if score >= 90:\n        return "A"\n    if score >= 80:\n        return "B"\n    if score >= 70:\n        return "C"\n    if score >= 60:\n        return "D"\n    return "F"\n',
            'def grade(score):\n    if score < 0 or score > 100:\n        return "invalid"\n    if score > 90:\n        return "A"\n    if score > 80:\n        return "B"\n    if score > 70:\n        return "C"\n    if score > 60:\n        return "D"\n    return "F"\n',
          ],
          explain: 'Guard, then a flat ladder of early returns. No `elif` needed, because each `return` exits. The hidden tests probe the edges: exactly 100, exactly 60, 59.5, and out-of-range values on both sides.',
        },
        {
          type: 'code',
          title: 'Valid triangle',
          prompt: md`
            Write \`is_triangle(a, b, c)\` that returns True when three side lengths can form a triangle: **each** side must be **shorter** than the sum of the other two.

            Return the condition directly: no \`if\` allowed.

            \`\`\`python
            is_triangle(3, 4, 5)  # True
            is_triangle(1, 2, 3)  # False (flat)
            \`\`\`
          `,
          starter: 'def is_triangle(a, b, c):\n    pass\n',
          solution: py`
            def is_triangle(a, b, c):
                return a < b + c and b < a + c and c < a + b
          `,
          tests: [
            { call: 'is_triangle(3, 4, 5)', expect: 'True' },
            { call: 'is_triangle(1, 2, 3)', expect: 'False' },
            { call: 'is_triangle(5, 1, 1)', expect: 'False' },
            { call: 'is_triangle(2, 2, 3)', expect: 'True', hidden: true },
            { call: 'is_triangle(7, 10, 3)', expect: 'False', hidden: true },
            { call: 'is_triangle(0, 0, 0)', expect: 'False', hidden: true },
            { call: 'is_triangle(-3, 4, 5)', expect: 'False', hidden: true },
          ],
          forbid: ['if'],
          hints: ['Three comparisons joined with `and`.', '`return a < b + c and b < a + c and c < a + b`'],
          wrong: [
            'def is_triangle(a, b, c):\n    return a <= b + c and b <= a + c and c <= a + b\n',
            'def is_triangle(a, b, c):\n    return c < a + b\n',
          ],
          explain: 'Checking only `c < a + b` assumes `c` is the longest side, and nothing in the contract promised that. Neat bonus: the three strict inequalities also rule out zero and negative sides, so no extra check is needed (if `a <= 0`, you would need both `b < c` and `c < b`).',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u03-l4',
      title: 'Scope',
      summary: 'Local vs global names, UnboundLocalError, the global keyword and pure functions.',
      steps: [
        {
          type: 'learn',
          title: 'Local variables',
          body: md`
            Names created inside a function, including its parameters, are **local**. They exist only while that call runs and vanish when it returns. Outside, they're unknown: \`NameError\`.

            That's a feature. Two functions can both use \`total\` or \`i\` without stepping on each other. The only way to get a value **out** is \`return\`.
          `,
          code: py`
            def line_total(price, qty):
                total = price * qty
                return total

            print(line_total(3, 4))
            # print(total)  -> NameError: total is local
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            def f():
                secret = 42
                return secret

            f()
            print(secret)
          `,
          options: ["NameError: name 'secret' is not defined", '42', 'None', '0'],
          answer: 0,
          checkOutput: true,
          explain: '`secret` lived only during the call. The call returned 42, but nobody stored it: `value = f()` would.',
        },
        {
          type: 'learn',
          title: 'Reading globals, and shadowing',
          body: md`
            A variable created at the top level of a file is **global**. Functions can **read** it.

            But **assigning** to a name inside a function creates a **new local variable**, even if a global with the same name exists. The local one *shadows* the global inside that function, and the global stays untouched.
          `,
          code: py`
            rate = 0.2

            def tax(x):
                return x * rate      # reads the global

            def change():
                rate = 0.5           # a NEW local
                return rate

            print(tax(100), change(), rate)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            x = 10

            def g(x):
                x = x + 1
                return x

            print(g(5))
            print(g(x))
            print(x)
          `,
          answer: '6\n11\n10',
          explain: 'The parameter `x` is local and shadows the global `x`. `g(x)` passes the **value** 10 in; changing the local copy never changes the global, which is still 10.',
        },
        {
          type: 'learn',
          title: 'UnboundLocalError',
          body: md`
            Python decides **before running a function** which names are local: any name **assigned anywhere** in the body (\`=\`, \`+=\`, a \`for\` variable) is local in the **whole** body.

            \`\`\`python
            count = 0
            def track():
                count += 1
            \`\`\`

            \`count += 1\` means \`count = count + 1\`, so \`count\` is local, and reading it before it has a value raises **UnboundLocalError**, even though a global \`count\` exists.

            The clean fix: pass the value in and return the new one.
          `,
          code: py`
            def track(count):
                return count + 1

            count = 0
            count = track(count)
            count = track(count)
            print(count)
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            count = 0

            def track():
                count += 1
                return count

            print(track())
          `,
          options: [
            "UnboundLocalError: cannot access local variable 'count' where it is not associated with a value",
            '1',
            '0',
            "NameError: name 'count' is not defined",
          ],
          answer: 0,
          checkOutput: true,
          explain: 'Because of the assignment, `count` is local in all of `track`. Reading it for `+ 1` happens before the local has a value. Python could read the global, but it doesn\'t mix the two: one name, one scope per function.',
        },
        {
          type: 'learn',
          title: 'global, and why to avoid it',
          body: md`
            \`global name\` inside a function says "this is the global one", so assigning to it changes the global. It works, but it's a **code smell**:

            - the same call gives different answers depending on hidden state
            - tests interfere with each other, and bugs depend on call order
            - in parallel jobs (Spark, multiprocessing) every worker has its **own copy** of the globals, so a "shared" counter silently breaks

            Prefer **pure functions**: the output depends only on the arguments, and nothing outside is changed. They are easy to test, cache and run in parallel.
          `,
          code: py`
            calls = 0

            def square_tracked(n):
                global calls
                calls += 1
                return n * n

            square_tracked(3)
            square_tracked(4)
            print(calls)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            total = 0

            def add(n):
                global total
                total += n
                return total

            add(5)
            add(10)
            print(add(1), total)
          `,
          answer: '16 16',
          explain: 'Every call changes the global: 5, then 15, then 16. `add(1)` runs before `print` reads `total`, so both show 16. Notice that `add(1)` returns something different every time you call it: not pure.',
        },
        {
          type: 'blanks',
          prompt: 'Make `record_hit` update the global counter (just this once!).',
          code: py`
            hits = 0

            def record_hit():
                ___ hits
                hits += 1

            record_hit()
            record_hit()
            print(hits)
          `,
          bank: ['global', 'local', 'return', 'import', 'def'],
          answer: ['global'],
          tests: [{ stdout: '2\n' }],
          explain: 'Without `global`, `hits += 1` raises UnboundLocalError. Python has no `local` keyword, because local is the default.',
        },
        {
          type: 'choice',
          prompt: 'Which function is **pure**?',
          options: ['def f(x): return x * 2 + 1', 'def f(x): return x * rate', 'def f(x): print(x); return x', 'def f(x): global n; n = x'],
          answer: 0,
          explain: md`
            - \`x * 2 + 1\` depends only on \`x\` and changes nothing: **pure**.
            - \`x * rate\` reads a global that may change, so the same \`x\` can give different results.
            - \`print\` is a side effect: it changes the outside world (the screen).
            - \`global n\` changes outside state.
          `,
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the discount',
          prompt: md`
            \`final_price(price)\` takes **10 %** off, or **20 %** for prices over 100. It must **not** change the global \`discount\`.

            It works for \`final_price(200)\` but crashes for \`final_price(50)\`. Find out why and fix it.

            \`\`\`python
            final_price(50)   # 45.0
            final_price(200)  # 160.0
            \`\`\`
          `,
          starter: py`
            discount = 10

            def final_price(price):
                if price > 100:
                    discount = 20
                return price * (100 - discount) / 100
          `,
          solution: py`
            discount = 10

            def final_price(price):
                pct = discount
                if price > 100:
                    pct = 20
                return price * (100 - pct) / 100
          `,
          tests: [
            { call: 'final_price(50)', expect: '45.0' },
            { call: 'final_price(200)', expect: '160.0' },
            { call: 'final_price(100)', expect: '90.0', hidden: true },
            { code: 'final_price(500)\nassert discount == 10', name: 'the global discount is unchanged', hidden: true },
          ],
          hints: [
            'Because `discount` is assigned somewhere in the function, it is local in the whole function, even on the path that never assigns it.',
            'Use a different local name: start with `pct = discount`, then change `pct`.',
          ],
          wrong: [
            py`
              discount = 10

              def final_price(price):
                  global discount
                  if price > 100:
                      discount = 20
                  return price * (100 - discount) / 100
            `,
          ],
          explain: 'For prices up to 100 the assignment never runs, so the local `discount` has no value when it is read: UnboundLocalError. "Fixing" it with `global` is worse: after one expensive order, every later order gets 20 % off. Bugs like that depend on call order and are miserable to find.',
        },
        {
          type: 'code',
          title: 'Pure balance update',
          prompt: md`
            Write a **pure** function \`apply_tx(balance, amount, kind)\` that returns the new balance:

            - \`kind == "deposit"\`: add \`amount\`
            - \`kind == "withdraw"\`: subtract it, **unless** that would make the balance negative. Then the withdrawal is rejected and the balance is returned unchanged.
            - any other kind: return the balance unchanged

            \`\`\`python
            apply_tx(100, 30, "withdraw")   # 70
            apply_tx(100, 130, "withdraw")  # 100 (rejected)
            \`\`\`
          `,
          starter: 'def apply_tx(balance, amount, kind):\n    pass\n',
          solution: py`
            def apply_tx(balance, amount, kind):
                if kind == "deposit":
                    return balance + amount
                if kind == "withdraw" and amount <= balance:
                    return balance - amount
                return balance
          `,
          tests: [
            { call: 'apply_tx(100, 30, "withdraw")', expect: '70' },
            { call: 'apply_tx(100, 130, "withdraw")', expect: '100' },
            { call: 'apply_tx(100, 50, "deposit")', expect: '150' },
            { call: 'apply_tx(100, 100, "withdraw")', expect: '0', hidden: true },
            { call: 'apply_tx(100, 5, "refund")', expect: '100', hidden: true },
            { call: 'apply_tx(0, 0.5, "withdraw")', expect: '0', hidden: true },
          ],
          hints: [
            'One `if` per kind, each with its own `return`.',
            'A withdrawal is allowed when `amount <= balance`. Everything else falls through to `return balance`.',
          ],
          wrong: [
            'def apply_tx(balance, amount, kind):\n    if kind == "deposit":\n        return balance + amount\n    if kind == "withdraw" and amount < balance:\n        return balance - amount\n    return balance\n',
            'def apply_tx(balance, amount, kind):\n    if kind == "deposit":\n        return balance + amount\n    if kind == "withdraw":\n        if amount <= balance:\n            return balance - amount\n        return balance\n',
          ],
          explain: 'Because `apply_tx` is pure, replaying a day of transactions is just calling it again and again: `b = apply_tx(b, amt, kind)`. The same input always gives the same output, which is exactly what you want when a pipeline re-runs a failed batch. Withdrawing the full balance (to exactly 0) is allowed, a classic boundary.',
        },
        {
          type: 'code',
          title: 'Ticket price from constants',
          prompt: md`
            Reading **global constants** is fine (by convention they're UPPER_CASE). These already exist and **may change**:

            \`\`\`python
            BASE = 12.0
            CHILD_OFF = 0.5     # 50 % off
            STUDENT_OFF = 0.25  # 25 % off
            \`\`\`

            Write \`ticket_price(age, student=False)\`, rounded to 2 decimals:
            - age 65 or more → \`0.0\` (free)
            - under 12 → \`BASE\` with the child discount
            - otherwise students get the student discount, everyone else pays \`BASE\`
          `,
          setup: 'BASE = 12.0\nCHILD_OFF = 0.5\nSTUDENT_OFF = 0.25',
          starter: '# BASE, CHILD_OFF, STUDENT_OFF exist\ndef ticket_price(age, student=False):\n    pass\n',
          solution: py`
            def ticket_price(age, student=False):
                if age >= 65:
                    return 0.0
                if age < 12:
                    return round(BASE * (1 - CHILD_OFF), 2)
                if student:
                    return round(BASE * (1 - STUDENT_OFF), 2)
                return round(BASE, 2)
          `,
          tests: [
            { call: 'ticket_price(30)', expect: '12.0' },
            { call: 'ticket_price(8)', expect: '6.0' },
            { call: 'ticket_price(20, True)', expect: '9.0' },
            { call: 'ticket_price(70, student=True)', expect: '0.0' },
            { call: 'ticket_price(12)', expect: '12.0', hidden: true },
            { call: 'ticket_price(65)', expect: '0.0', hidden: true },
            { given: 'BASE = 20.0', call: 'ticket_price(20, True)', expect: '15.0', hidden: true },
            { given: 'CHILD_OFF = 0.3', call: 'ticket_price(5)', expect: '8.4', hidden: true },
          ],
          hints: [
            'Free tickets first (guard clause), then children, then students.',
            'Use the names, never the numbers: `BASE * (1 - CHILD_OFF)`.',
          ],
          wrong: [
            'def ticket_price(age, student=False):\n    if age >= 65:\n        return 0.0\n    if age < 12:\n        return 6.0\n    if student:\n        return 9.0\n    return 12.0\n',
            'def ticket_price(age, student=False):\n    if age > 65:\n        return 0.0\n    if age < 12:\n        return round(BASE * (1 - CHILD_OFF), 2)\n    if student:\n        return round(BASE * (1 - STUDENT_OFF), 2)\n    return round(BASE, 2)\n',
            'def ticket_price(age, student=False):\n    if age >= 65:\n        return 0.0\n    if age <= 12:\n        return round(BASE * (1 - CHILD_OFF), 2)\n    if student:\n        return round(BASE * (1 - STUDENT_OFF), 2)\n    return round(BASE, 2)\n',
          ],
          explain: 'Reading module-level constants is normal and safe: the function never changes them. The hidden tests change `BASE` and `CHILD_OFF`, and a version with the numbers typed in fails immediately. One place to change a price beats twenty.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u03-l5',
      title: 'Documenting & Testing',
      summary: 'Docstrings, type hints, assert-based tests and designing a function contract.',
      steps: [
        {
          type: 'learn',
          title: 'Docstrings',
          body: md`
            A **docstring** is a string on the **first line of the body**. It documents what the function does, for whoever calls it next (often future you).

            Write one summary line that says what it **returns**, then the edge cases if needed. Tools show it: \`help(f)\` prints it, editors show it on hover, and it's stored in \`f.__doc__\`.

            A \`#\` comment explains *how* the code works. A docstring explains *how to use* it.
          `,
          code: py`
            def churn_rate(lost, start):
                """Return the share of customers lost.

                Returns 0.0 when start is 0.
                """
                if start == 0:
                    return 0.0
                return lost / start

            print(churn_rate(5, 200))
            print(churn_rate.__doc__)
          `,
        },
        {
          type: 'choice',
          prompt: 'Where must a docstring go to count as one?',
          options: ['First statement in the body', 'A # comment above the def', 'Right after the return', 'Anywhere in the function'],
          answer: 0,
          explain: 'Only a string literal as the **first** statement of the body becomes `__doc__`. A string anywhere else is just an unused value, and `#` comments are thrown away entirely.',
        },
        {
          type: 'learn',
          title: 'Type hints',
          body: md`
            **Type hints** say which types a function expects and returns:

            \`def label(count: int, word: str) -> str:\`

            - \`name: type\` after each parameter, \`-> type\` before the colon
            - with a default: \`rate: float = 0.25\`

            Python **does not enforce** them at runtime. They're documentation that tools (editors, \`mypy\`) check for you. Large codebases use them everywhere, and a typed signature often tells you all you need.
          `,
          code: py`
            def label(count: int, word: str) -> str:
                return f"{count} {word}"

            print(label(3, "orders"))
            print(label("two", "logs"))  # not enforced
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            def double(n: int) -> int:
                return n * 2

            print(double("ab"))
          `,
          options: ['abab', 'TypeError: n must be an int', '0', 'ab2'],
          answer: 0,
          checkOutput: true,
          explain: 'The hint says `int`, but Python runs the code anyway: `"ab" * 2` is `"abab"`. Only a type checker such as mypy would flag this call. Hints help tools and humans; validation still needs real code.',
        },
        {
          type: 'blanks',
          prompt: 'Add the type hints: `total` is a float, and the function returns a float.',
          code: py`
            def avg(total___ float, count: int) ___ float:
                return total / count
          `,
          bank: [':', '->', '=', '=>', '::'],
          answer: [':', '->'],
          tests: [{ call: 'avg(10.0, 4)', expect: '2.5' }],
          explain: 'Parameters get `name: type`. The return type comes after `->`, before the final colon. `=` would set a default value instead.',
        },
        {
          type: 'learn',
          title: 'Quick tests with assert',
          body: md`
            \`assert condition, "message"\` does nothing when the condition is true, and raises **AssertionError** with your message when it's false.

            A few asserts right after a function are the fastest possible test suite: one per normal case, plus the **edge cases**. Rerun them after every change. If nothing complains, everything passed.

            Real projects put the same asserts into \`pytest\` files that run automatically on every commit.
          `,
          code: py`
            def clamp(x, low, high):
                if x < low:
                    return low
                if x > high:
                    return high
                return x

            assert clamp(5, 0, 10) == 5
            assert clamp(-3, 0, 10) == 0
            assert clamp(99, 0, 10) == 10, "upper bound"
            print("all tests passed")
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            def half(n):
                return n // 2

            assert half(10) == 5
            assert half(7) == 3.5, "half(7) is wrong"
            print("ok")
          `,
          options: ['AssertionError: half(7) is wrong', 'ok', 'AssertionError: 3 != 3.5', '3'],
          answer: 0,
          checkOutput: true,
          explain: 'The first assert passes silently. `7 // 2` is 3, not 3.5, so the second one raises and the program stops before `print`. Your message is what you see, so make it say what broke.',
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def sign(n):
                if n > 0:
                    return 1
                if n < 0:
                    return -1
                return 0

            assert sign(5) == 1
            assert sign(0) == 0
            print(sign(-8) * 3)
          `,
          answer: '-3',
          explain: 'Both asserts are true, so they print nothing. `sign(-8)` is -1, times 3 is -3.',
        },
        {
          type: 'learn',
          title: 'Design the contract first',
          body: md`
            Before writing the body, pin down the function's **contract**:

            1. **Inputs**: names, types, allowed ranges
            2. **Output**: type and meaning (a number? rounded? a bool?)
            3. **Edge cases**: zero, negative, empty string, exact boundaries, "impossible" input

            Write the edge cases down as asserts, then make them pass.

            In interviews, asking "what should happen when the divisor is 0?" **before** coding is a strong signal. Interviewers grade how you handle edge cases, not just the happy path.
          `,
        },
        {
          type: 'choice',
          prompt: 'You must write `pct_change(old, new)`. Which input needs a decision **before** you code?',
          options: ['old is 0', 'new is bigger than old', 'both are ints', 'new equals old'],
          answer: 0,
          explain: 'The formula divides by `old`, so `old == 0` crashes unless the contract says what to return. The other cases just work: a bigger `new` gives a positive change, equal values give 0.0.',
        },
        {
          type: 'code',
          title: 'pct_change with a contract',
          prompt: md`
            Write \`pct_change(old, new)\` **with a docstring**. It returns the percentage change from \`old\` to \`new\`, rounded to 1 decimal, and \`None\` when \`old\` is 0 (the change is undefined).

            \`\`\`python
            pct_change(100, 120)  # 20.0
            pct_change(80, 60)    # -25.0
            pct_change(0, 5)      # None
            \`\`\`
          `,
          starter: 'def pct_change(old, new):\n    pass\n',
          solution: py`
            def pct_change(old, new):
                """Return the % change, 1 decimal.

                Returns None when old is 0.
                """
                if old == 0:
                    return None
                return round((new - old) / old * 100, 1)
          `,
          tests: [
            { call: 'pct_change(100, 120)', expect: '20.0' },
            { call: 'pct_change(80, 60)', expect: '-25.0' },
            { call: 'pct_change(0, 5)', expect: 'None' },
            { code: 'assert pct_change.__doc__, "add a docstring"', name: 'has a docstring' },
            { call: 'pct_change(50, 50)', expect: '0.0', hidden: true },
            { call: 'pct_change(3, 4)', expect: '33.3', hidden: true },
            { call: 'pct_change(200, 0)', expect: '-100.0', hidden: true },
          ],
          hints: [
            'Guard first: `if old == 0: return None`.',
            'Change = `(new - old) / old * 100`, then round to 1. The docstring is a `"""..."""` line right under the `def`.',
          ],
          wrong: [
            py`
              def pct_change(old, new):
                  """Return % change from old to new."""
                  if old == 0:
                      return None
                  return round((new - old) / new * 100, 1)
            `,
            py`
              def pct_change(old, new):
                  """Return % change from old to new."""
                  if old == 0:
                      return 0.0
                  return round((new - old) / old * 100, 1)
            `,
            py`
              def pct_change(old, new):
                  if old == 0:
                      return None
                  return round((new - old) / old * 100, 1)
            `,
          ],
          explain: 'Returning `0.0` for "undefined" would be a lie: dashboards would show "no change" for a product that went from 0 to 5 sales. `None` forces the caller to decide. In pandas the same idea is `NaN`, which charts and averages skip.',
        },
        {
          type: 'code',
          title: 'Human-readable file sizes',
          prompt: md`
            Write \`format_bytes(n: int) -> str\` for a storage dashboard (1 KB = 1024 bytes):

            | n | result |
            |---|---|
            | below 1024 | \`"512 B"\` |
            | below 1024² | \`"1.5 KB"\` |
            | below 1024³ | \`"3.2 MB"\` |
            | otherwise | \`"1.0 GB"\` |

            KB, MB and GB values have **1 decimal**. Mind the exact boundaries: 1023 → \`"1023 B"\`, 1024 → \`"1.0 KB"\`.
          `,
          starter: 'def format_bytes(n: int) -> str:\n    pass\n',
          solution: py`
            def format_bytes(n: int) -> str:
                """Return n bytes as a readable size."""
                if n < 1024:
                    return f"{n} B"
                if n < 1024 ** 2:
                    return f"{n / 1024:.1f} KB"
                if n < 1024 ** 3:
                    return f"{n / 1024 ** 2:.1f} MB"
                return f"{n / 1024 ** 3:.1f} GB"
          `,
          tests: [
            { call: 'format_bytes(512)', expect: '"512 B"' },
            { call: 'format_bytes(1536)', expect: '"1.5 KB"' },
            { call: 'format_bytes(1024)', expect: '"1.0 KB"' },
            { call: 'format_bytes(0)', expect: '"0 B"', hidden: true },
            { call: 'format_bytes(1023)', expect: '"1023 B"', hidden: true },
            { call: 'format_bytes(1048576)', expect: '"1.0 MB"', hidden: true },
            { call: 'format_bytes(3355443)', expect: '"3.2 MB"', hidden: true },
            { call: 'format_bytes(5 * 1024 ** 3)', expect: '"5.0 GB"', hidden: true },
            { call: 'format_bytes(2 * 1024 ** 4)', expect: '"2048.0 GB"', hidden: true },
          ],
          hints: [
            'Guard-clause ladder from small to big: `if n < 1024: return ...`.',
            'Divide by the unit and format inside the f-string: `f"{n / 1024:.1f} KB"`.',
          ],
          wrong: [
            py`
              def format_bytes(n: int) -> str:
                  if n < 1000:
                      return f"{n} B"
                  if n < 1000 ** 2:
                      return f"{n / 1000:.1f} KB"
                  if n < 1000 ** 3:
                      return f"{n / 1000 ** 2:.1f} MB"
                  return f"{n / 1000 ** 3:.1f} GB"
            `,
            py`
              def format_bytes(n: int) -> str:
                  if n <= 1024:
                      return f"{n} B"
                  if n <= 1024 ** 2:
                      return f"{n / 1024:.1f} KB"
                  if n <= 1024 ** 3:
                      return f"{n / 1024 ** 2:.1f} MB"
                  return f"{n / 1024 ** 3:.1f} GB"
            `,
            py`
              def format_bytes(n: int) -> str:
                  if n < 1024:
                      return f"{n} B"
                  if n < 1024 ** 2:
                      return f"{n / 1024:.1f} KB"
                  return f"{n / 1024 ** 2:.1f} MB"
            `,
          ],
          explain: 'The type hints and the table **are** the contract, and every hidden test is one row of it: zero, the last value of a unit, the first value of the next. Testing exactly at the boundaries finds `<` versus `<=` bugs every time.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Make the tests pass',
          prompt: md`
            The asserts at the bottom describe what \`discount(price, pct)\` must do, and they fail. Fix the **function** (keep the asserts!) so the program prints \`all good\`.
          `,
          starter: py`
            def discount(price, pct):
                """Price after pct % off, 2 decimals."""
                return round(price - pct / 100, 2)

            assert discount(100, 20) == 80.0
            assert discount(59.99, 0) == 59.99
            assert discount(10, 100) == 0.0
            print("all good")
          `,
          solution: py`
            def discount(price, pct):
                """Price after pct % off, 2 decimals."""
                return round(price * (1 - pct / 100), 2)

            assert discount(100, 20) == 80.0
            assert discount(59.99, 0) == 59.99
            assert discount(10, 100) == 0.0
            print("all good")
          `,
          tests: [
            { stdout: 'all good\n', name: 'the asserts pass' },
            { call: 'discount(80, 25)', expect: '60.0' },
            { call: 'discount(19.99, 10)', expect: '17.99', hidden: true },
          ],
          require: ['assert'],
          hints: [
            'Run it and read which assert fails. What does the function compute for (100, 20)?',
            '20 % off means paying 80 % of the price: `price * (1 - pct / 100)`.',
          ],
          wrong: [
            py`
              def discount(price, pct):
                  """Price after pct % off, 2 decimals."""
                  return round(price - price * pct, 2)

              assert discount(100, 20) == 80.0
              assert discount(59.99, 0) == 59.99
              assert discount(10, 100) == 0.0
              print("all good")
            `,
            py`
              def discount(price, pct):
                  """Price after pct % off, 2 decimals."""
                  return round(price - pct / 100, 2)

              print("all good")
            `,
          ],
          explain: 'The bug subtracted 0.2 euro instead of 20 %. Deleting failing tests to get a green result is the oldest cheat in software. The extra hidden test catches it here, and code review catches it at work.',
        },
      ],
    },

    // ------------------------------------------------------------------ L6
    {
      id: 'u03-l6',
      title: 'Composing Functions',
      summary: 'Build bigger programs from small helpers, refactor repetition, and ship a mini project.',
      steps: [
        {
          type: 'learn',
          title: 'Small functions, big programs',
          body: md`
            Real programs are built from **small functions that call each other**. Each one does one job and has a clear name, so the top-level function reads like a story.

            Small pieces are easy to test on their own, and when a rule changes (say, the VAT rate), there is exactly one place to change it.
          `,
          code: py`
            def subtotal(price, qty):
                return price * qty

            def vat(amount, rate=0.25):
                return amount * rate

            def invoice_total(price, qty):
                net = subtotal(price, qty)
                return round(net + vat(net), 2)

            print(invoice_total(19.99, 3))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            def clean(n):
                return abs(n)

            def scale(n, factor=10):
                return clean(n) * factor

            print(scale(-3), scale(4, 2))
          `,
          answer: '30 8',
          explain: '`scale(-3)` calls `clean(-3)`, which returns 3, times the default 10 is 30. `scale(4, 2)` is 4 × 2 = 8.',
        },
        {
          type: 'choice',
          prompt: 'In what order do things happen? What does this print?',
          code: py`
            def a():
                print("a")
                return 1

            def b():
                print("b")
                return 2

            print(a() + b())
          `,
          options: ['a\nb\n3', '3\na\nb', 'b\na\n3', '3'],
          answer: 0,
          checkOutput: true,
          explain: 'Python evaluates the arguments of `print` first, left to right: `a()` runs and prints, then `b()`. Only then does the outer `print` show their sum.',
        },
        {
          type: 'learn',
          title: 'Refactor repeated code',
          body: md`
            Copy-pasting code with small changes is a warning sign: fix a bug in one copy and the others stay broken.

            **Refactor**: move the shared logic into a function and turn the part that changes into a **parameter**. Rule of thumb ("DRY": Don't Repeat Yourself): the second time you paste something, write a function.
          `,
          code: py`
            def money(x):
                return f"€{x:,.2f}"

            rev = 1234567.5
            cost = 987654.321
            print("Revenue:", money(rev))
            print("Costs:", money(cost))
            print("Profit:", money(rev - cost))
          `,
        },
        {
          type: 'code',
          title: 'Refactor the share report',
          prompt: md`
            The starter repeats the same formula three times. Write \`share(part, whole)\` that returns \`part / whole * 100\` rounded to 1 decimal (and \`0.0\` when \`whole\` is 0). Then rewrite the three prints to **use it**. The output must stay exactly the same.
          `,
          starter: py`
            total = 1200
            print(f"mobile: {round(420 / total * 100, 1)}%")
            print(f"desktop: {round(660 / total * 100, 1)}%")
            print(f"tablet: {round(120 / total * 100, 1)}%")
          `,
          solution: py`
            def share(part, whole):
                if whole == 0:
                    return 0.0
                return round(part / whole * 100, 1)

            total = 1200
            print(f"mobile: {share(420, total)}%")
            print(f"desktop: {share(660, total)}%")
            print(f"tablet: {share(120, total)}%")
          `,
          tests: [
            { stdout: 'mobile: 35.0%\ndesktop: 55.0%\ntablet: 10.0%\n', name: 'same report as before' },
            { call: 'share(1, 3)', expect: '33.3' },
            { call: 'share(5, 0)', expect: '0.0' },
            { call: 'share(0, 7)', expect: '0.0', hidden: true },
            { call: 'share(7, 8)', expect: '87.5', hidden: true },
          ],
          hints: [
            'Write the `def share(part, whole):` first, with a guard for `whole == 0`.',
            'Inside each f-string, replace the `round(...)` with `share(420, total)` and so on.',
          ],
          wrong: [
            py`
              def share(part, whole):
                  return round(part / whole * 100, 1)

              total = 1200
              print(f"mobile: {share(420, total)}%")
              print(f"desktop: {share(660, total)}%")
              print(f"tablet: {share(120, total)}%")
            `,
            py`
              def share(part, whole):
                  if whole == 0:
                      return 0.0
                  return part / whole * 100

              total = 1200
              print(f"mobile: {share(420, total)}%")
              print(f"desktop: {share(660, total)}%")
              print(f"tablet: {share(120, total)}%")
            `,
          ],
          explain: 'Now the rounding rule and the zero guard live in one place. If product decides on 2 decimals tomorrow, you change one line instead of hunting copies. A refactor must not change behaviour, which is why the report is tested character by character.',
        },
        {
          type: 'learn',
          title: 'Mini project: password checker',
          body: md`
            Let's build a **password-strength checker** from small helpers. Each helper answers one question, e.g. \`has_digit(pw)\`.

            Inside each helper is a **search loop**: walk through the characters and \`return True\` as soon as one matches. Only **after** the loop, when every character has been checked, can you \`return False\`.

            Chained comparisons work on single characters: \`"A" <= ch <= "Z"\` means "ch is an uppercase letter".

            Bonus: in arithmetic \`True\` counts as 1 and \`False\` as 0, so \`has_a(pw) + has_b(pw)\` counts how many are true.
          `,
          code: py`
            def has_upper(pw):
                for ch in pw:
                    if "A" <= ch <= "Z":
                        return True
                return False

            print(has_upper("Ops"), has_upper("ops"))
            print(True + True + False)
          `,
        },
        {
          type: 'choice',
          prompt: 'This version has a classic bug. What does it print?',
          code: py`
            def has_upper(pw):
                for ch in pw:
                    if "A" <= ch <= "Z":
                        return True
                    else:
                        return False

            print(has_upper("dataOps"))
          `,
          options: ['False', 'True', 'None', 'Error'],
          answer: 0,
          checkOutput: true,
          explain: 'The very first character, "d", is not uppercase, so the `else` returns False and the loop never reaches "O". "Not found" is only known **after** checking everything, so `return False` belongs after the loop. Interviewers see this bug constantly.',
        },
        {
          type: 'code',
          title: 'Two helpers',
          prompt: md`
            Write two helpers, each returning a bool:

            - \`has_digit(pw)\`: True if \`pw\` contains at least one digit \`0\`–\`9\`
            - \`has_lower(pw)\`: True if it contains at least one lowercase letter \`a\`–\`z\`

            \`\`\`python
            has_digit("abc1")  # True
            has_lower("ABC1")  # False
            \`\`\`
          `,
          starter: 'def has_digit(pw):\n    pass\n\n\ndef has_lower(pw):\n    pass\n',
          solution: py`
            def has_digit(pw):
                for ch in pw:
                    if "0" <= ch <= "9":
                        return True
                return False


            def has_lower(pw):
                for ch in pw:
                    if "a" <= ch <= "z":
                        return True
                return False
          `,
          tests: [
            { call: 'has_digit("abc1")', expect: 'True' },
            { call: 'has_digit("abc")', expect: 'False' },
            { call: 'has_lower("ABC1")', expect: 'False' },
            { call: 'has_lower("Abc")', expect: 'True' },
            { call: 'has_digit("")', expect: 'False', hidden: true },
            { call: 'has_digit("a1b")', expect: 'True', hidden: true },
            { call: 'has_lower("")', expect: 'False', hidden: true },
            { call: 'has_lower("ABCz")', expect: 'True', hidden: true },
          ],
          hints: [
            'Copy the shape of `has_upper` from the card above and change the character range.',
            '`return False` goes **after** the loop, not in an `else`.',
          ],
          wrong: [
            py`
              def has_digit(pw):
                  for ch in pw:
                      if "0" <= ch <= "9":
                          return True
                      else:
                          return False


              def has_lower(pw):
                  for ch in pw:
                      if "a" <= ch <= "z":
                          return True
                      else:
                          return False
            `,
            py`
              def has_digit(pw):
                  for ch in pw:
                      if "0" <= ch <= "9":
                          return True


              def has_lower(pw):
                  for ch in pw:
                      if "a" <= ch <= "z":
                          return True
            `,
          ],
          explain: 'An early `return True` makes the search stop at the first match, so on average it reads only part of the string. The empty string is the edge case: the loop body never runs, and the final `return False` is the correct answer.',
        },
        {
          type: 'code',
          title: 'Password strength',
          prompt: md`
            These helpers already exist: \`has_lower\`, \`has_upper\`, \`has_digit\`, \`has_symbol\` (each takes \`pw\` and returns a bool).

            Write \`strength(pw)\` that **uses them**:
            1. shorter than 8 characters → \`"weak"\`, no matter what
            2. otherwise, 1 point per helper that returns True, plus 1 point for 12+ characters
            3. 4–5 points → \`"strong"\`, 3 → \`"medium"\`, fewer → \`"weak"\`

            \`\`\`python
            strength("Passw0rd")       # 'medium'
            strength("Passw0rd!2025")  # 'strong'
            \`\`\`
          `,
          setup: py`
            def has_lower(pw):
                for ch in pw:
                    if "a" <= ch <= "z":
                        return True
                return False

            def has_upper(pw):
                for ch in pw:
                    if "A" <= ch <= "Z":
                        return True
                return False

            def has_digit(pw):
                for ch in pw:
                    if "0" <= ch <= "9":
                        return True
                return False

            def has_symbol(pw):
                for ch in pw:
                    letter = "a" <= ch <= "z" or "A" <= ch <= "Z"
                    if not letter and not "0" <= ch <= "9":
                        return True
                return False
          `,
          starter: '# has_lower, has_upper, has_digit, has_symbol exist\ndef strength(pw):\n    pass\n',
          solution: py`
            def strength(pw):
                if len(pw) < 8:
                    return "weak"
                points = has_lower(pw) + has_upper(pw)
                points += has_digit(pw) + has_symbol(pw)
                points += len(pw) >= 12
                if points >= 4:
                    return "strong"
                return "medium" if points == 3 else "weak"
          `,
          tests: [
            { call: 'strength("Passw0rd")', expect: '"medium"' },
            { call: 'strength("Passw0rd!2025")', expect: '"strong"' },
            { call: 'strength("Ab1!")', expect: '"weak"' },
            { call: 'strength("password")', expect: '"weak"', hidden: true },
            { call: 'strength("password1234")', expect: '"medium"', hidden: true },
            { call: 'strength("Ab1!Ab1!")', expect: '"strong"', hidden: true },
            { call: 'strength("ABCDEFGHIJKL")', expect: '"weak"', hidden: true },
            { call: 'strength("Sh0rt!")', expect: '"weak"', hidden: true },
          ],
          hints: [
            'Guard first: `if len(pw) < 8: return "weak"`.',
            'Count points: `points = has_lower(pw) + has_upper(pw) + ...` works because True is 1. Or use one `if ...: points += 1` per helper.',
          ],
          wrong: [
            py`
              def strength(pw):
                  points = has_lower(pw) + has_upper(pw)
                  points += has_digit(pw) + has_symbol(pw)
                  points += len(pw) >= 12
                  if points >= 4:
                      return "strong"
                  return "medium" if points == 3 else "weak"
            `,
            py`
              def strength(pw):
                  if len(pw) < 8:
                      return "weak"
                  points = has_lower(pw) + has_upper(pw)
                  points += has_digit(pw) + has_symbol(pw)
                  points += len(pw) > 12
                  if points >= 4:
                      return "strong"
                  return "medium" if points == 3 else "weak"
            `,
            py`
              def strength(pw):
                  if len(pw) < 8:
                      return "weak"
                  points = has_lower(pw) + has_upper(pw)
                  points += has_digit(pw) + has_symbol(pw)
                  points += len(pw) >= 12
                  if points >= 3:
                      return "strong"
                  return "medium" if points == 2 else "weak"
            `,
          ],
          explain: '`strength` doesn\'t care **how** the helpers work, only what they promise. You could swap in faster or stricter helpers without touching it. That separation is what makes large systems manageable.',
        },
        {
          type: 'blanks',
          prompt: 'Complete `gross` so it reuses `net` and honours its own `vat` parameter.',
          code: py`
            def net(price, qty):
                return price * qty

            def gross(price, qty, vat=0.25):
                return round(___(price, qty) * (1 + ___), 2)
          `,
          bank: ['net', 'vat', 'gross', 'qty', '0.25', 'price'],
          answer: ['net', 'vat'],
          tests: [
            { call: 'gross(10, 2)', expect: '25.0' },
            { call: 'gross(10, 2, 0.1)', expect: '22.0' },
            { call: 'gross(4, 5, vat=0)', expect: '20' },
          ],
          explain: 'Calling `net` reuses the existing logic. Typing `0.25` instead of `vat` would pass the default case and silently ignore every caller who passes a different rate.',
        },
        {
          type: 'code',
          title: 'Checkout engine',
          prompt: md`
            Build a shop checkout from small pieces. \`shipping_fee(amount, country)\` already exists.

            1. Write \`discount_pct(code)\`: \`"SAVE10"\` → 10, \`"VIP"\` → 25, anything else → 0.
            2. Write \`checkout(price, qty, code="", country="HR")\`: the subtotal is \`price * qty\`. Apply the discount, then add \`shipping_fee\` of the **discounted** amount, and return the total rounded to 2 decimals.

            \`\`\`python
            checkout(20, 3)                 # 64.0
            checkout(20, 3, code="SAVE10")  # 58.0
            \`\`\`
          `,
          setup: py`
            def shipping_fee(amount, country):
                if amount >= 100:
                    return 0
                return 4 if country == "HR" else 12
          `,
          starter: '# shipping_fee(amount, country) exists\ndef discount_pct(code):\n    pass\n\n\ndef checkout(price, qty, code="", country="HR"):\n    pass\n',
          solution: py`
            def discount_pct(code):
                if code == "SAVE10":
                    return 10
                if code == "VIP":
                    return 25
                return 0


            def checkout(price, qty, code="", country="HR"):
                amount = price * qty
                amount *= 1 - discount_pct(code) / 100
                fee = shipping_fee(amount, country)
                return round(amount + fee, 2)
          `,
          tests: [
            { call: 'discount_pct("SAVE10")', expect: '10' },
            { call: 'discount_pct("nope")', expect: '0' },
            { call: 'checkout(20, 3)', expect: '64.0' },
            { call: 'checkout(20, 3, code="SAVE10")', expect: '58.0' },
            { call: 'discount_pct("vip")', expect: '0', hidden: true },
            { call: 'checkout(50, 2, "VIP", "DE")', expect: '87.0', hidden: true },
            { call: 'checkout(110, 1, "SAVE10")', expect: '103.0', hidden: true },
            { call: 'checkout(120, 1)', expect: '120.0', hidden: true },
            { call: 'checkout(9.99, 3, country="US")', expect: '41.97', hidden: true },
          ],
          hints: [
            '`discount_pct` is a small ladder of `if code == ...: return ...` with `return 0` at the end.',
            'In `checkout`: compute the amount, multiply by `1 - discount_pct(code) / 100`, then call `shipping_fee` on the **new** amount.',
          ],
          wrong: [
            py`
              def discount_pct(code):
                  if code == "SAVE10":
                      return 10
                  if code == "VIP":
                      return 25
                  return 0


              def checkout(price, qty, code="", country="HR"):
                  amount = price * qty
                  fee = shipping_fee(amount, country)
                  amount *= 1 - discount_pct(code) / 100
                  return round(amount + fee, 2)
            `,
            py`
              def discount_pct(code):
                  if code == "SAVE10":
                      return 10
                  if code == "VIP":
                      return 25
                  return 0


              def checkout(price, qty, code="", country="HR"):
                  amount = price * qty - discount_pct(code)
                  fee = shipping_fee(amount, country)
                  return round(amount + fee, 2)
            `,
            py`
              def discount_pct(code):
                  if code == "SAVE10":
                      return 10
                  if code == "VIP":
                      return 25
                  return 0


              def checkout(price, qty, code="", country="HR"):
                  amount = price * qty
                  amount *= 1 - discount_pct(code) / 100
                  fee = shipping_fee(amount, "HR")
                  return round(amount + fee, 2)
            `,
          ],
          explain: md`
            Each rule lives in exactly one function, and \`checkout\` only wires them together. The hidden tests probe the interactions:

            - 110 with SAVE10 drops to 99, **below** the free-shipping line, so shipping is charged
            - the \`country\` argument must be passed through, not hard-coded

            Order of operations between helpers is business logic, and the place where real checkout bugs (and refunds) come from.
          `,
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u03-exam',
    title: 'Functions Exam',
    minutes: 25,
    intro: 'Tracing return values, defaults and scope, then four functions to write or fix. Edge cases are tested. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          def f(x):
              if x > 0:
                  print("pos")
              elif x < 0:
                  return "neg"

          print(f(1), f(-1))
        `,
        options: ['pos\nNone neg', 'pos neg', 'None neg', 'pos\npos neg'],
        answer: 0,
        checkOutput: true,
        explain: 'Both calls run before the outer `print`. `f(1)` prints "pos" and returns `None`. `f(-1)` returns "neg". Then the outer print shows `None neg`.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          n = 5

          def bump(n):
              n += 10
              return n, n * 2

          def show():
              return n * 2

          a, b = bump(n)
          print(a, b, n, show())
        `,
        answer: '15 30 5 10',
        explain: '`bump` changes its **local** parameter `n` (15) and returns a tuple (15, 30). The global `n` is still 5, and `show` reads that global.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          pct = 10

          def price(x, p=pct):
              return x + x * p // 100

          pct = 50
          print(price(200), price(200, pct))
        `,
        options: ['220 300', '300 300', '220 220', '300 220'],
        answer: 0,
        checkOutput: true,
        explain: 'A default value is evaluated **once**, when the `def` runs. At that moment `pct` was 10, so the default stays 10 even after `pct` changes. Passing `pct` explicitly uses the new value 50.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          def check(n):
              for d in range(2, n):
                  if n % d == 0:
                      return d
              print("prime", n)

          r = check(7)
          print(r, check(9))
        `,
        answer: 'prime 7\nNone 3',
        explain: 'For 7 no divisor is found, so the loop ends, the function prints and falls off the end: `r` is `None`. For 9 the loop returns 3 at once.',
      },
      {
        type: 'choice',
        prompt: 'Given `def f(a, b=2, c=3):`, which call raises a TypeError?',
        options: ['f(1, a=2)', 'f(c=1, a=2)', 'f(1, 2, 3)', 'f(1, c=5)'],
        answer: 0,
        explain: '`f(1, a=2)` gives `a` a value twice: once by position, once by keyword ("got multiple values for argument \'a\'"). `f(c=1, a=2)` is fine because keywords can come in any order and `b` uses its default.',
      },
      {
        type: 'choice',
        prompt: 'What happens?',
        code: py`
          total = 100

          def spend(x):
              if x > total:
                  return "declined"
              total = total - x
              return total

          print(spend(30))
        `,
        options: [
          "UnboundLocalError: cannot access local variable 'total' where it is not associated with a value",
          '70',
          'declined',
          "NameError: name 'total' is not defined",
        ],
        answer: 0,
        checkOutput: true,
        explain: 'The assignment `total = total - x` makes `total` local in the **whole** function, so even the first line `if x > total` reads the unset local. Fix it with a new name (`left = total - x`) or by passing the balance in.',
      },
      {
        type: 'code',
        title: 'Leap year',
        prompt: md`
          Write \`is_leap_year(year)\` that returns a **bool**. The Gregorian rule:

          - divisible by 4 → leap year,
          - **except** years divisible by 100, which are not,
          - **except** years divisible by 400, which are.

          So 2024 and 2000 are leap years, while 1900 and 2023 are not.
        `,
        starter: 'def is_leap_year(year):\n    pass\n',
        solution: py`
          def is_leap_year(year):
              if year % 400 == 0:
                  return True
              if year % 100 == 0:
                  return False
              return year % 4 == 0
        `,
        tests: [
          { call: 'is_leap_year(2024)', expect: 'True' },
          { call: 'is_leap_year(2023)', expect: 'False' },
          { call: 'is_leap_year(1900)', expect: 'False', hidden: true },
          { call: 'is_leap_year(2000)', expect: 'True', hidden: true },
          { call: 'is_leap_year(2100)', expect: 'False', hidden: true },
          { call: 'is_leap_year(2400)', expect: 'True', hidden: true },
          { call: 'is_leap_year(1996)', expect: 'True', hidden: true },
          { call: 'is_leap_year(1)', expect: 'False', hidden: true },
        ],
        wrong: [
          'def is_leap_year(year):\n    return year % 4 == 0\n',
          'def is_leap_year(year):\n    return year % 4 == 0 and year % 100 != 0\n',
          'def is_leap_year(year):\n    if year % 100 == 0:\n        return False\n    if year % 400 == 0:\n        return True\n    return year % 4 == 0\n',
        ],
        explain: 'Check the most specific rule (400) first, exactly like an `elif` ladder. A one-liner works too: `return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)`. Date bugs like the 1900/2000 cases still break real billing systems.',
      },
      {
        type: 'code',
        title: 'Format a duration',
        prompt: md`
          Write \`format_duration(seconds)\` that returns a compact string:

          | seconds | result |
          |---|---|
          | under 60 | \`"45s"\` |
          | under 3600 | \`"12m 05s"\` |
          | otherwise | \`"3h 07m 09s"\` |

          Every unit after the first is zero-padded to 2 digits. Hours never wrap (90000 → \`"25h 00m 00s"\`). Negative input returns \`"invalid"\`.
        `,
        starter: 'def format_duration(seconds):\n    pass\n',
        solution: py`
          def format_duration(seconds):
              if seconds < 0:
                  return "invalid"
              h = seconds // 3600
              m = seconds % 3600 // 60
              s = seconds % 60
              if seconds < 60:
                  return f"{s}s"
              if seconds < 3600:
                  return f"{m}m {s:02d}s"
              return f"{h}h {m:02d}m {s:02d}s"
        `,
        tests: [
          { call: 'format_duration(45)', expect: '"45s"' },
          { call: 'format_duration(725)', expect: '"12m 05s"' },
          { call: 'format_duration(11229)', expect: '"3h 07m 09s"' },
          { call: 'format_duration(0)', expect: '"0s"', hidden: true },
          { call: 'format_duration(60)', expect: '"1m 00s"', hidden: true },
          { call: 'format_duration(3599)', expect: '"59m 59s"', hidden: true },
          { call: 'format_duration(3600)', expect: '"1h 00m 00s"', hidden: true },
          { call: 'format_duration(90000)', expect: '"25h 00m 00s"', hidden: true },
          { call: 'format_duration(-1)', expect: '"invalid"', hidden: true },
        ],
        wrong: [
          py`
            def format_duration(seconds):
                if seconds < 0:
                    return "invalid"
                h = seconds // 3600
                m = seconds % 3600 // 60
                s = seconds % 60
                if seconds <= 60:
                    return f"{s}s"
                if seconds <= 3600:
                    return f"{m}m {s:02d}s"
                return f"{h}h {m:02d}m {s:02d}s"
          `,
          py`
            def format_duration(seconds):
                if seconds < 0:
                    return "invalid"
                h = seconds // 3600
                m = seconds % 3600 // 60
                s = seconds % 60
                if seconds < 60:
                    return f"{s}s"
                if seconds < 3600:
                    return f"{m}m {s}s"
                return f"{h}h {m}m {s}s"
          `,
          py`
            def format_duration(seconds):
                h = seconds // 3600 % 24
                m = seconds % 3600 // 60
                s = seconds % 60
                if seconds < 60:
                    return f"{s}s"
                if seconds < 3600:
                    return f"{m}m {s:02d}s"
                return f"{h}h {m:02d}m {s:02d}s"
          `,
        ],
        explain: 'Guard, split, then pick the format. The boundaries 59/60 and 3599/3600 are where the format changes, so that\'s where the hidden tests sit. Without the guard, -1 would print as "59s", because Python\'s `%` returns a non-negative remainder.',
      },
      {
        type: 'code',
        title: 'Count a digit',
        prompt: md`
          Write \`count_digit(n, d)\` that returns how many times the digit \`d\` (0–9) appears in the integer \`n\`. \`n\` may be **0** or **negative**.

          \`\`\`python
          count_digit(1123, 1)  # 2
          count_digit(-707, 7)  # 2
          count_digit(0, 0)     # 1
          \`\`\`
        `,
        starter: 'def count_digit(n, d):\n    pass\n',
        solution: py`
          def count_digit(n, d):
              n = abs(n)
              if n == 0:
                  return 1 if d == 0 else 0
              count = 0
              while n > 0:
                  if n % 10 == d:
                      count += 1
                  n //= 10
              return count
        `,
        tests: [
          { call: 'count_digit(1123, 1)', expect: '2' },
          { call: 'count_digit(-707, 7)', expect: '2' },
          { call: 'count_digit(0, 0)', expect: '1' },
          { call: 'count_digit(0, 5)', expect: '0', hidden: true },
          { call: 'count_digit(1000, 0)', expect: '3', hidden: true },
          { call: 'count_digit(5, 3)', expect: '0', hidden: true },
          { call: 'count_digit(10 ** 12, 0)', expect: '12', hidden: true },
          { call: 'count_digit(-1, 1)', expect: '1', hidden: true },
        ],
        wrong: [
          py`
            def count_digit(n, d):
                count = 0
                while n > 0:
                    if n % 10 == d:
                        count += 1
                    n //= 10
                return count
          `,
          py`
            def count_digit(n, d):
                n = abs(n)
                count = 0
                while n > 0:
                    if n % 10 == d:
                        count += 1
                    n //= 10
                return count
          `,
        ],
        explain: 'Two edge cases break the plain digit loop: negatives (the `while n > 0` never starts, so take `abs` first) and 0 itself, which has one digit even though the loop runs zero times. Interviewers pick inputs like these on purpose.',
      },
      {
        type: 'code',
        kind: 'fix',
        title: 'Fix the budget helpers',
        prompt: md`
          Three helpers for a shopping budget, and **each one** has a bug. The spec:

          - \`with_tax(amount, tax=0.25)\` **returns** the price including tax, rounded to 2 decimals.
          - \`can_afford(amount, tax=0.25)\` returns \`True\` or \`False\`: is the price with **that** tax within the global \`budget\`?
          - \`remaining(amount)\` returns what would be left of \`budget\` after buying (default tax), **without changing** the global \`budget\`.
        `,
        starter: py`
          budget = 100

          def with_tax(amount, tax=0.25):
              print(round(amount * (1 + tax), 2))

          def can_afford(amount, tax=0.25):
              if with_tax(amount) <= budget:
                  return True

          def remaining(amount):
              budget -= with_tax(amount)
              return budget
        `,
        solution: py`
          budget = 100

          def with_tax(amount, tax=0.25):
              return round(amount * (1 + tax), 2)

          def can_afford(amount, tax=0.25):
              return with_tax(amount, tax) <= budget

          def remaining(amount):
              return budget - with_tax(amount)
        `,
        tests: [
          { call: 'with_tax(10)', expect: '12.5' },
          { call: 'with_tax(10, 0.1)', expect: '11.0' },
          { call: 'can_afford(80)', expect: 'True' },
          { call: 'can_afford(81)', expect: 'False', hidden: true },
          { call: 'can_afford(90, tax=0.1)', expect: 'True', hidden: true },
          { call: 'remaining(40)', expect: '50.0' },
          { code: 'remaining(40)\nremaining(40)\nassert budget == 100', name: 'budget is unchanged', hidden: true },
        ],
        wrong: [
          py`
            budget = 100

            def with_tax(amount, tax=0.25):
                return round(amount * (1 + tax), 2)

            def can_afford(amount, tax=0.25):
                return with_tax(amount, tax) <= budget

            def remaining(amount):
                global budget
                budget -= with_tax(amount)
                return budget
          `,
          py`
            budget = 100

            def with_tax(amount, tax=0.25):
                return round(amount * (1 + tax), 2)

            def can_afford(amount, tax=0.25):
                return with_tax(amount) <= budget

            def remaining(amount):
                return budget - with_tax(amount)
          `,
          py`
            budget = 100

            def with_tax(amount, tax=0.25):
                return round(amount * (1 + tax), 2)

            def can_afford(amount, tax=0.25):
                if with_tax(amount, tax) <= budget:
                    return True

            def remaining(amount):
                return budget - with_tax(amount)
          `,
        ],
        explain: md`
          Four bugs, four lessons from this unit:

          - \`print\` instead of \`return\` makes every caller receive \`None\`
          - \`can_afford\` ignored its own \`tax\` argument, a silent bug: no error, wrong answer
          - an \`if\` with only \`return True\` returns \`None\` instead of \`False\`
          - \`budget -= ...\` inside a function raises UnboundLocalError, and "fixing" it with \`global\` changes the budget on every call

          The fixed functions are pure (apart from reading the global), so they can be called in any order, any number of times.
        `,
      },
    ],
  },
};

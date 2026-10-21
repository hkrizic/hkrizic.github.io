// Unit 1 — First Steps. Reference example for CONTENT_GUIDE.md.
import { py, md } from './helpers.js';

export default {
  id: 'u01',
  order: 1,
  track: 'foundations',
  title: 'First Steps',
  subtitle: 'print, variables, numbers, text, types',
  icon: '👋',
  color: '#2BB673',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u01-l1',
      title: 'Hello, Python',
      summary: 'Make Python talk with print(), and leave notes with comments.',
      steps: [
        {
          type: 'learn',
          title: 'Your first program',
          body: md`
            \`print()\` shows a value on the screen. Text goes inside **quotes**, and Python calls a piece of text a **string**.

            Every program in this course runs right here. Tap **Run** to try it, then edit the text and run it again.
          `,
          code: py`
            print("Hello, World!")
            print("I'm learning Python")
          `,
        },
        {
          type: 'choice',
          prompt: 'Which line correctly prints the word Hello?',
          options: ['print("Hello")', 'print(Hello)', 'Print("Hello")', 'print "Hello"'],
          answer: 0,
          explain: md`
            - \`print(Hello)\` has no quotes, so Python looks for a *variable* named Hello.
            - \`Print\` with a capital P doesn't exist. Python is **case-sensitive**.
            - \`print "Hello"\` was Python 2. Python 3 always needs the parentheses.
          `,
        },
        {
          type: 'learn',
          title: 'Numbers need no quotes',
          body: md`
            Numbers are written without quotes, and Python can calculate with them.
            Put quotes around them and they become plain text: Python prints the text exactly as written.
          `,
          code: py`
            print(42)
            print(3 + 4)
            print("3 + 4")
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this program prints.',
          code: py`
            print("10 * 2")
            print(10 * 2)
          `,
          answer: '10 * 2\n20',
          explain: 'The first line is a string, printed as written. The second is real math.',
        },
        {
          type: 'learn',
          title: 'Several values, sep and end',
          body: md`
            Give \`print\` several values separated by commas. It puts a **space** between them.

            - \`sep="…"\` changes what goes *between* the values.
            - \`end="…"\` changes what comes *after* the line (normally a newline).
          `,
          code: py`
            print("Python", 3, "rocks")
            print(2025, 11, 5, sep="-")
            print("Loading", end="...")
            print("done")
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            print("a", "b", "c", sep="")
            print(1, 2, 3, sep=" | ")
          `,
          answer: 'abc\n1 | 2 | 3',
          explain: '`sep=""` glues the values together. `sep=" | "` puts that text between them.',
        },
        {
          type: 'learn',
          title: 'Comments',
          body: md`
            Everything after a \`#\` on a line is a **comment**. Python ignores it.
            Comments explain *why* the code does something, for the humans reading it later (often you).

            > Tip: put a \`#\` in front of a line to switch it off temporarily.
          `,
          code: py`
            # Daily active users, from the dashboard
            dau = 1200
            print(dau)  # 1200
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            # print("A")
            print("B")  # print("C")
          `,
          options: ['B', 'A\nB', 'B\nC', 'A\nB\nC'],
          answer: 0,
          checkOutput: true,
          explain: 'Line 1 is entirely a comment. On line 2, everything after `#` is ignored.',
        },
        {
          type: 'blanks',
          prompt: 'Complete the code so it prints `Data-Driven`.',
          code: 'print("Data", "Driven", ___="-")',
          bank: ['sep', 'end', 'join', 'split'],
          answer: ['sep'],
          tests: [{ stdout: 'Data-Driven\n' }],
          explain: '`sep` goes between the values. `end` would only change the end of the line.',
        },
        {
          type: 'code',
          title: 'Three lines',
          prompt: md`
            Print exactly these three lines:

            \`\`\`
            Hello, World!
            I am learning Python.
            Goal: big data
            \`\`\`
          `,
          starter: '# Write your code below\n',
          solution: py`
            print("Hello, World!")
            print("I am learning Python.")
            print("Goal: big data")
          `,
          tests: [{ stdout: 'Hello, World!\nI am learning Python.\nGoal: big data\n', name: 'prints the three lines' }],
          hints: ['Use one `print("...")` per line.', 'Check punctuation and capital letters. They must match exactly.'],
          wrong: [py`
            print("Hello World!")
            print("I am learning Python.")
            print("Goal: big data")
          `],
          explain: 'Each `print` call ends with a newline, so three calls give three lines. Exact output matters: graders (and interviewers) compare character by character.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the launch sequence',
          prompt: md`
            This program should print:

            \`\`\`
            Ready
            Set
            Go
            \`\`\`

            It has **three** different bugs. Tap **Run** to see the first error, fix it, and repeat.
          `,
          starter: py`
            Print("Ready")
            print("Set\")
            print(Go)
          `,
          solution: py`
            print("Ready")
            print("Set")
            print("Go")
          `,
          tests: [{ stdout: 'Ready\nSet\nGo\n', name: 'prints Ready, Set, Go' }],
          hints: [
            'Read the error message. It names the line with the problem.',
            '`Print` → `print`. A backslash before a quote (`\\"`) escapes it, so the string never ends. And `Go` needs quotes.',
          ],
          explain: 'Python names are case-sensitive. `\\"` means "a quote character inside the string", which leaves the string open. Text without quotes is read as a variable name.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u01-l2',
      title: 'Variables',
      summary: 'Store values under names and update them.',
      steps: [
        {
          type: 'learn',
          title: 'Names for values',
          body: md`
            A **variable** is a name that points to a value. \`=\` means "assign": evaluate the right side and store the result under the name on the left.

            After that, use the name anywhere you'd use the value.
          `,
          code: py`
            language = "Python"
            year = 1991
            print(language, "was released in", year)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            x = 5
            x = x + 2
            print(x)
          `,
          options: ['7', '5', '52', 'x + 2'],
          answer: 0,
          checkOutput: true,
          explain: '`=` isn\'t math equality. Python computes `x + 2` (5 + 2) first, then stores 7 back into `x`.',
        },
        {
          type: 'learn',
          title: 'Naming rules',
          body: md`
            - Letters, digits and \`_\` only, and a name can't **start** with a digit.
            - Case matters: \`total\` and \`Total\` are different names.
            - Python keywords like \`class\`, \`for\`, \`if\` are reserved.
            - Convention: **snake_case**, e.g. \`monthly_revenue\`.

            Good names make code self-explaining. \`x\` is fine for math, but \`daily_users\` beats \`du\` in real code.
          `,
        },
        {
          type: 'choice',
          prompt: 'Which one is a valid variable name?',
          options: ['total_sales', '2nd_place', 'my-score', 'class'],
          answer: 0,
          explain: '`2nd_place` starts with a digit. `my-score` reads as "my minus score". `class` is a keyword.',
        },
        {
          type: 'output',
          prompt: 'Careful! What does this print?',
          code: py`
            a = 10
            b = a
            a = 20
            print(a, b)
          `,
          answer: '20 10',
          explain: '`b = a` copies the *current value* 10 into `b`. Pointing `a` at 20 later doesn\'t change `b`.',
        },
        {
          type: 'learn',
          title: 'Multiple assignment and swapping',
          body: md`
            Assign several names in one line. The right side is evaluated **completely first**, which gives you a clean swap without a temporary variable. Interviewers love that one.
          `,
          code: py`
            x, y = 1, 2
            print(x, y)
            x, y = y, x
            print(x, y)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            x, y = 3, 8
            x, y = y, x + y
            print(x, y)
          `,
          answer: '8 11',
          explain: 'The right side `y, x + y` uses the *old* values: `8, 3 + 8`. Only then are both names updated.',
        },
        {
          type: 'learn',
          title: 'Update operators',
          body: md`
            Changing a variable based on itself is so common that it has a shortcut:

            | long form | shortcut |
            |---|---|
            | \`count = count + 1\` | \`count += 1\` |
            | \`total = total - 5\` | \`total -= 5\` |
            | \`size = size * 2\` | \`size *= 2\` |
          `,
          code: py`
            count = 0
            count += 1
            count += 1
            count *= 10
            print(count)
          `,
        },
        {
          type: 'blanks',
          prompt: 'Make the score go from 10 to 15.',
          code: py`
            score = 10
            score ___ 5
            print(score)
          `,
          bank: ['+=', '=+', '==', '-=', '='],
          answer: ['+='],
          tests: [{ stdout: '15\n' }],
          explain: '`+=` adds to the current value. `=+ 5` would just assign +5, and `==` compares instead of assigning.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines so the program prints `55`.',
          lines: ['price = 20', 'total = price * 3', 'total -= 5', 'print(total)'],
          distractors: ['total = 5'],
          tests: [{ stdout: '55\n' }],
          explain: 'A name must be assigned before it is used, so the lines run top to bottom: 20 → 60 → 55.',
        },
        {
          type: 'code',
          title: 'Profile card',
          prompt: md`
            Create three variables: \`name\` with the text \`"Ada"\`, \`age\` with the number \`36\` and \`city\` with \`"London"\`.

            Then print, **using the variables**:
            \`\`\`
            Ada is 36 and lives in London
            \`\`\`
          `,
          starter: '# your variables here\n\n',
          solution: py`
            name = "Ada"
            age = 36
            city = "London"
            print(name, "is", age, "and lives in", city)
          `,
          tests: [
            { var: 'name', expect: '"Ada"' },
            { var: 'age', expect: '36', name: 'age is the number 36 (no quotes)' },
            { var: 'city', expect: '"London"' },
            { stdout: 'Ada is 36 and lives in London\n', name: 'prints the sentence' },
          ],
          hints: ['Variables first: `name = "Ada"` …', '`print` puts spaces between comma-separated values for you.'],
          wrong: [py`
            name = "Ada"
            age = "36"
            city = "London"
            print(name, "is", age, "and lives in", city)
          `],
          explain: '`age = 36` stores a number; `"36"` would be text. Numbers let you calculate later (`age + 1`).',
        },
        {
          type: 'code',
          title: 'Swap without a temp',
          prompt: md`
            Two variables \`left\` and \`right\` already exist (you can't see their values).
            Swap them so \`left\` holds the old \`right\` and vice versa. **Don't type any numbers.**
          `,
          setup: 'left = 17\nright = 42',
          starter: '# left and right already exist\n',
          solution: 'left, right = right, left\n',
          tests: [
            { var: 'left', expect: '42' },
            { var: 'right', expect: '17' },
            { given: 'left = "a"\nright = "b"', var: 'left', hidden: true },
          ],
          hints: ['Use multiple assignment.', '`a, b = b, a`'],
          wrong: ['left = right\nright = left\n'],
          explain: 'With `left = right` first, the old `left` is lost. Then `right = left` copies the same value back. Tuple-style assignment evaluates `right, left` before assigning anything.',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u01-l3',
      title: 'Numbers & Math',
      summary: 'int, float and the operators: + - * / // % **',
      steps: [
        {
          type: 'learn',
          title: 'int and float',
          body: md`
            Python has whole numbers (**int**) like \`7\` and decimal numbers (**float**) like \`7.5\`.

            \`/\` (true division) **always** returns a float, even when the result is whole.
          `,
          code: py`
            print(7 + 2, 7 - 2, 7 * 2)
            print(7 / 2)
            print(8 / 2)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            print(9 / 3)
            print(9 * 3)
          `,
          answer: '3.0\n27',
          explain: '`/` always gives a float (3.0). `*` with two ints stays an int.',
        },
        {
          type: 'learn',
          title: 'Floor division, remainder, power',
          body: md`
            - \`//\` floor division: divide and round **down**
            - \`%\` modulo: the **remainder**
            - \`**\` power

            \`//\` and \`%\` are a team. Use them to split 135 seconds into 2 minutes and 15 seconds. \`n % 2 == 0\` is the classic even-number check.
          `,
          code: py`
            total = 135
            print(total // 60, "min", total % 60, "s")
            print(2 ** 10)
          `,
        },
        {
          type: 'choice',
          prompt: 'What is `17 % 5`?',
          code: 'print(17 % 5)',
          options: ['2', '3', '3.4', '12'],
          answer: 0,
          checkOutput: true,
          explain: '17 = 3 × 5 + **2**. The remainder is 2.',
        },
        {
          type: 'choice',
          prompt: 'Trick question: what does this print?',
          code: 'print(-7 // 2)',
          options: ['-4', '-3', '-3.5', '3'],
          answer: 0,
          checkOutput: true,
          explain: '`//` rounds **down** (toward negative infinity), not toward zero. -3.5 rounds down to -4. This exact question shows up in screening quizzes.',
        },
        {
          type: 'learn',
          title: 'Order of operations',
          body: md`
            Same rules as in school: \`**\` first, then \`* / // %\`, then \`+ -\`. Parentheses override everything.

            One surprise: \`**\` groups **right-to-left**, so \`2 ** 3 ** 2\` is \`2 ** 9\`.
          `,
          code: py`
            print(2 + 3 * 4)
            print((2 + 3) * 4)
          `,
        },
        {
          type: 'output',
          prompt: 'Type the three lines this prints.',
          code: py`
            print(10 - 4 / 2)
            print((10 - 4) // 4)
            print(2 ** 3 ** 2)
          `,
          answer: '8.0\n1\n512',
          explain: '`4 / 2` happens first and is a float → 8.0. `6 // 4` → 1. `3 ** 2` = 9 first, then `2 ** 9` = 512.',
        },
        {
          type: 'learn',
          title: 'Handy built-ins and float surprises',
          body: md`
            \`round(x, 2)\`, \`abs(x)\`, \`min(...)\` and \`max(...)\` are built in.

            Floats are stored in binary, so some decimals can't be exact. **Never compare floats with \`==\`**. Round them first, or check that the difference is tiny.
          `,
          code: py`
            print(round(3.14159, 2), abs(-8), max(3, 9, 4))
            print(0.1 + 0.2)
            print(round(0.1 + 0.2, 2) == 0.3)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: 'print(0.1 + 0.2 == 0.3)',
          options: ['False', 'True', '0.3', 'Error'],
          answer: 0,
          checkOutput: true,
          explain: '0.1 + 0.2 is really 0.30000000000000004. In data work, compare floats with a tolerance (`abs(a - b) < 1e-9`) or round first.',
        },
        {
          type: 'blanks',
          prompt: 'Split 135 seconds into minutes and seconds so the program prints `2 15`.',
          code: py`
            total = 135
            minutes = total ___ 60
            seconds = total ___ 60
            print(minutes, seconds)
          `,
          bank: ['//', '%', '/', '**', '*'],
          answer: ['//', '%'],
          tests: [{ stdout: '2 15\n' }],
          explain: '`//` counts the full minutes, `%` gives what is left over.',
        },
        {
          type: 'code',
          title: 'Uptime report',
          prompt: md`
            A server has been up for \`seconds\` seconds (already defined, it could be any number).
            Create variables \`hours\`, \`minutes\` and \`secs\`, then print them like this (for 98765 seconds):

            \`\`\`
            27h 26m 5s
            \`\`\`
          `,
          setup: 'seconds = 98765',
          starter: '# seconds is already defined\nhours = \nminutes = \nsecs = \n',
          solution: py`
            hours = seconds // 3600
            minutes = seconds % 3600 // 60
            secs = seconds % 60
            print(hours, "h ", minutes, "m ", secs, "s", sep="")
          `,
          tests: [
            { var: 'hours', expect: '27' },
            { var: 'minutes', expect: '26' },
            { var: 'secs', expect: '5' },
            { stdout: '27h 26m 5s\n', name: 'prints 27h 26m 5s' },
            { given: 'seconds = 3661', stdout: true },
            { given: 'seconds = 59', stdout: true, hidden: true },
          ],
          hints: ['One hour is 3600 seconds: `hours = seconds // 3600`.', 'What remains after the hours is `seconds % 3600`. Split *that* into minutes.', 'Use `sep=""` and put the spaces into the text pieces.'],
          wrong: [py`
            hours = seconds // 3600
            minutes = seconds // 60
            secs = seconds % 60
            print(hours, "h ", minutes, "m ", secs, "s", sep="")
          `, 'hours = 27\nminutes = 26\nsecs = 5\nprint("27h 26m 5s")\n'],
          explain: '`seconds % 3600` throws away the full hours. `// 60` then counts the minutes in what is left. You will meet this "divide, then take the remainder" pattern in every date/time pipeline.',
        },
        {
          type: 'code',
          title: 'Compound interest',
          prompt: md`
            You invest \`principal = 2500\` at \`rate = 0.04\` (4 % per year) for \`years = 10\`.

            The final amount is \`principal * (1 + rate) ** years\`. Store it, **rounded to 2 decimals**, in \`amount\` and print it.
          `,
          starter: 'principal = 2500\nrate = 0.04\nyears = 10\n',
          solution: py`
            principal = 2500
            rate = 0.04
            years = 10
            amount = round(principal * (1 + rate) ** years, 2)
            print(amount)
          `,
          tests: [
            { var: 'amount', expect: '3700.61' },
            { stdout: '3700.61\n', name: 'prints 3700.61' },
          ],
          hints: ['Put `(1 + rate)` in parentheses, because `**` binds tighter than `+`.', '`round(value, 2)`'],
          wrong: [py`
            principal = 2500
            rate = 0.04
            years = 10
            amount = round(principal * 1 + rate ** years, 2)
            print(amount)
          `],
          explain: 'Without parentheses, `1 + rate ** years` raises only `rate` to the power. Operator precedence bugs like this hide in real financial code.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u01-l4',
      title: 'Text & f-strings',
      summary: 'Combine text, measure it and format numbers inside it.',
      steps: [
        {
          type: 'learn',
          title: 'Working with strings',
          body: md`
            Strings can use \`'single'\` or \`"double"\` quotes.

            - \`+\` joins (concatenates) strings
            - \`*\` repeats a string
            - \`len(s)\` counts its characters
          `,
          code: py`
            first = "Data"
            print(first + "Base")
            print("-" * 12)
            print(len("Python"))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            print("ab" + "cd")
            print("ha" * 3)
            print(len("big data"))
          `,
          answer: 'abcd\nhahaha\n8',
          explain: 'The space counts as a character: "big data" has 8.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: 'print("5" + "5")',
          options: ['55', '10', '5 5', 'Error'],
          answer: 0,
          checkOutput: true,
          explain: 'Both are strings, so `+` glues the text together. The quotes make all the difference.',
        },
        {
          type: 'choice',
          prompt: 'What happens here?',
          code: 'print("Age: " + 30)',
          options: ['TypeError: can only concatenate str (not "int") to str', 'Age: 30', 'Age:30', 'SyntaxError: invalid syntax'],
          answer: 0,
          checkOutput: true,
          explain: 'Python won\'t silently mix text and numbers. Convert with `str(30)`, or (better) use an f-string.',
        },
        {
          type: 'learn',
          title: 'f-strings',
          body: md`
            Put an \`f\` before the quotes and write any expression inside \`{ }\`. It's the cleanest way to build text.

            Format specs go after a colon:
            - \`{x:.2f}\` → 2 decimals
            - \`{n:,}\` → thousands separators
            - \`{n:02d}\` → pad with zeros to width 2
          `,
          code: py`
            name = "Ada"
            revenue = 1234567.891
            print(f"Hi {name}, you have {2 + 3} alerts")
            print(f"Revenue: {revenue:,.2f}")
            print(f"{7:02d}:{5:02d}")
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            name = "Ada"
            n = 3
            print(f"{name} has {n * 2} cats")
          `,
          answer: 'Ada has 6 cats',
          explain: 'Anything inside `{ }` is evaluated, so `n * 2` becomes 6.',
        },
        {
          type: 'output',
          prompt: 'Type both lines exactly.',
          code: py`
            price = 1234.5
            print(f"{price:.2f}")
            print(f"{1234567:,}")
          `,
          answer: '1234.50\n1,234,567',
          explain: '`.2f` always shows exactly 2 decimals. `,` groups the thousands.',
        },
        {
          type: 'learn',
          title: 'Escape sequences',
          body: md`
            A backslash starts a special character inside a string:

            - \`\\n\` new line, \`\\t\` tab
            - \`\\"\` a quote, \`\\\\\` a backslash

            Triple quotes \`"""…"""\` let a string span several lines.
          `,
          code: py`
            print("line one\nline two")
            print("She said \"hi\"")
            print("""a
            b""")
          `,
        },
        {
          type: 'choice',
          prompt: 'How many lines does this print?',
          code: 'print("one\\ntwo\\nthree")',
          options: ['3', '1', '2', '5'],
          answer: 0,
          explain: 'Each `\\n` starts a new line: one / two / three.',
        },
        {
          type: 'blanks',
          prompt: 'Make it print `coffee: €3.50`.',
          code: py`
            item = "coffee"
            price = 3.5
            print(___"{item}: €{price___}")
          `,
          bank: ['f', 'r', ':.2f', ':2f', '.2f'],
          answer: ['f', ':.2f'],
          tests: [{ stdout: 'coffee: €3.50\n' }],
          explain: 'The `f` prefix turns on the `{ }` slots, and `:.2f` formats the number with 2 decimals.',
        },
        {
          type: 'code',
          title: 'Receipt line',
          prompt: md`
            \`item\`, \`qty\` and \`unit_price\` are already defined. Print one receipt line with an **f-string**, the total always shown with 2 decimals. For \`"Mug"\`, \`3\` and \`8.9\`:

            \`\`\`
            3 x Mug = 26.70
            \`\`\`
          `,
          setup: 'item = "Mug"\nqty = 3\nunit_price = 8.9',
          starter: '# item, qty and unit_price exist\n',
          solution: 'print(f"{qty} x {item} = {qty * unit_price:.2f}")\n',
          tests: [
            { stdout: '3 x Mug = 26.70\n', name: 'prints 3 x Mug = 26.70' },
            { given: 'item = "Tea"\nqty = 2\nunit_price = 4.25', stdout: true },
          ],
          require: ['fstring'],
          hints: ['Start with `print(f"...")`.', 'You can compute inside the braces: `{qty * unit_price:.2f}`.'],
          wrong: ['print(f"{qty} x {item} = {qty * unit_price}")\n'],
          explain: '3 * 8.9 is 26.700000000000003 as a float. The `.2f` spec rounds it for display without changing the value.',
        },
        {
          type: 'code',
          title: 'Banner',
          prompt: md`
            \`word\` is already defined. Print a banner: a line of \`=\` exactly as long as the word, the word, then the line again. For \`"PYTHON"\`:

            \`\`\`
            ======
            PYTHON
            ======
            \`\`\`
          `,
          setup: 'word = "PYTHON"',
          starter: '# word is already defined\n',
          solution: py`
            line = "=" * len(word)
            print(line)
            print(word)
            print(line)
          `,
          tests: [
            { stdout: '======\nPYTHON\n======\n', name: 'banner for PYTHON' },
            { given: 'word = "SQL"', stdout: true },
          ],
          hints: ['`len(word)` gives the length.', 'Repeat a string with `*`: `"=" * 3` → `===`.'],
          wrong: ['print("======")\nprint(word)\nprint("=====")\n'],
          explain: 'Computing the length (instead of counting by hand) makes the code work for any word.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u01-l5',
      title: 'Types & Conversion',
      summary: 'int, float, str, bool, and how to convert between them.',
      steps: [
        {
          type: 'learn',
          title: 'Every value has a type',
          body: md`
            \`type(x)\` tells you what kind of value \`x\` is. The four basic types:

            | type | examples |
            |---|---|
            | \`int\` | \`42\`, \`-3\` |
            | \`float\` | \`3.14\`, \`2.0\` |
            | \`str\` | \`"hi"\`, \`"42"\` |
            | \`bool\` | \`True\`, \`False\` |
          `,
          code: py`
            print(type(42))
            print(type("42"))
            print(type(4 > 3))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            print(type(3.0))
            print(type("3"))
          `,
          answer: "<class 'float'>\n<class 'str'>",
          explain: '`3.0` has a decimal point, so it\'s a float. `"3"` has quotes, so it\'s a string.',
        },
        {
          type: 'learn',
          title: 'Converting types',
          body: md`
            Use the type's name as a function to convert:

            - \`int("42")\` → 42 and \`float("3.5")\` → 3.5
            - \`str(7)\` → "7"
            - \`int(3.99)\` → 3. It **cuts off** the decimals. It doesn't round!

            Data from files, forms and APIs often arrives as text. Converting it is step one of almost every data pipeline.
          `,
          code: py`
            count = "41"
            print(int(count) + 1)
            print(int(3.99), round(3.99))
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            print(int("42") + 1)
            print(int(3.99))
            print(str(7) + "7")
          `,
          answer: '43\n3\n77',
          explain: '`int(3.99)` truncates to 3. `str(7) + "7"` joins two strings.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: 'print(int("3.5"))',
          options: ["ValueError: invalid literal for int() with base 10: '3.5'", '3', '4', '3.5'],
          answer: 0,
          checkOutput: true,
          explain: '`int()` only accepts text that looks like a whole number. Do `int(float("3.5"))` if you really mean it.',
        },
        {
          type: 'learn',
          title: 'Booleans and truthiness',
          body: md`
            \`True\` and \`False\` are the two **bool** values, and comparisons produce them.

            \`bool(x)\` asks whether a value is "truthy". \`0\`, \`0.0\`, \`""\` (empty string) and \`None\` are **falsy**. Almost everything else is truthy, including the string \`"False"\`!
          `,
          code: py`
            print(5 > 3, 5 == 3)
            print(bool(0), bool(""), bool("0"))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: 'print(bool("False"))',
          options: ['True', 'False', 'Error', 'None'],
          answer: 0,
          checkOutput: true,
          explain: 'Any non-empty string is truthy, whatever it says. Parsing "true"/"false" text from a CSV needs an explicit comparison: `s == "true"`.',
        },
        {
          type: 'blanks',
          prompt: 'The price arrives as text. Make the program print `39.98`.',
          code: py`
            text = "19.99"
            price = ___(text)
            print(price * 2)
          `,
          bank: ['float', 'int', 'str', 'bool'],
          answer: ['float'],
          tests: [{ stdout: '39.98\n' }],
          explain: '`int("19.99")` would raise a ValueError. Decimals need `float`.',
        },
        {
          type: 'code',
          title: 'Add the strings',
          prompt: md`
            Two counts arrived as text: \`a = "12"\` and \`b = "30"\` (already defined).
            Store their numeric sum in \`total\` (an **int**) and print \`Total: 42\`.
          `,
          setup: 'a = "12"\nb = "30"',
          starter: '# a and b are strings\n',
          solution: 'total = int(a) + int(b)\nprint(f"Total: {total}")\n',
          tests: [
            { var: 'total', expect: '42', name: 'total is the int 42' },
            { stdout: 'Total: 42\n' },
            { given: 'a = "7"\nb = "-2"', var: 'total', hidden: true },
          ],
          hints: ['`a + b` would give "1230". Convert first.', '`int(a) + int(b)`'],
          wrong: ['total = a + b\nprint(f"Total: {total}")\n', 'total = float(a) + float(b)\nprint(f"Total: {total}")\n'],
          explain: 'Converting with `int` keeps the type exact. `float` would print `42.0`, and the test wants the int 42.',
        },
        {
          type: 'code',
          title: 'Average score',
          prompt: md`
            Three exam scores arrived as strings: \`s1\`, \`s2\`, \`s3\` (already defined, e.g. \`"88"\`, \`"92.5"\`, \`"79"\`).

            Compute their average as a float **rounded to 1 decimal**, store it in \`avg\`, and print \`Average: 86.5\`.
          `,
          setup: 's1 = "88"\ns2 = "92.5"\ns3 = "79"',
          starter: '# s1, s2, s3 are strings\n',
          solution: py`
            avg = round((float(s1) + float(s2) + float(s3)) / 3, 1)
            print(f"Average: {avg}")
          `,
          tests: [
            { var: 'avg', expect: '86.5' },
            { stdout: 'Average: 86.5\n' },
            { given: 's1 = "70"\ns2 = "71"\ns3 = "75.5"', var: 'avg', hidden: true },
          ],
          hints: ['"92.5" has decimals, so use `float()`.', 'Add the three, divide by 3, then `round(..., 1)`.'],
          wrong: ['avg = round(float(s1) + float(s2) + float(s3) / 3, 1)\nprint(f"Average: {avg}")\n'],
          explain: 'Without parentheses only `s3` gets divided by 3. Precedence again!',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u01-exam',
    title: 'First Steps Exam',
    minutes: 15,
    intro: 'Printing, variables, arithmetic, strings and type conversion, mixed together. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: 'print(2 ** 10 % 1000)',
        options: ['24', '1024', '1000', '0'],
        answer: 0,
        checkOutput: true,
        explain: '`**` first: 1024. Then `1024 % 1000` = 24.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          x = 5
          x *= 3
          x -= 1
          print(x // 4, x % 4)
        `,
        answer: '3 2',
        explain: 'x goes 5 → 15 → 14. 14 // 4 = 3 and 14 % 4 = 2.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          a, b = "3", 4
          print(a * b)
          print(int(a) * b)
        `,
        answer: '3333\n12',
        explain: 'A string times an int repeats the string. After `int(a)` it\'s arithmetic.',
      },
      {
        type: 'choice',
        prompt: 'Which expression raises an error?',
        options: ['"Python" + 3', '"Py" * 3', 'str(3) + "Py"', 'len("Py") + 3'],
        answer: 0,
        explain: 'You can repeat a string by an int, but not add an int to it.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          a = 7
          b = a
          a += 1
          print(a, b, a / b > 1)
        `,
        options: ['8 7 True', '8 8 False', '8 7 False', '7 7 False'],
        answer: 0,
        checkOutput: true,
        explain: '`b` keeps the old value 7. 8 / 7 > 1 is True.',
      },
      {
        type: 'blanks',
        prompt: 'Print `pi ≈ 3.14`.',
        code: py`
          pi = 3.14159
          print(___"pi ≈ {pi:___}")
        `,
        bank: ['f', '.2f', '.3f', '2f', 'r'],
        answer: ['f', '.2f'],
        tests: [{ stdout: 'pi ≈ 3.14\n' }],
      },
      {
        type: 'code',
        title: 'Split the bill',
        prompt: md`
          \`total\` (the bill in €), \`people\` and \`tip_percent\` are defined.
          Add the tip, split it evenly, store the share **rounded to 2 decimals** in \`per_person\`, and print it with 2 decimals:

          \`\`\`
          Each pays €25.13
          \`\`\`
          (for total = 87.40, people = 4, tip_percent = 15)
        `,
        setup: 'total = 87.40\npeople = 4\ntip_percent = 15',
        starter: '# total, people, tip_percent exist\n',
        solution: py`
          per_person = round(total * (1 + tip_percent / 100) / people, 2)
          print(f"Each pays €{per_person:.2f}")
        `,
        tests: [
          { var: 'per_person', expect: '25.13', hidden: true },
          { stdout: 'Each pays €25.13\n', name: 'prints the share' },
          { given: 'total = 120\npeople = 3\ntip_percent = 10', stdout: true, hidden: true },
        ],
        wrong: [
          'per_person = round(total * (1 + tip_percent) / people, 2)\nprint(f"Each pays €{per_person:.2f}")\n',
          'per_person = round(total / people, 2)\nprint(f"Each pays €{per_person:.2f}")\n',
        ],
        explain: '15 % means a factor of 1.15. Divide by 100 before adding 1.',
      },
      {
        type: 'code',
        title: 'Clock display',
        prompt: md`
          \`seconds\` is defined (e.g. 7384). Print it as a zero-padded clock \`HH:MM:SS\`:

          \`\`\`
          02:03:04
          \`\`\`
        `,
        setup: 'seconds = 7384',
        starter: '# seconds exists\n',
        solution: py`
          h = seconds // 3600
          m = seconds % 3600 // 60
          s = seconds % 60
          print(f"{h:02d}:{m:02d}:{s:02d}")
        `,
        tests: [
          { stdout: '02:03:04\n', name: 'prints 02:03:04' },
          { given: 'seconds = 45296', stdout: true, hidden: true },
          { given: 'seconds = 59', stdout: true, hidden: true },
        ],
        wrong: [py`
          h = seconds // 3600
          m = seconds % 3600 // 60
          s = seconds % 60
          print(f"{h}:{m}:{s}")
        `],
        explain: '`:02d` pads with zeros to width 2. That\'s the standard way to format times and IDs.',
      },
      {
        type: 'code',
        kind: 'fix',
        title: 'Fix the order total',
        prompt: md`
          This should print \`Total: 13.05\` (3 items at "4.35" each), but it crashes. Fix it so the total is shown with 2 decimals.
        `,
        starter: py`
          price = "4.35"
          qty = 3
          total = price * qty
          print("Total: " + total)
        `,
        solution: py`
          price = "4.35"
          qty = 3
          total = float(price) * qty
          print(f"Total: {total:.2f}")
        `,
        tests: [{ stdout: 'Total: 13.05\n', name: 'prints Total: 13.05' }],
        wrong: [py`
          price = "4.35"
          qty = 3
          total = float(price) * qty
          print("Total: " + str(total))
        `],
        explain: 'Convert the text to a number before multiplying. 4.35 × 3 is 13.049999999999999 as a float, so format with `.2f` for display.',
      },
    ],
  },
};

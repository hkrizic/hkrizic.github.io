// Unit 2 — Decisions & Loops.
import { py, md } from './helpers.js';

export default {
  id: 'u02',
  order: 2,
  track: 'foundations',
  title: 'Decisions & Loops',
  subtitle: 'comparisons, if/elif, while, for, patterns',
  icon: '🔀',
  color: '#1CB0F6',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u02-l1',
      title: 'Comparisons & Booleans',
      summary: 'Ask yes/no questions with ==, <, and, or, not and in.',
      steps: [
        {
          type: 'learn',
          title: 'Asking questions',
          body: md`
            A **comparison** asks a yes/no question and gives back a **bool**: \`True\` or \`False\`.

            | operator | meaning |
            |---|---|
            | \`==\` | equal |
            | \`!=\` | not equal |
            | \`<\` \`>\` | less / greater |
            | \`<=\` \`>=\` | less / greater or equal |

            Careful: \`=\` **assigns**, \`==\` **compares**. Mixing them up is the most common beginner typo.
          `,
          code: py`
            age = 20
            print(age >= 18)
            print(age == 21, age != 21)
            print(3 == 3.0)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            stock = 0
            print(stock == 0, stock > 0)
            print(10 == "10")
          `,
          options: ['True False\nFalse', 'True False\nTrue', 'False True\nFalse', 'True True\nFalse'],
          answer: 0,
          checkOutput: true,
          explain: md`
            \`10 == "10"\` compares an int with a string. They are never equal, and Python doesn't raise an error, it just says \`False\`.

            This bites in data work: values read from a CSV file are **text**, so \`row_count == 10\` is silently False until you convert with \`int()\`. (Ordering them, \`10 < "10"\`, does raise a TypeError.)
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            a = 7
            b = 3
            print(a > b, a <= b)
            print(a % b == 1)
            print(a // b != 2)
          `,
          answer: 'True False\nTrue\nFalse',
          explain: 'Arithmetic runs before the comparison. `7 % 3` is 1, so `1 == 1` is True. `7 // 3` is 2, so `2 != 2` is False.',
        },
        {
          type: 'learn',
          title: 'and, or, not, and chains',
          body: md`
            Combine questions with **logical operators**:

            - \`a and b\` is True only if **both** are True
            - \`a or b\` is True if **at least one** is True
            - \`not a\` flips True and False

            Priority: \`not\` first, then \`and\`, then \`or\`. When you mix them, add parentheses. They cost nothing and prevent bugs.

            Python also **chains** comparisons like in math: \`18 <= age <= 65\` means \`18 <= age and age <= 65\`.
          `,
          code: py`
            age = 34
            country = "HR"
            print(age >= 18 and country == "HR")
            print(age < 18 or country == "DE")
            print(not age > 30)
            print(18 <= age <= 65)
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            x = 15
            print(10 < x < 20, not x > 10)
            print(x > 20 or x % 5 == 0)
          `,
          options: ['True False\nTrue', 'True True\nTrue', 'False False\nTrue', 'True False\nFalse'],
          answer: 0,
          checkOutput: true,
          explain: '`10 < x < 20` is True. `not x > 10` means `not (x > 10)`, so `not True` is False. In the last line `x > 20` is False but `15 % 5 == 0` is True, and `or` needs only one.',
        },
        {
          type: 'output',
          prompt: 'Precedence check. What are the three lines?',
          code: py`
            print(True or False and False)
            print((True or False) and False)
            print(not True or True)
          `,
          answer: 'True\nFalse\nTrue',
          explain: md`
            - \`and\` binds tighter, so line 1 is \`True or (False and False)\`, which is True.
            - The parentheses in line 2 force the \`or\` first: \`True and False\` is False.
            - \`not\` binds tightest: \`(not True) or True\` is True.
          `,
        },
        {
          type: 'blanks',
          prompt: '`age` is already defined. Make `eligible` True exactly when age is between 18 and 65, **both included**.',
          setup: 'age = 30',
          code: py`
            eligible = 18 ___ age ___ 65
            print(eligible)
          `,
          bank: ['<=', '<=', '<', '>=', '=<'],
          answer: ['<=', '<='],
          tests: [
            { var: 'eligible', expect: 'True' },
            { given: 'age = 18', var: 'eligible', expect: 'True' },
            { given: 'age = 65', var: 'eligible', expect: 'True' },
            { given: 'age = 17', var: 'eligible', expect: 'False' },
            { given: 'age = 66', var: 'eligible', expect: 'False' },
          ],
          explain: '"Both included" means `<=` on both sides. `<` would reject exactly 18 and 65. Boundary values are where most real bugs hide, so test them first. `=<` is not an operator in Python at all.',
        },
        {
          type: 'learn',
          title: 'Short-circuit evaluation',
          body: md`
            Python evaluates \`and\` / \`or\` **left to right and stops as soon as the answer is known**:

            - \`a and b\`: if \`a\` is falsy the result is \`a\`, and \`b\` never runs
            - \`a or b\`: if \`a\` is truthy the result is \`a\`, and \`b\` never runs

            Two everyday uses:
            1. **Guards**: \`count > 0 and total / count > 10\` can never divide by zero.
            2. **Defaults**: \`name or "anonymous"\` falls back when \`name\` is empty.

            Note that they return one of the **operands**, not necessarily \`True\` or \`False\`.
          `,
          code: py`
            count = 0
            total = 0
            print(count > 0 and total / count > 10)
            name = ""
            print(name or "anonymous")
            print(3 and 7, 0 or 5)
          `,
        },
        {
          type: 'choice',
          prompt: 'Same idea, different order. What happens?',
          code: py`
            orders = 0
            revenue = 500
            print(revenue / orders > 10 and orders > 0)
          `,
          options: ['ZeroDivisionError: division by zero', 'False', 'True', '0'],
          answer: 0,
          checkOutput: true,
          explain: 'The left side runs first, so the division happens before the guard is checked. A guard only protects what comes **after** it: write `orders > 0 and revenue / orders > 10`.',
        },
        {
          type: 'output',
          prompt: 'What does this print? Remember: `and`/`or` return an operand.',
          code: py`
            print(0 or "n/a")
            print(5 and "yes")
            print(None or 0 or "last")
            print(1 < 2 and "ok")
          `,
          answer: 'n/a\nyes\nlast\nok',
          explain: md`
            - \`0\` is falsy, so \`or\` returns the right side.
            - \`5\` is truthy, so \`and\` has to look at (and return) the right side.
            - \`or\` returns the first truthy value, and \`"last"\` is the first one.
            - \`1 < 2\` is True, so \`and\` returns \`"ok"\`.
          `,
        },
        {
          type: 'learn',
          title: 'Comparing text',
          body: md`
            Strings compare **character by character**, by each character's Unicode number. Same-case words come out alphabetical, but:

            - it's **case-sensitive**: \`"Data" == "data"\` is False
            - every uppercase letter sorts before every lowercase one: \`"Zebra" < "apple"\`
            - digits compare as text: \`"10" < "9"\`, because \`"1" < "9"\`

            \`in\` checks whether one string appears **inside** another, and \`not in\` is the opposite. Both are case-sensitive too.

            > To ignore case, lower-case both sides first with \`.lower()\`. More on that in the Strings unit.
          `,
          code: py`
            print("apple" < "banana")
            print("Zebra" < "apple")
            print("10" < "9")
            print("ERROR" in "500 ERROR: timeout")
            print("error" in "500 ERROR: timeout")
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            s = "Completed"
            print(s == "completed", "plete" in s)
          `,
          options: ['False True', 'True True', 'True False', 'False False'],
          answer: 0,
          checkOutput: true,
          explain: '`"C"` and `"c"` are different characters, so the equality is False. `in` finds `"plete"` inside `"Completed"`. Status columns with mixed case are a classic data-cleaning trap.',
        },
        {
          type: 'code',
          title: 'Free shipping rule',
          prompt: md`
            An order ships **free** when its \`total\` is at least 50, **or** when the customer \`is_member\` **and** the \`country\` is \`"DE"\` or \`"AT"\`.

            \`total\`, \`is_member\` and \`country\` are already defined. Store the answer (a bool) in \`free_shipping\` and print it. No \`if\` needed: a boolean expression is enough.

            For total = 49.5, is_member = True, country = "AT" it prints \`True\`.
          `,
          setup: 'total = 49.5\nis_member = True\ncountry = "AT"',
          starter: '# total, is_member, country exist\nfree_shipping = \n',
          solution: py`
            eu = country == "DE" or country == "AT"
            member_ok = is_member and eu
            free_shipping = total >= 50 or member_ok
            print(free_shipping)
          `,
          tests: [
            { var: 'free_shipping', expect: 'True' },
            { stdout: 'True\n', name: 'prints True' },
            { given: 'total = 50\nis_member = False\ncountry = "US"', var: 'free_shipping', expect: 'True' },
            { given: 'total = 49.99\nis_member = False\ncountry = "DE"', var: 'free_shipping', expect: 'False', hidden: true },
            { given: 'total = 10\nis_member = True\ncountry = "FR"', var: 'free_shipping', expect: 'False', hidden: true },
            { given: 'total = 10\nis_member = False\ncountry = "AT"', var: 'free_shipping', expect: 'False', hidden: true },
            { given: 'total = 10\nis_member = True\ncountry = "DE"', var: 'free_shipping', expect: 'True', hidden: true },
          ],
          hints: [
            'Build it from two parts: "total is at least 50" OR "member AND (DE or AT)".',
            'Put the member part in parentheses, and spell out `country == "DE" or country == "AT"` in full.',
          ],
          wrong: [
            'free_shipping = total >= 50 or is_member and country == "DE" or country == "AT"\nprint(free_shipping)\n',
            'free_shipping = total > 50 or (is_member and (country == "DE" or country == "AT"))\nprint(free_shipping)\n',
            'free_shipping = total >= 50 or is_member and country == "DE" or "AT"\nprint(free_shipping)\n',
          ],
          explain: md`
            Two classic bugs live here:

            - Without parentheses, \`... or is_member and country == "DE" or country == "AT"\` gives free shipping to **every** Austrian, member or not, because \`and\` binds tighter than \`or\`.
            - \`country == "DE" or "AT"\` reads as \`(country == "DE") or "AT"\`. The non-empty string \`"AT"\` is truthy, so the condition is always truthy.

            Naming a sub-condition (\`eu = ...\`) keeps long rules readable.
          `,
        },
        {
          type: 'code',
          title: 'Validate a username',
          prompt: md`
            A \`username\` is valid when **all** of these hold:

            - it is 3 to 15 characters long (both included)
            - it contains no space
            - it does not contain the text \`admin\`

            Store the bool in \`valid\` and print it with an f-string. For \`"data_ninja"\`:

            \`\`\`
            data_ninja valid: True
            \`\`\`
          `,
          setup: 'username = "data_ninja"',
          starter: '# username is defined\n',
          solution: py`
            ok_len = 3 <= len(username) <= 15
            no_space = " " not in username
            no_admin = "admin" not in username
            valid = ok_len and no_space and no_admin
            print(f"{username} valid: {valid}")
          `,
          tests: [
            { var: 'valid', expect: 'True' },
            { stdout: 'data_ninja valid: True\n', name: 'prints the result' },
            { given: 'username = "ab"', var: 'valid', expect: 'False' },
            { given: 'username = "big data"', stdout: true },
            { given: 'username = "abc"', var: 'valid', expect: 'True', hidden: true },
            { given: 'username = "a" * 15', var: 'valid', expect: 'True', hidden: true },
            { given: 'username = "a" * 16', var: 'valid', expect: 'False', hidden: true },
            { given: 'username = "superadmin"', var: 'valid', expect: 'False', hidden: true },
          ],
          hints: [
            'Three separate checks joined with `and`. A chained comparison handles the length.',
            '`" " not in username` is True when there is no space.',
          ],
          wrong: [
            'valid = 3 < len(username) < 15 and " " not in username and "admin" not in username\nprint(f"{username} valid: {valid}")\n',
            'valid = 3 <= len(username) <= 15 and " " not in username\nprint(f"{username} valid: {valid}")\n',
          ],
          explain: 'Each rule becomes one boolean, and `and` combines them. Testing the exact boundaries (3, 15, 16 characters) is how you catch the `<` versus `<=` bug. Input validation like this sits at the front of every sign-up form and data-ingestion job.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u02-l2',
      title: 'if / elif / else',
      summary: 'Run different code depending on conditions, and get the order right.',
      steps: [
        {
          type: 'learn',
          title: 'if: run code only sometimes',
          body: md`
            \`if condition:\` runs the **indented block** below it only when the condition is truthy.

            - the \`if\` line ends with a colon \`:\`
            - the block is indented, by convention **4 spaces**, and every line in it must line up
            - the first line that is **not** indented is outside the \`if\` again and always runs

            Python uses indentation (not braces) to see what belongs to the \`if\`, so whitespace is part of the syntax.
          `,
          code: py`
            stock = 3
            if stock < 5:
                print("Low stock!")
                print("Reorder soon")
            print("Check done")
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            temp = 18
            if temp > 25:
                print("hot")
                print("drink water")
            print("done")
            if temp > 15:
                print("mild")
          `,
          answer: 'done\nmild',
          explain: 'Both indented lines belong to the first `if`, so both are skipped. `print("done")` is not indented and always runs. The second `if` is a separate check.',
        },
        {
          type: 'learn',
          title: 'else and elif',
          body: md`
            \`else:\` runs when the \`if\` condition was false. \`elif\` ("else if") adds more checks in between.

            Python tests the branches **top to bottom** and runs **only the first one that is true**. The rest are skipped, even if they would be true as well.

            So **order matters**: put the strictest condition (here the highest threshold) first.
          `,
          code: py`
            score = 85
            if score >= 90:
                grade = "A"
            elif score >= 80:
                grade = "B"
            elif score >= 70:
                grade = "C"
            else:
                grade = "F"
            print(grade)
          `,
        },
        {
          type: 'choice',
          prompt: 'The author wanted A for 90+, B for 80+ and C for 70+. What does this print?',
          code: py`
            score = 95
            if score >= 70:
                print("C")
            elif score >= 80:
                print("B")
            elif score >= 90:
                print("A")
          `,
          options: ['C', 'A', 'C\nB\nA', 'A\nB\nC'],
          answer: 0,
          checkOutput: true,
          explain: '95 >= 70 is already true, so the first branch runs and the whole chain is finished. The `A` branch can never run: every score >= 90 is caught by `>= 70` first. Check the highest threshold first.',
        },
        {
          type: 'output',
          prompt: 'Two `if`s versus one chain. What does this print?',
          code: py`
            n = 12
            if n % 2 == 0:
                print("even")
            if n % 3 == 0:
                print("div 3")
            elif n % 4 == 0:
                print("div 4")
            else:
                print("other")
          `,
          answer: 'even\ndiv 3',
          explain: 'The first `if` is a statement on its own. The second `if` starts a new chain: `12 % 3 == 0` wins, so `elif` and `else` are skipped, even though 12 is divisible by 4 too.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines so `cost` is 5 for parcels up to 2 kg, 9 up to 10 kg, and 20 above that. The program prints `9`.',
          lines: [
            'weight = 7',
            'if weight <= 2:',
            '    cost = 5',
            'elif weight <= 10:',
            '    cost = 9',
            'else:',
            '    cost = 20',
            'print(cost)',
          ],
          distractors: ['else weight > 10:', 'elif weight <= 2:'],
          tests: [{ stdout: '9\n' }],
          explain: 'The chain starts with `if`, continues with `elif`, and ends with a plain `else:`. An `else` never has a condition: it catches everything left over.',
        },
        {
          type: 'learn',
          title: 'Nested ifs vs combined conditions',
          body: md`
            You can put an \`if\` inside another \`if\`. Each level adds 4 more spaces.

            Often a **combined condition** is clearer. Two nested \`if\`s with no \`else\` do the same as one \`if\` with \`and\`. Deep nesting ("arrow code") is hard to read, so flatten it when you can.

            Keep the nesting when the inner branches really depend on the outer one, for example different rules for members and non-members.
          `,
          code: py`
            age = 25
            has_ticket = True

            if age >= 18:
                if has_ticket:
                    print("Welcome (nested)")

            if age >= 18 and has_ticket:
                print("Welcome (flat)")
          `,
        },
        {
          type: 'choice',
          prompt: 'Which single line can replace both `if` lines?',
          code: py`
            if logged_in:
                if is_admin:
                    print("dashboard")
          `,
          options: ['if logged_in and is_admin:', 'if logged_in or is_admin:', 'if logged_in == is_admin:', 'if logged_in: and is_admin:'],
          answer: 0,
          explain: 'The inner print needs both conditions, so it\'s `and`. `==` looks close but is also True when both are False. The last option is a SyntaxError.',
        },
        {
          type: 'learn',
          title: 'The one-line if',
          body: md`
            When you just need to choose **one of two values**, use a **conditional expression**:

            \`value_if_true if condition else value_if_false\`

            It's an expression, so it produces a value you can store, print or put in an f-string. Use it for simple choices. Use a full \`if\` statement when the branches do real work.
          `,
          code: py`
            items = 1
            label = "item" if items == 1 else "items"
            print(f"{items} {label}")
            fee = 0 if items >= 3 else 4.99
            print("fee:", fee)
          `,
        },
        {
          type: 'blanks',
          prompt: '`score` is defined. Set `status` to "pass" for scores of 50 or more, otherwise to "fail".',
          setup: 'score = 72',
          code: py`
            status = "pass" ___ score >= 50 ___ "fail"
            print(status)
          `,
          bank: ['if', 'else', 'elif', 'then', 'or'],
          answer: ['if', 'else'],
          tests: [
            { var: 'status', expect: '"pass"' },
            { given: 'score = 49', var: 'status', expect: '"fail"' },
            { given: 'score = 50', var: 'status', expect: '"pass"' },
          ],
          explain: 'The pattern is always `A if condition else B`. Python has no `then`, and `elif` only exists in full `if` statements.',
        },
        {
          type: 'output',
          prompt: 'Trace it carefully. What does this print?',
          code: py`
            x = 7
            if x > 5:
                if x % 2 == 0:
                    msg = "big even"
                else:
                    msg = "big odd"
            else:
                msg = "small"
            print(msg, "!" if x > 6 else "?")
          `,
          answer: 'big odd !',
          explain: '7 > 5 enters the outer block. 7 is odd, so the inner `else` sets "big odd". The `else` at the outer level belongs to `if x > 5` (look at the indentation), so it is skipped. Finally 7 > 6 picks "!".',
        },
        {
          type: 'code',
          title: 'Volume pricing',
          prompt: md`
            A wholesaler prices by quantity:

            | units | price per unit |
            |---|---|
            | 1 to 49 | 2.50 |
            | 50 to 99 | 2.20 |
            | 100 or more | 1.90 |

            \`qty\` is defined. Set \`unit_price\` and \`total\` (\`qty * unit_price\`), then print both with 2 decimals. For qty = 120:

            \`\`\`
            120 units x 1.90 = 228.00
            \`\`\`
          `,
          setup: 'qty = 120',
          starter: '# qty is defined\n',
          solution: py`
            if qty >= 100:
                unit_price = 1.90
            elif qty >= 50:
                unit_price = 2.20
            else:
                unit_price = 2.50
            total = qty * unit_price
            print(f"{qty} units x {unit_price:.2f} = {total:.2f}")
          `,
          tests: [
            { var: 'unit_price', expect: '1.9' },
            { stdout: '120 units x 1.90 = 228.00\n', name: 'prints the 120-unit line' },
            { given: 'qty = 50', stdout: true },
            { given: 'qty = 49', stdout: true, hidden: true },
            { given: 'qty = 100', var: 'unit_price', hidden: true },
            { given: 'qty = 99', var: 'total', hidden: true },
            { given: 'qty = 1', stdout: true, hidden: true },
          ],
          hints: [
            'Start with the biggest tier: `if qty >= 100:`.',
            'Then `elif qty >= 50:` and an `else:` for the rest. Format with `:.2f`.',
          ],
          wrong: [
            py`
              if qty >= 50:
                  unit_price = 2.20
              elif qty >= 100:
                  unit_price = 1.90
              else:
                  unit_price = 2.50
              total = qty * unit_price
              print(f"{qty} units x {unit_price:.2f} = {total:.2f}")
            `,
            py`
              if qty > 100:
                  unit_price = 1.90
              elif qty > 50:
                  unit_price = 2.20
              else:
                  unit_price = 2.50
              total = qty * unit_price
              print(f"{qty} units x {unit_price:.2f} = {total:.2f}")
            `,
          ],
          explain: 'Checking `>= 100` first means every later branch only sees smaller quantities, so each tier needs just one bound. The boundary tests (49, 50, 99, 100) are exactly where pricing bugs cost real money.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the loyalty badge',
          prompt: md`
            Badges: **platinum** from 2000 points, **gold** from 1000, **silver** from 500, otherwise **none**.

            \`points\` is defined. This code has **three** bugs. Fix them so it prints the right badge for any number of points.
          `,
          setup: 'points = 2400',
          starter: py`
            if points > 2000:
                badge = "platinum"
            if points >= 1000:
                badge = "gold"
            elif points >= 500:
                badge = "silver"
            else
                badge = "none"
            print(badge)
          `,
          solution: py`
            if points >= 2000:
                badge = "platinum"
            elif points >= 1000:
                badge = "gold"
            elif points >= 500:
                badge = "silver"
            else:
                badge = "none"
            print(badge)
          `,
          tests: [
            { stdout: 'platinum\n', name: '2400 points → platinum' },
            { given: 'points = 2000', stdout: true },
            { given: 'points = 1000', stdout: true },
            { given: 'points = 999', stdout: true, hidden: true },
            { given: 'points = 1500', stdout: true, hidden: true },
            { given: 'points = 0', stdout: true, hidden: true },
          ],
          hints: [
            'Run it first: Python reports a missing `:`.',
            'With 2400 points the second `if` starts a **new** chain and overwrites "platinum". It should be `elif`.',
            'Exactly 2000 points must be platinum, so use `>=`.',
          ],
          wrong: [
            py`
              if points >= 2000:
                  badge = "platinum"
              if points >= 1000:
                  badge = "gold"
              elif points >= 500:
                  badge = "silver"
              else:
                  badge = "none"
              print(badge)
            `,
            py`
              if points > 2000:
                  badge = "platinum"
              elif points >= 1000:
                  badge = "gold"
              elif points >= 500:
                  badge = "silver"
              else:
                  badge = "none"
              print(badge)
            `,
          ],
          explain: 'A missing colon is a SyntaxError, so nothing runs at all. The sneaky bug is the second `if`: it starts an independent chain, so a platinum customer is downgraded to gold. One chain (`if` / `elif` / `elif` / `else`) guarantees exactly one badge.',
        },
        {
          type: 'code',
          title: 'Shipping rules',
          prompt: md`
            Compute the shipping \`fee\` for an order with \`country\`, \`total\` and \`express\` (a bool):

            - **Express** always costs 9 in Croatia (\`"HR"\`) and 25 elsewhere, whatever the total.
            - Otherwise, orders with a \`total\` of **100 or more** ship free (0).
            - Otherwise, standard shipping costs 4 in Croatia and 12 elsewhere.

            Print \`Shipping: <fee>\`. For the values defined (DE, 140.0, express):

            \`\`\`
            Shipping: 25
            \`\`\`
          `,
          setup: 'country = "DE"\ntotal = 140.0\nexpress = True',
          starter: '# country, total, express exist\n',
          solution: py`
            if express:
                fee = 9 if country == "HR" else 25
            elif total >= 100:
                fee = 0
            else:
                fee = 4 if country == "HR" else 12
            print(f"Shipping: {fee}")
          `,
          tests: [
            { var: 'fee', expect: '25' },
            { stdout: 'Shipping: 25\n', name: 'prints Shipping: 25' },
            { given: 'country = "HR"\ntotal = 30.0\nexpress = False', stdout: true },
            { given: 'country = "HR"\ntotal = 300.0\nexpress = True', var: 'fee', expect: '9', hidden: true },
            { given: 'country = "DE"\ntotal = 100.0\nexpress = False', var: 'fee', expect: '0', hidden: true },
            { given: 'country = "US"\ntotal = 99.99\nexpress = False', var: 'fee', expect: '12', hidden: true },
            { given: 'country = "HR"\ntotal = 100.0\nexpress = False', stdout: true, hidden: true },
          ],
          hints: [
            'Express overrides everything, so test `express` first.',
            'Inside a branch you can pick between HR and elsewhere with `a if country == "HR" else b`.',
          ],
          wrong: [
            py`
              if total >= 100:
                  fee = 0
              elif express:
                  fee = 9 if country == "HR" else 25
              else:
                  fee = 4 if country == "HR" else 12
              print(f"Shipping: {fee}")
            `,
            py`
              if express:
                  fee = 9 if country == "HR" else 25
              elif total > 100:
                  fee = 0
              else:
                  fee = 4 if country == "HR" else 12
              print(f"Shipping: {fee}")
            `,
          ],
          explain: 'Business rules with an "always" or "whatever the total" need to be checked first, otherwise an earlier branch swallows them. Here, testing the total first would give a free express delivery on big orders. Reading the spec for priority before writing the chain is the real skill.',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u02-l3',
      title: 'while Loops',
      summary: 'Repeat code while a condition holds, and stop at the right moment.',
      steps: [
        {
          type: 'learn',
          title: 'while: repeat while true',
          body: md`
            \`while condition:\` checks the condition, runs the block, then **jumps back** and checks again. It stops the first time the condition is false.

            A counting loop has three parts:
            1. **set up** a variable before the loop
            2. **test** it in the condition
            3. **change** it inside the block, so the loop can end
          `,
          code: py`
            attempt = 1
            while attempt <= 3:
                print("Attempt", attempt)
                attempt += 1
            print("Done, attempt is", attempt)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            n = 10
            while n > 0:
                print(n)
                n -= 4
          `,
          answer: '10\n6\n2',
          explain: 'After printing 2, `n` becomes -2. The condition `-2 > 0` is false, so the loop stops. It never printed a value that was 0 or below.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            i = 0
            total = 0
            while i < 5:
                total += i
                i += 1
            print(total, i)
          `,
          options: ['10 5', '15 5', '10 4', '15 6'],
          answer: 0,
          checkOutput: true,
          explain: 'The body runs for i = 0, 1, 2, 3, 4, so the total is 0+1+2+3+4 = 10. The loop stops when i reaches 5, and 5 is the value left in `i`.',
        },
        {
          type: 'learn',
          title: 'Loop until something happens',
          body: md`
            \`while\` shines when you **don't know how many rounds** you need. You loop until a target is reached, and the counter tells you how long it took:

            - users double every month: how many months until 1 million?
            - a balance grows 5 % a year: when does it pass 2000?

            (\`1_000_000\` is simply 1000000. Underscores make big numbers readable.)
          `,
          code: py`
            users = 1000
            months = 0
            while users < 1_000_000:
                users *= 2
                months += 1
            print(months, users)
          `,
        },
        {
          type: 'output',
          prompt: 'A balance grows 10 % per year. What does this print?',
          code: py`
            balance = 100
            years = 0
            while balance < 150:
                balance *= 1.1
                years += 1
            print(years)
          `,
          answer: '5',
          explain: 'The balance goes 100 → 110 → 121 → 133.1 → 146.41 → 161.05. Only after the 5th growth is it no longer below 150.',
        },
        {
          type: 'blanks',
          prompt: 'Views triple every day. Complete the loop so it prints how many days it takes to reach **at least** 10,000 views.',
          code: py`
            views = 100
            days = 0
            while views ___ 10_000:
                views ___ 3
                days += 1
            print(days)
          `,
          bank: ['<', '>', '*=', '+=', '**=', '=='],
          answer: ['<', '*='],
          tests: [{ stdout: '5\n' }],
          explain: 'Keep looping **while** the target is not reached yet (`views < 10_000`). Tripling is `*= 3`. 100 → 300 → 900 → 2700 → 8100 → 24300 takes 5 days.',
        },
        {
          type: 'learn',
          title: 'Infinite loops and break',
          body: md`
            If the condition never becomes false, the loop runs **forever**. The usual cause is forgetting to update the variable. (Here a time limit stops runaway code. On a server it just hangs.)

            Sometimes the natural exit is in the **middle** of the loop. Then write \`while True:\` and leave with \`break\`, which jumps out of the loop immediately.

            The example is **exponential backoff**: a client retries a failing request, doubling the wait each time, and gives up once the total wait passes 60 s.
          `,
          code: py`
            wait = 1
            total = 0
            while True:
                total += wait
                if total > 60:
                    break
                wait *= 2
            print("last wait:", wait, "total:", total)
          `,
        },
        {
          type: 'choice',
          prompt: 'This should print 1, 2, 3. What is wrong?',
          code: py`
            i = 1
            while i <= 3:
                print(i)
            i += 1
          `,
          options: ['i += 1 is outside the loop', 'It must be i < 3', 'while needs ( ) around i <= 3', 'print(i) must come after i += 1'],
          answer: 0,
          explain: '`i += 1` is not indented, so it is not part of the loop. `i` stays 1, the condition stays true, and it prints 1 forever. Indentation decides what repeats.',
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            n = 1
            while True:
                n *= 3
                if n > 50:
                    break
            print(n)
          `,
          answer: '81',
          explain: '`n` goes 3, 9, 27, 81. At 81 the condition `n > 50` is true, so `break` leaves the loop and the print after it runs.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix the countdown',
          prompt: md`
            This should count down from \`n\` to 1 and then print \`Liftoff!\` **once**. For n = 3:

            \`\`\`
            3
            2
            1
            Liftoff!
            \`\`\`

            \`n\` is defined. Fix the two bugs.
          `,
          setup: 'n = 3',
          starter: py`
            while n >= 0:
                print(n)
                n -= 1
                print("Liftoff!")
          `,
          solution: py`
            while n >= 1:
                print(n)
                n -= 1
            print("Liftoff!")
          `,
          tests: [
            { stdout: '3\n2\n1\nLiftoff!\n', name: 'counts 3, 2, 1, Liftoff!' },
            { given: 'n = 5', stdout: true },
            { given: 'n = 1', stdout: true, hidden: true },
            { given: 'n = 0', stdout: true, hidden: true },
          ],
          hints: [
            'Run it: `Liftoff!` appears after every number. Which line is indented too far?',
            'It also prints 0. The loop should stop once `n` reaches 0, so use `n >= 1` (or `n > 0`).',
          ],
          wrong: [
            'while n >= 0:\n    print(n)\n    n -= 1\nprint("Liftoff!")\n',
            'while n > 0:\n    print(n)\n    n -= 1\n    print("Liftoff!")\n',
          ],
          explain: 'Off-by-one (`>= 0` versus `>= 1`) and wrong indentation are the two classic loop bugs. Always check the first and the last round of a loop by hand.',
        },
        {
          type: 'code',
          title: 'Savings goal',
          prompt: md`
            You have \`balance\` in a savings account that earns \`rate\` interest per year (added once a year). How many full years until it reaches **at least** \`target\`?

            Store the count in \`years\` and print it with the balance at that point (2 decimals). For balance = 1000.0, rate = 0.05, target = 2000.0:

            \`\`\`
            15 years -> 2078.93
            \`\`\`

            If the balance already meets the target, the answer is 0 years.
          `,
          setup: 'balance = 1000.0\nrate = 0.05\ntarget = 2000.0',
          starter: '# balance, rate, target exist\nyears = 0\n',
          solution: py`
            years = 0
            while balance < target:
                balance *= 1 + rate
                years += 1
            print(f"{years} years -> {balance:.2f}")
          `,
          tests: [
            { var: 'years', expect: '15' },
            { stdout: '15 years -> 2078.93\n', name: 'prints 15 years -> 2078.93' },
            { given: 'balance = 500.0\nrate = 0.1\ntarget = 1000.0', stdout: true },
            { given: 'balance = 2000.0\nrate = 0.05\ntarget = 2000.0', var: 'years', expect: '0', hidden: true },
            { given: 'balance = 800.0\nrate = 0.02\ntarget = 1000.0', stdout: true, hidden: true },
          ],
          hints: [
            'Loop **while** the balance is still below the target.',
            'Inside: `balance *= 1 + rate` and `years += 1`.',
          ],
          wrong: [
            py`
              years = 0
              while balance <= target:
                  balance *= 1 + rate
                  years += 1
              print(f"{years} years -> {balance:.2f}")
            `,
            'years = 15\nprint("15 years -> 2078.93")\n',
          ],
          explain: '"At least" means you stop as soon as `balance >= target`, so the loop runs while `balance < target`. With `<=`, a balance that hits the target exactly would earn one extra year. The loop also handles the 0-years case for free, because the condition is checked before the first round.',
        },
        {
          type: 'code',
          title: 'Pay off a loan',
          prompt: md`
            A loan of \`debt\` grows by \`rate\` interest **each month**. Then you pay \`payment\`, or the rest of the debt if that's less.

            Simulate it until the debt is 0. Store the number of months in \`months\` and the total paid in \`paid\`, and print both (\`paid\` rounded to 2 decimals). For debt = 1000.0, rate = 0.01, payment = 100.0:

            \`\`\`
            11 1058.98
            \`\`\`

            Assume the payment is always bigger than one month's interest.
          `,
          setup: 'debt = 1000.0\nrate = 0.01\npayment = 100.0',
          starter: '# debt, rate, payment exist\nmonths = 0\npaid = 0.0\n',
          solution: py`
            months = 0
            paid = 0.0
            while debt > 0:
                debt *= 1 + rate
                pay = min(payment, debt)
                debt -= pay
                paid += pay
                months += 1
            print(months, round(paid, 2))
          `,
          tests: [
            { var: 'months', expect: '11' },
            { var: 'paid', expect: '1058.98', tol: 1e-4 },
            { stdout: '11 1058.98\n', name: 'prints 11 1058.98' },
            { given: 'debt = 5000.0\nrate = 0.005\npayment = 450.0', stdout: true },
            { given: 'debt = 50.0\nrate = 0.02\npayment = 100.0', stdout: true, hidden: true },
            { given: 'debt = 0.0\nrate = 0.01\npayment = 100.0', stdout: true, hidden: true },
          ],
          hints: [
            'Each month: grow the debt first (`debt *= 1 + rate`), then pay.',
            'The last payment is smaller: `pay = min(payment, debt)`. Subtract it from the debt and add it to `paid`.',
          ],
          wrong: [
            py`
              months = 0
              paid = 0.0
              while debt > 0:
                  pay = min(payment, debt)
                  debt -= pay
                  paid += pay
                  debt *= 1 + rate
                  months += 1
              print(months, round(paid, 2))
            `,
            py`
              months = 0
              paid = 0.0
              while debt > 0:
                  debt *= 1 + rate
                  debt -= payment
                  paid += payment
                  months += 1
              print(months, round(paid, 2))
            `,
          ],
          explain: 'Simulations like this are just "state + a loop that updates it". The order of the updates is the model: interest before payment is not the same loan as payment before interest. `min(payment, debt)` makes the last month exact, so the loop ends at 0.0 instead of overpaying.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u02-l4',
      title: 'for Loops & range',
      summary: 'Loop a known number of times, walk through strings, accumulate results.',
      steps: [
        {
          type: 'learn',
          title: 'for and range',
          body: md`
            A \`for\` loop runs its block **once for each value** in a sequence. \`range(n)\` produces the whole numbers \`0, 1, …, n-1\`: exactly **n** values, starting at 0 and **stopping before n**.

            Use \`for\` when you know how many rounds you need (or have a sequence to walk through). Use \`while\` when you loop **until** something happens.
          `,
          code: py`
            for i in range(3):
                print("Batch", i)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            for i in range(4):
                print(i * 10)
          `,
          answer: '0\n10\n20\n30',
          explain: '`range(4)` gives 0, 1, 2, 3: four values, starting at 0. 4 itself is not included.',
        },
        {
          type: 'learn',
          title: 'range(start, stop, step)',
          body: md`
            - \`range(start, stop)\` starts at \`start\` and still stops **before** \`stop\`
            - a third argument is the **step**
            - a **negative** step counts down, and \`stop\` is still excluded

            | call | values |
            |---|---|
            | \`range(2, 6)\` | 2 3 4 5 |
            | \`range(0, 10, 3)\` | 0 3 6 9 |
            | \`range(5, 0, -1)\` | 5 4 3 2 1 |
            | \`range(5, 0)\` | nothing |

            \`print()\` with nothing inside just ends the line.
          `,
          code: py`
            for year in range(2020, 2026, 2):
                print(year, end=" ")
            print()
            for n in range(3, 0, -1):
                print(n, end=" ")
            print("go!")
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            for i in range(10, 0, -3):
                print(i, end=" ")
          `,
          options: ['10 7 4 1', '10 7 4', '9 6 3', '10 7 4 1 -2'],
          answer: 0,
          checkOutput: true,
          explain: 'Start at 10 and step by -3: 10, 7, 4, 1. The next value, -2, is past the stop value 0, so the loop ends.',
        },
        {
          type: 'choice',
          prompt: 'Which call gives exactly 1, 2, …, 10?',
          options: ['range(1, 11)', 'range(1, 10)', 'range(10)', 'range(0, 11)'],
          answer: 0,
          explain: 'The stop value is excluded, so to include 10 you stop at 11. `range(1, 10)` ends at 9, and `range(10)` is 0 to 9.',
        },
        {
          type: 'learn',
          title: 'Looping over a string',
          body: md`
            \`for\` works on any sequence, not just numbers. Looping over a string gives you **one character at a time**, spaces and punctuation included.

            Combine it with \`if\` to inspect each character. \`ch in "0123456789"\` is a quick "is it a digit?" test.
          `,
          code: py`
            code = "A7-x9"
            for ch in code:
                if ch in "0123456789":
                    print(ch, "is a digit")
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            for ch in "data":
                if ch == "a":
                    print("A!")
                else:
                    print(ch)
          `,
          answer: 'd\nA!\nt\nA!',
          explain: 'One round per character: d, a, t, a. Both a\'s take the `if` branch.',
        },
        {
          type: 'learn',
          title: 'The accumulator pattern',
          body: md`
            Most loops **build up a result**:

            1. create the accumulator **before** the loop (\`total = 0\`, \`count = 0\`, \`product = 1\`)
            2. update it **inside** the loop
            3. use it **after** the loop

            A product must start at **1**, not 0, because anything times 0 is 0.

            After a \`for\` loop ends, the loop variable keeps its **last** value.
          `,
          code: py`
            total = 0
            odd = 0
            for n in range(1, 6):
                total += n
                if n % 2 == 1:
                    odd += 1
            print(total, odd)
            print("last n:", n)
          `,
        },
        {
          type: 'choice',
          prompt: 'This should compute 1 × 2 × 3 × 4. What does it print?',
          code: py`
            product = 0
            for k in range(1, 5):
                product *= k
            print(product)
          `,
          options: ['0', '24', '10', '120'],
          answer: 0,
          checkOutput: true,
          explain: 'It starts at 0, and 0 × anything stays 0. A product accumulator starts at 1, the "neutral" value for multiplication, just like 0 is for addition.',
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            total = 0
            for i in range(1, 4):
                total += i * i
            print(total, i)
          `,
          answer: '14 3',
          explain: '1 + 4 + 9 = 14. After the loop `i` still holds its last value, 3, not 4. A `for` loop never assigns the stop value.',
        },
        {
          type: 'order',
          prompt: 'Arrange the lines to print the sum of the even numbers from 2 to 20 (both included). It prints `110`.',
          lines: [
            'total = 0',
            'for n in range(2, 21, 2):',
            '    total += n',
            'print(total)',
          ],
          distractors: ['for n in range(2, 20, 2):', '    print(total)'],
          tests: [{ stdout: '110\n' }],
          explain: 'To include 20 the stop must be 21 (or anything up to 22). The print goes after the loop, unindented, so it runs once with the final total.',
        },
        {
          type: 'code',
          title: 'Uptime from a status string',
          prompt: md`
            A monitor writes one character per minute into \`status\`: \`U\` = up, \`D\` = down. \`status\` is never empty.

            Count the down minutes into \`down\`, compute \`uptime\` as the **percentage** of up minutes, and print it with 1 decimal. For \`"UUDUUUDDUU"\`:

            \`\`\`
            down: 3 min, uptime: 70.0%
            \`\`\`
          `,
          setup: 'status = "UUDUUUDDUU"',
          starter: '# status is defined\ndown = 0\n',
          solution: py`
            down = 0
            for ch in status:
                if ch == "D":
                    down += 1
            up = len(status) - down
            uptime = up / len(status) * 100
            print(f"down: {down} min, uptime: {uptime:.1f}%")
          `,
          tests: [
            { var: 'down', expect: '3' },
            { var: 'uptime', expect: '70.0' },
            { stdout: 'down: 3 min, uptime: 70.0%\n', name: 'prints the report' },
            { given: 'status = "UUUU"', stdout: true },
            { given: 'status = "DUD"', stdout: true, hidden: true },
            { given: 'status = "D"', var: 'uptime', expect: '0.0', hidden: true },
          ],
          hints: [
            'Loop over `status` and add 1 to `down` when the character is "D".',
            'Up minutes are `len(status) - down`. The percentage is up / total * 100.',
          ],
          wrong: [
            py`
              down = 0
              for ch in status:
                  if ch == "D":
                      down += 1
              uptime = down / len(status) * 100
              print(f"down: {down} min, uptime: {uptime:.1f}%")
            `,
            'down = 3\nuptime = 70.0\nprint("down: 3 min, uptime: 70.0%")\n',
          ],
          explain: 'Count, then derive. This is the shape of every SLA report: "99.9 % uptime" means at most 43 minutes of `D` in a 30-day month. You loop over the data once, so the work grows linearly with its length.',
        },
        {
          type: 'code',
          title: 'Multiples of 3 or 5',
          prompt: md`
            Sum all the numbers **below** \`limit\` that are divisible by 3 **or** 5. Store the sum in \`total\` and print it.

            For limit = 10: 3 + 5 + 6 + 9 = **23**. (This is Project Euler #1, a favourite warm-up question.)
          `,
          setup: 'limit = 10',
          starter: '# limit is defined\ntotal = 0\n',
          solution: py`
            total = 0
            for n in range(limit):
                if n % 3 == 0 or n % 5 == 0:
                    total += n
            print(total)
          `,
          tests: [
            { var: 'total', expect: '23' },
            { given: 'limit = 1000', var: 'total', expect: '233168' },
            { given: 'limit = 16', var: 'total', expect: '60', hidden: true },
            { given: 'limit = 15', var: 'total', expect: '45', hidden: true },
            { given: 'limit = 1', var: 'total', expect: '0', hidden: true },
            { given: 'limit = 100', stdout: true, hidden: true },
          ],
          hints: [
            '`range(limit)` gives every number below `limit`.',
            'One `if` with `or`, so a number like 15 is added only once.',
          ],
          wrong: [
            'total = 0\nfor n in range(limit + 1):\n    if n % 3 == 0 or n % 5 == 0:\n        total += n\nprint(total)\n',
            'total = 0\nfor n in range(limit):\n    if n % 3 == 0:\n        total += n\n    if n % 5 == 0:\n        total += n\nprint(total)\n',
            'total = 0\nfor n in range(limit):\n    if n % 3 == 0 and n % 5 == 0:\n        total += n\nprint(total)\n',
          ],
          explain: 'With two separate `if`s, multiples of 15 are counted twice. That\'s the bug interviewers are watching for. "Below" means `limit` itself is excluded, which is exactly what `range(limit)` does.',
        },
        {
          type: 'code',
          title: 'Factorial',
          prompt: md`
            Compute \`n!\` ("n factorial") = 1 × 2 × … × n with a loop. Store it in \`fact\` and print it like this (n = 5):

            \`\`\`
            5! = 120
            \`\`\`

            By definition \`0! = 1\`.
          `,
          setup: 'n = 5',
          starter: '# n is defined\n',
          solution: py`
            fact = 1
            for k in range(2, n + 1):
                fact *= k
            print(f"{n}! = {fact}")
          `,
          tests: [
            { var: 'fact', expect: '120' },
            { stdout: '5! = 120\n', name: 'prints 5! = 120' },
            { given: 'n = 0', var: 'fact', expect: '1' },
            { given: 'n = 1', var: 'fact', expect: '1', hidden: true },
            { given: 'n = 10', var: 'fact', expect: '3628800', hidden: true },
            { given: 'n = 20', stdout: true, hidden: true },
          ],
          hints: [
            'Start with `fact = 1`.',
            'Multiply by every k from 1 (or 2) up to **and including** n: `range(2, n + 1)`.',
          ],
          wrong: [
            'fact = 0\nfor k in range(1, n + 1):\n    fact *= k\nprint(f"{n}! = {fact}")\n',
            'fact = 1\nfor k in range(1, n):\n    fact *= k\nprint(f"{n}! = {fact}")\n',
          ],
          explain: 'Starting at 1 makes `0! = 1` work automatically: the loop body never runs. Python ints never overflow, so 20! (19 digits) is exact. In Java or C a 64-bit integer overflows at 21!, a fun fact for interviews.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u02-l5',
      title: 'Loop Patterns',
      summary: 'break, continue, nested loops, running max, for-else, FizzBuzz and primes.',
      steps: [
        {
          type: 'learn',
          title: 'break and continue',
          body: md`
            Two ways to steer a loop from the inside:

            - \`continue\` skips **the rest of this round** and moves on to the next value
            - \`break\` leaves the **whole loop** immediately

            Typical uses: \`continue\` to skip bad records, \`break\` to stop once you have found what you were looking for (no need to scan the other million rows).
          `,
          code: py`
            for n in range(1, 10):
                if n % 3 == 0:
                    continue
                if n > 7:
                    break
                print(n, end=" ")
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            for ch in "data-eng":
                if ch == "a":
                    continue
                if ch == "-":
                    break
                print(ch, end="")
          `,
          answer: 'dt',
          explain: 'd is printed, both a\'s are skipped by `continue`, t is printed, and the `-` triggers `break` before "eng" is ever reached.',
        },
        {
          type: 'code',
          title: 'FizzBuzz',
          prompt: md`
            The classic screening question. For every number from 1 to \`n\` (included), print one line:

            - \`FizzBuzz\` if it's divisible by 3 **and** 5
            - \`Fizz\` if it's divisible by 3
            - \`Buzz\` if it's divisible by 5
            - otherwise the number itself

            For n = 5 the lines are \`1\`, \`2\`, \`Fizz\`, \`4\`, \`Buzz\`. \`n\` is defined.
          `,
          setup: 'n = 15',
          starter: '# n is defined\n',
          solution: py`
            for i in range(1, n + 1):
                if i % 15 == 0:
                    print("FizzBuzz")
                elif i % 3 == 0:
                    print("Fizz")
                elif i % 5 == 0:
                    print("Buzz")
                else:
                    print(i)
          `,
          tests: [
            { stdout: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n', name: 'n = 15' },
            { given: 'n = 5', stdout: true },
            { given: 'n = 1', stdout: true, hidden: true },
            { given: 'n = 31', stdout: true, hidden: true },
          ],
          hints: [
            'Loop with `range(1, n + 1)` so both 1 and n are included.',
            'Check the "both" case (`i % 15 == 0`) **first**, otherwise `Fizz` catches 15.',
          ],
          wrong: [
            py`
              for i in range(1, n + 1):
                  if i % 3 == 0:
                      print("Fizz")
                  elif i % 5 == 0:
                      print("Buzz")
                  elif i % 15 == 0:
                      print("FizzBuzz")
                  else:
                      print(i)
            `,
            py`
              for i in range(n):
                  if i % 15 == 0:
                      print("FizzBuzz")
                  elif i % 3 == 0:
                      print("Fizz")
                  elif i % 5 == 0:
                      print("Buzz")
                  else:
                      print(i)
            `,
          ],
          explain: 'FizzBuzz tests exactly two things: loop bounds (1 to n inclusive) and branch order (most specific case first). A surprising number of candidates fail it. Divisible by 3 and 5 is the same as divisible by 15, because 3 and 5 share no factors.',
        },
        {
          type: 'learn',
          title: 'Nested loops',
          body: md`
            A loop inside a loop: for **each** round of the outer loop, the inner loop runs **completely**.

            With 3 outer and 3 inner values the body runs 3 × 3 = 9 times. With n and n it's n². That's fine for 100 items and a disaster for a million (10¹² steps). Interviewers will ask you to spot that.
          `,
          code: py`
            for i in range(1, 4):
                for j in range(1, 4):
                    print(i * j, end="\t")
                print()
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            for i in range(3):
                for j in range(i + 1, 3):
                    print(i, j)
          `,
          answer: '0 1\n0 2\n1 2',
          explain: 'The inner loop starts **after** `i`, so every pair appears once and never with itself. This "each pair once" shape is how you compare all pairs of items (duplicates, distances, matches).',
        },
        {
          type: 'choice',
          prompt: 'How many times does `count += 1` run?',
          code: py`
            count = 0
            for i in range(4):
                for j in range(i):
                    count += 1
            print(count)
          `,
          options: ['6', '16', '10', '12'],
          answer: 0,
          checkOutput: true,
          explain: 'The inner loop runs i times: 0 + 1 + 2 + 3 = 6. A triangle like this is still about n²/2 steps, so it grows quadratically too.',
        },
        {
          type: 'learn',
          title: 'Peel digits, track the best',
          body: md`
            Two small tricks you'll combine a lot:

            - **Digits**: \`n % 10\` is the last digit, and \`n //= 10\` chops it off. Repeat while \`n > 0\` to visit every digit, right to left.
            - **Running max/min**: keep a "best so far" variable and replace it when you see something better. Start it at a value that any real item beats (or at the first item).
          `,
          code: py`
            n = 4719
            largest = 0
            while n > 0:
                d = n % 10
                if d > largest:
                    largest = d
                n //= 10
            print("largest digit:", largest)
          `,
        },
        {
          type: 'output',
          prompt: 'What does this print?',
          code: py`
            n = 2025
            s = 0
            while n > 0:
                s += n % 10
                n //= 10
            print(s, n)
          `,
          answer: '9 0',
          explain: 'The digits are added right to left: 5 + 2 + 0 + 2 = 9. The loop ends when `n` has been chopped down to 0, and that 0 is printed too.',
        },
        {
          type: 'choice',
          prompt: '`sales` holds one digit per day. Which day number is printed?',
          code: py`
            sales = "3818"
            best = -1
            best_day = 0
            day = 0
            for ch in sales:
                day += 1
                if int(ch) >= best:
                    best = int(ch)
                    best_day = day
            print(best_day)
          `,
          options: ['4', '2', '8', '3'],
          answer: 0,
          checkOutput: true,
          explain: 'Days 2 and 4 both sell 8. With `>=`, the later tie replaces the earlier one, so day 4 wins. With `>`, the first best (day 2) would be kept. When an interviewer asks "which one on ties?", this is the knob.',
        },
        {
          type: 'learn',
          title: 'for … else: search loops',
          body: md`
            A \`for\` loop can have an \`else:\` block. It runs only if the loop finished **without** hitting \`break\`: the "searched everything, found nothing" case.

            Prime check: try the possible divisors. If one divides evenly, report it and \`break\`. If none does, the \`else\` reports a prime.

            You only need divisors up to √n: if \`n = a × b\`, one of the two is at most √n. Stopping there turns a million steps into a thousand.
          `,
          code: py`
            n = 91
            for d in range(2, n):
                if n % d == 0:
                    print(n, "=", d, "x", n // d)
                    break
            else:
                print(n, "is prime")
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            for n in range(3):
                if n == 5:
                    break
            else:
                print("no break")
            print("end")
          `,
          options: ['no break\nend', 'end', 'no break', 'end\nno break'],
          answer: 0,
          checkOutput: true,
          explain: '`n` never reaches 5, so the loop ends normally and the `else` runs. Then the unindented `print("end")` runs as usual. Think of the `else` as "no break".',
        },
        {
          type: 'code',
          title: 'Digit checksum',
          prompt: md`
            A simple ID checksum: an ID is valid when the **sum of its digits** is divisible by 10.

            \`n\` is a non-negative int. Compute \`digit_sum\` using \`%\` and \`//\` (no strings), set \`valid\` (a bool) and print, for n = 46819:

            \`\`\`
            digit sum 28, valid: False
            \`\`\`
          `,
          setup: 'n = 46819',
          starter: '# n is defined\ndigit_sum = 0\n',
          solution: py`
            digit_sum = 0
            while n > 0:
                digit_sum += n % 10
                n //= 10
            valid = digit_sum % 10 == 0
            print(f"digit sum {digit_sum}, valid: {valid}")
          `,
          tests: [
            { var: 'digit_sum', expect: '28' },
            { var: 'valid', expect: 'False' },
            { stdout: 'digit sum 28, valid: False\n', name: 'prints the check' },
            { given: 'n = 55', stdout: true },
            { given: 'n = 7', var: 'digit_sum', expect: '7', hidden: true },
            { given: 'n = 0', var: 'valid', expect: 'True', hidden: true },
            { given: 'n = 19999999999', var: 'digit_sum', expect: '91', hidden: true },
          ],
          forbid: ['str'],
          hints: [
            'Loop `while n > 0`, add `n % 10` to the sum, then `n //= 10`.',
            '`valid = digit_sum % 10 == 0` is already a bool.',
          ],
          wrong: [
            'digit_sum = 0\nwhile n > 10:\n    digit_sum += n % 10\n    n //= 10\nvalid = digit_sum % 10 == 0\nprint(f"digit sum {digit_sum}, valid: {valid}")\n',
            'digit_sum = 0\nwhile n > 0:\n    digit_sum += n % 10\n    n //= 10\nvalid = digit_sum % 10\nprint(f"digit sum {digit_sum}, valid: {valid}")\n',
          ],
          explain: 'Each round costs one division, so the loop runs once per digit: about 19 rounds even for a huge 64-bit ID. Real checksums (Luhn for credit cards, ISBN) are this idea plus a weighting rule.',
        },
        {
          type: 'code',
          title: 'Primes in a range',
          prompt: md`
            Print every prime between \`lo\` and \`hi\` (**both included**) on one line, separated by spaces, then the count on its own line. For lo = 10, hi = 30:

            \`\`\`
            11 13 17 19 23 29
            count: 6
            \`\`\`

            Remember: 1 is **not** prime. Only try divisors up to √n, e.g. \`range(2, int(n ** 0.5) + 1)\`.
          `,
          setup: 'lo = 10\nhi = 30',
          starter: '# lo and hi are defined\ncount = 0\n',
          solution: py`
            count = 0
            for n in range(max(lo, 2), hi + 1):
                for d in range(2, int(n ** 0.5) + 1):
                    if n % d == 0:
                        break
                else:
                    print(n, end=" ")
                    count += 1
            print()
            print("count:", count)
          `,
          tests: [
            { stdout: '11 13 17 19 23 29\ncount: 6\n', name: 'primes from 10 to 30' },
            { given: 'lo = 1\nhi = 11', stdout: true },
            { given: 'lo = 2\nhi = 2', stdout: true, hidden: true },
            { given: 'lo = 24\nhi = 28', stdout: true, hidden: true },
            { given: 'lo = 90\nhi = 130', stdout: true, hidden: true },
          ],
          hints: [
            'Outer loop over the candidates `n`, inner loop over divisors `d`. `break` on the first divisor.',
            'Use `for … else`: the `else` runs only when no divisor was found. Start the candidates at 2 at the earliest, e.g. `max(lo, 2)`.',
            'Print each prime with `end=" "`, then a plain `print()` to finish the line before the count.',
          ],
          wrong: [
            py`
              count = 0
              for n in range(lo, hi + 1):
                  for d in range(2, int(n ** 0.5) + 1):
                      if n % d == 0:
                          break
                  else:
                      print(n, end=" ")
                      count += 1
              print()
              print("count:", count)
            `,
            py`
              count = 0
              for n in range(max(lo, 2), hi):
                  for d in range(2, int(n ** 0.5) + 1):
                      if n % d == 0:
                          break
                  else:
                      print(n, end=" ")
                      count += 1
              print()
              print("count:", count)
            `,
            py`
              count = 0
              for n in range(max(lo, 2), hi + 1):
                  for d in range(2, int(n ** 0.5)):
                      if n % d == 0:
                          break
                  else:
                      print(n, end=" ")
                      count += 1
              print()
              print("count:", count)
            `,
          ],
          explain: md`
            Three classic bugs are covered by the tests: treating 1 as prime, excluding \`hi\`, and stopping the divisors **before** √n (so 25 = 5 × 5 slips through as "prime").

            Trial division up to √n costs about √n steps per number. For the range of numbers up to N, the classic faster method is the Sieve of Eratosthenes, which crosses out multiples instead of testing each number.
          `,
        },
        {
          type: 'code',
          title: 'Longest winning streak',
          prompt: md`
            \`results\` is a string of game results: \`W\` (win) or \`L\` (loss). Find the **longest run of consecutive wins**, store it in \`best\` and print it.

            For \`"WWLWWWLW"\` the answer is 3. This is the "max consecutive ones" interview question in disguise.
          `,
          setup: 'results = "WWLWWWLW"',
          starter: '# results is defined\nbest = 0\n',
          solution: py`
            best = 0
            current = 0
            for ch in results:
                if ch == "W":
                    current += 1
                    best = max(best, current)
                else:
                    current = 0
            print(best)
          `,
          tests: [
            { var: 'best', expect: '3' },
            { given: 'results = "LLL"', var: 'best', expect: '0' },
            { given: 'results = "WWWW"', var: 'best', expect: '4', hidden: true },
            { given: 'results = ""', var: 'best', expect: '0', hidden: true },
            { given: 'results = "LWWLWWWWL"', var: 'best', expect: '4', hidden: true },
            { given: 'results = "WLWLWLWWW"', stdout: true, hidden: true },
          ],
          hints: [
            'Track two numbers: `current` (the streak right now) and `best` (the longest seen so far).',
            'On a W: `current += 1` and update `best`. On an L: reset `current = 0`.',
          ],
          wrong: [
            py`
              best = 0
              current = 0
              for ch in results:
                  if ch == "W":
                      current += 1
                  else:
                      best = max(best, current)
                      current = 0
              print(best)
            `,
            py`
              best = 0
              current = 0
              for ch in results:
                  if ch == "W":
                      current += 1
                      best = max(best, current)
              print(best)
            `,
          ],
          explain: 'Updating `best` only when a streak **ends** misses a streak that runs to the end of the data, the bug the "WWWW" test catches. This is one pass with two variables: O(n) time and O(1) memory, so it works just as well on a stream of a billion events.',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u02-exam',
    title: 'Decisions & Loops Exam',
    minutes: 20,
    intro: 'Tricky tracing of conditions and loops, then three simulations to write from scratch. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          x = 0
          print(x or "zero", x and "one", not x)
        `,
        options: ['zero 0 True', 'zero one True', '0 0 True', 'zero 0 False'],
        answer: 0,
        checkOutput: true,
        explain: '`0 or "zero"` returns the first truthy operand, "zero". `0 and "one"` stops at the falsy 0 and returns it. `not 0` is True.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          print("10" < "9", 10 < 9)
          print("Apple" < "apple")
        `,
        options: ['True False\nTrue', 'False False\nTrue', 'True False\nFalse', 'False True\nFalse'],
        answer: 0,
        checkOutput: true,
        explain: 'Strings compare character by character: "1" < "9", so "10" < "9". Uppercase letters come before lowercase ones. This is why numbers stored as text sort wrongly.',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          t = 31
          level = 0
          if t > 30:
              level += 2
          if t > 20:
              level += 1
          elif t > 10:
              level += 5
          else:
              level = -1
          print(level, "hot" if level > 2 else "ok")
        `,
        answer: '3 hot',
        explain: 'The first `if` adds 2. The second `if` starts a new chain: 31 > 20 adds 1, and its `elif`/`else` are skipped. 3 > 2 picks "hot".',
      },
      {
        type: 'output',
        prompt: 'What does this print?',
        code: py`
          i = 0
          total = 0
          while i < 10:
              i += 1
              if i % 3 == 0:
                  continue
              if total > 10:
                  break
              total += i
          print(i, total)
        `,
        answer: '7 12',
        explain: 'Added: 1, 2, (3 skipped), 4, 5, so total = 12 when i = 5. i = 6 is skipped. At i = 7 the total is already > 10, so the loop breaks before adding 7.',
      },
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          for n in range(2, 10):
              for d in range(2, n):
                  if n % d == 0:
                      break
              else:
                  print(n, end=" ")
        `,
        options: ['2 3 5 7', '3 5 7 9', '2 3 5 7 9', '4 6 8 9'],
        answer: 0,
        checkOutput: true,
        explain: 'The `else` belongs to the inner `for`, so it runs only when no divisor broke the loop: the primes. For n = 2 the inner range is empty, so the `else` runs right away.',
      },
      {
        type: 'output',
        prompt: 'Type both lines exactly.',
        code: py`
          total = 0
          for k in range(10, 0, -3):
              total += k
          print(total, k)
          for c in "ab":
              for d in "xy":
                  print(c + d, end=" ")
        `,
        answer: '22 1\nax ay bx by',
        explain: '10 + 7 + 4 + 1 = 22, and `k` keeps its last value 1. The nested loop runs the inner one fully for each outer character.',
      },
      {
        type: 'blanks',
        prompt: '`n` is a positive int. Complete the loop so `rev` holds its digits reversed (1234 → 4321).',
        setup: 'n = 1234',
        code: py`
          rev = 0
          while n ___ 0:
              rev = rev * 10 ___ n % 10
              n ___ 10
        `,
        bank: ['>', '+', '//=', '<', '/=', '%=', '*'],
        answer: ['>', '+', '//='],
        tests: [
          { var: 'rev', expect: '4321' },
          { given: 'n = 907', var: 'rev', expect: '709' },
          { given: 'n = 5', var: 'rev', expect: '5' },
        ],
        explain: 'Shift `rev` one place left (× 10) and add the last digit of `n`, then chop that digit off with `//= 10`. `/=` would turn `n` into a float (123.4, 12.34, …), so `n % 10` stops being a digit.',
      },
      {
        type: 'code',
        title: 'Collatz steps',
        prompt: md`
          The **Collatz** process: if \`n\` is even, halve it. If it's odd, replace it with \`3 * n + 1\`. Repeat until \`n\` is 1.

          \`n\` is a positive int. Count the \`steps\` until it reaches 1, and the \`peak\`: the highest value seen, including the start. For n = 6 (6, 3, 10, 5, 16, 8, 4, 2, 1):

          \`\`\`
          steps=8 peak=16
          \`\`\`
        `,
        setup: 'n = 6',
        starter: '# n is defined\n',
        solution: py`
          steps = 0
          peak = n
          while n != 1:
              if n % 2 == 0:
                  n = n // 2
              else:
                  n = 3 * n + 1
              peak = max(peak, n)
              steps += 1
          print(f"steps={steps} peak={peak}")
        `,
        tests: [
          { stdout: 'steps=8 peak=16\n', name: 'n = 6' },
          { given: 'n = 27', stdout: true, hidden: true },
          { given: 'n = 1', stdout: true, hidden: true },
          { given: 'n = 16', var: 'peak', expect: '16', hidden: true },
          { given: 'n = 7', var: 'steps', expect: '16', hidden: true },
        ],
        wrong: [
          py`
            steps = 0
            peak = n
            while n != 1:
                if n % 2 == 0:
                    n = n / 2
                else:
                    n = 3 * n + 1
                peak = max(peak, n)
                steps += 1
            print(f"steps={steps} peak={peak}")
          `,
          py`
            steps = 0
            peak = 0
            while n != 1:
                if n % 2 == 0:
                    n = n // 2
                else:
                    n = 3 * n + 1
                peak = max(peak, n)
                steps += 1
            print(f"steps={steps} peak={peak}")
          `,
          py`
            steps = 1
            peak = n
            while n != 1:
                if n % 2 == 0:
                    n = n // 2
                else:
                    n = 3 * n + 1
                peak = max(peak, n)
                steps += 1
            print(f"steps={steps} peak={peak}")
          `,
        ],
        explain: '`/` turns `n` into a float (16.0 instead of 16). The peak must start at `n` itself, because for n = 16 the start is the highest value. n = 27 takes 111 steps and peaks at 9232: you can\'t know the loop count in advance, which is why it\'s a `while`.',
      },
      {
        type: 'code',
        title: 'Prime check',
        prompt: md`
          Set \`is_prime\` (a bool) for the int \`n\` and print \`97 is prime\` or \`91 is not prime\`.

          \`n\` can be any int (0, 1 and negatives are not prime) and as large as 1,000,000,007, so only try divisors \`d\` with \`d * d <= n\`.
        `,
        setup: 'n = 97',
        starter: '# n is defined\n',
        solution: py`
          is_prime = n >= 2
          d = 2
          while d * d <= n:
              if n % d == 0:
                  is_prime = False
                  break
              d += 1
          if is_prime:
              print(n, "is prime")
          else:
              print(n, "is not prime")
        `,
        tests: [
          { var: 'is_prime', expect: 'True' },
          { stdout: '97 is prime\n', name: 'prints 97 is prime' },
          { given: 'n = 91', stdout: true },
          { given: 'n = 1', var: 'is_prime', expect: 'False', hidden: true },
          { given: 'n = 2', var: 'is_prime', expect: 'True', hidden: true },
          { given: 'n = 49', var: 'is_prime', expect: 'False', hidden: true },
          { given: 'n = -7', var: 'is_prime', expect: 'False', hidden: true },
          { given: 'n = 1_000_000_007', var: 'is_prime', expect: 'True', hidden: true },
        ],
        wrong: [
          py`
            is_prime = n >= 2
            d = 2
            while d * d < n:
                if n % d == 0:
                    is_prime = False
                    break
                d += 1
            if is_prime:
                print(n, "is prime")
            else:
                print(n, "is not prime")
          `,
          py`
            is_prime = True
            d = 2
            while d * d <= n:
                if n % d == 0:
                    is_prime = False
                    break
                d += 1
            if is_prime:
                print(n, "is prime")
            else:
                print(n, "is not prime")
          `,
        ],
        explain: 'Start from "prime if n >= 2" and disprove it with the first divisor. `d * d <= n` must include equality, or perfect squares like 49 slip through. For 1,000,000,007 this is about 31,623 rounds instead of a billion.',
      },
      {
        type: 'code',
        title: 'Overdraft simulation',
        prompt: md`
          Simulate a year of a bank account that starts at \`balance\`. For every day from day 1 to day 365:

          1. on days divisible by 7, \`income\` arrives **first**
          2. then \`spend\` is paid

          If the balance drops **below 0**, print \`Overdrawn on day N\` and stop. If that never happens, print \`Safe: B\` with the final balance to 2 decimals (\`:.2f\`).

          For balance = 100.0, income = 300.0, spend = 50.0:

          \`\`\`
          Overdrawn on day 3
          \`\`\`
        `,
        setup: 'balance = 100.0\nincome = 300.0\nspend = 50.0',
        starter: '# balance, income, spend exist\n',
        solution: py`
          for day in range(1, 366):
              if day % 7 == 0:
                  balance += income
              balance -= spend
              if balance < 0:
                  print("Overdrawn on day", day)
                  break
          else:
              print(f"Safe: {balance:.2f}")
        `,
        tests: [
          { stdout: 'Overdrawn on day 3\n', name: 'overdrawn on day 3' },
          { given: 'balance = 60.0\nincome = 70.0\nspend = 10.0', stdout: true, hidden: true },
          { given: 'balance = 1000.0\nincome = 500.0\nspend = 60.0', stdout: true, hidden: true },
          { given: 'balance = 100.0\nincome = 0.0\nspend = 5.0', stdout: true, hidden: true },
          { given: 'balance = 3640.0\nincome = 0.0\nspend = 10.0', stdout: true, hidden: true },
        ],
        wrong: [
          py`
            for day in range(1, 366):
                if day % 7 == 0:
                    balance += income
                balance -= spend
                if balance <= 0:
                    print("Overdrawn on day", day)
                    break
            else:
                print(f"Safe: {balance:.2f}")
          `,
          py`
            for day in range(1, 366):
                balance -= spend
                if balance < 0:
                    print("Overdrawn on day", day)
                    break
                if day % 7 == 0:
                    balance += income
            else:
                print(f"Safe: {balance:.2f}")
          `,
          py`
            for day in range(1, 365):
                if day % 7 == 0:
                    balance += income
                balance -= spend
                if balance < 0:
                    print("Overdrawn on day", day)
                    break
            else:
                print(f"Safe: {balance:.2f}")
          `,
        ],
        explain: md`
          The hidden tests target each detail of the spec:

          - a balance of exactly 0 is **not** overdrawn (\`< 0\`, not \`<= 0\`)
          - on paydays the income arrives **before** spending
          - day 365 is included, so \`range(1, 366)\`

          \`for … else\` gives you the "never overdrawn" branch without an extra flag variable.
        `,
      },
    ],
  },
};

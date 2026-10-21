// Unit 4 — Strings & Text.
import { py, md } from './helpers.js';

export default {
  id: 'u04',
  order: 4,
  track: 'foundations',
  title: 'Strings & Text',
  subtitle: 'slicing, methods, split/join, regex',
  icon: '🔤',
  color: '#F59E0B',
  lessons: [
    // ------------------------------------------------------------------ L1
    {
      id: 'u04-l1',
      title: 'Indexing & Slicing',
      summary: 'Pick single characters and whole pieces out of a string.',
      steps: [
        {
          type: 'learn',
          title: 'Positions start at 0',
          body: md`
            A string is a **sequence** of characters, and every character has a position, its **index**, starting at **0**. \`s[0]\` is the first character and \`s[len(s) - 1]\` the last.

            **Negative** indexes count from the end: \`s[-1]\` is the last character, \`s[-2]\` the one before. No need to compute \`len(s) - 1\`.

            Asking for a position that doesn't exist raises an **IndexError**.
          `,
          code: py`
            s = "PYTHON"
            print(s[0], s[1], s[5])
            print(s[-1], s[-2])
            print(len(s))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            s = "dataset"
            print(s[3], s[-1])
          `,
          options: ['a t', 't t', 'a s', 't s'],
          answer: 0,
          checkOutput: true,
          explain: 'Count from 0: d=0, a=1, t=2, **a=3**. `s[-1]` is always the last character, here `t`.',
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            code = "SQL"
            print(code[3])
          `,
          options: ['IndexError: string index out of range', 'L', 'Nothing is printed', 'Q'],
          answer: 0,
          checkOutput: true,
          explain: '"SQL" has 3 characters at indexes 0, 1 and 2. Index 3 is one past the end: the classic **off-by-one** error. The last character is `code[2]`, or simply `code[-1]`.',
        },
        {
          type: 'learn',
          title: 'Slicing',
          body: md`
            \`s[start:stop]\` returns a **new string** from \`start\` up to **but not including** \`stop\`. The slice has \`stop - start\` characters.

            Leave out \`start\` to begin at 0, leave out \`stop\` to go to the end.

            Fixed-width text like timestamps, IDs and dates is sliced all day long in data work.
          `,
          code: py`
            ts = "2025-11-12 09:30:00"
            print(ts[0:4])   # year
            print(ts[5:7])   # month
            print(ts[:10])   # the date part
            print(ts[11:])   # the time part
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            day = "2025-11-12"
            print(day[8:])
            print(day[:4] + day[5:7])
          `,
          answer: '12\n202511',
          explain: '`day[8:]` runs from index 8 to the end ("12"). `day[:4]` is "2025" and `day[5:7]` is "11". Joined: "202511", a handy year-month key for grouping.',
        },
        {
          type: 'blanks',
          prompt: 'Slice out the hour so the program prints `09`.',
          code: py`
            ts = "2025-11-12 09:30:00"
            hour = ts[___:___]
            print(hour)
          `,
          bank: ['11', '13', '10', '12', '14'],
          answer: ['11', '13'],
          tests: [{ stdout: '09\n' }],
          explain: 'The date takes indexes 0–9 and index 10 is the space, so the hour sits at 11 and 12. The stop index 13 is **excluded**, which is why it is one past the last character you want.',
        },
        {
          type: 'learn',
          title: 'Steps, reversing, and safe slices',
          body: md`
            A third number is the **step**: \`s[::2]\` takes every 2nd character. A negative step walks backwards, so \`s[::-1]\` is the whole string **reversed**. That's the most famous Python one-liner.

            Slices never raise an IndexError. Out-of-range bounds are simply clipped: \`s[5:100]\` stops at the end, and \`s[50:]\` is just \`""\`.
          `,
          code: py`
            s = "abcdefgh"
            print(s[::2])
            print(s[1::2])
            print(s[::-1])
            print(s[5:100], s[50:] == "")
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            s = "abcdef"
            print(s[::-2])
          `,
          options: ['fdb', 'eca', 'fedcba', 'ace'],
          answer: 0,
          checkOutput: true,
          explain: 'With a negative step and no bounds, the slice starts at the **last** character (f) and walks back 2 at a time: f, d, b.',
        },
        {
          type: 'output',
          prompt: 'Type both lines exactly.',
          code: py`
            s = "Python"
            print(len(s[10:]), s[-3:99])
            print(s[1:-1])
          `,
          answer: '0 hon\nytho',
          explain: '`s[10:]` starts past the end, so it is the empty string (length 0), with no error. `s[-3:99]` is clipped to "hon". `s[1:-1]` drops the first and the last character.',
        },
        {
          type: 'learn',
          title: 'Strings never change',
          body: md`
            Strings are **immutable**: \`s[0] = "J"\` raises a TypeError. To "change" one, build a **new** string and point the name at it: \`s = "J" + s[1:]\`.

            To read a string character by character, loop over it with \`for ch in s:\`. Use \`range(len(s))\` when you also need each index.
          `,
          code: py`
            s = "java"
            s = "J" + s[1:]   # a brand-new string
            print(s)

            for ch in "hey":
                print(ch * 2)

            for i in range(len(s)):
                print(i, s[i])
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: py`
            name = "bob"
            name[0] = "B"
            print(name)
          `,
          options: [
            "TypeError: 'str' object does not support item assignment",
            'Bob',
            'bob',
            'IndexError: string index out of range',
          ],
          answer: 0,
          checkOutput: true,
          explain: 'You can read `name[0]` but never assign to it. Write `name = "B" + name[1:]` instead. Immutability is also why strings are safe to share and can be used as dictionary keys (Unit 6).',
        },
        {
          type: 'order',
          prompt: '`s` already exists. Arrange the lines so the program builds `rev`, the reverse of `s`, one character at a time and prints it.',
          setup: 's = "stream"',
          lines: ['rev = ""', 'for ch in s:', '    rev = ch + rev', 'print(rev)'],
          distractors: ['    rev = rev + ch'],
          tests: [{ stdout: 'maerts\n' }],
          explain: 'Putting each new character in **front** of what you have reverses the order. `rev + ch` would rebuild the original string. In real code you would just write `s[::-1]`, but interviewers sometimes ask for the loop.',
        },
        {
          type: 'code',
          title: 'Mask a card number',
          prompt: md`
            Logs must never contain full card numbers. Write \`mask(card)\` that replaces every character except the **last 4** with \`*\`. \`card\` is a string of at least 4 digits.

            \`\`\`python
            mask("4111222233334444")  # "************4444"
            mask("1234")              # "1234"
            \`\`\`
          `,
          starter: 'def mask(card):\n    pass\n',
          solution: py`
            def mask(card):
                return "*" * (len(card) - 4) + card[-4:]
          `,
          tests: [
            { call: 'mask("4111222233334444")', expect: '"************4444"' },
            { call: 'mask("1234")', expect: '"1234"' },
            { call: 'mask("98765")', expect: '"*8765"', hidden: true },
            { call: 'mask("378282246310005")', hidden: true },
            { call: 'mask("5555444433332222111")', hidden: true },
          ],
          hints: [
            'How many characters get hidden? `len(card) - 4`.',
            'Repeat `"*"` that many times and add the slice `card[-4:]`.',
          ],
          wrong: [
            'def mask(card):\n    return "************" + card[-4:]\n',
            'def mask(card):\n    return "*" * (len(card) - 4) + card[:4]\n',
            'def mask(card):\n    return "*" * len(card) + card[-4:]\n',
          ],
          explain: '`card[-4:]` gives the last 4 characters for any length, no index arithmetic needed. A string times 0 is `""`, so a 4-digit input needs no special case. Hard-coding 12 stars breaks for 15-digit Amex numbers: always derive sizes from the data.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: the middle character',
          prompt: md`
            \`middle(word)\` should return the middle character of an odd-length word and the **middle two** characters of an even-length word:

            \`\`\`python
            middle("sql")     # "q"
            middle("data")    # "at"
            middle("python")  # "th"
            \`\`\`

            It has **two** bugs. Run it, read the error, and fix both.
          `,
          starter: py`
            def middle(word):
                mid = len(word) / 2
                if len(word) % 2 == 0:
                    return word[mid]
                return word[mid]
          `,
          solution: py`
            def middle(word):
                mid = len(word) // 2
                if len(word) % 2 == 0:
                    return word[mid - 1:mid + 1]
                return word[mid]
          `,
          tests: [
            { call: 'middle("sql")', expect: '"q"' },
            { call: 'middle("data")', expect: '"at"' },
            { call: 'middle("python")', expect: '"th"', hidden: true },
            { call: 'middle("a")', expect: '"a"', hidden: true },
            { call: 'middle("ab")', expect: '"ab"', hidden: true },
            { call: 'middle("abcdefg")', hidden: true },
          ],
          hints: [
            'The error says string indices must be integers. What type does `/` always return?',
            'For "data" (length 4, `mid = 2`) you need indexes 1 and 2: the slice `word[mid - 1:mid + 1]`.',
          ],
          wrong: [
            py`
              def middle(word):
                  mid = len(word) // 2
                  if len(word) % 2 == 0:
                      return word[mid]
                  return word[mid]
            `,
            py`
              def middle(word):
                  mid = len(word) // 2
                  if len(word) % 2 == 0:
                      return word[mid:mid + 2]
                  return word[mid]
            `,
          ],
          explain: '`/` always returns a float (4 / 2 is 2.0) and indexes must be ints, so use `//`. For an even length the two middle characters sit at `mid - 1` and `mid`; the slice stop `mid + 1` is excluded. Trace "ab" by hand to convince yourself.',
        },
      ],
    },

    // ------------------------------------------------------------------ L2
    {
      id: 'u04-l2',
      title: 'String Methods',
      summary: 'Clean, search and validate text with built-in methods.',
      steps: [
        {
          type: 'learn',
          title: 'Methods return new strings',
          body: md`
            A **method** is a function that belongs to a value. You call it with a dot: \`s.upper()\`.

            Strings are immutable, so string methods never change \`s\`. They **return a new string**. Keep the result by assigning it: \`s = s.lower()\`.

            - \`upper()\`, \`lower()\`: change the case
            - \`title()\`: capitalise the first letter of each word
          `,
          code: py`
            name = "ada LOVELACE"
            print(name.upper())
            print(name.title())
            print(name)          # unchanged!
            name = name.lower()
            print(name)
          `,
        },
        {
          type: 'output',
          prompt: 'Careful! What does this print?',
          code: py`
            city = "nEW yORK"
            city.lower()
            print(city)
            print(city.title())
          `,
          answer: 'nEW yORK\nNew York',
          explain: 'Line 2 computes "new york" and throws it away because the result is never stored. `title()` upper-cases the first letter of each word and lower-cases the rest.',
        },
        {
          type: 'learn',
          title: 'Cleaning: strip, replace, chaining',
          body: md`
            - \`s.strip()\` removes whitespace (spaces, tabs, newlines) from **both ends**. \`lstrip()\` and \`rstrip()\` do one side. \`s.strip("$")\` removes those characters instead.
            - \`s.replace(old, new)\` replaces **every** occurrence.

            Every method returns a string, so you can **chain** them; they run left to right. This one line normalises a messy email, a step in every user-data pipeline:
          `,
          code: py`
            raw = "  Alice@Example.COM \n"
            email = raw.strip().lower()
            print(email)
            print("1,299,000".replace(",", ""))
            print("$$42$".strip("$"))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            price = "  $1,299 "
            print(price.strip().replace(",", ""))
          `,
          options: ['$1299', '1299', '$1,299', '  $1299'],
          answer: 0,
          checkOutput: true,
          explain: '`strip()` only removes the whitespace at the ends and `replace` removes the comma. Nobody removed the `$`. `price.strip(" $")` would strip both spaces and dollar signs.',
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            d = "2025-11-12"
            print(d.replace("-", "/"))
            print(d.replace("-", ""))
            print("  x  ".strip() + "|")
          `,
          answer: '2025/11/12\n20251112\nx|',
          explain: 'Replacing with `""` deletes. `strip()` removed the spaces on both sides of the x, so the bar comes right after it.',
        },
        {
          type: 'blanks',
          prompt: 'Chain two methods so the program prints `bob@mail.com`.',
          code: py`
            raw = "  Bob@Mail.COM \t"
            clean = raw.___().___()
            print(clean)
          `,
          bank: ['strip', 'lower', 'upper', 'title', 'rstrip'],
          answer: ['strip', 'lower'],
          accept: [['lower', 'strip']],
          tests: [{ stdout: 'bob@mail.com\n' }],
          explain: 'Either order works here: `strip()` removes the spaces and the tab, `lower()` fixes the case. `rstrip()` would leave the leading spaces.',
        },
        {
          type: 'learn',
          title: 'Searching inside text',
          body: md`
            - \`sub in s\`: True or False, does \`s\` contain \`sub\`?
            - \`s.find(sub)\`: index of the first match, or **-1** if there is none
            - \`s.count(sub)\`: how many times \`sub\` appears (non-overlapping)
            - \`s.startswith(p)\`, \`s.endswith(p)\`: True or False

            All of them are **case-sensitive**. Lower-case the text first when case shouldn't matter.
          `,
          code: py`
            path = "/api/orders/42"
            print("orders" in path)
            print(path.find("orders"), path.find("users"))
            print(path.count("/"))
            print(path.startswith("/api"))
            print(path.endswith(".csv"))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            log = "WARN disk 91%; WARN disk 95%"
            print(log.find("disk"), log.count("WARN"))
          `,
          options: ['5 2', '4 2', '5 1', '6 2'],
          answer: 0,
          checkOutput: true,
          explain: '"WARN " takes indexes 0–4 (the space is index 4), so "disk" starts at **5**. `find` reports only the first match; `count` counts all of them.',
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            msg = "ERROR: Disk full"
            print(msg.startswith("error"))
            print("disk" in msg.lower())
            print(msg.find("x"))
          `,
          answer: 'False\nTrue\n-1',
          explain: '"error" isn\'t "ERROR", since searches are case-sensitive. Lower-casing first makes the check case-insensitive. `find` returns -1 for "not found" (careful: -1 is also a valid index, so always compare with -1 explicitly).',
        },
        {
          type: 'learn',
          title: 'Asking questions: is...() methods',
          body: md`
            These return True or False about the **whole** string:

            | method | True when every character is |
            |---|---|
            | \`isdigit()\` | a digit 0–9 |
            | \`isalpha()\` | a letter |
            | \`isalnum()\` | a letter or a digit |

            \`isupper()\` and \`islower()\` check that all *letters* are upper or lower case. All of them return False for \`""\`.

            Validate text **before** converting it, so \`int()\` doesn't crash on bad input.
          `,
          code: py`
            print("2025".isdigit(), "-5".isdigit())
            print("Ada".isalpha(), "Ada L".isalpha())
            print("R2D2".isalnum(), "".isdigit())
            qty = "12"
            if qty.isdigit():
                print(int(qty) * 2)
          `,
        },
        {
          type: 'choice',
          prompt: 'Which expression is `True`?',
          options: ['"007".isdigit()', '"3.5".isdigit()', '"-5".isdigit()', '" 42".isdigit()'],
          answer: 0,
          explain: 'Leading zeros are still digits. A dot, a minus sign or a space is not a digit, so the whole check fails. For decimals or negatives you need a different test (or `float()` with error handling, Unit 8).',
        },
        {
          type: 'code',
          title: 'Normalise an email',
          prompt: md`
            Sign-up forms deliver emails like \`"  Alice@Example.COM \n"\`. Write \`normalize_email(raw)\` that returns the email without surrounding whitespace, all lower-case.

            \`\`\`python
            normalize_email(" Alice@Example.COM ")
            # "alice@example.com"
            \`\`\`
          `,
          starter: 'def normalize_email(raw):\n    pass\n',
          solution: py`
            def normalize_email(raw):
                return raw.strip().lower()
          `,
          tests: [
            { call: 'normalize_email(" Alice@Example.COM ")', expect: '"alice@example.com"' },
            { call: 'normalize_email("bob@mail.com")', expect: '"bob@mail.com"' },
            { call: 'normalize_email("\\tCY@DATA.IO\\n")', expect: '"cy@data.io"', hidden: true },
            { call: 'normalize_email("   ")', expect: '""', hidden: true },
          ],
          hints: [
            'Two methods: one removes whitespace at the ends, one changes the case.',
            '`return raw.strip().lower()`',
          ],
          wrong: [
            'def normalize_email(raw):\n    return raw.lower()\n',
            'def normalize_email(raw):\n    raw.strip()\n    return raw.lower()\n',
            'def normalize_email(raw):\n    return raw.strip(" ").lower()\n',
          ],
          explain: 'To a database, "Alice@Example.com" and "alice@example.com " are different strings, so skipping this step means duplicate accounts and failed logins. Plain `strip()` also removes tabs and newlines; `strip(" ")` would only remove spaces.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: parse a price',
          prompt: md`
            \`parse_amount(text)\` should turn price strings like \`" €1,200.50 "\` into the float \`1200.5\`. Instead it crashes with a ValueError. Fix it.

            \`\`\`python
            parse_amount(" €1,200.50 ")  # 1200.5
            parse_amount("€99")          # 99.0
            \`\`\`
          `,
          starter: py`
            def parse_amount(text):
                text.strip()
                text.replace("€", "")
                text.replace(",", "")
                return float(text)
          `,
          solution: py`
            def parse_amount(text):
                text = text.strip()
                text = text.replace("€", "")
                text = text.replace(",", "")
                return float(text)
          `,
          tests: [
            { call: 'parse_amount(" €1,200.50 ")', expect: '1200.5' },
            { call: 'parse_amount("€99")', expect: '99.0' },
            { call: 'parse_amount("3,000,000")', expect: '3000000.0', hidden: true },
            { call: 'parse_amount("12.5")', expect: '12.5', hidden: true },
            { call: 'parse_amount("€0.99\\n")', expect: '0.99', hidden: true },
          ],
          hints: [
            'Strings are immutable. What happens to the string that `text.replace(...)` returns?',
            'Store each result: `text = text.replace("€", "")`.',
          ],
          wrong: [
            py`
              def parse_amount(text):
                  text = text.strip()
                  text.replace("€", "")
                  text.replace(",", "")
                  return float(text)
            `,
            py`
              def parse_amount(text):
                  text = text.replace("€", "")
                  return float(text)
            `,
          ],
          explain: 'Each method returned a cleaned copy that was thrown away immediately, so `float()` still saw "€1,200.50". A chain works too: `float(text.strip().replace("€", "").replace(",", ""))`. Exported spreadsheets are full of strings like this; you will clean whole columns of them in the pandas units.',
        },
        {
          type: 'code',
          title: 'Validate product codes',
          prompt: md`
            A warehouse uses product codes like \`"SKU-04512"\`: the prefix \`SKU-\` followed by **exactly 5 digits**. People type them sloppily, so first strip the whitespace and upper-case the code.

            Write \`is_valid_sku(code)\` that returns True or False.

            \`\`\`python
            is_valid_sku(" sku-04512 ")  # True
            is_valid_sku("SKU-4512")     # False
            is_valid_sku("SKU-0451A")    # False
            \`\`\`
          `,
          starter: 'def is_valid_sku(code):\n    pass\n',
          solution: py`
            def is_valid_sku(code):
                code = code.strip().upper()
                if not code.startswith("SKU-"):
                    return False
                digits = code[4:]
                return len(digits) == 5 and digits.isdigit()
          `,
          tests: [
            { call: 'is_valid_sku(" sku-04512 ")', expect: 'True' },
            { call: 'is_valid_sku("SKU-4512")', expect: 'False' },
            { call: 'is_valid_sku("SKU-0451A")', expect: 'False' },
            { call: 'is_valid_sku("SKU-045123")', expect: 'False', hidden: true },
            { call: 'is_valid_sku("ABC-04512")', expect: 'False', hidden: true },
            { call: 'is_valid_sku("SKU04512")', expect: 'False', hidden: true },
            { call: 'is_valid_sku("xSKU-04512")', expect: 'False', hidden: true },
            { call: 'is_valid_sku("SKU-")', expect: 'False', hidden: true },
            { call: 'is_valid_sku("SKU-99999")', expect: 'True', hidden: true },
          ],
          hints: [
            'Normalise first: `code = code.strip().upper()`.',
            'Use a guard clause: `if not code.startswith("SKU-"): return False`.',
            'Then the slice `code[4:]` must have length 5 **and** be all digits.',
          ],
          wrong: [
            'def is_valid_sku(code):\n    return code.startswith("SKU-") and code[4:].isdigit() and len(code) == 9\n',
            py`
              def is_valid_sku(code):
                  code = code.strip().upper()
                  return code.startswith("SKU-") and code[4:].isdigit()
            `,
            py`
              def is_valid_sku(code):
                  code = code.strip().upper()
                  last5 = code[-5:]
                  return "SKU-" in code and last5.isdigit()
            `,
          ],
          explain: 'Normalise, **then** validate. The other order rejects " sku-04512". `isdigit()` alone isn\'t enough, because "123456" is all digits too, so the length check matters. And `"SKU-" in code` accepts junk before the prefix. In the regex lesson this whole rule becomes one pattern: `^SKU-\\d{5}$`.',
        },
      ],
    },

    // ------------------------------------------------------------------ L3
    {
      id: 'u04-l3',
      title: 'split & join',
      summary: 'Cut text into pieces, work with them, glue them back.',
      steps: [
        {
          type: 'learn',
          title: 'split() turns text into a list',
          body: md`
            \`s.split()\` cuts a string into pieces and returns them as a **list**, written \`[...]\`.

            - With no argument it splits on any run of whitespace and ignores whitespace at the ends.
            - \`s.split(",")\` splits on exactly that separator. Every separator counts, even two in a row.

            You read a list like a string: \`parts[0]\`, \`parts[-1]\`, slices, and \`len(parts)\`. (Lists get a whole unit next.)
          `,
          code: py`
            line = "GET  /api/orders   200"
            parts = line.split()
            print(parts)
            print(parts[1], len(parts))
            print("a,b,,c".split(","))
          `,
        },
        {
          type: 'output',
          prompt: 'Type exactly what this prints.',
          code: py`
            row = "42,Ada,DE,pro"
            fields = row.split(",")
            print(fields[1], fields[-1])
            print(len(fields))
          `,
          answer: 'Ada pro\n4',
          explain: 'Three commas make four fields. `fields[-1]` is the last one, so you don\'t need to know how many columns there are.',
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            print(len(" big  data ".split()))
            print(len(" big  data ".split(" ")))
          `,
          options: ['2\n5', '2\n2', '2\n4', '3\n5'],
          answer: 0,
          checkOutput: true,
          explain: '`split()` treats any run of whitespace as one separator and drops the ends: `["big", "data"]`. `split(" ")` splits at **every** single space, producing empty strings: `["", "big", "", "data", ""]`. For messy text, the no-argument form is almost always what you want.',
        },
        {
          type: 'learn',
          title: 'Loop over the pieces, or unpack them',
          body: md`
            A \`for\` loop walks over a list just like over a string.

            When you know how many pieces there are, **unpack** them into names, as with the tuples in the Functions unit. If the count doesn't match, Python raises a ValueError.

            \`split("=", 1)\` splits at most **once**, so a value that itself contains \`=\` stays in one piece.
          `,
          code: py`
            for word in "to be or not".split():
                print(word, len(word))

            key, value = "timeout=30".split("=")
            print(key, int(value) * 2)

            k, v = "token=a=b".split("=", 1)
            print(v)
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            user, domain = "ada@example.com".split("@")
            print(domain.upper())
            total = 0
            for n in "3 4 5".split():
                total += int(n)
            print(total)
          `,
          answer: 'EXAMPLE.COM\n12',
          explain: 'Splitting on "@" gives exactly two pieces, unpacked into `user` and `domain`. The pieces of "3 4 5" are strings, so each needs `int()` before adding.',
        },
        {
          type: 'blanks',
          prompt: 'Unpack the CSV line so the program prints the email.',
          code: py`
            line = "Ada Lovelace,ada@example.com,UK"
            name, email, country = line.___(___)
            print(email)
          `,
          bank: ['split', 'join', '","', '" "', 'strip'],
          answer: ['split', '","'],
          tests: [{ stdout: 'ada@example.com\n' }],
          explain: 'Splitting on commas gives exactly three fields. Splitting on `" "` would break the name in two and give the wrong number of pieces, so the unpacking would raise a ValueError.',
        },
        {
          type: 'learn',
          title: 'join(): the reverse of split',
          body: md`
            \`sep.join(pieces)\` glues a list of strings into one string, with \`sep\` **between** the pieces (never after the last one). It reads backwards at first: the separator comes first.

            Every piece must already be a string. \`join\` won't convert numbers for you.
          `,
          code: py`
            parts = ["2025", "11", "12"]
            print("-".join(parts))
            print(", ".join(["ada", "bob", "cy"]))
            words = "  too   many   spaces ".split()
            print(" ".join(words))
          `,
        },
        {
          type: 'choice',
          prompt: 'What happens?',
          code: 'print("-".join(["a", 1, "b"]))',
          options: [
            'TypeError: sequence item 1: expected str instance, int found',
            'a-1-b',
            'a1b',
            'TypeError: can only join strings',
          ],
          answer: 0,
          checkOutput: true,
          explain: '`join` only accepts strings, and the error even tells you which item (index 1) is the problem. Convert first, e.g. `str(1)`.',
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            words = "big data is big".split()
            print("_".join(words))
            print(" ".join(words[::-1]))
            print("".join("a-b-c".split("-")))
          `,
          answer: 'big_data_is_big\nbig is data big\nabc',
          explain: 'Lists slice like strings, so `words[::-1]` reverses the word order (a popular interview warm-up). Splitting on "-" and joining with "" removes the dashes, the same as `replace("-", "")`.',
        },
        {
          type: 'learn',
          title: 'Build pieces, then join once',
          body: md`
            Gluing strings with \`+=\` in a loop works, but it's easy to end up with an extra separator at the end. And since strings are immutable, each \`+=\` copies everything built so far, which gets slow for very long outputs.

            \`join\` puts separators only *between* pieces and builds the result in one go. A common pattern: \`split\`, work on the pieces, \`join\` them back.
          `,
          code: py`
            out = ""
            for w in ["a", "b", "c"]:
                out += w + ","
            print(out)                  # trailing comma!
            print(",".join(["a", "b", "c"]))
          `,
        },
        {
          type: 'code',
          title: 'URL slugs',
          prompt: md`
            Blogs turn titles into URL "slugs". Write \`slugify(title)\` that lower-cases the title and joins its words with \`-\`. Any amount of whitespace between words counts as one separator.

            \`\`\`python
            slugify("  Top 10   Python Tips ")
            # "top-10-python-tips"
            \`\`\`
          `,
          starter: 'def slugify(title):\n    pass\n',
          solution: py`
            def slugify(title):
                return "-".join(title.lower().split())
          `,
          tests: [
            { call: 'slugify("  Top 10   Python Tips ")', expect: '"top-10-python-tips"' },
            { call: 'slugify("Hello")', expect: '"hello"' },
            { call: 'slugify("")', expect: '""', hidden: true },
            { call: 'slugify("Data\\tEngineering\\n101")', expect: '"data-engineering-101"', hidden: true },
            { call: 'slugify("A  B")', expect: '"a-b"', hidden: true },
          ],
          hints: [
            '`split()` with no argument already handles extra spaces, tabs and newlines.',
            '`"-".join(title.lower().split())`',
          ],
          wrong: [
            'def slugify(title):\n    return title.lower().replace(" ", "-")\n',
            'def slugify(title):\n    return "-".join(title.lower().split(" "))\n',
            'def slugify(title):\n    return "-".join(title.split())\n',
          ],
          explain: '`split()` throws away all whitespace, and `join` puts exactly one `-` between words with nothing stray at the ends. `replace(" ", "-")` breaks as soon as there are double spaces or a tab.',
        },
        {
          type: 'code',
          title: 'Read a config value',
          prompt: md`
            Settings arrive as one line of \`key=value\` pairs separated by \`;\`, like \`"user=ada;plan=pro;region=eu"\`.

            Write \`get_value(line, key)\` that returns the value for \`key\` as a string, or \`None\` if the key isn't there. Values may contain \`=\` themselves.

            \`\`\`python
            get_value("user=ada;plan=pro", "plan")  # "pro"
            get_value("user=ada;plan=pro", "age")   # None
            \`\`\`
          `,
          starter: 'def get_value(line, key):\n    pass\n',
          solution: py`
            def get_value(line, key):
                for pair in line.split(";"):
                    k, v = pair.split("=", 1)
                    if k == key:
                        return v
                return None
          `,
          tests: [
            { call: 'get_value("user=ada;plan=pro", "plan")', expect: '"pro"' },
            { call: 'get_value("user=ada;plan=pro", "age")', expect: 'None' },
            { call: 'get_value("user=ada;plan=pro", "user")', expect: '"ada"', hidden: true },
            { call: 'get_value("q=a=b;page=2", "q")', expect: '"a=b"', hidden: true },
            { call: 'get_value("planet=mars;plan=pro", "plan")', expect: '"pro"', hidden: true },
            { call: 'get_value("x=1", "x")', expect: '"1"', hidden: true },
          ],
          hints: [
            'Split the line on `";"` and loop over the pairs.',
            'Split each pair at the **first** `=` only: `pair.split("=", 1)`.',
            'Return `None` only **after** the loop has checked every pair.',
          ],
          wrong: [
            py`
              def get_value(line, key):
                  for pair in line.split(";"):
                      k, v = pair.split("=", 1)
                      if k == key:
                          return v
                      else:
                          return None
            `,
            py`
              def get_value(line, key):
                  for pair in line.split(";"):
                      k, v = pair.split("=")
                      if k == key:
                          return v
                  return None
            `,
            py`
              def get_value(line, key):
                  for pair in line.split(";"):
                      if pair.startswith(key):
                          return pair[len(key) + 1:]
                  return None
            `,
          ],
          explain: 'Three classic bugs: returning `None` inside the loop (only the first pair ever gets checked), `split("=")` without the limit (crashes on "a=b"), and `startswith(key)` (matches "planet" when you asked for "plan"). In Unit 6 you\'ll parse the line once into a dict and look up keys instantly.',
        },
        {
          type: 'code',
          title: 'Sum a CSV column',
          prompt: md`
            \`csv_text\` holds CSV data: a header line, then rows, separated by \`"\n"\`. There may be a trailing newline.

            Write \`column_total(csv_text, column)\` that returns the sum of the numeric column named \`column\` as a float. The column always exists.

            \`\`\`python
            data = "id,amount,country\n1,9.5,DE\n2,20,US\n"
            column_total(data, "amount")  # 29.5
            \`\`\`
          `,
          starter: 'def column_total(csv_text, column):\n    pass\n',
          solution: py`
            def column_total(csv_text, column):
                lines = csv_text.strip().split("\n")
                header = lines[0].split(",")
                idx = 0
                for i in range(len(header)):
                    if header[i] == column:
                        idx = i
                total = 0.0
                for line in lines[1:]:
                    total += float(line.split(",")[idx])
                return total
          `,
          tests: [
            { call: 'column_total("id,amount,country\\n1,9.5,DE\\n2,20,US\\n", "amount")', expect: '29.5' },
            { call: 'column_total("id,amount\\n1,9.5\\n2,20", "id")', expect: '3.0' },
            { call: 'column_total("id,amount\\n", "amount")', expect: '0.0', hidden: true },
            { call: 'column_total("a,b,c\\n1,2,3\\n4,5,6.5", "c")', expect: '9.5', hidden: true },
            { call: 'column_total("x,qty\\n1,-2\\n2,0.5\\n3,4\\n", "qty")', expect: '2.5', hidden: true },
          ],
          hints: [
            '`csv_text.strip().split("\\n")` gives the lines. The first one is the header.',
            'Find the position of `column` in the header with a loop over `range(len(header))`.',
            'Then loop over `lines[1:]`, split each row on `","` and add `float(...)` of the field at that position.',
          ],
          wrong: [
            py`
              def column_total(csv_text, column):
                  lines = csv_text.strip().split("\n")
                  total = 0.0
                  for line in lines[1:]:
                      total += float(line.split(",")[1])
                  return total
            `,
            py`
              def column_total(csv_text, column):
                  lines = csv_text.split("\n")
                  header = lines[0].split(",")
                  idx = 0
                  for i in range(len(header)):
                      if header[i] == column:
                          idx = i
                  total = 0.0
                  for line in lines[1:]:
                      total += float(line.split(",")[idx])
                  return total
            `,
          ],
          explain: 'This is what CSV readers do under the hood: split into lines, split each line into fields, find the column by its header name. `.strip()` first makes a trailing newline harmless. Real CSV can contain quoted commas like `"Berlin, DE"`, which is why you\'ll use the `csv` module and pandas later. But now you know what they do for you.',
        },
      ],
    },

    // ------------------------------------------------------------------ L4
    {
      id: 'u04-l4',
      title: 'Text Algorithms',
      summary: 'Palindromes, anagrams, ciphers and compression: classic interview questions.',
      steps: [
        {
          type: 'learn',
          title: 'Palindromes',
          body: md`
            A palindrome reads the same backwards: \`s == s[::-1]\`.

            Real inputs need **normalising** first: "Never odd or even" only counts if you ignore case and spaces. Build a cleaned string that keeps only the characters you care about.

            > Interview tip: state the rules out loud before coding ("ignore case? spaces? punctuation?"). Clarifying the input is half of what the interviewer is checking.
          `,
          code: py`
            s = "Never odd or even"
            clean = ""
            for ch in s.lower():
                if ch.isalnum():
                    clean += ch
            print(clean)
            print(clean == clean[::-1])
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            s = "Race car"
            t = s.lower().replace(" ", "")
            print(t, t == t[::-1])
          `,
          options: ['racecar True', 'racecar False', 'race car True', 'Race car False'],
          answer: 0,
          checkOutput: true,
          explain: 'After lower-casing and removing the space, "racecar" is the same in both directions. Without the cleaning, "Race car" reversed is "rac ecaR", not a match.',
        },
        {
          type: 'code',
          title: 'Is it a palindrome?',
          prompt: md`
            Write \`is_palindrome(text)\` that returns True if \`text\` reads the same forwards and backwards when you **ignore case and every character that isn't a letter or a digit**.

            \`\`\`python
            is_palindrome("A man, a plan, a canal: Panama")
            # True
            is_palindrome("Data")  # False
            \`\`\`
          `,
          starter: 'def is_palindrome(text):\n    pass\n',
          solution: py`
            def is_palindrome(text):
                clean = ""
                for ch in text.lower():
                    if ch.isalnum():
                        clean += ch
                return clean == clean[::-1]
          `,
          tests: [
            { call: 'is_palindrome("A man, a plan, a canal: Panama")', expect: 'True' },
            { call: 'is_palindrome("Data")', expect: 'False' },
            { call: 'is_palindrome("")', expect: 'True', hidden: true },
            { call: 'is_palindrome("No \'x\' in Nixon")', expect: 'True', hidden: true },
            { call: 'is_palindrome("ab")', expect: 'False', hidden: true },
            { call: 'is_palindrome("1a2")', expect: 'False', hidden: true },
            { call: 'is_palindrome("Was it a car or a cat I saw?")', expect: 'True', hidden: true },
          ],
          hints: [
            'Build a cleaned string in a loop: keep `ch` only if `ch.isalnum()`.',
            'Lower-case first, then compare `clean == clean[::-1]`.',
          ],
          wrong: [
            'def is_palindrome(text):\n    return text == text[::-1]\n',
            py`
              def is_palindrome(text):
                  t = text.lower().replace(" ", "")
                  return t == t[::-1]
            `,
            py`
              def is_palindrome(text):
                  clean = ""
                  for ch in text.lower():
                      if ch.isalpha():
                          clean += ch
                  return clean == clean[::-1]
            `,
          ],
          explain: 'O(n) time, plus O(n) extra space for the cleaned copy. A favourite follow-up: do it with **two indexes** moving inward from both ends, skipping characters that aren\'t alphanumeric. That needs only O(1) extra space.',
        },
        {
          type: 'learn',
          title: 'Anagrams with sorted()',
          body: md`
            Two words are **anagrams** if they use exactly the same letters, like "listen" and "silent".

            \`sorted(s)\` returns a list of the characters in order. Two strings are anagrams exactly when their sorted characters are equal. \`"".join(sorted(s))\` turns the list back into a string, a handy "signature".

            Sorting costs O(n log n). In Unit 6 you'll count letters with a dict instead, for O(n).
          `,
          code: py`
            print(sorted("silent"))
            print("".join(sorted("listen")))
            print(sorted("listen") == sorted("silent"))
          `,
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            print(sorted("bca"))
            print("".join(sorted("data")))
            print(sorted("ab") == sorted("ba "))
          `,
          answer: "['a', 'b', 'c']\naadt\nFalse",
          explain: '`sorted` returns a **list**, printed with brackets and quotes. The space in "ba " is a character too, so the sorted lists differ: normalise before comparing.',
        },
        {
          type: 'code',
          title: 'Anagram check',
          prompt: md`
            Write \`are_anagrams(a, b)\` that returns True when the two phrases are anagrams of each other, **ignoring case and spaces**.

            \`\`\`python
            are_anagrams("Dormitory", "dirty room")  # True
            are_anagrams("abc", "abd")               # False
            \`\`\`
          `,
          starter: 'def are_anagrams(a, b):\n    pass\n',
          solution: py`
            def are_anagrams(a, b):
                a = a.lower().replace(" ", "")
                b = b.lower().replace(" ", "")
                return sorted(a) == sorted(b)
          `,
          tests: [
            { call: 'are_anagrams("Dormitory", "dirty room")', expect: 'True' },
            { call: 'are_anagrams("abc", "abd")', expect: 'False' },
            { call: 'are_anagrams("Listen", "Silent")', expect: 'True', hidden: true },
            { call: 'are_anagrams("aab", "abb")', expect: 'False', hidden: true },
            { call: 'are_anagrams("", "")', expect: 'True', hidden: true },
            { call: 'are_anagrams("Astronomer", "Moon starer")', expect: 'True', hidden: true },
            { call: 'are_anagrams("abc", "abcc")', expect: 'False', hidden: true },
          ],
          hints: [
            'Normalise both: `.lower().replace(" ", "")`.',
            'Then compare `sorted(a) == sorted(b)`.',
          ],
          wrong: [
            'def are_anagrams(a, b):\n    return sorted(a) == sorted(b)\n',
            py`
              def are_anagrams(a, b):
                  a = a.lower().replace(" ", "")
                  b = b.lower().replace(" ", "")
                  for ch in a:
                      if ch not in b:
                          return False
                  return len(a) == len(b)
            `,
          ],
          explain: 'Checking "every letter of a appears in b" plus equal length isn\'t enough: "aab" and "abb" would pass. Sorting compares the letters **and** how often each occurs. Grouping a list of words by this sorted signature ("group anagrams") is a top interview question you\'ll solve with a dict in Unit 6.',
        },
        {
          type: 'learn',
          title: 'The first unique character',
          body: md`
            \`s.count(ch)\` tells you how often \`ch\` occurs. To find the first character that appears **exactly once**, walk the string in order and return the first \`ch\` with \`s.count(ch) == 1\`.

            Simple, but every \`count\` scans the whole string, so the total cost is **O(n²)**: fine for a sentence, far too slow for a 10 MB log. A dict brings it down to O(n) (Unit 6). Mention that trade-off in an interview!
          `,
          code: py`
            s = "data"
            for ch in s:
                print(ch, s.count(ch))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            s = "swiss"
            for ch in s:
                if s.count(ch) == 1:
                    print(ch)
                    break
          `,
          options: ['w', 's', 'i', 'w\ni'],
          answer: 0,
          checkOutput: true,
          explain: '"s" appears three times. "w" is the first character with a count of 1, and `break` stops the loop before "i" is reached.',
        },
        {
          type: 'code',
          title: 'First unique character',
          prompt: md`
            Write \`first_unique(s)\` that returns the first character appearing **exactly once** in \`s\`, or \`None\` if there is none. Upper and lower case count as different characters.

            \`\`\`python
            first_unique("swiss")  # "w"
            first_unique("aabb")   # None
            \`\`\`
          `,
          starter: 'def first_unique(s):\n    pass\n',
          solution: py`
            def first_unique(s):
                for ch in s:
                    if s.count(ch) == 1:
                        return ch
                return None
          `,
          tests: [
            { call: 'first_unique("swiss")', expect: '"w"' },
            { call: 'first_unique("aabb")', expect: 'None' },
            { call: 'first_unique("")', expect: 'None', hidden: true },
            { call: 'first_unique("abcab")', expect: '"c"', hidden: true },
            { call: 'first_unique("Aa")', expect: '"A"', hidden: true },
            { call: 'first_unique("aabbc")', expect: '"c"', hidden: true },
          ],
          hints: [
            'Loop over `s` in order and check `s.count(ch) == 1`.',
            'Return as soon as you find one. Return `None` only after the loop.',
          ],
          wrong: [
            py`
              def first_unique(s):
                  for ch in s:
                      if s.count(ch) == 1:
                          return ch
                      else:
                          return None
            `,
            py`
              def first_unique(s):
                  result = None
                  for ch in s:
                      if s.count(ch) == 1:
                          result = ch
                  return result
            `,
            py`
              def first_unique(s):
                  s = s.lower()
                  for ch in s:
                      if s.count(ch) == 1:
                          return ch
                  return None
            `,
          ],
          explain: 'Returning early gives you the *first* match. Overwriting a variable gives you the *last*. Cost: n characters, each with a full `count` scan, so O(n²). The O(n) version counts every character once into a dict, then scans the string again (Unit 6).',
        },
        {
          type: 'learn',
          title: 'Characters are numbers: ord and chr',
          body: md`
            Every character has a numeric code: \`ord("a")\` is 97, and \`chr(98)\` is \`"b"\`. Letters are consecutive, so \`ord(ch) - ord("a")\` is a letter's position in the alphabet (0–25).

            Comparing strings compares these codes, so \`"a" <= ch <= "z"\` checks for a lower-case letter. Upper-case letters (65–90) come before lower-case ones.

            A **Caesar cipher** shifts letters: position → \`(pos + shift) % 26\` → back with \`chr\`. The \`% 26\` wraps "z" around to "a".
          `,
          code: py`
            print(ord("a"), ord("b"), chr(99))
            ch = "y"
            pos = ord(ch) - ord("a")
            print(pos, chr((pos + 3) % 26 + ord("a")))
          `,
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            print(ord("A"), chr(ord("A") + 2))
            print(chr((ord("z") - 97 + 1) % 26 + 97))
            print("b" < "a", "Z" < "a")
          `,
          answer: '65 C\na\nFalse True',
          explain: '"z" is position 25; 26 % 26 is 0, which is "a". And "Z" (90) < "a" (97): that\'s why `sorted` puts all capitalised words before lower-case ones.',
        },
        {
          type: 'code',
          title: 'Caesar cipher',
          prompt: md`
            Write \`caesar(text, shift)\` that shifts every letter by \`shift\` positions, wrapping around the alphabet. Lower-case letters stay lower-case, upper-case stay upper-case, and everything else (spaces, digits, punctuation) is unchanged. \`shift\` can be negative or bigger than 26.

            \`\`\`python
            caesar("abc xyz", 3)  # "def abc"
            caesar("Hello!", 13)  # "Uryyb!"
            \`\`\`
          `,
          starter: 'def caesar(text, shift):\n    pass\n',
          solution: py`
            def caesar(text, shift):
                out = ""
                for ch in text:
                    if "a" <= ch <= "z":
                        base = ord("a")
                    elif "A" <= ch <= "Z":
                        base = ord("A")
                    else:
                        out += ch
                        continue
                    pos = ord(ch) - base
                    out += chr((pos + shift) % 26 + base)
                return out
          `,
          tests: [
            { call: 'caesar("abc xyz", 3)', expect: '"def abc"' },
            { call: 'caesar("Hello!", 13)', expect: '"Uryyb!"' },
            { call: 'caesar("def", -3)', expect: '"abc"', hidden: true },
            { call: 'caesar("abc", 29)', expect: '"def"', hidden: true },
            { call: 'caesar("Zebra-42", 1)', expect: '"Afcsb-42"', hidden: true },
            { call: 'caesar(caesar("Secret Msg", 7), -7)', expect: '"Secret Msg"', hidden: true },
            { call: 'caesar("", 5)', expect: '""', hidden: true },
          ],
          hints: [
            'Loop over the characters and build a new string `out`.',
            'Pick a base: `ord("a")` for lower-case, `ord("A")` for upper-case. Any other character is added unchanged.',
            'The new letter is `chr((ord(ch) - base + shift) % 26 + base)`.',
          ],
          wrong: [
            py`
              def caesar(text, shift):
                  out = ""
                  for ch in text:
                      if ch.isalpha():
                          out += chr(ord(ch) + shift)
                      else:
                          out += ch
                  return out
            `,
            py`
              def caesar(text, shift):
                  out = ""
                  for ch in text:
                      if "a" <= ch <= "z":
                          pos = ord(ch) - ord("a")
                          out += chr((pos + shift) % 26 + 97)
                      else:
                          out += ch
                  return out
            `,
            py`
              def caesar(text, shift):
                  out = ""
                  for ch in text:
                      pos = ord(ch) - 97
                      out += chr((pos + shift) % 26 + 97)
                  return out
            `,
          ],
          explain: '`% 26` handles overflow **and** negative shifts: in Python `-1 % 26` is 25, so shifting "a" by -1 gives "z". Decoding is just `caesar(text, -shift)`. Not real security, but a classic warm-up that tests loops, `ord`/`chr` and modular arithmetic at once.',
        },
        {
          type: 'code',
          title: 'Run-length encoding',
          prompt: md`
            **Run-length encoding** compresses repeated characters: each run becomes the character followed by the length of the run. Write \`rle(s)\`:

            \`\`\`python
            rle("aaabccdddd")  # "a3b1c2d4"
            rle("abab")        # "a1b1a1b1"
            rle("")            # ""
            \`\`\`
          `,
          starter: 'def rle(s):\n    pass\n',
          solution: py`
            def rle(s):
                if s == "":
                    return ""
                out = ""
                count = 1
                for i in range(1, len(s)):
                    if s[i] == s[i - 1]:
                        count += 1
                    else:
                        out += s[i - 1] + str(count)
                        count = 1
                return out + s[-1] + str(count)
          `,
          tests: [
            { call: 'rle("aaabccdddd")', expect: '"a3b1c2d4"' },
            { call: 'rle("abab")', expect: '"a1b1a1b1"' },
            { call: 'rle("")', expect: '""' },
            { call: 'rle("a")', expect: '"a1"', hidden: true },
            { call: 'rle("zzzzzzzzzzzz")', expect: '"z12"', hidden: true },
            { call: 'rle("aaAA")', expect: '"a2A2"', hidden: true },
            { call: 'rle("xxyzzz y")', hidden: true },
          ],
          hints: [
            'Keep a `count` for the current run. Compare each character with the one before it: `s[i] == s[i - 1]`.',
            'When the character changes, add the previous character and its count to the result, then reset `count = 1`.',
            'After the loop the **last run** is still waiting to be added. Handle the empty string first.',
          ],
          wrong: [
            py`
              def rle(s):
                  out = ""
                  count = 1
                  for i in range(1, len(s)):
                      if s[i] == s[i - 1]:
                          count += 1
                      else:
                          out += s[i - 1] + str(count)
                          count = 1
                  return out
            `,
            py`
              def rle(s):
                  out = ""
                  for ch in s:
                      if ch not in out:
                          out += ch + str(s.count(ch))
                  return out
            `,
          ],
          explain: 'One pass, O(n). "Forgot the last group" is exactly the bug interviewers watch for, so trace a tiny input like "ab" by hand before saying you\'re done. RLE is used for real: columnar formats like Parquet compress long runs of repeated values this way.',
        },
      ],
    },

    // ------------------------------------------------------------------ L5
    {
      id: 'u04-l5',
      title: 'Regular Expressions',
      summary: 'Find, extract and replace text by pattern with the re module.',
      steps: [
        {
          type: 'learn',
          title: 'Patterns with re.search',
          body: md`
            A **regular expression** (regex) is a pattern that describes text. Python's \`re\` module searches with it.

            \`re.search(pattern, text)\` finds the **first** match and returns a match object, or \`None\`. \`.group()\` gives the matched text.

            Write patterns as **raw strings** \`r"..."\`, so backslashes reach \`re\` untouched. \`\d\` means "a digit" and \`+\` means "one or more", so \`\d+\` finds a number.
          `,
          code: py`
            import re
            m = re.search(r"\d+", "Order 66 shipped")
            print(m.group())
            print(re.search(r"\d+", "no digits here"))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import re
            m = re.search(r"\d+", "v2.14 build 2025")
            print(m.group())
          `,
          options: ['2', '2.14', '2025', '214'],
          answer: 0,
          checkOutput: true,
          explain: '`search` returns the **first** match. `\\d+` takes as many digits as it can, but "." isn\'t a digit, so the first match ends right after the "2".',
        },
        {
          type: 'learn',
          title: 'Character classes and quantifiers',
          body: md`
            | pattern | matches |
            |---|---|
            | \`\d\` \`\w\` \`\s\` | a digit, word char (letter, digit, _), whitespace |
            | \`\S\` | any non-whitespace char |
            | \`.\` | any char (\`\.\` is a real dot) |
            | \`[abc]\` \`[A-Z]\` \`[^0-9]\` | one of these, a range, anything **but** |
            | \`+\` \`*\` \`?\` | 1 or more, 0 or more, optional |
            | \`{3}\` \`{2,4}\` | exactly 3, 2 to 4 times |
            | \`^\` \`$\` | start, end of the text |

            Quantifiers are **greedy**: they grab as much as they can.
          `,
          code: py`
            import re
            t = "ticket hr-12 DE-404"
            print(re.search(r"[A-Z]{2}-\d{3}", t).group())
            print(re.search(r"colou?r", "a color").group())
            print(bool(re.search(r"^\d+$", "2025a")))
          `,
        },
        {
          type: 'choice',
          prompt: 'What does this print?',
          code: py`
            import re
            m = re.search(r"[A-Z]\d+", "id a7 B12 C3")
            print(m.group())
          `,
          options: ['B12', 'a7', 'B1', 'C3'],
          answer: 0,
          checkOutput: true,
          explain: '`[A-Z]` needs an upper-case letter, so "a7" doesn\'t match. Then `\\d+` is greedy and takes both digits: "B12".',
        },
        {
          type: 'choice',
          prompt: 'Greedy quantifiers: what does this print?',
          code: py`
            import re
            m = re.search(r"<.+>", "<a><b>")
            print(m.group())
          `,
          options: ['<a><b>', '<a>', '<b>', 'a><b'],
          answer: 0,
          checkOutput: true,
          explain: '`.+` grabs everything it can and only gives back as much as needed for the final `>` to match, so it spans from the first `<` to the **last** `>`. To stop early, use a narrower class: `<[^>]+>` means "anything except `>`".',
        },
        {
          type: 'learn',
          title: 'findall and sub',
          body: md`
            - \`re.findall(pattern, text)\` returns a **list of all** matches (an empty list if there are none).
            - \`re.sub(pattern, repl, text)\` returns a new string with **every** match replaced by \`repl\`.

            Together they cover most everyday text extraction and cleaning.
          `,
          code: py`
            import re
            text = "Paid 12.50, then 3.99 and 100.00"
            print(re.findall(r"\d+\.\d\d", text))
            print(re.sub(r"\d", "#", "Card 4111 1111"))
            print(re.sub(r"\s+", " ", "too    many   spaces"))
          `,
        },
        {
          type: 'output',
          prompt: 'Type both lines.',
          code: py`
            import re
            print(re.findall(r"[A-Z]{2}", "DE, us, FR and HRV"))
            print(re.findall(r"\d+", "no numbers"))
          `,
          answer: "['DE', 'FR', 'HR']\n[]",
          explain: '"us" is lower-case, so it doesn\'t match. Inside "HRV" the first two capitals match ("HR"), and the leftover "V" alone can\'t. No match at all gives an empty list, not None.',
        },
        {
          type: 'blanks',
          prompt: 'Extract the prices (digits, a dot, two digits) so the program prints `[\'12.50\']`.',
          code: py`
            import re
            text = "Paid 12.50 for 3 items, ref 20251"
            prices = re.___(r"\d+___\d{2}", text)
            print(prices)
          `,
          bank: ['findall', 'search', 'sub', '\\.', '.', '\\d'],
          answer: ['findall', '\\.'],
          tests: [{ stdout: "['12.50']\n" }],
          explain: 'An unescaped `.` matches **any** character, so the reference number "20251" would match too. `\\.` means a literal dot. `search` would return a single match object, not a list.',
        },
        {
          type: 'code',
          title: 'Extract hashtags',
          prompt: md`
            Write \`hashtags(post)\` that returns a list of all hashtags in a social media post, in order. A hashtag is \`#\` followed by one or more word characters (letters, digits, \`_\`).

            \`\`\`python
            hashtags("Loving #Python and #big_data!")
            # ['#Python', '#big_data']
            \`\`\`
          `,
          starter: 'import re\n\ndef hashtags(post):\n    pass\n',
          solution: py`
            import re

            def hashtags(post):
                return re.findall(r"#\w+", post)
          `,
          tests: [
            { call: 'hashtags("Loving #Python and #big_data!")', expect: '["#Python", "#big_data"]' },
            { call: 'hashtags("no tags here")', expect: '[]' },
            { call: 'hashtags("#a#b")', expect: '["#a", "#b"]', hidden: true },
            { call: 'hashtags("Top #10 tips for #2025")', expect: '["#10", "#2025"]', hidden: true },
            { call: 'hashtags("# not a tag, but #ok.")', expect: '["#ok"]', hidden: true },
          ],
          hints: [
            md`\`\w\` matches one word character and \`+\` means one or more.`,
            md`\`re.findall(r"#\w+", post)\` returns the list directly.`,
          ],
          wrong: [
            py`
              import re

              def hashtags(post):
                  return re.findall(r"#\w", post)
            `,
            py`
              import re

              def hashtags(post):
                  return re.findall(r"#\S+", post)
            `,
            py`
              import re

              def hashtags(post):
                  return re.findall(r"#[a-z]+", post)
            `,
          ],
          explain: '`\\w+` stops at the first character that isn\'t a letter, digit or underscore, which is why "!" and "." are left out (`\\S+` would include them). Counting hashtags across billions of posts is the textbook first big-data job: the "word count" of MapReduce.',
        },
        {
          type: 'learn',
          title: 'Groups: capture the parts you need',
          body: md`
            Parentheses make a **group**. The whole pattern must match, but you can pull out just the parts:

            - \`m.group(1)\`, \`m.group(2)\`: groups, numbered from 1 (\`group(0)\` is the whole match)
            - \`m.groups()\`: all groups as a tuple
            - With groups, \`findall\` returns the groups instead of the whole match

            That's how you turn a web-server log line into fields:
          `,
          code: py`
            import re
            line = ('203.0.113.5 - - [12/Nov/2025:09:00:40'
                    + ' +0000] "POST /api/checkout HTTP/1.1"'
                    + ' 200 8940 0.137')
            m = re.search(r'"(\w+) (\S+) [^"]*" (\d{3})', line)
            print(m.groups())
            print(m.group(2), int(m.group(3)))
          `,
        },
        {
          type: 'output',
          prompt: 'Type the three lines.',
          code: py`
            import re
            pat = r"(\d{4})-(\d{2})-(\d{2})"
            m = re.search(pat, "due 2025-11-12!")
            print(m.group(3) + "/" + m.group(2))
            print(m.group(0))
            print(re.findall(r"(\w+)=(\d+)", "a=1 b=22"))
          `,
          answer: "12/11\n2025-11-12\n[('a', '1'), ('b', '22')]",
          explain: 'Groups count from 1 in the order of their opening parentheses, and `group(0)` is the whole match. With two groups, `findall` returns a list of **tuples**, one per match.',
        },
        {
          type: 'code',
          kind: 'fix',
          title: 'Fix: receipt total',
          prompt: md`
            \`total_spent(receipt)\` should add up every euro amount in a receipt, like \`€12.50\`. Amounts always have two decimals. Numbers without a \`€\` (quantities, weights, years) must be ignored. It returns the total rounded to 2 decimals.

            \`\`\`python
            total_spent("2x coffee €3.20, cake €4.50")  # 7.7
            \`\`\`

            It crashes. Fix it with a **group**.
          `,
          starter: py`
            import re

            def total_spent(receipt):
                total = 0
                pat = r"€\d+\.\d{2}"
                for amount in re.findall(pat, receipt):
                    total += float(amount)
                return round(total, 2)
          `,
          solution: py`
            import re

            def total_spent(receipt):
                total = 0
                pat = r"€(\d+\.\d{2})"
                for amount in re.findall(pat, receipt):
                    total += float(amount)
                return round(total, 2)
          `,
          tests: [
            { call: 'total_spent("2x coffee €3.20, cake €4.50")', expect: '7.7' },
            { call: 'total_spent("no prices")', expect: '0' },
            { call: 'total_spent("Order 2025: €100.00 + €0.99 tip")', expect: '100.99', hidden: true },
            { call: 'total_spent("€1.10 €2.20 €3.30")', expect: '6.6', hidden: true },
            { call: 'total_spent("weight 1.25kg, €5.00")', expect: '5.0', hidden: true },
          ],
          hints: [
            'Read the error: `float("€3.20")` fails because the euro sign is part of each match.',
            md`Wrap the number part in parentheses: \`r"€(\d+\.\d{2})"\`. Now \`findall\` returns only the group.`,
          ],
          wrong: [
            py`
              import re

              def total_spent(receipt):
                  total = 0
                  pat = r"\d+\.\d{2}"
                  for amount in re.findall(pat, receipt):
                      total += float(amount)
                  return round(total, 2)
            `,
          ],
          explain: 'With one group, `findall` returns just the captured text: the `€` still has to be there (that\'s what makes it a price) but it isn\'t returned. Slicing off the first character (`amount[1:]`) works too, but the group says what you mean. Dropping the `€` from the pattern would also count "1.25kg".',
        },
        {
          type: 'code',
          title: 'Parse a server log line',
          prompt: md`
            Lines in \`server.log\` look like this:

            \`\`\`
            203.0.113.5 - - [12/Nov/2025:09:00:40 +0000] "POST /api/checkout HTTP/1.1" 200 8940 0.137
            \`\`\`

            Write \`parse_log(line)\` that returns a tuple \`(ip, method, path, status)\` with \`status\` as an **int**:
            \`("203.0.113.5", "POST", "/api/checkout", 200)\`.

            Return \`None\` for lines that don't match the format.
          `,
          starter: 'import re\n\ndef parse_log(line):\n    pass\n',
          solution: py`
            import re

            def parse_log(line):
                pat = r'^(\S+) .*"(\w+) (\S+) [^"]*" (\d{3})'
                m = re.search(pat, line)
                if not m:
                    return None
                ip, method, path, status = m.groups()
                return ip, method, path, int(status)
          `,
          setup: py`
            L2 = ('198.51.100.29 - - [12/Nov/2025:09:02:42 +0000] '
                  '"GET /api/products HTTP/1.1" 404 1893 0.083')
            L3 = ('10.0.0.7 - - [12/Nov/2025:23:59:59 +0000] '
                  '"DELETE /api/cart/7 HTTP/1.1" 503 0 1.250')
            L4 = ('203.0.113.53 - - [12/Nov/2025:09:01:47 +0000] '
                  '"GET /search?q=python HTTP/1.1" 200 1712 0.054')
          `,
          tests: [
            {
              call: 'parse_log(\'203.0.113.5 - - [12/Nov/2025:09:00:40 +0000] "POST /api/checkout HTTP/1.1" 200 8940 0.137\')',
              expect: '("203.0.113.5", "POST", "/api/checkout", 200)',
              name: 'parses the POST /api/checkout line',
            },
            { call: 'parse_log("not a log line")', expect: 'None' },
            { call: 'parse_log(L2)', expect: '("198.51.100.29", "GET", "/api/products", 404)', name: 'a 404 line', hidden: true },
            { call: 'parse_log(L3)', name: 'a DELETE line with a 503', hidden: true },
            { call: 'parse_log(L4)', name: 'a path with a query string', hidden: true },
            { call: 'parse_log("")', expect: 'None', hidden: true },
          ],
          hints: [
            'Use four groups: the IP at the very start, then the method and the path inside the quotes, then the 3-digit status after the closing quote.',
            md`Try \`r'^(\S+) .*"(\w+) (\S+) [^"]*" (\d{3})'\`.`,
            'If `re.search` returns `None`, return `None` (a guard clause). Otherwise unpack `m.groups()` and convert the status with `int()`.',
          ],
          wrong: [
            py`
              import re

              def parse_log(line):
                  pat = r'^(\S+) .*"(\w+) (\S+) [^"]*" (\d{3})'
                  m = re.search(pat, line)
                  if not m:
                      return None
                  return m.groups()
            `,
            py`
              def parse_log(line):
                  p = line.split()
                  return p[0], p[5][1:], p[6], int(p[8])
            `,
            py`
              import re

              def parse_log(line):
                  pat = r'^(\S+) .*"(\w+) (\S+).*(\d{3})'
                  m = re.search(pat, line)
                  if not m:
                      return None
                  ip, method, path, status = m.groups()
                  return ip, method, path, int(status)
            `,
          ],
          explain: '`^` makes sure the IP really is the first field, and `[^"]*"` skips the protocol without leaving the quotes. A loose `.*(\\d{3})` would grab the last three digits on the line (from "0.137"), a silent bug, which is worse than a crash. Log-ingestion jobs do exactly this to turn raw text into rows; next you\'d count statuses per path with a dict (Unit 6) or load the rows into pandas.',
        },
      ],
    },
  ],

  // ------------------------------------------------------------------ Exam
  exam: {
    id: 'u04-exam',
    title: 'Strings & Text Exam',
    minutes: 25,
    intro: 'Slicing, string methods, split/join, text algorithms and regular expressions, combined the way interviewers combine them. No hints, no feedback until you submit.',
    questions: [
      {
        type: 'choice',
        prompt: 'What does this print?',
        code: py`
          s = "interview"
          print(s[2:7:2] + s[-1])
        `,
        options: ['triw', 'tew', 'terw', 'triv'],
        answer: 0,
        checkOutput: true,
        explain: 'Indexes 2, 4 and 6 are t, r, i (7 is excluded). `s[-1]` is "w".',
      },
      {
        type: 'output',
        prompt: 'Type exactly what this prints.',
        code: py`
          s = "  Data,Science, ML "
          parts = s.strip().lower().split(",")
          print(len(parts), parts[1].title())
          print("|".join(parts))
        `,
        answer: '3 Science\ndata|science| ml',
        explain: 'The methods run left to right: strip, lower, then split into `["data", "science", " ml"]`. `title()` only changes the printed copy of "science". The third piece keeps its leading space because `split(",")` only splits; it never strips.',
      },
      {
        type: 'choice',
        prompt: 'With `s = "abc"`, which expression raises an error?',
        options: ['s[3]', 's[3:]', 's[-3]', 's.find("z")'],
        answer: 0,
        explain: 'Indexing past the end raises IndexError. Slices are clipped (`s[3:]` is ""), `s[-3]` is "a", and `find` returns -1.',
      },
      {
        type: 'output',
        prompt: 'Type the three lines.',
        code: py`
          import re
          t = "a1b22c333"
          print(re.findall(r"\d+", t))
          print(re.sub(r"\d", "", t))
          print(len(re.findall(r"\d", t)))
        `,
        answer: "['1', '22', '333']\nabc\n6",
        explain: '`\\d+` groups consecutive digits into one match, while `\\d` matches each digit alone (6 of them). `sub` with "" deletes every match.',
      },
      {
        type: 'blanks',
        prompt: 'Complete `shift(ch)`, which moves a lower-case letter one step forward and wraps "z" to "a".',
        code: py`
          def shift(ch):
              pos = ord(ch) - ord("a")
              return ___((pos + 1) ___ 26 + ord("a"))
        `,
        bank: ['chr', '%', 'ord', '//', 'str', '+'],
        answer: ['chr', '%'],
        tests: [
          { call: 'shift("z")', expect: '"a"' },
          { call: 'shift("c")', expect: '"d"' },
        ],
        explain: '`% 26` wraps position 26 back to 0, and `chr` turns the code back into a character.',
      },
      {
        type: 'order',
        prompt: 'Arrange the lines into `count_long(text, n)`, which returns how many words in `text` are longer than `n` characters.',
        lines: [
          'def count_long(text, n):',
          '    count = 0',
          '    for word in text.split():',
          '        if len(word) > n:',
          '            count += 1',
          '    return count',
        ],
        distractors: ['    for word in text:', '        return count'],
        tests: [
          { call: 'count_long("big data is big", 2)', expect: '3' },
          { call: 'count_long("", 1)', expect: '0' },
        ],
        explain: 'Looping over `text` directly would give characters, not words. The `return` belongs after the loop, at function level.',
      },
      {
        type: 'code',
        title: 'String rotation',
        prompt: md`
          Write \`is_rotation(a, b)\` that returns True if \`b\` is a **rotation** of \`a\`: you get it by moving some characters from the front of \`a\` to the back. Every string is a rotation of itself.

          \`\`\`python
          is_rotation("waterbottle", "erbottlewat")  # True
          is_rotation("abc", "acb")                  # False
          \`\`\`
        `,
        starter: 'def is_rotation(a, b):\n    pass\n',
        solution: py`
          def is_rotation(a, b):
              return len(a) == len(b) and b in a + a
        `,
        tests: [
          { call: 'is_rotation("waterbottle", "erbottlewat")', expect: 'True' },
          { call: 'is_rotation("abc", "acb")', expect: 'False' },
          { call: 'is_rotation("", "")', expect: 'True', hidden: true },
          { call: 'is_rotation("ab", "a")', expect: 'False', hidden: true },
          { call: 'is_rotation("abcd", "cdab")', expect: 'True', hidden: true },
          { call: 'is_rotation("abcd", "abcd")', expect: 'True', hidden: true },
          { call: 'is_rotation("aa", "aaa")', expect: 'False', hidden: true },
        ],
        wrong: [
          'def is_rotation(a, b):\n    return b in a + a\n',
          'def is_rotation(a, b):\n    return sorted(a) == sorted(b)\n',
          py`
            def is_rotation(a, b):
                for i in range(len(a)):
                    if a[i:] + a[:i] == b:
                        return True
                return False
          `,
        ],
        explain: 'Every rotation of `a` appears inside `a + a` ("waterbottlewaterbottle" contains "erbottlewat"). The length check rules out shorter substrings like "a". The loop version tries all n rotations and builds an n-character string each time, O(n²), and it misses the empty string.',
      },
      {
        type: 'code',
        title: 'Validate an IPv4 address',
        prompt: md`
          Write \`is_valid_ipv4(s)\` that returns True for a valid IPv4 address: exactly **4 parts** separated by dots, each part only digits with a value from **0 to 255**, and **no leading zeros** ("0" is fine, "01" is not).

          \`\`\`python
          is_valid_ipv4("192.168.0.1")  # True
          is_valid_ipv4("256.1.1.1")    # False
          is_valid_ipv4("1.2.3")        # False
          is_valid_ipv4("01.2.3.4")     # False
          \`\`\`
        `,
        starter: 'def is_valid_ipv4(s):\n    pass\n',
        solution: py`
          def is_valid_ipv4(s):
              parts = s.split(".")
              if len(parts) != 4:
                  return False
              for p in parts:
                  if not p.isdigit():
                      return False
                  if len(p) > 1 and p[0] == "0":
                      return False
                  if int(p) > 255:
                      return False
              return True
        `,
        tests: [
          { call: 'is_valid_ipv4("192.168.0.1")', expect: 'True' },
          { call: 'is_valid_ipv4("256.1.1.1")', expect: 'False' },
          { call: 'is_valid_ipv4("1.2.3")', expect: 'False' },
          { call: 'is_valid_ipv4("01.2.3.4")', expect: 'False' },
          { call: 'is_valid_ipv4("0.0.0.0")', expect: 'True', hidden: true },
          { call: 'is_valid_ipv4("255.255.255.255")', expect: 'True', hidden: true },
          { call: 'is_valid_ipv4("1.2.3.4.5")', expect: 'False', hidden: true },
          { call: 'is_valid_ipv4("1..2.3")', expect: 'False', hidden: true },
          { call: 'is_valid_ipv4("a.b.c.d")', expect: 'False', hidden: true },
          { call: 'is_valid_ipv4("1.2.3.-4")', expect: 'False', hidden: true },
          { call: 'is_valid_ipv4("1.2.3.4 ")', expect: 'False', hidden: true },
          { call: 'is_valid_ipv4("")', expect: 'False', hidden: true },
        ],
        wrong: [
          py`
            def is_valid_ipv4(s):
                parts = s.split(".")
                if len(parts) != 4:
                    return False
                for p in parts:
                    if not p.isdigit() or int(p) > 255:
                        return False
                return True
          `,
          py`
            def is_valid_ipv4(s):
                parts = s.split(".")
                if len(parts) != 4:
                    return False
                for p in parts:
                    if not p.isdigit():
                        return False
                    if len(p) > 1 and p[0] == "0":
                        return False
                    if int(p) >= 255:
                        return False
                return True
          `,
          py`
            def is_valid_ipv4(s):
                parts = s.split(".")
                for p in parts:
                    if not p.isdigit():
                        return False
                    if len(p) > 1 and p[0] == "0":
                        return False
                    if int(p) > 255:
                        return False
                return True
          `,
        ],
        explain: 'Guard clauses keep each rule on its own line: count the parts, then for every part check digits, leading zeros and range. `isdigit()` must come before `int()`, so "a" or "" never reaches the conversion, and it also rejects "-4" and "4 ". Edge cases like "255" vs "256" and "0" vs "01" are where most candidates lose points.',
      },
      {
        type: 'code',
        title: 'Find the failing endpoints',
        prompt: md`
          \`log\` is the text of a web-server log: lines in the \`server.log\` format, separated by \`"\n"\`:

          \`\`\`
          1.2.3.4 - - [12/Nov/2025:09:00:40 +0000] "GET /api/cart HTTP/1.1" 503 0 1.2
          \`\`\`

          Write \`error_paths(log)\` that returns a **list of the request paths** whose status code is a server error (**500–599**), in the order they appear. Watch out: "500" can also appear inside a path or as the byte count.
        `,
        starter: 'import re\n\ndef error_paths(log):\n    pass\n',
        solution: py`
          import re

          def error_paths(log):
              pat = r'"\w+ (\S+) [^"]*" 5\d\d '
              return re.findall(pat, log)
        `,
        setup: py`
          LOG = "\n".join([
              '203.0.113.5 - - [12/Nov/2025:09:00:40 +0000] "POST /api/checkout HTTP/1.1" 500 8940 0.137',
              '203.0.113.24 - - [12/Nov/2025:09:01:19 +0000] "GET /api/products/500 HTTP/1.1" 200 5004 0.049',
              '203.0.113.53 - - [12/Nov/2025:09:01:47 +0000] "GET /search?q=python HTTP/1.1" 404 1712 0.054',
              '203.0.113.53 - - [12/Nov/2025:09:02:11 +0000] "GET / HTTP/1.1" 503 512 0.038',
              '198.51.100.29 - - [12/Nov/2025:09:02:42 +0000] "GET /api/products HTTP/1.1" 200 500 0.083',
              '198.51.100.7 - - [12/Nov/2025:09:03:00 +0000] "DELETE /api/cart/7 HTTP/1.1" 502 0 2.001',
          ])
          OK_LOG = "\n".join([
              '10.0.0.1 - - [12/Nov/2025:10:00:00 +0000] "GET /a HTTP/1.1" 200 500 0.010',
              '10.0.0.2 - - [12/Nov/2025:10:00:01 +0000] "GET /b HTTP/1.1" 404 51 0.020',
          ])
        `,
        tests: [
          {
            call: 'error_paths(\'1.2.3.4 - - [12/Nov/2025:09:00:40 +0000] "GET /api/cart HTTP/1.1" 503 0 1.2\\n1.2.3.4 - - [12/Nov/2025:09:00:41 +0000] "GET /home HTTP/1.1" 200 90 0.1\')',
            expect: '["/api/cart"]',
            name: 'two lines, one 503',
          },
          { call: 'error_paths(LOG)', expect: '["/api/checkout", "/", "/api/cart/7"]', name: 'a log with 500, 503 and 502 errors', hidden: true },
          { call: 'error_paths(OK_LOG)', expect: '[]', name: 'no server errors', hidden: true },
          { call: 'error_paths("")', expect: '[]', hidden: true },
        ],
        wrong: [
          py`
            import re

            def error_paths(log):
                pat = r'"\w+ (\S+) .* 5\d\d'
                return re.findall(pat, log)
          `,
          py`
            import re

            def error_paths(log):
                pat = r'"\w+ (\S+) [^"]*" (5\d\d)'
                return re.findall(pat, log)
          `,
          py`
            import re

            def error_paths(log):
                return re.findall(r"(/\S*) .*5\d\d", log)
          `,
        ],
        explain: 'The status is the number right after the closing quote, so anchor on `" 5\\d\\d `. Exactly one group makes `findall` return plain path strings; two groups would return tuples. A loose `.* 5\\d\\d` matches a byte count of 500 or a path like /products/500, a classic silent data-quality bug. `.` never crosses a newline, so each match stays within its own line.',
      },
    ],
  },
};

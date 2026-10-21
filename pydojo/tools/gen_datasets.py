"""Generate the deterministic practice datasets in ../data/.

Run:  python3 tools/gen_datasets.py
Every file is reproducible (fixed seed), so lesson answers never drift.
"""
import csv
import math
import os
import random
from datetime import date, datetime, timedelta

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
rng = random.Random(2025)

FIRST = ["Ana", "Luka", "Mia", "Ivan", "Sara", "Marko", "Ema", "Petar", "Lea", "Josip",
         "Emma", "Noah", "Olivia", "Liam", "Sophia", "Lucas", "Mila", "Leon", "Hana", "Max",
         "Chloe", "Ben", "Nina", "Tom", "Iris", "Jan", "Eva", "David", "Lena", "Felix"]
LAST = ["Horvat", "Kovac", "Babic", "Novak", "Mueller", "Schmidt", "Smith", "Jones", "Martin",
        "Garcia", "Rossi", "Bianchi", "Dubois", "Moreau", "Jansen", "Visser", "Silva", "Lopez"]
COUNTRIES = ["DE", "US", "FR", "HR", "UK", "ES", "IT", "NL"]
COUNTRY_W = [22, 25, 12, 8, 12, 8, 7, 6]


def write_csv(name, header, rows):
    with open(os.path.join(OUT, name), "w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)
    print(f"{name}: {len(rows)} rows")


def users():
    rows = []
    start = date(2024, 6, 1)
    for uid in range(1, 301):
        signup = start + timedelta(days=rng.randrange(0, 579))
        country = rng.choices(COUNTRIES, COUNTRY_W)[0]
        plan = rng.choices(["free", "pro", "team"], [70, 22, 8])[0]
        age = rng.randint(18, 70) if rng.random() > 0.06 else ""
        ref = rng.choices(["ads", "organic", "friend", "social", ""], [30, 35, 15, 15, 5])[0]
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        rows.append([uid, name, signup.isoformat(), country, plan, age, ref])
    write_csv("users.csv", ["user_id", "name", "signup_date", "country", "plan", "age", "referrer"], rows)
    return rows


PRODUCTS = {
    "Electronics": [("Headphones", 59.9), ("Keyboard", 79.0), ("Monitor", 189.0), ("USB Cable", 9.5), ("Webcam", 49.0)],
    "Books": [("Python Crash Course", 32.0), ("Data Science Handbook", 45.0), ("Novel", 14.9), ("Cookbook", 24.5)],
    "Home": [("Lamp", 35.0), ("Mug", 8.9), ("Pillow", 19.9), ("Plant Pot", 12.5)],
    "Sports": [("Yoga Mat", 25.0), ("Dumbbells", 39.9), ("Water Bottle", 11.0), ("Running Shoes", 89.0)],
    "Toys": [("Puzzle", 17.5), ("Board Game", 34.0), ("Lego Set", 59.0)],
    "Grocery": [("Coffee Beans", 13.9), ("Olive Oil", 11.5), ("Tea", 6.5), ("Chocolate", 3.9)],
}
CAT_W = {"Electronics": 18, "Books": 16, "Home": 18, "Sports": 14, "Toys": 9, "Grocery": 25}


def orders(user_rows):
    rows = []
    oid = 1001
    d0 = date(2025, 1, 1)
    cats = list(CAT_W)
    for _ in range(1200):
        day = d0 + timedelta(days=rng.randrange(0, 365))
        # more orders in November/December
        if day.month < 11 and rng.random() < 0.18:
            day = date(2025, rng.choice([11, 12]), rng.randint(1, 28))
        u = rng.choice(user_rows)
        cat = rng.choices(cats, [CAT_W[c] for c in cats])[0]
        prod, price = rng.choice(PRODUCTS[cat])
        qty = rng.choices([1, 2, 3, 4, 5], [55, 25, 10, 6, 4])[0]
        status = rng.choices(["completed", "cancelled", "returned"], [88, 7, 5])[0]
        rows.append([oid, u[0], day.isoformat(), prod, cat, qty, f"{price:.2f}", u[3], status])
        oid += 1
    rows.sort(key=lambda r: (r[2], r[0]))
    for i, r in enumerate(rows):
        r[0] = 1001 + i
    write_csv("orders.csv", ["order_id", "user_id", "order_date", "product", "category", "quantity",
                             "unit_price", "country", "status"], rows)


def events():
    rows = []
    t0 = datetime(2025, 11, 1)
    funnel = ["page_view", "search", "add_to_cart", "checkout", "purchase"]
    cont = [0.75, 0.55, 0.5, 0.7]  # chance to continue to the next step
    for _ in range(620):
        uid = rng.randint(1, 300)
        device = rng.choices(["mobile", "desktop", "tablet"], [55, 38, 7])[0]
        t = t0 + timedelta(days=rng.randrange(0, 30), hours=rng.randint(6, 23), minutes=rng.randint(0, 59),
                           seconds=rng.randint(0, 59))
        n = 1
        boost = 0.08 if device == "desktop" else 0.0
        while n < len(funnel) and rng.random() < cont[n - 1] + boost:
            n += 1
        for step in funnel[:n]:
            rows.append([uid, t.strftime("%Y-%m-%d %H:%M:%S"), step, device])
            # extra page views inside a session
            if step == "page_view":
                for _ in range(rng.choices([0, 1, 2], [60, 30, 10])[0]):
                    t += timedelta(seconds=rng.randint(10, 240))
                    rows.append([uid, t.strftime("%Y-%m-%d %H:%M:%S"), "page_view", device])
            t += timedelta(seconds=rng.randint(15, 600))
    rows.sort(key=lambda r: (r[1], r[0]))
    write_csv("events.csv", ["user_id", "ts", "event", "device"], rows)


def ab_test():
    rows = []
    for uid in range(1, 3001):
        group = "treatment" if rng.random() < 0.5 else "control"
        device = rng.choices(["mobile", "desktop"], [60, 40])[0]
        p = 0.10 if group == "control" else 0.122
        if device == "desktop":
            p += 0.02
        conv = 1 if rng.random() < p else 0
        revenue = round(rng.lognormvariate(3.4, 0.5), 2) if conv else 0.0
        rows.append([uid, group, device, conv, f"{revenue:.2f}"])
    write_csv("ab_test.csv", ["user_id", "group", "device", "converted", "revenue"], rows)


def server_log():
    paths = ["/", "/login", "/api/products", "/api/products/{id}", "/api/cart", "/api/checkout", "/static/app.js",
             "/static/style.css", "/search?q={q}"]
    weights = [10, 6, 18, 20, 9, 4, 12, 8, 13]
    qs = ["python", "laptop", "mug", "data", "shoes", "tea"]
    ips = [f"203.0.113.{rng.randint(1, 60)}" for _ in range(25)] + [f"198.51.100.{rng.randint(1, 30)}" for _ in range(8)]
    t = datetime(2025, 11, 12, 9, 0, 0)
    lines = []
    for _ in range(600):
        t += timedelta(seconds=rng.randint(1, 50))
        p = rng.choices(paths, weights)[0].replace("{id}", str(rng.randint(1, 40))).replace("{q}", rng.choice(qs))
        method = "POST" if p in ("/login", "/api/cart", "/api/checkout") and rng.random() < 0.7 else "GET"
        status = rng.choices([200, 201, 304, 400, 404, 500, 503], [70, 4, 8, 4, 7, 5, 2])[0]
        if p.startswith("/static") and status >= 500:
            status = 200
        size = 0 if status == 304 else rng.randint(120, 9000)
        rt = round(rng.lognormvariate(-3.2, 0.7) + (0.8 if status >= 500 else 0), 3)
        lines.append(f'{rng.choice(ips)} - - [{t.strftime("%d/%b/%Y:%H:%M:%S")} +0000] "{method} {p} HTTP/1.1" '
                     f"{status} {size} {rt}")
    with open(os.path.join(OUT, "server.log"), "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"server.log: {len(lines)} lines")


def weather():
    rows = []
    cities = {"Zagreb": (12.0, 11.0), "Berlin": (10.0, 9.5), "Madrid": (15.5, 9.0)}
    for i in range(365):
        d = date(2025, 1, 1) + timedelta(days=i)
        season = -math.cos(2 * math.pi * (i - 15) / 365)
        for city, (mean, amp) in cities.items():
            temp = round(mean + amp * season + rng.gauss(0, 2.4), 1)
            rain = round(rng.expovariate(1 / 4.0), 1) if rng.random() < (0.33 if city != "Madrid" else 0.18) else 0.0
            rows.append([d.isoformat(), city, temp, rain])
    write_csv("weather.csv", ["date", "city", "temp_c", "rain_mm"], rows)


def stocks():
    rows = []
    tick = {"PYDJ": (120.0, 0.0006, 0.016), "DATA": (48.0, 0.0002, 0.022), "BIGQ": (310.0, 0.0009, 0.012)}
    d = date(2025, 1, 2)
    prices = {k: v[0] for k, v in tick.items()}
    days = 0
    while days < 250:
        if d.weekday() < 5:
            for k, (_, mu, sig) in tick.items():
                prices[k] *= math.exp(rng.gauss(mu, sig))
                vol = int(rng.lognormvariate(13.5, 0.35))
                rows.append([d.isoformat(), k, f"{prices[k]:.2f}", vol])
            days += 1
        d += timedelta(days=1)
    write_csv("stocks.csv", ["date", "ticker", "close", "volume"], rows)


def customers_messy():
    rows = []
    variants = {"DE": ["Germany", "germany", "DE", " Germany "], "HR": ["Croatia", "HR", "croatia"],
                "US": ["USA", "United States", "us", "US"], "FR": ["France", "FR", "france "]}
    for cid in range(1, 121):
        key = rng.choice(list(variants))
        first, last = rng.choice(FIRST), rng.choice(LAST)
        name = rng.choice([f"{first} {last}", f"{first.lower()} {last.lower()}", f"  {first} {last}",
                           f"{first.upper()} {last}"])
        email = f"{first.lower()}.{last.lower()}@example.com"
        r = rng.random()
        if r < 0.07:
            email = ""
        elif r < 0.12:
            email = email.replace("@", "")
        spend = rng.choice([f"{rng.uniform(5, 2500):.2f}", f"€{rng.uniform(5, 2500):,.2f}", ""]) \
            if rng.random() < 0.92 else "n/a"
        signup = date(2024, 1, 1) + timedelta(days=rng.randrange(0, 640))
        rows.append([cid, name, email, rng.choice(variants[key]), signup.isoformat(), spend])
    for i in rng.sample(range(len(rows)), 8):  # exact duplicate rows
        rows.append(list(rows[i]))
    write_csv("customers_messy.csv", ["customer_id", "name", "email", "country", "signup_date", "spend"], rows)


def company():
    depts = [(1, "Engineering", "Berlin"), (2, "Data", "Zagreb"), (3, "Sales", "London"),
             (4, "Marketing", "Paris"), (5, "Support", "Zagreb")]
    write_csv("departments.csv", ["dept_id", "dept_name", "location"], depts)
    rows = []
    base = {1: 78000, 2: 72000, 3: 56000, 4: 52000, 5: 41000}
    eid = 1
    managers = {}
    for dept_id, _, _ in depts:
        n = {1: 12, 2: 9, 3: 8, 4: 6, 5: 7}[dept_id]
        for j in range(n):
            name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
            if j == 0:
                managers[dept_id] = eid
                mgr = ""
                salary = base[dept_id] * 1.6
            else:
                mgr = managers[dept_id]
                salary = base[dept_id] * rng.uniform(0.75, 1.35)
            hired = date(2016, 1, 1) + timedelta(days=rng.randrange(0, 3500))
            rows.append([eid, name, dept_id, mgr, int(round(salary, -2)), hired.isoformat()])
            eid += 1
    rows.append([eid, "Robin Contractor", "", "", 60000, "2025-03-01"])  # no department -> LEFT JOIN practice
    write_csv("employees.csv", ["emp_id", "name", "dept_id", "manager_id", "salary", "hire_date"], rows)


TEXT = """Data is everywhere. Every click, every search and every purchase leaves a small trace of data.
Companies that work with big data collect these traces from millions of users every day.
To make sense of so much data, engineers write programs that read the data, clean the data and count things.
Python is a popular language for this work because Python code is short, readable and powerful.
A data engineer builds pipelines that move data from one system to another system.
A data scientist asks questions, builds models and explains the answers with numbers and charts.
Both need to think clearly about time, memory and correctness.
A program that works for one thousand rows might be far too slow for one billion rows.
That is why we learn about algorithms, about streaming data and about splitting big work into small pieces.
Map the data, shuffle the data, reduce the data: this simple idea powers many big data systems.
Start small, test often and let the computer do the boring work.
"""


def words():
    with open(os.path.join(OUT, "words.txt"), "w") as f:
        f.write(TEXT)
    print(f"words.txt: {len(TEXT.split())} words")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    u = users()
    orders(u)
    events()
    ab_test()
    server_log()
    weather()
    stocks()
    customers_messy()
    company()
    words()

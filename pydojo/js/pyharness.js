// The Python side of the engine. Loaded into Pyodide as module `_dojo` by
// pycore.js — in the browser worker and in the Node content validator alike,
// so grading behaves identically in both places.
export const HARNESS = String.raw`
import ast, builtins, contextlib, io, json, math, os, sys, time, traceback, types, warnings

MAX_TEXT = 30000
BT = chr(96)  # backtick (this file lives inside a JS template literal)
USER_FILE = "<main>"


class _Out(io.TextIOBase):
    """stdout replacement that keeps text, rich HTML and images in order."""

    def __init__(self):
        self.segs = []
        self.size = 0

    def writable(self):
        return True

    def write(self, s):
        if not isinstance(s, str):
            raise TypeError("write() argument must be str")
        if self.size > MAX_TEXT:
            return len(s)
        self.size += len(s)
        if self.segs and self.segs[-1]["t"] == "text":
            self.segs[-1]["v"] += s
        else:
            self.segs.append({"t": "text", "v": s})
        if self.size > MAX_TEXT:
            self.segs.append({"t": "err", "v": "\n… output truncated (too much printing)\n"})
        return len(s)

    def rich(self, kind, value):
        self.segs.append({"t": kind, "v": value})

    def text(self):
        return "".join(s["v"] for s in self.segs if s["t"] == "text")


_current = None  # the _Out of the run in progress (for display / plt.show)


def _display(*objs):
    for obj in objs:
        html = None
        if hasattr(obj, "_repr_html_"):
            try:
                html = obj._repr_html_()
            except Exception:
                html = None
        if html and _current is not None:
            _current.rich("html", html)
        else:
            print(repr(obj))


def _no_input(prompt=""):
    raise RuntimeError("input() is not available here — pass values in as function parameters instead.")


def _flush_figures(out):
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return
    import base64
    for num in plt.get_fignums():
        fig = plt.figure(num)
        buf = io.BytesIO()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
        out.rich("img", base64.b64encode(buf.getvalue()).decode())
    plt.close("all")


def _prepare_matplotlib():
    """Import pyplot up front so plt.show() renders inline from the first call."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot  # noqa: F401
    except Exception:
        return
    _patch_matplotlib(None)


def _patch_matplotlib(out):
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is not None and not getattr(plt, "_dojo_patched", False):
        plt.show = lambda *a, **k: _flush_figures(_current) if _current is not None else None
        plt._dojo_patched = True


os.environ.setdefault("MPLBACKEND", "AGG")


def new_ns():
    return {"__name__": "__main__", "__builtins__": builtins, "display": _display}


HINTS = {
    "NameError": "Python doesn't know this name. Check the spelling (Python is case-sensitive) and make sure it is defined before you use it.",
    "IndentationError": "Indentation matters in Python. Blocks after a ':' must be indented by 4 spaces, and lines in the same block must line up.",
    "TabError": "Mixing tabs and spaces confuses Python. Use 4 spaces per level.",
    "SyntaxError": "Python couldn't read this line. Look for a missing ':' , an unclosed bracket or quote, or a typo near the marked spot.",
    "ZeroDivisionError": "You divided by zero. Check the divisor before dividing.",
    "IndexError": "You asked for a position that doesn't exist. Remember: indexes start at 0 and the last one is len(x) - 1.",
    "KeyError": "That key isn't in the dictionary. Use d.get(key, default) or check 'key in d' first.",
    "AttributeError": "This object doesn't have that attribute or method. Check the type of the value and the spelling.",
    "RecursionError": "The function keeps calling itself forever. Make sure there is a base case that stops the recursion.",
    "UnboundLocalError": "You assigned to this name inside the function, so Python treats it as local — but read it before assigning.",
}


def _hint(etype, msg):
    if etype == "TypeError":
        if "NoneType" in msg:
            return "Something is None. Did a function forget to 'return' a value?"
        if "can only concatenate str" in msg or "must be str, not" in msg:
            return "You can't add text and numbers directly. Convert with str(x) or use an f-string."
        if "not callable" in msg:
            return "You used ( ) on something that isn't a function."
        if "argument" in msg:
            return "The function was called with the wrong number or kind of arguments."
        return "An operation got a value of the wrong type."
    if etype == "ValueError" and "invalid literal for int()" in msg:
        return "int() can only convert text that looks like a whole number."
    return HINTS.get(etype)


def _fmt_exc(e, code):
    lines = code.split("\n")
    etype = type(e).__name__
    if isinstance(e, SyntaxError) and (e.filename in (USER_FILE, None)):
        msg = e.msg
        ln = e.lineno or 0
        text = lines[ln - 1] if 0 < ln <= len(lines) else (e.text or "").rstrip("\n")
        tb = f'  line {ln}\n    {text}\n'
        if e.offset:
            col = max(0, min(len(text), e.offset - 1))
            tb += "    " + " " * col + "^\n"
        tb += f"{etype}: {msg}"
        return {"type": etype, "msg": msg, "line": ln, "tb": tb, "hint": _hint(etype, msg)}
    frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == USER_FILE]
    out = ["Traceback (most recent call last):"]
    for f in frames[-8:]:
        where = "" if f.name == "<module>" else f", in {f.name}"
        out.append(f"  line {f.lineno}{where}")
        if 0 < f.lineno <= len(lines):
            out.append("    " + lines[f.lineno - 1].strip())
    msg = str(e)
    out.append(f"{etype}: {msg}" if msg else etype)
    return {"type": etype, "msg": msg, "line": frames[-1].lineno if frames else None,
            "tb": "\n".join(out), "hint": _hint(etype, msg)}


def _exec(code, ns, out):
    """Run code in ns with stdout/stderr captured into out. Returns error dict or None."""
    global _current
    prev = _current
    _current = out
    builtins_input = builtins.input
    builtins.input = _no_input
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(_ErrTee(out)), warnings.catch_warnings():
            warnings.simplefilter("default")
            warnings.simplefilter("ignore", ResourceWarning)  # like plain python
            if "matplotlib" in code:
                _prepare_matplotlib()
            try:
                compiled = compile(code, USER_FILE, "exec")
            except SyntaxError as e:
                return _fmt_exc(e, code)
            try:
                exec(compiled, ns)
                _patch_matplotlib(out)
                _flush_figures(out)
            except SystemExit:
                pass
            except BaseException as e:  # noqa: B036 — report every user error
                _patch_matplotlib(out)
                return _fmt_exc(e, code)
    finally:
        builtins.input = builtins_input
        _current = prev
    return None


class _ErrTee(io.TextIOBase):
    def __init__(self, out):
        self.out = out

    def writable(self):
        return True

    def write(self, s):
        if s:
            if self.out.segs and self.out.segs[-1]["t"] == "err":
                self.out.segs[-1]["v"] += s
            else:
                self.out.segs.append({"t": "err", "v": s})
        return len(s)


def _quiet_exec(code, ns):
    out = _Out()
    err = _exec(code, ns, out) if code else None
    return out, err


def run(code, setup=""):
    """Playground / lesson 'Run' button."""
    t0 = time.perf_counter()
    ns = new_ns()
    if setup:
        _, serr = _quiet_exec(setup, ns)
        if serr:
            return json.dumps({"out": [], "error": {"type": "SetupError", "msg": serr["tb"], "tb": serr["tb"]}})
    out = _Out()
    err = _exec(code, ns, out)
    return json.dumps({"out": out.segs, "error": err, "ms": round((time.perf_counter() - t0) * 1000)})


# ---------------------------------------------------------------- comparison

def _short(v, limit=400):
    try:
        if type(v).__module__.startswith("pandas"):
            s = v.to_string() if hasattr(v, "to_string") else repr(v)
        else:
            s = repr(v)
    except Exception as e:  # pragma: no cover
        s = f"<unprintable {type(v).__name__}: {e}>"
    if len(s) > limit:
        s = s[:limit] + " …"
    return s


def _tname(v):
    return type(v).__name__


def same(a, b, tol=1e-6):
    """True if a (got) matches b (expected). Floats are compared approximately."""
    if a is b:
        return True
    ma, mb = type(a).__module__, type(b).__module__
    if ma.startswith("pandas") or mb.startswith("pandas"):
        import pandas as pd
        try:
            if isinstance(b, pd.DataFrame):
                if not isinstance(a, pd.DataFrame):
                    return False
                pd.testing.assert_frame_equal(a, b, check_dtype=False, check_exact=False, rtol=tol,
                                              check_index_type=False, check_column_type=False, check_names=False)
                return True
            if isinstance(b, pd.Series):
                if not isinstance(a, pd.Series):
                    return False
                pd.testing.assert_series_equal(a, b, check_dtype=False, check_exact=False, rtol=tol,
                                               check_index_type=False, check_names=False)
                return True
            if isinstance(b, pd.Index):
                return isinstance(a, pd.Index) and list(a) == list(b)
        except AssertionError:
            return False
        except Exception:
            return False
    if ma == "numpy" or mb == "numpy":
        import numpy as np
        if isinstance(b, np.ndarray) or isinstance(a, np.ndarray):
            if not isinstance(a, np.ndarray):
                return False
            bb = np.asarray(b)
            if a.shape != bb.shape:
                return False
            if a.dtype.kind in "fc" or bb.dtype.kind in "fc":
                try:
                    return bool(np.allclose(a, bb, rtol=tol, atol=1e-9, equal_nan=True))
                except TypeError:
                    return False
            return bool(np.array_equal(a, bb))
        if isinstance(a, np.generic):
            a = a.item()
        if isinstance(b, np.generic):
            b = b.item()
    if isinstance(b, bool) or isinstance(a, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    if isinstance(b, float) or isinstance(a, float):
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            if math.isnan(a) and math.isnan(b):
                return True
            return math.isclose(a, b, rel_tol=tol, abs_tol=1e-9)
        return False
    if isinstance(b, (list, tuple)):
        if type(a) is not type(b) or len(a) != len(b):
            return False
        return all(same(x, y, tol) for x, y in zip(a, b))
    if isinstance(b, dict):
        if not isinstance(a, dict) or set(a.keys()) != set(b.keys()):
            return False
        return all(same(a[k], b[k], tol) for k in b)
    try:
        return bool(a == b)
    except Exception:
        return False


def _why(got, exp):
    """Short human explanation of a mismatch."""
    if type(got) is not type(exp) and not (isinstance(got, (int, float)) and isinstance(exp, (int, float))
                                           and not isinstance(got, bool) and not isinstance(exp, bool)):
        return f"expected a {_tname(exp)}, got a {_tname(got)}"
    if isinstance(exp, (list, tuple, str)) and isinstance(got, (list, tuple, str)) and len(got) != len(exp):
        return f"length {len(got)} instead of {len(exp)}"
    return ""


def _unorder(v):
    if isinstance(v, (list, tuple, set)):
        try:
            return sorted(v)
        except TypeError:
            return sorted(v, key=repr)
    return v


# ---------------------------------------------------------------- static rules

_KW = {
    "for": (ast.For, ast.comprehension), "while": (ast.While,), "lambda": (ast.Lambda,),
    "yield": (ast.Yield, ast.YieldFrom), "class": (ast.ClassDef,), "def": (ast.FunctionDef, ast.AsyncFunctionDef),
    "return": (ast.Return,), "try": (ast.Try,) + ((ast.TryStar,) if hasattr(ast, "TryStar") else ()),
    "with": (ast.With,), "if": (ast.If, ast.IfExp), "import": (ast.Import, ast.ImportFrom),
    "raise": (ast.Raise,), "assert": (ast.Assert,), "global": (ast.Global,), "nonlocal": (ast.Nonlocal,),
    "comprehension": (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp),
    "listcomp": (ast.ListComp,), "dictcomp": (ast.DictComp,), "setcomp": (ast.SetComp,),
    "genexp": (ast.GeneratorExp,), "fstring": (ast.JoinedStr,), "match": (ast.Match,),
    "walrus": (ast.NamedExpr,),
}
_KW_LABEL = {"comprehension": "a comprehension", "listcomp": "a list comprehension", "dictcomp": "a dict comprehension",
             "setcomp": "a set comprehension", "genexp": "a generator expression", "fstring": "an f-string",
             "recursion": "recursion", "decorator": "a decorator", "walrus": "the := operator"}


def _uses(tree, rule):
    if rule in _KW:
        return any(isinstance(n, _KW[rule]) for n in ast.walk(tree))
    if rule == "decorator":
        return any(isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.decorator_list for n in ast.walk(tree))
    if rule == "recursion":
        for fn in ast.walk(tree):
            if isinstance(fn, ast.FunctionDef):
                for n in ast.walk(fn):
                    if isinstance(n, ast.Call):
                        f = n.func
                        if (isinstance(f, ast.Name) and f.id == fn.name) or (isinstance(f, ast.Attribute) and f.attr == fn.name):
                            return True
        return False
    # otherwise: a name / attribute / imported module
    for n in ast.walk(tree):
        if isinstance(n, ast.Name) and n.id == rule:
            return True
        if isinstance(n, ast.Attribute) and n.attr == rule:
            return True
        if isinstance(n, ast.Import) and any(a.name.split(".")[0] == rule for a in n.names):
            return True
        if isinstance(n, ast.ImportFrom) and (n.module or "").split(".")[0] == rule:
            return True
    return False


def static_rules(tree, require=None, forbid=None):
    msgs = []
    for r in require or []:
        if not _uses(tree, r):
            msgs.append(f"Your solution must use {_KW_LABEL.get(r, BT + r + BT)}.")
    for r in forbid or []:
        if _uses(tree, r):
            msgs.append(f"Don't use {_KW_LABEL.get(r, BT + r + BT)} in this exercise — solve it another way.")
    return msgs


# ---------------------------------------------------------------- grading

def _norm_out(s):
    lines = [ln.rstrip() for ln in s.replace("\r\n", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def _eval_capture(expr, ns):
    out = _Out()
    global _current
    prev = _current
    _current = out
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(_ErrTee(out)), warnings.catch_warnings():
            warnings.simplefilter("ignore")
            return eval(compile(expr, "<test>", "eval"), ns), out, None
    except BaseException as e:  # noqa: B036
        return None, out, e
    finally:
        _current = prev


def _exc_name_matches(e, name):
    return any(c.__name__ == name for c in type(e).__mro__)


def check(spec_json, code, progress=None):
    spec = json.loads(spec_json)
    setup = spec.get("setup") or ""
    tests = spec.get("tests") or []
    solution = spec.get("solution") or ""
    res = {"passed": False, "tests": [], "static": [], "error": None, "out": []}

    def fail_all(reason):
        for t in tests:
            res["tests"].append({"name": t.get("name") or t.get("call") or t.get("var") or "program output",
                                 "hidden": bool(t.get("hidden")), "ok": False, "msg": reason})

    try:
        tree = ast.parse(code, USER_FILE)
    except SyntaxError as e:
        res["error"] = _fmt_exc(e, code)
        fail_all("Your code has a syntax error.")
        return json.dumps(res)
    res["static"] = static_rules(tree, spec.get("require"), spec.get("forbid"))

    ns = new_ns()
    if setup:
        _, serr = _quiet_exec(setup, ns)
        if serr:
            res["error"] = {"type": "SetupError", "msg": serr["tb"], "tb": serr["tb"]}
            fail_all("Exercise setup failed.")
            return json.dumps(res)
    out = _Out()
    t0 = time.perf_counter()
    err = _exec(code, ns, out)
    res["out"] = out.segs
    res["ms"] = round((time.perf_counter() - t0) * 1000)
    if err:
        res["error"] = err
        fail_all("Your code raised an error before this test could run.")
        return json.dumps(res)

    base = _Ctx(setup, "", solution)
    base.ns, base.out = ns, out

    for i, t in enumerate(tests):
        name = t.get("name") or t.get("call") or (f"variable {t['var']}" if "var" in t else None) \
            or t.get("assert") or ("program output" if "stdout" in t else f"test {i + 1}")
        if t.get("given") and not t.get("name"):
            name += f"  (with {t['given'].strip()})"
        r = {"name": name, "hidden": bool(t.get("hidden")), "ok": False, "msg": ""}
        start = time.perf_counter()
        try:
            ctx = base
            if t.get("given"):
                ctx = _Ctx(setup, t["given"], solution)
                uerr = ctx.run_user(code)
                if uerr:
                    raise _Miss(f"with {t['given'].strip()} your code raised {uerr['type']}: {uerr['msg']}")
            _run_test(t, r, ctx, solution)
        except _Miss as m:
            r["msg"] = str(m)
        except RuntimeError as rt:
            r["msg"] = "internal: " + str(rt)
            r["internal"] = True
        elapsed = (time.perf_counter() - start) * 1000
        r["ms"] = round(elapsed, 1)
        if r["ok"] and t.get("maxMs") and elapsed > t["maxMs"]:
            r["ok"] = False
            r["msg"] = f"correct but too slow: {elapsed:.0f} ms (limit {t['maxMs']} ms) — look for a faster algorithm"
        res["tests"].append(r)
        if progress is not None:
            try:
                progress(i + 1, len(tests))
            except Exception:
                pass

    res["passed"] = all(r["ok"] for r in res["tests"]) and not res["static"]
    return json.dumps(res)


class _Miss(Exception):
    pass


class _Ctx:
    """One execution of the learner's program (+ lazily, the reference solution)."""

    def __init__(self, setup, given, solution):
        self.setup, self.given, self.solution = setup, given, solution
        self.ns = self.out = self._sns = self._sout = None

    def _prep(self):
        ns = new_ns()
        for part in (self.setup, self.given):
            if part:
                _, err = _quiet_exec(part, ns)
                if err:
                    raise RuntimeError("test setup failed: " + err["tb"])
        return ns

    def run_user(self, code):
        self.ns, self.out = self._prep(), _Out()
        return _exec(code, self.ns, self.out)

    def sol_ns(self):
        if self._sns is None:
            sns = self._prep()
            sout, serr = _quiet_exec(self.solution, sns)
            if serr:
                raise RuntimeError("reference solution failed: " + serr["tb"])
            self._sns, self._sout = sns, sout
        return self._sns

    def sol_out(self):
        self.sol_ns()
        return self._sout


def _run_test(t, r, ctx, solution):
    ns, out = ctx.ns, ctx.out
    if "call" in t or "var" in t:
        if "var" in t:
            if t["var"] not in ns:
                raise _Miss(f"variable '{t['var']}' is not defined")
            got, gout, gerr = ns[t["var"]], None, None
        else:
            got, gout, gerr = _eval_capture(t["call"], ns)
        if "raises" in t:
            if gerr is None:
                r["msg"] = f"expected {t['raises']} to be raised, but it returned {_short(got, 120)}"
            elif _exc_name_matches(gerr, t["raises"]):
                r["ok"] = True
            else:
                r["msg"] = f"raised {type(gerr).__name__} instead of {t['raises']}: {gerr}"
        elif gerr is not None:
            r["msg"] = f"raised {type(gerr).__name__}: {gerr}"
            h = _hint(type(gerr).__name__, str(gerr))
            if h:
                r["msg"] += f"  — {h}"
        else:
            if "expect" in t:
                exp, _, eerr = _eval_capture(t["expect"], ctx.sol_ns() if solution else ns)
                if eerr:
                    raise RuntimeError(f"bad expected value {t['expect']!r}: {eerr!r}")
            elif "var" in t:
                sns = ctx.sol_ns()
                if t["var"] not in sns:
                    raise RuntimeError(f"reference solution does not define {t['var']!r}")
                exp = sns[t["var"]]
            else:
                exp, _, eerr = _eval_capture(t["call"], ctx.sol_ns())
                if eerr:
                    raise RuntimeError(f"reference solution raised on {t['call']!r}: {eerr!r}")
            g, e = (_unorder(got), _unorder(exp)) if t.get("unordered") else (got, exp)
            if same(g, e, t.get("tol", 1e-6)):
                r["ok"] = True
            else:
                r["got"], r["exp"] = _short(got), _short(exp)
                r["msg"] = _why(got, exp)
                if got is None and gout is not None and gout.text().strip():
                    r["msg"] = "your function printed the result but returned None — use 'return' instead of 'print'"
        if gout is not None and gout.text():
            r["printed"] = gout.text()[:400]
    elif "stdout" in t:
        exp = ctx.sol_out().text() if t["stdout"] is True else t["stdout"]
        got = out.text()
        if _norm_out(got) == _norm_out(exp):
            r["ok"] = True
        else:
            r["got"], r["exp"] = got[:600] or "(nothing printed)", exp[:600]
            r["msg"] = "the printed output is different"
            r["textual"] = True
    elif "assert" in t:
        val, _, aerr = _eval_capture(t["assert"], ns)
        if aerr:
            r["msg"] = f"raised {type(aerr).__name__}: {aerr}"
        elif val:
            r["ok"] = True
        else:
            r["msg"] = t.get("fail") or "condition is not true"
    elif "code" in t:
        terr = _exec(t["code"], ns, _Out())
        if terr:
            r["msg"] = t.get("fail") or (terr["type"] + (": " + terr["msg"] if terr["msg"] else ""))
        else:
            r["ok"] = True
    else:
        r["msg"] = "malformed test"

`;

#!/usr/bin/env python3
"""Dev server: serves the website plus extra folders under /mnt/<name>/ with CORS.

    python tools/serve.py --port 8765 --mount alpaca=/path/to/alpaca

Then open http://localhost:8765/?run=/mnt/alpaca/run/
"""
import argparse
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def make_handler(mounts):
    class Handler(SimpleHTTPRequestHandler):
        def translate_path(self, path):
            path = path.split("?", 1)[0].split("#", 1)[0]
            path = unquote(path)
            if path.startswith("/mnt/"):
                rest = path[len("/mnt/"):]
                name, _, sub = rest.partition("/")
                if name in mounts:
                    return os.path.normpath(os.path.join(mounts[name], sub))
            return os.path.normpath(os.path.join(ROOT, path.lstrip("/")))

        def end_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def log_message(self, fmt, *args):  # quieter
            if "404" in (args[1] if len(args) > 1 else ""):
                super().log_message(fmt, *args)

    return Handler


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--mount", action="append", default=[], help="name=/abs/path")
    a = ap.parse_args()
    mounts = {}
    for m in a.mount:
        k, _, v = m.partition("=")
        mounts[k] = os.path.abspath(v)
    httpd = ThreadingHTTPServer(("127.0.0.1", a.port), make_handler(mounts))
    print(f"serving {ROOT} on http://127.0.0.1:{a.port}/  mounts={mounts}", file=sys.stderr)
    httpd.serve_forever()


if __name__ == "__main__":
    main()

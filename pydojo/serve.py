#!/usr/bin/env python3
"""Local server for PyDojo (Mac + iPhone on the same Wi-Fi).

    python3 serve.py            # serve on port 8765 and print the addresses
    python3 serve.py --open     # ... and open the browser
    python3 serve.py --stop     # stop a server started in the background

Works with the macOS system python3 (3.9+); no dependencies.
"""
import argparse
import gzip
import http.server
import json
import os
import signal
import socket
import socketserver
import subprocess
import sys
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
PID_FILE = os.path.join("/tmp", "pydojo-server.pid")


def lan_addresses(port):
    names = []
    try:
        host = subprocess.run(["scutil", "--get", "LocalHostName"], capture_output=True, text=True, timeout=2).stdout.strip()
        if host:
            names.append(f"http://{host}.local:{port}/")
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("192.0.2.1", 80))  # no packet is sent; picks the outgoing interface
        names.append(f"http://{s.getsockname()[0]}:{port}/")
        s.close()
    except Exception:
        pass
    return names


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
        ".webmanifest": "application/manifest+json", ".wasm": "application/wasm",
        ".svg": "image/svg+xml", ".json": "application/json", ".csv": "text/csv; charset=utf-8",
        ".log": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".py": "text/plain; charset=utf-8",
    }

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    _gz_cache = {}
    GZ_TYPES = (".js", ".css", ".csv", ".log", ".txt", ".json", ".html", ".svg", ".webmanifest")

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _send_gzip(self):
        """Serve text files gzip-compressed (much faster on an iPhone over Wi-Fi)."""
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, "index.html")
        if not path.endswith(self.GZ_TYPES) or not os.path.isfile(path):
            return False
        if "gzip" not in self.headers.get("Accept-Encoding", ""):
            return False
        st = os.stat(path)
        etag = f'"{int(st.st_mtime)}-{st.st_size}"'
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.end_headers()
            return True
        key = (path, st.st_mtime, st.st_size)
        body = self._gz_cache.get(key)
        if body is None:
            with open(path, "rb") as f:
                body = gzip.compress(f.read(), 6)
            self._gz_cache[key] = body
        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("ETag", etag)
        self.send_header("Vary", "Accept-Encoding")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)
        return True

    def do_GET(self):
        if self.path.startswith("/__pydojo/ping"):
            return self._json({"ok": True})
        if self.path.startswith("/__pydojo/info"):
            addrs = lan_addresses(self.server.server_address[1])
            return self._json({"lan": addrs[0] if addrs else None, "all": addrs})
        if self.path.startswith(("/tools", "/tests")):
            self.send_error(404)
            return
        clean = self.path.split("?", 1)[0].split("#", 1)[0]
        orig = self.path
        self.path = clean
        try:
            if self._send_gzip():
                return
        finally:
            self.path = orig
        return super().do_GET()

    def _json(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        if "--verbose" in sys.argv:
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def stop():
    try:
        with open(PID_FILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, signal.SIGTERM)
        os.remove(PID_FILE)
        print(f"Stopped PyDojo server (pid {pid}).")
    except FileNotFoundError:
        print("No background PyDojo server is running.")
    except ProcessLookupError:
        os.remove(PID_FILE)
        print("Server was not running.")


def main():
    ap = argparse.ArgumentParser(description="Serve PyDojo locally")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--open", action="store_true", help="open the browser")
    ap.add_argument("--stop", action="store_true", help="stop the background server")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()
    if args.stop:
        return stop()
    try:
        httpd = Server(("0.0.0.0", args.port), Handler)
    except OSError:
        print(f"Port {args.port} is busy. Is PyDojo already running? Open http://localhost:{args.port}/")
        sys.exit(1)
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))
    print("PyDojo is running")
    print(f"  Mac:     http://localhost:{args.port}/")
    for a in lan_addresses(args.port):
        print(f"  iPhone:  {a}   (same Wi-Fi)")
    print("Press Ctrl+C to stop.")
    if args.open:
        webbrowser.open(f"http://localhost:{args.port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        try:
            os.remove(PID_FILE)
        except OSError:
            pass


if __name__ == "__main__":
    main()

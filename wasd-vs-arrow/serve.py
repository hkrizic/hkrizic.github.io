#!/usr/bin/env python3
"""Static server for WASD vs ARROW (ES modules need http://, not file://). No caching, so edits show up on reload.

    python3 serve.py [port]          # this Mac only, default 8790
    python3 serve.py [port] --lan    # also reachable from an iPad on the same Wi-Fi
"""
import functools
import http.server
import os
import socket
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    lan = '--lan' in sys.argv
    port = int(args[0]) if args else 8790
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCache, directory=root)
    print(f'WASD vs ARROW → http://localhost:{port}', flush=True)
    if lan:
        host = socket.gethostname().split('.')[0]
        print(f'On the iPad (same Wi-Fi) open  http://{host}.local:{port}', flush=True)
    http.server.ThreadingHTTPServer(('0.0.0.0' if lan else '127.0.0.1', port), handler).serve_forever()

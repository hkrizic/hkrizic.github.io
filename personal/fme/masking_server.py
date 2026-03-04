#!/usr/bin/env python3
import argparse
import http.server
import os
import socketserver
import threading
import time
import urllib.parse
import webbrowser
from pathlib import Path


class MaskingRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/fits.js":
            self._serve_static_file("fits.js", "application/javascript; charset=utf-8")
            return
        if parsed.path == "/file":
            self._serve_fits_file()
            return
        if parsed.path in ("/", "/index.html"):
            self._serve_masking_html()
            return
        self.send_error(404, "Not Found")

    def log_message(self, format, *args):
        # Keep the app quiet unless something goes wrong.
        return

    def _serve_masking_html(self):
        try:
            html_path = self.server.html_path
            data = html_path.read_bytes()
        except Exception:
            self.send_error(500, "Failed to load Masking.html")
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _serve_static_file(self, name, content_type):
        try:
            file_path = self.server.static_dir / name
            if not file_path.exists():
                self.send_error(404, "Not Found")
                return
            data = file_path.read_bytes()
        except Exception:
            self.send_error(500, "Failed to load static file")
            return

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _serve_fits_file(self):
        file_path = self.server.file_path
        if not file_path or not file_path.exists():
            self.send_error(404, "File not found")
            return

        try:
            data = file_path.read_bytes()
        except Exception:
            self.send_error(500, "Failed to read file")
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Masking-File-Name", file_path.name)
        self.end_headers()
        self.wfile.write(data)


def run_server(file_path: Path, auto_open: bool, timeout: int, port: int):
    html_path = Path(__file__).with_name("Masking.html")
    if not html_path.exists():
        raise FileNotFoundError(f"Masking.html not found at {html_path}")

    class MaskingTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    with MaskingTCPServer(("127.0.0.1", port), MaskingRequestHandler) as httpd:
        httpd.file_path = file_path
        httpd.html_path = html_path
        httpd.static_dir = html_path.parent
        port = httpd.server_address[1]
        url = f"http://127.0.0.1:{port}/?open=1"
        print(url, flush=True)

        if auto_open:
            webbrowser.open(url)

        if timeout > 0:
            def shutdown_later():
                time.sleep(timeout)
                httpd.shutdown()

            threading.Thread(target=shutdown_later, daemon=True).start()

        httpd.serve_forever()


def main():
    parser = argparse.ArgumentParser(description="Run Masking.html as a local app.")
    parser.add_argument("file", help="Path to a FITS file to open")
    parser.add_argument("--open", action="store_true", help="Open the browser automatically")
    parser.add_argument("--timeout", type=int, default=7200, help="Auto-shutdown time in seconds (0 to disable)")
    parser.add_argument("--port", type=int, default=0, help="Port to bind (0 for random)")
    args = parser.parse_args()

    file_path = Path(os.path.expanduser(args.file)).resolve()
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    run_server(file_path, args.open, args.timeout, args.port)


if __name__ == "__main__":
    main()

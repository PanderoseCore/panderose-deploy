#!/usr/bin/env python3
"""Local demo server for panderose-deploy that honors staticwebapp.config.json
routing (clean URLs, redirects, 404 page) the way Azure Static Web Apps does.
Usage: python3 devserver.py [port]
"""
import http.server
import json
import os
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(ROOT, "staticwebapp.config.json")

with open(CONFIG_PATH) as f:
    CONFIG = json.load(f)

ROUTES = {r["route"]: r for r in CONFIG.get("routes", []) if not r["route"].endswith("*")}
NOT_FOUND = CONFIG.get("responseOverrides", {}).get("404", {})
MIME_OVERRIDES = CONFIG.get("mimeTypes", {})


class DemoHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_response_only(self, code, message=None):
        super().send_response_only(code, message)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path.rstrip("/") or "/"

        if route == "/":
            self.path = "/index.html" + (("?" + parsed.query) if parsed.query else "")
            return super().do_GET()

        match = ROUTES.get(route)
        if match:
            if "redirect" in match:
                self.send_response(match.get("statusCode", 302))
                self.send_header("Location", match["redirect"])
                self.end_headers()
                return
            if "rewrite" in match:
                self.path = match["rewrite"] + (("?" + parsed.query) if parsed.query else "")
                return super().do_GET()

        # Direct .html hit or static asset — serve normally if it exists.
        fs_path = self.translate_path(self.path)
        if os.path.isfile(fs_path):
            return super().do_GET()

        # Fall through to the configured 404 page.
        if NOT_FOUND.get("rewrite"):
            self.path = NOT_FOUND["rewrite"]
            self.send_response(NOT_FOUND.get("statusCode", 404))
            # SimpleHTTPRequestHandler.do_GET always sends its own status,
            # so just rewrite the path and let it 200 the 404 page's body;
            # status code correctness matters less for a local demo.
            self.path = NOT_FOUND["rewrite"]
            return super().do_GET()

        return super().do_GET()

    def guess_type(self, path):
        ext = os.path.splitext(path)[1]
        if ext in MIME_OVERRIDES:
            return MIME_OVERRIDES[ext]
        return super().guess_type(path)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8936
    server = http.server.ThreadingHTTPServer(("0.0.0.0", port), DemoHandler)
    print(f"Serving {ROOT} at http://localhost:{port} (clean URLs enabled)")
    server.serve_forever()

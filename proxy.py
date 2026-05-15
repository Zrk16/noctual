"""
Simple CORS proxy for NVIDIA NIM API.
Run: python proxy.py
Then keep this running while using Nocual.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import json

NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1'
PORT = 8765

class Proxy(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)

        url = NVIDIA_BASE + self.path
        req = urllib.request.Request(url, data=body, method='POST')
        for h in ('Authorization', 'Content-Type'):
            if v := self.headers.get(h):
                req.add_header(h, v)

        try:
            with urllib.request.urlopen(req) as r:
                data = r.read()
                self.send_response(r.status)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(data)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')

    def log_message(self, fmt, *args):
        pass  # silence request logs

if __name__ == '__main__':
    print(f'Proxy running on http://localhost:{PORT}')
    HTTPServer(('', PORT), Proxy).serve_forever()

import http.server
import socketserver

PORT = 3000

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
})

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("Serving at port", PORT)
    httpd.serve_forever()

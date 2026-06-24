const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.env.SERVE_ROOT || process.argv[2] || process.cwd());
const port = Number(process.env.PORT || 4173);
const apiTarget = new URL(process.env.API_TARGET || "http://127.0.0.1:8001");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function proxyApi(req, res) {
  const target = new URL(req.url, apiTarget);
  const proxyReq = http.request(
    target,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: apiTarget.host
      }
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    send(res, 502, `API proxy error: ${error.message}`);
  });
  req.pipe(proxyReq);
}

http.createServer((req, res) => {
  if (req.url.startsWith("/api")) {
    proxyApi(req, res);
    return;
  }

  const url = new URL(req.url, `http://localhost:${port}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const target = path.resolve(root, `.${requested}`);

  if (!target.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(target, (error, data) => {
    if (error) {
      fs.readFile(path.join(root, "index.html"), (fallbackError, fallbackData) => {
        if (fallbackError) {
          send(res, 404, "Not found");
          return;
        }
        send(res, 200, fallbackData, types[".html"]);
      });
      return;
    }

    send(res, 200, data, types[path.extname(target)] || "application/octet-stream");
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Static SPA running at http://127.0.0.1:${port}`);
  console.log(`Serving ${root}`);
  console.log(`/api -> ${apiTarget.origin}`);
});

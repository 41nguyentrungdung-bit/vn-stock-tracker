const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8787;
const API_BASE = "https://query1.finance.yahoo.com";
const VCI_TRADING_BASE = "https://trading.vietcap.com.vn/api";
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

const ALLOWED_PREFIXES = [
  "/v8/finance/chart/"
];

const VCI_RANGE_CONFIG = {
  "2y": { timeFrame: "ONE_DAY", lookbackDays: 2920 },
  "30m": { timeFrame: "ONE_MINUTE", lookbackDays: 120 },
  "1h": { timeFrame: "ONE_HOUR", lookbackDays: 365 },
  "2h": { timeFrame: "ONE_HOUR", lookbackDays: 500 },
  "4h": { timeFrame: "ONE_HOUR", lookbackDays: 730 },
  "1d": { timeFrame: "ONE_DAY", lookbackDays: 2920 },
  "3d": { timeFrame: "ONE_DAY", lookbackDays: 2920 },
  "5d": { timeFrame: "ONE_DAY", lookbackDays: 2920 },
  "1w": { timeFrame: "ONE_DAY", lookbackDays: 2920 },
  "1m": { timeFrame: "ONE_DAY", lookbackDays: 2920 },
  "3m": { timeFrame: "ONE_DAY", lookbackDays: 2920 }
};

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*"
  });
  res.end(JSON.stringify(body));
}

async function handleProxy(req, res, url) {
  if (url.searchParams.get("source") === "vci") {
    const symbol = (url.searchParams.get("symbol") || "").toUpperCase();
    if (!/^[A-Z0-9]{2,12}$/.test(symbol)) {
      sendJson(res, 400, { error: "Missing or invalid symbol" });
      return;
    }

    const range = url.searchParams.get("range") || "2y";
    const rangeConfig = VCI_RANGE_CONFIG[range] || VCI_RANGE_CONFIG["2y"];
    const now = Math.floor(Date.now() / 1000) + 86400;
    const from = now - 86400 * rangeConfig.lookbackDays;
    const headers = {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      referer: "https://trading.vietcap.com.vn/",
      origin: "https://trading.vietcap.com.vn",
      "user-agent": "Mozilla/5.0"
    };

    try {
      const [chartResponse, boardResponse] = await Promise.all([
        fetch(`${VCI_TRADING_BASE}/chart/OHLCChart/gap`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            timeFrame: rangeConfig.timeFrame,
            symbols: [symbol],
            from,
            to: now
          })
        }),
        fetch(`${VCI_TRADING_BASE}/price/symbols/getList`, {
          method: "POST",
          headers,
          body: JSON.stringify({ symbols: [symbol] })
        })
      ]);

      const chart = await chartResponse.json();
      const board = await boardResponse.json();
      sendJson(res, chartResponse.ok && boardResponse.ok ? 200 : 502, {
        source: "VCI",
        symbol,
        range,
        timeFrame: rangeConfig.timeFrame,
        chart,
        board
      });
    } catch (error) {
      sendJson(res, 502, { error: "VCI request failed", details: error.message });
    }
    return;
  }

  const apiPath = url.searchParams.get("path");

  if (!apiPath || !apiPath.startsWith("/")) {
    sendJson(res, 400, { error: "Missing or invalid path" });
    return;
  }

  if (!ALLOWED_PREFIXES.some((prefix) => apiPath.startsWith(prefix))) {
    sendJson(res, 403, { error: "Path is not allowed" });
    return;
  }

  try {
    const upstream = await fetch(`${API_BASE}${apiPath}`, {
      headers: {
        accept: "application/json",
        "user-agent": "stock-tracker-vietnam-local/1.0"
      }
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "access-control-allow-origin": "*"
    });
    res.end(text);
  } catch (error) {
    sendJson(res, 502, {
      error: "Upstream request failed",
      details: error.message
    });
  }
}

function handleStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT, requestedPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "content-type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/.netlify/functions/vn-stock") {
    handleProxy(req, res, url);
    return;
  }

  handleStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`Stock tracker dang chay tai http://localhost:${PORT}`);
});

const API_BASE = "https://query1.finance.yahoo.com";
const VCI_TRADING_BASE = "https://trading.vietcap.com.vn/api";

const ALLOWED_PREFIXES = [
  "/v8/finance/chart/"
];

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=20"
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return response(200, { ok: true });
  }

  if (event.queryStringParameters && event.queryStringParameters.source === "vci") {
    const symbol = String(event.queryStringParameters.symbol || "").toUpperCase();
    if (!/^[A-Z0-9]{2,12}$/.test(symbol)) {
      return response(400, { error: "Missing or invalid symbol" });
    }

    const now = Math.floor(Date.now() / 1000) + 86400;
    const from = now - 86400 * 730;
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
            timeFrame: "ONE_DAY",
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
      return response(chartResponse.ok && boardResponse.ok ? 200 : 502, {
        source: "VCI",
        symbol,
        chart,
        board
      });
    } catch (error) {
      return response(502, { error: "VCI request failed", details: error.message });
    }
  }

  const path = event.queryStringParameters && event.queryStringParameters.path;

  if (!path || !path.startsWith("/")) {
    return response(400, { error: "Missing or invalid path" });
  }

  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return response(403, { error: "Path is not allowed" });
  }

  try {
    const upstream = await fetch(`${API_BASE}${path}`, {
      headers: {
        accept: "application/json",
        "user-agent": "stock-tracker-vietnam/1.0"
      }
    });

    const text = await upstream.text();

    return {
      statusCode: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=20"
      },
      body: text
    };
  } catch (error) {
    return response(502, {
      error: "Upstream request failed",
      details: error.message
    });
  }
};

const API_BASE = "https://query1.finance.yahoo.com";
const PROXY_BASE = "/.netlify/functions/vn-stock";

const form = document.getElementById("stockForm");
const symbolInput = document.getElementById("symbol");
const message = document.getElementById("message");
const copyButton = document.getElementById("copyButton");
const chartCanvas = document.getElementById("priceChart");
const rsiCanvas = document.getElementById("rsiChart");
const macdCanvas = document.getElementById("macdChart");
const quickSymbols = document.querySelector(".quick-symbols");
const tabs = document.querySelectorAll(".tab");
const tabPanels = {
  overview: document.getElementById("overviewPanel"),
  score: document.getElementById("scorePanel")
};

const fields = {
  lastUpdated: document.getElementById("lastUpdated"),
  exchange: document.getElementById("exchange"),
  companyName: document.getElementById("companyName"),
  companyDescription: document.getElementById("companyDescription"),
  currentPrice: document.getElementById("currentPrice"),
  priceChange: document.getElementById("priceChange"),
  referencePrice: document.getElementById("referencePrice"),
  ceilingPrice: document.getElementById("ceilingPrice"),
  floorPrice: document.getElementById("floorPrice"),
  highPrice: document.getElementById("highPrice"),
  lowPrice: document.getElementById("lowPrice"),
  volume: document.getElementById("volume"),
  ma10: document.getElementById("ma10"),
  ma50: document.getElementById("ma50"),
  ma100: document.getElementById("ma100"),
  ma200: document.getElementById("ma200"),
  chartRange: document.getElementById("chartRange"),
  ticker: document.getElementById("ticker"),
  listedExchange: document.getElementById("listedExchange"),
  industry: document.getElementById("industry"),
  sector: document.getElementById("sector"),
  marketCap: document.getElementById("marketCap"),
  peRatio: document.getElementById("peRatio"),
  pbRatio: document.getElementById("pbRatio"),
  roe: document.getElementById("roe"),
  eps: document.getElementById("eps"),
  beta: document.getElementById("beta"),
  rsiValue: document.getElementById("rsiValue"),
  macdValue: document.getElementById("macdValue"),
  change3: document.getElementById("change3"),
  change7: document.getElementById("change7"),
  change10: document.getElementById("change10"),
  change14: document.getElementById("change14"),
  change21: document.getElementById("change21"),
  change30: document.getElementById("change30"),
  foreignBuy: document.getElementById("foreignBuy"),
  foreignSell: document.getElementById("foreignSell"),
  foreignNet: document.getElementById("foreignNet"),
  domesticBuy: document.getElementById("domesticBuy"),
  domesticSell: document.getElementById("domesticSell"),
  domesticNet: document.getElementById("domesticNet"),
  flowStatus: document.getElementById("flowStatus"),
  historyCount: document.getElementById("historyCount"),
  historyBody: document.getElementById("historyBody"),
  scoreTotalBadge: document.getElementById("scoreTotalBadge"),
  scoreAnalysis: document.getElementById("scoreAnalysis"),
  rawData: document.getElementById("rawData")
};

let latestPayload = null;

function setMessage(text) {
  message.textContent = text;
}

function setActiveTab(name) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === name;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  Object.entries(tabPanels).forEach(([panelName, panel]) => {
    panel.hidden = panelName !== name;
    panel.classList.toggle("active", panelName === name);
  });
}

function safeText(value) {
  if (value === undefined || value === null || value === "" || value === "N/A") return "-";
  return String(value);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, digits = 2) {
  const number = toNumber(value);
  if (number === null) return "-";
  return number.toLocaleString("vi-VN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function formatInteger(value) {
  const number = toNumber(value);
  if (number === null) return "-";
  return number.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}

function formatPrice(value) {
  const number = toNumber(value);
  if (number === null) return "-";
  return number.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

function formatPercent(value) {
  const number = toNumber(value);
  if (number === null) return "-";
  return `${number > 0 ? "+" : ""}${number.toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })}%`;
}

function valueClass(value) {
  const number = toNumber(value);
  if (number === null || number === 0) return "";
  return number > 0 ? "positive" : "negative";
}

function formatLargeNumber(value) {
  const number = toNumber(value);
  if (number === null) return "-";

  if (Math.abs(number) >= 1_000_000_000_000) {
    return `${formatNumber(number / 1_000_000_000_000, 2)} nghin ty`;
  }
  if (Math.abs(number) >= 1_000_000_000) {
    return `${formatNumber(number / 1_000_000_000, 2)} ty`;
  }
  if (Math.abs(number) >= 1_000_000) {
    return `${formatNumber(number / 1_000_000, 2)} trieu`;
  }
  return formatInteger(number);
}

function formatOptional(value, digits = 2) {
  return toNumber(value) === null ? "-" : formatNumber(value, digits);
}

async function requestJson(path) {
  if (location.protocol === "file:") {
    throw new Error("Dang mo bang file:// nen khong co proxy du lieu. Hay chay local-server.js roi mo http://localhost:8787.");
  }

  const url = `${PROXY_BASE}?path=${encodeURIComponent(path)}`;

  let response;
  try {
    response = await fetch(url, { headers: { accept: "application/json" } });
  } catch (error) {
    throw new Error("Khong ket noi duoc den proxy du lieu. Hay kiem tra website da deploy kem Netlify Function chua.");
  }

  if (!response.ok) {
    throw new Error(`Khong tai duoc du lieu. HTTP ${response.status}`);
  }

  return response.json();
}

function getFirstRecord(data) {
  if (Array.isArray(data)) return data[0] || {};
  if (Array.isArray(data?.data)) return data.data[0] || {};
  return data || {};
}

function makeYahooCandidates(symbol) {
  if (symbol.includes(".")) return [symbol];
  return [`${symbol}.VN`, `${symbol}.HM`, `${symbol}.HN`, symbol];
}

function parseYahooChart(rawData) {
  const result = rawData?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta || {};
  const quoteData = result.indicators?.quote?.[0] || {};
  const timestamps = result.timestamp || [];
  const bars = timestamps
    .map((timestamp, index) => ({
      time: new Date(timestamp * 1000).toLocaleDateString("vi-VN"),
      open: toNumber(quoteData.open?.[index]),
      high: toNumber(quoteData.high?.[index]),
      low: toNumber(quoteData.low?.[index]),
      close: toNumber(quoteData.close?.[index]),
      volume: toNumber(quoteData.volume?.[index])
    }))
    .filter((item) => item.close !== null);

  const latestBar = bars[bars.length - 1] || {};
  const previousClose = meta.previousClose ?? meta.chartPreviousClose;
  const price = meta.regularMarketPrice ?? latestBar.close;
  const change = toNumber(price) !== null && toNumber(previousClose) !== null
    ? toNumber(price) - toNumber(previousClose)
    : null;
  const changePercent = toNumber(change) !== null && toNumber(previousClose)
    ? (toNumber(change) / toNumber(previousClose)) * 100
    : null;

  return {
    quote: {
      ticker: meta.symbol,
      exchange: meta.fullExchangeName || meta.exchangeName,
      price,
      referencePrice: previousClose,
      ceilingPrice: null,
      floorPrice: null,
      highPrice: meta.regularMarketDayHigh ?? latestBar.high,
      lowPrice: meta.regularMarketDayLow ?? latestBar.low,
      volume: meta.regularMarketVolume ?? latestBar.volume,
      change,
      changePercent
    },
    overview: {
      ticker: meta.symbol,
      name: meta.longName || meta.shortName || meta.symbol,
      exchange: meta.fullExchangeName || meta.exchangeName,
      industry: "-",
      sector: "-",
      description: `Du lieu gia lay tu Yahoo Finance cho ma ${meta.symbol}. Tien te: ${meta.currency || "VND"}.`,
      marketCap: null,
      pe: null,
      pb: null,
      roe: null,
      eps: null,
      beta: null,
      currency: meta.currency,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow
    },
    bars
  };
}

function drawChart(points) {
  const canvas = chartCanvas;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  if (!points.length) {
    context.fillStyle = "#78716c";
    context.font = "18px Arial";
    context.fillText("Chua co du lieu bieu do.", 24, 48);
    return;
  }

  const padding = 44;
  const closes = points.map((point) => point.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;

  context.strokeStyle = "#eadbd0";
  context.lineWidth = 1;
  for (let index = 0; index < 5; index += 1) {
    const y = padding + ((height - padding * 2) / 4) * index;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  }

  context.beginPath();
  points.forEach((point, index) => {
    const x = padding + ((width - padding * 2) / Math.max(points.length - 1, 1)) * index;
    const y = height - padding - ((point.close - min) / span) * (height - padding * 2);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = "#dc2626";
  context.lineWidth = 3;
  context.stroke();

  const movingAverages = calculateMovingAverages(points);
  [
    { values: movingAverages.ma10, color: "#2563eb" },
    { values: movingAverages.ma50, color: "#047857" },
    { values: movingAverages.ma100, color: "#7c3aed" },
    { values: movingAverages.ma200, color: "#f59e0b" }
  ].forEach((series) => {
    context.beginPath();
    let started = false;
    series.values.forEach((value, index) => {
      if (value === null) return;
      const x = padding + ((width - padding * 2) / Math.max(points.length - 1, 1)) * index;
      const y = height - padding - ((value - min) / span) * (height - padding * 2);
      if (!started) {
        context.moveTo(x, y);
        started = true;
      } else {
        context.lineTo(x, y);
      }
    });
    context.strokeStyle = series.color;
    context.lineWidth = 2;
    context.stroke();
  });

  context.fillStyle = "#78716c";
  context.font = "13px Arial";
  context.fillText(formatPrice(max), 8, padding + 4);
  context.fillText(formatPrice(min), 8, height - padding + 4);
  context.fillText(safeText(points[0].time), padding, height - 12);
  context.fillText(safeText(points[points.length - 1].time), width - padding - 90, height - 12);
}

function calculateRsi(points, period = 14) {
  const values = points.map((point) => point.close);
  const rsi = Array(values.length).fill(null);
  if (values.length <= period) return rsi;

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  rsi[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    rsi[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }

  return rsi;
}

function calculateSma(points, period) {
  const values = points.map((point) => point.close);
  const sma = Array(values.length).fill(null);
  let sum = 0;

  values.forEach((value, index) => {
    sum += value;
    if (index >= period) {
      sum -= values[index - period];
    }
    if (index >= period - 1) {
      sma[index] = sum / period;
    }
  });

  return sma;
}

function calculateMovingAverages(points) {
  return {
    ma10: calculateSma(points, 10),
    ma50: calculateSma(points, 50),
    ma100: calculateSma(points, 100),
    ma200: calculateSma(points, 200)
  };
}

function calculateEma(values, period) {
  const ema = Array(values.length).fill(null);
  if (values.length < period) return ema;

  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let index = 0; index < period; index += 1) {
    sum += values[index];
  }
  ema[period - 1] = sum / period;

  for (let index = period; index < values.length; index += 1) {
    ema[index] = (values[index] - ema[index - 1]) * multiplier + ema[index - 1];
  }

  return ema;
}

function calculateMacd(points) {
  const closes = points.map((point) => point.close);
  const ema12 = calculateEma(closes, 12);
  const ema26 = calculateEma(closes, 26);
  const macd = closes.map((_, index) => {
    if (ema12[index] === null || ema26[index] === null) return null;
    return ema12[index] - ema26[index];
  });

  const signal = Array(macd.length).fill(null);
  const validMacd = macd.filter((value) => value !== null);
  const signalValues = calculateEma(validMacd, 9);
  let validIndex = 0;
  macd.forEach((value, index) => {
    if (value === null) return;
    signal[index] = signalValues[validIndex];
    validIndex += 1;
  });

  const histogram = macd.map((value, index) => {
    if (value === null || signal[index] === null) return null;
    return value - signal[index];
  });

  return { macd, signal, histogram };
}

function drawLineCanvas(canvas, values, options = {}) {
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  const numericValues = values.filter((value) => value !== null);
  if (!numericValues.length) {
    context.fillStyle = "#78716c";
    context.font = "16px Arial";
    context.fillText("Chua du du lieu.", 18, 38);
    return;
  }

  const padding = 34;
  const min = options.min ?? Math.min(...numericValues);
  const max = options.max ?? Math.max(...numericValues);
  const span = max - min || 1;

  context.strokeStyle = "#eadbd0";
  context.lineWidth = 1;
  for (let index = 0; index < 4; index += 1) {
    const y = padding + ((height - padding * 2) / 3) * index;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  }

  (options.guides || []).forEach((guide) => {
    const y = height - padding - ((guide.value - min) / span) * (height - padding * 2);
    context.strokeStyle = guide.color;
    context.setLineDash([6, 5]);
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = guide.color;
    context.font = "12px Arial";
    context.fillText(guide.label, width - padding - 28, y - 4);
  });

  context.beginPath();
  values.forEach((value, index) => {
    if (value === null) return;
    const x = padding + ((width - padding * 2) / Math.max(values.length - 1, 1)) * index;
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    if (index === values.findIndex((item) => item !== null)) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = options.color || "#dc2626";
  context.lineWidth = 2.5;
  context.stroke();
}

function drawMacdCanvas(canvas, macdData) {
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  const allValues = [...macdData.macd, ...macdData.signal, ...macdData.histogram].filter((value) => value !== null);
  if (!allValues.length) {
    context.fillStyle = "#78716c";
    context.font = "16px Arial";
    context.fillText("Chua du du lieu.", 18, 38);
    return;
  }

  const padding = 34;
  const maxAbs = Math.max(...allValues.map((value) => Math.abs(value))) || 1;
  const min = -maxAbs;
  const max = maxAbs;
  const span = max - min;

  const yFor = (value) => height - padding - ((value - min) / span) * (height - padding * 2);
  const xFor = (index) => padding + ((width - padding * 2) / Math.max(macdData.macd.length - 1, 1)) * index;

  context.strokeStyle = "#eadbd0";
  context.lineWidth = 1;
  [min, 0, max].forEach((value) => {
    const y = yFor(value);
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  });

  macdData.histogram.forEach((value, index) => {
    if (value === null) return;
    const x = xFor(index);
    const zeroY = yFor(0);
    const y = yFor(value);
    context.strokeStyle = value >= 0 ? "#047857" : "#b91c1c";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x, zeroY);
    context.lineTo(x, y);
    context.stroke();
  });

  [
    { values: macdData.macd, color: "#dc2626" },
    { values: macdData.signal, color: "#2563eb" }
  ].forEach((line) => {
    context.beginPath();
    let started = false;
    line.values.forEach((value, index) => {
      if (value === null) return;
      const x = xFor(index);
      const y = yFor(value);
      if (!started) {
        context.moveTo(x, y);
        started = true;
      } else {
        context.lineTo(x, y);
      }
    });
    context.strokeStyle = line.color;
    context.lineWidth = 2;
    context.stroke();
  });
}

function renderIndicators(bars) {
  const rsi = calculateRsi(bars);
  const macd = calculateMacd(bars);
  const latestRsi = [...rsi].reverse().find((value) => value !== null);
  const latestMacd = [...macd.macd].reverse().find((value) => value !== null);
  const latestSignal = [...macd.signal].reverse().find((value) => value !== null);

  fields.rsiValue.textContent = latestRsi === undefined ? "-" : formatNumber(latestRsi, 2);
  fields.macdValue.textContent = latestMacd === undefined
    ? "-"
    : `${formatNumber(latestMacd, 2)} / Signal ${formatOptional(latestSignal, 2)}`;

  drawLineCanvas(rsiCanvas, rsi, {
    min: 0,
    max: 100,
    color: "#dc2626",
    guides: [
      { value: 70, color: "#b91c1c", label: "70" },
      { value: 30, color: "#047857", label: "30" }
    ]
  });
  drawMacdCanvas(macdCanvas, macd);

  return { rsi, macd };
}

function renderInvestorFlow() {
  fields.foreignBuy.textContent = "-";
  fields.foreignSell.textContent = "-";
  fields.foreignNet.textContent = "-";
  fields.domesticBuy.textContent = "-";
  fields.domesticSell.textContent = "-";
  fields.domesticNet.textContent = "-";
  fields.flowStatus.textContent = "Yahoo Finance khong co du lieu nay";
}

function renderHistory(bars) {
  const rows = bars
    .map((bar, index) => {
      const previousClose = index > 0 ? bars[index - 1].close : null;
      const changePercent = previousClose ? ((bar.close - previousClose) / previousClose) * 100 : null;
      return { ...bar, changePercent };
    })
    .slice(-60)
    .reverse();

  fields.historyCount.textContent = `${rows.length} phien gan nhat`;
  fields.historyBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${safeText(row.time)}</td>
      <td>${formatPrice(row.open)}</td>
      <td>${formatPrice(row.high)}</td>
      <td>${formatPrice(row.low)}</td>
      <td class="${valueClass(row.changePercent)}">${formatPrice(row.close)}</td>
      <td class="${valueClass(row.changePercent)}">${formatPercent(row.changePercent)}</td>
      <td>${formatInteger(row.volume)}</td>
    </tr>
  `).join("");
}

function renderPriceChanges(bars) {
  const latest = bars[bars.length - 1]?.close;
  const periods = [3, 7, 10, 14, 21, 30];

  periods.forEach((period) => {
    const target = fields[`change${period}`];
    const compare = bars[bars.length - 1 - period]?.close;
    const change = latest && compare ? ((latest - compare) / compare) * 100 : null;
    target.textContent = formatPercent(change);
    target.classList.remove("positive", "negative");
    const className = valueClass(change);
    if (className) target.classList.add(className);
  });
}

function updatePriceColor(price, reference, target) {
  target.classList.remove("positive", "negative", "ceiling", "floor");
  const current = toNumber(price);
  const ref = toNumber(reference);
  if (current === null || ref === null) return;
  if (current > ref) target.classList.add("positive");
  if (current < ref) target.classList.add("negative");
}

function renderMovingAverages(bars) {
  const movingAverages = calculateMovingAverages(bars);
  const latestValue = (series) => [...series].reverse().find((value) => value !== null);
  const currentPrice = bars[bars.length - 1]?.close;
  const renderMa = (target, value) => {
    target.textContent = formatOptional(value, 2);
    target.classList.remove("positive", "negative");
    if (toNumber(value) === null || toNumber(currentPrice) === null) return;
    if (currentPrice > value) target.classList.add("positive");
    if (currentPrice < value) target.classList.add("negative");
  };

  renderMa(fields.ma10, latestValue(movingAverages.ma10));
  renderMa(fields.ma50, latestValue(movingAverages.ma50));
  renderMa(fields.ma100, latestValue(movingAverages.ma100));
  renderMa(fields.ma200, latestValue(movingAverages.ma200));

  return movingAverages;
}

function latestNonNull(series) {
  return [...series].reverse().find((value) => value !== null);
}

function escapeHtml(value) {
  return safeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function average(values) {
  const filtered = values.filter((value) => toNumber(value) !== null);
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function findSupportResistance(bars, currentPrice) {
  const recent = bars.slice(-80);
  const supports = recent
    .map((bar) => bar.low)
    .filter((value) => toNumber(value) !== null && value < currentPrice)
    .sort((a, b) => b - a);
  const resistances = recent
    .map((bar) => bar.high)
    .filter((value) => toNumber(value) !== null && value > currentPrice)
    .sort((a, b) => a - b);

  return {
    support1: supports[0] ?? null,
    support2: supports[Math.min(9, supports.length - 1)] ?? null,
    resistance1: resistances[0] ?? null,
    resistance2: resistances[Math.min(9, resistances.length - 1)] ?? null
  };
}

function scoreStock(symbol, quote, overview, bars, movingAverages, indicators) {
  const latestBar = bars[bars.length - 1] || {};
  const currentPrice = quote.price ?? latestBar.close;
  const ma50 = latestNonNull(movingAverages.ma50);
  const ma100 = latestNonNull(movingAverages.ma100);
  const ma200 = latestNonNull(movingAverages.ma200);
  const latestRsi = latestNonNull(indicators.rsi);
  const latestMacd = latestNonNull(indicators.macd.macd);
  const latestSignal = latestNonNull(indicators.macd.signal);
  const latestHistogram = latestNonNull(indicators.macd.histogram);
  const change30 = bars.length > 31 ? ((currentPrice - bars[bars.length - 31].close) / bars[bars.length - 31].close) * 100 : null;
  const volumes = bars.map((bar) => bar.volume);
  const avgVolume20 = average(volumes.slice(-20));
  const avgVolume60 = average(volumes.slice(-60));
  const latestVolume = latestBar.volume;
  const levels = findSupportResistance(bars, currentPrice);
  const stopPrice = levels.support1 ? levels.support1 * 0.98 : currentPrice * 0.95;
  const targetPrice = levels.resistance1 || currentPrice * 1.15;
  const riskPercent = ((currentPrice - stopPrice) / currentPrice) * 100;
  const rewardPercent = ((targetPrice - currentPrice) / currentPrice) * 100;
  const riskReward = riskPercent > 0 ? rewardPercent / riskPercent : null;

  let trendScore = 0;
  if (currentPrice > ma50) trendScore += 6;
  if (currentPrice > ma200) trendScore += 5;
  if (ma50 > ma100) trendScore += 5;
  if (ma100 > ma200) trendScore += 5;
  if (toNumber(change30) !== null && change30 > 0) trendScore += 4;
  trendScore = Math.min(trendScore, 25);

  let volumeScore = 4;
  if (latestVolume && avgVolume20 && latestVolume >= avgVolume20) volumeScore += 6;
  if (avgVolume20 && avgVolume60 && avgVolume20 >= avgVolume60) volumeScore += 5;
  if (toNumber(change30) !== null && change30 > 0) volumeScore += 3;
  if (latestVolume) volumeScore += 2;
  volumeScore = Math.min(volumeScore, 20);

  let rsiScore = 5;
  if (latestRsi >= 50 && latestRsi <= 65) rsiScore = 10;
  else if (latestRsi > 65 && latestRsi <= 75) rsiScore = 8;
  else if (latestRsi >= 40 && latestRsi < 50) rsiScore = 7;
  else if (latestRsi >= 30 && latestRsi < 40) rsiScore = 6;
  else if (latestRsi > 75) rsiScore = 5;
  else if (latestRsi < 30) rsiScore = 4;

  let macdScore = 3;
  if (latestMacd > latestSignal) macdScore += 4;
  if (latestHistogram > 0) macdScore += 2;
  if (latestMacd > 0) macdScore += 1;
  macdScore = Math.min(macdScore, 10);

  const distanceToSupport = levels.support1 ? ((currentPrice - levels.support1) / currentPrice) * 100 : null;
  let srScore = 4;
  if (distanceToSupport !== null && distanceToSupport <= 5) srScore += 3;
  if (riskReward !== null && riskReward >= 2) srScore += 2;
  if (levels.resistance1) srScore += 1;
  srScore = Math.min(srScore, 10);

  const fundamentalScore = overview.name && overview.name !== symbol ? 6 : 5;
  const industryScore = overview.exchange ? 6 : 5;
  let rrScore = 2;
  if (riskReward >= 3) rrScore = 5;
  else if (riskReward >= 2) rrScore = 4;
  else if (riskReward >= 1.3) rrScore = 3;

  const total = trendScore + volumeScore + rsiScore + macdScore + srScore + fundamentalScore + industryScore + rrScore;

  return {
    total,
    trendScore,
    volumeScore,
    rsiScore,
    macdScore,
    srScore,
    fundamentalScore,
    industryScore,
    rrScore,
    currentPrice,
    ma50,
    ma100,
    ma200,
    latestRsi,
    latestMacd,
    latestSignal,
    latestHistogram,
    change30,
    avgVolume20,
    avgVolume60,
    latestVolume,
    levels,
    stopPrice,
    targetPrice,
    riskPercent,
    rewardPercent,
    riskReward
  };
}

function conclusionForScore(total) {
  if (total >= 85) return "Mua rat manh theo he thong";
  if (total >= 75) return "Mua manh theo he thong";
  if (total >= 65) return "Theo doi mua / mua tung phan";
  if (total >= 50) return "Trung tinh, can them tin hieu xac nhan";
  return "Yeu, chua nen uu tien";
}

function renderScoreAnalysis(symbol, quote, overview, bars, movingAverages, indicators) {
  const score = scoreStock(symbol, quote, overview, bars, movingAverages, indicators);
  const name = safeText(overview.name) !== "-" ? overview.name : symbol;
  const macdState = score.latestMacd > score.latestSignal ? "MACD dang nam tren Signal" : "MACD dang nam duoi Signal";
  const trendState = score.currentPrice > score.ma50 && score.ma50 > score.ma100 && score.ma100 > score.ma200
    ? "Xu huong gia dang rat tich cuc: gia tren MA50 va MA50 > MA100 > MA200."
    : "Xu huong chua dong thuan hoan toan giua gia va cac duong MA lon.";
  const rsiState = score.latestRsi >= 50 && score.latestRsi <= 65
    ? "RSI nam trong vung khoe, chua qua nong."
    : score.latestRsi > 70
      ? "RSI dang cao, can de y rui ro rung lac ngan han."
      : "RSI chua cho tin hieu suc manh ro rang.";
  const rrText = score.riskReward === null ? "-" : `${formatNumber(score.riskReward, 2)} : 1`;
  const upgradeText = [
    score.latestMacd <= score.latestSignal ? "MACD cat len Signal" : null,
    score.latestRsi < 55 ? "RSI vuot lai tren 55" : null,
    score.levels.resistance1 ? `Gia vuot ${formatPrice(score.levels.resistance1)} voi volume tot` : "Gia vuot khang cu gan",
    score.latestVolume < score.avgVolume20 ? "Volume vuot trung binh 20 phien" : null
  ].filter(Boolean);

  fields.scoreTotalBadge.textContent = `${score.total}/100 diem`;
  fields.scoreAnalysis.innerHTML = `
    <div class="score-hero">
      <h3>${escapeHtml(symbol)} - ${escapeHtml(name)}</h3>
      <p><strong>Gia hien tai:</strong> ${formatPrice(score.currentPrice)}</p>
      <p><strong>Ket luan:</strong> ${conclusionForScore(score.total)}.</p>
      <span class="score-tag">${score.total}/100</span>
    </div>

    <div class="score-block">
      <h3>1. Xu huong (${score.trendScore}/25)</h3>
      <p>${trendState}</p>
      <ul class="score-points">
        <li>Gia hien tai: ${formatPrice(score.currentPrice)}</li>
        <li>MA50: ${formatOptional(score.ma50, 2)}, MA100: ${formatOptional(score.ma100, 2)}, MA200: ${formatOptional(score.ma200, 2)}</li>
        <li>Bien dong 30 phien: ${formatPercent(score.change30)}</li>
      </ul>
    </div>

    <div class="score-block">
      <h3>2. Volume - Dong tien (${score.volumeScore}/20)</h3>
      <p>Thanh khoan phien gan nhat duoc so sanh voi trung binh 20 va 60 phien.</p>
      <ul class="score-points">
        <li>Volume gan nhat: ${formatInteger(score.latestVolume)}</li>
        <li>Volume TB20: ${formatInteger(score.avgVolume20)}</li>
        <li>Volume TB60: ${formatInteger(score.avgVolume60)}</li>
      </ul>
    </div>

    <div class="score-block">
      <h3>3. RSI (${score.rsiScore}/10)</h3>
      <p>${rsiState}</p>
      <p>RSI 14 hien tai: <strong>${formatOptional(score.latestRsi, 2)}</strong>.</p>
    </div>

    <div class="score-block">
      <h3>4. MACD (${score.macdScore}/10)</h3>
      <p>${macdState}. Histogram hien tai: ${formatOptional(score.latestHistogram, 2)}.</p>
      <p>MACD: ${formatOptional(score.latestMacd, 2)} / Signal: ${formatOptional(score.latestSignal, 2)}.</p>
    </div>

    <div class="score-block">
      <h3>5. Ho tro - Khang cu (${score.srScore}/10)</h3>
      <ul class="score-points">
        <li>Ho tro gan: ${formatPrice(score.levels.support1)}</li>
        <li>Ho tro sau: ${formatPrice(score.levels.support2)}</li>
        <li>Khang cu gan: ${formatPrice(score.levels.resistance1)}</li>
        <li>Khang cu sau: ${formatPrice(score.levels.resistance2)}</li>
      </ul>
    </div>

    <div class="score-block">
      <h3>6. Co ban - Tin tuc (${score.fundamentalScore}/10)</h3>
      <p>Nguon du lieu hien tai chua co tin tuc va bao cao co ban chi tiet, nen diem nay duoc cham o muc trung tinh. Nen bo sung du lieu tin tuc/API co ban neu muon cham sau hon.</p>
    </div>

    <div class="score-block">
      <h3>7. Suc manh nganh (${score.industryScore}/10)</h3>
      <p>Yahoo Finance khong cung cap day du suc manh nganh theo thi truong Viet Nam trong app hien tai, nen diem nay la diem trung tinh co dieu kien.</p>
    </div>

    <div class="score-block">
      <h3>8. Risk / Reward (${score.rrScore}/5)</h3>
      <ul class="score-points">
        <li>Gia mua tham chieu: ${formatPrice(score.currentPrice)}</li>
        <li>Cat lo goi y: ${formatPrice(score.stopPrice)} (${formatPercent(-score.riskPercent)})</li>
        <li>Muc tieu gan: ${formatPrice(score.targetPrice)} (${formatPercent(score.rewardPercent)})</li>
        <li>Ty le Reward/Risk: ${rrText}</li>
      </ul>
    </div>

    <div class="score-block">
      <h3>Tong diem</h3>
      <div class="table-wrap score-table-wrap">
        <table class="score-table">
          <thead><tr><th>Tieu chi</th><th>Diem</th></tr></thead>
          <tbody>
            <tr><td>Xu huong</td><td>${score.trendScore}/25</td></tr>
            <tr><td>Volume - Dong tien</td><td>${score.volumeScore}/20</td></tr>
            <tr><td>RSI</td><td>${score.rsiScore}/10</td></tr>
            <tr><td>MACD</td><td>${score.macdScore}/10</td></tr>
            <tr><td>Ho tro / Khang cu</td><td>${score.srScore}/10</td></tr>
            <tr><td>Co ban - Tin tuc</td><td>${score.fundamentalScore}/10</td></tr>
            <tr><td>Suc manh nganh</td><td>${score.industryScore}/10</td></tr>
            <tr><td>Risk / Reward</td><td>${score.rrScore}/5</td></tr>
            <tr class="total-row"><td>Tong</td><td>${score.total}/100</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="score-block">
      <h3>Ket luan va ke hoach</h3>
      <p><strong>${escapeHtml(symbol)} = ${score.total}/100.</strong> ${conclusionForScore(score.total)}.</p>
      <p>Neu tham gia, co the chia vi the theo tung phan thay vi mua mot lan: mot phan o vung hien tai, mot phan khi MACD xac nhan, va mot phan khi gia vuot khang cu voi volume tot.</p>
      <p>Dieu kien de nang diem: ${upgradeText.length ? upgradeText.join("; ") : "cac tin hieu ky thuat chinh hien da kha tich cuc, can duy tri thanh khoan va xu huong."}</p>
    </div>
  `;

  return score;
}

function fillData(symbol, quote, overview, bars) {
  const latestBar = bars[bars.length - 1] || {};
  const previousBar = bars[bars.length - 2] || {};
  const currentPrice = latestBar.close ?? quote.price;
  const reference = previousBar.close ?? quote.referencePrice;
  const change = toNumber(currentPrice) !== null && toNumber(reference) !== null
    ? toNumber(currentPrice) - toNumber(reference)
    : null;
  const changePercent = toNumber(change) !== null && toNumber(reference)
    ? (toNumber(change) / toNumber(reference)) * 100
    : null;

  fields.exchange.textContent = `${symbol} ${overview.exchange || quote.exchange ? "- " + safeText(overview.exchange || quote.exchange) : ""}`;
  fields.companyName.textContent = safeText(overview.name) !== "-" ? overview.name : symbol;
  fields.companyDescription.textContent = safeText(overview.description) !== "-"
    ? overview.description
    : "Du lieu duoc lay tu nguon cong khai TCBS. Mot so truong co the trong tuy theo ma co phieu.";
  fields.currentPrice.textContent = formatPrice(currentPrice);
  fields.priceChange.textContent = `${toNumber(change) > 0 ? "+" : ""}${formatPrice(change)} (${formatPercent(changePercent)})`;
  updatePriceColor(currentPrice, reference, fields.priceChange);

  fields.referencePrice.textContent = formatPrice(reference);
  fields.ceilingPrice.textContent = formatPrice(quote.ceilingPrice);
  fields.ceilingPrice.classList.add("ceiling");
  fields.floorPrice.textContent = formatPrice(quote.floorPrice);
  fields.floorPrice.classList.add("floor");
  fields.highPrice.textContent = formatPrice(quote.highPrice ?? latestBar.high);
  fields.lowPrice.textContent = formatPrice(quote.lowPrice ?? latestBar.low);
  fields.volume.textContent = formatInteger(quote.volume ?? latestBar.volume);

  fields.ticker.textContent = symbol;
  fields.listedExchange.textContent = safeText(overview.exchange || quote.exchange);
  fields.industry.textContent = safeText(overview.industry);
  fields.sector.textContent = safeText(overview.sector);
  fields.marketCap.textContent = formatLargeNumber(overview.marketCap);
  fields.peRatio.textContent = safeText(overview.pe);
  fields.pbRatio.textContent = safeText(overview.pb);
  fields.roe.textContent = overview.roe ? formatPercent(overview.roe) : "-";
  fields.eps.textContent = safeText(overview.eps);
  fields.beta.textContent = safeText(overview.beta);

  drawChart(bars);
  const movingAverages = renderMovingAverages(bars);
  const indicators = renderIndicators(bars);
  renderPriceChanges(bars);
  renderInvestorFlow();
  renderHistory(bars);
  const score = renderScoreAnalysis(symbol, quote, overview, bars, movingAverages, indicators);
  fields.chartRange.textContent = `${bars.length} phien gan nhat`;
  return { movingAverages, indicators, score };
}

async function loadVietnamStock(symbol) {
  setMessage("Dang tai du lieu...");

  let parsed = null;
  let lastError = null;
  const candidates = makeYahooCandidates(symbol);

  for (const candidate of candidates) {
    try {
      const raw = await requestJson(`/v8/finance/chart/${encodeURIComponent(candidate)}?range=2y&interval=1d`);
      parsed = parseYahooChart(raw);
      if (parsed && parsed.bars.length) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!parsed || !parsed.bars.length) {
    throw new Error(lastError?.message || "Khong tim thay ma chung khoan Viet Nam nay tren Yahoo Finance.");
  }

  const quote = parsed.quote;
  const overview = parsed.overview;
  const bars = parsed.bars.slice(-260);

  const analysis = fillData(symbol, quote, overview, bars);
  latestPayload = {
    source: "Yahoo Finance chart API",
    symbol,
    resolvedSymbol: quote.ticker,
    quote,
    overview,
    recentBars: bars.slice(-30),
    indicators: {
      rsi14: fields.rsiValue.textContent,
      macd: fields.macdValue.textContent,
      movingAverages: {
        ma10: fields.ma10.textContent,
        ma50: fields.ma50.textContent,
        ma100: fields.ma100.textContent,
        ma200: fields.ma200.textContent
      }
    },
    score: analysis.score,
    investorFlow: {
      status: "Yahoo Finance khong cung cap du lieu mua/ban theo nhom nha dau tu"
    }
  };
  fields.rawData.textContent = JSON.stringify(latestPayload, null, 2);
  fields.lastUpdated.textContent = `Cap nhat: ${new Date().toLocaleString("vi-VN")}`;
  setMessage("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const symbol = symbolInput.value.trim().toUpperCase();

  if (!symbol) {
    setMessage("Hay nhap ma chung khoan Viet Nam.");
    symbolInput.focus();
    return;
  }

  try {
    await loadVietnamStock(symbol);
  } catch (error) {
    setMessage(error.message || "Khong tai duoc du lieu.");
  }
});

quickSymbols.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-symbol]");
  if (!button) return;
  symbolInput.value = button.dataset.symbol;
  form.requestSubmit();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
});

copyButton.addEventListener("click", async () => {
  if (!latestPayload) {
    setMessage("Chua co du lieu de copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(latestPayload, null, 2));
    setMessage("Da copy JSON.");
  } catch {
    setMessage("Khong copy duoc. Hay boi den phan JSON va copy thu cong.");
  }
});

drawChart([]);
drawLineCanvas(rsiCanvas, []);
drawMacdCanvas(macdCanvas, { macd: [], signal: [], histogram: [] });
symbolInput.focus();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // Service worker chi hoat dong tren HTTPS hoac localhost.
    });
  });
}

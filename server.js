const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = 3000;

let browser = null;
let page = null;

let cache = { updatedAt: 0, events: [] };
let lastScores = {};

async function initBrowser() {
  if (browser) return;

  browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  page = await browser.newPage();
}

function mapEvent(e) {
  const home = e.homeTeam?.name ?? "?";
  const away = e.awayTeam?.name ?? "?";
  const homeScore = e.homeScore?.current ?? null;
  const awayScore = e.awayScore?.current ?? null;

  const minute = e.time?.currentPeriodStartTimestamp
    ? Math.floor((Date.now() / 1000 - e.time.currentPeriodStartTimestamp) / 60)
    : null;

  return {
    id: e.id,
    league: e.tournament?.name ?? null,
    home,
    away,
    homeScore,
    awayScore,
    minute,
    status: e.status?.description ?? null,
  };
}

function detectGoals(events) {
  for (const e of events) {
    const key = e.id;
    const score = `${e.homeScore ?? "-"}-${e.awayScore ?? "-"}`;

    if (lastScores[key] && lastScores[key] !== score) {
      process.stdout.write("\x07"); // bip
      console.log(`GOOOL! ${e.home} ${score} ${e.away}`);
    }
    lastScores[key] = score;
  }
}

async function refreshCache() {
  await initBrowser();

  await page.goto(
    "https://api.sofascore.com/api/v1/sport/football/events/live",
    { waitUntil: "networkidle2" }
  );

  const content = await page.evaluate(() => document.body.innerText);
  const data = JSON.parse(content);

  const events = (data.events || []).map(mapEvent);
  cache = { updatedAt: Date.now(), events };

  detectGoals(events);
}

// İlk yükleme
refreshCache().catch((err) =>
  console.log("initial refresh error:", err?.message || err)
);

// 15 saniyede bir yenile
setInterval(() => {
  refreshCache().catch((err) =>
    console.log("refresh error:", err?.message || err)
  );
}, 15000);

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/", (req, res) => {
  res.send("Papazscore API OK. Use /live");
});

app.get("/live", (req, res) => {
  res.json(cache);
});

process.on("SIGINT", async () => {
  try {
    if (browser) await browser.close();
  } finally {
    process.exit(0);
  }
});

app.listen(PORT, () => {
  console.log(`Papazscore API running: http://localhost:${PORT}`);
  console.log(`Live endpoint: http://localhost:${PORT}/live`);
});
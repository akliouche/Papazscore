const puppeteer = require("puppeteer");

let lastSnapshot = {};

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  async function fetchAndPrint() {
    await page.goto(
      "https://api.sofascore.com/api/v1/sport/football/events/live",
      { waitUntil: "networkidle2" }
    );

    const content = await page.evaluate(() => document.body.innerText);
    const data = JSON.parse(content);

    console.clear();
    console.log("PAPAZSCORE — CANLI MAÇLAR\n");

    for (const e of data.events) {
      const id = e.id;

      const home = e.homeTeam?.name ?? "?";
      const away = e.awayTeam?.name ?? "?";
      const hs = e.homeScore?.current ?? "-";
      const as = e.awayScore?.current ?? "-";

      const minute = e.time?.currentPeriodStartTimestamp
        ? Math.floor((Date.now() / 1000 - e.time.currentPeriodStartTimestamp) / 60)
        : (e.status?.description ?? "");

      const snapshot = `${hs}-${as}-${minute}`;

      if (lastSnapshot[id] !== snapshot) {
        console.log(`${home} ${hs}-${as} ${away} | ${minute}'`);
        lastSnapshot[id] = snapshot;
      }
    }
  }

  await fetchAndPrint();
  setInterval(fetchAndPrint, 30000); // 30 saniye
})();

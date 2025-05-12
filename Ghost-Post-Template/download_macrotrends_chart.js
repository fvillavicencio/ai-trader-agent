const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = 'https://www.macrotrends.net/1324/s-p-500-earnings-history';
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, {waitUntil: 'networkidle2'});

  // Take a screenshot after page load for debugging
  await page.screenshot({ path: 'macrotrends_debug.png', fullPage: true });

  // Try to close cookie consent if present
  try {
    const cookieButton = await page.$('button#ez-accept-all, .ez-accept-all');
    if (cookieButton) {
      await cookieButton.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {}

  // Try to find the Export Image button
  const exportBtn = await page.$('#chartExport');
  if (!exportBtn) {
    console.error('Export button not found. Check macrotrends_debug.png for page state.');
    await browser.close();
    process.exit(1);
  }

  await exportBtn.click();

  // Wait for the modal and image to appear
  await page.waitForSelector('#smallWidthModal img', {timeout: 10000});
  const imgSrc = await page.$eval('#smallWidthModal img', img => img.src);

  // Download the image
  const viewSource = await page.goto(imgSrc);
  fs.writeFileSync('sp500_eps_macrotrends.png', await viewSource.buffer());

  // Generate HTML
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>S&P 500 EPS (TTM) - Macrotrends</title>
  </head>
  <body>
    <h2>S&P 500 EPS (TTM)</h2>
    <a href="https://www.macrotrends.net/1324/s-p-500-earnings-history" target="_blank">Source: Macrotrends</a>
    <br><br>
    <img src="sp500_eps_macrotrends.png" alt="S&P 500 EPS (TTM) Macrotrends Chart" style="max-width: 100%; height: auto;">
  </body>
  </html>
  `;
  fs.writeFileSync('sp500_eps_chart.html', html);

  await browser.close();
  console.log('Done! Chart image and HTML generated.');
})();

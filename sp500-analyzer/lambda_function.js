const playwright = require('playwright-core');

exports.handler = async (event) => {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--disable-dev-shm-usage'
    ]
  });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  const title = await page.title();
  await browser.close();
  return {
    statusCode: 200,
    body: `Page title: ${title}`
  };
};

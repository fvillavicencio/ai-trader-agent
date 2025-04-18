// Debug: Log loaded package.json
console.log('Loaded package.json:', require('./package.json'));

const { chromium } = require('playwright');

exports.lambda_handler = async (event, context) => {
  let browser = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--single-process']
    });
    const page = await browser.newPage();
    await page.goto(event.url || 'https://example.com');
    const title = await page.title();
    return { statusCode: 200, body: `Page title: ${title}` };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  } finally {
    if (browser) await browser.close();
  }
};

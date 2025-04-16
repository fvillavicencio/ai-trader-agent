import axios from 'axios';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const YARDENI_PDF_URL = 'https://archive.yardeni.com/pub/yriearningsforecast.pdf';

/**
 * Fetches Yardeni S&P 500 forward EPS estimates for 2025 and 2026 from the latest PDF.
 * Returns an array: [{ source, url, year, eps }]
 */
export async function getForwardEpsEstimates() {
  // Download the latest Yardeni PDF
  const response = await axios.get(YARDENI_PDF_URL, { responseType: 'arraybuffer' });
  let buffer = response.data;
  if (!(buffer instanceof Buffer)) {
    buffer = Buffer.from(buffer);
  }
  if (typeof pdfParse !== 'function') {
    throw new Error('pdfParse is not a function. Check import.');
  }
  const data = await pdfParse(buffer);
  const text = data.text;

  // Example line: 2025 (290.00)
  const regex = /([12][0-9]{3})\s*\((\d{2,3}\.\d{2})\)/g;
  let match;
  const results = [];
  while ((match = regex.exec(text)) !== null) {
    const year = parseInt(match[1]);
    const eps = parseFloat(match[2]);
    if (year === 2025 || year === 2026) {
      results.push({
        source: 'Yardeni Research',
        url: YARDENI_PDF_URL,
        year,
        eps
      });
    }
  }
  if (results.length === 0) throw new Error('Could not extract EPS estimates from Yardeni PDF');
  return parseScenarios(results);
}

// Helper to add scenario labels and estimate dates if possible
function parseScenarios(results) {
  // If all Yardeni, 2025, assign base/high/low by EPS value
  if (results.length === 3 && results.every(r => r.year === 2025 && r.source === 'Yardeni Research')) {
    const sorted = [...results].sort((a, b) => a.eps - b.eps);
    sorted[0].scenario = 'Low';
    sorted[1].scenario = 'Base';
    sorted[2].scenario = 'High';
    sorted.forEach(r => { r.estimateDate = new Date().toISOString().slice(0,10); }); // Use today if not found
    return sorted;
  }
  // Default: label all as Base
  results.forEach(r => { r.scenario = 'Base'; r.estimateDate = new Date().toISOString().slice(0,10); });
  return results;
}

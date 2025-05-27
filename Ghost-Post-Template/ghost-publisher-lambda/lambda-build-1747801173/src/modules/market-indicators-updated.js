/**
 * Adds the Key Market Indicators section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing market indicators information
 */
const addMarketIndicators = (mobiledoc, data) => {
  if (!data.marketIndicators) return;

  // Find S&P 500 data
  const sp500 = data.marketIndicators.majorIndices?.find(i => i.name === 'S&P 500');
  const sp500Price = sp500?.price ? formatNumber(sp500.price) : '0';
  const sp500Change = sp500?.percentChange || (sp500?.change ? sp500.change + '%' : '0%');
  const sp500IsPositive = sp500?.isPositive !== undefined ? sp500.isPositive : (parseFloat(sp500?.change || 0) >= 0);
  const sp500ChangeIcon = sp500IsPositive ? '↑' : '↓';
  const sp500ChangeSign = sp500IsPositive ? '+' : '';
  const sp500Color = sp500IsPositive ? '#48bb78' : '#f56565';

  // Get Fear & Greed data
  const fearGreedData = data.fearGreed || data.marketIndicators?.fearGreed;
  const fearGreedValue = fearGreedData?.value || 50;
  const fearGreedCategory = fearGreedData?.category || getFearGreedCategory(fearGreedValue);
  const fearGreedColor = getFearGreedColor(fearGreedValue);
  
  // Get VIX data
  const vix = data.marketIndicators?.volatilityIndices?.find(index => index.name.includes('CBOE'));
  const vixValue = vix ? formatNumber(vix.value) : '';
  const vixTrend = vix?.trend || '';
  const vixColor = vixTrend.toLowerCase() === 'rising' ? '#f56565' : '#48bb78';
  
  // Get RSI data
  const rsi = data.rsi || data.marketIndicators?.rsi;
  const showRSI = rsi && rsi.value !== null;
  const rsiValue = showRSI ? rsi.value : '';
  const rsiCategory = showRSI ? (rsi?.category || getRSICategory(parseFloat(rsiValue))) : '';  // Calculate category if not provided
  const rsiColor = showRSI ? getRSIColor(rsiValue) : '';

  // Create the main container with collapsible header
  const html = `
    <div class="market-pulse-section market-indicators-container" style="margin: 0; padding: 0;">
      <div class="collapsible-section" data-section="market-indicators">
        <div class="collapsible-header" style="background-color: white; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start; border: 2px solid #5D4037;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="margin: 0; font-size: 2rem; font-weight: bold; color: black;">Key Market Indicators</div>
            <div class="collapsible-icon" style="font-size: 14px; color: black;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: black; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;">
            <span style="white-space: nowrap;">S&P 500: ${sp500Price} <span style="color: ${sp500Color}">(${sp500ChangeIcon} ${sp500ChangeSign}${sp500Change})</span></span> | 
            <span style="white-space: nowrap;">Fear & Greed Index: <span style="color: ${fearGreedColor}">${fearGreedValue} (${fearGreedCategory})</span></span> | 
            <span style="white-space: nowrap;">VIX: <span style="color: ${vixColor}">${vixValue} (${vixTrend})</span></span>${showRSI ? ` | 
            <span style="white-space: nowrap;">RSI: <span style="color: ${rsiColor}">${rsiValue} (${rsiCategory})</span></span>` : ''}
          </div>
        </div>
        <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
  `;
  
  addHTML(mobiledoc, html);

  // Add individual sections
  addMajorIndices(mobiledoc, data);
  addSectorPerformance(mobiledoc, data);
  addMarketFutures(mobiledoc, data);
  addVolatilityIndices(mobiledoc, data);
  addFearGreedIndex(mobiledoc, data);
  if (showRSI) {
    addRSI(mobiledoc, data);
  }

  // Close the container
  const closingHtml = `
        </div>
      </div>
    </div>
    
    <script>
      // Add click event to toggle collapsible sections
      document.addEventListener('DOMContentLoaded', function() {
        const headers = document.querySelectorAll('.collapsible-header');
        headers.forEach(header => {
          header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const icon = this.querySelector('.collapsible-icon');
            
            // Toggle display
            if (content.style.maxHeight) {
              content.style.maxHeight = null;
              icon.textContent = '▼';
            } else {
              content.style.maxHeight = content.scrollHeight + "px";
              icon.textContent = '▲';
            }
          });
        });
      });
    </script>
  `;
  
  addHTML(mobiledoc, closingHtml);
};

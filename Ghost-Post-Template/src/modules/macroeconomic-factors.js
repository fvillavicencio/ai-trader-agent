/**
 * Macroeconomic Factors Module
 * Generates the Macroeconomic Factors section of the Ghost post
 */

const { addHeading, addHTML, addDivider } = require('../utils/mobiledoc-helpers');

/**
 * Adds the Treasury Yields section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing treasury yields information
 */
const addTreasuryYields = (data) => {
  const treasuryYields = data.macroeconomicFactors?.treasuryYields || {};
  const yieldCurve = treasuryYields.yieldCurve || {};
  const yields = treasuryYields.current || [];
  
  if (!yields || yields.length === 0) return '';
  
  return `
    <div style="margin-bottom: 30px;">
      <div style="font-weight: bold; margin-bottom: 15px; font-size: clamp(1.1rem, 3vw, 1.25rem);">Treasury Yields</div>
      
      <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px;">
          ${yields.map(yield => `
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="color: #666; font-size: 0.9rem; margin-bottom: 8px;">${yield.maturity}</div>
              <div style="font-size: 1.3rem; font-weight: bold;">${yield.rate.toFixed(2)}%</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-top: 15px; padding-left: 15px; border-left: 4px solid #4caf50;">
        <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 5px;">Yield Curve: ${yieldCurve.status || "Normal"}</div>
        <div style="color: #555; font-size: 0.9rem;">${yieldCurve.description || "The yield curve has a normal positive slope with the 10Y-2Y spread at 0.54%. This typically indicates expectations of economic growth."}</div>
      </div>
      <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
        Source: <a href="${treasuryYields.sourceUrl || "https://fred.stlouisfed.org/"}" target="_blank">${treasuryYields.source || "Federal Reserve Economic Data (FRED)"}</a>, as of ${treasuryYields.asOf || "N/A"}
      </div>
    </div>
  `;
};

/**
 * Adds the Federal Reserve Policy section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing fed policy information
 */
const addFedPolicy = (data) => {
  const fedPolicy = data.macroeconomicFactors?.fedPolicy || {};
  
  if (!fedPolicy) return '';
  
  return `
    <div style="margin-bottom: 30px;">
      <div style="background-color: #13344f; color: white; border-radius: 8px 8px 0 0; padding: 15px; text-align: center;">
        <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 4px;">Federal Reserve Policy</div>
        <div style="font-size: 0.9rem; color: rgba(255,255,255,0.8);">Market Consensus</div>
      </div>
      
      <div style="background-color: white; border-radius: 0 0 8px 8px; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
        <div style="margin-bottom: 20px; line-height: 1.6;">
          ${fedPolicy.guidance || "Recent indicators suggest that economic activity has continued to expand at a solid pace. The unemployment rate has stabilized at a low level in recent months, and labor market conditions remain solid. Inflation remains somewhat elevated."}
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 5px; text-align: right;">
          Source: <a href="${fedPolicy.guidanceSourceUrl || "#"}" target="_blank">${fedPolicy.guidanceSource || "Federal Reserve Press Releases"}</a>, as of ${fedPolicy.guidanceAsOf || "N/A"}
        </div>
        
        <div style="margin-top: 20px; margin-bottom: 15px;">
          <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">Current Federal Funds Rate</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 1.5rem; font-weight: bold; color: #4caf50;">${fedPolicy.currentRate || "4.33%"}</div>
            <div style="color: #666; font-size: 0.9rem;">Range: ${fedPolicy.rateRange || "4.25% - 4.50%"}</div>
          </div>
          <div style="font-size: 10px; color: #888; margin-top: 5px; text-align: right;">
            Source: <a href="${fedPolicy.rateSourceUrl || "#"}" target="_blank">${fedPolicy.rateSource || "Federal Reserve Bank of St. Louis"}</a>, as of ${fedPolicy.rateAsOf || "N/A"}
          </div>
        </div>
        
        <div style="margin-top: 20px; margin-bottom: 15px;">
          <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">Federal Funds Futures</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>Current Price: <span style="font-weight: bold;">${fedPolicy.futuresPrice || "96.08"}</span></div>
            <div>Implied Rate: <span style="font-weight: bold;">${fedPolicy.impliedRate || "3.92%"}</span></div>
          </div>
        </div>
        
        <div style="margin-top: 20px; margin-bottom: 15px;">
          <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">Rate Change Probabilities</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="color: #4caf50;">↓ ${fedPolicy.cutProbability || "68.5"}%</div>
            <div>→ ${fedPolicy.holdProbability || "31.5"}%</div>
            <div style="color: #f44336;">↑ ${fedPolicy.hikeProbability || "0"}%</div>
          </div>
          <div style="font-size: 10px; color: #888; margin-top: 5px; text-align: right;">
            Source: <a href="${fedPolicy.futuresSourceUrl || "#"}" target="_blank">${fedPolicy.futuresSource || "Yahoo Finance"}</a>, as of ${fedPolicy.futuresAsOf || "N/A"}
          </div>
        </div>
        
        <div style="margin-top: 20px;">
          <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">Meeting Schedule</div>
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <div style="color: #666; font-size: 0.9rem; min-width: 0; max-width: 48%;">Last FOMC Meeting - ${fedPolicy.lastMeeting || "March 18-19 2025"}</div>
            <div style="color: #666; font-size: 0.9rem; min-width: 0; max-width: 48%; text-align: right;">Next FOMC Meeting - ${fedPolicy.nextMeeting || "May 6-7 2025"}</div>
          </div>
          <div style="font-size: 10px; color: #888; margin-top: 5px; text-align: right;">
            Source: <a href="${fedPolicy.meetingSourceUrl || "#"}" target="_blank">${fedPolicy.meetingSource || "Federal Reserve Meeting Calendar"}</a>, as of ${fedPolicy.meetingAsOf || "N/A"}
          </div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Adds the Inflation section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing inflation information
 */
const addInflation = (data) => {
  const inflation = data.macroeconomicFactors?.inflation || {};
  const cpi = inflation.cpi || {};
  const pce = inflation.pce || {};
  const expectations = inflation.expectations || [];
  const trend = inflation.trend || {};
  
  if (!inflation) return '';
  
  return `
    <div style="margin-bottom: 30px;">
      <div style="font-weight: bold; margin-bottom: 15px; font-size: clamp(1.1rem, 3vw, 1.25rem);">Inflation</div>
      
      <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
        <!-- CPI Card -->
        <div style="flex: 1; min-width: 250px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background-color: #2196f3; color: white; padding: 12px; text-align: center;">
            <div style="font-size: 1.1rem; font-weight: bold;">Consumer Price Index (CPI)</div>
          </div>
          <div style="padding: 15px; display: flex; justify-content: space-around;">
            <div style="text-align: center;">
              <div style="color: #666; font-size: 0.9rem;">Headline</div>
              <div style="font-size: 1.3rem; font-weight: bold;">${cpi.headline || "2.4"}%</div>
            </div>
            <div style="text-align: center;">
              <div style="color: #666; font-size: 0.9rem;">Core</div>
              <div style="font-size: 1.3rem; font-weight: bold;">${cpi.core || "2.8"}%</div>
            </div>
          </div>
        </div>
        
        <!-- PCE Card -->
        <div style="flex: 1; min-width: 250px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background-color: #ff9800; color: white; padding: 8px; text-align: center;">
            <div style="font-size: 1rem; font-weight: bold;">Personal Consumption Expenditure (PCE)</div>
          </div>
          <div style="padding: 15px; display: flex; justify-content: space-around;">
            <div style="text-align: center;">
              <div style="color: #666; font-size: 0.9rem;">Headline</div>
              <div style="font-size: 1.3rem; font-weight: bold;">${pce.headline || "2.3"}%</div>
            </div>
            <div style="text-align: center;">
              <div style="color: #666; font-size: 0.9rem;">Core</div>
              <div style="font-size: 1.3rem; font-weight: bold;">${pce.core || "2.6"}%</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Inflation Expectations -->
      <div style="background-color: #13344f; color: white; border-radius: 8px 8px 0 0; padding: 15px; text-align: center; margin-top: 20px;">
        <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 4px;">Inflation Expectations</div>
        <div style="font-size: 0.9rem; color: rgba(255,255,255,0.8);">Market Consensus</div>
      </div>
      <div style="background-color: white; border-radius: 0 0 8px 8px; padding: 20px; border: 1px solid #e2e8f0; border-top: none; margin-bottom: 20px;">
        <div style="display: flex; flex-wrap: wrap; justify-content: space-around; gap: 15px;">
          ${expectations.map(exp => `
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">${exp.period}</div>
              <div style="font-size: 1.3rem; font-weight: bold;">${exp.value}%</div>
            </div>
          `).join('') || `
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">1-Year</div>
              <div style="font-size: 1.3rem; font-weight: bold;">2.89%</div>
            </div>
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">5-Year</div>
              <div style="font-size: 1.3rem; font-weight: bold;">2.29%</div>
            </div>
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">10-Year</div>
              <div style="font-size: 1.3rem; font-weight: bold;">2.23%</div>
            </div>
          `}
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
          Source: <a href="${inflation.expectationsSource?.url || "#"}" target="_blank">${inflation.expectationsSource?.name || "St. Louis Fed (FRED API)"}</a>, as of ${inflation.expectationsSource?.lastUpdated || inflation.lastUpdated || "N/A"}
        </div>
      </div>
      
      <!-- Inflation Trend Analysis -->
      <div style="background-color: #4caf50; color: white; border-radius: 8px 8px 0 0; padding: 15px; text-align: center;">
        <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 4px;">Inflation Trend Analysis</div>
        <div style="font-size: 0.9rem; color: rgba(255,255,255,0.8);">Current Market Insights</div>
      </div>
      <div style="background-color: white; border-radius: 0 0 8px 8px; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 15px;">
          <div style="flex: 1; min-width: 100px; text-align: center;">
            <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px; font-weight: bold;">Trend</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: #4caf50;">${trend.direction || "Stable"}</div>
          </div>
          <div style="flex: 2; min-width: 200px;">
            <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px; font-weight: bold;">Outlook</div>
            <div style="font-size: 0.9rem;">${trend.outlook || "Inflation is being closely monitored by the Federal Reserve for potential policy adjustments."}</div>
          </div>
          <div style="flex: 2; min-width: 200px;">
            <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px; font-weight: bold;">Market Impact</div>
            <div style="font-size: 0.9rem;">${trend.marketImpact || "Changes in inflation may impact interest rates and asset valuations across markets."}</div>
          </div>
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
          Source: <a href="${trend.sourceUrl || inflation.sourceUrl || "#"}" target="_blank">${trend.source || inflation.source || "Bureau of Labor Statistics"}</a>, as of ${trend.asOf || inflation.lastUpdated || "N/A"}
        </div>
      </div>
    </div>
  `;
};

/**
 * Adds the Upcoming Economic Events section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing upcoming events information
 */
const addUpcomingEvents = (data) => {
  // Create sample upcoming events based on the image provided
  const upcomingEvents = [
    {
      date: "May 2, 2025, 8:30 AM EDT",
      name: "U.S. Non-Farm Payroll Employment Change",
      source: "U.S. Bureau of Labor Statistics",
      forecast: "130",
      previous: "228"
    },
    {
      date: "May 1, 2025, 10:00 AM EDT",
      name: "Manufacturing Purchasing Managers Index",
      source: "Institute for Supply Management",
      forecast: "48",
      previous: "49"
    },
    {
      date: "May 2, 2025, 8:30 AM EDT",
      name: "U.S. Unemployment Rate",
      source: "U.S. Bureau of Labor Statistics",
      forecast: "4.20%",
      previous: "4.20%"
    },
    {
      date: "May 5, 2025, 10:00 AM EDT",
      name: "ISM N-Mfg PMI",
      source: "ISM",
      forecast: "50.6",
      previous: "50.8"
    },
    {
      date: "May 2, 2025, 8:30 AM EDT",
      name: "Average Earnings MM",
      source: "BLS",
      forecast: "0.30%",
      previous: "0.30%"
    },
    {
      date: "May 2, 2025, 8:30 AM EDT",
      name: "Average Workweek Hrs",
      source: "BLS",
      forecast: "34.2",
      previous: "34.2"
    },
    {
      date: "May 2, 2025, 8:30 AM EDT",
      name: "Labor Force Partic",
      source: "BLS",
      forecast: "N/A",
      previous: "62.50%"
    }
  ];
  
  return `
    <div style="margin-bottom: 30px;">
      <div style="font-weight: bold; margin-bottom: 15px; font-size: clamp(1.1rem, 3vw, 1.25rem);">Upcoming Events</div>
      
      <div style="background-color: #f9f9f9; border-radius: 8px; padding: 15px;">
        <div class="row" style="display: flex; flex-direction: column; gap: 8px;">
          ${upcomingEvents.map(event => `
            <div style="display: flex; flex-wrap: nowrap; align-items: flex-start; padding: 8px 10px; border-radius: 5px; background-color: #ffffff; border: 1px solid #e2e8f0;">
              <div style="min-width: 110px; flex: 0 0 110px;">
                <div style="font-size: 0.85rem; font-weight: 500; color: #2196f3;">${event.date}</div>
              </div>
              <div style="flex: 3 1 250px; margin: 0 15px 0 5px; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis;">
                <div style="font-weight: bold; margin-bottom: 2px; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${event.name}</div>
                <div style="font-size: 0.9rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${event.source}</div>
              </div>
              <div style="flex: 1 1 120px; min-width: 120px; max-width: 100%; text-align: right; color: #555; font-size: 0.85rem;">
                <div style="margin-bottom: 2px;"><span style="color: #2563eb; font-weight: 500;">Forecast:</span> ${event.forecast}</div>
                <div><span style="color: #64748b; font-weight: 500;">Previous:</span> ${event.previous}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
};

/**
 * Adds all Macroeconomic Factors sections to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing all macroeconomic factors information
 */
const addMacroeconomicFactors = (mobiledoc, data) => {
  // Add section heading
  addHeading(mobiledoc, 'Macroeconomic Factors', 2);
  
  // Create a collapsible section header with dark purple background
  const macroHeaderHtml = `
    <div class="collapsible-section" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; width: 100%; margin-bottom: 20px;">
      <!-- Section Header with dark purple background -->
      <div class="collapsible-header" style="background-color: #4a1d96; padding: 15px; border-radius: 6px 6px 0 0; display: flex; flex-direction: column; align-items: flex-start; cursor: pointer; margin-bottom: 0; width: 95%; max-width: 800px; margin-left: auto; margin-right: auto;">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <h2 style="margin: 0; font-size: 1.5rem; font-weight: bold; color: white;">Macroeconomic Factors</h2>
          <div class="collapsible-icon" style="font-size: 14px; color: white; margin-left: auto;">▼</div>
        </div>
        <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1rem; font-weight: normal; text-align: center; width: 100%;">
          Fed Funds: ${data.macroeconomicFactors?.fedPolicy?.currentRate || "4.33%"} | CPI: ${data.macroeconomicFactors?.inflation?.cpi?.headline || "2.4"}% | 10Y Treasury: ${data.macroeconomicFactors?.treasuryYields?.current?.find(y => y.maturity === "10-Year")?.rate || "4.19"}%
        </div>
      </div>
      
      <!-- Collapsible Content -->
      <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
        ${addTreasuryYields(data)}
        ${addFedPolicy(data)}
        ${addInflation(data)}
        ${addUpcomingEvents(data)}
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
            if (content.style.maxHeight === '0px' || content.style.maxHeight === '') {
              content.style.maxHeight = '1000px';
              icon.style.transform = 'rotate(180deg)';
            } else {
              content.style.maxHeight = '0px';
              icon.style.transform = 'rotate(0deg)';
            }
          });
        });
      });
    </script>
  `;
  
  addHTML(mobiledoc, macroHeaderHtml);
};

module.exports = {
  addMacroeconomicFactors
};

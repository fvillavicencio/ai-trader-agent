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
const addTreasuryYields = (mobiledoc, data) => {
  if (!data.full || !data.full.macroeconomicFactors || !data.full.macroeconomicFactors.treasuryYields) return;
  
  const treasuryYields = data.full.macroeconomicFactors.treasuryYields;
  const yieldCurve = treasuryYields.yieldCurve || {};
  const yields = treasuryYields.current || [];
  
  const treasuryYieldsHtml = `
    <div style="background-color: #f8f9fa; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-top: 20px; margin-bottom: 20px;">
      <div style="background-color: #f8f9fa; padding: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; font-size: clamp(1.1rem, 3vw, 1.25rem);">Treasury Yields</div>
        
        <div style="display: flex; flex-wrap: nowrap; overflow-x: auto; padding: 15px 0; background-color: white; border-radius: 8px; margin-bottom: 15px;">
          ${yields.map(yield => `
            <div class="yields-cell" style="flex: 1 1 90px; min-width: 90px; max-width: 100%; text-align: center; padding: 0 10px; position: relative; box-sizing: border-box;">
              <div style="color: #666; font-size: clamp(0.95rem, 2vw, 1.05rem); margin-bottom: 8px;">${yield.maturity}</div>
              <div style="color: ${yieldCurve.color || "#4CAF50"}; font-weight: bold; font-size: clamp(1.1rem, 2.5vw, 1.25rem);">
                ${yield.rate.toFixed(2)}%
              </div>
              ${yield !== yields[yields.length - 1] ? `<div class="yield-separator" style="position: absolute; top: 10%; right: 0; bottom: 10%; width: 3px; background-color: ${yieldCurve.color || "#4CAF50"}; border-radius: 2px;"></div>` : ''}
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 15px; padding-left: 15px; border-left: 4px solid ${yieldCurve.color || "#4caf50"};">
          <div style="font-weight: bold; font-size: clamp(0.95rem, 2vw, 1.05rem); margin-bottom: 5px;">Yield Curve: ${yieldCurve.status || "Normal"}</div>
          <div style="color: #555; font-size: clamp(0.9rem, 2vw, 1rem);">${yieldCurve.description || "The yield curve has a normal positive slope."}</div>
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
          Source: <a href="${treasuryYields.sourceUrl || "https://fred.stlouisfed.org/"}">${treasuryYields.source || "Federal Reserve Economic Data (FRED)"}</a>, as of ${treasuryYields.asOf || "N/A"}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, treasuryYieldsHtml);
};

/**
 * Adds the Fed Policy section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing Fed policy information
 */
const addFedPolicy = (mobiledoc, data) => {
  if (!data.full || !data.full.macroeconomicFactors || !data.full.macroeconomicFactors.federalReserve) return;
  
  const fedReserve = data.full.macroeconomicFactors.federalReserve;
  
  const fedPolicyHtml = `
    <div style="background-color: #f8f9fa; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-top: 20px;">
      <div style="background-color:rgb(19, 52, 79); color: white; padding: 12px; text-align: center;">
        <div style="font-size: clamp(1.05rem, 2vw, 1.15em); font-weight: bold; margin-bottom: 4px;">Federal Reserve Policy</div>
        <div style="font-size: clamp(0.92rem, 1.5vw, 0.98em); color: rgba(255,255,255,0.8);">Market Consensus</div>
      </div>
      <div style="padding: 15px; background-color: white;">
        <!-- Forward Guidance Section -->
        <div style="margin-bottom: 15px;">
          <div style="font-size: 0.9rem; color: #333; line-height: 1.6; word-break: break-word;">${fedReserve.forwardGuidance || "No forward guidance available."}</div>
          <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
            Source: <a href="${fedReserve.forwardGuidanceSource?.url || "#"}">${fedReserve.forwardGuidanceSource?.name || "Federal Reserve Press Releases"}</a>, as of ${fedReserve.forwardGuidanceSource?.lastUpdated || "N/A"}
          </div>
        </div>
        
        <!-- Current Rate Section -->
        <div style="margin-bottom: 15px;">
          <div style="font-size: 1rem; font-weight: bold; margin-bottom: 5px;">Current Federal Funds Rate</div>
          <div style="display: flex; justify-content: space-between; align-items: center; min-width: 0;">
            <div style="color: #4CAF50; font-weight: bold; font-size: 1.1rem;">
              ${fedReserve.currentRate?.effectiveRate || "N/A"}
            </div>
            <div style="color: #666; font-size: 0.9rem; min-width: 0; max-width: 100%;">
              Range: ${fedReserve.currentRate?.target || "N/A"}
            </div>
          </div>
          <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
            Source: <a href="https://fred.stlouisfed.org/series/FEDFUNDS">Federal Reserve Bank of St. Louis</a>, as of ${fedReserve.currentRate?.lastUpdated || "N/A"}
          </div>
        </div>
        
        <!-- Federal Funds Futures Section -->
        <div style="margin-bottom: 15px;">
          <div style="font-size: 1rem; font-weight: bold; margin-bottom: 5px;">Rate Change Probabilities</div>
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="color: #4CAF50; font-size: 1rem; font-weight: bold;">&#8595;</span>
              <div style="color: #4CAF50; font-weight: bold; font-size: 1rem;">${fedReserve.nextMeeting?.probabilities?.decrease || "0"}%</div>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="color: #757575; font-size: 1rem; font-weight: bold;">&#8594;</span>
              <div style="color: #757575; font-weight: bold; font-size: 1rem;">${fedReserve.nextMeeting?.probabilities?.noChange || "0"}%</div>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="color: #f44336; font-size: 1rem; font-weight: bold;">&#8593;</span>
              <div style="color: #f44336; font-weight: bold; font-size: 1rem;">${fedReserve.nextMeeting?.probabilities?.increase || "0"}%</div>
            </div>
          </div>
        </div>
        
        <!-- Meeting Schedule Section -->
        <div style="margin-bottom: 15px;">
          <div style="font-size: 1rem; font-weight: bold; margin-bottom: 5px;">Meeting Schedule</div>
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <div style="color: #666; font-size: 0.8rem; min-width: 0; max-width: 48%;">Next FOMC Meeting - ${fedReserve.nextMeeting?.date || "N/A"}</div>
          </div>
          <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
            Source: <a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm">Federal Reserve Meeting Calendar</a>, as of ${fedReserve.nextMeeting?.lastUpdated || "N/A"}
          </div>
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, fedPolicyHtml);
};

/**
 * Adds the Inflation section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing inflation information
 */
const addInflation = (mobiledoc, data) => {
  if (!data.full || !data.full.macroeconomicFactors || !data.full.macroeconomicFactors.inflation) return;
  
  const inflation = data.full.macroeconomicFactors.inflation;
  
  const inflationHtml = `
    <div style="margin-bottom: 20px; margin-top: 30px;">
      <div style="font-weight: bold; margin-bottom: 10px; font-size: clamp(1.1rem, 3vw, 1.25rem);">Inflation</div>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        <!-- CPI Card -->
          <div style="flex: 1; min-width: 250px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background-color: #3498db; color: white; padding: 10px; text-align: center; font-weight: bold; font-size: clamp(0.9rem, 2vw, 1rem);">Consumer Price Index<br>(CPI)</div>
            <div style="padding: 15px; text-align: center; background-color: white; border: 1px solid #3498db; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <div style="display: flex; justify-content: space-around; gap: 10px;">
                <div style="flex: 1; min-width: 80px;">
                  <div style="color: #555; font-size: 0.9rem; margin-bottom: 2px;">Headline</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 1rem;">${inflation.cpi?.headline || "N/A"}%</div>
                </div>
                <div style="flex: 1; min-width: 80px;">
                  <div style="color: #555; font-size: 0.9rem; margin-bottom: 2px;">Core</div>
                  <div style="color: #2c3e50; font-size: 1rem;">${inflation.cpi?.core || "N/A"}%</div>
                </div>
              </div>
            </div>
          </div>
        
        <!-- PCE Card -->
          <div style="flex: 1; min-width: 250px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background-color: #e67e22; color: white; padding: 10px; text-align: center; font-weight: bold; font-size: clamp(0.9rem, 2vw, 1rem);">Personal Consumption Expenditure<br>(PCE)</div>
            <div style="padding: 15px; text-align: center; background-color: white; border: 1px solid #e67e22; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <div style="display: flex; justify-content: space-around; gap: 10px;">
                <div style="flex: 1; min-width: 80px;">
                  <div style="color: #555; font-size: 0.9rem; margin-bottom: 2px;">Headline</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 1rem;">${inflation.pce?.headline || "N/A"}%</div>
                </div>
                <div style="flex: 1; min-width: 80px;">
                  <div style="color: #555; font-size: 0.9rem; margin-bottom: 2px;">Core</div>
                  <div style="color: #2c3e50; font-size: 1rem;">${inflation.pce?.core || "N/A"}%</div>
                </div>
              </div>
            </div>
          </div>
      </div>
     
      <!-- Inflation Expectations -->
        <div style="background-color: #f8f9fa; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-top: 10px;">
          <div style="background-color:rgb(19, 52, 79); color: white; padding: 12px; text-align: center;">
            <div style="font-size: clamp(1.05rem, 2vw, 1.15em); font-weight: bold; margin-bottom: 4px;">Inflation Expectations</div>
            <div style="font-size: clamp(0.92rem, 1.5vw, 0.98em); color: rgba(255,255,255,0.8);">Market Consensus</div>
          </div>
          <div style="padding: 15px; background-color: white;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px;">
                <div style="text-align: center;">
                  <div style="color: #2196F3; font-size: 1rem; margin-bottom: 6px;">1-Year</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 1.1rem;">${inflation.expectations?.find(e => e.period === "1-Year")?.value || "N/A"}%</div>
                </div>
                <div style="text-align: center;">
                  <div style="color: #2196F3; font-size: 1rem; margin-bottom: 6px;">5-Year</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 1.1rem;">${inflation.expectations?.find(e => e.period === "5-Year")?.value || "N/A"}%</div>
                </div>
                <div style="text-align: center;">
                  <div style="color: #2196F3; font-size: 1rem; margin-bottom: 6px;">10-Year</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 1.1rem;">${inflation.expectations?.find(e => e.period === "10-Year")?.value || "N/A"}%</div>
                </div>
            </div>
          </div>
          <div style="font-size: 0.7rem; color: #666; text-align: right; padding: 0 15px 10px 15px; background-color: white;">Source: <a href="https://fred.stlouisfed.org/series/EXPINF1YR" style="color: #2196F3; text-decoration: none;">St. Louis Fed (FRED API)</a>, as of ${inflation.expectations?.find(e => e.period === "5-Year")?.asOf || "N/A"}</div>
        </div>
    </div>
  `;
  
  addHTML(mobiledoc, inflationHtml);
};

/**
 * Adds the Upcoming Economic Events section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing upcoming events information
 */
const addUpcomingEvents = (mobiledoc, data) => {
  if (!data.full || !data.full.economicEvents || data.full.economicEvents.length === 0) return;
  
  const events = data.full.economicEvents;
  
  const eventsHtml = `
    <div style="margin-bottom: 15px; padding: 18px 20px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="font-weight: bold; margin-bottom: 14px; font-size: clamp(1.1rem, 3vw, 1.25rem);">Upcoming Events</div>
      <div class="row" style="display: flex; flex-direction: column; gap: 8px;">
        ${events.slice(0, 4).map(event => `
          <div style="display: flex; flex-wrap: nowrap; align-items: flex-start; padding: 8px 10px; border-radius: 5px; background-color: #ffffff; border: 1px solid #e2e8f0;">
            <div style="min-width: 110px; flex: 0 0 110px;">
              <div style="font-size: 0.85rem; font-weight: 500; color: #2196f3;">${event.date}, ${event.time}</div>
            </div>
            <div style="flex: 3 1 250px; margin: 0 15px 0 5px; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis;">
              <div style="font-weight: bold; margin-bottom: 2px; font-size: clamp(1rem, 2vw, 1.1rem); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${event.name}</div>
              <div style="font-size: clamp(0.9rem, 2vw, 1rem); color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${event.source}</div>
            </div>
            <div style="flex: 1 1 120px; min-width: 120px; max-width: 100%; text-align: right; color: #555; font-size: 0.85rem;">
              <div style="margin-bottom: 2px;"><span style="color: #2563eb; font-weight: 500;">Forecast:</span> ${event.forecast}</div>
              <div><span style="color: #64748b; font-weight: 500;">Previous:</span> ${event.previous}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, eventsHtml);
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
    <div class="collapsible-section" data-section="macroeconomic-factors" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; width: 100%;">
      <div class="collapsible-header" style="background-color: #4a1d96; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <h2 style="margin: 0; font-size: 1.5rem; font-weight: bold; color: white;">Macroeconomic Factors</h2>
          <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
        </div>
        <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1rem; font-weight: normal; text-align: center; width: 100%;">
          Fed Funds: ${data.full?.macroeconomicFactors?.federalReserve?.currentRate?.effectiveRate || "N/A"} | CPI: ${data.full?.macroeconomicFactors?.inflation?.cpi?.headline || "N/A"}% | 10Y Treasury: ${data.full?.macroeconomicFactors?.treasuryYields?.current?.find(y => y.maturity === "10-Year")?.rate || "N/A"}%
        </div>
      </div>
      <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
        <div style="padding: 20px; background-color: #f8fafc;">
  `;
  
  addHTML(mobiledoc, macroHeaderHtml);
  
  // Add each section in order
  addFedPolicy(mobiledoc, data);
  addInflation(mobiledoc, data);
  addTreasuryYields(mobiledoc, data);
  addUpcomingEvents(mobiledoc, data);
  
  // Close the collapsible section
  const closeSection = `
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, closeSection);
};

module.exports = {
  addMacroeconomicFactors,
  addTreasuryYields,
  addFedPolicy,
  addInflation,
  addUpcomingEvents
};

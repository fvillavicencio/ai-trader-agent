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
  if (!data.macroeconomicFactors || !data.macroeconomicFactors.treasuryYields) return;
  
  // Ensure treasuryYields is an array
  const treasuryYields = Array.isArray(data.macroeconomicFactors.treasuryYields) 
    ? data.macroeconomicFactors.treasuryYields 
    : [data.macroeconomicFactors.treasuryYields];
  
  addHeading(mobiledoc, 'Treasury Yields', 3);
  
  const treasuryYieldsHtml = `
    <div class="market-pulse-section treasury-yields-container collapsible-section" data-section="treasury-yields">
      <div class="collapsible-header">
        <div class="collapsible-title">Treasury Yields</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="treasury-yields-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
          ${treasuryYields.map(yield => {
            const trendColor = yield.trend === 'up' ? '#ef4444' : yield.trend === 'down' ? '#10b981' : '#718096';
            const trendIcon = yield.trend === 'up' ? '▲' : yield.trend === 'down' ? '▼' : '■';
            
            return `
              <div class="market-pulse-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div style="font-weight: bold;">${yield.name}</div>
                  <div style="font-weight: bold; color: ${trendColor};">${yield.value}% ${trendIcon}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #718096;">
                  <div>Change: <span style="color: ${trendColor};">${yield.change}%</span></div>
                  <div>Previous: ${yield.previous}%</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${data.macroeconomicFactors.treasuryYieldsSourceUrl || '#'}" target="_blank">${data.macroeconomicFactors.treasuryYieldsSource || 'U.S. Department of Treasury'}</a>
          ${data.macroeconomicFactors.treasuryYieldsAsOf ? `<br>As of: ${data.macroeconomicFactors.treasuryYieldsAsOf}` : ''}
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
  if (!data.macroeconomicFactors || !data.macroeconomicFactors.fedPolicy) return;
  
  const fedPolicy = data.macroeconomicFactors.fedPolicy;
  
  addHeading(mobiledoc, 'Fed Policy', 3);
  
  const fedPolicyHtml = `
    <div class="market-pulse-section fed-policy-container collapsible-section" data-section="fed-policy">
      <div class="collapsible-header">
        <div class="collapsible-title">Fed Policy: <span style="color: #3182ce;">Federal Funds Rate: ${fedPolicy.currentRate}%</span></div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 15px;">
          <div style="flex: 1 1 300px; min-width: 0; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px;">Current Policy</div>
            <div style="line-height: 1.5;">
              ${fedPolicy.currentPolicy || 'Information about current Fed policy not available.'}
            </div>
          </div>
          
          <div style="flex: 1 1 300px; min-width: 0; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px;">Future Outlook</div>
            <div style="line-height: 1.5;">
              ${fedPolicy.outlook || 'Information about Fed policy outlook not available.'}
            </div>
          </div>
        </div>
        
        <div style="margin-top: 15px;">
          <div style="font-weight: bold; margin-bottom: 10px;">Next FOMC Meeting</div>
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; border-left: 4px solid #3182ce;">
            <div style="font-weight: 500;">${fedPolicy.nextMeeting || 'Date not available'}</div>
            ${fedPolicy.nextMeetingExpectation ? `
              <div style="margin-top: 10px; line-height: 1.5;">
                <strong>Market Expectation:</strong> ${fedPolicy.nextMeetingExpectation}
              </div>
            ` : ''}
          </div>
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
          Source: <a href="${fedPolicy.sourceUrl || '#'}" target="_blank">${fedPolicy.source || 'Federal Reserve'}</a>
          ${fedPolicy.asOf ? `<br>As of: ${fedPolicy.asOf}` : ''}
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
  if (!data.macroeconomicFactors || !data.macroeconomicFactors.inflation) return;
  
  const inflation = data.macroeconomicFactors.inflation;
  
  addHeading(mobiledoc, 'Inflation', 3);
  
  const inflationHtml = `
    <div class="market-pulse-section inflation-container collapsible-section" data-section="inflation">
      <div class="collapsible-header">
        <div class="collapsible-title">Inflation: <span style="color: ${parseFloat(inflation.currentRate) > 2.5 ? '#e53e3e' : '#48bb78'};">${inflation.currentRate}%</span></div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 15px;">
          <div style="flex: 1 1 300px; min-width: 0; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px;">Consumer Price Index (CPI)</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <div>Current Rate:</div>
              <div style="font-weight: 500;">${inflation.currentRate}%</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <div>Previous Month:</div>
              <div style="font-weight: 500;">${inflation.previousMonth || 'N/A'}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Year-over-Year Change:</div>
              <div style="font-weight: 500;">${inflation.yearOverYear || 'N/A'}</div>
            </div>
          </div>
          
          <div style="flex: 1 1 300px; min-width: 0; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px;">Core CPI (excluding food & energy)</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <div>Current Rate:</div>
              <div style="font-weight: 500;">${inflation.coreCPI || 'N/A'}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <div>Previous Month:</div>
              <div style="font-weight: 500;">${inflation.previousMonthCore || 'N/A'}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Year-over-Year Change:</div>
              <div style="font-weight: 500;">${inflation.yearOverYearCore || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 15px; line-height: 1.5;">
          ${inflation.analysis || 'Inflation analysis not available.'}
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
          Source: <a href="${inflation.sourceUrl || '#'}" target="_blank">${inflation.source || 'Bureau of Labor Statistics'}</a>
          ${inflation.asOf ? `<br>As of: ${inflation.asOf}` : ''}
        </div>
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
  if (!data.upcomingEvents || data.upcomingEvents.length === 0) return;
  
  addHeading(mobiledoc, 'Upcoming Economic Events', 3);
  
  const eventsHtml = `
    <div class="market-pulse-section events-container">
      ${data.upcomingEvents.map(event => {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const formattedTime = eventDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: false
        });
        
        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; padding: 15px;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
              <div style="color: #3182ce; font-weight: 500; margin-bottom: 5px;">
                May ${eventDate.getDate()}, ${eventDate.getFullYear()}, ${formattedTime} AM EDT
              </div>
              <div style="text-align: right;">
                <div>Forecast: ${event.forecast || 'N/A'}</div>
                <div>Previous: ${event.previous || 'N/A'}</div>
              </div>
            </div>
            <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 5px;">
              ${event.title}
            </div>
            <div style="color: #4a5568; font-size: 0.9rem;">
              ${event.source || ''}
            </div>
          </div>
        `;
      }).join('')}
      
      <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
        Source: <a href="${data.upcomingEventsSource?.url || '#'}" target="_blank">${data.upcomingEventsSource?.name || 'Economic Calendar'}</a>
        ${data.upcomingEventsSource?.asOf ? `<br>As of: ${data.upcomingEventsSource.asOf}` : ''}
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
  addHeading(mobiledoc, 'Macroeconomic Factors', 2);
  
  // Add each section in order
  addTreasuryYields(mobiledoc, data);
  addFedPolicy(mobiledoc, data);
  addInflation(mobiledoc, data);
  addUpcomingEvents(mobiledoc, data);
  
  addDivider(mobiledoc);
};

module.exports = {
  addMacroeconomicFactors,
  addTreasuryYields,
  addFedPolicy,
  addInflation,
  addUpcomingEvents
};

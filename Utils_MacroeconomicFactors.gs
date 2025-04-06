/**
 * Generates the macroeconomic factors section HTML
 * 
 * @param {Object} macroeconomicAnalysis - The analysis data containing macroeconomic factors
 * @return {String} HTML for the macroeconomic factors section
 */
function generateMacroeconomicFactorsSection(macroeconomicAnalysis) {
  try {
    // Check if macro data exists
    if (!macroeconomicAnalysis) {
      return `
      <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Macroeconomic Factors</h2>
        <p style="text-align: center; color: #757575;">No macroeconomic data available</p>
      </div>
      `;
    }
    
    // Retrieve macroeconomic factors
    const macro = retrieveMacroeconomicFactors();
    if (!macro.success) {
      return {
        success: false,
        message: "Failed to retrieve macroeconomic factors",
        error: macro.error
      };
    }
    
    // Treasury Yields
    let yieldsHtml = '';
    if (macro.treasuryYields?.yields) {
      yieldsHtml = `
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 10px;">Treasury Yields</div>
          <div style="display: flex; background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
            ${macro.treasuryYields.yields.map(yield => `
              <div style="flex: 1; text-align: center; padding: 0 10px; position: relative;">
                <div style="color: #666; font-size: 14px; margin-bottom: 8px;">${yield.term}</div>
                <div style="color: #4CAF50; font-weight: bold; font-size: 20px;">${formatValue(yield.yield)}%</div>
                <div style="position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background-color: #4CAF50;"></div>
              </div>
            `).join('')}
          </div>
          
          <div style="margin-top: 15px; padding-left: 15px; border-left: 4px solid #FFA500;">
            <div style="font-weight: bold; margin-bottom: 5px;">Yield Curve: ${macro.treasuryYields.yieldCurve?.status || 'unknown'}</div>
            <div style="color: #555; font-size: 14px;">${macro.treasuryYields.yieldCurve?.analysis || 'N/A'}</div>
          </div>
          
          <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
            Source: ${macro.treasuryYields.source || 'Federal Reserve Economic Data (FRED)'} | Last updated: ${formatDate(macro.treasuryYields.lastUpdated)}
          </div>
        </div>
      `;
    }

    // Inflation
    let inflationHtml = '';
    const inflationData = macroeconomicAnalysis?.macroeconomicFactors?.inflation;
    
    if (inflationData) {
      inflationHtml = `
        <div>
          <div style="margin-bottom: 20px;">
            <div style="font-weight: bold; margin-bottom: 10px;">Inflation Metrics</div>
            <div style="display: flex; margin-bottom: 15px;">
              <!-- CPI Card -->
              <div style="flex: 1; margin-right: 5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="text-align: center; padding: 8px 0; font-weight: bold; background-color: #3498db; color: white;">CPI</div>
                <div style="padding: 10px; text-align: center; background-color: white; border: 1px solid #3498db; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                  <div style="display: flex; justify-content: space-around;">
                    <div>
                      <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Headline</div>
                      <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${formatValue(inflationData.cpi.headline)}%</div>
                    </div>
                    <div>
                      <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Core</div>
                      <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${formatValue(inflationData.cpi.core)}%</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- PCE Card -->
              <div style="flex: 1; margin-left: 5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="text-align: center; padding: 8px 0; font-weight: bold; background-color: #e67e22; color: white;">PCE</div>
                <div style="padding: 10px; text-align: center; background-color: white; border: 1px solid #e67e22; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                  <div style="display: flex; justify-content: space-around;">
                    <div>
                      <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Headline</div>
                      <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${formatValue(inflationData.pce.headline)}%</div>
                    </div>
                    <div>
                      <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Core</div>
                      <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${formatValue(inflationData.pce.core)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="display: flex; margin-bottom: 15px;">
              <div style="flex: 1; background-color: #f1f8e9; padding: 15px; border-radius: 4px; margin-right: 10px; border-left: 4px solid #4CAF50;">
                <div style="font-weight: bold; color: #4CAF50; margin-bottom: 5px;">Inflation Trend Analysis</div>
                <div style="color: #333;">${inflationData.trend}</div>
              </div>
              
              <div style="flex: 1; padding: 15px; background-color: #f8f9fa; border-radius: 4px; margin-right: 10px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Outlook</div>
                <div style="color: #555; font-size: 14px;">${inflationData.outlook}</div>
              </div>
              
              <div style="flex: 1; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Market Impact</div>
                <div style="color: #555; font-size: 14px;">${inflationData.marketImpact}</div>
              </div>
            </div>
            
            <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
              Source: ${inflationData.source || 'Bureau of Labor Statistics, Federal Reserve'} | Last updated: ${formatDate(inflationData.lastUpdated)}
            </div>
          </div>
        </div>
      `;
    }

    // Return the complete HTML for the macroeconomic factors section
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Macroeconomic Factors</h2>
      
      ${yieldsHtml}
      ${inflationHtml}
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating macroeconomic factors section: " + error);
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Macroeconomic Factors</h2>
      <p style="text-align: center; color: #757575;">Error generating macroeconomic factors data</p>
    </div>
    `;
  }
}

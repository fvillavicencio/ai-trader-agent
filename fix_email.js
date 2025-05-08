// Script to fix the syntax error in Email.gs
const fs = require('fs');

const filePath = '/Users/frankvillavicencio/Documents/Development/AI Trader Agent/Email.gs';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find the problematic section with the geopolitical risks
const startPattern = "if (macro.geopoliticalRisks.regions && Array.isArray(macro.geopoliticalRisks.regions)) {";
const endPattern = "macroHtml += `</div>`;";

// Find the start position
const startPos = content.indexOf(startPattern);
if (startPos === -1) {
  console.error("Could not find the start of the geopolitical risks section");
  process.exit(1);
}

// Find the end position
const searchFrom = startPos + startPattern.length;
const endPos = content.indexOf(endPattern, searchFrom) + endPattern.length;
if (endPos === -1) {
  console.error("Could not find the end of the geopolitical risks section");
  process.exit(1);
}

// Replace the section with a completely rewritten version that avoids template literals
const fixedSection = `if (macro.geopoliticalRisks.regions && Array.isArray(macro.geopoliticalRisks.regions)) {
        macroHtml += "<div style=\\"display: flex; flex-direction: column; gap: 10px;\\">";
        
        for (let i = 0; i < macro.geopoliticalRisks.regions.length; i++) {
          const region = macro.geopoliticalRisks.regions[i];
          
          // Start region div
          macroHtml += "<div style=\\"padding: 12px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);\\">";
          
          // Region title
          macroHtml += "<div style=\\"font-weight: bold; margin-bottom: 8px; color: #333;\\">" + region.region + "</div>";
          
          // Check if region has risks
          if (region.risks && Array.isArray(region.risks) && region.risks.length > 0) {
            // Start risks container
            macroHtml += "<div style=\\"display: flex; flex-direction: column; gap: 8px;\\">";
            
            // Loop through each risk
            for (let j = 0; j < region.risks.length; j++) {
              const risk = region.risks[j];
              
              // Clean impact level
              const cleanImpactLevel = risk.impactLevel ? risk.impactLevel.replace(/\\b[iI]mpact\\b/g, '').trim() : 'N/A';
              
              // Determine risk color
              let riskColor = '#757575'; // Default gray
              if (cleanImpactLevel.toLowerCase().includes('high')) {
                riskColor = '#f44336'; // Red for high
              } else if (cleanImpactLevel.toLowerCase().includes('medium')) {
                riskColor = '#ff9800'; // Orange for medium
              } else if (cleanImpactLevel.toLowerCase().includes('low')) {
                riskColor = '#4caf50'; // Green for low
              }
              
              // Start risk item
              macroHtml += "<div style=\\"display: flex; align-items: flex-start; padding: 8px; background-color: #f9f9f9; border-radius: 4px;\\">";
              macroHtml += "<div style=\\"flex-grow: 1;\\">";
              
              // Risk description
              macroHtml += "<div style=\\"font-weight: 500; margin-bottom: 3px;\\">" + risk.description + "</div>";
              
              // Risk metadata
              macroHtml += "<div style=\\"display: flex; align-items: center;\\">";
              
              // Impact level badge
              macroHtml += "<span style=\\"font-size: 12px; color: " + riskColor + "; font-weight: bold; padding: 2px 6px; background-color: " + riskColor + "20; border-radius: 3px; margin-right: 5px;\\">" + cleanImpactLevel + "</span>";
              
              // Timeframe if available
              if (risk.timeframe) {
                macroHtml += "<span style=\\"font-size: 12px; color: #757575;\\">Timeframe: " + risk.timeframe + "</span>";
              }
              
              // Close risk metadata
              macroHtml += "</div>";
              
              // Close risk item
              macroHtml += "</div></div>";
            }
            
            // Close risks container
            macroHtml += "</div>";
          } else {
            // No risks message
            macroHtml += "<div style=\\"font-style: italic; color: #757575;\\">No specific risks identified</div>";
          }
          
          // Close region div
          macroHtml += "</div>";
        }
        
        // Close geopolitical risks container
        macroHtml += "</div>";
      }`;

// Replace the problematic section with the fixed section
const newContent = content.substring(0, startPos) + fixedSection + content.substring(endPos);

// Write the fixed content back to the file
fs.writeFileSync(filePath, newContent);
console.log('Fixed Email.gs file');

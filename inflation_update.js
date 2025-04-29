    // Inflation
    if (macro.inflation) {
      plainText += `- Inflation:\n`;
      plainText += `  * CPI Headline: ${macro.inflation.cpi || 'N/A'}%\n`;
      plainText += `  * CPI Core: ${macro.inflation.coreCpi || 'N/A'}%\n`;
      plainText += `  * PCE Headline: ${macro.inflation.pce || 'N/A'}%\n`;
      plainText += `  * PCE Core: ${macro.inflation.corePce || 'N/A'}%\n`;
      
      // Add analysis if available
      if (macro.inflation.trend || macro.inflation.analysis) {
        plainText += `  * Analysis: ${macro.inflation.analysis || macro.inflation.trend || ''}\n`;
      }
    }

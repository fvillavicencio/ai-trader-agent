// Helper function to parse geopolitical risks from text response
function parseGeopoliticalRisksFromText(content) {
  try {
    console.log('Parsing geopolitical risks from text...');
    
    // Initialize risks array
    const risks = [];
    
    // Split content by markdown headers or numbered sections to identify individual risks
    const riskSections = content.split(/\n##\s|\n\d\.\s/).filter(section => section.trim().length > 0);
    
    // Process each section that looks like a risk
    for (const section of riskSections) {
      // Skip if section is too short to be meaningful
      if (section.length < 50) continue;
      
      // Extract title - first line or first sentence
      const titleMatch = section.match(/^([^\n.]+)[.\n]/);
      const title = titleMatch ? titleMatch[1].trim() : 'Unnamed Risk';
      
      // Extract description - use the whole section as description
      const description = section.trim();
      
      // Look for impact indicators in the text
      const impactIndicators = {
        HIGH: ['severe', 'significant', 'major', 'high', 'critical', 'substantial'],
        MEDIUM: ['moderate', 'medium', 'considerable', 'notable'],
        LOW: ['minor', 'low', 'limited', 'minimal', 'slight']
      };
      
      // Determine impact level based on keywords
      let impact = 'MEDIUM'; // Default
      for (const [level, keywords] of Object.entries(impactIndicators)) {
        if (keywords.some(keyword => section.toLowerCase().includes(keyword))) {
          impact = level;
          break;
        }
      }
      
      // Extract regions mentioned
      const regionPatterns = [
        'North America', 'South America', 'Europe', 'Asia', 'Africa', 'Middle East',
        'United States', 'China', 'Russia', 'European Union', 'Japan', 'India',
        'Latin America', 'Southeast Asia', 'Eastern Europe', 'Western Europe',
        'Global', 'Worldwide'
      ];
      
      const regions = regionPatterns
        .filter(region => section.includes(region))
        .filter((region, index, self) => self.indexOf(region) === index); // Remove duplicates
      
      // If no regions found, add 'Global' as default
      if (regions.length === 0) {
        regions.push('Global');
      }
      
      // Extract markets affected
      const marketPatterns = [
        'Energy', 'Technology', 'Finance', 'Banking', 'Manufacturing', 'Agriculture',
        'Defense', 'Healthcare', 'Pharmaceutical', 'Transportation', 'Retail',
        'Real Estate', 'Commodities', 'Currency', 'Bonds', 'Equities', 'Stock', 'Oil',
        'Gas', 'Semiconductor', 'Supply Chain'
      ];
      
      const markets = marketPatterns
        .filter(market => section.includes(market))
        .filter((market, index, self) => self.indexOf(market) === index); // Remove duplicates
      
      // If no markets found, add 'Global Markets' as default
      if (markets.length === 0) {
        markets.push('Global Markets');
      }
      
      // Add the parsed risk to the array
      risks.push({
        title,
        description,
        impact,
        regions,
        markets
      });
    }
    
    // If no risks were parsed, return a default risk
    if (risks.length === 0) {
      risks.push({
        title: 'Geopolitical Uncertainty',
        description: 'General geopolitical uncertainty affecting global markets.',
        impact: 'MEDIUM',
        regions: ['Global'],
        markets: ['Global Markets']
      });
    }
    
    console.log(`Successfully parsed ${risks.length} geopolitical risks`);
    return risks;
  } catch (error) {
    console.error(`Error parsing geopolitical risks: ${error.message}`);
    // Return a default risk in case of parsing error
    return [
      {
        title: 'Parsing Error',
        description: 'Error parsing geopolitical risks from API response.',
        impact: 'UNKNOWN',
        regions: ['Global'],
        markets: ['Global Markets'],
        error: error.message
      }
    ];
  }
}

module.exports = { parseGeopoliticalRisksFromText };

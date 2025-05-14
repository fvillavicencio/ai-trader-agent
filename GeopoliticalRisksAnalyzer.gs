/**
 * Geopolitical Risks Analyzer Module
 * 
 * This module provides an enhanced implementation for retrieving and analyzing geopolitical risks
 * using the Perplexity API with improved prompts and data processing.
 */

/**
 * Main function to retrieve geopolitical risks data using the enhanced multi-step approach
 * @return {Object} Geopolitical risks data in the format expected by JsonExport.gs
 */
function retrieveGeopoliticalRisksEnhanced() {
  try {
    Logger.log("Retrieving geopolitical risks data using enhanced multi-step approach...");
    
    // Get the Perplexity API key
    const apiKey = getPerplexityApiKey();
    if (!apiKey) {
      Logger.log("Perplexity API key not found in script properties");
      throw new Error("Perplexity API key not found in script properties");
    }
    
    Logger.log("API key retrieved successfully, proceeding with geopolitical risks retrieval");
    
    // Step 1: Get recent specific events with balanced prompt
    try {
      // Add a timeout wrapper around the API call
      const startTime = new Date().getTime();
      const recentEvents = getRecentGeopoliticalEventsEnhanced(apiKey);
      const endTime = new Date().getTime();
      Logger.log(`Retrieved events in ${(endTime - startTime)/1000} seconds`);
      Logger.log(`Found ${recentEvents.length} recent geopolitical events`);
      
      // Validate events structure
      if (!recentEvents || !Array.isArray(recentEvents) || recentEvents.length === 0) {
        Logger.log("No valid geopolitical events found or invalid response structure");
        throw new Error("No valid geopolitical events found");
      }
      
      // Step 2: Analyze each event in depth with balanced prompt
      const analyzedEvents = [];
      let successCount = 0;
      let failureCount = 0;
      
      for (const event of recentEvents) {
        try {
          if (!event || !event.headline) {
            Logger.log("Skipping invalid event without headline");
            continue;
          }
          
          Logger.log(`Analyzing event: ${event.headline}`);
          const analysis = analyzeGeopoliticalEventEnhanced(event, apiKey);
          
          // Validate analysis structure
          if (analysis && analysis.name && analysis.description) {
            analyzedEvents.push(analysis);
            successCount++;
            Logger.log(`Successfully analyzed event: ${event.headline}`);
          } else {
            Logger.log(`Invalid analysis structure for event: ${event.headline}`);
            failureCount++;
          }
        } catch (analysisError) {
          Logger.log(`Error analyzing event ${event.headline}: ${analysisError}. Skipping this event.`);
          failureCount++;
          // Continue with other events even if one fails
        }
      }
      
      Logger.log(`Event analysis complete: ${successCount} succeeded, ${failureCount} failed`);
      
      // Only proceed if we have at least one successfully analyzed event
      if (analyzedEvents.length === 0) {
        throw new Error("No events could be successfully analyzed");
      }
      
      // Step 3: Create consolidated analysis with proper formatting
      const geopoliticalData = createConsolidatedGeopoliticalAnalysisEnhanced(analyzedEvents);
      
      // Validate the final data structure
      if (!geopoliticalData || !Array.isArray(geopoliticalData.risks) || geopoliticalData.risks.length === 0) {
        Logger.log("Invalid consolidated geopolitical data structure");
        throw new Error("Failed to create valid consolidated geopolitical analysis");
      }
      
      // Log the extracted data
      Logger.log("Extracted geopolitical data (first 500 chars):");
      Logger.log(JSON.stringify(geopoliticalData, null, 2).substring(0, 500) + "...");

      // Add timestamp
      geopoliticalData.lastUpdated = new Date();
      
      // Cache the result for 2 hours (using a distinct cache key for the enhanced implementation)
      const scriptCache = CacheService.getScriptCache();
      scriptCache.put('GEOPOLITICAL_RISKS_ENHANCED_DATA', JSON.stringify(geopoliticalData), 7200); // 2 hours
      
      // Also update the standard cache key for compatibility with existing code
      scriptCache.put('GEOPOLITICAL_RISKS_DATA', JSON.stringify(geopoliticalData), 7200); // 2 hours
      
      return geopoliticalData;
    } catch (eventsError) {
      Logger.log(`Error retrieving or processing geopolitical events: ${eventsError}`);
      throw eventsError; // Re-throw to be handled by the main try-catch block
    }
  } catch (error) {
    Logger.log(`Error retrieving enhanced geopolitical risks: ${error}`);
    
    // Fall back to original implementation if enhanced version fails
    try {
      Logger.log("Falling back to original Perplexity implementation for geopolitical risks data");
      return retrieveGeopoliticalRisksFromPerplexity();
    } catch (fallbackError) {
      Logger.log(`Fallback to original Perplexity implementation also failed: ${fallbackError}`);
      
      // Create a minimal but valid geopolitical risks structure
      // This follows the principle of not using hardcoded sample data
      // while still providing a valid structure that won't break downstream code
      const currentDate = new Date();
      const formattedDate = Utilities.formatDate(currentDate, "America/New_York", "MMMM d, yyyy 'at' h:mm a z");
      
      return {
        risks: [
          {
            name: "API Connection Issue",
            description: "Geopolitical risk data could not be retrieved due to API connection issues. Please check again later for updated information.",
            region: "Global",
            impactLevel: "Unknown",
            source: "System",
            sourceUrl: "https://perplexity.ai/",
            lastUpdated: formattedDate
          }
        ],
        source: "Perplexity API Enhanced Retrieval",
        sourceUrl: "https://perplexity.ai/",
        lastUpdated: formattedDate,
        error: "Unable to retrieve geopolitical risks data. API connections may be unavailable."
      };
    }
  }
}

/**
 * Step 1: Get recent specific geopolitical events with balanced prompt
 * @param {string} apiKey - The Perplexity API key
 * @returns {Array} Array of event objects with headline, date, and description
 */
function getRecentGeopoliticalEventsEnhanced(apiKey) {
  const now = new Date();
  const currentDate = Utilities.formatDate(now, TIME_ZONE, "MMMM dd, yyyy");
  
  // Calculate dates for the past 7 days for better context
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  // Also calculate the date 7 days ago to use for strict validation
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const yesterdayFormatted = Utilities.formatDate(yesterday, TIME_ZONE, "MMMM dd, yyyy");
  const twoDaysAgoFormatted = Utilities.formatDate(twoDaysAgo, TIME_ZONE, "MMMM dd, yyyy");
  
  Logger.log(`Current date: ${currentDate}`);
  Logger.log(`Seven days ago: ${sevenDaysAgoISO} - Will exclude events older than this date`);
  
  // Store the validation date in a global variable for use in validation functions
  this.MINIMUM_EVENT_DATE = sevenDaysAgoISO;
  
  // Enhanced prompt with emphasis on very recent events and high-impact risks
  const prompt = `
TODAY'S DATE: ${currentDate}
Yesterday: ${yesterdayFormatted}
Two Days Ago: ${twoDaysAgoFormatted}

Identify the 5 MOST SIGNIFICANT and HIGHEST-IMPACT geopolitical events from the PAST 48-72 HOURS that are ACTIVELY impacting financial markets RIGHT NOW.

ABSOLUTELY CRITICAL REQUIREMENTS:
1. Events MUST be from the PAST 72 HOURS ONLY - DO NOT include any events from before ${twoDaysAgoFormatted}
2. Each event MUST have a VERIFIED and MEASURABLE market impact (specific percentage moves in indices, sectors, or assets)
3. Each event MUST be from a MAJOR financial news source published in the last 48 hours
4. Each event MUST include PRECISE details (exact names, specific figures, exact dates)
5. Focus ONLY on HIGH-IMPACT events with SIGNIFICANT market consequences

PRIORITIZE THESE HIGH-IMPACT CATEGORIES:
- Major military actions or escalations in active conflicts
- Significant central bank decisions or unexpected policy shifts
- Major trade sanctions or tariffs between large economies
- Unexpected political developments with direct market consequences
- Sudden regulatory changes affecting major global industries
- Energy or commodity supply disruptions with price impacts

USE ONLY THESE AUTHORITATIVE FINANCIAL SOURCES:
1. Bloomberg, Financial Times, Reuters, Wall Street Journal, CNBC
2. Major bank research published in the last 48 hours (Goldman Sachs, JPMorgan, Morgan Stanley)

DO NOT include any event unless you can verify:
- It happened within the past 72 hours
- It has a measurable market impact (specific percentage moves or price changes)
- It comes from one of the authoritative sources listed above

Format your response as a valid JSON array with the following structure:
[
  {
    "headline": "Precise headline of the event",
    "date": "YYYY-MM-DD", // Must be a real date from the past 72 hours ONLY
    "description": "Concise 1-2 sentence description with SPECIFIC market impact details",
    "region": "Specific affected region",
    "source": "Exact source name",
    "url": "Direct URL to specific article"
  }
]
`;

  try {
    Logger.log('Requesting recent geopolitical events with balanced prompt...');
    const response = callPerplexityAPI(prompt, apiKey, 0.1);
    
    // Extract and parse the JSON
    let events;
    try {
      // Try to parse the JSON response
      events = JSON.parse(response);
      
      if (!events || !Array.isArray(events) || events.length === 0) {
        Logger.log("No events found in Perplexity response or invalid format");
        throw new Error("Invalid or empty response from Perplexity API");
      }
    } catch (parseError) {
      Logger.log(`Error parsing Perplexity response: ${parseError}`);
      throw new Error(`Failed to parse Perplexity API response: ${parseError.message}`);
    }
    
    // Validate each event
    const validatedEvents = events.filter(event => {
      // Check for required fields
      if (!event.headline || !event.date || !event.description || !event.region || !event.source) {
        Logger.log(`Skipping event missing required fields: ${event.headline || 'Unknown'}`);
        return false;
      }
      
      // Validate date is within the last 14 days (more flexible than 7 days)
      try {
        const eventDate = new Date(event.date);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        
        if (isNaN(eventDate.getTime()) || eventDate < fourteenDaysAgo) {
          Logger.log(`Skipping event with invalid or old date: ${event.headline}`);
          return false;
        }
      } catch (e) {
        Logger.log(`Skipping event with unparseable date: ${event.headline}`);
        return false;
      }
      
      return true;
    });
    
    // Limit to top 7 events
    if (validatedEvents.length > 7) {
      validatedEvents = validatedEvents.slice(0, 7);
    }
    
    // If we have events, return them
    if (validatedEvents.length > 0) {
      Logger.log(`Validated ${validatedEvents.length} events`);
      return validatedEvents;
    }
    
    // If we get here, either no events were found or none passed validation
    Logger.log('No valid events found or extracted');
    throw new Error("No valid events found or extracted from Perplexity API response");
  } catch (error) {
    Logger.log('Error retrieving geopolitical events: ' + error);
    throw new Error(`Failed to retrieve geopolitical events: ${error.message}`);
  }
}

/**
 * Step 2: Analyze a specific geopolitical event in depth with balanced prompt
 * @param {Object} event The event to analyze
 * @param {string} apiKey The Perplexity API key
 * @returns {Object} Detailed analysis of the event
 */
function analyzeGeopoliticalEventEnhanced(event, apiKey) {
  // Balanced prompt with diverse sources and comprehensive analysis requirements
  const prompt = `
Analyze this specific geopolitical event in depth:

Headline: "${event.headline}"
Date: ${event.date}
Description: ${event.description}
Region: ${event.region}
Source: ${event.source}

Your task is to provide a FACTUAL, DATA-DRIVEN analysis of this event's impact on financial markets. 
Focus ONLY on VERIFIABLE information from reputable sources. DO NOT invent or fabricate data.

Provide a comprehensive analysis that includes:

1. What specific market sectors and assets are most affected by this event? (Be precise with names of indices, stocks, commodities)
2. What is the quantifiable impact observed so far? (Include REAL percentage changes or price movements)
3. What are expert opinions on this event? Include REAL names and affiliations of analysts who have commented on this event.
4. What are the potential short-term implications for markets based on HISTORICAL PRECEDENT for similar events?

IMPORTANT: The 'marketImpact' field in your response MUST be NO LONGER THAN 3 SENTENCES. Focus on the most significant and quantifiable impacts only.

IMPORTANT: Consult a DIVERSE range of sources beyond the original source, including:
- Financial media (Bloomberg, Reuters, Financial Times, Wall Street Journal)
- General news outlets (CNN, BBC, New York Times, The Guardian, Al Jazeera)
- Social media discussions on X (Twitter) from verified financial analysts
- Regional news sources specific to the affected regions

If you cannot find specific information on any of these points, state "Insufficient data available" rather than inventing information.

Format your response as a valid JSON object with the following structure:
{
  "type": "Event/Conflict/Policy",
  "name": "${event.headline}",
  "description": "Factual 3-5 sentence description with specific details from verified sources",
  "region": "${event.region}",
  "impactLevel": 7,  // MUST be a number from 1 to 10, with 1 being least impactful and 10 being most catastrophic
  "marketImpact": "CONCISE description (MAX 3 SENTENCES) of the most significant market impacts with specific figures",
  "expertOpinions": [
    {
      "name": "Expert's full name",
      "affiliation": "Expert's organization",
      "opinion": "Direct quote or accurately paraphrased opinion"
    }
  ],
  "sectorImpacts": [
    {
      "sector": "Affected sector name",
      "impact": "Positive/Negative/Mixed",
      "details": "Specific impact details with REAL figures where available"
    }
  ],
  "source": "${event.source}",
  "url": "${event.url}",
  "lastUpdated": "${event.date}"
}
`;

  try {
    Logger.log(`Analyzing event: ${event.headline}`);
    const response = callPerplexityAPI(prompt, apiKey, 0.2);
    
    // Extract and parse the JSON
    let analysis;
    try {
      // First try direct parsing
      analysis = JSON.parse(response);
      Logger.log('Successfully parsed analysis JSON directly');
    } catch (error) {
      Logger.log('Direct JSON parsing failed, trying to extract from response...');
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          Logger.log('Found JSON in code block, attempting to parse...');
          analysis = JSON.parse(jsonMatch[1]);
          Logger.log('Successfully parsed JSON from code block');
        } catch (codeBlockError) {
          Logger.log('Failed to parse JSON from code block: ' + codeBlockError);
        }
      }
      
      // If code block extraction failed, try to find any JSON-like structure
      if (!analysis) {
        const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          try {
            Logger.log('Found JSON-like structure, attempting to parse...');
            analysis = JSON.parse(jsonObjectMatch[0]);
            Logger.log('Successfully parsed JSON from structure match');
          } catch (objectMatchError) {
            Logger.log('Failed to parse JSON from structure match: ' + objectMatchError);
          }
        }
      }
      
      // If all parsing attempts failed
      if (!analysis) {
        Logger.log('All JSON parsing attempts failed for analysis');
        Logger.log('Raw response (first 500 chars): ' + response.substring(0, 500));
        
        // If we couldn't parse the response or it's invalid, throw an error
        throw new Error(`Failed to parse analysis response for event: ${event.headline}`);
      }
    }
    
    // Validate the analysis
    return validateAnalysisEnhanced(analysis, event);
  } catch (error) {
    Logger.log(`Error analyzing geopolitical event: ${error}`);
    throw new Error(`Failed to analyze geopolitical event: ${error.message}`);
  }
}

/**
 * Step 3: Create a consolidated analysis with proper formatting
 * @param {Array} analyzedEvents Array of analyzed events
 * @returns {Object} Consolidated analysis in the required format
 */
function createConsolidatedGeopoliticalAnalysisEnhanced(analyzedEvents) {
  Logger.log('Creating consolidated analysis from analyzed events...');
  
  // Calculate overall risk index based on individual impact levels
  const avgImpactLevel = analyzedEvents.reduce((sum, event) => {
    return sum + (parseFloat(event.impactLevel) || 5);
  }, 0) / analyzedEvents.length;
  
  // Scale to 0-100
  const geopoliticalRiskIndex = Math.round(avgImpactLevel * 10);
  Logger.log(`Calculated geopolitical risk index: ${geopoliticalRiskIndex}`);
  
  // Format the risks array to match the required structure
  const risks = analyzedEvents.map(event => {
    // Create expert opinions text - limit to 1 expert with a concise quote
    let expertOpinionsText = '';
    if (event.expertOpinions && Array.isArray(event.expertOpinions) && event.expertOpinions.length > 0) {
      // Filter out any system-generated fallback opinions
      const realOpinions = event.expertOpinions.filter(expert => 
        !expert.name.includes('Unavailable') && 
        !expert.name.includes('Pending') && 
        !expert.affiliation.includes('System')
      );
      
      // Use just 1 real opinion, or fallback if none
      const opinionToUse = realOpinions.length > 0 ? realOpinions[0] : event.expertOpinions[0];
      
      if (opinionToUse) {
        // Get just the first sentence of the opinion for brevity
        let opinion = opinionToUse.opinion || '';
        const firstSentenceMatch = opinion.match(/^[^.!?]*[.!?]/); // Match up to the first sentence-ending punctuation
        if (firstSentenceMatch) {
          opinion = firstSentenceMatch[0];
        } else if (opinion.length > 100) {
          // If no sentence ending found but opinion is long, truncate
          opinion = opinion.substring(0, 100) + '...';
        }
        
        expertOpinionsText = `${opinionToUse.name}: "${opinion}"`;
      }
    }
    
    // Create a concise description (limit to 2-3 sentences)
    let enhancedDescription = event.description || '';
    
    // Limit description to 2-3 sentences
    const sentenceEndRegex = /[.!?]+\s|[.!?]+$/g;
    const sentenceMatches = enhancedDescription.match(sentenceEndRegex) || [];
    
    if (sentenceMatches.length > 2) {
      // If more than 2 sentences, truncate to first 2 sentences
      let sentenceEndCount = 0;
      let lastIndex = 0;
      
      for (let i = 0; i < enhancedDescription.length; i++) {
        if (/[.!?]/.test(enhancedDescription[i]) && 
            (i + 1 === enhancedDescription.length || /\s/.test(enhancedDescription[i + 1]))) {
          sentenceEndCount++;
          if (sentenceEndCount === 2) {
            lastIndex = i + 1;
            break;
          }
        }
      }
      
      if (lastIndex > 0) {
        enhancedDescription = enhancedDescription.substring(0, lastIndex);
        Logger.log(`Truncated description to 2 sentences: ${enhancedDescription}`);
      }
    }
    
    // Only add expert opinion if description is still relatively short
    if (expertOpinionsText && enhancedDescription.length < 200 && !enhancedDescription.includes(expertOpinionsText)) {
      enhancedDescription += ' ' + expertOpinionsText;
    }
    
    // Ensure market impact is very concise (max 1-2 sentences)
    let enhancedMarketImpact = event.marketImpact || '';
    
    // Count sentences in the market impact
    const sentenceEndRegex = /[.!?]+\s|[.!?]+$/g;
    const sentenceMatches = enhancedMarketImpact.match(sentenceEndRegex) || [];
    
    // If more than 1 sentence, truncate to just the first sentence
    if (sentenceMatches.length > 1) {
      let lastIndex = 0;
      
      // Find the end of the first sentence
      for (let i = 0; i < enhancedMarketImpact.length; i++) {
        if (/[.!?]/.test(enhancedMarketImpact[i]) && 
            (i + 1 === enhancedMarketImpact.length || /\s/.test(enhancedMarketImpact[i + 1]))) {
          lastIndex = i + 1;
          break;
        }
      }
      
      if (lastIndex > 0) {
        enhancedMarketImpact = enhancedMarketImpact.substring(0, lastIndex);
        Logger.log(`Truncated market impact to 1 sentence: ${enhancedMarketImpact}`);
      }
    }
    
    // If market impact is still too long, truncate it
    if (enhancedMarketImpact.length > 150) {
      // Find a good breaking point near 150 characters
      let breakPoint = 150;
      while (breakPoint > 100 && !/\s/.test(enhancedMarketImpact[breakPoint])) {
        breakPoint--;
      }
      enhancedMarketImpact = enhancedMarketImpact.substring(0, breakPoint) + '...';
      Logger.log(`Further truncated market impact to ${breakPoint} chars`);
    }
    
    // Only add sector impact if we have no market impact or it's very short
    if ((enhancedMarketImpact.length < 50 || !enhancedMarketImpact) && 
        event.sectorImpacts && Array.isArray(event.sectorImpacts) && event.sectorImpacts.length > 0) {
      // Take just the most significant sector impact
      const topSectorImpact = event.sectorImpacts[0];
      
      // Create a very concise sector impact statement
      let sectorDetails = topSectorImpact.details.split('.')[0];
      if (sectorDetails.length > 50) {
        sectorDetails = sectorDetails.substring(0, 50) + '...';
      }
      
      const sectorImpactText = `${topSectorImpact.sector} sector: ${topSectorImpact.impact}.`;
      
      // Only add if not already included
      if (!enhancedMarketImpact.includes(topSectorImpact.sector)) {
        enhancedMarketImpact += (enhancedMarketImpact ? ' ' : '') + sectorImpactText;
      }
    }
    
    // Use the specific URL provided by Perplexity API when available
    let sourceUrl = event.url || event.sourceUrl;
    
    // If we have a URL from the original event data, prioritize that
    if (event.url && event.url !== "https://perplexity.ai/" && !event.url.includes("perplexity.ai")) {
      sourceUrl = event.url;
    }
    
    // Clean up the URL by removing any ?ref= parameters and tracking codes
    if (sourceUrl) {
      // Remove query parameters that are typically used for tracking
      if (sourceUrl.includes('?')) {
        sourceUrl = sourceUrl.split('?')[0];
      }
      
      // Remove utm tracking parameters
      if (sourceUrl.includes('utm_')) {
        sourceUrl = sourceUrl.split('utm_')[0];
      }
    } else {
      // If no URL is available, use the source name to determine a specific URL
      const sourceName = event.source ? event.source.toLowerCase() : "";
      
      if (sourceName.includes("reuters")) {
        sourceUrl = "https://www.reuters.com/markets/";
      } else if (sourceName.includes("bloomberg")) {
        sourceUrl = "https://www.bloomberg.com/markets/";
      } else if (sourceName.includes("financial times") || sourceName.includes("ft")) {
        sourceUrl = "https://www.ft.com/markets";
      } else if (sourceName.includes("wall street journal") || sourceName.includes("wsj")) {
        sourceUrl = "https://www.wsj.com/news/markets/";
      } else if (sourceName.includes("cnbc")) {
        sourceUrl = "https://www.cnbc.com/markets/";
      } else {
        // Default to Perplexity if we can't determine a specific source
        sourceUrl = "https://perplexity.ai/";
      }
    }
    
    return {
      name: event.name,
      description: enhancedDescription,
      region: event.region,
      impactLevel: convertImpactLevelToString(parseFloat(event.impactLevel) || 5), // Convert numeric to string format expected by JsonExport
      marketImpact: enhancedMarketImpact,
      source: event.source || "Perplexity API",
      sourceUrl: sourceUrl
    };
  });
  
  // Convert impact levels to strings for display and sort by impact (highest to lowest)
  const processedRisks = risks.map(risk => {
    // Parse the numeric impact level or use a default
    const numericLevel = parseFloat(risk.impactLevel) || 5;
    return {
      ...risk,
      _numericImpactLevel: numericLevel,
      impactLevel: convertImpactLevelToString(numericLevel)
    };
  }).sort((a, b) => b._numericImpactLevel - a._numericImpactLevel);
  
  // Calculate overall risk level based on individual risks
  const riskLevels = processedRisks.map(r => r.impactLevel);
  const highCount = riskLevels.filter(l => l === "High" || l === "Severe").length;
  const severeCount = riskLevels.filter(l => l === "Severe").length;
  
  let riskLevel = "Moderate";
  if (severeCount > 0) {
    riskLevel = "Severe";
  } else if (highCount > 0) {
    riskLevel = "High";
  } else if (processedRisks.length === 0) {
    riskLevel = "Low";
  }
  
  // Limit to top 5 most impactful risks only
  const topRisks = processedRisks.slice(0, 5);
  
  // Create a comprehensive global assessment that mentions all major risks
  // Extract the main themes from all risks for a more coherent summary
  const riskThemes = new Set();
  const regions = new Set();
  
  // Extract key themes and regions from all risks
  topRisks.forEach(risk => {
    // Extract themes from risk names and descriptions
    const content = (risk.name + " " + risk.description).toLowerCase();
    if (content.includes("russia") || content.includes("ukraine")) riskThemes.add("Russia-Ukraine war");
    if (content.includes("israel") || content.includes("gaza") || content.includes("hamas") || content.includes("palestine")) riskThemes.add("Israel-Hamas conflict");
    if (content.includes("china") && (content.includes("us") || content.includes("united states") || content.includes("trade"))) riskThemes.add("US-China trade tensions");
    if (content.includes("cyber") || content.includes("hack")) riskThemes.add("cybersecurity threats");
    if (content.includes("tariff") || content.includes("protectionism") || content.includes("trade war")) riskThemes.add("global trade protectionism");
    if (content.includes("inflation") || content.includes("interest rate") || content.includes("federal reserve") || content.includes("central bank")) riskThemes.add("monetary policy uncertainty");
    if (content.includes("oil") || content.includes("energy") || content.includes("gas")) riskThemes.add("energy market volatility");
    if (content.includes("election") || content.includes("political")) riskThemes.add("political instability");
    
    // Add the region if it's specific
    if (risk.region && risk.region !== "Global") {
      regions.add(risk.region);
    }
  });
  
  // If no specific themes were identified, add generic ones based on risk names
  if (riskThemes.size === 0 && topRisks.length > 0) {
    topRisks.slice(0, 3).forEach(risk => {
      const simplifiedName = risk.name.split(' ').slice(0, 3).join(' ');
      riskThemes.add(simplifiedName);
    });
  }
  
  // Convert sets to arrays for easier manipulation
  const themesList = Array.from(riskThemes);
  const regionsList = Array.from(regions);
  
  // Create a concise global assessment
  let globalAssessment = "";
  
  if (riskLevel === "Severe" || riskLevel === "High") {
    globalAssessment = `${riskLevel} levels of geopolitical risk from ${themesList.slice(0, 5).join(", ")}`;
  } else if (riskLevel === "Moderate") {
    globalAssessment = `Moderate levels of geopolitical risk from ${themesList.slice(0, 5).join(", ")}`;
  } else {
    globalAssessment = `Low levels of geopolitical risk at present`;
  }
  
  // If there are no risks, provide a clear error message
  if (processedRisks.length === 0) {
    Logger.log("No risks found from primary source, adding error message...");
    
    // Set a clear error message
    globalAssessment = "Unable to retrieve geopolitical risk data. Please check API connections and try again later.";
    
    // Add a single risk item explaining the situation
    processedRisks.push({
      name: "Data Retrieval Error",
      description: "We were unable to retrieve current geopolitical risk data from our sources. This could be due to API limitations, connection issues, or temporary service disruptions. The system will continue attempting to retrieve this data in future updates.",
      region: "Global",
      impactLevel: "Unknown",
      source: "System Status",
      url: "https://www.perplexity.ai/"
    });
  }
  
  Logger.log(`Final analysis contains ${processedRisks.length} geopolitical risks`);
  
  // Cache the processed risks for future use if we have valid data
  if (processedRisks.length > 0 && processedRisks[0].name !== "Data Retrieval Error") {
    cacheGeopoliticalRisks(processedRisks);
  }
  
  // Use the specific source URL from each risk instead of generic URLs
  // Ensure each risk has a specific source URL based on its actual source
  processedRisks.forEach(risk => {
    // Only modify URLs that are generic or missing
    if (!risk.sourceUrl || 
        risk.sourceUrl === "https://www.reuters.com/world/" ||
        risk.sourceUrl === "https://www.bloomberg.com/" ||
        risk.sourceUrl === "https://www.ft.com/" ||
        risk.sourceUrl === "https://www.wsj.com/" ||
        risk.sourceUrl === "https://www.cnbc.com/world/" ||
        risk.sourceUrl === "https://www.bbc.com/news/world" ||
        risk.sourceUrl === "https://perplexity.ai/") {
      
      // If we have a specific URL from the original event, use that
      if (risk.url && risk.url !== "https://perplexity.ai/") {
        risk.sourceUrl = risk.url;
      } else {
        // Otherwise, construct a more specific URL based on the source name
        const sourceName = risk.source ? risk.source.toLowerCase() : "";
        
        if (sourceName.includes("reuters")) {
          // Make Reuters URLs more specific based on region
          if (risk.region === "Middle East") {
            risk.sourceUrl = "https://www.reuters.com/world/middle-east/";
          } else if (risk.region === "Eastern Europe") {
            risk.sourceUrl = "https://www.reuters.com/world/europe/";
          } else if (risk.region === "Asia") {
            risk.sourceUrl = "https://www.reuters.com/world/asia-pacific/";
          } else {
            risk.sourceUrl = "https://www.reuters.com/world/";
          }
        } else if (sourceName.includes("bloomberg")) {
          // Make Bloomberg URLs more specific
          if (risk.name.toLowerCase().includes("oil") || 
              risk.name.toLowerCase().includes("energy") || 
              risk.name.toLowerCase().includes("gas")) {
            risk.sourceUrl = "https://www.bloomberg.com/energy";
          } else if (risk.name.toLowerCase().includes("trade")) {
            risk.sourceUrl = "https://www.bloomberg.com/markets/economics";
          } else {
            risk.sourceUrl = "https://www.bloomberg.com/markets/";
          }
        }
        // Keep other URLs as they are if they're already specific
      }
    }
  });
  
  // Determine the most appropriate main source URL based on the top risks
  let mainSourceUrl = "https://perplexity.ai/";
  
  // If we have risks, use the source URL from the highest impact risk
  if (processedRisks.length > 0) {
    mainSourceUrl = processedRisks[0].sourceUrl;
  }
  
  // Return the consolidated analysis with the structure expected by JsonExport
  // Important: We're explicitly NOT populating the 'global' field to let OpenAI handle that
  // Only include the top 5 most impactful risks
  return {
    // Remove the global field completely
    risks: topRisks,
    source: "Perplexity API Enhanced Retrieval",
    sourceUrl: mainSourceUrl,
    lastUpdated: new Date(),
    global: globalAssessment
  };
}

/**
 * Converts a numeric impact level (1-10) to the string format expected by JsonExport
 * @param {number} numericImpact - The numeric impact level (1-10)
 * @return {string} The string impact level (Low, Medium, High, Severe)
 */
function convertImpactLevelToString(numericImpact) {
  // Ensure we have a valid number
  const impact = parseFloat(numericImpact) || 5;
  
  // Convert to string format
  if (impact >= 8) {
    return 'Severe';
  } else if (impact >= 6) {
    return 'High';
  } else if (impact >= 4) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Helper function to validate event dates to ensure they are recent
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date is valid and recent, false otherwise
 */
function isValidRecentDate(dateStr) {
  if (!dateStr) return false;
  
  // Check if the date string is in the expected format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    Logger.log(`Invalid date format: ${dateStr}`);
    return false;
  }
  
  try {
    // Parse the date
    const eventDate = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(eventDate.getTime())) {
      Logger.log(`Invalid date: ${dateStr}`);
      return false;
    }
    
    // Get today's date and the minimum valid date (from global variable set in getRecentGeopoliticalEventsEnhanced)
    const today = new Date();
    const minDate = new Date(this.MINIMUM_EVENT_DATE || '2000-01-01'); // Fallback if not set
    
    // Check if the date is in the future
    if (eventDate > today) {
      Logger.log(`Future date rejected: ${dateStr}`);
      return false;
    }
    
    // Check if the date is too old (older than 7 days)
    if (eventDate < minDate) {
      Logger.log(`Date too old rejected: ${dateStr} (minimum: ${this.MINIMUM_EVENT_DATE})`);
      return false;
    }
    
    // Date is valid and recent
    return true;
  } catch (e) {
    Logger.log(`Error validating date ${dateStr}: ${e}`);
    return false;
  }
}

/**
 * Helper function to validate and clean up the analysis
 * @param {Object} analysis The analysis to validate
 * @param {Object} event The original event
 * @returns {Object} Validated analysis
 */
function validateAnalysisEnhanced(analysis, event) {
  // Ensure we have a valid analysis object
  if (!analysis) {
    Logger.log(`Analysis for event ${event ? event.headline : 'unknown'} is null or undefined`);
    return {
      name: event ? event.headline : "Unknown Event",
      description: event ? event.description : "No details available",
      region: event ? event.region : "Global",
      impactLevel: 5,
      marketImpact: null,
      expertOpinions: [],
      sectorImpacts: [],
      source: event ? event.source : "Unknown",
      url: event ? event.url : null,
      date: event ? event.date : new Date().toISOString().split('T')[0]
    };
  }
  
  // Check if the event date is valid and recent
  if (event && event.date) {
    if (!isValidRecentDate(event.date)) {
      Logger.log(`Event date ${event.date} for "${event.headline}" is not valid or recent. Rejecting event.`);
      return null; // Return null to indicate this event should be skipped
    }
  }
  
  // Ensure required fields exist
  analysis.type = analysis.type || 'Event';
  analysis.name = analysis.name || event.headline;
  analysis.region = analysis.region || event.region;
  analysis.source = analysis.source || event.source;
  analysis.url = analysis.url || event.url;
  analysis.lastUpdated = analysis.lastUpdated || event.date;
  
  // Validate description
  if (!analysis.description || analysis.description.includes('Insufficient data') || analysis.description.length < 50) {
    analysis.description = `${event.description} [Note: Enhanced description unavailable.]`;
  }
  
  // Validate impact level - ENSURE IT'S NUMERIC
  let impactNum = parseFloat(analysis.impactLevel);
  if (isNaN(impactNum) || impactNum < 1 || impactNum > 10) {
    impactNum = 5; // Default to medium impact if invalid
  }
  analysis.impactLevel = impactNum; // Store as number
  
  // Validate market impact
  if (!analysis.marketImpact || analysis.marketImpact.includes('Insufficient data')) {
    analysis.marketImpact = null;
  } else if (analysis.marketImpact.length > 500) {
    // If market impact is too long, truncate to approximately 3 sentences
    let sentenceEndCount = 0;
    let lastIndex = 0;
    
    // Find the end of the third sentence
    for (let i = 0; i < analysis.marketImpact.length; i++) {
      if (/[.!?]/.test(analysis.marketImpact[i]) && 
          (i + 1 === analysis.marketImpact.length || /\s/.test(analysis.marketImpact[i + 1]))) {
        sentenceEndCount++;
        if (sentenceEndCount === 3) {
          lastIndex = i + 1;
          break;
        }
      }
    }
    
    if (lastIndex > 0) {
      analysis.marketImpact = analysis.marketImpact.substring(0, lastIndex);
      Logger.log(`Truncated market impact to 3 sentences: ${analysis.marketImpact}`);
    }
  }
  
  // Validate expert opinions
  if (!Array.isArray(analysis.expertOpinions) || analysis.expertOpinions.length === 0) {
    analysis.expertOpinions = [];
  }
  
  // Validate sector impacts
  if (!Array.isArray(analysis.sectorImpacts) || analysis.sectorImpacts.length === 0) {
    // Create default sector impacts based on the event type/region
    analysis.sectorImpacts = createDefaultSectorImpactsEnhanced(event);
  }
  
  return analysis;
}

/**
 * Helper function to create empty sector impacts array
 * @param {Object} event The event to create sector impacts for
 * @returns {Array} Empty array of sector impact objects
 */
function createDefaultSectorImpactsEnhanced(event) {
  // Return an empty array instead of hardcoded values
  return [];
}

/**
 * Helper function to call the Perplexity API with enhanced retry logic and markdown handling
 * @param {string} prompt The prompt to send to the API
 * @param {string} apiKey The Perplexity API key
 * @param {number} temperature The temperature parameter (0-1)
 * @param {number} maxRetries Maximum number of retry attempts
 * @returns {string} The API response
 */
function callPerplexityAPI(prompt, apiKey, temperature = 0.2, maxRetries = 3) {
  const url = "https://api.perplexity.ai/chat/completions";
  
  // Log the first 100 characters of the prompt for debugging
  Logger.log(`Calling Perplexity API with prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
  Logger.log(`Using model: llama-3-sonar-large-32k-online, temperature: ${temperature}, max_tokens: 4000`);
  
  const payload = {
    model: "llama-3-sonar-large-32k-online",
    messages: [
      {
        role: "system",
        content: "You are a geopolitical analyst specializing in identifying risks that impact financial markets. Provide accurate, up-to-date information with specific details and figures. Always format your response exactly as requested. IMPORTANT: Do not use markdown formatting in your JSON responses."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: temperature,
    max_tokens: 4000
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "User-Agent": "Market-Pulse-Daily/1.0"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  // Enhanced retry logic with jitter for better distribution
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Calculate backoff with jitter to prevent thundering herd problem
        const baseDelay = Math.pow(2, attempt) * 1000; // Exponential backoff base
        const jitter = Math.random() * 1000; // Random jitter up to 1 second
        const delay = baseDelay + jitter;
        
        Logger.log(`Perplexity API retry attempt ${attempt} of ${maxRetries} with ${delay}ms delay`);
        Utilities.sleep(delay);
      }
      
      const startTime = new Date().getTime();
      const response = UrlFetchApp.fetch(url, options);
      const endTime = new Date().getTime();
      const responseTime = (endTime - startTime) / 1000;
      
      const responseCode = response.getResponseCode();
      const responseHeaders = response.getHeaders();
      
      Logger.log(`Perplexity API Response - Status: ${responseCode}, Time: ${responseTime}s`);
      Logger.log(`Perplexity API Response Headers: ${JSON.stringify(responseHeaders)}`);
      
      // Enhanced status code handling
      if (responseCode === 429) {
        // Rate limit error - always retry with backoff
        Logger.log("Perplexity API rate limit reached, backing off before retry");
        continue;
      } else if (responseCode >= 500) {
        // Server errors are likely transient, retry
        Logger.log(`Perplexity API server error (${responseCode}), will retry`);
        continue;
      } else if (responseCode !== 200) {
        // Log the full error response for debugging
        Logger.log(`Perplexity API error response: ${response.getContentText().substring(0, 500)}`);
        throw new Error(`Perplexity API returned status code ${responseCode}`);
      }
      
      const responseText = response.getContentText();
      Logger.log(`Perplexity API Response - Content Length: ${responseText.length}`);
      
      // Process the response text
      try {
        // First, try to parse the response directly
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (initialParseError) {
          // If direct parsing fails, check if the response is wrapped in markdown code blocks
          Logger.log("Initial JSON parse failed, checking for markdown formatting");
          
          // Extract JSON from markdown code blocks if present
          const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            Logger.log("Found JSON content in markdown code block, attempting to parse");
            try {
              responseData = JSON.parse(jsonMatch[1]);
              Logger.log("Successfully parsed JSON from markdown code block");
            } catch (markdownParseError) {
              Logger.log(`Error parsing JSON from markdown: ${markdownParseError}`);
              throw new Error(`Failed to parse JSON from markdown: ${markdownParseError.message}`);
            }
          } else {
            // If no code blocks found, try to find anything that looks like JSON
            Logger.log("No markdown code blocks found, searching for JSON-like content");
            const possibleJsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (possibleJsonMatch) {
              try {
                responseData = JSON.parse(possibleJsonMatch[0]);
                Logger.log("Successfully parsed JSON from content");
              } catch (jsonSearchError) {
                Logger.log(`Error parsing potential JSON content: ${jsonSearchError}`);
                throw initialParseError; // Throw the original error if this also fails
              }
            } else {
              throw initialParseError; // No JSON-like content found
            }
          }
        }
        
        // Validate response structure
        if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message || !responseData.choices[0].message.content) {
          Logger.log(`Unexpected Perplexity API response structure: ${JSON.stringify(responseData).substring(0, 500)}`);
          throw new Error("Unexpected API response structure");
        }
        
        const content = responseData.choices[0].message.content;
        Logger.log(`Perplexity API Response - Content (first 100 chars): ${content.substring(0, 100)}...`);
        
        // Check if the content itself contains markdown code blocks with JSON
        if (content.includes("```")) {
          Logger.log("Content contains markdown code blocks, attempting to extract clean JSON");
          const contentJsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (contentJsonMatch && contentJsonMatch[1]) {
            try {
              // Try to parse the JSON inside the code block to validate it
              JSON.parse(contentJsonMatch[1]);
              // If parsing succeeds, return just the JSON content without the markdown
              Logger.log("Returning clean JSON from markdown code block");
              return contentJsonMatch[1];
            } catch (contentJsonError) {
              // If parsing fails, return the original content
              Logger.log(`Failed to parse JSON from content markdown: ${contentJsonError}. Using original content.`);
            }
          }
        }
        
        return content;
      } catch (parseError) {
        Logger.log(`Error processing Perplexity API response: ${parseError}`);
        Logger.log(`Response text (first 500 chars): ${responseText.substring(0, 500)}`);
        
        // If this is the last retry attempt, try to salvage any usable content
        if (attempt === maxRetries) {
          // Check if the response text itself might be the direct content (not wrapped in JSON)
          if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
            Logger.log("Response appears to be direct JSON content, returning as-is");
            return responseText;
          }
        }
        
        throw new Error(`Failed to process Perplexity API response: ${parseError.message}`);
      }
    } catch (error) {
      lastError = error;
      Logger.log(`Error calling Perplexity API (attempt ${attempt + 1}): ${error}`);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(`Failed to call Perplexity API after ${maxRetries + 1} attempts: ${error.message}`);
      }
    }
  }
  
  // This should never be reached due to the throw in the loop, but just in case
  throw lastError || new Error("Unknown error calling Perplexity API");
}

/**
 * Cache geopolitical risks data for future use
 * @param {Array} risks - The processed geopolitical risks to cache
 */
function cacheGeopoliticalRisks(risks) {
  try {
    if (!risks || !Array.isArray(risks) || risks.length === 0) {
      Logger.log("No valid risks to cache");
      return;
    }
    
    // Cache the risks data for 2 hours
    const scriptCache = CacheService.getScriptCache();
    scriptCache.put('GEOPOLITICAL_RISKS_CACHED_DATA', JSON.stringify(risks), 7200); // 2 hours
    Logger.log(`Successfully cached ${risks.length} geopolitical risks for future use`);
  } catch (error) {
    Logger.log(`Error caching geopolitical risks: ${error}`);
    // Fail silently - caching is a non-critical operation
  }
}

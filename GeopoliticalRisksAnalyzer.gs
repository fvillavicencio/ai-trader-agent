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
      throw new Error("Perplexity API key not found in script properties");
    }
    
    // Step 1: Get recent specific events with balanced prompt
    try {
      const recentEvents = getRecentGeopoliticalEventsEnhanced(apiKey);
      Logger.log(`Found ${recentEvents.length} recent geopolitical events`);
      
      // Step 2: Analyze each event in depth with balanced prompt
      const analyzedEvents = [];
      for (const event of recentEvents) {
        try {
          Logger.log(`Analyzing event: ${event.headline}`);
          const analysis = analyzeGeopoliticalEventEnhanced(event, apiKey);
          analyzedEvents.push(analysis);
        } catch (analysisError) {
          Logger.log(`Error analyzing event ${event.headline}: ${analysisError}. Skipping this event.`);
          // Continue with other events even if one fails
        }
      }
      
      // Only proceed if we have at least one successfully analyzed event
      if (analyzedEvents.length === 0) {
        throw new Error("No events could be successfully analyzed");
      }
      
      // Step 3: Create consolidated analysis with proper formatting
      const geopoliticalData = createConsolidatedGeopoliticalAnalysisEnhanced(analyzedEvents);
      
      // Log the extracted data
      Logger.log("Extracted geopolitical data (first 500 chars):");
      Logger.log(JSON.stringify(geopoliticalData, null, 2).substring(0, 500) + "...");

      // Add timestamp
      geopoliticalData.lastUpdated = new Date();
      
      // Cache the result for 24 hours (using a distinct cache key for the enhanced implementation)
      const scriptCache = CacheService.getScriptCache();
      scriptCache.put('GEOPOLITICAL_RISKS_ENHANCED_DATA', JSON.stringify(geopoliticalData), 86400);
      
      // Also update the standard cache key for compatibility with existing code
      scriptCache.put('GEOPOLITICAL_RISKS_DATA', JSON.stringify(geopoliticalData), 86400);
      
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
      
      // Return an empty object structure instead of hardcoded values
      return {
        global: null,
        risks: [],
        source: null,
        sourceUrl: null,
        lastUpdated: new Date()
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
  const currentDate = Utilities.formatDate(new Date(), TIME_ZONE, "MMMM dd, yyyy");
  
  // Calculate dates for the past 7 days for better context
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const yesterdayFormatted = Utilities.formatDate(yesterday, TIME_ZONE, "MMMM dd, yyyy");
  const twoDaysAgoFormatted = Utilities.formatDate(twoDaysAgo, TIME_ZONE, "MMMM dd, yyyy");
  
  // Balanced prompt with diverse sources and coverage requirements
  const prompt = `
Today's Date: ${currentDate}
Yesterday: ${yesterdayFormatted}
Two Days Ago: ${twoDaysAgoFormatted}

Identify the 7 MOST SIGNIFICANT geopolitical events from the PAST WEEK that are CURRENTLY impacting financial markets.

CRITICAL REQUIREMENTS:
1. Focus on REAL, VERIFIABLE events that have occurred recently
2. Each event MUST have a documented market impact (specific sectors, indices, or assets affected)
3. Each event MUST be from a reputable news source published in the last 7 days
4. Each event MUST include specific details (names, figures, dates)
5. Events should represent a DIVERSE range of regions and event types

ENSURE DIVERSE COVERAGE across these categories:
- Major conflicts or military actions in any region
- Significant diplomatic developments (state visits, treaties, negotiations)
- Central bank decisions and monetary policy changes
- Trade agreements or disputes
- Political transitions or elections with market impact
- Regulatory changes affecting global industries
- Energy market developments
- Natural disasters with economic consequences

SEARCH ACROSS THESE DIVERSE SOURCES:
1. Financial News: Bloomberg, Financial Times, Reuters, Wall Street Journal, CNBC
2. General News: CNN, BBC, New York Times, The Guardian, Al Jazeera, NPR
3. Social Media: Trending topics on X (Twitter) related to markets
4. Research: Major bank research (Goldman Sachs, JPMorgan, Morgan Stanley)
5. Regional Sources: Include sources specific to the regions involved in events

DO NOT OVERREPRESENT any single region, conflict, or type of event. Aim for global coverage.

Format your response as a valid JSON array with the following structure:
[
  {
    "headline": "Brief headline of the event",
    "date": "YYYY-MM-DD", // Must be a real date from the past 7 days
    "description": "Brief 1-2 sentence description of the event with SPECIFIC details",
    "region": "Affected region",
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
    // Create expert opinions text - limit to 2 experts to keep description concise
    let expertOpinionsText = '';
    if (event.expertOpinions && Array.isArray(event.expertOpinions) && event.expertOpinions.length > 0) {
      // Filter out any system-generated fallback opinions
      const realOpinions = event.expertOpinions.filter(expert => 
        !expert.name.includes('Unavailable') && 
        !expert.name.includes('Pending') && 
        !expert.affiliation.includes('System')
      );
      
      // Use up to 2 real opinions, or fallback if none
      const opinionsToUse = realOpinions.length > 0 ? realOpinions.slice(0, 2) : event.expertOpinions.slice(0, 1);
      
      expertOpinionsText = opinionsToUse.map(expert => 
        `${expert.name} (${expert.affiliation}): "${expert.opinion}"`
      ).join(' ');
    }
    
    // Enhance description with expert opinions, but keep it concise
    let enhancedDescription = event.description;
    if (expertOpinionsText && !enhancedDescription.includes(expertOpinionsText)) {
      // Check if description is already long
      if (enhancedDescription.length > 300) {
        // If description is already long, don't add expert opinions
        Logger.log(`Description for ${event.name} already long (${enhancedDescription.length} chars), not adding expert opinions`);
      } else {
        enhancedDescription += ' Experts weigh in: ' + expertOpinionsText;
      }
    }
    
    // Ensure market impact is concise (max 3 sentences)
    let enhancedMarketImpact = event.marketImpact || '';
    
    // Count sentences in the market impact (roughly by counting periods, question marks, and exclamation points)
    const sentenceCount = (enhancedMarketImpact.match(/[.!?]+\s|[.!?]+$/g) || []).length;
    
    // If more than 3 sentences, truncate to first 3 sentences
    if (sentenceCount > 3) {
      let sentenceEndCount = 0;
      let lastIndex = 0;
      
      // Find the end of the third sentence
      for (let i = 0; i < enhancedMarketImpact.length; i++) {
        if (/[.!?]/.test(enhancedMarketImpact[i]) && 
            (i + 1 === enhancedMarketImpact.length || /\s/.test(enhancedMarketImpact[i + 1]))) {
          sentenceEndCount++;
          if (sentenceEndCount === 3) {
            lastIndex = i + 1;
            break;
          }
        }
      }
      
      if (lastIndex > 0) {
        enhancedMarketImpact = enhancedMarketImpact.substring(0, lastIndex);
        Logger.log(`Truncated market impact to 3 sentences: ${enhancedMarketImpact}`);
      }
    }
    
    // Only add sector impacts if we have fewer than 3 sentences
    if (sentenceCount < 3 && event.sectorImpacts && Array.isArray(event.sectorImpacts) && event.sectorImpacts.length > 0) {
      // Take just the most significant sector impact
      const topSectorImpact = event.sectorImpacts[0];
      const sectorImpactText = `${topSectorImpact.sector} sector: ${topSectorImpact.impact} (${topSectorImpact.details.split('.')[0]}).`;
      
      // Only add if not already included and we're still under 3 sentences
      if (!enhancedMarketImpact.includes(topSectorImpact.sector) && sentenceCount < 3) {
        enhancedMarketImpact += ' ' + sectorImpactText;
      }
    }
    
    // Determine appropriate source URL based on source name or content
    let sourceUrl = event.url || event.sourceUrl;
    
    // If no specific URL is provided, assign a relevant one based on the source name or content
    if (!sourceUrl || sourceUrl === "https://perplexity.ai/") {
      const sourceName = event.source ? event.source.toLowerCase() : "";
      const eventContent = (event.name + " " + enhancedDescription).toLowerCase();
      
      if (sourceName.includes("reuters") || eventContent.includes("reuters")) {
        sourceUrl = "https://www.reuters.com/world/";
      } else if (sourceName.includes("bloomberg") || eventContent.includes("bloomberg")) {
        sourceUrl = "https://www.bloomberg.com/";
      } else if (sourceName.includes("financial times") || sourceName.includes("ft") || 
                eventContent.includes("financial times") || eventContent.includes(" ft ")) {
        sourceUrl = "https://www.ft.com/";
      } else if (sourceName.includes("wall street journal") || sourceName.includes("wsj") || 
                eventContent.includes("wall street journal") || eventContent.includes(" wsj ")) {
        sourceUrl = "https://www.wsj.com/";
      } else if (sourceName.includes("cnbc") || eventContent.includes("cnbc")) {
        sourceUrl = "https://www.cnbc.com/world/";
      } else if (sourceName.includes("bbc") || eventContent.includes("bbc")) {
        sourceUrl = "https://www.bbc.com/news/world";
      } else if (eventContent.includes("china") || eventContent.includes("beijing") || 
                eventContent.includes("taiwan") || eventContent.includes("asia")) {
        sourceUrl = "https://www.reuters.com/world/asia-pacific/";
      } else if (eventContent.includes("russia") || eventContent.includes("ukraine") || 
                eventContent.includes("europe")) {
        sourceUrl = "https://www.reuters.com/world/europe/";
      } else if (eventContent.includes("middle east") || eventContent.includes("iran") || 
                eventContent.includes("israel") || eventContent.includes("saudi")) {
        sourceUrl = "https://www.ft.com/world/mideast";
      } else if (eventContent.includes("fed") || eventContent.includes("federal reserve") || 
                eventContent.includes("interest rate") || eventContent.includes("central bank")) {
        sourceUrl = "https://www.wsj.com/economy/";
      } else if (eventContent.includes("oil") || eventContent.includes("energy") || 
                eventContent.includes("gas")) {
        sourceUrl = "https://www.bloomberg.com/energy";
      } else {
        sourceUrl = "https://www.reuters.com/world/";
      }
    }
    
    // Clean up the URL by removing any ?ref= parameters
    if (sourceUrl && sourceUrl.includes('?ref=')) {
      sourceUrl = sourceUrl.split('?ref=')[0];
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
  
  // Create a comprehensive global assessment that mentions all major risks
  // Extract the main themes from all risks for a more coherent summary
  const riskThemes = new Set();
  const regions = new Set();
  
  // Extract key themes and regions from all risks
  processedRisks.forEach(risk => {
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
  if (riskThemes.size === 0 && processedRisks.length > 0) {
    processedRisks.slice(0, 3).forEach(risk => {
      const simplifiedName = risk.name.split(' ').slice(0, 3).join(' ');
      riskThemes.add(simplifiedName);
    });
  }
  
  // Convert sets to arrays for easier manipulation
  const themesList = Array.from(riskThemes);
  const regionsList = Array.from(regions);
  
  // Create a coherent global assessment
  let globalAssessment = "";
  
  if (riskLevel === "Severe" || riskLevel === "High") {
    globalAssessment = `${riskLevel} levels of geopolitical risk from ${themesList.slice(0, 5).join(", ")}${regionsList.length > 0 ? ` affecting ${regionsList.slice(0, 3).join(", ")}` : ""}. Markets are experiencing ${riskLevel === "Severe" ? "significant" : "heightened"} volatility, with particular impact on ${processedRisks.slice(0, 2).map(r => r.name.split(' ').slice(0, 3).join(' ')).join(" and ")}.`;
  } else if (riskLevel === "Moderate") {
    globalAssessment = `Moderate levels of geopolitical risk from ${themesList.slice(0, 5).join(", ")}${regionsList.length > 0 ? ` affecting ${regionsList.slice(0, 3).join(", ")}` : ""}. These events are creating uncertainty in financial markets, particularly in relation to ${processedRisks.slice(0, 2).map(r => r.name.split(' ').slice(0, 3).join(' ')).join(" and ")}.`;
  } else {
    globalAssessment = `Low levels of geopolitical risk currently, with minimal market impact. Ongoing situations to monitor include ${themesList.slice(0, 3).join(", ")}.`;
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
  
  // Determine the most appropriate main source URL based on the top risks
  let mainSourceUrl = "https://www.reuters.com/world/";
  
  // If we have risks, use the source URL from the highest impact risk
  if (processedRisks.length > 0) {
    mainSourceUrl = processedRisks[0].sourceUrl;
  }
  
  // Return the consolidated analysis with the structure expected by JsonExport
  // Note: We're no longer populating the 'global' field, letting OpenAI handle that
  return {
    geopoliticalRiskIndex: riskLevel === "Severe" ? 90 : riskLevel === "High" ? 70 : riskLevel === "Moderate" ? 50 : 30,
    risks: processedRisks,
    source: "Perplexity API Enhanced Retrieval",
    sourceUrl: mainSourceUrl,
    lastUpdated: new Date()
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
 * Helper function to validate and clean up the analysis
 * @param {Object} analysis The analysis to validate
 * @param {Object} event The original event
 * @returns {Object} Validated analysis
 */
function validateAnalysisEnhanced(analysis, event) {
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
 * Helper function to call the Perplexity API
 * @param {string} prompt The prompt to send to the API
 * @param {string} apiKey The Perplexity API key
 * @param {number} temperature The temperature parameter (0-1)
 * @returns {string} The API response
 */
function callPerplexityAPI(prompt, apiKey, temperature = 0.2) {
  const url = "https://api.perplexity.ai/chat/completions";
  
  const payload = {
    model: "llama-3-sonar-large-32k-online",
    messages: [
      {
        role: "system",
        content: "You are a geopolitical analyst specializing in identifying risks that impact financial markets. Provide accurate, up-to-date information with specific details and figures. Always format your response exactly as requested."
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
      "Authorization": `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`Perplexity API returned status code ${responseCode}: ${response.getContentText()}`);
    }
    
    const responseData = JSON.parse(response.getContentText());
    return responseData.choices[0].message.content;
  } catch (error) {
    Logger.log(`Error calling Perplexity API: ${error}`);
    throw new Error(`Failed to call Perplexity API: ${error.message}`);
  }
}

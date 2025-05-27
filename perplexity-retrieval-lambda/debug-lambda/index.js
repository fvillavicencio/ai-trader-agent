/**
 * Lambda handler for retrieving geopolitical risks data from Perplexity API
 */

const axios = require('axios');
const { parseGeopoliticalRisksFromText } = require('./parseFunction');

// Lambda handler
exports.handler = async (event = {}) => {
  console.log('Lambda invoked with event:', JSON.stringify(event));
  
  try {
    // Get API key from environment or event
    const apiKey = process.env.PERPLEXITY_API_KEY || event.PERPLEXITY_API_KEY;
    console.log('PERPLEXITY_API_KEY present:', !!apiKey);
    console.log('API Key starts with:', apiKey ? apiKey.substring(0, 5) + '...' : 'N/A');
    
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not provided');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'PERPLEXITY_API_KEY not provided' })
      };
    }

    // Get fallback flag from environment or event
    const useFallback = (process.env.USE_FALLBACK === 'true') || event.useFallback;
    console.log('USE_FALLBACK:', useFallback);

    // If fallback is requested, return fallback data
    if (useFallback) {
      console.log('Using fallback data');
      const fallbackData = createFallbackData();
      return {
        statusCode: 200,
        body: JSON.stringify(fallbackData)
      };
    }

    // Check if we should return full data or just test the API
    const fullData = event.fullData === true;
    console.log('Request for full data:', fullData);

    try {
      if (fullData) {
        console.log('Retrieving full geopolitical risks data...');
        const geopoliticalData = await retrieveGeopoliticalRisksEnhanced(apiKey);
        console.log('Geopolitical data retrieved successfully');
        
        return {
          statusCode: 200,
          body: JSON.stringify(geopoliticalData)
        };
      } else {
        // Just test the API connection
        console.log('Testing Perplexity API connection...');
        const testResponse = await axios({
          method: 'post',
          url: 'https://api.perplexity.ai/chat/completions',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          data: {
            model: 'sonar-pro',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant.'
              },
              {
                role: 'user',
                content: 'Hello, are you working?'
              }
            ],
            temperature: 0.0,
            max_tokens: 100
          }
        });
        
        console.log('Perplexity API test successful:', testResponse.status);
        
        // Return the API test result
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: 'Perplexity API connection successful',
            model: 'sonar-pro',
            responseStatus: testResponse.status,
            responsePreview: testResponse.data.choices[0].message.content.substring(0, 100) + '...'
          })
        };
      }
    } catch (apiError) {
      console.error('Perplexity API error:', apiError.message);
      console.error('Error details:', apiError.response ? JSON.stringify(apiError.response.data) : 'No response data');
      
      // Return fallback data if API test fails
      const fallbackData = createFallbackData(apiError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          ...fallbackData,
          error: apiError.message,
          details: 'API request failed'
        })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(geopoliticalData)
    };
  } catch (error) {
    console.error('Error in Lambda handler:', error);
    const fallbackData = createFallbackData(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ...fallbackData,
        error: error.message,
        stack: error.stack
      })
    };
  }
};

// Main function to retrieve geopolitical risks data using the enhanced multi-step approach
async function retrieveGeopoliticalRisksEnhanced(apiKey) {
  try {
    console.log('Starting enhanced geopolitical risks retrieval...');
    
    // Direct prompt for geopolitical risks
    const prompt = 'Provide a detailed analysis of the top 5 current geopolitical risks affecting global financial markets. For each risk, include: 1) A descriptive title, 2) Current status, 3) Potential market impact, and 4) Regions most affected.';
    
    // Call the Perplexity API directly with our prompt
    const apiResponse = await callPerplexityAPI(apiKey, prompt);
    console.log('Perplexity API response received successfully');
    
    // Extract the content from the API response
    const content = apiResponse.choices[0].message.content;
    console.log('Content extracted from response');
    
    // Process the response into a structured format
    const geopoliticalData = {
      timestamp: new Date().toISOString(),
      source: 'Perplexity API',
      model: apiResponse.model,
      risks: parseGeopoliticalRisksFromText(content),
      rawContent: content
    };
    
    console.log('Geopolitical data processed successfully');
    return geopoliticalData;
  } catch (error) {
    console.error(`Error retrieving enhanced geopolitical risks: ${error}`);
    return createFallbackData(error);
  }
}

// Step 1: Get recent specific geopolitical events with balanced prompt
async function getRecentGeopoliticalEvents(apiKey) {
  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);
  // Calculate dates for the past 7 days for better context
  const yesterday = new Date(currentDate);
  yesterday.setDate(currentDate.getDate() - 1);
  const twoDaysAgo = new Date(currentDate);
  twoDaysAgo.setDate(currentDate.getDate() - 2);
  const yesterdayFormatted = formatDate(yesterday);
  const twoDaysAgoFormatted = formatDate(twoDaysAgo);
  
  // Simplified prompt for faster processing
  const prompt = `
Today's Date: ${formattedDate}
Yesterday: ${yesterdayFormatted}
Two Days Ago: ${twoDaysAgoFormatted}

Identify the 3 MOST SIGNIFICANT geopolitical events from the PAST WEEK that are CURRENTLY impacting financial markets.

FORMAT EACH EVENT AS:
{
  "headline": "Concise headline of the event",
  "date": "Date of the event (MM/DD/YYYY)",
  "region": "Primary geographic region affected",
  "description": "2-3 sentence factual description with specific details",
  "marketImpact": "Brief statement on how this affects financial markets",
  "source": "Name of reputable news source",
  "url": "URL to the news article (if available)"
}

RETURN AS JSON ARRAY of exactly 3 events.`;

  try {
    console.log("Calling Perplexity API for recent events...");
    const response = await callPerplexityAPI(prompt, apiKey);
    console.log("Received response from Perplexity API for recent events:", response.status);
    
    // Parse the response to extract the events
    let events = [];
    try {
      // Try to parse the JSON from the response
      const responseText = response.data.text || response.data.answer || "";
      console.log("Response text:", responseText.substring(0, 200) + "...");
      
      const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
      
      if (jsonMatch) {
        console.log("Found JSON array in response");
        events = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Could not extract JSON array from response");
        throw new Error("Could not extract JSON array from response");
      }
      
      // Validate the events
      if (!Array.isArray(events) || events.length === 0) {
        console.error("No events found in response");
        throw new Error("No events found in response");
      }
      
      // Ensure each event has the required fields
      events = events.filter(event => 
        event && event.headline && event.date && event.region && 
        event.description && event.marketImpact && event.source
      );
      
      if (events.length === 0) {
        console.error("No valid events found in response");
        throw new Error("No valid events found in response");
      }
      
      console.log(`Successfully parsed ${events.length} events`);
      return events;
    } catch (parseError) {
      console.error("Error parsing events:", parseError);
      return getRealWorldFallbackEvents();
    }
  } catch (error) {
    console.error("Error getting recent geopolitical events:", error);
    return getRealWorldFallbackEvents();
  }
}

// Step 2: Analyze a specific geopolitical event in depth with balanced prompt
async function analyzeGeopoliticalEvent(event, apiKey) {
  // Simplified prompt for faster processing
  const prompt = `
Analyze this geopolitical event: ${event.headline}

Event Details:
- Date: ${event.date}
- Region: ${event.region}
- Description: ${event.description}
- Market Impact: ${event.marketImpact}
- Source: ${event.source}

Provide a brief analysis in this JSON format:
{
  "name": "${event.headline}",
  "date": "${event.date}",
  "region": "${event.region}",
  "type": "CATEGORY_OF_EVENT",
  "description": "${event.description}",
  "analysis": "Brief analysis of implications",
  "impactLevel": NUMERIC_IMPACT_LEVEL_1_TO_10,
  "marketImpact": "${event.marketImpact}",
  "sectorImpacts": [
    {"sector": "SECTOR_NAME", "impact": "POSITIVE/NEGATIVE/NEUTRAL", "description": "Brief explanation"}
  ],
  "source": "${event.source}",
  "url": "${event.url || ''}"
}`;

  try {
    console.log(`Calling Perplexity API for event analysis: ${event.headline}`);
    const response = await callPerplexityAPI(prompt, apiKey);
    console.log(`Received analysis for event: ${event.headline}`);
    
    // Parse the response to extract the analysis
    try {
      const responseText = response.data.text || response.data.answer || "";
      const jsonMatch = responseText.match(/\{.*\}/s);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return validateAnalysis(analysis, event);
      } else {
        throw new Error("Could not extract JSON object from response");
      }
    } catch (parseError) {
      console.error(`Error parsing analysis for ${event.headline}:`, parseError);
      return createFallbackAnalysis(event);
    }
  } catch (error) {
    console.error(`Error analyzing event ${event.headline}:`, error);
    return createFallbackAnalysis(event);
  }
}

// Step 3: Create a consolidated analysis with proper formatting
function createConsolidatedAnalysis(analyzedEvents) {
  // Calculate average impact level
  const totalImpact = analyzedEvents.reduce((sum, event) => sum + event.impactLevel, 0);
  const avgImpact = Math.round(totalImpact / analyzedEvents.length);
  
  // Determine overall geopolitical risk index (scale 0-100)
  const geopoliticalRiskIndex = Math.min(100, Math.max(0, avgImpact * 10));
  
  // Sort events by impact level (descending)
  const sortedEvents = [...analyzedEvents].sort((a, b) => b.impactLevel - a.impactLevel);
  
  return {
    geopoliticalRiskIndex,
    risks: sortedEvents,
    source: "Perplexity AI",
    sourceUrl: "https://perplexity.ai/",
    lastUpdated: formatDate(new Date())
  };
}

// Helper function to call the Perplexity API
async function callPerplexityAPI(apiKey, prompt, temperature = 0.0) {
  try {
    console.log('Calling Perplexity API with prompt:', prompt.substring(0, 100) + '...');
    
    const response = await axios({
      method: 'post',
      url: 'https://api.perplexity.ai/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a geopolitical risk analyst. You provide detailed analysis of global geopolitical risks and their potential impact on financial markets. Your responses should be well-structured, factual, and include specific details about each risk.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: 4000
        // Removed response_format parameter which was causing errors
      }
    });
    
    console.log('Perplexity API response status:', response.status);
    console.log('Response data preview:', JSON.stringify(response.data).substring(0, 200) + '...');
    
    return response.data;
  } catch (error) {
    console.error('Error calling Perplexity API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
      console.error(`Error response data: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Perplexity API error: ${error.message}`);
  }
}

// Helper function to validate and clean up the analysis
function validateAnalysis(analysis, event) {
  const validatedAnalysis = {
    name: analysis.name || event.headline,
    date: analysis.date || event.date,
    region: analysis.region || event.region,
    type: analysis.type || 'Geopolitical Event',
    description: analysis.description || event.description,
    analysis: analysis.analysis || 'No analysis available.',
    impactLevel: typeof analysis.impactLevel === 'number' ? 
      Math.min(10, Math.max(1, analysis.impactLevel)) : 5,
    marketImpact: analysis.marketImpact || event.marketImpact,
    sectorImpacts: Array.isArray(analysis.sectorImpacts) ? 
      analysis.sectorImpacts : createDefaultSectorImpacts(event),
    source: analysis.source || event.source,
    url: analysis.url || event.url || ''
  };
  
  // Ensure sectorImpacts has at least one item
  if (validatedAnalysis.sectorImpacts.length === 0) {
    validatedAnalysis.sectorImpacts = createDefaultSectorImpacts(event);
  }
  
  return validatedAnalysis;
}

// Helper function to create default sector impacts based on event type/region
function createDefaultSectorImpacts(event) {
  // Default sectors that might be affected by geopolitical events
  const sectors = [
    'Energy',
    'Technology',
    'Financial',
    'Defense',
    'Healthcare',
    'Consumer Staples',
    'Utilities',
    'Materials',
    'Industrials',
    'Communication Services',
    'Real Estate'
  ];
  
  // Select 3 random sectors
  const selectedSectors = [];
  const availableSectors = [...sectors];
  
  for (let i = 0; i < 3 && availableSectors.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableSectors.length);
    const sector = availableSectors.splice(randomIndex, 1)[0];
    
    // Randomly assign impact
    const impacts = ['POSITIVE', 'NEGATIVE', 'NEUTRAL'];
    const impact = impacts[Math.floor(Math.random() * impacts.length)];
    
    selectedSectors.push({
      sector,
      impact,
      description: `Default ${impact.toLowerCase()} impact on ${sector} sector due to ${event.region} event.`
    });
  }
  
  return selectedSectors;
}

// Helper function to create a fallback analysis when the API call fails
function createFallbackAnalysis(event) {
  return {
    name: event.headline,
    date: event.date,
    region: event.region,
    type: 'Geopolitical Event',
    description: event.description,
    analysis: 'Analysis unavailable due to API limitations.',
    impactLevel: 5,
    marketImpact: event.marketImpact || 'Impact assessment unavailable.',
    sectorImpacts: createDefaultSectorImpacts(event),
    source: event.source,
    url: event.url || ''
  };
}

// Helper function to create fallback data when the entire process fails
function createFallbackData(error) {
  return {
    geopoliticalRiskIndex: 50,
    risks: [
      {
        type: "Error",
        name: "API Error",
        description: "Geopolitical risk data retrieval encountered an API error: " + (error ? error.message : "Unknown error"),
        region: "Global",
        impactLevel: 5,
        marketImpact: "Unable to assess market impact at this time.",
        source: "System",
        url: "https://perplexity.ai/"
      }
    ],
    source: "System (Error Fallback)",
    sourceUrl: "https://perplexity.ai/",
    lastUpdated: formatDate(new Date()),
    error: error ? error.toString() : "Unknown error"
  };
}

// Helper function to provide real-world fallback events
function getRealWorldFallbackEvents() {
  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);
  
  return [
    {
      headline: "Ongoing Russia-Ukraine Conflict",
      date: formattedDate,
      region: "Eastern Europe",
      description: "The conflict between Russia and Ukraine continues with significant implications for global energy markets and supply chains.",
      marketImpact: "Energy prices remain volatile, with European markets particularly affected.",
      source: "Reuters",
      url: "https://www.reuters.com/"
    },
    {
      headline: "US-China Trade Tensions",
      date: formattedDate,
      region: "Global",
      description: "Ongoing trade tensions between the United States and China continue to impact global supply chains and technology sectors.",
      marketImpact: "Technology and semiconductor stocks face pressure amid supply chain concerns.",
      source: "Financial Times",
      url: "https://www.ft.com/"
    },
    {
      headline: "Middle East Regional Instability",
      date: formattedDate,
      region: "Middle East",
      description: "Continuing tensions in the Middle East affect oil markets and regional stability.",
      marketImpact: "Oil prices fluctuate in response to security concerns in major producing regions.",
      source: "Bloomberg",
      url: "https://www.bloomberg.com/"
    }
  ];
}

// Helper function to format dates consistently
function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');

/**
 * Gets authentication token for Gemini API
 * @returns {Promise<string>} The access token
 */
const getAuthToken = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS ||
             path.join(__dirname, 'ai-trader-agent-26a2b921b48d.json'),
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/cloud-language',
      'https://www.googleapis.com/auth/generative-language'
    ]
  });
  const authClient = await auth.getClient();
  const token = await authClient.getAccessToken();
  return token.token;
};

/**
 * Calls Google Custom Search API to retrieve fresh news data.
 * @param {string} query - The search query.
 * @returns {Promise<Array>} An array of search result items.
 */
async function getCustomSearchData(query) {
  const customSearchApiKey = process.env.CUSTOM_SEARCH_API_KEY;
  const searchEngineId = process.env.CUSTOM_SEARCH_ENGINE_ID;
  const customSearchEndpoint = 'https://www.googleapis.com/customsearch/v1';
  
  try {
    const response1 = await axios.get(customSearchEndpoint, {
      params: {
        key: customSearchApiKey,
        cx: searchEngineId,
        q: query,
        dateRestrict: 'd7',  // Restrict results to last 7 days
        num: 10,            // Maximum results per request
        start: 1            // Start from first result
      }
    });

    // Get next 10 results (starting at 11)
    const response2 = await axios.get(customSearchEndpoint, {
      params: {
        key: customSearchApiKey,
        cx: searchEngineId,
        q: query,
        dateRestrict: 'd7',  // Restrict results to last 7 days
        num: 10,            // Maximum results per request
        start: 11           // Start from 11th result
      }
    });

    // Merge and return all results
    return [...(response1.data.items || []), ...(response2.data.items || [])];
  } catch (error) {
    console.error('Error calling Custom Search API:', error.response ? error.response.data : error.message);
    return [];
  }
}

async function callGemini() {
  try {
    // Retrieve authentication token for Gemini API
    const token = await getAuthToken();
    
    // Retrieve fresh news data using Custom Search API
    const customSearchResults = await getCustomSearchData("major geopolitical risks that could impact financial markets as of today, ensuring that the data you reference is within the last week");
    
    // Log the custom search results
    console.log('\nCustom Search Results:');
    if (customSearchResults && customSearchResults.length > 0) {
      customSearchResults.forEach((item, index) => {
        console.log(`\nResult ${index + 1}:`);
        console.log('Title:', item.title);
        console.log('Snippet:', item.snippet);
        console.log('URL:', item.link);
      });
    } else {
      console.log('No search results found');
    }
    
    // Process the search results to extract title, snippet, and link.
    let newsContext = '';
    if (customSearchResults && customSearchResults.length > 0) {
      newsContext = customSearchResults.map(item => {
        return `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}\n`;
      }).join('\n');
    } else {
      newsContext = "No recent news articles found.";
    }
    
    // Get current date for the prompt
    const currentDate = new Date();
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(currentDate);
    
    // Construct the prompt for Gemini, including the fresh news context
    const prompt = `Using the following fresh news data retrieved via Google Custom Search:
    
${newsContext}

Analyze the current major geopolitical risks that could impact financial markets as of ${formattedDate}. Ensure that the data you reference is recent (within the last week). For each risk, cite the primary source and include a valid URL that points to a real page. DO NOT allow broken links.

Format your response as a valid JSON object with the following structure:
{
  "geopoliticalRiskIndex": 50, // A number from 0-100 representing overall risk level
  "risks": [
    {
      "type": "Event/Conflict/Policy",
      "name": "Brief name of the risk",
      "description": "Detailed description of the risk",
      "region": "Affected region",
      "impactLevel": "High/Medium/Low",
      "marketImpact": "Description of potential market impact",
      "source": "Source of information",
      "url": "URL to source",
      "lastUpdated": "${currentDate.toISOString()}"
    }
  ]
}

Include 5 of the most significant current geopolitical risks and ensure all data is accurate and from reputable sources.`;

    // Construct the request payload for Gemini API
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    };

    // Gemini API endpoint
    const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    // Call Gemini API
    const response = await axios.post(geminiEndpoint, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Gemini API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Extract and display the response text
    if (response.data.candidates && response.data.candidates.length > 0) {
      const content = response.data.candidates[0].content;
      console.log('\nResponse Text:');
      console.log(content.parts[0].text);
      
      // Attempt to extract JSON from the response text
      const jsonMatch = content.parts[0].text.match(/```json\s*([\s\S]*?)\s*```/) || content.parts[0].text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const geopoliticalData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          console.log('\nParsed JSON Response:');
          console.log(JSON.stringify(geopoliticalData, null, 2));
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError.message);
        }
      } else {
        console.error('Could not extract JSON from response');
      }
    }
  } catch (error) {
    console.error('Error in callGemini:', error.message);
  }
}

// Run the function
callGemini();

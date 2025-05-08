/**
 * Mock test script for the AI Trading Agent
 * 
 * This script demonstrates the functionality of the AI Trading Agent
 * without requiring an actual OpenAI API key.
 * 
 * To run this script:
 * 1. Run: node mock_test.js
 */

// Mock trading analysis result
const MOCK_ANALYSIS_RESULT = `Watch for Better Price Action

Based on my analysis of current market conditions and expert commentary, I recommend a cautious approach at this time.

Analyst Sentiment:
Dan Nathan from CNBC's Fast Money has expressed concerns about tech valuations, suggesting that the recent rally may be overextended. Josh Brown on Halftime Report has maintained a more balanced view, noting selective opportunities in certain sectors while advocating for patience. Steve Weiss has highlighted defensive positioning, particularly in healthcare and consumer staples, while Joe Terranova has emphasized the importance of quality balance sheets in this environment. Dan Niles, in his recent social media posts, has warned about potential volatility ahead due to macroeconomic uncertainties.

Market Indicators:
The CNN Fear & Greed Index currently sits at 55 (Neutral), having moved down from the Greed territory (65) last week, indicating waning market optimism. The CBOE Volatility Index (VIX) has risen to 18.5 from 15.2 over the past week, suggesting increasing market anxiety. The Bloomberg Economic Calendar shows several important data releases upcoming, including inflation metrics and employment figures that could significantly impact market direction.

Key Stocks/ETFs Analysis:
1. AAPL (Apple)
   - PEG Ratio: 2.1
   - Forward P/E: 28.5
   - Market Cap: $2.8T (stable)
   - P/S Ratio: 7.8

2. MSFT (Microsoft)
   - PEG Ratio: 1.9
   - Forward P/E: 31.2
   - Market Cap: $2.9T (increasing)
   - P/S Ratio: 12.4

3. NVDA (NVIDIA)
   - PEG Ratio: 1.7
   - Forward P/E: 35.8
   - Market Cap: $2.2T (volatile, recently increasing)
   - P/S Ratio: 25.6

4. AMZN (Amazon)
   - PEG Ratio: 1.5
   - Forward P/E: 42.3
   - Market Cap: $1.8T (stable)
   - P/S Ratio: 3.2

5. XLF (Financial Select Sector SPDR Fund)
   - Forward P/E: 15.2
   - Market Cap: N/A (ETF)
   - P/S Ratio: 2.4

Macroeconomic Factors:
Treasury yields have been trending upward, with the 10-year yield reaching 4.3%, indicating market expectations for persistent inflation. The Federal Reserve's latest dot plot suggests fewer rate cuts than previously anticipated for the year. Recent consumer credit data shows a slowdown in borrowing, potentially signaling consumer caution. Unemployment remains low at 3.7%, while inflation has shown signs of moderation but remains above the Fed's 2% target.

Given these factors, particularly Dan Nathan and Dan Niles' cautionary stance, rising VIX levels, elevated tech valuations, and uncertain Fed policy trajectory, I recommend watching for better price action before making significant market commitments. The current risk-reward profile suggests patience is warranted until market conditions provide clearer directional signals.`;

/**
 * Parses the analysis result to extract the decision and justification
 */
function parseAnalysisResult(analysisResult) {
  // Extract the decision (one of: Buy Now, Sell Now, Watch for Better Price Action)
  let decision = "Watch for Better Price Action"; // Default decision
  
  // Look for the decision in the analysis result
  const buyMatch = analysisResult.match(/Buy Now/i);
  const sellMatch = analysisResult.match(/Sell Now/i);
  const watchMatch = analysisResult.match(/Watch for Better Price Action/i);
  
  if (buyMatch) {
    decision = "Buy Now";
  } else if (sellMatch) {
    decision = "Sell Now";
  } else if (watchMatch) {
    decision = "Watch for Better Price Action";
  }
  
  // Remove the decision from the beginning of the justification if present
  let justification = analysisResult;
  justification = justification.replace(/^(Buy Now|Sell Now|Watch for Better Price Action)/i, "").trim();
  
  // If the justification starts with a colon or other punctuation, clean it up
  justification = justification.replace(/^[:\s]+/, "").trim();
  
  return { decision, justification };
}

/**
 * Formats the trading decision and justification as an email
 */
function formatEmailBody(decision, justification, nextAnalysisTime) {
  const formattedDate = nextAnalysisTime.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) + ' ET';
  
  return `Subject: [AI Trading Decision] ${decision} - ${new Date().toISOString().split('T')[0]}

Decision: **${decision}**

Justification:
${justification}

Next Analysis Scheduled: ${formattedDate}`;
}

/**
 * Calculates the next analysis time based on the current time
 */
function calculateNextAnalysisTime(currentTime) {
  const nextTime = new Date(currentTime);
  
  // Convert to ET
  const etOptions = { timeZone: 'America/New_York' };
  const etDate = new Date(currentTime.toLocaleString('en-US', etOptions));
  const currentHour = etDate.getHours();
  const currentMinute = etDate.getMinutes();
  
  const MORNING_SCHEDULE_HOUR = 9;
  const MORNING_SCHEDULE_MINUTE = 15;
  const EVENING_SCHEDULE_HOUR = 18;
  const EVENING_SCHEDULE_MINUTE = 0;
  
  // Determine if the next analysis is morning or evening
  if (currentHour < MORNING_SCHEDULE_HOUR || 
      (currentHour === MORNING_SCHEDULE_HOUR && currentMinute < MORNING_SCHEDULE_MINUTE)) {
    // Next analysis is this morning
    nextTime.setHours(MORNING_SCHEDULE_HOUR);
    nextTime.setMinutes(MORNING_SCHEDULE_MINUTE);
  } else if (currentHour < EVENING_SCHEDULE_HOUR || 
             (currentHour === EVENING_SCHEDULE_HOUR && currentMinute < EVENING_SCHEDULE_MINUTE)) {
    // Next analysis is this evening
    nextTime.setHours(EVENING_SCHEDULE_HOUR);
    nextTime.setMinutes(EVENING_SCHEDULE_MINUTE);
  } else {
    // Next analysis is tomorrow morning
    nextTime.setDate(nextTime.getDate() + 1);
    nextTime.setHours(MORNING_SCHEDULE_HOUR);
    nextTime.setMinutes(MORNING_SCHEDULE_MINUTE);
  }
  
  // Check if the next analysis falls on a weekend (Saturday or Sunday)
  const dayOfWeek = nextTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  if (dayOfWeek === 6) { // Saturday
    // Skip to Sunday evening
    nextTime.setDate(nextTime.getDate() + 1);
    nextTime.setHours(EVENING_SCHEDULE_HOUR);
    nextTime.setMinutes(EVENING_SCHEDULE_MINUTE);
  } else if (dayOfWeek === 0 && 
             (nextTime.getHours() < EVENING_SCHEDULE_HOUR || 
              (nextTime.getHours() === EVENING_SCHEDULE_HOUR && nextTime.getMinutes() < EVENING_SCHEDULE_MINUTE))) {
    // Sunday before evening, set to Sunday evening
    nextTime.setHours(EVENING_SCHEDULE_HOUR);
    nextTime.setMinutes(EVENING_SCHEDULE_MINUTE);
  }
  
  return nextTime;
}

/**
 * Main function to run the trading analysis
 */
function runTradingAnalysis() {
  try {
    console.log("Starting mock trading analysis...");
    
    // Use the mock analysis result instead of calling OpenAI
    const analysisResult = MOCK_ANALYSIS_RESULT;
    console.log("\n--- Mock Analysis Result ---");
    console.log(analysisResult);
    
    // Extract the decision and justification from the analysis
    const { decision, justification } = parseAnalysisResult(analysisResult);
    
    // Get the current time and calculate the next analysis time
    const currentTime = new Date();
    const nextAnalysisTime = calculateNextAnalysisTime(currentTime);
    
    // Format the email body
    const emailBody = formatEmailBody(decision, justification, nextAnalysisTime);
    
    console.log("\n--- Formatted Email ---");
    console.log(emailBody);
    
    console.log("\nMock trading analysis completed successfully.");
  } catch (error) {
    console.error("Error in runTradingAnalysis:", error);
  }
}

// Run the trading analysis
runTradingAnalysis();

import { analyzeSP500 } from "./analyzeSP500.js";
import axios from "axios";

// Helper: Test each external API and env variables
async function testLambdaAPIs() {
  const results = {};
  // 1. Check environment variables (but do NOT echo secrets)
  const requiredEnv = [
    "LAMBDA_API_KEY",
    "YAHOO_API_KEY",
    "TRADIER_API_KEY",
    "RAPIDAPI_KEY",
    // Add any other required keys here
  ];
  results.env = {};
  requiredEnv.forEach((key) => {
    results.env[key] = process.env[key] ? "set" : "MISSING";
  });
  console.log("[DIAG] Environment variable check:", results.env);

  // 2. Test Yahoo Finance (RapidAPI)
  try {
    console.log("[DIAG] Testing Yahoo Finance (RapidAPI) API call...");
    const yahooResp = await axios.get(
      "https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-summary",
      {
        params: { region: "US" },
        headers: {
          "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
          "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
        },
        timeout: 5000,
      }
    );
    results.yahooFinance = {
      status: yahooResp.status,
      ok: yahooResp.status === 200,
    };
    console.log("[DIAG] Yahoo Finance API success:", yahooResp.status);
  } catch (err) {
    results.yahooFinance = {
      ok: false,
      error: err.response ? err.response.status + ": " + err.response.statusText : err.message,
    };
    console.error("[DIAG] Yahoo Finance API error:", err.response ? err.response.status : err.message);
  }

  // 3. Test Tradier API (if used)
  try {
    console.log("[DIAG] Testing Tradier API call...");
    const tradierResp = await axios.get(
      "https://api.tradier.com/v1/markets/quotes",
      {
        params: { symbols: "SPY" },
        headers: {
          Authorization: `Bearer ${process.env.TRADIER_API_KEY || ""}`,
          Accept: "application/json",
        },
        timeout: 5000,
      }
    );
    results.tradier = {
      status: tradierResp.status,
      ok: tradierResp.status === 200,
    };
    console.log("[DIAG] Tradier API success:", tradierResp.status);
  } catch (err) {
    results.tradier = {
      ok: false,
      error: err.response ? err.response.status + ": " + err.response.statusText : err.message,
    };
    console.error("[DIAG] Tradier API error:", err.response ? err.response.status : err.message);
  }

  // 4. Add more API checks as needed (CNN Fear & Greed, etc.)

  return results;
}

// === BEGIN 1-HOUR IN-MEMORY CACHE ===
const CACHE = {
  result: null,
  timestamp: 0
};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export const handler = async (event) => {
  try {
    console.log("[DIAG] Lambda handler started", { event });
    console.log("[DIAG] Event details:", event);
    console.log("[DIAG] Environment details:", process.env);
    // Check for test mode (query param mode=test)
    let mode = null;
    if (event.queryStringParameters && event.queryStringParameters.mode) {
      mode = event.queryStringParameters.mode;
    } else if (event.rawQueryString && event.rawQueryString.includes("mode=test")) {
      mode = "test";
    }
    if (mode === "test") {
      console.log("[DIAG] Running testLambdaAPIs...");
      const testResults = await testLambdaAPIs();
      console.log("[DIAG] Diagnostic test results:", testResults);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testResults }),
      };
    }
    // Normal analyzer
    const now = Date.now();
    // If cache is fresh, return it
    if (CACHE.result && (now - CACHE.timestamp < CACHE_TTL_MS)) {
      console.log("[DIAG] Returning cached result");
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(CACHE.result)
      };
    }

    console.log("[DIAG] Cache miss, running analyzeSP500...");
    const before = Date.now();
    const result = await analyzeSP500();
    const after = Date.now();
    console.log("[DIAG] analyzeSP500 result keys:", result && typeof result === 'object' ? Object.keys(result) : result);
    console.log(`[DIAG] analyzeSP500 execution time: ${after - before} ms`);
    console.log(`[DIAG] Total execution time: ${Date.now() - event.startTime} ms`);

    // === SANITIZE OUTPUT: Ensure no .lastUpdated access on null ===
    function sanitize(obj) {
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      } else if (obj && typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          if (k === 'lastUpdated' && (v === null || v === undefined)) {
            out[k] = '';
          } else {
            out[k] = sanitize(v);
          }
        }
        return out;
      }
      return obj;
    }
    const safeResult = sanitize(result);

    // Store in cache
    CACHE.result = safeResult;
    CACHE.timestamp = now;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeResult)
    };
  } catch (err) {
    console.error("[DIAG] Lambda handler error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};

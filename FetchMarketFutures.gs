/**
 * Fetches US Market Futures (S&P 500, Dow, Nasdaq) if outside regular market hours.
 * Uses Tradier API for market hours logic and Twelve Data as the primary source for US index futures data (ES, YM, NQ) and other futures data.
 * Optionally checks Tradier API to confirm if market is open (not in pre/post).
 * Returns null during regular market hours, otherwise returns futures data with source and timestamp.
 * @param {Object} [options] - { forceAfterHours: boolean } for testing bypass
 * @return {Object|null} JSON structure with futures data, or null if during market hours
 */
function fetchMarketFuturesIfAfterHours(options) {
  // US market hours: 9:30 AM to 4:00 PM Eastern Time, Monday–Friday only
  var now = new Date();
  var forceAfterHours = options && options.forceAfterHours;

  // Convert to US Eastern Time
  var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  var offset = -4; // EDT (adjust to -5 for EST if not daylight savings)
  var eastern = new Date(utc + 3600000 * offset);
  var hour = eastern.getHours();
  var minute = eastern.getMinutes();
  var day = eastern.getDay(); // 0 = Sunday, 6 = Saturday
  var timeNum = hour * 100 + minute;

  // Market hours: 0930 to 1600, Monday–Friday
  var isMarketHours = (day >= 1 && day <= 5 && timeNum >= 930 && timeNum < 1600);

  // Optionally, check Tradier API for market status (for more accuracy)
  var tradierOpen = true;
  try {
    var tradierResp = UrlFetchApp.fetch('https://api.tradier.com/v1/markets/clock', {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + PropertiesService.getScriptProperties().getProperty('TRADIER_API_KEY'),
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    });
    var tradierData = JSON.parse(tradierResp.getContentText());
    if (tradierData && tradierData.clock && tradierData.clock.state) {
      tradierOpen = tradierData.clock.state === 'open';
    }
  } catch (e) {
    Logger.log('Tradier market clock check failed: ' + e);
  }

  // --- Market hours logic logging ---
  Logger.log('[Market Hours Check] Eastern Time: ' + eastern.toISOString() + ', Day: ' + day + ', Hour: ' + hour + ', Minute: ' + minute + ', isMarketHours: ' + isMarketHours + ', tradierOpen: ' + tradierOpen + ', forceAfterHours: ' + forceAfterHours);
  if ((isMarketHours && tradierOpen) && !forceAfterHours) {
    Logger.log('[Market Hours Check] Returning null: during regular market hours and not forced after hours.');
    return null;
  } else {
    Logger.log('[Market Hours Check] Proceeding: after hours or forced after hours.');
  }

  // --- Caching: 30 min cache for market futures ---
  var cache = CacheService.getScriptCache();
  var cacheKey = 'marketFuturesData';
  if (!forceAfterHours) {
    var cached = cache.get(cacheKey);
    if (cached) {
      Logger.log('[Market Futures] Returning cached data');
      return JSON.parse(cached);
    }
  }

  // --- US Futures (major contracts) from Tradier ---
  var usFuturesSymbols = [
    { symbol: 'ES', name: 'S&P 500 E-mini Futures', provider: 'Tradier' },
    { symbol: 'NQ', name: 'Nasdaq 100 E-mini Futures', provider: 'Tradier' },
    { symbol: 'YM', name: 'Dow E-mini Futures', provider: 'Tradier' },
    { symbol: 'RTY', name: 'Russell 2000 E-mini Futures', provider: 'Tradier' },
    { symbol: 'CL', name: 'Crude Oil Futures', provider: 'Tradier' },
    { symbol: 'NG', name: 'Natural Gas Futures', provider: 'Tradier' },
    { symbol: 'GC', name: 'Gold Futures', provider: 'Tradier' },
    { symbol: 'SI', name: 'Silver Futures', provider: 'Tradier' },
    { symbol: 'ZB', name: 'US Treasury Bond Futures', provider: 'Tradier' },
    { symbol: 'ZN', name: '10-Year Treasury Note Futures', provider: 'Tradier' },
    { symbol: 'ZF', name: '5-Year Treasury Note Futures', provider: 'Tradier' },
    { symbol: '6E', name: 'Euro FX Futures', provider: 'Tradier' },
    { symbol: '6J', name: 'Japanese Yen Futures', provider: 'Tradier' },
    { symbol: '6B', name: 'British Pound Futures', provider: 'Tradier' },
    { symbol: '6A', name: 'Australian Dollar Futures', provider: 'Tradier' },
    { symbol: 'ZC', name: 'Corn Futures', provider: 'Tradier' },
    { symbol: 'ZW', name: 'Wheat Futures', provider: 'Tradier' },
    { symbol: 'ZS', name: 'Soybean Futures', provider: 'Tradier' },
    { symbol: 'KC', name: 'Coffee Futures', provider: 'Tradier' }
  ];
  var consolidatedData = [];
  var tradierApiKey = PropertiesService.getScriptProperties().getProperty('TRADIER_API_KEY');
  var tradierFuturesUrl = 'https://api.tradier.com/v1/markets/quotes?symbols=' + usFuturesSymbols.map(function(s) { return s.symbol; }).join(',');
  try {
    var tradierFuturesResp = UrlFetchApp.fetch(tradierFuturesUrl, {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + tradierApiKey,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    });
    var tradierFuturesData = JSON.parse(tradierFuturesResp.getContentText());
    var quotes = tradierFuturesData.quotes && tradierFuturesData.quotes.quote ? tradierFuturesData.quotes.quote : [];
    if (!Array.isArray(quotes)) quotes = [quotes];
    for (var i = 0; i < quotes.length; i++) {
      var q = quotes[i];
      var meta = usFuturesSymbols.find(function(s) { return s.symbol === q.symbol; });
      if (q && meta) {
        consolidatedData.push({
          symbol: q.symbol,
          name: meta.name,
          provider: meta.provider,
          last: q.last,
          change: q.change,
          percentChange: q.change_percentage,
          lastUpdated: q.trade_date ? new Date(q.trade_date).toISOString() : null,
          source: {
            name: 'Tradier',
            url: 'https://app.tradier.com/markets/futures/quotes/' + encodeURIComponent(q.symbol)
          }
        });
      }
    }
  } catch (e) {
    Logger.log('Tradier US futures fetch failed: ' + e);
  }

  // --- Global Indices from Twelve Data (non-US indices only) ---
  var twelveDataApiKey = getTwelveDataApiKey();
  var globalIndices = [
    { symbol: 'DAX', name: 'German DAX Index', provider: 'TwelveData' },
    { symbol: 'CAC', name: 'France CAC 40 Index', provider: 'TwelveData' },
    // Add more if you find valid index symbols from https://twelvedata.com/symbols
  ];
  var globalSymbols = globalIndices.map(function(s) { return s.symbol; }).join(',');
  try {
    var url = 'https://api.twelvedata.com/quote?symbol=' + encodeURIComponent(globalSymbols) + '&apikey=' + encodeURIComponent(twelveDataApiKey);
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var data = JSON.parse(resp.getContentText());
    // Handle both single and batch responses
    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        var d = data[i];
        var s = globalIndices.find(function(idx) { return idx.symbol === d.symbol; });
        var lastVal = d.price || d.close || d.last;
        if (d && !d.code && d.symbol && lastVal && s) {
          consolidatedData.push({
            symbol: d.symbol,
            name: s.name,
            provider: s.provider,
            last: parseFloat(lastVal),
            change: d.change ? parseFloat(d.change) : null,
            percentChange: d.percent_change ? parseFloat(d.percent_change) : null,
            lastUpdated: d.datetime ? new Date(d.datetime).toISOString() : null,
            source: {
              name: 'Twelve Data',
              url: 'https://twelvedata.com/quote/' + encodeURIComponent(d.symbol)
            }
          });
        } else {
          Logger.log('No data for ' + (s ? s.symbol : 'unknown') + ': ' + JSON.stringify(d));
        }
      }
    } else {
      for (var i = 0; i < globalIndices.length; i++) {
        var s = globalIndices[i];
        var d = data[s.symbol];
        var lastVal = d.price || d.close || d.last;
        if (d && !d.code && d.symbol && lastVal) {
          consolidatedData.push({
            symbol: d.symbol,
            name: s.name,
            provider: s.provider,
            last: parseFloat(lastVal),
            change: d.change ? parseFloat(d.change) : null,
            percentChange: d.percent_change ? parseFloat(d.percent_change) : null,
            lastUpdated: d.datetime ? new Date(d.datetime).toISOString() : null,
            source: {
              name: 'Twelve Data',
              url: 'https://twelvedata.com/quote/' + encodeURIComponent(d.symbol)
            }
          });
        } else {
          Logger.log('No data for ' + s.symbol + ': ' + JSON.stringify(d));
        }
      }
    }
  } catch (e) {
    Logger.log('Twelve Data fetch failed: ' + e);
  }

  var result = {
    asOf: new Date().toISOString(),
    source: {
      name: 'Mixed',
      url: 'https://finance.yahoo.com/futures/'
    },
    consolidated: consolidatedData
  };
  cache.put(cacheKey, JSON.stringify(result), 1800); // 30 min cache
  return result;
}

/**
 * Clears the market futures cache.
 */
function clearMarketFuturesCache() {
  var cache = CacheService.getScriptCache();
  cache.remove('marketFuturesData');
}

/**
 * Tester for fetchMarketFuturesIfAfterHours.
 * @param {boolean} [forceAfterHours] - If true, bypass time check for testing
 */
function testFetchMarketFuturesIfAfterHours(forceAfterHours) {
  var result = fetchMarketFuturesIfAfterHours({ forceAfterHours: !!forceAfterHours });
  Logger.log('Market Futures Result: ' + JSON.stringify(result, null, 2));
  return result;
}

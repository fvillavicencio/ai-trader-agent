/**
 * Clears all macroeconomic factors caches
 * This function clears both the script cache and any stale caches in properties service
 * @return {Object} Result object with success status and message
 */
function clearMacroeconomicFactorsCache() {
  try {
    Logger.log("Clearing all macroeconomic factors caches...");
    
    // Step 1: Clear script cache
    const scriptCache = CacheService.getScriptCache();
    const cacheKeys = [
      'MACROECONOMIC_FACTORS_COMPLETE',
      'TREASURY_YIELDS_DATA',
      'FED_POLICY_DATA',
      'INFLATION_DATA',
      'GEOPOLITICAL_RISKS_DATA'
    ];
    
    scriptCache.removeAll(cacheKeys);
    Logger.log("Script cache cleared successfully");
    
    // Step 2: Clear stale caches from properties service
    const scriptProperties = PropertiesService.getScriptProperties();
    const stalePropertyKeys = [
      'TREASURY_YIELDS_STALE_CACHE',
      'FED_POLICY_STALE_CACHE',
      'INFLATION_DATA_STALE_CACHE',
      'GEOPOLITICAL_RISKS_STALE_CACHE',
      'MACROECONOMIC_FACTORS_STALE_CACHE'
    ];
    
    stalePropertyKeys.forEach(key => {
      try {
        scriptProperties.deleteProperty(key);
        Logger.log(`Deleted stale cache property: ${key}`);
      } catch (propError) {
        Logger.log(`Error deleting property ${key}: ${propError}`);
      }
    });
    
    const result = {
      success: true,
      message: "All macroeconomic factors caches have been successfully cleared",
      clearedCaches: {
        scriptCache: cacheKeys,
        propertiesCache: stalePropertyKeys
      },
      timestamp: new Date()
    };
    
    Logger.log(result.message);
    return result;
  } catch (error) {
    const errorResult = {
      success: false,
      message: `Failed to clear macroeconomic factors caches: ${error}`,
      timestamp: new Date()
    };
    
    Logger.log(errorResult.message);
    return errorResult;
  }
}

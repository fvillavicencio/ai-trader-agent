/**
 * Data Validator for Geopolitical Risk Analysis
 * 
 * This module provides validation functions for geopolitical risk data
 * to ensure it meets the required structure and quality standards.
 */

/**
 * Validate geopolitical risk data structure
 * @param {Object} data - Geopolitical risk data to validate
 * @returns {Object} - Validation result with errors if any
 */
function validateGeopoliticalRiskData(data) {
  const errors = [];
  const warnings = [];
  
  // Check if data exists
  if (!data) {
    errors.push('Data is null or undefined');
    return { valid: false, errors, warnings };
  }
  
  // Check if data is an object
  if (typeof data !== 'object') {
    errors.push(`Data is not an object (got ${typeof data})`);
    return { valid: false, errors, warnings };
  }
  
  // Check for required top-level fields
  const requiredFields = ['overview', 'risks', 'lastUpdated'];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check overview
  if (data.overview) {
    if (typeof data.overview !== 'string') {
      errors.push(`Overview is not a string (got ${typeof data.overview})`);
    } else if (data.overview.length < 100) {
      warnings.push(`Overview is too short (${data.overview.length} characters)`);
    }
  }
  
  // Check risks array
  if (data.risks) {
    if (!Array.isArray(data.risks)) {
      errors.push(`Risks is not an array (got ${typeof data.risks})`);
    } else {
      // Check if risks array is empty
      if (data.risks.length === 0) {
        errors.push('Risks array is empty');
      } else {
        // Check each risk
        data.risks.forEach((risk, index) => {
          if (!risk.title) {
            errors.push(`Risk #${index + 1} is missing a title`);
          }
          
          if (!risk.analysis) {
            errors.push(`Risk #${index + 1} is missing analysis content`);
          } else if (typeof risk.analysis !== 'string') {
            errors.push(`Risk #${index + 1} analysis is not a string (got ${typeof risk.analysis})`);
          } else if (risk.analysis.length < 100) {
            warnings.push(`Risk #${index + 1} analysis is too short (${risk.analysis.length} characters)`);
          }
        });
      }
    }
  }
  
  // Check lastUpdated
  if (data.lastUpdated) {
    if (typeof data.lastUpdated !== 'string') {
      errors.push(`lastUpdated is not a string (got ${typeof data.lastUpdated})`);
    } else {
      // Check if it's a valid ISO date string
      try {
        const date = new Date(data.lastUpdated);
        if (isNaN(date.getTime())) {
          errors.push(`lastUpdated is not a valid date: ${data.lastUpdated}`);
        }
      } catch (error) {
        errors.push(`lastUpdated is not a valid date: ${data.lastUpdated}`);
      }
    }
  }
  
  // Check meta information if present
  if (data.meta) {
    if (typeof data.meta !== 'object') {
      warnings.push(`meta is not an object (got ${typeof data.meta})`);
    } else if (!data.meta.provider) {
      warnings.push('meta is missing provider information');
    }
  } else {
    warnings.push('Missing meta information');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log validation results
 * @param {Object} validationResult - Result from validateGeopoliticalRiskData
 */
function logValidationResults(validationResult) {
  const { valid, errors, warnings } = validationResult;
  
  if (valid) {
    console.log('✅ Data validation passed');
  } else {
    console.error(`❌ Data validation failed with ${errors.length} errors`);
  }
  
  if (errors.length > 0) {
    console.error('Errors:');
    errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`);
    });
  }
  
  if (warnings.length > 0) {
    console.warn(`⚠️ ${warnings.length} warnings:`);
    warnings.forEach((warning, index) => {
      console.warn(`  ${index + 1}. ${warning}`);
    });
  }
}

module.exports = {
  validateGeopoliticalRiskData,
  logValidationResults
};

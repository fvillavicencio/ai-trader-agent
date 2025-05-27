/**
 * HTML Output Comparison Script
 * 
 * This script compares the original handlebars output with the Lambda-generated output
 * and analyzes the differences to help converge the two outputs.
 * 
 * Usage: node compare-outputs.js [handlebars-output] [lambda-output]
 * If no arguments are provided, it uses default paths.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const cheerio = require('cheerio');

// Default paths
const DEFAULT_HANDLEBARS_OUTPUT = path.join('/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/market-pulse-handlebars/v2/output.html');
const DEFAULT_LAMBDA_OUTPUT = path.join('/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/market-pulse-lambda/test/full-sample-output.html');

// Function to normalize HTML (remove whitespace differences, etc.)
function normalizeHtml(html) {
  // Load HTML into cheerio
  const $ = cheerio.load(html);
  
  // Remove all comments
  $('*').contents().each(function() {
    if (this.type === 'comment') {
      $(this).remove();
    }
  });
  
  // Normalize whitespace in text nodes
  $('*').each(function() {
    if ($(this).children().length === 0) {
      let text = $(this).text().trim().replace(/\s+/g, ' ');
      $(this).text(text);
    }
  });
  
  // Return normalized HTML
  return $.html();
}

// Function to analyze HTML structure differences
function analyzeStructureDifferences(handlebarsDom, lambdaDom) {
  const differences = [];
  
  // Compare sections present in each
  const handlebarsSections = handlebarsDom('section').toArray();
  const lambdaSections = lambdaDom('section').toArray();
  
  console.log(`Handlebars output has ${handlebarsSections.length} sections`);
  console.log(`Lambda output has ${lambdaSections.length} sections`);
  
  // Check for missing sections in Lambda output
  const handlebarsSectionIds = handlebarsSections.map(section => handlebarsDom(section).attr('id')).filter(id => id);
  const lambdaSectionIds = lambdaSections.map(section => lambdaDom(section).attr('id')).filter(id => id);
  
  console.log('\nSection IDs in Handlebars output:', handlebarsSectionIds);
  console.log('Section IDs in Lambda output:', lambdaSectionIds);
  
  // Find sections in handlebars but not in lambda
  const missingSections = handlebarsSectionIds.filter(id => !lambdaSectionIds.includes(id));
  if (missingSections.length > 0) {
    differences.push(`Missing sections in Lambda output: ${missingSections.join(', ')}`);
  }
  
  // Find sections in lambda but not in handlebars
  const extraSections = lambdaSectionIds.filter(id => !handlebarsSectionIds.includes(id));
  if (extraSections.length > 0) {
    differences.push(`Extra sections in Lambda output: ${extraSections.join(', ')}`);
  }
  
  // Compare common sections
  const commonSectionIds = handlebarsSectionIds.filter(id => lambdaSectionIds.includes(id));
  console.log('\nAnalyzing common sections:', commonSectionIds);
  
  commonSectionIds.forEach(id => {
    const handlebarsSection = handlebarsDom(`section#${id}`);
    const lambdaSection = lambdaDom(`section#${id}`);
    
    // Compare number of elements
    const handlebarsElementCount = handlebarsSection.find('*').length;
    const lambdaElementCount = lambdaSection.find('*').length;
    
    if (Math.abs(handlebarsElementCount - lambdaElementCount) > 5) {
      differences.push(`Section ${id}: Element count differs significantly (Handlebars: ${handlebarsElementCount}, Lambda: ${lambdaElementCount})`);
    }
    
    // Check for specific elements that might be missing
    ['h1', 'h2', 'h3', 'table', 'div.card', 'ul', 'ol'].forEach(selector => {
      const handlebarsCount = handlebarsSection.find(selector).length;
      const lambdaCount = lambdaSection.find(selector).length;
      
      if (handlebarsCount !== lambdaCount) {
        differences.push(`Section ${id}: ${selector} count differs (Handlebars: ${handlebarsCount}, Lambda: ${lambdaCount})`);
      }
    });
  });
  
  return differences;
}

// Function to compare the two HTML files
function compareOutputs(handlebarsPath, lambdaPath) {
  console.log(`Comparing Handlebars output (${handlebarsPath}) with Lambda output (${lambdaPath})...`);
  
  try {
    // Read the HTML files
    const handlebarsHtml = fs.readFileSync(handlebarsPath, 'utf8');
    const lambdaHtml = fs.readFileSync(lambdaPath, 'utf8');
    
    // Check if files exist
    if (!handlebarsHtml || !lambdaHtml) {
      console.error('One or both files could not be read.');
      return;
    }
    
    // Normalize HTML
    const normalizedHandlebarsHtml = normalizeHtml(handlebarsHtml);
    const normalizedLambdaHtml = normalizeHtml(lambdaHtml);
    
    // Load into cheerio for DOM manipulation
    const handlebarsDom = cheerio.load(normalizedHandlebarsHtml);
    const lambdaDom = cheerio.load(normalizedLambdaHtml);
    
    // Compare file sizes
    console.log(`Handlebars output size: ${handlebarsHtml.length} bytes`);
    console.log(`Lambda output size: ${lambdaHtml.length} bytes`);
    console.log(`Size difference: ${lambdaHtml.length - handlebarsHtml.length} bytes`);
    
    // Analyze structural differences
    const structuralDifferences = analyzeStructureDifferences(handlebarsDom, lambdaDom);
    
    if (structuralDifferences.length > 0) {
      console.log('\nStructural differences found:');
      structuralDifferences.forEach(diff => console.log(`- ${diff}`));
    } else {
      console.log('\nNo significant structural differences found.');
    }
    
    // Save normalized files for diff tool
    const normalizedHandlebarsPath = path.join(path.dirname(handlebarsPath), 'normalized-handlebars.html');
    const normalizedLambdaPath = path.join(path.dirname(lambdaPath), 'normalized-lambda.html');
    
    fs.writeFileSync(normalizedHandlebarsPath, normalizedHandlebarsHtml);
    fs.writeFileSync(normalizedLambdaPath, normalizedLambdaHtml);
    
    console.log(`\nNormalized files saved for manual inspection:`);
    console.log(`- ${normalizedHandlebarsPath}`);
    console.log(`- ${normalizedLambdaPath}`);
    
    // Generate a diff file
    const diffPath = path.join(path.dirname(lambdaPath), 'output-diff.txt');
    try {
      const diffCommand = `diff -u "${normalizedHandlebarsPath}" "${normalizedLambdaPath}" > "${diffPath}"`;
      execSync(diffCommand);
      console.log(`\nDetailed diff saved to: ${diffPath}`);
    } catch (error) {
      console.log(`\nDetailed diff saved to: ${diffPath} (files differ)`);
    }
    
    console.log('\nComparison completed.');
  } catch (error) {
    console.error('Comparison failed:', error);
  }
}

// Check if cheerio is installed
try {
  require.resolve('cheerio');
} catch (e) {
  console.error('Cheerio is required for this script. Installing...');
  try {
    execSync('npm install cheerio', { stdio: 'inherit' });
    console.log('Cheerio installed successfully.');
  } catch (error) {
    console.error('Failed to install cheerio. Please install it manually with: npm install cheerio');
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const handlebarsPath = args[0] || DEFAULT_HANDLEBARS_OUTPUT;
const lambdaPath = args[1] || DEFAULT_LAMBDA_OUTPUT;

// Run the comparison
compareOutputs(handlebarsPath, lambdaPath);

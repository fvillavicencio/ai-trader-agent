/**
 * S3 Bucket Permissions Checker
 * 
 * This script checks if the S3 bucket is properly configured for public access
 * and verifies the existence of specific image paths.
 */

// Load AWS SDK for S3 only
const AWS = { S3: require('aws-sdk/clients/s3') };
const https = require('https');

// Create S3 service object
const s3 = new AWS.S3({
  region: 'us-east-2'
});

// Bucket name
const bucketName = 'market-pulse-daily-title-images';

// Images to check
const imagesToCheck = [
  'neutral/mixed_signals/balanced_scale_market_neutral.jpg',
  'bullish/greed_is_good/gordon_gekko_wall_street_businessman.jpg',
  'bearish/the_correction_is_coming/michael_burry_big_short.jpg',
  'volatile/wild_ride/roller_coaster_market_volatility.jpg'
];

// Check if an image exists in the S3 bucket
async function checkImageExists(key) {
  try {
    const params = {
      Bucket: bucketName,
      Key: key
    };
    
    const headResult = await s3.headObject(params).promise();
    console.log(`✅ Image exists: ${key}`);
    console.log(`   Size: ${headResult.ContentLength} bytes`);
    console.log(`   Last modified: ${headResult.LastModified}`);
    return true;
  } catch (error) {
    console.error(`❌ Error checking image ${key}:`, error.code);
    return false;
  }
}

// Check if an image URL is publicly accessible
async function checkImageAccessible(key) {
  return new Promise((resolve) => {
    const url = `https://${bucketName}.s3.us-east-2.amazonaws.com/${key}`;
    console.log(`Checking URL: ${url}`);
    
    https.get(url, (res) => {
      const statusCode = res.statusCode;
      console.log(`   Status code: ${statusCode}`);
      
      if (statusCode >= 200 && statusCode < 300) {
        console.log(`✅ Image is publicly accessible: ${key}`);
        resolve(true);
      } else {
        console.log(`❌ Image is not publicly accessible: ${key}`);
        resolve(false);
      }
      
      res.resume(); // Consume response data to free up memory
    }).on('error', (err) => {
      console.error(`❌ Error accessing image ${key}:`, err.message);
      resolve(false);
    });
  });
}

// Check bucket public access settings
async function checkBucketPublicAccess() {
  try {
    const params = {
      Bucket: bucketName
    };
    
    const publicAccessBlock = await s3.getPublicAccessBlock(params).promise();
    console.log('S3 Bucket Public Access Block Configuration:');
    console.log(JSON.stringify(publicAccessBlock.PublicAccessBlockConfiguration, null, 2));
    
    // Check if the bucket blocks public access
    const blockConfig = publicAccessBlock.PublicAccessBlockConfiguration;
    if (blockConfig.BlockPublicAcls || 
        blockConfig.BlockPublicPolicy || 
        blockConfig.IgnorePublicAcls || 
        blockConfig.RestrictPublicBuckets) {
      console.log('⚠️ The bucket has public access restrictions enabled.');
    } else {
      console.log('✅ The bucket does not have public access restrictions.');
    }
    
    return publicAccessBlock.PublicAccessBlockConfiguration;
  } catch (error) {
    console.error('Error checking bucket public access:', error.code);
    return null;
  }
}

// Check bucket policy
async function checkBucketPolicy() {
  try {
    const params = {
      Bucket: bucketName
    };
    
    const policyResult = await s3.getBucketPolicy(params).promise();
    console.log('S3 Bucket Policy:');
    console.log(policyResult.Policy);
    
    // Parse the policy to check if it allows public read access
    const policy = JSON.parse(policyResult.Policy);
    const publicReadStatement = policy.Statement.find(stmt => 
      stmt.Effect === 'Allow' && 
      (stmt.Principal === '*' || stmt.Principal.AWS === '*') &&
      (stmt.Action === 's3:GetObject' || (Array.isArray(stmt.Action) && stmt.Action.includes('s3:GetObject')))
    );
    
    if (publicReadStatement) {
      console.log('✅ The bucket policy allows public read access.');
    } else {
      console.log('⚠️ The bucket policy does not explicitly allow public read access.');
    }
    
    return policy;
  } catch (error) {
    if (error.code === 'NoSuchBucketPolicy') {
      console.log('⚠️ The bucket does not have a bucket policy.');
    } else {
      console.error('Error checking bucket policy:', error.code);
    }
    return null;
  }
}

// Check bucket CORS configuration
async function checkBucketCors() {
  try {
    const params = {
      Bucket: bucketName
    };
    
    const corsResult = await s3.getBucketCors(params).promise();
    console.log('S3 Bucket CORS Configuration:');
    console.log(JSON.stringify(corsResult.CORSRules, null, 2));
    return corsResult.CORSRules;
  } catch (error) {
    if (error.code === 'NoSuchCORSConfiguration') {
      console.log('⚠️ The bucket does not have a CORS configuration.');
    } else {
      console.error('Error checking bucket CORS:', error.code);
    }
    return null;
  }
}

// Main function
async function main() {
  console.log(`=== Checking S3 Bucket: ${bucketName} ===\n`);
  
  // Check bucket configuration
  console.log('--- Checking Bucket Configuration ---');
  await checkBucketPublicAccess();
  await checkBucketPolicy();
  await checkBucketCors();
  
  console.log('\n--- Checking Image Existence ---');
  // Check if images exist in the bucket
  for (const image of imagesToCheck) {
    await checkImageExists(image);
  }
  
  console.log('\n--- Checking Image Accessibility ---');
  // Check if images are publicly accessible
  for (const image of imagesToCheck) {
    await checkImageAccessible(image);
  }
  
  console.log('\n=== Check Complete ===');
}

// Run the main function
main().catch(error => {
  console.error('Error in main function:', error);
});

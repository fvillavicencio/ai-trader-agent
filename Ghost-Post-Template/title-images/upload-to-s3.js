/**
 * Upload title images to S3 bucket
 * This script uploads all images from the title-images directory to the S3 bucket
 * while preserving the folder structure.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const S3_BUCKET = 'market-pulse-daily-title-images';
const AWS_REGION = 'us-east-2';
const BASE_DIR = path.join(__dirname, 'downloaded-images');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
const UPLOAD_LIMIT = 350; // Limit the number of images to upload

// Function to recursively find all image files
function findImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findImageFiles(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Function to upload a file to S3
function uploadFileToS3(filePath) {
  try {
    // Calculate the S3 key (path) based on the relative path from BASE_DIR
    const relativePath = path.relative(BASE_DIR, filePath);
    const s3Key = relativePath.replace(/\\/g, '/'); // Ensure forward slashes for S3 keys
    
    // Set content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'image/jpeg'; // Default
    
    if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    }
    
    // Upload the file to S3
    const command = `aws s3 cp "${filePath}" s3://${S3_BUCKET}/${s3Key} --content-type ${contentType} --region ${AWS_REGION}`;
    console.log(`Uploading: ${relativePath}`);
    execSync(command);
    
    return {
      success: true,
      localPath: relativePath,
      s3Path: `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`
    };
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error.message);
    return {
      success: false,
      localPath: path.relative(BASE_DIR, filePath),
      error: error.message
    };
  }
}

// Main function
async function uploadImagesToS3() {
  console.log('Finding all image files...');
  const imageFiles = findImageFiles(BASE_DIR);
  console.log(`Found ${imageFiles.length} image files.`);
  
  // Create a mapping file to store local path to S3 URL mappings
  const mappings = {};
  let successCount = 0;
  
  // Group files by category to ensure even distribution
  const filesByCategory = {};
  
  // Extract category from file path
  for (const filePath of imageFiles) {
    const relativePath = path.relative(BASE_DIR, filePath);
    const pathParts = relativePath.split(path.sep);
    
    // Category is the first directory level (e.g., 'bullish', 'bearish', etc.)
    const category = pathParts[0];
    
    if (!filesByCategory[category]) {
      filesByCategory[category] = [];
    }
    
    filesByCategory[category].push(filePath);
  }
  
  // Calculate how many images to take from each category
  const categories = Object.keys(filesByCategory);
  const imagesPerCategory = Math.min(
    Math.ceil(UPLOAD_LIMIT / categories.length),
    Math.max(...Object.values(filesByCategory).map(files => files.length))
  );
  
  console.log(`Uploading approximately ${imagesPerCategory} images per category...`);
  
  // Select files to upload with even distribution
  const filesToUpload = [];
  
  for (const category of categories) {
    const categoryFiles = filesByCategory[category];
    // Shuffle the files to get a random selection
    const shuffled = [...categoryFiles].sort(() => 0.5 - Math.random());
    // Take up to the calculated number per category
    filesToUpload.push(...shuffled.slice(0, imagesPerCategory));
  }
  
  // Limit to the total upload limit
  const limitedFiles = filesToUpload.slice(0, UPLOAD_LIMIT);
  
  console.log(`Selected ${limitedFiles.length} files for upload with even distribution.`);
  console.log('Starting upload to S3...');
  
  // Upload each file
  for (const filePath of limitedFiles) {
    const result = uploadFileToS3(filePath);
    
    if (result.success) {
      mappings[result.localPath] = result.s3Path;
      successCount++;
    }
  }
  
  // Save the mappings to a file
  const mappingFilePath = path.join(BASE_DIR, 's3-image-mappings.json');
  fs.writeFileSync(mappingFilePath, JSON.stringify(mappings, null, 2));
  
  console.log(`
Upload complete!
- Total files: ${imageFiles.length}
- Successfully uploaded: ${successCount}
- Failed: ${imageFiles.length - successCount}
- Mapping file saved to: ${mappingFilePath}
  `);
}

// Run the upload process
uploadImagesToS3().catch(error => {
  console.error('Upload process failed:', error);
});

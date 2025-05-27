#!/bin/bash

# Directories to commit
DIRS=(
  "sp500-analyzer"
  "stock-metrics-retriever"
  "market-pulse-lambda"
  "market-pulse-handlebars"
  "ghost-lambda-proxy"
)

# Create a new branch for these changes
git checkout -b add-component-folders-script

# Loop through each directory
for DIR in "${DIRS[@]}"; do
  echo "Processing $DIR..."
  
  # Find all files in the directory, excluding node_modules and large files
  find "$DIR" -type f \
    -not -path "*/node_modules/*" \
    -not -path "*/\.*" \
    -not -name "*.zip" \
    -not -name "package-lock.json" \
    -not -name "*.log" \
    -size -1M | while read file; do
    
    # Try to add each file individually
    echo "Adding $file"
    git add "$file" || echo "Failed to add $file, skipping..."
  done
  
  # Create .gitignore in each directory to exclude problematic files
  echo "Creating .gitignore for $DIR"
  cat > "$DIR/.gitignore" << EOF
node_modules/
*.log
*.zip
package-lock.json
.DS_Store
EOF

  # Add the .gitignore file
  git add "$DIR/.gitignore" || echo "Failed to add $DIR/.gitignore"
done

# Commit the changes
git commit -m "Add component folders with selective files"

# Push to the remote repository
git push origin add-component-folders-script

echo "Done! Check the output above for any errors."

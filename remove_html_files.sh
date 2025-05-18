#!/bin/bash

# Get a list of all HTML files in the GAS project
echo "Fetching list of HTML files from Google Apps Script project..."
clasp list | grep "\.html" | while read -r line; do
  # Extract the filename
  filename=$(echo "$line" | awk '{print $1}')
  
  # Skip if the filename is empty or doesn't end with .html
  if [[ -z "$filename" || "$filename" != *".html" ]]; then
    continue
  fi
  
  echo "Removing $filename from GAS project..."
  clasp rm "$filename"
done

echo "All HTML files have been removed from the GAS project."

#!/bin/bash

# Create the output file
output_file="assembled-template.html"
echo "Combining template parts into $output_file..."

# Combine all parts into one file
cat assembled-template-part1.html > $output_file
cat assembled-template-part2.html >> $output_file
cat assembled-template-part3.html >> $output_file
cat assembled-template-part4.html >> $output_file
cat assembled-template-part5.html >> $output_file
cat assembled-template-part6.html >> $output_file
cat assembled-template-part7.html >> $output_file
cat assembled-template-part8.html >> $output_file

echo "Template parts successfully combined into $output_file"

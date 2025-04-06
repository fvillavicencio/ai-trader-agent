import os
import re

def update_file_content(filename):
    with open(filename, 'r') as file:
        content = file.read()
    
    # Remove any references to Utils_Main
    content = content.replace('Utils_Main', '')
    
    with open(filename, 'w') as file:
        file.write(content)

# List of files to update
files_to_update = [
    'Code.gs',
    'Config.gs',
    'DataRetrieval.gs',
    'Email.gs',
    'FetchEconomicEvents.gs',
    'FundamentalMetrics.gs',
    'GoogleSearch.gs',
    'KeyMarketIndicators.gs',
    'MacroeconomicFactors.gs',
    'MarketSentiment.gs',
    'Prompt.gs',
    'Setup.gs',
    'StockDataRetriever.gs'
]

# Update each file
for filename in files_to_update:
    if os.path.exists(filename):
        update_file_content(filename)
        print(f'Updated: {filename}')

# Remove Utils_Main.gs
os.remove('Utils_Main.gs')

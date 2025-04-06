import os
import re

def update_file_content(filename):
    with open(filename, 'r') as file:
        content = file.read()
    
    # Update include statements
    content = re.sub(r'include\((?:["\'])([^\"\']+)(?:["\'])\)', 
                    lambda m: f'include("Utils_{m.group(1)}")',
                    content)
    
    # Update variable references
    content = re.sub(r'(\b(?:Core|Email|Analysis|Data)Utils\b)', 
                    lambda m: f'Utils_{m.group(1)}',
                    content)
    
    # Update section references
    content = re.sub(r'(\b(?:FundamentalMetrics|MacroeconomicFactors|MarketIndicators|MarketSentiment|GeopoliticalRisks)\b)', 
                    lambda m: f'Utils_{m.group(1)}',
                    content)
    
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

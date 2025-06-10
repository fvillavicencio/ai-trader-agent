# Fear and Greed Index Data Extractor

This script connects to the Ghost blog as an admin, retrieves all published articles, extracts the Fear and Greed Index data from each article, and generates a CSV file with timestamps and values sorted in descending order.

## Prerequisites

- Node.js installed
- Access to Ghost Admin API
- `.env` file with Ghost API credentials

## Setup

1. Make sure your `.env` file in the parent directory contains one of the following sets of variables:
   
   **Option 1: Admin API** (requires full admin access)
   ```
   GHOST_URL="https://market-pulse-daily.ghost.io"
   GHOST_API_KEY="your_admin_api_key_here"
   ```
   
   **Option 2: Content API** (read-only access, safer)
   ```
   GHOST_URL="https://market-pulse-daily.ghost.io"
   GHOST_CONTENT_API_KEY="your_content_api_key_here"
   ```

2. Install dependencies:
   ```
   npm install @tryghost/admin-api @tryghost/content-api dotenv cheerio
   ```

## Usage

### Using Admin API (default)

Run the script from the fear-greed-extractor directory:

```
cd fear-greed-extractor
node extract-fear-greed-data.js
```

Alternatively, you can provide the Ghost Admin API key and URL directly as command line arguments:

```
node extract-fear-greed-data.js --key "your_admin_api_key" --url "https://your-ghost-blog.com"
```

### Using Content API

If you don't have admin access or prefer to use the Content API (read-only):

```
node extract-fear-greed-data.js --content-key "your_content_api_key" --url "https://your-ghost-blog.com"
```

You can find your Content API key in the Ghost Admin panel under Settings > Integrations > Add custom integration.

The script will:
1. Connect to the Ghost API using credentials from the parent directory's `.env` file
2. Retrieve all published posts (paginated in batches of 50)
3. Extract Fear and Greed Index data from each post, including:
   - Current value
   - Previous close value
   - One week ago value
   - One month ago value
4. Generate a CSV file named `fear_greed_data.csv` with:
   - Timestamp column
   - Fear and Greed Index value column
   - Data sorted by timestamp in descending order

## Output

The generated CSV file will be saved in the same directory as the script and will contain two columns:
- `timestamp`: ISO format date and time when the data point was recorded
- `fear_and_greed_index_value`: Numeric value of the Fear and Greed Index (0-100)

## Notes

- The script extracts data from the HTML content of each post
- For historical data points (previous close, one week ago, one month ago), the script estimates the timestamp based on the current value's timestamp
- If a post doesn't contain Fear and Greed Index data, it will be skipped

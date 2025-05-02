# Ghost Publisher Lambda Function

This AWS Lambda function automates the process of publishing articles to Ghost CMS, sending emails to members, and returning information about the published article and member list.

## Features

- Publishes articles to Ghost CMS with dynamic titles
- Automatically sends emails to all members (paid and free)
- Determines content visibility based on time of day (premium before 4:30 PM ET)
- Returns the URL of the published article and member emails categorized by status

## Prerequisites

- Node.js 18.x or later
- AWS CLI configured with appropriate permissions
- Ghost CMS instance with Admin API access

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` and fill in your Ghost CMS credentials:
   ```
   GHOST_URL=https://your-ghost-blog.ghost.io
   GHOST_API_KEY=your_ghost_admin_api_key
   GHOST_NEWSLETTER_ID=your_newsletter_id
   ```

## Testing Locally

1. Create a test input file (or use the provided `test-input.json`):
   ```json
   {
     "ghostUrl": "https://your-ghost-blog.ghost.io",
     "ghostApiKey": "your_ghost_admin_api_key",
     "newsletterId": "your_newsletter_id",
     "mobiledocPath": "../ghost-post.json",
     "dataPath": "../market_pulse_data.json"
   }
   ```

2. Run the test script:
   ```
   node test.js test-input.json
   ```

## Deployment to AWS Lambda

1. Update the `deploy.sh` script with your AWS account ID and IAM role
2. Make the script executable:
   ```
   chmod +x deploy.sh
   ```
3. Set your Ghost credentials as environment variables:
   ```
   export GHOST_URL=https://your-ghost-blog.ghost.io
   export GHOST_API_KEY=your_ghost_admin_api_key
   export GHOST_NEWSLETTER_ID=your_newsletter_id
   ```
4. Run the deployment script:
   ```
   ./deploy.sh
   ```

## Lambda Function Input

The Lambda function accepts the following input parameters:

```json
{
  "ghostUrl": "https://your-ghost-blog.ghost.io",
  "ghostApiKey": "your_ghost_admin_api_key",
  "newsletterId": "your_newsletter_id",
  "mobiledoc": "Your mobiledoc JSON string or object",
  "data": "Your data JSON object",
  "featureImageUrl": "https://example.com/feature-image.jpg"
}
```

## Lambda Function Output

The function returns the following output:

```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "postUrl": "https://your-ghost-blog.ghost.io/post-slug",
    "postId": "post-id",
    "title": "Post Title",
    "members": {
      "paid": ["paid1@example.com", "paid2@example.com"],
      "free": ["free1@example.com", "free2@example.com"],
      "comped": ["comped1@example.com"]
    }
  }
}
```

## Error Handling

If an error occurs, the function returns:

```json
{
  "statusCode": 500,
  "body": {
    "success": false,
    "error": "Error message"
  }
}
```

## License

ISC

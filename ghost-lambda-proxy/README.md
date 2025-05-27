# Ghost Lambda Proxy

A secure AWS Lambda function that acts as a proxy for publishing posts to Ghost CMS.

## Features

- Receives all Ghost post parameters via HTTP POST (API Gateway or Lambda URL)
- Authenticates with Ghost Admin API using JWT
- Forwards the request and returns the raw Ghost API response

## Setup

### 1. Prepare Your Lambda Project

- Download or clone this directory.
- Run `npm install` to install dependencies.

### 2. Set Environment Variables

Set these in the AWS Lambda console (or via `serverless`/Terraform):

- `GHOST_ADMIN_API_KEY` — format: `<id>:<secret>`
- `GHOST_API_URL` — e.g., `https://market-pulse-daily.ghost.io`
- `GHOST_NEWSLETTER_ID` — your newsletter ID (optional, can be sent in payload)

### 3. Deploy to AWS Lambda

- Zip the contents (not the folder itself):  
  `zip -r ghost-lambda-proxy.zip handler.js package.json node_modules`
- Create a new Lambda function (Node.js 18.x recommended).
- Upload the zip as the code package.
- Set environment variables as above.
- (Optional) Attach an API Gateway or Lambda Function URL for HTTP access.

### 4. Test Locally (Example Python Script)

```python
import requests

payload = {
    "title": "Test from Lambda Proxy",
    "lexical": "...",  # Your Koenig JSON string
    "status": "draft",
    "tags": ["Test", "LambdaProxy"],
    "custom_excerpt": "Testing Lambda proxy to Ghost."
}

response = requests.post(
    "https://<your-api-gateway-or-lambda-url>",
    json=payload
)
print(response.status_code, response.json())
```

## Security

- Never hardcode secrets. Use Lambda environment variables.
- (Optional) Add an API key or IAM authentication to your endpoint.

---

## Troubleshooting

- Check CloudWatch logs for errors.
- Ensure your Ghost Admin API key is correct and has publishing permissions.
- The Lambda must have outbound internet access (VPC config if needed).

---

## License

MIT

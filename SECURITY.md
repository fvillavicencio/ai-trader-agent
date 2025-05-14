# Security Guidelines for Market Pulse Daily

## Sensitive Credentials

This project uses various API keys and credentials that should NEVER be committed to the repository. The following files have been removed from Git tracking and added to .gitignore:

### Perplexity API
- `perplexity-retrieval-lambda/simple-lambda/api-gateway-config.json`
- `perplexity-retrieval-lambda/simple-lambda/update-lambda-env.sh`
- `perplexity-retrieval-lambda/simple-lambda/run-test.sh`
- `perplexity-retrieval-lambda/simple-lambda/run-fixed-test.sh`

### Ghost CMS API
- `Ghost-Post-Template/ghost-publisher-lambda/force-update.sh`
- `Ghost-Post-Template/ghost-publisher-lambda/deploy-region-fix.sh`
- `Ghost-Post-Template/ghost-publisher-lambda/deploy-simplified.sh`
- `Ghost-Post-Template/test.env`
- `Ghost-Post-Template/api-gateway-test.env`
- `Ghost-Post-Template/ghost-publisher-lambda/test-lambda.env`
- `Ghost-Post-Template/ghost-publisher-lambda/test-api-config.env`

## Template Files

### Perplexity API Configuration Template
Create a file named `api-gateway-config.json` with this structure:
```json
{
  "apiGateway": {
    "stageName": "staging",
    "endpoint": "https://example.execute-api.us-east-2.amazonaws.com/staging/retrieve"
  },
  "apiKey": {
    "id": "your-api-key-id",
    "name": "your-api-key-name",
    "value": "your-api-key-value"
  }
}
```

### Environment Variables Template
Create a file named `.env` with this structure:
```
# Ghost CMS API
GHOST_URL=https://your-ghost-site.ghost.io
GHOST_API_KEY=your-ghost-api-key
GHOST_NEWSLETTER_ID=your-newsletter-id

# Perplexity API
PERPLEXITY_API_KEY=your-perplexity-api-key
```

## Security Best Practices

1. **NEVER commit API keys or credentials** to the repository
2. Use environment variables for sensitive information
3. Rotate API keys regularly, especially if they might have been exposed
4. Use AWS Secrets Manager or similar services for production credentials
5. Consider using a tool like `dotenv` to load environment variables from `.env` files (which should be in .gitignore)

## If You Accidentally Commit Sensitive Information

1. Immediately rotate the exposed credentials (create new ones and invalidate old ones)
2. Remove the sensitive files from Git tracking using `git rm --cached <file>`
3. Update .gitignore to prevent future commits
4. Consider using tools like BFG Repo-Cleaner or git-filter-repo to completely remove sensitive data from Git history
